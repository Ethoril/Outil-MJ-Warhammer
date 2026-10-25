import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const clone = value => structuredClone(value);

function memoryPersistence() {
  let saved = null;
  return {
    async load() { return saved && clone(saved); },
    async saveAtomic({ state }) { saved = clone(state); return { ok: true }; },
    read() { return saved && clone(saved); }
  };
}

function participant() {
  return {
    id: 'hero', name: 'Héros', kind: 'PJ', camp: 'pj', zone: 'active',
    hp: 12, maxHp: 20, states: [], equipment: [],
    baseCaracs: { CC: 54, CT: 41 }, caracs: { CC: 64, CT: 41 },
    skills: [
      { id: 'melee-base', name: 'Corps à corps (Base)', carac: 'CC', base: 54, advances: 1, total: 59 },
      { id: 'ranged-crossbow', name: 'Projectiles (Arbalète de poing)', carac: 'CT', base: 41, advances: 1, total: 46 }
    ],
    actions: [{ id: 'attack', type: 'attack', base: 75, attr: 'CC', note: 'Ajustée à la main' }],
    extensions: { v5: { baseCaracs: { CC: 54, CT: 41 }, characteristicEffects: [{ id: 'effect-cc', characteristic: 'CC', value: 10 }], mounted: false } }
  };
}

const combatState = (hero = participant()) => ({
  schemaVersion: 3, reserve: [],
  combat: { round: 1, currentActorId: 'hero', order: ['hero'], participants: [clone(hero)] },
  activeScene: { id: 'scene-1', encounterId: 'enc-1', status: 'active', round: 1,
    currentActorId: 'hero', order: ['hero'], participants: [clone(hero)] },
  encounters: [], suspendedScenes: [], persistentCharacters: [], log: [], diceLines: [],
  extensions: { v5: { turnIndex: 1 } }
});

test('Store F2-C characterization — les couches base/total, effets et saisie manuelle survivent à une édition participant', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON(combatState());

  const before = store.listParticipants().find(row => row.id === 'hero');
  assert.deepEqual(before.extensions.v5.baseCaracs, { CC: 54, CT: 41 });
  assert.deepEqual(before.caracs, { CC: 64, CT: 41 });
  assert.deepEqual(before.skills.map(({ base, advances, total }) => ({ base, advances, total })), [
    { base: 54, advances: 1, total: 59 }, { base: 41, advances: 1, total: 46 }
  ]);
  assert.equal(before.actions[0].base, 75);
  assert.equal(before.extensions.v5.characteristicEffects[0].value, 10);

  await store.updateParticipant('hero', { name: 'Héros corrigé' });
  const after = store.listParticipants().find(row => row.id === 'hero');
  assert.equal(after.name, 'Héros corrigé');
  assert.deepEqual(after.extensions.v5.baseCaracs, before.extensions.v5.baseCaracs);
  assert.deepEqual(after.caracs, before.caracs);
  assert.deepEqual(after.skills, before.skills);
  assert.equal(after.actions[0].base, 75, 'une modification du participant ne remplace pas le score d’action saisi');
  assert.deepEqual(after.extensions.v5.characteristicEffects, before.extensions.v5.characteristicEffects);
});

test('Store F2-C characterization — la valeur durable du participant suit combat et scène, sauvegarde, Undo et Redo', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON(combatState());

  await store.updateParticipant('hero', { extensions: { v5: { characteristicEffects: [{ id: 'effect-cc', characteristic: 'CC', value: 10 }], mounted: true } } });
  const current = store.listParticipants().find(row => row.id === 'hero');
  assert.equal(current.extensions.v5.mounted, true);
  assert.equal(store.getActiveScene().participants[0].extensions.v5.mounted, true);

  const reloaded = createStore({ persistence, storage: null });
  await reloaded.ready;
  assert.equal(reloaded.listParticipants().find(row => row.id === 'hero').extensions.v5.mounted, true);
  assert.equal(reloaded.getActiveScene().participants[0].extensions.v5.mounted, true);

  assert.equal(await reloaded.undo(), true);
  assert.equal(reloaded.listParticipants().find(row => row.id === 'hero').extensions.v5.mounted, false);
  assert.equal(reloaded.getActiveScene().participants[0].extensions.v5.mounted, false);
  assert.equal(await reloaded.redo(), true);
  assert.equal(reloaded.listParticipants().find(row => row.id === 'hero').extensions.v5.mounted, true);
  assert.equal(reloaded.getActiveScene().participants[0].extensions.v5.mounted, true);
});
