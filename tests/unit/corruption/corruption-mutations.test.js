import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { mutationDomainForSpecies, applyCorruptionAbsolution, calculateCorruptionThreshold, classifyCorruptionExposure, confirmCorruptionMutation, corruptionPointsFromTest, corruptionThresholdCheck, prepareCorruptionTest, resolveCorruptionExposure, resolveCorruptionThresholdTest, secretManifestationDelay } from '../../../js/core/v5-corruption.js';
import { V5_L23_MUTATION_TABLES, V5_L23_MUTATION_COUNT } from '../../../js/data/v5-corruption-mutations-l23.js';
import { V5_L17_ARCANE_MARKS, V5_L17_ARCANE_MARKS_COUNT, V5_L17_SOURCE_INCOMPLETE_IDS } from '../../../js/data/v5-corruption-mutations-l17.js';
import { V5_L23_AUDIT_PROVENANCE } from '../../../js/data/v5-corruption-mutations-l23-audit.js';
import { L06_CORRUPTION_MUTATION_TABLES as catalogue } from '../../../js/core/v5-corruption-mutations-l06.js';
import { createV5CorruptionPanel } from '../../../js/ui/v5-corruption-panel.js';
import { buildParticipantFromBestiary } from '../../../js/core/bestiary-profiles.js';
import l11 from '../../../js/data/bestiary/L11.json' with { type: 'json' };
import { V5_CORRUPTION_MUTATION_CATALOG, resolveCorruptionMutationSelection } from '../../../js/core/v5-corruption-mutation-catalog.js';

describe('Claude T3 monture et manifestation mutations', () => {
// Contre-vérification T3 (Claude) : monture envoyée au banc par déplacement, espèces écrites
// par les fiches dans la table de manifestation, page des Fixations L23.

const memory = () => { let saved; return { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } }; };
const actor = id => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', size: 'average', hp: 20, maxHp: 20,
  caracs: { CC: 60, F: 40, E: 40, I: 40, Ag: 40, FM: 30 }, skills: [], talents: [], states: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });
const horse = id => ({ ...actor(id), kind: 'Créature', size: 'large', caracs: { F: 50, E: 40, CC: 40, Ag: 30 } });

for (const persisted of [true, false]) {
  test(`Claude T3 — une monture déplacée au banc libère son cavalier (${persisted ? 'avec' : 'sans'} persistance)`, async () => {
    const store = createStore({ storage: null, ...(persisted ? { persistence: memory() } : {}) }); await store.ready;
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'x', turnIndex: 1 } },
      combat: { round: 1, currentActorId: 'rider', order: ['rider', 'horse'], participants: [actor('rider'), horse('horse')] } });
    await store.setMountedState('rider', { mounted: true, mountId: 'horse' });
    await store.moveParticipant('horse', 'bench');
    const rider = store.listParticipants().find(row => row.id === 'rider');
    assert.notEqual(rider.extensions.v5.mounted, true);
    assert.equal(rider.extensions.v5.mountId, undefined);
  });
}

test('Claude T3 — les espèces écrites par les fiches suivent la table de manifestation (L06 p.188)', () => {
  assert.equal(mutationDomainForSpecies({ species: 'halfelin', roll: 5 }).domain, 'physical');
  assert.equal(mutationDomainForSpecies({ species: 'elfe-sylvain', roll: 5 }).domain, 'mental');
  assert.equal(mutationDomainForSpecies({ species: 'haut-elfe', roll: 5 }).domain, 'mental');
  assert.notEqual(mutationDomainForSpecies({ species: 'elfe-sylvain', roll: 5 }).needsGmChoice, true);
});

test('Claude T3 — les Fixations L23 sont page 69 imprimée (PDF 71), comme les Têtes bestiales', () => {
  const fixations = V5_L23_MUTATION_TABLES.find(table => table.id === 'l23-fixations');
  assert.equal(fixations.source.pageImprimee, 69);
  assert.equal(fixations.source.pagePdf, 71);
  for (const entry of fixations.entrees) assert.equal(entry.verification.pagePdf, 71, entry.id);
});
});

describe('Caracterisation corruption et mutations', () => {
const clone = structuredClone;
const participant = (id, extra = {}) => ({ id, name: id, zone: 'active', hp: 12, maxHp: 12, states: [], ...extra });
const envelope = participants => ({
  schemaVersion: 3, reserve: [], combat: { round: 0, order: [], participants }, log: [], diceLines: []
});

function memoryPersistence() {
  let saved = null;
  return {
    async load() { return saved && clone(saved); },
    async saveAtomic({ state }) { saved = clone(state); return { ok: true }; }
  };
}

async function fixture(participants) {
  const persistence = memoryPersistence();
  const store = createStore({ storage: null, persistence });
  await store.ready;
  await store.loadFromJSON(envelope(participants));
  return { store, persistence };
}
const get = (store, id) => store.listParticipants().find(item => item.id === id);

test('F2-K characterization — Store preserves known Corruption and does not invent a zero for an unknown balance', async () => {
  const { store, persistence } = await fixture([
    participant('known', { extensions: { v5: { corruptionPoints: 7 } } }),
    participant('unknown')
  ]);
  assert.equal(get(store, 'known').extensions.v5.corruptionPoints, 7);
  assert.equal(get(store, 'unknown').extensions?.v5?.corruptionPoints, undefined);
  const reloaded = createStore({ storage: null, persistence });
  await reloaded.ready;
  assert.equal(get(reloaded, 'known').extensions.v5.corruptionPoints, 7);
  assert.equal(get(reloaded, 'unknown').extensions?.v5?.corruptionPoints, undefined);
});

test('F2-K characterization — participant extension edits are atomic, undoable, redoable, and durable', async () => {
  const beforeV5 = {
    corruptionPoints: 8,
    corruptionMutations: [{ id: 'mutation-1', tableRowId: 'L06-P-01', domain: 'physical', status: 'confirmed' }],
    pendingCorruptionMutation: null,
    unrelated: { keep: true }
  };
  const { store, persistence } = await fixture([
    participant('hero', { extensions: { v5: beforeV5 } })
  ]);
  const afterV5 = {
    ...clone(beforeV5), corruptionPoints: 11,
    pendingCorruptionMutation: { id: 'pending-2', status: 'pending', domain: 'mental' }
  };
  await store.updateParticipant('hero', { extensions: { v5: afterV5 } });
  assert.deepEqual(get(store, 'hero').extensions.v5, afterV5);

  await store.undo();
  assert.deepEqual(get(store, 'hero').extensions.v5, beforeV5);
  await store.redo();
  assert.deepEqual(get(store, 'hero').extensions.v5, afterV5);

  const reloaded = createStore({ storage: null, persistence });
  await reloaded.ready;
  assert.deepEqual(get(reloaded, 'hero').extensions.v5, afterV5);
});
});

describe('Regles de corruption', () => {
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
});

