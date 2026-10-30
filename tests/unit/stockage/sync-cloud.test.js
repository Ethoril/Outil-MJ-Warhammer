import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { googleAuthErrorCode, googleAuthErrorMessage } from '../../../js/core/auth-errors.js';
import { migrateSnapshot } from '../../../js/core/migrations.js';
import { migrateV2SyncDocument, createMigratingTransport, initializeV3Root } from '../../../js/core/sync-migration.js';
import { indexedDB } from 'fake-indexeddb';
import { createPersistence } from '../../../js/core/persistence.js';
import { createSyncSession, normalizeRemoteDocument } from '../../../js/core/sync-session.js';
import { applyOperation, createSyncDocument, createOperation, SyncProtocolError, sharedState, transactionCallback, transactionUpdate, validateSyncDocument, sameSharedState } from '../../../js/core/sync-protocol.js';
import { createStore } from '../../../js/core/store.js';
import { Profile, Participant } from '../../../js/core/models.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFicheSource } from '../../../js/core/fiche-source.js';
import { APP_VERSION } from '../../../js/version.js';

describe('Erreurs authentification cloud', () => {
test('Google auth diagnostics distinguish blocked, closed, storage and network failures', () => {
  for (const [code, expected] of [
    ['auth/popup-blocked', /fenêtre Google a été bloquée/],
    ['auth/popup-closed-by-user', /fermée avant la fin/],
    ['auth/cancelled-popup-request', /autre tentative/],
    ['auth/web-storage-unsupported', /stockage nécessaire/],
    ['auth/network-request-failed', /requête de connexion/],
    ['auth/unauthorized-domain', /domaine n’est pas autorisé/],
    ['auth/operation-not-supported-in-this-environment', /onglet normal/],
    ['auth/internal-error', /initialisation/],
    ['auth/not-initialized', /pas encore disponible/]
  ]) {
    const message = googleAuthErrorMessage({ code });
    assert.match(message, expected);
    assert.ok(message.endsWith(`Code : ${code}`));
  }
});

test('Google auth diagnostics never expose Firebase payloads or unsafe code strings', () => {
  const privatePayload = { message: 'private-email@example.test private-token', customData: { email: 'private-email@example.test', credential: 'private-token' } };
  for (const code of ['auth/popup-blocked', 'auth/new-safe-code', undefined, null, 17, 'private-email@example.test', 'auth/bad\nprivate-token', 'auth/' + 'a'.repeat(65)]) {
    const error = { ...privatePayload, code };
    const message = googleAuthErrorMessage(error);
    assert.ok(!message.includes('private-email') && !message.includes('private-token'));
    assert.match(googleAuthErrorCode(error), /^auth\/[a-z0-9-]+$/);
  }
  assert.equal(googleAuthErrorCode(null), 'auth/unknown');
  assert.match(googleAuthErrorMessage(null, { online: false }), /hors ligne/);
});
});

describe('Reserve vide cloud V2', () => {
// Anonymous shape of the v2 cloud backup: Firebase omitted reserve and participants.
const emptyCloud = () => ({
  revision: 27,
  state: {
    schemaVersion: 2,
    combat: { round: 3, orderMode: 'manual', extensions: { retained: 'combat context' } },
    diceLines: { roll: { id: 'roll', type: 'skill', base: 42, mod: -10, note: 'Jet préparé anonyme', extensions: { retained: true } } },
    extensions: { retained: { custom: 'cloud metadata' } }
  }
});

test('v2 cloud missing empty reserve and participants migrates without changing its source', () => {
  const source = emptyCloud(), before = structuredClone(source);
  const migrated = migrateV2SyncDocument(source);
  assert.equal(migrated.revision, 27);
  assert.equal(migrated.state.schemaVersion, 3);
  assert.deepEqual(migrated.state.reserve, []);
  assert.deepEqual(migrated.state.combat.participants, []);
  assert.equal(migrated.state.combat.round, 3);
  assert.equal(migrated.state.combat.orderMode, 'manual');
  assert.equal(migrated.state.combat.extensions.retained, 'combat context');
  assert.equal(migrated.state.diceLines[0].id, 'roll');
  assert.equal(migrated.state.diceLines[0].base, 42);
  assert.equal(migrated.state.diceLines[0].mod, -10);
  assert.deepEqual(migrated.state.diceLines[0].extensions, { retained: true });
  assert.deepEqual(migrated.state.extensions.retained, { custom: 'cloud metadata' });
  assert.deepEqual(source, before);
  assert.ok(!Object.hasOwn(source.state, 'reserve'));
});

test('file snapshots still require their reserve collection', () => {
  assert.throws(() => migrateSnapshot(emptyCloud().state), /incomplète/);
});

test('present invalid v2 reserve values are rejected, never interpreted as omitted lists', () => {
  for (const value of [null, undefined, '', 'bad', false, 0]) {
    const source = emptyCloud(); source.state.reserve = value;
    assert.throws(() => migrateV2SyncDocument(source), error => error.code === 'INVALID_STATE');
    assert.ok(Object.hasOwn(source.state, 'reserve'));
    assert.equal(source.state.reserve, value);
  }
});

test('cloud normalization never repairs an absent or invalid combat object', () => {
  for (const value of [undefined, null, [], '', 0]) {
    const source = emptyCloud();
    if (value === undefined) delete source.state.combat;
    else source.state.combat = value;
    assert.throws(() => migrateV2SyncDocument(source), error => error.code === 'INVALID_STATE');
  }
});

test('migrating transport refuses malformed cloud state before any write', async () => {
  for (const value of [null, undefined, 'bad', false, 0]) {
    const source = emptyCloud(); source.state.reserve = value;
    const before = structuredClone(source), writes = [], reads = [];
    const transport = createMigratingTransport({
      current: 'v3', legacy: 'v2',
      read: async path => { reads.push(path); return path === 'v2' ? source : null; },
      transact: async path => { writes.push(path); throw Error('must never write'); }
    });
    await assert.rejects(transport.read(), error => error.code === 'INVALID_STATE');
    assert.deepEqual(reads, ['v3', 'v2']);
    assert.deepEqual(writes, []);
    assert.deepEqual(source, before);
  }
});

test('empty cloud reserve initializes only a fresh v3 root and preserves the revision', async () => {
  const source = emptyCloud(), before = structuredClone(source), writes = [];
  let next;
  const transport = createMigratingTransport({
    current: 'v3', legacy: 'v2', read: async path => path === 'v2' ? source : null,
    transact: async (path, update) => { writes.push(path); next = update(null); return { root: next }; }
  });
  assert.deepEqual(await transport.read(), next);
  assert.equal(next.revision, 27);
  assert.deepEqual(writes, ['v3']);
  assert.deepEqual(source, before);
  assert.equal(initializeV3Root({ malformed: true }, next), undefined);
});

test('existing v3 roots bypass legacy reconstruction and are never overwritten', async () => {
  for (const existing of [migrateV2SyncDocument(emptyCloud()), { malformed: true }]) {
    const reads = [], writes = [];
    const transport = createMigratingTransport({
      current: 'v3', legacy: 'v2',
      read: async path => { reads.push(path); return existing; },
      transact: async path => { writes.push(path); throw Error('must never write'); }
    });
    assert.equal(await transport.read(), existing);
    assert.deepEqual(reads, ['v3']);
    assert.deepEqual(writes, []);
  }
});
});

describe('Gestion des races dans le store', () => {
const envelope = extra => ({
  schemaVersion: 3, reserve: [], combat: { round: 0, order: [], participants: [] },
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
  assert.equal((await persistence.load()).archives[0].id, 'archive-local');
  assert.equal(store.getHistory().boundary.reason, 'remote-sync');
  const revision = store.getLocalRevision();
  store.detachSync();
  persistence.close();
  const reloadedPersistence = createPersistence({ indexedDB, dbName: 'race-remote-metadata', contextId: 'guest' });
  const reloaded = createStore({ persistence: reloadedPersistence });
  await reloaded.ready;
  assert.equal((await reloadedPersistence.load()).archives[0].id, 'archive-local');
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
    session: { protocolVersion: 3, deviceId: 'failure-device', sequence: 0, baseRevision: 0 }
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
});

describe('Synchronisation cloud E02', () => {
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
});

describe('Controle acces et sessions E03', () => {
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
  const main = readFileSync(new URL('../../../js/main.js', import.meta.url), 'utf8');
  const sync = readFileSync(new URL('../../../js/core/sync.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../../../sw.js', import.meta.url), 'utf8');
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
  const version = readFileSync(new URL('../../../js/version.js', import.meta.url), 'utf8').match(/APP_VERSION = "([^"]+)"/)[1];
  assert.ok(sw.includes(`'wfrp-cache-v${version}'`), 'le cache du service worker suit la version de l’application');
  assert.match(sw, /if \(cachedResponse\) \{\s*return cachedResponse;\s*\}/);
  assert.doesNotMatch(sw, /Mise à jour silencieuse/);
});
});

describe('Regles de securite Firebase E05', () => {
const root = join(fileURLToPath(new URL('../../..', import.meta.url)));

test('E05 règles Firebase proposées isolent v2 par compte et figent les écritures v1', () => {
  const rules = JSON.parse(readFileSync(join(root, 'firebase.database.rules.v2.test.json'), 'utf8'));
  const v2 = rules.rules['wfrp-sessions-v2'].$uid.current;
  const v1 = rules.rules['wfrp-sessions'].$uid.current;
  assert.match(v2['.read'], /auth\.uid === \$uid/);
  assert.match(v2['.write'], /newData\.hasChildren/);
  assert.equal(v1['.write'], false);
});
});

