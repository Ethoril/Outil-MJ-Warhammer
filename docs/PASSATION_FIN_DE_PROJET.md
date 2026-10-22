# Passation — plan de fin de projet (22 octobre 2026, 9 h)

L’orchestration passe au **compte Claude Pro** (Claude Code avec la configuration `~/.claude-perso`) jusqu’à dimanche 25/10 : le compte Team de l’app est presque à court de quota.

## Message à copier dans la nouvelle fenêtre (compte Pro)

```text
Reprends le plan de fin de projet de l'Outil MJ Warhammer en orchestrateur. Lis d'abord
docs/PASSATION_FIN_DE_PROJET.md dans le worktree C:/Users/arnot/.codex/worktrees/divin-v5/Outil MJ Warhammer
(branche codex/divin-v5), puis docs/PLAN_FIN_DE_PROJET.md, docs/ARBITRAGES_MJ_21_10.md et
docs/DECISIONS_MJ_CHOIX_EXECUTANTS_22_10.md. Vérifie le chantier E, intègre et publie ce qui est fini,
puis enchaîne les étapes de la section « Suite ».
```

## État

- **Production : 3.24.0** (22/10, 16 h 30, `main` = `codex/divin-v5`). Phases A, B, C terminées ; D terminée sauf D11 (familiers, code bloqué sur les profils de la phase E) ; **E en cours** (publié : mots-clés K1-K5, profils de L06, L11, L01-L04, L07 ; reste à intégrer depuis le commit 5eb0d31 de `pro/phase-e`) ; F, G, H à faire.
- **Autonomie** (MJ, 20/10) : coder, contrôler, **publier sans feu vert** et enchaîner les phases ; arrêt seulement si les tokens ou un quota manquent. Les décisions de règle ouvertes sont posées au MJ **en sélecteurs** (page artifact à db, voir plus bas, ou questions à choix).
- Arbitrages faisant foi, dans l’ordre : `docs/ARBITRAGES_MJ_21_10.md`, `docs/DECISIONS_MJ_CHOIX_EXECUTANTS_22_10.md` (120 choix des exécutants B, C, D, runes, familiers, relus par le MJ le 22/10), puis `docs/divin/DIVIN_RESERVE_DECISIONS.md`. Règle maison : aucun ingrédient de magie ; V5 partout ; supplément le plus récent en cas de divergence.
- Registre des valeurs durables de personnage (phase H) : `docs/VARIABLES_PERSISTANTES_PJ.md`.

## Chantier en cours

| Phase | Worktree / branche | État |
| --- | --- | --- |
| E Bestiaires | `E:\Outil MJ Warhammer\tmp\pro-phase-e-worktree`, `pro/phase-e` (partie de 3.22.0) | 1re session 22/10 4 h 25-4 h 51 (quota) : outils d’extraction des profils commencés, rien de commité. Reprise automatique à 9 h 05. Le prompt de reprise ajoute le lot **mots-clés de participants** (avant l’import massif). Plan, choix et rapport attendus : `docs/plans-gpt/PLAN_PRO_PHASE_E.md`, `CHOIX_EXECUTANT_PHASE_E.md`, `RAPPORT_PRO_PHASE_E.md`. |

