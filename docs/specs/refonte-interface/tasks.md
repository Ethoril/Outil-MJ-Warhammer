# Tâches · Refonte de l'interface

Spec : [spec.md](spec.md) · Plan : [plan.md](plan.md). Chaque lot se lance dans une **session neuve**, sur sa branche locale tirée de la branche de cadrage, après le feu vert du MJ (cadrage validé le 21/11/2026). Publication en une fois après E6 et la recette du MJ à la table (décision du 21/11).

| Lot | But | Modèle | Après | CA |
|---|---|---|---|---|
| E0 | Socle : fixture R20, parcours de mesure, police système, barre du haut unique, grille à zones | **Opus** | — | 1-3 (mesure), 21, 22 |
| E1 | Frise d'initiative | Sonnet | E0 · [P] avec E3, E5 | 4, 5 |
| E3 | Fiches compactes et menu ⋯ (retrait, sans monture, fiche complète) | Sonnet | E0 · [P] avec E1, E5 | 19 |
| E5 | Démarrage : tout faire entrer, initiative dans la case centrale | Sonnet | E0 · [P] avec E1, E3 | 11, 12 |
| E2 | Case « À décider » : les 26 décisions, mort subite en un clic | **Opus** | E3 | 7-10 |
| E4a | Mêlées en cartouches (clic = cible) et barre d'actions | Sonnet | E1 | 6 |
| E4b | Résolution compacte : circonstances en puces, ligne Distance, sortie des suites de combat | **Opus** | E2, E4a | 13-15, 15a, 15b, 20 |
| E2b | Fin de « À décider » : décisions 6, 12, 16, 17, 20, 21 branchées ; fenêtres d'effets V5 non modales ; fiche de la cible sans défilement avec une décision en attente ; arbitrage des séquelles d'un absent ; panneau de prière et résultat avec critique sans défilement | **Opus** | E4b · [P] avec E4c | 3, 7, 10, 16, 20 |
| E4c | Jouer son tour maintenant (commande annulable) et Charger sur la cible | **Opus** | E4b · [P] avec E2b | 24-27 |
| E6 | Recette : parcours complet, relevé coché, suite complète, notes de version | Sonnet | tous | 1-3, 16-18 |
| E7a | Jouer son tour maintenant : effets de début de tour de l'avancé (une seule fois) | **Opus** | E4c · [P] avec E7b, F1, F3 | 24, 25 bis |
| E7b | Maladies d'un absent dans Campagne ; Chance, Destin, Temps de campagne non modaux | Sonnet | E2b · [P] avec E7a, F1, F3 | 10, 16, 20 |
| F1 | Préparer sans défilement de page | Sonnet | E4c · [P] avec E7a, E7b, F3 | 23 |
| F2 | Campagne sans défilement de page | Sonnet | E7b · [P] avec F1, F3 | 23 |
| F3 | Bibliothèque sans défilement de page | Sonnet | E4c · [P] avec E7a, E7b, F1 | 23 |
| E8 | Recette finale : relevé recoché, mesures combat et trois espaces, suite complète, notes de version | Sonnet | tous | 1-3, 16-18, 23 |
| E9 | Rouges de la recette E8 : accessibilité (Temps non modal), fiches-pj, copie du contrat (ligne 250, mot pour mot), « Round » tronqué dans la barre du haut | Sonnet | E8 | 10, 17, 18 |
| E10 | Liaison « tour de jeu » de Map Display : `mj.turn` à chaque changement de tour et `null` en fin de combat, `map.ran` idempotent, `map.turnReset` (Action rendue, déplacement remis à zéro), contrat amendé et version 2, recette liaison dans la fiche de table | **Opus** | E9 | 28-32 |
| C1 | Carte (`E:/rpg-map-display`) : émettre `map.turnReset { ref }` à chaque annulation du mouvement du tour ; copies du contrat et des données communes (version 2) | Sonnet | E10 | 31, 32 |

## Règles communes (bloc collé en tête de chaque brief)

- Lire `CLAUDE.md`, la spec, le plan, `inventaire.md`, la maquette (`docs/specs/refonte-interface/maquette.html`, parti pris A), puis le brief.
- Le test d'un lot est écrit **avant** son code et échoue d'abord.
- Tests ciblés, un fichier par commande ; jamais un dossier ; tout parcours navigateur sous `timeout 120`. Pas de suite complète avant E6.
- Aucune attente de **règle** d'un test existant n'est modifiée. Un test de structure du DOM cassé par la refonte est adapté, avec une ligne de justification dans le rapport.
- Garde données : `git diff <base> -- js/core/ firebase.database.rules.json js/core/map-link*.js` vide (sauf E2 : `extensions.v5.suddenDeathDeclined` ; E4c et E7a : `extensions.v5.advancedTurn` et le passage du tour).
- Interface en français, aucune boîte native, police système. Interdits : modifier la spec ou le plan, pousser, `git stash`, `git add -A` / `git add .`, changer une règle pour faire passer un test.
- Commit local, fichiers nommés, message en français suffixé « (Claude) ». Rapport court : fichiers, sortie des commandes d'acceptation, hash, ce qui n'est pas vérifié.

## E0 · Socle
**But.** Poser la grille fixe de l'espace Jouer et l'outil de mesure, sans encore tout faire tenir.
**Fichiers autorisés.** `tools/build-r20-fixture.mjs`, `tests/fixtures/rencontre-r20.json`, `tests/refonte-ecran-browser.mjs`, `tests/unit/ui/contrastes-theme.test.mjs`, `MJ.css`, `js/ui/workspace.css`, `js/ui/workspace-view.js` (`renderPlay` et montage des zones seulement), `js/ui/combat-banner.js`, `js/ui/side-panel.js`, `index.html`, `sw.js`, `assets/fonts/*` (suppression).
**Tests d'abord.** (1) `refonte-ecran-browser.mjs` en mode « rapport » : imprime les mesures par étape, échoue si la page défile (échoue sur 3.56.0). (2) `contrastes-theme.test.mjs`.
**À livrer.** Fixture R20 (profils du bestiaire, pages citées) ; police système ; barre du haut avec round, au tour de, compteur de décisions (vide), Tour suivant ; grille `data-zone` où les blocs actuels sont relogés (ils peuvent encore défiler dans leur zone) ; la page ne défile plus.
**Acceptation.** `timeout 120 node tests/refonte-ecran-browser.mjs` : page sans défilement à chaque étape ; rapport des zones qui débordent encore (servira aux lots suivants) ; `node --test tests/unit/ui/contrastes-theme.test.mjs` ; `node --test tests/unit/ui/raccourcis-clavier.test.mjs` ; `npm run test:browser-socle` vert.

## E1 · Frise d'initiative
**Fichiers.** `js/ui/combat-frise.js` (nouveau), `tests/unit/ui/combat-frise.test.js`, `js/ui/workspace.css` (section frise), une ligne d'appel dans `renderPlay`.
**Tests d'abord.** Modèle : ordre, tour, joué, mort, Élan, monture, marque de décision (alimentée plus tard par E2 via `context.decisions`, vide sinon). Parcours : clic sur un portrait → fiche de gauche et barre d'actions de ce combattant, tour inchangé, bandeau « agit hors de son tour », cible inchangée.
**Acceptation.** Test unitaire ; étape « frise » du parcours ; zone `frise` sans débordement sur R20.

## E3 · Fiches compactes et menu ⋯
**Fichiers.** `js/ui/workspace-view.js` (`renderSheet`, `renderStateForm`, menu), `js/ui/fiche-details.js`, `js/ui/workspace.css` (section fiches), `tests/unit/ui/rencontre-retrait-monture-elan.test.js` (DOM seulement).
**À livrer.** Fiche acteur et fiche cible ≤ hauteur de leur zone sur R20 (PV ±, caractéristiques, PA, Élan, Chance, Destin, États, monture) ; tout le reste (compétences, talents, équipement, sorts et prières, rappels de Traits, blocs de créature) dans un panneau superposé ouvert par ⋯ ; menu ⋯ : retirer (avec ou sans monture, annulable), sans monture pour la rencontre, renommer, changer de camp, fiche complète, sorts et prières.
**Acceptation.** Parcours : zones `acteur` et `droite` sans débordement ; retrait puis Annuler ; sans monture ; test unitaire vert.

## E5 · Démarrage du combat
**Fichiers.** `js/main.js` (démarrage et initiative), `js/ui/workspace-view.js` (`renderPrepare` lancement, zone centrale avant le round 1), `js/ui/workspace.css`.
**À livrer.** Lancer une rencontre fait entrer tous ses combattants ; l'initiative se saisit dans la zone centrale (grille sur trois colonnes, Combat instinctif, égalités, camp surpris, monté / sans monture) ; la liste suit les entrées et retraits.
**Acceptation.** Parcours : lancement R20 → 20 actifs, saisie, ajout d'un renfort et retrait d'un combattant sans fermer quoi que ce soit, Commencer → round 1.

