# Ménage R1 — inventaire du disque (liste seulement)

Rien n'a été supprimé ni déplacé : ce document propose, le MJ décide. Inventaire établi le 30/10/2026 à partir de `main` = 877be65 (3.27.0).

## Résumé chiffré

- `E:/Outil MJ Warhammer/tmp/` : **4,4 Go**, 106 entrées (dont 25 worktrees, ~4,2 Go ; le reste ~0,25 Go).
- 50 worktrees (dont le principal) et 46 branches locales. Chaque branche locale a un worktree : **aucune branche sans worktree**. 4 worktrees sont en HEAD détaché (`coherence-outil`, `recette-f2-worktree`, `verif-qualite`, `E:/tmp-f-check`), tous fusionnés.
- **43 worktrees sur 49 sont entièrement fusionnés dans `main`**, sans modification utile. Non fusionnés : `glm/inv-B0`, `glm/inv-D0a`, `gpt/phase-f0b` (à confirmer).
- Libérable sans risque (fusionné), maintenant : **~3,5 Go** = worktrees de `tmp/` (3,0 Go) + worktrees `~codex` (0,45 Go) + `E:/tmp-f-check` (43 Mo). Plus **~0,27 Go** de dossiers/logs/images de `tmp/` après archivage. Plus tard, en dernier : `divin-v5` + `lot2-combat-v5` (0,58 Go). À confirmer : `gpt-phase-f0b-worktree` (835 Mo).
- Total proposé : ~3,8 Go maintenant, ~4,4 Go avec les dernières étapes (hors v3 et dossiers gardés).
- `E:/tmp-node` : 75 Mo, fichiers de travail JS/JSON (`L06-main.json`, `after.json`, `aftermath-*.js`…), hors dépôt ; non regardé en détail, à supprimer si le MJ n'en a plus l'usage.
- Archive : `docs/archives/` (voir `docs/archives/README.md`), ~0,5 Mo, copies seules.

Fusionné = `git merge-base --is-ancestor <HEAD> main`. « Modifs » = lignes de `git status --short`. `node_modules` : état et cible, d'après `(Get-Item …).LinkType/.Target`.

## Points qui demandent une décision du MJ

