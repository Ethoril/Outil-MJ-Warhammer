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

## R2-2 — créatures

| Ancien fichier | Nouveau fichier | Tests avant | Tests après (cible) |
|---|---|---|---|
| `tests/b12-surnombre.test.js` | `tests/unit/creatures/branchement-store.test.js` | 16 | 132 |
| `tests/pro-b1-taille-branchee.test.js` | `tests/unit/creatures/branchement-store.test.js` | 4 | 132 |
| `tests/pro-b10-creation-familier.test.js` | `tests/unit/creatures/branchement-store.test.js` | 3 | 132 |
| `tests/pro-b10b-destin-resilience-fiches.test.js` | `tests/unit/creatures/branchement-store.test.js` | 4 | 132 |
| `tests/pro-b11-familiers-services.test.js` | `tests/unit/creatures/branchement-store.test.js` | 4 | 132 |
| `tests/pro-b11c-corrections.test.js` | `tests/unit/creatures/branchement-store.test.js` | 14 | 132 |
| `tests/pro-b2-library.test.js` | `tests/unit/creatures/branchement-store.test.js` | 4 | 132 |
| `tests/pro-b2-plusieurs-tetes-branche.test.js` | `tests/unit/creatures/branchement-store.test.js` | 6 | 132 |
| `tests/pro-b3-regeneration-branchee.test.js` | `tests/unit/creatures/branchement-store.test.js` | 7 | 132 |
| `tests/pro-b4-psychologie-branchee.test.js` | `tests/unit/creatures/branchement-store.test.js` | 5 | 132 |
| `tests/pro-b4c-corrections.test.js` | `tests/unit/creatures/branchement-store.test.js` | 7 | 132 |
| `tests/pro-b5-sens-branches.test.js` | `tests/unit/creatures/branchement-store.test.js` | 6 | 132 |
| `tests/pro-b6-deplacement-branche.test.js` | `tests/unit/creatures/branchement-store.test.js` | 3 | 132 |
| `tests/pro-b7-etats-branches.test.js` | `tests/unit/creatures/branchement-store.test.js` | 3 | 132 |
| `tests/pro-b8-magie-capacites-branchees.test.js` | `tests/unit/creatures/branchement-store.test.js` | 2 | 132 |
| `tests/pro-b8c-corrections.test.js` | `tests/unit/creatures/branchement-store.test.js` | 9 | 132 |
| `tests/pro-b9-slann-branche.test.js` | `tests/unit/creatures/branchement-store.test.js` | 5 | 132 |
| `tests/pro-f2-familiers.test.js` | `tests/unit/creatures/branchement-store.test.js` | 11 | 132 |
| `tests/pro-q19-familiers-nettoyage.test.js` | `tests/unit/creatures/branchement-store.test.js` | 6 | 132 |
| `tests/pro-q9-liens-familiers.test.js` | `tests/unit/creatures/branchement-store.test.js` | 4 | 132 |
| `tests/pro-s1-slann.test.js` | `tests/unit/creatures/branchement-store.test.js` | 9 | 132 |
| `tests/pro-q16-attaques-multiples.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 4 | 179 |
| `tests/pro-q17-rappels-visibles.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 7 | 179 |
| `tests/pro-q18-attaques-naturelles.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 7 | 179 |
| `tests/pro-q20-attaques-gratuites.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 6 | 179 |
| `tests/pro-q21-tailles-attaques-naturelles.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 3 | 179 |
| `tests/pro-q22-rappels-carte.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 5 | 179 |
| `tests/pro-q30-formule-v5-defaut.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 5 | 179 |
| `tests/pro-q31-attaques-gratuites-round0.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 2 | 179 |
| `tests/pro-q35-taille-formule.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 7 | 179 |
| `tests/pro-q37-competences-sans-valeur.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 4 | 179 |
| `tests/pro-q38-code.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 4 | 179 |
| `tests/pro-q4-traits-attaques.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 4 | 179 |
| `tests/pro-q42-defauts-mineurs.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 3 | 179 |
| `tests/pro-q6-armure.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 7 | 179 |
| `tests/pro-q8-traits-creature.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 7 | 179 |
| `tests/pro-t1-natures.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 7 | 179 |
| `tests/pro-t10-taille.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 8 | 179 |
| `tests/pro-t11-gabarits.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 5 | 179 |
| `tests/pro-t12-capacites-propres.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 5 | 179 |
| `tests/pro-t2-combat-naturel.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 11 | 179 |
| `tests/pro-t3-etats-continus.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 11 | 179 |
| `tests/pro-t4-deplacement.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 11 | 179 |
| `tests/pro-t5-sens.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 8 | 179 |
| `tests/pro-t6-psychologie.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 15 | 179 |
| `tests/pro-t7-magie-creatures.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 9 | 179 |
| `tests/pro-t8-regeneration.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 7 | 179 |
| `tests/pro-t9-plusieurs-tetes.test.js` | `tests/unit/creatures/capacites-et-combat-naturel.test.js` | 7 | 179 |
| `tests/f2-g-characterization.test.js` | `tests/unit/creatures/morphologie-et-capacites-bestiaire.test.js` | 2 | 77 |
| `tests/f2-g-creature-locations.test.js` | `tests/unit/creatures/morphologie-et-capacites-bestiaire.test.js` | 7 | 77 |
| `tests/f2-g-integration.test.js` | `tests/unit/creatures/morphologie-et-capacites-bestiaire.test.js` | 13 | 77 |
| `tests/f2-gm-reprise-characterization.test.js` | `tests/unit/creatures/morphologie-et-capacites-bestiaire.test.js` | 9 | 77 |
| `tests/f2-h-bestiary-abilities.test.js` | `tests/unit/creatures/morphologie-et-capacites-bestiaire.test.js` | 44 | 77 |
| `tests/f2-h-characterization.test.js` | `tests/unit/creatures/morphologie-et-capacites-bestiaire.test.js` | 2 | 77 |
| `tests/pro-k1-keywords.test.js` | `tests/unit/creatures/mots-cles-et-natures.test.js` | 6 | 30 |
| `tests/pro-k2-characterization.test.js` | `tests/unit/creatures/mots-cles-et-natures.test.js` | 2 | 30 |
| `tests/pro-k2-keyword-referential.test.js` | `tests/unit/creatures/mots-cles-et-natures.test.js` | 4 | 30 |
| `tests/pro-k3-keywords-carried.test.js` | `tests/unit/creatures/mots-cles-et-natures.test.js` | 5 | 30 |
| `tests/pro-k4-characterization.test.js` | `tests/unit/creatures/mots-cles-et-natures.test.js` | 2 | 30 |
| `tests/pro-k4-specializations.test.js` | `tests/unit/creatures/mots-cles-et-natures.test.js` | 8 | 30 |
| `tests/pro-k5-targets.test.js` | `tests/unit/creatures/mots-cles-et-natures.test.js` | 3 | 30 |

`tests/meta.test.js` : reste en place jusqu'à R2-13 ; il parcourt désormais `tests/` récursivement (même seuil, mêmes assertions).

## R2-3 — magie A (contrats, traditions, catalogue, preuves lot3)

