// Studora API client — calls /api/* endpoints with in-memory caching + dedupe.
// Exported as a module so consumers import it explicitly.

const BASE = '/api';
const cache = new Map();      // path -> data
const expiry = new Map();     // path -> ms timestamp
const inflight = new Map();   // path -> Promise (dedupe concurrent fetches)

// One automatic retry on transient failures (network drop, 5xx, function cold
// start that took too long). 4xx and 429 are NOT retried — those are real
// client errors that won't fix themselves.
async function attemptFetch(url) {
  const r = await fetch(url, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  });
  if (r.status === 429) { const e = new Error('rate_limited'); e.retryable = false; throw e; }
  if (r.status >= 500 || r.status === 0) {
    const e = new Error(`request_failed_${r.status}`); e.retryable = true; throw e;
  }
  if (!r.ok) { const e = new Error(`request_failed_${r.status}`); e.retryable = false; throw e; }
  return r.json();
}

async function fetchJSON(path, ttl = 300_000) {
  const now = Date.now();
  if (cache.has(path) && (expiry.get(path) || 0) > now) return cache.get(path);
  if (inflight.has(path)) return inflight.get(path);

  const url = `${BASE}${path}`;
  const req = (async () => {
    try {
      return await attemptFetch(url);
    } catch (err) {
      // Network errors (TypeError) and 5xx → one retry after a short pause.
      const retryable = err.retryable !== false && !/^request_failed_4/.test(err.message);
      if (!retryable) throw err;
      await new Promise(r => setTimeout(r, 600));
      return attemptFetch(url);
    }
  })()
    .then((data) => {
      if (ttl > 0) {
        cache.set(path, data);
        expiry.set(path, Date.now() + ttl);
      }
      return data;
    })
    .finally(() => inflight.delete(path));

  inflight.set(path, req);
  return req;
}

export const API = {
  getCategories:      ()                          => fetchJSON('/categories', 300_000),
  getExams:           ()                          => fetchJSON('/exams', 300_000),
  getExamBySlug:      (slug)                      => fetchJSON(`/exams?slug=${encodeURIComponent(slug)}`, 300_000),
  getExamCategories:  (examId)                    => fetchJSON(`/exam-categories?exam_id=${encodeURIComponent(examId)}`, 300_000),
  getQuestions:       (catId, limit = 50, off = 0) => fetchJSON(`/questions?category_id=${encodeURIComponent(catId)}&limit=${limit}&offset=${off}`, 300_000),
  getRandomQuiz:      (catId, count = 20)         => fetchJSON(`/quiz?category_id=${encodeURIComponent(catId)}&count=${count}`, 0),
  searchQuestions:    (query, limit = 10)         => fetchJSON(`/search?q=${encodeURIComponent(query)}&limit=${limit}`, 60_000),
  getQuestionsByIds:  (ids)                       => fetchJSON(`/questions-by-ids?ids=${encodeURIComponent(ids.join(','))}`, 60_000),
  clearCache:         ()                          => { cache.clear(); expiry.clear(); },
};

// Convenience global so any DOM-attached inline handler (or third-party hook) can still reach it.
if (typeof window !== 'undefined') window.API = API;

export default API;
