# Suivi des lots d’évolution

État consolidé au `23/09/2026`, version `3.6.3`. Les validations applicatives ci-dessous portent sur l’arbre local partagé. Les règles Firebase de production ont été publiées et relues dans la console le `23/09/2026` ; une sauvegarde serveur a été exportée le même jour. Depuis la bascule, v1 est en lecture seule pour son UID propriétaire et v2 limite lecture et écriture à son UID propriétaire. Les règles n’ont pas modifié les données. Le site GitHub Pages est distribué depuis la branche `main`. Aujourd’hui (`23/09/2026`), l’import de la sauvegarde de production vers le compte v2 a été vérifié : le statut est resté « Synchronisé » après rechargement et l’export Firebase v2 affiche la révision 2 avec 26 profils, 4 participants et 12 lignes. Aucun test multi-clients n’est revendiqué.

| Lot | État | Preuves finales |
|---|---|---|
| E01–E04 | Intégré et validé localement | `npm test -- --test-concurrency=1` : 199/199 ; `tests/e04-idb-browser.mjs` ; import, points de restauration et réhydratation vérifiés dans le navigateur réel. |
| E05 | Intégré et validé sur les adaptateurs locaux | Suites E05 ciblées, `tests/browser-e05.mjs`, `tests/browser-e05-legacy.mjs`, `tests/browser-offline.mjs` : 5/5. |
| E07–E08 | Intégré et validé | Tests de commandes, historique, dégâts et ordre ; smoke réel avec résolution, PV, undo/redo, retrait et rechargement. |
| E09–E10 | Intégré et validé dans la vraie coquille | Navigation Préparer/Jouer/Bibliothèque, profils complets, recherche actions/tags, favoris, règles réelles, sélection et suivi du tour. |
| E11–E17 | Intégré ; parcours navigateur bornés passants | `tests/browser-index.mjs` couvre lancement, suspension/reprise, clôture, personnage persistant, E15, E16 et E04 sur l’index réel. |

## Refonte de l’interface — non publiée, en attente de la recette du MJ à la table (22/11/2026)

Pas de numéro de version : ni `tools/bump-version.mjs` ni publication avant le feu vert du MJ. Spec, plan et tâches : `docs/specs/refonte-interface/`. Les règles du moteur, les sauvegardes, la synchronisation, les fiches des PJ et la liaison avec la carte ne changent pas (aucune migration ; seuls deux champs facultatifs s’ajoutent : `suddenDeathDeclined` et `advancedTurn`).

**L’espace Jouer tient sur l’écran.** À 1440 × 800 la page ne défile plus : frise d’initiative en haut, celui qui agit à gauche, les mêlées puis la résolution au centre, « À décider » puis la cible à droite, la barre d’actions et les onglets Règles · Profils · Journal en bas. La police est celle du système (plus de police gothique), thèmes clair et sombre conservés.

**Ce que le MJ fait autrement.**
- **Frise** : un clic sur un portrait fait agir ce combattant (réaction, action gratuite) sans changer le tour ni la cible ; le haut de l’écran dit « agit hors de son tour ».
- **Jouer son tour maintenant** : donne le tour tout de suite à un combattant ; ses effets de début de tour se déclenchent à ce moment et pas une seconde fois à sa place normale ; « Tour suivant » reprend ensuite où on en était ; « Annuler » rétablit tout.
- **Mêlées en cartouches** : un clic sur un cartouche choisit la cible.
- **Charger** : proposé sur la cible choisie pour tout ennemi non engagé, sans limite à quatre ; si l’acteur est engagé ailleurs, la mention « interdit : déjà engagé (p. 163) » reste, avec forçage.
- **À décider** : toutes les décisions attendues du MJ arrivent dans une case toujours visible, avec un compteur en haut et une marque sur la frise ; la mort subite se tranche en un clic (Mort, Inconscient, Plus tard, Pas un figurant) ; aucune décision ne bloque « Tour suivant ».
- **Démarrage** : lancer une rencontre fait entrer tous ses combattants d’un geste ; l’initiative se saisit au centre de l’écran (dés des PJ, Combat instinctif, égalités, camp surpris, monté ou sans monture) et la liste suit les renforts et les retraits.
- **Tir** : une seule ligne « Distance » (Au contact, Bout portant, Courte, Moyenne, Longue, Extrême), préremplie par le plateau et la carte ; l’onglet Circonstances disparaît au profit de puces déduites et d’un panneau « autres… » qui ne propose que ce qui s’applique à l’action.
- **Fiches** compactes (PV, caractéristiques, Élan, Chance, Destin, États, monture) ; le reste est dans le menu ⋯ de la fiche (fiche complète, sorts et prières, retrait avec ou sans monture, sans monture, renommer, camp, modifier).
- **Fenêtres non bloquantes** pendant le combat : Chance, Destin, Temps de campagne, effets V5. Seule la confirmation de « Terminer le combat » reste modale.
- **Magie, prières, corruption** se lancent depuis la résolution ; **séquelles, maladies et convalescence** ont quitté l’écran de combat : elles se règlent dans Campagne, y compris pour un participant absent.
- **Préparer, Campagne, Bibliothèque** ne défilent plus : les longues listes (réserve, rencontres, suivis, profils, règles) défilent dans leur case.

**Recette.** Relevé des fonctions : `docs/specs/refonte-interface/recette-fonctions.md` ; captures avant/après : `docs/specs/refonte-interface/captures/` ; fiche pour la recette à la table : `docs/specs/refonte-interface/fiche-de-table.md`. Parcours de mesure verts : `refonte-ecran`, `refonte-preparer`, `refonte-campagne`, `refonte-bibliotheque`.

## 3.56.0 — Retours d’un gros combat (publiée le 21/11/2026)

Lots corrigés après un vrai combat, avant la refonte de l’interface.

- **Retirer un participant.** Un participant (PJ, PNJ, créature, monture) se retire en cours de rencontre, avec confirmation dans l’interface. Le retrait suit en cascade : ordre et tour (le tour passe au suivant), engagements, empoignades et leur Enchevêtré, familiers, monture et cavalier liés, suivis de fin de combat, lignes de dés. Son pion disparaît de la carte par la liaison.
- **PJ « sans monture ».** Un PJ dont la fiche déclare une monture peut être indiqué sans monture pour la rencontre, à l’ajout ou en cours de combat : la monture n’entre plus au combat ni sur la carte. La fiche ne change pas.
- **Élan visible.** L’Élan de chaque participant s’affiche sur la piste.
- **Miracle refusé faute de Péché.** Une fiche sans champ `peche` (la fiche affiche alors « Péché 0 ») bloquait les miracles : « Le score de Péché doit être enregistré dans la fiche » (cas d’Elysia, Attaque Rapide). Un Péché ou une Corruption absents valent maintenant 0 dans tout le chemin prière/miracle ; une valeur invalide reste refusée.
- **Pion actif sur la carte.** L’outil envoie le participant actif à Map Display (`mj.turn`, contrat §10), qui le cerne d’or sur l’écran MJ.

Suites : 6 901 + 280, zéro échec.

### Poursuite retirée du module Warhammer

Décision du MJ après un gros combat : le module de poursuite V5 (3.50.0) est abandonné. Plus d’entrée dans l’interface (carte « Poursuite » de Jouer, modale « Poursuite de scène », bouton de lancement dans le panneau du Brisé), ni de commandes du Store (`getPursuit`, `startPursuit`, etc.). Retirés : `js/core/v5-pursuit.js`, `js/core/store/api-pursuit.js`, `js/data/v5-pursuit-obstacles.js`, `js/ui/v5-pursuit-panel.js`, `js/ui/v5-pursuit-dialog.js`, leurs tests et les deux parcours navigateur.

- **Gardé.** La fuite d’un Brisé engagé (attaque gratuite des adversaires, 3.48.1) et ses règles Flee/Sprint, sans le cas particulier du fuyard d’une poursuite ; les talents qui mentionnent la poursuite (Cavalier, Claquer le fouet, Impitoyable, Nageur endurant : contexte `pursuit`, mesures de Mouvement), qui restent des réglages manuels du MJ ; les notes de créatures (Territorial, Dressage).
- **Sauvegardes.** Un état `extensions.v5.pursuit`, `scenePursuitReceipts` ou une poursuite rangée avec une scène en pause reste dans les données, jamais lu ni réécrit ; l’historique ↶/↷ d’une ancienne commande de poursuite se rejoue sans erreur.
- **Spécification.** `docs/specs/poursuite-v5/` est conservée comme archive (abandonnée).

## 3.55.1 — Renommer un PNJ en rencontre (publiée le 20/11/2026)

**Un PNJ ou une créature se renomme pour la rencontre.** Demande du MJ : changer le libellé d’un pion sur la carte sans toucher au bestiaire. La fiche du participant porte un bouton ✎ à côté du nom ; Entrée enregistre, Échap annule, un nom vide est refusé. Seul le participant change : la liaison renvoie son `label` à Map Display (champ géré par l’outil), l’image du pion, tirée du profil, reste la même, et le profil n’est pas modifié. Les PJ n’ont pas le bouton : leur nom vient de leur fiche. Une modification du profil propagée aux participants rétablit son nom, comme avant.

Suites : 6 970 + 279, zéro échec. `tests/browser-workspace.mjs` vert ; vérifié dans l’outil local sur un PNJ de test (participant et libellé renommés, profil inchangé).

## 3.55.0 — Sorts et prières des PNJ (publiée le 20/11/2026)

