# Spec · Images des pions depuis la bibliothèque de Map Display

Cadrage du 13/11/2026, sur `42d6965` (prod 3.47.1). Origine : [docs/CONSTAT_IMAGES_PIONS.md](../../CONSTAT_IMAGES_PIONS.md) (12/11).

**Pourquoi.** L'image d'un pion n'existe aujourd'hui que si le MJ l'importe à la main sur un profil de réserve, réduite à 24 Kio. Or le MJ constitue une bibliothèque de 120 images de qualité dans Map Display (`maps/tokens/`), dont 98 dépassent ce plafond. Il veut que les créatures du bestiaire arrivent sur la carte avec leur image sans rien faire, et pouvoir donner une image de la bibliothèque à n'importe quel profil, sans plafond de 24 Kio.

## Décisions du MJ (13/11/2026)

| # | Question | Décision |
|---|---|---|
| Q1 | Image choisie par le MJ contre image automatique | **Le choix du MJ l'emporte** (image importée ou image choisie dans la bibliothèque) ; l'image automatique du bestiaire n'est qu'une valeur par défaut. |
| Q2 | Versionnement des 120 images (non suivies par git) | **Le MJ, plus tard.** Le chantier se développe et se recette en local ; la publication attend. Un contrôle automatique bloque tant qu'une image liée manque. |
| Q3 | Formes bestiales | **Dans ce chantier, en dernier lot.** `<bête>-bete` = Forme bestiale du Vent des Bêtes ; `<bête>-vie` = Forme bestiale du Vent de Jade. |
| Q4 | Appariement images ↔ profils | **Claude propose tout** (exacts, approchés, recherche par noms anglais), **le MJ relit** la table finale. |
| Q5 | PNJ de campagne et correction d'un appariement | **Sélecteur d'image de la bibliothèque** sur tout profil de réserve. |
| Q6 | Destriers nommés | **Choix manuel sur la monture** : image du profil de bestiaire d'office, remplaçable par le sélecteur. |

## Vocabulaire

- **Image importée** : fichier choisi par le MJ sur son disque, réduit à 24 Kio (existant, inchangé).
- **Image de bibliothèque** : une image de `maps/tokens/` de Map Display.
- **Image automatique** : l'image de bibliothèque associée d'avance à un profil du bestiaire par la table d'appariement.
- **Image choisie** : l'image de bibliothèque que le MJ a désignée lui-même sur un profil ou une monture.

## Scénarios et critères d'acceptation

### S1 — Une créature du bestiaire arrive sur la carte avec son image

- **CA1.** Étant donné un profil de réserve copié d'un profil du bestiaire apparié (ex. Loup), sans image du MJ, quand il participe à une rencontre liée à la carte, alors son pion affiche l'image automatique.
- **CA2.** Cela vaut pour un profil copié **avant** ce chantier, sans action du MJ sur ce profil.
- **CA3.** Un profil du bestiaire non apparié, sans image du MJ, donne un pion sans image, comme aujourd'hui.
- **CA4.** Une créature présente dans deux livres reçoit la même image dans ses deux profils, sauf décision contraire dans la table.
- **CA5.** Une image de bibliothèque de plus de 24 Kio s'affiche sur la carte, et ne pèse pas dans la sauvegarde de la campagne de la carte (seule sa référence y figure).

### S2 — Le MJ choisit une image de la bibliothèque

- **CA6.** Sur l'édition d'un profil de réserve (issu du bestiaire ou non), le MJ peut choisir une image parmi celles de la bibliothèque, par recherche sur le nom, avec vignette.
- **CA7.** L'image choisie part vers la carte à la place de l'image automatique.
- **CA8.** Image importée et image choisie s'excluent : en prendre une retire l'autre. Retirer l'image du MJ fait revenir l'image automatique s'il y en a une.
- **CA9.** Un profil dont l'image est importée (existant) continue de l'envoyer telle quelle ; l'import à la main reste disponible et plafonné à 24 Kio.
- **CA10.** L'image choisie survit à une sauvegarde/restauration et à l'export/import JSON d'un profil.
- **CA11.** Si la bibliothèque est injoignable (Map Display absent), le sélecteur reste utilisable par les noms, sans vignettes, et le reste de l'édition du profil fonctionne.

### S3 — Le MJ voit l'image dans l'outil

- **CA12.** La liste de la réserve et l'édition d'un profil montrent la vignette de l'image qui partira vers la carte, quelle que soit sa provenance, et distinguent « automatique » d'un choix du MJ.
- **CA13.** Une image de bibliothèque introuvable n'affiche pas d'icône cassée dans l'outil : la vignette est absente.

