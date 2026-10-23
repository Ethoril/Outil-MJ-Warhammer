# Rapport Pro — lot qualité de la phase E (23/10/2026)

Plan : `PLAN_PRO_QUALITE_E.md`. Branche `pro/qualite-e`, départ `9c12613`. Choix et questions : `CHOIX_EXECUTANT_QUALITE_E.md`.

| Lot | État | Commit |
| --- | --- | --- |
| Q0 | FAIT | (voir `git log`, « Q0 ») |
| Q1 | FAIT | (voir `git log`, « Q1 ») |
| Q2 à Q10, R | à faire | — |

## Q0 — contrôle de complétude

- `tools/verify-bestiary-stats.mjs` : un zéro initial imprimé (« 09 », « 04 ») est lu comme « 9 », « 4 » ; un profil sans colonne de Blessures (Construct, L17) n'attend plus de dernier chiffre. Les 3 faux écarts (E0-P-515, E0-P-564, E0-P-640) disparaissent : **0 écart sur les 23 livres**. Le cas « tiret rendu en U+FFFD » était déjà couvert par la normalisation existante ; aucun écart ne lui était dû.
- Nouveau `tools/lib/bestiary-completeness.mjs` (fonctions pures, testées par `tests/pro-q0-completude.test.js`) : pour chaque profil retrouvé dans le texte brut, les talents du catalogue (`englishName` de `reference-snapshot.json`) de la rubrique « Talents » et les compétences de la rubrique « Skills » (une ou plusieurs spécialisations, césures recollées) doivent figurer dans le JSON. Écrit `tmp/divin/bestiary-completude-<livre>.json` et un résumé par livre.
- Limite connue : le bloc s'arrête à la fin de la page ou à l'en-tête de caractéristiques suivant ; un bloc qui déborde sur la page suivante n'est vérifié que sur sa première page.

### État de départ (profils incomplets / talents manquants / compétences manquantes)

| Livre | Profils | Talents | Compét. | Livre | Profils | Talents | Compét. |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L01 | 7 | 37 | 53 | L16 | 9 | 14 | 20 |
| L02 | 6 | 15 | 52 | L17 | 6 | 7 | 0 |
| L03 | 2 | 6 | 12 | L18 | 9 | 11 | 1 |
| L04 | 6 | 64 | 55 | L19 | 11 | 21 | 0 |
| L06 | 0 | 0 | 0 | L20 | 16 | 19 | 5 |
| L07 | 12 | 60 | 6 | L21 | 7 | 10 | 15 |
| L09 | 0 | 0 | 0 | L22 | 6 | 7 | 2 |
| L10 | 0 | 0 | 0 | L23 | 9 | 15 | 0 |
| L11 | 9 | 9 | 7 | L24 | 12 | 22 | 34 |
| L12 | 7 | 41 | 39 | L25 | 7 | 5 | 8 |
| L13 | 2 | 1 | 2 | L26 | 4 | 4 | 0 |
| L14 | 16 | 241 | 348 | | | | |

Total : 23 livres contrôlés. L14 domine (bloc coupé, lot Q5). Les manques de L01-L04 et L07 sont à examiner après Q1-Q2 (une partie peut venir de la mise en page de ces livres, à justifier un par un).

Aucune fonction de jeu n'est ajoutée : outil de contrôle seulement (pas de « branché » à déclarer).

## Q1 — talents à plusieurs mots (FAIT)

- `tools/lib/bestiary-record.mjs` : `isCatalogueTalent` ; un nom présent au catalogue (`reference-snapshot.json`) n'est plus jamais écarté par `isNoise`. Livres régénérés par `tools/build-bestiary-profiles.mjs` (23 livres) : **ajouts seulement** (19 fichiers, aucune ligne retirée hors `"talents": []` remplacés), 12 caractéristiques et Blessures intactes (aucun champ de valeurs touché).
- Test : `tests/pro-q1-talents.test.js` (Nastassia : Master of Disguise + Tower of Memories ; Count Jäger : Break and Enter, Master of Disguise, Nose for Trouble ; Combat Familiar : Suffuse With).
- Aucune fonction de jeu : données et outil de génération (pas de « branché » à déclarer).

### Contrôle Q0 après Q1 (profils / talents / compétences manquants)

L01 6/36/53 · L02 6/15/52 · L03 1/5/12 · L04 4/62/55 · L06 0 · L07 7/54/6 · L09 0 · L10 0 · L11 8/8/7 · L12 7/41/39 · L13 1/0/2 · L14 16/241/348 · L16 8/10/20 · L17 1/1/0 · L18 2/1/1 · L19 3/12/0 · L20 6/3/5 · L21 4/3/15 · L22 3/1/2 · L23 2/7/0 · L24 5/14/34 · L25 6/0/8 · L26 2/2/0.

Talents manqués passés de ~600 à ~520 : les talents à plusieurs mots sont récupérés. Le reste n'a **plus la même cause** : le profil sort sans talents ni compétences quand la colonne de droite est imbriquée dans la prose de gauche (voir `QE-Q1-2` dans les choix). Non justifié un par un ; lot **Q11** proposé (extraction en colonnes, avec Q5). Les compétences (Q2) restent à faire : Count Jäger garde Language (Thief) et Melee (Basic).

### Suite complète

Un seul échec, étranger au lot : `divin-v5-e0-independent` attend `tmp/divin/recipe-receipt.json` (reçu produit par `node tools/run-divine-recipe.mjs`, lancé au lot R, absent de ce worktree).
