# E5 — Avance du temps de campagne : développement

État de la tranche développeur au 18 octobre 2026. Ce rapport décrit le raccordement local réalisé dans le worktree `codex/divin-v5`; il ne vaut ni recette complète de l’application ni validation de l’ensemble des effets V5.

## API et garanties raccordées

`Store.advanceCampaignTime({ seconds, reason, eventId?, clockBaseRevision? }, { baseRevision? })` accepte uniquement un nombre de secondes entier, positif et sûr, un motif textuel non vide, une révision d’horloge et une révision locale distinctes. Les issues sont structurées (`applied`, `duplicate`, `stale`, `conflict`, `requires-input`, `invalid` ou `persistence-error`). Le retry exact vérifie d’abord l’identité du reçu, avant la révision locale; une réutilisation de l’identifiant avec un autre contenu est refusée. L’horloge et le reçu retournés sont capturés dans la transaction propre à l’appel, y compris lorsque plusieurs appels mémoire sont en attente.

`campaignDurationSeconds(value, unit)` dans `js/core/v5-game-time.js` centralise la conversion secondes/minutes/heures/jours. Les secondes directes entières et positives sont acceptées; les secondes fractionnaires ou invalides sont refusées. Une tolérance limitée à l’erreur machine de conversion évite de rejeter des valeurs arithmétiquement exactes comme l’héritage `(rounds / 6)` sans introduire d’arrondi de jeu. `advanceTalentMinutes` reste une façade compatible, accepte les minutes fractionnaires uniquement si elles correspondent à un nombre exact de secondes et délègue à la nouvelle commande.

Le parcours des participants actifs, de réserve, persistants et des scènes suspendues se fait depuis le snapshot de la transaction. Les miroirs d’une même identité stable ne sont avancés qu’une fois puis reprojetés; des copies divergentes bloquent au lieu de fusionner silencieusement. Les sujets portant seulement un nom ou un `profileId` restent indépendants. Les expirations de sorts, incidents et Forme bestiale réutilisent les fonctions mécaniques existantes. Le temps réel de l’ordinateur ne produit aucune avance implicite. Undo/Redo, persistance et synchronisation partagent le reçu et le snapshot de la commande.

Le raccordement distant dans `js/core/sync-session.js` ne répare que les feuilles que RTDB omet effectivement du reçu campagne (`validatedPhases: []` et coordonnées nulles), et seulement après vérification de l’identité et de l’empreinte. L’import local reste strict. Avec un backend local non transactionnel, l’avance est bloquée avant écriture et historique; un store sans stockage (`storage: null`) conserve son mode mémoire.

Les changements autorisés à `Store.setRoundTurn` rendent la modification manuelle de position neutre pour les expirations et le temps écoulé. Les deux branches, transactionnelle et mémoire, maintiennent la projection de position de l’horloge alignée sur le combat sans fabriquer de transition. Les vrais passages par `nextTurn` conservent leur traitement normal.

## Familles couvertes et limites explicites

Les couches de sort et incidents disposant d’une durée restante cohérente avancent en secondes; les incidents historiques en Rounds sont réconciliés seulement lorsqu’un reçu de transition atteste le mouvement dans le même contexte de combat. Des avances répétées ne comptent pas deux fois le même Round. Une transition du combat actif n’est jamais imputée à une scène suspendue ou à un sujet hors scène. Les effets miroirs liés à une identité durable suivent une projection unique.

La Forme bestiale historique ou un talent dont l’expiration dépend des Rounds, sans ancre fiable du moment de pose, retourne `requires-input`; aucun Round de pose n’est inventé. Les changements manuels de position ne prouvent pas du temps écoulé. Des coordonnées Round contradictoires ou une identité durable dont les couches divergent bloquent l’ensemble de l’avance avec un besoin localisé. Une couche de burnout temporaire sans durée exploitable est également bloquée.

Les échéances divines calendaires (`deadline.kind: campaign-time`) ne sont pas encore exécutées par cette tranche; elles bloquent avec un besoin explicite, y compris si leur valeur est invalide. La phase propre d’une échéance divine reste inchangée et aucune phase n’est fabriquée; D-12 n’est pas étendu aux prières. Les liens d’identité durable qui ne sont pas conservés par la sanitation de la réserve ne sont pas déduits à partir du nom ou du profil; ces cas restent séparés ou nécessitent une intervention explicite. Les durées calendaires sans ancre exploitable bloquent sans mutation partielle.

## Vérifications effectuées

- `node --test tests/divin-v5-campaign-independent.test.js` : 58/58 cas indépendants verts après les correctifs de contexte, de répétition, de miroirs et de neutralité des positions manuelles.
- `node --test tests/divin-v5-campaign-independent.test.js tests/divin-v5-game-time.test.js tests/divin-v5-e5-independent.test.js tests/lot3-v5-finalization.test.js tests/lot3-v5-contrats-mineurs.test.js` : 138/138 tests verts après le dernier raccordement de la branche mémoire de `setRoundTurn`.
- Contrôle indépendant final après ajout d’un cas mémoire supplémentaire : 59/59 campagne et 51/51 régressions héritées (110/110); le contrôleur a aussi rapporté UI 6/6 et cloud 20/20. Ces contrôles ciblés ne sont pas la recette principale globale.
- Les cas indépendants couvrent notamment les reçus CAS, doublons, révisions obsolètes, échec de persistance, reload/Undo/Redo simulés, cumul 59 s + 1 s, multi-magasins, scènes suspendues, miroir stable, effets mixtes avec Tours, positions Round modifiées manuellement, backend `localStorage`, et codec RTDB attesté.
- La recette principale globale de 18 commandes demeure à effectuer/annoncer par le principal.

Les tests indépendants sont des preuves ciblées des contrats ci-dessus. Ils ne certifient pas toutes les durées, clauses, familles d’effets ou combinaisons de synchronisation de l’application.
