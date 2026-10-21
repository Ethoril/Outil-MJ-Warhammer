/** Acquisitions résolues et descriptions publiques épinglées ; jamais d'activation par lecture de prose. */
import pins from '../data/v5-magic-talent-sources.json' with { type: 'json' };
import { acquiredV5Talents } from './v5-talents.js';
import { getReferenceCatalogue } from './reference-catalog.js';
import { previewV5Test, selectV5Test, normalizeV5Roll } from './v5-roll.js';
import { getBurnoutStatus, consumeCadaiRune, prepareCadaiRerolls } from './v5-magic-high.js';
import { applyPrayerSLCaps,getPrayerSLModifiers } from './v5-divine-prayer-caps.js';

const ruleError=message=>Object.assign(new Error(message),{userFacing:true});
export function magicTalentRank(actor, id, specialization = null) {
  const key = id.startsWith('talent-') ? id : 'talent-'+id;
  const lostIds = { 'sens de la magie': 'talent-magical-sense', 'perception de la magie': 'talent-magical-sense', 'magical sense': 'talent-magical-sense', 'seconde vue': 'talent-second-sight', 'second sight': 'talent-second-sight' };
  if ((actor?.extensions?.v5?.miscastEffects || []).some(effect =>
    [...(effect.talentsLost || []), effect.talentLost].filter(Boolean).some(name => (lostIds[fold(name).trim()] || name) === key))) return 0;
  const source = getReferenceCatalogue().talents.find(t => t.id === key);
  if (!source || source.description !== pins.sourceDescriptions[key]) return 0;
  return Math.max(0, ...acquiredV5Talents(actor).filter(t => t.talentId === key && (!specialization || t.specialization === specialization)).map(t=>t.rank));
}
/**
 * Talent employé pour lancer un sort (V5 p. 239, Drain de puissance) : Magie des Arcanes du Domaine, Haute Magie ; null pour un sort
 * mineur ou un contexte sans sort. `lore` vaut null si le Domaine est ambigu (sort d'Arcane sans Domaine unique chez le lanceur).
 */
