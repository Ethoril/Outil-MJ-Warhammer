import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}

test('E07 Store — executeCommand atomique et undo/redo persiste la frontière', () => {
  const store = createStore({ storage: storage() });
  const profile = { id: 'p1', name: 'Profil', hp: 10, initiative: 30 };
  const result = store.executeCommand('add-profile', draft => ({ ...draft, reserve: [profile] }));
  assert.equal(result.ok, true);
  assert.equal(store.getProfile('p1').name, 'Profil');
  assert.equal(store.canUndo(), true);
  assert.equal(store.undo(), true);
  assert.equal(store.getProfile('p1'), null);
  assert.equal(store.canRedo(), true);
  assert.equal(store.redo(), true);
  assert.equal(store.getProfile('p1').name, 'Profil');
  assert.equal(JSON.parse(store.getFullJSON()).localRevision, 3, 'undo/redo conservent une révision locale monotone');
});

test('E07 Store — un mutateur en erreur ne modifie ni état ni historique', () => {
  const store = createStore({ storage: storage() });
  assert.throws(() => store.executeCommand('failed', draft => {
    draft.reserve.push({ id: 'bad', name: 'Bad' });
    throw new Error('échec milieu commande');
  }), /échec milieu commande/);
  assert.equal(store.getProfile('bad'), null);
  assert.equal(store.canUndo(), false);
});

function deferredPersistence({ failCalls = [] } = {}) {
  let calls = 0;
  let persisted = null;
  return {
    get calls() { return calls; },
    async load() { return persisted; },
    async saveAtomic({ state }) {
      calls++;
      if (failCalls.includes(calls)) throw new Error('quota différé');
      persisted = structuredClone(state);
      return { ok: true };
    }
  };
}

test('E07 Store — deux commandes persistantes ne se chevauchent pas après l’échec de la première', async () => {
  const persistence = deferredPersistence({ failCalls: [2] });
  const store = createStore({ persistence });
  assert.deepEqual(await store.ready, { ok: true });
  const first = store.addProfile({ id: 'first', name: 'Refusé', hp: 1 });
  const second = store.addProfile({ id: 'second', name: 'Conservé', hp: 2 });
  assert.equal((await first).ok, false);
  assert.equal((await second).ok, true);
  assert.equal(store.getProfile('first'), null);
  assert.equal(store.getProfile('second').name, 'Conservé');
  assert.equal(JSON.parse(store.getFullJSON()).localRevision, 1);
  assert.equal(store.getHistory().past.length, 1);
});

test('E07 Store — le journal local ne consomme pas le geste undo d’une commande', async () => {
  const persistence = deferredPersistence();
  const store = createStore({ persistence });
  await store.ready;
  await store.addProfile({ id: 'profile-before-log', name: 'Profil', hp: 10 });
  await store.log('événement local');

  assert.equal(store.canUndo(), true);
  await store.undo();
  assert.equal(store.getProfile('profile-before-log'), null);
  assert.equal(store.getLog()[0].text, 'événement local');
  assert.equal(store.canUndo(), false);
});

test('E07 Store — une commande qui dépasse le budget est refusée avant le swap vivant', async () => {
  const persistence = deferredPersistence();
  const store = createStore({ persistence });
  await store.ready;
  await assert.rejects(
    store.executeCommand('oversized', draft => ({ ...draft, reserve: [{ id: 'huge', name: 'x'.repeat(2 * 1024 * 1024) }] })),
    /trop volumineuse/
  );
  assert.equal(store.getProfile('huge'), null);
  assert.equal(JSON.parse(store.getFullJSON()).localRevision, 0);
  assert.equal(store.getHistory().past.length, 0);
});
