# Tâches · Images des pions

Spec : [spec.md](spec.md) · Plan : [plan.md](plan.md). Chaque tâche est un brief autonome. Le test vient avant le code et échoue aujourd'hui. Tests ciblés pendant le travail ; suite complète une fois, en T11. Commits locaux « (Claude) », fichiers nommés ; aucun push. Ne jamais toucher ni versionner `rpg-map-display/maps/tokens/`.

## Lot 1 — Table d'appariement

- [x] **T1 — Proposer l'appariement.** Produire `tools/token-images.csv` : une ligne par image de `E:/rpg-map-display/maps/tokens/**/*.webp` (120), colonnes du plan. Appariement exact sur `nameFr`/`name` normalisés, puis approchés et recherche par noms anglais tranchés au jugement ; PJ, PNJ, destriers nommés : aucun profil, note « pas un profil du bestiaire » ; `forme-bestiale/` : aucun profil, note « forme : <clé>, <vent> ». Les doublons racine/`pj/` sont listés tels quels.
  Fichiers : `tools/token-images.csv` (script d'aide jetable dans `tmp/`). CA : 4, 21, 22.
  Acceptation : 120 lignes ; chaque id cité existe dans `js/data/bestiary/L*.json` ; **relecture du MJ** avant T2.
- [x] **T2 — Générateur et table.** `tools/build-token-images.mjs` lit le CSV et écrit `js/data/token-images.js` (trié par chemin, LF) ; `--check` sort en code 1 si le fichier a dérivé. `form` déduit du dossier et du suffixe (`-bete` → `beasts`, `-vie` → `jade`), `beast` = clé de `v5-transformation-bestiary.js`.
  Fichiers : `tools/build-token-images.mjs`, `js/data/token-images.js`, `tests/unit/donnees/token-images.test.mjs`. CA : 20, 22. Après : T1 relu.
  Acceptation : `node --test tests/unit/donnees/token-images.test.mjs` (ids existants, un profil dans une seule image, 18 formes sur 9 clés connues, `--check` vert).
- [x] **T2b — Illustrations à créer.** `tools/list-missing-token-images.mjs` écrit `docs/specs/images-pions/illustrations-a-creer.md` : profils du bestiaire sans image, regroupés par créature puis classés par dossiers de la bibliothèque ; individus nommés à part ; bêtes de Forme bestiale et monstres de transformation sans image. Le classement par dossier (faction) qui ne se déduit pas des données est tranché au jugement dans un fichier relu par le MJ (`tools/token-images-categories.csv`).
  Fichiers : `tools/list-missing-token-images.mjs`, `tools/token-images-categories.csv`, `docs/specs/images-pions/illustrations-a-creer.md`. CA : 26, 27. Après : T2.
  Acceptation : relancer la commande sans changement ne modifie rien ; aucun profil apparié n'y figure ; tout profil non apparié y figure une fois.

## Lot 2 — Outil MJ

- [x] **T3 — Résolution et envoi automatique.** `js/core/token-image.js` (`normalizeLibraryImage`, `tokenImageOf`, `libraryImageSrc`) ; `imageUrlOf` de `js/main.js` l'utilise. PJ inchangé.
  Fichiers : `js/core/token-image.js`, `js/main.js`, `tests/unit/combat/token-image.test.js`. CA : 1, 2, 3, 7, 9, 16. Après : T2.
  Acceptation : `node --test tests/unit/combat/token-image.test.js` et `node --test tests/unit/combat/liaison-images.test.js`.
- [x] **T4 — Champ `tokenLibraryImage` et persistance.** Profil, `sanitize`, `PROFILE_KEYS`, export et import JSON ; exclusivité avec `tokenImage` ; pas de migration.
  Fichiers : `js/core/models.js`, `js/core/sanitize.js`, `js/core/migrations.js`, `js/core/json-profile-export.js`, `js/core/json-profile-import.js`, tests unitaires voisins existants. CA : 8, 10. Après : T3.
  Acceptation : tests ciblés des cinq modules (aller-retour avec et sans le champ ; chemin invalide rejeté).
- [x] **T5 — Sélecteur et vignettes dans la réserve.** Recherche par nom dans la table, vignette, mention « automatique » ou choix du MJ, retrait ; vignette absente si l'image ne charge pas.
  Fichiers : `js/ui/reserve.js`, `index.html`, `css/` si besoin, `tests/liaison-images.browser.mjs`. CA : 6, 8, 11, 12, 13. Après : T4.
  Acceptation : `timeout 120 node tests/liaison-images.browser.mjs`.
- [x] **T6 — Montures.** Image automatique et image choisie de la monture d'un profil (section Monture de la réserve), envoyées dans `rider.imageUrl` et sur le pion de la monture.
  Fichiers : `js/ui/reserve.js`, `js/main.js`, `tests/unit/combat/token-image.test.js`. CA : 14, 15. Après : T5.
  Acceptation : test unitaire de `tokenStatesOf` avec cavalier monté.

## Lot 3 — Contrat et carte

- [x] **T7 — Contrat et garde-fou.** [P] Amender §4/§6 dans les deux copies du contrat (chemin relatif, `formImageUrl`). Étendre `tools/recopier-donnees-communes.mjs` à `js/data/token-images.js` → `rpg-map-display/js/core/token-images.js`. Côté carte : `tests/tokenImages.test.mjs` (chaque chemin de la table et de `maps/tokens/catalog.json` existe) et un test de `mjLink` avec chemin relatif (pion valide, cumul embarqué nul).
  Fichiers : les deux contrats, `tools/recopier-donnees-communes.mjs`, `tests/unit/donnees/donnees-communes.test.mjs` ; carte : `js/core/token-images.js`, `tests/tokenImages.test.mjs`, test de liaison existant. CA : 5, 23, 24, 25. Après : T2.
  Acceptation : `node tools/recopier-donnees-communes.mjs --check` ; dans la carte `node --test tests/tokenImages.test.mjs` et le test de liaison.

## Lot 4 — Formes bestiales

- [x] **T8 — Outil : vent et `formImageUrl`.** Écrire `beastForm.wind` à la transformation (selon le sort lancé) ; `formImageOf` ; `formImageUrl` dans `tokenStateOf`, y compris pour un PJ ; `null` hors forme, pour `kadon` et pour une bête sans image.
  Fichiers : `js/core/v5-magic-arbitrations.js` et son appelant, `js/core/token-image.js`, `js/core/map-link-state.js`, `js/core/map-link.js`, `js/main.js`, `js/core/sanitize.js` si `wind` y est filtré, tests unitaires. CA : 17, 18, 19. Après : T3, T7.
  Acceptation : `node --test tests/unit/combat/token-image.test.js` et les tests existants de Forme bestiale.
- [x] **T9 — Carte : `formImageUrl`.** [P avec T8] Champ du pion (schéma, types), détenu par l'outil dans `mjLink.js` (`null` efface), affichage `formImageUrl ?? imageUrl` partout où l'image d'un pion est dessinée.
  Fichiers carte : `js/core/schema.js`, `js/core/types.js`, `js/app/mjLink.js`, `js/render/layers/tokens.js` et autres lecteurs d'image, tests. CA : 17, 18. Après : T7.
  Acceptation : tests unitaires de la carte ciblés (`mjLink`, schéma, rendu).

## Lot 5 — Profils des images sans profil

- [x] **T12 — Créer les profils manquants.** [P avec le lot 2] Pour chaque image à `aucun` qui est une créature ou un PNJ : chercher le profil dans le corpus (texte extrait d'abord ; Gemini Decisions sur les pages si le texte ne suffit pas), l'ajouter par la chaîne existante du bestiaire, l'apparier dans `tools/token-images.csv` et régénérer la table et la liste des illustrations. Ce qui reste introuvable part en questions au MJ.
  Fichiers : `tools/lib/bestiary-*.mjs`, `js/data/bestiary/`, `tools/token-images.csv`, `js/data/token-images.js`, `docs/specs/images-pions/illustrations-a-creer.md`, `docs/specs/images-pions/questions-profils.md`. CA : 28, 29, 30. Après : T2b.
  Acceptation : `node tools/verify-bestiary-stats.mjs`, tests ciblés du bestiaire et `tests/unit/donnees/token-images.test.mjs` verts ; chaque profil créé cite livre et page.

## Lot 6 — Bestiaire en dossiers

- [x] **T13 — Classement de tout le bestiaire.** `tools/token-images-categories.csv` couvre toutes les créatures (appariées ou non) ; un générateur écrit `js/data/bestiary-folders.js` (id de profil → dossier, libellés français des dossiers), avec `--check`.
  Fichiers : `tools/token-images-categories.csv`, `tools/build-bestiary-folders.mjs`, `js/data/bestiary-folders.js`, test dans `tests/unit/donnees/`. CA : 33. Après : T12.
  Acceptation : test (chaque profil dans un seul dossier, aucun sans classement, `--check` vert).
- [x] **T14 — Navigation par dossiers.** Arborescence, compteurs, fil d'Ariane, « À classer », recherche et filtres bornés au dossier ouvert, clavier et noms accessibles.
  Fichiers : `js/ui/bestiary-library.js`, `js/core/bestiary-profiles.js` (filtre par dossier, pur), `index.html`, `css/`, tests unitaires du filtre, test navigateur du bestiaire. CA : 31, 32, 34. Après : T13, lot 2 (mêmes fichiers d'interface).
  Acceptation : tests unitaires ciblés ; test navigateur sous `timeout 120` ; parcours d'accessibilité vert.

## Lot 7 — Livres ajoutés et profils maison

- [x] **T15 — Le Pouvoir derrière le Trône.** Déclarer le livre au corpus, extraire tous les profils de PNJ par la chaîne du bestiaire, les classer, apparier les images existantes (Fils d'Ulric), régénérer table, dossiers et liste des illustrations. CA : 35.
- [x] **T16 — Livres V2.** Après T15 (mêmes fichiers, identifiants séquentiels). Tome de la Corruption et Seigneur liche : tous les profils, convertis en V5 par la règle existante ; Vampire lahmiane de L27 p. 114 de même ; appariement des démons et de Khemri. CA : 36.
- [x] **T17 — Profils maison.** Avec T16. Gobelin archer, Ogre crache-plomb, Orc kostaud (base + armes), Capitaine vampire pirate, Zombie flibustier. CA : 37.

## Clôture

- [x] **T10 — Recette locale.** `node tools/serve-liaison.mjs` : loup du bestiaire (auto), PNJ avec image choisie > 24 Kio, monture avec destrier nommé, PJ en Forme bestiale des deux vents puis retour. Captures à l'appui.
  CA : 1, 5, 7, 15, 17, 18. Après : T6, T8, T9.
- [ ] **T11 — Convergence.** Suite complète des deux dépôts, `verifier` sur spec + plan, notes de version (README, `docs/SUIVI_EVOLUTION.md`), `node tools/bump-version.mjs`. Publication des deux dépôts seulement après feu vert du MJ **et** versionnement des images par le MJ.
