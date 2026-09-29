import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { Profile } from '../js/core/models.js';
import { migrateSnapshot } from '../js/core/migrations.js';
import { parseProfileText } from '../js/core/text-profile-import.js';

function memoryPersistence(initial = null) {
  let state = initial && structuredClone(initial);
  return {
    async load() { return state && structuredClone(state); },
    async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; },
    peek() { return state && structuredClone(state); }
  };
}

const ORC = 'Nom: Orc\nPV: 12\nAction: Hache | 45 | dégâts BF+4\n';
const line = note => ({ id: `l-${note}`, base: 50, note });

async function reload(persistence) {
  const store = createStore({ persistence: memoryPersistence(persistence.peek()) });
  await store.ready;
  return store;
}

test('E20 profil importé par texte — updateProfile({ diceLines }) survit au rechargement', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence });
  await store.ready;
  await store.importParsedProfiles(parseProfileText(ORC).profiles);
  const id = store.listProfiles()[0].id;
  await store.updateProfile(id, { diceLines: [line('Nouvelle')] });
  const reloaded = await reload(persistence);
  assert.deepEqual(reloaded.getProfile(id).diceLines.map(item => item.note), ['Nouvelle']);
  assert.deepEqual(reloaded.getProfile(id).actions.map(item => item.note), ['Nouvelle']);
  assert.equal(Object.hasOwn(persistence.peek().reserve[0], 'actions'), false);
});

test('E20 profil créé avec actions — la modification des diceLines survit au rechargement', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence });
  await store.ready;
  await store.addProfile(new Profile({ id: 'p', name: 'Garde', actions: [line('Ancienne')] }));
  await store.updateProfile('p', { diceLines: [line('Nouvelle')] });
  assert.deepEqual((await reload(persistence)).getProfile('p').diceLines.map(item => item.note), ['Nouvelle']);
  await store.updateProfile('p', { diceLines: [] });
  assert.deepEqual((await reload(persistence)).getProfile('p').diceLines, []);
});

test('E20 duplication et propagation — une seule copie, participants alimentés', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence });
  await store.ready;
  await store.addProfile(new Profile({ id: 'p', name: 'Garde', actions: [line('Ancienne')] }));
  await store.addParticipant({ id: 'c', profileId: 'p', name: 'Garde', hp: 5, actions: [line('Ancienne')] });
  await store.updateProfile('p', { diceLines: [line('Nouvelle')] }, { propagate: true });
  const saved = persistence.peek();
  assert.deepEqual(saved.combat.participants[0].actions.map(item => item.note), ['Nouvelle']);
  store.duplicateProfile('p');
  await new Promise(resolve => setTimeout(resolve, 20));
  const copy = (await reload(persistence)).listProfiles().find(item => item.id !== 'p');
  assert.deepEqual(copy.diceLines.map(item => item.note), ['Nouvelle']);
});

test('E20 migration — profil stocké avec actions et diceLines divergents : diceLines l’emporte', async () => {
  const stored = { id: 'p', name: 'Orc', hp: 12, actions: [line('Obsolete')], diceLines: [line('Voulue')] };
  const { data, report } = migrateSnapshot({ schemaVersion: 2, reserve: [stored], combat: { round: 0, participants: [] }, diceLines: [], log: [] });
  assert.deepEqual(data.reserve[0].diceLines.map(item => item.note), ['Voulue']);
  assert.equal(Object.hasOwn(data.reserve[0], 'actions'), false);
  assert.ok(report.repaired.some(item => item.reason === 'actions-divergentes-ignorees'));

  const persistence = memoryPersistence({ format: 'snapshot-v2', schemaVersion: 2, reserve: [stored], combat: { round: 0, participants: [] }, diceLines: [], log: [] });
  const store = createStore({ persistence });
  await store.ready;
  assert.deepEqual(store.getProfile('p').diceLines.map(item => item.note), ['Voulue']);
});

test('E20 migration — profil stocké avec actions seules : actions conservées', () => {
  const { data } = migrateSnapshot({ schemaVersion: 2, reserve: [{ id: 'p', name: 'Orc', hp: 12, actions: [line('Seule')] }], combat: { round: 0, participants: [] }, diceLines: [], log: [] });
  assert.deepEqual(data.reserve[0].diceLines.map(item => item.note), ['Seule']);
});

test('E20 migration — diceLines vide à côté d’actions remplies (ancien sanitizeProfile) : actions conservées', async () => {
  // Les versions précédentes produisaient `diceLines: []` à côté des `actions`
  // d'un import texte et affichaient ces actions : elles ne doivent pas disparaître.
  const stored = { id: 'p', name: 'Orc', hp: 12, actions: [line('Importee')], diceLines: [] };
  const { data } = migrateSnapshot({ schemaVersion: 2, reserve: [stored], combat: { round: 0, participants: [] }, diceLines: [], log: [] });
  assert.deepEqual(data.reserve[0].diceLines.map(item => item.note), ['Importee']);
  assert.equal(Object.hasOwn(data.reserve[0], 'actions'), false);

  const persistence = memoryPersistence({ format: 'snapshot-v2', schemaVersion: 2, reserve: [stored], combat: { round: 0, participants: [] }, diceLines: [], log: [] });
  const store = createStore({ persistence });
  await store.ready;
  assert.deepEqual(store.getProfile('p').diceLines.map(item => item.note), ['Importee']);
  // Vider ensuite les actions reste possible : le patch fait foi, même vide.
  await store.updateProfile('p', { diceLines: [] });
  assert.deepEqual((await reload(persistence)).getProfile('p').diceLines, []);
});
