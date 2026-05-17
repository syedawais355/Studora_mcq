// In-memory session state. Hydrated from storage on boot, mutated in place
// during the session, and persisted back through core/storage.js (which now
// mirrors page-view count across localStorage / sessionStorage / cookie).
//
// Rule: behavioural data (streaks, bookmarks, page views) is anonymous and
// stays on-device. Only the signed-in user identity (state.user) comes from
// Supabase Auth.

import * as storage from './storage.js?v=1778642504';

export const FREE_PAGES = 5;

// The bookmarks array carries {id, folder} records since #62 added folders.
// Two existing call sites — mcq.js's `state.bookmarks.includes(qid)` and
// search.js's `ids.join(',')` for the API call — expect bare numbers. Rather
// than touch those files, every entry quacks like its question ID:
//   - toString() / valueOf() return the numeric id, so .join() and arithmetic
//     coercions resolve to "1,2,3" exactly as before
//   - the BookmarkList subclass overrides includes() so a numeric needle
//     matches any entry whose .id is that needle
// Plain iteration, spreading, map/filter still yield the rich {id, folder}
// objects, so the bookmarks page can read the folder slot directly.
class BookmarkEntry {
  constructor(id, folder = null) {
    this.id = id;
    this.folder = folder || null;
  }
  toString() { return String(this.id); }
  valueOf()  { return this.id; }
  toJSON()   { return { id: this.id, folder: this.folder }; }
}

class BookmarkList extends Array {
  includes(needle, fromIndex) {
    if (typeof needle === 'number') {
      const start = fromIndex | 0;
      for (let i = start < 0 ? Math.max(0, this.length + start) : start; i < this.length; i++) {
        const entry = this[i];
        const id = typeof entry === 'number' ? entry : entry?.id;
        if (id === needle) return true;
      }
      return false;
    }
    return super.includes(needle, fromIndex);
  }
}

function toBookmarkList(list) {
  const out = new BookmarkList();
  if (Array.isArray(list)) {
    for (const item of list) {
      if (item == null) continue;
      if (item instanceof BookmarkEntry) out.push(item);
      else if (typeof item === 'number') out.push(new BookmarkEntry(item, null));
      else if (typeof item === 'object' && Number.isFinite(item.id)) {
        out.push(new BookmarkEntry(item.id, item.folder ?? null));
      }
    }
  }
  return out;
}

// Mirror of the goal options offered in storage.js — exported so the
// home-page picker doesn't have to hard-code them in two places.
export const WEEKLY_GOAL_OPTIONS = [50, 100, 200];

export const state = {
  // Static data populated at boot.
  cats: [],
  exams: [],
  currentCat: null,
  currentExam: null,
  examCats: [],

  // Per-page UI state.
  testMode: false,
  questionsPage: 1,
  perPage: 20,
  searchTimer: null,
  wrongTopic: { topic: null, count: 0, dismissed: false },

  // Persisted across sessions (multi-store mirror via storage.js).
  streak: 0,
  bestStreak: 0,
  solved: 0,
  bookmarks: toBookmarkList([]),
  mistakes: [],
  pagesVisited: 0,

  // Streak freezes (#52) + weekly goal (#53).
  freezesAvailable: 0,
  weeklyGoal: 0,
  weeklyCount: 0,

  // Auth identity (null when not signed in).
  user: null,

  // True while the hard wall is mounted — the SPA refuses to render page
  // content until the visitor signs in.
  wallActive: false,
};

export function hydrateFromStorage() {
  // Grant the monthly freeze batch *before* we read — so the first paint
  // of the session already shows the topped-up count.
  storage.grantFreezesMonthlyIfDue();
  const s = storage.load();
  state.streak           = s.streak;
  state.bestStreak       = s.bestStreak;
  state.solved           = s.solved;
  // Bookmarks now carry a folder slot (#62). Storage hands back the rich
  // {id, folder} shape; the legacy bare-number form is migrated on read.
  state.bookmarks        = toBookmarkList(s.bookmarks);
  state.mistakes         = Array.isArray(s.mistakes) ? [...s.mistakes] : [];
  state.pagesVisited     = s.pagesVisited;
  state.freezesAvailable = s.freezes_available | 0;
  state.weeklyGoal       = s.weekly_goal | 0;
  state.weeklyCount      = s.weekly_count | 0;
}

