import { getSupabase } from '../lib/supabase.js';
import { withGuards } from '../lib/middleware.js';

export default withGuards({ ratePerMin: 60 }, async (_req, res) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('mv_category_stats')
    .select('category_id,category_slug,category_title,total_questions,answerable_questions')
    .order('total_questions', { ascending: false });
  if (error) throw error;
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).json(data);
});
