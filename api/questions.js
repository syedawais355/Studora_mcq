import { getSupabase } from '../lib/supabase.js';
import { withGuards } from '../lib/middleware.js';

const VALID_CATEGORY_IDS = new Set(
  Array.from({ length: 47 }, (_, i) => i + 1)
);

const MAX_LIMIT = 100;
const MAX_OFFSET = 500000;

export default withGuards({ ratePerMin: 120 }, async (req, res) => {
  const { category_id, limit, offset } = req.query;
  const catId = parseInt(category_id, 10);
  if (!Number.isInteger(catId) || !VALID_CATEGORY_IDS.has(catId)) {
    return res.status(400).json({ error: 'Invalid category_id' });
  }
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), MAX_LIMIT);
  const off = Math.min(Math.max(parseInt(offset, 10) || 0, 0), MAX_OFFSET);

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_questions_by_category', {
    p_category_id: catId,
    p_limit: lim,
    p_offset: off,
  });
  if (error) throw error;
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).json(data);
});
