#!/usr/bin/env node
// Cache-busting: stamps a build version into the asset URLs in index.html
// AND into the import statements inside every JS module under public/assets/js,
// so every deploy invalidates `<link href="...?v=…">`, `<script src="...?v=…">`
// and `import … from '…?v=…'`. Run before `vercel --prod`.

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');
const INDEX  = join(PUBLIC, 'index.html');
const JS_DIR = join(PUBLIC, 'assets', 'js');

const version = String(Math.floor(Date.now() / 1000));

// 1) Stamp index.html — top-level <link> / <script> tags.
{
  const html = await readFile(INDEX, 'utf8');
  const next = html
    .replace(/(href|src)="(\/assets\/[^"?#]+)\?v=\d+"/g, '$1="$2"')
    .replace(/(href|src)="(\/assets\/[^"?#]+)"/g, `$1="$2?v=${version}"`);
  await writeFile(INDEX, next, 'utf8');
  console.log(`stamped index.html with v=${version}`);
}

// 2) Stamp ES module imports inside every .js under public/assets/js.
//    Covers static `from '…'` / `import '…'` and dynamic `import('…')`.
async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.isFile() && extname(p) === '.js') yield p;
  }
}

const stampSpec = (spec) => {
  if (!spec.startsWith('./') && !spec.startsWith('../') && !spec.startsWith('/assets/')) return spec;
  const [path] = spec.split(/[?#]/);
  return `${path}?v=${version}`;
};

let stamped = 0;
for await (const file of walk(JS_DIR)) {
  const src = await readFile(file, 'utf8');
  const next = src
    .replace(/(\bfrom\s*|\bimport\s*(?:\(\s*)?)(['"])([^'"\n]+?)\2/g,
      (_, head, q, spec) => `${head}${q}${stampSpec(spec)}${q}`);
  if (next !== src) {
    await writeFile(file, next, 'utf8');
    stamped++;
  }
}
console.log(`stamped ${stamped} JS module(s) with v=${version}`);
