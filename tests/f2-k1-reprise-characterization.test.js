import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const RESISTANCE = 'skill-52_e9_73_69_73_74_61_6e_63_65-base';
const hero = (id, { points = 7, E = 30, FM = 30, pendingMutation = null } = {}) => ({
  id, name: id, zone: 'active', species: 'Human', caracs: { E, FM }, skills: [{ id: RESISTANCE, status: 'resolved', total: 50 }], talents: [], states: [],
  extensions: { v5: { corruptionPoints: points, ...(pendingMutation ? { pendingCorruptionMutation: pendingMutation } : {}) } }
});
async function storeWith(participants) {
  const store = createStore({ storage: null });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, order: [], participants }, log: [], diceLines: [] });
  return store;
}

test('K1 reprise: mutation pending can be declined through Store, preserving points and clearing pending state', async () => {
  const store = await storeWith([hero('decline', { pendingMutation: { id: 'pending-1', status: 'pending', domain: 'physical', manifestation: { days: 12, visibility: 'gm-only' } } })]);
  const status = store.getCorruptionStatus('decline');
  const result = await store.declineCorruptionMutation('decline', { baseRevision: status.baseRevision });
  assert.equal(result.status, 'declined');
  assert.equal(store.getCorruptionStatus('decline').pendingMutation, null);
  assert.equal(store.getCorruptionStatus('decline').corruptionPoints, 7);
});

test('K1 reprise: threshold preview requests missing mutation-domain dice instead of throwing', async () => {
  const store = await storeWith([hero('input')]);
  await store.executeCommand('fixture-pending-threshold', draft => {
    draft.combat.participants[0].extensions.v5.pendingCorruptionTest = { id: 'test-1', status: 'pending' };
    return draft;
  });
  const status = store.getCorruptionStatus('input');
  const preview = store.previewCorruptionThresholdTest('input', { baseRevision: status.baseRevision, roll: 90, manifestationDice: [1, 1, 1] });
  assert.equal(preview.status, 'needs-input');
  assert.ok(preview.missing.includes('gmChosenDomain') || preview.missing.includes('mutationDomainRoll'));
});

test('K1 reprise: creature characteristic scores above 100 can determine the corruption threshold', async () => {
  const store = await storeWith([hero('giant', { points: 120, E: 120, FM: 110 })]);
  assert.equal(store.getCorruptionStatus('giant').threshold, 23);
});
