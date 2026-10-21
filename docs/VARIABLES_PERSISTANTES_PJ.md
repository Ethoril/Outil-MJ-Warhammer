# Variables persistantes de personnage (registre pour la synchronisation fiche ↔ outil)

But : préparer la phase H du plan de fin de projet (écriture en retour de l’outil vers la fiche, décision du MJ du 21/10/2026). Chaque lot qui introduit ou modifie une valeur **durable** d’un personnage (qui doit survivre d’une séance à l’autre) l’ajoute ici. Les valeurs propres à un combat (États temporaires, Élan, ordre d’Initiative) n’y figurent pas.

| Variable | Emplacement dans l’outil | Source sur la fiche aujourd’hui | Modifiée par | Lot / commit |
| --- | --- | --- | --- | --- |
| Points de Péché | `extensions.v5.divine.sin` | absente | prières, Courroux, absolution, saisie MJ | divin (P4), phase B |
| Points de Corruption | à préciser (`grep -rn corruption js/core/v5-resources.js`) | absente | sorts, Courroux, Larmes de Shallya… | lot 3, phase B, phase D |
| Culte(s) | déduit des talents Béni / Invocation (spécialisation) | talents (importés) | — | divin |
| Points de Chance | ressource `fortune` | `chance` (importée) | relances, miracles | existant |
| Pénitences en cours | à créer (lot B10) | absente | Courroux, clôture MJ | phase B |
| Blessures Critiques (registre) | `extensions.v5.criticalWounds` | absente | combat, soins, Larmes de Shallya, bouton Guérir | phase A (A9, A11) |
