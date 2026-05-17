// Home page — hero (slim) + Exams table + Subjects grid + Daily + Quiz of the day.
import { esc, cleanTitle, animCount, skeletons } from '../core/helpers.js?v=1778642504';
import { icon, catIcon } from '../core/icons.js?v=1778642504';
import { state, setWeeklyGoal, WEEKLY_GOAL_OPTIONS } from '../core/state.js?v=1778642504';
import { EXAM_META, DAILY_NOTES, formatDate } from '../core/data.js?v=1778642504';
import { topbar, footer } from '../components/topbar.js?v=1778642504';
import { setupSearch } from '../components/search.js?v=1778642504';
import { renderQotd, setupQotd } from '../components/qotd.js?v=1778642504';
import { trackPage } from '../components/login-wall.js?v=1778642504';
import { wireNav, navigate } from '../core/router.js?v=1778642504';

const root = () => document.getElementById('app');

export async function renderHome() {
  if (trackPage()) return;
  const r = root();
  const cats   = state.cats.slice(0, 24);
  const exams  = state.exams.slice(0, 8);                       // top 8 by MCQ count (sorted server-side)
  const totalQ = state.cats.reduce((a, c) => a + (c.answerable_questions || 0), 0);

  // Personal stats card: render when the visitor has any history, OR when
  // they've already picked a weekly goal (so the progress bar doesn't vanish
  // on ISO-week resets that zero out the count).
  const hasHistory = state.streak > 0 || state.solved > 0 || state.bestStreak > 0;
  const showPersonal = hasHistory || state.weeklyGoal > 0;

  const personal = showPersonal
    ? `
    <section class="nb-personal" aria-label="Your stats">
      <div class="nb-personal-card">
        <div class="nb-personal-row">
          <div class="nb-personal-stat">
            <strong>${state.streak}</strong>
            <span>current streak</span>
            ${freezePill(state.freezesAvailable)}
          </div>
          <div class="nb-personal-stat">
            <strong>${state.bestStreak}</strong>
            <span>personal best</span>
          </div>
          <div class="nb-personal-stat">
            <strong>${state.solved.toLocaleString()}</strong>
            <span>questions solved</span>
          </div>
          ${state.mistakes?.length ? `
          <div class="nb-personal-stat">
            <strong>${state.mistakes.length}</strong>
            <span><a data-nav="mistakes" class="sq">mistakes to review</a></span>
          </div>` : ''}
        </div>
        ${weeklyBlock(state.weeklyGoal, state.weeklyCount)}
        ${milestoneCopy(state.streak)}
      </div>
    </section>` : '';

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

  ${personal}
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

    ${renderQotd()}

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
  setupQotd();
  document.getElementById('nb-quiz')?.addEventListener('click', () => {
    navigate('quiz');
  });

  // Wire the weekly-goal picker. Re-renders the page so the chosen goal
  // immediately swaps the picker for the progress bar.
  r.querySelectorAll('[data-set-weekly-goal]').forEach((el) => {
    el.addEventListener('click', (ev) => {
      ev.preventDefault();
      const n = parseInt(el.getAttribute('data-set-weekly-goal'), 10);
      if (!WEEKLY_GOAL_OPTIONS.includes(n)) return;
      setWeeklyGoal(n);
      renderHome();
    });
  });

  if (totalQ) {
    animCount(document.getElementById('hs-q'), totalQ);
    animCount(document.getElementById('hs-s'), state.cats.length);
    animCount(document.getElementById('hs-e'), state.exams.length);
  }
}

// Small italic pill that sits under the "current streak" stat. Only render
// it when there's at least one freeze in the bank — empty is the resting
// state for new visitors and shouldn't add visual noise.
function freezePill(count) {
  if (!count || count <= 0) return '';
  const label = count === 1 ? '1 freeze' : `${count} freezes`;
  const tip = "A missed day is forgiven automatically — you've got two to spare each month.";
  return `<em class="nb-personal-freeze" title="${esc(tip)}" aria-label="${esc(label)} available">${esc(label)}</em>`;
}

// Weekly goal block: either the one-time picker (no goal yet) or the quiet
// progress bar (goal set). Deliberately understated — no animation, no
// celebration, no shouty copy.
function weeklyBlock(goal, count) {
  if (!goal || goal <= 0) {
    const pills = WEEKLY_GOAL_OPTIONS.map((n) =>
      `<button type="button" class="nb-personal-goal-pill" data-set-weekly-goal="${n}" aria-label="Set weekly goal to ${n} questions">${n}</button>`
    ).join('');
    return `
      <div class="nb-personal-goal-picker" role="group" aria-label="Pick a weekly goal">
        <em class="nb-personal-goal-label">Pick a weekly goal — you can change it later.</em>
        <div class="nb-personal-goal-pills">${pills}</div>
      </div>`;
  }

  const safeCount = Math.max(0, count | 0);
  const pct = Math.min(100, Math.round((safeCount / goal) * 100));
  return `
    <div class="nb-personal-weekly" role="group" aria-label="Weekly progress">
      <div class="nb-personal-weekly-label">
        <em>${safeCount} of ${goal}</em> this week
      </div>
      <div
        class="nb-personal-weekly-bar"
        role="progressbar"
        aria-valuenow="${safeCount}"
        aria-valuemin="0"
        aria-valuemax="${goal}"
        aria-label="${safeCount} of ${goal} questions this week"
      >
        <div class="nb-personal-weekly-fill" style="width:${pct}%"></div>
      </div>
    </div>`;
}

// Encouraging copy at meaningful streak counts. Returns '' for streaks under
// the first milestone so the card stays clean for casual visitors.
function milestoneCopy(streak) {
  if (streak >= 100) {
    return `<p class="nb-personal-note">Triple digits. You've solved more in a row than most students do in a month. <em>Whatever you're chasing, you're catching it.</em></p>`;
  }
  if (streak >= 30) {
    return `<p class="nb-personal-note">A full month of correct picks back-to-back. <em>This is what real exam readiness feels like.</em></p>`;
  }
  if (streak >= 14) {
    return `<p class="nb-personal-note">Two weeks running. You're not studying — you're <em>training</em>.</p>`;
  }
  if (streak >= 7) {
    return `<p class="nb-personal-note">Seven in a row. <em>The habit is forming.</em></p>`;
  }
  if (streak >= 3) {
    return `<p class="nb-personal-note">Nice run. Three more to break a week.</p>`;
  }
  return '';
}
