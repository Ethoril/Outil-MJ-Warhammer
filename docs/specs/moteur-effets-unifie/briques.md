# U8 · Briques d’effet

<!-- Fichier généré par `node tools/build-effect-bricks.mjs` depuis `js/core/effect-engine.js` et `js/core/supplement-loader.js`. Ne pas modifier à la main. -->

Ce qu’un supplément peut déclarer **sans JS** dans `js/data/v5-supplements.json`. Tout ce qui n’est pas listé ici est refusé au chargement, avec un message qui nomme le supplément, l’élément et le champ ; l’élément est écarté, l’application démarre quand même (message d’erreur affiché au démarrage).

## Format du fichier

```json
{
  "schemaVersion": 1,
  "supplements": [
    {
      "id": "sea-of-claws",
      "title": "Sea of Claws",
      "version": "1",
      "edition": "V5",
      "reference": "Sea of Claws (V5)",
      "talents": [
        "… talent …"
      ],
      "prayers": [
        "… prière …"
      ],
      "spells": [
        "… sort …"
      ]
    }
  ]
}
```

- Familles : `talents` (porteur `talent`), `prayers` (porteur `prayer`), `spells` (porteur `spell`). Le porteur (`bearer`) est déduit de la famille : ne pas l’écrire.
- Un identifiant déjà pris par le livre ou par un autre supplément est refusé.

### Talent

Contrat v2 des talents (même évaluateur que les talents du livre) :

```json
{
  "id": "talent-exemple",
  "name": "Exemple",
  "description": "Texte de l’effet, tel que publié.",
  "status": "validated",
  "source": {
    "reference": "Sea of Claws, p. …",
    "effectHash": "sha256:<64 hex>"
  },
  "clauses": [
    {
      "id": "bonus",
      "event": "test.beforeRoll",
      "role": "actor",
      "when": [
        {
          "field": "onOcean",
          "op": "eq",
          "value": true
        }
      ],
      "effects": [
        {
          "op": "modifySL",
          "amount": 1,
          "stackGroup": "talent-exemple",
          "stack": "max"
        }
      ]
    }
  ]
}
```

- `status` : `validated` (appliqué) ou `draft` (tracé, jamais appliqué).
- `source.effectHash` : empreinte sha256 du texte `description` (`node -e "console.log('sha256:'+require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" "<texte>"`) ; vérifiée par `tests/unit/moteur/supplement-sans-js.test.js`.
- Coûts, exemptions et quotas d’action (`costs`, `exemptions`, `quotas`) : vocabulaire de `js/core/v5-action-costs-schema.js`. Coût `{ id, resource, amount, actorId? }` (ressource `momentum`, `fate` ou ressource déclarée) ; exemption `{ costId, sourceId }` ; quota `{ id, scope, maximum, amount? }`, portée `turn`, `round`, `encounter` ou `session` (« une fois par Round » : `{ id: "…", scope: "round", maximum: 1 }`).
- Le personnage acquiert le talent par son identifiant (`talents: [{ id, status: "resolved", rank }]`).

### Sort

Lançable par le panneau de magie comme un sort du livre (NI, portée, cible, durée du JSON) ; ses effets sont des effets de couche :

```json
{
  "id": "spell-exemple",
  "name": "Exemple",
  "description": "Texte affiché en rappel.",
  "reference": "Sea of Claws, p. …",
  "page": 42,
  "lore": "Domaine de …",
  "domain": null,
  "wind": null,
  "cn": 3,
  "range": "Bonus de Force Mentale mètres",
  "target": "1",
  "duration": "Bonus de Force Mentale Rounds",
  "overcast": {
    "allowed": true,
    "options": [
      "range",
      "duration",
      "targets"
    ]
  },
  "aoe": false,
  "clauses": [
    {
      "id": "endurance",
      "event": "test.beforeRoll",
      "role": "actor",
      "when": [],
      "effects": [
        {
          "op": "modifySL",
          "amount": 2,
          "key": "carac:e"
        }
      ]
    }
  ]
}
```

- `cn` : NI entière ; `range`, `target`, `duration` : textes du livre, lus comme ceux des sorts du livre (« Vous », « Bonus de Force Mentale mètres », « Bonus de Force Mentale Rounds »…) ; `lore` : libellé du Domaine ; surincantation : options parmi `range`, `duration`, `targets`, `aoe`.

### Prière

Invocable par le panneau divin comme une prière du livre ; le talent requis (Béni / Invocation du dieu) et la progression par DR sont repris d’une prière du livre du même dieu et du même type :

