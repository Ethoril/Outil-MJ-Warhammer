# Règles communes aux briefs GPT (phases B à E)

Ces règles s’appliquent à chaque brief `BRIEF_GPT_PHASE_*.md`. En cas de doute, elles priment sur ton initiative. Claude (orchestrateur) vérifie, intègre et publie : **tu ne publies rien**.

## Sources de vérité, par ordre de priorité

1. Arbitrages du MJ : `docs/ARBITRAGES_MJ_21_10.md`, puis `docs/divin/DIVIN_RESERVE_DECISIONS.md`. Ils l’emportent sur toute autre lecture.
2. Règle maison : **aucun ingrédient n’est exigé pour la magie** ; « Petit » reste le homebrew V4 local.
3. Livre V5 EN (L06) ; noms français : livre de base FR (L05) ; puis suppléments, **le plus récent l’emportant** en cas de divergence entre suppléments. Termes V4 (Avantage, ±10 %, ±20 %) convertis en V5 (Élan, ±1 DR / ±2 DR), chaque conversion consignée.
4. Corpus : `docs/divin/DIVIN_CORPUS_LIVRES.json` (L01-L17) et `DIVIN_CORPUS_LIVRES_COMPLEMENT.json` (L18-L26). Livres ignorés (non acquis) : Ubersreik Adventures I-III, Salzenmund, Starter Set, Gamemaster’s Guide ; tout ce qui en dépend est laissé de côté, sans invention.

## Préparation

- Worktree dédié depuis `codex/divin-v5`, branche `gpt/phase-<lettre>`. Jamais `codex/divin-v5` ni `main`.
- Fins de ligne LF : `git config core.autocrlf false`, `git rm -q --cached -r . && git reset -q --hard`. `git ls-files --eol | grep crlf` vide avant chaque commit.
- `node_modules` : jonction vers le worktree principal ou `npm ci`. Créer `tmp/divin/`. Placer `TEMP`/`TMP` sur le même lecteur que le worktree (sinon faux échecs E0/E2).

## Démarche imposée pour chaque phase

1. **Complément d’inventaire** sur L19-L26 (et tout livre du corpus non consulté par l’inventaire de la phase) : mêmes formats et mêmes règles que l’inventaire existant, ajoutés au JSON et au rapport de la phase (entrées marquées `addedOn: "2026-10-21"`), un commit.
2. **Plan de lots** `docs/plans-gpt/PLAN_GPT_PHASE_<lettre>.md`, au format de `docs/PLAN_GLM_PHASE_A.md` : par lot, objectif, identifiants d’inventaire couverts, arbitrages appliqués, comportements attendus (cas de test précis), emplacements (fichiers, fonctions, texte à chercher), fichiers autorisés, commande d’acceptation, niveau de risque. Lots de taille modeste (une mécanique ou une famille homogène). Un commit **avant tout code**. Chaque entrée d’inventaire « absent » ou « rappel » doit être couverte par un lot ou listée en fin de plan avec la raison de son exclusion (arbitrage, source ignorée, purement narratif).
3. **Exécution des lots** dans l’ordre du plan, chacun : nouveaux tests d’abord (ils échouent pour la bonne raison) ; code ; acceptation ; `node tools/build-v5-divine-contracts.mjs --check` si des contrats divins changent (régénération par le générateur, jamais à la main) ; suite complète `node --test --test-concurrency=4` ; commit `<type>(<domaine>): <résumé français> (GPT)`.
4. **Rapport** `docs/plans-gpt/RAPPORT_GPT_PHASE_<lettre>.md` (commité) : une ligne par lot (FAIT + hash, ou BLOQUÉ + raison), dernière suite complète, liste des assertions de tests existants modifiées, liste des choix d’interprétation.

## Garde-fous

- **Jamais de règle de jeu pliée pour faire passer un test.** Attendu faux, impossible, ou fichier hors périmètre : `tmp/gpt-phase-<lettre>/BLOQUE-<lot>.md`, `git reset --hard` du travail non commité du lot, lot suivant.
- **Choix d’interprétation** (cas que les arbitrages délèguent à l’exécutant) : lecture la plus simple et la plus prudente, consignée dans `docs/plans-gpt/CHOIX_EXECUTANT_PHASE_<lettre>.md` (id, source, question, choix, raison, alternative) pour relecture du MJ en sélecteurs.
- **Tests existants** : ne modifier que les assertions qui épinglent le statut, la liste d’effets, un nom ou un décompte de ce que le lot change, chacune listée dans le commit et le rapport.
- **Code partagé à risque** (`js/core/resolution.js`, `js/core/store.js`, moteurs de Tour `v5-turn.js` / `turn-order.js`, `v5-store-action.js`) : tests de caractérisation commités à part avant le changement ; la recette complète `node tools/run-divine-recipe.mjs` doit être verte en fin de phase.
- **Données issues des livres** : résumés en français dans tes mots, jamais de texte recopié au-delà d’une douzaine de mots par entrée ; pas de bloc de profil recopié tel quel dans la documentation (les valeurs chiffrées d’un profil vont dans les données de jeu, pas dans les rapports).
- **Lecture des PDF** : un livre à la fois, pages ciblées (`pdftotext -layout -f <p> -l <p> "<chemin>" -`) après repérage ; tableaux douteux vérifiés visuellement (`pdftoppm -png -f <p> -l <p>`), sans attribution arbitraire.
- **Interdits** : `git stash`, `git push`, changement de version (`js/version.js`, `package.json`, `package-lock.json`, `sw.js`, `index.html`, README), nouvelle dépendance, reformatage hors lot, modification des fichiers d’arbitrage (`docs/ARBITRAGES_MJ_21_10.md`, `docs/divin/DIVIN_RESERVE_DECISIONS.md`) et de `docs/PLAN_*.md`.
- **Outil manquant** : fichier BLOQUÉ avec la commande qui échoue ; continuer ce qui reste faisable.
- **Volume** : si la phase dépasse ce qui tient dans ta session, termine le lot en cours proprement (commit), écris le rapport partiel (lots faits, lots restants) et arrête-toi.
