# Succession GPT — Phase F2

## Clôture de la Tranche T1 (C, A, B) — 25/10/2026

Sur instruction du MJ (« reprends et termine le lot B / Tranche 1 stp »), le lot **F2-B** a été finalisé, vérifié sur la suite complète Node et les 5 parcours navigateur de T1, puis commité. **La Tranche T1 (F2-C, F2-A, F2-B) est intégralement livrée et close localement sur `gpt/phase-f2`. Arrêt réglementaire de fin de tranche : T2 n'est pas commencé.**

### Livré et commité en Tranche T1

- **C corrigé** : `734a3e2`, décisions MJ recopiées en tête de `CHOIX_EXECUTANT_PHASE_F2.md` (`bbe726b`), caractérisations préalables `5e60fdd`, revue Luna indépendante ; principal **4 723/4 723** et trois parcours navigateur (`f2-c-ui.browser.mjs`, `f2-c-workspace.browser.mjs`, `f2-c-state.browser.mjs`). Limites précises dans le rapport (défenses/parades C non filtrées ; Baliste/Catapulte encore contraintes par qualités héritées).
- **A** : `f135c65`, caractérisations séparées `b25d1ac` ; principal après dernier gel **4 757/4 757**, zéro échec/ignoré (`tmp/gpt-phase-f2/a-principal-verified.log`), navigateur `a-browser-verified.log` sortie 0, revue indépendante `REVUE_A_LUNA.md`. Combat instinctif, provenance legacy, I historique, égalités, scènes/restart, ordre et Surprise sont inclus. Rapport/succession A : `9c2ba6e`.
- **B** : `a0ebca7`, caractérisations séparées `efcb63e` (**6/6** dans `b-principal-characterization.log`), choix d'exécutant `B-VISIBILITE-01` commité en `6a2c4c1` (et `B-SIZE-01`, `B-TRIP-01` consignés dans `CHOIX_EXECUTANT_PHASE_F2.md`). Aucun test de caractérisation ni test hérité modifié.
  - **Suite complète Node** (`node --test --test-concurrency=4`) : **4 787/4 787**, 0 échec, 0 ignoré (`tmp/gpt-phase-f2/b-principal-verified.log`).
  - **Tests Node F2-B** : **30/30** (`tests/f2-b-characterization.test.js`, `tests/f2-b-combat-modifiers.test.js`, `tests/f2-b-combat-actions.test.js`) et **51/51** avec `e12-resolution.test.js`, `e05-session-resolution.test.js`, `pro-q21` et `pro-q35`.
  - **Navigateur réel** : `node tests/f2-b-combat-actions.browser.mjs` vert (`tmp/gpt-phase-f2/b-browser-verified.log`) couvrant de bout en bout Visée, déplacement déclaré, Action défensive et expiration au Tour suivant, tir modifié + Undo/Redo/reload, mort directe confirmée (`hp: 0`, `extensions.v5.dead: true`), Tir extraordinaire, dispersion d'arme de jet, tir engagé redirigé sur allié, allonge Très longue, Croche-pied monté (démontage + chute E30 + À Terre) et attaque de seconde arme avec coût d'Élan. Les 4 autres runners navigateur de T1 (`f2-a-initiative-surprise.browser.mjs`, `f2-c-ui.browser.mjs`, `f2-c-workspace.browser.mjs`, `f2-c-state.browser.mjs`) ont été rejoués et sont verts.
  - **Contrôle des frontières** (`node tmp/gpt-phase-f2/check-boundaries.mjs`) : vert (`planOriginalPreserved: true`, `protectedFiles: 11`, `lfFilesChecked: 42`, `newRuntimeModules: 0`, `diffCheck: true`).

### Prochaine étape (après validation externe de T1)

- Attendre la contre-vérification Claude de la Tranche T1 et le feu vert explicite du MJ avant d'ouvrir la **Tranche T2** (`F2-D`, `F2-E`, `F2-N`, `F2-I`).
- Ne pas exécuter de fusion vers `main` ou `codex/divin-v5` ni la recette finale `node tools/run-divine-recipe.mjs` avant la clôture complète de la Phase F2.

## Instruction courante et frontière

Le MJ demande : corriger C selon `tmp/gpt-phase-f2/CONTRE_VERIFICATION_CLAUDE_F2-C.md` et ses décisions, les recopier comme décisions MJ, revérifier avec Luna, puis A et B et arrêt fin T1. Les décisions sont recopiées dans `CHOIX_EXECUTANT_PHASE_F2.md`; l'exclusion des armes conjurées est refusée. L'instruction directe autorise A/B après la nouvelle revue Luna; aucune nouvelle approbation intermédiaire n'est requise. **Ne pas commencer T2**, ni fusionner/publier/versionner.

Worktree `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-worktree`, branche `gpt/phase-f2`, base `d737c5a` (3.26.0). Main avait avancé extérieurement à `8ed9099` (deux recettes navigateur); aucun rebase/merge/cherry-pick ici. Vérifier état avant reprise, ne pas intégrer main automatiquement. Lire brief général, règles communes, arbitrages F1, appendice Exécution du plan, rapport/choix et briefs de lot. JSON/arbitrages/catalogue/version restent intacts.

## État actuel

