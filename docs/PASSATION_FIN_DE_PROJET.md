# Passation — plan de fin de projet (21 octobre 2026, 23 h 45)

## Message à copier dans la nouvelle fenêtre

```text
Reprends le plan de fin de projet de l'Outil MJ Warhammer. Lis d'abord docs/PASSATION_FIN_DE_PROJET.md
dans le worktree C:/Users/arnot/.codex/worktrees/divin-v5/Outil MJ Warhammer (branche codex/divin-v5),
puis docs/PLAN_FIN_DE_PROJET.md et docs/ARBITRAGES_MJ_21_10.md. Vérifie l'état des trois chantiers
Claude Pro en cours, intègre et publie ce qui est fini, et relance ce qui s'est arrêté.
```

## État

- **Production : 3.23.0** (22/10 matin, `main` = `codex/divin-v5`). Phases A, B, C terminées ; D terminée sauf D11 (familiers, code bloqué sur la phase E) ; E en cours ; F, G, H à faire. Choix des exécutants en cours de relecture par le MJ sur l’artifact « Arbitrages des exécutants » (claude.ai/artifact/A6bYrFDz3hkcpva2si4SHq, collection `decisions`) ; 7 décisions déjà consignées dans `docs/ARBITRAGES_MJ_21_10.md` (lot correctif B à faire).
- **Autonomie** (MJ, 20/10) : coder, contrôler, **publier sans feu vert** et enchaîner les phases ; arrêt seulement si les tokens ou un quota manquent. Les décisions de règle ouvertes restent posées au MJ **en sélecteurs**.
- Arbitrages faisant foi : `docs/ARBITRAGES_MJ_21_10.md` (puis `docs/divin/DIVIN_RESERVE_DECISIONS.md`). Règle maison : aucun ingrédient de magie ; V5 partout ; supplément le plus récent en cas de divergence.
- Registre des valeurs durables de personnage (pour la phase H, écriture en retour vers les fiches) : `docs/VARIABLES_PERSISTANTES_PJ.md`.

## Chantiers en cours (compte Claude Pro, Sonnet, mode complet, consoles masquées)

| Phase | Worktree / branche | Fait et publié | En cours / reste |
| --- | --- | --- | --- |
| B Courroux | `E:\Outil MJ Warhammer\tmp\pro-phase-b5-worktree`, `pro/phase-b5` | B00-B17 | B18 (en cours, non commité), clôture B19 |
| C Brisé | `E:\Outil MJ Warhammer\tmp\pro-phase-c2-worktree`, `pro/phase-c2` | C01-C06, **phase terminée** (3.22.0) | — (choix de l’exécutant à relire : `docs/plans-gpt/CHOIX_EXECUTANT_PHASE_C.md`) |
| E Bestiaires | `E:\Outil MJ Warhammer\tmp\pro-phase-e-worktree`, `pro/phase-e` (depuis 3.22.0) | — | démarrage le 22/10 à 4 h 05 : plan de lots (complément L19-L26), puis lots ; prompt `%LOCALAPPDATA%\Temp\pro-phase-e\prompt.md` |
| D Magie | `E:\Outil MJ Warhammer\tmp\pro-phase-d`, `pro/phase-d` | D1-D8 (socle, Magie naturelle + AOTE3, Sorcellerie, Démonologie, Nécromancie, Nurgle, Slaanesh) | Tzeentch D9 (en cours, non commité), puis lots suivants de `docs/plans-gpt/PLAN_PRO_PHASE_D.md` (orques, slann, elfes, Grande Gueule, compléments, conception des runes, familiers) |

