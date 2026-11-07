# Passation — phase R (ménage, tests, refactorisation), nuit du 30/10/2026

Tu reprends le projet après la publication de la **3.28.0** (report de la v3 du livre de base V5). Tu travailles **seul cette nuit** : le MJ ne répondra pas avant demain. Lis tout ce document avant d'agir.

## 1. À lire avant de commencer (dans cet ordre)

1. `C:/Users/arnot/.claude/CLAUDE.md` : préférences du MJ (réponses courtes, délégation aux sous-agents, règles Mistral/GLM).
2. La mémoire du projet : `C:/Users/arnot/.claude/projects/E--Outil-MJ-Warhammer/memory/MEMORY.md` et les fiches qu'elle cite, en particulier :
   - `agents-use-sonnet.md` : tous les sous-agents en `model: "sonnet"` ;
   - `contre-verification-systematique.md` : vérificateur indépendant (agent `verifier`, contexte neuf) avant toute publication ;
   - `petites-corrections-directes.md` : après contre-vérification, fais toi-même les petites corrections ;
   - `no-git-stash-parallel-worktrees.md` : jamais de `git stash` ;
   - `yards-en-metres.md` : 50 yards = 50 m, même valeur, partout ;
   - `release-push-authorized.md` et `autonomy-end-of-project.md` : publication autorisée sans feu vert, une fois tout vert ;
   - `refonte-interface-branch.md` : comment publier, et le manifeste de recette (§ 4).
3. `docs/PLAN_FIN_DE_PROJET.md`, section « Phase R » : le mandat.
4. `docs/RAPPORT_PHASE_F2.md` : ce que contient l'outil depuis F2, et ses limites acceptées.
5. `tmp/f1-reperage/ARBITRAGES_25_10.md` : toutes les décisions du MJ (F2, J1, J2, v3). Elles priment sur les livres et sur les anciens rapports.
6. `docs/PASSATION_FIN_DE_PROJET.md`, section « Procédure d'intégration et de publication ».

## 2. État au départ

- Production : **3.28.0** sur `main` (vérifie `https://ethoril.github.io/Outil-MJ-Warhammer/js/version.js` et `git log -1 origin/main`). Contenu : F2 complète (14 lots), séquelles hors combat, v3 du livre de base (51 changements décidés par le MJ, lots v3-A données, v3-B combat, v3-C talents/magie/créatures), libellés en mètres.
- Branche de publication : worktree `C:/Users/arnot/.codex/worktrees/divin-v5/Outil MJ Warhammer`, branche `codex/divin-v5`, poussée sur `main`.
- La feuille Google « Aides de Jeu » du MJ (id `1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs`) est à jour pour la v3 et ne contient plus de « yards ». Journal : `tmp/v5-diff-v2-v3/JOURNAL_FEUILLE.md`. N'y écris rien cette nuit.

## 3. Ce que tu fais cette nuit : phase R

Trois lots, dans cet ordre. Chacun : implémentation par sous-agent Sonnet (`implementer`, brief écrit dans un fichier), puis vérificateur Sonnet indépendant, corrections, suite complète et recette vertes.

### Lot R1 — ménage du disque (préparer, ne rien effacer)

- `tmp/` pèse ~4 Go : une centaine d'entrées, 18 worktrees, 46 worktrees connus de git (`git worktree list`), plus `E:/tmp-f-check` (détaché, avec une jonction `node_modules`).
- Produis `docs/MENAGE_R1.md` : pour chaque worktree / branche / dossier de `tmp/`, fusionné ou non dans `main` (`git branch --merged main`), ce qu'il contient d'utile, et la proposition (supprimer, archiver dans `docs/archives/`, garder).
- Archive (copie) dans `docs/archives/` ce qui sert encore : rapports, arbitrages (`tmp/f1-reperage/ARBITRAGES_25_10.md` et ses voisins), briefs utiles, `tmp/v5-diff-v2-v3/` (analyses, décisions, journal de la feuille). Commit.
- **N'efface rien** : la liste va au MJ demain. Exception permise : rien.
- **N'attends pas sa réponse** : dès la liste et l'archive commitées, enchaîne sur R2 puis R3. Les worktrees et dossiers de `tmp/` ne gênent pas R2 et R3 (travaille dans un worktree neuf créé depuis `main`).
- **Danger connu** : plusieurs worktrees ont un `node_modules` qui est une **jonction** vers un autre `node_modules`. `git worktree remove --force` sur un tel worktree a déjà vidé le `node_modules` du dépôt principal (incident du 29/10). Note-le dans la liste ; la procédure sûre est `cmd /c rmdir <worktree>\node_modules` avant tout retrait.

### Lot R2 — rationaliser les tests

- 518 fichiers `.test.js` et 122 parcours navigateur (~62 000 lignes) ; beaucoup de lots ont 3-4 fichiers qui se recouvrent (`*-characterization`, `*-review`, `*-counterreview`, `*-final-review`).
- Objectif : un fichier par domaine (combat, magie, divin, créatures, séquelles, Corruption…), doublons retirés, noms explicites ; suite rapide (`node --test`) séparée des parcours navigateur (script npm dédié).
- **Garde-fou obligatoire** : mesure la couverture avant et après (`node --test --experimental-test-coverage`, ou c8 si présent) ; la couverture des lignes et des branches ne doit pas baisser. Aucune assertion supprimée sans qu'une assertion équivalente existe ailleurs : le vérificateur le contrôle fichier par fichier.
- Par petits commits, domaine par domaine.

### Lot R3 — refactoriser le code, sans changement de comportement

