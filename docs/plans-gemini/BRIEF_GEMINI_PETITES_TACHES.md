# Brief Gemini — trois petites tâches isolées (21 octobre 2026)

Tu travailles en parallèle d’un autre agent (GPT, phases B et suivantes) : reste strictement dans les fichiers nommés ci-dessous. Claude (orchestrateur) vérifie et intègre : **tu ne publies rien**.

## Cadre (non négociable)

- Worktree dédié depuis la branche `codex/divin-v5`, branche `gemini/petites-taches`. Jamais `codex/divin-v5` ni `main`.
- Fins de ligne LF : `git config core.autocrlf false`, puis `git rm -q --cached -r . && git reset -q --hard`. Avant chaque commit, `git ls-files --eol | grep crlf` doit être vide.
- Une tâche = un commit `<type>: <résumé français> (Gemini)`. Interdits : `git stash`, `git push`, nouvelle dépendance, reformatage, modification d’un fichier non nommé par la tâche.
- Si une tâche est impossible (outil, source ou information manquants) : écris `tmp/gemini/BLOQUE-<n>.md` avec la raison précise, annule ton travail non commité sur cette tâche, passe à la suivante.
- Livres : liste et chemins dans `docs/divin/DIVIN_CORPUS_LIVRES.json` (L01-L17) et `docs/divin/DIVIN_CORPUS_LIVRES_COMPLEMENT.json` (L18-L26). Résume en français, dans tes mots ; ne recopie jamais le texte des livres au-delà d’une douzaine de mots par entrée.
- Rendu final : `docs/plans-gemini/RAPPORT_GEMINI.md` (commité), une ligne par tâche, FAIT (hash) ou BLOQUÉ (raison).

## Tâche 1 — Vérification visuelle de tableaux mal extraits

Les inventaires signalent des tableaux dont l’extraction texte décale les colonnes. Vérifie-les sur l’image des pages (`pdftoppm -png -r 150 -f <p> -l <p> "<chemin>" <sortie>`), sans rien attribuer au hasard :

- L07 *Lustria* p.151 : Marques des Anciens (associations marque → effet, tableau des pontes).
- L09 *Temple of Spite* p.63 et p.64 : tableau des pactes (dieu → pacte → effet), et le tableau p.63 signalé dans `docs/COURAGE_BRISE_INVENTAIRE.md` (C0-Q11).
- L06 *Livre de base V5 EN* p.360-361 : tableaux de Taille et de Blessures.

Livrable : `docs/VERIFS_TABLEAUX_VISUELS.md`, un tableau par source (ligne → correspondance vérifiée, page imprimée), avec une colonne « écart avec l’extraction texte » quand il y en a. Ne modifie pas les inventaires eux-mêmes. Fichier autorisé : celui-là seul (les images vont dans `tmp/gemini/`, non commitées).

## Tâche 2 — Indicateur de rentabilité de `tools/glm-eval-summary.mjs`

Le script compare le coût de GLM à la valeur du quota Claude épargné en prenant la **médiane** des points de quota hebdomadaire consommés par les tâches Sonnet ; ces points sont relevés à l’entier près et valent souvent 0, ce qui rend l’indicateur faux (« 0 pt, NON RENTABLE »). Coûts réels connus : voir le champ `cout_reel_note_20_10_soir` de `docs/divin/GLM_EVALUATION.json` (rapport réel ≈ 1/7 du plafond USD affiché ; 17,03 € cumulés).

- Coût réel estimé d’une tâche GLM : `b2_cout_reel_eur` s’il est renseigné, sinon `b2_cout_usd × 0,92 / 7`, affiché comme estimation.
- Points hebdomadaires d’une tâche Sonnet : **moyenne** (somme des écarts mesurés ÷ nombre de tâches mesurées), pas la médiane ; afficher aussi le nombre de tâches mesurées.
- Afficher le coût réel cumulé connu (champ de note) à côté du plafond cumulé.
- Ajouter un argument facultatif `--log <chemin>` (par défaut le journal actuel) et un test `tests/glm-eval-summary.test.js` qui exécute le script sur un petit journal fictif écrit dans un dossier temporaire et vérifie les trois points ci-dessus.

Fichiers autorisés : `tools/glm-eval-summary.mjs`, `tests/glm-eval-summary.test.js`. Acceptation : `node --test tests/glm-eval-summary.test.js` et `node tools/glm-eval-summary.mjs` sans erreur.

## Tâche 3 — Parcours de recette à la table (préparation de la phase G)

Ajoute à `docs/RECETTE_UTILISATEUR.md` une section « Parcours divins (3.17 à 3.21) » : un parcours guidé, pas à pas, que le MJ suit dans l’application pour essayer chaque fonction livrée, avec pour chacune l’action à faire et le résultat attendu à l’écran. Fonctions à couvrir (sources : `docs/divin/DIVIN_RESERVE_DECISIONS.md`, `docs/ARBITRAGES_MJ_21_10.md`, `docs/plans-gpt/RAPPORT_GPT_PHASE_A.md`, messages de commit `git log --oneline 5d9c571..HEAD`) :

- bénédictions Protection (Test de Calme de l’attaquant, une fois par ennemi), Souffle, Sauvagerie, Chance (y compris opposition perdue) ;
- miracles Morsure du Loup, Écraser les faibles, Fortune généreuse (case et indice d’inversion), N’écoutez point la Sorcière, Malice de Ranald (Tests opposés seulement), Attaque Rapide (rappel de début de Round), Fureur d’Ulric, En Bon Ordre, Larmes de Shallya, Faire monter les enjeux, Dévotion de la Guerrière (liste d’ennemis) ;
- registre des Blessures Critiques sur la fiche et bouton « Guérir » ; invocations (cible implicite, Destinataires masqués) ; insertion d’un participant à son rang d’Initiative en cours de Round.

Fichier autorisé : `docs/RECETTE_UTILISATEUR.md` (n’en modifie pas les sections existantes). Pas de captures d’écran inventées : décris ce que le MJ doit voir, d’après le code et les tests.
