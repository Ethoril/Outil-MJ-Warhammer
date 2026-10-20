# Brief GPT — fin de la phase A et inventaires C0, D0b, E0 (21 octobre 2026)

Tu reprends un travail cadré. Claude (orchestrateur) vérifiera, intégrera et publiera ensuite : **tu ne publies rien**. Lis ce brief en entier avant de commencer, puis applique-le à la lettre.

## Contexte

- Dépôt : Outil MJ Warhammer (PWA JavaScript, tests `node:test`, parcours navigateur Playwright avec Edge).
- Branche de départ : `codex/divin-v5` (production 3.20.1). Plan d’ensemble : `docs/PLAN_FIN_DE_PROJET.md`. Arbitrages du MJ, à respecter : `docs/divin/DIVIN_RESERVE_DECISIONS.md` (section « Arbitrages du MJ du 20 octobre (soir) »).
- Spécification des lots : `docs/PLAN_GLM_PHASE_A.md` (en anglais ; ses « Global rules » s’appliquent à toi telles quelles, en remplaçant « (GLM 5.3) » par « (GPT) » dans les messages de commit et `tmp/glm-phase-a/` par `tmp/gpt-phase-a/`). A1 et A2 sont faits.
- Prompts d’inventaire : `docs/plans-glm/inv-C0.md`, `inv-D0b.md`, `inv-E0.md` (en anglais ; ils valent spécification).

## Préparation

1. Crée un worktree dédié depuis `codex/divin-v5` : branche `gpt/phase-a`. Ne travaille jamais sur `codex/divin-v5` ni sur `main`.
2. Le dépôt est en fins de ligne **LF** : `git config core.autocrlf false`, puis `git rm -q --cached -r . && git reset -q --hard` dans le worktree. Avant chaque commit, `git ls-files --eol | grep crlf` doit être vide.
3. `node_modules` : jonction vers celui du worktree principal, ou `npm ci`.
4. Crée `tmp/divin/` (sinon un test d’environnement échoue : `E0 indépendant — la recette refuse un cwd externe`, seul échec toléré).

## Travail demandé, dans cet ordre

1. **Lots A3 à A12** de `docs/PLAN_GLM_PHASE_A.md`, un par un, chacun dans un commit.
2. **Inventaire C0** (Brisé, Peur, Terreur), puis **D0b** (traditions de magie des suppléments et runes naines), puis **E0** (Traits de créature et profils par bestiaire), d’après `docs/plans-glm/inv-*.md`, chacun dans un commit.

## Règles (non négociables)

- **Tests d’abord** pour chaque lot : écris le nouveau fichier de test, lance-le, vérifie qu’il échoue pour la raison attendue ; puis le code ; puis la commande d’acceptation du lot ; puis `node tools/build-v5-divine-contracts.mjs --check` si des contrats changent (régénération par `node tools/build-v5-divine-contracts.mjs`, jamais à la main) ; puis la suite complète `node --test --test-concurrency=4` ; puis un commit `<type>(divin): <résumé français> (GPT)`.
- **Périmètre** : seulement les fichiers et emplacements que le lot nomme. Les tests existants ne se modifient pas, sauf les assertions qui épinglent le statut, la liste d’effets, un nom ou un décompte du contrat modifié par le lot (chaque modification listée dans le message de commit), et les fichiers de test qu’un lot nomme.
- **Jamais de règle de jeu pliée pour faire passer un test.** Si un attendu paraît faux, impossible, ou exige un fichier hors périmètre : écris `tmp/gpt-phase-a/BLOCKED-<lot>.md` (raison précise, extraits utiles), annule le travail non commité du lot (`git reset --hard`), passe au lot suivant.
- **Risque élevé** (A10 Chance, A12 ordre d’Initiative) : caractérisation d’abord, commitée à part ; ne modifie ensuite que les assertions qui épinglaient l’ancien comportement visé par l’arbitrage ; A12 exige en plus la recette complète `node tools/run-divine-recipe.mjs` verte (environ 10 minutes).
- **Inventaires** : n’écris que les deux fichiers de rapport demandés ; résumés en français, dans tes mots, jamais le texte des livres recopié (au plus une douzaine de mots cités par entrée) ; livre + page imprimée pour chaque entrée ; statut actuel prouvé par `fichier:ligne` ou nom de test ; tout doute va dans `openQuestions`. Un livre à la fois, pages ciblées (`pdftotext -layout -f <p> -l <p> "<chemin>" -`) : ne charge pas un livre entier.
- **Interdits** : `git stash`, `git push`, changement de version (`js/version.js`, `package.json`, `sw.js`…), nouvelle dépendance, reformatage hors lot, modification des fichiers `docs/divin/DIVIN_RESERVE_DECISIONS.md` et `docs/PLAN_*.md`.
- **Outil manquant** (Edge pour les parcours navigateur, `pdftotext`, accès aux PDF) : n’improvise pas, fichier BLOCKED avec la commande qui échoue, et continue avec ce qui reste faisable.

## Hors du brief (ne pas faire)

Lots des phases B (Courroux), C, D, E, F : ils attendent des arbitrages du MJ tirés des inventaires. Publication, fusion dans `codex/divin-v5`, modification de `main`.

## Rendu

À la fin, écris `docs/plans-gpt/RAPPORT_GPT_PHASE_A.md` (commité) : une ligne par lot et par inventaire, **FAIT** (hash) ou **BLOQUÉ** (raison en une phrase), puis le résumé de la dernière suite complète (nombre de tests, échecs), puis la liste des assertions de tests existants modifiées. Ton dernier message reprend ce rapport.
