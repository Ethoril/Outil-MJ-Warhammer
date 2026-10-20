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
- Runes naines à part : conception d’un moteur de runes (gravure, runes d’arme/armure/talisman, Runes de Maître), soumise au MJ avant code.

## Phase E — Bestiaires et Traits de créature

- E0 inventaire : Traits de créature (livre de base + suppléments) → couverture moteur actuelle ; profils de créatures et PNJ par livre (livre de base, Imperial Zoo, Sylvania, Lustria, Temple of Spite, Sea Wardens…).
- E1… : automatiser les Traits (en commençant par les plus fréquents), puis importer les profils en données (format des profils existants, importables dans un combat).
- Sélecteurs MJ pour les Traits ambigus.

## Phase F — Audit exhaustif des 2694 pages, sans implantation automatique

- F0 : extraction règle par règle, livre par livre (`pdftotext`), comparaison avec la couverture de l’outil → registre `docs/AUDIT_REGLES.json` (règle, source, statut actuel).
- F1 : page de sélection pour le MJ (artifact ou écran de l’outil) : pour chaque règle non couverte, « implanter / ne pas implanter » et « règle complète / adaptée (texte de l’adaptation) », pour préserver les règles maison. Décisions enregistrées dans le dépôt.
- F2… : lots uniquement pour les règles retenues, avec la version choisie (complète ou adaptée).

## Phase G — Recette à la table

Parcours guidé de recette (`docs/RECETTE_UTILISATEUR.md` mis à jour), retours du MJ, lots correctifs.

## Ordre et jalons

A (3.21.0) → B → C (3.22.0) → D (une version par tradition ou par paire) → E (une version par bestiaire) → F (inventaire, puis sélecteurs, puis lots) → G.
