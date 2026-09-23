/** Pure, persistable E14 reminder derivation. */

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function safeSet(target, key, value) {
  Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true });
}

const clone = value => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clone);
  const out = {};
  for (const [key, child] of Object.entries(value)) safeSet(out, key, clone(child));
  return out;
};

export const REMINDER_DECISIONS = Object.freeze({ RESOLVE: 'resolve', IGNORE: 'ignore', SNOOZE: 'snooze' });

function keyPart(value, fallback = 'unknown') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function reminder(input, sceneId, transitionId) {
  const effectId = keyPart(input.effectId || input.id, input.kind || 'reminder');
  const kind = keyPart(input.kind);
  return {
    // Kind is part of identity: an expiring haemorrhage and its announced
    // automatic consequence are two distinct decisions for one transition.
    id: `${sceneId}:${transitionId}:${kind}:${effectId}`,
    sceneId,
    transitionId,
    effectId,
    kind,
    mode: input.mode || 'reminder',
    text: keyPart(input.text, 'Décision à prendre'),
    status: 'pending',
    ...(hasOwn(input, 'payload') ? { payload: clone(input.payload) } : {})
  };
}

function stateKey(state) {
  const name = typeof state === 'string' ? state.split('|', 1)[0] : (state?.key || state?.name || '');
  return String(name).toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Derive current reminders; rendering/reloading this result has no side effect. */
export function deriveReminders(snapshot = {}, transition = {}, choices = []) {
  const sceneId = keyPart(snapshot.sceneId || transition.sceneId, 'scene');
  const transitionId = keyPart(transition.id || transition.type, 'transition');
  const candidates = [];
  if (transition.type === 'startTurn' || transition.type === 'endTurn') {
    candidates.push({ kind: transition.type, effectId: transition.actorId || 'turn', text: transition.text || `Transition ${transition.type}`, mode: 'reminder' });
  }
  const states = Array.isArray(snapshot.states) ? snapshot.states : [];
  for (const state of states) {
    const key = stateKey(state);
    const duration = typeof state === 'object' ? state.duration : null;
    if (duration === 1 || (Array.isArray(transition.expiredEffectIds) && transition.expiredEffectIds.includes(state.id))) {
      candidates.push({ kind: 'effect-expiring', effectId: state.id || key, text: `${state.name || key} expire`, mode: 'reminder', payload: { state: clone(state) } });
    }
    if (key === 'hemorragique' && transition.type === 'endTurn') {
      candidates.push({ kind: 'automatic-announced', effectId: state.id || key, text: 'Hémorragie à appliquer', mode: 'automatic', payload: { state: clone(state) } });
    }
  }
  for (const item of Array.isArray(snapshot.consequences) ? snapshot.consequences : []) {
    if (!item.resolved) candidates.push({ kind: 'consequence', effectId: item.id, text: item.text, mode: 'reminder', payload: clone(item) });
  }
  for (const item of Array.isArray(snapshot.reinforcements) ? snapshot.reinforcements : []) {
    if (!item.arrived && (item.expectedAt === transition.round || item.expectedAt === transition.id)) {
      candidates.push({ kind: 'reinforcement', effectId: item.id, text: item.text || 'Renfort attendu', mode: 'reminder', payload: clone(item) });
    }
  }
  const selected = [];
  const seen = new Set();
  const priorChoices = new Map((Array.isArray(choices) ? choices : []).map(choice => [choice.id, choice]));
  for (const candidate of candidates) {
    const item = reminder(candidate, sceneId, transitionId);
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const choice = priorChoices.get(item.id);
    const decision = choice?.decision || choice?.choice?.decision;
    if (decision === REMINDER_DECISIONS.IGNORE || decision === REMINDER_DECISIONS.RESOLVE) {
      item.status = decision;
      item.choice = clone(choice);
    } else if (decision === REMINDER_DECISIONS.SNOOZE) {
      const until = choice?.snoozeUntil || choice?.choice?.snoozeUntil;
      const stillSnoozed = !until
        || (until.transitionId && until.transitionId === transitionId)
        || (until.round !== undefined && Number(transition.round) < Number(until.round));
      if (stillSnoozed) {
        item.status = 'snoozed';
        item.choice = clone(choice);
      } else {
        item.choice = clone(choice);
      }
    }
    selected.push(item);
  }
  return selected;
}

export function pendingReminders(reminders = []) {
  return (Array.isArray(reminders) ? reminders : []).filter(reminder => reminder.status === 'pending').map(clone);
}

/** Record a user decision without deleting the occurrence. */
export function resolveReminder(reminders, id, decision, details = {}) {
  if (!Object.values(REMINDER_DECISIONS).includes(decision)) throw new TypeError('Décision de rappel invalide');
  if (!Array.isArray(reminders)) return [];
  return reminders.map(item => {
    if (item.id !== id) return clone(item);
    const choice = { id, decision, ...clone(details) };
    if (decision === REMINDER_DECISIONS.SNOOZE && !choice.snoozeUntil) {
      // A snooze is scoped to this transition by default. It becomes due on
      // the next transition even when the caller supplied no extra metadata.
      choice.snoozeUntil = { transitionId: item.transitionId };
    }
    return { ...clone(item), status: decision, choice };
  });
}
