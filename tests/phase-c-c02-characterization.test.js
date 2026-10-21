import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

function memoryPersistence() {
  let saved = null;
  return {
    async load() {
      return saved ? structuredClone(saved) : null;
    },
    async saveAtomic({ state }) {
      saved = structuredClone(state);
      return { ok: true };
    }
  };
}

function makeActor(id, { camp = 'pj', states = [], talents = [] } = {}) {
  return {
    id,
    name: id,
    kind: camp === 'pj' ? 'PJ' : 'PNJ',
    camp,
    zone: 'active',
    initiative: id === 'runner' ? 50 : 30,
    hp: 15,
    maxHp: 15,
    caracs: { CC: 40, CT: 35, F: 35, E: 35, I: 40, Ag: 40, Dex: 35, Int: 35, FM: 40, Soc: 35, M: 4 },
    armor: { head: 0, body: 0, arms: 0, legs: 0 },
    states: structuredClone(states),
    traits: [],
    equipment: [],
    talents: structuredClone(talents),
    prayers: [],
    skills: [
      { id: 'skill-41_74_68_6c_e9_74_69_73_6d_65-base', name: 'Athlétisme', carac: 'Ag', status: 'resolved', total: 55 }
    ],
    actions: [{ id: 'sword', type: 'attack', base: 40, damage: 4, note: 'Épée' }],
    extensions: { v5: { hasMomentum: false } }
  };
}

async function setupBrokenStore() {
  const persistence = memoryPersistence();
  const store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON({
    schemaVersion: 3,
    reserve: [],
    combat: {
      round: 1,
      currentActorId: 'runner',
      order: ['runner', 'foe'],
      participants: [
        makeActor('runner', {
          camp: 'pj',
          states: [{ id: 'b1', key: 'brise', name: 'Brisé', level: 1 }]
        }),
        makeActor('foe', { camp: 'ennemi' })
      ]
    },
    diceLines: [],
    log: [],
    extensions: { v5: { turnIndex: 1, combatId: 'char-c02-encounter' } }
  });
  return { store };
}

test('Caractérisation C02 (store.js) — Flee non engagée puis Sprint débitent Move et Action et bloquent une seconde Flee', async () => {
  const { store } = await setupBrokenStore();

  const unconfirmedEngaged = store.previewBrokenEscape({
    actorId: 'runner',
    action: 'flee',
    facts: {
      visibleToAnyEnemy: true,
      engagedEnemyIds: ['foe'],
      moveMode: 'run',
      visibleToAnyEnemyAfter: true
    }
  });
  assert.equal(unconfirmedEngaged.ready, false);

  const fleePreview = store.previewBrokenEscape({
    actorId: 'runner',
    action: 'flee',
    facts: {
      visibleToAnyEnemy: true,
      engagedEnemyIds: [],
      moveMode: 'run',
      visibleToAnyEnemyAfter: true
    }
  });
  assert.equal(fleePreview.ready, true);
  assert.equal(fleePreview.moveDistance, 16);

  const fleeApplied = await store.applyBrokenEscape(fleePreview);
  assert.equal(fleeApplied.status, 'applied');

  const sprintPreview = store.previewBrokenEscape({
    actorId: 'runner',
    action: 'sprint',
    facts: {
      visibleToAnyEnemy: true,
      engagedEnemyIds: [],
      visibleToAnyEnemyAfter: false
    },
    roll: 25
  });
  assert.equal(sprintPreview.ready, true);
  const sprintApplied = await store.applyBrokenEscape(sprintPreview);
  assert.equal(sprintApplied.status, 'applied');

  const state = JSON.parse(store.getFullJSON());
  const quotas = state.extensions?.v5?.actionLedger?.quotaUsage || [];
  assert.equal(quotas.some(q => q.actorId === 'runner' && q.quotaId === 'system:turn-move' && q.used === 1), true);
  assert.equal(quotas.some(q => q.actorId === 'runner' && q.quotaId === 'system:turn-action' && q.used === 1), true);
});
