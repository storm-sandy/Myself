const CACHE_NAME = "mynotes-auto-crawl-v1";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json"
];

// 1. Install Event: Automatically crawl index.html and cache every discovered asset
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Step A: Cache absolute core essentials first
      for (const asset of CORE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn("[SW] Could not cache core asset:", asset);
        }
      }

      // Step B: Automatically fetch index.html and parse all local links
      try {
        const response = await fetch("./index.html");
        const htmlText = await response.text();

        // Extract all href="..." and src="..." values
        const matches = htmlText.matchAll(/(?:href|src)=["']([^"'#]+)["']/g);
        const discoveredUrls = new Set();

        for (const match of matches) {
          let rawUrl = match[1].trim();

          // Filter out external websites, data streams, and mail links
          if (
            !rawUrl.startsWith("http://") &&
            !rawUrl.startsWith("https://") &&
            !rawUrl.startsWith("data:") &&
            !rawUrl.startsWith("mailto:") &&
            !rawUrl.startsWith("javascript:")
          ) {
            let cleanUrl = rawUrl.startsWith("/") ? "." + rawUrl : (rawUrl.startsWith("./") ? rawUrl : "./" + rawUrl);
            discoveredUrls.add(cleanUrl);
          }
        }

        console.log("[Service Worker] Automatically discovered and caching files from index.html:", [...discoveredUrls]);

        // Step C: Cache every single discovered file automatically
        for (const url of discoveredUrls) {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn(`[SW] Skipped uncacheable link: ${url}`, err);
          }
        }
      } catch (error) {
        console.warn("[Service Worker] Auto-crawl failed:", error);
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
            console.log("[Service Worker] Deleting outdated cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Stale-While-Revalidate Catch-All for any runtime requests
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        
        const backgroundFetch = fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            if (event.request.mode === "navigate") {
              return cache.match("./index.html");
            }
          });

        return cachedResponse || backgroundFetch;
      });
    })
  );
});
