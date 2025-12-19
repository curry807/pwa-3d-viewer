
const VERSION = '3d-v1.0.0';
const STATIC_CACHE = `static-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`; // models & textures
const OFFLINE_URL = 'offline.html';

const PRECACHE_URLS = [
  './',
  'index.html',
  'viewer.html',
  'styles.css',
  'main.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon-180.png',
  OFFLINE_URL,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => ![STATIC_CACHE, ASSET_CACHE].includes(k)).map(k => caches.delete(k)));
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isModelAsset(url) {
  return /(\.glb|\.gltf|\.bin|\.ktx2|\.basis|\.png|\.jpg|\.jpeg|\.webp)$/i.test(url.pathname);
}

async function limitCacheSize(cacheName, maxEntries = 30) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    // delete oldest first (keys order is insertion order in most browsers)
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxEntries);
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Static shell: prefer cache (stale-while-revalidate)
  if (event.request.destination === 'document' || event.request.destination === 'style' || event.request.destination === 'script') {

    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(event.request);
      const networkPromise = fetch(event.request).then(async (resp) => {
        if (resp && resp.status === 200) await cache.put(event.request, resp.clone());
        return resp;
      }).catch(async () => cached || (await cache.match(OFFLINE_URL)));
      return cached || networkPromise;
    })());
    return;
  }

  // 3D assets: Cache First + background update
  if (isModelAsset(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(event.request);
      if (cached) {
        // kick off background update
        fetch(event.request).then(async (resp) => {
          if (resp && resp.status === 200) {
            await cache.put(event.request, resp.clone());
            await limitCacheSize(ASSET_CACHE, 50);
          }
        }).catch(() => {});
        return cached;
      }
      try {
        const resp = await fetch(event.request);
        if (resp && resp.status === 200) {
          await cache.put(event.request, resp.clone());
          await limitCacheSize(ASSET_CACHE, 50);
        }
        return resp;
      } catch (e) {
        const fallback = await caches.match(OFFLINE_URL);
        return fallback || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Default: network, fallback to cache/offline
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      return cached || (await caches.match(OFFLINE_URL));
    })
  );
});
