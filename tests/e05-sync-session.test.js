import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { createPersistence } from '../js/core/persistence.js';
import { applyOperation } from '../js/core/sync-protocol.js';
import { createSyncSession, normalizeRemoteDocument } from '../js/core/sync-session.js';

const state = name => ({ schemaVersion: 2, reserve: [{ id: name }], combat: { round: 1, participants: [] } });
const localEnvelope = { schemaVersion: 2, reserve: [], combat: { round: 0, participants: [] }, log: [], diceLines: [] };

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

test('E05 session — Firebase null/maps vides sont normalisés sans envoyer les métadonnées', () => {
  assert.deepEqual(normalizeRemoteDocument(null), { revision: 0, state: {}, receipts: {} });
  assert.deepEqual(normalizeRemoteDocument({}), { revision: 0, state: {}, receipts: {} });
  const root = normalizeRemoteDocument({ revision: 0, state: {
    schemaVersion: 2, appVersion: '3.5.1', contextId: 'guest', writer: 'local', timestamp: 12,
    reserve: []
  } });
  assert.equal(root.state.appVersion, undefined);
  assert.equal(root.state.contextId, undefined);
  assert.deepEqual(root.state.reserve, []);
});

test('E05 session — sequence et révision persistent ensemble, rejeu après accusé perdu est sûr', async () => {
  const rootRef = { current: null };
  const persistence = createPersistence({ indexedDB, dbName: 'e05-session-replay', contextId: 'guest' });
  const session = createSyncSession({
    persistence, transport: transportFor(rootRef), deviceId: 'device-a'
  });
  await session.open({ initialState: localEnvelope });
  const operation = await session.enqueue({ state: state('first'), localState: localEnvelope });
  assert.equal(operation.sequence, 1);
  assert.deepEqual((await persistence.readSession()), { protocolVersion: 2, deviceId: 'device-a', sequence: 1, baseRevision: 0 });
  await session.flush({ localState: localEnvelope });
  assert.equal(rootRef.current.revision, 1);
  assert.deepEqual(await persistence.listOutbox(), []);
  // Simulate an acknowledgement lost after the remote commit: the durable
  // operation is replayable and the protocol returns duplicate without bumping revision.
  const replay = applyOperation(rootRef.current, operation);
  assert.equal(replay.status, 'duplicate');
  assert.equal(replay.document.revision, 1);
  persistence.close();
});

test('E05 session — deux actions hors ligne gardent des bases consécutives puis sont vidées au flush', async () => {
  const rootRef = { current: null };
  let online = false;
  const transport = {
    async read() { if (!online) throw new Error('offline'); return rootRef.current; },
    async transaction(operation) {
      const result = applyOperation(rootRef.current, operation);
      if (!result.applied) return { status: 'aborted', root: result.document };
      rootRef.current = result.document;
      return { status: 'committed', root: result.document };
    }
  };
  const persistence = createPersistence({ indexedDB, dbName: 'e05-offline-actions', contextId: 'guest' });
  const session = createSyncSession({ persistence, transport, deviceId: 'offline-device' });
  await session.open({ initialState: localEnvelope });
  const first = await session.enqueue({ state: state('one'), localState: localEnvelope });
  const second = await session.enqueue({ state: state('two'), localState: localEnvelope });
  assert.equal(first.baseRevision, 0);
  assert.equal(second.baseRevision, 1);
  online = true;
  const result = await session.flush({ localState: localEnvelope });
  assert.equal(result.status, 'synced');
  assert.equal(rootRef.current.revision, 2);
  persistence.close();
});

