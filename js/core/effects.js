/** Pure E06 state normalization and bounded end-of-turn effects. */
import { slugify } from './keywords.js';

export const EFFECT_MODES = Object.freeze({
  AUTOMATIC: 'automatic',
  REMINDER: 'reminder',
  MANUAL: 'manual'
});

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isFiniteNumber = value => Number.isFinite(Number(value));

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

function stateKey(name) {
  return slugify(name || '');
}

function stateId(raw, index, key) {
  if (isRecord(raw) && typeof raw.id === 'string' && raw.id.trim()) return raw.id;
  return `state-${index + 1}-${key || 'unknown'}`;
}

function normalizeDuration(value) {
  if (value === null || value === undefined || value === '' || !isFiniteNumber(value)) return null;
  const duration = Number(value);
  // parseState historically maps zero and invalid durations to persistent/null.
  return duration > 0 ? Math.floor(duration) : null;
}

function normalizeLevel(value) {
  if (value === null || value === undefined || value === '' || !isFiniteNumber(value)) return 1;
  const level = Number(value);
  return level > 0 ? Math.max(1, Math.floor(level)) : 1;
}

function normalizeD10(value) {
  const roll = Number(value);
  if (!Number.isFinite(roll)) return 1;
  return Math.min(10, Math.max(1, Math.floor(roll)));
}

/** Normalize one historical string or modern state object without merging entries. */
export function normalizeState(raw, index = 0) {
  let source = {};
  let name = '';
  let duration = null;
  let level = 1;

  if (typeof raw === 'string') {
    const separator = raw.indexOf('|');
    name = (separator < 0 ? raw : raw.slice(0, separator)).trim();
    duration = separator < 0 ? null : normalizeDuration(raw.slice(separator + 1));
  } else if (isRecord(raw)) {
    source = clone(raw);
    name = typeof raw.name === 'string' ? raw.name.trim()
      : (typeof raw.key === 'string' ? raw.key.trim() : (typeof raw.id === 'string' ? raw.id.trim() : ''));
    level = normalizeLevel(raw.level);
    if (hasOwn(raw, 'duration')) duration = normalizeDuration(raw.duration);
    else if (hasOwn(raw, 'remainingTurns')) duration = normalizeDuration(raw.remainingTurns);
    else if (hasOwn(raw, 'turns')) duration = normalizeDuration(raw.turns);
  } else {
    name = String(raw ?? '').trim();
  }

  const key = stateKey(name);
  const out = source;
  safeSet(out, 'id', stateId(raw, index, key));
  safeSet(out, 'key', key);
  safeSet(out, 'name', name);
  safeSet(out, 'level', level);
  safeSet(out, 'duration', duration);
  if (!hasOwn(out, 'source')) safeSet(out, 'source', null);
  return out;
}

/** Normalize all states; duplicate semantic entries remain separate occurrences. */
export function normalizeEffects(states = []) {
  if (!Array.isArray(states)) return [];
  return states.map((raw, index) => normalizeState(raw, index));
}

export const normalizeStates = normalizeEffects;

const CAPABILITIES = Object.freeze({
  hemorragique: { mode: EFFECT_MODES.AUTOMATIC, trigger: 'endOfTurn', effect: 'hp-minus-per-level' },
  enflamme: { mode: EFFECT_MODES.AUTOMATIC, trigger: 'endOfTurn', effect: 'periodic-damage' },
  surpris: { mode: EFFECT_MODES.AUTOMATIC, trigger: 'endOfTurn', effect: 'expires' },
  sonne: { mode: EFFECT_MODES.REMINDER, trigger: 'roll', effect: 'current-name-malus' },
  aveugle: { mode: EFFECT_MODES.REMINDER, trigger: 'roll', effect: 'current-name-malus' },
  assourdi: { mode: EFFECT_MODES.REMINDER, trigger: 'roll', effect: 'reminder' },
  extenue: { mode: EFFECT_MODES.REMINDER, trigger: 'roll', effect: 'current-name-malus' },
  brise: { mode: EFFECT_MODES.REMINDER, trigger: 'roll', effect: 'current-name-malus' },
  inconscient: { mode: EFFECT_MODES.REMINDER, trigger: 'manual', effect: 'reminder' }
});

/** Return the local capability matrix; unknown effects remain manual. */
export function resolveEffectCapability(effect) {
  const name = typeof effect === 'string' ? effect : (effect?.key || effect?.name || '');
  const key = stateKey(name);
  const capability = CAPABILITIES[key] || {
    mode: EFFECT_MODES.MANUAL, trigger: 'manual', effect: 'unknown'
  };
  return { key, known: Boolean(CAPABILITIES[key]), ...clone(capability) };
}

export const getEffectCapability = resolveEffectCapability;

function sumLevels(states, key) {
  return states.filter(state => state.key === key)
    .reduce((total, state) => total + state.level, 0);
}

function armorValue(armor, key) {
  const value = Number(armor?.[key]);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Apply only conventions already implemented by combat.js. The participant and
 * every state are cloned; `d10Roll` is supplied by the caller for determinism.
 */
export function advanceEndOfTurn(participant, { d10Roll = 1 } = {}) {
  if (!isRecord(participant)) return { hpDelta: 0, newHp: 0, nextStates: [], logs: [] };
  const states = normalizeEffects(participant.states);
  const name = participant.name || '—';
  let hpDelta = 0;
  const logs = [];

  const hemorLevels = sumLevels(states, 'hemorragique');
  if (hemorLevels > 0) {
    hpDelta -= hemorLevels;
    logs.push(`🩸 ${name} : -${hemorLevels} PV (Hémorragie)`);
  }

  const flameLevels = sumLevels(states, 'enflamme');
  if (flameLevels > 0) {
    const enduranceBonus = Math.floor(armorValue({ E: participant.caracs?.E }, 'E') / 10);
    const lowestArmor = Math.min(
      armorValue(participant.armor, 'head'), armorValue(participant.armor, 'body'),
      armorValue(participant.armor, 'arms'), armorValue(participant.armor, 'legs')
    );
    const roll = normalizeD10(d10Roll);
    const fireDamage = Math.max(0, roll - enduranceBonus - lowestArmor + flameLevels);
    hpDelta -= fireDamage;
    logs.push(`🔥 ${name} Enflammé ×${flameLevels} : 1d10(${roll}) − BE(${enduranceBonus}) − armure(${lowestArmor}) + niveaux(${flameLevels}) = ${fireDamage} dégât(s)`);
  }

  const nextStates = [];
  for (const state of states) {
    if (state.key === 'surpris') {
      logs.push(`✓ ${name} : "Surpris" dissipé.`);
      continue;
    }
    if (state.duration === null) {
      nextStates.push(clone(state));
      continue;
    }
    if (state.duration <= 1) {
      logs.push(`⏱ ${name} : "${state.name}" expiré.`);
      continue;
    }
    const next = clone(state);
    next.duration = state.duration - 1;
    nextStates.push(next);
  }

  const currentHp = Number(participant.hp) || 0;
  const newHp = currentHp + hpDelta;
  if (hpDelta < 0 && newHp <= 0 && !nextStates.some(state => state.key === 'inconscient')) {
    nextStates.push(normalizeState({ name: 'Inconscient', level: 1, duration: null, source: 'endOfTurn' }, states.length));
    logs.push(`💀 ${name} → Inconscient (PV à 0)`);
  }
  return { hpDelta, newHp, nextStates, logs };
}

export const computeEndOfTurn = advanceEndOfTurn;
