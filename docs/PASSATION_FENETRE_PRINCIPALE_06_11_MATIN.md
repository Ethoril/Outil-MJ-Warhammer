# Passation de la fenêtre principale (06/11/2026, fin de matinée)

Suite de `docs/PASSATION_FENETRE_PRINCIPALE_06_11_NUIT.md`, qui garde le détail de la nuit : L5-MJ, P1, P2, U8 L0 à L3, recette et constats. Les décisions du MJ, de Q1 à Q20, sont à la fin de `docs/PLAN_CHANTIERS_PARALLELES_05_11.md`.

## Consigne du MJ pour la suite : des fenêtres secondaires, plus de sous-agents

Cette nuit, l'app refusait de lancer des sessions sur un tour automatique, et tout est passé en sous-agents. **Le MJ demande de revenir aux fenêtres secondaires** :
- un chantier = une session lancée avec `start_session`, qu'il peut ouvrir, suivre et piloter lui-même ;
- Sonnet pour l'interface cadrée, Opus pour les règles et le store ;
- si l'app refuse le lancement (tour automatique), **proposer** la session ou attendre un message du MJ, sans basculer en sous-agent.

La fenêtre principale garde son rôle : découper, lancer, relire les diffs, fusionner, faire la recette. Les autres règles ne changent pas :
- tests ciblés par session, suite complète à la fusion ;
- tout test navigateur sous `timeout 120` ;
- commits locaux « (Claude) », pas de push sans feu vert, jamais de `git stash` ;
- une session qui boucle : la recadrer tôt (deux essais, puis commit wip et rapport).

## État des dépôts (rien n'est poussé, mode développement)

| Dépôt | Branche | Tête |
|---|---|---|
| Outil MJ `E:\Outil MJ Warhammer` | `dev/recette-plateau-04-11` | `4770128` (ou la suivante) |
| Map Display, worktree `E:\rpg-map-display-liaison` | `feat/liaison-outil-mj` | `6ea2716` |

`docs/RECETTE_UTILISATEUR.md` est modifié par un autre chantier : ne pas le commiter. Le dépôt principal `E:\rpg-map-display` reste sur `autonome/2026-08`.

