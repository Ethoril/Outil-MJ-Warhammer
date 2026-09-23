import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SyncProtocolError,
  applyOperation,
  createOperation,
  createSyncDocument,
  sharedState,
  transactionCallback,
  transactionUpdate,
  validateSyncDocument
} from '../js/core/sync-protocol.js';

const state = (name = 'base') => ({
  schemaVersion: 2,
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
    () => validateSyncDocument({ revision: 0, state: { schemaVersion: 3 }, receipts: {} }),
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
