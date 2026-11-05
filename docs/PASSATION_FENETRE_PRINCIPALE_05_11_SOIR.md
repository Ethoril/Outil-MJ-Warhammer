# Passation de la fenêtre principale (05/11/2026 au soir, fin de la vague 3)

**Ne rien lancer avant 1 h du matin (06/11)** : la fenêtre de quota de 5 h était à plus de 90 % et se remet à zéro vers 1 h. Vérifier avec `get_usage` avant de lancer la moindre session.

La fenêtre principale **pilote** : elle découpe, lance les sessions, relit leurs diffs, fusionne sur le feu vert du MJ, puis fait la recette. À lire ensuite : `docs/PLAN_CHANTIERS_PARALLELES_05_11.md` (morceaux, fichiers chauds, toutes les décisions du MJ, dont celles du 05/11 au soir en fin de fichier) et `docs/CONTRAT_LIAISON_MAP_DISPLAY.md` pour la liaison. La passation précédente, `docs/PASSATION_FENETRE_PRINCIPALE_05_11.md`, garde l'historique des vagues 1 et 2.

## État des dépôts (rien n'est poussé, mode développement)

| Dépôt | Branche | Tête | Contenu |
|---|---|---|---|
| Outil MJ `E:\Outil MJ Warhammer` | `dev/recette-plateau-04-11` | `ec05f3f` (ou la suivante) | Vagues 1 à 3 fusionnées. `docs/RECETTE_UTILISATEUR.md` est modifié par un autre chantier : ne pas le commiter. |
| Map Display, worktree `E:\rpg-map-display-liaison` | `feat/liaison-outil-mj` | `175585f` | Lots 1 à 4, L6 et L5-MD fusionnés. `pnpm run verify` vert après la fusion. Le dépôt principal `E:\rpg-map-display` reste sur `autonome/2026-08` : ne pas y toucher. |

Les deux copies du contrat sont identiques (D4, `cells: null`, adjacence complète et camps).

## Vague 3 : ce qui est fait

- **U6** : les Circonstances deviennent un onglet du panneau latéral. Elles s'ouvrent une fois par brouillon (décision du MJ) ; un panneau replié se déplie seulement le temps de l'onglet, sans toucher à la préférence. **U5** : barre de PV avec segment `previewHpLoss`, surfaces, transitions de 120 à 180 ms coupées sous `prefers-reduced-motion`.
- **L5-MJ** : « À poser (N) », suggestions d'engagement par `map.adjacency` (un clic, via `Store.engageParticipants`), `distanceBetween` (demi-cases, ×2 m pour un tir, 1 m pour un sort), émission de `mj.engagements`.
- **L5-MD** : `map.placed`/`unplaced`, `map.adjacency` (liste complète, camps opposés, neutres et morts exclus), `map.distance` (octile, entre emprises au plus près, `cells: null` si non mesurable), traits d'engagement sur l'écran MJ seul.
- **Cadrage U8** : `docs/specs/moteur-effets-unifie/` (spec, plan, 13 lots). Bug de cumul reproduit : deux sorts à clés différentes donnent +4 au lieu de +2. Les 9 réponses du MJ sont dans le plan.
- **Étude E1** : `docs/maquettes/e1-medaillons/` (servie par la configuration `e1-maquette` du `.claude/launch.json` local, port 8790). Choix du MJ dans le plan : variante B, sans débord, couleurs par PJ, fer à pointes, étain à laurier, bronze.

## Vérifications à la fusion

- `tests/unit` : 5 746 tests, 4 échecs (audits E0/E1/E2, préexistants sous Windows), **75 s**.
- Parcours verts : startup, u6, u5, u1-panneau-action, u2, u3, lot2, engagements-plateau.
- **`browser-index` échoue** (« un jet de critique tapé ne doit pas être ignoré par Appliquer », `5 !== 13`) **déjà sur la base de la vague** (branche U8, sans JS). À trier ; ce n'est pas une régression de la vague 3.
- **Commande de la suite** : `node --test "tests/unit/**/*.test.js"` puis `node --test "tests/unit/**/*.test.mjs"`. Jamais `node --test` nu à la racine : il balaie aussi tous les worktrees et dure plus de 15 min. Ne pas lancer `pnpm run verify` (≈ 6 min) en même temps.

