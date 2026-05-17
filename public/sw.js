// Studora service worker. Three rules:
//   1. Navigations: network-first, fall back to cached index.html so deep
//      links keep working when the connection drops.
//   2. /assets/*  : cache-first with background revalidation (stale-while-
//      revalidate). The app shell loads instantly even on a flaky network.
//   3. /api/*     : network-only. Live data must not be served stale.
//
// CACHE_VERSION is bumped automatically by scripts/stamp-version.mjs since the
// service worker file goes through the same stamping pass.

const CACHE_VERSION = 'studora-v2-1778642504';
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/assets/img/studora-logo.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only GET is cacheable.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Cross-origin (fonts.googleapis.com etc.) — let the browser handle it.
  if (url.origin !== self.location.origin) return;

  // 3. API — network only, never cached.
  if (url.pathname.startsWith('/api/')) return;

  // 1. Navigations — network-first, fall back to cached index.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match('/').then(r => r || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  // 2. Static assets — stale-while-revalidate from the versioned cache.
  if (url.pathname.startsWith('/assets/') || url.pathname === '/manifest.webmanifest') {
    // Strip the cache-buster querystring (`?v=…`) before using the URL as a
    // cache key. The stamp-version build step rewrites every asset URL each
    // deploy, but the bytes behind a given pathname are immutable per the
    // hashed filenames + far-future Cache-Control. Keying on the bare
    // pathname means:
    //   • cache entries survive deploys when the file content hasn't moved,
    //     so users don't re-download identical bytes on every push;
    //   • the cache never accumulates one entry per historical `?v=` value,
    //     which used to leave storage growing unbounded across deploys.
    const cacheKey = new Request(url.origin + url.pathname, {
      method: 'GET',
      credentials: req.credentials,
      mode: req.mode,
    });
    event.respondWith(
      caches.open(CACHE_VERSION).then(async cache => {
        const cached = await cache.match(cacheKey);
        const networkFetch = fetch(req).then(res => {
          // Strict cache-write gate (#46). A `res.ok` response can still be
          // wrong — a 204, a partial body, or HTML returned for a .js URL
          // during an incident or mis-deploy. If we put any of those in the
          // cache, every visiting client pins the bad asset until they
          // manually clear storage. Better to under-cache than to enshrine
          // a broken response.
          if (isCacheable(url, res)) cache.put(cacheKey, res.clone());
          return res;
        }).catch(() => cached); // network died — fall back to cached if present
        return cached || networkFetch;
      })
    );
  }
});

// Returns true only when the response is safe to persist. Validates status,
// non-empty body, and Content-Type matches what the file extension claims.
// Unknown extensions fall through to the loose 200+length check so we don't
// regress on assets that don't fit the listed buckets.
function isCacheable(url, res) {
  if (!res || res.status !== 200) return false;
  const len = parseInt(res.headers.get('Content-Length') || '', 10);
  if (!Number.isFinite(len) || len <= 0) return false;
  const ct = (res.headers.get('Content-Type') || '').toLowerCase();
  const path = url.pathname.toLowerCase();
  if (path.endsWith('.js') || path.endsWith('.mjs')) {
    return ct.startsWith('application/javascript') || ct.startsWith('text/javascript');
  }
  if (path.endsWith('.css')) {
    return ct.startsWith('text/css');
  }
  if (path.endsWith('.woff2')) {
    return ct === 'font/woff2';
  }
  if (path.endsWith('.svg')) {
    return ct.includes('image/svg+xml');
  }
  return true; // images, json, manifest, etc. — status + length are enough
}

// Ops kill switch (#46). When an incident is detected (bad cached asset,
// stale shell pinning users to a broken build), the page can post
// {type: 'CLEAR_CACHE'} and we drop every cache the SW owns. The reply on
// event.ports[0] lets the caller wait for confirmation before reloading.
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'CLEAR_CACHE') return;
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      event.ports?.[0]?.postMessage({ ok: true, cleared: keys.length });
    } catch (err) {
      event.ports?.[0]?.postMessage({ ok: false, error: String(err) });
    }
  })());
});