describe('Mutations L17', () => {
test('F2-K2 L17 — eight printed d10 tables contain 80 uniquely identified marks', () => {
  assert.equal(V5_L17_ARCANE_MARKS.length, 8);
  assert.equal(V5_L17_ARCANE_MARKS_COUNT, 80);
  assert.deepEqual(V5_L17_ARCANE_MARKS.map(table => table.id), [
    'l17-marks-hysh', 'l17-marks-chamon', 'l17-marks-ghyran', 'l17-marks-azyr',
    'l17-marks-ulgu', 'l17-marks-shyish', 'l17-marks-aqshy', 'l17-marks-ghur'
  ]);
  const ids = V5_L17_ARCANE_MARKS.flatMap(table => table.entrees.map(entry => entry.id));
  assert.equal(new Set(ids).size, 80);
});

test('F2-K2 L17 — every d10 result is covered exactly once with source pages and no inferred mechanics', () => {
  for (const table of V5_L17_ARCANE_MARKS) {
    assert.equal(table.selection.type, 'd10');
    assert.equal(table.entrees.length, 10);
    assert.deepEqual(table.entrees.map(entry => [entry.selection.min, entry.selection.max]),
      Array.from({ length: 10 }, (_, index) => [index + 1, index + 1]));
    for (const entry of table.entrees) {
      assert.ok(entry.nom);
      assert.ok(entry.resume);
      assert.equal(entry.source.livre, 'L17 — Winds of Magic');
      assert.equal(entry.source.pageImprimee, table.source.pageImprimee);
      assert.equal(entry.source.pagePdf, table.source.pagePdf);
      assert.equal(entry.source.referenceFamilleF2, 'F-L17-0078');
      assert.equal(entry.statutMecanique, 'assiste');
      assert.deepEqual(entry.effets, []);
      assert.equal(entry.conversion.editionSource, 'V4');
      assert.equal(entry.conversion.statut, 'assiste');
      assert.deepEqual(entry.verification, { controleur: 'review_l17_final', date: '2026-10-28', pagePdf: table.source.pagePdf, statut: 'relue-indépendamment', observations: 'Ligne contrôlée dans la table complète; corrections ciblées finales comprises.' });
    }
  }
});

test('F2-K2 L17 — flagged source details, conversion proposals, and assisted questions retain their limits', () => {
  const row = (wind, result) => V5_L17_ARCANE_MARKS.find(table => table.id === `l17-marks-${wind.toLowerCase()}`).entrees[result - 1];
  const includes = (wind, result, ...fragments) => {
    const entry = row(wind, result);
    for (const fragment of fragments) assert.ok(entry.resume.includes(fragment), `${wind} ${result}: ${fragment}`);
    assert.equal(entry.conversion.statut, 'assiste');
    assert.ok(entry.conversion.valeurV5.includes(entry.resume));
    assert.ok(entry.conversion.justification.length > 20);
    assert.ok(entry.questionsMJ[0].includes(entry.nom));
  };
  includes('Hysh', 2, '20 m', '+2 m');
  includes('Hysh', 3, '2 m', 'ajoute 2 m');
  includes('Hysh', 5, '−10');
  includes('Hysh', 6, '3 Aveuglé', '−1 DR');
  includes('Hysh', 8, '+1 DR');
  includes('Hysh', 9, '−2 DR', '2d10 jours', '+1 DR');
  assert.ok(row('Hysh', 9).conversion.valeurSource.includes('−20'));
  assert.ok(row('Hysh', 3).resume.includes('presque impossibles à dissimuler'));
  assert.ok(row('Hysh', 3).conversion.valeurSource.includes('nearly impossible to conceal'));
  includes('Chamon', 2, '−2 DR');
  includes('Chamon', 3, '−1 DR');
  includes('Chamon', 5, '−1 DR');
  includes('Chamon', 7, '3 Aveuglé', '−1 DR');
  includes('Ghyran', 2, '−2 DR');
  includes('Ghyran', 3, '+6 DR');
  assert.ok(row('Ghyran', 3).conversion.valeurSource.includes('+60'));
  includes('Ghyran', 1, 'taillés chaque jour', 'repoussent dans la journée');
  assert.ok(row('Ghyran', 1).conversion.valeurSource.includes('Trim each day'));
  includes('Ghyran', 6, 'augmentent de 1');
  includes('Ghyran', 7, '10 m', 'doublées');
  includes('Ghyran', 8, '+1 DR');
  includes('Ghyran', 5, 'tous les tests fondés sur la Sociabilité');
  assert.ok(row('Ghyran', 5).conversion.valeurSource.includes('all Fellowship-based Tests'));
  includes('Azyr', 1, 'Sous stress', '3 DR ou plus');
  includes('Azyr', 2, '−1 DR');
  includes('Azyr', 3, '+2 DR', 'Ouïe');
  assert.ok(row('Azyr', 3).conversion.valeurSource.includes('+20'));
  includes('Azyr', 4, '10 %', '−5 en Force');
  includes('Azyr', 6, '−1 DR');
  includes('Azyr', 8, '−2 DR');
  assert.ok(row('Azyr', 8).conversion.valeurSource.includes('Hard (−20)'));
  assert.ok(row('Azyr', 8).resume.includes('−2 DR'));
  includes('Azyr', 9, 'une heure', '−3 DR');
  assert.ok(row('Azyr', 9).conversion.valeurSource.includes('−30'));
  includes('Azyr', 7, 'Initiative −5');
  assert.ok(row('Azyr', 7).conversion.valeurSource.includes('−5 Initiative'));
  includes('Ulgu', 1, '−1 DR');
  includes('Ulgu', 2, '+1 DR', '−1 DR');
  includes('Ulgu', 4, '−1 DR');
  includes('Ulgu', 5, 'Vision nocturne', '−1 DR');
  includes('Ulgu', 6, '−1 DR', 'Menacing');
  includes('Ulgu', 8, '−1 DR', '20 m');
  assert.ok(row('Ulgu', 8).conversion.valeurSource.includes('−10'));
  includes('Ulgu', 9, 'Ward (9)', 'bonus de Force Mentale');
  includes('Shyish', 1, 'Force −5');
  includes('Shyish', 2, '−1 DR');
  includes('Shyish', 3, 'contact tactile −1 DR');
  includes('Shyish', 5, '−1 DR');
  includes('Shyish', 6, 'charognards', '−1 DR');
  assert.ok(row('Shyish', 6).resume.includes('charognards plus gros et agressifs'));
  assert.ok(row('Shyish', 6).conversion.valeurV5.includes('charognards plus gros et agressifs'));
  assert.ok(row('Shyish', 6).resume.includes('si le personnage est à proximité'));
  assert.ok(row('Shyish', 6).conversion.valeurV5.includes('si le personnage est à proximité'));
  assert.ok(!row('Shyish', 6).resume.includes('prédateurs'));
  assert.ok(row('Shyish', 6).conversion.valeurSource.includes('larger, more aggressive scavengers'));
  assert.ok(!row('Shyish', 6).conversion.valeurSource.includes('predators'));
  includes('Shyish', 8, 'un Fumble entraîne une Exposition modérée');
  assert.ok(row('Shyish', 8).resume.includes('choisissant de se concentrer'));
  assert.ok(row('Shyish', 8).resume.includes('Normal (Challenging, +0 DR)'));
  assert.ok(row('Shyish', 8).resume.includes('Fumble'));
  assert.ok(row('Shyish', 8).conversion.valeurV5.includes('Normal (Challenging, +0 DR)'));
  assert.ok(row('Shyish', 8).conversion.valeurSource.includes('Challenging (+0)'));
  assert.ok(row('Shyish', 8).conversion.valeurSource.includes('Moderate Exposure'));
  assert.ok(row('Shyish', 8).conversion.valeurSource.includes('Fumble causes Moderate Exposure'));
  includes('Shyish', 9, 'Taille Petite ou plus', '1 Blessure');
  includes('Shyish', 4, 'rayon égal à sa Force Mentale en mètres', 'trois quarts');
  assert.ok(row('Shyish', 4).conversion.valeurSource.includes('Willpower yards'));
  includes('Aqshy', 3, '+2 DR');
  includes('Aqshy', 4, 'Exposition au froid');
  includes('Aqshy', 5, '+2 DR');
  includes('Aqshy', 6, 'une heure', '−3 DR');
  assert.ok(row('Aqshy', 6).conversion.valeurSource.includes('−30'));
  includes('Aqshy', 7, '−1 DR');
  includes('Aqshy', 8, '4 m', 'augmentent de 1');
  includes('Aqshy', 9, 'feu', 'souffles');
  includes('Aqshy', 1, 'forme de flammes', 'chaleur et lumière réelles', 'sans le blesser');
  assert.ok(row('Aqshy', 1).conversion.formulationSource.includes('flame-shaped'));
  includes('Ghur', 1, 'attaques de mêlée de loups, ours, sangliers et rats', 'critiques de tête');
  assert.ok(row('Ghur', 1).conversion.valeurV5.includes('attaques de mêlée'));
  assert.ok(row('Ghur', 1).conversion.valeurSource.includes('Melee attacks'));
  assert.ok(row('Ghur', 1).conversion.valeurSource.includes('wolves, bears, boars, or rats'));
  assert.ok(row('Ghur', 1).conversion.formulationSource.includes('melee attacks'));
  includes('Ghur', 2, '+4 DR');
  assert.ok(row('Ghur', 2).conversion.valeurSource.includes('+40'));
  includes('Ghur', 3, 'espace clos', 'grande ville');
  includes('Ghur', 5, 'Endurance', 'Froid');
  includes('Ghur', 6, '−1 DR');
  includes('Ghur', 7, '−1 DR', '5 m');
  includes('Ghur', 8, '+1 DR');
  includes('Ghur', 9, 'fumble de Sociabilité', '20 m');
});

test('F2-K2 L17 — individual F2 references are separated from ambiguous family reference', () => {
  const lookup = (wind, result) => V5_L17_ARCANE_MARKS.find(table => table.id === `l17-marks-${wind.toLowerCase()}`).entrees[result - 1];
  assert.equal(lookup('Hysh', 3).source.referenceF2, 'F-L17-0082');
  assert.equal(lookup('Chamon', 6).source.referenceF2, 'F-L17-0094');
  assert.equal(lookup('Ghyran', 1).source.referenceF2, null);
  assert.equal(lookup('Azyr', 7).source.referenceF2, 'F-L17-0116');
  assert.equal(lookup('Shyish', 4).source.referenceF2, 'F-L17-0135');
  assert.equal(lookup('Aqshy', 1).source.referenceF2, 'F-L17-0145');
  assert.equal(lookup('Aqshy', 3).source.referenceF2, 'F-L17-0153');
  for (const table of V5_L17_ARCANE_MARKS) assert.equal(table.source.referenceFamilleF2, 'F-L17-0078');
});

test('F2-K2 L17 — every source formulation and value is separately captured from the PDF', () => {
  const allEntries = V5_L17_ARCANE_MARKS.flatMap(table => table.entrees);
  const captured = allEntries.filter(entry => entry.conversion.captureSourceStatut === 'capturée-depuis-pdf');
  assert.equal(captured.length, 80);
  assert.deepEqual(V5_L17_SOURCE_INCOMPLETE_IDS, []);
  for (const entry of captured) {
    assert.ok(entry.conversion.valeurSource);
    assert.ok(entry.conversion.formulationSource);
    assert.ok(entry.conversion.valeurV5);
    assert.notEqual(entry.conversion.formulationSource, entry.conversion.valeurV5);
    assert.ok(entry.conversion.noteValeurSource.includes('table PDF'));
  }
  for (const entry of allEntries.filter(item => item.conversion.captureSourceStatut !== 'capturée-depuis-pdf')) {
    assert.equal(entry.conversion.valeurSource, null);
    assert.ok(entry.conversion.noteValeurSource.includes('incomplète') || entry.conversion.noteValeurSource.includes('non isolée'));
  }
});
});

