// Bookmarks page — the visitor's saved questions, fetched by ID from
// /api/questions-by-ids. Since #62 each saved question lives in a folder
// (default = null, surfaced under "All saved"). The page shows a folder tab
// strip above the list, a small folder chip on every card for one-click
// re-filing, and a "+ New folder" affordance for fresh buckets.
import { esc, cleanTitle, skeletons, showErrorState } from '../core/helpers.js?v=1778642504';
import {
  state,
  resetSession,
  listBookmarkFolders,
  createBookmarkFolder,
  setBookmarkFolder,
  renameBookmarkFolder,
  deleteBookmarkFolder,
} from '../core/state.js?v=1778642504';
import {
  validateFolderName,
  BOOKMARK_FOLDER_CAP,
  BOOKMARK_FOLDER_NAME_MAX,
} from '../core/storage.js?v=1778642504';
import { API } from '../core/api.js?v=1778642504';
import { topbar, footer } from '../components/topbar.js?v=1778642504';
import { mcqItem, wireMcqCards } from '../components/mcq.js?v=1778642504';
import { trackPage } from '../components/login-wall.js?v=1778642504';
import { toast } from '../core/toast.js?v=1778642504';
import { wireNav } from '../core/router.js?v=1778642504';

const root = () => document.getElementById('app');

// Special tab id for the always-on first tab. Anything else is a folder name.
const ALL_TAB = '__all__';

// Module-level so the folder chip dropdown can close any other open one when
// the user opens a new one — only one picker visible at a time.
let openPicker = null;

