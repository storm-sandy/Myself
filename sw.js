const CACHE_NAME = "mynotes-foolproof-v1";

// Install & activate instantly
self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Universal Cache & Network Fetch Handler
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        
        // Background fetch to update cache and save newly requested files automatically
        const backgroundFetch = fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // Offline navigation fallback to index.html for Single Page Apps
            if (event.request.mode === "navigate") {
              return cache.match("./index.html");
            }
          });

        return cachedResponse || backgroundFetch;
      });
    })
  );
});