describe('Mutations L23', () => {
const powers = ['any', 'khorne', 'nurgle', 'slaanesh', 'tzeentch'];
const ordered = band => {
  const parts = band.split('-').map(Number);
  const [a, b] = parts.length === 1 ? [parts[0], parts[0]] : parts;
  const from = a === 0 ? 100 : a;
  const to = b === 0 ? 100 : b;
  return Array.from({ length: (to - from + 100) % 100 + 1 }, (_, i) => (from + i) % 100 || 100);
};

test('F2-K2 L23 — transcription has 125 uniquely identified rows and preserves referenced tables', () => {
  assert.equal(V5_L23_MUTATION_COUNT, 125);
  assert.deepEqual(V5_L23_MUTATION_TABLES.map(t => [t.id, t.entrees.length]), [
    ['l23-physical', 62], ['l23-beast-head', 10], ['l23-mental', 34], ['l23-fixations', 19]
  ]);
  const ids = V5_L23_MUTATION_TABLES.flatMap(t => t.entrees.map(e => e.id));
  assert.equal(new Set(ids).size, 125);
  assert.equal(V5_L23_MUTATION_TABLES[1].selection.renvoiDepuis, 'l23-physical:Beast Head');
  assert.deepEqual(V5_L23_MUTATION_TABLES[3].selection.renvoiDepuis, ['Fitful Hatred', 'Terrible Phobia']);
  const physical = V5_L23_MUTATION_TABLES[0].entrees;
  assert.equal(physical[0].source.referenceF2, 'F-L23-0138');
  assert.equal(physical.at(-1).source.referenceF2, 'F-L23-0201');
  assert.deepEqual(physical[29].source.referencesF2, ['F-L23-0167', 'F-L23-0168']);
  assert.deepEqual(physical[44].source.referencesF2, ['F-L23-0183', 'F-L23-0184']);
  assert.equal(V5_L23_MUTATION_TABLES[1].entrees[0].source.referenceF2, 'F-L23-0202');
  assert.equal(V5_L23_MUTATION_TABLES[1].entrees.at(-1).source.referenceF2, 'F-L23-0211');
  assert.deepEqual(V5_L23_MUTATION_TABLES[3].entrees.map(e => [e.selection.min, e.selection.max]),
    Array.from({ length: 19 }, (_, i) => [i + 2, i + 2]));
});

test('F2-K2 L23 — all power-column ranges are valid and non-overlapping; rows remain MJ-assisted', () => {
  for (const table of V5_L23_MUTATION_TABLES.slice(0, 3)) {
    for (const power of powers) {
      const used = new Set();
      for (const entry of table.entrees) {
        const band = entry.selection.ranges[power];
        if (!band) continue;
        for (const value of ordered(band)) {
          assert.ok(value >= 1 && value <= 100, `${table.id}/${power}/${entry.nom}: ${band}`);
          assert.equal(used.has(value), false, `${table.id}/${power}/${value} overlaps`);
          used.add(value);
        }
      }
      assert.ok(used.size > 0);
      if (power === 'any') assert.equal(used.size, 100, `${table.id}/${power} should cover 01–00`);
    }
  }
  assert.deepEqual(V5_L23_MUTATION_TABLES[0].entrees.slice(0, 1).map(e => [e.source.pageImprimee, e.source.pagePdf]), [[66,68]]);
  assert.deepEqual(V5_L23_MUTATION_TABLES[0].entrees.slice(-1).map(e => [e.source.pageImprimee, e.source.pagePdf]), [[68,70]]);
  assert.deepEqual(V5_L23_MUTATION_TABLES[2].entrees.slice(-1).map(e => [e.source.pageImprimee, e.source.pagePdf]), [[71,73]]);
  for (const table of V5_L23_MUTATION_TABLES) for (const entry of table.entrees) {
    assert.ok(entry.nom && entry.resume);
    assert.equal(entry.source.pagePdf, entry.verification.pagePdf);
    assert.equal(entry.verification.controleur, 'review_l23');
    assert.equal(entry.verification.date, '2026-10-28');
    assert.equal(entry.verification.statut, 'relue-indépendamment');
    assert.equal(entry.statutMecanique, 'assiste');
    assert.equal(entry.conversion.statut, 'assiste');
    assert.ok(entry.regleSource);
    assert.ok(entry.conversion.propositionV5);
    assert.deepEqual(entry.effets, []);
    assert.equal(entry.source.livre, 'L23 — Enemy in Shadows Companion');
  }
  const physical = V5_L23_MUTATION_TABLES[0].entrees;
  assert.match(physical[29].resume, /Peur (2|deux)/i);
  assert.match(physical[30].resume, /Mouvement.*(2|deux).*Bond/i);
  const mental = Object.fromEntries(V5_L23_MUTATION_TABLES[2].entrees.map(e => [e.nom, e.resume]));
  assert.equal(mental['Aethyric Leak'], 'Gagne le talent Witch!; Fellowship −5 et Intelligence −5.');
  assert.match(mental['Blasted Mind'], /1d10.*rounds.*1d10.*Brisé/i);
  assert.match(mental['Glorious Corruption'], /chaque semaine.*sans gagner.*sans être responsable.*perd tous/i);
  assert.match(mental['Mindless Wandering'], /Intelligence −10.*Willpower \+10.*Stupid/i);
  assert.match(mental['Hurried Masochism'], /Belligerent.*Fuir/i);
  assert.match(mental['Fitful Hatred'], /Hatred \(Target\).*une fois par jour.*Fixations/);
  assert.match(mental['Terrible Phobia'], /Afraid \(Target\).*Fixations/);
  assert.match(mental['Jealous Thoughts'], /Fellowship −10/);
  assert.match(mental['Lingering Foulness'], /Après chaque interaction.*saleté.*Nausée.*1d10 heures/);
  assert.match(mental['Soul Sickness'], /échec.*Willpower.*Convulsions.*1d10 heures/i);
  assert.match(mental['Suspicious Mind'], /Initiative −5.*Intelligence −5/);
  assert.match(mental['Thrill Seeker'], /Willpower \+10.*Initiative −10/);
  assert.match(mental['Tortured Visions'], /Initiative −10/);
  for (const table of V5_L23_MUTATION_TABLES.slice(2)) {
    assert.equal(table.source.referenceF2, null);
    assert.match(table.source.referenceAudit, /aucune entrée par ligne/i);
    for (const entry of table.entrees) {
      assert.equal(entry.source.referenceF2, null);
      assert.deepEqual(entry.source.referencesF2, []);
      assert.match(entry.source.referenceAudit, /provenance PDF directe/i);
    }
  }
  const fixations = Object.fromEntries(V5_L23_MUTATION_TABLES[3].entrees.map(e => [e.selection.min, e]));
  assert.equal(fixations[2].nom, 'Inanimate Objects');
  assert.equal(fixations[7].nom, 'Figures/Symbols of Religion');
  assert.equal(fixations[20].nom, 'Happiness');
  assert.deepEqual(V5_L23_MUTATION_TABLES[3].selection.renvoiDepuis, ['Fitful Hatred','Terrible Phobia']);
  assert.match(mental['Fitful Hatred'], /Fixations/);
  assert.match(mental['Terrible Phobia'], /Fixations/);
  const mentalEntries = V5_L23_MUTATION_TABLES[2].entrees;
  assert.match(mentalEntries[0].conversion.propositionV5, /talent Witch!.*Fellowship −5.*Intelligence −5/);
  const beacon = mentalEntries.find(e => e.nom === 'Beacon of Corruption');
  assert.match(beacon.resume, /Fellowship −10/);
  assert.match(beacon.conversion.propositionV5, /Fellowship −10 comme modification de caractéristique.*ne pas convertir.*DR/);
  assert.equal(beacon.verification.observations, 'Dernier correctif Beacon simple contrôlé.');
  assert.match(mentalEntries.find(e => e.nom === 'Lingering Foulness').conversion.propositionV5, /Après chaque interaction.*1d10 heures/);
  assert.match(mentalEntries.find(e => e.nom === 'Soul Sickness').conversion.propositionV5, /après l’échec.*1d10 heures/i);
  assert.equal(new Set(mentalEntries.map(e => e.conversion.propositionV5)).size, 34);
});

test('F2-K2 L23 — all registry mutation references 0138–0211 are attached to matching source summaries', () => {
  const audit = new Map(V5_L23_AUDIT_PROVENANCE.map(item => [item.id, item]));
  const entries = V5_L23_MUTATION_TABLES.flatMap(table => table.entrees);
  const attached = entries.flatMap(entry => entry.source.referencesF2 || []);
  const directV4Sources = new Set(['F-L23-0162','F-L23-0171','F-L23-0172','F-L23-0182','F-L23-0198','F-L23-0200','F-L23-0208','F-L23-0211']);
  assert.equal(audit.size, 74);
  assert.equal(new Set(attached.filter(id => audit.has(id))).size, 74);
  for (const entry of entries) {
    for (const reference of entry.source.referencesF2 || []) {
      if (!audit.has(reference)) continue;
      if (!directV4Sources.has(reference)) assert.ok(entry.regleSource.includes(audit.get(reference).summary));
    }
  }
});

test('F2-K2 L23 — all 72 physical and Beast Head rows have line-specific V5 proposals separate from V4 source', () => {
  const tables = V5_L23_MUTATION_TABLES.slice(0, 2);
  const entries = tables.flatMap(table => table.entrees);
  assert.equal(entries.length, 72);
  for (const entry of entries) {
    assert.ok(entry.regleSource);
    assert.ok(entry.conversion.propositionV5);
    assert.ok(entry.questionsMJ.length);
    assert.doesNotMatch(entry.conversion.propositionV5, /^Proposition V5 pour /);
  }
  const byName = Object.fromEntries(entries.map(entry => [entry.nom, entry]));
  assert.match(byName['Lolling Tongue'].regleSource, /−10.*Language/);
  assert.match(byName['Lolling Tongue'].conversion.propositionV5, /−10.*Language/);
  assert.doesNotMatch(byName['Lolling Tongue'].conversion.propositionV5, /−1 DR/);
  assert.match(byName['Rearranged Face'].regleSource, /−20.*Intuition/);
  assert.match(byName['Rearranged Face'].conversion.propositionV5, /−20.*−2 DR/);
  assert.match(byName['Whiskered Snout'].regleSource, /\+10 Track/);
  assert.match(byName['Whiskered Snout'].conversion.propositionV5, /Odorat.*\+2 DR.*\+10 Track.*V4/);
  assert.match(byName['Iron Skin'].regleSource, /\+2 Armour Points.*−10 Agility/);
  assert.match(byName['Iron Skin'].conversion.propositionV5, /\+2 PA.*F-L06-0511.*−10 Agility.*sans l’appliquer/);
  assert.match(byName['Fleshy Tentacle'].regleSource, /sans indice de niveau/);
  assert.match(byName['Fleshy Tentacle'].conversion.propositionV5, /Tentacles \(1\).*F-L06-0507/);
  assert.match(byName['Webbed Feet'].regleSource, /Amphibious/);
  assert.match(byName['Webbed Feet'].conversion.propositionV5, /Foulée \(Marais\).*Amphibie/);
  for (const name of ['Giant Spider','Snake']) {
    assert.match(byName[name].regleSource, /Venom \(Average\)/);
    assert.match(byName[name].conversion.propositionV5, /Venom \(Average\)/);
    assert.doesNotMatch(byName[name].resume, /Accessible/);
  }
});
});

