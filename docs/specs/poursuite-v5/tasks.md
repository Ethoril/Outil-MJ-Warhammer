# Tâches · Poursuite selon le Livre de base V5

Spec : [spec.md](spec.md) · Plan : [plan.md](plan.md). Tout est séquentiel : deux lots n'écrivent jamais dans les mêmes fichiers en parallèle. Branche locale `poursuite-v5`, ne pas en changer.

## Règles communes (chaque brief les reprend)

- Lire d'abord `CLAUDE.md` (racine), la spec en entier (section « Règle relue le 16/11/2026 » : elle fait foi) et le plan.
- Le test d'un lot est écrit **avant** son code et échoue d'abord. Tests ciblés, **un fichier par commande** : `node --test tests/unit/<dossier>/<fichier>.test.js`, jamais `node --test tests/unit/<dossier>` ; navigateur sous `timeout 120`. Jamais la suite complète (lancée une fois à la fusion).
- Interdits : modifier la spec ; pousser ; `git stash` ; `git add -A` ou `git add .` ; changer une règle métier pour faire passer un test (s'arrêter et expliquer) ; reformater du code sans rapport ; ajouter une dépendance ; recopier du texte du livre. Yards = mètres, même valeur.
- Un nouveau fichier de `js/` est ajouté au précache de `sw.js` ; `node --test tests/unit/donnees/audit-meta-production.test.js` doit rester vert.
- Commit local, fichiers nommés un par un, message en français suffixé « (Claude) », terminé par `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.
- Rapport final, en français et court : fichiers modifiés (une ligne chacun), sorties des commandes « fini quand », hash du commit, ce qui n'a pas pu être vérifié.
- Si bloqué : s'arrêter et expliquer, ne pas improviser.

## L1 — Moteur de règle et table des Obstacles
*Modèle conseillé : Sonnet. Après : rien.*

**But.** Écrire le module pur de la règle de poursuite et la table d'Obstacles d10, avec leurs tests.

**Contexte.** Lire : `js/core/v5-broken-escape.js` (la fin : `resolveV5PursuitStep`, à ne pas toucher ici) ; `js/core/map-link-state.js` (`rangeCellsOf`, `speedCells`) ; `js/core/mounts.js` (`ownMountIdOf`, lien cavalier → monture) ; `js/core/v5-roll.js` (`resolveV5Opposition`). Modèle de module pur et de test : `js/core/engagements.js`, `tests/unit/combat/engagements-store.test.js` (forme seulement). Compétences : l'outil les nomme comme les fiches (`Corps à corps (Base)`, `Conduite d'attelage`, liste dans `js/core/fiche-sync.js`) ; la table porte des préfixes repliés (accents et casse), raccordés aux noms de la table d10 de la spec.

**Fichiers autorisés.** `js/core/v5-pursuit.js` (nouveau), `js/data/v5-pursuit-obstacles.js` (nouveau, figé), `tests/unit/combat/poursuite-v5-regle.test.js` (nouveau), `tests/unit/donnees/poursuite-obstacles.test.mjs` (nouveau), `sw.js` (précache).

**À livrer.** `PURSUIT_CATCH_DR = 6` et `PURSUIT_SOURCE` (« Livre de base V5, p. 158-159 ») ; `pursuitMovementOf` (D14, `null` si inconnu, monture du cavalier monté) ; `pickPursuitPair` (D10, plus rapide poursuivant contre plus lent fuyard, correction du MJ possible) ; `movementVerdict` (double juste : fin ; un point de moins : continue ; direction poursuivant ou fuyard avec motif affiché) ; `suggestFactors` (D13 : Test gagné et Mouvement, le terrain reste au MJ ; trois cases) ; `obstacleCountRequired` ; `drawObstacle(d10)` et `freeObstacle` ; `evaluatePursuit` (fin à 6 DR, Mouvement double, réussites atteintes ou non, issue partielle D15, camp qui franchit les Obstacles D12, PJ des deux côtés : simple Test opposé, sans Obstacle). Fonctions pures, aucune écriture, aucune mutation des entrées.

**Critères couverts.** CA1, CA2, CA3, CA4, CA5, CA8, CA9 ; D1, D3, D10, D12, D13, D14, D15 (règle). CA24 (moteur).

**Interdits spécifiques.** Ne pas calculer de Test ici (lot 2) ; ne pas toucher `resolveV5PursuitStep`.

**Fini quand.**
- `node --test tests/unit/combat/poursuite-v5-regle.test.js` (bornes 5 et 6 DR, double juste et un point de moins, paire, facteurs, nombre d'Obstacles pour 1 à 6 personnages et 0 à 3 facteurs, d10 injecté de 1 à 10, obstacle libre, issue partielle, entrées gelées).
- `node --test tests/unit/donnees/poursuite-obstacles.test.mjs` (dix entrées, compétences présentes dans les noms de fiche connus).
- `node --test tests/unit/donnees/audit-meta-production.test.js`.

## L2 — Tests calculés et retrait de l'ancienne fonction
*Modèle conseillé : Sonnet. Après : L1.*

**But.** Calculer le Test de poursuite et le Test d'Obstacle par le calcul commun, et supprimer `resolveV5PursuitStep`.

**Contexte.** Lire : `js/core/v5-test-modifiers.js` (`previewV5SecondaryTest`, `secondaryTestDetail`, lignes 225-273) ; `js/core/v5-broken-escape.js` (`resolvePursuitActorTest`, `resolveV5PursuitStep` : à supprimer) ; `js/core/v5-talent-tests.js` ligne 25 (`pursuit`, `pursuitRole`) ; contrats de `talent-flee`, `talent-relentless`, `talent-striding-gait` dans `js/data/v5-additional-talent-contracts.json` ; `js/core/v5-roll.js` (`resultTier`, « Réussite éclatante » à +5 DR). Modèle de test : `tests/unit/moteur/q6-t5-hors-combat.test.js`.

**Fichiers autorisés.** `js/core/v5-pursuit.js`, `js/core/v5-broken-escape.js` (retrait seulement), `tests/unit/moteur/poursuite-v5-tests.test.js` (nouveau), `tests/unit/combat/initiative-et-tours.test.js` (retrait du test C02), `tests/unit/moteur/q6-ca1-comparaisons.test.js` (cas F3), `tests/unit/moteur/q6-t5-hors-combat.test.js` (tests « poursuite … »), `sw.js` si besoin.

**À livrer.** `previewPursuitTest(actor, input)` : compétence choisie (Athlétisme, Conduite, Chevaucher, Natation), jet saisi, `context.pursuit` et `context.pursuitRole`, États (Brisé, Aveuglé, À terre), séquelles, Inconscient et Surpris bloqués avec leur motif, poursuivant Brisé qui subit le malus sans question, proie Brisée sans pénalité. `previewObstacleTest(actor, { obstacle, skill, roll, context })` : compétence parmi celles de l'obstacle, aperçu score, jet, modificateurs, réussites, Réussite éclatante (+5 DR) avec `beneficiaryOptions` (alliés de la poursuite, D11), Obstiné et questions d'État rendus en attente comme les autres Tests. Les anciens tests sont réécrits avec les mêmes témoins, pas supprimés, sauf C02 (échelle de distance) retiré avec justification dans le message de commit.

**Critères couverts.** CA6, CA7, CA10, CA11, CA5 ; D4, D11. CA24 (moteur).

**Interdits spécifiques.** Ne pas toucher aux contrats de talents ni au moteur d'effets : si le non-double-comptage l'exige, s'arrêter et expliquer. Aucun `slModifier` manuel pour Fuite !, Impitoyable, Acharné, Grandes enjambées.

**Fini quand.**
- `node --test tests/unit/moteur/poursuite-v5-tests.test.js` (un talent compté une seule fois : DR de la proie avec Fuite ! = DR sans + le montant du contrat ; idem Impitoyable ; Grandes enjambées par `pursuit` et terrain).
- `node --test tests/unit/moteur/q6-t5-hors-combat.test.js`
- `node --test tests/unit/moteur/q6-ca1-comparaisons.test.js`
- `node --test tests/unit/combat/initiative-et-tours.test.js`
- `grep -rn "resolveV5PursuitStep" js tests` ne rend plus rien.

## L3 — Commandes du Store : poursuite en combat, hors combat, fin
*Modèle conseillé : Opus (moteur partagé : commandes, historique, registre des Actions, Obstiné). Après : L2.*

**But.** Écrire les commandes du Store qui conservent l'état de poursuite, consomment l'Action, tracent le journal et s'annulent.

**Contexte.** Lire : `js/core/store/api-engagements.js` (forme d'un module d'API, journal, `withLog`) ; `js/core/store/api-v5-combat-actions.js` (`previewBrokenEscape` / `applyBrokenEscape` : aperçu émis, comparé, `baseRevision`, entrée unique, `consumeObstinate`) ; `js/core/store/v5-action-guards.js` (`recordV5ActionUsage`, `standardV5ActionSpent`) ; `js/core/store.js` (`executeCommand` ligne 1613, `removeParticipant` ligne 1997, `nextTurn`) ; `js/core/engagements.js` (`withEngagement`, `withoutEngagements`). Modèle de test : `tests/unit/combat/engagements-store.test.js` (dont rechargement par `loadFromJSON`).

**Fichiers autorisés.** `js/core/store/api-pursuit.js` (nouveau), `js/core/store.js` (câblage de `createPursuitApi` uniquement), `tests/unit/combat/poursuite-v5-store.test.js` (nouveau), `sw.js`.

**À livrer.** Contrats du plan : `startPursuit` (refuse si le fuyard est hors de vue, CA12 ; Mouvements par `pursuitMovementOf`, corrigeables), `previewPursuitTest` / `applyPursuitTest`, `setPursuitMovement`, `setPursuitFactors` (trois cases booléennes, aucune valeur hors 0-3), `setPursuitObstacle` (tirage ou obstacle libre, tracé au journal), `previewObstacleTest` / `applyObstacleTest`, `endPursuit({ reason: 'gm' })`, `previewScenePursuit` / `applyScenePursuit` (D8 : un bloc, aucune Action, aucun Round, rien de conservé), `applyPursuitEnd('engage' | 'remove')` (D6 : `withEngagement` du fuyard avec ses poursuivants, ou retrait du fuyard échappé ; ne rien cliquer ne change aucune donnée). Une ligne de journal à chaque étape ; à la fin, issue et motif (6 DR, Mouvement double, abandon du MJ) et, pour D15, le nom de ceux qui ont franchi leur Obstacle, le rappel du poursuivant seul et le bouton de retrait du fuyard qui s'échappe quand même. Un Test consomme l'Action du Tour (refusé si déjà utilisée) ; l'état survit à `nextTurn` et au rechargement ; un aperçu périmé est refusé (« recalculez »).

**Critères couverts.** CA5, CA9, CA12, CA13, CA14, CA15, CA16, CA17, CA18, CA19, CA20 ; D5, D6, D8, D9, D15. CA24 (Store).

**Interdits spécifiques.** Aucune interface. Ne pas modifier `executeCommand` ni l'historique : s'ils manquent quelque chose, s'arrêter et expliquer.

**Fini quand.**
- `node --test tests/unit/combat/poursuite-v5-store.test.js` (Action consommée et refus du second Test ; paire comparée après les deux Tests ; deux Rounds ; ↶ rend état, Action et Obstiné, ↷ réapplique ; aperçu périmé ; rechargement ; fermeture sans valider n'écrit rien ; fuyard rattrapé puis `engage` ; échappé puis `remove`).
- `node --test tests/unit/combat/engagements-store.test.js`
- `node --test tests/unit/donnees/audit-meta-production.test.js`

## L4 — Attaque gratuite à la fuite d'un Brisé engagé
*Modèle conseillé : Opus (chaîne de résolution des attaques, liste blanche). Après : L3.*

**But.** Permettre à chaque adversaire engagé de jouer une attaque gratuite sans dépenser son Action, et alimenter `freeAttackSpentMomentumIds`.

**Contexte.** Lire : `js/core/v5-broken-escape.js` (fuite engagée, lignes 43-77 : `freeAttackSpentMomentumIds`, `freeAttacksResolved`) ; `js/core/store/api-v5-combat-actions.js` (`applyBrokenEscape`) ; `js/core/store.js` lignes 4265 (`freeAttackCandidate` et sa liste blanche), 4323, 4427, 4594 (`isV5ActionUse`, `recordV5ActionUsage`) ; `js/core/store/v5-action-guards.js` (`canonicalFreeAttack`) ; `js/core/resolution/input.js` ligne 70. Modèle de test : `tests/divin-v5-broken-escape-cloud-scenarios.mjs` (appels `previewBrokenEscape`) et `tests/unit/combat/initiative-et-tours.test.js` (fuite engagée).

**Fichiers autorisés.** `js/core/store.js`, `js/core/resolution/input.js`, `js/core/store/v5-action-guards.js`, `js/core/store/api-v5-combat-actions.js`, `tests/unit/combat/brise-attaque-gratuite.test.js` (nouveau).

**À livrer.** Un `freeAttackTalent: 'flee-free-attack'` accepté pour un adversaire hors de son Tour, qui ne consomme ni `standardTurnActions` ni quota d'Action ; la liste des adversaires dont l'attaque est jouée ou passée ; la fuite engagée aboutit (parcours du commit a5ebc57) quand tous ont joué ou passé ; le moteur reçoit `freeAttackSpentMomentumIds`.

**Critères couverts.** CA21, CA22, CA23 (côté Store) ; D7. CA24 (attaque gratuite).

**Interdits spécifiques.** Ne pas modifier les autres attaques gratuites (`divine-free-attack`, `reaction-strike`, `glorious-demise`, `frenzy`) ; ne rien changer au coût d'Élan des autres actions.

**Fini quand.**
- `node --test tests/unit/combat/brise-attaque-gratuite.test.js` (Action de l'adversaire inchangée avant et après ; Élan dépensé ou non selon la liste ; fuite appliquée une fois la liste complète).
- `node --test tests/unit/combat/initiative-et-tours.test.js`
- `node --test tests/unit/combat/engagements-store.test.js`

## L5 — Interface en combat : panneau du Brisé et assistant de poursuite
*Modèle conseillé : Sonnet. Après : L4.*

**But.** Ajouter au panneau du Brisé le bouton de lancement, l'assistant de poursuite par Rounds, les boutons de fin et l'attaque gratuite.

**Contexte.** Lire : `js/ui/v5-broken-escape-panel.js` (`renderActor`, `previewBlock`, fuite engagée lignes 166-196) ; `js/ui/test-questions.js` (`renderTestQuestions`, Obstiné) ; `js/ui/workspace-view.js` ligne 216 (câblage du panneau) et 3025 (`selectActor`). Modèle de rendu : le panneau lui-même (`node`, `selectField`, `data-*`, brouillon par acteur, `refresh`).

**Fichiers autorisés.** `js/ui/v5-pursuit-panel.js` (nouveau), `js/ui/v5-broken-escape-panel.js`, `js/ui/workspace-view.js`, `js/ui/workspace.css`, `sw.js`.

**À livrer.** « Lancer la poursuite » proposé seulement si le fuyard reste visible d'au moins un ennemi (absent sinon) ; participants et Mouvements corrigeables ; compétence, jet, aperçu et Application de chaque Test du Tour courant ; facteurs cochés par l'outil et modifiables ; obstacle proposé, remplaçable par un obstacle libre ; Tests d'Obstacle ; Réussite éclatante avec choix du bénéficiaire ; issue, motif, boutons « Engager au plateau » et « Retirer de la rencontre », rappel du poursuivant seul ; boutons « Jouer l'attaque gratuite » (ouvre l'attaque de l'adversaire sans lui prendre son Action), case « a dépensé son Élan », « Attaques gratuites résolues » cochée seule. Tout en français, noms accessibles, `data-*` stables pour les parcours.

**Critères couverts.** CA12, CA13, CA16, CA17, CA18, CA21, CA22, CA23 (interface) ; D2, D5, D6, D7, D9, D11, D13, D15.

**Interdits spécifiques.** Aucune logique de règle dans l'interface (tout passe par le moteur et le Store) ; ne pas refondre le reste du panneau Brisé (Flee, Sprint, Hide).

**Fini quand.**
- `node --test tests/unit/donnees/audit-meta-production.test.js`
- `node --test tests/unit/combat/poursuite-v5-store.test.js`
- `timeout 120 node tests/brise-engage-fuite-browser.mjs` (non-régression)
- `timeout 120 node tests/accessibilite-browser.mjs`

## L6 — Interface hors combat : modale de l'écran Jouer
*Modèle conseillé : Sonnet. Après : L5.*

**But.** Ajouter sur l'écran Jouer la modale de poursuite de scène, résolue d'un bloc.

**Contexte.** Lire : `js/ui/v5-fortune-dialog.js` (modèle de modale : `dialog`, `showModal`, fermeture sans écriture, révision) ; `js/ui/v5-pursuit-panel.js` (rendus partagés d'obstacle et de facteurs) ; `js/ui/workspace-view.js` (espace `play`, ligne 3013).

**Fichiers autorisés.** `js/ui/v5-pursuit-dialog.js` (nouveau), `js/ui/v5-pursuit-panel.js` (export de rendus seulement), `js/ui/workspace-view.js` (bouton d'entrée), `js/ui/workspace.css`, `sw.js`.

**À livrer.** Bouton d'entrée sur l'écran Jouer (grisé sans participant) ; modale : participants et Mouvements, Test opposé (deux jets), facteurs, Obstacles et leurs Tests, issue et boutons de fin si la rencontre existe ; « Valider » appelle `applyScenePursuit` (une entrée d'historique, une ligne de journal) ; fermer sans valider n'écrit rien ; aucune Action, aucun Round.

**Critères couverts.** CA19, CA20 ; D2, D8.

**Interdits spécifiques.** Aucun état conservé hors de la modale ; ne pas créer d'écran dédié.

**Fini quand.**
- `node --test tests/unit/donnees/audit-meta-production.test.js`
- `node --test tests/unit/combat/poursuite-v5-store.test.js`
- `timeout 120 node tests/accessibilite-browser.mjs`

## L7 — Parcours navigateur et non-régression
*Modèle conseillé : Sonnet. Après : L6.*

**But.** Écrire les deux parcours de recette de bout en bout et vérifier que les parcours voisins restent verts.

**Contexte.** Lire : `tests/brise-engage-fuite-browser.mjs` (modèle complet : serveur statique, `Store.loadFromJSON`, onglet Jouer, ↶, rechargement) ; `tests/engagements-plateau-browser.mjs` ; `tests/parcours.json` (classement obligatoire d'un nouveau parcours).

**Fichiers autorisés.** `tests/poursuite-v5-browser.mjs` (nouveau), `tests/poursuite-hors-combat-browser.mjs` (nouveau), `tests/parcours.json`.

**À livrer.** Parcours combat : un Brisé engagé fuit, attaques gratuites jouées (Élan dépensé pour l'une), lancement de la poursuite, deux Rounds avec un Obstacle, fin, bouton ; ↶ et rechargement. Parcours hors combat : ouverture, fermeture sans écriture, validation, issue, bouton de fin. Les deux sont inscrits dans `parcours.json` (famille « ticket », chantier « poursuite-v5 »).

**Critères couverts.** CA25 ; en recette : CA12, CA14, CA15, CA19, CA20, CA23.

**Interdits spécifiques.** Ne modifier aucun code de production : une anomalie se rapporte, elle ne se corrige pas ici.

**Fini quand.**
- `timeout 120 node tests/poursuite-v5-browser.mjs`
- `timeout 120 node tests/poursuite-hors-combat-browser.mjs`
- `timeout 120 node tests/brise-engage-fuite-browser.mjs`
- `timeout 120 node tests/engagements-plateau-browser.mjs`
- `node --test tests/unit/donnees/audit-meta-production.test.js`

## Fusion (hors lots)

Suite unitaire complète une fois (`node --test "tests/unit/**/*.test.js"` puis `node --test "tests/unit/**/*.test.mjs"`), notes de version à la main (README, `docs/SUIVI_EVOLUTION.md`), version par `node tools/bump-version.mjs`, publication après le feu vert du MJ seulement.
