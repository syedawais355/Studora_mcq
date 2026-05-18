#!/usr/bin/env node
// Ping IndexNow with the current sitemap so Bing (and any other adopting
// engines — Yandex, Seznam, Naver) crawl the new URLs within minutes
// instead of days.
//
// Usage: node scripts/submit-to-indexnow.mjs
//   Submits every <loc> from public/sitemap.xml to the IndexNow API.
//
//   node scripts/submit-to-indexnow.mjs https://studora.vercel.app/some/specific/url
//   Submits a single URL.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITEMAP = join(__dirname, '..', 'public', 'sitemap.xml');

const HOST = 'studora.vercel.app';
const KEY = '75089a7f9fcddf4019ebaacfb33d33e3';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

// IndexNow accepts up to 10,000 URLs per POST.
const BATCH_MAX = 10000;

async function urlsFromSitemap() {
  const xml = await readFile(SITEMAP, 'utf8');
  const matches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
  return matches.map(m => m.replace(/<\/?loc>/g, '').trim()).filter(Boolean);
}

async function submit(urlList) {
  const res = await fetch('https://api.indexnow.org/IndexNow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    }),
  });
  return { status: res.status, ok: res.ok, body: await res.text() };
}

async function main() {
  const cliUrl = process.argv[2];
  const urls = cliUrl ? [cliUrl] : await urlsFromSitemap();
  if (!urls.length) {
    console.error('[indexnow] no URLs to submit');
    process.exit(1);
  }
  console.log(`[indexnow] submitting ${urls.length} URL(s) to IndexNow…`);

  for (let i = 0; i < urls.length; i += BATCH_MAX) {
    const batch = urls.slice(i, i + BATCH_MAX);
    const result = await submit(batch);
    console.log(`[indexnow] batch ${i / BATCH_MAX + 1}: HTTP ${result.status}${result.ok ? '' : ' — ' + result.body}`);
  }
  console.log('[indexnow] done.');
}

main().catch(err => {
  console.error('[indexnow] failed:', err.message);
  process.exit(1);
});
