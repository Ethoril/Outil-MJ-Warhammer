import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { Profile, Participant } from '../js/core/models.js';

const wait = (ms = 340) => new Promise(resolve => setTimeout(resolve, ms));
const localStorage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
};

function deferredSync() {
  const sync = { dbRef: 'test', calls: [], pending: [], onValue() {} };
  sync.update = (ref, payload) => new Promise((resolve, reject) => {
    sync.calls.push(payload);
    sync.pending.push({ resolve, reject });
  });
  return sync;
}

test('E02 — les modifications arrivées pendant un envoi forment un second lot', async () => {
  const sync = deferredSync();
  const store = createStore({ storage: localStorage(), sync });
  store.addProfile(new Profile({ id: 'p', name: 'Initial', hp: 10 }));
  await wait();
  assert.equal(sync.calls.length, 1);

  store.updateProfile('p', { hp: 7 });
  assert.equal(sync.calls.length, 1, 'la modification concurrente ne doit pas contaminer le lot en vol');
  assert.equal(sync.calls[0]['reserve/p'].hp, 10, 'le lot en vol doit être isolé des objets mutés ensuite');
  sync.pending.shift().resolve();
  await wait();

  assert.equal(sync.calls.length, 2);
  assert.equal(sync.calls[1]['reserve/p'].hp, 7);
});

test('E02 — une écriture parent et son ajout enfant sont fusionnés sans chemins recouvrants', async () => {
  const sync = deferredSync();
  const store = createStore({ storage: localStorage() });
  store.addProfile(new Profile({ id: 'avant', name: 'Avant', hp: 10 }));
  store.attachSync(sync);
  store.addProfile(new Profile({ id: 'apres', name: 'Après', hp: 12 }));
  await wait();

  assert.equal(sync.calls.length, 1);
  const payload = sync.calls[0];
  assert.ok(payload.reserve && payload.reserve.avant && payload.reserve.apres);
  assert.equal(Object.keys(payload).some(key => key === 'reserve/apres'), false);
  sync.pending[0].resolve();
});

test('E02 — une suppression parent suivie d’un ajout recrée le sous-arbre courant', async () => {
  const sync = deferredSync();
  const store = createStore({ storage: localStorage(), sync: null });
  store.addProfile(new Profile({ id: 'ancien', name: 'Ancien', hp: 10 }));
  store.attachSync(sync);
  store.clearReserve();
  store.addProfile(new Profile({ id: 'nouveau', name: 'Nouveau', hp: 12 }));
  await wait();

  assert.equal(sync.calls.length, 1);
  assert.deepEqual(Object.keys(sync.calls[0].reserve), ['nouveau']);
  sync.pending[0].resolve();
});

test('E02 — un journal local ne rend pas un instantané distant légitime obsolète', async () => {
  const sync = deferredSync();
  let listener;
  sync.onValue = (ref, callback) => { listener = callback; };
  const store = createStore({ storage: localStorage(), sync });
  store.addProfile(new Profile({ id: 'local', name: 'Local', hp: 10 }));
  await wait();
  const stateTimestamp = sync.calls[0].timestamp;
  sync.pending.shift().resolve();
  store.log('entrée locale');
  listener({ val: () => ({ writer: 'other', timestamp: stateTimestamp + 1, reserve: [{ id: 'distant', name: 'Distant' }] }) });
  assert.equal(store.getReserve().has('distant'), true);
});

test('E02 — un instantané ancien est ignoré sans faux réalignement distant', async () => {
  const sync = deferredSync();
  let listener;
  sync.onValue = (ref, callback) => { listener = callback; };
  const store = createStore({ storage: localStorage(), sync });
  store.addProfile(new Profile({ id: 'local', name: 'Local', hp: 10 }));
  await wait();
  const localTimestamp = sync.calls[0].timestamp;
  sync.pending.shift().resolve();
  await wait(0);
  sync.calls.length = 0;

  listener({ val: () => ({
    writer: 'other', timestamp: localTimestamp - 1,
    reserve: [{ id: 'ancien', name: 'Ancien' }]
  }) });
  await wait(0);

  assert.equal(sync.calls.length, 0, 'le signal local ne doit pas publier un réalignement fantôme');
  assert.match(store.getLog()[0].text, /conservées localement/);
  assert.equal(store.getReserve().has('local'), true);
  assert.equal(store.getReserve().has('ancien'), false);
});

test('E02 — un échec conserve le lot et le rejoue après reprise', async () => {
  const sync = deferredSync();
  const store = createStore({ storage: localStorage(), sync });
  store.addParticipant(new Participant({ id: 'c', name: 'Combattant', hp: 10 }));
  await wait();
  assert.equal(sync.calls.length, 1);
  const firstPayload = JSON.stringify(sync.calls[0]);
  sync.pending.shift().reject(new Error('réseau indisponible'));
  await wait(360);

  assert.equal(sync.calls.length, 2);
  assert.equal(JSON.stringify(sync.calls[1]), firstPayload);
  sync.pending.shift().resolve();
});
