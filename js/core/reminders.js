/** Pure, persistable E14 reminder derivation. */
import { sizeReminders } from './creature-size.js';
import { manyHeadsReminders } from './creature-heads.js';
import { regenerationReminders } from './creature-regeneration.js';

// Un module de Trait par ligne : [clé stable, fonction participant → textes]. Ajouter ici les autres `xxxReminders`.
const TRAIT_REMINDERS = [['size', sizeReminders], ['heads', manyHeadsReminders], ['regeneration', regenerationReminders]];
const traitReminderTexts = person => TRAIT_REMINDERS.flatMap(([name, fn]) => fn(person).map((text, index) => ({ key: `${name}-${index}`, text })));

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

// Display text only: reminder ids never depend on it.
function turnLabel(snapshot, transition) {
  const participants = Array.isArray(snapshot.participants) ? snapshot.participants : [];
  const name = keyPart(transition.actorName, '')
    || keyPart(participants.find(item => item?.id && item.id === transition.actorId)?.name, '');
  const base = transition.type === 'endTurn' ? 'Fin du tour' : 'Début du tour';
  return name ? `${base} de ${name}` : base;
}

/** Derive current reminders; rendering/reloading this result has no side effect. */
export function deriveReminders(snapshot = {}, transition = {}, choices = []) {
  const sceneId = keyPart(snapshot.sceneId || transition.sceneId, 'scene');
  const transitionId = keyPart(transition.id || transition.type, 'transition');
  const candidates = [];
  if (transition.type === 'startTurn' || transition.type === 'endTurn') {
    candidates.push({ kind: transition.type, effectId: transition.actorId || 'turn', text: transition.text || turnLabel(snapshot, transition), mode: 'reminder' });
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
  // Rappels portés par un participant (`extensions.v5.reminders` : armure non déterminée du bestiaire, démon expiré).
  for (const person of Array.isArray(snapshot.participants) ? snapshot.participants : []) {
    if (!person?.id) continue;
    // Rappels dérivés des Traits (calculés à l'affichage, jamais écrits dans le participant).
    for (const { key, text } of traitReminderTexts(person)) candidates.push({ kind: 'participant-reminder', effectId: `${person.id}:trait-${key}`, text: `${person.name || 'Participant'} : ${text}`, mode: 'reminder' });
    for (const note of Array.isArray(person.extensions?.v5?.reminders) ? person.extensions.v5.reminders : []) {
      if (!note?.id || typeof note.text !== 'string') continue;
      candidates.push({ kind: 'participant-reminder', effectId: `${person.id}:${note.id}`, text: `${person.name || 'Participant'} : ${note.text}`, mode: 'reminder' });
    }
  }
  const selected = [];
  const seen = new Set();
  const priorChoices = new Map((Array.isArray(choices) ? choices : []).map(choice => [choice.id, choice]));
  // Un rappel de participant résolu ou ignoré ne revient pas aux transitions suivantes (son id dépend du Round).
  const settledParticipantReminders = new Set((Array.isArray(choices) ? choices : [])
    .filter(choice => [REMINDER_DECISIONS.RESOLVE, REMINDER_DECISIONS.IGNORE].includes(choice?.decision || choice?.choice?.decision))
    .map(choice => String(choice.id)).filter(id => id.includes(':participant-reminder:')).map(id => id.slice(id.indexOf(':participant-reminder:'))));
  for (const candidate of candidates) {
    if (candidate.kind === 'participant-reminder' && settledParticipantReminders.has(`:participant-reminder:${candidate.effectId}`)) continue;
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

// Bloc des rappels portés par un participant, pour sa carte de combat (armure imprimée non déterminée, démon expiré…).
export const PARTICIPANT_REMINDER_ACTIONS = [['resolve', 'Fait'], ['ignore', 'Ignorer']];

/** Construit le bloc des rappels ; `createElement` est celui du document (ou un double en test). Renvoie null s'il n'y en a pas. */
export function buildParticipantReminders(createElement, reminders = []) {
  const pending = (Array.isArray(reminders) ? reminders : []).filter(item => item?.status === 'pending');
  if (!pending.length) return null;
  const block = createElement('div');
  block.className = 'actor-reminders';
  for (const item of pending) {
    const row = createElement('div');
    row.className = 'actor-reminder';
    row.dataset.reminderId = item.id;
    const text = createElement('span');
    text.textContent = `⚠ ${item.text}`;
    row.appendChild(text);
    for (const [decision, label] of PARTICIPANT_REMINDER_ACTIONS) {
      const button = createElement('button');
      button.type = 'button';
      button.className = 'tiny btn-reminder';
      button.dataset.decision = decision;
      button.textContent = label;
      row.appendChild(button);
    }
    block.appendChild(row);
  }
  return block;
}
