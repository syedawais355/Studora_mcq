#!/usr/bin/env node
// Concatenates Studora's modular CSS sources into a single
// public/assets/css/main.css bundle. Run `npm run build:css` after editing
// any source file under base/, components/, or pages/.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'public', 'assets', 'css');

const ORDER = [
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
  'components/mcq.css',
  'components/pagination.css',
  'components/tabs.css',
  'components/login-wall.css',
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
];

const HEADER = `/* Studora — single-bundle stylesheet (concatenated from base/, components/, pages/).
 * Edit the source files in those subdirectories, then run:
 *   npm run build:css
 * to regenerate this file. Nothing in main.css is meant to be hand-edited. */
`;

async function build() {
  const parts = [HEADER];
  for (const rel of ORDER) {
    const abs = join(ROOT, rel);
    const body = await readFile(abs, 'utf8');
    parts.push(`\n/* ==== ${rel} ==== */\n${body}`);
  }
  const out = parts.join('') + '\n';
  await writeFile(join(ROOT, 'main.css'), out, 'utf8');
  console.log(`built main.css — ${out.length.toLocaleString()} bytes from ${ORDER.length} sources`);
}

build().catch((err) => { console.error(err); process.exit(1); });
