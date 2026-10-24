# Passation — plan de fin de projet (mise à jour le 24 octobre 2026, 21 h)

L’orchestration passe au **compte Claude Pro** (Claude Code avec la configuration `~/.claude-perso`) jusqu’à dimanche 25/10 : le compte Team de l’app est presque à court de quota.

## Message à copier dans la nouvelle fenêtre (compte Pro)

```text
Reprends le plan de fin de projet de l'Outil MJ Warhammer en orchestrateur. Lis d'abord
docs/PASSATION_FIN_DE_PROJET.md dans le worktree C:/Users/arnot/.codex/worktrees/divin-v5/Outil MJ Warhammer
(branche codex/divin-v5), puis docs/PLAN_FIN_DE_PROJET.md, docs/ARBITRAGES_MJ_21_10.md et
docs/DECISIONS_MJ_CHOIX_EXECUTANTS_22_10.md. Vérifie le chantier E, intègre et publie ce qui est fini,
puis enchaîne les étapes de la section « Suite ».
```

## Point du 24/10, 22 h 20 — où reprendre

- `pro/branchement` : B0-B10 commités (dont B4c et B8c, corrections des contre-vérifications de B0-B2 et B3-B6). Quota Pro épuisé, reprise automatique à 2 h 05.
- Restent B10b (Destin et Résilience importés des fiches, réponse du MJ), B11, B12 (compteur de surnombre, réponse du MJ), puis R. Briefs des lots correctifs : `tmp/correctif-*.md` du worktree, appelés par `prompt-lot.md`.
- Le veilleur (`pro-watch-branchement.ps1`, relancé via WMI le 24/10 à 21 h 12) choisit le modèle par lot : Opus pour B4 et B10, Sonnet ailleurs ; il adopte un tour en cours à son redémarrage.
- Avant publication de 3.26.0 : contre-vérification de B7 à R, puis contre-vérification large ; monter la version de cache de `sw.js`.

## Point du 24/10, 21 h

- **Chantier en cours** : branchement des Traits de créature et des familiers (décisions du MJ du 22/10). Plan `docs/plans-gpt/PLAN_PRO_BRANCHEMENT.md` (B0 à B11, R), rapport `RAPPORT_PRO_BRANCHEMENT.md`, choix `CHOIX_EXECUTANT_BRANCHEMENT.md`, dans le worktree `E:/Outil MJ Warhammer/tmp/pro-branchement-worktree`, branche `pro/branchement` (partie de `codex/divin-v5` à `d0c81fe`). Faits au 24/10 : B0, B1, B2 ; reprise automatique à 21 h 05.
- **Veilleur** : `%LOCALAPPDATA%\Temp\pro-watch-branchement.ps1`, journal `pro-watch.log`, **toujours lancé via WMI** (`Invoke-CimMethod -ClassName Win32_Process -MethodName Create`), sinon un redémarrage de l'app le tue. Il est déjà mort une fois sans cause connue (24/10, entre 7 h et 11 h) : surveiller le **processus**, pas seulement le journal (Monitor : `tail -F` du journal + contrôle du processus toutes les 5 min). Onglet de suivi pour le MJ : `tmp/suivi-pro.ps1`.
- **Questions bloquantes** : à poser au MJ **dès** qu'un lot s'arrête sur BLOCKED.
- **Contre-vérification** obligatoire avant toute publication (vérificateurs Sonnet indépendants, lecture seule, sur un arbre figé `E:/Outil MJ Warhammer/tmp/verif-qualite` détaché au commit voulu) ; ciblée tous les 3-4 lots, large avant publication. **Quota partagé** entre l'orchestrateur, ses vérificateurs et l'exécutant Pro : doser.
- **GPT** : lot F0b (`docs/plans-gpt/BRIEF_GPT_PHASE_F0B_SELECTEURS.md`) commencé par le MJ, en cours (GPT à court de tokens) ; à contre-vérifier et intégrer à son retour.
- Ensuite : intégrer `pro/branchement` (procédure ci-dessous), publier 3.26.0 ; puis runes, F1 (questions au MJ par paquets, après F0b), G, H.

## Point du 24/10, 17 h 45

