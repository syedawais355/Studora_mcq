// Studora service worker. Three rules:
//   1. Navigations: network-first, fall back to cached index.html so deep
//      links keep working when the connection drops.
//   2. /assets/*  : cache-first with background revalidation (stale-while-
//      revalidate). The app shell loads instantly even on a flaky network.
//   3. /api/*     : network-only. Live data must not be served stale.
//
// CACHE_VERSION is bumped automatically by scripts/stamp-version.mjs since the
// service worker file goes through the same stamping pass.

const CACHE_VERSION = 'studora-v1-1778642504';
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
    event.respondWith(
      caches.open(CACHE_VERSION).then(async cache => {
        const cached = await cache.match(req);
        const networkFetch = fetch(req).then(res => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => cached); // network died — fall back to cached if present
        return cached || networkFetch;
      })
    );
  }
});
