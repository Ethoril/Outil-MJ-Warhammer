# Passation du 16/11/2026

À lire en entier avant d'agir : c'est court exprès. La fenêtre précédente était pleine ; celle-ci repart de ce document, de `CLAUDE.md` et de la mémoire du projet, et de rien d'autre.

## 1. État

| Dépôt | En production | Branche locale | À savoir |
|---|---|---|---|
| Outil MJ (`E:/Outil MJ Warhammer`) | 3.49.0, `main` `fdb6a46` | `main` seule | ce document est commité en local, pas poussé |
| Carte (`E:/rpg-map-display`) | `main` `0aaa812` | `main` seule | rien en attente |
| Fiches (`E:/Projet Warhammer Ennemi Intérieur/ennemi-interieur-wfrp4`) | v2.41.0, `master` `8f85c65` | `master` + `pro/suivi-de-cour` + `claude/donnees-communes` | `master` local a un commit d'avance, `6dc292f` (outil de notes privées du MJ pour les PNJ), écrit par une autre session : **ne pas le pousser sans demander**. `pro/suivi-de-cour` appartient aussi à une autre session. |

Publié les 15 et 16/11 : images des pions (3.48.0), petits restes (3.48.1), monture d'un PJ déclarée sur sa fiche (3.49.0 + fiches 2.41.0 + fonction `executeFicheCommand` redéployée). Détail dans `docs/SUIVI_EVOLUTION.md`, entrées 3.48.0 à 3.49.0.

## 2. Ce qui reste, dans l'ordre

Tout est décidé par le MJ ; rien n'est codé. Ne rien reproposer de ce qui est « classé » dans la mémoire `classement-restes-15-11`.

**A. Image du pion des PJ (nouveau, 16/11, à clarifier d'abord).** Sur le profil d'un PJ, l'outil affiche « Image du pion : image de la carte : un PJ n'envoie pas d'image ». Le MJ s'en étonne : pour lui, les PJ sont censés envoyer une image. Ce comportement vient d'une décision écrite du chantier images des pions : `docs/specs/images-pions/spec.md`, CA16 et « Hors périmètre : images des PJ, la carte reste maîtresse », et du contrat de liaison §6 (« PJ : l'outil n'envoie pas d'image », seule exception `formImageUrl`). Code : `js/ui/reserve.js` l. 31, `shownTokenImageOf` et `tokenImageOf` dans `js/core/token-image.js`, `tokenStateOf` dans `js/core/map-link-state.js`. Avant tout code, poser la question au MJ par sélecteur : qu'attend-il exactement ? Pistes à lui proposer : (a) l'image choisie dans l'outil pour un PJ part vers la carte comme pour un PNJ ; (b) l'outil montre l'image que la carte a déjà pour ce PJ, sans rien envoyer ; (c) seul le libellé est trompeur et doit être reformulé. Selon la réponse : petit lot sur les deux dépôts plus les deux copies du contrat.

**B. Poursuite selon le Livre de base V5.** Spec : `docs/specs/poursuite-v5/spec.md` (décisions D1 à D11). Avant le plan, deux points à lever par relecture du livre (R1, R2). Le texte a déjà été relu le 15/11, voici ce qu'il dit, pour ne pas payer deux fois la lecture :
- PDF : `E:/Projet Warhammer Ennemi Intérieur/tmp/catalogue-bibliotheque/pdfs/Livre de base V5 EN v3.pdf`, section « Pursuits », pages imprimées 158-159 (`pdftotext -f 150 -l 170`, chercher `Pursuits`). La v2 et la v3 sont identiques sur ce passage.
- Test de poursuite : le poursuivant au Mouvement le plus élevé contre le fuyard au Mouvement le plus bas, Test opposé, d'ordinaire Athlétisme, sinon Conduite, Chevaucher ou Natation ; avec montures ou véhicules, on prend leur Mouvement.
- Fin immédiate : victoire au Test opposé de 6 DR ou plus ; ou bien le membre le plus lent d'un camp a au moins le double du Mouvement du plus rapide de l'autre camp.
- Facteurs favorables, trois par camp : avoir gagné le Test de poursuite ; le terrain (dense ou bondé pour les fuyards, dégagé pour les poursuivants) ; son membre le plus lent a un Mouvement supérieur au plus rapide d'en face. Aucun facteur : tout le groupe doit franchir son Obstacle ; un ou deux : la moitié, arrondie au supérieur ; trois : un seul.
- Obstacles : un par personnage, tiré au d10 dans une table d'exemples ou choisi par le MJ. Une Réussite stupéfiante (+5 DR) permet de donner l'Avantage au Test d'un autre personnage ; un objet adapté peut donner l'Avantage, au jugement du MJ.
- Issue : fuyards gagnants, ils s'échappent ; poursuivants gagnants, ils rattrapent et le fuyard ne peut pas fuir aussitôt ; fuyards perdants, ceux qui ont franchi leur Obstacle peuvent encore s'échapper en abandonnant les autres ; poursuivants perdants, ceux qui ont franchi leur Obstacle peuvent continuer seuls et gagnent une seule occasion d'attaquer ou de retenir le fuyard le plus lent.
- Reste à lire : les dix lignes de la table d10 (à résumer en mots à nous, sans recopier le texte du livre), puis à faire relire au MJ.
- Le code actuel (`resolveV5PursuitStep`, échelle de distance 1 à 10, `js/core/v5-broken-escape.js`) n'est pas cette règle : il est remplacé. Attention au double comptage des talents Fuite ! et Impitoyable (`pursuitRole`, voir la spec).

