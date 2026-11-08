# U8 · État du code : où chaque effet est calculé (05/11/2026)

> **Document historique (08/11/2026).** Relevé du 05/11 avant les lots L0 à L7 de `tasks.md`, tous livrés en 3.41.0 ; l’écart de cumul décrit en dernière section est corrigé par L0/L1 (55bd897, fb007e0, ed52cd4) et les adaptateurs des familles sont branchés dans `buildCombatTest` (L5z, 8527b64). Les numéros de ligne ci-dessous ne valent plus.

Relevé en lecture seule sur `dd658b6` (branche issue de `dev/recette-plateau-04-11`). Les comptes marqués « ~ » sont des ordres de grandeur. Chemins sous `js/`.

## Le pivot qui existe déjà

Un Test passe par `buildCombatTest` (`core/v5-combat-rules.js:139-416`) puis `previewV5Test` (`core/v5-roll.js:48-68`). Tout y devient l'une de trois formes :
- `modifiers` : liste `{id, label, amount}` en DR, **sommée** sans règle de cumul ;
- `advantageSources` / `disadvantageSources` : listes de sources, annulation un pour un, +1 DR par source au-delà de la première (`summarizeV5Advantage`, `v5-roll.js:40`) ;
- pénalité d'États : la plus forte seulement (`v5-combat-rules.js:296-318`).

Les plafonds de prière s'appliquent **après** le jet, option par option (`core/resolution.js:255-285`, `applyPrayerSLCaps`).

## Par famille

| Famille | Données | Calcul | Arrivée dans le Test | Cumul |
|---|---|---|---|---|
| **Talents** | 131 contrats, 382 clauses (`data/v5-*talent-contracts.json`) | évaluateur générique `core/talent-contract-v2.js` (v1 encore lu : `talent-contracts.js`), façade `v5-talents.js` | `previewV5TalentTestModifiers` → `modifiers`, `advantageSources` | **explicite** : `stack` = `unique` / `add` / `max` + `stackGroup` (`talent-contract-v2.js:25-49`, 151-157) |
| Talents hors contrats | 41 `activateTalent` ; IDs `talent-…` en dur dans 16 modules `v5-talent-*.js` (+11 dans `resolution.js`) | code dédié (Frénésie, psychologie, tourbillon, Petit…) | variable | aucun |
| **Prières** | 207 éléments, ~32 types (`data/v5-divine-contracts.json`) | registre `v5-divine-effect-handlers.js` + `v5-divine-effects-*.js` | couche dans `extensions.v5.divineEffects[]` → fusionnée avec les sorts dans `recomputeLayerValues` (`core/v5-magic-effects.js:410-446`) → `v5.testModifiers` (clé → entier) → `magicSkillModifiers` (`v5-magic-talents.js:136`) | « meilleur bonus + pire pénalité » **par clé** ; même prière deux fois refusée (R4) ; prière + sort sur la même clé **refusés** à la pose (DIV-05, `v5-divine-store.js:241-252`) |
| **Sorts** | 400 contrats (`data/v5-spell-contracts.json`) ; ~97 drapeaux `specialState`, ~66 lus un par un, ~31 jamais lus | `v5-spell-contracts.js`, `v5-magic-effects.js` (`applySpellEffects` :530) | même pile que les prières | même règle, **copiée trois fois** : caractéristiques (:47-95), PA (:117-152), Tests (:212-243) ; drapeaux `specialState` fusionnés en « dernier gagnant » (:446) |
| **États** | `core/v5-effects.js` (`V5_CONDITION_KEYS`), `data/states.js` | lus directement dans `buildCombatTest` | pénalité (la plus forte) + Désavantages (À terre, Aveuglé, Souillé) + restrictions (Inconscient, Surpris) | la plus forte ; exceptions par drapeaux (`ignoreConditionPenalties`, `ignoreFatiguePenalties`, talents) |
| **Traits de créatures** | `data/creature-abilities.js`, `creature-keywords.js`, profils `data/bestiary/` | code : un `parseXTrait` / `planX` par thème (`creature-movement.js`, `-senses.js`, `-combat.js`, `-psychology.js`, `-states.js`…) | `movementTestRules`, `senseTestRules` → `modifiers` (`v5-combat-rules.js:233-238`) ; états et régénération via `store.js:3722-3800` | aucun (concaténation) |
| **Qualités d'armes / armures** | registre `data/keyword-engines.js` (11 moteurs), garde de version `keyword-engine-contracts.json` (24) | `damage.js`, `roll-qualities.js`, `v5-weapon-qualities.js` (12 `previewV5*`), `keywords.js` (couverture) | `modifiers` (Pointue/Imprécise, Défensive/Déséquilibrée), score cible (Précise), dégâts | exclusions en dur (`overrides`, « Bouclier ne cumule pas avec Défensive » `v5-combat-rules.js:256`) |
| **Montures** | `extensions.v5.declaredMount` / `mountOf` | `v5-mounted-combat.js` (Avantage cavalerie, Désavantage du cavalier, BF de la monture en charge, chute) | en amont de `buildCombatTest` (`resolution.js:182-209`, 599, 1168-1243) | aucun |
| **Surnombre** | — | `outnumbering.js:84` | `modifiers` (`v5-combat-rules.js:238`) | règle B12 (Maîtrise du combat à deux sans cumul avec la Taille) en dur |

