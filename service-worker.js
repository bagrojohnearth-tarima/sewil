const CACHE_NAME = 'mayorga-health-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './script.js',
  './style.css',
  './data/facilities.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/icon?family=Material+Icons'
];

// Installation event: Cache application shell assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activation event: Clear old runtime caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
});

// Fetching network strategies: Intercept requests to serve cached data while offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      
      return fetch(event.request).then(networkResponse => {
        // Cache map tile layers dynamically as the user explores the map
        if (event.request.url.includes('tile.openstreetmap.org') || event.request.url.includes('arcgisonline.com')) {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback gracefully if no connection is active
        return null;
      });
    })
  );
});