const LORE_PATTERNS = { fire: /feu|fire|aqshy/, light: /lumiere|light|hysh/, beasts: /bete|beast|ghur/, death: /mort|death|shyish/, heavens: /cieux|heaven|azyr/, life: /vie|life|ghyran/, metal: /metal|chamon/, shadow: /ombre|shadow|ulgu/ };
export function castingTalent(actor, spell, options = {}) {
  const domain = spell?.domain;
  if (!spell || spell.isPetty === true || domain === 'petty' || domain === 'elven-petty' || spell.type === 'petty') return null;
  if (domain === 'high' || spell.type === 'high') return { id: 'talent-high-magic', lore: null };
  const known = [...new Set((actor?.talents || []).filter(t => t.status === 'resolved' && t.id === 'talent-arcane-magic').map(t => Object.keys(LORE_PATTERNS).find(key => LORE_PATTERNS[key].test(fold(t.specialization)))).filter(Boolean))];
  if (LORE_PATTERNS[domain]) return { id: 'talent-arcane-magic', lore: domain };
  if (domain === 'elven-arcane') {
    const winds = [].concat(spell.wind || []).flatMap(w => String(w).split(',')).map(w => windIds[w.trim()]).filter(Boolean);
    return { id: 'talent-arcane-magic', lore: winds.find(w => known.includes(w)) || winds[0] || null };
  }
  // Sort d'Arcane générique : le Domaine choisi pour le lancement désigne le Talent employé (lanceur à plusieurs Domaines).
  const chosen = Object.keys(LORE_PATTERNS).find(key => LORE_PATTERNS[key].test(fold(options?.chosenLore)));
  return { id: 'talent-arcane-magic', lore: chosen || (known.length === 1 ? known[0] : null) };
}
function isTalentDrained(actor, spell, options = {}) {
  const used = castingTalent(actor, spell, options);
  return Boolean(used) && (actor?.extensions?.v5?.miscastEffects || []).some(e => e.type === 'talent-disabled' && e.talent?.id === used.id && (!e.talent.lore || !used.lore || e.talent.lore === used.lore));
}
export const magicTurnKey = (actor, options={}) => options.turnKey ?? `${options.round ?? 1}:${options.turn ?? 1}`;
export function assertMagicTurn(actor, options={}) {
  if (actor?.extensions?.v5?.warWizardTurn === magicTurnKey(actor, options)) throw ruleError('Mage de guerre : aucun autre Test d’incantation ou de Focalisation ce Tour.');
}
export function prepareMiscastOptions(actor, options = {}) {
  const blocked = actor?.extensions?.v5?.specialStates?.forbidMitigation;
  return { ...options, instinctiveDiction: !blocked && Boolean(options.instinctiveDiction) && magicTalentRank(actor, 'instinctive-diction') > 0,
    attunementRank: blocked ? 0 : magicTalentRank(actor, 'aethyric-attunement') };
}
export function prepareMagicOptions(actor, kind, options={}, spell = null) {
  if (['casting','channelling'].includes(kind)) assertMagicTurn(actor, options);
  if(getBurnoutStatus(actor).active && ['casting','channelling'].includes(kind))throw ruleError('Épuisement magique : Focalisation et incantation interdites.');
  const flags=actor.extensions?.v5?.specialStates;
  if(kind==='casting' && actor.extensions?.v5?.suppressedSpellIds?.includes(spell?.id))throw ruleError('Impasse : ce sort précis est temporairement inutilisable.');
  const recastingAura=(actor.extensions?.v5?.spellEffects || []).some(e=>e.specialState?.cannotCastOther && e.spellId===spell?.id);
  if (['casting','channelling','dispel'].includes(kind) && flags?.cannotSpeak || kind==='casting' && (flags?.cannotCast || flags?.cannotCastOther && !recastingAura || flags?.blockedSkillFamilies?.includes('language')) || kind==='dispel' && flags?.cannotDispel) throw ruleError('Effet actif : parole ou Test magique interdit.');
  const next = prepareMiscastOptions(actor, options);
  next.forceMajorMiscast=Boolean(actor.extensions?.v5?.specialStates?.forceMajorMiscast && (options.roll===100 || options.roll%11===0));
  if(actor.extensions?.v5?.specialStates?.forbidMitigation){next.instinctiveDiction=false;next.attunementRank=0;if(options.useCadaiRune && options.cadaiPurpose==='miscast')throw ruleError('La Fortune est Capricieuse interdit l’atténuation des incidents.');}
  Object.assign(next, prepareCadaiRerolls(actor, kind, options, spell));
  if (kind === 'casting' && isTalentDrained(actor, spell, options)) throw ruleError('Drain de puissance : le Talent employé pour lancer ce sort est inutilisable.');
  if(kind==='casting' && (actor.extensions?.v5?.miscastEffects || []).some(e=>e.type==='restriction' && (e.restrictions || []).some(r=>/langue|verbal/i.test(r))))throw ruleError('Incident magique : utilisation de Langue (Magick) interdite pendant la durée indiquée.');
  const assistant=options.assistant;
  const slModifiers=[...magicSkillModifiers(actor,kind==='casting'?'Langue (Magick)':kind==='pause'?'Résistance':kind==='interruption'?'Calme':'Focalisation'),...(options.slModifiers || []),...(Number(options.yenluiPenalty)<0 ? [{id:'yenlui',label:'Yenlui',amount:Number(options.yenluiPenalty)}]:[])], advantageSources=[...(options.advantageSources || [])];
  if (['casting','channelling'].includes(kind) && assistant && options.assistantLinked === true && assistant.id !== actor.id) {
    if (magicTalentRank(assistant,'magical-assistant')) slModifiers.push({id:'magical-assistant',label:'Assistant magique',amount:2});
    else if (magicTalentRank(assistant,'animal-assistant')) advantageSources.push({id:'animal-assistant',label:'Assistant animal'});
  }
  const levels=new Map();for(const state of actor.states || []){const key=fold(state.key || state.name);levels.set(key,(levels.get(key)||0)+Number(state.level || 1));}
  if(['casting','channelling','dispel'].includes(kind) && (levels.has('inconscient') || levels.has('surpris')))throw ruleError('Inconscient ou Surpris : Test magique indisponible.');
  const ignoreFatigue=['casting','channelling'].includes(kind) && Number(activeMagicTalent(actor,'eye-of-the-storm')?.magicTalentRank)>=2;
  const mental=['casting','channelling','dispel','interruption'].includes(kind);
  if(flags?.clarityOfThought && mental)for(let i=slModifiers.length-1;i>=0;i--)if(slModifiers[i].amount<0 && /psychology|mental.?mutation|mutation.?mental/i.test(slModifiers[i].id))slModifiers.splice(i,1);
  const penalty=Math.max(flags?.clarityOfThought && mental?0:levels.get('sonne')||0,ignoreFatigue?0:levels.get('extenue')||0,levels.get('empoisonne')||0);
  if(penalty)slModifiers.push({id:'magic-condition-penalty',label:'Pénalité d’État',amount:-penalty});
  if(Number(activeMagicTalent(actor,'sanctuary-of-the-mind')?.magicTalentRank)>=3)for(const modifier of slModifiers)if(modifier.id==='yenlui' && modifier.amount<0)modifier.amount=0;
  const lore=String(spell?.wind || spell?.type || options.wind || options.lore || '').toLowerCase();
  for(const effect of actor.extensions?.v5?.spellEffects || []) if(effect.loreTestBonus && ['casting','channelling'].includes(kind) && (lore===effect.loreTestBonus.lore || effect.loreTestBonus.lore==='fire' && /aqshy|feu/.test(lore))) slModifiers.push({id:'spell-lore-bonus',label:effect.spellName,amount:effect.loreTestBonus.amount});
  next.slModifiers=slModifiers;next.advantageSources=advantageSources;
  return next;
}
export function applyMagicAttempt(actor, preview, options={}) {
  let next=structuredClone(actor);
  const reaction = preview.actionType === 'dispel-casting';
  const cast = reaction ? preview : preview.castingPreview || preview;
  const receipts = cast.cadaiReceipts?.length ? cast.cadaiReceipts : cast.cadaiReceipt ? [cast.cadaiReceipt] : [];
  if (new Set(receipts.map(r => r.purpose)).size !== receipts.length) throw ruleError('Une rune des Cadai au maximum pour le même jet.');
  for (const receipt of receipts) {
    const used=consumeCadaiRune(next,{purpose:receipt.purpose});
    if(!used.success) throw ruleError(used.reason);
    next=used.participant;
  }
  next.extensions ??={};next.extensions.v5 ??={};
  if (!reaction) next.extensions.v5.magicAttemptTurn=magicTurnKey(next,{...options,turnKey:preview.turnKey ?? preview.castingPreview?.turnKey ?? options.turnKey});
  if(options.warWizard){
    if(!magicTalentRank(next,'war-wizard') || !next.extensions.v5.hasMomentum)throw ruleError('Mage de guerre requiert le talent et l’Élan.');
    next.extensions.v5.hasMomentum=false;next.extensions.v5.warWizardTurn=magicTurnKey(next,options);
  }
  return next;
}

