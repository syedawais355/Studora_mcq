#!/usr/bin/env node
// Build-time guard for middleware.js (#50).
//
// The edge SEO middleware rewrites eight specific meta-tag patterns in
// public/index.html via plain regex. The patterns are intentionally
// attribute-order-sensitive — moving the attributes around in the source HTML
// would silently break per-route SEO for /subjects/[slug] and /exams/[slug]
// without any test or production error to flag it.
//
// This script runs as part of `npm run build` and re-applies each regex
// against the on-disk index.html. If any pattern matches zero times the
// build fails fast with a precise pointer to which tag drifted, so the
// developer who edited index.html sees the consequence before deploy.
//
// We deliberately mirror the regexes from middleware.js *verbatim*. If you
// change one here, change it there too — and add a comment in both places.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = resolve(__dirname, '..', 'public', 'index.html');

// Keep this list 1:1 with the .replace() calls in middleware.js → rewriteHtml().
// Description is what shows in the failure message; pattern is the literal
// regex the middleware will run against the upstream HTML.
const ANCHORS = [
  { name: '<title>',                       pattern: /<title>[^<]*<\/title>/ },
  { name: 'meta name="description"',       pattern: /(<meta name="description" content=")[^"]*(")/ },
  { name: 'meta property="og:title"',      pattern: /(<meta property="og:title" content=")[^"]*(")/ },
  { name: 'meta property="og:description"',pattern: /(<meta property="og:description" content=")[^"]*(")/ },
  { name: 'meta property="og:url"',        pattern: /(<meta property="og:url" content=")[^"]*(")/ },
  { name: 'meta name="twitter:title"',     pattern: /(<meta name="twitter:title" content=")[^"]*(")/ },
  { name: 'meta name="twitter:description"',pattern: /(<meta name="twitter:description" content=")[^"]*(")/ },
  { name: 'link rel="canonical"',          pattern: /(<link rel="canonical" href=")[^"]*(")/ },
];

function main() {
  let html;
  try {
    html = readFileSync(HTML_PATH, 'utf8');
  } catch (err) {
    console.error(`check-seo-anchors: cannot read ${HTML_PATH}: ${err.message}`);
    process.exit(1);
  }

  const missing = [];
  for (const { name, pattern } of ANCHORS) {
    if (!pattern.test(html)) missing.push(name);
  }

  if (missing.length) {
    console.error('check-seo-anchors: middleware.js SEO regexes will not match the current public/index.html.');
    console.error('The following anchors were not found (attribute order or spelling probably changed):');
    for (const m of missing) console.error(`  - ${m}`);
    console.error('Fix index.html OR update middleware.js (and this script) in lockstep.');
    process.exit(1);
  }

  console.log(`check-seo-anchors: OK (${ANCHORS.length}/${ANCHORS.length} meta-tag anchors matched).`);
}

main();
