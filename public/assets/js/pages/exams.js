// Exams index page.
import { esc } from '../core/helpers.js?v=1778642504';
import { state } from '../core/state.js?v=1778642504';
import { EXAM_META } from '../core/data.js?v=1778642504';
import { topbar, footer } from '../components/topbar.js?v=1778642504';
import { trackPage } from '../components/login-wall.js?v=1778642504';
import { wireNav } from '../core/router.js?v=1778642504';

const root = () => document.getElementById('app');

export function renderExams() {
  if (trackPage()) return;
  const r = root();
  r.innerHTML = `
  ${topbar('exams')}
  <main class="nb-wrap">
    <div class="nb-crumbs"><a data-nav="home">home</a><span class="sep">/</span>exams</div>
    <div class="nb-sh">
      <span class="num">§</span>
      <h2>National <em>exams</em></h2>
      <span class="caption">— eight tracks Studora covers</span>
    </div>
    <div class="nb-exams compact">
      <div class="row head"><div>no.</div><div>exam</div><div>track</div><div>mcqs</div><div></div></div>
      ${state.exams.map((x, i) => {
        const m = EXAM_META[(x.slug || '').toLowerCase()] || {};
        const total = x.total_questions ?? 0;
        return `<a class="row" data-exam-id="${x.id}">
          <div class="n">${String(i + 1).padStart(2, '0')}</div>
          <div><h3>${esc(x.acronym || x.slug || '')}</h3></div>
          <div class="tag">${esc(m.tagline || x.purpose || '')}</div>
          <div class="count">${total ? total.toLocaleString() : '–'}</div>
          <div class="go">open</div>
        </a>`;
      }).join('')}
    </div>
  </main>
  ${footer()}`;
  wireNav(r);
}
