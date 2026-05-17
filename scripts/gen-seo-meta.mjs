#!/usr/bin/env node
// Pulls per-subject and per-exam metadata from Supabase and writes a single
// JSON file that the edge middleware imports. Title and description are
// human-written templates with real question counts baked in.

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'lib');
const OUT_FILE = join(OUT_DIR, 'seo-meta.json');

function cleanTitle(s) {
  return String(s || '')
    .replace(/\s+mcqs?$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function subjectMeta(c) {
  const title = cleanTitle(c.category_title);
  const n = (c.answerable_questions || c.total_questions || 0).toLocaleString();
  return {
    title: `${title} MCQs — practice ${n} questions on Studora`,
    description: `Practice ${n} verified multiple-choice questions on ${title}. Covers every major topic for CSS, PMS, PPSC, FPSC and other Pakistani competitive exams. Free for the basics on Studora.`,
    h1: `${title} MCQs`,
  };
}

function examMeta(e, statsByExam) {
  const acronym = (e.acronym || e.slug || '').toUpperCase();
  const fullName = e.full_name || e.purpose || acronym;
  const stats = statsByExam.get(e.id);
  const n = (stats?.total_questions || 0).toLocaleString();
  return {
    title: `${acronym} preparation — ${n} MCQs on Studora`,
    description: `Prepare for ${acronym} (${fullName}). ${n} curated multiple-choice questions, organised by subject. Free for the basics, no clutter, no ads. Study quietly. Score loudly.`,
    h1: `${acronym} — ${fullName}`,
  };
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.warn('[seo-meta] credentials missing — writing empty map');
    await mkdir(OUT_DIR, { recursive: true });
    await writeFile(OUT_FILE, JSON.stringify({ subjects: {}, exams: {} }, null, 2), 'utf8');
    return;
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  const [cats, exams, examStats] = await Promise.all([
    fetch(`${url}/rest/v1/mv_category_stats?select=category_slug,category_title,total_questions,answerable_questions`, { headers })
      .then(r => r.ok ? r.json() : []),
    fetch(`${url}/rest/v1/exams?select=id,slug,acronym,full_name,purpose`, { headers })
      .then(r => r.ok ? r.json() : []),
    fetch(`${url}/rest/v1/mv_exam_stats?select=exam_id,total_questions,category_count`, { headers })
      .then(r => r.ok ? r.json() : []),
  ]);

  const statsByExam = new Map((examStats || []).map(s => [s.exam_id, s]));

  const subjects = {};
  for (const c of cats) {
    if (c.category_slug) subjects[c.category_slug] = subjectMeta(c);
  }

  const examsOut = {};
  for (const e of exams) {
    if (e.slug) examsOut[e.slug] = examMeta(e, statsByExam);
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    OUT_FILE,
    JSON.stringify({ subjects, exams: examsOut, generatedAt: new Date().toISOString() }, null, 2),
    'utf8'
  );

  console.log(`[seo-meta] wrote ${Object.keys(subjects).length} subjects + ${Object.keys(examsOut).length} exams → lib/seo-meta.json`);
}

main().catch(err => {
  console.error('[seo-meta] failed:', err.message);
  process.exit(1);
});
