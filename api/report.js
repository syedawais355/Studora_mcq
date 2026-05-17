import { getSupabase } from '../lib/supabase.js';
import { withGuards, clientIp } from '../lib/middleware.js';
import { createHash } from 'node:crypto';

const VALID_REASONS = new Set([
  'wrong_answer', 'typo', 'outdated', 'unclear', 'offensive', 'other',
]);
const MAX_DETAILS = 1000;

// Strict allowlist of accepted body keys (#49). Rejecting unknown keys at the
// boundary is cheap defence-in-depth against mass-assignment regressions: if
// a future refactor adds a column to mcq_reports and a teammate forgets to
// scrub the input shape, an attacker can't smuggle the new column through
// here. Update this set deliberately when the contract changes.
const ALLOWED_KEYS = new Set(['question_id', 'reason', 'details']);

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

// Strip ASCII control characters from free-text input (#48). Tabs and
// newlines stay because triage notes do contain line breaks; everything
// else in the 0x00–0x1F range is rejected — null bytes, vertical tabs,
// form feeds, and the assorted control codes have no legitimate place in
// a user-typed bug report and are the usual building blocks of log
// injection and terminal-escape payloads. DEL (0x7F) goes too.
function sanitiseDetails(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  // eslint-disable-next-line no-control-regex
  const stripped = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  const capped = stripped.slice(0, MAX_DETAILS);
  return capped || null;
}

export default withGuards({ ratePerMin: 10, methods: ['POST'] }, async (req, res) => {
  const body = await readJson(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  // Reject any unexpected keys before doing anything else (#49). Surface the
  // offending key in the error so honest clients can self-diagnose; attackers
  // already know what they tried to send.
  for (const k of Object.keys(body)) {
    if (!ALLOWED_KEYS.has(k)) {
      return res.status(400).json({ error: `Unexpected field: ${k}` });
    }
  }

  const qid = parseInt(body.question_id, 10);
  if (!Number.isInteger(qid) || qid < 1) {
    return res.status(400).json({ error: 'Invalid question_id' });
  }
  const reason = String(body.reason || '').trim();
  if (!VALID_REASONS.has(reason)) {
    return res.status(400).json({ error: 'Invalid reason' });
  }
  const details = sanitiseDetails(body.details);

  const ipHash = hashIp(clientIp(req));

  // #48: user_id is NEVER taken from the request body. The old endpoint
  // accepted body.user_id and inserted it verbatim, which let any caller
  // attribute reports to an arbitrary victim. The mcq_reports table still
  // has a user_id column (other systems may read it) so we explicitly write
  // null from here — server-trusted identity isn't available on this
  // anonymous endpoint, and dedupe relies on ip_hash alone.
  const userId = null;

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
