import {setStoreSanctifiedGround,removeStoreSanctifiedGround,enterStoreSanctifiedGround,leaveStoreSanctifiedGround,previewStoreDivineNavalEvent,applyStoreDivineNavalEvent,startStoreDivineDailyWrath,waiveStoreDivineDailyWrathDay,closeStoreDivineDailyWrath,getStoreDivineDailyWrathStatus,setStoreDivineRelic,removeStoreDivineRelic,previewStoreDivineSinEvent,applyStoreDivineSinEvent,getDivineSinEvents,getDivineSinReminders,previewStoreDivineAbsolution,applyStoreDivineAbsolution,returnStoreDivineJudgment,decideStoreDivineJudgmentRejection,createStoreDivinePenance,completeStoreDivinePenance,getDivinePenanceExamples,previewStoreDivineWrathRecovery,applyStoreDivineWrathRecovery,previewStoreDivine,applyStoreDivine,setStoreDivineSin,endStoreDivinePrayer,finalizeDivineState,expireDivineAtPhases,expireDivineAtClock,getDivineContract,getAllDivineContracts,getStoreDivineAccessGrants,createStoreDivineAccessGrant,revokeStoreDivineAccessGrant,resolveStoreDivineAccess} from './v5-divine-store.js';
import { casterCaracs } from './creature-abilities.js';
import {processCombatTurnSpells,shieldAtTurnStart,previewSpellInteraction,removeExpiredSummons,endSpellEffectsOnEvent} from './v5-magic-turn.js';
import {previewMagicMeditation,activeMagicTalent,magicTalentRank,effectiveSkillScore,baseCharacteristicScore} from './v5-magic-talents.js';
import { previewV5Test, selectV5Test, normalizeV5Roll } from './v5-roll.js';
import {
  applyCorruptionAbsolution as applyCorruptionAbsolutionPure,
  calculateCorruptionThreshold,
  confirmCorruptionMutation as confirmCorruptionMutationPure,
  resolveCorruptionExposure,
  resolveCorruptionThresholdTest,
  secretManifestationDelay
} from './v5-corruption.js';
import { V5_CORRUPTION_MUTATION_CATALOG, resolveCorruptionMutationSelection } from './v5-corruption-mutation-catalog.js';
import {resoluteException} from './v5-talent-replacements.js';
import {previewChannelling, applyChannelling} from './v5-magic-channelling.js';
import {previewCasting, applyCasting} from './v5-magic-casting.js';
import {previewMiscast, applyMiscast, resolveMiscast, isMiscastConditionLocked} from './v5-magic-miscasts.js';
import {
  previewBurnout,
  applyBurnout,
  previewBurnoutRecovery,
  applyBurnoutRecovery,
  getCadaiRunes,
  deployCadaiRune,
  consumeCadaiRune,
  previewCadaiCorruptionReroll
} from './v5-magic-high.js';
import {
  previewDispelCasting,
  applyDispelCasting,
  previewDispelPersistent,
  applyDispelPersistent
} from './v5-magic-dispel.js';
import {
  applySpellEffects as applyParticipantSpellEffects,
  expireSpellEffects as expireParticipantSpellEffects,
  rebaseMagicLayers,
  currentMagicRound,
  endBeastForm as revertParticipantBeastForm,
  resolveMagicMissile,
  resolveSpellDamage,
  resolveTouchOpposition,
  resolveSpellHealing
} from './v5-magic-effects.js';
import {
  previewLoreAttribute,
  applyLoreAttribute as applyLoreAttributeInternal
} from './v5-magic-attributes.js';
import {
  previewBeastForm,
  applyBeastForm as applyParticipantBeastForm,
  previewVerdantApotheosis,
  applyVerdantApotheosis as applyVerdantApotheosisInternal,
  previewDaemonbane,
  applyDaemonbane as applyDaemonbaneInternal,
  restoreDaemonbaneMaxHp as restoreDaemonbaneMaxHpInternal,
  daemonbaneReductions,
  previewHandOfGlory,
  applyHandOfGlory as applyHandOfGloryInternal,
  calculateSapheryWard,
  testSapheryWard,
  applyScytheOfShyishRules
} from './v5-magic-arbitrations.js';
import {
  getSpellContract,
  getContractChoiceOptions,
  validateSpellTargets,
  validateSpellFingerprint,
  previewSpellExecution as previewSpellExecutionInternal,
  applySpellExecution as applySpellExecutionInternal
} from './v5-spell-contracts.js';
import {preventIdentifiedSurprise} from './v5-talent-situations.js';
import { listV5ReactionOpportunities, closeV5ReactionOpportunities } from './v5-reactions.js';
import { refreshV5TalentEffects,previewV5FrenzyExit } from './v5-talent-actions.js';
import { previewV5TalentConditions } from './v5-talents.js';
import { normalizeEffects } from './effects.js';
import { buildV5StoreActionInput, annotateV5StoreActionPreview, applyV5StoreAction, v5StoreActionState, v5StoreActionResult, v5StoreActionClock, commitV5StoreTalentUsages } from './v5-store-action.js';
import { getV5Fortune, getV5Fate, v5ResourceIdentity, consumeTemporaryFortune as consumeParticipantTempFortune, consumeTemporaryFate as consumeParticipantTempFate, projectV5Resources, projectV5ResourceEnvelope, commitV5Resources, creditFortuneCorruption, setV5Fortune, refreshV5Fortune, reconcileV5ResourceBindings } from './v5-resources.js';
import { acquireV5Conditions, recoverV5Condition, healV5Wounds, assertDivineWrathConditionsKept } from './v5-effects.js';
import { decideCriticalDeath as decideV5CriticalDeath, decideImmediateCriticalDeath as decideV5ImmediateCriticalDeath, previewSuddenDeath as previewV5SuddenDeath, decideSuddenDeath as decideV5SuddenDeath, updateCriticalDeathCountdown, previewAmputationShock as previewV5AmputationShock, applyAmputationShock as applyV5AmputationShock, amputationShockRequirements } from './v5-critical-aftermath.js';
import { encounterJournalScope, purgeEncounterJournal, purgeEncounterJournalHistory, tagNewEncounterLogs } from './encounter-journal.js';
import { momentumAfterChange, withMomentum } from './v5-combat-rules.js';
import { canUseV5Move } from './v5-combat-fumbles.js';
import { advanceGameClock, campaignDurationSeconds, createGameClock, deriveTurnPhasePlan, readCombatPosition, reconcileGameClockPosition } from './v5-game-time.js';
import { advanceCampaignSnapshot } from './v5-campaign-time.js';
import { proposeNewKeyword, referentialFromExtensions, setActiveReferential } from './creature-keywords.js';
import { attacksAreMagical } from './creature-natures.js';
import { validateFamiliarLink, buildFamiliarLink, familiarBackLink, familiarLinksOf, planFamiliarCreation, familiarLinkLabel, previewFamiliarCondition, previewFamiliarHealing, planFamiliarDeath, familiarDeathDamage } from './familiars.js';
import { hasRegeneration, planRegeneration } from './creature-regeneration.js';
import { hasManyHeads, headRegistryOf, applyHeadCritical, restoreHead, HEAD_STATES } from './creature-heads.js';
import { planPsychology, psychologyTraits } from './creature-psychology.js';
import { planSwarm, planStateOnWound } from './creature-states.js';
import { isSlann, contemplationOutcome } from './slann.js';
const withV5 = (participant, change) => ({ ...participant, extensions: { ...(participant.extensions || {}), v5: change(participant.extensions?.v5 || {}) } });
import { validatePrayerSLCaps,getPrayerSLModifiers } from './v5-divine-prayer-caps.js';
import { previewV5BrokenEscape, isV5BrokenEscapeActionBlocked, BROKEN_ESCAPE_SOURCE, BROKEN_ESCAPE_RULE_VERSION } from './v5-broken-escape.js';
import { previewGrappleTurnActionGate } from './v5-grappling.js';
import { initialV5ReloadState, createV5ReloadState, beginV5Reload, advanceV5Reload } from './v5-reloading.js';
import { previewV5ProjectileExtraction } from './v5-weapon-qualities.js';

function grappleTurnGateBlock(envelope,input,actor){
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
function criticalDeathToughnessBonus(participant){
 const stored=participant?.extensions?.v5?.criticalDeath?.toughnessBonus;
 if(Number.isSafeInteger(stored)&&stored>=0)return stored;
 const numericCarac=value=>((typeof value==='number'||typeof value==='string'&&value.trim()!=='')&&Number.isFinite(Number(value)))?Number(value):null;
 const explicit=numericCarac(participant?.caracs?.BE);
 if(explicit!==null&&Number.isSafeInteger(explicit)&&explicit>=0)return explicit;
 const endurance=numericCarac(participant?.caracs?.E);
 if(endurance===null||endurance<0)return null;
 return Math.floor(endurance/10);
}
function reconcileCriticalDeathForRound(envelope,round){
 for(const participant of envelope.combat?.participants||[]){
  const be=criticalDeathToughnessBonus(participant);
  if(be===null)continue;
  const result=updateCriticalDeathCountdown(participant,{round,toughnessBonus:be});
  if(result.participant)Object.assign(participant,result.participant);
 }
}
function reconcileCriticalDeathOnParticipantTransitions(before,next){
 const round=next.combat?.round;if(!Number.isSafeInteger(round)||round<0)return next;
 const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const unconscious=participant=>(participant?.states||[]).some(row=>['inconscient','unconscious'].includes(normalized(row.key||row.name))&&Number(row.level??1)>0);
 const criticalIds=participant=>(participant?.extensions?.v5?.criticalWounds||[]).map(row=>row?.id).filter(id=>typeof id==='string'&&id).sort();
 const sameCriticalIds=(left,right)=>{const a=criticalIds(left),b=criticalIds(right);return a.length===b.length&&a.every((id,index)=>id===b[index]);};
 const previous=new Map((before.combat?.participants||[]).map(row=>[row.id,row]));let changed=false;
 const participants=(next.combat?.participants||[]).map(participant=>{
  const old=previous.get(participant.id),nowUnconscious=unconscious(participant),wasUnconscious=unconscious(old);
  if(nowUnconscious===wasUnconscious&&sameCriticalIds(participant,old))return participant;
  const be=criticalDeathToughnessBonus(participant);if(be===null)return participant;
  const result=updateCriticalDeathCountdown(participant,{round,toughnessBonus:be});if(!result.participant)return participant;changed=true;return result.participant;
 });
 return changed?{...next,combat:{...next.combat,participants}}:next;
}

function prayerCapClockNeeds(participant, snapshot, path='participant'){
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
function recordV5ActionUsage(envelope,actorId,actionId){
 const clock=v5StoreActionClock(envelope);if(!clock.encounterId||!clock.turnId||envelope.combat?.currentActorId!==actorId)return {ok:true,tracked:false};
 envelope.extensions??={};envelope.extensions.v5??={};
 const rows=envelope.extensions.v5.standardTurnActions||[];
 if(!rows.some(row=>row.actionId===actionId))envelope.extensions.v5.standardTurnActions=[...rows,{actorId,actionId,encounterId:clock.encounterId,round:clock.round,turnId:clock.turnId,kind:'action'}].slice(-500);
 return {ok:true,clock};
}
function standardV5ActionSpent(envelope,actorId,clock=v5StoreActionClock(envelope)){
 return Boolean(clock.encounterId&&clock.turnId&&(envelope.extensions?.v5?.standardTurnActions||[]).some(row=>row.actorId===actorId&&row.encounterId===clock.encounterId&&row.turnId===clock.turnId));
}
function previewV5PaviseDeploymentFrom(envelope,input={}){
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
function combatActionState(envelope){return envelope.extensions?.v5?.combatActions||{byActorId:{},receipts:[]};}
function combatActionBlock(envelope,actorId){
 const clock=v5StoreActionClock(envelope),row=combatActionState(envelope).byActorId?.[actorId];
 return row&&row.turnId===clock.turnId&&row.encounterId===clock.encounterId
  ?{ready:false,status:'blocked',code:'F2_COMBAT_ACTION_SPENT',error:'Une Action de combat spéciale a déjà été dépensée pendant ce Tour.'}:null;
}
function ordinaryActionAfterCombatActionBlock(envelope,actorId){
 const block=combatActionBlock(envelope,actorId);return block?{...block,error:'Visée ou Défensive a déjà consommé l’Action de ce Tour.'}:null;
}
/** Keep magic mutations, Action use and loss of Aim in the same undoable command. */
function combatMagicActionStore(api,actorId){
 return {...api,executeCommand(type,mutator,options){return api.executeCommand(type,draft=>{
  const block=combatActionBlock(draft,actorId);if(block)throw Object.assign(new Error(block.error),{userFacing:true,code:block.code});
  const next=mutator(draft)||draft;
  if(next.extensions?.v5?.combatActions?.byActorId?.[actorId]?.kind==='aim')delete next.extensions.v5.combatActions.byActorId[actorId];
  recordV5ActionUsage(next,actorId,`${type}:${next.localRevision}`);
  return next;
 },options);}};
}
function canonicalFreeAttack(preview,input={}){
 const source=preview?.input||input,v5=source.v5||{},costs=preview?.actionCosts;
 if(v5.extraAttack!==true||!costs?.ready)return false;
 const waived=(costs.waived||[]).some(row=>row.resource==='momentum'&&Array.isArray(row.waivedBy)&&row.waivedBy.length>0);
 const quota=(costs.usages||[]).some(row=>row.quotaId!=='system:momentum-extra-attack'&&Number.isFinite(row.maximum)&&row.after<=row.maximum);
 return waived&&quota;
}
function brokenEscapeActionSpent(envelope,actorId,clock=v5StoreActionClock(envelope)){
 if(!clock.encounterId||!clock.turnId)return false;
 const key=JSON.stringify([clock.encounterId,clock.turnId]);
 return standardV5ActionSpent(envelope,actorId,clock)||(envelope.extensions?.v5?.actionLedger?.quotaUsage||[]).some(row=>row.actorId===actorId&&row.quotaId==='system:turn-action'&&row.scope==='turn'&&row.scopeKey===key&&row.used>0);
}
function combatReflexesActivation(input){return input?.v5?.context?.talentAction==='combat-reflexes';}
function combatReflexesAlreadyInitialized(envelope,input){
 if(!combatReflexesActivation(input))return false;
 const actorId=input?.actor?.id||input?.actorId,actor=envelope?.combat?.participants?.find(row=>row.id===actorId);
 return Boolean(actor?.extensions?.v5?.combatInitiative?.initialized||envelope?.extensions?.v5?.combatInitiativeInitialized);
}
const combatReflexesAlreadyDeterminedMessage='Combat instinctif a déjà déterminé l’Initiative de ce combat. Recommencez explicitement le combat pour la déterminer à nouveau.';
function isBrokenEscapeActor(actor){
 return (actor?.states||[]).some(row=>['brise','broken'].includes(String(row.key||row.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()));
}
function brokenEscapeActionBlock(envelope,actorId){
 const clock=v5StoreActionClock(envelope);
 return isBrokenEscapeActor(envelope.combat?.participants?.find(row=>row.id===actorId))&&brokenEscapeActionSpent(envelope,actorId,clock)
  ? {ready:false,status:'blocked',code:'BROKEN_ESCAPE_ACTION_SPENT',error:'Le quota Action du Tour est déjà dépensé pour ce personnage Brisé.'}
  : null;
}
function detonateDueV5Bombs(combat, completedActorId, completedTurnIndex){
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
function isV5ActionUse(preview,input={}){
 return preview?.attack===true||input?.attack===true||preview?.input?.v5?.context?.isAction===true||input?.v5?.context?.isAction===true;
}
function isExplicitV5NonAction(preview,input={}){
 return !isV5ActionUse(preview,input)&&(preview?.input?.v5?.context?.isAction===false||input?.v5?.context?.isAction===false);
}
function isV5SkillTest(preview,input={}){
 const source=preview?.input||input||{},action=source.action||input?.action||{};
 const kind=source.v5?.kind||input?.v5?.kind;
 return kind==='test'||['skill','defense','opposition'].includes(String(action.type||'').toLowerCase())||Boolean(source.defense||input?.defense);
}
function brokenEscapeActionClassificationBlock(actor,preview,input={}){
 if(!isBrokenEscapeActor(actor))return null;
 const source=preview?.input||input||{},action=source.action||input?.action||{};
 if(preview?.attack===true||source.attack===true||input?.attack===true||action.type==='attack'||input?.action?.type==='attack')return null;
 if(!isV5SkillTest(preview,input))return null;
 const classification=source.v5?.context?.isAction??input?.v5?.context?.isAction;
 if(typeof classification==='boolean')return null;
 return {ready:false,status:'requires-input',code:'BROKEN_ESCAPE_ACTION_CLASSIFICATION_REQUIRED',error:'Pr\u00e9ciser si ce Test consomme l\u2019Action du Tour.',needsInput:[{field:'v5.context.isAction',type:'boolean',label:'Ce Test consomme-t-il l\u2019Action du Tour ?'}]};
}
function throwBrokenEscapeActionClassification(block){
 if(block)throw Object.assign(new Error(block.error),{userFacing:true,code:block.code,needsInput:block.needsInput});
}
function hasV5ReactionOpportunity(prepared){
 return Boolean(prepared?.reactionValidation?.ready===true&&prepared.reactionValidation.opportunity);
}
function recordV5EscapeVisibility(envelope,actorId,visibleToAnyEnemy,sourceId){
 if(typeof visibleToAnyEnemy!=='boolean')return;
 const clock=v5StoreActionClock(envelope),root=envelope.extensions?.v5||{},escape=structuredClone(root.brokenEscape||{byActorId:{},receipts:[]});
 escape.receipts=[...(escape.receipts||[]),{id:`visibility:${sourceId}`,actorId,visibleToAnyEnemy,turn:clock,source:'explicit-gm',committedAtRevision:(envelope.localRevision||0)+1}].slice(-300);
 envelope.extensions??={};envelope.extensions.v5={...root,brokenEscape:escape};
}

// S-05 : un participant dont la base magique est suivie (couches, Forme bestiale) reçoit un patch de caractéristiques/armure comme nouvelle base.
const isMagicBased = p => Boolean(p?.extensions?.v5?.baseCaracs || p?.extensions?.v5?.spellEffects?.length || p?.extensions?.v5?.divineEffects?.length || p?.extensions?.v5?.beastForm);
// V5 p. 239 : Clairvoyance chaotique ne dure que le reste de la séance.
function clearSessionClairvoyance(participant) {
  if (participant.extensions?.v5?.corruptionPerFortuneSpent === undefined) return participant;
  const { corruptionPerFortuneSpent, ...v5 } = participant.extensions.v5;
  return { ...participant, extensions: { ...participant.extensions, v5 } };
}
// V5 p. 239 : un État lié à un effet d’incident irrévocable ne se retire pas à la main, ni par une modification brute de `states`.
function assertMiscastConditionsKept(before, after) {
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
function pickBaseLayers(participant, patch) {
  if (!(patch?.caracs || patch?.armor) || !isMagicBased(participant)) return {};
  const rebased = rebaseMagicLayers(participant, { caracs: patch.caracs, armor: patch.armor });
  return Object.fromEntries(['caracs', 'armor', 'M', 'movement', 'extensions'].filter(key => rebased[key] !== undefined).map(key => [key, rebased[key]]));
}
import { Profile, Participant, DiceLine, uid, cloneValue, normalizeCaracs, canonicalizeProfileFields, normalizeFicheFields, FICHE_DATA_FIELDS } from './models.js';
import { sanitizeArray, sanitizeProfile, sanitizeParticipant, sanitizeMagicEnvelope } from './sanitize.js';
import { migrateSnapshot, migrateLegacyStorage, CURRENT_SCHEMA_VERSION } from './migrations.js';
import { createStateCommand } from './commands.js';
import { createHistory, recordCommand, canUndo as historyCanUndo, canRedo as historyCanRedo, undo as historyUndo, redo as historyRedo, historySnapshot, markExternalBoundary } from './history.js';
import { ORDER_MODES, effectiveOrder, moveInOrder, insertReinforcement, insertParticipantsByInitiative, setOrderMode as computeOrderMode, nextTurn as computeNextTurn, removeFromCombat, prepareCombatInitiative } from './turn-order.js';
import { createEncounter, normalizeEncounter, setEncounterEntry, removeEncounterEntry, duplicateEncounter, launchEncounter, addImprovisedParticipant, suspendScene, resumeScene } from './encounters.js';
import { previewResolution as buildResolutionPreview, applyResolution as applyActionResolution } from './resolution.js';
import { simulateAction, applySimulation as applyActionSimulation, discardSimulation } from './simulation.js';
import { deriveReminders, pendingReminders, resolveReminder } from './reminders.js';
import { createScene, createIntention, createSceneEvent, createSceneClock, proposeSceneEvent, resolveSceneEvent, applySceneEvent, advanceSceneClock } from './scene-events.js';
import { sharedState, sameSharedState } from './sync-protocol.js';
import { applyFicheSync as applyFicheSyncToDraft } from './fiche-sync.js';
import { convertLegacyV4Profile } from './v5-legacy-conversion.js';
import { planMountedFall, V5_RIDE_SKILL_ID } from './v5-mounted-combat.js';
import { createAftermathState, validateAftermathState, registerWoundIncident, previewAftermathAdvance, advanceAftermathCalendar, treatWoundIncident, treatInfection, treatSurgicalIncident } from './v5-aftermath.js';

export const KEY = { EXTENSIONS: 'wfrp.extensions.v1', RESERVE: 'wfrp.reserve.v1', COMBAT: 'wfrp.combat.v1', LOG: 'wfrp.log.v1', DICE: 'wfrp.dice.v1', TS: 'wfrp.sync.ts.v1' };

function newV5ParticipantOrder(before, participants) {
  const combat = before.combat;
  if (before.extensions?.v5?.combatInitiativeInitialized) return insertParticipantsByInitiative(combat, participants);
  if (!combat?.round || before.extensions?.v5?.orderRound !== combat.round || combat.orderMode === ORDER_MODES.MANUAL) return null;
  return insertParticipantsByInitiative(combat, participants);
}
function registerNewV5Participants(before, next) {
  const oldIds = new Set((before.combat?.participants || []).filter(participant => participant.zone === 'active').map(participant => participant.id));
  if (!(next.combat?.participants || []).some(participant => participant.zone === 'active' && !oldIds.has(participant.id))) return;
  if(before.extensions?.v5?.combatInitiativeInitialized){
    // Une invocation qui apparaît après le tirage du Round 0 est un PNJ nouveau :
    // son initiative doit être tirée immédiatement (d10 + Bonus d'Initiative),
    // puis il rejoint l'ordre au rang correspondant. Les arrivées ordinaires
    // conservent leur comportement de renfort.
    if (before.combat?.round === 0) {
      for (const participant of next.combat.participants || []) {
        if (participant.zone !== 'active' || oldIds.has(participant.id)) continue;
        const v5 = participant.extensions?.v5 || {};
        const summoned = v5.summonedBySpellId || v5.divineSummon || v5.divineWrathSummon;
        const characteristic = Number.isInteger(participant.caracs?.I) ? participant.caracs.I : participant.initiative;
        if (!summoned || !Number.isInteger(characteristic) || characteristic < 0) continue;
        const die = Math.floor(Math.random() * 10) + 1;
        participant.extensions = { ...(participant.extensions || {}), v5: { ...v5,
          combatInitiative: { die, characteristic, characteristicSource: Number.isInteger(participant.caracs?.I) ? 'caracs.I' : 'initiative',
            bonus: Math.floor(characteristic / 10), score: die + Math.floor(characteristic / 10), initialized: true, summoned: true }
        } };
      }
    }
    const resolved=before.extensions?.v5?.combatInitiativeResolution||{},canonical={...before.combat,order:resolved.order||before.combat?.order||[]};
    const automatic=insertParticipantsByInitiative(canonical,next.combat.participants);
    const actual=before.combat?.orderMode===ORDER_MODES.MANUAL?insertParticipantsByInitiative(before.combat,next.combat.participants):automatic;
    const byId=new Map((next.combat.participants||[]).map(row=>[row.id,row]));
    const bench=(next.combat.order||[]).filter(id=>byId.get(id)?.zone==='bench'&&!actual.includes(id));
    next.combat.order=[...actual,...bench];
    next.extensions={...(next.extensions||{}),v5:{...(next.extensions?.v5||{}),combatInitiativeInitialized:true,combatInitiativeResolution:{...resolved,order:automatic}}};
    return;
  }
  const order = newV5ParticipantOrder(before, next.combat.participants);
  if (order) next.combat.order = order;
}
function withoutCombatInitiativeResolution(extensions) {
  const next={...(extensions||{})},v5={...(extensions?.v5||{})};
  delete v5.combatInitiativeInitialized; delete v5.combatInitiativeResolution; delete v5.orderRound;
  next.v5=v5; return next;
}
function freshCombatScopedV5(value, combatScopeId = uid()) {
  const { combatActions, standardTurnActions, ...v5 } = value || {};
  return { ...v5, combatScopeId, turnIndex: 1 };
}
function clearV5FortuneAdvantageDeclaration(envelope,actorId){
  const v5=envelope.extensions?.v5||{},rows=v5.fortuneAdvantageDeclarations||[];
  if(!rows.some(row=>row.actorId===actorId))return envelope;
  return {...envelope,extensions:{...(envelope.extensions||{}),v5:{...v5,fortuneAdvantageDeclarations:rows.filter(row=>row.actorId!==actorId)}}};
}
function clearMountedRelation(participant) {
  if (!participant?.extensions?.v5 || (participant.extensions.v5.mounted !== true && !participant.extensions.v5.mountId)) return participant;
  return withV5(participant, v5 => { const { mountId, ...rest } = v5; return { ...rest, mounted: false }; });
}
function dismountLinkedRiders(participants, mountId) {
  return (participants || []).map(participant => participant?.extensions?.v5?.mounted === true
    && participant.extensions.v5.mountId === mountId ? clearMountedRelation(participant) : participant);
}

export function createStore({ storage = typeof localStorage !== 'undefined' ? localStorage : null, sync = null, persistence = null, persistenceFactory = null, contextId = 'guest', divineAuthority = 'MJ', appVersion = 'unknown', bus = null, now = () => new Date().toLocaleTimeString(), onSyncStatus = null, onLocalStatus = null, onReady = null } = {}) {
  const CLIENT_ID = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : uid();

  let reserve = new Map();
  let combat = { round: 0, currentActorId: null, order: [], participants: new Map() };
  let log = [];
  let diceLines = [];
  let stateExtensions = {};
  let encounters = [];
  let persistentCharacters = [];
  let archives = [];
  let activeScene = null;
  let suspendedScenes = [];
  let reminderChoices = [];
  let lastReminderTransition = {};
  let appliedResolutionIds = [];
  let historyState = createHistory();
  let pendingCommandBefore = null;
  let pendingCommandType = null;
  let orderMode = ORDER_MODES.AUTOMATIC;
  const issuedBrokenEscapePreviews = new Map();
  const issuedPaviseDeploymentPreviews = new Map();
  let localRevision = 0;
  let lastRemoteRevision = -1;
  let turnSelectionPending = false;
  let lastAppliedTimestamp = 0;
  let hydrationComplete = !persistence;
  let hydrationFailed = false;
  let persistenceQueue = Promise.resolve();
  // All persistent commands are serialized before they can observe or replace
  // live state.  This is separate from the IDB write queue: a later command
  // must be built from the durable result of the previous one, otherwise a
  // rejected first write could roll back a second command.
  let commandQueue = Promise.resolve();
  let latestPersistenceToken = null;
  let operationSequence = 0;
  let hydrationInFlight = null;
  let importInFlight = null;
  let resolveReady;
  const readyPromise = new Promise(resolve => { resolveReady = resolve; });
  let syncEnabled = !persistence;
  let syncSession = null;
  let syncSessionReady = false;
  let syncSessionStarting = false;
  let syncContextId = null;
  let syncAttachEpoch = 0;
  let pendingProtocolState = false;
  let guestImportCandidate = null;
  let legacyImportCandidate = null;

  let batchDepth = 0;
  let savePending = false;
  const pendingEvents = new Set();

  function parseTimestamp(ts) {
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') {
      const parsed = Date.parse(ts);
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  }

  function validateCommandEnvelope(value) {
    const visit = (node, path = '$') => {
      if (typeof node === 'number' && !Number.isFinite(node)) throw new Error(`Valeur numérique invalide dans ${path}`);
      if (Array.isArray(node)) return node.forEach((child, index) => visit(child, `${path}[${index}]`));
      if (node && typeof node === 'object') Object.entries(node).forEach(([key, child]) => visit(child, `${path}.${key}`));
    };
    visit(value);
    if (!value || value.schemaVersion !== CURRENT_SCHEMA_VERSION || !Array.isArray(value.reserve) || !value.combat || typeof value.combat !== 'object') {
      throw new Error('Enveloppe de commande invalide');
    }
    for (const [index, profile] of value.reserve.entries()) {
      if (!profile || typeof profile.id !== 'string' || !profile.id.trim()) throw new Error(`Profil invalide à reserve[${index}]`);
    }
    const participants = Array.isArray(value.combat.participants) ? value.combat.participants : [];
    for (const [index, participant] of participants.entries()) {
      if (!participant || typeof participant.id !== 'string' || !participant.id.trim()) throw new Error(`Participant invalide à combat.participants[${index}]`);
    }
    if (!Array.isArray(value.log) || !Array.isArray(value.diceLines)) throw new Error('Journal ou lignes de dés invalides');
    return value;
  }

  function emitBus(event, payload) {
    if (batchDepth > 0) {
      if (event === 'combat:update') {
        pendingEvents.add('combat');
      } else {
        pendingEvents.add(event);
      }
    } else {
      if (bus && bus.emit) bus.emit(event, payload);
    }
  }

  function shieldAfterAttack(participants, preview, round) {
    const actorId = preview?.actorId || preview?.input?.actor?.id;
    if(['attack','attaque'].includes(preview?.input?.action?.type)){participants=endSpellEffectsOnEvent(participants,actorId,'attack');if(preview.targetId)participants=endSpellEffectsOnEvent(participants,preview.targetId,'incoming-attack');}
    const equipmentId = preview?.shieldAttack?.confirmed ? preview.shieldAttack.shieldId
      : preview?.input?.action?.extensions?.fiche?.equipmentId;
    if (!preview?.attack || !equipmentId) return participants;
    return participants.map(actor => {
      if (actor.id !== actorId || !actor.equipment?.some(item => item.id === equipmentId && item.kind === 'shield')) return actor;
      const unavailable = Array.isArray(actor.extensions?.shieldUnavailable) ? actor.extensions.shieldUnavailable : [];
      return { ...actor, extensions: { ...actor.extensions,
        shieldUnavailable: [...new Set([...unavailable, equipmentId])],
        shieldUnavailableCause: { ...actor.extensions?.shieldUnavailableCause, [equipmentId]: { resolutionId: preview.resolutionId, round } } } };
    });
  }
  function repairMaxHp(list) {
    list.forEach(p => {
      if (p.maxHp === undefined) {
        const prof = p.profileId ? reserve.get(p.profileId) : null;
        p.maxHp = prof ? Number(prof.maxHp ?? prof.hp) : null;
      }
    });
    return list;
  }

  const dirtyPaths = new Map();
  let firstFlush = true;

  function markDirty(path, val) {
    dirtyPaths.set(path, val);
  }

  // Le journal ne contient que des objets depuis le lot 10. Les entrées écrites avant
  // sont des chaînes : les accepter en les étiquetant 'legacy' plutôt que les jeter.
  // Appelée depuis load() ET loadFromJSON() — ces deux chemins ont divergé quatre fois.
  function normalizeLogEntries(list) {
    if (!Array.isArray(list)) return [];
    const out = list.map(item => {
      if (typeof item === 'string') return { id: uid(), ts: 0, time: '', kind: 'legacy', text: item };
      return (item && typeof item === 'object') ? item : null;
    }).filter(Boolean);
    if (out.length > 300) out.length = 300;
    return out;
  }

  function cleanupDiceLinesForParticipants(participantIds) {
    const ids = new Set(participantIds);
    const kept = [];
    diceLines.forEach(dl => {
      // Une ligne attachée à un combattant appartient au combat et ne doit pas
      // survivre à son retrait. Les lignes sans participantId sont des jets
      // indépendants (par exemple un d100 du MJ) et restent dans l'affichage.
      if (dl.participantId && ids.has(dl.participantId)) {
        markDirty(`diceLines/${dl.id}`, null);
        return;
      }
      if (dl.targetId && ids.has(dl.targetId)) {
        dl.targetId = null;
        markDirty(`diceLines/${dl.id}`, dl);
      }
      kept.push(dl);
    });
    diceLines = kept;
  }

  let lastSnapshot = null;
  let pendingRestore = null;

  function beginCommand(type = 'state-change') {
    // The legacy localStorage façade keeps its historical snapshot/undo
    // behavior. Structured command history is produced by executeCommand;
    // direct legacy mutators must not make every old UI keystroke undoable.
    if (persistence && pendingCommandBefore === null && canMutate()) {
      pendingCommandBefore = JSON.parse(JSON.stringify(currentEnvelope()));
      delete pendingCommandBefore.history;
      pendingCommandType = type;
    }
  }

  function commitPendingCommand() {
    if (!pendingCommandBefore) return;
    const before = pendingCommandBefore;
    const after = JSON.parse(JSON.stringify(currentEnvelope()));
    delete after.history;
    localRevision++;
    after.localRevision = localRevision;
    try {
      historyState = recordCommand(historyState, createStateCommand({
        id: `${CLIENT_ID}:command:${localRevision}`,
        type: pendingCommandType || 'state-change',
        before,
        after,
        baseRevision: localRevision - 1
      }));
    } finally {
      pendingCommandBefore = null;
      pendingCommandType = null;
    }
  }

  function recordSnapshot(reason = 'manual') {
    if (!persistence) beginCommand(reason);
    // Tout est cloné en profondeur, y compris la réserve et les participants.
    // Array.from(map.values()) ne rendrait que des références vivantes : une modification
    // en place postérieure à l'instantané (Object.assign dans updateProfile ou
    // updateParticipant) le contaminerait, et undo() restaurerait un état incohérent —
    // les éléments supprimés reviendraient, mais les champs modifiés depuis resteraient.
    lastSnapshot = JSON.parse(JSON.stringify({
      timestamp: new Date().toISOString(),
      reserve: Array.from(reserve.values()),
      combat: {
        round: combat.round,
        currentActorId: combat.currentActorId,
        order: combat.order,
        participants: Array.from(combat.participants.values())
      },
      log,
      diceLines,
      extensions: stateExtensions
    }));
    if (persistence) pendingRestore = { id: uid(), reason, state: lastSnapshot };
  }

  // Older saves (text import before canonical keys) stored `e`, `cc`… in every
  // projection; scenes and persistent characters bypass sanitizeParticipant.
  function withCanonicalCaracs(item) {
    return item && typeof item === 'object' && item.caracs && typeof item.caracs === 'object'
      ? { ...item, caracs: normalizeCaracs(item.caracs) } : item;
  }

  function withCanonicalSceneCaracs(scene) {
    return scene && typeof scene === 'object' && Array.isArray(scene.participants)
      ? { ...scene, participants: scene.participants.map(withCanonicalCaracs) } : scene;
  }

  function applyDataToState(data, { includeLog = false, includeHistory = true } = {}) {
    data = projectV5ResourceEnvelope(sanitizeMagicEnvelope(data));
    stateExtensions = data.extensions && typeof data.extensions === 'object' && !Array.isArray(data.extensions)
      ? JSON.parse(JSON.stringify(data.extensions)) : {};
    setActiveReferential(referentialFromExtensions(stateExtensions).referential);
    encounters = Array.isArray(data.encounters) ? cloneValue(data.encounters) : [];
    persistentCharacters = Array.isArray(data.persistentCharacters) ? cloneValue(data.persistentCharacters).map(withCanonicalCaracs) : [];
    archives = Array.isArray(data.archives) ? cloneValue(data.archives) : [];
    activeScene = data.activeScene && typeof data.activeScene === 'object' ? withCanonicalSceneCaracs(cloneValue(data.activeScene)) : null;
    suspendedScenes = Array.isArray(data.suspendedScenes) ? cloneValue(data.suspendedScenes).map(withCanonicalSceneCaracs) : [];
    reminderChoices = Array.isArray(data.reminderChoices) ? cloneValue(data.reminderChoices) : [];
    appliedResolutionIds = Array.isArray(data.appliedResolutionIds) ? [...data.appliedResolutionIds] : [];
    pendingProtocolState = Boolean(data.syncPending);
    localRevision = Number.isInteger(data.localRevision) && data.localRevision >= 0 ? data.localRevision : localRevision;
    if (includeHistory) historyState = data.history ? historySnapshot(data.history) : createHistory();
    orderMode = data.combat?.meta?.orderMode || data.combat?.orderMode || ORDER_MODES.AUTOMATIC;
    const rawReserve = sanitizeArray(data.reserve);
    const validProfiles = rawReserve.map(sanitizeProfile).filter(Boolean);
    if (rawReserve.length !== validProfiles.length)
      console.warn(`[Sync] ${rawReserve.length - validProfiles.length} profil(s) rejeté(s) (schéma invalide)`);
    reserve = new Map(validProfiles.map(o => [o.id, new Profile(o)]));

    const c = data.combat || {};
    const meta = c.meta || c;
    combat.round = Number(meta.round) || 0;

    const rawParts = sanitizeArray(c.participants);
    const validParts = repairMaxHp(rawParts.map(sanitizeParticipant).filter(Boolean));
    combat.participants = new Map(validParts.map(p => [p.id, new Participant(p)]));

    const validIds = new Set(combat.participants.keys());
    const rawOrder = sanitizeArray(meta.order || c.order).filter(id => typeof id === 'string' && validIds.has(id));
    combat.order = rawOrder;

    if (meta.currentActorId !== undefined || c.currentActorId !== undefined) {
      const cur = meta.currentActorId !== undefined ? meta.currentActorId : c.currentActorId;
      combat.currentActorId = (typeof cur === 'string' && validIds.has(cur)) ? cur : null;
    } else if (c.turnIndex !== undefined && Number(c.turnIndex) >= 0 && Number(c.turnIndex) < rawOrder.length) {
      combat.currentActorId = rawOrder[Number(c.turnIndex)] || null;
    } else {
      combat.currentActorId = null;
    }

    // Older snapshots stored the newly introduced scene and combat projections
    // independently. Rehydrate either side from the populated projection so a
    // reload cannot drop persistent-character links or live HP changes.
    if (activeScene && activeScene.status === 'active') {
      const sceneParticipants = Array.isArray(activeScene.participants) ? activeScene.participants : [];
      if (combat.participants.size === 0 && sceneParticipants.length) {
        combat.round = Number(activeScene.round) || 0;
        combat.currentActorId = activeScene.currentActorId || null;
        combat.order = Array.isArray(activeScene.order) ? [...activeScene.order] : [];
        const restored = repairMaxHp(sceneParticipants.map(sanitizeParticipant).filter(Boolean));
        combat.participants = new Map(restored.map(p => [p.id, new Participant(p)]));
      } else if (combat.participants.size && sceneParticipants.length === 0) {
        activeScene = { ...activeScene, round: combat.round, currentActorId: combat.currentActorId, order: [...combat.order], participants: cloneValue(Array.from(combat.participants.values())) };
      }
    }

    if (includeLog) log = normalizeLogEntries(data.log);
    // Le journal ne provient PLUS de Firebase (Lot 9.2) — local uniquement
    diceLines = sanitizeArray(data.diceLines).map(x => new DiceLine(x));
  }

  const pendingSync = new Map();
  let syncTimer = null;
  let syncInFlight = false;
  let syncRetryDelay = 300;

  function reportSyncStatus(status) {
    if (typeof onSyncStatus === 'function') onSyncStatus(status);
  }

  function reportLocalStatus(status) {
    if (typeof onLocalStatus === 'function') onLocalStatus(status);
  }

  function canMutate() {
    return !importInFlight && (!persistence || (hydrationComplete && !hydrationFailed));
  }

  function mergePathUpdates(target, incoming) {
    for (const [path, value] of Object.entries(incoming)) {
      // Un remplacement/suppression d'un parent rend obsolètes ses enfants.
      for (const existingPath of target.keys()) {
        if (existingPath === path || existingPath.startsWith(`${path}/`)) target.delete(existingPath);
      }
      // Si le parent est déjà en file, intégrer le dernier enfant dans sa
      // valeur évite d'envoyer deux chemins qui se recouvrent à Firebase.
      const parentPath = [...target.keys()].find(existingPath => path.startsWith(`${existingPath}/`));
      if (parentPath) {
        const parentValue = target.get(parentPath);
        const mergedParent = parentValue && typeof parentValue === 'object'
          ? JSON.parse(JSON.stringify(parentValue)) : {};
        let cursor = mergedParent;
        const segments = path.slice(parentPath.length + 1).split('/');
        segments.forEach((segment, index) => {
          if (index === segments.length - 1) cursor[segment] = JSON.parse(JSON.stringify(value));
          else {
            if (!cursor[segment] || typeof cursor[segment] !== 'object') cursor[segment] = {};
            cursor = cursor[segment];
          }
        });
        target.set(parentPath, mergedParent);
        continue;
      }
      target.set(path, value === undefined ? value : JSON.parse(JSON.stringify(value)));
    }
  }

  function scheduleSync(delay = 300) {
    if (syncTimer || syncInFlight || pendingSync.size === 0) return;
    syncTimer = setTimeout(() => {
      syncTimer = null;
      flushSync();
    }, delay);
  }

  function flushSync() {
    if (syncInFlight || pendingSync.size === 0 || !(sync && sync.dbRef)) return;
    const batch = new Map([...pendingSync].map(([path, value]) => [path, value === undefined ? value : JSON.parse(JSON.stringify(value))]));
    pendingSync.clear();
    syncInFlight = true;
    reportSyncStatus('sending');
    const updates = Object.fromEntries(batch);
    let write;
    try {
      if (sync.update) write = sync.update(sync.dbRef, updates);
      else if (sync.set) write = sync.set(sync.dbRef, updates);
      else write = Promise.resolve();
    } catch (error) {
      write = Promise.reject(error);
    }
    Promise.resolve(write).then(() => {
      syncInFlight = false;
      syncRetryDelay = 300;
      reportSyncStatus(pendingSync.size > 0 ? 'pending' : 'synced');
      scheduleSync();
    }).catch(error => {
      console.error('❌ Erreur sync → Firebase:', error);
      // Les modifications arrivées pendant l'envoi restent prioritaires en cas
      // de chevauchement ; le lot échoué est remis avant leurs chemins.
      const retry = new Map(batch);
      mergePathUpdates(retry, Object.fromEntries(pendingSync));
      pendingSync.clear();
      mergePathUpdates(pendingSync, Object.fromEntries(retry));
      syncInFlight = false;
      reportSyncStatus('error');
      scheduleSync(syncRetryDelay);
      syncRetryDelay = Math.min(syncRetryDelay * 2, 10000);
    });
  }

  function enqueueSync(updates) {
    if (!syncEnabled || !sync || !sync.dbRef) return;
    mergePathUpdates(pendingSync, updates);
    reportSyncStatus('pending');
    scheduleSync();
  }

  function currentEnvelope() {
    // Combat remains the canonical live editing surface.  When an active scene
    // exists, mirror its participant snapshot before serialising so legacy and
    // persistent stores cannot diverge after a direct combat mutation.
    let exportedScene = activeScene;
    if (activeScene && activeScene.status === 'active') {
      exportedScene = {
        ...activeScene,
        round: combat.round,
        currentActorId: combat.currentActorId,
        order: [...combat.order],
        participants: cloneValue(Array.from(combat.participants.values()))
      };
    }
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      appVersion,
      exportedAt: new Date().toISOString(),
      contextId,
      reserve: Array.from(reserve.values()),
      combat: {
        round: combat.round,
        currentActorId: combat.currentActorId,
        order: combat.order,
        orderMode,
        participants: Array.from(combat.participants.values())
      },
      log,
      diceLines,
      history: historyState,
      localRevision,
      encounters: cloneValue(encounters),
      persistentCharacters: cloneValue(persistentCharacters),
      archives: cloneValue(archives),
      ...(exportedScene ? { activeScene: cloneValue(exportedScene) } : {}),
      ...(suspendedScenes.length ? { suspendedScenes: cloneValue(suspendedScenes) } : {}),
      ...(reminderChoices.length ? { reminderChoices: cloneValue(reminderChoices) } : {}),
      ...(appliedResolutionIds.length ? { appliedResolutionIds: [...appliedResolutionIds] } : {}),
      ...(pendingProtocolState ? { syncPending: true } : {}),
      ...(Object.keys(stateExtensions).length ? { extensions: stateExtensions } : {})
    };
  }

  function restoreSourcePreview(record) {
    if (!record || typeof record !== 'object') throw new Error('Point de restauration invalide');
    const source = record.state;
    let migrated;
    if (source && source.format === 'legacy-localStorage' && source.keys && typeof source.keys === 'object') {
      const legacyStorage = {
        getItem(key) {
          return Object.prototype.hasOwnProperty.call(source.keys, key) ? source.keys[key] : null;
        }
      };
      migrated = migrateLegacyStorage(legacyStorage, { appVersion, contextId });
    } else {
      migrated = migrateSnapshot(source, { appVersion, contextId });
    }
    const data = migrated.data;
    const incomingProfileIds = new Set(data.reserve.map(profile => profile.id));
    const incomingParticipantIds = new Set(data.combat.participants.map(participant => participant.id));
    return {
      id: record.id,
      contextId: record.contextId,
      createdAt: record.createdAt,
      reason: record.reason || 'manual',
      sourceFormat: source?.format || 'snapshot-v2',
      data,
      report: migrated.report,
      counts: {
        profiles: data.reserve.length,
        participants: data.combat.participants.length,
        rejected: migrated.report.rejected.length,
        repaired: migrated.report.repaired.length,
        replacedProfiles: [...reserve.keys()].filter(id => incomingProfileIds.has(id)).length,
        replacedParticipants: [...combat.participants.keys()].filter(id => incomingParticipantIds.has(id)).length
      }
    };
  }

  // History commands describe editable shared state.  The journal and other
  // device-local choices continue evolving while a command is in the undo
  // stack, so replaying an older snapshot must not resurrect an old journal.
  function preserveLocalStateDuringHistory(state) {
    const current = currentEnvelope();
    return {
      ...state,
      // The journal is appended by independent local events and is therefore
      // intentionally outside command undo/redo. Other collections remain in
      // the snapshot because commands such as reminder decisions
      // must be reversible.
      log: cloneValue(current.log)
    };
  }

  const RESOLUTION_TYPE_LABELS = { attack: 'Attaque', skill: 'Compétence', test: 'Test', defense: 'Défense', opposition: 'Opposition' };

  function resolutionLogEntry(preview, resolution) {
    const rawInput = preview?.input || {};
    const { v5State, ...input } = rawInput;
    const actor = input.actor || {};
    const target = input.target || {};
    const actionType = preview?.actionType || input.action?.type || 'action';
    const targetLabel = target.name || preview?.targetId || 'cible';
    const outcome = preview?.success ? 'réussite' : 'échec';
    const opposed = preview?.opposition?.mode === 'opposed' ? preview.opposition : null;
    const wounds = Math.min(Math.max(0, Number(target.hp) || 0), (preview.damage?.finalDamage || 0) + (preview.critical?.application?.extraWounds || 0));
    const manualDamage = preview?.weapon?.status === 'manual' ? ` · dégâts à arbitrer (${preview.weapon.text})` : '';
    return {
      id: uid(), ts: Date.now(), kind: 'resolution',
      encounterId: activeScene?.encounterId || null, sceneId: activeScene?.id || null,
      actorId: actor.id || input.actorId || null,
      targetId: target.id || preview?.targetId || null,
      actorName: actor.name || null, targetName: target.name || null,
      text: `${RESOLUTION_TYPE_LABELS[actionType] || 'Action'} — ${opposed ? preview.hit ? 'touché' : 'pas de touche' : outcome} sur ${targetLabel} · DR ${opposed?.netSl ?? preview.sl}${preview.damage || preview.critical?.application?.extraWounds ? ` · ${wounds} Blessures` : ''}${manualDamage}${preview.critical ? ' · critique' : ''}${preview.defenderCritical ? ' · critique défensif' : ''}${preview.familiarConditionRefusals?.length ? ` · États refusés : ${preview.familiarConditionRefusals.map(row => `${row.name || 'Homoncule'} (${row.state})`).join(', ')}` : ''}`,
      detail: {
        ...(opposed ? { hit: Boolean(preview.hit), opposition: opposed } : {}),
        ruleVersion: preview.ruleVersion,
        input: cloneValue(input),
        test: cloneValue(preview.test),
        defenderTest: cloneValue(preview.defenderTest),
        defenderCritical: cloneValue(preview.defenderCritical),
        momentum: cloneValue(preview.momentum),
        resolutionId: preview?.resolutionId || null,
        actionType,
        roll: preview?.roll ?? null,
        targetScore: preview?.score?.target ?? null,
        sl: preview?.sl ?? null,
        resultTier: cloneValue(preview?.resultTier),
        defenderResultTier: cloneValue(preview?.defenderTest?.resultTier),
        ...(preview?.slBonus ? { slBonus: preview.slBonus } : {}),
        ...(preview?.location ? { location: { roll: preview.location.roll, name: preview.location.name } } : {}),
        damage: preview?.damage || null,
        supplementalEquipment: cloneValue(preview?.supplementalEquipment || null),
        ...(preview?.weapon ? { weapon: preview.weapon } : {}),
        critical: preview?.critical || null,
        fumble: preview?.fumble || null,
        ...(preview?.referenceVersion ? { referenceVersion: preview.referenceVersion } : {}),
        ...(preview?.mechanics ? { mechanics: cloneValue(preview.mechanics) } : {}),
        ...(preview?.protection ? { protection: cloneValue(preview.protection) } : {}),
        action: cloneValue(input.action || {}),
        ...(input.ammunitionId ? { ammunitionId: input.ammunitionId, ammunitionSources: cloneValue(input.ammunitionSources || []) } : {}),
        source: { actor: cloneValue(actor.ficheSnapshot?.source || null), target: cloneValue(target.ficheSnapshot?.source || null) },
        ...(preview?.talentTrace ? { talentTrace: cloneValue(preview.talentTrace) } : {}),
        ...(preview?.talents ? { talents: cloneValue(preview.talents) } : {}),
        ...(preview?.familiarConditionRefusals?.length ? { familiarConditionRefusals: cloneValue(preview.familiarConditionRefusals) } : {}),
        ...(preview?.weaponConditions ? { weaponConditions: cloneValue(preview.weaponConditions), targetConditionApplication: cloneValue(preview.targetConditionApplication), reminders: cloneValue(preview.reminders || []) } : {}),
        ...(preview?.talentPlans ? { talentPlans: cloneValue(preview.talentPlans), activeEffects: cloneValue(preview.activeEffects), damageReplacedByTalent: preview.damageReplacedByTalent, secondaryTargets: cloneValue(preview.secondaryTargets||[]) } : {}),
        ...(preview?.scatter ? { scatter: cloneValue(preview.scatter) } : {}),
        ...(preview?.engagedShot ? { engagedShot: cloneValue(preview.engagedShot) } : {}),
        ...(preview?.trip ? { trip: cloneValue(preview.trip) } : {}),
        ...(preview?.tripFall ? { tripFall: cloneValue(preview.tripFall) } : {}),
        ...(preview?.lethalDeath ? { lethalDeath: cloneValue(preview.lethalDeath) } : {}),
        ...(preview?.extraordinaryShot ? { extraordinaryShot: cloneValue(preview.extraordinaryShot) } : {}),
        ...(preview?.rangedRange ? { rangedRange: cloneValue(preview.rangedRange) } : {}),
        ...(preview?.meleeReachGuide ? { meleeReachGuide: cloneValue(preview.meleeReachGuide) } : {}),
        ...(resolution?.actionCostReceipt ? { actionCostReceipt: cloneValue(resolution.actionCostReceipt) } : {}),
        ...(resolution?.talentUsageReceipts?.length ? { talentUsageReceipts: cloneValue(resolution.talentUsageReceipts) } : {}),
        application: resolution?.application || null
      }
    };
  }

  function assertEditRevision(expected, actual) {
    if (expected !== undefined && expected !== actual) throw Object.assign(new Error('La séance a changé pendant l’enregistrement. Votre saisie est conservée : vérifiez les données actualisées, puis réessayez.'), { code: 'LOCAL_EDIT_STALE', userFacing: true });
  }

const CORRUPTION_SKILL_IDS = Object.freeze({
  resistance: 'skill-52_e9_73_69_73_74_61_6e_63_65-base',
  calm: 'skill-43_61_6c_6d_65-base'
});
const corruptionIdentity = row => row?.extensions?.ficheId || row?.ficheSnapshot?.charId || row?.persistentCharacterId || row?.id;
function findCorruptionSubject(envelope, id) {
  return (envelope.combat?.participants || []).find(row => row.id === id)
    || (envelope.reserve || []).find(row => row.id === id)
    || (envelope.persistentCharacters || []).find(row => row.id === id)
    || null;
}
function updateCorruptionCopies(envelope, id, transform) {
  const subject = findCorruptionSubject(envelope, id);
  if (!subject) throw new TypeError('Personnage introuvable');
  const identity = corruptionIdentity(subject);
  const update = rows => (rows || []).map(row => row.id === id || corruptionIdentity(row) === identity ? transform(cloneValue(row)) : row);
  envelope.reserve = update(envelope.reserve);
  envelope.persistentCharacters = update(envelope.persistentCharacters);
  envelope.combat = { ...(envelope.combat || {}), participants: update(envelope.combat?.participants) };
  if (envelope.activeScene) envelope.activeScene = { ...envelope.activeScene, participants: update(envelope.activeScene.participants) };
  envelope.suspendedScenes = (envelope.suspendedScenes || []).map(scene => ({ ...scene, participants: update(scene.participants) }));
  return findCorruptionSubject(envelope, id);
}
function corruptionFacts(participant) {
  const toughnessScore = Number(participant?.caracs?.E), willpowerScore = Number(participant?.caracs?.FM);
  if (!Number.isSafeInteger(toughnessScore) || toughnessScore < 0
    || !Number.isSafeInteger(willpowerScore) || willpowerScore < 0) {
    throw Object.assign(new Error('Bonus d’Endurance et de Force Mentale connus requis pour calculer le seuil.'), { code: 'CORRUPTION_FACTS_REQUIRED', userFacing: true });
  }
  const toughnessBonus = Math.floor(toughnessScore / 10), willpowerBonus = Math.floor(willpowerScore / 10);
  const pureSoul = (participant.talents || []).some(row => row?.id === 'talent-pure-soul' && row.status === 'resolved');
  return { toughnessBonus, willpowerBonus, pureSoul, threshold: calculateCorruptionThreshold({ toughnessBonus, willpowerBonus, pureSoul }) };
}
function corruptionSkillScore(participant, skillId, input = {}) {
  const skill = (participant.skills || []).find(row => row?.id === skillId && row.status !== 'unresolved');
  const rawScore = skill?.total ?? skill?.value;
  if (Number.isSafeInteger(rawScore) && rawScore >= 0 && rawScore <= 100) return { score: rawScore, scoreSource: 'resolved-skill' };
  const score = input.manualScore;
  if (Number.isSafeInteger(score) && score >= 0 && score <= 100 && typeof input.manualScoreReason === 'string' && input.manualScoreReason.trim()) {
    return { score, scoreSource: 'gm-manual', scoreReason: input.manualScoreReason.trim() };
  }
  throw Object.assign(new Error(`Compétence ${skillId} non résolue : saisissez un score fixé par le MJ et son motif.`), { code: 'CORRUPTION_SKILL_REQUIRED', userFacing: true });
}
function corruptionStatusFor(participant, baseRevision, sessionId = null) {
  const v5 = participant.extensions?.v5 || {};
  let facts = null, thresholdError = null;
  try { facts = corruptionFacts(participant); } catch (error) { thresholdError = error.message; }
  return {
    participantId: participant.id,
    name: participant.name,
    corruptionPoints: Number.isSafeInteger(v5.corruptionPoints) && v5.corruptionPoints >= 0 ? v5.corruptionPoints : null,
    pointsKnown: Number.isSafeInteger(v5.corruptionPoints) && v5.corruptionPoints >= 0,
    toughnessBonus: facts?.toughnessBonus ?? null,
    willpowerBonus: facts?.willpowerBonus ?? null,
    pureSoul: facts?.pureSoul ?? false,
    threshold: facts?.threshold ?? null,
    thresholdError,
    species: participant.species || participant.race || v5.species || v5.bestiary?.identity?.species || null,
    mutations: Array.isArray(v5.corruptionMutations) ? cloneValue(v5.corruptionMutations) : [],
    mutationCatalogRecords: Array.isArray(v5.corruptionMutationCatalogRecords) ? cloneValue(v5.corruptionMutationCatalogRecords) : [],
    pendingThresholdTest: v5.pendingCorruptionTest ? cloneValue(v5.pendingCorruptionTest) : null,
    pendingMutation: v5.pendingCorruptionMutation ? cloneValue(v5.pendingCorruptionMutation) : null,
    pendingCharacterLoss: v5.pendingCorruptionCharacterLoss ? cloneValue(v5.pendingCorruptionCharacterLoss) : null,
    characterLoss: v5.corruptionCharacterLoss ? cloneValue(v5.corruptionCharacterLoss) : null,
    corruptionSessionId: sessionId,
    sessionExposure: sessionId ? cloneValue((v5.corruptionExposures || []).find(row => row.sessionId === sessionId) || null) : null,
    pendingExposureSources: cloneValue(v5.pendingCorruptionExposures || []),
    baseRevision
  };
}
function resolvedCorruptionTest(participant, skillId, input) {
  const { score, ...scoreInfo } = corruptionSkillScore(participant, skillId, input);
  const difficultyDR=Number(input?.difficultyDR)||0;
  if(!Number.isSafeInteger(difficultyDR)||difficultyDR < -10||difficultyDR > 10)throw new TypeError('Modificateur du Test de Corruption hors limites');
  const preview = previewV5Test({ score, roll: normalizeV5Roll(input.roll), kind: 'test',slModifiers:difficultyDR?[{id:'corruption-source',label:'Source de Corruption',amount:difficultyDR}]:[] });
    const resolved = selectV5Test(preview, 'keep');
    return { ...resolved, scoreInfo };
}
  function corruptionExposurePreview(participant, input, baseRevision, sessionId) {
    const v5 = participant.extensions?.v5 || {};
    const immediateId=typeof input?.immediateExposureId==='string'?input.immediateExposureId:null;
    const immediate=immediateId?(v5.pendingCorruptionExposures||[]).find(row=>row.id===immediateId):null;
    if(immediateId&&!immediate)throw Object.assign(new Error('Cette source immédiate de Corruption est absente ou déjà résolue.'),{code:'CORRUPTION_EXPOSURE_NOT_PENDING',userFacing:true});
    if (!immediate && (typeof sessionId !== 'string' || !sessionId)) throw Object.assign(new Error('Démarrez explicitement une séance avant de résoudre la Corruption.'), { code: 'CORRUPTION_SESSION_REQUIRED', userFacing: true });
    if (!immediate && (v5.corruptionExposures || []).some(row => row?.sessionId === sessionId)) throw Object.assign(new Error('Le Test de Corruption de cette séance a déjà été résolu pour ce personnage.'), { code: 'CORRUPTION_SESSION_RESOLVED', userFacing: true });
    if (!immediate && (typeof input?.declaredSources !== 'string' || !input.declaredSources.trim())) throw Object.assign(new Error('Déclarez les sources d’exposition de la séance avant de retenir la plus forte.'), { code: 'CORRUPTION_SOURCES_REQUIRED', userFacing: true });
    if (!Number.isSafeInteger(v5.corruptionPoints) || v5.corruptionPoints < 0) {
      throw Object.assign(new Error('Saisissez d’abord les Points de Corruption connus ; aucune valeur zéro n’est supposée.'), { code: 'CORRUPTION_POINTS_REQUIRED', userFacing: true });
    }
    if (v5.pendingCorruptionTest || v5.pendingCorruptionMutation || v5.pendingCorruptionCharacterLoss) {
      throw Object.assign(new Error('Traitez la décision de Corruption en attente avant une nouvelle exposition.'), { code: 'CORRUPTION_PENDING', userFacing: true });
    }
    const facts = corruptionFacts(participant);
    const skillId=input?.skillId, influence=immediate?.influence||input?.influence, exposure=immediate?.exposure||input?.exposure,
      roll=input?.roll,manualScore=input?.manualScore,manualScoreReason=input?.manualScoreReason;
    const difficultyDR=immediate?.difficultyDR||0;
    const testInput = { roll, manualScore, manualScoreReason,difficultyDR };
    const test = resolvedCorruptionTest(participant, skillId, testInput);
    const result = resolveCorruptionExposure({
      currentPoints: v5.corruptionPoints, threshold: facts.threshold, influence, exposure, skillId,
      success: test.success, sl: test.sl
    });
    return {
      status: 'ready', participantId: participant.id, baseRevision,
      sessionId: immediate ? null : sessionId,
      input: cloneValue({ skillId, influence, exposure, roll: normalizeV5Roll(roll), manualScore, manualScoreReason, declaredSources: input?.declaredSources || immediate?.source || '',
        ...(immediate ? { immediateExposureId: immediate.id, sourceRuleId: immediate.sourceRuleId, source: immediate.source, difficultyDR } : {}) }),
      ...result, test: cloneValue({ ...test, ...result.test, scoreInfo: test.scoreInfo }),
      facts: { toughnessBonus: facts.toughnessBonus, willpowerBonus: facts.willpowerBonus, pureSoul: facts.pureSoul }
    };
  }
  function corruptionThresholdPreview(participant, input, baseRevision) {
    const v5 = participant.extensions?.v5 || {};
    if (!v5.pendingCorruptionTest || v5.pendingCorruptionTest.status !== 'pending') {
      throw Object.assign(new Error('Aucun Test contre la mutation n’est en attente.'), { code: 'CORRUPTION_THRESHOLD_NOT_PENDING', userFacing: true });
    }
    if (!Number.isSafeInteger(v5.corruptionPoints) || v5.corruptionPoints < 0) throw Object.assign(new Error('Points de Corruption connus requis.'), { code: 'CORRUPTION_POINTS_REQUIRED', userFacing: true });
    const facts = corruptionFacts(participant);
    if (v5.corruptionPoints <= facts.threshold) return { status: 'not-required', participantId: participant.id, baseRevision, threshold: facts.threshold, corruptionPoints: v5.corruptionPoints };
    const test = resolvedCorruptionTest(participant, CORRUPTION_SKILL_IDS.resistance, input || {});
    const mutations = Array.isArray(v5.corruptionMutations) ? v5.corruptionMutations : [];
    let outcome;
    try { outcome = resolveCorruptionThresholdTest({
      success: test.success, currentPoints: v5.corruptionPoints, willpowerBonus: facts.willpowerBonus,
      species: participant.species || participant.race || v5.species || v5.bestiary?.identity?.species,
      mutationDomainRoll: input?.mutationDomainRoll, gmChosenDomain: input?.gmChosenDomain,
      physicalMutationCount: mutations.filter(row => row?.domain === 'physical').length,
      mentalMutationCount: mutations.filter(row => row?.domain === 'mental').length,
      toughnessBonus: facts.toughnessBonus
    }); } catch (error) {
      if (/Jet de manifestation physique\/mentale doit être compris/.test(error?.message || '') && input?.mutationDomainRoll == null) {
        return { status: 'needs-input', participantId: participant.id, baseRevision, test, missing: ['mutationDomainRoll'] };
      }
      throw error;
    }
    if (outcome.status === 'needs-gm-choice') return { status: 'needs-input', participantId: participant.id, baseRevision, test, outcome, missing: ['gmChosenDomain'] };
    if (outcome.mutation) {
      let manifestation;
      try { manifestation = secretManifestationDelay({ dice: input?.manifestationDice }); }
      catch { return { status: 'needs-input', participantId: participant.id, baseRevision, test, outcome, missing: ['manifestationDice'] }; }
      return { status: 'ready', participantId: participant.id, baseRevision, input: cloneValue(input), test: cloneValue(test), outcome, manifestation, threshold: facts.threshold };
    }
    return { status: 'ready', participantId: participant.id, baseRevision, input: cloneValue(input), test: cloneValue(test), outcome, threshold: facts.threshold };
  }

  function sameValue(left, right) {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
  }

  function hasSharedStateChange(before, after) {
    return !sameValue(sharedState(before || {}), sharedState(after || {}));
  }

  function mirrorSceneToCombat(state, scene) {
    const participants = Array.isArray(scene?.participants) ? cloneValue(scene.participants) : [];
    const ids = new Set(participants.map(item => item?.id).filter(Boolean));
    const order = (Array.isArray(scene?.order) ? scene.order : []).filter(id => ids.has(id));
    return {
      ...state,
      extensions: { ...(state.extensions || {}), v5: { ...(state.extensions?.v5 || {}), turnIndex: scene?.extensions?.v5?.turnIndex ?? state.extensions?.v5?.turnIndex ?? 1 } },
      combat: {
        ...(state.combat || {}),
        round: Number(scene?.round) || 0,
        currentActorId: ids.has(scene?.currentActorId) ? scene.currentActorId : null,
        order,
        participants
      }
    };
  }

  function mirrorCombatToScene(state, scene, revision = null) {
    if (!scene) return state;
    const nextScene = {
      ...cloneValue(scene),
      ...(state.extensions?.v5?.turnIndex !== undefined ? { extensions: { ...(scene.extensions || {}), v5: { ...(scene.extensions?.v5 || {}), turnIndex: state.extensions.v5.turnIndex } } } : {}),
      round: Number(state.combat?.round) || 0,
      currentActorId: state.combat?.currentActorId || null,
      order: Array.isArray(state.combat?.order) ? [...state.combat.order] : [],
      participants: cloneValue(state.combat?.participants || [])
    };
    if (Number.isInteger(revision)) nextScene.revision = revision;
    return { ...state, activeScene: nextScene };
  }

  /** Keep the scene and combat projections coherent at every command boundary. */
  function synchronizeSceneCombat(before, next, revision, intent = {}) {
    if (!next?.activeScene) {
      // Closing or suspending a scene also clears the old combat projection.
      if (before?.activeScene && !next.activeScene) {
        return { ...next, combat: { ...(next.combat || {}), round: 0, currentActorId: null, order: [], participants: [] } };
      }
      return next;
    }
    const sceneChanged = !sameValue(before?.activeScene, next.activeScene);
    const combatChanged = !sameValue(before?.combat, next.combat);
    if (!sceneChanged && !combatChanged) return next;
    // A command that edits the scene explicitly wins.  Combat actions then
    // mirror back into the scene, preserving the same participant objects.
    // Commands are allowed to touch both projections because hydration and
    // migration add canonical fields to each one.  Preserve the projection
    // the mutator actually edited instead of letting those derived fields
    // make combat overwrite an explicit scene consequence.
    const sceneRequested = intent.sceneRequested ?? sceneChanged;
    const combatRequested = intent.combatRequested ?? combatChanged;
    let result = sceneChanged && (!combatChanged || (sceneRequested && !combatRequested))
      ? mirrorSceneToCombat(next, next.activeScene)
      : mirrorCombatToScene(next, next.activeScene, revision);
    if (sceneChanged && combatChanged && next.activeScene?.status === 'active' && sceneRequested && combatRequested) {
      // Launch/add-improvised mutations intentionally originate in the scene;
      // regular combat mutations originate in combat.  A complete scene shape
      // with participants is the safe source for a newly created scene.
      const wasAbsent = !before?.activeScene;
      const wasSuspendedResume = before?.activeScene?.status === 'suspended';
      result = (wasAbsent || wasSuspendedResume) ? mirrorSceneToCombat(next, next.activeScene) : result;
    }
    return result;
  }

  function publishRevisionedStateIfNeeded(sharedChanged) {
    if (!sharedChanged || !syncSession || !syncSessionReady) return Promise.resolve(null);
    pendingProtocolState = false;
    const state = currentEnvelope();
    return syncSession.enqueue({ state, localState: state })
      .then(() => syncSession.flush({ localState: currentEnvelope() }))
      .catch(error => { reportSyncStatus('error'); return { ok: false, error }; });
  }

  function queuePersistenceSave(updates = {}, restore = null, stateOverride = null, { includeOperation = true } = {}) {
    if (!persistence) return;
    const operationEntries = includeOperation && Object.keys(updates).length ? [{
      operationId: `${CLIENT_ID}:${++operationSequence}`,
      sequence: operationSequence,
      createdAt: Date.now(),
      updates: JSON.parse(JSON.stringify(updates))
    }] : [];
    // Le clic utilisateur et l’exécution IDB sont séparés par une file : les
    // références vivantes doivent donc être clonées avant d’attendre, sinon
    // une modification suivante contaminerait la transaction en vol.
    const state = JSON.parse(JSON.stringify(stateOverride || currentEnvelope()));
    const restoreCopy = restore ? {
      id: restore.id || uid(),
      reason: restore.reason || 'manual',
      state: JSON.parse(JSON.stringify(restore.state))
    } : null;
    const token = {};
    latestPersistenceToken = token;
    reportLocalStatus('saving');
    persistenceQueue = persistenceQueue
      .then(() => persistence.saveAtomic({ state, operations: operationEntries, restore: restoreCopy }))
      .then(result => {
        if (result?.ok === false) {
          if (latestPersistenceToken === token) reportLocalStatus('error');
          return result;
        }
        if (latestPersistenceToken === token) reportLocalStatus('saved');
        return { ok: true };
      })
      .catch(error => {
        console.error('❌ Erreur de sauvegarde IndexedDB:', error);
        if (latestPersistenceToken === token) reportLocalStatus('error');
        return { ok: false, error };
      });
    return persistenceQueue;
  }

  function persistLocal({ updates = {}, restore = null, includeOperation = true } = {}) {
    const rObj = Array.from(reserve.values());
    const cObj = {
      round: combat.round,
      currentActorId: combat.currentActorId,
      order: combat.order,
      participants: Array.from(combat.participants.values())
    };

    if (persistence) {
      return queuePersistenceSave(updates, restore, null, { includeOperation });
    } else if (storage) {
      try {
        storage.setItem(KEY.RESERVE, JSON.stringify(rObj));
        storage.setItem(KEY.COMBAT, JSON.stringify(cObj));
        storage.setItem(KEY.LOG, JSON.stringify(log));
        storage.setItem(KEY.DICE, JSON.stringify(diceLines));
        storage.setItem(KEY.EXTENSIONS, JSON.stringify(stateExtensions));
        if (lastAppliedTimestamp) {
          storage.setItem(KEY.TS, String(lastAppliedTimestamp));
        }
        reportLocalStatus('saved');
      } catch (e) {
        console.error('❌ Erreur de sauvegarde localStorage:', e);
        reportLocalStatus('error');
        // Entrée normalisée, pas une chaîne brute : depuis le lot 10 le journal ne contient
        // que des objets, et une chaîne insérée ici ne serait pas rendue — l'avertissement
        // deviendrait invisible précisément quand il compte.
        log.unshift({
          id: uid(), ts: Date.now(), time: now(), kind: 'management',
          actorId: null, targetId: null,
          text: '⚠️ Erreur de sauvegarde locale (quota dépassé ?)', detail: null
        });
        if (log.length > 300) log.length = 300;
      }
    }

    return { ok: true, rObj, cObj };
  }

  function save(fullSync = false) {
    if (batchDepth > 0) {
      savePending = true;
      return;
    }
    if (persistence && !hydrationComplete) {
      savePending = true;
      return Promise.resolve({ ok: false, error: new Error('Persistance encore en cours') });
    }
    if (persistence && hydrationFailed) {
      return Promise.resolve({ ok: false, error: new Error('Persistance en mode récupération') });
    }

    // Le journal et les autres données locales ne doivent pas créer un faux
    // état partagé. Une sauvegarde sans modification de données partagées ne
    // fait donc aucun envoi.
    if (!fullSync && dirtyPaths.size === 0) {
      return persistLocal();
    }

    const ts = Date.now();
    lastAppliedTimestamp = ts;

    const updates = {};
    updates['writer'] = CLIENT_ID;
    updates['timestamp'] = ts;

    if (firstFlush) {
      updates['log'] = null; // Purge du nœud log vestige (§9.2)
      firstFlush = false;
    }

    // Sans update(), les clés à chemin ('reserve/xxx') seraient invalides dans un set() :
    // on retombe alors sur l'instantané complet, c'est-à-dire le comportement d'avant le lot 9.
    const peutEcrireParChemin = !!(sync && sync.update);

    // Ne PAS retomber sur l'instantané complet quand rien n'est marqué : Store.log() sauvegarde
    // sans rien salir, et le journal n'est plus synchronisé. Un lot vide ne doit donc pousser
    // que writer et timestamp, qui suffisent à garder l'arbitrage cohérent.
    if (fullSync || !peutEcrireParChemin) {
      updates['extensions'] = cloneValue(stateExtensions);
      const reserveMap = {};
      reserve.forEach((p, id) => { reserveMap[id] = p; });
      updates['reserve'] = reserveMap;

      const partMap = {};
      combat.participants.forEach((p, id) => { partMap[id] = p; });
      updates['combat'] = {
        meta: { round: combat.round, currentActorId: combat.currentActorId, order: combat.order },
        participants: partMap
      };

      const diceMap = {};
      diceLines.forEach(dl => { diceMap[dl.id] = dl; });
      updates['diceLines'] = diceMap;
    } else {
      for (const [path, val] of dirtyPaths.entries()) {
        updates[path] = val;
      }
    }

    const restore = pendingRestore;
    pendingRestore = null;
    dirtyPaths.clear();
    // Include history in the same envelope as the mutation and outbox entry.
    // The persistence queue therefore observes one coherent command boundary.
    commitPendingCommand();
    const protocolReady = Boolean(syncSession && syncSessionReady);
    const persisted = persistLocal({
      updates,
      restore,
      includeOperation: !protocolReady && !(persistence && syncSession)
    });
    if (persistence && persisted?.then && restore) {
      persisted.then(result => {
        if (!result?.ok && !pendingRestore) pendingRestore = restore;
      });
    }
    const hasSharedChange = Object.keys(updates).some(key => key !== 'writer' && key !== 'timestamp');
    if (persistence && syncSession && !protocolReady && hasSharedChange) {
      // A click may happen while account reconciliation is still opening. Do
      // not emit a legacy path update; replay the captured local envelope as
      // one v2 operation once the session is ready.
      pendingProtocolState = true;
    }
    if (protocolReady) {
      const protocolState = currentEnvelope();
      return Promise.resolve(persisted).then(result => {
        if (result?.ok === false) return result;
        return syncSession.enqueue({ state: protocolState, localState: protocolState })
          // A successful local commit must enter the remote queue without
          // waiting for another user action; flush itself remains serialized
          // and will retain the outbox when the network is unavailable.
          .then(() => syncSession.flush({ localState: currentEnvelope() }))
          .then(() => result);
      }).catch(error => {
        reportSyncStatus('error');
        return { ok: false, error };
      });
    }
    if (persistence && syncSession) return persisted;
    enqueueSync(updates);
    return persisted;
  }

  function load() {
    if (!storage) return;
    try {
      const extensions = JSON.parse(storage.getItem(KEY.EXTENSIONS) || '{}');
      stateExtensions = extensions && typeof extensions === 'object' && !Array.isArray(extensions) ? extensions : {};
      setActiveReferential(referentialFromExtensions(stateExtensions).referential);
      const r = JSON.parse(storage.getItem(KEY.RESERVE) || '[]');
      reserve = new Map(r.map(o => [o.id, new Profile(o)]));
      const c = JSON.parse(storage.getItem(KEY.COMBAT) || 'null');
      if (c) {
        combat.round = c.round || 0;
        combat.order = Array.isArray(c.order) ? c.order : [];
        const validParts = repairMaxHp((c.participants || []).map(sanitizeParticipant).filter(Boolean));
        combat.participants = new Map(validParts.map(p => [p.id, new Participant(p)]));

        const validIds = new Set(combat.participants.keys());
        if (c.currentActorId !== undefined) {
          combat.currentActorId = (typeof c.currentActorId === 'string' && validIds.has(c.currentActorId)) ? c.currentActorId : null;
        } else if (c.turnIndex !== undefined && Number(c.turnIndex) >= 0 && Number(c.turnIndex) < combat.order.length) {
          const migrated = combat.order[Number(c.turnIndex)];
          combat.currentActorId = validIds.has(migrated) ? migrated : null;
        } else {
          combat.currentActorId = null;
        }

        let repairedCount = 0;
        combat.participants.forEach(p => {
          if ((!p.caracs || Object.keys(p.caracs).length === 0) && p.profileId) {
            const prof = reserve.get(p.profileId);
            if (prof && prof.caracs) {
              p.caracs = { ...prof.caracs };
              repairedCount++;
            }
          }
        });
        if (repairedCount > 0) {
          console.log(`[Auto-Repair] ${repairedCount} combattants réparés.`);
          save();
        }
      }
      log = normalizeLogEntries(JSON.parse(storage.getItem(KEY.LOG) || '[]'));
      const d = JSON.parse(storage.getItem(KEY.DICE) || '[]');
      diceLines = (Array.isArray(d) ? d : []).map(x => new DiceLine(x));
      lastAppliedTimestamp = Number(storage.getItem(KEY.TS) || '0') || 0;
      const resourceEnvelope = currentEnvelope();
      reserve = new Map(projectV5Resources(resourceEnvelope, Array.from(reserve.values())).map(row => [row.id, new Profile(row)]));
      combat.participants = new Map(projectV5Resources(resourceEnvelope, Array.from(combat.participants.values())).map(row => [row.id, new Participant(row)]));
      // Lecture complete du stockage : l’état local initial est confirmé.
      // Une écriture ultérieure en quota dépassé repassera explicitement en erreur.
      reportLocalStatus('saved');
    } catch (e) {
      console.warn('Load error', e);
      reportLocalStatus('error');
    }
  }

  function byInitiative(a, b) {
    return (Number(b.initiative) || 0) - (Number(a.initiative) || 0) || String(a.name || '').localeCompare(String(b.name || ''));
  }

  // Position of `id` in an initiative-sorted list of ids (automatic order mode).
  function initiativeIndex(ids, id, participants) {
    const byId = new Map(participants.map(p => [p.id, p]));
    const moved = byId.get(id);
    const index = ids.findIndex(other => byId.has(other) && byInitiative(moved, byId.get(other)) < 0);
    return index < 0 ? ids.length : index;
  }

  // Participant copy of a reserve profile, as serialised in a command draft.
  function participantFromProfile(prof, overrides = {}) {
    return {
      id: uid(), profileId: prof.id, name: prof.name, kind: prof.kind,
      initiative: prof.initiative, hp: prof.hp, maxHp: prof.maxHp ?? prof.hp,
      ...normalizeFicheFields(prof), extensions: cloneValue(prof.extensions || {}),
      armor: JSON.parse(JSON.stringify(prof.armor || {})),
      caracs: JSON.parse(JSON.stringify(prof.caracs || {})),
      actions: JSON.parse(JSON.stringify(prof.actions || [])),
      tags: JSON.parse(JSON.stringify(prof.tags || [])),
      notes: prof.notes || '', zone: 'bench', states: [],
      ...overrides
    };
  }

  function diceLinesFromProfile(prof, participantId) {
    return (Array.isArray(prof.diceLines) ? prof.diceLines : [])
      .map(template => ({ ...JSON.parse(JSON.stringify(template)), id: uid(), participantId, extensions: { ...template.extensions, profileActionId: template.id } }));
  }

  function commitV5Effect(type, participantId, evaluate, supplied = {}) {
    const options = cloneValue(supplied);
    let receipt;
    const expected = options.baseRevision ?? localRevision;
    return Promise.resolve().then(() => api.executeCommand(type, draft => {
      if (draft.localRevision !== expected) throw Object.assign(new Error('Le combat a changé'), { code: 'V5_EFFECT_STALE' });
      if (options.resolutionId && (draft.extensions?.v5?.actionLedger?.appliedActions || []).some(row => row.actionId === options.resolutionId)) throw Object.assign(new Error('Événement déjà appliqué'), { code: 'V5_EFFECT_DUPLICATE' });
      const participant = projectV5Resources(draft, draft.combat?.participants || []).find(item => item.id === participantId);
      if (!participant) throw Object.assign(new Error('Participant introuvable'), { code: 'V5_EFFECT_STALE' });
      receipt = evaluate(participant, draft);
      if (!receipt.ready) throw Object.assign(new Error('Données requises pour l’état V5'), { code: 'V5_EFFECT_INPUT' });
      const additionalParticipantUpdates = new Map((receipt.additionalParticipants || []).map(row => [row.id, row]));
      if (receipt.talentUsageRequests?.length) {
        const initial = v5StoreActionState(draft);
        const applied = commitV5StoreTalentUsages({ talentUsageRequests: receipt.talentUsageRequests }, { status: 'applied', state: initial }, initial);
        if (applied.status !== 'applied') throw Object.assign(new Error('Usage de talent indisponible'), { code: 'V5_EFFECT_STALE' });
        draft.extensions = { ...(draft.extensions || {}), v5: { ...(draft.extensions?.v5 || {}), actionLedger: applied.state.v5ActionLedger } };
        receipt.talentUsageReceipts = applied.talentUsageReceipts;
      }
      if (type === 'recover-condition-v5' && options.method === 'fortune' && receipt.removed.length) {
        const current = getV5Fortune(draft, participant);
        if (current.balance === null) throw Object.assign(new Error('Initialisez le compteur de Fortune du personnage.'), { code: 'V5_FORTUNE_UNKNOWN', userFacing: true });
        if (current.balance < 1) throw Object.assign(new Error('Aucun point de Fortune disponible.'), { code: 'V5_FORTUNE_INSUFFICIENT', userFacing: true });
        receipt.participant.extensions = { ...(receipt.participant.extensions || {}), v5: { ...(receipt.participant.extensions?.v5 || {}), resources: { ...(receipt.participant.extensions?.v5?.resources || {}), fortune: current.balance - 1 } } };
        receipt.resourceCost = { resource: 'fortune', characterId: current.characterId, before: current.balance, amount: 1, after: current.balance - 1 };
        draft = commitV5Resources(draft, (draft.combat?.participants || []).map(item => item.id === participantId ? receipt.participant : item));
        receipt.participant = (draft.combat?.participants || []).find(item => item.id === participantId) || receipt.participant;
      }
      return { ...draft,
        combat: { ...draft.combat, participants: draft.combat.participants.map(item => item.id === participantId ? receipt.participant : additionalParticipantUpdates.get(item.id) || item) },
        log: [{ id: uid(), kind: 'effect', actorId: options.authorId || participantId, targetId: participantId,
          text: `${participant.name} · ${type === 'heal-wounds-v5' ? `${receipt.hpDelta} Blessures récupérées` : type === 'recover-condition-v5' ? `${receipt.removed.length} effet(s) retiré(s)` : `${receipt.acquiredInstances} État(s) acquis`}`,
          detail: { ruleVersion: receipt.ruleVersion, acquiredInstances: receipt.acquiredInstances, removed: receipt.removed, reminders: receipt.reminders, hpDelta: receipt.hpDelta,
            ...(receipt.mountedFall?.length ? { mountedFall: receipt.mountedFall } : {}), ...(receipt.resourceCost ? { resourceCost: receipt.resourceCost } : {}), ...(receipt.talentPlan ? { talentPlan: receipt.talentPlan, talentUsageReceipts: receipt.talentUsageReceipts } : {}) } }, ...(draft.log || [])].slice(0, 300) };
    })).then(result => result?.ok === false ? result : { ...receipt, status: 'applied', ok: true, persistence: result })
      .catch(error => {
        if (error.code === 'V5_EFFECT_DUPLICATE') return { status: 'duplicate', ok: true };
        if (error.code === 'V5_EFFECT_STALE') return { status: 'stale', requiresPreview: true };
        if (error.code === 'V5_EFFECT_INPUT') return { ...receipt, status: 'requires-input', baseRevision: expected,
          requests: receipt.needsInput.map(need => ({ ...need, participantId, participantName: need.participantName || combat.participants.get(participantId)?.name,
            kind: need.kind || (need.field === 'recoveryTest' ? 'test' : /^mountedRideRoll/.test(need.field) ? 'd100' : ['transition','recoveryMethod'].includes(need.field) ? 'manual' : ['minuteElapsed','restSatisfied','engaged','fullRoundHidden','causeEnded','medicalAttention','surgery','outOfCombat','overrideRecovery'].includes(need.field) ? 'boolean' : 'integer') })) };
        throw error;
      });
  }

  function v5EffectContext(draft, options) {
    const round = draft.combat?.round;
    if (!Number.isSafeInteger(round) || round < 1) return options;
    return { ...options, round, transition: { ...(options.transition || {}), round } };
  }

  function freshScene(scene) {
    return { ...scene, extensions: { ...(scene.extensions || {}), v5: { ...(scene.extensions?.v5 || {}), turnIndex: 1 } }, participants: (scene.participants || []).map(participant => withMomentum(participant, false)) };
  }

  // Same numbering as duplicateProfile: « Gobelin », « Gobelin 2 », « Gobelin 3 »…
  function uniqueName(name, usedNames) {
    if (!usedNames.has(name)) return name;
    let baseName = name; const match = name.match(/^(.*?)(\s\d+)?$/); if (match && match[2]) baseName = match[1];
    let maxNum = 0;
    for (const other of usedNames) {
      if (other === baseName) maxNum = Math.max(maxNum, 1);
      else if (other.startsWith(baseName + ' ')) { const s = other.substring(baseName.length + 1); if (/^\d+$/.test(s)) maxNum = Math.max(maxNum, parseInt(s)); }
    }
    return `${baseName} ${maxNum + 1}`;
  }

  function setOrderByInitiative() {
    const arr = Array.from(combat.participants.values());
    arr.sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name));
    combat.order = arr.map(p => p.id);
  }

  function effectiveCombatOrder() {
    return effectiveOrder(Array.from(combat.participants.values()), {
      mode: !stateExtensions?.v5?.combatInitiativeInitialized&&stateExtensions?.v5?.orderRound===combat.round ? 'manual' : orderMode,
      order: combat.order,
      autoOrder: stateExtensions?.v5?.combatInitiativeResolution?.order,
      round:combat.round
    });
  }

  function magicCommand(type, mutator, options = {}, preview = null) {
    const expected = options.baseRevision ?? preview?.baseRevision ?? localRevision;
    return api.executeCommand(type, draft => {
      if (draft.localRevision !== expected) throw Object.assign(new Error('État modifié depuis l’aperçu : la partie a changé. Recalculez avant d’appliquer cette action magique.'), { code: 'V5_MAGIC_STALE', userFacing: true });
      return mutator(draft);
    });
  }

  const api = {
    executeCommand(type, mutator, { restore = null, recordHistory = true, purgeEncounterId = null } = {}) {
      if (!canMutate()) throw new Error('Store non prêt');
      if (typeof mutator !== 'function') throw new TypeError('Mutateur de commande requis');
      const run = () => {
        // Build every value from a clone.  In the persistent path this function
        // does not mutate the live Store until IDB has committed the candidate.
        const fullBefore = JSON.parse(JSON.stringify(currentEnvelope()));
        const before = JSON.parse(JSON.stringify(fullBefore));
        delete before.history;
        const draft = JSON.parse(JSON.stringify(before));
        let next;
        try {
          next = mutator(draft);
        } catch (error) {
          throw error;
        }
        if (next === undefined) throw new Error('La commande n’a produit aucun état');
        // Les soldes de Chance projetés sur les participants suivent toujours le registre (expirations comprises).
        next = finalizeDivineState(before,next);
        next = projectV5ResourceEnvelope(removeExpiredSummons(next));
        next = tagNewEncounterLogs(before, next);
        const purgeScope = purgeEncounterId ? encounterJournalScope(fullBefore, purgeEncounterId) : null;
        if (purgeScope) next = purgeEncounterJournal(next, purgeScope);
        next = reconcileCriticalDeathOnParticipantTransitions(before,next);
        validateCommandEnvelope(next);
        // Canonicalize through the same migration/sanitize pipeline used by
        // hydration.  The exact canonical value is what both IDB and the live
        // Store receive, while the strict check above prevents NaN/future data
        // from being silently repaired during a command.
        const sceneRequested = !sameValue(before?.activeScene, next?.activeScene);
        const combatRequested = !sameValue(before?.combat, next?.combat);
        let canonical = migrateSnapshot(next, { appVersion, contextId }).data;
        canonical = synchronizeSceneCombat(before, canonical, localRevision + 1, { sceneRequested, combatRequested });
        // Scene activation/suspension and legacy combat edits can change the
        // canonical combat position without representing elapsed time. Keep
        // the clock's projection in the same atomic command and history state;
        // only a real clock revision may carry validated temporal phases.
        const beforeClock = before.extensions?.v5?.gameClock;
        const canonicalClock = canonical.extensions?.v5?.gameClock;
        if (canonicalClock) {
          const targetPosition = readCombatPosition(canonical);
          if (beforeClock && canonicalClock.revision > beforeClock.revision) {
            if (!sameValue(canonicalClock.combat, targetPosition)) {
              throw Object.assign(new Error('La position temporelle du reçu ne correspond pas au combat canonique.'), { code: 'V5_CLOCK_POSITION_CONFLICT' });
            }
          } else {
            const reconciled = reconcileGameClockPosition(canonicalClock, targetPosition);
            if (reconciled.changed) canonical = {
              ...canonical,
              extensions: { ...(canonical.extensions || {}), v5: { ...(canonical.extensions?.v5 || {}), gameClock: reconciled.clock } }
            };
          }
        }
        // A scene revision identifies changes to the scene.  Keep it
        // monotone with the command revision so a stale preview cannot be
        // silently regenerated over a live combat edit.
        if (canonical.activeScene && canonical.activeScene.status === 'active'
          && (!sameValue(before.activeScene, canonical.activeScene) || !sameValue(before.combat, canonical.combat))) {
          canonical.activeScene.revision = localRevision + 1;
        }
        canonical = { ...canonical, syncPending: pendingProtocolState };
        validateCommandEnvelope(canonical);
        const after = JSON.parse(JSON.stringify(canonical));
        delete after.history;
        const baseRevision = localRevision;
        const nextRevision = recordHistory ? baseRevision + 1 : baseRevision;
        after.localRevision = nextRevision;
        // Journal mutations are local durable data, but they are not undoable
        // state commands.  Keeping them outside the structured history means a
        // profile edit followed by a log entry still undoes the profile edit in
        // one gesture, and a local log never consumes a shared revision.
        const baseHistory = purgeScope ? purgeEncounterJournalHistory(historyState, purgeScope) : historyState;
        const nextHistory = recordHistory
          ? recordCommand(baseHistory, createStateCommand({
            id: `${CLIENT_ID}:command:${nextRevision}`,
            type,
            baseRevision,
            before: purgeScope ? purgeEncounterJournal(before, purgeScope) : before,
            after
          }))
          : baseHistory;
        const protocolReady = Boolean(syncSession && syncSessionReady);
        const remoteNeeded = recordHistory && (hasSharedStateChange(before, after) || pendingProtocolState);
        const markPending = !protocolReady && Boolean(syncSession) && hasSharedStateChange(before, after);
        const operationQueued = protocolReady && remoteNeeded;
        const persistedState = { ...after, history: nextHistory, syncPending: pendingProtocolState || markPending };
        // A restore point may be supplied as a factory so queued commands
        // snapshot the state immediately before their own commit, rather than
        // the state observed when the caller first requested the restore.
        const restoreForCommit = typeof restore === 'function'
          ? restore({ before: JSON.parse(JSON.stringify(fullBefore)), after: JSON.parse(JSON.stringify(after)) })
          : restore;
        if (persistence) {
          const durable = protocolReady && remoteNeeded
            // sync-session.enqueue writes state, outbox operation and session
            // in one IDB transaction.  This is the only safe ordering for an
            // account command: a crash cannot leave state without its v2 op.
            ? syncSession.enqueue({ state: persistedState, localState: persistedState, restore: restoreForCommit })
            : queuePersistenceSave({}, restoreForCommit, persistedState, { includeOperation: false });
          return Promise.resolve(durable)
            .then(result => {
              if (result?.ok === false) return result;
              historyState = nextHistory;
              localRevision = nextRevision;
              pendingProtocolState = Boolean(persistedState.syncPending);
              applyDataToState(after, { includeLog: true, includeHistory: false });
              emitBus('reserve'); emitBus('combat'); emitBus('log');
              if (!protocolReady) {
                // The v2 session may still be opening (or offline).  Keep a
                // durable replay marker so reconciliation cannot adopt a
                // remote empty root over this local command.
                if (syncSession) pendingProtocolState = Boolean(persistedState.syncPending);
                return result;
              }
              // Local-only commands (journal/history) are durable but never
              // become remote operations. A pending pre-handshake state is
              // published once, then its local marker is cleared.
              pendingProtocolState = false;
              if (remoteNeeded && !operationQueued) {
                syncSession.enqueue({ state: currentEnvelope(), localState: currentEnvelope() })
                  .then(() => syncSession.flush({ localState: currentEnvelope() }))
                  .catch(() => reportSyncStatus('error'));
              } else if (operationQueued) {
                syncSession.flush({ localState: currentEnvelope() }).catch(() => reportSyncStatus('error'));
              } else {
                queuePersistenceSave({}, null, { ...currentEnvelope(), syncPending: false }, { includeOperation: false });
              }
              // Flushing is deliberately detached from the command promise:
              // a slow/offline network must not serialize or block the next
              // local command after its IDB transaction has committed.
              return result;
            });
        }

        // The localStorage compatibility path is intentionally synchronous for
        // the historical E02 tests.  It still applies only after command
        // validation, and save failures are reported by the legacy adapter.
        const previousHistory = historyState;
        try {
          historyState = nextHistory;
          localRevision = nextRevision;
          applyDataToState(after, { includeLog: true, includeHistory: false });
          const persisted = save(true);
          emitBus('reserve'); emitBus('combat'); emitBus('log');
          return persisted;
        } catch (error) {
          historyState = previousHistory;
          localRevision = baseRevision;
          throw error;
        }
      };

      if (!persistence) return run();
      const task = commandQueue.then(run);
      commandQueue = task.catch(() => {});
      return task;
    },
    batch(fn) {
      batchDepth++;
      try {
        fn();
      } finally {
        batchDepth--;
        if (batchDepth === 0) {
          if (savePending) {
            savePending = false;
            save();
          }
          const events = Array.from(pendingEvents);
          pendingEvents.clear();
          if (bus && bus.emit) events.forEach(e => bus.emit(e));
        }
      }
    },

    addProfile(p) {
      if (!canMutate()) return false;
      if (persistence) {
        const captured = convertLegacyV4Profile(canonicalizeProfileFields(JSON.parse(JSON.stringify(p))));
        return api.executeCommand('add-profile', draft => ({ ...draft, reserve: [...(draft.reserve || []), captured] }));
      }
      beginCommand('add-profile');
      const converted = convertLegacyV4Profile(p);
      reserve.set(converted.id, converted);
      markDirty(`reserve/${converted.id}`, converted);
      save();
      emitBus('reserve');
    },
    updateProfile(id, patch, { propagate = false, expectedLocalRevision } = {}) {
      if (!canMutate()) return false;
      const p = reserve.get(id); if (!p) return;
      if (persistence) {
        const capturedPatch = canonicalizeProfileFields(JSON.parse(JSON.stringify(patch || {})));
        return api.executeCommand('update-profile', draft => {
        assertEditRevision(expectedLocalRevision, draft.localRevision);
        // Le profil stocké est d'abord ramené à une seule collection, puis le
        // patch s'applique par-dessus : ses `diceLines` font foi, même vides.
        const profiles = (draft.reserve || []).map(item => item.id === id ? { ...canonicalizeProfileFields(item), ...capturedPatch } : item);
        // S-05 : caractéristiques et armure du profil = nouvelle base ; les couches magiques actives se recalculent dessus.
        const participants = propagate ? (draft.combat?.participants || []).map(item => item.profileId !== id ? item : {
          ...(capturedPatch.caracs || capturedPatch.armor ? { ...item, ...(isMagicBased(item) ? rebaseMagicLayers(item, { caracs: capturedPatch.caracs, armor: capturedPatch.armor }) : { caracs: capturedPatch.caracs ? cloneValue(capturedPatch.caracs) : item.caracs, armor: capturedPatch.armor ? cloneValue(capturedPatch.armor) : item.armor }) } : item),
          name: capturedPatch.name ?? item.name,
          kind: capturedPatch.kind ?? item.kind,
          initiative: capturedPatch.initiative ?? item.initiative,
          maxHp: capturedPatch.hp ?? item.maxHp,
          ...Object.fromEntries(FICHE_DATA_FIELDS.filter(key => Object.hasOwn(capturedPatch, key)).map(key => [key, cloneValue(capturedPatch[key])])),
          ...(capturedPatch.diceLines ? { actions: cloneValue(capturedPatch.diceLines) } : {})
        }) : draft.combat?.participants;
        return { ...draft, reserve: profiles, ...(propagate ? { combat: { ...draft.combat, participants } } : {}) };
        });
      }
      assertEditRevision(expectedLocalRevision, localRevision);
      beginCommand('update-profile');
      Object.assign(p, canonicalizeProfileFields(patch));
      markDirty(`reserve/${id}`, p);
      // Profiles are reusable templates; active participant copies are frozen
      // at import/launch time. Propagation is available only through the
      // explicit third argument and is never inferred from profile updates.
      if (propagate) {
        for (const part of combat.participants.values()) if (part.profileId === id) {
          Object.assign(part, { name: patch.name ?? part.name, kind: patch.kind ?? part.kind, initiative: patch.initiative ?? part.initiative, maxHp: patch.hp ?? part.maxHp });
          if (isMagicBased(part)) Object.assign(part, rebaseMagicLayers(part, { caracs: patch.caracs, armor: patch.armor }));
          else { if (patch.caracs) part.caracs = cloneValue(patch.caracs); if (patch.armor) part.armor = cloneValue(patch.armor); }
          for (const key of FICHE_DATA_FIELDS) if (Object.hasOwn(patch, key)) part[key] = cloneValue(patch[key]);
          markDirty(`combat/participants/${part.id}`, part);
        }
      }
      save(); emitBus('reserve'); if (propagate) emitBus('combat');
    },
    // Une commande conserve les Blessures subies au delta de maximum, sans modifier les états ni le tour.
    applyFicheSync(entries, { expectedLocalRevision } = {}) {
      if (!canMutate()) return false;
      const captured = JSON.parse(JSON.stringify(entries || []));
      const assertRevision = revision => { if (expectedLocalRevision !== undefined && revision !== expectedLocalRevision) throw Object.assign(new Error('La partie a changé depuis l’aperçu : actualisez la synchronisation.'), { code: 'fiche-plan-stale' }); };
      assertRevision(localRevision);
      // Rien à changer : pas de commande, donc pas d'entrée d'historique.
      const probe = JSON.parse(JSON.stringify(currentEnvelope()));
      if (applyFicheSyncToDraft(probe, captured) === probe) return { ok: true, changed: false };
      return api.executeCommand('sync-fiches', draft => { assertRevision(draft.localRevision); const next = applyFicheSyncToDraft(draft, captured); return reconcileV5ResourceBindings(draft, next, captured); });
    },
    removeProfile(id) {
      if (!canMutate()) return false;
      if (!reserve.has(id)) return;
      if (persistence) return api.executeCommand('remove-profile', draft => ({ ...draft, reserve: (draft.reserve || []).filter(item => item.id !== id) }));
      beginCommand('remove-profile');
      recordSnapshot('delete-profile');
      reserve.delete(id); markDirty(`reserve/${id}`, null); save(); emitBus('reserve');
    },
    clearReserve() {
      if (!canMutate()) return false;
      if (persistence) return api.executeCommand('clear-reserve', draft => ({
        ...draft,
        reserve: [],
        log: [{ id: uid(), ts: Date.now(), kind: 'management', text: `Réserve: supprimé ${(draft.reserve || []).length} profil(s)` }, ...(draft.log || [])].slice(0, 300)
      }));
      beginCommand('clear-reserve');
      recordSnapshot('clear-reserve');
      const count = reserve.size; reserve.clear(); markDirty('reserve', null); save(); emitBus('reserve');
      this.log(`Réserve: supprimé ${count} profil(s)`);
    },
    duplicateProfile(id) {
      const p = reserve.get(id); if (!p) return;
      let baseName = p.name; const match = p.name.match(/^(.*?)(\s\d+)?$/); if (match && match[2]) baseName = match[1];
      let maxNum = 0;
      for (const other of reserve.values()) {
        if (other.name === baseName) maxNum = Math.max(maxNum, 1);
        else if (other.name.startsWith(baseName + " ")) { const s = other.name.substring(baseName.length + 1); if (!isNaN(s)) maxNum = Math.max(maxNum, parseInt(s)); }
      }
      const newProfile = new Profile({ ...p, id: uid(), name: `${baseName} ${maxNum + 1}`, armor: { ...p.armor }, caracs: { ...p.caracs }, diceLines: p.diceLines });
      this.addProfile(newProfile);
    },
    listProfiles() { return Array.from(reserve.values()); },
    getProfile(id) { return reserve.get(id) || null; },

    addParticipant(p) {
      if (!canMutate()) return false;
      if(p?.zone==='active'&&Number(combat.round)===0&&stateExtensions?.v5?.combatInitiativeInitialized===true&&!p.extensions?.v5?.combatInitiative?.initialized)
        throw Object.assign(new Error('Un ajout direct actif avant le Round 1 doit recevoir son jet d’Initiative dans le dialogue de préparation.'),{code:'COMBAT_INIT_REQUIRED',userFacing:true});
      if (persistence) {
        const captured = JSON.parse(JSON.stringify(p));
        return api.executeCommand('add-participant', draft => {
        const participants = [...(draft.combat?.participants || []), captured];
        const next={ ...draft, combat: { ...draft.combat, participants } };
        if(draft.extensions?.v5?.combatInitiativeInitialized)registerNewV5Participants(draft,next);
        else next.combat.order=newV5ParticipantOrder(draft,participants)??participants.slice().sort((a,b)=>Number(b.initiative)-Number(a.initiative)||String(a.name).localeCompare(String(b.name))).map(item=>item.id);
        return next;
        });
      }
      beginCommand('add-participant');
      combat.participants.set(p.id, p); markDirty(`combat/participants/${p.id}`, p); this.rebuildOrder(); save(); emitBus('combat');
    },
    removeParticipant(id) {
      if (!canMutate()) return false;
      const participant = combat.participants.get(id); if (!participant) return;
      // Un participant lié par un familier passe par une commande annulable même sans persistance : l'historique des liens (commandes) ne se mêle pas à l'instantané hérité.
      const linked = familiarLinksOf(participant).length > 0 || Boolean(participant.extensions?.v5?.familiarOf)
        || participant.extensions?.v5?.mounted === true
        || Array.from(combat.participants.values()).some(item => item.extensions?.v5?.mounted === true && item.extensions.v5.mountId === id);
      if (persistence || linked) return api.executeCommand('remove-participant', draft => {
        const stripLinks = item => {
          if (item.extensions?.v5?.familiarOf?.masterId === id) return withV5(item, v5 => { const { familiarOf, ...rest } = v5; return rest; });
          if (familiarLinksOf(item).some(row => row.familiarId === id)) return withV5(item, v5 => ({ ...v5, familiarLinks: v5.familiarLinks.filter(row => row.familiarId !== id) }));
          return item;
        };
        const participants = dismountLinkedRiders((draft.combat?.participants || []).filter(item => item.id !== id).map(stripLinks), id);
        const transition = participant.zone === 'active' ? removeFromCombat({ participants: draft.combat?.participants || [], order: draft.combat?.order || [], currentActorId: draft.combat?.currentActorId, participantId: id }) : null;
        return {
          ...draft,
          combat: { ...draft.combat, participants, order: transition ? transition.order : (draft.combat?.order || []).filter(item => item !== id), currentActorId: transition ? transition.currentActorId : (draft.combat?.currentActorId === id ? null : draft.combat?.currentActorId) },
          diceLines: (draft.diceLines || []).filter(line => line.participantId !== id).map(line => line.targetId === id ? { ...line, targetId: null } : line),
          log: [{ id: uid(), ts: Date.now(), kind: 'management', actorId: id, actorName: participant.name, text: `Combat: retiré ${participant.name}` }, ...(draft.log || [])].slice(0, 300)
        };
      });
      beginCommand('remove-participant');
      recordSnapshot('remove-participant');
      const turnTransition = participant.zone === 'active' ? removeFromCombat({ participants: Array.from(combat.participants.values()), order: combat.order, currentActorId: combat.currentActorId, participantId: id }) : null;
      combat.participants.delete(id);
      combat.participants.forEach((item, key) => {
        if (item.extensions?.v5?.mounted === true && item.extensions.v5.mountId === id) {
          const dismounted = clearMountedRelation(item);
          combat.participants.set(key, dismounted); markDirty(`combat/participants/${key}`, dismounted);
          return;
        }
        if (item.extensions?.v5?.familiarOf?.masterId !== id) return;
        const freed = withV5(item, v5 => { const { familiarOf, ...rest } = v5; return rest; });
        combat.participants.set(key, freed); markDirty(`combat/participants/${key}`, freed);
      });
      combat.order = turnTransition ? turnTransition.order : combat.order.filter(x => x !== id);
      if (turnTransition) combat.currentActorId = turnTransition.currentActorId;
      else if (combat.currentActorId === id) combat.currentActorId = null;
      if (turnTransition && combat.currentActorId) turnSelectionPending = true;
      markDirty(`combat/participants/${id}`, null); markDirty('combat/meta', { round: combat.round, currentActorId: combat.currentActorId, order: combat.order });
      cleanupDiceLinesForParticipants([id]);
      log.forEach(entry => { if (entry?.actorId === id && !entry.actorName) entry.actorName = participant.name; if (entry?.targetId === id && !entry.targetName) entry.targetName = participant.name; });
      save(); emitBus('combat');
    },
    updateParticipant(id, patch, { expectedLocalRevision } = {}) {
      if (!canMutate()) return false;
      const p = combat.participants.get(id); if (!p) return;
      if (persistence) {
        const capturedPatch = JSON.parse(JSON.stringify(patch || {}));
        return api.executeCommand('update-participant', draft => {
          assertEditRevision(expectedLocalRevision, draft.localRevision);
          let participants = (draft.combat?.participants || []).map(item => item.id === id ? momentumAfterChange(item, assertMiscastConditionsKept(item, { ...item, ...capturedPatch, ...pickBaseLayers(item, capturedPatch) })) : item);
          if (capturedPatch.zone === 'bench') participants = dismountLinkedRiders(participants.map(item => item.id === id ? clearMountedRelation(item) : item), id);
          return { ...draft, combat: { ...draft.combat, participants } };
        });
      }
      assertEditRevision(expectedLocalRevision, localRevision);
      Object.assign(p, momentumAfterChange(p, assertMiscastConditionsKept(p, { ...p, ...patch, ...pickBaseLayers(p, patch) })));
      if (patch.zone === 'bench') {
        const dismounted = clearMountedRelation(p);
        Object.assign(p, dismounted);
        combat.participants.forEach((item, key) => {
          if (key === id || item.extensions?.v5?.mounted !== true || item.extensions.v5.mountId !== id) return;
          const linkedRider = clearMountedRelation(item); combat.participants.set(key, linkedRider); markDirty(`combat/participants/${key}`, linkedRider);
        });
      }
      markDirty(`combat/participants/${id}`, p); save();
      if ('zone' in patch) emitBus('combat'); else emitBus('combat:update', { id, patch });
    },

    acquireConditions(id, states, options = {}) {
      const captured = cloneValue(states), context = cloneValue(options);
      // Un homoncule ne subit Hémorragique, Exténué, Empoisonné ou une maladie que d'une source magique (`options.magical`).
      for (const row of normalizeEffects(captured)) {
        const check = previewFamiliarCondition(combat.participants.get(id), row, { magical: context.magical === true });
        if (!check.ok) return Promise.resolve({ ok: false, status: 'refused', reason: 'familiar-condition', error: new Error(check.receipt.message + ' Le MJ peut l’imposer par « Modifier ».'), message: check.receipt.message + ' Le MJ peut l’imposer par « Modifier ».', receipt: check.receipt });
      }
      const actionId = context.resolutionId || uid();
      return commitV5Effect('acquire-conditions-v5', id, (participant, draft) => {
        const proposed = normalizeEffects(captured).map((row, index) => ({ ...row,
          key: row.key === 'stunned' ? 'sonne' : row.key,
          level: typeof captured[index] === 'object' && captured[index]?.level !== undefined ? captured[index].level : row.level }));
        const surprise=preventIdentifiedSurprise(participant,proposed,context.surpriseEventId);participant=surprise.participant;
        const talent = previewV5TalentConditions(participant, surprise.states, { state: v5StoreActionState(draft), clock: v5StoreActionClock(draft), actionId });
        const receipt = acquireV5Conditions(participant, talent.states, v5EffectContext(draft, { ...context, resolutionId: actionId, targetId: id }));
        const beforeStateIds = new Set((participant.states || []).map(row => row.id).filter(Boolean));
        const acquiredStates = (receipt.participant.states || []).filter(row => row.id && !beforeStateIds.has(row.id));
        const normalizedKeys = new Set(acquiredStates.map(row => String(row.key || row.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '')));
        const mountedFallReceipts = [], extraDismounts = new Map();
        const checkSkittish = subject => psychologyTraits(subject).some(row => row.key === 'skittish');
        const riders = (draft.combat?.participants || []).filter(row => row.extensions?.v5?.mounted === true && row.extensions.v5.mountId === id);
        const riderEvent = receipt.participant.extensions?.v5?.mounted === true
          ? normalizedKeys.has('inconscient') || normalizedKeys.has('aterre') ? 'rider-prone'
            : normalizedKeys.has('surpris') ? 'rider-surprised' : normalizedKeys.has('sonne') ? 'rider-stunned' : null
          : null;
        const mountEvent = riders.length
          ? normalizedKeys.has('inconscient') ? 'mount-unconscious' : normalizedKeys.has('aterre') ? 'mount-prone'
            : normalizedKeys.has('surpris') ? 'mount-surprised' : normalizedKeys.has('enchevetre') ? 'mount-entangled' : null
          : null;
        const fallTargets = riderEvent ? [{ rider: receipt.participant, event: riderEvent, mountTraits: [] }]
          : mountEvent ? riders.filter(rider => mountEvent !== 'mount-surprised' && mountEvent !== 'mount-entangled' || checkSkittish(participant))
            .filter(rider => mountEvent !== 'mount-entangled' || !(rider.states || []).some(state => ['enchevetre','entangled'].includes(String(state.key || state.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())))
            .map(rider => ({ rider, event: mountEvent, mountTraits: participant.traits || participant.profile?.traits || [] })) : [];
        for (const { rider, event, mountTraits } of fallTargets) {
          const plan = planMountedFall({ event, mountTraits, riderEntangled: (rider.states || []).some(state => ['enchevetre','entangled'].includes(String(state.key || state.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())), fallPreventedByEquipment: context.fallPreventedByEquipment === true });
          if (plan.requiredTest) {
            const skill = (rider.skills || []).find(row => row?.id === V5_RIDE_SKILL_ID && row.status !== 'unresolved');
            const suffix = rider.id === id ? '' : ':' + rider.id;
            const manualScore = suffix ? context[`mountedRideScore${suffix}`] : context.mountedRideScore;
            const rideScore = Number.isSafeInteger(skill?.total) ? skill.total : manualScore !== null && manualScore !== undefined && manualScore !== '' && Number.isSafeInteger(Number(manualScore)) ? Number(manualScore) : null;
            const rideRoll = Number(suffix ? context[`mountedRideRoll${suffix}`] : context.mountedRideRoll);
            if (rideScore === null) receipt.needsInput.push({ field: `mountedRideScore${suffix}`, kind: 'integer', label: `${rider.name || rider.id} : score de Chevaucher` });
            if (!Number.isInteger(rideRoll) || rideRoll < 1 || rideRoll > 100) receipt.needsInput.push({ field: `mountedRideRoll${suffix}`, kind: 'd100', label: `${rider.name || rider.id} : Test de Chevaucher d100` });
            if (rideScore === null || !Number.isInteger(rideRoll) || rideRoll < 1 || rideRoll > 100) { receipt.ready = false; continue; }
            plan.test = previewV5Test({ score: rideScore, roll: rideRoll, kind: 'test', slModifiers: [{ id: 'mounted:fall', label: 'Désarçonnement', amount: plan.requiredTest.modifier }] }).options[0].result;
            if (plan.dismount === 'on-failed-test') plan.dismount = !plan.test.success;
          }
          mountedFallReceipts.push({ participantId: rider.id, event, ...plan });
          if (plan.dismount === true) extraDismounts.set(rider.id, clearMountedRelation(rider));
        }
        if (riderEvent && mountedFallReceipts.some(row => row.dismount === true)) receipt.participant = clearMountedRelation(receipt.participant);
        receipt.mountedFall = mountedFallReceipts;
        receipt.additionalParticipants = [...extraDismounts.values()].filter(row => row.id !== id);
        const exit=previewV5FrenzyExit(receipt.participant,{round:draft.combat?.round,resolutionId:actionId,state:v5StoreActionState(draft),clock:v5StoreActionClock(draft)});
        receipt.participant=exit.participant;
        const resolute=resoluteException({},receipt.participant,{context},receipt.acquiredInstances);if(resolute.unresolved.length){receipt.ready=false;receipt.needsInput.push(...resolute.unresolved.map(label=>({field:'resolute',label})));}if(resolute.exceptions.length&&participant.extensions?.v5?.hasMomentum===true)receipt.participant={...receipt.participant,extensions:{...receipt.participant.extensions,v5:{...receipt.participant.extensions?.v5,hasMomentum:true}}};receipt.resoluteTest=resolute.test;
        if(exit.unresolved.length){receipt.ready=false;receipt.needsInput.push(...exit.unresolved.map(label=>({field:'frenzyExit',label})));}
        receipt.talentPlan = talent.plan;
        receipt.talentUsageRequests = talent.usageRequests.length||exit.usageRequests.length ? [...talent.usageRequests,...exit.usageRequests] : [{ actorId: id, actionId, costs: [], quotas: [], exemptions: [], clock: v5StoreActionClock(draft) }];
        if (!talent.plan.ready) {
          receipt.ready = false;
          receipt.needsInput.push(...talent.plan.unresolved.flatMap(item => item.fields.map(field => ({ field, label: 'Contexte requis pour le talent : ' + field }))));
        }
        return receipt;
      }, { ...context, resolutionId: actionId });
    },
    advanceCampaignTime(input, options = {}) {
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Commande de temps de campagne invalide');
      const { seconds, reason } = input;
      if (!Number.isSafeInteger(seconds) || seconds < 1) throw new TypeError('Secondes entières positives requises');
      if (typeof reason !== 'string' || !reason.trim()) throw new TypeError('Motif MJ requis');
      if (!persistence && storage != null) return { ok: false, status: 'requires-input', receipt: null,
        processedSubjects: [], needsInput: [{ path: 'storage', code: 'non-atomic-storage',
          message: 'Cette sauvegarde ne permet pas d’enregistrer ensemble l’heure de jeu et les échéances. Rechargez la partie avec une sauvegarde transactionnelle pour avancer le temps.' }] };
      const currentClock = stateExtensions?.v5?.gameClock || createGameClock(currentEnvelope());
      const clockBaseRevision = input.clockBaseRevision ?? currentClock.revision;
      if (!Number.isSafeInteger(clockBaseRevision) || clockBaseRevision < 0) throw new TypeError('Révision de clock invalide');
      const eventId = input.eventId ?? `clock-v1:${clockBaseRevision}:store:${CLIENT_ID}:${uid()}`;
      const event = { id: eventId, baseRevision: clockBaseRevision, kind: 'campaign-time-advance', seconds, reason };
      const localBaseRevision = options.baseRevision ?? localRevision;
      if (!Number.isSafeInteger(localBaseRevision) || localBaseRevision < 0) throw new TypeError('Révision locale invalide');
      const preflight = advanceGameClock(currentClock, event);
      if (preflight.status === 'duplicate') return { ok: true, status: 'duplicate', receipt: preflight.receipt, clock: preflight.clock, processedSubjects: [] };
      if (!preflight.ok) return { ok: false, status: preflight.status, receipt: preflight.receipt || null, clock: preflight.clock };
      const resultError = result => Object.assign(new Error(result.status), { code: 'CAMPAIGN_TIME_RESULT', result });
      let processedSubjects = [];
      let acceptedClock = null, acceptedReceipt = null;
      let command;
      try {
        command = api.executeCommand('advance-campaign-time', draft => {
          const clock = draft.extensions?.v5?.gameClock || createGameClock(draft);
          const advanced = advanceGameClock(clock, event);
          if (advanced.status === 'duplicate') throw resultError({ ok: true, status: 'duplicate', receipt: advanced.receipt, clock: advanced.clock, processedSubjects: [] });
          if (!advanced.ok) throw resultError({ ok: false, status: advanced.status, receipt: advanced.receipt || null, clock: advanced.clock });
          if (draft.localRevision !== localBaseRevision) throw resultError({ ok: false, status: 'stale', receipt: null, clock });
          const progressed = advanceCampaignSnapshot(draft, { seconds, clock: draft.extensions?.v5?.gameClock });
          if (!progressed.ok) throw resultError({ ok: false, status: 'requires-input', receipt: null, clock, processedSubjects: [], needsInput: progressed.needsInput });
          const staged={...progressed.snapshot,extensions:{...(progressed.snapshot.extensions||{}),v5:{...(progressed.snapshot.extensions?.v5||{}),gameClock:advanced.clock}}};
          const divine=expireDivineAtClock(staged,{fromClock:clock,toClock:advanced.clock,receipt:advanced.receipt});
          if(!divine.ok)throw resultError({ok:false,status:'requires-input',receipt:null,clock,processedSubjects:[],needsInput:divine.needsInput});
          processedSubjects = [...progressed.processedSubjects,...divine.removed.map(row=>({path:row.path,id:row.participantId,expiredEffectId:row.effectId}))];
          acceptedClock = advanced.clock;
          acceptedReceipt = advanced.receipt;
          return { ...divine.state,
            log: [{ id: uid(), kind: 'management', text: `Temps de campagne avancé de ${seconds} seconde(s) : ${reason.trim()}` }, ...(draft.log || [])].slice(0, 300)
          };
        });
      } catch (error) {
        if (error?.code === 'CAMPAIGN_TIME_RESULT') return error.result;
        throw error;
      }
      return Promise.resolve(command).then(persisted => {
        if (persisted?.ok === false) return { ok: false, status: 'persistence-error', receipt: null, error: persisted.error || null };
        return { ok: true, status: 'applied', receipt: acceptedReceipt || preflight.receipt, clock: acceptedClock || preflight.clock, processedSubjects };
      }).catch(error => {
        if (error?.code === 'CAMPAIGN_TIME_RESULT') return error.result;
        return { ok: false, status: 'persistence-error', receipt: null, error };
      });
    },
    advanceTalentMinutes(minutes, options = {}) {
      const seconds = campaignDurationSeconds(minutes, 'minutes');
      const clock = stateExtensions?.v5?.gameClock || createGameClock(currentEnvelope());
      return api.advanceCampaignTime({ seconds, reason: `Avance de durée : ${minutes} minute(s)`, clockBaseRevision: clock.revision }, options);
    },
    startTalentSession(options = {}){
      const sessionId = uid();
      return magicCommand('start-talent-session', draft => {
        const cleanScene = scene => scene ? { ...scene, participants: (scene.participants || []).map(clearSessionClairvoyance),
          ...(scene.combat ? { combat: { ...scene.combat, participants: (scene.combat.participants || []).map(clearSessionClairvoyance) } } : {}) } : scene;
        return { ...draft, reserve: (draft.reserve || []).map(clearSessionClairvoyance),
          persistentCharacters: (draft.persistentCharacters || []).map(clearSessionClairvoyance),
          combat: { ...draft.combat, participants: (draft.combat?.participants || []).map(clearSessionClairvoyance) },
          ...(draft.activeScene ? { activeScene: cleanScene(draft.activeScene) } : {}),
          suspendedScenes: (draft.suspendedScenes || []).map(cleanScene),
          extensions: { ...draft.extensions, v5: { ...draft.extensions?.v5, talentSessionId: sessionId } },
          log: [{ id: uid(), kind: 'management', text: 'Nouvelle séance : quotas des talents renouvelés.' }, ...(draft.log || [])].slice(0, 300) };
      }, options);
    },
    getFortune(id) {
      const envelope = currentEnvelope();
      const subject = envelope.combat.participants.find(item => item.id === id) || envelope.reserve.find(item => item.id === id) || envelope.persistentCharacters.find(item => item.id === id);
      if (!subject) throw new TypeError('Personnage introuvable');
      return { ...getV5Fortune(envelope, subject), baseRevision: localRevision };
    },
    getFate(id) {
      const envelope = currentEnvelope();
      const subject = envelope.combat.participants.find(item => item.id === id) || envelope.reserve.find(item => item.id === id) || envelope.persistentCharacters.find(item => item.id === id);
      if (!subject) throw new TypeError('Personnage introuvable');
      return { ...getV5Fate(envelope, subject), legacyResilience:subject.extensions?.legacyConversions?.v4ToV5===true, fortune:getV5Fortune(envelope,subject), baseRevision: localRevision };
    },
    declareV5FortuneAdvantage(actorId,{enabled=true,declarationId=null,baseRevision=localRevision}={}){
      if(typeof actorId!=='string'||!actorId.trim())throw new TypeError('Acteur requis pour déclarer Chance → Avantage');
      let declaration=null;
      const saved=api.executeCommand(enabled?'declare-fortune-advantage-v5':'cancel-fortune-advantage-v5',draft=>{
        if(draft.localRevision!==baseRevision)throw Object.assign(new Error('La partie a changé; redéclarez Chance → Avantage avant le jet.'),{code:'V5_EFFECT_STALE',userFacing:true});
        const rows=draft.extensions?.v5?.fortuneAdvantageDeclarations||[];
        let nextRows=rows.filter(row=>enabled?row.actorId!==actorId:declarationId?row.id!==declarationId:row.actorId!==actorId);
        if(enabled){
          const actor=(draft.combat?.participants||[]).find(row=>row.id===actorId);
          if(!actor)throw new TypeError('Acteur introuvable pour déclarer Chance → Avantage');
          declaration={id:uid(),actorId,characterId:v5ResourceIdentity(draft,actor),revision:draft.localRevision+1};
          nextRows=[...nextRows,declaration].slice(-100);
        }
        draft.extensions??={};draft.extensions.v5={...(draft.extensions.v5||{}),fortuneAdvantageDeclarations:nextRows};return draft;
      });
      const finish=persistence=>persistence?.ok===false?{status:'error',reason:persistence.error||'Déclaration non enregistrée'}:{status:'applied',declarationId:declaration?.id||null,persistence};
      return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    setFate(id, amount, { reason = '', baseRevision = localRevision, permanentResilienceLoss = false } = {}) {
      if (!Number.isSafeInteger(amount) || amount < 0 || typeof reason !== 'string' || !reason.trim()) throw new TypeError('Montant et motif MJ requis pour le Destin');
      return api.executeCommand('set-fate-v5', draft => {
        let fortuneMaximumReducedBy=0;
        if(draft.localRevision!==baseRevision)throw Object.assign(new Error('La partie a changé. Recalculez le solde de Destin.'),{code:'V5_EFFECT_STALE',userFacing:true});
        const subject=(draft.combat?.participants||[]).find(row=>row.id===id)||(draft.reserve||[]).find(row=>row.id===id)||(draft.persistentCharacters||[]).find(row=>row.id===id);
        if(!subject)throw new TypeError('Personnage introuvable');
        if(permanentResilienceLoss===true){
          if(subject.extensions?.legacyConversions?.v4ToV5!==true)throw new TypeError('La perte permanente de Résilience est réservée aux profils convertis V4.');
          const before=getV5Fate(draft,subject).permanent,fortune=getV5Fortune(draft,subject);
          if(before===null||amount>=before)throw new TypeError('La perte permanente de Résilience doit réduire le Destin permanent connu.');
          if(fortune.permanent===null)throw new TypeError('Initialisez la Chance permanente avant d’en réduire le maximum.');
          fortuneMaximumReducedBy=before-amount;
          draft=setV5Fortune(draft,subject,Math.max(0,fortune.permanent-fortuneMaximumReducedBy),{source:'mj'});
        }
        const identity=v5ResourceIdentity(draft,subject);
        const update=rows=>(rows||[]).map(row=>{
          const rowIdentity=v5ResourceIdentity(draft,row);
          if(row.id!==id&&rowIdentity!==identity)return row;
          const next=cloneValue(row);next.extensions={...(next.extensions||{}),v5:{...(next.extensions?.v5||{}),fate:amount}};
          if(Object.hasOwn(next,'fate'))next.fate=amount;return next;
        });
        draft.reserve=update(draft.reserve);draft.persistentCharacters=update(draft.persistentCharacters);
        draft.combat={...(draft.combat||{}),participants:update(draft.combat?.participants)};
        if(draft.activeScene)draft.activeScene={...draft.activeScene,participants:update(draft.activeScene.participants)};
        draft.suspendedScenes=(draft.suspendedScenes||[]).map(scene=>({...scene,participants:update(scene.participants)}));
        draft.log=[{id:uid(),kind:'management',actorId:id,text:`Destin attribué/modifié manuellement : ${amount} point(s)`,detail:{kind:'set-fate-v5',amount,reason:reason.trim(),...(permanentResilienceLoss?{permanentResilienceLoss:true,fortuneMaximumReducedBy}: {})}},...(draft.log||[])].slice(0,300);
        return draft;
      });
    },
    setFortune(id, amount, options = {}) {
      const captured = cloneValue(options), expected = captured.baseRevision ?? localRevision, characterId = uid();
      return api.executeCommand('set-fortune-v5', draft => {
        if (draft.localRevision !== expected) throw Object.assign(new Error('La partie a changé. Recalculez le compteur de Fortune.'), { code: 'V5_EFFECT_STALE', userFacing: true });
        const subject = (draft.combat?.participants || []).find(item => item.id === id) || (draft.reserve || []).find(item => item.id === id) || (draft.persistentCharacters || []).find(item => item.id === id);
        if (!subject) throw new TypeError('Personnage introuvable');
        if(captured.operation && !['correction','refresh'].includes(captured.operation))throw new TypeError('Opération de Chance invalide');
        if(captured.operation==='refresh')return refreshV5Fortune(draft,subject,amount,{reason:captured.reason,eventId:'fortune-refresh:'+characterId});
        return setV5Fortune(draft, subject, amount, { source: captured.source || 'mj', characterId });
      });
    },
    getCorruptionStatus(id) {
      const envelope = currentEnvelope();
      const sessionId = envelope.extensions?.v5?.talentSessionId || null;
      const subject = findCorruptionSubject(envelope, id);
      if (!subject) throw new TypeError('Personnage introuvable');
      return corruptionStatusFor(subject, localRevision, sessionId);
    },
    declareWarpstoneDailyExposure(id, { itemId, attackId, dayLabel, confirmed = false, baseRevision = localRevision } = {}) {
      const sourceId=itemId||attackId;
      if (confirmed !== true || typeof sourceId !== 'string' || !sourceId || typeof dayLabel !== 'string' || !dayLabel.trim() || dayLabel.length > 80)
        throw Object.assign(new TypeError('Confirmez la journée et l’objet de malepierre porté hors boîte plombée.'), { code: 'CORRUPTION_WARPSTONE_DECLARATION_REQUIRED', userFacing: true });
      return api.executeCommand('declare-warpstone-daily-exposure-v5', draft => {
        if (draft.localRevision !== baseRevision) throw Object.assign(new Error('La partie a changé. Relisez l’exposition de malepierre.'), { code: 'CORRUPTION_STALE', userFacing: true });
        const subject = findCorruptionSubject(draft, id);
        const candidateItem = itemId ? subject?.equipment?.find(row => row.id === itemId) : null;
        const item = candidateItem?.kind==='weapon'&&/warp|malepierre|ratling|skaven|jezzail/i.test(`${candidateItem.name||''} ${candidateItem.source||''}`)?candidateItem:null;
        const profile=subject?.extensions?.v5?.bestiary;
        const attack=attackId?subject?.actions?.find(row=>row.id===attackId&&row.type==='attack'&&String(row.name||'').trim().toLocaleLowerCase('en')==='warpstone shard*'):null;
        const profileAttack=Boolean(attack&&profile?.book==='L22'&&String(profile.name||'').trim()==='Rat Ogre Bonebreaker');
        if (!subject || (!item && !profileAttack)) throw Object.assign(new TypeError('L’objet ou l’attaque contenant de la malepierre doit être une source réelle portée par le personnage.'), { code: 'CORRUPTION_WARPSTONE_ITEM_REQUIRED', userFacing: true });
        const stableSourceId=item?`equipment:${item.id}`:`profile-attack:${profile.id}:${attack.id}`;
        const sourceName=item?item.name:attack.name;
        const key = `warpstone-daily:${id}:${stableSourceId}:${dayLabel.trim()}`;
        const current = subject.extensions?.v5?.pendingCorruptionExposures || [];
        const resolved = subject.extensions?.v5?.warpstoneDailyExposureKeys || [];
        if (current.some(row => row.id === key) || resolved.includes(key)) throw Object.assign(new Error('Cette exposition quotidienne liée à cet objet a déjà été déclarée.'), { code: 'CORRUPTION_WARPSTONE_DUPLICATE', userFacing: true });
        updateCorruptionCopies(draft, id, row => {
          const extensions = row.extensions || {}, v5 = extensions.v5 || {};
          row.extensions = { ...extensions, v5: { ...v5, pendingCorruptionExposures: [...(v5.pendingCorruptionExposures || []), {
            id: key, sourceRuleId: 'F-L22-0139', source: `Malepierre portée : ${sourceName} · ${dayLabel.trim()}`,
            influence: 'minor', exposure: 'exposure', difficultyDR: 0, ...(item?{equipmentId:item.id}:{profileId:profile.id,actionId:attack.id}), declaredDay: dayLabel.trim()
          }].slice(-100) } };
          return row;
        });
        return draft;
      });
    },
    getCorruptionMutationCatalog() {
      return cloneValue(V5_CORRUPTION_MUTATION_CATALOG);
    },
    setCorruptionPoints(id, amount, { reason = '', baseRevision = localRevision } = {}) {
      if (!Number.isSafeInteger(amount) || amount < 0 || typeof reason !== 'string' || !reason.trim()) throw new TypeError('Valeur entière connue et motif MJ requis');
      return api.executeCommand('set-corruption-points-v5', draft => {
        if (draft.localRevision !== baseRevision) throw Object.assign(new Error('La partie a changé. Relisez le solde de Corruption.'), { code: 'CORRUPTION_STALE', userFacing: true });
        const subject = findCorruptionSubject(draft, id);
        if (!subject) throw new TypeError('Personnage introuvable');
        const facts = corruptionFacts(subject), current = subject.extensions?.v5 || {};
        if (current.pendingCorruptionMutation) throw Object.assign(new Error('Confirmez ou refusez la mutation en attente avant de corriger les Points de Corruption.'), { code: 'CORRUPTION_PENDING', userFacing: true });
        updateCorruptionCopies(draft, id, row => {
          const v5 = row.extensions?.v5 || {};
          const pendingTest = amount > facts.threshold ? v5.pendingCorruptionTest : null;
          row.extensions = { ...(row.extensions || {}), v5: { ...v5, corruptionPoints: amount,
            corruptionEntry: { kind: 'gm-fact', value: amount, reason: reason.trim(), sourceRule: 'corruption-ledger', updatedAt: Date.now() },
            ...(pendingTest ? { pendingCorruptionTest: pendingTest } : { pendingCorruptionTest: null }) } };
          return row;
        });
        draft.log = [{ id: uid(), kind: 'management', actorId: id, actorName: subject.name,
          text: `${subject.name} : solde de Corruption connu fixé à ${amount} · décision MJ`,
          detail: { kind: 'set-corruption-points-v5', amount, reason: reason.trim() } }, ...(draft.log || [])].slice(0, 300);
        return draft;
      }).catch(error => error?.code === 'CORRUPTION_STALE' ? { status: 'stale', ok: false, error: error.message } : Promise.reject(error));
    },
    previewCorruptionExposure(id, input = {}) {
      const baseRevision = input.baseRevision ?? localRevision;
      if (baseRevision !== localRevision) return { status: 'stale', baseRevision: localRevision };
      const envelope = currentEnvelope();
      const sessionId = envelope.extensions?.v5?.talentSessionId || null;
      const subject = findCorruptionSubject(envelope, id);
      if (!subject) throw new TypeError('Personnage introuvable');
      return corruptionExposurePreview(subject, input, baseRevision, sessionId);
    },
    applyCorruptionExposure(id, preview) {
      if (preview?.status !== 'ready' || preview.participantId !== id || !preview.input || !Number.isSafeInteger(preview.baseRevision)) throw new TypeError('Aperçu de Corruption prêt requis');
      const baseRevision = preview.baseRevision, input = cloneValue(preview.input), exposureId = uid();
      return Promise.resolve(api.executeCommand('corruption-exposure-v5', draft => {
        if (draft.localRevision !== baseRevision) throw Object.assign(new Error('La partie a changé. Recalculez l’exposition à la Corruption.'), { code: 'CORRUPTION_STALE', userFacing: true });
        const subject = findCorruptionSubject(draft, id);
        if (!subject) throw new TypeError('Personnage introuvable');
        const sessionId = draft.extensions?.v5?.talentSessionId || null;
        const result = corruptionExposurePreview(subject, input, baseRevision, sessionId);
        const exposure = { id: exposureId, influence: result.test.influence, kind: result.test.exposure,
          sessionId, declaredSources: String(input.declaredSources || '').trim(),
          skillId: result.test.skillId, roll: result.test.roll, success: result.test.success, sl: result.test.sl,
          scoreSource: result.test.scoreInfo.scoreSource, ...(result.test.scoreInfo.scoreReason ? { scoreReason: result.test.scoreInfo.scoreReason } : {}),
          gainedPoints: result.gainedPoints, pointsAfter: result.corruptionPoints, threshold: result.threshold, createdAt: Date.now() };
        updateCorruptionCopies(draft, id, row => {
          const oldV5 = row.extensions?.v5 || {};
          const immediateSource=(oldV5.pendingCorruptionExposures||[]).find(item=>item.id===input.immediateExposureId);
          const nextPoints = result.corruptionPoints;
          const pendingCorruptionTest = result.thresholdTestRequired
            ? { id: `corruption-test:${exposureId}`, status: 'pending', sourceExposureId: exposureId, pointsAtTrigger: nextPoints, thresholdAtTrigger: result.threshold }
            : oldV5.pendingCorruptionTest || null;
          row.extensions = { ...(row.extensions || {}), v5: { ...oldV5, corruptionPoints: nextPoints,
            corruptionExposures: [...(oldV5.corruptionExposures || []), exposure].slice(-500),
            ...(input.immediateExposureId ? { pendingCorruptionExposures: (oldV5.pendingCorruptionExposures || []).filter(row => row.id !== input.immediateExposureId) } : {}),
            ...(immediateSource?.declaredDay ? { warpstoneDailyExposureKeys: [...new Set([...(oldV5.warpstoneDailyExposureKeys||[]), immediateSource.id])].slice(-500) } : {}),
            pendingCorruptionTest } };
          return row;
        });
        draft.log = [{ id: uid(), kind: 'management', actorId: id, actorName: subject.name,
          text: `${subject.name} : exposition ${result.test.exposure === 'prolonged' ? 'prolongée' : 'simple'} à la Corruption · ${result.gainedPoints} point(s)${input.immediateExposureId ? ` · source immédiate ${input.source || input.sourceRuleId || ''}` : ''}`,
          detail: { kind: 'corruption-exposure-v5', exposure, pendingThresholdTest: result.thresholdTestRequired } }, ...(draft.log || [])].slice(0, 300);
        return draft;
      })).then(result => result?.ok === false ? { status: 'error', ok: false, error: result.error }
        : { status: 'applied', ok: true, exposureId, baseRevision: baseRevision + 1 })
        .catch(error => error?.code === 'CORRUPTION_STALE' ? { status: 'stale', ok: false, error: error.message } : Promise.reject(error));
    },
    previewCorruptionThresholdTest(id, input = {}) {
      const baseRevision = input.baseRevision ?? localRevision;
      if (baseRevision !== localRevision) return { status: 'stale', baseRevision: localRevision };
      const subject = findCorruptionSubject(currentEnvelope(), id);
      if (!subject) throw new TypeError('Personnage introuvable');
      return corruptionThresholdPreview(subject, input, baseRevision);
    },
    applyCorruptionThresholdTest(id, preview) {
      if (!preview || preview.participantId !== id || !Number.isSafeInteger(preview.baseRevision)) throw new TypeError('Aperçu du Test de Corruption requis');
      const baseRevision = preview.baseRevision, input = cloneValue(preview.input || {}), testId = uid();
      return api.executeCommand('corruption-threshold-test-v5', draft => {
        if (draft.localRevision !== baseRevision) throw Object.assign(new Error('La partie a changé. Recalculez le Test contre la mutation.'), { code: 'CORRUPTION_STALE', userFacing: true });
        const subject = findCorruptionSubject(draft, id);
        if (!subject) throw new TypeError('Personnage introuvable');
        const result = corruptionThresholdPreview(subject, input, baseRevision);
        if (result.status === 'needs-input') throw Object.assign(new Error('Choix MJ requis avant d’appliquer le Test de Corruption.'), { code: 'CORRUPTION_INPUT', userFacing: true });
        const oldV5 = subject.extensions?.v5 || {};
        let pendingMutation = null;
        updateCorruptionCopies(draft, id, row => {
          const v5 = row.extensions?.v5 || {};
          if (result.status === 'not-required') {
            row.extensions = { ...(row.extensions || {}), v5: { ...v5, pendingCorruptionTest: null,
              lastCorruptionThresholdTest: { id: testId, status: 'not-required', threshold: result.threshold, corruptionPoints: result.corruptionPoints } } };
          } else if (result.outcome?.status === 'deferred') {
            row.extensions = { ...(row.extensions || {}), v5: { ...v5, pendingCorruptionTest: null,
              lastCorruptionThresholdTest: { id: testId, status: 'deferred', roll: result.test.roll, success: true, sl: result.test.sl, threshold: result.threshold } } };
          } else if (result.outcome?.mutation) {
            pendingMutation = { id: `corruption-mutation:${testId}`, status: 'pending', domain: result.outcome.mutation.domain,
              manifestation: result.manifestation, sourceTest: { roll: result.test.roll, success: false, sl: result.test.sl },
              sourceThresholdTestId: testId };
            row.extensions = { ...(row.extensions || {}), v5: { ...v5, pendingCorruptionTest: null,
              pendingCorruptionMutation: pendingMutation,
              lastCorruptionThresholdTest: { id: testId, status: 'mutation-pending', roll: result.test.roll, success: false, sl: result.test.sl, threshold: result.threshold } } };
          } else throw Object.assign(new Error('Résultat de Test de Corruption incomplet.'), { code: 'CORRUPTION_INPUT', userFacing: true });
          return row;
        });
        const status = pendingMutation ? 'mutation-pending' : result.status === 'not-required' ? 'not-required' : 'deferred';
        draft.log = [{ id: uid(), kind: 'management', actorId: id, actorName: subject.name,
          text: `${subject.name} : Test de seuil de Corruption · ${status}`,
          detail: { kind: 'corruption-threshold-test-v5', testId, status, ...(pendingMutation ? { domain: pendingMutation.domain } : {}) } }, ...(draft.log || [])].slice(0, 300);
        return draft;
      }).then(result => result?.ok === false ? { status: 'error', ok: false, error: result.error }
        : { status: 'applied', ok: true, resultId: testId, baseRevision: baseRevision + 1 })
        .catch(error => error?.code === 'CORRUPTION_STALE' ? { status: 'stale', ok: false, error: error.message } : Promise.reject(error));
    },
    resolveObsoleteCorruptionThresholdTest(id, { baseRevision = localRevision } = {}) {
      return api.executeCommand('resolve-obsolete-corruption-threshold-v5', draft => {
        if (draft.localRevision !== baseRevision) throw Object.assign(new Error('La partie a changé. Relisez le seuil de Corruption.'), { code: 'CORRUPTION_STALE', userFacing: true });
        const subject = findCorruptionSubject(draft, id);
        if (!subject) throw new TypeError('Personnage introuvable');
        const v5 = subject.extensions?.v5 || {};
        if (!v5.pendingCorruptionTest || v5.pendingCorruptionTest.status !== 'pending') throw Object.assign(new Error('Aucun Test de seuil en attente.'), { code: 'CORRUPTION_THRESHOLD_NOT_PENDING', userFacing: true });
        if (!Number.isSafeInteger(v5.corruptionPoints) || v5.corruptionPoints < 0) throw Object.assign(new Error('Points de Corruption connus requis.'), { code: 'CORRUPTION_POINTS_REQUIRED', userFacing: true });
        const facts = corruptionFacts(subject);
        if (v5.corruptionPoints > facts.threshold) throw Object.assign(new Error('Le solde dépasse toujours le seuil actuel ; le Test de Résistance reste requis.'), { code: 'CORRUPTION_THRESHOLD_STILL_EXCEEDED', userFacing: true });
        updateCorruptionCopies(draft, id, row => {
          const rowV5 = row.extensions?.v5 || {};
          row.extensions = { ...(row.extensions || {}), v5: { ...rowV5, pendingCorruptionTest: null,
            lastCorruptionThresholdTest: { id: rowV5.pendingCorruptionTest.id, status: 'not-required-after-threshold-change', threshold: facts.threshold, corruptionPoints: rowV5.corruptionPoints, resolvedAt: Date.now() } } };
          return row;
        });
        draft.log = [{ id: uid(), kind: 'management', actorId: id, actorName: subject.name,
          text: `${subject.name} : Test de seuil de Corruption clôturé, seuil actuel non dépassé`,
          detail: { kind: 'resolve-obsolete-corruption-threshold-v5', threshold: facts.threshold, corruptionPoints: v5.corruptionPoints } }, ...(draft.log || [])].slice(0, 300);
        return draft;
      }).then(result => result?.ok === false ? { status: 'error', ok: false, error: result.error } : { status: 'resolved', ok: true })
        .catch(error => error?.code === 'CORRUPTION_STALE' ? { status: 'stale', ok: false, error: error.message } : Promise.reject(error));
    },
    confirmCorruptionMutation(id, { mutationId, catalogSelection = null, compatibilityDomain = null, baseRevision = localRevision } = {}) {
      if (!catalogSelection && (typeof mutationId !== 'string' || !mutationId.trim())) throw new TypeError('Description ou référence de mutation choisie par le MJ requise');
      const capturedId = typeof mutationId === 'string' ? mutationId.trim() : '';
      return api.executeCommand('confirm-corruption-mutation-v5', draft => {
        if (draft.localRevision !== baseRevision) throw Object.assign(new Error('La partie a changé. Relisez la mutation en attente.'), { code: 'CORRUPTION_STALE', userFacing: true });
        const subject = findCorruptionSubject(draft, id);
        if (!subject) throw new TypeError('Personnage introuvable');
        const v5 = subject.extensions?.v5 || {}, facts = corruptionFacts(subject);
        const selectedCatalog = catalogSelection ? resolveCorruptionMutationSelection(catalogSelection) : null;
        const pendingDomain = v5.pendingCorruptionMutation?.domain;
        if (selectedCatalog?.domain && v5.pendingCorruptionMutation?.status === 'pending' && selectedCatalog.domain !== pendingDomain) {
          throw Object.assign(new Error(`Cette table est ${selectedCatalog.domain === 'physical' ? 'physique' : 'mentale'} et ne correspond pas au domaine en attente.`), { code: 'CORRUPTION_DOMAIN_MISMATCH', userFacing: true });
        }
        if (selectedCatalog && !selectedCatalog.domain) {
          if (!['physical', 'mental'].includes(compatibilityDomain)) throw Object.assign(new Error('Choisissez explicitement si cette table sans domaine correspond à la mutation physique ou mentale.'), { code: 'CORRUPTION_COMPATIBILITY_REQUIRED', userFacing: true });
          if (v5.pendingCorruptionMutation?.status === 'pending' && compatibilityDomain !== pendingDomain) throw Object.assign(new Error('La compatibilité choisie ne correspond pas au domaine K1 en attente.'), { code: 'CORRUPTION_DOMAIN_MISMATCH', userFacing: true });
        } else if (compatibilityDomain !== null) {
          throw Object.assign(new Error('Un choix de compatibilité n’est pas applicable à une table dont le domaine est déjà établi.'), { code: 'CORRUPTION_COMPATIBILITY_UNEXPECTED', userFacing: true });
        }
        const result = confirmCorruptionMutationPure({ authoritativeState: {
          corruptionPoints: v5.corruptionPoints, toughnessBonus: facts.toughnessBonus, willpowerBonus: facts.willpowerBonus,
          pureSoul: facts.pureSoul, corruptionMutations: v5.corruptionMutations || [], pendingCorruptionMutation: v5.pendingCorruptionMutation
        }, mutationId: selectedCatalog?.entryId || capturedId, confirmed: true });
        if (result.status === 'stale') throw Object.assign(new Error('Le seuil a changé depuis le Test; recalculez le statut.'), { code: 'CORRUPTION_STALE', userFacing: true });
        const mutation = { ...result.mutation, ...(selectedCatalog ? cloneValue(selectedCatalog) : {}),
          description: selectedCatalog?.label || capturedId, effectsApplied: false,
          ...(selectedCatalog && !selectedCatalog.domain ? { compatibilityDecision: { domain: compatibilityDomain, decidedBy: 'gm', decision: 'compatible-with-pending-k1-domain' } } : {}),
          confirmation: { confirmedBy: 'gm', confirmedAt: Date.now() },
          manifestation: cloneValue(v5.pendingCorruptionMutation.manifestation) };
        updateCorruptionCopies(draft, id, row => {
          const rowV5 = row.extensions?.v5 || {};
          row.extensions = { ...(row.extensions || {}), v5: { ...rowV5, corruptionPoints: result.corruptionPoints,
            corruptionMutations: [...(rowV5.corruptionMutations || []), mutation], pendingCorruptionMutation: null,
            ...(result.characterLoss ? { pendingCorruptionCharacterLoss: { id: `corruption-loss:${result.mutation.id}`, status: 'pending', sourceMutationId: result.mutation.id,
              physicalMutationCount: result.physicalMutationCount, mentalMutationCount: result.mentalMutationCount } } : {}) } };
          return row;
        });
        draft.log = [{ id: uid(), kind: 'management', actorId: id, actorName: subject.name,
          text: `${subject.name} : mutation confirmée par le MJ · ${selectedCatalog?.label || capturedId}`,
          detail: { kind: 'confirm-corruption-mutation-v5', mutationId: result.mutation.id, domain: result.mutation.domain, characterLossPending: Boolean(result.characterLoss) } }, ...(draft.log || [])].slice(0, 300);
        return draft;
      }).then(result => result?.ok === false ? { status: 'error', ok: false, error: result.error }
        : { status: 'confirmed', ok: true })
        .catch(error => error?.code === 'CORRUPTION_STALE' ? { status: 'stale', ok: false, error: error.message } : Promise.reject(error));
    },
    declineCorruptionMutation(id, { baseRevision = localRevision } = {}) {
      return Promise.resolve(api.executeCommand('decline-corruption-mutation-v5', draft => {
        if (draft.localRevision !== baseRevision) throw Object.assign(new Error('La partie a changé. Relisez la mutation en attente.'), { code: 'CORRUPTION_STALE', userFacing: true });
        const subject = findCorruptionSubject(draft, id);
        if (!subject) throw new TypeError('Personnage introuvable');
        const v5 = subject.extensions?.v5 || {};
        if (!v5.pendingCorruptionMutation || v5.pendingCorruptionMutation.status !== 'pending') throw Object.assign(new Error('Aucune mutation en attente à refuser.'), { code: 'CORRUPTION_MUTATION_NOT_PENDING', userFacing: true });
        const result = confirmCorruptionMutationPure({ authoritativeState: {
          corruptionPoints: v5.corruptionPoints, toughnessBonus: corruptionFacts(subject).toughnessBonus,
          willpowerBonus: corruptionFacts(subject).willpowerBonus, pureSoul: corruptionFacts(subject).pureSoul,
          corruptionMutations: v5.corruptionMutations || [], pendingCorruptionMutation: v5.pendingCorruptionMutation
        }, mutationId: 'gm-declined', confirmed: false });
        updateCorruptionCopies(draft, id, row => {
          const rowV5 = row.extensions?.v5 || {};
          row.extensions = { ...(row.extensions || {}), v5: { ...rowV5, pendingCorruptionMutation: null,
            lastCorruptionMutationDecision: { id: v5.pendingCorruptionMutation.id, status: 'declined', decidedAt: Date.now() } } };
          return row;
        });
        draft.log = [{ id: uid(), kind: 'management', actorId: id, actorName: subject.name,
          text: `${subject.name} : mutation de Corruption refusée par le MJ`,
          detail: { kind: 'decline-corruption-mutation-v5', mutationId: v5.pendingCorruptionMutation.id } }, ...(draft.log || [])].slice(0, 300);
        return draft;
      })).then(result => result?.ok === false ? { status: 'error', ok: false, error: result.error } : { status: 'declined', ok: true })
        .catch(error => error?.code === 'CORRUPTION_STALE' ? { status: 'stale', ok: false, error: error.message } : Promise.reject(error));
    },
    applyCorruptionAbsolution(id, { amount, reason, baseRevision = localRevision } = {}) {
      if (typeof reason !== 'string' || !reason.trim()) throw new TypeError('Motif de l’absolution fixé par le MJ requis');
      return api.executeCommand('corruption-absolution-v5', draft => {
        if (draft.localRevision !== baseRevision) throw Object.assign(new Error('La partie a changé. Relisez le solde de Corruption.'), { code: 'CORRUPTION_STALE', userFacing: true });
        const subject = findCorruptionSubject(draft, id);
        if (!subject) throw new TypeError('Personnage introuvable');
        const v5 = subject.extensions?.v5 || {};
        if (v5.pendingCorruptionMutation) throw Object.assign(new Error('Confirmez ou refusez la mutation en attente avant l’absolution.'), { code: 'CORRUPTION_PENDING', userFacing: true });
        const result = applyCorruptionAbsolutionPure({ currentPoints: v5.corruptionPoints, amount, reason });
        const facts = corruptionFacts(subject);
        updateCorruptionCopies(draft, id, row => {
          const rowV5 = row.extensions?.v5 || {};
          row.extensions = { ...(row.extensions || {}), v5: { ...rowV5, corruptionPoints: result.corruptionPoints,
            corruptionAbsolutions: [...(rowV5.corruptionAbsolutions || []), { ...result.absolution, id: uid(), createdAt: Date.now() }],
            ...(result.corruptionPoints <= facts.threshold ? { pendingCorruptionTest: null } : {}) } };
          return row;
        });
        draft.log = [{ id: uid(), kind: 'management', actorId: id, actorName: subject.name,
          text: `${subject.name} : absolution de Corruption · −${amount} point(s)`,
          detail: { kind: 'corruption-absolution-v5', amount, reason: reason.trim() } }, ...(draft.log || [])].slice(0, 300);
        return draft;
      }).then(result => result?.ok === false ? { status: 'error', ok: false, error: result.error }
        : { status: 'applied', ok: true })
        .catch(error => error?.code === 'CORRUPTION_STALE' ? { status: 'stale', ok: false, error: error.message } : Promise.reject(error));
    },
    decideCorruptionCharacterLoss(id, { confirmed, reason, baseRevision = localRevision } = {}) {
      if (typeof confirmed !== 'boolean' || typeof reason !== 'string' || !reason.trim()) throw new TypeError('Décision et motif MJ requis pour la perte de personnage');
      return api.executeCommand('decide-corruption-character-loss-v5', draft => {
        if (draft.localRevision !== baseRevision) throw Object.assign(new Error('La partie a changé. Relisez la décision de perte.'), { code: 'CORRUPTION_STALE', userFacing: true });
        const subject = findCorruptionSubject(draft, id);
        if (!subject) throw new TypeError('Personnage introuvable');
        const pending = subject.extensions?.v5?.pendingCorruptionCharacterLoss;
        if (!pending || pending.status !== 'pending') throw Object.assign(new Error('Aucune perte de personnage à arbitrer.'), { code: 'CORRUPTION_PENDING', userFacing: true });
        updateCorruptionCopies(draft, id, row => {
          const v5 = row.extensions?.v5 || {};
          row.extensions = { ...(row.extensions || {}), v5: { ...v5, pendingCorruptionCharacterLoss: null,
            corruptionCharacterLoss: { id: pending.id, status: confirmed ? 'confirmed' : 'declined', control: confirmed ? 'gm' : null, reason: reason.trim(), decidedBy: 'gm', decidedAt: Date.now() } } };
          return row;
        });
        draft.log = [{ id: uid(), kind: 'management', actorId: id, actorName: subject.name,
          text: `${subject.name} : perte de personnage ${confirmed ? 'confirmée' : 'refusée'} par le MJ`,
          detail: { kind: 'decide-corruption-character-loss-v5', confirmed, reason: reason.trim() } }, ...(draft.log || [])].slice(0, 300);
        return draft;
      }).then(result => result?.ok === false ? { status: 'error', ok: false, error: result.error }
        : { status: confirmed ? 'confirmed' : 'declined', ok: true })
        .catch(error => error?.code === 'CORRUPTION_STALE' ? { status: 'stale', ok: false, error: error.message } : Promise.reject(error));
    },
    healCriticalWound(participantId, criticalId) {
      return api.executeCommand('heal-critical-wound', draft => {
        const participant = (draft.combat?.participants || []).find(row => row.id === participantId);
        if (!participant) throw new TypeError('Participant introuvable');
        const records = participant.extensions?.v5?.criticalWounds || [];
        const critical = records.find(row => row.id === criticalId);
        if (!critical) throw new TypeError('Blessure Critique introuvable');
        participant.extensions.v5.criticalWounds = records.filter(row => row.id !== criticalId);
        const be=criticalDeathToughnessBonus(participant);if(be!==null){const reconciled=updateCriticalDeathCountdown(participant,{round:draft.combat?.round,toughnessBonus:be});if(reconciled.participant)Object.assign(participant,reconciled.participant);}
        draft.log = [{ id: uid(), kind: 'management', actorId: participantId, actorName: participant.name,
          text: `${participant.name} : Blessure Critique guérie manuellement · ${critical.name || criticalId}`,
          detail: { kind: 'heal-critical-wound', critical: cloneValue(critical) } }, ...(draft.log || [])].slice(0, 300);
        return draft;
      });
    },
    decideCriticalDeath(participantId, decision, options = {}) {
      const captured=cloneValue(options);
      return api.executeCommand('decide-critical-death-v5',draft=>{
        const index=(draft.combat?.participants||[]).findIndex(row=>row.id===participantId);if(index<0)throw new TypeError('Participant introuvable');
        const result=decideV5CriticalDeath(draft.combat.participants[index],{decision,round:draft.combat?.round});
        if(!['dead','declined'].includes(result.status))throw Object.assign(new Error(result.reason||'Confirmation MJ requise.'),{userFacing:true,code:'CRITICAL_DEATH_CONFIRMATION'});
        draft.combat.participants[index]=result.participant;return draft;
      });
    },
    decideImmediateCriticalDeath(participantId, criticalId, decision) {
      return api.executeCommand('decide-immediate-critical-death-v5',draft=>{
        const index=(draft.combat?.participants||[]).findIndex(row=>row.id===participantId);if(index<0)throw new TypeError('Participant introuvable');
        const result=decideV5ImmediateCriticalDeath(draft.combat.participants[index],{criticalId,decision});
        if(!['dead','declined'].includes(result.status))throw Object.assign(new Error(result.reason||'Confirmation MJ requise.'),{userFacing:true,code:'CRITICAL_DEATH_CONFIRMATION'});
        draft.combat.participants[index]=result.participant;return draft;
      });
    },
    setSuddenDeathEnabled(enabled) {
      if (typeof enabled !== 'boolean') throw new TypeError('Réglage Mort subite invalide');
      return api.executeCommand('set-sudden-death-option-v5', draft => {
        draft.extensions ??= {}; draft.extensions.v5 ??= {};
        draft.extensions.v5.suddenDeathEnabled = enabled;
        return draft;
      });
    },
    previewSuddenDeath(participantId, secondaryNpcConfirmed = false) {
      const snapshot = currentEnvelope();
      const participant = snapshot.combat?.participants?.find(row => row.id === participantId);
      if (!participant) return { status: 'blocked', ready: false, reason: 'Participant introuvable.', baseRevision: localRevision };
      return { ...previewV5SuddenDeath(participant, { tableOptionEnabled: snapshot.extensions?.v5?.suddenDeathEnabled === true, secondaryNpcConfirmed }), baseRevision: localRevision };
    },
    decideSuddenDeath(participantId, outcome, { secondaryNpcConfirmed = false, baseRevision } = {}) {
      return api.executeCommand('decide-sudden-death-v5', draft => {
        if (baseRevision !== undefined && baseRevision !== localRevision) throw Object.assign(new Error('La partie a changé depuis l’aperçu : actualisez avant de choisir.'), { userFacing: true, code: 'SUDDEN_DEATH_STALE' });
        if (draft.extensions?.v5?.suddenDeathEnabled !== true) throw Object.assign(new Error('Option Mort subite désactivée.'), { userFacing: true, code: 'SUDDEN_DEATH_DISABLED' });
        const index = (draft.combat?.participants || []).findIndex(row => row.id === participantId);
        if (index < 0) throw new TypeError('Participant introuvable');
        const plan = previewV5SuddenDeath(draft.combat.participants[index], { tableOptionEnabled: true, secondaryNpcConfirmed });
        const result = decideV5SuddenDeath(draft.combat.participants[index], plan, outcome);
        if (!['dead', 'unconscious'].includes(result.status)) throw Object.assign(new Error(result.reason || 'Choix MJ requis.'), { userFacing: true, code: 'SUDDEN_DEATH_CONFIRMATION' });
        draft.combat.participants[index] = result.participant;
        draft.log = [{ id: uid(), kind: 'management', actorId: participantId, actorName: result.participant.name, text: `${result.participant.name} : mort subite — ${result.status === 'dead' ? 'mort' : 'inconscient'} (choix MJ)`, detail: { kind: 'sudden-death', outcome: result.status } }, ...(draft.log || [])].slice(0, 300);
        return draft;
      });
    },
    previewAmputationShock(input={}) {
      const snapshot=currentEnvelope(),participant=snapshot.combat?.participants?.find(row=>row.id===input.participantId);
      if(!participant)return{status:'blocked',ready:false,reason:'Participant introuvable.',baseRevision:localRevision};
      const record=(participant.extensions?.v5?.criticalAftermath||[]).find(row=>row.id===input.criticalId);
      if(!record)return{status:'blocked',ready:false,reason:'Blessure Critique introuvable.',baseRevision:localRevision};
      const receipts=[...(record.amputationShock?[record.amputationShock]:[]),...(record.amputationShocks||[])];
      const requirements=amputationShockRequirements(record).filter(row=>!receipts.some(receipt=>receipt.part===row.part&&receipt.difficultyDR===row.difficultyDR)&&(row.trigger!=='all-fingers-lost'||receipts.some(receipt=>receipt.part==='finger')));
      const selected=input.shockPart?requirements.filter(row=>row.part===input.shockPart):requirements;
      const deferredUntil=record.amputationShockDeferrals?.[input.shockPart||selected[0]?.part]?.untilRound;
      if(Number.isSafeInteger(deferredUntil)&&deferredUntil>Number(snapshot.combat?.round||0))return{status:'deferred',ready:false,reason:`Réexamen au Round ${deferredUntil}.`,deferredUntil,requirements:selected,baseRevision:localRevision};
      const difficulties=[...new Set(selected.map(row=>row.difficultyDR).filter(Number.isSafeInteger))];
      if(!selected.length)return{status:'duplicate',ready:false,record:cloneValue(record),baseRevision:localRevision};
      if(difficulties.length!==1)return{status:'blocked',ready:false,reason:'Difficulté source d’amputation absente ou ambiguë.',baseRevision:localRevision};
      if(input.difficultyDR!==undefined&&input.difficultyDR!==difficulties[0])return{status:'blocked',ready:false,reason:'Difficulté différente de la table V5 pour cette amputation.',baseRevision:localRevision};
      return{...previewV5AmputationShock({...input,participant,difficultyDR:difficulties[0]}),baseRevision:localRevision,requirements:selected};
    },
    deferAmputationShock(participantId,criticalId,shockPart) {
      return api.executeCommand('defer-amputation-shock-v5',draft=>{
        const index=(draft.combat?.participants||[]).findIndex(row=>row.id===participantId);if(index<0)throw Object.assign(new Error('Participant introuvable.'),{userFacing:true});
        const participant=draft.combat.participants[index],aftermath=participant.extensions?.v5?.criticalAftermath||[],record=aftermath.find(row=>row.id===criticalId);
        if(!record)throw Object.assign(new Error('Blessure Critique introuvable.'),{userFacing:true});
        const eligible=amputationShockRequirements(record).some(row=>row.part===shockPart&&row.trigger==='all-fingers-lost');
        const receipts=[...(record.amputationShock?[record.amputationShock]:[]),...(record.amputationShocks||[])];
        if(!eligible||!receipts.some(receipt=>receipt.part==='finger')||receipts.some(receipt=>receipt.part===shockPart))throw Object.assign(new Error('Ce choc ne peut pas être reporté.'),{userFacing:true});
        const untilRound=Math.max(1,Number(draft.combat?.round||0)+1);
        draft.combat.participants[index]={...participant,extensions:{...(participant.extensions||{}),v5:{...(participant.extensions?.v5||{}),criticalAftermath:aftermath.map(row=>row.id===criticalId?{...row,amputationShockDeferrals:{...(row.amputationShockDeferrals||{}),[shockPart]:{untilRound}}}:row)}}};
        draft.log=[{id:uid(),kind:'management',actorId:participantId,actorName:participant.name,text:`${participant.name} : choc d’amputation de la main reporté au Round ${untilRound}`,detail:{kind:'amputation-shock-deferred',criticalId,shockPart,untilRound}},...(draft.log||[])].slice(0,300);
        return draft;
      });
    },
    applyAmputationShock(preview={}) {
      if(preview.status==='duplicate')return Promise.resolve({status:'duplicate',record:cloneValue(preview.record)});
      if(preview.ready!==true)return Promise.resolve({status:preview.status||'blocked',reason:preview.reason||'Aperçu de choc d’amputation non prêt.'});
      if(!Number.isSafeInteger(preview.baseRevision))return Promise.resolve({status:'stale',reason:'Révision de l’aperçu absente.'});
      let receipt;
      const saved=api.executeCommand('apply-amputation-shock-v5',draft=>{
        if(draft.localRevision!==preview.baseRevision)throw Object.assign(new Error('La partie a changé; recalculez le choc d’amputation.'),{code:'V5_AMPUTATION_STALE',userFacing:true});
        const index=(draft.combat?.participants||[]).findIndex(row=>row.id===preview.participantId);if(index<0)throw Object.assign(new Error('Participant introuvable.'),{userFacing:true});
        const result=applyV5AmputationShock(draft.combat.participants[index],preview);
        if(result.status!=='applied'&&result.status!=='duplicate')throw Object.assign(new Error(result.reason||'Choc d’amputation refusé.'),{userFacing:true});
        if(result.status==='applied')draft.combat.participants[index]=result.participant;
        receipt={status:result.status,participantId:preview.participantId,criticalId:preview.criticalId,record:result.record||null};
        const appliedPart=result.record?.amputationShocks?.at(-1)?.part||result.record?.amputationShock?.part||preview.shockPart||'amputation';
        draft.log=[{id:uid(),kind:'management',actorId:preview.participantId,actorName:draft.combat.participants[index].name,text:`${draft.combat.participants[index].name} : choc d’amputation appliqué · ${appliedPart}`,detail:{kind:'amputation-shock',receipt:cloneValue(receipt)}},...(draft.log||[])].slice(0,300);
        return draft;
      });
      const finish=result=>result?.ok===false?{status:'error',reason:result.error}:{...receipt,persistence:result};
      return saved&&typeof saved.then==='function'?saved.then(finish):Promise.resolve(finish(saved));
    },
    recoverCondition(id, condition, options = {}) {
      const captured = cloneValue(options);
      return commitV5Effect('recover-condition-v5', id, (participant, draft) => recoverV5Condition(participant, condition, v5EffectContext(draft, captured)), options);
    },
    healWounds(id, amount, options = {}) {
      // Un homoncule ne guérit que par guérison naturelle ou par la magie (`options.source = { kind: 'natural' | 'spell' }`).
      const check = previewFamiliarHealing(combat.participants.get(id), options.source || {});
      if (!check.ok) return Promise.resolve({ ok: false, status: 'refused', reason: 'familiar-healing', error: new Error(check.receipt.message), message: check.receipt.message, receipt: check.receipt });
      return commitV5Effect('heal-wounds-v5', id, participant => healV5Wounds(participant, amount), options);
    },

    moveParticipant(id, zone, beforeId = null) {
      if (!canMutate()) return false;
      const p = combat.participants.get(id); if (!p) return;
      if(zone==='active'&&p.zone!=='active'&&Number(combat.round)===0&&stateExtensions?.v5?.combatInitiativeInitialized===true&&!p.extensions?.v5?.combatInitiative?.initialized)
        throw Object.assign(new Error('Un combattant activé avant le Round 1 doit recevoir son jet d’Initiative dans le dialogue de préparation.'),{code:'COMBAT_INIT_REQUIRED',userFacing:true});
      if (persistence) return api.executeCommand('move-participant', draft => {
        let participants = (draft.combat?.participants || []).map(item => item.id === id ? { ...item, zone } : item);
        // Au banc, le participant quitte sa monture et libère ses cavaliers (comme updateParticipant).
        if (zone === 'bench') participants = dismountLinkedRiders(participants.map(item => item.id === id ? clearMountedRelation(item) : item), id);
        const remaining = (draft.combat?.order || []).filter(item => item !== id);
        const active = remaining.filter(item => participants.find(p => p.id === item)?.zone === 'active');
        const bench = remaining.filter(item => participants.find(p => p.id === item)?.zone === 'bench');
        const target = zone === 'active' ? active : bench;
        const automatic = (draft.combat?.orderMode || orderMode) !== ORDER_MODES.MANUAL;
        const position = beforeId && target.includes(beforeId) ? target.indexOf(beforeId)
          : (zone === 'active' && beforeId === null && automatic ? initiativeIndex(target, id, participants) : target.length);
        target.splice(position, 0, id);
        const next={ ...draft, combat: { ...draft.combat, participants, order: [...active, ...bench], orderMode: zone === 'active' && beforeId !== null ? ORDER_MODES.MANUAL : orderMode } };
        if(zone==='active'&&draft.extensions?.v5?.combatInitiativeInitialized)registerNewV5Participants(draft,next);
        return next;
      });
      p.zone = zone; if (zone === 'active' && beforeId !== null) orderMode = ORDER_MODES.MANUAL;
      if (zone === 'bench') {
        Object.assign(p, clearMountedRelation(p));
        combat.participants.forEach((item, key) => {
          if (key === id || item.extensions?.v5?.mounted !== true || item.extensions.v5.mountId !== id) return;
          const linkedRider = clearMountedRelation(item); combat.participants.set(key, linkedRider); markDirty(`combat/participants/${key}`, linkedRider);
        });
      }
      const remainingOrder = combat.order.filter(xId => xId !== id);
      const activeOrder = remainingOrder.filter(xId => combat.participants.get(xId)?.zone === 'active');
      const benchOrder = remainingOrder.filter(xId => combat.participants.get(xId)?.zone === 'bench');
      const targetArr = zone === 'active' ? activeOrder : benchOrder;
      if (beforeId && targetArr.includes(beforeId)) targetArr.splice(targetArr.indexOf(beforeId), 0, id);
      else if (zone === 'active' && beforeId === null && orderMode !== ORDER_MODES.MANUAL) targetArr.splice(initiativeIndex(targetArr, id, Array.from(combat.participants.values())), 0, id);
      else targetArr.push(id);
      combat.order = [...activeOrder, ...benchOrder];
      markDirty(`combat/participants/${id}`, p); markDirty('combat/meta', { round: combat.round, currentActorId: combat.currentActorId, order: combat.order, orderMode }); save(); emitBus('combat');
    },

    // Ordered participants first, then those outside the order (bench after a
    // launch), which never take a turn but must stay visible.
    listParticipants() {
      const ordered = combat.order.map(id => combat.participants.get(id)).filter(Boolean);
      const inOrder = new Set(ordered.map(p => p.id));
      const outside = Array.from(combat.participants.values()).filter(p => !inOrder.has(p.id)).sort(byInitiative);
      return [...ordered, ...outside];
    },

    setRoundTurn(round, currentActorId) {
      if (!canMutate()) return false;
      if (persistence) return api.executeCommand('set-round-turn', draft => {
        let next={ ...draft, combat: { ...draft.combat, round, currentActorId } };if(round>(draft.combat?.round||0))next.combat=detonateDueV5Bombs(next.combat,draft.combat?.currentActorId,Number(draft.extensions?.v5?.turnIndex)||0);reconcileCriticalDeathForRound(next,round);return next;
      });
      beginCommand('set-round-turn');const oldRound=combat.round||0,oldActorId=combat.currentActorId; combat.round = round; combat.currentActorId = currentActorId;
      if(round>oldRound){const next=detonateDueV5Bombs({participants:Array.from(combat.participants.values())},oldActorId,Number(stateExtensions?.v5?.turnIndex)||0);for(const participant of next.participants)combat.participants.set(participant.id,participant);}
      const participants=Array.from(combat.participants.values());reconcileCriticalDeathForRound({combat:{participants}},round);for(const participant of participants)combat.participants.set(participant.id,participant);
      const clock = stateExtensions?.v5?.gameClock;
      if (clock) {
        const reconciled = reconcileGameClockPosition(clock, readCombatPosition(currentEnvelope()));
        if (reconciled.changed) stateExtensions = {
          ...stateExtensions,
          v5: { ...(stateExtensions.v5 || {}), gameClock: reconciled.clock }
        };
      }
      markDirty('combat/meta', { round: combat.round, currentActorId: combat.currentActorId, order: combat.order }); save(); emitBus('combat');
    },
    rebuildOrder() {
      if (persistence) return api.executeCommand('rebuild-order', draft => {
        const participants = draft.combat?.participants || [];
        if(draft.extensions?.v5?.combatInitiativeInitialized){
          const order=effectiveOrder(participants,{mode:ORDER_MODES.AUTOMATIC,order:draft.combat?.order||[],autoOrder:draft.extensions?.v5?.combatInitiativeResolution?.order,round:draft.combat?.round});
          return {...draft,combat:{...draft.combat,order,orderMode:ORDER_MODES.AUTOMATIC}};
        }
        const order = participants.slice().sort((a, b) => Number(b.initiative) - Number(a.initiative) || String(a.name).localeCompare(String(b.name))).map(participant => participant.id);
        return { ...draft, combat: { ...draft.combat, order } };
      });
      if(stateExtensions?.v5?.combatInitiativeInitialized){
        orderMode=ORDER_MODES.AUTOMATIC;
        combat.order=effectiveOrder(Array.from(combat.participants.values()),{mode:ORDER_MODES.AUTOMATIC,order:combat.order,autoOrder:stateExtensions.v5.combatInitiativeResolution?.order,round:combat.round});
        markDirty('combat/meta',{round:combat.round,currentActorId:combat.currentActorId,order:combat.order,orderMode});save();emitBus('combat');return;
      }
      setOrderByInitiative();
      markDirty('combat/meta', { round: combat.round, currentActorId: combat.currentActorId, order: combat.order });
    },

    getEffectiveOrder() { return effectiveCombatOrder(); },
    getOrderMode() { return orderMode; },
    isCombatInitiativeInitialized() { return stateExtensions?.v5?.combatInitiativeInitialized===true; },
    previewEncounterLaunch(idOrEncounter) {
      const encounter=typeof idOrEncounter==='string'?encounters.find(item=>item.id===idOrEncounter):idOrEncounter;
      if(!encounter)throw new Error('Rencontre introuvable');
      let sequence=0;
      const scene=launchEncounter(encounter,{profiles:Array.from(reserve.values()),persistentCharacters,activeScene,now:null,idFactory:()=>`f2a:launch:${encounter.id}:${localRevision}:${sequence++}`});
      return {scene,baseRevision:localRevision,encounterId:encounter.id,kind:'launch'};
    },
    previewCombatRestart() {
      const scene=activeScene?.status==='active'?activeScene:null;
      if(scene){
        const encounter=encounters.find(item=>item.id===scene.encounterId);
        if(!encounter)throw new Error('Rencontre d’origine introuvable');
        if(!(encounter.entries||[]).length)throw new Error('La rencontre n’a plus aucun combattant');
        let sequence=0;
        const launched=launchEncounter(encounter,{profiles:Array.from(reserve.values()),persistentCharacters,activeScene:null,now:null,idFactory:()=>`f2a:restart:${encounter.id}:${localRevision}:${sequence++}`});
        return {kind:'restart-scene',baseRevision:localRevision,encounterId:encounter.id,sceneId:scene.id,startedAt:scene.startedAt,scene:{...launched,id:scene.id,startedAt:scene.startedAt}};
      }
      const participants=Array.from(combat.participants.values()).map(item=>withMomentum({...item,hp:item.maxHp??item.hp,states:[],extensions:{...(item.extensions||{}),v5:{...(item.extensions?.v5||{}),combatInitiative:undefined}}},false));
      return {kind:'restart-free',baseRevision:localRevision,participants,participantIds:participants.filter(row=>row.zone==='active').map(row=>row.id)};
    },
    previewCombatInitialization(input = {}) {
      const captured=cloneValue(input||{}),expected=captured.baseRevision??captured.scenePreview?.baseRevision??captured.staging?.baseRevision??localRevision;
      const scenePreview=captured.scenePreview?cloneValue(captured.scenePreview):null,staging=captured.staging?cloneValue(captured.staging):null;
      const participants=Array.isArray(captured.participants)?captured.participants:scenePreview?.scene?.participants||staging?.scene?.participants||staging?.participants||currentEnvelope().combat?.participants||[];
      const plan=prepareCombatInitiative(participants,{...staging,...captured,tieOrders:captured.tieOrders??staging?.tieOrders,opposedRolls:captured.opposedRolls??staging?.opposedRolls,tieChoices:captured.tieChoices??staging?.tieChoices});
      if(captured.startCombat===true&&!participants.some(row=>row?.zone==='active')){
        plan.needsInput.push({field:'activeCombatants',label:'Au moins un combattant actif est requis pour initialiser le combat.'});
        plan.ready=false;plan.status='requires-input';
      }
      const mountedAmbush = [];
      if (captured.surprisedCamp) for (const rider of participants.filter(row => row.zone === 'active' && row.camp === captured.surprisedCamp && row.extensions?.v5?.mounted === true && row.extensions?.v5?.mountId)) {
        const fall = planMountedFall({ event: 'rider-surprised' });
        if (!fall.requiredTest) continue;
        const skill = (rider.skills || []).find(row => row?.id === V5_RIDE_SKILL_ID && row.status !== 'unresolved');
        const answer = captured.mountedRideTests?.[rider.id] || {};
        const score = Number.isSafeInteger(skill?.total) ? skill.total : Number.isSafeInteger(Number(answer.score)) ? Number(answer.score) : null;
        const roll = Number(answer.roll);
        const entry = { participantId: rider.id, event: 'rider-surprised', ...fall };
        if (score === null) plan.needsInput.push({ field: `mountedRideScore:${rider.id}`, kind: 'integer', min: 0, max: 100, label: `${rider.name || rider.id} : score de Chevaucher` });
        if (!Number.isInteger(roll) || roll < 1 || roll > 100) plan.needsInput.push({ field: `mountedRideRoll:${rider.id}`, kind: 'd100', min: 1, max: 100, label: `${rider.name || rider.id} : d100 de Chevaucher (Surpris, +4 DR)` });
        if (score !== null && Number.isInteger(roll) && roll >= 1 && roll <= 100) {
          entry.test = selectV5Test(previewV5Test({ score, roll, kind: 'test', slModifiers: [{ id: 'mounted:fall', label: 'Surpris à cheval', amount: 4 }] }), 'keep');
          entry.dismount = !entry.test.success;
        } else { plan.ready = false; plan.status = 'requires-input'; }
        mountedAmbush.push(entry);
      }
      return {...plan,baseRevision:expected,participantIds:participants.filter(row=>row.zone==='active').map(row=>row.id),
        ...(captured.startCombat===true?{startCombat:true}:{}),
        ...(scenePreview?{scenePreview}:{}),
        ...(staging?{staging}:{}),
        mountedFall: mountedAmbush,
        request:{diceById:captured.diceById||{},combatReflexesById:captured.combatReflexesById||{},characteristicById:captured.characteristicById||{},tieOrders:captured.tieOrders??staging?.tieOrders??{},opposedRolls:captured.opposedRolls??staging?.opposedRolls??{},tieChoices:captured.tieChoices??staging?.tieChoices??{},surprisedCamp:captured.surprisedCamp??null,mountedRideTests:captured.mountedRideTests||{}}};
    },
    previewCombatParticipantActivation(id) {
      const participant=(currentEnvelope().combat?.participants||[]).find(row=>row.id===id);
      if(!participant)throw new Error('Combattant introuvable');
      if(Number(combat.round)!==0||stateExtensions?.v5?.combatInitiativeInitialized!==true||participant.extensions?.v5?.combatInitiative?.initialized)return null;
      const participants=(currentEnvelope().combat?.participants||[]).map(row=>row.id===id?{...row,zone:'active'}:cloneValue(row));
      const tieOrders={},opposedRolls={},tieChoices={};
      for(const group of stateExtensions?.v5?.combatInitiativeResolution?.tieGroups||[]){
        const key=(group.participantIds||[]).join('|');
        if(group.bracketOrder?.length)tieOrders[key]=[...group.bracketOrder];
        if(group.chosenOrder?.length)tieChoices[key]=[...group.chosenOrder];
        for(const match of group.matches||[]){
          const matchId=`${key}:${match.initiatorId}:${match.opponentId}`;
          opposedRolls[matchId]={initiatorRoll:match.initiatorRoll,opponentRoll:match.opponentRoll,
            ...(match.initiatorOptionId?{initiatorChoice:match.initiatorOptionId}:{}),...(match.opponentOptionId?{opponentChoice:match.opponentOptionId}:{}),
            ...(match.initiatorConditionPenaltyMode?{initiatorConditionPenaltyMode:match.initiatorConditionPenaltyMode}:{}),...(match.opponentConditionPenaltyMode?{opponentConditionPenaltyMode:match.opponentConditionPenaltyMode}:{})};
        }
      }
      return {kind:'activate-pre-round',participantId:id,baseRevision:localRevision,participants,tieOrders,opposedRolls,tieChoices};
    },
    previewCombatParticipantAddition(participantOrProfileId) {
      if(Number(combat.round)!==0||stateExtensions?.v5?.combatInitiativeInitialized!==true)return null;
      const current=currentEnvelope(),profiles=new Map((current.reserve||[]).map(row=>[row.id,row]));
      let participant,profile=null;
      if(typeof participantOrProfileId==='string'){
        profile=profiles.get(participantOrProfileId);if(!profile)throw new Error('Profil introuvable');
        const names=new Set((current.combat?.participants||[]).map(row=>row.name));
        participant=participantFromProfile(profile,{name:uniqueName(profile.name,names),zone:'active'});
      }else{
        participant=cloneValue(participantOrProfileId||{});
        if(!participant.id)throw new TypeError('Le participant doit avoir un identifiant.');
        participant.zone='active';
      }
      if((current.combat?.participants||[]).some(row=>row.id===participant.id))throw new Error('Ce participant est déjà dans le combat.');
      const participants=[...(current.combat?.participants||[]).map(cloneValue),participant],tieOrders={},opposedRolls={},tieChoices={};
      for(const group of stateExtensions?.v5?.combatInitiativeResolution?.tieGroups||[]){
        const key=(group.participantIds||[]).join('|');
        if(group.bracketOrder?.length)tieOrders[key]=[...group.bracketOrder];
        if(group.chosenOrder?.length)tieChoices[key]=[...group.chosenOrder];
        for(const match of group.matches||[]){const matchId=`${key}:${match.initiatorId}:${match.opponentId}`;opposedRolls[matchId]={initiatorRoll:match.initiatorRoll,opponentRoll:match.opponentRoll,...(match.initiatorOptionId?{initiatorChoice:match.initiatorOptionId}:{}),...(match.opponentOptionId?{opponentChoice:match.opponentOptionId}:{}),...(match.initiatorConditionPenaltyMode?{initiatorConditionPenaltyMode:match.initiatorConditionPenaltyMode}:{}),...(match.opponentConditionPenaltyMode?{opponentConditionPenaltyMode:match.opponentConditionPenaltyMode}:{})};}
      }
      return {kind:'add-active-participant-pre-round',participant,profileId:profile?.id||participant.profileId||null,
        participantDiceLines:profile?diceLinesFromProfile(profile,participant.id):[],baseRevision:localRevision,participants,tieOrders,opposedRolls,tieChoices};
    },
    applyCombatInitialization(preview = {}) {
      const captured=cloneValue(preview||{}),expected=captured.baseRevision;
      if(!Number.isSafeInteger(expected)||expected!==localRevision)return {ok:false,status:'stale',requiresPreview:true};
      const verifiedMounted = api.previewCombatInitialization({ ...captured, ...(captured.request || {}), baseRevision: expected });
      if (!verifiedMounted.ready) return { ok: false, status: 'requires-input', needsInput: cloneValue(verifiedMounted.needsInput || []) };
      if(captured.ready!==true)return {ok:false,status:'requires-input',needsInput:cloneValue(captured.needsInput||[])};
      const current=currentEnvelope(),scenePreview=captured.scenePreview||null,staging=captured.staging||null,currentParticipants=scenePreview?.scene?.participants||staging?.scene?.participants||staging?.participants||current.combat?.participants||[],activeIds=currentParticipants.filter(row=>row.zone==='active').map(row=>row.id);
      if(captured.startCombat===true&&!activeIds.length)return {ok:false,status:'requires-input',needsInput:[{field:'activeCombatants',label:'Au moins un combattant actif est requis pour démarrer le combat.'}]};
      if(!scenePreview&&JSON.stringify(activeIds)!==JSON.stringify(captured.participantIds||[]))return {ok:false,status:'stale',requiresPreview:true};
      let plan=prepareCombatInitiative(currentParticipants,captured.request||{});
      if(!plan.ready)return {ok:false,status:'requires-input',needsInput:plan.needsInput};
      const command=api.executeCommand('initialize-combat-initiative',draft=>{
        if(draft.localRevision!==expected)throw Object.assign(new Error('Le combat a changé depuis la préparation.'),{code:'COMBAT_INIT_STALE'});
        let sourceScene=scenePreview?.scene||staging?.scene||null;
        let sourceParticipants=sourceScene?.participants||staging?.participants||draft.combat?.participants||[];
        if(staging?.kind==='add-active-participant-pre-round'){
          if((draft.combat?.participants||[]).some(row=>row.id===staging.participant?.id)
            ||staging.profileId&&!(draft.reserve||[]).some(row=>row.id===staging.profileId))throw Object.assign(new Error('Le participant à ajouter a changé depuis la préparation.'),{code:'COMBAT_INIT_STALE'});
        }
        if(staging?.kind==='launch'||staging?.kind==='restart-scene'){
          if(draft.localRevision!==expected)throw Object.assign(new Error('Le combat a changé depuis la préparation.'),{code:'COMBAT_INIT_STALE'});
          const encounter=(draft.encounters||[]).find(item=>item.id===staging.encounterId);
          if(!encounter)throw Object.assign(new Error('La rencontre a changé depuis la préparation.'),{code:'COMBAT_INIT_STALE'});
          const liveScene=draft.activeScene?.status==='active'?draft.activeScene:null;
          if(staging.kind==='launch'&&liveScene)throw Object.assign(new Error('Une scène est déjà active.'),{code:'COMBAT_INIT_STALE'});
          if(staging.kind==='restart-scene'&&(!liveScene||liveScene.id!==staging.sceneId||liveScene.encounterId!==staging.encounterId))throw Object.assign(new Error('La scène a changé depuis la préparation.'),{code:'COMBAT_INIT_STALE'});
          let index=0;const prefix=staging.kind==='launch'?'launch':'restart';
          const rebuilt=launchEncounter(encounter,{profiles:draft.reserve||[],persistentCharacters:draft.persistentCharacters||[],activeScene:null,now:null,idFactory:()=>`f2a:${prefix}:${encounter.id}:${expected}:${index++}`});
          if(JSON.stringify(rebuilt.participants.map(row=>row.id))!==JSON.stringify((staging.scene?.participants||[]).map(row=>row.id))
            ||rebuilt.id!==staging.scene?.id&&staging.kind==='launch')throw Object.assign(new Error('La composition a changé depuis la préparation.'),{code:'COMBAT_INIT_STALE'});
          sourceScene=staging.kind==='restart-scene'?{...rebuilt,id:staging.sceneId,startedAt:staging.startedAt}:{...rebuilt,status:'active'};
        }
        if(staging?.kind==='restart-free')sourceParticipants=(draft.combat?.participants||[]).map(item=>{
          const reset=withMomentum({...item,hp:item.maxHp??item.hp,states:[],extensions:{...(item.extensions||{}),v5:{...(item.extensions?.v5||{}),combatInitiative:undefined}}},false);
          const extensions={...(reset.extensions||{})},v5={...(extensions.v5||{})};delete v5.grapples;extensions.v5=v5;
          return {...reset,extensions};
        });
        const ids=sourceParticipants.filter(row=>row.zone==='active').map(row=>row.id);
        if(captured.startCombat===true&&!ids.length)throw Object.assign(new Error('Au moins un combattant actif est requis pour démarrer le combat.'),{code:'COMBAT_INIT_INPUT',needsInput:[{field:'activeCombatants',label:'Au moins un combattant actif est requis pour démarrer le combat.'}]});
        if(!scenePreview&&JSON.stringify(ids)!==JSON.stringify(captured.participantIds||[]))throw Object.assign(new Error('Les combattants actifs ont changé depuis la préparation.'),{code:'COMBAT_INIT_STALE'});
        if(scenePreview&&!(draft.encounters||[]).some(item=>item.id===scenePreview.scene.encounterId))throw Object.assign(new Error('La rencontre a changé depuis la préparation.'),{code:'COMBAT_INIT_STALE'});
        plan=prepareCombatInitiative(sourceParticipants,captured.request||{});
        if(!plan.ready)throw Object.assign(new Error('La préparation du combat est incomplète.'),{code:'COMBAT_INIT_INPUT',needsInput:plan.needsInput});
        const planned=new Map(plan.participants.map(row=>[row.id,row]));
        let nextParticipants=sourceParticipants.map(row=>{
          const next=cloneValue(planned.get(row.id)||row),meta=next.extensions?.v5?.combatInitiative;
          if(meta?.initialized&&meta.talentId==='talent-combat-reflexes')delete next.extensions.v5.combatReflexesPreparation;
          return next;
        }),log=[...(draft.log||[])];
        const resolution={version:1,participants:plan.participants.filter(row=>row.zone==='active').map(row=>({participantId:row.id,characteristic:row.extensions?.v5?.combatInitiative?.characteristic,characteristicSource:row.extensions?.v5?.combatInitiative?.characteristicSource,die:row.extensions?.v5?.combatInitiative?.die,bonus:row.extensions?.v5?.combatInitiative?.bonus,score:row.extensions?.v5?.combatInitiative?.score,...(row.extensions?.v5?.combatInitiative?.talentId==='talent-combat-reflexes'?{talentId:'talent-combat-reflexes',dice:[...row.extensions.v5.combatInitiative.dice],choice:row.extensions.v5.combatInitiative.choice,...(row.extensions.v5.combatInitiative.preparationProvenance?{preparationProvenance:cloneValue(row.extensions.v5.combatInitiative.preparationProvenance)}:{})}:{})})),order:[...plan.order],tieGroups:plan.tieGroups.map(group=>{
          const matches=plan.oppositions.filter(match=>match.groupKey===group.key);
          return {participantIds:[...group.participantIds],directChoice:group.participantIds.length>=3,bracketOrder:[...(captured.request?.tieOrders?.[group.key]||[])],matches:matches.map(match=>({id:match.id,initiatorId:match.initiatorId,opponentId:match.opponentId,initiatorRoll:match.initiator.roll,initiatorDR:match.initiator.sl,initiatorOptionId:match.initiator.optionId,initiatorConditionPenaltyMode:match.initiatorConditionPenaltyMode,opponentRoll:match.opponent.roll,opponentDR:match.opponent.sl,opponentOptionId:match.opponent.optionId,opponentConditionPenaltyMode:match.opponentConditionPenaltyMode,winnerId:match.winnerId,netDR:match.netSl,tie:match.tie})),winnerId:matches.at(-1)?.winnerId||null,chosenOrder:[...(captured.request?.tieChoices?.[group.key]||[])]};
        })};
        if(plan.surprisedCamp){
          nextParticipants=nextParticipants.map(row=>{
            if(row.zone!=='active'||row.camp!==plan.surprisedCamp)return row;
            const acquired=acquireV5Conditions(row,[{name:'Surpris',source:{kind:'combat-ambush'}}],{round:sourceScene||staging?0:Number(draft.combat?.round)||0});
            if(acquired.reminders.length)log=[...acquired.reminders.map(text=>({kind:'reminder',actorId:row.id,text})),...log];
            return acquired.participant;
          });
          const dismounted = new Set((captured.mountedFall || []).filter(row => row.event === 'rider-surprised' && row.dismount === true).map(row => row.participantId));
          nextParticipants = nextParticipants.map(row => dismounted.has(row.id) ? clearMountedRelation(row) : row);
          for (const fall of captured.mountedFall || []) if (fall.event === 'rider-surprised') {
            log = [{ id: uid(), ts: Date.now(), kind: 'effect', targetId: fall.participantId,
              text: `${nextParticipants.find(row => row.id === fall.participantId)?.name || fall.participantId} : Test de Chevaucher contre la surprise${fall.test ? ` (${fall.test.roll}, ${fall.test.sl} DR)` : ''}${fall.dismount ? ' — désarçonné' : ' — reste en selle'}`,
              detail: { kind: 'mounted-fall', mountedFall: [cloneValue(fall)] } }, ...log].slice(0, 300);
          }
        }
        const order=plan.order;
        const startsNewScope=staging?.kind==='launch'||staging?.kind==='restart-scene'||staging?.kind==='restart-free'||captured.startCombat===true;
        const combatScopeId=startsNewScope?uid():draft.extensions?.v5?.combatScopeId;
        const extensions={...(draft.extensions||{}),v5:{...(draft.extensions?.v5||{}),...(combatScopeId?{combatScopeId}:{}),combatInitiativeInitialized:true,combatInitiativeResolution:resolution,orderRound:Number(draft.combat?.round)>0?draft.combat.round:null}};
        if(sourceScene){
          const scene=freshScene({...cloneValue(sourceScene),status:'active',round:0,currentActorId:null,participants:nextParticipants,order,extensions:{...(sourceScene.extensions||{}),v5:{...(sourceScene.extensions?.v5||{}),...(combatScopeId?{combatScopeId}:{}),combatInitiativeResolution:resolution}}});
          let nextExtensions=extensions,diceLines=draft.diceLines||[],reminderChoices=draft.reminderChoices||[];
          if(staging?.kind==='restart-scene'){
            const v5=extensions.v5||{},ledger=v5.actionLedger,oldIds=new Set((draft.activeScene?.participants||[]).map(row=>row.id));
            nextExtensions={...extensions,v5:{...freshCombatScopedV5(v5,combatScopeId),combatInitiativeInitialized:true,combatInitiativeResolution:resolution,orderRound:null,...(ledger?{actionLedger:{...ledger,quotaUsage:(ledger.quotaUsage||[]).filter(row=>!String(row.scopeKey||'').includes(':0:pre-combat'))}}:{})}};
            diceLines=diceLines.filter(line=>!oldIds.has(line.participantId)).map(line=>oldIds.has(line.targetId)?{...line,targetId:null}:line);
            reminderChoices=reminderChoices.filter(choice=>!String(choice.id||'').startsWith(`${draft.activeScene?.id}:`));
          }
          return {...draft,extensions:nextExtensions,activeScene:scene,combat:{...draft.combat,round:0,currentActorId:null,participants:nextParticipants,order,orderMode:ORDER_MODES.AUTOMATIC},
            encounters:(draft.encounters||[]).map(item=>item.id===scene.encounterId?{...item,status:'active'}:item),diceLines,reminderChoices,
            log:(staging?.kind==='restart-scene'?[{id:uid(),ts:Date.now(),kind:'management',text:`Combat « ${scene.title} » recommencé : retour au lancement.`},...log]:log).slice(0,300)};
        }
        if(staging?.kind==='restart-free'){
          if(JSON.stringify(ids)!==JSON.stringify(staging.participantIds||[]))throw Object.assign(new Error('Les combattants ont changé depuis la préparation.'),{code:'COMBAT_INIT_STALE'});
          const v5=draft.extensions?.v5||{},ledger=v5.actionLedger;
          return {...draft,extensions:{...(draft.extensions||{}),v5:{...freshCombatScopedV5(v5,combatScopeId),combatInitiativeInitialized:true,combatInitiativeResolution:resolution,orderRound:null,...(ledger?{actionLedger:{...ledger,quotaUsage:(ledger.quotaUsage||[]).filter(row=>!String(row.scopeKey||'').includes(':0:pre-combat'))}}:{})}},combat:{...draft.combat,round:0,currentActorId:null,participants:nextParticipants,order,orderMode:ORDER_MODES.AUTOMATIC},log:[{id:uid(),ts:Date.now(),kind:'management',text:'Combat recommencé : PV remis au maximum.'},...log].slice(0,300)};
        }
        if(staging?.kind==='activate-pre-round'){
          const scene=draft.activeScene?{...draft.activeScene,participants:nextParticipants,order,extensions:{...(draft.activeScene.extensions||{}),v5:{...(draft.activeScene.extensions?.v5||{}),combatInitiativeResolution:resolution}}}:draft.activeScene;
          return {...draft,extensions,activeScene:scene,combat:{...draft.combat,participants:nextParticipants,order,orderMode:ORDER_MODES.AUTOMATIC}};
        }
        if(staging?.kind==='add-active-participant-pre-round'){
          const logEntry={id:uid(),ts:Date.now(),kind:'management',text:`${staging.participant.name} ajouté directement actif avec Initiative avant le Round 1.`};
          const scene=draft.activeScene?{...draft.activeScene,participants:nextParticipants,order,extensions:{...(draft.activeScene.extensions||{}),v5:{...(draft.activeScene.extensions?.v5||{}),combatInitiativeResolution:resolution}}}:draft.activeScene;
          return {...draft,extensions,activeScene:scene,combat:{...draft.combat,participants:nextParticipants,order,orderMode:ORDER_MODES.AUTOMATIC},
            diceLines:[...(draft.diceLines||[]),...(staging.participantDiceLines||[])],log:[logEntry,...(draft.log||[])].slice(0,300)};
        }
        const firstActorId=order[0]||null,round=captured.startCombat===true?1:Number(draft.combat?.round)||0;
        const startedLog=captured.startCombat===true&&firstActorId?[{id:uid(),kind:'management',actorId:firstActorId,actorName:nextParticipants.find(row=>row.id===firstActorId)?.name,text:`Combat démarré. Round 1. Tour: ${nextParticipants.find(row=>row.id===firstActorId)?.name}`},...log]:log;
        const nextV5=captured.startCombat===true?{...extensions.v5,turnIndex:1,combatId:uid()} : extensions.v5;
        return {...draft,extensions:{...extensions,v5:nextV5},combat:{...draft.combat,round,currentActorId:captured.startCombat===true?firstActorId:draft.combat?.currentActorId||null,participants:nextParticipants,order,orderMode:ORDER_MODES.AUTOMATIC},log:startedLog.slice(0,300)};
      });
      const finish=result=>result?.ok===false?{...result,status:'persistence-error'}:{...result,status:'applied',order:[...plan.order]};
      const fail=error=>error?.code==='COMBAT_INIT_STALE'?{ok:false,status:'stale',requiresPreview:true}:error?.code==='COMBAT_INIT_INPUT'?{ok:false,status:'requires-input',needsInput:error.needsInput||[]}:Promise.reject(error);
      return command&&typeof command.then==='function'?command.then(finish).catch(fail):finish(command);
    },
    setOrderMode(mode = ORDER_MODES.AUTOMATIC) {
      if (!canMutate()) return false;
      if (persistence) return api.executeCommand('set-order-mode', draft => {
        const result = computeOrderMode(draft.combat?.participants || [], {
          mode, order: draft.combat?.order || [], autoOrder:draft.extensions?.v5?.combatInitiativeResolution?.order, currentActorId: draft.combat?.currentActorId || null
        });
        return { ...draft, combat: { ...draft.combat, order: result.order, currentActorId: result.currentActorId, orderMode: result.mode } };
      });
      beginCommand('set-order-mode');
      const result = computeOrderMode(Array.from(combat.participants.values()), {
        mode, order: combat.order, autoOrder:stateExtensions?.v5?.combatInitiativeResolution?.order, currentActorId: combat.currentActorId
      });
      orderMode = result.mode;
      combat.order = result.order;
      combat.currentActorId = result.currentActorId;
      markDirty('combat/meta', { round: combat.round, currentActorId: combat.currentActorId, order: combat.order, orderMode });
      save(); emitBus('combat');
      return true;
    },
    moveInOrder(id, beforeId = null) {
      if (!canMutate() || !combat.participants.has(id)) return false;
      if (persistence) return api.executeCommand('move-in-order', draft => ({
        ...draft,
        combat: { ...draft.combat, order: moveInOrder(draft.combat?.order || [], id, beforeId), orderMode: ORDER_MODES.MANUAL }
      }));
      beginCommand('move-in-order');
      orderMode = ORDER_MODES.MANUAL;
      combat.order = moveInOrder(combat.order, id, beforeId);
      markDirty('combat/meta', { round: combat.round, currentActorId: combat.currentActorId, order: combat.order, orderMode });
      save(); emitBus('combat');
      return true;
    },
    insertReinforcement(id) {
      if (!canMutate() || !combat.participants.has(id)) return false;
      if (persistence) return api.executeCommand('insert-reinforcement', draft => ({
        ...draft,
        combat: { ...draft.combat, order: insertReinforcement(draft.combat?.order || [], id, draft.combat?.currentActorId || null), orderMode: ORDER_MODES.MANUAL }
      }));
      beginCommand('insert-reinforcement');
      orderMode = ORDER_MODES.MANUAL;
      combat.order = insertReinforcement(combat.order, id, combat.currentActorId);
      markDirty('combat/meta', { round: combat.round, currentActorId: combat.currentActorId, order: combat.order, orderMode });
      save(); emitBus('combat');
      return true;
    },
    nextTurn() {
      if (!canMutate()) return false;
      const current=currentEnvelope(),actor=current.combat?.participants?.find(row=>row.id===current.combat?.currentActorId),keyActor=actor?.id,seq=current.extensions?.v5?.brokenEscape?.byActorId?.[keyActor];
      const carriesBroken=(actor?.states||[]).some(row=>['brise','broken'].includes(String(row.key||row.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()));
      const sequenceCompletedThisTurn=seq?.turnId===v5StoreActionClock(current).turnId&&seq?.fleeCommitted&&seq?.sprintCommitted;
      if(carriesBroken&&seq?.visibleToAnyEnemy!==false&&!sequenceCompletedThisTurn){
        const clock=v5StoreActionClock(current),ledger=current.extensions?.v5?.actionLedger||{quotaUsage:[]},actionSpent=standardV5ActionSpent(current,keyActor,clock)||(ledger.quotaUsage||[]).some(row=>row.actorId===keyActor&&row.quotaId==='system:turn-action'&&row.scope==='turn'&&row.scopeKey===JSON.stringify([clock.encounterId,clock.turnId])&&row.used>0),fleeThisTurn=seq?.turnId===clock.turnId&&seq?.fleeCommitted;
        const midturn=actionSpent&&!fleeThisTurn;
        const message=midturn?'DIV-BROKEN-MIDTURN-01 : décision MJ explicite requise pour cette occurrence; aucune Action supplémentaire ni report automatique.':'Brisé impose Move (Flee), puis Action (Sprint) tant que le MJ ne confirme pas la sortie de vue.';
        throw Object.assign(new Error(message),{code:midturn?'DIV-BROKEN-MIDTURN-01':'BROKEN_ESCAPE_REQUIRED',userFacing:true});
      }
      let transitionResult = null;
      return api.executeCommand('next-turn', draft => {
        const beforePosition = readCombatPosition(draft);
        const order = effectiveOrder(draft.combat?.participants || [], {
          mode: draft.combat?.orderMode || ORDER_MODES.AUTOMATIC, order: draft.combat?.order || [], autoOrder:draft.extensions?.v5?.combatInitiativeResolution?.order, round: draft.combat?.round || 0
        });
        const result = computeNextTurn({
          participants: draft.combat?.participants || [], order,
          currentActorId: draft.combat?.currentActorId || null, round: draft.combat?.round || 0
        });
        const fumbleEffects=(draft.combat?.participants||[]).flatMap(participant=>participant.extensions?.v5?.combatEffects||[]).filter(effect=>effect.kind==='acts-last-next-round');
        const legacyFumble=!draft.extensions?.v5?.combatInitiativeInitialized&&fumbleEffects.length>0;
        const fumbleReorderDue=fumbleEffects.some(effect=>Number(effect.round)===result.round);
        const fumbleOrderBoundary=fumbleEffects.some(effect=>Number(effect.round)===result.round||Number(effect.round)===draft.combat?.round);
        const preserveFumbleSource=legacyFumble&&fumbleEffects.some(effect=>Number(effect.round)>=Number(draft.combat?.round||0));
        if(legacyFumble&&result.round>(draft.combat?.round||0)&&fumbleOrderBoundary){
          result.order=effectiveOrder(draft.combat?.participants||[],{mode:draft.combat?.orderMode||ORDER_MODES.AUTOMATIC,order:draft.combat?.order||[],autoOrder:draft.extensions?.v5?.combatInitiativeResolution?.order,round:result.round});
          result.currentActorId=result.order[0]||null;
        }
        else if(result.round>(draft.combat?.round||0)&&(draft.extensions?.v5?.combatInitiativeInitialized||fumbleReorderDue)){
          result.order=effectiveOrder(draft.combat?.participants||[],{mode:draft.combat?.orderMode||ORDER_MODES.AUTOMATIC,order:result.order,autoOrder:draft.extensions?.v5?.combatInitiativeResolution?.order,round:result.round});
          result.currentActorId=result.order[0]||null;
        }
        transitionResult = result;
        const realTurn = beforePosition.round > 0 && Boolean(beforePosition.currentActorId) && Boolean(result.currentActorId);
        const nextTurnIndex = realTurn ? beforePosition.turnIndex + 1 : beforePosition.turnIndex;
        let combat = { ...draft.combat, participants: draft.combat?.participants || [], order: preserveFumbleSource?(draft.combat?.order||result.order):result.order,
          currentActorId: result.currentActorId, round: result.round };
        if(realTurn)combat.participants=combat.participants.map(participant=>({...participant,extensions:{...(participant.extensions||{}),v5:{...(participant.extensions?.v5||{}),combatEffects:(participant.extensions?.v5?.combatEffects||[]).filter(effect=>effect.kind!=='acts-last-next-round'||Number(effect.round)>=Number(result.round))}}}));
        if(realTurn)combat=detonateDueV5Bombs(combat,beforePosition.currentActorId,beforePosition.turnIndex);
        if(realTurn&&beforePosition.currentActorId){
          combat.participants=combat.participants.map(participant=>participant.id!==beforePosition.currentActorId?participant:{...participant,
            extensions:{...(participant.extensions||{}),v5:{...(participant.extensions?.v5||{}),combatEffects:(participant.extensions?.v5?.combatEffects||[]).filter(effect=>!['lose-next-action','lose-next-move'].includes(effect.kind)||(Number.isSafeInteger(effect.createdTurnIndex)?effect.createdTurnIndex>=beforePosition.turnIndex:false))}}});
        }
        let extensions = draft.extensions || {};
        let v5 = extensions.v5 || {};
        let activeScene = draft.activeScene;
        let clock = v5.gameClock || createGameClock(draft);
        const fromClock=cloneValue(clock);let clockReceipt=null;
        if (JSON.stringify(clock.combat) !== JSON.stringify(beforePosition))
          throw Object.assign(new Error('La projection de l’horloge est décalée du combat canonique.'), { code: 'V5_CLOCK_POSITION_CONFLICT' });
        let phases = [];
        if (realTurn) {
          const toPosition = { ...beforePosition, round: result.round, turnIndex: nextTurnIndex, currentActorId: result.currentActorId };
          phases = deriveTurnPhasePlan({ from: beforePosition, to: toPosition });
          const clockResult = advanceGameClock(clock, {
            id: `clock-v1:${clock.revision}:store-next-turn-${CLIENT_ID}-${draft.localRevision || 0}-${++operationSequence}`,
            baseRevision: clock.revision, kind: 'combat-transition', sceneId: beforePosition.sceneId,
            from: beforePosition, to: toPosition, phases
          });
          if (!clockResult.ok) throw Object.assign(new Error('La transition legacy ne correspond pas à la révision de l’horloge.'), { code: 'V5_CLOCK_STALE' });
          clock = clockResult.clock;
          clockReceipt=clockResult.receipt;
          phases = clockResult.validatedPhases;
          v5 = { ...v5, turnIndex: nextTurnIndex, gameClock: clock };
          if (activeScene?.status === 'active') activeScene = { ...activeScene,
            extensions: { ...(activeScene.extensions || {}), v5: { ...(activeScene.extensions?.v5 || {}), turnIndex: nextTurnIndex } } };
        } else {
          const positionAfter = readCombatPosition({ ...draft, combat, extensions, activeScene });
          clock = reconcileGameClockPosition(clock, positionAfter).clock;
          v5 = { ...v5, gameClock: clock };
        }
        extensions = { ...extensions, v5 };
        const unshielded = shieldAtTurnStart(combat.participants, result.currentActorId);
        const processed = processCombatTurnSpells(unshielded, result.round, result.currentActorId,
          { actorId: draft.combat?.currentActorId, round: draft.combat?.round });
        combat.participants = processed;
        if (realTurn && phases.length) {
          const expired = expireDivineAtPhases({ ...draft, combat }, phases);
          combat.participants = expired.combat.participants;
        }
        let nextState={ ...draft, activeScene, extensions, combat };
        if(realTurn&&clockReceipt){
          const divine=expireDivineAtClock(nextState,{fromClock,toClock:clock,receipt:clockReceipt});
          if(!divine.ok)throw Object.assign(new Error(divine.needsInput.map(row=>row.message).join(' ')),{code:'V5_TURN_INPUT',needsInput:divine.needsInput});
          nextState=divine.state;
        }
        reconcileCriticalDeathForRound(nextState,result.round);
        transitionResult = { ...result, phases, clock: cloneValue(clock) };
        return nextState;
      });
    },
    consumeTurnSelection() {
      const pending = turnSelectionPending;
      turnSelectionPending = false;
      return pending;
    },
    usesPersistence() { return Boolean(persistence); },

    getCombat() { return combat; },
    getReserve() { return reserve; },
    getDiceLines() { return diceLines; },
    getLog() { return log; },

    addDiceLine(dl) {
      if (!canMutate()) return false;
      if (persistence) {
        const captured = JSON.parse(JSON.stringify(dl));
        return api.executeCommand('add-dice-line', draft => ({ ...draft, diceLines: [...(draft.diceLines || []), new DiceLine(captured)] }));
      }
      beginCommand('add-dice-line');
      const newLine = new DiceLine(dl); diceLines.push(newLine); markDirty(`diceLines/${newLine.id}`, newLine); save(); emitBus('combat');
    },
    updateDiceLine(id, patch, noRender = false) {
      if (!canMutate()) return false;
      const i = diceLines.findIndex(x => x.id === id); if (i < 0) return;
      if (persistence) {
        const capturedPatch = JSON.parse(JSON.stringify(patch || {}));
        return api.executeCommand('update-dice-line', draft => ({ ...draft, diceLines: (draft.diceLines || []).map(item => item.id === id ? { ...item, ...capturedPatch } : item) }));
      }
      beginCommand('update-dice-line'); Object.assign(diceLines[i], patch); markDirty(`diceLines/${id}`, diceLines[i]); save(); if (!noRender) emitBus('combat');
    },
    removeDiceLine(id) {
      if (!canMutate()) return false;
      beginCommand('remove-dice-line');
      if (!diceLines.some(item => item.id === id)) return;
      if (persistence) return api.executeCommand('remove-dice-line', draft => ({ ...draft, diceLines: (draft.diceLines || []).filter(item => item.id !== id) }));
      recordSnapshot('delete-dice-line'); diceLines = diceLines.filter(x => x.id !== id); markDirty(`diceLines/${id}`, null); save(); emitBus('combat');
    },
    duplicateDiceLine(id) {
      const src = diceLines.find(x => x.id === id); if (!src) return;
      this.addDiceLine(new DiceLine({ ...src, id: uid() }));
    },

    importFromReserve(ids) {
      if (!canMutate()) return false;
      const selectedIds = Array.isArray(ids) ? [...ids] : [];
      if (persistence) return api.executeCommand('import-reserve', draft => {
        const profiles = new Map((draft.reserve || []).map(profile => [profile.id, profile]));
        const participants = [...(draft.combat?.participants || [])];
        const lines = [...(draft.diceLines || [])];
        for (const id of selectedIds) {
          const prof = profiles.get(id); if (!prof) continue;
          const participant = participantFromProfile(prof);
          participants.push(participant);
          lines.push(...diceLinesFromProfile(prof, participant.id));
        }
        const order = participants.slice().sort((a, b) => Number(b.initiative) - Number(a.initiative) || String(a.name).localeCompare(String(b.name))).map(item => item.id);
        return {
          ...draft,
          combat: { ...draft.combat, participants, order },
          diceLines: lines,
          log: [{ id: uid(), ts: Date.now(), kind: 'management', text: `Import: ${selectedIds.length} participant(s)` }, ...(draft.log || [])].slice(0, 300)
        };
      });
      beginCommand('import-reserve');
      this.batch(() => {
        selectedIds.forEach(id => {
          const prof = reserve.get(id); if (!prof) return;
          const p = new Participant({
            profileId: prof.id, name: prof.name, kind: prof.kind,
            initiative: prof.initiative, hp: prof.hp, maxHp: prof.maxHp ?? prof.hp,
      ...normalizeFicheFields(prof), extensions: cloneValue(prof.extensions || {}),
            armor: { ...prof.armor }, caracs: { ...prof.caracs }, zone: 'bench'
          });
          this.addParticipant(p);

          if (prof.diceLines && Array.isArray(prof.diceLines)) {
            prof.diceLines.forEach(tpl => {
              this.addDiceLine(new DiceLine({
                participantId: p.id,
                base: tpl.base,
                note: tpl.note,
                damage: tpl.damage || 0,
                damageFormula: tpl.damageFormula ?? null,
                qualities: tpl.qualities || []
              }));
            });
          }
        });
        this.log(`Import: ${selectedIds.length} participant(s)`);
      });
    },
    /**
     * Library « Ajouter au combat »: one participant per profile id (repeat an id
     * to add several copies). Bench participants stay out of the turn order, as
     * after a launch; with an active scene the combat edit is mirrored into it.
     */
    addProfilesToCombat(profileIds, { zone = 'bench' } = {}) {
      const selectedIds = (Array.isArray(profileIds) ? profileIds : [profileIds]).filter(id => reserve.has(id));
      if (!selectedIds.length) throw new Error('Aucun profil à ajouter');
      const targetZone = zone === 'active' ? 'active' : 'bench';
      if(targetZone==='active'&&Number(combat.round)===0&&stateExtensions?.v5?.combatInitiativeInitialized===true)
        throw Object.assign(new Error('Un profil ajouté directement actif avant le Round 1 doit recevoir son jet d’Initiative dans le dialogue de préparation.'),{code:'COMBAT_INIT_REQUIRED',userFacing:true});
      return api.executeCommand('add-profiles-to-combat', draft => {
        const profiles = new Map((draft.reserve || []).map(profile => [profile.id, profile]));
        const participants = [...(draft.combat?.participants || [])];
        const lines = [...(draft.diceLines || [])];
        const usedNames = new Set(participants.map(item => item.name));
        const zoneOf = new Map(participants.map(item => [item.id, item.zone]));
        const active = (draft.combat?.order || []).filter(id => zoneOf.get(id) === 'active');
        const rest = (draft.combat?.order || []).filter(id => zoneOf.get(id) !== 'active');
        const automatic = (draft.combat?.orderMode || orderMode) !== ORDER_MODES.MANUAL;
        const added = [];
        for (const id of selectedIds) {
          const prof = profiles.get(id);
          // Profil supprimé entre le contrôle et l'exécution de la commande en file.
          if (!prof) continue;
          const participant = participantFromProfile(prof, { name: uniqueName(prof.name, usedNames), zone: targetZone });
          usedNames.add(participant.name);
          participants.push(participant);
          lines.push(...diceLinesFromProfile(prof, participant.id));
          if (targetZone === 'active') active.splice(automatic ? initiativeIndex(active, participant.id, participants) : active.length, 0, participant.id);
          added.push(participant.name);
        }
        if (!added.length) throw new Error('Aucun profil à ajouter');
        return {
          ...draft,
          combat: { ...draft.combat, participants, order: [...active, ...rest] },
          diceLines: lines,
          log: [{ id: uid(), ts: Date.now(), kind: 'management', text: `Combat: ajouté ${added.join(', ')} (${targetZone === 'active' ? 'en jeu' : 'en attente'})` }, ...(draft.log || [])].slice(0, 300)
        };
      });
    },
    exportToReserve() {
      if (!canMutate()) return false;
      let warnings = [];
      const commit = api.executeCommand('export-reserve', draft => {
        const participants = draft.combat?.participants || [];
        const byProfile = new Map(participants.filter(participant => participant.profileId).map(participant => [participant.profileId, participant]));
        const missing = new Set();
        const updatedPersistent = new Map();
        const conflicted = new Set();
        const conflicts = new Set();
        const reserve = (draft.reserve || []).map(profile => {
          const participant = byProfile.get(profile.id);
          if (!participant) return profile;
          if (!profile.extensions?.ficheId) return { ...profile, hp: participant.hp, maxHp: participant.maxHp };
          // Current health belongs to each explicitly linked persistent character.
          for (const copy of participants.filter(item => item.profileId === profile.id)) {
            const candidates = (draft.persistentCharacters || []).filter(character => copy.persistentCharacterId
              ? character.id === copy.persistentCharacterId
              : character.profileId === profile.id || character.extensions?.ficheId === profile.extensions.ficheId);
            if (candidates.length !== 1) { missing.add(profile.name); continue; }
            const character = candidates[0];
            if (conflicted.has(character.id)) continue;
            const current = { ...character, hp: copy.hp, maxHp: copy.maxHp, states: cloneValue(copy.states || []) };
            const previous = updatedPersistent.get(character.id);
            if (previous && !sameValue({ hp: previous.hp, maxHp: previous.maxHp, states: previous.states }, { hp: current.hp, maxHp: current.maxHp, states: current.states })) {
              updatedPersistent.delete(character.id); conflicted.add(character.id);
              conflicts.add(`Santé de ${character.name || profile.name} non reportée : plusieurs états de participants liés sont différents. Choisissez l’état à conserver.`);
            } else updatedPersistent.set(character.id, current);
          }
          return { ...profile, hp: profile.maxHp ?? profile.hp };
        });
        const count = reserve.filter(profile => byProfile.has(profile.id)).length;
        warnings = [...conflicts, ...[...missing].map(name => `Santé de ${name} non reportée : aucun personnage persistant lié de façon unique. Maximum de réserve conservé.`)];
        const notice = warnings.length ? ` ; ${warnings.join(' ')}` : '';
        return { ...draft, reserve,
          persistentCharacters: (draft.persistentCharacters || []).map(character => updatedPersistent.get(character.id) || character),
          log: [{ id: uid(), ts: Date.now(), kind: 'management', text: `Export → Réserve: ${count} profil(s) traités${notice}` }, ...(draft.log || [])].slice(0, 300) };
      });
      const withWarnings = result => ({ ...(result || {}), warnings });
      return commit?.then ? commit.then(withWarnings) : withWarnings(commit);
    },

    canUndo() { return historyCanUndo(historyState) || Boolean(lastSnapshot); },
    canRedo() { return historyCanRedo(historyState); },
    getHistory() { return historySnapshot(historyState); },
    captureSnapshot() { recordSnapshot(); },
    undo() {
      if (!canMutate()) return false;
      if (historyCanUndo(historyState)) {
        const applyUndo = () => {
          const transition = historyUndo(historyState);
          if (!transition.command) return false;
          const nextRevision = localRevision + 1;
          const beforeHistory = historyState;
          const beforeRevision = localRevision;
          const state = preserveLocalStateDuringHistory(JSON.parse(JSON.stringify(transition.command.inverse.state)));
          state.localRevision = nextRevision;
          const sharedChanged = hasSharedStateChange(transition.command.result.state, transition.command.inverse.state);
          const protocolReady = Boolean(syncSession && syncSessionReady);
          const operationQueued = protocolReady && sharedChanged;
          const persistState = { ...state, history: transition.history, ...(!protocolReady && syncSession && sharedChanged ? { syncPending: true } : {}) };
          const finish = result => {
            if (result?.ok === false) return false;
            historyState = transition.history;
            localRevision = nextRevision;
            try { applyDataToState(state, { includeLog: true, includeHistory: false }); }
            catch (error) { historyState = beforeHistory; localRevision = beforeRevision; throw error; }
            lastSnapshot = null;
            emitBus('reserve'); emitBus('combat'); emitBus('log');
            if (operationQueued) {
              pendingProtocolState = false;
              syncSession.flush({ localState: currentEnvelope() }).catch(() => reportSyncStatus('error'));
            } else {
              if (!protocolReady && syncSession && sharedChanged) pendingProtocolState = true;
              publishRevisionedStateIfNeeded(sharedChanged);
            }
            return true;
          };
          if (persistence) {
            const durable = operationQueued
              ? syncSession.enqueue({ state: persistState, localState: persistState })
              : queuePersistenceSave({}, null, persistState, { includeOperation: false });
            return Promise.resolve(durable).then(finish);
          }
          historyState = transition.history;
          localRevision = nextRevision;
          applyDataToState(state, { includeLog: true, includeHistory: false });
          save(true);
          emitBus('reserve'); emitBus('combat'); emitBus('log');
          return true;
        };
        if (!persistence) return applyUndo();
        const task = commandQueue.then(applyUndo);
        commandQueue = task.catch(() => {});
        return task;
      }
      if (!lastSnapshot) return false;
      const snap = lastSnapshot;
      lastSnapshot = null;
      applyDataToState(snap);
      if (Array.isArray(snap.log)) {
        log = snap.log;
      }
      save(true);
      emitBus('reserve');
      emitBus('combat');
      emitBus('log');
      this.log('⏪ Action annulée.');
      return true;
    },
    redo() {
      if (!canMutate() || !historyCanRedo(historyState)) return false;
      const applyRedo = () => {
        const transition = historyRedo(historyState);
        if (!transition.command) return false;
        const nextRevision = localRevision + 1;
        const state = preserveLocalStateDuringHistory(JSON.parse(JSON.stringify(transition.command.result.state)));
        state.localRevision = nextRevision;
        const sharedChanged = hasSharedStateChange(transition.command.inverse.state, transition.command.result.state);
        const protocolReady = Boolean(syncSession && syncSessionReady);
        const operationQueued = protocolReady && sharedChanged;
        const persistState = { ...state, history: transition.history, ...(!protocolReady && syncSession && sharedChanged ? { syncPending: true } : {}) };
        const finish = result => {
          if (result?.ok === false) return false;
          historyState = transition.history;
          localRevision = nextRevision;
          applyDataToState(state, { includeLog: true, includeHistory: false });
          emitBus('reserve'); emitBus('combat'); emitBus('log');
          if (operationQueued) {
            pendingProtocolState = false;
            syncSession.flush({ localState: currentEnvelope() }).catch(() => reportSyncStatus('error'));
          } else {
            if (!protocolReady && syncSession && sharedChanged) pendingProtocolState = true;
            publishRevisionedStateIfNeeded(sharedChanged);
          }
          return true;
        };
        if (persistence) {
          const durable = operationQueued
            ? syncSession.enqueue({ state: persistState, localState: persistState })
            : queuePersistenceSave({}, null, persistState, { includeOperation: false });
          return Promise.resolve(durable).then(finish);
        }
        historyState = transition.history;
        localRevision = nextRevision;
        applyDataToState(state, { includeLog: true, includeHistory: false });
        save(true);
        emitBus('reserve'); emitBus('combat'); emitBus('log');
        return true;
      };
      if (!persistence) return applyRedo();
      const task = commandQueue.then(applyRedo);
      commandQueue = task.catch(() => {});
      return task;
    },

    log(entry) {
      if (!canMutate()) return false;
      if (persistence) {
        let persistentItem;
        if (typeof entry === 'string') {
          persistentItem = { id: uid(), ts: Date.now(), time: now(), kind: 'management', text: entry };
        } else if (entry && typeof entry === 'object') {
          const actor = entry.actorId ? (combat.participants.get(entry.actorId) || reserve.get(entry.actorId)) : null;
          const target = entry.targetId ? (combat.participants.get(entry.targetId) || reserve.get(entry.targetId)) : null;
          persistentItem = {
            id: entry.id || uid(), ts: entry.ts || Date.now(), time: entry.time || now(),
            kind: entry.kind || 'management', encounterId: entry.encounterId || activeScene?.encounterId || null, sceneId: entry.sceneId || activeScene?.id || null, actorId: entry.actorId || null, targetId: entry.targetId || null,
            actorName: entry.actorName || actor?.name || null, targetName: entry.targetName || target?.name || null,
            text: entry.text || '', detail: entry.detail || null
          };
        } else return;
        return api.executeCommand('append-log', draft => ({
          ...draft, log: [persistentItem, ...(draft.log || [])].slice(0, 300)
        }), { recordHistory: false });
      }
      let item;
      if (typeof entry === 'string') {
        item = { id: uid(), ts: Date.now(), time: now(), kind: 'management', encounterId: activeScene?.encounterId || null, sceneId: activeScene?.id || null, text: entry };
      } else if (entry && typeof entry === 'object') {
        const actor = entry.actorId ? (combat.participants.get(entry.actorId) || reserve.get(entry.actorId)) : null;
        const target = entry.targetId ? (combat.participants.get(entry.targetId) || reserve.get(entry.targetId)) : null;
        item = {
          id: entry.id || uid(),
          ts: entry.ts || Date.now(),
          time: entry.time || now(),
          kind: entry.kind || 'management',
          encounterId: entry.encounterId || activeScene?.encounterId || null, sceneId: entry.sceneId || activeScene?.id || null,
          actorId: entry.actorId || null,
          targetId: entry.targetId || null,
          actorName: entry.actorName || actor?.name || null,
          targetName: entry.targetName || target?.name || null,
          text: entry.text || '',
          detail: entry.detail || null
        };
      } else {
        return;
      }
      log.unshift(item);
      if (log.length > 300) log.length = 300;
      const persisted = save();
      emitBus('log');
      return persisted;
    },
    clearLog() {
      if (!canMutate()) return false;
      if (persistence) return api.executeCommand('clear-log', draft => ({ ...draft, log: [] }), { recordHistory: false });
      beginCommand('clear-log'); recordSnapshot('clear-log'); log = []; save(); emitBus('log'); return true;
    },
    resetCombat() {
      if (!canMutate()) return false;
      if (persistence) return api.executeCommand('reset-combat', draft => ({
        ...draft,
        extensions:withoutCombatInitiativeResolution(draft.extensions),
        combat: { ...draft.combat, round: 0, currentActorId: null, order: [], participants: [] },
        diceLines: [],
        log: [{ id: uid(), ts: Date.now(), kind: 'management', text: 'Combat terminé.' }, ...(draft.log || [])].slice(0, 300)
      }));
      beginCommand('reset-combat');
      recordSnapshot('end-combat');
      cleanupDiceLinesForParticipants(combat.participants.keys());
      combat = { round: 0, currentActorId: null, order: [], participants: new Map() };
      stateExtensions=withoutCombatInitiativeResolution(stateExtensions);
      markDirty('combat', { meta: { round: 0, currentActorId: null, order: [] }, participants: null });
      save(); this.log('Combat terminé.'); emitBus('combat');
    },

    getLocalRevision() { return localRevision; },
    listEncounters() { return cloneValue(encounters); },
    saveEncounter(input) {
      const model = normalizeEncounter(input);
      return api.executeCommand('save-encounter', draft => ({ ...draft, encounters: [...(draft.encounters || []).filter(item => item.id !== model.id), model] }));
    },
    deleteEncounter(id) {
      return api.executeCommand('delete-encounter', draft => {
        const scenes = [draft.activeScene, ...(draft.suspendedScenes || [])].filter(scene => scene?.encounterId === id);
        const sceneIds = new Set(scenes.map(scene => scene.id));
        const participantIds = new Set(scenes.flatMap(scene => (scene.participants || []).map(item => item.id)));
        const removingActive = draft.activeScene?.encounterId === id;
        const purged = purgeEncounterJournal(draft, encounterJournalScope(draft, id));
        return {
          ...purged,
          encounters: (draft.encounters || []).filter(item => item.id !== id),
          activeScene: removingActive ? null : draft.activeScene,
          suspendedScenes: (draft.suspendedScenes || []).filter(scene => scene.encounterId !== id),
          combat: removingActive ? { ...draft.combat, round: 0, currentActorId: null, order: [], participants: [] } : draft.combat,
          diceLines: (draft.diceLines || []).filter(line => !participantIds.has(line.participantId))
            .map(line => participantIds.has(line.targetId) ? { ...line, targetId: null } : line),
          reminderChoices: (draft.reminderChoices || []).filter(choice => ![...sceneIds].some(sceneId => choice.id?.startsWith(`${sceneId}:`)))
        };
      }, { purgeEncounterId: id });
    },
    duplicateEncounter(id) {
      const source = encounters.find(item => item.id === id);
      if (!source) throw new Error('Rencontre introuvable');
      const model = duplicateEncounter(source);
      return api.executeCommand('duplicate-encounter', draft => ({ ...draft, encounters: [...(draft.encounters || []), model] }));
    },
    setEncounterEntry(id, profileId, options = {}) {
      const source = encounters.find(item => item.id === id);
      if (!source) throw new Error('Rencontre introuvable');
      const next = setEncounterEntry(source, profileId, options);
      return api.executeCommand('edit-encounter-entry', draft => ({ ...draft, encounters: (draft.encounters || []).map(item => item.id === id ? next : item) }));
    },
    /** Référentiel de mots-clés de créature : base figée + ajouts du MJ de la sauvegarde. */
    getKeywordReferential() { return referentialFromExtensions(stateExtensions).referential; },
    /** Ajout d'un mot-clé par le MJ : refusé (avec le terme existant à utiliser) s'il double ou presque un terme connu. Aucun retrait ni renommage. */
    addCreatureKeyword(input) {
      const proposal = proposeNewKeyword(input, referentialFromExtensions(stateExtensions).referential);
      if (!proposal.ok) return { ok: false, reason: proposal.reason, existing: proposal.existing, message: proposal.message };
      const result = api.executeCommand('add-creature-keyword', draft => {
        const v5 = draft.extensions?.v5 || {};
        return { ...draft, extensions: { ...(draft.extensions || {}), v5: { ...v5, keywordReferential: { terms: [...(v5.keywordReferential?.terms || []), proposal.term] } } } };
      });
      return typeof result?.then === 'function' ? result.then(done => ({ ...done, term: proposal.term })) : { ...result, term: proposal.term };
    },
    /** Lien maître-familier (F2) : les deux côtés sont posés par une seule commande annulable ; refus sans révision ni historique. */
    linkFamiliar(masterId, familiarId, input = {}) {
      const master = combat.participants.get(masterId), familiar = combat.participants.get(familiarId);
      const check = validateFamiliarLink(master, familiar, input);
      if (!check.ok) return check;
      const link = buildFamiliarLink(familiar, input, { id: uid(), createdAt: Date.now() });
      const result = api.executeCommand('link-familiar', draft => ({ ...draft, combat: { ...draft.combat, participants: (draft.combat?.participants || []).map(item => {
        if (item.id === masterId) return withV5(item, v5 => ({ ...v5, familiarLinks: [...(v5.familiarLinks || []), link] }));
        if (item.id === familiarId) return withV5(item, v5 => ({ ...v5, familiarOf: familiarBackLink(master, link) }));
        return item;
      }) } }));
      return typeof result?.then === 'function' ? result.then(done => ({ ...done, ok: true, link })) : { ...result, ok: true, link };
    },
    /**
     * Création de familier (B10, décisions du MJ du 22/10) : lien posé des deux côtés, 1 Destin ou 1 Résilience débité du maître
     * (plus un par point supplémentaire cédé, chacun à répartir), familier d'un PJ passé PNJ allié : une seule commande annulable.
     */
    createFamiliar(masterId, familiarId, input = {}) {
      const master = combat.participants.get(masterId), familiar = combat.participants.get(familiarId);
      const plan = planFamiliarCreation(master, familiar, input);
      if (!plan.ok) return plan;
      const creation = { resource: plan.resource, before: plan.before, spent: plan.spent, after: plan.after, pointsToDistribute: plan.pointsToDistribute, balanceEntered: plan.balanceEntered, campBefore: familiar.camp };
      const link = { ...buildFamiliarLink(familiar, input, { id: uid(), createdAt: Date.now() }), creation };
      const result = api.executeCommand('create-familiar', draft => ({ ...draft,
        combat: { ...draft.combat, participants: (draft.combat?.participants || []).map(item => {
          if (item.id === masterId) {
            const next = withV5(item, v5 => ({ ...v5, familiarLinks: [...(v5.familiarLinks || []), link], [plan.resource]: plan.after }));
            return plan.resource === 'fate' ? { ...next, fate: plan.after } : next;
          }
          if (item.id === familiarId) return { ...withV5(item, v5 => ({ ...v5, familiarOf: familiarBackLink(master, link) })), camp: plan.camp };
          return item;
        }) },
        log: [{ id: uid(), kind: 'management', actorId: masterId, targetId: familiarId,
          text: `Création de familier : ${familiarLinkLabel(link, familiar)}, lié à ${master.name} (${plan.spent} ${plan.label}, ${plan.before} → ${plan.after})`,
          detail: { kind: 'create-familiar', linkId: link.id, ...creation } }, ...(draft.log || [])].slice(0, 300) }));
      return typeof result?.then === 'function' ? result.then(done => ({ ...done, ok: true, link })) : { ...result, ok: true, link };
    },
    unlinkFamiliar(masterId, linkId) {
      const master = combat.participants.get(masterId), link = familiarLinksOf(master).find(row => row.id === linkId);
      if (!link) return { ok: false, reason: 'unknown-link', message: 'Lien introuvable.' };
      const result = api.executeCommand('unlink-familiar', draft => ({ ...draft, combat: { ...draft.combat, participants: (draft.combat?.participants || []).map(item => {
        if (item.id === masterId) return withV5(item, v5 => ({ ...v5, familiarLinks: (v5.familiarLinks || []).filter(row => row.id !== linkId) }));
        if (item.id === link.familiarId && item.extensions?.v5?.familiarOf?.linkId === linkId) {
          const freed = withV5(item, v5 => { const { familiarOf, ...rest } = v5; return rest; });
          // Le camp d'avant la création (familier d'un PJ passé PNJ allié) est rendu.
          return link.creation?.campBefore !== undefined ? { ...freed, camp: link.creation.campBefore } : freed;
        }
        return item;
      }) } }));
      return typeof result?.then === 'function' ? result.then(done => ({ ...done, ok: true })) : { ...result, ok: true };
    },
    /** Portée d'un familier animal : booléen posé par le MJ, jamais calculé. */
    setFamiliarRange(masterId, linkId, inRange) {
      const master = combat.participants.get(masterId), link = familiarLinksOf(master).find(row => row.id === linkId);
      if (!link || link.system !== 'animal') return { ok: false, reason: 'unknown-link', message: 'Lien d’animal introuvable.' };
      const result = api.executeCommand('set-familiar-range', draft => ({ ...draft, combat: { ...draft.combat, participants: (draft.combat?.participants || []).map(item => item.id === masterId
        ? withV5(item, v5 => ({ ...v5, familiarLinks: (v5.familiarLinks || []).map(row => row.id === linkId ? { ...row, inRange: inRange === true } : row) })) : item) } }));
      return typeof result?.then === 'function' ? result.then(done => ({ ...done, ok: true })) : { ...result, ok: true };
    },
    /**
     * Mort d'un familier animal : le maître passe un Test de Calme (Difficile, −2 sauf elfe) que le MJ résout à la table ;
     * sur un échec, deux d10 saisis donnent des Blessures directes (ni Bonus d'Endurance ni armure). Rien n'est appliqué sans confirmation. Annulable.
     */
    resolveFamiliarDeath(masterId, familiarId, options = {}) {
      const master = combat.participants.get(masterId), familiar = combat.participants.get(familiarId);
      const plan = planFamiliarDeath(master, familiar);
      if (!plan.applicable) return { ok: false, reason: 'no-animal-link', message: plan.reason };
      let damage = 0;
      if (options.calmFailed === true) {
        const dealt = familiarDeathDamage(options.rolls);
        if (!dealt.ok) return { ok: false, reason: 'rolls', message: dealt.message };
        damage = dealt.damage;
      }
      const result = api.executeCommand('familiar-death', draft => ({ ...draft,
        combat: { ...draft.combat, participants: (draft.combat?.participants || []).map(item => (item.id === masterId && damage ? momentumAfterChange(item, { ...item, hp: Math.max(0, (Number(item.hp) || 0) - damage) }) : item)) },
        log: [{ id: uid(), kind: 'effect', actorId: familiarId, targetId: masterId,
          text: `${familiar.name} · Mort du familier : ${master.name} ${options.calmFailed === true ? `rate le ${plan.calmTest.label}, ${damage} Blessure(s) directe(s)` : `réussit le ${plan.calmTest.label}`}`,
          detail: { kind: 'familiar-death', linkId: plan.linkId, calmModifier: plan.calmTest.modifier, calmFailed: options.calmFailed === true, damage, reminders: plan.reminders } }, ...(draft.log || [])].slice(0, 300) }));
      const done = value => ({ ...value, ok: value?.ok !== false, damage, plan });
      return typeof result?.then === 'function' ? result.then(done) : done(result);
    },
    /** Régénération (début de Round) : le MJ saisit le d10 ; soin et guérison d'un critique en une seule commande annulable. */
    applyRegeneration(participantId, roll, options = {}) {
      const participant = combat.participants.get(participantId);
      if (!hasRegeneration(participant)) return { ok: false, reason: 'no-regeneration', message: 'Ce participant n’a pas le Trait Régénération.' };
      const plan = planRegeneration(participant, { roll, fireWounds: options.fireWounds, fireCriticalIds: options.fireCriticalIds });
      if (!plan.available) return { ok: false, reason: 'refused', message: plan.unresolved.join(' ') };
      const amount = plan.heal?.amount ?? 0;
      let healed = 0;
      const result = api.executeCommand('regeneration', draft => {
        const target = (draft.combat?.participants || []).find(item => item.id === participantId);
        if (!target) throw new TypeError('Participant introuvable');
        const receipt = healV5Wounds(target, amount);
        healed = receipt.hpDelta ?? 0;
        const records = receipt.participant.extensions?.v5?.criticalWounds || [];
        let next = plan.criticalHeal ? withV5(receipt.participant, v5 => ({ ...v5, criticalWounds: records.filter(row => row.id !== plan.criticalHeal.id) })) : receipt.participant;
        // Un 10 régénère le critique et ses États (E0-T-044), comme le soin divin des critiques.
        const healedRecord = plan.criticalHeal ? records.find(row => row.id === plan.criticalHeal.id) : null;
        for (const stateId of new Set(healedRecord?.stateIds || [])) {
          if (!(next.states || []).some(row => row.id === stateId)) continue;
          next = recoverV5Condition(next, stateId, { method: 'divine-removal', amount: Number.MAX_SAFE_INTEGER }).participant;
        }
        return { ...draft,
          combat: { ...draft.combat, participants: draft.combat.participants.map(item => (item.id === participantId ? next : item)) },
          log: [{ id: uid(), kind: 'effect', actorId: participantId, targetId: participantId,
            text: `${target.name} · Régénération (d10 ${roll}) : ${healed} Blessure(s) regagnée(s)${plan.criticalHeal ? ` · Blessure Critique guérie (${plan.criticalHeal.name || plan.criticalHeal.id})` : ''}`,
            detail: { kind: 'regeneration', roll, healed, criticalHeal: plan.criticalHeal, reminders: plan.reminders } }, ...(draft.log || [])].slice(0, 300) };
      });
      const done = value => ({ ...value, ok: value?.ok !== false, healed, criticalHeal: plan.criticalHeal });
      return typeof result?.then === 'function' ? result.then(done) : done(result);
    },
    /**
     * Trait Peur ou Terreur d'une créature, au contact ou à la vue : pose l'effet en attente du Test de Calme (`fear-of-talent` /
     * `terror-of-talent`) sur la cible désignée, ou sur chaque adversaire actif ; alliés, immunisés et rencontre déjà subie exemptés. Annulable.
     */
    applyCreaturePsychology(sourceId, key, options = {}) {
      const source = combat.participants.get(sourceId);
      const label = key === 'fear' ? 'Peur' : 'Terreur';
      if (!['fear', 'terror'].includes(key) || !psychologyTraits(source).some(trait => trait.key === key)) return { ok: false, reason: 'no-trait', message: `Ce participant n’a pas le Trait ${label}.` };
      const envelope = currentEnvelope();
      const encounterId = v5StoreActionClock(envelope).encounterId || 'default-encounter';
      const active = (envelope.combat?.participants || []).filter(item => item.zone === 'active' && item.id !== sourceId);
      const targets = options.targetId ? active.filter(item => item.id === options.targetId) : active.filter(item => item.camp !== source.camp);
      const additions = new Map();
      const blocked = [];
      for (const target of targets) {
        const plan = planPsychology(source, key, { target, encounterId });
        if (!plan.available) blocked.push(...plan.unresolved);
        else if (plan.states.length) additions.set(target.id, plan.states);
      }
      if (!additions.size) return { ok: false, reason: 'no-target', message: [...new Set(blocked)].join(' ') || `${label} : aucune cible à affecter (alliée, immunisée ou rencontre déjà subie).` };
      const names = targets.filter(item => additions.has(item.id)).map(item => item.name || item.id);
      const result = api.executeCommand('creature-psychology', draft => ({ ...draft,
        combat: { ...draft.combat, participants: (draft.combat?.participants || []).map(item => (additions.has(item.id) ? { ...item, states: [...(item.states || []), ...additions.get(item.id)] } : item)) },
        log: [{ id: uid(), kind: 'effect', actorId: sourceId, targetId: options.targetId || null,
          text: `${source.name} · ${label} : Test de Calme demandé à ${names.join(', ')}`,
          detail: { kind: 'creature-psychology', key, targetIds: [...additions.keys()] } }, ...(draft.log || [])].slice(0, 300) }));
      const done = value => ({ ...value, ok: value?.ok !== false, targetIds: [...additions.keys()] });
      return typeof result?.then === 'function' ? result.then(done) : done(result);
    },
    /**
     * Nuée en fin de Round : chaque adversaire engagé (désigné par le MJ, le moteur ne suit pas l'engagement) perd 1 Blessure directe
     * (livre de base, Traits de créature, Swarm). Une seule commande annulable.
     */
    applySwarmEndOfRound(swarmId, engagedIds = []) {
      const swarm = combat.participants.get(swarmId);
      const plan = planSwarm(swarm);
      if (!plan.available) return { ok: false, reason: 'no-swarm', message: 'Ce participant n’a pas le Trait Nuée.' };
      const ids = [...new Set(engagedIds)].filter(id => id !== swarmId && combat.participants.get(id)?.zone === 'active');
      if (!ids.length) return { ok: false, reason: 'no-target', message: 'Nuée : désignez au moins un adversaire engagé.' };
      const amount = plan.endOfRound.amount;
      const result = api.executeCommand('swarm-end-of-round', draft => ({ ...draft,
        combat: { ...draft.combat, participants: (draft.combat?.participants || []).map(item => (ids.includes(item.id) ? momentumAfterChange(item, { ...item, hp: Math.max(0, (Number(item.hp) || 0) - amount) }) : item)) },
        log: [{ id: uid(), kind: 'effect', actorId: swarmId, targetId: null,
          text: `${swarm.name} · Nuée, fin de Round : ${amount} Blessure(s) à ${ids.map(id => combat.participants.get(id).name || id).join(', ')}`,
          detail: { kind: 'swarm-end-of-round', targetIds: ids, amount } }, ...(draft.log || [])].slice(0, 300) }));
      const done = value => ({ ...value, ok: value?.ok !== false, targetIds: ids });
      return typeof result?.then === 'function' ? result.then(done) : done(result);
    },
    /** Venin : une Blessure infligée par le porteur empoisonne la cible (difficulté de récupération imprimée sur le Trait, sinon refus). Annulable. */
    applyCreatureVenom(sourceId, targetId) {
      const source = combat.participants.get(sourceId);
      const target = combat.participants.get(targetId);
      const plan = planStateOnWound(source, 'venom');
      if (plan.unresolved.some(text => /absent du participant/.test(text))) return { ok: false, reason: 'no-trait', message: 'Ce participant n’a pas le Trait Venin.' };
      if (!plan.available) return { ok: false, reason: 'refused', message: plan.unresolved.join(' ') };
      if (!target || target.id === sourceId) return { ok: false, reason: 'no-target', message: 'Venin : désignez la cible blessée.' };
      const difficulty = plan.effects[0].recoveryDifficulty;
      // Un homoncule n'est empoisonné que par un porteur de Venin magique.
      const allowed = previewFamiliarCondition(target, 'Empoisonné', { magical: attacksAreMagical(source) });
      if (!allowed.ok) return { ok: false, reason: 'familiar-condition', message: allowed.receipt.message, receipt: allowed.receipt };
      const receipt = acquireV5Conditions(target, [{ name: 'Empoisonné', level: 1, source: { kind: 'creature-venom', sourceId, difficulty } }], { round: combat.round });
      if (!receipt.acquiredInstances) return { ok: false, reason: 'ignored', message: [...receipt.reminders, 'Venin : aucun effet (immunité ou état déjà présent).'].join(' ') };
      const result = api.executeCommand('creature-venom', draft => ({ ...draft,
        combat: { ...draft.combat, participants: (draft.combat?.participants || []).map(item => (item.id === targetId ? receipt.participant : item)) },
        log: [{ id: uid(), kind: 'effect', actorId: sourceId, targetId,
          text: `${source.name} · Venin (${difficulty}) : ${target.name} est Empoisonné`,
          detail: { kind: 'creature-venom', difficulty } }, ...(draft.log || [])].slice(0, 300) }));
      const done = value => ({ ...value, ok: value?.ok !== false, reminders: receipt.reminders });
      return typeof result?.then === 'function' ? result.then(done) : done(result);
    },
    /** Plusieurs têtes : état d'une tête (Blessure Critique à la tête, guérison), posé par le MJ ; le registre est gardé dans `extensions.v5.heads`. */
    setHeadState(participantId, headId, state) {
      const participant = combat.participants.get(participantId);
      if (!hasManyHeads(participant)) return { ok: false, reason: 'no-heads', message: 'Ce participant n’a pas le Trait Plusieurs têtes.' };
      if (!HEAD_STATES.includes(state)) return { ok: false, reason: 'bad-state', message: 'État de tête inconnu.' };
      const registry = headRegistryOf(participant);
      const next = state === 'healthy' ? restoreHead(registry, headId) : applyHeadCritical(participant, registry, state, headId);
      if (next.unresolved?.length) return { ok: false, reason: 'refused', message: next.unresolved.join(' ') };
      const heads = state === 'healthy' ? next : next.registry;
      const result = api.executeCommand('set-head-state', draft => ({ ...draft, combat: { ...draft.combat, participants: (draft.combat?.participants || []).map(item => (item.id === participantId ? withV5(item, v5 => ({ ...v5, heads })) : item)) } }));
      return typeof result?.then === 'function' ? result.then(done => ({ ...done, ok: true })) : { ...result, ok: true };
    },
    /** Slann : à bord du palanquin ou au sol (−3 aux Tests d'incantation et de Focalisation tant qu'il est au sol). Annulable. */
    setSlannAboard(participantId, aboard) {
      if (!isSlann(combat.participants.get(participantId))) return { ok: false, reason: 'not-slann', message: 'Réservé aux profils de Slann.' };
      const result = api.executeCommand('set-slann-aboard', draft => ({ ...draft, combat: { ...draft.combat, participants: (draft.combat?.participants || []).map(item => (item.id === participantId ? withV5(item, v5 => ({ ...v5, slann: { ...(v5.slann || {}), aboard: aboard !== false } })) : item)) } }));
      return typeof result?.then === 'function' ? result.then(done => ({ ...done, ok: true })) : { ...result, ok: true };
    },
    /** Contemplation slann : le MJ saisit les DR du Test de Perception (+0 réussi ou −0 échec marginal pour un zéro) ; la table donne l'état (Brume de pensée : deux Exténué posés ; Détaché : Stupide en rappel). Annulable. */
    applySlannContemplation(participantId, sl, options = {}) {
      const slann = combat.participants.get(participantId);
      const plan = contemplationOutcome(slann, sl, options);
      if (!plan.available) return { ok: false, reason: 'refused', message: plan.unresolved.join(' ') };
      // Stupide (Détaché) est une psychologie, pas un État du moteur : il reste dans le rappel du journal.
      const adds = plan.conditions.filter(row => row.name === 'Fatigued').map(row => ({ name: 'Exténué', level: row.count || 1, source: { kind: 'slann-contemplation' } }));
      const receipt = adds.length ? acquireV5Conditions(slann, adds, { round: combat.round }) : null;
      const result = api.executeCommand('slann-contemplation', draft => ({ ...draft,
        combat: { ...draft.combat, participants: (draft.combat?.participants || []).map(item => (item.id === participantId && receipt ? receipt.participant : item)) },
        log: [{ id: uid(), kind: 'effect', actorId: participantId, targetId: participantId,
          text: `${slann.name} · Contemplation (DR ${plan.receipt.zero ? (plan.receipt.zero === 'success' ? '+0' : '−0') : sl}) : ${plan.reminders.join(' ')}`,
          detail: { kind: 'slann-contemplation', sl: plan.receipt.sl, zero: plan.receipt.zero, outcome: plan.outcome } }, ...(draft.log || [])].slice(0, 300) }));
      const done = value => ({ ...value, ok: value?.ok !== false, outcome: plan.outcome, reminders: [...plan.reminders, ...(receipt?.reminders || [])] });
      return typeof result?.then === 'function' ? result.then(done) : done(result);
    },
    listPersistentCharacters() { return cloneValue(persistentCharacters); },
    savePersistentCharacter(input) {
      const character = cloneValue(input || {});
      if (!character.id) character.id = uid();
      return api.executeCommand('save-persistent-character', draft => ({ ...draft, persistentCharacters: [...(draft.persistentCharacters || []).filter(item => item.id !== character.id), character] }));
    },
    deletePersistentCharacter(id) {
      return api.executeCommand('delete-persistent-character', draft => ({ ...draft, persistentCharacters: (draft.persistentCharacters || []).filter(item => item.id !== id) }));
    },
    getActiveScene() { return cloneValue(activeScene); },
    listSuspendedScenes() { return cloneValue(suspendedScenes); },
    launchEncounter(idOrEncounter) {
      const encounter = typeof idOrEncounter === 'string' ? encounters.find(item => item.id === idOrEncounter) : idOrEncounter;
      if (!encounter) throw new Error('Rencontre introuvable');
      return api.executeCommand('launch-encounter', draft => ({
        ...draft,
        activeScene: freshScene(launchEncounter(encounter, { profiles: draft.reserve || [], persistentCharacters: draft.persistentCharacters || [], activeScene: draft.activeScene || null })),
        encounters: (draft.encounters || []).map(item => item.id === encounter.id ? { ...item, status: 'active' } : item)
      }));
    },
    // Remet le combat à son départ en une commande annulable : relance de la rencontre d'origine
    // (scène active), ou PV au maximum et états vidés (combat monté sans rencontre).
    restartCombat() {
      const scene = activeScene?.status === 'active' ? activeScene : null;
      const missing = () => new Error('Rencontre d’origine introuvable : supprimez le combat associé, puis relancez une rencontre.');
      const empty = () => new Error('La rencontre n’a plus aucun combattant : complétez sa composition avant de recommencer.');
      const source = scene ? encounters.find(item => item.id === scene.encounterId) : null;
      if (scene && !source) throw missing();
      if (scene && !(source.entries || []).length) throw empty();
      if (!scene && !combat.participants.size) throw new Error('Aucun combat à recommencer');
      // Le Round 0 recommence : son quota d'attaques gratuites (Tour « :0:pre-combat ») est remis à zéro.
      const freshV5 = draft => {
        const v5 = freshCombatScopedV5(draft.extensions?.v5), ledger = v5.actionLedger;
        return { ...v5, ...(ledger ? { actionLedger: { ...ledger, quotaUsage: (ledger.quotaUsage || []).filter(row => !String(row.scopeKey || '').includes(':0:pre-combat')) } } : {}) };
      };
      const withoutGrapples=participant=>{const updated={...participant,states:[]},extensions={...(updated.extensions||{})},v5={...(extensions.v5||{})};delete v5.grapples;extensions.v5=v5;updated.extensions=extensions;return updated;};
      const withoutPaviseDeployments=participant=>{const updated={...participant},extensions={...(updated.extensions||{})},v5={...(extensions.v5||{})};delete v5.paviseDeploymentByItemId;extensions.v5=v5;updated.extensions=extensions;return updated;};
      return api.executeCommand('restart-combat', draft => {
        const current = draft.activeScene?.status === 'active' ? draft.activeScene : null;
        if (!current) {
          return {
            ...draft,
            extensions: { ...(draft.extensions || {}), v5: freshV5(draft) },
            combat: {
              ...draft.combat, round: 0, currentActorId: null,
              participants: (draft.combat?.participants || []).map(item => (withMomentum(withoutPaviseDeployments(withoutGrapples({ ...item, hp: item.maxHp ?? item.hp })), false)))
            },
            log: [{ id: uid(), ts: Date.now(), kind: 'management', text: 'Combat recommencé : PV remis au maximum.' }, ...(draft.log || [])].slice(0, 300)
          };
        }
        const encounter = (draft.encounters || []).find(item => item.id === current.encounterId);
        if (!encounter) throw missing();
        if (!(encounter.entries || []).length) throw empty();
        const launched = freshScene(launchEncounter(encounter, { profiles: draft.reserve || [], persistentCharacters: draft.persistentCharacters || [], activeScene: null }));
        launched.participants=(launched.participants||[]).map(withoutPaviseDeployments);
        const resetV5=freshV5(draft);
        const nextScene = { ...launched, participants:(launched.participants||[]).map(withoutGrapples), id: current.id, startedAt: current.startedAt,
          extensions:{...(launched.extensions||{}),v5:{...(launched.extensions?.v5||{}),combatScopeId:resetV5.combatScopeId}} };
        const oldIds = new Set((current.participants || []).map(item => item?.id).filter(Boolean));
        return {
          ...draft,
          extensions: { ...(draft.extensions || {}), v5: resetV5 },
          activeScene: nextScene,
          // Départ : ordre d'initiative, donc mode automatique même si la piste avait été réordonnée à la main.
          combat: { ...draft.combat, round: 0, currentActorId: null, order: [...nextScene.order], participants: cloneValue(nextScene.participants), orderMode: ORDER_MODES.AUTOMATIC },
          diceLines: (draft.diceLines || []).filter(line => !oldIds.has(line.participantId)).map(line => oldIds.has(line.targetId) ? { ...line, targetId: null } : line),
          reminderChoices: (draft.reminderChoices || []).filter(choice => !String(choice.id || '').startsWith(`${current.id}:`)),
          log: [{ id: uid(), ts: Date.now(), kind: 'management', text: `Combat « ${nextScene.title} » recommencé : retour au lancement.` }, ...(draft.log || [])].slice(0, 300)
        };
      });
    },
    addImprovisedParticipant(participant) {
      if (!activeScene) throw new Error('Aucune scène active');
      return api.executeCommand('add-improvised-participant', draft => ({ ...draft, activeScene: addImprovisedParticipant(draft.activeScene, participant) }));
    },
    suspendActiveScene() {
      if (!activeScene) throw new Error('Aucune scène active');
      return api.executeCommand('suspend-scene', draft => ({
        ...closeV5ReactionOpportunities(draft), activeScene: null,
        extensions: withoutCombatInitiativeResolution(draft.extensions),
        suspendedScenes: [...(draft.suspendedScenes || []), suspendScene({ ...draft.activeScene, participants: (draft.activeScene.participants || []).map(participant => withMomentum(participant, false)) })],
        combat: { ...draft.combat, round: 0, currentActorId: null, order: [], participants: [] },
        encounters: (draft.encounters || []).map(item => item.id === draft.activeScene.encounterId ? { ...item, status: 'suspended' } : item)
      }));
    },
    resumeScene(id) {
      const scene = suspendedScenes.find(item => item.id === id);
      if (!scene) throw new Error('Scène suspendue introuvable');
      return api.executeCommand('resume-scene', draft => {
        const v5={...(draft.extensions?.v5||{})},proof=scene.extensions?.v5?.combatInitiativeResolution;
        if(scene.extensions?.v5?.combatScopeId)v5.combatScopeId=scene.extensions.v5.combatScopeId;
        else delete v5.combatScopeId;
        if(proof){v5.combatInitiativeInitialized=true;v5.combatInitiativeResolution=proof;}
        else {delete v5.combatInitiativeInitialized;delete v5.combatInitiativeResolution;delete v5.orderRound;}
        return {
          ...draft,
          extensions:{...(draft.extensions||{}),v5},
          activeScene: resumeScene(scene, { activeScene: draft.activeScene || null }),
          suspendedScenes: (draft.suspendedScenes || []).filter(item => item.id !== id),
          encounters: (draft.encounters || []).map(item => item.id === scene.encounterId ? { ...item, status: 'active' } : item)
        };
      });
    },
    getReactionOpportunities(actorId) {
      const envelope = currentEnvelope();
      return listV5ReactionOpportunities(envelope, actorId, { clock: v5StoreActionClock(envelope) });
    },
    confirmBrokenEscapeVisibility({actorId,visibleToAnyEnemy}={}) {
      const envelope=currentEnvelope(),clock=v5StoreActionClock(envelope);
      if(typeof visibleToAnyEnemy!=='boolean')return {ready:false,status:'requires-input',needsInput:[{field:'visibleToAnyEnemy',label:'Le MJ doit confirmer la visibilité envers tout ennemi.'}]};
      if(!actorId||actorId!==envelope.combat?.currentActorId)return {ready:false,status:'blocked',error:'L’attestation de visibilité doit viser l’acteur du Tour canonique.'};
      const actor=envelope.combat?.participants?.find(row=>row.id===actorId),broken=(actor?.states||[]).some(row=>['brise','broken'].includes(String(row.key||row.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()));
      if(!broken)return {ready:false,status:'blocked',error:'Le personnage ne porte pas Brisé.'};
      const key=JSON.stringify([clock.encounterId,clock.turnId]),ledger=envelope.extensions?.v5?.actionLedger||{appliedActions:[],quotaUsage:[]};
      const actionUsed=ledger.quotaUsage.some(row=>row.actorId===actorId&&row.quotaId==='system:turn-action'&&row.scope==='turn'&&row.scopeKey===key&&row.used>0)||standardV5ActionSpent(envelope,actorId,clock);
      const seq=envelope.extensions?.v5?.brokenEscape?.byActorId?.[actorId];
      const sameTurn=seq?.turnId===clock.turnId;
      if(actionUsed&&!(sameTurn&&seq?.fleeCommitted))return {ready:false,status:'blocked',code:'DIV-BROKEN-MIDTURN-01',needsInput:[{field:'decision.DIV-BROKEN-MIDTURN-01',label:'Décision MJ explicite requise pour cette occurrence; ce fait de visibilité ne la remplace pas.'}],error:'DIV-BROKEN-MIDTURN-01 : confirmer hors vue ne résout pas une Action déjà dépensée.'};
      let receipt;const saved=api.executeCommand('v5-broken-escape-visibility',draft=>{
        if(draft.localRevision!==envelope.localRevision)throw Object.assign(new Error('La partie a changé; recalculez le fait de visibilité.'),{userFacing:true});
        const root=draft.extensions?.v5||{},state=structuredClone(root.brokenEscape||{byActorId:{},receipts:[]});state.byActorId??={};
        const previous=sameTurn?(state.byActorId[actorId]||{}):{};state.byActorId[actorId]={...previous,actorId,turnId:clock.turnId,visibleToAnyEnemy,factsCommitted:true,fleeCommitted:previous.fleeCommitted===true,sprintCommitted:previous.sprintCommitted===true};
        receipt={id:`visibility:${actorId}:${clock.turnId}:${visibleToAnyEnemy?'visible':'hidden'}`,actorId,action:'visibility-confirmation',turn:clock,visibleToAnyEnemy,source:'explicit-gm',sourceRuleVersion:BROKEN_ESCAPE_RULE_VERSION};
        state.receipts=[...(state.receipts||[]),receipt].slice(-300);draft.extensions??={};draft.extensions.v5={...root,brokenEscape:state};return draft;
      });
      const finish=result=>result?.ok===false?{status:'error',error:result.error}: {status:'applied',receipt,persistence:result};
      return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    previewV5ProjectileExtraction(input = {}) {
      const envelope=currentEnvelope(),participant=envelope.combat?.participants?.find(row=>row.id===input.participantId);
      const projectile=participant?.extensions?.v5?.lodgedProjectiles?.find(row=>row.id===input.projectileId);
      let test=null;
      if(projectile?.removal==='heal-test'){
        const skill=participant.skills?.find(row=>row.id===input.skillId&&/gu[eé]rison|heal/iu.test(row.name||row.nom||''));
        const score=Number(skill?.total??skill?.score??skill?.value),roll=Number(input.roll);
        if(!Number.isFinite(score)||score<0||score>100||!Number.isInteger(roll)||roll<1||roll>100)
          return {ready:false,status:'requires-input',error:'Empaleuse : choisir une compétence Guérison et saisir son d100.'};
        test=previewV5Test({score,roll,kind:'test'}).options[0].result;
      }
      const result=previewV5ProjectileExtraction({projectile,method:input.method,success:test?.success,testSl:test?.sl,surgeryConfirmed:input.surgeryConfirmed});
      if(!result.ready)return {ready:false,status:'requires-input',error:result.unresolved[0]};
      return {ready:true,baseRevision:envelope.localRevision||0,participantId:participant.id,projectileId:projectile.id,before:structuredClone(projectile),after:{...structuredClone(projectile),removed:true,
        removalReceipt:{method:result.method,...(test?{test:{roll:test.roll,score:test.score,success:test.success,sl:test.sl}}:{}),...(input.surgeryConfirmed?{surgeryConfirmed:true}:{})}}};
    },
    applyV5ProjectileExtraction(supplied) {
      const plan=cloneValue(supplied);if(!plan?.ready)return Promise.resolve({status:'blocked',reason:'Recalculer l’extraction avant application.'});
      const saved=api.executeCommand('v5-projectile-extraction',draft=>{
        if((draft.localRevision||0)!==plan.baseRevision)throw Object.assign(new Error('La partie a changé; recalculez l’extraction.'),{userFacing:true});
        const participant=draft.combat?.participants?.find(row=>row.id===plan.participantId),live=participant?.extensions?.v5?.lodgedProjectiles?.find(row=>row.id===plan.projectileId);
        if(!live||JSON.stringify(live)!==JSON.stringify(plan.before))throw Object.assign(new Error('Le projectile fiché a changé; recalculez l’extraction.'),{userFacing:true});
        const updated=structuredClone(participant);updated.extensions.v5.lodgedProjectiles=updated.extensions.v5.lodgedProjectiles.map(row=>row.id===plan.projectileId?structuredClone(plan.after):row);
        draft.combat.participants=draft.combat.participants.map(row=>row.id===participant.id?updated:row);return draft;
      });
      return Promise.resolve(saved).then(result=>result?.ok===false?{status:'error',reason:result.error}:{status:'applied',participantId:plan.participantId,projectileId:plan.projectileId,persistence:result});
    },
    previewV5PaviseDeployment(input = {}) {
      const plan=previewV5PaviseDeploymentFrom(currentEnvelope(),input);
      if(!plan.ready)return plan;
      plan.previewId=uid();issuedPaviseDeploymentPreviews.set(plan.previewId,JSON.stringify(plan));
      while(issuedPaviseDeploymentPreviews.size>100)issuedPaviseDeploymentPreviews.delete(issuedPaviseDeploymentPreviews.keys().next().value);
      return plan;
    },
    applyV5PaviseDeployment(supplied) {
      const plan=cloneValue(supplied);if(!plan?.ready)return Promise.resolve({status:'blocked',reason:plan?.error||'Aperçu de mise en place requis.'});
      if(!plan.previewId||issuedPaviseDeploymentPreviews.get(plan.previewId)!==JSON.stringify(plan))return Promise.resolve({status:'blocked',reason:'Aperçu de mise en place absent ou modifié; recalculez.'});
      const actionId=`pavise-setup:${plan.equipmentId}:${plan.turnId}`;
      const saved=api.executeCommand('v5-pavise-deployment',draft=>{
        if((draft.localRevision||0)!==plan.baseRevision)throw Object.assign(new Error('La partie a changé; recalculez la mise en place.'),{userFacing:true});
        const checked=previewV5PaviseDeploymentFrom(draft,{actorId:plan.actorId,equipmentId:plan.equipmentId,direction:plan.direction});
        if(!checked.ready||checked.step!==plan.step||checked.turnId!==plan.turnId||checked.baseRevision!==plan.baseRevision||JSON.stringify(checked.before)!==JSON.stringify(plan.before))throw Object.assign(new Error(checked.error||'Le plan de mise en place est altéré ou périmé; recalculez.'),{userFacing:true});
        const actor=draft.combat?.participants?.find(row=>row.id===checked.actorId),after=checked.step===1?{status:'setting-up',actionsPaid:1,facing:checked.direction,lastTurnId:checked.turnId,startedAt:Date.now()}
          :{status:'planted',actionsPaid:2,facing:checked.direction,lastTurnId:checked.turnId,plantedAt:Date.now()};
        actor.extensions??={};actor.extensions.v5??={};actor.extensions.v5.paviseDeploymentByItemId={...(actor.extensions.v5.paviseDeploymentByItemId||{}),[plan.equipmentId]:after};
        draft.combat.participants=draft.combat.participants.map(row=>row.id===actor.id?actor:row);
        recordV5ActionUsage(draft,actor.id,actionId);
        draft.log=[{id:uid(),kind:'management',actorId:actor.id,actorName:actor.name,text:`${actor.name||actor.id} : Action ${checked.step}/2 de mise en place du Pavois`,detail:{kind:'v5-pavise-deployment',equipmentId:plan.equipmentId,after} },...(draft.log||[])].slice(0,300);
        return draft;
      });
      return Promise.resolve(saved).then(result=>{issuedPaviseDeploymentPreviews.delete(plan.previewId);return result?.ok===false?{status:'error',reason:result.error}:{status:'applied',step:plan.step,statusText:plan.step===2?'planted':'setting-up'};});
    },
    previewV5WeaponReload(input = {}) {
      const envelope = currentEnvelope(), actor = envelope.combat?.participants?.find(row => row.id === input.actorId);
      const weapon = actor?.equipment?.find(row => row.id === input.equipmentId && row.kind === 'weapon');
      if (!actor || !weapon) return { ready: false, status: 'blocked', error: 'Choisir une arme équipée pour le rechargement.' };
      const current = weapon.extensions?.v5?.reloadState || initialV5ReloadState(weapon).state;
      const variableRepeater=weapon.keywords?.some(row=>(typeof row==='string'?row:row?.id)==='a-repetition'&&String(row?.parameter).toLowerCase()==='variable');
      if(variableRepeater&&!current&&input.operation==='arbitrate'){
        const capacity=Number(input.repeaterRating),reloadSuccesses=Number(weapon.keywords?.find(row=>(typeof row==='string'?row:row?.id)==='recharge')?.parameter);
        if(!Number.isSafeInteger(capacity)||capacity<1)return {ready:false,status:'requires-input',error:'Arbitrage Ratling : capacité entière positive requise.'};
        const adjudicated=createV5ReloadState({repeaterRating:capacity,reloadSuccesses});
        if(!adjudicated.ready)return {ready:false,status:'requires-input',error:'Arbitrage Ratling : capacité entière positive requise.'};
        return {ready:true,actorId:actor.id,equipmentId:weapon.id,operation:'arbitrate',baseRevision:envelope.localRevision||0,before:null,after:adjudicated.state,result:'arbitrated',progress:null};
      }
      if (!current) return { ready: false, status: 'requires-input', error: 'Valeurs À répétition/Recharge non interprétables; arbitrage MJ requis.' };
      let plan;
      if (input.operation === 'begin') plan = beginV5Reload(current, { expectedRevision: input.expectedWeaponRevision ?? current.revision });
      else if (input.operation === 'progress') plan = advanceV5Reload(current, { success: input.success, testSl: input.testSl,
        expectedRevision: input.expectedWeaponRevision ?? current.revision });
      else return { ready: false, status: 'blocked', error: 'Choisir début ou progression du rechargement.' };
      if (!plan.ready || plan.status === 'stale' || plan.status === 'unavailable') return { ready: false, status: plan.status || 'requires-input',
        error: plan.unresolved?.[0] || `Rechargement indisponible : ${plan.reason || plan.status}.` };
      return { ready: true, actorId: actor.id, equipmentId: weapon.id, operation: input.operation,
        baseRevision: envelope.localRevision || 0, before: structuredClone(current), after: structuredClone(plan.state),
        result: plan.status, progress: plan.progress || null };
    },
    applyV5WeaponReload(supplied) {
      const plan = cloneValue(supplied);
      if (!plan?.ready) return Promise.resolve({ status: 'blocked', reason: 'Recalculer le rechargement avant application.' });
      const saved = api.executeCommand('v5-weapon-reload', draft => {
        if ((draft.localRevision || 0) !== plan.baseRevision) throw Object.assign(new Error('La partie a changé; recalculez le rechargement.'), { userFacing: true });
        const actor = draft.combat?.participants?.find(row => row.id === plan.actorId);
        const weapon = actor?.equipment?.find(row => row.id === plan.equipmentId && row.kind === 'weapon');
        const live = weapon?.extensions?.v5?.reloadState || (weapon && initialV5ReloadState(weapon).state);
        if(plan.operation==='arbitrate'&&weapon&&!live){const variable=weapon.keywords?.some(row=>(typeof row==='string'?row:row?.id)==='a-repetition'&&String(row?.parameter).toLowerCase()==='variable');if(!variable||plan.before!==null)throw Object.assign(new Error('Arbitrage de chargeur devenu invalide.'),{userFacing:true});const updated=structuredClone(actor);updated.equipment=updated.equipment.map(row=>row.id===plan.equipmentId?{...row,extensions:{...(row.extensions||{}),v5:{...(row.extensions?.v5||{}),reloadState:structuredClone(plan.after)}}}:row);draft.combat.participants=draft.combat.participants.map(row=>row.id===actor.id?updated:row);return draft;}
        if (!actor || !weapon || JSON.stringify(live) !== JSON.stringify(plan.before)) throw Object.assign(new Error('L’arme ou son état de recharge a changé; recalculez.'), { userFacing: true });
        const updated = structuredClone(actor);
        updated.equipment = updated.equipment.map(row => row.id === plan.equipmentId ? { ...row,
          extensions: { ...(row.extensions || {}), v5: { ...(row.extensions?.v5 || {}), reloadState: structuredClone(plan.after) } } } : row);
        draft.combat.participants = draft.combat.participants.map(row => row.id === actor.id ? updated : row);
        return draft;
      });
      return Promise.resolve(saved).then(result => result?.ok === false ? { status: 'error', reason: result.error }
        : { status: 'applied', equipmentId: plan.equipmentId, state: plan.after, result: plan.result, progress: plan.progress || null, persistence: result });
    },
    previewBrokenEscape(input = {}) {
      const envelope = currentEnvelope(), actor = envelope.combat?.participants?.find(row => row.id === input.actorId && row.zone === 'active');
      const clock = v5StoreActionClock(envelope);
      if (input.actorId !== envelope.combat?.currentActorId) return {ready:false,status:'blocked',error:'La fuite doit être résolue pendant le Tour canonique du personnage.'};
      const key = clock.encounterId && clock.turnId ? JSON.stringify([clock.encounterId,clock.turnId]) : null;
      const quota = (envelope.extensions?.v5?.actionLedger?.quotaUsage || []);
      const used = id => id==='system:turn-action'&&standardV5ActionSpent(envelope,input.actorId,clock) ? 1 : key && quota.find(row => row.actorId === input.actorId && row.quotaId === id && row.scope === 'turn' && row.scopeKey === key)?.used || 0;
      const sequence = envelope.extensions?.v5?.brokenEscape?.byActorId?.[input.actorId] || null;
      if(input.action==='flee'&&(actor?.extensions?.v5?.combatEffects||[]).some(row=>row.kind==='lose-next-move'))return {ready:false,status:'blocked',error:'Maladresse précédente : ce Mouvement est perdu pour ce Tour.'};
      if (input.action === 'flee' && used('system:turn-action') > 0) return {ready:false,status:'blocked',code:'DIV-BROKEN-MIDTURN-01',needsInput:[{field:'decision.DIV-BROKEN-MIDTURN-01',label:'Décision MJ explicite requise pour cette occurrence.'}],error:'DIV-BROKEN-MIDTURN-01 : une Action a déjà été dépensée pendant ce Tour; décision MJ explicite requise pour cette occurrence.'};
      if (input.action === 'flee' && used('system:turn-move') > 0) return {ready:false,status:'blocked',error:'Le quota Move du Tour est déjà dépensé.'};
      if (['sprint','hide'].includes(input.action) && used('system:turn-action') > 0) return {ready:false,status:'blocked',error:'Le quota Action du Tour est déjà dépensé.'};
      const value = previewV5BrokenEscape({state:envelope,actor,actorId:input.actorId,action:input.action,facts:input.facts,turn:clock,roll:input.roll,choice:input.choice,sequence:sequence && sequence.turnId===clock.turnId ? sequence : null});
      if (value.ready) {
        value.baseRevision = envelope.localRevision || 0;
        value.actionId = `broken-escape:${input.actorId}:${clock.turnId}:${input.action}`;
        value.facts = structuredClone(input.facts);
        const proof=JSON.stringify(value);issuedBrokenEscapePreviews.set(value.actionId,proof);
        while(issuedBrokenEscapePreviews.size>100)issuedBrokenEscapePreviews.delete(issuedBrokenEscapePreviews.keys().next().value);
      }
      return value;
    },
    applyBrokenEscape(supplied) {
      const plan = cloneValue(supplied), actorId=plan?.actorId;
      const prior=currentEnvelope().extensions?.v5?.actionLedger?.appliedActions?.find(row=>row.actionId===plan?.actionId);
      if(prior)return Promise.resolve({status:'duplicate',receipt:currentEnvelope().extensions?.v5?.brokenEscape?.receipts?.find(row=>row.id===plan.actionId)||null});
      if (!plan?.ready || !plan.actionId || issuedBrokenEscapePreviews.get(plan.actionId)!==JSON.stringify(plan)) return Promise.reject(new Error('Aperçu de fuite absent ou modifié; recalculez.'));
      let receipt;
      const saved=api.executeCommand('v5-broken-escape',draft=>{
        const clock=v5StoreActionClock(draft),key=clock.encounterId&&clock.turnId?JSON.stringify([clock.encounterId,clock.turnId]):null;
        if(draft.localRevision!==plan.baseRevision||JSON.stringify(clock)!==JSON.stringify(plan.turn))throw Object.assign(new Error('La partie ou le Tour a changé; recalculez la fuite.'),{userFacing:true});
        const actor=draft.combat?.participants?.find(row=>row.id===actorId&&row.zone==='active');if(!actor)throw new Error('Personnage de fuite absent.');
        const root=draft.extensions?.v5||{},ledger=structuredClone(root.actionLedger||{appliedActions:[],quotaUsage:[]}),quotaId=plan.action==='flee'?'system:turn-move':'system:turn-action';
        const old=ledger.quotaUsage.find(row=>row.actorId===actorId&&row.quotaId===quotaId&&row.scope==='turn'&&row.scopeKey===key);
        if(old?.used)throw Object.assign(new Error('Quota de Tour déjà dépensé; recalcul requis.'),{userFacing:true});
        const seqs=structuredClone(root.brokenEscape||{byActorId:{},receipts:[]}),seq=seqs.byActorId?.[actorId]||{};
        if(plan.action==='sprint'&&(!seq.fleeCommitted||seq.turnId!==clock.turnId||seq.visibleToAnyEnemy!==true))throw Object.assign(new Error('Move Flee préalable manquant ou périmé.'),{userFacing:true});
        const engagedIds=plan.facts.engagedEnemyIds||[];
        const validEngaged=engagedIds.length>0&&plan.facts.engagedEscapeConfirmed===true&&plan.facts.freeAttacksResolved===true&&Boolean(plan.engagedEscapeEffects);
        if(plan.action==='flee'&&((engagedIds.length&&!validEngaged)||plan.facts.visibleToAnyEnemy!==true))throw Object.assign(new Error('Faits de fuite modifiés; recalculez.'),{userFacing:true});
        if(plan.action==='flee'&&(ledger.quotaUsage.some(row=>row.actorId===actorId&&row.quotaId==='system:turn-action'&&row.scope==='turn'&&row.scopeKey===key&&row.used)||standardV5ActionSpent(draft,actorId,clock)))throw Object.assign(new Error('DIV-BROKEN-MIDTURN-01 : Action déjà dépensée, décision MJ explicite requise.'),{userFacing:true});
        if(plan.action==='flee'&&validEngaged){
          const fx=plan.engagedEscapeEffects;
          for(const enemyId of fx.engagedEnemyIds||[]){
            const foe=draft.combat?.participants?.find(row=>row.id===enemyId&&row.zone==='active');
            if(!foe)continue;
            foe.extensions??={};foe.extensions.v5??={};
            foe.extensions.v5.hasMomentum=(fx.momentumRetainedEnemyIds||[]).includes(enemyId);
          }
          if(Number(fx.addedBrokenCount)>0){
            actor.states=[...(actor.states||[]),{id:`${plan.actionId}:broken-engaged`,key:'brise',name:'Brisé',level:fx.addedBrokenCount,source:structuredClone(BROKEN_ESCAPE_SOURCE)}];
            actor.extensions??={};actor.extensions.v5??={};actor.extensions.v5.hasMomentum=false;
          }
        }
        if(old)old.used=1;else ledger.quotaUsage.push({actorId,quotaId,scope:'turn',scopeKey:key,used:1});
        ledger.appliedActions??=[];ledger.appliedActions.push({actionId:plan.actionId,actorId,encounterId:clock.encounterId||null});
        const current=plan.action==='flee'?{...plan.sequenceAfter,fleeCommitted:true,sprintCommitted:false,turnId:clock.turnId,startedAtRevision:draft.localRevision+1}:plan.action==='sprint'?{...plan.sequenceAfter,fleeCommitted:true,sprintCommitted:true,turnId:clock.turnId}:seq;
        seqs.byActorId??={};if(plan.action!=='hide')seqs.byActorId[actorId]=current;
        receipt={id:plan.actionId,actorId,action:plan.action,turn:structuredClone(clock),facts:{...structuredClone(plan.facts),...(plan.action==='flee'?{engagementConfirmation:{confirmed:true,enemyCount:(plan.facts.engagedEnemyIds||[]).length}}:{})},...(plan.engagedEscapeEffects?{engagedEscapeEffects:structuredClone(plan.engagedEscapeEffects)}:{}),test:plan.test?structuredClone(plan.test):null,moveDistance:plan.moveDistance,sprintDistance:plan.sprintDistance??null,totalDistance:plan.totalDistance??plan.moveDistance,source:structuredClone(BROKEN_ESCAPE_SOURCE),ruleVersion:BROKEN_ESCAPE_RULE_VERSION};
        seqs.receipts=[...(seqs.receipts||[]),receipt].slice(-300);
        draft.extensions??={};draft.extensions.v5={...root,actionLedger:ledger,brokenEscape:seqs};
        return draft;
      });
      const finish=result=>{if(result?.ok===false)return {status:'error',reason:result.error||'Écriture refusée; état inchangé.'};issuedBrokenEscapePreviews.delete(plan.actionId);return {status:'applied',receipt,persistence:result};};
      return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    previewResolution(input = {}) {
      const snapshot=currentEnvelope();
      input=structuredClone(input);
      if(input.reactionId&&!input.v5?.reactionId)input.v5={...(input.v5||{}),reactionId:input.reactionId};
      const actorForAction=snapshot.combat?.participants?.find(row=>row.id===(input.actorId||input.actor?.id));
      const grappleGate=grappleTurnGateBlock(snapshot,input,actorForAction);if(grappleGate)return {...grappleGate,baseRevision:localRevision,input:structuredClone(input)};
      // A named target that is no longer in the encounter must be refused, not crash the test builder.
      if(input.targetId&&!input.target&&!snapshot.combat?.participants?.some(row=>row.id===input.targetId))return {ready:false,status:'requires-input',code:'TARGET_NOT_FOUND',error:'Cible introuvable : elle a quitté la rencontre.',unresolved:['Cible introuvable : elle a quitté la rencontre.'],baseRevision:localRevision,input:structuredClone(input)};
      if(input.v5?.context?.trip===true){
        const context=input.v5.context,actor=snapshot.combat?.participants?.find(row=>row.id===(input.actorId||input.actor?.id)),target=snapshot.combat?.participants?.find(row=>row.id===(input.targetId||input.target?.id)),clock=v5StoreActionClock(snapshot),primary=(snapshot.extensions?.v5?.standardTurnActions||[]).find(row=>row.actionId===context.tripPrimaryResolutionId&&row.actorId===actor?.id&&row.targetId===target?.id&&row.hit===true&&row.actionType==='attack'&&row.turnId===clock.turnId&&row.encounterId===clock.encounterId),skill=target?.skills?.find(row=>row.id===context.athleticsSkillId&&/athlet/i.test(String(row.name||row.nom||'').normalize('NFD').replace(/[\u0300-\u036f]/g,''))),knownSkill=Number(skill?.total??skill?.value),declaredSkill=Number(context.athleticsScore),force=Number(actor?.caracs?.F),declaredForce=Number(context.forceScore);
        const athleticsScore=Number.isFinite(knownSkill)?knownSkill:context.athleticsScoreConfirmed===true&&Number.isFinite(declaredSkill)?declaredSkill:null,forceScore=Number.isFinite(force)?force:context.forceScoreConfirmed===true&&Number.isFinite(declaredForce)?declaredForce:null;
        const missing=[];if(!actor||!target)missing.push('Choisir l’attaquant et la cible du Croche-pied.');if(!primary)missing.push('Croche-pied : une touche appliquée de cet attaquant sur cette cible pendant ce Tour est requise.');else if(!primary.qualityIds?.includes('croche-pied'))missing.push('Croche-pied : l’attaque appliquée doit provenir d’une arme portant l’atout Croche-pied.');if((snapshot.extensions?.v5?.combatActions?.trippedResolutionIds||[]).includes(context.tripPrimaryResolutionId))missing.push('Croche-pied : cette touche a déjà été utilisée.');if(forceScore===null)missing.push('Croche-pied : Force absente ; confirmer la caractéristique du MJ.');if(athleticsScore===null)missing.push('Croche-pied : Athlétisme absent ; confirmer le score de la cible par le MJ.');
        if(missing.length)return {ready:false,status:'requires-input',error:missing[0],unresolved:missing,baseRevision:localRevision,input};
        input.action={...(input.action||{}),type:'opposition',attr:'F',base:forceScore,label:'Force',extensions:{...(input.action?.extensions||{}),fiche:{...(input.action?.extensions?.fiche||{}),skillId:null}}};
        input.defense={...(input.defense||{}),base:athleticsScore,label:'Athlétisme',v5:{...(input.defense?.v5||{}),kind:'test',context:{...(input.defense?.v5?.context||{}),...(skill?.id?{skillId:skill.id}:{})}}};
        input.v5={...input.v5,kind:'test',context:{...input.v5.context,isAction:false},costs:[...(input.v5.costs||[]).filter(row=>row.id!=='combat:trip:momentum'),{id:'combat:trip:momentum',resource:'momentum',amount:1}]};
      }
      const reactionCandidate=Boolean(input.v5?.reactionId||input.reactionId),ordinaryIntent=!reactionCandidate&&(isV5ActionUse(null,input)||['attack','attaque'].includes(input.action?.type)),freeAttackCandidate=input.v5?.extraAttack===true&&['divine-free-attack','reaction-strike','glorious-demise','frenzy'].includes(input.v5?.context?.freeAttackTalent);
      if(ordinaryIntent&&!freeAttackCandidate){const block=ordinaryActionAfterCombatActionBlock(snapshot,actorForAction?.id);if(block)return {...block,baseRevision:localRevision,input:structuredClone(input)};}
      const combatAction=combatActionState(snapshot).byActorId?.[actorForAction?.id],clockNow=v5StoreActionClock(snapshot),activeCombatAction=combatAction&&combatAction.encounterId===clockNow.encounterId&&(combatAction.kind==='aim'||combatAction.turnId===clockNow.turnId)?combatAction:null;
      if(['attack','attaque'].includes(String(input.action?.type||'').toLocaleLowerCase())&&actorForAction?.id&&clockNow.turnId&&clockNow.encounterId){
        const weaponId=input.action?.extensions?.fiche?.equipmentId||input.action?.extensions?.equipment?.id;
        const salvoPriorShots=(snapshot.extensions?.v5?.standardTurnActions||[]).filter(row=>row.actorId===actorForAction.id&&row.weaponId===weaponId&&row.encounterId===clockNow.encounterId&&row.turnId===clockNow.turnId&&row.kind==='action'&&row.actionType==='attack').length;
        input.v5={...(input.v5||{}),context:{...(input.v5?.context||{}),salvoPriorShotsThisTurn:salvoPriorShots}};
      }
      if(input.v5?.context)delete input.v5.context.aimedTargetId;
      if(activeCombatAction?.kind==='aim'&&input.v5?.kind==='ranged'&&input.targetId===activeCombatAction.targetId&&(activeCombatAction.weaponId?input.action?.extensions?.fiche?.equipmentId===activeCombatAction.weaponId:String(input.action?.name||input.action?.nom||input.action?.note||'').trim().toLowerCase()===String(activeCombatAction.weaponName||'').trim().toLowerCase())){input.v5={...input.v5,context:{...(input.v5.context||{}),aimedTargetId:activeCombatAction.targetId}};}
      const movement=combatActionState(snapshot).movementByActorId?.[actorForAction?.id];if(movement&&movement.turnId===clockNow.turnId&&movement.encounterId===clockNow.encounterId&&input.v5?.kind==='ranged')input.v5={...input.v5,context:{...(input.v5.context||{}),movedBeforeRangedAttack:true}};
      const defenseId=input.targetId||input.defense?.actorId,defensive=combatActionState(snapshot).byActorId?.[defenseId];
      if(defensive?.kind==='defensive'&&defensive.encounterId===clockNow.encounterId){const skillId=input.defense?.extensions?.fiche?.skillId||input.defense?.v5?.context?.skillId;if(skillId===defensive.skillId){input.defense={...input.defense,v5:{...(input.defense.v5||{}),context:{...(input.defense.v5?.context||{}),combatDefensiveActionBonus:2}}};}}
      if(combatReflexesAlreadyInitialized(snapshot,input))return {ready:false,status:'requires-input',error:combatReflexesAlreadyDeterminedMessage,unresolved:[combatReflexesAlreadyDeterminedMessage],baseRevision:localRevision,input:structuredClone(input)};
      let prepared;try{prepared=buildV5StoreActionInput(snapshot,input);}catch(error){if(!(error instanceof TypeError)||!error.message.startsWith('Seconde arme :'))throw error;return {ready:false,status:'requires-input',error:error.message,unresolved:[error.message],baseRevision:localRevision,input};}
      const actorId=prepared.actor?.id||prepared.actorId||input.actorId, escape=snapshot.extensions?.v5?.brokenEscape?.byActorId?.[actorId];
      const escapeActor=snapshot.combat?.participants?.find(row=>row.id===actorId);
      const reaction=hasV5ReactionOpportunity(prepared);
      if(!reaction&&!isExplicitV5NonAction(null,input)&&escapeActor?.states?.some(row=>['brise','broken'].includes(String(row.key||row.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()))){
        const visibility=input.brokenEscapeFacts?.visibleToAnyEnemy;
        const blocked=isV5BrokenEscapeActionBlocked(escapeActor,{visibleToAnyEnemy:visibility,sequence:escape});
        if(blocked)return {ready:false,status:'requires-input',error:blocked==='needs-fact'?'Le MJ doit confirmer la visibilité envers tout ennemi.':'Brisé impose Move (Flee), puis Action (Sprint) tant que le personnage reste visible.',needsInput:blocked==='needs-fact'?[{field:'brokenEscapeFacts.visibleToAnyEnemy',label:'Confirmer la visibilité actuelle envers tout ennemi.'}]:[],baseRevision:localRevision,input:structuredClone(input)};
      }
      const classificationBlock=!reaction?brokenEscapeActionClassificationBlock(escapeActor,null,input):null;
      if(classificationBlock)return {...classificationBlock,baseRevision:localRevision,input:structuredClone(input)};
      prepared.prayerSLContext={sceneId:snapshot.activeScene?.status==='active'?snapshot.activeScene.id:null,round:snapshot.combat?.round};
      const actor=snapshot.combat?.participants?.find(row=>row.id===actorId);
      if(actor){const needs=prayerCapClockNeeds(actor,snapshot,`combat.participants.${actor.id}`);if(needs.length)return {ready:false,status:'requires-input',error:needs[0].message,needsInput:needs,unresolved:needs.map(row=>row.message),baseRevision:localRevision};}
      const defenderSkillId=prepared.defense?.extensions?.fiche?.skillId||prepared.defense?.v5?.context?.skillId
        ||input.defense?.extensions?.fiche?.skillId||input.defense?.v5?.context?.skillId;
      if(defenderSkillId==='skill-50_72_69_e8_72_65-base'){
        const defenderId=prepared.target?.id||prepared.targetId||input.targetId;
        const defender=snapshot.combat?.participants?.find(row=>row.id===defenderId);
        if(defender){const needs=prayerCapClockNeeds(defender,snapshot,`combat.participants.${defender.id}`);if(needs.length)return {ready:false,status:'requires-input',error:needs[0].message,needsInput:needs,unresolved:needs.map(row=>row.message),baseRevision:localRevision};}
      }
      const preview=annotateV5StoreActionPreview(buildResolutionPreview(prepared), prepared);
      if(preview.grapple?.link&&clockNow.turnId)preview.grapple.link.createdTurnId=clockNow.turnId;
      if(!reaction&&ordinaryIntent&&!canonicalFreeAttack(preview,input)){const block=ordinaryActionAfterCombatActionBlock(snapshot,actorForAction?.id);if(block)return {...block,baseRevision:localRevision,input:structuredClone(input)};}
      if(!reaction&&isV5ActionUse(preview,input)){const actionBlock=brokenEscapeActionBlock(snapshot,actorId);if(actionBlock)return {...actionBlock,baseRevision:localRevision,input:structuredClone(input)};}
      if(!reaction&&preview.attack===true){const actionBlock=brokenEscapeActionBlock(snapshot,actorId);if(actionBlock)return {...actionBlock,baseRevision:localRevision,input:structuredClone(input)};}
      return {...preview,ready:(preview.unresolved||[]).length===0,input:{...(preview.input||prepared),brokenEscapeFacts:structuredClone(input.brokenEscapeFacts)}};
    },
    previewV5CombatAction(input={}){
      const snapshot=currentEnvelope(),actorId=input.actorId||snapshot.combat?.currentActorId,actor=snapshot.combat?.participants?.find(row=>row.id===actorId),clock=v5StoreActionClock(snapshot);
      const needsInput=[];if(!['aim','defensive'].includes(input.kind))needsInput.push('Choisir Visée ou Défensive.');
      if(!actor||actor.zone!=='active'||actorId!==snapshot.combat?.currentActorId)needsInput.push('L’Action doit viser le combattant actif du Tour.');
      let aimWeapon=null;let aimWeaponRanged=false;if(input.kind==='aim'&&actor){aimWeapon=actor.equipment?.find(item=>item.id===input.weaponId&&item.kind==='weapon');const label=String(aimWeapon?.category||'')+' '+String(aimWeapon?.name||'');aimWeaponRanged=Boolean(aimWeapon&&((String(aimWeapon.range||'').trim())||aimWeapon.ranged===true||/distance|projectile|arc |arbal[eè]te|fronde|armes?.?à.?feu/i.test(label)));if(!aimWeapon&&!(typeof input.weaponName==='string'&&input.weaponName.trim()&&input.rangedWeaponConfirmed===true))needsInput.push('Choisir une arme à distance équipée ou déclarer explicitement au MJ la nature et le nom de l’arme.');else if(aimWeapon&&!aimWeaponRanged&&input.rangedWeaponConfirmed!==true)needsInput.push('Confirmer explicitement que l’arme choisie est à distance (portée numérique inconnue).');else if(input.rangedWeaponHeldConfirmed!==true)needsInput.push('Confirmer que l’arme à distance choisie est en main.');}
      if(input.kind==='aim'&&!snapshot.combat?.participants?.some(row=>row.id===input.targetId&&row.zone==='active'))needsInput.push('Choisir une cible active pour la Visée.');
      if(input.kind==='defensive'&&(!input.skillId||!actor?.skills?.some(skill=>skill.id===input.skillId)))needsInput.push('Choisir une compétence défensive possédée.');
      const spent=standardV5ActionSpent(snapshot,actorId,clock)||Boolean(combatActionBlock(snapshot,actorId));
      if(spent)needsInput.push('Une Action a déjà été dépensée pendant ce Tour.');
      return {ready:needsInput.length===0,status:needsInput.length?'requires-input':'ready',kind:input.kind,actorId,targetId:input.targetId||null,skillId:input.skillId||null,weaponId:aimWeapon?.id||null,weaponName:aimWeapon?.name||input.weaponName?.trim()||null,rangedWeaponConfirmed:aimWeaponRanged||input.rangedWeaponConfirmed===true,rangedWeaponHeldConfirmed:input.rangedWeaponHeldConfirmed===true,actionId:input.actionId||`combat-action:${actorId}:${clock.turnId}:${input.kind}`,clock,baseRevision:localRevision,needsInput,unresolved:needsInput};
    },
    declareV5CombatMovement(input={}){
      const snapshot=currentEnvelope(),actorId=input.actorId||snapshot.combat?.currentActorId,clock=v5StoreActionClock(snapshot),actor=snapshot.combat?.participants?.find(row=>row.id===actorId);
      if(!actor||actor.zone!=='active'||actorId!==snapshot.combat?.currentActorId)return {status:'blocked',reason:'Le déplacement doit être déclaré pour l’acteur du Tour courant.'};
      const movement=canUseV5Move(actor.extensions?.v5?.combatEffects||[]);if(!movement.ready)return {status:'blocked',reason:movement.reason};
      const saved=api.executeCommand('v5-combat-movement-declared',draft=>{
        if(draft.localRevision!==snapshot.localRevision||v5StoreActionClock(draft).turnId!==clock.turnId)throw Object.assign(new Error('Le Tour a changé; redéclarez le déplacement.'),{userFacing:true});
        const live=draft.combat?.participants?.find(row=>row.id===actorId);const liveMovement=canUseV5Move(live?.extensions?.v5?.combatEffects||[]);if(!liveMovement.ready)throw Object.assign(new Error(liveMovement.reason),{userFacing:true,code:'V5_MOVE_LOST'});
        const root=draft.extensions?.v5||{},state=structuredClone(root.combatActions||{byActorId:{},receipts:[]}),movement={actorId,encounterId:clock.encounterId,turnId:clock.turnId,round:clock.round};
        state.movementByActorId??={};state.movementByActorId[actorId]=movement;
        if(state.byActorId?.[actorId]?.kind==='aim')delete state.byActorId[actorId];
        state.receipts=[...(state.receipts||[]),{id:`movement:${actorId}:${clock.turnId}`,kind:'movement-declared',...movement}].slice(-300);
        draft.extensions??={};draft.extensions.v5={...root,combatActions:state};return draft;
      });
      return saved&&typeof saved.then==='function'?saved.then(result=>result?.ok===false?{status:'error',reason:result.error}:{status:'applied',actorId,clock,persistence:result}):{status:'applied',actorId,clock,persistence:saved};
    },
    applyV5CombatAction(preview){
      const captured=cloneValue(preview),actorId=captured?.actorId,clock=captured?.clock;
      if(!captured?.ready)return Promise.resolve({status:'blocked',reason:'Action spéciale non prête.'});
      let receipt;
      const saved=api.executeCommand('v5-combat-action',draft=>{
        const now=v5StoreActionClock(draft),actor=draft.combat?.participants?.find(row=>row.id===actorId);
        if(draft.localRevision!==captured.baseRevision||now.turnId!==clock.turnId||now.encounterId!==clock.encounterId)throw Object.assign(new Error('Le Tour a changé; recalculez l’Action.'),{userFacing:true});
        if(!actor||draft.combat?.currentActorId!==actorId||standardV5ActionSpent(draft,actorId,now)||combatActionBlock(draft,actorId))throw Object.assign(new Error('Une Action a déjà été dépensée ou le Tour ne correspond plus.'),{userFacing:true});
        const root=draft.extensions?.v5||{},state=structuredClone(root.combatActions||{byActorId:{},receipts:[]});state.byActorId??={};
        state.byActorId[actorId]={actorId,kind:captured.kind,targetId:captured.targetId,skillId:captured.skillId,weaponId:captured.weaponId||null,weaponName:captured.weaponName||null,rangedWeaponConfirmed:captured.rangedWeaponConfirmed===true,rangedWeaponHeldConfirmed:captured.rangedWeaponHeldConfirmed===true,turnId:now.turnId,encounterId:now.encounterId,round:now.round,actionId:captured.actionId};
        receipt={id:captured.actionId,kind:captured.kind,actorId,targetId:captured.targetId,skillId:captured.skillId,weaponId:captured.weaponId||null,weaponName:captured.weaponName||null,rangedWeaponConfirmed:captured.rangedWeaponConfirmed===true,rangedWeaponHeldConfirmed:captured.rangedWeaponHeldConfirmed===true,clock:now};state.receipts=[...(state.receipts||[]),receipt].slice(-300);
        draft.extensions??={};draft.extensions.v5={...root,combatActions:state};recordV5ActionUsage(draft,actorId,captured.actionId);return draft;
      });
      const finish=result=>result?.ok===false?{status:'error',reason:result.error}:{status:'applied',receipt,persistence:result};
      return saved&&typeof saved.then==='function'?saved.then(finish):Promise.resolve(finish(saved));
    },
    applyResolution(supplied) {
      const preview = cloneValue(supplied);
      const actorId=preview.input?.actor?.id||preview.input?.actorId||preview.actorId||preview.input?.source?.id;
      const snapshot=currentEnvelope(),escapeActor=snapshot.combat?.participants?.find(row=>row.id===actorId),escape=snapshot.extensions?.v5?.brokenEscape?.byActorId?.[actorId];
      const grappleGate=grappleTurnGateBlock(snapshot,preview.input||{},escapeActor);if(grappleGate)return Promise.resolve({status:'manual',reason:grappleGate.error,code:grappleGate.code});
      const ordinaryIntent=(isV5ActionUse(preview,preview.input||{})||['attack','attaque'].includes(preview.input?.action?.type))&&!canonicalFreeAttack(preview,preview.input||{});
      if(combatReflexesAlreadyInitialized(snapshot,preview.input||{}))return Promise.resolve({status:'manual',reason:combatReflexesAlreadyDeterminedMessage});
      const guardPrepared=buildV5StoreActionInput(snapshot,preview.input||{}),reaction=hasV5ReactionOpportunity(guardPrepared);
      if(!reaction&&ordinaryIntent){const block=ordinaryActionAfterCombatActionBlock(snapshot,actorId);if(block)return Promise.resolve({status:'manual',reason:block.error,code:block.code});}
      if(!reaction&&!isExplicitV5NonAction(preview,preview.input||{})&&escapeActor?.states?.some(row=>['brise','broken'].includes(String(row.key||row.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()))){
        const blocked=isV5BrokenEscapeActionBlocked(escapeActor,{visibleToAnyEnemy:preview.input?.brokenEscapeFacts?.visibleToAnyEnemy,sequence:escape});
        if(blocked)throw new Error(blocked==='needs-fact'?'Le MJ doit confirmer la visibilité envers tout ennemi.':'Brisé impose Move (Flee), puis Action (Sprint) tant que le personnage reste visible.');
        throwBrokenEscapeActionClassification(brokenEscapeActionClassificationBlock(escapeActor,preview,preview.input||{}));
        if(isV5ActionUse(preview,preview.input||{})){const actionBlock=brokenEscapeActionBlock(snapshot,actorId);if(actionBlock)throw Object.assign(new Error(actionBlock.error),{userFacing:true,code:actionBlock.code});}
      }
      let semanticResult = null;
      const commit = api.executeCommand('apply-resolution', draft => {

        if(combatReflexesAlreadyInitialized(draft,preview.input||{}))throw Object.assign(new Error(combatReflexesAlreadyDeterminedMessage),{code:'RESOLUTION_MANUAL'});

        const commitPrepared=buildV5StoreActionInput(draft,preview.input||{}),commitReaction=hasV5ReactionOpportunity(commitPrepared),commitActor=draft.combat?.participants?.find(row=>row.id===actorId);
        if(!commitReaction&&ordinaryIntent){const block=ordinaryActionAfterCombatActionBlock(draft,actorId);if(block)throw Object.assign(new Error(block.error),{code:'RESOLUTION_MANUAL'});}
        if(!commitReaction)throwBrokenEscapeActionClassification(brokenEscapeActionClassificationBlock(commitActor,preview,preview.input||{}));
        if(!commitReaction&&isV5ActionUse(preview,preview.input||{})){const actionBlock=brokenEscapeActionBlock(draft,actorId);if(actionBlock)throw Object.assign(new Error(actionBlock.error),{userFacing:true,code:actionBlock.code});}
        let result;
        try { result = applyV5StoreAction(preview, draft, state => applyActionResolution(preview, state)); }
        catch (error) { error.code = error.code || 'RESOLUTION_INVALID'; throw error; }
        if (result.status === 'duplicate') {
          const error = new Error('Résultat déjà appliqué');
          error.code = 'RESOLUTION_DUPLICATE';
          throw error;
        }
        if (result.status !== 'applied') {
          const error = new Error(result.reason || 'Résolution périmée');
          error.code = result.status === 'stale' ? 'RESOLUTION_STALE' : 'RESOLUTION_MANUAL';
          throw error;
        }
        const resolvedActorId=preview.input?.actor?.id||preview.input?.actorId;
        result.state.participants = shieldAfterAttack(result.state.participants, preview, draft.combat?.round ?? 0);
        result.resolution = { ...result.resolution, actionCostReceipt: result.actionCostReceipt, talentUsageReceipts: result.talentUsageReceipts };
        semanticResult = result;
        const next=clearV5FortuneAdvantageDeclaration({
          ...v5StoreActionResult(draft, result),
          log: [resolutionLogEntry(preview, result.resolution), ...(draft.log || [])].slice(0, 300)
        },resolvedActorId);
        const exposure = preview.supplementalEquipment?.exposure;
        const exposureTargetId = exposure?.participantId || preview.targetId || preview.input?.target?.id || preview.input?.targetId;
        if (exposure && exposureTargetId) updateCorruptionCopies(next, exposureTargetId, row => {
          const extensions = row.extensions || {}, oldV5 = extensions.v5 || {};
          const id = `${preview.resolutionId}:corruption:${exposure.sourceRuleId}`;
          const pending = oldV5.pendingCorruptionExposures || [];
          if (pending.some(item => item.id === id)) return row;
          row.extensions = { ...extensions, v5: { ...oldV5, pendingCorruptionExposures: [...pending, {
            id, sourceRuleId: exposure.sourceRuleId, source: exposure.source, influence: exposure.influence,
            exposure: 'exposure', difficultyDR: exposure.skillModifier || 0, resolutionId: preview.resolutionId,
            createdAt: Date.now()
          }].slice(-100) } };
          return row;
        });
        if(isV5ActionUse(preview,preview.input||{})&&!commitReaction){recordV5ActionUsage(next,resolvedActorId,preview.resolutionId);const v5=next.extensions?.v5||{},rows=v5.standardTurnActions||[],weaponId=preview.input?.action?.extensions?.fiche?.equipmentId,qualityIds=(preview.input?.action?.qualities||[]).map(row=>typeof row==='string'?row:row?.id).filter(Boolean);next.extensions.v5={...v5,standardTurnActions:rows.map(row=>row.actionId===preview.resolutionId?{...row,targetId:preview.targetId||preview.input?.target?.id||preview.input?.targetId||null,weaponId:weaponId||null,qualityIds:[...new Set(qualityIds)],hit:preview.hit===true,actionType:preview.actionType}:row)};}
        const combatRoot=next.extensions?.v5||{},combatState=structuredClone(combatRoot.combatActions||{byActorId:{},receipts:[]}),owned=combatState.byActorId?.[resolvedActorId];
        if(preview.input?.v5?.context?.trip===true){const primaryId=preview.input.v5.context.tripPrimaryResolutionId;if((combatState.trippedResolutionIds||[]).includes(primaryId))throw Object.assign(new Error('Cette touche a déjà servi pour un Croche-pied.'),{userFacing:true});combatState.trippedResolutionIds=[...(combatState.trippedResolutionIds||[]),primaryId].slice(-500);}
        if(owned?.kind==='aim'&&(preview.attack===true||preview.input?.v5?.context?.isAction===true||preview.input?.v5?.context?.movedBeforeRangedAttack===true))delete combatState.byActorId[resolvedActorId];
        if(combatState.byActorId?.[actorId]?.kind==='aim'&&preview.input?.v5?.kind==='ranged'&&preview.input?.targetId===combatState.byActorId[actorId].targetId&&preview.attack===true)delete combatState.byActorId[actorId];
        const defendedActorId=preview.targetId||preview.input?.target?.id||preview.input?.targetId;
        if(preview.defenderTest&&combatState.byActorId?.[defendedActorId]?.kind==='aim')delete combatState.byActorId[defendedActorId];
        next.extensions??={};next.extensions.v5={...combatRoot,combatActions:combatState};
        if(!reaction&&!isExplicitV5NonAction(preview,preview.input||{})&&escapeActor?.states?.some(row=>['brise','broken'].includes(String(row.key||row.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())))recordV5EscapeVisibility(next,actorId,preview.input?.brokenEscapeFacts?.visibleToAnyEnemy,preview.resolutionId);
        return next;
      });
      return Promise.resolve(commit).then(persisted => {
        if (persisted?.ok === false) return { status: 'error', reason: 'Résolution non sauvegardée' };
        return { ...semanticResult, status: 'applied', persistence: persisted };
      }).catch(error => {
        if (error?.code === 'RESOLUTION_DUPLICATE') return { status: 'duplicate', resolution: preview };
        if (error?.code === 'RESOLUTION_STALE') return { status: 'stale', requiresPreview: true };
        if (error?.code === 'RESOLUTION_MANUAL') return { status: 'manual', reason: error.message };
        if (error?.code === 'RESOLUTION_INVALID') return { status: 'error', reason: error.message };
        throw error;
      });
    },
    simulateAction(input = {}) {
      const envelope=currentEnvelope(),sourceState=v5StoreActionState(envelope);
      if(combatReflexesAlreadyInitialized(envelope,input))return {ready:false,status:'requires-input',error:combatReflexesAlreadyDeterminedMessage,sourceState};
      const prepared=buildV5StoreActionInput(envelope,input);
      const owner=prepared.actor?.id||prepared.actorId||input.actorId,person=envelope.combat?.participants?.find(row=>row.id===owner),sequence=envelope.extensions?.v5?.brokenEscape?.byActorId?.[owner];
      const reaction=hasV5ReactionOpportunity(prepared),freeTest=isExplicitV5NonAction(null,input);
      if(isBrokenEscapeActor(person)&&!reaction&&!freeTest){const blocked=isV5BrokenEscapeActionBlocked(person,{visibleToAnyEnemy:input.brokenEscapeFacts?.visibleToAnyEnemy,sequence});if(blocked)return {ready:false,status:'requires-input',error:blocked==='needs-fact'?'Le MJ doit confirmer la visibilité envers tout ennemi.':'Brisé impose Move (Flee), puis Action (Sprint) tant que le personnage reste visible.',sourceState};}
      const classificationBlock=!reaction?brokenEscapeActionClassificationBlock(person,null,input):null;
      if(classificationBlock)return {...classificationBlock,sourceState};
      const simulation = simulateAction(prepared.v5State, prepared);
      if (simulation.preview) simulation.preview = annotateV5StoreActionPreview(simulation.preview, prepared);
      simulation.sourceState = sourceState;
      if(isBrokenEscapeActor(person)&&!reaction&&isV5ActionUse(simulation.preview,input)){const actionBlock=brokenEscapeActionBlock(envelope,owner);if(actionBlock)return {...actionBlock,mode:'simulation',sourceState,preview:simulation.preview};}
      return simulation;
    },
    applySimulation(supplied) {
      const simulation=cloneValue(supplied),input=simulation.preview?.input||{},actorId=input.actor?.id||input.actorId,env=currentEnvelope(),actor=env.combat?.participants?.find(row=>row.id===actorId),sequence=env.extensions?.v5?.brokenEscape?.byActorId?.[actorId];
      if(combatReflexesAlreadyInitialized(env,input))throw Object.assign(new Error(combatReflexesAlreadyDeterminedMessage),{userFacing:true,code:'COMBAT_REFLEXES_ALREADY_DETERMINED'});
      const prepared=buildV5StoreActionInput(env,input),reaction=hasV5ReactionOpportunity(prepared),freeTest=isExplicitV5NonAction(simulation.preview,input);
      if(isBrokenEscapeActor(actor)&&!reaction&&!freeTest){const blocked=isV5BrokenEscapeActionBlocked(actor,{visibleToAnyEnemy:input.brokenEscapeFacts?.visibleToAnyEnemy,sequence});if(blocked)throw new Error(blocked==='needs-fact'?'Le MJ doit confirmer la visibilité envers tout ennemi.':'Brisé impose Move (Flee), puis Action (Sprint) tant que le personnage reste visible.');}
      if(!reaction)throwBrokenEscapeActionClassification(brokenEscapeActionClassificationBlock(actor,simulation.preview,input));
      if(isBrokenEscapeActor(actor)&&!reaction&&isV5ActionUse(simulation.preview,input)){const actionBlock=brokenEscapeActionBlock(env,actorId);if(actionBlock)throw Object.assign(new Error(actionBlock.error),{userFacing:true,code:actionBlock.code});}
      let semanticResult = null;
      // applyActionSimulation has already executed the pure resolution. Passing
      // result.resolution back through applyResolution would apply it twice and
      // immediately report a duplicate. Commit the returned state once through
      // the Store command boundary so it remains undoable and revisioned.
      const commit = api.executeCommand('apply-simulation', draft => {
        const commitPrepared=buildV5StoreActionInput(draft,input),commitReaction=hasV5ReactionOpportunity(commitPrepared),commitActor=draft.combat?.participants?.find(row=>row.id===actorId);
        if(!commitReaction)throwBrokenEscapeActionClassification(brokenEscapeActionClassificationBlock(commitActor,simulation.preview,input));
        if(isBrokenEscapeActor(commitActor)&&!commitReaction&&isV5ActionUse(simulation.preview,input)){const actionBlock=brokenEscapeActionBlock(draft,actorId);if(actionBlock)throw Object.assign(new Error(actionBlock.error),{userFacing:true,code:actionBlock.code});}
        const result = applyV5StoreAction(simulation.preview, draft, state => applyActionSimulation(simulation, state));
        if (result.status === 'duplicate') {
          const error = new Error('Simulation déjà appliquée');
          error.code = 'SIMULATION_DUPLICATE';
          throw error;
        }
        if (result.status !== 'applied') {
          const error = new Error(result.reason || 'Simulation périmée');
          error.code = result.status === 'stale' ? 'SIMULATION_STALE' : 'SIMULATION_INVALID';
          throw error;
        }
        result.state.participants = shieldAfterAttack(result.state.participants, simulation.preview, draft.combat?.round ?? 0);
        result.resolution = { ...result.resolution, actionCostReceipt: result.actionCostReceipt, talentUsageReceipts: result.talentUsageReceipts };
        semanticResult = result;
        const next=clearV5FortuneAdvantageDeclaration({
          ...v5StoreActionResult(draft, result),
          log: [resolutionLogEntry(simulation.preview, result.resolution), ...(draft.log || [])].slice(0, 300)
        },actorId);
        if(isV5ActionUse(simulation.preview,input)&&!commitReaction)recordV5ActionUsage(next,actorId,simulation.preview.resolutionId);
        if(isBrokenEscapeActor(commitActor))recordV5EscapeVisibility(next,actorId,input.brokenEscapeFacts?.visibleToAnyEnemy,simulation.preview.resolutionId);
        return next;
      });
      return Promise.resolve(commit).then(persisted => {
        if (persisted?.ok === false) return { status: 'error', reason: 'Simulation non sauvegardée' };
        return { ...semanticResult, status: 'applied', persistence: persisted };
      }).catch(error => {
        if (error?.code === 'SIMULATION_DUPLICATE') return { status: 'duplicate', simulation };
        if (error?.code === 'SIMULATION_STALE') return { status: 'stale', requiresPreview: true };
        if (error?.code === 'SIMULATION_INVALID') return { status: 'error', reason: error.message };
        throw error;
      });
    },    getSimulationState() {
      return v5StoreActionState(currentEnvelope());
    },
    discardSimulation(simulation) { return discardSimulation(simulation); },
    previewChannelling(input = {}) {
      const actorId = input.actorId || input.actor?.id || combat.currentActorId;
      const blocked=combatActionBlock(currentEnvelope(),actorId);if(blocked)return {...blocked,allowed:false,unresolved:[blocked.error]};
      const participant = (combat.participants.get(actorId)) || Array.from(combat.participants.values())[0];
      return {...previewChannelling(participant, {...input,assistant:combat.participants.get(input.assistantId),turnKey:String(combat.round || 1)+':'+String(stateExtensions?.v5?.turnIndex || 1)}),input:structuredClone(input),baseRevision:localRevision};
    },
    applyChannelling(preview, options = {}) {
      const actorId=options.actorId||preview.input?.actorId||combat.currentActorId;
      return applyChannelling(combatMagicActionStore(api,actorId), preview, {...options,actorId,turnKey:String(combat.round || 1)+':'+String(stateExtensions?.v5?.turnIndex || 1)});
    },
    previewCasting(spell, input = {}) {
      const actorId = input.actorId || input.actor?.id || combat.currentActorId;
      const blocked=combatActionBlock(currentEnvelope(),actorId);if(blocked)return {...blocked,allowed:false,unresolved:[blocked.error]};
      const participant = (combat.participants.get(actorId)) || Array.from(combat.participants.values())[0];
      return {...previewCasting(participant, spell, {...input,assistant:combat.participants.get(input.assistantId),turnKey:String(combat.round || 1)+':'+String(stateExtensions?.v5?.turnIndex || 1)}),input:structuredClone(input),baseRevision:localRevision};
    },
    applyCasting(preview, options = {}) {
      const actorId=options.actorId||preview.input?.actorId||combat.currentActorId;
      return applyCasting(combatMagicActionStore(api,actorId), preview, {...options,actorId});
    },
    previewMiscast(input = {}) {
      const actorId = input.actorId || input.actor?.id || combat.currentActorId;
      const participant = (combat.participants.get(actorId)) || Array.from(combat.participants.values())[0];
      const bfm = input.bfm !== undefined ? input.bfm : Math.floor((Number(casterCaracs(participant).FM) || 0) / 10);
      return previewMiscast({ ...input, bfm, participant });
    },
    applyMiscast(preview, options = {}) {
      return applyMiscast(api, preview, options);
    },
    previewBurnout(input = {}) {
      const actorId = input.actorId || input.actor?.id || combat.currentActorId;
      const participant = (combat.participants.get(actorId)) || Array.from(combat.participants.values())[0];
      return previewBurnout({ participant, ...input });
    },
    applyBurnout(preview, options = {}) {
      return applyBurnout(api, preview, options);
    },
    previewBurnoutRecovery(input = {}) {
      const actorId = input.actorId || input.actor?.id || combat.currentActorId;
      const participant = (combat.participants.get(actorId)) || Array.from(combat.participants.values())[0];
      return { ...previewBurnoutRecovery(participant && projectV5Resources(currentEnvelope(), [participant])[0], { ...input, envelope: currentEnvelope() }), baseRevision: localRevision };
    },
    applyBurnoutRecovery(preview, options = {}) {
      const captured = cloneValue(preview), context = cloneValue(options), expected = context.baseRevision ?? captured?.baseRevision ?? localRevision;
      if (captured?.possible === false) throw Object.assign(new Error(captured.reason || 'Récupération d’épuisement impossible.'), { userFacing: true });
      return applyBurnoutRecovery({ ...api, executeCommand: (type, mutator) => magicCommand(type, mutator, { baseRevision: expected }) }, captured, context);
    },
    rerollCorruptionWithCadai(input={}){
      input = cloneValue(input);
      return magicCommand('v5-cadai-corruption',draft=>{
        const participants=draft.combat?.participants || [],i=participants.findIndex(p=>p.id===input.actorId);if(i<0)throw new Error('Acteur introuvable.');
        // HEPG p. 84 : la Corruption doit découler d'une exécution réelle de Haute Magie de cet acteur ; un jet de Corruption ne se relance qu'une fois.
        const executions=draft.extensions?.v5?.highMagicExecutions || [],e=executions.findIndex(row=>row.id===input.castExecutionId && row.actorId===input.actorId);
        if(e<0)throw new Error('Relance de Corruption : exécution de Haute Magie de ce lanceur introuvable.');
        const corruptionId=String(input.corruptionId || 'corruption');
        const actor=participants[i],spell=getSpellContract(executions[e].spellId);
        const reroll=previewCadaiCorruptionReroll(actor,{spell,castExecutionId:input.castExecutionId,accessible:input.accessible,firstRoll:input.firstRoll,reroll:input.reroll,slModifier:Number(input.slModifier || 0),alreadyRerolled:executions[e].rerolledCorruption.includes(corruptionId)});
        if(!reroll.ready)throw Object.assign(new Error(reroll.error),{userFacing:true});
        const paid=consumeCadaiRune(actor,{purpose:'corruption'});if(!paid.success)throw new Error(paid.reason);
        participants[i]=paid.participant;participants[i].extensions.v5.lastCadaiCorruption={firstRoll:reroll.firstRoll,reroll:reroll.reroll,test:reroll.test,slModifier:reroll.slModifier,castExecutionId:input.castExecutionId,corruptionId,remaining:paid.remaining};
        draft.extensions.v5.highMagicExecutions=executions.map((row,index)=>index===e?{...row,rerolledCorruption:[...row.rerolledCorruption,corruptionId]}:row);
        draft.log=[{id:uid(),kind:'magic',ts:Date.now(),text:'Rune des Cadai : Test de Corruption relancé '+reroll.firstRoll+' → '+reroll.reroll+' ; '+reroll.test.sl+' DR, '+(reroll.test.success?'réussite':'échec')+'. Conséquences d’exposition à reporter sur la fiche.'},...(draft.log || [])];return draft;
      }, input);
    },
    activateMindOverBody(actorId, options = {}){
      return magicCommand('v5-mind-over-body-fortune',draft=>{
        const participants=draft.combat?.participants || [],actor=participants.find(p=>p.id===actorId);
        const effect=activeMagicTalent(actor,'mind-over-body');
        if(!effect || effect.magicTalentRank<3 || magicTalentRank(actor,'mind-over-body')<3)throw new Error('Contemplation active et rang 3 requis.');
        if(effect.ignoreCriticalPenalties)throw new Error('Blessures critiques déjà ignorées pour cette contemplation.');
        const fortune=getV5Fortune(draft,actor).balance;if(fortune==null || fortune<1)throw new Error('Un Point de Chance initialisé est requis.');
        const before=structuredClone(draft);actor.extensions.v5.resources={...(actor.extensions.v5.resources || {}),fortune:fortune-1};effect.ignoreCriticalPenalties=true;
        const paid=commitV5Resources(before,participants);draft.extensions=paid.extensions;draft.combat.participants=paid.combat.participants;
        draft.log=[{id:uid(),kind:'magic',ts:Date.now(),text:'L’esprit sur le corps : 1 Chance dépensée ; pénalités de Blessures Critiques ignorées pendant cette contemplation. Les blessures restent présentes.'},...(draft.log || [])];return projectV5ResourceEnvelope(draft);
      }, options);
    },
    startMagicAdventure(options = {}){return magicCommand('v5-magic-adventure',draft=>{draft.extensions ??={};draft.extensions.v5 ??={};draft.extensions.v5.magicAdventureId=uid();return draft;}, options);},
    applyMagicMeditation(input={}){
      input = cloneValue(input);
      return magicCommand('v5-magic-meditation',draft=>{
        const participants=draft.combat?.participants || [],index=participants.findIndex(p=>p.id===input.actorId);if(index<0)throw new Error('Acteur introuvable.');
        const needs=prayerCapClockNeeds(participants[index],draft,`combat.participants.${input.actorId}`);if(needs.length)throw Object.assign(new Error(needs[0].message),{userFacing:true,needsInput:needs});
        input.prayerSLContext={sceneId:draft.activeScene?.status==='active'?draft.activeScene.id:null,round:draft.combat?.round};
        const preview=previewMagicMeditation(participants[index],input);if(!preview.ready)throw new Error(preview.error);
        if(preview.success){
          if(preview.yenlui){participants[index].extensions ??={};participants[index].extensions.v5 ??={};participants[index].extensions.v5.yenlui=preview.yenlui;}
          else {participants[index]=expireParticipantSpellEffects(participants[index],{spellId:input.talentId}).participant;participants[index]=applyParticipantSpellEffects(participants[index],preview.effect,{round:currentMagicRound(draft.combat)}).participant;}
        }
        const slTrace=preview.prayerSLAdjustment?` · Courroux « Pensez à vos actes » : ${preview.prayerSLAdjustment.rawSL} DR bruts → ${preview.prayerSLAdjustment.effectiveSL} DR appliqués (plafond +0, huit jours impériaux)`:'';
        draft.log=[{id:uid(),ts:Date.now(),kind:'magic',text:input.name+' : '+(preview.success?'méditation réussie':'échec')+' ; jet '+input.roll+' ; '+preview.test.sl+' DR'+slTrace},...(draft.log || [])];return draft;
      }, input);
    },
    getCadaiRunes(actorId = null) {
      const targetId = actorId || combat.currentActorId;
      const participant = (combat.participants.get(targetId)) || Array.from(combat.participants.values())[0];
      return getCadaiRunes(participant);
    },
    deployCadaiRune(input = {}) {
      input = cloneValue(input);
      const actorId = input.actorId || input.actor?.id || combat.currentActorId;
      return magicCommand('v5-cadai-deploy', draft => {
        const participants = draft.combat?.participants || [];
        const index = participants.findIndex(p => p.id === actorId);
        if (index === -1) throw new Error('Participant introuvable dans le combat');
        if(input.reset){participants[index].extensions ??={};participants[index].extensions.v5 ??={};participants[index].extensions.v5.cadaiRunes={deployed:0,max:Math.floor((Number(participants[index].caracs?.FM)||0)/10)};}
        else {
          if(input.conditionsConfirmed!==true)throw new Error('Lire/Écrire, matériel et conditions de déploiement requis.');
          const skill=(participants[index].skills || []).find(row=>/savoir.*magie|lore.*magic/i.test(row.name || row.nom || ''));
          const score=Number(skill?.total ?? skill?.score ?? skill?.value ?? participants[index].caracs?.Int) || 0;
          const test=selectV5Test(previewV5Test({score,roll:input.roll,kind:'test'}),'keep');
          if(test.success)participants[index] = deployCadaiRune(participants[index], {count:1});
          draft.log=[{id:uid(),ts:Date.now(),kind:'magic',text:'Déploiement Cadai (1 Round) : '+(test.success?'réussi':'échec')+' ; jet '+input.roll+' ; '+test.sl+' DR'},...(draft.log || [])];
        }
        const runes = getCadaiRunes(participants[index]);
        draft.log = [
          { id: uid(), ts: Date.now(), kind: 'magic', text: `Runes des Cadai déployées : ${runes.deployed}/${runes.max}` },
          ...(draft.log || [])
        ].slice(0, 300);
        return draft;
      }, input);
    },
    consumeCadaiRune(input = {}) {
      const actorId = input.actorId || input.actor?.id || combat.currentActorId;
      return api.executeCommand('v5-cadai-consume', draft => {
        const participants = draft.combat?.participants || [];
        const index = participants.findIndex(p => p.id === actorId);
        if (index === -1) throw new Error('Participant introuvable dans le combat');
        const res = consumeCadaiRune(participants[index], input);
        if (!res.success) throw new Error(res.reason);
        participants[index] = res.participant;
        draft.log = [
          { id: uid(), ts: Date.now(), kind: 'magic', text: res.summary },
          ...(draft.log || [])
        ].slice(0, 300);
        return draft;
      });
    },
    previewDispelCasting(castingPreview, input = {}) {
      const dispellerId = input.dispellerId || input.actorId || combat.currentActorId;
      const blocked=combatActionBlock(currentEnvelope(),dispellerId);if(blocked)return {...blocked,allowed:false,unresolved:[blocked.error]};
      const dispeller = (combat.participants.get(dispellerId)) || Array.from(combat.participants.values())[0];
      const round = input.round !== undefined ? input.round : currentMagicRound(combat);
      return previewDispelCasting(dispeller, castingPreview, { turnKey: `${round}:${stateExtensions?.v5?.turnIndex ?? 1}`, round, ...input });
    },
    applyDispelCasting(preview, options = {}) {
      return applyDispelCasting(combatMagicActionStore(api,preview.dispellerId), preview, options);
    },
    previewDispelPersistent(persistentEffect, input = {}) {
      const dispellerId = input.dispellerId || input.actorId || combat.currentActorId;
      const blocked=combatActionBlock(currentEnvelope(),dispellerId);if(blocked)return {...blocked,allowed:false,unresolved:[blocked.error]};
      const dispeller = (combat.participants.get(dispellerId)) || Array.from(combat.participants.values())[0];
      return previewDispelPersistent(dispeller, persistentEffect, input);
    },
    applyDispelPersistent(preview, options = {}) {
      if(preview.baseRevision!==undefined && preview.baseRevision!==localRevision)throw new Error('État modifié : recalcul requis.');
      return applyDispelPersistent(combatMagicActionStore(api,preview.dispellerId), preview, options);
    },
    applySpellEffects(participantId, effectDefinition, options = {}) {
      const targetId = participantId || combat.currentActorId;
      return api.executeCommand('v5-spell-effects-apply', draft => {
        const participants = draft.combat?.participants || [];
        const index = participants.findIndex(p => p.id === targetId);
        if (index === -1) throw new Error('Participant introuvable dans le combat');
        const res = applyParticipantSpellEffects(participants[index], effectDefinition, {
          ...options,
          round: currentMagicRound(draft.combat)
        });
        participants[index] = res.participant;
        const logText = `Effet magique appliqué sur ${participants[index].name || targetId} : ${effectDefinition.spellName || effectDefinition.id || 'Sort'}`;
        draft.log = [{ id: uid(), ts: Date.now(), kind: 'magic', text: logText }, ...(draft.log || [])].slice(0, 300);
        return projectV5ResourceEnvelope(draft);
      });
    },
    expireSpellEffects(participantId, filter = {}) {
      const targetId = participantId || combat.currentActorId;
      return api.executeCommand('v5-spell-effects-expire', draft => {
        const participants = draft.combat?.participants || [];
        const index = participants.findIndex(p => p.id === targetId);
        if (index === -1) throw new Error('Participant introuvable dans le combat');
        const res = expireParticipantSpellEffects(participants[index], filter);
        participants[index] = res.participant;
        const logText = `Expiration d’effets magiques sur ${participants[index].name || targetId} (${res.removedEffects.length} effet(s) retiré(s))`;
        draft.log = [{ id: uid(), ts: Date.now(), kind: 'magic', text: logText }, ...(draft.log || [])].slice(0, 300);
        return projectV5ResourceEnvelope(draft);
      });
    },
    consumeTemporaryFortune(participantId, amount = 1) {
      const targetId = participantId || combat.currentActorId;
      let consumedCount = 0;
      const result = api.executeCommand('v5-consume-temp-fortune', draft => {
        const participants = draft.combat?.participants || [];
        const index = participants.findIndex(p => p.id === targetId);
        if (index === -1) throw new Error('Participant introuvable dans le combat');
        const res = consumeParticipantTempFortune(participants[index], amount);
        participants[index] = res.participant;
        creditFortuneCorruption(draft, participants, participants[index], res.consumed);
        consumedCount = res.consumed;
        const logText = `${participants[index].name || targetId} consomme ${res.consumed} point(s) de Chance temporaire(s)`;
        draft.log = [{ id: uid(), ts: Date.now(), kind: 'magic', text: logText }, ...(draft.log || [])].slice(0, 300);
        return projectV5ResourceEnvelope(draft);
      });
      // En persistance la commande est asynchrone : le compte n'est connu qu'une fois l'état écrit.
      return typeof result?.then === 'function' ? result.then(done => done?.ok === false ? { ...done, consumed: 0 } : { consumed: consumedCount }) : { consumed: consumedCount };
    },
    consumeTemporaryFate(participantId, amount = 1) {
      const targetId = participantId || combat.currentActorId;
      let consumedCount = 0;
      const result = api.executeCommand('v5-consume-temp-fate', draft => {
        const participants = draft.combat?.participants || [];
        const index = participants.findIndex(p => p.id === targetId);
        if (index === -1) throw new Error('Participant introuvable dans le combat');
        const res = consumeParticipantTempFate(participants[index], amount);
        participants[index] = res.participant;
        consumedCount = res.consumed;
        const logText = `${participants[index].name || targetId} consomme ${res.consumed} point(s) de Destin temporaire(s)`;
        draft.log = [{ id: uid(), ts: Date.now(), kind: 'magic', text: logText }, ...(draft.log || [])].slice(0, 300);
        return projectV5ResourceEnvelope(draft);
      });
      // En persistance la commande est asynchrone : le compte n'est connu qu'une fois l'état écrit.
      return typeof result?.then === 'function' ? result.then(done => done?.ok === false ? { ...done, consumed: 0 } : { consumed: consumedCount }) : { consumed: consumedCount };
    },
    previewLoreAttribute(input = {}) {
      const casterId = input.casterId || input.caster?.id || combat.currentActorId;
      const caster = (combat.participants.get(casterId)) || Array.from(combat.participants.values())[0];
      const targets = (input.targetIds || []).map(id => combat.participants.get(id)).filter(Boolean);
      return { ...previewLoreAttribute({
        caster,
        targets: targets.length > 0 ? targets : (input.targets || []),
        ...input
      }), baseRevision: localRevision };
    },
    applyLoreAttribute(preview, options = {}) {
      preview = structuredClone(preview); options = cloneValue(options);
      return magicCommand('v5-lore-attribute-apply', draft => {
        const participants = draft.combat?.participants || [];
        const casterId = options.casterId || preview.casterId || combat.currentActorId;
        const caster = participants.find(p => p.id === casterId);
        const targets = participants.filter(p => (options.targetIds || []).includes(p.id));
        const res = applyLoreAttributeInternal(draft, preview, { ...options, caster, targets });
        for (const [id, updated] of res.updatedParticipants.entries()) {
          const idx = participants.findIndex(p => p.id === id);
          if (idx !== -1) participants[idx] = updated;
        }
        draft.log = [{ id: uid(), ts: Date.now(), kind: 'magic', text: `Attribut de Domaine ${preview.loreName || preview.lore} appliqué` }, ...(draft.log || [])].slice(0, 300);
        return projectV5ResourceEnvelope(draft);
      }, options, preview);
    },
    previewBeastForm(beastProfile, input = {}) {
      const casterId = input.casterId || combat.currentActorId;
      const caster = (combat.participants.get(casterId)) || Array.from(combat.participants.values())[0];
      return { ...previewBeastForm(caster, beastProfile, input), baseRevision: localRevision };
    },
    applyBeastForm(casterId, beastProfile, options = {}) {
      beastProfile = cloneValue(beastProfile); options = cloneValue(options);
      const targetId = casterId || combat.currentActorId;
      return magicCommand('v5-beast-form-apply', draft => {
        const participants = draft.combat?.participants || [];
        const index = participants.findIndex(p => p.id === targetId);
        if (index === -1) throw new Error('Participant introuvable dans le combat');
        const res = applyParticipantBeastForm(participants[index], beastProfile, options);
        participants[index] = res.participant;
        draft.log = [{ id: uid(), ts: Date.now(), kind: 'magic', text: `${participants[index].name} adopte la ${res.preview.spellName} (${beastProfile.name})` }, ...(draft.log || [])].slice(0, 300);
        return draft;
      }, options);
    },
    revertBeastForm(casterId) {
      const targetId = casterId || combat.currentActorId;
      return api.executeCommand('v5-beast-form-revert', draft => {
        const participants = draft.combat?.participants || [];
        const index = participants.findIndex(p => p.id === targetId);
        if (index === -1) throw new Error('Participant introuvable dans le combat');
        const res = revertParticipantBeastForm(participants[index]);
        participants[index] = res.participant;
        draft.log = [{ id: uid(), ts: Date.now(), kind: 'magic', text: `${participants[index].name} reprend sa forme normale (${res.woundsCarriedOver} Blessure(s) conservée(s))` }, ...(draft.log || [])].slice(0, 300);
        return draft;
      });
    },
    previewVerdantApotheosis(input = {}) {
      const casterId = input.casterId || combat.currentActorId;
      const caster = (combat.participants.get(casterId)) || Array.from(combat.participants.values())[0];
      const corpses = (input.corpseIds || []).map(id => combat.participants.get(id)).filter(Boolean);
      return { ...previewVerdantApotheosis({
        caster,
        corpses: corpses.length > 0 ? corpses : (input.corpses || []),
        ...input
      }), baseRevision: localRevision };
    },
    applyVerdantApotheosis(preview, options = {}) {
      preview = structuredClone(preview); options = cloneValue(options);
      return magicCommand('v5-verdant-apotheosis-apply', draft => {
        const participants = draft.combat?.participants || [];
        const targetCorpses = participants.filter(p => preview.results.some(r => r.corpseId === p.id));
        const res = applyVerdantApotheosisInternal(targetCorpses, preview);
        for (const updated of res.updatedCorpses) {
          const idx = participants.findIndex(p => p.id === updated.id);
          if (idx !== -1) participants[idx] = updated;
        }
        draft.log = [{ id: uid(), ts: Date.now(), kind: 'magic', text: `Apothéose Verdoyante : ${preview.admissibleCount} participant(s) revenu(s) à la vie` }, ...(draft.log || [])].slice(0, 300);
        return draft;
      }, options, preview);
    },
    previewDaemonbane(targetId, input = {}) {
      const casterId = input.casterId || combat.currentActorId;
      const caster = (combat.participants.get(casterId)) || Array.from(combat.participants.values())[0];
      const target = combat.participants.get(targetId);
      return { ...previewDaemonbane({ caster, target, ...input }), baseRevision: localRevision };
    },
    applyDaemonbane(targetId, preview, options = {}) {
      preview = structuredClone(preview); options = cloneValue(options);
      return magicCommand('v5-daemonbane-apply', draft => {
        const participants = draft.combat?.participants || [];
        const index = participants.findIndex(p => p.id === targetId);
        if (index === -1) throw new Error('Participant démon introuvable');
        const res = applyDaemonbaneInternal(participants[index], preview);
        participants[index] = res.target;
        draft.log = [{ id: uid(), ts: Date.now(), kind: 'magic', text: `Fléau des Démons : ${preview.summary}` }, ...(draft.log || [])].slice(0, 300);
        return draft;
      }, options, preview);
    },
    /** D-15 : fin de rencontre, le MJ restaure les Bmax divisées par le Fléau des Démons (toutes, ou celles des ids donnés). */
    restoreDaemonbaneMaxHp(targetIds = null) {
      return api.executeCommand('v5-daemonbane-restore', draft => {
        const participants = draft.combat?.participants || [];
        const names = [];
        participants.forEach((p, index) => {
          if (!p.extensions?.v5?.daemonbaneMaxHp || (targetIds && !targetIds.includes(p.id))) return;
          participants[index] = restoreDaemonbaneMaxHpInternal(p);
          names.push(p.name);
        });
        if (!names.length) throw new Error('Aucune Blessure maximale divisée à restaurer.');
        draft.log = [{ id: uid(), ts: Date.now(), kind: 'magic', text: `Fléau des Démons : Bmax restaurées (${names.join(', ')})` }, ...(draft.log || [])].slice(0, 300);
        return draft;
      });
    },
    listDaemonbaneReductions() {
      return daemonbaneReductions(Array.from(combat.participants.values()));
    },
    previewHandOfGlory(targetIds = [], input = {}) {
      const casterId = input.casterId || combat.currentActorId;
      const caster = (combat.participants.get(casterId)) || Array.from(combat.participants.values())[0];
      const targets = (targetIds || []).map(id => combat.participants.get(id)).filter(Boolean);
      return { ...previewHandOfGlory({
        caster,
        targets: targets.length > 0 ? targets : (input.targets || []),
        ...input
      }), baseRevision: localRevision };
    },
    applyHandOfGlory(targetIds = [], preview, options = {}) {
      targetIds = [...targetIds]; preview = structuredClone(preview); options = cloneValue(options);
      return magicCommand('v5-hand-of-glory-apply', draft => {
        const participants = draft.combat?.participants || [];
        const targets = participants.filter(p => targetIds.includes(p.id));
        const res = applyHandOfGloryInternal(targets, preview, options);
        for (const updated of res.updatedTargets) {
          const idx = participants.findIndex(p => p.id === updated.id);
          if (idx !== -1) participants[idx] = updated;
        }
        draft.log = [{ id: uid(), ts: Date.now(), kind: 'magic', text: `Main de Gloire : ${preview.summary}` }, ...(draft.log || [])].slice(0, 300);
        return draft;
      }, options, preview);
    },
    getHighMagicExecutions(actorId = combat.currentActorId) {
      return cloneValue((stateExtensions.v5?.highMagicExecutions || []).filter(row => row.actorId === actorId));
    },
    getDivineAccessGrants(actorId=null) { return getStoreDivineAccessGrants(currentEnvelope(),actorId); },
    resolveDivineAccess(actorId,contractId) { return resolveStoreDivineAccess(currentEnvelope(),actorId,contractId); },
    grantDivineAccess(actorId,contractId,options={}) {
      const expected=options.baseRevision;
      const before=createStoreDivineAccessGrant(currentEnvelope(),actorId,contractId,{...options,baseRevision:expected});
      if(!before.ok)return before;
      let transition;
      try{
        const saved=api.executeCommand('v5-divine-access-grant',draft=>{
          transition=createStoreDivineAccessGrant(draft,actorId,contractId,{...options,baseRevision:expected});
          if(!transition.ok)throw Object.assign(new Error(transition.error),{userFacing:true,code:transition.code});
          return transition.state;
        });
        const finish=result=>result?.ok===false?{ok:false,error:result.error||'La dérogation n’a pas été enregistrée.',code:result.code||'PERSISTENCE'}:{...transition,ok:true};
        return saved&&typeof saved.then==='function'?saved.then(finish).catch(error=>({ok:false,error:error.message||'La dérogation n’a pas été enregistrée.',code:error.code||'DIVINE_ACCESS_COMMAND'})):finish(saved);
      }catch(error){return {ok:false,error:error.message||'La dérogation n’a pas été enregistrée.',code:error.code||'DIVINE_ACCESS_COMMAND'};}
    },
    revokeDivineAccessGrant(grantId,options={}) {
      const expected=options.baseRevision;
      const before=revokeStoreDivineAccessGrant(currentEnvelope(),grantId,{...options,baseRevision:expected});
      if(!before.ok)return before;
      let transition;
      try{
        const saved=api.executeCommand('v5-divine-access-revoke',draft=>{
          transition=revokeStoreDivineAccessGrant(draft,grantId,{...options,baseRevision:expected});
          if(!transition.ok)throw Object.assign(new Error(transition.error),{userFacing:true,code:transition.code});
          return transition.state;
        });
        const finish=result=>result?.ok===false?{ok:false,error:result.error||'La révocation n’a pas été enregistrée.',code:result.code||'PERSISTENCE'}:{...transition,ok:true};
        return saved&&typeof saved.then==='function'?saved.then(finish).catch(error=>({ok:false,error:error.message||'La révocation n’a pas été enregistrée.',code:error.code||'DIVINE_ACCESS_COMMAND'})):finish(saved);
      }catch(error){return {ok:false,error:error.message||'La révocation n’a pas été enregistrée.',code:error.code||'DIVINE_ACCESS_COMMAND'};}
    },    getDivineContract(identifier) { return getDivineContract(identifier); },
    getAllDivineContracts() { return getAllDivineContracts(); },
    canManageDivinePenances(){return divineAuthority==='MJ';},
    getDivinePenanceExamples(){return getDivinePenanceExamples();},
    async createDivinePenance(actorId,input={}){
      if(divineAuthority!=='MJ')throw new Error('Seul le MJ peut créer une pénitence.');const captured=cloneValue(input),expected=captured.baseRevision??localRevision;let transition;
      const saved=api.executeCommand('divine-penance-create',draft=>{transition=createStoreDivinePenance(draft,actorId,{...captured,baseRevision:expected});return transition.state;});const finish=result=>result?.ok===false?result:{ok:true,status:transition.status,record:transition.record};return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    async completeDivinePenance(actorId,id,input={}){
      if(divineAuthority!=='MJ')throw new Error('Seul le MJ peut clôturer une pénitence.');const captured=cloneValue(input),expected=captured.baseRevision??localRevision;
      const initial=completeStoreDivinePenance(currentEnvelope(),actorId,id,{...captured,baseRevision:expected});if(initial.status==='duplicate')return {ok:true,status:'duplicate',record:initial.record};let transition;
      const saved=api.executeCommand('divine-penance-complete',draft=>{transition=completeStoreDivinePenance(draft,actorId,id,{...captured,baseRevision:expected});return transition.state;});const finish=result=>result?.ok===false?result:{ok:true,status:transition.status,record:transition.record};return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    previewDivineAbsolution(input={}) {return previewStoreDivineAbsolution(currentEnvelope(),input);},
    applyDivineAbsolution(input={}) {
      const captured=cloneValue(input);let execution;
      if(['absolution','gm-wrath'].includes(captured.preview?.input?.absolution?.kind)&&divineAuthority!=='MJ')throw new Error('Seul le MJ peut décider cette absolution ou ce Courroux.');
      const saved=api.executeCommand('v5-divine-absolution',draft=>{execution=applyStoreDivineAbsolution(draft,captured);return execution.state;});
      const finish=result=>result?.ok===false?result:{...execution,ok:true};return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    async setSanctifiedGround(input={}){
      if(divineAuthority!=='MJ')throw new Error('Seul le MJ peut poser une terre sanctifiée.');const captured=cloneValue(input),expected=captured.baseRevision??localRevision;let transition;
      const saved=api.executeCommand('divine-ground-set',draft=>{transition=setStoreSanctifiedGround(draft,{...captured,baseRevision:expected});return transition.state;});const finish=result=>result?.ok===false?result:{ok:true,record:transition.record};return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    async removeSanctifiedGround(id,input={}){
      if(divineAuthority!=='MJ')throw new Error('Seul le MJ peut retirer une terre sanctifiée.');const captured=cloneValue(input),expected=captured.baseRevision??localRevision;let transition;
      const saved=api.executeCommand('divine-ground-remove',draft=>{transition=removeStoreSanctifiedGround(draft,id,{...captured,baseRevision:expected});return transition.state;});const finish=result=>result?.ok===false?result:{ok:true};return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    async enterSanctifiedGround(participantId,id,input={}){
      if(divineAuthority!=='MJ')throw new Error('Seul le MJ peut résoudre l’entrée sur une terre sanctifiée.');const captured=cloneValue(input),expected=captured.baseRevision??localRevision;let transition;
      const saved=api.executeCommand('divine-ground-enter',draft=>{transition=enterStoreSanctifiedGround(draft,participantId,id,{...captured,baseRevision:expected});return transition.state;});const finish=result=>result?.ok===false?result:{ok:true,affected:transition.affected,outcome:transition.outcome};return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    async leaveSanctifiedGround(participantId,id,input={}){
      if(divineAuthority!=='MJ')throw new Error('Seul le MJ peut résoudre la sortie d’une terre sanctifiée.');const captured=cloneValue(input),expected=captured.baseRevision??localRevision;let transition;
      const saved=api.executeCommand('divine-ground-leave',draft=>{transition=leaveStoreSanctifiedGround(draft,participantId,id,{...captured,baseRevision:expected});return transition.state;});const finish=result=>result?.ok===false?result:{ok:true};return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    async applyDivineNavalEvent(input={}){
      if(divineAuthority!=='MJ')throw new Error('Seul le MJ peut enregistrer un événement naval.');const captured=cloneValue(input),expected=captured.baseRevision??localRevision;let transition;
      const saved=api.executeCommand('divine-naval-event',draft=>{transition=applyStoreDivineNavalEvent(draft,{...captured,baseRevision:expected});return transition.state;});const finish=result=>result?.ok===false?result:{ok:true,record:transition.record};return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    previewDivineNavalEvent(input={}){return previewStoreDivineNavalEvent(currentEnvelope(),input);},
    getDivineDailyWrathStatus(actorId,id){return getStoreDivineDailyWrathStatus(currentEnvelope(),actorId,id);},
    async startDivineDailyWrath(actorId,input={}){
      if(divineAuthority!=='MJ')throw new Error('Seul le MJ peut ouvrir ce suivi.');const captured=cloneValue(input),expected=captured.baseRevision??localRevision;let transition;
      const saved=api.executeCommand('divine-daily-wrath-start',draft=>{transition=startStoreDivineDailyWrath(draft,actorId,{...captured,baseRevision:expected});return transition.state;});const finish=result=>result?.ok===false?result:{ok:true,record:transition.record};return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    async waiveDivineDailyWrathDay(actorId,id,input={}){
      if(divineAuthority!=='MJ')throw new Error('Seul le MJ peut écarter un jour.');const captured=cloneValue(input),expected=captured.baseRevision??localRevision;let transition;
      const saved=api.executeCommand('divine-daily-wrath-waive',draft=>{transition=waiveStoreDivineDailyWrathDay(draft,actorId,id,{...captured,baseRevision:expected});return transition.state;});const finish=result=>result?.ok===false?result:{ok:true,record:transition.record};return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    async closeDivineDailyWrath(actorId,id,input={}){
      if(divineAuthority!=='MJ')throw new Error('Seul le MJ peut clore ce suivi.');const captured=cloneValue(input),expected=captured.baseRevision??localRevision;let transition;
      const saved=api.executeCommand('divine-daily-wrath-close',draft=>{transition=closeStoreDivineDailyWrath(draft,actorId,id,{...captured,baseRevision:expected});return transition.state;});const finish=result=>result?.ok===false?result:{ok:true,record:transition.record};return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    async setDivineRelic(actorId,input={}){
      if(divineAuthority!=='MJ')throw new Error('Seul le MJ peut poser une relique.');const captured=cloneValue(input),expected=captured.baseRevision??localRevision;let transition;
      const saved=api.executeCommand('divine-relic-set',draft=>{transition=setStoreDivineRelic(draft,actorId,{...captured,baseRevision:expected});return transition.state;});const finish=result=>result?.ok===false?result:{ok:true,record:transition.record};return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    async removeDivineRelic(actorId,id,input={}){
      if(divineAuthority!=='MJ')throw new Error('Seul le MJ peut retirer une relique.');const captured=cloneValue(input),expected=captured.baseRevision??localRevision;let transition;
      const saved=api.executeCommand('divine-relic-remove',draft=>{transition=removeStoreDivineRelic(draft,actorId,id,{...captured,baseRevision:expected});return transition.state;});const finish=result=>result?.ok===false?result:{ok:true};return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    getDivineSinEvents(){return getDivineSinEvents();},
    getDivineSinReminders(){return getDivineSinReminders();},
    previewDivineSinEvent(input={}){return previewStoreDivineSinEvent(currentEnvelope(),input);},
    async applyDivineSinEvent(input={}){
      if(divineAuthority!=='MJ')throw new Error('Seul le MJ peut exécuter un événement de Péché.');const captured=cloneValue(input),expected=captured.baseRevision??localRevision;let transition;
      const saved=api.executeCommand('divine-sin-event',draft=>{transition=applyStoreDivineSinEvent(draft,{...captured,baseRevision:expected});return transition.state;});const finish=result=>result?.ok===false?result:{ok:true,record:transition.record};return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    async returnDivineJudgment(actorId,id,input={}){
      if(divineAuthority!=='MJ')throw new Error('Seul le MJ peut décider le retour après le Jugement dernier.');const captured=cloneValue(input),expected=captured.baseRevision??localRevision;let transition;
      const saved=api.executeCommand('divine-judgment-return',draft=>{transition=returnStoreDivineJudgment(draft,actorId,id,{...captured,baseRevision:expected});return transition.state;});const finish=result=>result?.ok===false?result:{ok:true,status:transition.status,record:transition.record};return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    async decideDivineJudgmentRejection(actorId,id,input={}){
      if(divineAuthority!=='MJ')throw new Error('Seul le MJ peut confirmer ou refuser le rejet.');const captured=cloneValue(input),expected=captured.baseRevision??localRevision;let transition;
      const saved=api.executeCommand('divine-judgment-rejection',draft=>{transition=decideStoreDivineJudgmentRejection(draft,actorId,id,{...captured,baseRevision:expected});return transition.state;});const finish=result=>result?.ok===false?result:{ok:true,status:transition.status,record:transition.record};return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    previewDivineWrathRecovery(input={}) {
      const envelope=currentEnvelope(),actorId=input.actorId,actor=envelope.combat?.participants?.find(row=>row.id===actorId);
      const spent=combatActionBlock(envelope,actorId);if(spent)return {...spent,baseRevision:localRevision};
      const block=brokenEscapeActionBlock(envelope,actorId);if(block)return block;
      if(isBrokenEscapeActor(actor)){
        const visible=input.brokenEscapeFacts?.visibleToAnyEnemy;
        if(typeof visible!=='boolean'||isV5BrokenEscapeActionBlocked(actor,{visibleToAnyEnemy:visible,sequence:envelope.extensions?.v5?.brokenEscape?.byActorId?.[actorId]}))return {ready:false,status:'blocked',error:'Brisé : résoudre Flee/Sprint et confirmer la visibilité avant cette Prière.'};
      }
      return previewStoreDivineWrathRecovery(envelope,input);
    },
    applyDivineWrathRecovery(input={}) {
      const captured=cloneValue(input);let execution;
      const saved=api.executeCommand('v5-divine-wrath-recovery',draft=>{
        const actorId=captured.preview?.input?.actorId,actor=draft.combat?.participants?.find(row=>row.id===actorId),visible=captured.preview?.input?.brokenEscapeFacts?.visibleToAnyEnemy;
        const spent=combatActionBlock(draft,actorId);if(spent)throw Object.assign(new Error(spent.error),{userFacing:true,code:spent.code});
        const block=brokenEscapeActionBlock(draft,actorId);
        if(block||isBrokenEscapeActor(actor)&&(typeof visible!=='boolean'||isV5BrokenEscapeActionBlocked(actor,{visibleToAnyEnemy:visible,sequence:draft.extensions?.v5?.brokenEscape?.byActorId?.[actorId]})))throw Object.assign(new Error('Brisé : Prière de récupération indisponible pour ce Tour.'),{userFacing:true});
        execution=applyStoreDivineWrathRecovery(draft,captured);
        if(execution.state.extensions?.v5?.combatActions?.byActorId?.[actorId]?.kind==='aim')delete execution.state.extensions.v5.combatActions.byActorId[actorId];
        if(execution?.state)registerNewV5Participants(draft,execution.state);
        recordV5ActionUsage(execution.state,actorId,execution.executionId);
        if(isBrokenEscapeActor(execution.state.combat.participants.find(row=>row.id===actorId)))recordV5EscapeVisibility(execution.state,actorId,visible,execution.executionId);
        return execution.state;
      });
      const finish=result=>result?.ok===false?result:{...execution,ok:true};return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    previewDivineExecution(identifier,input={}) {
      const envelope=currentEnvelope(),actorId=input.actorId||envelope.combat?.currentActorId,actor=envelope.combat?.participants?.find(row=>row.id===actorId),sequence=envelope.extensions?.v5?.brokenEscape?.byActorId?.[actorId];
      const actionSpent=combatActionBlock(envelope,actorId);if(actionSpent)return {...actionSpent,baseRevision:localRevision};
      const actionBlock=brokenEscapeActionBlock(envelope,actorId);if(actionBlock)return {...actionBlock,baseRevision:localRevision};
      const brise=actor?.states?.some(row=>['brise','broken'].includes(String(row.key||row.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()));
      if(brise){const fact=input.brokenEscapeFacts?.visibleToAnyEnemy;if(typeof fact!=='boolean')return {ready:false,status:'requires-input',error:'Le MJ doit confirmer la visibilité actuelle envers tout ennemi.',needsInput:[{field:'brokenEscapeFacts.visibleToAnyEnemy',label:'Confirmer la visibilité actuelle envers tout ennemi.'}],baseRevision:localRevision};
       const blocked=isV5BrokenEscapeActionBlocked(actor,{visibleToAnyEnemy:fact,sequence});if(blocked)return {ready:false,status:'blocked',error:'Brisé impose Move (Flee), puis Action (Sprint) tant que le personnage reste visible.',baseRevision:localRevision};const actionBlock=brokenEscapeActionBlock(envelope,actorId);if(actionBlock)return {...actionBlock,baseRevision:localRevision};}
      return previewStoreDivine(envelope,identifier,input);
    },
    applyDivineExecution(identifier,input={}) {
      input=cloneValue(input);let execution;
      const saved=api.executeCommand('v5-divine-prayer',draft=>{
        const actorId=input.preview?.input?.actorId||input.preview?.input?.actor?.id||draft.combat?.currentActorId,actor=draft.combat?.participants?.find(row=>row.id===actorId),brise=actor?.states?.some(row=>['brise','broken'].includes(String(row.key||row.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()));
        const actionSpent=combatActionBlock(draft,actorId);if(actionSpent)throw Object.assign(new Error(actionSpent.error),{userFacing:true,code:actionSpent.code});
        const actionBlock=brokenEscapeActionBlock(draft,actorId);if(actionBlock)throw Object.assign(new Error(actionBlock.error),{userFacing:true,code:actionBlock.code});
        const visibility=input.brokenEscapeFacts?.visibleToAnyEnemy??input.preview?.input?.brokenEscapeFacts?.visibleToAnyEnemy;
        if(brise){if(typeof visibility!=='boolean')throw Object.assign(new Error('Le MJ doit confirmer la visibilité actuelle envers tout ennemi.'),{userFacing:true});const blocked=isV5BrokenEscapeActionBlocked(actor,{visibleToAnyEnemy:visibility,sequence:draft.extensions?.v5?.brokenEscape?.byActorId?.[actorId]});if(blocked)throw Object.assign(new Error('Brisé impose Move (Flee), puis Action (Sprint) tant que le personnage reste visible.'),{userFacing:true});const actionBlock=brokenEscapeActionBlock(draft,actorId);if(actionBlock)throw Object.assign(new Error(actionBlock.error),{userFacing:true,code:actionBlock.code});}
        execution=applyStoreDivine(draft,identifier,input);
        if (execution?.ready && execution.state) registerNewV5Participants(draft, execution.state);
        if(execution?.ready&&execution.state){const executionId=execution.executionId||input.preview?.executionId||`prayer:${identifier}:${execution.state.localRevision}`,tracked=recordV5ActionUsage(execution.state,actorId,executionId);if(!tracked.ok)throw Object.assign(new Error(tracked.reason),{userFacing:true});
          if(execution.state.extensions?.v5?.combatActions?.byActorId?.[actorId]?.kind==='aim')delete execution.state.extensions.v5.combatActions.byActorId[actorId];
          if((execution.state.combat?.participants||[]).find(row=>row.id===actorId)?.states?.some(row=>['brise','broken'].includes(String(row.key||row.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())))recordV5EscapeVisibility(execution.state,actorId,visibility,executionId);}
        return execution.state;
      });
      const finish=result=>result?.ok===false?result:{...execution,ok:true};
      return saved&&typeof saved.then==='function'?saved.then(finish):finish(saved);
    },
    endDivinePrayer(executionId,options={}) {
      const expected=options.baseRevision??localRevision;
      return api.executeCommand('v5-divine-end',draft=>{
        if(draft.localRevision!==expected)throw Object.assign(new Error('La partie a changé : vérifiez les prières actives.'),{userFacing:true});
        return endStoreDivinePrayer(draft,executionId,options);
      });
    },
    setDivineSin(actorId,value,options={}) {
      const expected=options.baseRevision??localRevision;
      return api.executeCommand('v5-divine-sin',draft=>{
        if(draft.localRevision!==expected)throw Object.assign(new Error('La partie a changé : vérifiez le total de Péchés.'),{userFacing:true});
        return setStoreDivineSin(draft,actorId,value,options);
      });
    },
    getSpellContract(identifier) {
      return getSpellContract(identifier);
    },
    getContractChoiceOptions(contractOrId) {
      const contract = typeof contractOrId === 'object' && contractOrId?.id ? contractOrId : getSpellContract(contractOrId);
      return getContractChoiceOptions(contract);
    },
    validateSpellTargets(actor, contractOrId, targets = [], options = {}) {
      const contract = typeof contractOrId === 'object' && contractOrId?.id ? contractOrId : getSpellContract(contractOrId);
      return validateSpellTargets(actor, contract, targets, options);
    },
    validateSpellFingerprint(contract, sourceSpell) {
      return validateSpellFingerprint(contract, sourceSpell);
    },
    previewSpellExecution(contractOrId, input = {}) {
      const contract = typeof contractOrId === 'object' && contractOrId?.id ? contractOrId : getSpellContract(contractOrId);
      const actorId = input.actorId || input.casterId || combat.currentActorId;
      const actionSpent=combatActionBlock(currentEnvelope(),actorId);if(actionSpent)return {...actionSpent,baseRevision:localRevision};
      const actor = (combat.participants.get(actorId)) || Array.from(combat.participants.values())[0];
      const actionBlock=brokenEscapeActionBlock(currentEnvelope(),actorId);if(actionBlock)return {...actionBlock,baseRevision:localRevision};
      if(actor?.states?.some(row=>['brise','broken'].includes(String(row.key||row.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()))){const blocked=isV5BrokenEscapeActionBlocked(actor,{visibleToAnyEnemy:input.brokenEscapeFacts?.visibleToAnyEnemy,sequence:currentEnvelope().extensions?.v5?.brokenEscape?.byActorId?.[actorId]});if(blocked)return {ready:false,status:'requires-input',error:blocked==='needs-fact'?'Le MJ doit confirmer la visibilité envers tout ennemi.':'Brisé impose Move (Flee), puis Action (Sprint) tant que le personnage reste visible.',needsInput:blocked==='needs-fact'?[{field:'brokenEscapeFacts.visibleToAnyEnemy',label:'Confirmer la visibilité actuelle envers tout ennemi.'}]:[],baseRevision:localRevision};}
      const targetIds = input.targetIds || (input.targetId ? [input.targetId] : []);
      const targets = targetIds.map(id => combat.participants.get(id)).filter(Boolean);
      const roster = Array.from(combat.participants.values());
      const preview = previewSpellExecutionInternal(actor, contract, targets.length > 0 ? targets : (input.targets || []), {...input,magicAdventureId:stateExtensions?.v5?.magicAdventureId,fortuneByTarget:Object.fromEntries(roster.map(p=>[p.id,getV5Fortune(currentEnvelope(),p).balance])),participants:roster,assistant:combat.participants.get(input.assistantId),round:currentMagicRound(combat),turnKey:String(combat.round || 1)+':'+String(stateExtensions?.v5?.turnIndex || 1)});
      const keyOfState = row => String(row?.key || row?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const newlyAcquired = (before, after, names) => (after?.states || []).some(state => names.has(keyOfState(state)) && !(before?.states || []).some(old => old.id && old.id === state.id));
      const mountedFall = [];
      const addMountedFall = row => { if (!mountedFall.some(old => old.participantId === row.participantId && old.event === row.event)) mountedFall.push(row); };
      if (preview.ready !== false) for (const receipt of preview.targetResults || []) {
        const before = roster.find(row => row.id === receipt.targetId), after = receipt.appliedSim?.participant || receipt.vortexParticipant;
        if (!before || !after) continue;
        const event = before.extensions?.v5?.mounted === true
          ? newlyAcquired(before, after, new Set(['surpris'])) ? 'rider-surprised'
            : newlyAcquired(before, after, new Set(['sonne'])) ? 'rider-stunned'
              : newlyAcquired(before, after, new Set(['inconscient'])) ? 'rider-unconscious'
                : newlyAcquired(before, after, new Set(['aterre'])) ? 'rider-prone' : null
          : null;
        if (event) addMountedFall({ participantId: before.id, event, ...planMountedFall({ event }) });
        if ((receipt.kill || receipt.destroyed) && before.extensions?.v5?.mounted === true) addMountedFall({ participantId: before.id, event: 'rider-dead', ...planMountedFall({ event: 'rider-dead' }) });
        const riders = roster.filter(row => row.extensions?.v5?.mounted === true && row.extensions.v5.mountId === before.id);
        if (riders.length) {
          const mountEvent = receipt.kill || receipt.destroyed ? 'mount-dead'
            : newlyAcquired(before, after, new Set(['inconscient'])) ? 'mount-unconscious'
            : newlyAcquired(before, after, new Set(['aterre'])) ? 'mount-prone'
              : newlyAcquired(before, after, new Set(['surpris'])) ? 'mount-surprised'
                : newlyAcquired(before, after, new Set(['enchevetre'])) ? 'mount-entangled' : null;
          if (mountEvent) for (const rider of riders) {
            const traits = before.traits || before.profile?.traits || [];
            const riderEntangled = (rider.states || []).some(state => ['enchevetre','entangled'].includes(keyOfState(state)));
            const fall = planMountedFall({ event: mountEvent, mountTraits: traits, riderEntangled });
            if (fall.requiredTest || fall.falls) addMountedFall({ participantId: rider.id, mountId: before.id, event: mountEvent, ...fall });
          }
        }
      }
      if (preview.ready !== false) for (const receipt of preview.secondaryResults || []) {
        const before = roster.find(row => row.id === receipt.targetId);
        if (!before || !Array.isArray(receipt.conditions) || !receipt.conditions.length) continue;
        const after = acquireV5Conditions(before, receipt.conditions).participant;
        const event = before.extensions?.v5?.mounted === true
          ? newlyAcquired(before, after, new Set(['surpris'])) ? 'rider-surprised'
            : newlyAcquired(before, after, new Set(['sonne'])) ? 'rider-stunned'
              : newlyAcquired(before, after, new Set(['inconscient'])) ? 'rider-unconscious'
                : newlyAcquired(before, after, new Set(['aterre'])) ? 'rider-prone' : null : null;
        if (event) addMountedFall({ participantId: before.id, event, ...planMountedFall({ event }) });
        const riders = roster.filter(row => row.extensions?.v5?.mounted === true && row.extensions.v5.mountId === before.id);
        if (riders.length) {
          const mountEvent = newlyAcquired(before, after, new Set(['inconscient'])) ? 'mount-unconscious'
            : newlyAcquired(before, after, new Set(['aterre'])) ? 'mount-prone'
              : newlyAcquired(before, after, new Set(['surpris'])) ? 'mount-surprised'
                : newlyAcquired(before, after, new Set(['enchevetre'])) ? 'mount-entangled' : null;
          if (mountEvent) for (const rider of riders) {
            const fall = planMountedFall({ event: mountEvent, mountTraits: before.traits || before.profile?.traits || [], riderEntangled: (rider.states || []).some(state => ['enchevetre','entangled'].includes(keyOfState(state))) });
            if (fall.requiredTest || fall.falls) addMountedFall({ participantId: rider.id, mountId: before.id, event: mountEvent, ...fall });
          }
        }
      }
      if (preview.ready !== false && roster.some(row => row.extensions?.v5?.mounted === true)) {
        try {
          const simulatedEnvelope = cloneValue(currentEnvelope());
          const simulationResult = applySpellExecutionInternal(simulatedEnvelope, contract, { ...input, preview });
          if (simulationResult?.ready === false) throw new Error('Simulation d’application incomplète');
          const simulatedRoster = simulatedEnvelope.combat?.participants || [];
          for (const before of roster) {
            const after = simulatedRoster.find(row => row.id === before.id);
            if (!after) continue;
            const riders = roster.filter(row => row.extensions?.v5?.mounted === true && row.extensions.v5.mountId === before.id);
            const event = before.extensions?.v5?.mounted === true
              ? after.extensions?.v5?.dead === true ? 'rider-dead'
                : newlyAcquired(before, after, new Set(['inconscient'])) ? 'rider-unconscious'
                  : newlyAcquired(before, after, new Set(['aterre'])) ? 'rider-prone'
                    : newlyAcquired(before, after, new Set(['surpris'])) ? 'rider-surprised'
                      : newlyAcquired(before, after, new Set(['sonne'])) ? 'rider-stunned' : null : null;
            if (event) addMountedFall({ participantId: before.id, event, ...planMountedFall({ event }) });
            const mountEvent = after.extensions?.v5?.dead === true ? 'mount-dead'
              : newlyAcquired(before, after, new Set(['inconscient'])) ? 'mount-unconscious'
                : newlyAcquired(before, after, new Set(['aterre'])) ? 'mount-prone'
                  : newlyAcquired(before, after, new Set(['surpris'])) ? 'mount-surprised'
                    : newlyAcquired(before, after, new Set(['enchevetre'])) ? 'mount-entangled' : null;
            if (riders.length && mountEvent) for (const rider of riders) {
              const fall = planMountedFall({ event: mountEvent, mountTraits: before.traits || before.profile?.traits || [], riderEntangled: (rider.states || []).some(state => ['enchevetre','entangled'].includes(keyOfState(state))) });
              if (fall.requiredTest || fall.falls) addMountedFall({ participantId: rider.id, mountId: before.id, event: mountEvent, ...fall });
            }
          }
        } catch {
          preview.ready = false; preview.status = 'mounted-fall-check-required';
          preview.error = 'Impossible de vérifier les conséquences montées de ce sort. Corrigez les données du sort avant application.';
        }
      }
      const needsInput = [];
      for (const fall of mountedFall) {
        if (!fall.requiredTest) continue;
        const rider = roster.find(row => row.id === fall.participantId), skill = rider?.skills?.find(row => row?.id === V5_RIDE_SKILL_ID && row.status !== 'unresolved');
        const answer = input.mountedRideTests?.[fall.participantId] || {};
        const score = Number.isSafeInteger(skill?.total) ? skill.total : answer.score !== '' && answer.score != null && Number.isSafeInteger(Number(answer.score)) ? Number(answer.score) : null;
        const roll = Number(answer.roll);
        if (score === null) needsInput.push({ field: `mountedRideScore:${fall.participantId}`, kind: 'integer', min: 0, max: 100, label: `${rider?.name || fall.participantId} : score de Chevaucher` });
        if (!Number.isInteger(roll) || roll < 1 || roll > 100) needsInput.push({ field: `mountedRideRoll:${fall.participantId}`, kind: 'd100', min: 1, max: 100, label: `${rider?.name || fall.participantId} : d100 de Chevaucher (${fall.event}, ${fall.requiredTest.modifier >= 0 ? '+' : ''}${fall.requiredTest.modifier} DR)` });
        if (score !== null && Number.isInteger(roll) && roll >= 1 && roll <= 100) {
          fall.test = selectV5Test(previewV5Test({ score, roll, kind: 'test', slModifiers: [{ id: 'mounted:fall', label: 'Désarçonnement', amount: fall.requiredTest.modifier }] }), 'keep');
          fall.dismount = !fall.test.success;
        }
      }
      if (mountedFall.length) {
        preview.mountedFall = mountedFall;
        if (needsInput.length) { preview.ready = false; preview.status = 'requires-input'; preview.needsInput = [...(preview.needsInput || []), ...needsInput]; preview.error = 'Test de Chevaucher requis avant d’appliquer les conséquences du sort.'; }
      }
      return { ...preview, baseRevision: localRevision };
    },
    async applySpellExecution(contractOrId, input = {}) {
      input = cloneValue(input);
      const mountedPreflight = api.previewSpellExecution(contractOrId, input);
      if (mountedPreflight.status === 'mounted-fall-check-required') return { ...mountedPreflight, ok: false, status: 'requires-input' };
      if (mountedPreflight.mountedFall?.length && mountedPreflight.needsInput?.some(need => need.field?.startsWith('mountedRide'))) {
        return { ...mountedPreflight, ok: false, status: 'requires-input' };
      }
      if (mountedPreflight.mountedFall?.length) input.preview = { ...(input.preview || {}), mountedFall: cloneValue(mountedPreflight.mountedFall) };
      let execResult = null;
      const command = magicCommand('v5-spell-execution-apply', draft => {
        const contract = typeof contractOrId === 'object' && contractOrId?.id ? contractOrId : getSpellContract(contractOrId);
        const beforeResources=structuredClone(draft);
        const actorId=input.actorId||input.casterId||draft.combat?.currentActorId,actor=draft.combat?.participants?.find(row=>row.id===actorId);
        const actionSpent=combatActionBlock(draft,actorId);if(actionSpent)throw Object.assign(new Error(actionSpent.error),{userFacing:true,code:actionSpent.code});
        const actionBlock=brokenEscapeActionBlock(draft,actorId);if(actionBlock)throw Object.assign(new Error(actionBlock.error),{userFacing:true,code:actionBlock.code});
        if(actor?.states?.some(row=>['brise','broken'].includes(String(row.key||row.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()))){const blocked=isV5BrokenEscapeActionBlocked(actor,{visibleToAnyEnemy:input.brokenEscapeFacts?.visibleToAnyEnemy,sequence:draft.extensions?.v5?.brokenEscape?.byActorId?.[actorId]});if(blocked)throw Object.assign(new Error(blocked==='needs-fact'?'Le MJ doit confirmer la visibilité envers tout ennemi.':'Brisé impose Move (Flee), puis Action (Sprint) tant que le personnage reste visible.'),{userFacing:true});}
        execResult = applySpellExecutionInternal(draft, contract, input);
        if (execResult?.ready !== false) {
          const dismounted = new Set((input.preview?.mountedFall || []).filter(row => row.dismount === true).map(row => row.participantId));
          if (dismounted.size) draft.combat.participants = draft.combat.participants.map(row => dismounted.has(row.id) ? clearMountedRelation(row) : row);
          for (const fall of input.preview?.mountedFall || []) {
            const rider = draft.combat.participants.find(row => row.id === fall.participantId);
            draft.log = [{ id: uid(), ts: Date.now(), kind: 'effect', targetId: fall.participantId,
              text: `${rider?.name || fall.participantId} : conséquence montée du sort (${fall.event})${fall.test ? ` · Chevaucher ${fall.test.roll}, ${fall.test.sl} DR` : ''}${fall.dismount ? ' — désarçonné' : fall.falls ? ' — chute automatique' : ' — reste en selle'}`,
              detail: { kind: 'mounted-fall', mountedFall: [cloneValue(fall)] } }, ...(draft.log || [])].slice(0, 300);
          }
          registerNewV5Participants(beforeResources, draft);
          if(draft.extensions?.v5?.combatActions?.byActorId?.[actorId]?.kind==='aim')delete draft.extensions.v5.combatActions.byActorId[actorId];
        }
        // V5 p. 255 : une attaque magique effectivement appliquée termine aussi l’invisibilité, dans la même commande.
        const offensive=input.offensiveAction===true || contract.effects?.missile || contract.effects?.damage || contract.effects?.rolledDamage || contract.effects?.vortex || contract.effects?.breath || contract.effects?.sleep || contract.effects?.dropHeldObject || contract.effects?.opposedTest || contract.effects?.suppression || ['damage','magic-missile'].includes(contract.effects?.type) || (contract.effects?.conditions || []).some(s=>/aveugl|sonn|enchev|empoison|brise|enflam|hemorrag/i.test(typeof s==='string'?s:s.name));
        if(offensive && (input.targetIds || []).some(id=>id!==(input.actorId || draft.combat.currentActorId)))draft.combat.participants=endSpellEffectsOnEvent(draft.combat.participants,input.actorId || draft.combat.currentActorId,'attack');
        const paid=(draft.combat?.participants || []).filter(p=>p.extensions?.v5?.magicDefianceAdventure && p.extensions.v5.magicDefianceAdventure!==beforeResources.combat?.participants?.find(old=>old.id===p.id)?.extensions?.v5?.magicDefianceAdventure);
        if(paid.length){
          const beforeParticipants=beforeResources.combat?.participants || [];
          const committed=commitV5Resources(beforeResources,beforeParticipants.map(p=>paid.find(next=>next.id===p.id) || p));
          draft.extensions.v5.characterResources=committed.extensions?.v5?.characterResources || [];
          draft.combat.participants=draft.combat.participants.map(p=>paid.some(row=>row.id===p.id)?committed.combat.participants.find(row=>row.id===p.id):p);
        }
        if(execResult?.ready!==false){const tracked=recordV5ActionUsage(draft,actorId,input.preview?.executionId||input.preview?.actionId||`spell:${contract.id}:${draft.localRevision}`);if(!tracked.ok)throw Object.assign(new Error(tracked.reason),{userFacing:true});}
        return projectV5ResourceEnvelope(draft);
      }, input, input.preview);
      const result = persisted => persisted?.ok === false ? persisted : execResult;
      return command && typeof command.then === 'function' ? command.then(result) : result(command);
    },
    previewSpellInteraction(input = {}) { return previewSpellInteraction(currentEnvelope(),input); },
    applySpellInteraction(input = {}) {
      const expected=input.baseRevision ?? localRevision;
      const preview=previewSpellInteraction(currentEnvelope(),input);
      if(!preview.ready) return {...preview,ok:false};
      if(expected!==localRevision) return {ok:false,ready:false,status:'stale',error:'Le combat a changé.'};
      return api.executeCommand('v5-spell-interaction',draft=>{
        if(draft.localRevision!==expected) throw new Error('Le combat a changé.');
        const result=previewSpellInteraction(draft,input);
        if(!result.ready) throw new Error(result.error);
        return result.state;
      });
    },
    getReminders(transition = {}) {
      lastReminderTransition = cloneValue(transition || {});
      if (!activeScene) return [];
      const actorId = transition.actorId || activeScene.currentActorId;
      const actor = (activeScene.participants || []).find(item => item?.id === actorId);
      const snapshot = {
        ...activeScene,
        sceneId: activeScene.id,
        states: actor?.states || [],
        consequences: activeScene.consequences || [],
        reinforcements: activeScene.reinforcements || []
      };
      // The name only feeds the displayed text; reminder ids stay unchanged.
      const named = actor?.name && !transition.actorName ? { ...transition, actorName: actor.name } : transition;
      return pendingReminders(deriveReminders(snapshot, named, reminderChoices));
    },
    // Rappels portés par un participant (carte de combat) : indépendants de la scène active, donc aussi pour un combat monté depuis la bibliothèque.
    getParticipantReminders(participantId) {
      const snapshot = { sceneId: activeScene?.id || 'combat', participants: Array.from(combat.participants.values()).filter(item => item?.id === participantId), allParticipants: Array.from(combat.participants.values()) };
      return pendingReminders(deriveReminders(snapshot, { id: `round-${combat.round || 0}`, type: 'participant', round: combat.round || 0 }, reminderChoices)).filter(item => item.kind === 'participant-reminder');
    },
    resolveParticipantReminder(participantId, id, decision, details = {}) {
      const snapshot = { sceneId: activeScene?.id || 'combat', participants: Array.from(combat.participants.values()).filter(item => item?.id === participantId), allParticipants: Array.from(combat.participants.values()) };
      const transition = { id: `round-${combat.round || 0}`, type: 'participant', round: combat.round || 0 };
      const derived = deriveReminders(snapshot, transition, reminderChoices);
      const choice = resolveReminder(derived, id, decision, { text: derived.find(item => item.id === id)?.text, ...details }).find(item => item.id === id)?.choice;
      if (!choice) return false;
      return api.executeCommand('resolve-reminder', draft => ({ ...draft, reminderChoices: [...(draft.reminderChoices || []).filter(item => item.id !== id), choice] }));
    },
    listReminderChoices() { return cloneValue(reminderChoices); },
    resolveReminder(id, decision, details = {}) {
      if (!activeScene) return false;
      const transition = lastReminderTransition || {};
      const actorId = transition.actorId || activeScene.currentActorId;
      const actor = (activeScene.participants || []).find(item => item?.id === actorId);
      const snapshot = { ...activeScene, sceneId: activeScene.id, states: actor?.states || [], consequences: activeScene.consequences || [], reinforcements: activeScene.reinforcements || [] };
      const next = resolveReminder(deriveReminders(snapshot, transition, reminderChoices), id, decision, details);
      const choice = next.find(item => item.id === id)?.choice;
      if (!choice) return false;
      return api.executeCommand('resolve-reminder', draft => ({ ...draft, reminderChoices: [...(draft.reminderChoices || []).filter(item => item.id !== id), choice] }));
    },
    saveReminderDecision({ reminderId, decision, details = {} } = {}) {
      return api.resolveReminder(reminderId, decision, details);
    },
    createIntention(input) { return api.executeCommand('create-intention', draft => ({ ...draft, activeScene: { ...draft.activeScene, intentions: [...(draft.activeScene?.intentions || []), createIntention(input)] } })); },
    createSceneEvent(input) { return createSceneEvent(input); },
    saveSceneEvent(event) {
      if (!activeScene) throw new Error('Aucune scène active');
      const value = createSceneEvent(event);
      return api.executeCommand('save-scene-event', draft => ({ ...draft, activeScene: { ...draft.activeScene, events: [...(draft.activeScene.events || []).filter(item => item.id !== value.id), value] } }));
    },
    deleteSceneEvent(id) {
      if (!activeScene) throw new Error('Aucune scène active');
      return api.executeCommand('delete-scene-event', draft => ({ ...draft, activeScene: { ...draft.activeScene, events: (draft.activeScene.events || []).filter(item => item.id !== id) } }));
    },
    createSceneClock(input) { return createSceneClock(input); },
    saveSceneClock(clock) {
      if (!activeScene) throw new Error('Aucune scène active');
      const value = createSceneClock(clock);
      return api.executeCommand('save-scene-clock', draft => ({ ...draft, activeScene: { ...draft.activeScene, clocks: [...(draft.activeScene.clocks || []).filter(item => item.id !== value.id), value] } }));
    },
    deleteSceneClock(id) {
      if (!activeScene) throw new Error('Aucune scène active');
      return api.executeCommand('delete-scene-clock', draft => ({ ...draft, activeScene: { ...draft.activeScene, clocks: (draft.activeScene.clocks || []).filter(item => item.id !== id) } }));
    },
    proposeSceneEvent(event, options = {}) { return activeScene ? proposeSceneEvent(activeScene, event, options) : { status: 'not-eligible' }; },
    previewSceneEvent(event, options = {}) {
      if (!activeScene) return { status: 'not-eligible', reason: 'Aucune scène active' };
      const proposal = proposeSceneEvent(activeScene, event, { manual: Boolean(options.confirmed || options.manual) });
      return { ...proposal, baseRevision: localRevision, sceneRevision: activeScene.revision ?? null };
    },
    applySceneEvent(event, options = {}) {
      // Décision du MJ (26/10) : tout personnage a son jet d’Initiative avant le Round 1, renfort de scène compris.
      const reinforcementId = event?.consequence?.type === 'reinforcement' ? (event.consequence.participantId || event.consequence.id) : null;
      const reinforced = reinforcementId ? combat.participants.get(reinforcementId) : null;
      if (reinforced && reinforced.zone !== 'active' && Number(combat.round) === 0 && stateExtensions?.v5?.combatInitiativeInitialized === true && !reinforced.extensions?.v5?.combatInitiative?.initialized)
        return Promise.resolve({ status: 'error', code: 'COMBAT_INIT_REQUIRED', reason: 'Un renfort avant le Round 1 doit d’abord recevoir son jet d’Initiative : faites-le entrer en jeu depuis le banc.' });
      let semanticResult = null;
      const commit = api.executeCommand('apply-scene-event', draft => {
        const scene = draft.activeScene;
        if (!scene) {
          const error = new Error('Aucune scène active'); error.code = 'SCENE_EVENT_INVALID'; throw error;
        }
        if (options.baseRevision !== undefined && options.baseRevision !== draft.localRevision) {
          const error = new Error('Scène périmée'); error.code = 'SCENE_EVENT_STALE'; throw error;
        }
        if (options.sceneRevision !== undefined && options.sceneRevision !== (scene.revision ?? null)) {
          const error = new Error('Aperçu de scène périmé'); error.code = 'SCENE_EVENT_STALE'; throw error;
        }
        const result = applySceneEvent(scene, event, { manual: Boolean(options.confirmed || options.manual) });
        if (result.status === 'duplicate') {
          const error = new Error('Occurrence déjà résolue'); error.code = 'SCENE_EVENT_DUPLICATE'; throw error;
        }
        if (result.status !== 'applied') {
          const error = new Error('Condition de scène non satisfaite'); error.code = 'SCENE_EVENT_NOT_ELIGIBLE'; throw error;
        }
        semanticResult = result;
        return { ...draft, activeScene: result.scene };
      });
      return Promise.resolve(commit).then(persisted => {
        if (persisted?.ok === false) return { status: 'error', reason: 'Événement non sauvegardé' };
        return { ...semanticResult, persistence: persisted };
      }).catch(error => {
        if (error?.code === 'SCENE_EVENT_DUPLICATE') return { status: 'duplicate' };
        if (error?.code === 'SCENE_EVENT_STALE') return { status: 'stale', requiresPreview: true };
        if (error?.code === 'SCENE_EVENT_NOT_ELIGIBLE') return { status: 'not-eligible' };
        if (error?.code === 'SCENE_EVENT_INVALID') return { status: 'error', reason: error.message };
        throw error;
      });
    },
    resolveSceneEvent(event) {
      if (!activeScene) throw new Error('Aucune scène active');
      return api.executeCommand('resolve-scene-event', draft => ({ ...draft, activeScene: resolveSceneEvent(draft.activeScene, event) }));
    },
    advanceSceneClock(clockId, amount = 1) {
      if (!activeScene) throw new Error('Aucune scène active');
      return api.executeCommand('advance-scene-clock', draft => ({ ...draft, activeScene: advanceSceneClock(draft.activeScene, clockId, amount) }));
    },
    importParsedProfiles(profiles = []) {
      const captured = cloneValue(profiles);
      return api.executeCommand('import-text-profiles', draft => ({ ...draft, reserve: [...(draft.reserve || []), ...captured.map(profile => convertLegacyV4Profile({ ...canonicalizeProfileFields(profile), id: profile.id || uid(), caracs: normalizeCaracs(profile.caracs) }))] }));
    },

    setMountedState(riderId, { mounted = false, mountId = null, baseRevision = localRevision } = {}) {
      return api.executeCommand('set-mounted-state-v5', draft => {
        if (draft.localRevision !== baseRevision) throw Object.assign(new Error('La rencontre a changé. Relisez la monture du cavalier.'), { code: 'MOUNTED_STATE_STALE', userFacing: true });
        const participants = draft.combat?.participants || [];
        const rider = participants.find(row => row.id === riderId);
        if (!rider) throw Object.assign(new Error('Le cavalier doit être un participant de la rencontre.'), { code: 'MOUNTED_RIDER_REQUIRED', userFacing: true });
        if (mounted !== true) {
          return { ...draft, combat: { ...draft.combat, participants: participants.map(row => row.id === riderId ? clearMountedRelation(row) : row) } };
        }
        if (rider.zone !== 'active') throw Object.assign(new Error('Le cavalier doit être un participant actif.'), { code: 'MOUNTED_RIDER_REQUIRED', userFacing: true });
        if (typeof mountId !== 'string' || !mountId.trim() || mountId === riderId) throw Object.assign(new Error('Choisissez une monture active distincte du cavalier.'), { code: 'MOUNTED_MOUNT_REQUIRED', userFacing: true });
        const mount = participants.find(row => row.id === mountId);
        if (!mount || mount.zone !== 'active') throw Object.assign(new Error('La monture choisie doit être un participant actif.'), { code: 'MOUNTED_MOUNT_REQUIRED', userFacing: true });
        return { ...draft, combat: { ...draft.combat, participants: participants.map(row => row.id === riderId ? withV5(row, v5 => ({ ...v5, mounted: true, mountId })) : row) } };
      });
    },

    getAftermathState() {
      const stored = currentEnvelope().extensions?.v5?.aftermathRegister;
      return stored == null ? createAftermathState() : validateAftermathState(stored);
    },
    previewAftermathAdvance(input = {}) {
      return previewAftermathAdvance(api.getAftermathState(), input);
    },
    _runAftermathCommand(type, operation, { participantId = null, patientWounds = null } = {}) {
      let outcome = null;
      const refused = new Error('aftermath operation was not applied');
      refused.aftermathRefused = true;
      let commit;
      try { commit = api.executeCommand(type, draft => {
        const extensions = draft.extensions || {};
        const v5 = extensions.v5 || {};
        const current = v5.aftermathRegister == null ? createAftermathState() : validateAftermathState(v5.aftermathRegister);
        const target = participantId ? (draft.combat?.participants || []).find(row => row.id === participantId) : null;
        if (participantId && !target) {
          outcome = { status: 'refused', reason: 'unknown-subject', receipt: { id: null, kind: type, status: 'refused', reason: 'unknown-subject' } };
          throw refused;
        }
        outcome = operation(current, target);
        if (outcome?.receipt?.status !== 'applied' || outcome.state.revision === current.revision) throw refused;
        const nextV5 = { ...v5, aftermathRegister: outcome.state };
        let next = { ...draft, extensions: { ...extensions, v5: nextV5 } };
        if (participantId && patientWounds) {
          const healed = Number(outcome.receipt.healed) || 0;
          const injury = Number(outcome.receipt.fumbleDamage) || 0;
          if (healed || injury) {
            const participants = next.combat.participants.map(row => row.id === participantId
              ? { ...row, hp: Math.max(1, Math.min(Number(row.maxHp ?? row.hp) || row.hp, Number(row.hp) + healed - injury)) }
              : row);
            next = { ...next, combat: { ...next.combat, participants } };
            outcome = { ...outcome, receipt: { ...outcome.receipt, currentWoundsAfter: participants.find(row => row.id === participantId)?.hp } };
          }
        }
        return next;
      }); } catch (error) { if (error?.aftermathRefused) return outcome; throw error; }
      return commit?.then ? commit.then(() => outcome).catch(error => { if (error?.aftermathRefused) return outcome; throw error; }) : outcome;
    },
    registerAftermathIncident(input = {}) {
      return api._runAftermathCommand('register-aftermath-incident', (state) => registerWoundIncident(state, { ...input, expectedRevision: input.expectedRevision ?? state.revision }));
    },
    advanceAftermathCalendar(input = {}) {
      return api._runAftermathCommand('advance-aftermath-calendar', (state) => advanceAftermathCalendar(state, { ...input, expectedRevision: input.expectedRevision ?? state.revision }));
    },
    treatAftermathWound(input = {}) {
      return api._runAftermathCommand('treat-aftermath-wound', (state, participant) => treatWoundIncident(state, { ...input, expectedRevision: input.expectedRevision ?? state.revision, participantId: participant.id, wounds: participant.hp }), { participantId: input.participantId, patientWounds: true });
    },
    treatAftermathInfection(input = {}) {
      return api._runAftermathCommand('treat-aftermath-infection', (state) => treatInfection(state, { ...input, expectedRevision: input.expectedRevision ?? state.revision }));
    },
    treatAftermathSurgicalIncident(input = {}) {
      return api._runAftermathCommand('treat-aftermath-surgery', (state) => treatSurgicalIncident(state, { ...input, expectedRevision: input.expectedRevision ?? state.revision }));
    },
    getFullJSON() {
      const data = currentEnvelope();
      return JSON.stringify(data, null, 2);
    },
    async listRestorePoints() {
      if (!persistence || typeof persistence.listRestorePoints !== 'function') return [];
      const points = await persistence.listRestorePoints();
      return Array.isArray(points) ? points.map(point => ({
        id: point.id,
        contextId: point.contextId,
        createdAt: point.createdAt,
        reason: point.reason || 'manual',
        sourceFormat: point.state?.format || 'snapshot-v2',
        localRevision: Number.isInteger(point.state?.localRevision) ? point.state.localRevision : null
      })) : [];
    },
    async previewRestorePoint(id) {
      if (!persistence || typeof persistence.listRestorePoints !== 'function') {
        throw new Error('Points de restauration indisponibles');
      }
      if (typeof id !== 'string' || !id.trim()) throw new TypeError('restore id invalide');
      const baseRevision = localRevision;
      const points = await persistence.listRestorePoints();
      const point = points.find(item => item?.id === id);
      if (!point) throw new Error('Point de restauration introuvable');
      return { ...restoreSourcePreview(point), baseRevision };
    },
    async restorePoint(id, options = {}) {
      if (!persistence || typeof persistence.listRestorePoints !== 'function') {
        throw new Error('Points de restauration indisponibles');
      }
      if (typeof id !== 'string' || !id.trim()) throw new TypeError('restore id invalide');
      const lookupRevision = localRevision;
      const expectedRevision = options.expectedRevision ?? options.expectedLocalRevision ?? options.expected?.localRevision ?? lookupRevision;
      if (expectedRevision !== undefined && expectedRevision !== localRevision) {
        return { status: 'stale', expectedRevision, currentRevision: localRevision };
      }
      const preview = await api.previewRestorePoint(id);
      if (options.expectedPointRevision !== undefined
        && options.expectedPointRevision !== preview.data.localRevision) {
        return { status: 'stale', expectedPointRevision: options.expectedPointRevision, pointRevision: preview.data.localRevision ?? null };
      }
      const importData = {
        ...preview.data,
        // The restore itself is a visible management action, while the
        // journal remains local and bounded like a regular import.
        log: [{ id: uid(), ts: Date.now(), kind: 'management', text: '↩️ Point de restauration chargé.' }, ...(preview.data.log || [])].slice(0, 300)
      };
      const beforeRestoreId = uid();
      const persisted = await api.executeCommand('restore-point', draft => {
        if (draft.localRevision !== expectedRevision) {
          const error = new Error('État modifié pendant la prévisualisation');
          error.code = 'RESTORE_STALE';
          throw error;
        }
        return importData;
      }, {
        restore: ({ before }) => ({ id: beforeRestoreId, reason: 'restore-before', state: before })
      }).catch(error => {
        if (error?.code === 'RESTORE_STALE') return { status: 'stale', expectedRevision, currentRevision: localRevision };
        throw error;
      });
      if (persisted?.status === 'stale') return persisted;
      if (persisted?.ok === false) throw persisted?.error || new Error('Restauration non sauvegardée');
      return { status: 'restored', id, ...preview.report, report: preview.report, counts: preview.counts, persistence: persisted };
    },
    previewImport(jsonStr) {
      const raw = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
      const migrated = migrateSnapshot(raw, { appVersion, contextId });
      const incomingProfileIds = new Set(migrated.data.reserve.map(profile => profile.id));
      const incomingParticipantIds = new Set(migrated.data.combat.participants.map(participant => participant.id));
      return {
        data: migrated.data,
        report: migrated.report,
        counts: {
          profiles: migrated.data.reserve.length,
          participants: migrated.data.combat.participants.length,
          rejected: migrated.report.rejected.length,
          repaired: migrated.report.repaired.length,
          replacedProfiles: [...reserve.keys()].filter(id => incomingProfileIds.has(id)).length,
          replacedParticipants: [...combat.participants.keys()].filter(id => incomingParticipantIds.has(id)).length
        }
      };
    },
    loadFromJSON(jsonStr) {
      try {
        if (persistence && !canMutate()) {
          return Promise.reject(new Error('Persistance non prête : import suspendu'));
        }
        const preview = this.previewImport(jsonStr);
        if (!persistence) {
          recordSnapshot('import-replace');
          applyDataToState(preview.data, { includeLog: true });
          save(true); emitBus('reserve'); emitBus('combat'); emitBus('log'); this.log('📂 Données chargées.');
          return preview.report;
        }
        // L’import remplaçant suit la même commande atomique que les gestes
        // utilisateur : migration, historique, nouvel état et restauration
        // sont écrits avant que le Store vivant ne change.
        const restore = { id: uid(), reason: 'import-replace', state: currentEnvelope() };
        pendingRestore = null;
        const importData = {
          ...preview.data,
          log: [{ id: uid(), ts: Date.now(), kind: 'management', text: '📂 Données chargées.' }, ...(preview.data.log || [])].slice(0, 300)
        };
        const importTransaction = api.executeCommand('import-replace', () => importData, { restore }).then(result => {
          if (result?.ok === false) throw result?.error || new Error('Import non sauvegardé');
          pendingRestore = null;
          return preview.report;
        }).catch(error => {
          pendingRestore = null;
          throw error;
        });
        importInFlight = importTransaction;
        return importTransaction.finally(() => { importInFlight = null; });
      } catch (e) {
        console.error('Erreur chargement:', e);
        throw e;
      }
    }
  };

  async function hydratePersistence() {
    let readyResult;
    try {
      const persisted = await persistence.load();
      if (persisted) {
        applyDataToState(migrateSnapshot(persisted, { appVersion, contextId }).data, { includeLog: true });
      } else if (storage && contextId === 'guest') {
        const migrated = migrateLegacyStorage(storage, { appVersion, contextId });
        applyDataToState(migrated.data, { includeLog: true });
        const legacyKeys = Object.values(KEY).reduce((raw, key) => {
          raw[key] = storage.getItem(key);
          return raw;
        }, {});
        await persistence.saveAtomic({
          state: migrated.data,
          // Garder la source brute permet une restauration fidèle même si la
          // migration enrichit ou répare des champs à l’import.
          restore: {
            reason: 'migration',
            state: { format: 'legacy-localStorage', contextId, keys: legacyKeys }
          }
        });
      } else {
        applyDataToState({ reserve: [], combat: {}, log: [], diceLines: [] }, { includeLog: true });
        await persistence.saveAtomic({ state: currentEnvelope() });
      }
      if (combat.order.length === 0 && combat.participants.size > 0) setOrderByInitiative();
      hydrationComplete = true;
      hydrationFailed = false;
      readyResult = { ok: true };
      reportLocalStatus('saved');
    } catch (error) {
      // L’état mémoire est potentiellement vide ou partiel. Le laisser
      // modifiable ferait courir le risque d’écraser la source au prochain
      // clic. Le Store reste consultable pour export/récupération, mais toute
      // écriture est refusée tant qu’une réhydratation n’a pas réussi.
      hydrationComplete = false;
      hydrationFailed = true;
      console.error('❌ Erreur de réhydratation IndexedDB:', error);
      reportLocalStatus('error');
      readyResult = { ok: false, error };
    } finally {
      resolveReady(readyResult || { ok: false, error: new Error('Persistance non initialisée') });
      if (typeof onReady === 'function') onReady(readyResult);
      if (readyResult?.ok && savePending) {
        savePending = false;
        save();
      }
    }
    return readyResult;
  }

  api.retryHydration = () => {
    if (!persistence) return Promise.resolve({ ok: true });
    if (hydrationInFlight) return hydrationInFlight;
    hydrationInFlight = hydratePersistence().finally(() => { hydrationInFlight = null; });
    return hydrationInFlight;
  };

  api.switchContext = async (nextContextId) => {
    if (!persistenceFactory || typeof nextContextId !== 'string' || !nextContextId.trim()) {
      throw new Error('Changement de contexte indisponible');
    }
    if (nextContextId === contextId) return { ok: true };
    await persistenceQueue;
    await syncSession?.idle?.();
    syncSession?.stop?.();
    lastRemoteRevision = -1;
    contextId = nextContextId;
    syncSession = null;
    syncContextId = null;
    syncSessionReady = false;
    pendingProtocolState = false;
    legacyImportCandidate = null;
    hydrationComplete = false;
    hydrationFailed = false;
    applyDataToState({ reserve: [], combat: {}, log: [], diceLines: [] }, { includeLog: true });
    // Clear the previous context immediately while the new IDB context loads.
    if (bus && bus.emit) {
      bus.emit('reserve'); bus.emit('combat'); bus.emit('log');
    }
    persistence = persistenceFactory(contextId);
    hydrationInFlight = hydratePersistence().finally(() => { hydrationInFlight = null; });
    return hydrationInFlight.then(result => {
      if (result?.ok && bus && bus.emit) {
        bus.emit('reserve'); bus.emit('combat'); bus.emit('log');
      }
      return result;
    });
  };

  api.whenIdle = () => Promise.all([persistenceQueue, syncSession?.idle?.()]);
  api.detachSync = () => {
    syncAttachEpoch++;
    lastRemoteRevision = -1;
    syncSession?.stop?.();
    syncSession = null;
    syncContextId = null;
    syncSessionReady = false;
    pendingProtocolState = false;
    sync = null;
    syncSessionStarting = false;
  };
  api.resolveSyncRemote = options => {
    if (!syncSession) return Promise.reject(new Error('Session distante indisponible'));
    return syncSession.resolveRemote({ ...(options || {}), localState: options?.localState ?? currentEnvelope() });
  };
  api.resolveSyncLocal = options => {
    if (!syncSession) return Promise.reject(new Error('Session distante indisponible'));
    const local = options?.localState ?? currentEnvelope();
    return syncSession.resolveLocal({ ...(options || {}), state: options?.state ?? local, localState: local });
  };
  api.exportSyncConflict = () => syncSession?.exportConflict() || null;
  api.importGuestSnapshot = snapshot => {
    if (!snapshot) return Promise.reject(new Error('Aucune donnée invitée à importer'));
    // loadFromJSON already commits the v2 operation (and starts its background
    // flush) as one command.  A second full save here would publish a duplicate
    // operation and advance the remote revision twice on explicit legacy import.
    return Promise.resolve(api.loadFromJSON(JSON.stringify(snapshot)));
  };

  if (persistence) {
    hydrationInFlight = hydratePersistence().finally(() => { hydrationInFlight = null; });
  }
  else {
    load();
    if (combat.order.length === 0 && combat.participants.size > 0) setOrderByInitiative();
    resolveReady({ ok: true });
  }

  let syncListenerStarted = false;

  function startSyncListener() {
    if (syncListenerStarted) return;
    if (!(sync && sync.onValue && sync.dbRef)) return;
    syncListenerStarted = true;

    sync.onValue(sync.dbRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      if (data.writer === CLIENT_ID) return;

      const incomingTs = parseTimestamp(data.timestamp);
      if (incomingTs && lastAppliedTimestamp && incomingTs < lastAppliedTimestamp) {
        console.warn('⚠️ Données serveur plus anciennes que l\'état local — ignorées');
        api.log('⚠️ Données serveur plus anciennes que l\'état local — conservées localement en attente de résolution');
        return;
      }

      try {
        // Les anciens listeners Firebase pouvaient ne livrer qu’un sous-ensemble
        // du document. Compléter les branches absentes avec l’état courant évite
        // qu’un événement de journal ou de métadonnées ne soit interprété comme
        // un document vide, tout en faisant passer le résultat par la migration
        // commune avant application.
        const current = currentEnvelope();
        const migrated = migrateSnapshot({
          ...data,
          reserve: data.reserve ?? current.reserve,
          combat: data.combat ?? current.combat,
          diceLines: data.diceLines ?? current.diceLines
        }, { appVersion, contextId });
        applyDataToState(migrated.data);
        if (incomingTs) {
          lastAppliedTimestamp = incomingTs;
        }
        persistLocal();
        if (bus && bus.emit) {
          bus.emit('reserve');
          bus.emit('combat');
          bus.emit('log');
        }
        console.log('🔄 Sync Firebase → Local');
      } catch (e) {
        console.error('❌ Erreur sync Firebase → Local:', e);
      }
    });
  }

  // L'authentification Firebase est asynchrone : le handle de synchro n'existe pas
  // encore quand main.js construit le Store. Sans ce point d'attache, sync resterait
  // null pour toujours et l'application tournerait en localStorage seul, sans erreur
  // ni symptôme visible.
  api.attachSync = (handle) => {
    if (!handle || syncListenerStarted) return;
    sync = handle;
    if (persistence) {
      // E05 lit/réconcilie le serveur avant toute publication. Les mutations
      // locales arrivées avant cette étape restent dans l’outbox de transition
      // et sont converties ou écartées explicitement par sync-session.
      if (typeof handle.createSession !== 'function') {
        reportSyncStatus('connected');
        return;
      }
      const requestedContext = handle.contextId || contextId;
      // Authentication may switch directly from account A to account B. A
      // session is scoped to its context and cannot be reused for the other
      // account.
      if (syncSession && syncContextId === requestedContext) return;
      if (contextId === 'guest' && requestedContext.startsWith('account:')) {
        const candidate = currentEnvelope();
        const hasGuestData = candidate.reserve.length > 0 || candidate.combat.participants.length > 0
          || candidate.log.length > 0 || candidate.diceLines.length > 0;
        guestImportCandidate = hasGuestData ? JSON.parse(JSON.stringify(candidate)) : null;
      }
      const attachEpoch = ++syncAttachEpoch;
      lastRemoteRevision = -1;
      syncSessionStarting = true;
      const startSession = () => {
        if (attachEpoch !== syncAttachEpoch) return Promise.resolve(null);
        syncSession = handle.createSession({
          persistence,
          contextId: requestedContext,
          deviceId: `${requestedContext}:${CLIENT_ID}`,
          onStatus: status => reportSyncStatus(status),
          onConflict: conflict => {
            reportSyncStatus('conflict');
            if (bus && bus.emit) bus.emit('sync:conflict', conflict);
          },
          onRemoteState: (data, root = {}) => {
            const remoteData = cloneValue(data || {});
            const remoteRoot = cloneValue(root || {});
            const current = currentEnvelope();
            const remoteRevision = Number.isInteger(remoteRoot.revision) ? remoteRoot.revision : null;
            const remoteChanged = remoteRevision !== null
              ? remoteRevision > lastRemoteRevision
              : !sameSharedState(remoteData, current);
            if (!remoteChanged) return null;
            // Receiving our already persisted cloud snapshot after a reload is
            // an acknowledgement, not an external edit. Retain undo/redo and
            // the local revision; sync-session saves this with its cursor.
            if (sameSharedState(remoteData, current)) return {
              state: { ...current, syncPending: false },
              commit: () => {
                if (attachEpoch !== syncAttachEpoch) return;
                pendingProtocolState = false;
                if (remoteRevision !== null) lastRemoteRevision = Math.max(lastRemoteRevision, remoteRevision);
              }
            };
            // Build the complete next envelope before touching the live store.
            // sync-session persists this candidate together with its session and
            // invokes commit only after that transaction succeeds.
            const nextHistory = markExternalBoundary(historyState, {
              reason: 'remote-sync', revision: remoteRoot.revision ?? 0
            });
            const nextLocalRevision = localRevision + 1;
            const nextData = {
              ...current,
              ...remoteData,
              log: current.log,
              diceLines: remoteData.diceLines ?? current.diceLines,
              history: nextHistory,
              archives: current.archives,
              reminderChoices: current.reminderChoices,
              appliedResolutionIds: current.appliedResolutionIds,
              syncPending: false,
              localRevision: nextLocalRevision
            };
            return {
              state: nextData,
              commit: () => {
                if (attachEpoch !== syncAttachEpoch) return;
                if (remoteRevision !== null) lastRemoteRevision = Math.max(lastRemoteRevision, remoteRevision);
                historyState = nextHistory;
                localRevision = nextLocalRevision;
                applyDataToState(nextData);
                if (bus && bus.emit) {
                  bus.emit('reserve'); bus.emit('combat'); bus.emit('log');
                }
              }
            };
          }
        });
        syncContextId = requestedContext;
        return syncSession.open({ initialState: currentEnvelope() })
        .then(() => syncSession.reconcile({ localState: currentEnvelope() }))
        .then(result => {
            if (attachEpoch !== syncAttachEpoch) return result;
            syncSessionReady = result.status === 'synced' || result.status === 'pending';
            // Only offer the guest snapshot when reconciliation found an
            // empty remote root and there is no account-local work to publish.
            // Keep this decision from the initial read: flush() can retain
            // remoteAvailable=false after creating the first remote root.
            const guestImportEligible = result.status === 'pending'
              && result.remoteAvailable === false
              && !pendingProtocolState
              && (!Array.isArray(result.outbox) || result.outbox.length === 0);
            const readyState = currentEnvelope();
            const replay = pendingProtocolState && (result.status === 'pending' || result.status === 'synced')
              ? syncSession.enqueue({ state: readyState, localState: readyState })
                .then(() => syncSession.flush({ localState: currentEnvelope() }))
                .then(value => {
                  pendingProtocolState = false;
                  return persistence.saveAtomic({ state: currentEnvelope() }).then(() => value);
                })
              : result.status === 'pending'
                ? syncSession.flush({ localState: readyState })
                : Promise.resolve(result);
            return replay.then(async value => {
              // The old root is read only as a migration source. It is never
              // attached to the v2 session and cannot trigger a write before
              // the user explicitly imports it.
              if (typeof handle.legacyMigration === 'function' && requestedContext.startsWith('account:')) {
                try {
                  const legacy = await handle.legacyMigration();
                  if (legacy && value?.remoteAvailable === false) {
                    const migrated = migrateSnapshot(legacy, { appVersion, contextId: requestedContext });
                    const hasData = migrated.data.reserve.length > 0
                      || migrated.data.combat.participants.length > 0
                      || migrated.data.log.length > 0;
                    if (hasData) legacyImportCandidate = JSON.parse(JSON.stringify(migrated.data));
                  }
                } catch (error) {
                  console.warn('⚠️ Migration distante legacy indisponible:', error);
                }
              }
              if (guestImportCandidate && attachEpoch === syncAttachEpoch) {
                // A guest draft is only offered when the account has no v2
                // document and the read completed online. Never surface an
                // import action beside an already-synced account: importing
                // it replaces the account state with this older snapshot.
                if (guestImportEligible && bus?.emit) {
                  bus.emit('sync:guest-import-available', { snapshot: guestImportCandidate, contextId: requestedContext });
                }
                guestImportCandidate = null;
              }
              if (legacyImportCandidate && attachEpoch === syncAttachEpoch && bus?.emit) {
                bus.emit('sync:guest-import-available', {
                  snapshot: legacyImportCandidate,
                  contextId: requestedContext,
                  kind: 'legacy'
                });
                legacyImportCandidate = null;
              }
              return value;
            });
          });
      };
      const contextSwitch = requestedContext !== contextId && persistenceFactory
        ? api.switchContext(requestedContext)
        : Promise.resolve({ ok: true });
      contextSwitch.then(startSession).catch(error => {
        if (attachEpoch !== syncAttachEpoch) return;
        syncSessionReady = false;
        console.error('❌ Réconciliation Firebase → Local impossible:', error);
        reportSyncStatus('error');
      }).finally(() => {
        if (attachEpoch === syncAttachEpoch) syncSessionStarting = false;
      });
      return;
    }
    startSyncListener();
    // Instantané complet explicite : à la connexion, rien n'est marqué comme sale et il faut
    // pourtant pousser tout le travail fait avant l'authentification.
    save(true);
  };

  api.ready = readyPromise;

  startSyncListener();

  return api;
}
