import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRemoteDocument } from '../js/core/sync-session.js';
import { validateSyncDocument } from '../js/core/sync-protocol.js';
import { sanitizeMagicEnvelope } from '../js/core/sanitize.js';
import { migrateSnapshot } from '../js/core/migrations.js';
import { createStore } from '../js/core/store.js';

const emptyRoot = { revision: 0, state: {}, receipts: {} };
const stateWithoutRegistry = {
  schemaVersion: 3,
  reserve: [],
  combat: { round: 0, order: [], participants: [] }
};
const doc = state => ({ revision: 0, receipts: {}, state });

test('E05 codec indépendant — root absent ou vide ne crée pas extensions/divineAccess', () => {
  assert.deepEqual(normalizeRemoteDocument(null), emptyRoot);
  assert.deepEqual(normalizeRemoteDocument({}), emptyRoot);
  assert.deepEqual(normalizeRemoteDocument(doc({})), emptyRoot);
  const decoded = normalizeRemoteDocument(doc(stateWithoutRegistry));
  assert.deepEqual(decoded.state, stateWithoutRegistry,
    'un état partagé sans registre n’acquiert aucun accès par normalisation');
  assert.equal(Object.hasOwn(decoded.state, 'extensions'), false);
  const existingV5 = normalizeRemoteDocument(doc({
    ...stateWithoutRegistry,
    extensions: { v5: { turnIndex: 0, unrelated: { keep: true } } }
  }));
  assert.deepEqual(existingV5.state.extensions.v5, { turnIndex: 0, unrelated: { keep: true } },
    'un registre absent reste absent même au milieu d’extensions V5 déjà présentes');
});

test('E3 indépendant — la migration réelle Store initialise un registre vide et préserve les extensions', async () => {
  const old = {
    schemaVersion: 3, reserve: [], diceLines: [], log: [],
    combat: { round: 0, order: [], participants: [] },
    extensions: { v5: { turnIndex: 0, unrelated: { keep: true } } }
  };
  const before = structuredClone(old);
  const migrated = migrateSnapshot(old).data;
  assert.deepEqual(old, before, 'la migration de snapshot ne modifie pas sa source');
  assert.deepEqual(migrated.extensions.v5.divineAccess, { schemaVersion: 1, grants: [] });
  assert.deepEqual(migrated.extensions.v5.unrelated, { keep: true });
  const store = createStore();
  await store.ready;
  await store.loadFromJSON(old);
  const actualStoreSnapshot = JSON.parse(store.getFullJSON());
  assert.deepEqual(actualStoreSnapshot.extensions.v5.divineAccess, { schemaVersion: 1, grants: [] },
    'le chemin réel de chargement Store applique la migration; ce n’est pas une réparation du codec remote');
});

test('E05 codec indépendant — seul le tableau vide omis par RTDB est restauré au registre explicite', () => {
  const raw = doc({
    ...stateWithoutRegistry,
    extensions: { v5: { divineAccess: { schemaVersion: 1 } } }
  });
  const decoded = normalizeRemoteDocument(raw);
  assert.deepEqual(decoded.state.extensions.v5.divineAccess, { schemaVersion: 1, grants: [] });
  assert.throws(() => validateSyncDocument(raw), /Registre de dérogations divines mal formé/,
    'la validation de protocole ordinaire ne doit pas adopter la réparation remote RTDB');
  assert.throws(() => sanitizeMagicEnvelope(raw.state), /Registre de dérogations divines mal formé/,
    'l’import/local sanitation reste strict');
});

test('E05 codec indépendant — formes malformed de registre explicite sont refusées sans les remplacer par un tableau vide', () => {
  const malformed = [
    null,
    [],
    { schemaVersion: 2, grants: [] },
    { schemaVersion: 1, grants: null },
    { schemaVersion: 1, grants: [], unexpected: true },
    { schemaVersion: 1, grants: [{}] }
  ];
  for (const registry of malformed) {
    const raw = doc({
      ...stateWithoutRegistry,
      extensions: { v5: { divineAccess: registry } }
    });
    assert.throws(() => normalizeRemoteDocument(raw), /Registre de dérogations divines mal formé|Entrée de dérogation divine invalide/,
      `la forme invalide ${JSON.stringify(registry)} ne doit pas être réparée`);
  }
});
