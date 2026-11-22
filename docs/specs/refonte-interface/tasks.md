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