```json
{
  "id": "divine:sea-of-claws:exemple",
  "name": "Exemple",
  "description": "Texte affiché.",
  "reference": "Sea of Claws, p. …",
  "page": 42,
  "type": "miracle",
  "deity": "Manann",
  "range": {
    "kind": "self"
  },
  "targets": {
    "kind": "self"
  },
  "duration": {
    "kind": "characteristic-bonus",
    "characteristic": "Soc",
    "unit": "rounds"
  },
  "clauses": [
    {
      "id": "resistance",
      "event": "test.beforeRoll",
      "role": "actor",
      "when": [],
      "effects": [
        {
          "op": "modifySL",
          "amount": 2,
          "key": "Résistance"
        }
      ]
    }
  ]
}
```

- `type` : `blessing` ou `miracle` ; `deity` : un dieu qui a déjà une prière de ce type au livre.
- `range` : `kind` parmi `fixed`, `self`, `touch`, `characteristic`, `characteristic-bonus` ; `value` entière pour `fixed` / `count`, `characteristic` (CC, CT, F, E, I, Ag, Dex, Int, FM, Soc) pour `characteristic*`, `unit: "yards"` (mètres, même valeur).
- `targets` : `kind` parmi `count`, `self`, `characteristic-bonus` ; `value` entière pour `fixed` / `count`, `characteristic` (CC, CT, F, E, I, Ag, Dex, Int, FM, Soc) pour `characteristic*`.
- `duration` : `kind` parmi `fixed`, `characteristic`, `characteristic-bonus` ; `value` entière pour `fixed` / `count`, `characteristic` (CC, CT, F, E, I, Ag, Dex, Int, FM, Soc) pour `characteristic*`, `unit` : `rounds`, `minutes`, `hours` ou `days`.

### Effets de couche (sort et prière)

- Événement `test.beforeRoll`, rôle `actor`, `when` vide, opération(s) : `modifySL`.
- `key` : clé de Test (« Endurance », « Corps à corps (Escrime) », « carac:e », « all » ou « Tous les Tests », « Perception adverse »).
- `amount` : entier non nul ; `stackable: true` (sur tous les effets de l’élément) pour une exception cumulée explicite du livre.
- Cumul imposé par la famille : `bestBonusWorstPenalty` (groupe `magic-test`) ; une couche = une source, ses clés visant le même Test s’additionnent (Q13).
- Les autres effets des sorts et prières (dégâts, États, Traits, PA…) ne sont pas encore des briques : ils restent dans les formats actuels (`v5-spell-contracts.json`, `v5-divine-contracts.json`), décision Q7 du MJ ; L8 et L9 les ajouteront.

## Événements

`test.beforeRoll`, `test.afterRoll`, `damage.beforeProtection`, `condition.beforeAcquire`, `momentum.beforeLoss`, `action.before`, `action.afterAttack`, `critical.beforeTable`, `protection.before`, `talent.activate`, `combat.beforeTests`, `situation.calculate`, `healing.afterTest`

## Rôles

`actor`, `attacker`, `defender`

## Conditions (`when`)

Opérateurs : `eq`, `in`, `gte`, `lteField`, `matchesSpecialization` (`lteField` compare à `otherField`, `matchesSpecialization` à la spécialité du talent, sans `value`).

Champs du contexte : `actor.hasMomentum`, `actor.id`, `actor.size`, `aimed`, `airshipFlight`, `arguingBeforeAssembly`, `attack.hit`, `attack.success`, `attack.usedAdvantageV5`, `attributeId`, `avoidingSurprise`, `begging`, `blackpowderBrokenTest`, `breakingEntry`, `breakingObject`, `buildingCover`, `calledShot`, `causeId`, `chargedByLargerEnemy`, `charging`, `clowning`, `condition.id`, `condition.instances`, `coverPenalty`, `denouncingOrLyingAboutCause`, `dualWielding`, `emergingBelowSurprisedTarget`, `enemyGroup`, `escapingBonds`, `estimatingObject`, `extendedTest`, `falling`, `guardedAlly`, `hasSkillAdvance`, `identifyingHeraldry`, `inCombat`, `influencingGroup`, `involvesMovement`, `kind`, `lying`, `momentum.lossReason`, `musicSpecialization`, `normallyAllowedSurpriseTest`, `onOcean`, `onRiverOrLake`, `opposedTest`, `oppositionWon`, `outsideCombat`, `potentialDanger`, `preRollTalent`, `psychologyKind`, `pursuit`, `pursuitRole`, `recallingEvent`, `receivedCharge`, `recoveryTest`, `repairing`, `resistingInfluence`, `resistingPoisonOrAlcohol`, `resistingThreat`, `resistingVice`, `running`, `runningOrJumping`, `seasickness`, `silentTakedown`, `situation`, `skillGroupId`, `skillId`, `socialTest`, `specialization`, `specializationId`, `talentAction`, `target.hasMomentum`, `target.id`, `target.size`, `targetAttracted`, `targetEonir`, `targetUnaware`, `terrain`, `test.roll`, `test.sl`, `test.success`, `threatId`, `touchingOpponent`, `weapon.crewed`, `weapon.dagger`, `weapon.group`, `weapon.hack`, `weapon.impale`, `weapon.improvised`, `weapon.isMelee`, `weapon.pummel`, `weapon.reach`, `weapon.unarmed`, `winningHigherStatusFavour`.

