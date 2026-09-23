/** Pure E12 action resolution. It never reads DOM, mutates a Store or rolls implicitly. */
import {
  SL, getCritEffect, getLocationName, getReverseRoll, isDouble
} from './dice.js';
import { applyTargetBonus, isCriticalRoll, isFumbleRoll } from './roll-qualities.js';
import { computeDamage } from './damage.js';
import { normalizeQualities } from './quality-normalization.js';

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const ATTACK_TYPES = new Set(['attack', 'attaque']);
const OPPOSITION_TYPES = new Set(['opposition', 'opposed']);
const PENALTY_STATES = new Set(['sonne', 'aveugle', 'extenue', 'brise']);
export const MAX_APPLIED_RESOLUTION_IDS = 500;

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

export class ResolutionError extends Error {
  constructor(message, code = 'INVALID_RESOLUTION', details = {}) {
    super(message);
    this.name = 'ResolutionError';
    this.code = code;
    this.details = details;
  }
}

function parseRoll(value) {
  if (typeof value === 'string' && value.trim() === '00') return 100;
  const roll = Number(value);
  if (!Number.isInteger(roll) || roll < 1 || roll > 100) {
    throw new ResolutionError('Le résultat d100 doit être compris entre 1 et 100', 'INVALID_ROLL', { value });
  }
  return roll;
}

