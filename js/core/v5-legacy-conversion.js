const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Convert an explicitly marked V4 profile once, preserving its original fields for reference. */
export function convertLegacyV4Profile(profile) {
  if (!isRecord(profile)) throw new TypeError('Profil requis');
  const legacy = profile.extensions?.v4;
  if (!isRecord(legacy) || profile.extensions?.legacyConversions?.v4ToV5 === true) return structuredClone(profile);
  const integer = (value, label) => {
    if (value === undefined || value === null || value === '') return null;
    if (!Number.isSafeInteger(Number(value))) throw new TypeError(`${label} invalide`);
    return Number(value);
  };
  const momentum = integer(legacy.advantage, 'Avantage'), fate = integer(legacy.resilience, 'Résilience'),
    fortune = integer(legacy.determination, 'Détermination'), difficulty = integer(legacy.difficulty, 'Difficulté');
  if ([momentum, fate, fortune].some(value => value !== null && value < 0)) throw new TypeError('Ressource V4 négative');
  const next = structuredClone(profile), extensions = next.extensions || {};
  const v5 = { ...(extensions.v5 || {}) };
  if (momentum !== null) v5.hasMomentum = momentum > 0;
  if (fate !== null) v5.fate = fate;
  if (fortune !== null) v5.resources = { ...(v5.resources || {}), fortune };
  if (difficulty !== null) v5.difficultySL = Math.trunc(difficulty / 10);
  next.extensions = { ...extensions, v5, legacyConversions: { ...(extensions.legacyConversions || {}), v4ToV5: true } };
  return next;
}
