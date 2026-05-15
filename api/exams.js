import { getSupabase } from '../lib/supabase.js';
import { withGuards } from '../lib/middleware.js';

export default withGuards({ ratePerMin: 60 }, async (req, res) => {
  const supabase = getSupabase();
  const { slug } = req.query;

  // Fetch exams + aggregated MCQ totals in parallel; merge in memory.
  // mv_exam_stats is a materialized view: (exam_id, total_questions, category_count).
  const [examsRes, statsRes] = await Promise.all([
    (() => {
      let q = supabase.from('exams').select('id,slug,acronym,full_name,purpose');
      if (slug) {
        const cleanSlug = String(slug).replace(/[^a-z0-9\-_]/gi, '').slice(0, 64);
        if (!cleanSlug) return Promise.resolve({ data: [], error: null });
        q = q.eq('slug', cleanSlug);
      }
      return q;
    })(),
    supabase.from('mv_exam_stats').select('exam_id,total_questions,category_count'),
  ]);

  if (examsRes.error) throw examsRes.error;
  if (statsRes.error) throw statsRes.error;

  const totals = new Map((statsRes.data || []).map(r => [r.exam_id, r]));

  const enriched = (examsRes.data || []).map(e => {
    const s = totals.get(e.id);
    return {
      ...e,
      total_questions: s?.total_questions ?? 0,
      category_count:  s?.category_count  ?? 0,
    };
  }).sort((a, b) => b.total_questions - a.total_questions);

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).json(enriched);
});
