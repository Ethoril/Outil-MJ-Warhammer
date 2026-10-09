import { validateV5ReactionInput, registerV5ReactionOpportunities } from './v5-reactions.js';
/** Bridge from the durable Store envelope to the pure V5 action transaction. */
import { previewV5ActionCosts, prepareV5ActionState, commitV5ActionCosts } from './v5-action-costs.js';
import { projectV5Resources, commitV5Resources } from './v5-resources.js';
import { effectiveOrder } from './turn-order.js';
import { defaultResolutionId } from './resolution.js';
const clone = structuredClone;
export function v5StoreActionClock(envelope) {
  const scene = envelope.activeScene;
  const encounterId = scene?.encounterId || scene?.id || envelope.extensions?.v5?.combatId;
  const round = envelope.combat?.round;
  const serial = scene?.extensions?.v5?.turnIndex ?? envelope.extensions?.v5?.turnIndex;
  const actorId = envelope.combat?.currentActorId;
  return {
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
  const costs = [...(v5.costs || [])];
  if (v5.extraAttack === true && !costs.some(cost => cost.resource === 'momentum')) costs.push({ id: 'system:extra-attack-momentum', resource: 'momentum', amount: 1 });
  const hasRequest = costs.length || v5.quotas?.length || v5.exemptions?.length || v5.extraAttack;
  let actionCostPlan = null, paid = state;
  if (hasRequest) {
    actionCostPlan = previewV5ActionCosts({ state, actionId: resolutionId, actorId, costs, quotas: v5.quotas || [], exemptions: v5.exemptions || [], extraAttack: v5.extraAttack === true, clock });
    const prepared = prepareV5ActionState(actionCostPlan, state);
    if (prepared.status === 'prepared') paid = prepared.state;
  }
  return { ...supplied, resolutionId, actorId, targetId,
    actor: paid.participants.find(item => item.id === actorId) || supplied.actor,
    target: paid.participants.find(item => item.id === targetId) || supplied.target || null,
    round: state.round ?? supplied.round, baseRevision: supplied.baseRevision ?? state.revision,
    v5State: paid, v5Clock: clock, authorNextTurnEnd: authorNextTurnEnd(envelope, actorId), actionCostPlan, reactionValidation };
}
export function annotateV5StoreActionPreview(preview, input) {
  if (input.reactionValidation?.ready === false) preview = { ...preview, unresolved: [...(preview.unresolved || []), input.reactionValidation.reason] };
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
    const plan = previewV5ActionCosts({ ...request, state: usageState });
    const committed = commitV5ActionCosts(plan, usageState, { resolveAction: state => ({ status: 'applied', state }) });
    if (committed.status !== 'applied') return { status: committed.status === 'stale' ? 'stale' : 'manual', reason: committed.unresolved?.[0]?.reason || 'Usage de talent indisponible', state: initial };
    usageState = { ...committed.state, revision: initial.revision };
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
  const resolve = state => commitV5StoreTalentUsages(preview, resolveAction(state), state);
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
  const resources = commitV5Resources(next, result.state.participants);
  return registerV5ReactionOpportunities(resources, result.resolution, { clock: v5StoreActionClock(envelope) });
}