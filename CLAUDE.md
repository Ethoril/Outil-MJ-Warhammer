# Outil MJ Warhammer — règles de travail

Point d'entrée : [README.md](README.md) (ce qu'est l'outil, arborescence, contrats, liaisons). Historique : `docs/SUIVI_EVOLUTION.md`.
Un seul utilisateur, le MJ, francophone, sous Windows.

## Tests
- Suite complète (deux commandes, dans cet ordre) :
  - `node --test "tests/unit/**/*.test.js"`
  - `node --test "tests/unit/**/*.test.mjs"`
- Jamais `node --test tests/unit/<dossier>` : échoue sous Node 24. Pour cibler : `node --test tests/unit/<dossier>/<fichier>.test.js`.
- Pendant le travail : tests ciblés. Suite complète une seule fois, à la fin (ou à la fusion).
- Tout test navigateur (`tests/*-browser.mjs`, `*.browser.mjs`) se lance sous `timeout 120`.
- Tout nouveau test unitaire va dans `tests/unit/` (sinon `npm test` ne le voit pas).
- La CI (`.github/workflows/tests.yml`) lance les deux commandes unitaires sur chaque push et PR vers `main` ; pas de tests navigateur.

## Règles
- Interface et messages en français.
- Yards = mètres, même valeur sans conversion (50 yards → 50 m), partout : code, libellés, rapports.
- Pas de `git stash` (plusieurs sessions partagent le dépôt). Commits : fichiers nommés explicitement, jamais `git add -A` ni `git add .`.
- Messages de commit suffixés « (Claude) ».
- Une absence de champ facultatif (mots-clés, etc.) se lit comme vide au point de lecture, sans réécrire les données.

## Version et publication
- La version ne change que par `node tools/bump-version.mjs X.Y.Z` (elle écrit `js/version.js`, `package.json`, `package-lock.json`, `index.html`, README et le nom du cache de `sw.js`, qui suit la version). Les notes de version se rédigent à la main (README, `docs/SUIVI_EVOLUTION.md`).
- Publication = push sur `main` (GitHub Pages), seulement après le feu vert du MJ, suite unitaire verte.
- Une seule branche sur GitHub : `main`. Jamais de branche de développement poussée ; archives locales en tags `archive/*`.
- `tmp/` n'est pas versionné ; chaque worktree a son propre `npm ci`. Avant de supprimer un worktree, chercher les jonctions `node_modules` (`dir /AL`).