test('E05 session — un accusé perdu est acquitté par receipt à la reconnexion', async () => {
  const rootRef = { current: null };
  const persistence = createPersistence({ indexedDB, dbName: 'e05-lost-ack', contextId: 'guest' });
  const firstTransport = transportFor(rootRef);
  const first = createSyncSession({ persistence, transport: firstTransport, deviceId: 'device-a' });
  await first.open({ initialState: localEnvelope });
  const operation = await first.enqueue({ state: state('once'), localState: localEnvelope });
  rootRef.current = applyOperation(null, operation).document;
  const second = createSyncSession({ persistence, transport: firstTransport, deviceId: 'new-random-device' });
  const reconciled = await second.reconcile({ localState: localEnvelope });
  assert.equal(reconciled.status, 'synced');
  assert.deepEqual(await persistence.listOutbox(), []);
  assert.equal((await second.open()).session.deviceId, 'device-a');
  persistence.close();
});

test('E05 session — un échec d’écriture ne consomme pas la séquence', async () => {
  let fail = true;
  const stateStore = {
    value: structuredClone(localEnvelope),
    session: { protocolVersion: 2, deviceId: 'retry-device', sequence: 0, baseRevision: 0 },
    operations: []
  };
  const persistence = {
    async load() { return structuredClone(stateStore.value); },
    async readSession() { return stateStore.session && structuredClone(stateStore.session); },
    async listOutbox() { return stateStore.operations.map(operation => structuredClone(operation)); },
    async saveAtomic({ state, operations = [], session }) {
      if (fail) { fail = false; throw new Error('quota'); }
      stateStore.value = structuredClone(state);
      stateStore.session = structuredClone(session);
      stateStore.operations.push(...operations.map(operation => structuredClone(operation)));
    },
    async acknowledge(id) { stateStore.operations = stateStore.operations.filter(op => (op.operationId || `${op.deviceId}:${op.sequence}`) !== id); }
  };
  const session = createSyncSession({
    persistence,
    transport: { async read() { return null; }, async transaction() { throw new Error('offline'); } },
    deviceId: 'retry-device'
  });
  await assert.rejects(session.enqueue({ state: state('failed'), localState: localEnvelope }), /quota/);
  const operation = await session.enqueue({ state: state('retry'), localState: localEnvelope });
  assert.equal(operation.sequence, 1);
});

test('E05 session — deux contextes restent isolés et un CAS concurrent devient conflit', async () => {
  const rootRef = { current: null };
  const transport = transportFor(rootRef);
  const guestPersistence = createPersistence({ indexedDB, dbName: 'e05-contexts', contextId: 'guest' });
  const accountPersistence = createPersistence({ indexedDB, dbName: 'e05-contexts', contextId: 'account:a' });
  const guest = createSyncSession({ persistence: guestPersistence, transport, deviceId: 'guest-device' });
  const account = createSyncSession({ persistence: accountPersistence, transport, deviceId: 'account-device' });
  await guest.open({ initialState: localEnvelope });
  await account.open({ initialState: localEnvelope });
  await guest.enqueue({ state: state('guest'), localState: localEnvelope });
  await guest.flush({ localState: localEnvelope });
  await account.enqueue({ state: state('account'), localState: localEnvelope });
  const conflict = await account.flush({ localState: localEnvelope });
  assert.equal(conflict.status, 'conflict');
  assert.deepEqual(await accountPersistence.load(), localEnvelope);
  assert.equal((await guestPersistence.readSession()).deviceId, 'guest-device');
  assert.equal((await accountPersistence.readSession()).deviceId, 'account-device');
  guestPersistence.close();
  accountPersistence.close();
});

test('E05 session — une file E02 incompatible est purgée en gardant l’état local', async () => {
  const persistence = createPersistence({ indexedDB, dbName: 'e05-transition', contextId: 'guest' });
  await persistence.saveAtomic({
    state: localEnvelope,
    operations: [{ operationId: 'old-client:1', sequence: 1, updates: { 'reserve/p': null } }]
  });
  const session = createSyncSession({
    persistence,
    transport: { async read() { return null; }, async transaction() { throw new Error('ne doit pas envoyer'); } },
    deviceId: 'new-device'
  });
  await session.open();
  assert.deepEqual(await persistence.listOutbox(), []);
  assert.deepEqual(await persistence.load(), localEnvelope);
  assert.equal((await persistence.readSession()).deviceId, 'new-device');
  persistence.close();
});
