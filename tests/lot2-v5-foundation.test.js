import test from 'node:test';
import assert from 'node:assert/strict';
import { previewV5Test, selectV5Test, summarizeV5Advantage, reverseV5Roll, resolveV5Opposition } from '../js/core/v5-roll.js';
import { previewMomentumEvents, previewMomentumCost } from '../js/core/v5-momentum.js';
import { buildV5RollDecision, selectV5Decision } from '../js/core/v5-decision.js';
const origins = n => Array.from({ length: n }, (_, i) => ({ id: `origin-${i}` }));
const selected = input => selectV5Test(previewV5Test(input), 'keep');

test('V5: optional inversion keeps both choices and never chooses for the player', () => {
  const p = previewV5Test({ score: 70, roll: 42, kind: 'ranged', advantageSources: origins(1) });
  assert.equal(p.choiceRequired, true);
  assert.deepEqual(p.options.map(x => [x.id, x.result.roll, x.result.sl]), [['keep', 42, 3], ['reverse', 24, 5]]);
  assert.equal(selectV5Test(p, 'keep').initialRoll, 42);
  assert.equal(selectV5Test(p, 'reverse').reversed, true);
  assert.throws(() => selectV5Test(p, 'unavailable'));
});
test('V5: disadvantage reverses only when worse', () => {
  const p = previewV5Test({ score: 50, roll: 19, disadvantageSources: origins(1) });
  assert.equal(p.choiceRequired, false); assert.equal(p.forcedInversion, true);
  assert.equal(p.options[0].result.roll, 91); assert.equal(p.options[0].result.success, false);
  assert.throws(() => selectV5Test(p, 'keep'));
  assert.equal(previewV5Test({ score: 50, roll: 91, disadvantageSources: origins(1) }).options[0].result.roll, 91);
});
for (const [a, d, expected] of [[3, 1, 1], [1, 3, -1], [2, 2, 0], [3, 0, 2], [0, 3, -2]]) {
  test(`V5: ${a} advantage and ${d} disadvantage cancel one for one`, () => {
    assert.equal(summarizeV5Advantage({ advantageSources: origins(a), disadvantageSources: origins(d) }).slModifier, expected);
  });
}
test('V5: a double stays unchanged while extra sources still modify DR', () => {
  const p = previewV5Test({ score: 70, roll: 44, kind: 'ranged', advantageSources: origins(3) });
  assert.equal(p.options.length, 1); assert.equal(p.options[0].result.roll, 44);
  assert.equal(p.options[0].result.sl, 5); assert.equal(p.options[0].result.critical, true);
});
test('V5: same advantage source counted only once', () => {
  assert.equal(summarizeV5Advantage({ advantageSources: [{ id: 'talent-x' }, { id: 'talent-x' }] }).net, 1);
});
test('V5: DR difficulty can turn failure into success without changing skill', () => {
  const r = selected({ score: 48, roll: 70, slModifiers: [{ id: 'difficulty', amount: 4 }] });
  assert.equal(r.score, 48); assert.equal(r.sl, 1); assert.equal(r.success, true);
});
test('V5: signed zero survives JSON and distinguishes the original comparison', () => {
  const a = selected({ score: 48, roll: 49 });
  const b = selected({ score: 48, roll: 47 });
  assert.equal(a.sl, 0); assert.equal(a.success, false); assert.equal(a.zeroOutcome, 'marginalFailure');
  assert.equal(b.sl, 0); assert.equal(b.success, true); assert.equal(b.zeroOutcome, 'marginalSuccess');
  assert.equal(JSON.parse(JSON.stringify(a)).zeroOutcome, 'marginalFailure');
});
for (const roll of [1, 5]) test(`V5: ${roll} remains success despite severe penalties`, () => {
  const r = selected({ score: 0, roll, slModifiers: [{ id: 'difficulty', amount: -20 }] });
  assert.equal(r.success, true); assert.equal(r.sl, 0);
});
for (const roll of [96, 99, 100]) test(`V5: ${roll} remains failure despite very high score and bonus`, () => {
  const r = selected({ score: 150, roll, kind: 'ranged', slModifiers: [{ id: 'difficulty', amount: 20 }] });
  assert.equal(r.success, false); assert.equal(r.sl, 0); assert.equal(r.zeroOutcome, 'marginalFailure');
});
test('V5: 00 is 100 and cannot be reversed to zero', () => {
  assert.equal(reverseV5Roll('00'), 100); assert.equal(reverseV5Roll(10), 1);
  assert.equal(previewV5Test({ score: 40, roll: '00', advantageSources: origins(1) }).options.length, 1);
});
test('V5: skill criticals adjust SL, attack criticals preserve their SL', () => {
  assert.equal(selected({ score: 48, roll: 33 }).sl, 5);
  assert.equal(selected({ score: 48, roll: 33, kind: 'melee' }).sl, 1);
  assert.equal(selected({ score: 48, roll: 55 }).sl, -5);
  assert.equal(selected({ score: 48, roll: 55, kind: 'ranged' }).sl, -1);
});
test('V5: opposition is won on negative DR and tie belongs to the initiator', () => {
  assert.equal(resolveV5Opposition({ sl: -1 }, { sl: -4 }).netSl, 3);
  assert.equal(resolveV5Opposition({ sl: -2 }, { sl: -2 }).winner, 'initiator');
});
test('V5: strict invalid inputs and owned frozen outputs', () => {
  for (const roll of [0, 101, 1.5, NaN, 'bad']) assert.throws(() => previewV5Test({ score: 40, roll }));
  assert.throws(() => previewV5Test({ score: NaN, roll: 20 }));
  assert.throws(() => previewV5Test({ score: 40, roll: 20, slModifiers: [{ id: 'x', amount: Infinity }] }));
  const input = { score: 70, roll: 42, advantageSources: [{ id: 'x', label: 'Talent' }] };
  const before = structuredClone(input); const p = previewV5Test(input);
  assert.deepEqual(input, before); assert.throws(() => { p.options[0].result.roll = 1; });
  input.advantageSources[0].label = 'changed'; assert.equal(p.advantage.advantage[0].label, 'Talent');
});
test('Momentum: win in attack/defense or charge grants one binary state', () => {
  for (const type of ['opposedMeleeWon', 'chargeEnemy']) {
    assert.equal(previewMomentumEvents({ hasMomentum: false, events: [{ id: '1', type }] }).after, true);
    assert.equal(previewMomentumEvents({ hasMomentum: true, events: [{ id: '1', type }] }).after, true);
  }
});
for (const type of ['opposedMeleeLost', 'meleeTestFailed', 'combatPause', 'combatEnd']) test(`Momentum: ${type} removes it`, () => {
  assert.equal(previewMomentumEvents({ hasMomentum: true, events: [{ id: '1', type }] }).after, false);
});
test('Momentum: zero actual wounds or prevented state do not cause loss', () => {
  assert.equal(previewMomentumEvents({ hasMomentum: true, events: [{ id: '1', type: 'woundsLost', amount: 0 }] }).after, true);
  assert.equal(previewMomentumEvents({ hasMomentum: true, events: [{ id: '1', type: 'conditionAcquired', instances: 0 }] }).after, true);
  assert.equal(previewMomentumEvents({ hasMomentum: true, events: [{ id: '1', type: 'woundsLost', amount: 1 }] }).after, false);
  assert.equal(previewMomentumEvents({ hasMomentum: true, events: [{ id: '1', type: 'conditionAcquired', instances: 1 }] }).after, false);
});
test('Momentum: conservation covers only its declared reason; later wounds still remove it', () => {
  const input = { hasMomentum: true, events: [{ id: '1', type: 'opposedMeleeLost' }, { id: '2', type: 'woundsLost', amount: 1 }],
    exceptions: [{ talentId: 'talent-reversal', reason: 'oppositionLost', applies: true }] };
  const before = structuredClone(input); const p = previewMomentumEvents(input);
  assert.equal(p.details[0].after, true); assert.equal(p.after, false); assert.deepEqual(input, before);
});
test('Momentum: an extra paid attack consumes both state and its payment quota', () => {
  const p = previewMomentumCost({ hasMomentum: true, paidExtraAttackUsedThisTurn: false, extraAttack: true });
  assert.equal(p.allowed, true); assert.equal(p.nextMomentum, false); assert.equal(p.nextPaidExtraAttackUsedThisTurn, true);
  assert.equal(previewMomentumCost({ hasMomentum: true, paidExtraAttackUsedThisTurn: true, extraAttack: true }).reason, 'paidExtraAttackLimit');
});
test('Momentum: waived cost does not require Momentum or consume the payment quota', () => {
  const p = previewMomentumCost({ hasMomentum: false, paidExtraAttackUsedThisTurn: true, extraAttack: true, waived: true });
  assert.equal(p.allowed, true); assert.equal(p.cost, null); assert.equal(p.nextMomentum, false);
  assert.equal(p.otherAbilityQuotasMustBeChecked, true);
});
test('Momentum: invalid or duplicated events rejected', () => {
  assert.throws(() => previewMomentumEvents({ hasMomentum: true, events: [{ id: '1', type: 'unknown' }] }));
  assert.throws(() => previewMomentumEvents({ hasMomentum: true, events: [{ id: '1', type: 'woundsLost', amount: -1 }] }));
  assert.throws(() => previewMomentumEvents({ hasMomentum: true, events: [{ id: '1', type: 'combatEnd' }, { id: '1', type: 'combatEnd' }] }));
});
const shotPreview = () => previewV5Test({ score: 70, roll: 42, kind: 'ranged', advantageSources: origins(1) });
const shot = r => ({ certainty: 'complete', hit: r.success, location: r.roll === 42 ? 'Bras gauche' : 'Bras droit',
  woundsLost: Math.max(1, 6 + r.sl - 3 - (r.roll === 42 ? 1 : 5)), costs: [], importantEffects: [] });
