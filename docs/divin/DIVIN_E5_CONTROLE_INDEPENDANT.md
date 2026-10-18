# Contrôle indépendant E5 — horloge et transitions de Tour

Contrôle indépendant de la première tranche E5, 17 octobre 2026. Ce rapport décrit les vérifications réellement exécutées sur le worktree partagé. Il ne certifie pas l’ensemble des durées des sorts, miracles, États ou effets, ni la complétude du programme divin.

## Attentes contrôlées

Les attentes suivent la frontière de conception dans [DIVIN_E5_CONCEPTION_HORLOGE.md](DIVIN_E5_CONCEPTION_HORLOGE.md) : `state.combat` porte la position de combat; la clock est une projection versionnée; une échéance ne se traite que sur les phases d’une vraie transition `nextTurn`; les changements de gestion, ordre, scène ou index ne fabriquent pas de phases; combat, clock, effets et reçu doivent être enregistrés dans une commande réversible. Le Round suivant ajoute une seule fois dix secondes selon D-11. L’expiration D-12 reste propre aux sorts et ne devient pas un repli silencieux des prières.

Les lectures de règles invoquées ici sont celles consignées dans la conception : Livre de base V5 p. 161–163, 169–170, 184–187 et 266, avec les limites de lecture qui y sont décrites. Je n’ai pas relu ces pages pendant cette recette et je ne revendique aucune lecture personnelle supplémentaire. La recette teste les invariants de l’horloge et les points d’expiration explicitement cadrés; elle ne certifie pas la transposition de chaque règle de durée.

## Tests Node indépendants

Le fichier [divin-v5-e5-independent.test.js](../../tests/divin-v5-e5-independent.test.js) contient 18 cas indépendants. Ils couvrent les changements manuels de Round/acteur, retrait d’acteur, suspension puis reprise de scène, réordonnancement, les deux chemins legacy et V5, coordonnées d’échéance explicites, absence d’auteur divin, plan de phases canonique, CAS/rejeu périmé, migration sans temps fabriqué et conservation d’extensions, preview sans mutation, Undo/Redo, refus de persistance et échéance historique d’un sort sans auteur.

Le contrôle final ciblé E5 a passé **31/31 tests** avec :

```text
node --test tests/divin-v5-e5-independent.test.js tests/divin-v5-game-time.test.js tests/divin-v5-e5-technical.test.js
```

Les deux défauts adversariaux suivants ont d’abord été reproduits puis corrigés par les auteurs, sans modification de mes attentes :

- le moteur V5 transmettait `turnIndex` à l’expiration divine alors que la deadline compare `turn`; l’échéance `expiry.turn=1` restait donc active après la vraie fin de Tour;
- le chemin `Store.nextTurn` legacy avançait la position et la clock sans appliquer les phases validées aux couches divines. Il applique maintenant uniquement les phases provenant de la transition réelle, sans exécuter les effets ou demandes de dés V5.
- la reprise d’une scène laissait la projection de clock au curseur suspendu (Round 0, acteur null), ce qui faisait échouer le Tour suivant. Une réconciliation neutre est maintenant enregistrée atomiquement avec la reprise; elle aligne la projection sur la position active sans ajouter secondes, révision ni phase. Le test indépendant de reprise vérifie aussi que la couche reste présente jusqu’à une vraie transition.
- les reçus de clock exigent maintenant un ID versionné `clock-v1:<baseRevision>:<nonce>`; les deux producteurs réels (Store legacy et moteur V5) suivent cette forme. Les anciennes fixtures indépendantes ont été alignées sans changer leurs assertions métier.
- une première correction de durée réutilisait le Round source comme `currentRound` général, retardant d’un Tour les effets historiques sans auteur. La comparaison avec le snapshot de début de poursuite (`tmp/divin/e5-legacy-expiry-baseline-comparison.json`) a confirmé deux échéances distinctes à conserver : le repli sans auteur compare le Round d’arrivée, tandis que le cas d’un auteur présent s’appuie sur `endedTurn.round`, le Round source. Le correctif trop large a été révoqué; le test indépendant exige l’expiration au premier Round d’arrivée après 119 min 50 s, avec les dix secondes et le reçu atomique attendus.