**Vérifications à la dernière fusion** :
- suite complète de l'outil MJ : 5 769 tests, 0 todo, seuls les 4 audits E0/E1/E2 échouent (connus sous Windows) ;
- `pnpm run verify` de Map Display était vert après P1 et P2. Depuis, seuls des tests ciblés ont tourné (médaillons PJ, initiales, trait d'engagement) : **relancer `pnpm run verify` une fois**.

## Fait depuis la passation de la nuit

- **Médaillons des PJ par Magnific**. Le MJ a refusé la teinte calculée. Les 5 images ont été générées à partir du bronze validé, puis validées par le MJ (`docs/maquettes/e1-medaillons/cerclage-pj-*.webp`). La carte choisit l'image par la teinte du PJ. Dans l'outil MJ, un menu des 5 PJ remplace le champ hexa. Les PNJ gardent les cerclages étain, bronze et fer validés.
- **Recette du 06/11 et corrections** :
  - initiales sans ponctuation, sur le pion et dans le panneau ;
  - trait d'engagement dessiné sous les pions ;
  - un PJ déjà au combat ne peut plus y être ajouté une seconde fois ;
  - précache `sw.js` complété (`effect-engine.js`, `condition-effects.js`, `token-color-options.js`).
- **U8, de L4 à L5z, puis Q19 et Q20** :
  - États dans l'agrégateur (`js/core/condition-effects.js`) ;
  - adaptateurs Traits, surnombre et qualités, montures, branchés dans `buildCombatTest` ;
  - un seul calcul d'États pour le combat, la magie et le contexte de Test (Q19) ;
  - Clarté d'esprit n'efface plus que Sonné (Q20, ce qui change aussi le combat) ;
  - Q5 couvert par un test.

## Fait le 06/11 après-midi

- `pnpm run verify` de Map Display : vert. Un test de démarrage de `prepare-server` a dépassé son délai sous charge, puis il est passé quand on l'a relancé seul.
- U8 L6 et les questions d'États en magie, fusionnés (`ee03ec3`).
- U8 L7, fusionné (`6b8a207`) avec les réponses du MJ :
  - un seul fichier pour les suppléments ;
  - coûts et quotas des talents de supplément ;
  - sorts et prières de supplément lançables ;
  - bandeau d'erreurs qui reste affiché.
- Précache de `sw.js` complété pour les modules de L6 (`ebd6b30`).
- Suite complète : 5 880 tests. Seuls les 4 audits E0, E1 et E2 connus échouent. Pour la lancer, utiliser `node --test "tests/**/*.test.js" "tests/**/*.test.mjs"` : un `node --test` nu balaie aussi les worktrees de `tmp/`.
- Contrôle sur 8771 : l'application charge sans erreur, les nouveaux modules sont servis, aucun bandeau n'apparaît avec le fichier de suppléments vide, et le rendu des lignes barrées et des questions est conforme. Le parcours en jeu n'est pas fait : la fenêtre était masquée.

## À faire, dans l'ordre

1. **`pnpm run verify`** dans `E:\rpg-map-display-liaison`, environ 6 min, à ne pas lancer en même temps que la suite de l'outil MJ.
2. **U8 L6** (fenêtre Sonnet) : détail des modificateurs dans `js/ui/resolution-panel/result.js`, avec source, montant et « non cumulé » barré avec sa règle (Q9). `condition-effects.js` et `combineEffects` rendent déjà les effets écartés avec leur règle.
3. **Interface des réponses d'États en magie** : `next.conditionNeeds` (Brisé, Enchevêtré, À terre, Aveuglé, Souillé) n'est lu par aucun écran. Tant que le MJ n'a pas répondu, ces États ne pèsent pas en magie, comme avant. À brancher dans le panneau de résolution.
4. **U8 L7** (fenêtre Opus) : chargeur de JSON de supplément sans JS, pour les suppléments futurs. Ce n'est pas un préalable : *Sea of Claws* est déjà intégré dans les formats actuels (Q7), et ses carrières vivent dans la feuille Aides de jeu. L8 et L9 suivent au rythme des suppléments.
5. **Recette restante** sur le port 8771 :
   - la bande de portée préremplie, qui demande un combattant avec une arme à distance dans son équipement ;
   - U5 (barre de PV en aperçu), montures, Course ;
   - le trait d'engagement à pleine taille, puisque le zoom ne répondait pas dans le navigateur intégré.
6. **À trier** :
   - `browser-index` ;
   - `browser-magic-v5-smoke` et `browser-workspace`, qui dépassent `timeout 120`, déjà avant U8 L3 ;
   - parcours `f2-j`/`f2-j2` ;
   - recette-g-c14.

## Ménage (sur accord du MJ)

- **Données de test de la recette** :
  - le profil « Elysia (test) » et ses deux participants dans le combat local du navigateur intégré ;
  - la carte « Ferme isolée », chargée dans la **session Firebase 94SHD** avec trois pions posés. À retirer si cette session sert à la vraie table.
- **Worktrees des sous-agents**, tous fusionnés : 8 sous `.claude/worktrees/agent-*`, et côté Map Display `E:\rpg-map-display-p1`, `-p2`, `-pj` et `-recette`.
- **Anciens worktrees** :
  - `.claude/worktrees/l1c-portees-72bd28`, `u1-u2-rendu-f4c4cd`, `u4-fiche-onglets-8cb05a` (HEAD détachée, sessions archivées) ;
  - les `tmp/*-worktree` de Codex. À vérifier avant de les retirer.
- **Garder** `e1-medaillons-a7988b`, tant que la maquette sert (port 8790).
