import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTalentContracts, EXCLUDED_BASE_CHARACTERISTIC_TALENTS } from '../js/core/talent-contracts.js';
const hash = 'sha256:' + 'a'.repeat(64);
const ranged = { field: 'kind', op: 'eq', value: 'ranged' };
// Synthetic contracts exercise primitives; this does not activate any source talent.
const clause = (overrides = {}) => ({ id: 'base', event: 'damage.beforeProtection', role: 'attacker', when: [ranged],
  effect: { op: 'modifyDamage', stackGroup: 'synthetic-bonus', stack: 'max', amount: 1 }, ...overrides });
const contract = (overrides = {}) => ({ schemaVersion: 1, talentId: 'synthetic-talented-shot', edition: 'V5',
  status: 'validated', ruleVersion: 'synthetic.1', source: { effectHash: hash, reference: 'Test only' }, clauses: [clause()], ...overrides });
const evaluate = (overrides = {}) => evaluateTalentContracts({ contracts: [contract()],
  acquisitions: [{ talentId: 'synthetic-talented-shot', rank: 2 }], sourceHashes: { 'synthetic-talented-shot': hash },
  event: 'damage.beforeProtection', role: 'attacker', context: { kind: 'ranged' }, ...overrides });

test('contracts: a new talent is data with traceable operation, source and version', () => {
  const p = evaluate(); assert.equal(p.ready, true); assert.equal(p.proposals[0].amount, 1);
  assert.equal(p.proposals[0].origins[0].ruleVersion, 'synthetic.1');
  assert.equal(p.proposals[0].origins[0].source.effectHash, hash);
});
test('contracts: aim replaces the smaller bonus through explicit max stacking', () => {
  const aimed = clause({ id: 'aimed', when: [ranged, { field: 'aimed', op: 'eq', value: true }],
    effect: { op: 'modifyDamage', stackGroup: 'synthetic-bonus', stack: 'max', amount: 2 } });
  const p = evaluate({ contracts: [contract({ clauses: [clause(), aimed] })], context: { kind: 'ranged', aimed: true } });
  assert.equal(p.proposals.length, 1); assert.equal(p.proposals[0].amount, 2);
  assert.equal(p.proposals[0].origins.length, 2);
});
test('contracts: missing aim is an explicit pending question and prevents ready status', () => {
  const c = clause({ when: [ranged, { field: 'aimed', op: 'eq', value: true }] });
  const p = evaluate({ contracts: [contract({ clauses: [c] })] });
  assert.equal(p.ready, false); assert.deepEqual(p.unresolved[0].fields, ['aimed']); assert.equal(p.proposals.length, 0);
});
test('contracts: irrelevant melee does not ask missing aim', () => {
  const c = clause({ when: [ranged, { field: 'aimed', op: 'eq', value: true }] });
  const p = evaluate({ contracts: [contract({ clauses: [c] })], context: { kind: 'melee' } });
  assert.equal(p.ready, true); assert.deepEqual(p.unresolved, []); assert.equal(p.trace[0].status, 'notApplicable');
});
test('contracts: omitted rank does not become zero', () => {
  const c = clause({ effect: { op: 'modifyDamage', stackGroup: 'rank', stack: 'add', amount: { base: 1, perRank: 2 } } });
  assert.equal(evaluate({ contracts: [contract({ clauses: [c] })] }).proposals[0].amount, 5);
  const p = evaluate({ contracts: [contract({ clauses: [c] })], acquisitions: [{ talentId: 'synthetic-talented-shot' }] });
  assert.deepEqual(p.unresolved[0].fields, ['talent.rank']);
});
test('contracts: rank does not multiply a fixed amount by default', () => {
  assert.equal(evaluate({ acquisitions: [{ talentId: 'synthetic-talented-shot', rank: 4 }] }).proposals[0].amount, 1);
});
test('contracts: specialization is matched explicitly and missing data is exposed', () => {
  const c = clause({ when: [{ field: 'terrain', op: 'matchesSpecialization' }], requireSpecialization: true });
  const contracts = [contract({ clauses: [c] })];
  assert.equal(evaluate({ contracts, acquisitions: [{ talentId: 'synthetic-talented-shot', specialization: 'forest' }], context: { terrain: 'forest' } }).proposals.length, 1);
  assert.equal(evaluate({ contracts, acquisitions: [{ talentId: 'synthetic-talented-shot', specialization: 'forest' }], context: { terrain: 'city' } }).proposals.length, 0);
  assert.deepEqual(evaluate({ contracts, context: { terrain: 'forest' } }).unresolved[0].fields, ['talent.specialization']);
});
for (const [input, status] of [
  [{ contracts: [contract({ status: 'draft' })] }, 'draft'],
  [{ sourceHashes: {} }, 'sourceUnavailable'],
  [{ sourceHashes: { 'synthetic-talented-shot': 'sha256:' + 'b'.repeat(64) } }, 'sourceChanged'],
  [{ contracts: [] }, 'uncovered']
]) test(`contracts: ${status} never produces an effect`, () => {
  const p = evaluate(input); assert.equal(p.proposals.length, 0); assert.equal(p.trace[0].status, status);
});
test('contracts: the ten permanent characteristic talents stay excluded even with a validated contract', () => {
  assert.equal(EXCLUDED_BASE_CHARACTERISTIC_TALENTS.length, 10);
  for (const talentId of EXCLUDED_BASE_CHARACTERISTIC_TALENTS) {
    const p = evaluate({ contracts: [contract({ talentId })], acquisitions: [{ talentId, rank: 1 }], sourceHashes: { [talentId]: hash } });
    assert.equal(p.proposals.length, 0); assert.equal(p.trace[0].status, 'excludedBaseCharacteristic');
  }
});
test('contracts: defender and event clauses run only in their declared phase', () => {
  assert.equal(evaluate({ role: 'defender' }).proposals.length, 0);
  assert.equal(evaluate({ event: 'test.beforeRoll' }).proposals.length, 0);
  const c = clause({ role: 'defender' });
  assert.equal(evaluate({ role: 'defender', contracts: [contract({ clauses: [c] })] }).proposals.length, 1);
});
test('contracts: additive groups and unique quality effects retain both origins', () => {
  const add = clause({ effect: { op: 'modifyDamage', stackGroup: 'addition', stack: 'add', amount: 2 } });
  const quality = clause({ id: 'quality', effect: { op: 'addQuality', key: 'impact', stackGroup: 'impact', stack: 'unique' } });
  const p = evaluate({ contracts: [contract({ clauses: [add, { ...add, id: 'second' }, quality, { ...quality, id: 'second-quality' }] })] });
  assert.equal(p.proposals[0].amount, 4); assert.equal(p.proposals[1].op, 'addQuality');
  assert.equal(p.proposals[1].origins.length, 2);
});
test('contracts: different groups are not silently merged', () => {
  const c = clause({ id: 'other', effect: { op: 'modifyDamage', stackGroup: 'other', stack: 'max', amount: 2 } });
  assert.equal(evaluate({ contracts: [contract({ clauses: [clause(), c] })] }).proposals.length, 2);
});
test('contracts: group policy conflicts are rejected', () => {
  const c = clause({ id: 'other', effect: { op: 'modifyDamage', stackGroup: 'synthetic-bonus', stack: 'add', amount: 2 } });
  assert.throws(() => evaluate({ contracts: [contract({ clauses: [clause(), c] })] }), /cumul/);
});
test('contracts: unsupported operations, formulas and costs fail explicitly', () => {
  for (const effect of [
    { op: 'changeCharacteristic', stackGroup: 'x', stack: 'add', amount: 5 },
    { op: 'modifyDamage', stackGroup: 'x', stack: 'add', amount: 'rank * 2' },
    { op: 'modifyDamage', stackGroup: 'x', stack: 'add', amount: 1, cost: 'momentum' }
  ]) assert.throws(() => evaluate({ contracts: [contract({ clauses: [clause({ effect })] })] }));
  assert.throws(() => evaluate({ contracts: [contract({ clauses: [clause({ quota: 'oncePerTurn' })] })] }), /non couvert/);
});
test('contracts: unsupported predicates and hidden nested formulas are rejected', () => {
  assert.throws(() => evaluate({ contracts: [contract({ clauses: [clause({ when: [{ field: 'unknown', op: 'eq', value: true }] })] })] }));
  assert.throws(() => evaluate({ contracts: [contract({ clauses: [clause({ effect: { op: 'modifyDamage', stack: 'add', stackGroup: 'x', amount: { base: 1, perRank: 1, expression: 'x' } } })] })] }));
});
test('contracts: duplicate identities and unconverted editions are rejected', () => {
  assert.throws(() => evaluate({ contracts: [contract(), contract()] }));
  assert.throws(() => evaluate({ acquisitions: [{ talentId: 'synthetic-talented-shot', rank: 1 }, { talentId: 'synthetic-talented-shot', rank: 2 }] }));
  assert.throws(() => evaluate({ contracts: [contract({ edition: 'V4' })] }));
});
test('contracts: different specialized acquisitions can coexist', () => {
  const c = clause({ when: [{ field: 'terrain', op: 'matchesSpecialization' }] });
  const p = evaluate({ contracts: [contract({ clauses: [c] })], context: { terrain: 'forest' },
    acquisitions: [{ talentId: 'synthetic-talented-shot', specialization: 'forest' }, { talentId: 'synthetic-talented-shot', specialization: 'city' }] });
  assert.equal(p.proposals.length, 1); assert.equal(p.proposals[0].origins[0].specialization, 'forest');
});
test('contracts: named loss exceptions cannot become blanket Momentum immunity', () => {
  const c = clause({ event: 'momentum.beforeLoss', when: [{ field: 'momentum.lossReason', op: 'eq', value: 'oppositionLost' }],
    effect: { op: 'preventMomentumLoss', key: 'oppositionLost', stackGroup: 'guard', stack: 'unique' } });
  const contracts = [contract({ clauses: [c] })];
  assert.equal(evaluate({ contracts, event: 'momentum.beforeLoss', context: { momentum: { lossReason: 'oppositionLost' } } }).proposals.length, 1);
  assert.equal(evaluate({ contracts, event: 'momentum.beforeLoss', context: { momentum: { lossReason: 'woundsLost' } } }).proposals.length, 0);
});
test('contracts: preview does not mutate inputs and the plan survives JSON unchanged', () => {
  const contracts = [contract()], before = structuredClone(contracts);
  const p = evaluate({ contracts }); assert.deepEqual(contracts, before);
  assert.ok(Object.isFrozen(p.proposals[0].origins[0]));
  assert.deepEqual(JSON.parse(JSON.stringify(p)), p);
});
test('contracts: unsafe rank arithmetic cannot create unbounded effects', () => {
  const c = clause({ effect: { op: 'modifyDamage', stackGroup: 'x', stack: 'add', amount: { base: 0, perRank: 2 } } });
  assert.throws(() => evaluate({ contracts: [contract({ clauses: [c] })], acquisitions: [{ talentId: 'synthetic-talented-shot', rank: Number.MAX_SAFE_INTEGER }] }));
});

