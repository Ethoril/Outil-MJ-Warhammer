# Plan · Refonte de l'interface

Spec : [spec.md](spec.md) · Tâches : [tasks.md](tasks.md). Code de l'existant : `js/ui/workspace-view.js` (3 571 lignes, rend les quatre espaces), `js/ui/resolution-panel.js` (3 410), `js/ui/workspace.css` (1 935), `MJ.css` (567), `js/ui/combat-banner.js`, `js/ui/side-panel.js`, `js/ui/workspace/plateau.js`.

## 1. Approche

On ne réécrit pas l'interface : on **reloge** les blocs existants dans une grille fixe, puis on remplace, zone par zone, ce qui ne tient pas. Le moteur (`js/core/`) ne change pas, sauf un champ facultatif (§4).

1. **Grille à zones.** L'espace Jouer devient une grille CSS de hauteur fixe (`100dvh` moins la barre du haut) : `frise` (haut), `acteur` (gauche, 330 px), `centre` (mêlées puis résolution), `droite` (« À décider » puis cible, 330 px), `bas` (barre d'actions et onglets Règles · Profils · Journal). Chaque zone porte `data-zone="…"` : c'est l'accroche des tests et des lots. Le bandeau de combat fusionne dans la barre du haut (round, au tour de, « agit hors de son tour », compteur de décisions, Tour suivant).
2. **Nouveaux modules, un par zone neuve**, pour que les lots ne se marchent pas dessus dans `workspace-view.js` : chaque module exporte une fonction pure de modèle (testable sous Node) et une fonction de rendu `render…(zoneEl, context, handlers)` appelée depuis `renderPlay()`.
3. **Police système** : `--font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, sans-serif` pour tout ; les `@font-face` de `MJ.css`, les fichiers `assets/fonts/*` et leur précache dans `sw.js` sont retirés.
4. **Mesure automatique** : un parcours navigateur joue la rencontre R20 à 1440 × 800 et mesure, à chaque étape, le défilement de la page et de chaque `[data-zone]`, plus la présence à l'écran de la case « À décider ». C'est le test d'acceptation commun ; il échoue sur la 3.56.0.

## 2. Fichiers

| Fichier | Rôle |
|---|---|
| `tests/fixtures/rencontre-r20.json` (nouveau) | Sauvegarde : R20, 20 combattants tirés du bestiaire (pages citées dans `notes`), un PJ monté, un prêtre, un lanceur de sorts. Générée par `tools/build-r20-fixture.mjs` (nouveau). |
| `tests/refonte-ecran-browser.mjs` (nouveau) | Parcours CA1 à CA3, CA4 à CA12, CA19, CA20 ; mesures ; captures dans `tmp/`. |
| `js/ui/combat-frise.js` (nouveau) | `friseModel(context) → [{ id, rang, tour, joue, mort, pv, pvMax, elan, monture, decision }]` ; rendu ; clic → `selectActor(id)` existant. |
| `js/ui/combat-decisions.js` (nouveau) | `collectDecisions(context, store) → [{ id, kind, participantId, titre, options }]` : les 26 décisions du relevé §A, chacune avec ses boutons ; rendu de la case et du compteur. Les formulaires existants sont déplacés, pas réécrits, quand ils tiennent dans la case. |
| `js/ui/combat-distance.js` (nouveau) | `distanceChoices(plateau, carte, arme)` et `distanceToContext(choix) → { shotRange, engagedWithShooter, targetEngaged, … }` : la ligne « Distance » traduite dans les champs `v5Context` actuels, que le moteur lit déjà. |
| `js/ui/workspace-view.js` | `renderPlay()` monte la grille et appelle les modules ; `renderSheet` allégé (fiche complète en panneau superposé, menu ⋯) ; `renderTrack` devient les cartouches des mêlées (clic = cible) ; bannière de mort subite retirée ; suites de combat retirées de l'écran. |
| `js/ui/resolution-panel.js`, `js/ui/resolution-panel/*.js` | Résolution compacte : puces de circonstances déduites + panneau « autres… » en colonnes ; ligne Distance ; d100 de déviation demandé dans le pied seulement s'il sert ; case `pointBlank` retirée de l'interface. |
| `js/ui/workspace/plateau.js` | « Ce qu'il peut faire d'ici » fusionne dans la barre d'actions. |
| `js/ui/combat-banner.js`, `js/ui/side-panel.js` | Fusion dans la barre du haut ; onglets en bas. |
| `js/main.js` | Démarrage : « tout faire entrer » au lancement d'une rencontre ; initiative rendue dans la case centrale au lieu de la feuille ; la liste suit les entrées et retraits (B1). |
| `js/ui/encounter-end-dialog.js`, `js/ui/campaign-workspace.js` | Accueillent séquelles, convalescence et calendrier sortis de l'écran (CA20). |
| `js/ui/workspace.css`, `MJ.css`, `sw.js`, `index.html`, `assets/fonts/*` | Grille, tokens, police ; précache. |

## 3. Contrats entre modules

- `context` = l'objet que `playContext()` construit déjà (participants, ordre, acteur, cible, brouillon de résolution). Aucun module ne lit le store directement, sauf `combat-decisions.js` pour les aperçus que le moteur expose déjà (`previewSuddenDeath`, aperçus de critique, de corruption…).
- `handlers` = les fonctions existantes de `workspace-view.js` (`selectActor`, `selectTarget`, `updateStates`, actions du store) passées telles quelles.
- Mort subite : « Mort » et « Inconscient » appellent `Store.decideSuddenDeath(id, issue, { secondaryNpcConfirmed: true, baseRevision })` ; « Plus tard » ne fait que réduire la carte ; « Pas un figurant » écrit le champ du §4.