- Fichiers du chantier : `%LOCALAPPDATA%\Temp\pro-phase-e\` (`prompt.md`, `prompt-continue.md`, `session-id.txt`, journaux `run-w<n>.log`, `result.json`).
- **Veilleur** `%LOCALAPPDATA%\Temp\pro-watch-e.ps1` (masqué, journal `%LOCALAPPDATA%\Temp\pro-watch.log`) : un tour est en cours tant que son journal est vide ; à « You've hit your session limit · resets Xam », relance E avec `-Resume` à l’heure de remise à zéro + 5 min ; jusqu’au tour 8 ; s’arrête dès qu’un journal ne montre pas de limite (chantier fini ou erreur : lire le journal).
- Lancer un chantier : `run-claude-pro.ps1` du skill `deleguer-pro` (`~/.claude/skills/deleguer-pro/scripts/`), `-Workdir <worktree> -PromptFile <prompt> -OutDir <dossier> -Complet [-Resume <id>]`, depuis un lanceur `.ps1` démarré par `Start-Process powershell -WindowStyle Hidden` avec `TEMP`/`TMP` sur E: (modèles : `pro-watch-e.ps1`, `pro-phase-e\launch-w1.ps1`). Depuis le compte Pro lui-même, on peut aussi exécuter un lot directement dans le worktree.
- **Quota Pro** : un chantier seul tient ~25 min par fenêtre de 5 h ; plusieurs en parallèle se partagent la même fenêtre. Ne pas lancer deux sessions dans le même worktree.

## Suite (dans l’ordre)

1. **Intégrer E** au fil des lots commités (procédure ci-dessous), publier.
2. **Lot correctif des décisions du 22/10** : `docs/plans-gpt/BRIEF_PRO_CORRECTIFS_22_10.md` (K1 Courroux, K2 Brisé, K3 magie, K4 deux questions à reposer au MJ, mise à jour des conceptions runes et familiers). Nouveau worktree depuis `main` (`git worktree add -b pro/correctifs-22-10 "E:/Outil MJ Warhammer/tmp/pro-correctifs-worktree" codex/divin-v5`, `core.autocrlf false`, `core.eol lf`, `npm ci`, `mkdir tmp/divin`). Il touche les fichiers divins, de courage et de magie, pas ceux de E : peut tourner en même temps que E.
3. **Runes** (conception validée par le MJ, puis code) et **familiers D11** (après les profils de E).
4. **Phase F** (audit des 2694 pages, page de sélecteurs par règle, sans implantation automatique), **G** (recette à la table, `docs/RECETTE_UTILISATEUR.md`), **H** (écriture en retour vers les fiches).
5. **Rappel à faire au MJ (phase H)** : exploiter le référentiel de mots-clés de la phase E dans le projet des fiches ennemi-interieur-wfrp4 (voir `docs/PLAN_FIN_DE_PROJET.md`, phase H).
6. Sélecteurs encore ouverts : propositions Gemini (`docs/plans-gemini/PROPOSITIONS_NOMS_TRAITS.md`, `PROPOSITIONS_CONVERSION_AOTE3.md`), magie skaven repérée par D, livres absents du corpus (réponse du MJ attendue).

## Procédure d’intégration et de publication (à chaque retour)

1. Dans le worktree de l’exécutant : `git log`, `git status` propre, `git ls-files --eol | grep crlf` vide. Supprimer toute copie de tests dans `tmp/`.
2. Relire le diff des fichiers partagés à risque (`resolution.js`, `store.js`, `v5-store-action.js`, moteurs de Tour, `v5-effects.js`, `v5-spell-contracts.js`, `v5-divine-panel.js`) et **toute assertion de test existante modifiée** (acceptable seulement si elle épingle un décompte ou un statut que le lot change légitimement).
3. Dans `codex/divin-v5` (`C:/Users/arnot/.codex/worktrees/divin-v5/Outil MJ Warhammer`) : `git fetch "<worktree>" <branche>:refs/remotes/pro/<nom>` puis `git merge` (conflits fréquents sur `v5-effects.js`, `store.js`, `v5-divine-panel.js`, le registre des variables, les tests navigateur : garder les deux apports). Suite complète `node --test --test-concurrency=4` **sans** `TEMP` sur E: (sinon « E2 indépendant — preuve hors checkout » échoue : chemin relatif C:→E: impossible).
4. **Recette** `node tools/run-divine-recipe.mjs` (~10 min) : obligatoire, elle attrape ce que la suite node ne voit pas (tests navigateur : store factice incomplet, sélecteurs devenus ambigus). En cas d’échec : journal `tmp/divin/final-<étape>.log`.
5. Version : `js/version.js`, `package.json`, `package-lock.json` (2 endroits), `sw.js` (CACHE_NAME), `index.html` (#btn-version), README (titre et ligne 3) ; commit (fichiers en LF ; Python sous Windows écrit du CRLF sans `newline=''`) ; `git push origin codex/divin-v5:main` et `git push origin codex/divin-v5` ; vérifier `https://ethoril.github.io/Outil-MJ-Warhammer/js/version.js` ; `git pull --ff-only` dans `E:/Outil MJ Warhammer`.

## Sélecteurs pour le MJ

- Modèle : page artifact « Arbitrages des exécutants » (claude.ai/artifact/A6bYrFDz3hkcpva2si4SHq) : liste JSON embarquée (id, phase, lot, source, question, choix, alternatives), une décision par document dans la collection `decisions` (`verdict` valider / altN / autre, `note`). Gabarit : `docs/plans-gpt/GABARIT_PAGE_SELECTEURS.html` (remplacer `__DATA__` par le JSON, `<` échappé en `003c`), capability `{db:{}}` ; une nouvelle page par série de questions.
- Le MJ répond en mots de joueur : jamais d’identifiant de code ni de jargon interne (« couche », « contrat ») dans les questions.

## Petit ménage

- Dossier verrouillé `E:\Outil MJ Warhammer\tmp\verif-b12` à supprimer. Worktrees finis : `pro-phase-b5-worktree`, `pro-phase-c2-worktree`, `pro-phase-d` (branches fusionnées), anciens `gpt-*`, `gemini-*`.
