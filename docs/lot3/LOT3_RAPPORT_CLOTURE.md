# Clôture locale du lot 3 — 3.15.0

14 octobre 2026. Brief de clôture, **section 0 comprise**, exécuté dans le worktree lot2-combat-v5, branche codex/lot2-talents-v5, HEAD **fb0f280150cdbdab1af220163abfaa491e2156ee**. Travail non commité ; aucun push, fusion, déploiement ou écriture dans la feuille Google. Main E:/Outil MJ Warhammer reste propre sur 08ce45d.

## Trois clauses restantes

| Clause | Statut final | Source et preuve exécutée |
| --- | --- | --- |
| Imprégné / magic:2 | Donnée MJ nécessaire | **WoM p.186**, correction de la référence HEPG du brief. Huit Vents sondés ; Aqshy donne accès à Frénésie, choix FM/Focalisation, entrée/sortie avec fait MJ, reload et Undo. Interface bureau/téléphone, sombre/parchemin, dé conservé et rappel de Seconde vue affiché. |
| L’esprit sur le corps / magic:2 | Donnée MJ nécessaire | **HEPG p.101**. Chance2→1, rechargement, double paiement refusé, pénalités des seuls Tests étendus neutralisées, autres pénalités/blessures conservées ; expiration par vraie fin de Tour et Undo. **Chance est l’adaptation V5 locale de Resolve dans la source V4**, pas une transcription littérale. |
| Résistance à la Magie / magic:2 | Conforme aux scénarios D-07 | **V5 pp.122/235 ; D-07**. Carreau sous Puissance totale passe malgré NI après −3 DR ; Chant vivifiant : soin5→2 et bonus5→2, témoin sans Résistance à5 ; application Store, reload et Undo. Aucun correctif moteur nécessaire sur ce point. |

[Preuves par clause](LOT3_PREUVES_CLOTURE.json), tests/lot3-v5-cloture.test.js et tests/lot3-v5-cloture-ui-browser.mjs. Rouges constatés avant les correctifs Aqshy, limitation aux Tests étendus, générateur, puis choix et sortie UI ; logs cloture-regressions-red-final, cloture-frenzy-choice-red et cloture-frenzy-end-red dans tmp/lot3.

Le suivi comporte **277 sorts : 165 conformes aux scénarios, 49 données MJ, 63 rappels** ; **54 clauses de talents : 9 conformes, 18 données MJ, 5 rappels, 22 hors périmètre, 0 anomalie, 0 non vérifié**. Ces totaux ne certifient pas toutes les clauses ni les situations de campagne.

## Alignement et version

Téléchargement public final : **Magie et Talents identiques octet pour octet aux miroirs** ([reçu](../../tmp/lot3/cloture-google-final-check.json)). Lileath sans « = » parasite ; snapshot, épingles et empreintes revalidés, automatisme actif après actualisation. Petit reprend le texte du MJ sans Frappes Mortelles ; **cette règle était déjà supprimée du moteur**, désormais confirmée contre une cible survivante. Les quatre autres descriptions « = » correspondent à la feuille et sont conservées. Actualisation simulée depuis les sept CSV téléchargés : exactement le contentVersion du snapshot.

Version **3.15.0** alignée dans version.js, package/lock, bouton et cache **wfrp-cache-v3.15.0**. Tous les modules js/ passent le test de précache. Paquet de **153 assets applicatifs**, sans tests, PDF ou export privé ; [chemin courant](../../tmp/lot3/release-path.json). La version possède un bouton/toast, aucune aide nouveautés existante : journal MJ livré sans nouvelle section UI.

## Documents actualisés

[Journal MJ](LOT3_JOURNAL_3_15_0.md), [bilan](LOT3_FINALISATION_MAGIE.md), [nouvelle recette 3.15](LOT3_RECETTE_3_15.md), [recette 3.5 historique](LOT3_RECETTE_3_5.md), [passation Claude](LOT3_PASSATION_RELECTURE_CLAUDE.md), [plan](LOT3_PLAN_CORRECTION_CLAUDE.md), README et suivi MD/JSON. Le plan donne un statut aux **166 items** ; D-21/W-19 annulés, C-03/C-06 restants. Les bilans précédents et l’audit initial sont conservés.

## Recette finale

**19 commandes vertes en une exécution complète.** [Reçu individuel](../../tmp/lot3/cloture-final-recipe-receipt.json). Les deux incidents du runner ont été corrigés : modules PowerShell hérités et attente non bornée d’un worker en activation ; les tentatives précédentes restent en reçus séparés. Les assertions de mise à jour réelle 3.12.0→3.15.0 et d’IndexedDB sont conservées.

