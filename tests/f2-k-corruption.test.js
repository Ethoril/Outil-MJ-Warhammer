import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCorruptionAbsolution,
  calculateCorruptionThreshold,
  classifyCorruptionExposure,
  confirmCorruptionMutation,
  corruptionPointsFromTest,
  corruptionThresholdCheck,
  mutationDomainForSpecies,
  prepareCorruptionTest,
  resolveCorruptionExposure,
  resolveCorruptionThresholdTest,
  secretManifestationDelay
} from '../js/core/v5-corruption.js';

test('F2-K1 — exposure durations: contact and vicinity boundaries', () => {
  assert.equal(classifyCorruptionExposure({ contactTurns: 1 }), 'exposure');
  assert.equal(classifyCorruptionExposure({ vicinityHours: 1 }), 'exposure');
  assert.equal(classifyCorruptionExposure({ contactHours: 1 }), 'prolonged');
  assert.equal(classifyCorruptionExposure({ vicinityHours: 6 }), 'prolonged');
  assert.equal(classifyCorruptionExposure({ vicinityHours: 0.99 }), null);
  assert.equal(classifyCorruptionExposure({ vicinityHours: 5.99 }), 'exposure');
  assert.equal(classifyCorruptionExposure({ contactTurns: 0 }), null);
  assert.throws(() => classifyCorruptionExposure({ contactTurns: 0.5 }), /Tours de contact/);
});

test('F2-K1 — Corruption Test is GM-chosen Résistance or Calme at +0 DR', () => {
  assert.deepEqual(prepareCorruptionTest({ influence: 'minor', exposure: 'exposure', skillId: 'skill-52_e9_73_69_73_74_61_6e_63_65-base' }), {
    influence: 'minor', exposure: 'exposure', skillId: 'skill-52_e9_73_69_73_74_61_6e_63_65-base', skill: 'Résistance', difficultyDR: 0
  });
  assert.equal(prepareCorruptionTest({ influence: 'major', exposure: 'prolonged', skillId: 'skill-43_61_6c_6d_65-base' }).skill, 'Calme');
  assert.throws(() => prepareCorruptionTest({ influence: 'minor', exposure: 'exposure', skill: 'Résistance' }), /choisir Résistance ou Calme/);
  assert.throws(() => prepareCorruptionTest({ influence: 'minor', exposure: 'exposure', skillId: 'skill-52_e9_73_69_73_74_61_6e_63_65_20_e0_20_6c_27_61_6c_63_6f_6f_6c-base' }), /choisir Résistance ou Calme/);
});

test('F2-K1 — mineure : échec à −1 ou échec marginal à 0 donne 1, toute réussite 0', () => {
  assert.equal(corruptionPointsFromTest({ influence: 'minor', success: false, sl: -1 }), 1);
  assert.equal(corruptionPointsFromTest({ influence: 'minor', success: false, sl: 0 }), 1);
  assert.equal(corruptionPointsFromTest({ influence: 'minor', success: true, sl: 0 }), 0);
  assert.equal(corruptionPointsFromTest({ influence: 'minor', success: true, sl: 4 }), 0);
});

test('F2-K1 — modérée : échec 2, réussite marginale 1, réussite positive 0', () => {
  assert.equal(corruptionPointsFromTest({ influence: 'moderate', success: false, sl: -1 }), 2);
  assert.equal(corruptionPointsFromTest({ influence: 'moderate', success: false, sl: 0 }), 2);
  assert.equal(corruptionPointsFromTest({ influence: 'moderate', success: true, sl: 0 }), 1);
  assert.equal(corruptionPointsFromTest({ influence: 'moderate', success: true, sl: 1 }), 0);
});

test('F2-K1 — majeure : échec 3, +0 donne 2, +1–3 donne 1, +4 donne 0', () => {
  assert.equal(corruptionPointsFromTest({ influence: 'major', success: false, sl: -1 }), 3);
  assert.equal(corruptionPointsFromTest({ influence: 'major', success: false, sl: 0 }), 3);
  assert.equal(corruptionPointsFromTest({ influence: 'major', success: true, sl: 0 }), 2);
  for (const sl of [1, 3]) assert.equal(corruptionPointsFromTest({ influence: 'major', success: true, sl }), 1);
  assert.equal(corruptionPointsFromTest({ influence: 'major', success: true, sl: 4 }), 0);
});

test('F2-K1 — exposure result increments once and checks only when above threshold', () => {
  const exposure = resolveCorruptionExposure({ currentPoints: 5, threshold: 6, influence: 'moderate', exposure: 'prolonged', skillId: 'skill-43_61_6c_6d_65-base', success: false, sl: -1 });
  assert.deepEqual({ points: exposure.corruptionPoints, gained: exposure.gainedPoints, required: exposure.thresholdTestRequired }, { points: 7, gained: 2, required: true });
  assert.equal(resolveCorruptionExposure({ currentPoints: 5, threshold: 6, influence: 'minor', exposure: 'exposure', skillId: 'skill-52_e9_73_69_73_74_61_6e_63_65-base', success: true, sl: 0 }).thresholdTestRequired, false);
});

