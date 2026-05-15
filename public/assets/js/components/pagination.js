// Pagination — flat row of mono boxes, ink current.
export function buildPag(container, total, current, perPage, onPage) {
  if (!container) return;
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) { container.innerHTML = ''; return; }
  const nums = range(current, pages);
  let html = `<button type="button" class="pprev" ${current <= 1 ? 'disabled' : ''}>← prev</button>`;
  for (const p of nums) {
    if (p === '…') html += `<span class="dots">…</span>`;
    else html += `<button type="button" data-pg="${p}" class="${p === current ? 'cur' : ''}">${p}</button>`;
  }
  html += `<button type="button" class="pnext" ${current >= pages ? 'disabled' : ''}>next →</button>`;
  container.innerHTML = html;

  container.querySelectorAll('[data-pg]').forEach((b) => {
    b.addEventListener('click', () => {
      onPage(parseInt(b.dataset.pg, 10));
      window.scrollTo({ top: 120, behavior: 'smooth' });
    });
  });
  const pp = container.querySelector('.pprev');
  const pn = container.querySelector('.pnext');
  pp?.addEventListener('click', () => current > 1 && (onPage(current - 1), window.scrollTo({ top: 120, behavior: 'smooth' })));
  pn?.addEventListener('click', () => current < pages && (onPage(current + 1), window.scrollTo({ top: 120, behavior: 'smooth' })));
}

function range(c, t) {
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
  if (c <= 4) return [1, 2, 3, 4, 5, '…', t];
  if (c >= t - 3) return [1, '…', t - 4, t - 3, t - 2, t - 1, t];
  return [1, '…', c - 1, c, c + 1, '…', t];
}
