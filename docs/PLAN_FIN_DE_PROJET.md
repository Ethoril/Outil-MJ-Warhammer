# Plan de fin de projet — Outil MJ Warhammer (20 octobre 2026)

But : tout finir, y compris ce qui était hors périmètre. Arbitrages du MJ : `docs/divin/DIVIN_RESERVE_DECISIONS.md`, section « Arbitrages du MJ du 20 octobre (soir) ». Production au départ : 3.20.0.

## Méthode (s’applique à chaque lot)

- **Codage par GLM 5.3** (skill `deleguer-glm`), une session neuve par lot, `-MaxPrice 20` (le coût réel est environ 1/30 du plafond affiché), worktree LF dédié, jamais `git stash`.
- **Tests d’abord** : le lot commence par ses tests (qui échouent pour la bonne raison), puis le code, la commande d’acceptation, la suite complète, un commit.
- **Prompts directifs** : emplacements donnés par lignes ou par texte à chercher, plan pas à pas ; les assertions qui épinglent un statut, une liste d’effets ou un décompte du contrat modifié peuvent être mises à jour, et seulement elles ; ne jamais plier une règle pour faire passer un test (arrêt « BLOCKED » documenté).
- **Contrôle par l’orchestrateur** : suite complète, relecture du diff des fichiers de combat partagés, mutation sur les points sensibles, recette complète (`node tools/run-divine-recipe.mjs`) avant toute publication.
- **Inventaires d’abord** pour les phases B à F : un rapport JSON + Markdown par phase, puis les décisions de règle ouvertes présentées au MJ en sélecteurs, puis les lots.
- **Publication** : une version par phase (ou par lot important), seulement sur feu vert du MJ.
- **Journal** : chaque lot est ajouté à `docs/divin/GLM_EVALUATION.json`.

## État au 20/10 (nuit)

Arrêt sur crédits Mistral épuisés (402 « Out of credits »). Faits : A1, A2 (publiés en 3.20.1), inventaires B0 (`docs/divin/COURROUX_INVENTAIRE.*`, 69 entrées) et D0a (`docs/lot3/LOT4_TRADITIONS_BASE.*`, 7 traditions). À relancer : A3 à A12 (prompts dans `docs/PLAN_GLM_PHASE_A.md`), inventaires C0 (Brisé), D0b (traditions des suppléments), E0 (bestiaires), prompts sauvegardés dans `docs/plans-glm/inv-*.md` ; pour A3-A12, prompt : « Read docs/PLAN_GLM_PHASE_A.md: the Global rules section and ONLY lot A<n>; execute it exactly as written… ».

Mise à jour du 21/10 : **phase A terminée** (A3-A12 par GPT, brief `docs/plans-gpt/`, rapport `docs/plans-gpt/RAPPORT_GPT_PHASE_A.md`), publiée en **3.21.0**. Inventaires faits : B0 (Courroux, 11 questions), C0 (Brisé, 20), D0a (traditions de base, 9), D0b (suppléments et runes, 21), E0 (bestiaires, 30). Prochaine étape : arbitrages du MJ en sélecteurs, puis lots B, C, D, E.

## Phase A — Arbitrages du chantier divin (12 lots)