**Une liste de sorts et de prières pour les PNJ.** Demande du MJ : le combat proposait tout le catalogue (400 sorts, plus de 200 prières), peu pratique en jeu. Le formulaire du profil porte un bloc « Sorts et prières », et la fiche du participant le même volet pour la seule rencontre. On ne peut y saisir que des noms des catalogues (sorts V5, prières divines) : un nom inconnu est refusé, le combat ne saurait pas le lancer. La liste du profil passe aux participants qui en sont tirés. Pour un PJ, les deux blocs sont masqués : sa liste vient de sa fiche (`js/core/magic-lists.js`, `js/ui/magic-list-picker.js`).

**En combat, la liste est seule proposée.** Sorts : ceux de la liste ; la case « Tous les sorts » rouvre le catalogue. Prières : celles de la liste et toutes les Bénédictions des cultes du personnage (Béni les donne en entier) ; « Toutes les prières » rouvre le reste. Sans liste, rien ne change. Un miracle exige toujours son talent d’accès, PNJ compris. Les PJ, dont les sorts et prières venaient déjà de la fiche, profitent du même filtrage.

Suites : 6 970 + 279, zéro échec. Navigateur verts : `browser-workspace`, `divin-v5-browser`, `divin-v5-p5-ui-browser`, `browser-magic-v5-smoke`, `lot3-v5-magic-2b-ui-browser`, `q6-t10-magie-browser` (les trois derniers cochent « Tous les sorts » avant de choisir un sort hors liste) ; vérifié dans l’outil local sur un PNJ et un profil de test.

## 3.54.0 — Cavalerie de choc, armure ôtée (publiée le 20/11/2026)

**Cavalerie de choc proposée aux montures.** Dressage ajouté par Up in Arms (p. 107), il n’apparaît dans aucun profil plus ancien : le Cheval, le Destrier noir, le Sang-froid ou le Griffon ne le proposaient donc pas. Le panneau des Traits optionnels offre désormais la case à toute monture qui peut être Dressée (Monture) et (Guerre), imprimé ou facultatif. Elle reste grisée, « exige Dressé (Guerre) », tant que Guerre n’est ni imprimée ni cochée, comme le demande la règle. Un profil qui la liste déjà (Lion blanc) ou l’a d’office (Demigryphe dressé) n’a pas de seconde case.

**Pièces d’armure décochables pour la rencontre.** Demande du MJ : simuler un combat où les PJ n’ont pas toute leur armure. La fiche du participant porte un bloc « Armure portée », une case par pièce (zones et PA). Une pièce décochée cesse de compter partout : PA par zone et piste, feu, sorts de métal, pénalité de canalisation, pièces proposées pour Discrétion/Perception. Les objets ne changent pas : la liste des pièces ôtées vit sur le participant (`extensions.v5.removedArmour`, absente = tout porté, module `js/core/armour-worn.js`), donc ni la fiche ni sa réécriture ne sont touchées, et une mise à jour depuis les fiches la conserve. Les boucliers n’y figurent pas : leur emploi se choisit déjà à chaque action.

Suites : 6 960 + 279, zéro échec. `tests/browser-workspace.mjs` vert ; vérifié dans l’outil local (C3 → C1 → C3 sur un PJ de test).

## 3.53.4 — Sortie des scènes orphelines, 26 pions de plus (publiée le 19/11/2026)

**Une scène dont la rencontre a disparu a enfin une sortie.** Signalé par le MJ : une scène « test » restait « En cours », bloquait tout lancement, et sa rencontre n’était plus dans Préparer — donc rien ne pouvait la fermer. Vérifié sur sa sauvegarde : une scène active pointant vers une rencontre dont l’identifiant n’apparaissait qu’à cet endroit dans tout le fichier. L’impasse était structurelle : le statut « En cours » se déduit de la scène, mais « Suspendre » et « Supprimer » vivent sur la carte de la rencontre, et « Terminer le combat » vide les combattants sans fermer la scène. Préparer affiche désormais une carte par scène orpheline, active ou suspendue, portant « Clore la scène » et rien d’autre — « Reprendre » ou « Relancer » demanderaient la rencontre, qui est justement ce qui manque. ⛔ Aucun nettoyage automatique au chargement : une scène active est un combat en cours, elle ne s’écarte que sur un geste du MJ, et la commande refuse toute scène encore rattachée à une rencontre. Six mécanismes mutés, six rouges ; un septième essai a révélé une remise à zéro du combat déjà faite par le miroir scène→combat, donc retirée.

**26 PNJ du lot 28 dans la table des images** (`tools/token-images.csv`) : ils existaient dans le dépôt de Map Display sans être déclarés nulle part, donc ni offerts par le sélecteur de l’outil, ni publiés par le site. Aucun ne correspond à un profil du bestiaire — les 64 profils de L28 avaient déjà leur image. Le pion de Glugnur est remplacé par la même occasion : le nom du cache de `sw.js` suivant la version, cette publication chasse l’ancienne image des navigateurs.

**La table des images déclare son type.** Avec 26 entrées de plus, le typecheck de Map Display rendait « TS2590 : union type too complex to represent » sur sa copie : chaque entrée portait son propre `Object.freeze`, soit un millier de types `Readonly<…>` distincts à réunir, au-delà de ce que l’inférence sait représenter. Le générateur écrit désormais le type une fois (`@typedef TokenImage`) et gèle les entrées en boucle ; le gel obtenu est identique, vérifié à l’exécution.

Suites : 6 951 + 279, zéro échec, golden master régénéré et son écart relu. `tests/browser-workspace.mjs` et `tests/f2-c-workspace.browser.mjs` verts.

## 3.53.3 — Chapeau multi-jeux : registre des jeux (publiée le 18/11/2026)

Lot L2 du chantier multi-jeux (`docs/specs/multi-jeux/`).

- **Registre des jeux** (`js/core/jeux.js`) : chaque jeu y déclare sa page, sa base de sauvegarde et son préfixe de clés. Warhammer garde exactement ses noms actuels (`wfrp-persistence-v2`, clés `wfrp.*`) : aucune donnée n’est renommée ni migrée. L’Appel de Cthulhu y figure, non publié.
- **Menu « Jeu »** (`js/ui/selecteur-jeu.js`) : masqué tant qu’un seul jeu est publié, donc invisible pour l’instant.
- **Application installée** renommée « Outil MJ » (même identifiant, même adresse de départ).
- **Garde-fous** : un test fige les noms de stockage, de synchronisation et d’écriture vers les fiches de Warhammer ; un autre vérifie qu’une sauvegarde de la 3.53.1 est relue à l’identique ; un troisième garde la liste des modules communs (leurs imports ne sortent jamais de la liste).

## 3.53.2 — Liaison carte neutre, premier lot de l’outil multi-jeux (publiée le 18/11/2026)

Chantier « outil multi-jeux » (décision du MJ du 18/11/2026) : un chapeau d’infrastructure commune et un module par jeu (Warhammer, puis L’Appel de Cthulhu 7e, plus tard Imperium Maledictum et L’Ombre du Seigneur Démon). Exploration préalable : maquette Cthulhu et rapport sous le tag local `archive/maquette-cthulhu-18-11`. Cadrage : `docs/specs/multi-jeux/` (spec, plan, tâches ; questions Q1 à Q9 validées avec leur réponse par défaut).

- **Lot L1, sans changement visible** : le protocole de la liaison Map Display sort dans `js/core/map-link-protocol.js`, qui ne charge aucune règle de Warhammer ; la traduction participant → pion devient une projection fournie par le jeu (`warhammerMapProjection` dans `map-link-state.js`). `createMapLink` garde ses exports et sa signature.
- **Non-régression** : un test d’or (`tests/unit/chapeau/liaison-carte-messages-golden.test.mjs`) fige la suite exacte des messages envoyés à la carte ; il passe sur le code de la 3.53.1 comme sur celui-ci. Un second test vérifie que le protocole accepte une grille, des Zones et un jeu sans PV, et n’envoie jamais un marqueur inconnu de la carte.
- **Recette** sur la carte réelle par le MJ : conforme. La carte ne change pas.

## 3.53.1 — Correctifs de la recette Gemini (publiée le 18/11/2026)

Recette en conditions réelles des versions 3.46.0 à 3.53.0 exécutée par Gemini (plan : `docs/RECETTE_GEMINI_3_46_A_3_53.md`) : 54 scénarios réussis, 5 laissés au MJ ; anomalies triées (défauts réels corrigés, écarts du plan écartés).

- **Plus aucune boîte native** (décision du MJ du 06/11 : le navigateur de l’app les refuse sans les afficher). Charger un fichier, recommencer le combat, vider la Réserve : action directe puis toast « Annuler » ; effacer tout l’historique (non annulable) et appliquer les PV aux profils : confirmation dans la page ; erreur de connexion Google : toast. Un test (`tests/unit/outillage/pas-de-boite-native.test.js`) empêche leur retour.
- **Bestial** : la défense est présélectionnée sur l’Esquive quand la créature l’a.
- **Vindicte vengeresse** : le panneau de résultat affiche « Relance gratuite : Vindicte vengeresse ».
- **Import** : un registre de convalescence invalide fait refuser l’import dès l’aperçu, avec un message clair.
- **Carte** (publiée avant l’outil, `main` `5fff780`) : mention « géré par l’outil MJ » sur la fiche d’un pion lié ; un pion lié en réserve accepte un état sans palier de Bond ; avertissement de lecture du canvas du brouillard supprimé.
## 3.53.0 — Miracles narratifs, mots-clés des fiches (publiée le 18/11/2026)

