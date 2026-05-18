// Subjects index page.
import { esc, cleanTitle } from '../core/helpers.js?v=1779087891';
import { catIconImg } from '../core/icons.js?v=1779087891';
import { state, masteryFor } from '../core/state.js?v=1779087891';
import { topbar, footer } from '../components/topbar.js?v=1779087891';
import { trackPage } from '../components/login-wall.js?v=1779087891';
import { wireNav } from '../core/router.js?v=1779087891';

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
        // Topic mastery (#57) — only surface the label once the visitor has
        // actually attempted the subject. The original "Untouched" resting
        // state was visual noise on a fresh visit, so we hide it entirely
        // until there's real data to report.
        const m = masteryFor(c.category_id);
        const masteryHtml = m.attempts > 0
          ? `<em class="mastery-label" title="${esc(`${m.label} — ${Math.round(m.accuracy * 100)}% over last ${m.attempts}`)}" aria-label="Mastery: ${esc(m.label)}">${esc(m.label)}</em>`
          : '';
        return `
        <a data-cat-id="${c.category_id}">
          <span class="ico">${catIconImg(c, cleanTitle(c.category_title || ''))}</span>
          <h4>${esc(cleanTitle(c.category_title || ''))}</h4>
          ${masteryHtml}
          <span>${(c.answerable_questions || 0).toLocaleString()}</span>
        </a>
      `;
      }).join('') : '<a style="padding:20px;font-family:var(--mono);font-size:12px;color:var(--ink-3)">loading…</a>'}
    </div>
  </main>
  ${footer()}`;
  wireNav(r);
}