// Cross-tab sync (#22). The browser dispatches a `storage` event in *other*
// tabs whenever localStorage is written in this origin — same tab never sees
// its own writes. So when another tab solves a question or records a mistake
// (storage.update() writes the 'studora' key), we re-hydrate this tab's state
// and fire `studora:state-changed` on the document so the topbar can re-render
// its mistake badge / streak pill without a manual refresh.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== 'studora') return;
    hydrateFromStorage();
    document.dispatchEvent(new CustomEvent('studora:state-changed'));
  });
}

// True if the given question ID is bookmarked, regardless of which folder
// (or none) it lives in. Used by the MCQ card so the bookmark button stays
// in sync with the rich shape.
export function isBookmarked(qid) {
  return state.bookmarks.some(b => (typeof b === 'number' ? b : b?.id) === qid);
}

export function recordCorrect() {
  const next = storage.bumpStreak();
  state.streak           = next.streak;
  state.bestStreak       = next.bestStreak;
  state.solved           = next.solved;
  state.freezesAvailable = next.freezes_available | 0;
  state.weeklyCount      = next.weekly_count | 0;
}

export function recordWrong() {
  const next = storage.resetStreak();
  state.streak = next.streak;
}

export function trackPage() {
  const next = storage.trackPageView();
  state.pagesVisited = next.pagesVisited;
}

export function toggleBookmark(qid) {
  const next = storage.toggleBookmark(qid);
  state.bookmarks = toBookmarkList(next.bookmarks);
  return state.bookmarks.some(b => (typeof b === 'number' ? b : b?.id) === qid);
}

// Move (or unfile) a single bookmark. Pass null/empty to clear the folder so
// the bookmark falls back under "All saved".
export function setBookmarkFolder(qid, folderName) {
  const next = storage.setBookmarkFolder(qid, folderName || null);
  state.bookmarks = toBookmarkList(next.bookmarks);
  return state.bookmarks;
}

// Sorted list of folder names currently in use.
export function listBookmarkFolders() {
  return storage.listFolders();
}

// Create an empty folder. Returns true on success, false when the name was
// invalid, taken, or the per-device cap is hit.
export function createBookmarkFolder(name) {
  return storage.createFolder(name);
}

// Rename a folder. Returns true on success, false when the new name was
// invalid, the old folder didn't exist, or the rename would collide.
export function renameBookmarkFolder(oldName, newName) {
  const before = storage.listFolders();
  const next = storage.renameFolder(oldName, newName);
  state.bookmarks = toBookmarkList(next.bookmarks);
  const after = storage.listFolders();
  // Cheap success check: the old name is gone and the new one is present.
  return before.includes(oldName) && after.includes(String(newName || '').trim());
}

// Delete a folder. Mode is forwarded to storage:
//   'move-to-default'  → keep the bookmarks, just unfile them
//   'delete-bookmarks' → drop the bookmarks along with the folder
export function deleteBookmarkFolder(name, mode = 'move-to-default') {
  const next = storage.deleteFolder(name, mode);
  state.bookmarks = toBookmarkList(next.bookmarks);
  return state.bookmarks;
}

export function recordMistake(qid) {
  const next = storage.recordMistake(qid);
  state.mistakes = Array.isArray(next.mistakes) ? [...next.mistakes] : state.mistakes;
}

export function clearMistake(qid) {
  const next = storage.clearMistake(qid);
  state.mistakes = Array.isArray(next.mistakes) ? [...next.mistakes] : state.mistakes;
}

// Pick the weekly target (one of WEEKLY_GOAL_OPTIONS). Invalid values are
// dropped silently — the picker UI is the source of truth.
export function setWeeklyGoal(n) {
  const next = storage.setWeeklyGoal(n);
  state.weeklyGoal  = next.weekly_goal | 0;
  state.weeklyCount = next.weekly_count | 0;
  return state.weeklyGoal;
}

// Spend one freeze from the bank. Returns the remaining count. The home
// page doesn't call this directly today — bumpStreak handles missed-day
// forgiveness on its own — but it's exposed for any future explicit-spend UI.
export function consumeFreeze() {
  const cur = storage.load(true);
  const have = cur.freezes_available | 0;
  if (have <= 0) return 0;
  const next = storage.update({ freezes_available: have - 1 });
  state.freezesAvailable = next.freezes_available | 0;
  return state.freezesAvailable;
}

// Test mode is per-page, not persisted.
export function resetSession() {
  state.testMode = false;
  state.wrongTopic = { topic: null, count: 0, dismissed: false };
}

export function setUser(user) {
  state.user = user;
}

// Read-only check — true once the anonymous visitor has burned the quota.
export function isWalledOff() {
  return !state.user && state.pagesVisited >= FREE_PAGES;
}
