# Passation de la fenêtre principale (06/11/2026, soir)

Ce document prend la suite de `docs/PASSATION_FENETRE_PRINCIPALE_06_11_MATIN.md`. Les décisions du MJ (Q1 à Q20) sont à la fin de `docs/PLAN_CHANTIERS_PARALLELES_05_11.md`.

Les règles de travail ne changent pas :
- un chantier = une fenêtre secondaire (`start_session`), Sonnet pour l'interface, Opus pour les règles et le store ;
- commits locaux « (Claude) », pas de push sans feu vert du MJ, jamais de `git stash` ;
- `docs/RECETTE_UTILISATEUR.md` ne se commite pas ;
- tests ciblés par session, suite complète à la fusion, tout test navigateur sous `timeout 120`.

## État des dépôts (rien n'est poussé, mode développement)

| Dépôt | Branche | Tête |
|---|---|---|
| Outil MJ `E:\Outil MJ Warhammer` | `dev/recette-plateau-04-11` | `ea03314` (passation comprise : la suivante) |
| Map Display, worktree `E:\rpg-map-display-liaison` | `feat/liaison-outil-mj` | `6ea2716` (inchangé aujourd'hui) |

**Suite complète de l'outil MJ** (`node --test "tests/**/*.test.js" "tests/**/*.test.mjs"`, jamais un `node --test` nu) : 5 880 tests sur 5 884. Seuls les 4 audits E0, E1 et E2 connus échouent.

**Tests navigateur** : `npm run test:browser-all` (`tools/run-browser-journeys.mjs`) lance 145 parcours. Elle exclut les tests `cloud` (émulateur Firebase : `npm run test:magic-cloud`) et `release` (version à générer : `npm run build:magic-local`). Chaque parcours est limité à 120 s. La série complète n'a pas été relancée d'un bout à l'autre après les dernières corrections : ont seulement tourné les tests touchés, les 24 de la barre mobile et le runner `lot2-v5-25` (10/10).

## Fait le 06/11 après-midi et soir

### Recette en jeu sur 8771 (config `liaison-map-worktree`)

- **Détail des modificateurs (U8 L6)** : conforme. Un défaut est corrigé (`195ae40`) : la ligne de surnombre écartée par l'encerclement s'affichait « outnumber (Trait) ». Elle affiche maintenant « Surnombre (2 contre 1) », barrée, avec « non cumulé · règle : la plus haute valeur ».
- **Questions d'États en magie** : la question reste affichée et modifiable une fois répondue. Le résultat indique « Désavantage : À terre » (fenêtre Sonnet, `e641e61`). Vérifié en jeu : sur Oui, Désavantage et DR +0 ; sur Non, DR +1.
- **Portée préremplie** : un défaut est corrigé (`7fb25cf`). Un profil de bestiaire porte sa portée dans `action.rangeYards`, que le calcul et le panneau ignoraient. Bugshot (arc à 50 m), à 20 m sur la carte, est maintenant prérempli en Courte.
- **U5** (barre de PV en aperçu) : conforme (« PV 12/12 → 3 », segment hachuré).
- **Course** : conforme. L'anneau hachuré, l'étiquette « Course : Action utilisée » et le toast « X a couru : Action utilisée ? » apparaissent. Un glisser-déposer du pion par le MJ n'envoie pas `map.ran` : seul le déplacement en deux clics (viser, puis revalider) l'envoie.
- **Trait d'engagement à pleine taille** : conforme, sous les médaillons.
- **Montures** : la mise en selle échoue bien à distance (« rapprochez le cavalier… ») et réussit au contact : un seul pion, pastille « À cheval », vitesse de la monture. La suggestion « au contact : les engager ? » apparaît aussi. **Pas testée : la pose armée d'une paire cavalier-monture depuis la réserve.**

### Tests

- **Tri des tests à trier** (fenêtre Sonnet, `docs/TRI_TESTS_06_11.md`) : 6 tests navigateur réparés, sans régression du code.
- **Utilitaire de lancement unique** (demande du MJ) : `tests/helpers/browser.mjs` exporte `launchBrowser()`. Il prend `PLAYWRIGHT_EXECUTABLE_PATH` s'il est défini, sinon le canal Playwright : `chrome` sur Mac, `msedge` ailleurs. 146 tests sont convertis et il n'y a plus de chemin de navigateur en dur.
- **Tri des 43 échecs anciens** (`docs/TRI_TESTS_ANCIENS.md`) :
  - **une vraie régression**, corrigée (`2dc9460`) : à 390 px, la barre du haut débordait depuis le 05/11 (outils de séance et voyant de la carte). Elle explique 24 tests, qui passent tous ;
  - **15 tests obsolètes** mis à jour (Circonstances en onglet, service worker non enregistré sur localhost, mot-clé Barrakul).
- **`browser-index` stabilisé** (`ea03314`) : le test tapait le jet de critique suivant avant la fin du recalcul différé de 200 ms. Il passe 5 fois sur 5 ; comme l'échec était intermittent, ce n'est pas une preuve absolue.

### Ménage (fait avec l'accord du MJ)

- 27 worktrees et 16 branches fusionnées sont retirés côté outil MJ, et 4 worktrees côté Map Display (`p1`, `p2`, `pj`, `recette`), dossiers résiduels compris.
- Les données de test sont nettoyées : combat local vide, profil « Elysia (test) » supprimé, aucun pion sur la carte 94SHD (« Ferme isolée » reste chargée). La session KM73Z n'a jamais reçu de contenu ; ce n'est pas vérifiable sans la console Firebase.
- **Incident** : `git worktree remove --force` a vidé le `node_modules` du dépôt principal. Des worktrees y étaient reliés par jonction, et la suppression a suivi la jonction. Il a été restauré par `npm ci`. **Désormais : chercher les jonctions avant toute suppression, et chaque fenêtre fait son propre `npm ci`, sans jonction.**

## Fait le 06/11 en fin de soirée (fenêtres parallèles, tout fusionné, rien poussé)

- **Pose armée** : recette conforme après correctif. Map Display `55fdccb` sur `feat/liaison-outil-mj` : la monture d'une paire montée est masquée de la réserve, le panneau montre « Cavalier — … » puis « Monture — … », et les badges du cavalier passent d'abord. Le badge ambre d'un état de la monture seule n'a pas été vu en monté, car « À terre » sur la monture fait démonter (`v5-mounted-combat.js:156`).
- **Démontage** (décision du MJ) : le cavalier reste sur le plateau, sur la case libre adjacente la plus proche de sa monture, et ne va en réserve que si aucune n'est libre. C'est Map Display `817e22f` (`splitMount` / `placeOnFreeAdjacentCell`, `js/app/mjLink.js`). La recette est conforme pour le démontage volontaire, la chute et le panneau à pied. Le cas encerclé n'est couvert que par un test unitaire.
- **Terminer le combat** : le panneau intégré bloque le `confirm()` natif. La boîte de confirmation reste donc à vérifier dans un navigateur normal.
- **Terminer le combat** : de retour dans les outils de séance, avec une confirmation (`4c83595`).
- **Armes L12 en français** (`claude/armes-l12-fr`, fusionné) : table `js/data/weapon-names-fr.js`, arbitrages du MJ (Cimeterre ; tout traduire). Le nom anglais est gardé dans `extensions.v5.sourceName`.
- **`lot3-v5-magic-2b-ui`** passe de 103 s à 52 s. `browser-index` a passé 10 fois sur 10.
- **Course par glisser** : décision du MJ, voir le point 3 ci-dessous.
- **Navigateur intégré** : les anciennes sessions de cartes sont retirées et le « Autres MJ » fantôme a disparu.

## Restent ouverts

1. **Pose armée** d'une paire cavalier-monture depuis la réserve de la carte : à tester.
2. **Map Display, pion monté** : le pion montre les états de la monture (icône À terre du Gobelin Coureur), alors que son panneau montre le cavalier. Le MJ l'a remarqué : le panneau devrait dire quel combattant il montre, ou montrer les deux. La monture apparaît aussi dans la réserve de la carte.
3. **Course par glisser-déposer** : le glisser du pion par le MJ n'envoie pas `map.ran`. **Décision du MJ (06/11 soir) : voulu.** Le glisser du MJ est un placement libre et ne compte jamais comme Course.
4. **Libellés anglais** des armes des profils L12 (« Sword », « Bow ») dans le panneau d'action.
5. **« Terminer le combat »** : le bouton n'existe plus que dans l'ancien panneau masqué (`#btn-end-combat`). Pour vider un combat, il faut retirer les participants un à un.
6. **À surveiller** : `lot3-v5-magic-2b-ui` prend 103 s, près de la limite de 120 s. `browser-index` a été stabilisé, mais sans preuve absolue (point ci-dessus).
7. **Navigateur intégré** : son stockage garde 3 sessions de cartes d'anciennes recettes (M354V, Y5XG8, PZEQR). La carte affiche « Autres MJ (1) », sans doute une présence restée d'un ancien onglet.
8. **Rappel à reporter dans `ennemi-interieur-wfrp4`** (mémoire « Rappels projet des fiches ») : inchangé.

## Fenêtres liées de la journée, à archiver

Elles sont toutes inactives et leur travail est fusionné :
- tri des tests (`tri-tests`) ;
- questions d'États en magie (`etats-magie-ui`) ;
- utilitaire de lancement (`browser-helper`) ;
- tri des 43 échecs (`trier-les-43-tests-navig`).

Leurs worktrees vides sous `.claude/worktrees/` partiront avec l'archivage. Garder `e1-medaillons-a7988b` tant que la maquette sert (port 8790).