test('contracts: test phase yields distinct DR, Advantage and Disadvantage proposals', () => {
  const clauses = [
    clause({ id: 'dr', event: 'test.beforeRoll', effect: { op: 'modifySL', amount: -1, stackGroup: 'dr', stack: 'add' } }),
    clause({ id: 'a', event: 'test.beforeRoll', effect: { op: 'grantAdvantage', stackGroup: 'a', stack: 'unique' } }),
    clause({ id: 'd', event: 'test.beforeRoll', effect: { op: 'grantDisadvantage', stackGroup: 'd', stack: 'unique' } })
  ];
  const p = evaluate({ event: 'test.beforeRoll', contracts: [contract({ clauses })] });
  assert.deepEqual(p.proposals.map(x => x.op), ['modifySL', 'grantAdvantage', 'grantDisadvantage']);
  assert.equal(p.proposals[0].amount, -1);
  assert.throws(() => evaluate({ contracts: [contract({ clauses: [clause({ effect: clauses[0].effect })] })] }), /phase/);
});
test('contracts: condition acquisition reduction is scoped and cannot be negative', () => {
  const c = clause({ event: 'condition.beforeAcquire', when: [{ field: 'condition.id', op: 'eq', value: 'bleeding' }],
    effect: { op: 'reduceConditionAcquisition', key: 'bleeding', stackGroup: 'bleeding-reduction', stack: 'max', amount: 1 } });
  assert.equal(evaluate({ event: 'condition.beforeAcquire', context: { condition: { id: 'bleeding' } }, contracts: [contract({ clauses: [c] })] }).proposals[0].amount, 1);
  assert.equal(evaluate({ event: 'condition.beforeAcquire', context: { condition: { id: 'stunned' } }, contracts: [contract({ clauses: [c] })] }).proposals.length, 0);
  assert.throws(() => evaluate({ contracts: [contract({ clauses: [{ ...c, effect: { ...c.effect, amount: -1 } }] })] }));
});
test('contracts: declared set membership and numeric bounds use known context', () => {
  const c = clause({ when: [{ field: 'weapon.group', op: 'in', value: ['bow', 'crossbow'] }, { field: 'weapon.reach', op: 'gte', value: 2 }] });
  assert.equal(evaluate({ contracts: [contract({ clauses: [c] })], context: { weapon: { group: 'bow', reach: 2 } } }).proposals.length, 1);
  assert.equal(evaluate({ contracts: [contract({ clauses: [c] })], context: { weapon: { group: 'bow', reach: 1 } } }).proposals.length, 0);
  assert.deepEqual(evaluate({ contracts: [contract({ clauses: [c] })], context: { weapon: { group: 'bow' } } }).unresolved[0].fields, ['weapon.reach']);
});
