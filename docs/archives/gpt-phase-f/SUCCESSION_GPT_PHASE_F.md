# Succession — F0 clôturée, 26 livres traités

État vérifié le 23 octobre 2026 : **revue documentaire F0 terminée dans le périmètre du brief**. Les 26 livres sont traités, L05 pour les noms français seulement. **7 019 entrées, 5 337 sélecteurs ouverts ; suite complète 4 054/4 054 ; recette finale 26/26 commandes vertes.** Aucun livre F0 restant. Aucune implantation F2 ni décision MJ F1 effectuée. Ne pas reprendre à L10, L12 ou L15 : leurs lots sont terminés.

## État local et autorité

- Worktree conservé : E:/Outil MJ Warhammer/tmp/gpt-phase-f-worktree ; branche gpt/phase-f ; HEAD de clôture **327894a3cf9ba65de8067f8b12f67d7e745ca946**.
- Main figée ad092cdf78a747d08f1b1a0fd8acf27a97d6caf8, ascendance vérifiée. Référence initiale codex/divin-v5 b1ab6c512acb6f919a00ef9d6b85fa1769b33c2b laissée en lecture seule.
- Départ de la dernière demande : b5f32c9e1591e8dd20dc29b96ec319fd18c1a0dc, 6 392 entrées / 4 960 sélecteurs, 23/26 livres. Les trois derniers livres ajoutent 627 entrées et 377 sélecteurs ; les 6 392 entrées héritées sont identiques.
- Aucun push, fusion ou publication. Aucun js/, test hérité, vendor, catalogue, version ou arbitrage modifié par cette séquence. Aucun agent secondaire. Seuls les quatre fichiers tests/audit-*.test.js de l’outillage initial ont été ajoutés depuis la base de phase.
- Les deux non-suivis hérités restent non suivis : cette succession, actualisée, et docs/plans-gpt/REPRISE_GEMINI_PHASE_F.md, intact, SHA-256 48e83897ba33b3343253ee0f53f00b7ea47e528537fe960c5d26afd420a4684c. Le prochain lot indiqué dans REPRISE_GEMINI est historique.

## Derniers livres et commits locaux

| Livre | Entrées | Sélecteurs | Purs renvois exclus | Pages vues en image | Commit local |
| --- | ---: | ---: | ---: | ---: | --- |
| L10 | 90 | 58 | 30 | 14 | 57b0bfcfcf02eb61b6a6085069c46d3f8c945dec |
| L12 | 217 | 116 | 98 | 24 | d41a00bec1ab060c20dabec471c25da058474037 |
| L15 | 320 | 203 | 93 | 42 | 42578d727b06b8d1bdec8ee66f1a49f604671f6e |

Chaque commit de livre ne contient que les cinq documents prescrits : AUDIT_REGLES.json, sa synthèse MD, SELECTEURS_PHASE_F.json, CHOIX_EXECUTANT_PHASE_F.md et RAPPORT_GPT_PHASE_F.md. Deux générations identiques et --check, intégrité, LF et diff--check, suite complète 4 054/4 054 avant chacun. Le commit de clôture 327894a3cf9ba65de8067f8b12f67d7e745ca946 actualise le rapport et le titre neutre de la synthèse via tools/audit/build-audit.mjs ; aucun code de jeu.

Sources de la dernière séquence :

- L10 : Supplément Vampire - Sylvania The Cursed County v2.pdf, 96 pages physiques ; SHA-256 445ca4421ec9323e34bc7e60a0f73c68df02f732da365d5f269341054c41dfa5. Source : E:\Projet Warhammer Ennemi Intérieur\tmp\catalogue-bibliotheque\pdfs\Supplément Vampire - Sylvania The Cursed County v2.pdf.
- L12 : Tribes and Tribulations EN.pdf, 112 pages physiques ; SHA-256 008c2e08337b15dd6776ae108acae4749d5276fbcff63eb7db74e3b9daf8dc6e. Source : E:\Projet Warhammer Ennemi Intérieur\tmp\catalogue-bibliotheque\pdfs\Tribes and Tribulations EN.pdf.
- L15 : WFRP_Dwarf_Players_Guide_Book_250714.pdf, 144 pages physiques ; SHA-256 f9ffbe960aae459ff53d1ecc832298908f1f22cd7a223aab863d4ca14bea7e50. Source : E:\Projet Warhammer Ennemi Intérieur\tmp\catalogue-bibliotheque\pdfs\WFRP_Dwarf_Players_Guide_Book_250714.pdf.