describe('Resolution de session E05', () => {
const local = {
  schemaVersion: 3,
  reserve: [{ id: 'local', name: 'Local' }],
  combat: { round: 0, participants: [] },
  log: [{ id: 'log-1', kind: 'management', text: 'local' }],
  diceLines: [{ id: 'dice-1', value: 42 }]
};

const remoteState = {
  schemaVersion: 3,
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
});

describe('Revue de session E05', () => {
const emptyState = {
  schemaVersion: 3,
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

test('E05 sécurité import — un compte v2 synchronisé ne propose jamais le brouillon invité obsolète', async () => {
  const dbName = `e05-guest-import-safety-${Date.now()}`;
  const openPersistence = contextId => createPersistence({ indexedDB, dbName, contextId });
  const guestPersistence = openPersistence('guest');
  const openedPersistences = [guestPersistence];
  const persistenceFactory = contextId => {
    const persistence = openPersistence(contextId);
    openedPersistences.push(persistence);
    return persistence;
  };
  const emitted = [];
  const bus = { emit: (event, payload) => emitted.push({ event, payload }) };
  let resolveSynced;
  const synced = new Promise(resolve => { resolveSynced = resolve; });
  const store = createStore({
    storage: null,
    persistence: guestPersistence,
    persistenceFactory,
    contextId: 'guest',
    bus,
    onSyncStatus: status => { if (status === 'synced') resolveSynced(); }
  });
  await store.ready;
  await store.addProfile({ id: 'stale-draft', name: 'Brouillon invité obsolète', hp: 10, initiative: 30 });

  const remoteRoot = createSyncDocument({
    schemaVersion: 3,
    reserve: [{ id: 'restored-profile', name: 'Sauvegarde restaurée' }],
    combat: { round: 0, order: [], participants: [] },
    diceLines: []
  }, { revision: 9 });
  const transport = {
    async read() { return remoteRoot; },
    async transaction() { throw new Error('un compte déjà synchronisé ne doit pas être réécrit'); },
    subscribe() { return () => {}; }
  };

  store.attachSync({
    contextId: 'account:restored',
    createSession: options => createSyncSession({ ...options, transport, deviceId: 'guest-import-safety-device' })
  });
  let timeout;
  await Promise.race([
    synced,
    new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Synchronisation distante non terminée')), 5000); })
  ]);
  clearTimeout(timeout);
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.equal(store.getProfile('restored-profile')?.name, 'Sauvegarde restaurée');
  assert.equal(store.getProfile('stale-draft'), null);
  assert.equal(emitted.some(item => item.event === 'sync:guest-import-available'), false);
  await store.whenIdle();
  store.detachSync();
  openedPersistences.forEach(persistence => persistence.close());
});
});

describe('Protocole de synchronisation E05', () => {
const state = (name = 'base') => ({
  schemaVersion: 3,
  reserve: [{ id: name }],
  combat: { round: 1, participants: [] }
});

test('E05 protocole — document et opération initialisent une racine vide', () => {
  const empty = createSyncDocument();
  assert.deepEqual(empty, { revision: 0, state: {}, receipts: {} });
  assert.deepEqual(validateSyncDocument({ revision: 0, state: {} }), empty,
    'RTDB peut omettre une map de reçus vide');
  const result = applyOperation(null, createOperation({
    deviceId: 'device-a', sequence: 1, baseRevision: 0, state: state('first')
  }));
  assert.equal(result.status, 'applied');
  assert.equal(result.document.revision, 1);
  assert.equal(result.document.receipts['device-a'], 1);
  assert.deepEqual(result.document.state, state('first'));
});

test('E05 protocole — baseRevision distante incorrecte produit un conflit sans mutation', () => {
  const current = createSyncDocument(state('remote'), { revision: 4, receipts: { 'remote-device': 4 } });
  const operation = createOperation({ deviceId: 'local-device', sequence: 1, baseRevision: 3, state: state('local') });
  const before = structuredClone(current);
  const result = applyOperation(current, operation);
  assert.equal(result.status, 'conflict');
  assert.equal(result.applied, false);
  assert.deepEqual(result.document, before);
  assert.deepEqual(current, before);
});

test('E05 protocole — deux appareils concurrents passent par un CAS déterministe', () => {
  const first = applyOperation(createSyncDocument(state()), createOperation({
    deviceId: 'a', sequence: 1, baseRevision: 0, state: state('a')
  }));
  const competing = applyOperation(first.document, createOperation({
    deviceId: 'b', sequence: 1, baseRevision: 0, state: state('b')
  }));
  assert.equal(competing.status, 'conflict');
  const rebased = applyOperation(first.document, createOperation({
    deviceId: 'b', sequence: 1, baseRevision: 1, state: state('b')
  }));
  assert.equal(rebased.status, 'applied');
  assert.equal(rebased.document.revision, 2);
  assert.deepEqual(rebased.document.receipts, { a: 1, b: 1 });
});

test('E05 protocole — accusé perdu et rejeu sont idempotents', () => {
  const operation = createOperation({ deviceId: 'device-a', sequence: 1, baseRevision: 0, state: state('once') });
  const applied = applyOperation(createSyncDocument(), operation);
  const replay = applyOperation(applied.document, operation);
  assert.equal(replay.status, 'duplicate');
  assert.equal(replay.applied, false);
  assert.deepEqual(replay.document, applied.document);
  const next = applyOperation(applied.document, createOperation({
    deviceId: 'device-a', sequence: 2, baseRevision: 1, state: state('twice')
  }));
  assert.equal(next.status, 'applied');
  assert.equal(applyOperation(next.document, operation).status, 'duplicate');
});

test('E05 protocole — anciennes séquences et trous sont refusés sans avancer le reçu', () => {
  const gap = applyOperation(createSyncDocument(), createOperation({
    deviceId: 'device-a', sequence: 3, baseRevision: 0, state: state('gap')
  }));
  assert.equal(gap.status, 'sequence-gap');
  assert.deepEqual(gap.document, createSyncDocument());
  const first = applyOperation(gap.document, createOperation({
    deviceId: 'device-a', sequence: 1, baseRevision: 0, state: state('one')
  }));
  const old = applyOperation(first.document, createOperation({
    deviceId: 'device-a', sequence: 1, baseRevision: 0, state: state('old')
  }));
  assert.equal(old.status, 'duplicate');
  assert.equal(old.document.revision, 1);
});

test('E05 protocole — journal, historique et UI ne sont jamais envoyés', () => {
  const operation = createOperation({
    deviceId: 'device-a', sequence: 1, baseRevision: 0,
    state: {
      ...state(), log: ['local'], history: [{ undo: true }], ui: { selectedId: 'p' }, filters: { q: 'x' },
      appVersion: '3.5.1', exportedAt: 'now', contextId: 'guest', writer: 'client', timestamp: 42,
      deviceId: 'device-a', sequence: 1, baseRevision: 0
    }
  });
  assert.equal(operation.state.log, undefined);
  assert.equal(operation.state.history, undefined);
  assert.equal(operation.state.ui, undefined);
  assert.equal(operation.state.filters, undefined);
  const metadata = sharedState({ ...state(), appVersion: '3.5.1', exportedAt: 'now', contextId: 'guest', writer: 'client', timestamp: 42, deviceId: 'device-a' });
  assert.equal(metadata.appVersion, undefined);
  assert.equal(metadata.contextId, undefined);
  assert.equal(metadata.writer, undefined);
  assert.equal(metadata.deviceId, undefined);
  assert.equal(operation.state.appVersion, undefined);
  assert.equal(operation.state.contextId, undefined);
  assert.equal(operation.state.writer, undefined);
  assert.equal(operation.state.deviceId, undefined);
  const validated = validateSyncDocument({ revision: 0, state: { ...state(), journal: ['local'] }, receipts: {} });
  assert.equal(validated.state.journal, undefined);
});

test('E05 protocole — schéma incompatible refusé et extensions prototypes inertes', () => {
  assert.throws(
    () => validateSyncDocument({ revision: 0, state: { schemaVersion: 4 }, receipts: {} }),
    error => error instanceof SyncProtocolError && error.code === 'SCHEMA_INCOMPATIBLE'
  );
  assert.throws(
    () => createOperation({ deviceId: 'a', sequence: 1, baseRevision: 0, state: {}, extra: true }),
    error => error instanceof SyncProtocolError && error.code === 'SCHEMA_INCOMPATIBLE'
  );
  const source = JSON.parse('{"reserve":[],"__proto__":{"polluted":true}}');
  const clean = sharedState(source);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(clean, '__proto__'), true);
});

test('E05 protocole — le callback de transaction est rejouable sans effet de bord', () => {
  const current = createSyncDocument(state());
  const before = structuredClone(current);
  const callback = transactionCallback(createOperation({
    deviceId: 'device-a', sequence: 1, baseRevision: 0, state: state('next')
  }));
  const first = callback(current);
  const retry = callback(current);
  assert.deepEqual(first, retry);
  assert.deepEqual(current, before);
  assert.equal(transactionUpdate(current, createOperation({
    deviceId: 'device-a', sequence: 1, baseRevision: 9, state: state('wrong')
  })), undefined);
});

test('E05 protocole — l’adaptateur Firebase distingue null suppression et undefined abandon', () => {
  const current = createSyncDocument(state(), { revision: 2, receipts: { a: 1 } });
  const firebaseTransaction = (root, callback) => {
    const candidate = callback(root);
    if (candidate === undefined) return { status: 'aborted', root };
    if (candidate === null) return { status: 'deleted', root: null };
    return { status: 'committed', root: candidate };
  };
  const conflict = transactionCallback(createOperation({
    deviceId: 'b', sequence: 1, baseRevision: 1, state: state('conflict')
  }));
  const aborted = firebaseTransaction(current, conflict);
  assert.equal(aborted.status, 'aborted');
  assert.deepEqual(aborted.root, current);
  assert.deepEqual(firebaseTransaction(current, () => null), { status: 'deleted', root: null });
  const committed = firebaseTransaction(null, transactionCallback(createOperation({
    deviceId: 'a', sequence: 1, baseRevision: 0, state: state('initial')
  })));
  assert.equal(committed.status, 'committed');
  assert.equal(committed.root.revision, 1);
});
});

describe('Synchronisation session E05', () => {
const state = name => ({ schemaVersion: 3, reserve: [{ id: name }], combat: { round: 1, participants: [] } });
const localEnvelope = { schemaVersion: 3, reserve: [], combat: { round: 0, participants: [] }, log: [], diceLines: [] };

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
    schemaVersion: 3, appVersion: '3.5.1', contextId: 'guest', writer: 'local', timestamp: 12,
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
  assert.deepEqual((await persistence.readSession()), { protocolVersion: 3, deviceId: 'device-a', sequence: 1, baseRevision: 0 });
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
    session: { protocolVersion: 3, deviceId: 'retry-device', sequence: 0, baseRevision: 0 },
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
  assert.deepEqual(await persistence.load(), { ...localEnvelope, syncPending: true });
  assert.equal((await persistence.readSession()).deviceId, 'new-device');
  persistence.close();
});
});

