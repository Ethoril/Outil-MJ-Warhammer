import { cloneValue } from '../models.js';
import { v5StoreActionClock } from '../v5-store-action.js';
import { previewGrappleTurnActionGate } from '../v5-grappling.js';
import { validatePrayerSLCaps, getPrayerSLModifiers } from '../v5-divine-prayer-caps.js';
import { assertDivineWrathConditionsKept } from '../v5-effects.js';
import { isMiscastConditionLocked } from '../v5-magic-miscasts.js';
import { rebaseMagicLayers } from '../v5-magic-effects.js';

export function grappleTurnGateBlock(envelope,input,actor){
 if(input.v5?.context?.isAction===false||input.reactionId||input.v5?.reactionId||input.v5?.context?.reaction===true)return null;
 const clock=v5StoreActionClock(envelope);
 if(!actor||!clock.encounterId||!clock.turnId||envelope.combat?.currentActorId!==actor.id)return null;
 const participants=envelope.combat?.participants||[];
 const priorLinks=(actor.extensions?.v5?.grapples||[]).filter(row=>{
  if(row.status!=='active'||row.createdTurnId===clock.turnId)return false;
  const otherId=row.initiatorId===actor.id?row.targetId:row.targetId===actor.id?row.initiatorId:null;
  const other=participants.find(item=>item.id===otherId);
  const alive=subject=>subject&&subject.zone!=='bench'&&subject.extensions?.v5?.dead!==true&&Number(subject.hp)>0;
  const held=participants.find(item=>item.id===row.targetId);
  const hasLinkCondition=(held?.states||[]).some(state=>state.source?.linkId===row.id&&['enchevetre','entangled'].includes(String(state.key||state.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())&&Number(state.level??1)>0);
  return alive(actor)&&alive(other)&&alive(held)&&hasLinkCondition;
 });
 if(!priorLinks.length)return null;
 const gateActor={...actor,extensions:{...(actor.extensions||{}),v5:{...(actor.extensions?.v5||{}),grapples:priorLinks}}};
 const skillId=input.action?.extensions?.fiche?.skillId||input.action?.v5?.context?.skillId||input.v5?.context?.skillId;
 const skill=actor.skills?.find(row=>row.id===skillId);
 const skillName=skill?.name||skill?.nom||input.action?.label||input.action?.name||input.action?.nom||'';
 const gate=previewGrappleTurnActionGate({actor:gateActor,action:input.v5?.context?.grappleAction,skillName,alreadySpentAction:standardV5ActionSpent(envelope,actor.id,clock)});
 return gate.required&&!gate.allowed?{ready:false,status:'requires-input',code:'F2_GRAPPLE_FIRST_ACTION',error:gate.unresolved[0],unresolved:gate.unresolved}:null;
}
export function prayerCapClockNeeds(participant, snapshot, path='participant'){
 const check=validatePrayerSLCaps(participant,{clock:snapshot?.extensions?.v5?.gameClock||null});if(!check.ok)return check.needsInput;
 if(check.caps.length){
  const clock=snapshot?.extensions?.v5?.gameClock;
  if(!clock||!Number.isSafeInteger(clock.campaignSeconds))return [{path:`${path}.extensions.v5.divineEffects`,message:'Horloge absente : la sanction de Prière ne peut pas être vérifiée.'}];
  const expired=check.caps.filter(cap=>cap.deadline.atSeconds<=clock.campaignSeconds);
  if(expired.length)return expired.map(()=>({path:`${path}.extensions.v5.divineEffects`,message:'Sanction de Prière échue au curseur actuel; résolvez-la avant ce Test.'}));
 }
 const sceneId=snapshot?.activeScene?.status==='active'?snapshot.activeScene.id:null,round=snapshot?.combat?.round;
 const lesson=getPrayerSLModifiers(participant,{sceneId,round});
 return lesson.ok?[]:lesson.needsInput.map(row=>({path:`${path}.${row.path}`,message:row.message}));
}
export function recordV5ActionUsage(envelope,actorId,actionId){
 const clock=v5StoreActionClock(envelope);if(!clock.encounterId||!clock.turnId||envelope.combat?.currentActorId!==actorId)return {ok:true,tracked:false};
 envelope.extensions??={};envelope.extensions.v5??={};
 const rows=envelope.extensions.v5.standardTurnActions||[];
 if(!rows.some(row=>row.actionId===actionId))envelope.extensions.v5.standardTurnActions=[...rows,{actorId,actionId,encounterId:clock.encounterId,round:clock.round,turnId:clock.turnId,kind:'action'}].slice(-500);
 return {ok:true,clock};
}
export function standardV5ActionSpent(envelope,actorId,clock=v5StoreActionClock(envelope)){
 return Boolean(clock.encounterId&&clock.turnId&&(envelope.extensions?.v5?.standardTurnActions||[]).some(row=>row.actorId===actorId&&row.encounterId===clock.encounterId&&row.turnId===clock.turnId));
}
export function previewV5PaviseDeploymentFrom(envelope,input={}){
 const actor=envelope.combat?.participants?.find(row=>row.id===input.actorId),item=actor?.equipment?.find(row=>row.id===input.equipmentId&&row.kind==='shield'&&/pavise|pavois/i.test(row.name||row.id||''));
 const clock=v5StoreActionClock(envelope),before=actor?.extensions?.v5?.paviseDeploymentByItemId?.[input.equipmentId]||null;
 if(!actor||!item)return{ready:false,status:'blocked',error:'Choisir un Pavois (Pavise) réellement équipé.'};
 if(envelope.combat?.currentActorId!==actor.id||!clock.turnId)return{ready:false,status:'blocked',error:'Le porteur doit être l’acteur courant d’un Tour suivi.'};
 if(standardV5ActionSpent(envelope,actor.id,clock))return{ready:false,status:'blocked',error:'Une Action a déjà été dépensée pendant ce Tour.'};
 if(before?.status==='planted')return{ready:false,status:'blocked',error:'Ce pavois est déjà planté.'};
 if(before?.actionsPaid===1&&before.lastTurnId===clock.turnId)return{ready:false,status:'blocked',error:'La seconde Action de mise en place doit être dépensée pendant un autre Tour.'};
 if(before&&before.actionsPaid!==1)return{ready:false,status:'blocked',error:'État de mise en place du pavois incohérent.'};
 if(!['north','south','east','west'].includes(input.direction))return{ready:false,status:'requires-input',error:'Choisir la direction du pavois.'};
 if(before?.facing&&before.facing!==input.direction)return{ready:false,status:'blocked',error:'La direction du pavois a déjà été fixée par la première Action.'};
 return{ready:true,actorId:actor.id,equipmentId:item.id,direction:input.direction,step:before?2:1,turnId:clock.turnId,baseRevision:envelope.localRevision||0,before:cloneValue(before)};
}
export function combatActionState(envelope){return envelope.extensions?.v5?.combatActions||{byActorId:{},receipts:[]};}
export function combatActionBlock(envelope,actorId){
 const clock=v5StoreActionClock(envelope),row=combatActionState(envelope).byActorId?.[actorId];
 return row&&row.turnId===clock.turnId&&row.encounterId===clock.encounterId
  ?{ready:false,status:'blocked',code:'F2_COMBAT_ACTION_SPENT',error:'Une Action de combat spéciale a déjà été dépensée pendant ce Tour.'}:null;
}
export function ordinaryActionAfterCombatActionBlock(envelope,actorId){
 const block=combatActionBlock(envelope,actorId);return block?{...block,error:'Visée ou Défensive a déjà consommé l’Action de ce Tour.'}:null;
}
export function combatMagicActionStore(api,actorId){
 return {...api,executeCommand(type,mutator,options){return api.executeCommand(type,draft=>{
  const block=combatActionBlock(draft,actorId);if(block)throw Object.assign(new Error(block.error),{userFacing:true,code:block.code});
  const next=mutator(draft)||draft;
  if(next.extensions?.v5?.combatActions?.byActorId?.[actorId]?.kind==='aim')delete next.extensions.v5.combatActions.byActorId[actorId];
  recordV5ActionUsage(next,actorId,`${type}:${next.localRevision}`);
  return next;
 },options);}};
}
export function canonicalFreeAttack(preview,input={}){
 const source=preview?.input||input,v5=source.v5||{},costs=preview?.actionCosts;
 if(v5.extraAttack!==true||!costs?.ready)return false;
 const waived=(costs.waived||[]).some(row=>row.resource==='momentum'&&Array.isArray(row.waivedBy)&&row.waivedBy.length>0);
 const quota=(costs.usages||[]).some(row=>row.quotaId!=='system:momentum-extra-attack'&&Number.isFinite(row.maximum)&&row.after<=row.maximum);
 return waived&&quota;
}
export function brokenEscapeActionSpent(envelope,actorId,clock=v5StoreActionClock(envelope)){
 if(!clock.encounterId||!clock.turnId)return false;
 const key=JSON.stringify([clock.encounterId,clock.turnId]);
 return standardV5ActionSpent(envelope,actorId,clock)||(envelope.extensions?.v5?.actionLedger?.quotaUsage||[]).some(row=>row.actorId===actorId&&row.quotaId==='system:turn-action'&&row.scope==='turn'&&row.scopeKey===key&&row.used>0);
}
export function combatReflexesActivation(input){return input?.v5?.context?.talentAction==='combat-reflexes';}
export function combatReflexesAlreadyInitialized(envelope,input){
 if(!combatReflexesActivation(input))return false;
 const actorId=input?.actor?.id||input?.actorId,actor=envelope?.combat?.participants?.find(row=>row.id===actorId);
 return Boolean(actor?.extensions?.v5?.combatInitiative?.initialized||envelope?.extensions?.v5?.combatInitiativeInitialized);
}
export const combatReflexesAlreadyDeterminedMessage='Combat instinctif a déjà déterminé l’Initiative de ce combat. Recommencez explicitement le combat pour la déterminer à nouveau.';
export function isBrokenEscapeActor(actor){
 return (actor?.states||[]).some(row=>['brise','broken'].includes(String(row.key||row.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()));
}
export function brokenEscapeActionBlock(envelope,actorId){
 const clock=v5StoreActionClock(envelope);
 return isBrokenEscapeActor(envelope.combat?.participants?.find(row=>row.id===actorId))&&brokenEscapeActionSpent(envelope,actorId,clock)
  ? {ready:false,status:'blocked',code:'BROKEN_ESCAPE_ACTION_SPENT',error:'Le quota Action du Tour est déjà dépensé pour ce personnage Brisé.'}
  : null;
}
export function detonateDueV5Bombs(combat, completedActorId, completedTurnIndex){
 if(!Number.isSafeInteger(completedTurnIndex)||completedTurnIndex<1||!Array.isArray(combat?.participants))return combat;
 let changed=false;const participants=combat.participants.map(participant=>{
  const due=[],equipment=(participant.equipment||[]).map(item=>{
   const v5=item.extensions?.v5||{};if(v5.bombFuse!==true)return item;
   const ownerId=v5.bombFuseOwnerId;
   // New fuses count activations of their bearer. Legacy snapshots retain the
   // old global-index fallback so migration never advances a fuse silently.
   if(ownerId){if(participant.id!==completedActorId)return item;const remaining=Number(v5.fuseTurnsRemaining);if(!Number.isSafeInteger(remaining)||remaining<1)return item;
    if(remaining>1){changed=true;return {...item,extensions:{...(item.extensions||{}),v5:{...v5,fuseTurnsRemaining:remaining-1}}};}
   } else if(Number(v5.fuseDueTurnIndex)>completedTurnIndex)return item;
   due.push(item);changed=true;return {...item,extensions:{...(item.extensions||{}),v5:{...v5,fuseLit:false,bombFuse:false,fuseDueRound:null,fuseDueTurnIndex:null,bombFuseOwnerId:null,fuseTurnsRemaining:null,bombDetonatedTurnIndex:completedTurnIndex}}};
  });
  if(!due.length){return equipment.some((row,index)=>row!==(participant.equipment||[])[index])?{...participant,equipment}:participant;}
  const rows=participant.extensions?.v5?.combatEffects||[];
  return {...participant,equipment,extensions:{...(participant.extensions||{}),v5:{...(participant.extensions?.v5||{}),combatEffects:[...rows,...due.map(item=>({id:`bomb-detonation:${item.id}:${completedTurnIndex}`,kind:'bomb-detonation',equipmentId:item.id,turnIndex:completedTurnIndex,requiresTargetResolution:true,source:'L13-0117'}))]}}};
 });
 return changed?{...combat,participants}:combat;
}
export function isV5ActionUse(preview,input={}){
 return preview?.attack===true||input?.attack===true||preview?.input?.v5?.context?.isAction===true||input?.v5?.context?.isAction===true;
}
export function isExplicitV5NonAction(preview,input={}){
 return !isV5ActionUse(preview,input)&&(preview?.input?.v5?.context?.isAction===false||input?.v5?.context?.isAction===false);
}
export function isV5SkillTest(preview,input={}){
 const source=preview?.input||input||{},action=source.action||input?.action||{};
 const kind=source.v5?.kind||input?.v5?.kind;
 return kind==='test'||['skill','defense','opposition'].includes(String(action.type||'').toLowerCase())||Boolean(source.defense||input?.defense);
}
export function brokenEscapeActionClassificationBlock(actor,preview,input={}){
 if(!isBrokenEscapeActor(actor))return null;
 const source=preview?.input||input||{},action=source.action||input?.action||{};
 if(preview?.attack===true||source.attack===true||input?.attack===true||action.type==='attack'||input?.action?.type==='attack')return null;
 if(!isV5SkillTest(preview,input))return null;
 const classification=source.v5?.context?.isAction??input?.v5?.context?.isAction;
 if(typeof classification==='boolean')return null;
 return {ready:false,status:'requires-input',code:'BROKEN_ESCAPE_ACTION_CLASSIFICATION_REQUIRED',error:'Pr\u00e9ciser si ce Test consomme l\u2019Action du Tour.',needsInput:[{field:'v5.context.isAction',type:'boolean',label:'Ce Test consomme-t-il l\u2019Action du Tour ?'}]};
}
export function throwBrokenEscapeActionClassification(block){
 if(block)throw Object.assign(new Error(block.error),{userFacing:true,code:block.code,needsInput:block.needsInput});
}
export function hasV5ReactionOpportunity(prepared){
 return Boolean(prepared?.reactionValidation?.ready===true&&prepared.reactionValidation.opportunity);
}
export function recordV5EscapeVisibility(envelope,actorId,visibleToAnyEnemy,sourceId){
 if(typeof visibleToAnyEnemy!=='boolean')return;
 const clock=v5StoreActionClock(envelope),root=envelope.extensions?.v5||{},escape=structuredClone(root.brokenEscape||{byActorId:{},receipts:[]});
 escape.receipts=[...(escape.receipts||[]),{id:`visibility:${sourceId}`,actorId,visibleToAnyEnemy,turn:clock,source:'explicit-gm',committedAtRevision:(envelope.localRevision||0)+1}].slice(-300);
 envelope.extensions??={};envelope.extensions.v5={...root,brokenEscape:escape};
}
export const isMagicBased = p => Boolean(p?.extensions?.v5?.baseCaracs || p?.extensions?.v5?.spellEffects?.length || p?.extensions?.v5?.divineEffects?.length || p?.extensions?.v5?.beastForm);
export function clearSessionClairvoyance(participant) {
  if (participant.extensions?.v5?.corruptionPerFortuneSpent === undefined) return participant;
  const { corruptionPerFortuneSpent, ...v5 } = participant.extensions.v5;
  return { ...participant, extensions: { ...participant.extensions, v5 } };
}
export function assertMiscastConditionsKept(before, after) {
  after=assertDivineWrathConditionsKept(before,after);
  const kept = new Map((after.states || []).map(state => [state.id, state]));
  if ((before.states || []).some(state => {
    if (!isMiscastConditionLocked(before, state)) return false;
    const proposed = kept.get(state.id), level = Number(proposed?.level ?? 1);
    return !proposed || !Number.isFinite(level) || level < Number(state.level ?? 1);
  })) {
    throw Object.assign(new Error('Regard maudit : cet État ne peut être retiré ni son niveau diminué avant la fin de l’incident magique.'), { code: 'MISCAST_CONDITION_LOCKED', userFacing: true });
  }
  return after;
}
export function pickBaseLayers(participant, patch) {
  if (!(patch?.caracs || patch?.armor) || !isMagicBased(participant)) return {};
  const rebased = rebaseMagicLayers(participant, { caracs: patch.caracs, armor: patch.armor });
  return Object.fromEntries(['caracs', 'armor', 'M', 'movement', 'extensions'].filter(key => rebased[key] !== undefined).map(key => [key, rebased[key]]));
}