L10 est explicitement V5, crédits du 8 septembre 2026 ; aucune conversion automatique de son Avantage en Élan. L12 est V4 (25 janvier 2024) et L15 V4 (14 juillet 2025). Les conversions proposées restent uniquement dans v5Proposal.

## Corpus traité

Ordre effectué : L06 → L05 → L17 → L11 → L13 → L14 → L16 → L18 → L19 → L20 → L21 → L22 → L23 → L24 → L25 → L26 → L01 → L02 → L03 → L04 → L07 → L08 → L09 → L10 → L12 → L15.

| Livre | Entrées du registre |
| --- | ---: |
| L01 | 425 |
| L02 | 333 |
| L03 | 61 |
| L04 | 495 |
| L05 — noms seuls | 0 |
| L06 | 1141 |
| L07 | 403 |
| L08 | 352 |
| L09 | 310 |
| L10 | 90 |
| L11 | 167 |
| L12 | 217 |
| L13 | 275 |
| L14 | 127 |
| L15 | 320 |
| L16 | 209 |
| L17 | 367 |
| L18 | 100 |
| L19 | 155 |
| L20 | 62 |
| L21 | 75 |
| L22 | 212 |
| L23 | 281 |
| L24 | 86 |
| L25 | 468 |
| L26 | 288 |

Statuts : 195 automatise, 179 assiste, 272 rappel, 6 271 absent, 102 hors-granularite. Les statuts des renvois ne sont pas des certifications nouvelles des anciens domaines. La correspondance exacte avec les 5 337 sélecteurs ouverts est générée et vérifiée ; aucune autorisation d’implantation n’en découle.

## Preuves et portée des contrôles

- Rapport commité : docs/plans-gpt/RAPPORT_GPT_PHASE_F.md, section finale « Clôture F0 — 26 livres », avec les portées et limites propres à chaque livre. Les anciens « restent » dans les sections historiques ne constituent plus des lots à reprendre.
- Par dernier livre : tmp/audit/Lxx-baseline-batch.json, Lxx-finish-reading.json, Lxx-finish-generation.json, Lxx-finish-counts.json, Lxx-finish-integrity.json, Lxx-finish-full.log. Les 352 pages des trois PDF ont été extraites ; repérage et lecture ciblée sont séparés des 80 pages vues en image. Les reçus bruts sous tmp/audit/Lxx/ restent read:false et inchangés.
- Clôture : tmp/audit/F0-finish-counts.json, F0-finish-generation.json, F0-finish-integrity.json ; génération stable et --check, héritage et périmètre vérifiés. Le titre « Registre documentaire F0 » reste neutre : les comptes ne certifient pas à eux seuls une lecture.
- Recette finale : node tools/run-divine-recipe.mjs, **26/26 commandes vertes**, dont 4 054/4 054 tests, parcours navigateur, deux parcours cloud sur émulateurs, construction et contrôle hors ligne. Début 2026-10-23T21:50:40.201Z, fin 2026-10-23T21:55:24.225Z. Reçu tmp/divin/recipe-receipt.json ; log principal tmp/audit/F0-finish-recipe.log ; détails tmp/divin/final-*.log. Les quatre sources protégées sont identiques au manifeste tmp/divin/base-manifest.json de base ad092cd.
- La recette antérieure du 22 octobre a été préservée sous tmp/audit/recipe-before-close/. Les anciennes successions sont sauvegardées sous tmp/audit/, notamment SUCCESSION-before-final-three.md. Ne pas écraser les anciennes baselines pour reconstruire l’histoire.

