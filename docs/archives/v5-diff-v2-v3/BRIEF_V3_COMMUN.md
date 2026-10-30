# Lot v3 — règles communes à tous les sous-lots (29/10/2026)

Le livre de base V5 EN a une v3 (27/10/2026). Le MJ a tranché les 56 changements : 51 reportés, 5 conservés. **La v3 devient la référence de l'outil.**

## Sources

- Décisions : `E:/Outil MJ Warhammer/tmp/v5-diff-v2-v3/decisions/decisions/<id>.json` (`choix` : `apply` = reporter la v3, `keep` = garder l'outil tel quel). Résumé : `E:/Outil MJ Warhammer/tmp/f1-reperage/ARBITRAGES_25_10.md`, section « Décisions du MJ du 29/10 : livre de base V5 v3 ».
- Contenu de chaque changement (texte v2 → v3, où l'outil le porte) : la page de décision `E:/Outil MJ Warhammer/tmp/v5-diff-v2-v3/choix-v3.html` (tableau `ITEMS`, par `id`) et les analyses `ANALYSE_P001-200.md`, `ANALYSE_P201-380.md` du même dossier.
- Texte du livre : `E:/Outil MJ Warhammer/tmp/v5-diff-v2-v3/v3.txt` (pages séparées par `\f`, page n = n-ième bloc), PDF `E:/Projet Warhammer Ennemi Intérieur/tmp/catalogue-bibliotheque/pdfs/Livre de base V5 EN v3.pdf` (`pdftotext -f N -l N -layout`, ou `pdftoppm` pour un tableau).
- **Conservés, ne pas toucher** : dotations de carrière / Navigation, Fantasmagorie, Jambes solides (version actuelle, choix DR ou unités gardé), Trahison de Tzeentch, Trait Imprégné d'Ulgu (non ajouté).

## Conventions du projet

- Toute mesure en yards s'écrit avec la **même valeur en mètres** (« m »), sans conversion.
- Modificateurs en DR V5. Les distances sont des aides affichées, jamais suivies.
- La feuille Google « Aides de Jeu » du MJ fait foi pour armes, talents, sorts et mots-clés ; elle est **déjà corrigée** pour la v3 (journal : `E:/Outil MJ Warhammer/tmp/v5-diff-v2-v3/JOURNAL_FEUILLE.md` ; le MJ a aussi passé Arc elfique et Arc d'Anirain à =+9).
- Les sources qui citent « Livre de base V5 EN v2 » (en-têtes, `sourceBook`, empreintes de PDF) passent à la v3 là où le contenu suit la v3.

## Règles de travail

- Travaille uniquement dans ton worktree, sur ta branche. Commits locaux, **jamais de push**, jamais `git stash`, ni version ni `sw.js` (sauf si un module neuf est créé : signale-le, Claude fera le précache).
- `TEMP=E:/tmp-node TMP=E:/tmp-node` pour `node --test`. Fins de ligne LF (Python : `newline=''`).
- D'abord des tests rouges qui épinglent la v3, puis le code. Ne jamais plier une règle à un test ; une assertion existante ne change que si elle épinglait la v2 (dis-le dans le message de commit).
- Commits petits, en anglais, terminés par ` (Claude)`, ligne vide, `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Fin : tes tests, la suite complète `node --test` (tout vert attendu), et `node tools/run-divine-recipe.mjs` si tu touches magie, prières, référentiel ou interface (le manifeste `tmp/divin/base-manifest.json` est fourni ; si tu modifies légitimement `reference-snapshot.json` ou un CSV de `js/data/reference-source-csv/`, la recette échouera sur « source protégée » : signale-le, ne régénère pas le manifeste toi-même).
- Rapport en français, court : commits, chaque `id` traité (fait / déjà conforme / non fait et pourquoi), résultats exacts des tests, ambiguïtés pour le MJ (non tranchées).