const fold=value=>String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const characteristic=(values,key)=>values?.[Object.keys(values || {}).find(k=>k.toLowerCase()===String(key).toLowerCase())];
export function baseCharacteristicScore(actor,carac){return Number(characteristic(actor?.extensions?.v5?.baseCaracs || actor?.baseCaracs,carac) ?? characteristic(actor?.caracs,carac) ?? 0);}
export function effectiveSkillScore(actor,score,carac){
 const base=characteristic(actor?.extensions?.v5?.baseCaracs || actor?.baseCaracs,carac);
 return Math.max(0,Number(score) + (base!=null && Number.isFinite(Number(base)) ? Number(characteristic(actor?.caracs,carac) || 0)-Number(base) : 0));
}
export function activeMagicTalent(actor,id){return (actor?.extensions?.v5?.spellEffects || []).find(e=>e.magicTalentId==='talent-'+id);}
/** « Discrétion (Urbaine) » -> { base: 'discretion', spec: 'urbaine' } (casse et accents repliés). */
const splitSkill=name=>{const match=String(name||'').match(/^(.*?)\s*\((.*)\)\s*$/);return {base:fold(match?match[1]:name).trim(),spec:match?fold(match[2]).trim():null};};
/**
 * Une clé de Test d'effet magique vise-t-elle ce Test ? Compétence et spécialité repliées ; une clé sans spécialité couvre toutes les
 * spécialités ; une clé spécialisée ne vaut que pour cette spécialité (nom du Test ou `context.skillContext` déclaré par le MJ) ;
 * « Tous les Tests » vaut pour tous (le qualificatif « Secousse » n'est qu'une étiquette), jamais avec une autre condition.
 */