export async function renderBookmarks() {
  if (trackPage()) return;
  resetSession();

  const r = root();
  // Snapshot the rich bookmark records. Entries quack like numbers via
  // toString(), so the API still gets a "1,2,3" id list, while the rest of
  // this page reads .id and .folder directly.
  const entries = [...state.bookmarks];
  const totalCount = entries.length;

  r.innerHTML = `
  ${topbar('home')}
  <main class="nb-wrap">
    <div class="nb-crumbs"><a data-nav="home" href="/">home</a><span class="sep">/</span>bookmarks</div>

    <header class="nb-cathead">
      <div class="tag">Your shelf · saved MCQs</div>
      <h1>Bookmarked <em>questions</em></h1>
      <div class="meta">
        <span><b id="bm-count">${totalCount}</b> saved</span>
        <span>sorted by save order</span>
      </div>
      <p class="intro">Tap the bookmark icon on any question to add it here. Group them into folders for pre-test cram, mistakes to revisit, or anything else. Bookmarks live on this device.</p>
    </header>

    <div class="nb-bm-folderbar">
      <div class="nb-tabs nb-bm-tabs" id="bm-tabs" role="tablist" aria-label="Bookmark folders"></div>
      <div class="nb-bm-folderbar-actions">
        <button type="button" class="nb-btn sm" id="bm-new-folder">+ new folder</button>
        <button type="button" class="nb-btn sm" id="bm-folder-menu" hidden aria-haspopup="true" aria-expanded="false">
          rename / delete
        </button>
      </div>
    </div>

    <div class="nb-bm-toolbar">
      <label class="nb-bm-filter">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
        <input type="search" id="bm-search" placeholder="filter the current folder…" autocomplete="off">
      </label>
    </div>

    <div id="bm-list">${totalCount ? skeletons(Math.min(totalCount, 5)) : ''}</div>
  </main>
  ${footer()}`;

  wireNav(r);

  const list = document.getElementById('bm-list');

  if (!totalCount) {
    renderTabs(ALL_TAB, []);
    list.innerHTML = `
      <div class="nb-bm-empty">
        <h3>No bookmarks yet</h3>
        <p>Browse a subject and tap the <b>bookmark</b> button on any question to save it here.</p>
        <a class="nb-btn primary" data-nav="subjects" href="/subjects">browse subjects</a>
      </div>`;
    wireNav(list);
    wireNewFolderButton(/* rows */ [], /* activeTab */ ALL_TAB);
    return;
  }

  let rows = [];
  try {
    rows = await API.getQuestionsByIds(entries);
  } catch (err) {
    console.error('bookmarks: fetch failed', err);
    showErrorState(list, {
      title: 'Couldn\'t load your bookmarks',
      hint: 'Your saved IDs are safe on this device — try again to fetch them.',
      onRetry: () => renderBookmarks(),
    });
    return;
  }

  // Hydrate category title for each row so the MCQ card header reads nicely.
  const catById = new Map(state.cats.map(c => [c.category_id, c]));
  rows.forEach(row => {
    const cat = catById.get(row.category_id);
    if (cat) {
      row.category_title = cleanTitle(cat.category_title || '');
      row.category_slug  = cat.category_slug;
    }
  });

  // Page-local state. Re-derived whenever the user re-files or renames so the
  // tab strip and folder chips stay in sync without a full reload.
  let activeTab = ALL_TAB;
  let filterText = '';

  function folderForRow(rowId) {
    const entry = state.bookmarks.find(b => (typeof b === 'number' ? b : b?.id) === rowId);
    return entry && typeof entry === 'object' ? (entry.folder || null) : null;
  }

  function render() {
    renderTabs(activeTab, rows);
    wireNewFolderButton(rows, activeTab);
    wireFolderMenu(activeTab, rows);

    const f = filterText.trim().toLowerCase();
    let pool = rows;
    if (activeTab !== ALL_TAB) {
      pool = rows.filter(row => folderForRow(row.id) === activeTab);
    }
    const filtered = f
      ? pool.filter(row => (row.text || '').toLowerCase().includes(f) ||
                           (row.category_title || '').toLowerCase().includes(f))
      : pool;

    if (!filtered.length) {
      const note = activeTab === ALL_TAB
        ? (f ? `No bookmarks match “${esc(filterText)}”.` : 'No bookmarks yet.')
        : (f ? `No bookmarks in <b>${esc(activeTab)}</b> match “${esc(filterText)}”.`
             : `No bookmarks in <b>${esc(activeTab)}</b> yet — open the chip on any card to file it here.`);
      list.innerHTML = `<div class="nb-empty">${note}</div>`;
      return;
    }

    list.innerHTML = filtered.map((q, i) => {
      const card = mcqItem(q, i + 1, false);
      const folder = folderForRow(q.id);
      return injectFolderChip(card, q.id, folder);
    }).join('');

    wireMcqCards();
    wireFolderChips(rows, render);
  }
  render();

  document.getElementById('bm-search')?.addEventListener('input', (e) => {
    filterText = e.target.value || '';
    render();
  });

  // Helpers below close over `rows` and the render() above via wireXxx().
  function renderTabs(active, allRows) {
    const tabsEl = document.getElementById('bm-tabs');
    if (!tabsEl) return;
    const folders = listBookmarkFolders();
    const countByFolder = new Map();
    countByFolder.set(ALL_TAB, allRows.length || state.bookmarks.length);
    folders.forEach(name => countByFolder.set(name, 0));
    state.bookmarks.forEach((b) => {
      const f = typeof b === 'object' && b ? (b.folder || null) : null;
      if (f && countByFolder.has(f)) countByFolder.set(f, countByFolder.get(f) + 1);
    });

    const tabBtn = (id, label, count, isActive) => `
      <button type="button" role="tab" data-folder="${esc(id)}"
              class="${isActive ? 'active' : ''}"
              aria-selected="${isActive ? 'true' : 'false'}">
        ${esc(label)}<span class="n">${count.toLocaleString()}</span>
      </button>`;

    const parts = [];
    parts.push(tabBtn(ALL_TAB, 'All saved', countByFolder.get(ALL_TAB) || 0, active === ALL_TAB));
    folders.forEach((name) => {
      parts.push(tabBtn(name, name, countByFolder.get(name) || 0, active === name));
    });
    tabsEl.innerHTML = parts.join('');

    tabsEl.querySelectorAll('button[data-folder]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.folder;
        closePicker();
        render();
      });
    });

    // Show the rename/delete button only when a real folder is active.
    const menuBtn = document.getElementById('bm-folder-menu');
    if (menuBtn) {
      const onFolder = active !== ALL_TAB;
      menuBtn.hidden = !onFolder;
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  }
}

