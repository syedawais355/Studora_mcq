// Report modal — opens when a user clicks "report" on any MCQ. Posts to
// /api/report with the chosen reason + optional details, then closes with a
// confirmation toast. Mirrors the download-modal aesthetic.
import { toast } from '../core/toast.js?v=1778642504';
import { state } from '../core/state.js?v=1778642504';

const REASONS = [
  { id: 'wrong_answer', label: 'Wrong answer marked', hint: 'The correct option is incorrect.',  icon: 'x' },
  { id: 'typo',         label: 'Typo or grammar',    hint: 'Misspelling or bad phrasing.',       icon: 'pen' },
  { id: 'outdated',     label: 'Outdated info',      hint: 'Facts have changed since this was written.', icon: 'clock' },
  { id: 'unclear',      label: 'Question unclear',   hint: 'Ambiguous or hard to read.',         icon: 'help' },
  { id: 'offensive',    label: 'Offensive content',  hint: 'Inappropriate or harmful.',          icon: 'flag' },
  { id: 'other',        label: 'Something else',     hint: 'Tell us in the note below.',         icon: 'dots' },
];

const ICON_SVG = {
  x:     '<path d="M6 6l12 12M18 6L6 18"/>',
  pen:   '<path d="M3 21l4-1L18 9l-3-3L4 17l-1 4zM14 7l3 3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  help:  '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 1-1 1.7v.5"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/>',
  flag:  '<path d="M5 21V4h12l-2.5 3.5L17 11H7"/>',
  dots:  '<circle cx="6" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18" cy="12" r="1.2" fill="currentColor"/>',
};
function svg(kind) {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_SVG[kind] || ICON_SVG.dots}</svg>`;
}

const MAX_DETAILS = 600;
const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ENT[c]); }

export function openReportModal({ questionId, questionText = '' }) {
  if (!questionId) return;
  if (document.querySelector('.nb-wall.is-rp')) return;

  const preview = String(questionText).trim();
  const previewShort = preview.length > 180 ? preview.slice(0, 177) + '…' : preview;

  const w = document.createElement('div');
  w.className = 'nb-wall is-dl is-rp';
  w.setAttribute('aria-hidden', 'false');
  w.innerHTML = `
    <div class="nb-wall-card nb-dl-card nb-rp-card" role="dialog" aria-modal="true" aria-labelledby="rp-title">
      <button class="nb-dl-close" type="button" aria-label="Close dialog">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <h3 id="rp-title">Report this <em>question.</em></h3>
      <p class="nb-dl-sub">Studora reviews every report — we fix or remove any question that doesn't meet the bar.</p>

      ${previewShort ? `<blockquote class="nb-rp-preview">${escHtml(previewShort)}</blockquote>` : ''}

      <form class="nb-dl-form" novalidate>
        <fieldset class="nb-rp-reasons">
          <legend>What's wrong?</legend>
          <div class="nb-rp-grid">
            ${REASONS.map((r, i) => `
              <label class="nb-rp-row">
                <input type="radio" name="rp-reason" value="${r.id}" ${i === 0 ? 'checked' : ''}>
                <span class="ico">${svg(r.icon)}</span>
                <span class="t">
                  <b>${escHtml(r.label)}</b>
                  <em>${escHtml(r.hint)}</em>
                </span>
              </label>
            `).join('')}
          </div>
        </fieldset>

        <label class="nb-dl-field nb-rp-note">
          <span class="nb-dl-label">Add a note <span class="opt">— optional</span></span>
          <textarea id="rp-details" maxlength="${MAX_DETAILS}" rows="3"
                    placeholder="What did you spot? Quote the line that's wrong if it helps."></textarea>
          <small class="nb-dl-hint"><span id="rp-count">0</span>/${MAX_DETAILS}</small>
        </label>

        <div class="nb-dl-actions">
          <button type="button" class="nb-btn" id="rp-cancel">cancel</button>
          <button type="submit" class="nb-btn primary" id="rp-go">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V3h11l-2 4 2 4H5"/></svg>
            <span id="rp-go-lbl">submit report</span>
          </button>
        </div>
      </form>
    </div>`;

  document.body.appendChild(w);
  const previouslyFocused = document.activeElement;
  document.documentElement.style.overflow = 'hidden';

  const card     = w.querySelector('.nb-rp-card');
  const form     = w.querySelector('form');
  const details  = w.querySelector('#rp-details');
  const count    = w.querySelector('#rp-count');
  const goBtn    = w.querySelector('#rp-go');
  const goLbl    = w.querySelector('#rp-go-lbl');

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
  w.querySelector('#rp-cancel').addEventListener('click', close);

  details.addEventListener('input', () => { count.textContent = String(details.value.length); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (goBtn.disabled) return;
    const reason = w.querySelector('input[name="rp-reason"]:checked')?.value;
    if (!reason) return;

    goBtn.disabled = true;
    goLbl.textContent = 'sending…';
    try {
      const r = await fetch('/api/report', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: questionId,
          reason,
          details: details.value.trim(),
          user_id: state.user?.id || null,
        }),
      });
      if (r.status === 429) {
        toast('You\'re reporting too quickly — try again in a minute.', 'err');
        goBtn.disabled = false;
        goLbl.textContent = 'submit report';
        return;
      }
      if (!r.ok) throw new Error(`report_failed_${r.status}`);
      // Mark the source card as reported so the user gets immediate visual feedback.
      const card = document.querySelector(`.nb-mcq[data-id="${questionId}"]`);
      if (card) {
        card.classList.add('reported');
        const btn = card.querySelector('.rp');
        if (btn) {
          btn.disabled = true;
          const lbl = btn.querySelector('span:not([class])') || btn.querySelector('span:last-of-type');
          if (lbl) lbl.textContent = 'reported';
        }
      }
      toast('Thanks — your report is on its way to the editors.', 'ok');
      close();
    } catch (err) {
      console.error('report_failed', err);
      toast('Could not send your report. Please try again.', 'err');
      goBtn.disabled = false;
      goLbl.textContent = 'submit report';
    }
  });

  setTimeout(() => w.querySelector('input[name="rp-reason"]:checked')?.focus(), 30);
}