Cadrage et décisions du MJ des 16, 17 et 18/11/2026 : `docs/specs/miracles-narratifs/spec.md` (Q1 à Q17, §8, « Choix validés en fin de chantier »), inventaire des 88 clauses des miracles assistés (`inventaire-assistes.md`), tri combat / hors combat (`tri-combat.md`), plan et tâches (lots L0 à L11) dans le même dossier.

**Règle du MJ : l’outil sert au combat.** Un miracle qui ne sert pas en combat reste un rappel, sans calcul (Talk Your Way Out, The Gamemaster, Fair Winds, Lord of the Hunt, Crisis of Confidence, Grâce de Ranald, A Deal’s a Deal, Waterlungs, Free Your Mind…).

- **Miracles calculés.**
  - **Bonus et immunités** : Muscles givrés (Immunité au froid), Cœur du loup (Terreur ignorée), Dent et griffe (mains nues sans Inoffensive), Fureur du soleil vertueux (Dégâts +2, réduits par BE et PA), Rage de Rhya (Force +2 DR).
  - **Test imposé à la cible** (bouton dans le panneau divin, jet saisi par le MJ) : Embobiner, Baume pour un esprit blessé (suspend Peur et Frénésie), Engourdissement (« Actions défensives seulement »), Effrayer l’Ennemi, Mer déchaînée, Vent sauvage (−10 lu −1 DR), Fureur d’Ulric, Épée de justice (Inconscient verrouillé BSoc Rounds).
  - **Zones** (présence désignée par le MJ) : Seuil du Portail, Paix de Taal, Froid de la gelée blanche (perte d’Élan au début du Round, sauf le prêtre), Apaisez les vents (Incantation et Focalisation échouent, sorts suspendus, rétablis à la sortie ou à la fin de la prière).
  - **Compteurs** : Revirement de fortune, Forcer la main du hasard, Haine de Vaincre les impies (+2 après avoir tué un ennemi visé ; le prêtre compte parmi les alliés).
  - **Temps suspendu** : Lumière de stase (États, pertes et expirations figés pour la cible).
  - **Transferts de Dégâts** : Martyr (le prêtre reçoit les Dégâts, réduits de son BE et de son BSoc, sans PA), Retour à l’envoyeur (Blessures rendues d’office à la prochaine attaque du plus faible).
  - **Moteurs de combat** : Vindicte vengeresse (relance gratuite d’un Test de Mêlée raté ou d’une opposition perdue), Épée de justice (armure et bouclier ignorés), Morsure de l’hiver (retire Hémorragique au coup), Jugement du Roi de la neige (le prêtre qui subit l’effet est aussi Sonné). En bon ordre dispense du Test de Désengagement.
- **Rappel enrichi.** 30 prières utiles en combat mais sans calcul affichent un libellé court, la portée, les cibles et l’échéance ; une durée que le livre n’atteste pas est signalée (« Attention : durée non attestée par le livre »).
- **21 clauses requalifiées** : ce que l’outil appliquait déjà (pureté de Solkan, zones, cibles, durées) ne s’affiche plus en rappel.
- **Mots-clés des fiches.** Les types de mots-clés sont une donnée unique de l’outil (`js/data/fiche-keyword-types.js`), recopiée dans les fiches par `node tools/build-fiche-keywords.mjs` (`--check` pour contrôler). L’aperçu de synchronisation signale un type ou une cible de mot-clé inconnus (« fiche plus récente ? »).
- **Vérification.** Contre-vérification indépendante : aucun bloquant ; corrigés : un PNJ de camp « allié » proposé comme ennemi, textes de clauses, messages. Suite unitaire complète verte (7175 tests).
## 3.52.0 — Calculs des Traits de créature (publiée le 17/11/2026)

Cadrage et décisions du MJ du 17/11/2026 : `docs/specs/traits-calculs/spec.md` (D1 à D20), tri dans `tri.md`, plan et tâches (huit lots) dans le même dossier. Branche locale `traits-calculs`.

**Publier la carte avant l’outil.** Le palier Bond envoie à la carte un nouveau champ facultatif, `bondCells` (le double de la Course, en cases). La carte doit l’accepter avant que l’outil ne l’envoie ; une carte qui ne le connaît pas ne l’affiche simplement pas.

- **Traits désormais calculés, sans que le MJ ouvre quoi que ce soit.** À chaque blessure, au début et à la fin d’un Round, ou quand le porteur gagne un Avantage, l’outil ouvre de lui-même la demande qui convient (Test à passer ou d10 à tirer). Chaque demande a **un bouton qui tire le dé**, en plus de la saisie d’un résultat ; un seul ↶ annule le tout.
  - **À la blessure** : Sang corrosif (un seul d10 par blessure, réduit par le Bonus d’Endurance et par les PA de la zone, que l’outil tire lui-même ; minimum 1), Infecté (Test d’Endurance de la victime), Parasité (−1 DR pour toucher le porteur en mêlée), Champion (il blesse aussi quand il gagne l’opposition en défense), Bouclier du Trait (lié à l’option Bouclier de l’équipement ; contre un vrai bouclier, la plus forte valeur compte).
  - **En début de Round** : Stupide (Test d’Intelligence Facile, sauf s’il est guidé par un allié qui ne l’est pas). Bestial : défense par l’Esquive seulement, fuite sous la moitié des Blessures. Rage : suit le gain d’Élan.
  - **En fin de Round** : Instable (2 Blessures s’il est engagé avec un adversaire qui a l’Élan alors que lui n’en a pas ; sa mort passe par la décision de mort habituelle, jamais de suppression automatique).
- **Marqueur « tour perdu ».** Quand un Trait fait perdre au porteur son Mouvement et son Action (Stupide, Affamé), un marqueur apparaît sur sa carte de combat pour son prochain Tour, avec un avertissement, et se lève à la fin de ce Tour.
- **Increvable en Test étendu.** À la mort avec le corps intact (case à cocher), un Test de Résistance +0 au début de chaque Round ; les DR s’additionnent, un échec n’en retire jamais, et la créature revient à 1 Blessure dès 6 DR, au plus en BE Rounds. Le total s’affiche ; les États du mort ne comptent pas.
- **Inflammable en défense.** Contre une attaque qui inflige Enflammé (Inflige, arme enchantée, attaque naturelle), le porteur prend −2 DR sur sa défense (Esquive ou Corps à corps opposé) ; sans défense possible, pas de Test. Jamais au retrait d’Enflammé par Athlétisme.
- **Bloc « Rencontre » et boutons.** Effrayé et Animosité se déclenchent par des boutons dans un même bloc (l’outil ne connaît pas la rencontre) ; Vampirique et Se cabrer (remplace le déplacement, Piétinement) aussi. Les demandes Oui/Non (Stupide guidé) s’affichent en clair, et une réponse garde le choix de résultat déjà fait.
- **Petits calculs.** Insensible à la douleur ignore les pénalités des critiques mais pas les amputations ni les États qu’ils posent ; Béni et Miracles donnent Prière à Sociabilité +10 ; Dressé (Guerre) et Dressé (Magie) ignorent Craintif pour leur cause (l’outil demande la cause de la chute) ; **Bond** : pastille sur la fiche (portée doublée) et portée envoyée à la carte, sans toucher la Course ni la poursuite.
- **Reste en rappel.** Tri, section 3 : Traits rares à règle propre (Capricieux, Salive anticoagulante, Scission…), Traits de terrain (Limicole, Grimpant, Fouissage…), Traits narratifs ou tirés par le MJ, Traits sans règle d’exposition (Aura glaciale, Sillage de feu, Rampant…), Têtu, Dressé (Choc). **Disruption** et **Creature Weapons** passent officiellement en rappel (ils étaient déclarés « couverts » sans calcul). **Insensible à la douleur hors combat** reste au MJ.
- Moteur : `js/core/trait-effects.js`, `js/core/store/api-trait-buttons.js`.
- Preuves : tests `tests/unit/creatures/traits-calculs-*.test.js` ; parcours navigateur de bout en bout (Sang corrosif, Instable, Stupide, Increvable, Bond, ↶/↷, rechargement) ; relectures de lots corrigées. Suite unitaire complète à lancer avant la publication. Côté carte, le lot L7 (`bondCells`, dépôt `rpg-map-display`) n’a pas été revérifié lors de la préparation de cette version.

## 3.51.0 — Traits optionnels des créatures et des montures (publiée le 17/11/2026)

Cadrage et décisions du MJ du 17/11/2026 : `docs/specs/traits-optionnels/spec.md` (D1 à D26, CA1 à CA25), valeurs relues dans `valeurs-traits.md`, inventaire des 125 Traits dans `inventaire.md`.