### S4 — Montures

- **CA14.** Une monture issue du bestiaire et appariée (ex. Destrier) envoie son image automatique pour le pion fusionné cavalier + monture, là où l'outil envoie déjà une image de monture.
- **CA15.** Le MJ peut choisir pour la monture d'un profil une image de la bibliothèque (ex. un destrier nommé) ; elle l'emporte sur l'automatique.

### S5 — PJ

- **CA16.** Un PJ continue de ne pas envoyer d'image : la carte garde la sienne (hors Forme bestiale, S6).

### S6 — Formes bestiales (dernier lot)

- **CA17.** Quand un personnage prend une Forme bestiale, son pion affiche l'image de la bête dans la variante du sort lancé : `-bete` pour le Vent des Bêtes, `-vie` pour le Vent de Jade. Cela vaut pour un PJ.
- **CA18.** Au retour à la forme normale, le pion retrouve l'image qu'il avait avant la transformation, y compris celle qu'un PJ tient de la carte.
- **CA19.** Une bête sans image de forme laisse le pion inchangé pendant la transformation.

### S7 — Table d'appariement

- **CA20.** La table est produite par une commande déterministe à partir d'un fichier relu par le MJ ; relancer la commande sans changement ne modifie rien.
- **CA21.** Le MJ reçoit pour relecture un tableau : chaque image, le ou les profils proposés (nom français, livre, page), le degré de confiance (exact, approché, par nom anglais, aucun), et pour les PJ, PNJ et destriers nommés la mention « pas un profil du bestiaire ».
- **CA22.** Une image peut servir plusieurs profils ; un profil n'a qu'une image automatique.

### S8 — Garde-fous de publication

- **CA23.** Un contrôle automatique échoue si la table ou le catalogue de la bibliothèque désigne une image absente du dépôt de la carte tel qu'il sera publié. Tant que le MJ n'a pas versionné les images, ce contrôle échoue et la publication n'a pas lieu.
- **CA24.** En séance, une image de bibliothèque absente n'empêche ni l'envoi de l'état ni l'affichage du pion : il apparaît sans image.
- **CA25.** Le contrat de liaison entre l'outil et la carte décrit la nouvelle forme d'image admise ; ses deux copies (outil, carte) restent identiques.

### S9 — Illustrations à créer (ajout du MJ, 13/11/2026)

