const CACHE_NAME = "mynotes-runtime-v4";

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

// 1. Install Event: Pre-cache core assets AND automatically extract/cache all links inside index.html
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Step A: Cache primary core files
      await Promise.all(
        CORE_ASSETS.map(url => cache.add(url).catch(err => console.warn(`[SW] Failed core cache: ${url}`, err)))
      );

      // Step B: Fetch index.html and dynamically parse all local href/src links
      try {
        const response = await fetch("./index.html");
        const htmlText = await response.text();

        // Extract all attributes using href="..." or src="..."
        const matches = htmlText.matchAll(/(?:href|src)=["']([^"']+)["']/g);
        const discoveredUrls = [];

        for (const match of matches) {
          let url = match[1];
          // Keep only local relative links (ignore external links, anchors, or scripts like data URIs)
          if (!url.startsWith("http") && !url.startsWith("data:") && !url.startsWith("#") && !url.startsWith("mailto:")) {
            if (!url.startsWith("./") && !url.startsWith("/")) {
              url = "./" + url;
            }
            discoveredUrls.push(url);
          }
        }

        // Deduplicate links
        const uniqueUrls = [...new Set(discoveredUrls)];
        console.log("[Service Worker] Auto-discovered links from index.html:", uniqueUrls);

        // Cache discovered links individually
        await Promise.all(
          uniqueUrls.map(url => cache.add(url).catch(err => console.warn(`[SW] Skipped uncacheable link: ${url}`, err)))
        );
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

// 3. Fetch Event: Cache-First with Dynamic Runtime Caching & Offline Fallback
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

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
          // Fallback to index.html for navigation when offline
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
 