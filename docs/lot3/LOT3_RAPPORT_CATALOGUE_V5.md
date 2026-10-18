# Catalogue V5 — rapport local après vérification

14 octobre 2026. Worktree `lot2-combat-v5`, branche `codex/lot2-talents-v5`, application 3.14.0. **157 sorts modifiés par rapport à la feuille initiale, dont 121 descriptions ; 277 identités conservées.** Cette passe modifie 45 lignes et 50 cellules par rapport au miroir livré le 13 octobre. Nom et Type sont inchangés.

| Domaine | Sorts modifiés | Descriptions |
| --- | ---: | ---: |
| Arcanes | 16 | 14 |
| Arcanes elfiques | 6 | 4 |
| Bêtes | 21 | 19 |
| Cieux | 9 | 6 |
| Feu | 20 | 20 |
| Haute Magie | 12 | 10 |
| Lumière | 10 | 7 |
| Métal | 14 | 7 |
| Mineurs | 12 | 5 |
| Mort | 14 | 12 |
| Ombres | 11 | 10 |
| Vie | 12 | 7 |

Cellules à reporter : NI 19, Portée 34, Cible 28, Durée 42, Description 121 (244 cellules). [Valeurs exactes à coller](LOT3_A_REPORTER_DANS_LA_FEUILLE_MAGIE.md), [avant/après et pages](LOT3_PREUVES_CATALOGUE_V5.json), [fiches actualisées](LOT3_FICHES_CORRECTION_CONTRATS.md).

## Retours du 14 octobre

| Point | Correction et preuve |
| --- | --- |
| 1 | V5 pp.242–244 : les cinq durées aethyriques, Bouclier, Pont et Envol ne portent plus de « + ». Contrats et catalogue alignés ; contrôle sur toutes les durées et portées. |
| 2 | HEPG p.82 : Masque de l’Esprit affiche −3 DR pour Intuition et lecture/divination. |
| 3 | HEPG p.89 : « empête » conserve sa clé ; malus aux Tests de CT transposé en −3 DR. Le −20 aux caractéristiques reste une valeur de caractéristique. |
| 4 | WoM p.135 : Tempête de Flammes explique la zone jusqu’à dissipation ou jusqu’à l’aube ; les dégâts initiaux restent immédiats, le terrain reste assisté par le MJ. |
| 5 | WoM p.77 : Réplique de Levorg, durée 1d10 heures dans contrat, champ et description ; dé secret explicitement fourni, aucune valeur implicite. |
| 6 | WoM p.63 : Yeux de Volans mentionne le Trait Corrompu ; une mutation couverte peut encore échapper, sans exclusion automatique. |
| 7 | WoM pp.86,135–136,149 : Enchevêtré pour Abulla et Ver Grouillant ; quantités de durée explicites pour Colérique et Flamme Inextinguible. |
| 8 | Unités « mètres » corrigées ; BFM, BI et FM développés dans les descriptions, sans changer les noms ou Types. |
| 9 | Écaille d’acier et Robe scintillante distincts : rappel, audit et rapport 5A corrigés. Décision MJ du 13 octobre conservée. |
| 10 | Libellés des options, faits et choix espacés à la génération. Test étendu à ces libellés ; identifiants et clés de faits préservés. Recette 5B adaptée au libellé affiché. |
| 11 | Cloud : refus Cadai sur Carreau sans consommation, puis lancement raté de Bannissement Majeur avec rune et réserve consommées ; rechargement, Undo et synchronisation sur Auth/RTDB émulés locaux. |
| 12 | Sonde : six effets périodiques retrouvés par état après vraie fin de Tour, contre témoin. Sang de la Terre garde sa précondition MJ et ses soins périodiques calculés. Une couche périodique de reçus seule ne compte pas comme effet. |
| 13 | Suivi : clause actuelle de Lileath sans texte périmé ; statuts, synthèses, preuves des lots 1 à 5B et tableau 5B alignés sur la matrice. |

Les points 1 à 10 et les régressions de classement sont couverts par `tests/lot3-v5-retours-catalogue.test.js` (10 tests ; huit rouges initiaux observés). Les pages citées ont été relues dans les sources privées, sans copier les PDF ni leur texte intégral dans le dépôt.

Matrice actuelle : **165 calculables / 49 données MJ nécessaires / 63 rappels / 0 restant**. Le lot 5B compte **27 conformes / 13 données MJ / 18 rappels**. Les classements portent sur les scénarios mesurés ; les clauses assistées ne deviennent pas automatiques. Les trois clauses de talents non vérifiées restent explicites.

## Versions

Références : `references:0b848ee63558f7a21181888f1294c83d42ae9acbe178a1c9ce02fef50da2f311` → `references:2578ebf4c499024f60a53b42475db4a94498ece1bb91c52533f316baaf2dfda3`.

Magie : `sha256:c90161ae60622f6e28359d1a2f0d3be6dddc6d56babc2c61b872abbf72255527` → `sha256:79c69082a939528aa549e4b64ba38b6bebb122c1bc6e0086405132851d66d26b`.

Révision : `2026-10-13-catalogue-v5` → `2026-10-14-catalogue-v5`. Empreinte du miroir : `f1db35feb621b9cb1c4f95a70a34a2fe65ebea49719349abc5ad8f65ee0d6f1d`. Les preuves conservent aussi les versions de la feuille initiale. Les dates de collecte publique restent celles de la collecte.

## Validation et report de la feuille

**2 166/2 166 tests Node**, zéro échec, aucune sauvegarde de tests dans `tmp/`. Dix recettes navigateur vertes : références, smoke magie, magie 2b, Domaines, Arcanes/mineurs, elfiques, WoM, catalogue 5A, catalogue 5B et combat. Recettes 5A : 72 gestes ; 5B : 122 gestes, captures ordinateur/mobile inspectées. Recette cloud 3.5 verte avec Auth/RTDB émulés locaux : deux clients, IndexedDB natif, rechargement, Undo, divergence hors ligne et rejeu. Deux générations complètes successives : **16 fichiers identiques**. Les tests vérifient les 277 paramètres, le miroir, les empreintes, les caches et un refresh depuis le miroir local corrigé.

Le classeur Excel est régénéré dans le même format : un onglet Magie, sept colonnes, 277 sorts, filtres, volets figés et descriptions multilignes. Les 1 946 cellules sont comparées exactement au miroir ; les NI sont numériques. Le fichier de cellules à coller inclut toutes les corrections de cette passe.

**La feuille Google reste à mettre à jour par le MJ avant la livraison de l’outil.** Tant qu’elle contient le catalogue `references:264062…`, « Actualiser » peut réinstaller cet ancien contenu. Le test de refresh local ne prouve pas la mise à jour distante. Aucun envoi dans Google Sheets, commit, push, fusion ou déploiement effectué.
