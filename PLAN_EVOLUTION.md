# Plan d’évolution — Outil MJ Warhammer

> Rédigé le 5 septembre 2026, sur le dépôt `a27ece9` (application 3.5.1 après J1).
> Statut : E01–E04 réalisés et validés par le parent ; E05 est en validation de ses scénarios de reprise et de migration.
> Demande : améliorer fonctionnement, UI et fonctionnalités ; écran destiné aux joueurs exclu.

## 1. Direction et périmètre

Faire de l’application un poste de pilotage de séance : préparer une rencontre, résoudre une action, suivre ses conséquences et reprendre la narration avec un minimum de manipulations.

Le critère principal de réussite est la réduction des interruptions du MJ. La fiabilité des données passe avant la richesse fonctionnelle. Les nouvelles fonctions doivent rester utilisables sans réseau, à l’exception de la synchronisation et d’une éventuelle assistance IA explicitement déclenchée.

### Décisions retenues pour ce plan

- Chrome sur macOS, ordinateur, usage par un seul MJ. Plusieurs onglets ou appareils du même MJ restent possibles, avec gestion explicite des conflits.
- Application statique sur GitHub Pages, modules ES natifs, sans framework ni étape de compilation obligatoire.
- Polices et ressources visuelles embarquées ; identité parchemin, Cinzel/Lora et rouge sombre conservée. Les chiffres et commandes denses pourront utiliser une police système pour améliorer leur lecture.
- Interface entièrement en français ; « DR » dans les libellés utilisateur, quelle que soit la convention interne.
- Accès local immédiat. La connexion Google sert à synchroniser ; elle ne conditionne plus l’accès à l’application.
- Trois espaces : **Préparer**, **Jouer**, **Bibliothèque**. Le détail des parcours figure au §4.
- Les opérations importantes sont prévisualisables et annulables. Pas de confirmation systématique pour les gestes ordinaires.
- Moteur de règles déterministe et indépendant de l’interface. Une aide à l’import ne décide jamais des résultats de jeu.
- Un seul contexte de campagne actif pour la première version. Une collection de rencontres et un groupe de personnages persistants suffisent ; un gestionnaire général de campagnes n’est pas nécessaire.

### Hors périmètre

- **Écran destiné aux joueurs : exclu du programme actuel**, sans lot, estimation, routes publiques ni préparation technique dédiée.
- Comptes joueurs, partage public, collaboration multi-MJ et permissions par rôle.
- Carte tactique avec déplacement, mesure de distances ou brouillard de guerre.
- Application mobile native, interface tactile dédiée et compatibilité exhaustive des navigateurs.
- Refonte générale de la pile technique ou remplacement de Firebase sans nécessité constatée.
- Encyclopédie exhaustive des suppléments WFRP, générateur complet de personnages, inventaire économique et gestion de campagne universelle.
- IA autonome qui lance des actions, change les règles ou modifie une partie sans passage par un aperçu contrôlé.

### Relation avec les documents existants

`PLAN.md` reste l’historique de la précédente refonte et de ses décisions. Son indication « lots 1 à 12 faits » ne prouve pas leur fonctionnement dans le dépôt actuel. Le présent document est le plan de travail des évolutions à venir ; ses lots sont préfixés **E** pour éviter toute confusion.

Le lot historique 13 est repris dans E06, E10 et E12 : ne pas exécuter deux programmes concurrents sur les mots-clés. `TESTS.md` reste le protocole de recette existant ; l’étendre au fil des lots, en corrigeant les vérifications devenues obsolètes.

Les choix de jeu déjà arrêtés restent inchangés tant qu’une modification n’a pas été décidée explicitement : traitement de 100 comme double, plancher de dégâts et exception Inoffensive. Une incohérence découverte est documentée ; elle n’autorise pas une modification silencieuse des règles.

## 2. État de départ et constats

La suite actuelle contient **73 tests réussis** lors de l’audit. Elle couvre plusieurs fonctions et régressions, mais pas le parcours complet de démarrage et de saisie dans un navigateur.

| ID | Constat et degré de vérification | Effet | Lot |
|---|---|---|---|
| F01 | Champs de profil manquants dans `index.html` ; exception `resetForm()` confirmée dans le navigateur | Initialisation interrompue | E01 |
| F02 | `addProfile()` suivi de `log()` : envoi ne contenant que les métadonnées, reproduit avec un adaptateur Firebase simulé | Modification omise de la synchronisation | E02 |
| F03 | Imports Firebase statiques dans `sync.js`, avant le secours hors ligne ; constat de code | Disponibilité locale dépendant du chargement distant | E03 |
| F04 | Déplacement B avant A, puis démarrage donnant le tour à A : reproduit | Ordre affiché différent de l’ordre de jeu | E08 |
| F05 | `resetCombat()` laisse les lignes de dés des participants supprimés : reproduit | Données orphelines et accumulations | E01, E04 |
| F06 | Instantané d’annulation unique, non systématique pour PV/états/tours ; constat de code | Retour arrière ne correspondant pas au dernier geste | E07 |
| F07 | Le bouton Mots-clés de la réserve bascule seulement Inoffensive ; constat de code | Préparation incohérente avec le combat | E10 |
| F08 | Durée encodée dans une chaîne et présentée avec × ; ajout de niveaux bloqué par l’UI alors que certains calculs comptent les occurrences ; constat de code | Confusion entre intensité et durée | E06 |
| F09 | Connexion suivie d’un envoi complet sans attendre une réconciliation ; arbitrage par horloge locale ; constat de code, scénarios réels à tester | Risque de remplacement de données ou de conflits mal résolus | E05 |
| F10 | Contrôles de filtre attendus par le journal mais absents du HTML ; constat de code | Fonction annoncée mais inaccessible | E01, E09 |
| F11 | `data-c` porté par `.color-option`, lu sur `.color-swatch` ; constat de code | Sélection de couleur incohérente | E01 |
| F12 | Sélection de l’import reconstruite au filtrage et bouton Tout ne mettant pas à jour son style ; constat de code | Sélection perdue ou visuellement trompeuse | E10 |

Ces constats décrivent le dépôt examiné, pas une vérification du site publié ou de la configuration Firebase en production. Reproduire les constats issus de la seule lecture avant correction.

## 3. Jalons, priorités et dépendances

### Ordre de réalisation recommandé

