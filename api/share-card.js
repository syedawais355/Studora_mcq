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
  return trimmed.replace(/[^\p{L}\p{N} .\-_'’]/gu, '').trim();
}

function examLabel(slug) {
  if (!slug) return 'a quiz';
  const key = String(slug).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
  if (!key) return 'a quiz';
  if (EXAM_NAMES[key]) return EXAM_NAMES[key];
  return key.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function examSlugOf(raw) {
  return String(raw || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
}

function toHex(bytes) {
  const arr = new Uint8Array(bytes);
  let out = '';
  for (let i = 0; i < arr.length; i++) {
    const h = arr[i].toString(16);
    out += h.length === 1 ? '0' + h : h;
  }
  return out;
}

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

function buildOrigin(req, fallbackOrigin) {
  const get = (k) => req.headers.get(k) || '';
  const proto = (get('x-forwarded-proto') || 'https').split(',')[0].trim() || 'https';
  const host  = (get('x-forwarded-host') || get('host') || '').split(',')[0].trim();
  if (host) return `${proto}://${host}`;
  return fallbackOrigin || 'https://studora.vercel.app';
}

function wantsHtml(req, searchParams) {
  if (searchParams.get('as') === 'html') return true;
  const url = req.url || '';
  if (url.includes('/results?') || url.endsWith('/results') || url.includes('/results/')) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Font loading. Satori (under @vercel/og) needs TTF/OTF — our own woff2
// variable fonts won't work. We pull subset TTFs from jsDelivr's fontsource
// (the canonical "host fonts from npm" CDN), and cache the ArrayBuffers in
// module scope so they're fetched at most once per cold start. If a font
// download fails the PNG still renders with the next-best system fallback;
// the layout is forgiving enough that nothing breaks visually.
// ---------------------------------------------------------------------------

const FONT_URLS = {
  fraunces700:    'https://cdn.jsdelivr.net/fontsource/fonts/fraunces@latest/latin-700-normal.ttf',
  frauncesItalic: 'https://cdn.jsdelivr.net/fontsource/fonts/fraunces@latest/latin-500-italic.ttf',
  inter500:       'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-500-normal.ttf',
  inter700:       'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf',
  jetbrains:      'https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-600-normal.ttf',
};

let _fontsPromise = null;
async function loadFonts() {
  if (_fontsPromise) return _fontsPromise;
  _fontsPromise = (async () => {
    const entries = await Promise.all(
      Object.entries(FONT_URLS).map(async ([key, url]) => {
        try {
          const res = await fetch(url, { cache: 'force-cache' });
          if (!res.ok) return [key, null];
          return [key, await res.arrayBuffer()];
        } catch {
          return [key, null];
        }
      }),
    );
    return Object.fromEntries(entries);
  })();
  return _fontsPromise;
}

// ---------------------------------------------------------------------------
// PNG branch — premium scorecard render.
// ---------------------------------------------------------------------------

function h(type, props, ...children) {
  const flat = children.flat().filter(c => c !== null && c !== undefined && c !== false);
  return {
    type,
    props: { ...(props || {}), children: flat.length <= 1 ? flat[0] : flat },
  };
}

// Verdict copy — tuned to be actually shareable. The 80+ band gets the
// confident reading; sub-50 gets a kind nudge rather than a discouragement.
function verdict(score) {
  if (score === 100) return 'A flawless run.';
  if (score >= 90)   return 'Exam-day energy.';
  if (score >= 80)   return 'Sharp. Very sharp.';
  if (score >= 70)   return 'Solid work.';
  if (score >= 60)   return 'On the right track.';
  if (score >= 50)   return 'Halfway there.';
  if (score >= 30)   return 'Worth another round.';
  return 'Every rep counts.';
}

// Band colour — used to tint the score-ring accent + the verdict pill.
function bandColor(score) {
  if (score >= 80) return '#1f7a3d'; // green
  if (score >= 60) return '#b88a2a'; // amber
  if (score >= 40) return '#7a4a2a'; // ochre
  return '#b94632';                  // red
}

// Render an SVG-backed progress ring inline as a JSX-shaped node tree.
// Satori supports the basic SVG primitives we use here.
function scoreRing(score, accent) {
  const size = 280;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return h('div', {
    style: {
      width: `${size}px`,
      height: `${size}px`,
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  },
    h('svg', {
      width: size,
      height: size,
      viewBox: `0 0 ${size} ${size}`,
      style: { position: 'absolute', inset: 0 },
    },
      h('circle', {
        cx: size / 2, cy: size / 2, r,
        fill: 'none',
        stroke: '#e6e0cd',
        'stroke-width': stroke,
      }),
      h('circle', {
        cx: size / 2, cy: size / 2, r,
        fill: 'none',
        stroke: accent,
        'stroke-width': stroke,
        'stroke-linecap': 'round',
        'stroke-dasharray': `${dash} ${c - dash}`,
        'stroke-dashoffset': c / 4,
        transform: `rotate(-90 ${size / 2} ${size / 2})`,
      }),
    ),
    h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
      },
    },
      h('div', {
        style: {
          fontFamily: 'Fraunces',
          fontWeight: 700,
          fontSize: '120px',
          color: '#17181c',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          display: 'flex',
        },
      }, String(score)),
      h('div', {
        style: {
          marginTop: '4px',
          fontFamily: 'JetBrains Mono',
          fontWeight: 600,
          fontSize: '14px',
          color: '#646570',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          display: 'flex',
        },
      }, '% accuracy'),
    ),
  );
}

function statRow(label, value, accent) {
  return h('div', {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      paddingBottom: '14px',
      borderBottom: '1px solid #e6e0cd',
      gap: '12px',
    },
  },
    h('span', {
      style: {
        fontFamily: 'JetBrains Mono',
        fontSize: '13px',
        fontWeight: 600,
        color: '#646570',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        display: 'flex',
      },
    }, label),
    h('span', {
      style: {
        fontFamily: 'Fraunces',
        fontStyle: 'italic',
        fontWeight: 500,
        fontSize: '40px',
        color: accent || '#17181c',
        letterSpacing: '-0.02em',
        lineHeight: 1,
        display: 'flex',
      },
    }, value),
  );
}

async function renderPng({ score, total, correct, exam, name }) {
  const fonts = await loadFonts();
  const accent = bandColor(score);
  const verd = verdict(score);
  const wrong = Math.max(0, total - correct);

  // Horizontal rules — emulate the site's notebook background but only on the
  // right column so the scoring card stays clean.
  const rules = [];
  for (let y = 80; y < 600; y += 36) rules.push(y);

  const tree = h('div', {
    style: {
      width: '1200px',
      height: '630px',
      display: 'flex',
      flexDirection: 'row',
      background: '#faf8f1',
      position: 'relative',
      fontFamily: 'Inter',
      color: '#17181c',
    },
  },

    // ---- LEFT PANEL — ring + verdict (ink-coloured, dramatic contrast) ----
    h('div', {
      style: {
        width: '480px',
        height: '630px',
        background: '#17181c',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        position: 'relative',
      },
    },
      // Top-left brand chip floats above the dark panel.
      h('div', {
        style: {
          position: 'absolute',
          top: '38px', left: '38px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        },
      },
        h('div', {
          style: {
            width: '12px', height: '12px',
            background: '#ffe680',
            borderRadius: '3px',
            transform: 'rotate(45deg)',
            display: 'flex',
          },
        }),
        h('span', {
          style: {
            color: '#faf8f1',
            fontFamily: 'JetBrains Mono',
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '0.18em',
            display: 'flex',
          },
        }, 'STUDORA'),
      ),

      // The ring needs a white-paper backing so the ink panel doesn't bleed.
      h('div', {
        style: {
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: '#faf8f1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 0 8px rgba(255, 230, 128, 0.18)',
        },
      },
        scoreRing(score, accent),
      ),

      // Verdict pill below the ring.
      h('div', {
        style: {
          marginTop: '36px',
          padding: '10px 20px',
          background: '#ffe680',
          borderRadius: '999px',
          display: 'flex',
        },
      },
        h('span', {
          style: {
            fontFamily: 'Fraunces',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: '22px',
            color: '#17181c',
            letterSpacing: '-0.01em',
            display: 'flex',
          },
        }, verd),
      ),

      // Footer signature inside the dark panel.
      name ? h('div', {
        style: {
          position: 'absolute',
          left: '38px', right: '38px', bottom: '38px',
          fontFamily: 'JetBrains Mono',
          fontSize: '14px',
          color: 'rgba(250, 248, 241, 0.6)',
          letterSpacing: '0.08em',
          display: 'flex',
        },
      }, `— ${name.toUpperCase()}`) : null,
    ),

    // ---- RIGHT PANEL — paper background + notebook rules + content ----
    h('div', {
      style: {
        flex: '1',
        height: '630px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        padding: '56px 60px',
      },
    },
      // Notebook rules — soft and decorative.
      h('div', {
        style: { position: 'absolute', inset: 0, display: 'flex' },
      },
        ...rules.map((y) => h('div', {
          style: {
            position: 'absolute',
            left: '40px', right: '40px', top: `${y}px`,
            height: '1px', background: '#eae3cf', opacity: 0.7,
            display: 'flex',
          },
        })),
      ),

      // Exam pill at the top of the right panel.
      h('div', {
        style: {
          display: 'flex',
          alignSelf: 'flex-start',
          padding: '6px 14px',
          background: '#f3efe2',
          border: '1.5px solid #17181c',
          borderRadius: '999px',
        },
      },
        h('span', {
          style: {
            fontFamily: 'JetBrains Mono',
            fontSize: '12px',
            fontWeight: 600,
            color: '#17181c',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            display: 'flex',
          },
        }, `${exam} · scorecard`),
      ),

      // Headline.
      h('div', {
        style: {
          marginTop: '20px',
          fontFamily: 'Fraunces',
          fontWeight: 700,
          fontSize: '64px',
          color: '#17181c',
          letterSpacing: '-0.025em',
          lineHeight: 1.04,
          display: 'flex',
          flexDirection: 'column',
        },
      },
        h('span', { style: { display: 'flex' } }, `Scored ${score}%`),
        h('span', {
          style: {
            fontFamily: 'Fraunces',
            fontStyle: 'italic',
            fontWeight: 500,
            color: '#3c3d44',
            display: 'flex',
          },
        }, `on ${exam}.`),
      ),

      // Stat list (correct / wrong / total) — ledger style.
      h('div', {
        style: {
          marginTop: '38px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        },
      },
        statRow('Correct', String(correct), '#1f7a3d'),
        statRow('Wrong', String(wrong), wrong === 0 ? '#1f7a3d' : '#b94632'),
        statRow('Total', String(total), '#17181c'),
      ),

      // Bottom row — tagline + URL.
      h('div', {
        style: {
          position: 'absolute',
          left: '60px', right: '60px', bottom: '40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '20px',
          borderTop: '1.5px solid #17181c',
        },
      },
        h('span', {
          style: {
            fontFamily: 'Fraunces',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: '24px',
            color: '#17181c',
            display: 'flex',
          },
        }, 'Study quietly. Score loudly.'),
        h('span', {
          style: {
            fontFamily: 'JetBrains Mono',
            fontSize: '14px',
            fontWeight: 600,
            color: '#646570',
            letterSpacing: '0.08em',
            display: 'flex',
          },
        }, 'studora.vercel.app'),
      ),
    ),
  );

  // Build the fonts array only with successfully-loaded buffers — the rest
  // fall back to the next-named font, which Satori handles transparently.
  const fontList = [];
  if (fonts.fraunces700)    fontList.push({ name: 'Fraunces', data: fonts.fraunces700,    weight: 700, style: 'normal' });
  if (fonts.frauncesItalic) fontList.push({ name: 'Fraunces', data: fonts.frauncesItalic, weight: 500, style: 'italic' });
  if (fonts.inter500)       fontList.push({ name: 'Inter',    data: fonts.inter500,       weight: 500, style: 'normal' });
  if (fonts.inter700)       fontList.push({ name: 'Inter',    data: fonts.inter700,       weight: 700, style: 'normal' });
  if (fonts.jetbrains)      fontList.push({ name: 'JetBrains Mono', data: fonts.jetbrains, weight: 600, style: 'normal' });

  const image = new ImageResponse(tree, {
    width: 1200,
    height: 630,
    fonts: fontList.length ? fontList : undefined,
  });

  image.headers.set('Cache-Control', 'public, immutable, max-age=31536000');
  image.headers.set('Content-Type', 'image/png');
  return image;
}

// ---------------------------------------------------------------------------
// HTML branch — premium landing page that matches the site's brand.
// ---------------------------------------------------------------------------

function renderHtml({ title, desc, pageUrl, cardUrl, score, total, correct, exam, name, examSlug }) {
  const safeTitle = escapeHtml(title);
  const safeDesc  = escapeHtml(desc);
  const safeUrl   = escapeHtml(pageUrl);
  const safeCard  = escapeHtml(cardUrl);
  const safeExam  = escapeHtml(exam);
  const safeName  = name ? escapeHtml(name) : '';
  const wrong = Math.max(0, total - correct);
  const safeExamSlug = escapeHtml(examSlug || '');

  // Verdict + accent — kept in sync with the PNG so the page and the image
  // tell the same story.
  const verd = score === 100 ? 'A flawless run.'
    : score >= 90 ? 'Exam-day energy.'
    : score >= 80 ? 'Sharp. Very sharp.'
    : score >= 70 ? 'Solid work.'
    : score >= 60 ? 'On the right track.'
    : score >= 50 ? 'Halfway there.'
    : score >= 30 ? 'Worth another round.'
    : 'Every rep counts.';
  const accentVar = score >= 80 ? '--green' : score >= 60 ? '--amber' : score >= 40 ? '--ochre' : '--red';

  // Pre-built share payloads — encoded once, used by every channel button.
  // Caption is tuned to be share-able: punchy verdict, the result, the link.
  const caption = `${verd} Scored ${score}% on ${exam} on Studora (${correct}/${total}).`;
  const captionLong = `${caption}\n\n${pageUrl}\n\nQuiet UI, no paywall for the basics — built for Pakistan's toughest exams.`;
  const enc = (s) => encodeURIComponent(s);
  const waUrl  = `https://wa.me/?text=${enc(`${caption}\n\n${pageUrl}`)}`;
  const xUrl   = `https://twitter.com/intent/tweet?text=${enc(caption)}&url=${enc(pageUrl)}&hashtags=Studora,${examSlug || 'CSS'}`;
  const liUrl  = `https://www.linkedin.com/sharing/share-offsite/?url=${enc(pageUrl)}`;
  const fbUrl  = `https://www.facebook.com/sharer/sharer.php?u=${enc(pageUrl)}&quote=${enc(caption)}`;
  const tgUrl  = `https://t.me/share/url?url=${enc(pageUrl)}&text=${enc(caption)}`;
  const rdUrl  = `https://www.reddit.com/submit?url=${enc(pageUrl)}&title=${enc(caption)}`;
  const mailto = `mailto:?subject=${enc(`My Studora scorecard — ${score}% on ${exam}`)}&body=${enc(captionLong)}`;

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
<meta name="twitter:site" content="@studora_pk">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDesc}">
<meta name="twitter:image" content="${safeCard}">
<meta name="twitter:image:alt" content="${safeTitle}">

<link rel="icon" type="image/svg+xml" href="/assets/img/studora-logo.svg">

<style>
  /* Self-hosted variable fonts — same files the main app uses, served from
     /assets/fonts/ under the existing immutable cache header. Keeps the
     landing page on-brand without breaking the strict CSP.
     Note: Studora only self-hosts Fraunces *italic* (matching the site's
     hero rules). Non-italic headlines use Inter 800 + Fraunces italic emphasis,
     same as the rest of the app. */
  @font-face{
    font-family:'Inter';font-style:normal;font-weight:400 800;
    font-display:swap;
    src:url('/assets/fonts/inter-var.woff2') format('woff2-variations'),
        url('/assets/fonts/inter-var.woff2') format('woff2');
  }
  @font-face{
    font-family:'Fraunces';font-style:italic;font-weight:500 700;
    font-display:swap;
    src:url('/assets/fonts/fraunces-italic-var.woff2') format('woff2-variations'),
        url('/assets/fonts/fraunces-italic-var.woff2') format('woff2');
  }
  @font-face{
    font-family:'JetBrains Mono';font-style:normal;font-weight:400 500;
    font-display:swap;
    src:url('/assets/fonts/jetbrains-mono-var.woff2') format('woff2-variations'),
        url('/assets/fonts/jetbrains-mono-var.woff2') format('woff2');
  }
  :root{
    --paper:#faf8f1;--paper-2:#f3efe2;--paper-3:#ede6d2;
    --ink:#17181c;--ink-2:#3c3d44;--ink-3:#646570;
    --rule:#e6e0cd;--rule-2:#d9d2bd;
    --yellow:#ffe680;--mint:#cfe9d4;
    --red:#b94632;--green:#1f7a3d;--amber:#b88a2a;--ochre:#7a4a2a;
    --sans:'Inter',ui-sans-serif,system-ui,sans-serif;
    --serif:'Fraunces',ui-serif,Georgia,serif;
    --mono:'JetBrains Mono',ui-monospace,monospace;
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{
    background:var(--paper);color:var(--ink);font-family:var(--sans);
    background-image:linear-gradient(transparent 31px,var(--rule) 31px,var(--rule) 32px,transparent 32px);
    background-size:100% 32px;background-position:0 80px;min-height:100vh;
    -webkit-font-smoothing:antialiased;line-height:1.5;
  }
  .wrap{max-width:900px;margin:0 auto;padding:40px 24px 80px}

  /* Topbar — mimics the site's brand chip + nav strip without the full app. */
  .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:38px}
  .brand{
    display:inline-flex;align-items:center;gap:10px;padding:7px 13px;
    border-radius:8px;background:var(--ink);color:var(--yellow);
    font-family:var(--mono);font-size:12px;letter-spacing:.14em;font-weight:700;
    text-transform:uppercase;text-decoration:none;
  }
  .brand .dot{
    width:9px;height:9px;background:var(--yellow);border-radius:2px;
    transform:rotate(45deg);
  }
  .brand .slash{color:var(--paper);opacity:.55;margin-left:4px}
  .top .crumb{
    font-family:var(--mono);font-size:11.5px;color:var(--ink-3);
    letter-spacing:.06em;text-transform:uppercase;
  }
  .top .crumb a{color:var(--ink-2);text-decoration:none;border-bottom:1px solid var(--rule-2)}
  .top .crumb a:hover{color:var(--ink)}

  /* Headline section */
  .head{margin:0 0 32px}
  .pill{
    display:inline-flex;align-items:center;gap:8px;
    padding:5px 12px;margin-bottom:18px;
    border:1.5px solid var(--ink);border-radius:999px;background:var(--paper-2);
    font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.14em;
    text-transform:uppercase;color:var(--ink);
  }
  .pill .swatch{width:8px;height:8px;border-radius:50%;background:var(${accentVar})}
  h1{
    font-family:var(--sans);font-weight:800;
    font-size:clamp(40px,6.6vw,68px);line-height:1.04;
    margin:0 0 14px;letter-spacing:-.025em;
  }
  h1 em{
    font-family:var(--serif);font-style:italic;font-weight:500;color:var(--ink-2);
  }
  h1 mark{background:var(--yellow);color:var(--ink);padding:0 .12em;border-radius:3px}
  .sub{
    font-family:var(--serif);font-style:italic;font-size:22px;color:var(--ink-2);
    margin:0;line-height:1.4;max-width:640px;
  }

  /* The hero card: PNG preview on the left, share controls on the right. */
  .hero{
    display:grid;grid-template-columns:1.15fr .85fr;gap:22px;
    margin:0 0 32px;
  }
  @media(max-width:780px){.hero{grid-template-columns:1fr}}

  .preview{
    position:relative;border:1.5px solid var(--ink);border-radius:10px;
    background:var(--paper-2);overflow:hidden;
    box-shadow:3px 3px 0 var(--ink);
  }
  .preview::before{
    content:"";position:absolute;
    inset:-9px -9px auto auto;width:60px;height:60px;
    background:var(--yellow);border:1.5px solid var(--ink);
    transform:rotate(8deg);z-index:-1;border-radius:6px;
  }
  .preview img{display:block;width:100%;height:auto}
  .preview .footnote{
    display:flex;justify-content:space-between;align-items:center;
    padding:10px 14px;border-top:1.5px solid var(--ink);background:var(--paper);
    font-family:var(--mono);font-size:11px;color:var(--ink-3);letter-spacing:.06em;
  }
  .preview .footnote em{font-style:normal;color:var(--ink)}
  .preview .footnote a{
    color:var(--ink);text-decoration:none;border-bottom:1px solid var(--ink-3);
    font-weight:600;
  }

  /* Share controls card */
  .ctrl{
    border:1.5px solid var(--ink);border-radius:10px;background:var(--paper);
    padding:22px;display:flex;flex-direction:column;gap:14px;
    box-shadow:3px 3px 0 var(--ink);position:relative;
  }
  .ctrl::before{
    content:"";position:absolute;
    inset:-8px auto auto -8px;width:48px;height:48px;
    background:var(--mint);border:1.5px solid var(--ink);
    transform:rotate(-6deg);z-index:-1;border-radius:6px;
  }
  .ctrl h2{
    margin:0;font-family:var(--sans);font-weight:800;
    font-size:22px;letter-spacing:-.015em;
  }
  .ctrl h2 em{
    font-family:var(--serif);font-style:italic;font-weight:500;color:var(--ink-2);
  }

  .urlbox{
    display:flex;align-items:stretch;
    border:1.5px solid var(--ink);border-radius:8px;
    background:var(--paper);overflow:hidden;
  }
  .urlbox input{
    flex:1;min-width:0;border:0;outline:none;background:transparent;
    padding:10px 12px;font-family:var(--mono);font-size:12px;color:var(--ink-2);
  }
  .urlbox button{
    border:0;border-left:1.5px solid var(--ink);
    background:var(--paper-2);padding:0 14px;cursor:pointer;
    font-family:var(--mono);font-size:11.5px;font-weight:600;letter-spacing:.04em;
    color:var(--ink);transition:background .12s;
  }
  .urlbox button:hover{background:var(--yellow)}

  /* Channel grid — every major surface gets a dedicated button. */
  .channels{
    display:grid;grid-template-columns:repeat(4,1fr);gap:8px;
  }
  @media(max-width:520px){.channels{grid-template-columns:repeat(3,1fr)}}
  .ch{
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:6px;padding:12px 6px;
    border:1.5px solid var(--ink);border-radius:8px;background:var(--paper);
    text-decoration:none;color:var(--ink);cursor:pointer;
    font-family:var(--mono);font-size:10.5px;font-weight:600;
    letter-spacing:.06em;text-transform:uppercase;
    transition:transform .12s,box-shadow .12s,background .12s;
  }
  .ch:hover{transform:translate(-1px,-1px);box-shadow:2px 2px 0 var(--ink)}
  .ch svg{width:20px;height:20px}
  .ch.wa:hover{background:#cfe9d4}
  .ch.x:hover{background:var(--ink);color:var(--paper)}
  .ch.li:hover{background:#cfe1f5}
  .ch.fb:hover{background:#cfe1f5}
  .ch.tg:hover{background:#cfe5ef}
  .ch.rd:hover{background:#ffd5cc}
  .ch.mail:hover{background:var(--paper-2)}
  .ch.native{background:var(--ink);color:var(--paper)}
  .ch.native:hover{background:#0b0c10}

  /* Download + copy-caption — utility row */
  .util{display:flex;gap:8px;flex-wrap:wrap}
  .util a, .util button{
    flex:1;min-width:140px;
    display:inline-flex;align-items:center;justify-content:center;gap:8px;
    padding:11px 14px;border:1.5px solid var(--ink);border-radius:8px;
    background:var(--paper);color:var(--ink);text-decoration:none;cursor:pointer;
    font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.04em;
  }
  .util a:hover, .util button:hover{background:var(--paper-2)}
  .util svg{width:14px;height:14px}

  .caption-card{
    border:1px dashed var(--ink-3);border-radius:8px;background:var(--paper-2);
    padding:12px 14px;
    font-family:var(--serif);font-style:italic;font-size:14.5px;color:var(--ink);
    line-height:1.5;
  }
  .caption-card .label{
    display:block;margin-bottom:6px;
    font-family:var(--mono);font-style:normal;font-size:10px;
    color:var(--ink-3);letter-spacing:.14em;text-transform:uppercase;font-weight:600;
  }

  /* Stat strip below the hero */
  .stats{
    display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:0 0 30px;
  }
  @media(max-width:640px){.stats{grid-template-columns:repeat(2,1fr)}}
  .stat{
    border:1.5px solid var(--ink);border-radius:8px;background:var(--paper);
    padding:18px 16px;text-align:left;position:relative;overflow:hidden;
  }
  .stat .v{
    display:block;font-family:var(--serif);font-style:italic;font-weight:500;
    font-size:46px;letter-spacing:-.02em;line-height:1;
  }
  .stat .l{
    display:block;margin-top:8px;font-family:var(--mono);font-size:10.5px;
    color:var(--ink-3);letter-spacing:.12em;text-transform:uppercase;font-weight:600;
  }
  .stat.accent .v{color:var(${accentVar})}
  .stat.green .v{color:var(--green)}
  .stat.red .v{color:var(--red)}

  /* CTA cluster */
  .cta-row{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 26px}
  .cta{
    display:inline-flex;align-items:center;gap:10px;
    padding:14px 22px;border:1.5px solid var(--ink);border-radius:8px;
    background:var(--ink);color:var(--paper);text-decoration:none;
    font-family:var(--mono);font-size:13px;font-weight:700;letter-spacing:.04em;
    transition:transform .12s,box-shadow .12s;
  }
  .cta:hover{transform:translate(-1px,-1px);box-shadow:3px 3px 0 var(--ink-3)}
  .cta.alt{background:var(--paper);color:var(--ink)}
  .cta.alt:hover{box-shadow:3px 3px 0 var(--ink)}

  /* Foot */
  .foot{
    margin-top:48px;padding-top:24px;border-top:1px solid var(--rule);
    display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;
    font-family:var(--mono);font-size:11.5px;color:var(--ink-3);letter-spacing:.04em;
  }
  .foot em{
    font-family:var(--serif);font-style:italic;font-size:16px;color:var(--ink-2);
    letter-spacing:0;
  }
  .foot a{color:var(--ink);text-decoration:none;border-bottom:1px solid var(--ink-3)}

  .toast{
    position:fixed;left:50%;top:24px;transform:translateX(-50%) translateY(-40px);
    padding:10px 16px;background:var(--ink);color:var(--paper);
    border-radius:8px;font-family:var(--mono);font-size:12px;font-weight:600;
    letter-spacing:.04em;opacity:0;pointer-events:none;
    transition:transform .22s,opacity .22s;z-index:50;
  }
  .toast.on{opacity:1;transform:translateX(-50%) translateY(0)}
</style>
</head>
<body
  data-share-url="${safeUrl}"
  data-share-image="${safeCard}"
  data-share-caption="${escapeHtml(caption)}"
  data-share-caption-long="${escapeHtml(captionLong)}"
>
  <main class="wrap">
    <div class="top">
      <a class="brand" href="/">
        <span class="dot"></span><span>STUDORA</span><span class="slash">/ SCORECARD</span>
      </a>
      <div class="crumb"><a href="/">home</a> · <a href="/exams">exams</a> · result</div>
    </div>

    <header class="head">
      <span class="pill"><span class="swatch"></span>${safeExam} · ${score}%</span>
      <h1>${safeName ? `${safeName} scored ` : 'Scored '}<mark>${score}%</mark> <em>on ${safeExam}.</em></h1>
      <p class="sub">${escapeHtml(verd)} ${correct} of ${total} questions right${wrong ? `, ${wrong} missed` : ''}. <em>Built for Pakistan's toughest exams.</em></p>
    </header>

    <div class="hero">
      <figure class="preview">
        <img src="${safeCard}" width="1200" height="630" alt="Studora scorecard — ${safeTitle}" loading="lazy" id="og-img">
        <figcaption class="footnote">
          <span><em>1200×630</em> · auto-generated</span>
          <a href="${safeCard}" download="studora-scorecard-${score}.png" id="dl-direct">download image →</a>
        </figcaption>
      </figure>

      <aside class="ctrl">
        <h2>Share your <em>scorecard</em></h2>

        <div class="urlbox" role="group" aria-label="Shareable link">
          <input type="text" readonly value="${safeUrl}" aria-label="Share URL" id="url-input">
          <button type="button" id="copy-url">Copy</button>
        </div>

        <div class="channels">
          <a class="ch wa" href="${escapeHtml(waUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5A11 11 0 0 0 3.6 17.3L2 22l4.9-1.5A11 11 0 1 0 20.5 3.5Zm-8.5 17a8.8 8.8 0 0 1-4.5-1.2l-.3-.2-3 .9.9-2.9-.2-.3A8.8 8.8 0 1 1 12 20.5Zm5.1-6.6c-.3-.1-1.7-.8-1.9-.9s-.4-.2-.6.2-.7.9-.9 1.1-.3.2-.6.1a7.2 7.2 0 0 1-3.6-3.1c-.3-.5.3-.4.8-1.4a.5.5 0 0 0 0-.5l-.9-2.1c-.2-.6-.5-.5-.6-.5h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4 5.4 5.4 0 0 0 3 .6 2.5 2.5 0 0 0 1.6-1.1 2 2 0 0 0 .1-1.1c-.1-.1-.2-.2-.5-.3Z"/></svg>
            WhatsApp
          </a>
          <a class="ch x" href="${escapeHtml(xUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Share on X">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117Z"/></svg>
            X
          </a>
          <a class="ch li" href="${escapeHtml(liUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14ZM8.34 18.34V10.6H5.67v7.74h2.67ZM7 9.42a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1Zm11.34 8.92v-4.23c0-2.27-1.21-3.33-2.83-3.33a2.44 2.44 0 0 0-2.22 1.22V10.6h-2.66c.04.75 0 7.74 0 7.74h2.66v-4.33c0-.24.02-.48.09-.65a1.46 1.46 0 0 1 1.37-.98c.97 0 1.36.74 1.36 1.82v4.14h2.23Z"/></svg>
            LinkedIn
          </a>
          <a class="ch fb" href="${escapeHtml(fbUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.4 21v-7.7h2.6l.4-3H13.4V8.4c0-.87.24-1.46 1.49-1.46H16.5V4.25A21 21 0 0 0 14.18 4c-2.3 0-3.86 1.4-3.86 4v2.3H7.7v3h2.62V21h3.08Z"/></svg>
            Facebook
          </a>
          <a class="ch tg" href="${escapeHtml(tgUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Share on Telegram">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.85 4.4 18.5 20.1c-.25 1.12-.92 1.4-1.86.87l-5.15-3.8-2.49 2.4c-.27.27-.5.5-1.03.5l.37-5.23 9.55-8.62c.41-.37-.09-.57-.64-.2L5.43 13.46.94 12.04c-.98-.31-1-.98.2-1.45L20.55 3.07c.81-.31 1.52.18 1.3 1.33Z"/></svg>
            Telegram
          </a>
          <a class="ch rd" href="${escapeHtml(rdUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Share on Reddit">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12.1a2.1 2.1 0 0 0-3.6-1.5 10.4 10.4 0 0 0-5.6-1.8l1-4.6 3.2.7a1.5 1.5 0 1 0 .2-1l-3.6-.8c-.2 0-.4.1-.4.3l-1.1 5.4a10.5 10.5 0 0 0-5.7 1.8 2.1 2.1 0 1 0-2.3 3.4 4.4 4.4 0 0 0-.1.8c0 4 4.5 7.3 10 7.3s10-3.3 10-7.3a4.4 4.4 0 0 0-.1-.8 2.1 2.1 0 0 0 .1-3.9Zm-15 2.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm8.4 3.5a5.4 5.4 0 0 1-6.9 0 .5.5 0 0 1 .7-.7 4.5 4.5 0 0 0 5.6 0 .5.5 0 0 1 .7.7Zm-.6-2a1.5 1.5 0 1 1 1.5-1.5 1.5 1.5 0 0 1-1.5 1.5Z"/></svg>
            Reddit
          </a>
          <a class="ch mail" href="${escapeHtml(mailto)}" aria-label="Share by email">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
            Email
          </a>
          <button type="button" class="ch native" id="native-share" style="display:none" aria-label="Open device share sheet">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg>
            Share sheet
          </button>
        </div>

        <div class="util">
          <a href="${safeCard}" download="studora-scorecard-${score}.png" id="dl-png">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
            Download PNG
          </a>
          <button type="button" id="copy-caption">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
            Copy caption
          </button>
        </div>

        <div class="caption-card">
          <span class="label">Caption — perfect for Instagram & status posts</span>
          ${escapeHtml(caption)}
        </div>
      </aside>
    </div>

    <div class="stats">
      <div class="stat accent"><span class="v">${score}%</span><span class="l">Accuracy</span></div>
      <div class="stat green"><span class="v">${correct}</span><span class="l">Correct</span></div>
      <div class="stat red"><span class="v">${wrong}</span><span class="l">Missed</span></div>
      <div class="stat"><span class="v">${total}</span><span class="l">Questions</span></div>
    </div>

    <div class="cta-row">
      <a class="cta" href="${safeExamSlug ? `/exam/${safeExamSlug}` : '/quiz'}">Take this quiz →</a>
      <a class="cta alt" href="/subjects">Browse subjects</a>
      <a class="cta alt" href="/exams">All exam tracks</a>
    </div>

    <p class="foot">
      <em>Study quietly. Score loudly.</em>
      <span>Made in Pakistan · <a href="https://studora.vercel.app">studora.vercel.app</a></span>
    </p>
  </main>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <script src="/assets/js/pages/result-page.js" defer></script>
</body>
</html>`;
}

async function handleHtml(req, url) {
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
  const userPath = url.pathname.startsWith('/api/share-card')
    ? `/results?${new URLSearchParams({
        score: String(score), total: String(total), correct: String(correct),
        ...(slug ? { exam: slug } : {}),
        ...(name ? { name } : {}),
      }).toString()}`
    : `${url.pathname}${url.search}`;
  const pageUrl = `${origin}${userPath}`;

  // Verdict + score combine into a single, share-friendly headline that reads
  // well in chat previews (the first ~80 chars of the OG description is what
  // most clients render).
  const headline = score >= 80 ? 'Sharp result on Studora'
    : score >= 60 ? 'Strong run on Studora'
    : 'Practising on Studora';
  const title = `${headline} — ${score}% on ${exam}`;
  const desc  = name
    ? `${name} got ${correct} of ${total} right on ${exam}. Try the same quiz on Studora and see how you stack up.`
    : `${correct} of ${total} right on ${exam}. Try the same quiz on Studora and see how you stack up.`;

  const body = renderHtml({
    title, desc, pageUrl, cardUrl,
    score, total, correct, exam, name, examSlug: slug,
  });

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
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
