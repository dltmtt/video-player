const CACHE_NAME = "video-player-pwa-cache-v2";
const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com";
const GOOGLE_FONTS_FONTS = "https://fonts.gstatic.com";
const resourcesToCache = [
  "/?utm_source=pwa",
  "/index.html",
  "/styles/reset.css",
  "/styles/colors.css",
  "/styles/main.css",
  "/scripts/script.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(resourcesToCache);
    }),
  );
});

self.addEventListener("fetch", (e) => {
  const requestUrl = new URL(e.request.url);

  if (
    requestUrl.origin === GOOGLE_FONTS_CSS ||
    requestUrl.origin === GOOGLE_FONTS_FONTS
  ) {
    e.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // Check if the request is already in the cache
        const response = await cache.match(e.request);
        if (response) {
          return response;
        }

        // If the request is not in the cache, fetch it and cache it
        const networkResponse = await fetch(e.request);
        cache.put(e.request, networkResponse.clone());
        return networkResponse;
      }),
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((response) => {
        return response || fetch(e.request);
      }),
    );
  }
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});
