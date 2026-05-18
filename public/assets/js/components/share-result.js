// Shareable result panel — renders the end-of-session "Share your scorecard"
// block. Polished UI matches the site's notebook aesthetic; every major social
// surface gets a dedicated button (WhatsApp, X, LinkedIn, Facebook, Telegram,
// Reddit, Email), with a native share sheet on mobile that can attach the PNG
// itself for Instagram/Snap/AirDrop. Also exposes:
//   - Copy link  → /results?...
//   - Copy caption → punchy text you paste anywhere (perfect for Instagram)
//   - Download PNG → saves the 1200×630 scorecard locally
//   - "See full page" → opens the dedicated /results landing page in a new tab,
//                       which is where the share-card image lives + OG meta.
import { esc } from '../core/helpers.js?v=1779087891';
import { toast } from '../core/toast.js?v=1779087891';

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

function buildShareUrl({ score, total, correct, exam, name }) {
  const params = new URLSearchParams();
  params.set('score',   String(score));
  params.set('total',   String(total));
  params.set('correct', String(correct));
  params.set('exam', exam || 'mixed');
  if (name) params.set('name', name);
  const origin = (typeof window !== 'undefined' && window.location)
    ? window.location.origin
    : 'https://studora.vercel.app';
  return `${origin}/results?${params.toString()}`;
}

function buildCardImageUrl({ score, total, correct, exam, name }) {
  const params = new URLSearchParams();
  params.set('score',   String(score));
  params.set('total',   String(total));
  params.set('correct', String(correct));
  params.set('exam', exam || 'mixed');
  if (name) params.set('name', name);
  const origin = (typeof window !== 'undefined' && window.location)
    ? window.location.origin
    : 'https://studora.vercel.app';
  return `${origin}/api/share-card?${params.toString()}`;
}

// Verdict copy — must match the server-side PNG so the caption and the image
// read like a single voice.
function verdictFor(score) {
  if (score === 100) return 'A flawless run.';
  if (score >= 90)   return 'Exam-day energy.';
  if (score >= 80)   return 'Sharp. Very sharp.';
  if (score >= 70)   return 'Solid work.';
  if (score >= 60)   return 'On the right track.';
  if (score >= 50)   return 'Halfway there.';
  if (score >= 30)   return 'Worth another round.';
  return 'Every rep counts.';
}

function captionFor({ score, total, correct, examLabel, name }) {
  const verd = verdictFor(score);
  const who = name ? `${name} ` : '';
  return `${verd} ${who}scored ${score}% on ${examLabel} on Studora (${correct}/${total}).`;
}