describe('Tables et tirage de mutations L06', () => {
test('F2-K2 L06: source discrepancy is recorded and all 40 printed rows are retained', () => {
  const entries = catalogue.tables.flatMap(table => table.entries);
  assert.equal(catalogue.countExpectedFromBrief, 39);
  assert.equal(catalogue.countObservedOnSourcePage, 40);
  assert.match(catalogue.countDiscrepancy, /20 physical and 20 mental/);
  assert.deepEqual(catalogue.countVerification, { reviewer: 'review_k1', date: '2026-10-28', pdfPage: 189, rowsVerified: 40, rowsExpectedFromBrief: 39, observation: 'Les 40 plages imprimées ont été contrôlées; écart conservé sans suppression.' });
  assert.equal(entries.length, 40);
  assert.equal(new Set(entries.map(row => row.id)).size, 40);
  assert.deepEqual(catalogue.tables.map(table => [table.family, table.entries.length]), [['physical', 20], ['mental', 20]]);
});

test('F2-K2 L06: each d100 table covers 01–00 once, without overlap or gaps', () => {
  for (const table of catalogue.tables) {
    assert.deepEqual(table.selection, { type: 'd100-inclusive-range', min: 1, max: 100 });
    const sorted = [...table.entries].sort((left, right) => left.selection.min - right.selection.min);
    assert.equal(sorted[0].selection.min, 1);
    assert.equal(sorted.at(-1).selection.max, 100);
    for (let index = 0; index < sorted.length; index += 1) {
      const current = sorted[index];
      assert.equal(current.selection.min, index * 5 + 1);
      assert.equal(current.selection.max, index * 5 + 5);
      if (index) assert.equal(sorted[index - 1].selection.max + 1, current.selection.min);
    }
  }
});

test('F2-K2 L06: every row carries exact provenance, V5 conversion status and a short French summary', () => {
  for (const table of catalogue.tables) for (const row of table.entries) {
    assert.match(row.id, /^L06-(PHY|MEN)-\d{2}$/);
    assert.equal(row.source.book, 'L06');
    assert.equal(row.source.edition, 'V5');
    assert.equal(row.source.printedPage, 189);
    assert.equal(row.source.pdfPage, 189);
    assert.equal(row.source.referenceF2, 'F-L06-0500');
    assert.match(row.source.location, new RegExp(table.family === 'physical' ? 'Physical Corruption Table' : 'Mental Corruption Table'));
    assert.equal(row.conversion.status, 'not-required');
    assert.equal(row.verification.status, 'transcrit-sur-page');
    assert.deepEqual(row.verification.independentReview, { status: 'relue-indépendamment', reviewer: 'review_k1', date: '2026-10-28', pdfPage: 189 });
    assert.ok(row.summary.split(/\s+/u).length <= 12, `${row.id} exceeds twelve summary words`);
    assert.ok(Array.isArray(row.effects));
    assert.ok(Array.isArray(row.questionsMJ));
  }
});

test('F2-K2 L06: names, edge ranges, rerolls and ambiguous descriptions match the page transcription', () => {
  const find = (family, min) => catalogue.tables.find(table => table.family === family).entries.find(row => row.selection.min === min);
  assert.equal(find('physical', 1).selection.printed, '01–05');
  assert.equal(find('physical', 96).selection.printed, '96–00');
  assert.equal(find('mental', 1).selection.printed, '01–05');
  assert.equal(find('mental', 96).selection.printed, '96–00');
  assert.equal(find('physical', 31).effects[0].count, 1);
  assert.equal(find('physical', 66).effects[0].count, 2);
  assert.equal(find('physical', 76).effects[0].table, 'hit-locations');
  assert.equal(find('physical', 21).effects[0].talentId, 'talent-acute-sense');
  assert.equal(find('physical', 91).effects[0].talentId, 'talent-striding-gait');
  assert.equal(find('physical', 96).effects[0].specialization, 'Odorat');
  assert.equal(find('physical', 41).mechanicStatus, 'assiste');
  assert.equal(find('physical', 46).mechanicStatus, 'assiste');
  assert.deepEqual(find('mental', 86).effects.map(effect => effect.amount), [1, -1]);
});
});

