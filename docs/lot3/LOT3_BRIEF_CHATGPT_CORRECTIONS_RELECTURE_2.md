# Brief pour ChatGPT — corrections après la seconde relecture (3.15.0)

14 octobre 2026. Dernier chantier de correction du lot 3. Règles générales de [ton premier brief](LOT3_BRIEF_CHATGPT_DISSIPATION_ET_FICHES.md) : aucun commit, push, fusion ni déploiement ; aucune commande git destructive ; personne d'autre n'écrit dans le dépôt ; test rouge avant chaque correctif (dis-le s'il n'a pas pu être vu rouge) ; aucune sauvegarde de tests dans `tmp/`.

## Entrées

- **[LOT3_RELECTURE_2_CLAUDE.md](LOT3_RELECTURE_2_CLAUDE.md)** : la liste complète (points 1 à 26 et « Points de règle »), avec fichiers et lignes. C'est ton cahier des charges : traite **tous** les points.
- **Décisions du MJ du 14 octobre** dans le [cadrage](LOT3_CADRAGE_MAGIE.md) :
  - **Focalisation (révise D-10)** : une seule compétence pour les huit Vents ; seule la Focalisation de Haute Magie (Qhaysh) est distincte. Une « Focalisation (Vent coloré) » importée est lue comme la compétence unique ; plusieurs valeurs différentes sur une fiche = anomalie de fiche signalée au MJ (message visible), pas de score propre à un Vent. Adapte le moteur (`v5-magic-channelling.js`), les tests de D-10 et le smoke qui attendait +9 (justifie la nouvelle valeur).
  - **Protection et Critique** : une Protection réussie annule dégâts et Critique (trait Ward, p. 363) — comportement actuel à conserver et à documenter dans les Règles ; les autres effets du sort s'appliquent toujours.
  - **Fléau des Démons** : pas de cumul sur un Démon déjà affaibli.
  - **« empête » → « Tempête »** : renommer dans le snapshot, le miroir CSV, les contrats (nom, `canonicalName`, clés dans `tools/v5-overcast-specific.mjs`), le moteur (cas spécial `v5-spell-contracts.js` ~l.595), et migrer les anciens enregistrements (sorts de fiches, couches actives, reçus) qui portent l'ancien nom.
- Pour les « Points de règle » non tranchés ci-dessus, applique la proposition du document (Mort : vivants seulement comme la Vie ; Lames Azurées : ajout d'un engagé ; auteur retiré : rappel ; synchronisation de fiche pendant une transformation : différer les champs remplacés ; Main de Gloire : refuser `M` dans `chosenStats` ; Apothéose Verdoyante à 0 DR : 0 B ; épuisement : exiger la FM).

## Catalogue et feuille

Les points 24 à 26 changent des descriptions et un nom. Après correction :
1. snapshot, miroir `Magie.csv` et versions recalculés (méthode du catalogue V5, `localRevision` mis à jour) ;
2. **régénère le classeur Excel `Magie_V5.xlsx`** (même format, même emplacement que la version actuelle) et un fichier court `docs/lot3/LOT3_A_REPORTER_DANS_LA_FEUILLE_RELECTURE_2.md` listant **seulement les cellules changées depuis le report du MJ du 14 octobre** (le MJ a déjà reporté la version précédente) ;
3. le test de parité catalogue/contrat doit rester vert, et ajoute une vérification des `reminders` des contrats contre les descriptions pour les valeurs chiffrées clés (seuil de Protection, dégâts, durée).

## Validation

Rejoue toute la recette `LOT3_RECETTE_3_15.md` (y compris cloud local et paquet de livraison hors ligne) et `tools/check-lot3-generation.mjs`. Mets à jour le suivi, le plan (C-06 fait), le journal 3.15.0 et la section Règles si une règle visible change. Version : reste en 3.15.0 si rien n'a été livré entre-temps.

## Livrable

`docs/lot3/LOT3_RAPPORT_CORRECTIONS_RELECTURE_2.md` : statut de chacun des 26 points et des points de règle (fait, avec test ; ou non fait, avec raison), nouvelles valeurs de la matrice, versions du catalogue, résultat de chaque commande de la recette, et la liste des cellules à reporter dans la feuille.
