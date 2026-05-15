// Single-MCQ permalink page — `/q/<id>`. Fetches the question by id, hydrates
// its subject from state.cats, and shows it as a spotlight card with a clear
// path back to its subject.
import { esc, cleanTitle, skeletons } from '../core/helpers.js?v=1778642504';
import { state, resetSession } from '../core/state.js?v=1778642504';
import { API } from '../core/api.js?v=1778642504';
import { topbar, footer } from '../components/topbar.js?v=1778642504';
import { mcqItem, wireMcqCards } from '../components/mcq.js?v=1778642504';
import { trackPage } from '../components/login-wall.js?v=1778642504';
import { wireNav, navigate } from '../core/router.js?v=1778642504';

const root = () => document.getElementById('app');

export async function renderQuestion(params = {}) {
  if (trackPage()) return;
  resetSession();
  const r = root();
  const qid = params.qid;

  r.innerHTML = `
  ${topbar('home')}
  <main class="nb-wrap">
    <div class="nb-crumbs">
      <a data-nav="home">home</a><span class="sep">/</span>
      <span id="qp-crumb">question</span>
    </div>
    <header class="nb-cathead">
      <div class="tag">Studora · shared question</div>
      <h1>One <em>question</em>, in focus.</h1>
      <p class="intro" id="qp-sub">Loading the MCQ…</p>
    </header>
    <div id="qp-card">${skeletons(1)}</div>
    <div class="nb-qp-actions" id="qp-actions" hidden></div>
  </main>
  ${footer()}`;

  wireNav(r);

  if (!Number.isInteger(qid) || qid < 1) {
    showMissing(r);
    return;
  }

  let rows = [];
  try {
    rows = await API.getQuestionsByIds([qid]);
  } catch (err) {
    console.error('renderQuestion: fetch failed', err);
  }
  const q = rows[0];
  if (!q) { showMissing(r); return; }

  // Hydrate the subject from state.cats so the MCQ card header reads correctly.
  const cat = state.cats.find(c => c.category_id === q.category_id) || null;
  const subjectLabel = cat ? cleanTitle(cat.category_title || '') : '';

  document.getElementById('qp-crumb').innerHTML = cat
    ? `<a data-cat-id="${cat.category_id}">${esc(subjectLabel)}</a><span class="sep">/</span>question`
    : 'question';
  document.getElementById('qp-sub').innerHTML = cat
    ? `From <a data-cat-id="${cat.category_id}"><b>${esc(subjectLabel)}</b></a> — bookmark, share, or jump back to the full bank.`
    : 'A standalone question. Browse all subjects from the nav above.';

  const card = document.getElementById('qp-card');
  card.classList.add('nb-qp-spotlight');
  card.innerHTML = mcqItem(q, qid, false, subjectLabel);
  wireMcqCards();

  if (cat) {
    const actions = document.getElementById('qp-actions');
    actions.hidden = false;
    actions.innerHTML = `
      <a class="nb-btn primary" data-cat-id="${cat.category_id}">browse all ${esc(subjectLabel)} MCQs →</a>
      <a class="nb-btn" data-nav="subjects">all subjects</a>
    `;
  }

  // Re-wire delegated nav so the freshly-rendered crumb / button links work.
  wireNav(r);
}

function showMissing(r) {
  const card = document.getElementById('qp-card');
  const sub  = document.getElementById('qp-sub');
  if (sub)  sub.textContent = 'We couldn\'t find that question.';
  if (card) card.innerHTML = `
    <div class="nb-empty">
      That question has been removed or never existed.<br>
      <a class="nb-btn primary" data-nav="subjects" style="margin-top:14px">browse all subjects</a>
    </div>`;
  wireNav(r);
}