| Commande | Résultat | Preuve |
| --- | --- | --- |
| node tools/check-lot3-generation.mjs | 2 passes identiques / 13 fichiers | [Log](../../tmp/lot3/cloture-generation.log) |
| node --test | 2 175 / 2 175 | [Log](../../tmp/lot3/cloture-node.log) |
| node tests/browser-smoke.mjs | Vert (code 0) | [Log](../../tmp/lot3/cloture-browser-smoke.log) |
| node tests/browser-startup.mjs | Vert (code 0) | [Log](../../tmp/lot3/cloture-browser-startup.log) |
| node tests/browser-references-smoke.mjs | Vert (code 0) | [Log](../../tmp/lot3/cloture-browser-references-smoke.log) |
| node tests/browser-magic-v5-smoke.mjs | Vert (code 0) | [Log](../../tmp/lot3/cloture-browser-magic-v5-smoke.log) |
| node tests/lot2-combat-v5-browser.mjs | Vert (code 0) | [Log](../../tmp/lot3/cloture-lot2-combat-v5-browser.log) |
| node tests/lot3-v5-arcanes-mineurs-ui-browser.mjs | Vert (code 0) | [Log](../../tmp/lot3/cloture-lot3-v5-arcanes-mineurs-ui-browser.log) |
| node tests/lot3-v5-catalogue-5b-ui-browser.mjs | Vert (code 0) | [Log](../../tmp/lot3/cloture-lot3-v5-catalogue-5b-ui-browser.log) |
| node tests/lot3-v5-catalogue-ui-browser.mjs | Vert (code 0) | [Log](../../tmp/lot3/cloture-lot3-v5-catalogue-ui-browser.log) |
| node tests/lot3-v5-cloture-ui-browser.mjs | Vert (code 0) | [Log](../../tmp/lot3/cloture-ui.log) |
| node tests/lot3-v5-domaines-ui-browser.mjs | Vert (code 0) | [Log](../../tmp/lot3/cloture-lot3-v5-domaines-ui-browser.log) |
| node tests/lot3-v5-elfiques-ui-browser.mjs | Vert (code 0) | [Log](../../tmp/lot3/cloture-lot3-v5-elfiques-ui-browser.log) |
| node tests/lot3-v5-magic-2b-ui-browser.mjs | Vert (code 0) | [Log](../../tmp/lot3/cloture-lot3-v5-magic-2b-ui-browser.log) |
| node tests/lot3-v5-wom-ui-browser.mjs | Vert (code 0) | [Log](../../tmp/lot3/cloture-lot3-v5-wom-ui-browser.log) |
| powershell -NoProfile -ExecutionPolicy Bypass -File tests/run-lot2-v5-25-emulators.ps1 -TestScript tests/lot3-v5-35-cloud-browser.mjs | Vert (code 0) | [Log](../../tmp/lot3/cloture-cloud.log) |
| node tools/build-lot3-local-release.mjs | 153 assets / 3.15.0 | [Log](../../tmp/lot3/cloture-build-release.log) |
| node tests/lot3-v5-35-release-browser.mjs | 153 SHA-256 / bureau et téléphone hors ligne | [Log](../../tmp/lot3/cloture-release-browser.log) |
| git diff --check | Vert (code 0) | [Log](../../tmp/lot3/cloture-diff-check.log) |

Le contrôle de génération lance huit outils deux fois ; tous leurs logs et les SHA-256 des treize fichiers sont dans [le reçu de génération](../../tmp/lot3/cloture-generation-receipt.json). Couverture générale : **206 identités, 131 contrats du lot 2, 531 clauses** (286 automatiques, 123 assistées, 62 rappels, 41 fiches, 10 exclusions, 9 différées).

## Limites et suite

Terrain, aires, distances, profils, dés, choix et conséquences de fiction restent les déclarations ou rappels du MJ. Les tests couvrent les cas nommés ; le bestiaire complet et les cas hors catalogue ne sont pas certifiés (**C-03**). La seconde relecture indépendante sur copie a été reçue le 14 octobre (**C-06 fait**) ; ses corrections et la recette du 15 octobre figurent dans le [rapport R2](LOT3_RAPPORT_CORRECTIONS_RELECTURE_2.md).

Ingrédients exclus ; miracles, bénédictions, runes de maître, Chaos, Pacte de l’âme et techniques elfiques différées hors périmètre. Fiches, achats/PX et changements permanents restent dans leur outil. Le cloud utilise Auth/RTDB locaux et un pont REST ETag ; aucune validation Google OAuth ou séance distante en production n’est revendiquée. Le téléphone est la recette navigateur de largeur 390 px.

**La feuille Google doit recevoir les 21 cellules du report R2 avant livraison**. L’alignement public constaté le 14 octobre concernait le catalogue précédent. Le nouveau **Magie_V5.xlsx** contient le delta local du MJ ; aucune feuille distante n’a été modifiée ici.

## Actualisation après seconde relecture (15 octobre 2026)

Ce bilan historique est complété par [le rapport des corrections R2](LOT3_RAPPORT_CORRECTIONS_RELECTURE_2.md), qui fait foi pour la validation actuelle. C-06 est fait. Matrice actuelle : 147 calculables / 49 données MJ / 81 rappels / 0 restant. La feuille Google doit recevoir les 21 nouvelles cellules indiquées dans [le report R2](LOT3_A_REPORTER_DANS_LA_FEUILLE_RELECTURE_2.md) ; les paragraphes précédents sur son alignement décrivent la version déjà reportée du 14 octobre. Application toujours 3.15.0 ; aucune publication.

## Reliquats clos le 17 octobre 2026

Les cinq reliquats sont corrigés : équipement vide, champ secondaire, détection stricte des Démons, cinq libellés et Yenlui d’Apothéose. **2231/2231 tests Node, 21 commandes vertes**, cloud local et paquet hors ligne compris. [Rapport et preuves](LOT3_RAPPORT_RELIQUATS_2026_10_17.md). [Delta supplémentaire : 5 cellules Magie et 1 Miracles](LOT3_A_REPORTER_DANS_LA_FEUILLE_RELIQUATS.md) ; [report cumulé actuel](LOT3_A_REPORTER_DANS_LA_FEUILLE_ACTUEL.md). Version 3.15.0, aucune publication.