| Ancien fichier | Nouveau fichier | Tests avant | Tests après (cible) |
|---|---|---|---|
| `tests/lot3-removed-spells.test.js` | `tests/unit/magie/catalogue-et-couverture.test.js` | 3 | 116 |
| `tests/lot3-v5-catalogue-lileath.test.js` | `tests/unit/magie/catalogue-et-couverture.test.js` | 3 | 116 |
| `tests/lot3-v5-catalogue-parity.test.js` | `tests/unit/magie/catalogue-et-couverture.test.js` | 7 | 116 |
| `tests/lot3-v5-cloture.test.js` | `tests/unit/magie/catalogue-et-couverture.test.js` | 9 | 116 |
| `tests/lot3-v5-high-talent-coverage.test.js` | `tests/unit/magie/catalogue-et-couverture.test.js` | 26 | 116 |
| `tests/lot3-v5-relecture2-catalogue.test.js` | `tests/unit/magie/catalogue-et-couverture.test.js` | 16 | 116 |
| `tests/lot3-v5-relecture2-coverage.test.js` | `tests/unit/magie/catalogue-et-couverture.test.js` | 5 | 116 |
| `tests/lot3-v5-relecture2-magic.test.js` | `tests/unit/magie/catalogue-et-couverture.test.js` | 9 | 116 |
| `tests/lot3-v5-relecture2-spells.test.js` | `tests/unit/magie/catalogue-et-couverture.test.js` | 11 | 116 |
| `tests/lot3-v5-relecture2-state.test.js` | `tests/unit/magie/catalogue-et-couverture.test.js` | 6 | 116 |
| `tests/lot3-v5-reliquats.test.js` | `tests/unit/magie/catalogue-et-couverture.test.js` | 11 | 116 |
| `tests/lot3-v5-retours-catalogue.test.js` | `tests/unit/magie/catalogue-et-couverture.test.js` | 10 | 116 |
| `tests/lot3-v5-magic-34.test.js` | `tests/unit/magie/contrats-277-et-elfique.test.js` | 16 | 16 |
| `tests/lot3-v5-contrats-catalogue-beasts.test.js` | `tests/unit/magie/contrats-catalogue.test.js` | 28 | 385 |
| `tests/lot3-v5-contrats-catalogue-death.test.js` | `tests/unit/magie/contrats-catalogue.test.js` | 48 | 385 |
| `tests/lot3-v5-contrats-catalogue-fire.test.js` | `tests/unit/magie/contrats-catalogue.test.js` | 46 | 385 |
| `tests/lot3-v5-contrats-catalogue-heavens.test.js` | `tests/unit/magie/contrats-catalogue.test.js` | 54 | 385 |
| `tests/lot3-v5-contrats-catalogue-life.test.js` | `tests/unit/magie/contrats-catalogue.test.js` | 50 | 385 |
| `tests/lot3-v5-contrats-catalogue-light.test.js` | `tests/unit/magie/contrats-catalogue.test.js` | 56 | 385 |
| `tests/lot3-v5-contrats-catalogue-metal.test.js` | `tests/unit/magie/contrats-catalogue.test.js` | 54 | 385 |
| `tests/lot3-v5-contrats-catalogue-shadow.test.js` | `tests/unit/magie/contrats-catalogue.test.js` | 49 | 385 |
| `tests/lot3-v5-contrats-arcanes.test.js` | `tests/unit/magie/contrats-domaines.test.js` | 58 | 207 |
| `tests/lot3-v5-contrats-betes.test.js` | `tests/unit/magie/contrats-domaines.test.js` | 13 | 207 |
| `tests/lot3-v5-contrats-cieux.test.js` | `tests/unit/magie/contrats-domaines.test.js` | 8 | 207 |
| `tests/lot3-v5-contrats-feu.test.js` | `tests/unit/magie/contrats-domaines.test.js` | 15 | 207 |
| `tests/lot3-v5-contrats-lumiere.test.js` | `tests/unit/magie/contrats-domaines.test.js` | 14 | 207 |
| `tests/lot3-v5-contrats-metal.test.js` | `tests/unit/magie/contrats-domaines.test.js` | 10 | 207 |
| `tests/lot3-v5-contrats-mineurs.test.js` | `tests/unit/magie/contrats-domaines.test.js` | 32 | 207 |
| `tests/lot3-v5-contrats-mort.test.js` | `tests/unit/magie/contrats-domaines.test.js` | 11 | 207 |
| `tests/lot3-v5-contrats-ombres.test.js` | `tests/unit/magie/contrats-domaines.test.js` | 14 | 207 |
| `tests/lot3-v5-contrats-vie.test.js` | `tests/unit/magie/contrats-domaines.test.js` | 12 | 207 |
| `tests/lot3-v5-retours-lot1.test.js` | `tests/unit/magie/contrats-domaines.test.js` | 10 | 207 |
| `tests/lot3-v5-retours-lot2.test.js` | `tests/unit/magie/contrats-domaines.test.js` | 10 | 207 |
| `tests/lot3-v5-contrats-elfiques.test.js` | `tests/unit/magie/contrats-elfiques-et-vents.test.js` | 42 | 203 |
| `tests/lot3-v5-contrats-haute-magie.test.js` | `tests/unit/magie/contrats-elfiques-et-vents.test.js` | 44 | 203 |
| `tests/lot3-v5-contrats-winds-of-magic.test.js` | `tests/unit/magie/contrats-elfiques-et-vents.test.js` | 82 | 203 |
| `tests/lot3-v5-retours-lot3.test.js` | `tests/unit/magie/contrats-elfiques-et-vents.test.js` | 6 | 203 |
| `tests/lot3-v5-retours-lot4.test.js` | `tests/unit/magie/contrats-elfiques-et-vents.test.js` | 13 | 203 |
| `tests/lot3-v5-retours-lot5a.test.js` | `tests/unit/magie/contrats-elfiques-et-vents.test.js` | 8 | 203 |
| `tests/lot3-v5-retours-lot5b.test.js` | `tests/unit/magie/contrats-elfiques-et-vents.test.js` | 8 | 203 |
| `tests/lot3-v5-magic-33.test.js` | `tests/unit/magie/contrats-livre-v5.test.js` | 25 | 25 |
| `tests/p4d-magic-summon-fuzz.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 1 | 368 |
| `tests/p4d-magic-summon-turn.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 13 | 368 |
| `tests/pro-b3-invocations.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 4 | 368 |
| `tests/pro-d1-characterization.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 3 | 368 |
| `tests/pro-d12-grande-gueule.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 30 | 368 |
| `tests/pro-d13-petite-waaagh.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 32 | 368 |
| `tests/pro-d14-grande-waaagh.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 34 | 368 |
| `tests/pro-d15-lustria-haute-magie.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 18 | 368 |
| `tests/pro-d16-magie-elfique.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 64 | 368 |
| `tests/pro-d19-colleges-complements.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 25 | 368 |
| `tests/pro-d2-magie-naturelle.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 24 | 368 |
| `tests/pro-d3-magie-naturelle-aote3.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 21 | 368 |
| `tests/pro-d4-sorcellerie.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 23 | 368 |
| `tests/pro-d5-demonologie.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 13 | 368 |
| `tests/pro-d6-necromancie.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 16 | 368 |
| `tests/pro-d7-attributs-characterization.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 10 | 368 |
| `tests/pro-d7-nurgle.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 12 | 368 |
| `tests/pro-d8-slaanesh.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 10 | 368 |
| `tests/pro-d9-tzeentch.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 11 | 368 |
| `tests/pro-q7-demon-expiration.test.js` | `tests/unit/magie/traditions-et-invocations.test.js` | 4 | 368 |

## R2-4 — magie B (moteur : lancement, incidents, effets, transformations)

| Ancien fichier | Nouveau fichier | Tests avant | Tests après (cible) |
|---|---|---|---|
| `tests/lot3-v5-audit-confrontation.test.js` | `tests/unit/magie/effets-et-arbitrages.test.js` | 15 | 163 |
| `tests/lot3-v5-audit-natures-import.test.js` | `tests/unit/magie/effets-et-arbitrages.test.js` | 8 | 163 |
| `tests/lot3-v5-delivery-2a.test.js` | `tests/unit/magie/effets-et-arbitrages.test.js` | 16 | 163 |
| `tests/lot3-v5-delivery-2a-corrections.test.js` | `tests/unit/magie/effets-et-arbitrages.test.js` | 17 | 163 |
| `tests/lot3-v5-delivery-2a-final.test.js` | `tests/unit/magie/effets-et-arbitrages.test.js` | 7 | 163 |
| `tests/lot3-v5-delivery-2b.test.js` | `tests/unit/magie/effets-et-arbitrages.test.js` | 20 | 163 |
| `tests/lot3-v5-delivery-2b-verification.test.js` | `tests/unit/magie/effets-et-arbitrages.test.js` | 10 | 163 |
| `tests/lot3-v5-delivery-2c.test.js` | `tests/unit/magie/effets-et-arbitrages.test.js` | 16 | 163 |
| `tests/lot3-v5-integration-commands.test.js` | `tests/unit/magie/effets-et-arbitrages.test.js` | 19 | 163 |
| `tests/lot3-v5-integration-rules.test.js` | `tests/unit/magie/effets-et-arbitrages.test.js` | 2 | 163 |
| `tests/lot3-v5-integration-sanitize.test.js` | `tests/unit/magie/effets-et-arbitrages.test.js` | 4 | 163 |
| `tests/lot3-v5-lileath-wiring.test.js` | `tests/unit/magie/effets-et-arbitrages.test.js` | 6 | 163 |
| `tests/lot3-v5-magic-32.test.js` | `tests/unit/magie/effets-et-arbitrages.test.js` | 23 | 163 |
| `tests/lot3-v5-dispel-corrections.test.js` | `tests/unit/magie/incidents-dissipation-haute-magie.test.js` | 22 | 85 |
| `tests/lot3-v5-dispel-integration.test.js` | `tests/unit/magie/incidents-dissipation-haute-magie.test.js` | 7 | 85 |
| `tests/lot3-v5-high-corrections.test.js` | `tests/unit/magie/incidents-dissipation-haute-magie.test.js` | 8 | 85 |
| `tests/lot3-v5-high-wiring.test.js` | `tests/unit/magie/incidents-dissipation-haute-magie.test.js` | 6 | 85 |
| `tests/lot3-v5-incidents-corrections.test.js` | `tests/unit/magie/incidents-dissipation-haute-magie.test.js` | 13 | 85 |
| `tests/lot3-v5-incidents-wiring.test.js` | `tests/unit/magie/incidents-dissipation-haute-magie.test.js` | 15 | 85 |
| `tests/lot3-v5-magic-31.test.js` | `tests/unit/magie/incidents-dissipation-haute-magie.test.js` | 14 | 85 |
| `tests/lot3-v5-engine-socle.test.js` | `tests/unit/magie/lancement-focalisation.test.js` | 28 | 105 |
| `tests/lot3-v5-explicit-dice.test.js` | `tests/unit/magie/lancement-focalisation.test.js` | 11 | 105 |
| `tests/lot3-v5-finalization.test.js` | `tests/unit/magie/lancement-focalisation.test.js` | 25 | 105 |
| `tests/lot3-v5-magic-30.test.js` | `tests/unit/magie/lancement-focalisation.test.js` | 21 | 105 |
| `tests/lot3-v5-magic-spell-wiring.test.js` | `tests/unit/magie/lancement-focalisation.test.js` | 2 | 105 |
| `tests/lot3-v5-turn-spells.test.js` | `tests/unit/magie/lancement-focalisation.test.js` | 8 | 105 |
| `tests/v3-c-engine.test.js` | `tests/unit/magie/lancement-focalisation.test.js` | 10 | 105 |
| `tests/lot3-v5-arcane-unforgiving.test.js` | `tests/unit/magie/transformations-et-formes.test.js` | 10 | 62 |
| `tests/lot3-v5-transformations.test.js` | `tests/unit/magie/transformations-et-formes.test.js` | 17 | 62 |
| `tests/lot3-v5-transformations-verification.test.js` | `tests/unit/magie/transformations-et-formes.test.js` | 7 | 62 |
| `tests/lot3-v5-verification-9.test.js` | `tests/unit/magie/transformations-et-formes.test.js` | 6 | 62 |
| `tests/p4c-char-magic.test.js` | `tests/unit/magie/transformations-et-formes.test.js` | 22 | 62 |

## R2-5 — divin A

| Ancien fichier | Nouveau fichier | Tests avant | Tests après (cible) |
|---|---|---|---|
| `tests/divin-v5-access.test.js` | `tests/unit/divin/acces.test.js` | 7 | 30 |
| `tests/divin-v5-access-independent.test.js` | `tests/unit/divin/acces.test.js` | 15 | 30 |
| `tests/divin-v5-access-sync-codec.test.js` | `tests/unit/divin/acces.test.js` | 4 | 30 |
| `tests/divin-v5-access-sync-codec-independent.test.js` | `tests/unit/divin/acces.test.js` | 4 | 30 |
| `tests/divin-v5-audit.test.js` | `tests/unit/divin/audit-et-sources.test.js` | 11 | 75 |
| `tests/divin-v5-audit-independent.test.js` | `tests/unit/divin/audit-et-sources.test.js` | 25 | 75 |
| `tests/divin-v5-b0-corpus.test.js` | `tests/unit/divin/audit-et-sources.test.js` | 1 | 75 |
| `tests/divin-v5-b19-coverage.test.js` | `tests/unit/divin/audit-et-sources.test.js` | 3 | 75 |
| `tests/divin-v5-calendar-source-independent.test.js` | `tests/unit/divin/audit-et-sources.test.js` | 4 | 75 |
| `tests/divin-v5-clauses-independent.test.js` | `tests/unit/divin/audit-et-sources.test.js` | 9 | 75 |
| `tests/divin-v5-e0-independent.test.js` | `tests/unit/divin/audit-et-sources.test.js` | 5 | 75 |
| `tests/divin-v5-e0-provenance.test.js` | `tests/unit/divin/audit-et-sources.test.js` | 2 | 75 |
| `tests/divin-v5-eagle-summary-dev.test.js` | `tests/unit/divin/audit-et-sources.test.js` | 1 | 75 |
| `tests/divin-v5-hospice-source-independent.test.js` | `tests/unit/divin/audit-et-sources.test.js` | 4 | 75 |
| `tests/divin-v5-source-crosscheck.test.js` | `tests/unit/divin/audit-et-sources.test.js` | 6 | 75 |
| `tests/divin-v5-strictures-independent.test.js` | `tests/unit/divin/audit-et-sources.test.js` | 4 | 75 |
| `tests/divin-v5-blessings-cults.test.js` | `tests/unit/divin/catalogue-et-miracles.test.js` | 52 | 116 |
| `tests/divin-v5-catalogue.test.js` | `tests/unit/divin/catalogue-et-miracles.test.js` | 6 | 116 |
| `tests/divin-v5-miracles-b-archives3.test.js` | `tests/unit/divin/catalogue-et-miracles.test.js` | 10 | 116 |
| `tests/divin-v5-miracles-b-deft.test.js` | `tests/unit/divin/catalogue-et-miracles.test.js` | 11 | 116 |
| `tests/divin-v5-miracles-b-pbtt-lustria.test.js` | `tests/unit/divin/catalogue-et-miracles.test.js` | 5 | 116 |
| `tests/divin-v5-miracles-manann-morr-ranald.test.js` | `tests/unit/divin/catalogue-et-miracles.test.js` | 6 | 116 |
| `tests/divin-v5-miracles-rhya-shallya-sigmar.test.js` | `tests/unit/divin/catalogue-et-miracles.test.js` | 7 | 116 |
| `tests/divin-v5-miracles-taal-ulric-verena.test.js` | `tests/unit/divin/catalogue-et-miracles.test.js` | 7 | 116 |
| `tests/divin-v5-ranged-sans-portee.test.js` | `tests/unit/divin/catalogue-et-miracles.test.js` | 1 | 116 |
| `tests/divin-v5-wave-b-loader.test.js` | `tests/unit/divin/catalogue-et-miracles.test.js` | 11 | 116 |
| `tests/divin-v5-a1-sans-peur.test.js` | `tests/unit/divin/moteur-et-store.test.js` | 2 | 145 |
| `tests/divin-v5-a10-chance-opposition.test.js` | `tests/unit/divin/moteur-et-store.test.js` | 5 | 145 |
| `tests/divin-v5-a12-char-ordre.test.js` | `tests/unit/divin/moteur-et-store.test.js` | 13 | 145 |
| `tests/divin-v5-a4-devotion.test.js` | `tests/unit/divin/moteur-et-store.test.js` | 1 | 145 |
| `tests/divin-v5-a7-enjeux.test.js` | `tests/unit/divin/moteur-et-store.test.js` | 7 | 145 |
| `tests/divin-v5-b1-characterization.test.js` | `tests/unit/divin/moteur-et-store.test.js` | 4 | 145 |
| `tests/divin-v5-b1-zero-sin.test.js` | `tests/unit/divin/moteur-et-store.test.js` | 6 | 145 |
| `tests/divin-v5-b2-elf-cults.test.js` | `tests/unit/divin/moteur-et-store.test.js` | 7 | 145 |
| `tests/divin-v5-b6-skills.test.js` | `tests/unit/divin/moteur-et-store.test.js` | 11 | 145 |
| `tests/divin-v5-b7-allies.test.js` | `tests/unit/divin/moteur-et-store.test.js` | 16 | 145 |
| `tests/divin-v5-b8-access.test.js` | `tests/unit/divin/moteur-et-store.test.js` | 21 | 145 |
| `tests/divin-v5-control.test.js` | `tests/unit/divin/moteur-et-store.test.js` | 16 | 145 |
| `tests/divin-v5-engine.test.js` | `tests/unit/divin/moteur-et-store.test.js` | 14 | 145 |
| `tests/divin-v5-store.test.js` | `tests/unit/divin/moteur-et-store.test.js` | 13 | 145 |
| `tests/divin-v5-up-in-arms.test.js` | `tests/unit/divin/moteur-et-store.test.js` | 9 | 145 |
| `tests/divin-v5-p5-attaque-rapide.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 4 | 100 |
| `tests/divin-v5-p5-bountiful-fortune.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 3 | 100 |
| `tests/divin-v5-p5-chance.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 10 | 100 |
| `tests/divin-v5-p5-crush-the-weak.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 3 | 100 |
| `tests/divin-v5-p5-droiture.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 5 | 100 |
| `tests/divin-v5-p5-en-bon-ordre.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 2 | 100 |
| `tests/divin-v5-p5-fureur-ulric.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 5 | 100 |
| `tests/divin-v5-p5-heed-not-the-witch.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 2 | 100 |
| `tests/divin-v5-p5-interactions.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 6 | 100 |
| `tests/divin-v5-p5-larmes-shallya.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 6 | 100 |
| `tests/divin-v5-p5-mischief.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 3 | 100 |
| `tests/divin-v5-p5-protection.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 4 | 100 |
| `tests/divin-v5-p5-sauvagerie.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 9 | 100 |
| `tests/divin-v5-p5-sauvagerie-consume.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 3 | 100 |
| `tests/divin-v5-p5-sauvagerie-spell.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 3 | 100 |
| `tests/divin-v5-p5-souffle.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 4 | 100 |
| `tests/divin-v5-p5-tenacite.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 4 | 100 |
| `tests/divin-v5-p5-terrain.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 3 | 100 |
| `tests/divin-v5-p5-wolf-bite.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 2 | 100 |
| `tests/divin-v5-r25-asphyxie.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 2 | 100 |
| `tests/lot3-especes-divin-coverage.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 12 | 100 |
| `tests/v3-a-prayers.test.js` | `tests/unit/divin/prieres-benedictions.test.js` | 5 | 100 |

