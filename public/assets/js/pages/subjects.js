// Subjects index page.
import { esc, cleanTitle } from '../core/helpers.js?v=1778642504';
import { catIconImg } from '../core/icons.js?v=1778642504';
import { state, masteryFor } from '../core/state.js?v=1778642504';
import { topbar, footer } from '../components/topbar.js?v=1778642504';
import { trackPage } from '../components/login-wall.js?v=1778642504';
import { wireNav } from '../core/router.js?v=1778642504';

const root = () => document.getElementById('app');

export function renderSubjects() {
  if (trackPage()) return;
  const r = root();
  const sorted = [...state.cats].sort((a, b) => (b.answerable_questions || 0) - (a.answerable_questions || 0));
  r.innerHTML = `
  ${topbar('subjects')}
  <main class="nb-wrap">
    <div class="nb-crumbs"><a data-nav="home" href="/">home</a><span class="sep">/</span>subjects</div>
    <div class="nb-sh">
      <span class="num">§</span>
      <h2>All <em>subjects</em></h2>
      <span class="caption">— sorted by question count</span>
    </div>
    <div class="nb-cats">
      ${sorted.length ? sorted.map(c => {
        // Topic mastery (#57) — small italic small-caps annotation next to
        // each subject in the grid. The "untouched" resting state stays in
        // --ink-3 so a fresh user doesn't see a wall of labels shouting.
        const m = masteryFor(c.category_id);
        const tip = m.accuracy != null
          ? `${m.label} — ${Math.round(m.accuracy * 100)}% over last ${m.attempts}`
          : 'No attempts on this subject yet';
        const cls = m.attempts === 0 ? 'mastery-label is-untouched' : 'mastery-label';
        return `
        <a data-cat-id="${c.category_id}">
          <span class="ico">${catIconImg(c, cleanTitle(c.category_title || ''))}</span>
          <h4>${esc(cleanTitle(c.category_title || ''))}</h4>
          <em class="${cls}" title="${esc(tip)}" aria-label="Mastery: ${esc(tip)}">${esc(m.label)}</em>
          <span>${(c.answerable_questions || 0).toLocaleString()}</span>
        </a>
      `;
      }).join('') : '<a style="padding:20px;font-family:var(--mono);font-size:12px;color:var(--ink-3)">loading…</a>'}
    </div>
  </main>
  ${footer()}`;
  wireNav(r);
}