function parseInteger(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stateKey(state) {
  if (typeof state === 'string') return state.split('|', 1)[0].trim().toLocaleLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return typeof state?.key === 'string' ? state.key : stateKey(state?.name || '');
}

function statePenalty(states) {
  if (!Array.isArray(states)) return { value: 0, names: [] };
  const names = [];
  for (const state of states) {
    const key = stateKey(state);
    if (PENALTY_STATES.has(key) && !names.includes(key)) names.push(key);
  }
  return { value: names.length * 10, names };
}

function attackType(type) {
  return ATTACK_TYPES.has(String(type || '').trim().toLocaleLowerCase());
}

function participantById(state, id) {
  if (!isRecord(state) || !id) return null;
  if (Array.isArray(state.participants)) return state.participants.find(item => item?.id === id) || null;
  if (isRecord(state.participants)) return state.participants[id] || null;
  return null;
}

function participantListWithUpdate(state, id, update) {
  if (Array.isArray(state.participants)) {
    return state.participants.map(item => item?.id === id ? update : item);
  }
  const participants = clone(state.participants || {});
  safeSet(participants, id, update);
  return participants;
}

function defaultResolutionId(actor, action, target, baseRevision, roll) {
  const actorId = actor?.id || 'actor';
  const actionId = action?.id || action?.actionId || action?.note || action?.type || 'action';
  const targetId = target?.id || 'none';
  return `resolution-${actorId}-${actionId}-${targetId}-r${baseRevision}-d${roll}`;
}

/** Canonicalize inputs without drawing a random value. */
export function normalizeResolutionInput(input = {}) {
  if (!isRecord(input)) throw new ResolutionError('Entrée de résolution invalide');
  const actor = isRecord(input.actor) ? clone(input.actor) : null;
  const action = isRecord(input.action) ? clone(input.action) : {};
  const target = isRecord(input.target) ? clone(input.target) : null;
  const roll = parseRoll(input.roll ?? input.dieRoll ?? input.enteredRoll);
  if (hasOwn(input, 'baseRevision') && (!Number.isInteger(input.baseRevision) || input.baseRevision < 0)) {
    throw new ResolutionError('baseRevision invalide', 'INVALID_REVISION', { value: input.baseRevision });
  }
  const baseRevision = input.baseRevision ?? 0;
  const type = String(action.type || 'test').trim().toLocaleLowerCase();
  const qualities = normalizeQualities(action.qualities || input.qualities || []);
  const resolutionId = String(input.resolutionId || input.id || defaultResolutionId(actor, action, target, baseRevision, roll));
  if (!resolutionId.trim()) throw new ResolutionError('resolutionId invalide');
  return {
    resolutionId,
    baseRevision,
    actor,
    action: {
      ...action,
      type,
      base: parseInteger(action.base, 0),
      mod: parseInteger(action.mod, 0),
      qualities
    },
    target,
    roll,
    criticalRolls: isRecord(input.criticalRolls) ? clone(input.criticalRolls) : null
  };
}

function criticalDetails(input, result) {
  if (result.kind !== 'Critique') return null;
  const rawLocation = input.criticalRolls?.location ?? input.criticalRolls?.locationRoll;
  const rawEffect = input.criticalRolls?.effect ?? input.criticalRolls?.effectRoll;
  const locationRoll = rawLocation === undefined ? null : parseRoll(rawLocation);
  const effectRollBase = rawEffect === undefined ? null : parseRoll(rawEffect);
  const effectRoll = effectRollBase === null ? null
    : Math.min(100, result.acharnement ? effectRollBase + 10 : effectRollBase);
  const location = locationRoll === null ? null : getLocationName(locationRoll);
  const effect = location && effectRoll !== null ? getCritEffect(location.key, effectRoll) : null;
  return {
    pending: locationRoll === null || effectRoll === null,
    locationRoll,
    location,
    effectRoll,
    effect: effect ? clone(effect) : null
  };
}

/** Preview one action, preserving the exact supplied d100 and any critical dice. */
export function previewResolution(input) {
  const normalized = normalizeResolutionInput(input);
  const { actor, action, target, roll } = normalized;
  const penalties = statePenalty(actor?.states);
  const preQualityTarget = Math.max(0, action.base + action.mod - penalties.value);
  const qualityTarget = applyTargetBonus(preQualityTarget, action.qualities);
  const targetScore = qualityTarget.target;
  const success = roll <= targetScore;
  const sl = SL(targetScore, roll);
  const doubled = isDouble(roll);
  const criticalClassification = isCriticalRoll(roll, doubled, action.qualities);
  const fumbleClassification = isFumbleRoll(roll, doubled, action.qualities);
  const acharnement = attackType(action.type) && success && Number(target?.hp) <= 0;
  let kind = null;
  let expanded = false;
  if (success && criticalClassification.critique) {
    kind = 'Critique';
    expanded = criticalClassification.élargi;
  } else if (!success && fumbleClassification.maladresse) {
    kind = 'Maladresse';
    expanded = fumbleClassification.élargi;
  } else if (acharnement) {
    kind = 'Critique';
  }

  const location = success ? (() => {
    const reversed = getReverseRoll(roll);
    return { roll: reversed, ...getLocationName(reversed) };
  })() : null;
  const critical = kind === 'Critique' ? criticalDetails(normalized, { kind, acharnement }) : null;
  let damage = null;
  if (success && attackType(action.type) && target && hasOwn(action, 'damage')) {
    const armour = target.armor || {};
    const targetArmour = location?.key === 'HEAD' ? armour.head
      : location?.key === 'ARM' ? armour.arms
        : location?.key === 'BODY' ? armour.body
          : location?.key === 'LEG' ? armour.legs : 0;
    damage = computeDamage({
      weaponDamage: action.damage,
      sl,
      roll,
      targetToughnessBonus: Math.floor((Number(target.caracs?.E) || 0) / 10),
      targetArmour,
      qualities: action.qualities
    });
  }

  return {
    resolutionId: normalized.resolutionId,
    baseRevision: normalized.baseRevision,
    input: normalized,
    status: 'preview',
    actionType: action.type,
    attack: attackType(action.type),
    score: { base: action.base, mod: action.mod, statePenalty: penalties.value, penaltyStates: penalties.names, target: targetScore },
    roll,
    success,
    sl,
    double: doubled,
    critical: kind ? { kind, expanded, acharnement, details: critical } : null,
    fumble: kind === 'Maladresse' ? { expanded } : null,
    location,
    targetId: target?.id || null,
    damage,
    opposition: OPPOSITION_TYPES.has(action.type) ? { mode: 'manual', reason: 'aucune-convention-locale-vérifiée' } : null,
    application: { status: 'pending', applied: false }
  };
}

export const replayResolution = previewResolution;

/** Apply a preview once to a revisioned state; stale target/revision requires a new preview. */
export function applyResolution(preview, currentState) {
  if (!isRecord(preview) || preview.status !== 'preview') throw new ResolutionError('Aperçu de résolution invalide');
  if (!isRecord(currentState) || !Number.isInteger(currentState.revision) || currentState.revision < 0) {
    throw new ResolutionError('État courant invalide', 'INVALID_STATE');
  }
  const appliedIds = Array.isArray(currentState.appliedResolutionIds) ? currentState.appliedResolutionIds : [];
  if (preview.application?.applied || appliedIds.includes(preview.resolutionId)) {
    return { status: 'duplicate', state: clone(currentState), resolution: clone(preview) };
  }
  if (currentState.revision !== preview.baseRevision) {
    return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
  }
  if (preview.attack && preview.input.action.damage !== undefined && !preview.targetId) {
    return { status: 'manual', reason: 'cible-requise-pour-les-dégâts', state: clone(currentState), resolution: clone(preview) };
  }
  const nextState = clone(currentState);
  const target = participantById(currentState, preview.targetId);
  if (preview.attack && preview.damage && preview.targetId) {
    if (!target) return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
    if (JSON.stringify(target) !== JSON.stringify(preview.input.target)) {
      return { status: 'stale', requiresPreview: true, state: clone(currentState), resolution: clone(preview) };
    }
    const updated = clone(target);
    const oldHp = Number(updated.hp) || 0;
    updated.hp = oldHp - preview.damage.finalDamage;
    if (updated.hp <= 0) {
      const states = Array.isArray(updated.states) ? [...updated.states] : [];
      if (!states.some(state => stateKey(state).replace(/-/g, ' ') === 'a terre')) {
        states.push({ name: 'À Terre', key: 'a-terre', level: 1, duration: null, source: { kind: 'resolution', resolutionId: preview.resolutionId } });
      }
      updated.states = states;
    }
    nextState.participants = participantListWithUpdate(currentState, preview.targetId, updated);
  }
  nextState.revision = currentState.revision + 1;
  nextState.appliedResolutionIds = [...appliedIds, preview.resolutionId].slice(-MAX_APPLIED_RESOLUTION_IDS);
  const resolution = clone(preview);
  resolution.application = { status: 'applied', applied: true, revision: nextState.revision };
  return { status: 'applied', state: nextState, resolution };
}
