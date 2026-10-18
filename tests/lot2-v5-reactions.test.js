import test from 'node:test';
import assert from 'node:assert/strict';
import { registerV5ReactionOpportunities, listV5ReactionOpportunities, validateV5ReactionInput, closeV5ReactionOpportunities } from '../js/core/v5-reactions.js';
import { sharedState } from '../js/core/sync-protocol.js';
import { migrateSnapshot } from '../js/core/migrations.js';
import { previewV5ActionCosts, prepareV5ActionState } from '../js/core/v5-action-costs.js';

const clock = { encounterId: 'encounter', round: 2, turnId: 'scene:3:actor' };
const action = { id: 'blade', type: 'attack', base: 60, attr: 'CC', mod: 0, damage: 4, qualities: [] };
const actor = { id: 'actor', name: 'Recette synthétique', hp: 40, zone: 'active', talents: [{ id: 'talent-furious-assault', status: 'resolved', rank: 1 }], extensions: { v5: { hasMomentum: true } } };
const target = { id: 'target', name: 'Cible synthétique', hp: 40, zone: 'active' };
const state = () => ({ schemaVersion: 3, reserve: [], persistentCharacters: [], localRevision: 5, combat: { round: 2, participants: [structuredClone(actor), structuredClone(target)] }, extensions: {}, log: [], diceLines: [] });
const source = (extra = {}) => ({ resolutionId: 'source-resolution', input: { actor: structuredClone(actor), target: structuredClone(target), action: structuredClone(action) }, targetId: 'target', attack: true, hit: true, test: { kind: 'melee' }, ...extra });
const request = reactionId => ({ actorId: 'actor', targetId: 'target', action: structuredClone(action), roll: 50, v5: { reactionId } });
const registered = () => registerV5ReactionOpportunities(state(), source(), { clock });

test('Réactions V5 — opportunité après touche, liée au résultat/auteur/cible/arme, sans snapshot fiche ni mutation', () => {
  const input = state(), resolution = source(), saved = structuredClone(input), random = Math.random;
  Math.random = () => { throw new Error('Aucun tirage pour une opportunité'); };
  let next;
  try { next = registerV5ReactionOpportunities(input, resolution, { clock }); } finally { Math.random = random; }
  const list = listV5ReactionOpportunities(next, 'actor', { clock });
  assert.equal(list.length, 1);
  assert.equal(list[0].sourceResolutionId, 'source-resolution');
  assert.equal(list[0].actorId, 'actor'); assert.equal(list[0].targetId, 'target');
  assert.equal(list[0].action.id, 'blade'); assert.equal(list[0].actor, undefined);
  assert.equal(list[0].quotas[0].scope, 'round'); assert.equal(list[0].costs[0].resource, 'momentum');
  assert.deepEqual(input, saved);
});

test('Réactions V5 — entrée injecte coûts/quota durables, refuse auteur/cible/arme/dégâts différents', () => {
  const next = registered(), opportunity = listV5ReactionOpportunities(next, 'actor', { clock })[0];
  const supplied = request(opportunity.id); supplied.v5.costs = []; supplied.v5.quotas = [];
  const plan = validateV5ReactionInput(next, supplied, { clock });
  assert.equal(plan.ready, true); assert.deepEqual(plan.input.v5.costs, opportunity.costs); assert.deepEqual(plan.input.v5.quotas, opportunity.quotas); assert.equal(plan.input.v5.extraAttack, true);
  for (const mutate of [row => row.actorId = 'foreign', row => row.targetId = 'foreign', row => row.action.id = 'different-weapon', row => row.action.damage = 100]) {
    const changed = request(opportunity.id); mutate(changed);
    assert.equal(validateV5ReactionInput(next, changed, { clock }).ready, false);
  }
  assert.deepEqual(supplied.v5.costs, []);
});

test('Réactions V5 — même horloge obligatoire ; autre résolution appliquée ferme toutes les offres', () => {
  const next = registered(), opportunity = listV5ReactionOpportunities(next, 'actor', { clock })[0];
  for (const changed of [{ ...clock, round: 3 }, { ...clock, turnId: 'other-turn' }, { ...clock, encounterId: 'other-encounter' }, {}]) {
    assert.equal(listV5ReactionOpportunities(next, 'actor', { clock: changed }).length, 0);
    assert.equal(validateV5ReactionInput(next, request(opportunity.id), { clock: changed }).ready, false);
  }
  const closed = registerV5ReactionOpportunities(next, source({ resolutionId: 'another-result', attack: false }), { clock });
  assert.equal(listV5ReactionOpportunities(closed, 'actor', { clock }).length, 0);
  assert.equal(validateV5ReactionInput(closed, request(opportunity.id), { clock }).ready, false);
  assert.equal(listV5ReactionOpportunities(next, 'actor', { clock }).length, 1);
});