describe('Source cloud des fiches PJ', () => {
const legacy={revision:8,state:{schemaVersion:2,reserve:[{id:'p',name:'PJ',hp:14,armor:{arms:2}}],combat:{round:1,participants:[]}},receipts:{old:4}};
test('Cloud v3 — migrer v2 conserve la révision, les six zones et le document source',()=>{const before=structuredClone(legacy);const root=migrateV2SyncDocument(legacy);assert.equal(root.revision,8);assert.equal(root.state.schemaVersion,3);assert.equal(root.state.reserve[0].armorLocations.rightArm,2);assert.deepEqual(root.receipts,{});assert.deepEqual(legacy,before);assert.equal(initializeV3Root({corrupt:true},root),undefined);});
test('Cloud v3 — course initialisation retourne le gagnant et ne réécrit jamais v2',async()=>{const winner=migrateV2SyncDocument({...legacy,revision:9});let reads=[],writes=[];const transport=createMigratingTransport({current:'v3',legacy:'v2',read:async path=>{reads.push(path);return path==='v2'?legacy:null;},transact:async(path,update)=>{writes.push(path);assert.equal(update(winner),undefined);return {root:winner};}});assert.deepEqual(await transport.read(),winner);assert.deepEqual(reads,['v3','v2']);assert.deepEqual(writes,['v3']);});
test('Cloud v3 — source malformed ou future refuse migration avant toute écriture',()=>{for(const raw of [{...legacy,revision:-1},{...legacy,state:{schemaVersion:4}},{...legacy,receipts:{bad:-2}},{...legacy,unknown:true}])assert.throws(()=>migrateV2SyncDocument(raw));});
test('Cloud v3 — ancienne file ne rejoue pas les opérations v2 et exige choix explicite',async()=>{const persistence=createPersistence({indexedDB,dbName:'pj-old-queue',contextId:'guest'});await persistence.saveAtomic({state:legacy.state,session:{protocolVersion:2,deviceId:'old',sequence:4,baseRevision:8},operations:[{deviceId:'old',sequence:5,baseRevision:8,state:legacy.state}]});let conflicts=[],transactions=0;const session=createSyncSession({persistence,deviceId:'new',transport:{read:async()=>migrateV2SyncDocument(legacy),transaction:async()=>{transactions++;}},onConflict:data=>conflicts.push(data)});await session.open();assert.equal(conflicts.length,1);assert.equal(conflicts[0].localState.schemaVersion,3);assert.equal(conflicts[0].localState.reserve[0].id,'p');assert.deepEqual(await persistence.listOutbox(),[]);assert.equal((await persistence.readSession()).protocolVersion,3);assert.equal(transactions,0);assert.equal((await session.reconcile()).status,'conflict');assert.equal((await persistence.load()).syncPending,true);session.stop();const reopened=createSyncSession({persistence,deviceId:'new',transport:{read:async()=>migrateV2SyncDocument(legacy),transaction:async()=>{throw new Error('Ne doit pas envoyer avant un choix');}},onConflict:data=>conflicts.push(data)});await reopened.open();assert.equal(conflicts.length,2);assert.equal((await reopened.reconcile()).status,'conflict');await reopened.resolveRemote();assert.equal((await persistence.load()).syncPending,false);assert.equal((await reopened.reconcile()).status,'synced');reopened.stop();persistence.close();});
const makeSource=(reader)=>createFicheSource({loadSdk:async()=>({db:{},firestore:{doc:(_db,_collection,id)=>id,getDocFromServer:reader,getDoc:()=>{throw Error('cache forbidden');}}})});
test('Lecture fiches — erreur partielle explicite et metadata source réelle',async()=>{const source=makeSource(async id=>{if(id==='wren')throw Object.assign(Error('refus'),{code:'permission-denied'});return {exists:()=>id!=='hellaya',data:()=>({schemaVersion:4,revision:19,data:{nom:id,equipment:[]}})};});const rows=await source.fetchAll();assert.equal(rows.find(row=>row.charId==='wren').status,'error');assert.equal(rows.find(row=>row.charId==='hellaya').status,'missing');assert.deepEqual(rows[0].metadata,{schemaVersion:4,revision:19});});
test('Lecture fiches — refus global propagé, enveloppe invalide jamais utilisée',async()=>{await assert.rejects(makeSource(async()=>{throw Error('network unavailable');}).fetchAll(),/network unavailable/);const rows=await makeSource(async()=>({exists:()=>true,data:()=>({data:[]})})).fetchAll();assert.ok(rows.every(row=>row.status==='invalid'&&row.data===null));});
});

describe('Rattrapage des ecarts de synchronisation', () => {
// Cas du PLAN.md §6.9 absents de la première livraison du lot 6.
// Vérifient que la modularisation n'a rien changé au comportement des lots 2 à 5.

const mkStorage = (init = {}) => {
  const m = new Map(Object.entries(init));
  let boom = false;
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (boom) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    boom: v => { boom = v; },
  };
};
const mkBus = () => { const e = []; return { emit: ev => e.push(ev), events: e, clear: () => (e.length = 0) }; };
const mkSync = () => {
  const s = { cb: null, pushes: [], dbRef: 'ref', onValueCalls: 0 };
  s.onValue = (ref, cb) => { s.onValueCalls++; s.cb = cb; };
  s.set = (ref, data) => { s.pushes.push(data); return Promise.resolve(); };
  s.update = (ref, data) => { s.pushes.push(data); return Promise.resolve(); };
  return s;
};
// depuis le lot 9, reserve/participants/diceLines voyagent en objets indexés par id
const idsDe = obj => Object.keys(obj || {});
const snap = o => ({ val: () => o });
// depuis le lot 10, le journal contient des objets { kind, text, … } et non des chaînes
const texteJournal = store => store.getLog().map(e => (typeof e === 'string' ? e : (e && e.text) || '')).join(' | ');
const wait = () => new Promise(r => setTimeout(r, 360));

// ─────────── amorçage : la synchro arrive APRÈS la construction du Store ───────────
// L'authentification Firebase est asynchrone. Si le handle n'est pas rattachable,
// l'application tourne en localStorage seul — sans erreur ni symptôme visible.

test('amorçage — attachSync() branche le listener et pousse l\'état local', async () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync: null }); // comme main.js
  store.addProfile(new Profile({ id: 'avant', name: 'Avant connexion', hp: 10 }));
  await wait();
  assert.equal(sync.pushes.length, 0, 'rien ne part tant que la synchro n\'est pas attachée');
  assert.equal(sync.cb, null, 'et aucun listener n\'est enregistré');

  store.attachSync(sync);
  await wait();
  assert.ok(sync.cb, 'attachSync doit enregistrer le listener onValue');
  assert.equal(sync.pushes.length, 1, 'et repousser l\'état local vers Firebase');
  assert.ok(idsDe(sync.pushes[0].reserve).includes('avant'),
    'le travail fait avant la connexion doit être poussé');

  // le listener est bien vivant
  sync.cb(snap({ writer: 'autre', timestamp: Date.now() + 60000, reserve: [{ id: 'distant', name: 'D' }] }));
  assert.equal(store.getReserve().has('distant'), true, 'le listener doit appliquer les données distantes');
});

test('amorçage — attachSync() est idempotent', async () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync: null });
  store.attachSync(sync);
  store.attachSync(sync);
  store.attachSync(null);
  await wait();
  assert.equal(sync.onValueCalls, 1, 'un seul enregistrement de listener');
});

// ─────────────────── D-02 : l'écriture doit rester ciblée ───────────────────
// Store.log() sauvegarde sans rien marquer comme sale, et il est appelé à chaque jet,
// chaque PV, chaque tour. Si un lot vide retombe sur l'instantané complet, le bénéfice
// de l'écriture par chemin est annulé en usage réel.

test('écriture ciblée — un seul participant modifié ne pousse que lui', async () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync });
  store.batch(() => {
    for (let i = 0; i < 10; i++) store.addProfile(new Profile({ name: `P${i}`, hp: 10 }));
    for (let i = 0; i < 5; i++) store.addParticipant(new Participant({ id: `c${i}`, name: `C${i}`, hp: 10 }));
  });
  await wait();
  sync.pushes.length = 0;

  store.updateParticipant('c2', { hp: 7 });
  await wait();
  const cles = Object.keys(sync.pushes[0]);
  assert.ok(cles.includes('combat/participants/c2'), 'le chemin du participant doit être poussé');
  assert.ok(!cles.includes('reserve'), 'la réserve entière ne doit pas repartir');
  assert.ok(!cles.includes('diceLines'), 'les lignes de jet non plus');
});

test('écriture ciblée — une entrée de journal ne pousse pas tout le document', async () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync });
  store.batch(() => { for (let i = 0; i < 10; i++) store.addProfile(new Profile({ name: `P${i}`, hp: 10 })); });
  await wait();
  sync.pushes.length = 0;

  store.log('🎲 un jet de dé');
  await wait();
  assert.equal(sync.pushes.length, 0,
    'le journal local ne doit ni remplacer ni déclencher un lot partagé');
});

test('écriture ciblée — repli sur l\'instantané complet sans update()', async () => {
  const sync = mkSync();
  delete sync.update; // handle dépourvu d'écriture par chemin
  const store = createStore({ storage: mkStorage(), sync });
  store.addProfile(new Profile({ id: 'seul', name: 'Seul', hp: 10 }));
  await wait();
  const cles = Object.keys(sync.pushes.at(-1));
  assert.ok(cles.includes('reserve'), 'sans update(), on repasse en document complet');
  assert.ok(!cles.some(k => k.includes('/')), 'et jamais de clé à chemin, invalide dans un set()');
});

test('journal — sorti de Firebase, mais conservé dans les fichiers (§9.2)', () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync });
  store.log('entrée locale');

  // le chemin Firebase ne doit plus apporter de journal
  sync.cb(snap({ writer: 'autre', timestamp: Date.now(), reserve: [], log: ['venu du serveur'] }));
  assert.ok(!texteJournal(store).includes('venu du serveur'),
    'le journal ne doit plus être lu depuis Firebase');
  assert.ok(texteJournal(store).includes('entrée locale'),
    'et le journal local ne doit pas être écrasé');

  // le chemin fichier, lui, doit le restaurer
  globalThis.alert = () => {};
  store.loadFromJSON(JSON.stringify({
    reserve: [{ id: 'p1', name: 'R', hp: 14 }],
    combat: { round: 1, order: [], participants: [] },
    log: ['[20:00:00] venu du fichier'],
    diceLines: [],
  }));
  assert.ok(texteJournal(store).includes('venu du fichier'),
    'charger une sauvegarde doit restaurer son journal');
});

// ─────────────────────── lot 10 : annuler et journal ───────────────────────