function testKeyApplies(key,skill,context){
 if(key==='all')return true;
 // « carac:soc » : tout Test lié à cette caractéristique (Tests de Sociabilité), quelle que soit la compétence.
 if(/^carac:/i.test(key))return Boolean(context?.carac)&&fold(key.slice(6))===fold(context.carac);
 const wanted=splitSkill(key),test=splitSkill(skill);
 if(wanted.base==='tous les tests')return !wanted.spec||wanted.spec==='secousse';
 if(wanted.base.endsWith(' adverse'))return false;
 if(wanted.base!==test.base)return false;
 if(!wanted.spec)return true;
 return test.spec===wanted.spec||[].concat(context?.skillContext||[]).map(fold).includes(wanted.spec);
}
const CARAC_LABELS={cc:'Capacité de Combat',ct:'Capacité de Tir',f:'Force',e:'Endurance',i:'Initiative',ag:'Agilité',dex:'Dextérité',int:'Intelligence',fm:'Force Mentale',soc:'Sociabilité'};
export function magicSkillModifiers(actor,skill,context={}){
 const result=[];const name=fold(skill);
 for(const [key,amount] of Object.entries(actor?.extensions?.v5?.testModifiers || {}))if(testKeyApplies(key,skill,context))result.push({id:'spell-skill:'+key,label:'Effet magique : '+(/^carac:/i.test(key)?'Tests de '+(CARAC_LABELS[fold(key.slice(6))]||key.slice(6)):key),amount});
 for(const [index,effect] of (actor?.extensions?.v5?.miscastEffects || []).entries())if(effect.type==='penalty' && [...(effect.targetSkills || []),effect.targetSkillCategory].filter(Boolean).some(s=>name.includes(fold(s)) || name.includes('langue')&&s==='Incantation'))result.push({id:'miscast:'+index,label:effect.name,amount:effect.slModifier});
 return result;
}
/** Clés « … adverse » du porteur d'un effet (Perception adverse…) : elles s'appliquent au Test de qui s'y oppose. */
export function magicAdverseModifiers(holder,skill){
 const test=splitSkill(skill);
 return Object.entries(holder?.extensions?.v5?.testModifiers || {}).filter(([key])=>{const wanted=splitSkill(key);return wanted.base.endsWith(' adverse')&&wanted.base.slice(0,-' adverse'.length)===test.base&&(!wanted.spec||wanted.spec===test.spec);})
  .map(([key,amount])=>({id:'spell-adverse:'+key,label:'Effet magique adverse : '+key,amount}));
}
export function previewMagicMeditation(actor,options={}){
 const id=options.talentId,rank=magicTalentRank(actor,id);
 if(!rank || !['talent-eye-of-the-storm','talent-sanctuary-of-the-mind','talent-mind-over-body','talent-cadai-meditation'].includes(id))throw ruleError('Talent de méditation validé requis.');
 const cadai=id==='talent-cadai-meditation';
 if(Number(options.minutes)<(cadai?60:20))throw ruleError(cadai?'Au moins une heure de méditation requise.':'Au moins 20 minutes de contemplation requises.');
 const skill=(actor.skills || []).find(s=>fold(s.name || s.nom)==='priere');
 const score=effectiveSkillScore(actor,skill?.total ?? skill?.value ?? skill?.score ?? baseCharacteristicScore(actor,'FM'),'FM');
 const prayerSkill=Boolean(skill&&(skill.id==='skill-50_72_69_e8_72_65-base'||fold(skill.name||skill.nom)==='priere'));
 const prayerModifiers=prayerSkill?getPrayerSLModifiers(actor,options.prayerSLContext||{}):{ok:true,status:'unchanged',modifiers:[],needsInput:[]};
 if(!prayerModifiers.ok)return {ready:false,success:false,id,error:'Le malus de Prière du Courroux est invalide ou ne peut pas être daté.',needsInput:prayerModifiers.needsInput};
 let test=selectV5Test(previewV5Test({score,roll:normalizeV5Roll(options.roll),slModifiers:[...(cadai?[{id:'meditation-difficulty',label:'Accessible',amount:2}]:[]),...prayerModifiers.modifiers]}), 'keep');
 const rawSL=test.sl;
 const prayerSL=prayerSkill?applyPrayerSLCaps(actor,test):{ok:true,status:'unchanged',test,caps:[],needsInput:[]};
 if(!prayerSL.ok)return {ready:false,success:false,test,id,error:'La sanction calendaire de Prière est invalide.' ,needsInput:prayerSL.needsInput};
 test=prayerSL.test;
 const prayerSLAdjustment=prayerSL.status==='applied'?{rawSL,effectiveSL:test.sl,caps:prayerSL.caps}:null;
 if(!test.success)return {ready:true,success:false,test,id,prayerSLAdjustment};
 if(cadai)return {ready:true,success:true,test,id,yenlui:'Lumineux',prayerSLAdjustment};
 const dice=options.durationRolls;
 if(!Array.isArray(dice)||dice.length!==1+Math.max(0,test.sl)||dice.some(n=>!Number.isInteger(n)||n<1||n>10))return {ready:false,success:true,test,id,prayerSLAdjustment,error:'Saisir '+(1+Math.max(0,test.sl))+' résultats de d10 pour la durée.'};
 const hours=dice.reduce((a,b)=>a+b,0);
 return {ready:true,success:true,test,id,durationRolls:dice,prayerSLAdjustment,effect:{spellId:id,spellName:options.name || id,magicTalentId:id,magicTalentRank:rank,duration:hours+' heures',testModifiers:id==='talent-sanctuary-of-the-mind'&&rank>=2?{'Recherche':1}:undefined,traits:id==='talent-mind-over-body'?['Insensible à la douleur',...(rank>=2?['Vision mentale','Immunité à Aveuglé']:[])]:undefined}};
}