test('Réactions V5 — miss/tir/Élan absent/contexte absent ne créent pas attaque automatique', () => {
  for (const resolution of [source({ hit: false }), source({ test: { kind: 'ranged' } }), source({ attack: false })]) assert.equal(listV5ReactionOpportunities(registerV5ReactionOpportunities(state(), resolution, { clock }), 'actor', { clock }).length, 0);
  const absent = state(); absent.combat.participants[0].extensions.v5.hasMomentum = false;
  assert.equal(listV5ReactionOpportunities(registerV5ReactionOpportunities(absent, source(), { clock }), 'actor', { clock }).length, 0);
  assert.deepEqual(registerV5ReactionOpportunities(state(), source(), { clock: {} }).extensions.v5.reactionOpportunities, []);
});

test('Réactions V5 — quota Round et paiement Élan Tour restent distincts, aucun nouveau offer après usage', () => {
  const next = registered(), opportunity = listV5ReactionOpportunities(next, 'actor', { clock })[0];
  const pure = { revision: 5, participants: next.combat.participants, v5ActionLedger: { appliedActions: [], quotaUsage: [] } };
  const cost = previewV5ActionCosts({ state: pure, actorId: 'actor', actionId: 'reaction-result', clock, extraAttack: true, costs: opportunity.costs, quotas: opportunity.quotas, exemptions: opportunity.exemptions });
  const paid = prepareV5ActionState(cost, pure);
  assert.equal(paid.status, 'prepared'); assert.equal(paid.state.participants[0].extensions.v5.hasMomentum, false);
  assert.equal(paid.state.v5ActionLedger.quotaUsage.length, 2);
  assert.ok(paid.state.v5ActionLedger.quotaUsage.some(row => row.scope === 'round'));
  assert.ok(paid.state.v5ActionLedger.quotaUsage.some(row => row.scope === 'turn'));
  const after = structuredClone(next); after.extensions.v5.actionLedger = paid.state.v5ActionLedger;
  // Winning that extra attack can regain Momentum but cannot refund the quota.
  assert.equal(listV5ReactionOpportunities(registerV5ReactionOpportunities(after, source({ resolutionId: 'reaction-result' }), { clock }), 'actor', { clock }).length, 0);
});

test('Réactions V5 — migration/sauvegarde/cloud conservent l’offre et fermeture annulable par snapshot', () => {
  const next = registered(), offer = listV5ReactionOpportunities(next, 'actor', { clock })[0];
  const restored = migrateSnapshot(JSON.parse(JSON.stringify(sharedState(next)))).data;
  assert.equal(validateV5ReactionInput(restored, request(offer.id), { clock }).ready, true);
  const before = structuredClone(next), closed = closeV5ReactionOpportunities(next);
  assert.equal(closed.extensions.v5.reactionOpportunities.length, 0);
  assert.equal(listV5ReactionOpportunities(before, 'actor', { clock }).length, 1);
});

test('Réactions V5 — talent retiré ou source absente/modifiée bloque une offre persistée sans exception', () => {
  const next = registered(), opportunity = listV5ReactionOpportunities(next, 'actor', { clock })[0];
  assert.match(opportunity.source.effectHash, /^sha256:[0-9a-f]{64}$/);
  assert.equal(typeof opportunity.source.reference, 'string');
  assert.equal(validateV5ReactionInput(next, request(opportunity.id), { clock }).ready, true);
  const removed = structuredClone(next); removed.combat.participants[0].talents = [];
  const noTalent = validateV5ReactionInput(removed, request(opportunity.id), { clock });
  assert.equal(noTalent.ready, false); assert.match(noTalent.reason, /possède plus le talent/);
  const changed = structuredClone(next); changed.extensions.v5.reactionOpportunities[0].source.effectHash = 'sha256:' + '0'.repeat(64);
  const noSource = validateV5ReactionInput(changed, request(opportunity.id), { clock });
  assert.equal(noSource.ready, false); assert.match(noSource.reason, /source du talent/);
  const legacy = structuredClone(next); delete legacy.extensions.v5.reactionOpportunities[0].source;
  assert.doesNotThrow(() => validateV5ReactionInput(legacy, request(opportunity.id), { clock }));
  assert.equal(validateV5ReactionInput(legacy, request(opportunity.id), { clock }).ready, false);
});
