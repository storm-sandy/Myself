if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data.type === 'UPDATE_READY') {
      document.getElementById('updateBanner').style.display = 'block';
    }
  });

  document.getElementById('updateBtn')?.addEventListener('click', () => {
    window.location.reload();
  });

