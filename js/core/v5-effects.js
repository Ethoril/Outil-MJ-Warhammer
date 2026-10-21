import {activeMagicTalent} from './v5-magic-talents.js';
/** Pure V5 Conditions and explicit combat clocks, core pp.184–187. No dice draw. */
import { normalizeEffects, normalizeState } from './effects.js';
import { withMomentum } from './v5-combat-rules.js';
import { armourProtection } from './equipment.js';
import { isMiscastConditionLocked } from './v5-magic-miscasts.js';
export const V5_EFFECT_RULE_VERSION = 'v5-effects-2026-10-09.1';
export const V5_CONDITION_KEYS = Object.freeze(['enflamme','souille','hemorragique','aveugle','brise','assourdi','enchevetre','extenue','empoisonne','a-terre','sonne','surpris','inconscient']);
const UNIQUE = new Set(['souille','a-terre','surpris','inconscient']);
const NAMES = {enflamme:'Enflammé',souille:'Souillé',hemorragique:'Hémorragique',aveugle:'Aveuglé',brise:'Brisé',assourdi:'Assourdi',enchevetre:'Enchevêtré',extenue:'Exténué',empoisonne:'Empoisonné','a-terre':'À Terre',sonne:'Sonné',surpris:'Surpris',inconscient:'Inconscient'};
const ALIASES = {ablaze:'enflamme',besmirched:'souille',bleeding:'hemorragique',blinded:'aveugle',broken:'brise',deafened:'assourdi',entangled:'enchevetre',fatigued:'extenue',poisoned:'empoisonne',prone:'a-terre',stunned:'sonne',surprised:'surpris',unconscious:'inconscient'};
const PHASES = new Set(['startOfTurn','endOfTurn','endOfRound','attackAttempt']);
const clone = value => structuredClone(value);
export const hasDivineWrathLock = state => Array.isArray(state?.divineWrathLocks)&&state.divineWrathLocks.length>0;
const orderedWrathData=value=>Array.isArray(value)?value.map(orderedWrathData):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,orderedWrathData(value[key])])):value;
function releaseWrathWoundLocks(states,removed=[]){
  return states.flatMap(state=>{
    const ended=(state.divineWrathLocks||[]).filter(lock=>lock.kind==='wounds-regained');if(!ended.length)return [state];
    const remaining=state.divineWrathLocks.filter(lock=>!ended.includes(lock));
    if(!remaining.length&&ended.some(lock=>lock.ownedState)){removed.push({id:state.id,key:keyOf(state),level:levelOf(state),reason:'wrath-wound-regained'});return [];}
    return [{...state,divineWrathLocks:remaining}];
  });
}
/** Garde de l’édition brute ; les commandes de récupération vérifiées changent leurs propres occurrences. */
export function assertDivineWrathConditionsKept(before,after){
  const woundsRegained=Number(after.hp)>Number(before.hp);
  if(woundsRegained)after={...after,states:releaseWrathWoundLocks(after.states||[])};
  const proposed=new Map((after.states||[]).map(row=>[row.id,row]));
  for(const state of before.states||[])if(hasDivineWrathLock(state)){
    const expected=state.divineWrathLocks.filter(lock=>!woundsRegained||lock.kind!=='wounds-regained');if(!expected.length)continue;
    const next=proposed.get(state.id);
    if(!next||Number(next.level??1)<Number(state.level??1)||next.name!==state.name||next.key!==state.key
      ||!expected.every(lock=>(next.divineWrathLocks||[]).some(candidate=>JSON.stringify(orderedWrathData(candidate))===JSON.stringify(orderedWrathData(lock)))))
      throw Object.assign(new Error('Courroux : cet État exige sa récupération sourcée ; retrait ou modification du verrou refusé.'),{code:'DIVINE_WRATH_LOCKED',userFacing:true});
  }
  return after;
}
const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[ -]+/g,'-');
const keyOf = value => { const key=fold(typeof value==='string'?value:value?.key||value?.name); return ALIASES[key]||key; };
export const isV5ConditionImmune = (participant,condition) => (participant.extensions?.v5?.immunities?.conditions||[]).some(name=>keyOf(name)===keyOf(condition));
const levelOf = state => Math.max(1, Number(state.level)||1);
const levels = (states,key) => states.filter(state=>keyOf(state)===key).reduce((total,state)=>total+levelOf(state),0);
const integer = (value,label,{minimum=0,maximum=Number.MAX_SAFE_INTEGER}={}) => {
  if (!Number.isSafeInteger(value)||value<minimum||value>maximum) throw new TypeError(`${label} invalide`);
  return value;
};
const testValue = test => {
  if (!test || typeof test.success!=='boolean' || !Number.isSafeInteger(test.sl)) throw new TypeError('Résultat de Test explicite requis');
  if (test.success && test.sl<0 || !test.success && test.sl>0) throw new TypeError('Réussite et DR incompatibles');
  return test;
};
const needs = (list,field,label) => { if (!list.some(item=>item.field===field)) list.push({field,label}); };
const createReceipt = (before,participant,details={}) => ({ruleVersion:V5_EFFECT_RULE_VERSION,participant,hpDelta:(Number(participant.hp)||0)-(Number(before.hp)||0),acquiredInstances:0,removed:[],needsInput:[],reminders:[],criticalRequests:[],death:false,...details,ready:!(details.needsInput||[]).length});
function newState(raw,states,context={}) {
  const key=keyOf(raw), state=normalizeState(typeof raw==='string'?{name:NAMES[key]||raw}:raw,states.length);
  state.key=key; state.name=NAMES[key]||state.name;
  if (UNIQUE.has(key)) state.level=1;
  const base=state.id;
  for(let i=1;states.some(entry=>entry.id===state.id);i++) state.id=`${base}-${i}`;
  if(state.source===null||typeof state.source==='object')state.source={...(state.source||{}),...(context.source||{}),...(context.resolutionId?{resolutionId:context.resolutionId}:{}),...(context.authorId?{authorId:context.authorId}:{}),targetId:context.targetId||context.participantId||state.source?.targetId||null};
  state.authorId=context.authorId||state.authorId||state.source?.authorId||null;
  state.targetId=context.targetId||context.participantId||state.targetId||state.source?.targetId||null;
  if(context.round!==undefined){integer(context.round,'Round d’acquisition');state.v5Timing={...(state.v5Timing||{}),acquiredRound:context.round};}
  return state;
}
function removeInstances(states,key,amount,eligible=()=>true) {
  const removed=[];
  const next=states.flatMap(state=>{
    if(keyOf(state)!==key||!eligible(state)||amount<=0)return [state];
    const count=Math.min(levelOf(state),amount); amount-=count; removed.push({id:state.id,key,level:count});
    return levelOf(state)>count?[{...state,level:levelOf(state)-count}]:[];
  });
  return {states:next,removed};
}
function toughnessBonus(participant,input,needsInput) {
  if(input!==undefined)return integer(input,'Bonus d’Endurance');
  const value=participant.caracs?.E;
  if(value===undefined||value===null||!Number.isFinite(Number(value))||Number(value)<0){needs(needsInput,'toughnessBonus','Bonus d’Endurance requis');return null;}
  return Math.floor(Number(value)/10);
}
/** Distinct occurrence metadata is retained; unique Conditions never refresh on reacquisition. */
export function acquireV5Conditions(participant,acquisitions=[],context={}) {
  if(!participant||typeof participant!=='object'||!Array.isArray(acquisitions))throw new TypeError('Acquisition d’États invalide');
  const next=clone(participant);let states=normalizeEffects(next.states), acquiredInstances=0, acquiredStunned=false;const removed=[],needsInput=[],reminders=[];
  const add=raw=>{
    const key=keyOf(raw);
    if(key==='surpris' && next.extensions?.v5?.specialStates?.cannotBeSurprised){reminders.push('Ennemi Anticipé : Surpris refusé.');return;}
    if(isV5ConditionImmune(next,key)){reminders.push('Immunité : '+(typeof raw==='string'?raw:raw?.name||key)+' ignoré.');return;}
    const meditation=activeMagicTalent(next,'mind-over-body');
    if(meditation && (context.painRelated===true || key==='aveugle' && meditation.magicTalentRank>=2))return;
    const amount=typeof raw==='string'?1:raw?.level??1;
    integer(amount,'Nombre d’États');if(!amount)return;
    if(UNIQUE.has(key)&&states.some(state=>keyOf(state)===key))return;
    const state=newState(typeof raw==='string'?raw:{...raw,level:amount},states,{...context,participantId:next.id});
    states.push(state);acquiredInstances+=state.level;if(key==='sonne')acquiredStunned=true;
    if(key==='assourdi'&&!Number.isSafeInteger(state.v5Timing?.acquiredRound))needs(needsInput,'currentRound','Round d’acquisition d’Assourdi requis pour sa récupération après une minute');
    if(key==='inconscient'){
      const clear=removeInstances(states,'sonne',Number.MAX_SAFE_INTEGER);states=clear.states;removed.push(...clear.removed);
      if(clear.removed.length&&!levels(states,'extenue'))add({name:'Exténué',level:1,source:{kind:'stunned-ended'}});
    }
  };
  for(const raw of acquisitions)add(raw);
  if(acquiredStunned&&!levels(states,'inconscient')){
    const bonus=toughnessBonus(next,context.toughnessBonus,needsInput);
    if(bonus!==null&&levels(states,'sonne')>bonus)add({name:'Inconscient',level:1,source:{kind:'stunned-over-toughness'}});
  }
  next.states=states;
  if(acquiredInstances&&levels(states,'inconscient')&&levels(states,'empoisonne')&&next.extensions?.v5?.poisonDeathDueRound===undefined){
    const bonus=toughnessBonus(next,context.toughnessBonus,needsInput);
    if(!Number.isSafeInteger(context.round))needs(needsInput,'currentRound','Round courant requis pour calculer le prochain Test de survie au poison');
    if(bonus===0){
      if(context.poisonDeathDueRound===undefined)needs(needsInput,'poisonDeathDueRound','BE nul : échéance du Test de survie au poison à arbitrer');
      else{integer(context.poisonDeathDueRound,'Round explicite du Test de poison',{minimum:context.round??0});next.extensions={...(next.extensions||{}),v5:{...(next.extensions?.v5||{}),poisonDeathDueRound:context.poisonDeathDueRound}};}
    }
    if(Number.isSafeInteger(context.round)&&bonus>0)next.extensions={...(next.extensions||{}),v5:{...(next.extensions?.v5||{}),poisonDeathDueRound:context.round+bonus}};
  }
  if(acquiredInstances)Object.assign(next,withMomentum(next,false));
  return createReceipt(participant,next,{acquiredInstances,removed,needsInput,reminders});
}
/** A temporary effect keeps its author and target, with an absolute explicit expiry. */
export function createV5TimedEffect(effect,{authorId,targetId,expiry}={}) {
  if(!effect||typeof effect!=='object'||typeof authorId!=='string'||!authorId||typeof targetId!=='string'||!targetId||!expiry||!PHASES.has(expiry.phase))throw new TypeError('Contexte d’échéance incomplet');
  integer(expiry.round,'Round d’échéance');
  if(['startOfTurn','endOfTurn'].includes(expiry.phase)){
    integer(expiry.turn,'Tour d’échéance');
    if(typeof expiry.actorId!=='string'||!expiry.actorId)throw new TypeError('Acteur de l’échéance requis');
  }
  if(expiry.moment!==undefined&&!['beforeEffects','afterEffects'].includes(expiry.moment))throw new TypeError('Instant d’échéance invalide');
  return {...clone(effect),v5Timing:{...(effect.v5Timing||{}),authorId,targetId,expiry:{...clone(expiry),moment:expiry.moment||'afterEffects'}}};
}
function due(expiry,transition) {
  if(!expiry||expiry.phase!==transition.phase||expiry.moment!==(transition.moment||'afterEffects'))return false;
  if(expiry.actorId&&expiry.actorId!==transition.actorId)return false;
  if(!Number.isSafeInteger(transition.round))return false;
  if(transition.round<expiry.round)return false;
  if(transition.round>expiry.round)return true;
  return expiry.turn===undefined||(Number.isSafeInteger(transition.turn)&&transition.turn>=expiry.turn);
}
export function expireV5Effects(participant,transition={}) {
  const next=clone(participant),removed=[];
  next.states=normalizeEffects(next.states).filter(state=>{
    const expiry=state.v5Timing?.expiry;
    if(state.v5Timing?.targetId&&state.v5Timing.targetId!==next.id)return true;
    if(!hasDivineWrathLock(state)&&due(expiry,transition)){removed.push({id:state.id,key:keyOf(state),level:levelOf(state)});return false;}
    return true;
  });
  return createReceipt(participant,next,{removed});
}
// Verrou divin : l'État reste tant que la couche qui l'a posé (prière à verrou) est active.
const divineLocked = (state,participant) => state.divineLock===true && (participant.extensions?.v5?.divineEffects || []).some(e => e.id === state.divineEffectId);
const recoveryLocked = (state,participant,options) => {
  if(hasDivineWrathLock(state))return true;
  if(isMiscastConditionLocked(participant,state))return true;
  if(state.spellEffectId && !state.recoveryDuringSpell && (participant.extensions?.v5?.spellEffects || []).some(e => e.id === state.spellEffectId)) return true;
  if(divineLocked(state,participant))return true;
  const kind=state.v5Recovery?.kind;
  if(!kind)return false;
  if(kind==='noBleeding')return levels(normalizeEffects(participant.states),'hemorragique')>0;
  if(kind==='medicalAttention')return options.medicalAttention!==true;
  if(kind==='surgery')return options.surgery!==true;
  if(kind==='causeEnded')return options.causeEnded!==true;
  return options.overrideRecovery!==true;
};
/** Recovery requires a declared method and, when relevant, an already resolved Test. */
export function recoverV5Condition(participant,condition,options={}) {
  const next=clone(participant),states=normalizeEffects(next.states);
  if(options.amount!==undefined)integer(options.amount,'Occurrences retirées');
  const selected=states.find(state=>state.id===condition),key=selected?keyOf(selected):keyOf(condition);
  const candidates=states.filter(state=>keyOf(state)===key&&(!selected||state.id===selected.id));
  if(!candidates.length)return createReceipt(participant,{...next,states});
  const method=fold(options.method),needsInput=[],reminders=[];
  const eligible=state=>(!selected||state.id===selected.id)&&!hasDivineWrathLock(state)&&!isMiscastConditionLocked(next,state)&&!(state.spellEffectId && !state.recoveryDuringSpell && (next.extensions?.v5?.spellEffects || []).some(e=>e.id===state.spellEffectId))&&!divineLocked(state,next)&&(method==='fortune'||!recoveryLocked(state,next,options));
  if(!candidates.some(eligible))return createReceipt(participant,{...next,states},{reminders:['La cause ou les soins requis empêchent encore cette récupération.']});
  let amount=0;
  const tested=(allowed)=>{
    if(!allowed.includes(method)){needs(needsInput,'recoveryMethod','Méthode de récupération à arbitrer');return false;}
    if(!options.test){needs(needsInput,'recoveryTest','Résultat du Test de récupération requis');return true;}
    const result=testValue(options.test);
    if(method==='endurance'&&['sonne','empoisonne'].includes(key)&&options.transition?.phase!=='endOfRound'&&options.outOfCombat!==true){needs(needsInput,'recoveryMoment','Récupération par Résistance en fin de Round requise');return true;}
    if(key==='assourdi'&&method==='endurance'&&options.minuteElapsed!==true){
      const clock=options.transition?.round,last=Math.max(...candidates.map(state=>state.v5Timing?.lastRecoveryRound??-1)),first=Math.min(...candidates.map(state=>state.v5Timing?.acquiredRound??Number.MAX_SAFE_INTEGER)),anchor=last>=0?last:first;
      if(!Number.isSafeInteger(clock)||clock-anchor<6){needs(needsInput,'minuteElapsed','Une minute (six Rounds) entre Tests contre Assourdi');return true;}
    }
    amount=result.success?Math.max(1,result.sl):0;return true;
  };
  if(method==='fortune')amount=1;
  else if(method==='divine-removal')amount=options.amount===undefined?1:integer(options.amount,'États retirés');
  else if(key==='a-terre'&&method==='stand-up')amount=1;
  else if(key==='souille'&&method==='clean')amount=1;
  else if(key==='extenue'&&method==='rest'){
    if(options.restSatisfied!==true)needs(needsInput,'restSatisfied','Repos adapté à la cause confirmé par le MJ');else amount=options.amount===undefined?1:integer(options.amount,'États retirés');
  }
  else if(key==='hemorragique'&&method==='bandage')amount=1;
  else if(key==='hemorragique'&&method==='wounds-recovered')amount=integer(options.amount,'Blessures effectivement récupérées');
  else if(key==='hemorragique'&&method==='heal'){
    if(!options.test)needs(needsInput,'recoveryTest','Résultat de Guérison requis');
    else if(testValue(options.test).success){
      if(options.intelligenceBonus===undefined)needs(needsInput,'intelligenceBonus','Bonus d’Intelligence du soigneur requis');
      else amount=integer(options.intelligenceBonus,'Bonus d’Intelligence')+options.test.sl;
    }
  }
  else if(key==='brise'&&['cool','hiding'].includes(method)){
    if(options.engaged!==false)needs(needsInput,'engaged','Confirmer que la cible n’est pas engagée');
    else if(method==='hiding'){
      if(options.fullRoundHidden!==true)needs(needsInput,'fullRoundHidden','Round entier caché hors de vue confirmé');else amount=1;
    }else if(options.transition?.phase!=='endOfRound'&&options.outOfCombat!==true)needs(needsInput,'recoveryMoment','Récupération par Calme en fin de Round requise');else tested(['cool']);
  }
  else if(key==='enflamme')tested(['athletics']);
  else if(key==='enchevetre')tested(['opposed-strength']);
  else if(key==='sonne' && candidates.some(s=>s.recoveryStat==='Int')) tested(['intelligence']);
  else if(['sonne','assourdi'].includes(key)&&method==='endurance')tested(['endurance']);
  else if(key==='empoisonne')tested(['endurance','heal']);
  else if(['aveugle','inconscient'].includes(key)&&method==='cause-ended'){
    if(options.causeEnded!==true)needs(needsInput,'causeEnded','Disparition de la cause confirmée');else amount=options.amount??Number.MAX_SAFE_INTEGER;
  }
  else if(['aveugle','sonne','hemorragique'].includes(key)&&method==='medical-attention'&&options.medicalAttention===true)amount=options.amount??1;
  else if(key==='hemorragique'&&method==='surgery'&&options.surgery===true)amount=options.amount??Number.MAX_SAFE_INTEGER;
  else needs(needsInput,'recoveryMethod','Méthode de récupération à arbitrer');
  // Removing Unconscious with Fortune does not resolve its cause.
  if(key==='inconscient'&&method==='fortune'&&options.causeEnded!==true)reminders.push('Si sa cause persiste, Inconscient revient en fin de Round.');
  const removal=removeInstances(states,key,amount,eligible);next.states=removal.states;
  if(['empoisonne','inconscient'].includes(key)&&removal.removed.length&&!levels(next.states,key)&&next.extensions?.v5?.poisonDeathDueRound!==undefined){
    next.extensions={...next.extensions,v5:{...next.extensions.v5}};delete next.extensions.v5.poisonDeathDueRound;
  }
  if(key==='inconscient'&&removal.removed.length){
    const old=(next.extensions?.v5?.pendingConditionReacquisition||[]).filter(item=>item.condition!=='inconscient');
    if(method==='fortune'&&options.causeEnded!==true){
      if(!Number.isSafeInteger(options.transition?.round))needs(needsInput,'currentRound','Round courant requis pour le retour d’Inconscient');
      else old.push({condition:'inconscient',round:options.transition.round,reason:'fortune-cause-persists'});
    }
    next.extensions={...(next.extensions||{}),v5:{...(next.extensions?.v5||{}),pendingConditionReacquisition:old}};
  }
  if(key==='assourdi'&&method==='endurance'&&options.test&&!needsInput.length&&Number.isSafeInteger(options.transition?.round))next.states=next.states.map(state=>keyOf(state)===key?{...state,v5Timing:{...(state.v5Timing||{}),lastRecoveryRound:options.transition.round}}:state);
  let acquiredInstances=0;
  if(removal.removed.length&&['sonne','empoisonne'].includes(key)&&!levels(next.states,key)){
    if(key==='empoisonne'||!levels(next.states,'extenue')){
      const acquired=acquireV5Conditions(next,[{name:'Exténué',level:1,source:{kind:'recovery',condition:key}}]);Object.assign(next,acquired.participant);acquiredInstances+=acquired.acquiredInstances;
    }
  }
  return createReceipt(participant,next,{removed:removal.removed,acquiredInstances,needsInput,reminders});
}
function fireArmour(participant,input,needsInput) {
  if(input!==undefined)return integer(input,'PA contre le feu');
  if(Array.isArray(participant.equipment)&&participant.equipment.some(item=>item.kind==='armour')){
    const protection=armourProtection(participant.equipment);
    if(protection.locations.some(location=>location.ignored.some(row=>row.item.ap===null))){needs(needsInput,'fireArmour','PA d’armure à préciser avant le feu');return null;}
    return Math.min(...protection.locations.map(location=>location.ap));
  }
  const armor=participant.armorLocations||participant.armor;
  const keys=participant.armorLocations?['head','body','leftArm','rightArm','leftLeg','rightLeg']:['head','body','arms','legs'];
  if(!armor||!keys.every(key=>armor[key]!==null&&armor[key]!==undefined&&Number.isSafeInteger(Number(armor[key]))&&Number(armor[key])>=0)){
    needs(needsInput,'fireArmour','PA de la localisation la moins protégée requis');return null;
  }
  return Math.min(...keys.map(key=>Number(armor[key])));
}
function explicitD10(value,field,needsInput) {
  if(value===undefined||value===null){needs(needsInput,field,'Résultat d10 requis');return null;}
  return integer(value,'Jet d10',{minimum:1,maximum:10});
}
/**
 * Clock advances return a preview. Callers must check ready before committing;
 * missing mandatory dice/protection never trigger guessed damage or death.
 * Optional recovery Tests are supplied in inputs.recoveries.
 */
