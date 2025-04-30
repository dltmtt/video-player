const CACHE_NAME = "video-player-pwa-cache";
const dynamicResourcesToCache = [
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
];
const staticResourcesToCache = [
  "/?utm_source=pwa",
  "/index.html",
  "/styles/reset.css",
  "/styles/colors.css",
  "/styles/main.css",
  "/scripts/script.js",
];

self.addEventListener("install", (e) => {
  // Filter out resources that are not served over HTTP, e.g., Chrome extension resources
  if (!e.request?.url.startsWith("http")) return;

  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(staticResourcesToCache);
    }),
  );
});

self.addEventListener("fetch", (e) => {
  const requestUrl = new URL(e.request.url);

  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(e.request);
      if (cachedResponse) return cachedResponse;

      const preloadedResponse = await e.preloadResponse;
      if (preloadedResponse) return preloadedResponse;

      if (dynamicResourcesToCache.includes(requestUrl.origin)) {
        const networkResponse = await fetch(e.request);
        if (networkResponse?.ok) {
          cache.put(e.request, networkResponse.clone());
        }
        return networkResponse;
      }

      return fetch(e.request);
    })(),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      // Enable navigation preload
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        }),
      );
    })(),
  );
});
