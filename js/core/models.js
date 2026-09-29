import { normalizeEffects } from './effects.js';
import { normalizeQualities } from './quality-normalization.js';

export const uid = () => Math.random().toString(36).slice(2, 10);

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// Canonical characteristic keys, as written by the profile form and read by the engine.
export const CARAC_KEYS = Object.freeze(['CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc']);
// Secondary keys already recognised by the text import; kept so no value is lost.
export const EXTRA_CARAC_KEYS = Object.freeze(['M', 'A', 'B', 'BF']);

const CANONICAL_CARACS = new Set([...CARAC_KEYS, ...EXTRA_CARAC_KEYS]);
const CARAC_ALIASES = new Map([
  ['cc', 'CC'], ['ct', 'CT'], ['f', 'F'], ['e', 'E'], ['i', 'I'], ['ag', 'Ag'], ['agi', 'Ag'],
  ['dex', 'Dex'], ['int', 'Int'], ['fm', 'FM'], ['soc', 'Soc'],
  ['m', 'M'], ['a', 'A'], ['b', 'B'], ['bf', 'BF']
]);

function finiteCarac(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** Canonical key for a label (`agi` → `Ag`), or null when it is not a characteristic. */
export function canonicalCaracKey(key) {
  const raw = String(key ?? '').trim();
  if (CANONICAL_CARACS.has(raw)) return raw;
  return CARAC_ALIASES.get(raw.toLocaleLowerCase()) || null;
}

/**
 * Convert aliases to canonical keys and keep only finite numbers. A canonical
 * key wins over an alias of the same characteristic; unknown keys are kept.
 * Idempotent.
 */
export function normalizeCaracs(caracs) {
  const out = {};
  if (!isRecord(caracs)) return out;
  const entries = Object.entries(caracs);
  const put = (key, value) => Object.defineProperty(out, key, { value, enumerable: true, writable: true, configurable: true });
  // Canonical keys first so that an alias can never overwrite them.
  for (const [key, value] of entries) {
    const number = finiteCarac(value);
    if (number !== null && CANONICAL_CARACS.has(key)) put(key, number);
  }
  for (const [key, value] of entries) {
    if (CANONICAL_CARACS.has(key)) continue;
    const number = finiteCarac(value);
    const target = canonicalCaracKey(key) || key;
    if (number !== null && !Object.prototype.hasOwnProperty.call(out, target)) put(target, number);
  }
  return out;
}

export function cloneValue(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(cloneValue);
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    Object.defineProperty(out, key, { value: cloneValue(child), enumerable: true, writable: true, configurable: true });
  }
  return out;
}

export function normalizeTags(tags) {
  if (typeof tags === 'string') tags = tags.split(',');
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map(tag => typeof tag === 'string' ? tag.trim() : '').filter(Boolean))];
}

export function normalizeAction(raw = {}) {
  const input = isRecord(raw) ? cloneValue(raw) : {};
  const base = input.base ?? '';
  const valuesX = input.valuesX ?? input.xValues ?? input.valueX ?? null;
  const capacity = input.capacity === undefined || input.capacity === null || input.capacity === ''
    ? null : (Number.isFinite(Number(input.capacity)) ? Number(input.capacity) : null);
  return {
    ...input,
    id: typeof input.id === 'string' && input.id ? input.id : uid(),
    base,
    mod: Number(input.mod) || 0,
    note: typeof input.note === 'string' ? input.note : '',
    damage: Number(input.damage) || 0,
    targetId: input.targetId || null,
    qualities: normalizeQualities(input.qualities),
    valuesX,
    capacity,
    extensions: isRecord(input.extensions) ? cloneValue(input.extensions) : {}
  };
}

