# Rapport GPT — Phase F0 : audit des règles

État : **audit du corpus en cours**. L06 a reçu sa revue F0, hors domaines explicitement renvoyés aux inventaires existants ; L05 a reçu le rattachement des noms. Les 24 suppléments restent à traiter. Aucun achèvement des 26 livres n’est prétendu.

## Travail local et sources

Worktree dédié `E:/Outil MJ Warhammer/tmp/gpt-phase-f-worktree`, branche `gpt/phase-f`, créé depuis main à `ad092cdf78a747d08f1b1a0fd8acf27a97d6caf8`. Le brief, absent du main initial, a été lu dans le worktree demandé à `b1ab6c512acb6f919a00ef9d6b85fa1769b33c2b` ; SHA-256 `9c97672e69c7d41825d3d9364945add0101fd411ea2b175a261f0c8c48c6aff9`. La demande explicite « depuis main » prévaut sur l’ancienne base commune.

L06 : Livre de base V5 EN v2.pdf, 379 pages, SHA-256 `53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de`. Folio = page physique. L05 sera utilisé pour les noms français seulement, avec page physique = folio +2. Le manifeste décrit 26 livres et 3 968 pages physiques, contre 17 et 2 694 dans l’initial.

Aucun fichier js/ ni test hérité modifié ; aucun changement de règle, arbitrage, catalogue public ou version. Commits locaux seulement ; aucun push, publication ou fusion. Les contrôles d’intégrité finaux seront renouvelés à la clôture du corpus.

## Lots et reçus

| Lot | État | Commit | Suite complète avant commit |
| --- | --- | --- | --- |
| Plan F0 | FAIT | 3149286 | contrôles initiaux |
| Outillage | FAIT | ae76525 | 4 050/4 050 |
| L06 Tests/Destin/Chance p.129-133, 265-266 | FAIT, 46 entrées | f4483bb | 4 050/4 050 |
| L06 Combat/environnement p.161-169 | FAIT, 125 entrées | 65be80b | 4 050/4 050 |
| Rapport initial partiel | FAIT | ebefeac | 4 050/4 050 |
| L06 Usages p.134-160 | FAIT, 122 entrées | f904938 | 4 050/4 050 |
| L06 Santé/États/Corruption p.170-189 | FAIT, 246 entrées | 8d79e38 | 4 051/4 051 |
| L06 Entre-aventures p.190-201 | FAIT, 87 entrées | 54ed92d | 4 052/4 052 ; 105,015 s |
| L06 Compétences/talents p.109-128 | FAIT, 225 entrées | 073dbf7 | 4 052/4 052 ; 119,655 s |
| L06 Création/carrières/compatibilité | FAIT, 49 entrées | 4f7ae81 | 4 052/4 052 ; 106,970 s |
| L06 Magie générale p.230-239 | FAIT, 89 entrées | 8482611 | 4 052/4 052 ; 106,348 s |
| L06 Équipement p.296-317 | FAIT, 129 entrées | f8879ee | 4 052/4 052 ; 105,924 s |
| L06 Dernière passe : religion, MJ/voyage, procédures animales | FAIT, 23 entrées | 0513a70 | 4 052/4 052 ; 108,503 s, F06-closure-final-full.log |
| L05 noms FR | FAIT, noms seuls | commit du présent lot | 4 054/4 054 ; 110,085 s, L05-full.log |
| L17, L11, L13, L14, L16, L18-L26, L01-L04, L07-L10, L12, L15 | À faire dans cet ordre | — | — |

Logs complets ignorés sous tmp/audit/ : F00-full.log, F06-tests-full.log, F06-combat-full.log, F06-usages-full.log, F06-health-full.log, F06-downtime-full.log, F06-talents-full.log, F06-creation-full.log, F06-magic-full.log, F06-gear-full.log. Les sept tests initiaux d’outillage et les deux nouveaux comportements ont été développés rouge puis vert.

## Inventaire courant

**1 141 entrées ; 819 sélecteurs ouverts.** Répartition exacte par statut, domaine et livre générée dans `docs/AUDIT_REGLES.md` depuis `docs/AUDIT_REGLES.json`. Chaque lacune jouable du registre possède son sélecteur. Les purs renvois déjà inventoriés portent coveredBy, selectorEligible:false et une raison ; une clause réellement nouvelle reste sélectionnable. Le dernier identifiant est F-L06-1141.

L05 rattache les intitulés et termes effectivement retrouvés ; le complément explicatif de chaque titre F0 reste une formulation d’audit. Les propositions V4 de suppléments seront enregistrées dans v5Proposal ; les nouvelles entrées L19-L26 porteront addedOn:2026-10-21. Aucune proposition n’est implantée.

