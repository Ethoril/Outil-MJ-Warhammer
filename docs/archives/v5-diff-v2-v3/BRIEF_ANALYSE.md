# Brief — impact de la v3 du livre de base V5 sur l'outil (29/10/2026)

L'éditeur a publié une v3 du livre de base V5 EN. Gemini a résumé les changements dans `E:/Outil MJ Warhammer/docs/LIVRE_DE_BASE_V5_DIFF_V2_V3.md` (à vérifier, pas à croire). Claude a extrait les deux textes et produit le diff exact :

- `E:/Outil MJ Warhammer/tmp/v5-diff-v2-v3/v2.txt` et `v3.txt` : texte complet, pages séparées par un saut de page (`\f`), page n = n-ième bloc.
- `E:/Outil MJ Warhammer/tmp/v5-diff-v2-v3/DIFF_MOTS.txt` : 112 pages modifiées, 565 changements au mot près. Beaucoup sont du **reflux de mise en page** (un paragraphe déplacé apparaît en `delete` puis en `insert`) : recolle-les avant de conclure qu'une règle a changé.
- PDF : `E:/Projet Warhammer Ennemi Intérieur/tmp/catalogue-bibliotheque/pdfs/Livre de base V5 EN v2.pdf` et `... v3.pdf` (`pdftotext -f N -l N -layout` pour relire une page).

## Où l'outil porte les règles

Code le plus récent : worktree `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-worktree` (branche `gpt/phase-f2`, en avance sur `main`). **Lecture seule sur tout le dépôt** : tu n'écris que ton rapport.

- Moteur : `js/core/*.js` (résolution `resolution.js`, Store `store.js`, effets/états `v5-effects.js`, Élan `v5-momentum.js`, talents `v5-talents.js`, magie `v5-magic-*.js`, `v5-spell-contracts.js`, prières `v5-divine-*.js`, qualités d'armes, critiques, maladresses…).
- Données : `js/data/` — `reference-snapshot.json` (équipement, talents, compétences, sorts… **généré depuis la feuille Google du MJ**, qui fait foi : un changement de valeur d'arme ou de talent se reporte d'abord dans la feuille, pas dans le code), `js/data/bestiary/*.json` (profils de créatures), tables de critiques, de maladresses et d'incidents magiques (cherche-les).
- Les règles V4 / suppléments convertis en V5 utilisent les DR. Les distances sont des aides affichées, jamais suivies.

## Ce que tu produis

Pour **chaque changement de règle réel** de ta plage de pages (ignore la typographie : `D100`→`d100`, date d'édition, coquilles sans effet ; regroupe-les en une ligne) :

| # | Page v3 | Changement exact (v2 → v3, citation courte) | Nature (correction / clarification / changement mécanique / nouveau contenu) | Gemini (juste / inexact / absent de son rapport) | Dans l'outil (fichier:ligne ou donnée, comportement actuel) | Porteur (code / feuille du MJ / bestiaire / rien) | Effort (faible / moyen / fort) |

Puis une courte liste des affirmations de Gemini **fausses ou inexactes** sur ta plage, et des changements réels qu'il a **oubliés**.

N'émets pas de recommandation de report : c'est le MJ qui tranchera. Signale seulement ce qui contredirait une décision déjà prise par le MJ (cherche dans `E:/Outil MJ Warhammer/tmp/f1-reperage/ARBITRAGES_25_10.md` et `docs/ARBITRAGES_MJ_21_10.md`).

Rapport en français, dans le fichier indiqué dans ta mission, en Markdown. Réponds ensuite en 5 lignes : nombre de changements réels, combien touchent l'outil, les 3 plus lourds.
