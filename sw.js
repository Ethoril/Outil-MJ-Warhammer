const CACHE_NAME = 'wfrp-cache-v3.22.0';

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
  './js/core/equipment.js',
  './js/core/reference-catalog.js',
  './js/core/sync-migration.js',
  './js/data/keyword-engine-contracts.json',
  './js/data/reference-equipment-builder.js',
  './js/data/reference-snapshot.json',
  './js/ui/fiche-details.js',
  './js/data/shared/catalogue/skill-resolver.js',
  './js/data/shared/catalogue/talent-resolver.js',
  './js/data/shared/catalogue/talent-source.js',
  './js/data/shared/fiche/basic-skills.js',
  './js/data/shared/fiche/equipment.js',
  './js/data/shared/fiche/skill-names.js',

  './js/core/store.js',
  './js/core/creature-keywords.js',
  './js/core/creature-combat.js',
  './js/core/creature-states.js',
  './js/core/creature-movement.js',
  './js/core/creature-psychology.js',
  './js/core/creature-magic.js',
  './js/core/creature-regeneration.js',
  './js/core/creature-heads.js',
  './js/core/creature-size.js',
  './js/core/creature-senses.js',
  './js/core/creature-natures.js',
  './js/data/creature-keywords.js',
  './js/ui/keyword-picker.js',
  './js/core/bestiary-profiles.js',
  './js/data/bestiary/index.json',
  './js/data/bestiary/L01.json',
  './js/data/bestiary/L02.json',
  './js/data/bestiary/L03.json',
  './js/data/bestiary/L04.json',
  './js/data/bestiary/L06.json',
  './js/data/bestiary/L07.json',
  './js/data/bestiary/L09.json',
  './js/data/bestiary/L10.json',
  './js/data/bestiary/L11.json',
  './js/data/bestiary/L12.json',
  './js/data/bestiary/L13.json',
  './js/data/bestiary/L14.json',
  './js/data/bestiary/L16.json',
  './js/data/bestiary/L17.json',
  './js/data/bestiary/L18.json',
  './js/data/bestiary/L19.json',
  './js/data/bestiary/L20.json',
  './js/data/bestiary/L21.json',
  './js/data/bestiary/L22.json',
  './js/data/bestiary/L23.json',
  './js/data/bestiary/L24.json',
  './js/data/bestiary/L25.json',
  './js/data/bestiary/L26.json',
  './js/core/v5-divine-engine.js',
  './js/core/v5-divine-grammar.js',
  './js/core/v5-divine-effect-handlers.js',
  './js/core/v5-divine-effects-damage.js',
  './js/core/v5-divine-effects-conditions.js',
  './js/core/v5-divine-effects-gear.js',
  './js/core/v5-divine-effects-tests.js',
  './js/core/v5-divine-effects-summon.js',
  './js/core/v5-divine-store.js',
  './js/core/v5-divine-prayer-caps.js',
  './js/core/v5-divine-access.js',
  './js/core/v5-broken-escape.js',
  './js/core/v5-test-context.js',
  './js/data/v5-divine-contracts.json',
  './js/data/divine-summon-profiles.js',
  './js/ui/v5-divine-panel.js',
  './js/ui/v5-divine-form-model.js',
  './js/ui/v5-broken-escape-panel.js',
  './js/core/combat.js',
  './js/core/dice.js',
  './js/core/v5-roll.js',
  './js/core/v5-combat-rules.js',
  './js/core/v5-effects.js',
  './js/core/v5-turn.js',
  './js/core/v5-game-time.js',
  './js/core/v5-campaign-time.js',
  './js/ui/v5-campaign-time-dialog.js',
  './js/core/encounter-journal.js',
  './js/data/v5-crits.js',
  './js/data/v5-rules.js',
  './js/core/v5-momentum.js',
  './js/core/v5-decision.js',
  './js/core/talent-contracts.js',
  './js/core/talent-contract-v2.js',
  './js/core/v5-action-costs.js',
  './js/core/v5-store-action.js',
  './js/core/v5-resources.js',
  './js/core/v5-reactions.js',
  './js/core/v5-talents.js',
  './js/core/v5-talent-tests.js',
  './js/core/v5-talent-measures.js', './js/core/v5-talent-situations.js', './js/core/v5-talent-replacements.js', './js/core/v5-talent-psychology.js', './js/core/v5-talent-small.js', './js/core/v5-talent-size.js', './js/core/v5-talent-attacks.js', './js/core/v5-talent-shield.js', './js/core/v5-talent-whirlwind.js', './js/core/v5-talent-contact.js', './js/ui/v5-talent-situations.js', './js/ui/v5-talent-measures.js', './js/core/v5-talent-combat.js',
  './js/core/v5-talent-actions.js',
  './js/core/v5-talent-qualities.js',
  './js/core/v5-talent-coverage.js',
  './js/data/v5-test-talent-contracts.json',
  './js/data/v5-quality-talent-contracts.json',
  './js/data/v5-additional-talent-contracts.json',
  './js/data/v5-talent-coverage.json',
  './js/core/v5-magic-channelling.js',
  './js/core/v5-magic-casting.js',
  './js/core/v5-magic-miscasts.js',
  './js/core/v5-magic-high.js',
  './js/core/v5-magic-combat.js',
  './js/core/v5-magic-time.js',
  './js/core/v5-magic-turn.js',
  './js/core/v5-magic-talents.js',
  './js/data/v5-magic-talent-sources.json',
  './js/data/v5-magic-talent-coverage.json',
  './js/core/v5-magic-dispel.js',
  './js/core/v5-magic-effects.js',
  './js/core/v5-magic-attributes.js',
  './js/core/v5-magic-arbitrations.js',
  './js/core/v5-spell-contracts.js',
  './js/core/v5-magic-arcane-unforgiving.js',
  './js/core/v5-magic-overcast-options.js',
  './js/core/v5-magic-reminder-flags.js',
  './js/core/v5-armor-material.js',
  './js/data/v5-spell-contracts.json',
  './js/data/v5-transformation-bestiary.js',
  './js/data/v5-talent-contracts.json',
  './js/core/damage.js',
  './js/core/models.js',
  './js/core/migrations.js',
  './js/core/persistence.js',
  './js/core/sync.js',
  './js/core/auth-errors.js',
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
  './js/ui/journal-view.js',
  './js/ui/messages.js',
  './js/ui/reserve.js',
  './js/ui/bestiary-library.js',
  './js/ui/resolution-panel.js',
  './js/ui/v5-magic-controls.js',
  './js/ui/v5-spell-options.js',
  './js/ui/v5-effect-dialog.js',
  './js/ui/v5-fortune-dialog.js',
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
    }).then(() => {
      // First installation has no waiting replacement to activate.
      if (!self.registration.active) return;
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'wfrp-update-ready', version: CACHE_NAME }));
      });
    })
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