test('F2-K1 — seuil BE + BFM et Âme pure double le seuil', () => {
  assert.equal(calculateCorruptionThreshold({ toughnessBonus: 3, willpowerBonus: 4 }), 7);
  assert.equal(calculateCorruptionThreshold({ toughnessBonus: 3, willpowerBonus: 4, pureSoul: true }), 14);
  assert.equal(calculateCorruptionThreshold({ toughnessBonus: 2, willpowerBonus: 5 }), 7, 'seuil recalculé à partir des bonus actuels');
});

test('F2-K1 — un Test se déclenche à strictement plus que le seuil, y compris après report', () => {
  assert.deepEqual(corruptionThresholdCheck({ currentPoints: 6, gainedPoints: 0, threshold: 6 }), { totalPoints: 6, threshold: 6, required: false });
  assert.equal(corruptionThresholdCheck({ currentPoints: 6, gainedPoints: 1, threshold: 6 }).required, true);
  assert.equal(corruptionThresholdCheck({ currentPoints: 9, gainedPoints: 1, threshold: 6 }).required, true);
});

test('F2-K1 — Test réussi reporte la mutation au prochain gain', () => {
  assert.deepEqual(resolveCorruptionThresholdTest({ success: true, currentPoints: 8, willpowerBonus: 3, species: 'Humain', mutationDomainRoll: 1 }), {
    status: 'deferred', corruptionPoints: 8, mutation: null, characterLost: false
  });
});

test('F2-K1 — mutation physique/mentale aux bornes de la table par espèce', () => {
  assert.equal(mutationDomainForSpecies({ species: 'Humain', roll: 1 }).domain, 'physical');
  assert.equal(mutationDomainForSpecies({ species: 'Humain', roll: 50 }).domain, 'physical');
  assert.equal(mutationDomainForSpecies({ species: 'Humain', roll: 51 }).domain, 'mental');
  assert.equal(mutationDomainForSpecies({ species: 'Halfling', roll: 10 }).domain, 'physical');
  assert.equal(mutationDomainForSpecies({ species: 'Halfling', roll: 11 }).domain, 'mental');
  assert.equal(mutationDomainForSpecies({ species: 'Nain', roll: 5 }).domain, 'physical');
  assert.equal(mutationDomainForSpecies({ species: 'Nain', roll: 6 }).domain, 'mental');
  assert.equal(mutationDomainForSpecies({ species: 'Wood Elf', roll: 1 }).domain, 'mental');
  assert.equal(mutationDomainForSpecies({ species: 'High Elf', roll: 1 }).domain, 'mental');
  assert.equal(mutationDomainForSpecies({ species: 'Sea Elf', roll: 1 }).domain, 'mental');
  assert.equal(mutationDomainForSpecies({ species: 'Elfe', roll: 1 }).domain, 'mental');
  assert.equal(mutationDomainForSpecies({ species: 'Elfe', roll: 100 }).domain, 'mental');
  assert.equal(mutationDomainForSpecies({ species: 'Ogre' }).needsGmChoice, true);
  assert.equal(mutationDomainForSpecies({ species: 'Ogre', gmChoice: 'physical' }).domain, 'physical');
});

test('F2-K1 — mutation en attente ne retire les points ni ne modifie le compteur avant confirmation MJ', () => {
  const pending = resolveCorruptionThresholdTest({
    success: false, currentPoints: 12, willpowerBonus: 3, species: 'Humain', mutationDomainRoll: 50,
    physicalMutationCount: 0, mentalMutationCount: 0, toughnessBonus: 2
  });
  assert.equal(pending.status, 'mutation-pending');
  assert.equal(pending.corruptionPoints, 12);
  assert.equal(pending.pointsAfterMutationConfirmation, 9);
  assert.equal(pending.projectedPhysicalMutationCount, 1);
  assert.equal(pending.physicalMutationCount, 0);
  const authoritativeState = {
    corruptionPoints: 12, toughnessBonus: 2, willpowerBonus: 3, pureSoul: false,
    corruptionMutations: [], pendingCorruptionMutation: { id: 'occurrence-1', status: 'pending', domain: 'physical' }
  };
  assert.equal(confirmCorruptionMutation({ authoritativeState, confirmed: false }).status, 'declined');
  const confirmed = confirmCorruptionMutation({ authoritativeState, mutationId: 'chosen-row', confirmed: true });
  assert.equal(confirmed.corruptionPoints, 9);
  assert.equal(confirmed.physicalMutationCount, 1);
  assert.equal(confirmed.mutation.id, 'occurrence-1');
  assert.equal(confirmed.mutation.tableRowId, 'chosen-row');
});

