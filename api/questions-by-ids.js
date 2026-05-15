import { getSupabase } from '../lib/supabase.js';
import { withGuards } from '../lib/middleware.js';

const MAX_IDS = 200;

export default withGuards({ ratePerMin: 60 }, async (req, res) => {
  const raw = String(req.query.ids || '').trim();
  if (!raw) return res.status(400).json({ error: 'ids required' });

  const ids = raw
    .split(',')
    .map(s => parseInt(s, 10))
    .filter(n => Number.isInteger(n) && n > 0);
  if (!ids.length) return res.status(400).json({ error: 'no valid ids' });
  if (ids.length > MAX_IDS) return res.status(400).json({ error: `too many ids (max ${MAX_IDS})` });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('questions')
    .select('id,text,option_a,option_b,option_c,option_d,correct_key,category_id')
    .in('id', ids);
  if (error) throw error;

  // Preserve caller-provided order (so the UI shows bookmarks in the order the
  // user saved them).
  const order = new Map(ids.map((id, i) => [id, i]));
  (data || []).sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9));

  res.setHeader('Cache-Control', 'private, max-age=60');
  return res.status(200).json(data || []);
});
