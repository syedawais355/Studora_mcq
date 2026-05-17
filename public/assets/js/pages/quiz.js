// Quiz of the day — focused 10-question quiz, one MCQ at a time, with a live
// progress bar, instant feedback, and a results card at the end. Premium feel,
// matches the Studora paper aesthetic.
import { esc, cleanTitle, skeletons, showErrorState } from '../core/helpers.js?v=1778642504';
import { state, resetSession, recordCorrect, recordWrong } from '../core/state.js?v=1778642504';
import { API } from '../core/api.js?v=1778642504';
import { topbar, footer } from '../components/topbar.js?v=1778642504';
import { confetti } from '../core/confetti.js?v=1778642504';
import { trackPage } from '../components/login-wall.js?v=1778642504';
import { renderShareResult } from '../components/share-result.js?v=1778642504';
import { wireNav, navigate } from '../core/router.js?v=1778642504';

const root = () => document.getElementById('app');
const DEFAULT_COUNT = 10;
const COUNT_OPTIONS = new Set([10, 20, 30]);
const ADVANCE_MS = 1400;

// Pick the most-played, most-diverse category as the daily quiz default.
function defaultCat() {
  const slugs = ['general_knowledge_mcqs', 'general-knowledge-mcqs', 'general-knowledge'];
  return state.cats.find(c => slugs.includes(c.category_slug)) || state.cats[0];
}

// Honour optional ?cat=<slug>&n=<count> from the Quick-Quiz Builder. Falls
// back to the default subject and length when either is missing or invalid.
function paramsFromUrl() {
  const u = new URL(location.href);
  const slug = u.searchParams.get('cat');
  const nRaw = parseInt(u.searchParams.get('n'), 10);
  const cat = slug
    ? state.cats.find(c => c.category_slug === slug) || defaultCat()
    : defaultCat();
  const count = COUNT_OPTIONS.has(nRaw) ? nRaw : DEFAULT_COUNT;
  return { cat, count };
}

export async function renderQuiz() {
  if (trackPage()) return;
  resetSession();

  const r = root();
  const { cat, count } = paramsFromUrl();
  if (!cat) {
    r.innerHTML = `${topbar('home')}
      <main class="nb-wrap"><div class="nb-empty">Subjects haven't loaded yet — open this page from the home screen.</div></main>
      ${footer()}`;
    wireNav(r);
    return;
  }

  // Local quiz session (deliberately not in global state — quizzes are scoped to this page).
  const session = {
    cat,
    count,
    questions: null,
    started: false,
    index: 0,
    answers: [],          // { q, picked, correct, ok }
    correctCount: 0,
    longestStreak: 0,
    currentStreak: 0,
    startedAt: 0,
  };

  r.innerHTML = shell(cat, count);
  wireNav(r);
  document.getElementById('qz-start')?.addEventListener('click', () => startQuiz(session));
  document.getElementById('qz-change')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('subjects');
  });
}

function shell(cat, count = DEFAULT_COUNT) {
  const title = cleanTitle(cat.category_title || '');
  return `
  ${topbar('home')}
  <main class="nb-wrap">
    <div class="nb-crumbs">
      <a data-nav="home" href="/">home</a><span class="sep">/</span>quiz of the day
    </div>

    <div id="qz-stage" class="nb-qz-stage">
      <section class="nb-qz-intro">
        <div class="nb-qz-card">
          <div class="nb-qz-tag">Daily quiz · ${count} questions</div>
          <h1>Quiz of the <em>day.</em></h1>
          <p class="nb-qz-sub">A focused 3-minute test pulled at random from <b>${esc(title)}</b>.
          Pick an option, see if you got it, and watch the streak run.</p>

          <ul class="nb-qz-meta" role="list">
            <li><b>${count}</b><em>questions</em></li>
            <li><b>~3</b><em>minutes</em></li>
            <li><b>${(cat.answerable_questions || 0).toLocaleString()}</b><em>pool size</em></li>
          </ul>

          <button id="qz-start" class="nb-btn primary nb-qz-start">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4l14 8-14 8z"/></svg>
            <span>start quiz</span>
          </button>
          <a id="qz-change" href="#" class="nb-qz-change">or browse other subjects →</a>
        </div>
      </section>
    </div>
  </main>
  ${footer()}`;
}

async function startQuiz(session) {
  const stage = document.getElementById('qz-stage');
  stage.innerHTML = `<div style="padding:60px 24px">${skeletons(3)}</div>`;
  try {
    session.questions = await API.getRandomQuiz(session.cat.category_id, session.count);
  } catch (err) {
    console.error('quiz fetch failed', err);
    showErrorState(stage, {
      title: 'Couldn\'t fetch your quiz',
      hint: 'Network blip — try again in a second.',
      onRetry: () => startQuiz(session),
    });
    return;
  }
  if (!session.questions || !session.questions.length) {
    showErrorState(stage, {
      title: 'No questions available',
      hint: 'This subject doesn\'t have a quiz pool yet.',
      onRetry: () => navigate('subjects'),
    });
    return;
  }
  // Cap to the session's chosen count just in case the API returns more.
  session.questions = session.questions.slice(0, session.count);
  session.started = true;
  session.startedAt = Date.now();
  paintQuestion(session);
}

