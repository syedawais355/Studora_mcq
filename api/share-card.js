// Dual-purpose Edge function: 1200x630 PNG share card (default) AND the
// server-rendered HTML landing page that users actually land on when they
// follow a /results?... link.
//
// Why both live here: the Vercel Hobby plan caps a deployment at 12 serverless
// functions. Folding the small results-page handler into share-card (and a
// similar fold of csp-report into report) keeps us under the limit without
// dropping any feature. Both branches share the same query-parsing, exam-name
// and token logic, so the merge actually removes duplication.
//
// Routing:
//   - vercel.json rewrites /results -> /api/share-card?as=html, so the
//     user-facing URL stays clean.
//   - ?as=html (or a URL that still starts with /results) -> HTML landing page
//   - everything else -> the PNG render
//
// Runtime note: the file is Edge because @vercel/og renders much faster there
// and the HTML+token logic is trivial in Edge once node:crypto is replaced
// with crypto.subtle (Web Crypto). No node:crypto / no Node-only APIs are
// allowed in this file.

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const EXAM_NAMES = {
  css:   'CSS',
  pms:   'PMS',
  ppsc:  'PPSC',
  fpsc:  'FPSC',
  nts:   'NTS',
  mdcat: 'MDCAT',
  ecat:  'ECAT',
  etea:  'ETEA',
  kppsc: 'KPPSC',
  mixed: 'a mixed quiz',
};

// Server-side secret — used to mint a short token so the share-card URL inside
// the OG meta isn't trivially forgeable by anyone trying to spam a chat with
// fake Studora scores. Falls back to a process-stable random string so dev
// still works without env config.
const SHARE_SECRET = (typeof process !== 'undefined' && process.env && process.env.SHARE_TOKEN_SECRET)
  || 'studora-share-card-default-secret-not-for-production';

function clampInt(value, lo, hi) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return null;
  if (n < lo || n > hi) return null;
  return n;
}

