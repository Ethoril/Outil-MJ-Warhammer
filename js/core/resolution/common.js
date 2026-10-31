import { isRecord } from './describe.js';

export const ATTACK_TYPES = new Set(['attack', 'attaque']);
export const OPPOSITION_TYPES = new Set(['opposition', 'opposed']);
export const SKILL_TYPES = new Set(['skill']);
export const DEFENSE_TYPES = new Set(['defense']);
export const MAX_APPLIED_RESOLUTION_IDS = 500;

export function safeSet(target, key, value) {
  Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true });
}

export const clone = value => {
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

export function attackType(type) {
  return ATTACK_TYPES.has(String(type || '').trim().toLocaleLowerCase());
}

export function participantById(state, id) {
  if (!isRecord(state) || !id) return null;
  if (Array.isArray(state.participants)) return state.participants.find(item => item?.id === id) || null;
  if (isRecord(state.participants)) return state.participants[id] || null;
  return null;
}

export function participantListWithUpdate(state, id, update) {
  if (Array.isArray(state.participants)) {
    return state.participants.map(item => item?.id === id ? update : item);
  }
  const participants = clone(state.participants || {});
  safeSet(participants, id, update);
  return participants;
}

export const foldKey = text => String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// F2-H : actions de profil qui posent des états sans infliger de dégâts ni de critique (Immersion, lasso de soie, crachat).
export const NO_DAMAGE_PROFILE_ABILITIES = new Set(['sea-elemental-immersion', 'cliff-spider-lasso', 'farmyard-beast-spit']);
