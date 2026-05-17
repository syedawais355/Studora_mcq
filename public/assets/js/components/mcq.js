// MCQ card — render + interactivity (test-mode picks, bookmarks, streak,
// margin notes). Streak/solved/bookmarks all flow through state.js so they
// persist via localStorage automatically.
import { esc } from '../core/helpers.js?v=1778642504';
import { icon } from '../core/icons.js?v=1778642504';
import { state, recordCorrect, recordWrong, toggleBookmark, recordMistake, clearMistake, recordAttempt } from '../core/state.js?v=1778642504';
import { confetti } from '../core/confetti.js?v=1778642504';
import { toast } from '../core/toast.js?v=1778642504';
import { openReportModal } from './report-modal.js?v=1778642504';

// `subjectLabel` is the human-readable subject shown after "Q 001 ·" in the
// card header. Pass an empty string (or omit) to hide it — e.g. on the
// category page where the whole page is already a single subject. The exam
// page passes the active tab's subject so each card reads correctly.
export function mcqItem(q, idx, testMode, subjectLabel = '') {
  const letters = ['A', 'B', 'C', 'D'];
  const opts = [q.option_a || q.a || '', q.option_b || q.b || '', q.option_c || q.c || '', q.option_d || q.d || ''];
  const correct = (q.correct_key || q.correct || '').toUpperCase();
  const wrapClass = 'nb-mcq' + (testMode ? ' test' : '');
  const label = String(subjectLabel || q.category_title || q.subject || '').trim();
  const qid = q.id || idx;
  const bookmarked = state.bookmarks.includes(qid);

  const header = label
    ? `Q ${String(idx).padStart(3, '0')} · ${esc(label.toLowerCase())}`
    : `Q ${String(idx).padStart(3, '0')}`;

  // data-cat-id powers topic-mastery accuracy (#57). It's the numeric subject
  // ID so the rolling-window counter in state.topicProgress can be keyed
  // without re-resolving slug → id at attempt time.
  const catId = q.category_id != null ? q.category_id : '';
  return `<article class="${wrapClass}" data-correct="${esc(correct)}" data-id="${esc(qid)}" data-cat-id="${esc(catId)}" data-topic="${esc(q.category_slug || q.category_title || '')}">
    <div class="qn">${header}</div>
    <h3 class="qtx">${esc(q.text || q.question_text || '')}</h3>
    <ul class="opts">
      ${opts.map((o, i) => {
        const k = letters[i];
        const isCorrect = k === correct;
        const liClass = !testMode && isCorrect ? 'correct' : '';
        return `<li data-k="${k}" class="${liClass}"><button type="button" class="opt" data-k="${k}" aria-pressed="false"><span class="k">${k}</span><span class="txt">${esc(o)}</span></button></li>`;
      }).join('')}
    </ul>
    <div class="tools">
      <button class="bk ${bookmarked ? 'on' : ''}" type="button" aria-label="Bookmark this question">${icon('bookmark')}<span>${bookmarked ? 'saved' : 'bookmark'}</span></button>
      <button class="sh" type="button" aria-label="Share this question">${icon('share')}<span>share</span></button>
      <button class="rp" type="button" aria-label="Report this question">${icon('flag2')}<span>report</span></button>
      <span class="streak">streak · <b>${state.streak}</b></span>
    </div>
  </article>`;
}

async function shareQuestion(card) {
  const qid = parseInt(card?.dataset.id, 10);
  if (!qid) return;
  const text = card.querySelector('.qtx')?.textContent?.trim() || '';
  // Permalink to the specific MCQ — clean, professional, deep-linkable.
  const url = `${location.origin}/q/${qid}`;
  const sharePayload = {
    title: 'Studora MCQ',
    text: text.length > 200 ? text.slice(0, 197) + '…' : text,
    url,
  };
  try {
    if (navigator.share && (!navigator.canShare || navigator.canShare(sharePayload))) {
      await navigator.share(sharePayload);
      return;
    }
  } catch (err) {
    if (err?.name === 'AbortError') return; // user dismissed sheet — silent
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copied to clipboard.', 'ok');
  } catch {
    toast('Copy failed — long-press the address bar to share.', 'err');
  }
}

