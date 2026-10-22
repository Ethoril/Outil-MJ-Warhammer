# Rapport GPT — Phase F0 : audit des règles

État au 22 octobre 2026 : **audit en cours, non clôturé**. La reprise demandée poursuit le corpus. Les décomptes décrivent seulement les règles recensées.

## Cadre

Worktree : `E:/Outil MJ Warhammer/tmp/gpt-phase-f-worktree`, branche `gpt/phase-f`, depuis main à `ad092cdf78a747d08f1b1a0fd8acf27a97d6caf8`. Brief lu dans le worktree demandé à `b1ab6c512acb6f919a00ef9d6b85fa1769b33c2b`, absent du main initial ; SHA-256 `9c97672e69c7d41825d3d9364945add0101fd411ea2b175a261f0c8c48c6aff9`. L’instruction explicite « depuis main » prévaut sur l’ancienne base commune.

Aucun changement de jeu, d’arbitrage, de catalogue public ou de version. Aucun fichier js/ ni test hérité modifié. Commits locaux, aucun push, fusion ou publication.

## Lots

| Lot | État | Commit |
| --- | --- | --- |
| Plan | FAIT | 3149286 |
| Outillage | FAIT | ae76525 |
| L06 Tests, Destin/Chance p.129-133, 265-266 | FAIT, 46 entrées | f4483bb |
| L06 Combat, environnement p.161-169 | FAIT, 125 entrées | 65be80b |
| Premier rapport partiel | FAIT | ebefeac |
| L06 Usages p.134-160 | FAIT, 122 entrées | f904938 |
| L06 Santé/États/Corruption p.170-189 | FAIT, 246 entrées | 8d79e38 |
| L06 Entre-aventures p.190-201 | FAIT, 87 entrées | 54ed92d |
| L06 Compétences/talents p.109-128 | FAIT, 225 entrées | 073dbf7 |
| L06 Création, carrières, compatibilité p.6, 23-44, 364 | FAIT, 49 entrées ; 4 052/4 052 tests (106,970 s), F06-creation-full.log | 4f7ae81 |
| L06 Magie générale p.230-239 | FAIT, 89 entrées ; 4 052/4 052 tests (106,348 s), F06-magic-full.log | 8482611 |
| L06 Équipement p.296-317 | FAIT, 129 entrées ; 4 052/4 052 tests (105,924 s), F06-gear-full.log | commit du présent lot |
| L06 autres chapitres | À faire | — |
| L05 noms FR | À faire après L06 | — |
| L17, L11, L13, L14, L16, L18-L26, L01-L04, L07-L10, L12, L15 | À faire dans cet ordre | — |

Aucun livre n’est déclaré entièrement terminé. Corpus : 26 livres, 3 968 pages physiques ; manifeste initial : 17 livres, 2 694 pages. L19-L26 porteront `addedOn:"2026-10-21"`.

## Lecture et données

L06 : Livre de base V5 EN v2.pdf, 379 pages physiques ; SHA-256 `53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de`. Folio = page physique. L05 sera consulté pour les noms seulement ; ses mécanismes V4 ne remplaceront pas L06.

Registre : **851 entrées et 608 sélecteurs ouverts**. Décomptes par livre, domaine et statut générés dans `docs/AUDIT_REGLES.md`. Chaque lacune jouable possède un sélecteur. Les purs renvois déjà inventoriés portent coveredBy et, si nécessaire, selectorEligible:false avec raison ; aucune certification de couverture n’en découle.

Lecture utilisée pour les lots : L06 p.109-159, 161-201, 265-266. P.160 : illustration. Sommaire repéré ; appendices en cours, sans clôture. Les autres extractions ne prouvent pas leur lecture. Reçus page par page dans tmp/audit/ : hashes, page physique, `read:false` conservé sans promotion automatique en certification.

## Interprétations et difficultés

Audit statique des contrats, moteurs et lecteurs UI/Store ; aucun parcours de jeu exhaustif prétendu. Un champ de DR libre ne couvre pas son déclencheur ; une fonction sans lecteur applicatif ne prouve pas un parcours assisté. Les valeurs gérées dans une fiche externe ne démontrent pas leur calcul dans ce dépôt. Source épinglée et statut courant vérifiés pour les talents.

Choix F-C01 à F-C12 dans `CHOIX_EXECUTANT_PHASE_F.md`. Petit V4 local, aucun ingrédient magique et Q18 préservés ; pas d’extension arbitraire à toute médecine ou corruption. Les fonctions isolées de Ralliement/Intimidation ne sont pas promues en couverture utilisateur.

