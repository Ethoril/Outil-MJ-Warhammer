// Phase D : sorts des traditions de magie (livre de base V5 et suppléments), hors feuille Magie.
// Lus par build-v5-spell-contracts.mjs (même rôle que v5-elven-spell-contracts.mjs). Textes : résumés français ; SL du texte anglais = DR.
// Principe transversal : aucun ingrédient exigé (rappel narratif seulement).
export const fact=(key,label,type='boolean',extra={})=>({key,label,type,...extra});
export const receipt=text=>({assistedReminder:text});
export const FM='Force Mentale mètres',BFM='Bonus de Force Mentale Rounds',INSTANT='Instantané';

/** Gabarit d'un sort de tradition. `book` = identifiant de livre du corpus (L06, L02…). */
export const tradition=(slug,name,canonicalName,book,page,domain,type,edition,cn,range,target,duration,description,effects,extra={})=>({slug,name,canonicalName,book,page,domain,type,edition,cn,range,target,duration,description,effects,...extra});

export const TRADITION_SPELLS=[];
