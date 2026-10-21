/** Pure fiche equipment contract, copied functions regenerated from the source project. */
import { HIT_LOCATIONS, armourProtection, equipmentFormula, armourLayer, validateEquipmentItem } from '../data/shared/fiche/equipment.js';
import talentQualityRegistry from '../data/v5-quality-talent-contracts.json' with {type:'json'};
import contracts from '../data/keyword-engine-contracts.json' with { type: 'json' };
import { getReferenceCatalogue, resolveKeyword } from './reference-catalog.js';
import { conditionalArmour, natureTagLabel } from './v5-magic-combat.js';
export { HIT_LOCATIONS, armourProtection, equipmentFormula, armourLayer, validateEquipmentItem };
/** Armes de corps à corps conjurables (V5 p. 301), sans prix ni inventaire permanent. */
export const ARCANE_WEAPON_PROFILES=Object.freeze(Object.fromEntries([
 ['dagger','Dague',2,1,'very-short',[]],['knife','Couteau',1,1,'very-short',['inoffensive']],['hand-weapon','Arme de base',4,1,'average',['desequilibree']],['improvised','Arme improvisée',1,1,'average',['desequilibree','inoffensive']],['net','Filet',null,1,'short',['defensive',{id:'immobilisante',rating:50,parameter:'50'}]],['sword','Épée',4,1,'average',[]],
 ['garrote','Garrot',2,2,'personal',['immobilisante','inoffensive']],['knuckles','Poing américain',2,1,'personal',[]],['unarmed','Mains nues conjurées',0,1,'personal',['inoffensive']],
 ['cavalry-hammer','Marteau de cavalerie',5,2,'long',['assommante']],['lance','Lance de cavalerie',6,1,'very-long',['devastatrice','empaleuse']],
 ['buckler','Bocle',1,1,'personal',['parade','inoffensive']],['foil','Fleuret',3,1,'average',['rapide','empaleuse','precise','inoffensive']],['main-gauche','Main gauche',2,1,'short',['defensive','empaleuse','parade']],['rapier','Rapière',4,1,'long',['rapide','empaleuse']],['swordbreaker','Brise-lame',1,1,'short',['defensive','parade','piege-lame']],
 ['flail','Fléau',4,1,'average',['assommante','a-enroulement','desequilibree']],['grain-flail','Fléau à grain',3,2,'long',['assommante','imprecise']],['military-flail','Fléau militaire',5,2,'long',['devastatrice','assommante','a-enroulement','desequilibree']],['whip','Fouet',2,1,'very-long',['a-enroulement','desequilibree','inoffensive']],
 ['halberd','Hallebarde',5,2,'long',['defensive','entaille','empaleuse']],['pike','Pique',4,2,'massive',['empaleuse']],['staff','Bâton',3,2,'long',['defensive','assommante','inoffensive']],['spear','Lance',4,2,'very-long',['rapide','empaleuse']],
 ['bastard-sword','Épée bâtarde',5,2,'long',['devastatrice','defensive']],['greataxe','Grande hache',6,2,'long',['devastatrice','entaille','desequilibree']],['pick','Pic',5,2,'long',['devastatrice','perforante','desequilibree']],['warhammer','Marteau de guerre',6,2,'long',['devastatrice','assommante','desequilibree']],['zweihander','Espadon',5,2,'long',['devastatrice','entaille']]
].map(([id,name,damage,hands,reach,qualities])=>[id,{id,name,damage,hands,reach,qualities}])));
/** Objets réellement présents, y compris les armes d'une action locale sans fiche liée. */
export function conjuredWeaponSkillScore(participant,key){
 const groups={garrote:'bagarre',knuckles:'bagarre',unarmed:'bagarre','cavalry-hammer':'cavalerie',lance:'cavalerie',buckler:'escrime',foil:'escrime','main-gauche':'escrime',rapier:'escrime',swordbreaker:'escrime',flail:'fleau','grain-flail':'fleau','military-flail':'fleau',whip:'fleau',halberd:'hast',pike:'hast',staff:'hast',spear:'hast','bastard-sword':'deux mains',greataxe:'deux mains',pick:'deux mains',warhammer:'deux mains',zweihander:'deux mains'};
 const fold=s=>String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const group=groups[key] || 'base',skill=(participant.skills || []).find(s=>/corps a corps|melee/.test(fold(s.name || s.nom)) && ({base:/base|basic/,bagarre:/bagarre|brawling/,cavalerie:/cavalerie|cavalry/,escrime:/escrime|fencing/,fleau:/fleau|flail/,hast:/hast|polearm/,'deux mains':/deux mains|two.hand/}[group]).test(fold(s.name || s.nom)));
 const value=skill?.total ?? skill?.value ?? skill?.score;
 return value!=null && Number.isFinite(Number(value))?Number(value):group==='base'||group==='bagarre'?Number.isFinite(Number(participant.caracs?.CC))?Number(participant.caracs.CC):null:null;
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
 const id=locationId(context),warnings=[],manual=[],evaluatedKeywords=new Set();if(!id)return {ap:null,baseAp:null,shieldAp:0,counted:[],ignored:[],manual:['localisation-requise'],warnings};
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
 for(const item of location?.counted||[]){let include=true;const known=item.keywords.map(w=>w.id);
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
  else if(context.shieldAvailable===false||target?.extensions?.shieldUnavailable?.includes?.(shield.id))warnings.push('Bouclier indisponible dans cette scène');
  else if(context.shieldAvailable !== true)manual.push('disponibilite-bouclier-requise');
  else if(context.opposedWithShield===true){
   if(context.defenseProvided!==true)manual.push('jet-opposition-requis:bouclier');
   if(typeof context.ranged!=='boolean')manual.push('type-attaque-requis:bouclier');
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
 if(attackWords.includes('perforante')){const word=resolveKeyword('perforante'),source=talentQualityRegistry.qualityContracts.find(q=>q.id==='perforante');evaluatedKeywords.add('perforante');if(word?.effect!==source?.effect||word?.edition!==source?.edition||word?.source!==source?.source)manual.push('effet-non-couvert:perforante');else ap=Math.max(0,ap-2);}
 if(context.manualAp!==undefined&&context.manualAp!==null){const override=Number(context.manualAp);if(Number.isFinite(override)&&override>=0)return {location:id,ap:override,baseAp,shieldAp,counted,ignored,shield,criticalIgnored,manual:[],warnings,evaluatedKeywords:context.critical&&evaluatedKeywords.has('impenetrable')?['impenetrable']:[],arbitrated:true};}
 return {location:id,ap:manual.length?null:ap+shieldAp,baseAp,shieldAp,counted,ignored,shield,criticalIgnored,manual:[...new Set(manual)],warnings,evaluatedKeywords:[...evaluatedKeywords]};
}
