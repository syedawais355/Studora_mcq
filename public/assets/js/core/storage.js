// Versioned persistence for the anonymous user state:
// streaks, solved count, bookmarks, page-visit counter, streak freezes,
// and the weekly-goal progress.
//
// The page-view counter is mirrored across localStorage, sessionStorage, and a
// first-party cookie. On every read we take the MAX of the three. Wiping any
// single store doesn't reset the count — a determined visitor would have to
// clear localStorage *and* cookies *and* close every tab to start over.

const KEY = 'studora';
const VERSION = 4;
const PV_COOKIE = 'sd_pv';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years

// Freezes: a missed day is forgiven if there's one in the bank. Two land at
// the start of every calendar month, capped so they can't stockpile forever —
// the point is to forgive a sick day, not bank a vacation.
const FREEZE_MONTHLY_GRANT = 2;
const FREEZE_CAP = 4;

// Weekly goal: three preset rungs. The home-page picker mirrors this list.
const WEEKLY_GOAL_OPTIONS = Object.freeze([50, 100, 200]);

const DEFAULT_STATE = Object.freeze({
  version: VERSION,
  streak: 0,
  bestStreak: 0,
  solved: 0,
  bookmarks: [],
  // Soft-extended in #62: a list of folder names the user has created. Kept
  // separate from `bookmarks` so a folder can exist even before anything is
  // filed into it. Never bumps `version` — older clients simply ignore it.
  bookmarkFolders: [],
  mistakes: [],          // question IDs answered wrong; cleared when answered right
  pagesVisited: 0,
  lastSeenISO: null,

  // Streak freezes (#52).
  freezes_available: 0,
  last_active_iso: null,                 // YYYY-MM-DD (UTC) of most recent bumpStreak
  freezes_granted_month_iso: null,       // YYYY-MM of the last monthly grant

  // Weekly goal (#53).
  weekly_goal: 0,                        // 0 = user hasn't picked yet
  weekly_count: 0,                       // questions solved this ISO week
  weekly_count_iso: null,                // ISO week the count was last reset in (e.g. "2026-W20")
});

// Hard cap so the Mistake Book never grows unbounded on heavy users.
const MISTAKE_CAP = 500;

// Bookmark folders (#62). At most a dozen folders per device — enough for
// "Pre-test cram", "Mistakes I keep making", "Re-read tomorrow", a folder per
// subject, etc., without letting the sidebar explode. The cap is a UX choice,
// not a storage one.
const FOLDER_CAP = 12;
const FOLDER_NAME_MAX = 32;
const FOLDER_NAME_RE = /^[A-Za-z0-9 _-]{1,32}$/;

// Lift any legacy bookmark records (bare question IDs) into the new
// {id, folder} shape. Returns a fresh array so we never mutate caller data.
// Folder = null means "unfiled" — still shown under the All saved tab.
function normalizeBookmarks(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => {
      if (entry == null) return null;
      if (typeof entry === 'number') return { id: entry, folder: null };
      if (typeof entry === 'object' && Number.isFinite(entry.id)) {
        const folder = typeof entry.folder === 'string' && entry.folder.trim()
          ? entry.folder.trim()
          : null;
        return { id: entry.id, folder };
      }
      // String numerics from older clients — coerce defensively.
      const n = parseInt(entry, 10);
      return Number.isFinite(n) ? { id: n, folder: null } : null;
    })
    .filter(Boolean);
}

// True if a bookmark record matches the given question ID. Handles both the
// new {id, folder} shape and the legacy bare-number form so calls during
// hydration don't trip on partially-migrated data.
function sameQid(entry, qid) {
  if (entry == null) return false;
  if (typeof entry === 'number') return entry === qid;
  return entry.id === qid;
}

function bookmarkFolderName(entry) {
  if (entry && typeof entry === 'object' && typeof entry.folder === 'string') {
    return entry.folder;
  }
  return null;
}

function safeRead() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== VERSION) return null;
    return parsed;
  } catch { return null; }
}

function safeWrite(payload) {
  try { localStorage.setItem(KEY, JSON.stringify(payload)); } catch { /* quota / private mode */ }
}

