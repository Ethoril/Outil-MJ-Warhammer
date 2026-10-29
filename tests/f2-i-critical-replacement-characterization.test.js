import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { updateCriticalDeathCountdown } from '../js/core/v5-critical-aftermath.js';

const clone = structuredClone;
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const participant = {
  id: 'hero', name: 'Hero', kind: 'PJ', camp: 'pj', zone: 'active', hp: 0, maxHp: 20,
  caracs: { E: 20, BE: 2 }, states: [{ id: 'unconscious', key: 'inconscient', name: 'Inconscient', level: 1 }],
  extensions: { v5: { criticalWounds: ['crit-a', 'crit-b', 'crit-c'].map(id => ({ id })) } }
};

test('F2-I: replacing a healed critical wound at equal count cancels stale death IDs with undo/redo and reload', async () => {
  const initial = clone(participant);
  Object.assign(initial, updateCriticalDeathCountdown(initial, { round: 1, toughnessBonus: 2 }).participant);
  const persistence = memory();
  const store = createStore({ storage: null, persistence });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: ['hero'], participants: [initial] }, log: [], diceLines: [], extensions: { v5: { combatId: 'f2-i-replacement', turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);

  await store.updateParticipant('hero', { extensions: { ...initial.extensions, v5: { ...initial.extensions.v5,
    criticalWounds: [{ id: 'crit-b' }, { id: 'crit-c' }, { id: 'crit-new' }] } } });

  const after = store.listParticipants().find(row => row.id === 'hero');
  assert.equal(after.extensions.v5.criticalWounds.length, 3);
  assert.deepEqual(after.extensions.v5.criticalDeath.criticalIds, ['crit-a', 'crit-b', 'crit-c']);
  assert.equal(after.extensions.v5.criticalDeath.status, 'cancelled');
  assert.equal(after.extensions.v5.criticalDeath.cancelReason, 'critical-wound-healed');
  const reloaded = createStore({ storage: null, persistence });
  await reloaded.ready;
  const persisted = () => reloaded.listParticipants().find(row => row.id === 'hero');
  assert.equal(persisted().extensions.v5.criticalDeath.status, 'cancelled');
  assert.equal(await reloaded.undo(), true);
  assert.deepEqual(persisted().extensions.v5.criticalWounds.map(row => row.id), ['crit-a', 'crit-b', 'crit-c']);
  assert.equal(persisted().extensions.v5.criticalDeath.status, 'countdown');
  assert.equal(await reloaded.redo(), true);
  assert.deepEqual(persisted().extensions.v5.criticalWounds.map(row => row.id), ['crit-b', 'crit-c', 'crit-new']);
  assert.equal(persisted().extensions.v5.criticalDeath.status, 'cancelled');
  const finalReload = createStore({ storage: null, persistence });
  await finalReload.ready;
  const finalHero = finalReload.listParticipants().find(row => row.id === 'hero');
  assert.equal(finalHero.extensions.v5.criticalDeath.status, 'cancelled');
  assert.deepEqual(finalHero.extensions.v5.criticalWounds.map(row => row.id), ['crit-b', 'crit-c', 'crit-new']);
});
