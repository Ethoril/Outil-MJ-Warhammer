# Plan des chantiers parallèles (05/11/2026)

Trois fronts : la **liaison avec RPG Map Display** (lots 1 à 5), le mot-clé **Barrakul**, et les suites du **rapport Gemini** (moteur, UX, design). Chaque morceau tient en une session et se vérifie seul. Les morceaux d'une même vague ne touchent **aucun fichier en commun**.

## Règles communes à toutes les sessions

- **Outil MJ** : worktree dédié, créé depuis `dev/recette-plateau-04-11` (HEAD `c47c9e7`). Jamais de `git stash` (mémoire du 19/10). Commit local « (Claude) », **pas de push** (mode développement).
- **Map Display** : worktree dédié, créé depuis `feat/liaison-outil-mj` (worktree `E:\rpg-map-display-liaison`). Lire son `CLAUDE.md` : manifeste fermé, `pnpm run verify`, mutation des tests. Pas de push.
- **Contrat** : toute modification se reporte dans les deux copies (`docs/CONTRAT_LIAISON_MAP_DISPLAY.md` et `docs/CONTRAT-LIAISON-OUTIL-MJ.md`). Seule la session qui en a besoin y touche.
- Un test vert ne prouve rien tant que sa mutation n'est pas rouge.
- Fin de session : dire la branche, les commits, ce qui est vérifié, et ce qui ne l'est pas.

## Fichiers chauds (un seul écrivain à la fois)

| Fichier | Morceaux qui y touchent |
|---|---|
| `js/ui/workspace-view.js` | U1, U2, U3, U6 → **une seule file** : U1 → U2 → U3 → U6 |
| `js/core/store.js` | U1 (accesseurs), L3-MJ (montures) → pas dans la même vague |
| `js/main.js`, `index.html` | L1a+U7 seul |
| `js/core/map-link*.js` | L1c, puis L3-MJ, puis L5-MJ |
| Map Display `tokens.js` | L2, puis L3-MD, puis L4 |
| Map Display `panel.js` | L1b, puis L3-MD, puis L5-MD |

## Morceaux

### Liaison (L)

| Id | Dépôt | Contenu | Fichiers | Décision attendue |
|---|---|---|---|---|
| **L1a+U7** | Outil MJ | Indicateur durable « Carte : connectée · à poser (N) » dans la barre du haut, à la place du toast. Menu `⋯` réservé aux fichiers, au compte et à la configuration ; Temps de campagne et Événements/Jauges sortent dans la barre. | `index.html`, `js/main.js`, `MJ.css` | — |
| **L1b** | Map Display | Indicateur « Outil MJ connecté », avec la liste des PJ en attente de liaison (`awaiting`), dans le panneau MJ. | `panel.js`, `gm.js` | — |
| **L1c** | Outil MJ | Portées effectives : Traits de `creature-movement.js` (Vol, Bond, Foulée…), états qui limitent le déplacement, armure, vérifiés contre les règles V5. Confirmer `maxHpOf` sur une vraie fiche de PJ. | `map-link-state.js`, `main.js` (une ligne) | — |
| **L2** | Map Display | Disque à la couleur du camp, avec initiales, pour un pion sans image ; usage de `imageUrl` reçu. | `tokens.js` | **D2 tranché (05/11)** : 4 teintes prises dans la palette de bordures de Map Display, proposées par la session |
| **L3-MJ** | Outil MJ | Montures : `rider` dans `token.state`, `mount.request` / `mount.split`, message « Rapprochez… ». | `map-link*.js`, `mounts.js`, UI des montures | — |
| **L3-MD** | Map Display | Fusion et séparation, deux anneaux, médaillon, pose armée, contrôle d'adjacence. | `tokens.js`, `store.js`, `mjLink.js`, `networkEvents.js`, `panel.js` | après L2 et L1b |
| **L4** | Map Display | Effets : gerbe, tache au sol, six animations de mort, nouveau `js/render/layers/fx.js` (manifeste). Images de `tmp/effets-sang/` en WebP. | `fx.js`, `tokens.js`, assets | **D3** : choix des images |
| **L5-MJ** | Outil MJ | Indicateurs « posé » et « à poser », suggestions d'engagement, distance préremplie. | `map-link.js`, UI du plateau | **D4** : diagonale |
| **L5-MD** | Map Display | `map.placed` / `unplaced`, `map.adjacency`, `map.distance`, traits d'engagement sur l'écran MJ. | `mjLink.js`, `panel.js`, un calque | **D4** |

