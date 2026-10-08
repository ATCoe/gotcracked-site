/* GotCracked customer PWA: cache the public shell only. Repair accounts and APIs stay network-only. */
const CACHE_NAME = 'gotcracked-customer-shell-v3';
const PUBLIC_SHELL = [
  '/',
  '/index.html',
  '/request.html',
  '/appointment.html',
  '/pc-build.html',
  '/privacy.html',
  '/styles.css',
  '/hardening.css',
  '/app.js',
  '/customer-pwa.js',
  '/assets/gotcracked-customer-app-icon-192.png?v=20260921-visual1',
  '/assets/gotcracked-customer-app-icon-512.png?v=20260921-visual1'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PUBLIC_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('gotcracked-customer-') && key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

function isPrivateOrDynamic(url) {
  return /^\/account(?:\.html)?\/?$/.test(url.pathname) || url.pathname.startsWith('/api/') || url.pathname.startsWith('/functions/');
}

function isCacheableAsset(request, url) {
  if (request.method !== 'GET' || url.origin !== self.location.origin || isPrivateOrDynamic(url)) return false;
  return ['style', 'script', 'image', 'font'].includes(request.destination);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Session-bearing account traffic, Supabase calls, and external resources must never be stored offline.
  if (url.origin !== self.location.origin || isPrivateOrDynamic(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(request, { ignoreSearch: true })) ||
        (await cache.match(`${url.pathname.replace(/\/$/, '')}.html`)) ||
        cache.match('/');
    }));
    return;
  }

  if (!isCacheableAsset(request, url)) return;
  event.respondWith(caches.match(request).then(cached => {
    const network = fetch(request).then(response => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        return caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).then(() => response);
      }
      return response;
    });
    if (cached) {
      // Keep revalidation alive and absorb offline failures when a cached asset is served.
      event.waitUntil(network.catch(() => undefined));
      return cached;
    }
    return network;
  }));
});

