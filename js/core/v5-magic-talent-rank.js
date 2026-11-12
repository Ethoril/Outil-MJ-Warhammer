/** Rangs des talents magiques et scores de base (ARCH-03) : module feuille, sans import du cœur des règles. */
import pins from '../data/v5-magic-talent-sources.json' with { type: 'json' };
import { acquiredV5Talents } from './v5-talent-registry.js';
import { getReferenceCatalogue } from './reference-catalog.js';
export function magicTalentRank(actor, id, specialization = null) {
  const key = id.startsWith('talent-') ? id : 'talent-'+id;
  const lostIds = { 'sens de la magie': 'talent-magical-sense', 'perception de la magie': 'talent-magical-sense', 'magical sense': 'talent-magical-sense', 'seconde vue': 'talent-second-sight', 'second sight': 'talent-second-sight' };
  if ((actor?.extensions?.v5?.miscastEffects || []).some(effect =>
    [...(effect.talentsLost || []), effect.talentLost].filter(Boolean).some(name => (lostIds[fold(name).trim()] || name) === key))) return 0;
  const source = getReferenceCatalogue().talents.find(t => t.id === key);
  if (!source || source.description !== pins.sourceDescriptions[key]) return 0;
  return Math.max(0, ...acquiredV5Talents(actor).filter(t => t.talentId === key && (!specialization || t.specialization === specialization)).map(t=>t.rank));
}
export const fold=value=>String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const characteristic=(values,key)=>values?.[Object.keys(values || {}).find(k=>k.toLowerCase()===String(key).toLowerCase())];
export function baseCharacteristicScore(actor,carac){return Number(characteristic(actor?.extensions?.v5?.baseCaracs || actor?.baseCaracs,carac) ?? characteristic(actor?.caracs,carac) ?? 0);}
export function effectiveSkillScore(actor,score,carac){
 const base=characteristic(actor?.extensions?.v5?.baseCaracs || actor?.baseCaracs,carac);
 return Math.max(0,Number(score) + (base!=null && Number.isFinite(Number(base)) ? Number(characteristic(actor?.caracs,carac) || 0)-Number(base) : 0));
}
export function activeMagicTalent(actor,id){return (actor?.extensions?.v5?.spellEffects || []).find(e=>e.magicTalentId==='talent-'+id);}
export function familiarSkillSupport(actor,assistant,skill,context={}){
 const name=fold(skill),result={modifiers:[],advantages:[]};
 if(!assistant || context.magicAssistantLinked!==true || assistant.id===actor.id)return result;
 const basic=/focalisation|langue.*magick/.test(name);
 if(magicTalentRank(assistant,'magical-assistant')&&(basic||/savoir.*magie/.test(name)||/recherche/.test(name)&&context.magicalNature===true))result.modifiers.push({id:'magical-assistant',label:'Assistant magique',amount:2});
 else if(magicTalentRank(assistant,'animal-assistant')&&(basic||/survie/.test(name)||/perception/.test(name)&&context.magicalNature===true))result.advantages.push({id:'animal-assistant',label:'Assistant animal'});
 return result;
}
