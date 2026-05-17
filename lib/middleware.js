// Edge middleware: rate limit, origin validation, CORS, security headers.
// In-process Map — Vercel functions get torn down occasionally so this is best-effort.
const rateLimitStore = new Map();
const RL_MAX_KEYS = 5000;

export function rateLimit(identifier, maxRequests, windowMs) {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    if (rateLimitStore.size >= RL_MAX_KEYS) {
      const firstKey = rateLimitStore.keys().next().value;
      if (firstKey) rateLimitStore.delete(firstKey);
    }
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) return false;
  record.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, r] of rateLimitStore.entries()) if (now > r.resetAt) rateLimitStore.delete(k);
}, 60000).unref?.();

// Loose but useful sanity check for IPv4/IPv6. We're not validating that the
// address is routable, only that it isn't an obvious injection attempt — an
// attacker who can set request headers should not be able to use the IP
// header as a rate-limit-key oracle by stuffing arbitrary strings into it.
const IP_RE = /^(?:(?:\d{1,3}\.){3}\d{1,3}|[a-fA-F0-9:]+|::1|::)$/;

function sanitiseIp(candidate) {
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.length > 45) return null; // longest valid IPv6 string is 45 chars
  return IP_RE.test(trimmed) ? trimmed : null;
}

// Pick the most trustworthy client IP available (#45).
//
// Header precedence in front of a Vercel deployment:
//   1. x-vercel-forwarded-for  — set by the Vercel edge, not user-supplied
//   2. last value of x-forwarded-for — the hop closest to our origin; only
//      the entry our trusted upstream added is reliable, the earlier ones
//      can be forged by the client
//   3. x-real-ip                — usable when the platform sets it, but
//      trivially spoofable on bare-Node deployments so it sits below XFF
//   4. socket.remoteAddress     — the TCP peer; correct in dev / direct hits
//   5. 'unknown'                — give up rather than mis-key the limiter
//
// Each candidate is sanity-checked against IP_RE so a header like
// "X-Real-IP: ' OR 1=1 --" can't be turned into a fresh rate-limit bucket.
export function clientIp(req) {
  const candidates = [
    req.headers['x-vercel-forwarded-for'],
    ((h) => {
      if (typeof h !== 'string' || !h) return null;
      const parts = h.split(',');
      return parts[parts.length - 1];
    })(req.headers['x-forwarded-for']),
    req.headers['x-real-ip'],
    req.socket?.remoteAddress,
  ];
  for (const c of candidates) {
    const ok = sanitiseIp(c);
    if (ok) return ok;
  }
  return 'unknown';
}

// Cheap 4-char hash prefix of an arbitrary string. Used by
// expensiveRateLimitKey() to fold the User-Agent into the rate-limit key
// without bloating it. djb2 is fine here — we only need spread, not
// collision resistance.
function ua4(input) {
  const s = typeof input === 'string' ? input : '';
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36).padStart(7, '0').slice(0, 4);
}

// Rate-limit key for expensive endpoints (#45). PDF generation and similar
// heavy handlers are currently keyed only by IP, so a client that rotates
// X-Forwarded-For / X-Real-IP through a small pool of forged values can
// multiply the effective cap by the size of the pool. Mixing in a short
// hash of the User-Agent splits the bucket across UA variants too — an
// attacker has to rotate BOTH headers in lockstep to gain anything, and
// even then each unique (IP, UA) combo still pays its own toll.
//
// Returns the string to pass as the first argument to rateLimit(). The
// existing withGuards() path keeps using clientIp() alone; the heavy PDF
// handlers in api/exam-pdf.js and api/category-pdf.js should adopt this
// helper in a follow-up PR (tracked separately so this change stays
// scoped to lib/middleware.js).
export function expensiveRateLimitKey(req) {
  const ip   = clientIp(req);
  const path = (req.url || '').split('?')[0];
  const tag  = ua4(req.headers['user-agent']);
  return `${ip}:${tag}:${path}`;
}

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(o => o.trim()).filter(Boolean);

const isDev = () => process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production';

export function validateOrigin(req) {
  if (isDev()) return true;
  if (!ALLOWED_ORIGINS.length) return false;

  const origin  = req.headers['origin']  || '';
  const referer = req.headers['referer'] || '';
  if (!origin && !referer) return false;
  return ALLOWED_ORIGINS.some(o => origin === o || referer.startsWith(o));
}

export function corsHeaders(res, req, allowMethods = 'GET, OPTIONS') {
  const origin = req?.headers?.['origin'];
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] || (isDev() ? '*' : 'null'));
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', allowMethods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

// withGuards({ ratePerMin, methods }, handler)
//   - ratePerMin: per-IP+path limit (default 60)
//   - methods:    array of allowed HTTP verbs; default ['GET']. OPTIONS is always
//                 permitted (CORS preflight).
export function withGuards({ ratePerMin = 60, methods = ['GET'] } = {}, handler) {
  const allowed = new Set(methods.map(m => m.toUpperCase()));
  const allowHeader = [...allowed, 'OPTIONS'].join(', ');
  return async (req, res) => {
    if (!validateOrigin(req)) return res.status(403).json({ error: 'Forbidden' });
    corsHeaders(res, req, allowHeader);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (!allowed.has(req.method)) {
      res.setHeader('Allow', allowHeader);
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const ip = clientIp(req);
    if (!rateLimit(`${ip}:${req.url?.split('?')[0]}`, ratePerMin, 60000)) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ error: 'Too many requests' });
    }
    try {
      return await handler(req, res);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error('endpoint_error', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