- Cibles : `js/core/store.js` (~5 800 lignes, lignes très longues), `js/core/resolution.js`, `js/ui/resolution-panel.js`, `js/ui/workspace-view.js`.
- Découpe par domaine en modules, style harmonisé (lisibilité, une ligne = une instruction), **aucun changement de comportement**. Chaque nouveau module va dans le précache de `sw.js` (le test `tests/sw.test.js` le vérifie).
- Par petites étapes ; à chaque étape : suite complète verte, recette verte, vérificateur indépendant qui compare le comportement (pas seulement les tests).
- Si une étape devient risquée ou ambiguë, arrête-la proprement (commit de ce qui est fini) et note-la pour le MJ.

### Publication

Tu peux publier une version (3.28.x ou 3.29.0) quand un lot est fini, contre-vérifié, et que la suite et la recette sont vertes, selon la procédure (§ 4). R1 n'appelle pas de version (documents seulement). Si tu doutes, ne publie pas : laisse la branche prête et écris pourquoi.

## 4. Procédure de publication (rappel, et pièges)

1. Fusionne ta branche dans `codex/divin-v5` (worktree ci-dessus).
2. Précache : tout fichier `js/**` ajouté va dans `ASSETS_TO_CACHE` de `sw.js`.
3. Version aux 7 endroits : `js/version.js`, `package.json`, `package-lock.json` (2), `sw.js` (CACHE_NAME), `index.html` (#btn-version), `README.md` (titre et ligne 3).
4. Suite : `node --test --test-concurrency=4` **sans** `TEMP` sur E: dans ce worktree.
5. Recette : `node tools/run-divine-recipe.mjs` (~10 min). Si elle finit par « Une source protégée a été modifiée » alors que toutes les étapes sont vertes, c'est que `js/data/reference-snapshot.json` ou un CSV de `js/data/reference-source-csv/` a changé légitimement : régénère `tmp/divin/base-manifest.json` (ignoré par git) depuis le commit validé, puis relance la recette. Ne le fais que si le changement vient d'un lot contre-vérifié.
6. Commit en anglais, `git push origin codex/divin-v5:main` et `git push origin codex/divin-v5`, vérifie la version en ligne, puis `git pull --ff-only` dans `E:/Outil MJ Warhammer`.
7. Mets à jour la mémoire `refonte-interface-branch.md` (version en production).

Autres pièges : fins de ligne LF partout (Python : `newline=''`) ; `TEMP=E:/tmp-node TMP=E:/tmp-node` pour `node --test` dans les autres worktrees ; parcours navigateur avec `PLAYWRIGHT_EXECUTABLE_PATH="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"` ; dans un parcours, les puces de cible sont dans le groupe « Adversaires » (la liste des combattants porte des boutons du même nom) ; le classificateur refuse parfois une commande sans raison : réessaie une fois, sinon contourne proprement ou note-le.

## 5. Ce que tu ne fais pas

- Pas de nouvelle règle de jeu, pas de changement de comportement, pas d'arbitrage à la place du MJ : note les questions dans le rapport.
- Pas d'écriture dans la feuille Google, ni dans le projet des fiches (`ennemi-interieur-wfrp4`).
- Pas de suppression de fichiers, worktrees ou branches (R1 = liste seulement).
- Pas de Mistral/GLM : la délégation est autorisée dans ce projet (mémoire `glm-delegation-authorized.md`), mais le MJ surveille les coûts ; reste sur les sous-agents Sonnet cette nuit.

## 6. Au matin

Écris `docs/RAPPORT_PHASE_R_NUIT_30_10.md` : ce qui est fait (commits, versions publiées), résultats exacts (suite, recette, couverture avant/après), la liste R1 à valider, les étapes R3 arrêtées et pourquoi, les questions pour le MJ. Mets à jour `docs/PLAN_FIN_DE_PROJET.md` (état de la phase R) et la mémoire du projet.

## 7. Questions déjà en attente pour le MJ (ne pas trancher, les recopier dans ton rapport)

La 3.28.0 est publiée (main `3367f5b`, en ligne, suite 5 471/5 471, recette 26/26). Branches fusionnées : `claude/v3-a`, `claude/v3-b`, `claude/v3-c` (worktrees `tmp/v3-a-worktree`, `tmp/v3-b-worktree`, `tmp/v3-c-worktree`, à inclure dans la liste R1).

1. **Peur sans indice** : le livre v3 p.358 dit « Fear (1, if not stated) », ce que fait le moteur (`js/core/creature-psychology.js` ~83) ; l'arbitrage C0 du MJ (21/10) demandait la saisie du MJ pour un indice non chiffré. Profils concernés : Oint druchii (L09), Heomreth et Kurt Helborg (V4).
2. **Pause de Focalisation et Œil de la tempête** : la pause est maintenant un Test de Focalisation (p.236) ; l'Exténué s'y applique encore et Œil de la tempête ne l'ignore pas pour la pause (`js/core/v5-magic-talents.js` ~75). Étendre ou non ?
3. **Grim** : limité par l'outil à une attaque gratuite par Tour (le livre p.358 ne pose pas de limite).
4. **Faux de Shyish et attribut des Bêtes** : distances non suivies ; l'attribut des Bêtes retire l'Élan à tous les ennemis vivants actifs (hors banc et morts), sans liste décochable.
5. **Morsure** : toute valeur imprimée est gardée (Trait, nom d'attaque ou dégâts saisis à la main) ; BF+3 seulement sans aucun chiffre.
6. **Perturbant** : un Perturbant `neutre` touche les autres camps ; un participant `neutre` n'est jamais touché.
7. Les « yards » qui restent dans les `sourceText` bruts du bestiaire (`js/data/bestiary/*.json`, citations des livres) : laissés tels quels, à confirmer.
