/** Explicit acquired identities and pinned public source text; never parse names or rules at runtime. */
import { V5_TALENT_REGISTRY as registry, acquiredV5Talents, currentV5TalentHashes } from './v5-talent-registry.js';
export { V5_TALENT_CONTRACTS, V5_TALENT_APPROVED_OVERRIDES, acquiredV5Talents, hasV5Talent, talentSourceHashes, currentV5TalentHashes } from './v5-talent-registry.js';
const quotaClock = clock => {
  const filtered = {};
  if (clock && typeof clock === 'object' && !Array.isArray(clock)) {
    for (const key of ['encounterId', 'round', 'turnId', 'sessionId'])
      if (Object.hasOwn(clock, key)) filtered[key] = clock[key];
  }
  return filtered;
};
import { evaluateTalentContractsV2, reduceV5ConditionProposals } from './talent-contract-v2.js';

export const V5_TALENT_IDS = Object.freeze({
  accurateShot: 'talent-accurate-shot', mightyBlow: 'talent-strike-mighty-blow',
  ironJaw: 'talent-iron-jaw', beatBlade: 'talent-beat-blade', furiousAssault: 'talent-furious-assault'
});
/** Évaluation des talents d'un participant contre un registre donné (celui de l'application, ou un registre de test, U8 L7). */
export function evaluateV5TalentsIn(talentRegistry, sourceHashes, participant, { event, role, context, choices = {}, state, clock = {}, actionId, includeTalents, excludeTalents = [] } = {}) {
  // The combat clock also carries UI/lifecycle fields (for example turnIndex).
  // Talent action-cost contracts consume only the canonical quota clock.
  const actionClock = quotaClock(clock);
  return evaluateTalentContractsV2({ contracts: talentRegistry.contracts, acquisitions: acquiredV5Talents(participant).filter(row => (!includeTalents || includeTalents.includes(row.talentId)) && !excludeTalents.includes(row.talentId)),
    sourceHashes, event, role, context, choices, state, clock: actionClock, actionId, actorId: participant?.id });
}
export function evaluateV5Talents(participant, options = {}) { return evaluateV5TalentsIn(registry, currentV5TalentHashes(), participant, options); }
const CONDITION_IGNORE_TALENT_IDS = Object.freeze(registry.contracts
  .filter(contract => (contract.clauses || []).some(clause => (clause.effects || []).some(effect => effect.op === 'ignoreConditionPenalty')))
  .map(contract => contract.talentId));
/**
 * Propositions `ignoreConditionPenalty` des talents acquis (Infatigable…) pour un Test hors combat (magie, contexte de Test) :
 * la même lecture que `previewV5TalentTestModifiers(...).ignoredPenalties` au combat (MJ 06/11 Q19), pour `conditionPenaltyEffects`.
 */
export function conditionPenaltyIgnores(participant, { role = 'actor', context = {} } = {}) {
  if (!CONDITION_IGNORE_TALENT_IDS.length) return [];
  return evaluateV5Talents(participant, { event: 'test.beforeRoll', role, context, includeTalents: CONDITION_IGNORE_TALENT_IDS })
    .proposals.filter(row => row.op === 'ignoreConditionPenalty');
}
/** One shared reduction for attack, defense and direct acquisition Store commands. */
export function previewV5TalentConditions(participant, states, { state, clock = {}, actionId } = {}) {
  const keys=[...new Set(states.map(row=>row.key))];
  const plans=keys.map(key=>evaluateV5Talents(participant,{event:'condition.beforeAcquire',role:'defender',context:{condition:{id:key,instances:states.filter(row=>row.key===key).reduce((sum,row)=>sum+row.level,0)}},state,clock,actionId:actionId+':'+key}));
  const plan={ready:plans.every(row=>row.ready),proposals:plans.flatMap(row=>row.proposals),unresolved:plans.flatMap(row=>row.unresolved),trace:plans.flatMap(row=>row.trace),quotas:plans.flatMap(row=>row.quotas),costs:plans.flatMap(row=>row.costs),exemptions:plans.flatMap(row=>row.exemptions)};
  return {plan,states:reduceV5ConditionProposals(states,plan.proposals.filter(row=>row.op==='reduceConditionAcquisition')),usageRequests:plan.quotas.length||plan.costs.length?[{actorId:participant.id,actionId,clock:quotaClock(clock),costs:plan.costs,quotas:plan.quotas,exemptions:plan.exemptions}]:[]};
}
export function activeV5TalentEffects(participant) {
  return (participant?.states || []).filter(row => row.kind === 'talent-active'
    && row.v5Timing?.targetId === participant.id && row.v5Timing?.expiry);
}

/** Evaluate the follow-up after the applied result, so any gained/lost Momentum is already final. */
export function previewV5ReactionOpportunities(resolution, state, clock = {}) {
  const actor = (Array.isArray(state.participants) ? state.participants : Object.values(state.participants || {}))
    .find(row => row.id === resolution.input.actor?.id);
  if (!actor || !resolution.attack || resolution.test?.kind !== 'melee' || !resolution.hit)
    return { ready: true, proposals: [], trace: [], unresolved: [] };
  const plan = evaluateV5Talents(actor, { event: 'action.afterAttack', role: 'attacker',
    context: { kind: 'melee', attack: { hit: true } }, state, clock,
    actionId: resolution.resolutionId + ':reaction:' + actor.id, includeTalents: [V5_TALENT_IDS.furiousAssault] });
  return { ready: plan.ready, proposals: plan.ready ? plan.proposals.filter(row => row.op === 'grantExtraAttack').map(row => ({
    ...row.origins[0], costs: plan.costs, quotas: plan.quotas, exemptions: plan.exemptions })) : [],
    trace: plan.trace, unresolved: plan.unresolved };
}
