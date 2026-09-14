const CACHE_NAME = "mynotes-everything-v1";

// 1. Install Event: Skip waiting to activate immediately
self.addEventListener("install", event => {
  self.skipWaiting();
});

// 2. Activate Event: Clean up old caches and take control of all open windows/tabs instantly
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Universal Stale-While-Revalidate Catch-All
self.addEventListener("fetch", event => {
  // Only handle standard GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        
        // Background network request to check for updates and cache newly encountered files automatically
        const backgroundFetch = fetch(event.request)
          .then(networkResponse => {
            // Cache valid 200 responses or cross-origin opaque responses
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // If offline and not in cache, fallback to index.html for single-page app navigations
            if (event.request.mode === "navigate") {
              return cache.match("./index.html");
            }
          });

        // Return cached version instantly if available; otherwise wait for the network response
        return cachedResponse || backgroundFetch;
      });
    })
  );
});
