/** Synchronisation du compte en schéma 4 (3.47.0), contre les émulateurs Auth et RTDB locaux uniquement.
 * Lancement (hors CI, hors `tests/unit/`) :
 *   firebase emulators:exec --only auth,database --project demo-outil-mj --non-interactive "node tests/cloud-schema4-emulator.mjs"
 * Charge les vraies règles `firebase.database.rules.json` dans un espace de noms jetable `demo-…`.
 * Le transport ci-dessous reproduit celui de `js/core/sync.js` (lecture, transaction CAS sur
 * `transactionUpdate(normalizeRemoteDocument(courant), opération)`), mais en REST sur l'émulateur ; le Store et la
 * session de synchronisation sont les vrais. IndexedDB : fake-indexeddb.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { indexedDB } from 'fake-indexeddb';
import { createPersistence } from '../js/core/persistence.js';
import { createStore } from '../js/core/store.js';
import { createSyncSession, normalizeRemoteDocument } from '../js/core/sync-session.js';
import { CURRENT_SCHEMA_VERSION } from '../js/core/migrations.js';
import { sharedState, sameSharedState, transactionUpdate } from '../js/core/sync-protocol.js';
import { woundedPatient, healerSheet, asFollowed, storeWith } from './unit/sequelles/soins-scenario.helper.js';

function local(raw) {
  const url = new URL('http://' + raw);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && url.port && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash, 'les émulateurs doivent être strictement locaux');
  return url.origin;
}
const db = local(process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000');
const auth = local(process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099');
const namespace = 'demo-schema4-' + Date.now();
const url = (path, query = '') => `${db}/${path}.json?ns=${namespace}${query}`;
const tokenQuery = token => '&auth=' + encodeURIComponent(token);
const OWNER = '&access_token=owner';
const raw = (path, { token, owner = false, method = 'GET', body, headers = {} } = {}) =>
  fetch(url(path, token ? tokenQuery(token) : owner ? OWNER : ''), { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
async function ok(response, label) { const text = await response.text(); assert.equal(response.status, 200, `${label} : HTTP ${response.status} ${text}`); return text ? JSON.parse(text) : null; }
async function denied(response, label) { const text = await response.text(); assert.equal(response.status, 401, `${label} : refus attendu, HTTP ${response.status} ${text}`); }
async function identity(name) {
  const response = await fetch(`${auth}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-schema4`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `${name}-${Date.now()}@control.test`, password: 'password123', returnSecureToken: true }) });
  const body = await ok(response, 'création ' + name); return { uid: body.localId, token: body.idToken };
}
/** Transport équivalent à celui de sync.js, avec les droits du compte (jamais ceux du propriétaire). */
function transportFor(path, token) {
  return {
    async read() { return ok(await raw(path, { token }), 'lecture du compte'); },
    async transaction(operation) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const source = await raw(path, { token, headers: { 'X-Firebase-ETag': 'true' } });
        assert.equal(source.status, 200, 'lecture avant transaction');
        const current = await source.json();
        const next = transactionUpdate(normalizeRemoteDocument(current), operation);
        if (next === undefined) return { status: 'aborted', root: current };
        const result = await raw(path, { token, method: 'PUT', body: next, headers: { 'If-Match': source.headers.get('etag') } });
        if (result.status === 200) return { status: 'committed', root: await result.json() };
        if (result.status !== 412) throw new Error('PERMISSION_DENIED ' + result.status);
      }
      throw new Error('CAS épuisé');
    },
    subscribe: () => () => {}
  };
}
const waitFor = async (predicate, label) => { for (let i = 0; i < 300; i += 1) { if (predicate()) return; await new Promise(done => setTimeout(done, 25)); } throw new Error('délai dépassé : ' + label); };
const resources = [];
async function openAccount(user, initialState) {
  const contextId = 'account:' + user.uid;
  const persistence = createPersistence({ indexedDB, dbName: `${namespace}-${resources.length}`, contextId });
  if (initialState) await persistence.saveAtomic({ state: initialState });
  const statuses = [];
  const store = createStore({ storage: null, persistence, contextId, onSyncStatus: status => statuses.push(status) });
  await store.ready;
  const path = `wfrp-sessions-v3/${user.uid}/current`;
  store.attachSync({ contextId, createSession: options => createSyncSession({ ...options, transport: transportFor(path, user.token) }) });
  resources.push({ store, persistence });
  return { store, statuses, path };
}
const full = store => JSON.parse(store.getFullJSON());
const day = store => store.advanceCampaignTime({ seconds: 60, reason: "Une minute de repos" });

