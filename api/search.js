import { getSupabase } from '../lib/supabase.js';
import { withGuards } from '../lib/middleware.js';

export default withGuards({ ratePerMin: 20 }, async (req, res) => {
  const { q, limit } = req.query;
  if (!q || typeof q !== 'string') return res.status(400).json({ error: 'Query required' });

  // Strip everything except word chars, whitespace, and Arabic/Urdu range.
  const cleanQuery = q
    .replace(/[^\w\s؀-ۿ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
  if (cleanQuery.length < 2) return res.status(400).json({ error: 'Query too short' });

  const lim = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 20);

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('search_questions', {
    p_query: cleanQuery,
    p_limit: lim,
  });
  if (error) throw error;
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
  return res.status(200).json(
    (data || []).map(r => ({ id: r.id, text: r.text, category_id: r.category_id, category_title: r.category_title }))
  );
});
