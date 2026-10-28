import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const memory = () => {
  let saved = null;
  return {
    async load() { return saved && structuredClone(saved); },
    async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; },
  };
};

test('T2 bis characterization — a successful action.type=test is currently journaled as Action', async () => {
  const store = createStore({ storage: null, persistence: memory() });
  await store.ready;
  const actor = { id: 'tester', name: 'Testeur', kind: 'PJ', zone: 'active', hp: 10, maxHp: 10,
    caracs: { F: 40 }, skills: [], states: [], equipment: [], extensions: { v5: {} } };
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: actor.id,
    order: [actor.id], participants: [actor] }, log: [], diceLines: [] });
  const preview = store.previewResolution({ resolutionId: 'journal-test-action', actorId: actor.id, round: 1,
    action: { type: 'test', attr: 'F', base: 40 }, roll: 20, v5: { kind: 'test' } });
  assert.equal((await store.applyResolution(preview)).status, 'applied');
  const entry = JSON.parse(store.getFullJSON()).log[0];
  assert.equal(entry.detail.actionType, 'test');
  assert.match(entry.text, /^Action — réussite/u);
});
