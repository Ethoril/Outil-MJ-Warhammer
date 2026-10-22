# Rapport GPT — Phase F0 : audit des règles

État : **audit du corpus en cours**. L06 a reçu sa revue F0, hors domaines explicitement renvoyés aux inventaires existants ; L05 a reçu le rattachement des noms ; L17 et L11 ont reçu leur revue des mécaniques F0. Les 22 autres suppléments restent à traiter, à partir de L13. Aucun achèvement des 26 livres n’est prétendu.

## Travail local et sources

Worktree dédié `E:/Outil MJ Warhammer/tmp/gpt-phase-f-worktree`, branche `gpt/phase-f`, créé depuis main à `ad092cdf78a747d08f1b1a0fd8acf27a97d6caf8`. Le brief, absent du main initial, a été lu dans le worktree demandé à `b1ab6c512acb6f919a00ef9d6b85fa1769b33c2b` ; SHA-256 `9c97672e69c7d41825d3d9364945add0101fd411ea2b175a261f0c8c48c6aff9`. La demande explicite « depuis main » prévaut sur l’ancienne base commune.

L06 : Livre de base V5 EN v2.pdf, 379 pages, SHA-256 `53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de`. Folio = page physique. L05 a été utilisé pour les noms français seulement, avec page physique = folio +2. Le manifeste décrit 26 livres et 3 968 pages physiques, contre 17 et 2 694 dans l’initial.

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
| L05 noms FR | FAIT, noms seuls | 775cbd9 | 4 054/4 054 ; 110,085 s, L05-full.log |
| L17 magie générale, variantes, divination, alchimie, objets, familiers, environnement | FAIT, 367 entrées dans la portée précisée ci-dessous | a92e503 | 4 054/4 054 ; 112,751 s, L17-full.log |
| L11 récolte, alchimie, équipement, objets et clauses manquantes E0 | FAIT, 167 entrées dans la portée précisée ci-dessous | commit du présent lot | 4 054/4 054 ; 112,301 s, L11-full.log |
| L13, L14, L16, L18-L26, L01-L04, L07-L10, L12, L15 | À faire dans cet ordre | — | — |

Logs complets ignorés sous tmp/audit/ : F00-full.log, F06-tests-full.log, F06-combat-full.log, F06-usages-full.log, F06-health-full.log, F06-downtime-full.log, F06-talents-full.log, F06-creation-full.log, F06-magic-full.log, F06-gear-full.log. Les sept tests initiaux d’outillage et les deux nouveaux comportements ont été développés rouge puis vert.

## Inventaire courant

**1 675 entrées ; 1 257 sélecteurs ouverts.** Répartition exacte par statut, domaine et livre générée dans `docs/AUDIT_REGLES.md` depuis `docs/AUDIT_REGLES.json`. Chaque lacune jouable du registre possède son sélecteur. Les purs renvois déjà inventoriés portent coveredBy, selectorEligible:false et une raison ; une clause réellement nouvelle reste sélectionnable. L06 conserve ses 1 141 identifiants ; L17 va de F-L17-0001 à F-L17-0367 et L11 de F-L11-0001 à F-L11-0167.

L05 rattache les intitulés et termes effectivement retrouvés ; le complément explicatif de chaque titre F0 reste une formulation d’audit. Les propositions V4 des suppléments sont enregistrées dans v5Proposal ; les nouvelles entrées L19-L26 porteront addedOn:2026-10-21. Aucune proposition n’est implantée. Les titres français L17/L11 sont des propositions d’audit, sans prétention de nom officiel.

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

Onze nouveaux tests d’outillage : audit-phase-f.test.js (7), audit-covered-selectors.test.js (1), audit-empty-page.test.js (1), audit-fr-names.test.js (2). **Aucune assertion de test existant modifiée.** Aucun nouveau test pour les seules données L17. Génération déterministe et --check, résumés limités, identifiants, références locales et correspondance exacte des sélecteurs contrôlés. LF et git diff --check verts avant les commits. Une suite verte ne démontre pas l’exhaustivité de l’audit.

Recette réelle déjà exécutée : **26/26 commandes vertes**, Node et parcours navigateur/cloud locaux compris ; reçu tmp/divin/recipe-receipt.json, log tmp/audit/recipe-F00.log, achevée le 22/10 à 21 h 28 (Paris). Sources protégées inchangées. Une nouvelle recette reste requise à la clôture du corpus.

## Suite

Continuer les 22 autres suppléments à partir de L13 dans l’ordre prescrit, un commit par livre après suite complète verte. Les sélecteurs F1 ne donnent aucune autorisation d’implantation F2. L’audit des 26 livres reste l’objectif de la reprise. La succession précise le point atteint en cas de limite de contexte.

