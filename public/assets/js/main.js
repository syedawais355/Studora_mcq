// Studora SPA entry. Boots data, hydrates local state, wires Supabase Auth,
// registers routes, hydrates from URL path.
//
// Route handlers are registered as dynamic-import thunks so the first paint
// only pulls in the page renderer the current URL actually needs. Sibling
// page modules and the modal components (download / report / exam-download)
// stay off the critical path until the user navigates to them or opens them.
import { API } from './core/api.js?v=1778642504';
import { state, hydrateFromStorage, setUser } from './core/state.js?v=1778642504';
import { register, bootFromPath } from './core/router.js?v=1778642504';
import { onAuthChange, currentUser, signOut } from './core/auth.js?v=1778642504';
import { releaseWall } from './components/login-wall.js?v=1778642504';
import { toast } from './core/toast.js?v=1778642504';
// The page renderers are NOT statically imported — they're behind dynamic
// import() thunks below so first paint only pulls the route the URL needs.
// rerenderTopbar is imported eagerly so the storage-event listener can swap
// the topbar in place across tabs without an extra round trip.
import { topbar, rerenderTopbar } from './components/topbar.js?v=1778642504';

const root = document.getElementById('app');

// Dynamic-import thunks — the bundler keeps each page in its own chunk and the
// browser only fetches the one the current route resolves to. params is
// threaded through so renderers that take arguments (renderQuestion) still
// receive them; extra params on the others are harmless.
register('home',      (params) => import('./pages/home.js?v=1778642504').then(m => m.renderHome(params)));
register('subjects',  (params) => import('./pages/subjects.js?v=1778642504').then(m => m.renderSubjects(params)));
register('exams',     (params) => import('./pages/exams.js?v=1778642504').then(m => m.renderExams(params)));
register('category',  (params) => import('./pages/category.js?v=1778642504').then(m => m.renderCategory(params)));
register('exam',      (params) => import('./pages/exam.js?v=1778642504').then(m => m.renderExam(params)));
register('about',     (params) => import('./pages/about.js?v=1778642504').then(m => m.renderAbout(params)));
register('bookmarks', (params) => import('./pages/bookmarks.js?v=1778642504').then(m => m.renderBookmarks(params)));
register('mistakes',  (params) => import('./pages/mistakes.js?v=1778642504').then(m => m.renderMistakes(params)));
register('question',  (params) => import('./pages/question.js?v=1778642504').then(m => m.renderQuestion(params)));
register('quiz',      (params) => import('./pages/quiz.js?v=1778642504').then(m => m.renderQuiz(params)));
register('analytics', (params) => import('./pages/analytics.js?v=1778642504').then(m => m.renderAnalytics(params)));

// Delegated click-handler for actions baked into the topbar / login wall —
// these elements get re-rendered, so we attach once at the document level.
document.addEventListener('click', async (e) => {
  // User-menu toggle
  const userBtn = e.target.closest('.nb-user-btn');
  if (userBtn) {
    userBtn.closest('.nb-user')?.classList.toggle('open');
    return;
  }
  // Click outside any open user-menu closes it
  if (!e.target.closest('.nb-user')) {
    document.querySelectorAll('.nb-user.open').forEach(el => el.classList.remove('open'));
  }

  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  if (action === 'signin') {
    const { signInWithGoogle } = await import('./core/auth.js?v=1778642504');
    try { await signInWithGoogle(); }
    catch (err) { console.error(err); toast('Sign-in failed — please try again.', 'err'); }
  }
  if (action === 'signout') {
    try { await signOut(); toast('Signed out.', 'ok'); }
    catch (err) { console.error(err); toast('Sign-out failed.', 'err'); }
  }
});

async function loadCore() {
  try {
    const [cats, exams] = await Promise.all([API.getCategories(), API.getExams()]);
    state.cats  = cats  || [];
    state.exams = exams || [];
    return state.cats.length > 0;
  } catch (err) {
    console.error('loadCore failed', err);
    return false;
  }
}

function renderBootError() {
  root.innerHTML = topbar('home') + `
    <main class="nb-wrap" style="padding-top:60px">
      <div class="nb-empty nb-empty-err nb-boot-err" role="alert">
        <svg class="ic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><circle cx="12" cy="16" r="0.6" fill="currentColor"/>
        </svg>
        <h4>Couldn't reach Studora</h4>
        <p>Your connection is patchy or our server is taking a breath. Tap retry to try again.</p>
        <button class="nb-btn primary nb-empty-retry" type="button" id="boot-retry">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>
          </svg>
          <span>retry</span>
        </button>
      </div>
    </main>`;
  document.getElementById('boot-retry')?.addEventListener('click', () => {
    API.clearCache();
    init();
  });
}

async function init() {
  hydrateFromStorage();
  root.innerHTML = topbar('home') + '<div style="padding:60px 24px;font-family:var(--mono);font-size:13px;color:var(--ink-3);text-align:center">loading…</div>';

  // Supabase will detect ?code=… in the URL and exchange it for a session
  // here. After that finishes, currentUser() returns the signed-in user.
  // currentUser() now awaits a lazy import of the supabase vendor bundle —
  // anonymous visitors who never sign in still pay that cost once on first
  // load, but bookmarks/mistakes/report flows would have triggered it anyway,
  // and the inline loading state above covers the extra network round trip.
  try {
    const user = await currentUser();
    setUser(user);
  } catch { /* anonymous OK */ }

  // Load core data BEFORE subscribing to auth events. Supabase fires INITIAL_SESSION
  // the moment a listener subscribes; if we subscribed first the callback would
  // call bootFromPath() with state.cats=[] and clobber the deep-link slug.
  // /api/* already retries once internally; this is the belt-and-braces second
  // chance. After two hard failures we show the boot-error screen.
  let ok = await loadCore();
  if (!ok) {
    await new Promise(r => setTimeout(r, 800));
    ok = await loadCore();
  }
  if (!ok) {
    renderBootError();
    return;
  }
  bootFromPath('home');

  // Re-render the active route on actual sign-in / sign-out so the topbar
  // reflects auth state. Safe to subscribe now — cats are populated.
  let firstAuthEvent = true;
  onAuthChange((user) => {
    const wasGuest = !state.user;
    setUser(user);
    if (user && wasGuest) releaseWall(); // signed in → tear down the hard wall
    if (firstAuthEvent) { firstAuthEvent = false; return; } // skip INITIAL_SESSION echo
    bootFromPath('home');
  });
}

init();

// Cross-tab state sync (#22). When another tab mutates localStorage,
// core/state.js re-hydrates and fires `studora:state-changed`. The
// rerenderTopbar helper swaps `.nb-top` in-place so the mistake badge /
// streak pill update without re-rendering the whole route — no scroll
// jump, no input refocus loss.
document.addEventListener('studora:state-changed', rerenderTopbar);

// Register the service worker. Silent failure is fine — offline mode is a
// nice-to-have, not a hard requirement. If the document is already past
// 'load' (true for type=module scripts that run after DOMContentLoaded),
// register immediately; otherwise wait for the load event so install never
// blocks first paint.
if ('serviceWorker' in navigator) {
  const register = () => navigator.serviceWorker
    .register('/sw.js')
    .catch(() => { /* swallow */ });
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