test('undo — l\'instantané est isolé des modifications postérieures (E-04)', () => {
  const store = createStore({ storage: mkStorage() });
  store.addProfile(new Profile({ id: 'a', name: 'Nom initial', hp: 10 }));
  store.addProfile(new Profile({ id: 'b', name: 'Autre', hp: 10 }));

  store.removeProfile('b');                        // action destructive → instantané
  store.updateProfile('a', { name: 'Nom MODIFIÉ' }); // mutation en place, après l'instantané
  store.undo();

  assert.equal(store.getReserve().has('b'), true, 'le profil supprimé doit revenir');
  assert.equal(store.getReserve().get('a').name, 'Nom initial',
    'et la modification postérieure à l\'instantané doit être annulée elle aussi');
});

test('journal — l\'avertissement de quota est une entrée normalisée (A-07)', () => {
  const storage = mkStorage();
  const store = createStore({ storage });
  storage.boom(true);
  store.addProfile(new Profile({ name: 'Q', hp: 10 }));
  storage.boom(false);

  const entree = store.getLog().find(e => JSON.stringify(e).includes('quota'));
  assert.ok(entree, 'l\'avertissement doit être journalisé');
  assert.equal(typeof entree, 'object', 'sous forme d\'objet, pas de chaîne brute');
  assert.ok(entree.text && entree.text.includes('quota'), 'avec un champ text renseigné');
  assert.ok(entree.kind, 'et un kind, sans quoi le rendu et les filtres l\'ignorent');
});

test('journal — les anciennes entrées en chaîne sont acceptées (kind: legacy)', () => {
  const storage = mkStorage({
    'wfrp.log.v1': JSON.stringify(['[20:00:00] ancienne entrée texte']),
  });
  const store = createStore({ storage });
  const e = store.getLog()[0];
  assert.equal(typeof e, 'object', 'normalisée en objet au chargement');
  assert.equal(e.kind, 'legacy');
  assert.ok(e.text.includes('ancienne entrée texte'));
});

// ─────────────────────── A-03 / A-04 : synchronisation ───────────────────────

test('sync — écho de sa propre écriture ignoré (A-03)', async () => {
  const sync = mkSync(), bus = mkBus();
  const store = createStore({ storage: mkStorage(), sync, bus });
  store.addProfile(new Profile({ id: 'local', name: 'Local', hp: 10 }));
  await wait();
  const monId = sync.pushes.at(-1).writer;
  assert.ok(monId, 'le payload doit porter un writer');

  bus.clear();
  sync.cb(snap({ writer: monId, timestamp: Date.now() + 5000, reserve: [{ id: 'echo', name: 'Echo' }] }));
  assert.equal(store.getReserve().has('echo'), false, 'son propre écho ne doit rien appliquer');
  assert.equal(bus.events.length, 0, 'et ne doit provoquer aucun rendu');
});

test('sync — snapshot vide sans effet', () => {
  const sync = mkSync(), bus = mkBus();
  createStore({ storage: mkStorage(), sync, bus });
  bus.clear();
  sync.cb(snap(null));
  assert.equal(bus.events.length, 0);
});

test('sync — client neuf accepte le serveur', () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync });
  sync.cb(snap({ writer: 'autre', timestamp: 5000, reserve: [{ id: 'srv', name: 'Serveur' }] }));
  assert.equal(store.getReserve().has('srv'), true);
});

test('sync — serveur plus récent appliqué', async () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync });
  store.addProfile(new Profile({ id: 'local', name: 'Local', hp: 10 }));
  await wait();
  sync.cb(snap({ writer: 'autre', timestamp: Date.now() + 60000, reserve: [{ id: 'neuf', name: 'Neuf' }] }));
  assert.equal(store.getReserve().has('neuf'), true);
});

test('sync — horodatage ISO hérité comparé dans les deux sens (A-04)', async () => {
  const s1 = mkSync();
  const st1 = createStore({ storage: mkStorage(), sync: s1 });
  st1.addProfile(new Profile({ id: 'l', name: 'L', hp: 10 }));
  await wait();
  s1.cb(snap({ writer: 'autre', timestamp: '2020-01-01T00:00:00Z', reserve: [{ id: 'vieux', name: 'V' }] }));
  assert.equal(st1.getReserve().has('vieux'), false, 'ISO ancien doit être rejeté');

  const s2 = mkSync();
  const st2 = createStore({ storage: mkStorage(), sync: s2 });
  s2.cb(snap({ writer: 'autre', timestamp: '2099-01-01T00:00:00Z', reserve: [{ id: 'futur', name: 'F' }] }));
  assert.equal(st2.getReserve().has('futur'), true, 'ISO récent doit être appliqué');
});

test('sync — horodatage absent ou illisible : appliqué plutôt que bloqué', async () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync });
  store.addProfile(new Profile({ id: 'l', name: 'L', hp: 10 }));
  await wait();
  sync.cb(snap({ writer: 'autre', reserve: [{ id: 'sansts', name: 'X' }] }));
  assert.equal(store.getReserve().has('sansts'), true);

  const s2 = mkSync();
  const st2 = createStore({ storage: mkStorage(), sync: s2 });
  s2.cb(snap({ writer: 'autre', timestamp: 'pas une date', reserve: [{ id: 'pourri', name: 'Y' }] }));
  assert.equal(st2.getReserve().has('pourri'), true);
});

// ─────────────────────────── A-08 : groupage réel ───────────────────────────

test('batch — un lot de 15 ne produit qu\'UNE sauvegarde Firebase', async () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync });
  await wait();
  sync.pushes.length = 0;
  store.batch(() => { for (let i = 0; i < 15; i++) store.addProfile(new Profile({ name: `P${i}`, hp: 10 })); });
  await wait();
  assert.equal(sync.pushes.length, 1, '15 opérations groupées = 1 seul push');
});

test('batch — événements distincts dédoublonnés', () => {
  const bus = mkBus();
  const store = createStore({ storage: mkStorage(), bus });
  bus.clear();
  store.batch(() => {
    store.addProfile(new Profile({ name: 'A', hp: 1 }));
    store.log('x');
    store.addProfile(new Profile({ name: 'B', hp: 1 }));
    store.log('y');
  });
  const sorted = bus.events.slice().sort();
  assert.deepEqual(sorted, [...new Set(sorted)], 'aucun événement en double');
  assert.ok(bus.events.includes('reserve') && bus.events.includes('log'));
});

test('batch — combat:update fusionné en rendu complet', () => {
  const bus = mkBus();
  const store = createStore({ storage: mkStorage(), bus });
  store.addParticipant(new Participant({ id: 'p1', name: 'P', hp: 10, zone: 'active' }));
  bus.clear();
  store.batch(() => {
    store.updateParticipant('p1', { hp: 9 });
    store.updateParticipant('p1', { hp: 8 });
  });
  assert.deepEqual(bus.events, ['combat'], 'combat:update doit être fusionné en un seul rendu complet');
});

test('batch — le Store n\'est pas bloqué après une exception', () => {
  const bus = mkBus();
  const store = createStore({ storage: mkStorage(), bus });
  try { store.batch(() => { throw new Error('boum'); }); } catch { /* attendu */ }
  bus.clear();
  store.addProfile(new Profile({ name: 'Après', hp: 10 }));
  assert.equal(bus.events.length, 1, 'une opération hors lot doit émettre immédiatement');
});

// ─────────────────────────── A-07 : quota ───────────────────────────

test('quota — Firebase tenté malgré l\'échec local', async () => {
  const sync = mkSync(), storage = mkStorage();
  const store = createStore({ storage, sync });
  await wait();
  sync.pushes.length = 0;
  storage.boom(true);
  store.addProfile(new Profile({ name: 'Q', hp: 10 }));
  await wait();
  assert.equal(sync.pushes.length, 1, 'le quota local ne doit pas empêcher la synchro distante');
});

test('quota — journal réellement plafonné à 300', () => {
  const store = createStore({ storage: mkStorage() });
  for (let i = 0; i < 340; i++) store.log(`entrée ${i}`);
  assert.equal(store.getLog().length, 300);
});

// ─────────────────────────── E-01 : migration maxHp ───────────────────────────

test('maxHp — profil introuvable : maximum inconnu conservé pour R37', () => {
  const storage = mkStorage({
    'wfrp.reserve.v1': JSON.stringify([]),
    'wfrp.combat.v1': JSON.stringify({ round: 1, order: ['p'], participants: [{ id: 'p', profileId: 'disparu', name: 'X', hp: 6 }] }),
  });
  assert.equal(createStore({ storage }).getCombat().participants.get('p').maxHp, null);
});

test('maxHp — migration aussi sur le chemin de synchronisation', () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync });
  sync.cb(snap({
    writer: 'autre', timestamp: Date.now(),
    reserve: [{ id: 'prof', name: 'Guerrier', hp: 15 }],
    combat: { round: 1, order: ['p'], participants: [{ id: 'p', profileId: 'prof', name: 'Guerrier', hp: 4 }] },
  }));
  assert.equal(store.getCombat().participants.get('p').maxHp, 15,
    'le maximum doit venir du profil source, pas des PV courants');
});
});

