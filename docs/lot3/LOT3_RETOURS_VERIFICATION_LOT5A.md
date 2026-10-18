# Retours de vérification du lot 5a (catalogue Feu, Cieux, Métal, Bêtes) — à traiter en premier dans le lot 5b

13 octobre 2026. Vérification Claude sur une copie : `node --test` 1 930/1 930, huit recettes vertes, trois générations identiques, **aucune erreur chiffrée sur les 55 sorts** (WoM pp. 53, 74-77, 98-101, 134-137, 147-149, conversions en DR justes, DR final pour les « +DR »). Retours des lots 3 et 4 corrigés (Sang Bouillonnant 1 tick pour 1 Round sur Tours réels, Blizzard 6, Lames 6, vortex étiquetés, Arcanes elfiques dans l'interface, Chaîne, surpuissance de portée). 89 mutations sur 93 tuées.

## Règle de classement à appliquer (précise la règle du lot 3)

- **Calculable** : le moteur applique au moins une valeur mesurable (PA, plancher de PA, état, Test, dégâts, interdiction, fin sur événement…) dans **au moins une** situation admissible du sort. La sonde doit donc essayer **chaque option de fait**, une **cible ennemie** et une **cible alliée** selon la règle du sort, et **désigner des destinataires secondaires** quand le sort en a. Les clauses non calculées restent affichées en rappel (« calculable + rappel »).
- **Données MJ** : un fait saisi par le MJ est **lu par le calcul** et l'aperçu est bloqué tant qu'il manque. Un fait qui n'est lu par aucun calcul ne doit pas bloquer (le rendre optionnel ou le retirer).
- **Rappel** : aucune valeur mesurable appliquée dans aucune situation.

## Classements à corriger

- **Rappel à tort, le moteur calcule** : Coruscation de Finreir (`apFloor {all:5}` et Vol), Aura ordinaire (interdiction de lancer, fin sur Focalisation), Chaleur Desséchante (Exténué sur Courir/Charger/Fuir), Lumière aveuglante, Portail d'Ombre, Pas d'Ombre, Perturbant (états ou −2 DR sur destinataires désignés), Inscription (mode acide : projectile +2). Cause : `computeCoverageCategory` (`tools/build-v5-spell-contracts.mjs` ~l.2497-2506) ignore `apFloor`, `cannotCastOther`/`endsOnEvents` et les états des destinataires ; la sonde prend l'option 0 des faits et la cible « Vous ». Les 143 calculables sont sous-estimés.
- **Données MJ à tort, fait non lu** : Tempête de Flammes (`minutesToDawn` lu seulement pour Destrier d'Ombre ; durée Instantané), Polir et Exalter (`glassLens` lu seulement si une option est payée, mais bloque le lancer de base), Essais et Erreurs (texte « compétence » non consommé), Colérique (`ireSubject` simple libellé), Forge de Tarnus et Miroir Mystique (préconditions qui ne bloquent aucun calcul ; Miroir = rappel).

## Défauts

1. **Textes de rappel recopiés** : Miroir Mystique et Armure d'étain affichent le texte de Blindage de météorite (« Protection (4) pendant un Round… ») — `tools/build-v5-spell-contracts.mjs` l.2268 et l.2274 (6e argument de `womSpec`), reporté dans les fiches (~l.554, 560). Attendu : Miroir = communication par miroir ; Armure d'étain = −2 PA métalliques par localisation.
2. **Tempête de Shemtek, variante sûre** : le texte d'action reprend la variante normale (« lanceur 1 Sonné… ») alors que le mode sûr n'applique ni Sonné ni Peur.
3. **Œil Invisible** : 3 PV codés en dur dans le moteur (`v5-spell-contracts.js` ~l.686) ; `summon.hp` du contrat est décoratif : une seule source (le contrat).
4. **Textes compressés** : reminders d'Écaille d'acier et de Robe scintillante sans espaces (« ancienprofil identique àGlitteringRobe V4 »).
5. **Cosmétique** : nom des Épées Sanguines en attente écrasé verticalement dans la liste des participants (retour du lot 4 non traité).

## Tests trop lâches

- « Vent étranger refusé » (`tests/lot3-v5-retours-lot3.test.js` l.9) ne teste que `chosenLore:'high'`, refusé par un autre garde-fou ; neutraliser le contrôle (`v5-spell-contracts.js:1611`) laisse la suite verte. Tester un Vent de couleur qui n'est pas l'un des deux Vents du sort (ex. Feu sur Bannissement Mineur).
- Attraction des Flèches : Test de CT de l'option « localisations » (`tools/v5-elven-spell-contracts.mjs:12`, `modifierSl:0`) non fixé.
- Test P3 de la Chaîne : simple `assert.match` sur le source de `resolution-panel.js` ; tester le rendu (la recette le couvre, garde une assertion de comportement).
- Test P2 : la regex `/Rappel|données MJ/` accepte aussi « calculable + Rappel » ; asserter la catégorie exacte.

## Décision du MJ (13 octobre)

Écaille d'acier et Robe scintillante restent **deux sorts distincts** (WoM p. 75 et V5 p. 253) : pas de fusion ; retire la question ouverte du rapport et du cadrage.
