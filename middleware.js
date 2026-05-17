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

// Tiny module-scope cache for the upstream index.html. Edge invocations on
// the same isolate reuse it; new isolates fetch fresh. TTL is short enough
// that a deploy is visible within a minute, long enough to spare the origin
// from hammering during traffic spikes.
const HTML_CACHE = { body: null, ts: 0 };
const HTML_CACHE_TTL_MS = 60 * 1000;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

// safeDecode tolerates a slug that was never URL-encoded as well as one
// where each segment was encoded by the SPA router. Decoding a plain slug
// just returns the same string; decoding a corrupt sequence throws and we
// fall back to the original.
function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

function lookupMeta(pathname) {
  // Take the remainder after /subjects/ or /exams/ as the slug — supports
  // nested slugs like /subjects/medical-mcqs/anatomy-mcqs.
  const subjMatch = pathname.match(/^\/subjects\/(.+?)\/?$/);
  if (subjMatch) return seoMeta.subjects?.[safeDecode(subjMatch[1])];
  const examMatch = pathname.match(/^\/exams\/(.+?)\/?$/);
  if (examMatch) return seoMeta.exams?.[safeDecode(examMatch[1])];
  return null;
}

function rewriteHtml(html, { title, description }, canonicalPath) {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  // canonicalPath comes from request.url so reserved characters are already
  // percent-encoded. Pass it through escapeHtml as a final defence — paranoia
  // is free.
  const canonical = escapeHtml(`${BASE}${canonicalPath}`);

  // Function replacements so `$` characters in title/description text are
  // treated as literal, never as $n backreferences.
  return html
    .replace(/<title>[^<]*<\/title>/, () => `<title>${t}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, (_, a, b) => `${a}${d}${b}`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, (_, a, b) => `${a}${t}${b}`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, (_, a, b) => `${a}${d}${b}`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, (_, a, b) => `${a}${canonical}${b}`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, (_, a, b) => `${a}${t}${b}`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, (_, a, b) => `${a}${d}${b}`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, (_, a, b) => `${a}${canonical}${b}`);
}

async function fetchUpstreamHtml(origin) {
  const now = Date.now();
  if (HTML_CACHE.body && (now - HTML_CACHE.ts) < HTML_CACHE_TTL_MS) {
    return HTML_CACHE.body;
  }
  const upstream = await fetch(`${origin}/`, {
    headers: { [BYPASS_HEADER]: '1' },
  });
  // 304 means our previous body is still good. Anything 2xx else is a fresh body.
  if (upstream.status === 304 && HTML_CACHE.body) return HTML_CACHE.body;
  if (!upstream.ok) return null;
  const body = await upstream.text();
  HTML_CACHE.body = body;
  HTML_CACHE.ts = now;
  return body;
}

export default async function middleware(request) {
  // Self-protection: if this request is the middleware's own subrequest, pass through.
  if (request.headers.get(BYPASS_HEADER)) return;

  const url = new URL(request.url);
  const meta = lookupMeta(url.pathname);
  if (!meta) return; // No per-route metadata — let the SPA serve as-is.

  const origin = `${url.protocol}//${url.host}`;
  const html = await fetchUpstreamHtml(origin);
  if (!html) {
    // Upstream failed — explicitly fall back to the original request so the
    // SPA still loads instead of returning undefined (which the Vercel
    // matcher would surface as a blank response to the browser).
    return fetch(request);
  }

  const modified = rewriteHtml(html, meta, url.pathname);

  // Build a fresh Headers object with only what we actually want to forward.
  // Copying upstream headers wholesale risks leaking Set-Cookie / ETag /
  // Cache-Control intended for the static `/` response onto a per-route body.
  const headers = new Headers();
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'public, s-maxage=300, stale-while-revalidate=600, must-revalidate');
  headers.set('vary', 'Accept-Encoding');
  headers.set('x-seo-route', 'edge-rewritten');

  return new Response(modified, {
    status: 200,
    headers,
  });
}
