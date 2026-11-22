Travaille dans le worktree de la carte `E:/rpg-map-display/.claude/worktrees/carte-c3`, branche locale `carte-c3` (tirée de `tour-de-jeu-turnreset` à <HASH>, qui contient le lot C1 et `main` de la carte). N'en change pas, ne crée pas d'autre branche ; ne touche ni au checkout principal `E:/rpg-map-display` (il porte du travail non commité d'une autre session), ni à l'outil MJ, ni au dépôt des fiches. Les dépendances de la carte sont déjà installées.

Lis d'abord le `CLAUDE.md` de la carte et ses documents normatifs (`docs/ARCHITECTURE.md` : manifeste fermé ; `docs/CONVENTIONS.md` ; `docs/STACK.md` ; `docs/ETAT.md`), puis `docs/A-FAIRE-OUTIL-MJ-TOUR-DE-JEU-2026-11-22.md`. Contexte : l'outil MJ commande le tour par `mj.turn { ref }` sur le canal `wfrp-map-link` (liaison version 2) ; seul le PJ lié du `ref` bouge sur la tablette ; tour d'un ennemi posé : aucun PJ ne bouge ; `ref: null` (ou ennemi non posé) : tout est libre, **laissé tel quel par décision du MJ du 22/11** ; un PJ non lié n'est jamais bridé ; le MJ déplace librement depuis l'écran MJ. Le MJ a relevé ce défaut à la table le 22/11 au soir (recette de la refonte, retour R9).

Retour R9 : « un adversaire qui finit son mouvement dans la zone éclairée par la torche d'un PJ n'est pas détecté ». **Reproduction d'abord** : règle du MJ, aucun correctif sans un test qui échoue aujourd'hui.

Précisions du MJ (question Q4 : comment la torche était posée, taille de l'ennemi, niveau dans le noir ou non) : <REPONSE-Q4>. Si ce champ est resté tel quel, essaie toutes les pistes ci-dessous.

Repérage (non prouvé) : visibilité = (ligne de vue ∩ éclairé) ∪ (portée `visionDim` dans le noir) (`js/render/layers/fogLayer.js` `updateVision` ~l. 331, composition dans `vision/fog.js` `composeVisibleMask`) ; les torches de pion (`emitsLight`) entrent dans la signature et le champ lumineux (`fogLayer.js` ~l. 126-135, `js/render/layers/light.js` ~l. 89, 187) ; visibilité d'un pion pour les joueurs = case d'ancrage seule (`js/render/layers/tokens.js` ~l. 334). Pistes, une par test (`tests/lights.spec.mjs`, `tests/fogLayer.test.mjs` ou `tests/lightField.test.mjs`) : (1) `emitsLight` absent d'un pion lié envoyé par l'outil (l'outil ne l'envoie pas) ; (2) ligne de vue du PJ coupée par erreur ; (3) ennemi de grande taille testé sur sa seule case d'ancrage ; (4) masque de session non republié après le mouvement de l'ennemi ; (5) ennemi caché.

Critères : si une piste reproduit, corrige la cause, test vert, mutation rouge. Si aucune ne reproduit, ne modifie pas le code : le rapport liste les scénarios essayés et ce qu'il faut demander au MJ.

Règles du dépôt : zéro build, manifeste fermé (aucun fichier hors manifeste), `// @ts-check`, **muter l'effet** (retirer le correctif) et constater le rouge pour chaque test ajouté. Aucun message ni champ de la liaison changé, contrat intact. Mets à jour `docs/ETAT.md` (table « Suite produit ») et ce que le manifeste exige.

Acceptation : `PW_PORT=4180 pnpm run verify` vert (le port 4173 est occupé par une autre session : toujours `PW_PORT=4180`) ; si `pnpm` t'est refusé, dis-le au rapport et lance ce que tu peux (`node --test` des fichiers touchés). Commit local sur `carte-c3`, rien poussé, rien fusionné.

Interdits : pousser, `git stash`, `git add -A`, `git add .`, modifier le contrat ou les données communes. Commits fichiers nommés explicitement, message en français suffixé « (Claude) » et terminé par la ligne exacte `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sous Bash, chemins entre guillemets.

Si tu approches de la limite de contexte ou de tours : commit local « wip: … (Claude) » et une note de passation dans le rapport.

Rapport final en français, moins de quinze lignes : cause trouvée (fichier:ligne), fichiers touchés, tests ajoutés (vert, puis rouge sous mutation), résultat de `pnpm run verify`, écarts, ce qui n'est pas vérifié, hash du commit. (Modèle prévu : Sonnet.)