## E2 · Case « À décider »
**Fichiers.** `js/ui/combat-decisions.js` (nouveau), `tests/unit/ui/combat-decisions.test.js`, `js/ui/workspace-view.js` (retrait de la bannière de mort subite et des autres blocs de décision déplacés), `js/ui/resolution-panel/*.js` et `js/ui/v5-*.js` concernés (déplacement des formulaires), `js/core/store.js` (lecture/écriture de `suddenDeathDeclined` seulement), `js/ui/workspace.css`.
**Tests d'abord.** Une situation par décision du relevé §A (26) → une entrée avec ses options ; mort subite : Mort, Inconscient, Plus tard, Pas un figurant.
**Acceptation.** Test unitaire ; parcours : PNJ à 0 PV → carte visible dans la fenêtre, compteur, marque sur la frise, Tour suivant actif, décision en un clic.

## E4a · Mêlées et barre d'actions
**Fichiers.** `js/ui/workspace-view.js` (`renderTrack`, `renderPlateauActions`), `js/ui/workspace/plateau.js`, `js/ui/workspace.css`.
**À livrer.** Mêlées en cartouches (camp, PV, monture, engagements, Déplacer…) ; clic = cible ; barre d'actions en bas (actions de l'acteur + « ce qu'il peut faire d'ici »), sans numéros.
**Acceptation.** Parcours : clic cartouche → cible ; zone `bas` et partie mêlées sans débordement sur R20.

## E4b · Résolution compacte
**Fichiers.** `js/ui/resolution-panel.js`, `js/ui/resolution-panel/*.js`, `js/ui/combat-distance.js` (nouveau), `tests/unit/combat/distance-tir.test.js`, `js/ui/workspace-view.js` (`renderCenter`, panneaux secondaires), `js/ui/encounter-end-dialog.js`, `js/ui/campaign-workspace.js`, `js/ui/workspace.css`.
**Tests d’abord.** Six cas de tir : même `v5Context` et même aperçu qu’en 3.56.0 ; `tests/unit/ui/circonstances-pertinentes.test.js` (CA15a, CA15b).
**À livrer.** Circonstances : puces déduites + panneau « autres… » en colonnes ; ligne Distance ; d100 de déviation dans le pied seulement s'il sert ; magie, prières et corruption dans la résolution ; suites de combat sorties vers la fin du combat et Campagne.
**Acceptation.** Test unitaire ; parcours complet sans débordement de la zone `centre` sur R20.

## E6 · Recette
**À livrer.** `recette-fonctions.md` coché (chaque fonction du relevé, emplacement, clics) ; parcours complet vert ; suite unitaire complète verte ; notes de version ; captures avant/après pour le MJ ; recette du MJ à la table sur localhost, puis publication à son feu vert.

