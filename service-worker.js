const CACHE_NAME = "trial-manager-cache-v129";

const urlsToCache = [

  "./",

  "./index.html",

  "./tv.html",

  "./style.css",

  "./ufolep-logo-lockup.svg",

  "./app.js",

  "./state.js",

  "./manifest.json",

  "./xlsx.full.min.js",

  "./exceljs.min.js",

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

  const request = event.request;
  const requestUrl = new URL(request.url);

  // Ne pas intercepter les POST (sauvegardes/actions) ni les ressources d’un
  // autre domaine : le cache hors ligne ne concerne que les fichiers locaux.
  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Seules les réponses locales réussies sont mises en cache. Une erreur
        // d’écriture du cache ne doit jamais faire échouer le chargement.
        if (response && response.status === 200 && response.type !== "opaque") {
          const responseClone = response.clone();
          const cacheUpdate = caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, responseClone))
            .catch(() => {});

          if (typeof event.waitUntil === "function") {
            event.waitUntil(cacheUpdate);
          }
        }

        return response;
      })
      .catch(() => {
        // Ignore les paramètres de version (?v=...) en mode hors ligne.
        return caches.match(request, { ignoreSearch: true });
      })
  );

});