- **CA26.** Le MJ reçoit la liste des illustrations qui manquent à la bibliothèque, classée par dossiers (les catégories de `maps/tokens/` : `bestiaire`, `ennemis/<faction>`, `monstres`, `destriers`, `bestiaire/forme-bestiale`…), pour les faire créer. Chaque entrée donne le nom de fichier proposé (celui qui s'appariera tout seul), le nom français, le nom anglais, les livres et pages, et le nombre de profils couverts. Une créature présente dans plusieurs livres n'y figure qu'une fois.
- **CA27.** La liste est produite par une commande déterministe à partir du bestiaire et de la table ; la relancer après l'ajout d'images la met à jour. Les individus nommés (PNJ des scénarios) sont séparés des créatures génériques ; les bêtes de Forme bestiale sans image et les monstres de l'autre sort de transformation y figurent dans leur dossier.

### S10 — Profils des images sans profil (ajout du MJ, 13/11/2026)

- **CA28.** Chaque image de la bibliothèque qui représente une créature ou un PNJ et n'a aucun profil du bestiaire (hors PJ, formes bestiales et destriers nommés, qui relèvent de Q6) reçoit un profil, apparié à l'image ; à défaut elle figure dans une liste de questions posées au MJ, avec ce qui manque.
- **CA29.** Un profil créé ne contient que des valeurs imprimées dans un livre du corpus (livre et page cités) ou données par le MJ. Rien n'est inventé ni extrapolé.
- **CA30.** Les profils créés passent par la chaîne existante du bestiaire (extraction, corrections relues, vérification des caractéristiques), apparaissent dans la Bibliothèque de bestiaire et se copient en réserve comme les autres.

### S11 — Bestiaire en dossiers (ajout du MJ, 13/11/2026)

- **CA31.** La Bibliothèque de bestiaire de l'outil se parcourt par dossiers, les mêmes que ceux de la bibliothèque d'images (`bestiaire`, `ennemis` › faction, `monstres`, `destriers`, PNJ nommés par livre) : ouvrir un dossier montre ses sous-dossiers et ses profils, avec leur nombre ; un fil d'Ariane permet de remonter.
- **CA32.** La recherche par nom et les filtres existants (livre, genre, mot-clé) restent disponibles et portent sur le dossier ouvert ; depuis la racine, sur tout le bestiaire.
- **CA33.** Chaque profil est dans un seul dossier, d'après le classement unique relu par le MJ (celui de CA26). Un profil sans classement apparaît dans « À classer » au lieu de disparaître.
- **CA34.** La navigation par dossiers se fait au clavier et porte des noms accessibles ; le parcours d'accessibilité existant reste vert.

### S12 — Livres ajoutés au corpus (ajout du MJ, 13/11/2026)

- **CA35.** Tous les profils de PNJ d'*Ennemi Intérieur 3 — Le Pouvoir derrière le Trône* entrent au bestiaire par la chaîne existante (valeurs imprimées, livre et page), sont classés en dossiers et figurent dans la liste des illustrations à créer tant qu'ils n'ont pas d'image.
- **CA36.** Tous les profils du *Tome de la Corruption* et du *Seigneur liche* (V2) entrent au bestiaire convertis en V5 par la même règle que les profils V2 déjà convertis (montures, L27) ; chaque profil garde la trace de sa source V2 (livre, page) et de la conversion. Le profil secondaire V2 se lit ainsi : A attaques par round, B blessures, BF, BE, M mouvement, PD points de destin ; Mag et PF sont ignorés.
- **CA37.** Les variantes de troupe illustrées sans profil imprimé (Gobelin archer, Ogre crache-plomb, Orc kostaud) reçoivent un profil maison : caractéristiques du profil de base, armes adaptées, marqué décision du MJ. Capitaine vampire pirate et Zombie flibustier : profils maison copiés du Vampire et du Zombie de L06.
- **CA38.** La bibliothèque d'images grossit pendant le chantier (274 images le 13/11 après-midi) : la table et la liste se régénèrent au fil de l'eau, sans nombre d'images figé dans la spec.

### S13 — Décisions du MJ du 14/11/2026

- **Appariement reporté.** La création d'images est encore en cours : associer les images nouvelles aux profils n'est pas urgent et se fait en une passe finale, bibliothèque stabilisée, après tout le reste. D'ici là on crée les profils et on les classe ; la table suit ce que l'outil d'images du MJ régénère.
- **Conversion V2 → V5** (CA36), réponses aux questions Q13 à Q19 de `questions-profils.md` : Taille de la même créature V4/V5 sinon proposée et validée, Blessures par la formule V5 étendue à Énorme et Monstrueuse ; Dex = Ag et I = Ag ; toute valeur à 0 % ou « — » absente (Soc 0 → 10 réservé aux animaux) ; armes V2 → armes V5 de même nom, armes naturelles en BF + n comme la créature V5 la plus proche (liste à valider) ; Vol de la créature V5 proche, sinon valeur entre parenthèses = Vol (n) ; table de correspondance des Traits pour les homonymes sûrs, le reste en règles spéciales imprimées ; ni carrières ni prétirés au bestiaire.
- **Main pourpre** : le Magus et sept profils individuels de cultistes (caractéristiques du bloc imprimé L28 p. 28), chacun avec son image. **Fils d'Ulric, Fausse Hydre** : pas de profil. **Profils maison** : armes validées.
- **CA39.** Un profil copié du bestiaire prend son nom français quand il existe, sinon le nom anglais ; la Bibliothèque de bestiaire affiche et trie par le nom français d'abord, et la recherche trouve toujours les deux noms.
- **CA40.** Prendre ou quitter une Forme bestiale n'est pas une blessure : la carte ne dessine pas de sang sur le pion à cette occasion.
- Le sélecteur propose toute la bibliothèque (formes et PJ compris) ; une créature ajoutée au combat sans passer par la réserve, ou invoquée, reçoit aussi son image automatique.

## Hors périmètre

- Relever le plafond de 24 Kio ou le cumul de 512 Kio par campagne des images embarquées.
- Versionner, renommer, déplacer, recadrer ou alléger les images de la bibliothèque (travail du MJ ; 5 fichiers dépassent 256 Kio).
- Images des PJ : la carte reste maîtresse (sauf S6).
- Changer l'image d'un pion déjà posé à la main sur la carte, hors liaison.
- Ajouter une image aux fiches du bestiaire consultées hors réserve.
- L'autre sort de transformation (Dragon, Géant, Griffon, Troll…) : pas de changement de pion tant que le MJ n'a pas fait d'images dédiées (décision du 13/11).
- Choix automatique d'un destrier selon l'origine du cavalier.
