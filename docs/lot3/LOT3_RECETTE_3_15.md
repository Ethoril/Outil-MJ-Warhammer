# Recette locale 3.15 — clôture de la magie V5

14 octobre 2026, application **3.15.0**, branche **codex/lot2-talents-v5**, HEAD **fb0f280150cdbdab1af220163abfaa491e2156ee**. Tout reste local et non commité. La [recette 3.5](LOT3_RECETTE_3_5.md) conserve ses preuves historiques du 10 octobre. Résultats actuels dans [le rapport de clôture](LOT3_RAPPORT_CLOTURE.md).

## Préparation

Dans le worktree `C:/Users/arnot/.codex/worktrees/lot2-combat-v5/Outil MJ Warhammer`, avec Node 24, Edge Windows, Java 21 et Firebase CLI. Les émulateurs utilisent un projet demo jetable et quatre ports locaux libres ; aucun compte ou service Firebase distant n’est utilisé. Tous les profils de recette sont synthétiques.

La section 0 du brief est intégrée : CSV publics vérifiés le 14 octobre, Lileath sans artefact « = », Petit sans Frappes Mortelles ; quatre autres descriptions commençant par « = » identiques à la feuille et conservées. La recette simule la réponse distante avec ces mêmes CSV épinglés. Les empreintes des deux descriptions changées sont revalidées ; le snapshot, le moteur, les inventaires et la couverture concordent.

## Commandes complètes

Exécuter dans cet ordre. Chaque résultat doit être vert. Les nouvelles sorties vont dans **tmp/lot3/** ; ne jamais y copier un fichier de test sauvegardé.

~~~powershell
$env:PLAYWRIGHT_EXECUTABLE_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
node tools/check-lot3-generation.mjs
node --test
node tests/browser-smoke.mjs
node tests/browser-startup.mjs
node tests/browser-references-smoke.mjs
node tests/browser-magic-v5-smoke.mjs
node tests/lot2-combat-v5-browser.mjs
node tests/lot3-v5-arcanes-mineurs-ui-browser.mjs
node tests/lot3-v5-catalogue-5b-ui-browser.mjs
node tests/lot3-v5-catalogue-ui-browser.mjs
node tests/lot3-v5-cloture-ui-browser.mjs
node tests/lot3-v5-domaines-ui-browser.mjs
node tests/lot3-v5-elfiques-ui-browser.mjs
node tests/lot3-v5-magic-2b-ui-browser.mjs
node tests/lot3-v5-wom-ui-browser.mjs
node tests/lot3-v5-relecture2-history-browser.mjs
node tests/lot3-v5-relecture2-ui-browser.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File tests/run-lot2-v5-25-emulators.ps1 -TestScript tests/lot3-v5-35-cloud-browser.mjs
node tools/build-lot3-local-release.mjs
node tests/lot3-v5-35-release-browser.mjs
git diff --check
~~~

Le contrôle de génération lance **deux fois** chacune des commandes ci-dessous et compare les fichiers produits octet à octet ; il exige 277 contrats et écrit **tmp/lot3/cloture-generation-receipt.json**. Ne pas lancer les anciens outils de remplacement du catalogue sur un snapshot historique : l’alignement public du 14 octobre est maintenant la base.

~~~powershell
node tools/build-v5-spell-contracts.mjs
node tools/build-lot3-contract-evidence.mjs
node tools/build-lot3-wom-evidence.mjs
node tools/build-lot3-catalogue-evidence.mjs
node tools/build-lot3-catalogue-5b-evidence.mjs
node tools/build-lot3-catalogue-followup-evidence.mjs
node tools/build-lot3-closure-evidence.mjs
node tools/build-v5-talent-coverage.mjs
~~~

## Preuves et portée

Les logs **cloture-*.log**, reçus JSON et captures sont dans tmp/lot3. Les tests généraux gardent aussi leurs reçus habituels. Les émulateurs conservent leur preuve d’environnement dans tmp/lot2-25/emulators ; le reçu métier cloud est dans tmp/lot3/cloud-receipt.json.

Le paquet est indiqué par **tmp/lot3/release-path.json**. Son manifeste SHA-256 contient seulement le précache applicatif et le Service Worker, sans tests, PDF ou exports privés. Le test du paquet démarre la copie exportée, utilise le vrai Service Worker et IndexedDB, puis rejoue bureau 1440 px et téléphone 390 px hors ligne.

Cette recette vérifie les cas nommés. Elle conserve les choix et faits du MJ, les clauses assistées et les familles hors périmètre ; elle ne certifie pas toutes les situations de campagne ni Google OAuth en production. **La feuille Google doit être à jour avant livraison** : son alignement a été constaté pour ces CSV le 14 octobre ; toute modification ultérieure exige une nouvelle vérification. Le MJ reporte ses changements avec Magie_V5.xlsx. Aucune publication autorisée.

## Exécution avec reçus individuels

`node tools/run-lot3-final-recipe.mjs` exécute exactement la liste complète ci-dessus, fixe le chemin d’Edge Windows si nécessaire, enregistre chaque log et son code de sortie dans **tmp/lot3/cloture-final-recipe-receipt.json**, et s’arrête au premier échec. La génération conserve aussi les logs individuels de ses huit outils, pour chacune des deux passes.

## Relecture 2 — exécution du 15 octobre 2026

Le report précédent du MJ reste la base historique. Les corrections suivantes changent 21 cellules de Magie_V5.xlsx : voir [le nouveau delta](LOT3_A_REPORTER_DANS_LA_FEUILLE_RELECTURE_2.md) et [le rapport détaillé](LOT3_RAPPORT_CORRECTIONS_RELECTURE_2.md). La feuille Google doit recevoir ce nouveau delta avant toute livraison. Les deux nouveaux parcours vérifient les champs applicables à l’action, les doubles d’incident, le masquage sous forme animale et Annuler après rechargement avec IndexedDB. Le lanceur automatique inclut tous les tests navigateur Lot 3 par ordre alphabétique.

## Reliquats clos le 17 octobre 2026

Les cinq reliquats sont corrigés : équipement vide, champ secondaire, détection stricte des Démons, cinq libellés et Yenlui d’Apothéose. **2231/2231 tests Node, 21 commandes vertes**, cloud local et paquet hors ligne compris. [Rapport et preuves](LOT3_RAPPORT_RELIQUATS_2026_10_17.md). [Delta supplémentaire : 5 cellules Magie et 1 Miracles](LOT3_A_REPORTER_DANS_LA_FEUILLE_RELIQUATS.md) ; [report cumulé actuel](LOT3_A_REPORTER_DANS_LA_FEUILLE_ACTUEL.md). Version 3.15.0, aucune publication.
