import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { createPersistence } from '../js/core/persistence.js';
import { createSyncSession } from '../js/core/sync-session.js';
import { applyOperation, createSyncDocument } from '../js/core/sync-protocol.js';
import { createStore } from '../js/core/store.js';

const envelope = extra => ({
  schemaVersion: 2, reserve: [], combat: { round: 0, order: [], participants: [] },
  log: [], diceLines: [], ...extra
});

function transport(rootRef, { delayed = false } = {}) {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  return {
    release() { release?.(); },
    async read() { return rootRef.current; },
    async transaction(operation) {
      if (delayed) await gate;
      const result = applyOperation(rootRef.current, operation);
      if (result.applied) rootRef.current = result.document;
      return result.applied ? { status: 'committed', root: result.document } : { status: 'aborted', root: result.document };
    }
  };
}

test('sync session — une transaction réseau suspendue ne bloque pas la deuxième commande IDB', async () => {
  const persistence = createPersistence({ indexedDB, dbName: 'race-transport-queue', contextId: 'guest' });
  const rootRef = { current: null };
  const network = transport(rootRef, { delayed: true });
  const session = createSyncSession({ persistence, transport: network, deviceId: 'race-device' });
  await session.open({ initialState: envelope() });
  await session.enqueue({ state: envelope({ reserve: [{ id: 'one' }] }), localState: envelope({ reserve: [{ id: 'one' }] }) });
  const flushing = session.flush();
  await new Promise(resolve => setTimeout(resolve, 5));
  const second = session.enqueue({ state: envelope({ reserve: [{ id: 'two' }] }), localState: envelope({ reserve: [{ id: 'two' }] }) });
  await Promise.race([second, new Promise((_, reject) => setTimeout(() => reject(new Error('enqueue bloqué par réseau')), 250))]);
  const secondFlush = session.flush();
  network.release();
  await Promise.all([flushing, secondFlush]);
  assert.equal(rootRef.current.revision, 2);
  assert.deepEqual(await persistence.listOutbox(), []);
  assert.deepEqual((await persistence.load()).reserve, [{ id: 'two' }]);
  persistence.close();
});

test('sync session — un état marqué avant handshake garde le local au lieu d’adopter le distant', async () => {
  const persistence = createPersistence({ indexedDB, dbName: 'race-pending-handshake', contextId: 'guest' });
  const local = envelope({ syncPending: true, reserve: [{ id: 'local', name: 'Local' }] });
  await persistence.saveAtomic({ state: local });
  const rootRef = { current: createSyncDocument(envelope({ reserve: [{ id: 'remote', name: 'Distant' }] })) };
  const session = createSyncSession({ persistence, transport: transport(rootRef), deviceId: 'pending-device' });
  const opened = await session.open({ initialState: local });
  assert.equal(opened.remote.revision, 0);
  assert.equal((await persistence.load()).reserve[0].id, 'local');
  const reconciled = await session.reconcile({ localState: local });
  assert.equal(reconciled.status, 'conflict');
  assert.equal((await persistence.load()).reserve[0].id, 'local');
  persistence.close();
});

test('Store — une édition pendant read() du handshake reste durable et est rejouée après rechargement', async () => {
  const persistence = createPersistence({ indexedDB, dbName: 'race-store-handshake', contextId: 'guest' });
  const rootRef = { current: createSyncDocument(envelope({ reserve: [{ id: 'remote', name: 'Distant' }] })) };
  let releaseRead;
  let readStarted;
  const readGate = new Promise(resolve => { releaseRead = resolve; });
  const started = new Promise(resolve => { readStarted = resolve; });
  const network = {
    async read() { readStarted(); await readGate; return rootRef.current; },
    async transaction(operation) {
      const result = applyOperation(rootRef.current, operation);
      if (result.applied) rootRef.current = result.document;
      return result.applied ? { status: 'committed', root: result.document } : { status: 'aborted', root: result.document };
    }
  };
  const store = createStore({ persistence });
  await store.ready;
  store.attachSync({ dbRef: {}, contextId: 'guest', createSession: options => createSyncSession({ ...options, transport: network }) });
  await started;
  await store.addProfile({ id: 'local-during-handshake', name: 'Local', hp: 10 });
  assert.equal((await persistence.load()).syncPending, true);
  releaseRead();
  const conflictExport = () => { try { return store.exportSyncConflict(); } catch { return null; } };
  for (let i = 0; i < 150 && conflictExport() === null; i++) await new Promise(resolve => setTimeout(resolve, 2));
  assert.ok(conflictExport()?.includes('local-during-handshake'));
  assert.ok(conflictExport()?.includes('remote'));
  assert.equal(rootRef.current.state.reserve[0].id, 'remote', 'un conflit ne publie pas localement par surprise');
  assert.equal((await persistence.load()).syncPending, true);
  store.detachSync();
  persistence.close();
});

test('Store — undo/redo publient chacune une révision distante atomique', async () => {
  const persistence = createPersistence({ indexedDB, dbName: 'race-undo-remote', contextId: 'guest' });
  const rootRef = { current: null };
  const network = transport(rootRef);
  const store = createStore({ persistence });
  await store.ready;
  store.attachSync({ dbRef: {}, contextId: 'guest', createSession: options => createSyncSession({ ...options, transport: network }) });
  for (let i = 0; i < 100; i++) {
    if (rootRef.current || store.getLocalRevision() > 0) break;
    await new Promise(resolve => setTimeout(resolve, 2));
  }
  await store.addProfile({ id: 'p', name: 'Profil', hp: 10 });
  for (let i = 0; i < 100 && (rootRef.current?.revision || 0) < 1; i++) await new Promise(resolve => setTimeout(resolve, 2));
  assert.equal(rootRef.current?.revision, 1);
  await store.undo();
  for (let i = 0; i < 100 && (rootRef.current?.revision || 0) < 2; i++) await new Promise(resolve => setTimeout(resolve, 2));
  assert.equal(rootRef.current?.revision, 2);
  await store.redo();
  for (let i = 0; i < 100 && (rootRef.current?.revision || 0) < 3; i++) await new Promise(resolve => setTimeout(resolve, 2));
  assert.equal(rootRef.current?.revision, 3);
  persistence.close();
});