`lot3-especes-divin-coverage` ne devient pas un `describe` : ses 12 tests viennent de l’`import` de `tests/divin-v5-p4a-damage.test.js` (toujours à la racine de `tests/` jusqu’à R2-7), conservé en tête de `divin/prieres-benedictions` ; l’ancre « Haine sacrée » de `executionProbe` (`js/data/v5-magic-talent-coverage.json`) pointe désormais vers ce fichier. R2-7 devra remplacer cet `import` quand `p4a-damage` sera fusionné.

## R2-6 — divin B

| Ancien fichier | Nouveau fichier | Tests avant | Tests après (cible) |
|---|---|---|---|
| `tests/divin-v5-a5-morsure-sort.test.js` | `tests/unit/divin/brise-et-fuite.test.js` | 2 | 58 |
| `tests/divin-v5-b14-recovery-characterization.test.js` | `tests/unit/divin/brise-et-fuite.test.js` | 1 | 58 |
| `tests/divin-v5-b5-characterization.test.js` | `tests/unit/divin/brise-et-fuite.test.js` | 4 | 58 |
| `tests/divin-v5-b5-prayer-bans.test.js` | `tests/unit/divin/brise-et-fuite.test.js` | 20 | 58 |
| `tests/divin-v5-brise-flee-sprint-independent.test.js` | `tests/unit/divin/brise-et-fuite.test.js` | 22 | 58 |
| `tests/divin-v5-broken-escape-dev.test.js` | `tests/unit/divin/brise-et-fuite.test.js` | 2 | 58 |
| `tests/divin-v5-broken-escape-simulation-independent.test.js` | `tests/unit/divin/brise-et-fuite.test.js` | 7 | 58 |
| `tests/divin-v5-a11-critiques-fiche.test.js` | `tests/unit/divin/courroux.test.js` | 3 | 127 |
| `tests/divin-v5-b3-damage.test.js` | `tests/unit/divin/courroux.test.js` | 10 | 127 |
| `tests/divin-v5-wrath-calendar-independent.test.js` | `tests/unit/divin/courroux.test.js` | 72 | 127 |
| `tests/divin-v5-wrath-conditions-dev.test.js` | `tests/unit/divin/courroux.test.js` | 5 | 127 |
| `tests/divin-v5-wrath-conditions-independent.test.js` | `tests/unit/divin/courroux.test.js` | 15 | 127 |
| `tests/divin-v5-wrath-lessons-dev.test.js` | `tests/unit/divin/courroux.test.js` | 3 | 127 |
| `tests/divin-v5-wrath-lessons-independent.test.js` | `tests/unit/divin/courroux.test.js` | 19 | 127 |
| `tests/divin-v5-a6-indice-inversion.test.js` | `tests/unit/divin/etats-et-contexte.test.js` | 6 | 65 |
| `tests/divin-v5-a8-rappel-attaque-rapide.test.js` | `tests/unit/divin/etats-et-contexte.test.js` | 2 | 65 |
| `tests/divin-v5-a9-etats-critiques.test.js` | `tests/unit/divin/etats-et-contexte.test.js` | 3 | 65 |
| `tests/divin-v5-b4-characterization.test.js` | `tests/unit/divin/etats-et-contexte.test.js` | 5 | 65 |
| `tests/divin-v5-b4-states.test.js` | `tests/unit/divin/etats-et-contexte.test.js` | 20 | 65 |
| `tests/divin-v5-e4-context.test.js` | `tests/unit/divin/etats-et-contexte.test.js` | 6 | 65 |
| `tests/divin-v5-e4-context-independent.test.js` | `tests/unit/divin/etats-et-contexte.test.js` | 9 | 65 |
| `tests/divin-v5-e4-runtime.test.js` | `tests/unit/divin/etats-et-contexte.test.js` | 5 | 65 |
| `tests/divin-v5-e4-runtime-independent.test.js` | `tests/unit/divin/etats-et-contexte.test.js` | 9 | 65 |
| `tests/divin-v5-a2-cibles-superflues.test.js` | `tests/unit/divin/temps-et-calendrier.test.js` | 4 | 117 |
| `tests/divin-v5-b12-characterization.test.js` | `tests/unit/divin/temps-et-calendrier.test.js` | 3 | 117 |
| `tests/divin-v5-b12-mornings.test.js` | `tests/unit/divin/temps-et-calendrier.test.js` | 20 | 117 |
| `tests/divin-v5-campaign-independent.test.js` | `tests/unit/divin/temps-et-calendrier.test.js` | 59 | 117 |
| `tests/divin-v5-e5-independent.test.js` | `tests/unit/divin/temps-et-calendrier.test.js` | 18 | 117 |
| `tests/divin-v5-e5-technical.test.js` | `tests/unit/divin/temps-et-calendrier.test.js` | 8 | 117 |
| `tests/divin-v5-game-time.test.js` | `tests/unit/divin/temps-et-calendrier.test.js` | 5 | 117 |