| Lot | Contenu | Emplacements | Risque |
| --- | --- | --- | --- |
| A1 | R8 : « Intrépide (Ennemi) » → « Sans peur [Ennemi] » dans les sources des miracles, le générateur et les contrats générés. | `docs/divin/sources/miracles/*.mjs`, `tools/build-v5-divine-contracts.mjs` (chercher « Intrépide ») | faible |
| A2 | R22 : Hurlement du loup et Roi de la Nature refusent toute cible autre que le prêtre, comme Œil de l’aigle et Yeux de chat. | `js/core/v5-divine-effects-summon.js` (chercher le refus existant d’Œil de l’aigle) | faible |
| A3 | R17/R23 : masquer les cases « Destinataires » quand `hasImplicitCasterTarget` ; adapter `tests/divin-v5-p4c-browser.mjs`. | formulaire de prière (`buildDivineForm`, UI des prières) | faible |
| A4 | R11 : Dévotion de la Guerrière : liste des ennemis présents + texte libre en secours. | `inputFields` de l’effet `grant-talent` avec `specializationFrom: 'input'` | faible |
| A5 | R26 : reçu d’un critique de sort : ajouter « +20 à la gravité (Morsure du Loup) » si le lanceur porte une couche `criticalSeverityBonus`. | `js/core/v5-spell-contracts.js` (chercher « Blessure Critique d’incantation : sévérité ») | faible |
| A6 | R30 : Fortune généreuse : l’aperçu signale quand l’inversion transformerait un échec en réussite ; le panneau affiche l’indication à côté de la case. | `js/core/v5-store-action.js` (bloc Fortune généreuse), `js/ui/resolution-panel.js` | moyen |
| A7 | R33 : Faire monter les enjeux : nouvel effet générique à usage unique ; prochain Test de la cible : réussite → DR ≥ +6, échec → DR ≤ −6. | contrat `ranald:up-the-stakes`, lecteur dans la résolution (après calcul du Test de l’acteur) | moyen |
| A8 | R36 : rappel « Attaque Rapide disponible » au début de chaque Round pour les porteurs d’une couche `freeAttack`. | lieu où sont produits les rappels de début de Round (moteur de Tour V5) | moyen |
| A9 | R38 : relier chaque critique enregistré aux États qu’il a posés (`stateIds`) ; Larmes de Shallya propose ces États au retrait, cochés par le MJ. | `appendCriticalWoundRecords` (`resolution.js`), effet `heal-critical` | moyen |
| A10 | D4 : bénédiction de Chance : relance gratuite aussi quand l’acteur PERD le Test opposé avec un Test propre réussi. | `js/core/v5-store-action.js` (bloc `original.success === false`) | élevé |
| A11 | Registre des critiques visible sur la fiche du participant + bouton « Guérir » manuel (commande annulable). | rendu du participant (UI), nouvelle commande du store | moyen |
| A12 | R15 : participant ajouté en cours de Round inséré à son rang d’Initiative pour les Tours non joués (moteur V5). Caractérisation d’abord (ajout manuel, invocation magique, invocation divine), puis le correctif. | moteur de Tour V5, `store.js` | élevé |

Publication 3.21.0 après la phase A.

## Phase B — Courroux des dieux complet

- B0 inventaire : chaque entrée de la table de Courroux et chaque règle de Péché/leçon du livre V5 (et suppléments) → statut actuel (automatisé, assisté, rappel, absent) ; rapport `docs/divin/COURROUX_INVENTAIRE.{json,md}`.
- Sélecteurs MJ pour les lectures de règle ouvertes.
- Lots B1… : automatiser ou assister chaque effet qui a une mécanique (États, dégâts, pertes de Caractéristiques, interdictions de prier, durée), sur le modèle des effets divins génériques.

## Phase C — Brisé avancé

- C0 inventaire : règles de Brisé (fuite, ralliement, effets sur les alliés, Peur/Terreur liées, cas des suppléments) → statut actuel ; rapport `docs/COURAGE_BRISE_INVENTAIRE.{json,md}`.
- Sélecteurs MJ, puis lots C1…

## Phase D — Magie : autres traditions et compléments

- D0 inventaire par tradition (pages, sorts, règles propres : incantation, Fléau/Corruption, ingrédients, familiers) : Haie (base + AOTE3 p.60-65), Sorcellerie, Démonologie, Nécromancie, Chaos (Nurgle, Slaanesh, Tzeentch), Vampires (Sylvania), Elfes noirs (Temple of Spite), Grande Gueule (AOTE2), Runes naines (Dwarf Players Guide, Lords of Stone and Steel), compléments des Collèges (Winds of Magic et autres). Rapport `docs/lot3/LOT4_INVENTAIRE_TRADITIONS.{json,md}`.
- Sélecteurs MJ (règles propres à chaque tradition, noms français).
- Lots par tradition, dans le circuit du lot 3 : catalogue des sorts, contrats V5 (`js/data/v5-spell-contracts.json`), effets génériques nouveaux si besoin, tests de contrat, intégration aux fiches.
- Magie skaven (ajout du MJ, 22/10) : lot de tradition sur le modèle des autres (inventaire des sources, contrats, tests).
- Runes naines à part : conception d’un moteur de runes (gravure, runes d’arme/armure/talisman, Runes de Maître), soumise au MJ avant code.

## Phase E — Bestiaires et Traits de créature

