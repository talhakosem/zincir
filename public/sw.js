// Service Worker - Zinciri Kırma
const CACHE_NAME = 'zinciri-kirma-v2';
const urlsToCache = [
  '/zincir/',
  '/zincir/index.html',
  '/zincir/style.css',
  '/zincir/script.js',
  '/zincir/manifest.json',
  '/zincir/mobile-setup.html'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache açıldı');
        return cache.addAll(urlsToCache);
      })
  );
});

// Cache ve network stratejisi
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache'de varsa onu döndür, yoksa network'ten al
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Eski cache'leri temizle
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 