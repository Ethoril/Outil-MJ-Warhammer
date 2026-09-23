/** Canonical quality/alias handling for E06, before any mechanical engine. */
import { slugify } from './keywords.js';
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
  let id = slugify(rawQualityId(quality));
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
