const CACHE_NAME = "trial-manager-cache-v1";

// Fichiers essentiels à mettre en cache
const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./state.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// INSTALLATION
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// ACTIVATION
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
});

// FETCH (offline support)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});