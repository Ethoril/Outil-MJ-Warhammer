# Reliquats du vérificateur final — 17 octobre 2026

**Les cinq reliquats sont corrigés.** Application maintenue en **3.15.0**, worktree **codex/lot2-talents-v5**, HEAD **fb0f280150cdbdab1af220163abfaa491e2156ee**. **2231/2231 tests Node**, **21 commandes de recette vertes**, cloud local et paquet hors ligne compris. Aucun commit, push, fusion, déploiement ni changement de feuille distante.

## Corrections et reproductions

| Reliquat | Statut | Correction | Preuve |
| --- | --- | --- | --- |
| 1 — Équipement | Fait | Les lignes null, non objets ou tableaux sont filtrées comme les sorts, talents et compétences. Les objets valides sont conservés. Import profil/participant, vraie attaque Store et reprise après rechargement vérifiés. | Tests Reliquat 1, rouges avant correctif. |
| 2 — Test secondaire | Fait | Champ générique supprimé du bloc commun. Les contrôles de résistance spécifiques au contrat restent disponibles : absence sur Carreau et Choc, présence de la Force Mentale sur Toucher doré. | UI réelle à 1440/390 px, sombre/parchemin ; rouge puis vert. |
| 3 — Fléau des Démons | Fait | Nature démoniaque reconnue par désignation complète et indicateur explicite. Chasseur de démons, Démonologue et Démoniste ne deviennent pas des Démons via trait, étiquette, espèce ou catégorie. Démon, Daemon, Démoniaque, Daemonic et Démon (9+) restent reconnus. | Rouge du détecteur ; vert, puis refus confirmé via Store sur traits et étiquettes. |
| 4 — Difficultés | Fait | Drain de Magie et Blizzard : Intermédiaire (+0 DR). Bannissement Majeur et Pulvérisation Musquée : Accessible (+2 DR). Attaque Rapide : Intermédiaire (+0 DR), sans automatisation de miracle ajoutée. | Cinq tests de descriptions, rouges puis verts ; reminders des quatre sorts contrôlés. |
| 5 — Apothéose | Fait | La clause +10 DR indique désormais « Vous gagnez du Yenlui (Sombre). » dans le catalogue et le reminder régénéré. Correction textuelle, sans changement des paliers mécaniques. | HEPG p.86 : gain Dark après résurrection ; test rouge puis vert. |

Tests ciblés : [neuf tests métier](../../tests/lot3-v5-reliquats.test.js) et [contrôles UI](../../tests/lot3-v5-relecture2-ui-browser.mjs). Les neuf tests Node étaient rouges avant les corrections ; le parcours UI reproduisait les champs superflus. Les assertions supplémentaires de refus via Store ont été ajoutées après le correctif du détecteur et sont vertes. [tmp/lot3/reliquats-2026-10-17/relecture2-reliquats-red.log](../../tmp/lot3/reliquats-2026-10-17/relecture2-reliquats-red.log), [tmp/lot3/reliquats-2026-10-17/relecture2-reliquats-ui-red.log](../../tmp/lot3/reliquats-2026-10-17/relecture2-reliquats-ui-red.log), [tmp/lot3/reliquats-2026-10-17/relecture2-reliquats-final-targeted.log](../../tmp/lot3/reliquats-2026-10-17/relecture2-reliquats-final-targeted.log).

Le filtrage d’équipement est dans [models.js](../../js/core/models.js), le détecteur dans [v5-magic-attributes.js](../../js/core/v5-magic-attributes.js), le champ supprimé dans [v5-magic-controls.js](../../js/ui/v5-magic-controls.js). Les textes se modifient par [l’outil de catalogue](../../tools/update-lot3-catalogue-reliquats.mjs), puis les contrats sont régénérés par leur générateur habituel. Le suivi JSON/Markdown est généré avec les références du présent rapport.

## Catalogue et report du MJ

Le nouveau delta contient **5 cellules de Magie et 1 cellule de Miracles**. **G75 remplace le texte R2 de cette même cellule.** Les [valeurs complètes du nouveau delta](LOT3_A_REPORTER_DANS_LA_FEUILLE_RELIQUATS.md) ne répètent pas les 21 changements précédents.

| Feuille | Cellule | Nom |
| --- | --- | --- |
| Magie | G25 | Blizzard enflammé de Ygethmor |
| Magie | G75 | Apothéose |
| Magie | G80 | Drain de Magie |
| Magie | G84 | Bannissement Majeur |
| Magie | G107 | Pulvérisation Musquée |
| Miracles | E13 | Attaque Rapide |

Si les 21 cellules R2 n’ont pas encore été reportées, utiliser le [report cumulé actuel](LOT3_A_REPORTER_DANS_LA_FEUILLE_ACTUEL.md) : **25 cellules distinctes de Magie et 1 de Miracles**. Si elles ont déjà été reportées, seul le nouveau delta de six cellules est nécessaire. La feuille Google n’a pas été modifiée ici.

