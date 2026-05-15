import { getSupabase } from '../lib/supabase.js';
import { withGuards } from '../lib/middleware.js';

export default withGuards({ ratePerMin: 60 }, async (req, res) => {
  const { exam_id } = req.query;
  const id = parseInt(exam_id, 10);
  if (!Number.isInteger(id) || id < 1 || id > 1000000) {
    return res.status(400).json({ error: 'Invalid exam_id' });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('mv_exam_categories_detail')
    .select('category_id,category_slug,category_title,question_count')
    .eq('exam_id', id)
    .order('question_count', { ascending: false });
  if (error) throw error;
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).json(data);
});
