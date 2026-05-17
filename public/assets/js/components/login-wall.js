// Hard login wall — no dismiss. After the visitor consumes their free quota
// (FREE_PAGES in state.js), the SPA refuses to render content of any kind
// until they sign in.
//
// Tamper resistance:
//   - The wall replaces #app entirely (no underlying content to scrape).
//   - A MutationObserver re-renders the wall if anyone removes it via dev tools.
//   - Page counter is mirrored across localStorage / sessionStorage / cookie
//     (see core/storage.js) — wiping any single store doesn't reset progress.
//   - Browser back/forward re-runs the gate (router popstate → bootFromPath).
import { state, trackPage as trackPageStorage, isWalledOff } from '../core/state.js?v=1778642504';
import { signInWithGoogle } from '../core/auth.js?v=1778642504';
import { toast } from '../core/toast.js?v=1778642504';
import { studoraLockup } from './topbar.js?v=1778642504';

const APP_ID = 'app';
let observer = null;
let trappedNodes = [];
let trapHandler = null;

// Page-view tracker used by every page renderer at the top of its body. Bumps
// the cross-store counter and forces the wall up if the quota is exhausted.
// Returns `true` when the wall is now mounted so callers can skip their own
// render and avoid overwriting #app.
export function trackPage() {
  trackPageStorage();
  if (isWalledOff()) { showWall(); return true; }
  return false;
}

export function showWall() {
  if (state.user) return;
  const app = document.getElementById(APP_ID);
  if (!app) return;
  if (state.wallActive && app.querySelector('.nb-wall.is-hard')) return;
  state.wallActive = true;

  app.innerHTML = wallHtml();
  document.documentElement.style.overflow = 'hidden';

  wireWall(app);
  trapFocus(app);
  installObserver(app);
}

// Called by the auth listener after a successful sign-in so the SPA can
// resume normal rendering.
export function releaseWall() {
  state.wallActive = false;
  document.documentElement.style.overflow = '';
  if (observer) { observer.disconnect(); observer = null; }
  releaseTrap();
}

// Inert the rest of the document, focus the primary CTA, and wire a Tab
// keydown handler that wraps focus inside the dialog. WCAG 2.4.3 /
// dialog-pattern guidance: a modal must not leak focus to background nodes.
function trapFocus(app) {
  const dialog = app.querySelector('.nb-wall.is-hard');
  if (!dialog) return;
  const cta = app.querySelector('#wall-google');
  if (cta && typeof cta.focus === 'function') cta.focus();

  trappedNodes = Array.from(document.body.children).filter(n => n.id !== APP_ID);
  trappedNodes.forEach(n => n.setAttribute('inert', ''));

  trapHandler = (e) => {
    if (e.key !== 'Tab') return;
    const focusables = dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener('keydown', trapHandler);
}

function releaseTrap() {
  trappedNodes.forEach(n => n.removeAttribute('inert'));
  trappedNodes = [];
  if (trapHandler) {
    document.removeEventListener('keydown', trapHandler);
    trapHandler = null;
  }
}

function wallHtml() {
  const pages = state.pagesVisited;
  const totalQ = state.cats.reduce((a, c) => a + (c.answerable_questions || 0), 0);
  const totalLabel = totalQ ? totalQ.toLocaleString() + '+' : '105,890+';

  return `
  <div class="nb-wall is-hard" role="dialog" aria-modal="true" aria-labelledby="nb-wall-h">
    <header class="nb-wall-top">
      <span class="nb-logo" aria-label="Studora">${studoraLockup()}</span>
    </header>

    <main class="nb-wall-main">
      <div class="nb-wall-card">
        <div class="nb-wall-tag" aria-hidden="true">Free preview · ${pages}/5 pages</div>
        <h3 id="nb-wall-h">Sign in to <em>keep reading.</em></h3>
        <p class="nb-wall-sub">Continue with Google — your bookmarks, streaks and progress
        sync across devices, and the rest of Studora is yours.</p>

        <ul class="nb-wall-perks" role="list">
          <li><span class="ck" aria-hidden="true">${checkSvg()}</span><span><b>47 subjects</b> · ${totalLabel} verified MCQs</span></li>
          <li><span class="ck" aria-hidden="true">${checkSvg()}</span><span><b>Download any subject</b> as a clean PDF</span></li>
          <li><span class="ck" aria-hidden="true">${checkSvg()}</span><span><b>Bookmarks &amp; streaks</b> follow you across devices</span></li>
          <li><span class="ck" aria-hidden="true">${checkSvg()}</span><span><b>Test mode</b> with explanations after each pick</span></li>
        </ul>

        <button class="nb-wall-cta" id="wall-google" type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M21.35 11.1H12v3.18h5.34c-.23 1.45-1.7 4.27-5.34 4.27-3.21 0-5.83-2.66-5.83-5.95s2.62-5.95 5.83-5.95c1.83 0 3.06.78 3.76 1.45l2.56-2.46C16.66 4.21 14.5 3.27 12 3.27 6.93 3.27 2.83 7.37 2.83 12.5c0 5.13 4.1 9.23 9.17 9.23 5.29 0 8.79-3.72 8.79-8.96 0-.6-.07-1.06-.16-1.67z"/>
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>
    </main>
  </div>`;
}

function checkSvg() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l5 5L20 6"/></svg>`;
}

function wireWall(app) {
  const btn = app.querySelector('#wall-google');
  btn?.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      toast('Sign-in failed — please try again.', 'err');
      btn.disabled = false;
    }
  });
}

function installObserver(app) {
  if (observer) observer.disconnect();
  observer = new MutationObserver(() => {
    if (state.user || !isWalledOff()) return; // legit state transition
    if (!app.querySelector('.nb-wall.is-hard')) {
      app.innerHTML = wallHtml();
      wireWall(app);
    }
  });
  observer.observe(app, { childList: true, subtree: true });
}