## Opérations

| Opération | Forme | Événements admis |
|---|---|---|
| `modifySL` | numérique : `amount` entier ou `{ base, perRank, maximum? }`, `stack` `max` ou `add` | `test.beforeRoll`, `test.afterRoll` |
| `modifyDamage` | numérique : `amount` entier ou `{ base, perRank, maximum? }`, `stack` `max` ou `add` | `damage.beforeProtection` |
| `reduceConditionAcquisition` | numérique : `amount` entier ou `{ base, perRank, maximum? }`, `stack` `max` ou `add` | `condition.beforeAcquire` |
| `ignoreConditionPenalty` | numérique : `amount` entier ou `{ base, perRank, maximum? }`, `stack` `max` ou `add` | `test.beforeRoll` |
| `multiplySL` | numérique : `amount` entier ou `{ base, perRank, maximum? }`, `stack` `max` ou `add` | `test.afterRoll` |
| `limitTestPenalty` | numérique : `amount` entier ou `{ base, perRank, maximum? }`, `stack` `max` ou `add` | `test.beforeRoll` |
| `improveCover` | numérique : `amount` entier ou `{ base, perRank, maximum? }`, `stack` `max` ou `add` | `combat.beforeTests` |
| `modifyQuality` | numérique : `amount` entier ou `{ base, perRank, maximum? }`, `stack` `max` ou `add` | `action.before` |
| `increaseConditionAcquisition` | numérique : `amount` entier ou `{ base, perRank, maximum? }`, `stack` `max` ou `add` | `condition.beforeAcquire` |
| `modifyCriticalRoll` | numérique : `amount` entier ou `{ base, perRank, maximum? }`, `stack` `max` ou `add` | `critical.beforeTable` |
| `incomingPenalty` | numérique : `amount` entier ou `{ base, perRank, maximum? }`, `stack` `max` ou `add` | `combat.beforeTests` |
| `reduceCover` | numérique : `amount` entier ou `{ base, perRank, maximum? }`, `stack` `max` ou `add` | `combat.beforeTests` |
| `modifyQuantity` | numérique : `amount` entier ou `{ base, perRank, maximum? }`, `stack` `max` ou `add` | `situation.calculate` |
| `divideQuantity` | numérique : `amount` entier ou `{ base, perRank, maximum? }`, `stack` `max` ou `add` | `situation.calculate` |
| `modifyHealing` | numérique : `amount` entier ou `{ base, perRank, maximum? }`, `stack` `max` ou `add` | `healing.afterTest` |
| `grantAdvantage` | unique : `key` éventuelle, `stack` `unique` | `test.beforeRoll` |
| `grantDisadvantage` | unique : `key` éventuelle, `stack` `unique` | `test.beforeRoll` |
| `preventMomentumLoss` | unique : `key` éventuelle, `stack` `unique` | `momentum.beforeLoss` |
| `suppressQuality` | unique : `key` éventuelle, `stack` `unique` | `action.before` |
| `addQuality` | unique : `key` éventuelle, `stack` `unique` | `action.before` |
| `grantExtraAttack` | unique : `key` éventuelle, `stack` `unique` | `action.before`, `action.afterAttack` |
| `suppressTestPenalty` | unique : `key` éventuelle, `stack` `unique` | `test.beforeRoll` |
| `chooseCriticalRoll` | unique : `key` éventuelle, `stack` `unique` | `critical.beforeTable` |
| `ignoreArmourFlaw` | unique : `key` éventuelle, `stack` `unique` | `protection.before` |
| `riposte` | unique : `key` éventuelle, `stack` `unique` | `damage.beforeProtection` |
| `activateTalent` | unique : `key` éventuelle, `stack` `unique` | `talent.activate` |
| `forceTestSuccess` | unique : `key` éventuelle, `stack` `unique` | `test.beforeRoll` |
| `ignoreNegativeModifiers` | unique : `key` éventuelle, `stack` `unique` | `test.beforeRoll` |
| `forceDefenseSkill` | unique : `key` éventuelle, `stack` `unique` | `action.before` |
| `grantMomentum` | unique : `key` éventuelle, `stack` `unique` | `combat.beforeTests` |
| `suppressProneBonus` | unique : `key` éventuelle, `stack` `unique` | `combat.beforeTests` |
| `ignoreQuantityPenalty` | unique : `key` éventuelle, `stack` `unique` | `situation.calculate` |
| `chooseSLUnits` | forme fixe (voir `validateClauseEffect`) | `test.afterRoll` |
| `replaceDamage` | forme fixe (voir `validateClauseEffect`) | `action.afterAttack` |
| `createActiveEffect` | forme fixe (voir `validateClauseEffect`) | `action.afterAttack` |

