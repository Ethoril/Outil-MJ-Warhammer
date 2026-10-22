# Rapport — phase D (traditions de magie), exécutant : Claude Pro

Branche `pro/phase-d`. Plan : `PLAN_PRO_PHASE_D.md`. Choix d'interprétation : `CHOIX_EXECUTANT_PHASE_D.md`. Rapport **partiel** (session arrêtée sur limite de quota, reprise du plan par lots).

## Lots

| Lot | État | Commit |
|---|---|---|
| D1 socle (registre, générateur, caractérisation) | FAIT | 60be0b7, 9ef485e |
| D2 Magie naturelle (8, L06) | FAIT | b735374 |
| D3 Magie naturelle (9, AOTE3) | FAIT | c7bad12 |
| D4 Sorcellerie (8) | FAIT | a75e55d |
| D5 Démonologie (4) | FAIT | 138f62f |
| D6 Nécromancie (4) | FAIT | 66c0810 |
| D7 Nurgle (3) + attributs des trois Domaines du Chaos (caractérisation f11e9ae avant) | FAIT | 535068c |
| D8 Slaanesh (3) | FAIT | 2ecd542 |
| D9 Tzeentch (3) | FAIT | 0538bdc |
| D10 Familiers : conception (`CONCEPTION_FAMILIERS.md`) | FAIT | voir `git log` |
| D11 Familiers : code | BLOQUÉ : le familier est un participant dont le profil (3 types) est une donnée de bestiaire de la phase E ; raison détaillée §4 de la conception | |
| D12 Grande Gueule (11 sorts, L01 + L12) + attribut de l'offrande | FAIT | voir `git log` (« Grande Gueule ») |
| D13 Petite Waaagh (12) + D14 Grande Waaagh (12) (L12 ; L07 p.183 écarts consignés) | FAIT (un seul commit pour les deux) | voir `git log` (« magie orque ») |
| D15 Lustria : 4 sorts de Haute Magie + 4 extensions Slann (`variantOf`) | FAIT | voir `git log` (« Lustria ») |
| D16 Vaul (9) + D17 mer (10) + D18 Hoeth (10), L08 pp. 102-111 | FAIT (un seul commit pour les trois) | voir `git log` (« magie des prêtres elfes ») |
| D19 Compléments des Collèges (8 Arcanes L17 + Voile de brouillard L07) | FAIT | voir `git log` (« Compléments des Collèges ») |
| D20 Runes naines : conception | NON FAIT | |
| D21 Recette et rapport final | NON FAIT | |

## Dernière suite complète

`node --test --test-concurrency=4` : tout vert sauf `E0 indépendant — la recette refuse un cwd externe avant de créer un reçu` (lit `tmp/divin/recipe-receipt.json`, produit par `node tools/run-divine-recipe.mjs` ; échec antérieur au lot, indépendant de la phase D, à relancer au lot D21).

## Assertions de tests existants modifiées

- `tests/lot3-v5-catalogue-lileath.test.js:13` : décompte des 277 contrats limité aux contrats d'audit (`!isTradition`) — lot D1.

## Points d'attention

- Le générateur `node tools/build-v5-spell-contracts.mjs` (même avec `--check`) réécrit aussi `docs/lot3/LOT3_MATRICE_CONTRATS_V5.md`. Dans cet environnement, la sonde de couverture périodique classe 6 sorts d'audit (Bjuna, Délivrance, Blizzard enflammé, Comète, Bannissement Majeur, Tempête…) en « Rappel » au lieu de « Contrat à effet calculable » — **y compris sur le commit 60be0b7, avant toute modification de la phase D** — ce qui fait échouer `tests/lot3-v5-retours-catalogue.test.js`. La matrice commitée n'a donc pas été régénérée (restaurée par `git checkout` après chaque génération) : elle ne contient pas les lignes des sorts de traditions. À investiguer séparément (dépendance à l'environnement de la sonde).
- Moteur étendu (rétrocompatible) : `removeConditionLevels`, `alwaysConditions` (clause d'entrée), `opposedTest.targetSlModifier`, `destroyOnOpposedWin`, `secondaryTest.failOnlyIfWounded`, `summon.generic` (participants génériques en attendant la phase E), exemption de ciblage annulant un bannissement déjà calculé.
- Raccordement phase E : Squelettes et Zombies (Relever les morts, Réanimation) à brancher sur les profils du bestiaire (remplacer `summon.generic`) ; démons mineurs (Manifestation) idem.
