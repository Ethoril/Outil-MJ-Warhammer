import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveV5ConditionTestContext } from '../js/core/v5-test-context.js';

const context = extra => ({ characteristic: 'Soc', isAction: false, ...extra });

test('E4 contexte — alias français/anglais agrégés; un seul pire DR entre États distincts', () => {
  const actor = { states: [
    { key: 'extenue', name: 'Fatigued', level: 2 },
    { key: 'Sonné', name: 'Stunned', level: 1 },
    { key: 'empoisonne', name: 'Poisoned', level: 3 },
    { key: 'extenué', name: 'Exténué', level: 1 }
  ] };
  const before = structuredClone(actor);
  const result = resolveV5ConditionTestContext(actor, context());
  assert.equal(result.ready, true);
  assert.deepEqual(result.levels, { extenue: 3, sonne: 1, empoisonne: 3 });
  assert.equal(result.slModifiers.length, 1);
  assert.equal(result.slModifiers[0].amount, -3);
  assert.deepEqual(actor, before);
});

test('E4 contexte — marqueurs de talents ignorés et conditions non cumulatives ramenées à une instance', () => {
  const actor = { states: [
    { key: 'brise', name: 'Brisé', level: 8, kind: 'talent-active' },
    { key: 'a-terre', name: 'À terre', level: 4 },
    { key: 'prone', name: 'Prone', level: 2 },
    { key: 'souille', name: 'Souillé', level: 3 }
  ] };
  const result = resolveV5ConditionTestContext(actor, context({ involvesMovement: true }));
  assert.equal(result.ready, true);
  assert.equal(result.levels.brise, undefined);
  assert.equal(result.levels.aterre, 1);
  assert.equal(result.levels.souille, 1);
  assert.deepEqual(result.disadvantageSources.map(row => row.label), ['À terre']);
});

test('E4 contexte — normalise les états historiques sans confondre leur durée avec le niveau', () => {
  const result = resolveV5ConditionTestContext({ states: ['Sonné|2'] }, context());
  assert.equal(result.ready, true);
  assert.equal(result.levels.sonne, 1);
  assert.equal(result.slModifiers[0].amount, -1);
});

test('E4 contexte — Clarté d’esprit écarte seulement Sonné pour Int/I/FM/Soc avec provenance', () => {
  const actor = { states: [{ key: 'sonne', name: 'Sonné', level: 2 }],
    extensions: { v5: { specialStates: { clarityOfThought: true } } } };
  for (const characteristic of ['Int', 'I', 'FM', 'Soc']) {
    const result = resolveV5ConditionTestContext(actor, context({ characteristic }));
    assert.equal(result.ready, true);
    assert.equal(result.levels.sonne, 2);
    assert.deepEqual(result.slModifiers, []);
    assert.match(JSON.stringify(result.ignoredPenaltySources), /Clarté|clarityOfThought/);
    assert.match(JSON.stringify(result.ignoredPenaltySources), /p\. 251/);
  }
  const physical = resolveV5ConditionTestContext(actor, context({ characteristic: 'CC' }));
  assert.deepEqual(physical.slModifiers.map(row => row.amount), [-2]);
  assert.deepEqual(physical.ignoredPenaltySources, []);
});

test('E4 contexte — Exténué mental avec Clarté bloque tant que ignoreFatiguePenalties n’est pas projeté', () => {
  const result = resolveV5ConditionTestContext({
    states: [{ key: 'extenue', name: 'Exténué', level: 2 }],
    extensions: { v5: { specialStates: { clarityOfThought: true } } }
  }, { characteristic: 'Soc' });
  assert.equal(result.ready, false);
  assert.equal(result.levels.extenue, 2);
  assert.ok(result.needsInput.some(row => row.field === 'clarityFatigueProjection'));
  assert.match(result.needsInput.find(row => row.field === 'clarityFatigueProjection').label, /p\. 251|fatigue/i);
});

test('E4 contexte — conflit de pénalités exige décision DIV-05 motivée', () => {
  const actor = { states: [{ key: 'sonne', name: 'Sonné', level: 2 }, { key: 'souille', name: 'Souillé', level: 1 }] };
  const unresolved = resolveV5ConditionTestContext(actor, context({ characteristic: 'Soc' }));
  assert.equal(unresolved.ready, false);
  assert.ok(unresolved.needsInput.some(row => row.field === 'conditionPenaltyMode'));
  assert.ok(unresolved.needsInput.some(row => row.field === 'conditionPenaltyReason'));
  assert.equal(unresolved.conditionPenaltyMode, null);
  assert.equal(unresolved.conditionPenaltyReason, null);

  const missingReason = resolveV5ConditionTestContext(actor, context({ characteristic: 'Soc', conditionPenaltyMode: 'disadvantage' }));
  assert.equal(missingReason.ready, false);
  assert.ok(missingReason.needsInput.some(row => row.field === 'conditionPenaltyReason'));

  const chosen = resolveV5ConditionTestContext(actor, context({ characteristic: 'Soc', conditionPenaltyMode: 'disadvantage', conditionPenaltyReason: 'Le MJ retient le Désavantage de Souillé.' }));
  assert.equal(chosen.ready, true);
  assert.equal(chosen.slModifiers.length, 0);
  assert.equal(chosen.disadvantageSources.length, 1);
  assert.deepEqual(chosen.arbitration, { decisionId: 'DIV-05', mode: 'disadvantage', reason: 'Le MJ retient le Désavantage de Souillé.' });
  assert.equal(chosen.conditionPenaltyMode, 'disadvantage');
  assert.equal(chosen.conditionPenaltyReason, 'Le MJ retient le Désavantage de Souillé.');
});
