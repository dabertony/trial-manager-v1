const CACHE_NAME = "trial-manager-cache-v14";

const urlsToCache = [

  "./",

  "./index.html",

  "./style.css",

  "./app.js",

  "./state.js",

  "./manifest.json",

  "./xlsx.full.min.js",

  "./icon-192.png",

  "./icon-512.png"

];


// ================================
// INSTALLATION
// ================================

self.addEventListener("install", (event) => {

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then((cache) => {

        return cache.addAll(urlsToCache);

      })

  );

  self.skipWaiting();

});


// ================================
// ACTIVATION
// ================================

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

  self.clients.claim();

});


// ================================
// FETCH
// ================================

self.addEventListener("fetch", (event) => {

  event.respondWith(

    caches.match(event.request)
      .then((response) => {

        return response || fetch(event.request);

      })

  );

});