Dernière cohérence des renvois : les neuf renvois hérités des premiers chapitres portent aussi une exclusion motivée de sélecteur ; aucun second choix pour C0/E0. Les statuts et identifiants restent conservés.

## L05 — noms français seulement

Livre de base FR.pdf, 355 pages ; SHA-256 `1ee2a2be032fe0a034b5670ac6ab5625ecc6804d25d7385a3f2614789a7d4f4a`. Folio +2 vérifié sur les pages consultées. Repérage au sommaire physique 4-6 ; recherche ciblée des intitulés de compétences, talents, États et Atouts sous tmp/audit/L05/. Le contrôle exact trouve **166 identités de talents**, et non le comptage provisoire annoncé pendant le travail ; elles rattachent **219 entrées** par nameFrSource. Les autres termes sont conservés dans terminologyFr, avec nom, folio, page physique, hash et restriction aux noms. Aucune entrée de règle L05 ajoutée : cela serait un doublon V4 contraire au brief.

Comparaison structurelle à 0513a70 : tous les champs mécaniques, résumés, statuts, propositions et identifiants des 1 141 entrées sont inchangés. Exemples de divergences volontairement non importées : Ambidextre en deux acquisitions dans L05, effets de Baratiner, dégâts de Frappe blessante, modificateurs des Atouts. Le nom officiel peut rester identique alors que la règle change. Les noms Empêtré, En flammes et Exténué sont rattachés comme noms FR, sans renommer les clés moteur locales.

Deux nouveaux tests, dans tests/audit-fr-names.test.js : rouge sur métadonnées FR non contrôlées et source absente de la synthèse, puis **11/11 contrôles d’audit verts**. Le validateur exige L05, son hash, le décalage exact et des noms/portées non vides ; la synthèse affiche les pages FR sans leur attribuer des règles. Total de nouveaux tests d’audit : onze ; aucun test hérité modifié. **100 entrées** portent aussi des termes français sourcés (certaines ont plusieurs termes). Suite complète : **4 054/4 054**, aucun échec, aucun test ignoré.

## L17 — Winds of Magic

Winds Of Magic.pdf, **224 pages**, folio = page physique ; SHA-256 `28283188fa70d51b8f1efe3e8c3214da7be885d2a444321744ead66d1ea2a150`, vérifié par l’extracteur sur le manifeste. Source V4 de 2022 : aucune règle V5 remplacée. **367 entrées**, dont 353 absent, 12 assiste, un rappel et une hors-granularite ; **343 nouveaux sélecteurs**. Onze purs renvois sont exclus de sélection ; les nouvelles clauses d’un domaine déjà inventorié restent distinguées.

Lecture suivie des règles p.19-53, des cadres propres aux Vents p.55,67,79,91,103,115,127,139 et des marques p.58,70,82,94,106,118,130,142 ; lecture p.150-172 et p.180-208, avec les pages narratives identifiées. P.6-18 : repérage de l’histoire, cadre mécanique de Perception p.17 lu ; page18 rendue et vue, fiction manuscrite. P.54-149 hors cadres cités : repérage des carrières, relations et passages chiffrés, profils/sorts laissés à leurs inventaires. P.173-179 : procédures générales et passages hors profils repérés ; profils et Traits renvoyés à E0. P.209-219 : repérage des scénarios/PNJ, objets autonomes p.211 lus et Traits p.214/217 reliés à E0. P.220-224 : index, licence p.222 et éléments de fin ; durée de licence recensée. P.203 rendue et vue : illustration. Cette portée distingue lecture des règles et repérage ciblé ; aucune seconde lecture indépendante de toutes les pages n’est prétendue.

Tableaux vus sur rendus : p.21,23,24,25 dans la reprise précédente ; p.45,48,51,58,70,82,94,106,118,130,142,153,156,157,160,166,180,185,188,190,191,199 dans celle-ci. Reçus et images sous tmp/audit/L17/ ou tmp/audit/L17-table-*.png, non publiés. Les extractions ne sont pas promues automatiquement en preuves de lecture.