## R2-7 — divin C

| Ancien fichier | Nouveau fichier | Tests avant | Tests après (cible) |
|---|---|---|---|
| `tests/divin-v5-p4a-conditions.test.js` | `tests/unit/divin/effets-degats-conditions.test.js` | 14 | 65 |
| `tests/divin-v5-p4a-damage.test.js` | `tests/unit/divin/effets-degats-conditions.test.js` | 12 | 65 |
| `tests/divin-v5-p4b-conditions.test.js` | `tests/unit/divin/effets-degats-conditions.test.js` | 13 | 65 |
| `tests/divin-v5-p4b-conditions-real.test.js` | `tests/unit/divin/effets-degats-conditions.test.js` | 7 | 65 |
| `tests/divin-v5-p4b-damage.test.js` | `tests/unit/divin/effets-degats-conditions.test.js` | 12 | 65 |
| `tests/divin-v5-p4b-damage-real.test.js` | `tests/unit/divin/effets-degats-conditions.test.js` | 7 | 65 |
| `tests/divin-v5-p4a-gear.test.js` | `tests/unit/divin/effets-equipement-tests.test.js` | 22 | 51 |
| `tests/divin-v5-p4b-gear.test.js` | `tests/unit/divin/effets-equipement-tests.test.js` | 4 | 51 |
| `tests/divin-v5-p4b-gear-real.test.js` | `tests/unit/divin/effets-equipement-tests.test.js` | 5 | 51 |
| `tests/divin-v5-p4b-tests.test.js` | `tests/unit/divin/effets-equipement-tests.test.js` | 13 | 51 |
| `tests/divin-v5-p4b-tests-real.test.js` | `tests/unit/divin/effets-equipement-tests.test.js` | 7 | 51 |
| `tests/divin-v5-p4a-socle.test.js` | `tests/unit/divin/effets-socle-et-formulaire.test.js` | 12 | 68 |
| `tests/divin-v5-p4b-socle.test.js` | `tests/unit/divin/effets-socle-et-formulaire.test.js` | 10 | 68 |
| `tests/divin-v5-p4c-contracts.test.js` | `tests/unit/divin/effets-socle-et-formulaire.test.js` | 11 | 68 |
| `tests/divin-v5-p4c-extras.test.js` | `tests/unit/divin/effets-socle-et-formulaire.test.js` | 8 | 68 |
| `tests/divin-v5-p4d-implicit-target.test.js` | `tests/unit/divin/effets-socle-et-formulaire.test.js` | 15 | 68 |
| `tests/divin-v5-t5-form-model.test.js` | `tests/unit/divin/effets-socle-et-formulaire.test.js` | 12 | 68 |
| `tests/divin-v5-p4c-summon.test.js` | `tests/unit/divin/invocations.test.js` | 41 | 41 |
| `tests/divin-v5-b9-characterization.test.js` | `tests/unit/divin/peche-destin-possessions.test.js` | 3 | 141 |
| `tests/divin-v5-b9-fortune.test.js` | `tests/unit/divin/peche-destin-possessions.test.js` | 10 | 141 |
| `tests/divin-v5-b10-characterization.test.js` | `tests/unit/divin/peche-destin-possessions.test.js` | 3 | 141 |
| `tests/divin-v5-b10-penance.test.js` | `tests/unit/divin/peche-destin-possessions.test.js` | 13 | 141 |
| `tests/divin-v5-b11-characterization.test.js` | `tests/unit/divin/peche-destin-possessions.test.js` | 3 | 141 |
| `tests/divin-v5-b11-possessions.test.js` | `tests/unit/divin/peche-destin-possessions.test.js` | 15 | 141 |
| `tests/divin-v5-b13-characterization.test.js` | `tests/unit/divin/peche-destin-possessions.test.js` | 3 | 141 |
| `tests/divin-v5-b13-rejection.test.js` | `tests/unit/divin/peche-destin-possessions.test.js` | 16 | 141 |
| `tests/divin-v5-b14-characterization.test.js` | `tests/unit/divin/peche-destin-possessions.test.js` | 3 | 141 |
| `tests/divin-v5-b14-summons.test.js` | `tests/unit/divin/peche-destin-possessions.test.js` | 13 | 141 |
| `tests/divin-v5-b15-fate.test.js` | `tests/unit/divin/peche-destin-possessions.test.js` | 11 | 141 |
| `tests/divin-v5-b16-absolution.test.js` | `tests/unit/divin/peche-destin-possessions.test.js` | 11 | 141 |
| `tests/divin-v5-b17-sin-events.test.js` | `tests/unit/divin/peche-destin-possessions.test.js` | 10 | 141 |
| `tests/divin-v5-b18-ground-naval.test.js` | `tests/unit/divin/peche-destin-possessions.test.js` | 8 | 141 |
| `tests/divin-v5-b18-supplements.test.js` | `tests/unit/divin/peche-destin-possessions.test.js` | 12 | 141 |
| `tests/divin-v5-crit-registry.test.js` | `tests/unit/divin/peche-destin-possessions.test.js` | 7 | 141 |
| `tests/divin-v5-b5-fixture.mjs` | `tests/helpers/divin-b5-fixture.mjs` | (aide) | (aide) |