test('Decision: best DR hits better armour; recommend more actual wounds, not lower roll', () => {
  const p = buildV5RollDecision(shotPreview(), { evaluateOutcome: shot, baseRevision: 3 });
  assert.deepEqual(p.options.map(x => [x.summary.roll, x.summary.sl, x.summary.woundsLost]), [[42, 3, 5], [24, 5, 3]]);
  assert.equal(p.recommendation.optionId, 'keep'); assert.equal(p.recommendation.label, 'Plus de Blessures');
  assert.equal(p.presentation.detailsInitiallyCollapsed, true);
  const chosen = selectV5Decision(p, 'reverse', { currentRevision: 3 });
  assert.equal(chosen.result.test.roll, 24); assert.equal(chosen.summary.woundsLost, 3);
});
test('Decision: incomplete or tied outcomes do not invent a recommendation', () => {
  const unknown = buildV5RollDecision(shotPreview(), { evaluateOutcome: r => ({ ...shot(r), certainty: 'partial' }), baseRevision: 3 });
  assert.equal(unknown.recommendation, null);
  const same = buildV5RollDecision(shotPreview(), { evaluateOutcome: r => ({ ...shot(r), woundsLost: 4 }), baseRevision: 3 });
  assert.equal(same.recommendation, null); assert.equal(same.equivalentKnownWounds, true);
});
test('Decision: evaluate both with the shared callback, keep details out of the summary, reject stale selection', () => {
  const seen = []; const p = buildV5RollDecision(shotPreview(), { evaluateOutcome: r => { seen.push(r.roll); return shot(r); }, baseRevision: 3 });
  assert.deepEqual(seen, [42, 24]); assert.equal(Object.hasOwn(p.options[0].summary, 'details'), false);
  assert.throws(() => selectV5Decision(p, 'keep', { currentRevision: 4 }));
  assert.throws(() => selectV5Decision(p, 'invalid', { currentRevision: 3 }));
});
test('Decision: no implicit randomness and invalid result information rejected', () => {
  const initialRandom = Math.random; Math.random = () => { throw new Error('unexpected draw'); };
  try { assert.equal(buildV5RollDecision(shotPreview(), { evaluateOutcome: shot, baseRevision: 0 }).options.length, 2); }
  finally { Math.random = initialRandom; }
  assert.throws(() => buildV5RollDecision(shotPreview(), { evaluateOutcome: () => ({ hit: true, woundsLost: 4 }), baseRevision: 0 }));
  assert.throws(() => buildV5RollDecision(shotPreview(), { evaluateOutcome: r => ({ ...shot(r), woundsLost: NaN }), baseRevision: 0 }));
});

test('V5: a DR origin cannot be silently counted twice', () => {
  assert.throws(() => previewV5Test({ score: 50, roll: 30, slModifiers: [{ id: 'same', amount: 1 }, { id: 'same', amount: 1 }] }), /dupliquée/);
});
test('Decision: the comparison is immutable and retains a copy of resolver output', () => {
  const output = { certainty: 'complete', hit: true, location: 'Arm', woundsLost: 3, costs: [], importantEffects: [] };
  const p = buildV5RollDecision(shotPreview(), { evaluateOutcome: () => output, baseRevision: 0 });
  output.woundsLost = 100; output.costs.push('changed');
  assert.equal(p.options[0].details.action.woundsLost, 3);
  assert.deepEqual(p.options[0].summary.costs, []);
  assert.throws(() => { p.options[0].summary.woundsLost = 100; });
});
