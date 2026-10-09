# Étape 2.3 — socle pur des coûts, usages et contrats v2

Incrément local du 9 octobre 2026. Ces modules sont testés séparément ; ils ne sont pas raccordés au Store, à la résolution réelle ou à l’interface. Ils ne certifient pas le catalogue complet ni les talents des PJ actuels.

## Coût et commande atomique

`js/core/v5-action-costs.js` expose :

- `previewV5ActionCosts({ state, actionId, actorId, costs, quotas, exemptions, extraAttack, clock })` ;
- `prepareV5ActionState(plan, state)` : produit une copie exacte avec ressources payées et usages réservés pour calculer l’action ; aucune confirmation n’est enregistrée ;
- `commitV5ActionCosts(plan, state, { resolveAction })` : appelle le résolveur pur avec cette même copie, puis enregistre résultat, ressources et usages dans un seul nouvel état.

`state.revision` est obligatoire. L’acteur vit dans `state.participants` (tableau ou objet). Élan utilise `participant.extensions.v5.hasMomentum`. Chance et les autres ressources déclarées utilisent `participant.extensions.v5.resources`, par exemple `{ fortune: 2, focus: 3 }`. Aucune lecture ou conversion d’un champ de fiche homonyme n’est implicite. Un solde inconnu est bloquant.

Un coût contient `{ id, resource, amount }`. Élan coûte exactement `1`. Une exemption contient `{ costId, sourceId }` et ne supprime aucun quota de talent. Un quota contient `{ id, scope: 'turn' | 'round' | 'encounter', maximum, amount? }`.

Le registre persistant `state.v5ActionLedger` contient `appliedActions` et `quotaUsage`. Les portées utilisent `clock.encounterId`, `clock.round` et `clock.turnId` explicites. Quand une attaque supplémentaire paie Élan, le module ajoute le quota système d’un paiement par Tour, même si l’action permet de regagner Élan. Une attaque exemptée de ce coût conserve ses éventuels quotas de talent distincts. Aucun changement de quota n’est déduit du nom d’un personnage, du nombre d’États ou d’un rechargement.

Le résultat du résolveur doit être `{ status: 'applied', state }`. Un résultat manuel/refusé conserve intégralement l’état précédent. Une révision, un acteur ou un registre modifiés rendent l’aperçu périmé. Un `actionId` déjà confirmé ne rappelle pas le résolveur. Le caller conserve le snapshot avant commande pour l’annulation ; cet instantané contient aussi les ressources et le registre. Aucun dé n’est tiré par ces modules.

**Raccordement attendu :** valider talents/coûts → préparer l’état payé → calculer et comparer les jets sur cette copie → choix du joueur → commande durable unique appelant `commitV5ActionCosts`. Le jet saisi et le choix restent identiques. Un coût d’Élan payé pour l’attaque supplémentaire ne doit pas fournir l’Avantage d’Élan à cette attaque.

## Contrats v2

`js/core/talent-contract-v2.js` conserve le schéma 1 et son refus des champs non couverts. Le nouvel évaluateur `evaluateTalentContractsV2` reçoit `contracts`, `acquisitions`, `sourceHashes`, `event`, `role`, `context`, `choices` et, pour les coûts/usages, `state`, `actorId`, `actionId`, `clock`.

Une clause v2 contient `when`, plusieurs `effects`, et éventuellement `choice`, `costs`, `exemptions`, `quotas`. Les conditions sont déclaratives ; aucune description n’est analysée à l’exécution. Les rangs ne multiplient pas automatiquement les valeurs. Les coûts applicables sont contrôlés ensemble pour éviter qu’un solde suffisant pour deux clauses prises séparément soit dépensé deux fois. Une proposition `grantExtraAttack` porte le quota de paiement d’Élan lorsqu’elle le demande.

Le résultat indique propositions, coûts, usages, choix manquants et traces. Les brouillons, sources absentes/modifiées et talents exclus ne produisent aucun automatisme. `ready` ne prouve pas la couverture du personnage. Un usage de talent déjà épuisé retire sa proposition ; il n’empêche pas l’action ordinaire. Un registre ou contexte absent garde l’action en aperçu.

`reduceV5ConditionProposals` réduit les occurrences proposées avant `acquireV5Conditions`, jusqu’à zéro, en conservant leurs métadonnées. Mâchoires d’acier consomme sa première utilisation même quand son unique Sonné proposé est entièrement évité ; l’Élan demeure alors si aucun autre motif ne le retire.

## Quatre identités relues

Les descriptions actuelles du snapshot des 206 talents et leurs empreintes exactes sont enregistrées dans `js/data/v5-talent-contracts.json`. Vérification complémentaire dans le livre personnel V5 : Tir précis p.114, Battement p.115, Mâchoires d’acier p.121, Coup puissant p.127 ; Élan p.168 et Chance p.133.

| Talent | Statut du contrat pur | Contexte nécessaire |
| --- | --- | --- |
| Tir précis | Validé, non raccordé | Tir réussi qui touche ; visée oui/non ; +1 ou +2 Dégât |
| Coup puissant | Validé, non raccordé | Arme de mêlée qui touche ; Avantage V5 effectif après annulation ; +1 ou +2 Dégât |
| Mâchoires d’acier | Validé, non raccordé | Sonné proposé, rencontre et registre ; un Sonné en moins à la première acquisition |
| Battement | Brouillon, inactif | Choix explicite, tailles comparables, auteur/cible et fin du prochain Tour de l’auteur |

Battement dispose d’un prototype déclaratif : remplacer les dégâts, empêcher les oppositions par Compétence de Corps à corps (Esquive reste possible), fournir Avantage aux attaques de mêlée contre la cible et conserver une échéance attachée à l’auteur. Arbitrage du MJ validé le 9 octobre : supprimer toutes les Blessures et les conséquences du critique, y compris ses États ; seuls les effets de Battement s’appliquent. Le contrat reste brouillon jusqu’à implémentation et recette de ce comportement dans le résolveur commun. Aucune branche partiellement traitée n’est activée sous un statut « validé ».

## Validation et suite

33 tests dédiés : coûts cumulés, exemption/quota distincts, Élan regagné, changement d’horloge, refus et idempotence, sauvegarde/relecture, snapshot d’annulation, absence de RNG, source modifiée, rangs, deux familles de bonus, première acquisition et prototype d’effet temporaire. Les anciennes suites de schéma 1 restent séparées.

Restent : raccordement Store/résolution/UI, import explicite des ressources, consommateur des effets actifs/réactions, implémentation de l’arbitrage fixé pour les critiques de Battement, compteur de Fortune dans l’outil selon CHOIX_POUR_LA_REPRISE.md, contrats des autres familles et priorités issues des snapshots des PJ réellement importés. Le registre d’usages doit être conservé dans sauvegarde/cloud/annulation et purgé avec sa rencontre lors du raccordement. Les fichiers sont déclarés au cache hors ligne, mais ne sont pas encore importés ni exécutés par l’application démarrée.