describe('Recette acceptation V5 lot2', () => {
const owned=(id,rank=1)=>({id:'talent-'+id,rank,status:'resolved'});
const profile=(id,talents=[])=>({id,name:'Recette '+id,kind:id==='hero'?'PJ':'Créature',hp:200,maxHp:200,initiative:id==='hero'?60:30,caracs:{CC:60,F:40,E:30,FM:40,I:50,Ag:40},armor:{head:0,body:0,arms:0,legs:0},talents,states:[],extensions:{v5:{hasMomentum:false,...(id==='hero'?{resourceCharacterId:'qa-25-local-hero'}:{})}}});
const state=store=>{const s=JSON.parse(store.getFullJSON());delete s.exportedAt;return s;};
async function setup(name){const base=createPersistence({indexedDB,dbName:'qa25-'+name,contextId:'guest'}),control={fail:false};const persistence={...base,saveAtomic:async args=>{if(control.fail)throw Error('QA disque plein');return base.saveAtomic(args);}};const store=createStore({persistence,storage:null,appVersion:APP_VERSION});await store.ready;await store.loadFromJSON({schemaVersion:3,reserve:[profile('hero',[owned('whirlwind-of-death'),owned('bludgeoner',2),owned('hardy',3)]),profile('small',[owned('small'),owned('iron-jaw')]),profile('other')],combat:{round:0,order:[],participants:[]},diceLines:[],log:[{id:'outside',kind:'management',text:'Journal sans rencontre'}]});await store.saveEncounter({id:'qa25-encounter',title:'Recette globale',entries:['hero','small','other'].map(id=>({id:'entry-'+id,profileId:id,quantity:1,zone:'active',camp:id==='hero'?'pj':'ennemi'}))});await store.launchEncounter('qa25-encounter');await store.nextTurn();const participants=store.listParticipants(),hero=participants.find(p=>p.profileId==='hero'),small=participants.find(p=>p.profileId==='small'),other=participants.find(p=>p.profileId==='other');await store.setFortune(hero.id,2);await store.startTalentSession();const raw={resolutionId:'qa25-spin-'+name,actorId:hero.id,targetId:small.id,action:{type:'attack',attr:'CC',base:60,damage:4,damageFormula:'BF+4',qualities:['assommante']},roll:10,defense:{base:40,roll:82,v5:{kind:'melee'}},v5:{kind:'melee',actorSize:4,targetSize:2,context:{specialAttack:'whirlwind-of-death',engagedIds:[small.id,other.id],allEngagedIncluded:true}}};return {store,persistence,control,hero,small,other,raw};}
async function applied(ctx){const p=ctx.store.previewResolution(ctx.raw);assert.deepEqual(p.unresolved,[]);assert.equal((await ctx.store.applyResolution(p)).status,'applied');return p;}
async function reload(ctx){const store=createStore({storage:null,persistence:ctx.persistence,appVersion:APP_VERSION});await store.ready;return store;}
test('2.5 rencontre : suspendre, recharger et reprendre garde Blessures, États, Fortune et premiers usages',async()=>{const ctx=await setup('resume');try{const receipt=await applied(ctx),before=state(ctx.store);await ctx.store.suspendActiveScene();const scene=ctx.store.listSuspendedScenes()[0];assert.equal(scene.participants.find(p=>p.id===ctx.small.id).hp,200-receipt.damage.finalDamage);const store=await reload(ctx);await store.resumeScene(scene.id);const after=state(store);assert.equal(after.activeScene.id,before.activeScene.id);assert.deepEqual(after.extensions.v5,before.extensions.v5);assert.equal(store.getFortune(ctx.hero.id).balance,1);assert.equal(store.listParticipants().find(p=>p.id===ctx.small.id).states.find(s=>s.key==='sonne').level,2);const p=store.previewResolution({...ctx.raw,resolutionId:'qa25-after-resume'});assert.equal(p.weaponConditions.applied[0].level,3);assert.equal(store.listParticipants().find(p=>p.id===ctx.hero.id).maxHp,200);}finally{ctx.persistence.close();}});
test('2.5 historique : annuler et rétablir la suspension après rechargement restaure le combat complet',async()=>{const ctx=await setup('undo-suspend');try{await applied(ctx);const before=state(ctx.store);await ctx.store.suspendActiveScene();const store=await reload(ctx);assert.equal(store.canUndo(),true);await store.undo();assert.deepEqual(state(store).combat,before.combat);assert.deepEqual(state(store).extensions.v5,before.extensions.v5);await store.redo();assert.equal(store.getActiveScene(),null);assert.equal(store.listSuspendedScenes()[0].participants.find(p=>p.id===ctx.small.id).hp,before.combat.participants.find(p=>p.id===ctx.small.id).hp);}finally{ctx.persistence.close();}});
test('2.5 recommencer : remet composition et États au départ sans rendre la Fortune, annulation complète',async()=>{const ctx=await setup('restart');try{await applied(ctx);const before=state(ctx.store);await ctx.store.restartCombat();const hero=ctx.store.listParticipants().find(p=>p.profileId==='hero');assert.equal(ctx.store.getCombat().round,0);assert.ok(ctx.store.listParticipants().every(p=>p.hp===200&&p.states.length===0));assert.equal(ctx.store.getFortune(hero.id).balance,1);assert.equal(state(ctx.store).extensions.v5.talentSessionId,before.extensions.v5.talentSessionId);await ctx.store.undo();assert.deepEqual(state(ctx.store).combat,before.combat);assert.deepEqual(state(ctx.store).extensions.v5,before.extensions.v5);}finally{ctx.persistence.close();}});
test('2.5 suppression : purge les reçus liés à la rencontre jusque dans l’historique, conserve Fortune et journal extérieur',async()=>{const ctx=await setup('delete');try{await applied(ctx);const before=state(ctx.store);assert.ok(ctx.store.getLog().some(l=>l.encounterId==='qa25-encounter'));await ctx.store.deleteEncounter('qa25-encounter');assert.equal(ctx.store.listParticipants().length,0);assert.ok(ctx.store.getLog().some(l=>l.id==='outside'));const after=state(ctx.store);assert.ok(!after.log.some(l=>l.encounterId==='qa25-encounter'));for(const command of after.history.past)for(const snapshot of [command.payload?.before,command.payload?.after,command.before,command.after].filter(Boolean))assert.ok(!(snapshot.log||[]).some(l=>l.encounterId==='qa25-encounter'));await ctx.store.undo();assert.equal(ctx.store.listParticipants().find(p=>p.id===ctx.small.id).hp,before.combat.participants.find(p=>p.id===ctx.small.id).hp);assert.equal(ctx.store.getFortune(ctx.hero.id).balance,1);assert.ok(!ctx.store.getLog().some(l=>l.encounterId==='qa25-encounter'));}finally{ctx.persistence.close();}});
test('2.5 fichier : export/import puis restauration préserve les coûts, la version du reçu et les données importées de fiche',async()=>{const ctx=await setup('export');const imported=createPersistence({indexedDB,dbName:'qa25-export-target'});try{const receipt=await applied(ctx),before=state(ctx.store);const store=createStore({persistence:imported,storage:null,appVersion:APP_VERSION});await store.ready;await store.loadFromJSON(ctx.store.getFullJSON());assert.deepEqual(state(store).extensions.v5,before.extensions.v5);assert.deepEqual(state(store).combat,before.combat);assert.equal(store.getLog().find(l=>l.detail?.ruleVersion)?.detail.ruleVersion,receipt.ruleVersion);await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:0,order:[],participants:[]},log:[],diceLines:[]});const points=await store.listRestorePoints(),point=points.find(p=>p.reason==='import-replace');assert.ok(point);const preview=await store.previewRestorePoint(point.id);assert.equal((await store.restorePoint(point.id,{expectedRevision:preview.baseRevision})).status,'restored');assert.deepEqual(state(store).extensions.v5,before.extensions.v5);assert.deepEqual(state(store).combat,before.combat);}finally{ctx.persistence.close();imported.close();}});
test('2.5 aperçu ancien : changement de Tour refuse l’application sans payer Fortune ni blesser',async()=>{const ctx=await setup('stale');try{const p=ctx.store.previewResolution(ctx.raw);await ctx.store.nextTurn();const before=state(ctx.store);assert.equal((await ctx.store.applyResolution(p)).status,'stale');assert.deepEqual(state(ctx.store),before);assert.equal(ctx.store.getFortune(ctx.hero.id).balance,2);}finally{ctx.persistence.close();}});
test('2.5 incident disque : échec atomique d’une attaque multi-cibles ne consomme ni coût, ni état, ni quota',async()=>{const ctx=await setup('disk');try{const p=ctx.store.previewResolution(ctx.raw),before=state(ctx.store);ctx.control.fail=true;assert.equal((await ctx.store.applyResolution(p)).status,'error');assert.deepEqual(state(ctx.store),before);ctx.control.fail=false;const restored=await reload(ctx);assert.deepEqual(state(restored).combat,before.combat);assert.deepEqual(state(restored).extensions.v5,before.extensions.v5);}finally{ctx.persistence.close();}});
});

describe('Etat partage V5 lot2', () => {
test('2.5 RTDB: null, empty branches and numeric array maps represent the same shared snapshot',()=>{
  const local={schemaVersion:3,combat:{participants:[{id:'a',hp:0,states:[],extensions:{v5:{hasMomentum:false}}}],empty:null},reserve:[],extensions:{v5:{unused:{}}}};
  const cloud={combat:{participants:{0:{extensions:{v5:{hasMomentum:false}},hp:0,id:'a'}}},schemaVersion:3};
  const original=JSON.stringify(local);assert.equal(sameSharedState(local,cloud),true);assert.equal(JSON.stringify(local),original);
});
test('2.5 RTDB: local history and journal do not create an external boundary',()=>{
  assert.equal(sameSharedState({schemaVersion:3,history:{past:[{id:'undo'}]},log:[{id:'private'}],localRevision:99},{schemaVersion:3}),true);
});
test('2.5 RTDB: actual wounds, momentum, Fortune and quota changes remain external edits',()=>{
  for(const field of ['hp','hasMomentum','fortune','used'])assert.equal(sameSharedState({extensions:{v5:{[field]:0}}},{extensions:{v5:{[field]:1}}}),false);
  assert.equal(sameSharedState({enabled:false},{}),false);assert.equal(sameSharedState({balance:0},{}),false);assert.equal(sameSharedState({name:''},{}),false);
});

test('2.5 RTDB: legacy duplicate orderMode is equivalent, distinct or future extensions are preserved',()=>{
  const a={combat:{orderMode:'automatic'}};
  const migrated=migrateSnapshot({schemaVersion:3,reserve:[],combat:{round:0,order:[],participants:[],orderMode:'manual'},log:[],diceLines:[]}).data;
  assert.equal(migrated.combat.orderMode,'manual');assert.equal(migrated.combat.extensions?.orderMode,undefined);
  assert.equal(sameSharedState(a,{combat:{orderMode:'automatic',extensions:{orderMode:'automatic'}}}),true);
  assert.equal(sameSharedState(a,{combat:{orderMode:'automatic',extensions:{orderMode:'manual'}}}),false);
  assert.equal(sameSharedState(a,{combat:{orderMode:'automatic',extensions:{future:{keep:true}}}}),false);
});
});