## Vocabulaires concurrents (une même brique, plusieurs noms)

- **+X DR** : `modifySL` (talents), `test-modifier` (prières), `testModifiers` (sorts), `attack-sl-bonus` / `defense-sl-bonus` (qualités), `amount` (Traits), `slModifiers` (saisie libre, salve, résolution).
- **Avantage** : `grantAdvantage` (talents), `advantageSources` (montures, soutien), `advantageFilter` (couches).
- **Caractéristique** : `characteristic-modifier` (prières), `stat-modifiers` (sorts).
- **Dégâts** : `modifyDamage` / `replaceDamage` (talents), `weapon-bonus` / `direct-damage` (prières), `damage` / `magic-missile` / `weaponBonus` (sorts), `percutante` / `devastatrice` (qualités), BF de monture.
- **Armure** : `ignoreArmourFlaw`, `armor-bonus`, `armor`, `ward`, `barrakul`.
- **États** : acquisition, retrait, immunité, verrou sous trois formes ; drapeaux `specialState` de prières (6 autorisés) et de sorts (~97).
- **Octroi** : `grant-talent` / `grant-trait` (prières), `talents` / `traits` (sorts).

## Chemins de Test hors du pivot

Une trentaine d'appels directs à `previewV5Test` ne passent pas par `buildCombatTest` et ne lisent ni `magicSkillModifiers` ni la pénalité d'États : Test de prière (`v5-divine-engine.js:371-380`, ne lit que les clés `all`/`pray`/`prayer`/`priere`), lancement et canalisation (`v5-magic-casting.js:333`, `v5-magic-channelling.js`), Dissipation (`v5-magic-dispel.js:65-77`), effets de sorts (`v5-magic-turn.js` ~15, `v5-spell-contracts.js` ~12), fuite (`v5-broken-escape.js`), maladresses, séquelles, chutes et monte (`store.js:1994`, 5110), équipement (`v5-supplemental-equipment.js`).

## Couverture du test de cumul existant

`tests/unit/moteur/cumul-effets.test.js` (9 cas, vert) : talent + prière + sort, R1 à R4, clés « Endurance » et « adverse ». **Non couverts** : États, montures, surnombre, qualités, plafonds de prière, `specialState`, deux prières de types différents, chemins hors pivot, règles PA et caractéristiques.

## Écart constaté (reproduit le 05/11)

Deux sorts différents qui visent le même Test par des **clés différentes** se cumulent. « Dur comme le roc » (`carac:e` +2) et « Brise-dents » (`Endurance` +2) posés sur un même personnage : Test de Résistance à −1 DR de base → **+3** (soit +4), alors que la règle R3 (p. 235, déjà citée dans le test) donne le seul meilleur bonus, **+1**. Cause : `calculateEffectiveTestModifiers` groupe par clé ; c'est `magicSkillModifiers` qui résout la clé vers le Test, après le cumul. La même cause devrait sommer deux pénalités de clés différentes (`Tous les Tests` et `Résistance`) : non reproduit, à couvrir par le lot L0. Le test existant passe parce que ses deux sorts identiques partagent la même clé. Selon la proposition du 02/11, « un vrai bug justifie à lui seul le lot 2 ».