- Le symbole Tour concerne **Subornation**, pas Corruption ; Psychométrie à +6 donne au moins trois informations, dont une pertinente. Les notes provisoires de succession ont été corrigées avant les données.
- Table de conservation p.156 : irrégularités visibles aussi sur rendu (notamment 45/88, 13/28, 13/24 et séparateurs manquants). Aucune normalisation. Table d’altérations p.157 lue visuellement, jamais par attribution des colonnes désalignées.
- P.50/51 : boussole deux/trois jours, miroir un/trois jours, loupe un jour/une semaine, télescope une/deux semaines. P.198/199 : jonction saturée +2 à +8 contre +1 à +8 ; la synthèse ajoute des effets de saturation corrompue et de Focalisation. Écarts conservés comme propositions, pas décisions.
- P.180/182 : écarts avec la conception des familiers conservés selon F-C16. Le choix du type reste distinct de l’ouverture générale décidée par le MJ. Le rituel de création garde la décision FAM-RITUEL : événement unique débitant un Destin ou une Résilience.
- P.53 : la poudre de Léonard augmente de deux les **dégâts** d’un incident de tir, pas son jet de table. L’alkahest produit **5 + DR En flammes**, pas des dégâts de ce montant. Ces distinctions ont été vérifiées avant la fusion des données.
- P.150 : la lecture de criticalWoundsSuffered au retour de transformation ne démontre pas son alimentation ; aucune écriture autre que l’initialisation trouvée. Les règles générales V4 restent absentes ou partielles selon la clause, avec les limites V5 dans les notes.

Couverture statique : vortex raccordé à previewSpellExecution et au traitement réel de fin de Tour du lanceur ; Test de Volonté déclaré, positions et cibles réelles saisis par le MJ. Imprégné et Assistant magique : moteurs, lecteurs de résolution et contrôles UI lus. Les autres procédures nouvelles ne sont pas déclarées couvertes par une simple saisie de Test/État. La boussole météoritique possède un rappel dans le sort de Puchta, sans flux général de fabrication ni gestion de direction de l’objet permanent.

Renvois : D0b-SYS-15 pour le système de rituels, D0b-L17-001 à 033 pour les sorts/rituels existants ; C0 pour les marques de Psychologie, la hache et les mailles maudites ; E0-T-246/247/248 pour Lanceur aléatoire, Siphon de sort et Œil maléfique ; E0-P-515 à 535 pour les profils de ce livre. Aucun second inventaire des sorts ou profils. Les listes de prix, décorations et effets seulement narratifs sans règle propre ne sont pas multipliées en sélecteurs. Le patronage nominatif reste hors périmètre PNJ ; ses objets transportables sont relevés séparément.

Validation des identifiants, références, résumés et sélecteurs : verte ; génération puis --check cohérents. Suite complète du lot : **4 054/4 054**, aucun échec, aucun ignoré, 112751,2164 ms, tmp/audit/L17-full.log. Après mise au propre des seules notes, les onze contrôles d’audit ont été rejoués avec succès. Comparaison structurelle à 775cbd9 : **les 1 141 entrées héritées L06 sont strictement identiques**, reçu tmp/audit/L17-integrity-receipt.json. Aucun js/, catalogue de jeu, outil ni test modifié pour ce livre. Recette complète à renouveler à la clôture réelle des 26 livres.

## L11 — The Imperial Zoo

The Imperial Zoo.pdf, **139 pages physiques**, folio = page physique ; SHA-256 `28ca57e24377cffb1a54a2374eb5758ebd74e28c4053b1beaf5704bd9e6743f4`, vérifié par l’extracteur. Source V4 datée du 8 février 2022 dans ses crédits. **167 entrées**, 163 absent, deux rappels et deux hors-granularite ; **70 renvois exclus de sélection**, **95 nouveaux sélecteurs**. Les statuts des purs renvois ne constituent pas une nouvelle qualification runtime exhaustive d’E0.

Portée : sommaires et introductions repérés p.1-9 ; expéditions p.10-95 parcourues par petites plages, encadrés de capacités et nouvelles clauses lus ; profils, valeurs et Traits existants laissés à E0. Règles de récolte p.98-102, préparations p.103-111, équipement p.112-114, artisanat/objets p.115-117 et valeur des bêtes vivantes p.120 lus. P.118-119 et121 : récit et conseils. P.122-133 : repérage ciblé des prétirés, équipement, talents et secrets ; procédure commune des secrets supplémentaires lue, pas nouvelle importation des fiches. P.134-137 : présentation et table des Traits consultées. P.138-139 : annonces. Aucune seconde lecture indépendante du livre ni recette de chacune de ses règles n’est prétendue.

Rendus vus : p.6,8,11,18,22,27,31,33,36,37,44,46,49,51,53,55,58,59,63,64,67,70,71,75,76,77,80,87,89,96,99,100,101,111,114,134-137. Les textes manuscrits entrelacés dans l’extraction ont été consultés sur image, sans leur inventer de chiffres. P.8/96 : cartes ; p.55/71 : illustrations. Preuve de portée : tmp/audit/L11-reading-scope.json. Les reçus d’extraction restent read:false : extraction et hash ne prouvent pas la lecture.

