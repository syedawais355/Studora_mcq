// Personal Analytics — /analytics
//
// A read-only dashboard the visitor sees about their own MCQ practice.
// Everything here is aggregated client-side from the data already sitting in
// localStorage (streak, solved, mistakes, bookmarks, weekly goal). No new
// backend is needed for v1 — the page is fast, private, and works offline as
// long as the SPA shell is cached.
//
// The one network call we make is /api/questions-by-ids for the *mistake*
// list, used purely to bucket wrong-answer counts under the right category
// title for the "weakest topics" table. If that call fails we still render
// every other panel; the topic table just shows a small inline error and a
// retry button.
//
// Per-day activity history is not in the schema yet (v4 only tracks
// `last_active_iso`). The activity strip therefore renders the last 30 days
// with at most "today" and "yesterday" filled in, and a footnote that flags
// the full heatmap as a follow-up. When per-day tracking ships, this file is
// the only one that needs changing.
import { esc, cleanTitle, showErrorState } from '../core/helpers.js?v=1779087891';
import { state, resetSession } from '../core/state.js?v=1779087891';
import { API } from '../core/api.js?v=1779087891';
import { topbar, footer } from '../components/topbar.js?v=1779087891';
import { trackPage } from '../components/login-wall.js?v=1779087891';
import { wireNav } from '../core/router.js?v=1779087891';

const root = () => document.getElementById('app');

export async function renderAnalytics() {
  if (trackPage()) return;
  resetSession();

  const r = root();

  // --- top-line numbers --------------------------------------------------
  const solved = state.solved | 0;
  const mistakeCount = Array.isArray(state.mistakes) ? state.mistakes.length : 0;
  const accuracyPct = computeAccuracy(solved, mistakeCount);
  const accuracyLabel = accuracyPct == null ? '—' : `${accuracyPct}%`;

  // --- bookmarks summary --------------------------------------------------
  const bookmarkEntries = Array.isArray(state.bookmarks) ? [...state.bookmarks] : [];
  const bookmarkCount = bookmarkEntries.length;
  const folderCount = countUniqueFolders(bookmarkEntries);

  // --- weekly goal --------------------------------------------------------
  const weeklyGoal = state.weeklyGoal | 0;
  const weeklyCount = Math.max(0, state.weeklyCount | 0);
  const weeklyPct = weeklyGoal > 0
    ? Math.min(100, Math.round((weeklyCount / weeklyGoal) * 100))
    : 0;

  // --- activity strip (placeholder until per-day tracking ships) ---------
  // Build a 30-day window ending today (oldest → newest left-to-right).
  // We don't have per-day counts yet, so the strip is mostly empty tiles
  // with at most two "filled" ones (today / yesterday) derived from
  // `last_active_iso`. The accompanying footnote is honest about it.
  const activityCells = buildActivityCells(30, readLastActiveISO());

  r.innerHTML = `
  ${topbar('home')}
  <main class="nb-wrap">
    <div class="nb-crumbs"><a data-nav="home" href="/">home</a><span class="sep">/</span>analytics</div>

    <header class="nb-cathead">
      <div class="tag">Personal · stays on this device</div>
      <h1>Your <em>numbers</em></h1>
      <div class="meta">
        <span>nothing leaves your browser</span>
        <span>computed live from your local history</span>
      </div>
      <p class="intro">Every figure on this page is aggregated from your own practice — streak, solved count, mistakes, bookmarks. We don't ship any of it to a server. Use it to find what's drifting and pull it back into focus.</p>
    </header>

    <section class="nb-an-cards" aria-label="At-a-glance totals">
      ${cardHtml('Total solved', formatNumber(solved))}
      ${cardHtml('Current streak', formatNumber(state.streak | 0), state.streak > 0 ? `${state.streak === 1 ? 'day' : 'days'} in a row` : 'no run yet')}
      ${cardHtml('Personal best', formatNumber(state.bestStreak | 0), state.bestStreak > 0 ? `${state.bestStreak === 1 ? 'day' : 'days'}` : '—')}
      ${cardHtml('Accuracy', accuracyLabel, accuracyPct == null ? 'no attempts yet' : `${formatNumber(solved)} right · ${formatNumber(mistakeCount)} wrong`)}
    </section>

    <section class="nb-an-block" aria-label="Activity over the last 30 days">
      <div class="nb-an-block-head">
        <h2>Last <em>30 days</em></h2>
        <span class="caption">a quiet log of when you showed up</span>
      </div>
      <div class="nb-an-strip" role="img" aria-label="Activity heatmap for the last 30 days">
        ${activityCells.map(cellHtml).join('')}
      </div>
      <p class="nb-an-foot">Per-day history is coming soon — for now this strip lights up your most recent visit. Until then your streak counter (above) is the truer signal.</p>
    </section>

    <section class="nb-an-grid" aria-label="Goals, mistakes and bookmarks">
      <div class="nb-an-block">
        <div class="nb-an-block-head">
          <h2>This <em>week</em></h2>
          <span class="caption">${weeklyGoal > 0 ? 'goal you set on the home page' : 'pick a goal to start tracking'}</span>
        </div>
        ${weeklyBlock(weeklyGoal, weeklyCount, weeklyPct)}
      </div>

      <div class="nb-an-block">
        <div class="nb-an-block-head">
          <h2>Mistake <em>book</em></h2>
          <span class="caption">questions waiting for a re-attempt</span>
        </div>
        <div class="nb-an-summary">
          <div class="nb-an-summary-figure">
            <strong>${formatNumber(mistakeCount)}</strong>
            <span>${mistakeCount === 1 ? 'open' : 'open'}</span>
          </div>
          <div class="nb-an-summary-body">
            <p>${mistakeCount === 0
              ? 'Nothing on the slate. When you answer a question wrong in test mode, it lands here for review.'
              : 'Answer one correctly and it disappears from the list. The point isn\'t to feel bad — it\'s to come back until it sticks.'}</p>
            <a class="nb-btn ${mistakeCount === 0 ? '' : 'primary'}" data-nav="mistakes" href="/mistakes">${mistakeCount === 0 ? 'open mistake book' : 'review now →'}</a>
          </div>
        </div>
      </div>

      <div class="nb-an-block">
        <div class="nb-an-block-head">
          <h2>Book<em>marks</em></h2>
          <span class="caption">your saved shelf</span>
        </div>
        <div class="nb-an-summary">
          <div class="nb-an-summary-figure">
            <strong>${formatNumber(bookmarkCount)}</strong>
            <span>saved</span>
          </div>
          <div class="nb-an-summary-body">
            <p>${bookmarkCount === 0
              ? 'No bookmarks yet. Tap the bookmark icon on any question to save it for later.'
              : `${formatNumber(folderCount)} ${folderCount === 1 ? 'folder' : 'folders'} in use — grouped however you like.`}</p>
            <a class="nb-btn ${bookmarkCount === 0 ? '' : 'primary'}" data-nav="bookmarks" href="/bookmarks">${bookmarkCount === 0 ? 'open bookmarks' : 'open shelf →'}</a>
          </div>
        </div>
      </div>
    </section>

    <section class="nb-an-block" aria-label="Topic-level weaknesses">
      <div class="nb-an-block-head">
        <h2>Weakest <em>topics</em></h2>
        <span class="caption">sorted by mistakes — weakest first</span>
      </div>
      <div id="an-topics">${mistakeCount === 0
        ? emptyTopicsHtml()
        : '<div class="nb-an-topics-loading" role="status">loading topic breakdown…</div>'}
      </div>
    </section>

    <p class="nb-an-foot end">Privacy note · this page only reads localStorage. Clear your browser data and it resets — there is no server-side copy.</p>
  </main>
  ${footer()}`;

  wireNav(r);

  // Topic breakdown — only worth fetching when there are mistakes. Without
  // mistakes there's nothing to bucket, and the empty card already explains
  // why the table is blank.
  if (mistakeCount > 0) {
    await loadTopicBreakdown(state.mistakes);
  }
}

