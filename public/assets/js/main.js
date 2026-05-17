// Studora SPA entry. Boots data, hydrates local state, wires Supabase Auth,
// registers routes, hydrates from URL path.
import { API } from './core/api.js?v=1778642504';
import { state, hydrateFromStorage, setUser } from './core/state.js?v=1778642504';
import { register, navigate, bootFromPath } from './core/router.js?v=1778642504';
import { onAuthChange, currentUser, signOut } from './core/auth.js?v=1778642504';
import { releaseWall } from './components/login-wall.js?v=1778642504';
import { toast } from './core/toast.js?v=1778642504';
import { renderHome }     from './pages/home.js?v=1778642504';
import { renderSubjects } from './pages/subjects.js?v=1778642504';
import { renderExams }    from './pages/exams.js?v=1778642504';
import { renderCategory } from './pages/category.js?v=1778642504';
import { renderExam }     from './pages/exam.js?v=1778642504';
import { renderAbout }    from './pages/about.js?v=1778642504';
import { renderBookmarks } from './pages/bookmarks.js?v=1778642504';
import { renderMistakes }  from './pages/mistakes.js?v=1778642504';
import { renderQuestion } from './pages/question.js?v=1778642504';
import { renderQuiz }     from './pages/quiz.js?v=1778642504';
import { topbar }         from './components/topbar.js?v=1778642504';

const root = document.getElementById('app');

register('home',     renderHome);
register('subjects', renderSubjects);
register('exams',    renderExams);
register('category', renderCategory);
register('exam',     renderExam);
register('about',    renderAbout);
register('bookmarks', renderBookmarks);
register('mistakes', renderMistakes);
register('question', renderQuestion);
register('quiz', renderQuiz);

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
