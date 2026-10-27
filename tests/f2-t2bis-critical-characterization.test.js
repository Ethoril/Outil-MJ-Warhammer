import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const participant = (id, initiative, extra = {}) => ({
  id, name: id.toUpperCase(), kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative,
  hp: 10, maxHp: 10, states: [], extensions: { v5: {}, ...extra }
});

test('T2 bis — legacy Store: acts-last au début du Round décale un Tour au lieu de le faire perdre', async () => {
  // Reprend le cas du rapport : ordre manuel B,A au Round 1, puis A,B pour le
  // Round 2 à cause de l'effet « agit en dernier ». L'initiative V5 est absente.
  let saved;
  const persistence = {
    async load() { return saved && structuredClone(saved); },
    async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; }
  };
  const store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON({
    schemaVersion: 3, reserve: [], log: [], diceLines: [],
    combat: {
      round: 1, currentActorId: 'B', order: ['B', 'A'],
      participants: [
        participant('A', 40),
        participant('B', 60, { v5: { combatEffects: [{ id: 'late', kind: 'acts-last-next-round', round: 2 }] } })
      ]
    },
    extensions: { v5: {} }
  });

  const observed = [];
  for (let i = 0; i < 6; i++) {
    const combat = store.getCombat();
    observed.push(`${combat.round}:${combat.currentActorId}`);
    await store.nextTurn();
  }

  // B a bien joué en Round 1 et A en Round 2. La correction doit conserver
  // l'ordre A,B du Round 2 puis rendre le Tour du Round 3 à B.
  assert.deepEqual(observed, ['1:B', '1:A', '2:A', '2:B', '3:B', '3:A']);
});
