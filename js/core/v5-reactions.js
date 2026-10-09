/** Immediate reaction opportunities persist with the source result, not with an UI window. */
import { previewV5ReactionOpportunities, hasV5Talent, currentV5TalentHashes } from './v5-talents.js';
import { projectV5Resources } from './v5-resources.js';
import { normalizeAction } from './models.js';
const clone = structuredClone;
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim() ? value : null;
const stable = value => JSON.stringify(value, (_, node) => record(node) ? Object.fromEntries(Object.entries(node).sort(([a], [b]) => a.localeCompare(b))) : node);
const clockKnown = clock => text(clock?.encounterId) && text(clock?.turnId) && Number.isSafeInteger(clock?.round) && clock.round > 0;
const sameClock = (opportunity, clock) => clockKnown(clock) && ['encounterId', 'round', 'turnId'].every(field => opportunity[field] === clock[field]);
/** Keep the weapon and its mechanical input, without actor/target private snapshots. */
function actionSnapshot(raw = {}) {
  const action = normalizeAction({ ...raw, id: text(raw.id) || 'reaction-bound-action' });
  const fields = ['type', 'base', 'mod', 'damage', 'damageFormula', 'attr', 'qualities', 'valuesX', 'capacity', 'extensions'];
  return { id: text(raw.id), ...Object.fromEntries(fields.filter(field => Object.hasOwn(action, field)).map(field => [field, clone(action[field])])) };
}
function opportunitiesOf(envelope) {
  const list = envelope.extensions?.v5?.reactionOpportunities ?? [];
  if (!Array.isArray(list)) throw new TypeError('Registre des réactions invalide');
  const ids = new Set();
  for (const row of list) {
    if (!record(row) || !text(row.id) || ids.has(row.id) || !text(row.sourceResolutionId) || !text(row.actorId) || !text(row.targetId) || !clockKnown(row)
      || !record(row.action) || !Array.isArray(row.costs) || !Array.isArray(row.exemptions) || !Array.isArray(row.quotas)) throw new TypeError('Opportunité de réaction invalide');
    ids.add(row.id);
  }
  return clone(list);
}
function withOpportunities(envelope, list) {
  return { ...clone(envelope), extensions: { ...(clone(envelope.extensions || {})), v5: { ...(clone(envelope.extensions?.v5 || {})), reactionOpportunities: clone(list) } } };
}
/** Called only after an applied resolution. Every other resolution closes the prior opportunity. */
export function registerV5ReactionOpportunities(envelope, resolution, { clock } = {}) {
  if (!record(resolution) || !text(resolution.resolutionId)) throw new TypeError('Résolution source de réaction requise');
  const participants = projectV5Resources(envelope, envelope.combat?.participants || []);
  const state = { revision: envelope.localRevision || 0, participants, v5ActionLedger: clone(envelope.extensions?.v5?.actionLedger || { appliedActions: [], quotaUsage: [] }) };
  const plan = previewV5ReactionOpportunities(resolution, state, clock || {});
  const actorId = resolution.input?.actor?.id, targetId = resolution.targetId || resolution.input?.target?.id;
  const eligible = clockKnown(clock) && text(actorId) && text(targetId) && participants.some(row => row.id === actorId) && participants.some(row => row.id === targetId);
  const list = eligible && plan.ready ? plan.proposals.map(proposal => ({
    id: JSON.stringify(['reaction', resolution.resolutionId, actorId, proposal.talentId, proposal.clauseId]),
    sourceResolutionId: resolution.resolutionId, actorId, targetId, encounterId: clock.encounterId, round: clock.round, turnId: clock.turnId,
    action: actionSnapshot(resolution.input.action), talentId: proposal.talentId, clauseId: proposal.clauseId, ruleVersion: proposal.ruleVersion,
    ...(proposal.source ? { source: clone(proposal.source) } : {}),
    costs: clone(proposal.costs || []), exemptions: clone(proposal.exemptions || []), quotas: clone(proposal.quotas || [])
  })) : [];
  const next = withOpportunities(envelope, list); opportunitiesOf(next); return next;
}
/** Read offers only on the same live clock, with both combatants still present. */
export function listV5ReactionOpportunities(envelope, participantId, { clock } = {}) {
  const participants = envelope.combat?.participants || [];
  return opportunitiesOf(envelope).filter(row => (!participantId || row.actorId === participantId) && sameClock(row, clock)
    && participants.some(actor => actor.id === row.actorId) && participants.some(target => target.id === row.targetId));
}
/** Client costs are replaced by the durable offer; actor, target and weapon are immutable. */
export function validateV5ReactionInput(envelope, input, { clock } = {}) {
  if (!input?.v5?.reactionId) return { ready: true, input: clone(input), opportunity: null };
  const blocked = reason => ({ ready: false, reason, input: clone(input), opportunity: null });
  const opportunity = opportunitiesOf(envelope).find(row => row.id === input.v5.reactionId);
  if (!opportunity) return blocked('Cette réaction a déjà été utilisée ou n’est plus disponible.');
  if (!sameClock(opportunity, clock)) return blocked('Cette réaction immédiate a expiré.');
  const actorId = input.actorId || input.actor?.id, targetId = input.targetId || input.target?.id;
  if (actorId !== opportunity.actorId || targetId !== opportunity.targetId) return blocked('La réaction doit viser le même adversaire avec le même auteur.');
  const participants = envelope.combat?.participants || [];
  const actor = participants.find(row => row.id === actorId);
  if (!actor || !participants.some(row => row.id === targetId)) return blocked('Un combattant de cette réaction n’est plus présent.');
  if (!hasV5Talent(actor, opportunity.talentId)) return blocked('L’auteur ne possède plus le talent de cette réaction.');
  if (!text(opportunity.source?.effectHash) || currentV5TalentHashes()[opportunity.talentId] !== opportunity.source.effectHash) return blocked('La source du talent a changé ou manque. Recalculez les opportunités de réaction.');
  if (stable(actionSnapshot(input.action)) !== stable(opportunity.action)) return blocked('La réaction doit utiliser la même arme et la même action.');
  return { ready: true, opportunity: clone(opportunity), input: { ...clone(input), v5: { ...(clone(input.v5 || {})), kind: 'melee', extraAttack: true,
    reactionSourceResolutionId: opportunity.sourceResolutionId, costs: clone(opportunity.costs), exemptions: clone(opportunity.exemptions), quotas: clone(opportunity.quotas) } } };
}
export function closeV5ReactionOpportunities(envelope) { return withOpportunities(envelope, []); }
