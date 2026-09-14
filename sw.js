const CACHE_NAME = "mynotes-runtime-v5";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./logo.jpg",
  "./app.js",
  "./manifest.json",
  "./vendor/sql-wasm.js",
  "./vendor/sql-wasm.wasm"
];

// 1. Install Event: Pre-cache core assets AND automatically extract/cache links from index.html
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Step A: Cache primary core files safely one by one
      for (const url of CORE_ASSETS) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn(`[SW] Failed core cache for: ${url}`, err);
        }
      }

      // Step B: Fetch index.html and dynamically parse local href/src links
      try {
        const response = await fetch("./index.html");
        const htmlText = await response.text();

        const matches = htmlText.matchAll(/(?:href|src)=["']([^"'#]+)["']/g);
        const discoveredUrls = new Set();

        for (const match of matches) {
          let rawUrl = match[1].trim();

          // Filter out external links, data URIs, mailto, etc.
          if (
            !rawUrl.startsWith("http://") &&
            !rawUrl.startsWith("https://") &&
            !rawUrl.startsWith("data:") &&
            !rawUrl.startsWith("mailto:") &&
            !rawUrl.startsWith("javascript:")
          ) {
            // Normalize relative paths against the root scope
            let cleanUrl = rawUrl.startsWith("/") ? "." + rawUrl : (rawUrl.startsWith("./") ? rawUrl : "./" + rawUrl);
            discoveredUrls.add(cleanUrl);
          }
        }

        const uniqueUrls = [...discoveredUrls];
        console.log("[Service Worker] Auto-discovered links from index.html:", uniqueUrls);

        // Cache discovered links individually
        for (const url of uniqueUrls) {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn(`[SW] Skipped uncacheable link: ${url}`, err);
          }
        }
      } catch (error) {
        console.warn("[Service Worker] Could not parse index.html links during install:", error);
      }
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up old caches and take control instantly
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

// 3. Fetch Event: Cache-First with Dynamic Runtime Caching & Offline Navigation Fallback
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then(networkResponse => {
          // Do not cache bad responses or non-GET-compatible types unless opaque
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
          // Fallback to index.html for navigation requests when offline
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
