import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import {
  decideSuddenDeath,
  previewSuddenDeath
} from '../js/core/v5-critical-aftermath.js';
import { createStore } from '../js/core/store.js';
import { createPersistence } from '../js/core/persistence.js';

const npc = (overrides = {}) => ({
  id: 'extra', name: 'Figurant', kind: 'PNJ', hp: 0, states: [],
  extensions: { v5: {} }, talents: [], ...overrides
});

test('T2 bis — mort subite inactive par défaut et réservée au choix MJ d’un figurant éligible', () => {
  const target = npc();
  assert.equal(previewSuddenDeath(target).status, 'disabled');
  const eligible = previewSuddenDeath(target, { tableOptionEnabled: true, secondaryNpcConfirmed: true });
  assert.equal(eligible.status, 'choice-required');
  assert.deepEqual(eligible.outcomes, ['dead', 'unconscious']);
  assert.equal(decideSuddenDeath(target, eligible, undefined).status, 'confirmation-required');
});

test('T2 bis — PJ, Chanceux, PNJ non confirmé et figurant au-dessus de 0 B sont exclus', () => {
  const cases = [
    [npc({ kind: 'PJ' }), true],
    [npc({ talents: [{ id: 'talent-luck' }] }), true],
    [npc(), false],
    [npc({ hp: 1 }), true]
  ];
  for (const [target, secondaryNpcConfirmed] of cases) {
    assert.notEqual(previewSuddenDeath(target, { tableOptionEnabled: true, secondaryNpcConfirmed }).status, 'choice-required');
  }
});

test('T2 bis — résolution refusée sans choix explicite, morte ou inconsciente après choix MJ', () => {
  const target = npc();
  const plan = previewSuddenDeath(target, { tableOptionEnabled: true, secondaryNpcConfirmed: true });
  assert.equal(decideSuddenDeath(target, plan, 'other').status, 'confirmation-required');
  const dead = decideSuddenDeath(target, plan, 'dead');
  assert.equal(dead.status, 'dead');
  assert.equal(dead.participant.hp, 0);
  assert.equal(dead.participant.extensions.v5.dead, true);
  const unconscious = decideSuddenDeath(target, plan, 'unconscious');
  assert.equal(unconscious.status, 'unconscious');
  assert.equal(unconscious.participant.hp, 0);
  assert.ok(unconscious.participant.states.some(state => state.key === 'inconscient'));
});

test('T2 bis — Store persiste le réglage de table et annule/rétablit les décisions par historique', async () => {
  const store = createStore({ storage: null });
  await store.ready;
  await store.loadFromJSON(JSON.stringify({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'extra', order: ['extra'], participants: [npc()] }, log: [], diceLines: [], extensions: { v5: {} } }));
  assert.equal(JSON.parse(store.getFullJSON()).extensions.v5.suddenDeathEnabled, undefined);
  assert.equal(store.previewSuddenDeath('extra', true).status, 'disabled');
  await store.setSuddenDeathEnabled(true);
  assert.equal(JSON.parse(store.getFullJSON()).extensions.v5.suddenDeathEnabled, true);
  assert.equal(store.previewSuddenDeath('extra', true).ready, true);
  await store.decideSuddenDeath('extra', 'unconscious', { secondaryNpcConfirmed: true });
  assert.ok(store.listParticipants()[0].states.some(state => state.key === 'inconscient'));
  assert.equal(await store.undo(), true);
  assert.equal(store.listParticipants()[0].states.some(state => state.key === 'inconscient'), false);
  assert.equal(await store.redo(), true);
  assert.ok(store.listParticipants()[0].states.some(state => state.key === 'inconscient'));
  assert.equal(await store.undo(), true);
  assert.equal(await store.undo(), true);
  assert.notEqual(JSON.parse(store.getFullJSON()).extensions.v5.suddenDeathEnabled, true);
});

test('T2 bis — réglage de table survit à la fermeture et au rechargement IndexedDB', async () => {
  const dbName = `f2-t2bis-sudden-death-${Date.now()}`;
  const persistence = createPersistence({ indexedDB, dbName, contextId: 'sudden-death' });
  const store = createStore({ storage: null, persistence }); await store.ready;
  await store.loadFromJSON(JSON.stringify({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'extra', order: ['extra'], participants: [npc()] }, log: [], diceLines: [], extensions: { v5: {} } }));
  await store.setSuddenDeathEnabled(true); await store.whenIdle(); persistence.close();
  const reopenedPersistence = createPersistence({ indexedDB, dbName, contextId: 'sudden-death' });
  const reloaded = createStore({ storage: null, persistence: reopenedPersistence }); await reloaded.ready;
  assert.equal(JSON.parse(reloaded.getFullJSON()).extensions.v5.suddenDeathEnabled, true);
  assert.equal(reloaded.previewSuddenDeath('extra', true).status, 'choice-required');
  reopenedPersistence.close();
});

test('T2 bis — les décisions refusent une révision périmée, une option désactivée ou une cible devenue inéligible', async () => {
  const persistence = createPersistence({ indexedDB, dbName: `f2-t2bis-sudden-stale-${Date.now()}`, contextId: 'sudden-stale' });
  const store = createStore({ storage: null, persistence }); await store.ready;
  await store.loadFromJSON(JSON.stringify({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'extra', order: ['extra'], participants: [npc()] }, log: [], diceLines: [], extensions: { v5: {} } }));
  await store.setSuddenDeathEnabled(true);
  let plan = store.previewSuddenDeath('extra', true);
  await store.updateParticipant('extra', { notes: 'changement concurrent' });
  await assert.rejects(store.decideSuddenDeath('extra', 'dead', { secondaryNpcConfirmed: true, baseRevision: plan.baseRevision }), /changé depuis l’aperçu/i);
  plan = store.previewSuddenDeath('extra', true);
  await store.setSuddenDeathEnabled(false);
  await assert.rejects(store.decideSuddenDeath('extra', 'dead', { secondaryNpcConfirmed: true }), /désactivée/i);
  await store.setSuddenDeathEnabled(true);
  plan = store.previewSuddenDeath('extra', true);
  await store.updateParticipant('extra', { talents: [{ id: 'talent-luck', name: 'Chanceux' }] });
  await assert.rejects(store.decideSuddenDeath('extra', 'unconscious', { secondaryNpcConfirmed: true }), /Chanceux/i);
  assert.equal(store.listParticipants()[0].extensions.v5.dead, undefined);
  assert.equal(store.listParticipants()[0].states.some(state => state.key === 'inconscient'), false);
  persistence.close();
});
