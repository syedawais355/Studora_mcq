// Mistake Book — the questions the visitor has answered wrong. Always opens
// in test mode so re-attempting a question and getting it right removes it
// from the list (see mcq.js → clearMistake on correct pick).
import { esc, cleanTitle, skeletons, showErrorState } from '../core/helpers.js?v=1779087891';
import { state, resetSession } from '../core/state.js?v=1779087891';
import { API } from '../core/api.js?v=1779087891';
import { topbar, footer } from '../components/topbar.js?v=1779087891';
import { mcqItem, wireMcqCards } from '../components/mcq.js?v=1779087891';
import { trackPage } from '../components/login-wall.js?v=1779087891';
import { wireNav } from '../core/router.js?v=1779087891';

const root = () => document.getElementById('app');

export async function renderMistakes() {
  if (trackPage()) return;
  resetSession();
  state.testMode = true; // pick-and-grade mode; correct picks resolve the mistake

  const r = root();
  const ids = [...state.mistakes];

  r.innerHTML = `
  ${topbar('home')}
  <main class="nb-wrap">
    <div class="nb-crumbs"><a data-nav="home" href="/">home</a><span class="sep">/</span>mistakes</div>

    <header class="nb-cathead">
      <div class="tag">Mistake book · review what you missed</div>
      <h1>Your <em>wrong</em> answers, waiting for revenge</h1>
      <div class="meta">
        <span><b id="mb-count">${ids.length}</b> open</span>
        <span>resolved when you answer it correctly</span>
      </div>
      <p class="intro">Every question you got wrong lands here automatically. Answer it right and it disappears from the list. The point isn't to feel bad — the point is to come back until each one sticks.</p>
    </header>

    <div class="nb-bm-toolbar">
      <label class="nb-bm-filter">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
        <input type="search" id="mb-search" placeholder="filter by question text or subject…" autocomplete="off">
      </label>
    </div>

    <div id="mb-list">${ids.length ? skeletons(Math.min(ids.length, 5)) : ''}</div>
  </main>
  ${footer()}`;

  wireNav(r);

  const list = document.getElementById('mb-list');

  if (!ids.length) {
    list.innerHTML = `
      <div class="nb-bm-empty">
        <h3>Nothing here — yet</h3>
        <p>When you answer a question wrong in test mode, it shows up on this page. Use the page to come back and try again until every one of them sticks.</p>
        <a class="nb-btn primary" data-nav="subjects" href="/subjects">browse subjects</a>
      </div>`;
    wireNav(list);
    return;
  }

  let rows = [];
  try {
    rows = await API.getQuestionsByIds(ids);
  } catch (err) {
    console.error('mistakes: fetch failed', err);
    showErrorState(list, {
      title: 'Couldn\'t load your mistake book',
      hint: 'Your wrong-answer IDs are safe on this device — try again to fetch them.',
      onRetry: () => renderMistakes(),
    });
    return;
  }

  const catById = new Map(state.cats.map(c => [c.category_id, c]));
  rows.forEach(row => {
    const cat = catById.get(row.category_id);
    if (cat) {
      row.category_title = cleanTitle(cat.category_title || '');
      row.category_slug  = cat.category_slug;
    }
  });

  function render(filter = '') {
    const f = filter.trim().toLowerCase();
    const filtered = f
      ? rows.filter(row => (row.text || '').toLowerCase().includes(f) ||
                           (row.category_title || '').toLowerCase().includes(f))
      : rows;
    if (!filtered.length) {
      list.innerHTML = `<div class="nb-empty">No mistakes match “${esc(filter)}”.</div>`;
      return;
    }
    list.innerHTML = filtered.map((q, i) => mcqItem(q, i + 1, true)).join('');
    // Scope wiring to the freshly-rendered list so a long Mistake Book
    // doesn't trigger a full-document walk on every keystroke (#23).
    wireMcqCards(list);
  }
  render();

  // Debounce the filter input (#23). Without this, every keystroke re-renders
  // the list AND re-walks every .nb-mcq in the document via wireMcqCards.
  // 200ms matches the existing search.js timer pattern from components/search.js.
  document.getElementById('mb-search')?.addEventListener('input', (e) => {
    const value = e.target.value;
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => render(value), 200);
  });
}