1. **`gpt/phase-f0b`** (10 commits, 835 Mo) : audit F0b (sourcer les pages des 26 livres, 80 paquets de décision, tests `audit-f0b-*`, outils `tools/audit/`). Pas fusionné. Les 117 fichiers « modifiés » n'ont aucun changement réel (fins de ligne). Garder la branche, ou abandonner l'audit ? Les fichiers lourds du worktree (JSON d'audit, sélecteurs HTML) ne sont pas archivés.
2. **`glm/inv-B0`** et **`glm/inv-D0a`** : un commit chacun, inventaires de docs (Courroux des dieux ; traditions magiques du livre de base) jamais passés dans `main`. Les intégrer, ou les abandonner ? Non archivés (ils peuvent citer le livre, à relire avant d'ouvrir le dépôt public).
3. **`glm/inv-C0`** : `.tmp-cb/` (11 Mo) et `.tmp-l06.txt` non suivis = extractions de livres, donc jetables, jamais archivables.
4. **`tmp/v5-diff-v2-v3`, `tmp/f1-reperage`, `tmp/recette-f2`** : proposés « garder » tant que la v3 n'est pas publiée (les sessions v3 lisent leurs textes bruts, `v2.txt`/`v3.txt`). Une fois la v3 publiée, supprimables : les analyses utiles sont déjà dans `docs/archives/`.
5. Les trois worktrees `v3-*` : fusionnés dans `main` par la 3.28.0 (`3367f5b`, 30/10 06:47), après la prise de l'inventaire ; supprimables comme les autres worktrees fusionnés (dossiers réels, pas de jonction). Le décompte « 43 sur 49 » ci-dessus date d'avant cette publication : 46 sur 49 en tenant compte de la 3.28.0.
6. `divin-v5` est la cible commune des jonctions `node_modules` de 20 worktrees, et il pointe lui-même vers `lot2-combat-v5`. Ne retirer ces deux-là qu'en dernier (voir la procédure).
7. Le brief mentionne `docs/archives/v5-diff-v2-v3/decisions/` : ce sous-dossier n'existe pas dans `tmp/v5-diff-v2-v3/` (rien à copier). Les décisions de la v3 sont dans `choix-v3.html` (archivé) et dans les briefs.

## 1. Worktrees et branches

Chaque ligne = un worktree et sa branche (ou HEAD détaché). Taille = `du -sh` du worktree (node_modules réels inclus, jonctions non suivies).

| Worktree | Branche | Taille | Fusionné | Modifs | node_modules | Proposition |
|---|---|---|---|---|---|---|
| `E:/Outil MJ Warhammer` | `main` | — | — | 4 non suivis (`docs/PASSATION_*` x3, `LIVRE_DE_BASE_V5_DIFF_V2_V3.md`) | dossier réel | **garder** (dépôt principal) |
| `~codex/divin-v5/Outil MJ Warhammer` | `codex/divin-v5` | 439M | oui | 0 | **jonction** → ~codex/lot2-combat-v5/Outil MJ Warhammer | garder, retirer en dernier — cible des jonctions de 20 worktrees ; même commit que main |
| `~codex/glm-bountiful` | `glm/bountiful` | 23M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `~codex/glm-crush` | `glm/crush` | 23M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `~codex/glm-fin` | `glm/fin-chantier` | 24M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `~codex/glm-heed` | `glm/heed` | 23M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `~codex/glm-inter` | `glm/inter` | 23M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `~codex/glm-inv-B0` | `glm/inv-B0` | 23M | **non** (1 commits) | 0 | absent | **à confirmer** — inventaire du Courroux (docs/divin/COURROUX_INVENTAIRE.md/.json, +897 lignes) absent de main |
| `~codex/glm-inv-C0` | `glm/inv-C0` | 35M | oui | 2 | absent | supprimer — intégré ; 2 éléments non suivis temporaires (.tmp-cb/ 11 Mo d extractions de livres, .tmp-l06.txt), jamais archivés (texte de livre) |
| `~codex/glm-inv-D0a` | `glm/inv-D0a` | 23M | **non** (1 commits) | 0 | absent | **à confirmer** — inventaire des traditions magiques (docs/lot3/LOT4_TRADITIONS_BASE.md/.json, +1331 lignes) absent de main |
| `~codex/glm-inv-D0b` | `glm/inv-D0b` | 23M | oui | 0 | absent | supprimer — travail intégré dans main |
| `~codex/glm-inv-E0` | `glm/inv-E0` | 23M | oui | 0 | absent | supprimer — travail intégré dans main |
| `~codex/glm-mischief` | `glm/mischief` | 23M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `~codex/glm-mischief2` | `glm/mischief2` | 23M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `~codex/glm-phase-a` | `glm/phase-a` | 24M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `~codex/glm-prot2` | `glm/prot2` | 23M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `~codex/glm-protection` | `glm/protection` | 23M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `~codex/glm-r25` | `glm/r25` | 23M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `~codex/glm-review` | `glm/review` | 23M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `~codex/glm-sauv-spell` | `glm/sauv-spell` | 23M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `~codex/glm-uitest` | `glm/uitest` | 23M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `~codex/glm-wolf` | `glm/wolf` | 23M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `~codex/lot2-combat-v5/Outil MJ Warhammer` | `codex/lot2-talents-v5` | 145M | oui | 0 | dossier réel | garder, retirer en dernier — porte le vrai node_modules visé par divin-v5 |
| `~codex/sonnet-souffle` | `sonnet/souffle` | 23M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `tmp/coherence-outil` | HEAD détaché 738b553 | 42M | oui | 0 | absent | supprimer — travail intégré dans main |
| `tmp/gemini-lot2-worktree` | `gemini/lot2` | 25M | oui | 0 | absent | supprimer — travail intégré dans main |
| `tmp/gemini-petites-taches-worktree` | `gemini/petites-taches` | 43M | oui | 0 | absent | supprimer — travail intégré dans main |
| `tmp/gemini-phase-c-worktree` | `gemini/phase-c` | 47M | oui | 0 | **jonction** → node_modules | supprimer — intégré ; node_modules = jonction vers le dépôt principal |
| `tmp/gpt-especes-worktree` | `gpt/especes` | 61M | oui | 0 | dossier réel | supprimer — travail intégré dans main |
| `tmp/gpt-phase-a-worktree` | `gpt/phase-a` | 62M | oui | 0 | **jonction** → node_modules | supprimer — intégré ; node_modules = jonction vers le dépôt principal |
| `tmp/gpt-phase-b-worktree` | `gpt/phase-b` | 74M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `tmp/gpt-phase-b2-worktree` | `gpt/phase-b2` | 79M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `tmp/gpt-phase-b4-worktree` | `gpt/phase-b4` | 94M | oui | 0 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — travail intégré dans main |
| `tmp/gpt-phase-f-worktree` | `gpt/phase-f` | 1.4G | oui | 2 | **jonction** → ~codex/divin-v5/Outil MJ Warhammer | supprimer — intégré ; 2 docs non suivis copiés dans docs/archives/gpt-phase-f/ |
| `tmp/gpt-phase-f0b-worktree` | `gpt/phase-f0b` | 835M | **non** (10 commits) | 117 | dossier réel | **à confirmer** — audit F0b (10 commits : sources des 26 livres, 80 paquets, tests audit-f0b-*) ; les 117 fichiers modifiés ne sont que du bruit de fins de ligne (diff vide avec --ignore-space-at-eol) |
| `tmp/gpt-phase-f2-worktree` | `gpt/phase-f2` | 180M | oui | 1 | dossier réel | supprimer — intégré ; 1 doc non suivi copié dans docs/archives/gpt-phase-f2/ ; ses node_modules servent à E:/tmp-f-check |
| `tmp/phase-r-worktree` | `claude/phase-r` | 62M | oui | 0 | dossier réel | **garder** — worktree de ce lot (phase R) |
| `tmp/pro-branchement-worktree` | `pro/branchement` | 61M | oui | 0 | dossier réel | supprimer — travail intégré dans main |
| `tmp/pro-correctifs-worktree` | `pro/correctifs-22-10` | 110M | oui | 0 | dossier réel | supprimer — travail intégré dans main |
| `tmp/pro-phase-b5-worktree` | `pro/phase-b5` | 107M | oui | 0 | dossier réel | supprimer — travail intégré dans main |
| `tmp/pro-phase-c2-worktree` | `pro/phase-c2` | 85M | oui | 0 | dossier réel | supprimer — travail intégré dans main |
| `tmp/pro-phase-d` | `pro/phase-d` | 114M | oui | 0 | absent | supprimer — travail intégré dans main |
| `tmp/pro-phase-e-worktree` | `pro/phase-e` | 168M | oui | 0 | dossier réel | supprimer — travail intégré dans main |
| `tmp/pro-qualite-e-worktree` | `pro/qualite-e` | 151M | oui | 0 | dossier réel | supprimer — travail intégré dans main |
| `tmp/recette-f2-worktree` | HEAD détaché 3437efa | 43M | oui | 0 | absent | supprimer — travail intégré dans main |
| `tmp/v3-a-worktree` | `claude/v3-a` | 127M | oui (3.28.0) | 0 | dossier réel | **supprimer** — fusionné par la 3.28.0 |
| `tmp/v3-b-worktree` | `claude/v3-b` | 127M | oui (3.28.0) | 0 | dossier réel | **supprimer** — fusionné par la 3.28.0 |
| `tmp/v3-c-worktree` | `claude/v3-c` | 63M | oui (3.28.0) | 0 | dossier réel | **supprimer** — fusionné par la 3.28.0 |
| `tmp/verif-qualite` | HEAD détaché 064f4d7 | 65M | oui | 0 | dossier réel | supprimer — travail intégré dans main |
| `E:/tmp-f-check` | HEAD détaché 00d98bb | 43M | oui | 0 | **jonction** → tmp/gpt-phase-f2-worktree | supprimer — travail intégré dans main |

Modifications non commitées (à signaler) : `gpt-phase-f0b` 117 lignes (fins de ligne seules), `glm-inv-C0` 2 (extractions de livres temporaires), `gpt-phase-f` 2 et `gpt-phase-f2` 1 (docs de passation, copiés dans `docs/archives/`). Tous les autres : 0.

Travail non fusionné pouvant avoir de la valeur :

(Les trois lignes `claude/v3-*` ci-dessous datent d'avant la 3.28.0 : elles sont désormais fusionnées.)

| Branche | Commits | Résumé |
|---|---|---|
| `claude/v3-a` | 6 | v3 : catalogue de référence régénéré, tables de ratés, prières, bestiaire, mètres, Seigneur-mage |
| `claude/v3-b` | 3 | v3 : règles de combat et de créatures du livre de base v3 (+ corrections de relecture) |
| `claude/v3-c` | 10 | fusion de v3-a et v3-b, plus Diction instinctive, Souffle, Faux de Shyish, 16 cellules en mètres |
| `gpt/phase-f0b` | 10 | audit F0b : pages sources des 26 livres, 80 paquets, relecture de 120 conversions, tests |
| `glm/inv-B0` | 1 | inventaire du Courroux des dieux |
| `glm/inv-D0a` | 1 | inventaire des traditions magiques absentes du catalogue |

## 2. Dossiers `*-runtime` (`E:/Outil MJ Warhammer/tmp/`)

Profils de navigateur et sorties de tests : aucun intérêt une fois la branche fusionnée. Tous : **supprimer** (≈ 53 Mo).

| Dossier | Taille | Contenu |
|---|---|---|
| `cv-k2-runtime`, `gemini-phase-c-runtime`, `gpt-phase-b-runtime`, `gpt-phase-b2-runtime`, `gpt-phase-b4-runtime`, `gpt-phase-f0b-runtime` | 0 à 4 Ko | vides |
| `gpt-phase-f-runtime`, `pro-correctifs-runtime` | 8 Ko, 20 Ko | résidus |
| `gpt-especes-runtime` | 6,6 Mo | 547 fichiers de test |
| `gpt-phase-f2-runtime` | 31 Mo | 437 fichiers de test |
| `pro-branchement-runtime`, `pro-phase-b5-runtime`, `pro-phase-c2-runtime`, `pro-phase-e-runtime`, `pro-qualite-e-runtime` | 3,0 / 2,9 / 3,3 / 3,5 / 1,8 Mo | sorties de tests |
| `verif-claude-runtime` | 526 Ko | `full.log` de test |

## 3. Logs (`tmp/*.log`, 10 fichiers, 5,5 Mo)

`cv-especes-suite.log`, `cv-t2-suite.log`, `cv-t2bis-suite.log`, `cv-t2bis-suite-claude.log`, `cv-t3-suite.log`, `cv-t3-suite-claude.log`, `f2-reprise-t4-suite.log`, `f2-reprise-t4-suite-2.log`, `f2-t4-f-suite.log` (≈ 550 Ko chacun) : sorties de la suite de tests lors des contre-vérifications, reproductibles en relançant les tests. **Supprimer.** Les rapports qui en tirent les conclusions sont archivés.

## 4. Images (`tmp/*.png`, 17 fichiers, 21 Mo)

`f2-g-p318`, `f2-k-page-187/188/189`, `grapple-l06-p167-167`, `grapple-l06-p186-186`, `j1-pdf-171`, `j1-pdf-172`, `j1-pdf170`, `review-g-318`, `review-k-187/188/189`, `review-l06-168`, `review-l06-170`, `review-l13-108`, `review-v5-168` (1 à 2 Mo chacune) : pages de livres rendues pour des vérifications. Droits d'auteur, donc **jamais archivées** ; **supprimer** (régénérables depuis les PDF).

## 5. Scripts (`tmp/*.mjs|py|ps1`, 21 Ko)

| Fichier | Rôle | Proposition |
|---|---|---|
| `compare-v2-v3.mjs`, `detailed-diff.mjs`, `generate-diff-report.mjs`, `create-md-report.mjs`, `extract_pdf.py` | outils jetables du diff v2/v3 | supprimer (le résultat est dans `docs/archives/`) |
| `suivi-pro.ps1` | onglet de suivi des agents headless | garder si encore utilisé, sinon supprimer |

## 6. Autres dossiers de `tmp/`

| Dossier | Taille | Contenu utile | Proposition |
|---|---|---|---|
| `f1-reperage` | 4,2 Mo | arbitrages 25/10, plan des lots F2, exclusions ; plus `reperage-f1.json`, `index.html` (1,4 Mo chacun, extraits de livres), journaux et candidats JSON | archiver 3 fichiers (`ARBITRAGES_25_10.md`, `PLAN_F2_LOTS.md`, `blocs-exclusions-25-10.json`) ; **garder** le dossier tant que la v3 n'est pas publiée |
| `v5-diff-v2-v3` | 6,0 Mo | analyses, briefs, feuille (changements, journal, yards), `choix-v3.html` ; plus `v2.txt`, `v3.txt`, `DIFF_MOTS.txt`, `n23.txt`, 6 png (texte de livre) | archiver (hors textes de livre) ; **garder** jusqu'à la publication de la v3 |
| `diff-v2-v3` | 5,3 Mo | `initial_summary_full.md` (archivé) ; `RAPPORT_DIFFERENCES_COMPLET.md` (309 Ko), `VERIFICATION_*`, `v2_full.txt`/`v3_full.txt` citent le livre en masse ; ~40 petits scripts Python | supprimer après la v3 (non archivé : texte de livre) |
| `divin` | 6 Ko | 3 petits scripts `.mjs` | supprimer |
| `gpt-phase-f2` | 12 Ko | 3 notes de raccords F2-D | archivé, puis supprimer |
| `recette-f2` | 548 Ko | `RECETTE_F2.md`, brief, 9 fixtures JSON | 2 `.md` archivés ; garder les fixtures tant que la recette F2 sert, sinon supprimer |
| `gemini-verifs` | 3,9 Mo | briefs, rapports de cohérence, écarts ; `coherence/` : copies CSV de la feuille, scripts, JSON, `l06-p302.png` (2,3 Mo) | `.md` archivés ; supprimer le reste |
| `gpt-especes` | 1,2 Mo | brief et rapport du lot espèces ; 2 logs de 570 Ko | 2 `.md` archivés ; supprimer le reste |
| `csv-armes-v5` | 88 Ko | `CHANGEMENTS_FEUILLE_ARMES_V5.md` ; 4 CSV (copies de la feuille) | `.md` archivé ; la feuille reste la source, supprimer les CSV |
| `lot3-integration` | 688 Ko | `LOT3_RAPPORT_INTEGRATION.md` (déjà identique dans `docs/lot3/`, non recopié), tests, journaux | supprimer |
| `lot4-source` | 2,5 Mo | scripts et sorties de navigateur du lot 4 | supprimer |
| `lot5a-source` | 14 Mo | scripts et sorties du lot 5a | supprimer |
| `cv-t2-pdf-de` | 18 Mo | extractions de livres (`l06.txt`, `l09.txt`, `l11.txt`, `l13.txt`) et pages png | supprimer (texte de livre) |
| `cv-t3-pdf`, `cv-t3-pdf-k2` | 5,6 / 40 Mo | extractions de livres et pages png | supprimer (texte de livre) |
| `cv-t2bis-claude`, `cv-t2bis-claude-ni`, `cv-t2bis-repro-de`, `cv-t2bis-repro-ni`, `cv-t3-repro-lg`, `cv-t3-repro-mk` | 26 Ko, 68 Ko, 99 Ko, 68 Ko, 9,6 Mo, 42 Mo | scripts de reproduction des contre-vérifications ; `cv-t3-repro-mk` contient une copie complète de l'outil (`base/`) | supprimer (conclusions dans les rapports archivés) |
| `verif-claude-scratch` | 751 Ko | sondes `probe*.mjs`, `full.log`, JSON avant/après | supprimer |
| `verif-b12` | 4 Ko | vide | supprimer |
| `f2-test-temp`, `f2l-temp`, `gpt-test-temp` | 1,2 Mo / 1,2 Mo / 8 Ko | temporaires de tests | supprimer |
| `npm-cache-f2` | 4,0 Mo | cache npm | supprimer |
| `phase-r` | 632 Ko | briefs R1/R2 (archivés), `compare-coverage.mjs`, `coverage-3.27.0.txt` | **garder** (phase R en cours) |

Les entrées `*-worktree`, `coherence-outil`, `pro-phase-d`, `verif-qualite`, `recette-f2-worktree` sont décrites au § 1.

## 7. Jonctions `node_modules` et procédure sûre de retrait

État (colonne « node_modules » du § 1) :

- **20 worktrees** ont une jonction vers `~codex/divin-v5/Outil MJ Warhammer/node_modules` : 16 `glm-*`/`sonnet-souffle` et `gpt-phase-b`, `b2`, `b4`, `f`.
- `divin-v5` a lui-même une jonction vers `~codex/lot2-combat-v5/Outil MJ Warhammer/node_modules` (dossier réel, 145 Mo).
- `gemini-phase-c-worktree` et `gpt-phase-a-worktree` pointent vers `E:/Outil MJ Warhammer/node_modules` (**dépôt principal**).
- `E:/tmp-f-check` pointe vers `tmp/gpt-phase-f2-worktree/node_modules`.
- Sans `node_modules` : `glm-inv-*`, `coherence-outil`, `gemini-lot2`, `gemini-petites-taches`, `pro-phase-d`, `recette-f2`, `verif-qualite`. Dossiers réels : `lot2-combat-v5`, `gpt-especes`, `gpt-phase-f0b`, `gpt-phase-f2`, `phase-r`, `pro-*` (sauf `pro-phase-d`), `v3-*`.

**Incident du 29/10** : `git worktree remove --force` sur un worktree dont `node_modules` était une jonction a vidé le `node_modules` du dépôt principal.

Règles :

1. Pour chaque worktree : `cmd /c rmdir "<wt>\node_modules"` (sans `/s`) **avant** `git worktree remove`, seulement si c'est une jonction.
2. Puis `git worktree remove "<wt>"` (`--force` seulement pour les 4 worktrees avec éléments non suivis, une fois leurs docs archivés), puis `git worktree prune`, puis `git branch -d` (jamais `-D` sur une branche non fusionnée sans accord du MJ).
3. Ordre : d'abord les worktrees à jonction ; `E:/tmp-f-check` avant `gpt-phase-f2-worktree` ; `divin-v5` puis `lot2-combat-v5` en tout dernier.
4. Exécuter depuis `E:\Outil MJ Warhammer` sur `main`, en PowerShell.

### Commandes : sans risque (fusionné)

```powershell
cd "E:\Outil MJ Warhammer"
function Remove-Wt([string]$p, [string]$branch, [switch]$force) {
  $nm = Join-Path $p 'node_modules'
  $i = Get-Item $nm -Force -ErrorAction SilentlyContinue
  if ($i -and $i.LinkType) { cmd /c rmdir "$nm" }          # jonction seule, sans /s
  if ($force) { git worktree remove --force $p } else { git worktree remove $p }
  if ($branch) { git branch -d $branch }                   # refuse si non fusionné
}

# 1) worktrees ~codex
$c = 'C:\Users\arnot\.codex\worktrees'
Remove-Wt "$c\glm-bountiful" 'glm/bountiful'
Remove-Wt "$c\glm-crush" 'glm/crush'
Remove-Wt "$c\glm-fin" 'glm/fin-chantier'
Remove-Wt "$c\glm-heed" 'glm/heed'
Remove-Wt "$c\glm-inter" 'glm/inter'
Remove-Wt "$c\glm-mischief" 'glm/mischief'
Remove-Wt "$c\glm-mischief2" 'glm/mischief2'
Remove-Wt "$c\glm-phase-a" 'glm/phase-a'
Remove-Wt "$c\glm-prot2" 'glm/prot2'
Remove-Wt "$c\glm-protection" 'glm/protection'
Remove-Wt "$c\glm-r25" 'glm/r25'
Remove-Wt "$c\glm-review" 'glm/review'
Remove-Wt "$c\glm-sauv-spell" 'glm/sauv-spell'
Remove-Wt "$c\glm-uitest" 'glm/uitest'
Remove-Wt "$c\glm-wolf" 'glm/wolf'
Remove-Wt "$c\sonnet-souffle" 'sonnet/souffle'
Remove-Wt "$c\glm-inv-D0b" 'glm/inv-D0b'
Remove-Wt "$c\glm-inv-E0" 'glm/inv-E0'
Remove-Wt "$c\glm-inv-C0" 'glm/inv-C0' -force   # 2 éléments temporaires non suivis (extractions de livres)

# 2) worktrees de tmp
$t = 'E:\Outil MJ Warhammer\tmp'
Remove-Wt "$t\gemini-phase-c-worktree" 'gemini/phase-c'   # jonction vers le dépôt principal
Remove-Wt "$t\gpt-phase-a-worktree" 'gpt/phase-a'         # idem
Remove-Wt "$t\gpt-phase-b-worktree" 'gpt/phase-b'
Remove-Wt "$t\gpt-phase-b2-worktree" 'gpt/phase-b2'
Remove-Wt "$t\gpt-phase-b4-worktree" 'gpt/phase-b4'
Remove-Wt "$t\gpt-phase-f-worktree" 'gpt/phase-f' -force  # 2 docs non suivis déjà archivés
Remove-Wt 'E:\tmp-f-check' $null                          # avant gpt-phase-f2
Remove-Wt "$t\gpt-phase-f2-worktree" 'gpt/phase-f2' -force # 1 doc non suivi déjà archivé
Remove-Wt "$t\gpt-especes-worktree" 'gpt/especes'
Remove-Wt "$t\gemini-lot2-worktree" 'gemini/lot2'
Remove-Wt "$t\gemini-petites-taches-worktree" 'gemini/petites-taches'
Remove-Wt "$t\coherence-outil" $null
Remove-Wt "$t\recette-f2-worktree" $null
Remove-Wt "$t\verif-qualite" $null
Remove-Wt "$t\pro-branchement-worktree" 'pro/branchement'
Remove-Wt "$t\pro-correctifs-worktree" 'pro/correctifs-22-10'
Remove-Wt "$t\pro-phase-b5-worktree" 'pro/phase-b5'
Remove-Wt "$t\pro-phase-c2-worktree" 'pro/phase-c2'
Remove-Wt "$t\pro-phase-d" 'pro/phase-d'
Remove-Wt "$t\pro-phase-e-worktree" 'pro/phase-e'
Remove-Wt "$t\pro-qualite-e-worktree" 'pro/qualite-e'
git worktree prune

# 3) en dernier (toutes les jonctions vers divin-v5 sont retirées)
Remove-Wt "$c\divin-v5\Outil MJ Warhammer" 'codex/divin-v5'
Remove-Wt "$c\lot2-combat-v5\Outil MJ Warhammer" 'codex/lot2-talents-v5'
git worktree prune

# 4) dossiers et fichiers de tmp (après relecture du § 6) : *-runtime, *.log, *.png, scripts,
#    cv-*, lot4-source, lot5a-source, lot3-integration, etc. Un par un, avec
#    Remove-Item -Recurse <chemin> ; aucun n'est une jonction (vérifier : Get-ChildItem -Force | ? LinkType).
```

Si un `git branch -d` refuse (« not fully merged »), ne pas insister : la branche contient du travail non intégré.

### Commandes : à confirmer (non fusionné)

Seulement sur accord du MJ (points 1 et 2 du début). `-D` supprime définitivement des commits non fusionnés.

```powershell
# glm/inv-B0, glm/inv-D0a : inventaires jamais intégrés
Remove-Wt "$c\glm-inv-B0" $null
Remove-Wt "$c\glm-inv-D0a" $null
git branch -D glm/inv-B0 glm/inv-D0a

# gpt/phase-f0b : audit F0b
Remove-Wt "$t\gpt-phase-f0b-worktree" $null -force   # 117 fichiers « modifiés » = fins de ligne seules
git branch -D gpt/phase-f0b

# claude/v3-a, v3-b, v3-c : fusionnées par la 3.28.0, même procédure que les worktrees fusionnés (dossiers réels)
```

## Décisions du MJ et exécution (30/10/2026, matin)

Décisions prises par sélecteur : retirer tous les worktrees fusionnés sauf `divin-v5` et `lot2-combat-v5` ; `gpt/phase-f0b` : branche gardée, worktree retiré ; `glm/inv-B0` et `glm/inv-D0a` abandonnées ; reste de `tmp/` supprimé sauf `phase-r` et `divin`, `E:/tmp-node` vidé après la phase R.

Exécuté :
- 22 jonctions `node_modules` retirées par `cmd /c rmdir` (sans `/s`) avant tout retrait ; `node_modules` de `lot2-combat-v5` (cible de `divin-v5`) et du dépôt principal vérifiés intacts avant et après.
- 46 worktrees retirés (`git worktree remove --force --force`, puis `git worktree prune`). Restent : dépôt principal, `divin-v5`, `lot2-combat-v5`, `tmp/phase-r-worktree`.
- Branches supprimées : toutes les fusionnées (`git branch -d`), plus `glm/inv-B0` et `glm/inv-D0a` (`-D`). Restent : `main`, `codex/divin-v5`, `codex/lot2-talents-v5`, `claude/phase-r`, `gpt/phase-f0b`.
- `tmp/` : 4,4 Go → 157 Mo. Gardés : `phase-r`, `phase-r-worktree`, `divin` (manifeste et reçus de recette), `suivi-pro.ps1` (outil de suivi des agents cité dans la mémoire).
- Non supprimés car verrouillés par un processus : `tmp/gpt-phase-f2-worktree` (dossier vide, répertoire courant d'un ancien shell) et quatre `hsperfdata_arnot` de JVM (émulateurs Firebase) dans `gpt-phase-b-runtime`, `gpt-phase-b2-runtime`, `gpt-phase-b4-runtime`, `gpt-test-temp`. À supprimer après un redémarrage.