describe('Synchronisation des personnages P4C', () => {
// P4C — caractérisation de la persistance, de l'export/import et de la synchronisation
// avec un participant ajouté en combat (extensions.v5.*), de même nature qu'une invocation.
// Ces tests épinglent le comportement ACTUEL ; ils ne corrigent rien.

const EXPORTED_AT = '2026-01-01T00:00:00.000Z';
const base = (id, extra = {}) => ({
  id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 50, hp: 12, maxHp: 12,
  caracs: { CC: 40, E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [], ...extra
});
const priest = () => base('priest', {
  initiative: 60,
  extensions: { v5: {
    divine: { sin: 1 },
    divineEffects: [{ id: 'layer-1', sourceId: 'priest', targetId: 'summon', expiry: null, tags: [] }],
    channelling: { type: 'winds', sl: 3 }
  } }
});
// Participant ajouté en cours de combat : zone active, lien extensions.v5.*.
const summon = (extra = {}) => base('summon', {
  kind: 'Créature', camp: 'pj', initiative: 30, improvised: true,
  extensions: { v5: { divineSummon: { sourceId: 'priest', executionId: 'exec-1', expiresAtRound: 5, label: 'Aigle' } } },
  ...extra
});
const combatState = (participants = [priest(), summon()]) => ({
  schemaVersion: 3, reserve: [],
  combat: { round: 2, currentActorId: 'priest', order: participants.map(p => p.id), participants },
  log: [], diceLines: []
});
const ids = participants => participants.map(p => p.id);
const count = (participants, id) => participants.filter(p => p.id === id).length;
// Le journal est comparé à part : chaque import y ajoute « Données chargées » (voir le test dédié).
const exported = store => { const value = JSON.parse(store.getFullJSON()); delete value.exportedAt; delete value.log; return value; };
const logOf = store => JSON.parse(store.getFullJSON()).log;
async function freshStore(state, options = {}) {
  const store = createStore({ storage: null, ...options });
  await store.ready;
  if (state) await store.loadFromJSON(state);
  return store;
}

// Simule le décodeur RTDB : null, objets vides et tableaux vides disparaissent ; un tableau
// devient une map indexée (les index sont conservés).
function rtdb(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'object') return value;
  const out = {};
  const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item]) : Object.entries(value);
  for (const [key, child] of entries) { const kept = rtdb(child); if (kept !== undefined) out[key] = kept; }
  return Object.keys(out).length ? out : undefined;
}

// Lecture SDK/REST : une map aux clés contiguës 0..n-1 est rendue comme un tableau.
function asArrays(value) {
  if (!value || typeof value !== 'object') return value;
  const out = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, asArrays(v)]));
  const keys = Object.keys(out);
  return keys.length && keys.every((k, i) => k === String(i)) ? keys.map(k => out[k]) : out;
}
const sdkRead = value => asArrays(rtdb(value));

// ---------------------------------------------------------------------------------------------
// C7 — persistance, export / import, migration
// ---------------------------------------------------------------------------------------------

test('C7 roundtrip — getFullJSON puis loadFromJSON redonne exactement la même enveloppe (hors exportedAt)', async () => {
  const a = await freshStore(combatState());
  const first = exported(a);
  const b = await freshStore();
  await b.loadFromJSON(a.getFullJSON());
  assert.deepEqual(exported(b), first);
  const c = await freshStore();
  await c.loadFromJSON(b.getFullJSON());
  assert.deepEqual(exported(c), first);
  const participants = first.combat.participants;
  assert.deepEqual(ids(participants), ['priest', 'summon']);
  assert.deepEqual(participants[1].extensions.v5.divineSummon, { sourceId: 'priest', executionId: 'exec-1', expiresAtRound: 5, label: 'Aigle' });
  assert.equal(participants[0].extensions.v5.divineEffects[0].targetId, 'summon');
  assert.equal(participants[1].zone, 'active');
});

test('C7 roundtrip — fait observé : chaque import ajoute une ligne « Données chargées » au journal (le journal n’est pas identique)', async () => {
  const a = await freshStore(combatState());
  const b = await freshStore();
  assert.equal(logOf(b).length, 0);
  await b.loadFromJSON(a.getFullJSON());
  assert.equal(logOf(a).length, 1);
  assert.equal(logOf(b).length, 2);
  assert.deepEqual(logOf(b).map(l => l.text), ['📂 Données chargées.', '📂 Données chargées.']);
});

test('C7 roundtrip — le participant ajouté via addParticipant survit à export/import et reste unique', async () => {
  const store = await freshStore(combatState([priest()]));
  store.addParticipant(summon());
  const first = exported(store);
  assert.equal(count(first.combat.participants, 'summon'), 1);
  assert.deepEqual(first.combat.order.slice().sort(), ['priest', 'summon']);
  // Fait observé : addParticipant range l’objet tel quel (sans les défauts de migration).
  assert.equal(Object.hasOwn(first.combat.participants.find(p => p.id === 'summon'), 'armorLocations'), false);
  const copy = await freshStore();
  await copy.loadFromJSON(store.getFullJSON());
  const second = exported(copy);
  const added = second.combat.participants.find(p => p.id === 'summon');
  assert.equal(count(second.combat.participants, 'summon'), 1);
  assert.deepEqual(added.extensions, summon().extensions);
  assert.deepEqual(second.combat.order, first.combat.order);
  assert.equal(added.zone, 'active');
  assert.equal(added.armorLocations.head, 0);
  // L’import normalise : un deuxième aller-retour est ensuite stable.
  const third = await freshStore();
  await third.loadFromJSON(copy.getFullJSON());
  assert.deepEqual(exported(third), second);
});

test('C7 roundtrip — un store avec persistance IndexedDB recharge le participant ajouté à l’identique', async () => {
  const dbName = `p4c-sync-reload-${Date.now()}`;
  const persistence = createPersistence({ indexedDB, dbName, contextId: 'guest' });
  const store = createStore({ storage: null, persistence, contextId: 'guest' });
  await store.ready;
  await store.loadFromJSON(combatState([priest()]));
  await store.addParticipant(summon());
  await store.whenIdle();
  const before = exported(store);
  persistence.close();
  const reopened = createPersistence({ indexedDB, dbName, contextId: 'guest' });
  const reloaded = createStore({ storage: null, persistence: reopened, contextId: 'guest' });
  await reloaded.ready;
  const after = exported(reloaded);
  assert.deepEqual(after.combat, before.combat);
  assert.equal(count(after.combat.participants, 'summon'), 1);
  reopened.close();
});

test('C7 migrateSnapshot — idempotent avec participant ajouté et divineEffects', () => {
  const once = migrateSnapshot(combatState(), { exportedAt: EXPORTED_AT });
  const twice = migrateSnapshot(once.data, { exportedAt: EXPORTED_AT });
  assert.deepEqual(twice.data, once.data);
  assert.deepEqual(twice.report.rejected, []);
  assert.deepEqual(twice.report.repaired, []);
  assert.deepEqual(twice.report.migrated, []);
  assert.equal(once.data.combat.participants[1].extensions.v5.divineSummon.executionId, 'exec-1');
});

test('C7 migrateSnapshot — 1re passe : seule l’horloge de jeu initiale est migrée, pas le participant', () => {
  const { data, report } = migrateSnapshot(combatState(), { exportedAt: EXPORTED_AT });
  assert.deepEqual(report.migrated, [{ path: 'extensions.v5.gameClock', from: 'absent', to: 'initiale-sans-temps-écoulé' }]);
  assert.deepEqual(report.rejected, []);
  assert.deepEqual(report.repaired, []);
  assert.equal(data.exportedAt, EXPORTED_AT);
  assert.deepEqual(data.combat.participants[0].extensions.v5.divineEffects, priest().extensions.v5.divineEffects);
});

test('C7 migrateSnapshot — ancien fixture sans participant ajouté : mêmes participants, rien de divin inventé', () => {
  const fixture = JSON.parse(readFileSync(new URL('../../fixtures/ancien-format.json', import.meta.url), 'utf8'));
  const once = migrateSnapshot(fixture, { exportedAt: EXPORTED_AT });
  const twice = migrateSnapshot(once.data, { exportedAt: EXPORTED_AT });
  assert.deepEqual(twice.data, once.data);
  assert.deepEqual(ids(once.data.combat.participants), ids(fixture.combat.participants));
  assert.deepEqual(once.report.rejected, []);
  for (const p of once.data.combat.participants) {
    assert.equal(p.extensions?.v5?.divineSummon, undefined);
    assert.equal(p.extensions?.v5?.divineEffects, undefined);
  }
  assert.deepEqual(once.data.reserve.map(p => p.id), fixture.reserve.map(p => p.id));
});

test('C7 migrateSnapshot — état minimal sans participant ajouté : aucun participant, aucune extension divine inventée', () => {
  const minimal = { schemaVersion: 3, reserve: [], combat: { round: 0, participants: [] }, log: [], diceLines: [] };
  const { data } = migrateSnapshot(minimal, { exportedAt: EXPORTED_AT });
  assert.deepEqual(data.combat.participants, []);
  assert.deepEqual(data.combat.order, []);
  assert.deepEqual(data.reserve, []);
  assert.equal(JSON.stringify(data).includes('divineSummon'), false);
});

test('C7 migrateSnapshot — champs inconnus à la racine d’un participant déplacés dans extensions, extensions existantes fusionnées', () => {
  const raw = combatState([priest(), summon({ customThing: 7, aura: { radius: 3 }, extensions: { v5: { divineSummon: { sourceId: 'priest', executionId: 'exec-1' } }, other: 'kept' } })]);
  const { data } = migrateSnapshot(raw, { exportedAt: EXPORTED_AT });
  const p = data.combat.participants[1];
  assert.equal(Object.hasOwn(p, 'customThing'), false);
  assert.equal(Object.hasOwn(p, 'aura'), false);
  assert.equal(p.extensions.customThing, 7);
  assert.deepEqual(p.extensions.aura, { radius: 3 });
  assert.equal(p.extensions.other, 'kept');
  assert.deepEqual(p.extensions.v5.divineSummon, { sourceId: 'priest', executionId: 'exec-1' });
  assert.deepEqual(migrateSnapshot(data, { exportedAt: EXPORTED_AT }).data, data);
});

test('C7 migrateSnapshot — clé d’extensions homonyme d’un champ racine inconnu : l’extension l’emporte', () => {
  const raw = combatState([priest(), summon({ customThing: 'racine', extensions: { customThing: 'extension', v5: {} } })]);
  const p = migrateSnapshot(raw, { exportedAt: EXPORTED_AT }).data.combat.participants[1];
  assert.equal(p.extensions.customThing, 'extension');
});

test('C7 migrateSnapshot — id de participant dupliqué rejeté, le premier exemplaire gagne', () => {
  const second = summon({ name: 'Doublon', extensions: { v5: { divineSummon: { sourceId: 'priest', executionId: 'exec-2' } } } });
  const { data, report } = migrateSnapshot(combatState([priest(), summon(), second]), { exportedAt: EXPORTED_AT });
  assert.equal(count(data.combat.participants, 'summon'), 1);
  const kept = data.combat.participants.find(p => p.id === 'summon');
  assert.equal(kept.name, 'summon');
  assert.equal(kept.extensions.v5.divineSummon.executionId, 'exec-1');
  assert.equal(report.rejected.some(r => r.reason === 'id-duplique' && r.id === 'summon'), true);
});

