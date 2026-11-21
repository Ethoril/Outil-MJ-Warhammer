# Spec · Refonte de l'interface (écran de combat d'abord)

21/11/2026. **Cadrage validé par le MJ le 21/11/2026** (maquette A et spec telles quelles ; publication en une fois après E6). Plan : [plan.md](plan.md) · Tâches : [tasks.md](tasks.md).
Inventaire de la 3.56.0 : [inventaire.md](inventaire.md) (captures) · relevé des fonctions de l'espace Jouer : [fonctions-jouer.md](fonctions-jouer.md) · maquette retenue : [maquette.html](maquette.html), parti pris A (en ligne : <https://claude.ai/artifact/2oCodrCDXsKERwhDh5nU6y>).

## 1. Pourquoi

Après un vrai combat, le MJ constate que l'outil ralentit le jeu : la page de combat fait 3 500 px de haut pour 800 visibles, la résolution commence deux écrans sous le plateau, les décisions attendues (« mort ou inconscient ? ») s'affichent hors de vue, la police gothique se lit mal, le tir à bout portant est pénible. Il veut une interface pensée comme un jeu vidéo, tenant sur l'écran de son MacBook Air M1, sans rien perdre de ce que le moteur sait faire.

## 2. Décisions du MJ (21/11)

- Parti pris **A · Barre d'actions** : frise d'initiative en haut ; à gauche celui qui agit ; au centre les mêlées (cartouches) et la résolution ; à droite la case « À décider » puis la cible ; en bas la barre d'actions et les onglets.
- **Clic sur la frise = choisir qui agit**, même hors de son tour ; **clic sur un cartouche des mêlées = choisir la cible**.
- Bout portant **gardé, simplifié** (une ligne « Distance »).
- Une décision en attente **ne bloque pas** « Tour suivant ».
- **Police système** (San Francisco sur le Mac, Segoe UI sous Windows).
- **Pas de raccourci clavier d'action** : les touches 1 à 4 gardent les espaces.
- Les autres espaces suivent la même règle, **dans des lots après le combat**.
- Écrans visés : Mac et PC, fenêtre de 1440 × 800 et plus ; pas de téléphone ni de tablette.
- Taille de référence : **20 combattants actifs**.

## 3. Scénarios et critères d'acceptation

Rencontre de référence (R20) : la rencontre d'essai de l'inventaire (4 PJ dont un monté, un prêtre allié, un chamane, un bestigor, 2 Gor, 2 Ungor, un cheval) complétée à 20 combattants actifs avec des profils du bestiaire. Fenêtre de 1440 × 800.

### S1 · Tout tient à l'écran
- **CA1** Sur R20, à chaque étape du parcours de combat — lancer la rencontre, saisir l'initiative, attaque de mêlée, tir, tir au contact, sort, prière, dégâts avec critique, décision à 0 PV, retrait d'un participant, Tour suivant, changement de round, Terminer le combat — la page ne défile ni verticalement ni horizontalement.
- **CA2** Sur R20, aucune zone de l'écran de combat ne défile (frise, mêlées, fiches, résolution, case « À décider », barre d'actions). Au-delà de 20 combattants, seules la frise et les mêlées défilent dans leur case. Les onglets Règles et Journal, faits pour la lecture, défilent dans leur case.
- **CA3** Les panneaux qui s'ouvrent pendant le combat (circonstances, fiche complète, menu ⋯, liste des sorts et prières) tiennent dans la fenêtre, sans défilement, pour les étapes de CA1.

