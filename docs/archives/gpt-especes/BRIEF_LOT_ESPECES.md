# Brief — petit lot « espèces et couverture des talents » (outil), 28/10/2026

Exécutant : GPT (instance distincte de celle qui code T3). Contre-vérification : Claude. Décisions du MJ du 26/10, déjà appliquées côté fiches (dépôt `ennemi-interieur-wfrp4`, branche `gemini/armes-v5`) : **ne touche pas à ce dépôt**.

## Mise en place

- Worktree dédié, **jamais celui de T3** : `git -C "E:/Outil MJ Warhammer" worktree add "E:/Outil MJ Warhammer/tmp/gpt-especes-worktree" -b gpt/especes 9744ff8` (pointe de `gpt/phase-f2` contre-vérifiée ; ne pas partir de `main`, qui n'a pas F2 et dont `fiche-sync.js` diffère).
- Fins de ligne LF, `npm ci`. `TEMP`/`TMP` sur E: (par exemple `E:/Outil MJ Warhammer/tmp/gpt-especes-runtime`), pour les tests de traversal.
- Règles communes : `docs/plans-gpt/REGLES_COMMUNES_GPT.md`. Source détaillée : `E:/Outil MJ Warhammer/tmp/gemini-verifs/RAPPORT_ESPECES_ET_COUVERTURE.md` (rapport Gemini), brief d'origine `E:/Outil MJ Warhammer/tmp/gemini-verifs/BRIEF_CORRECTIONS_ESPECES_ET_COUVERTURE.md`.
- **Pas de `git stash`** (pile partagée entre worktrees) ; commits locaux seulement : ni fusion, ni push, ni version, ni `sw.js`, aucun nouveau module sous `js/`.

## Périmètre — rester petit

La tranche T3, codée en parallèle, modifie aussi `js/core/fiche-sync.js` (conversion des profils V4 à l'import). Pour que Claude fusionne sans conflit :
- dans `fiche-sync.js`, ne modifier **que** les tables et fonctions des espèces (`RACES_SANS_BF`, `MOVEMENT` ~l.26-53, le calcul des Blessures et du Mouvement depuis la fiche, et le signalement d'espèce inconnue) ; aucun reformatage, aucun déplacement de code ;
- tests dans de nouveaux fichiers `tests/especes-*.test.js` ;
- couverture des talents : seulement les sources et fichiers de couverture cités plus bas.

## Décisions du MJ (26/10)

1. **Halfling : Mouvement 3** (L06 p.31 et p.319) au lieu de 4, clés `halfelin` et `halfling`.
2. **Halfling : Blessures V5** = BF + 2×BE + BFM (+ BE par rang de Dur à cuire). Retirer `halfelin`/`halfling` de `RACES_SANS_BF`. Ne touche que le calcul des Blessures du Halfling ; le reste du « Petit » homebrew (Q04) ne change pas.
3. **Ogre : Blessures doublées** (Taille Grande, L06 p.361) : (BF + 2×BE + BFM + Dur à cuire) × 2.
4. **Espèces ajoutées** au Mouvement et aux Blessures :
   - Gnome, comme un Petit : M 3, Blessures 2×BE + BFM (L24 p.88) ;
   - Elfe noir M 5 (L09 p.44) ;
   - Elfe des mers M 5 (L08 p.57, « comme tout Elfe ») ;
   - Skink M 6, Petit (L07 p.160).
   
   Prévoir les clés usuelles (avec et sans accent, singulier, variantes anglaises si elles existent déjà pour les autres espèces).
5. **Espèce inconnue** : plus de Mouvement 4 silencieux. L'outil le signale au MJ dans l'aperçu de synchronisation (valeur à saisir ou à confirmer), **sans bloquer le reste de l'import** (PV, compétences, caractéristiques continuent de se synchroniser).

Vérifie chaque valeur sur la page du PDF (`E:/Projet Warhammer Ennemi Intérieur/tmp/catalogue-bibliotheque/pdfs/`, chemins dans `DIVIN_CORPUS_LIVRES.json` ; page physique ≠ imprimée possible). Éditions : L06, L09, L10 sont V5, les autres V4 ; si une valeur V4 diffère de ce que le MJ a décidé, **la décision du MJ prime**, signale-le seulement.

## Couverture des talents (documentation, aucun changement de comportement)

Mettre à jour `js/data/v5-talent-coverage.json` et `js/data/v5-magic-talent-coverage.json` selon le rapport Gemini :
- Haine sacrée `magic:0` → automatique ;
- Béni / Invocation `magic:1` → refléter le moteur divin existant ;
- Maître à bord → assisté ;
- Dur à cuire, Grande taille, Petit : descriptions alignées sur les recalculs réels (dont ceux de ce lot) ;
- Seconde vue et Vision nocturne : effets codés documentés.

**Ces JSON sont générés** (`tools/build-v5-talent-coverage.mjs`, etc.) : modifier la source puis régénérer, jamais à la main ; `--check` de tous les générateurs verts (`build-v5-talent-coverage`, `build-v5-divine-contracts`, `tools/audit/build-audit.mjs`). Ne jamais lancer le mode complet de `generate-reference-catalog.mjs` (il réimporte la magie des fiches).

## Acceptation

- Tests nouveaux, rouges avant la correction et verts après :
  - Halfling : M 3 et Blessures avec BF ;
  - Ogre ×2, avec et sans Dur à cuire ;
  - Gnome, Elfe noir, Elfe des mers, Skink ;
  - espèce inconnue signalée sans bloquer la synchronisation des PV ni des compétences ;
  - aucun changement pour Humain, Nain, Haut-Elfe et Elfe sylvain.
- Tests sur de **vraies fiches** (fixtures existantes de `tests/` ou forme réelle des fiches Firestore), pas sur des objets inventés.
- Aucun test existant modifié, sauf ceux qui épinglent les anciennes valeurs Halfling : liste-les dans le commit avec leur raison.
- Suite complète `node --test` verte : seul `tests/sw.test.js` peut échouer, pour les six modules F2 déjà connus.
- `docs/VARIABLES_PERSISTANTES_PJ.md` inchangé : pas de nouvelle valeur durable.
- Revue indépendante (un sous-agent à contexte neuf : diff + pages PDF), puis ta vérification finale.

## Fin

Rapport court `E:/Outil MJ Warhammer/tmp/gpt-especes/RAPPORT_LOT_ESPECES.md` : commits, tests ajoutés et modifiés, valeurs vérifiées avec leurs pages, écarts éventuels entre livres et décisions. Ensuite, **arrêt** : Claude contre-vérifie et fusionnera `gpt/especes` dans `gpt/phase-f2` entre deux tranches.