test('Store — une réconciliation distante conserve les archives locales et pose une frontière historique', async () => {
  const persistence = createPersistence({ indexedDB, dbName: 'race-remote-metadata', contextId: 'guest' });
  await persistence.saveAtomic({ state: envelope({ archives: [{ id: 'archive-local' }], history: { past: [], future: [], boundary: null } }) });
  const rootRef = { current: createSyncDocument(envelope({ reserve: [{ id: 'remote', name: 'Distant' }] }), { revision: 4 }) };
  const store = createStore({ persistence });
  await store.ready;
  const network = transport(rootRef);
  store.attachSync({ dbRef: {}, contextId: 'guest', createSession: options => createSyncSession({ ...options, transport: network }) });
  for (let i = 0; i < 150 && store.getProfile('remote') === null; i++) await new Promise(resolve => setTimeout(resolve, 2));
  assert.equal(store.getProfile('remote').name, 'Distant');
  assert.equal(store.listArchives()[0].id, 'archive-local');
  assert.equal(store.getHistory().boundary.reason, 'remote-sync');
  const revision = store.getLocalRevision();
  store.detachSync();
  persistence.close();
  const reloadedPersistence = createPersistence({ indexedDB, dbName: 'race-remote-metadata', contextId: 'guest' });
  const reloaded = createStore({ persistence: reloadedPersistence });
  await reloaded.ready;
  assert.equal(reloaded.listArchives()[0].id, 'archive-local');
  assert.equal(reloaded.getHistory().boundary.reason, 'remote-sync');
  assert.equal(reloaded.getLocalRevision(), revision);
  reloadedPersistence.close();
});

test('Store — une mise à jour live distante avance la révision locale et survit au reload', async () => {
  const persistence = createPersistence({ indexedDB, dbName: 'race-live-revision', contextId: 'guest' });
  const rootRef = { current: createSyncDocument(envelope({ reserve: [{ id: 'before', name: 'Avant' }] }), { revision: 2 }) };
  const listeners = new Set();
  const network = {
    async read() { return rootRef.current; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async transaction(operation) {
      const result = applyOperation(rootRef.current, operation);
      if (result.applied) rootRef.current = result.document;
      return result.applied ? { status: 'committed', root: result.document } : { status: 'aborted', root: result.document };
    },
    push(operation) { rootRef.current = applyOperation(rootRef.current, operation).document; listeners.forEach(listener => listener(rootRef.current)); }
  };
  const store = createStore({ persistence });
  await store.ready;
  store.attachSync({ dbRef: {}, contextId: 'guest', createSession: options => createSyncSession({ ...options, transport: network }) });
  for (let i = 0; i < 100 && store.getProfile('before') === null; i++) await new Promise(resolve => setTimeout(resolve, 2));
  const initialRevision = store.getLocalRevision();
  network.push({ deviceId: 'other', sequence: 1, baseRevision: 2, state: envelope({ reserve: [{ id: 'after', name: 'Après' }] }) });
  for (let i = 0; i < 150 && store.getProfile('after') === null; i++) await new Promise(resolve => setTimeout(resolve, 2));
  assert.equal(store.getProfile('after').name, 'Après');
  assert.equal(store.getLocalRevision(), initialRevision + 1);
  store.detachSync();
  await store.whenIdle();
  persistence.close();
  const reloadedPersistence = createPersistence({ indexedDB, dbName: 'race-live-revision', contextId: 'guest' });
  const reloaded = createStore({ persistence: reloadedPersistence });
  await reloaded.ready;
  assert.equal(reloaded.getProfile('after').name, 'Après');
  assert.equal(reloaded.getLocalRevision(), initialRevision + 1);
  assert.equal(reloaded.getHistory().boundary.reason, 'remote-sync');
  reloadedPersistence.close();
});

test('Store — un échec IDB lors d’une frontière distante ne remplace pas l’état vivant', async () => {
  const basePersistence = createPersistence({ indexedDB, dbName: 'race-remote-save-failure', contextId: 'guest' });
  await basePersistence.saveAtomic({
    state: envelope({ reserve: [{ id: 'local', name: 'Local' }], history: { past: [], future: [], boundary: null } }),
    session: { protocolVersion: 2, deviceId: 'failure-device', sequence: 0, baseRevision: 0 }
  });
  const persistence = {
    ...basePersistence,
    async saveAtomic(options = {}) {
      if (options.state?.history?.boundary) throw new Error('IDB indisponible');
      return basePersistence.saveAtomic(options);
    }
  };
  const rootRef = { current: createSyncDocument(envelope({ reserve: [{ id: 'remote', name: 'Distant' }] }), { revision: 1 }) };
  const store = createStore({ persistence });
  await store.ready;
  store.attachSync({
    dbRef: {}, contextId: 'guest',
    createSession: options => createSyncSession({ ...options, transport: transport(rootRef) })
  });
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(store.getProfile('remote'), null);
  assert.equal(store.getProfile('local').name, 'Local');
  assert.equal(store.getHistory().boundary, null);
  assert.equal((await basePersistence.load()).reserve[0].id, 'local');
  store.detachSync();
  basePersistence.close();
});
