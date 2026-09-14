const CACHE_NAME = "mynotes-runtime-v6";


// List the files you want guaranteed offline immediately
const INITIAL_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

// 1. Install: Cache core shell immediately
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(INITIAL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate: Clean up old versions
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch: Stale-While-Revalidate (Instant load from cache, updates changed files in background)
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        // Fetch from network in the background to check for updates
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            // Only update cache if the file changed (handled by browser network stack & cache put)
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Network failed, ignore so cachedResponse can handle it
        });

        // Return cached response instantly if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});
