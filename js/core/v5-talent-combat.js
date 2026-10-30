import{previewSmall}from'./v5-talent-small.js';
/** Typed combat inputs: never erase an unclassified MJ difficulty. */
import {previewWhirlwind} from './v5-talent-whirlwind.js';
import {previewAlliedShields} from './v5-talent-shield.js';
import {previewAttackPrelude} from './v5-talent-attacks.js';
import {prepareContactWeapons} from './v5-talent-contact.js';
import {previewLarge,prepareStomp} from './v5-talent-size.js';
import {previewForgeAura,previewCardsharp} from './v5-talent-replacements.js';
import { evaluateV5Talents } from './v5-talents.js';
import { creatureSizeOf } from './creature-size.js';
import { normalizeState } from './effects.js';
import { sourceActive } from './v5-talent-actions.js';
const PENALTIES={offHand:['Main secondaire',2],mounted:['Esquive montée',2],confined:['Espace exigu',null],status:['Statut supérieur',null],proneAttack:['Attaque À terre',null],belowTarget:['Attaque sous la cible',null],cover:['Couvert',null],targetProne:['Tir sur une cible À terre',null],longRange:['Longue portée',null],extremeRange:['Portée extrême',null],critical:['Blessure critique',null],flying:['Tir sous Trait Vol',2],terrainMovement:['Terrain gênant le mouvement',null],amputation:['Amputation',null]};
export const V5_TYPED_PENALTIES=Object.freeze(PENALTIES);
const ATTACK_ONLY=new Set(['cover','targetProne','longRange','extremeRange','terrainMovement']);
const foldState=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const hasState=(person,...keys)=>(person?.states||[]).some((row,index)=>{
 if(Number(row?.level)===0)return false;
 if(row.source?.source?.effectHash&&!sourceActive(row))return false;
 const state=normalizeState(row,index);
 if(!state||['talent-active','talent-pending'].includes(state.kind)||!(Number(state.level)>0))return false;
 const canonical=state.key.replace(/[- ]/g,'');
 return keys.includes(canonical)||keys.includes(foldState(row.key))||keys.includes(foldState(row.name));
});
export function computeV5WeaponReachGuide(rawReach){
 const key=foldState(rawReach);
 if(key==='treslongue'||key==='verylong')return {key:'very-long',label:'Très longue',engagementYards:4,text:'Allonge Très longue : permet d’engager jusqu’à 4 m au lieu de 2 (aide MJ, distance non suivie).'};
 if(key==='massive'||key==='considerable')return {key:'massive',label:'Massive',engagementYards:6,text:'Allonge Massive : permet d’engager jusqu’à 6 m (aide MJ, distance non suivie).'};
 return null;
}
export function computeV5WeaponRangeBands(rawRange,actor=null){
 let printedYards=null;
 if(typeof rawRange==='number'&&Number.isFinite(rawRange)&&rawRange>0)printedYards=rawRange;
 else if(typeof rawRange==='string'&&rawRange.trim()){
  const direct=rawRange.trim().match(/^(\d+(?:\.\d+)?)\s*(?:yards?|yd)?$/i);
  const sb=rawRange.trim().match(/^bf\s*(?:[×x*]\s*(\d+))?$/i);
  if(direct)printedYards=Number(direct[1]);
  else if(sb&&Number.isFinite(Number(actor?.caracs?.F)))printedYards=Math.floor(Number(actor.caracs.F)/10)*(sb[1]?Number(sb[1]):1);
 }
 if(!(printedYards>0))return null;
 // Livre de base V5 v3 p.302 : une portée courte de 4 m ou moins supprime le bout portant.
 const shortYards=printedYards/2;
 return {printedYards,pointBlankYards:shortYards>4?4:null,shortYards,mediumYards:printedYards,longYards:printedYards*2,extremeYards:printedYards*3};
}
/** L06 p.166 modifiers belong to the attack Test, even when a resolution also contains a defense. */
export function applyV5AttackSituationModifiers(modifiers,{role,kind,actionType,actor,target,context={},actorSize,targetSize,talentRules=[],advantage=0,aimed=false,rangeBands=null}={}){
 if(role!=='attacker'||!['attack','attaque'].includes(actionType)||!['melee','ranged'].includes(kind))return [];
 const situationStart=modifiers.length,unresolved=[],add=(id,label,amount)=>{if(amount)modifiers.push({id,label,amount});};
 if(kind==='ranged'){
  const ar=Number.isSafeInteger(actorSize)?actorSize:creatureSizeOf(actor).rank,tr=Number.isSafeInteger(targetSize)?targetSize:creatureSizeOf(target).rank;
  add('size:ranged-target','Taille de la cible',tr===6?2:tr>ar?1:tr<ar?-1:0);
  const bands={'point-blank':2,short:1,medium:0,long:-1,extreme:-2};
  // V5 v3 p.165 : un tir contre un adversaire engagé avec le tireur se résout comme une mêlée, sans modificateur de portée.
  const asMelee=context.engagedWithShooter===true;
  const noPointBlank=!asMelee&&rangeBands&&rangeBands.pointBlankYards===null;
  if(noPointBlank&&(context.shotRange==='point-blank'||context.pointBlank===true))unresolved.push('Cette arme n’a pas de bout portant (portée courte de 4 m ou moins) : choisir une autre bande.');
  if(context.shotRange!==undefined&&!asMelee){if(!Object.hasOwn(bands,context.shotRange))unresolved.push('Bande de portée MJ invalide.');else if(!(noPointBlank&&context.shotRange==='point-blank'))add('range:'+context.shotRange,'Bande de portée choisie par le MJ',bands[context.shotRange]);}
  const surprised=hasState(target,'surpris','surprised');
  if(surprised)add('target:surprised-ranged','Cible Surprise au tir',2);
  if(context.aimedTargetId===target?.id)add('aim:target','Visée contre la cible désignée',1);
  const prone=hasState(target,'aterre','prone');
  if(Number(context.penalties?.cover)<0||Number(context.penalties?.targetProne)<0||context.cover===true||prone){const key=Number(context.penalties?.targetProne)<0||prone?'targetProne':'cover';const amount=Math.min(-1,Number(context.penalties?.cover)||0,Number(context.penalties?.targetProne)||0);add('penalty:'+key,key==='targetProne'?'Tir sur une cible À Terre':'Couvert',amount);}
  const weather={normal:0,fog:-1,'rain-wind':-2,extreme:-3};
  const lighting={normal:0,fog:-1,dim:-1,dark:-3};
  let environment=[];
  if(context.weather!==undefined){if(!Object.hasOwn(weather,context.weather))unresolved.push('Météo de tir MJ invalide.');else environment.push(weather[context.weather]);}
  if(context.lighting!==undefined){if(!Object.hasOwn(lighting,context.lighting))unresolved.push('Lumière de tir MJ invalide.');else environment.push(lighting[context.lighting]);}
  if(environment.length)add('weather-light:ranged','Météo et lumière (niveau le plus sévère)',Math.min(...environment));
  if(context.movedBeforeRangedAttack===true)add('movement:ranged','Déplacement avant le tir',-1);
 }else{
  if(context.height==='attacker')add('height:melee','Avantage de hauteur',1);else if(context.height==='defender')add('height:melee','Désavantage de hauteur',-1);
  if(hasState(target,'enchevetre','entangled'))add('target:entangled','Cible Enchevêtrée',1);
  if(context.difficultTerrain===true)add('terrain:melee','Terrain difficile',-1);
  if(context.narrowSpace===true){if(!['very-short','short','average','superior'].includes(context.weaponReachBand))unresolved.push('Allonge de l’arme requise pour le combat en espace exigu.');else if(context.weaponReachBand==='average'||context.weaponReachBand==='superior')add('confined:melee','Espace exigu',context.weaponReachBand==='average'?-1:-2);}
  if(hasState(actor,'aterre','prone')&&!context.penalties?.proneAttack)add('penalty:proneAttack','Attaquant À Terre',-1);
 }
 if(context.secondWeaponAttack===true&&!context.penalties?.offHand)add('penalty:offHand','Main secondaire',-2);
 const situationRows=modifiers.splice(situationStart);applyV5TalentPenaltyRules(situationRows,talentRules,{kind,role,context:{},advantage,aimed});modifiers.push(...situationRows);
 return unresolved;
}
export function previewV5CombatPrelude(normalized){
  const stomp=prepareStomp(normalized),large=previewLarge(normalized),contact=prepareContactWeapons(normalized),small=previewSmall(normalized),immediate=previewAttackPrelude(normalized),alliedShield=previewAlliedShields(normalized),whirlwind=previewWhirlwind(normalized);
  const attack=['attack','attaque'].includes(normalized.action.type),charging=attack&&normalized.v5.charging===true;
  const sizes=[normalized.v5.actorSize,normalized.v5.targetSize],larger=sizes.every(Number.isSafeInteger)?sizes[0]>sizes[1]:undefined;
  const slayer=evaluateV5Talents(normalized.target,{event:'combat.beforeTests',role:'defender',context:{receivedCharge:charging,chargedByLargerEnemy:larger},includeTalents:['talent-slayer']});
  const demolition=evaluateV5Talents(normalized.actor,{event:'combat.beforeTests',role:'attacker',context:{weapon:{hack:(normalized.action.qualities||[]).some(q=>q.id==='taille')}},includeTalents:['talent-demolisher']});
  const coverStep=demolition.proposals.filter(e=>e.op==='reduceCover').reduce((sum,e)=>sum+e.amount,0);
  if(attack&&coverStep&&normalized.v5.context?.penalties?.cover<0)normalized.v5.context.penalties.cover=Math.min(0,normalized.v5.context.penalties.cover+coverStep);
  const underminer=evaluateV5Talents(normalized.target,{event:'combat.beforeTests',role:'defender',context:{},includeTalents:['talent-underminer']});
  const cover=evaluateV5Talents(normalized.target,{event:'combat.beforeTests',role:'defender',context:{coverPenalty:attack?(normalized.v5.context?.penalties?.cover||0):0},includeTalents:['talent-entrenchment']});
  const forge=previewForgeAura(normalized),cardsharp=previewCardsharp(normalized);
  const defenseSupport=normalized.defense?{...normalized,actor:normalized.target,target:normalized.actor,action:normalized.defense,v5:normalized.defense.v5}:null;
  const defenderForge=defenseSupport?previewForgeAura(defenseSupport):{plans:[],unresolved:[]},defenderShield=defenseSupport?previewAlliedShields(defenseSupport):{plans:[],unresolved:[]};
  const plans=[slayer,cover,demolition,underminer,...forge.plans,...defenderForge.plans,...defenderShield.plans,...cardsharp.plans,...stomp.plans,...large.plans,...small.plans,...contact.plans,...immediate.plans,...alliedShield.plans,...whirlwind.plans],unresolved=slayer.unresolved.flatMap(r=>r.fields.map(f=>'Tueur : préciser '+f+'.'));
  unresolved.push(...small.unresolved,...defenderForge.unresolved,...defenderShield.unresolved,...forge.unresolved,...cardsharp.unresolved,...stomp.unresolved,...large.unresolved,...contact.unresolved,...immediate.unresolved,...alliedShield.unresolved,...whirlwind.unresolved);
  const guards=normalized.v5.context?.nearbyGuardIds||[];if(!Array.isArray(guards)||!guards.every(id=>typeof id==='string'))throw new TypeError('Gardes désignés invalides');
  const participants=normalized.v5State?.participants||[];
  for(const id of new Set(guards)){
    const guard=participants.find(p=>p.id===id),target=normalized.target;
    const valid=attack&&guard&&target&&guard.id!==target.id&&guard.id!==normalized.actor.id&&guard.camp===target.camp&&(guard.states||[]).every(s=>['talent-active','talent-pending'].includes(s.kind));
    if(!guard){unresolved.push('Garde royal désigné introuvable.');continue;}
    plans.push(evaluateV5Talents(guard,{event:'combat.beforeTests',role:'defender',context:{guardedAlly:Boolean(valid)},includeTalents:['talent-kingsguard']}));
  }
  const guardPenalty=Math.max(0,...plans.flatMap(p=>p.proposals.filter(e=>e.op==='incomingPenalty').map(e=>e.amount)));
  const coverPenalty=cover.proposals.filter(e=>e.op==='improveCover').reduce((sum,e)=>sum+e.amount,0);
  if(small.forceWinner)large.forceWinner=small.forceWinner;
  return {plans,unresolved,small,forge,defenderForge,defenderShield,large,immediate,alliedShield,whirlwind,guardPenalty,coverPenalty,suppressProneBonus:underminer.proposals.some(p=>p.op==='suppressProneBonus'),targetIncomingMomentum:slayer.proposals.some(p=>p.op==='grantMomentum')};
}
export function applyV5TalentPenaltyRules(modifiers,rules,{kind,role,context,advantage,aimed}={}){
  for(const [key,[label,standard]] of Object.entries(PENALTIES)){
    if(role==='defender'&&ATTACK_ONLY.has(key))continue;
    if(kind==='ranged'&&role==='attacker'&&['cover','targetProne'].includes(key))continue;
    if(kind==='ranged'&&role==='attacker'&&context.shotRange!==undefined&&['longRange','extremeRange'].includes(key))continue;
    if(kind==='melee'&&role==='attacker'&&context.narrowSpace===true&&key==='confined')continue;
    if(kind==='melee'&&role==='attacker'&&(context.height!==undefined&&key==='belowTarget'||context.difficultTerrain!==undefined&&key==='terrainMovement'))continue;
    const raw=context.penalties?.[key];if(raw==null||raw===0)continue;
    if(!Number.isSafeInteger(raw)||raw>0)throw new TypeError('Pénalité en DR invalide : '+key);
    modifiers.push({id:'penalty:'+key,label,amount:standard==null?raw:-standard});
  }
  for(const rule of rules){
    const keys=rule.key==='calledShot'?['called-shot']:rule.key==='difficulty'?['difficulty']:rule.key==='confined'?['penalty:confined','confined:melee']:rule.key==='belowTarget'?['penalty:belowTarget','height:melee']:rule.key==='terrainMovement'?['penalty:terrainMovement','terrain:melee']:rule.key==='longRange'?['penalty:longRange','range:long']:rule.key==='extremeRange'?['penalty:extremeRange','range:extreme']:['penalty:'+rule.key];
    for(const row of modifiers.filter(row=>keys.includes(row.id)&&row.amount<0)){
      const suppressed=rule.op==='suppressTestPenalty'||rule.key==='calledShot'&&(kind==='melee'?advantage>0:aimed===true);
      const amount=suppressed?0:Math.max(row.amount,-rule.amount);
      row.talentOrigins=[...(row.talentOrigins||[]),...rule.origins];row.amount=amount;
    }
  }
}
/** Two candidate d100s and the player's explicit choice; Inoffensive needs two pairs. */
export function prepareV5TalentCriticalRolls(subject,raw,{settings={},role,inoffensive=false,parts=[],context={}}={}){
  const rolls=structuredClone(raw||{}),unresolved=[];
  const plan=evaluateV5Talents(subject,{event:'critical.beforeTable',role,context,excludeTalents:settings.talentChoices?.harpooner===true?[]:['talent-harpooner']});
  unresolved.push(...plan.unresolved.flatMap(row=>row.fields.map(field=>'Talent critique : préciser '+field+'.')));
  const bonus=plan.proposals.filter(row=>row.op==='modifyCriticalRoll').reduce((s,x)=>s+x.amount,0);
  if(bonus&&settings.talentChoices?.harpooner===true)for(const key of ['effect','effectAlternative','secondEffect','secondEffectAlternative','injureEffect','injureSecondEffect','injureEffectAlternative','injureSecondEffectAlternative'])if(rolls[key]!=null)rolls[key]=Math.min(100,rolls[key]+bonus);
  if(!plan.proposals.some(row=>row.op==='chooseCriticalRoll'))return {rolls,plan,unresolved};
  for(const part of parts){
    const first=part==='first',base=first?'effect':'secondEffect',other=first?'injureEffect':'injureSecondEffect',alt=first?'effectAlternative':'secondEffectAlternative',otherAlt=first?'injureEffectAlternative':'injureSecondEffectAlternative';
    const choice=settings.talentChoices?.['injure:'+part];
    if(rolls[base]==null||rolls[other]==null||inoffensive&&(rolls[alt]==null||rolls[otherAlt]==null))unresolved.push('Frappe blessante : saisir les deux gravités'+(inoffensive?' (deux paires avec Inoffensive).':'.'));
    if(typeof choice!=='boolean')unresolved.push('Frappe blessante : choisir la gravité du '+(first?'critique du jet.':'critique d’excédent.'));
    if(choice===true){rolls[base]=rolls[other];if(inoffensive)rolls[alt]=rolls[otherAlt];}
  }
  return {rolls,plan,unresolved};
}
