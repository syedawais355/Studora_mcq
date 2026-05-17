// Subjects index page.
import { esc, cleanTitle } from '../core/helpers.js?v=1778642504';
import { icon, catIcon } from '../core/icons.js?v=1778642504';
import { state } from '../core/state.js?v=1778642504';
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
      ${sorted.length ? sorted.map(c => `
        <a data-cat-id="${c.category_id}">
          <span class="ico">${icon(catIcon(c))}</span>
          <h4>${esc(cleanTitle(c.category_title || ''))}</h4>
          <span>${(c.answerable_questions || 0).toLocaleString()}</span>
        </a>
      `).join('') : '<a style="padding:20px;font-family:var(--mono);font-size:12px;color:var(--ink-3)">loading…</a>'}
    </div>
  </main>
  ${footer()}`;
  wireNav(r);
}
