// U8 lot L5a (CA4, Traits) : les Traits de mouvement et de sens, passés en clauses puis par combineEffects, donnent le même total
// que le calcul actuel (movementTestRules, senseTestRules). Adaptateurs purs, non branchés dans buildCombatTest (lot L5z).
import test from 'node:test';
import assert from 'node:assert/strict';
import { movementTestRules, movementTestClauses } from '../../../js/core/creature-movement.js';
import { senseTestRules, senseTestClauses } from '../../../js/core/creature-senses.js';
import { combineEffects, clauseEntries, validateEffectClause } from '../../../js/core/effect-engine.js';

const person = (id, camp, traits = [], caracs = { Ag: 40, E: 30, I: 30 }) => ({ id, camp, traits, caracs, zone: 'active' });
const total = clauses => combineEffects(clauseEntries(clauses)).totals.modifySL ?? 0;
const current = rows => rows.reduce((sum, row) => sum + row.amount, 0);

test('L5a mouvement : Amphibie en Natation, Arboricole en Escalade, Vol en tir, Marine hors de l\'eau = même total que movementTestRules', () => {
  const cases = [
    [person('a', 'pj', ['Amphibious']), { skillLabel: 'Natation', kind: 'melee' }],
    [person('a', 'pj', ['Arboreal']), { skillLabel: 'Escalade', kind: 'melee' }],
    [person('a', 'pj', ['Arboreal']), { skillLabel: 'Discrétion', kind: 'melee' }],
    [person('a', 'pj', ['Fly (100)']), { skillLabel: 'Arc', kind: 'ranged', context: { airborne: true } }],
    [person('a', 'pj', ['Fly (100)']), { skillLabel: 'Arc', kind: 'ranged', context: { airborne: false } }],
    [person('a', 'pj', ['Marine Creature']), { skillLabel: 'Athlétisme', kind: 'melee', context: { inWater: false } }],
    [person('a', 'pj', ['Marine Creature', 'Amphibious']), { skillLabel: 'Natation', kind: 'melee', context: { inWater: false } }],
    [person('a', 'pj', ['Bounce']), { skillLabel: 'Natation', kind: 'melee' }]
  ];
  for (const [actor, args] of cases) {
    const rows = movementTestRules({ actor, ...args });
    assert.equal(total(movementTestClauses({ actor, ...args })), current(rows), JSON.stringify([actor.traits, args]));
  }
});

test('L5a mouvement : une clause par modificateur, famille trait, validée, id repris du modificateur', () => {
  const actor = person('a', 'pj', ['Marine Creature', 'Amphibious']);
  const clauses = movementTestClauses({ actor, skillLabel: 'Natation', kind: 'melee', context: { inWater: false } });
  assert.deepEqual(clauses.map(clause => clause.id), movementTestRules({ actor, skillLabel: 'Natation', kind: 'melee', context: { inWater: false } }).map(row => row.id));
  assert.equal(clauses.length, 2);
  for (const clause of clauses) { assert.equal(clause.bearer.kind, 'trait'); assert.equal(validateEffectClause(clause), true); }
});

test('L5a sens : Caméléon (tir, vue) = même total que senseTestRules', () => {
  const chameleon = person('c', 'ennemi', ['Chameleon']), hero = person('h', 'pj');
  const cases = [
    { actor: hero, opponent: chameleon, skillLabel: 'Arc', kind: 'ranged' },
    { actor: hero, opponent: chameleon, skillLabel: 'Perception', kind: 'melee', context: { targetMoving: true } },
    { actor: hero, opponent: chameleon, skillLabel: 'Perception', kind: 'melee', context: { targetMoving: false } },
    { actor: hero, opponent: chameleon, skillLabel: 'Arc', kind: 'ranged', defending: true }
  ];
  for (const args of cases) assert.equal(total(senseTestClauses(args)), current(senseTestRules(args).modifiers), JSON.stringify(args.context ?? args.kind));
});

test('L5a sens : Perturbant de trois sources à portée = −2 DR une seule fois, comme le calcul actuel', () => {
  const hero = person('h', 'pj'), sources = ['d1', 'd2', 'd3'].map(id => person(id, 'ennemi', ['Distracting']));
  const args = { actor: hero, opponent: sources[0], participants: [hero, ...sources], skillLabel: 'Corps à corps', kind: 'melee', context: { distractingInRange: true } };
  const clauses = senseTestClauses(args);
  assert.equal(clauses.length, 3, 'une clause par source');
  assert.equal(current(senseTestRules(args).modifiers), -2);
  assert.equal(total(clauses), -2);
  const combined = combineEffects(clauseEntries(clauses));
  assert.equal(combined.groups.length, 1);
  assert.equal(combined.groups[0].dropped.length, 2, 'les sources en trop restent listées, non cumulées');
});

test('L5a sens : Perturbant hors portée, allié ou non déclaré = aucune clause, comme senseTestRules', () => {
  const hero = person('h', 'pj'), ally = person('d1', 'pj', ['Distracting']), foe = person('d2', 'ennemi', ['Distracting']);
  const base = { actor: hero, opponent: foe, participants: [hero, ally, foe], skillLabel: 'Corps à corps', kind: 'melee' };
  assert.deepEqual(senseTestClauses(base), []);
  const near = senseTestClauses({ ...base, context: { distractingInRange: true } });
  assert.equal(near.length, 1);
  assert.equal(near[0].bearer.sourceId, 'd2:trait:distracting', 'l\'allié ne compte pas');
  assert.equal(total(near), current(senseTestRules({ ...base, context: { distractingInRange: true } }).modifiers));
});

test('L5a Q11 un Trait se somme avec un sort, une prière et un État (table entre familles)', () => {
  const actor = person('a', 'pj', ['Amphibious']);
  const entries = [
    ...clauseEntries(movementTestClauses({ actor, skillLabel: 'Natation', kind: 'melee' })),
    { bearer: { kind: 'spell', sourceId: 's', layerId: 'spell:0' }, effect: { op: 'modifySL', amount: 1, stack: 'bestBonusWorstPenalty', stackGroup: 'magic-test' } },
    { bearer: { kind: 'prayer', sourceId: 'p', layerId: 'prayer:0' }, effect: { op: 'modifySL', amount: 1, stack: 'bestBonusWorstPenalty', stackGroup: 'magic-test' } },
    { bearer: { kind: 'condition', sourceId: 'sonne' }, effect: { op: 'modifySL', amount: -1, stack: 'strongest', stackGroup: 'condition-penalty' } }
  ];
  const combined = combineEffects(entries);
  assert.equal(combined.ready, true);
  assert.equal(combined.totals.modifySL, 1 + 1 + 1 - 1);
});