## 4. Données

Un seul ajout, facultatif : `participant.extensions.v5.suddenDeathDeclined: true` quand le MJ répond « Pas un figurant ». Absent = faux, lu au point de lecture (règle du projet), sans migration ni changement de `schemaVersion` ; les règles Firebase ne décrivent pas les participants (vérifié : aucune clé `participants` ni `extensions` dans `firebase.database.rules.json`), rien à déployer. Second ajout (lot E4c, CA24-CA25) : une commande annulable du store, « jouer son tour maintenant », qui donne le tour au combattant choisi et garde dans des champs facultatifs du combat (sous `combat.extensions.v5`) qui reprendra ensuite et qui a déjà joué par anticipation dans ce round ; absents = rien d'avancé, lus au point de lecture, sans migration ni `schemaVersion`. Le calcul de l'ordre d'initiative ne change pas. Rien d'autre : sauvegardes, synchronisation, fiches et messages de la carte inchangés (CA18).

## 5. Tests existants

- Tests unitaires : leurs attentes de **règles** ne changent pas (CA17). Un test qui vérifie la **structure du DOM** de l'ancien écran peut être adapté ; chaque adaptation est justifiée dans le rapport du lot.
- Parcours navigateur : `npm run test:browser-socle` à chaque lot (sous `timeout 120` par fichier) ; les sélecteurs cassés par la refonte sont réparés dans le lot qui les casse.

## 6. Vérification de chaque critère

| CA | Vérification |
|---|---|
| 1, 2, 3 | `timeout 120 node tests/refonte-ecran-browser.mjs` : `scrollHeight ≤ innerHeight` et `scrollWidth ≤ innerWidth` à chaque étape ; aucune `[data-zone]` dont `scrollHeight > clientHeight` sur R20 (sauf onglets Règles et Journal) ; panneaux ouverts contenus dans la fenêtre. |
| 4, 5, 6 | `tests/unit/ui/combat-frise.test.js` (modèle) ; parcours : clic sur la frise change l'acteur et pas la cible ; clic sur un cartouche change la cible. |
| 7, 8, 9, 10 | `tests/unit/ui/combat-decisions.test.js` : une situation par type de décision (26) → une entrée ; parcours : PNJ à 0 PV → carte visible dans la fenêtre, compteur, marque sur la frise ; Tour suivant actif ; mort en un clic. |
| 11, 12 | Parcours : lancement R20 → 20 actifs ; ajout et retrait d'un combattant pendant la saisie de l'initiative. |
| 13, 14, 15 | `tests/unit/combat/distance-tir.test.js` : chaque choix → mêmes champs `v5Context` et même aperçu de résolution qu'en 3.56.0 sur six cas (contact, bout portant, arme sans bout portant, courte, mêlée tierce touchée, mêlée tierce déviée). |
| 15a, 15b | `tests/unit/ui/circonstances-pertinentes.test.js` : pour chaque type d'action, la liste proposée ne contient que des circonstances applicables (≤ 12), chacune avec son effet en clair ; aucune n'a sa valeur déductible du plateau, de la carte, des États ou des armes (celles-là sortent en puces déduites, forçables). |
| 24, 25 | `tests/unit/combat/jouer-tour-maintenant.test.js` : commande du store, annulable ; Tour suivant revient au combattant attendu, le combattant avancé est sauté à sa place, le round suivant reprend l'ordre ; refus pour un combattant qui a déjà joué ; parcours : bouton sur la frise et dans le bandeau. |
| 26, 27 | Test unitaire du modèle de la barre d'actions (`plateau.js`) : « Charger » présent pour chaque ennemi non engagé avec l'acteur choisi comme cible, sans limite ; mention p. 163 et forçage si l'acteur est engagé ailleurs ; parcours : cible choisie puis Charger. |
| 16 | `recette-fonctions.md` : chaque ligne de `fonctions-jouer.md` §1-10 avec son nouvel emplacement et son nombre de clics, cochée au lot E6. |
| 17 | Suite unitaire complète au lot E6 (deux commandes de `CLAUDE.md`). |
| 18 | Garde données : `git diff main -- js/core/ firebase.database.rules.json` ne montre que la lecture du champ du §4 ; `liaison-carte-messages-golden` vert. |
| 19 | `tests/unit/ui/rencontre-retrait-monture-elan.test.js` (adapté si DOM) + parcours. |
| 20 | Parcours : rien de « Séquelles » dans `[data-zone]` ; présent à la fin du combat et dans Campagne. |
| 21 | `tests/unit/ui/contrastes-theme.test.mjs` (ratio des couples texte/fond des deux thèmes ≥ 4,5) ; aucune `@font-face` ni police chargée (parcours : `document.fonts` vide). |
| 22 | `tests/unit/ui/raccourcis-clavier.test.mjs` inchangé et vert. |
| 23 | Lots F : même parcours étendu aux trois espaces. |

## 7. Complexité justifiée

- **Trois modules neufs** (`combat-frise`, `combat-decisions`, `combat-distance`) : `workspace-view.js` fait déjà 3 571 lignes ; sans eux, les lots se suivraient tous dans le même fichier et ne pourraient pas avancer en parallèle. Chacun porte une fonction pure, testable sans navigateur.
- **Une fixture et un parcours navigateur** : « aucune page ne défile » ne se vérifie pas sous Node ; c'est la seule mesure fiable du critère central.
- Pas de framework, pas de bibliothèque de composants, rien pour le multi-jeux : ces modules restent dans le module Warhammer.
