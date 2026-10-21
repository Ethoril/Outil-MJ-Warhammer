# Brief GPT — Phase D : traditions de magie et compléments

Lis d’abord `docs/plans-gpt/REGLES_COMMUNES_GPT.md` (règles et démarche complètes). Branche : `gpt/phase-d`.

## Entrées

- Inventaires : `docs/lot3/LOT4_TRADITIONS_BASE.json` / `.md` (7 traditions, 33 sorts) et `docs/lot3/LOT4_TRADITIONS_SUPPLEMENTS.json` / `.md` (144 sorts ou rituels, 82 runes, 17 règles de système).
- Arbitrages : `docs/ARBITRAGES_MJ_21_10.md`, sections « Principe transversal », « Traditions du livre de base », « Traditions des suppléments et runes ».
- Circuit existant des sorts (lot 3) : `docs/lot3/LOT3_CADRAGE_MAGIE.md`, `docs/lot3/LOT3_FINALISATION_MAGIE.md`, `js/data/v5-spell-contracts.json`, `js/core/v5-spell-contracts.js`, `js/core/v5-magic-*.js`, tests `tests/lot3-*`. Repère comment un sort entre au catalogue et reçoit son contrat, puis reproduis exactement ce circuit.

## Contenu attendu du plan de lots

1. Complément d’inventaire L19-L26 (notamment The Horned Rat Companion pour une éventuelle magie skaven : l’inventorier, la marquer « à arbitrer », ne pas l’implanter sans arbitrage).
2. Traditions du livre de base : Domaine de la Magie naturelle (nom officiel ; sorts V5 + 9 d’AOTE3 convertis en V5), Sorcellerie (ingrédients neutralisés), Démonologie, Nécromancie (sans attribut de domaine), Chaos (Nurgle, Slaanesh, Tzeentch, 9 sorts) ; un lot par tradition au plus, avec contrats et tests de contrat.
3. Familiers : règles de Winds of Magic converties en V5, ouvertes à tous, lien automatisé avec le maître (à coordonner avec la phase E) ; document de conception commité avant le code.
4. Suppléments : magie orque (Gork et Mork ; le livre le plus récent fait foi), variantes slann (extensions explicites des contrats existants), magie elfique de Vaul, Hoeth et de la mer, Grande Gueule (sans ingrédient), compléments des Collèges (Winds of Magic et autres) ; un lot par famille.
5. Runes naines : **conception uniquement**, dans `docs/plans-gpt/CONCEPTION_RUNES.md` (gravure, types de runes, Runes de Maître, conversion V5, interaction avec l’équipement et les talents), sans code : le MJ la valide avant implémentation.
6. Exclus : Vampires, rituels, magie expérimentale de PNJ (O Mere Be More), sorts à deux lanceurs (Skin of Bone and Bark).
7. Relever les morts dépend des profils Squelettes et Zombies (phase E) : contrat prêt, participant générique en attendant, raccordement noté pour la phase E.

Fin de phase : recette complète verte, rapport `docs/plans-gpt/RAPPORT_GPT_PHASE_D.md`.