try {
  const rules = await readFile(new URL('../firebase.database.rules.json', import.meta.url), 'utf8');
  await ok(await fetch(`${db}/.settings/rules.json?ns=${namespace}&access_token=owner`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: rules }), 'chargement des règles');
  const alice = await identity('alice'), bob = await identity('bob');
  assert.equal(CURRENT_SCHEMA_VERSION, 4);

  // Cas 1 : sauvegarde schéma 4 complète, écrite par le vrai Store sous l'UID du propriétaire.
  const { patient, record } = woundedPatient();
  const a = asFollowed(patient), b = asFollowed(healerSheet());
  const origin = await storeWith({ reserve: [a.profile, b.profile], persistentCharacters: [a.character, b.character] });
  assert.equal((await origin.registerAftermathIncident({ operationId: 's4-1', participantId: 'suivi:pc-patient', criticalId: record.id })).ok !== false, true);
  const seeded = full(origin);
  assert.equal(seeded.schemaVersion, 4);
  assert.equal(seeded.extensions.v5.aftermathRegister.incidents.length, 1, 'un suivi de soin ouvert');
  const defects = [];
  const first = await openAccount(alice, seeded);
  await waitFor(() => first.statuses.includes('ready') || first.statuses.includes('synced'), 'ouverture de session (compte vide)');
  const advanced1 = await day(first.store); assert.equal(advanced1.ok, true, "avance de l’horloge : " + JSON.stringify(advanced1));
  await waitFor(() => first.statuses.at(-1) === 'synced', 'statut Synchronisé après écriture');
  const written = full(first.store);
  const remote = await ok(await raw(first.path, { token: alice.token }), 'relecture propriétaire');
  assert.equal(remote.state.schemaVersion, 4);
  assert.equal(remote.revision, 1);
  const decoded = normalizeRemoteDocument(remote); // ne doit pas lever : valeurs nulles et tableaux vides retirés par RTDB
  assert.equal(sameSharedState(decoded.state, sharedState(written)), true, 'la relecture rend ce qui a été écrit');
  const pc = decoded.state.persistentCharacters.find(row => row.id === 'pc-patient');
  assert.deepEqual([pc.hp, pc.maxHp, pc.states[0].key, pc.states[0].level], [5, 20, 'hemorragique', 2]);
  assert.equal(pc.extensions.v5.criticalWounds[0].name, 'Blessure béante');
  assert.equal(decoded.state.extensions.v5.aftermathRegister.incidents[0].status, 'open');
  assert.equal(decoded.state.extensions.v5.aftermathRegister.incidents[0].participantId, 'suivi:pc-patient');
  assert.equal(decoded.state.extensions.v5.gameClock.campaignSeconds, 60);
  assert.equal(JSON.stringify(Object.keys(remote).sort()), JSON.stringify(['receipts', 'revision', 'state']));

  // Reprise sur un autre appareil : le Store adopte le document RTDB (tableaux vides retirés) puis reçoit une commande de soins.
  const reload = await openAccount(alice, null);
  await waitFor(() => reload.statuses.includes('synced') || reload.statuses.includes('ready'), 'adoption par un second appareil');
  try {
    const outcome = await reload.store.registerAftermathDisease({ operationId: 'second-appareil', participantId: 'suivi:pc-patient', label: 'Fièvre', durationDays: 2 });
    assert.notEqual(outcome?.ok, false, JSON.stringify(outcome));
  } catch (error) { defects.push('second appareil, commande de soins après relecture RTDB : ' + error.message); }

  // Cas 3 (refus) sur ce même document schéma 4.
  const doc4 = { ...remote };
  await denied(await raw(first.path, { token: bob.token }), 'lecture par un autre UID');
  await denied(await raw(first.path), 'lecture par un invité');
  await denied(await raw(first.path, { token: bob.token, method: 'PUT', body: doc4 }), 'écriture par un autre UID');
  await denied(await raw(first.path, { method: 'PUT', body: doc4 }), 'écriture par un invité');
  await denied(await raw(`wfrp-sessions-v3/${bob.uid}/current`, { token: alice.token, method: 'PUT', body: doc4 }), 'écriture du propriétaire sous l’UID d’un autre');
  for (const version of [5, 2, 0, '4', null]) {
    await denied(await raw(first.path, { token: alice.token, method: 'PUT', body: { ...doc4, revision: doc4.revision + 1, state: { ...doc4.state, schemaVersion: version } } }), 'schéma ' + JSON.stringify(version));
  }
  const noVersion = structuredClone(doc4.state); delete noVersion.schemaVersion;
  await denied(await raw(first.path, { token: alice.token, method: 'PUT', body: { ...doc4, revision: doc4.revision + 1, state: noVersion } }), 'schéma absent');
  assert.deepEqual(await ok(await raw(first.path, { token: alice.token }), 'document inchangé'), remote, 'les refus ne modifient rien');

  // Cas 2 : sauvegarde schéma 3 déjà sur le compte, lue, migrée, réécrite en schéma 4.
  const frozen = JSON.parse(await readFile(new URL('./fixtures/suivis-orphelins-v3.json', import.meta.url), 'utf8'));
  const carol = await identity('carol');
  const legacyPath = `wfrp-sessions-v3/${carol.uid}/current`;
  await ok(await raw(legacyPath, { owner: true, method: 'PUT', body: { revision: 7, receipts: { 'ancien-appareil': 7 }, state: sharedState(frozen) } }), 'dépôt du schéma 3');
  const second = await openAccount(carol, null);
  await waitFor(() => second.statuses.includes('synced') || second.statuses.includes('ready'), 'lecture du schéma 3');
  const stillV3 = await ok(await raw(legacyPath, { token: carol.token }), 'relecture avant écriture');
  assert.equal(stillV3.state.schemaVersion, 3, 'la lecture ne réécrit rien');
  assert.equal(stillV3.revision, 7);
  const migrated = full(second.store);
  assert.equal(migrated.schemaVersion, 4, 'le Store vivant est en schéma 4');
  assert.notEqual(await second.store.addProfile({ id: "profil-ajoute", name: "Ajouté après migration", kind: "Créature", hp: 5, maxHp: 5 }), false);
  await waitFor(() => second.statuses.at(-1) === 'synced' && second.statuses.filter(s => s === 'pending').length > 0, 'écriture du schéma 4');
  const after = await ok(await raw(legacyPath, { token: carol.token }), 'relecture après écriture');
  assert.equal(after.state.schemaVersion, 4);
  assert.equal(after.revision, 8);
  const rewritten = normalizeRemoteDocument(after).state;
  const ids = rows => (rows || []).map(row => row.id).sort();
  for (const row of frozen.reserve) assert.ok(rewritten.reserve.some(r => r.id === row.id), 'profil conservé : ' + row.id);
  assert.deepEqual(ids(rewritten.combat.participants), ids(frozen.combat.participants), 'participants conservés');
  assert.deepEqual(ids(rewritten.suspendedScenes[0].participants), ids(frozen.suspendedScenes[0].participants), 'participants de la scène suspendue conservés');
  for (const row of frozen.persistentCharacters) assert.ok(rewritten.persistentCharacters.some(pcRow => pcRow.id === row.id && pcRow.hp === row.hp), 'personnage suivi d’origine conservé : ' + row.id);
  const register = state => state.extensions.v5.aftermathRegister;
  const kept = ['incidents', 'diseases', 'sequelae'].flatMap(key => register(frozen)[key].map(row => row.id));
  const now = ['incidents', 'diseases', 'sequelae'].flatMap(key => register(rewritten)[key].map(row => row.id));
  assert.deepEqual(now.sort(), kept.sort(), 'aucun suivi perdu');
  assert.equal(register(rewritten).incidents.find(row => row.id === 'i-gobelin').status, 'archived', 'suivi sans propriétaire archivé, pas supprimé');
  assert.equal(register(rewritten).incidents.find(row => row.id === 'i-wren').participantId, 'suivi:pc-wren');
  try {
    const outcome = await second.store.registerAftermathDisease({ operationId: 'apres-migration', participantId: 'suivi:pc-wren', label: 'Toux', durationDays: 2 });
    assert.notEqual(outcome?.ok, false, JSON.stringify(outcome));
  } catch (error) { defects.push('compte migré 3 -> 4, commande de soins après relecture RTDB : ' + error.message); }

  // Cas 3 (client) : schéma 5 présent sur le compte, refusé par le client, rien n'est réécrit.
  const dave = await identity('dave');
  const futurePath = `wfrp-sessions-v3/${dave.uid}/current`;
  const future = { revision: 3, receipts: { x: 3 }, state: { ...sharedState(seeded), schemaVersion: 5 } };
  await ok(await raw(futurePath, { owner: true, method: 'PUT', body: future }), 'dépôt du schéma 5');
  const futureBefore = await ok(await raw(futurePath, { token: dave.token }), 'lecture du schéma 5');
  assert.throws(() => normalizeRemoteDocument(futureBefore), error => error.code === 'SCHEMA_INCOMPATIBLE');
  const third = await openAccount(dave, full(origin));
  await waitFor(() => third.statuses.includes('error'), 'refus client du schéma 5');
  assert.equal(third.statuses.includes('synced'), false);
  await day(third.store).catch(() => {});
  await new Promise(done => setTimeout(done, 300));
  assert.deepEqual(await ok(await raw(futurePath, { token: dave.token }), 'schéma 5 inchangé'), futureBefore, 'le document de schéma 5 n’est jamais réécrit');

  console.log('PASS schéma 4 : écriture et relecture (PV, États, Blessure Critique, suivi ouvert, horloge) ; schéma 3 migré puis réécrit sans perte ; autre UID/invité refusés ; schémas 0, 2, 5, absent refusés par les règles ; schéma 5 distant refusé par le client sans réécriture.');
  // Rouge tant que la relecture RTDB (tableaux vides retirés) n'est pas réparée pour le registre de convalescence.
  assert.deepEqual(defects, [], 'défauts : ' + defects.join(' | '));
} finally {
  for (const { store, persistence } of resources) { try { store.detachSync(); persistence.close(); } catch { /* nettoyage seulement */ } }
  try { await raw('', { owner: true, method: 'DELETE' }); } catch { /* nettoyage de l'espace jetable local */ }
}