- Récolte : rareté, menace, quantité par Taille, identification, conservation, dégradation et recherche d’acheteur sont séparées. La table p.100 contient des prix qui divergent de la formule générale ; aucune correction inventée. Cockatrice dangereuse dans la table, mortelle dans l’exemple p.102 ; phrase de Corpse Render inachevée aussi sur image. Usages « réputés » de la dernière colonne et rumeurs des expéditions ne deviennent pas des effets garantis.
- Alchimie : poisons, antidotes et usages médicaux conservés ; liqueur du serpent devin exclue Q18. Les sources de matières ordinaires, volumes Enc et formes de préparation sont rattachés par preparationSource aux clauses concernées, sans rendement inventé. Wyvern’s Kiss : onguent p.105, potion/onguent p.111 ; Bloodblind : potion/cru p.106, potion seule p.111 ; Lurek’s Cure p.105 contre Laurek’s Curse p.111. Les prix seuls et les variantes de libellé ne créent pas des règles supplémentaires. Aucun ingrédient magique requis.
- Valeurs non inventées : gravité du critique d’ingestion de Flesh Blister, dégâts des filets à crochets, durées absentes de certaines potions, frontière de fraîcheur entre un et deux jours et quantité sous la première ligne de récolte. Forge Shield modifie les caractéristiques Agilité/Initiative de −20, pas les DR. Pierre assoiffée : 1d10 Tours imprimés, sans conversion silencieuse en Rounds. Tregara Sap : cartouche flèches/carreaux, texte opératoire carreaux d’arbalète ; divergence conservée.
- E0 : E0-T-096 à161 et249 portent 67 capacités précises, avec renvoi individuel exclu de F1 ; le plancher Féroce de début de Tour et ses trois exceptions renvoient à la clause commune d’E0-T-209, sans sa variante de réserve de groupe. Les traits génériques/variantes p.135-137 sont déjà dans E0-T-001 à095 et ne sont pas recopiés ; priorité V5, Petit maison et import sans second ajout de BE maintenus. Profils E0-P-001 à062 et prétirés E0-P-536 à541 laissés à E0. Les bois de Taal/Kurnous, les toiles venimeuses, l’esprit embrumé du chamane et la conduite des squigs sont des clauses manquantes, distinctes des seules étiquettes ou caractéristiques importées.
- Divin : les deux premiers cartouches de miracles du dieu Araignée p.15 n’ont pas été retrouvés dans les inventaires consultés ; ils sont recensés sans NI de sort inventé. Snare ‘Em Good garde son renvoi E0-T-097. La nuée ne reçoit pas un déclencheur de dégâts récurrents non écrit.
- Couverture : Wightseer/C0-L11-011 et Wulfshawl/C0-L11-012 sont deux rappels effectivement lisibles dans les notes des objets possédés via renderFicheDetails, appelé dans workspace-view et reserve ; leur Peur n’est pas déclarée automatisée. Les armes Skryre ont des données de catalogue et des textes Malepierre, mais leurs profils diffèrent de L11 et aucun moteur Malepierre n’a été trouvé dans keyword-engines. Elles ne sont pas déclarées entièrement absentes de tout affichage ; l’absence qualifie leur variante mécanique complète et son déclenchement. Conserve V5 ne préserve que des rations pendant BFM jours, pas les restes indéfiniment.
- Exclusions : Eagle Shank ne fournit pas d’effet propre au-delà du type dague ; prix et disponibilités seuls, rumeurs, scènes/PNJ, secrets narratifs et séquelles psychologiques Q18 ne créent pas de sélecteurs. La procédure commune des secrets supplémentaires donne une entrée, pas six copies. Choix F-C19 àF-C24 consignés ; aucun arbitrage, catalogue public ou code de jeu modifié.

Comparaison structurelle à a92e503 : **les 1 508 entrées héritées L06/L17 sont strictement identiques**, reçu tmp/audit/L11-integrity-receipt.json. Génération puis --check cohérents ; contrôles LF et git diff --check verts. Aucun outil ni test ajouté ou modifié pour ce livre. Suite complète du lot : **4 054/4 054**, zéro échec, annulé ou ignoré, **112300,6537 ms**, tmp/audit/L11-full.log. Aucun js/, arbitrage, dépendance, catalogue de jeu ni version modifié ; les quatre seuls fichiers de tests différents de main sont les tests d’audit nouveaux déjà présents à la reprise. Recette complète à renouveler à la clôture réelle du corpus ; l’ancienne recette ne prouve pas la lecture de L11.
