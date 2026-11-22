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

## Si quelque chose manque

Note le geste voulu et l'écran : le relevé de départ est [fonctions-jouer.md](fonctions-jouer.md). Publication seulement après ton feu vert et la suite unitaire verte.
