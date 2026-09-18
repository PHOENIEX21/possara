export function registerPossaraServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((registration) => {
      registration.update().catch(() => undefined);
    }).catch(() => undefined);
  });
}
