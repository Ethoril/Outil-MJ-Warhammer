/**
 * Types de mots-clés qu'un joueur déclare sur sa fiche (`motsCles`, champ `id`) → libellé affiché. Donnée unique : l'outil MJ la lit
 * (js/core/fiche-sync.js) et tools/build-fiche-keywords.mjs la recopie dans le dépôt des fiches, qui n'en garde aucune autre copie.
 * Ajouter un type ici, régénérer, puis relire le sens du type dans js/core/creature-keywords.js et js/core/v5-talent-psychology.js.
 * Aucun import : le fichier est recopié tel quel.
 */
export const FICHE_KEYWORD_TYPES = Object.freeze({ haine: 'Haine', animosite: 'Animosité', prejuge: 'Préjugé', 'sans-peur': 'Sans peur' });
