const CACHE_NAME = "mynotes-runtime-v2";

// Core shell assets to pre-cache immediately on install
const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./logo.jpg",
  "./app.js",
  "./manifest.json",
  "./vendor/sql-wasm.js",
  "./vendor/sql-wasm.wasm"
];

// 1. Install Event: Pre-cache core app shell
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log("[Service Worker] Pre-caching core shell assets");
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up old version caches and take control immediately
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Deleting outdated cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Cache-First with Runtime Dynamic Caching
self.addEventListener("fetch", event => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return cached asset instantly if available
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, fetch it from the network dynamically ("Runtime Caching")
      return fetch(event.request)
        .then(networkResponse => {
          // Verify valid response before caching
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          // Clone response because streams can only be consumed once (one for browser, one for cache)
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
            console.log("[Service Worker] Dynamically cached new file:", event.request.url);
          });

          return networkResponse;
        })
        .catch(error => {
          console.warn("[Service Worker] Fetch failed (offline mode):", event.request.url);

          // Fallback for Single Page Apps (SPA navigation): if user navigates to a route while offline, serve index.html
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }

          throw error;
        });
    })
  );
});
