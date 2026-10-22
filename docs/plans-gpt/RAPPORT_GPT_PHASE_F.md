# Rapport GPT — Phase F0 (partiel, en cours)

22 octobre 2026. Worktree `E:/Outil MJ Warhammer/tmp/gpt-phase-f-worktree`, branche `gpt/phase-f`, base `main` à `ad092cd` (3.24.0). Aucun fichier de jeu ou test existant modifié. Aucune publication, aucun push ni fusion.

## Lots

| Lot | État | Commit / portée |
| --- | --- | --- |
| Plan | FAIT | `3149286` ; plan avant outillage |
| F00 | FAIT | `ae76525` ; extraction unitaire et vérification des données, nouveaux tests uniquement |
| F06-Tests | FAIT | `f4483bb` ; L06 p.129-133, 265-266 ; F-L06-0001 à 0046 |
| F06-Combat | FAIT | Commit du présent lot ; L06 p.161-169 ; F-L06-0047 à 0171 ; 125 règles supplémentaires |
| Reste de L06 | À FAIRE | Compétences/talents, création/carrières, applications des compétences, blessures/soins, maladies/poisons, États hors inventaires existants, corruption, entre-aventures, magie générale, équipement et environnement |
| F05, F17, F11, F13, F14, F16, F18-F26, F01-F04, F07-F10, F12, F15 | À FAIRE | Tous les autres livres, dans l'ordre du plan ; aucun déclaré lu |

## Source lue

L06 — `Livre de base V5 EN v2.pdf`, 379 pages physiques. SHA-256 recalculé : `53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de`, identique au manifeste. Sommaire repéré aux pages physiques 1-6. Pages 129-133, 265-266 lues pour le lot Tests ; pages 161-169 lues pour Combat ; folios imprimés égaux aux numéros physiques pour ces pages. Passage « Surprised » p.187 consulté pour lever une divergence, sans audit du reste de cette page. Page 267 repérée lors d'un premier extrait, mais XP et voyage non audités. Ni le sommaire ni le hash ne certifient une lecture exhaustive.

Extraction reproductible : `node tools/audit/extract-pages.mjs --book L06 --pages 129-133,265-266`. Textes et reçus par page dans `tmp/audit/L06/`. Ces reçus marquent volontairement `read:false` : l'extraction seule ne constitue pas une lecture. La lecture humaine/modèle est attestée dans ce rapport, avec son périmètre exact.

## Décomptes et limites

Le registre, la synthèse et les sélecteurs sont produits dans les chemins demandés. `node tools/audit/build-audit.mjs --check` vérifie leur correspondance exacte, les références locales et les limites de résumé. Les statuts sont des constats statiques de la base figée, pas une recette exhaustive des mécaniques.

État recensé : **171 règles**, dont **34 automatisées, 16 assistées, 0 rappel, 121 absentes, 0 hors-granularité**. **121 sélecteurs ouverts** correspondent exactement aux absences recensées. Les catégories à zéro ne signifient pas absence de ces cas dans le reste du corpus.

Par domaine : Tests 34 ; Destin et Chance 12 ; Combat 118 ; Voyage et environnement 7. Le manifeste complet décrit **26 livres et 3 968 pages physiques**, contre 17 et 2 694 pour le manifeste initial. Aucun livre n'est déclaré intégralement terminé ; seul L06 est commencé.

Cinq renvois évitent de refaire les inventaires antérieurs : C0-L06-013, C0-L06-014, C0-L06-018, C0-L06-019 et E0-T-060. Leur présence ne fige pas leur ancien statut : le raccordement runtime est examiné séparément.

Les noms FR sont provisoires avant L05. Les conversions V4 ne sont pas encore abordées : seules des règles V5 de L06 ont été recensées, donc `v5Proposal:null`.

## Difficultés et choix

- L06 p.131 : extraction désalignée des tableaux Difficulté et Issues ; les deux tableaux ont été vérifiés visuellement sur le rendu `tmp/audit/L06-p131.png`. Aucun seuil deviné.
- Encodage de l'ancien premier extrait : certains signes typographiques étaient mal restitués. Extraction unitaire refaite explicitement avec `-enc UTF-8` ; source visuelle prioritaire pour le tableau.
- Un champ générique de DR ou d'Avantage ne suffit pas à couvrir la règle qui devrait le déclencher. Les tâches étendues de magie ne prouvent pas un suivi générique des tâches.
- L06 p.165 et 166 : tableaux Oops, incidents et modificateurs vérifiés visuellement (`tmp/audit/L06-combat-165.png`, `L06-combat-166.png`). Chaque conséquence distincte de maladresse et d'incident a sa propre entrée.
- Surpris : contradiction interne constatée entre le tableau p.166 (+1 DR) et l'État p.187 (+2 DR). Le moteur suit +2 ; aucune correction ni nouvel arbitrage.
- Ralliement, Intimidation et dressage Guerre : fonctions spécialisées présentes, mais aucun appel dans js/ hors de leur définition repéré. Statut prudent `absent`, avec référence à l'inventaire existant. Les tests de ces fonctions ne prouvent pas un parcours utilisateur.
- Tous les choix sont consignés dans `CHOIX_EXECUTANT_PHASE_F.md` (F-C01 à F-C10).

## Vérifications exécutées

- Base : premier essai avec TEMP à l'intérieur du checkout, 4 041/4 043 ; E2 échouait car son chemin « extérieur » restait dans le checkout, E0 faute de reçu initial. Aucun test modifié.
- TEMP/TMP corrigés vers `E:/Outil MJ Warhammer/tmp/gpt-phase-f-runtime` (même lecteur, hors worktree) : 4 042/4 043 ; seul E0 neuf admis par le brief.
- F00 : rouge attesté (`tmp/audit/F00-red.log`, import de l'outil inexistant), puis 7/7 tests ciblés ; suite complète 4 050/4 050 après démarrage réel de la recette, reçu E0 désormais existant (`tmp/audit/F00-full.log`).
- F06-Tests : suite complète 4 050/4 050, zéro échec (`tmp/audit/F06-tests-full.log`, 112,669 s).
- F06-Combat : suite complète 4 050/4 050, zéro échec (`tmp/audit/F06-combat-full.log`, 106,305 s). Génération de la synthèse et des sélecteurs répétée à empreintes identiques ; `--check` vert.
- Recette complète : **26/26 commandes vertes**, dont la suite Node et les parcours navigateur/cloud locaux. Reçus réels dans `tmp/divin/recipe-receipt.json` et `tmp/audit/recipe-F00.log` ; toutes les sources protégées inchangées. Recette achevée le 22/10 à 21 h 28 (Europe/Paris).
- Fins de ligne LF ; `git diff --check` vert.

Assertions de tests existants modifiées : **aucune**. Nouveaux tests : `tests/audit-phase-f.test.js` (sept contrôles d'outillage).

Le brief F0 provient du worktree demandé, à `b1ab6c5` ; son SHA-256 est `9c97672e69c7d41825d3d9364945add0101fd411ea2b175a261f0c8c48c6aff9`. Il n'existait pas encore dans `main` à `ad092cd`. Il a été lu à son emplacement d'origine ; aucun document de consigne n'a été copié ou modifié pour résoudre cette différence de branches.

## Reprise

L'audit des 26 livres n'est pas terminé. Ne pas prendre les 171 règles recensées pour une couverture du corpus. Terminer chaque gros chapitre restant de L06 et son commit, puis L05 et les livres suivants dans l'ordre du plan. Continuer à renvoyer vers les inventaires déjà existants sans les recopier. Toute fin de session suit la clause « Volume » des règles communes et doit laisser un état partiel explicite.