function sessionRead() {
  try {
    const raw = sessionStorage.getItem(KEY + '.pv');
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch { return 0; }
}

function sessionWrite(n) {
  try { sessionStorage.setItem(KEY + '.pv', String(n)); } catch { /* ignore */ }
}

function cookieRead() {
  try {
    const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + PV_COOKIE + '=(\\d+)'));
    return m ? parseInt(m[1], 10) || 0 : 0;
  } catch { return 0; }
}

function cookieWrite(n) {
  try {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${PV_COOKIE}=${n}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  } catch { /* ignore */ }
}

// Take the largest known counter across all three stores. This is the value
// that survives partial tampering.
function reconcilePagesVisited(localValue) {
  const max = Math.max(localValue | 0, sessionRead(), cookieRead());
  if (max !== localValue) {
    // Heal: bring localStorage up to the highest observed count.
    safeWrite({ ...load(true), pagesVisited: max });
  }
  sessionWrite(max);
  cookieWrite(max);
  return max;
}

export function load(raw = false) {
  const stored = { ...DEFAULT_STATE, ...(safeRead() || {}) };
  // Soft schema lift (#62): old bookmarks were bare question IDs, new ones
  // carry a folder slot. We rewrite the array on every read so the rest of
  // the codebase sees a uniform shape — no version bump required.
  const normalized = normalizeBookmarks(stored.bookmarks);
  const wasLegacy = (stored.bookmarks || []).some(b => typeof b === 'number' || typeof b === 'string');
  stored.bookmarks = normalized;
  if (raw) {
    // Persist the lift the first time we see legacy records so future reads
    // don't repeat the work — but only when something actually changed.
    if (wasLegacy) safeWrite({ ...stored, bookmarks: normalized });
    return stored;
  }
  stored.pagesVisited = reconcilePagesVisited(stored.pagesVisited);
  if (wasLegacy) safeWrite({ ...stored, bookmarks: normalized });
  return stored;
}

export function update(patch) {
  const next = { ...load(true), ...patch, version: VERSION };
  safeWrite(next);
  if (patch.pagesVisited !== undefined) {
    sessionWrite(next.pagesVisited);
    cookieWrite(next.pagesVisited);
  }
  return next;
}

// --- date helpers (UTC, no DST surprises) ------------------------------------