Après les corrections de réconciliation, les quatre suites héritées `fiche-core-v3`, `lot2-v5-23-control`, `lot2-v5-25-acceptance` et `lot3-v5-cloture` ont passé **47/47 tests** ensemble. Seul le scénario `lot3-v5-cloture` du Mind Over Body a été adapté avec l’autorisation du principal : il contrôle maintenant l’expiration au premier Round d’arrivée, puis annule immédiatement cette unique transition et vérifie que la couche et la clock sont restaurées tandis que la Chance reste dépensée. L’ancienne forme faisait deux commandes de Tour avant un Undo; comme l’effet avait expiré au premier Round, cet Undo portait sur la deuxième commande et ne pouvait pas restaurer la couche. C’était une attente d’historique devenue inadaptée à la nouvelle granularité atomique par Tour, pas un défaut corrigé en retardant l’échéance. Les attentes de durée et d’expiration restent strictes.

Relance indépendante réunissant les 31 tests E5 techniques/clock, les 47 tests hérités et les 24 tests E1 indépendants : **102/102**. Le principal rapporte aussi un rejeu E5 de **78/78** comprenant ses tests de développement et les quatre suites héritées. Ces résultats ciblés ne remplacent pas la recette globale de 16 commandes.

Les contrôles de gestion, prévisualisation, réconciliation et reprise ne produisent pas de phase ni d’avancement de temps. La migration d’un état sans clock démarre à zéro et conserve les durées héritées et extensions inconnues. Le chemin legacy testé ne déclenche pas l’effet d’État Enflammé et ne crée pas de demande de dé V5.

## Parcours navigateur indépendant

Le fichier [divin-v5-e5-browser-independent.mjs](../../tests/divin-v5-e5-browser-independent.mjs) monte le composant de production `initCombatBanner`, le moteur `createCombatEngine` et le Store avec le véritable adaptateur IndexedDB. Le scénario clique le bouton visible « Tour suivant » : il fait passer le prêtre à l’allié, puis ouvre le Round suivant. Une bénédiction créée via le Store porte une échéance explicite sur ce second Tour; le second clic enregistre ensemble l’expiration de la couche et le reçu d’horloge, avec dix secondes ajoutées une fois. Le test recharge la page, vérifie la paire position/clock, refuse un aperçu après modification de position, puis vérifie Undo, Redo et un nouveau reload.

Résultat navigateur : **PASS**, aucune erreur JavaScript. Reçu et capture : `tmp/divin/e5-browser-independent/receipt.json` et `tmp/divin/e5-browser-independent/round-transition.png`.

La recette à deux clients de [divin-v5-cloud-browser.mjs](../../tests/divin-v5-cloud-browser.mjs) a également passé avec deux contextes IndexedDB et l’adaptateur production REST/ETag. Elle vérifie les transitions `Store.nextTurn` reçues par l’autre client, le reload/Undo/Redo avec clock et reçu atomiques, puis deux avances hors ligne concurrentes: conflit explicite, branche restaurable et une seule durée de Round retenue. Le reçu est `tmp/divin/cloud-divine-receipt.json`. Le comparateur combat tolère seulement l’omission RTDB de conteneurs vides facultatifs; les valeurs de position, clock, couches actives et provenance sont vérifiées.

Ce harness exerce le bouton et les modules de production mais ne démarre pas la page complète via `main.js`. Le refus d’aperçu périmé suit une modification locale de position; il ne remplace pas un test de conflit concurrent entre deux clients ni une recette RTDB. Cette tranche ne teste pas l’avance explicite de temps de campagne, la conversion des minutes/heures/jours, les migrations de chaque famille d’effets, ni les autres stockages hors du snapshot transactionnel. La recette globale et ces limites restent au principal.
