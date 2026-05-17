// CSP violation report sink.
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

import { withGuards } from '../lib/middleware.js';

const MAX_BYTES = 8 * 1024;

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return await new Promise((resolve) => {
    let buf = '';
    req.on('data', (chunk) => {
      buf += chunk;
      if (buf.length > MAX_BYTES) { req.destroy(); resolve(null); }
    });
    req.on('end', () => { try { resolve(JSON.parse(buf)); } catch { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}

// Pull the interesting fields out of either report shape so the log line is
// short and grep-able. Unknown shapes fall through to a single "shape=unknown"
// marker — we still want a heartbeat that a report came in.
function summarise(payload) {
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

export default withGuards({ ratePerMin: 30, methods: ['POST'] }, async (req, res) => {
  const payload = await readBody(req);
  const summary = summarise(payload);
  // One log line per request so a `grep CSP_REPORT` in Vercel logs gives a
  // clean feed of violations without dumping full payloads.
  console.log('CSP_REPORT', JSON.stringify(summary));
  return res.status(204).end();
});
