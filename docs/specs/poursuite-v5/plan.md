# Plan · Poursuite selon le Livre de base V5

Sur `e48848d`. Spec : [spec.md](spec.md) (D1 à D15, CA1 à CA25 ; la section « Règle relue le 16/11/2026 » fait foi). Tâches : [tasks.md](tasks.md).

## Approche

1. **Un moteur pur, deux étages.** `js/core/v5-pursuit.js` porte la règle (paire, Mouvement double, écart de 6 DR, facteurs, nombre d'Obstacles, issue, issue partielle) ; il ne calcule aucun Test. Les Tests (poursuite, Obstacle) passent par `previewV5SecondaryTest` (calcul commun : États, talents, séquelles) et sont posés dans le même module, au-dessus de la règle.
2. **Rien de nouveau pour les talents.** Fuite !, Impitoyable/Acharné (`talent-relentless`) et Grandes enjambées (`talent-striding-gait`) se lisent par leurs contrats, en passant `context.pursuit` et `context.pursuitRole` (`prey` / `pursuer`). Le comptage à la main de `resolveV5PursuitStep` disparaît : un seul décompte (CA11).
3. **Un état durable, comme le Brisé.** `extensions.v5.pursuit` dans l'enveloppe (absence = aucune poursuite, aucune migration, schéma inchangé), écrit par des commandes du Store qui suivent le modèle `previewBrokenEscape` / `applyBrokenEscape` : aperçu émis puis comparé à l'application, `baseRevision` refusée si périmée, une entrée d'historique par application, `consumeObstinate` à l'application.
4. **La poursuite en combat vit dans les Tours (D5, D9).** Chaque Test d'un personnage est joué à son Tour, consomme l'Action (`recordV5ActionUsage`, refus si `standardV5ActionSpent` ou quota `system:turn-action`). Le Test opposé se compare une fois les deux Tests faits. Hors combat (D8) : un seul aperçu, un seul `apply`, aucun état conservé.
5. **Deux entrées (D2).** Panneau du Brisé (bouton, fuyard visible) ; écran Jouer (modale, sur le modèle de `v5-fortune-dialog.js`).
6. **Attaque gratuite (D7)** : l'attaque de l'adversaire s'ouvre par la chaîne de résolution existante avec un nouveau `freeAttackTalent: 'flee-free-attack'` (liste blanche de `store.js`) ; elle ne passe pas par `recordV5ActionUsage`. `freeAttackSpentMomentumIds` est alimenté par la case de l'interface.

## Décisions et où elles vivent

D1 règle et constantes sourcées (`PURSUIT_CATCH_DR = 6`, `PURSUIT_SOURCE`) : moteur. D2 : points 5 et UI. D3 tirage et obstacle libre : moteur + table. D4 Tests d'Obstacle : lot 2. D5, D9 : Store. D6 : boutons de fin. D7 : lot 4 et UI. D8 : modale. D10 paire choisie par l'outil. D11 bénéficiaire de l'Avantage parmi les alliés de la poursuite. D12 camp qui franchit les Obstacles. D13 facteurs cochés, modifiables. D14 Mouvement courant (réutilise `rangeCellsOf(...).speedCells` de `map-link-state.js`, monture comprise via `v5.mounted` + `mountId`), corrigeable. D15 issue partielle, journal, bouton, rappel.

## Fichiers

**Créés** : `js/core/v5-pursuit.js` ; `js/data/v5-pursuit-obstacles.js` (table d10, module JS figé car importé de façon synchrone et précaché) ; `js/core/store/api-pursuit.js` (modèle : `api-engagements.js`, `store.js` est déjà trop gros) ; `js/ui/v5-pursuit-panel.js` (combat) ; `js/ui/v5-pursuit-dialog.js` (hors combat) ; tests listés plus bas ; deux parcours `tests/poursuite-v5-browser.mjs` et `tests/poursuite-hors-combat-browser.mjs`.

**Touchés** : `js/core/v5-broken-escape.js` (retrait de `resolveV5PursuitStep` et `resolvePursuitActorTest`, le reste du fichier intact) ; `js/core/store.js` (câblage de `createPursuitApi`, liste blanche `flee-free-attack`) ; `js/core/resolution/input.js` si l'attaque gratuite l'exige ; `js/ui/v5-broken-escape-panel.js` (bouton Lancer la poursuite, boutons « Jouer l'attaque gratuite », case Élan, coche automatique) ; `js/ui/workspace-view.js` (entrée de la modale sur l'écran Jouer, ouverture de l'attaque) ; `sw.js` (précache) ; `tests/parcours.json` ; les trois fichiers de tests de `resolveV5PursuitStep` (réécrits).

## Modèle de données

```
extensions.v5.pursuit = {
  id, mode: 'combat'|'scene', status: 'active'|'ended', startedRound,
  preyIds[], pursuerIds[], movement: { [participantId]: number },   // D14, corrigeable
  obstacleSide: 'prey'|'pursuers'|'none',                           // D12 ; 'none' = PJ des deux côtés
  pair: { pursuerId, preyId, forced },                              // D10
  opposed: { pursuer: TestRow|null, prey: TestRow|null, netSl, winner },
  factors: { won, speed, terrain },                                 // D13, trois cases (0 à 3)
  obstacles: [{ participantId, obstacle: { id, label, skills[], free }, test: TestRow|null, beneficiaryId }],
  outcome: null | { kind: 'caught'|'escaped', reason: 'dr6'|'double-movement'|'obstacles'|'gm', crossedIds[], endedRound }
}
TestRow = { participantId, skill, roll, score, sl, success, astonishing, turnId, detail[] }
```

## Contrats (signatures)

```js
// js/core/v5-pursuit.js (pur)
export const PURSUIT_CATCH_DR, PURSUIT_SOURCE
export function pursuitMovementOf(participant, participants)       // D14 : nombre ou null (jamais inventé)
export function pickPursuitPair({ preyIds, pursuerIds, movement }) // CA1, D10
export function movementVerdict({ preyIds, pursuerIds, movement }) // CA3 : null | { kind, reason }
export function suggestFactors({ opposed, movement, preyIds, pursuerIds })  // D13
export function obstacleCountRequired(groupSize, factorCount)      // aucun : tous ; 1-2 : moitié, arrondie au supérieur ; 3 : un
export function drawObstacle(d10, table = PURSUIT_OBSTACLES)       // CA8
export function freeObstacle({ label, skills })                    // CA9
export function evaluatePursuit(state)                             // { outcome|null, reason, partial: { crossedIds, canContinueAlone } }
export function previewPursuitTest(actor, input)                   // CA6, CA7, CA11
export function previewObstacleTest(actor, input)                  // CA10 : { ready, test, astonishing, beneficiaryOptions }
// js/core/store/api-pursuit.js : createPursuitApi({ api, currentEnvelope })
startPursuit(input) · previewPursuitTest / applyPursuitTest · setPursuitMovement · setPursuitFactors
setPursuitObstacle · previewObstacleTest / applyObstacleTest · endPursuit({ reason:'gm' })
previewScenePursuit / applyScenePursuit (D8) · applyPursuitEnd('engage'|'remove') (D6)
```

## Sort de `resolveV5PursuitStep` et de ses tests

Aucun écran ne l'appelle : elle est **supprimée** avec `resolvePursuitActorTest` (échelle 1-10 écartée par D1). Ses trois fichiers de tests sont traités ainsi : `initiative-et-tours.test.js` (test C02 : échelle de distance, retiré, remplacé par les tests de CA11 et CA2) ; `q6-ca1-comparaisons.test.js` (cas F3 : le Test d'Athlétisme du plateau compare avec `previewPursuitTest`, mêmes témoins) ; `q6-t5-hors-combat.test.js` (les cinq tests « poursuite : … » deviennent des appels à `previewPursuitTest`, mêmes assertions Sonné, Inconscient, Surpris, À terre, Aveuglé, Brisé).

## Vérification des critères

| CA | Vérification |
|---|---|
| CA1, CA2, CA3, CA4, CA8, CA9 | `tests/unit/combat/poursuite-v5-regle.test.js` ; table : `tests/unit/donnees/poursuite-obstacles.test.mjs` |
| CA5 | `poursuite-v5-regle.test.js` (entrées gelées, rien écrit) ; `poursuite-v5-store.test.js` (l'aperçu laisse `localRevision` intact) |
| CA6, CA7, CA10, CA11 | `tests/unit/moteur/poursuite-v5-tests.test.js` + les trois fichiers réécrits |
| CA12 | Store refuse hors de vue (`poursuite-v5-store.test.js`) ; bouton absent : parcours combat |
| CA13, CA14, CA15, CA16, CA17, CA18, CA20 | `tests/unit/combat/poursuite-v5-store.test.js` (modèle `engagements-store.test.js`, dont rechargement `loadFromJSON`, ↶ et ↷, aperçu périmé) |
| CA19 | `poursuite-v5-store.test.js` (aucune Action, aucun Round) + parcours hors combat |
| CA21, CA22, CA23 | `tests/unit/combat/brise-attaque-gratuite.test.js` + parcours combat |
| CA24 | les cinq fichiers ci-dessus, vérifiés par `grep` des CA dans la rédaction |
| CA25 | `timeout 120 node tests/poursuite-v5-browser.mjs` et `tests/poursuite-hors-combat-browser.mjs` ; non-régression : `brise-engage-fuite-browser.mjs`, `engagements-plateau-browser.mjs` |

## Lots touchant un moteur partagé (modèle plus fort)

**L3** (commandes : `executeCommand`, historique, registre des Actions, Obstiné) et **L4** (chaîne de résolution des attaques, liste blanche de l'attaque gratuite). Les autres peuvent aller à Sonnet. L2 le devient si le non-double-comptage exige de toucher aux contrats de talents ou au moteur d'effets.

## Complexité justifiée

- **`api-pursuit.js` séparé** : `store.js` dépasse 5 000 lignes ; précédent `api-engagements.js`.
- **Deux fichiers d'interface** : l'assistant en combat (état durable, par Rounds) et la modale (brouillon d'un bloc) n'ont pas le même cycle de vie ; ils partagent les rendus d'obstacle et de facteurs par export du panneau.
- **Table des Obstacles en JS** et non en JSON : import synchrone, précache, sans `fetch`.
- **`PURSUIT_CATCH_DR` nommée** : la v3 du livre pourrait donner 5 ; le MJ a dit 6.

## Points à trancher par le MJ

1. **Égalité de DR au Test opposé.** Le moteur existant (`resolveV5Opposition`) donne l'égalité à l'initiateur. Qui gagne l'égalité (facteur « Test gagné », fin à 6 DR sans objet) ? Recommandation : le poursuivant (initiateur), comme au Désengagement.
2. **Qui est dans la modale hors combat ?** Le calcul des Tests exige États et talents. Recommandation : seulement les participants de la rencontre en cours, même non lancée ; sans participant, l'entrée est grisée.
3. **Poursuite en cours quand la rencontre se termine ou que le combat recommence.** Recommandation : abandonnée sans issue, avec une ligne de journal.
4. **Vocabulaire.** La spec dit « Réussite stupéfiante » ; l'outil affiche « Réussite éclatante » (+5 DR et plus). Recommandation : garder le mot de l'outil à l'écran.
5. **Rang des talents.** Le contrat de Fuite ! porte +1 DR (`stack: add`) ; l'ancien code comptait +1 par rang. Si le contrat ne multiplie pas par le rang, un talent à deux rangs perdrait un point. Recommandation : suivre le contrat (une seule source de vérité, CA11) ; le lot 2 le mesure et le rapporte.