- **Veilleur E** `%LOCALAPPDATA%\Temp\pro-watch-e.ps1` (22/10, relance E seul à chaque remise à zéro, tour suivant 9 h 05). Ancien veilleur `pro-watch.ps1` (masqué, journal `pro-watch.log`) : attend la fin des sessions, lit « resets Xam » dans le journal de chaque chantier, relance B, D et E (E sans `-Resume` au premier tour) à l’heure de remise à zéro + 5 min, espacés de 10 min, jusqu’à 4 tours ; journaux `%LOCALAPPDATA%\Temp\pro-phase-<b5|d|e>\run-w<tour>.log`, identifiant de session dans `session-id.txt`. Premier tour : 22/10, 4 h 05.
- Suite complète dans le checkout C: : la lancer **sans** `TEMP` sur E:, sinon « E2 indépendant — preuve hors checkout » échoue (chemin relatif C:→E: impossible).
- **Quota Pro** : trois chantiers parallèles le vident en ~20 min (fenêtre de 5 h). À l’arrêt (« You've hit your session limit · resets HH »), relancer après la remise à zéro avec `-Resume <id>` et un prompt court « continue » (`prompt-continue.md` du dossier) ; un lanceur `.ps1` démarré par `Start-Process powershell -WindowStyle Hidden` (sinon une fenêtre de terminal par commande). Voir le skill `deleguer-pro`, section « Mode complet ».
- Autres exécutants possibles avec les mêmes briefs : GPT (`docs/plans-gpt/`), Gemini (`docs/plans-gemini/`) ; GLM sans crédits Mistral (coût réel ≈ 1/7 du plafond affiché).

## Procédure d’intégration et de publication (à chaque retour)

1. Dans le worktree de l’exécutant : `git log`, `git status` propre, `git ls-files --eol | grep crlf` vide, suite complète avec `TEMP`/`TMP` sur E: (`node --test --test-concurrency=4` ; seul échec toléré dans un worktree neuf : « E0 indépendant — la recette refuse un cwd externe »). Supprimer toute copie de tests dans `tmp/`.
2. Relire le diff des fichiers partagés à risque (`resolution.js`, `store.js`, `v5-store-action.js`, moteurs de Tour, `v5-effects.js`) et les assertions de tests existantes modifiées.
3. Dans `codex/divin-v5` : `git fetch <worktree> <branche>` puis `git merge` (conflits fréquents sur `v5-effects.js`, `store.js`, le registre des variables : garder les deux apports), suite complète.
4. Version : `js/version.js`, `package.json`, `package-lock.json` (2 endroits), `sw.js` (CACHE_NAME), `index.html` (#btn-version), README (titre et ligne 3) ; recette `node tools/run-divine-recipe.mjs` verte (~10 min) ; commit ; `git push origin codex/divin-v5:main` et `git push origin codex/divin-v5` ; vérifier `gh run list` et `js/version.js` en ligne ; `git pull --ff-only` dans `E:/Outil MJ Warhammer` (réinitialiser d’abord les seuls écarts de fins de ligne).

## Reste à faire après B, C, D

- **Sélecteurs MJ** : choix d’exécutant à relire (`docs/plans-gpt/CHOIX_EXECUTANT_PHASE_C.md`, `_D.md`, et la suite de `_B.md`), propositions Gemini (`docs/plans-gemini/PROPOSITIONS_NOMS_TRAITS.md`, `PROPOSITIONS_CONVERSION_AOTE3.md`), magie skaven repérée par D (à arbitrer), conception des runes (`docs/plans-gpt/CONCEPTION_RUNES.md`, à valider avant code).
- **Phase E** (bestiaires) : `docs/plans-gpt/BRIEF_GPT_PHASE_E_BESTIAIRES.md`.
- **Phase F** (audit des 2694 pages avec sélecteur par règle, sans implantation automatique), **G** (recette à la table, parcours dans `docs/RECETTE_UTILISATEUR.md`), **H** (écriture en retour vers les fiches, après tout le reste).
- Orchestrateur (3.21.8) : panneau divin, appels `Store.getDivineSinEvents/Reminders` gardés `?.() || []` ; test e3-e4 : sélecteur `:scope > summary` (rappels imbriqués depuis B17). Un conflit léger est possible sur ces lignes à la fusion de B18.
- Suite complète dans le checkout C: : lancer **sans** `TEMP` sur E:, sinon « E2 indépendant — preuve hors checkout » échoue (chemin relatif C:→E:).
- Petit ménage : dossier verrouillé `E:\Outil MJ Warhammer\tmp\verif-b12` à supprimer.