| Jalon | Lots | Résultat utilisable |
|---|---|---|
| J1 — Application fiable | E01–E03 | Démarrage fonctionnel, correctif d’envoi, utilisation locale indépendante du réseau |
| J2 — Données maîtrisées | E04–E08 | Migration sûre, reprise multi-appareils, règles explicites, annulation et tours cohérents |
| J3 — Partie fluide | E09–E10 | Nouvel écran de jeu et préparation de profils unifiée |
| J4 — Rencontres complètes | E11–E13 | Rencontres réutilisables, résolution guidée, personnages persistants et clôture propre |
| J5 — Assistance à la scène | E14–E16 | Rappels, intentions, événements et simulations sans effet de bord |
| J6 — Saisie accélérée | E17 | Import de profils depuis du texte avec aperçu et validation |

Chaque jalon est livrable sans attendre le suivant. J1 doit pouvoir être livré rapidement ; ne pas le bloquer sur la refonte visuelle ou le futur modèle de données.

Les tailles indiquent l’ampleur relative : **S** = correction localisée ; **M** = composant ou flux borné ; **L** = évolution transversale avec migration ou plusieurs vues. Elles ne constituent pas une estimation calendaire. Établir les durées après J1, à partir du travail réellement observé.

| Lot | Priorité | Taille | Dépendances directes | Statut |
|---|---|---|---|---|
| E01 — Démarrage et parcours essentiels | P0 | M | — | Réalisé — contrôlé par le parent |
| E02 — Fiabiliser les envois actuels | P0 | M | — | Réalisé — validé par le parent |
| E03 — Accès local et mise à jour PWA | P0 | M | E01, E02 | Réalisé — validé par le parent |
| E04 — Schéma et stockage transactionnel | P1 | L | E03 | Réalisé — validé par le parent |
| E05 — Synchronisation et conflits | P1 | L | E02, E04 | En cours — contrôles parent et scénarios guest/compte en validation |
| E06 — Contrat de règles et états | P1 | M | E04 | À faire |
| E07 — Actions atomiques et annulation | P1 | L | E05, E06 | En cours — intégration Store |
| E08 — Ordre des tours et cycle de combat | P1 | M | E07 | En cours — ordre effectif intégré |
| E09 — Nouvelle interface de jeu | P1 | L | E08 | À faire |
| E10 — Profils, actions et bibliothèque | P1 | M | E06, E09 | À faire |
| E11 — Rencontres et personnages persistants | P2 | L | E07, E10 | À faire |
| E12 — Résolution d’action guidée | P2 | L | E06, E09, E10 | À faire |
| E13 — Clôture et reprise de séance | P2 | M | E11, E12 | À faire |
| E14 — Rappels contextuels | P2 | M | E08, E12 | À faire |
| E15 — Intentions et événements de scène | P3 | L | E11, E14 | À faire |
| E16 — Mode « et si… » | P3 | M | E07, E12, E15 | À faire |
| E17 — Import de profils depuis du texte | P3 | L | E04, E10 | À faire |

P0 = défaut bloquant ou risque immédiat ; P1 = socle et ergonomie ; P2 = gain courant en séance ; P3 = extension. Le chemin recommandé reste séquentiel pour limiter les changements simultanés du Store.

## 4. Parcours et interface cible

### Préparer

- Liste des rencontres enregistrées : nom, participants, notes et statut du brouillon.
- Composition d’une rencontre depuis la bibliothèque, quantité par profil, camp et renforts.
- Groupe de personnages persistants, avec blessures et états conservés entre les scènes.
- Éditeur de profil ouvert à la demande, sans formulaire vide occupant la moitié de l’écran.
- Action principale : **Lancer la rencontre**. Si une scène est déjà en cours, proposer sa reprise ou sa clôture ; ne pas l’écraser.
- Avant E11, cette vue accueille la préparation des profils et du combat courant. Ne pas afficher de commandes non fonctionnelles pour des lots futurs.

### Jouer

Disposition de référence sur ordinateur :

```text
Contexte / scène                 Préparer | Jouer | Bibliothèque    Sauvegarde
Round 3 · tour de Saskia                            Annuler · Terminer le tour
┌──────────────────────┬────────────────────────────────┬───────────────────────┐
│ Piste des tours       │ Combattant sélectionné         │ Rappels contextuels   │
│ nom, PV, états        │ action, cible, modificateurs   │ règles utiles         │
│ tour actuel / suivant │ jet, résultat, aperçu          │ derniers événements   │
│                      │ appliquer les conséquences     │                       │
└──────────────────────┴────────────────────────────────┴───────────────────────┘
Renforts / en attente, repliables et distincts de la piste active
```

- `currentActorId` indique qui joue ; `selectedActorId` indique qui est consulté. Consulter une cible ne change jamais le tour.
- Suivi du combattant actif par défaut ; possibilité d’épingler temporairement une fiche, puis de revenir au tour courant.
- La piste affiche les combattants compacts. Les fiches complètes restent accessibles sans les afficher toutes simultanément.
- Consultation par défaut ; édition explicite des profils, valeurs et actions. Les corrections rapides de PV et d’initiative restent disponibles.
- Aperçu lisible : cible, localisation, dégâts retenus, PV avant/après et états proposés. Détail de formule dépliable.
- Le journal complet est accessible dans un panneau ; les dernières actions restent visibles sans pousser les commandes de combat hors écran.
- Bibliothèque de règles ouverte en panneau contextuel avec retour au même brouillon d’action.
- « Terminer le tour » annonce les effets prévus et passe au suivant en une seule commande annulable.
- Les commandes de fichiers, thème, connexion et fin de rencontre sont dans un menu de séance ; elles ne rivalisent pas visuellement avec l’action en cours.

### Bibliothèque

- Sous-vues clairement nommées : **Profils**, **Règles et mots-clés**, **Favoris**.
- Recherche tolérant casse et accents ; filtres utiles selon la sous-vue.
- Même fiche et même sélecteur de mots-clés utilisés depuis Préparer et Jouer.
- État d’un mot-clé visible : calcul automatique, rappel, non pris en charge. Aucun effet calculé à partir de la prose du Sheet.
- Détails de source et version accessibles sans surcharger la lecture courante.

### Principes visuels et accessibilité

- Garder les thèmes clair, sombre et système. Employer les variables de thème pour les états, alertes et résultats, y compris dans les composants créés en JavaScript.
- Rouge réservé aux actions importantes et aux risques ; camp exprimé par un libellé en plus de la couleur.
- Chiffres tabulaires pour PV, initiative et DR ; intitulés non tronqués pour la cible sélectionnée.
- Densité confortable par défaut, compacte en option locale. Aucun champ essentiel minuscule pour faire tenir une ligne.
- À 1440 et 1280 px : disposition de référence ; à 1024 et 900 px : panneau contextuel escamotable, priorité à l’action. Pas d’objectif mobile dédié.
- Navigation clavier, labels accessibles, ordre de focus stable, retour du focus après fermeture d’un panneau ou dialogue.
- Espace active normalement un bouton focalisé. Les raccourcis globaux ne doivent pas changer de tour dans un champ, une modale, un menu ou un autre espace que Jouer.
- Version et statut technique discrets ; sauvegarde locale et synchronisation affichées séparément.

