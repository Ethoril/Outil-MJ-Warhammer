import{previewSmall}from'./v5-talent-small.js';
/** Typed combat inputs: never erase an unclassified MJ difficulty. */
import {previewWhirlwind} from './v5-talent-whirlwind.js';
import {previewAlliedShields} from './v5-talent-shield.js';
import {previewAttackPrelude} from './v5-talent-attacks.js';
import {prepareContactWeapons} from './v5-talent-contact.js';
import {previewLarge,prepareStomp} from './v5-talent-size.js';
import {previewForgeAura,previewCardsharp} from './v5-talent-replacements.js';
import { evaluateV5Talents } from './v5-talents.js';
const PENALTIES={offHand:['Main secondaire',2],mounted:['Esquive montée',2],confined:['Espace exigu',null],status:['Statut supérieur',null],proneAttack:['Attaque À terre',null],belowTarget:['Attaque sous la cible',null],cover:['Couvert',null],targetProne:['Tir sur une cible À terre',null],longRange:['Longue portée',null],extremeRange:['Portée extrême',null],critical:['Blessure critique',null],flying:['Tir sous Trait Vol',2],terrainMovement:['Terrain gênant le mouvement',null],amputation:['Amputation',null]};
export const V5_TYPED_PENALTIES=Object.freeze(PENALTIES);
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
export function applyV5TalentPenaltyRules(modifiers,rules,{kind,context,advantage,aimed}={}){
  for(const [key,[label,standard]] of Object.entries(PENALTIES)){
    const raw=context.penalties?.[key];if(raw==null||raw===0)continue;
    if(!Number.isSafeInteger(raw)||raw>0)throw new TypeError('Pénalité en DR invalide : '+key);
    modifiers.push({id:'penalty:'+key,label,amount:standard==null?raw:-standard});
  }
  for(const rule of rules){
    const key=rule.key==='calledShot'?'called-shot':rule.key==='difficulty'?'difficulty':'penalty:'+rule.key;
    for(const row of modifiers.filter(row=>row.id===key&&row.amount<0)){
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
