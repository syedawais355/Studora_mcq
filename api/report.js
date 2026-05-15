import { getSupabase } from '../lib/supabase.js';
import { withGuards, clientIp } from '../lib/middleware.js';
import { createHash } from 'node:crypto';

const VALID_REASONS = new Set([
  'wrong_answer', 'typo', 'outdated', 'unclear', 'offensive', 'other',
]);
const MAX_DETAILS = 600;

// Robust JSON body parse — Vercel's serverless wrapper may or may not have
// parsed it for us depending on Content-Type.
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return await new Promise((resolve) => {
    let buf = '';
    req.on('data', c => { buf += c; if (buf.length > 8192) { req.destroy(); resolve(null); } });
    req.on('end', () => { try { resolve(JSON.parse(buf)); } catch { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}

function hashIp(ip) {
  return createHash('sha256').update(`studora:${ip || 'unknown'}`).digest('hex').slice(0, 32);
}

export default withGuards({ ratePerMin: 10, methods: ['POST'] }, async (req, res) => {
  const body = await readJson(req);
  if (!body) return res.status(400).json({ error: 'Invalid JSON body' });

  const qid = parseInt(body.question_id, 10);
  if (!Number.isInteger(qid) || qid < 1) {
    return res.status(400).json({ error: 'Invalid question_id' });
  }
  const reason = String(body.reason || '').trim();
  if (!VALID_REASONS.has(reason)) {
    return res.status(400).json({ error: 'Invalid reason' });
  }
  const details = String(body.details || '').trim().slice(0, MAX_DETAILS) || null;

  const ipHash = hashIp(clientIp(req));
  const userId = typeof body.user_id === 'string' ? body.user_id.slice(0, 64) : null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('mcq_reports')
    .insert({ question_id: qid, reason, details, ip_hash: ipHash, user_id: userId })
    .select('id')
    .maybeSingle();

  // Graceful fallback: if the table hasn't been created yet, treat the report
  // as accepted (so the UI flow works) and log so the operator sees it.
  if (error) {
    const missingTable = /relation .*mcq_reports.* does not exist|in the schema cache/i.test(error.message);
    if (missingTable) {
      console.error('REPORT (no table)', JSON.stringify({ qid, reason, details, ipHash }));
      return res.status(200).json({ ok: true, persisted: false });
    }
    // Unique-index dedupe: the visitor already reported this question — return success silently.
    if (error.code === '23505') {
      return res.status(200).json({ ok: true, deduped: true });
    }
    throw error;
  }

  return res.status(200).json({ ok: true, id: data?.id ?? null });
});
