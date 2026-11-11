# Rapport GPT — liaison Map Display, lot 2

Base `778cdba`, branche `codex/liaison-lot2-images`, worktree `tmp/lot2-images-worktree`. Aucun push et aucun changement dans Map Display.

## Réalisation

- `js/core/models.js`, `sanitize.js`, `migrations.js`, `store.js` : champ réservé au profil, validation WebP/JPEG base64 et limite de 24 576 octets de chaîne, maintien dans les migrations et suppression explicite ; fonction de sélection des paliers avec encodeur injecté.
- `js/core/json-profile-import.js`, `json-profile-export.js` : aller-retour JSON.
- `js/ui/reserve.js` : import d'image, recadrage carré centré, WebP aux paliers prévus, aperçu rond, retrait et message d'échec.
- `js/core/map-link-state.js`, `map-link.js`, `js/main.js` : résolution par profil, exclusion PJ, rafraîchissement lors d'un événement de réserve et diffusion des copies.
- `sw.js` : ajout au précache des deux modules de liaison préexistants, omis au commit de base. Nécessaire au fonctionnement hors ligne et au test de précache. **Fusion manuelle requise** avec les modifications non commitées de l'autre chantier dans le dépôt principal. Aucun nouveau module `js/`.
- Tests : `tests/unit/combat/liaison-images.test.js`, `tests/unit/stockage/liaison-images.test.js`, `tests/liaison-images.browser.mjs`.

## Vérifications

- Premier test écrit avant le correctif : il échouait, mais à cause d’un identifiant de profil manquant dans le jeu de données ; ce rouge ne démontre donc pas à lui seul le défaut visé. Le jeu de données a été corrigé après implémentation, puis les tests et mutations ont été exécutés.
- `npm ci` : réussi, 0 vulnérabilité.
- `node --test "tests/unit/combat/*.test.js"` : 1 292 réussites, 0 échec.
- `node --test "tests/unit/stockage/*.test.js"` : 220 réussites, 0 échec.
- `node --test tests/unit/stockage/liaison-images.test.js tests/unit/combat/liaison-images.test.js` : 7 réussites, 0 échec ; test de suppression relancé après la dernière modification du store.
- `node --test tests/unit/donnees/audit-meta-production.test.js` : 21 réussites, 0 échec après correction du précache.
- Avec `PLAYWRIGHT_EXECUTABLE_PATH=C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`, `node tests/liaison-images.browser.mjs` : import, enregistrement, rechargement et retrait réussis.
- Mutations temporaires, ensuite annulées : limite augmentée de 100 octets → 2 tests en échec ; suppression de l'exception PJ → 1 test en échec.

## Précisions et limites

La réserve de cette application utilise Firebase Realtime Database : un faux transport vérifie l'écriture et la réception du champ, sans connexion à un service réel. Les fiches PJ Firestore ne sont pas modifiées. Le test navigateur vérifie le chemin WebP réel sous Edge ; l'échec des paliers est couvert par encodeur factice. La suite complète et ses éventuels échecs sont indiqués ci-dessous.

- `node --test --test-concurrency=4` : 5 677 réussites / 5 679, deux échecs dans `tests/unit/divin/audit-et-sources.test.js` : E2 attend un chemin relatif commençant par `..` et obtient autre chose sur ce poste Windows ; E0 dépend du fichier absent `tmp/divin/recipe-receipt.json`. Aucun de ces tests ne concerne la liaison. La suite a été lancée avant une dernière modification locale limitée au retrait du champ dans le store ; le test ciblé de ce retrait a été relancé ensuite.
