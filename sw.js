/* Rashid Register - offline shell.
   The page itself is network-first so updates land as soon as they are pushed;
   icons and fonts are cache-first. Register data never passes through here. */
const V = 'rashid-v29';
const SHELL = ['./', './index.html', './manifest.webmanifest',
               './icon-192.png', './icon-512.png', './icon-maskable-512.png',
               './apple-touch-icon.png', './favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // never touch the GitHub API - that is live data and must not be cached
  if (url.hostname === 'api.github.com') return;

  const isPage = req.mode === 'navigate' ||
                 (url.origin === location.origin && url.pathname.endsWith('/')) ||
                 url.pathname.endsWith('index.html');

  if (isPage) {
    e.respondWith(
      fetch(req)
        .then(r => { const copy = r.clone(); caches.open(V).then(c => c.put('./index.html', copy)); return r; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok && (url.origin === location.origin || url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com'))) {
        const copy = r.clone(); caches.open(V).then(c => c.put(req, copy));
      }
      return r;
    }).catch(() => new Response('', {status: 504, statusText: 'offline'})))
  );
});