const windIds={Aqshy:'fire',Azyr:'heavens',Chamon:'metal',Ghur:'beasts',Ghyran:'life',Hysh:'light',Shyish:'death',Ulgu:'shadow'};
export function suffusedCastingBonus(actor,spell,options={}){
 const wind=windIds[spell.wind] || windIds[spell.lore] || spell.wind || spell.lore;
 return (options.suffusedBy || []).some(row=>{
   const source=(options.participants || []).find(p=>p.id===row.id);
   return source && Number.isFinite(row.distance) && row.distance>=0 && row.distance<=8 && Object.entries(windIds).some(([spec,id])=>id===wind && magicTalentRank(source,'suffuse-with',spec));
 }) ? 1 : 0;
}
export function magicSkillReplacement(actor,skill,context={}){
 const wind=context.magicSuffusedWind;
 const substitutions={Aqshy:['force mentale','entrer en frenesie'],Azyr:['perception'],Chamon:['evaluation'],Ghur:['emprise sur les animaux','savoir (betes)'],Ghyran:['savoir (plantes)','savoir (animaux)','savoir (herbes)','soin aux animaux'],Hysh:['recherche'],Shyish:['intimidation'],Ulgu:['discretion']};
 if(wind==='Aqshy' && context.talentAction!=='frenzy')return null;
 if(!wind || !magicTalentRank(actor,'suffuse-with',wind) || !(substitutions[wind] || []).includes(fold(skill)))return null;
 const foc=(actor.skills || []).find(s=>/^focalisation(?:$|\s*\()/i.test(s.name || s.nom || '')&&!/haute|qhaysh/i.test(s.name || s.nom || ''));
 return {score:effectiveSkillScore(actor,foc?.total ?? foc?.value ?? foc?.score ?? baseCharacteristicScore(actor,'FM'),'FM'),wind};
}

export function magicalSenseReceipts(caster,participants,options={}){
 return participants.filter(p=>p.id!==caster.id && magicTalentRank(p,'magical-sense')).map(observer=>{
   const skill=(observer.skills || []).find(s=>fold(s.name || s.nom)==='perception');
   const range=effectiveSkillScore(observer,skill?.total ?? skill?.value ?? skill?.score ?? baseCharacteristicScore(observer,'I'),'I');
   const fact=options.senseFacts?.[observer.id];
   const detected=Number.isFinite(fact?.distance) ? fact.distance>=0 && fact.distance<=range : null;
   return {observerId:observer.id,range,detected,direction:detected?fact.direction || 'direction approximative à préciser':null,summary:detected===null?observer.name+' : Perception de la Magie, lancement détectable à '+range+' yards (distance à préciser).':detected?observer.name+' détecte un lancement ; '+(fact.direction || 'direction approximative à préciser')+' ; magie non identifiée.':observer.name+' : lancement hors portée de Perception de la Magie.'};
 });
}
export function familiarSkillSupport(actor,assistant,skill,context={}){
 const name=fold(skill),result={modifiers:[],advantages:[]};
 if(!assistant || context.magicAssistantLinked!==true || assistant.id===actor.id)return result;
 const basic=/focalisation|langue.*magick/.test(name);
 if(magicTalentRank(assistant,'magical-assistant')&&(basic||/savoir.*magie/.test(name)||/recherche/.test(name)&&context.magicalNature===true))result.modifiers.push({id:'magical-assistant',label:'Assistant magique',amount:2});
 else if(magicTalentRank(assistant,'animal-assistant')&&(basic||/survie/.test(name)||/perception/.test(name)&&context.magicalNature===true))result.advantages.push({id:'animal-assistant',label:'Assistant animal'});
 return result;
}

export function enforceMagicTestRestrictions(actor,test,{magical=true}={}){
 const flags=actor?.extensions?.v5?.specialStates;
 if(!magical)return flags?.mundaneDoublesFail && (test.roll===100 || test.roll%11===0)?{...test,success:false,critical:false,sl:-Math.max(1,Math.abs(test.sl)),magicRestriction:'La Fortune est Capricieuse (+4 DR)'}:test;
 if(flags?.forceFumbleOnDoubles && (test.roll===100 || test.roll%11===0))return {...test,success:false,critical:false,fumble:true,sl:-Math.max(1,Math.abs(test.sl)),magicRestriction:'La Fortune est Capricieuse'};
 return flags?.forbidCrits ? {...test,critical:false}:test;
}
