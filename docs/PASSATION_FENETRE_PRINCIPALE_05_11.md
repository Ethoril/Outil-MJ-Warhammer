# Passation de la fenêtre principale (05/11/2026, fin de la vague 2)

La fenêtre principale **pilote** : elle découpe, lance les sessions, relit leurs diffs, fusionne sur le feu vert du MJ, puis fait la recette. Le plan vivant est `docs/PLAN_CHANTIERS_PARALLELES_05_11.md` : il donne les morceaux, les fichiers chauds, les vagues et les décisions déjà prises.

## État des dépôts (rien n'est poussé, mode développement)

| Dépôt | Branche | Tête | Contenu |
|---|---|---|---|
| Outil MJ `E:\Outil MJ Warhammer` | `dev/recette-plateau-04-11` | `0de10c8` | Vagues 1 et 2 fusionnées et vérifiées : 5 733 tests sur 5 738 (les 4 échecs restants sont les audits E0/E1/E2, préexistants sous Windows), démarrage, parcours `f2-i`, `u2-preserve-view`, `u3-colonne-jouer`, `browser-index` verts. `docs/RECETTE_UTILISATEUR.md` est modifié par un autre chantier : ne pas le commiter. |
| Map Display, worktree `E:\rpg-map-display-liaison` | `feat/liaison-outil-mj` | `cb9b65b` | Lot 1 complet, plus L1b, L2, L3-MD, L4 et L6-MD fusionnés. Porte complète verte après fusion (`pnpm run verify` : 312 e2e et 4 gestes). Deux copies du contrat synchronisées. Le dépôt principal `E:\rpg-map-display` reste sur `autonome/2026-08` ; ne pas y toucher. |
| Fiches `E:\Projet Warhammer Ennemi Intérieur\ennemi-interieur-wfrp4` | `feat/barrakul` (checkout direct) | `e6bc651` | B2 : Barrakul complété dans le catalogue (Type, Source, Version). Base : `gemini/armes-v5`, locale. Fusion à décider avec le MJ. |

Les branches des sessions (`claude/*`, `feat/liaison-l*`) sont fusionnées. Les worktrees `E:\rpg-map-display-l1b`, `-l3`, `-l4` et `-l6` peuvent être retirés.

## Ce qui est fait

- **Liaison, lot 1** : canal et écho du battement ; état redemandé dès qu'une carte est chargée ; rendu « mort » ; niveaux d'état sur les badges ; marqueurs Exténué et Souillé ; PJ hors scène et `mj.roster` ; « Lier à un PJ » ; indicateurs de connexion des deux côtés ; portées effectives (L1c) ; disque de camp (L2), dont le liseré prend maintenant la teinte du camp.
- **L3** : montures fusionnées et séparées, médaillon et deux anneaux, `mount.request`, `accepted` et `refused`, pose armée. La pose armée n'a pas été essayée dans l'app réelle.
- **L4** : effets `fx.wound` et `fx.death`, avec les variantes choisies par le MJ (gerbe 2, flaque 1, poison 2, magie 1). Le feu est en deux couches : brûlure en `multiply` et flammes en `screen`, générées avec Magnific. Le MJ n'a pas encore vu le nouveau feu.
- **L6** : palier Course sur la carte (anneau hachuré, étiquette « Course : Action utilisée »), envoi de `map.ran`, et côté outil MJ la proposition « X a couru : Action utilisée ? » validée en un clic. L'anneau n'a pas été contrôlé à l'œil, la vue était trop étroite.
- **Barrakul** (B1, B2) : PA des armures et boucliers non magiques ignorés ; un bouclier non magique perd aussi son +1 DR et l'Esquive des tirs ; des PA saisis à la main comptent comme non magiques.
- **UX** (U1 à U4, U7) : accesseurs du store, état des fiches conservé d'un rendu à l'autre, fiche en onglets, colonne *Jouer* allégée, outils de séance dans la barre du haut.

## À faire ensuite

1. **Recette du MJ à la table**, sur le port 8771 (serveur `liaison-map-worktree` de `.claude/launch.json`) : montures (pose armée), Course (anneau visible ?), nouveau feu.
2. **Vague 3** du plan : U5 (HUD : barre de PV et transitions), U6 (bord droit, décision D5 à prendre), L5-MJ et L5-MD (retours de la carte, décision D4 sur la diagonale), cadrage U8 (moteur d'effets unifié), **étude E1** (pions en médaillon avec débord du personnage, via Magnific).
3. **À trier** :
   - `parseKeywordCSV` fait échouer « Actualiser les références » dès qu'une seule ligne de la feuille est incomplète ;
   - les parcours `f2-j` et `f2-j2` échouaient déjà avant U3 ;
   - les audits E0/E1/E2 échouent sous Windows.

## Vague 3 (05/11 au soir) : fusionnée, non poussée

- Outil MJ `dev/recette-plateau-04-11` : U6+U5, L5-MJ, cadrage U8, étude E1 fusionnés. `tests/unit` : 5 746 tests, 4 échecs (audits E0/E1/E2, préexistants Windows), **75 s**. Parcours verts : startup, u6, u5, u1-panneau-action, u2, u3, lot2, engagements-plateau. **`browser-index` échoue** (« un jet de critique tapé ne doit pas être ignoré par Appliquer », `5 !== 13`), **déjà sur la base de la vague** (branche U8, sans JS) : à trier.
- Map Display `feat/liaison-outil-mj` : L5-MD fusionné, `pnpm run verify` vert (312 e2e, 4 gestes).
- Contrat : D4 (diagonale 1,5), `cells: null`, adjacence complète et camps, dans les deux copies.
- **Reste de L5-MJ à brancher** (fichiers d'U6) : montage `mountMapLinkFeedback` dans `main.js` (ligne dans le rapport de la session L5-MJ), préremplissage de la portée dans `resolution-panel.js` (`distanceBetween`), pastille « posé » dans `workspace-view.js` (`mapLink.isPlaced`).
- Suites décidées : U8 L0+L1 en vague 4 (réponses du MJ dans le plan) ; P1 (suppression de la chasse des pions) puis P2 (médaillons variante B) dans Map Display.
- **Commande de la suite complète** : `node --test "tests/unit/**/*.test.js"` puis `"tests/unit/**/*.test.mjs"`. Jamais `node --test` nu à la racine : il parcourt aussi tous les worktrees (`.claude/worktrees`, `tmp/*-worktree`), dure plus de 15 min et mélange leurs échecs.

## Règles de travail (du MJ)

- **Tests** : dans une session, seulement les tests des fichiers touchés et leurs mutations. Suite complète (2 min) et `pnpm run verify` **une seule fois par vague**, à la fusion. Tout test navigateur se lance sous `timeout 120`.
- Sessions séparées à contexte neuf, lancées par la fenêtre principale. Sonnet pour l'interface cadrée, le modèle principal pour les règles et le store. Pas de suite complète dans les briefs.
- Commits locaux « (Claude) », jamais de push sans feu vert, jamais de `git stash`.
- Questions de règles : les poser au MJ dès qu'elles bloquent, jamais d'invention.
- Le serveur local du port 8771 est parfois arrêté par l'app : le relancer avec `preview_start` (`liaison-map-worktree`).
