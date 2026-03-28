const CACHE = 'iranwatch-v6';

// ── INSTALL ──────────────────────────────────────────────────────────────────
// Only precache the minimal app shell that is guaranteed to exist.
// Vite's hashed assets (/assets/index-xxx.js) are cached at runtime below.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(['/', '/index.html']))
      .then(() => self.skipWaiting()),
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────────────────────
// Delete any stale cache versions from previous SW installs.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// ── FETCH ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never intercept proxy or external RSS requests — always go to network.
  if (url.pathname.startsWith('/proxy')) return;

  // Network-first for navigations and feeds.json (must always be fresh).
  if (e.request.mode === 'navigate' || url.pathname === '/feeds.json') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(e.request).then(
            (cached) => cached ?? new Response('', { status: 503 }),
          ),
        ),
    );
    return;
  }

  // Cache-first for Vite's hashed assets and fonts (immutable).
  if (url.pathname.startsWith('/assets/') || url.hostname.includes('fonts.g')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        });
      }),
    );
    return;
  }
});
