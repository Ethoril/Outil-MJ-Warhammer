# Spec · Outil MJ multi-jeux (chapeau et modules de jeu)

18/11/2026. Cadrage seul : aucun lot n'est lancé avant la validation du MJ. Plan : [plan.md](plan.md) · Tâches : [tasks.md](tasks.md).
Exploration préalable : tag local `archive/maquette-cthulhu-18-11` (`docs/EXPLORATION_CTHULHU.md`, maquette et 51 tests).

## 1. Pourquoi

Le MJ veut mener d'autres jeux que Warhammer avec le même outil et la même carte (RPG Map Display). La décision est prise : un **chapeau** porte ce qui est commun (sauvegarde, historique, liaison carte, thème, messages), et **chaque jeu est un module séparé**, avec ses règles et son propre écran de combat. Pas d'écran de combat unique piloté par un contrat de règles. Les briques que les jeux partageront (suivi des tours, journal, écran de combat) remonteront dans le chapeau plus tard, quand deux jeux réels auront montré ce qu'elles ont en commun.

Jeux visés, et le MJ s'arrête là : Warhammer (l'outil actuel, en production), L'Appel de Cthulhu 7e (jeu léger), puis plus tard Imperium Maledictum et L'Ombre du Seigneur Démon.

## 2. Scénarios et critères d'acceptation

### S1 · Warhammer reste intact

Le MJ met à jour l'outil et retrouve Warhammer exactement comme avant : même adresse, mêmes données, même synchronisation, mêmes fiches.

