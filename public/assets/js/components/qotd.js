// Question of the day — calm notebook-margin card on the home page. One
// deterministic question per UTC date served by /api/qotd, so peers can
// compare picks. Attempt state lives in localStorage under
// `studora_qotd_<YYYY-MM-DD>` — no account needed for v1.
import { esc, cleanTitle } from '../core/helpers.js?v=1779087891';

const LETTERS = ['A', 'B', 'C', 'D'];
const STORAGE_PREFIX = 'studora_qotd_';

function todayUtc() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function readAttempt(date) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + date);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (v && typeof v.picked === 'string') return v;
  } catch { /* JSON or storage failure — treat as no attempt */ }
  return null;
}

function writeAttempt(date, payload) {
  try {
    localStorage.setItem(STORAGE_PREFIX + date, JSON.stringify(payload));
  } catch { /* private mode or quota — silently degrade */ }
}

// Human-friendly date string (e.g. "Sun, 18 May"), still anchored to UTC so
// the on-card date matches what /api/qotd used to pick.
function formatHeaderDate(iso) {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const day = dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    const dayNum = dt.getUTCDate();
    const month = dt.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    return `${day}, ${dayNum} ${month}`;
  } catch {
    return iso;
  }
}

// Returns the empty-state skeleton — used both at first render (when the
// fetch hasn't resolved) and as the wrapper that setupQotd() refills.
function shellMarkup(date) {
  return `
  <section class="nb-qotd" data-qotd-root data-qotd-date="${esc(date)}" aria-label="Question of the day">
    <div class="nb-qotd-head">
      <h3>Question of the <em>day</em></h3>
      <span class="nb-qotd-date">${esc(formatHeaderDate(date))}</span>
    </div>
    <div class="nb-qotd-body" data-qotd-body>
      <div class="nb-qotd-skel" aria-hidden="true">
        <div class="line w90"></div>
        <div class="line w70"></div>
        <div class="opt"></div>
        <div class="opt"></div>
        <div class="opt"></div>
        <div class="opt"></div>
      </div>
    </div>
  </section>`;
}

// Card body once the question (and any prior attempt) is known.
function bodyMarkup(q, attempt) {
  const correct = String(q.correct_key || '').toUpperCase();
  const picked  = attempt ? String(attempt.picked || '').toUpperCase() : '';
  const answered = !!attempt;
  const opts = [q.option_a, q.option_b, q.option_c, q.option_d];

  const subjectLine = q.category_title
    ? `<div class="nb-qotd-cat">${esc(cleanTitle(q.category_title).toLowerCase())}</div>`
    : '';

  const optsMarkup = opts.map((text, i) => {
    const k = LETTERS[i];
    const isCorrect = k === correct;
    const isPicked  = k === picked;
    const cls = [
      'nb-qotd-opt',
      answered && isCorrect ? 'correct' : '',
      answered && isPicked && !isCorrect ? 'wrong' : '',
      answered && isPicked ? 'picked' : '',
    ].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}" data-k="${k}" ${answered ? 'disabled' : ''}>
      <span class="k">${k}</span><span class="txt">${esc(text || '')}</span>
    </button>`;
  }).join('');

  const footer = answered
    ? (() => {
        const isRight = picked === correct;
        const msg = isRight
          ? `You picked <strong>${esc(picked)}</strong> — that's the one.`
          : `You picked <strong>${esc(picked)}</strong>. The answer is <strong>${esc(correct)}</strong>.`;
        return `<p class="nb-qotd-foot ${isRight ? 'ok' : 'no'}">${msg} <em>Same question for everyone today — compare with a friend.</em></p>`;
      })()
    : `<p class="nb-qotd-foot hint"><em>Same question for every Studora visitor today.</em> Pick one to see the answer.</p>`;

  return `
    ${subjectLine}
    <h4 class="nb-qotd-q">${esc(q.text || '')}</h4>
    <div class="nb-qotd-opts" role="group" aria-label="Answer choices">
      ${optsMarkup}
    </div>
    ${footer}`;
}

// Default export: returns the shell HTML synchronously so the home render is
// never blocked. The real question is fetched + injected by setupQotd().
export default function renderQotd() {
  return shellMarkup(todayUtc());
}

// Named export kept for symmetry with the home page import.
export { renderQotd };

// Wire up fetch + click handling. Idempotent: a second call on the same root
// just re-resolves any unanswered attempt without double-binding listeners.
export async function setupQotd() {
  const root = document.querySelector('[data-qotd-root]');
  if (!root || root.dataset.wired) return;
  root.dataset.wired = '1';

  const body = root.querySelector('[data-qotd-body]');
  const date = root.dataset.qotdDate || todayUtc();

  let question;
  try {
    const r = await fetch('/api/qotd', { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
    if (!r.ok) throw new Error(`qotd_${r.status}`);
    question = await r.json();
  } catch {
    if (body) {
      body.innerHTML = `<p class="nb-qotd-err"><em>Couldn't load today's question.</em> Try again in a moment.</p>`;
    }
    return;
  }

  const attempt = readAttempt(date);
  if (body) body.innerHTML = bodyMarkup(question, attempt);

  // Delegated listener — one binding handles every option button.
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.nb-qotd-opt');
    if (!btn || btn.disabled) return;
    const picked = (btn.dataset.k || '').toUpperCase();
    if (!picked) return;
    if (readAttempt(date)) return; // someone already answered in another tab

    const correct = String(question.correct_key || '').toUpperCase();
    const payload = { picked, correct: picked === correct, at: Date.now() };
    writeAttempt(date, payload);
    if (body) body.innerHTML = bodyMarkup(question, payload);
  });
}
