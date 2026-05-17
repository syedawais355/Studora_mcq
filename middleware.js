// Edge middleware that rewrites <title>, meta description, OpenGraph,
// Twitter Card, and canonical for /subjects/[slug] and /exams/[slug] before
// the HTML reaches the browser. Per-route SEO without a framework.
//
// Strategy: when one of the matched routes is hit, fetch the underlying
// static index.html, swap the metadata tags using a single regex pass, and
// return the modified Response. A bypass header on the fetch prevents the
// middleware from re-entering itself.

import seoMeta from './lib/seo-meta.json';

export const config = {
  // Match every path that is NOT an asset, an API call, or already a static file.
  // The middleware itself filters down to subjects/[slug] and exams/[slug].
  matcher: '/((?!api/|assets/|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
};

const BASE = 'https://studora.vercel.app';
const BYPASS_HEADER = 'x-seo-middleware-skip';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function lookupMeta(pathname) {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 2) {
    if (segs[0] === 'subjects') return seoMeta.subjects?.[segs[1]];
    if (segs[0] === 'exams')    return seoMeta.exams?.[segs[1]];
  }
  return null;
}

function rewriteHtml(html, { title, description }, canonicalPath) {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const canonical = `${BASE}${canonicalPath}`;

  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonical}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonical}$2`);
}

export default async function middleware(request) {
  // Self-protection: if this request is the middleware's own subrequest, pass through.
  if (request.headers.get(BYPASS_HEADER)) return;

  const url = new URL(request.url);
  const meta = lookupMeta(url.pathname);
  if (!meta) return; // No per-route metadata — let the SPA serve as-is.

  // Fetch the static index.html from the same origin, with the bypass header
  // so the middleware does not loop on itself.
  const origin = `${url.protocol}//${url.host}`;
  const upstream = await fetch(`${origin}/`, {
    headers: { [BYPASS_HEADER]: '1' },
  });

  if (!upstream.ok) return; // On error, let the SPA serve as-is.

  const html = await upstream.text();
  const modified = rewriteHtml(html, meta, url.pathname);

  // Preserve headers from upstream but overwrite content-length since body changed.
  const headers = new Headers(upstream.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.delete('content-length');
  headers.delete('content-encoding'); // body is now decoded plain HTML
  headers.set('x-seo-route', 'edge-rewritten');

  return new Response(modified, {
    status: 200,
    headers,
  });
}