- E0 inventaire : Traits de créature (livre de base + suppléments) → couverture moteur actuelle ; profils de créatures et PNJ par livre (livre de base, Imperial Zoo, Sylvania, Lustria, Temple of Spite, Sea Wardens…).
- E1… : automatiser les Traits (en commençant par les plus fréquents), puis importer les profils en données (format des profils existants, importables dans un combat).
- Sélecteurs MJ pour les Traits ambigus.
- Mots-clés de participants (demande du MJ, 22/10, voir `docs/ARBITRAGES_MJ_21_10.md`) : référentiel hiérarchisé figé mais évolutif (ajout MJ contrôlé contre doublons et fautes), porté par les profils et les PJ ; Haine, Animosité, Préjugé, Sans peur [Ennemi] et effets « contre les X » appliqués automatiquement.

## Phase F — Audit exhaustif des 2694 pages, sans implantation automatique

- F0 : extraction règle par règle, livre par livre (`pdftotext`), comparaison avec la couverture de l’outil → registre `docs/AUDIT_REGLES.json` (règle, source, statut actuel).
- F1 : page de sélection pour le MJ (artifact ou écran de l’outil) : pour chaque règle non couverte, « implanter / ne pas implanter » et « règle complète / adaptée (texte de l’adaptation) », pour préserver les règles maison. Décisions enregistrées dans le dépôt.
- F2… : lots uniquement pour les règles retenues, avec la version choisie (complète ou adaptée).

## Livre de base V5 v3 (décidé le 29/10)

Le MJ a tranché les 56 changements de la v3 du 27/10/2026 (51 reportés, 5 conservés ; page de décision et arbitrages dans `tmp/f1-reperage/ARBITRAGES_25_10.md`). La feuille « Aides de Jeu » est déjà à jour ; le lot outil (code, bestiaire de base, contrats de prières, tables) suit la publication de F2. Les yards du livre s'écrivent avec la même valeur en mètres.

## Phase R — Ménage et refactorisation (décidée le 29/10, après F2 et la v3, avant G)

Trois lots, du moins risqué au plus risqué :
1. **Ménage du disque** : supprimer worktrees et branches déjà fusionnés, archiver dans `docs/archives/` les rapports et arbitrages encore utiles, vider le reste de `tmp/`. Liste soumise au MJ avant tout effacement.
2. **Tests** : un fichier par domaine plutôt qu'un par passe de revue, doublons retirés ; couverture mesurée avant et après, jamais en baisse ; suite rapide et parcours navigateur séparés.
3. **Code** : découper `store.js`, `resolution.js`, `resolution-panel.js`, `workspace-view.js` par domaine et harmoniser le style, **sans changement de comportement** ; petites étapes publiables, suite et recette vertes, contre-vérification indépendante à chaque étape.

## Passe de cohérence outil ↔ feuille source (avant G)

Vérifier que tout ce qui est implanté (Talents, Traits, sorts, prières, mots-clés) concorde avec la feuille source du MJ ; lister les écarts à reporter dans la feuille (ex. Master and Commander, ajouté à part en 22/10).

## Phase G — Recette à la table

Parcours guidé de recette (`docs/RECETTE_UTILISATEUR.md` mis à jour), retours du MJ, lots correctifs.

## Phase H — Synchronisation fiche ↔ outil (écriture en retour)

Décision du MJ (21/10) : l’outil réécrira sur la fiche du site des fiches (https://ethoril.github.io/ennemi-interieur-wfrp4/) les valeurs durables qu’il modifie en jeu. À faire **après** les phases B à F, pour disposer de toutes les variables : registre `docs/VARIABLES_PERSISTANTES_PJ.md` tenu à jour par chaque lot. Contenu : champs ajoutés à la fiche (Péchés, Corruption, culte explicite, pénitences, et le reste du registre), import étendu, écriture en retour et ses règles (moment, conflits, annulation).

**Rappel du MJ (22/10) — projet des fiches (ennemi-interieur-wfrp4, hors dépôt de l’outil)** : exploiter le référentiel de mots-clés de la phase E dans les fiches (mots-clés du personnage, spécialisations de Haine, Animosité, Préjugé, Sans peur [Ennemi]… choisies dans la même liste), avec la même source de vérité que l’outil. À rappeler au MJ à l’ouverture de la phase H.

## Ordre et jalons

A (3.21.0) → B → C (3.22.0) → D (une version par tradition ou par paire) → E (une version par bestiaire) → F (inventaire, puis sélecteurs, puis lots) → v3 du livre de base → R (ménage et refactorisation) → passe de cohérence → G → H.