// --- folder chip on every card ----------------------------------------------

// Append a small "Folder · <name>" chip to the .tools row inside the MCQ card
// HTML. Returns the rewritten card markup. We splice the chip before the
// closing </div> of .tools so it sits alongside the bookmark / share / report
// buttons without disturbing wireMcqCards() expectations.
function injectFolderChip(cardHtml, qid, folderName) {
  const label = folderName ? esc(folderName) : 'unfiled';
  const chip = `
    <span class="nb-bm-chip-wrap">
      <button type="button" class="nb-bm-chip ${folderName ? 'has' : 'none'}"
              data-qid="${qid}"
              aria-haspopup="listbox" aria-expanded="false"
              title="Move to a folder">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>
        <span class="lbl">${label}</span>
      </button>
    </span>`;
  // Splice the chip into the existing .tools row, just before the streak
  // counter so it sits with the other action buttons (bookmark / share /
  // report) rather than getting pushed to the far right. Falls back to
  // appending before </article> if the streak marker is missing.
  const anchor = '<span class="streak">';
  const at = cardHtml.indexOf(anchor);
  if (at >= 0) return cardHtml.slice(0, at) + chip + cardHtml.slice(at);
  const close = cardHtml.lastIndexOf('</div>');
  if (close < 0) return cardHtml + chip;
  return cardHtml.slice(0, close) + chip + cardHtml.slice(close);
}

function wireFolderChips(rows, rerender) {
  document.querySelectorAll('.nb-bm-chip').forEach((btn) => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const qid = parseInt(btn.dataset.qid, 10);
      if (!Number.isFinite(qid)) return;
      openFolderPicker(btn, qid, rerender);
    });
  });
  // Close picker on outside click. Bind once per render cycle.
  document.addEventListener('click', maybeCloseOnOutsideClick, { once: true, capture: true });
}

function maybeCloseOnOutsideClick(e) {
  if (!openPicker) return;
  if (openPicker.contains(e.target)) {
    // Re-arm — we'll get another outside click eventually.
    document.addEventListener('click', maybeCloseOnOutsideClick, { once: true, capture: true });
    return;
  }
  closePicker();
}

function closePicker() {
  if (!openPicker) return;
  const trigger = openPicker._trigger;
  openPicker.remove();
  openPicker = null;
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

function openFolderPicker(triggerBtn, qid, rerender) {
  closePicker();
  const folders = listBookmarkFolders();
  const currentEntry = state.bookmarks.find(b => (typeof b === 'number' ? b : b?.id) === qid);
  const current = currentEntry && typeof currentEntry === 'object' ? (currentEntry.folder || null) : null;

  const menu = document.createElement('div');
  menu.className = 'nb-bm-picker';
  menu.setAttribute('role', 'listbox');
  menu.innerHTML = `
    <button type="button" class="nb-bm-picker-row ${current === null ? 'sel' : ''}" data-folder="">
      <span class="lbl">Unfiled (All saved)</span>
    </button>
    ${folders.map(name => `
      <button type="button" class="nb-bm-picker-row ${name === current ? 'sel' : ''}" data-folder="${esc(name)}">
        <span class="lbl">${esc(name)}</span>
      </button>
    `).join('')}
    <div class="nb-bm-picker-sep"></div>
    <button type="button" class="nb-bm-picker-row new" data-action="new">
      <span class="lbl">+ new folder…</span>
    </button>
  `;
  menu._trigger = triggerBtn;
  triggerBtn.setAttribute('aria-expanded', 'true');

  // Position the menu against the trigger. Fixed positioning keeps it visible
  // even when the card is near the bottom of the scroll viewport.
  const rect = triggerBtn.getBoundingClientRect();
  menu.style.top  = `${rect.bottom + 6}px`;
  menu.style.left = `${Math.max(8, rect.left)}px`;
  document.body.appendChild(menu);
  openPicker = menu;

  menu.querySelectorAll('[data-folder]').forEach((row) => {
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetFolder = row.dataset.folder || null;
      setBookmarkFolder(qid, targetFolder);
      closePicker();
      rerender();
    });
  });
  menu.querySelector('[data-action="new"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closePicker();
    promptNewFolder((name) => {
      // Register the folder in the explicit list first so it survives if the
      // bookmark is later moved back to "All saved" — folders shouldn't vanish
      // just because nothing's filed in them right now.
      createBookmarkFolder(name);
      setBookmarkFolder(qid, name);
      rerender();
    });
  });
}