### Vocabulaire à uniformiser

| Actuel | Cible |
|---|---|
| Réserve — source de vérité | Bibliothèque de profils |
| Imp. Réserve | Ajouter au combat |
| Exp. Réserve | Reporter les conséquences |
| Tour suivant | Terminer le tour |
| Terminer le combat avec effacement immédiat | Clôturer la rencontre |
| Effacer les jets | Nettoyer l’affichage des résultats |
| SL / Roll / Seed dans les textes | DR / Jet / Exemples |

## 5. Architecture et données

### Répartition des responsabilités

Conserver le Store comme façade publique pendant la transition. Extraire progressivement les responsabilités lorsqu’un lot les modifie, sans réécriture préalable générale.

| Couche | Responsabilité | Modules envisagés |
|---|---|---|
| Modèles et migration | Validation, versions, conversion et références | `core/models.js`, `core/sanitize.js`, `core/migrations.js` |
| Règles pures | Calculs, états et résolution sans DOM/réseau | `core/combat.js`, `core/damage.js`, `core/resolution.js`, `core/effects.js` |
| Commandes | Action atomique, révision, application et inverse | `core/commands.js`, `core/history.js` |
| Persistance | Transactions locales, points de restauration, file d’envoi | `core/persistence.js`, `core/sync.js` |
| Données de référence | Textes, aliases, moteurs et versions | `js/data/*`, `core/keywords.js` |
| Interface | Sélection, brouillons, présentation et interactions | composants `js/ui/*`, `main.js`, `index.html`, `MJ.css` |

Les fichiers nouveaux sont indicatifs ; leurs contrats et tests importent davantage que leur nom exact. Le Store doit rester testable sans navigateur. Les calculs reçoivent leurs jets en arguments et ne déclenchent pas eux-mêmes de réseau ou d’écriture.

### Modèle cible, introduit progressivement

| Objet | Données essentielles | Règle de responsabilité |
|---|---|---|
| Enveloppe de sauvegarde | `schemaVersion`, `appVersion`, `exportedAt`, identifiant de contexte, données | Version de schéma distincte de la version de l’application |
| Modèle de profil | Nom, type, caractéristiques, `maxHp`, armures, actions, tags | Réutilisable ; ne porte pas les blessures d’un exemplaire de gobelin |
| Personnage persistant | `profileId`, identité propre, PV courants, états persistants | Suit les PJ et PNJ récurrents entre rencontres |
| Participant | ID unique, origine, copie des valeurs de jeu, camp, zone, PV, états | Une instance de combat ; jamais partagée entre deux exemplaires |
| État | ID, clé, niveaux, durée restante, moment de décrémentation, source, paramètres | Intensité et durée séparées ; migration sans perte des chaînes historiques |
| Action préparée | Type, score/attribut, modificateurs, dégâts, qualités | Cible choisie au combat ; aucun ID de cible conservé dans le modèle |
| Résultat de résolution | ID, révision de base, jets, calcul, effets proposés, statut | Même résultat pour les mêmes entrées ; application au plus une fois |
| Rencontre modèle | Composition, quantités, camps, notes, renforts, événements | Le lancement crée une instance indépendante |
| Scène en cours | Rencontre d’origine, statut, participants, round, ordre, événements | Peut être préparée, en cours, suspendue ou clôturée |
| Intention / événement | Description, déclencheur structuré, portée, état de résolution | Aide au MJ ; jamais du JavaScript ou du texte exécuté |

Séparer les données partagées de jeu, le journal local et l’état d’interface. Le choix d’onglet, la fiche consultée, les filtres et la densité ne se synchronisent pas.

### Compatibilité et migration

1. Exporter ou conserver une copie intacte du format ancien avant transformation.
2. Valider l’enveloppe et distinguer erreur bloquante, donnée inconnue conservable et anomalie réparable.
3. Appliquer des migrations pures, successives et identifiées ; utiliser le même pipeline pour fichiers, stockage local et données distantes.
4. Valider l’état complet avant de remplacer l’état actif. Une migration interrompue laisse l’ancien état lisible.
5. Produire un rapport lisible des conversions, références orphelines et champs à vérifier.
6. Refuser une version future inconnue sans toucher aux données en cours.

La migration `hp` historique est ambiguë entre capacité et blessures persistantes : conserver la valeur exacte, conserver `maxHp` lorsqu’il existe, signaler les cas ambigus et ne jamais soigner automatiquement un personnage. La migration des états préserve niveaux et échéances distinctes ; ne fusionner que les entrées dont la sémantique et la durée correspondent.

Le fichier `tests/fixtures/ancien-format.json` reste intact. Ajouter de nouvelles fixtures plutôt que remplacer le témoin historique.

### Stockage et synchronisation retenus

- E02 corrige d’abord l’envoi actuel par chemins, sans migration : tampon fusionné, chemins parents/enfants cohérents, un envoi en cours et reprise sur erreur.
- E04 introduit IndexedDB natif pour écrire atomiquement état, file d’opérations et points de restauration. `localStorage` reste limité aux préférences et à la migration des anciennes clés.
- Un échec de stockage ne donne jamais lieu à « Enregistré ». Garder l’état en mémoire et proposer immédiatement un export de secours.
- E05 remplace l’arbitrage par horloge locale par une **révision partagée** et des identifiants d’opération stables.
- Choix de cohérence pour E05 : transaction Firebase sur la racine du document actif, contenant révision et état partagé. La transaction vérifie la révision et applique un lot déterministe, sans effet de bord dans sa fonction de rappel. Aucun mélange de transactions et d’écritures aveugles sur cette même racine.
- Ce choix remplace volontairement l’optimisation historique par chemins : une action multi-objets doit être cohérente. Mesurer le coût avec le jeu de charge du §8, regrouper les écritures de saisie et exclure journal, historique local et archives détaillées des transferts. Si le volume dépasse le budget mesuré, traiter ce point avant J2 plutôt qu’introduire plusieurs protocoles concurrents.
- Après reconnexion, lire le serveur avant toute publication. Sans modification locale, prendre sa version. Avec opérations locales et révision divergente, conserver les deux états et demander une résolution explicite ; pas de fusion silencieuse des PV ou des tours.
- Chaque opération envoyée possède un numéro de séquence par appareil ; le serveur conserve le dernier numéro appliqué. Rejouer une requête après perte de son accusé de réception ne réapplique pas les dégâts.
- La base commune aux opérations hors ligne est conservée tant que le conflit n’est pas résolu. Les résolutions possibles sont « reprendre la version distante », « conserver la version locale » ou « exporter les deux pour comparaison », avec aperçu et sauvegarde préalable.
- Séparer contexte invité et contextes de comptes. Une connexion à un autre compte ne publie jamais automatiquement la bibliothèque locale du compte précédent.
- Le journal lisible et l’historique d’annulation restent locaux. Un événement provenant d’un autre appareil constitue une frontière d’annulation, annoncée clairement.

