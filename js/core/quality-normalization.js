/** Canonical quality/alias handling for E06, before any mechanical engine. */
import { getKeywordBySlug, slugify } from './keywords.js';
import { ENGINES } from '../data/keyword-engines.js';

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

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

function rawQualityId(quality) {
  if (typeof quality === 'string') return quality;
  if (isRecord(quality)) return quality.id || quality.name || '';
  return '';
}

/** Resolve aliasOf chains from the local mechanical registry. */
export function canonicalQualityId(quality, registry = ENGINES) {
  let id = getKeywordBySlug(rawQualityId(quality))?.id || slugify(rawQualityId(quality));
  const seen = new Set();
  while (id && registry[id]?.aliasOf && !seen.has(id)) {
    seen.add(id);
    id = slugify(registry[id].aliasOf);
  }
  return id;
}

/**
 * Clone qualities, map aliases to one canonical id and retain the first
 * occurrence. Unknown editorial labels remain visible but have no engine.
 */
export function normalizeQualities(qualities = [], { registry = ENGINES } = {}) {
  if (!Array.isArray(qualities)) return [];
  const seen = new Set();
  const out = [];
  for (const quality of qualities) {
    const id = canonicalQualityId(quality, registry);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const item = isRecord(quality) ? clone(quality) : {};
    safeSet(item, 'id', id);
    out.push(item);
  }
  return out;
}

export const dedupeQualities = normalizeQualities;

/** Qualité du registre des mots-clés ou dotée d'un moteur local ; sinon elle est signalée « inconnue » à l'import. */
export function isKnownQuality(quality, registry = ENGINES) {
  const id = canonicalQualityId(quality, registry);
  return Boolean(id) && (Object.hasOwn(registry, id) || Boolean(getKeywordBySlug(id)));
}

/** Libellé affichable d'une qualité (« Percutante ») : nom du registre de mots-clés, sinon le texte saisi. Un mot-clé à X montre sa valeur (« Recharge 2 »). */
export function qualityLabel(quality, registry = ENGINES) {
  const id = canonicalQualityId(quality, registry);
  const name = (id && getKeywordBySlug(id)?.name) || (isRecord(quality) ? quality.name : '') || rawQualityId(quality) || id;
  const parameter = isRecord(quality) ? (quality.parameter ?? quality.rating) : null;
  const text = parameter !== null && parameter !== undefined && parameter !== '' && /\sX$/i.test(name || '') ? name.replace(/\sX$/i, ` ${String(parameter)}`) : name;
  return text ? text.charAt(0).toLocaleUpperCase('fr-FR') + text.slice(1) : '';
}
