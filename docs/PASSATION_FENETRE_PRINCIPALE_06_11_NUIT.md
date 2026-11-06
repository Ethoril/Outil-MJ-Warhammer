# Passation de la fenêtre principale (06/11/2026, nuit)

Travail de nuit en autonomie, sur feu vert du MJ. **Fusionné sur feu vert du MJ, rien n'est poussé.** `dev/recette-plateau-04-11` contient L5-MJ, P2 côté outil MJ (`767566e`), U8 L0-L1 (`5d00c51`, prières incluses) et le correctif `parseKeywordCSV` (`1575139`). `feat/liaison-outil-mj` (Map Display) contient P1 et P2 (`522fcf2`). Suite complète de l'outil MJ : 5 774 tests, 4 échecs (les audits E0/E1/E2 connus sous Windows). `pnpm run verify` : vert (312 réussis, 6 ignorés, 4 manuels).

**Décisions du MJ du 06/11** : deux prières différentes sur un même Test → meilleur bonus et pire pénalité, comme les sorts (le groupe des prières et celui des sorts se somment, Q2) ; débord des ornements gardé ; mots-clés incomplets écartés et signalés ; la monture d'un PJ prend la teinte de son cavalier, sauf `tokenColor` propre. **À confirmer** : une même couche (sort ou prière) qui porte deux clés visant le même Test (Charme +2 et Tous les Tests +1) compte pour une seule source, et ses clés s'additionnent (+3). C'est ce qu'attendait un test existant ; R3 vise plusieurs sorts, pas les clés d'un même effet.

Le tableau ci-dessous garde la trace des branches d'origine.

## Branches à fusionner (sur feu vert)

| Lot | Dépôt | Branche | Worktree | Commits |
|---|---|---|---|---|
| L5-MJ (branchement) | Outil MJ | `dev/recette-plateau-04-11` (déjà dessus) | — | `f3ff3c4` |
| U8 L0 + L1 | Outil MJ | `worktree-agent-a283de92d83f5356d` (part de `d3993af`) | `.claude/worktrees/agent-a283de92d83f5356d` | `55bd897`, `fb007e0`, `055e85a` |
| P2 côté outil MJ | Outil MJ | `worktree-agent-a7c1a7c89e15aa2ff` (part de `f3ff3c4`) | `.claude/worktrees/agent-a7c1a7c89e15aa2ff` | `552e9c5` |
| P1 | Map Display | `claude/p1-sans-chasse` (part de `feat/liaison-outil-mj`) | `E:/rpg-map-display-p1` | `6fbf76a` |
| P2 | Map Display | `claude/p2-medaillons` (part de P1) | `E:/rpg-map-display-p2` | `a923840` |

Ordre de fusion : U8 puis P2 dans `dev/recette-plateau-04-11` (fichiers disjoints) ; P2 dans `feat/liaison-outil-mj` (contient P1). Ensuite, une seule fois : suite complète de l'outil MJ (`node --test "tests/unit/**/*.test.js"` puis `"tests/unit/**/*.test.mjs"`) et `pnpm run verify` dans Map Display.

## Ce qui est fait

- **L5-MJ** : `mountMapLinkFeedback` monté dans `main.js`. La bande de portée d'un tir est préremplie depuis la distance de la carte (`v5RangeBandForMeters`, une fois par paire tireur→cible et par round : si le MJ l'efface, elle ne revient pas). La note « Distance sur la carte : 14 m → Courte » s'affiche ; le message de la carte s'affiche si la mesure est impossible. Pastille « posé » sur la piste. Vérifié dans le navigateur (port 8771) : « À poser (2) », puis pastilles « posé » et « À poser » masqué après pose simulée. **Non vu en vrai** : la bande préremplie dans le panneau de tir (couverte par `tests/unit/combat/portee-carte.test.js`).
- **P1** : chasse des pions supprimée (`tokenSocket.js`, `computeProportionalRing`, `computeStateRing`, constantes `CHASSE_*`, section « Motifs » de diag). Le rendu ne change pas : ce code dormait depuis le 01/10.
- **P2** : médaillons variante B. Champ `color` au contrat §4 (deux copies identiques), `tokenColor` sur le profil (saisie sous « Image du pion », dans la réserve), cerclages bronze / étain / fer en WebP sous 24 Kio, cache hors écran, repli sous 36 px. Rendu de contrôle : `docs/maquettes/e1-medaillons/rendu-p2-06-11.png`. **Les teintes des 5 PJ restent à saisir** dans leurs profils : Elysia `#b3262e`, Hellaya `#2e9e6e`, Wren `#e8846a`, Caelel `#2a4fa8`, Bhelgi `#6fb4e6`.
- **U8 L0 + L1** : les sorts donnent le meilleur bonus et la pire pénalité **par Test résolu**, toutes clés confondues (Q1). Les réponses Q2 à Q4 sont en vrais tests, verts. Tests ciblés : moteur 27/27 (5 todo), magie 918/918, divin et créatures 606/606.

## Questions pour le MJ

1. **Règle (U8)** : deux prières **différentes** qui visent le même Test par des clés différentes se cumulent-elles ? Aujourd'hui elles se somment par clé. Le livre ne traite que la même prière (R4 p. 217).
2. **U8, écarts relevés hors du lot** : prière + sort sur la même caractéristique donnent 40 au lieu de 50 attendus par Q2 (`calculateEffectiveStats`) ; DIV-05 refuse encore la pose d'une prière sur un sort de même clé, alors que Q2 les somme ; le Test de prière (`readPrayerModifiers`) additionne `all`, `tous les tests` et `priere` sans règle de cumul ; les clés « … adverse » se somment par clé. À traiter en L3.
3. **P2, rendu** : les pointes du fer et le laurier de l'étain dépassent un peu de la case par le haut, comme sur la maquette. Faut-il réduire le médaillon ? La fenêtre de l'étain est à 63 % (sa géométrie), bronze et fer à 69 %. Le personnage ne se détache sur l'émail que si son image est détourée.
4. **P2** : le liseré choisi à la main ne s'affiche plus sur aucun pion lié, pastille du panneau MJ comprise. Une monture de PJ sans couleur prend le bronze teinté du bleu de camp.
5. **`parseKeywordCSV`** : aujourd'hui une seule ligne incomplète de la feuille bloque « Actualiser les références ». Proposition : écarter les lignes incomplètes en les listant dans le message, et garder le blocage pour les doublons d'identifiant et la feuille vide. À valider avant de coder.

## Reste à faire

- Recette du MJ à la table, port 8771 : montures, Course, nouveau feu, L5 (à poser, engagements, distance préremplie), U6/U5, puis médaillons après fusion de P2.
- À trier : `browser-index` (déjà rouge sur la base de la vague 3), parcours `f2-j`/`f2-j2`, audits E0/E1/E2 sous Windows, recette-g-c14.
- Ménage : 16 sessions des vagues 1 à 3 archivées cette nuit. Restent ouvertes : E1 (maquette, port 8790) et L5-MD, que l'app a refusé d'archiver (« travail encore actif »).
