# Brief GPT — Phase E : Traits de créature et bestiaires

Lis d’abord `docs/plans-gpt/REGLES_COMMUNES_GPT.md` (règles et démarche complètes). Branche : `gpt/phase-e`.

## Entrées

- Inventaire : `docs/BESTIAIRE_INVENTAIRE.json` / `.md` (249 règles, 541 références : 508 profils, 27 gabarits, 6 prétirés).
- Arbitrages : `docs/ARBITRAGES_MJ_21_10.md`, section « Bestiaires » (et section Brisé pour Peur et Terreur).
- Existant : couverture des Traits (`grep -rni "trait" js/core js/data`, `js/data/v5-transformation-bestiary.js`), formats d’import `docs/IMPORT_PROFILS_JSON.md` et `docs/IMPORT_PROFILS_TEXTE.md`, `js/core/json-profile-import.js`.

## Contenu attendu du plan de lots

1. Complément d’inventaire L19-L26 (Sea of Claws, The Horned Rat Companion, Death on the Reik Companion… : Traits nouveaux et liste des profils).
2. Traits : lots par famille (combat, déplacement, sens, psychologie, natures, magie), version V5 partout, raccordés aux services existants (jamais sur la seule étiquette) ; Démoniaque et Protection au service commun de protection ; Natures (Fabriqué, Éthéré, Artificiel…) automatisées, besoins vitaux en rappel ; Régénération sur le registre des Blessures Critiques ; Plusieurs têtes avec registre par tête.
3. Familiers : lien automatisé (si la phase D ne l’a pas déjà fait), deux systèmes distincts (animal, homoncule).
4. Capacités Slann : assistées sur leurs seuls profils.
5. Modèle de données des profils de bestiaire (fichier de données du jeu, valeurs imprimées telles quelles, aucun recalcul de BF, de Taille ou d’armure), puis import **livre par livre** : livre de base, Imperial Zoo, puis les autres ; gabarits et prétirés inclus ; noms français du livre FR, sinon proposition consignée dans `docs/plans-gpt/CHOIX_EXECUTANT_PHASE_E.md`.
6. Bibliothèque de profils accessible depuis l’outil (ajout d’une créature au combat depuis la bibliothèque), avec parcours navigateur.
7. Raccordement des sorts d’invocation (Relever les morts…) aux profils importés.

Fin de phase : recette complète verte, rapport `docs/plans-gpt/RAPPORT_GPT_PHASE_E.md`.
