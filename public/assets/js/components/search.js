// Hero search — unified, grouped results across subjects + exams + bookmarks + MCQs.
// Subjects & exams match in-memory (47 + 50 items, instant). Bookmarked MCQs are
// matched in-memory once we've hydrated their text. MCQs go through the
// /api/search RPC (full-text via search_vector + ts_rank).
import { esc, cleanTitle } from '../core/helpers.js?v=1779087891';
import { icon, catIconImg, normalizeSlug } from '../core/icons.js?v=1779087891';
import { state } from '../core/state.js?v=1779087891';
import { API } from '../core/api.js?v=1779087891';
import { navigate } from '../core/router.js?v=1779087891';

const MIN_LEN = 2;
let bookmarkCache = null; // { ids: number[], rows: Array<{id,text,category_id}> }

async function getBookmarkRows() {
  const ids = state.bookmarks;
  if (!ids.length) return [];
  if (bookmarkCache && bookmarkCache.ids.length === ids.length && bookmarkCache.ids.every((v, i) => v === ids[i])) {
    return bookmarkCache.rows;
  }
  try {
    const rows = await API.getQuestionsByIds(ids);
    bookmarkCache = { ids: [...ids], rows };
    return rows;
  } catch { return []; }
}

function matchSubjects(q) {
  const f = q.toLowerCase();
  return state.cats
    .map(c => ({ c, score: scoreText(cleanTitle(c.category_title || ''), f) + scoreText(normalizeSlug(c.category_slug || ''), f) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.c.answerable_questions || 0) - (a.c.answerable_questions || 0))
    .slice(0, 4)
    .map(x => x.c);
}

function matchExams(q) {
  const f = q.toLowerCase();
  return state.exams
    .map(e => ({ e, score: scoreText(e.acronym || '', f) * 2 + scoreText(e.full_name || '', f) + scoreText(e.purpose || '', f) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.e);
}

function scoreText(haystack, needle) {
  if (!haystack || !needle) return 0;
  const h = haystack.toLowerCase();
  if (h === needle) return 100;
  if (h.startsWith(needle)) return 60;
  if (h.includes(needle)) return 30;
  // word-boundary partial match
  if (new RegExp(`\\b${escapeRegExp(needle)}`, 'i').test(haystack)) return 20;
  return 0;
}

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function highlight(text, needle) {
  if (!needle) return esc(text);
  const safe = esc(text);
  const re = new RegExp(`(${escapeRegExp(needle)})`, 'gi');
  return safe.replace(re, '<mark class="hl">$1</mark>');
}

export function setupSearch() {
  const inp  = document.getElementById('nb-si');
  const drop = document.getElementById('nb-sd');
  const btn  = document.getElementById('nb-sb');
  if (!inp || !drop) return;

  // Show a small search glyph inside the input (left-padded) by adding a class once.
  if (!inp.classList.contains('nb-search-input')) inp.classList.add('nb-search-input');

  let lastQuery = '';
  let activeReq = 0;

  async function run(q) {
    if (!q || q.length < MIN_LEN) { drop.style.display = 'none'; drop.innerHTML = ''; return; }
    lastQuery = q;
    const reqId = ++activeReq;
    drop.style.display = 'block';

    // Instant: subjects + exams + bookmarked-questions matches
    const subjects = matchSubjects(q);
    const exams    = matchExams(q);
    const bmRows   = await getBookmarkRows();
    const bmMatches = bmRows.filter(r => (r.text || '').toLowerCase().includes(q.toLowerCase())).slice(0, 5);

    // Server fetch — full-text MCQ search
    drop.innerHTML = renderPanel({ q, subjects, exams, bmMatches, mcqs: null, loading: true });
    wirePanel(drop, inp);

    let mcqs = [];
    try { mcqs = await API.searchQuestions(q, 8); } catch { /* swallow — show what we have */ }
    if (reqId !== activeReq || q !== lastQuery) return; // stale

    // Hydrate category_title for each MCQ row (RPC only returns category_id)
    const catById = new Map(state.cats.map(c => [c.category_id, c]));
    mcqs.forEach(m => {
      const c = catById.get(m.category_id);
      if (c) m.category_title = cleanTitle(c.category_title || '');
    });

    drop.innerHTML = renderPanel({ q, subjects, exams, bmMatches, mcqs, loading: false });
    wirePanel(drop, inp);
  }

  function close() { drop.style.display = 'none'; drop.innerHTML = ''; lastQuery = ''; }

  inp.addEventListener('input', () => {
    clearTimeout(state.searchTimer);
    const q = inp.value.trim();
    if (q.length < MIN_LEN) { close(); return; }
    // Render instant panel first so subjects/exams appear without a network round trip.
    drop.style.display = 'block';
    state.searchTimer = setTimeout(() => run(q), 220);
  });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); inp.blur(); }
    if (e.key === 'Enter')  { clearTimeout(state.searchTimer); run(inp.value.trim()); }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      drop.querySelector('[data-sr]')?.focus();
    }
  });
  btn?.addEventListener('click', () => { clearTimeout(state.searchTimer); run(inp.value.trim()); });
  document.addEventListener('click', (e) => {
    const wrap = document.querySelector('.nb-search');
    if (wrap && !wrap.contains(e.target)) close();
  });
}