- **Panneau « Traits optionnels »** sur tout profil de Réserve sauf les PJ (`js/ui/optional-traits-panel.js`) : une case par Trait, dressage, attaque et pièce d’armure optionnels de la fiche ; « Ajouter un Trait » prend n’importe quel Trait du catalogue (recherche en français ou en anglais, paramètre exigé pour Peur, Taille, Dressé, Haine…). Le choix vaut pour les participants ajoutés ensuite ; ceux déjà en rencontre ne changent pas. ↶/↷, sauvegarde, export et import JSON (clé `traitsOptionnels`), synchronisation.
- **Effets.** Un Trait coché agit comme le même Trait de base. Big, Brute, Clever, Cunning, Fast, Tough, Hardy et Dressé (Guerre) modifient le profil (valeurs de L11 et du Livre de base FR) ; Elite et Leader appliquent les modèles V5 Elite et Lieutenant (caractéristiques, compétences, Talents). Compétences, attaques et dégâts de mêlée suivent les caractéristiques. Blessures et Taille : différence de formule ajoutée aux Blessures imprimées. Le panneau montre « imprimé → modifié ».
- **Règles de choix.** Un Trait déjà imprimé en base est grisé « déjà compté » et réputé compté dans le profil imprimé ; une seule Taille ; Leader refusé sur une créature Bestial.
- **Rappels.** Tout Trait coché ou ajouté s’affiche au moins en rappel, sauf six que l’outil applique déjà lui-même (Taille, Régénération, Terreur, Caméléon, Furtif, Amphibie).
- **Montures.** Un profil de Réserve coché « Dressé (Monture) » est proposé comme monture d’un PJ, copié avec ses coches ; « Mettre à jour les PJ » garde les coches si l’espèce ne change pas et dit leur perte sinon.
- **Données.** Stubborn (« Têtu ») au catalogue et sur l’âne et la mule ; Dressé (Magie) du Demigryph ; dressages du Cheval de trait lourd. Catalogue généré `js/data/creature-trait-catalogue.js`, table `js/data/optional-trait-modifiers.js`.
- Moteur : `js/core/optional-traits.js`, `js/core/store/api-optional-traits.js`.
- Restes connus : noms des pièces d’armure optionnelles en anglais (pas de nom français dans les données) ; protection de l’armure cochée prouvée par test unitaire, pas par le parcours ; « Résistance à l’alcool » ne suit pas les modèles Elite et Lieutenant ; synchronisation prouvée sur une relecture simulée, pas contre un vrai compte ; `tools/build-bestiary-profiles.mjs --check` se lance sous Bash (sous PowerShell, l’extraction PDF altère un nom accentué).
- Preuves : suite unitaire à la fusion (6628 + 221) ; tests `tests/unit/**/traits-optionnels-*.test.*` ; parcours `tests/traits-optionnels-browser.mjs` ; socle navigateur ; contre-vérification indépendante, huit constats dont six corrigés (un bloquant : l’armure cochée ne protégeait pas en combat), sans seconde relecture indépendante.

## 3.50.0 — Poursuite selon le Livre de base V5, image du pion des PJ (publiée le 17/11/2026)

Cadrages et décisions du MJ des 16 et 17/11/2026 : `docs/specs/poursuite-v5/spec.md` (D1 à D24, CA1 à CA25) et `docs/specs/images-pions/spec.md` (CA16). Publiée avec la carte (test et contrat de liaison revus, aucun code changé).

- **Poursuite (Livre de base V5 p. 158-159).** L’ancien calcul à distance de 1 à 10 est retiré. Le plus rapide des poursuivants s’oppose au plus lent des fuyards ; la poursuite finit à 6 DR d’écart, ou tout de suite quand un camp a le double du Mouvement de l’autre. L’outil déduit deux facteurs favorables, le MJ coche le terrain et corrige les cases et les Mouvements. Égalité au poursuivant.
- **Obstacles.** Table d10 figée dans `js/data/v5-pursuit-obstacles.js` ; seul le camp des PJ les franchit (sans PJ, le MJ désigne le camp). Issue complète ou partielle : journal, et « Retirer de la rencontre » pour un fuyard échappé.
- **En combat.** Carte « Poursuite » dans Jouer (`js/ui/v5-pursuit-panel.js`), un Test par participant et par Tour, qui remplace le Sprint. Tant qu’un Brisé est le fuyard d’une poursuite en cours, il n’a plus à fuir ni à sprinter pour finir son Tour.
- **Hors combat.** Modale « Poursuite de scène » (`js/ui/v5-pursuit-dialog.js`) entre participants de la rencontre en cours ; ↶ annule une validation. La poursuite suit sa scène mise en pause ; une rencontre terminée ou recommencée l’abandonne, avec une ligne au journal.
- **Attaque gratuite à la fuite.** Réservée aux adversaires engagés avec le Brisé, une par adversaire et par Tour, Élan dépensé par adversaire.
- **Cas limites.** Mouvement inconnu ou nul : la règle du double et la paire automatique attendent la saisie du MJ. Compétence de base absente : repli sur sa Caractéristique ; avancée absente : refusée. Grandes enjambées : l’outil demande si le terrain convient. Un participant retiré sort du compte de son camp.
- **Image du pion des PJ.** Un PJ envoie à la carte l’image choisie dans l’outil ; sans image choisie, la carte garde la sienne. Le sélecteur d’image de la Réserve s’affiche pour les PJ. À savoir : un PJ qui portait déjà une image dans l’outil l’envoie désormais, et retirer l’image dans l’outil ne restaure pas l’ancienne image de la carte.
- Moteur : `js/core/v5-pursuit.js`, `js/core/store/api-pursuit.js`. `docs/AUDIT_REGLES.json` : F-L06-0293 passée à « assiste ».
- Restes connus : table d10 validée par le MJ le 17/11, sans correction ; `docs/AUDIT_REGLES.md` non régénéré ; synchronisation en ligne d’une poursuite en cours non éprouvée ; Vol dans le Mouvement de poursuite sans test ; les engagés cochés dans le panneau du Brisé ne sont gardés qu’en mémoire ; un reçu des vingt dernières validations hors combat est conservé (écart léger à D8) ; boutons de fin hors combat perdus après un rechargement.
- Preuves : suite unitaire à la fusion ; tests de la poursuite (`tests/unit/combat/poursuite-v5-*.test.js`, `brise-attaque-gratuite.test.js`, `tests/unit/moteur/poursuite-v5-tests.test.js`, `tests/unit/ui/poursuite-v5-*.test.js`, `tests/unit/donnees/poursuite-obstacles.test.mjs`) ; parcours `tests/poursuite-v5-browser.mjs` et `tests/poursuite-hors-combat-browser.mjs` ; contre-vérification indépendante, onze constats corrigés (les corrections n’ont pas eu de seconde relecture indépendante).

## 3.49.0 — Monture d’un PJ déclarée sur sa fiche en ligne (publiée le 16/11/2026)

Cadrage et décisions du MJ du 16/11/2026 : `docs/specs/monture-depuis-fiche/spec.md`. Publiée avec les fiches 2.41.0 (champ « Monture », fonction `executeFicheCommand` redéployée).

- **Sur la fiche.** Le joueur choisit sa monture au bureau parmi les animaux « dressés comme monture » du bestiaire, avec un nom facultatif : `monture: null | { espece, nom }`, où `espece` est l’identifiant du profil dans le bestiaire. Champ absent = l’outil ne touche à rien ; `null` = retrait explicite.
- **Liste partagée.** `js/data/montures-fiches.js`, générée depuis le bestiaire par `node tools/build-fiche-mounts.mjs` (`--check`) et recopiée dans les fiches par `node tools/recopier-donnees-communes.mjs`. 68 montures au 16/11.
- **« Mettre à jour les PJ ».** L’outil lit la monture, crée ou met à jour le profil `monture-<id>` (même construction que la déclaration à la main, `buildMountProfile` dans `js/core/mounts.js`) et l’annonce dans l’aperçu : création, nouvelle déclaration d’un profil existant, renommage, remplacement, retrait, désaccord, clé inconnue.
- **Qui l’emporte.** La fiche quand son champ a changé depuis la dernière lecture ; sinon l’outil garde la sienne et l’aperçu le signale, y compris quand la fiche dit « aucune monture ». Le nom ne suit la fiche que si elle a changé. Même espèce : le profil n’est pas reconstruit (image choisie, PV et retouches gardés), y compris après un retrait.
- La monture ne part pas dans « Envoyer aux fiches ». L’image du pion reste choisie dans la Réserve.
- Restes connus : quelques montures n’ont pas de nom français dans le bestiaire, et la liste contient un individu nommé et un profil de groupe ; si l’espèce change alors que l’ancienne monture est en combat, son pion reste dans la rencontre (comme pour un changement à la main).
- Preuves : suite unitaire à la fusion (voir ci-dessous) ; `tests/unit/combat/montures-fiche.test.js` (16) ; parcours `tests/monture-fiche-browser.mjs` par l’interface réelle, sans réseau ; contre-vérification indépendante des deux dépôts, constats corrigés. Non vérifié : la carte « Monture » du bureau des fiches dans un navigateur.

## 3.48.1 — Petits restes classés le 15/11 : relecture du compte, fuite d’un Brisé engagé, bestiaire verrouillé (publiée le 15/11/2026)

Seize petits restes et sujets en sommeil tranchés par le MJ le 15/11/2026 (classés ou à traiter). Cette version livre les petits lots.