## 6. Lots détaillés

### E01 — Réparer le démarrage et les parcours essentiels

**But :** retrouver une application utilisable avant toute refonte.

**Travail :**

- Restaurer tous les champs attendus du formulaire : initiative, PV, groupe, armures, caractéristiques ; corriger l’imbrication HTML.
- Vérifier création, modification, duplication, suppression et annulation existante.
- Supprimer les lignes de dés propres aux participants retirés ou à un combat réinitialisé ; conserver les véritables jets indépendants si cette possibilité existe dans les sauvegardes.
- Réparer la sélection de couleur et les filtres du journal ; conserver les noms nécessaires au filtrage après retrait d’un participant.
- Introduire un test navigateur de démarrage et un parcours de base, exécutés avec des données fictives et un adaptateur de synchronisation isolé.
- Ajouter une commande de test UI séparée de `npm test`. Un outil navigateur de développement est acceptable ; aucune dépendance ajoutée à l’application servie.

**Surfaces :** `index.html`, `ui/reserve.js`, `ui/card.js`, `ui/log-view.js`, `core/store.js`, tests UI et unitaires.

**Acceptation :** zéro exception au démarrage ; créer et modifier un profil complet ; l’importer, lui attribuer un jet et une couleur ; filtrer le journal ; terminer le combat sans ligne orpheline ; recharger et retrouver les données.

### E02 — Ne perdre aucune modification dans les envois

**But :** corriger F02 avec un changement ciblé, livrable avant E04–E05.

**Travail :**

- Déplacer la temporisation autour d’une file de modifications cumulées, pas autour du dernier objet `updates` seulement.
- Fusionner les changements successifs avec une règle explicite pour suppressions et chevauchements de chemins. Par exemple, remplacement de `combat` puis ajout d’un participant doit produire un envoi valide et cohérent.
- Isoler le lot en cours d’envoi des modifications arrivées ensuite ; ne retirer que les données confirmées. Sur échec, conserver le lot pour reprise.
- Une entrée purement locale du journal ne doit ni remplacer un lot, ni déclencher un faux nouvel état partagé.
- Ne pas annoncer de protection complète multi-appareils avant E05.

**Surfaces :** `core/store.js`, `core/sync.js`, `tests/gaps.test.js`, nouveaux tests de file d’envoi.

**Acceptation :** ajout + journal ; PV + état + journal ; modifications de deux participants ; suppression + ajout ; erreur réseau + reprise ; modification pendant l’envoi. Tous les changements attendus arrivent une seule fois dans l’état distant simulé, sans disparition de chemin.

### E03 — Accès local immédiat et mises à jour sûres

**But :** pouvoir jouer même si Google, Firebase ou le réseau ne répondent pas.

**Travail :**

- Initialiser stockage et interface avant de charger dynamiquement l’adaptateur Firebase. Attraper l’échec d’import au point d’appel.
- Supprimer l’écran de connexion bloquant ; offrir la connexion dans les commandes de séance.
- Gérer chargement lent, refus de connexion, mode invité, perte et retour du réseau sans rechargement imposé.
- Distinguer statut local et distant : enregistré localement, en attente d’envoi, synchronisé, conflit, erreur de sauvegarde.
- Mettre en cache les ressources locales nécessaires et vérifier la complétude de l’installation. Le premier accès jamais effectué sans réseau ne peut pas être garanti ; l’indiquer dans la documentation.
- Éviter une mise à jour partielle des modules en pleine séance : cache par version, ressources cohérentes, mise à jour proposée et activée après sauvegarde locale confirmée. Retirer l’activation immédiate qui pourrait mélanger deux versions.
- La reprise du réseau branche réellement la synchronisation ; retirer un bandeau ne suffit pas.

**Surfaces :** `main.js`, `core/sync.js`, `index.html`, `sw.js`, `version.js`, composant de statut.

**Acceptation :** rechargement hors ligne après installation ; SDK Google indisponible alors que le navigateur se dit connecté ; réseau lent ; refus de connexion ; retour en ligne ; mise à jour disponible pendant un combat sans perte ni rechargement automatique.

### E04 — Versionner et sauvegarder les données atomiquement

**But :** préparer les évolutions sans perdre les anciennes parties.

**Travail :**

- Introduire enveloppe versionnée, validateur commun et migrations du §5.
- Implémenter l’adaptateur IndexedDB et migrer les anciennes clés après vérification complète. Garder la copie source jusqu’à confirmation de la migration.
- Écrire état et opérations en une transaction locale ; ne pas faire dépendre la durabilité d’une fermeture de page.
- Créer des points de restauration avant migration, import remplaçant, conflit et clôture ; conservation initiale limitée à 10 points avec suppression des plus anciens seulement après réussite du nouveau point.
- Prévisualiser un import : nombre de profils, participants, données rejetées et éléments remplacés.
- Valider nombres finis, références, tableaux et identifiants ; conserver les champs inconnus utiles dans une zone d’extensions sans les exécuter.
- Séparer socle partagé, journal local et état UI. Introduire les nouveaux objets seulement dans les lots qui les utilisent.

**Surfaces :** `core/persistence.js`, `core/migrations.js`, `core/sanitize.js`, `core/models.js`, `core/store.js`, import/export.

**Acceptation :** ancien format, format actuel, sauvegarde vide, données partiellement invalides, version future, quota, interruption de migration et export/réimport. Les valeurs de jeu valides sont conservées exactement ; aucun état partiel ne devient actif.

### E05 — Réconcilier les comptes, appareils et conflits

**But :** une synchronisation dont le statut reflète réellement la situation.

**Travail :**

