/* Kiwi Play offline support. Only removes its own old caches (other apps share this web address). Everything is served from the tablet's saved copy first, so the app opens with no connection.
   When online, each file is quietly re-downloaded in the background; the new copy is used the next time the app opens. */
const CACHE = 'jla-v1-13';
const FILES = ['./', 'index.html', 'style.css', 'art.js', 'games.js', 'pages.js', 'app.js', 'lessons.json', 'stories.json', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.indexOf('jla-') === 0 && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== self.location.origin && !font) return;
  e.respondWith(caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => {
    const net = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return net.then((res) => res || (req.mode === 'navigate' ? c.match('index.html') : new Response('', { status: 504 })));
  })));
});
