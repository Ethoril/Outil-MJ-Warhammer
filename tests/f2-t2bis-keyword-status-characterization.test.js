import test from 'node:test';
import assert from 'node:assert/strict';
import { applyResolution, previewResolution } from '../js/core/resolution.js';
import { keywordMechanicalStatus } from '../js/core/keywords.js';

const pendingStatusCandidates = [
  'explosion', 'inflige', 'pistolet', 'piege-lame', 'a-enroulement', 'bouclier',
  'taille', 'parade', 'a-repetition', 'recharge', 'immobilisante', 'dispersion'
];

test('T2 bis characterization — candidate weapon qualities still have manual status before the contract update', () => {
  for (const id of pendingStatusCandidates) {
    assert.equal(keywordMechanicalStatus(id).status, 'manual', `${id} has not yet been declared covered`);
  }
});

test('T2 bis characterization — the next Action purges resolved combat records and preserves effects with separate lifecycles', () => {
  const resolvedKinds = ['weapon-explosion', 'salvo-artillery-hit', 'salvo-artillery-destroyed',
    'fumble-ally-hit', 'misfire', 'critical-follow-up', 'next-action-sl'];
  const preserved = [
    { id: 'move', kind: 'lose-next-move' },
    { id: 'late', kind: 'acts-last-next-round', round: 2 },
    { id: 'ankle', kind: 'twisted-ankle', location: 'left-leg', createdRound: 1, rounds: 2 },
    { id: 'bomb', kind: 'bomb-detonation', requiresTargetResolution: true }
  ];
  const actor = { id: 'actor', name: 'A', camp: 'allies', zone: 'active', hp: 20, maxHp: 20,
    caracs: { CC: 50, CT: 50, F: 30, E: 30 }, skills: [], states: [], equipment: [], armor: {},
    extensions: { v5: { combatEffects: [...resolvedKinds.map((kind, index) => ({ id: `resolved-${index}`, kind })), ...preserved] } } };
  const preview = previewResolution({ resolutionId: 't2bis-all-resolved-effects', actor, baseRevision: 0, round: 1, roll: 30,
    action: { type: 'test', attr: 'F', base: 40 },
    v5: { kind: 'test', context: { isAction: true, involvesMovement: false, requiresSight: false, reliesOnSight: false, usesFellowship: false } } });
  assert.deepEqual(preview.consumedCombatEffects, resolvedKinds.map((_, index) => `resolved-${index}`));
  const applied = applyResolution(preview, { revision: 0, round: 1, participants: [actor], appliedResolutionIds: [] });
  assert.equal(applied.status, 'applied');
  assert.deepEqual(applied.state.participants.find(row => row.id === 'actor').extensions.v5.combatEffects, preserved);
});

test('T2 bis characterization — non-action Tests do not consume action-scoped combat effects', () => {
  const actor = { id: 'actor', camp: 'allies', hp: 20, maxHp: 20, caracs: { F: 40 }, skills: [], states: [], equipment: [],
    extensions: { v5: { combatEffects: [{ id: 'fumble', kind: 'next-action-sl' }, { id: 'follow-up', kind: 'critical-follow-up' },
      { id: 'action', kind: 'lose-next-action' }, { id: 'explosion', kind: 'weapon-explosion' }] } } };
  const preview = previewResolution({ actor, resolutionId: 't2bis-non-action-effects', baseRevision: 0, round: 1, roll: 30,
    action: { type: 'test', attr: 'F', base: 40 }, v5: { kind: 'test', context: { isAction: false } } });
  assert.deepEqual(preview.consumedCombatEffects, []);
});
