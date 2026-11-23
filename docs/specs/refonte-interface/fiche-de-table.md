# Fiche de table · recette de la refonte de l'interface

Une page pour jouer avec la nouvelle interface à la table, sur localhost (1440 × 800 ou plus). Rien n'est publié tant que tu n'as pas donné ton feu vert. Détail des fonctions : [recette-fonctions.md](recette-fonctions.md) ; captures : `captures/apres-*.jpg`.

## Où est quoi (écran Jouer)

| Zone | Contenu |
|---|---|
| **Barre du haut** | Onglets, « Round N · au tour de … », **Jouer son tour maintenant**, **Tour suivant**, compteur **« N à décider »**, Temps de campagne, Événements / Jauges, Rappels, Terminer le combat, ↶, ⋯ (sauvegardes, versions, importer, fiches, thème, recommencer). |
| **Frise** (en haut) | Un portrait par combattant dans l'ordre du round : tour en cours mis en avant, « a joué » atténué, morts grisés, Élan, monture, marque de décision. |
| **Acteur** (gauche) | Celui qui agit : PV ±, caractéristiques, PA, Élan, Chance, Destin, États, monture. Le reste (fiche complète, sorts et prières, retirer, renommer, camp, modifier) est dans son **⋯**. |
| **Centre** | Les **mêlées en cartouches**, puis la **résolution** (action, cible, jets, résultat, bouton « autres… » pour les circonstances). Magie, prières et corruption : bouton « Sort, prière, Corruption… ». |
| **Droite** | La case **« À décider »** (toujours visible), puis la fiche de la **cible**. |
| **Bas** | La **barre d'actions** (Attaquer, Charger, Tirer, Viser, Fuir, Se désengager, Se déplacer, Autres actions) et les onglets **Règles · Profils · Journal**. |

Ailleurs : séquelles, maladies, convalescence et calendrier sont dans **Campagne** (même pour un absent). Préparer, Campagne et Bibliothèque ne défilent plus : seules les longues listes défilent dans leur case.

## Les gestes nouveaux

- **Frise** : clic sur un portrait = ce combattant **agit** (réaction, action gratuite). Le tour ne bouge pas, la cible non plus ; le haut affiche « agit hors de son tour ».
- **Cartouches** : clic sur un cartouche des mêlées = **choisir la cible**. Le menu « Déplacer… » du cartouche engage, libère, encercle, place en position haute ou à couvert.
- **« À décider »** : chaque décision arrive là dès qu'elle naît, avec une marque sur la frise. Mort subite : **Mort · Inconscient · Plus tard · Pas un figurant**, un clic. Rien ne bloque « Tour suivant » ; une décision non tranchée reste dans la case.
- **Ligne Distance** (tir) : Au contact, Bout portant, Courte, Moyenne, Longue, Extrême, préremplie par le plateau et la carte, modifiable d'un clic. Les circonstances connues sont des puces à forcer ou retirer ; « autres… » ne propose que ce qui s'applique.
- **Jouer son tour maintenant** : depuis la frise ou le haut ; le combattant joue tout de suite, puis « Tour suivant » revient à celui qui devait jouer. Marqué « a joué », il ne rejoue pas à sa place. **Annuler** (↶) rétablit tout. Grisé, avec la raison, s'il a déjà joué dans ce round.
- **Charger** : choisis la cible, puis « Charger » dans la barre du bas, pour tout ennemi non engagé. Si l'acteur est engagé ailleurs : « interdit : déjà engagé (p. 163) », un clic force.
- **Lancer une rencontre** (Préparer) fait entrer tout le monde ; l'initiative se saisit au centre de l'écran.
- **Chance, Destin, Temps de campagne** s'ouvrent sans bloquer le reste. Seule la confirmation de « Terminer le combat » bloque.

## À juger à la table

