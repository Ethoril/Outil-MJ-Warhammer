const CACHE_NAME = 'wfrp-cache-v3.5.0';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './MJ.css',
  './favicon.svg',
  './manifest.webmanifest',
  './assets/images/old-paper.svg',
  './assets/fonts/cinzel-normal.woff2',
  './assets/fonts/lora-normal.woff2',
  './assets/fonts/lora-italic.woff2',
  './js/version.js',
  './js/main.js',
  './js/core/store.js',
  './js/core/combat.js',
  './js/core/dice.js',
  './js/core/damage.js',
  './js/core/models.js',
  './js/core/sync.js',
  './js/core/sanitize.js',
  './js/core/keywords.js',
  './js/core/roll-qualities.js',
  './js/data/keywords-fallback.json',
  './js/data/keyword-engines.js',
  './js/data/rules.js',
  './js/data/crits.js',
  './js/data/magic.js',
  './js/data/states.js',
  './js/ui/bus.js',
  './js/ui/card.js',
  './js/ui/combat-view.js',
  './js/ui/dice-line.js',
  './js/ui/dom.js',
  './js/ui/import-modal.js',
  './js/ui/keyboard.js',
  './js/ui/log-view.js',
  './js/ui/reserve.js',
  './js/ui/rules-view.js',
  './js/ui/theme.js',
  './js/ui/toast.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Pour Firebase, gstatic et Google Sheets, network-first avec fallback
  if (url.hostname.includes('firebase') || url.hostname.includes('gstatic') || url.hostname.includes('docs.google.com')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first sur les ressources locales de l'application
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Mise à jour silencieuse du cache en arrière-plan
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});

        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      });
    })
  );
});
