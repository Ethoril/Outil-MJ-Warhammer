import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyncSession } from '../js/core/sync-session.js';

const persistence = {
  async load() { return { schemaVersion: 3, reserve: [], combat: { round: 0, order: [], participants: [] } }; },
  async saveAtomic() {},
  async readSession() { return { protocolVersion: 3, sequence: 0, baseRevision: 0 }; },
  async listOutbox() { return []; }
};

test('remote RTDB supprime grants:[] seulement: le décodeur restaure le registre vide sans assouplir les imports locaux', async () => {
  let adopted = null;
  const session = createSyncSession({
    persistence,
    deviceId: 'codec-test',
    transport: {
      async read() {
        return { revision: 0, receipts: {}, state: {
          schemaVersion: 3,
          extensions: { v5: { divineAccess: { schemaVersion: 1 } } }
        } };
      },
      async transaction() { throw new Error('not used'); }
    },
    onRemoteState(state) { adopted = state; }
  });
  await session.open();
  assert.deepEqual(adopted?.extensions?.v5?.divineAccess, { schemaVersion: 1, grants: [] });
  const malformed = { schemaVersion: 3, extensions: { v5: { divineAccess: { schemaVersion: 1 } } } };
  assert.throws(() => validateSyncDocument({ revision: 0, receipts: {}, state: malformed }), /Registre de dérogations divines mal formé/);
  assert.throws(() => sanitizeMagicEnvelope(malformed), /Registre de dérogations divines mal formé/);
  assert.throws(() => normalizeRemoteDocument({ revision: 0, receipts: {}, state: {
    schemaVersion: 3, extensions: { v5: { divineAccess: { schemaVersion: 1, unexpected: true } } }
  } }), /Registre de dérogations divines mal formé/);
});
import { normalizeRemoteDocument } from '../js/core/sync-session.js';
import { validateSyncDocument } from '../js/core/sync-protocol.js';
import { sanitizeMagicEnvelope } from '../js/core/sanitize.js';
import { migrateSnapshot } from '../js/core/migrations.js';

test('codec sync — ne crée pas de registre divin absent dans une racine vide', () => {
  assert.deepEqual(normalizeRemoteDocument({ revision: 0, state: {}, receipts: {} }), {
    revision: 0, state: {}, receipts: {}
  });
  assert.deepEqual(sanitizeMagicEnvelope({}), {});
  assert.deepEqual(sanitizeMagicEnvelope({ extensions: { v5: {} } }), { extensions: { v5: {} } });
  assert.throws(() => normalizeRemoteDocument({ revision: 0, receipts: {}, state: {
    schemaVersion: 3,
    extensions: { v5: { divineAccess: { schemaVersion: 1, grants: [], unexpected: true } } }
  } }), /Registre de dérogations divines mal formé/);
});

test('migration applicative — initialise le registre sur un snapshot complet, pas sur une racine protocole vide', () => {
  const source = {
    schemaVersion: 3,
    reserve: [],
    combat: { round: 0, order: [], participants: [] },
    extensions: { v5: { unrelated: { keep: true } } }
  };
  const before = structuredClone(source);
  const migrated = migrateSnapshot(source).data;
  assert.deepEqual(source, before);
  assert.deepEqual(migrated.extensions.v5.divineAccess, { schemaVersion: 1, grants: [] });
  assert.deepEqual(migrated.extensions.v5.unrelated, { keep: true });
  assert.deepEqual(normalizeRemoteDocument({ revision: 0, state: {}, receipts: {} }).state, {});
});

test('RTDB-omitted sceneId:null is restored for once/durable rows only at the remote boundary', () => {
  const base = {
    actorId: 'a', subjectKey: 'fiche:a', tradition: 'Myrmidia', prayerId: 'p',
    reason: 'Motif', decisionId: 'DIV-02', createdBy: 'MJ', createdRevision: 1
  };
  const grants = [
    { ...base, id: 'once-active', scope: 'once', status: 'active' },
    { ...base, id: 'durable-active', scope: 'durable', status: 'active' },
    { ...base, id: 'once-consumed', scope: 'once', status: 'consumed', consumedBy: 'execution', consumedRevision: 2 },
    { ...base, id: 'durable-revoked', scope: 'durable', status: 'revoked', revokedRevision: 2, revokedReason: 'Fin' },
    { ...base, id: 'scene-active', scope: 'scene', status: 'active', sceneId: 'scene-1' }
  ];
  const raw = { revision: 2, receipts: {}, state: {
    schemaVersion: 3,
    extensions: { v5: { divineAccess: { schemaVersion: 1, grants } } }
  } };
  const decoded = normalizeRemoteDocument(raw);
  const normalized = decoded.state.extensions.v5.divineAccess.grants;
  assert.deepEqual(normalized.slice(0, 4).map(row => row.sceneId), [null, null, null, null]);
  assert.equal(normalized[4].sceneId, 'scene-1');
  assert.throws(() => validateSyncDocument(raw), /Entrée de dérogation divine invalide/);
  const invalidScene = structuredClone(raw);
  invalidScene.state.extensions.v5.divineAccess.grants[4].sceneId = undefined;
  delete invalidScene.state.extensions.v5.divineAccess.grants[4].sceneId;
  assert.throws(() => normalizeRemoteDocument(invalidScene), /Entrée de dérogation divine invalide/);
});
