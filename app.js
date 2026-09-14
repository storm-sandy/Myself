if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data.type === 'UPDATE_READY') {
      document.getElementById('updateBanner').style.display = 'block';
    }
  });

  document.getElementById('updateBtn')?.addEventListener('click', () => {
    window.location.reload();
  });

// Add this inside your main app.js or index.html script block to auto-fetch all pages/assets on load
window.addEventListener("load", () => {
  if ('serviceWorker' in navigator) {
    const allKnownFiles = [
      "./index.html",
      "./other-page.html",
      "./settings.html",
      "./images/hero.jpg"
      // Add any other files or pages you want cached automatically
    ];

    allKnownFiles.forEach(url => {
      fetch(url).catch(() => {}); // Silently requests and triggers the SW cache
    });
  }
});

