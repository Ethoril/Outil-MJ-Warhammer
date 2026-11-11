import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from '../../../js/core/store.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const memoryPersistence = () => {
  let state = null;
  return {
    async load() { return state && structuredClone(state); },
    async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; }
  };
};
// Une partie jouée avec persistance : c'est elle qui enregistre l'historique d'annulation.
const played = async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile({ id: 'garde', name: 'Garde', hp: 12, initiative: 30 });
  await store.saveEncounter({ id: 'cour', title: 'Cour', entries: [{ id: 'entree', profileId: 'garde', zone: 'active' }] });
  await store.launchEncounter('cour');
  await store.updateParticipant(store.listParticipants()[0].id, { hp: 7 });
  return store;
};

test('COMP-ZONESNON-07 — le fichier de sauvegarde n’embarque pas l’historique d’annulation', async () => {
  const store = await played();
  const full = JSON.parse(store.getFullJSON());
  assert.ok(full.history?.past?.length > 0, 'précondition : l’enveloppe complète porte l’historique');
  const file = JSON.parse(store.getFullJSON({ includeHistory: false }));
  assert.equal(Object.hasOwn(file, 'history'), false);
  // `exportedAt` est l'instant de chaque export : il diffère d'un appel à l'autre.
  const { history, exportedAt, ...withoutHistory } = full;
  const { exportedAt: fileExportedAt, ...fileContent } = file;
  assert.equal(typeof fileExportedAt, 'string');
  assert.deepEqual(fileContent, withoutHistory, 'tout le reste de la partie est exporté à l’identique');
  assert.equal(store.canUndo(), true, 'exporter ne vide pas l’historique de la partie en cours');
});

test('COMP-ZONESNON-07 — un fichier sans historique se recharge avec la même partie', async () => {
  const source = await played();
  const file = source.getFullJSON({ includeHistory: false });
  const target = createStore({ persistence: memoryPersistence() });
  await target.ready;
  await target.loadFromJSON(file);
  const people = store => store.listParticipants().map(row => [row.name, row.hp, row.maxHp]);
  assert.deepEqual(people(target), people(source));
  const profiles = store => JSON.parse(store.getFullJSON()).reserve.map(row => row.id);
  assert.deepEqual(profiles(target), profiles(source));
});

test('COMP-ZONESNON-07 — le bouton « Sauvegarder » demande l’export sans historique', () => {
  const main = readFileSync(resolve(root, 'js/main.js'), 'utf8');
  const handler = main.slice(main.indexOf("on(DOM.combat.btnSaveFile, 'click'"), main.indexOf('wfrp-save-'));
  assert.match(handler, /Store\.getFullJSON\(\{ includeHistory: false \}\)/);
});
