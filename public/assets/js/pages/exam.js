// Exam pillar page — hero stats + subject tabs + MCQ feed + FAQ.
import { esc, cleanTitle, animCount, skeletons, showErrorState } from '../core/helpers.js?v=1778642504';
import { state, resetSession } from '../core/state.js?v=1778642504';
import { EXAM_META } from '../core/data.js?v=1778642504';
import { topbar, footer } from '../components/topbar.js?v=1778642504';
import { mcqItem, wireMcqCards } from '../components/mcq.js?v=1778642504';
import { buildPag } from '../components/pagination.js?v=1778642504';
import { buildFAQ } from '../components/faq.js?v=1778642504';
import { trackPage } from '../components/login-wall.js?v=1778642504';
import { openExamDownloadModal } from '../components/exam-download-modal.js?v=1778642504';
import { wireNav, navigate } from '../core/router.js?v=1778642504';
import { API } from '../core/api.js?v=1778642504';

const root = () => document.getElementById('app');

export async function renderExam() {
  const exam = state.currentExam;
  if (!exam) { navigate('exams'); return; }
  if (trackPage()) return;
  resetSession();

  const r = root();
  const slug = (exam.slug || '').toLowerCase();
  const meta = EXAM_META[slug] || {};

  r.innerHTML = `
  ${topbar('exams')}
  <main class="nb-wrap">
    <div class="nb-crumbs">
      <a data-nav="home" href="/">home</a><span class="sep">/</span>
      <a data-nav="exams" href="/exams">exams</a><span class="sep">/</span>
      ${esc((exam.slug || '').toUpperCase())}
    </div>

    <header class="nb-exhead">
      <div class="tag">Federal · annual · ${esc(meta.level || '')}</div>
      <h1>${esc(exam.acronym || exam.slug || '')} <span class="y">${esc(exam.full_name || '')}</span></h1>
      <p>${esc(exam.purpose || '')}</p>
      <div class="grid">
        <div class="g">total mcqs<strong id="em-q">–</strong></div>
        <div class="g">subjects<strong id="em-s">–</strong></div>
        <div class="g">next sitting<strong>${esc(meta.next || '–')}</strong></div>
        <div class="g">pass rate<strong>${esc(meta.pass || '–')}</strong></div>
      </div>
    </header>

    <div class="nb-dl">
      <div><h4>Complete ${esc(exam.acronym || exam.slug || '')} MCQ book — PDF</h4><p>Every subject linked to this exam, bundled with chapter dividers.</p></div>
      <a id="ex-dl-go" href="#" role="button" aria-label="Open download options">download →</a>
    </div>

    <div class="nb-sh" style="margin-top:24px"><span class="num">§</span><h2>Subject <em>breakdown</em></h2><span class="caption">— tap a tab to filter</span></div>
    <div class="nb-tabs" id="nb-tabs" role="tablist"></div>

    <div class="nb-layout" style="margin-top:18px">
      <div>
        <div class="nb-toolbar">
          <div class="streak">streak <b id="nb-streak">${state.streak}</b> · solved <b style="color:var(--green)" id="nb-solved">${state.solved}</b></div>
          <a class="nb-testmode" id="nb-tm" role="switch" aria-checked="false"><span class="sw"></span>test mode</a>
        </div>
        <div id="nb-eq">${skeletons(4)}</div>
        <div class="nb-pag" id="nb-epag"></div>
        <section class="nb-faq" id="nb-faq"></section>
      </div>
      <aside class="nb-rail">
        <div class="nb-rail-card">
          <h4>Related exams</h4>
          <ul>${state.exams.filter(e => e.id !== exam.id).slice(0, 5).map(x => `
            <li><a data-exam-id="${x.id}"><span>${esc(x.acronym || x.slug)}</span><span>${esc((EXAM_META[(x.slug || '').toLowerCase()] || {}).level || '')}</span></a></li>
          `).join('')}</ul>
        </div>
        <div class="nb-rail-card">
          <h4>Jump to subject</h4>
          <ul id="nb-esubs"></ul>
        </div>
      </aside>
    </div>
  </main>
  ${footer()}`;

  wireNav(r);

  try {
    state.examCats = await API.getExamCategories(exam.id);
  } catch { state.examCats = []; }

  document.getElementById('ex-dl-go')?.addEventListener('click', (e) => {
    e.preventDefault();
    openExamDownloadModal(exam, state.examCats);
  });

  const totalQ = state.examCats.reduce((a, c) => a + (c.question_count || 0), 0);
  animCount(document.getElementById('em-q'), totalQ);
  const emS = document.getElementById('em-s');
  if (emS) emS.textContent = state.examCats.length;

  const subRail = document.getElementById('nb-esubs');
  if (subRail) subRail.innerHTML = state.examCats.slice(0, 8).map(c => `
    <li><a data-cat-id="${c.category_id}"><span>${esc(cleanTitle(c.category_title || ''))}</span><span>${(c.question_count || 0).toLocaleString()}</span></a></li>
  `).join('');

  const tabsEl = document.getElementById('nb-tabs');
  if (tabsEl) {
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'active';
    allBtn.innerHTML = `All<span class="n">${totalQ.toLocaleString()}</span>`;
    allBtn.addEventListener('click', () => selectTab('all', allBtn));
    tabsEl.appendChild(allBtn);
    state.examCats.forEach((c) => {
      const t = document.createElement('button');
      t.type = 'button';
      t.innerHTML = `${esc(cleanTitle(c.category_title || ''))}<span class="n">${(c.question_count || 0).toLocaleString()}</span>`;
      t.addEventListener('click', () => selectTab(c, t));
      tabsEl.appendChild(t);
    });
  }

  buildFAQ(document.getElementById('nb-faq'), examFAQ(exam, meta));
  wireNav(r);

  const tmBtn = document.getElementById('nb-tm');
  tmBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    state.testMode = !state.testMode;
    state.streak = 0;
    state.solved = 0;
    tmBtn.classList.toggle('on', state.testMode);
    tmBtn.setAttribute('aria-checked', String(state.testMode));
    const active = document.querySelector('#nb-tabs button.active');
    const idx = active ? Array.from(active.parentNode.children).indexOf(active) : 0;
    loadExamQs(idx === 0 ? 'all' : state.examCats[idx - 1]);
  });

  await loadExamQs('all');
}

