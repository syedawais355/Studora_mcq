// Icon set — every glyph is 1.6px stroke, 24x24, rounded joins.
// Sourced from studora-blueprint.html § 07 Icon set.
const ICONS = {
  globe:    '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.8 3 2.8 14 0 17M12 3.5c-2.8 3-2.8 14 0 17"/>',
  flag:     '<path d="M5 21V4h12l-2.5 3.5L17 11H7"/>',
  crescent: '<path d="M16.5 3.5a8.5 8.5 0 1 0 4 16A7 7 0 0 1 16.5 3.5z"/>',
  map:      '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6zM9 4v14M15 6v14"/>',
  book:     '<path d="M4 20V5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM8 7h8M8 11h6"/>',
  beaker:   '<path d="M9 3h6v4.5L19.5 18A2.5 2.5 0 0 1 17 21H7a2.5 2.5 0 0 1-2.5-3L9 7.5V3z"/><path d="M7.5 14h9"/>',
  quote:    '<path d="M7 8h4v8l-3 2v-2H5v-5a3 3 0 0 1 2-3zm8 0h4v8l-3 2v-2h-3v-5a3 3 0 0 1 2-3z"/>',
  pen:      '<path d="M3 21l4-1L18 9l-3-3L4 17l-1 4zM14 7l3 3"/>',
  board:    '<rect x="3" y="5" width="18" height="13" rx="1"/><path d="M9 21l3-3 3 3"/>',
  chart:    '<path d="M4 19V6M4 19h16M8 16v-4M12 16V9M16 16v-7"/>',
  scale:    '<path d="M12 3v17M4 9l3 6h-6l3-6zm16 0l3 6h-6l3-6zM4 21h16"/>',
  chip:     '<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  sigma:    '<path d="M6 5h12l-6 7 6 7H6l4-7-4-7z"/>',
  atom:     '<circle cx="12" cy="12" r="1.8"/><ellipse cx="12" cy="12" rx="9" ry="3.5"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(120 12 12)"/>',
  flask:    '<path d="M10 3h4v5l4 11a3 3 0 0 1-3 4H9a3 3 0 0 1-3-4l4-11V3zM8 14h8"/>',
  leaf:     '<path d="M20 4c-8 0-14 4-14 12 0 2 1 4 2 4 8 0 12-6 12-16zM6 20c4-6 8-9 14-12"/>',
  bookmark: '<path d="M6 3v18l6-4 6 4V3z"/>',
  star:     '<path d="M12 2l2.4 6.5L21 9l-5.2 4.1L17.6 20 12 16.2 6.4 20l1.8-6.9L3 9l6.6-.5z"/>',
  download: '<path d="M12 2v8m0 0l-3-3m3 3l3-3M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  share:    '<circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M7.8 11L16 7M7.8 13L16 17"/>',
  search:   '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  target:   '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>',
  filter:   '<path d="M4 7h16M4 12h10M4 17h16"/>',
  streak:   '<path d="M12 3c-3 4-3 7 0 10 3-3 3-6 0-10zM8 14c-2 2-2 4 4 7 6-3 6-5 4-7-3 2-5 2-8 0z"/>',
  flag2:    '<path d="M5 21V3h11l-2 4 2 4H5"/>',
  news:     '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M7 9h6M7 13h10M7 16h7"/>',
  gavel:    '<path d="M13 3l8 8-3 3-8-8 3-3zM4 20l8-8 3 3-8 8-3-3zM2 22h10"/>',
};

export function icon(name, classes = '') {
  const p = ICONS[name] || ICONS.book;
  const cls = classes ? ` class="${classes}"` : '';
  return `<svg${cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

export function normalizeSlug(slug) {
  return String(slug || '')
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/-mcqs?$/i, '')
    .trim();
}

export function catIcon(cat) {
  const s = normalizeSlug(cat?.category_slug);
  if (s.includes('general-knowledge')) return 'globe';
  if (s.includes('pakistan-affairs') || s.includes('pakistan-current')) return 'flag';
  if (s.includes('islamiat') || s.includes('islamic')) return 'crescent';
  if (s.includes('geography') || s.includes('pak-studies')) return 'map';
  if (s.includes('urdu')) return 'quote';
  if (s.includes('english')) return 'pen';
  if (s.includes('chemistry')) return 'flask';
  if (s.includes('physics')) return 'atom';
  if (s.includes('biology') || s.includes('medical')) return 'leaf';
  if (s.includes('computer') || s.includes('tech')) return 'chip';
  if (s.includes('math')) return 'sigma';
  if (s.includes('economics') || s.includes('finance')) return 'chart';
  if (s.includes('political') || s.includes('law')) return 'scale';
  if (s.includes('science')) return 'beaker';
  if (s.includes('current-affairs')) return 'news';
  if (s.includes('pedagogy') || s.includes('teaching')) return 'board';
  return 'book';
}
