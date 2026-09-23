/**
 * Small native IndexedDB adapter.
 *
 * The contextId is the isolation boundary (guest or account). A save can atomically
 * write the current envelope, outbox entries and one restoration point. No localStorage
 * fallback is hidden here: callers must handle and expose storage errors.
 */
export const PERSISTENCE_DB_VERSION = 1;
export const DEFAULT_PERSISTENCE_DB = 'wfrp-persistence-v2';
export const MAX_RESTORE_POINTS = 10;

const clone = value => {
  if (value === undefined) return undefined;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

const uid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

function transactionResult(transaction, work) {
  return new Promise((resolve, reject) => {
    let result;
    let settled = false;
    transaction.oncomplete = () => {
      settled = true;
      resolve(result);
    };
    transaction.onerror = () => {
      if (!settled) reject(transaction.error || new Error('IndexedDB transaction failed'));
    };
    transaction.onabort = () => {
      if (!settled) reject(transaction.error || new Error('IndexedDB transaction aborted'));
    };
    try {
      result = work(transaction);
    } catch (error) {
      try { transaction.abort(); } catch { /* preserve the original error */ }
      reject(error);
    }
  });
}

function requireId(operation) {
  // v2 sync operations have a stable identity derived from the device and
  // sequence; legacy E02 entries continue to use their explicit id.
  const id = operation?.operationId ?? operation?.id
    ?? (typeof operation?.deviceId === 'string' && Number.isInteger(operation?.sequence)
      ? `${operation.deviceId}:${operation.sequence}` : null);
  if (typeof id !== 'string' || !id.trim()) {
    throw new TypeError('Une opération doit avoir un id stable');
  }
  return id;
}

export function createPersistence({
  indexedDB = globalThis.indexedDB,
  dbName = DEFAULT_PERSISTENCE_DB,
  contextId = 'guest',
  now = () => Date.now(),
  maxRestorePoints = MAX_RESTORE_POINTS
} = {}) {
  if (!indexedDB || typeof indexedDB.open !== 'function') {
    throw new Error('IndexedDB indisponible');
  }
  if (typeof contextId !== 'string' || !contextId.trim()) {
    throw new TypeError('contextId doit être une chaîne non vide');
  }
  if (!Number.isInteger(maxRestorePoints) || maxRestorePoints < 1) {
    throw new RangeError('maxRestorePoints doit être un entier positif');
  }
  const restoreLimit = Math.min(maxRestorePoints, MAX_RESTORE_POINTS);

  let dbPromise;
  let closed = false;

  function open() {
    if (closed) return Promise.reject(new Error('Persistence fermée'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, PERSISTENCE_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('contexts')) {
          db.createObjectStore('contexts', { keyPath: 'contextId' });
        }
        if (!db.objectStoreNames.contains('outbox')) {
          db.createObjectStore('outbox', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('restores')) {
          db.createObjectStore('restores', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(request.error || new Error('Ouverture IndexedDB impossible'));
      request.onblocked = () => reject(new Error('Ouverture IndexedDB bloquée'));
    });
    return dbPromise;
  }

  async function readState() {
    const db = await open();
    const tx = db.transaction(['contexts'], 'readonly');
    const record = await requestResult(tx.objectStore('contexts').get(contextId));
    return record ? clone(record.state) : null;
  }

  async function readSession() {
    const db = await open();
    const tx = db.transaction(['contexts'], 'readonly');
    const record = await requestResult(tx.objectStore('contexts').get(contextId));
    return record?.session ? clone(record.session) : null;
  }

  async function listOutbox() {
    const db = await open();
    const tx = db.transaction(['outbox'], 'readonly');
    const records = await requestResult(tx.objectStore('outbox').getAll());
    return records
      .filter(record => record.contextId === contextId)
      .sort((a, b) => a.sequence - b.sequence || a.createdAt - b.createdAt)
      .map(record => clone(record.operation));
  }

  async function listRestorePoints() {
    const db = await open();
    const tx = db.transaction(['restores'], 'readonly');
    const records = await requestResult(tx.objectStore('restores').getAll());
    return records
      .filter(record => record.contextId === contextId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(record => clone(record));
  }

  async function saveAtomic({ state, operations = [], restore = null, session = undefined, resetOutbox = false } = {}) {
    if (state === undefined && !operations.length && !restore && session === undefined && !resetOutbox) {
      throw new TypeError('saveAtomic attend un état, une opération ou un point de restauration');
    }
    if (!Array.isArray(operations)) throw new TypeError('operations doit être un tableau');
    if (session !== undefined && state === undefined) {
      throw new TypeError('Une session doit être enregistrée avec son état');
    }
    const preparedOperations = operations.map((operation, index) => {
      const operationId = requireId(operation);
      return {
        id: contextId + ':' + operationId,
        contextId,
        operationId,
        sequence: Number.isFinite(operation.sequence) ? operation.sequence : index,
        createdAt: Number.isFinite(operation.createdAt) ? operation.createdAt : now(),
        operation: clone(operation)
      };
    });
    const preparedRestore = restore ? {
      id: contextId + ':' + (restore.id || now() + ':' + uid()),
      contextId,
      createdAt: Number.isFinite(restore.createdAt) ? restore.createdAt : now(),
      reason: restore.reason || 'manual',
      state: clone(restore.state === undefined ? state : restore.state)
    } : null;

    const db = await open();
    const names = ['contexts', 'outbox', 'restores'];
    const tx = db.transaction(names, 'readwrite');
    return transactionResult(tx, transaction => {
      if (state !== undefined) {
        const contextRecord = {
          contextId,
          state: clone(state),
          savedAt: now()
        };
        if (session !== undefined) contextRecord.session = clone(session);
        transaction.objectStore('contexts').put(contextRecord);
      }
      const outbox = transaction.objectStore('outbox');
      if (resetOutbox) {
        const previous = outbox.getAll();
        previous.onsuccess = () => previous.result
          .filter(record => record.contextId === contextId)
          .forEach(record => outbox.delete(record.id));
      }
      preparedOperations.forEach(operation => outbox.put(operation));

      if (preparedRestore) {
        const restores = transaction.objectStore('restores');
        restores.put(preparedRestore);
        const request = restores.getAll();
        request.onsuccess = () => {
          const old = request.result
            .filter(record => record.contextId === contextId)
            .sort((a, b) => a.createdAt - b.createdAt);
          const excess = old.length - restoreLimit;
          for (let i = 0; i < excess; i++) restores.delete(old[i].id);
        };
        request.onerror = () => { try { tx.abort(); } catch { /* transaction reports the error */ } };
      }
      return {
        saved: state !== undefined,
        sessionSaved: session !== undefined,
        operationIds: preparedOperations.map(operation => operation.operationId),
        restoreId: preparedRestore?.id || null
      };
    });
  }

  async function acknowledge(operationId) {
    if (typeof operationId !== 'string' || !operationId.trim()) throw new TypeError('operationId invalide');
    const db = await open();
    const tx = db.transaction(['outbox'], 'readwrite');
    return transactionResult(tx, transaction => {
      transaction.objectStore('outbox').delete(contextId + ':' + operationId);
      return true;
    });
  }

  // A network ACK advances only the session cursor. Keep the already durable
  // state byte-for-byte untouched so a newer local command cannot be replaced
  // by the snapshot passed to an older flush call.
  async function acknowledgeSession(operationId, session) {
    if (typeof operationId !== 'string' || !operationId.trim()) throw new TypeError('operationId invalide');
    const db = await open();
    const tx = db.transaction(['contexts', 'outbox'], 'readwrite');
    return transactionResult(tx, transaction => {
      const contexts = transaction.objectStore('contexts');
      const outbox = transaction.objectStore('outbox');
      const contextRequest = contexts.get(contextId);
      contextRequest.onsuccess = () => {
        const record = contextRequest.result || { contextId };
        record.session = clone(session);
        contexts.put(record);
        outbox.delete(contextId + ':' + operationId);
      };
      contextRequest.onerror = () => { try { tx.abort(); } catch { /* transaction reports the error */ } };
      return true;
    });
  }

  async function clearOutbox() {
    const db = await open();
    const tx = db.transaction(['outbox'], 'readwrite');
    return transactionResult(tx, transaction => {
      const store = transaction.objectStore('outbox');
      const request = store.getAll();
      request.onsuccess = () => request.result
        .filter(record => record.contextId === contextId)
        .forEach(record => store.delete(record.id));
      return true;
    });
  }

  async function deleteRestorePoint(id) {
    if (typeof id !== 'string' || !id.trim()) throw new TypeError('restore id invalide');
    const db = await open();
    const tx = db.transaction(['restores'], 'readwrite');
    return transactionResult(tx, transaction => {
      const store = transaction.objectStore('restores');
      const request = store.get(id);
      request.onsuccess = () => {
        if (request.result?.contextId === contextId) store.delete(id);
      };
      return true;
    });
  }

  async function clearContext() {
    const db = await open();
    const tx = db.transaction(['contexts', 'outbox', 'restores'], 'readwrite');
    return transactionResult(tx, transaction => {
      transaction.objectStore('contexts').delete(contextId);
      for (const name of ['outbox', 'restores']) {
        const store = transaction.objectStore(name);
        const request = store.getAll();
        request.onsuccess = () => request.result
          .filter(record => record.contextId === contextId)
          .forEach(record => store.delete(record.id));
      }
      return true;
    });
  }

  return Object.freeze({
    contextId,
    open,
    load: readState,
    readState,
    readSession,
    saveAtomic,
    enqueue: async operation => saveAtomic({ operations: [operation] }),
    listOutbox,
    acknowledge,
    acknowledgeSession,
    ack: acknowledge,
    clearOutbox,
    listRestorePoints,
    deleteRestorePoint,
    clearContext,
    close() {
      closed = true;
      if (dbPromise) dbPromise.then(db => db.close());
    }
  });
}