function examLabelFor(exam) {
  if (!exam || exam === 'mixed') return 'a Studora quiz';
  const upper = exam.toUpperCase();
  // Known exam slugs render in all-caps; subject-style slugs (multiple words)
  // get title-cased instead.
  if (/^[A-Z]{2,6}$/.test(upper.replace(/[-_]/g, ''))) return upper.replace(/[-_]/g, ' ');
  return exam.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Render the share panel into a host element.
// payload = { score, total, correct, exam, name? }
export function renderShareResult(host, payload) {
  if (!host) return;
  const score   = clamp(payload?.score,   0, 100);
  const total   = clamp(payload?.total,   1, 500);
  const correct = clamp(payload?.correct, 0, total);
  const wrong   = Math.max(0, total - correct);
  const exam    = sanitiseExam(payload?.exam);
  const name    = sanitiseName(payload?.name);

  const url      = buildShareUrl({ score, total, correct, exam, name });
  const imageUrl = buildCardImageUrl({ score, total, correct, exam, name });
  const examLabel = examLabelFor(exam);
  const caption  = captionFor({ score, total, correct, examLabel, name });
  const captionLong = `${caption}\n\n${url}\n\nQuiet UI, no paywall for the basics — built for Pakistan's toughest exams.`;
  const verd     = verdictFor(score);
  const accent   = score >= 80 ? 'green' : score >= 60 ? 'amber' : score >= 40 ? 'ochre' : 'red';

  const supportsNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const enc  = encodeURIComponent;
  const waUrl = `https://wa.me/?text=${enc(`${caption}\n\n${url}`)}`;
  const xUrl  = `https://twitter.com/intent/tweet?text=${enc(caption)}&url=${enc(url)}&hashtags=Studora`;
  const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}&quote=${enc(caption)}`;
  const tgUrl = `https://t.me/share/url?url=${enc(url)}&text=${enc(caption)}`;
  const mailto = `mailto:?subject=${enc(`My Studora scorecard — ${score}% on ${examLabel}`)}&body=${enc(captionLong)}`;

  const section = document.createElement('section');
  section.className = 'nb-share';
  section.innerHTML = `
    <div class="nb-share-card nb-share-v2 nb-share-${accent}">
      <header class="nb-share-head">
        <span class="nb-share-tag"><span class="nb-share-dot"></span>SCORECARD · ${score}%</span>
        <h3>${esc(verd)} <em>Share it.</em></h3>
        <p class="nb-share-sub">
          A premium 1200×630 image is generated on the fly — it unfurls beautifully on
          <em>WhatsApp status, LinkedIn posts, X, Facebook</em> and looks great as an Instagram screenshot.
        </p>
      </header>

      <div class="nb-share-hero">
        <figure class="nb-share-preview">
          <img src="${esc(imageUrl)}" alt="Studora scorecard — ${score}% on ${esc(examLabel)}"
               width="1200" height="630" loading="lazy" decoding="async">
          <figcaption>
            <span>1200×630 · auto-generated</span>
            <a href="${esc(imageUrl)}" download="studora-scorecard-${score}.png" data-act="dl-direct">download →</a>
          </figcaption>
        </figure>

        <div class="nb-share-side">
          <div class="nb-share-statgrid">
            <div class="ss"><b class="${score >= 80 ? 'g' : score >= 60 ? 'a' : 'r'}">${score}%</b><em>accuracy</em></div>
            <div class="ss"><b class="g">${correct}</b><em>correct</em></div>
            <div class="ss"><b class="${wrong ? 'r' : 'g'}">${wrong}</b><em>missed</em></div>
            <div class="ss"><b>${total}</b><em>total</em></div>
          </div>

          <div class="nb-share-url" role="group" aria-label="Shareable link">
            <input class="nb-share-input" type="text" readonly value="${esc(url)}" aria-label="Share URL" data-role="url-input">
            <button type="button" class="nb-share-copy" data-act="copy">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>
              </svg>
              <span>Copy link</span>
            </button>
          </div>
        </div>
      </div>

      <div class="nb-share-channels" role="group" aria-label="Share to">
        ${supportsNative ? `
          <button type="button" class="nb-ch nb-ch-native" data-act="native" aria-label="Open device share sheet">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg>
            <span>Share sheet</span>
          </button>
        ` : ''}
        <a class="nb-ch nb-ch-wa" href="${esc(waUrl)}" target="_blank" rel="noopener noreferrer" data-act="wa" aria-label="Share on WhatsApp">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5A11 11 0 0 0 3.6 17.3L2 22l4.9-1.5A11 11 0 1 0 20.5 3.5Zm-8.5 17a8.8 8.8 0 0 1-4.5-1.2l-.3-.2-3 .9.9-2.9-.2-.3A8.8 8.8 0 1 1 12 20.5Zm5.1-6.6c-.3-.1-1.7-.8-1.9-.9s-.4-.2-.6.2-.7.9-.9 1.1-.3.2-.6.1a7.2 7.2 0 0 1-3.6-3.1c-.3-.5.3-.4.8-1.4a.5.5 0 0 0 0-.5l-.9-2.1c-.2-.6-.5-.5-.6-.5h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4 5.4 5.4 0 0 0 3 .6 2.5 2.5 0 0 0 1.6-1.1 2 2 0 0 0 .1-1.1c-.1-.1-.2-.2-.5-.3Z"/></svg>
          <span>WhatsApp</span>
        </a>
        <a class="nb-ch nb-ch-x" href="${esc(xUrl)}" target="_blank" rel="noopener noreferrer" data-act="x" aria-label="Share on X">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117Z"/></svg>
          <span>X</span>
        </a>
        <a class="nb-ch nb-ch-li" href="${esc(liUrl)}" target="_blank" rel="noopener noreferrer" data-act="li" aria-label="Share on LinkedIn">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14ZM8.34 18.34V10.6H5.67v7.74h2.67ZM7 9.42a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1Zm11.34 8.92v-4.23c0-2.27-1.21-3.33-2.83-3.33a2.44 2.44 0 0 0-2.22 1.22V10.6h-2.66c.04.75 0 7.74 0 7.74h2.66v-4.33c0-.24.02-.48.09-.65a1.46 1.46 0 0 1 1.37-.98c.97 0 1.36.74 1.36 1.82v4.14h2.23Z"/></svg>
          <span>LinkedIn</span>
        </a>
        <a class="nb-ch nb-ch-fb" href="${esc(fbUrl)}" target="_blank" rel="noopener noreferrer" data-act="fb" aria-label="Share on Facebook">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.4 21v-7.7h2.6l.4-3H13.4V8.4c0-.87.24-1.46 1.49-1.46H16.5V4.25A21 21 0 0 0 14.18 4c-2.3 0-3.86 1.4-3.86 4v2.3H7.7v3h2.62V21h3.08Z"/></svg>
          <span>Facebook</span>
        </a>
        <a class="nb-ch nb-ch-tg" href="${esc(tgUrl)}" target="_blank" rel="noopener noreferrer" data-act="tg" aria-label="Share on Telegram">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.85 4.4 18.5 20.1c-.25 1.12-.92 1.4-1.86.87l-5.15-3.8-2.49 2.4c-.27.27-.5.5-1.03.5l.37-5.23 9.55-8.62c.41-.37-.09-.57-.64-.2L5.43 13.46.94 12.04c-.98-.31-1-.98.2-1.45L20.55 3.07c.81-.31 1.52.18 1.3 1.33Z"/></svg>
          <span>Telegram</span>
        </a>
        <a class="nb-ch nb-ch-mail" href="${esc(mailto)}" data-act="mail" aria-label="Share by email">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
          <span>Email</span>
        </a>
      </div>

      <div class="nb-share-util">
        <a class="nb-share-util-btn" href="${esc(imageUrl)}" download="studora-scorecard-${score}.png" data-act="dl">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
          <span>Download PNG</span>
        </a>
        <button type="button" class="nb-share-util-btn" data-act="copy-caption">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
          <span>Copy caption</span>
        </button>
        <a class="nb-share-util-btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-act="open">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3h7v7"/><path d="m21 3-9 9"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>
          <span>Open share page</span>
        </a>
      </div>

      <div class="nb-share-caption">
        <span class="nb-share-caption-label">Caption — drop this in Insta, status, anywhere</span>
        <p>${esc(caption)}</p>
      </div>

      <p class="nb-share-foot">
        The link is yours — anyone who clicks it sees the same scorecard and can start their own quiz.
      </p>
    </div>
  `;

  // ---- handlers ----
  const $ = (sel) => section.querySelector(sel);

  $('[data-act="copy"]').addEventListener('click', async () => {
    const ok = await copyToClipboard(url);
    toast(ok ? 'Link copied' : "Couldn't copy — long-press the field", ok ? '' : 'warn');
  });

  $('[data-role="url-input"]').addEventListener('click', (ev) => ev.target.select());

  $('[data-act="copy-caption"]').addEventListener('click', async () => {
    const ok = await copyToClipboard(captionLong);
    toast(ok ? 'Caption copied — paste anywhere' : "Couldn't copy caption", ok ? '' : 'warn');
  });

  const nativeBtn = $('[data-act="native"]');
  if (nativeBtn) {
    nativeBtn.addEventListener('click', async () => {
      try {
        const data = { title: 'My Studora scorecard', text: caption, url };
        // Try to also share the PNG itself so the user can pick Insta, Snap,
        // AirDrop. canShare() with a File is the spec gate.
        try {
          const res = await fetch(imageUrl);
          if (res.ok) {
            const blob = await res.blob();
            const file = new File([blob], 'studora-scorecard.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              data.files = [file];
            }
          }
        } catch { /* fall back to URL share */ }
        await navigator.share(data);
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        const ok = await copyToClipboard(url);
        toast(ok ? 'Link copied instead' : 'Sharing not available', ok ? '' : 'warn');
      }
    });
  }

  // Force the PNG to download as a Blob (otherwise some browsers ignore the
  // download attribute and open the image in a new tab when the URL is treated
  // as "same-origin but with query string").
  section.querySelectorAll('[data-act="dl"], [data-act="dl-direct"]').forEach((a) => {
    a.addEventListener('click', async (ev) => {
      ev.preventDefault();
      try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        const tmp = document.createElement('a');
        tmp.href = objUrl;
        tmp.download = a.getAttribute('download') || 'studora-scorecard.png';
        document.body.appendChild(tmp);
        tmp.click();
        document.body.removeChild(tmp);
        setTimeout(() => URL.revokeObjectURL(objUrl), 4000);
        toast('Image saved');
      } catch {
        window.open(imageUrl, '_blank');
      }
    });
  });

  host.appendChild(section);
  return section;
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
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