function cleanName(raw) {
  if (!raw) return '';
  const trimmed = String(raw).trim().slice(0, 24);
  // Strip anything that isn't a plain printable letter / number / space / dot / dash.
  return trimmed.replace(/[^\p{L}\p{N} .\-_'’]/gu, '').trim();
}

function examLabel(slug) {
  if (!slug) return 'a quiz';
  const key = String(slug).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
  if (!key) return 'a quiz';
  if (EXAM_NAMES[key]) return EXAM_NAMES[key];
  // Allow arbitrary subject slugs by titleising them.
  return key.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function examSlugOf(raw) {
  return String(raw || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
}

// Uint8Array -> lowercase hex, no allocations on the hot path beyond the
// single output string. Used to render the share-token digest into the URL.
function toHex(bytes) {
  const arr = new Uint8Array(bytes);
  let out = '';
  for (let i = 0; i < arr.length; i++) {
    const h = arr[i].toString(16);
    out += h.length === 1 ? '0' + h : h;
  }
  return out;
}

// Web Crypto port of the old node:crypto sha256-of-secret-plus-key trick.
// The token doesn't protect the score itself — it just lets the share-card
// endpoint optionally refuse traffic that didn't come through the landing
// page in the future. 12 hex chars is plenty for that "did this come from
// us?" check without bloating the URL.
async function shareToken({ score, total, correct, exam, name }) {
  const key = `${score}|${total}|${correct}|${exam}|${name || ''}`;
  const input = new TextEncoder().encode(`${SHARE_SECRET}:${key}`);
  const digest = await crypto.subtle.digest('SHA-256', input);
  return toHex(digest).slice(0, 12);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// In Edge the request has a Headers object, not a plain {}. Pick the best
// host/proto available so the OG image URL we emit is absolute (chat clients
// silently ignore relative image URLs).
function buildOrigin(req, fallbackOrigin) {
  const get = (k) => req.headers.get(k) || '';
  const proto = (get('x-forwarded-proto') || 'https').split(',')[0].trim() || 'https';
  const host  = (get('x-forwarded-host') || get('host') || '').split(',')[0].trim();
  if (host) return `${proto}://${host}`;
  // Last-ditch fallback: derive from the request URL itself.
  return fallbackOrigin || 'https://studora.vercel.app';
}

// Want-HTML detection: either the rewrite landed (?as=html present) or the
// original URL still starts with /results (e.g. someone curls /api/share-card
// without the rewrite). Either signal triggers the landing-page branch.
function wantsHtml(req, searchParams) {
  if (searchParams.get('as') === 'html') return true;
  const url = req.url || '';
  // The rewrite preserves the original pathname in the URL Vercel passes us
  // for Edge functions, but be defensive in case that ever changes.
  if (url.includes('/results?') || url.endsWith('/results') || url.includes('/results/')) return true;
  return false;
}

// ---------------------------------------------------------------------------
// PNG branch (original share-card logic)
// ---------------------------------------------------------------------------

// Tiny createElement-style helper. Satori accepts plain JSX-shaped vnodes
// ({ type, props: { children, style, ... } }), so we don't need a JSX runtime.
function h(type, props, ...children) {
  const flat = children.flat().filter(c => c !== null && c !== undefined && c !== false);
  return {
    type,
    props: { ...(props || {}), children: flat.length <= 1 ? flat[0] : flat },
  };
}

function verdict(score) {
  if (score === 100) return 'A perfect run.';
  if (score >= 80)   return 'A sharp result.';
  if (score >= 60)   return 'A solid effort.';
  if (score >= 40)   return 'Worth another round.';
  return 'Every rep counts.';
}

function statCell(label, value) {
  return h('div', {
    style: {
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      padding: '18px 22px',
      border: '1.5px solid #17181c',
      borderRadius: '8px',
      background: '#f3efe2',
    },
  },
    h('div', {
      style: {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#646570',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        display: 'flex',
      },
    }, label),
    h('div', {
      style: {
        marginTop: '8px',
        fontSize: '56px',
        fontFamily: 'serif',
        fontStyle: 'italic',
        fontWeight: 500,
        color: '#17181c',
        letterSpacing: '-0.02em',
        lineHeight: 1,
        display: 'flex',
      },
    }, value),
  );
}

function renderPng({ score, total, correct, exam, name }) {
  const headline = `Scored ${score}% on ${exam}`;
  const sub      = `${correct} of ${total} correct`;
  const verd     = verdict(score);

  // Notebook horizontal rules — emulate body.nb's 32px background-image.
  const rules = [];
  for (let y = 120; y < 600; y += 32) rules.push(y);

  const tree = h('div', {
    style: {
      width: '1200px',
      height: '630px',
      display: 'flex',
      flexDirection: 'column',
      background: '#faf8f1',
      position: 'relative',
      fontFamily: 'sans-serif',
      color: '#17181c',
    },
  },
    // Horizontal rules.
    h('div', {
      style: { position: 'absolute', inset: '0', display: 'flex' },
    },
      ...rules.map((y) => h('div', {
        style: {
          position: 'absolute',
          left: '0', right: '0', top: `${y}px`,
          height: '1px', background: '#eae3cf', opacity: 0.7,
          display: 'flex',
        },
      })),
    ),

    // Red margin line.
    h('div', {
      style: {
        position: 'absolute',
        left: '100px', top: '0', bottom: '0',
        width: '1.5px',
        background: '#d97b6c',
        opacity: 0.55,
        display: 'flex',
      },
    }),

    // Brand chip — black pill with yellow STUDORA wordmark.
    h('div', {
      style: {
        position: 'absolute',
        left: '140px', top: '78px',
        height: '38px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        background: '#17181c',
        borderRadius: '6px',
      },
    },
      h('span', {
        style: {
          color: '#ffe680',
          fontSize: '14px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          fontFamily: 'monospace',
        },
      }, 'STUDORA'),
      h('span', {
        style: {
          color: '#faf8f1',
          opacity: 0.65,
          fontSize: '13px',
          marginLeft: '10px',
          fontFamily: 'monospace',
          letterSpacing: '0.04em',
        },
      }, '/ SCORECARD'),
    ),

    // Headline.
    h('div', {
      style: {
        position: 'absolute',
        left: '140px',
        top: '155px',
        right: '120px',
        fontSize: '66px',
        fontFamily: 'serif',
        fontWeight: 700,
        color: '#17181c',
        letterSpacing: '-0.02em',
        lineHeight: 1.08,
        display: 'flex',
      },
    }, headline),

    // Subhead.
    h('div', {
      style: {
        position: 'absolute',
        left: '140px',
        top: '258px',
        fontSize: '24px',
        color: '#3c3d44',
        fontFamily: 'sans-serif',
        display: 'flex',
      },
    }, sub),

    // Italic verdict line.
    h('div', {
      style: {
        position: 'absolute',
        left: '140px',
        top: '296px',
        fontSize: '22px',
        color: '#3c3d44',
        fontStyle: 'italic',
        fontFamily: 'serif',
        display: 'flex',
      },
    }, verd),

    // Stats row — three cells.
    h('div', {
      style: {
        position: 'absolute',
        left: '140px',
        top: '360px',
        right: '140px',
        display: 'flex',
        gap: '18px',
      },
    },
      statCell('Accuracy', `${score}%`),
      statCell('Correct',  String(correct)),
      statCell('Total',    String(total)),
    ),

    // Optional signature line.
    name ? h('div', {
      style: {
        position: 'absolute',
        left: '140px',
        top: '510px',
        fontSize: '16px',
        color: '#646570',
        fontFamily: 'monospace',
        letterSpacing: '0.05em',
        display: 'flex',
      },
    }, `— ${name}`) : null,

    // Bottom divider.
    h('div', {
      style: {
        position: 'absolute',
        left: '140px', right: '140px', top: '548px',
        height: '1px',
        background: '#17181c',
        opacity: 0.25,
        display: 'flex',
      },
    }),

    // Bottom tagline.
    h('div', {
      style: {
        position: 'absolute',
        left: '140px',
        bottom: '38px',
        fontSize: '28px',
        fontFamily: 'serif',
        fontStyle: 'italic',
        color: '#17181c',
        display: 'flex',
      },
    }, 'Study quietly. Score loudly.'),

    // URL.
    h('div', {
      style: {
        position: 'absolute',
        right: '140px',
        bottom: '46px',
        fontSize: '15px',
        fontFamily: 'monospace',
        color: '#3c3d44',
        letterSpacing: '0.04em',
        display: 'flex',
      },
    }, 'studora.vercel.app'),
  );

  const image = new ImageResponse(tree, { width: 1200, height: 630 });

  // The query is fully deterministic — anyone re-sharing the same URL hits the
  // CDN, not the function. immutable + 1 year — chat unfurl caches love it.
  image.headers.set('Cache-Control', 'public, immutable, max-age=31536000');
  image.headers.set('Content-Type', 'image/png');
  return image;
}

// ---------------------------------------------------------------------------
// HTML branch (former /api/results-page)
// ---------------------------------------------------------------------------

function renderHtml({ title, desc, pageUrl, cardUrl, score, total, correct, exam, name }) {
  const safeTitle = escapeHtml(title);
  const safeDesc  = escapeHtml(desc);
  const safeUrl   = escapeHtml(pageUrl);
  const safeCard  = escapeHtml(cardUrl);
  const safeExam  = escapeHtml(exam);
  const safeName  = name ? escapeHtml(name) : '';

  return `<!doctype html>
<html lang="en-PK">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#faf8f1">
<title>${safeTitle}</title>
<meta name="description" content="${safeDesc}">
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${safeUrl}">

<meta property="og:type" content="website">
<meta property="og:site_name" content="Studora">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDesc}">
<meta property="og:url" content="${safeUrl}">
<meta property="og:locale" content="en_PK">
<meta property="og:image" content="${safeCard}">
<meta property="og:image:secure_url" content="${safeCard}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${safeTitle}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDesc}">
<meta name="twitter:image" content="${safeCard}">

<link rel="icon" type="image/svg+xml" href="/assets/img/studora-logo.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,700;1,9..144,500;1,9..144,700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

<style>
  :root{
    --paper:#faf8f1;--paper-2:#f3efe2;--ink:#17181c;--ink-2:#3c3d44;--ink-3:#646570;
    --rule:#e6e0cd;--yellow:#ffe680;--red:#b94632;--green:#1f7a3d;
    --sans:'Inter',ui-sans-serif,system-ui,sans-serif;
    --serif:'Fraunces',ui-serif,Georgia,serif;
    --mono:'JetBrains Mono',ui-monospace,monospace;
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{
    background:var(--paper);color:var(--ink);font-family:var(--sans);
    background-image:linear-gradient(transparent 31px,var(--rule) 31px,var(--rule) 32px,transparent 32px);
    background-size:100% 32px;background-position:0 60px;min-height:100vh;
    -webkit-font-smoothing:antialiased;
  }
  .wrap{max-width:760px;margin:0 auto;padding:48px 24px}
  .chip{
    display:inline-flex;align-items:center;gap:10px;padding:5px 12px;
    border-radius:999px;background:var(--ink);color:var(--yellow);
    font-family:var(--mono);font-size:11px;letter-spacing:.1em;font-weight:700;
    text-transform:uppercase;text-decoration:none;
  }
  .chip .sl{color:var(--paper);opacity:.6}
  h1{
    font-family:var(--serif);font-weight:700;font-size:clamp(38px,6vw,56px);
    line-height:1.06;margin:22px 0 12px;letter-spacing:-.02em;
  }
  h1 em{font-style:italic;font-weight:500;color:var(--ink-2)}
  .sub{font-family:var(--serif);font-style:italic;font-size:20px;color:var(--ink-2);margin:0 0 26px}
  .card{
    border:1.5px solid var(--ink);border-radius:8px;background:var(--paper);
    box-shadow:2px 2px 0 var(--ink);padding:28px 26px;position:relative;
  }
  .card::before{
    content:"";position:absolute;inset:-8px -8px auto auto;width:54px;height:54px;
    background:var(--yellow);border:1.5px solid var(--ink);transform:rotate(8deg);
    z-index:-1;border-radius:6px;
  }
  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}
  .stats div{border:1.5px solid var(--ink);border-radius:8px;padding:14px 12px;text-align:center;background:var(--paper-2)}
  .stats b{display:block;font-family:var(--serif);font-style:italic;font-size:34px;font-weight:500;letter-spacing:-.01em}
  .stats em{display:block;margin-top:4px;font-family:var(--mono);font-size:10.5px;color:var(--ink-3);letter-spacing:.08em;text-transform:uppercase;font-style:normal}
  .cta{
    display:inline-flex;align-items:center;gap:10px;margin-top:26px;
    padding:13px 18px;border:1.5px solid var(--ink);border-radius:8px;
    background:var(--ink);color:var(--paper);text-decoration:none;
    font-family:var(--mono);font-size:13px;font-weight:600;letter-spacing:.02em;
    transition:transform .12s,box-shadow .12s;
  }
  .cta:hover{transform:translate(-1px,-1px);box-shadow:2px 2px 0 var(--ink-3)}
  .alt{
    display:inline-block;margin-left:10px;color:var(--ink-2);
    font-family:var(--mono);font-size:12px;text-decoration:underline;
  }
  .preview{margin:30px 0 0;border:1.5px solid var(--ink);border-radius:8px;overflow:hidden;background:var(--paper-2)}
  .preview img{display:block;width:100%;height:auto}
  .foot{margin-top:36px;font-family:var(--serif);font-style:italic;color:var(--ink-2)}
  .foot b{color:var(--ink);font-family:var(--sans);font-style:normal}
</style>
</head>
<body>
  <main class="wrap">
    <a class="chip" href="/"><span>STUDORA</span><span class="sl">/ SCORECARD</span></a>
    <h1>Scored <em>${score}%</em> on ${safeExam}.</h1>
    <p class="sub">${safeName ? `${safeName} solved ` : ''}${correct} of ${total} questions correctly.</p>

    <div class="card">
      <div class="stats">
        <div><b>${score}%</b><em>accuracy</em></div>
        <div><b>${correct}</b><em>correct</em></div>
        <div><b>${total}</b><em>total</em></div>
      </div>
      <a class="cta" href="/quiz">Take your own quiz →</a>
      <a class="alt" href="/exams">browse exam tracks</a>
    </div>

    <figure class="preview">
      <img src="${safeCard}" width="1200" height="630" alt="Studora scorecard — ${safeTitle}" loading="lazy">
    </figure>

    <p class="foot">Study quietly. <b>Score loudly.</b></p>
  </main>
</body>
</html>`;
}

async function handleHtml(req, url) {
  // Method gate. Edge runtime: req.method is the verb string.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { 'Allow': 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const q = url.searchParams;
  const score   = clampInt(q.get('score'),   0, 100);
  const total   = clampInt(q.get('total'),   1, 500);
  const correct = clampInt(q.get('correct'), 0, 500);

  if (score === null || total === null || correct === null || correct > total) {
    // Invalid share — bounce them to the homepage with a soft 302 rather than
    // showing a hostile error page.
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/', 'Cache-Control': 'no-store' },
    });
  }

  const exam = examLabel(q.get('exam'));
  const name = cleanName(q.get('name'));
  const slug = examSlugOf(q.get('exam'));

  const origin = buildOrigin(req, `${url.protocol}//${url.host}`);
  const token  = await shareToken({ score, total, correct, exam: slug, name });

  const cardParams = new URLSearchParams({
    score:   String(score),
    total:   String(total),
    correct: String(correct),
    exam:    slug || 'mixed',
    token,
  });
  if (name) cardParams.set('name', name);

  const cardUrl = `${origin}/api/share-card?${cardParams.toString()}`;
  // Preserve the user-facing /results URL in the canonical/og:url — even though
  // the function lives at /api/share-card, the public path is /results.
  const userPath = url.pathname.startsWith('/api/share-card')
    ? `/results?${new URLSearchParams({
        score: String(score), total: String(total), correct: String(correct),
        ...(slug ? { exam: slug } : {}),
        ...(name ? { name } : {}),
      }).toString()}`
    : `${url.pathname}${url.search}`;
  const pageUrl = `${origin}${userPath}`;

  const title = `Scored ${score}% on ${exam} — Studora`;
  const desc  = name
    ? `${name} got ${correct} of ${total} questions right on Studora. Try the same quiz and see how you stack up.`
    : `${correct} of ${total} questions right on Studora. Try the same quiz and see how you stack up.`;

  const body = renderHtml({
    title, desc, pageUrl, cardUrl,
    score, total, correct, exam, name,
  });

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Short cache — same query always returns the same HTML, but we want
      // updates to the page chrome (footer, etc) to propagate quickly. The
      // expensive bit (the PNG) is cached for a year by the PNG branch itself.
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}

// ---------------------------------------------------------------------------
// Top-level dispatcher
// ---------------------------------------------------------------------------

export default async function handler(req) {
  const url = new URL(req.url);
  const params = url.searchParams;

  if (wantsHtml(req, params)) {
    return handleHtml(req, url);
  }

  // PNG branch — original share-card behaviour.
  const score   = clampInt(params.get('score'),   0, 100);
  const total   = clampInt(params.get('total'),   1, 500);
  const correct = clampInt(params.get('correct'), 0, 500);
  const exam    = examLabel(params.get('exam'));
  const name    = cleanName(params.get('name'));

  if (score === null || total === null || correct === null || correct > total) {
    return new Response('Invalid query', { status: 400 });
  }

  return renderPng({ score, total, correct, exam, name });
}