describe('Store et panneau de corruption', () => {
const clone = structuredClone;
const RESISTANCE = 'skill-52_e9_73_69_73_74_61_6e_63_65-base';
const participant = (id, v5 = {}) => ({
  id, name: id, zone: 'active', hp: 12, maxHp: 12, states: [], species: 'Human',
  caracs: { E: 30, FM: 30 }, skills: [{ id: RESISTANCE, status: 'resolved', total: 50 }], talents: [],
  extensions: { v5 }
});
const envelope = participants => ({ schemaVersion: 3, reserve: [], combat: { round: 0, order: [], participants }, log: [], diceLines: [] });
function persistenceFixture() {
  let saved = null;
  return {
    persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } },
    read() { return saved && clone(saved); }
  };
}
async function fixture(participants) {
  const disk = persistenceFixture();
  const store = createStore({ storage: null, persistence: disk.persistence });
  await store.ready;
  await store.loadFromJSON(envelope(participants));
  await store.startTalentSession();
  return { store, disk };
}

test('F2-K1 Store: exposure uses authoritative skill/threshold, persists through undo/redo/reload', async () => {
  const { store, disk } = await fixture([participant('hero', { corruptionPoints: 2 })]);
  const before = store.getCorruptionStatus('hero');
  assert.equal(before.threshold, 6);
  const firstSessionId = before.corruptionSessionId;
  const preview = store.previewCorruptionExposure('hero', {
    baseRevision: before.baseRevision, influence: 'moderate', exposure: 'prolonged', skillId: RESISTANCE, roll: 70, declaredSources: 'Chaos-tainted artefact'
  });
  assert.equal(preview.status, 'ready');
  assert.equal(preview.gainedPoints, 2);
  const applied = await store.applyCorruptionExposure('hero', preview);
  assert.equal(applied.status, 'applied');
  assert.equal(store.getCorruptionStatus('hero').corruptionPoints, 4);
  assert.equal(store.getCorruptionStatus('hero').sessionExposure.sessionId, firstSessionId);
  assert.throws(() => store.previewCorruptionExposure('hero', {
    baseRevision: store.getCorruptionStatus('hero').baseRevision, influence: 'major', exposure: 'prolonged', skillId: RESISTANCE, roll: 70, declaredSources: 'Mutant lair'
  }), /déjà été résolu/);
  assert.equal(store.getCorruptionStatus('hero').pendingThresholdTest, null);
  await store.undo();
  assert.equal(store.getCorruptionStatus('hero').corruptionPoints, 2);
  await store.redo();
  assert.equal(store.getCorruptionStatus('hero').corruptionPoints, 4);
  const reloaded = createStore({ storage: null, persistence: disk.persistence });
  await reloaded.ready;
  assert.equal(reloaded.getCorruptionStatus('hero').corruptionPoints, 4);
  assert.equal(reloaded.getCorruptionStatus('hero').sessionExposure.declaredSources, 'Chaos-tainted artefact');
  assert.equal(reloaded.getCorruptionStatus('hero').sessionExposure.sessionId, firstSessionId);
  assert.equal(reloaded.getCorruptionStatus('hero').mutations.length, 0);
  await reloaded.startTalentSession();
  const nextSession = reloaded.getCorruptionStatus('hero');
  assert.notEqual(nextSession.corruptionSessionId, firstSessionId);
  assert.equal(nextSession.sessionExposure, null);
  assert.equal(reloaded.previewCorruptionExposure('hero', {
    baseRevision: nextSession.baseRevision, influence: 'minor', exposure: 'exposure', skillId: RESISTANCE, roll: 70, declaredSources: 'Later session, profane artefact'
  }).status, 'ready', 'new explicit session allows its own single Test without deleting history');
});

test('F2-K1 Store: over-threshold test and mutation confirmation use fresh authoritative facts', async () => {
  const { store } = await fixture([participant('hero', { corruptionPoints: 5 })]);
  const status = store.getCorruptionStatus('hero');
  const exposure = store.previewCorruptionExposure('hero', {
    baseRevision: status.baseRevision, influence: 'moderate', exposure: 'prolonged', skillId: RESISTANCE, roll: 90, declaredSources: 'Refined warpstone'
  });
  await store.applyCorruptionExposure('hero', exposure);
  assert.equal(store.getCorruptionStatus('hero').corruptionPoints, 7);
  const pendingStatus = store.getCorruptionStatus('hero');
  const preview = store.previewCorruptionThresholdTest('hero', {
    baseRevision: pendingStatus.baseRevision, roll: 90, mutationDomainRoll: 1, gmChosenDomain: 'physical', manifestationDice: [2, 3, 4]
  });
  assert.equal(preview.status, 'ready');
  assert.equal(preview.outcome.status, 'mutation-pending');
  assert.equal((await store.applyCorruptionThresholdTest('hero', preview)).status, 'applied');
  assert.equal(store.getCorruptionStatus('hero').corruptionPoints, 7, 'points are not removed before GM confirmation');

  const pending = store.getCorruptionStatus('hero');
  assert.equal(pending.pendingMutation.manifestation.days, 9);
  const confirmed = await store.confirmCorruptionMutation('hero', { mutationId: 'L06-P-01', baseRevision: pending.baseRevision });
  assert.equal(confirmed.status, 'confirmed');
  const committed = store.getCorruptionStatus('hero');
  assert.equal(committed.corruptionPoints, 4);
  assert.equal(committed.mutations.length, 1);
  assert.equal(committed.mutations[0].tableRowId, 'L06-P-01');
  await store.undo();
  assert.equal(store.getCorruptionStatus('hero').corruptionPoints, 7);
  await store.redo();
  assert.equal(store.getCorruptionStatus('hero').corruptionPoints, 4);
});

test('F2-K1 Store: stale previews cannot commit after state changes; threshold is recalculated', async () => {
  const { store } = await fixture([participant('hero', { corruptionPoints: 5 })]);
  const first = store.getCorruptionStatus('hero');
  const preview = store.previewCorruptionExposure('hero', {
    baseRevision: first.baseRevision, influence: 'minor', exposure: 'exposure', skillId: RESISTANCE, roll: 70, declaredSources: 'Profane artefact'
  });
  await store.setCorruptionPoints('hero', 6, { reason: 'saisie MJ', baseRevision: first.baseRevision });
  assert.equal((await store.applyCorruptionExposure('hero', preview)).status, 'stale');
  const changed = store.getCorruptionStatus('hero');
  assert.equal(changed.corruptionPoints, 6);
  assert.equal(changed.threshold, 6);
  const noGain = store.previewCorruptionExposure('hero', {
    baseRevision: changed.baseRevision, influence: 'minor', exposure: 'exposure', skillId: RESISTANCE, roll: 1, declaredSources: 'Profane artefact'
  });
  assert.equal(noGain.gainedPoints, 0);
  assert.equal(noGain.thresholdTestRequired, false);
});

