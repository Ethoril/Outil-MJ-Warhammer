# Plan · Calculs des Traits de créature

Sur `9bd2983` (branche `traits-calculs`). Spec : [spec.md](spec.md) (D1 à D17, D6 remplacée par D13 ; CA0 à CA26). Tri : [tri.md](tri.md). Tâches : [tasks.md](tasks.md).

## Approche

1. **Trois collecteurs, pas un crochet par Trait (D5).** Un seul module pur `js/core/trait-effects.js` : (a) à la blessure, appelé par `resolution.js` près de `mountedFallPlans` (l. 1233-1262), rend `traitPlans` dans l'aperçu ; (b) début et fin de Round, appelé par `previewV5Turn` (`v5-turn.js:118-126`) ; (c) boutons de la fiche (Rencontre, Entrer en Frénésie, Vampirique, Se cabrer, cadavre frais), méthodes du Store sur le modèle de `applyCreatureVenom`.
2. **Une demande de dé = une `request` uniforme (D13, CA0).** `{ field, kind: 'd10' | 'test' | 'choice', participantId, label, testTarget? }`. Dans le tour, elle passe par `requests`/`inputs[participantId][field]` ; à la blessure, par `traitInputs` de l'aperçu (modèle `mountedRideTestsById`). Constat : le dialogue `js/ui/v5-effect-dialog.js` offre « Lancer d10/d100 » mais **aucun bouton pour `kind: 'test'`** (l. 159-162) : la demande de Test porte `testTarget` (valeur du Test, modificateurs retenus) et le dialogue tire le d100 et en déduit réussite et DR. Même effet par bouton ou par saisie, un seul commit, un seul ↶.
3. **L'effet se pose dans la même commande que l'événement** (`executeCommand`) : un seul ↶/↷ (CA25). Le moteur ne tire jamais un dé lui-même.
4. **« Tour perdu » (D8) : marqueur de données, non bloquant.** `extensions.v5.lostTurn = { cause, sourceId, since: { round, turnIndex } }`, posé par un patch, levé à la fin du prochain Tour du porteur (jamais celui où il a été posé), affiché sur la fiche, rappelé dans l'aperçu d'action du porteur. Pas de consommation du registre `system:turn-action` (voir point à trancher 1).
5. **Élan : adaptateur** `momentumCount(participant)` (booléen `hasMomentum` → 0 ou 1) devant `planUnstableEndOfRound`, dont la signature ne change pas.
6. **Increvable (D15)** : `extensions.v5.dieHard = { total, roundsLeft, bodyIntact }`, créé à la confirmation de mort avec la case « corps intact » ; Test de Résistance +0 à chaque début de Round, les DR s'additionnent, retour à 1 Blessure et fin de la mort (`dead`, `deathCause`) à 6 DR, au plus BE Rounds ; total affiché.
7. **Bond (D16)** : champ optionnel `bondCells` (entier, 2 × `runCells`) dans `token.state`, jamais dans `speedCells` ni `runCells` (poursuite inchangée). La carte l'accepte et ignore son absence.

## Fichiers

**Créés** : `js/core/trait-effects.js` ; `js/core/store/api-trait-buttons.js` (précédent `api-engagements.js` : `store.js` dépasse 6 000 lignes) ; `tests/unit/creatures/traits-calculs-{demandes,blessure,rounds,petits}.test.js`, `tests/unit/combat/traits-calculs-{tour,resolution,boutons}.test.js`, `tests/unit/ui/traits-calculs-interface.test.js` ; `tests/traits-calculs-browser.mjs`. Les deux modules de `js/` vont au précache de `sw.js`. Côté carte : un test dans `E:/rpg-map-display/tests/`.

**Touchés** : `js/core/{v5-turn,resolution,store,v5-effects,v5-test-context,v5-combat-rules,creature-states,creature-psychology,creature-combat,creature-movement,creature-magic-traits,v5-mounted-combat,equipment,map-link-state,v5-critical-aftermath}.js`, `js/core/store/critical-death.js`, `js/data/creature-abilities.js` (via son générateur), `js/ui/{v5-effect-dialog,creature-states-block,resolution-panel/result,workspace-view,card}.js`, `docs/CONTRAT_LIAISON_MAP_DISPLAY.md`, `MJ.css`, `sw.js`, `tests/parcours.json`. Carte : `js/core/schema.js`, `js/core/types.js`, `js/app/mjLink.js`, sa copie du contrat. Le golden master `store-golden.json` ne doit pas changer : les méthodes de Store sont ajoutées par `api-trait-buttons.js` ; s'il doit changer, le lot s'arrête.

## Contrats (signatures)

