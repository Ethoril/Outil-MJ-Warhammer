// Recette du 22/11/2026 (R5-R7) : le navigateur a fermé la connexion IndexedDB
// et chaque sauvegarde échouait ensuite (« The database connection is closing »),
// bloquant toutes les commandes jusqu'au rechargement. La persistance doit rouvrir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { createPersistence } from '../../../js/core/persistence.js';

function factoryCapturingConnections() {
  const real = new IDBFactory();
  const connections = [];
  const wrapper = {
    open(...args) {
      const request = real.open(...args);
      request.addEventListener('success', () => connections.push(request.result));
      return request;
    },
    deleteDatabase: (...args) => real.deleteDatabase(...args)
  };
  return { indexedDB: wrapper, connections };
}

test('une connexion fermée par le navigateur est rouverte à la sauvegarde suivante', async () => {
  const { indexedDB, connections } = factoryCapturingConnections();
  const persistence = createPersistence({ indexedDB, dbName: 'test-connexion-fermee-1' });
  await persistence.saveAtomic({ state: { n: 1 } });
  // Fermeture anormale : le navigateur ferme la connexion et émet « close ».
  const db = connections.at(-1);
  db.close();
  db.onclose?.(new Event('close'));
  await persistence.saveAtomic({ state: { n: 2 } });
  const loaded = { state: await persistence.readState() };
  assert.equal(loaded?.state?.n, 2);
});

test('une connexion fermée sans événement « close » est rouverte une fois', async () => {
  const { indexedDB, connections } = factoryCapturingConnections();
  const persistence = createPersistence({ indexedDB, dbName: 'test-connexion-fermee-2' });
  await persistence.saveAtomic({ state: { n: 1 } });
  connections.at(-1).close();
  await persistence.saveAtomic({ state: { n: 3 } });
  const loaded = { state: await persistence.readState() };
  assert.equal(loaded?.state?.n, 3);
});
