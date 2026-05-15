// Home page — hero (slim) + Exams table + Subjects grid + Daily + Quiz of the day.
import { esc, cleanTitle, animCount, skeletons } from '../core/helpers.js?v=1778642504';
import { icon, catIcon } from '../core/icons.js?v=1778642504';
import { state } from '../core/state.js?v=1778642504';
import { EXAM_META, DAILY_NOTES, formatDate } from '../core/data.js?v=1778642504';
import { topbar, footer } from '../components/topbar.js?v=1778642504';
import { setupSearch } from '../components/search.js?v=1778642504';
import { trackPage } from '../components/login-wall.js?v=1778642504';
import { wireNav, navigate } from '../core/router.js?v=1778642504';

const root = () => document.getElementById('app');

export async function renderHome() {
  if (trackPage()) return;
  const r = root();
  const cats   = state.cats.slice(0, 24);
  const exams  = state.exams.slice(0, 8);                       // top 8 by MCQ count (sorted server-side)
  const totalQ = state.cats.reduce((a, c) => a + (c.answerable_questions || 0), 0);

  r.innerHTML = `
  ${topbar('home')}
  <section class="nb-hero">
    <h1>A quieter place to <em>practice</em> for <mark class="hl">Pakistan's</mark> toughest exams — <em>built like a notebook,</em> <mark class="hl g">fast like an app</mark>.</h1>
    <div class="nb-search nb-search-wide">
      <input id="nb-si" placeholder='try "indus waters treaty", "karl pearson", "mona lisa"…' autocomplete="off" aria-label="Search questions">
      <button id="nb-sb" type="button">search ⏎</button>
      <div class="nb-sdrop" id="nb-sd" style="display:none" role="listbox"></div>
    </div>
    <div class="nb-stats">
      <div>questions<strong id="hs-q">${totalQ ? totalQ.toLocaleString() : '—'}</strong></div>
      <div>subjects<strong id="hs-s">${state.cats.length || '—'}</strong></div>
      <div>exam tracks<strong id="hs-e">${state.exams.length || '—'}</strong></div>
      <div>updated<strong><em>daily</em></strong></div>
    </div>
  </section>

  <main class="nb-wrap">
    <div class="nb-sh">
      <h2>Exams</h2>
      <a class="more" data-nav="exams">view all →</a>
    </div>
    <div class="nb-exams compact">
      <div class="row head"><div>no.</div><div>exam</div><div>track</div><div>mcqs</div><div></div></div>
      ${exams.length ? exams.map((x, i) => {
        const m = EXAM_META[(x.slug || '').toLowerCase()] || {};
        const total = x.total_questions ?? 0;
        return `<a class="row" data-exam-id="${x.id}">
          <div class="n">${String(i + 1).padStart(2, '0')}</div>
          <div><h3>${esc(x.acronym || x.slug || '')}</h3></div>
          <div class="tag">${esc(m.tagline || x.purpose || '')}</div>
          <div class="count">${total ? total.toLocaleString() : '–'}</div>
          <div class="go">open</div>
        </a>`;
      }).join('') : `<div style="padding:24px">${skeletons(4)}</div>`}
    </div>

    <div class="nb-sh">
      <h2>All <em>subjects</em></h2>
      <a class="more" data-nav="subjects">browse all →</a>
    </div>
    <div class="nb-cats">
      ${cats.length ? cats.map(c => `
        <a data-cat-id="${c.category_id}">
          <span class="ico">${icon(catIcon(c))}</span>
          <h4>${esc(cleanTitle(c.category_title || ''))}</h4>
          <span>${(c.answerable_questions || 0).toLocaleString()}</span>
        </a>
      `).join('') : '<a style="padding:20px;font-family:var(--mono);font-size:12px;color:var(--ink-3)">loading subjects…</a>'}
    </div>

    <div class="nb-sh">
      <h2>Today's <em>notes</em></h2>
      <span class="caption">— current affairs, daily</span>
    </div>
    <div class="nb-daily-wrap">
      <div class="nb-daily">
        <div class="head"><h3>This week in Pakistan</h3><span class="live">live · auto-updating</span></div>
        ${DAILY_NOTES.map(n => `
          <div class="item">
            <div class="date">${esc(formatDate(n.date))}</div>
            <q>${esc(n.text)}</q>
          </div>
        `).join('')}
      </div>
      <div class="nb-qod">
        <h3>Quiz of the <em>day</em></h3>
        <p>10 questions · 3 minutes · one tap to start. Pulled fresh from current affairs and general knowledge.</p>
        <button id="nb-quiz" type="button">start quiz →</button>
      </div>
    </div>
  </main>
  ${footer()}`;

  wireNav(r);
  setupSearch();
  document.getElementById('nb-quiz')?.addEventListener('click', () => {
    navigate('quiz');
  });

  if (totalQ) {
    animCount(document.getElementById('hs-q'), totalQ);
    animCount(document.getElementById('hs-s'), state.cats.length);
    animCount(document.getElementById('hs-e'), state.exams.length);
  }
}
