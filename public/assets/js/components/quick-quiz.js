// Quick-quiz builder — a single-step "make me a quiz" widget that lives on
// the home page directly under the Question of the Day card. Reduces the
// time-to-value from ~5 clicks (home → subjects → category → start quiz →
// answer) down to one (pick a subject, pick a length, hit start).
//
// The component renders synchronously off `state.cats`, so the dropdown is
// pre-populated by the time the home view paints. On submit we navigate to
// `/quiz?cat=<slug>&n=<count>` — the existing quiz page handles the rest.
import { esc, cleanTitle } from '../core/helpers.js?v=1779087891';
import { state } from '../core/state.js?v=1779087891';
import { toast } from '../core/toast.js?v=1779087891';
import { navigate } from '../core/router.js?v=1779087891';

const COUNTS = [10, 20, 30];
const DEFAULT_COUNT = 10;

// Sorted, deduplicated list of (slug, title) pairs for the dropdown.
// Computed at render-time so a late hydration of state.cats picks up.
function dropdownOptions() {
  const seen = new Set();
  const opts = [];
  for (const c of state.cats || []) {
    const slug = c.category_slug || String(c.category_id || '');
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    opts.push({
      slug,
      title: cleanTitle(c.category_title || '') || slug,
    });
  }
  opts.sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }));
  return opts;
}

// Synchronous HTML — the home page injects this directly into innerHTML.
export function renderQuickQuiz() {
  const opts = dropdownOptions();
  const optsMarkup = opts.map((o) =>
    `<option value="${esc(o.slug)}">${esc(o.title.toLowerCase())}</option>`
  ).join('');

  const countMarkup = COUNTS.map((n, i) => {
    const pressed = n === DEFAULT_COUNT ? 'true' : 'false';
    return `<button
      type="button"
      class="nb-qq-count"
      role="radio"
      aria-checked="${pressed}"
      aria-pressed="${pressed}"
      data-count="${n}"
      tabindex="${n === DEFAULT_COUNT ? '0' : '-1'}"
      data-idx="${i}"
    >${n}</button>`;
  }).join('');

  return `
  <section class="nb-qq" data-qq-root aria-label="Quick quiz builder">
    <div class="nb-qq-head">
      <h3>Make me a <em>quiz</em></h3>
      <span class="nb-qq-cap">pick a subject and length</span>
    </div>
    <form class="nb-qq-form" data-qq-form novalidate>
      <div class="nb-qq-field">
        <label for="nb-qq-subject" class="nb-qq-label">subject</label>
        <select id="nb-qq-subject" class="nb-qq-select" data-qq-subject>
          <option value="">any subject</option>
          ${optsMarkup}
        </select>
      </div>
      <div class="nb-qq-field">
        <span class="nb-qq-label" id="nb-qq-count-lbl">length</span>
        <div
          class="nb-qq-counts"
          role="radiogroup"
          aria-labelledby="nb-qq-count-lbl"
          data-qq-counts
        >${countMarkup}</div>
      </div>
      <button type="submit" class="nb-btn primary nb-qq-go" data-qq-go>
        <span>Start quiz →</span>
      </button>
    </form>
  </section>`;
}

// Idempotent wiring — safe to call after every renderHome().
export function setupQuickQuiz() {
  const root = document.querySelector('[data-qq-root]');
  if (!root || root.dataset.wired) return;
  root.dataset.wired = '1';

  const form    = root.querySelector('[data-qq-form]');
  const subject = root.querySelector('[data-qq-subject]');
  const counts  = root.querySelector('[data-qq-counts]');
  if (!form || !subject || !counts) return;

  const countBtns = Array.from(counts.querySelectorAll('.nb-qq-count'));

  // Click-to-select on the segmented count buttons.
  countBtns.forEach((btn) => {
    btn.addEventListener('click', () => selectCount(btn));
  });

  // Arrow-key navigation inside the radiogroup — matches WAI-ARIA pattern.
  counts.addEventListener('keydown', (e) => {
    const cur = countBtns.findIndex((b) => b === document.activeElement);
    if (cur === -1) return;
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (cur + 1) % countBtns.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (cur - 1 + countBtns.length) % countBtns.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End')  next = countBtns.length - 1;
    if (next === -1) return;
    e.preventDefault();
    selectCount(countBtns[next]);
    countBtns[next].focus();
  });

  function selectCount(btn) {
    countBtns.forEach((b) => {
      const on = b === btn;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      b.classList.toggle('on', on);
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const slug  = (subject.value || '').trim();
    const active = countBtns.find((b) => b.getAttribute('aria-checked') === 'true');
    const count = active ? parseInt(active.dataset.count, 10) : DEFAULT_COUNT;

    if (!COUNTS.includes(count)) {
      toast('Pick a quiz length first.', 'err');
      return;
    }
    // If the visitor picked a subject, make sure it actually maps to a known
    // category — guards against a stale dropdown value if state.cats is rehydrated.
    if (slug && !state.cats.some((c) => c.category_slug === slug)) {
      toast('That subject is unavailable — try another.', 'err');
      return;
    }

    // Build the deep link. The existing quiz page picks its own default
    // category + length today; once it reads ?cat / ?n these params will
    // start steering the fetch. Until then they're harmless extras.
    const params = new URLSearchParams();
    if (slug)  params.set('cat', slug);
    params.set('n', String(count));
    const target = `/quiz?${params.toString()}`;
    try {
      history.pushState({ view: 'quiz' }, '', target);
    } catch { /* private mode / sandboxed iframe — fall through to navigate() */ }
    navigate('quiz');
  });
}