- **Relecture du compte en ligne.** La base temps réel retire à l’écriture les listes vides et les valeurs nulles. Un état relu du compte (second appareil, stockage local vidé) cassait ensuite les soins (« registre de convalescence invalide »), les actions payées et les quotas (« Registre des usages invalide »), les réactions (« Opportunité de réaction invalide », Assaut furieux bloqué) et la fuite d’un Brisé. La forme canonique est restaurée au point de lecture, en copie, sans réécrire les données ; les vraies erreurs restent refusées (`js/core/v5-aftermath.js`, `v5-action-costs.js`, `v5-reactions.js`).
- **Synchronisation en schéma 4** vérifiée sur l’émulateur : écriture et relecture à l’identique, migration 3 → 4 sans perte, refus d’un autre compte, d’un invité et d’un schéma inconnu (`tests/cloud-schema4-emulator.mjs`, ajouté à `npm run test:firebase-emulators`).
- **Fuite d’un Brisé engagé.** Le panneau « Brisé · fuite obligatoire » bloquait avec « Fuite engagée non raccordée ». Il demande maintenant les deux confirmations que le moteur attend (fuite engagée confirmée, attaques gratuites résolues) ; le moteur est inchangé.
- **Bestiaire.** L06, L13, L23 et L24 se régénèrent à l’identique : les corrections de la v3 du Livre de base et la règle yards = mètres, faites à la main dans les fichiers, sont reportées dans le générateur. Verrou : `node tools/build-bestiary-profiles.mjs --check`. Le corpus L06 reste sur le PDF v2, corrections v3 par la table `V3_PATCHES`.
- **Onglet des montures.** L’index dit combien de montures contient chaque livre (`counts.mounts`) ; l’onglet charge 14 livres au lieu de 29, tous si « tout le bestiaire » est coché.
- **Référentiel.** Équipement rafraîchi depuis la feuille du 15/11 : seul l’effet de « Précise » change (+1 DR à tout Test réussi pour attaquer). Magie et talents intacts.
- Classés par le MJ, à ne plus proposer : découpage des gros fichiers (`ARCH-01`, `02`, `11`), barres d’état des pions de la carte, limites de la Comète et de la convalescence, tache de sang du cas théorique, PNJ nommés sans image propre, note de « Pointue » dans la feuille.
- Restes connus, décidés « à traiter » : poursuite selon le Livre de base V5 p. 158-159 (le code actuel à distance de 1 à 10 n’est pas cette règle), avec une vraie attaque gratuite à la fuite et l’Élan dépensé par adversaire ; monture d’un PJ lue depuis sa fiche (livrée en 3.49.0) ; miracles narratifs en simple rappel. Les registres d’usages et de réactions sont prouvés avec une imitation de la base, pas sur l’émulateur.
- Preuves : suite unitaire 6285 + 202 (un garde-fou de registre corrigé ensuite) ; socle navigateur 16/16 ; parcours `tests/brise-engage-fuite-browser.mjs` ; émulateurs verts ; onglet des montures vu dans le navigateur.

## 3.48.0 — Images des pions depuis la bibliothèque de Map Display, bestiaire en dossiers, trois livres ajoutés (publiée le 15/11/2026)

Cadrage, décisions du MJ et tâches : `docs/specs/images-pions/` (`spec.md` CA1 à CA41, `questions-profils.md`). Feu vert du MJ le 15/11 ; carte poussée avant l’outil. Images de `maps/tokens/` versionnées dans la carte le 15/11 (981 images ajoutées, 9 de la racine refaites dont les cinq PJ, environ 196 Mo ; garde-fou vert). Passe finale d’appariement faite le 15/11, puis lot 17 du MJ (12 illustrations) : 999 images dans la table, 876 exactes, 77 approchées, 46 sans profil par décision (dont les images de forme) ; plus aucune illustration à créer.

- **Images des pions.** Une créature du bestiaire arrive sur la carte avec son image automatique (table `js/data/token-images.js`, générée depuis `tools/token-images.csv`), y compris ajoutée au combat sans passer par la réserve ou invoquée. Le MJ peut choisir une image de la bibliothèque sur tout profil de réserve et sur une monture (champ facultatif `tokenLibraryImage`, sans migration) ; elle l’emporte sur l’automatique et s’exclut avec l’image importée. Vignettes dans la réserve ; un PJ n’envoie toujours pas d’image.
- **Formes bestiales.** `formImageUrl` au contrat de liaison : le pion prend l’image de la bête selon le vent (`-bete`, `-vie`) et retrouve la sienne au retour, PJ compris. Prendre ou quitter une forme n’est plus lu comme une blessure par la carte.
- **Carte.** Chemin de bibliothèque accepté dans `imageUrl`, règle du chemin unique dans l’outil, le générateur et la carte ; le site publié embarque les images de la table ; garde-fou `tests/tokenImages.test.mjs` ; un pion délié perd son image de forme.
- **Bibliothèque de bestiaire.** Navigation par dossiers (`js/data/bestiary-folders.js`, classement `tools/token-images-categories.csv`), fil d’Ariane, filtres bornés au dossier ; nom français d’abord, à l’affichage, au tri et à la copie en réserve.
- **Bestiaire.** Ours et Pigeon (L05) ; L28 *Le Pouvoir derrière le Trône* (64 profils, extracteur étendu au français) ; L29 *Tome de la Corruption* (50) et L30 *Le Seigneur liche* (23), V2 convertis par la règle unique `tools/lib/bestiary-v2.mjs` (`docs/specs/images-pions/conversion-v2-v5.md`, tables validées par le MJ) ; Vampires lahmianes (L27) ; L90 « Maison (MJ) », 33 profils de décision du MJ : cinq variantes de troupe et vampires pirates, les sept cultistes de la Main pourpre, vingt profils individuels tirés de profils de groupe, le Roi des Tombes de Khemri.
- **Illustrations à créer.** `node tools/list-missing-token-images.mjs` écrit `docs/specs/images-pions/illustrations-a-creer.md`, par dossiers.
- Outils : `build-token-images`, `list-missing-token-images`, `build-bestiary-folders`, `recopier-donnees-communes` (table et contrat recopiés dans la carte), chacun avec `--check`.
- **Transformation de Kadon** (CA41, 15/11). Le pion prend l’image du monstre (`maps/tokens/monstres/transformation-kadon/`, `form: { monster }` dans la table, une image sans variante de vent) et retrouve la sienne à la fin ; un monstre sans image laisse le pion inchangé. Aucun changement côté carte (`formImageUrl`).
- Restes connus : les individus nommés sans pion propre gardent l’image générique de leur espèce ; une perte de PV enregistrée dans le même rafraîchissement qu’un retour de forme n’envoie pas de sang (aucun parcours réel trouvé) ; L06, L13, L23, L24 ne se régénéraient pas à l’identique (corrigé en 3.48.1).
- Preuves : à la fusion, suite unitaire 6260 + 201 verte ; porte de la carte (`pnpm run verify`) verte : 816 unitaires (2 sautés), 326 parcours navigateur (15 sautés), 4 gestes ; recette locale `tmp/recette-images-pions/RAPPORT.md` (10 scénarios conformes) ; deux contre-vérifications indépendantes, constats clos. Socle navigateur de l’outil non relancé en entier après les dernières corrections de données ; image de Kadon prouvée par tests unitaires, pas rejouée dans le navigateur.

## 3.47.2 — Reliquat de l’audit du 08/11 tranché le 13/11 : accessibilité gardée par un parcours, Campagne, bestiaire, hygiène des tests (13/11/2026)

Rien de visible à la table.

- `COMP-ACCESSIB-10` : parcours `tests/accessibilite-browser.mjs` dans le socle (16 parcours) : débordement à 390 px et en bureau, noms accessibles, focus des fenêtres, sur Préparer, Jouer, Campagne et Bibliothèque ; aucun défaut trouvé, liste d’exceptions vide.
- `CAMP-04` : l’écran Campagne lit l’horloge par `Store.getCampaignSeconds()` ; gardes `typeof` retirées. Les autres appels à `getFullJSON` (`ARCH-07`) restent, décision du MJ.
- `CAMP-12` : statut, résumé et regroupement des personnes de Campagne en fonctions pures testées, `js/ui/campaign-model.js`.
- `COMP-ZONESNON-06` : un seul chargeur de bestiaire, `js/core/bestiary-loader.js`. L’onglet des montures charge encore tous les livres : l’index ne dit pas lesquels contiennent des montures.
- Parcours : `lot2-v5-25-release-browser` et `f2-j-review-browser` retirés (doublons) ; `recette-g-c20-browser` et `lot2-v5-23-control-browser` gardés.
- `TESTS-05` : preuves du test des prières copiées dans `tests/fixtures/divin-sources/`. `TESTS-11` : scripts npm de lots clos retirés. `COMP-ARBITRAG-02` : `browser-startup` échoue en nommant la cause si la révision de référence manque. `COMP-DEPLOIEM-03` : `npm run test:firebase-emulators`.
- Laissés sur décision du MJ : `ARCH-06`, `ARCH-09`, `ARCH-13`. Clos sans objet : `TESTS-03`, `COMP-DEPLOIEM-06`.
- Preuves : suite unitaire 6224 + 159, socle navigateur 16/16.

## 3.47.1 — Doublons du moteur supprimés, Précise = Pointue (13/11/2026)

- `REGLES-02` : un seul choix « DR ou Désavantage » pour les pénalités d’États.
- `REGLES-03` : un seul cumul « meilleur bonus, pire malus » (Caractéristiques, PA, résumé des Tests).
- `REGLES-06` : clés de Caractéristiques tirées d’une seule source, `js/core/carac-keys.js`.
- `REGLES-11` : qualités d’armes comparées par identifiant canonique (`isQuality`, `hasQuality`). Décision du MJ (13/11) : Précise se lit comme Pointue partout (alias du registre, +1 DR sur une réussite, un seul +1 DR si l’arme porte les deux) ; l’ancien +10 V4, jamais appliqué, est retiré.
- `REGLES-12` : copie jamais exécutée du refus de cumul des prières retirée, la table du moteur fait foi.
- Preuves : tests de caractérisation `tests/unit/refactor/doublons-regles-*.test.js`, suite unitaire 6213 + 159, socle navigateur 15/15.

