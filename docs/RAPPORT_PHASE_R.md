# Rapport — phase R (ménage, tests, refactorisation), 30-31/10/2026

Version publiée : **3.29.0** (aucun changement de comportement). Branche de travail : `claude/phase-r`, fusionnée dans `codex/divin-v5` puis poussée sur `main`.

## Résultats

- Suite `node --test` : 5 462 / 5 462 (5 471 au départ, moins les 12 tests P4a qui s'exécutaient deux fois, plus les 3 du golden master du store).
- Recette divine : 26 / 26, au départ, après R2, après la phase 1 de R3, après R3 et sur la 3.29.0.
- Parcours navigateur : `test:browser`, `test:magic-browser`, `test:references-browser` verts après chaque lot d'interface. État de `npm run test:browser-all` au départ : 93/105, échecs préexistants listés plus bas.

## R1 — ménage du disque

Voir `docs/MENAGE_R1.md` : liste soumise au MJ, décisions du 30/10 au matin, exécution (46 worktrees retirés après avoir défait 22 jonctions `node_modules` ; branches fusionnées supprimées ; `tmp/` de 4,4 Go à 157 Mo) ; archives dans `docs/archives/`.

## R2 — tests

- 525 fichiers `tests/*.test.js` regroupés en 53 fichiers sous `tests/unit/<domaine>/` (données, créatures, magie, divin, combat, corruption, séquelles, référentiel, stockage). Correspondance fichier par fichier : `docs/R2_TESTS_CORRESPONDANCE.md` ; doublons : `docs/R2_TESTS_DOUBLONS.md`.
- Parcours navigateur séparés : `npm run test:browser-all` (un par un), hors de `node --test`.
- Preuve de chaque étape (`tmp/phase-r/verify-merge.mjs`) : originaux et cibles exécutés chacun dans un processus, mêmes noms de tests, 0 échec, **couverture `js/**` identique**, chaque ligne d'assertion retrouvée. Aucune assertion supprimée ; seul doublon retiré : la double exécution des 12 tests P4a (R2-7).
- Couverture globale : non remesurée sur toute la suite ; elle est garantie étape par étape par l'égalité de couverture des fichiers déplacés.
- R2-11 et R2-12 ont été faits par Gemini (Antigravity), contre-vérifiés par le même outil.

## R3 — code

- **Outillage** (hors dépôt, `tmp/phase-r/`) : `refactor-check.mjs` (modes `move`, `api`, `format` : jetons identiques, exports identiques, liaisons des noms libres, précache `sw.js`), `unbound-check.mjs` (nom utilisé ni importé ni déclaré), `split-statements.mjs` (une instruction par ligne). Golden master du store dans le dépôt : `tests/unit/refactor/store-golden.test.js` (416 appels déterministes, empreinte de l'état après chaque appel, ordre et arité des 278 clés de l'API).
- **Phase 1, déplacements purs** : 12 modules (`js/core/store/` : gardes d'actions V5, mort critique, registre des participants ; `js/core/resolution/` : libellés, entrées, critiques, commun ; `js/ui/resolution-panel/` : DOM, critiques, magie, résultat ; `js/ui/workspace/helpers.js`).
- **Phase 2, API du store en fabriques** : `api-divine.js` (17 méthodes sur 36), `api-aftermath.js` (25), `api-v5-combat-actions.js` (9).
- **Phase 3** : une instruction par ligne dans les quatre gros fichiers et les modules extraits, prouvé par jetons et AST identiques. `store.js` : 5 798 lignes au départ ; lignes de plus de 200 caractères ramenées de 309 à 192.
- Arrêtés ou reportés (risque, ou preuve impossible avec ces outils) :
  - R3-4 et R3-5 : fonctions internes à `createStore`, pas des déclarations de module.
  - R3-15 (Corruption), les 19 méthodes divines restantes, R3-17 à R3-22 : elles lisent des liaisons réassignées (`localRevision`, `combat`, `stateExtensions`) ; il faudrait des accesseurs, donc modifier les corps (substitution déclarée, § 3.3 du plan R3).
  - Phase 4 (découpes à fermeture forte : `runMagicSecondary`, `renderResolutionPanel`, `applyResolution`, cœur du store) : non entreprise.
  - Instructions très longues (chaînes d'appels, littéraux) : non découpées.
- Incident contrôlé : sur R3-10/11, Gemini a réécrit l'historique (`reset`, `amend`) et contourné un import manquant par une variable globale ; arrêté, corrigé (`ea26919`, `04567bb`), contre-vérifié. Le parcours `test:browser` échouait bien sur son commit fautif.

## Questions pour le MJ

1. **Peur sans indice** : le livre v3 p.358 dit « Fear (1, if not stated) », ce que fait le moteur ; l'arbitrage C0 (21/10) demandait la saisie du MJ. Profils : Oint druchii (L09), Heomreth et Kurt Helborg (V4).
2. **Pause de Focalisation et Œil de la tempête** : l'Exténué s'applique encore à la pause, et Œil de la tempête ne l'ignore pas. Étendre ?
3. **Grim** : limité à une attaque gratuite par Tour (le livre ne pose pas de limite).
4. **Faux de Shyish et attribut des Bêtes** : distances non suivies ; l'attribut retire l'Élan à tous les ennemis vivants actifs, sans liste décochable.
5. **Morsure** : toute valeur imprimée est gardée ; BF+3 seulement sans aucun chiffre.
6. **Perturbant** : un Perturbant `neutre` touche les autres camps ; un participant `neutre` n'est jamais touché.
7. Les « yards » des `sourceText` bruts du bestiaire : laissés tels quels.
8. `tools/check-lot3-generation.mjs` échoue depuis la v3 (`400 !== 277`) et les générateurs lot3 produisent des documents différents des documents commités : régénérer `docs/lot3` (hors phase R) ?
9. Suite de R3 : lots à accesseurs et phase 4, ou s'arrêter là ?

## Parcours navigateur en échec avant la phase R (inchangés)

divin-v5-b10, divin-v5-b5, lot1-pwa-sessions (et lot2-v5-25-browser-runner), lot3-v5-magic-2b-ui, pro-q29-tailles, pro-q31, pro-q42 ; instables : f2-c-state, browser-keywords ; demandent un build : lot2-v5-25-release, lot3-v5-35-release.