- **Production 3.25.0** (`main` = `codex/divin-v5` = 88536d8) : phase E (926 profils de 23 livres, bibliothèque accessible depuis l'onglet Bibliothèque), lot correctif du 22/10, audit F0 de GPT (registre `docs/AUDIT_REGLES.json`, 7 019 règles, 5 337 sélecteurs **non encore posés**), lot qualité en six passes (`docs/plans-gpt/PLAN_PRO_QUALITE_E.md`, rapport `RAPPORT_PRO_QUALITE_E.md`), chacune contre-vérifiée.
- Décisions du MJ des 23-24/10 (attaques naturelles : formule V5 + Taille pour les livres V4, chiffre imprimé gardé pour les livres V5 L06, L09, L10 ; multiplicateurs = attaques gratuites ; Maître à bord ajouté à la feuille Drive) : consignées dans `CHOIX_EXECUTANT_QUALITE_E.md`.
- Suite : brief GPT F0b (`docs/plans-gpt/BRIEF_GPT_PHASE_F0B_SELECTEURS.md`, regrouper et nettoyer les sélecteurs) à lancer par le MJ ; chantier « brancher les Traits non appelés + familiers selon les décisions du 22/10 » ; puis runes, F1 (questions au MJ par paquets), G, H.
- Quota : l'orchestrateur, ses vérificateurs et l'exécutant Pro partagent le même quota ; doser les contre-vérifications (une ciblée par petite passe, large avant publication).

## Point du 23/10, 8 h 15 (compte Team)

- Phase E (24 lots) et lot correctif du 22/10 **fusionnés dans `codex/divin-v5`** (`9c12613`), recette verte, **non publiés** : la contre-vérification indépendante (deux vérificateurs Sonnet) a trouvé des profils incomplets (talents, compétences, équipement perdus à l'extraction ; 12 profils L14 vides ; armure fausse sur 29 profils), des écarts de règle (Langue, Souffle, Nuée, Bestial, Dressé, D-C32 seulement en texte) et beaucoup de code annoncé « branché » sans appelant (Traits T2-T12, Slann, moitié des familiers).
- **Lot qualité** en cours : `docs/plans-gpt/PLAN_PRO_QUALITE_E.md` (Q0-Q10, R), worktree `E:/Outil MJ Warhammer/tmp/pro-qualite-e-worktree`, branche `pro/qualite-e`, veilleur `%LOCALAPPDATA%\Temp\pro-watch-qualite.ps1` **lancé via WMI** (`Invoke-CimMethod Win32_Process Create`) : un veilleur lancé depuis l'app meurt quand l'app redémarre (incident du 23/10, 0 h 22).
- **Règle du MJ (23/10)** : contre-vérification indépendante (code + règles/PDF) avant toute publication, et après chaque correction.
- Ensuite : contre-vérifier le lot qualité, intégrer, recette, publier 3.25.0 ; puis chantier « brancher les Traits non appelés + familiers selon les décisions du 22/10 ».
- Dérive connue : `tools/check-lot3-generation.mjs` régénère une matrice qui classe 4 sorts de zone en « Rappel » dès la base 3.24.0 (la matrice committée est la référence des tests) ; à traiter à part.

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
- **Veilleur par lots** (22/10, 16 h 55) `%LOCALAPPDATA%\Temp\pro-watch-lots.ps1`, journal `pro-watch.log` : **une session neuve par lot** (prompt `prompt-lot.md`, sans `-Resume`) pour deux chantiers en parallèle, E (`pro-phase-e`) et le lot correctif (`pro-correctifs`, worktree `E:\Outil MJ Warhammer	mp\pro-correctifs-worktree`, branche `pro/correctifs-22-10`). Relance aussitôt après « LOT TERMINÉ », à la remise à zéro + 5 min après une limite de quota, s'arrête sur « PHASE TERMINÉE », « BLOCKED » ou 3 fins anormales. Raison : reprendre toujours la même conversation faisait relire ~130 000 tokens de contexte à chaque appel d'outil (223 M tokens relus pour une session de 13 min), le quota partait en relecture.
- Lancer un chantier : `run-claude-pro.ps1` du skill `deleguer-pro` (`~/.claude/skills/deleguer-pro/scripts/`), `-Workdir <worktree> -PromptFile <prompt> -OutDir <dossier> -Complet [-Resume <id>]`, depuis un lanceur `.ps1` démarré par `Start-Process powershell -WindowStyle Hidden` avec `TEMP`/`TMP` sur E: (modèles : `pro-watch-e.ps1`, `pro-phase-e\launch-w1.ps1`). Depuis le compte Pro lui-même, on peut aussi exécuter un lot directement dans le worktree.
- **Quota Pro** : un chantier seul tient ~25 min par fenêtre de 5 h ; plusieurs en parallèle se partagent la même fenêtre. Ne pas lancer deux sessions dans le même worktree.

## Suite (dans l’ordre)

1. **Intégrer E** au fil des lots commités (procédure ci-dessous), publier.
2. **Lot correctif des décisions du 22/10** (lancé par le veilleur par lots, à intégrer) : `docs/plans-gpt/BRIEF_PRO_CORRECTIFS_22_10.md` (K1 Courroux, K2 Brisé, K3 magie, K4 deux questions à reposer au MJ, mise à jour des conceptions runes et familiers). Nouveau worktree depuis `main` (`git worktree add -b pro/correctifs-22-10 "E:/Outil MJ Warhammer/tmp/pro-correctifs-worktree" codex/divin-v5`, `core.autocrlf false`, `core.eol lf`, `npm ci`, `mkdir tmp/divin`). Il touche les fichiers divins, de courage et de magie, pas ceux de E : peut tourner en même temps que E.
3. **Runes** (conception validée par le MJ, puis code) et **familiers D11** (après les profils de E).
4. **Phase F** (F0 confiée à GPT le 22/10 : `docs/plans-gpt/BRIEF_GPT_PHASE_F_AUDIT.md`, branche `gpt/phase-f`, à intégrer comme les autres ; puis sélecteurs ; audit des 2694 pages, page de sélecteurs par règle, sans implantation automatique), **G** (recette à la table, `docs/RECETTE_UTILISATEUR.md`), **H** (écriture en retour vers les fiches).
5. **Rappel à faire au MJ (phase H)** : exploiter le référentiel de mots-clés de la phase E dans le projet des fiches ennemi-interieur-wfrp4 (voir `docs/PLAN_FIN_DE_PROJET.md`, phase H).
6. Validations du MJ du 22/10 soir (`docs/ARBITRAGES_MJ_21_10.md`) : runes validées (code possible), magie skaven ajoutée au plan, passe de cohérence outil ↔ feuille avant G. Pages de sélecteurs à faire : choix de l’exécutant E (à la fin de E), propositions Gemini (dédiée).

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