Classeur remplacé au même emplacement : [Magie_V5.xlsx](C:/Users/arnot/.codex/visualizations/2026/10/13/01a13662-2a3d-7f30-b363-a6104eddf4a2/excel-magic/outputs/01a13662-2a3d-7f30-b363-a6104eddf4a2/Magie_V5.xlsx). Il contient seulement la feuille Magie ; le miracle reste dans son CSV et son delta. **5 cellules modifiées depuis R2**, **1941 autres valeurs inchangées**, **1946/1946 cellules en parité CSV**. Les styles des 1946 cellules, les largeurs de colonnes, la table CatalogueMagieV5, le gel B2 et les 277 NI numériques sont conservés. Seules les hauteurs des cinq lignes concernées ont été ajustées au contenu ; le rendu d’Apothéose a été contrôlé avant/après. [tmp/lot3/reliquats-2026-10-17/workbook-verification.json](../../tmp/lot3/reliquats-2026-10-17/workbook-verification.json).

Versions recalculées depuis le snapshot et les deux miroirs CSV :

| Champ | Valeur |
| --- | --- |
| contentVersion | `references:3755f725aedded0b38face136e08c2214af15e9c299412702185c67740ff56ac` |
| catalogVersion | `sha256:267a5ba2a20c19f5b5ae6b5576f8932ca9e88393fd5df6a718fe9448e6f8077c` |
| localRevision | `2026-10-17-catalogue-v5-reliquats` |
| csvSha256.Magie | `8aca1ccac29f4f0a56388efdef7db700896f29e66857fad50fdc3829bd283db5` |
| csvSha256.Miracles | `6bf08ed826679ff6d481765101d7df09d3bea4dab006952f55f4bf19089c43c6` |

Une deuxième application de l’outil de catalogue produit les mêmes six fichiers (snapshot, deux CSV, preuve et deux deltas), sans dupliquer Yenlui ni les cellules. [tmp/lot3/reliquats-2026-10-17/reliquats-catalogue-repeatability.json](../../tmp/lot3/reliquats-2026-10-17/reliquats-catalogue-repeatability.json).

## Matrice et limites conservées

- **Contrat à effet calculable** : 147
- **Contrat nécessitant des données MJ** : 49
- **Rappel** : 81
- **Contrat restant à réaliser** : 0

Les 277 contrats, leurs paliers et les limites déjà décrites dans [le rapport R2](LOT3_RAPPORT_CORRECTIONS_RELECTURE_2.md) sont conservés. Le classement ne certifie pas toutes les clauses ni tous les scénarios de campagne. Les miracles restent hors mécanisation ; le doublon de fin de Round non reproduit dans la R2 n’est pas requalifié en défaut corrigé par cette passe.

## Recette complète du 17 octobre

[tmp/lot3/reliquats-2026-10-17/recipe-receipt.json](../../tmp/lot3/reliquats-2026-10-17/recipe-receipt.json). La génération est stable sur deux passes pour 13 fichiers et 277 contrats. Les émulateurs sont locaux ; le paquet exporté est testé avec le vrai Service Worker et IndexedDB au bureau et à 390 px, puis hors ligne. Le test ciblé a aussi été rejoué après ajout des assertions Store du Fléau.

