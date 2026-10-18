# Contrats déclaratifs de talents : schéma 1

Ce document décrit le premier évaluateur pur, pas le catalogue de talents complet. Les opérations ne sont pas encore raccordées au combat. Les futurs contrats de coût, quota, choix et échéance nécessitent une extension du schéma : leur présence est actuellement une erreur explicite.

## Entrée

`evaluateTalentContracts({ contracts, acquisitions, sourceHashes, event, role, context })` est exportée par `js/core/talent-contracts.js`.

`contracts` contient une seule définition par ID de talent. Chaque contrat contient :

| Champ | Valeur |
| --- | --- |
| `schemaVersion` | `1` |
| `talentId` | ID stable du référentiel |
| `edition` | `V5` |
| `status` | `draft` ou `validated` |
| `ruleVersion` | Version indépendante de la description source |
| `source.effectHash` | Empreinte exacte du texte contractualisé, au format `sha256:` suivi de 64 chiffres hexadécimaux |
| `source.reference` | Référence lisible du texte V5 publié |
| `clauses` | Liste de clauses, aux IDs uniques dans le talent |

`sourceHashes` associe chaque ID à l’empreinte du texte actuellement publié. L’appelant devra les produire selon la même convention de texte que lors de la contractualisation. L’évaluateur compare les empreintes ; il ne récupère ni ne convertit les descriptions. La bibliographie d’un supplément V4 peut rester dans `reference` si la mécanique publiée et contractualisée est V5.

`acquisitions` contient `{ talentId, rank?, specialization? }`. Le rang est un entier positif consolidé, pas plusieurs lignes d’achat du même talent. Deux spécialisations distinctes peuvent coexister. Le rang n’est requis que si l’opération en dépend ; la spécialisation doit être fournie quand la clause l’exige.

Une clause contient `id`, `event`, `role`, `when`, `effect`, et éventuellement `requireSpecialization`. `when` est une conjonction de conditions ; une liste vide signifie aucune condition supplémentaire.

| Événement | Opérations disponibles |
| --- | --- |
| `test.beforeRoll` | `modifySL`, `grantAdvantage`, `grantDisadvantage` |
| `damage.beforeProtection` | `modifyDamage`, `addQuality` |
| `condition.beforeAcquire` | `reduceConditionAcquisition` |
| `momentum.beforeLoss` | `preventMomentumLoss` |

Le rôle du porteur est `actor`, `attacker` ou `defender`. Il doit être fourni pour la phase évaluée ; il ne se déduit pas du nom du talent.

Les conditions acceptent `{ field, op, value }`, avec `eq`, `in`, `gte`, ou `{ field, op: 'matchesSpecialization' }`. Les champs disponibles sont `kind`, `skillId`, `specialization`, `aimed`, `charging`, `terrain`, `weapon.group`, `weapon.reach`, `actor.size`, `target.size`, `condition.id` et `momentum.lossReason`. Les champs requis absents ou nuls sont signalés. L’appelant fournit des IDs canoniques et des tailles/reach comparables ; cet évaluateur n’effectue aucune résolution d’alias.

Une opération numérique contient `op`, `amount`, `stackGroup`, `stack`. `amount` est un entier ou `{ base, perRank }`. `stack` est `add` ou `max`, expressément choisi. Une opération non numérique utilise `unique`. Les qualités, réductions d’acquisition et exceptions d’Élan ont aussi un `key`, respectivement ID de qualité, ID d’état ou motif de perte. Une réduction est positive ou nulle. Les motifs de perte sont ceux du module Élan.

Les groupes de cumul sont des identifiants métier, pas des noms d’affichage. Deux clauses qui représentent +1 Dégât, remplacé par +2 avec visée, déclarent le même groupe en `max`. Deux bonus indépendants déclarent des groupes distincts. Aucun rang, cumul ou coût n’est implicite.

## Sortie et responsabilité du raccordement

Le résultat contient `schemaVersion`, `event`, `role`, `ready`, `proposals`, `unresolved`, `trace`.

- `proposals` contient les opérations regroupées, avec les origines de toutes les clauses contributrices.
- `unresolved` contient les données manquantes par clause ; tant qu’il n’est pas vide, l’action doit rester en aperçu.
- `trace` distingue applicable, écarté, contexte manquant, brouillon, source absente/modifiée, non couvert et talent exclu.
- `ready` ne certifie pas la couverture intégrale du personnage. Un talent non couvert ou une source modifiée reste visible dans la trace et ne produit pas d’effet.

Le consommateur devra relier les propositions à l’unique résolution de l’action : sources d’Avantage et DR avant jet ; bonus de dégâts avant protections ; réduction sur les instances proposées avant la perte d’Élan. Il devra borner une acquisition réduite à zéro et séparer les motifs de perte d’Élan. L’évaluateur ne calcule pas lui-même les dégâts finaux, n’effectue aucune relance, ne modifie aucun état existant et ne traite pas de ressources.

Le plan et le contexte devront être attachés à un aperçu protégé par révision. La commande finale appliquera ensemble résultats, coût, quota et échéance, une seule fois. `selectV5Decision` contrôle déjà la révision d’un choix ; ce contrôle ne constitue pas encore l’application transactionnelle dans le Store.

## Ajouter un talent

1. Lire sa description V5 publiée et confirmer son ID, rang et spécialisation.
2. Définir chaque clause par événement, rôle, conditions et opération, avec cumul explicite.
3. Enregistrer empreinte source et version de règle ; garder le contrat brouillon pendant la validation.
4. Fournir des exemples de recette métier : cas applicable, cas exclu, contexte inconnu et cumul.
5. Passer le contrat validé après vérification. Si une mécanique est absente du vocabulaire, étendre l’opération commune et son schéma avant de l’utiliser.

L’inventaire `LOT2_INVENTAIRE_TALENTS.json` est distinct de ce schéma. Ses exemples doivent être contractualisés et validés avant toute activation.
