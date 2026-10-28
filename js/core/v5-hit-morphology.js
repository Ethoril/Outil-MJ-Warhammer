/** Hit location variants for creature morphologies (WFRP V5, p. 318). */
const MORPHOLOGY_ALIASES = new Map([
  ['quadruped', 'quadruped'], ['quadrupede', 'quadruped'], ['quadrupède', 'quadruped'],
  ['bird', 'bird'], ['oiseau', 'bird'], ['oiseaux', 'bird'],
  ['snake', 'snake'], ['serpent', 'snake'], ['serpents', 'snake'],
  ['spider', 'spider'], ['araignee', 'spider'], ['araignée', 'spider'], ['araignées', 'spider'],
  ['humanoid', 'humanoid'], ['humanoïde', 'humanoid'], ['humain', 'humanoid']
]);

const sideOf = name => /gauche|left/i.test(name) ? 'left' : /droit|right/i.test(name) ? 'right' : null;

export function normalizeHitMorphology(value) {
  if (typeof value !== 'string') return null;
  return MORPHOLOGY_ALIASES.get(value.trim().toLocaleLowerCase('fr')) || null;
}

/**
 * Remap the ordinary humanoid location after the roll has been reversed.
 * `baseLocation` is the existing getLocationName result. A null or unknown
 * morphology deliberately preserves that result exactly.
 */
export function resolveCreatureHitLocation({ roll, morphology, baseLocation } = {}) {
  const type = normalizeHitMorphology(morphology);
  if (!type || !baseLocation) return baseLocation || null;
  const locationRoll = Number(roll);

  if (type === 'snake') {
    if (!Number.isFinite(locationRoll) || locationRoll < 1 || locationRoll > 100) return baseLocation;
    return locationRoll <= 19
      ? { ...baseLocation, key: 'HEAD', name: 'Tête', side: null }
      : { ...baseLocation, key: 'BODY', name: 'Corps', side: null };
  }
  if (type === 'spider') {
    if (!Number.isFinite(locationRoll) || locationRoll < 1 || locationRoll > 100) return baseLocation;
    if (locationRoll <= 9) return { ...baseLocation, key: 'HEAD', name: 'Tête', side: null };
    if (locationRoll <= 79) return { ...baseLocation, key: 'ARM', name: 'Pattes', side: null };
    return { ...baseLocation, key: 'BODY', name: 'Corps', side: null };
  }
  if (type === 'quadruped' && baseLocation.key === 'ARM') {
    return { ...baseLocation, name: `Patte avant ${sideOf(baseLocation.name) === 'left' ? 'gauche' : 'droite'}` };
  }
  if (type === 'quadruped' && baseLocation.key === 'LEG') {
    return { ...baseLocation, name: `Patte arrière ${sideOf(baseLocation.name) === 'left' ? 'gauche' : 'droite'}` };
  }
  if (type === 'bird' && baseLocation.key === 'ARM') {
    return { ...baseLocation, name: `Aile ${sideOf(baseLocation.name) === 'left' ? 'gauche' : 'droite'}` };
  }
  return baseLocation;
}

/** An appendage without its own critical table uses the Arm critical table. */
export function appendageCriticalLocation(location, appendage) {
  if (!location || typeof appendage !== 'string' || !appendage.trim()) return location || null;
  return { ...location, key: 'ARM', name: appendage.trim(), appendageCriticalTable: 'ARM' };
}
