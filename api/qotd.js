// Question of the day — one deterministic question per (date, exam) tuple so
// every visitor on the same UTC day sees the same prompt and can compare picks
// with friends. The picker is a small hash of YYYY-MM-DD + exam slug taken
// modulo the question count for that category, then an id-ordered offset
// query. Stable on repeated calls, rotates near midnight UTC.
import { getSupabase } from '../lib/supabase.js';
import { withGuards } from '../lib/middleware.js';

// Default category is the broad "general knowledge" bucket so the home page
// has a sensible fallback when no ?exam= is supplied.
const DEFAULT_SLUG = 'general_knowledge_mcqs';
const SLUG_RE = /^[a-z0-9_-]{1,64}$/;

function todayUtc() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// FNV-1a 32-bit. Tiny, allocation-free, well-distributed for short strings.
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export default withGuards({ ratePerMin: 60 }, async (req, res) => {
  const rawSlug = (req.query?.exam || DEFAULT_SLUG).toString().trim().toLowerCase();
  if (!SLUG_RE.test(rawSlug)) {
    return res.status(400).json({ error: 'Invalid exam slug' });
  }

  const date = todayUtc();
  const seed = fnv1a(`${date}|${rawSlug}`);

  const supabase = getSupabase();

  // Resolve the slug to a category_id and learn how many questions live in it
  // — needed so the offset modulo math always lands on a real row.
  const { data: cat, error: catErr } = await supabase
    .from('mv_category_stats')
    .select('category_id,category_title,answerable_questions,total_questions')
    .eq('category_slug', rawSlug)
    .maybeSingle();
  if (catErr) throw catErr;
  if (!cat) return res.status(404).json({ error: 'Unknown exam slug' });

  const total = Number(cat.answerable_questions || cat.total_questions || 0);
  if (!total) return res.status(404).json({ error: 'No questions available' });

  const offset = seed % total;

  const { data: rows, error: qErr } = await supabase
    .from('questions')
    .select('id,text,option_a,option_b,option_c,option_d,correct_key')
    .eq('category_id', cat.category_id)
    .order('id', { ascending: true })
    .range(offset, offset);
  if (qErr) throw qErr;

  const q = rows?.[0];
  if (!q) return res.status(404).json({ error: 'No question at offset' });

  // s-maxage=1h means the edge serves the same answer to everyone for an
  // hour; SWR keeps it warm for 24h while the next day's pick is computed in
  // the background near midnight UTC.
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json({
    id: q.id,
    text: q.text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_key: q.correct_key,
    category_title: cat.category_title,
    date,
    exam: rawSlug,
  });
});
