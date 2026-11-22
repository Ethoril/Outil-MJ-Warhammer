Travaille dans le worktree de la carte `E:/rpg-map-display/.claude/worktrees/carte-c2`, branche locale `carte-c2` (tirée de `tour-de-jeu-turnreset` à <HASH>, qui contient le lot C1 et `main` de la carte). N'en change pas, ne crée pas d'autre branche ; ne touche ni au checkout principal `E:/rpg-map-display` (il porte du travail non commité d'une autre session), ni à l'outil MJ, ni au dépôt des fiches. Les dépendances de la carte sont déjà installées.

Lis d'abord le `CLAUDE.md` de la carte et ses documents normatifs (`docs/ARCHITECTURE.md` : manifeste fermé ; `docs/CONVENTIONS.md` ; `docs/STACK.md` ; `docs/ETAT.md`), puis `docs/A-FAIRE-OUTIL-MJ-TOUR-DE-JEU-2026-11-22.md`. Contexte : l'outil MJ commande le tour par `mj.turn { ref }` sur le canal `wfrp-map-link` (liaison version 2) ; seul le PJ lié du `ref` bouge sur la tablette ; tour d'un ennemi posé : aucun PJ ne bouge ; `ref: null` (ou ennemi non posé) : tout est libre, **laissé tel quel par décision du MJ du 22/11** ; un PJ non lié n'est jamais bridé ; le MJ déplace librement depuis l'écran MJ. Le MJ a relevé ce défaut à la table le 22/11 au soir (recette de la refonte, retour R8).

Retour R8 : « des PJ dont ce n'est pas le tour peuvent se déplacer ». Repérage déjà fait (à confirmer par tes tests) :
- le bridage ne s'applique qu'au toucher (`js/input/tokenHit.js` `isPlayerManipulableToken(token, turn)` ~l. 67 ; `js/ui/player/bootstrap.js` ~l. 329) ;
- un trajet préparé pour le PJ A reste « ready » quand le tour passe à B : `js/app/movePlanning.js` `reconcile` (~l. 194) et `validate` (~l. 155) ne testent pas le tour ;
- `js/ui/player/selectionStrip.js` (~l. 132, 223) et `js/ui/player/gameHelp.js` (~l. 1909, 1939) appellent `isPlayerManipulableToken(token)` sans le tour ;
- l'écran MJ applique tout `token.move` venu des joueurs sans revérifier le tour (`js/app/gm.js` ~l. 1325, 1358).

Précisions du MJ (question Q5 : tablette ou vue des joueurs, tour d'un PJ ou d'un ennemi non posé) : <REPONSE-Q5>.

Critères :
1. Un trajet préparé pour un PJ lié est invalidé (plus validable) dès qu'un `mj.turn` donne le tour à un autre ; test e2e dans `tests/tourDeJeu.spec.mjs` (rouge d'abord).
2. Bandeau de sélection et aide passent le tour au calcul de « manipulable » (si ce ne sont que des affichages, dis-le et aligne-les quand même sur le tour).
3. L'écran MJ refuse un `token.move` venu des joueurs pour un PJ lié hors de son tour (événement périmé ou concurrent).
4. Inchangés et testés : PJ non lié jamais bridé ; le MJ déplace librement ; `ref: null` = tout libre.

Règles du dépôt : zéro build, manifeste fermé (aucun fichier hors manifeste), `// @ts-check`, **muter l'effet** (retirer le correctif) et constater le rouge pour chaque test ajouté. Aucun message ni champ de la liaison changé, contrat intact. Mets à jour `docs/ETAT.md` (table « Suite produit ») et ce que le manifeste exige.

Acceptation : `PW_PORT=4180 pnpm run verify` vert (le port 4173 est occupé par une autre session : toujours `PW_PORT=4180`) ; si `pnpm` t'est refusé, dis-le au rapport et lance ce que tu peux (`node --test` des fichiers touchés). Commit local sur `carte-c2`, rien poussé, rien fusionné.

Interdits : pousser, `git stash`, `git add -A`, `git add .`, modifier le contrat ou les données communes. Commits fichiers nommés explicitement, message en français suffixé « (Claude) » et terminé par la ligne exacte `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sous Bash, chemins entre guillemets.

Si tu approches de la limite de contexte ou de tours : commit local « wip: … (Claude) » et une note de passation dans le rapport.

Rapport final en français, moins de quinze lignes : cause trouvée (fichier:ligne), fichiers touchés, tests ajoutés (vert, puis rouge sous mutation), résultat de `pnpm run verify`, écarts, ce qui n'est pas vérifié, hash du commit. (Modèle prévu : Sonnet.)