## À faire, dans l'ordre (après 1 h)

1. **Brancher L5-MJ** (petit morceau, une session ou la fenêtre elle-même). Ces fichiers étaient réservés à U6 pendant la vague 3 :
   - `js/main.js`, juste après `const mapLink = createMapLink({ ... });` :
     ```js
     import { mountMapLinkFeedback } from './ui/map-link-feedback.js';
     const mapLinkFeedback = mountMapLinkFeedback({ mapLink, store: Store, showToast, pendingNode: qs('#map-link-pending') });
     ```
   - portée préremplie dans `js/ui/resolution-panel.js` avec `mapLinkFeedback.distanceBetween(de, vers, usage)` ; si `{ ok: false }`, le MJ saisit ;
   - pastille « posé » sur la carte d'un participant dans `js/ui/workspace-view.js` avec `mapLink.isPlaced(p)` ;
   - puis essai de bout en bout avec Map Display sur le port 8771 (serveur `liaison-map-worktree`).
2. **P1, Map Display** : supprimer entièrement la chasse des pions (bande neutre, `hpArc` des PJ, `stateRing` des PNJ, `computeProportionalRing`, `computeStateRing`). On garde le compteur 11/14 et les badges d'état. Pion non relié : portrait et liseré de couleur seulement. Fichiers : `tokenSocket.js`, `statusBadges.js`, `layers/tokens.js`, `diag.js`, constantes, tests.
3. **P2, Map Display et contrat** : médaillons variante B, après P1. Il faut un champ de couleur par PJ au contrat §4 (envoyé par l'outil MJ) et les teintes exactes à proposer au MJ.
4. **U8 L0 et L1** (vague 4) : correction du cumul par Test (Q1). Aucun fichier chaud.
5. **Recette du MJ à la table**, port 8771 : montures (pose armée), Course (anneau visible ?), nouveau feu, L5 (à poser, engagements, distance), U6/U5.
6. **À trier** : `browser-index` ; `parseKeywordCSV` qui fait échouer « Actualiser les références » sur une ligne incomplète ; parcours `f2-j`/`f2-j2` ; audits E0/E1/E2 sous Windows ; recette-g-c14 (chemin Chrome macOS en dur).

## Ménage possible (sur accord du MJ)

Les branches de la vague 3 sont fusionnées. Leurs worktrees peuvent être retirés : `.claude/worktrees/u6-u5-hud-505308`, `l5-mj-retours-carte-e334b7`, `u8-cadrage-ceaabd`, `e1-medaillons-a7988b`, ceux des vagues 1 et 2 (`b1-barrakul`, `l1a-u7-barre`, `l1c-portees`, `l3-l6-outil-mj`, `u1-u2-rendu`, `u3-colonne-jouer`, `u4-fiche-onglets`), et côté Map Display `E:\rpg-map-display\.claude\worktrees\quizzical-dirac-ddfee9`, `E:\rpg-map-display-l1b`, `-l3`, `-l4`, `-l6`. **Garder** `e1-medaillons-a7988b` tant que la maquette sert (port 8790). Moins de worktrees, c'est aussi moins de bruit pour les outils.

## Règles de travail (du MJ)

- Tests : dans une session, seulement les tests des fichiers touchés et leurs mutations. Suite complète et `pnpm run verify` une seule fois par vague, à la fusion. Tout test navigateur sous `timeout 120`.
- Sessions séparées à contexte neuf. Sonnet pour l'interface cadrée, le modèle principal pour les règles et le store. Pas de suite complète dans les briefs. Une session qui boucle en débogage : la recadrer tôt (consigne « deux essais, puis commit wip et rapport »).
- Une session qui attend ses tests en arrière-plan peut s'endormir sans être réveillée : demander les mutations au premier plan, sous timeout.
- Commits locaux « (Claude) », jamais de push sans feu vert, jamais de `git stash`.
- Questions de règles : les poser au MJ dès qu'elles bloquent, jamais d'invention.
