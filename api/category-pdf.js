import { getSupabase } from '../lib/supabase.js';
import { withGuards } from '../lib/middleware.js';
import { generateCategoryPdf } from '../lib/pdf-engine.js';

const VALID_CATEGORY_IDS = new Set(Array.from({ length: 47 }, (_, i) => i + 1));

// Single hard cap so a request can't pin the function. The UI lets users pick
// any value up to the subject's own MCQ count, but we won't exceed MAX_ALL.
const MAX_ALL     = 3000;
const FETCH_CHUNK = 500;

// Server-side filename sanitiser. The browser ultimately writes whatever the
// Content-Disposition header says, so this is the only line of defence against
// header injection (CR/LF) and path traversal.
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
  return String(label || 'mcq-bank')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'mcq-bank';
}

export default withGuards({ ratePerMin: 6 }, async (req, res) => {
  const catId = parseInt(req.query.category_id, 10);
  if (!Number.isInteger(catId) || !VALID_CATEGORY_IDS.has(catId)) {
    return res.status(400).json({ error: 'Invalid category_id' });
  }

  let limit = null;
  if (req.query.limit !== undefined && req.query.limit !== '') {
    const parsed = parseInt(req.query.limit, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_ALL) {
      return res.status(400).json({ error: `limit must be between 1 and ${MAX_ALL}` });
    }
    limit = parsed;
  }

  const supabase = getSupabase();

  const { data: meta, error: metaErr } = await supabase
    .from('mv_category_stats')
    .select('category_title,answerable_questions')
    .eq('category_id', catId)
    .maybeSingle();
  if (metaErr) throw metaErr;
  if (!meta) return res.status(404).json({ error: 'Category not found' });

  const target = limit ?? MAX_ALL;
  const rows = [];
  let offset = 0;
  while (rows.length < target) {
    const want = Math.min(FETCH_CHUNK, target - rows.length);
    const { data, error } = await supabase.rpc('get_questions_by_category', {
      p_category_id: catId,
      p_limit: want,
      p_offset: offset,
    });
    if (error) throw error;
    if (!data || !data.length) break;
    rows.push(...data);
    if (data.length < want) break;
    offset += want;
  }

  if (!rows.length) {
    return res.status(404).json({ error: 'No questions to export' });
  }

  const pdfBytes = await generateCategoryPdf({
    categoryLabel: meta.category_title || 'MCQ',
    rows,
  });

  const base = sanitiseFilename(req.query.filename, `studora-${defaultFilename(meta.category_title)}-mcq`);
  const filename = `${base}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', String(pdfBytes.byteLength));
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.setHeader('X-Question-Count', String(rows.length));
  res.status(200).send(Buffer.from(pdfBytes));
});
