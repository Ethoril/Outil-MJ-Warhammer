import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const clone = structuredClone;
const participant = (id, extra = {}) => ({ id, name: id, zone: 'active', hp: 12, maxHp: 12, states: [], ...extra });
const envelope = participants => ({
  schemaVersion: 3, reserve: [], combat: { round: 0, order: [], participants }, log: [], diceLines: []
});

function memoryPersistence() {
  let saved = null;
  return {
    async load() { return saved && clone(saved); },
    async saveAtomic({ state }) { saved = clone(state); return { ok: true }; }
  };
}

async function fixture(participants) {
  const persistence = memoryPersistence();
  const store = createStore({ storage: null, persistence });
  await store.ready;
  await store.loadFromJSON(envelope(participants));
  return { store, persistence };
}
const get = (store, id) => store.listParticipants().find(item => item.id === id);

test('F2-K characterization — Store preserves known Corruption and does not invent a zero for an unknown balance', async () => {
  const { store, persistence } = await fixture([
    participant('known', { extensions: { v5: { corruptionPoints: 7 } } }),
    participant('unknown')
  ]);
  assert.equal(get(store, 'known').extensions.v5.corruptionPoints, 7);
  assert.equal(get(store, 'unknown').extensions?.v5?.corruptionPoints, undefined);
  const reloaded = createStore({ storage: null, persistence });
  await reloaded.ready;
  assert.equal(get(reloaded, 'known').extensions.v5.corruptionPoints, 7);
  assert.equal(get(reloaded, 'unknown').extensions?.v5?.corruptionPoints, undefined);
});

test('F2-K characterization — participant extension edits are atomic, undoable, redoable, and durable', async () => {
  const beforeV5 = {
    corruptionPoints: 8,
    corruptionMutations: [{ id: 'mutation-1', tableRowId: 'L06-P-01', domain: 'physical', status: 'confirmed' }],
    pendingCorruptionMutation: null,
    unrelated: { keep: true }
  };
  const { store, persistence } = await fixture([
    participant('hero', { extensions: { v5: beforeV5 } })
  ]);
  const afterV5 = {
    ...clone(beforeV5), corruptionPoints: 11,
    pendingCorruptionMutation: { id: 'pending-2', status: 'pending', domain: 'mental' }
  };
  await store.updateParticipant('hero', { extensions: { v5: afterV5 } });
  assert.deepEqual(get(store, 'hero').extensions.v5, afterV5);

  await store.undo();
  assert.deepEqual(get(store, 'hero').extensions.v5, beforeV5);
  await store.redo();
  assert.deepEqual(get(store, 'hero').extensions.v5, afterV5);

  const reloaded = createStore({ storage: null, persistence });
  await reloaded.ready;
  assert.deepEqual(get(reloaded, 'hero').extensions.v5, afterV5);
});
