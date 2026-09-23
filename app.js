// 1. Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(() => {
        console.log("[PWA] Service Worker registered successfully.");
        
        // 2. AUTOMATIC BACKGROUND CACHER (No clicking needed!)
        // This automatically scans your app for all local links and caches them instantly on startup
        setTimeout(autoCacheAllFiles, 1000);
      })
      .catch(err => console.error("[PWA] Registration failed:", err));
  });
}

function autoCacheAllFiles() {
  // Collect all local pages, scripts, styles, and links present in your app
  const filesToCache = new Set([
    "./",
    "./index.html",
    "/Myself/util/home.html",
    "/Myself/style/style.css",
    "/Myself/js/app.js",
    "/Myself/js/manifest.json",
    "./icon.png"
  ]);

  // Automatically find every single link or page referenced in your HTML elements
  document.querySelectorAll("a[href], link[href], script[src]").forEach(el => {
    let url = el.getAttribute("href") || el.getAttribute("src");
    if (url && !url.startsWith("http") && !url.startsWith("data:") && !url.startsWith("#")) {
      if (!url.startsWith("./") && !url.startsWith("/")) {
        url = "./" + url;
      }
      filesToCache.add(url);
    }
  });

  // Silently fetch every discovered file so the Service Worker catches and saves them all
  filesToCache.forEach(file => {
    fetch(file)
      .then(() => console.log(`[PWA Auto-Cache] Cached: ${file}`))
      .catch(() => {}); // Ignore if already cached or missing
  });
}

// 3. UI Update Banner Listeners
navigator.serviceWorker?.addEventListener('message', event => {
  if (event.data && event.data.type === 'UPDATE_READY') {
    const banner = document.getElementById('updateBanner');
    if (banner) banner.style.display = 'block';
  }
});

document.getElementById('updateBtn')?.addEventListener('click', () => {
  window.location.reload();
});
 