- Implémenter lecture initiale, révision, transaction et déduplication définies au §5.
- Ajouter une file durable, reprise avec délai progressif et arrêt propre des listeners à la déconnexion.
- Isoler les espaces invité/compte ; proposer un import explicite des données invitées lors de la première connexion.
- Afficher le contexte concerné, les deux versions et leurs différences utiles dans l’écran de conflit. Conserver des copies avant résolution.
- Tester les règles Firebase nécessaires en environnement de test ; ne pas élargir l’accès inter-comptes. Ne pas considérer la présence de la configuration client comme une faille en soi.
- Prévoir une transition entre anciens clients et nouveau protocole : chemin de schéma distinct, migration initiale unique, refus de mélanger les écritures de versions incompatibles. Garder la source ancienne sans la synchroniser dans les deux sens.

**Surfaces :** `core/sync.js`, persistance, UI de statut et conflit, tests avec adaptateur simulé et émulateur ou environnement de test.

**Acceptation :** navigateur neuf face à des données distantes ; local plus récent hors ligne ; horloges décalées ; deux onglets modifiant la même cible ; perte d’accusé après écriture ; fermeture puis reprise ; changement de compte ; refus d’accès. Aucune version n’est remplacée sans procédure définie et récupérable.

### E06 — Expliciter les règles et séparer durée et niveaux

**But :** rendre les automatismes compréhensibles et vérifier ce qu’ils calculent.

**Travail :**

- Créer `docs/REGLES_MOTEUR.md` : règle, source précise disponible, convention de table, entrées, résultat attendu, statut d’implémentation et tests.
- Recenser les règles actuelles et les futures oppositions : bornes des jets, réussites/échecs automatiques, égalités, critiques, localisation, modificateurs, cumul d’états, avantages et mots-clés.
- Ne pas inventer de référence officielle. Une règle non vérifiée reste présentée comme convention existante ou arbitrage manuel, et ne bloque que l’automatisme concerné.
- Migrer les états vers des objets : niveaux, durée, source et échéance. Afficher par exemple « Hémorragique ×2 · 3 tours restants ».
- Permettre ajout/retrait de niveaux et correction de durée sans enlever puis recréer tout l’état.
- Centraliser les aliases des mots-clés pour éviter une double application du même effet.
- Définir les modes automatique, rappel et manuel par effet ; les choix sont copiés dans la scène au lancement et versionnés dans le résultat de résolution.
- Le texte du Sheet reste éditorial ; le registre local détermine les capacités mécaniques. Un texte modifié ne change pas un combat en cours.

**Surfaces :** `core/sanitize.js`, modèles, `core/combat.js`, moteurs de mots-clés, données d’états, UI de badges.

**Acceptation :** migration de chaînes historiques et doublons ; niveaux multiples avec durées différentes ; échéances correctes ; effet inconnu conservé ; aliases dédoublonnés ; calcul détaillé correspondant aux exemples de référence.

### E07 — Introduire des actions atomiques et un vrai annuler/rétablir

**But :** une action utilisateur représente une unité de sauvegarde, journalisation et annulation.

**Travail :**

- Définir une commande avec ID, type, révision de base, données, résultat et inverse ; `batch()` seul ne fournit pas un retour arrière en cas d’erreur.
- Valider puis calculer l’état suivant avant validation atomique locale. Aucune mutation partielle si une étape échoue.
- Couvrir PV, états, initiative, déplacements, ajout/retrait de participant, dégâts, fin de tour, import et clôture.
- Conserver initialement les 50 dernières commandes du contexte actif, avec une limite supplémentaire en taille à fixer à partir des fixtures. Nettoyer sans affecter l’état courant.
- Ajouter Annuler/Rétablir et `⌘Z`/`⌘⇧Z`, sans détourner l’édition textuelle native.
- Les jets déjà tirés font partie des résultats enregistrés : rétablir une action ne relance pas les dés.
- Une mise à jour externe ferme l’historique applicable, avec indication utilisateur et point de restauration. Les imports/restaurations complets forment une nouvelle frontière après leur éventuelle annulation immédiate.

**Surfaces :** `core/commands.js`, `core/history.js`, Store, clavier, journal et handlers UI.

**Acceptation :** mauvaise cible puis annulation ; dégâts + état en un seul geste ; fin de tour avec dégâts périodiques ; plusieurs annulations et rétablissements ; nouvel acte après annulation ; erreur au milieu d’une commande ; reprise locale après fermeture ; arrivée d’un état distant.

### E08 — Unifier l’ordre et les transitions de combat

**But :** la piste visible constitue toujours l’ordre réellement utilisé.

**Travail :**

- Une fonction unique fournit l’ordre effectif à la piste et au moteur.
- Mode automatique par initiative par défaut. Un déplacement dans la piste active bascule clairement en mode manuel ; un déplacement entre zones change d’abord l’appartenance.
- Retour explicite au tri par initiative ; règle de départage stable documentée.
- Conserver le combattant courant lors d’une réorganisation ou d’un changement d’initiative. Ne jamais provoquer une fin de tour par simple consultation ou tri.
- À l’ajout d’un renfort en cours de round, insertion après le combattant actif par défaut, déplaçable par le MJ. Cette convention évite de sauter ou rejouer implicitement des tours.
- Au retrait ou passage au banc de l’acteur courant, sélectionner le prochain survivant selon l’ordre avant retrait, sans appliquer implicitement les effets de fin de tour de l’acteur retiré ; journaliser l’opération.
- Un seul participant boucle correctement sur le round suivant ; aucun actif suspend le déroulé.

**Surfaces :** `core/combat.js`, Store, commandes, `ui/combat-view.js`, drag & drop.

**Acceptation :** B déplacé avant A joue avant A ; changement d’initiative immédiat dans la piste ; round stable lors du tri ; retrait du courant, dernier acteur, renfort et banc ; effets de fin de tour appliqués une seule fois et annulables.

### E09 — Construire l’écran de jeu et la navigation cible

**But :** réduire la densité et garder les décisions près du résultat.

**Travail :**

- Mettre en place les trois espaces du §4 et la disposition du mode Jouer.
- Conserver une fiche sélectionnée indépendante du tour ; suivre automatiquement le courant tant que le MJ n’a pas épinglé une autre fiche.
- Présenter les actions préparées en consultation, avec édition volontaire ; garder les corrections rapides de PV.
- Ajouter panneau de règles contextuel, journal filtrable et commandes de séance secondaires.
- Remplacer les confirmations navigateur restantes lorsqu’un aperçu ou une annulation convient mieux.
- Conserver filtres, groupes dépliés, sélection et brouillon pendant les rendus ; ne pas reconstruire toute la vue à chaque frappe.
- Corriger les raccourcis selon le focus et la vue active ; rendre leur aide accessible.
- Présenter un état vide utile : créer un profil, charger une sauvegarde ou ajouter des exemples fictifs à la demande.

