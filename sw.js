const CACHE = 'organizer-v3';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // GitHub API: asla önbelleğe alma, doğrudan ağa git
  if (url.hostname === 'api.github.com') return;

  // data.json: önce ağ (her zaman güncel), ağ yoksa son önbellek
  if (url.origin === location.origin && url.pathname.endsWith('/data.json')) {
    const key = url.origin + url.pathname;
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(key, copy));
        }
        return res;
      }).catch(() => caches.match(key).then(hit => hit || Response.error()))
    );
    return;
  }

  // Diğerleri: önce önbellek, arkadan güncelle (çevrimdışı çalışsın)
  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
