/** Explicit acquired identities and pinned public source text; never parse names or rules at runtime. */
import registry from '../data/v5-talent-contracts.json' with { type: 'json' };
import { getReferenceCatalogue } from './reference-catalog.js';
import { evaluateTalentContractsV2, reduceV5ConditionProposals } from './talent-contract-v2.js';

export const V5_TALENT_IDS = Object.freeze({
  accurateShot: 'talent-accurate-shot', mightyBlow: 'talent-strike-mighty-blow',
  ironJaw: 'talent-iron-jaw', beatBlade: 'talent-beat-blade', furiousAssault: 'talent-furious-assault'
});
export function acquiredV5Talents(participant) {
  const groups = new Map();
  for (const row of participant?.talents || []) {
    if (row?.status !== 'resolved' || typeof row.id !== 'string' || !Number.isSafeInteger(row.rank) || row.rank < 1) continue;
    const specialization = row.specialization || row.specialty || null;
    const key = JSON.stringify([row.id, specialization]);
    if (!groups.has(key)) groups.set(key, { talentId: row.id, rank: row.rank, ...(specialization ? { specialization } : {}) });
  }
  return [...groups.values()];
}
export const hasV5Talent = (participant, id) => acquiredV5Talents(participant).some(row => row.talentId === id);
/** Equality against the pinned published texts is synchronous; SHA256 pins are independently checked in tests. */
export function currentV5TalentHashes(catalogue = getReferenceCatalogue()) {
  const texts = new Map((catalogue?.talents || []).map(row => [row.id, row.description]));
  return Object.fromEntries(registry.contracts.flatMap(contract => texts.has(contract.talentId)
    ? [[contract.talentId, texts.get(contract.talentId) === registry.sourceDescriptions[contract.talentId]
      ? contract.source.effectHash : 'source-text-changed']] : []));
}
export function evaluateV5Talents(participant, { event, role, context, choices = {}, state, clock = {}, actionId, includeTalents, excludeTalents = [] } = {}) {
  return evaluateTalentContractsV2({ contracts: registry.contracts, acquisitions: acquiredV5Talents(participant).filter(row => (!includeTalents || includeTalents.includes(row.talentId)) && !excludeTalents.includes(row.talentId)),
    sourceHashes: currentV5TalentHashes(), event, role, context, choices, state, clock, actionId, actorId: participant?.id });
}
/** One shared reduction for attack, defense and direct acquisition Store commands. */
export function previewV5TalentConditions(participant, states, { state, clock = {}, actionId } = {}) {
  const instances = states.filter(row => row.key === 'sonne').reduce((sum, row) => sum + row.level, 0);
  const plan = evaluateV5Talents(participant, { event: 'condition.beforeAcquire', role: 'defender',
    context: { condition: { id: 'sonne', instances } }, state, clock, actionId });
  return { plan, states: reduceV5ConditionProposals(states, plan.proposals.filter(row => row.op === 'reduceConditionAcquisition')),
    usageRequests: plan.quotas.length || plan.costs.length ? [{ actorId: participant.id, actionId, clock,
      costs: plan.costs, quotas: plan.quotas, exemptions: plan.exemptions }] : [] };
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