## Portée de lecture L06

- P.1-7 : sommaire, crédits, introduction et notation des dés. P.8-22 : repérage de la fiction et des conseils. Les pages sans extraction 8,9,12,13,16,18 ont été rendues et vues : cartes, histoire ou illustrations ; aucune règle déduite d’un texte absent.
- P.23-44 : procédures de création et de carrière lues ; allocations d’espèces repérées p.26-35. Tableau des caractéristiques p.38 vérifié visuellement.
- P.45-108 : repérage ciblé des carrières, listes de progression et conseils narratifs ; pas de nouvelle procédure autonome repérée hors règles générales p.43-44.
- P.109-159, 161-201 : lecture des chapitres et audit par clauses. P.160 : illustration.
- P.202-229 : repérage religion et lecture des règles communes. Les cultes, commandements, péchés/Courroux et prières restent dans les inventaires divins ; aucun réinventaire des effets de prières.
- P.230-239 : magie générale et chaque conséquence mécanique des tables d’incidents. P.240-260 : traditions, attributs et sorts renvoyés au chantier magie existant.
- P.261-271 : conseils MJ et procédures repérés ; les tables de rencontres sans mécanique propre restent hors F0. P.265-266 étaient déjà auditées.
- P.272-295 : repérage des passages mécaniques du contexte ; justice p.282 et calendrier p.289 recensés.
- P.296-317 : lecture du guide d’équipement ; pas de recopie des listes marchandes sans effet propre.
- P.318-363 : bestiaire renvoyé à E0 ; lecture des procédures générales p.318 et des gabarits p.353-354 pour repérer ce qui manque. Les profils et Traits ne sont pas réinventoriés.
- P.364-370 : appendices lus et comparés aux pages du chapitre ; conversion et option de progression individuelle recensées. P.371-376 : index ; p.377-378 : fiches ; p.379 rendue et vue blanche.

Les extractions unitaires et leurs reçus sont sous tmp/audit/. Les hashes vérifient la provenance, pas une lecture. Les reçus read:false ne sont pas automatiquement promus en certification. Un repérage ciblé est distingué ici d’une lecture suivie ; aucune seconde lecture indépendante de tout le livre n’est prétendue.

## Renvois aux domaines déjà inventoriés

- Religion : `docs/divin/DIVIN_AUDIT_CLAUSES.json` (L06:common-rule:little-prayers et les trois accès de p.215), `DIVIN_INVENTAIRE.json`, `COURROUX_INVENTAIRE.json` (l06-217-*, l06-218-*, l06-219-*), contrats communs prayer-skill, prayer-access, prayer-success, prayer-voice, prayer-repeat, blessing-scaling, miracle-scaling. Les descriptions de ces registres ne remplacent pas leur suivi d’implantation.
- Brisé, Peur, Terreur et talents associés : `docs/COURAGE_BRISE_INVENTAIRE.json`, références C0-L06 dans les entrées concernées. L’exception de Terreur décidée par le MJ est préservée.
- Traditions et sorts : `docs/lot3/LOT4_TRADITIONS_BASE.json` et registres LOT4_TRADITIONS_*.json ; catalogue de contrats existant pour les domaines déjà présents. Aucun ajout de sort.
- Bestiaire et Traits : `docs/BESTIAIRE_INVENTAIRE.json`, E0-T-* et profils L06 E0-P-063 à E0-P-121, dont les gabarits E0-P-112 à E0-P-118. Les localisations et procédures générales manquantes sont recensées séparément, sans recopier les profils.

## Difficultés et interprétations

Choix F-C01 à F-C12 dans `CHOIX_EXECUTANT_PHASE_F.md`. Les règles MJ restent prioritaires : Petit V4 local, aucun ingrédient magique, Q18 sans extension arbitraire à toute médecine ou corruption.

L’audit de couverture est statique : lecture des contrats, moteurs et lecteurs UI/Store. Une saisie libre de DR ne couvre pas le déclencheur ; une fonction isolée ne prouve pas un flux utilisateur. Une donnée de fiche importée ne démontre pas son calcul ou sa progression dans ce dépôt. Les talents sont séparés lorsque les statuts diffèrent ; leur texte épinglé et leur contrat actif ont été vérifiés.

