// Versioned persistence for the anonymous user state:
// streaks, solved count, bookmarks, page-visit counter.
//
// The page-view counter is mirrored across localStorage, sessionStorage, and a
// first-party cookie. On every read we take the MAX of the three. Wiping any
// single store doesn't reset the count — a determined visitor would have to
// clear localStorage *and* cookies *and* close every tab to start over.

const KEY = 'studora';
const VERSION = 2;
const PV_COOKIE = 'sd_pv';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years

const DEFAULT_STATE = Object.freeze({
  version: VERSION,
  streak: 0,
  bestStreak: 0,
  solved: 0,
  bookmarks: [],
  pagesVisited: 0,
  lastSeenISO: null,
});

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
  if (raw) return stored;
  stored.pagesVisited = reconcilePagesVisited(stored.pagesVisited);
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

export function bumpStreak() {
  const cur = load(true);
  const next = cur.streak + 1;
  return update({
    streak: next,
    solved: cur.solved + 1,
    bestStreak: Math.max(cur.bestStreak, next),
    lastSeenISO: new Date().toISOString(),
  });
}

export function resetStreak() {
  return update({ streak: 0 });
}

export function toggleBookmark(questionId) {
  const cur = load(true);
  const has = cur.bookmarks.includes(questionId);
  return update({
    bookmarks: has ? cur.bookmarks.filter(id => id !== questionId) : [...cur.bookmarks, questionId],
  });
}

export function isBookmarked(questionId) {
  return load(true).bookmarks.includes(questionId);
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