test('F2-K1 Store: threshold increase explicitly closes obsolete pending test and unblocks exposure', async () => {
  const { store } = await fixture([participant('hero', {
    corruptionPoints: 7,
    pendingCorruptionTest: { id: 'pending-old', status: 'pending', pointsAtTrigger: 7, thresholdAtTrigger: 6 }
  })]);
  const before = store.getCorruptionStatus('hero');
  assert.equal(before.pendingThresholdTest.id, 'pending-old');
  await store.updateParticipant('hero', { caracs: { E: 40, FM: 40 } });
  const refreshed = store.getCorruptionStatus('hero');
  assert.equal(refreshed.threshold, 8);
  assert.ok(refreshed.pendingThresholdTest, 'pending decision is not silently discarded');
  const resolved = await store.resolveObsoleteCorruptionThresholdTest('hero', { baseRevision: refreshed.baseRevision });
  assert.equal(resolved.status, 'resolved');
  assert.equal(store.getCorruptionStatus('hero').pendingThresholdTest, null);
  const status = store.getCorruptionStatus('hero');
  const exposure = store.previewCorruptionExposure('hero', {
    baseRevision: status.baseRevision, influence: 'minor', exposure: 'exposure', skillId: RESISTANCE, roll: 70, declaredSources: 'Profane artefact'
  });
  assert.equal(exposure.status, 'ready');
  assert.equal(exposure.thresholdTestRequired, false);
});

test('F2-K1 UI: changed threshold offers an explicit no-roll close action', async () => {
  const originalDocument = globalThis.document;
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.dataset = {}; this.attributes = {}; this.value = ''; }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.children.push(child); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    async click() { return this.listeners.click?.(); }
  }
  globalThis.document = { createElement: tag => new Element(tag) };
  try {
    const { store } = await fixture([participant('hero', {
      corruptionPoints: 7,
      pendingCorruptionTest: { id: 'pending-old', status: 'pending', pointsAtTrigger: 7, thresholdAtTrigger: 6 }
    })]);
    await store.updateParticipant('hero', { caracs: { E: 40, FM: 40 } });
    const panel = createV5CorruptionPanel({ Store: store });
    const rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
    const action = rendered.children.find(child => child.tag === 'button' && child.textContent === 'Clore le Test de seuil devenu inutile');
    assert.ok(action, 'the UI exposes an explicit close action without asking for a d100');
    await action.click();
    assert.equal(store.getCorruptionStatus('hero').pendingThresholdTest, null);
    assert.equal(store.previewCorruptionExposure('hero', {
      baseRevision: store.getCorruptionStatus('hero').baseRevision,
      influence: 'minor', exposure: 'exposure', skillId: RESISTANCE, roll: 70, declaredSources: 'Profane artefact'
    }).status, 'ready');
  } finally {
    globalThis.document = originalDocument;
  }
});

test('F2-K1 UI: the MJ opens an explicit session before recording end-of-session exposures', async () => {
  const originalDocument = globalThis.document;
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.dataset = {}; this.attributes = {}; this.value = ''; }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.children.push(child); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    async click() { return this.listeners.click?.(); }
  }
  globalThis.document = { createElement: tag => new Element(tag) };
  try {
    const disk = persistenceFixture();
    const store = createStore({ storage: null, persistence: disk.persistence });
    await store.ready;
    await store.loadFromJSON(envelope([participant('hero', { corruptionPoints: 1 })]));
    const panel = createV5CorruptionPanel({ Store: store });
    const rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
    const action = rendered.children.find(child => child.tag === 'button' && child.textContent === 'Démarrer une séance');
    assert.ok(action);
    await action.click();
    assert.ok(store.getCorruptionStatus('hero').corruptionSessionId);
  } finally {
    globalThis.document = originalDocument;
  }
});

test('F2-K1 production bestiary profiles: canonical skill/talent IDs and elven species reach the threshold rules', async () => {
  const library = l11.profiles;
  const erich = buildParticipantFromBestiary('E0-P-536', { library, zone: 'active', idFactory: () => 'erich' });
  const lynathryn = buildParticipantFromBestiary('E0-P-538', { library, zone: 'active', idFactory: () => 'lynathryn' });

  assert.equal(erich.identity.species, 'Human');
  assert.equal(erich.species, 'Human');
  assert.equal(erich.skills.find(skill => skill.sourceName === 'Endurance').id, RESISTANCE);
  assert.equal(erich.talents.find(talent => talent.sourceName === 'Pure Soul').id, 'talent-pure-soul');
  assert.equal(erich.talents.find(talent => talent.sourceName === 'Pure Soul').status, 'resolved');
  const { store, disk } = await fixture([erich]);
  assert.equal(store.getCorruptionStatus('erich').threshold, 12, 'E38/FM30 plus Pure Soul doubles 6 to 12');
  const erichReloaded = createStore({ storage: null, persistence: disk.persistence });
  await erichReloaded.ready;
  assert.equal(erichReloaded.getCorruptionStatus('erich').threshold, 12, 'catalogue talent and characteristics survive reload');

  assert.equal(lynathryn.identity.species, 'Wood Elf');
  assert.equal(lynathryn.species, 'Wood Elf');
  assert.equal(lynathryn.skills.find(skill => skill.sourceName === 'Endurance').id, RESISTANCE);
  assert.equal(lynathryn.skills.find(skill => skill.sourceName === 'Endurance').total, 45);
  const elfFixture = await fixture([{ ...lynathryn, extensions: { ...lynathryn.extensions, v5: { ...lynathryn.extensions.v5, corruptionPoints: 5 } } }]);
  const status = elfFixture.store.getCorruptionStatus('lynathryn');
  const exposure = elfFixture.store.previewCorruptionExposure('lynathryn', {
    baseRevision: status.baseRevision, influence: 'moderate', exposure: 'prolonged', skillId: RESISTANCE, roll: 99, declaredSources: 'Chaos-tainted artefact'
  });
  assert.equal(exposure.test.scoreInfo.scoreSource, 'resolved-skill');
  await elfFixture.store.applyCorruptionExposure('lynathryn', exposure);
  const updated = elfFixture.store.getCorruptionStatus('lynathryn');
  assert.equal(updated.species, 'Wood Elf', 'species is hydrated from the preserved bestiary identity');
  const mutation = elfFixture.store.previewCorruptionThresholdTest('lynathryn', {
    baseRevision: updated.baseRevision, roll: 99, mutationDomainRoll: 1, manifestationDice: [1, 1, 1]
  });
  assert.equal(mutation.status, 'ready');
  assert.equal(mutation.outcome.mutation.domain, 'mental', 'Wood Elf uses Elf table: no physical mutation result');
  const lynathrynReloaded = createStore({ storage: null, persistence: elfFixture.disk.persistence });
  await lynathrynReloaded.ready;
  assert.equal(lynathrynReloaded.getCorruptionStatus('lynathryn').species, 'Wood Elf');
  assert.equal(lynathrynReloaded.getCorruptionStatus('lynathryn').threshold, 6);
  assert.equal(lynathrynReloaded.getCorruptionStatus('lynathryn').sessionExposure.declaredSources, 'Chaos-tainted artefact');
});
});

describe('Reprise et caracterisation', () => {
const RESISTANCE = 'skill-52_e9_73_69_73_74_61_6e_63_65-base';
const hero = (id, { points = 7, E = 30, FM = 30, pendingMutation = null } = {}) => ({
  id, name: id, zone: 'active', species: 'Human', caracs: { E, FM }, skills: [{ id: RESISTANCE, status: 'resolved', total: 50 }], talents: [], states: [],
  extensions: { v5: { corruptionPoints: points, ...(pendingMutation ? { pendingCorruptionMutation: pendingMutation } : {}) } }
});
async function storeWith(participants) {
  const store = createStore({ storage: null });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, order: [], participants }, log: [], diceLines: [] });
  return store;
}

test('K1 reprise: mutation pending can be declined through Store, preserving points and clearing pending state', async () => {
  const store = await storeWith([hero('decline', { pendingMutation: { id: 'pending-1', status: 'pending', domain: 'physical', manifestation: { days: 12, visibility: 'gm-only' } } })]);
  const status = store.getCorruptionStatus('decline');
  const result = await store.declineCorruptionMutation('decline', { baseRevision: status.baseRevision });
  assert.equal(result.status, 'declined');
  assert.equal(store.getCorruptionStatus('decline').pendingMutation, null);
  assert.equal(store.getCorruptionStatus('decline').corruptionPoints, 7);
});