```js
// js/core/trait-effects.js (pur : entrées jamais mutées, aucun dé tiré)
export function traitRequest({ key, kind, participantId, label, testTarget })     // CA0
export function collectWoundTraitEffects({ actor, target, participants, hpBefore, hpAfter, killed, resolutionId, round, engagedIds, traitInputs })
  // → { plans[], requests[], patches[], logs[], unresolved[] }   Sang corrosif, Infecté, Bestial, Affamé
export function collectRoundTraitEffects({ participants, phase, round, turnIndex, actorId, inputs, engagedIdsOf })
  // → même forme ; phase 'startOfRound' (Stupide, Increvable), 'endOfRound' (Instable), 'endOfTurn' (levée du tour perdu)
export function applyTraitPatches(participants, patches)                          // CA25 : un seul passage
export const momentumCount = participant => 0 | 1
export function markLostTurn(participant, { cause, sourceId, since })
export function liftLostTurn(participant, { turnIndex })
export function startDieHard(participant, { round, bodyIntact })                  // D15
export function advanceDieHard(participant, { round, test })                      // { participant, total, revived }
// Signatures existantes étendues, anciens appels inchangés : planMountedFall(…, { cause }), planNaturalAttack(…, 'stomp', { via: 'rear' }), bondCellsOf(participant)
// js/core/store/api-trait-buttons.js : createTraitButtonsApi({ api, currentEnvelope })
applyCreatureEncounter(sourceId, targetId, key), enterTraitFrenzy(participantId, test), applyVampiricHeal(sourceId, { wounds, viaBite, preyAdmissible }),
rearUp(sourceId, targetId), markFreshCorpse(sourceId, test), setCreatureFlag(participantId, flag, value)
```

## Vérification des critères

| CA | Vérification |
|---|---|
| CA0 | `traits-calculs-demandes.test.js` (moteur : même effet pour jet et saisie) ; `traits-calculs-interface.test.js` (bouton du dialogue et du panneau) ; parcours |
| CA1, CA2, CA4, CA5 | `traits-calculs-blessure.test.js` (pur) ; `traits-calculs-resolution.test.js` (commit, ↶) |
| CA3, CA10, CA11, CA12, CA15 | `traits-calculs-resolution.test.js` |
| CA6, CA7, CA8, CA9 | `traits-calculs-rounds.test.js` (pur) ; `traits-calculs-tour.test.js` (`previewV5Turn`, décision de mort) |
| CA22 | `traits-calculs-tour.test.js` |
| CA13, CA14, CA16, CA21 | `traits-calculs-boutons.test.js` |
| CA17, CA18, CA20, CA23 | `traits-calculs-petits.test.js` (NB : la spec cite CA17 pour Insensible dans la table 2B ; la liste des scénarios fait foi, CA18) |
| CA19 | `traits-calculs-petits.test.js` (`speedCells` et poursuite inchangées, `bondCells`) ; test de la carte (champ accepté, absent toléré) ; `traits-calculs-interface.test.js` (pastille) |
| CA24 | golden master (`store-golden.test.js`) et tests existants cités au « fini quand » de L2, L3, L4, L5 |
| CA25 | `traits-calculs-tour.test.js`, `-resolution.test.js`, `-boutons.test.js` (↶ puis ↷ de chaque effet) |
| CA26 | `timeout 120 node tests/traits-calculs-browser.mjs` ; socle |

## Lots touchant un moteur partagé (modèle plus fort : Opus)

**L2** (tour, historique, mort) et **L3** (résolution, dégâts, Élan, équipement) : Opus. L1, L4, L5, L6, L7, L8 : Sonnet. L5 ajoute des méthodes au Store sans toucher au moteur d'historique : il s'arrête si le golden master bouge.

## Complexité justifiée

- **Un module `trait-effects.js` pour tout le chantier** : les trois collecteurs partagent demandes, patches et marqueurs ; trente Traits sans module chacun.
- **`api-trait-buttons.js` séparé** : `store.js` est à plus de 6 000 lignes, précédent `api-engagements.js`.
- **Bouton de Test dans le dialogue (`testTarget`)** : sans lui D13 est faux pour tous les Tests ; la demande porte la valeur déjà calculée, le dialogue ne connaît aucune règle.
- **Patches plutôt qu'écriture directe** : un seul `applyTraitPatches` rend l'effet annulable en un ↶ et testable sans Store.

## Points à trancher par le MJ

**Tranchés le 17/11/2026 : les quatre recommandations sont retenues.** Marqueur avec avertissement ; `bondCells` (choix de Claude) ; les trois décisions de mort, tout autre chemin seulement signalé ; D5 et D7 à D12 confirmés par le MJ.

1. **« Tour perdu » (Stupide, Affamé) : simple marqueur ou blocage ?** Marqueur affiché sur la fiche, avec avertissement dans l'aperçu d'action du porteur, que le MJ peut passer outre ; ou refus dur de toute Action et de tout Mouvement du porteur ce Tour. *Recommandation : marqueur avec avertissement* (le moteur ne connaît pas toutes les actions libres ; un refus dur bloquerait un cas que la règle autorise).
2. **Nom du champ de la carte.** `bondCells` (double de la Course, en cases). *Recommandation : oui.* Sans réponse, le lot L7 de la carte garde ce nom.
3. **Quelles morts proposent la case « corps intact » (Increvable) ?** Les décisions du MJ existantes (`decideStateDeath`, `decideImmediateCriticalDeath`, `decideCriticalDeath`) ; L2 recense les autres chemins de mort confirmée (mort subite, Blessures à 0) sans les vérifier ici. *Recommandation : ces trois ; tout autre chemin trouvé par L2 est signalé au rapport, pas branché.*
4. **Spec : D5, D7 à D12 restent « choix de Claude, à confirmer ».** Le plan les applique tels quels. *Recommandation : les tenir pour confirmés.*
