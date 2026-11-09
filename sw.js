// 离线缓存：先用缓存秒开，后台再取新版本；新版本和缓存不一样时通知页面“可以刷新了”
const CACHE = 'xiaojinku-v4';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === 'navigate' || /\/(index\.html)?$/.test(new URL(req.url).pathname);
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req, { cache: 'no-cache' }).then(async r => {
      if (r.ok) {
        if (hit && isPage) {
          const [a, b] = await Promise.all([hit.clone().text(), r.clone().text()]);
          if (a !== b) (await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })).forEach(cl => cl.postMessage({ type: 'update' }));
        }
        await c.put(req, r.clone());
      }
      return r;
    }).catch(() => hit);
    if (hit) { e.waitUntil(net); return hit; }
    return net;
  }));
});
