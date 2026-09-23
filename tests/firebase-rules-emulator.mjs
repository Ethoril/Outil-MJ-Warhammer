/*
 * E05 rules smoke test. This talks only to a locally running Realtime
 * Database emulator. It deliberately creates disposable users in the local
 * Auth emulator instead of using CLI auth or a Firebase account. Start both
 * emulators separately, for example:
 *   FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 \
 *   FIREBASE_DATABASE_EMULATOR_NS=demo-wfrp-e05 \
 *   node tests/firebase-rules-emulator.mjs
 *
 * Set FIREBASE_RULES_SEED=1 when the emulator accepts its local owner token;
 * this seeds the read-only v1 branch so the owner-read/foreign-read cases can
 * also be checked. No seed is attempted by default.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function localBase(raw, label) {
  const value = raw || '';
  const hostname = value.startsWith('[') ? value.slice(1, value.indexOf(']')) : value.split(':')[0];
  if (!['127.0.0.1', 'localhost', '::1'].includes(hostname)) {
    throw new Error(`${label} doit rester local (127.0.0.1, localhost ou ::1), reçu ${value}`);
  }
  const host = hostname === '::1' ? `[${hostname}]` : hostname;
  const port = value.startsWith('[') ? value.slice(value.indexOf(']') + 2) : value.split(':')[1];
  return `http://${host}${port ? `:${port}` : ''}`;
}

const databaseBase = localBase(process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000', 'FIREBASE_DATABASE_EMULATOR_HOST');
const authBase = localBase(process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099', 'FIREBASE_AUTH_EMULATOR_HOST');
// The script loads the repository rules into this explicitly local namespace
// before creating the disposable identities below.
const namespace = process.env.FIREBASE_DATABASE_EMULATOR_NS || 'demo-wfrp-e05';
function url(path, extra = '') {
  const suffix = extra ? `&${extra}` : '';
  return `${databaseBase}/${path.replace(/^\/+/, '')}.json?ns=${encodeURIComponent(namespace)}${suffix}`;
}

async function request(path, { token = null, method = 'GET', body, extra = '' } = {}) {
  try {
    const auth = token ? `&auth=${encodeURIComponent(token)}` : '';
    return await fetch(url(path, extra) + auth, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' })
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch (error) {
    throw new Error(`Émulateur RTDB inaccessible sur ${databaseBase} (${error.message})`);
  }
}

async function loadRulesIntoLocalNamespace() {
  const rules = await readFile(new URL('../firebase.database.rules.v2.test.json', import.meta.url), 'utf8');
  const response = await fetch(`${databaseBase}/.settings/rules.json?ns=${encodeURIComponent(namespace)}&access_token=owner`, {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: rules
  });
  const payload = await response.text();
  assert.equal(response.status, 200, `chargement des règles locales: HTTP ${response.status} — ${payload}`);
}

async function createLocalIdentity(label) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const response = await fetch(`${authBase}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `${label}-${suffix}@e05.test`, password: 'password123', returnSecureToken: true })
  });
  const payload = await response.json();
  assert.equal(response.status, 200, `Auth emulator ${label}: HTTP ${response.status} — ${JSON.stringify(payload)}`);
  return { uid: payload.localId, token: payload.idToken };
}

async function expectAllowed(label, response, expected = 200) {
  const text = await response.text();
  assert.equal(response.status, expected, `${label}: HTTP ${response.status} — ${text}`);
  return text ? JSON.parse(text) : null;
}

async function expectDenied(label, response) {
  const text = await response.text();
  assert.ok([401, 403].includes(response.status), `${label}: HTTP ${response.status} attendu 401/403 — ${text}`);
}

async function main() {
  await loadRulesIntoLocalNamespace();
  const alice = await createLocalIdentity('alice');
  const bob = await createLocalIdentity('bob');
  const valid = { revision: 1, state: { reserve: [{ id: 'a', name: 'Compte A' }] }, receipts: { [alice.uid]: 1 } };
  const invalid = { revision: '1', state: {}, receipts: {} };

  await expectAllowed('A écrit son current v2', await request(`wfrp-sessions-v2/${alice.uid}/current`, {
    token: alice.token, method: 'PUT', body: valid
  }));
  const own = await expectAllowed('A lit son current v2', await request(`wfrp-sessions-v2/${alice.uid}/current`, { token: alice.token }));
  assert.equal(own.state.reserve[0].name, 'Compte A');
  await expectDenied('B ne lit pas le current de A', await request(`wfrp-sessions-v2/${alice.uid}/current`, { token: bob.token }));
  await expectDenied('invité ne lit pas le current v2', await request(`wfrp-sessions-v2/${alice.uid}/current`));
  await expectDenied('A ne publie pas un envelope invalide', await request(`wfrp-sessions-v2/${alice.uid}/current`, {
    token: alice.token, method: 'PUT', body: invalid
  }));
  await expectAllowed('B écrit son propre current v2', await request(`wfrp-sessions-v2/${bob.uid}/current`, {
    token: bob.token, method: 'PUT', body: { ...valid, receipts: { [bob.uid]: 1 }, state: { reserve: [{ id: 'b', name: 'Compte B' }] } }
  }));
  await expectDenied('A ne lit pas le current de B', await request(`wfrp-sessions-v2/${bob.uid}/current`, { token: alice.token }));
  await expectDenied('B ne réécrit pas le current de A', await request(`wfrp-sessions-v2/${alice.uid}/current`, {
    token: bob.token, method: 'PUT', body: valid
  }));
  await expectDenied('A ne réécrit pas la branche legacy v1', await request(`wfrp-sessions/${alice.uid}/current`, {
    token: alice.token, method: 'PUT', body: { reserve: [{ id: 'forbidden' }] }
  }));

  if (process.env.FIREBASE_RULES_SEED === '1') {
    const legacy = { reserve: [{ id: 'legacy', name: 'Legacy A' }], combat: {}, log: [], diceLines: [] };
    // The local emulator's owner token bypasses rules for test seeding only;
    // no production token or account is accepted by this script.
    await expectAllowed('seed local legacy fixture', await request(`wfrp-sessions/${alice.uid}/current`, {
      method: 'PUT', body: legacy, extra: 'access_token=owner'
    }));
    const ownLegacy = await expectAllowed('A lit son legacy v1', await request(`wfrp-sessions/${alice.uid}/current`, { token: alice.token }));
    assert.equal(ownLegacy.reserve[0].name, 'Legacy A');
    await expectDenied('B ne lit pas le legacy de A', await request(`wfrp-sessions/${alice.uid}/current`, { token: bob.token }));
  } else {
    console.log('INFO — lecture v1 non exécutée : relancer avec FIREBASE_RULES_SEED=1 pour semer le fixture local');
  }

  console.log('PASS — règles E05 émulateur : v2 isolé par uid, envelope invalide refusé, v1 non inscriptible');
}

main().catch(error => {
  console.error(`BLOCKED/FAIL — firebase-rules-emulator: ${error.stack || error.message}`);
  process.exitCode = 1;
});
