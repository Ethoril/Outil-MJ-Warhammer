import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { createStore, KEY } from '../js/core/store.js';
import { createPersistence } from '../js/core/persistence.js';
import { Profile } from '../js/core/models.js';

function legacyStorage(values) {
  const writes = [];
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { writes.push([key, value]); values.set(key, value); },
    writes
  };
}

function waitFor(check, timeout = 500) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (await check()) return resolve();
      if (Date.now() - started > timeout) return reject(new Error('condition non atteinte'));
      setTimeout(tick, 5);
    };
    tick();
  });
}

test('E04 Store — réhydrate journal/extensions dans IDB et conserve la source legacy brute', async () => {
  const values = new Map([
    [KEY.RESERVE, JSON.stringify([{ id: 'p', name: 'Garde', hp: 10, customRule: { keep: true } }])],
    [KEY.COMBAT, JSON.stringify({ round: 2, participants: [] })],
    [KEY.LOG, JSON.stringify(['entrée historique'])],
    [KEY.DICE, JSON.stringify([])],
    [KEY.TS, '42']
  ]);
  const storage = legacyStorage(values);
  const persistence = createPersistence({ indexedDB, dbName: 'e04-store-hydrate', contextId: 'guest' });
  const store = createStore({ storage, persistence, appVersion: '3.5.1' });

  const ready = await store.ready;
  assert.deepEqual(ready, { ok: true });
  assert.equal(store.getProfile('p').name, 'Garde');
  assert.deepEqual(store.getProfile('p').extensions, { customRule: { keep: true } });
  assert.equal(store.getLog()[0].text, 'entrée historique');
  assert.deepEqual(storage.writes, [], 'la migration ne réécrit jamais localStorage');

  const restores = await persistence.listRestorePoints();
  assert.equal(restores.length, 1);
  assert.equal(restores[0].reason, 'migration');
  assert.equal(restores[0].state.format, 'legacy-localStorage');
  assert.equal(restores[0].state.keys[KEY.RESERVE], values.get(KEY.RESERVE));

  store.addProfile(new Profile({ id: 'q', name: 'Bête', hp: 7 }));
  await waitFor(async () => (await persistence.load())?.reserve?.some(profile => profile.id === 'q'));
  const saved = await persistence.load();
  assert.ok(saved.reserve.some(profile => profile.id === 'q'));
  persistence.close();
});

test('E04 Store — un import remplaçant attend IDB et laisse l’état vivant intact en cas d’échec', async () => {
  let fail = false;
  const initial = {
    schemaVersion: 2,
    reserve: [{ id: 'old', name: 'Ancien', hp: 8 }],
    combat: { round: 0, order: [], participants: [] },
    log: [],
    diceLines: []
  };
  const persistence = {
    async load() { return structuredClone(initial); },
    async saveAtomic({ state }) {
      if (fail) throw new Error('quota dépassé');
      return { saved: state !== undefined };
    }
  };
  const store = createStore({ persistence, appVersion: '3.5.1' });
  assert.deepEqual(await store.ready, { ok: true });
  fail = true;
  await assert.rejects(
    store.loadFromJSON(JSON.stringify({
      schemaVersion: 2,
      reserve: [{ id: 'new', name: 'Nouveau', hp: 12 }],
      combat: { round: 0, order: [], participants: [] },
      log: [],
      diceLines: []
    })),
    /quota dépassé/
  );
  assert.equal(store.getProfile('old').name, 'Ancien');
  assert.equal(store.getProfile('new'), null);
});

test('E04 Store — une erreur d’hydratation met le Store en récupération sans écrire', async () => {
  let writes = 0;
  let unavailable = true;
  const persistence = {
    async load() {
      if (unavailable) throw new Error('IDB indisponible');
      return { schemaVersion: 2, reserve: [], combat: { round: 0, order: [], participants: [] }, log: [], diceLines: [] };
    },
    async saveAtomic() { writes++; }
  };
  const store = createStore({ persistence });
  const ready = await store.ready;
  assert.equal(ready.ok, false);
  store.addProfile(new Profile({ id: 'blocked', name: 'Bloqué', hp: 1 }));
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(writes, 0);
  assert.equal(store.getProfile('blocked'), null);
  unavailable = false;
  assert.deepEqual(await store.retryHydration(), { ok: true });
  store.addProfile(new Profile({ id: 'allowed', name: 'Rétabli', hp: 1 }));
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(writes, 1);
});