**Surfaces :** `index.html`, `MJ.css`, `main.js`, `ui/dom.js`, composants de navigation, piste, fiche, panneaux et clavier.

**Acceptation :** parcours à la souris et au clavier ; thèmes clair/sombre ; largeurs cibles ; noms longs et 15 participants ; changement de cible sans perte du brouillon ; Espace sur un bouton ne passe pas le tour ; consultation d’une règle puis retour à la même action.

### E10 — Unifier les profils, actions et mots-clés

**But :** préparer une fiche une fois et retrouver les mêmes paramètres au combat.

**Travail :**

- Réutiliser les composants d’édition d’action et de mots-clés entre profil et participant.
- Séparer identité, valeurs essentielles et sections avancées ; ajouter tags, notes et type PNJ distinct, sans modifier automatiquement les anciennes fiches.
- Ajouter favoris de règles et profils ; recherche par nom, groupe, tag et mot-clé.
- Préserver la sélection d’import pendant les filtres et refléter Tout/Aucun visuellement et fonctionnellement.
- Cloner profondément actions, armures et qualités lors d’une duplication ; aucune référence mutable partagée.
- Une modification du modèle ne change pas silencieusement un participant déjà engagé : proposer une mise à jour avec aperçu des champs, en excluant PV courants, états et cible.
- Unifier le sélecteur de mots-clés, valeurs X, aliases et badges de prise en charge.

**Surfaces :** `ui/reserve.js`, `ui/import-modal.js`, `ui/dice-line.js`, `ui/rules-view.js`, modèles et Store.

**Acceptation :** préparer une arme avec plusieurs qualités, importer et retrouver les mêmes réglages ; modifier la copie sans changer l’original ; sélectionner à travers plusieurs recherches ; noms accentués ; PNJ ; mot-clé inconnu toujours lisible ; mise à jour de modèle ne soignant pas un participant.

### E11 — Enregistrer les rencontres et les personnages récurrents

**But :** passer de fiches réutilisables à une préparation de séance réutilisable.

**Travail :**

- Éditeur de rencontre : titre, notes, participants, quantités, camps, positions actif/en attente et renforts prévus.
- Ajouter N exemplaires d’un modèle avec IDs indépendants et noms distincts ; pouvoir modifier un exemplaire.
- Distinguer modèle de profil et personnage persistant ; conserver les blessures du groupe entre scènes.
- Lancer, dupliquer, sauvegarder comme modèle et suspendre une rencontre. Le lancement crée une copie figée des profils et paramètres utiles.
- Conserver un seul combat actif ; ouverture d’une autre rencontre passe par la suspension ou clôture de l’actuel.
- Permettre l’ajout d’un profil improvisé pendant le jeu sans imposer sa conservation dans la bibliothèque.

**Surfaces :** modèles de rencontres/personnages, commandes, stockage, UI Préparer et sélecteur de participants.

**Acceptation :** rencontre de quatre gobelins et un chef ; relance avec PV initiaux des créatures et PV persistants des PJ ; deux exemplaires indépendants ; modèle supprimé après lancement sans casser la scène ; suspension et reprise après rechargement.

### E12 — Résoudre une action avec dés physiques ou virtuels

**But :** réunir jet, opposition éventuelle, conséquences et validation dans un flux cohérent.

**Travail :**

- Créer un résultat de résolution indépendant du DOM : attaquant, action, cible, modificateurs, jets, règles utilisées et effets proposés.
- Deux entrées équivalentes : dé virtuel ou résultat saisi. Accepter 1–100 ; convertir `00` en 100 lorsqu’il est saisi comme notation de dé ; afficher la valeur retenue.
- Préserver le test simple existant. Ajouter l’opposition seulement pour les règles documentées en E06 ; proposer défense enregistrée ou résultat saisi, avec arbitrage manuel explicite pour les cas non couverts.
- Rendre les modificateurs visibles et applicables ; auditer le champ `mod` existant pour ne plus conserver de paramètres sans effet.
- Éviter de traiter automatiquement un test de perception ou une esquive comme une attaque infligeant des dégâts : le type d’action détermine les conséquences proposées.
- Afficher score final, DR, localisation, critiques/maladresses et PV avant/après ; détail complet accessible.
- Appliquer les conséquences en une commande E07. Le statut d’application est dans les données, pas seulement dans un bouton désactivé.
- Si la cible ou la révision a changé depuis l’aperçu, invalider l’application et recalculer les conséquences avec les mêmes jets ; demander de relire le nouvel aperçu.
- Ajouter les effets dépendant de défense, charge ou armure uniquement lorsque leurs prérequis sont modélisés et testés. Avantages individuels/de groupe restent manuels tant que leur convention n’est pas choisie ; aucune variante activée par défaut par supposition.

**Surfaces :** `core/resolution.js`, moteurs de règles, commandes, `ui/dice-line.js` et panneau d’action.

**Acceptation :** même résultat saisi/tiré pour des entrées identiques ; 00, 01 et 100 ; oppositions gagnées/perdues/égalité selon le contrat ; actions non offensives ; critique ; absence de cible ; double clic ; cible supprimée ; modification concurrente ; annulation/rétablissement sans nouveau jet.

### E13 — Clôturer et reprendre une séance

**But :** rendre les conséquences persistantes explicites et éviter les effacements ambigus.

**Travail :**

- Écran de clôture présentant blessures, états persistants, personnages récurrents et événements importants.
- Reporter les conséquences uniquement vers les personnages persistants sélectionnés, jamais vers tous les exemplaires d’un modèle de créature.
- Pour plusieurs participants associés au même personnage persistant, empêcher le report ambigu et demander quel exemplaire fait autorité.
- Clôturer, reporter et archiver en une commande atomique annulable. Le nettoyage des lignes et participants orphelins est inclus.
- Conserver localement un résumé structuré et les points de restauration ; le journal courant reste plafonné à 300 entrées. Une archive est un objet distinct, avec gestion de rétention et export, pas une extension illimitée du journal.
- Reprendre la scène suspendue depuis l’accueil ; exporter un bilan lisible en Markdown ou JSON, sans besoin d’IA.

**Surfaces :** commandes de clôture, stockage/archives, personnage persistant, UI de bilan et export.

**Acceptation :** deux rencontres successives avec le même PJ blessé ; créatures réinitialisées au nouveau lancement ; état temporaire non persisté ; choix de report annulé ; clôture puis annulation ; export/réimport ; reprise d’une scène suspendue.

