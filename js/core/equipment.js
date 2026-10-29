/** Pure fiche equipment contract, copied functions regenerated from the source project. */
import { HIT_LOCATIONS, armourProtection, equipmentFormula, armourLayer, validateEquipmentItem } from '../data/shared/fiche/equipment.js';
import talentQualityRegistry from '../data/v5-quality-talent-contracts.json' with {type:'json'};
import contracts from '../data/keyword-engine-contracts.json' with { type: 'json' };
import spellContracts from '../data/v5-spell-contracts.json' with {type:'json'};
import { getReferenceCatalogue, resolveKeyword } from './reference-catalog.js';
import { conditionalArmour, natureTagLabel } from './v5-magic-combat.js';
import { normalizeDamageFields } from './damage.js';
import { applyV5SportSwordQuality, canUseV5PowderAmmunition } from './v5-weapon-qualities.js';
export { HIT_LOCATIONS, armourProtection, equipmentFormula, armourLayer, validateEquipmentItem };
/** Armes de corps à corps conjurables (V5 p. 301), sans prix ni inventaire permanent. */
export const ARCANE_WEAPON_PROFILES=Object.freeze(Object.fromEntries([
 ['dagger','Dague',2,1,'very-short',[]],['knife','Couteau',1,1,'very-short',['inoffensive']],['hand-weapon','Arme de base',4,1,'average',['desequilibree']],['improvised','Arme improvisée',1,1,'average',['desequilibree','inoffensive']],['net','Filet',null,1,'short',['defensive',{id:'inflige',parameter:'Empêtré 50'}]],['sword','Épée',4,1,'average',[]],
 ['garrote','Garrot',2,2,'personal',['immobilisante','inoffensive']],['knuckles','Poing américain',2,1,'personal',[]],['unarmed','Mains nues conjurées',0,1,'personal',['inoffensive']],
 ['cavalry-hammer','Marteau de cavalerie',5,2,'long',['assommante']],['lance','Lance de cavalerie',6,1,'very-long',['devastatrice','empaleuse']],
 ['buckler','Bocle',1,1,'personal',['parade','inoffensive']],['foil','Fleuret',3,1,'average',['rapide','empaleuse','precise','inoffensive']],['main-gauche','Main gauche',2,1,'short',['defensive','empaleuse','parade']],['rapier','Rapière',4,1,'long',['rapide','empaleuse']],['swordbreaker','Brise-lame',1,1,'short',['defensive','parade','piege-lame']],
 ['flail','Fléau',4,1,'average',['assommante','a-enroulement','desequilibree']],['grain-flail','Fléau à grain',3,2,'long',['assommante','imprecise']],['military-flail','Fléau militaire',5,2,'long',['devastatrice','assommante','a-enroulement','desequilibree']],['whip','Fouet',2,1,'very-long',['a-enroulement','desequilibree','inoffensive']],
 ['halberd','Hallebarde',5,2,'long',['defensive','entaille','empaleuse']],['pike','Pique',4,2,'massive',['empaleuse']],['staff','Bâton',3,2,'long',['defensive','assommante','inoffensive']],['spear','Lance',4,2,'very-long',['rapide','empaleuse']],
 ['bastard-sword','Épée bâtarde',5,2,'long',['devastatrice','defensive']],['greataxe','Grande hache',6,2,'long',['devastatrice','entaille','desequilibree']],['pick','Pic',5,2,'long',['devastatrice','perforante','desequilibree']],['warhammer','Marteau de guerre',6,2,'long',['devastatrice','assommante','desequilibree']],['zweihander','Espadon',5,2,'long',['devastatrice','entaille']]
].map(([id,name,damage,hands,reach,qualities])=>[id,{id,name,damage,hands,reach,qualities}])));
const CONJURED_WEAPON_GROUPS=Object.freeze({
 net:'Base',dagger:'Base',knife:'Base','hand-weapon':'Base',improvised:'Base',sword:'Base',
 garrote:'Bagarre',knuckles:'Bagarre',unarmed:'Bagarre','cavalry-hammer':'Cavalerie',lance:'Cavalerie',
 buckler:'Escrime',foil:'Escrime',rapier:'Escrime','main-gauche':'Escrime',swordbreaker:'Escrime',
 flail:'Fléau','grain-flail':'Fléau','military-flail':'Fléau',whip:'Fléau',
 halberd:'Hast',pike:'Hast',staff:'Hast',spear:'Hast',
 'bastard-sword':'Deux mains',greataxe:'Deux mains',pick:'Deux mains',warhammer:'Deux mains',zweihander:'Deux mains'
});
export const conjuredWeaponTrainingGroup=key=>CONJURED_WEAPON_GROUPS[key]||null;
export function conjuredWeaponMetadata(participant,action){
 const actionV5=action?.extensions?.v5||{},effectId=action?.spellEffectId||actionV5.spellEffectId;
 const effect=effectId&&(participant?.extensions?.v5?.spellEffects||[]).find(row=>row.id===effectId);
 const contract=effect&&spellContracts.find(row=>row.id===effect.spellId),spellEffects=contract?.effects||{};
 const legacyShyish=spellEffects.special==='scythe-of-shyish'||spellEffects.specialTag==='scythe-of-shyish';
 if(!actionV5.materialized&&!actionV5.conjuredWeaponKey&&!actionV5.conjuredWeaponProfile&&!(effect&&spellEffects.conjureWeapon===true)&&!legacyShyish)return null;
 const key=actionV5.conjuredWeaponKey||effect?.domainFacts?.weaponKey||spellEffects.conjureWeaponKey||spellEffects.conjureWeaponProfile?.id||(legacyShyish?'halberd':null);
 const profile=actionV5.conjuredWeaponProfile||(key&&ARCANE_WEAPON_PROFILES[key])||spellEffects.conjureWeaponProfile||null;
 return {key,profile,group:CONJURED_WEAPON_GROUPS[key]||profile?.trainingGroup||profile?.category||null,
  spellScoreImposed:actionV5.spellWeaponScoreImposed===true||spellEffects.conjureWeaponScore!==undefined,materialized:true,spellContract:contract||null};
}
/** Objets réellement présents, y compris les armes d'une action locale sans fiche liée. */
export function conjuredWeaponSkillScore(participant,key){
 const fold=s=>String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const numeric=value=>value==null||typeof value==='string'&&!value.trim()?null:Number.isFinite(Number(value))?Number(value):null;
 const group=CONJURED_WEAPON_GROUPS[key]||'Base',family=group==='Bagarre'?'bagarre':group==='Cavalerie'?'cavalerie':group==='Escrime'?'escrime':group==='Fléau'?'fleau':group==='Hast'?'hast':group==='Deux mains'?'deux mains':'base';
 const skill=(participant.skills||[]).find(s=>/corps a corps|melee/.test(fold(s.name||s.nom))&&new RegExp(family==='base'?'base|basic':family==='deux mains'?'deux mains|two.hand':family).test(fold(s.name||s.nom)));
 const value=[skill?.total,skill?.value,skill?.score].map(numeric).find(value=>value!==null);
 return value!==undefined?value:group==='Base'||group==='Bagarre'?numeric(participant.caracs?.CC):null;
}
export function spellObjectChoices(participant,{weaponsOnly=false}={}){
 const items=(Array.isArray(participant?.equipment)?participant.equipment:[]).filter(item=>!weaponsOnly || item.kind==='weapon').map(item=>({id:item.id,label:item.name || item.nom || item.id,kind:item.kind}));
 for(const action of participant?.actions || [])if(['attack','attaque'].includes(action.type)){
  const id=action.extensions?.fiche?.equipmentId || action.id;
  if(id && !items.some(item=>item.id===id))items.push({id,label:action.note || action.name || id,kind:'weapon'});
 }
 return items.filter(item=>typeof item.id==='string' && item.id.length);
}
export function normalizeEquipment(collection,{catalogue=getReferenceCatalogue(),present=collection!==undefined}={}){
 if(!present)return {coverage:'absent',items:[],warnings:[]};
 const invalid=message=>({coverage:'invalid',items:[],warnings:[{field:'equipment',code:'invalid-collection',severity:'error',message}]});
 if(!Array.isArray(collection)||collection.length>500)return invalid('Collection d’équipement invalide');
 const ids=new Set(),items=[],warnings=[];
 for(const raw of collection){try{validateEquipmentItem(raw,catalogue);if(ids.has(raw.id))return invalid(`Identifiant d’objet dupliqué : ${raw.id}`);ids.add(raw.id);items.push(globalThis.structuredClone(raw));}
 catch(error){return invalid(error.message);}
 if(!catalogue.items?.some(item=>item.id===raw.baseId))warnings.push({field:'equipment',entry:raw.id,code:'unknown-model',severity:'warning',message:'Modèle inconnu ; exemplaire conservé'});
 if(raw.ap===null&&['armour','shield'].includes(raw.kind))warnings.push({field:'equipment',entry:raw.id,code:'armour-unspecified',severity:'warning',message:'PA à préciser'});
 for(const word of raw.keywords)if(!catalogue.keywords?.some(def=>def.id===word.id))warnings.push({field:'equipment',entry:raw.id,code:'unknown-keyword',keywordId:word.id,severity:'warning',message:'Mot clé inconnu ; effet à arbitrer'});
 }
 return {coverage:'present',items,warnings};
}
export const validateEquipmentCollection=normalizeEquipment;
export function normalizeArmorLocations(armor={}){
 const value=x=>Number.isFinite(Number(x))&&x!==null&&x!==''?Math.max(0,Number(x)):0;
 return Object.fromEntries(HIT_LOCATIONS.map(({id})=>[id,value(armor?.[id]??(/^.*Arm$/u.test(id)?armor.arms:/^.*Leg$/u.test(id)?armor.legs:0))]));
}
export const calculateArmor=items=>Object.fromEntries(armourProtection(items).locations.map(location=>[location.id,location.ap]));
export function equipmentQualities(item){return (item?.keywords||[]).map(word=>({...word,...(word.parameter!==''&&Number.isFinite(Number(word.parameter))?{rating:Number(word.parameter)}:{})}));}