### Barrakul (B)

La feuille *Aides de jeu* (onglet « Mots Clés Armes et Armures ») définit `barrakul` : « Ignore les PA et boucliers non magique ». Ce n'est pas encore modélisé (audit F-L15-0232, L15 p. 115).

| Id | Dépôt | Contenu | Fichiers | Décision attendue |
|---|---|---|---|---|
| **B1** | Outil MJ | Qualité `barrakul` : PA des armures non magiques ignorés, PA du bouclier non magique ignorés ; armure ou bouclier `magique` conservés. Tests, puis vérification contre le livre. | catalogue des qualités, `resolution.js` (calcul des PA) | **D1 tranché (05/11)** : un bouclier non magique perd **aussi** son +1 DR en défense |
| **B2** | Fiches (`ennemi-interieur-wfrp4`) | Reporter le mot-clé dans le catalogue des fiches (rappel « mots-clés » de la phase H). | dépôt des fiches | — |

### Rapport Gemini (U)

Constats vérifiés le 05/11 : 4 appels `JSON.parse(Store.getFullJSON())` dans `workspace-view.js` ; `center.replaceChildren()` à chaque rendu ; « Suites de combat » ouvert d'office (`workspace-view.js:2230`) ; accordéons sur trois niveaux dans `fiche-details.js`.

| Id | Dépôt | Contenu | Fichiers | Décision attendue |
|---|---|---|---|---|
| **U1** | Outil MJ | Accesseurs directs du store (`getTurnIndex`, `isSuddenDeathEnabled`, `listTurnActions`…) à la place des `getFullJSON()` du rendu ; golden master régénéré. | `store.js`, `workspace-view.js` | — |
| **U2** | Outil MJ | Préservation du scroll et des `<details>` ouverts d'un rendu à l'autre (clé par participant). | `workspace-view.js` | — |
| **U3** | Outil MJ | Colonne *Jouer* allégée : Mort subite dans les réglages, avec une bannière seulement quand un figurant tombe à 0 ; Suites de combat fermé pendant le combat ; pavois, plate, rechargement et projectiles en puces sur la fiche du combattant. | `workspace-view.js` | — |
| **U4** | Outil MJ | Fiche : onglets compacts (Compétences, Talents, Équipement, Magie/Foi) au lieu des accordéons, onglet actif conservé. | `fiche-details.js`, CSS de la fiche | — |
| **U5** | Outil MJ | HUD : barre de PV avec segment de dégâts prévisualisés (`previewHpLoss`), surfaces au lieu des bordures imbriquées, micro-transitions de 120 à 180 ms avec `prefers-reduced-motion`. Skills `emil-design-eng` et `improve-animations` disponibles. | `workspace.css`, `MJ.css`, rendu de la barre de PV | après U3 |
| **U6** | Outil MJ | Bord droit : soit tiroir *Circonstances* en onglet du panneau latéral, soit outils flottants déplaçables. | `workspace-view.js`, `main.js`, CSS | **D5** : quelle option |
| **U8** | Outil MJ | Moteur d'effets unifié (`docs/PROPOSITION_MOTEUR_EFFETS_UNIFIE.md`), à cadrer avant *Sea of Claws* (skill `cadrer-feature`). | — | priorité à confirmer |

Écartés pour l'instant : le découpage des monolithes (gros risque, aucun gain fonctionnel) et l'installation de skills externes (`impeccable`, `game-ui-design`), à décider séparément.

## Vagues

| Vague | Morceaux en parallèle | Condition |
|---|---|---|
| **1** | B1 · U1→U2 (une session) · U4 · L1c · L1a+U7 · L1b+L2 (une session Map Display) | prête (D1 et D2 tranchés) |
| **2** | U3 · L3-MJ · L3-MD · L4 · B2 | après les fusions de la vague 1 ; D3 pour L4 |
| **3** | U5 · U6 · L5-MJ · L5-MD · cadrage U8 | D4, D5 |

Entre deux vagues : fusion des branches dans `dev/recette-plateau-04-11` (outil MJ) et dans `feat/liaison-outil-mj` (Map Display), sur feu vert du MJ, puis recette navigateur sur le port 8771.