// --- new folder button + inline prompt --------------------------------------

function wireNewFolderButton(_rows, _activeTab) {
  const btn = document.getElementById('bm-new-folder');
  if (!btn || btn.dataset.wired) return;
  btn.dataset.wired = '1';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    promptNewFolder((name) => {
      // Persist the empty folder so the tab survives a reload even before
      // anything is filed into it.
      const ok = createBookmarkFolder(name);
      if (!ok) {
        toast(`Could not create “${name}” — folder may already exist or you've hit the cap.`, 'err');
        return;
      }
      toast(`Folder “${name}” created.`, 'ok');
      renderBookmarks();
    });
  });
}

function wireFolderMenu(_activeTab, _rows) {
  const btn = document.getElementById('bm-folder-menu');
  if (!btn) return;
  if (btn.dataset.wired) return;
  btn.dataset.wired = '1';
  // Read the active tab from the DOM at click time so the handler stays
  // correct across tab switches without re-binding.
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const active = document.querySelector('#bm-tabs button.active')?.dataset.folder || ALL_TAB;
    if (active === ALL_TAB) return;
    openFolderActionMenu(btn, active);
  });
}

function openFolderActionMenu(triggerBtn, folderName) {
  closePicker();
  const menu = document.createElement('div');
  menu.className = 'nb-bm-picker';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = `
    <button type="button" class="nb-bm-picker-row" data-action="rename">
      <span class="lbl">Rename folder</span>
    </button>
    <button type="button" class="nb-bm-picker-row" data-action="delete-keep">
      <span class="lbl">Delete folder, keep bookmarks</span>
    </button>
    <button type="button" class="nb-bm-picker-row danger" data-action="delete-all">
      <span class="lbl">Delete folder and bookmarks</span>
    </button>
  `;
  menu._trigger = triggerBtn;
  triggerBtn.setAttribute('aria-expanded', 'true');
  const rect = triggerBtn.getBoundingClientRect();
  menu.style.top  = `${rect.bottom + 6}px`;
  menu.style.left = `${Math.max(8, rect.left)}px`;
  document.body.appendChild(menu);
  openPicker = menu;

  menu.querySelector('[data-action="rename"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closePicker();
    promptRenameFolder(folderName);
  });
  menu.querySelector('[data-action="delete-keep"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closePicker();
    deleteBookmarkFolder(folderName, 'move-to-default');
    toast(`Folder “${folderName}” deleted. Its bookmarks moved to All saved.`, 'ok');
    renderBookmarks();
  });
  menu.querySelector('[data-action="delete-all"]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closePicker();
    // No native confirm — the action's label already names the consequence,
    // and the toast offers a clear after-the-fact summary. If we want a hard
    // confirm step we can layer one on later; for now the calm path is
    // single-click with a descriptive label.
    deleteBookmarkFolder(folderName, 'delete-bookmarks');
    toast(`Folder “${folderName}” and its bookmarks were removed.`, 'ok');
    renderBookmarks();
  });
  document.addEventListener('click', maybeCloseOnOutsideClick, { once: true, capture: true });
}

