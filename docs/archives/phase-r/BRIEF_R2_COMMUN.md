# Lot R2 — rationaliser les tests (règles communes à toutes les étapes)

Worktree : `E:/Outil MJ Warhammer/tmp/phase-r-worktree`, branche `claude/phase-r`. Tu n'écris que là. `node_modules` y est un vrai dossier (pas une jonction). Pas de push, pas de `git stash`, pas de suppression hors de `tests/` (et dans `tests/` seulement des fichiers dont tout le contenu a été repris ailleurs).

## But

Un fichier par domaine et sous-domaine, nom explicite, au lieu d'un fichier par passe de revue (`*-characterization`, `*-review`, `*-counterreview`, `*-final-review`, `*-independent`, préfixes de lots `pro-t*`, `f2-*`, `lot3-*`, `divin-v5-b*`…). **Aucune modification du code de production** (`js/`, `sw.js`, `index.html`, CSS) sauf les chaînes `evidence` qui citent un chemin de test (voir plus bas).

## Organisation cible

- Tests rapides : `tests/unit/<domaine>/<sous-domaine>.test.js` (`node --test` les trouve récursivement). Domaines indicatifs : `combat`, `magie`, `divin`, `creatures`, `sequelles`, `corruption`, `referentiel`, `stockage` (store, IndexedDB, cloud), `interface`, `pwa`, `donnees` (bestiaire, catalogues, contrats générés). Un fichier ne doit pas dépasser ~2 500 lignes : découpe en sous-domaines nommés par le sujet (ex. `combat/criticals.test.js`, `combat/grappling.test.js`, `divin/wrath.test.js`), jamais par lot ni par passe.
- Aides et jeux d'essai : `tests/helpers/` et `tests/fixtures/` restent où ils sont (ajuste les chemins d'import relatifs, `import.meta.url`, `readFileSync('tests/...')`).
- Parcours navigateur (`tests/*.mjs` lancés par `node tests/x.mjs`) : **ne les déplace pas et ne les renomme pas** (la recette et `package.json` les appellent par leur chemin). R2 ne fait qu'ajouter un script npm qui les lance tous (étape R2-0).

## Règles de fusion

1. Une assertion ne disparaît que si une assertion **équivalente** (même entrée, même valeur attendue, même chemin de code) existe ailleurs après fusion. Dans ce cas, note-la dans `docs/R2_TESTS_DOUBLONS.md` (fichier d'origine, nom du test, et où se trouve l'équivalent). En cas de doute, garde-la.
2. Pas de réécriture d'assertion : on déplace, on regroupe sous des `describe` nommés par le sujet, on renomme les tests si le nom ne dit rien (« review fix 3 » → ce qui est vérifié). Les valeurs attendues ne changent jamais.
3. Fonctions d'aide dupliquées entre fichiers fusionnés : une seule copie dans le fichier (ou dans `tests/helpers/` si plusieurs fichiers l'utilisent), à l'identique.
4. Les tests qui lisent un autre fichier de test par son chemin, ou les chaînes `evidence: 'tests/xxx.test.js: nom du test'` dans `js/`, `tools/` et les documents **générés et vérifiés par un `--check`** (voir `tools/build-*.mjs` et la recette `tools/run-divine-recipe.mjs`) : mets à jour chemin **et** nom de test, et vérifie que le `--check` concerné passe. Les rapports historiques de `docs/` ne sont pas réécrits : la correspondance ancien → nouveau va dans `docs/R2_TESTS_CORRESPONDANCE.md` (tableau : ancien fichier, nouveau fichier, nombre de tests avant/après).
5. LF partout. Commits en anglais, un par domaine (ou sous-domaine), terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, marqués « (Claude) ».

## Garde-fous à chaque commit (obligatoires, résultats dans le message final)

- Nombre de tests : la somme des tests de la suite (`# tests N` de `node --test`) avant/après ; une baisse doit correspondre exactement aux doublons listés.
- Suite complète verte : `TEMP=E:/tmp-node TMP=E:/tmp-node node --test --test-concurrency=4`.
- Couverture : `TEMP=E:/tmp-node TMP=E:/tmp-node node --test --test-concurrency=4 --experimental-test-coverage --test-coverage-include='js/**'` ; compare la ligne `all files` (lignes, branches, fonctions) **et** chaque fichier de `js/` à la référence `E:/Outil MJ Warhammer/tmp/phase-r/coverage-base.txt`. Aucune baisse tolérée, sur aucun fichier, à la deuxième décimale près. Le script `tmp/phase-r/compare-coverage.mjs` fait la comparaison (voir R2-0).
- Les `--check` des générateurs appelés par la recette passent (`node tools/build-v5-divine-contracts.mjs --check`, `node tools/build-divine-audit.mjs --check`, `node tools/build-divine-clauses.mjs --check`).
