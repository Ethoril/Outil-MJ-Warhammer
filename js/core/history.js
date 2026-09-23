/** Immutable undo/redo history for E07. */
import { clone, createCommand } from './commands.js';

export const MAX_HISTORY_COMMANDS = 50;
// Budget initial couvrant les résultats détaillés et jets enregistrés des fixtures E07.
export const DEFAULT_HISTORY_MAX_BYTES = 2 * 1024 * 1024;

function byteLength(value) {
  const text = JSON.stringify(value);
  return typeof TextEncoder === 'function' ? new TextEncoder().encode(text).length : text.length;
}

function trimByBytes(commands, maxBytes) {
  const out = [...commands];
  while (out.length && byteLength(out) > maxBytes) out.shift();
  return out;
}

function canonicalCommands(commands) {
  return commands.map(createCommand);
}

function canonicalHistory(history) {
  if (!history || typeof history !== 'object') return createHistory();
  const limit = Number.isInteger(history.limit) && history.limit > 0
    ? Math.min(history.limit, MAX_HISTORY_COMMANDS) : MAX_HISTORY_COMMANDS;
  const maxBytes = Number.isInteger(history.maxBytes) && history.maxBytes > 0
    ? history.maxBytes : DEFAULT_HISTORY_MAX_BYTES;
  const past = trimByBytes(canonicalCommands(Array.isArray(history.past) ? history.past : []), maxBytes);
  const future = trimByBytes(canonicalCommands(Array.isArray(history.future) ? history.future : []), maxBytes);
  while (past.length && byteLength([...past, ...future]) > maxBytes) past.shift();
  while (future.length && byteLength([...past, ...future]) > maxBytes) future.shift();
  return {
    limit,
    maxBytes,
    past: past.slice(-limit),
    future: future.slice(-limit),
    boundary: history.boundary == null ? null : clone(history.boundary)
  };
}

export function createHistory({ limit = MAX_HISTORY_COMMANDS, maxBytes = DEFAULT_HISTORY_MAX_BYTES } = {}) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('limit doit être un entier positif');
  if (!Number.isInteger(maxBytes) || maxBytes < 1) throw new RangeError('maxBytes doit être un entier positif');
  return { limit: Math.min(limit, MAX_HISTORY_COMMANDS), maxBytes, past: [], future: [], boundary: null };
}

/** Add a local command, clearing redo and retaining only the newest 50 entries. */
export function recordCommand(history, command) {
  const current = canonicalHistory(history);
  const nextCommand = createCommand(command);
  if (byteLength([nextCommand]) > current.maxBytes) {
    throw new RangeError('Commande trop volumineuse pour maxBytes');
  }
  const nextPast = trimByBytes([...current.past, nextCommand], current.maxBytes);
  return {
    limit: current.limit,
    maxBytes: current.maxBytes,
    past: nextPast.slice(-current.limit),
    future: [],
    boundary: clone(current.boundary)
  };
}

export function canUndo(history) {
  return canonicalHistory(history).past.length > 0;
}

export function canRedo(history) {
  return canonicalHistory(history).future.length > 0;
}

/** Consume the latest command and move it to redo. */
export function undo(history) {
  const current = canonicalHistory(history);
  if (!current.past.length) return { history: current, command: null };
  const command = current.past[current.past.length - 1];
  return {
    command,
    history: {
      limit: current.limit,
      maxBytes: current.maxBytes,
      past: current.past.slice(0, -1),
      future: [...current.future, command],
      boundary: clone(current.boundary)
    }
  };
}

/** Consume the latest redo command and move it back to undo. */
export function redo(history) {
  const current = canonicalHistory(history);
  if (!current.future.length) return { history: current, command: null };
  const command = current.future[current.future.length - 1];
  return {
    command,
    history: {
      limit: current.limit,
      maxBytes: current.maxBytes,
      past: [...current.past, command].slice(-current.limit),
      future: current.future.slice(0, -1),
      boundary: clone(current.boundary)
    }
  };
}

/** An external sync/import closes all locally applicable undo/redo entries. */
export function markExternalBoundary(history, details = {}) {
  const current = canonicalHistory(history);
  return {
    limit: current.limit,
    maxBytes: current.maxBytes,
    past: [],
    future: [],
    boundary: { ...clone(details), reason: details.reason || 'external-sync' }
  };
}

export const closeForExternalUpdate = markExternalBoundary;

export function historySnapshot(history) {
  return clone(canonicalHistory(history));
}
