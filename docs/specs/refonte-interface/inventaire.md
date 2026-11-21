# Refonte de l'interface · inventaire de l'existant (3.56.0)

21/11/2026. Outil lancé en local depuis ce worktree, fenêtre de 1440 × 800 (fenêtre utile d'un MacBook Air M1).
Rencontre de test tirée du bestiaire : 4 PJ pré-tirés (Erich, Jorunn, Lynathryn, Theodosius), Père Pedragar (prêtre de Taal, allié), un Cheval de selle monté par Lynathryn, une bande d'hommes-bêtes (Swilegrakk chamane-bray, Skrakk bestigor, 2 Gor, 2 Ungor). 12 participants.
Captures dans [captures/](captures/).

## Constat d'ensemble

| Mesure (espace Jouer, combat lancé) | Valeur |
|---|---|
| Hauteur de la page | **3 451 à 3 719 px** pour 800 visibles (4,5 écrans) |
| Hauteur de la colonne centrale | 3 000 px |
| Panneau latéral « Circonstances » | 3 923 px de contenu dans une zone de 583 px |
| Feuille « Démarrer le combat · Initiative » | 2 382 px de contenu dans 634 px |
| Avant le combat (12 combattants sur le banc) | page de 3 000 px |
| Polices | Alegreya (texte) et **Grenze Gotisch** (titres, noms) |

Ordre vertical actuel de la colonne centrale (y en px depuis le haut de la page) :

| y | Bloc | Hauteur |
|---|---|---|
| 143 | Plateau des mêlées (12 jetons, 6 par ligne) | 399 |
| 553 | « Ce qu'il peut faire d'ici » | 131 |
| 701 | **Décision attendue (mort subite)**, quand elle existe | 145 |
| 863 | Fiche « Au tour de » et fiche « Cible », côte à côte | 850 |
| **1 729** | **Résolution** : action et cible, jets, résultat | 980 |
| 2 725 | Prières divines… | 36 |
| 2 778 | Corruption | 57 |
| 2 853 | Suites de combat (séquelles, convalescence, calendrier) | 774 |
| 3 463 | Règles de table (dont « Mort subite des figurants ») | 57 |

À droite, à partir de y = 701 : panneau latéral à onglets (Règles, Profils, Circonstances, Journal), collant, défilant seul.

## Endroits où il faut faire défiler

- **D1. La résolution commence à y = 1 729.** Le cœur du travail du MJ (choisir l'action, saisir les dés, appliquer) n'est jamais visible en même temps que le plateau. À chaque tour : descendre de deux écrans, puis remonter pour voir les jetons. ([c04](captures/c04-combat-haut.jpg), [c06](captures/c06-resolution-1500.jpg))
- **D2. Fiches acteur et cible : 850 px chacune** (identité, rappels de Traits, PV, caractéristiques, silhouette des PA, Élan, Chance, Destin, États, sorts et prières, fiche complète). Elles poussent la résolution vers le bas. ([c05](captures/c05-fiches-750.jpg))
- **D3. Panneau « Circonstances » : 3 923 px** de cases et de listes (scène, surnombre, défense, fortune, talents, bouclier, létal, autres réglages) dans une zone de 583 px.
- **D4. Feuille d'initiative : 2 382 px** pour 12 combattants (un bloc par combattant avec I, dé, deux dés pour Combat instinctif), puis égalités, puis l'ordre calculé, tout en bas. ([c03](captures/c03-initiative-longue.jpg))
- **D5. Suites de combat dans l'écran de combat** : séquelles, convalescence, calendrier, entre-aventure (774 px) sous la résolution. Utile après le combat, pas pendant. ([c07](captures/c07-suites-2250.jpg))
- **D6. Magie, prières, corruption** : repliées sous la résolution (y ≈ 2 725), loin du bouton « Sort, prière, Corruption… » de l'étape 1.
- **D7. Plateau** : 12 jetons tiennent en 2 lignes ; au-delà de 18 combattants, une 4ᵉ ligne repousse tout le reste.

## Demandes qui s'affichent hors de vue

- **H1. Mort subite (« mort ou inconscient ? »)** : reproduit. Un Ungor tombe à 0 PV pendant que le MJ applique les dégâts dans la résolution (vue entre y = 1 700 et 2 500) ; le bandeau « Mort subite — décision attendue » apparaît à **y = 701**, au-dessus des fiches. Rien ne le signale dans la vue courante. ([c09](captures/c09-mort-subite-invisible.jpg) : ce que voit le MJ ; [c10](captures/c10-mort-subite-hors-vue.jpg) : le bandeau, deux écrans plus haut.) En plus, il faut cocher « Confirmer que c'est un PNJ secondaire » avant que les boutons « Choisir : mort / inconscient » s'activent.
- **H2. Le réglage qui fait naître cette demande** (« Mort subite des figurants ») est tout en bas, à y = 3 463.
- **H3. Les autres décisions en attente** (critiques mortels, choc d'amputation, seuils de corruption, mutation, Brisé, maladresse, déviation d'un tir dans la mêlée…) s'affichent chacune dans son bloc : liste complète et emplacements dans [fonctions-jouer.md](fonctions-jouer.md).
- **Bon point à garder** : le pied « Appliquer N dégâts à X » de la résolution est collant et dit ce qui manque (« À saisir avant d'appliquer : compléter le jet de critique », avec le d100 à côté). C'est le modèle à généraliser. ([c08](captures/c08-pied-appliquer.jpg))

## Blocages et frictions

- **B1. Feuille d'initiative figée** : ouverte avant l'entrée des combattants, elle garde « Aucun combattant actif » après les 12 « Faire entrer » ; « Calculer / actualiser l'ordre » n'y change rien. Il faut la fermer et la rouvrir. ([c02](captures/c02-initiative-fige.jpg))
- **B2. 12 clics « Faire entrer »**, un par combattant, avant de pouvoir commencer.
- **B3. La feuille d'initiative recouvre le plateau** (moitié droite de l'écran) et demande de faire défiler 2 382 px pour atteindre « Confirmer et appliquer ».
- **B4. Bout portant / tir au contact** : trois notions mêlées dans des cases séparées — la bande de portée « Bout portant » (sélecteur), une case « Tir à bout portant » (doublon), « La cible est engagée avec le tireur » (le tir devient une mêlée, Pistolet seulement), « La cible est engagée au corps à corps » (Désavantage, puis case à cocher par engagé et d100 de déviation), « Tir opposé par Esquive confirmé ». Le plateau en déduit une partie, mais le MJ doit relire les cases pour savoir laquelle s'applique.
- **B5. Choix de monture** : la liste « À pied / Monter sur… » propose aussi des humanoïdes (« Monter sur Père Pedragar »).
- **B6. Un participant à 0 PV sans décision prise garde son tour** dans l'ordre ; la monture d'un cavalier a aussi son propre tour. À confirmer avec les règles, à rendre lisible dans la frise.

## Ce qui marche et qu'on garde

- Bandeau de combat collant (round, à qui le tour, « Tour suivant »).
- Pied de résolution collant avec ce qui manque et le bouton d'application.
- Panneau latéral collant à onglets.
- Toasts en bas à droite, avec « Annuler ».
- Plateau des mêlées : numéro d'ordre, PV, BE, PA, engagements, monture, menu « Déplacer… ».
