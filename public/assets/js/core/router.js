// Path-based SPA router using the History API.
// All routes resolve to plain paths (/subjects/<slug>, /exams/<slug>) — no `#`.
// Vercel rewrites every non-/api/, non-/assets/ path to /index.html so deep links work
// on hard reload; bootFromPath() then re-hydrates the route from location.pathname.
import { state } from './state.js?v=1778642504';
import { normalizeSlug } from './icons.js?v=1778642504';

const handlers = new Map();
let currentView = null;

export function register(name, handler) {
  handlers.set(name, handler);
}

export async function navigate(view, params = {}) {
  const handler = handlers.get(view);
  if (!handler) return;
  currentView = view;
  if (params.cat)  state.currentCat  = params.cat;
  if (params.exam) state.currentExam = params.exam;

  const target = pathFor(view, params);
  if (location.pathname !== target) {
    // pushState keeps back/forward working; the deep-link race fix lives in main.js
    // (we only subscribe to auth changes after cats are loaded).
    history.pushState({ view }, '', target);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  await handler(params);
}

function pathFor(view, params) {
  if (view === 'home') return '/';
  if (view === 'category' && params.cat) {
    return `/subjects/${encodeURIComponent(params.cat.category_slug || params.cat.category_id)}`;
  }
  if (view === 'exam' && params.exam) {
    return `/exams/${encodeURIComponent(params.exam.slug || params.exam.id)}`;
  }
  if (view === 'question' && params.qid) {
    return `/q/${encodeURIComponent(params.qid)}`;
  }
  return `/${view}`;
}

// Find a category by slug, tolerating legacy underscore form and id strings.
function findCat(slug) {
  if (!slug) return null;
  const norm = normalizeSlug(slug);
  return state.cats.find(c =>
    c.category_slug === slug ||
    normalizeSlug(c.category_slug) === norm ||
    String(c.category_id) === slug
  ) || null;
}

function findExam(slug) {
  if (!slug) return null;
  return state.exams.find(e => e.slug === slug || String(e.id) === slug) || null;
}

export function bootFromPath(fallback = 'home') {
  // One-time hash → path upgrade for users with bookmarks from the old routing.
  if (location.hash && /^#\/?(\w|$)/.test(location.hash)) {
    const legacy = location.hash.replace(/^#\/?/, '');
    if (legacy) {
      history.replaceState(null, '', '/' + legacy);
    } else {
      history.replaceState(null, '', '/');
    }
  }

  const path = location.pathname.replace(/^\/+|\/+$/g, '');
  if (!path) return navigate(fallback);
  const [view, slug] = path.split('/').filter(Boolean);

  if (view === 'subjects' && slug) {
    const cat = findCat(decodeURIComponent(slug));
    if (cat) return navigate('category', { cat });
    return navigate('subjects');
  }
  if (view === 'exams' && slug) {
    const exam = findExam(decodeURIComponent(slug));
    if (exam) return navigate('exam', { exam });
    return navigate('exams');
  }
  if (view === 'q' && slug) {
    const qid = parseInt(decodeURIComponent(slug), 10);
    if (Number.isInteger(qid) && qid > 0) return navigate('question', { qid });
    return navigate(fallback);
  }
  if (handlers.has(view)) return navigate(view);
  return navigate(fallback);
}

export function wireNav(root) {
  if (!root) return;
  root.querySelectorAll('[data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(el.dataset.nav);
    });
  });
  root.querySelectorAll('[data-cat-id]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const id = parseInt(el.dataset.catId, 10);
      const found = state.cats.find(c => c.category_id === id) ||
                    state.examCats.find(c => c.category_id === id);
      if (found) navigate('category', { cat: found });
    });
  });
  root.querySelectorAll('[data-exam-id]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const id = parseInt(el.dataset.examId, 10);
      const found = state.exams.find(x => x.id === id);
      if (found) navigate('exam', { exam: found });
    });
  });
  root.querySelectorAll('[data-cat-slug]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const target = normalizeSlug(el.dataset.catSlug);
      const found = state.cats.find(c => normalizeSlug(c.category_slug) === target);
      if (found) navigate('category', { cat: found });
    });
  });
}

window.addEventListener('popstate', () => {
  if (state.cats.length) bootFromPath(currentView || 'home');
});