## 3.47.0 — Soins hors rencontre, blocages de sorts par le moteur, données communes aux trois dépôts (13/11/2026)

Soins hors rencontre (`CAMP-10`) : spec, plan et tâches dans `docs/specs/soins-hors-rencontre/`.

- Personnages suivis : un personnage persistant existe entre deux rencontres avec ses PV, ses États et ses Blessures Critiques. Hors rencontre, il est soignable depuis Campagne sous l'identifiant `suivi:<id>` (`js/core/aftermath-subjects.js`).
- Nom stable : chaque suivi enregistre à son ouverture « participant — rencontre » ; « Suivi hors rencontre N » et « Participant absent » disparaissent.
- Fin du combat et retrait d'un participant : PV, États et Blessures Critiques sont reportés ; un PJ lié à une fiche est suivi d'office ; pour un PNJ, une créature ou un PJ sans fiche qui a un suivi ouvert, une fenêtre de l'outil demande « Garder » ou non (sinon ses suivis sont archivés). Un seul ↶ annule tout.
- Campagne : participants de la rencontre, puis personnages suivis hors rencontre avec leurs PV ; mêmes opérations (soin, infection, chirurgie, clôture, séquelles, maladies, pertes, cicatrices) ; soigneur au choix parmi les participants, les personnages suivis et un soigneur extérieur (nom, score, Bonus d'Intelligence, talent Chirurgie saisis).
- Temps : les Tests quotidiens de Résistance d'une blessure non bandée sont demandés pour tout personnage suivi, en rencontre ou non.
- Retour en rencontre : un PJ lié à une fiche retrouve son personnage suivi sans choix ; un PNJ gardé n'entre que s'il est choisi sur la ligne de la rencontre dans Préparer ; un seul exemplaire par personnage.
- Sauvegardes : schéma 4. À la mise à jour, un ancien suivi d'un PJ à fiche est rattaché à son personnage suivi, les autres anciens suivis sans participant sont archivés (une ligne de journal en donne le nombre). « Envoyer aux fiches » : aperçu inchangé.
- Règles Firebase : `firebase.database.rules.json` (schémas 3 et 4) déployé le 13/11/2026, avant la publication.
- `REGLES-10` : Chant vivifiant, la créature dormante perd son prochain Tour (ni Action, ni Mouvement, ni défense active) ; Acceptation du Destin, la Fuite et la fuite d’un Brisé sont refusées, le Désengagement et Se cacher restent permis. Le moteur refuse, le plateau grise en nommant le sort (`js/core/v5-spell-restrictions.js`).
- `ARCH-10` : toute lecture de sauvegarde passe par la chaîne `SCHEMA_MIGRATIONS` ; une sauvegarde d’une version plus récente est refusée sans être réécrite ; mode d’emploi dans le README, section « Version des sauvegardes ».
- `FICHES-05`, `COMP-LIAISONS-06` et `-10`, `REGLES-07` : espèces et constantes de la liaison carte dans une source unique, `js/data/donnees-communes.js`, recopiée dans Map Display et les fiches par `node tools/recopier-donnees-communes.mjs` (`--check` détecte une dérive).
- `ARCH-03` : plus aucun cycle d’imports dans `js/` (14 modules feuilles, ré-exports conservés) ; garde-fou `tests/unit/outillage/cycles-imports.test.js`.
- `ARCH-08` : 32 exports jamais utilisés retirés.
- Preuves : suite unitaire 6191 + 159, socle navigateur 15/15. Non essayé en conditions réelles : la synchronisation du compte en schéma 4.

## 3.46.0 — Montures et Rapace du Bestiaire V2, Forme bestiale élargie, reliquat de l’audit du 08/11 (11/11/2026)

- Bestiaire (règle maison du MJ) : livre `L27`, Bestiaire du Vieux Monde (WJDR V2), avec six montures déclarables (Cheval de guerre, Cheval de selle, Coursier elfique, Destrier, Destrier du Chaos, Poney) et le Rapace, convertis en V5 par `tools/build-bestiary-l27.mjs` (Blessures selon la formule V5, sabots comme le Cheval V5) ; le livre est dans le cache hors ligne.
- Magie (règle maison du MJ) : Forme bestiale accepte l'Ours, le Pigeon et le Serpent du livre de base V4 ; les invocations divines gardent la liste V5 des six bêtes.
- Interface : sur le plateau des mêlées, les cartouches d'une zone se rangent côte à côte sur la largeur ; le panneau de résolution ne déborde plus à 390 px quand un menu de défense a un libellé long (talent Petit).
- Sauvegarde (`COMP-ZONESNON-07`) : le fichier exporté n'embarque plus l'historique d'annulation ; la partie en cours garde le sien, et l'import repart comme avant d'un historique neuf.
- Démarrage (`BOOT-02`, `BOOT-07`, `BOOT-09`) : sans stockage local (IndexedDB), la synchronisation du compte ne s'attache plus et l'état l'annonce au lieu d'échouer en boucle ; un échec d'initialisation de Firebase a son propre état, « Compte indisponible », et un bouton « Réessayer la connexion » dans le menu ; icônes PNG d'installation (192, 512, masquable, Apple) produites par `tools/build-app-icons.mjs`, avec `id`, `scope` et `lang` au manifeste.
- Liaison Map Display (`MAP-01`, `MAP-04`) : `tools/serve-liaison.mjs` refuse un dossier de la carte sans `js/app/mjLink.js` (option `--check`) ; `campaignName`, jamais envoyé ni lu, est retiré des deux copies du contrat, sans changement de version du protocole.
- Hygiène (`CAMP-07`, `CAMP-09`, fins de ligne) : six règles CSS orphelines retirées, cinq documents de lot périmés rangés dans `docs/archives/campagne-jouer/` ; `.gitattributes` impose le LF à tout fichier texte, quel que soit le réglage de la machine.
- Outillage de tests (`CAMP-08`, `COMP-ARBITRAG-03`, `TESTS-07`, `TESTS-09`, `TESTS-10`, `HYG-12`) : serveur de test partagé (`tests/helpers/static-server.mjs`), index des parcours (`tests/parcours.json`, socle de 15 parcours avant publication : `npm run test:browser-socle`), parcours de release qui construisent leur export, Playwright 1.65.0 ; détail et doublons à arbitrer dans `docs/MENAGE_PARCOURS_11_11_2026.md`.
- Cadrage (`CAMP-10`) : spec, plan et tâches des soins hors rencontre dans `docs/specs/soins-hors-rencontre/`, validés par le MJ ; rien n'est encore codé.

## 3.45.1 — Correctifs du reliquat de l’audit du 08/11 (09/11/2026)

- Contrats de sorts (`REGLES-05`) : l'admissibilité de Taille des cibles passe par `creatureSizeOf` (`js/core/creature-size.js` : traits `Taille (...)` / `Size (...)` et mots de taille nus, champ `size`, espèce de PJ) au lieu d'une expression régulière sur les traits qui classait Monstrueuse en Énorme et déclenchait des faux positifs sur `"monstr"`.
- Liaison et écriture sur les fiches (`FICHES-01`, `FICHES-06`, `COMP-LIAISONS-01`, `04`, `07`) : une base de compteur non chaîne ou une base de caractéristique non entière sur une fiche ancienne est signalée « à faire à la main » (`reason: 'base-unknown'`) au lieu de provoquer un conflit permanent à l'envoi ; `applyConflictChoice` refuse booléens et entiers négatifs sur une base de caractéristique ; une espèce explicitement vide sur la fiche (`race: ''`, distincte d'un champ absent) émet un avertissement `race-missing` en conservant le Mouvement du profil ; le champ mort `extensions.ficheHealthWarning` n'est plus écrit et est nettoyé à la synchronisation.
- Référentiel et import (`COMP-ZONESNON-02`, `03`, `04`, `05`) : suppression du fichier mort `js/data/keywords-fallback.json` (et de son entrée dans `sw.js`) ; alignement de l'empreinte SHA-256 du miroir CSV « Mots Clés Armes et Armures » dans `js/data/reference-snapshot.json` et dans `tools/generate-reference-catalog.mjs` ; désactivation du bouton « Créer 0 profil » quand l'aperçu d'import de texte ne trouve aucun profil ; mention explicite du remplacement de l'horloge de campagne, des suivis et des rencontres dans la confirmation de chargement d'une sauvegarde.
- Accessibilité, clavier, synchronisation et Service Worker (`COMP-ACCESSIB-03`, `06`, `08`, `09`, `CAMP-05`, `BOOT-03`, `04`, `06`) : restauration du focus sur le bouton « Avancer le temps » (`[data-campaign-focus="advance"]`) après fermeture de la fenêtre de temps de campagne ; contraste AA (6,19:1) des boutons `.workspace-primary` en thème sombre dans Jouer via `var(--button-text, #fff)` ; touches `Home` et `End` sur les onglets principaux ; annonce de `Ctrl+Z` / `Ctrl+Maj+Z` à côté de `⌘Z` / `⌘⇧Z` ; maintien du statut `offline` quand la lecture initiale RTDB échoue à l'ouverture de session et rappel d'erreur sur `onValue` ; réinitialisation de `dbPromise` sur `onversionchange` / `onerror` / `onblocked` et fermeture de l'instance IndexedDB précédente lors d'un `switchContext` ; repli vers `./index.html` en cache pour les requêtes de navigation hors ligne dans `sw.js`.