test('K1 reprise: threshold preview requests missing mutation-domain dice instead of throwing', async () => {
  const store = await storeWith([hero('input')]);
  await store.executeCommand('fixture-pending-threshold', draft => {
    draft.combat.participants[0].extensions.v5.pendingCorruptionTest = { id: 'test-1', status: 'pending' };
    return draft;
  });
  const status = store.getCorruptionStatus('input');
  const preview = store.previewCorruptionThresholdTest('input', { baseRevision: status.baseRevision, roll: 90, manifestationDice: [1, 1, 1] });
  assert.equal(preview.status, 'needs-input');
  assert.ok(preview.missing.includes('gmChosenDomain') || preview.missing.includes('mutationDomainRoll'));
});

test('K1 reprise: creature characteristic scores above 100 can determine the corruption threshold', async () => {
  const store = await storeWith([hero('giant', { points: 120, E: 120, FM: 110 })]);
  assert.equal(store.getCorruptionStatus('giant').threshold, 23);
});
});

describe('Integration du catalogue de mutations', () => {
const clone = structuredClone;
const RESISTANCE = 'skill-52_e9_73_69_74_61_6e_63_65-base';
const participant = { id: 'hero', name: 'Hero', zone: 'active', hp: 10, maxHp: 10, states: [], species: 'Human',
  caracs: { E: 30, FM: 30 }, skills: [{ id: RESISTANCE, status: 'resolved', total: 50 }], talents: [], extensions: { v5: { corruptionPoints: 0 } } };
const envelope = (subject = participant) => ({ schemaVersion: 3, reserve: [], combat: { round: 0, order: [], participants: [clone(subject)] }, log: [], diceLines: [] });
function persistenceFixture() {
  let saved = null;
  return { persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } } };
}
async function makeStore(subject = participant) {
  const disk = persistenceFixture();
  const store = createStore({ storage: null, persistence: disk.persistence });
  await store.ready; await store.loadFromJSON(envelope(subject));
  return { store, disk };
}

test('K2 catalogue selection validates L06 d100, L17 d10, L23 column bands, and printed renvoi tables', () => {
  const l06 = resolveCorruptionMutationSelection({ tableId: 'L06-corruption-physical', entryId: 'L06-PHY-20', result: 100 });
  assert.equal(l06.selection.min, 96); assert.equal(l06.selection.max, 100); assert.equal(l06.source.pdfPage, 189);
  const l17 = resolveCorruptionMutationSelection({ tableId: 'l17-marks-hysh', entryId: 'l17-mark-hysh-10', result: 10 });
  assert.equal(l17.selection.min, 10); assert.equal(l17.source.pagePdf, 58);
  assert.throws(() => resolveCorruptionMutationSelection({ tableId: 'l17-marks-hysh', entryId: 'l17-mark-hysh-10', result: 9 }), /ne correspond pas/);
  const l23 = V5_CORRUPTION_MUTATION_CATALOG.find(table => table.id === 'l23-physical');
  const row = l23.entries.find(entry => Object.values(entry.selection.ranges).some(value => value === '01-03'));
  const column = Object.entries(row.selection.ranges).find(([, value]) => value === '01-03')[0];
  assert.throws(() => resolveCorruptionMutationSelection({ tableId: l23.id, entryId: row.id, result: 4, column }), /ne correspond pas/);
  const resolved = resolveCorruptionMutationSelection({ tableId: l23.id, entryId: row.id, result: 2, column });
  assert.equal(resolved.selection.ranges[column], '01-03');
  assert.equal(resolved.source.livre, 'L23 — Enemy in Shadows Companion');
  const beastHeadTable = V5_CORRUPTION_MUTATION_CATALOG.find(table => table.id === 'l23-beast-head');
  const beastHead = resolveCorruptionMutationSelection({ tableId: beastHeadTable.id, entryId: beastHeadTable.entries[0].id, result: 1, column: 'any' });
  assert.equal(beastHead.tableRenvoiFrom, 'l23-physical:Beast Head');
  assert.equal(beastHead.referenceF2, 'F-L23-0202');
  assert.equal(beastHead.effects.length, 0, 'no effect is derived or applied from the paraphrase');
  const snake = beastHeadTable.entries.find(entry => entry.label === 'Snake');
  assert.equal(resolveCorruptionMutationSelection({ tableId: beastHeadTable.id, entryId: snake.id, result: 0, column: 'any' }).entryId, snake.id, 'printed 00 is represented as zero in L23 d100 columns');
  assert.equal(resolveCorruptionMutationSelection({ tableId: beastHeadTable.id, entryId: snake.id, result: 99, column: 'any' }).entryId, snake.id, 'cyclic 96–00 range includes 99');
  assert.throws(() => resolveCorruptionMutationSelection({ tableId: beastHeadTable.id, entryId: snake.id, result: 95, column: 'any' }), /ne correspond pas/);
  const fixationTable = V5_CORRUPTION_MUTATION_CATALOG.find(table => table.id === 'l23-fixations');
  const parentTable = V5_CORRUPTION_MUTATION_CATALOG.find(table => table.id === 'l23-mental');
  const parentEntry = parentTable.entries.find(entry => fixationTable.selection.renvoiDepuis.includes(entry.label));
  assert.throws(() => resolveCorruptionMutationSelection({ tableId: fixationTable.id, entryId: fixationTable.entries[0].id, result: 2 }), /Choisissez explicitement/);
  const fixation = resolveCorruptionMutationSelection({ tableId: fixationTable.id, entryId: fixationTable.entries[0].id, result: 2, renvoiParentEntryId: parentEntry.id });
  assert.equal(fixation.renvoiParent.entryId, parentEntry.id);
  assert.equal(fixation.domain, 'mental', 'the selected parent entry determines the referenced mental table context');
});

test('K2 catalog confirmation is attached once to pending K1 mutation and respects its domain', async () => {
  const subject = { ...participant, extensions: { v5: {
    corruptionPoints: 7,
    pendingCorruptionMutation: { id: 'pending-k1', status: 'pending', domain: 'physical', manifestation: { days: 9, visibility: 'gm-only' } }
  } } };
  const { store, disk } = await makeStore(subject);
  let status = store.getCorruptionStatus('hero');
  assert.equal((await store.confirmCorruptionMutation('hero', {
    catalogSelection: { tableId: 'L06-corruption-physical', entryId: 'L06-PHY-01', result: 1 }, baseRevision: status.baseRevision
  })).status, 'confirmed');
  status = store.getCorruptionStatus('hero');
  assert.equal(status.corruptionPoints, 4, 'K1 deduction occurs once at explicit confirmation');
  assert.equal(status.mutations.length, 1);
  assert.equal(status.mutations[0].entryId, 'L06-PHY-01');
  assert.equal(status.mutations[0].source.pdfPage, 189);
  assert.equal(status.mutations[0].effectsApplied, false);
  await assert.rejects(store.confirmCorruptionMutation('hero', {
    catalogSelection: { tableId: 'L06-corruption-physical', entryId: 'L06-PHY-01', result: 1 }, baseRevision: status.baseRevision
  }), /ne correspond pas au domaine|Mutation en attente absente/, 'there is no pending K1 action left to double confirm');
  await store.undo(); assert.equal(store.getCorruptionStatus('hero').corruptionPoints, 7);
  await store.redo(); assert.equal(store.getCorruptionStatus('hero').corruptionPoints, 4);
  const reloaded = createStore({ storage: null, persistence: disk.persistence }); await reloaded.ready;
  assert.equal(reloaded.getCorruptionStatus('hero').mutations[0].entryId, 'L06-PHY-01');
  assert.equal(reloaded.getCorruptionStatus('hero').mutations[0].source.pdfPage, 189);

  const mismatchSubject = { ...subject, extensions: { v5: { ...subject.extensions.v5, pendingCorruptionMutation: { ...subject.extensions.v5.pendingCorruptionMutation, domain: 'mental' } } } };
  const { store: mismatch } = await makeStore(mismatchSubject);
  await assert.rejects(mismatch.confirmCorruptionMutation('hero', {
    catalogSelection: { tableId: 'L06-corruption-physical', entryId: 'L06-PHY-01', result: 1 }, baseRevision: mismatch.getCorruptionStatus('hero').baseRevision
  }), /ne correspond pas au domaine/);
  assert.equal(mismatch.getCorruptionStatus('hero').mutations.length, 0);
});