test('E04 Store — prévisualise et restaure un point scoped, avec sauvegarde avant remplacement', async () => {
  const persistence = createPersistence({ indexedDB, dbName: 'e04-store-restore-api', contextId: 'guest' });
  const store = createStore({ persistence, appVersion: '3.5.1' });
  assert.deepEqual(await store.ready, { ok: true });
  const target = {
    schemaVersion: 2,
    reserve: [{ id: 'restored', name: 'Restauré', hp: 12 }],
    combat: { round: 0, order: [], participants: [] },
    log: [], diceLines: [], localRevision: 4
  };
  await persistence.saveAtomic({
    state: JSON.parse(store.getFullJSON()),
    restore: { id: 'chosen', reason: 'manual', state: target }
  });
  const listed = await store.listRestorePoints();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].id, 'guest:chosen');
  const preview = await store.previewRestorePoint('guest:chosen');
  assert.equal(preview.data.reserve[0].id, 'restored');
  assert.equal(preview.counts.profiles, 1);

  await store.addProfile(new Profile({ id: 'before-restore', name: 'Avant', hp: 3 }));
  const revision = store.getLocalRevision();
  const result = await store.restorePoint('guest:chosen', { expectedRevision: revision });
  assert.equal(result.status, 'restored');
  assert.equal(store.getProfile('restored').name, 'Restauré');
  assert.equal(store.getProfile('before-restore'), null);
  const after = await persistence.listRestorePoints();
  assert.ok(after.some(point => point.reason === 'restore-before'));
  persistence.close();
});

test('E04 Store — une édition pendant la lecture d’un point rend la restauration périmée', async () => {
  let release;
  let writes = 0;
  const target = {
    schemaVersion: 2,
    reserve: [{ id: 'restored-race', name: 'Ne doit pas écraser', hp: 12 }],
    combat: { round: 0, order: [], participants: [] }, log: [], diceLines: []
  };
  const persistence = {
    async load() { return { schemaVersion: 2, reserve: [], combat: { round: 0, order: [], participants: [] }, log: [], diceLines: [] }; },
    async saveAtomic({ state }) { writes++; return { ok: true, state }; },
    async listRestorePoints() {
      return new Promise(resolve => { release = () => resolve([{ id: 'guest:race', contextId: 'guest', createdAt: 1, reason: 'manual', state: target }]); });
    }
  };
  const store = createStore({ persistence });
  assert.deepEqual(await store.ready, { ok: true });
  const pending = store.restorePoint('guest:race');
  while (typeof release !== 'function') await new Promise(resolve => setTimeout(resolve, 0));
  await store.addProfile(new Profile({ id: 'kept-race', name: 'Conservé', hp: 3 }));
  release();
  assert.equal((await pending).status, 'stale');
  assert.equal(store.getProfile('kept-race').name, 'Conservé');
  assert.equal(store.getProfile('restored-race'), null);
  assert.equal(writes, 1);
});

test('E04 Store — l’import verrouille les mutations concurrentes et clone l’état en file', async () => {
  let release;
  const savedStates = [];
  const persistence = {
    async load() {
      return { schemaVersion: 2, reserve: [], combat: { round: 0, order: [], participants: [] }, log: [], diceLines: [] };
    },
    async saveAtomic({ state }) {
      savedStates.push(state);
      if (savedStates.length === 1) {
        return new Promise(resolve => { release = () => resolve({ saved: true }); });
      }
      return { saved: true };
    }
  };
  const store = createStore({ persistence });
  await store.ready;
  const pending = store.loadFromJSON(JSON.stringify({
    schemaVersion: 2,
    reserve: [{ id: 'imported', name: 'Importé', hp: 12 }],
    combat: { round: 0, order: [], participants: [] },
    log: [],
    diceLines: []
  }));
  assert.equal(store.addProfile(new Profile({ id: 'raced', name: 'Course', hp: 1 })), false);
  await waitFor(() => typeof release === 'function');
  release();
  await pending;
  assert.equal(store.getProfile('raced'), null);
  assert.equal(store.getProfile('imported').name, 'Importé');

  // Le snapshot est figé avant l’exécution de la transaction, même si l’objet
  // passé à addProfile est ensuite modifié par le code appelant.
  const profile = new Profile({ id: 'cloned', name: 'Avant', hp: 3 });
  store.addProfile(profile);
  profile.name = 'Après';
  await new Promise(resolve => queueMicrotask(resolve));
  assert.equal(savedStates.at(-1).reserve.find(item => item.id === 'cloned')?.name, 'Avant');
  release();
});