// --- helpers ----------------------------------------------------------------

// Total accuracy across all-time solves. Returns null when neither side has
// any record — we render '—' rather than 0% so a fresh visitor doesn't read
// "0% accuracy" as a verdict on their (non-existent) practice.
function computeAccuracy(solved, mistakes) {
  const denom = solved + mistakes;
  if (denom <= 0) return null;
  return Math.round((solved / denom) * 100);
}

function formatNumber(n) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString();
}

// Single top-line card. `sub` is optional supporting copy under the figure.
function cardHtml(label, value, sub = '') {
  return `
    <div class="nb-an-card">
      <strong>${esc(value)}</strong>
      <span class="lbl">${esc(label)}</span>
      ${sub ? `<span class="sub">${esc(sub)}</span>` : ''}
    </div>`;
}

// Count unique non-null folder names referenced by the rich bookmark list.
// Legacy bare-number entries count as "unfiled" and don't contribute.
function countUniqueFolders(entries) {
  const seen = new Set();
  for (const entry of entries) {
    if (entry && typeof entry === 'object' && typeof entry.folder === 'string') {
      const name = entry.folder.trim();
      if (name) seen.add(name);
    }
  }
  return seen.size;
}

// Read the most recent active day from localStorage directly. We keep this
// out of state because no other page needs it — the analytics view is the
// only consumer, and reaching past state.* keeps the public state shape
// stable for parallel agents.
function readLastActiveISO() {
  try {
    const raw = localStorage.getItem('studora');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const v = parsed && parsed.last_active_iso;
    return typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}

// Build N cells covering the last N days, ending today on the right. Each
// cell carries { iso, label, level } where level ∈ {0, 1, 2} maps to the
// CSS variants (empty / light / heavy). With only `last_active_iso`
// available we mark today as "heavy" and yesterday as "light"; everything
// else stays empty. When per-day counts ship this is the one function to
// update.
function buildActivityCells(days, lastActiveISO) {
  const cells = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActive = lastActiveISO ? new Date(`${lastActiveISO}T00:00:00`) : null;
  const lastActiveTs = lastActive && !Number.isNaN(lastActive.getTime())
    ? lastActive.getTime()
    : null;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = isoDate(d);
    let level = 0;
    if (lastActiveTs != null) {
      const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
      const sameDay = d.getTime() === lastActiveTs;
      if (sameDay && diff === 0) level = 2;
      else if (sameDay && diff === 1) level = 1;
    }
    const label = niceDate(d);
    cells.push({ iso, label, level });
  }
  return cells;
}

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function niceDate(d) {
  try {
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return isoDate(d);
  }
}