Note : `tests/unit/divin/prieres-benedictions.test.js` (R2-5) n'importe plus `divin-v5-p4a-damage` (retiré, voir `R2_TESTS_DOUBLONS.md`) ; l'ancre « Haine sacrée » de `js/data/v5-magic-talent-coverage.json` pointe vers `tests/unit/divin/effets-degats-conditions.test.js`.

## R2-8 — combat A

| Ancien fichier | Nouveau fichier | Tests avant | Tests après (cible) |
|---|---|---|---|
| `tests/f2-c-review-characterization.test.js` | `tests/unit/combat/chance-destin-fortune.test.js` | 2 | 65 |
| `tests/f2-l-characterization.test.js` | `tests/unit/combat/chance-destin-fortune.test.js` | 4 | 65 |
| `tests/f2-l-destin-chance-characterization.test.js` | `tests/unit/combat/chance-destin-fortune.test.js` | 3 | 65 |
| `tests/f2-l-destin-counterreview.test.js` | `tests/unit/combat/chance-destin-fortune.test.js` | 3 | 65 |
| `tests/f2-l-fate-spending.test.js` | `tests/unit/combat/chance-destin-fortune.test.js` | 10 | 65 |
| `tests/f2-l-fortune-advantage-order.test.js` | `tests/unit/combat/chance-destin-fortune.test.js` | 2 | 65 |
| `tests/f2-l-fortune-condition-binding-integration.test.js` | `tests/unit/combat/chance-destin-fortune.test.js` | 1 | 65 |
| `tests/f2-l-fortune-first-binding-characterization.test.js` | `tests/unit/combat/chance-destin-fortune.test.js` | 1 | 65 |
| `tests/lot2-v5-23-control.test.js` | `tests/unit/combat/chance-destin-fortune.test.js` | 21 | 65 |
| `tests/lot2-v5-resources.test.js` | `tests/unit/combat/chance-destin-fortune.test.js` | 13 | 65 |
| `tests/p5-char-fortune-reroll.test.js` | `tests/unit/combat/chance-destin-fortune.test.js` | 5 | 65 |
| `tests/f2-c-characterization.test.js` | `tests/unit/combat/competences-darmes.test.js` | 2 | 50 |
| `tests/f2-c-claude-regressions.test.js` | `tests/unit/combat/competences-darmes.test.js` | 21 | 50 |
| `tests/f2-c-weapon-skills.test.js` | `tests/unit/combat/competences-darmes.test.js` | 27 | 50 |
| `tests/e22-criticals.test.js` | `tests/unit/combat/critiques.test.js` | 12 | 29 |
| `tests/f2-i-characterization.test.js` | `tests/unit/combat/critiques.test.js` | 2 | 29 |
| `tests/p5-char-critical-injure.test.js` | `tests/unit/combat/critiques.test.js` | 15 | 29 |
| `tests/damage.test.js` | `tests/unit/combat/degats-et-armures.test.js` | 9 | 58 |
| `tests/e19-damage-formulas.test.js` | `tests/unit/combat/degats-et-armures.test.js` | 23 | 58 |
| `tests/f2-t2bis-damage-characterization.test.js` | `tests/unit/combat/degats-et-armures.test.js` | 4 | 58 |
| `tests/lot2-combat.test.js` | `tests/unit/combat/degats-et-armures.test.js` | 22 | 58 |
| `tests/f2-claude-f2r.test.js` | `tests/unit/combat/equipement-et-supplements.test.js` | 2 | 70 |
| `tests/f2-d-blast-integration.test.js` | `tests/unit/combat/equipement-et-supplements.test.js` | 2 | 70 |
| `tests/f2-d-entanglement-integration.test.js` | `tests/unit/combat/equipement-et-supplements.test.js` | 2 | 70 |
| `tests/f2-d-final-clauses.test.js` | `tests/unit/combat/equipement-et-supplements.test.js` | 6 | 70 |
| `tests/f2-d-shield-defense.test.js` | `tests/unit/combat/equipement-et-supplements.test.js` | 6 | 70 |
| `tests/f2-f-characterization.test.js` | `tests/unit/combat/equipement-et-supplements.test.js` | 2 | 70 |
| `tests/f2-f-counterreview-characterization.test.js` | `tests/unit/combat/equipement-et-supplements.test.js` | 2 | 70 |
| `tests/f2-f-final-review.test.js` | `tests/unit/combat/equipement-et-supplements.test.js` | 4 | 70 |
| `tests/f2-f-pavise-hardening-characterization.test.js` | `tests/unit/combat/equipement-et-supplements.test.js` | 4 | 70 |
| `tests/f2-f-review-characterization.test.js` | `tests/unit/combat/equipement-et-supplements.test.js` | 5 | 70 |
| `tests/f2-f-source-name-characterization.test.js` | `tests/unit/combat/equipement-et-supplements.test.js` | 13 | 70 |
| `tests/f2-f-supplemental-equipment.test.js` | `tests/unit/combat/equipement-et-supplements.test.js` | 14 | 70 |
| `tests/f2-t2bis-equipment-characterization.test.js` | `tests/unit/combat/equipement-et-supplements.test.js` | 6 | 70 |
| `tests/f2-t2bis-filet-opposition-integration.test.js` | `tests/unit/combat/equipement-et-supplements.test.js` | 2 | 70 |
| `tests/f2-d-reloading-integration.test.js` | `tests/unit/combat/poudre-et-rechargement.test.js` | 14 | 76 |
| `tests/f2-e-blackpowder-incidents.test.js` | `tests/unit/combat/poudre-et-rechargement.test.js` | 40 | 76 |
| `tests/f2-e-characterization.test.js` | `tests/unit/combat/poudre-et-rechargement.test.js` | 2 | 76 |
| `tests/f2-t2bis-blackpowder-decisions-characterization.test.js` | `tests/unit/combat/poudre-et-rechargement.test.js` | 4 | 76 |
| `tests/f2-t2bis-poudre-salve-decisions-repro.test.js` | `tests/unit/combat/poudre-et-rechargement.test.js` | 9 | 76 |
| `tests/f2-t2bis-recharge-filet-characterization.test.js` | `tests/unit/combat/poudre-et-rechargement.test.js` | 4 | 76 |
| `tests/f2-t2bis-volley-recoil-roll-characterization.test.js` | `tests/unit/combat/poudre-et-rechargement.test.js` | 3 | 76 |
| `tests/f2-claude-t2.test.js` | `tests/unit/combat/qualites-darmes.test.js` | 5 | 135 |
| `tests/f2-claude-t2bis.test.js` | `tests/unit/combat/qualites-darmes.test.js` | 8 | 135 |
| `tests/f2-d-characterization.test.js` | `tests/unit/combat/qualites-darmes.test.js` | 3 | 135 |
| `tests/f2-d-weapon-qualities.test.js` | `tests/unit/combat/qualites-darmes.test.js` | 50 | 135 |
| `tests/f2-t2bis-assommer-store-characterization.test.js` | `tests/unit/combat/qualites-darmes.test.js` | 6 | 135 |
| `tests/f2-t2bis-empaleuse-characterization.test.js` | `tests/unit/combat/qualites-darmes.test.js` | 2 | 135 |
| `tests/f2-t2bis-empaleuse-store-integration.test.js` | `tests/unit/combat/qualites-darmes.test.js` | 1 | 135 |
| `tests/f2-t2bis-four-reported-defects-characterization.test.js` | `tests/unit/combat/qualites-darmes.test.js` | 5 | 135 |
| `tests/f2-t2bis-keyword-status-characterization.test.js` | `tests/unit/combat/qualites-darmes.test.js` | 4 | 135 |
| `tests/f2-t2bis-remaining-defects-characterization.test.js` | `tests/unit/combat/qualites-darmes.test.js` | 8 | 135 |
| `tests/f2-t2bis-reported-defects-characterization.test.js` | `tests/unit/combat/qualites-darmes.test.js` | 10 | 135 |
| `tests/f2-t2bis-store-journal-characterization.test.js` | `tests/unit/combat/qualites-darmes.test.js` | 1 | 135 |
| `tests/lot2-v5-keyword-talents.test.js` | `tests/unit/combat/qualites-darmes.test.js` | 32 | 135 |

