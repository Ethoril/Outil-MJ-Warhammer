# Lot R1 — inventaire du disque (liste seulement) et archivage

Worktree : `E:/Outil MJ Warhammer/tmp/phase-r-worktree`, branche `claude/phase-r` (créée depuis `main` = 3.27.0). Tu n'écris QUE dans ce worktree.

## Interdits absolus

- **N'efface rien, ne déplace rien** : aucun `rm`, `git worktree remove`, `git worktree prune`, `git branch -d/-D`, `git clean`, `rmdir`, `git stash`. Lecture seule partout ailleurs que dans ce worktree.
- N'écris rien dans les autres worktrees. `tmp/v3-a-worktree`, `tmp/v3-b-worktree`, `tmp/v3-c-worktree` (branches `claude/v3-*`) sont **en cours d'utilisation par une autre session** : lecture seule, et classe-les « garder (en cours, v3 non publiée) ».
- Ne copie dans `docs/archives/` **aucun texte intégral de livre ni image de page** : le dépôt est public. Exclus notamment `tmp/v5-diff-v2-v3/v2.txt`, `v3.txt`, `DIFF_MOTS.txt`, `n23.txt`, tous les `*.png`, et tout fichier qui est une extraction brute de PDF. Les analyses, décisions, briefs et journaux (qui citent au plus quelques phrases) sont acceptables.

## 1. Inventaire → `docs/MENAGE_R1.md` (en français)

Couvre :
- les 50 worktrees de `git worktree list` (dépôt `E:/Outil MJ Warhammer`), dont ceux sous `C:/Users/arnot/.codex/worktrees/` et `E:/tmp-f-check` ;
- toutes les branches locales (`git branch`) ;
- chaque entrée de `E:/Outil MJ Warhammer/tmp/` (~105 entrées : dossiers, logs, png, scripts) ;
- `E:/tmp-f-check` et `E:/tmp-node` s'il existe.

Pour chaque élément : taille (`du -sh`, ou estimation si trop long), fusionné ou non dans `main` (`git branch --merged main`, et pour un HEAD détaché `git merge-base --is-ancestor <sha> main`), commits non fusionnés éventuels (`git log --oneline main..<branche>` : nombre et résumé), modifications non commitées (`git -C <wt> status --short | wc -l`), ce qu'il contient d'utile, et une proposition : **supprimer**, **archiver** (et ce qui a été copié), ou **garder** (pourquoi).

Tableaux par catégorie (worktrees, branches sans worktree, dossiers `*-runtime`, logs, images, scripts, autres). En tête : un résumé chiffré (taille totale de `tmp/`, ce que libérerait la proposition).

**Jonctions `node_modules`** : pour chaque worktree, indique si `node_modules` existe et si c'est une jonction/lien (PowerShell : `(Get-Item <wt>\node_modules -Force).LinkType` et `.Target`). Ajoute une section « Procédure sûre de retrait » : incident du 29/10 (`git worktree remove --force` sur un worktree dont `node_modules` était une jonction a vidé le `node_modules` du dépôt principal) ; toujours `cmd /c rmdir "<wt>\node_modules"` (retire la jonction seule, sans `/s`) **avant** `git worktree remove`, puis `git worktree prune`, puis `git branch -d` (jamais `-D` sur une branche non fusionnée sans accord du MJ). Donne les commandes prêtes à copier pour la proposition, en blocs séparés « sans risque (fusionné) » et « à confirmer (non fusionné) ».

Signale à part : branches avec du travail non fusionné qui pourrait avoir de la valeur, et modifications non commitées.

## 2. Archivage (copie) dans `docs/archives/`

Copie (ne déplace pas) ce qui sert encore, en gardant une arborescence lisible, par exemple :
- `docs/archives/f1-reperage/` : `tmp/f1-reperage/ARBITRAGES_25_10.md` et ses voisins utiles (rapports, arbitrages, décisions ; pas les extractions brutes de PDF) ;
- `docs/archives/v5-diff-v2-v3/` : analyses (`ANALYSE_*.md`), briefs (`BRIEF_*.md`), `CHANGEMENTS_FEUILLE.json`, `JOURNAL_FEUILLE.md`, `YARDS_FEUILLE.json`, `choix-v3.html`, `decisions/` — sans les textes de livre ni les png ;
- les rapports, arbitrages et briefs utiles trouvés ailleurs dans `tmp/` (dossiers `divin`, `gpt-phase-f2`, `recette-f2`, `gemini-verifs`, `verif-*`, `cv-*`, `lot*`…) : seulement ce qui documente une décision ou un résultat de contre-vérification, pas les journaux de tests ni les sorties d'outils.

`docs/archives/README.md` : une ligne par fichier/dossier archivé (origine, contenu, pourquoi on le garde). Vérifie que rien n'est déjà dans `docs/` à l'identique (dans ce cas, ne copie pas, note-le).

Fins de ligne : LF pour tout fichier texte que tu écris ou copies (convertis CRLF → LF à la copie ; Python `newline=''`). Taille totale de `docs/archives/` : indique-la dans le rapport ; si elle dépasse ~15 Mo, arrête-toi et explique ce qui pèse.

## 3. Fin

- `git -C <worktree> add docs/MENAGE_R1.md docs/archives` puis un commit en anglais : `docs(r1): disk inventory for the GM and archive of reports, arbitrations and v3 analyses (Claude)` suivi de la ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Pas de push.
- Vérifie `git status` propre et `git diff --stat main..HEAD` (seulement `docs/`).
- Réponds avec : le hash du commit, la taille de l'archive, le résumé chiffré, et les points qui demandent une décision du MJ.
