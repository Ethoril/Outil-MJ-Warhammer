/** Pure helpers for F2-K1 corruption adjudication (WFRP V5, pp. 187–189). */

const INFLUENCE_LEVELS = new Set(['minor', 'moderate', 'major']);
const CORRUPTION_TEST_SKILLS = Object.freeze({
  'skill-52_e9_73_69_73_74_61_6e_63_65-base': 'Résistance',
  'skill-43_61_6c_6d_65-base': 'Calme'
});
const nonNegativeInt = (value, label) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${label} doit être un entier positif ou nul`);
  return value;
};
const rollD100 = (value, label = 'Jet de percentile') => {
  if (!Number.isSafeInteger(value) || value < 1 || value > 100) throw new TypeError(`${label} doit être compris entre 1 et 100`);
  return value;
};
const corruptionPoints = value => nonNegativeInt(value, 'Points de Corruption');

/** Classify the duration of one declared source exposure; no source is inferred. */
export function classifyCorruptionExposure({ contactTurns = 0, contactHours = 0, vicinityHours = 0 } = {}) {
  if (!Number.isSafeInteger(contactTurns) || contactTurns < 0) throw new TypeError('Tours de contact doit être un entier positif ou nul');
  for (const [value, label] of [[contactTurns, 'Tours de contact'], [contactHours, 'Heures de contact'], [vicinityHours, 'Heures de proximité']]) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new TypeError(`${label} invalide`);
  }
  if (contactHours >= 1 || vicinityHours >= 6) return 'prolonged';
  if (contactTurns >= 1 || contactHours > 0 || vicinityHours >= 1) return 'exposure';
  return null;
}

/** An exposure is explicitly selected by the GM; the Test is always +0 DR. */
export function prepareCorruptionTest({ influence, skillId, exposure } = {}) {
  if (!INFLUENCE_LEVELS.has(influence)) throw new TypeError('Influence de Corruption inconnue');
  if (!['exposure', 'prolonged'].includes(exposure)) throw new TypeError('Exposition simple ou prolongée requise');
  const testSkill = CORRUPTION_TEST_SKILLS[skillId];
  if (!testSkill) throw new TypeError('Le MJ doit choisir Résistance ou Calme');
  return Object.freeze({ influence, skillId, skill: testSkill, exposure, difficultyDR: 0 });
}

/**
 * Calculate Points from an already-resolved Test. `success` is explicit because
 * V5 allows either a marginal success or marginal failure at 0 DR.
 */
export function corruptionPointsFromTest({ influence, success, sl } = {}) {
  if (!INFLUENCE_LEVELS.has(influence)) throw new TypeError('Influence de Corruption inconnue');
  if (typeof success !== 'boolean') throw new TypeError('Résultat réussi/échoué requis');
  if (!Number.isSafeInteger(sl)) throw new TypeError('DR du Test invalide');
  if (success && sl < 0) throw new TypeError('Un Test réussi ne peut pas avoir de DR négatifs');
  if (!success && sl > 0) throw new TypeError('Un Test échoué ne peut pas avoir de DR positifs');
  if (!success) return influence === 'minor' ? 1 : influence === 'moderate' ? 2 : 3;
  if (influence === 'minor') return 0;
  if (influence === 'moderate') return sl === 0 ? 1 : 0;
  return sl === 0 ? 2 : sl <= 3 ? 1 : 0;
}

/** Record one GM-selected session-end exposure/Test and calculate its point gain. */
export function resolveCorruptionExposure({
  currentPoints, threshold, influence, exposure, skillId, success, sl
} = {}) {
  corruptionPoints(currentPoints);
  nonNegativeInt(threshold, 'Seuil de Corruption');
  const test = prepareCorruptionTest({ influence, exposure, skillId });
  const gainedPoints = corruptionPointsFromTest({ influence, success, sl });
  const check = corruptionThresholdCheck({ currentPoints, gainedPoints, threshold });
  return Object.freeze({
    test, success, sl, gainedPoints, corruptionPoints: check.totalPoints,
    threshold, thresholdTestRequired: check.required
  });
}

export function calculateCorruptionThreshold({ toughnessBonus, willpowerBonus, pureSoul = false } = {}) {
  nonNegativeInt(toughnessBonus, 'Bonus d’Endurance');
  nonNegativeInt(willpowerBonus, 'Bonus de Force Mentale');
  if (typeof pureSoul !== 'boolean') throw new TypeError('Âme pure doit être un booléen');
  const base = toughnessBonus + willpowerBonus;
  const threshold = base * (pureSoul ? 2 : 1);
  if (!Number.isSafeInteger(threshold)) throw new TypeError('Seuil de Corruption invalide');
  return threshold;
}

/** The check is made on every positive gain while over threshold, not only at first crossing. */
export function corruptionThresholdCheck({ currentPoints, gainedPoints, threshold } = {}) {
  corruptionPoints(currentPoints);
  nonNegativeInt(gainedPoints, 'Gain de Corruption');
  nonNegativeInt(threshold, 'Seuil de Corruption');
  const totalPoints = currentPoints + gainedPoints;
  if (!Number.isSafeInteger(totalPoints)) throw new TypeError('Total de Corruption invalide');
  return Object.freeze({ totalPoints, threshold, required: gainedPoints > 0 && totalPoints > threshold });
}

const normalizeSpecies = value => {
  const species = typeof value === 'string' ? value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr') : '';
  if (['humain', 'human'].includes(species)) return 'human';
  if (['nain', 'dwarf'].includes(species)) return 'dwarf';
  if (['halfling', 'halfing'].includes(species)) return 'halfling';
  if (['elfe', 'elf', 'wood elf', 'high elf', 'sea elf', 'elfe sylvain', 'elfe haut', 'haut elfe', 'elfe marin', 'elfe des mers'].includes(species)) return 'elf';
  return null;
};
const PHYSICAL_MUTATION_MAX = Object.freeze({ human: 50, halfling: 10, dwarf: 5, elf: 0 });

/** p.188 species table. Unknown species deliberately leaves the choice to the GM. */
export function mutationDomainForSpecies({ species, roll, gmChoice } = {}) {
  const normalized = normalizeSpecies(species);
  if (!normalized) {
    if (gmChoice === 'physical' || gmChoice === 'mental') return Object.freeze({ domain: gmChoice, needsGmChoice: false, selectedBy: 'gm' });
    return Object.freeze({ domain: null, needsGmChoice: true });
  }
  rollD100(roll, 'Jet de manifestation physique/mentale');
  return Object.freeze({ domain: roll <= PHYSICAL_MUTATION_MAX[normalized] ? 'physical' : 'mental', needsGmChoice: false });
}

/** Resolve an over-threshold Test; mutation effects remain pending GM approval. */
export function resolveCorruptionThresholdTest({
  success, currentPoints, willpowerBonus, willpowerBonusForLimit = willpowerBonus,
  species, mutationDomainRoll, gmChosenDomain, physicalMutationCount = 0, mentalMutationCount = 0,
  toughnessBonus = 0
} = {}) {
  if (typeof success !== 'boolean') throw new TypeError('Résultat du Test de Corruption requis');
  corruptionPoints(currentPoints);
  nonNegativeInt(willpowerBonus, 'Bonus de Force Mentale');
  nonNegativeInt(willpowerBonusForLimit, 'Bonus de Force Mentale');
  nonNegativeInt(toughnessBonus, 'Bonus d’Endurance');
  nonNegativeInt(physicalMutationCount, 'Nombre de mutations physiques');
  nonNegativeInt(mentalMutationCount, 'Nombre de mutations mentales');
  if (success) return Object.freeze({ status: 'deferred', corruptionPoints: currentPoints, mutation: null, characterLost: false });

  const selected = mutationDomainForSpecies({ species, roll: mutationDomainRoll, gmChoice: gmChosenDomain });
  if (selected.needsGmChoice) return Object.freeze({
    status: 'needs-gm-choice', corruptionPoints: currentPoints, mutation: null,
    pointsAfterMutationConfirmation: Math.max(0, currentPoints - willpowerBonus),
    characterLost: false, pendingDomainSelection: true
  });
  const nextPhysical = physicalMutationCount + Number(selected.domain === 'physical');
  const nextMental = mentalMutationCount + Number(selected.domain === 'mental');
  const characterLost = nextPhysical > toughnessBonus || nextMental > willpowerBonusForLimit;
  return Object.freeze({
    status: characterLost ? 'character-loss-pending' : 'mutation-pending',
    corruptionPoints: currentPoints,
    pointsAfterMutationConfirmation: Math.max(0, currentPoints - willpowerBonus),
    mutation: Object.freeze({ domain: selected.domain, status: 'pending-gm-confirmation' }),
    physicalMutationCount, mentalMutationCount,
    projectedPhysicalMutationCount: nextPhysical, projectedMentalMutationCount: nextMental,
    characterLost, requiresGmConfirmation: true,
    ...(selected.selectedBy ? { domainSelectedBy: selected.selectedBy } : {})
  });
}

/** GM rolls privately; only the returned GM-only field contains the exact delay. */
export function secretManifestationDelay({ dice } = {}) {
  if (!Array.isArray(dice) || dice.length !== 3 || dice.some(value => !Number.isSafeInteger(value) || value < 1 || value > 10)) {
    throw new TypeError('Trois résultats de d10 (1–10) du MJ sont requis');
  }
  return Object.freeze({ days: dice.reduce((sum, die) => sum + die, 0), visibility: 'gm-only' });
}

/** An absolution is a GM-declared point amount and reason, never inferred. */
export function applyCorruptionAbsolution({ currentPoints, amount, reason } = {}) {
  corruptionPoints(currentPoints);
  nonNegativeInt(amount, 'Montant de l’absolution');
  if (amount > currentPoints) throw new RangeError('L’absolution ne peut pas retirer plus de Points de Corruption que le total');
  if (typeof reason !== 'string' || !reason.trim()) throw new TypeError('Motif de l’absolution fixé par le MJ requis');
  return Object.freeze({ corruptionPoints: currentPoints - amount, absolution: Object.freeze({ amount, reason: reason.trim(), decidedBy: 'gm' }) });
}

/**
 * Commit against a fresh authoritative Store snapshot, never against the preview
 * projection. The caller must load this snapshot from Store immediately before
 * confirmation. Confirmed mutations are counted from durable mutation records.
 */
export function confirmCorruptionMutation({ authoritativeState, mutationId, confirmed } = {}) {
  if (!authoritativeState || typeof authoritativeState !== 'object') throw new TypeError('État faisant autorité requis');
  if (typeof confirmed !== 'boolean') throw new TypeError('Confirmation explicite du MJ requise');
  if (!confirmed) return Object.freeze({ status: 'declined', mutation: null });
  if (typeof mutationId !== 'string' || !mutationId.trim()) throw new TypeError('Identifiant de mutation sélectionné par le MJ requis');
  const pending = authoritativeState.pendingCorruptionMutation;
  if (!pending || pending.status !== 'pending' || typeof pending.id !== 'string' || !pending.id.trim() || !['physical', 'mental'].includes(pending.domain)) throw new TypeError('Mutation en attente absente de l’état faisant autorité');
  const points = corruptionPoints(authoritativeState.corruptionPoints);
  const toughnessBonus = nonNegativeInt(authoritativeState.toughnessBonus, 'Bonus d’Endurance');
  const willpowerBonus = nonNegativeInt(authoritativeState.willpowerBonus, 'Bonus de Force Mentale');
  const threshold = calculateCorruptionThreshold({ toughnessBonus, willpowerBonus, pureSoul: authoritativeState.pureSoul === true });
  if (points <= threshold) return Object.freeze({ status: 'stale', reason: 'threshold-no-longer-exceeded' });
  const records = Array.isArray(authoritativeState.corruptionMutations) ? authoritativeState.corruptionMutations : [];
  if (records.some(record => !record || !['physical', 'mental'].includes(record.domain))) throw new TypeError('Registre des mutations faisant autorité invalide');
  const physicalMutationCount = records.filter(record => record?.domain === 'physical').length;
  const mentalMutationCount = records.filter(record => record?.domain === 'mental').length;
  const mutation = Object.freeze({ id: pending.id, tableRowId: mutationId.trim(), domain: pending.domain, status: 'confirmed' });
  const nextRecords = [...records, mutation];
  const nextPhysical = physicalMutationCount + Number(pending.domain === 'physical');
  const nextMental = mentalMutationCount + Number(pending.domain === 'mental');
  const characterLost = nextPhysical > toughnessBonus || nextMental > willpowerBonus;
  return Object.freeze({
    status: characterLost ? 'confirmed-character-loss-pending' : 'confirmed',
    corruptionPoints: Math.max(0, points - willpowerBonus),
    physicalMutationCount: nextPhysical, mentalMutationCount: nextMental,
    corruptionMutations: nextRecords, mutation,
    characterLoss: characterLost ? 'requires-gm-confirmation' : null
  });
}