function cellHtml(cell) {
  const cls = `nb-an-cell lvl-${cell.level}`;
  return `<span class="${cls}" title="${esc(cell.label)}" aria-label="${esc(cell.label)}${cell.level > 0 ? ' — active' : ''}"></span>`;
}

// Weekly progress block. Mirrors the home page's quiet treatment — no goal
// set yet shows a friendly nudge; with a goal it's a thin progress bar.
function weeklyBlock(goal, count, pct) {
  if (goal <= 0) {
    return `
      <div class="nb-an-weekly-empty">
        <p>You haven't picked a weekly goal yet. <a data-nav="home" href="/">Head home</a> and choose 50, 100 or 200 questions to keep this bar honest.</p>
      </div>`;
  }
  return `
    <div class="nb-an-weekly" role="group" aria-label="Weekly progress">
      <div class="nb-an-weekly-label">
        <em>${formatNumber(count)} of ${formatNumber(goal)}</em> this week
      </div>
      <div
        class="nb-an-weekly-bar"
        role="progressbar"
        aria-valuenow="${count}"
        aria-valuemin="0"
        aria-valuemax="${goal}"
        aria-label="${count} of ${goal} questions this week"
      >
        <div class="nb-an-weekly-fill" style="width:${pct}%"></div>
      </div>
      <p class="nb-an-weekly-hint">${pct >= 100 ? 'Goal met — nice work. The bar resets next ISO week.' : `${100 - pct}% to go this week.`}</p>
    </div>`;
}

function emptyTopicsHtml() {
  return `
    <div class="nb-an-topics-empty">
      <p>No mistakes recorded yet — so there's nothing to rank. Take a test-mode session and any wrong answers will show up here, grouped by subject so you can see where the gap is.</p>
      <a class="nb-btn" data-nav="subjects" href="/subjects">browse subjects</a>
    </div>`;
}

// Fetch the wrong-answer questions and bucket them by category. We use the
// API's id endpoint (same as the mistakes page), then join against the
// already-loaded `state.cats` for friendly titles. Categories with zero
// mistakes are not shown — the table is *purely* a weakness signal.
async function loadTopicBreakdown(mistakeIds) {
  const container = document.getElementById('an-topics');
  if (!container) return;

  let rows = [];
  try {
    rows = await API.getQuestionsByIds(mistakeIds);
  } catch (err) {
    console.error('analytics: mistake fetch failed', err);
    showErrorState(container, {
      title: 'Couldn\'t group your mistakes by topic',
      hint: 'Your wrong-answer IDs are safe on this device — try again to pull the topic table.',
      onRetry: () => loadTopicBreakdown(mistakeIds),
    });
    return;
  }

  // Bucket: { category_id → { title, count } }. We deliberately key on the
  // category_id (not the title) so a future rename on the server doesn't
  // split a single subject across two rows.
  const catById = new Map(state.cats.map(c => [c.category_id, c]));
  const buckets = new Map();
  for (const row of rows) {
    if (!row || row.category_id == null) continue;
    const cat = catById.get(row.category_id);
    const title = cat ? cleanTitle(cat.category_title || '') : `Subject #${row.category_id}`;
    const slug = cat ? cat.category_slug : null;
    const key = row.category_id;
    const entry = buckets.get(key) || { id: key, title, slug, count: 0 };
    entry.count += 1;
    buckets.set(key, entry);
  }

  const ranked = [...buckets.values()].sort((a, b) => b.count - a.count);

  if (ranked.length === 0) {
    container.innerHTML = emptyTopicsHtml();
    return;
  }

  // Render. Highest count gets the heaviest weakness bar so the eye is
  // pulled to the most pressing topic first.
  const max = ranked[0].count;
  container.innerHTML = `
    <ol class="nb-an-topics">
      ${ranked.map((t, i) => {
        const pct = Math.max(8, Math.round((t.count / max) * 100));
        return `
          <li class="nb-an-topic">
            <span class="rank">${String(i + 1).padStart(2, '0')}</span>
            <div class="body">
              <div class="row">
                <span class="title">${esc(t.title)}</span>
                <span class="count"><b>${formatNumber(t.count)}</b> ${t.count === 1 ? 'mistake' : 'mistakes'}</span>
              </div>
              <div class="bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
            </div>
            <a class="cta" data-cat-id="${t.id}" href="${t.slug ? `/subjects/${esc(t.slug)}` : '/subjects'}">practice →</a>
          </li>`;
      }).join('')}
    </ol>
    <p class="nb-an-foot">Counts come from your local mistake book — clearing a mistake (by answering it right) removes it from this list automatically.</p>`;

  wireNav(container);
}
