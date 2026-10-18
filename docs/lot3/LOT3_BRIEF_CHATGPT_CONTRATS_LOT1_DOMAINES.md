# Brief pour ChatGPT — correction des contrats, lot 1 : les sorts des Domaines V5

11 octobre 2026. Chantier de code. Premier lot des phases 7 et 8 du [plan](LOT3_PLAN_CORRECTION_CLAUDE.md). Lots suivants prévus : Arcanes et mineurs ; Haute Magie et elfiques ; Winds of Magic ; catalogue.

## Fonctionnement en chaîne

Tu corriges un lot ; pendant ce temps, aucun autre agent n'écrit dans le dépôt. Quand tu as fini, un vérificateur Claude contrôle ton lot **sur une copie** du dépôt, contre les pages, pendant que tu commences le lot suivant ; ses retours sont ajoutés à ton lot suivant.

## Périmètre

Les **sorts de la famille « Domaine V5 »** de ton [suivi exhaustif](LOT3_SUIVI_EXHAUSTIF_MAGIE.md) (68 sorts au moment du suivi : Bêtes, Cieux, Feu, Lumière, Métal, Mort, Ombres, Vie). Pour chacun : les fiches V-xx/N-xx de [LOT3_FICHES_CORRECTION_CONTRATS.md](LOT3_FICHES_CORRECTION_CONTRATS.md) et les lignes de ton suivi (statut, clauses en écart, « non vérifié »).

Objectif par sort : **toutes les clauses mesurables exécutées comme le livre et les décisions du MJ**, ou explicitement classées en donnée MJ / rappel avec la raison. Un sort « non vérifié » doit sortir de ce statut : exécute ses variantes (réussite et échec des Tests secondaires, surpuissance, durée et expiration via la fin de tour réelle, cibles multiples, Protection).

## Règles

- Contexte et règles générales : [ton premier brief](LOT3_BRIEF_CHATGPT_DISSIPATION_ET_FICHES.md) (« Contexte » et « Règles »), sauf les listes de fichiers : **pour ce lot, tous les fichiers de code sont autorisés**, personne d'autre n'écrit.
- Décisions du MJ : [LOT3_CADRAGE_MAGIE.md](LOT3_CADRAGE_MAGIE.md), sections « Arbitrages confirmés » et « Arbitrages du 10 octobre » (dont les lignes du 11 octobre). Elles priment sur le livre quand elles l'adaptent.
- Relis la page de chaque sort avant de le corriger et cite-la dans son test.
- **Contrats** : corrige dans `tools/build-v5-spell-contracts.mjs` (et `tools/v5-overcast-specific.mjs` pour les options de surpuissance propres), puis régénère : `js/data/v5-spell-contracts.json` et `docs/lot3/LOT3_MATRICE_CONTRATS_V5.md`. Deux générations successives doivent être identiques. Jamais d'édition manuelle du JSON. Signale tout changement des comptages (277 identités : 123 calculables / 132 données MJ / 22 rappels / 0 restant ; Silence (Arcane) et Arc coruscant ont été retirés, ce sont des doublons de Silence et de l'Arc de T'Essla).
- **Ne lance pas `tools/build-v5-talent-coverage.mjs`** : il est désaligné et réécrit `js/data/v5-talent-coverage.json` à tort.
- Moteur : `js/core/v5-spell-contracts.js` et modules `js/core/v5-magic-*.js` quand une clause exige un mécanisme. Pas de règle propre à un sort codée en dur si un champ de contrat générique peut l'exprimer.
- Aucun dé ni fait implicite (tout dé manquant bloque l'aperçu) ; aucun ingrédient ; effets temporaires en couches restaurées à l'expiration ; Undo atomique. Ne régresse aucun test existant ; si une attente ancienne encode une règle fausse, corrige-la en citant la page ou la décision.
- Catalogue public (`js/data/reference-snapshot.json`) : **ne pas modifier**. Si une description affichée contredit le contrat corrigé, note-le dans les fiches (le MJ décidera d'une correction du catalogue et de la feuille).
- Interface : si un sort a besoin d'une saisie MJ nouvelle, ajoute le contrôle dans le bloc « Options du sort » (`js/ui/v5-spell-options.js`) ou les destinataires (`js/ui/v5-magic-controls.js`), visible seulement pour ce sort.

## Tests

- Un fichier de test par Domaine (`tests/lot3-v5-contrats-<domaine>.test.js`), au moins un test par sort, page citée, passant par le Store (`previewSpellExecution` puis `applySpellExecution`, et la fin de tour réelle `createCombatEngine(store).nextTurn()` pour les durées).
- Test rouge avant chaque correction (dis-le s'il n'a pas pu être vu rouge).
- Fin : `node --test` complet vert ; `node tests/browser-magic-v5-smoke.mjs`, `node tests/lot3-v5-magic-2b-ui-browser.mjs`, `node tests/lot2-combat-v5-browser.mjs` verts ; geste navigateur pour chaque nouveau contrôle d'interface.

## Livrables

1. Le code et les tests.
2. Mise à jour de ton [suivi exhaustif](LOT3_SUIVI_EXHAUSTIF_MAGIE.md) pour les sorts du lot : nouveau statut, preuve (exécuté/testé, nom du test), non vérifié restant.
3. Mise à jour des fiches concernées : « corrigé le … » ou raison du maintien.
4. Rapport court `docs/lot3/LOT3_RAPPORT_CONTRATS_LOT1.md` : sorts passés conformes, sorts restant en anomalie ou non vérifiés avec la raison, décisions MJ nécessaires (formulées avec deux options), descriptions du catalogue en contradiction, comptages de la matrice avant/après, résultats des tests.