async function selectTab(catOrAll, btn) {
  document.querySelectorAll('#nb-tabs button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  await loadExamQs(catOrAll);
}

async function loadExamQs(catOrAll) {
  const list = document.getElementById('nb-eq');
  const pag  = document.getElementById('nb-epag');
  if (!list) return;
  list.innerHTML = skeletons(4);
  if (pag) pag.innerHTML = '';
  try {
    const cat = catOrAll === 'all' ? (state.examCats[0] || null) : catOrAll;
    if (!cat) {
      list.innerHTML = '<div class="nb-empty">No subjects linked to this exam yet.</div>';
      return;
    }
    const data = await API.getQuestions(cat.category_id, state.perPage, 0);
    if (!data.length) {
      list.innerHTML = '<div class="nb-empty">No questions available.</div>';
      return;
    }
    const subjectLabel = cleanTitle(cat.category_title || '');
    list.innerHTML = data.map((q, i) => mcqItem(q, i + 1, state.testMode, subjectLabel)).join('');
    wireMcqCards();
    buildPag(pag, cat.question_count || cat.answerable_questions || 0, 1, state.perPage, (pg) => {
      API.getQuestions(cat.category_id, state.perPage, (pg - 1) * state.perPage).then((d) => {
        list.innerHTML = d.map((q, i) => mcqItem(q, (pg - 1) * state.perPage + i + 1, state.testMode, subjectLabel)).join('');
        wireMcqCards();
        window.scrollTo({ top: 320, behavior: 'smooth' });
      });
    });
  } catch (err) {
    console.error('loadExamQs failed', err);
    showErrorState(list, {
      title: 'Couldn\'t load questions',
      hint: 'Network blip — try again in a second.',
      onRetry: () => loadExamQs(catOrAll),
    });
  }
}

function examFAQ(exam, meta) {
  const acro = exam.acronym || exam.slug || '';
  return [
    { q: `How many MCQs are available for ${acro}?`, a: `Studora ships several thousand questions for ${esc(exam.full_name || acro)}, sourced from past papers and standard syllabi.` },
    { q: `When is the next ${acro} exam?`, a: `The next sitting is expected around <b>${esc(meta.next || 'TBD')}</b>. Always confirm from the conducting body.` },
    { q: 'What subjects are covered?', a: `${esc(exam.full_name || acro)} covers the core syllabus subjects. Use the tabs above to filter by subject.` },
    { q: 'Can I download these MCQs as a PDF?', a: 'Yes — click the download button above to get the full bundle as a printable PDF, free forever.' },
  ];
}
