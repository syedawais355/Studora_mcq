// Exam "complete book" download modal. Lets the user pick which subjects to
// include (all by default). For exams whose total MCQs exceed SINGLE_CAP, the
// modal offers a "split into volumes" mode so the entire content is downloadable
// across N independent PDFs.
import { toast } from '../core/toast.js?v=1779087891';
import { cleanTitle } from '../core/helpers.js?v=1779087891';

// Keep in sync with MAX_TOTAL in /api/exam-pdf.js.
const SINGLE_CAP = 8000;

function fmtCount(n) { return Number(n).toLocaleString(); }

function slugFor(exam) {
  return String(exam.slug || exam.acronym || 'exam')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'exam';
}

export function openExamDownloadModal(exam, examCats) {
  if (!exam) return;
  if (document.querySelector('.nb-wall.is-dl-exam')) return;

  const cats = (examCats || []).slice().sort((a, b) => (b.question_count || 0) - (a.question_count || 0));
  if (!cats.length) {
    toast('No subjects linked to this exam yet.', 'err');
    return;
  }
  const totalAll = cats.reduce((s, c) => s + (c.question_count || 0), 0);
  const defaultName = `studora-${slugFor(exam)}-complete-mcq-book`;

  const w = document.createElement('div');
  w.className = 'nb-wall is-dl is-dl-exam';
  w.setAttribute('aria-hidden', 'false');
  w.innerHTML = `
    <div class="nb-wall-card nb-dl-card" role="dialog" aria-modal="true" aria-labelledby="dle-title">
      <button class="nb-dl-close" type="button" aria-label="Close dialog">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <h3 id="dle-title">Complete <em>${escAttr(exam.acronym || exam.slug || 'Exam')} book</em></h3>
      <p class="nb-dl-sub"><b>${cats.length}</b> subjects · <b id="dle-sum-mcqs">${fmtCount(totalAll)}</b> MCQs selected</p>

      <form class="nb-dl-form" novalidate>
        <label class="nb-dl-field">
          <span class="nb-dl-label">File name</span>
          <div class="nb-dl-input">
            <input type="text" id="dle-filename" autocomplete="off" spellcheck="false"
                   maxlength="60" value="${escAttr(defaultName)}" required>
            <span class="nb-dl-ext">.pdf</span>
          </div>
          <small class="nb-dl-hint">Bundled by subject — each section keeps its own chapter heading inside the PDF.</small>
        </label>

        <fieldset class="nb-dle-subs">
          <legend>
            <span>Subjects to include</span>
            <span class="nb-dle-bulk">
              <button type="button" class="nb-dle-bulk-btn" data-bulk="all">all</button>
              <span aria-hidden="true">·</span>
              <button type="button" class="nb-dle-bulk-btn" data-bulk="none">none</button>
            </span>
          </legend>
          <div class="nb-dle-list">
            ${cats.map(c => `
              <label class="nb-dle-row">
                <input type="checkbox" class="nb-dle-cb" data-cat="${c.category_id}" data-q="${c.question_count || 0}" checked>
                <span class="t">${escHtml(cleanTitle(c.category_title || ''))}</span>
                <span class="q">${fmtCount(c.question_count || 0)}</span>
              </label>
            `).join('')}
          </div>
        </fieldset>

        <fieldset class="nb-dl-mode" id="dle-mode-wrap">
          <legend>How to download</legend>
          <label class="nb-dl-radio">
            <input type="radio" name="dle-mode" value="single" checked>
            <span>
              <b>Single PDF (compact)</b>
              <em id="dle-single-note">${fmtCount(totalAll)} MCQs across all subjects</em>
            </span>
          </label>
          <label class="nb-dl-radio" id="dle-split-row" hidden>
            <input type="radio" name="dle-mode" value="split">
            <span>
              <b>Multiple volumes (full content)</b>
              <em id="dle-split-note">split into volumes so the entire bank is downloadable</em>
            </span>
          </label>
        </fieldset>

        <div class="nb-dle-vols" id="dle-vols" hidden></div>

        <div class="nb-dl-actions">
          <button type="button" class="nb-btn" id="dle-cancel">cancel</button>
          <button type="submit" class="nb-btn primary" id="dle-go">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
            <span id="dle-go-lbl">download book</span>
          </button>
        </div>
      </form>
    </div>`;

  document.body.appendChild(w);
  const previouslyFocused = document.activeElement;
  document.documentElement.style.overflow = 'hidden';

  const card       = w.querySelector('.nb-dl-card');
  const form       = w.querySelector('form');
  const fnameInp   = w.querySelector('#dle-filename');
  const sumEl      = w.querySelector('#dle-sum-mcqs');
  const goLbl      = w.querySelector('#dle-go-lbl');
  const goBtn      = w.querySelector('#dle-go');
  const splitRow   = w.querySelector('#dle-split-row');
  const splitNote  = w.querySelector('#dle-split-note');
  const singleNote = w.querySelector('#dle-single-note');
  const volsBox    = w.querySelector('#dle-vols');

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
  w.querySelector('#dle-cancel').addEventListener('click', close);

  function selectedTotalMcqs() {
    let m = 0;
    w.querySelectorAll('.nb-dle-cb').forEach(cb => {
      if (cb.checked) m += parseInt(cb.dataset.q, 10) || 0;
    });
    return m;
  }

  function currentMode() {
    return w.querySelector('input[name="dle-mode"]:checked')?.value || 'single';
  }

  function recomputeSummary() {
    const mcqs = selectedTotalMcqs();
    sumEl.textContent = fmtCount(mcqs);

    // Show the "multiple volumes" option whenever the selection overshoots the
    // single-PDF cap. Compute the optimal split (ceil(total / SINGLE_CAP)).
    const needsSplit = mcqs > SINGLE_CAP;
    splitRow.hidden = !needsSplit;
    if (needsSplit) {
      const volumes = Math.min(20, Math.max(2, Math.ceil(mcqs / SINGLE_CAP)));
      splitNote.textContent = `${fmtCount(mcqs)} MCQs · split across ${volumes} PDFs`;
      singleNote.textContent = `Sampled — about ${fmtCount(SINGLE_CAP)} of ${fmtCount(mcqs)} MCQs, proportional per subject`;
      splitRow.dataset.volumes = String(volumes);
    } else {
      // total fits comfortably — hide split, force single
      const single = w.querySelector('input[name="dle-mode"][value="single"]');
      if (single) single.checked = true;
      singleNote.textContent = `${fmtCount(mcqs)} MCQs across selected subjects`;
    }

    refreshActionArea();
  }

  function refreshActionArea() {
    const mcqs = selectedTotalMcqs();
    if (mcqs === 0) {
      goLbl.textContent = 'select at least one subject';
      goBtn.disabled = true;
      volsBox.hidden = true;
      return;
    }
    goBtn.disabled = false;

    if (currentMode() === 'split') {
      const volumes = parseInt(splitRow.dataset.volumes, 10) || 2;
      goBtn.style.display = 'none';
      volsBox.hidden = false;
      volsBox.innerHTML = Array.from({ length: volumes }, (_, i) => {
        const n = i + 1;
        return `<button type="button" class="nb-btn primary nb-dle-vol-btn" data-vol="${n}" data-volumes="${volumes}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
          <span>Volume ${n} of ${volumes}</span>
        </button>`;
      }).join('');
      wireVolButtons();
    } else {
      volsBox.hidden = true;
      goBtn.style.display = '';
      const sent = Math.min(mcqs, SINGLE_CAP);
      goLbl.textContent = `download book · ${fmtCount(sent)} MCQs`;
    }
  }

  w.querySelectorAll('.nb-dle-cb').forEach(cb => cb.addEventListener('change', recomputeSummary));
  w.querySelectorAll('input[name="dle-mode"]').forEach(r => r.addEventListener('change', refreshActionArea));

  w.querySelectorAll('.nb-dle-bulk-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const on = btn.dataset.bulk === 'all';
      w.querySelectorAll('.nb-dle-cb').forEach(cb => { cb.checked = on; });
      recomputeSummary();
    });
  });

  function excludeIdsCsv() {
    return [...w.querySelectorAll('.nb-dle-cb')]
      .filter(cb => !cb.checked)
      .map(cb => parseInt(cb.dataset.cat, 10))
      .join(',');
  }

  function trigger({ volume, volumes }) {
    const excludeCsv = excludeIdsCsv();
    const filename = fnameInp.value.trim() || defaultName;
    const params = new URLSearchParams();
    params.set('exam_id', String(exam.id));
    params.set('filename', filename);
    if (excludeCsv) params.set('exclude', excludeCsv);
    if (volumes && volumes > 1) {
      params.set('volume', String(volume));
      params.set('volumes', String(volumes));
    }
    const url = `/api/exam-pdf?${params.toString()}`;
    const suffix = volumes && volumes > 1 ? `-vol${volume}-of-${volumes}` : '';

    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener';
    a.download = `${filename}${suffix}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function wireVolButtons() {
    volsBox.querySelectorAll('.nb-dle-vol-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const volume = parseInt(btn.dataset.vol, 10);
        const volumes = parseInt(btn.dataset.volumes, 10);
        trigger({ volume, volumes });
        toast(`Generating Volume ${volume} of ${volumes} — your download will appear shortly.`, 'ok');
      });
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (selectedTotalMcqs() === 0) return;
    trigger({});
    toast('Generating PDF — your download will appear in a few seconds.', 'ok');
    close();
  });

  recomputeSummary();
  setTimeout(() => fnameInp.focus(), 30);
}

const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ENT[c]); }
function escAttr(s) { return escHtml(s); }
