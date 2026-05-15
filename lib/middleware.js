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

export function clientIp(req) {
  return (req.headers['x-real-ip']
       || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
       || req.socket?.remoteAddress
       || 'unknown');
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
