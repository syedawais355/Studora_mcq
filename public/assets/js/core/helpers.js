// Pure utility helpers — no DOM side effects.

const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ENT[c]);

export const cleanTitle = (t) =>
  t ? String(t).replace(/MCQs?$/i, '').replace(/\s+/g, ' ').trim() : t;

export const skeletons = (n, cls = 'nb-skel') =>
  Array.from({ length: n }, () => `<div class="${cls}"></div>`).join('');

export function animCount(el, target, dur = 1200) {
  if (!el) return;
  const start = performance.now();
  (function tick(now) {
    const t = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(ease * target).toLocaleString();
    if (t < 1) requestAnimationFrame(tick);
  })(start);
}

// Tiny tagged template — preserves interpolation but escapes by default.
export function html(strings, ...values) {
  return strings.reduce((acc, str, i) => {
    const v = values[i - 1];
    return acc + (v && v.__raw ? v.value : esc(v ?? '')) + str;
  });
}
html.raw = (value) => ({ __raw: true, value });

export const debounce = (fn, ms) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

// Drop a standard "couldn't load" state into `container` with a retry button
// wired to `onRetry`. Replaces ad-hoc `<div class="nb-empty">…</div>` strings
// scattered across pages. The container is replaced wholesale.
export function showErrorState(container, { title = 'Couldn\'t load', hint = '', onRetry }) {
  if (!container) return;
  container.innerHTML = `
    <div class="nb-empty nb-empty-err" role="alert">
      <svg class="ic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><circle cx="12" cy="16" r="0.6" fill="currentColor"/>
      </svg>
      <h4>${esc(title)}</h4>
      ${hint ? `<p>${esc(hint)}</p>` : ''}
      <button class="nb-btn primary nb-empty-retry" type="button" data-retry>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>
        </svg>
        <span>retry</span>
      </button>
    </div>`;
  const btn = container.querySelector('[data-retry]');
  if (btn && typeof onRetry === 'function') {
    btn.addEventListener('click', () => {
      btn.disabled = true;
      btn.querySelector('span').textContent = 'retrying…';
      try { onRetry(); } catch { btn.disabled = false; btn.querySelector('span').textContent = 'retry'; }
    });
  }
}
