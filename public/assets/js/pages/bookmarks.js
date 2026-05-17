// Bookmarks page — the visitor's saved questions, fetched by ID from /api/questions-by-ids.
import { esc, cleanTitle, skeletons, showErrorState } from '../core/helpers.js?v=1778642504';
import { state, resetSession } from '../core/state.js?v=1778642504';
import { API } from '../core/api.js?v=1778642504';
import { topbar, footer } from '../components/topbar.js?v=1778642504';
import { mcqItem, wireMcqCards } from '../components/mcq.js?v=1778642504';
import { trackPage } from '../components/login-wall.js?v=1778642504';
import { wireNav } from '../core/router.js?v=1778642504';

const root = () => document.getElementById('app');

export async function renderBookmarks() {
  if (trackPage()) return;
  resetSession();

  const r = root();
  const ids = [...state.bookmarks];

  r.innerHTML = `
  ${topbar('home')}
  <main class="nb-wrap">
    <div class="nb-crumbs"><a data-nav="home" href="/">home</a><span class="sep">/</span>bookmarks</div>

    <header class="nb-cathead">
      <div class="tag">Your shelf · saved MCQs</div>
      <h1>Bookmarked <em>questions</em></h1>
      <div class="meta">
        <span><b id="bm-count">${ids.length}</b> saved</span>
        <span>sorted by save order</span>
      </div>
      <p class="intro">Tap the bookmark icon on any question to add it here. Bookmarks live on this device.</p>
    </header>

    <div class="nb-bm-toolbar">
      <label class="nb-bm-filter">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
        <input type="search" id="bm-search" placeholder="filter your bookmarks…" autocomplete="off">
      </label>
    </div>

    <div id="bm-list">${ids.length ? skeletons(Math.min(ids.length, 5)) : ''}</div>
  </main>
  ${footer()}`;

  wireNav(r);

  const list = document.getElementById('bm-list');

  if (!ids.length) {
    list.innerHTML = `
      <div class="nb-bm-empty">
        <h3>No bookmarks yet</h3>
        <p>Browse a subject and tap the <b>bookmark</b> button on any question to save it here.</p>
        <a class="nb-btn primary" data-nav="subjects" href="/subjects">browse subjects</a>
      </div>`;
    wireNav(list);
    return;
  }

  let rows = [];
  try {
    rows = await API.getQuestionsByIds(ids);
  } catch (err) {
    console.error('bookmarks: fetch failed', err);
    showErrorState(list, {
      title: 'Couldn\'t load your bookmarks',
      hint: 'Your saved IDs are safe on this device — try again to fetch them.',
      onRetry: () => renderBookmarks(),
    });
    return;
  }

  // Hydrate category title for each row so the MCQ card header reads nicely.
  const catById = new Map(state.cats.map(c => [c.category_id, c]));
  rows.forEach(r => {
    const cat = catById.get(r.category_id);
    if (cat) {
      r.category_title = cleanTitle(cat.category_title || '');
      r.category_slug  = cat.category_slug;
    }
  });

  function render(filter = '') {
    const f = filter.trim().toLowerCase();
    const filtered = f
      ? rows.filter(r => (r.text || '').toLowerCase().includes(f) ||
                         (r.category_title || '').toLowerCase().includes(f))
      : rows;
    if (!filtered.length) {
      list.innerHTML = `<div class="nb-empty">No bookmarks match “${esc(filter)}”.</div>`;
      return;
    }
    list.innerHTML = filtered.map((q, i) => mcqItem(q, i + 1, false)).join('');
    wireMcqCards();
  }
  render();

  document.getElementById('bm-search')?.addEventListener('input', (e) => render(e.target.value));
}
