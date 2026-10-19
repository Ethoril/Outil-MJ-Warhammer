import {withMomentum} from './v5-combat-rules.js';
import { acquiredV5Talents,currentV5TalentHashes } from './v5-talents.js';
import { sourceActive } from './v5-talent-actions.js';
import { v5ResourceIdentity } from './v5-resources.js';
import { validateV5ReactionInput, registerV5ReactionOpportunities } from './v5-reactions.js';
/** Bridge from the durable Store envelope to the pure V5 action transaction. */
import { previewV5ActionCosts, prepareV5ActionState, commitV5ActionCosts } from './v5-action-costs.js';
import { projectV5Resources, commitV5Resources } from './v5-resources.js';
import { effectiveOrder } from './turn-order.js';
import { defaultResolutionId, previewResolution } from './resolution.js';
import { FREE_REROLL_SOURCE, freeRerollLayers, consumeFreeReroll } from './v5-divine-effects-conditions.js';
const clone = structuredClone;
export function v5StoreActionClock(envelope) {
  const scene = envelope.activeScene;
  const encounterId = scene?.encounterId || scene?.id || envelope.extensions?.v5?.combatId;
  const round = envelope.combat?.round;
  const serial = scene?.extensions?.v5?.turnIndex ?? envelope.extensions?.v5?.turnIndex;
  const actorId = envelope.combat?.currentActorId;
  return {
    ...(envelope.extensions?.v5?.talentSessionId?{sessionId:envelope.extensions.v5.talentSessionId}:{}),
    ...(encounterId ? { encounterId } : {}),
    ...(Number.isSafeInteger(round) && round > 0 ? { round } : {}),
    ...(encounterId && actorId && Number.isSafeInteger(serial) && serial > 0 ? { turnId: `${scene?.id || encounterId}:${serial}:${actorId}` } : {})
  };
}
export function v5StoreActionState(envelope) {
  return { revision: envelope.localRevision || 0,
    ...(Number.isSafeInteger(envelope.combat?.round) && envelope.combat.round > 0 ? { round: envelope.combat.round } : {}),
    participants: projectV5Resources(envelope, envelope.combat?.participants || []),
    v5ActionLedger: clone(envelope.extensions?.v5?.actionLedger || { appliedActions: [], quotaUsage: [] }),
    appliedResolutionIds: [...(envelope.appliedResolutionIds || [])] };
}
function authorNextTurnEnd(envelope, actorId) {
  const combat = envelope.combat || {};
  const order = effectiveOrder(combat.participants || [], { mode: combat.orderMode, order: combat.order });
  const current = order.indexOf(combat.currentActorId), author = order.indexOf(actorId);
  const serial = envelope.activeScene?.extensions?.v5?.turnIndex ?? envelope.extensions?.v5?.turnIndex;
  if (current < 0 || author < 0 || !Number.isSafeInteger(serial) || serial < 1 || !Number.isSafeInteger(combat.round) || combat.round < 1) return undefined;
  const distance = (author - current + order.length) % order.length || order.length;
  return { phase: 'endOfTurn', actorId, round: combat.round + Math.floor((current + distance) / order.length), turn: serial + distance, moment: 'afterEffects' };
}
export function buildV5StoreActionInput(envelope, raw = {}) {
  const state = v5StoreActionState(envelope), clock = v5StoreActionClock(envelope);
  const reactionValidation = validateV5ReactionInput(envelope, raw, { clock });
  const supplied = reactionValidation.input;
  const actorId = supplied.actorId || supplied.actor?.id, targetId = supplied.targetId || supplied.target?.id;
  const resolutionId = supplied.resolutionId || supplied.id || defaultResolutionId({ id: actorId }, supplied.action || {}, targetId ? { id: targetId } : null, supplied.baseRevision ?? state.revision, Number(supplied.roll ?? supplied.dieRoll ?? supplied.enteredRoll)), v5 = supplied.v5 || {};
  if(['glorious-demise','reaction-strike'].includes(v5.context?.freeAttackTalent))v5.extraAttack=true;
  if(v5.context?.freeAttackTalent==='fast-shot')v5.extraAttack=false;
  if(v5.context?.talentAction==='stomp')v5.extraAttack=true;
  const costs = [...(v5.costs || [])];
  if (v5.extraAttack === true && !costs.some(cost => cost.resource === 'momentum')) costs.push({ id: 'system:extra-attack-momentum', resource: 'momentum', amount: 1 });
  const quotas=[...(v5.quotas||[])],exemptions=[...(v5.exemptions||[])],actor=state.participants.find(p=>p.id===actorId),context=v5.context||{};
  let quotaActorId;
  const selected=context.preRollTalent;
  if(selected&&selected!=='none'){
    const acquired=acquiredV5Talents(actor).find(t=>t.talentId==='talent-'+selected&&(selected!=='resistant'||t.specialization===context.threatId));
    if(!['resistant','strong-minded'].includes(selected)||!acquired||!currentV5TalentHashes()['talent-'+selected]?.startsWith('sha256:'))throw new TypeError('Talent de séance ou spécialité non disponible.');
    quotas.push({id:'talent:'+selected+(selected==='resistant'?':'+encodeURIComponent(acquired.specialization):''),scope:'session',maximum:1});quotaActorId=v5ResourceIdentity(envelope,actor)||'instance:'+actorId;
  }
  if(v5.extraAttack&&context.freeAttackTalent==='frenzy'){
    if(!(actor.states||[]).some(s=>s.key==='frenzy'&&sourceActive(s)))throw new TypeError('Attaque gratuite de Frénésie non disponible.');
    quotas.push({id:'talent:frenzy-extra-attack',scope:'round',maximum:1});for(const cost of costs.filter(c=>c.resource==='momentum'))exemptions.push({costId:cost.id,sourceId:'talent-frenzy'});
  }
  const secondaryTalentRequests=[];
  const defender=state.participants.find(p=>p.id===targetId),defenderContext=supplied.defense?.v5?.context||{},defenderSelected=defenderContext.preRollTalent;
  if(defenderSelected&&defenderSelected!=='none'){
    const acquired=acquiredV5Talents(defender).find(t=>t.talentId==='talent-'+defenderSelected&&(defenderSelected!=='resistant'||t.specialization===defenderContext.threatId));
    if(!['resistant','strong-minded'].includes(defenderSelected)||!acquired)throw new TypeError('Talent de séance en défense indisponible.');
    secondaryTalentRequests.push({actorId:targetId,actionId:resolutionId+':session:defender',costs:[],quotas:[{id:'talent:'+defenderSelected+(defenderSelected==='resistant'?':'+encodeURIComponent(acquired.specialization):''),scope:'session',maximum:1}],exemptions:[],quotaActorId:v5ResourceIdentity(envelope,defender)||'instance:'+targetId,clock});
  }
  if(context.talentAction==='drilled')costs.push({id:'talent:drilled:momentum',resource:'momentum',amount:1});
  if(context.talentAction==='martial-arts')quotas.push({id:'talent:martial-arts-choice',scope:'turn',maximum:1});
  if(v5.extraAttack&&context.freeAttackTalent==='dual-wielder'){
    if(!acquiredV5Talents(actor).some(t=>t.talentId==='talent-dual-wielder')||!currentV5TalentHashes()['talent-dual-wielder']?.startsWith('sha256:')||context.dualWielding!==true||context.secondWeaponAttack!==true||v5.kind!=='melee')throw new TypeError('Maniement de deux armes : seconde arme en mêlée requise.');
    quotas.push({id:'talent:dual-wielder-second-weapon',scope:'turn',maximum:1});for(const cost of costs.filter(c=>c.resource==='momentum'))exemptions.push({costId:cost.id,sourceId:'talent-dual-wielder'});
  }
  if(context.talentAction==='shield-ally'){costs.push({id:'talent:shieldsman:momentum',resource:'momentum',amount:1});quotas.push({id:'talent:shieldsman',scope:'round',maximum:1});}
  if(context.talentAction==='overcome-fear'){const active=(actor.states||[]).find(s=>s.key==='fear-of-talent'&&s.id===context.fearEffectId&&sourceActive(s));if(active)quotas.push({id:'talent:frightening:control',scope:active.mode==='sl'?'round':'turn',maximum:1});}
  if(context.talentAction==='overcome-terror')quotas.push({id:'talent:small-terror:'+encodeURIComponent(context.terrorEffectId||''),scope:'encounter',maximum:1});
  if(context.talentAction==='hatred')quotas.push({id:'talent:hatred:'+encodeURIComponent(context.psychologySpecialty||''),scope:context.hatredRetry===true?'round':'encounter',maximum:1});
  if(context.talentAction==='vice'&&context.viceRetry===true)quotas.push({id:'talent:vice-retry:'+encodeURIComponent(context.psychologySpecialty||''),scope:'round',maximum:1});
  if(context.talentAction==='end-contact')costs.push({id:'talent:contact:momentum',resource:'momentum',amount:1});
  if(['reaction-strike','glorious-demise'].includes(context.freeAttackTalent)){const id=context.freeAttackTalent;quotas.push({id:'talent:'+id+(id==='glorious-demise'?':'+context.triggerConditionId:''),scope:id==='reaction-strike'?'round':'encounter',maximum:1});for(const cost of costs.filter(c=>c.resource==='momentum'))exemptions.push({costId:cost.id,sourceId:'talent-'+id});if(id==='glorious-demise'&&(actor.states||[]).find(s=>s.id===context.triggerConditionId)?.key==='sonne')costs.push({id:'talent:glorious:fortune',resource:'fortune',amount:1});}
  if(context.freeAttackTalent==='fast-shot')quotas.push({id:'talent:fast-shot',scope:'round',maximum:1});
  if(context.specialAttack==='whirlwind-of-death')costs.push({id:'talent:whirlwind:fortune',resource:'fortune',amount:1});
  const fortuneReroll = Boolean(context.fortuneReroll || v5.fortuneReroll || supplied.fortuneReroll);
  const rawReroll = context.fortuneRerollRoll ?? v5.fortuneRerollRoll ?? supplied.fortuneRerollRoll;
  const hasValidReroll = rawReroll !== null && rawReroll !== undefined && rawReroll !== '' && Number.isInteger(Number(rawReroll)) && Number(rawReroll) >= 1 && Number(rawReroll) <= 100;
  let initialRollBeforeFortune = null, freeReroll = false;
  if (fortuneReroll) {
    if (!costs.some(c => c.id === 'system:fortune-reroll')) {
      costs.push({ id: 'system:fortune-reroll', resource: 'fortune', amount: 1 });
      // Bénédiction de Chance : relance gratuite du prochain Test échoué (le Test d'origine est évalué avant d'y substituer la relance).
      // Jet d'origine absent ou invalide : impossible de savoir s'il est raté, la relance reste payante (pas d'erreur levée).
      const initialRoll = Number(supplied.roll ?? supplied.dieRoll ?? supplied.enteredRoll);
      if (freeRerollLayers(actor).length && Number.isInteger(initialRoll) && initialRoll >= 1 && initialRoll <= 100) {
        const { fortuneReroll: _context, fortuneRerollRoll: _contextRoll, ...plainContext } = context;
        const { fortuneReroll: _supplied, fortuneRerollRoll: _suppliedRoll, ...plainSupplied } = supplied;
        const original = previewResolution({ ...plainSupplied, resolutionId, actorId, targetId,
          actor: supplied.actor?.id === actorId ? supplied.actor : actor, target: state.participants.find(p => p.id === targetId) || supplied.target || null,
          round: state.round ?? supplied.round, baseRevision: supplied.baseRevision ?? state.revision, v5State: state, v5Clock: clock,
          v5: { ...v5, context: plainContext, fortuneReroll: undefined, fortuneRerollRoll: undefined } });
        if (original.success === false) { freeReroll = true; exemptions.push({ costId: 'system:fortune-reroll', sourceId: FREE_REROLL_SOURCE }); }
      }
    }
    initialRollBeforeFortune = Number(supplied.roll ?? supplied.dieRoll ?? supplied.enteredRoll);
    if (hasValidReroll) {
      const nextRoll = Number(rawReroll);
      supplied.roll = nextRoll;
      if (supplied.dieRoll !== undefined) supplied.dieRoll = nextRoll;
      if (supplied.enteredRoll !== undefined) supplied.enteredRoll = nextRoll;
    }
  }
  const hasRequest = costs.length || quotas.length || exemptions.length || v5.extraAttack;
  let actionCostPlan = null, paid = state;
  if (hasRequest) {
    actionCostPlan = previewV5ActionCosts({ state, actionId: resolutionId, actorId, costs, quotas, exemptions,...(quotaActorId?{quotaActorId}:{} ), extraAttack: v5.extraAttack === true, clock });
    const prepared = prepareV5ActionState(actionCostPlan, state);
    if (prepared.status === 'prepared') paid = prepared.state;
  }
  return { ...supplied, resolutionId, actorId, targetId,
    actor: paid.participants.find(item => item.id === actorId) || supplied.actor,
    target: paid.participants.find(item => item.id === targetId) || supplied.target || null,
    round: state.round ?? supplied.round, baseRevision: supplied.baseRevision ?? state.revision,
    v5State: paid, v5Clock: clock, authorNextTurnEnd: authorNextTurnEnd(envelope, actorId), actionCostPlan, secondaryTalentRequests, reactionValidation,
    fortuneReroll, fortuneRerollRoll: hasValidReroll ? Number(rawReroll) : null, initialRollBeforeFortune, freeReroll };
}
export function annotateV5StoreActionPreview(preview, input) {
  if (input.reactionValidation?.ready === false) preview = { ...preview, unresolved: [...(preview.unresolved || []), input.reactionValidation.reason] };
  if (input.fortuneReroll) {
    if (input.fortuneRerollRoll === null) {
      preview = { ...preview, unresolved: [...(preview.unresolved || []), 'Relance de Fortune : saisir le nouveau jet d100 (1 à 100).'] };
    }
    preview = { ...preview, fortuneReroll: { active: true, used: Boolean(input.fortuneRerollRoll !== null), initialRoll: input.initialRollBeforeFortune, rerollRoll: input.fortuneRerollRoll,
      ...(input.freeReroll ? { free: true, reminder: 'Bénédiction de Chance : relance gratuite' } : {}) } };
  }
  if(input.secondaryTalentRequests?.length){
    const plans=input.secondaryTalentRequests.map(request=>previewV5ActionCosts({...request,state:input.v5State}));
    preview={...preview,talentUsageRequests:[...(preview.talentUsageRequests||[]),...input.secondaryTalentRequests],unresolved:[...(preview.unresolved||[]),...plans.flatMap(p=>p.unresolved.map(u=>'Défense : '+u.reason))]};
  }
  const postRequests=[];for(const[subject,settings,replaced]of[[input.actor,input.v5,preview.damageReplacedByTalent],[input.target,input.defense?.v5,preview.defenderDamageReplacedByTalent]]){const c=settings?.context||{};if(!subject||!replaced)continue;const shield=c.specialAttack==='shieldsman',catching=c.specialAttack==='disarm'&&c.catchWeapon===true;if(!shield&&!catching)continue;const request={phase:'after-result',actorId:subject.id,actionId:preview.resolutionId+':post:'+subject.id,costs:[{id:shield?'talent:shieldsman:momentum':'talent:disarm:catch',resource:'momentum',amount:1}],quotas:shield?[{id:'talent:shieldsman',scope:'round',maximum:1}]:[],exemptions:[],clock:input.v5Clock};const state=clone(input.v5State);state.participants=state.participants.map(p=>p.id===subject.id?withMomentum(p,preview.momentum.find(m=>m.participantId===p.id)?.after??p.extensions?.v5?.hasMomentum===true):p);const plan=previewV5ActionCosts({...request,state});postRequests.push(request);preview={...preview,postActionCosts:[...(preview.postActionCosts||[]),plan],unresolved:[...(preview.unresolved||[]),...plan.unresolved.map(u=>u.reason)]};}
  if(postRequests.length)preview={...preview,talentUsageRequests:[...(preview.talentUsageRequests||[]),...postRequests]};
  if (!input.actionCostPlan) return preview;
  const decisions = clone(preview.decisions || {});
  const label = resource => ({ momentum: 'Élan', fortune: 'Fortune' }[resource] || resource);
  const summaries = [...input.actionCostPlan.paid.map(cost => label(cost.resource) + ' : ' + cost.amount + ' (payé avant le jet)'), ...input.actionCostPlan.waived.map(cost => label(cost.resource) + ' : exempté')];
  for (const decision of Object.values(decisions)) for (const option of decision.options || []) option.summary.costs = [...summaries];
  return { ...preview, decisions, actionCostPlan: clone(input.actionCostPlan),
    unresolved: [...(preview.unresolved || []), ...input.actionCostPlan.unresolved.map(item => item.reason), ...(input.actionCostPlan.duplicate ? ['Action déjà confirmée.'] : [])],
    actionCosts: { paid: clone(input.actionCostPlan.paid), waived: clone(input.actionCostPlan.waived), usages: clone(input.actionCostPlan.usages), ready: input.actionCostPlan.ready } };
}
export function commitV5StoreTalentUsages(preview, result, initial) {
  if (result.status !== 'applied') return result;
  let usageState = clone(initial);
  const receipts = [];
  for (const request of preview.talentUsageRequests || []) {
    const costState=request.phase==='after-result'?{...clone(result.state),revision:initial.revision,v5ActionLedger:usageState.v5ActionLedger}:usageState;
    const plan = previewV5ActionCosts({ ...request, state: costState });
    const committed = commitV5ActionCosts(plan, costState, { resolveAction: state => ({ status: 'applied', state }) });
    if (committed.status !== 'applied') return { status: committed.status === 'stale' ? 'stale' : 'manual', reason: committed.unresolved?.[0]?.reason || 'Usage de talent indisponible', state: initial };
    usageState = { ...committed.state, revision: initial.revision };
    if(request.phase==='after-result')result={...result,state:{...committed.state,revision:result.state.revision}};
    receipts.push(committed.receipt);
  }
  return { ...result, state: { ...result.state, v5ActionLedger: usageState.v5ActionLedger }, talentUsageReceipts: receipts };
}
export function applyV5StoreAction(preview, envelope, resolveAction) {
  const current = v5StoreActionState(envelope);
  if (current.appliedResolutionIds.includes(preview.resolutionId) || current.v5ActionLedger.appliedActions.some(row => row.actionId === preview.resolutionId)) return { status: 'duplicate', state: current, resolution: clone(preview) };
  const reaction = validateV5ReactionInput(envelope, preview.input, { clock: v5StoreActionClock(envelope) });
  if (!reaction.ready) return { status: current.revision !== preview.baseRevision ? 'stale' : 'manual', reason: reaction.reason, state: current };
  if (reaction.opportunity) {
    const request = preview.actionCostPlan?.request;
    if (!request || !request.extraAttack || request.actorId !== reaction.opportunity.actorId || ['costs', 'quotas', 'exemptions'].some(field => JSON.stringify(request[field]) !== JSON.stringify(reaction.opportunity[field]))) return { status: 'manual', reason: 'Le coût et le quota doivent correspondre à la réaction proposée.', state: current };
  }
  // Relance gratuite : exemption vérifiée contre l'état courant, couche consommée dans la même commande que la résolution.
  const free = preview.actionCostPlan?.request?.exemptions?.some(row => row.sourceId === FREE_REROLL_SOURCE);
  if (free && !freeRerollLayers(current.participants.find(p => p.id === preview.actionCostPlan.request.actorId)).length) return { status: 'manual', reason: 'Bénédiction de Chance : plus de relance gratuite disponible.', state: current };
  const resolve = state => {
    const result = commitV5StoreTalentUsages(preview, resolveAction(state), state);
    if (free && result.status === 'applied') {
      const actorId = preview.actionCostPlan.request.actorId, participants = clone(result.state.participants), actor = participants.find(p => p.id === actorId);
      consumeFreeReroll(actor);
      return { ...result, state: { ...result.state, participants } };
    }
    return result;
  };
  if (!preview.actionCostPlan) return resolve(current);
  const committed = commitV5ActionCosts(preview.actionCostPlan, current, { resolveAction: resolve });
  if (committed.status !== 'applied') {
    if (committed.status === 'blocked' && committed.result) return committed.result;
    return { ...committed, status: committed.status === 'blocked' ? 'manual' : committed.status, reason: committed.unresolved?.[0]?.reason || 'Coût ou quota indisponible' };
  }
  return { ...committed.result, state: committed.state, actionCostReceipt: committed.receipt };
}
export function v5StoreActionResult(envelope, result) {
  const next = { ...envelope, combat: { ...envelope.combat, participants: result.state.participants },
    appliedResolutionIds: result.state.appliedResolutionIds,
    extensions: { ...(envelope.extensions || {}), v5: { ...(envelope.extensions?.v5 || {}), actionLedger: clone(result.state.v5ActionLedger || { appliedActions: [], quotaUsage: [] }) } } };
  if(result.resolution?.talentActionChanges?.some(c=>c.patch?.initiative!=null)&&next.combat.orderMode!=='manual')next.combat.order=effectiveOrder(next.combat.participants,{mode:'initiative'});
  const resources = commitV5Resources(next, result.state.participants);
  return registerV5ReactionOpportunities(resources, result.resolution, { clock: v5StoreActionClock(envelope) });
}