test('C7 migrateSnapshot — participant sans id rejeté sans casser les autres', () => {
  const orphan = summon(); delete orphan.id;
  const { data, report } = migrateSnapshot(combatState([priest(), orphan]), { exportedAt: EXPORTED_AT });
  assert.deepEqual(ids(data.combat.participants), ['priest']);
  assert.equal(report.rejected.some(r => r.reason === 'id-manquant'), true);
});

test('C7 migrateSnapshot — diceLines orphelines (participantId/targetId absents) réparées à null', () => {
  const raw = combatState();
  raw.diceLines = [
    { id: 'd1', participantId: 'summon', targetId: 'ghost', type: 'skill', base: 40, note: 'ok' },
    { id: 'd2', participantId: 'ghost', targetId: 'priest', type: 'skill', base: 40 }
  ];
  const { data, report } = migrateSnapshot(raw, { exportedAt: EXPORTED_AT });
  const d1 = data.diceLines.find(d => d.id === 'd1'), d2 = data.diceLines.find(d => d.id === 'd2');
  assert.equal(d1.participantId, 'summon');
  assert.equal(d1.targetId, null);
  assert.equal(d2.participantId, null);
  assert.equal(d2.targetId, 'priest');
  assert.equal(report.repaired.filter(r => r.reason === 'participant-orphelin').length, 2);
});

test('C7 sanitation — bornage numérique des champs magiques du participant ajouté', () => {
  const dirty = summon({ extensions: { v5: { divineSummon: { sourceId: 'priest', executionId: 'exec-1' }, sin: -4, ward: 'abc', fortune: 5000.7 } } });
  const { data } = migrateSnapshot(combatState([priest(), dirty]), { exportedAt: EXPORTED_AT });
  const v5 = data.combat.participants[1].extensions.v5;
  assert.equal(v5.sin, 0);
  assert.equal(Object.hasOwn(v5, 'ward'), false);
  assert.equal(v5.fortune, 1000);
  assert.deepEqual(v5.divineSummon, { sourceId: 'priest', executionId: 'exec-1' });
});

test('C7 import — enveloppe sans combat ou JSON malformé refusés sans toucher au store courant', async () => {
  const store = await freshStore(combatState());
  const before = exported(store);
  const consoleError = console.error;
  console.error = () => {}; // le store journalise l’erreur d’import sur stderr
  try {
    await assert.rejects(async () => store.loadFromJSON({ schemaVersion: 3, reserve: [] }));
    await assert.rejects(async () => store.loadFromJSON('{pas du json'));
  } finally { console.error = consoleError; }
  assert.deepEqual(exported(store), before);
});

// ---------------------------------------------------------------------------------------------
// C8 — protocole de synchronisation
// ---------------------------------------------------------------------------------------------
const op = (state, sequence = 1, baseRevision = 0, deviceId = 'dev-a') => ({ deviceId, sequence, baseRevision, state });

test('C8 applyOperation — appliqué : révision +1, reçu mémorisé, participant ajouté conservé', () => {
  const result = applyOperation(null, op(combatState()));
  assert.equal(result.status, 'applied');
  assert.equal(result.applied, true);
  assert.equal(result.document.revision, 1);
  assert.deepEqual(result.document.receipts, { 'dev-a': 1 });
  assert.deepEqual(ids(result.document.state.combat.participants), ['priest', 'summon']);
  assert.equal(result.document.state.combat.participants[1].extensions.v5.divineSummon.executionId, 'exec-1');
});

test('C8 applyOperation — doublon de séquence : document inchangé, même si la révision a avancé depuis', () => {
  const first = applyOperation(null, op(combatState()));
  const again = applyOperation(first.document, op(combatState()));
  assert.equal(again.status, 'duplicate');
  assert.equal(again.applied, false);
  assert.equal(again.document.revision, 1);
  assert.equal(count(again.document.state.combat.participants, 'summon'), 1);
  const other = applyOperation(first.document, op(combatState([priest()]), 1, 1, 'dev-b'));
  assert.equal(other.status, 'applied');
  const replayOld = applyOperation(other.document, op(combatState(), 1, 0, 'dev-a'));
  assert.equal(replayOld.status, 'duplicate');
  assert.equal(replayOld.document.revision, 2);
  assert.deepEqual(ids(replayOld.document.state.combat.participants), ['priest']);
});

test('C8 applyOperation — trou de séquence : refusé avec la séquence attendue', () => {
  const result = applyOperation(null, op(combatState(), 2, 0));
  assert.equal(result.status, 'sequence-gap');
  assert.equal(result.applied, false);
  assert.equal(result.expectedSequence, 1);
  assert.equal(result.document.revision, 0);
  assert.deepEqual(result.document.state, {});
});

test('C8 applyOperation — conflit de révision : refusé, état distant intact', () => {
  const first = applyOperation(null, op(combatState([priest()])));
  const stale = applyOperation(first.document, op(combatState(), 1, 0, 'dev-b'));
  assert.equal(stale.status, 'conflict');
  assert.equal(stale.currentRevision, 1);
  assert.equal(stale.applied, false);
  assert.deepEqual(ids(stale.document.state.combat.participants), ['priest']);
});

test('C8 applyOperation — séquence 0, baseRevision négatif, clé étrangère et schéma 2 rejetés par exception', () => {
  assert.throws(() => applyOperation(null, op(combatState(), 0)), /sequence/);
  assert.throws(() => applyOperation(null, op(combatState(), 1, -1)), /baseRevision/);
  assert.throws(() => applyOperation(null, { ...op(combatState()), extra: 1 }), /inconnue/);
  assert.throws(() => applyOperation(null, op({ ...combatState(), schemaVersion: 2 })), /incompatible/);
});

test('C8 sharedState — champs locaux retirés, participant ajouté et couche divine conservés', () => {
  const state = { ...combatState(), log: [{ id: 'l' }], exportedAt: EXPORTED_AT, appVersion: '3.16.1', syncPending: true, localRevision: 4 };
  const shared = sharedState(state);
  for (const key of ['log', 'exportedAt', 'appVersion', 'syncPending', 'localRevision']) assert.equal(Object.hasOwn(shared, key), false, key);
  assert.deepEqual(ids(shared.combat.participants), ['priest', 'summon']);
  assert.equal(shared.combat.participants[0].extensions.v5.divineEffects[0].id, 'layer-1');
});

test('C8 createOperation — l’opération émise est un clone : muter la source ensuite ne la change pas', () => {
  const state = combatState();
  const operation = createOperation(op(state));
  state.combat.participants[1].extensions.v5.divineSummon.executionId = 'muté';
  assert.equal(operation.state.combat.participants[1].extensions.v5.divineSummon.executionId, 'exec-1');
});

// --- copie RTDB -------------------------------------------------------------------------------
async function envelopeFor(participants) {
  const store = await freshStore(combatState(participants));
  return exported(store);
}

test('C8 RTDB — la copie sans null ni tableaux vides, passée par le décodeur distant, est comparable à l’original', async () => {
  const original = await envelopeFor([priest(), summon()]);
  const document = applyOperation(null, op(original)).document;
  const stripped = rtdb(document);
  // Le null de divineEffects[0].expiry, tags:[] et states:[] ont disparu côté RTDB.
  const rtdbPriest = stripped.state.combat.participants['0'];
  assert.equal(Object.hasOwn(rtdbPriest.extensions.v5.divineEffects['0'], 'expiry'), false);
  assert.equal(Object.hasOwn(rtdbPriest.extensions.v5.divineEffects['0'], 'tags'), false);
  assert.equal(Object.hasOwn(rtdbPriest, 'states'), false);
  const decoded = normalizeRemoteDocument(asArrays(stripped));
  assert.equal(decoded.revision, 1);
  assert.equal(sameSharedState(decoded.state, document.state), true);
  assert.equal(sameSharedState(document.state, decoded.state), true);
});

test('C8 RTDB — fait à documenter : sans le décodeur normalizeRemoteDocument, la copie brute fait lever sameSharedState', async () => {
  const original = await envelopeFor([priest(), summon()]);
  const stripped = rtdb(applyOperation(null, op(original)).document);
  // grants:[] du registre divineAccess a disparu : le registre n’est plus canonique.
  assert.equal(Object.hasOwn(stripped.state.extensions.v5.divineAccess, 'grants'), false);
  assert.throws(() => sameSharedState(stripped.state, original), /Registre de dérogations divines mal formé/);
  assert.throws(() => applyOperation(stripped, op(original, 1, 1, 'dev-b')), /Registre de dérogations divines mal formé/);
});

test('C8 RTDB — un null « porteur de sens » (currentActorId, expiry) disparaît mais sameSharedState l’ignore', async () => {
  const original = await envelopeFor([priest(), summon()]);
  original.combat.currentActorId = null;
  const document = applyOperation(null, op(original)).document;
  const decoded = normalizeRemoteDocument(sdkRead(document));
  assert.equal(Object.hasOwn(decoded.state.combat, 'currentActorId'), false);
  assert.equal(Object.hasOwn(decoded.state.combat.participants[0].extensions.v5.divineEffects[0], 'expiry'), false);
  assert.equal(document.state.combat.currentActorId, null);
  assert.equal(document.state.combat.participants[0].extensions.v5.divineEffects[0].expiry, null);
  // Les deux versions sont « comparables », mais les états ne sont pas identiques octet pour octet.
  assert.equal(sameSharedState(decoded.state, document.state), true);
  assert.notDeepEqual(decoded.state, document.state);
});

test('C8 RTDB — null et absence sont indistinguables pour sameSharedState, une valeur différente non', async () => {
  const original = await envelopeFor([priest(), summon()]);
  const withNull = structuredClone(original);
  withNull.combat.participants[1].extensions.v5.divineSummon.note = null;
  assert.equal(sameSharedState(withNull, original), true);
  const changed = structuredClone(original);
  changed.combat.participants[1].extensions.v5.divineSummon.executionId = 'exec-2';
  assert.equal(sameSharedState(changed, original), false);
  const without = structuredClone(original);
  without.combat.participants = without.combat.participants.slice(0, 1);
  assert.equal(sameSharedState(without, original), false);
});

test('C8 RTDB — une copie où le participant ajouté a disparu n’est jamais comparable à l’original', async () => {
  const original = await envelopeFor([priest(), summon()]);
  const document = applyOperation(null, op(original)).document;
  const stripped = rtdb(document);
  delete stripped.state.combat.participants['1'];
  const decoded = normalizeRemoteDocument(asArrays(stripped));
  assert.equal(sameSharedState(decoded.state, document.state), false);
});

