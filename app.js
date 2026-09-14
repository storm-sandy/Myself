// 1. Register the Service Worker safely on load
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(registration => {
        console.log("[PWA] Service Worker registered with scope:", registration.scope);
      })
      .catch(error => {
        console.error("[PWA] Service Worker registration failed:", error);
      });
  });
}

// 2. Listen for update messages from the Service Worker
navigator.serviceWorker?.addEventListener('message', event => {
  if (event.data && event.data.type === 'UPDATE_READY') {
    const banner = document.getElementById('updateBanner');
    if (banner) banner.style.display = 'block';
  }
});

// 3. Handle the update button click
document.getElementById('updateBtn')?.addEventListener('click', () => {
  window.location.reload();
});

// 4. Automatically pre-cache all core pages and assets on initial app load
window.addEventListener("load", () => {
  if ('serviceWorker' in navigator) {
    // Add every page, stylesheet, script, or asset you want guaranteed offline support for
    const allKnownFiles = [
      "./",
      "./index.html",
      "./style.css",
      "./app.js",
      "./manifest.json"
      // Add any additional pages/files here (e.g., "./other-page.html", "./settings.html")
    ];

    // Silently fetch each file so the service worker's universal fetch handler captures and caches them instantly
    allKnownFiles.forEach(url => {
      fetch(url).catch(() => {});
    });
  }
});
