# Plan · Engagements et circonstances

## Approche
Un seul état nouveau : la liste des **paires d'engagement** du combat. Tout le reste (mêlées affichées, surnombre, tir engagé, engagés de la fuite et de la Nuée, barre d'actions) en est **déduit** par des fonctions pures. Les clés de contexte existantes (`outnumberAttackerIds`, `targetEngaged`, `engagedTargetIds`, `engagedEnemyIds`…) restent le format d'entrée du moteur : la déduction les remplit quand le MJ ne les a pas forcées. Le moteur de résolution n'est presque pas touché.

## Modèle de données
`combat.extensions.v5.engagements = [{ a, b, since, lastAttackRound }]` (ids triés `a < b`, Rounds entiers). Stocké dans le combat : suit la scène (Suspendre/Reprendre), la persistance, l'historique (Annuler). Pas de changement de `schemaVersion` (clé d'extension).
- Une paire compte si les deux sont actifs, PV > 0 (ou non morts) et non Inconscients ; sinon elle est ignorée à la lecture et purgée au prochain passage de Round.
- Mêlée = composante connexe des paires actives ; Libres = actifs sans paire ; Hors combat = banc.

## Fichiers
- **Nouveau `js/core/engagements.js`** (pur, sans DOM) : `listEngagements(combat)`, `engagementsOf(combat, participants, id)`, `meleeGroups(combat, participants)`, `withEngagement(combat, aId, bId, round)`, `withoutEngagements(combat, id, otherIds?)`, `expireEngagements(combat, participants, endedRound)` → `{combat, expired}`, `deriveEngagementContext({ combat, participants, actorId, targetId, kind })` → clés de contexte, `isSurrounded`/`outnumberedFor` via `outnumbering.js`, `previewDisengage({…})` (Élan, En Bon Ordre, encerclé, Désavantage, meilleure Mêlée adverse).
- **Nouveau `js/core/store/api-engagements.js`** : `engageParticipants(aId, bId)`, `disengageParticipant(id, {otherIds, reason})`, `previewDisengage(actorId, input)`, `applyDisengage(preview)` via `executeCommand` (journal, Annuler). Branché comme `createV5CombatActionsApi` dans `store.js`.
- **`js/core/store.js`** (crochets minimes) : après `apply-resolution` d'une attaque de mêlée avec cible → `withEngagement` ; dans `nextTurn` quand le Round augmente → `expireEngagements` + journal ; à la sortie du combat / passage au banc / mort confirmée → `withoutEngagements`. Fuite appliquée → `withoutEngagements(fuyard)`.
- **`js/core/v5-broken-escape.js`** et API de fuite : En Bon Ordre (pas d'Élan ni d'attaque gratuite pour les engagés).
- **Nouveau `js/ui/workspace/plateau.js`** : `renderPlateau(context, deps)` (zones, jetons, menu « Déplacer… », rapport de forces) et `renderActionBar(context, deps)` (boutons à conséquence, panneau de Désengagement). Remplace `renderTrack` dans `workspace-view.js` ; les jetons gardent `data-workspace-select`, `workspace-track-item`, `is-actor/is-turn/is-target`, et le banc garde `.workspace-bench` (contrats des ~40 parcours navigateur).
- **`js/ui/workspace-view.js`** : `buildResolutionInput` fusionne `deriveEngagementContext` sous les valeurs forcées du brouillon ; `playContext` expose groupes et engagements ; barre d'actions → `handlers.select` (action, cible, Charge).
- **`js/ui/resolution-panel.js`** : surnombre et tir engagé affichés « déduit » (vert) avec « Forcer » qui révèle les cases actuelles ; « Laisser au récit » = valeurs neutres forcées, mention au résultat.
- **`js/ui/workspace.css`** : styles du plateau (palette existante). **`sw.js`** : précache des 3 nouveaux modules.
- Phase circonstances (S5) : `combat.extensions.v5.scene` (lumière, météo, terrain, espace exigu) et `participant.extensions.v5.position` (position haute, couvert) lus comme valeurs par défaut du contexte ; tiroir réordonné (À régler maintenant en tête) ; Oui/Non/Récit pour les cases « confirmé par le MJ ».

## Vérification par critère
| CA | Vérification |
|---|---|
| 1-4 | parcours navigateur `tests/engagements-plateau-browser.mjs` + parcours existants (sélecteurs conservés) |
| 5-9 | unitaires `tests/unit/combat/engagements.test.js` (store : attaque, manuel, expiration, hors combat, rechargement/Annuler) |
| 10-14 | unitaires (previewDisengage : Élan, Test, Désavantage, encerclé, En Bon Ordre ; Charge refusée) + parcours navigateur barre d'actions |
| 15-18 | unitaires `deriveEngagementContext` + aperçu de résolution sans cases ; navigateur : forcer |
| 19-22 | unitaires scène/positions + parcours navigateur tiroir |
| tous | `npm test`, `npm run test:browser-all`, contre-vérification `verifier` code + règles |

## Complexité justifiée
Trois nouveaux modules au lieu de grossir `store.js` (5 700 lignes), `workspace-view.js` (2 960) et `resolution-panel.js` (3 200), selon le découpage déjà en place (`js/core/store/*.js`, `js/ui/workspace/*.js`).
