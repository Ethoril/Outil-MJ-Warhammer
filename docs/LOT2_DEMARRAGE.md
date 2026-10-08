# Lot 2 : cadrage final et premier incrément

Le chantier est commencé dans une branche isolée, `codex/lot2-talents-v5`, depuis le commit `28657e39477bbcbfeb0de826b3f1d05e525bb386` de la version 3.12.3. Le premier incrément fournit un socle testable et extensible. Les fonctions nouvelles ne sont pas encore raccordées à l’interface de combat ni à l’application des commandes du Store. Rien n’est publié et aucune donnée de séance n’est modifiée.

## Décisions de périmètre

- Catalogue utile complet, avec priorité aux talents des PJ actuels.
- Un seul système jouable, V5, avec annulation des Avantages/Désavantages 1 pour 1 selon la précision du MJ.
- Conversion des descriptions à la source Aides de jeu par le MJ ; aucune conversion automatique dans ce chantier.
- Dix talents de bonus de caractéristiques déjà intégrés aux fiches sont exclus.
- Présentation des conséquences avant les calculs ; inversion facultative explicite, recommandation motivée, détail replié.
- Durées, quotas, persistance, annulation et source des effets font partie du lot 2 complet.

La conversion ne bloque pas les travaux du moteur commun. L’activation d’un talent attend sa description V5 publiée et son contrat validé.

## Ce qui est développé

| Module | Fonctionnement du premier incrément |
| --- | --- |
| `js/core/v5-roll.js` | Aperçu pur des jets, DR, inversion facultative ou obligatoire, annulation des sources, critiques et maladresses, résultats automatiques, opposition ; aucun tirage implicite |
| `js/core/v5-momentum.js` | Élan binaire, gains et motifs de perte, exceptions ciblées, coût d’Élan et limite de l’attaque supplémentaire payée par Tour |
| `js/core/v5-decision.js` | Comparaison des résultats par un résolveur d’action injecté, recommandation sur les Blessures connues, détail séparé, contrôle de révision lors du choix |
| `js/core/talent-contracts.js` | Évaluation des clauses V5 déclaratives par événement, rôle, conditions, rang, spécialité, source et règle de cumul |
| `sw.js` | Ajout des quatre modules au cache hors ligne |

L’évaluateur fournit sept opérations : modifier les DR, accorder Avantage, accorder Désavantage, modifier les dégâts avant protection, ajouter une qualité, réduire une acquisition d’état et empêcher un motif précis de perte d’Élan. Il renvoie des propositions ; il ne dépense aucune ressource et n’applique aucun effet à la séance.

Un talent courant peut être ajouté avec les opérations existantes, sans branche de calcul portant son nom. Une nouvelle mécanique demande une extension explicite du vocabulaire commun. Les coûts, quotas, choix et échéances des contrats sont encore à implémenter : les champs correspondants sont rejetés par ce premier schéma, pour éviter de les ignorer silencieusement.

Les groupes de cumul déclarent `add`, `max` ou `unique`. Un bonus fixe ne se multiplie pas par le rang. Un montant dépendant du rang utilise une formule déclarative limitée à `base + perRank × rank`. Les conditions prennent trois résultats : applicable, non applicable, contexte manquant. Une donnée manquante sur une clause pertinente rend le plan non prêt. Une clause déjà écartée par une autre condition ne produit pas de question inutile.

Un contrat brouillon, absent ou dont l’empreinte ne correspond plus au texte source ne produit aucun effet. Sa situation est indiquée dans la trace. Les dix talents exclus restent exclus même si un contrat existe. Le statut `ready` signifie que les clauses évaluables n’attendent plus de contexte ; il ne signifie pas que tout le catalogue du personnage est couvert. L’interface devra présenter les statuts de couverture séparément.

Les contrats et plans sont des données sérialisables ; aucun texte descriptif ni formule JavaScript n’est exécuté. Les aperçus sont immuables et conservent les origines. Le contexte complet et les acquisitions devront être enregistrés par la future commande de résolution.

## Vérification effectuée le 8 octobre 2026

- **468 tests Node réussis, aucun échec**, dont 62 nouveaux : 36 pour jets/Élan/décisions et 26 pour clauses de talents.
- La suite existante couvre aussi la déclaration des modules dans le cache, le Store, les fiches et les référentiels. Son succès ne prouve pas le fonctionnement des futurs raccordements.
- Maquette interactive vérifiée dans Edge : sélection de chaque option, confirmation et aperçu du journal, détail initialement replié puis ouvert, vue bureau 800 px et vue étroite 360 px sans débordement horizontal ni erreur JavaScript.
- `git diff --check` sans erreur.

Le scénario d’interface est fictif : conserver 42 donne +3 DR et 5 Blessures ; inverser en 24 donne +5 DR et 3 Blessures à cause d’une protection supérieure. Le joueur choisit. Cette maquette illustre le contrat d’interface ; elle utilise des résultats fixes et ne représente pas un combat réel raccordé au moteur.

## Suite du développement

1. Raccorder les opérations de clauses et le noyau V5 à l’aperçu du combat, en remplaçant la mécanique actuelle des jets.
2. Construire les événements, occurrences d’états et échéances liées au Tour du porteur, de l’auteur ou au Round.
3. Intégrer choix, coûts et quotas dans une commande atomique, avec annulation et reprise persistante.
4. Charger les descriptions V5 actualisées, établir les contrats exécutables et calculer la priorité depuis les snapshots des PJ actuels.
5. Raccorder le panneau de conséquences et le détail replié, puis réaliser la recette métier et navigateur du combat complet.

Le registre des 206 talents et ses neuf exemples restent un inventaire préparatoire. Ils ne sont pas chargés comme des contrats validés par le moteur. Les tests de contrats utilisent des identités et empreintes synthétiques.

## Fichiers et isolation

Worktree : `C:/Users/d.barritaud/Documents/Codex/2026-10-08/hop/work/lot2`.

Le dépôt partagé et les autres lots restent sur leurs branches. Aucune publication ni modification du catalogue source de talents n’a été effectuée. Le numéro de version reste 3.12.3 jusqu’à préparation d’une livraison ; il devra être incrémenté avec la version de cache avant publication.
