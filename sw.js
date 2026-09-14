const CACHE_NAME = "mynotes-runtime-v3";

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

// 1. Install Event: Resilient Pre-caching (Won't fail completely if one asset is missing)
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log("[Service Worker] Caching core assets individually");
        return Promise.all(
          PRECACHE_ASSETS.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`[Service Worker] Failed to pre-cache non-critical file: ${url}`, err);
            });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up old caches and take control of pages immediately
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

// 3. Fetch Event: Cache-First with Runtime Caching & Offline Fallback
self.addEventListener("fetch", event => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not cached, try fetching from network and runtime-cache it
      return fetch(event.request)
        .then(networkResponse => {
          if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          console.warn("[Service Worker] Offline fetch failed for:", event.request.url);

          // Fallback for HTML page navigation when offline
          if (event.request.mode === "navigate" || (event.request.headers.get("accept") && event.request.headers.get("accept").includes("text/html"))) {
            return caches.match("./index.html").then(res => {
              if (res) return res;
              return caches.match("./");
            });
          }
        });
    })
  );
});