export class Profile {
  constructor({ id = uid(), name, kind = 'Créature', initiative = 30, hp = 10, caracs = {}, armor = { head: 0, body: 0, arms: 0, legs: 0 }, diceLines, actions, group = '', tags = [], notes = '', favorite = false, extensions = {} } = {}) {
    this.id = id;
    this.name = (name || 'Sans-nom').trim();
    this.kind = ['PJ', 'PNJ', 'Créature'].includes(kind) ? kind : 'Créature';
    this.initiative = Number(initiative) || 0;
    this.hp = Number(hp) || 0;
    this.caracs = normalizeCaracs(caracs);
    this.armor = isRecord(armor) ? cloneValue(armor) : {};
    const actionSource = Array.isArray(actions) ? actions : (Array.isArray(diceLines) ? diceLines : []);
    this.diceLines = actionSource.map(normalizeAction);
    // Une seule collection évite qu’une modification du formulaire ne laisse
    // une copie obsolète derrière `actions`.
    Object.defineProperty(this, 'actions', {
      enumerable: true,
      configurable: true,
      get: () => this.diceLines,
      set: value => { this.diceLines = Array.isArray(value) ? value.map(normalizeAction) : []; }
    });
    this.group = (group || '').trim();
    this.tags = normalizeTags(tags);
    this.notes = typeof notes === 'string' ? notes : '';
    this.favorite = Boolean(favorite);
    this.extensions = isRecord(extensions) ? cloneValue(extensions) : {};
  }
}

export class Participant {
  constructor({ id = uid(), profileId, persistentCharacterId = null, improvised = false, name, kind, initiative = 0, hp = 10, maxHp, states = [], zone = 'bench', camp = 'neutre', color = 'default', armor = { head: 0, body: 0, arms: 0, legs: 0 }, caracs = {}, actions = [], tags = [], notes = '', source = null, extensions = {} } = {}) {
    this.id = id;
    this.profileId = profileId || null;
    this.persistentCharacterId = persistentCharacterId || null;
    this.improvised = Boolean(improvised);
    this.name = name || '—';
    this.kind = kind || 'Créature';
    this.initiative = Number(initiative) || 0;
    this.hp = Number(hp) || 0;
    this.maxHp = maxHp !== undefined ? Number(maxHp) : Number(hp) || 0;
    // Les chaînes historiques restent acceptées, mais toute nouvelle instance
    // expose la forme structurée attendue par le moteur et l'UI.
    this.states = normalizeEffects(states);
    this.zone = zone;
    this.camp = typeof camp === 'string' && camp.trim() ? camp : 'neutre';
    this.color = color;
    this.armor = isRecord(armor) ? cloneValue(armor) : {};
    this.caracs = normalizeCaracs(caracs);
    this.actions = Array.isArray(actions) ? actions.map(normalizeAction) : [];
    this.tags = normalizeTags(tags);
    this.notes = typeof notes === 'string' ? notes : '';
    this.source = isRecord(source) ? cloneValue(source) : (source == null ? null : cloneValue(source));
    this.extensions = isRecord(extensions) ? cloneValue(extensions) : {};
  }
}

export class DiceLine {
  constructor({ id = uid(), participantId = '', type = 'test', attr = 'Custom', base = '', mod = 0, note = '', damage = 0, targetId = null, qualities = [], valuesX = null, xValues = null, capacity = null, extensions = {} } = {}) {
    const action = normalizeAction({ id, participantId, type, attr, base, mod, note, damage, targetId, qualities, valuesX: valuesX ?? xValues, capacity, extensions });
    this.id = action.id;
    this.participantId = action.participantId;
    this.type = action.type;
    this.attr = action.attr;
    this.base = action.base;
    this.mod = action.mod;
    this.note = action.note;
    this.damage = action.damage;
    this.targetId = action.targetId;
    // Les alias (Impact/Percutante) ne doivent jamais activer deux fois le même moteur.
    this.qualities = action.qualities;
    this.valuesX = action.valuesX;
    this.capacity = action.capacity;
    this.extensions = action.extensions;
  }
}

export function groupProfiles(profiles) {
  const groups = new Map();
  const ungrouped = [];
  profiles.forEach(p => {
    if (p.group) {
      if (!groups.has(p.group)) groups.set(p.group, []);
      groups.get(p.group).push(p);
    } else {
      ungrouped.push(p);
    }
  });
  return { groups, ungrouped };
}