Note : les sept chaînes `evidence` de `js/core/keywords.js` (immobilisante, pistolet, piege-lame, a-enroulement, bouclier, taille, parade) pointent vers `tests/unit/combat/qualites-darmes.test.js` avec le nom exact du test cité.

## R2-9 — combat B

| Ancien fichier | Nouveau fichier | Tests avant | Tests après (cible) |
|---|---|---|---|
| `tests/f2-m-characterization.test.js` | `tests/unit/combat/empoignade-et-monture.test.js` | 2 | 40 |
| `tests/f2-m-mounted-combat.test.js` | `tests/unit/combat/empoignade-et-monture.test.js` | 19 | 40 |
| `tests/f2-n-characterization.test.js` | `tests/unit/combat/empoignade-et-monture.test.js` | 2 | 40 |
| `tests/f2-n-grappling.test.js` | `tests/unit/combat/empoignade-et-monture.test.js` | 12 | 40 |
| `tests/f2-n-grappling-integration.test.js` | `tests/unit/combat/empoignade-et-monture.test.js` | 5 | 40 |
| `tests/e08-turn-order.test.js` | `tests/unit/combat/initiative-et-tours.test.js` | 6 | 147 |
| `tests/f2-a-characterization.test.js` | `tests/unit/combat/initiative-et-tours.test.js` | 6 | 147 |
| `tests/f2-a-initiative-surprise.test.js` | `tests/unit/combat/initiative-et-tours.test.js` | 36 | 147 |
| `tests/f2-claude-t1-ter.test.js` | `tests/unit/combat/initiative-et-tours.test.js` | 2 | 147 |
| `tests/f2-t1-bis-regressions.test.js` | `tests/unit/combat/initiative-et-tours.test.js` | 8 | 147 |
| `tests/f2-t1-clock-consumers.test.js` | `tests/unit/combat/initiative-et-tours.test.js` | 2 | 147 |
| `tests/f2-t2bis-critical-characterization.test.js` | `tests/unit/combat/initiative-et-tours.test.js` | 6 | 147 |
| `tests/lot2-v5-turn.test.js` | `tests/unit/combat/initiative-et-tours.test.js` | 7 | 147 |
| `tests/p4c-char-turns.test.js` | `tests/unit/combat/initiative-et-tours.test.js` | 69 | 147 |
| `tests/phase-c-c02-characterization.test.js` | `tests/unit/combat/initiative-et-tours.test.js` | 1 | 147 |
| `tests/phase-c-c02-engaged-flee.test.js` | `tests/unit/combat/initiative-et-tours.test.js` | 4 | 147 |