### E14 — Présenter les rappels au bon moment

**But :** soulager la mémoire du MJ sans ajouter un flux d’alertes.

**Travail :**

- Calculer les rappels à partir de l’état courant et des transitions : début/fin de tour, effet expirant, conséquence nécessitant un choix, renfort attendu.
- Limiter le panneau aux rappels utiles maintenant et distinguer effet automatique annoncé de décision à prendre.
- Dédupliquer les occurrences par scène, transition et effet ; un simple rendu ou rechargement ne déclenche rien.
- Permettre résoudre, ignorer pour cette occurrence ou reporter ; conserver ces choix dans la scène.
- Présenter une action contextuelle et le texte de règle associé, sans navigation forcée ni fenêtre modale à chaque tour.

**Surfaces :** `core/reminders.js`, moteur d’effets, transitions et panneau latéral.

**Acceptation :** hémorragie annoncée puis appliquée une fois ; expiration ; rappel ignoré ; retour arrière puis rétablissement ; rechargement ; renfort arrivé ne continuant pas à être annoncé.

### E15 — Donner intentions et événements aux scènes

**But :** soutenir les décisions narratives du MJ au-delà des PV.

**Travail :**

- Ajouter motivations, objectif immédiat et condition de retrait à un adversaire ou un groupe. Ce sont des notes structurées, pas une IA de combat.
- Éditeur d’événement avec quelques conditions explicites : round atteint, PV sous seuil, personnage hors de combat, événement précédent résolu ou déclencheur manuel.
- Première version : une condition par événement ; composer des séquences en liant des événements. Éviter un langage logique général.
- Conséquences proposées : afficher une note, faire entrer des renforts, proposer un état ou avancer une jauge de scène. Elles passent par les commandes ordinaires et restent confirmées par le MJ.
- Chaque occurrence est résolue au plus une fois. Les événements récurrents requièrent une configuration explicite.
- Ajouter une jauge manuelle de progression/menace pour représenter poursuite, infiltration ou rituel ; aucune distance tactique ou règle de sous-système n’est supposée.

**Surfaces :** modèle de scène, `core/scene-events.js`, éditeur de rencontre, commandes, panneau contextuel.

**Acceptation :** chef attendu au round 3 ; alerte de fuite quand le chef tombe ; feu gagnant l’escalier ; événement manuel ; suspension/reprise ; changement de round puis annulation ; aucun code issu du texte exécuté ; aucun déclenchement double.

### E16 — Explorer « et si… » sans modifier la partie

**But :** essayer une action sur une copie, puis choisir de la conserver ou non.

**Travail :**

- Entrer en simulation à partir de la révision courante, avec indication persistante et copie isolée des données nécessaires.
- Utiliser exactement le moteur E12 ; changer cible, modificateurs ou jets saisis pour comparer les conséquences.
- Première version limitée à une action et ses effets directs. Pas de branches narratives multiples ni de simulation automatique d’une rencontre entière.
- Ni écriture locale de partie, ni sync, ni rappel réel, ni consommation de ressource tant que la simulation n’est pas appliquée.
- Appliquer convertit le résultat retenu en une commande ordinaire, seulement si sa base est toujours valide ; sinon proposer un recalcul sans nouveau jet.
- Distinguer simulation et restauration : revenir à un point sauvegardé reste une opération séparée avec aperçu et sauvegarde de l’état actuel.

**Surfaces :** moteur de résolution, copie de contexte, commandes et mode de présentation.

**Acceptation :** abandon sans aucune mutation ; comparaison de deux cibles ; application unique ; état réel modifié pendant la simulation ; annulation du résultat appliqué ; événements fictifs ne contaminant pas la scène.

### E17 — Importer des profils depuis du texte

**But :** accélérer la saisie avec une validation claire des données extraites.

**Travail :**

- Champ de collage et parseur local pour un format de bloc simple documenté : identité, caractéristiques, PV, armures, actions et qualités.
- Aperçu côte à côte du texte et des champs reconnus ; distinguer valeur trouvée, absente et ambiguë sans pourcentage de confiance inventé.
- Rien d’absent n’est silencieusement remplacé par une statistique plausible. Les champs nécessaires sont complétés ou confirmés avant import.
- Choisir création, duplication ou mise à jour d’un profil existant ; aperçu des différences, traitement des doublons et annulation du lot importé.
- Réutiliser validation, modèles et sélecteurs E04/E10. Texte et HTML importés sont traités comme contenu inerte.
- Documenter le format local accepté et des exemples reproductibles. PDF, OCR d’images et extraction de livres entiers ne font pas partie de cette première version.

**Extension optionnelle E17b — assistance IA :** seulement après validation de l’utilité du parseur local. Définir fournisseur, destination des données, coût, qualité d’extraction et authentification. Aucune clé de service secrète intégrée au site statique ; une intégration sécurisée peut exiger un service séparé et une décision d’architecture. L’IA ne fait que produire un brouillon qui passe par le même aperçu et le même validateur. L’import local reste disponible sans cette extension.

**Acceptation :** bloc complet ; accents et décimales rejetées là où un entier est attendu ; qualités inconnues ; champs absents ; doublon ; lot de profils ; HTML malveillant affiché comme texte ; import annulé ; aucune requête externe dans le mode local.

## 7. Choix à vérifier avant les lots concernés

Ces vérifications n’empêchent pas de commencer E01. Elles limitent les automatismes concernés, pas l’ensemble du programme.

| Sujet | Position de départ | Condition avant automatisation |
|---|---|---|
| Oppositions, égalités, critiques et localisation | Conserver le test simple et proposer une saisie/arbitrage manuel | Références précises et exemples validés dans E06 |
| Avantages | Aucun nouveau bonus automatique par défaut | Choix individuel/de groupe et convention de table |
| Niveaux et durées des états | Préserver exactement les données historiques | Matrice de cumul et moment d’expiration documentés |
| Qualités partiellement implémentées | Affichage et rappel maintenus | Prérequis présents et calcul couvert par des exemples |
| Profils historiques aux PV ambigus | Aucun soin ni correction implicite | Rapport de migration et confirmation sur les seuls cas ambigus |
| Synchro par révision | Transaction du document actif, fichiers/archives lourds exclus | Mesure du volume et validation des accès en environnement de test |
| Données de mots-clés externes | Repli embarqué conservé et mécanique versionnée localement | Vérification du format/aliases avant changement de source |
| Assistance IA | Optionnelle, sans dépendance pour le reste | Architecture d’accès, coût et données envoyées définis |

