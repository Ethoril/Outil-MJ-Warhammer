# Rapport — phase D (traditions de magie et compléments), exécutant : Claude Pro

Branche `pro/phase-d`. Plan : `PLAN_PRO_PHASE_D.md`. Choix d'interprétation (relecture MJ en sélecteurs) : `CHOIX_EXECUTANT_PHASE_D.md`. Conceptions : `CONCEPTION_FAMILIERS.md`, `CONCEPTION_RUNES.md`. Le registre `tools/v5-tradition-spell-contracts.mjs` alimente `js/data/v5-spell-contracts.json` par le générateur (jamais à la main) : **400 contrats**, dont 277 d'audit inchangés (empreinte vérifiée par `tests/pro-d1-characterization.test.js`) et 123 contrats de traditions.

## Lots

| Lot | État | Commit |
|---|---|---|
| D1 socle (registre, générateur, caractérisation des 277) | FAIT | 60be0b7, 9ef485e |
| D2 Magie naturelle (8, L06) | FAIT | b735374 |
| D3 Magie naturelle (9, AOTE3 convertis en V5) | FAIT | c7bad12 |
| D4 Sorcellerie (8) | FAIT | a75e55d |
| D5 Démonologie (4) | FAIT | 138f62f |
| D6 Nécromancie (4) | FAIT | 66c0810 |
| D7 Nurgle (3) et attributs des trois Domaines du Chaos (caractérisation f11e9ae avant) | FAIT | 535068c |
| D8 Slaanesh (3) | FAIT | 2ecd542 |
| D9 Tzeentch (3) | FAIT | 0538bdc |
| D10 Familiers : conception | FAIT | b27431d |
| D11 Familiers : code | BLOQUÉ : le familier est un participant dont le profil (trois types) est une donnée de bestiaire de la phase E ; raison détaillée au §4 de la conception | b27431d |
| D12 Grande Gueule (11 sorts, L01 + L12) et attribut de l'offrande | FAIT | a263529 |
| D13 Petite Waaagh (12) et D14 Grande Waaagh (12), L12 ; écarts L07 consignés | FAIT (un commit pour les deux) | 9f1fb92 |
| D15 Lustria : 4 sorts de Haute Magie et 4 extensions Slann (`variantOf`) | FAIT | c21fe66 |
| D16 Vaul (9), D17 mer (10), D18 Hoeth (10), L08 | FAIT (un commit pour les trois) | 89a278f |
| D19 Compléments des Collèges (8 Arcanes L17 + Voile de brouillard L07) | FAIT | 1a265c8 |
| D20 Runes naines : conception (`CONCEPTION_RUNES.md`) | FAIT | voir `git log` (« runes ») |
| D21 Recette et rapport | FAIT : recette divine verte (26 commandes), ce rapport | voir `git log` (« D21 ») |

## Dernières vérifications

- `node --test --test-concurrency=4` : **3680 tests, 0 échec**.
- `node tools/run-divine-recipe.mjs` : **RECETTE DIVINE VERTE — 26 commandes** (la fin lit `tmp/divin/base-manifest.json`, capture des sources protégées prise sur le commit `abe0634^`, hors dépôt).
- Fins de ligne : `git ls-files --eol` sans `crlf`.

## Assertions de tests existants modifiées

- `tests/lot3-v5-catalogue-lileath.test.js` : décompte des 277 contrats limité aux contrats d'audit (`!isTradition`) — D1 ; la vérification « D-21 annulée » accepte désormais le contrat de tradition `Silence (Arcane)` (distinct du Silence d'Ombres, résolution de Q15, aucune identité du catalogue public) — D19.
- `tests/lot3-v5-magic-34.test.js` : les décomptes « 16 sorts de Haute Magie » et « 31 sorts de suivi fiche » portent sur les contrats d'audit — D15.
- `tests/browser-magic-v5-smoke.mjs` : le décompte hors ligne de 277 contrats porte sur les contrats d'audit, plus une assertion que les contrats de traditions sont aussi servis — D21.
- `tests/helpers/lot3-declared-answers.js` : deux faits déclarés ajoutés (`boonSpell`, `bloodgruelHeal`) pour la sonde « aucun sort Vous ne blesse son lanceur » — D9, D12.
- `tests/helpers/lot3-domain-fixture.js` : le contrôle « fait absent ⇒ lancement refusé » ignore les faits `optional` — D12.
- Tests de la phase D (`pro-d1-registre.test.js`) adaptés pour reconnaître les variantes Slann (`variantOf`) — D15.

## Moteur étendu (rétrocompatible, toutes les suites existantes vertes)

`removeConditionLevels`, `alwaysConditions`, `opposedTest.targetSlModifier` et `casterScore`, `destroyOnOpposedWin`, `secondaryTest.failOnlyIfWounded` et `damageOnSuccessMinusSl`, `summon.generic` (participants génériques), `askFact` (question de fin de clause), `failCorruption`, `grantMomentum`, `conditionPerDr`, `metalArmourTestModifiers`, `conjureWeaponProfile`/`conjureWeaponScore`, `missile.fixedLocation` et `talentDamage`, soin `amountFact`, fait `contractSpell`, formules de dégâts `BE`/`BIntelligence`, attributs de Domaine (Nurgle, Slaanesh, Tzeentch, Grande Gueule, Petite et Grande Waaagh), variantes de contrats (`variantOf`) dans le générateur.

## Points d'attention pour le MJ

- **Matrice de contrats** : le générateur (même avec `--check`) réécrit `docs/lot3/LOT3_MATRICE_CONTRATS_V5.md`. Dans cet environnement la sonde de couverture périodique classe six sorts d'audit (Bjuna, Délivrance, Blizzard enflammé, Comète, Bannissement Majeur, Tempête) en « Rappel » au lieu de « Contrat à effet calculable » — **déjà sur le commit 60be0b7, avant la phase D** — ce qui fait échouer `tests/lot3-v5-retours-catalogue.test.js`. La matrice commitée n'a donc jamais été régénérée (restaurée par `git checkout`) : elle ne contient pas les lignes des sorts de traditions. À investiguer séparément (dépendance à l'environnement de la sonde).
- **Reste à la phase E** : profils de bestiaire (Squelettes, Zombies, démons mineurs, Merwyrm, Océanide, Fantôme, Bête des fens), lien automatisé des familiers (D11), service de Natures.
- **À arbitrer** (non implantés, listés dans les choix) : règles de la Waaagh hors sorts (canalisation, table de Fiasco, objets, champignons), magie skaven et noire elfique, Mòna, sorts de navire, rituels (dont la création de familier), runes (conception seule).
- **Le MJ doit relire en priorité** les choix D-C14 (Dague de l'Art), D-C50 à D-C53 (attributs du Chaos), D-C70 (Chance jusqu'à la fin de la rencontre), D-C91 (Avantage → Élan), D-C101 (extensions Slann en contrats distincts).
