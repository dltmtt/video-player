const CACHE_NAME = "video-player-pwa-cache-v6";
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

// Open the extension page when the extension icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
});

self.addEventListener("install", (e) => {
  // Filter out resources that are not served over HTTP, e.g., Chrome extension resources
  if (!e.request.url.startsWith("http")) {
    return;
  }

  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(staticResourcesToCache);
    }),
  );
});

self.addEventListener("fetch", (e) => {
  const requestUrl = new URL(e.request.url);

  if (dynamicResourcesToCache.includes(requestUrl.origin)) {
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
    // Return the resource from the cache if it exists, otherwise fetch it
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