const categoryKey = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/gu,'').toLowerCase().trim();
const RANGED_CATEGORIES = new Set(['arbalete','arc','embarquee','entraves','explosif','explosifs','fronde','lancer','poudre noire','sarbacane','siege']);
/** Source item declares range and category; absence of an item is not a melee default. */
export function equipmentAttackContext(item, context = {}){
 if(!item||!['weapon','shield'].includes(item.kind))return null;
 const category=categoryKey(item.category),source=categoryKey(item.source||'');
 const knownCategory=WEAPON_GROUPS.get(foldedWeaponText(item.category));
 const selectedGroup=WEAPON_GROUPS.get(foldedWeaponText(context.weaponTrainingGroup||''));
 const chosenNature=categoryKey(context.weaponTrainingGroup||'');
 const engineeringNature=category==='ingenierie'?
  source.includes('armes a distance')?true:source.includes('armes corps a corps')?false:
  ['ingenierie tir','ingenierie projectiles'].includes(chosenNature)?true:
  ['ingenierie melee','ingenierie corps a corps'].includes(chosenNature)?false:null:null;
 const useSelection=category==='ingenierie'?engineeringNature!==null:!knownCategory&&Boolean(selectedGroup);
 const ranged=useSelection?category==='ingenierie'?engineeringNature===true:selectedGroup.kind==='ranged':Boolean(String(item.range||'').trim())||RANGED_CATEGORIES.has(category);
 return {ranged,equipmentId:item.id,source:'fiche-equipment',...(category==='ingenierie'&&engineeringNature===null&&!String(item.range||'').trim()?{needsWeaponNature:true}:{})};
}

/** Determine one/two-handed use from explicit participant data, then the checked catalogue. */
export function weaponHandsForParticipant(item, actor=null, {action=null, context={}}={}) {
 if(!item)return null;
 const itemId=item.id||item.baseId||action?.extensions?.fiche?.equipmentId;
 const explicit=[context.weaponHands,action?.extensions?.v5?.weaponHands,
  itemId&&actor?.extensions?.v5?.weaponHandsByEquipmentId?.[itemId],item.hands,
  item.grip==='one-hand'?1:item.grip==='two-hands'?2:undefined,
  item.oneHanded===true?1:item.oneHanded===false?2:undefined];
 for(const value of explicit){if(value===undefined||value===null||value==='')continue;const hands=Number(value);return hands===1||hands===2?hands:null;}
 const catalogue=getReferenceCatalogue(),catalogued=(catalogue.items||[]).find(row=>row.id===(item.baseId||item.id));
 // Exemplaire ancien dont le modèle a quitté le catalogue (passage V5) : ses propres nom et catégorie font foi, sans conversion.
 const known=catalogued||(item.kind==='weapon'&&(item.category||item.name)?item:null);
 if(!known||known.kind!=='weapon')return null;
 const folded=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const category=folded(known.category),name=folded(known.name),keywords=new Set((known.keywords||[]).map(row=>folded(typeof row==='string'?row:row?.id)));
 if(category==='deux-mains'||/hast/.test(category)||/\(\s*2\s*m\s*\)/i.test(known.name||''))return 2;
 if(keywords.has('pistolet')||/\bpistolet\b/.test(name))return 1;
 if(['lancer','fronde','fouet','entraves','explosif','explosifs'].some(value=>category.includes(value))
   ||/couteau de lancer|fronde|fouet|lasso|bombe|explosif/i.test(name))return 1;
 if(String(known.range||'').trim())return null;
 return 1;
}