test('C8 RTDB — fait à documenter : une map de participants non convertie en tableau fait lever le décodeur distant', async () => {
  const original = await envelopeFor([priest(), summon()]);
  const document = applyOperation(null, op(original)).document;
  // Forme « map indexée » brute (RTDB sans conversion en tableau par le SDK) : non supportée.
  assert.throws(() => normalizeRemoteDocument(rtdb(document)), TypeError);
});

test('C8 RTDB — racine absente donne un document vide ; receipts vides omis par RTDB sont restaurés à {}', () => {
  assert.deepEqual(normalizeRemoteDocument(null), { revision: 0, state: {}, receipts: {} });
  const original = combatState();
  const decoded = normalizeRemoteDocument(sdkRead({ revision: 3, state: original, receipts: {} }));
  assert.equal(decoded.revision, 3);
  assert.deepEqual(decoded.receipts, {});
  assert.equal(count(decoded.state.combat.participants, 'summon'), 1);
});

// ---------------------------------------------------------------------------------------------
// C8 — deux Store hors ligne qui divergent, puis résolution de conflit
// ---------------------------------------------------------------------------------------------
const tick = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, label, timeout = 4000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error(`timeout: ${label}`);
    await tick(5);
  }
}

// Racine distante partagée ; `online` coupe lectures et transactions (appareil hors ligne).
function cloud() {
  // Chaque appareil a son propre interrupteur : l’ordre de publication reste déterministe.
  const net = { root: null, down: new Set(), transactions: [], up: name => net.down.delete(name) };
  net.transportFor = name => ({
    async read() { if (net.down.has(name)) throw new Error('offline'); return structuredClone(net.root); },
    async transaction(operation) {
      if (net.down.has(name)) throw new Error('offline');
      const result = applyOperation(net.root, operation);
      net.transactions.push(result.status);
      if (!result.applied) return { status: 'aborted', root: result.document };
      net.root = result.document;
      return { status: 'committed', root: result.document };
    }
  });
  return net;
}

async function device(net, name, dbName) {
  const persistence = createPersistence({ indexedDB, dbName, contextId: 'account:test' });
  const statuses = [];
  const conflicts = [];
  const store = createStore({
    storage: null, persistence, contextId: 'account:test',
    persistenceFactory: contextId => createPersistence({ indexedDB, dbName, contextId }),
    bus: { emit: (event, payload) => { if (event === 'sync:conflict') conflicts.push(payload); } },
    onSyncStatus: status => statuses.push(status)
  });
  await store.ready;
  const transport = net.transportFor(name);
  const attach = () => store.attachSync({
    contextId: 'account:test',
    createSession: options => createSyncSession({ ...options, transport, deviceId: `${name}-device` })
  });
  return { name, store, persistence, statuses, conflicts, attach, close: () => { store.detachSync(); persistence.close(); } };
}
const summonsIn = store => store.listParticipants().filter(p => p.id === 'summon');
const remoteSummons = net => (net.root.state.combat.participants || []).filter(p => p.id === 'summon');

// A et B partent du même état distant (priest + ally), puis passent hors ligne et divergent.
async function diverge() {
  const net = cloud();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const A = await device(net, 'a', `p4c-sync-a-${stamp}`);
  const B = await device(net, 'b', `p4c-sync-b-${stamp}`);
  A.attach();
  await until(() => A.statuses.includes('pending') || A.statuses.includes('ready') || A.statuses.includes('synced'), 'A ouvre sa session');
  await A.store.loadFromJSON(combatState([priest(), base('ally', { initiative: 20 })]));
  await until(() => net.root && net.root.revision >= 1, 'A publie la base');
  await A.store.whenIdle();
  B.attach();
  await until(() => B.store.listParticipants().some(p => p.id === 'ally'), 'B adopte la base distante');
  await B.store.whenIdle();
  const baseRevision = net.root.revision;
  net.down.add('a'); net.down.add('b');
  return { net, A, B, baseRevision };
}

test('C8 deux Store — ajout hors ligne : A garde un seul participant ajouté, rien n’est publié tant que le réseau est coupé', async () => {
  const { net, A, B, baseRevision } = await diverge();
  try {
    await A.store.addParticipant(summon());
    await A.store.whenIdle();
    await B.store.updateParticipant('ally', { hp: 7 });
    await B.store.whenIdle();
    assert.equal(summonsIn(A.store).length, 1);
    assert.equal(summonsIn(B.store).length, 0);
    assert.equal(net.root.revision, baseRevision);
    assert.equal(remoteSummons(net).length, 0);
    const queued = await A.persistence.listOutbox();
    assert.ok(queued.length >= 1);
    assert.equal(queued.at(-1).state.combat.participants.filter(p => p.id === 'summon').length, 1);
  } finally { A.close(); B.close(); }
});

test('C8 deux Store — B publie d’abord ; A (qui a ajouté) en conflit choisit LOCAL : un seul exemplaire partout, la modif de B est perdue', async () => {
  const { net, A, B } = await diverge();
  try {
    await A.store.addParticipant(summon());
    await A.store.whenIdle();
    await B.store.updateParticipant('ally', { hp: 7 });
    await B.store.whenIdle();
    net.up('b');
    await until(() => B.statuses.at(-1) === 'synced', 'B publie');
    const revisionAfterB = net.root.revision;
    net.up('a');
    await until(() => A.conflicts.length > 0 || A.statuses.includes('conflict'), 'conflit chez A');
    assert.equal(summonsIn(A.store).length, 1, 'le conflit seul ne change pas l’état local');
    assert.equal(remoteSummons(net).length, 0);
    assert.equal(net.root.revision, revisionAfterB);
    await A.store.resolveSyncLocal();
    await A.store.whenIdle();
    assert.equal(summonsIn(A.store).length, 1);
    assert.equal(remoteSummons(net).length, 1);
    assert.equal(net.root.revision, revisionAfterB + 1);
    assert.equal(net.root.state.combat.participants.find(p => p.id === 'ally').hp, 12);
    assert.equal(net.root.state.combat.participants.find(p => p.id === 'summon').extensions.v5.divineSummon.executionId, 'exec-1');
  } finally { A.close(); B.close(); }
});

test('C8 deux Store — même conflit côté A, choix DISTANT : le participant ajouté disparaît (pas de fusion), jamais deux', async () => {
  const { net, A, B } = await diverge();
  try {
    await A.store.addParticipant(summon());
    await A.store.whenIdle();
    await B.store.updateParticipant('ally', { hp: 7 });
    await B.store.whenIdle();
    net.up('b');
    await until(() => B.statuses.at(-1) === 'synced', 'B publie');
    const revisionAfterB = net.root.revision;
    net.up('a');
    await until(() => A.conflicts.length > 0 || A.statuses.includes('conflict'), 'conflit chez A');
    await A.store.resolveSyncRemote();
    await A.store.whenIdle();
    assert.equal(summonsIn(A.store).length, 0);
    assert.equal(remoteSummons(net).length, 0);
    assert.equal(A.store.listParticipants().find(p => p.id === 'ally').hp, 7);
    assert.equal(net.root.revision, revisionAfterB);
    assert.deepEqual(await A.persistence.listOutbox(), []);
  } finally { A.close(); B.close(); }
});

test('C8 deux Store — A publie d’abord ; B en conflit choisit DISTANT : B reçoit exactement un participant ajouté', async () => {
  const { net, A, B } = await diverge();
  try {
    await A.store.addParticipant(summon());
    await A.store.whenIdle();
    await B.store.updateParticipant('ally', { hp: 7 });
    await B.store.whenIdle();
    net.up('a');
    await until(() => remoteSummons(net).length === 1, 'A publie (reprise automatique après coupure)', 10000);
    assert.equal(remoteSummons(net).length, 1);
    const revisionAfterA = net.root.revision;
    net.up('b');
    await until(() => B.conflicts.length > 0 || B.statuses.includes('conflict'), 'conflit chez B');
    await B.store.resolveSyncRemote();
    await B.store.whenIdle();
    assert.equal(summonsIn(B.store).length, 1);
    assert.equal(B.store.listParticipants().find(p => p.id === 'ally').hp, 12);
    assert.equal(remoteSummons(net).length, 1);
    assert.equal(net.root.revision, revisionAfterA);
  } finally { A.close(); B.close(); }
});

test('C8 deux Store — A publie d’abord ; B en conflit choisit LOCAL : le participant ajouté par A est écrasé, jamais dupliqué', async () => {
  const { net, A, B } = await diverge();
  try {
    await A.store.addParticipant(summon());
    await A.store.whenIdle();
    await B.store.updateParticipant('ally', { hp: 7 });
    await B.store.whenIdle();
    net.up('a');
    await until(() => remoteSummons(net).length === 1, 'A publie (reprise automatique après coupure)', 10000);
    const revisionAfterA = net.root.revision;
    net.up('b');
    await until(() => B.conflicts.length > 0 || B.statuses.includes('conflict'), 'conflit chez B');
    await B.store.resolveSyncLocal();
    await B.store.whenIdle();
    assert.equal(summonsIn(B.store).length, 0);
    assert.equal(remoteSummons(net).length, 0);
    assert.equal(net.root.revision, revisionAfterA + 1);
    assert.equal(net.root.state.combat.participants.find(p => p.id === 'ally').hp, 7);
  } finally { A.close(); B.close(); }
});

test('C8 deux Store — réexécution d’une opération déjà appliquée : doublon, un seul exemplaire, révision inchangée', async () => {
  const { net, A } = await diverge();
  try {
    await A.store.addParticipant(summon());
    await A.store.whenIdle();
    const pending = (await A.persistence.listOutbox()).at(-1);
    net.up('a');
    await until(() => remoteSummons(net).length === 1, 'A publie (reprise automatique après coupure)', 10000);
    const revision = net.root.revision;
    const receipts = structuredClone(net.root.receipts);
    const replay = applyOperation(net.root, pending);
    assert.equal(replay.status, 'duplicate');
    assert.equal(replay.document.revision, revision);
    assert.deepEqual(replay.document.receipts, receipts);
    assert.equal(replay.document.state.combat.participants.filter(p => p.id === 'summon').length, 1);
    // Rejeu via le transport comme après un accusé perdu : abandon sans nouvelle révision.
    const viaTransport = await net.transportFor('a').transaction(pending);
    assert.equal(viaTransport.status, 'aborted');
    assert.equal(net.root.revision, revision);
    assert.equal(remoteSummons(net).length, 1);
  } finally { A.close(); }
});
});