- Tableaux désalignés p.131,165,166,191 contrôlés visuellement, ainsi que p.38,236 et364. Surpuissance p.236 : cellules fusionnées, paliers vérifiés sur rendu.
- Surpris : table p.166 à +1 DR, description p.187 à +2 DR ; moteur à +2. Aucune correction ni décision nouvelle.
- Esquive montée p.168 : Désavantage imprimé contre pénalité typée −2 DR du moteur. Sa suppression par un talent ne résout pas cette divergence générale.
- Les critiques du bras p.174 et365 ont les mêmes seuils après comparaison ; certains renvois de pages diffèrent. Aucun second inventaire de leurs vingt effets.
- Certaines suites d’incidents sont partiellement raccordées : l’État ou les Blessures sont appliqués, le Test conditionnel reste un reçu MJ. Projection, aura et conséquences sur d’autres cibles restent distinguées du lanceur.
- Les malus d’Agilité p.299 modifient une caractéristique ; ils ne sont pas convertis en DR. Les deux résidus de −10 aux Tests dans les mutations p.189 reçoivent une proposition −1 DR documentée.
- Une page vide en texte reçoit textEmpty:true et vérification visuelle requise ; l’extraction peut continuer sans en inventer le contenu.
- Les valeurs de prix ou de profil sans mécanique propre ne créent pas une entrée artificielle. Un barème homogène peut constituer une entrée ; des conséquences distinctes sont séparées.

## Vérifications et limites

TEMP/TMP : `E:/Outil MJ Warhammer/tmp/gpt-phase-f-runtime`, même lecteur mais hors checkout. Les faux échecs initiaux E2 et reçu E0 absent ont été résolus sans modifier les assertions héritées.

Neuf nouveaux tests d’outillage : audit-phase-f.test.js (7), audit-covered-selectors.test.js (1), audit-empty-page.test.js (1). **Aucune assertion de test existant modifiée.** Génération déterministe et --check, résumés limités, identifiants, références locales et correspondance exacte des sélecteurs contrôlés. LF et git diff --check verts avant les commits. Une suite verte ne démontre pas l’exhaustivité de l’audit.

Recette réelle déjà exécutée : **26/26 commandes vertes**, Node et parcours navigateur/cloud locaux compris ; reçu tmp/divin/recipe-receipt.json, log tmp/audit/recipe-F00.log, achevée le 22/10 à 21 h 28 (Paris). Sources protégées inchangées. Une nouvelle recette reste requise à la clôture du corpus.

## Suite

Continuer les 24 suppléments dans l’ordre prescrit après validation de L05, un commit par livre après suite complète verte. Les sélecteurs F1 ne donnent aucune autorisation d’implantation F2. L’audit des 26 livres reste l’objectif de la reprise, sans arrêt à ce jalon.

Dernière cohérence des renvois : les neuf renvois hérités des premiers chapitres portent aussi une exclusion motivée de sélecteur ; aucun second choix pour C0/E0. Les statuts et identifiants restent conservés.

## L05 — noms français seulement

Livre de base FR.pdf, 355 pages ; SHA-256 `1ee2a2be032fe0a034b5670ac6ab5625ecc6804d25d7385a3f2614789a7d4f4a`. Folio +2 vérifié sur les pages consultées. Repérage au sommaire physique 4-6 ; recherche ciblée des intitulés de compétences, talents, États et Atouts sous tmp/audit/L05/. Le contrôle exact trouve **166 identités de talents**, et non le comptage provisoire annoncé pendant le travail ; elles rattachent **219 entrées** par nameFrSource. Les autres termes sont conservés dans terminologyFr, avec nom, folio, page physique, hash et restriction aux noms. Aucune entrée de règle L05 ajoutée : cela serait un doublon V4 contraire au brief.

Comparaison structurelle à 0513a70 : tous les champs mécaniques, résumés, statuts, propositions et identifiants des 1 141 entrées sont inchangés. Exemples de divergences volontairement non importées : Ambidextre en deux acquisitions dans L05, effets de Baratiner, dégâts de Frappe blessante, modificateurs des Atouts. Le nom officiel peut rester identique alors que la règle change. Les noms Empêtré, En flammes et Exténué sont rattachés comme noms FR, sans renommer les clés moteur locales.

Deux nouveaux tests, dans tests/audit-fr-names.test.js : rouge sur métadonnées FR non contrôlées et source absente de la synthèse, puis **11/11 contrôles d’audit verts**. Le validateur exige L05, son hash, le décalage exact et des noms/portées non vides ; la synthèse affiche les pages FR sans leur attribuer des règles. Total de nouveaux tests d’audit : onze ; aucun test hérité modifié. **100 entrées** portent aussi des termes français sourcés (certaines ont plusieurs termes). Suite complète : **4 054/4 054**, aucun échec, aucun test ignoré.
