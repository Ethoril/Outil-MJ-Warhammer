/** Impasse conserve la couche d'origine et son horloge ; seules ses valeurs sont momentanément inactives. */
export function unsuppressedSpellEffects(effects=[]){const list=(Array.isArray(effects)?effects:[]).filter(e=>e&&typeof e==='object'&&!Array.isArray(e));const ids=new Set(list.flatMap(e=>e.suppressedEffectIds || []));return list.filter(e=>!ids.has(e.id));}
