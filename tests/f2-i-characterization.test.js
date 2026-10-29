import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getV5CriticalEffect, V5_CRIT_DATA, V5_CRITICAL_TABLE_VERSION } from '../js/data/v5-crits.js';

const clone = structuredClone;
const participant = (id, overrides = {}) => ({
  id, name: id, kind: id === 'pj' ? 'PJ' : 'PNJ', camp: id === 'foe' ? 'ennemi' : 'pj',
  zone: 'active', hp: 20, maxHp: 20, caracs: { CC: 60, CT: 60, F: 30, E: 30 },
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [], extensions: { v5: {} }, ...overrides
});

function memoryPersistence() {
  let saved = null;
  return {
    async load() { return saved && clone(saved); },
    async saveAtomic({ state }) { saved = clone(state); return { ok: true }; }
  };
}

async function fixture(persistence, target) {
  const store = createStore({ storage: null, persistence });
  await store.ready;
  await store.loadFromJSON({
    schemaVersion: 3, reserve: [],
    combat: { round: 1, currentActorId: 'foe', order: ['foe', target.id], participants: [participant('foe'), target] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'critical-characterization' } }
  });
  return store;
}

test('F2-I caractérisation — le registre V5 garde ses tables et son seuil de mort', () => {
  assert.equal(V5_CRITICAL_TABLE_VERSION, 'v5-critical-2026-10-09.1');
  assert.deepEqual(Object.keys(V5_CRIT_DATA).sort(), ['ARM', 'BODY', 'HEAD', 'LEG']);
  assert.equal(getV5CriticalEffect('HEAD', 99).parsed.death, false);
  assert.equal(getV5CriticalEffect('HEAD', 100).parsed.death, true);
  assert.equal(getV5CriticalEffect('HEAD', 101).name, getV5CriticalEffect('HEAD', 100).name);
  assert.equal(getV5CriticalEffect('ARM', 136).parsed.death, true);
  assert.equal(getV5CriticalEffect('BODY', 116).parsed.death, true);
  assert.equal(getV5CriticalEffect('LEG', 126).parsed.death, true);
});

test('F2-I caractérisation — critique V5 appliqué, journalisé, annulable et rechargé sans mort implicite', async () => {
  const persistence = memoryPersistence();
  const target = participant('pj', { states: [{ id: 'preexisting', key: 'hemorragique', name: 'Hémorragique', level: 1 }] });
  const store = await fixture(persistence, target);
  const before = clone(store.listParticipants().find(row => row.id === 'pj'));
  const preview = store.previewResolution({
    resolutionId: 'f2-i-characterization-1', actorId: 'foe', targetId: 'pj',
    action: { type: 'attack', base: 60, attr: 'CC', damage: 5 },
    v5: { kind: 'melee' }, roll: 22,
    defense: { base: 30, roll: 82, v5: { kind: 'melee' } },
    criticalRolls: { location: 2, effect: 12 }
  });

  assert.equal(preview.critical.details.effect.name, 'Coup à l’œil');
  const applied = await store.applyResolution(preview);
  assert.equal(applied.status, 'applied', applied.reason);
  const after = store.listParticipants().find(row => row.id === 'pj');
  const records = after.extensions.v5.criticalWounds;
  assert.equal(records.length, 1);
  assert.equal(records[0].resolutionId, preview.resolutionId);
  assert.ok(records[0].stateIds.length > 0, 'les États créés par le critique sont rattachés à son enregistrement');
  assert.ok(!records[0].stateIds.includes('preexisting'), 'un État antérieur reste indépendant');
  assert.equal(after.extensions.v5.dead, undefined, 'les conséquences mortelles ne sont jamais déduites implicitement');

  assert.equal((await store.applyResolution(preview)).status, 'duplicate', 'rejouer le même identifiant ne double pas le critique');
  assert.equal(await store.undo(), true);
  assert.deepEqual(clone(store.listParticipants().find(row => row.id === 'pj')), before);
  assert.equal(await store.redo(), true);
  assert.equal(store.listParticipants().find(row => row.id === 'pj').extensions.v5.criticalWounds.length, 1);

  const reloaded = createStore({ storage: null, persistence });
  await reloaded.ready;
  const restored = reloaded.listParticipants().find(row => row.id === 'pj');
  assert.deepEqual(restored.extensions.v5.criticalWounds, store.listParticipants().find(row => row.id === 'pj').extensions.v5.criticalWounds);
  assert.deepEqual(restored.states, store.listParticipants().find(row => row.id === 'pj').states);
});