1. **Effets de début de tour de celui qui joue en avance.** Ils se déclenchent quand il joue maintenant, et **pas une seconde fois** à sa place normale ; celui qui reprend ne rejoue pas son début de tour. À voir : est-ce bien ce que tu attends (régénération, effets d'État, miracles de début de tour) ? Et le cas d'un combattant dont le tour est interrompu : sa fin de tour se comporte-t-elle comme avant ?
2. **Le panneau Magie cache les mêlées pendant un sort.** Quand tu ouvres Incantation (ou Focalisation, Dissipation, Prière), le panneau prend la place des cartouches : tu ne vois plus les mêlées tant qu'il est ouvert (« Fermer » les rend). Est-ce gênant pour choisir une cible ou voir qui est engagé en lançant un sort ? Sinon, faut-il les garder visibles ?

Autres points à regarder si tu en as l'occasion : la barre du haut coupe « Round N · au tour de … » quand « Jouer son tour maintenant » ou « N à décider » s'y ajoutent ; lisibilité de la police système ; temps pour trancher une mort subite ; un combat à 20 combattants sans jamais faire défiler.

## Liaison avec la carte : tour de jeu

Outil connecté à la carte : les deux servis par le même serveur local (même origine), la carte depuis sa branche `tour-de-jeu-turnreset` (lot C1). La liaison est en **version 2** des deux côtés ; si un seul côté l'est, l'indicateur affiche « versions de liaison différentes » et rien ne passe : recharge les deux onglets. Combat lancé, au moins deux PJ liés posés sur la carte et un ennemi.

1. **Donne le tour à un PJ** : lui seul se sélectionne et se déplace sur la tablette ; toucher un autre PJ ouvre un encart en lecture seule, sans rien publier.
2. **Avance de deux cases, ouvre une porte par son bouton, repars** : la zone disponible vaut le **reste** du mouvement, pas le budget entier, et le palier de Course a reculé d'autant.
3. Vérifie qu'un **PJ non lié** à l'outil n'est jamais bridé par le tour.
4. **Passe le tour à un ennemi** (« Tour suivant ») : plus aucun PJ ne bouge, et les boutons de porte des PJ sont grisés.
5. **Annule le mouvement du tour** sur la tablette : le pion revient à sa case de départ sur **les deux écrans**, le brouillard déjà exploré **ne régresse pas**, et une porte ouverte en route **reste ouverte**.
6. **Ferme l'outil** : au bout de 15 s, la table retrouve sa liberté entière.
7. **Recharge la tablette (F5) en cours de tour** : elle retrouve le tour et le mouvement déjà consommé.
8. **« Jouer son tour maintenant » puis Annuler (↶)** : le PJ jouable sur la tablette suit, celui qui joue en avance, puis de nouveau celui qui devait jouer.
9. **Un PJ court** (Course proposée dans « À décider », clique « Action utilisée ») **puis annule son mouvement sur la tablette** : l'Action revient dans l'outil (toast « mouvement annulé sur la carte (Action rendue…) ») ; ↶ la redépense. S'il court deux fois dans le même tour, une seule question et une seule Action ; une question laissée sans réponse disparaît au « Tour suivant ».

Laissé tel quel par ta décision du 22/11 : pendant le tour d'un **ennemi qui n'est pas posé sur la carte**, l'outil envoie « personne » (`null`) et les PJ peuvent bouger.

## Passe G · corrections de ta recette du 22/11 (à refaire à la table)

Un geste par retour. Liaison en **version 3** (point d'impact) : outil et carte doivent être de la même version, sinon « versions de liaison différentes » (recharge les deux onglets). Rien n'est publié sans ton feu vert.

| Retour | Geste à refaire | Attendu |
|---|---|---|
| **R1** ligne « Action » en double | Choisis un combattant, regarde la case de résolution. | Plus de puces d'action dans la résolution : l'action se choisit dans la barre du bas. « Test… », « Sort, prière, Corruption… » et « Actions du Tour… » restent. |
| **R2** « Taille : pièce ou bouclier touché requis » | Un PNJ à la hallebarde (Taille (arme), p. 304) touche un PJ en armure ; calcule. | « Appliquer » est actif, la pièce de plus fort PA est précochée (liste limitée aux pièces de la localisation) ; l'armure perd 1 PA. Le libellé dit « Taille (arme) ». |
| **R3** Vigilance hors surprise | Saisis l'initiative en déclarant un camp surpris, avec un PJ qui a le talent Vigilance. | Colonne « Vigilance » pour les seuls surpris qui ont le talent (Perception Challenging, p. 116) ; réussi = pas Surpris. « Surprise : aucune / camp … surpris » visible en tête. Hors surprise, aucune Vigilance proposée. |
| **R4** pas d'attaque gratuite quand un engagé part | « Déplacer… » un engagé vers Libre. | Une décision « X quitte la mêlée de Y » : Se désengager, Fuir (attaque gratuite de chaque adversaire, Brisé, p. 163) ou Sans règle. Ne bloque pas « Tour suivant ». |
| **R5** « Tour suivant » refusé | « Tour suivant » avec un rappel « Fin du tour de … » en attente. | Le tour passe (test de non-régression ; la cause était la connexion IndexedDB, réglée en 0aa34eb8). |
| **R6** « Enregistrement local » en échec | Une série d'actions de combat, un rechargement. | Plus d'échec d'enregistrement (réglé en 0aa34eb8). |
| **R7** « corrigez les données » en boucle | Appliquer l'initiative quand l'enregistrement échoue. | Le message dit « Enregistrement local impossible, réessayez » ; une vraie erreur de données garde son message. |
| **R8** PJ hors tour déplaçables (carte) | Donne le tour à un PJ, essaie d'en déplacer un autre sur la tablette. | Non reproduit le 22/11 (sans doute la panne d'enregistrement). À revérifier ; si ça revient, lot C2 (en réserve). |
| **R9** ennemi non détecté dans la torche d'un PJ | Torche posée par le panneau de la carte ; un ennemi finit son mouvement dans la lumière. | Lot C3 (carte) : un ennemi est vu sur **toute la portée** d'une lumière, et un grand pion **dès qu'une case de son emprise** l'est. |
| **R10** vision dans le noir « à 1 » | PJ avec le talent Vision nocturne, lié à la carte. | `visionDim` 10 (Vision dans le noir : 20, rien : 1), p. 123 et 360. |
| **R11** « Autres actions » sans effet | Barre du bas → « Autres actions », au tour d'un PNJ qui ne sait faire que de la magie. | Le menu sort, prière et Test s'ouvre, le focus est sur sa première entrée. |
| **R12** « Charger » sans effet | Choisis une cible non engagée, « Charger ». | Une puce « Charge » active apparaît dans la résolution, le bouton est enfoncé ; un second clic (puce ou bouton) retire la charge. |
| **R13** « Petit : catégories de Taille explicites requises » | Attaque d'un Petit (ou contre un Petit) sans rien choisir. | Les Tailles connues (Trait, champ, espèce) sont lues ; plus de blocage. Une Taille seulement supposée donne un rappel non bloquant. |
| **R14** esquive contre un tir | Tir sur une cible à moins / à plus de BI m, avec et sans carte, avec et sans bouclier de 2 PA. | Puce « Esquive permise : 3 m ≤ BI 4 » ou « Esquive interdite : 9 m > BI 4 » (p. 165), forçable d'un clic. Sans droit : Test non opposé, « Appliquer » actif après le seul jet de tir (p. 164). Sans carte ni bouclier : une ligne « Esquive permise si le tireur est à N m ou moins » avec Oui / Non. La ligne Distance dit « Courte · 12 m · carte ». |
| **R15** magie trop grande | Un PNJ lanceur lance un sort. | Sort, cibles, d100, dés réclamés, « Appliquer » ; tout le reste sous un seul repli « Options ». |
| **R16** case vide comme cible de zone | Sort de zone : « Point d'impact », puis « Choisir sur la carte » (carte connectée). | Une seule demande part ; un clic sur une case précoche les combattants actifs dans le rayon, tu décoches. Sans carte : rayon en mètres, liste à cocher, rien de précoché. Annuler, fermer ou changer de sort annule la demande. **Le point d'impact se choisit sur l'écran MJ de la carte** (lot C4). |
| **R17** miracles : quatre questions par cible | Miracle « Soleil flamboyant » sur trois cibles. | Une ligne par cible, faits en cases précochées à « oui ». « Allié du prêtre » se déduit du camp ; Allié, Mort-vivant, Serviteur de la Ruine et 0 Blessure sont déduits de la fiche. |
| **f4-tirer / g-distance / f5-armure** | Tir ; coiffe de maille seule. | Écran de tir réduit (voir ci-dessous) ; ligne Distance lisible ; coiffe de maille « 2* » avec infobulle « Partielle : ignorée sur une localisation paire » (p. 306). |

### Limites connues de la passe G (à juger, rien de caché)

- **Écran de tir sans carte** : G2 ne l'a pas allégé (24 contrôles visibles au lieu de 22 avant) ; avec la carte, 19 à 23 selon la distance.
- **Vigilance sans effet en combat** (G6) : le bouton Vigilance de « combat-aware » reste proposé à un Surpris mais le moteur refuse toute action d'un Surpris. Une case texte « Identifiant de la Surprise » subsiste dans `js/ui/v5-talent-situations.js` (celle de la saisie d'initiative, elle, est générée).
- **Désengagement abandonné** (G7) : si tu fermes le formulaire de désengagement sans l'appliquer, le combattant **reste engagé**.
- **Carte, C3** : un ennemi est vu sur toute la portée d'une lumière, et un grand pion dès qu'une case de son emprise l'est.
- **Carte, C4** : le point d'impact se choisit sur l'écran MJ (pas sur la tablette, qui n'en voit que le gabarit).
- **Copies de la liaison** : le test « copies réelles » de `donnees-communes` reste rouge jusqu'à la publication conjointe (copies de la carte et des fiches en version 3) : attendu.

## Si quelque chose manque

Note le geste voulu et l'écran : le relevé de départ est [fonctions-jouer.md](fonctions-jouer.md). Publication seulement après ton feu vert et la suite unitaire verte.