## 3.45.0 — Tests secondaires par l’agrégateur commun, Obstiné partagé et libellés « Chance » (09/11/2026)

- Chantier Q6 (`docs/specs/tests-secondaires-agregateur/`) : tous les Tests secondaires (désengagement, lancer/Focalisation/Dissipation/méditation/relance et déploiement Cadai/Arcanes impitoyables, Prière et Courroux, Chevaucher/Désarçonnement/chute après Croche-pied/échappée de Filet, Corruption/poursuite/Sprint et Se cacher de Brisé/extraction de projectile, recul d'arquebuse/Warp Blade/convalescence/Déterminé, contrats de sorts et sorts au fil des tours) passent par le calcul commun extrait de `buildCombatTest` (`js/core/v5-test-modifiers.js` : États et exceptions, séquelles durables et à circonstance, talents, couches de sorts et de prières, plafonds Obstiné et Distrait, restrictions Inconscient/Surpris et distinction actif/subi).
- Chaque question d'État ou de séquelle posée par un Test secondaire dispose de son champ de réponse dans l'écran concerné et reste modifiable après saisie ; le détail par source (modificateurs retenus et écartés barrés) s'affiche en magie, en Prière et au désengagement comme au combat.
- Obstiné (`talent-strong-minded`, V5 p. 127, CA35/CA36) est proposé avant le jet sur l'ensemble des Tests secondaires et partage un quota unique « une fois par séance » par personnage entre tous les écrans et le combat (consommé uniquement à l'application, restitué à l'annulation, réinitialisé au début d'une nouvelle séance).
- Les points de Chance s'affichent désormais « Chance » (au lieu de « Fortune ») dans toute l'interface, les messages et les échanges avec les fiches (`docs/RENOMMAGE_CHANCE_FORTUNE.md`).

## 3.44.0 — mise à jour des PJ plus sûre, Skink Petit, hygiène (08/11/2026)

- « Mettre à jour les PJ » ne rattache plus un personnage persistant à une fiche par son seul nom : un homonyme sans lien est proposé dans l'aperçu avec une case « Rattacher », et il n'est modifié que si le MJ la coche.
- L'aperçu liste nommément, pour chaque PJ, le Mouvement, les compteurs (ancienne → nouvelle valeur : Destin, Fortune, Résilience, Péché, Corruption), les talents et objets ajoutés ou retirés, et les personnages persistants modifiés. Cette liste est calculée sur une copie de l'état par la même fonction que la mise à jour.
- Skink et Skink caméléon en Taille Petite (Lustria p. 160, bestiaire p. 136 et 142), comme leurs Blessures.
- Dépôt : `CLAUDE.md` des règles de travail, tests unitaires lancés par GitHub Actions à chaque push, README réécrit en document d'entrée, documents périmés archivés, worktrees et branches fusionnés retirés (tags `archive/*`), cadrage de Q6 (`docs/specs/tests-secondaires-agregateur/`).

## 3.43.0 — espace Campagne (08/11/2026)

- Nouvel onglet Campagne, troisième entre Jouer et Bibliothèque (raccourci « 3 », Bibliothèque sur « 4 ») : temps de campagne, synthèse des suivis par personnage (blessures, critiques, maladies, séquelles, convalescence) et soins contextuels au personnage sélectionné. « Suites de combat » dans Jouer renvoie vers Campagne ; Jouer passe en pleine largeur avec rail latéral repliable.
- Limite connue : les soins et tests de convalescence ne visent que les participants de la rencontre en cours. Un suivi rattaché à un participant absent est affiché sous « Suivi hors rencontre » et peut seulement être archivé ; la continuité des soins entre rencontres demande d’abord un contrat d’identité (voir `docs/archives/campagne-jouer/CAMPAGNE_LOT2.md`).
- Le contenu avait été déployé le 07/11 (`babe2ba`) sans changement de version, avec un cache suffixé à la main ; la 3.43.0 rétablit la règle « nom du cache = `wfrp-cache-v<version>` » et ajoute `node tools/bump-version.mjs X.Y.Z`, qui écrit la version dans ses sept emplacements (les notes restent à rédiger).

- Correctifs du lot A (08/11/2026, `git log 50d3592..5db1628`, publiés avec la 3.43.0) : touche 3 pour Campagne et 4 pour Bibliothèque, raccourcis inactifs avec Ctrl/Alt/⌘ ; quatre onglets sur une ligne à 390 px ; `aria-labelledby` orphelins de `index.html` corrigés ; une entrée invalide de `divineEffects` ne bloque plus le recalcul des couches de magie ; un `localStorage` interdit ne fait plus échouer `main.js` ; une fiche réinitialisée (tombstone) n’est plus lue comme disponible ; liaison Map Display : une monture fusionnée n’est plus « À poser » et la distance vers elle est mesurée, les PV max du participant l’emportent sur ceux du profil, les indicateurs « posé » sont vidés à chaque instantané et à la déconnexion, l’instantané envoie toujours `mj.engagements` même vide (contrat §10 précisé) ; `safe-storage.js` dans le précache du service worker ; `npm test` borné à `tests/unit`.

## Preuves navigateur finales

Les tests Playwright utilisent Chrome local, un serveur HTTP loopback temporaire, un profil isolé, le module Firebase simulé et les service workers bloqués. Les requêtes externes sont refusées.

- `node tests/browser-index.mjs` — PASS. Navigation réelle, import texte E17, recherche `Attaque`, règles `Sonné`, rencontre, résolution, suspension/reprise, personnage persistant et clôture.
- E15 dans le même test — jauge `horloge-recette` créée à `0/3`, événement structuré prévisualisé, conséquence appliquée explicitement, puis valeur relue à `1/3`.
- E16 dans le même test — comparaison de 14 cibles réelles, application du seul candidat choisi, avec une seule carte de piste modifiée (`Participant de démonstration 03`). Le parcours de simulation périmée par seconde page est également conservé et abandonné sans effet.
- E04 dans le même test — export puis chargement réel d’une sauvegarde, aperçu du point `Import remplacé`, restauration confirmée, rechargement, profils `Garde importé`/`Éclaireur importé` retrouvés et horloge de la galerie absente.
- `node tests/browser-smoke.mjs` — PASS. CRUD de profil via les cartes Bibliothèque, composition et lancement, résolution physique, PV, undo/redo, édition/retrait d’un participant, reload et clôture.
- `node tests/browser-workspace.mjs` — PASS. Navigation, suivi du combattant courant, panneau contextuel, focus/clavier, quinze acteurs et responsive 1440/900.
- `node tests/browser-e05.mjs` et `node tests/browser-e05-legacy.mjs` — PASS.
- `node tests/browser-offline.mjs` — PASS 5/5 ; `tests/sw.test.js` — PASS 8/8.

Captures produites par l’index réel :

- [`mj-index-play-15-dark-1440.png`](/private/tmp/mj-index-play-15-dark-1440.png) — 1440 px, quinze participants, actions et thème sombre.
- [`mj-index-play-15-dark-900.png`](/private/tmp/mj-index-play-15-dark-900.png) — 900 px, même scène ; la largeur du document reste dans la fenêtre.
- [`mj-index-1440.png`](/private/tmp/mj-index-1440.png) et [`mj-index-900.png`](/private/tmp/mj-index-900.png) — vues Préparer aux deux largeurs.

## Historique technique conservé

Les lots ont ajouté une enveloppe v2 migrable, un stockage IndexedDB transactionnel, une file outbox séparée du journal local, un protocole de synchronisation CAS, des commandes persistantes pour l’historique, les dégâts et l’ordre, puis les projections de scène, rappels, événements, jauges, clôture et simulation. Les modules concernés restent dans `js/core/`, avec les vues de séance dans `js/ui/` et les tests ciblés dans `tests/`.

## Limites et périmètre

- Les règles Firebase v1/v2 sont publiées en production : v1 est en lecture seule par UID et v2 autorise lecture/écriture uniquement par UID propriétaire. Les tests simulateur ont confirmé le refus d’un invité, l’accès de son propre UID et le refus d’un autre UID. Les règles n’ont changé aucune donnée ; une sauvegarde serveur a été exportée le `23/09/2026`.
- L’import réel de sauvegarde vers le compte v2 a été confirmé aujourd’hui par un rechargement à l’état « Synchronisé » et un export Firebase v2 à révision 2 (26 profils, 4 participants, 12 lignes) ; aucun test multi-clients n’a été réalisé. Le commit `a34f301` a été publié et vérifié sur GitHub Pages.
- La comparaison E16 vérifie l’application d’un choix unique et l’effet visible sur une cible ; les détails algorithmiques complémentaires restent couverts par les tests cœur.
- La restauration E04 est exercée par export/chargement réel dans le navigateur local ; elle vérifie l’aperçu, la confirmation, la persistance et le rechargement, sans prétendre valider un incident de production.

## Historique des versions 3.33.0 à 3.43.0 (repris du README le 08/11/2026)

Application web progressive (PWA) d’assistance au Maître de Jeu pour **Warhammer**, avec combat **V5** et fiches importées.

