# Plan · Outil MJ multi-jeux

Spec : [spec.md](spec.md) · Tâches : [tasks.md](tasks.md). Mesures faites le 18/11/2026 sur `main` 158cef8 (3.53.1) et sur `E:\rpg-map-display` 5fff780 (lecture seule).

## 1. Approche

Trois idées, dans l'ordre de leur utilité :

1. **Warhammer ne déménage pas.** Ses fichiers, son adresse, ses noms de stockage restent ceux d'aujourd'hui. Le chapeau est **une liste déclarée de modules communs** de `js/`, plus un registre des jeux, plus la liaison carte neutre. Un test garde la liste : la fermeture d'imports d'un module commun ne sort jamais de la liste.
2. **La séparation des sauvegardes se fait par les noms, sans migration.** Les noms actuels (`wfrp-persistence-v2`, `wfrp.*`, `wfrp-sessions-v3/…`) deviennent ceux du jeu Warhammer. Chaque nouveau jeu reçoit les siens. Aucune donnée n'est copiée ni réécrite : c'est la migration sans perte la plus sûre, et elle se prouve par des tests (CA1, CA15, CA18).
3. **Chaque jeu est une page à côté de Warhammer** (`cthulhu/index.html`) sur la même origine, avec le même service worker. Il importe les modules communs et rien d'autre de `js/`.

## 2. Périmètre du chapeau (fermeture des imports mesurée)

Mesure : script de fermeture des `import` statiques et dynamiques de `js/` (288 fichiers), puis lecture du contenu des petits modules pour écarter ceux qui portent du vocabulaire Warhammer malgré zéro import.

