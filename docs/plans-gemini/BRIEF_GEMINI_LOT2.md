# Brief Gemini — lot 2 : propositions préparatoires (21 octobre 2026)

Même cadre que `docs/plans-gemini/BRIEF_GEMINI_PETITES_TACHES.md` (section « Cadre »), qui s’applique en entier : worktree dédié depuis `codex/divin-v5` à jour, branche `gemini/lot2`, LF, un commit par tâche `… (Gemini)`, pas de push, pas de `git stash`, fichier BLOQUÉ en cas d’impasse, résumés en français dans tes mots. Tu ne modifies **aucun** fichier existant : tu crées seulement les documents nommés ci-dessous. Ce sont des **propositions** que le MJ arbitrera ensuite ; ne les présente jamais comme des décisions.

Arbitrages à respecter : `docs/ARBITRAGES_MJ_21_10.md` (V5 EN d’abord, noms français du livre de base FR L05, conversions V4 → V5 consignées, aucun ingrédient exigé pour la magie).

## Tâche 1 — Noms français des Traits de créature

Source des Traits : `docs/BESTIAIRE_INVENTAIRE.json` / `.md`. Pour chaque Trait : nom anglais (L06), nom français attesté dans L05 (p.338-343 imprimées, avec son décalage de deux pages physiques) et page, ou à défaut une proposition marquée « proposé ». Traite explicitement les doublons signalés (Effrayé/Craintif, Grimpant/Grimpeur, Foulée/Sprinter/Striding Gait) et les Traits sans nom L05 (Plusieurs têtes, Féroce…), avec pour chaque proposition une ou deux alternatives et la raison du choix.

Livrable : `docs/plans-gemini/PROPOSITIONS_NOMS_TRAITS.md` (tableau : EN, FR retenu, statut attesté/proposé, page L05, alternatives, raison).

## Tâche 2 — Conversion V5 des sorts d’AOTE3 et noms des sorts sans nom officiel

Source : `docs/lot3/LOT4_TRADITIONS_BASE.json` / `.md` (Domaine de la Magie naturelle, 9 sorts d’Archives of the Empire 3, L02, en V4) et les 19 noms français proposés par l’inventaire (4 du livre de base, 6 du Chaos, 9 d’AOTE3). Relis les pages sources (`pdftotext` ciblé, image si un tableau est douteux).

- Pour chacun des 9 sorts AOTE3 : NI, portée, cible, durée, effet résumé, puis **proposition de conversion V5** clause par clause (bonus ±10 → ±1 DR, ±20 → ±2 DR, Avantage → Élan, durées, États V5 correspondants), avec la raison et l’alternative quand la conversion n’est pas évidente.
- Pour chacun des 19 noms : nom anglais, nom proposé, alternatives, raison (cohérence avec les noms officiels voisins).

Livrable : `docs/plans-gemini/PROPOSITIONS_CONVERSION_AOTE3.md`.

## Tâche 3 — Fiche d’arbitrage des choix de GPT, phase B

Lis `docs/plans-gpt/CHOIX_EXECUTANT_PHASE_B.md` (choix d’interprétation B-C01 à B-C04 faits par GPT). Pour chacun, rédige une question courte de sélecteur pour le MJ : intitulé, contexte en deux phrases au plus, 2 à 4 options (le choix de GPT en premier, marqué « choix actuel »), chacune décrite en une phrase. Ne tranche rien.

Livrable : `docs/plans-gemini/SELECTEURS_CHOIX_PHASE_B.md`.

## Rendu

`docs/plans-gemini/RAPPORT_GEMINI_LOT2.md` (commité) : une ligne par tâche, FAIT (hash) ou BLOQUÉ (raison).
