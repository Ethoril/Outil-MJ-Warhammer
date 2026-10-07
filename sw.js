const CACHE_NAME = 'wfrp-cache-v3.11.1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './MJ.css',
  './favicon.svg',
  './manifest.webmanifest',
  './assets/images/old-paper.svg',
  './assets/fonts/grenze-gotisch-normal.woff2',
  './assets/fonts/alegreya-normal.woff2',
  './assets/fonts/alegreya-italic.woff2',
  './assets/fonts/alegreya-sans-400.woff2',
  './assets/fonts/alegreya-sans-500.woff2',
  './assets/fonts/alegreya-sans-700.woff2',
  './js/version.js',
  './js/main.js',
  './js/core/store.js',
  './js/core/combat.js',
  './js/core/dice.js',
  './js/core/damage.js',
  './js/core/models.js',
  './js/core/migrations.js',
  './js/core/persistence.js',
  './js/core/sync.js',
  './js/core/sync-protocol.js',
  './js/core/sync-session.js',
  './js/core/effects.js',
  './js/core/quality-normalization.js',
  './js/core/commands.js',
  './js/core/history.js',
  './js/core/reminders.js',
  './js/core/resolution.js',
  './js/core/criticals.js',
  './js/core/scene-events.js',
  './js/core/encounters.js',
  './js/core/simulation.js',
  './js/core/text-profile-import.js',
  './js/core/json-profile-import.js',
  './js/core/turn-order.js',
  './js/core/sanitize.js',
  './js/core/fiche-sync.js',
  './js/core/fiche-source.js',
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
  './js/ui/combat-banner.js',
  './js/ui/combat-view.js',
  './js/ui/dice-line.js',
  './js/ui/dom.js',
  './js/ui/import-modal.js',
  './js/ui/action-editor.js',
  './js/ui/keyboard.js',
  './js/ui/log-view.js',
  './js/ui/messages.js',
  './js/ui/reserve.js',
  './js/ui/resolution-panel.js',
  './js/ui/rules-view.js',
  './js/ui/side-panel.js',
  './js/ui/silhouette.js',
  './js/ui/theme.js',
  './js/ui/toast.js',
  './js/ui/workspace-view.js',
  './js/ui/import-text-view.js',
  './js/ui/fiche-sync-view.js',
  './js/ui/prepare-view.js',
  './js/ui/workspace.css',
  './vendor/firebase/firebase-app.js',
  './vendor/firebase/firebase-auth.js',
  './vendor/firebase/firebase-database.js',
  './vendor/firebase/firebase-firestore.js',
  './vendor/firebase/firebase-app-check.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({ type: 'wfrp-update-ready', version: CACHE_NAME }));
    }))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'wfrp-activate-update') self.skipWaiting();
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

  // Pour Firebase, gstatic, Google Sheets, Firestore/App Check (googleapis) et reCAPTCHA, network-first avec fallback
  if (url.hostname.includes('firebase') || url.hostname.includes('gstatic') || url.hostname.includes('docs.google.com') || url.hostname.includes('googleapis') || url.hostname.endsWith('www.google.com')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first sur les ressources locales de l'application
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
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
