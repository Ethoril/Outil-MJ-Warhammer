# Brief GPT — Phase B : Courroux des dieux complet

Lis d’abord `docs/plans-gpt/REGLES_COMMUNES_GPT.md` : ses règles et sa démarche (complément d’inventaire, plan de lots commité, exécution, rapport) s’appliquent en entier. Branche : `gpt/phase-b`.

## Entrées

- Inventaire : `docs/divin/COURROUX_INVENTAIRE.json` et `.md` (69 entrées, statut actuel prouvé par fichier:ligne).
- Arbitrages : `docs/ARBITRAGES_MJ_21_10.md`, section « Courroux ».
- Code existant : `grep -rni "wrath\|courroux\|péché" js/core js/ui --include=*.js` ; tests `tests/divin-v5-wrath*`.

## Contenu attendu du plan de lots (au minimum)

1. Lecture V5 partout pour les entrées divergentes (01-05, 66-70, 81-87, 88, 121-125).
2. **Changement de comportement** : à 0 Péché, plus aucun déclenchement de la table (caractérisation de l’actuel d’abord, puis changement).
3. Automatisation ou assistance de chaque entrée de table qui a une mécanique (États, dégâts, pertes de Caractéristiques, malus de DR à durée calendaire, interdictions de prier, invocations de démon), en réutilisant les effets divins génériques et l’horloge de campagne existants.
4. 26-30 et 56-60 : le MJ coche les compétences du personnage concernées au moment de l’effet (pas de liste par culte).
5. 41-45 : « alliés » = même camp que le prêtre, corrigeable par le MJ.
6. Pénitences : objet suivi sur la fiche (en cours / accomplie), restitution automatique des objets et talents à la clôture, clôture par le MJ seul ; interface et parcours navigateur.
7. Absolution : flux dédié (bouton sur la fiche : Test, réduction des Péchés, table si échec).
8. Cultes elfes exemptés d’office du Péché et du Courroux.
9. 151+ : après retour par Point de Destin, proposer 146-150, le MJ confirme.

Fin de phase : recette complète verte (`node tools/run-divine-recipe.mjs`), rapport `docs/plans-gpt/RAPPORT_GPT_PHASE_B.md`.