// Inline prompt that mounts an input strip into the folder toolbar instead of
// invoking native prompt(). Calls onName(trimmedName) on a valid Enter, or
// closes silently on Escape / cancel.
function promptNewFolder(onName) {
  const bar = document.querySelector('.nb-bm-folderbar');
  if (!bar) return;
  // Don't stack prompts.
  bar.querySelector('.nb-bm-prompt')?.remove();
  const folders = listBookmarkFolders();
  if (folders.length >= BOOKMARK_FOLDER_CAP) {
    toast(`You already have ${BOOKMARK_FOLDER_CAP} folders — that's the cap.`, 'err');
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'nb-bm-prompt';
  wrap.innerHTML = `
    <input type="text" maxlength="${BOOKMARK_FOLDER_NAME_MAX}"
           placeholder="Folder name (e.g. Pre-test cram)"
           aria-label="New folder name">
    <button type="button" class="nb-btn sm primary" data-act="ok">create</button>
    <button type="button" class="nb-btn sm" data-act="cancel">cancel</button>
    <span class="nb-bm-prompt-hint">${BOOKMARK_FOLDER_NAME_MAX} chars max · letters, numbers, space, dash, underscore</span>
  `;
  bar.appendChild(wrap);
  const input = wrap.querySelector('input');
  input.focus();

  const submit = () => {
    const name = validateFolderName(input.value);
    if (!name) {
      toast('Folder names need 1–32 letters, numbers, spaces, dashes or underscores.', 'err');
      input.focus();
      return;
    }
    if (folders.includes(name)) {
      toast(`A folder called “${name}” already exists.`, 'err');
      input.focus();
      return;
    }
    wrap.remove();
    onName(name);
  };

  wrap.querySelector('[data-act="ok"]').addEventListener('click', submit);
  wrap.querySelector('[data-act="cancel"]').addEventListener('click', () => wrap.remove());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  { e.preventDefault(); submit(); }
    if (e.key === 'Escape') { e.preventDefault(); wrap.remove(); }
  });
}

function promptRenameFolder(oldName) {
  const bar = document.querySelector('.nb-bm-folderbar');
  if (!bar) return;
  bar.querySelector('.nb-bm-prompt')?.remove();

  const wrap = document.createElement('div');
  wrap.className = 'nb-bm-prompt';
  wrap.innerHTML = `
    <input type="text" maxlength="${BOOKMARK_FOLDER_NAME_MAX}"
           placeholder="New name for “${esc(oldName)}”"
           aria-label="Rename folder">
    <button type="button" class="nb-btn sm primary" data-act="ok">rename</button>
    <button type="button" class="nb-btn sm" data-act="cancel">cancel</button>
    <span class="nb-bm-prompt-hint">${BOOKMARK_FOLDER_NAME_MAX} chars max · letters, numbers, space, dash, underscore</span>
  `;
  bar.appendChild(wrap);
  const input = wrap.querySelector('input');
  input.value = oldName;
  input.select();

  const submit = () => {
    const name = validateFolderName(input.value);
    if (!name) {
      toast('Folder names need 1–32 letters, numbers, spaces, dashes or underscores.', 'err');
      input.focus();
      return;
    }
    if (name === oldName) {
      wrap.remove();
      return;
    }
    const ok = renameBookmarkFolder(oldName, name);
    if (!ok) {
      toast(`Could not rename — “${name}” may already be in use.`, 'err');
      input.focus();
      return;
    }
    wrap.remove();
    toast(`Folder renamed to “${name}”.`, 'ok');
    renderBookmarks();
  };

  wrap.querySelector('[data-act="ok"]').addEventListener('click', submit);
  wrap.querySelector('[data-act="cancel"]').addEventListener('click', () => wrap.remove());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  { e.preventDefault(); submit(); }
    if (e.key === 'Escape') { e.preventDefault(); wrap.remove(); }
  });
}
