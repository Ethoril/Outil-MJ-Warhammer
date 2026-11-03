# Tâches · Engagements et circonstances

- [x] T1 · `js/core/engagements.js` pur + `tests/unit/combat/engagements.test.js` (paires, mêlées, expiration, déduction de contexte, aperçu de Désengagement). CA5-8, 12, 15-17 (partie pure). `node --test tests/unit/combat/engagements.test.js`.
- [x] T2 · Store : `js/core/store/api-engagements.js` + crochets `store.js` (attaque de mêlée, passage de Round, sortie du combat, fuite) + En Bon Ordre dans la fuite. CA5-9, 12-13. après : T1.
- [x] T3 · Déduction dans `buildResolutionInput` + affichage « déduit / Forcer / Laisser au récit » dans le panneau. CA15-18. après : T1.
- [x] T4 · `js/ui/workspace/plateau.js` (plateau + barre d'actions + panneau de Désengagement) à la place de `renderTrack`, CSS, `sw.js`. CA1-4, 10-14. après : T2.
- [x] T5 · Parcours navigateur `tests/engagements-plateau-browser.mjs` ; recalage des parcours existants si un sélecteur bouge. après : T4.
- [x] T6 · Circonstances : scène, positions, « À régler maintenant » en tête, Oui/Non/Récit. CA19-22. après : T3.
- [ ] T7 · Suites complètes, contre-vérification (code + règles), corrections, fiches de recette, publication 3.39.0.

## Convergence
- Tour 1 (verifier code + verifier règles) : règles conformes ; écarts code corrigés au tour 2 (comparaison multi-cibles, forçage au changement de cible, scène par rencontre, banc, rang d'Initiative, Autres actions/Viser, Charge engagée forçable, Nuée et fuite de Brisé pré-remplies).
- CA22 partiel, assumé : les confirmations du MJ restent « À préciser / Oui / Non » ; « Laisser au récit » existe pour les déductions d'engagement et « Ignorer » pour les conditions ignorables. À trancher par le MJ si une troisième option est voulue ailleurs.
- Limites : Désengagement et Fuite du plateau ne décomptent pas l'Action/le Move du Tour ; le glisser sur une mêlée fusionne les mêlées (pas de retrait de l'ancienne) ; un combattant Inconscient qui se relève dans le même Round retrouve ses paires.
