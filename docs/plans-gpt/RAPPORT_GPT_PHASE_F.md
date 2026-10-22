# Rapport GPT — Phase F0 (partiel, en cours)

22 octobre 2026. Worktree `E:/Outil MJ Warhammer/tmp/gpt-phase-f-worktree`, branche `gpt/phase-f`, base `main` à `ad092cd` (3.24.0). Aucun fichier de jeu ou test existant modifié. Aucune publication, aucun push ni fusion.

## Lots

| Lot | État | Commit / portée |
| --- | --- | --- |
| Plan | FAIT | `3149286` ; plan avant outillage |
| F00 | FAIT | `ae76525` ; extraction unitaire et vérification des données, nouveaux tests uniquement |
| F06-Tests | FAIT | Commit du présent lot ; L06 p.129-133, 265-266 ; 46 règles, 25 sélecteurs |
| F06-Combat | À FAIRE | L06 p.161-169 |
| Reste de L06 | À FAIRE | Compétences/talents, création/carrières, applications des compétences, blessures/soins, maladies/poisons, États hors inventaires existants, corruption, entre-aventures, magie générale, équipement et environnement |
| F05, F17, F11, F13, F14, F16, F18-F26, F01-F04, F07-F10, F12, F15 | À FAIRE | Tous les autres livres, dans l'ordre du plan ; aucun déclaré lu |

## Source lue

L06 — `Livre de base V5 EN v2.pdf`, 379 pages physiques. SHA-256 recalculé : `53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de`, identique au manifeste. Sommaire repéré aux pages physiques 1-6. Pages 129-133, 265-266 lues pour le lot Tests ; folios imprimés égaux aux numéros physiques pour ces pages. Ni le sommaire ni le hash ne certifient une lecture exhaustive.

Extraction reproductible : `node tools/audit/extract-pages.mjs --book L06 --pages 129-133,265-266`. Textes et reçus par page dans `tmp/audit/L06/`. Ces reçus marquent volontairement `read:false` : l'extraction seule ne constitue pas une lecture. La lecture humaine/modèle est attestée dans ce rapport, avec son périmètre exact.

## Décomptes et limites

Le registre, la synthèse et les sélecteurs sont produits dans les chemins demandés. `node tools/audit/build-audit.mjs --check` vérifie leur correspondance exacte, les références locales et les limites de résumé. Les statuts sont des constats statiques de la base figée, pas une recette exhaustive des mécaniques.

Les noms FR sont provisoires avant L05. Les conversions V4 ne sont pas encore abordées : seules des règles V5 de L06 ont été recensées, donc `v5Proposal:null`.

## Difficultés et choix

- L06 p.131 : extraction désalignée des tableaux Difficulté et Issues ; les deux tableaux ont été vérifiés visuellement sur le rendu `tmp/audit/L06-p131.png`. Aucun seuil deviné.
- Encodage de l'ancien premier extrait : certains signes typographiques étaient mal restitués. Extraction unitaire refaite explicitement avec `-enc UTF-8` ; source visuelle prioritaire pour le tableau.
- Un champ générique de DR ou d'Avantage ne suffit pas à couvrir la règle qui devrait le déclencher. Les tâches étendues de magie ne prouvent pas un suivi générique des tâches.
- Tous les choix sont consignés dans `CHOIX_EXECUTANT_PHASE_F.md` (F-C01 à F-C06).

## Vérifications exécutées

- Base : premier essai avec TEMP à l'intérieur du checkout, 4 041/4 043 ; E2 échouait car son chemin « extérieur » restait dans le checkout, E0 faute de reçu initial. Aucun test modifié.
- TEMP/TMP corrigés vers `E:/Outil MJ Warhammer/tmp/gpt-phase-f-runtime` (même lecteur, hors worktree) : 4 042/4 043 ; seul E0 neuf admis par le brief.
- F00 : rouge attesté (`tmp/audit/F00-red.log`, import de l'outil inexistant), puis 7/7 tests ciblés ; suite complète 4 050/4 050 après démarrage réel de la recette, reçu E0 désormais existant (`tmp/audit/F00-full.log`).
- F06-Tests : suite complète 4 050/4 050, zéro échec (`tmp/audit/F06-tests-full.log`, 112,669 s).
- Recette complète : **26/26 commandes vertes**, dont la suite Node et les parcours navigateur/cloud locaux. Reçus réels dans `tmp/divin/recipe-receipt.json` et `tmp/audit/recipe-F00.log` ; toutes les sources protégées inchangées. Recette achevée le 22/10 à 21 h 28 (Europe/Paris).
- Fins de ligne LF ; `git diff --check` vert.

Assertions de tests existants modifiées : **aucune**. Nouveaux tests : `tests/audit-phase-f.test.js` (sept contrôles d'outillage).

## Reprise

L'audit des 26 livres n'est pas terminé. Ne pas prendre les 46 règles recensées pour une couverture du corpus. Terminer chaque gros chapitre de L06 et son commit, puis L05 et les livres suivants dans l'ordre du plan. Continuer à renvoyer vers les inventaires déjà existants sans les recopier. Toute fin de session suit la clause « Volume » des règles communes et doit laisser un état partiel explicite.
