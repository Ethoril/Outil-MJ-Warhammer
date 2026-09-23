import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { createPersistence } from '../js/core/persistence.js';
import { applyOperation } from '../js/core/sync-protocol.js';
import { createSyncSession } from '../js/core/sync-session.js';
import { createStore } from '../js/core/store.js';

const emptyState = {
  schemaVersion: 2,
  reserve: [],
  combat: { round: 0, order: [], participants: [] },
  log: [],
  diceLines: []
};

const state = name => ({
  ...emptyState,
  reserve: [{ id: name, name }]
});

function transportFor(rootRef, { online = true, loseAck = false } = {}) {
  return {
    async read() {
      if (!online) throw new Error('offline');
      return rootRef.current;
    },
    async transaction(operation) {
      if (!online) throw new Error('offline');
      const result = applyOperation(rootRef.current, operation);
      if (!result.applied) return { status: 'aborted', root: result.document };
      rootRef.current = result.document;
      if (loseAck) throw new Error('ack perdu après commit');
      return { status: 'committed', root: result.document };
    }
  };
}

test('E05 revue — trois opérations hors-ligne survivent à reload puis se vident sans conflit', async () => {
  const dbName = `e05-review-reload-${Date.now()}-a`;
  const rootRef = { current: null };
  const persistence = createPersistence({ indexedDB, dbName, contextId: 'guest' });
  const offline = createSyncSession({
    persistence,
    transport: transportFor(rootRef, { online: false }),
    deviceId: 'durable-device'
  });
  await offline.open({ initialState: emptyState });
  await offline.enqueue({ state: state('one'), localState: emptyState });
  await offline.enqueue({ state: state('two'), localState: state('one') });
  await offline.enqueue({ state: state('three'), localState: state('two') });
  assert.equal((await persistence.listOutbox()).length, 3);
  persistence.close();

  const reloadedPersistence = createPersistence({ indexedDB, dbName, contextId: 'guest' });
  const reloaded = createSyncSession({
    persistence: reloadedPersistence,
    transport: transportFor(rootRef),
    deviceId: 'new-process-device'
  });
  const result = await reloaded.flush({ localState: state('three') });
  assert.equal(result.status, 'synced', JSON.stringify({ result, outbox: await reloadedPersistence.listOutbox() }));
  assert.equal(rootRef.current.revision, 3);
  assert.deepEqual(await reloadedPersistence.listOutbox(), []);
  assert.equal((await reloadedPersistence.readSession()).deviceId, 'durable-device');
  reloadedPersistence.close();
});

test('E05 revue — accusé perdu puis reconcile par receipt ne signale pas de conflit', async () => {
  const dbName = `e05-review-ack-${Date.now()}-b`;
  const rootRef = { current: null };
  const persistence = createPersistence({ indexedDB, dbName, contextId: 'guest' });
  const first = createSyncSession({
    persistence,
    transport: transportFor(rootRef, { loseAck: true }),
    deviceId: 'ack-device'
  });
  await first.open({ initialState: emptyState });
  await first.enqueue({ state: state('once'), localState: emptyState });
  await assert.rejects(first.flush({ localState: state('once') }), /ack perdu/);
  assert.equal(rootRef.current.revision, 1);

  const statuses = [];
  const conflicts = [];
  const afterReload = createSyncSession({
    persistence,
    transport: transportFor(rootRef),
    deviceId: 'new-process-device',
    onStatus: status => statuses.push(status),
    onConflict: conflict => conflicts.push(conflict)
  });
  const result = await afterReload.reconcile({ localState: state('once') });
  assert.equal(result.status, 'synced');
  assert.equal(conflicts.length, 0);
  assert.equal(statuses.includes('conflict'), false);
  assert.deepEqual(await persistence.listOutbox(), []);
  persistence.close();
});

test('E05 revue — échec saveAtomic pendant enqueue conserve la séquence disponible', async () => {
  let failNext = false;
  const saved = { state: structuredClone(emptyState), session: null, operations: [] };
  const persistence = {
    async load() { return structuredClone(saved.state); },
    async readSession() { return structuredClone(saved.session); },
    async listOutbox() { return structuredClone(saved.operations); },
    async saveAtomic({ state: nextState, operations = [], session }) {
      if (failNext) {
        failNext = false;
        throw new Error('quota');
      }
      if (nextState !== undefined) saved.state = structuredClone(nextState);
      if (session !== undefined) saved.session = structuredClone(session);
      saved.operations.push(...structuredClone(operations));
    },
    async acknowledge(operationId) {
      saved.operations = saved.operations.filter(operation =>
        (operation.operationId || `${operation.deviceId}:${operation.sequence}`) !== operationId);
    }
  };
  const session = createSyncSession({
    persistence,
    transport: { async read() { return null; }, async transaction() { throw new Error('offline'); } },
    deviceId: 'retry-sequence-device'
  });
  await session.open({ initialState: emptyState });
  failNext = true;
  await assert.rejects(session.enqueue({ state: state('failed'), localState: state('failed') }), /quota/);
  const operation = await session.enqueue({ state: state('retry'), localState: state('retry') });
  assert.equal(operation.sequence, 1);
  assert.deepEqual(saved.operations.map(item => item.sequence), [1]);
});

test('E05 revue — clearOutbox respecte les contextes et conserve l’état local', async () => {
  const dbName = `e05-review-clear-${Date.now()}-c`;
  const guest = createPersistence({ indexedDB, dbName, contextId: 'guest' });
  const account = createPersistence({ indexedDB, dbName, contextId: 'account:a' });
  await guest.saveAtomic({ state: state('guest'), operations: [{ operationId: 'guest:1', deviceId: 'guest', sequence: 1 }] });
  await account.saveAtomic({ state: state('account'), operations: [{ operationId: 'account:1', deviceId: 'account', sequence: 1 }] });
  await guest.clearOutbox();
  assert.deepEqual(await guest.listOutbox(), []);
  assert.equal((await guest.load()).reserve[0].id, 'guest');
  assert.equal((await account.listOutbox()).length, 1);
  assert.equal((await account.load()).reserve[0].id, 'account');
  guest.close();
  account.close();
});

test('E05 revue — aller-retour compte A / invité / compte B garde trois espaces isolés', async () => {
  const records = new Map([
    ['guest', structuredClone(emptyState)],
    ['account:a', state('account-a')],
    ['account:b', state('account-b')]
  ]);
  const factory = contextId => ({
    async load() { return structuredClone(records.get(contextId) || emptyState); },
    async saveAtomic({ state: nextState }) {
      if (nextState !== undefined) records.set(contextId, structuredClone(nextState));
    }
  });
  const store = createStore({
    storage: null,
    persistence: factory('guest'),
    persistenceFactory: factory,
    contextId: 'guest'
  });
  await store.ready;
  await store.switchContext('account:a');
  assert.equal(store.getProfile('account-a').name, 'account-a');
  assert.equal(store.getProfile('account-b'), null);
  await store.switchContext('guest');
  assert.equal(store.getProfile('account-a'), null);
  await store.switchContext('account:b');
  assert.equal(store.getProfile('account-b').name, 'account-b');
  assert.equal(store.getProfile('account-a'), null);
});
