import { getSupabase } from '../lib/supabase.js';
import { withGuards } from '../lib/middleware.js';
import { generateCategoryPdf } from '../lib/pdf-engine.js';

// Hard ceiling on MCQs in ONE PDF (one volume). Parallel fetches + the wrap
// fast-path bring 8000 well under the 60s function timeout. Exams larger than
// this can be downloaded across multiple volumes (?volume=N&volumes=M).
const MAX_TOTAL   = 8000;
const FETCH_CHUNK = 500;
const MIN_PER_SECTION = 10;  // smallest meaningful chapter

function sanitiseFilename(raw, fallback) {
  const s = String(raw || '').trim();
  if (!s) return fallback;
  const cleaned = s
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 60);
  return cleaned || fallback;
}

function defaultFilename(label) {
  return String(label || 'exam')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'exam';
}

// Parse comma-separated category IDs from a query string. Returns a set of
// valid positive ints (capped at 200 to avoid abuse).
function parseIdSet(raw) {
  return new Set(
    String(raw || '')
      .split(',')
      .map(s => parseInt(s, 10))
      .filter(n => Number.isInteger(n) && n > 0)
      .slice(0, 200),
  );
}

export default withGuards({ ratePerMin: 4 }, async (req, res) => {
  const examId = parseInt(req.query.exam_id, 10);
  if (!Number.isInteger(examId) || examId < 1) {
    return res.status(400).json({ error: 'Invalid exam_id' });
  }

  const exclude = parseIdSet(req.query.exclude);

  // Volume parameters. `volumes=M` says "split the FULL content across M PDFs";
  // `volume=N` (1-indexed) says "this request is for volume N". Defaults: 1/1
  // which means the legacy single-file behaviour (proportional sampling).
  const volumes = Math.max(1, Math.min(20, parseInt(req.query.volumes, 10) || 1));
  const volume  = Math.max(1, Math.min(volumes, parseInt(req.query.volume, 10) || 1));

  const supabase = getSupabase();

  // Pull the exam record (for the heading + filename default).
  const { data: exam, error: examErr } = await supabase
    .from('exams')
    .select('id,slug,acronym,full_name')
    .eq('id', examId)
    .maybeSingle();
  if (examErr) throw examErr;
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  // Subjects linked to the exam, ordered by question count desc.
  const { data: cats, error: catsErr } = await supabase
    .from('mv_exam_categories_detail')
    .select('category_id,category_title,question_count')
    .eq('exam_id', examId)
    .order('question_count', { ascending: false });
  if (catsErr) throw catsErr;

  const selected = (cats || []).filter(c => !exclude.has(c.category_id));
  if (!selected.length) return res.status(400).json({ error: 'No subjects selected' });

  // Build the allocation table — how many MCQs to take from each subject and
  // from what offset. Two modes:
  //
  //  Single-volume (volumes=1): proportional sampling, capped at MAX_TOTAL.
  //  Multi-volume (volumes=M>1): take each subject's full count, split it into
  //    M slices, and serve the Nth slice. The grand total per volume is
  //    bounded server-side at MAX_TOTAL for safety.
  const totalAvailable = selected.reduce((s, c) => s + (c.question_count || 0), 0);

  let allocations;
  if (volumes > 1) {
    // Multi-volume: each subject contributes its slice [start, start+take).
    allocations = selected.map(c => {
      const avail = c.question_count || 0;
      if (!avail) return { cat: c, take: 0, startOffset: 0 };
      const perVol     = Math.ceil(avail / volumes);
      const startOffset = (volume - 1) * perVol;
      const take       = Math.max(0, Math.min(perVol, avail - startOffset));
      return { cat: c, take, startOffset };
    });
    // Volume-level safety: if total in this volume exceeds MAX_TOTAL, scale down.
    const volTotal = allocations.reduce((s, a) => s + a.take, 0);
    if (volTotal > MAX_TOTAL) {
      const ratio = MAX_TOTAL / volTotal;
      allocations.forEach(a => { a.take = Math.max(0, Math.floor(a.take * ratio)); });
    }
  } else {
    // Single-volume: proportional sampling across the full corpus.
    const budgetTotal = Math.min(MAX_TOTAL, totalAvailable);
    allocations = selected.map(c => {
      const avail = c.question_count || 0;
      if (!avail) return { cat: c, take: 0, startOffset: 0 };
      if (totalAvailable <= budgetTotal) return { cat: c, take: avail, startOffset: 0 };
      const fairShare = Math.floor((avail / totalAvailable) * budgetTotal);
      const take = Math.min(avail, Math.max(MIN_PER_SECTION, fairShare));
      return { cat: c, take, startOffset: 0 };
    });
    // Trim overshoot from largest subjects so the grand total stays within budget.
    let overshoot = allocations.reduce((s, a) => s + a.take, 0) - budgetTotal;
    if (overshoot > 0) {
      allocations.sort((a, b) => b.take - a.take);
      for (const a of allocations) {
        if (overshoot <= 0) break;
        const cut = Math.min(overshoot, Math.max(0, a.take - MIN_PER_SECTION));
        a.take -= cut;
        overshoot -= cut;
      }
      allocations.sort((a, b) => (b.cat.question_count || 0) - (a.cat.question_count || 0));
    }
  }

  // Fetch every subject in parallel. Supabase handles concurrency fine and
  // this slashes total fetch time from ~Σ(per-subject) to max(per-subject).
  const fetchSection = async ({ cat, take, startOffset = 0 }) => {
    if (!take) return null;
    const rows = [];
    let offset = startOffset;
    while (rows.length < take) {
      const want = Math.min(FETCH_CHUNK, take - rows.length);
      const { data, error } = await supabase.rpc('get_questions_by_category', {
        p_category_id: cat.category_id,
        p_limit: want,
        p_offset: offset,
      });
      if (error) throw error;
      if (!data || !data.length) break;
      rows.push(...data);
      if (data.length < want) break;
      offset += want;
    }
    return rows.length ? { title: cat.category_title, rows } : null;
  };

  const fetched = await Promise.all(allocations.map(a => fetchSection(a)));
  const sections = fetched.filter(Boolean);
  const runningTotal = sections.reduce((s, sec) => s + sec.rows.length, 0);

  if (!sections.length) {
    return res.status(404).json({ error: 'No questions to export' });
  }

  const volSuffix = volumes > 1 ? ` — Volume ${volume} of ${volumes}` : '';
  const label = `${exam.acronym || exam.slug || 'Exam'} — Complete MCQ Book${volSuffix}`;
  const pdfBytes = await generateCategoryPdf({ categoryLabel: label, sections });

  const defaultBase = `studora-${defaultFilename(exam.acronym || exam.slug)}-complete-mcq-book`;
  const fileSuffix  = volumes > 1 ? `-vol${volume}-of-${volumes}` : '';
  const base = sanitiseFilename(req.query.filename, defaultBase) + fileSuffix;
  const filename = `${base}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', String(pdfBytes.byteLength));
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.setHeader('X-Question-Count', String(runningTotal));
  res.setHeader('X-Section-Count', String(sections.length));
  res.setHeader('X-Volume', `${volume}/${volumes}`);
  res.status(200).send(Buffer.from(pdfBytes));
});
