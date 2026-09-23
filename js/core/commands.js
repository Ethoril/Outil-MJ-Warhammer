/** Pure command value objects and deterministic command execution for E07. */

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

export const clone = value => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clone);
  const out = {};
  for (const [key, child] of Object.entries(value)) safeSet(out, key, clone(child));
  return out;
};

export class CommandError extends Error {
  constructor(message, code = 'INVALID_COMMAND', details = {}) {
    super(message);
    this.name = 'CommandError';
    this.code = code;
    this.details = details;
  }
}

function assertText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new CommandError(`${field} doit être une chaîne non vide`, 'INVALID_COMMAND', { field, value });
  }
  return value;
}

function assertRevision(value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new CommandError('baseRevision doit être un entier positif ou nul', 'INVALID_COMMAND', { value });
  }
}

/** A serializable command with all data needed to replay or inverse it. */
export function createCommand(input = {}) {
  if (!isRecord(input)) throw new CommandError('Commande invalide');
  const known = ['id', 'type', 'baseRevision', 'data', 'result', 'inverse'];
  if (Object.keys(input).some(key => !known.includes(key))) {
    throw new CommandError('Champ inconnu dans la commande', 'INVALID_COMMAND', { keys: Object.keys(input) });
  }
  const id = assertText(input.id, 'id');
  const type = assertText(input.type, 'type');
  const baseRevision = input.baseRevision ?? 0;
  assertRevision(baseRevision);
  return {
    id,
    type,
    baseRevision,
    data: hasOwn(input, 'data') ? clone(input.data) : {},
    result: hasOwn(input, 'result') ? clone(input.result) : null,
    inverse: hasOwn(input, 'inverse') ? clone(input.inverse) : null
  };
}

/** Build a command whose result and inverse are complete immutable state snapshots. */
export function createStateCommand({ id, type, baseRevision = 0, before, after, data = {} } = {}) {
  if (before === undefined || after === undefined) {
    throw new CommandError('Une commande d’état exige before et after', 'INVALID_COMMAND');
  }
  return createCommand({
    id, type, baseRevision, data,
    result: { state: clone(after) },
    inverse: { state: clone(before) }
  });
}

/**
 * Apply a command through an injected pure handler. The handler receives clones;
 * an exception therefore cannot partially mutate the caller state.
 */
export function executeCommand(state, command, handler) {
  const canonical = createCommand(command);
  if (typeof handler !== 'function') throw new CommandError('Handler de commande requis');
  const input = clone(state);
  const next = handler(input, clone(canonical.data), clone(canonical.result), canonical);
  if (next === undefined) throw new CommandError('Le handler n’a produit aucun état', 'COMMAND_FAILED');
  return { state: clone(next), command: canonical };
}

/** Replay uses the recorded result; the command never rolls a new die. */
export const replayCommand = executeCommand;

/** Apply the recorded inverse through an injected handler. */
export function inverseCommand(state, command, handler) {
  const canonical = createCommand(command);
  if (canonical.inverse === null || canonical.inverse === undefined) {
    throw new CommandError('Commande sans inverse', 'NO_INVERSE');
  }
  if (typeof handler !== 'function') throw new CommandError('Handler inverse requis');
  const input = clone(state);
  const next = handler(input, clone(canonical.inverse), canonical);
  if (next === undefined) throw new CommandError('Le handler inverse n’a produit aucun état', 'COMMAND_FAILED');
  return { state: clone(next), command: canonical };
}
