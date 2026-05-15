// PDF download modal — mirrors the login-wall visual style with a form for
// file name and "all vs custom range" controls. Triggers a native browser
// download via an <a download> link so there's no fetch/blob round-trip.
import { toast } from '../core/toast.js?v=1778642504';
import { cleanTitle } from '../core/helpers.js?v=1778642504';
import { normalizeSlug } from '../core/icons.js?v=1778642504';

// Keep in sync with MAX_ALL in /api/category-pdf.js — the server caps total at this.
const HARD_MAX = 3000;
const DEFAULT_COUNT = 50;

function slugFor(cat) {
  const slug = normalizeSlug(cat.category_slug || '');
  if (slug) return slug.replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return String(cat.category_title || 'mcq')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'mcq';
}

function fmtCount(n) { return Number(n).toLocaleString(); }

function clampInt(v, lo, hi, fallback) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

export function openDownloadModal(cat) {
  if (!cat) return;
  if (document.querySelector('.nb-wall.is-dl')) return; // already open

  const total = Math.max(0, cat.answerable_questions || 0);
  const title = cleanTitle(cat.category_title || '');
  const defaultName = `studora-${slugFor(cat)}-mcq`;
  const initialCount = Math.min(DEFAULT_COUNT, total || DEFAULT_COUNT);
  // Custom range now goes up to the subject's own MCQ count (no hard 300 cap),
  // bounded only by the server-side HARD_MAX for runtime safety.
  const customMax = Math.min(HARD_MAX, total || HARD_MAX);

  const w = document.createElement('div');
  w.className = 'nb-wall is-dl';
  w.setAttribute('aria-hidden', 'false');
  w.innerHTML = `
    <div class="nb-wall-card nb-dl-card" role="dialog" aria-modal="true" aria-labelledby="dl-title">
      <button class="nb-dl-close" type="button" aria-label="Close dialog">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <h3 id="dl-title">Download <em>PDF</em></h3>
      <p class="nb-dl-sub">${title} · <b>${fmtCount(total)}</b> ${total === 1 ? 'question' : 'questions'} available</p>

      <form class="nb-dl-form" novalidate>
        <label class="nb-dl-field">
          <span class="nb-dl-label">File name</span>
          <div class="nb-dl-input">
            <input type="text" id="dl-filename" autocomplete="off" spellcheck="false"
                   maxlength="60" value="${defaultName}" required>
            <span class="nb-dl-ext">.pdf</span>
          </div>
          <small class="nb-dl-hint">Letters, numbers and dashes only — anything else is cleaned up.</small>
        </label>

        <fieldset class="nb-dl-mode" aria-describedby="dl-mode-hint">
          <legend>How many questions?</legend>
          <label class="nb-dl-radio">
            <input type="radio" name="dl-mode" value="all" checked>
            <span>
              <b>Download all</b>
              <em>${fmtCount(total)} ${total === 1 ? 'question' : 'questions'}</em>
            </span>
          </label>
          <label class="nb-dl-radio">
            <input type="radio" name="dl-mode" value="custom" ${total === 0 ? 'disabled' : ''}>
            <span>
              <b>Custom range</b>
              <em>pick between 1 and ${fmtCount(customMax)}</em>
            </span>
          </label>
        </fieldset>

        <div class="nb-dl-range" id="dl-range" hidden>
          <div class="nb-dl-range-row">
            <input type="range" id="dl-slider" min="1" max="${customMax}" value="${initialCount}" aria-label="Number of questions slider">
            <input type="number" id="dl-count" min="1" max="${customMax}" value="${initialCount}" aria-label="Number of questions">
          </div>
          <small id="dl-mode-hint" class="nb-dl-hint">First <b id="dl-preview">${initialCount}</b> questions of the bank — ordered by question number.</small>
        </div>

        <div class="nb-dl-actions">
          <button type="button" class="nb-btn" id="dl-cancel">cancel</button>
          <button type="submit" class="nb-btn primary" id="dl-go">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
            <span id="dl-go-lbl">download ${fmtCount(total)} MCQs</span>
          </button>
        </div>
      </form>
    </div>`;

  document.body.appendChild(w);
  const previouslyFocused = document.activeElement;
  document.documentElement.style.overflow = 'hidden';

  const card     = w.querySelector('.nb-dl-card');
  const form     = w.querySelector('form');
  const radios   = w.querySelectorAll('input[name="dl-mode"]');
  const range    = w.querySelector('#dl-range');
  const slider   = w.querySelector('#dl-slider');
  const count    = w.querySelector('#dl-count');
  const preview  = w.querySelector('#dl-preview');
  const goLbl    = w.querySelector('#dl-go-lbl');
  const fnameInp = w.querySelector('#dl-filename');

  function close() {
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', onKey, true);
    w.remove();
    if (previouslyFocused && previouslyFocused.focus) {
      try { previouslyFocused.focus(); } catch { /* ignore */ }
    }
  }

  function focusables() {
    return [...card.querySelectorAll('input,button,select,textarea,[tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.disabled && el.offsetParent !== null);
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      const list = focusables();
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  document.addEventListener('keydown', onKey, true);

  w.addEventListener('click', (e) => { if (e.target === w) close(); });
  w.querySelector('.nb-dl-close').addEventListener('click', close);
  w.querySelector('#dl-cancel').addEventListener('click', close);

  function syncMode() {
    const mode = w.querySelector('input[name="dl-mode"]:checked').value;
    range.hidden = mode !== 'custom';
    if (mode === 'custom') {
      const n = clampInt(count.value, 1, customMax, initialCount);
      goLbl.textContent = `download ${fmtCount(n)} ${n === 1 ? 'MCQ' : 'MCQs'}`;
    } else {
      goLbl.textContent = `download ${fmtCount(total)} ${total === 1 ? 'MCQ' : 'MCQs'}`;
    }
  }
  radios.forEach(r => r.addEventListener('change', syncMode));

  function syncCount(source) {
    const n = clampInt(source.value, 1, customMax, initialCount);
    if (slider.value !== String(n)) slider.value = String(n);
    if (count.value  !== String(n)) count.value  = String(n);
    preview.textContent = fmtCount(n);
    goLbl.textContent = `download ${fmtCount(n)} ${n === 1 ? 'MCQ' : 'MCQs'}`;
  }
  slider.addEventListener('input', () => syncCount(slider));
  count.addEventListener('input',  () => syncCount(count));
  count.addEventListener('blur',   () => syncCount(count));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const mode = w.querySelector('input[name="dl-mode"]:checked').value;
    const filename = fnameInp.value.trim() || defaultName;

    const params = new URLSearchParams();
    params.set('category_id', String(cat.category_id));
    params.set('filename', filename);
    if (mode === 'custom') {
      const n = clampInt(count.value, 1, customMax, initialCount);
      params.set('limit', String(n));
    }
    const url = `/api/category-pdf?${params.toString()}`;

    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener';
    a.download = `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    toast('Generating PDF — your download will appear shortly.', 'ok');
    close();
  });

  // Initial focus + accessibility kick-off
  syncMode();
  setTimeout(() => fnameInp.focus(), 30);
}
