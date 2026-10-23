# Rapport Pro — lot qualité de la phase E (23/10/2026)

Plan : `PLAN_PRO_QUALITE_E.md`. Branche `pro/qualite-e`, départ `9c12613`. Choix et questions : `CHOIX_EXECUTANT_QUALITE_E.md`.

| Lot | État | Commit |
| --- | --- | --- |
| Q0 | FAIT | (voir `git log`, « Q0 ») |
| Q1 à Q10, R | à faire | — |

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