**Version 3.43.0** : nouvel espace Campagne (troisième onglet, entre Jouer et Bibliothèque) qui rassemble le temps de campagne, la synthèse des suivis des personnages (blessures, critiques, maladies, séquelles, convalescence) et les soins contextuels au personnage sélectionné ; « Suites de combat » dans Jouer renvoie vers Campagne ; Jouer réorganisé en pleine largeur avec rail latéral repliable. Limites : les soins et tests de convalescence ne s’appliquent qu’aux participants de la rencontre en cours ; un suivi rattaché à un participant absent est seulement affiché (« Suivi hors rencontre ») et peut être archivé, sans soin possible hors rencontre.

**Version 3.42.5** : une arme ou une armure sans mots-clés ne bloque plus le calcul d’une attaque ni l’import de l’inventaire d’une fiche ; une erreur imprévue du calcul affiche son détail.

**Version 3.42.4** : égalités d’Initiative simplifiées (à deux, les deux d100 demandés ensemble et le vainqueur agit en premier, ou le MJ choisit directement qui commence ; le Test d’I ne demande plus de compétence pour Vagabond ou Grimpeur) ; une rencontre nommée « test » n’enregistre rien, n’envoie rien aux fiches et revient à l’état d’avant à sa fin.

**Version 3.42.3** : la caractéristique déclarée sur chaque ligne de compétence de la fiche fait foi (une compétence rattachée à la Dextérité sur la fiche garde la Dextérité).

**Version 3.42.2** : un PJ Ogre (Taille Grande par son espèce) reçoit +BF aux dégâts de mêlée normaux (V5 p. 360).

**Version 3.42.1** : les PJ prennent la Taille de leur espèce lue sur la fiche (Halfelin et Gnome Petits, Ogre Grand), sauf Trait ou Taille explicite ; le talent Petit voit l’écart de Taille.

**Version 3.42.0** : « Envoyer aux fiches » (menu ⋯) réécrit en fin de séance les valeurs durables des PJ sur leurs fiches (Destin, Fortune, Péché, Corruption, pertes de caractéristique sur la Base, Prière, talents retirés par un rejet définitif, objets retenus ou rendus par le Courroux, Suivi du MJ : pénitences, séquelles permanentes, cicatrices, maladies, mutations manifestées), avec aperçu à cocher, conflits tranchés par le MJ et « Annuler le dernier envoi » ; marque « Manifestée » sur les mutations confirmées.

**Version 3.41.0** : liaison avec RPG Map Display (l’outil pilote les pions de la carte : image, PV, états, taille, portées effectives, montures fusionnées en un pion, morts et leurs effets ; retours de la carte : posé / à poser, engagements suggérés au contact, distance préremplie, Course signalée) et voyant de liaison dans la barre du haut ; moteur d’effets unifié pour tous les Tests (États, talents, sorts et prières, surnombre, qualités, montures) avec détail des modificateurs, source, montant et effets écartés barrés ; questions d’États en magie modifiables ; contenu de supplément chargé sans code (js/data/v5-supplements.json) ; mot-clé Barrakul ; couleur du pion au profil ; fiche en onglets compacts ; Circonstances en onglet du panneau latéral ; barre de PV avec aperçu des dégâts ; Temps de campagne, Événements et Rappels dans la barre du haut, avec « Terminer le combat » (filet : « Annuler ») ; armes des profils L12 en français ; barre du haut sans débordement à 390 px.

**Version 3.40.0** : montures déclarées dans le profil (animal du bestiaire dressé comme monture), qui entrent en combat avec leur cavalier, et pastille « À pied / Monté » sur le jeton et la fiche, lue par les règles du combat monté ; champs V5 des fiches lus (Fortune, Péché, Corruption, familiers devenus profils du bestiaire, mots-clés de Haine et Sans peur) ; premier import d’une fiche qui crée le profil PJ ; Peur et Terreur alignées sur la V5 ; Fureur selon le livre de base (p. 364) ; rappels limités à ce que l’outil n’applique pas ; plein écran, tiroir des circonstances dans sa colonne, bouton « Lancer » sur chaque saisie de dés.

**Version 3.39.0** : plateau des mêlées à la place de la piste (engagements durables par paire, créés par l’attaque de mêlée et expirés après un Round sans attaque ; barre d’actions qui annonce les conséquences : Attaquer, Charger, Se désengager, Fuir, Tirer, Viser) ; surnombre et tir dans la mêlée déduits du plateau, forçables par le MJ ; circonstances de scène réglées une fois pour la rencontre, positions durables, « À régler maintenant » en tête du tiroir.

**Version 3.38.0** : Malice de Ranald sur les jets de profil et actions manuelles (CC par défaut en mêlée, sinon Caractéristique demandée) ; cavalier désarçonné à la mort confirmée de sa monture ; En Bon Ordre visible sur la fiche de l’allié ; sorts sur « Endurance » appliqués aux Tests de Résistance ; texte de Fortune selon la liaison à une fiche.

**Version 3.37.0** : corrections de la recette des parcours partiels (dé secondaire d’incident lancé pour les PNJ ; Souffle jusqu’à son dernier Round ; commandes de Régénération, têtes, Nuée et Venin dans l’Espace de séance ; payeur nommé dans la ligne de coût ; PA à saisir pour un appendice sans table propre ; motifs de refus lisibles).

**Version 3.36.0** : corrections de la recette 3.35.0 (tir double d’Arbalète à répétition enchaîné ; état d’arme lisible ; cibles d’Explosion et de Dispersion cochées par leur nom ; raison du rechargement affichée ; Larmes de Shallya sur le critique choisi ; reçu du lanceur ; boutons de perte au Chaos actifs ; créatures invoquées en cours de Round avec leur Initiative et leur rang ; aperçu de la pause de Focalisation avec les vrais DR).

**Version 3.35.0** : corrections de la recette manuelle 3.34.0 (renfort en cours de Round avec jet d’Initiative à son rang ; tir dans la mêlée dévié vers un autre engagé, touché d’office ; Larmes de Shallya ; empoignade et Tests de Force ; armes non reliées à l’inventaire en saisie manuelle ; Peur/Terreur et création de familier de retour dans Jouer ; un seul temps pour la campagne et la convalescence ; PA par membre, événements, Corruption et camp Neutre corrigés ; journal groupé par Tour ; attaques du bestiaire avec leur score).

**Version 3.34.0** : corrections de la recette du panneau d'action (grandes rencontres : prière, sort, critique, PV et Tour suivant ne sont plus refusés ; vraie cause affichée quand un résultat n'est pas appliqué ; jet d'incident avec « Lancer » ; attaque ratée gagnant le Test opposé expliquée ; « Ignorer » une Bénédiction de Protection pour une action ; confirmations Oui / Non en un clic ; prière simplifiée avec culte du profil ; lignes « À saisir » menant à leur champ).

**Version 3.33.1** : la mise à jour télécharge à nouveau tous les fichiers au lieu de reprendre d'anciennes copies du navigateur (l'outil ne démarrait plus après la 3.33.0 derrière un serveur local).

**Version 3.33.0** : panneau d'action refondu en trois étapes (action et cible, jets, résultat), pied « Appliquer » avec la liste des saisies manquantes, tiroir « Circonstances » regroupé par thèmes avec compteur, étiquettes PJ/PNJ et bouton « Lancer tous les dés des PNJ », menu « Sort, prière, Corruption… ».

## Anciennes notes de chantier V5 (magie, prières), reprises du README

### Clôture locale V5 : magie 3.15.0

Le chantier courant conserve 277 contrats et un catalogue aligné sur la feuille publique du 14 octobre. Les trois clauses de talents restantes ont des preuves Store/UI ; les effets assistés et familles différées restent explicites. [Bilan](docs/lot3/LOT3_FINALISATION_MAGIE.md), [rapport](docs/lot3/LOT3_RAPPORT_CLOTURE.md), [recette complète](docs/lot3/LOT3_RECETTE_3_15.md), [nouveautés MJ](docs/lot3/LOT3_JOURNAL_3_15_0.md). Génération reproductible : node tools/check-lot3-generation.mjs ; les commandes de recette nécessitent Edge Windows. Paquet courant 3.15.0 dans tmp/lot3/release-path.json, aucune publication.

### Historique du chantier V5 : magie 3.14.0

La finalisation locale et le périmètre restant sont consignés dans [le bilan de magie](docs/lot3/LOT3_FINALISATION_MAGIE.md), avec [la recette 3.5](docs/lot3/LOT3_RECETTE_3_5.md). Les ingrédients sont exclus ; les 15 miracles sont seulement inventoriés. Le paquet de travail reste local et non publié.

### Prières, bénédictions et miracles V5 (3.16.0)

72 bénédictions (12 cultes) et 128 miracles (livre de base V5 et suppléments Archives of the Empire 3, Deft Steps Light Fingers, Power Behind the Throne Companion, Lustria, Up in Arms) sont déclarés par contrat sourcé dans le panneau « Prières divines » de Jouer. 52 miracles appliquent automatiquement leurs effets chiffrables (statuts « assisté » et « implémenté ») ; le reste s'affiche avec ses clauses et ses rappels MJ. Les 9 miracles de Myrmidia d'Up in Arms (V4, p.79) sont raccordés après arbitrage du MJ : 3 assistés (Commander la Légion, Effrayer l'Ennemi, Compétence Martiale), 6 manuels avec clauses et rappels ([adaptations](docs/divin/DIVIN_UP_IN_ARMS_ADAPTATIONS.md)). Cadrage : [docs/divin/PRIERES_CADRAGE_RESSERRE.md](docs/divin/PRIERES_CADRAGE_RESSERRE.md). Régénération des contrats : `node tools/build-v5-divine-contracts.mjs` puis `--check`.
