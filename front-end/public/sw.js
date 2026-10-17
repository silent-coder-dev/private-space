// UsSpace service worker.
// It only shows notifications ("Kabir is calling…", "New message") while the app is in the background,
// and opens the app when you tap one. It caches NOTHING, so you always get the newest version of the app.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => "focus" in w);
      if (open) {
        await open.focus();
        open.postMessage({ t: "open", url });
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
