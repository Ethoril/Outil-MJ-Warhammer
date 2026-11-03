# Tâches · Engagements et circonstances

- [ ] T1 · `js/core/engagements.js` pur + `tests/unit/combat/engagements.test.js` (paires, mêlées, expiration, déduction de contexte, aperçu de Désengagement). CA5-8, 12, 15-17 (partie pure). `node --test tests/unit/combat/engagements.test.js`.
- [ ] T2 · Store : `js/core/store/api-engagements.js` + crochets `store.js` (attaque de mêlée, passage de Round, sortie du combat, fuite) + En Bon Ordre dans la fuite. CA5-9, 12-13. après : T1.
- [ ] T3 · Déduction dans `buildResolutionInput` + affichage « déduit / Forcer / Laisser au récit » dans le panneau. CA15-18. après : T1.
- [ ] T4 · `js/ui/workspace/plateau.js` (plateau + barre d'actions + panneau de Désengagement) à la place de `renderTrack`, CSS, `sw.js`. CA1-4, 10-14. après : T2.
- [ ] T5 · Parcours navigateur `tests/engagements-plateau-browser.mjs` ; recalage des parcours existants si un sélecteur bouge. après : T4.
- [ ] T6 · Circonstances : scène, positions, « À régler maintenant » en tête, Oui/Non/Récit. CA19-22. après : T3.
- [ ] T7 · Suites complètes, contre-vérification (code + règles), corrections, fiches de recette, publication 3.39.0.
