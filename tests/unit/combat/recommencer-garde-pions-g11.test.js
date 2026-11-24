// Passe G, lot G11 (décision du MJ du 24/11) : « Recommencer » une rencontre garde les pions des PNJ à leur case sur la carte.
// La carte reconnaît un pion par son `ref` (`mapRefOf`, contrat §3) et se souvient de la case d'un `ref` retiré (§7, C5) ;
// les participants recréés gardent des `id` neufs (le suivi des blessures reste attaché aux anciens), mais chacun reprend
// le `ref` de celui qu'il remplace : même ligne de rencontre (`source.encounterEntryId`), même rang dans cette ligne.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { mapRefOf } from '../../../js/core/map-link-state.js';

const memoryPersistence = () => { let saved = null; return { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } }; };

async function launched() {
  const store = createStore({ persistence: memoryPersistence(), storage: null });
  await store.ready;
  await store.addProfile({ id: 'gob', name: 'Gobelin', kind: 'PNJ', hp: 9, initiative: 30, caracs: { I: 30 } });
  await store.addProfile({ id: 'chef', name: 'Chef gobelin', kind: 'PNJ', hp: 14, initiative: 40, caracs: { I: 40 } });
  await store.saveEncounter({ id: 'pont', title: 'Pont', entries: [
    { id: 'l-gob', profileId: 'gob', quantity: 3, namePrefix: 'Gobelin', camp: 'ennemi', zone: 'active' },
    { id: 'l-chef', profileId: 'chef', quantity: 1, camp: 'ennemi', zone: 'active' }] });
  const launch = store.previewEncounterLaunch('pont');
  const dice = Object.fromEntries(launch.scene.participants.map((row, index) => [row.id, index + 1]));
  await store.applyCombatInitialization(store.previewCombatInitialization({ staging: launch, diceById: dice }));
  return store;
}
const refsByName = store => Object.fromEntries(store.listParticipants().map(row => [row.name, mapRefOf(row)]));
const idsOf = store => store.listParticipants().map(row => row.id).sort();

test('G11 · Recommencer par « Préparer » : chaque PNJ recréé garde le ref de carte de celui qu’il remplace', async () => {
  const store = await launched();
  const before = refsByName(store), oldIds = idsOf(store);
  assert.equal(Object.keys(before).length, 4, 'précondition : trois gobelins et un chef');
  const staging = store.previewCombatRestart();
  const dice = Object.fromEntries(staging.scene.participants.map((row, index) => [row.id, index + 1]));
  await store.applyCombatInitialization(store.previewCombatInitialization({ staging, diceById: dice }));
  assert.notDeepEqual(idsOf(store), oldIds, 'les participants sont bien recréés (id neufs)');
  assert.deepEqual(refsByName(store), before, 'mêmes ref de carte, nom par nom');
});

test('G11 · Recommencer direct (restartCombat) : mêmes ref de carte', async () => {
  const store = await launched();
  const before = refsByName(store), oldIds = idsOf(store);
  await store.restartCombat();
  assert.notDeepEqual(idsOf(store), oldIds, 'les participants sont bien recréés (id neufs)');
  assert.deepEqual(refsByName(store), before);
});

test('G11 · Recommencer deux fois de suite : le ref d’origine se transmet', async () => {
  const store = await launched();
  const before = refsByName(store);
  await store.restartCombat();
  await store.restartCombat();
  assert.deepEqual(refsByName(store), before);
});

test('G11 · un participant sans prédécesseur (ligne ajoutée à la rencontre) reçoit un ref neuf, sans doublon', async () => {
  const store = await launched();
  const before = new Set(Object.values(refsByName(store)));
  const encounter = store.listEncounters().find(row => row.id === 'pont');
  await store.saveEncounter({ ...encounter, entries: encounter.entries.map(row => row.id === 'l-gob' ? { ...row, quantity: 4 } : row) });
  await store.restartCombat();
  const refs = Object.values(refsByName(store));
  assert.equal(new Set(refs).size, refs.length, 'aucun ref en double');
  assert.equal(refs.filter(ref => !before.has(ref)).length, 1, 'seul le quatrième gobelin a un ref neuf');
});
