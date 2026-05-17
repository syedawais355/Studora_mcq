#!/usr/bin/env node
// Generates public/sitemap.xml at build time.
// Pulls every subject and exam slug from Supabase and writes one URL each.
// If the Supabase credentials are missing (e.g. local build without env), falls
// back to writing the static set of top-level routes so the build never breaks.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITEMAP = join(__dirname, '..', 'public', 'sitemap.xml');

const BASE = process.env.SITEMAP_BASE_URL || 'https://studora.vercel.app';
const today = new Date().toISOString().slice(0, 10);

// Static top-level routes. Sorted by importance.
const STATIC_ROUTES = [
  { path: '/',          priority: '1.0', changefreq: 'daily' },
  { path: '/subjects',  priority: '0.9', changefreq: 'weekly' },
  { path: '/exams',     priority: '0.9', changefreq: 'weekly' },
  { path: '/quiz',      priority: '0.8', changefreq: 'daily' },
  { path: '/mistakes',  priority: '0.7', changefreq: 'weekly' },
  { path: '/bookmarks', priority: '0.4', changefreq: 'monthly' },
  { path: '/about',     priority: '0.5', changefreq: 'monthly' },
];

function urlNode({ path, priority, changefreq, lastmod }) {
  return `  <url>
    <loc>${BASE}${path}</loc>
    <lastmod>${lastmod || today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function fetchSlugs() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.warn('[sitemap] SUPABASE_URL / SUPABASE_SERVICE_KEY missing — writing static routes only');
    return { categories: [], exams: [] };
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  const [cats, exams] = await Promise.all([
    fetch(`${url}/rest/v1/mv_category_stats?select=category_slug&order=total_questions.desc`, { headers })
      .then(r => r.ok ? r.json() : []),
    fetch(`${url}/rest/v1/exams?select=slug&order=slug.asc`, { headers })
      .then(r => r.ok ? r.json() : []),
  ]);

  return {
    categories: cats.map(c => c.category_slug).filter(Boolean),
    exams: exams.map(e => e.slug).filter(Boolean),
  };
}

async function main() {
  const { categories, exams } = await fetchSlugs();

  const parts = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...STATIC_ROUTES.map(urlNode),
    ...categories.map(slug => urlNode({
      path: `/subjects/${slug}`,
      priority: '0.8',
      changefreq: 'weekly',
    })),
    ...exams.map(slug => urlNode({
      path: `/exams/${slug}`,
      priority: '0.85',
      changefreq: 'weekly',
    })),
    '</urlset>',
    '',
  ];

  await writeFile(SITEMAP, parts.join('\n'), 'utf8');
  console.log(`[sitemap] wrote ${STATIC_ROUTES.length} static + ${categories.length} subjects + ${exams.length} exams = ${STATIC_ROUTES.length + categories.length + exams.length} URLs`);
}

main().catch(err => {
  console.error('[sitemap] failed:', err.message);
  process.exit(1);
});
