/** Independent receipt test against local Auth and RTDB emulators only.
 * FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000
 * FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
 * node tests/firebase-rules-v3-emulator.mjs
 * Loads the actual production rules into a disposable local namespace.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const checks = [];

function localBase(raw, label) {
  const parsed = new URL('http://' + raw);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname), label + ' must be strictly local');
  assert.ok(parsed.port && !parsed.username && !parsed.password && parsed.pathname === '/' && !parsed.search && !parsed.hash, label + ' must be a localhost host:port only');
  return parsed.origin;
}
const db = localBase(process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000', 'RTDB');
const auth = localBase(process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099', 'Auth');
const namespace = `demo-fiches-pj-control-${Date.now()}`;
const dbUrl = path => `${db}/${path.replace(/^\/+/, '')}.json?ns=${namespace}`;
async function request(path, { token, method = 'GET', body, owner = false } = {}) {
  const query = token ? `&auth=${encodeURIComponent(token)}` : owner ? '&access_token=owner' : '';
  return fetch(dbUrl(path) + query, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
}
async function allowed(label, response) {
  const text = await response.text();
  assert.equal(response.status, 200, `${label}: HTTP ${response.status}: ${text}`);
  checks.push({ label, status: response.status, outcome: 'allowed' });
  return text ? JSON.parse(text) : null;
}
async function denied(label, response) {
  const text = await response.text();
  checks.push({ label, status: response.status, outcome: 'denied' });
  assert.ok([401, 403].includes(response.status), `${label}: expected denial, HTTP ${response.status}: ${text}`);
}
async function identity(name) {
  const response = await fetch(`${auth}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-fiches-pj`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `${name}-${Date.now()}@control.test`, password: 'password123', returnSecureToken: true }) });
  const result = await allowed(`create local ${name}`, response);
  return { uid: result.localId, token: result.idToken };
}
async function main() {
  const rules = await readFile(new URL('../firebase.database.rules.json', import.meta.url), 'utf8');
  await allowed('load production rules locally', await fetch(`${db}/.settings/rules.json?ns=${namespace}&access_token=owner`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: rules }));
  const alice = await identity('alice'); const bob = await identity('bob');
  const path = `wfrp-sessions-v3/${alice.uid}/current`;
  const valid = { revision: 1, receipts: { device: 1 }, state: { schemaVersion: 3, reserve: [{ id: 'pj', name: 'Control', equipment: [{ id: 'instance', kind: 'weapon', keywords: [{ id: 'unknown', parameter: 'text' }] }], armorLocations: { head: 0, body: 5, rightArm: 4, leftArm: 1, rightLeg: 2, leftLeg: 0 } }], combat: { round: 0 } } };
  await allowed('owner writes v3', await request(path, { token: alice.token, method: 'PUT', body: valid }));
  assert.deepEqual(await allowed('owner reads v3', await request(path, { token: alice.token })), valid);
  await denied('foreign read v3', await request(path, { token: bob.token }));
  await denied('guest read v3', await request(path));
  await denied('foreign write v3', await request(path, { token: bob.token, method: 'PUT', body: valid }));
  await denied('guest writes v3', await request(path, { method: 'PUT', body: valid }));
  await denied('foreign delete v3', await request(path, { token: bob.token, method: 'DELETE' }));
  await denied('old client schema 2 write v3', await request(path, { token: alice.token, method: 'PUT', body: { ...valid, state: { ...valid.state, schemaVersion: 2 } } }));
  await denied('revision regression', await request(path, { token: alice.token, method: 'PUT', body: { ...valid, revision: 0 } }));
  await denied('non integer revision', await request(path, { token: alice.token, method: 'PUT', body: { ...valid, revision: 1.5 } }));
  await denied('non numeric receipt', await request(path, { token: alice.token, method: 'PUT', body: { ...valid, receipts: { device: '1' } } }));
  await denied('fractional receipt', await request(path, { token: alice.token, method: 'PUT', body: { ...valid, receipts: { device: 0.5 } } }));
  await denied('negative receipt', await request(path, { token: alice.token, method: 'PUT', body: { ...valid, receipts: { device: -1 } } }));
  await denied('scalar receipts container', await request(path, { token: alice.token, method: 'PUT', body: { ...valid, receipts: 1 } }));
  await denied('extra root field', await request(path, { token: alice.token, method: 'PUT', body: { ...valid, unknown: 'field' } }));
  await denied('owner cannot delete migrated current', await request(path, { token: alice.token, method: 'DELETE' }));
  const legacyPath = `wfrp-sessions-v2/${alice.uid}/current`;
  const legacy = { revision: 3, state: { schemaVersion: 2, reserve: [{ id: 'old', name: 'Old client' }] } };
  await allowed('seed old session locally', await request(legacyPath, { owner: true, method: 'PUT', body: legacy }));
  assert.deepEqual(await allowed('owner reads legacy v2 for migration', await request(legacyPath, { token: alice.token })), legacy);
  await denied('owner legacy v2 writes frozen', await request(legacyPath, { token: alice.token, method: 'PUT', body: legacy }));
  await denied('foreign legacy v2 read', await request(legacyPath, { token: bob.token }));
  const oldPath = 'wfrp-sessions/' + alice.uid;
  const oldState = { reserve: [{ id: 'v1', name: 'Legacy v1' }] };
  await allowed('seed legacy v1 locally', await request(oldPath, { owner: true, method: 'PUT', body: oldState }));
  assert.deepEqual(await allowed('owner reads legacy v1', await request(oldPath, { token: alice.token })), oldState);
  await denied('owner legacy v1 writes frozen', await request(oldPath, { token: alice.token, method: 'PUT', body: oldState }));
  await denied('foreign legacy v1 read', await request(oldPath, { token: bob.token }));
  await denied('guest legacy v1 read', await request(oldPath));
  await denied('guest legacy v2 read', await request(legacyPath));
  assert.deepEqual(await allowed('v3 unchanged by rejected old client', await request(path, { token: alice.token })), valid);
  // RTDB canonically removes empty maps rather than persisting an empty object.
  const withoutReceipts = { revision: valid.revision, state: valid.state };
  await allowed('owner writes empty receipts map', await request(path, { token: alice.token, method: 'PUT', body: { ...valid, receipts: {} } }));
  assert.deepEqual(await allowed('empty receipts map removed canonically', await request(path, { token: alice.token })), withoutReceipts);
  await allowed('owner restores valid receipts map', await request(path, { token: alice.token, method: 'PUT', body: valid }));
  const advanced = { ...valid, revision: 2, receipts: { device: 2 } };
  await allowed('owner advances revision', await request(path, { token: alice.token, method: 'PUT', body: advanced }));
  assert.deepEqual(await allowed('owner reads advanced revision', await request(path, { token: alice.token })), advanced);
  await denied('regression after advance', await request(path, { token: alice.token, method: 'PUT', body: valid }));
  await allowed('local cleanup only', await request('', { owner: true, method: 'DELETE' }));
  console.log('CHECKS ' + JSON.stringify(checks));
  console.log('PASS — production rules v3: owner isolation, schema and receipt validation, revision monotonicity, v2 read-only, old-client rejection');
}
main().catch(error => { console.error(`BLOCKED/FAIL — rules v3 emulator: ${error.stack || error.message}`); process.exitCode = 1; });