function paintQuestion(session) {
  const stage = document.getElementById('qz-stage');
  const q = session.questions[session.index];
  const total = session.questions.length;
  const progressPct = ((session.index) / total) * 100;
  const correct = String(q.correct_key || q.correct || '').toUpperCase();
  const opts = [
    { k: 'A', txt: q.option_a },
    { k: 'B', txt: q.option_b },
    { k: 'C', txt: q.option_c },
    { k: 'D', txt: q.option_d },
  ].filter(o => o.txt);

  stage.innerHTML = `
  <section class="nb-qz-run" data-correct="${esc(correct)}">
    <header class="nb-qz-head">
      <div class="nb-qz-progress" aria-hidden="true"><span style="width:${progressPct}%"></span></div>
      <div class="nb-qz-meta-row">
        <span class="nb-qz-count">Question <b>${session.index + 1}</b> of <b>${total}</b></span>
        <span class="nb-qz-streak">streak · <b>${session.currentStreak}</b></span>
      </div>
    </header>

    <article class="nb-qz-card nb-qz-q" data-id="${esc(q.id || '')}">
      <h2 class="nb-qz-qtx">${esc(q.text || '')}</h2>
      <ul class="nb-qz-opts">
        ${opts.map(o => `
          <li><button class="nb-qz-opt" type="button" data-k="${o.k}">
            <span class="k">${o.k}</span>
            <span class="t">${esc(o.txt)}</span>
          </button></li>
        `).join('')}
      </ul>
    </article>
  </section>`;

  stage.querySelectorAll('.nb-qz-opt').forEach(btn => {
    btn.addEventListener('click', () => pickAnswer(session, btn, correct));
  });
}

function pickAnswer(session, btn, correctKey) {
  const k = btn.dataset.k;
  const all = btn.closest('.nb-qz-opts').querySelectorAll('.nb-qz-opt');
  all.forEach(b => { b.disabled = true; });
  btn.classList.add('picked');

  const ok = k === correctKey;
  if (ok) {
    btn.classList.add('correct');
    session.correctCount++;
    session.currentStreak++;
    session.longestStreak = Math.max(session.longestStreak, session.currentStreak);
    recordCorrect();
    confetti();
  } else {
    btn.classList.add('wrong');
    all.forEach(b => { if (b.dataset.k === correctKey) b.classList.add('correct'); });
    session.currentStreak = 0;
    recordWrong();
  }
  session.answers.push({ id: session.questions[session.index]?.id, picked: k, correct: correctKey, ok });

  setTimeout(() => {
    session.index++;
    if (session.index >= session.questions.length) {
      paintResults(session);
    } else {
      paintQuestion(session);
    }
  }, ADVANCE_MS);
}

function paintResults(session) {
  const total = session.questions.length;
  const score = session.correctCount;
  const pct = Math.round((score / total) * 100);
  const seconds = Math.round((Date.now() - session.startedAt) / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeLabel = `${minutes}:${String(secs).padStart(2, '0')}`;

  let verdict = 'keep practising';
  let vClass = 'low';
  if (pct === 100) { verdict = 'perfect run'; vClass = 'perfect'; }
  else if (pct >= 80) { verdict = 'sharp'; vClass = 'high'; }
  else if (pct >= 60) { verdict = 'solid'; vClass = 'mid'; }

  const stage = document.getElementById('qz-stage');
  stage.innerHTML = `
  <section class="nb-qz-results">
    <div class="nb-qz-card nb-qz-result-card">
      <div class="nb-qz-tag">Quiz finished · ${cleanTitle(session.cat.category_title || '')}</div>
      <div class="nb-qz-score">
        <div class="ring" style="--p:${pct}" aria-hidden="true">
          <strong>${score}</strong><span>/ ${total}</span>
        </div>
        <h2>That's a <em class="nb-qz-verdict ${vClass}">${verdict}.</em></h2>
        <p class="nb-qz-sub">${pct}% correct · longest streak <b>${session.longestStreak}</b> · ${timeLabel}</p>
      </div>

      <div class="nb-qz-breakdown">
        <div><span class="num">${score}</span><span class="lbl">correct</span></div>
        <div><span class="num">${total - score}</span><span class="lbl">missed</span></div>
        <div><span class="num">${session.longestStreak}</span><span class="lbl">best streak</span></div>
        <div><span class="num">${timeLabel}</span><span class="lbl">time</span></div>
      </div>

      <div class="nb-qz-actions">
        <button id="qz-again" class="nb-btn primary" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>
          </svg>
          <span>another quiz</span>
        </button>
        <a class="nb-btn" data-cat-id="${session.cat.category_id}">study ${esc(cleanTitle(session.cat.category_title || ''))} →</a>
        <a class="nb-btn" data-nav="subjects" href="/subjects">other subjects</a>
      </div>
    </div>
  </section>`;

  wireNav(stage);
  document.getElementById('qz-again')?.addEventListener('click', () => {
    Object.assign(session, {
      questions: null, started: false, index: 0, answers: [],
      correctCount: 0, longestStreak: 0, currentStreak: 0, startedAt: 0,
    });
    startQuiz(session);
  });

  // Drop the share-card panel right below the results card. The "exam" param
  // doubles as a subject slug here — the share-card endpoint handles either.
  renderShareResult(stage, {
    score: pct,
    total,
    correct: score,
    exam: session.cat?.category_slug || 'mixed',
  });

  if (pct >= 80) {
    confetti();
    setTimeout(confetti, 600);
  }
}
