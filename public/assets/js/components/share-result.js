// Shareable result card — renders a "Share your result" panel that pages can
// drop in at the end of a quiz / exam session. The panel offers three exits:
//   - Copy link: lifts /results?... onto the clipboard.
//   - WhatsApp:  opens wa.me with a pre-filled blurb.
//   - X / Twitter: opens twitter.com/intent/tweet with the same blurb.
//
// On mobile (where navigator.share is available), each button collapses into
// the OS share sheet — the URL scheme buttons are kept as a fallback for desks
// and browsers that don't expose Web Share API.
//
// The shared URL is a Studora /results page that the api/results-page.js
// endpoint turns into an HTML page with OG meta pointing at the deterministic
// share-card image. This means every share unfurls into a 1200x630 PNG in
// WhatsApp, iMessage, Slack, Twitter, LinkedIn, etc.
import { esc } from '../core/helpers.js?v=1778642504';
import { toast } from '../core/toast.js?v=1778642504';

// Build the canonical /results URL for a given session payload. Inputs are
// clamped here too because callers are user-supplied data.
function buildShareUrl({ score, total, correct, exam, name }) {
  const params = new URLSearchParams();
  params.set('score',   String(clamp(score,   0, 100)));
  params.set('total',   String(clamp(total,   1, 500)));
  params.set('correct', String(clamp(correct, 0, 500)));
  const cleanExam = sanitiseExam(exam);
  params.set('exam', cleanExam || 'mixed');
  if (name) {
    const cleanName = sanitiseName(name);
    if (cleanName) params.set('name', cleanName);
  }
  const origin = (typeof window !== 'undefined' && window.location)
    ? window.location.origin
    : 'https://studora.vercel.app';
  return `${origin}/results?${params.toString()}`;
}

function clamp(value, lo, hi) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function sanitiseExam(slug) {
  return String(slug || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
}

function sanitiseName(raw) {
  return String(raw || '').trim().slice(0, 24).replace(/[^\p{L}\p{N} .\-_'’]/gu, '').trim();
}

function shareBlurb({ score, total, correct, exam }) {
  const examLabel = exam && exam !== 'mixed'
    ? exam.toUpperCase().replace(/[-_]+/g, ' ')
    : 'a Studora quiz';
  return `Scored ${score}% on ${examLabel} (${correct}/${total}) over at Studora — quiet UI, no paywall for the basics.`;
}

// Render the share panel into a host element.
// payload = { score, total, correct, exam, name? }
export function renderShareResult(host, payload) {
  if (!host) return;
  const score   = clamp(payload?.score,   0, 100);
  const total   = clamp(payload?.total,   1, 500);
  const correct = clamp(payload?.correct, 0, total);
  const exam    = sanitiseExam(payload?.exam);
  const name    = sanitiseName(payload?.name);

  const url = buildShareUrl({ score, total, correct, exam, name });
  const blurb = shareBlurb({ score, total, correct, exam });

  const supportsNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const wa = `https://wa.me/?text=${encodeURIComponent(`${blurb} ${url}`)}`;
  const tw = `https://twitter.com/intent/tweet?text=${encodeURIComponent(blurb)}&url=${encodeURIComponent(url)}`;

  const section = document.createElement('section');
  section.className = 'nb-share';
  section.innerHTML = `
    <div class="nb-share-card">
      <span class="nb-share-tag">Share your scorecard</span>
      <h3>Show it off, <em>quietly.</em></h3>
      <p class="nb-share-sub">A 1200×630 image is generated on the fly — it unfurls beautifully on WhatsApp, X and LinkedIn.</p>

      <div class="nb-share-url" role="group" aria-label="Shareable link">
        <input class="nb-share-input" type="text" readonly value="${esc(url)}" aria-label="Share URL">
        <button type="button" class="nb-share-copy" data-act="copy">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>
          </svg>
          <span>Copy link</span>
        </button>
      </div>

      <div class="nb-share-row">
        ${supportsNative ? `
          <button type="button" class="nb-share-btn primary" data-act="native">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/>
            </svg>
            <span>Share</span>
          </button>
        ` : ''}
        <a class="nb-share-btn wa" href="${esc(wa)}" target="_blank" rel="noopener noreferrer" data-act="wa">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.5 3.5A11 11 0 0 0 3.6 17.3L2 22l4.9-1.5A11 11 0 1 0 20.5 3.5Zm-8.5 17a8.8 8.8 0 0 1-4.5-1.2l-.3-.2-3 .9.9-2.9-.2-.3A8.8 8.8 0 1 1 12 20.5Zm5.1-6.6c-.3-.1-1.7-.8-1.9-.9s-.4-.2-.6.2-.7.9-.9 1.1-.3.2-.6.1a7.2 7.2 0 0 1-3.6-3.1c-.3-.5.3-.4.8-1.4a.5.5 0 0 0 0-.5l-.9-2.1c-.2-.6-.5-.5-.6-.5h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4 5.4 5.4 0 0 0 3 .6 2.5 2.5 0 0 0 1.6-1.1 2 2 0 0 0 .1-1.1c-.1-.1-.2-.2-.5-.3Z"/>
          </svg>
          <span>WhatsApp</span>
        </a>
        <a class="nb-share-btn tw" href="${esc(tw)}" target="_blank" rel="noopener noreferrer" data-act="tw">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117Z"/>
          </svg>
          <span>X</span>
        </a>
      </div>

      <p class="nb-share-foot">The link is yours — anyone who clicks it sees the same image and can start their own quiz.</p>
    </div>
  `;

  // Wire up handlers.
  const copyBtn = section.querySelector('[data-act="copy"]');
  copyBtn?.addEventListener('click', async () => {
    const ok = await copyToClipboard(url);
    toast(ok ? 'Link copied' : 'Couldn\'t copy — long-press to copy manually', ok ? '' : 'warn');
  });

  const nativeBtn = section.querySelector('[data-act="native"]');
  nativeBtn?.addEventListener('click', async () => {
    try {
      await navigator.share({
        title: 'My Studora scorecard',
        text:  blurb,
        url,
      });
    } catch (err) {
      // AbortError fires when the user cancels — that's not a failure.
      if (err && err.name === 'AbortError') return;
      const ok = await copyToClipboard(url);
      toast(ok ? 'Link copied instead' : 'Sharing not available', ok ? '' : 'warn');
    }
  });

  // The WhatsApp and X anchors are real <a> tags so middle-click / right-click
  // both work — no JS interception needed.

  host.appendChild(section);
  return section;
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