| Commande | Résultat | Durée | Log archivé |
| --- | --- | --- | --- |
| `node tools/check-lot3-generation.mjs` | Vert (0) | 19.82 s | [tmp/lot3/reliquats-2026-10-17/cloture-generation.log](../../tmp/lot3/reliquats-2026-10-17/cloture-generation.log) |
| `node --test` | Vert (0) | 40.55 s | [tmp/lot3/reliquats-2026-10-17/cloture-node.log](../../tmp/lot3/reliquats-2026-10-17/cloture-node.log) |
| `node tests/browser-smoke.mjs` | Vert (0) | 4.96 s | [tmp/lot3/reliquats-2026-10-17/cloture-browser-smoke.log](../../tmp/lot3/reliquats-2026-10-17/cloture-browser-smoke.log) |
| `node tests/browser-startup.mjs` | Vert (0) | 7.4 s | [tmp/lot3/reliquats-2026-10-17/cloture-browser-startup.log](../../tmp/lot3/reliquats-2026-10-17/cloture-browser-startup.log) |
| `node tests/browser-references-smoke.mjs` | Vert (0) | 1.25 s | [tmp/lot3/reliquats-2026-10-17/cloture-browser-references-smoke.log](../../tmp/lot3/reliquats-2026-10-17/cloture-browser-references-smoke.log) |
| `node tests/browser-magic-v5-smoke.mjs` | Vert (0) | 7.48 s | [tmp/lot3/reliquats-2026-10-17/cloture-browser-magic-v5-smoke.log](../../tmp/lot3/reliquats-2026-10-17/cloture-browser-magic-v5-smoke.log) |
| `node tests/lot2-combat-v5-browser.mjs` | Vert (0) | 14.44 s | [tmp/lot3/reliquats-2026-10-17/cloture-lot2-combat-v5-browser.log](../../tmp/lot3/reliquats-2026-10-17/cloture-lot2-combat-v5-browser.log) |
| `node tests/lot3-v5-arcanes-mineurs-ui-browser.mjs` | Vert (0) | 8.1 s | [tmp/lot3/reliquats-2026-10-17/cloture-lot3-v5-arcanes-mineurs-ui-browser.log](../../tmp/lot3/reliquats-2026-10-17/cloture-lot3-v5-arcanes-mineurs-ui-browser.log) |
| `node tests/lot3-v5-catalogue-5b-ui-browser.mjs` | Vert (0) | 24.26 s | [tmp/lot3/reliquats-2026-10-17/cloture-lot3-v5-catalogue-5b-ui-browser.log](../../tmp/lot3/reliquats-2026-10-17/cloture-lot3-v5-catalogue-5b-ui-browser.log) |
| `node tests/lot3-v5-catalogue-ui-browser.mjs` | Vert (0) | 20.95 s | [tmp/lot3/reliquats-2026-10-17/cloture-lot3-v5-catalogue-ui-browser.log](../../tmp/lot3/reliquats-2026-10-17/cloture-lot3-v5-catalogue-ui-browser.log) |
| `node tests/lot3-v5-cloture-ui-browser.mjs` | Vert (0) | 4.87 s | [tmp/lot3/reliquats-2026-10-17/cloture-ui.log](../../tmp/lot3/reliquats-2026-10-17/cloture-ui.log) |
| `node tests/lot3-v5-domaines-ui-browser.mjs` | Vert (0) | 6.05 s | [tmp/lot3/reliquats-2026-10-17/cloture-lot3-v5-domaines-ui-browser.log](../../tmp/lot3/reliquats-2026-10-17/cloture-lot3-v5-domaines-ui-browser.log) |
| `node tests/lot3-v5-elfiques-ui-browser.mjs` | Vert (0) | 10.58 s | [tmp/lot3/reliquats-2026-10-17/cloture-lot3-v5-elfiques-ui-browser.log](../../tmp/lot3/reliquats-2026-10-17/cloture-lot3-v5-elfiques-ui-browser.log) |
| `node tests/lot3-v5-magic-2b-ui-browser.mjs` | Vert (0) | 123.68 s | [tmp/lot3/reliquats-2026-10-17/cloture-lot3-v5-magic-2b-ui-browser.log](../../tmp/lot3/reliquats-2026-10-17/cloture-lot3-v5-magic-2b-ui-browser.log) |
| `node tests/lot3-v5-relecture2-history-browser.mjs` | Vert (0) | 2.39 s | [tmp/lot3/reliquats-2026-10-17/cloture-lot3-v5-relecture2-history-browser.log](../../tmp/lot3/reliquats-2026-10-17/cloture-lot3-v5-relecture2-history-browser.log) |
| `node tests/lot3-v5-relecture2-ui-browser.mjs` | Vert (0) | 2.33 s | [tmp/lot3/reliquats-2026-10-17/cloture-lot3-v5-relecture2-ui-browser.log](../../tmp/lot3/reliquats-2026-10-17/cloture-lot3-v5-relecture2-ui-browser.log) |
| `node tests/lot3-v5-wom-ui-browser.mjs` | Vert (0) | 12.94 s | [tmp/lot3/reliquats-2026-10-17/cloture-lot3-v5-wom-ui-browser.log](../../tmp/lot3/reliquats-2026-10-17/cloture-lot3-v5-wom-ui-browser.log) |
| `powershell -NoProfile -ExecutionPolicy Bypass -File tests/run-lot2-v5-25-emulators.ps1 -TestScript tests/lot3-v5-35-cloud-browser.mjs` | Vert (0) | 37.73 s | [tmp/lot3/reliquats-2026-10-17/cloture-cloud.log](../../tmp/lot3/reliquats-2026-10-17/cloture-cloud.log) |
| `node tools/build-lot3-local-release.mjs` | Vert (0) | 0.21 s | [tmp/lot3/reliquats-2026-10-17/cloture-build-release.log](../../tmp/lot3/reliquats-2026-10-17/cloture-build-release.log) |
| `node tests/lot3-v5-35-release-browser.mjs` | Vert (0) | 3.46 s | [tmp/lot3/reliquats-2026-10-17/cloture-release-browser.log](../../tmp/lot3/reliquats-2026-10-17/cloture-release-browser.log) |
| `git diff --check` | Vert (0) | 0.11 s | [tmp/lot3/reliquats-2026-10-17/cloture-diff-check.log](../../tmp/lot3/reliquats-2026-10-17/cloture-diff-check.log) |

Les reçus et logs de cette passe sont archivés sans copie de fichiers de tests dans <code>tmp/lot3/reliquats-2026-10-17/</code>. Le [journal](LOT3_JOURNAL_3_15_0.md), le [suivi](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), le [plan](LOT3_PLAN_CORRECTION_CLAUDE.md) et la [recette](LOT3_RECETTE_3_15.md) renvoient à cette validation. Le report de Google Sheets et une éventuelle publication restent des étapes séparées.