Note : `tests/phase-c-c06-coverage.test.js` lit désormais `./unit/combat/initiative-et-tours.test.js` à la place de `phase-c-c02-engaged-flee.test.js`.

## R2-10 — combat C

| Ancien fichier | Nouveau fichier | Tests avant | Tests après (cible) |
|---|---|---|---|
| `tests/dice.test.js` | `tests/unit/combat/jets-et-defense.test.js` | 5 | 171 |
| `tests/e06-combat-integration.test.js` | `tests/unit/combat/jets-et-defense.test.js` | 3 | 171 |
| `tests/e06-effects-quality.test.js` | `tests/unit/combat/jets-et-defense.test.js` | 7 | 171 |
| `tests/e12-resolution.test.js` | `tests/unit/combat/jets-et-defense.test.js` | 8 | 171 |
| `tests/e18-combat-engine.test.js` | `tests/unit/combat/jets-et-defense.test.js` | 22 | 171 |
| `tests/e23-defense-options.test.js` | `tests/unit/combat/jets-et-defense.test.js` | 3 | 171 |
| `tests/f2-b-characterization.test.js` | `tests/unit/combat/jets-et-defense.test.js` | 6 | 171 |
| `tests/f2-b-combat-actions.test.js` | `tests/unit/combat/jets-et-defense.test.js` | 21 | 171 |
| `tests/f2-b-combat-modifiers.test.js` | `tests/unit/combat/jets-et-defense.test.js` | 15 | 171 |
| `tests/f2-t2bis-salvo-incident-integration.test.js` | `tests/unit/combat/jets-et-defense.test.js` | 6 | 171 |
| `tests/keywords.test.js` | `tests/unit/combat/jets-et-defense.test.js` | 5 | 171 |
| `tests/lot2-v5-foundation.test.js` | `tests/unit/combat/jets-et-defense.test.js` | 36 | 171 |
| `tests/roll-qualities.test.js` | `tests/unit/combat/jets-et-defense.test.js` | 12 | 171 |
| `tests/states.test.js` | `tests/unit/combat/jets-et-defense.test.js` | 5 | 171 |
| `tests/v3-b-combat.test.js` | `tests/unit/combat/jets-et-defense.test.js` | 17 | 171 |
| `tests/phase-c-c01-fear-terror.test.js` | `tests/unit/combat/psychologie-et-talents-de-groupe.test.js` | 4 | 38 |
| `tests/phase-c-c03-rally-mount.test.js` | `tests/unit/combat/psychologie-et-talents-de-groupe.test.js` | 7 | 38 |
| `tests/phase-c-c04-intimidation-traits.test.js` | `tests/unit/combat/psychologie-et-talents-de-groupe.test.js` | 8 | 38 |
| `tests/phase-c-c05-supplements.test.js` | `tests/unit/combat/psychologie-et-talents-de-groupe.test.js` | 8 | 38 |
| `tests/phase-c-c06-coverage.test.js` | `tests/unit/combat/psychologie-et-talents-de-groupe.test.js` | 3 | 38 |
| `tests/pro-q10b-master-and-commander.test.js` | `tests/unit/combat/psychologie-et-talents-de-groupe.test.js` | 4 | 38 |
| `tests/pro-q23-maitre-a-bord-moteur.test.js` | `tests/unit/combat/psychologie-et-talents-de-groupe.test.js` | 4 | 38 |
| `tests/lot2-talent-contract-v2.test.js` | `tests/unit/combat/talents-v5.test.js` | 19 | 344 |
| `tests/lot2-talent-contracts.test.js` | `tests/unit/combat/talents-v5.test.js` | 26 | 344 |
| `tests/lot2-v5-24-control.test.js` | `tests/unit/combat/talents-v5.test.js` | 32 | 344 |
| `tests/lot2-v5-24-qualities.test.js` | `tests/unit/combat/talents-v5.test.js` | 19 | 344 |
| `tests/lot2-v5-24-tests.test.js` | `tests/unit/combat/talents-v5.test.js` | 47 | 344 |
| `tests/lot2-v5-action-costs.test.js` | `tests/unit/combat/talents-v5.test.js` | 14 | 344 |
| `tests/lot2-v5-control.test.js` | `tests/unit/combat/talents-v5.test.js` | 7 | 344 |
| `tests/lot2-v5-effects.test.js` | `tests/unit/combat/talents-v5.test.js` | 51 | 344 |
| `tests/lot2-v5-reactions.test.js` | `tests/unit/combat/talents-v5.test.js` | 7 | 344 |
| `tests/lot2-v5-remaining-talents.test.js` | `tests/unit/combat/talents-v5.test.js` | 110 | 344 |
| `tests/lot2-v5-talents-integration.test.js` | `tests/unit/combat/talents-v5.test.js` | 12 | 344 |

Note : `tests/phase-c-c06-coverage.test.js` lit désormais `./initiative-et-tours.test.js` (C02) et `./psychologie-et-talents-de-groupe.test.js` (C01, C03, C04, C05). `docs/COURAGE_BRISE_INVENTAIRE.{json,md}` : les deux références à `lot2-v5-remaining-talents.test.js:70/71` pointent vers `talents-v5.test.js:1867/1868`.

## R2-11 — séquelles, Corruption, référentiel