### S2 · Frise d'initiative
- **CA4** La frise montre tous les combattants actifs dans l'ordre du round : celui dont c'est le tour mis en avant, ceux qui ont joué atténués, les morts grisés ; sur chaque portrait : rang, PV, Élan, monture, marque « décision en attente ».
- **CA5** Un clic sur un portrait fait de ce combattant celui qui agit (fiche de gauche et barre d'actions), sans changer le tour en cours ; le bandeau l'indique (« agit hors de son tour ») ; « Tour suivant » reprend l'ordre.
- **CA6** La cible se choisit par un clic sur son cartouche dans les mêlées ; un clic sur la frise ne change jamais la cible.

### S3 · Les demandes apparaissent à la vue du MJ
- **CA7** Chaque décision attendue du MJ (les 26 du relevé, §A) apparaît, dès qu'elle naît, dans la case fixe « À décider », toujours visible ; le nombre de décisions en attente s'affiche dans la barre du haut et une marque sur le portrait concerné.
- **CA8** Mort subite d'un figurant à 0 PV : « Mort », « Inconscient », « Plus tard », « Pas un figurant », chacun en un clic, sans case à cocher préalable.
- **CA9** Aucune décision ne bloque « Tour suivant » ; une décision non tranchée reste dans la case jusqu'à ce que le MJ la tranche.
- **CA10** Pendant le combat, aucune fenêtre n'empêche d'agir ailleurs, sauf la confirmation de « Terminer le combat » ; aucune boîte native.

### S4 · Démarrer un combat
- **CA11** Lancer une rencontre fait entrer tous ses combattants d'un geste ; le banc reste disponible pour les renforts.
- **CA12** L'initiative se saisit dans la case centrale : dés des PJ, Combat instinctif, égalités, camp surpris, et pour chaque PJ monté « monté » ou « sans monture ». La liste suit toute entrée ou tout retrait de combattant sans fermer ni rouvrir quoi que ce soit (constat B1).

### S5 · Tir : une seule ligne « Distance »
- **CA13** Pour une attaque à distance, une ligne « Distance » propose Au contact, Bout portant, Courte, Moyenne, Longue, Extrême, préremplie par le plateau (engagements) et la carte (distance), modifiable d'un clic ; la case « Tir à bout portant » en double disparaît.
- **CA14** « Au contact » donne le même résultat qu'aujourd'hui pour une cible engagée avec le tireur (mêlée opposée, sans modificateur de portée, restriction au pistolet quand elle s'applique). « Bout portant » est grisé, avec la raison, pour une arme sans bout portant.
- **CA15** Tir sur une cible engagée avec d'autres : le Désavantage s'applique ; les engagés viennent du plateau ; le d100 de déviation n'est demandé, dans le pied de la résolution, que si le Désavantage fait rater un tir qui aurait touché.

### S6 · Rien de perdu, rien de changé dans les règles
- **CA16** Chaque fonction du relevé ([fonctions-jouer.md](fonctions-jouer.md), sections 1 à 10) reste accessible depuis l'écran de combat, en deux clics au plus.
- **CA17** Pour les mêmes saisies, chaque résolution donne le même résultat qu'en 3.56.0 ; les tests unitaires existants passent sans modification de leurs attentes de règles.
- **CA18** Sauvegardes, synchronisation, fiches des PJ et liaison carte inchangées : aucune migration, aucun message de liaison modifié.
- **CA19** Ajouts de la 3.56.0 repris : retrait d'un participant (avec ou sans sa monture, annulable) et « sans monture pour la rencontre » dans le menu ⋯ de la fiche et du cartouche ; Élan visible sur la frise et sur les fiches.
- **CA20** Séquelles, convalescence et calendrier quittent l'écran de combat : ils restent accessibles à la fin du combat et dans l'espace Campagne.

### S7 · Apparence
- **CA21** Police système partout, titres compris ; aucune police décorative chargée ; thèmes clair et sombre conservés ; contrastes de texte au moins AA.
- **CA22** Les raccourcis existants fonctionnent comme avant ; aucun nouveau raccourci d'action.

### S8 · Les autres espaces (lots après le combat)
- **CA23** Préparer, Campagne et Bibliothèque ne défilent pas à 1440 × 800 ; une liste longue (réserve, bestiaire, règles, suivis) défile dans sa case.

## 4. Hors périmètre
- Téléphone et tablette.
- Toute modification des règles appliquées par le moteur.
- La carte (Map Display) : aucun changement dans son dépôt.
- Multi-jeux : la frise et la case « À décider » restent dans le module Warhammer ; elles ne remontent pas dans le chapeau avant qu'un second jeu en ait besoin (spec multi-jeux §1).
- Le tour propre d'une monture et le tour d'un combattant à 0 PV restent tels que le moteur les calcule (constat B6) : la frise les montre.