Une extraction ou un hash ne prouve pas une lecture. Les portées de repérage, lectures ciblées et contrôles visuels sont explicites ; aucune lecture littéraire exhaustive ou seconde revue indépendante de tout le corpus n’est revendiquée. La couverture est un audit statique ; la recette exerce les comportements existants nommés, pas chacune des 7 019 entrées ni leur implantation.

## Limites et écarts conservés

- L10 : navigation et tables réalignées sur images ; malus d’encombrement non quantifié gardé ouvert. Le sanctuaire B17 est assisté par un flux lu, sans nouveau test UI spécifique ; aucun domaine de sorts vampire inventé.
- L12 : Frénésie 21–30 et gaz 61–65 p.83 divergent de C0-L12-002 ; l’inventaire hérité reste intact, sans fausse exclusion. Bâclée au troisième manque d’équipage diffère de Dangereuse dans d’autres suppléments. Chance de Petite Waaagh à échéance de rencontre et soin de Grande Gueule mawRoll conservent leurs limites de raccordement UI/expiration.
- L15 : anomalies p.39, équipages 3/2, Pierrier Explosion 2/Dispersion 3, Mortier −20/−30, Tempête 50 % contre 120/75, Barge 600/800, profondeur Nautilus 30/30, Tube 100/Recharge 8 contre Torpille 1000/Recharge 5. Les valeurs et variantes restent sourcées sans correction inventée. Le résultat de gravure reste une donnée MJ selon RUN-ARTISANAT. Les couvertures partielles de talents sont précisées dans les notes.
- Les autres écarts, notamment L08 L’esprit sur le corps (Détermination source contre Chance consommée), et les variantes L09, restent décrits dans le rapport et les choix d’exécutant. Clore F0 ne les résout pas par du code.

## Sources d’instruction et suite éventuelle

Brief : C:/Users/arnot/.codex/worktrees/divin-v5/Outil MJ Warhammer/docs/plans-gpt/BRIEF_GPT_PHASE_F_AUDIT.md ; SHA-256 9c97672e69c7d41825d3d9364945add0101fd411ea2b175a261f0c8c48c6aff9. Consulter REGLES_COMMUNES_GPT.md, ARBITRAGES_MJ_21_10.md, DECISIONS_MJ_CHOIX_EXECUTANTS_22_10.md, DIVIN_RESERVE_DECISIONS.md, la section Phase F du PLAN_FIN_DE_PROJET.md, PLAN_GPT_PHASE_F.md, CHOIX_EXECUTANT_PHASE_F.md et les deux manifestes avant une nouvelle phase. Aucun ingrédient magique exigé, Petit V4 local et Q18 ciblé restent prioritaires.

Il n’y a plus de prompt de reprise de livre F0. Sur demande explicite du MJ, l’étape suivante est le choix F1 des règles à implanter, adapter ou écarter ; F2 nécessite un chantier d’implantation séparé. Ne pas transformer cette clôture documentaire en autorisation de développement, de publication ou de fusion.

**Ne rejouer aucun script de préparation, ajout ou clôture déjà exécuté.** Cela inclut finish-f0.mjs prepare/report, close-f0.mjs prepare/finish-report, les scripts l10/l12/l15-finish-* et tous les scripts historiques non idempotents. Le registre commité fait foi. Pour un contrôle seulement : node tools/audit/build-audit.mjs --check ; git diff --check. Ne pas relancer une suite verte juste pour ouvrir cette succession.

Environnement Windows : Node C:/Users/arnot/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe ; ajouter son dossier au PATH pour les sous-processus. TEMP/TMP E:/Outil MJ Warhammer/tmp/gpt-phase-f-runtime, hors checkout sur E:. Pas de copie de tests dans tmp/. Vendor/firebase/firebase-app.js garde ses fins de ligne mixtes héritées. Ne pas recréer la branche ou le worktree, ni employer stash/reset destructif. Aucune mémoire persistante modifiée ; les mémoires historiques n’ont servi qu’à la méthode et l’état courant est vérifié dans cette session.