## E2b · Fin de la case « À décider » (ajouté le 21/11 après E2)
**Contexte.** E2 (commit 38fa9738, notes `refonte-e2-a-decider.md` du dossier partagé) a branché 20 des 26 décisions. `js/ui/combat-decisions.js` expose `publishDecision({ id, kind, titre, options, onChoose })` et `withdrawDecision(id)`.
**Fichiers.** `js/ui/workspace/plateau.js` (6 fuite et désengagement), `js/ui/v5-divine-panel.js` ou le panneau des prières (12 Péché et Courroux : si le moteur n'expose aucun état « Courroux en attente », le dire au rapport au lieu de l'inventer), `js/ui/encounter-end-dialog.js` (16 retrait, 17 fin de combat), `js/ui/map-link-feedback.js` (20 engagement suggéré par la carte), `js/main.js` (21 course sur la carte), `js/ui/v5-effect-dialog.js` (fenêtres d'effets V5 non modales : panneau dans la case ou superposé sans bloquer le reste, CA10), `js/ui/workspace.css` (zone droite), `tests/unit/ui/combat-decisions.test.js`, `tests/refonte-ecran-browser.mjs`.
**En parallèle avec E4c.** Dans `js/ui/workspace/plateau.js`, ne touche qu'à la fuite et au désengagement (E4c y refait « Charger ») ; dans `js/main.js`, ne touche pas à `advanceTurn` (E4c).
**Acceptation.** Les six décisions publiées et retirées dans la case (tests unitaires) ; aucune `dialog` modale ouverte pendant le combat dans le parcours, sauf la confirmation de « Terminer le combat » ; fiche de la cible sans défilement interne quand une décision attend ; parcours vert.

## E4c · Jouer son tour maintenant et Charger (ajouté le 22/11)
**Contexte.** Spec S2 bis (CA24, CA25) et S5 ter (CA26, CA27), plan §4 et §6. Aujourd'hui « Tour suivant » passe par `advanceTurn` (`js/main.js`), `nextTurn` (`js/core/combat.js`) et `computeNextTurn` (`js/core/turn-order.js`, via `js/core/store.js`) ; aucune commande ne donne le tour par anticipation. « Charger · nom » est construit dans `js/ui/workspace/plateau.js` (liste limitée à quatre ennemis libres).
**Fichiers.** `js/core/store.js` (nouvelle commande annulable), `js/core/turn-order.js` et `js/core/combat.js` (prise en compte du combattant avancé et de la reprise), `js/main.js` (`advanceTurn` seulement), `js/ui/combat-frise.js` et `js/ui/combat-banner.js` (« Jouer son tour maintenant », marque « a joué »), `js/ui/workspace/plateau.js` (Charger seulement : ne touche pas à la fuite ni au désengagement, que E2b branche en parallèle), `tests/unit/combat/jouer-tour-maintenant.test.js`, test unitaire du modèle de barre d'actions, `tests/fixtures/store-golden.json` (régénéré, ajouts seulement), `tests/refonte-ecran-browser.mjs`.
**Tests d'abord.** Tour avancé : Tour suivant revient au combattant attendu ; l'avancé est sauté à sa place ; round suivant dans l'ordre d'initiative ; Annuler rétablit tout ; refus si déjà joué. Charger : présent pour chaque ennemi non engagé avec l'acteur choisi comme cible, sans limite ; mention p. 163 et forçage si l'acteur est engagé ailleurs.
**Garde données.** `js/core/` change seulement pour cette commande et la lecture de ses champs facultatifs (absents = rien d'avancé) ; aucune migration ; `liaison-carte-messages-golden` vert (le pion actif suit le tour avancé comme le tour normal).
**Acceptation.** Tests unitaires verts ; parcours de mesure vert avec les étapes « jouer son tour maintenant » et « charger » ; aucun nouveau rouge dans `npm run test:browser-socle`.

**Ajouts du 22/11 après E4b (35ac22c3, notes `refonte-e4b-fin.md` du dossier partagé).**
- **Arbitrage des séquelles d'un participant absent** : en 3.56.0 il se faisait dans le panneau des suites de combat de l'écran Jouer, retiré par E4b ; Campagne ne les montre qu'en consultation. Le rendre possible dans Campagne (et à la fin du combat s'il y a lieu), avec les mêmes appels au store qu'en 3.56.0 (CA16, CA20). Fichiers en plus : `js/ui/campaign-workspace.js`, `js/ui/v5-aftermath-panel.js`.
- **Panneau de prière sans défilement** (mesuré 1 257 px pour 495 à l'étape « prière » du parcours) : compacter sans rien retirer. Fichiers en plus : `js/ui/v5-divine-panel.js`, `js/ui/v5-divine-form-model.js` (présentation seulement).
- **Colonne Résultat avec critique sans défilement** (mesuré 391 px pour 225 à l'étape « dégâts avec critique ») : compacter. Fichiers en plus : `js/ui/resolution-panel/result.js`, `js/ui/resolution-panel/critical.js`.
- Le parcours de mesure doit rapporter zéro défilement interne pour ces deux panneaux.

## Ajouts du 22/11 après E2b et E4c (décisions du MJ par sélecteurs)

Base : `claude/refonte-interface-f76af4` à 6f1383e9 (E0 à E4c fusionnés). Publication en une fois après E8 : E7a, E7b, F1, F2, F3 passent **avant** la publication.

**Ordre de lancement.** Tout de suite, en parallèle : **E7a** (Opus), **E7b**, **F1**, **F3** (Sonnet). **F2** après la fusion de E7b (même fichier `campaign-workspace.js`). **E8** quand tout est fusionné. E6 (en cours sur 6f1383e9) livre son relevé, ses captures et sa fiche de table ; E8 les reprend.

**Partage de fichiers entre lots parallèles.** `js/ui/workspace-view.js` : F1 ne touche qu'à `renderPrepare`, F3 qu'à `renderLibrary`, E7b qu'aux appels de Chance, Destin et Temps de campagne ; E7a n'y touche pas. `js/ui/workspace.css` : chaque lot ajoute sa section en fin de fichier, titrée « LOT F1 », « LOT F3 »… ; aucun ne modifie les sections des autres. `js/main.js` : E7b (ouverture des fenêtres Chance et Destin) et E7a (appel de la commande seulement, si besoin) ; ils ne touchent pas aux mêmes fonctions.

## E7a · Jouer son tour maintenant : effets de début de tour (ajouté le 22/11)
**Décision du MJ.** « Déclencher les effets de début de tour de l'avancé quand il joue en avance, et pas une seconde fois à sa place normale. » Aujourd'hui (E4c, 1c5108a2) `playTurnNow` (`js/core/store.js`) donne le tour sans phase de début de tour ; `previewV5Turn` (`js/core/v5-turn.js`) saute déjà le début de tour de celui qui reprend (`resumingTurn`), et `nextTurn` saute l'avancé à sa place normale.
**Exception à la garde `js/core/`.** Autorisés : `js/core/store.js` (`playTurnNow`), `js/core/v5-turn.js`, `js/core/turn-order.js` si besoin, et l'horloge de jeu (`gameClock`, `turnIndex`, phases validées) **seulement** pour que le tour avancé soit une transition de tour comme une autre. Pas de nouveau champ de données hors `extensions.v5.advancedTurn` ; aucune migration ; aucune règle d'effet modifiée.
**Approche attendue.** Réutiliser le chemin de « Tour suivant » (aperçu `previewV5Turn` puis application, avec ses demandes de jets éventuelles) avec un combattant imposé, plutôt que dupliquer les phases ; la commande reste une seule commande annulable. Si une phase de fin de tour de celui qu'on interrompt est en jeu, ne rien changer à ce qu'elle fait aujourd'hui et le dire au rapport.
**Fichiers.** `js/core/store.js`, `js/core/v5-turn.js`, `js/core/turn-order.js` (si besoin), `js/main.js` (appel de la commande seulement, si l'aperçu impose des jets à saisir), `js/ui/combat-frise.js` et `js/ui/combat-banner.js` (même chose), `tests/unit/combat/jouer-tour-maintenant.test.js`, `tests/fixtures/store-golden.json` (régénéré, ajouts seulement).
**Tests d'abord.** Avec un effet que le moteur déclenche déjà au début du tour (en prendre un dans les tests existants : `tests/unit/divin/temps-et-calendrier.test.js` pour les phases validées, `tests/unit/combat/talents-v5.test.js`, `tests/unit/combat/miracles-narratifs-tour.test.js`) : (1) l'effet se déclenche quand l'avancé joue maintenant ; (2) il ne se déclenche pas une seconde fois quand le round arrive à sa place normale ; (3) celui qui reprend ne rejoue pas son début de tour ; (4) Annuler rétablit tout, horloge comprise ; (5) les 13 cas d'E4c restent verts.
**Acceptation.** Tests ciblés verts (`jouer-tour-maintenant`, `store-golden`, `temps-et-calendrier`, `liaison-carte-messages-golden`) ; `timeout 120 node tests/refonte-ecran-browser.mjs` vert.

## E7b · Maladies d'un absent, fenêtres non modales (ajouté le 22/11)
**Décisions du MJ.** (1) Les maladies d'un participant absent se gèrent dans Campagne, à côté de l'arbitrage de ses séquelles (comme en 3.56.0 depuis le panneau des suites). (3) Chance, Destin et Temps de campagne deviennent des fenêtres non bloquantes, comme les effets V5 dans E2b.
**Fichiers.** `js/ui/v5-aftermath-panel.js` (exposer, à côté de `renderAbsentSequelae`, les maladies de l'absent via `renderDiseases(…, { allowAbsentActions: true })`), `js/ui/campaign-workspace.js` (les afficher dans le détail de l'absent, sous l'arbitrage des séquelles), `js/ui/v5-fortune-dialog.js`, `js/ui/v5-fate-dialog.js`, `js/ui/v5-campaign-time-dialog.js` (`show()` au lieu de `showModal()`, comme `js/ui/v5-effect-dialog.js` ; Échap et refus de fermeture pendant un envoi gardés, cf. `js/ui/keyboard.js`), `js/main.js` et `js/ui/workspace-view.js` (appels seulement), `js/ui/workspace.css` ou `js/ui/campaign-workspace.css` (section « LOT E7b » en fin de fichier), `tests/campaign-lot3-browser.mjs`, `tests/refonte-ecran-browser.mjs`.
**Tests d'abord.** Campagne : un absent malade → enregistrer, soigner, clore sa maladie, mêmes appels au store qu'en 3.56.0. Parcours de combat : ouvrir Chance puis Destin → aucune `dialog` modale ouverte, page fixe, le reste de l'écran reste cliquable.
**Acceptation.** `timeout 120 node tests/campaign-lot3-browser.mjs` et `timeout 120 node tests/refonte-ecran-browser.mjs` verts ; tests unitaires qui importent les fichiers touchés verts. Seule la confirmation de « Terminer le combat » reste modale (CA10).

## F · Les trois autres espaces (CA23)
**Commun.** À 1440 × 800, la page ne défile ni verticalement ni horizontalement ; une liste longue défile dans sa case ; aucune fonction retirée ni éloignée de plus de deux clics ; police et thèmes de E0 ; rien dans `js/core/`. Chaque lot écrit **d'abord** son parcours de mesure, sur le modèle de `tests/refonte-ecran-browser.mjs` (mesure de `scrollHeight`/`scrollWidth` de la page et des cases), avec assez de données pour remplir les listes (fixture R20 ou sauvegarde dédiée dans `tests/fixtures/`) ; il échoue sur 6f1383e9. Les cases autorisées à défiler sont nommées une par une dans le test ; tout autre débordement le fait échouer.

## F1 · Préparer sans défilement
**Fichiers.** `js/ui/workspace-view.js` (`renderPrepare` seulement), `js/ui/prepare-view.js`, `js/ui/reserve.js`, `js/ui/workspace.css` (section « LOT F1 »), `tests/refonte-preparer-browser.mjs` (nouveau).
**À livrer.** Rencontres, réserve, banc et lancement dans une grille fixe ; réserve et liste des rencontres défilent dans leur case ; le formulaire d'ajout ne pousse rien hors de l'écran.
**Acceptation.** `timeout 120 node tests/refonte-preparer-browser.mjs` vert ; parcours existants de Préparer verts (au minimum ceux du socle).

## F2 · Campagne sans défilement
**Après E7b** (même fichier). **Fichiers.** `js/ui/campaign-workspace.js`, `js/ui/campaign-workspace.css`, `js/ui/campaign-model.js` (présentation seulement), `tests/refonte-campagne-browser.mjs` (nouveau), `tests/campaign-lot3-browser.mjs` (sélecteurs seulement).
**À livrer.** Liste des suivis à gauche (défile dans sa case), détail à droite sans défilement de page ; séquelles, maladies, convalescence et calendrier dans le détail, repliables.
**Acceptation.** `timeout 120 node tests/refonte-campagne-browser.mjs` et `timeout 120 node tests/campaign-lot3-browser.mjs` verts.

## F3 · Bibliothèque sans défilement
**Fichiers.** `js/ui/workspace-view.js` (`renderLibrary` seulement), `js/ui/bestiary-library.js`, `js/ui/rules-view.js`, `js/ui/workspace.css` (section « LOT F3 »), `tests/refonte-bibliotheque-browser.mjs` (nouveau).
**À livrer.** Profils, Règles et mots-clés, Favoris : liste à gauche qui défile dans sa case, fiche à droite ; le texte d'une règle longue défile dans sa case (lecture, comme l'onglet Règles du combat).
**Acceptation.** `timeout 120 node tests/refonte-bibliotheque-browser.mjs` vert ; parcours existants du bestiaire et des règles verts.

## E8 · Recette finale
**À livrer.** Reprise du travail d'E6 sur la branche complète : `recette-fonctions.md` recoché (combat et trois espaces), parcours de mesure verts (`refonte-ecran`, `refonte-preparer`, `refonte-campagne`, `refonte-bibliotheque`), `npm run test:browser-socle` sans nouveau rouge, suite unitaire complète verte (deux commandes de `CLAUDE.md`), notes de version (README, `docs/SUIVI_EVOLUTION.md`), captures avant/après, fiche de table. Ni changement de version ni publication : ils attendent la recette du MJ à la table et son feu vert.

## E10 · Liaison « tour de jeu » de Map Display (ajouté le 22/11)
**Contexte.** Note de la carte `E:/rpg-map-display/docs/A-FAIRE-OUTIL-MJ-TOUR-DE-JEU-2026-11-22.md` (carte `3256bd9`, en production) : depuis le 22/11, `mj.turn { ref }` **commande la tablette** (seul le PJ du `ref` bouge ; un ennemi : aucun PJ ne bouge ; `null` : tout est libre). Aucun changement de protocole (`MAP_LINK_VERSION` reste 1) ; la phrase du contrat est reprise par E9. Spec S9 (CA28-CA30).
**État de l'outil (relevé du 22/11).** `mj.turn` part de `sendTurn` (`js/core/map-link-protocol.js`), lu sur `getActiveId: () => Store.getCombat()?.currentActorId ?? null` et rafraîchi sur les événements `combat`, `combat:update` et `reserve` du Bus (`js/main.js`, bloc « Liaison RPG Map Display »). `map.ran` passe par `onRan` (`js/main.js`) → `runProposalOf` (`js/core/map-link-run.js`) → décision `course-carte:<id>` dans « À décider » et toast ; `Store.spendV5RunAction` refuse déjà une seconde Action du même Tour (`reason: 'spent'`).
**Fichiers.** `js/main.js` (bloc de la liaison seulement), `js/ui/map-link-feedback.js` (`runDecision`), `js/core/map-link-protocol.js` et `js/core/map-link-run.js` **seulement si un test le démontre nécessaire** (le dire au rapport), `tests/unit/combat/liaison-carte-course.test.js`, `tests/unit/chapeau/liaison-carte-tour-de-jeu.test.mjs` (nouveau), `docs/specs/refonte-interface/fiche-de-table.md`. Rien dans le reste de `js/core/` ; aucun message ni champ de protocole ajouté ; `liaison-carte-messages-golden` inchangé et vert.
**Tests d'abord** (avec le store réel et un faux canal, comme `liaison-carte-protocole.test.mjs`) :
1. (CA28) `mj.turn` part avec le bon `ref` à chaque changement de tour : Tour suivant, changement de round, « Jouer son tour maintenant » (E4c/E7a), la reprise, et **Annuler** de chacun ; toujours dans l'instantané (reconnexion), même `ref` réannoncé sans autre effet.
2. (CA29) `mj.turn { ref: null }` part à la fin d'un combat : Terminer le combat, retrait du dernier combattant actif, Recommencer.
3. (CA30) Deux `map.ran` du même PJ dans le même Tour : une seule décision dans « À décider », une seule Action dépensée (le second clic ou le second message ne coûte rien et le dit) ; une décision `course-carte` non tranchée ne survit pas au changement de Tour (sinon un clic au Tour suivant dépenserait l'Action d'un autre Tour).
Ce qui passe déjà est gardé comme test de non-régression ; seul ce qui échoue est corrigé.
**Fiche de table.** Ajouter à `fiche-de-table.md` une section « Liaison avec la carte : tour de jeu » avec les sept étapes du §4 de la note de la carte (outil connecté), plus : « Jouer son tour maintenant » puis Annuler déplacent le PJ jouable sur la tablette ; un PJ court (Action proposée puis dépensée), annule son mouvement sur la tablette : l'Action revient dans l'outil. Noter que le cas du `null` ambigu (ennemi hors de la carte pendant son tour : les PJ peuvent bouger) est laissé tel quel par décision du MJ du 22/11.

**Ajout du 22/11 : `map.turnReset` (décision du MJ, CA31, CA32).** Changement de protocole, d'où le passage à Opus et l'exception à la garde `js/core/` ci-dessous.
- **Contrat** (`docs/CONTRAT_LIAISON_MAP_DISPLAY.md`, source des deux copies) : au §10, nouveau message carte → outil `map.turnReset { ref }`, émis à chaque annulation du mouvement du tour (tablette ou écran MJ) ; effet côté outil (CA31) ; au §2.3, version 2 et ce qu'elle ajoute ; ligne de révision datée du 22/11/2026. Aucun autre message ni champ changé. **Fais-le en premier et commite-le seul** : le lot de la carte (C1) le recopie.
- **Version** : `LIAISON_CARTE.version` passe à 2 dans `js/data/donnees-communes.js` (source des copies de la carte et des fiches) ; rien d'autre dans ce fichier.
- **Outil** : `js/core/map-link-protocol.js` reçoit `map.turnReset` (`onTurnReset(ref)`, comme `onRan`) ; `js/core/store.js` : une commande annulable qui, pour l'actif seulement et dans son Tour en cours, rend l'Action **si elle a été dépensée par une Course signalée par la carte** (`spendV5RunAction`, commande `v5-run-action`) et que rien d'autre ne l'a dépensée depuis, et remet à zéro le déplacement du Tour (`system:turn-move`, `js/core/store/api-trait-buttons.js`) ; sinon ne fait rien et le dit ; idempotente. `js/main.js` (bloc de la liaison) : `onTurnReset` appelle la commande, retire la décision `course-carte:<id>` encore ouverte et affiche un toast.
- **Exception à la garde `js/core/`** : `map-link-protocol.js`, `map-link-run.js` si besoin, `store.js` (cette commande seulement), `store/api-trait-buttons.js` si le déplacement l'exige ; `js/data/donnees-communes.js` (version) ; `tests/fixtures/store-golden.json` et la référence de `liaison-carte-messages-golden` régénérées, **ajouts et numéro de version seulement**.
- **Tests d'abord** (dans `liaison-carte-tour-de-jeu.test.mjs`) : Course signalée puis dépensée, puis `map.turnReset` → Action rendue, déplacement à zéro, Annuler rétablit ; second `map.turnReset` → rien de plus ; `ref` d'un non-actif ou hors combat → rien ; Action dépensée par une attaque (pas par la Course) → non rendue ; version 2 dans `mj.hello`/`map.hello` et refus d'une version 1 (`version-mismatch`).
**Acceptation.** `node --test tests/unit/chapeau/liaison-carte-tour-de-jeu.test.mjs`, `tests/unit/combat/liaison-carte-course.test.js`, `tests/unit/chapeau/liaison-carte-messages-golden.test.mjs`, `tests/unit/chapeau/liaison-carte-protocole.test.mjs`, `tests/unit/combat/jouer-tour-maintenant.test.js` verts ; `timeout 120 node tests/refonte-ecran-browser.mjs` vert ; `git diff <base> -- js/core/` limité aux fichiers de l'exception ci-dessus ; `node tools/recopier-donnees-communes.mjs --check` signale seulement les copies de la carte et des fiches à mettre à jour (attendu : C1 et la publication s'en chargent).

## C1 · Carte : `map.turnReset` (ajouté le 22/11, dépôt `E:/rpg-map-display`)
**Après E10** (il recopie le contrat et les données communes d'E10). Lot jumeau, dans le dépôt de la carte, sous ses propres règles (`CLAUDE.md` de la carte : zéro build, manifeste fermé, `// @ts-check`, « muter l'effet »). Worktree et branche locale **`tour-de-jeu-turnreset`** tirée du `main` de la carte (le checkout principal de la carte porte du travail non commité d'une autre session : ne pas y travailler) ; fusion dans `main` seulement à la publication.
**À faire.** (1) Recopier depuis le worktree d'E10, octet pour octet : `docs/CONTRAT_LIAISON_MAP_DISPLAY.md` → `docs/CONTRAT-LIAISON-OUTIL-MJ.md`, `js/data/donnees-communes.js` → `js/core/donnees-communes.js` ; vérifier avec `node <worktree E10>/tools/recopier-donnees-communes.mjs --check --carte <worktree C1>` (lignes de la carte « OK » ; la ligne des fiches peut dériver, elle se règle à la publication). (2) Émettre `map.turnReset { ref }` (canal `wfrp-map-link`) à chaque annulation du mouvement du tour, depuis l'écran MJ, que l'annulation vienne de la tablette (par RTDB) ou de l'écran MJ, pour un pion lié seulement ; une seule fois par annulation. (3) La version 2 vient de la copie (`MJ_LINK_VERSION = LIAISON_CARTE.version`) : rien à écrire à la main. (4) Mettre à jour `docs/ETAT.md` (table « Suite produit ») et ce que le manifeste exige.
**Acceptation.** Test unitaire de l'émission (annulation → un message `map.turnReset` avec le bon `ref`, rien pour un pion non lié), muté pour voir le rouge ; `pnpm run verify` vert ; commit local sur `tour-de-jeu-turnreset`, rien poussé.

## Publication conjointe (après la recette du MJ à la table et son feu vert)
Version 2 d'un côté seulement = liaison coupée (« version différente »), sans dégât ; les deux se publient donc l'un après l'autre, le même jour.
1. **Recette** : outil depuis `claude/refonte-interface-f76af4` et carte depuis `tour-de-jeu-turnreset`, servis localement **sur la même origine** (la liaison passe par `BroadcastChannel`), comme pour les recettes de liaison précédentes.
2. **Outil** : fusion de `claude/refonte-interface-f76af4` dans `main`, `node tools/bump-version.mjs <X.Y.Z>`, notes de version, suite unitaire complète verte, push `main`.
3. **Carte** : fusion de `tour-de-jeu-turnreset` dans `main` (le travail en cours de l'autre session restant à part), `pnpm run verify`, push `main`, juste après l'outil.
4. **Fiches** : depuis `main` de l'outil, `node tools/recopier-donnees-communes.mjs` (la copie de la carte est déjà identique ; celle des fiches prend la version 2, sans effet sur elles), commit et push du dépôt des fiches.
5. Recharger `gm.html` et l'outil (service workers) : l'indicateur repasse à « connecté ».

## Passe G · Corrections de la recette du MJ (22/11 au soir)

Entrées : retours R1 à R17 et sélecteur de recette (`tmp/recette-refonte/retours-mj.md` du checkout principal, captures dans le même dossier). Base : `claude/refonte-interface-f76af4` après le commit de cette section (correctif IndexedDB 0aa34eb8 compris). Briefs Team : `docs/specs/refonte-interface/briefs-team/` (`<HASH>` = commit de base ; `<REPONSE-Q1>`, `<OPTION-Q2>`, `<REPONSE-Q3>`, `<REPONSE-Q4>` = réponses du MJ aux questions de fin de section, à remplacer au lancement). Rien n'est publié avant la recette du MJ et son feu vert.

Demandes d'interface du MJ, valables pour tous les lots G : écrans de tir, de magie et de miracles réduits au nécessaire ; questions précochées à « oui », le MJ met un « non » ; **aucun texte long dans un bouton** (libellé court, texte complet en infobulle ou en aide) ; **un clic ne rouvre jamais l'ancien panneau des circonstances** : seul le bouton « autres… » l'ouvre ; ligne Distance lisible.

### Retour → lot

| Retour | Constat (code à 0aa34eb8) | Lot |
|---|---|---|
| R1 · ligne « Action » en double | Puces `[data-action-key]` de la résolution (`resolution-panel.js` ~l. 421) répètent la barre du bas (`plateau.js:50`). | G1 |
| R2 · « Taille : pièce ou bouclier touché requis » | « Taille » est ici la **qualité d'arme** (Hack, p. 304), pas la Taille de la créature. `struckItemId` n'est jamais rempli (`resolution.js` ~l. 944, `v5-weapon-qualities.js:48`) ; la liste du panneau (`resolution-panel.js` ~l. 1708) propose toutes les pièces et n'est pas reliée à la raison ; « Arbitrer » (`workspace-view.js` `revealDecision` ~l. 3383) ne trouve aucun lien et ne fait rien. | G5 |
| R3 · Vigilance hors surprise | `combat-aware` proposé à tout porteur du talent (`v5-talent-situations.js:25`, `v5-talent-actions.js:39`), sans lien avec une surprise ; aucun jet de Vigilance à l'initiative (`store.js` ~l. 3199 pose « Surpris » à tout le camp). | G6 |
| R4 · pas d'attaque gratuite quand un engagé part | Aucun chemin : « Déplacer… » et le glisser (`workspace-view.js` `moveCommand` ~l. 608, `dropOnZone`) modifient l'engagement sans règle. Seule la Fuite donne l'attaque gratuite (p. 163). | G7 |
| R5 · « Tour suivant » refusé par la fin de tour | **Réglé par 0aa34eb8.** `advanceTurn` (`main.js:353`) → `nextTurn` → `previewV5Turn` ne lisent aucun rappel ; le refus venait de `awaitStore(…, 'Fin du tour')` (`main.js:364`) sur la connexion IndexedDB morte. Le rappel « Fin du tour de … » passe par « À décider » (`reminders.js:94`, `combat-decisions.js:175`). Test de non-régression à ajouter. | G8 |
| R6 · « Enregistrement local » en échec | **Réglé par 0aa34eb8** (`persistance-connexion-fermee.test.js`). | — |
| R7 · Recommencer : « corriger les données » en boucle | Même cause d'écriture ; le message de `main.js:875` (« corrigez les données ») est trompeur pour un échec d'enregistrement. | G6 |
| R8 · PJ hors tour déplaçables (carte) | Bridage au toucher seulement (`tokenHit.js:67`, `bootstrap.js:329`) ; un trajet préparé avant le changement de tour reste validable (`movePlanning.js` `reconcile` ~l. 194, `validate` ~l. 155) ; `selectionStrip.js:132,223` et `gameHelp.js:1909,1939` appellent sans le tour ; `gm.js:1325,1358` accepte un `token.move` des joueurs hors tour. | — : pas de lot (MJ, 22/11 soir : vu au début de la recette, sans doute pendant la panne d'enregistrement corrigée en 0aa34eb8 ; réessayé, c4 « marche »). À revérifier à la prochaine recette ; repérage gardé en réserve (C2). |
| R9 · ennemi non détecté dans la torche d'un PJ | Cause non localisée : les torches de pion entrent dans le champ lumineux (`fogLayer.js` ~l. 126, `light.js` ~l. 89) ; pistes : `emitsLight` absent du pion lié, ligne de vue, ancrage seul pour un grand pion (`tokens.js:334`), masque non republié. À reproduire d'abord. | C3 (carte) |
| R10 · vision dans le noir « à 1 » | **Côté outil** : `visionDimOf` (`map-link-state.js:93`) ne lit que les Traits (`creature-senses.js` `traitsOf`) ; le talent Vision nocturne d'un PJ (p. 123 ; Nains, Halfelins, Elfes p. 29-35) est ignoré → 1. La carte interprète correctement. | G8 |
| R11 · « Autres actions » sans effet | `plateau.js:135` → `commands.focus('action')` (`workspace-view.js` ~l. 797) met le focus sur une puce déjà visible ; le menu magie/prière/Test (`resolution-panel.js` ~l. 442-448) reste fermé. | G1 |
| R12 · « Charger » sans effet | Le clic pose `draft.charging` (`workspace-view.js` ~l. 788, 1846) mais rien ne le montre : la case « Charge donnant Élan » est dans le tiroir « autres… » fermé. | G1 |
| R13 · « Petit : catégories de Taille explicites requises » | `previewSmall` (`v5-talent-small.js:13,17`) n'a pas de repli sur `creatureSizeOf` ; l'interface affiche la Taille par défaut sans l'envoyer (`workspace-view.js` ~l. 334, 1625). Même motif dans `v5-talent-size.js:15`. | G5 |
| R14 · esquive contre un tir | Bouton = texte du moteur (`resolution.js:869`) ; la distance en mètres de la carte n'est pas gardée (`resolution-panel.js` ~l. 3329-3345) donc « tireur à moins de BI m » n'est pas calculé ; le clic ouvre le tiroir des circonstances (`resolution-panel.js` ~l. 105-117). | G2 |
| f4-tirer · écran de tir trop complexe | Voir R14 ; tout ce qui n'est pas déductible ou nécessaire doit passer sous « autres… ». | G2 |
| g-distance · ligne Distance incomprise | `combat-distance.js`, `compact.js:12-33` : six puces mêlant engagement et bandes, source peu visible, mètres de la carte non affichés. | G2 |
| R15 · magie trop grande | `v5-magic-controls.js`, `resolution-panel/magic.js` : tous les jets et variantes affichés ; seuls d100, dés `missing` et perte de réserve sont nécessaires (`resolution-panel.js` ~l. 71-82). | G3 |
| R16 · case vide comme cible de zone | Aucun mode « point d'impact » : les cibles sont toujours des participants ; la carte ne renvoie ni case ni rayon. | G4 (après la réponse du MJ, question Q2) |
| R17 · miracles : quatre questions par cible | `v5-divine-form-model.js` `targetFactFields` (l. 58-92) : seul `withinRange` est précoché ; « Allié admissible » incompris. | G3 |
| f5-armure · coiffe de maille seule = « ? » | `displayedArmorLocations` (`workspace/helpers.js` ~l. 99) recalcule sans jet de localisation ; une pièce Partielle (p. 306) rend alors `null` → « ? ». | G5 |

### Réponses de règles (livre de base V5, v3 anglaise, pages imprimées)

- **Esquive contre un tir (R14).** p. 165 : un tir ne s'oppose pas avec une compétence de mêlée ; on peut l'opposer par Esquive si le tireur est à au plus Bonus d'Initiative mètres (yards = mètres), ou à toute portée avec un bouclier de 2 PA ou plus. Tir sur une cible engagée avec le tireur : résolu comme une attaque de mêlée, Capacité de Tir opposée à la Mêlée de la cible (p. 165), sans être un tir dans la mêlée (p. 167). **Sans droit à l'esquive**, le tir n'est pas opposé : c'est un simple Test de Capacité de Tir, réussi = touché, raté = manqué (p. 164, « Roll to Hit »).
- **Surprise et Vigilance (R3).** p. 161 : l'ordre d'initiative se fixe au début du combat ; « Déterminer la Surprise » est la première étape, avant le début du round, normalement au premier round seulement ; le MJ a le dernier mot ; s'il y a une chance de repérer l'embuscade, **un seul** Test opposé Discrétion/Perception (pire Discrétion des embusqués contre meilleure Perception des adversaires) ; si les embusqués gagnent, chaque adversaire reçoit l'État Surpris. p. 187 : Surpris = ni Action ni Mouvement, pas de défense en Test opposé, +2 DR aux attaques de mêlée contre lui ; perdu en fin de round ou après la première attaque. p. 116 : la **Vigilance** (talent Combat Aware) permet un Test de Perception Challenging (+0 DR) pour éviter Surpris. Donc : la Vigilance ne concerne que les surpris qui ont le talent ; ces jets se font juste après l'initiative, avant le round 1, comme le demande le MJ.
- **« Taille : pièce ou bouclier touché requis » (R2).** « Taille » est la qualité d'arme Hack (hallebarde) : en cas de touche, une pièce d'armure ou un bouclier touché perd 1 PA avant l'application des Dégâts (p. 304). La localisation se lit en inversant le jet d'attaque (p. 164). Le livre ne dit pas quelle pièce perd le point quand plusieurs se superposent ; le total de PA de la localisation baisse de 1 dans tous les cas, donc les Blessures de la cible ne dépendent pas de ce choix. L'outil peut tout calculer sauf ce choix-là, qu'il précoche.
- **« Petit : catégories de Taille explicites requises » (R13).** « Petit » est une règle maison approuvée par le MJ (`v5-talent-small.js:1`), pas une règle du livre. L'exigence venait d'une donnée non transmise : les catégories sont connues (Trait, champ `size`, espèce du PJ via `creatureSizeOf`) et l'interface les affiche déjà. Taille des créatures et ses effets : p. 360.
- **Coiffe de maille (f5-armure).** Partielle : une touche dont le numéro de localisation est pair ignore les PA de la pièce (p. 306) ; Coiffe de mailles : tête, 2 PA, Flexible, Partielle (`reference-snapshot.json`). Sans jet, la valeur affichable est la valeur nominale, conditionnelle.
- **Quitter une mêlée (R4).** p. 163 : pour quitter une mêlée, se désengager (perdre son Élan, ou réussir le test prévu) ou fuir ; en fuyant, chaque adversaire engagé gagne un Élan qu'il peut perdre pour une attaque de mêlée gratuite, et le fuyard gagne un État Brisé par ennemi engagé. Il n'y a pas d'« attaque d'opportunité » sur un simple déplacement.
- **Vision nocturne (R10).** Talent p. 123 et Trait p. 360 : vision claire à 20 m dans l'obscurité naturelle et lumière utile prolongée de 20 m ; le contrat de liaison traduit en `visionDim` 10 cases (§4).

### Lots

| Lot | But | Modèle | Après | Retours |
|---|---|---|---|---|
| G1 | Barre d'actions : ligne Action sans doublon, « Autres actions » ouvre le menu, « Charger » visible | Sonnet | — · [P] | R1, R11, R12 |
| G3 | Magie et miracles réduits au nécessaire, tout précoché à oui | **Opus** | — · [P] | R15, R17 |
| G5 | Taille (Hack), Petit, armure « ? », « Arbitrer » | **Opus** | — · [P] | R2, R13, f5-armure |
| G6 | Surprise : jets de Vigilance après l'initiative, message d'erreur d'enregistrement | **Opus** | — · [P] | R3, R7 |
| G7 | Quitter une mêlée : Se désengager, Fuir ou Sans règle | Sonnet | — · [P] | R4 |
| G8 | Non-régression de « Tour suivant », vision nocturne des PJ envoyée à la carte | Sonnet | — · [P] | R5, R10 |
| G2 | Tir : esquive calculée, raisons courtes et en ligne, ligne Distance lisible | **Opus** | G1, G5 | R14, f4-tirer, g-distance |
| G4 | Sorts de zone : point d'impact | **Opus** | G3 et réponse du MJ (Q2) | R16 |
| C2 | Carte : bridage du tour sur tous les chemins — **en réserve, non lancé** (R8 non reproduit) | Sonnet | seulement si R8 revient à la recette | R8 |
| C3 | Carte : ennemi dans la lumière d'un PJ, reproduction d'abord | Sonnet | — · [P] (dépôt de la carte) | R9 |
| G9 | Recette de la passe G : parcours, suite complète, fiche de table | Sonnet | tous | tous |

**Ordre de lancement.** Vague 1, en parallèle : G1, G3, G5, G6, G7, G8 (outil), C3 (carte). C2 n'est pas lancé. Vague 2 : G2 après la fusion de G1 et G5 ; G4 après G3 et la réponse du MJ à Q2. Vague 3 : G9.

**Partage de fichiers en vague 1.** `js/ui/workspace-view.js` : G1 seulement l'objet `commands` (~l. 785-802) ; G5 seulement `revealDecision` (~l. 3383-3390) et la transmission des Tailles (~l. 334-335, 1625) ; G7 seulement `moveCommand` et `dropOnZone` (~l. 608-621) ; G3, G6, G8 n'y touchent pas. `js/ui/resolution-panel.js` : G1 seulement la ligne Action (~l. 421-448 pour l'ouverture du menu, pas son contenu) et le regroupement (~l. 3378-3398) ; G5 seulement la liste « Taille » (~l. 1708-1719) ; G3 seulement le bloc magie (~l. 71-82) ; personne d'autre en vague 1 (G2 y vient ensuite). `js/main.js` : G6 seulement la saisie et l'application de l'initiative ; personne d'autre. `js/ui/workspace.css` : une section par lot en fin de fichier (« LOT G1 »…). **Parcours navigateur : chaque lot écrit le sien** (`tests/recette-g<N>-browser.mjs`, sur le modèle de `tests/refonte-ecran-browser.mjs`) et ne modifie pas `refonte-ecran-browser.mjs`, qui doit seulement rester vert. `tests/fixtures/store-golden.json` : G6 seul.

**Garde `js/core/`** (règles communes) : vide, sauf G5 (`resolution.js` partie Taille, `v5-talent-small.js`, `v5-talent-size.js`), G6 (`store.js` initialisation du combat, `turn-order.js`, `v5-talent-actions.js`, `v5-talent-situations.js`), G8 (`creature-senses.js` ou `map-link-state.js`). Aucune règle changée : chaque lot ne fait que **déduire** une donnée déjà connue ou appliquer une page citée ci-dessus ; aucune migration ; aucun message de liaison ajouté (sauf G4 si le MJ choisit l'option carte).

### G1 · Barre d'actions et ligne Action
**Fichiers.** `js/ui/resolution-panel.js` (ligne Action et regroupement), `js/ui/workspace/plateau.js` (lignes `other` et Charger), `js/ui/workspace-view.js` (`commands`), `js/ui/workspace.css` (« LOT G1 »), un test unitaire du modèle de barre (fichier existant de `plateau.js` s'il y en a un, sinon `tests/unit/ui/barre-actions-g1.test.js`), `tests/recette-g1-browser.mjs` (nouveau).
**Critères.**
- **G1-a (R1)** La case de résolution ne montre plus aucune puce d'action préparée (`[data-action-key]` hors menu magie) ; « Test… », « Sort, prière, Corruption… » et « Actions du Tour… » restent, faute d'équivalent dans la barre du bas (CA16 : chaque fonction à deux clics au plus).
- **G1-b (R11)** « Autres actions » ouvre le menu magie, prière et Test (il n'est plus `hidden`) et met le focus sur sa première entrée ; testé au tour d'un PNJ qui ne sait faire que de la magie (fixture R20).
- **G1-c (R12)** Après « Charger » sur une cible : `draft.charging` vrai, une puce « Charge » active visible hors du tiroir « autres… » dans la résolution, le bouton « Charger » de la barre marqué `aria-pressed="true"` ; un second clic sur la puce ou le bouton retire la charge. CA26 et CA27 restent verts.
**Acceptation.** Test unitaire ; `timeout 120 node tests/recette-g1-browser.mjs` (rouge sur la base pour G1-a, G1-b, G1-c) ; `timeout 120 node tests/refonte-ecran-browser.mjs` vert.

### G2 · Tir, esquive et ligne Distance (après G1 et G5)
**Fichiers.** `js/ui/resolution-panel.js` (raisons bloquantes ~l. 83-117, champ « ranged-opposition » ~l. 1870-1890, ligne Distance et requête de la carte ~l. 3329-3345), `js/ui/resolution-panel/compact.js`, `js/ui/resolution-panel/circonstances.js`, `js/ui/combat-distance.js`, `js/ui/workspace.css` (« LOT G2 »), `tests/unit/combat/distance-tir.test.js`, `tests/unit/ui/circonstances-pertinentes.test.js`, un test unitaire neuf `tests/unit/ui/esquive-tir.test.js`, `tests/recette-g2-browser.mjs` (nouveau). `js/core/` intact : la permission se déduit dans l'interface et passe par le champ existant `v5Context.rangedOppositionAllowed`.
**Critères.**
- **G2-a (R14, p. 165)** Le droit d'esquiver un tir est calculé : distance de la carte ≤ BI m, ou bouclier de 2 PA ou plus, ou cible engagée avec le tireur (alors Corps à corps opposé, déjà fait). Il s'affiche en puce déduite courte (« Esquive permise : 3 m ≤ BI 4 », « Esquive interdite : 9 m > BI 4 ») forçable d'un clic. Sans droit, la défense par Esquive est grisée avec sa raison courte et le tir se résout comme un Test non opposé (p. 164), sans rien bloquer. Sans distance connue (pas de carte) : puce « Tireur à ≤ BI m ? » précochée selon la réponse du MJ à Q1 (par défaut : oui).
- **G2-b** La distance en mètres renvoyée par la carte est gardée dans le brouillon (pour G2-a) et affichée sur la ligne Distance.
- **G2-c** Aucun bouton de la résolution ne porte plus de 40 caractères ; chaque raison bloquante a un libellé court (≤ 60 caractères) et son texte complet en infobulle.
- **G2-d** Cliquer une raison bloquante n'ouvre jamais le tiroir « autres… » : elle donne le contrôle en ligne (Oui / Non, ou le champ) dans la résolution. Seul le bouton « autres… » ouvre le tiroir.
- **G2-e (f4-tirer)** Écran de tir avant les jets : cible, ligne Distance, puces déduites, jets, résultat ; rien du tiroir n'est affiché par défaut. Le parcours compte les contrôles visibles à l'étape « tir » avant et après (rapport).
- **G2-f (g-distance)** La ligne Distance dit en clair ce qui est retenu et d'où (« Courte · 12 m · carte », « Au contact · plateau », « Choisi par le MJ ») ; « Au contact » est séparé visuellement des bandes de portée ; la puce retenue est marquée (`aria-pressed`). CA13 à CA15 restent verts (six cas de `distance-tir.test.js`).
**Acceptation.** Tests unitaires ; `timeout 120 node tests/recette-g2-browser.mjs` (esquive permise, interdite, sans carte, raison cliquée sans tiroir) ; `refonte-ecran-browser.mjs` vert.

### G3 · Magie et miracles
**Fichiers.** `js/ui/v5-magic-controls.js`, `js/ui/resolution-panel/magic.js`, `js/ui/resolution-panel.js` (bloc magie ~l. 71-82 seulement), `js/ui/v5-divine-form-model.js`, `js/ui/v5-divine-panel.js`, `js/ui/workspace.css` (« LOT G3 »), `tests/unit/ui/` (test du modèle de formulaire divin existant à étendre, ou neuf), `tests/recette-g3-browser.mjs` (nouveau).
**Critères.**
- **G3-a (R15)** Panneau d'un sort : sort, cible(s), jet d100 du lanceur, puis seulement les dés que le moteur réclame (`missing`, incident sur maladresse ou double, perte de réserve) et « Appliquer ». Tout le reste (talents, Haute Magie, dissipation, familier, recommencer, choix du d100, surpuissance…) est dans **un seul** repli « Options » fermé par défaut. Parcours : un PNJ lanceur de la fixture R20 lance un sort jusqu'au résultat appliqué, sans défilement du panneau ni de la page ; nombre de contrôles visibles avant le jet rapporté (avant / après).
- **G3-b (R17)** Miracles : tous les faits de cible sont précochés à « oui » (portée, faits de scène comme « Regarde le prêtre » ou « Ne vénère pas Myrmidia », allié) ; le MJ décoche. Une ligne par cible, faits en cases compactes, pas quatre questions empilées. « Allié admissible » devient « Allié du prêtre », avec une aide d'une ligne. Test : « Soleil flamboyant » → tous les faits vrais par défaut ; un fait décoché est lu comme « non » comme aujourd'hui.
- **G3-c** Les prières (qui marchaient) gardent leur résultat : mêmes appels au store, mêmes effets pour les mêmes réponses (CA17).
**Acceptation.** Tests unitaires ; `timeout 120 node tests/recette-g3-browser.mjs` ; `refonte-ecran-browser.mjs` vert (étapes « sort » et « prière » sans défilement).

### G4 · Sorts de zone : point d'impact (après G3 et la réponse du MJ)
**Option A (recommandée, outil seul).** Pour un sort dont le contrat a une zone (`hasAoeEffect`, `v5-spell-contracts.js` ~l. 1134), la cible peut être « Point d'impact (case) » au lieu d'un combattant ; le rayon s'affiche en mètres (calculé par le contrat, ex. BFM) ; une liste de tous les combattants actifs permet de cocher ceux qui sont dans la zone (aucun précoché) ; les effets s'appliquent à ceux-là, comme aujourd'hui avec `magicTargetIds`. Le lanceur peut cibler une case vide sans combattant.
**Option B (carte, deux dépôts).** En plus de A : le MJ clique une case sur la carte, la carte renvoie les pions dans le rayon ; nouveau message de liaison, version 3, contrat amendé et lot jumeau dans la carte, publication conjointe.
**Fichiers (A).** `js/ui/resolution-panel/magic.js`, `js/ui/v5-magic-controls.js`, `js/ui/workspace.css` (« LOT G4 »), tests unitaires du modèle des cibles, `tests/recette-g4-browser.mjs`.
**Acceptation (A).** Un sort de zone lancé sur une case vide touche les combattants cochés et eux seuls ; sans aucun coché, il s'applique sans cible et le journal le dit ; un sort sans zone ne propose pas le point d'impact.

### G5 · Taille (Hack), Petit, armure « ? », « Arbitrer »
**Fichiers.** `js/core/resolution.js` (partie Taille ~l. 940-965), `js/core/v5-talent-small.js`, `js/core/v5-talent-size.js`, `js/ui/resolution-panel.js` (liste « Taille » ~l. 1708-1719 seulement), `js/ui/workspace-view.js` (`revealDecision` et transmission des Tailles), `js/ui/workspace/helpers.js` (`displayedArmorLocations`, `armorSummary`), `tests/unit/combat/qualites-darmes.test.js`, `tests/unit/combat/traits-calculs-petits.test.js` ou un test neuf du talent Petit, un test unitaire de `helpers.js`, `tests/recette-g5-browser.mjs` (nouveau).
**Critères.**
- **G5-a (R2, p. 304)** La pièce touchée par une arme à Taille est déduite : une seule pièce comptée sur la localisation → elle ; aucune pièce et défense au bouclier → le bouclier ; ni pièce ni bouclier → rien à abîmer, aucun blocage ; plusieurs pièces → celle de plus fort PA précochée, modifiable dans une liste limitée aux pièces de la localisation (et au bouclier s'il a servi). « Appliquer » n'est plus jamais grisé par la Taille. Les Blessures de la cible sont identiques à celles d'aujourd'hui pour la même pièce saisie à la main.
- **G5-b** Le libellé dit « Taille (arme) » partout où la qualité est nommée dans l'écran de combat, pour ne plus la confondre avec la Taille de la créature.
- **G5-c** « Arbitrer » (et tout bouton d'ouverture de la case « À décider ») mène toujours à un contrôle visible : le champ s'il existe, sinon la raison mise en évidence et amenée à l'écran. Test unitaire : chaque type de décision qui « ouvre » quelque chose a une cible.
- **G5-d (R13)** Petit et Grande taille lisent la catégorie connue (`creatureSizeOf` : Trait, champ `size`, espèce du PJ) quand le MJ n'a rien choisi ; plus de « catégories de Taille explicites requises » dans ce cas. Une Taille seulement supposée (Moyenne par défaut) donne un rappel non bloquant. Mêmes résultats qu'aujourd'hui quand les Tailles sont saisies.
- **G5-e (f5-armure, p. 306)** Une pièce Partielle seule (coiffe de mailles) affiche sa valeur nominale marquée conditionnelle (« 2* », infobulle « Partielle : ignorée sur une localisation paire ») au lieu de « ? ».
**Acceptation.** Tests unitaires (rouges d'abord) ; `timeout 120 node tests/recette-g5-browser.mjs` (Vermine de choc à la hallebarde contre un PJ : « Appliquer » actif, pièce précochée) ; `refonte-ecran-browser.mjs` vert.

### G6 · Surprise et Vigilance
**Fichiers.** `js/core/store.js` (initialisation du combat ~l. 3199-3205 seulement), `js/core/turn-order.js`, `js/core/v5-talent-actions.js`, `js/core/v5-talent-situations.js`, `js/main.js` (saisie et application de l'initiative, y compris le `catch` ~l. 875), `js/ui/messages.js` si besoin, `js/ui/workspace.css` (« LOT G6 »), `tests/fixtures/store-golden.json` (ajouts seulement), tests unitaires (talents ou combat), `tests/recette-g6-browser.mjs` (nouveau).
**Critères.**
- **G6-a (R3)** « Vigilance : éviter une Surprise identifiée » n'est plus proposée hors surprise : seulement à un combattant qui porte le talent **et** l'État Surpris.
- **G6-b (p. 116, 161, 187)** Dans la saisie de l'initiative, dès qu'un camp est déclaré surpris, une colonne « Vigilance » apparaît pour chaque surpris qui a le talent : Test de Perception Challenging (+0 DR), d100 du PJ saisi, PNJ tiré comme ses dés d'initiative ; réussite = pas Surpris ; Surpris n'est posé qu'aux autres, avant le round 1. L'identifiant de la surprise est généré, jamais saisi. Annuler rétablit tout.
- **G6-c** La déclaration de la surprise est visible en tête de la saisie (« Surprise : aucune / camp … surpris »).
- **G6-d (R7)** Un échec d'enregistrement à l'application de l'initiative dit « Enregistrement local impossible, réessayez » (message de persistance) et non « corrigez les données » ; une vraie erreur de données garde son message.
- Hors périmètre (le MJ déclare la surprise) : le Test opposé Discrétion/Perception de la p. 161 n'est pas automatisé.
**Acceptation.** Tests unitaires (rouges d'abord) ; `store-golden` régénéré, ajouts seulement (diff au rapport) ; `timeout 120 node tests/recette-g6-browser.mjs` (camp surpris, un PJ avec Vigilance réussit et n'est pas Surpris, un autre l'est) ; `refonte-ecran-browser.mjs` vert.

### G7 · Quitter une mêlée
**Fichiers.** `js/ui/workspace-view.js` (`moveCommand`, `dropOnZone`), `js/ui/combat-decisions.js` (seulement si un type de décision doit être déclaré ; API `publishDecision` et `withdrawDecision` existantes), `js/ui/workspace.css` (« LOT G7 »), `tests/unit/ui/combat-decisions.test.js` ou un test neuf, `tests/recette-g7-browser.mjs` (nouveau).
**Critères.**
- **G7-a (R4, p. 163)** Quand le MJ fait quitter une mêlée à un combattant engagé (« Déplacer… » → Libre, engagement avec un autre, ou glisser vers une autre zone), une décision naît dans « À décider » : « X quitte la mêlée de Y » avec « Se désengager » (formulaire existant), « Fuir » (`applyFlee` existant : attaque gratuite de chaque adversaire engagé, Brisé) et « Sans règle ». Le déplacement déjà fait n'est pas refait ; « Sans règle » ne change rien.
- **G7-b** Un déplacement qui ne quitte aucune mêlée ne crée rien ; la décision se retire si le combattant est réengagé avec les mêmes adversaires ou retiré du combat ; elle ne bloque pas « Tour suivant » (CA9).
**Acceptation.** Tests unitaires ; `timeout 120 node tests/recette-g7-browser.mjs` (PNJ engagé avec un PJ, Libre → décision → Fuir → attaque gratuite proposée au PJ) ; `refonte-ecran-browser.mjs` vert.

### G8 · « Tour suivant » et vision nocturne
**Fichiers.** `tests/unit/combat/tour-suivant-rappel.test.js` (nouveau), `js/core/creature-senses.js` ou `js/core/map-link-state.js` (lecture des talents), `tests/unit/combat/liaison-carte-*.test.*` concerné (nouveau test ou extension), référence de `liaison-carte-messages-golden` seulement si sa fixture contient un PJ concerné (ajouts seulement, diff au rapport).
**Critères.**
- **G8-a (R5)** Test de non-régression : un rappel de fin de tour en attente ne bloque pas `nextTurn` (statut appliqué). Il doit passer sur la base : le dire au rapport.
- **G8-b (R10, p. 123, 360)** Un PJ dont la fiche ou le participant porte le talent Vision nocturne part vers la carte avec `visionDim: 10` ; Vision dans le noir (Infravision) : 20 ; rien : 1. Les Traits des PNJ donnent les mêmes valeurs qu'aujourd'hui. Le talent est lu là où les talents du PJ sont déjà lus par le moteur (`hasV5Talent` ou équivalent), pas par une liste d'espèces inventée.
**Acceptation.** `node --test` des fichiers touchés et de `liaison-carte-messages-golden.test.mjs`, `liaison-carte-protocole.test.mjs` verts.

### C2 · Carte : bridage du tour partout (dépôt `E:/rpg-map-display`) — en réserve
**Non lancé (MJ, 22/11 soir).** R8 a été vu au début de la recette, sans doute pendant la panne d'enregistrement local corrigée en 0aa34eb8 ; réessayé ensuite, ça marche (c4 « marche »). À revérifier à la prochaine recette ; si R8 revient, écrire alors le brief à partir de ce repérage, en commençant par reproduire.
**Fichiers.** `js/app/movePlanning.js`, `js/ui/player/selectionStrip.js`, `js/ui/player/gameHelp.js`, `js/app/gm.js` (réception des `token.move` des joueurs), `tests/tourDeJeu.spec.mjs` (ou le test unitaire du bridage), `docs/ETAT.md`.
**Critères.** (1) Un trajet préparé pour un PJ lié n'est plus validable après un `mj.turn` qui donne le tour à un autre (le plan est invalidé). (2) Bandeau de sélection et aide passent le tour au calcul de « manipulable ». (3) L'écran MJ refuse un `token.move` des joueurs pour un PJ lié hors de son tour. (4) Inchangés : PJ non lié jamais bridé ; le MJ déplace librement ; `ref: null` = tout libre (décision du MJ du 22/11). Chaque effet est muté pour voir le rouge. Aucun message de liaison changé.
**Acceptation.** `PW_PORT=4180 pnpm run verify` vert ; commit local sur sa branche.

### C3 · Carte : ennemi dans la lumière d'un PJ (dépôt `E:/rpg-map-display`)
**Approche.** Reproduction d'abord (règle du MJ : pas de correctif sans reproduction). Un test par piste, dans `tests/lights.spec.mjs` ou `tests/fogLayer.test.mjs` : PJ lié avec torche (posée par le panneau MJ, puis par la voie que le MJ indiquera, question Q4), ennemi qui finit son mouvement dans la lumière et en ligne de vue → pion visible des joueurs. Pistes : `emitsLight` absent du pion lié ; ligne de vue ; ancrage seul d'un grand pion (`tokens.js:334`) ; masque non republié après le mouvement de l'ennemi ; ennemi caché.
**Critères.** Si une piste reproduit : correctif de la cause, test vert, mutation rouge. Si aucune ne reproduit : rien n'est modifié dans le code, le rapport liste les scénarios essayés et ce qu'il faut demander au MJ.
**Acceptation.** `PW_PORT=4180 pnpm run verify` vert.

### G9 · Recette de la passe G
**À livrer.** Toutes les branches G fusionnées : `tests/recette-g*-browser.mjs` et `refonte-ecran-browser.mjs` verts, `npm run test:browser-socle` sans nouveau rouge, suite unitaire complète (deux commandes de `CLAUDE.md`), `fiche-de-table.md` complétée d'une section « Passe G » (un geste par retour, R1 à R17, à refaire à la table), notes de version (brouillon). Ni version ni publication.

### Questions au MJ
- **Q1 (R14)** Sans carte, la distance du tireur est inconnue : précocher « tireur à portée d'esquive » à oui (recommandé, comme « tout précoché ») ou à non ?
- **Q2 (R16)** Sort de zone : option A, point d'impact dans l'outil et cases à cocher pour les touchés (recommandé, outil seul) ; ou option B, clic sur une case de la carte qui renvoie les pions dans le rayon (nouveau message, version 3, les deux dépôts) ?
- **Q3 (R4)** Choix par défaut, à infirmer : quitter une mêlée par un déplacement du MJ crée une décision « Se désengager / Fuir / Sans règle » (p. 163), sans attaque d'opportunité hors Fuite.
- **Q4 (R9)** Comment la torche du PJ était-elle posée (panneau de la carte, autre) ? Quelle taille avait l'ennemi ? Le niveau était-il dans le noir ?
- Choix par défaut, à infirmer : Taille (arme) sur plusieurs pièces superposées → celle de plus fort PA précochée (le livre ne tranche pas).