**C. Miracles narratifs.** Spec : `docs/specs/miracles-narratifs/spec.md` (69 prières en rappel, lots L0 à L9, décisions du 16/11). Avant le plan : inventorier et classer les 88 clauses résiduelles des 60 miracles « assistés », que le MJ a inclus (Q1). Gros chantier : skill `cadrer-feature` pour le plan et les tâches, puis un lot à la fois.

**D. Traits optionnels des montures (nouveau, 16/11, à cadrer).** Demande du MJ : une monture peut recevoir des Traits optionnels, décrits aujourd'hui dans Up in Arms et dans l'Enemy in Shadows Companion, peut-être dans d'autres livres, et d'autres viendront. Rien n'est codé. Périmètre confirmé par le MJ le 16/11 : (1) vérifier, Trait par Trait, ce qui est calculé, ce qui n'est qu'un rappel et ce qui pourrait être calculé ; (2) mettre en place la possibilité de cocher les Traits optionnels pour qu'ils s'appliquent. Lecture de Claude, à confirmer au cadrage : la case à cocher vaut pour toute créature du bestiaire, montures comprises, pas pour les seules montures. Avant la spec : relecture des passages des deux livres, puis questions au MJ par sélecteur (où se choisissent ces Traits : profil de Réserve, fiche du PJ pour sa monture, les deux ; lesquels ont un effet calculé ; forme des données pour accueillir les livres à venir). État des lieux du 16/11, à ne pas refaire :
- Données : chaque profil de `js/data/bestiary/Lxx.json` porte deux listes distinctes, `traits` et `optionalTraits`, d'entrées `{name, param|rating, count, ref}` (noms anglais, `ref` vers une définition `E0-T-nnn`). 119 noms de Traits de base, 77 noms de Traits optionnels, 761 occurrences d'optionnels. Définitions et statut `covered`/`reminder` dans `js/data/creature-abilities.js` (généré par `tools/build-creature-abilities.mjs`).
- Traits optionnels : aucun interrupteur. `buildParticipantFromBestiary` (`js/core/bestiary-profiles.js`) ne met que `traits` sur le participant ; les optionnels restent en texte dans `extensions.v5.bestiary.optionalTraits` et ne s'affichent que dans la fiche de la bibliothèque (« Traits facultatifs »). Les attaques et armures optionnelles, elles, ont `includeOptional`, modèle possible. Seul précédent de choix de Traits optionnels : `previewBeastForm` (`js/ui/v5-spell-options.js`).
- Effets : chaque famille a son module `js/core/creature-*.js` (psychologie, taille, mouvement, combat, états, natures, sens, régénération, têtes, magie) qui lit `traits` du participant ; le reste passe en rappels (`js/core/reminders.js`). Un Trait optionnel ajouté à `traits` serait donc pris par ces modules sans autre branchement, s'il est déjà couvert.
- Montures : `isMountCandidate` (`js/core/mounts.js`) cherche Dressé (Monture) dans `traits` et `optionalTraits`. Monté, le moteur lit la Taille, la BF pour la charge et un seul Trait, Craintif (`js/core/v5-mounted-combat.js`). Rien pour des Traits propres aux montures.
- Livres : Up in Arms = L13 (Destrier lourd `E0-P-457` : optionnels Champion, Clever, Elite, Hardy, Rear, Tough) ; Enemy in Shadows Companion = L23 (Light Warhorse `E0-P-765` et Heavy Warhorse `E0-P-766`, même liste). Non établi : les autres livres, le nombre de Traits génériques à effet calculé, les définitions de ces six Traits, la façon d'ajouter un Trait à la main dans l'éditeur de profil.

**État du point A au 16/11 au soir :** codé et contrôlé sur la branche locale `image-pion-pj` des deux dépôts (outil `e96e280`, carte `e73afdc`), décision du MJ : l'image choisie dans l'outil part vers la carte, sinon la carte garde la sienne. Pas fusionné, pas publié : le MJ a dit « pas tout de suite ».

**À éprouver par le MJ, sans action de notre part :** la carte « Monture » du bureau des fiches (jamais vue dans un navigateur) ; les images des pions à la table (Transformation de Kadon, nouvelles images des PJ, charge sur la tablette) ; les refontes d'octobre de la carte.

## 3. Méthode de travail, la plus économe possible

Constat des 15 et 16/11 : ce qui a coûté cher, c'est la fenêtre principale qui lit du code et des journaux, les sessions qu'on réalimente, et les vérifications faites deux fois. Les règles ci-dessous en découlent.

