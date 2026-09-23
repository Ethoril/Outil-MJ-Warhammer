import {
  SyncProtocolError,
  createOperation,
  createSyncDocument,
  transactionUpdate,
  validateSyncDocument
} from './sync-protocol.js';

const PROTOCOL_VERSION = 2;
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

function normalizeRemoteDocument(raw) {
  // Realtime Database omits empty maps and can return null for a new path.
  // Those two shapes mean an empty document; any partially populated document
  // still has to pass the strict protocol validator.
  if (raw == null || (typeof raw === 'object' && Object.keys(raw).length === 0)) {
    return createSyncDocument();
  }
  return validateSyncDocument(raw);
}

// A v2 root contains only the shared branches.  Keep the local envelope around
// it so choosing/reconciling a remote root cannot silently delete the journal,
// dice or future client-local extensions.
function mergeRemoteState(remoteState, envelope) {
  const local = clone(envelope) || {};
  const remote = clone(remoteState) || {};
  return {
    ...local,
    ...remote,
    log: local.log ?? [],
    diceLines: remote.diceLines ?? local.diceLines ?? []
  };
}

  function isProtocolError(error) {
  return error instanceof SyncProtocolError || error?.code === 'SCHEMA_INCOMPATIBLE'
    || error?.code === 'INVALID_DOCUMENT' || error?.code === 'INVALID_STATE'
    || error?.code === 'INVALID_RECEIPTS';
}

function validV2Operation(operation) {
  try {
    createOperation(operation);
    return true;
  } catch {
    return false;
  }
}

function hasSharedData(state) {
  return Object.entries(state || {}).some(([key, value]) => {
    if (key === 'schemaVersion') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return value !== null && value !== undefined;
  });
}

function makeSession(session, deviceId) {
  const candidate = session && typeof session === 'object' ? session : {};
  return {
    protocolVersion: PROTOCOL_VERSION,
    deviceId: typeof candidate.deviceId === 'string' && candidate.deviceId.trim()
      ? candidate.deviceId : deviceId,
    sequence: Number.isInteger(candidate.sequence) && candidate.sequence >= 0 ? candidate.sequence : 0,
    baseRevision: Number.isInteger(candidate.baseRevision) && candidate.baseRevision >= 0 ? candidate.baseRevision : 0
  };
}

/**
 * Durable account/guest session state, independent from Store and the DOM.
 * `transport` is injected by sync.js/tests and must expose read() and
 * transaction(operation). A transaction returns {status:'committed'|'aborted',
 * root} or a canonical root directly.
 */
