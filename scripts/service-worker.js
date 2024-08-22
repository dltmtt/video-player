const CACHE_NAME = "video-player-pwa-cache-v1";
const resourcesToCache = [
  "/",
  "/index.html",
  "/styles/reset.css",
  "/styles/colors.css",
  "/styles/main.css",
  "/scripts/script.js",
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:wght,FILL@275,0..1&family=JetBrains+Mono",
];

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

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(resourcesToCache);
    }),
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    }),
  );
});