**La fenêtre principale n'est qu'un chef d'orchestre.**
- Elle ne lit pas le code et n'écrit pas de code. Elle écrit des briefs, lance, contrôle par des commandes courtes, décide, publie.
- Une fenêtre par chantier. Quand le chantier est publié, ou vers la moitié de la fenêtre, on écrit une passation de cette forme et on change de fenêtre.

**Un lot = un brief dans un fichier = un agent neuf.**
- Le brief s'écrit dans `tmp/reprise-team/<lot>/prompt.md` et l'agent reçoit une seule phrase : « lis ce fichier et exécute-le ». Gabarit, toujours le même : but en une phrase ; contexte (fichiers à lire en premier, modèle à imiter) ; fichiers qu'il a le droit de modifier ; interdits ; « fini quand » sous forme de commandes à lancer ; format du rapport. Les briefs du chantier monture, dans ce dossier, servent de modèles.
- Jamais de `SendMessage` pour ajouter du travail à un agent qui a déjà fini : un agent neuf coûte moins qu'un contexte relu. Seule exception : reprendre un agent coupé par la limite d'usage.
- Un lot par dépôt peut tourner en parallèle d'un lot d'un autre dépôt ; jamais deux lots qui écrivent dans le même dépôt.

**Le modèle le moins cher qui suffit.**
- Sonnet pour presque tout : implémentation sur brief, tests, parcours navigateur, cadrage d'exploration, contre-vérification.
- Opus seulement pour un défaut dont la cause est inconnue ou pour une modification d'un moteur partagé (dégâts, synchronisation).
- Le compte Team (`~/.claude-team`, voir la mémoire `delegation-compte-team`) : demander d'abord au MJ s'il est libre.

**Contrôler sans relire.**
- Après chaque lot, l'orchestrateur relance lui-même les commandes du « fini quand » et ne garde que les lignes de résultat : `... | grep -E "^ℹ (tests|pass|fail)"`. Jamais un journal entier dans la fenêtre : la sortie va dans un fichier du dossier temporaire, on n'en lit que la fin.
- Une seule contre-vérification indépendante par chantier, à la fin, avec une liste fermée de points à examiner (contrat de bout en bout, cas limites, tests qui ne prouvent rien). Ses constats partent en un seul lot de corrections par dépôt.
- La suite complète une seule fois, à la fusion, en arrière-plan. Le parcours réel à l'écran se prouve par un parcours navigateur écrit par un agent (`tests/*-browser.mjs`), pas en pilotant le navigateur depuis la fenêtre principale, ce qui coûte beaucoup plus.

**Ne pas payer deux fois la même lecture.**
- Avant de chercher, lire la mémoire du projet et la spec du chantier. `docs/SUIVI_EVOLUTION.md` et le README sont gros : recherche ciblée, jamais de lecture entière.
- Tout ce qui a été lu une fois et resservira (une page de livre, une décision, un piège) va dans la spec ou dans la mémoire, comme la règle de poursuite ci-dessus.

**Les questions au MJ, groupées et en amont.**
- Par sélecteurs, quatre questions par appel, chacune avec son contexte et une recommandation. Toutes les questions d'un chantier avant de lancer le premier lot, pas au fil de l'eau.
- Messages courts : le résultat d'abord, ce qui n'est pas vérifié ensuite.

**Pièges d'outillage rencontrés, à ne pas repayer.**
- Un script Python passé en ligne au shell perd ses barres obliques inverses : écrire le script dans le dossier temporaire avec l'outil d'écriture, puis le lancer.
- Avec `Start-Process`, mettre entre guillemets doubles les chemins qui contiennent des espaces.
- Le petit serveur Python de `.claude/launch.json` refuse des connexions quand la machine est chargée : pour un contrôle à l'écran, utiliser `liaison-map` (port 8770, `/Outil-MJ-Warhammer/`).
- Depuis la télécommande du téléphone, l'app refuse de démarrer une session séparée : sous-agents à la place.
- Tout nouveau parcours navigateur s'inscrit dans `tests/parcours.json`, sinon un test unitaire échoue. Tout nouveau module de `js/` s'ajoute au précache de `sw.js`.
- Dans les fiches, une publication passe la version dans `app/index.html`, `js/layout.js`, `sw.js` et dans sept tests de livraison de `tools/` ; trois tests de règles exigent l'émulateur Firestore et échouent sans lui.

**Publier, toujours dans cet ordre.**
1. Feu vert explicite du MJ, action par action (pousser l'outil, pousser les fiches, déployer une fonction).
2. Version (`node tools/bump-version.mjs X.Y.Z` pour l'outil), note dans `docs/SUIVI_EVOLUTION.md`, commit, fusion en avance rapide dans `main`.
3. Suite complète, socle navigateur, contrôles `--check` des générateurs.
4. Si les fiches changent : fonction Firebase d'abord, site des fiches ensuite, outil en dernier.
5. Vérifier la version servie en ligne, puis mettre la mémoire à jour.

## 4. Pour reprendre

Message à donner à la nouvelle fenêtre : « Lis `docs/PASSATION_16_11_2026.md` et applique sa méthode. Commence par le point A (image du pion des PJ) : pose-moi la question par sélecteur avant tout code. »
