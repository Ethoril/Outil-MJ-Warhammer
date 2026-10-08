/** Pure fiche equipment contract, copied functions regenerated from the source project. */
import { HIT_LOCATIONS, armourProtection, equipmentFormula, armourLayer, validateEquipmentItem } from '../data/shared/fiche/equipment.js';
import contracts from '../data/keyword-engine-contracts.json' with { type: 'json' };
import { getReferenceCatalogue, resolveKeyword } from './reference-catalog.js';
export { HIT_LOCATIONS, armourProtection, equipmentFormula, armourLayer, validateEquipmentItem };
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
const RANGED_CATEGORIES = new Set(['arbalete','arc','embarquee','entraves','explosif','explosifs','fronde','ingenierie','lancer','poudre noire','sarbacane','siege']);
/** Source item declares range and category; absence of an item is not a melee default. */
export function equipmentAttackContext(item){
 if(!item||!['weapon','shield'].includes(item.kind))return null;
 return {ranged:Boolean(String(item.range||'').trim())||RANGED_CATEGORIES.has(categoryKey(item.category)),equipmentId:item.id,source:'fiche-equipment'};
}

export function ammunitionCompatibility(weapon,ammunition){
 if(!weapon||weapon.kind!=='weapon'||!ammunition||ammunition.kind!=='ammunition')return {status:'incompatible',reason:'objet-non-compatible'};
 const category=categoryKey(weapon.category),ammoCategory=categoryKey(ammunition.category);
 const ranged=equipmentAttackContext(weapon)?.ranged;
 if(!ranged)return {status:'incompatible',reason:'arme-non-distance'};
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
const supportedConditional = id => contracts.entries.find(w=>w.id===id);
/** Effective armour for a supplied hit context. Shield never enters permanent PA. */
export function locationProtection(target,context={}){
 const id=locationId(context),warnings=[],manual=[];if(!id)return {ap:null,baseAp:null,shieldAp:0,counted:[],ignored:[],manual:['localisation-requise'],warnings};
 const hasEquipment=Array.isArray(target?.equipment)&&target.equipment.some(i=>i.kind==='armour'||i.kind==='shield');
 const armor=target?.armorLocations??target?.armor??{};
 const protection=hasEquipment?armourProtection(target.equipment):null;
 const location=protection?.locations.find(row=>row.id===id);
 let counted=[],ignored=location?.ignored.map(row=>({...row}))??[];
 let baseAp=location?.ap??normalizeArmorLocations(armor)[id];let ap=baseAp;
 const attackRoll=Number(context.attackRoll),hitRoll=Number(context.hitLocationRoll??context.location?.roll);
 const attackWords=(context.qualities||[]).map(w=>resolveKeyword(typeof w==='string'?w:w.id)?.id??(typeof w==='string'?w:w.id));
 let criticalIgnored=false;
 for(const item of location?.counted||[]){let include=true;const known=item.keywords.map(w=>w.id);
 for(const keywordId of known)if(!resolveKeyword(keywordId))manual.push(`effet-inconnu:${keywordId}`);
 for(const keywordId of known.filter(word=>['flexible','partielle','points-faibles','impenetrable'].includes(word))){
  const source=resolveKeyword(keywordId);const baseline=supportedConditional(keywordId);
  if(!source||!baseline||source.effect!==baseline.effect||source.edition!==baseline.edition){manual.push(`effet-non-couvert:${keywordId}`);continue;}
  if(keywordId==='partielle'){if(!Number.isInteger(hitRoll)||hitRoll<1||hitRoll>100)manual.push('jet-localisation-requis:partielle');else if(hitRoll%2===0){include=false;ignored.push({item,reason:'Partielle : localisation paire'});}}
  if(keywordId==='points-faibles'){if(context.critical===undefined)manual.push('contexte-critique-requis:points-faibles');else if(context.critical&&attackWords.includes('empaleuse')){include=false;ignored.push({item,reason:'Points faibles : critique Empaleuse'});}}
  if(keywordId==='impenetrable'&&context.critical){if(!Number.isInteger(attackRoll)||attackRoll<1||attackRoll>100)manual.push('jet-attaque-requis:impenetrable');else if(attackRoll%2!==0)criticalIgnored=true;}
 }
 if(include)counted.push(item);
 }
 if(location)ap=counted.reduce((sum,item)=>sum+item.ap,0);
 if(location?.ignored.some(row=>row.item.ap===null))manual.push('pa-a-preciser');
 let shieldAp=0,shield=null;
 const shields=protection?.shields||[];
 if(context.shieldId){shield=shields.find(item=>item.id===context.shieldId)||null;if(!shield)manual.push('bouclier-introuvable');
  else if(context.shieldAvailable===false||target?.extensions?.shieldUnavailable?.includes?.(shield.id))warnings.push('Bouclier indisponible dans cette scène');
  else if(context.shieldAvailable !== true)manual.push('disponibilite-bouclier-requise');
  else if(context.opposedWithShield===true){
   if(context.defenseProvided!==true)manual.push('jet-opposition-requis:bouclier');
   if(typeof context.ranged!=='boolean')manual.push('type-attaque-requis:bouclier');
   const definition=resolveKeyword('protectrice'),baseline=supportedConditional('protectrice');
   if(!definition||definition.effect!==baseline?.effect||definition.edition!==baseline?.edition)manual.push('effet-non-couvert:protectrice');
   const word=shield.keywords.find(w=>w.id==='protectrice'),rating=Number(word?.parameter);
   if(!word||!Number.isSafeInteger(rating)||rating<0||rating>100||word.parameter.trim()==='')manual.push('protection-bouclier-a-preciser');
   else if(context.defenseProvided===true && typeof context.ranged==='boolean'){
    shieldAp=rating;
    if(context.ranged===true&&(rating<2||context.lineOfSight!==true)){shieldAp=0;manual.push('bouclier-projectile-contexte-requis');}
   }
  }
  else if(context.opposedWithShield===undefined)manual.push('usage-bouclier-requis');
 }
 if(context.manualAp!==undefined&&context.manualAp!==null){const override=Number(context.manualAp);if(Number.isFinite(override)&&override>=0)return {location:id,ap:override,baseAp,shieldAp,counted,ignored,shield,criticalIgnored,manual:[],warnings,arbitrated:true};}
 return {location:id,ap:manual.length?null:ap+shieldAp,baseAp,shieldAp,counted,ignored,shield,criticalIgnored,manual:[...new Set(manual)],warnings};
}
