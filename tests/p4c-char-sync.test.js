// P4C — caractérisation de la persistance, de l'export/import et de la synchronisation
// avec un participant ajouté en combat (extensions.v5.*), de même nature qu'une invocation.
// Ces tests épinglent le comportement ACTUEL ; ils ne corrigent rien.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexedDB } from 'fake-indexeddb';
import { createStore } from '../js/core/store.js';
import { createPersistence } from '../js/core/persistence.js';
import { migrateSnapshot } from '../js/core/migrations.js';
import { applyOperation, createOperation, sameSharedState, sharedState } from '../js/core/sync-protocol.js';
import { createSyncSession, normalizeRemoteDocument } from '../js/core/sync-session.js';

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
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/ancien-format.json', import.meta.url), 'utf8'));
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