// `root` lets a caller scope the wiring to a freshly-rendered list (e.g.
// the mistakes / bookmarks filter) so we don't re-walk every card in the
// document on every keystroke. Defaults to `document` so existing call
// sites keep working unchanged.
export function wireMcqCards(root = document) {
  root.querySelectorAll('.nb-mcq.test').forEach((card) => {
    if (card.dataset.wired) return;
    card.dataset.wired = '1';
    const correct = card.dataset.correct;
    card.querySelectorAll('.opts button').forEach((btn) => {
      btn.addEventListener('click', () => onPick(card, btn, correct));
    });
  });
  root.querySelectorAll('.nb-mcq .bk').forEach((btn) => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.nb-mcq');
      const qid = parseInt(card?.dataset.id, 10);
      if (!qid) return;
      const isOn = toggleBookmark(qid);
      btn.classList.toggle('on', isOn);
      const label = btn.querySelector('span:not([class])') || btn.querySelector('span:last-of-type');
      if (label) label.textContent = isOn ? 'saved' : 'bookmark';
    });
  });
  root.querySelectorAll('.nb-mcq .sh').forEach((btn) => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      shareQuestion(btn.closest('.nb-mcq'));
    });
  });
  root.querySelectorAll('.nb-mcq .rp').forEach((btn) => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.nb-mcq');
      const qid = parseInt(card?.dataset.id, 10);
      if (!qid) return;
      const questionText = card.querySelector('.qtx')?.textContent || '';
      openReportModal({ questionId: qid, questionText });
    });
  });
}

function onPick(card, btn, correct) {
  if (card.classList.contains('answered')) return;
  const k = btn.dataset.k;
  // Apply visual state on both the <li> (existing styles) and the <button>
  // (where aria-pressed lives) so assistive tech and sighted users agree.
  const li = btn.closest('li');
  if (li) li.classList.add('picked');
  btn.classList.add('picked');
  btn.setAttribute('aria-pressed', 'true');
  card.classList.add('answered');

  const qid = parseInt(card.dataset.id, 10);

  // Topic mastery (#57): the rolling per-subject accuracy counter is keyed by
  // category_id. Prefer the value baked into the card; fall back to the
  // active category-page subject so flows that don't carry per-question
  // category_id (server omitted, single-subject page) still get tracked.
  const cardCatId = parseInt(card.dataset.catId, 10);
  const catId = Number.isInteger(cardCatId) && cardCatId > 0
    ? cardCatId
    : (state.currentCat?.category_id || 0);

  if (k === correct) {
    if (li) li.classList.add('correct');
    btn.classList.add('correct');
    recordCorrect();
    if (catId) recordAttempt(qid, catId, true); // additive — feeds topic-mastery label
    if (qid) clearMistake(qid); // resolved → drop from Mistake Book
    state.wrongTopic = { topic: null, count: 0, dismissed: state.wrongTopic.dismissed };
    bumpStreakDigits();
    confetti();
    if (state.streak % 3 === 0 && state.streak > 0) {
      toast('Three in a row. Keep going.', 'ok');
    }
  } else {
    if (li) li.classList.add('wrong');
    btn.classList.add('wrong');
    card.querySelectorAll('.opts li').forEach((x) => {
      if (x.dataset.k === correct) x.classList.add('correct');
    });
    recordWrong();
    if (catId) recordAttempt(qid, catId, false); // additive — feeds topic-mastery label
    if (qid) recordMistake(qid); // log for later review on /mistakes
    bumpStreakDigits();
    trackWrong(card);
  }
}

function bumpStreakDigits() {
  document.querySelectorAll('#nb-streak, #nb-topstreak b, .nb-mcq .tools .streak b').forEach((el) => {
    el.textContent = state.streak;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  });
  const sol = document.getElementById('nb-solved');
  if (sol) sol.textContent = state.solved;
}

function trackWrong(card) {
  if (state.wrongTopic.dismissed) return;
  const topic = card.dataset.topic;
  if (!topic) return;
  if (state.wrongTopic.topic !== topic) {
    state.wrongTopic = { topic, count: 1, dismissed: false };
    return;
  }
  state.wrongTopic.count += 1;
  if (state.wrongTopic.count >= 3) {
    showMarginNote(card);
    state.wrongTopic.dismissed = true;
  }
}

function showMarginNote(card) {
  if (card.querySelector('.nb-margin-note')) return;
  const note = document.createElement('div');
  note.className = 'nb-margin-note';
  note.innerHTML = `<em>Come back to this one tomorrow.</em>`;
  card.appendChild(note);
}