const WEAPON_GROUPS = new Map([
 ['base', {kind:'melee', specialty:'Base'}], ['arme de base', {kind:'melee', specialty:'Base'}], ['armes de base', {kind:'melee', specialty:'Base'}],
 ['bagarre', {kind:'melee', specialty:'Bagarre'}], ['escrime', {kind:'melee', specialty:'Escrime'}], ['fleau', {kind:'melee', specialty:'Fléau'}],
 ['cavalerie', {kind:'melee', specialty:'Cavalerie'}], ['deux mains', {kind:'melee', specialty:'Deux mains'}],
 ['arme d hast', {kind:'melee', specialty:'Hast'}], ['armes d hast', {kind:'melee', specialty:'Hast'}], ['hast', {kind:'melee', specialty:'Hast'}],
 ['arc', {kind:'ranged', specialty:'Arc'}], ['arbalete', {kind:'ranged', specialty:'Arbalète'}], ['fronde', {kind:'ranged', specialty:'Fronde'}],
 ['lancer', {kind:'ranged', specialty:'Lancer'}], ['jet',{kind:'ranged',specialty:'Lancer'}], ['armes de jet',{kind:'ranged',specialty:'Lancer'}], ['arbalete de poing',{kind:'ranged',specialty:'Arbalète'}], ['armes a poudre',{kind:'ranged',specialty:'Poudre noire'}], ['poudre noire', {kind:'ranged', specialty:'Poudre noire'}], ['ingenierie', {kind:'ranged', specialty:'Ingénierie'}],
 ['ingenierie melee', {kind:'melee', specialty:'Ingénierie'}], ['ingenierie tir', {kind:'ranged', specialty:'Ingénierie'}], ['ingenierie corps a corps', {kind:'melee', specialty:'Ingénierie'}], ['ingenierie projectiles', {kind:'ranged', specialty:'Ingénierie'}],
 ['explosif', {kind:'ranged', specialty:'Explosifs'}], ['explosifs', {kind:'ranged', specialty:'Explosifs'}], ['sarbacane', {kind:'ranged', specialty:'Sarbacane'}],
 ['siege', {kind:'ranged', specialty:'Siège'}], ['embarquee', {kind:'ranged', specialty:'Embarquée'}], ['entraves', {kind:'ranged', specialty:'Entraves'}]
]);
const foldedWeaponText = value => categoryKey(value).replace(/[’']/g,' ').replace(/-/g,' ').replace(/\s+/g,' ').trim();
const weaponGroupFor = (value, weapon = null) => {
 const key=foldedWeaponText(value),known=WEAPON_GROUPS.get(key);if(!known)return null;
 if(key==='ingenierie'&&weapon){
  const nature=equipmentAttackContext(weapon);
  if(nature?.needsWeaponNature)return null;
  return {...known,kind:nature?.ranged?'ranged':'melee'};
 }
 return known;
};
export const weaponSkillGroupInfo = (value, weapon = null) => weaponGroupFor(value, weapon);
const weaponWords = () => getReferenceCatalogue()?.keywords || [];
const keywordType = id => weaponWords().find(word => word.id === id)?.type || '';
const skillSpec = skill => {
 const text=foldedWeaponText(skill?.specialization || skill?.specialty || String(skill?.name || '').match(/\(([^)]+)\)\s*$/)?.[1] || '');
 return ({'jet':'lancer','armes de jet':'lancer','lancer':'lancer','armes a poudre':'poudre noire','poudre':'poudre noire',
  'arbalete de poing':'arbalete','armes d hast':'hast','deux mains':'deux mains','bouclier':'parade',
  'projectiles a poudre':'poudre noire','arme a poudre':'poudre noire'}[text]||text);
};
const skillFamily = skill => categoryKey(skill?.group || String(skill?.name||'').match(/^([^()]+)\s*\(/)?.[1] || '');
const skillMatchesGroup = (skill, group) => skillFamily(skill)===(group?.kind==='ranged'?'projectiles':'corps a corps');
const itemKeywords = item => (item?.keywords||[]).map(row=>typeof row==='string'?row:row?.id).filter(Boolean);
const rangedSpecialtiesForWeapon = item => {
 const category=foldedWeaponText(item?.category),name=foldedWeaponText(item?.name),source=foldedWeaponText(item?.source);
 const keywords=itemKeywords(item);
 if(category==='ingenierie'&&(/lance feu|flamethrower/.test(name)||/lance feu/.test(source)))return ['lance flammes'];
 if(['siege','embarquee'].includes(category)){
  if(keywords.includes('a-poudre-noire'))return ['poudre noire','ingenierie'];
  return [];
 }
 if(keywords.includes('a-poudre-noire'))return ['poudre noire','ingenierie'];
 return [];
};
const skillHasAdvance = skill => {
 if(!skill||!Object.hasOwn(skill,'advances')||skill.advances===null||skill.advances===''||!Number.isFinite(Number(skill.advances)))return null;
 return Number(skill.advances)>0;
};
const bestAvailableSkill = (rows, predicate) => rows.filter(predicate).sort((left,right) => {
 const rank=value=>value===true?2:value===null?1:0;
 return rank(skillHasAdvance(right))-rank(skillHasAdvance(left)) || (Number(right.total??right.value??right.score)||0)-(Number(left.total??left.value??left.score)||0);
})[0]||null;
const skillCaracScore = (actor, skill) => {
 for(const raw of [skill?.total,skill?.value,skill?.score]){
  if(raw===null||raw===undefined||raw==='')continue;
  const score=Number(raw);if(Number.isFinite(score)&&score>=0)return score;
 }
 return null;
};
const hasScoreValue = value => value!==null&&value!==undefined&&value!==''&&Number.isSafeInteger(Number(value));
const hasManualActionScore = (actor,skill,action) => {
 if(!action?.extensions?.fiche?.skillId||!hasScoreValue(action.base))return false;
 if(action.extensions.fiche.skillId!==skill?.id)return false;
 if(action.extensions?.v5?.scoreIsCurrent===true)return true;
 const stored=action.extensions.fiche.syncedWeaponSkillScore;
 const source=stored??actor?.ficheSnapshot?.skills?.find(row=>row.id===skill?.id)?.total;
 const reference=source===null||source===undefined||source===''?skillCaracScore(actor,skill):Number(source);
 return reference===null||!Number.isFinite(reference)||Number(action.base)!==reference;
};
const scoreFor = (actor, skill, context, action = null) => {
 if(context?.weaponSkillScore!==undefined&&context.weaponSkillScore!==null&&context.weaponSkillScore!==''
   &&(!context.weaponSkillId||context.weaponSkillId===skill?.id||skill?.id==='mj-weapon-skill')){
  const value=Number(context.weaponSkillScore);return Number.isSafeInteger(value)&&value>=0?value:null;
 }
 const actionScore=action?.base;
 if(hasManualActionScore(actor,skill,action)){
  const value=Number(actionScore);if(Number.isSafeInteger(value)&&value>=0)return value;
 }
 return skillCaracScore(actor,skill);
};
const useScore = (target,score,skill) => {
 target.base=score;
 if(skill){const fiche={...(target.extensions?.fiche||{}),skillId:skill.id,skillName:skill.name||skill.nom||skill.id};target.extensions={...(target.extensions||{}),fiche};}
};
const advancesFor = (skill, context) => {
 if(context?.weaponAdvances!==undefined&&context?.weaponAdvances!==null&&context?.weaponAdvances!==''){
  const value=Number(context.weaponAdvances);return Number.isSafeInteger(value)&&value>=0?value>0:null;
 }
 return skillHasAdvance(skill);
};
const characteristicScore = (actor, code) => {
 const aliases=code==='CC'?['CC','cc']:['CT','ct'];
 const base=actor?.extensions?.v5?.baseCaracs||actor?.baseCaracs;
 for(const key of aliases){const raw=base?.[key]??actor?.caracs?.[key];if(raw===null||raw===undefined||raw==='')continue;const value=Number(raw);if(Number.isFinite(value)&&value>=0)return value;}
 return null;
};
const addQuality = (qualities, id, parameter='') => qualities.some(word=>word.id===id)?qualities:[...qualities,{id,parameter}];
const stripBeneficialQualities = qualities => qualities.filter(word => ['magique','magical'].includes(String(word.id).toLowerCase()) || word.talentOrigins?.length || keywordType(word.id) !== 'Atout d’arme' && keywordType(word.id) !== 'Atout d\'arme');

/**
 * Apply weapon-group rules to an action copy. Unknown training facts are returned as
 * unresolved receipts so callers cannot accidentally roll or apply an unsupported attack.
 */
export function applyWeaponSkillRules(actor, action, { weapon = null, context = {}, sourceQualities = null } = {}) {
 const unchanged={action:{...action,qualities:(sourceQualities||action?.qualities||[]).map(word=>typeof word==='string'?{id:word,parameter:''}:{...word})},unresolved:[],receipt:null};
 const fiche=action?.extensions?.fiche||{};
 const conjured=conjuredWeaponMetadata(actor,action);
 const key=conjured?.key||action?.extensions?.v5?.conjuredWeaponKey;
 const conjuredGroup=conjured?.group||CONJURED_WEAPON_GROUPS[key];
 const generatedProfile=conjured?.profile||action?.extensions?.v5?.conjuredWeaponProfile;
 const materializedGroup=conjuredGroup||generatedProfile?.trainingGroup||generatedProfile?.category||null;
 const legacyAethyric=conjured?.materialized===true&&/aethyrique/i.test(String(action?.note||action?.name||''));
 const isMaterialized=Boolean(conjured?.key||conjured?.profile||conjured?.spellContract?.effects?.conjureWeapon===true||legacyAethyric);
 const equipment=weapon||action?.extensions?.equipment||(isMaterialized?{id:`conjured:${key||'unknown'}`,kind:'weapon',name:generatedProfile?.name||action.note||key||'Arme conjurée',category:materializedGroup||'',range:'',keywords:(action.qualities||[]).map(row=>typeof row==='string'?{id:row}:row)}:null);
 if(!['attack','attaque'].includes(String(action?.type||'').toLowerCase())||!equipment)return unchanged;
 const itemKind=equipment.kind;
 if(itemKind!=='weapon')return unchanged;
 let qualities=unchanged.action.qualities;
 if(foldedWeaponText(equipment.name)==='epee de sport'){
  qualities=applyV5SportSwordQuality({weaponName:equipment.name,qualities}).qualities.map(id=>qualities.find(row=>row.id===id)||{id,parameter:''});
  unchanged.action.qualities=qualities;
 }
 const unresolved=[];
 const receipt={kind:'weapon-skill',equipmentId:equipment.id||fiche.equipmentId||null,group:null,skillId:null,trained:null,applied:[]};
 const hasExplicitTrainingFact=isMaterialized||context.weaponTrainingGroup||context.weaponTrainingSpecialty||context.weaponSkillId||context.weaponAdvances!==undefined&&context.weaponAdvances!==null&&context.weaponAdvances!==''||context.weaponSkillScore!==undefined&&context.weaponSkillScore!==''&&context.weaponSkillScore!==null||context.weaponMounted!==undefined||context.weaponHands!==undefined||fiche.skillId||fiche.weaponTrainingGroup;
 const declared=context.weaponTrainingGroup||fiche.weaponTrainingGroup||equipment.category;
 const sourceGroup=weaponGroupFor(equipment.category,equipment);
 let group=sourceGroup||weaponGroupFor(declared,equipment);
 if(isMaterialized&&conjured?.spellScoreImposed)return unchanged;
 // Les anciens objets de groupe Parade restent résolus (lien explicite ou non)
 // jusqu'à décision du MJ. Le groupe n'est plus proposé ni inféré pour les
 // nouveaux profils.
 if(!group&&foldedWeaponText(declared)==='parade')
  group={kind:'melee',specialty:'Parade',legacy:true};
 if(!group){if(fiche.bindingVersion!==1&&!hasExplicitTrainingFact)return unchanged;unresolved.push('Groupe d’arme manquant ou inconnu : le MJ doit préciser le groupe avant ce Test.');return {...unchanged,unresolved,receipt:{...receipt,missing:'group'}};}
 let skills=Array.isArray(actor?.skills)&&actor.skills.length?actor.skills:Array.isArray(actor?.ficheSnapshot?.skills)?actor.ficheSnapshot.skills:Array.isArray(actor?.skills)?actor.skills:null;
 const availableSkillRows=Array.isArray(skills)?skills:[];
 const rangedAlternatives=group?.kind==='ranged'?rangedSpecialtiesForWeapon(equipment):[];
 const linked=context.weaponSkillId||fiche.skillId;
 const linkedSkill=linked?availableSkillRows.find(skill=>skill.id===linked||skill.name===linked||skill.storageKey===linked):null;
 const manualRangedSpec=context.weaponTrainingSpecialty&&getReferenceCatalogue()?.skills?.find(skill=>skill.group==='Projectiles'&&foldedWeaponText(skill.specialization)===foldedWeaponText(context.weaponTrainingSpecialty))?.specialization;
 if(group?.kind==='ranged'&&!rangedAlternatives.length&&['siege','embarquee'].includes(foldedWeaponText(equipment.category))&&!context.weaponSkillId&&!fiche.skillId&&!manualRangedSpec){
  unresolved.push('Cette arme appartient à un groupe générique sans spécialité de tir déterminée : le MJ doit choisir une compétence Projectiles dans le sélecteur de résolution.');
  return {...unchanged,unresolved,receipt:{...receipt,missing:'weapon-training-specialty-required'}};
 }
 if(group?.kind==='ranged'&&rangedAlternatives.length){
  const candidates=availableSkillRows.filter(skill=>skillMatchesGroup(skill,{kind:'ranged'})&&rangedAlternatives.includes(skillSpec(skill)));
  const chosenCandidate=linkedSkill&&candidates.includes(linkedSkill)?linkedSkill
   :!linked?bestAvailableSkill(candidates,()=>true):null;
  if(chosenCandidate)group={...group,specialty:skillSpec(chosenCandidate),catalogueGroup:group.specialty};
  else if(manualRangedSpec&&rangedAlternatives.includes(skillSpec({specialty:manualRangedSpec})))group={...group,specialty:manualRangedSpec,catalogueGroup:group.specialty,trainingChoice:'explicit-mj-selection'};
 }
 if(group?.kind==='ranged'&&!rangedAlternatives.length&&['siege','embarquee'].includes(foldedWeaponText(equipment.category))&&linkedSkill&&skillMatchesGroup(linkedSkill,{kind:'ranged'}))
  group={...group,specialty:skillSpec(linkedSkill),catalogueGroup:group.specialty,trainingChoice:'explicit-mj-or-historical-link'};
 else if(group?.kind==='ranged'&&!rangedAlternatives.length&&['siege','embarquee'].includes(foldedWeaponText(equipment.category))&&manualRangedSpec)
  group={...group,specialty:manualRangedSpec,catalogueGroup:group.specialty,trainingChoice:'explicit-mj-selection'};
 if(isMaterialized&&conjuredGroup==='Base'&&key==='bastard-sword')group={...group,specialty:'Deux mains'};
 const hasMatchingSkillFact=availableSkillRows.some(skill=>skillMatchesGroup(skill,group)&&skillSpec(skill)===categoryKey(group.specialty));
 if(fiche.bindingVersion!==1&&!hasExplicitTrainingFact&&!hasMatchingSkillFact)return unchanged;
 receipt.group=group.specialty;
 const manualAdvances=Number(context.weaponAdvances),manualScore=Number(context.weaponSkillScore ?? (fiche.skillId&&hasScoreValue(action.base)?action.base:undefined));
 const hasManualAdvances=context.weaponAdvances!==undefined&&context.weaponAdvances!==null&&context.weaponAdvances!=='';
 const hasManualScore=context.weaponSkillScore!==undefined&&context.weaponSkillScore!==null&&context.weaponSkillScore!==''||Boolean(fiche.skillId&&hasScoreValue(action.base));
 const chosenId=context.weaponSkillId||fiche.skillId||null;
 const chosenReference=chosenId&&getReferenceCatalogue()?.skills?.find(skill=>skill.id===chosenId);
 const manualSpecialty=chosenReference?.specialization||manualRangedSpec||weaponGroupFor(context.weaponTrainingSpecialty,equipment)?.specialty||group.specialty;
 const skillRows=Array.isArray(skills)?skills:[];
 const listedChosen=chosenId?skillRows.find(skill=>skill.id===chosenId||skill.name===chosenId||skill.storageKey===chosenId):null;
 if(chosenId&&chosenReference&&!listedChosen&&(!hasManualAdvances||!hasManualScore)){
  const missing=!hasManualAdvances?'advances':'score';unresolved.push(missing==='advances'?'Les augmentations de la compétence choisie ne sont pas renseignées : le MJ doit les saisir.':'Le score de la compétence choisie est indisponible : le MJ doit le saisir.');
  return {...unchanged,unresolved,receipt:{...receipt,missing:missing==='advances'?'skill-advances':'skill-score'}};
 }
 if(Array.isArray(skills)&&hasManualAdvances&&hasManualScore&&Number.isSafeInteger(manualAdvances)&&manualAdvances>=0&&Number.isSafeInteger(manualScore)&&manualScore>=0){
  const manualSpec=manualSpecialty;
  const groupName=chosenReference?.group||(group.kind==='ranged'?'Projectiles':'Corps à corps');
  const manual={id:'mj-weapon-skill',name:chosenReference?.nom||`${groupName} (${manualSpec})`,group:groupName,specialty:manualSpec,total:manualScore,advances:manualAdvances,basic:chosenReference?.basic??false,status:'mj-confirmed'};
  skills=[...skills.filter(row=>row.id!=='mj-weapon-skill'),manual];
 }
 if(!Array.isArray(skills)&&hasManualAdvances&&hasManualScore&&Number.isSafeInteger(manualAdvances)&&manualAdvances>=0&&Number.isSafeInteger(manualScore)&&manualScore>=0){
  const manualSpec=manualSpecialty;
  const groupName=chosenReference?.group||(group.kind==='ranged'?'Projectiles':'Corps à corps');
  skills=[{id:'mj-weapon-skill',name:chosenReference?.nom||`${groupName} (${manualSpec})`,group:groupName,specialty:manualSpec,total:manualScore,advances:manualAdvances,basic:chosenReference?.basic??false,status:'mj-confirmed'}];
 }
 if(!skills){unresolved.push('Données de compétences et d’avancements de la fiche indisponibles : le MJ doit confirmer la maîtrise de cette arme.');return {...unchanged,unresolved,receipt:{...receipt,missing:'skill-advances'}};}
 let chosen=chosenId?(skills.find(skill=>skill.id===chosenId||skill.name===chosenId||skill.storageKey===chosenId)||((hasManualAdvances&&hasManualScore)?skills.find(skill=>skill.id==='mj-weapon-skill'):null)):skills.find(skill=>skill.id==='mj-weapon-skill')||null;
 const categoryName=foldedWeaponText(equipment.category||declared);
 const itemName=foldedWeaponText(equipment.name||action.note);
 const isCavalry=categoryName==='cavalerie';
 const isMainGauche=/\bmain gauche\b/.test(itemName);
 const isBastard=/\bepee batarde\b/.test(itemName);
 const isCavalryHammer=/marteau de cavalerie/.test(itemName);
 const isSabre=/\bsabre\b/.test(itemName);
 const mounted=typeof context.weaponMounted==='boolean'?context.weaponMounted:actor?.extensions?.v5?.mounted===true;
 const itemId=equipment.id||fiche.equipmentId;
 const persistedHands=actor?.extensions?.v5?.weaponHandsByEquipmentId?.[itemId];
 const nameHands=/\(\s*2\s*M\s*\)/i.test(equipment.name||action.note||'')?2:null;
 const defaultHands=nameHands??(isBastard||foldedWeaponText(equipment.category||declared)==='cavalerie'?1:0);
 const handsValue=context.weaponHands??action.extensions?.v5?.weaponHands??persistedHands??equipment.hands;
 const hands=Number(handsValue!==undefined&&handsValue!==null&&handsValue!==''?handsValue:defaultHands);
 let selectedSpec=skillSpec(chosen);
 if(!chosen&&!chosenId&&isCavalry&&!mounted&&(isSabre||hands===2)){
  const routeSpecs=isSabre?['base','escrime']:['deux mains','cavalerie'];
  const legalRoute=skill=>skillMatchesGroup(skill,{kind:'melee'})&&routeSpecs.includes(skillSpec(skill));
  const trainedRoute=bestAvailableSkill(skills,skill=>legalRoute(skill)&&skillHasAdvance(skill)===true);
  const defaultSpec=isSabre?'base':'deux mains';
  chosen=trainedRoute||bestAvailableSkill(skills,skill=>legalRoute(skill)&&skillSpec(skill)===defaultSpec);
  selectedSpec=skillSpec(chosen);
 }
 let effectiveGroup=group;
 let fallbackReason='';
 receipt.mounted=mounted;
 if(isCavalry&&!mounted){
  if(isCavalryHammer){const hasTwoHandSkill=skills.some(skill=>skillMatchesGroup(skill,{kind:'melee'})&&skillSpec(skill)==='deux mains');effectiveGroup=selectedSpec==='deux mains'||!chosen&&hasTwoHandSkill?{kind:'melee',specialty:'Deux mains'}:group;receipt.applied.push('cavalry-hammer-on-foot');if(effectiveGroup.specialty==='Deux mains')receipt.applied.push('two-handed-cavalry-on-foot');}
  else if(isSabre){effectiveGroup={kind:'melee',specialty:selectedSpec==='escrime'?'Escrime':'Base'};receipt.applied.push('sabre-on-foot');}
  else if(selectedSpec==='cavalerie'&&hands!==1){effectiveGroup=group;}
  else if(hands===2||selectedSpec==='deux mains'){effectiveGroup={kind:'melee',specialty:'Deux mains'};receipt.applied.push('two-handed-cavalry-on-foot');}
 else if(hands===1||selectedSpec==='base'){effectiveGroup={kind:'melee',specialty:'Base'};fallbackReason='improvised-cavalry';receipt.applied.push('single-handed-cavalry-improvised');}
  else {effectiveGroup={kind:'melee',specialty:'Base'};fallbackReason='improvised-cavalry';receipt.applied.push('single-handed-cavalry-improvised');}
 }
 if(isBastard&&hands===1) {effectiveGroup={kind:'melee',specialty:'Base'};qualities=addQuality(addQuality(qualities,'epuisante'),'lente');unchanged.action.qualities=qualities;receipt.applied.push('bastard-sword-one-handed');}
 receipt.hands=hands||null;
 if(isBastard&&hands===0){unresolved.push('Épée bâtarde : mains utilisées manquantes dans le catalogue, demander le choix du MJ.');return {...unchanged,unresolved,receipt:{...receipt,missing:'hands'}};}
 if(isMainGauche)effectiveGroup={kind:'melee',specialty:'Escrime'};
 if(isCavalry&&!mounted&&isSabre&&selectedSpec==='escrime')effectiveGroup={kind:'melee',specialty:'Escrime'};
 const chosenInMeleeFamily=chosen&&skillMatchesGroup(chosen,{kind:'melee'});
 const chosenReferenceRow=chosen&&getReferenceCatalogue()?.skills?.find(skill=>skill.id===chosen.id);
 let fencingWithBase=categoryName==='escrime'&&selectedSpec==='base'&&chosenInMeleeFamily&&(chosen.basic===true||chosenReferenceRow?.basic===true);
 const baseFallbackAllowed=categoryName==='escrime'||isMainGauche||isCavalry&&!mounted||isBastard&&hands===1;
 const legalBaseAlternative=selectedSpec==='base'&&baseFallbackAllowed;
 const legalCavalryAlternative=isCavalry&&!mounted&&(['cavalerie','deux mains'].includes(selectedSpec)||hands===2||isSabre&&['base','escrime'].includes(selectedSpec)||isCavalryHammer&&selectedSpec==='cavalerie');
 const legalBastardAlternative=isBastard&&hands===1&&selectedSpec==='deux mains';
 const explicitMainGaucheSkill=isMainGauche&&chosen&&chosenInMeleeFamily&&Boolean(context.weaponSkillId||fiche.skillId);
 if(chosen&&chosenInMeleeFamily&&effectiveGroup.kind==='melee'&&!legalBaseAlternative&&!legalCavalryAlternative&&!legalBastardAlternative&&!explicitMainGaucheSkill&&selectedSpec!==foldedWeaponText(effectiveGroup.specialty)){
  receipt.applied.push('stale-melee-skill-link-fell-back-to-cc');chosen=null;selectedSpec='';
 }
 receipt.group=effectiveGroup.specialty;
 if(group.trainingChoice)receipt.trainingChoice=group.trainingChoice;
 if(fallbackReason==='improvised-cavalry'){
  const improvised=getReferenceCatalogue()?.items?.find(item=>item.kind==='weapon'&&item.name==='Arme improvisée');
  if(!improvised){unresolved.push('Profil d’arme improvisée absent du catalogue : le MJ doit confirmer Dégâts et Défauts.');return {...unchanged,unresolved,receipt:{...receipt,missing:'improvised-profile'}};}
  const damage=normalizeDamageFields({damage:improvised.damage,damageFormula:improvised.damageFormula});
  unchanged.action={...unchanged.action,...damage,reach:improvised.reach||unchanged.action.reach};
  const profileQualities=equipmentQualities(improvised);unchanged.action.sourceQualities=profileQualities.map(word=>({...word}));
  if(action.contactImprovised!==true){qualities=profileQualities;unchanged.action.qualities=qualities;}
  receipt.applied.push('improvised-weapon-profile');
 }
 const exactSkillPredicate=skill=>skillMatchesGroup(skill,effectiveGroup)&&skillSpec(skill)===foldedWeaponText(effectiveGroup.specialty)&&!skill.status?.match(/open|ambiguous|unresolved/);
 const baseFallbackPredicate=skill=>effectiveGroup.kind==='melee'&&baseFallbackAllowed&&skillMatchesGroup(skill,{kind:'melee'})&&skillSpec(skill)==='base'&&skillHasAdvance(skill)!==null;
 const exactSkill=bestAvailableSkill(skills,skill=>skillHasAdvance(skill)===true&&exactSkillPredicate(skill))
  ||bestAvailableSkill(skills,exactSkillPredicate)
  ||bestAvailableSkill(skills,skill=>skillHasAdvance(skill)===true&&baseFallbackPredicate(skill))
  ||bestAvailableSkill(skills,baseFallbackPredicate);
 let usable=chosen&&skillMatchesGroup(chosen,effectiveGroup)&&skillSpec(chosen)===foldedWeaponText(effectiveGroup.specialty)?chosen
  :isMainGauche&&selectedSpec==='parade'&&chosen?chosen:exactSkill;
 if(isCavalry&&!mounted&&isCavalryHammer&&selectedSpec==='deux mains')usable=chosen&&skillMatchesGroup(chosen,{kind:'melee'})&&skillSpec(chosen)==='deux mains'?chosen:skills.find(skill=>skillMatchesGroup(skill,{kind:'melee'})&&skillSpec(skill)==='deux mains');
 if(isCavalry&&!mounted&&hands===2&&!isCavalryHammer&&!isSabre&&selectedSpec==='deux mains')usable=chosen&&skillMatchesGroup(chosen,{kind:'melee'})&&skillSpec(chosen)==='deux mains'?chosen:skills.find(skill=>skillMatchesGroup(skill,{kind:'melee'})&&skillSpec(skill)==='deux mains');
 if(isCavalry&&!mounted&&hands===1&&!isCavalryHammer&&!isSabre)usable=chosen&&skillMatchesGroup(chosen,{kind:'melee'})&&skillSpec(chosen)==='base'?chosen:skills.find(skill=>skillMatchesGroup(skill,{kind:'melee'})&&skillSpec(skill)==='base');
 if(isBastard&&hands===1)usable=chosen&&skillMatchesGroup(chosen,{kind:'melee'})&&skillSpec(chosen)==='base'?chosen:skills.find(skill=>skillMatchesGroup(skill,{kind:'melee'})&&skillSpec(skill)==='base');
 if(explicitMainGaucheSkill||isMainGauche&&skillMatchesGroup(chosen,{kind:'melee'})&&['base','parade'].includes(selectedSpec))usable=chosen;
 if(categoryName==='escrime'&&usable&&skillSpec(usable)==='base')fencingWithBase=true;
 if(group.kind==='ranged'){
  const isCrossbowOrThrowing=['arbalete','lancer'].includes(categoryName);
  const isPowderOrExplosive=['poudre noire','explosif','explosifs'].includes(categoryName);
  const isEngineering=categoryName==='ingenierie';
  const chosenSpecialty=selectedSpec;
  const engineering=skills.find(skill=>skillMatchesGroup(skill,{kind:'ranged'})&&skillSpec(skill)==='ingenierie');
  const powder=skills.find(skill=>skillMatchesGroup(skill,{kind:'ranged'})&&skillSpec(skill)==='poudre noire');
  const chosenInRangedFamily=chosen&&skillMatchesGroup(chosen,{kind:'ranged'});
  const explicitAlternate=chosenInRangedFamily&&(isPowderOrExplosive&&chosenSpecialty==='ingenierie'||isEngineering&&chosenSpecialty==='poudre noire');
  if(chosen&&(!chosenInRangedFamily||chosenSpecialty!==foldedWeaponText(effectiveGroup.specialty))&&!explicitAlternate){unresolved.push('La compétence confirmée ne correspond pas au groupe de cette arme : le MJ doit choisir la spécialité appropriée.');return {...unchanged,unresolved,receipt:{...receipt,missing:'skill-group-mismatch'}};}
  if(isEngineering&&chosenSpecialty==='poudre noire'&&chosenInRangedFamily){usable=chosen;if(skillHasAdvance(chosen)===true){unchanged.slModifier=-2;receipt.applied.push('powder-skill-engineering-minus-2-dr');}}
  if(isPowderOrExplosive&&chosenSpecialty==='ingenierie'&&chosenInRangedFamily)usable=chosen;
  const trainedState=advancesFor(usable,context);
  if(usable&&trainedState===null){unresolved.push('Les augmentations de cette compétence ne sont pas renseignées : le MJ doit confirmer les données de fiche.');return {...unchanged,unresolved,receipt:{...receipt,missing:'skill-advances'}};}
  if(usable&&trainedState===true){
   receipt.trained=true;receipt.skillId=usable.id;
   const score=scoreFor(actor,usable,context,action);if(score===null){unresolved.push('Le score de la compétence de groupe est indisponible : le MJ doit actualiser ou saisir la valeur de fiche.');return {...unchanged,unresolved,receipt:{...receipt,missing:'skill-score'}};}
   useScore(unchanged.action,score,usable);unchanged.action.attr='CT';
   return {...unchanged,receipt};
  }
  if(isCrossbowOrThrowing){
   const ct=characteristicScore(actor,'CT');if(ct===null){unresolved.push('Capacité de Tir absente : le MJ doit saisir la caractéristique avant ce tir.');return {...unchanged,unresolved,receipt:{...receipt,missing:'ct'}};}
   unchanged.action.base=ct;unchanged.action.attr='CT';unchanged.slModifier=-1;receipt.trained=false;receipt.applied.push('ballistic-skill-minus-1-dr');return {...unchanged,receipt};
  }
  if(!usable&&skills.length&&!['present'].includes(actor?.ficheSnapshot?.coverage?.skills)&&!actor?.ficheSkillsComplete){unresolved.push('La liste des compétences de la fiche est incomplète : le MJ doit confirmer la spécialité avant ce tir.');return {...unchanged,unresolved,receipt:{...receipt,missing:'skill-coverage'}};}
  if(categoryName==='sarbacane'){
   if(chosen&&selectedSpec!=='sarbacane'){unresolved.push('La compétence confirmée ne correspond pas au groupe Sarbacane : le MJ doit choisir la spécialité appropriée.');return {...unchanged,unresolved,receipt:{...receipt,missing:'skill-group-mismatch'}};}
   if(usable&&skillHasAdvance(usable)===null){unresolved.push('Les augmentations de cette compétence ne sont pas renseignées : le MJ doit confirmer les données de fiche.');return {...unchanged,unresolved,receipt:{...receipt,missing:'skill-advances'}};}
   const ct=characteristicScore(actor,'CT');if(ct===null){unresolved.push('Capacité de Tir absente : le MJ doit saisir la caractéristique avant ce tir.');return {...unchanged,unresolved,receipt:{...receipt,missing:'ct'}};}
   unchanged.action.base=ct;unchanged.action.attr='CT';unchanged.action.qualities=addQuality(qualities,'dangereuse');receipt.trained=false;receipt.applied.push('blowpipe-ct-dangerous');return {...unchanged,receipt};
  }
  unresolved.push('Aucune augmentation dans la spécialité de tir appropriée : cette attaque est interdite.');
  return {...unchanged,unresolved,receipt:{...receipt,missing:'ranged-training'}};
 }
 // Fencing with Basic is explicitly permitted, but never grants weapon qualities.
 const chosenNowInMeleeFamily=chosen&&skillMatchesGroup(chosen,{kind:'melee'});
 if(fencingWithBase&&chosen){usable=chosen;}
 const meleeAlternative=chosenNowInMeleeFamily&&(explicitMainGaucheSkill||isMainGauche&&['base','parade'].includes(selectedSpec)||isCavalry&&!mounted&&hands===1&&selectedSpec==='cavalerie'||isCavalry&&!mounted&&hands===2&&selectedSpec==='cavalerie'||isCavalry&&!mounted&&isCavalryHammer&&selectedSpec==='cavalerie'||isCavalry&&!mounted&&isSabre&&['cavalerie','base','escrime'].includes(selectedSpec)||isBastard&&hands===1&&selectedSpec==='deux mains');
 if(chosen&&(!chosenNowInMeleeFamily||selectedSpec!==foldedWeaponText(effectiveGroup.specialty))&&!fencingWithBase&&!meleeAlternative){unresolved.push('La compétence confirmée ne correspond pas au groupe de cette arme : le MJ doit choisir la spécialité appropriée.');return {...unchanged,unresolved,receipt:{...receipt,missing:'skill-group-mismatch'}};}
 if(usable&&advancesFor(usable,context)===null){unresolved.push('Les augmentations de cette compétence ne sont pas renseignées : le MJ doit confirmer les données de fiche.');return {...unchanged,unresolved,receipt:{...receipt,missing:'skill-advances'}};}
 const trained=usable&&advancesFor(usable,context)===true;
 if(explicitMainGaucheSkill&&usable)receipt.skillId=usable.id;
 if(fencingWithBase&&trained)receipt.applied.push('fencing-with-basic');
 if(trained){
  receipt.trained=true;receipt.skillId=usable.id;
  if(isBastard&&hands===1)unchanged.action.qualities=addQuality(addQuality(qualities,'epuisante'),'lente');
  if(categoryName==='cavalerie'&&!mounted&&isSabre&&skillSpec(usable)==='base'){
   unchanged.action.qualities=qualities.map(word=>word.id==='entaille'?{...word,parameter:'2'}:word);
   receipt.applied.push('sabre-basic-slash-2');
  }
  if(isMainGauche&&!['escrime','parade'].includes(skillSpec(usable))){
   unchanged.action.qualities=qualities.filter(word=>word.id!=='defensive');receipt.applied.push('main-gauche-as-dagger');
  }
  const score=scoreFor(actor,usable,context,action);if(score===null){unresolved.push('Le score de la compétence de groupe est indisponible : le MJ doit actualiser ou saisir la valeur de fiche.');return {...unchanged,unresolved,receipt:{...receipt,missing:'skill-score'}};}
  useScore(unchanged.action,score,usable);unchanged.action.attr='CC';if(fencingWithBase)unchanged.action.qualities=stripBeneficialQualities(qualities);
  return {...unchanged,receipt};
 }
 const cc=characteristicScore(actor,'CC');
 if(cc===null){unresolved.push('Capacité de Combat absente : le MJ doit saisir la caractéristique avant cette attaque.');return {...unchanged,unresolved,receipt:{...receipt,missing:'cc'}};}
 unchanged.action.base=cc;unchanged.action.attr='CC';unchanged.action.qualities=stripBeneficialQualities(qualities);receipt.trained=false;receipt.applied.push('untrained-melee-cc-without-benefits');
 if(unchanged.action.extensions?.fiche?.skillId){const fiche={...unchanged.action.extensions.fiche};delete fiche.skillId;delete fiche.skillName;unchanged.action.extensions={...unchanged.action.extensions,fiche};}
 if(effectiveGroup.specialty==='Fléau')unchanged.action.qualities=addQuality(unchanged.action.qualities,'dangereuse');
 if(isMainGauche)unchanged.action.qualities=unchanged.action.qualities.filter(word=>word.id!=='defensive');
 if(!usable&&actor?.ficheSnapshot?.coverage?.skills!=='present'&&!actor?.ficheSkillsComplete){unresolved.push('La liste des compétences ou des augmentations de la fiche est incomplète : le MJ doit confirmer la maîtrise de cette arme.');return {...unchanged,unresolved,receipt:{...receipt,missing:'skill-coverage'}};}
 return {...unchanged,receipt};
}

export function ammunitionCompatibility(weapon,ammunition){
 if(!weapon||weapon.kind!=='weapon'||!ammunition||ammunition.kind!=='ammunition')return {status:'incompatible',reason:'objet-non-compatible'};
 const category=categoryKey(weapon.category),ammoCategory=categoryKey(ammunition.category);
 const ranged=equipmentAttackContext(weapon)?.ranged;
 if(!ranged)return {status:'incompatible',reason:'arme-non-distance'};
 if(ammoCategory==='poudre noire'&&['poudre noire','ingenierie'].includes(category)){
  const name=foldedWeaponText(ammunition.name),ammoType=/grenaille/.test(name)?'grenaille':/improvise/.test(name)?'projectile improvisé':/balles?|bullets?/.test(name)?'balle':'';
  const isBlunderbuss=/tromblon/.test(foldedWeaponText(weapon.name||weapon.baseId));
  if(!ammoType)return {status:'incompatible',reason:'munition-poudre-noire-inconnue'};
  const check=canUseV5PowderAmmunition({weaponGroup:weapon.category,ammunitionType:ammoType,isBlunderbuss});
  return check.allowed?{status:'compatible'}:{status:'incompatible',reason:'munition-incompatible-avec-arme-a-poudre'};
 }
 if(!category||!ammoCategory||!RANGED_CATEGORIES.has(category))return {status:'manual',reason:'compatibilite-munition-a-arbitrer'};
 return category===ammoCategory?{status:'compatible'}:{status:'incompatible',reason:'categories-incompatibles'};
}

export function mergeEquipmentQualities(weapon,ammunition){
 const qualities=[],sources=[],seen=new Set();
 for(const item of [weapon,ammunition].filter(Boolean)){for(const word of equipmentQualities(item)){sources.push({equipmentId:item.id,kind:item.kind,keywordId:word.id,parameter:word.parameter});if(!seen.has(word.id)){seen.add(word.id);qualities.push(word);}}}
 return {qualities,sources};
}
const locationId=context=>{
 if(HIT_LOCATIONS.some(l=>l.id===context.location))return context.location;
 const location=context.location||{};if(location.key==='HEAD')return 'head';if(location.key==='BODY')return 'body';
 if(location.key==='ARM')return location.side==='left'?'leftArm':location.side==='right'?'rightArm':null;
 if(location.key==='LEG')return location.side==='left'?'leftLeg':location.side==='right'?'rightLeg':null;return null;
};
const shieldCoversLocation=(context,id)=>{
 if(context.shieldAttached!==true)return true;
 if(id==='head'||id==='body')return true;
 if(!['leftArm','rightArm'].includes(id))return false;
 // The rule names the off arm, so the caller must supply which side that is.
 const offHandSide=context.nonDominantArmSide;
 return offHandSide===id.slice(0,-3);
};
const supportedConditional = id => contracts.entries.find(w=>w.id===id);
/** Effective armour for a supplied hit context. Shield never enters permanent PA. */
export function locationProtection(target,context={}){
 const id=locationId(context),warnings=[],manual=[],evaluatedKeywords=new Set();if(!id){const override=Number(context.manualAp);if(context.manualAp!==undefined&&context.manualAp!==null&&Number.isFinite(override)&&override>=0)return {location:null,ap:override,baseAp:null,shieldAp:0,counted:[],ignored:[],manual:[],warnings,evaluatedKeywords:[],arbitrated:true};return {ap:null,baseAp:null,shieldAp:0,counted:[],ignored:[],manual:['localisation-requise'],warnings};}
 const hasEquipment=Array.isArray(target?.equipment)&&target.equipment.some(i=>i.kind==='armour'||i.kind==='shield');
 const armor=target?.armorLocations??target?.armor??{};
 const protection=hasEquipment?armourProtection(target.equipment):null;
 const location=protection?.locations.find(row=>row.id===id);
 let counted=[],ignored=location?.ignored.map(row=>({...row}))??[];
 let baseAp=location?.ap??normalizeArmorLocations(armor)[id];
 // B11 : les PA physiques hors possessions sont un fait MJ, conservé séparément des pièces rendues.
 const retained=target?.extensions?.v5?.divineConfiscations?.at(-1)?.retainedArmor?.[id];if(protection&&Number.isSafeInteger(retained)&&retained>=0)baseAp+=retained;
 let ap=baseAp;
 const attackRoll=Number(context.attackRoll),hitRoll=Number(context.hitLocationRoll??context.location?.roll);
 const attackWords=(context.qualities||[]).map(w=>resolveKeyword(typeof w==='string'?w:w.id)?.id??(typeof w==='string'?w:w.id));
 let criticalIgnored=false;
 for(const sourceItem of location?.counted||[]){let include=true;const itemDamage=Number(target?.extensions?.v5?.armorDamageByItem?.[sourceItem.id])||0;const item={...sourceItem,ap:Math.max(0,sourceItem.ap-itemDamage)};const known=item.keywords.map(w=>w.id);
 if((context.ignoreMetalArmour===true||context.ignoreMetalArmour==='non-magical'&&!/magique/i.test(String(item.category||'')))&&/mail|plate|gromril|ithilmar|metal/i.test(String(item.category||item.name||''))){include=false;ignored.push({item,reason:context.ignoreMetalArmour===true?'Warp Blade : les PA de cette pièce métallique sont ignorés':'Décharge électrique : les PA de cette pièce métallique non magique sont ignorés'});}
 for(const keywordId of known)evaluatedKeywords.add(keywordId);
 for(const keywordId of known)if(!resolveKeyword(keywordId))manual.push(`effet-inconnu:${keywordId}`);
 for(const keywordId of known.filter(word=>['flexible','partielle','points-faibles','impenetrable'].includes(word))){
  const source=resolveKeyword(keywordId);const baseline=supportedConditional(keywordId);
  if(!source||!baseline||source.effect!==baseline.effect||source.edition!==baseline.edition){manual.push(`effet-non-couvert:${keywordId}`);continue;}
  if(keywordId==='partielle'){if(!Number.isInteger(hitRoll)||hitRoll<1||hitRoll>100)manual.push('jet-localisation-requis:partielle');else if(hitRoll%2===0){include=false;ignored.push({item,reason:'Partielle : localisation paire'});}}
  if(keywordId==='points-faibles'){if(context.critical===undefined)manual.push('contexte-critique-requis:points-faibles');else if(context.critical&&attackWords.includes('empaleuse')){include=false;ignored.push({item,reason:'Points faibles : critique Empaleuse'});}}
  if(keywordId==='impenetrable'&&context.critical){if(!Number.isInteger(attackRoll)||attackRoll<1||attackRoll>100)manual.push('jet-attaque-requis:impenetrable');else if(attackRoll%2!==0)criticalIgnored=true;}
 }
 if(known.some(key=>(context.ignoredArmourFlaws||[]).includes(key))){include=false;ignored.push({item,reason:'Talent : armure ignorée ('+known.filter(key=>context.ignoredArmourFlaws.includes(key)).join(', ')+')'});}
 if(include)counted.push(item);
 }
 if(location)ap=counted.reduce((sum,item)=>sum+item.ap,0)+(Number.isSafeInteger(retained)&&retained>=0?retained:0);
 if(location?.ignored.some(row=>row.item.ap===null))manual.push('pa-a-preciser');
 let shieldAp=0,shield=null;
 const shields=protection?.shields||[];
 if(context.shieldId){shield=shields.find(item=>item.id===context.shieldId)||null;if(!shield)manual.push('bouclier-introuvable');
  else if(target?.extensions?.v5?.paviseDeploymentByItemId?.[shield.id]?.status==='planted'){shieldAp=0;}
  else if(context.shieldAvailable===false||target?.extensions?.shieldUnavailable?.includes?.(shield.id))warnings.push('Bouclier indisponible dans cette scène');
  else if(context.shieldAvailable !== true)manual.push('disponibilite-bouclier-requise');
  else if(context.opposedWithShield===true){
   if(context.defenseProvided!==true)manual.push('jet-opposition-requis:bouclier');
   if(typeof context.ranged!=='boolean')manual.push('type-attaque-requis:bouclier');
   const v5Shield=shield.keywords.some(word=>word.id==='bouclier');
   if(v5Shield){
    evaluatedKeywords.add('bouclier');
    if(!Number.isSafeInteger(shield.ap)||shield.ap<0)manual.push('protection-bouclier-a-preciser');
    else if(context.defenseProvided===true&&typeof context.ranged==='boolean'){
     shield={...shield,ap:Math.max(0,shield.ap-(Number(target?.extensions?.v5?.armorDamageByItem?.[shield.id])||0))};shieldAp=shield.ap;
     if(context.shieldAttached===true&&!['head','body'].includes(id)&&!shieldCoversLocation(context,id)){
      shieldAp=0;
      if(['leftArm','rightArm'].includes(id)&&!['left','right'].includes(context.nonDominantArmSide))manual.push('bras-non-directeur-requis:bouclier-attache');
     }
     // V5 : 2 PA ou plus autorisent l’opposition aux tirs à toute portée,
     // sans condition de ligne de vue. La ligne de vue reste une règle V4.
     if(context.ranged===true&&shield.ap<2){shieldAp=0;manual.push('bouclier-projectile-contexte-requis');}
    }
   }else{
   evaluatedKeywords.add('protectrice');
   const definition=resolveKeyword('protectrice'),baseline=supportedConditional('protectrice');
   if(!definition||definition.effect!==baseline?.effect||definition.edition!==baseline?.edition)manual.push('effet-non-couvert:protectrice');
   const word=shield.keywords.find(w=>w.id==='protectrice'),rating=Number(word?.parameter);
   if(!word||!Number.isSafeInteger(rating)||rating<0||rating>100||word.parameter.trim()==='')manual.push('protection-bouclier-a-preciser');
   else if(context.defenseProvided===true && typeof context.ranged==='boolean'){
    shieldAp=rating;
    if(context.ranged===true&&(rating<2||context.lineOfSight!==true)){shieldAp=0;manual.push('bouclier-projectile-contexte-requis');}
   }
   }
  }
  else if(context.opposedWithShield===undefined)manual.push('usage-bouclier-requis');
 }
 // L’équipement de fiche reste intact ; la dégradation physique appartient au combat et les PA magiques aux couches
 // (`extensions.v5.magicAp`). Avec `armor` seul, la valeur est déjà effective (couches et dégradation comprises).
 if(protection||target?.armorLocations)ap=Math.max(0,ap+(Number(target?.extensions?.v5?.magicAp?.[id])||0)-(Number(target?.extensions?.v5?.armorDamage?.[id])||0));
 // PA magiques sans cumul avec l'armure (Coruscation) et PA conditionnels à la nature de l'attaque (Bouclier céruléen : métal).
 ap=Math.max(ap,Number(target?.extensions?.v5?.magicApFloor?.[id])||0);
 const conditional=conditionalArmour(target,context.nature||{});
 if(conditional.unknown.length)manual.push('PA magiques conditionnels : préciser '+conditional.unknown.map(natureTagLabel).join(', ')+'.');
 ap+=conditional.bonus;
 // Planted pavise (Up in Arms): the declared facing and position are MJ facts.
 // Its printed Shield 5 is a floor for the covered hit, never extra PA stacked
 // on top of armour. The panel requires an explicit facing and attack direction.
 const paviseItem=target?.equipment?.find(item=>item.id===context.paviseId&&item.kind==='shield'&&/pavise|pavois/i.test(item.name||item.id||''));
 const deployment=paviseItem&&target?.extensions?.v5?.paviseDeploymentByItemId?.[context.paviseId];
 const paviseFacing=deployment?.facing, attackDirection=context.attackDirection;
 const paviseCovered=deployment?.status==='planted' && ['north','south','east','west'].includes(paviseFacing)
  && attackDirection===paviseFacing && Number(context.paviseDistanceYards)<=1
  && (context.ranged===true || (context.paviseMeleeFirstTurn===true && context.ranged===false));
 if(paviseCovered)ap=Math.max(ap,5);
 if(attackWords.includes('perforante')){const word=resolveKeyword('perforante'),source=talentQualityRegistry.qualityContracts.find(q=>q.id==='perforante');evaluatedKeywords.add('perforante');if(word?.effect!==source?.effect||word?.edition!==source?.edition||word?.source!==source?.source)manual.push('effet-non-couvert:perforante');else ap=Math.max(0,ap-2);}
 if(context.manualAp!==undefined&&context.manualAp!==null){const override=Number(context.manualAp);if(Number.isFinite(override)&&override>=0)return {location:id,ap:override,baseAp,shieldAp,counted,ignored,shield,criticalIgnored,manual:[],warnings,evaluatedKeywords:context.critical&&evaluatedKeywords.has('impenetrable')?['impenetrable']:[],arbitrated:true};}
 return {location:id,ap:manual.length?null:ap+shieldAp,baseAp,shieldAp,counted,ignored,shield,criticalIgnored,manual:[...new Set(manual)],warnings,evaluatedKeywords:[...evaluatedKeywords]};
}
