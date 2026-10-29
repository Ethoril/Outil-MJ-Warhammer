import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { previewResolution } from '../js/core/resolution.js';

const clone = value => structuredClone(value);

const person = (id, extra = {}) => ({
  id, name: id, kind: 'PJ', camp: id === 'rider' ? 'pj' : 'ennemi', zone: 'active', initiative: 50,
  hp: 20, maxHp: 20,
  caracs: { CC: 50, CT: 40, F: 30, E: 40, I: 40, Ag: 40, Dex: 30, Int: 30, FM: 30, Soc: 30, M: 4 },
  skills: [], talents: [], equipment: [], traits: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { hasMomentum: false } },
  ...extra
});

function memoryPersistence() {
  let saved = null;
  return {
    async load() { return saved && clone(saved); },
    async saveAtomic({ state }) { saved = clone(state); return { ok: true }; },
    read() { return saved && clone(saved); }
  };
}

test('F2-M caractérisation — la pénalité Esquive montée manuelle reste portée par la défense', () => {
  const preview = previewResolution({
    actor: person('attacker'), target: person('rider'), roll: 25,
    action: { type: 'attack', attr: 'CC', base: 50, damage: 4 },
    defense: { base: 40, roll: 70, label: 'Esquive', v5: { kind: 'test', context: { penalties: { mounted: -2 } } } },
    v5: { kind: 'melee' }
  });
  const penalty = preview.defenderTest.details.modifiers.find(row => row.id === 'penalty:mounted');
  assert.equal(penalty?.amount, -2);
  assert.equal(preview.test.details.modifiers.some(row => row.id === 'penalty:mounted'), false,
    'la pénalité de monture ne doit pas fuiter sur le Test de l’attaquant');
});

test('F2-M caractérisation — le marqueur monté existant survit à update, persistance et rechargement', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON({
    schemaVersion: 3, reserve: [], log: [], diceLines: [],
    extensions: { v5: { combatId: 'f2-m-characterization', turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'rider', order: ['rider', 'mount'], participants: [
      person('rider', { extensions: { v5: { hasMomentum: false, mounted: true } } }),
      person('mount', { kind: 'Créature', camp: 'pj', size: 'large' })
    ] }
  });

  assert.equal(store.listParticipants().find(row => row.id === 'rider').extensions.v5.mounted, true);
  assert.equal((await store.updateParticipant('rider', { initiative: 51 })).ok, true);
  assert.equal(persistence.read().combat.participants.find(row => row.id === 'rider').extensions.v5.mounted, true);

  const reloaded = createStore({ persistence, storage: null });
  await reloaded.ready;
  assert.equal(reloaded.listParticipants().find(row => row.id === 'rider').extensions.v5.mounted, true);
});
