# Rapport du lot espèces — 28 octobre 2026

Worktree `E:/Outil MJ Warhammer/tmp/gpt-especes-worktree`, branche `gpt/especes`, base `9744ff8`. Trois commits locaux ; aucun push, fusion, changement de version ou de `sw.js`. Worktree T3 non utilisé.

## Commits

- `7dc9793` — valeurs d'espèces, avertissement et tests sur la fixture réelle Caelel. `tests/e26-fiche-sync.test.js` : trois anciennes assertions sur l'exclusion du BF et l'absence de Force du Halfling adaptées à la décision V5, ainsi que le nom du test. Ce code a été validé par Claude avant commit.
- `88549d8` — lorsque le Mouvement de la fiche est inconnu, ne pas recopier celui de la réserve sur les participants ni le fournir au rebase magique. Test rouge avant puis vert, avec participants de mouvements distincts, sans et avec base magique.
- `c96f753` — couverture magique tenue à la main, couverture générale régénérée, mode `--check` réel sans écriture et tests. Le lecteur de couverture reconnaît le raccordement direct de Maître à bord ; aucune règle de jeu n'est modifiée. Tests ajoutés : `tests/especes-coverage-check.test.js` et `tests/lot3-especes-divin-coverage.test.js` (ce dernier exécute la recette divine existante de Haine sacrée).

## Livres contrôlés par la revue indépendante précédente

- L06 p.31, 40 et 319 : Halfling M3 et formule avec BF ; p.361 : Grande taille ×2. L06 p.33 : M5 des Elfes.
- L07 p.160 : Skink et caméléon M6, 2×BE + BFM. L09 p.44 : Elfe noir M5. L08 p.57 : Elfe des mers assimilé au Haut-Elfe ; M5 déduit de L06 p.33, pas explicitement indiqué en L08 p.57.
- L24 p.88 imprimée, page physique 89 : Gnome M3 et 2×BE + BFM. Écarts : L06 p.323 donne un Gnome de bestiaire M4 et Blessures avec BF ; L06 p.361 donne pour Petit 2×BE sans BFM. La décision du MJ prime.

## Vérifications et limite de fusion

- Tests ciblés espèces et synchronisation : 24/24 ; tests ciblés couverture et divin : 39/39, puis 6/6 et 3/3 pour les compléments. Les tests du générateur vérifient une sortie conforme, une sortie altérée, le code 1 et l'absence d'écriture.
- Suite `node --test --test-concurrency=4` : **5 108/5 110**, deux échecs. `tests/sw.test.js` signale les six modules F2 non précachés déjà connus. `tests/lot2-v5-24-control.test.js:183` exige encore que Béni et Invocation soient `deferred`, alors que la couverture demandée reflète leur prise en charge divine. Le brief interdit de modifier les tests existants sauf ceux épinglant les anciennes valeurs Halfling : ce test reste donc inchangé. La suite n'est pas verte selon le critère d'acceptation ; cette incompatibilité doit être résolue avant fusion.
- Le reçu `tmp/divin/recipe-receipt.json` existe désormais : l'échec de traversal de la première exécution ne se reproduit pas. Il provient d'une recette interrompue et ne constitue pas une recette divine verte.
- `build-v5-talent-coverage.mjs --check`, `build-v5-divine-contracts.mjs --check` et `tools/audit/build-audit.mjs --check` réussis ; `git diff --check` vert ; fichiers suivis en LF. `docs/VARIABLES_PERSISTANTES_PJ.md` inchangé.
