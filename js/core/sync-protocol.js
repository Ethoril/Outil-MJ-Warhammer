/**
 * Pure protocol for the shared E05 document.
 *
 * The Firebase adapter can call transactionUpdate repeatedly: this module only
 * validates/clones values and returns a new document. It never logs, writes or
 * invokes callbacks.
 */
export const SYNC_PROTOCOL_VERSION = 2;

// These fields belong to a device/session and must never enter the shared root.
export const LOCAL_STATE_FIELDS = Object.freeze([
  'log', 'journal', 'history', 'archives', 'archive', 'ui', 'uiState',
  'selectedId', 'filters', 'density', 'reminderChoices', 'appliedResolutionIds',
  // Envelope and transport metadata are local to a client/session. They are
  // deliberately excluded before a state can enter the shared Firebase root.
  'appVersion', 'exportedAt', 'contextId', 'writer', 'timestamp',
  'deviceId', 'sequence', 'baseRevision', 'localRevision', 'clientId', 'lastSyncedAt', 'syncPending'
]);

const LOCAL_FIELDS = new Set(LOCAL_STATE_FIELDS);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function safeSet(target, key, value) {
  Object.defineProperty(target, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}

const clone = value => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clone);
  const out = {};
  for (const [key, child] of Object.entries(value)) safeSet(out, key, clone(child));
  return out;
};

export class SyncProtocolError extends Error {
  constructor(message, code = 'INVALID_PROTOCOL', details = {}) {
    super(message);
    this.name = 'SyncProtocolError';
    this.code = code;
    this.details = details;
  }
}

function incompatible(message, details = {}) {
  throw new SyncProtocolError(message, 'SCHEMA_INCOMPATIBLE', details);
}

function assertRevision(value, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new SyncProtocolError(`${field} doit être un entier positif ou nul`, 'INVALID_REVISION', { field, value });
  }
}

function assertSharedStateVersion(state) {
  if (hasOwn(state, 'schemaVersion') && state.schemaVersion !== SYNC_PROTOCOL_VERSION) {
    incompatible('Version de données partagées incompatible', {
      schemaVersion: state.schemaVersion,
      expected: SYNC_PROTOCOL_VERSION
    });
  }
}

/** Clone a state while removing device-local data from its shared root. */
export function sharedState(state = {}) {
  if (!isRecord(state)) {
    throw new SyncProtocolError('state partagé doit être un objet', 'INVALID_STATE');
  }
  assertSharedStateVersion(state);
  const out = {};
  for (const [key, value] of Object.entries(state)) {
    if (!LOCAL_FIELDS.has(key)) safeSet(out, key, clone(value));
  }
  return out;
}

function validateReceipts(receipts) {
  if (!isRecord(receipts)) {
    throw new SyncProtocolError('receipts doit être une map', 'INVALID_RECEIPTS');
  }
  const out = {};
  for (const [deviceId, sequence] of Object.entries(receipts)) {
    if (!deviceId || typeof deviceId !== 'string') {
      throw new SyncProtocolError('Identifiant d’appareil invalide', 'INVALID_RECEIPTS');
    }
    assertRevision(sequence, `receipts.${deviceId}`);
    safeSet(out, deviceId, sequence);
  }
  return out;
}

/** Return a canonical v2 document. Null is intentionally not a document. */
export function validateSyncDocument(document) {
  if (!isRecord(document)) {
    throw new SyncProtocolError('Document sync invalide', 'INVALID_DOCUMENT');
  }
  const keys = Object.keys(document);
  if (!hasOwn(document, 'revision') || !hasOwn(document, 'state')) {
    incompatible('Document sync incomplet', { required: ['revision', 'state'] });
  }
  if (keys.some(key => !['revision', 'state', 'receipts'].includes(key))) {
    incompatible('Clé étrangère dans la racine sync', { keys });
  }
  assertRevision(document.revision, 'revision');
  if (!isRecord(document.state)) {
    throw new SyncProtocolError('state partagé invalide', 'INVALID_STATE');
  }
  return {
    revision: document.revision,
    state: sharedState(document.state),
    // RTDB omits an empty map on some reads; the canonical result always restores it.
    receipts: validateReceipts(document.receipts ?? {})
  };
}

/** Create an empty or populated canonical root. */
export function createSyncDocument(state = {}, { revision = 0, receipts = {} } = {}) {
  assertRevision(revision, 'revision');
  return { revision, state: sharedState(state), receipts: validateReceipts(receipts) };
}

/** Create a stable operation; local fields are omitted before it can be sent. */
export function createOperation(input = {}) {
  if (!isRecord(input)) {
    throw new SyncProtocolError('Opération sync invalide', 'INVALID_OPERATION');
  }
  const operationKeys = ['deviceId', 'sequence', 'baseRevision', 'state'];
  if (Object.keys(input).some(key => !operationKeys.includes(key))) {
    incompatible('Opération sync inconnue', { keys: Object.keys(input) });
  }
  const { deviceId, sequence, baseRevision, state } = input;
  if (typeof deviceId !== 'string' || !deviceId.trim()) {
    throw new SyncProtocolError('deviceId doit être une chaîne non vide', 'INVALID_OPERATION');
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new SyncProtocolError('sequence doit être un entier positif', 'INVALID_OPERATION', { sequence });
  }
  assertRevision(baseRevision, 'baseRevision');
  return { deviceId, sequence, baseRevision, state: sharedState(state) };
}

function canonicalOperation(operation) {
  if (!isRecord(operation)) {
    throw new SyncProtocolError('Opération sync invalide', 'INVALID_OPERATION');
  }
  if (Object.keys(operation).some(key => !['deviceId', 'sequence', 'baseRevision', 'state'].includes(key))) {
    incompatible('Opération sync inconnue', { keys: Object.keys(operation) });
  }
  return createOperation(operation);
}

/**
 * Apply one operation with revision CAS and durable per-device receipt.
 * Invalid schema throws; a conflict or sequence gap returns an unchanged document.
 */
export function applyOperation(document, operation) {
  const current = document == null ? createSyncDocument() : validateSyncDocument(document);
  const op = canonicalOperation(operation);
  const lastSequence = current.receipts[op.deviceId] || 0;

  // A replay after a lost ack is an idempotent acknowledgement, even if the
  // operation's old baseRevision no longer matches the current revision.
  if (op.sequence <= lastSequence) {
    return { status: 'duplicate', applied: false, document: current, operation: op };
  }
  if (op.sequence !== lastSequence + 1) {
    return {
      status: 'sequence-gap', applied: false, document: current, operation: op,
      expectedSequence: lastSequence + 1
    };
  }
  if (op.baseRevision !== current.revision) {
    return {
      status: 'conflict', applied: false, document: current, operation: op,
      currentRevision: current.revision
    };
  }

  const receipts = validateReceipts(current.receipts);
  safeSet(receipts, op.deviceId, op.sequence);
  const next = {
    revision: current.revision + 1,
    state: sharedState(op.state),
    receipts
  };
  return { status: 'applied', applied: true, document: next, operation: op };
}

/** Firebase-style transaction callback: undefined aborts conflicts and gaps. */
export function transactionUpdate(current, operation) {
  const result = applyOperation(current, operation);
  return result.status === 'applied' || result.status === 'duplicate' ? result.document : undefined;
}

/** Build a callback safe to invoke repeatedly by a transaction implementation. */
export function transactionCallback(operation) {
  const stableOperation = canonicalOperation(operation);
  return current => transactionUpdate(current, stableOperation);
}
