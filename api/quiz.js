import { getSupabase } from '../lib/supabase.js';
import { withGuards } from '../lib/middleware.js';

const VALID_CATEGORY_IDS = new Set(
  Array.from({ length: 47 }, (_, i) => i + 1)
);

export default withGuards({ ratePerMin: 30 }, async (req, res) => {
  const { category_id, count } = req.query;
  const catId = parseInt(category_id, 10);
  if (!Number.isInteger(catId) || !VALID_CATEGORY_IDS.has(catId)) {
    return res.status(400).json({ error: 'Invalid category_id' });
  }
  const quizCount = Math.min(Math.max(parseInt(count, 10) || 20, 5), 50);

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_random_quiz', {
    p_category_id: catId,
    p_count: quizCount,
  });
  if (error) throw error;
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(data);
});