function renderPanel({ q, subjects, exams, bmMatches, mcqs, loading }) {
  const sections = [];
  if (subjects.length) {
    sections.push(`
      <div class="nb-sgrp">
        <div class="nb-sgrp-h"><span>Subjects</span><span class="n">${subjects.length}</span></div>
        ${subjects.map(c => `
          <a class="nb-srow" data-sr data-kind="subject" data-cat="${c.category_id}" tabindex="0">
            <span class="ico">${catIconImg(c, cleanTitle(c.category_title || ''))}</span>
            <span class="t">${highlight(cleanTitle(c.category_title || ''), q)}</span>
            <span class="m">${(c.answerable_questions || 0).toLocaleString()} MCQs</span>
          </a>
        `).join('')}
      </div>
    `);
  }
  if (exams.length) {
    sections.push(`
      <div class="nb-sgrp">
        <div class="nb-sgrp-h"><span>Exams</span><span class="n">${exams.length}</span></div>
        ${exams.map(e => `
          <a class="nb-srow" data-sr data-kind="exam" data-exam="${e.id}" tabindex="0">
            <span class="ico">${icon('gavel')}</span>
            <span class="t">${highlight(e.acronym || e.slug || '', q)} <em>${highlight(e.full_name || '', q)}</em></span>
            <span class="m">${esc(e.purpose || '')}</span>
          </a>
        `).join('')}
      </div>
    `);
  }
  if (bmMatches.length) {
    sections.push(`
      <div class="nb-sgrp">
        <div class="nb-sgrp-h"><span>From your bookmarks</span><span class="n">${bmMatches.length}</span></div>
        ${bmMatches.map(r => `
          <a class="nb-srow" data-sr data-kind="bookmark" data-cat="${r.category_id || ''}" tabindex="0">
            <span class="ico">${icon('bookmark')}</span>
            <span class="t">${highlight((r.text || '').slice(0, 120), q)}</span>
            <span class="m">saved</span>
          </a>
        `).join('')}
      </div>
    `);
  }
  if (mcqs == null && loading) {
    sections.push(`<div class="nb-sgrp"><div class="nb-sgrp-h"><span>MCQs</span><span class="n">searching…</span></div></div>`);
  } else if (mcqs && mcqs.length) {
    sections.push(`
      <div class="nb-sgrp">
        <div class="nb-sgrp-h"><span>MCQs</span><span class="n">${mcqs.length}</span></div>
        ${mcqs.map(m => `
          <a class="nb-srow" data-sr data-kind="mcq" data-cat="${m.category_id || ''}" tabindex="0">
            <span class="ico">${icon('quote')}</span>
            <span class="t">${highlight((m.text || '').slice(0, 140), q)}</span>
            <span class="m">${esc(m.category_title || 'jump to subject')}</span>
          </a>
        `).join('')}
      </div>
    `);
  } else if (mcqs && !mcqs.length && !subjects.length && !exams.length && !bmMatches.length) {
    sections.push(`<div class="nb-sgrp"><div class="nb-sgrp-h"><span>No matches</span></div><div class="nb-srow-empty">Nothing matched “${esc(q)}”. Try a shorter phrase.</div></div>`);
  }
  return sections.join('');
}

function wirePanel(drop, inp) {
  drop.querySelectorAll('[data-sr]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      activate(el, inp, drop);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); activate(el, inp, drop); }
      if (e.key === 'ArrowDown') { e.preventDefault(); el.nextElementSibling?.focus?.(); }
      if (e.key === 'ArrowUp')   { e.preventDefault();
        const prev = el.previousElementSibling;
        if (prev?.matches('[data-sr]')) prev.focus(); else inp.focus();
      }
    });
  });
}

function activate(el, inp, drop) {
  const kind = el.dataset.kind;
  const catId = parseInt(el.dataset.cat, 10);
  const examId = parseInt(el.dataset.exam, 10);
  inp.value = '';
  drop.style.display = 'none';
  drop.innerHTML = '';
  if (kind === 'subject' || kind === 'mcq' || kind === 'bookmark') {
    const cat = state.cats.find(c => c.category_id === catId);
    if (cat) navigate('category', { cat });
  } else if (kind === 'exam') {
    const exam = state.exams.find(x => x.id === examId);
    if (exam) navigate('exam', { exam });
  }
}
