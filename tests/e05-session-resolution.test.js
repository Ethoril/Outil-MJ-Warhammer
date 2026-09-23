import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { createPersistence } from '../js/core/persistence.js';
import { applyOperation, createOperation } from '../js/core/sync-protocol.js';
import { createSyncSession } from '../js/core/sync-session.js';

const local = {
  schemaVersion: 2,
  reserve: [{ id: 'local', name: 'Local' }],
  combat: { round: 0, participants: [] },
  log: [{ id: 'log-1', kind: 'management', text: 'local' }],
  diceLines: [{ id: 'dice-1', value: 42 }]
};

const remoteState = {
  schemaVersion: 2,
  reserve: [{ id: 'remote', name: 'Distant' }],
  combat: { round: 1, participants: [] }
};

function transportFor(rootRef) {
  return {
    async read() { return rootRef.current; },
    async transaction(operation) {
      const result = applyOperation(rootRef.current, operation);
      if (!result.applied) return { status: 'aborted', root: result.document };
      rootRef.current = result.document;
      return { status: 'committed', root: result.document };
    }
  };
}

test('E05 résolution distante persiste le choix fusionné avant le rendu et le reload', async () => {
  const dbName = `e05-resolution-remote-${Date.now()}`;
  const rootRef = { current: null };
  const persistence = createPersistence({ indexedDB, dbName, contextId: 'guest' });
  const session = createSyncSession({ persistence, transport: transportFor(rootRef), deviceId: 'local-device' });
  await session.open({ initialState: local });
  await session.enqueue({ state: { ...local, reserve: [{ id: 'queued', name: 'En file' }] }, localState: local });
  const external = createOperation({ deviceId: 'other-device', sequence: 1, baseRevision: 0, state: remoteState });
  rootRef.current = applyOperation(rootRef.current, external).document;

  // The queued operation is based on revision zero; the current root is at one.
  const conflict = await session.flush({ localState: local });
  assert.equal(conflict.status, 'conflict');
  await session.resolveRemote({ localState: local });
  assert.equal((await persistence.listOutbox()).length, 0);
  const saved = await persistence.load();
  assert.equal(saved.reserve[0].id, 'remote');
  assert.equal(saved.log[0].text, 'local');

  persistence.close();
  const reloadedPersistence = createPersistence({ indexedDB, dbName, contextId: 'guest' });
  const reloaded = createSyncSession({ persistence: reloadedPersistence, transport: transportFor(rootRef), deviceId: 'new-process' });
  const opened = await reloaded.open();
  assert.equal(opened.localState.reserve[0].id, 'remote');
  assert.equal(opened.localState.log[0].text, 'local');
  reloadedPersistence.close();
});

test('E05 résolution locale recale la séquence sur le reçu distant', async () => {
  const dbName = `e05-resolution-local-${Date.now()}`;
  const rootRef = { current: null };
  const persistence = createPersistence({ indexedDB, dbName, contextId: 'guest' });
  const session = createSyncSession({ persistence, transport: transportFor(rootRef), deviceId: 'local-device' });
  await session.open({ initialState: local });
  await session.enqueue({ state: local, localState: local });
  const external = createOperation({ deviceId: 'other-device', sequence: 1, baseRevision: 0, state: remoteState });
  rootRef.current = applyOperation(rootRef.current, external).document;
  assert.equal((await session.flush({ localState: local })).status, 'conflict');
  const result = await session.resolveLocal({ state: local, localState: local });
  assert.equal(result.status, 'synced');
  assert.equal(rootRef.current.revision, 2);
  assert.equal(rootRef.current.receipts['local-device'], 1);
  persistence.close();
});

test('E05 document sync corrompu reste une erreur, pas un statut hors-ligne', async () => {
  const statuses = [];
  const persistence = {
    async load() { return structuredClone(local); },
    async saveAtomic() {},
    async listOutbox() { return []; },
    async readSession() { return null; }
  };
  const session = createSyncSession({
    persistence,
    transport: { async read() { return { revision: 1, state: {}, receipts: {}, unexpected: true }; }, async transaction() {} },
    deviceId: 'local-device', onStatus: status => statuses.push(status)
  });
  await assert.rejects(session.open(), /Clé étrangère/);
  assert.equal(statuses.at(-1), 'error');
});