| Module | Fermeture | Verdict |
|---|---|---|
| `core/persistence.js` | 0 | Commun. Paramétré par `dbName` et `contextId` : chaque jeu passe son nom de base. |
| `core/safe-storage.js` | 0 | Commun. |
| `core/commands.js`, `core/history.js` | 0, 1 (commands) | Communs (annuler, rétablir, diff d'état). |
| `core/participant-camp.js` | 0 | Commun. |
| `core/token-library-path.js` | 0 | Commun (chemins de `maps/tokens/`). |
| `core/bestiary-folder-tree.js` | 0 | Commun (arbre de dossiers). |
| `core/scene-events.js` | 0 | Commun (événements de scène). |
| `core/auth-errors.js` | 0 | Commun (erreurs de connexion Google). |
| `ui/bus.js`, `ui/dom.js`, `ui/toast.js`, `ui/messages.js`, `ui/status-summary.js`, `ui/map-link-indicator.js` | 0 ou dans la liste | Communs. |
| `ui/theme.js`, `ui/side-panel.js` | 0 ou dans la liste | Communs ; leurs clés `wfrp.theme` et `wfrp.sidePanel` restent telles quelles et deviennent des préférences de l'outil, partagées par les jeux. |
| `data/donnees-communes.js` | 0 | Commun pour `LIAISON_CARTE` seulement (le fichier porte aussi les espèces de Warhammer ; il reste la source des trois dépôts, on n'y touche pas). |
| `core/map-link-protocol.js` | nouveau (lot 1) | Commun : protocole de la liaison. |
| `core/jeux.js` | nouveau (lot 2) | Commun : registre des jeux. |

Tout le reste est **Warhammer**, dont des modules au nom trompeur : `dice.js` (importe les critiques), `turn-order.js` (101 fichiers : l'Initiative est un test V5), `encounter-journal.js` (30), `sync.js` (42 : la synchronisation passe par `migrations.js`, qui porte le schéma de Warhammer), `store.js` (199), `keyboard.js` (raccourcis des quatre espaces), `silhouette.js` (localisations), `encounter-end-dialog.js` (suivis de Campagne), `map-link-state.js` et `map-link-feedback.js` (projection, engagements, surnombre).

**Comment un jeu se déclare** : une entrée du registre `js/core/jeux.js` et une page.

```js
// js/core/jeux.js (lot 2), module pur, sans import
export const JEUX = Object.freeze([
  { id: 'warhammer', nom: 'Warhammer', page: './index.html', base: 'wfrp-persistence-v2', prefixe: 'wfrp.', publie: true },
  { id: 'cthulhu', nom: 'L’Appel de Cthulhu', page: './cthulhu/', base: 'outil-mj-cthulhu-v1', prefixe: 'cthulhu.', publie: false }
]);
export function jeuxPublies(): Jeu[]           // ceux qui apparaissent dans le sélecteur
export function jeuDeLaPage(url): Jeu | null
```

Le reste (règles, écran, bestiaire, fiche, liaison des PJ) est interne à chaque jeu ; le chapeau n'impose pas de forme. Les noms de base portent le préfixe `outil-mj-` parce que la carte et l'outil partagent l'origine `ethoril.github.io`.

## 3. Lot 1 : liaison carte neutre

**Constat.** `map-link.js` (le protocole) importe `map-link-state.js` (projection Warhammer : taille, sens, mouvement en cases de 2 m, montures, `extensions.v5`) et `map-link-feedback.js` (engagements, surnombre). Sa fermeture est de 94 fichiers.

**Découpe.** Nouveau module commun `js/core/map-link-protocol.js` qui reprend tout le corps de `createMapLink` et reçoit une projection. `js/core/map-link.js` garde **exactement ses exports et la signature de `createMapLink`** et devient l'adaptateur Warhammer : il construit la projection Warhammer et appelle le protocole. `main.js`, `ui/` et les 11 tests `liaison-carte-*` ne changent pas.

```js
// js/core/map-link-protocol.js
export const MARQUEURS_CARTE // les 16 marqueurs du contrat §5
export function createMapLinkProtocol({ channel, projection, getParticipants, now, onStatus, onRan, setTimer, clearTimer })
  → { refresh, snapshot, tick, onMessage, requestMount, queryDistance, on, placement, isPlaced, status, close }
// projection fournie par le jeu :
//   tokenStates(participants) → { [ref]: TokenState }     obligatoire
//   refOf(participant) → string                          obligatoire ('pj:<id>' pour un PJ durable, contrat §3)
//   engagementPairs?(participants) → [[ref, ref]]        défaut [] (mj.engagements part toujours dans l'instantané)
//   formSignature?(participant) → string                 défaut '' (pas de fx.wound quand la forme change)
// Restent dans le protocole, car neutres : diff des états, token.add/state/remove, mj.roster, fx.wound et fx.death
// (lus sur hp et dead du TokenState), mount.split/request, mj.distanceQuery (en cases), map.ran, battement.
```

Le protocole retire des `markers` (et de `markerLevels`) tout marqueur hors `MARQUEURS_CARTE` (CA9) : la carte rejette un marqueur inconnu à la validation de sa campagne. Pour Warhammer, c'est sans effet (sa table ne produit que ces 16).

**Côté carte : aucun changement (CA10).** Vérifié dans `E:\rpg-map-display` : `patchFromState` ignore une valeur `null` (`speedCells: null` garde la portée saisie, `hp: null` ne touche pas les PV) ; `createToken` donne `speedCells: 6`, `hp: null`, `health: 'unharmed'` à un pion créé sans ces champs ; un pion sans `hp` n'affiche pas de badge de PV. La grille de Warhammer, des Zones sans portée et un jeu sans PV passent donc par le contrat v1 tel quel. Deux limites, documentées sans être traitées :
- la carte connaît 16 marqueurs, liste fermée (`STATUS_MARKER_IDS`) : un jeu qui en veut d'autres passe par un lot dans la carte publié avant l'outil (M1) ;
- un seul jeu doit piloter la carte à la fois : deux onglets de jeux différents ouverts ensemble se disputeraient les pions (un seul utilisateur, un seul endroit : on l'accepte).

## 4. Données existantes

| Donnée | Aujourd'hui | Après |
|---|---|---|
| IndexedDB | `wfrp-persistence-v2` (contextes `guest` et compte, file d'envoi, 10 points de restauration) | Inchangée, base du jeu Warhammer. Cthulhu : `outil-mj-cthulhu-v1`, contexte `local`. |
| localStorage | `wfrp.*` (schéma, références, favoris des règles, thème, panneau) | Inchangé. Cthulhu : `cthulhu.*`. Thème et panneau partagés. |
| Firebase Realtime Database | `wfrp-sessions-v3/$uid/current`, schéma 4 | Inchangé, règles non redéployées. Cthulhu sans synchronisation (Q3). |
| Fiches Firestore (`ennemi-interieur-wfrp4`) | lecture `fiche-source`, écriture `outil-mj` par `executeFicheCommand` | Inchangé, Warhammer seul. |
| Cache du service worker | `wfrp-cache-v<version>` | Même nom, mêmes règles ; la liste précachée s'allonge des fichiers de Cthulhu. |

Preuves : CA1 par un test qui écrit une sauvegarde 3.53.1 dans `fake-indexeddb` (déjà en dépendance), démarre le store et compare à `tests/fixtures/store-golden.json`, puis compare la liste des bases et des clés avant et après ; CA15 et CA16 par un test qui joue une séance Cthulhu sur `fake-indexeddb` et un faux localStorage et vérifie qu'aucun nom `wfrp` n'est touché ; CA18 par un test qui fige `DEFAULT_PERSISTENCE_DB`, les chemins de `sync.js`, `CURRENT_SCHEMA_VERSION`, `WRITEBACK_COMMAND_TYPE` et les clés `wfrp.*` ; CA2 et CA3 par `git diff main --` vide sur `firebase.database.rules.json`, `js/core/sync*.js`, `js/core/migrations.js`, `js/core/fiche-*.js`. Recette réelle : le MJ exporte sa sauvegarde Warhammer avant la mise à jour (bouton existant), puis vérifie après coup rencontre, réserve, Campagne et l'état « Synchronisé ».

## 5. Publication

Une version unique (Q4) : `tools/bump-version.mjs` reste tel quel, sauf si le titre du README change (sa règle le cherche). Un service worker à la racine, portée `./`, qui couvre `cthulhu/` ; le test `audit-meta-production` vérifie déjà que chaque module de `js/` est précaché ; le lot C3 l'étend aux fichiers de `cthulhu/`. `manifest.webmanifest` : `start_url` inchangé ; nom selon Q7.

Publications proposées : **P1** = lot 1 seul (3.53.2, rien de visible) ; **P2** = L2, C1, C2, C3, C4 ensemble (3.54.0, « Cthulhu »). M1, s'il a lieu, est publié dans la carte avant P2.

## 6. Épreuve des jeux 3 et 4 (lecture des livres de base)

| | Imperium Maledictum (livre de base, anglais) | L'Ombre du Seigneur Démon (livre de base) |
|---|---|---|
| Test | d100 sous la compétence ; DR = dizaine du seuil − dizaine du jet (p.187), comme le V5 de l'outil ; 01-05 réussit, 96-00 échoue, 99-00 maladresse (p.188) | 1d20 + modificateur d'attribut ≥ 10 pour un test, ≥ Défense ou attribut adverse pour une attaque (chap. 2, p.31) |
| Avantage | Avantage : inverser le jet au choix ; Désavantage : inversion imposée ; chaque source de plus vaut ±10 (p.189). Supériorité : réserve **de groupe** qui ajoute des DR (p.196) | Avantages et désavantages en d6 : on en lance autant, on garde le meilleur, ajouté ou soustrait ; ils s'annulent un pour un (p.32) |
| Tour | Initiative fixe = bonus de Perception + bonus d'Agilité ; égalité au Réflexes, puis test opposé (p.198) ; un Move et une Action | Pas d'Initiative : round en trois phases, tours rapides (action **ou** déplacement), tours lents (action **et** déplacement), fin de round ; les PJ d'abord dans chaque phase, puis le MJ (p.46) |
| Placement | Zones abstraites de 5 à 10 m ; portées Immédiate, Courte (même Zone), Moyenne (adjacente), Longue (2 Zones), Extrême (p.200-202). Grille optionnelle : Vitesse 4, 8 ou 12 m, portées de 2 à 72 m (p.313) | Vitesse en mètres (10 pour un humain), allonge selon le Gabarit ; carte, figurines ou description au choix |
| Jauges | Blessures, Supériorité (groupe), Corruption, Fate | Santé (dégâts cumulés), Folie (≤ Volonté), Corruption |

Conséquences pour le chapeau, vérifiées :
- **Le chapeau ne contient aucun suivi des tours.** Celui de Warhammer est un test V5. Une brique commune future devra admettre un ordre à valeurs (Warhammer, Cthulhu, Imperium) **et** des phases sans ordre où chacun agit une fois (Seigneur Démon).
- **Aucune jauge dans le chapeau.** Imperium a une réserve de camp (Supériorité), pas seulement des jauges par participant : une brique commune future devra le permettre.
- **Distances : la carte ne connaît que des cases**, chaque projection convertit (Warhammer 2 m par case). Les Zones d'Imperium n'ont pas de portée en cases : `null` (CA8). Le d20 du Seigneur Démon ne change rien à la liaison.
- **Famille d100 à DR** : `js/core/v5-roll.js` est pur (fermeture 0) et fait déjà l'inversion et les DR. Imperium diffère sur les sources en plus (±10 au lieu de ±1 DR) et sur la maladresse (99-00 au lieu des doubles). Décision au lot Imperium : copier puis factoriser seulement si le partage tient.

## 7. Vérification de chaque critère

| CA | Vérification |
|---|---|
| CA1 | `tests/unit/chapeau/sauvegarde-warhammer-intacte.test.mjs` (L2) ; recette MJ (export avant, contrôle après) |
| CA2, CA3 | `git diff main -- firebase.database.rules.json js/core/sync*.js js/core/migrations.js js/core/fiche-*.js` vide à chaque lot ; CA18 |
| CA4 | Suite unitaire complète à la fusion ; `node tools/run-browser-journeys.mjs --socle` sous `timeout 120` par parcours |
| CA5, CA12-CA14 | `tests/unit/chapeau/registre-jeux.test.mjs` (L2) ; contrôle dans le navigateur intégré |
| CA6, CA8, CA9 | `tests/unit/chapeau/liaison-carte-protocole.test.mjs` (L1) : fermeture d'imports et trois projections d'essai |
| CA7 | `tests/unit/chapeau/liaison-carte-messages-golden.test.mjs` et `tests/fixtures/liaison-carte-messages-golden.json`, écrits **avant** la découpe et verts avant comme après |
| CA10 | `git -C E:/rpg-map-display status` propre ; `git diff main -- docs/CONTRAT_LIAISON_MAP_DISPLAY.md js/data/donnees-communes.js` vide |
| CA11 | Ce qui précède, plus la recette carte réelle du MJ (`tools/serve-liaison.mjs`) |
| CA15-CA17 | `tests/unit/cthulhu/sauvegarde-separee.test.mjs` (C3) |
| CA18 | `tests/unit/chapeau/noms-stockage-warhammer.test.mjs` (L2) |
| CA19-CA23 | Tests de `tests/unit/cthulhu/` (C1, C2) ; parcours navigateur `tests/cthulhu-rencontre.browser.mjs` (C3) |
| CA24, CA28 | Test d'audit du précache étendu à `cthulhu/` (C3) ; contrôle hors ligne dans le navigateur |
| CA25-CA27 | `tests/unit/cthulhu/projection-carte.test.mjs` et fermeture d'imports de `cthulhu/` (C4) |
| CA29 | Procédure de publication du dépôt, par la session principale |

## 8. Complexité justifiée

- **Deux nouveaux modules dans `js/core/`** (`map-link-protocol.js`, `jeux.js`). Le premier est la découpe demandée ; le second est le minimum pour un sélecteur et des noms de stockage déclarés à un seul endroit.
- **Un test de fermeture d'imports** (`tests/unit/chapeau/modules-communs.test.mjs`) : c'est lui qui remplace le déplacement physique des fichiers ; sans lui, le chapeau ne serait qu'une intention.
- **Une page par jeu plutôt qu'un aiguillage dans `index.html`** : Warhammer ne charge rien de nouveau, Cthulhu ne charge rien de Warhammer (CA26).
- Pas de nouveau dossier `commun/` (Q2), pas de nouvelle dépendance, pas de bundler.

Principes du dépôt respectés : français, yards = mètres (les portées de Cthulhu en yards se lisent en mètres, même valeur), pas de `git stash`, commits nommés, absence de champ facultatif lue comme vide, tests ciblés puis suite complète à la fusion.
