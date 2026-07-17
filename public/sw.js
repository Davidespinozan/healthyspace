// Service worker mínimo — habilita "Agregar a inicio" (PWA instalable).
// Cache-first del shell para arranque instantáneo; la app es SPA, así que
// siempre sirve index.html en navegación.
const CACHE = 'hs-shell-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/index.html'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  // Navegación → SPA shell (offline-friendly).
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }
  // Resto → cache-first con relleno.
  e.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((res) => {
      const copy = res.clone();
      if (res.ok && new URL(request.url).origin === location.origin) {
        caches.open(CACHE).then((c) => c.put(request, copy));
      }
      return res;
    })),
  );
});
