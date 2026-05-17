// Edge function that renders a 1200x630 PNG share card for a finished Studora
// session. The URL is fully deterministic in its query string, so the response
// can be cached aggressively at the CDN edge and inside chat clients.
//
// Brand fidelity: same palette + visual rhythm as /public/assets/img/og-cover.svg
// (paper background, faint horizontal rules, red margin line, ink chip with
// yellow STUDORA wordmark, large serif headline, mono URL in the corner).
//
// The Edge runtime does not bundle the Fraunces / Inter font files, so we lean
// on the runtime's serif / sans-serif fallbacks. The hierarchy and palette
// carry the brand even without the exact typefaces.

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

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

// Tiny createElement-style helper. Satori accepts plain JSX-shaped vnodes
// ({ type, props: { children, style, ... } }), so we don't need a JSX runtime.
function h(type, props, ...children) {
  const flat = children.flat().filter(c => c !== null && c !== undefined && c !== false);
  return {
    type,
    props: { ...(props || {}), children: flat.length <= 1 ? flat[0] : flat },
  };
}

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

export default async function handler(req) {
  const { searchParams } = new URL(req.url);

  const score   = clampInt(searchParams.get('score'),   0, 100);
  const total   = clampInt(searchParams.get('total'),   1, 500);
  const correct = clampInt(searchParams.get('correct'), 0, 500);
  const exam    = examLabel(searchParams.get('exam'));
  const name    = cleanName(searchParams.get('name'));

  if (score === null || total === null || correct === null || correct > total) {
    return new Response('Invalid query', { status: 400 });
  }

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