| Ancien fichier | Nouveau fichier | Tests avant | Tests après (cible) |
|---|---|---|---|
| `tests/f2-claude-t3.test.js` | `tests/unit/corruption/corruption-mutations.test.js` | 4 | 52 |
| `tests/f2-k-characterization.test.js` | `tests/unit/corruption/corruption-mutations.test.js` | 2 | 52 |
| `tests/f2-k-corruption.test.js` | `tests/unit/corruption/corruption-mutations.test.js` | 17 | 52 |
| `tests/f2-k-l17-mutations.test.js` | `tests/unit/corruption/corruption-mutations.test.js` | 5 | 52 |
| `tests/f2-k-l23-mutations.test.js` | `tests/unit/corruption/corruption-mutations.test.js` | 4 | 52 |
| `tests/f2-k-mutations.test.js` | `tests/unit/corruption/corruption-mutations.test.js` | 4 | 52 |
| `tests/f2-k-store.test.js` | `tests/unit/corruption/corruption-mutations.test.js` | 7 | 52 |
| `tests/f2-k1-reprise-characterization.test.js` | `tests/unit/corruption/corruption-mutations.test.js` | 3 | 52 |
| `tests/f2-k2-catalog-integration.test.js` | `tests/unit/corruption/corruption-mutations.test.js` | 6 | 52 |
| `tests/e26-fiche-sync.test.js` | `tests/unit/referentiel/fiches-et-catalogue.test.js` | 21 | 123 |
| `tests/e27-reference-generator.test.js` | `tests/unit/referentiel/fiches-et-catalogue.test.js` | 2 | 123 |
| `tests/e27-references-equipment.test.js` | `tests/unit/referentiel/fiches-et-catalogue.test.js` | 29 | 123 |
| `tests/especes-coverage-check.test.js` | `tests/unit/referentiel/fiches-et-catalogue.test.js` | 3 | 123 |
| `tests/especes-sync.test.js` | `tests/unit/referentiel/fiches-et-catalogue.test.js` | 3 | 123 |
| `tests/fiche-core-v3.test.js` | `tests/unit/referentiel/fiches-et-catalogue.test.js` | 10 | 123 |
| `tests/fiches-pj-control.test.js` | `tests/unit/referentiel/fiches-et-catalogue.test.js` | 19 | 123 |
| `tests/lot1-final-control.test.js` | `tests/unit/referentiel/fiches-et-catalogue.test.js` | 12 | 123 |
| `tests/lot1-journal-provenance.test.js` | `tests/unit/referentiel/fiches-et-catalogue.test.js` | 1 | 123 |
| `tests/lot2-fiche-v5.test.js` | `tests/unit/referentiel/fiches-et-catalogue.test.js` | 2 | 123 |
| `tests/lot2-reference-refresh.test.js` | `tests/unit/referentiel/fiches-et-catalogue.test.js` | 3 | 123 |
| `tests/lot2-v5-rule-data.test.js` | `tests/unit/referentiel/fiches-et-catalogue.test.js` | 18 | 123 |
| `tests/e16-e17-simulation-import.test.js` | `tests/unit/referentiel/import-profils.test.js` | 4 | 40 |
| `tests/e20-profile-actions.test.js` | `tests/unit/referentiel/import-profils.test.js` | 8 | 40 |
| `tests/e24-json-profile-import.test.js` | `tests/unit/referentiel/import-profils.test.js` | 16 | 40 |
| `tests/pro-b1-participant.test.js` | `tests/unit/referentiel/import-profils.test.js` | 12 | 40 |
| `tests/f2-claude-t2bis-sudden-death.test.js` | `tests/unit/sequelles/sequelles-mort-critiques.test.js` | 2 | 109 |
| `tests/f2-i-combat-death-scars.test.js` | `tests/unit/sequelles/sequelles-mort-critiques.test.js` | 11 | 109 |
| `tests/f2-i-critical-replacement-characterization.test.js` | `tests/unit/sequelles/sequelles-mort-critiques.test.js` | 1 | 109 |
| `tests/f2-i-integration-review.test.js` | `tests/unit/sequelles/sequelles-mort-critiques.test.js` | 13 | 109 |
| `tests/f2-j-aftermath.test.js` | `tests/unit/sequelles/sequelles-mort-critiques.test.js` | 13 | 109 |
| `tests/f2-j-characterization.test.js` | `tests/unit/sequelles/sequelles-mort-critiques.test.js` | 1 | 109 |
| `tests/f2-j-review-characterization.test.js` | `tests/unit/sequelles/sequelles-mort-critiques.test.js` | 3 | 109 |
| `tests/f2-j-review2.test.js` | `tests/unit/sequelles/sequelles-mort-critiques.test.js` | 14 | 109 |
| `tests/f2-j-store.test.js` | `tests/unit/sequelles/sequelles-mort-critiques.test.js` | 7 | 109 |
| `tests/f2-j2-effects.test.js` | `tests/unit/sequelles/sequelles-mort-critiques.test.js` | 18 | 109 |
| `tests/f2-j2-sequelae.test.js` | `tests/unit/sequelles/sequelles-mort-critiques.test.js` | 19 | 109 |
| `tests/f2-t2bis-split-hand-second-shock-characterization.test.js` | `tests/unit/sequelles/sequelles-mort-critiques.test.js` | 1 | 109 |
| `tests/f2-t2bis-sudden-death-characterization.test.js` | `tests/unit/sequelles/sequelles-mort-critiques.test.js` | 6 | 109 |

## R2-12 — stockage : IndexedDB factice, sync, store, migrations

| Ancien fichier | Nouveau fichier | Tests avant | Tests après (cible) |
|---|---|---|---|
| `tests/e04-migrations-persistence.test.js` | `tests/unit/stockage/migrations-persistance.test.js` | 13 | 19 |
| `tests/e04-store-integration.test.js` | `tests/unit/stockage/migrations-persistance.test.js` | 6 | 19 |
| `tests/e01.test.js` | `tests/unit/stockage/store-commandes-historique.test.js` | 2 | 68 |
| `tests/e07-commands-history.test.js` | `tests/unit/stockage/store-commandes-historique.test.js` | 6 | 68 |
| `tests/e07-store-integration.test.js` | `tests/unit/stockage/store-commandes-historique.test.js` | 5 | 68 |
| `tests/e10-models.test.js` | `tests/unit/stockage/store-commandes-historique.test.js` | 5 | 68 |
| `tests/e11-e13-encounters-closure.test.js` | `tests/unit/stockage/store-commandes-historique.test.js` | 5 | 68 |
| `tests/e11-store-core.test.js` | `tests/unit/stockage/store-commandes-historique.test.js` | 5 | 68 |
| `tests/e14-reminders.test.js` | `tests/unit/stockage/store-commandes-historique.test.js` | 3 | 68 |
| `tests/e15-scene-events.test.js` | `tests/unit/stockage/store-commandes-historique.test.js` | 5 | 68 |
| `tests/e21-encounter-list.test.js` | `tests/unit/stockage/store-commandes-historique.test.js` | 6 | 68 |
| `tests/e25-restart-combat.test.js` | `tests/unit/stockage/store-commandes-historique.test.js` | 10 | 68 |
| `tests/lot2-store-integration.test.js` | `tests/unit/stockage/store-commandes-historique.test.js` | 7 | 68 |
| `tests/store.test.js` | `tests/unit/stockage/store-commandes-historique.test.js` | 7 | 68 |
| `tests/ux.test.js` | `tests/unit/stockage/store-commandes-historique.test.js` | 2 | 68 |
| `tests/auth-errors.test.js` | `tests/unit/stockage/sync-cloud.test.js` | 2 | 126 |
| `tests/cloud-v2-empty-reserve.test.js` | `tests/unit/stockage/sync-cloud.test.js` | 7 | 126 |
| `tests/core-races.test.js` | `tests/unit/stockage/sync-cloud.test.js` | 7 | 126 |
| `tests/e02-sync.test.js` | `tests/unit/stockage/sync-cloud.test.js` | 6 | 126 |
| `tests/e03-access.test.js` | `tests/unit/stockage/sync-cloud.test.js` | 3 | 126 |
| `tests/e05-firebase-rules.test.js` | `tests/unit/stockage/sync-cloud.test.js` | 1 | 126 |
| `tests/e05-session-resolution.test.js` | `tests/unit/stockage/sync-cloud.test.js` | 3 | 126 |
| `tests/e05-session-review.test.js` | `tests/unit/stockage/sync-cloud.test.js` | 6 | 126 |
| `tests/e05-sync-protocol.test.js` | `tests/unit/stockage/sync-cloud.test.js` | 9 | 126 |
| `tests/e05-sync-session.test.js` | `tests/unit/stockage/sync-cloud.test.js` | 7 | 126 |
| `tests/fiches-pj-source-cloud.test.js` | `tests/unit/stockage/sync-cloud.test.js` | 6 | 126 |
| `tests/gaps.test.js` | `tests/unit/stockage/sync-cloud.test.js` | 23 | 126 |
| `tests/lot2-v5-25-acceptance.test.js` | `tests/unit/stockage/sync-cloud.test.js` | 7 | 126 |
| `tests/lot2-v5-25-shared-state.test.js` | `tests/unit/stockage/sync-cloud.test.js` | 4 | 126 |
| `tests/p4c-char-sync.test.js` | `tests/unit/stockage/sync-cloud.test.js` | 35 | 126 |


## R2-13 — finalisation

| Ancien fichier | Nouveau fichier | Tests avant | Tests après (cible) |
|---|---|---|---|
| `tests/meta.test.js` | `tests/unit/donnees/meta-package.test.js` | 2 | 2 |

Plus aucun `tests/*.test.js` à la racine : 525 fichiers d’origine regroupés en 53 fichiers sous `tests/unit/`.
