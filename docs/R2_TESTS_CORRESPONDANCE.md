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
