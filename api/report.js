// Dual-purpose endpoint: question-report (the main job) and CSP-violation sink.
//
// Why both live here: the Vercel Hobby plan caps a deployment at 12 serverless
// functions, and we were sitting at 14. Folding the CSP report sink into this
// file (and a similar fold of the results landing page into share-card) brings
// us under the limit without losing any feature. Each branch keeps its own
// rate-limit / method guard so the security posture is unchanged from when
// these were two files.
//
// Routing:
//   - CSP reports arrive with Content-Type: application/csp-report (legacy
//     report-uri) or application/reports+json (Reporting API). vercel.json
//     rewrites /api/csp-report -> /api/report?_csp=1 so we have both the
//     query-param hint AND the Content-Type signal — either is sufficient.
//   - Everything else (plain application/json POSTs from the in-app "report
//     this question" UI) takes the question-report path.

import { getSupabase } from '../lib/supabase.js';
import { withGuards, clientIp } from '../lib/middleware.js';
import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function contentTypeOf(req) {
  const ct = req.headers?.['content-type'] || '';
  return String(ct).toLowerCase().split(';')[0].trim();
}

function isCspReportRequest(req) {
  const ct = contentTypeOf(req);
  if (ct === 'application/csp-report' || ct === 'application/reports+json') return true;
  // Vercel rewrites /api/csp-report -> /api/report?_csp=1. Either the original
  // URL prefix (when rewrite is bypassed in tests / curl) or the discriminator
  // query proves intent.
  if (typeof req.url === 'string') {
    if (req.url.startsWith('/api/csp-report')) return true;
    if (req.url.includes('_csp=1')) return true;
  }
  if (req.query && req.query._csp === '1') return true;
  return false;
}

// ---------------------------------------------------------------------------
// Question-report branch (original /api/report logic)
// ---------------------------------------------------------------------------

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

const questionReportHandler = withGuards({ ratePerMin: 10, methods: ['POST'] }, async (req, res) => {
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

// ---------------------------------------------------------------------------
// CSP-report branch (formerly /api/csp-report)
// ---------------------------------------------------------------------------
//
// The browser POSTs here whenever the Content-Security-Policy header rejects
// a resource. Two report formats arrive in the wild:
//
//   - Legacy "report-uri": Content-Type: application/csp-report — body is
//     { "csp-report": { ... violation fields ... } }
//   - Modern "report-to" / Reporting API: Content-Type: application/reports+json
//     — body is an array of report envelopes [{ type, age, url, body }, ...]
//
// We accept both, log a compact summary to Vercel function logs for operator
// visibility, and reply 204 No Content. There is no persistence — these
// reports are noisy (every browser extension and ad blocker triggers them)
// and storing them would invite an attacker-controlled write amplification.
//
// Hardening notes:
//   - withGuards keeps the rate cap tight (30/min/ip) so a misbehaving page
//     in one tab can't flood our logs.
//   - The payload is read into a bounded buffer (8 KiB) so a malicious client
//     can't exhaust function memory.
//   - We never echo report content back into the response body.

const CSP_MAX_BYTES = 8 * 1024;

async function readCspBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return await new Promise((resolve) => {
    let buf = '';
    req.on('data', (chunk) => {
      buf += chunk;
      if (buf.length > CSP_MAX_BYTES) { req.destroy(); resolve(null); }
    });
    req.on('end', () => { try { resolve(JSON.parse(buf)); } catch { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}

// Pull the interesting fields out of either report shape so the log line is
// short and grep-able. Unknown shapes fall through to a single "shape=unknown"
// marker — we still want a heartbeat that a report came in.
function summariseCsp(payload) {
  if (!payload) return { shape: 'empty' };
  if (Array.isArray(payload)) {
    // Reporting API envelope
    return payload.slice(0, 5).map((r) => {
      const b = r?.body || {};
      return {
        shape: 'reports+json',
        url: r?.url,
        directive: b['effective-directive'] || b['violated-directive'],
        blocked: b['blocked-url'] || b['blockedURL'],
        source: b['source-file'] || b['sourceFile'],
        line: b['line-number'] || b['lineNumber'],
        disposition: b['disposition'],
      };
    });
  }
  if (payload['csp-report']) {
    const r = payload['csp-report'];
    return {
      shape: 'csp-report',
      url: r['document-uri'],
      directive: r['effective-directive'] || r['violated-directive'],
      blocked: r['blocked-uri'],
      source: r['source-file'],
      line: r['line-number'],
      disposition: r['disposition'],
    };
  }
  return { shape: 'unknown' };
}

const cspReportHandler = withGuards({ ratePerMin: 30, methods: ['POST'] }, async (req, res) => {
  const payload = await readCspBody(req);
  const summary = summariseCsp(payload);
  // One log line per request so a `grep CSP_REPORT` in Vercel logs gives a
  // clean feed of violations without dumping full payloads.
  console.log('CSP_REPORT', JSON.stringify(summary));
  return res.status(204).end();
});

// ---------------------------------------------------------------------------
// Top-level dispatcher
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  if (isCspReportRequest(req)) return cspReportHandler(req, res);
  return questionReportHandler(req, res);
}