- C initial `1034dc9`/rapport `e985233` a été invalidé par Claude. Ne pas reprendre ses anciennes déclarations comme validation actuelle.
- Décisions MJ et cadrage correction : `bbe726b`; caractérisations Store avant production : `5e60fdd`, conservées intactes.
- **C corrigé : `734a3e2`**, nouvelle revue indépendante Luna sans bloquant vérifié après gel 3. Toutes les corrections du rapport sont raccordées; détails et limites au rapport actuel. Canon réellement appliqué en navigateur; Baliste maîtrise seulement, application encore bloquée par une qualité héritée.
- Principal sur C final : **4 723/4 723**, `tmp/gpt-phase-f2/c-claude-principal-verified.log`; trois runners navigateur verts `f2-c-ui.browser.mjs`, `f2-c-workspace.browser.mjs`, `f2-c-state.browser.mjs`, journaux `c-claude-principal-verified-*.log`. Revue Luna : `REVUE_C_CORRECTIONS_LUNA.md` ignoré dans tmp.
- Deux assertions du fichier de tests F2-C reflètent désormais les corrections demandées (Base entraînée disponible et monté absent=démonté); tous les tests de caractérisation pré-code et tous les tests antérieurs à F2 sont intacts. Ne pas corriger un test en supprimant une règle.
- **A livré `f135c65`**, caractérisations pré-code `b25d1ac` intactes. Revue indépendante Luna terminée : `tmp/gpt-phase-f2/REVUE_A_LUNA.md`. Principal après gel final : **4 757/4 757**, `a-principal-verified.log`, et navigateur `a-browser-verified.log` sortie0. Les passes précédentes ne prouvent pas les derniers raccords Combat instinctif. Aucun test hérité modifié. Lire le rapport pour les limites DOM/inversion et le brief jusqu'au bout pour les choix A.
- **B livré `a0ebca7`**, caractérisations séparées `efcb63e` (**6/6** dans `b-principal-characterization.log`) intactes, choix `B-VISIBILITE-01` commité en `6a2c4c1`. Principal après gel final : **4 787/4 787** (`tmp/gpt-phase-f2/b-principal-verified.log`), acceptation dédiée **51/51** (dont **30/30** F2-B), et navigateur `tmp/gpt-phase-f2/b-browser-verified.log` sortie 0. **Tranche T1 close ; T2 non commencé.**

## Conditions A/B à conserver

Chaque lot est codé par Luna puis vérifié par une autre Luna à contexte neuf (lecture seule, vrai PDF); principal lit diff et valide suite complète avant livraison. Caractérisations séparées avant modifications de Store/résolution/Tour. Aucun nouveau JS/JSON sous js : précache exigerait sw.js interdit.

A : d10 PNJ capturé une fois; PJ saisi, BI ajouté une fois, I historique séparée du score de combat. Égalité score puis I; opposition réelle et choix du gagnant. Trois ex aequo ou plus : tournoi éliminatoire explicite n−1 oppositions, ordre déclaré avant jets, gagnant final choisit la permutation (choix d'exécutant A-EGALITES-01, pas décision MJ). Vraies routes main : bouton start direct, advanceTurn au Round 0/raccourcis, deux callbacks rencontre, recommencer. Reprendre ne relance rien. Commande finale unique annulable et garde de révision. Renfort sans jet : insertion existante, jamais comparer I40 à score4–15; manuel/invocations/tours déjà passés préservés. Vrai navigateur index/main, pas uniquement montage avec callbacks de test.

B : décisions MJ Surpris +2 mêlée/+1 tir et À Terre attaquant = Désavantage ET −1 DR. Malus C additifs. Viser et Défensive consomment réellement l'Action et expirent/invalident dans les vrais flux; rangement initiative n'est pas mouvement spatial, déclaration MJ de mouvement requise. Deuxième arme après attaque même ratée, autre arme une main, coût/quota atomique et Talents conservés. Tir en mêlée : aléa seulement si inversion force l'échec d'une touche potentielle, candidats MJ incluent cible initiale/alliés, vraie conséquence sur cible retenue. Sans défense : résultat critique choisi permis, mort confirmée et option létale par défaut désactivée. Croche-pied : choix d'exécutant 2 Avantages V4→1 Élan, opposition F/Athlétisme après touche; monté lu sur donnée C, démontage/chute2yards puis À Terre. L06p169 : perte max(0,6−BE), Armure ignorée; si perte>BE, Endurance et critiques éventuelles par moteur existant, aucun dé manquant deviné. Ne pas substituer un rappel à la mutation ni inventer un moteur général hors périmètre.

## Environnement et preuves

`npm ci` déjà fait, Node24.22.1. TEMP/TMP = `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-runtime`, extérieur checkout sur E. `tmp/divin/recipe-receipt.json` copie authentique du reçu F0 pour précondition E0 uniquement (SHA-256 `d9f7e2e4430fc6eef4dce5287b16b03c0b46b9bd674caf53def16faeeabfcfa9`), aucune recette F2 prouvée par cette copie. La recette complète est requise en fin de phase; la suite Node/browser ne la remplace pas.

PDF hors dépôt via `docs/divin/DIVIN_CORPUS_LIVRES.json`. Python pypdf : `C:/Users/arnot/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`; `pdftoppm` disponible. L06 `E:/Projet Warhammer Ennemi Intérieur/tmp/catalogue-bibliotheque/pdfs/Livre de base V5 EN v2.pdf`; L13 Up in arms.pdf, L07 Lustria EN.pdf dans le même dossier. Ne pas conclure PDF indisponible parce qu'il n'est pas dans Git. Lire les vraies pages et regarder les tableaux ambigus.

Contrôle frontières réutilisable ignoré : `node tmp/gpt-phase-f2/check-boundaries.mjs` (plan original identique, onze fichiers protégés, LF, pas de nouveau module runtime, diff-check). Git writes nécessitent l'escalade sandbox, autorisée pour les commits locaux; pas de stash/reset destructif. Conserver les changements hérités et ne jamais copier les tests dans tmp.
