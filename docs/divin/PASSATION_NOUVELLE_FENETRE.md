# Passation — chantier prières, miracles et bénédictions (19 octobre 2026)

## Message à copier dans la nouvelle fenêtre

```text
Reprends le chantier divin de l'Outil MJ Warhammer. Lis d'abord docs/divin/PASSATION_NOUVELLE_FENETRE.md
dans le worktree C:/Users/arnot/.codex/worktrees/divin-v5/Outil MJ Warhammer (branche codex/divin-v5),
puis docs/divin/DIVIN_RESERVE_DECISIONS.md et docs/divin/GLM_EVALUATION.md. La production est la
version indiquée dans js/version.js de origin/main. Continue l'évaluation GLM 5.3 et les sous-agents Sonnet
selon les règles de la passation.
```

## Où en est-on

- **Production** : 3.18.0 si la publication du 19/10 a abouti (vérifier `js/version.js` sur https://ethoril.github.io/Outil-MJ-Warhammer/), sinon 3.17.1. `main` = branche `codex/divin-v5` poussée en avance rapide.
- **Dépôt de travail** : `C:/Users/arnot/.codex/worktrees/divin-v5/Outil MJ Warhammer` (branche `codex/divin-v5`, fichiers en LF). Le checkout `E:/Outil MJ Warhammer` (branche `main`) se met à jour par `git pull --ff-only`.
- **Contenu livré** : talents (lot 2), magie (lot 3, 277 sorts), prières : 72 bénédictions (12 cultes, 15 effets automatiques sur 19), 128 miracles (livre de base et suppléments), invocations divines (loup, Roi de la Nature, aigle, chat), interface de saisie pilotée par contrat, correctif du Tour des invocations magiques.
- **Tests** : `node --test --test-concurrency=4` (≈3200 verts) ; recette complète `node tools/run-divine-recipe.mjs` (25 commandes) ; générateur `node tools/build-v5-divine-contracts.mjs` puis `--check`.

## Reste à faire (par valeur à la table)

1. **Bénédictions en rappel** : Souffle (aucun lecteur d'étouffement hors vortex), Conscience (déclencheur narratif), Protection (test de Calme imposé à l'attaquant : touche la résolution, risque élevé), Convalescence (pas de modèle de maladie).
2. **~70 miracles en rappel** : surtout narratifs ; quelques-uns demanderaient relances spécifiques, soins de Blessures Critiques, Corruption, stase. Voir l'inventaire du plan P5 (relancer un agent de planification en lecture seule si besoin).
3. **Résiduels documentés** (réserve R19-R23, P5 D4-D6) : interaction de sort pendant le Tour d'une invocation magique orpheline ; ordre périmé d'un participant ajouté en cours de Round (moteur V5) ; Chance : la gratuité se juge sur le Test propre de l'acteur (pas sur l'opposition) ; coût d'un aperçu supplémentaire avec la bénédiction de Chance ; un sort qui inflige un critique ne consomme pas Sauvagerie.
4. **Hors périmètre, en réserve** : Courroux complet et Brisé avancé, créatures/PNJ, autres traditions, audit exhaustif des 2694 pages.
5. **Recette à la table par le MJ** (ergonomie générale) quand tout sera fait.

## Règles de travail établies (ne pas les redécouvrir)

- **Publication** : seulement sur feu vert explicite du MJ dans le chat ; le classifieur refuse un push sans ce go. Bumper ensemble `js/version.js`, `package.json`, `package-lock.json` (2 endroits), `sw.js` (CACHE_NAME), `index.html` (#btn-version), titre et ligne 3 du README ; recette complète verte ; `git push origin codex/divin-v5:main` ; vérifier le build Pages puis la version en ligne.
- **Chantier à risque** (code de combat partagé : resolution.js, store.js, moteurs de Tour, v5-store-action.js) : tests de caractérisation d'abord (vérifiés par mutations quand c'est possible), puis le code, puis un contrôleur indépendant (agent `verifier` distinct), puis la recette complète.
- **Worktrees** : un par agent parallèle, préparés en LF (`git -c core.autocrlf=false rm -q --cached -r . && git -c core.autocrlf=false reset -q --hard`, puis jonction `node_modules`). Un worktree CRLF fausse les empreintes du registre.
- **Jamais `git stash`** entre agents parallèles (liste partagée) : l'écrire dans chaque brief.
- **Sous-agents Claude en Sonnet** ; rapports courts demandés (moins de 15-25 lignes) pour épargner le contexte de l'orchestrateur.
- **GLM 5.3** (skill `deleguer-glm`, autorisé sur ce projet) : tâches bornées avec test d'acceptation écrit avant, contexte resserré (lignes précises), plafond 2 USD, worktree LF ; journaliser chaque tâche dans `docs/divin/GLM_EVALUATION.json` (usage 5 h et hebdo lus par `get_usage` avant/après, contexte de l'orchestrateur, coût Mistral réel donné par le MJ) ; synthèse `node tools/glm-eval-summary.mjs`.
- **Décisions prises sans le MJ** : les consigner dans `docs/divin/DIVIN_RESERVE_DECISIONS.md` et les présenter ensuite en sélecteurs.

## Évaluation GLM : état au 19/10

9 tâches (GLM 4, Sonnet 4, directe 1). GLM : code correct à chaque fois ; deux succès nets au premier essai (caractérisation par mutations, correctif borné dans resolution.js) ; coût ≈ 0,20 € réel par tâche ; coût d'entrée très sensible au contexte à lire. Sonnet : plus sûr sur les implémentations de conception. Les gros chantiers Sonnet en parallèle pèsent sur la fenêtre de 5 h (53 → 74 %). Il faut encore des tâches comparables pour appliquer la règle de décision (≥ 6 par voie). Prix du siège Team standard : 18 € par mois.