function toUtcDateOnly(d) {
  // Returns YYYY-MM-DD in UTC.
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toUtcMonth(d) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function daysBetweenIso(aIso, bIso) {
  // Whole-day difference between two YYYY-MM-DD strings (b - a).
  const a = Date.parse(aIso + 'T00:00:00Z');
  const b = Date.parse(bIso + 'T00:00:00Z');
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

// ISO 8601 week label, e.g. "2026-W20". UTC-based so it matches the
// date-only logic above.
function toIsoWeek(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Thursday-of-this-week trick: ISO weeks are anchored on Thursday.
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date - yearStart) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// --- freezes (#52) -----------------------------------------------------------

// Grants the monthly batch of freezes if we haven't done so for the current
// calendar month yet. Safe to call on every boot — it no-ops within a month.
export function grantFreezesMonthlyIfDue(now = new Date()) {
  const cur = load(true);
  const month = toUtcMonth(now);
  if (cur.freezes_granted_month_iso === month) return cur;
  const next = Math.min(FREEZE_CAP, (cur.freezes_available | 0) + FREEZE_MONTHLY_GRANT);
  return update({
    freezes_available: next,
    freezes_granted_month_iso: month,
  });
}

// --- weekly goal (#53) -------------------------------------------------------

// Increments the weekly counter, resetting it first if the ISO week has
// rolled over since the last bump. Returns the new state.
export function bumpWeeklyCount(now = new Date()) {
  const cur = load(true);
  const week = toIsoWeek(now);
  const sameWeek = cur.weekly_count_iso === week;
  const count = (sameWeek ? (cur.weekly_count | 0) : 0) + 1;
  return update({
    weekly_count: count,
    weekly_count_iso: week,
  });
}

export function setWeeklyGoal(n) {
  const goal = WEEKLY_GOAL_OPTIONS.includes(n) ? n : 0;
  if (!goal) return load(true);
  return update({ weekly_goal: goal });
}

// --- streak with freeze protection ------------------------------------------

export function bumpStreak(now = new Date()) {
  const cur = load(true);
  const today = toUtcDateOnly(now);
  const last = cur.last_active_iso;

  // Default behaviour: a correct pick extends the streak by one.
  let streak = cur.streak + 1;
  let freezes = cur.freezes_available | 0;

  if (last) {
    const gap = daysBetweenIso(last, today);
    if (gap <= 1) {
      // 0 = same UTC day (already counted today), 1 = the next day.
      // Either way the run continues — no freeze needed.
    } else if (gap >= 2) {
      const missed = gap - 1; // calendar days with zero correct picks
      if (freezes > 0 && missed <= freezes) {
        // Spend a freeze for every missed day — silently. The streak survives.
        freezes -= missed;
      } else {
        // No freezes (or too many missed days). The run resets to today.
        streak = 1;
      }
    }
  }

  // Roll the weekly counter in the same write so a single correct pick can't
  // half-update one side.
  const week = toIsoWeek(now);
  const sameWeek = cur.weekly_count_iso === week;
  const weeklyCount = (sameWeek ? (cur.weekly_count | 0) : 0) + 1;

  return update({
    streak,
    solved: cur.solved + 1,
    bestStreak: Math.max(cur.bestStreak, streak),
    lastSeenISO: now.toISOString(),
    last_active_iso: today,
    freezes_available: freezes,
    weekly_count: weeklyCount,
    weekly_count_iso: week,
  });
}

export function resetStreak() {
  return update({ streak: 0 });
}

export function toggleBookmark(questionId) {
  const cur = load(true);
  const has = cur.bookmarks.some(b => sameQid(b, questionId));
  return update({
    bookmarks: has
      ? cur.bookmarks.filter(b => !sameQid(b, questionId))
      : [...cur.bookmarks, { id: questionId, folder: null }],
  });
}

export function isBookmarked(questionId) {
  return load(true).bookmarks.some(b => sameQid(b, questionId));
}

// --- bookmark folders (#62) -------------------------------------------------

// Validate a folder name against the cap and allowed character set. Returns
// a normalized (trimmed) name on success, or null when invalid — the UI shows
// a toast in that case.
export function validateFolderName(name) {
  const trimmed = String(name ?? '').trim();
  if (!FOLDER_NAME_RE.test(trimmed)) return null;
  return trimmed;
}

// Returns the unique folder names known to the device, in stable A→Z order
// so the tab strip doesn't reshuffle between renders. The list is the union
// of (a) folders the user has explicitly created via createFolder() and
// (b) folders any bookmark is currently filed under — that second source
// covers older devices where folders only existed implicitly.
export function listFolders() {
  const cur = load(true);
  const names = new Set();
  (Array.isArray(cur.bookmarkFolders) ? cur.bookmarkFolders : []).forEach((n) => {
    const v = String(n ?? '').trim();
    if (v) names.add(v);
  });
  cur.bookmarks.forEach((b) => {
    const f = bookmarkFolderName(b);
    if (f) names.add(f);
  });
  return [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

// Create an empty folder. Returns true on success, false when the name was
// invalid, already exists, or the cap is hit. Stored separately from
// `bookmarks` so the folder survives until something is filed into it.
export function createFolder(name) {
  const fresh = validateFolderName(name);
  if (!fresh) return false;
  const existing = listFolders();
  if (existing.includes(fresh)) return false;
  if (existing.length >= FOLDER_CAP) return false;
  const cur = load(true);
  const list = Array.isArray(cur.bookmarkFolders) ? cur.bookmarkFolders : [];
  update({ bookmarkFolders: [...list, fresh] });
  return true;
}

// Move a single bookmark into the named folder (or null to unfile it). Caller
// is responsible for validating the folder name first; we just write what we
// were handed so the same helper can also restore from a rename / delete.
// Returns the updated full state.
export function setBookmarkFolder(questionId, folderName) {
  const cur = load(true);
  const target = folderName ? String(folderName).trim() || null : null;
  // Enforce the cap when introducing a new folder name. Existing folders are
  // always allowed even if somehow over the cap — we never refuse a move
  // between folders that are already on the device.
  if (target) {
    const existing = new Set(listFolders());
    if (!existing.has(target) && existing.size >= FOLDER_CAP) {
      return cur;
    }
  }
  let touched = false;
  const next = cur.bookmarks.map((b) => {
    const entry = typeof b === 'number' ? { id: b, folder: null } : b;
    if (entry.id !== questionId) return entry;
    if ((entry.folder || null) === target) return entry;
    touched = true;
    return { ...entry, folder: target };
  });
  if (!touched) return cur;
  return update({ bookmarks: next });
}

// Rename a folder in place. Every bookmark currently filed under `oldName`
// gets reassigned to `newName`, and the explicit folder list is updated to
// match. No-op when the new name is invalid, the old folder doesn't exist,
// or the rename would collide with another folder.
export function renameFolder(oldName, newName) {
  const old = String(oldName ?? '').trim();
  const fresh = validateFolderName(newName);
  if (!old || !fresh) return load(true);
  const folders = new Set(listFolders());
  if (!folders.has(old)) return load(true);
  if (folders.has(fresh) && fresh !== old) return load(true);
  const cur = load(true);
  const nextBookmarks = cur.bookmarks.map((b) => {
    const entry = typeof b === 'number' ? { id: b, folder: null } : b;
    return entry.folder === old ? { ...entry, folder: fresh } : entry;
  });
  const list = Array.isArray(cur.bookmarkFolders) ? cur.bookmarkFolders : [];
  const nextFolders = list.map((n) => (String(n).trim() === old ? fresh : n));
  // Make sure the new name shows up exactly once, even if the old explicit
  // list was missing it (folder existed only via a bookmark).
  if (!nextFolders.includes(fresh)) nextFolders.push(fresh);
  return update({ bookmarks: nextBookmarks, bookmarkFolders: nextFolders });
}

// Delete a folder. Mode controls what happens to its bookmarks:
//   'move-to-default'  → bookmarks survive, folder is cleared (null)
//   'delete-bookmarks' → bookmarks are removed from the saved list entirely
// Any other mode is treated as 'move-to-default' so we fail safe. The
// folder is also dropped from the explicit list.
export function deleteFolder(name, mode = 'move-to-default') {
  const target = String(name ?? '').trim();
  if (!target) return load(true);
  const cur = load(true);
  const matches = (b) => bookmarkFolderName(b) === target;
  const nextBookmarks = mode === 'delete-bookmarks'
    ? cur.bookmarks.filter(b => !matches(b))
    : cur.bookmarks.map((b) => {
        const entry = typeof b === 'number' ? { id: b, folder: null } : b;
        return matches(entry) ? { ...entry, folder: null } : entry;
      });
  const list = Array.isArray(cur.bookmarkFolders) ? cur.bookmarkFolders : [];
  const nextFolders = list.filter(n => String(n).trim() !== target);
  return update({ bookmarks: nextBookmarks, bookmarkFolders: nextFolders });
}

// Exposed for the UI so the "New folder" button can render an accurate
// "x of 12" hint without having to re-derive the cap.
export const BOOKMARK_FOLDER_CAP = FOLDER_CAP;
export const BOOKMARK_FOLDER_NAME_MAX = FOLDER_NAME_MAX;

export function recordMistake(questionId) {
  const cur = load(true);
  const list = Array.isArray(cur.mistakes) ? cur.mistakes : [];
  if (list.includes(questionId)) return cur; // already on the list — no-op
  const next = [questionId, ...list].slice(0, MISTAKE_CAP);
  return update({ mistakes: next });
}

export function clearMistake(questionId) {
  const cur = load(true);
  const list = Array.isArray(cur.mistakes) ? cur.mistakes : [];
  if (!list.includes(questionId)) return cur;
  return update({ mistakes: list.filter(id => id !== questionId) });
}

export function trackPageView() {
  const cur = load(); // reconciles first so we can't decrement by clearing one store
  return update({ pagesVisited: cur.pagesVisited + 1 });
}

export function clear() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  try { sessionStorage.removeItem(KEY + '.pv'); } catch { /* ignore */ }
  cookieWrite(0);
}
