// FAQ accordion — dashed dividers, + → × on open.
import { esc } from '../core/helpers.js?v=1778642504';

export function buildFAQ(container, faqs) {
  if (!container) return;
  container.innerHTML = `<h2>FAQ</h2>` + faqs.map((f, i) => `
    <details ${i === 0 ? 'open' : ''}>
      <summary>${esc(f.q)}</summary>
      <p>${f.a}</p>
    </details>
  `).join('');
}
