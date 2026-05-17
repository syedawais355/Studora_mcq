#!/usr/bin/env node
// Concatenates Studora's modular CSS sources into three bundles under
// public/assets/css/:
//
//   • main-critical.css — the ~6 KB above-the-fold subset (tokens, reset,
//     animations, fonts, topbar/buttons/cards/breadcrumbs/footer + the home
//     page). index.html inlines this in a <style> block so first paint never
//     waits on a network round trip for paint-blocking CSS.
//
//   • main-rest.css     — every other component and page stylesheet. Loaded
//     asynchronously via <link rel="preload" as="style" onload="this.rel=
//     'stylesheet'">. Below-the-fold UI swaps in once it arrives.
//
//   • main.css          — the legacy single-bundle output, kept so anything
//     still pointing at /assets/css/main.css (older cached HTML, the SW
//     shell, archived emails) keeps working during the transition.
//
// Run `npm run build:css` after editing any source file under base/,
// components/, or pages/.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'public', 'assets', 'css');

// Above-the-fold sources. Order matches the original cascade so specificity
// resolves the same as a full main.css load.
const CRITICAL = [
  'base/tokens.css',
  'base/reset.css',
  'base/animations.css',
  'fonts.css',
  'components/topbar.css',
  'components/buttons.css',
  'components/cards.css',
  'components/breadcrumbs.css',
  'components/footer.css',
  'pages/home.css',
];

// Everything else. Anything in ORDER (below) that isn't in CRITICAL ends up
// here.
const ORDER = [
  'fonts.css',
  'base/tokens.css',
  'base/reset.css',
  'base/animations.css',

  'components/topbar.css',
  'components/user-menu.css',
  'components/breadcrumbs.css',
  'components/buttons.css',
  'components/cards.css',
  'components/search.css',
  'components/exam-table.css',
  'components/category-grid.css',
  'components/daily.css',
  'components/qotd.css',
  'components/quick-quiz.css',
  'components/mcq.css',
  'components/pagination.css',
  'components/tabs.css',
  'components/login-wall.css',
  'components/share-result.css',
  'components/download-modal.css',
  'components/rail.css',
  'components/toast.css',
  'components/footer.css',

  'pages/home.css',
  'pages/category.css',
  'pages/exam.css',
  'pages/about.css',
  'pages/bookmarks.css',
  'pages/quiz.css',
  'pages/analytics.css',
];

const CRITICAL_SET = new Set(CRITICAL);
const REST = ORDER.filter(src => !CRITICAL_SET.has(src));

const HEADER = `/* Studora — single-bundle stylesheet (concatenated from base/, components/, pages/).
 * Edit the source files in those subdirectories, then run:
 *   npm run build:css
 * to regenerate this file. Nothing in main.css is meant to be hand-edited. */
`;

const CRITICAL_HEADER = `/* Studora — critical-path stylesheet. Inlined in index.html <head>.
 * Covers tokens/reset/animations + the topbar, buttons, cards, breadcrumbs,
 * footer, and home page. Everything else lives in main-rest.css, loaded async. */
`;

const REST_HEADER = `/* Studora — non-critical stylesheet. Loaded asynchronously after first paint.
 * Contains every component and page that isn't part of the above-the-fold bundle. */
`;

async function concat(sources) {
  const parts = [];
  for (const rel of sources) {
    const abs = join(ROOT, rel);
    const body = await readFile(abs, 'utf8');
    parts.push(`\n/* ==== ${rel} ==== */\n${body}`);
  }
  return parts.join('');
}

async function build() {
  // 1. Full legacy bundle — preserves the existing /assets/css/main.css URL.
  const full = HEADER + (await concat(ORDER)) + '\n';
  await writeFile(join(ROOT, 'main.css'), full, 'utf8');
  console.log(`built main.css        — ${full.length.toLocaleString()} bytes from ${ORDER.length} sources`);

  // 2. Critical subset for inlining.
  const critical = CRITICAL_HEADER + (await concat(CRITICAL)) + '\n';
  await writeFile(join(ROOT, 'main-critical.css'), critical, 'utf8');
  console.log(`built main-critical   — ${critical.length.toLocaleString()} bytes from ${CRITICAL.length} sources`);

  // 3. Everything else for async loading.
  const rest = REST_HEADER + (await concat(REST)) + '\n';
  await writeFile(join(ROOT, 'main-rest.css'), rest, 'utf8');
  console.log(`built main-rest       — ${rest.length.toLocaleString()} bytes from ${REST.length} sources`);
}

build().catch((err) => { console.error(err); process.exit(1); });