export function advanceV5Effects(participant,transition={},inputs={}) {
  if(!PHASES.has(transition.phase))throw new TypeError('Phase V5 invalide');
  integer(transition.round,'Round courant');
  const before=clone(participant);
  // WoM p. 146 : une statue d'ambre ne subit ni dégâts ni maladie/poison, ses soins restent possibles par les commandes de soin.
  if(participant.extensions?.v5?.specialStates?.amberTrance){
    const frozen=clone(participant);
    if(transition.phase==='endOfRound'){
      for(const state of frozen.states || [])if(Number.isSafeInteger(state.v5Timing?.expiry?.round))state.v5Timing.expiry.round++;
      if(Number.isSafeInteger(frozen.extensions.v5.poisonDeathDueRound))frozen.extensions.v5.poisonDeathDueRound++;
    }
    return createReceipt(before,frozen,{reminders:['Transe d’Ambre : conséquences dommageables et poison suspendus.']});
  }
  let next=expireV5Effects(participant,{...transition,moment:'beforeEffects'}).participant;
  next.states=normalizeEffects(next.states);
  const needsInput=[],reminders=[],criticalRequests=[],removed=[],recoveryHandled=new Set();let death=false,acquiredInstances=0;
  const ownTurn=transition.phase==='endOfTurn'&&transition.actorId===next.id;
  const roundEnd=transition.phase==='endOfRound';
  const add=conditions=>{
    const receipt=acquireV5Conditions(next,conditions,{round:transition.round});next=receipt.participant;acquiredInstances+=receipt.acquiredInstances;removed.push(...receipt.removed);needsInput.push(...receipt.needsInput);
  };
  if(roundEnd){
    const pending=next.extensions?.v5?.pendingConditionReacquisition||[];
    const returns=pending.filter(item=>item.condition==='inconscient'&&Number.isSafeInteger(item.round)&&item.round<=transition.round);
    if(returns.length){
      add([{name:'Inconscient',source:{kind:'fortune-cause-persists'}}]);
      next.extensions={...(next.extensions||{}),v5:{...(next.extensions?.v5||{}),pendingConditionReacquisition:pending.filter(item=>!returns.includes(item))}};
    }
    let hp=Number(next.hp);
    if(!Number.isFinite(hp)||hp<0){needs(needsInput,'currentWounds','Blessures courantes non négatives requises');hp=null;}
    const flames=levels(next.states,'enflamme');
    if(flames){
      const roll=explicitD10(inputs.fireRoll,'fireRoll',needsInput),be=toughnessBonus(next,inputs.toughnessBonus,needsInput),ap=fireArmour(next,inputs.fireArmour,needsInput);
      if(hp!==null&&roll!==null&&be!==null&&ap!==null){
        const lost=Math.max(0,roll+flames-1-be-ap),excess=Math.max(0,lost-hp);hp=Math.max(0,hp-lost);
        reminders.push(`Enflammé ${flames} : 1d10(${roll}) + ${flames-1} − BE(${be}) − PA(${ap}) = ${lost} Blessure(s).`);
        if(lost>0&&hp===0)criticalRequests.push({location:'BODY',reason:'ablaze-zero-wounds',bonus:excess*10});
      }
    }
    const bleeding=levels(next.states,'hemorragique'),poison=levels(next.states,'empoisonne');
    if(hp!==null){
      if(bleeding){hp=Math.max(0,hp-bleeding);reminders.push(`Hémorragique ${bleeding} : perte de ${bleeding} Blessure(s), sans BE ni PA.`);}
      if(poison){hp=Math.max(0,hp-poison);reminders.push(`Empoisonné ${poison} : perte de ${poison} Blessure(s), sans BE ni PA.`);}
      next.hp=hp;
    }
    if(bleeding&&hp===0){
      if(levels(next.states,'inconscient')){
        if(bleeding>=10)death=true;
        else{
          const roll=explicitD10(inputs.bleedingDeathRoll,'bleedingDeathRoll',needsInput);
          if(roll!==null){death=roll<=bleeding;if(roll===10){const clear=removeInstances(next.states,'hemorragique',1);next.states=clear.states;removed.push(...clear.removed);}}
        }
      }else if(inputs.bleedingEnduranceTest){if(!testValue(inputs.bleedingEnduranceTest).success)add([{name:'Inconscient',level:1,source:{kind:'bleeding-zero-wounds'}}]);}
      else needs(needsInput,'bleedingEnduranceTest','Résistance +0 DR pour éviter Inconscient à 0 Blessure');
    }
    if(poison&&levels(next.states,'inconscient')){
      const be=toughnessBonus(next,inputs.toughnessBonus,needsInput);
      const dueRound=inputs.poisonDeathDueRound??next.extensions?.v5?.poisonDeathDueRound;
      if(dueRound===undefined)needs(needsInput,'poisonDeathDueRound','Round du prochain Test contre la mort par poison requis');
      else{
        integer(dueRound,'Round du Test de poison');
        if(transition.round>=dueRound){
          if(!inputs.poisonEnduranceTest)needs(needsInput,'poisonEnduranceTest','Résistance pour survivre au poison en étant Inconscient');
          else if(be!==null){
            const survived=testValue(inputs.poisonEnduranceTest).success;death=death||!survived;
            if(survived){
              let nextDue=be>0?transition.round+be:inputs.nextPoisonDeathDueRound;
              if(nextDue===undefined)needs(needsInput,'nextPoisonDeathDueRound','BE nul : prochain Test de survie au poison à arbitrer');
              else{integer(nextDue,'Prochain Round du Test de poison',{minimum:transition.round+1});next.extensions={...(next.extensions||{}),v5:{...(next.extensions?.v5||{}),poisonDeathDueRound:nextDue}};}
            }
          }
        }
      }
    }
    if(levels(next.states,'sonne'))reminders.push('Fin de Round : Résistance +0 DR peut retirer Sonné.');
    if(poison)reminders.push('Fin de Round : Résistance peut retirer Empoisonné ; difficulté selon le poison.');
    if(levels(next.states,'brise'))reminders.push('Hors engagement : Calme en fin de Round ou Round entier caché pour retirer Brisé.');
    const surprise=removeInstances(next.states,'surpris',Number.MAX_SAFE_INTEGER);next.states=surprise.states;removed.push(...surprise.removed);
  }
  if(transition.phase==='attackAttempt'&&transition.targetId===next.id){const clear=removeInstances(next.states,'surpris',Number.MAX_SAFE_INTEGER);next.states=clear.states;removed.push(...clear.removed);}
  if(ownTurn){
    const blind=removeInstances(next.states,'aveugle',1,state=>state.duration===null&&!state.v5Timing?.expiry&&!recoveryLocked(state,next,inputs));next.states=blind.states;removed.push(...blind.removed);
    next.states=next.states.flatMap(state=>{
      if(hasDivineWrathLock(state)||state.v5Timing?.expiry||state.duration===null)return [state];
      if(state.duration<=1){removed.push({id:state.id,key:keyOf(state),level:levelOf(state)});return [];}
      return [{...state,duration:state.duration-1}];
    });
  }
  for(const recovery of inputs.recoveries||[]){
    // A turn preview visits three phases. A supplied Test is consumed once,
    // at its declared phase (default endOfRound), never at each clock boundary.
    if(transition.phase!==(recovery.phase||'endOfRound'))continue;
    const had=Object.fromEntries(['sonne','empoisonne'].map(key=>[key,levels(next.states,key)]));
    const receipt=recoverV5Condition(next,recovery.condition||recovery.key,{...recovery,transition});next=receipt.participant;
    for(const key of ['sonne','empoisonne'])if(had[key]&&!levels(next.states,key))recoveryHandled.add(key);acquiredInstances+=receipt.acquiredInstances;removed.push(...receipt.removed);needsInput.push(...receipt.needsInput);reminders.push(...receipt.reminders);
  }
  const expiry=expireV5Effects(next,{...transition,moment:'afterEffects'});next=expiry.participant;removed.push(...expiry.removed);
  for(const key of ['sonne','empoisonne'])if(levels(normalizeEffects(before.states),key)&&!levels(next.states,key)&&!recoveryHandled.has(key)){
    if(key==='empoisonne'||!levels(next.states,'extenue'))add([{name:'Exténué',source:{kind:'condition-expired',condition:key}}]);
  }
  if((!levels(next.states,'empoisonne')||!levels(next.states,'inconscient'))&&next.extensions?.v5?.poisonDeathDueRound!==undefined){next.extensions={...next.extensions,v5:{...next.extensions.v5}};delete next.extensions.v5.poisonDeathDueRound;}
  if(Number(next.hp)<Number(before.hp))Object.assign(next,withMomentum(next,false));
  return createReceipt(before,next,{acquiredInstances,removed,needsInput,reminders,criticalRequests,death});
}
/** Actual healed Wounds remove the same number of Bleeding occurrences. */
export function healV5Wounds(participant,amount) {
  integer(amount,'Blessures récupérées');const next=clone(participant),states=normalizeEffects(next.states);
  const hp=Number(next.hp);if(!Number.isFinite(hp)||hp<0)throw new TypeError('Blessures courantes invalides');
  if(hp===0&&levels(states,'empoisonne'))return createReceipt(participant,{...next,states},{reminders:['Empoisonné à 0 Blessure : impossible de récupérer des Blessures avant retrait du poison.']});
  const ceiling=Number.isFinite(Number(next.maxHp))&&next.maxHp!==null?Math.max(hp,Number(next.maxHp)):Number.MAX_SAFE_INTEGER;
  next.hp=Math.min(ceiling,hp+amount);const actual=next.hp-hp,clear=removeInstances(states,'hemorragique',actual);next.states=clear.states;
  const removed=[...clear.removed];
  if(actual>0)next.states=releaseWrathWoundLocks(next.states,removed);
  return createReceipt(participant,next,{removed});
}
