# Q6 · Tâches

Chaque tâche est un brief autonome pour une session (Opus : règles et store). Le test vient avant le code et échoue aujourd'hui. Lire `spec.md`, `plan.md`, `inventaire.md`. Commandes : tests ciblés `node --test "tests/unit/<dossier>/<fichier>.test.js"` ; suite complète seulement à la fusion de la vague. Commits locaux sur `main` suffixés « (Claude) », chemins nommés explicitement, pas de stash, pas de push. Fin de chaque tâche : `verifier` (code) + relecture des pages du livre citées.

- [x] **T0 · Fonction commune extraite du pivot.** Objectif : créer `resolveV5TestModifiers` dans `js/core/v5-test-modifiers.js` en extrayant de `buildCombatTest` la partie États + talents + couches ; `buildCombatTest` l'appelle.
  Fichiers : `js/core/v5-test-modifiers.js` (nouveau), `js/core/v5-combat-rules.js`, `tests/unit/moteur/tests-secondaires-agregateur.test.js` (nouveau).
  À établir et écrire en tête du module : quels modificateurs de `buildCombatTest` restent propres au combat ; le mécanisme existant de `needsInput` côté panneau ; l'absence de nouveau cycle d'imports (`npx madge --circular js/core` ou équivalent, avant/après).
  CA : CA9, CA10 (combat). Acceptation : `node --test "tests/unit/combat/**/*.test.js" "tests/unit/moteur/**/*.test.js"` vert sans changer une seule valeur attendue.

- [x] **T1 · Contextes existants délégués.** Objectif : `resolveV5ConditionTestContext` et `prepareMagicOptions` délèguent leur calcul d'États (et de couches pour la magie) à la fonction commune ; les talents génériques entrent dans le lancer, la Focalisation, la Dissipation et la Prière. Après : T0. Livré : `d940efd`.
  Fichiers : `js/core/v5-test-context.js`, `js/core/v5-magic-talents.js`, `js/core/v5-magic-dispel.js` (clé `Dissipation` lue par la fonction commune), `js/core/v5-divine-engine.js`, `js/core/v5-divine-store.js`, test commun.
  CA : CA1, CA2, CA5 (magie principale, prière), CA10. Acceptation : `etats-tous-les-tests`, `cumul-familles`, `magie/lancement-focalisation`, `magie/incidents-dissipation-haute-magie`, `divin/**` verts.

- [x] **T2 · Désengagement** `[P avec T1]`. Objectif : `previewDisengage` applique la fonction commune aux deux camps, plus infériorité numérique et Élan ; le plateau affiche le détail et pose la question de mouvement si besoin. Après : T0. Livré : `1f5207c, 72812f0`.
  Fichiers : `js/core/engagements.js`, `js/core/store/api-engagements.js`, `js/ui/workspace/plateau.js` et la partie désengagement de `js/ui/workspace-view.js`, test commun, `tests/unit/combat/engagements*.test.js`.
  CA : CA1, CA3, CA4, CA5, CA8, CA9. Acceptation : tests ciblés + `timeout 120 node tests/engagements-plateau-browser.mjs`.

- [ ] **T3 · Magie secondaire de premier niveau.** Objectif : interruption de Focalisation (Avantages et Désavantages compris), méditation, relance Cadai, déploiement Cadai, Arcanes impitoyables passent par la fonction commune. Reprendre aussi un reste de T1 : au lancer et à la Focalisation, la difficulté et l'armure sont ajoutées après le calcul commun, donc Esprit fort ne les annule pas (corrigé pour la Dissipation). Après : T1.
  Fichiers : `js/core/v5-magic-channelling.js`, `js/core/v5-magic-talents.js` (méditation), `js/core/v5-magic-high.js`, `js/core/v5-magic-arcane-unforgiving.js`, la commande `v5-cadai-deploy` de `js/core/store.js`, test commun.
  CA : CA1, CA9, CA10.

- [ ] **T4 · Monture et chutes.** Objectif : Chevaucher, Désarçonnement, Surpris à cheval, Endurance après Croche-pied monté, échappée de Filet ; le doublon `store.js` (Désarçonnement) appelle le calcul de `resolution.js` au lieu de le refaire. Après : T0 ; pas en même temps que T3 ni T5 (`store.js`).
  Fichiers : `js/core/resolution.js` (plans de monture, Croche-pied, Filet), `js/core/store.js` (commandes de monture), test commun, `combat/empoignade-et-monture.test.js`.
  CA : CA1, CA3, CA9, CA10.

- [ ] **T5 · Hors combat.** Objectif : Corruption, poursuite, extraction de projectile. Après : T4 (`store.js`).
  Fichiers : `js/core/store.js` (`resolvedCorruptionTest`), `js/core/v5-broken-escape.js` (poursuite), `js/core/store/api-v5-combat-actions.js`, test commun.
  CA : CA1, CA9, CA10.

- [x] **T6 · Scores saisis et Déterminé** `[P avec T3]`. Objectif : arquebuse à salve, Warp Blade et séquelles de convalescence ajoutent la fonction commune au score de fiche saisi, avec le libellé « score de fiche, sans modificateurs » ; Déterminé utilise le calcul commun au lieu de son recalcul manuel. Après : T0. Livré : `25ee412, 8b993bd`.
  Fichiers : `js/core/v5-combat-fumbles.js`, `js/core/v5-supplemental-equipment.js`, `js/core/v5-aftermath.js`, `js/core/v5-talent-replacements.js`, libellés dans `js/ui/resolution-panel.js` et l'écran de convalescence, test commun.
  CA : CA8 (séquelle À terre), CA12, CA9.

- [ ] **T7 · Tests de sorts au fil des tours.** Objectif : les ~19 appels de `v5-magic-turn.js` (Calme contre la mort compris) passent par la fonction commune, des deux côtés pour les oppositions. Après : T1.
  Fichiers : `js/core/v5-magic-turn.js`, `js/core/v5-magic-attributes.js`, test commun, `magie/traditions-et-invocations.test.js`, `combat/liaison-cause-mort.test.js`.
  CA : CA1, CA3, CA7, CA9, CA10.

- [ ] **T8 · Contrats de sorts** `[P avec T7]`. Objectif : les ~11 appels de `v5-spell-contracts.js` (oppositions, Souffle, résistances, Cor, Calme). Après : T1.
  Fichiers : `js/core/v5-spell-contracts.js`, test commun, `magie/contrats-*.test.js`.
  CA : CA1, CA3, CA7, CA9, CA10.

- [ ] **T9 · Fusion.** Suite complète une fois, parcours navigateur des zones touchées sous `timeout 120`, `verifier` sur toute la spec, CA11 (sauvegarde ancienne rechargée). Release proposée au MJ.

Ordre suggéré : T0 → (T1 ∥ T2 ∥ T6) → (T3 ∥ T4 ∥ T7 ∥ T8) → T5 → T9. T3 et T4 touchent tous deux `store.js` : si on les lance ensemble, T3 laisse la commande `v5-cadai-deploy` à T5.