Tout effet porte un `stackGroup` (groupe de cumul) : deux effets d’un même groupe se cumulent selon leur `stack`.

## Règles de cumul dans une famille (`stack`)

| Politique | Effet | Référence |
|---|---|---|
| `unique` | une seule occurrence | contrat de l’effet |
| `add` | somme | contrat de l’effet |
| `max` | la plus haute valeur | contrat de l’effet |
| `bestBonusWorstPenalty` | meilleur bonus et pire pénalité | V5 p. 235 (sorts) ; arbitrage du MJ du 06/11 (prières, Q10) ; une couche = une source, ses clés s’additionnent (MJ 06/11 Q13) ; HEPG p. 83 (Bénédiction de Lileath) |
| `strongest` | la plus forte pénalité | États : seule la plus forte pénalité s’applique (condition-effects.js) |

## Familles et cumul entre familles

Familles (porteurs) : `talent`, `prayer`, `spell`, `condition`, `trait`, `quality`, `mount`, `situation`, `gm`.

| Paire | Politique | Référence |
|---|---|---|
| spell + talent | sum | R1 V5 p. 130 : Difficulté et modificateurs du personnage (Talents, équipement, Sorts, autres effets) se combinent |
| prayer + talent | sum | R1 V5 p. 130 : Difficulté et modificateurs du personnage (Talents, équipement, Sorts, autres effets) se combinent |
| prayer + spell | sum | MJ 05/11 Q2 : prière et sort sur le même Test se somment (sources différentes, p. 130), même clé comprise |
| condition + spell | sum | MJ 05/11 Q3 : le malus d’un sort ou d’une prière s’ajoute à la pénalité d’États |
| condition + prayer | sum | MJ 05/11 Q3 : le malus d’un sort ou d’une prière s’ajoute à la pénalité d’États |
| condition + talent | sum | MJ 06/11 Q12 : talent et pénalité d’États se somment ; la saisie libre du MJ et toute la famille « situation » (couvert, position haute, surnombre…) se somment à tous les autres effets |
| situation + talent | sum | MJ 06/11 Q12 : talent et pénalité d’États se somment ; la saisie libre du MJ et toute la famille « situation » (couvert, position haute, surnombre…) se somment à tous les autres effets |
| prayer + situation | sum | MJ 06/11 Q12 : talent et pénalité d’États se somment ; la saisie libre du MJ et toute la famille « situation » (couvert, position haute, surnombre…) se somment à tous les autres effets |
| situation + spell | sum | MJ 06/11 Q12 : talent et pénalité d’États se somment ; la saisie libre du MJ et toute la famille « situation » (couvert, position haute, surnombre…) se somment à tous les autres effets |
| condition + situation | sum | MJ 06/11 Q12 : talent et pénalité d’États se somment ; la saisie libre du MJ et toute la famille « situation » (couvert, position haute, surnombre…) se somment à tous les autres effets |
| situation + trait | sum | MJ 06/11 Q12 : talent et pénalité d’États se somment ; la saisie libre du MJ et toute la famille « situation » (couvert, position haute, surnombre…) se somment à tous les autres effets |
| quality + situation | sum | MJ 06/11 Q12 : talent et pénalité d’États se somment ; la saisie libre du MJ et toute la famille « situation » (couvert, position haute, surnombre…) se somment à tous les autres effets |
| mount + situation | sum | MJ 06/11 Q12 : talent et pénalité d’États se somment ; la saisie libre du MJ et toute la famille « situation » (couvert, position haute, surnombre…) se somment à tous les autres effets |
| gm + situation | sum | MJ 06/11 Q12 : talent et pénalité d’États se somment ; la saisie libre du MJ et toute la famille « situation » (couvert, position haute, surnombre…) se somment à tous les autres effets |
| gm + talent | sum | MJ 06/11 Q12 : talent et pénalité d’États se somment ; la saisie libre du MJ et toute la famille « situation » (couvert, position haute, surnombre…) se somment à tous les autres effets |
| gm + prayer | sum | MJ 06/11 Q12 : talent et pénalité d’États se somment ; la saisie libre du MJ et toute la famille « situation » (couvert, position haute, surnombre…) se somment à tous les autres effets |
| gm + spell | sum | MJ 06/11 Q12 : talent et pénalité d’États se somment ; la saisie libre du MJ et toute la famille « situation » (couvert, position haute, surnombre…) se somment à tous les autres effets |
| condition + gm | sum | MJ 06/11 Q12 : talent et pénalité d’États se somment ; la saisie libre du MJ et toute la famille « situation » (couvert, position haute, surnombre…) se somment à tous les autres effets |
| gm + trait | sum | MJ 06/11 Q12 : talent et pénalité d’États se somment ; la saisie libre du MJ et toute la famille « situation » (couvert, position haute, surnombre…) se somment à tous les autres effets |
| gm + quality | sum | MJ 06/11 Q12 : talent et pénalité d’États se somment ; la saisie libre du MJ et toute la famille « situation » (couvert, position haute, surnombre…) se somment à tous les autres effets |
| gm + mount | sum | MJ 06/11 Q12 : talent et pénalité d’États se somment ; la saisie libre du MJ et toute la famille « situation » (couvert, position haute, surnombre…) se somment à tous les autres effets |
| talent + trait | sum | MJ 06/11 Q11 : un Trait de créature se somme avec talent, sort, prière, État et saisie du MJ |
| spell + trait | sum | MJ 06/11 Q11 : un Trait de créature se somme avec talent, sort, prière, État et saisie du MJ |
| prayer + trait | sum | MJ 06/11 Q11 : un Trait de créature se somme avec talent, sort, prière, État et saisie du MJ |
| condition + trait | sum | MJ 06/11 Q11 : un Trait de créature se somme avec talent, sort, prière, État et saisie du MJ |
| quality + talent | sum | MJ 05/11 Q4 : qualités, montures et surnombre se somment avec tout le reste, sans autre exclusion ; Avantage de cavalerie et Avantage d’un talent sont deux sources distinctes |
| prayer + quality | sum | MJ 05/11 Q4 : qualités, montures et surnombre se somment avec tout le reste, sans autre exclusion ; Avantage de cavalerie et Avantage d’un talent sont deux sources distinctes |
| quality + spell | sum | MJ 05/11 Q4 : qualités, montures et surnombre se somment avec tout le reste, sans autre exclusion ; Avantage de cavalerie et Avantage d’un talent sont deux sources distinctes |
| condition + quality | sum | MJ 05/11 Q4 : qualités, montures et surnombre se somment avec tout le reste, sans autre exclusion ; Avantage de cavalerie et Avantage d’un talent sont deux sources distinctes |
| quality + trait | sum | MJ 05/11 Q4 : qualités, montures et surnombre se somment avec tout le reste, sans autre exclusion ; Avantage de cavalerie et Avantage d’un talent sont deux sources distinctes |
| mount + quality | sum | MJ 05/11 Q4 : qualités, montures et surnombre se somment avec tout le reste, sans autre exclusion ; Avantage de cavalerie et Avantage d’un talent sont deux sources distinctes |
| mount + talent | sum | MJ 05/11 Q4 : qualités, montures et surnombre se somment avec tout le reste, sans autre exclusion ; Avantage de cavalerie et Avantage d’un talent sont deux sources distinctes |
| mount + prayer | sum | MJ 05/11 Q4 : qualités, montures et surnombre se somment avec tout le reste, sans autre exclusion ; Avantage de cavalerie et Avantage d’un talent sont deux sources distinctes |
| mount + spell | sum | MJ 05/11 Q4 : qualités, montures et surnombre se somment avec tout le reste, sans autre exclusion ; Avantage de cavalerie et Avantage d’un talent sont deux sources distinctes |
| condition + mount | sum | MJ 05/11 Q4 : qualités, montures et surnombre se somment avec tout le reste, sans autre exclusion ; Avantage de cavalerie et Avantage d’un talent sont deux sources distinctes |
| mount + trait | sum | MJ 05/11 Q4 : qualités, montures et surnombre se somment avec tout le reste, sans autre exclusion ; Avantage de cavalerie et Avantage d’un talent sont deux sources distinctes |

Une paire absente de cette table est signalée au MJ, jamais additionnée ni écartée en silence (CA5).
