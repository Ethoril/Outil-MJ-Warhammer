# Tâches · Images des pions

Spec : [spec.md](spec.md) · Plan : [plan.md](plan.md). Chaque tâche est un brief autonome. Le test vient avant le code et échoue aujourd'hui. Tests ciblés pendant le travail ; suite complète une fois, en T11. Commits locaux « (Claude) », fichiers nommés ; aucun push. Ne jamais toucher ni versionner `rpg-map-display/maps/tokens/`.

## Lot 1 — Table d'appariement

- [ ] **T1 — Proposer l'appariement.** Produire `tools/token-images.csv` : une ligne par image de `E:/rpg-map-display/maps/tokens/**/*.webp` (120), colonnes du plan. Appariement exact sur `nameFr`/`name` normalisés, puis approchés et recherche par noms anglais tranchés au jugement ; PJ, PNJ, destriers nommés : aucun profil, note « pas un profil du bestiaire » ; `forme-bestiale/` : aucun profil, note « forme : <clé>, <vent> ». Les doublons racine/`pj/` sont listés tels quels.
  Fichiers : `tools/token-images.csv` (script d'aide jetable dans `tmp/`). CA : 4, 21, 22.
  Acceptation : 120 lignes ; chaque id cité existe dans `js/data/bestiary/L*.json` ; **relecture du MJ** avant T2.
- [ ] **T2 — Générateur et table.** `tools/build-token-images.mjs` lit le CSV et écrit `js/data/token-images.js` (trié par chemin, LF) ; `--check` sort en code 1 si le fichier a dérivé. `form` déduit du dossier et du suffixe (`-bete` → `beasts`, `-vie` → `jade`), `beast` = clé de `v5-transformation-bestiary.js`.
  Fichiers : `tools/build-token-images.mjs`, `js/data/token-images.js`, `tests/unit/donnees/token-images.test.mjs`. CA : 20, 22. Après : T1 relu.
  Acceptation : `node --test tests/unit/donnees/token-images.test.mjs` (ids existants, un profil dans une seule image, 18 formes sur 9 clés connues, `--check` vert).

## Lot 2 — Outil MJ

- [ ] **T3 — Résolution et envoi automatique.** `js/core/token-image.js` (`normalizeLibraryImage`, `tokenImageOf`, `libraryImageSrc`) ; `imageUrlOf` de `js/main.js` l'utilise. PJ inchangé.
  Fichiers : `js/core/token-image.js`, `js/main.js`, `tests/unit/combat/token-image.test.js`. CA : 1, 2, 3, 7, 9, 16. Après : T2.
  Acceptation : `node --test tests/unit/combat/token-image.test.js` et `node --test tests/unit/combat/liaison-images.test.js`.
- [ ] **T4 — Champ `tokenLibraryImage` et persistance.** Profil, `sanitize`, `PROFILE_KEYS`, export et import JSON ; exclusivité avec `tokenImage` ; pas de migration.
  Fichiers : `js/core/models.js`, `js/core/sanitize.js`, `js/core/migrations.js`, `js/core/json-profile-export.js`, `js/core/json-profile-import.js`, tests unitaires voisins existants. CA : 8, 10. Après : T3.
  Acceptation : tests ciblés des cinq modules (aller-retour avec et sans le champ ; chemin invalide rejeté).
- [ ] **T5 — Sélecteur et vignettes dans la réserve.** Recherche par nom dans la table, vignette, mention « automatique » ou choix du MJ, retrait ; vignette absente si l'image ne charge pas.
  Fichiers : `js/ui/reserve.js`, `index.html`, `css/` si besoin, `tests/liaison-images.browser.mjs`. CA : 6, 8, 11, 12, 13. Après : T4.
  Acceptation : `timeout 120 node tests/liaison-images.browser.mjs`.
- [ ] **T6 — Montures.** Image automatique et image choisie de la monture d'un profil (section Monture de la réserve), envoyées dans `rider.imageUrl` et sur le pion de la monture.
  Fichiers : `js/ui/reserve.js`, `js/main.js`, `tests/unit/combat/token-image.test.js`. CA : 14, 15. Après : T5.
  Acceptation : test unitaire de `tokenStatesOf` avec cavalier monté.

## Lot 3 — Contrat et carte

- [ ] **T7 — Contrat et garde-fou.** [P] Amender §4/§6 dans les deux copies du contrat (chemin relatif, `formImageUrl`). Étendre `tools/recopier-donnees-communes.mjs` à `js/data/token-images.js` → `rpg-map-display/js/core/token-images.js`. Côté carte : `tests/tokenImages.test.mjs` (chaque chemin de la table et de `maps/tokens/catalog.json` existe) et un test de `mjLink` avec chemin relatif (pion valide, cumul embarqué nul).
  Fichiers : les deux contrats, `tools/recopier-donnees-communes.mjs`, `tests/unit/donnees/donnees-communes.test.mjs` ; carte : `js/core/token-images.js`, `tests/tokenImages.test.mjs`, test de liaison existant. CA : 5, 23, 24, 25. Après : T2.
  Acceptation : `node tools/recopier-donnees-communes.mjs --check` ; dans la carte `node --test tests/tokenImages.test.mjs` et le test de liaison.

## Lot 4 — Formes bestiales

- [ ] **T8 — Outil : vent et `formImageUrl`.** Écrire `beastForm.wind` à la transformation (selon le sort lancé) ; `formImageOf` ; `formImageUrl` dans `tokenStateOf`, y compris pour un PJ ; `null` hors forme, pour `kadon` et pour une bête sans image.
  Fichiers : `js/core/v5-magic-arbitrations.js` et son appelant, `js/core/token-image.js`, `js/core/map-link-state.js`, `js/core/map-link.js`, `js/main.js`, `js/core/sanitize.js` si `wind` y est filtré, tests unitaires. CA : 17, 18, 19. Après : T3, T7.
  Acceptation : `node --test tests/unit/combat/token-image.test.js` et les tests existants de Forme bestiale.
- [ ] **T9 — Carte : `formImageUrl`.** [P avec T8] Champ du pion (schéma, types), détenu par l'outil dans `mjLink.js` (`null` efface), affichage `formImageUrl ?? imageUrl` partout où l'image d'un pion est dessinée.
  Fichiers carte : `js/core/schema.js`, `js/core/types.js`, `js/app/mjLink.js`, `js/render/layers/tokens.js` et autres lecteurs d'image, tests. CA : 17, 18. Après : T7.
  Acceptation : tests unitaires de la carte ciblés (`mjLink`, schéma, rendu).

## Clôture

- [ ] **T10 — Recette locale.** `node tools/serve-liaison.mjs` : loup du bestiaire (auto), PNJ avec image choisie > 24 Kio, monture avec destrier nommé, PJ en Forme bestiale des deux vents puis retour. Captures à l'appui.
  CA : 1, 5, 7, 15, 17, 18. Après : T6, T8, T9.
- [ ] **T11 — Convergence.** Suite complète des deux dépôts, `verifier` sur spec + plan, notes de version (README, `docs/SUIVI_EVOLUTION.md`), `node tools/bump-version.mjs`. Publication des deux dépôts seulement après feu vert du MJ **et** versionnement des images par le MJ.
