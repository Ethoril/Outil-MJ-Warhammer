# Arbitrages du MJ sur le repérage F1 — 25/10/2026

Quatre réponses « Ne pas implanter » portaient sur des règles que l'outil fait déjà en partie. Le MJ confirme : on ne retire rien, on n'ajoute rien.

| Question | Décision |
|---|---|
| F-L06-0057 Marche et course | Garder le calcul ×2 / ×4 de la Fuite d'un Brisé (`js/core/v5-broken-escape.js`) ; pas de calcul général de déplacement. |
| F-L06-0060 Sprint | Garder le Sprint de la Fuite d'un Brisé ; pas de Sprint général. |
| F-L06-0108 Modificateurs de situation | Garder les champs de pénalités saisis à la main (`V5_TYPED_PENALTIES`, `js/core/v5-talent-combat.js`) ; pas de tableau automatique. |
| F-L06-0129 Se rendre sans défense | Garder la case « Cible sans défense » (`js/ui/resolution-panel.js`) ; pas de règle dédiée au refus d'opposition. |

Règle de lecture pour la suite : « Ne pas implanter » sur une règle déjà présente veut dire « ne rien ajouter », jamais « retirer ».

## Blocs fermés en une fois (25/10)

Le MJ ferme par « Ne pas implanter » (« Rien » pour les familles) les sous-systèmes : navires et navigation, voyage/météo/environnement, maladies/poisons/remèdes, alchimie/potions, objets magiques, artisanat, économie/commerce, entre-aventures/société, compétences hors combat, tables d100 et lieux de scénario, équipement ordinaire, animaux/dressage.

Restent ouverts : véhicules et montures (poursuites comprises), bataille de masse/sièges/artillerie, mutations.

Classement par mots-clés relu par trois agents : 1 345 questions candidates, 375 retirées car elles touchent au combat, à la magie, aux prières, à la Corruption, au bestiaire ou à un bloc gardé ouvert (`blocs-exclusions-25-10.json`). **970 questions fermées**, dans `F1-import-blocs-25-10.json` (journal importable, fusionné avec les 124 réponses de l'export de 12 h 02 ; note « Bloc fermé le 25/10 : <thème> »).

## Seuil de Corruption (F-L06-0759 Âme pure), 25/10 après-midi

Réponse maintenue : « Implanter, version complète ». L'outil calculera lui-même le seuil de Corruption (BE + BFM, doublé par Âme pure), car le faire porter par la fiche risque un décalage. Exception assumée à la règle « valeurs dérivées dans les fiches » (`docs/lot2/CHOIX_POUR_LA_REPRISE.md`). Les points de Corruption viennent aujourd'hui de la fiche ; l'envoi de mises à jour vers la fiche, déjà prévu, transmettra les points de Corruption et les mutations éventuelles.

## Point d'étape de l'export de 16 h 49

1 324 réponses (970 blocs importés + 354 du MJ, dont 230 nouvelles depuis 12 h 02). Aucune ancienne réponse modifiée. Croisement avec le repérage : un seul écart (Âme pure, tranché ci-dessus). 16 réponses « Implanter, version complète » portent sur des règles partielles et 5 sur des règles absentes : ce sont les premiers vrais lots F2.

## Export (2), 25/10 soir : 1 743 réponses (970 blocs + 773 du MJ), 1 606 ouvertes

Trois accroches tranchées par le MJ :

- **Blessures L13 : rester en V5.** F-L13-0011, 0013, 0015, 0016 et 0019 passent en « Ne pas implanter » (cohérent avec le refus de l'option alternative F-L13-0010). Le moteur garde le second critique V5 sur dégâts excédentaires et le d10 de coagulation. F-L13-0012 et 0018 restent « Implanter » (déjà faits ou doublons de L06).
- **Mitrailleuse Ratling et Lance-feu (F-L11-0013, 0016) : la feuille du MJ fait foi.** Le catalogue garde ses valeurs (Ratling +9 / 60 yards ; Lance-feu +10 / 30 yards / Explosion 3). Seule la partie non couverte (contamination, effets particuliers) entre en F2.
- **Allonges Très longue / Massive et bandes de portée (F-L06-1033, 1034, 1040) : aide affichée.** L'outil affiche l'allonge en yards et propose les bandes de portée de l'arme ; le MJ choisit la bande, l'outil applique le modificateur. Aucun suivi de distance (PLAN_EVOLUTION inchangé).

À noter aussi : F-L06-1064 Rechargement adapté par le MJ, « pas un nombre d'Actions mais un nombre de succès ».

## F1 terminée — export final (3), 25/10

3 349 / 3 349 questions renseignées (970 blocs + 2 379 réponses du MJ), aucune réponse antérieure modifiée. Journal archivé : `F1-journal-final-25-10.json`.

Les cinq réponses L13 (0011, 0013, 0015, 0016, 0019) sont restées « Implanter » dans le journal ; l'arbitrage « rester en V5 » ci-dessus prime.

**Candidats F2 : `F2-candidats.json`**, 220 règles retenues, dont 22 déjà faites, soit **198 à traiter** : Combat 89, Équipement 32, Blessures 31, Psychologie/Corruption 14, Bestiaire 10, Destin 7, Véhicules 4, Compétences 3, Talents 3, Hors périmètre 3, Maladies 1, Création 1. Aucune règle de magie retenue. 7 portent une note ou un choix ligne par ligne.

## Points tranchés avant F2 (25/10, fin de journée)

1. Taille V4 de l'Ogre (F-L01-0054, 0057, 0058) et bouclier variante (F-L13-0082) : **rester en V5**, retirés de F2.
2. Spécialités (F-L06-0847) : **garder l'existant** (`suggestSkill`), compléter seulement ce qui manque.
3. Mutations : **tout dans F2-K**, table L17 (Winds of Magic) **convertie en V5**, saisie déléguée et contre-vérifiée.
4. Suivi des séquelles hors combat : **module neuf**, indépendant de l'horloge de magie.

Plan à jour : `PLAN_F2_LOTS.md`, `F2-lots.json` (194 règles, 14 lots).
