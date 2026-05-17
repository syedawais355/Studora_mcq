// In-memory session state. Hydrated from storage on boot, mutated in place
// during the session, and persisted back through core/storage.js (which now
// mirrors page-view count across localStorage / sessionStorage / cookie).
//
// Rule: behavioural data (streaks, bookmarks, page views) is anonymous and
// stays on-device. Only the signed-in user identity (state.user) comes from
// Supabase Auth.

import * as storage from './storage.js?v=1778642504';

export const FREE_PAGES = 5;

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
  bookmarks: [],
  mistakes: [],
  pagesVisited: 0,

  // Auth identity (null when not signed in).
  user: null,

  // True while the hard wall is mounted — the SPA refuses to render page
  // content until the visitor signs in.
  wallActive: false,
};

export function hydrateFromStorage() {
  const s = storage.load();
  state.streak       = s.streak;
  state.bestStreak   = s.bestStreak;
  state.solved       = s.solved;
  state.bookmarks    = [...s.bookmarks];
  state.mistakes     = Array.isArray(s.mistakes) ? [...s.mistakes] : [];
  state.pagesVisited = s.pagesVisited;
}

export function recordCorrect() {
  const next = storage.bumpStreak();
  state.streak = next.streak;
  state.bestStreak = next.bestStreak;
  state.solved = next.solved;
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
  state.bookmarks = [...next.bookmarks];
  return state.bookmarks.includes(qid);
}

export function recordMistake(qid) {
  const next = storage.recordMistake(qid);
  state.mistakes = Array.isArray(next.mistakes) ? [...next.mistakes] : state.mistakes;
}

export function clearMistake(qid) {
  const next = storage.clearMistake(qid);
  state.mistakes = Array.isArray(next.mistakes) ? [...next.mistakes] : state.mistakes;
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
