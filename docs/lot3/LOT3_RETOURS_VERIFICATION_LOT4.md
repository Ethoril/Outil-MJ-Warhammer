# Retours de vérification du lot 4 (Winds of Magic) — à traiter dans le lot 5a

13 octobre 2026. Vérification Claude sur une copie : `node --test` 1 729/1 729, sept recettes vertes, générations identiques. **Valeurs justes** sur les 18 sorts et les 5 corrections liées (pp. 20-21, 89, 98, 100-101, 111-112, 122, 124-125, 134-137, 146-149) ; durées exactes ; vortex, mini-vortex, Thorsen, Cendres, Soleil violet, Corps de Feu conformes. Défaut de classement `mj-input` du lot 3 : aucun sort WoM concerné.

## Problèmes confirmés

1. **Sang Bouillonnant frappe une fois de trop** (Durée 1 Round, WoM p. 134) : deux ticks pour 1 Round (trois avec durée ×2). `js/core/v5-turn.js:68` exécute les ticks `startOfTurn` du participant suivant avant l'expiration `processCombatTurnSpells` (l.70) ; la couche expire à la fin du tour de l'auteur (D-12) mais le tick du tour de la cible passe quand même. Corriger l'ordre de façon générique (expirer avant les ticks de début de tour, ou ignorer les ticks d'une couche échue dont l'auteur vient de finir) ; vérifier que Blizzard (6 ticks pour 6 Rounds) et Lames Azurées ne régressent pas ; tester sur plusieurs Tours réels.
2. **Boîte de fin de tour d'un vortex à mini-vortex** : trois champs identiques « Cible : localisation (d100) » (idem pour les d10 de Protection et les cibles) ; mettre l'étape (vortex principal, mini 1/2/3) dans chaque libellé.
3. **Arcanes elfiques, interface** : moteur, contrat et tests sont justes (premier Vent par défaut, second accepté, Vent étranger refusé), mais `js/ui/v5-magic-controls.js:151` lit `draft.magicChosenLore` brut : sans choix, la case « Appliquer l'attribut de Vent à la cible » n'apparaît pas alors que le moteur applique l'attribut du premier Vent, et la nature de base de Protection n'est pas posée (Aqshy par défaut). Utiliser le même défaut que le moteur. Supprimer les restes `attributePolicy==='first-wind'` (`tests/lot3-v5-elfiques-ui-browser.mjs:22`, `js/ui/workspace-view.js:1093`) et ajouter une assertion d'interface du défaut, plus un test moteur « Vent étranger refusé » (absent).
4. **Rapport** : options propres « 29 calculées / 16 assistées » annoncées, la matrice livrée dit 28 / 17 ; une option plus ancienne est passée en rappel : laquelle et pourquoi ?

## Décisions de lecture (Claude, à appliquer)

- **Surpuissance de portée** : jamais offerte quand la portée est Spéciale, une zone autour du lanceur, ou « Ligne de vue » (Enfants Sauvages de Zandox, Cor d'Andar, Apothéose…), comme pour « Vous » et « Contact ».
- **Vortex** : pas de dernier déplacement à la fin du tour d'expiration (le vortex disparaît). Les mini-vortex peuvent naître dès l'étape du lancer si le déplacement initial fait ≤ 8 yards (« on any round after the vortex moved ») : garder, et le dire dans le rapport.
- **Ver Grouillant** : égalité au Test opposé de Force → le ver gagne (il initie la lutte, V5 p. 131) : conforme, ajouter un test qui le documente.
- **Visage mutable** : le mode est un choix du lanceur (comme Cor d'Andar classé conforme) ; seul le Test de FM opposé dépend de la cible : revoir son classement « données MJ ». **Zandox** : la matrice le dit « calculable » alors que le BF des chiens manque (demandé à l'attaque) : aligner matrice et suivi.
- Les classements du suivi WoM sont codés en dur (`assistedStatus` dans `tools/build-lot3-wom-evidence.mjs`) : les dériver de la sonde comme pour les autres lots.

## Tests trop lâches (14 mutations restées vertes sur 50)

Thorsen collision 7 → 6 (masqué par le minimum d'1 Blessure : choisis une cible où la valeur compte) ; Transe d'Ambre Calme −2 ; Corps de Feu Calme −2 (le jet 95 échoue dans les deux cas : prends un jet entre les deux seuils) ; Suivi de l'Odeur Perception (Odorat) +2 ; mini-vortex seuil ≤ 8 (tester à 9) et coût 2 ; Cendres coût du Soleil 4 ; Épées coût d'option 2 et maximum 6 (une seule source, la donnée du contrat) ; Escalier plafond 200 ; Zandox portée 4 ; Sang Bouillonnant rayon d'explosion 2 ; Blizzard ignition 25 % ; plafond 3 des mini-vortex dans le contrat (garde-fou dupliqué : une seule source). Fixe chacune par une assertion écrite depuis la page.

## Cosmétique

Épées Sanguines : le nom des épées en attente est écrasé verticalement dans la liste des participants.
