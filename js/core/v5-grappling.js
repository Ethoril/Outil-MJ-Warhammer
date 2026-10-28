import { acquireV5Conditions, recoverV5Condition } from './v5-effects.js';
import { strengthBonusOf } from './damage.js';
import { getLocationName, getReverseRoll } from './dice.js';

export const V5_GRAPPLING_RULE_VERSION = 'v5-grappling-2026-10-27.1';
export const GRAPPLING_ACTIONS = Object.freeze(['damage', 'immobilize', 'escape']);

const clone = value => structuredClone(value);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validRoll = roll => Number.isInteger(roll) && roll >= 1 && roll <= 100;
const validRound = round => Number.isSafeInteger(round) && round >= 0;
const totalEntangled = participant => (participant?.states || [])
  .filter(state => ['enchevetre', 'entangled'].includes(String(state.key || state.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()))
  .reduce((sum, state) => sum + Math.max(0, Number(state.level) || 1), 0);
const activeGrapples = participant => (participant?.extensions?.v5?.grapples || []).filter(row => row.status === 'active');

function blocked(unresolved) {
  return { ruleVersion: V5_GRAPPLING_RULE_VERSION, status: 'blocked', ready: false, unresolved };
}

function normalizeTest(test, role) {
  if (!isRecord(test) || !Number.isFinite(test.sl)) return `${role} : résultat du Test de Force opposé requis.`;
  if (role === 'l’acteur' && !validRoll(test.roll)) return 'Localisation : résultat d100 du Test de Force requis.';
  return null;
}

/**
 * Prepare an announced grapple from a completed melee resolution. The caller
 * remains responsible for verifying that the action was an unarmed Brawling
 * attack; `eligibleBrawling` must come from the canonical action/skill data.
 * A defender win consumes the declared attack but creates no grapple.
 */
export function previewGrappleInitiation({
  actor, target, declared = false, eligibleBrawling = false, attack,
  resolutionId, round
} = {}) {
  if (declared !== true) return { ruleVersion: V5_GRAPPLING_RULE_VERSION, handled: false };
  const unresolved = [];
  if (!actor?.id || !target?.id || actor.id === target.id) unresolved.push('Choisir deux participants distincts pour l’empoignade.');
  if (eligibleBrawling !== true) unresolved.push('L’empoignade exige une attaque sans arme de Corps à corps (Bagarre).');
  if (typeof resolutionId !== 'string' || !resolutionId.trim()) unresolved.push('Identifiant de résolution requis pour l’empoignade.');
  if (round !== undefined && !validRound(round)) unresolved.push('Round d’empoignade invalide.');
  if (!isRecord(attack) || attack.opposition?.mode !== 'opposed'
      || !['attacker', 'defender'].includes(attack.opposition?.winner)) {
    unresolved.push('Résultat du Test opposé d’attaque requis pour l’empoignade.');
  }
  if (attack?.unresolved?.length) unresolved.push(...attack.unresolved);
  if (unresolved.length) return { handled: true, ...blocked([...new Set(unresolved)]) };

  const won = attack.opposition.winner === 'attacker' && attack.hit === true;
  const link = won ? {
    id: `grapple:${resolutionId}`,
    resolutionId,
    initiatorId: actor.id,
    targetId: target.id,
    ...(round !== undefined ? { createdRound: round } : {}),
    status: 'active',
    ruleVersion: V5_GRAPPLING_RULE_VERSION
  } : null;
  return {
    ruleVersion: V5_GRAPPLING_RULE_VERSION,
    handled: true,
    ready: true,
    resolutionId,
    status: won ? 'grappled' : 'opposition-lost',
    won,
    link,
    suppressOrdinaryDamage: won,
    targetCondition: won ? { name: 'Enchevêtré', level: 1, source: { kind: 'grapple', linkId: link.id } } : null,
    unresolved: []
  };
}

/** Apply only the target-side Enchevêtré occurrence for a successful entry. */
export function applyGrappleInitiation(plan, target) {
  if (!plan?.ready || !plan.won || !plan.link || !plan.targetCondition || target?.id !== plan.link.targetId) {
    return { status: 'unchanged', participant: target, link: plan?.link || null };
  }
  const receipt = acquireV5Conditions(target, [plan.targetCondition], {
    resolutionId: plan.resolutionId,
    targetId: target.id,
    ...(plan.link.createdRound !== undefined ? { round: plan.link.createdRound } : {})
  });
  const sourceStates = receipt.participant.states.filter(state => state.source?.linkId === plan.link.id);
  const sourceState = sourceStates.find(state => state.source?.resolutionId === plan.resolutionId);
  if (sourceState && target.states?.some(state => state.id === sourceState.id)) {
    return { status: 'duplicate', participant: target, link: { ...plan.link, targetConditionIds: sourceStates.map(state => state.id) } };
  }
  const link = { ...plan.link, targetConditionIds: sourceStates.map(state => state.id), appliedActionIds: [plan.resolutionId] };
  return { status: 'applied', participant: receipt.participant, link, conditionReceipt: receipt };
}

function opposingParticipant(link, actor) {
  if (actor.id === link.initiatorId) return link.targetId;
  if (actor.id === link.targetId) return link.initiatorId;
  return null;
}

/** Gate an actor's first Action of the Turn while they are held in an active grapple. */
export function previewGrappleTurnActionGate({actor,action,skillName,alreadySpentAction=false}={}) {
  const links=activeGrapples(actor);
  if(!links.length)return{required:false,allowed:true,unresolved:[]};
  const unresolved=[];
  if(alreadySpentAction)unresolved.push('Empoignade : le Test de Force doit être la première Action du Tour, avant toute autre Action.');
  if(!GRAPPLING_ACTIONS.includes(action))unresolved.push('Empoignade : déclarer blesser, immobiliser ou se dégager comme première Action du Tour.');
  const normalizedSkill=String(skillName||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(!/(^|\b)(force|strength)(\b|$)/.test(normalizedSkill))unresolved.push('Empoignade : la première Action du Tour exige un Test opposé de Force.');
  return{required:true,allowed:unresolved.length===0,linkIds:links.map(row=>row.id),unresolved};
}

/** Resolve a participant's declared Action during an active grapple. */
export function previewGrappleAction({
  actor, target, link, action, actorTest, opponentTest, resolutionId, round, actorIsInitiator = link?.initiatorId === actor?.id
} = {}) {
  const unresolved = [];
  if (!isRecord(link) || link.status !== 'active' || !link.id) unresolved.push('Empoignade active requise.');
  if (!actor?.id || !target?.id || actor.id === target.id) unresolved.push('Choisir les deux participants de l’empoignade.');
  if (link && actor?.id && opposingParticipant(link, actor) !== target?.id) unresolved.push('La cible ne correspond pas à l’autre participant de cette empoignade.');
  if (!GRAPPLING_ACTIONS.includes(action)) unresolved.push('Choisir blesser, immobiliser ou se dégager.');
  if (typeof resolutionId !== 'string' || !resolutionId.trim()) unresolved.push('Identifiant de résolution requis pour l’Action d’empoignade.');
  if (round !== undefined && !validRound(round)) unresolved.push('Round d’empoignade invalide.');
  const actorTestError = normalizeTest(actorTest, 'l’acteur');
  const opponentTestError = normalizeTest(opponentTest, 'l’adversaire');
  if (actorTestError) unresolved.push(actorTestError);
  if (opponentTestError) unresolved.push(opponentTestError);
  if (unresolved.length) return blocked([...new Set(unresolved)]);

  const netSL = actorTest.sl - opponentTest.sl;
  const won = netSL >= 0;
  const base = {
    ruleVersion: V5_GRAPPLING_RULE_VERSION,
    status: won ? 'ready' : 'opposition-lost',
    ready: true,
    resolutionId,
    round,
    linkId: link.id,
    actorId: actor.id,
    targetId: target.id,
    action,
    won,
    netSL,
    actorTest: clone(actorTest),
    opponentTest: clone(opponentTest),
    effects: [],
    unresolved: []
  };
  if (!won) return base;

  if (action === 'damage') {
    const strengthBonus = strengthBonusOf(actor.caracs);
    if (strengthBonus === null) return blocked(['Bonus de Force de l’acteur requis pour blesser en empoignade.']);
    const rawEndurance=target.caracs?.E,rawToughnessBonus=target.caracs?.BE;
    const endurance=rawEndurance===null||rawEndurance===undefined||rawEndurance===''?null:Number(rawEndurance);
    const explicitToughness=rawToughnessBonus===null||rawToughnessBonus===undefined||rawToughnessBonus===''?null:Number(rawToughnessBonus);
    const toughnessBonus=endurance!==null&&Number.isFinite(endurance)&&endurance>=0?Math.floor(endurance/10):Number.isSafeInteger(explicitToughness)&&explicitToughness>=0?explicitToughness:null;
    if(toughnessBonus===null)return blocked(['Bonus d’Endurance de la cible requis pour blesser en empoignade.']);
    const locationRoll = getReverseRoll(actorTest.roll);
    const location = getLocationName(locationRoll);
    base.effects.push({
      type: 'damage', targetId: target.id,
      amount: Math.max(0, strengthBonus + netSL - toughnessBonus),
      armourApplied: false,
      strengthBonus,
      toughnessBonus,
      netSL,
      location: { roll: locationRoll, ...location }
    });
  } else if (action === 'immobilize') {
    base.effects.push({
      type: 'acquire-condition', targetId: target.id,
      condition: { name: 'Enchevêtré', level: 1 + Math.max(0, netSL - 1), source: { kind: 'grapple', linkId: link.id } }
    });
  } else {
    const actorCandidates = (actor.states || []).filter(state => state.source?.linkId === link.id
      && ['enchevetre', 'entangled'].includes(String(state.key || state.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()));
    const targetCandidates = actorIsInitiator ? (target.states || []).filter(state => state.source?.linkId === link.id
      && ['enchevetre', 'entangled'].includes(String(state.key || state.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())) : [];
    const candidates = [...actorCandidates.map(state=>({state,participantId:actor.id})),...targetCandidates.map(state=>({state,participantId:target.id}))];
    if (!candidates.length) return blocked(['Aucun Enchevêtré de cette empoignade à retirer.']);
    const levelsToRemove = actorIsInitiator
      ? candidates.reduce((sum,row)=>sum+Math.max(1,Number(row.state.level)||1),0)
      : Math.min(totalEntangled({ states: actorCandidates }), 1 + Math.max(0, netSL - 1));
    let remaining=levelsToRemove;
    for(const {state,participantId} of candidates){
      if(remaining<=0)break;
      const amount=Math.min(Math.max(1,Number(state.level)||1),remaining);
      base.effects.push({type:'recover-condition',targetId:participantId,conditionId:state.id,amount});
      remaining-=amount;
    }
    base.endLink = actorIsInitiator || totalEntangled({ states: actorCandidates }) <= levelsToRemove;
  }
  return base;
}

/** Apply an already reviewed winning action; an opposing win is a no-op. */
export function applyGrappleAction(plan, { actor, target, link } = {}) {
  if (!plan?.ready || !link || link.id !== plan.linkId || link.status !== 'active') {
    return { status: 'unchanged', actor, target, link, receipt: plan || null };
  }
  if (actor?.id !== plan.actorId || target?.id !== plan.targetId) return { status: 'stale', actor, target, link, receipt: plan };
  if (link.appliedActionIds?.includes(plan.resolutionId)) return { status: 'duplicate', actor, target, link, receipt: plan };
  const appliedLink = { ...link, appliedActionIds: [...new Set([...(link.appliedActionIds || []), plan.resolutionId])] };
  if (!plan.won) return { status: 'applied', actor, target, link: appliedLink, receipt: plan };
  const effect = plan.effects?.[0];
  if (!effect) return { status: 'unchanged', actor, target, link, receipt: plan };
  if (effect.type === 'damage') {
    return { status: 'applied', actor, target, link: appliedLink, damage: clone(effect), receipt: plan };
  }
  if (effect.type === 'acquire-condition') {
    if (target?.id !== effect.targetId) return { status: 'stale', actor, target, link, receipt: plan };
    const alreadyApplied = target.states?.find(row => row.source?.linkId === link.id && row.source?.resolutionId === plan.resolutionId);
    if (alreadyApplied) return { status: 'duplicate', actor, target, link, receipt: plan };
    const receipt = acquireV5Conditions(target, [effect.condition], {
      resolutionId: plan.resolutionId,
      targetId: target.id,
      ...(plan.round !== undefined ? { round: plan.round } : {})
    });
    const state = receipt.participant.states.find(row => row.source?.linkId === link.id && row.source?.resolutionId === plan.resolutionId);
    const targetConditionIds = [...new Set([...(appliedLink.targetConditionIds || []), ...(state ? [state.id] : [])])];
    return { status: 'applied', actor, target: receipt.participant, link: { ...appliedLink, targetConditionIds }, conditionReceipt: receipt, receipt: plan };
  }
  if (effect.type === 'recover-condition') {
    let updatedActor=actor,updatedTarget=target;const receipts=[];
    for(const recovery of plan.effects.filter(row=>row.type==='recover-condition')){
      const isActor=recovery.targetId===actor?.id,isTarget=recovery.targetId===target?.id;
      if(!isActor&&!isTarget)return { status: 'stale', actor, target, link, receipt: plan };
      const current=isActor?updatedActor:updatedTarget;
      const receipt=recoverV5Condition(current,recovery.conditionId,{method:'opposed-strength',amount:recovery.amount,test:{success:true,sl:recovery.amount}});
      if(!receipt.ready)return{status:'blocked',actor,target,link,conditionReceipt:receipt,receipt:plan};
      if(isActor)updatedActor=receipt.participant;else updatedTarget=receipt.participant;
      receipts.push(receipt);
    }
    const nextLink = plan.endLink ? { ...appliedLink, status: 'released', releasedAtResolutionId: plan.resolutionId } : appliedLink;
    return { status: 'applied', actor: updatedActor, target: updatedTarget, link: nextLink, conditionReceipts: receipts, receipt: plan };
  }
  return { status: 'unchanged', actor, target, link, receipt: plan };
}
