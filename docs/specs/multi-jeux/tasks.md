# Tâches · Outil MJ multi-jeux

Spec : [spec.md](spec.md) · Plan : [plan.md](plan.md). Six lots, plus M1 facultatif. Chaque lot est lancé dans une session neuve, après le feu vert du MJ sur ce cadrage.

| Lot | But | Modèle | Après | Publication |
|---|---|---|---|---|
| L1 | Liaison carte : protocole neutre et projection Warhammer | **Opus** | — | P1, seul |
| L2 | Chapeau : registre des jeux, sélecteur, garde-fous de stockage | Sonnet | L1 (partage `sw.js`) | P2 |
| C1 | Cthulhu : règles arbitrées | Sonnet | réponses Q8 · [P] avec L1, L2 | P2 |
| C2 | Cthulhu : profils et rencontre | Sonnet | C1 | P2 |
| C3 | Cthulhu : page, sauvegarde séparée, hors ligne | Sonnet | L2, C2 | P2 |
| C4 | Cthulhu sur la carte | Sonnet | L1, C3 (et M1 s'il a lieu) | P2 |
| M1 | Carte : marqueurs Mourant et folie (si Q5 = oui) | Sonnet | — · dépôt `rpg-map-display` | avant P2 |

## Règles communes (bloc collé en tête de chaque brief)

- Lire `CLAUDE.md`, la spec, le plan, puis le brief. Pour Cthulhu, lire aussi la maquette : `git show archive/maquette-cthulhu-18-11:<chemin>` (`maquette-cthulhu/*.js`, `tests/unit/cthulhu/*.test.js`, `docs/EXPLORATION_CTHULHU.md`).
- Le test d'un lot est écrit **avant** son code et échoue d'abord (sauf le test d'or de L1, vert avant et après par construction).
- Tests ciblés, un fichier par commande : `node --test tests/unit/<dossier>/<fichier>.test.js` (ou `.test.mjs`) ; jamais un dossier ; tout test navigateur sous `timeout 120`. Pas de suite complète (lancée à la fusion).
- **Non-régression** : aucun test existant n'est modifié. Un test existant qui échoue : s'arrêter et expliquer.
- **Garde données (à chaque lot)** : `git diff main -- firebase.database.rules.json js/core/sync.js js/core/sync-session.js js/core/sync-protocol.js js/core/sync-migration.js js/core/migrations.js js/core/fiche-source.js js/core/fiche-sync.js js/core/fiche-writeback.js js/data/donnees-communes.js docs/CONTRAT_LIAISON_MAP_DISPLAY.md` doit être vide.
- Un agent ne touche aucun fichier hors de sa liste « Fichiers autorisés » ; s'il en faut un autre, il le dit au rapport et s'arrête sur ce point. Tout nouveau module servi par une page va au précache de `sw.js`. Lot qui touche `js/ui/` ou `index.html` : `node tools/run-browser-journeys.mjs --socle`.
- Interdits : modifier la spec, le plan ou un autre brief ; pousser ; `git stash` ; `git add -A` ou `git add .` ; changer une règle pour faire passer un test ; reformater du code sans rapport ; ajouter une dépendance ; modifier `tests/fixtures/store-golden.json` ; toucher `E:\rpg-map-display` ou le dépôt des fiches (sauf M1) ; changer la version. Interface et messages en français. Yards = mètres, même valeur. Une absence de champ facultatif se lit comme vide au point de lecture.
- Commit local, fichiers nommés un par un, message en français suffixé « (Claude) », terminé par la ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (ou le modèle réel).
- Rapport final court : fichiers modifiés (une ligne chacun), sortie de chaque commande d'acceptation, hash du commit, ce qui n'a pas pu être vérifié. Si bloqué : s'arrêter et expliquer.

## L1 · Liaison carte : protocole neutre et projection Warhammer
*Opus (protocole en production, onze tests existants à garder verts). Après : rien. Publiable seul (P1).*

**But.** Sortir de `js/core/map-link.js` un protocole commun qui ne charge aucune règle de Warhammer, sans changer un seul message envoyé à la carte.

**Contexte.** Plan §3 (signature et répartition) ; `docs/CONTRAT_LIAISON_MAP_DISPLAY.md` §2 à §10 ; tests existants `tests/unit/combat/liaison-carte*.test.*`, `liaison-images.test.js`, `tests/unit/ui/map-link-indicator.test.js`.

**Fichiers autorisés.** `js/core/map-link-protocol.js` (nouveau), `js/core/map-link.js`, `js/core/map-link-state.js` (ajout d'une fonction `warhammerMapProjection` seulement), `sw.js` (précache), `tests/unit/chapeau/liaison-carte-messages-golden.test.mjs`, `tests/fixtures/liaison-carte-messages-golden.json`, `tests/unit/chapeau/liaison-carte-protocole.test.mjs` (nouveaux).

**Tests à écrire d'abord.**
1. `liaison-carte-messages-golden.test.mjs` : sur le code **actuel**, faux canal et horloge fixe, un scénario Warhammer (instantané après `map.hello` ; ajout d'un PJ persistant, d'un PNJ, d'une monture ; blessure ; mise en selle puis démontage ; forme bestiale ; porteur de Bond ; engagement ; PJ hors scène ; mort ; retrait ; `mj.distanceQuery` ; `mount.request`). La fixture enregistre la suite exacte des messages (sans `at`). Vert avant la découpe, vert après (CA7).
2. `liaison-carte-protocole.test.mjs` : (a) la fermeture d'imports de `map-link-protocol.js` ne contient que `js/data/donnees-communes.js` (CA6) ; (b) trois projections d'essai (grille avec `speedCells`, Zones avec `speedCells: null` et `runCells: null`, sans PV avec `hp: null`) produisent `mj.snapshot`, `token.add`, `token.state`, `token.remove`, `mj.roster`, `mj.engagements: []`, sans `fx.wound` quand `hp` est `null` (CA8) ; (c) un marqueur hors des 16 du contrat n'est jamais envoyé, `markerLevels` compris (CA9).

**À livrer.** Plan §3 : `createMapLinkProtocol`, `MARQUEURS_CARTE` ; `createMapLink` garde ses exports et sa signature et délègue.

**Fini quand.** Les deux nouveaux tests ; chacun des tests `liaison-carte*`, `liaison-images.test.js`, `token-image.test.js`, `map-link-indicator.test.js`, `donnees/audit-meta-production.test.js` ; `node tools/run-browser-journeys.mjs --socle` ; garde données vide ; `git -C E:/rpg-map-display status --short` vide.

**Critères couverts.** CA4 (part), CA6 à CA10. CA11 : recette carte réelle par le MJ avant P1.

## L2 · Chapeau : registre, sélecteur, garde-fous de stockage
*Sonnet. Après : L1.*

**But.** Déclarer les jeux et leurs noms de stockage à un seul endroit, figer ceux de Warhammer, et proposer de changer de jeu.

**Fichiers autorisés.** `js/core/jeux.js` (nouveau), `index.html` (entrée « Jeu » du menu, masquée s'il n'y a qu'un jeu publié), un seul module de `js/ui/` pour l'afficher (`js/ui/selecteur-jeu.js`, nouveau) et son appel dans `js/main.js`, `MJ.css`, `manifest.webmanifest` (nom, selon Q7), `sw.js`, `tests/unit/chapeau/registre-jeux.test.mjs`, `tests/unit/chapeau/noms-stockage-warhammer.test.mjs`, `tests/unit/chapeau/modules-communs.test.mjs`, `tests/unit/chapeau/sauvegarde-warhammer-intacte.test.mjs` (nouveaux).

**Tests à écrire d'abord.**
1. `modules-communs.test.mjs` : la liste du plan §2 ; la fermeture d'imports (statiques et dynamiques) de chaque module de la liste reste dans la liste.
2. `noms-stockage-warhammer.test.mjs` (CA18) : `DEFAULT_PERSISTENCE_DB === 'wfrp-persistence-v2'`, les trois chemins de `sync.js`, `CURRENT_SCHEMA_VERSION === 4`, `WRITEBACK_COMMAND_TYPE === 'outil-mj'`, les clés `wfrp.*` actuelles, et l'entrée `warhammer` du registre qui reprend la même base.
3. `registre-jeux.test.mjs` (CA12, CA13) : ids, bases et préfixes uniques ; bases des nouveaux jeux préfixées `outil-mj-` ; `jeuxPublies()` sans Cthulhu tant que `publie: false` ; la page de Warhammer reste `./index.html`.
4. `sauvegarde-warhammer-intacte.test.mjs` (CA1) : sur `fake-indexeddb`, une sauvegarde écrite comme la 3.53.1 (contexte, file d'envoi, points de restauration) ; démarrage du store ; état identique et liste des bases, tables et clés inchangée.

**Fini quand.** Les quatre tests ; `donnees/audit-meta-production.test.js` ; `stockage/version-sauvegardes.test.js` ; `node tools/run-browser-journeys.mjs --socle` ; garde données vide ; capture du menu dans le navigateur intégré (sélecteur absent avec un seul jeu publié).

**Critères couverts.** CA1, CA5, CA12, CA13, CA14 (Q1), CA18.

## C1 · Cthulhu : règles arbitrées
*Sonnet. Après : réponses du MJ à Q8. Parallélisable avec L1 et L2 (aucun fichier commun).*

**But.** Reprendre les règles pures de la maquette dans le module Cthulhu, avec les 12 arbitrages du MJ.

**Fichiers autorisés.** `cthulhu/regles.js` (d'après `maquette-cthulhu/rules.js`), `tests/unit/cthulhu/jets.test.js`, `combat.test.js`, `degats-blessures.test.js`, `san-chance.test.js` (d'après la maquette, chemins d'import corrigés), `tests/unit/cthulhu/arbitrages.test.js` (nouveau).

**Tests à écrire d'abord.** `arbitrages.test.js` : un cas par règle de Q8, avec la réponse du MJ (CA23). Les 51 tests de la maquette, réimportés, passent.

**Fini quand.** Les cinq fichiers de test, un par commande ; `cthulhu/regles.js` n'importe rien.

**Critères couverts.** CA20 (règles), CA23.

## C2 · Cthulhu : profils et rencontre
*Sonnet. Après : C1.*

**But.** Un état pur de jeu : réserve de profils (investigateurs persistants, PNJ, créatures, armes) et rencontre jouable, actions `état → état` à dés injectés.

**Fichiers autorisés.** `cthulhu/profils.js` (nouveau), `cthulhu/rencontre.js` (d'après `maquette-cthulhu/encounter.js`, sans rencontre ni armes codées en dur : ARMES devient un catalogue de départ), `cthulhu/donnees-depart.js` (armes et créatures de départ, Q9), `tests/unit/cthulhu/profils.test.js`, `tests/unit/cthulhu/rencontre.test.js` (nouveaux).

**Tests à écrire d'abord.** Créer, modifier, supprimer un profil ; valeurs dérivées (Impact, Carrure, PV, MVT) ; composer une rencontre depuis la réserve ; un investigateur garde PV, SAN, Chance et folies d'une rencontre à l'autre ; le scénario de la maquette (quatre rounds) rejoué depuis des profils saisis donne le même journal (CA19, CA20).

**Fini quand.** Les deux tests, plus ceux de C1 ; aucun import hors de `cthulhu/`.

**Critères couverts.** CA19, CA20, CA21 (dés injectés).

## C3 · Cthulhu : page, sauvegarde séparée, hors ligne
*Sonnet. Après : L2, C2.*

**But.** La page `cthulhu/` : préparer (profils, rencontre), jouer, journal, annuler et rétablir, export et import, sauvegarde dans sa propre base.

**Fichiers autorisés.** `cthulhu/index.html`, `cthulhu/app.js`, `cthulhu/cthulhu.css` (d'après la maquette), `js/core/jeux.js` (Cthulhu `publie: true`), `sw.js` (précache de `cthulhu/`), `tests/unit/donnees/audit-meta-production.test.js` (**ajout** d'un test pour `cthulhu/`, sans toucher aux existants), `tests/unit/cthulhu/sauvegarde-separee.test.mjs`, `tests/cthulhu-rencontre.browser.mjs` (nouveaux).

**Tests à écrire d'abord.**
1. `sauvegarde-separee.test.mjs` (CA15 à CA17) : sur `fake-indexeddb` et un faux localStorage, une séance (créer, jouer, annuler, recharger, nouvelle rencontre, effacer) ; aucune base ni clé `wfrp` lue, écrite ou supprimée ; une base Warhammer préexistante identique après ; un fichier exporté par Warhammer refusé avec un message qui nomme le jeu, et l'inverse.
2. Ajout à l'audit du précache : chaque fichier de `cthulhu/` est précaché (CA24, CA28).
3. `cthulhu-rencontre.browser.mjs` : la rencontre de la maquette jouée de bout en bout, rechargement compris (CA22).

**Fini quand.** Les tests ci-dessus ; `node tools/run-browser-journeys.mjs --socle` ; contrôle hors ligne et capture dans le navigateur intégré ; garde données vide.

**Critères couverts.** CA12 (bascule), CA15 à CA17, CA21, CA22, CA24, CA28.

## C4 · Cthulhu sur la carte
*Sonnet. Après : L1, C3, et M1 si Q5 = oui.*

**But.** Projeter les participants de Cthulhu vers la carte par le protocole commun.

**Fichiers autorisés.** `cthulhu/projection-carte.js` (nouveau), `cthulhu/app.js` (branchement), `sw.js`, `tests/unit/cthulhu/projection-carte.test.mjs` (nouveau).

**Tests à écrire d'abord.** Projection : `ref` (`pj:<id>` pour un investigateur), nom, camp, image (`token-library-path.js`), PV, `dead`, marqueurs (Inconscient ; Mourant selon Q5), `speedCells` et `runCells` à `null` sauf Q6 ; fermeture d'imports de `cthulhu/app.js`, dynamiques comprises : uniquement `cthulhu/` et les modules communs (CA26).

**Fini quand.** Le test ; recette avec `node tools/serve-liaison.mjs 8771 E:/rpg-map-display` dans le navigateur intégré : « Carte connectée », pions en réserve puis posés, blessure et mort visibles.

**Critères couverts.** CA25 à CA27.

## M1 · Carte : marqueurs de Cthulhu (facultatif, Q5)
*Sonnet. Dépôt `E:\rpg-map-display`, branche `main`. Publié avant P2.*

**But.** Ajouter les marqueurs `dying` et `insane` (icône, libellé, catégorie, ordre de troncature) à `STATUS_MARKER_IDS`, et au contrat §5 dans les deux dépôts. Addition pure : une campagne existante reste valide, Warhammer n'envoie jamais ces marqueurs. À détailler avec le MJ si Q5 = oui ; C4 ajoute alors les deux noms à `MARQUEURS_CARTE` (`js/core/map-link-protocol.js` entre dans ses fichiers autorisés).
