// Server-rendered landing page for shared Studora results. The URL the visitor
// passes around (e.g. /results?score=78&total=20&correct=15&exam=css) is
// rewritten to this endpoint via vercel.json. It returns a clean HTML page with
// proper Open Graph + Twitter Card meta so chat clients unfurl a rich preview
// pointing at /api/share-card, and a simple human-friendly card so the page
// itself is worth visiting too.
//
// Inputs are validated strictly — anything off-spec gets a graceful redirect to
// the homepage rather than an error page, so a corrupted share URL never leaves
// the visitor stuck on a 400.

import { createHash } from 'node:crypto';

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
const SHARE_SECRET = process.env.SHARE_TOKEN_SECRET
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

function shareToken({ score, total, correct, exam, name }) {
  // Deterministic 12-char token over the canonical key. The token doesn't
  // protect the score itself — it just lets the share-card endpoint optionally
  // refuse traffic that didn't come through this landing page in the future.
  const key = `${score}|${total}|${correct}|${exam}|${name || ''}`;
  return createHash('sha256').update(`${SHARE_SECRET}:${key}`).digest('hex').slice(0, 12);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildOrigin(req) {
  // Vercel sets x-forwarded-host / x-forwarded-proto. Fall back to host header
  // for local dev. The OG image URL must be absolute or chat clients ignore it.
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host  = (req.headers['x-forwarded-host'] || req.headers['host'] || 'studora.vercel.app').split(',')[0].trim();
  return `${proto}://${host}`;
}

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).send('Method not allowed');
    return;
  }

  // req.query is provided by Vercel's Node runtime.
  const q = req.query || {};
  const score   = clampInt(q.score,   0, 100);
  const total   = clampInt(q.total,   1, 500);
  const correct = clampInt(q.correct, 0, 500);

  if (score === null || total === null || correct === null || correct > total) {
    // Invalid share — bounce them to the homepage with a soft 302 rather than
    // showing a hostile error page.
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 302;
    res.setHeader('Location', '/');
    res.end();
    return;
  }

  const exam = examLabel(q.exam);
  const name = cleanName(q.name);
  const examSlug = String(q.exam || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);

  const origin = buildOrigin(req);
  const token  = shareToken({ score, total, correct, exam: examSlug, name });

  const cardParams = new URLSearchParams({
    score:   String(score),
    total:   String(total),
    correct: String(correct),
    exam:    examSlug || 'mixed',
    token,
  });
  if (name) cardParams.set('name', name);

  const cardUrl = `${origin}/api/share-card?${cardParams.toString()}`;
  const pageUrl = `${origin}${req.url}`;

  const title   = `Scored ${score}% on ${exam} — Studora`;
  const desc    = name
    ? `${name} got ${correct} of ${total} questions right on Studora. Try the same quiz and see how you stack up.`
    : `${correct} of ${total} questions right on Studora. Try the same quiz and see how you stack up.`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Short cache — same query always returns the same HTML, but we want updates
  // to the page chrome (footer, etc) to propagate quickly. The expensive bit
  // (the PNG) is cached for a year by the share-card endpoint itself.
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('X-Robots-Tag', 'noindex'); // share pages shouldn't dilute search results

  res.status(200).send(renderHtml({
    title, desc, pageUrl, cardUrl,
    score, total, correct, exam, name,
  }));
}

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
