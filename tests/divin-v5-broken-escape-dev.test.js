import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const clone = value => structuredClone(value);
const person = (id, { states = [], hasMomentum = false } = {}) => ({
  id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 20,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  states: clone(states), armor: { head: 0, body: 0, arms: 0, legs: 0 },
  skills: [{ id: 'skill-athletics', name: 'Athlétisme', carac: 'Ag', status: 'resolved', total: 60 }],
  extensions: { v5: { ...(hasMomentum ? { hasMomentum: true } : {}) } }
});
async function setup({ actor = person('hero', { states: [{ id: 'broken-state', name: 'Brisé', key: 'brise', level: 1 }] }), turnIndex = 1 } = {}) {
  const store = createStore({ storage: null });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [],
    combat: { round: 1, currentActorId: actor.id, order: [actor.id], participants: [actor] },
    log: [], diceLines: [], extensions: { v5: { combatId: 'encounter-broken', turnIndex } } });
  return store;
}
const snapshot = store => {
  const state = JSON.parse(store.getFullJSON());
  delete state.exportedAt;
  return state;
};

// This first focused test is the preserved red reproduction: Brisé has no
// canonical movement/Action sequence in the Store yet.
test('le Store expose un aperçu pur et une commande durable pour la fuite obligatoire de Brisé', async () => {
  const store = await setup();
  assert.equal(typeof store.previewBrokenEscape, 'function');
  assert.equal(typeof store.applyBrokenEscape, 'function');
  const before = snapshot(store);
  const preview = store.previewBrokenEscape({ actorId: 'hero', action: 'flee', facts: {
    visibleToAnyEnemy: true, engagedEnemyIds: [], moveMode: 'run', visibleToAnyEnemyAfter: true
  } });
  assert.equal(preview.ready, true, preview.error);
  assert.deepEqual(snapshot(store), before, 'l’aperçu doit rester sans mutation');
});

test('une attestation MJ hors vue est durable, sans quota, et laisse le vrai prochain Tour avancer', async () => {
  const store = await setup();
  const before = snapshot(store);
  const confirmed = await store.confirmBrokenEscapeVisibility({ actorId: 'hero', visibleToAnyEnemy: false });
  assert.equal(confirmed.status, 'applied');
  const saved = snapshot(store);
  assert.deepEqual(saved.extensions.v5.brokenEscape.receipts.at(-1).visibleToAnyEnemy, false);
  assert.equal(saved.extensions.v5.brokenEscape.receipts.at(-1).source, 'explicit-gm');
  assert.deepEqual(saved.extensions.v5.actionLedger || before.extensions.v5.actionLedger, before.extensions.v5.actionLedger);
  const { previewV5Turn } = await import('../js/core/v5-turn.js');
  const turn = previewV5Turn(JSON.parse(store.getFullJSON()));
  assert.equal(turn.ready, true, turn.error);
});