## 8. Validation et mesure des progrès

### Jeu de recette commun

Créer des fixtures fictives comprenant Renaut et Saskia, quatre gobelins issus d’un même modèle, un chien et un chef en renfort. Prévoir armures différentes, niveaux d’état multiples, durées distinctes, noms longs, personnages blessés, une action non offensive, une attaque simple et une opposition.

Conserver trois tailles de données :

- Petit : 4 profils, 4 participants, quelques actions.
- Courant : 50 profils, 8 participants, 300 entrées de journal.
- Charge : 200 profils, 15 participants actifs, 30 en attente, plusieurs actions chacun et points de restauration remplis.

Ce sont des tailles de validation proposées, pas une affirmation sur l’usage ou les performances actuelles.

### Tests par couche

| Couche | Tests attendus |
|---|---|
| Calcul | Entrées/sorties déterministes, bornes, mots-clés, états, oppositions et formules expliquées |
| Commandes | Tout ou rien, inverse exact, application unique, préconditions et révisions |
| Persistance | Migrations, transactions interrompues, quota, exports et récupération |
| Synchronisation | Retards, pertes, duplications, conflit, ordre des opérations, identité et reconnexion |
| Navigateur | Démarrage, création/import, action, clavier, focus, aperçu/annulation, clôture/reprise |
| Visuel | Thèmes, densités, tailles d’écran, textes longs, états vides et charge |
| PWA | Installation préalable, rechargement hors ligne, SDK absent, mise à jour cohérente |

Les tests navigateur utilisent un adaptateur simulé, un émulateur ou un projet de test. Aucune recette automatisée n’écrit dans les données réelles du MJ. Garder `npm test` comme découverte automatique des tests unitaires et isoler les commandes de recette navigateur.

### Indicateurs de réussite

Mesurer les temps et manipulations après E01, puis comparer aux jalons suivants, avec le même scénario et sans télémétrie externe obligatoire.

| Parcours | Cible d’usage |
|---|---|
| Ouvrir une partie déjà installée hors ligne | Aucune connexion ni écran bloquant |
| Résoudre une attaque déjà préparée | Action/cible, jet saisi ou tiré, aperçu, application dans le même écran |
| Revenir sur une mauvaise cible | Une annulation, conservant les jets et restaurant exactement l’état |
| Consulter un mot-clé | Ouverture contextuelle et retour sans perte du brouillon |
| Lancer une rencontre enregistrée | Un aperçu de composition puis lancement ; aucune recréation des participants |
| Passer un tour avec effets | Une commande, effets annoncés, transition annulable |
| Reporter les blessures des PJ | Bilan explicite, sans modification des modèles de créatures |
| Saisir pendant une synchronisation | Aucun vol de focus, perte de caractère ou fermeture du panneau |

Objectifs de performance à mesurer sur le Mac cible : retour visuel immédiat des actions locales, aucune attente réseau avant interaction, absence de blocage perceptible pendant la saisie. Relever des mesures chiffrées avant de fixer un budget en millisecondes. Le gain de débit réseau ne justifie pas une perte de cohérence.

### Définition de terminé pour un lot

- Critères d’acceptation du lot satisfaits et preuves consignées.
- Tests ciblés réussis ; suite existante réussie sauf attentes explicitement remplacées avec justification.
- Aucun changement de règle implicite, aucune perte des anciennes sauvegardes et aucune promesse UI non implémentée.
- Recette navigateur requise dès qu’un parcours visible change ; vérification claire/sombre pour toute modification visuelle.
- `TESTS.md` et documentation actualisés au niveau nécessaire.
- Diff limité au lot, risques et dépendances restants indiqués. Pas de lot marqué terminé parce que les fichiers ont été créés.

## 9. Risques et mesures associées

| Risque | Réponse prévue |
|---|---|
| Une refonte UI masque les problèmes de fond | Livrer J1 avant E09 ; mesurer les parcours réels |
| Migration altérant les blessures ou les états | Copie originale, migration pure, rapport et validation avant remplacement |
| Annulation écrasant un changement distant | Révision, préconditions et frontière explicite à la réception d’un état externe |
| Requête rejouée appliquant deux fois les dégâts | IDs/numéros d’opération persistants et déduplication transactionnelle |
| Ancien client réécrivant le nouveau schéma | Chemin de protocole distinct et procédure de migration sans double synchronisation |
| Modèle de profil partagé entre plusieurs créatures | Exemplaires et clones indépendants ; report réservé aux personnages persistants |
| Automatisme de règle erroné ou incomplet | Registre de couverture, sources/exemples et arbitrage manuel visible |
| Trop d’alertes ou d’options | Rappels contextuels limités, paramètres avancés repliés, parcours simple par défaut |
| PWA mélangeant des fichiers de deux versions | Cache cohérent par version et activation différée |
| Accumulation des historiques et archives | Rétention bornée, suppression après écriture réussie, export et contrôle de taille |
| Import interprétant du texte comme code | Validation structurelle, contenu inerte et aperçu avant application |
| IA devenant un prérequis fragile | E17 local d’abord ; E17b optionnel et isolé |

## 10. Exécution et suivi

### Procédure par lot

1. Relire le lot et les contrats concernés ; reproduire le défaut ou établir le scénario de départ.
2. Noter les fichiers concernés et les migrations éventuelles avant modification.
3. Réaliser le plus petit changement livrable répondant aux critères.
4. Exécuter les tests adaptés, puis la recette visible et les scénarios de sauvegarde concernés.
5. Compléter le compte rendu et mettre à jour l’avancement avec les preuves.
6. Faire relire le lot avant de commencer un lot dépendant. Commits, publication et déploiement restent des étapes distinctes, selon les instructions de livraison en vigueur ; le présent plan ne les déclenche pas.

Ne pas réécrire l’application entière avant de pouvoir jouer à nouveau. Les dépendances de développement nécessaires à la recette peuvent être ajoutées avec leur commande documentée, sans dépendance d’exécution supplémentaire pour le site.

### Modèle de compte rendu

```text
Lot : E__ — titre
Statut : en cours / réalisé / partiel
Comportement livré :
Fichiers modifiés :
Migration ou changement de compatibilité :
Tests et scénarios réellement vérifiés :
Résultats / limites :
Écarts au plan et justification :
Travail restant avant validation :
```

### Démarrage concret

E01–E03 forment le périmètre livré de J1 ; E04 est réalisé et validé par le parent. E05 est ouvert avec ses scénarios de reprise et de migration en contrôle.
