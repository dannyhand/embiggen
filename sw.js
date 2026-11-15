// Embiggen service worker: makes the app installable and work offline.
// Bump VERSION whenever you deploy changes so phones pick up the new files.
const VERSION = 'embiggen-v4';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
  './rs/', './rs/index.html', './rs/fonts/runescape.ttf'];

self.addEventListener('install', (event) => {
  // cache: 'reload' skips the browser's HTTP cache so we store the files actually on the server.
  event.waitUntil(caches.open(VERSION).then((c) =>
    c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // Pages: network first, so you always see the latest HTML when online; cached copy when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(async () => (await caches.match(req, { ignoreSearch: true })) || caches.match('./index.html'))
    );
    return;
  }

  // Everything else (icons, fonts): cache first, refresh in the background.
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => { if (res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => cached);
      return cached || network;
    })
  );
});
