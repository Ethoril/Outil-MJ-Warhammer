import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_APPLIED_RESOLUTION_IDS,
  ResolutionError,
  applyResolution,
  normalizeResolutionInput,
  previewResolution,
  replayResolution
} from '../js/core/resolution.js';

const actor = { id: 'a', name: 'Attaquant', states: ['Sonné', 'Brisé|2'] };
const target = {
  id: 't', name: 'Cible', hp: 10, caracs: { E: 35 },
  armor: { head: 2, body: 1, arms: 2, legs: 2 }, states: []
};

test('E12 résolution — dé saisi et dé virtuel équivalents, 00 devient 100', () => {
  const base = { actor, action: { type: 'test', base: 50, mod: 5 }, baseRevision: 3 };
  const entered = previewResolution({ ...base, roll: '00' });
  const virtual = previewResolution({ ...base, roll: 100 });
  assert.equal(entered.roll, 100);
  assert.deepEqual(entered, virtual);
  assert.equal(previewResolution({ ...base, roll: 1 }).success, true);
  assert.throws(() => normalizeResolutionInput({ ...base, roll: 0 }), ResolutionError);
});

test('E12 résolution — malus par nom, modificateur visible et critique bornée', () => {
  const result = previewResolution({
    actor, target,
    action: { type: 'attack', base: 50, mod: 5, damage: 4, qualities: ['Précise', 'precise', 'Empaleuse'] },
    baseRevision: 7, roll: 30, criticalRolls: { location: 20, effect: 40 }
  });
  assert.deepEqual(result.score, {
    base: 50, mod: 5, statePenalty: 20, penaltyStates: ['sonne', 'brise'], target: 45
  });
  assert.equal(result.success, true);
  assert.equal(result.sl, 1);
  assert.equal(result.critical.kind, 'Critique');
  assert.equal(result.critical.details.effectRoll, 40);
});

test('E12 résolution — critique injecté, localisation et dégâts seulement pour attaque', () => {
  const attack = previewResolution({
    actor: { id: 'a', states: [] }, target,
    action: { type: 'attack', base: 60, damage: 4, qualities: [] },
    roll: 54, baseRevision: 1, criticalRolls: { location: 33, effect: 40 }
  });
  assert.equal(attack.location.name, 'Corps');
  assert.equal(attack.damage.finalDamage, 1, '4 + SL(60,54)=5 - (BE3 + PA1) = 1');
  const perception = previewResolution({
    actor, target, action: { type: 'perception', base: 60, damage: 99 }, roll: 42, baseRevision: 1
  });
  assert.equal(perception.attack, false);
  assert.equal(perception.damage, null, 'une perception ne devient jamais une attaque');
});

test('E12 résolution — opposition non couverte reste un arbitrage manuel', () => {
  const result = previewResolution({ actor, target, action: { type: 'opposition', base: 50 }, roll: 40 });
  assert.deepEqual(result.opposition, { mode: 'manual', reason: 'aucune-convention-locale-vérifiée' });
  assert.equal(result.damage, null);
});

test('E12 résolution — application unique et révision cible invalidante', () => {
  const preview = previewResolution({
    actor: { id: 'a', states: [] }, target,
    action: { type: 'attack', base: 60, damage: 4 }, roll: 42, baseRevision: 1
  });
  const current = { revision: 1, participants: [target], appliedResolutionIds: [] };
  const applied = applyResolution(preview, current);
  assert.equal(applied.status, 'applied');
  assert.equal(applied.state.participants[0].hp, 9);
  assert.equal(applied.resolution.application.applied, true);
  const replay = applyResolution(preview, applied.state);
  assert.equal(replay.status, 'duplicate');
  const stale = applyResolution(preview, { revision: 2, participants: [target] });
  assert.equal(stale.status, 'stale');
  assert.equal(stale.requiresPreview, true);
  const targetChanged = applyResolution(preview, { revision: 1, participants: [{ ...target, hp: 9 }] });
  assert.equal(targetChanged.status, 'stale');
  const missing = applyResolution(previewResolution({ actor, action: { type: 'attack', base: 50, damage: 4 }, roll: 40 }), {
    revision: 0, participants: []
  });
  assert.equal(missing.status, 'manual');
});

test('E12 résolution — rejeu conserve exactement les mêmes jets et entrées', () => {
  const input = { actor, target, action: { type: 'attack', base: 60, damage: 4 }, roll: '01', baseRevision: 2 };
  const first = previewResolution(input);
  const replay = replayResolution(first.input);
  assert.deepEqual(replay, first);
  assert.equal(replay.roll, 1);
});

test('E12 résolution — identifiants dérivés incluent action, cible et révision', () => {
  const first = previewResolution({ actor, target, action: { id: 'attaque-1', type: 'attack', base: 60, damage: 4 }, roll: 40, baseRevision: 2 });
  const second = previewResolution({ actor, target, action: { id: 'attaque-2', type: 'attack', base: 60, damage: 4 }, roll: 40, baseRevision: 2 });
  assert.notEqual(first.resolutionId, second.resolutionId);
  const later = previewResolution({ actor, target, action: { id: 'attaque-1', type: 'attack', base: 60, damage: 4 }, roll: 40, baseRevision: 3 });
  assert.notEqual(first.resolutionId, later.resolutionId);
});

test('E12 résolution — double application même ID reste unique et le journal borné', () => {
  const preview = previewResolution({ resolutionId: 'same-action', actor: { id: 'a', states: [] }, target, action: { type: 'attack', base: 60, damage: 4 }, roll: 42, baseRevision: 1 });
  const current = { revision: 1, participants: [target], appliedResolutionIds: [] };
  const applied = applyResolution(preview, current);
  assert.equal(applyResolution(preview, applied.state).status, 'duplicate');
  let state = { revision: 0, participants: [], appliedResolutionIds: [] };
  for (let i = 0; i < MAX_APPLIED_RESOLUTION_IDS + 5; i++) {
    state = applyResolution(previewResolution({ resolutionId: `r-${i}`, actor: { id: 'a', states: [] }, action: { type: 'test', base: 60 }, roll: 42, baseRevision: i }), state).state;
  }
  assert.equal(state.appliedResolutionIds.length, MAX_APPLIED_RESOLUTION_IDS);
});
