import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateAction, compareSimulationTargets, applySimulation, discardSimulation } from '../js/core/simulation.js';
import { parseProfileText } from '../js/core/text-profile-import.js';

const actor = { id: 'a', name: 'MJ', states: [] };
const target = { id: 't', name: 'Cible', hp: 10, caracs: { E: 30 }, armor: { body: 1 }, states: [] };

test('E16 simulation — copie isolée, abandon sans mutation et réutilisation E12', () => {
  const state = { revision: 2, participants: [actor, target], appliedResolutionIds: [] };
  const simulation = simulateAction(state, { actorId: 'a', targetId: 't', action: { id: 'coup', type: 'attack', base: 60, damage: 4 }, roll: '42' });
  assert.equal(simulation.status, 'pending');
  assert.equal(simulation.preview.roll, 42);
  assert.equal(simulation.preview.baseRevision, 2);
  assert.equal(state.participants[1].hp, 10);
  simulation.simulatedState.participants[1].hp = 1;
  assert.equal(state.participants[1].hp, 10);
  assert.equal(discardSimulation(simulation).status, 'discarded');
});

test('E16 simulation — comparaison de cibles et application idempotente/stale', () => {
  const state = { revision: 0, participants: [actor, target, { ...target, id: 't2', name: 'Autre' }], appliedResolutionIds: [] };
  const compared = compareSimulationTargets(state, { actorId: 'a', action: { type: 'attack', base: 60, damage: 2 }, roll: 40 }, ['t', 't2']);
  assert.deepEqual(compared.simulations.map(item => item.preview.targetId), ['t', 't2']);
  const applied = applySimulation(compared.simulations[0], state);
  assert.equal(applied.status, 'applied');
  assert.equal(applied.state.participants[1].hp, 9);
  assert.equal(applySimulation(compared.simulations[0], applied.state).status, 'duplicate');
  const stale = applySimulation(compared.simulations[1], { ...state, revision: 1 });
  assert.equal(stale.status, 'stale');
});

test('E17 import texte — bloc complet, accents, qualités canonisées et contenu HTML inerte', () => {
  const result = parseProfileText(`[Profil]\nNom: <b>Garde</b>\nType PNJ: PNJ\nPV: 12\nInitiative: 30\nCaractéristique E: 35\nArmure tête: 2\nAction: Attaque | base=40 | dégâts=1d10 | qualités=Impact, Percutante, Météore\n---\nNom: Éclaireur\nPV: 8`);
  assert.equal(result.profiles.length, 2);
  assert.equal(result.profiles[0].name, '<b>Garde</b>');
  assert.deepEqual(result.profiles[0].caracs, { e: 35 });
  assert.equal(result.profiles[0].armor.head, 2);
  assert.deepEqual(result.profiles[0].actions[0].qualities.map(item => item.id), ['percutante', 'meteore']);
  assert.deepEqual(result.unknownQualities.map(item => item.value), ['Météore']);
  assert.equal(result.status, 'needs-review');
});

test('E17 import texte — décimales rejetées, champs absents et ambiguïtés explicites', () => {
  const result = parseProfileText('Nom: Orc\nPV: 12.5\nPV: 13\nNotes: <script>alert(1)</script>');
  assert.equal(result.blocks[0].fields.hp.status, 'ambiguous');
  assert.equal(result.blocks[0].errors[0].reason, 'entier-attendu');
  assert.equal(result.status, 'needs-review');
  const missing = parseProfileText('Nom: Sans PV');
  assert.equal(missing.blocks[0].fields.hp.status, 'missing');
  assert.equal(missing.status, 'needs-review');
  assert.match(missing.sourceText, /Sans PV/);
});
