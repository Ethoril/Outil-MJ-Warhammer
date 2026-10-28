# Succession — Phase F2

## T2 bis — 28/10/2026 : arrêt pour contre-vérification

Worktree `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-worktree`, branche `gpt/phase-f2`. Lire la section T2 bis en tête de `RAPPORT_GPT_PHASE_F2.md`, les décisions recopiées en tête de `CHOIX_EXECUTANT_PHASE_F2.md` et `tmp/gpt-phase-f2/CONTRE_VERIFICATION_CLAUDE_T2.md`. Les anciennes réserves T2 sur Blackbriar et Salve ci-dessous sont historiques et remplacées par le détail T2 bis.

Suite Node : 5 083/5 084 ; seul échec `sw.test.js` sur six modules non précachés, listés dans le rapport ; `sw.js` reste inchangé sur instruction. Les parcours navigateur D/N/I ont été rejoués sur application et Store réels, avec limites de fixtures explicitées dans le rapport. N : un lien orphelin peut rester enregistré après retrait mais ne contraint pas ; restart UI purge les liens. Empaleuse : chirurgie de balle confirmée par le MJ, talent non contrôlé automatiquement. Malus durables d’amputation reportés à F2-J.

**Arrêt : contre-vérification Claude de T2 bis puis feu vert du MJ avant T3.** Aucun push, fusion, publication, version applicative ou modification `sw.js`.

## T2 — reprise et vérification du 27/10/2026

Les travaux D/E/N/I et la conception K2 sont dans le worktree `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-worktree`, branche `gpt/phase-f2`. Lire la section T2 du rapport `RAPPORT_GPT_PHASE_F2.md` et les choix `CHOIX_EXECUTANT_PHASE_F2.md` avant toute reprise ; ils consignent les résultats, les tests modifiés et les limites. F2-R est commité et sa contre-vérification a explicitement autorisé T2 sans correction préalable.

La suite complète après les corrections de garde et de BE/E compte 4 994 réussites sur 4 995 tests, avec un échec de précache ; le brief interdit de modifier `sw.js`. Six nouveaux modules doivent être ajoutés au précache par Claude à la publication, voir le rapport. Le catalogue générique Salve diverge de l’interprétation de la table de L13 et le Javelot Blackbriar présente un `Inflige` vide : conserver ces réserves visibles, sans modifier le snapshot à la main. La conception K2 n’est pas une autorisation de saisie des tables.

Ne pas commencer T3 avant la contre-vérification Claude de T2 et le feu vert du MJ. Aucun push, fusion, changement de version ni publication n’est autorisé par cette tranche.

## Fin de reprise T1 BIS — 27/10/2026 : arrêt demandé

Instruction du MJ exécutée : réponses du MJ de `CONTRE_VERIFICATION_CLAUDE_T1_BIS.md` recopiées en tête des choix ; points 1 à 7 corrigés, ajout direct actif avant le Round 1 avec préparation/jet/BI/ordre raccordé ; revue Luna indépendante ciblée et validation complète. Voir le bloc T1 BIS en tête du rapport pour les changements, les adaptations de tests et les preuves.

Validation principale : **4 825/4 825 tests Node**, zéro échec/ignoré (`tmp/gpt-phase-f2/t1-bis-full-verified.log`), et **six parcours navigateur T1 verts** (`t1-bis-<runner>-browser.log`). Revue : `tmp/gpt-phase-f2/REVUE_T1_BIS_LUNA.md`. Caractérisations initiales : `89addd5` ; décisions MJ/cadrage : `f85e113` ; code/tests : `a2e520f`. Verdict de revue ciblée conforme, aucun bug bloquant trouvé sur les chemins couverts. Le nouvel ajout « + Actif » est explicite ; « + Au combat » garde l'ajout au banc. Les APIs sans jet refusent un ajout actif post-tirage Round 0, la préparation dédiée fournit la voie de résolution atomique.

**Chantier arrêté ici. Ne pas commencer T2, fusionner ni publier.** Le MJ met d'abord les armes et armures de base en V5 dans sa feuille et le site, puis l'outil relira le catalogue. Ne pas retoucher `reference-snapshot.json` à la main. Les états et prochaines étapes plus bas sont historiques ; la présente instruction de fin de reprise prime.

## Reprise prioritaire — contre-vérification T1 du 26/10/2026

Le verdict historique de clôture ci-dessous a été invalidé par les points 1 à 20 de `tmp/gpt-phase-f2/CONTRE_VERIFICATION_CLAUDE_T1.md` (arbre `02b203b`). L'instruction directe du MJ autorise leur correction, la recopie des décisions en tête de `CHOIX_EXECUTANT_PHASE_F2.md`, une revue indépendante et la suite complète, puis un arrêt avant T2. Les trois décisions nouvelles priment sur les choix historiques : ordre MJ direct à partir de trois ex aequo ; spécialité exacte d'arme par défaut ; jet d'initiative pour les activations avant le Round 1. Le tournoi A-EGALITES-01 ci-dessous est donc historique et remplacé.

**Corrections 1 à 20 terminées et revérifiées localement.** Revues indépendantes Luna C, complément C à zéro, A, B et complément B favorables (`tmp/gpt-phase-f2/REVUE_T1_*_LUNA.md`). Suite complète finale **4 817/4 817**, zéro échec/ignoré, `tmp/gpt-phase-f2/t1-corrections-full-verified.log` ; six parcours navigateur verts, dont le nouveau `tests/f2-b-two-weapons.browser.mjs` sur Épée/Pistolet du catalogue et changement de cible létale. Les deux runners B sont verts après le dernier correctif de garde d'erreur. La première suite (4 814/4 817) et ses trois échecs corrigés sont conservés et expliqués dans le rapport, sans être présentés comme validation finale.

Le point 20 utilise `combatScopeId` pour distinguer les redémarrages, tout en gardant l'identité/date de scène et les identifiants des anciennes sauvegardes sans scope. Tous les consommateurs d'identité de Tour (Store, coûts, Prière forcée, Brisé, UI) partagent `v5CombatActionClock` dans le module existant `v5-resources.js`. Les horloges de magie/campagne restent intactes. Les assertions de tests adaptées aux décisions/corrections demandées sont listées dans le rapport ; les caractérisations préalables F2 restent intactes.

**Arrêt avant T2.** Ne pas démarrer T2, fusionner, publier ou changer de version. La prochaine étape est la nouvelle contre-vérification Claude ciblée sur les vingt points, puis le feu vert du MJ. Les preuves courantes sont récapitulées en tête du rapport de phase ; les résultats plus anciens ne certifient pas les corrections nouvelles.

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