test('K2 untyped L17 selection requires an explicit matching compatibility decision and persists it', async () => {
  const catalogSelection = { tableId: 'l17-marks-hysh', entryId: 'l17-mark-hysh-01', result: 1 };
  for (const domain of ['physical', 'mental']) {
    const subject = { ...participant, extensions: { v5: {
      corruptionPoints: 7,
      pendingCorruptionMutation: { id: `pending-${domain}`, status: 'pending', domain, manifestation: { days: 7 } }
    } } };
    const { store, disk } = await makeStore(subject);
    let status = store.getCorruptionStatus('hero');
    await assert.rejects(store.confirmCorruptionMutation('hero', { catalogSelection, baseRevision: status.baseRevision }), /Choisissez explicitement/);
    await assert.rejects(store.confirmCorruptionMutation('hero', { catalogSelection, compatibilityDomain: domain === 'physical' ? 'mental' : 'physical', baseRevision: status.baseRevision }), /ne correspond pas au domaine/);
    assert.equal(store.getCorruptionStatus('hero').mutations.length, 0, 'missing or mismatched compatibility does not mutate state');
    status = store.getCorruptionStatus('hero');
    assert.equal((await store.confirmCorruptionMutation('hero', { catalogSelection, compatibilityDomain: domain, baseRevision: status.baseRevision })).status, 'confirmed');
    const mutation = store.getCorruptionStatus('hero').mutations[0];
    assert.equal(mutation.domain, domain, 'the authoritative K1 domain is preserved');
    assert.equal(mutation.compatibilityDecision.domain, domain);
    assert.equal(mutation.compatibilityDecision.decidedBy, 'gm');
    assert.equal(mutation.tableFamily, 'Marques du Vent Hysh');
    await store.undo();
    assert.equal(store.getCorruptionStatus('hero').mutations.length, 0);
    assert.equal(store.getCorruptionStatus('hero').pendingMutation.domain, domain);
    await store.redo();
    assert.equal(store.getCorruptionStatus('hero').mutations[0].compatibilityDecision.domain, domain);
    const reloaded = createStore({ storage: null, persistence: disk.persistence }); await reloaded.ready;
    const afterReload = reloaded.getCorruptionStatus('hero').mutations[0];
    assert.equal(afterReload.domain, domain);
    assert.equal(afterReload.compatibilityDecision.domain, domain);
    assert.equal(afterReload.tableId, 'l17-marks-hysh');
  }
});

test('K2 UI confirms the table line as part of the pending K1 mutation', async () => {
  const originalDocument = globalThis.document;
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.dataset = {}; this.attributes = {}; this.value = ''; this.textContent = ''; }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.children.push(child); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    async click() { return this.listeners.click?.(); }
  }
  globalThis.document = { createElement: tag => new Element(tag) };
  try {
    const subject = { ...participant, extensions: { v5: { corruptionPoints: 7,
      pendingCorruptionMutation: { id: 'pending-k1-ui', status: 'pending', domain: 'physical', manifestation: { days: 8 } } } } };
    const { store } = await makeStore(subject);
    const panel = createV5CorruptionPanel({ Store: store });
    const rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
    const button = rendered.children.find(child => child.tag === 'button' && child.textContent === 'Confirmer la mutation en attente avec cette entrée');
    const resultField = rendered.children.find(child => child.tag === 'label' && child.children[0]?.textContent?.startsWith('Résultat imprimé'))?.children[1];
    assert.ok(button); assert.ok(resultField);
    resultField.value = '1'; resultField.listeners.input();
    await button.click();
    const status = store.getCorruptionStatus('hero');
    assert.equal(status.corruptionPoints, 4); assert.equal(status.mutations.length, 1);
    assert.equal(status.mutations[0].entryId, 'L06-PHY-01'); assert.equal(status.mutations[0].effectsApplied, false);
  } finally { globalThis.document = originalDocument; }
});

test('K2 UI exposes the printed L23 Fixations renvoi and persists its selected mental parent', async () => {
  const originalDocument = globalThis.document;
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.dataset = {}; this.attributes = {}; this.value = ''; this.textContent = ''; }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.children.push(child); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    async click() { return this.listeners.click?.(); }
  }
  globalThis.document = { createElement: tag => new Element(tag) };
  try {
    const subject = { ...participant, extensions: { v5: { corruptionPoints: 7,
      pendingCorruptionMutation: { id: 'pending-k1-fixation', status: 'pending', domain: 'mental', manifestation: { days: 8 } } } } };
    const { store } = await makeStore(subject);
    const panel = createV5CorruptionPanel({ Store: store });
    const findControl = (rendered, label) => rendered.children.find(child => child.tag === 'label' && child.children[0]?.textContent === label)?.children[1];
    let rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
    let table = findControl(rendered, 'Table source');
    table.value = 'l23-fixations'; await table.listeners.change();
    rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
    const parent = findControl(rendered, 'Ligne parente du renvoi');
    assert.ok(parent, 'Fixations requires one of its printed parent rows');
    assert.equal(findControl(rendered, 'Compatibilité décidée par le MJ'), undefined, 'the explicit parent row resolves the mental domain');
    parent.value = 'l23-mutations mentales-12'; await parent.listeners.change();
    rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
    const resultField = rendered.children.find(child => child.tag === 'label' && child.children[0]?.textContent?.startsWith('Résultat imprimé'))?.children[1];
    const button = rendered.children.find(child => child.tag === 'button' && child.textContent === 'Confirmer la mutation en attente avec cette entrée');
    resultField.value = '2'; resultField.listeners.input(); await button.click();
    const mutation = store.getCorruptionStatus('hero').mutations[0];
    assert.equal(mutation.domain, 'mental'); assert.equal(mutation.tableId, 'l23-fixations');
    assert.equal(mutation.renvoiParent.tableId, 'l23-mental');
    assert.equal(mutation.renvoiParent.entryId, 'l23-mutations mentales-12');
  } finally { globalThis.document = originalDocument; }
});

test('K2 UI leaves L17 compatibility blank and requires the MJ to choose it', async () => {
  const originalDocument = globalThis.document;
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.dataset = {}; this.attributes = {}; this.value = ''; this.textContent = ''; }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.children.push(child); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    async click() { return this.disabled ? undefined : this.listeners.click?.(); }
  }
  globalThis.document = { createElement: tag => new Element(tag) };
  try {
    const subject = { ...participant, extensions: { v5: { corruptionPoints: 7,
      pendingCorruptionMutation: { id: 'pending-k1-l17-ui', status: 'pending', domain: 'physical', manifestation: { days: 8 } } } } };
    const { store } = await makeStore(subject);
    const panel = createV5CorruptionPanel({ Store: store });
    const findControl = (rendered, label) => rendered.children.find(child => child.tag === 'label' && child.children[0]?.textContent === label)?.children[1];
    let rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
    const table = findControl(rendered, 'Table source'); table.value = 'l17-marks-hysh'; await table.listeners.change();
    rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
    let decision = findControl(rendered, 'Compatibilité décidée par le MJ');
    assert.equal(decision.value, '', 'no compatibility default is supplied');
    let button = rendered.children.find(child => child.tag === 'button' && child.textContent === 'Confirmer la mutation en attente avec cette entrée');
    assert.equal(button.disabled, true, 'confirmation is blocked until compatibility is chosen');
    decision.value = 'physical'; await decision.listeners.change();
    rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
    const resultField = rendered.children.find(child => child.tag === 'label' && child.children[0]?.textContent?.startsWith('Résultat imprimé'))?.children[1];
    button = rendered.children.find(child => child.tag === 'button' && child.textContent === 'Confirmer la mutation en attente avec cette entrée');
    resultField.value = '1'; resultField.listeners.input(); await button.click();
    const mutation = store.getCorruptionStatus('hero').mutations[0];
    assert.equal(mutation.compatibilityDecision.domain, 'physical');
    assert.equal(mutation.domain, 'physical');
    assert.equal(mutation.tableFamily, 'Marques du Vent Hysh');
  } finally { globalThis.document = originalDocument; }
});
});
