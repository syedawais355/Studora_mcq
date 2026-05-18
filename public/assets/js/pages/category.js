// Category (subject) page — MCQ list with pagination + test-mode toggle.
import { esc, cleanTitle, skeletons, showErrorState } from '../core/helpers.js?v=1779087891';
import { state, resetSession, masteryFor } from '../core/state.js?v=1779087891';
import { BLURBS } from '../core/data.js?v=1779087891';
import { normalizeSlug } from '../core/icons.js?v=1779087891';
import { API } from '../core/api.js?v=1779087891';
import { topbar, footer } from '../components/topbar.js?v=1779087891';
import { mcqItem, wireMcqCards } from '../components/mcq.js?v=1779087891';
import { buildPag } from '../components/pagination.js?v=1779087891';
import { trackPage } from '../components/login-wall.js?v=1779087891';
import { openDownloadModal } from '../components/download-modal.js?v=1779087891';
import { wireNav, navigate } from '../core/router.js?v=1779087891';

const root = () => document.getElementById('app');

export function renderCategory() {
  const cat = state.currentCat;
  if (!cat) { navigate('subjects'); return; }
  if (trackPage()) return;
  resetSession();

  const r = root();
  const title = cleanTitle(cat.category_title || '');
  const slug = normalizeSlug(cat.category_slug);
  const blurb = BLURBS[slug] || BLURBS[cat.category_slug] || cat.blurb || `A focused question bank for ${title}.`;
  const count = (cat.answerable_questions || 0).toLocaleString();
  const pages = Math.ceil((cat.answerable_questions || 0) / state.perPage);

  // Topic mastery (#57). Only render the annotation once the visitor has
  // actually attempted the subject — the original "Untouched" resting state
  // was visual noise on a first visit.
  const mastery = masteryFor(cat.category_id);
  const masteryHtml = mastery.attempts > 0
    ? `<div class="mastery-label" title="${esc(`${mastery.label} — ${Math.round(mastery.accuracy * 100)}% over last ${mastery.attempts}`)}" aria-label="Mastery: ${esc(mastery.label)}">${esc(mastery.label)}.</div>`
    : '';

  r.innerHTML = `
  ${topbar('subjects')}
  <main class="nb-wrap">
    <div class="nb-crumbs">
      <a data-nav="home" href="/">home</a><span class="sep">/</span>
      <a data-nav="subjects" href="/subjects">subjects</a><span class="sep">/</span>
      ${esc(title.toLowerCase())}
    </div>

    <header class="nb-cathead">
      <div class="tag">Subject · question bank</div>
      <h1>${esc(title)} <em>MCQs</em></h1>
      ${masteryHtml}
      <div class="meta">
        <span><b>${count}</b> questions</span>
        <span><b>${pages}</b> pages</span>
        <span>CSS · PPSC · NTS · FPSC</span>
      </div>
      <p class="intro">${esc(blurb)}</p>
    </header>

    <div class="nb-layout">
      <div>
        <div class="nb-toolbar">
          <div class="streak">streak <b id="nb-streak">${state.streak}</b> · solved <b style="color:var(--green)" id="nb-solved">${state.solved}</b></div>
          <div class="nb-toolbar-actions">
            <a class="nb-btn sm" id="nb-pdf" href="/api/category-pdf?category_id=${cat.category_id}" download aria-label="Download MCQs as PDF">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
              <span class="lbl">download pdf</span>
            </a>
            <a class="nb-testmode" id="nb-tm" role="switch" aria-checked="false"><span class="sw"></span>test mode</a>
          </div>
        </div>
        <div id="nb-qs">${skeletons(5)}</div>
        <div class="nb-pag" id="nb-pag"></div>
      </div>
      <aside class="nb-rail">
        <div class="nb-rail-card">
          <h4>Related subjects</h4>
          <ul>${state.cats.filter(c => c.category_id !== cat.category_id).slice(0, 6).map(c => `
            <li><a data-cat-id="${c.category_id}"><span>${esc(cleanTitle(c.category_title || ''))}</span><span>${(c.answerable_questions || 0).toLocaleString()}</span></a></li>
          `).join('')}</ul>
        </div>
        <div class="nb-rail-card">
          <h4>Appears in exams</h4>
          <ul>${state.exams.slice(0, 5).map(x => `
            <li><a data-exam-id="${x.id}"><span>${esc(x.acronym || x.slug)}</span><span class="muted">${esc(x.purpose || '')}</span></a></li>
          `).join('')}</ul>
        </div>
      </aside>
    </div>
  </main>
  ${footer()}`;

  wireNav(r);

  const tmBtn = document.getElementById('nb-tm');
  tmBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    state.testMode = !state.testMode;
    state.streak = 0;
    state.solved = 0;
    tmBtn.classList.toggle('on', state.testMode);
    tmBtn.setAttribute('aria-checked', String(state.testMode));
    loadCatQs(1);
  });

  document.getElementById('nb-pdf')?.addEventListener('click', (e) => {
    e.preventDefault();
    openDownloadModal(cat);
  });

  loadCatQs(1);
}

async function loadCatQs(page) {
  state.questionsPage = page;
  const cat = state.currentCat;
  const list = document.getElementById('nb-qs');
  const pag  = document.getElementById('nb-pag');
  if (!list || !cat) return;
  list.innerHTML = skeletons(5);
  if (pag) pag.innerHTML = '';
  try {
    const offset = (page - 1) * state.perPage;
    const data = await API.getQuestions(cat.category_id, state.perPage, offset);
    if (!data.length) {
      list.innerHTML = '<div class="nb-empty">No questions found for this subject.</div>';
      return;
    }
    // Whole page is already this subject — pass '' to hide the redundant header label.
    list.innerHTML = data.map((q, i) => mcqItem(q, offset + i + 1, state.testMode, '')).join('');
    wireMcqCards();
    buildPag(pag, cat.answerable_questions || 0, page, state.perPage, (p) => loadCatQs(p));
  } catch (err) {
    console.error('loadCatQs failed', err);
    showErrorState(list, {
      title: 'Couldn\'t load questions',
      hint: 'Network blip — try again in a second.',
      onRetry: () => loadCatQs(page),
    });
  }
}