- Tableaux p.131, 165, 166 et 191 vérifiés visuellement ; rendus sous tmp/audit/. Aucun seuil attribué sur extraction désalignée.
- Surpris : table p.166 à +1 DR, État p.187 à +2 DR ; moteur à +2. Aucun nouvel arbitrage.
- Esquive montée p.168 : Désavantage imprimé contre pénalité typée −2 DR du moteur. La suppression par un talent ne résout pas cette divergence générale.
- Page vide en extraction : reçu textEmpty:true et vérification visuelle requise, sans deviner ; le lot peut continuer.
- Deux résidus de modificateurs −10 aux Tests dans les mutations p.189 : proposition −1 DR documentée ; les valeurs de caractéristiques ne subissent pas cette conversion.

## Vérifications

TEMP/TMP : `E:/Outil MJ Warhammer/tmp/gpt-phase-f-runtime`, même lecteur, hors checkout. Le premier essai avait un faux échec E2 et aucun reçu E0 initial ; préconditions corrigées sans toucher aux tests.

| Lot | Suite complète | Log sous tmp/audit/ |
| --- | --- | --- |
| Outillage / Tests / Combat | 4 050/4 050 | F00-full.log, F06-tests-full.log, F06-combat-full.log |
| Usages | 4 050/4 050 | F06-usages-full.log |
| Santé/États/Corruption | 4 051/4 051 | F06-health-full.log |
| Entre-aventures | 4 052/4 052 ; 105,015 s | F06-downtime-full.log |
| Talents | 4 052/4 052 ; 119,655 s | F06-talents-full.log |

Neuf nouveaux tests d’outillage, rouge puis vert pour les nouveaux comportements : `audit-phase-f.test.js` (7), `audit-covered-selectors.test.js` (1), `audit-empty-page.test.js` (1). Aucune assertion héritée modifiée. Génération déterministe, contrôle --check, LF et diff --check. Les tests attestent leurs assertions, pas l’exhaustivité de lecture.

Recette réelle déjà exécutée : **26/26 commandes vertes**, Node et parcours navigateur/cloud locaux compris ; reçu tmp/divin/recipe-receipt.json, log tmp/audit/recipe-F00.log, achevée le 22/10 à 21 h 28 (Paris). Sources protégées inchangées. Nouvelle recette requise à la clôture.

## Reste

Terminer L06 : religion hors domaines déjà inventoriés, magie générale, procédures MJ/voyage et équipement. Puis L05 et les autres livres dans l’ordre du plan. Dernier identifiant : F-L06-0900. Les sélecteurs F1 n’autorisent aucune implantation en F0.

Complément création/carrières : registre à 900 entrées et 657 sélecteurs. Repérage ciblé p.7-22 (introduction et fiction), p.26-35 (allocations d’espèce) et p.45-108 (profils de carrière, listes et conseils narratifs sans nouvelle mécanique autonome repérée). Lecture des procédures p.23-25, 36-44. Tableau p.38 vérifié visuellement. Appendices p.364-370 lus : tables critiques et États répètent les pages déjà inventoriées ; les seuils du bras sont identiques après comparaison, seuls certains renvois changent. Index p.371-376 et fiches p.377-379 : pas de mécanique nouvelle. P.364 ajoute conversion et progression individuelle ; aucune valeur de coût non vérifiée n’est inventée.

Complément magie : registre à 989 entrées et 695 sélecteurs. Lecture p.230-239, contrôle visuel du tableau de surpuissance p.236 (cellules fusionnées). Incidents décomposés entre effets directement appliqués et Tests conditionnels en rappel. Aucun sort réinventorié. Les ingrédients sont hors-granularité par règle maison. Les restrictions fictives de contact, voix et visibilité ne sont pas déduites des champs génériques. Les commandes Store de Focalisation prennent en charge les aperçus pause/interruption par applyChannelling ; aucune attribution automatique du déclencheur n’est prétendue.

Complément équipement : registre à 1 118 entrées et 807 sélecteurs. Lecture p.296-317 ; seules les mécaniques propres sont recensées, pas une copie des listes marchandes. Qualités comparées aux contrats, à leur version active et aux lecteurs de résolution/protection. Le statut générique des mots-clés ne suffit pas : Assommante possède son lecteur V5 spécialisé, alors que les projectiles fichés d’Empaleuse restent en rappel. Les remèdes, prothèses, objets magiques et capacités de contenants sont séparés des prix. Les malus d’Agilité imprimés p.299 restent des valeurs de caractéristique, aucune conversion en DR n’est inventée.