test('F2-K1 — inconnu d’espèce reste un choix MJ, et perte de personnage reste à confirmer', () => {
  const unresolved = resolveCorruptionThresholdTest({ success: false, currentPoints: 4, willpowerBonus: 2, species: 'Ogre' });
  assert.equal(unresolved.status, 'needs-gm-choice');
  assert.equal(unresolved.corruptionPoints, 4);
  const pendingLoss = resolveCorruptionThresholdTest({
    success: false, currentPoints: 4, willpowerBonus: 2, species: 'Humain', mutationDomainRoll: 50,
    physicalMutationCount: 1, toughnessBonus: 1
  });
  assert.equal(pendingLoss.status, 'character-loss-pending');
  assert.equal(pendingLoss.characterLost, true);
  const confirmed = confirmCorruptionMutation({
    authoritativeState: {
      corruptionPoints: 4, toughnessBonus: 1, willpowerBonus: 2,
      corruptionMutations: [{ id: 'old', domain: 'physical' }],
      pendingCorruptionMutation: { id: 'occurrence-2', domain: 'physical', status: 'pending' }
    },
    mutationId: 'row', confirmed: true
  });
  assert.equal(confirmed.characterLoss, 'requires-gm-confirmation');
});

test('F2-K1 — confirmation ignores falsified projection counters and recomputes from authoritative state', () => {
  const projected = resolveCorruptionThresholdTest({
    success: false, currentPoints: 12, willpowerBonus: 3, species: 'Humain', mutationDomainRoll: 50,
    physicalMutationCount: 0, toughnessBonus: 2
  });
  const forgedPreview = { ...projected, corruptionPoints: 999, pointsAfterMutationConfirmation: 0, projectedPhysicalMutationCount: 99 };
  const authoritativeState = {
    corruptionPoints: 12, toughnessBonus: 2, willpowerBonus: 3, pureSoul: false,
    corruptionMutations: [], pendingCorruptionMutation: { id: 'occurrence-3', status: 'pending', domain: 'physical' }
  };
  const confirmed = confirmCorruptionMutation({ authoritativeState, proposal: forgedPreview, mutationId: 'row', confirmed: true });
  assert.equal(confirmed.corruptionPoints, 9);
  assert.equal(confirmed.physicalMutationCount, 1);
  assert.equal(confirmed.mutation.domain, 'physical');
});

test('F2-K1 — confirmation refuses stale or missing authoritative proposals', () => {
  assert.equal(confirmCorruptionMutation({
    authoritativeState: { corruptionPoints: 5, toughnessBonus: 2, willpowerBonus: 3, pendingCorruptionMutation: { id: 'stale', status: 'pending', domain: 'physical' } },
    mutationId: 'row', confirmed: true
  }).status, 'stale');
  assert.throws(() => confirmCorruptionMutation({ authoritativeState: { corruptionPoints: 12, toughnessBonus: 2, willpowerBonus: 3 }, mutationId: 'row', confirmed: true }), /Mutation en attente/);
});

test('F2-K1 — délai du MJ reste marqué privé et vaut 3d10 jours', () => {
  assert.deepEqual(secretManifestationDelay({ dice: [1, 5, 10] }), { days: 16, visibility: 'gm-only' });
  assert.throws(() => secretManifestationDelay({ dice: [0, 5, 10] }), /Trois résultats/);
});

test('F2-K1 — absolution reprend exactement montant et motif du MJ', () => {
  assert.deepEqual(applyCorruptionAbsolution({ currentPoints: 8, amount: 3, reason: 'Pèlerinage fixé par le MJ' }), {
    corruptionPoints: 5, absolution: { amount: 3, reason: 'Pèlerinage fixé par le MJ', decidedBy: 'gm' }
  });
  assert.throws(() => applyCorruptionAbsolution({ currentPoints: 2, amount: 3, reason: 'Purification' }), /ne peut pas retirer plus/);
  assert.throws(() => applyCorruptionAbsolution({ currentPoints: 2, amount: 1, reason: '' }), /Motif/);
});

test('F2-K1 — données invalides ne créent ni points ni mutation implicite', () => {
  assert.throws(() => corruptionPointsFromTest({ influence: 'unknown', success: false, sl: -1 }), /Influence/);
  assert.throws(() => calculateCorruptionThreshold({ toughnessBonus: -1, willpowerBonus: 2 }), /Bonus/);
  assert.throws(() => corruptionThresholdCheck({ currentPoints: 1, gainedPoints: -1, threshold: 1 }), /Gain/);
  assert.throws(() => confirmCorruptionMutation({ authoritativeState: {}, confirmed: true }), /Identifiant/);
});