export function createSyncSession({
  persistence,
  transport,
  contextId = 'guest',
  deviceId,
  now = () => Date.now(),
  onStatus = () => {},
  onConflict = () => {},
  onRemoteState = () => {}
} = {}) {
  if (!persistence || typeof persistence.load !== 'function' || typeof persistence.saveAtomic !== 'function') {
    throw new TypeError('persistence IDB requise');
  }
  if (!transport || typeof transport.read !== 'function' || typeof transport.transaction !== 'function') {
    throw new TypeError('transport read/transaction requis');
  }
  const localDeviceId = typeof deviceId === 'string' && deviceId.trim()
    ? deviceId : `device-${Math.random().toString(36).slice(2)}-${now()}`;
  let opened = false;
  let opening = null;
  let session = null;
  let remote = null;
  let remoteAvailable = false;
  let localState = null;
  let conflictState = null;
  let stopped = false;
  let epoch = 0;
  let unsubscribe = null;
  let mutationQueue = Promise.resolve();
  // Network transport must not block the durable local mutation queue. A slow
  // or offline Firebase transaction may run while subsequent commands are
  // appended to IDB and remain immediately usable offline.
  let transportQueue = Promise.resolve();
  let flushInFlight = null;
  let flushRequested = false;
  let retryTimer = null;
  let retryDelay = 500;

  function scheduleFlushRetry(options) {
    if (stopped || retryTimer || conflictState) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      flush(options).catch(() => {});
    }, retryDelay);
    // A retry must keep the browser session alive, but should not hold a Node
    // test process open after an intentionally offline scenario.
    retryTimer.unref?.();
    retryDelay = Math.min(retryDelay * 2, 10000);
  }

  async function open({ initialState = null } = {}) {
    if (stopped) throw new Error('Session arrêtée');
    if (opened) return { session: clone(session), remote: clone(remote), remoteAvailable, localState: clone(localState) };
    if (opening) return opening;
    opening = (async () => {
      localState = clone(initialState ?? await persistence.load()) || {};
      const storedSession = typeof persistence.readSession === 'function' ? await persistence.readSession() : null;
      session = makeSession(storedSession, localDeviceId);
      const oldOutbox = typeof persistence.listOutbox === 'function' ? await persistence.listOutbox() : [];
      const incompatibleOutbox = oldOutbox.some(operation => !validV2Operation(operation));
      if (incompatibleOutbox) {
        // E02 updates have no device/sequence/baseRevision. Keep the local
        // state, but explicitly discard that incompatible queue before v2.
        await persistence.saveAtomic({ state: localState, session, resetOutbox: true });
        onStatus('transition');
      } else if (!storedSession) {
        await persistence.saveAtomic({ state: localState, session });
      }
      try {
        const rawRemote = await transport.read();
        remoteAvailable = rawRemote != null && !(typeof rawRemote === 'object' && Object.keys(rawRemote).length === 0);
        remote = normalizeRemoteDocument(rawRemote);
      } catch (error) {
        if (isProtocolError(error)) {
          onStatus('error');
          throw error;
        }
        remoteAvailable = false;
        remote = null;
        onStatus('offline');
      }
      // Store commands may commit while transport.read() is suspended. Read
      // the marker again after the await, rather than capturing the empty
      // pre-handshake state above.
      const preservePendingLocal = Boolean((await persistence.load())?.syncPending || localState?.syncPending);
      if (preservePendingLocal) localState = clone(await persistence.load() ?? localState);
      if (oldOutbox.length === 0 && remoteAvailable && preservePendingLocal) {
        // A command committed while the account session was opening leaves a
        // durable marker. Keep its shared state until Store publishes the
        // replay operation; adopting the remote root here would lose it.
        session.baseRevision = remote.revision;
        await persistence.saveAtomic({ state: localState, session });
        if (hasSharedData(remote.state)) {
          conflictState = { local: [], localState: clone(localState), remote: clone(remote), baseRevision: remote.revision };
          onConflict({ local: [], localState: clone(localState), remote: clone(remote) });
          onStatus('conflict');
        } else onStatus('pending');
      } else if (oldOutbox.length === 0 && remoteAvailable) {
        session.baseRevision = remote.revision;
        session.sequence = remote.receipts[session.deviceId] || 0;
        await adoptRemote(remote.state, remote);
      } else if (incompatibleOutbox && remoteAvailable) {
        // The old queue was deliberately not replayed. Keep its local state
        // for an explicit user choice instead of silently adopting remote.
        session.baseRevision = remote.revision;
        await persistence.saveAtomic({ state: localState, session });
        onStatus('conflict');
      }
      if (stopped) throw new Error('Session arrêtée');
      opened = true;
      if (typeof transport.subscribe === 'function') {
        const localEpoch = epoch;
        unsubscribe = transport.subscribe(raw => {
          if (stopped || localEpoch !== epoch) return;
          mutationQueue = mutationQueue.then(async () => {
            if (stopped || localEpoch !== epoch) return;
            remote = normalizeRemoteDocument(raw);
            await reconcile({ localState });
          }).catch(error => {
            if (isProtocolError(error)) onStatus('error');
            else onStatus('offline');
          });
        });
      }
      onStatus('ready');
      return { session: clone(session), remote: clone(remote), remoteAvailable, localState: clone(localState) };
    })().finally(() => { opening = null; });
    return opening;
  }

  async function enqueue({ state, localState: nextLocalState = localState, restore = null } = {}) {
    const task = mutationQueue.then(async () => {
      await open();
      const existing = typeof persistence.listOutbox === 'function' ? await persistence.listOutbox() : [];
      const sequence = Math.max(session.sequence, ...existing
        .filter(operation => operation.deviceId === session.deviceId)
        .map(operation => operation.sequence)) + 1;
      const queuedBase = existing.length
        ? Math.max(...existing.map(operation => operation.baseRevision + 1))
        : session.baseRevision;
      const candidateSession = { ...session, sequence, baseRevision: queuedBase };
      const operation = createOperation({
        deviceId: candidateSession.deviceId,
        sequence: candidateSession.sequence,
        baseRevision: candidateSession.baseRevision,
        state
      });
      const candidateLocalState = clone(nextLocalState ?? localState ?? {});
      await persistence.saveAtomic({ state: candidateLocalState, operations: [operation], session: candidateSession, restore });
      session = candidateSession;
      localState = candidateLocalState;
      onStatus('pending');
      return clone(operation);
    });
    mutationQueue = task.catch(() => {});
    return task;
  }

  // Give the Store a chance to prepare its local metadata boundary before the
  // single state+session transaction. The returned commit hook updates live
  // objects only after that transaction succeeds.
  async function adoptRemote(remoteState, remoteDocument, { resetOutbox = false, restore = null } = {}) {
    const prepared = await Promise.resolve(onRemoteState(clone(remoteState), clone(remoteDocument)));
    if (prepared?.state) {
      await persistence.saveAtomic({
        state: clone(prepared.state),
        session: { ...session },
        resetOutbox,
        restore
      });
      localState = clone(prepared.state);
      await Promise.resolve(prepared.commit?.());
      return;
    }
    localState = mergeRemoteState(remoteState, localState);
    await persistence.saveAtomic({ state: localState, session: { ...session }, resetOutbox, restore });
  }

  async function reconcile({ localState: nextLocalState = localState } = {}) {
    await open({ initialState: nextLocalState });
    let rawRemote;
    try {
      rawRemote = await transport.read();
      remoteAvailable = rawRemote != null && !(typeof rawRemote === 'object' && Object.keys(rawRemote).length === 0);
      remote = normalizeRemoteDocument(rawRemote);
    } catch (error) {
      if (isProtocolError(error)) {
        onStatus('error');
        throw error;
      }
      onStatus('offline');
      return { status: 'offline', remote: clone(remote), remoteAvailable };
    }
    let outbox = typeof persistence.listOutbox === 'function' ? await persistence.listOutbox() : [];
    const preservePendingLocal = Boolean(nextLocalState?.syncPending || localState?.syncPending);
    if (remoteAvailable) {
      // A committed transaction can lose its client ack. Receipts settle those
      // operations before revision comparison, making reconnect idempotent.
      for (const operation of outbox.filter(item => remote.receipts[item.deviceId] >= item.sequence)) {
        await persistence.acknowledge(operation.operationId || `${operation.deviceId}:${operation.sequence}`);
        session.baseRevision = remote.revision;
      }
      outbox = typeof persistence.listOutbox === 'function' ? await persistence.listOutbox() : [];
      if (outbox.length === 0 && !preservePendingLocal) {
        session.baseRevision = remote.revision;
        session.sequence = remote.receipts[session.deviceId] || 0;
        localState = clone(nextLocalState ?? localState ?? {});
        await adoptRemote(remote.state, remote);
        onStatus('synced');
        return { status: 'synced', remote: clone(remote), remoteAvailable };
      }
      if (outbox.length === 0 && preservePendingLocal) {
        session.baseRevision = remote.revision;
        if (hasSharedData(remote.state)) {
          conflictState = { local: [], localState: clone(localState), remote: clone(remote), baseRevision: remote.revision };
          onConflict({ local: [], localState: clone(localState), remote: clone(remote) });
          onStatus('conflict');
          return { status: 'conflict', remote: clone(remote), remoteAvailable, outbox: [] };
        }
        onStatus('pending');
        return { status: 'pending', remote: clone(remote), remoteAvailable, outbox: [] };
      }
    }
    if (outbox.some(operation => !validV2Operation(operation))) {
      onStatus('error');
      throw new SyncProtocolError('File d’opérations antérieur au protocole v2', 'SCHEMA_INCOMPATIBLE');
    }
    if (remoteAvailable && outbox.some((operation, index) => operation.baseRevision !== remote.revision + index)) {
      conflictState = {
        local: clone(outbox), localState: clone(localState), remote: clone(remote),
        baseRevision: session.baseRevision
      };
      onConflict({ local: clone(outbox), localState: clone(localState), remote: clone(remote) });
      onStatus('conflict');
      return { status: 'conflict', remote: clone(remote), remoteAvailable, outbox: clone(outbox) };
    }
    return { status: 'pending', remote: clone(remote), remoteAvailable, outbox: clone(outbox) };
  }

  async function flushNow({ localState: nextLocalState = localState } = {}) {
    await open({ initialState: nextLocalState });
    const outbox = typeof persistence.listOutbox === 'function' ? await persistence.listOutbox() : [];
    for (const operation of outbox) {
      if (!validV2Operation(operation)) {
        onStatus('error');
        throw new SyncProtocolError('Opération locale incompatible avec v2', 'SCHEMA_INCOMPATIBLE');
      }
      const result = await transport.transaction(clone(operation));
      if (result?.status === 'aborted') {
        remote = normalizeRemoteDocument(result.root ?? await transport.read());
        if (remote.receipts[operation.deviceId] >= operation.sequence) {
          await persistence.acknowledge(operation.operationId || `${operation.deviceId}:${operation.sequence}`);
          session.baseRevision = remote.revision;
          continue;
        }
        conflictState = {
          local: clone(operation), localState: clone(localState), remote: clone(remote),
          baseRevision: operation.baseRevision
        };
        onConflict({ local: clone(operation), localState: clone(localState), remote: clone(remote) });
        onStatus('conflict');
        return { status: 'conflict', remote: clone(remote), remoteAvailable };
      }
      const root = normalizeRemoteDocument(result?.root ?? result?.document ?? result);
      remote = root;
      session.baseRevision = root.revision;
      const operationId = operation.operationId || `${operation.deviceId}:${operation.sequence}`;
      if (typeof persistence.acknowledgeSession === 'function') {
        await persistence.acknowledgeSession(operationId, { ...session });
        localState = clone(await persistence.load() ?? nextLocalState ?? localState ?? {});
      } else {
        await persistence.acknowledge(operationId);
        // Compatibility adapters without acknowledgeSession retain the old
        // fallback, but still reload immediately before writing the cursor.
        localState = clone(await persistence.load() ?? nextLocalState ?? localState ?? {});
        await persistence.saveAtomic({ state: localState, session: { ...session } });
      }
    }
    onStatus('synced');
    return { status: 'synced', remote: clone(remote), remoteAvailable };
  }

  async function flush(options = {}) {
    if (flushInFlight) {
      // A command appended while the current transport was in flight needs a
      // follow-up drain automatically; callers must not need a third click.
      flushRequested = true;
      return flushInFlight;
    }
    const durableBarrier = mutationQueue;
    const task = transportQueue.then(() => durableBarrier).then(() => flushNow(options));
    const retriableTask = task.then(result => {
      retryDelay = 500;
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
      return result;
    }).catch(error => {
      if (!isProtocolError(error)) scheduleFlushRetry(options);
      throw error;
    });
    const chained = retriableTask.then(result => {
      flushInFlight = null;
      if (flushRequested) {
        flushRequested = false;
        // The current chained promise is also the transport queue tail. Reset
        // that tail before recursively draining, otherwise the follow-up
        // flush would wait on itself forever.
        transportQueue = Promise.resolve();
        return flush(options);
      }
      return result;
    }, error => {
      flushInFlight = null;
      flushRequested = false;
      throw error;
    });
    transportQueue = chained.catch(() => {});
    flushInFlight = chained;
    return chained;
  }

  async function resolveRemote({ localState: nextLocalState = localState } = {}) {
    if (!conflictState) throw new Error('Aucun conflit à résoudre');
    const chosen = conflictState.remote;
    const savedLocalState = clone(nextLocalState ?? conflictState.localState ?? localState ?? {});
    session.baseRevision = chosen.revision;
    session.sequence = chosen.receipts[session.deviceId] || 0;
    localState = savedLocalState;
    await adoptRemote(chosen.state, chosen, {
      resetOutbox: true,
      restore: { reason: 'conflict-remote', state: { local: savedLocalState, remote: chosen } }
    });
    conflictState = null;
    onStatus('synced');
    return { status: 'resolved-remote', remote: clone(chosen) };
  }

  async function resolveLocal({ state, localState: nextLocalState = localState } = {}) {
    if (!conflictState) throw new Error('Aucun conflit à résoudre');
    const base = conflictState.remote;
    const chosenLocalState = clone(nextLocalState ?? conflictState.localState ?? localState ?? {});
    const outgoingState = clone(state ?? chosenLocalState);
    session.baseRevision = base.revision;
    // The old queued operations are discarded.  Reuse the server receipt as
    // the durable sequence anchor so the replacement operation is accepted.
    session.sequence = base.receipts[session.deviceId] || 0;
    await persistence.saveAtomic({
      state: chosenLocalState,
      session: { ...session },
      resetOutbox: true,
      restore: { reason: 'conflict-local', state: { local: chosenLocalState, remote: base } }
    });
    conflictState = null;
    await enqueue({ state: outgoingState, localState: chosenLocalState });
    return flush({ localState: chosenLocalState });
  }

  function exportConflict() {
    if (!conflictState) throw new Error('Aucun conflit à exporter');
    return JSON.stringify({
      format: 'wfrp-conflict-v2',
      local: {
        state: conflictState.localState ?? conflictState.local?.state ?? {},
        operations: conflictState.local
      },
      remote: conflictState.remote
    }, null, 2);
  }

  function stop() {
    stopped = true;
    epoch++;
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    unsubscribe?.();
    unsubscribe = null;
    onStatus('stopped');
  }

  function idle() {
    return mutationQueue;
  }

  return Object.freeze({ contextId, deviceId: localDeviceId, open, enqueue, reconcile, flush, resolveRemote, resolveLocal, exportConflict, stop, idle });
}

export { normalizeRemoteDocument };
