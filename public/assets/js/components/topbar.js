// Top bar — sticky, Studora SVG mark + "tudora" wordmark + nav + auth CTA.
import { state } from '../core/state.js?v=1778642504';

// Reusable inner lockup — SVG mark (the "S") followed by the "tudora" wordmark
// so the eye reads "Studora". Caller wraps it in its own anchor/span.
export function studoraLockup() {
  return `<img class="mark" src="/assets/img/studora-logo.svg?v=1" alt="" decoding="async"><span class="word">tudora</span><em>/notebook</em>`;
}

export function topbar(active = 'home') {
  const streakHtml = state.streak > 0
    ? `<span class="nb-streak-mini" id="nb-topstreak">streak <b>${state.streak}</b></span>`
    : '';

  const cta = state.user
    ? userMenu(state.user)
    : `<a class="nb-btn primary" data-action="signin" tabindex="0">sign in with Google →</a>`;

  return `<header class="nb-top"><div class="nb-top-in">
    <a class="nb-logo" data-nav="home" aria-label="Studora home">${studoraLockup()}</a>
    <nav class="nb-nav" aria-label="Primary">
      <a data-nav="home"     class="${active === 'home' ? 'active' : ''}">home</a>
      <a data-nav="subjects" class="${active === 'subjects' ? 'active' : ''}">subjects</a>
      <a data-nav="exams"    class="${active === 'exams' ? 'active' : ''}">exams</a>
      <a data-nav="bookmarks" class="${active === 'bookmarks' ? 'active' : ''}">bookmarks</a>
      <a data-nav="mistakes" class="${active === 'mistakes' ? 'active' : ''}">mistakes${state.mistakes?.length ? ` <b class="nb-nav-badge">${state.mistakes.length}</b>` : ''}</a>
      <a data-nav="about"    class="${active === 'about' ? 'active' : ''}">about</a>
    </nav>
    <div class="nb-top-cta">
      ${streakHtml}
      ${cta}
    </div>
  </div></header>`;
}

function userMenu(user) {
  const initial = (user.name || '?').charAt(0).toUpperCase();
  const avatarSrc = user.avatar ? `<img src="${esc(user.avatar)}" alt="" referrerpolicy="no-referrer">` : initial;
  return `<div class="nb-user" tabindex="0">
    <button class="nb-user-btn" type="button" aria-haspopup="menu" aria-expanded="false">
      <span class="nb-avatar" aria-hidden="true">${avatarSrc}</span>
      <span class="nb-user-name">${esc(user.name)}</span>
    </button>
    <div class="nb-user-pop" role="menu">
      <div class="nb-user-id">
        <div class="nb-user-name-full">${esc(user.name)}</div>
        <div class="nb-user-email">${esc(user.email || '')}</div>
      </div>
      <button type="button" data-action="signout" role="menuitem">sign out</button>
    </div>
  </div>`;
}

const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ENT[c]); }

export function footer() {
  return `<footer class="nb-foot"><div class="nb-foot-in">
    <div>© Studora · Made in Bahawalpur for <em style="font-family:var(--serif);font-style:italic">every student in Pakistan</em></div>
    <div>
      <a data-nav="home">home</a>
      <a data-nav="subjects">subjects</a>
      <a data-nav="exams">exams</a>
      <a data-nav="bookmarks">bookmarks</a>
      <a data-nav="mistakes">mistakes</a>
      <a data-nav="about">about</a>
    </div>
  </div></footer>`;
}
