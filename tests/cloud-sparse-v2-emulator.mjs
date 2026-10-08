/** Sparse v2 migration receipt against localhost Auth/RTDB only.
 * RTDB removes []/{}; migration must preserve data and never replace an existing v3.
 * IDB in this Node integration uses fake-indexeddb; Firebase serialization/CAS is real.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { indexedDB } from 'fake-indexeddb';
import { createPersistence } from '../js/core/persistence.js';
import { createStore } from '../js/core/store.js';
import { createSyncSession } from '../js/core/sync-session.js';
import { migrateSnapshot } from '../js/core/migrations.js';
import { migrateV2SyncDocument, createMigratingTransport } from '../js/core/sync-migration.js';
function local(raw) {
  const url = new URL('http://' + raw);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && url.port && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash, 'emulators must be strictly localhost');
  return url.origin;
}
const db = local(process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:19000');
const auth = local(process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:19099');
const namespace = 'demo-cloud-sparse-' + Date.now();
let token, uid, migrations = 0;
async function request(path, { owner = false, method = 'GET', body, headers = {} } = {}) {
  const authorization = owner ? '&access_token=owner' : token ? '&auth=' + encodeURIComponent(token) : '';
  const response = await fetch(db + '/' + path + '.json?ns=' + namespace + authorization, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  assert.ok(response.status === 200 || response.status === 412, 'local REST request rejected: ' + response.status);
  return response;
}
async function read(path) { return (await request(path)).json(); }
async function transact(path, update) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const source = await request(path, { headers: { 'X-Firebase-ETag': 'true' } });
    const current = await source.json();
    const next = update(current);
    if (next === undefined) return { status: 'aborted', root: current };
    const result = await request(path, { method: 'PUT', body: next, headers: { 'If-Match': source.headers.get('etag') } });
    if (result.status === 200) { migrations += 1; return { status: 'committed', root: await result.json() }; }
  }
  throw new Error('local CAS retries exhausted');
}
let persistence, store;
try {
  const rules = await readFile(new URL('../firebase.database.rules.json', import.meta.url), 'utf8');
  const loaded = await fetch(db + '/.settings/rules.json?ns=' + namespace + '&access_token=owner', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: rules });
  assert.equal(loaded.status, 200);
  const signup = await fetch(auth + '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-sparse', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'qa-' + Date.now() + '@control.test', password: 'password123', returnSecureToken: true }) });
  assert.equal(signup.status, 200);
  const identity = await signup.json(); token = identity.idToken; uid = identity.localId;
  const legacyPath = 'wfrp-sessions-v2/' + uid + '/current';
  const currentPath = 'wfrp-sessions-v3/' + uid + '/current';
  const dense = { revision: 5, receipts: {}, state: { schemaVersion: 2, reserve: [], combat: { round: 2, order: [], participants: [{ id: 'qa-participant', name: 'Fixture locale', hp: 12, maxHp: 14 }], extensions: { futureCombat: { retained: true } } }, diceLines: [{ id: 'qa-roll', type: 'skill', base: 42, note: 'Jet de fixture' }], extensions: { futureRoot: { retained: true } } } };
  await request(legacyPath, { owner: true, method: 'PUT', body: dense });
  const source = await read(legacyPath);
  assert.equal(Object.hasOwn(source.state, 'reserve'), false, 'RTDB actually omits empty reserve');
  assert.equal(Object.hasOwn(source, 'receipts'), false);
  const migrated = migrateV2SyncDocument(source);
  assert.equal(migrated.revision, dense.revision); assert.deepEqual(migrated.state.reserve, []);
  assert.deepEqual(migrated.state.extensions.futureRoot, dense.state.extensions.futureRoot);
  assert.deepEqual(migrated.state.combat.extensions.futureCombat, dense.state.combat.extensions.futureCombat);
  assert.equal(migrated.state.diceLines[0].id, dense.state.diceLines[0].id);
  assert.equal(migrated.state.combat.participants[0].id, dense.state.combat.participants[0].id);
  const transport = createMigratingTransport({ current: currentPath, legacy: legacyPath, read, transact, subscribe: () => () => {} });
  const remote = await transport.read();
  assert.equal(remote.state.schemaVersion, 3); assert.equal(remote.revision, 5);
  assert.equal(Object.hasOwn(remote.state, 'reserve'), false, 'new v3 roundtrip also omits []');
  assert.equal(migrations, 1);
  assert.deepEqual(await read(legacyPath), source, 'original v2 unchanged');
  const journal = [{ id: 'qa-local-log', ts: 1, kind: 'management', text: 'Journal uniquement local' }];
  const contextId = 'account:' + uid;
  persistence = createPersistence({ indexedDB, dbName: namespace, contextId });
  const initial = migrateSnapshot({ schemaVersion: 3, reserve: [], combat: {}, log: journal, diceLines: [], extensions: { localEnvelope: true } }, { contextId }).data;
  await persistence.saveAtomic({ state: initial });
  const statuses = [];
  store = createStore({ storage: null, persistence, contextId, onSyncStatus: status => statuses.push(status) });
  await store.ready;
  store.attachSync({ contextId, createSession: options => createSyncSession({ ...options, transport }) });
  for (let attempt = 0; attempt < 200 && !statuses.includes('synced') && !statuses.includes('error'); attempt += 1) await new Promise(done => setTimeout(done, 25));
  assert.ok(statuses.includes('synced'), 'sparse v3 reaches synced through the real Store/session');
  assert.deepEqual(store.getLog(), journal);
  assert.equal(store.listParticipants()[0].id, 'qa-participant');
  const durable = await persistence.load();
  assert.deepEqual(durable.log, journal);
  assert.equal(durable.extensions.futureRoot.retained, true);
  assert.equal(durable.combat.extensions.futureCombat.retained, true);
  assert.equal(durable.diceLines[0].id, 'qa-roll');
  assert.deepEqual(durable.reserve, []);
  assert.deepEqual(await read(legacyPath), source);
  assert.deepEqual(await read(currentPath), remote);
  assert.equal(migrations, 1, 'session adoption makes no extra write');
  store.detachSync();
  const winner = { revision: 99, state: { schemaVersion: 3, reserve: [{ id: 'winner', name: 'Winning client' }], combat: { round: 0 } } };
  await request(currentPath, { owner: true, method: 'PUT', body: winner });
  const stable = await read(currentPath);
  assert.deepEqual(await transport.read(), stable); assert.equal(migrations, 1);
  let staleInitialRead = true;
  const racing = createMigratingTransport({ current: currentPath, legacy: legacyPath, read: async path => {
    if (path === currentPath && staleInitialRead) { staleInitialRead = false; return null; }
    return read(path);
  }, transact });
  assert.deepEqual(await racing.read(), stable); assert.equal(migrations, 1);
  assert.deepEqual(await read(legacyPath), source);
  for (const [field, value] of [['reserve', null], ['reserve', true], ['reserve', 'invalid'], ['reserve', 4], ['combat', null], ['combat', []], ['combat', 'invalid']]) {
    const invalid = { ...source, state: { ...source.state, [field]: value } };
    let writes = 0;
    const guarded = createMigratingTransport({ current: 'not-created', legacy: 'invalid', read: async path => path === 'invalid' ? invalid : null, transact: async () => { writes += 1; } });
    await assert.rejects(guarded.read());
    assert.equal(writes, 0, 'invalid populated data refused before any transaction');
  }
  console.log('PASS sparse v2: real RTDB removes [], v3 initialized once, Store/session synced, local journal and nonempty branches preserved; existing/racing v3 untouched; 7 invalid shapes rejected before writes; v2 unchanged.');
} finally {
  store?.detachSync(); persistence?.close();
  try { await request('', { owner: true, method: 'DELETE' }); } catch { /* cleanup only the disposable localhost namespace */ }
}

