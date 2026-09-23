import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { Profile } from '../js/core/models.js';

const localStorage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
};

test('E03 — le Store distingue attente, envoi et synchronisation locale', async () => {
  const statuses = [];
  let resolveWrite;
  const sync = {
    dbRef: 'test',
    onValue() {},
    update() { return new Promise(resolve => { resolveWrite = resolve; }); }
  };
  const store = createStore({ storage: localStorage(), sync, onSyncStatus: status => statuses.push(status) });
  store.addProfile(new Profile({ id: 'p', name: 'Profil', hp: 10 }));
  await new Promise(resolve => setTimeout(resolve, 320));
  assert.ok(statuses.includes('pending'));
  assert.ok(statuses.includes('sending'));
  resolveWrite();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(statuses.at(-1), 'synced');
});

test('E03 — une erreur de quota reste distincte de l’état réseau', () => {
  const statuses = [];
  const storage = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
  const store = createStore({ storage, onLocalStatus: status => statuses.push(status) });
  store.addProfile(new Profile({ id: 'p', name: 'Profil', hp: 10 }));
  assert.equal(statuses.at(-1), 'error');
});

test('E03 — chargement distant différé et mise à jour PWA restent non bloquants', () => {
  const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  const sync = readFileSync(new URL('../js/core/sync.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(main, /import\(`\.\/core\/sync\.js\$\{retryQuery\}`\)/);
  assert.doesNotMatch(main, /import \{ initFirebaseSync \} from '\.\/core\/sync\.js'/);
  assert.match(main, /\.catch\(error =>/);
  assert.match(main, /registration\.waiting\?\.postMessage/);
  assert.match(main, /registration\.addEventListener\('updatefound'/);
  assert.match(main, /registration\.installing/);
  assert.match(main, /Une mise à jour est prête\.[\s\S]*\}, 0\)/);
  assert.match(main, /dataset\.status !== 'saved'/);
  assert.match(main, /Mise à jour reportée/);
  assert.match(main, /window\.addEventListener\('online', startRemoteAdapter\)/);
  assert.match(sync, /window\.addEventListener\('online'/);
  assert.match(sync, /startAuth\(\);/);
  assert.match(sync, /initialized = false/);
  assert.doesNotMatch(sw, /\.then\(\(\) => self\.skipWaiting\(\)\)/);
  assert.match(sw, /wfrp-activate-update/);
  assert.match(sw, /wfrp-cache-v3\.6\.3/);
  assert.match(sw, /if \(cachedResponse\) \{\s*return cachedResponse;\s*\}/);
  assert.doesNotMatch(sw, /Mise à jour silencieuse/);
});