- **CA1** Étant donné une sauvegarde locale Warhammer écrite par la 3.53.1 (rencontre, réserve, suivis, historique, points de restauration, file d'envoi), quand la nouvelle version démarre, alors l'état réhydraté est identique et aucune base, table ou clé de stockage existante n'est renommée, réécrite ni supprimée.
- **CA2** La synchronisation cloud de Warhammer garde son chemin, son numéro de schéma et ses règles Firebase : aucun déploiement de règles, aucune migration de schéma.
- **CA3** L'écriture vers les fiches (commande `outil-mj`, fonction `executeFicheCommand`) et la lecture des fiches ne changent pas : rien à redéployer, aucun changement dans le dépôt des fiches.
- **CA4** Tous les tests unitaires existants passent sans être modifiés, et les parcours navigateur « socle » aussi.
- **CA5** L'adresse de Warhammer, l'application installée et ses raccourcis ouvrent Warhammer comme avant (sous réserve de Q1).

### S2 · La liaison carte ne dépend plus des règles de Warhammer (lot 1, publiable seul)

- **CA6** La partie « protocole » de la liaison (canal, battement, instantané, ajout, mise à jour et retrait de pions, liste des PJ, engagements, montures, distances, Course) ne charge aucun module de règles de Warhammer : sa fermeture d'imports se limite aux constantes partagées de la liaison.
- **CA7** Pour Warhammer, la suite de messages envoyée à la carte est identique, message par message, avant et après le lot, sur un scénario qui couvre ajout, blessure, mort, monture, forme bestiale, Bond, engagements, PJ hors scène et retrait.
- **CA8** Un jeu fournit sa propre projection participant → pion. Trois projections d'essai passent par le même protocole sans erreur : une grille (portées en cases), une projection en Zones sans portée calculée (la carte garde la portée qu'on lui a saisie) et une projection sans points de vie (le pion n'affiche pas de PV).
- **CA9** Un marqueur d'état inconnu de la carte n'est jamais envoyé.
- **CA10** Rien ne change côté carte : ni son code, ni le contrat de liaison, ni sa version.
- **CA11** Le lot se publie seul : CA1 à CA4 et CA6 à CA10 vérifiés, recette carte réelle faite par le MJ (pions posés, PV, morts, monture, distance préremplie, Course).

### S3 · Choisir son jeu

- **CA12** Depuis Warhammer, le MJ voit la liste des jeux disponibles et ouvre Cthulhu en un clic ; depuis Cthulhu, il revient à Warhammer de même.
- **CA13** Tant qu'un seul jeu est publié, le sélecteur n'apparaît pas.
- **CA14** Comportement à l'ouverture de l'outil : selon la réponse à Q1.

### S4 · Une sauvegarde séparée par jeu

- **CA15** Une séance complète de Cthulhu (rencontre, annulation, rechargement, effacement) n'écrit, ne lit ni ne supprime aucune base ni clé de Warhammer, et inversement.
- **CA16** « Nouvelle rencontre », « Effacer » ou une restauration dans un jeu laissent les données de l'autre jeu intactes.
- **CA17** Chaque jeu exporte et réimporte sa sauvegarde en fichier ; un fichier d'un jeu est refusé par l'autre avec un message en français qui nomme le jeu.
- **CA18** Les noms de stockage de Warhammer sont figés par un test : toute modification le fait échouer.

### S5 · Mener une rencontre de L'Appel de Cthulhu 7e

- **CA19** Le MJ crée et modifie des investigateurs, des PNJ et des créatures (caractéristiques, compétences utiles au combat, armes, PV, SAN, Chance, PM) ; les investigateurs restent d'une rencontre à l'autre.
- **CA20** Il compose une rencontre et la joue : ordre par DEX (arme à feu prête comprise), tours, attaques de mêlée (Rendre les coups, Esquiver), surnombre, tirs (portées, couvert, mêlée), dégâts, armure, empalement, blessure grave, Mourant, mort, jets de SAN et folies, Chance, test redoublé, test libre.
- **CA21** Les dés sont saisis par le MJ ou tirés par l'outil, au choix mémorisé.
- **CA22** Chaque action s'annule et se rétablit ; la rencontre et le journal sont repris après rechargement.
- **CA23** Les 12 règles listées en Q8 sont appliquées comme le MJ les a tranchées, chacune couverte par un test.
- **CA24** La page de Cthulhu fonctionne hors ligne une fois chargée.

### S6 · Cthulhu sur la carte

- **CA25** Les pions de Cthulhu apparaissent sur la carte avec nom, camp, image, PV, mort et marqueurs, par la même liaison que Warhammer.
- **CA26** La page de Cthulhu ne charge aucun module de règles de Warhammer (la maquette en chargeait 109, 4,7 Mo).
- **CA27** Portée de déplacement et marqueurs propres à Cthulhu (Mourant, folies) : selon Q5 et Q6.

### S7 · Publication

- **CA28** Une seule version pour tout l'outil, écrite par `tools/bump-version.mjs` ; un seul service worker et un seul cache, qui couvrent tous les jeux.
- **CA29** Chaque publication suit la règle du dépôt : suite unitaire verte, feu vert du MJ, push sur `main`.

## 3. Hors périmètre

- Les modules Imperium Maledictum et L'Ombre du Seigneur Démon : seule leur compatibilité avec les points d'accroche du chapeau est vérifiée, sur le papier (plan, §6).
- Un écran de combat, un suivi des tours, des jauges ou un journal communs : chaque jeu garde les siens.
- Le partage de code de règles entre Warhammer et Imperium Maledictum (« famille d100 à DR ») : à décider au lot Imperium.
- Les fiches Firestore pour Cthulhu : les investigateurs vivent dans l'outil.
- Magie, poursuites et bestiaire étendu de Cthulhu ; un bestiaire de départ réduit suffit (Q9).
- Un changement du protocole de la carte, sauf le lot facultatif M1 (Q5).

## 4. Questions au MJ

Aucune ne bloque le lot 1. Chacune a une réponse recommandée, prise par défaut sans réponse contraire.

| # | Question | Réponse recommandée |
|---|---|---|
| Q1 | À l'ouverture de l'outil : (a) Warhammer comme aujourd'hui, et un menu « Jeu » pour changer ; (b) reprendre le dernier jeu utilisé ; (c) une page d'accueil de choix ? | (a) : l'adresse et l'application installée ne bougent pas. (b) s'ajoute plus tard sans risque. |
| Q2 | Déplacer physiquement les fichiers (Warhammer dans son dossier, modules communs dans `commun/`) ? | Non : le chapeau est une liste déclarée de modules, gardée par un test. Le déplacement toucherait 288 modules, 235 fichiers de test et 320 lignes du service worker, sans rien changer à l'usage. |
| Q3 | Synchronisation cloud (téléphone) pour Cthulhu dès le départ ? | Non : sauvegarde locale et fichier exporté. La synchronisation actuelle est liée au schéma de Warhammer ; l'ouvrir à un second jeu demande un nouveau chemin et un déploiement de règles Firebase. |
| Q4 | Version : une seule pour l'outil, ou une par jeu ? | Une seule (un service worker, un cache, un déploiement). Les notes de version disent quel jeu change. |
| Q5 | Ajouter à la carte des marqueurs propres à Cthulhu (Mourant, folie) ? | Pas au départ : Mourant part comme Inconscient, les folies ne partent pas. Lot M1 dans le dépôt de la carte si le manque se fait sentir. |
| Q6 | Envoyer le MVT de Cthulhu comme portée sur la carte ? | Non : la carte garde la portée saisie à la main. |
| Q7 | Nom de l'application installée : garder « WFRP MJ » ou passer à « Outil MJ » ? | « Outil MJ » au lot du chapeau. |
| Q8 | Les 12 règles de Cthulhu laissées ouvertes par la maquette (ci-dessous) | Le choix par défaut de la maquette, sauf avis contraire. |
| Q9 | Créatures de départ pour Cthulhu : lesquelles, et d'après quel livre ? | Celles de la maquette (cultiste, goule), le MJ ajoute les siennes avec le formulaire. |

**Q8, règles de Cthulhu à trancher** (détail dans `docs/EXPLORATION_CTHULHU.md` du tag ; défaut entre parenthèses) :
1. Maladresse sous 50 : valeur de la compétence ou seuil de la difficulté demandée ? (le seuil de la difficulté)
2. Chance sur les jets de combat et les tests opposés ? Achat d'une réussite Majeure ou Extrême ? Après un test redoublé ? (oui, oui, interdite)
3. 0 PV sans blessure grave : inconscient ? PNJ et créatures morts à 0 PV ? (oui, oui)
4. Égalité de DEX : la plus haute compétence de combat agit d'abord ? (oui)
5. Bout portant : DEX/5 pieds convertis en mètres, ou environ 2 m ? (la conversion ; DEX 60 donne 3,66 m)
6. Rendre les coups avec une réussite Extrême : empalement ? (oui)
7. Goule : caractéristiques, attaques par round, défenses avant le surnombre, SAN 1/1D6 ou 0/1D6, armes à feu à demi-dégâts ? (valeurs de travail, 1, 1, 1/1D6, demi-dégâts)
8. Folie passagère : déclenchée par un jet d'INT réussi ? (oui, comme le livre de base)
9. Maladresse au jet de SAN : perte maximale ? (oui)
10. Test opposé à égalité parfaite : relance ou statu quo ? (statu quo, sans vainqueur)
11. Folie persistante : 1/5 de la SAN du début de la journée ? (oui)
12. Arme à feu : ni Esquiver ni Rendre les coups, seulement plonger à couvert ? (aucune défense)
