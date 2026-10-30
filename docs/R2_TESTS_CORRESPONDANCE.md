# Correspondance des tests (R2)

Ancien fichier `tests/<nom>.test.js` → nouveau fichier `tests/unit/<cible>.test.js`. Les nombres sont ceux de `node --test` (tests de boucles compris); « après » est le total du fichier cible.

## R2-1 — données et outils

| Ancien fichier | Nouveau fichier | Tests avant | Tests après (cible) |
|---|---|---|---|
| `tests/audit-covered-selectors.test.js` | `tests/unit/donnees/audit-meta-production.test.js` | 1 | 21 |
| `tests/audit-empty-page.test.js` | `tests/unit/donnees/audit-meta-production.test.js` | 1 | 21 |
| `tests/audit-fr-names.test.js` | `tests/unit/donnees/audit-meta-production.test.js` | 2 | 21 |
| `tests/audit-phase-f.test.js` | `tests/unit/donnees/audit-meta-production.test.js` | 7 | 21 |
| `tests/glm-eval-summary.test.js` | `tests/unit/donnees/audit-meta-production.test.js` | 2 | 21 |
| `tests/production-rules.test.js` | `tests/unit/donnees/audit-meta-production.test.js` | 1 | 21 |
| `tests/rules.test.js` | `tests/unit/donnees/audit-meta-production.test.js` | 2 | 21 |
| `tests/sw.test.js` | `tests/unit/donnees/audit-meta-production.test.js` | 5 | 21 |
| `tests/pro-d1-bestiary-model.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 5 | 223 |
| `tests/pro-q0-completude.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 5 | 223 |
| `tests/pro-q1-talents.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 2 | 223 |
| `tests/pro-q11-controle-etendu.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 7 | 223 |
| `tests/pro-q12a-colonnes-imbriquees.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 7 | 223 |
| `tests/pro-q12b-profils-vides-l07-l12.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 13 | 223 |
| `tests/pro-q12c-profils-l13-l26.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 7 | 223 |
| `tests/pro-q13-cas-nommes.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 9 | 223 |
| `tests/pro-q14-sorts.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 13 | 223 |
| `tests/pro-q15-normalisation-noms.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 5 | 223 |
| `tests/pro-q2-competences.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 3 | 223 |
| `tests/pro-q25-controle.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 4 | 223 |
| `tests/pro-q26-cas-nommes.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 12 | 223 |
| `tests/pro-q27a-faux-positifs.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 3 | 223 |
| `tests/pro-q27b-completude.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 7 | 223 |
| `tests/pro-q27c-completude.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 8 | 223 |
| `tests/pro-q27d-completude.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 8 | 223 |
| `tests/pro-q27e-completude.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 7 | 223 |
| `tests/pro-q27f-completude.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 5 | 223 |
| `tests/pro-q27g-completude.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 4 | 223 |
| `tests/pro-q27h-completude.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 5 | 223 |
| `tests/pro-q27i-completude.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 5 | 223 |
| `tests/pro-q3-equipement.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 4 | 223 |
| `tests/pro-q32-controle-formats.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 7 | 223 |
| `tests/pro-q33-cas-confirmes.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 13 | 223 |
| `tests/pro-q34a-completude.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 4 | 223 |
| `tests/pro-q34b-completude.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 7 | 223 |
| `tests/pro-q34c-completude.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 3 | 223 |
| `tests/pro-q36-cas-confirmes.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 13 | 223 |
| `tests/pro-q38-controle.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 3 | 223 |
| `tests/pro-q40-extraction.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 12 | 223 |
| `tests/pro-q41-portees.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 6 | 223 |
| `tests/pro-q5-sea-wardens.test.js` | `tests/unit/donnees/bestiaire-completude-outils.test.js` | 7 | 223 |
| `tests/pro-bestiary-data.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 24 | 95 |
| `tests/pro-d10-l10.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 3 | 95 |
| `tests/pro-d11-l12.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 4 | 95 |
| `tests/pro-d12-l13.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 3 | 95 |
| `tests/pro-d13-l14.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 2 | 95 |
| `tests/pro-d14-l16.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 3 | 95 |
| `tests/pro-d15-l17.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 3 | 95 |
| `tests/pro-d16-l18.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 2 | 95 |
| `tests/pro-d17-l19.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 3 | 95 |
| `tests/pro-d18-l20.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 2 | 95 |
| `tests/pro-d19-l21.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 2 | 95 |
| `tests/pro-d2-l06.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 5 | 95 |
| `tests/pro-d20-l22.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 2 | 95 |
| `tests/pro-d21-l23.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 2 | 95 |
| `tests/pro-d22-l24.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 2 | 95 |
| `tests/pro-d23-l25.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 2 | 95 |
| `tests/pro-d24-l26.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 2 | 95 |
| `tests/pro-d3-l11.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 6 | 95 |
| `tests/pro-d4-l01.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 3 | 95 |
| `tests/pro-d5-l02.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 3 | 95 |
| `tests/pro-d6-l03.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 3 | 95 |
| `tests/pro-d7-l04.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 3 | 95 |
| `tests/pro-d8-l07.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 4 | 95 |
| `tests/pro-d9-l09.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 4 | 95 |
| `tests/pro-e1-complement.test.js` | `tests/unit/donnees/bestiaire-livres.test.js` | 3 | 95 |
| `tests/pro-d1-registre.test.js` | `tests/unit/donnees/corrections-v3-et-registre-sorts.test.js` | 2 | 18 |
| `tests/v3-a-bestiary.test.js` | `tests/unit/donnees/corrections-v3-et-registre-sorts.test.js` | 6 | 18 |
| `tests/v3-a-metres.test.js` | `tests/unit/donnees/corrections-v3-et-registre-sorts.test.js` | 2 | 18 |
| `tests/v3-a-reference.test.js` | `tests/unit/donnees/corrections-v3-et-registre-sorts.test.js` | 6 | 18 |
| `tests/v3-a-tables.test.js` | `tests/unit/donnees/corrections-v3-et-registre-sorts.test.js` | 2 | 18 |

`tests/meta.test.js` : reste en place jusqu'à R2-13 ; il parcourt désormais `tests/` récursivement (même seuil, mêmes assertions).
