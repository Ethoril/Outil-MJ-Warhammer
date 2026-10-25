import test from 'node:test';
import assert from 'node:assert/strict';
import { parseManyHeadsTrait, hasManyHeads, createHeadRegistry, planManyHeads, applyHeadCritical, restoreHead, manyHeadsReminders } from '../js/core/creature-heads.js';

const hydra = (traits = ['Many Heads 5', 'Bite']) => ({ id: 'h', name: 'Hydre', traits, hp: 40, maxHp: 40, caracs: {}, camp: 'monstres' });

test('T9 lecture du Trait : nombre en indice ou entre parenthèses, anglais ou français', () => {
  assert.deepEqual(parseManyHeadsTrait('Many Heads 5'), { key: 'manyHeads', name: 'Many Heads', count: 5 });
  assert.equal(parseManyHeadsTrait('Many Heads (3)').count, 3);
  assert.equal(parseManyHeadsTrait('Plusieurs têtes (2)').count, 2);
  assert.equal(parseManyHeadsTrait('Many Heads').count, null);
  assert.equal(parseManyHeadsTrait('Many Heads 1').count, null);
  assert.equal(parseManyHeadsTrait('Bite'), null);
  assert.equal(hasManyHeads(hydra()), true);
  assert.equal(hasManyHeads(hydra(['Bite'])), false);
});

test('T9 registre initial : une tête valide par tête, attaques gratuites par tête valide, Perception +2 DR', () => {
  const registry = createHeadRegistry(hydra());
  assert.equal(registry.length, 5);
  const plan = planManyHeads(hydra(['Many Heads 5', 'Bite', 'Horns']), registry);
  assert.equal(plan.available, true);
  assert.equal(plan.healthy, 5);
  assert.deepEqual(plan.freeAttacks.map(a => [a.key, a.count]), [['bite', 5], ['horns', 5]]);
  assert.deepEqual(plan.perception, { modifier: 2, unit: 'DR', cause: 'Plusieurs têtes (au moins deux têtes valides)' });
  assert.equal(plan.globalEffect, null);
  assert.deepEqual(planManyHeads(hydra(['Many Heads 5', 'Claw']), registry).freeAttacks, []);
});

test('T9 une Blessure Critique à la tête ne touche qu’une tête : pas d’effet global tant qu’il en reste une valide', () => {
  let state = createHeadRegistry(hydra());
  for (let i = 0; i < 4; i += 1) state = applyHeadCritical(hydra(), state, 'dead').registry;
  const plan = planManyHeads(hydra(), state);
  assert.equal(plan.healthy, 1);
  assert.equal(plan.globalEffect, null);
  assert.equal(plan.freeAttacks[0].count, 1);
  assert.equal(plan.perception, null);
});

test('T9 effet global : toutes les têtes neutralisées, le degré le moins grave s’applique', () => {
  const two = hydra(['Many Heads 2', 'Tongue']);
  const first = applyHeadCritical(two, undefined, 'stunned', 'head-1');
  assert.equal(first.plan.globalEffect, null);
  assert.equal(first.plan.healthy, 1);
  const second = applyHeadCritical(two, first.registry, 'dead', 'head-2');
  assert.equal(second.plan.globalEffect, 'stunned');
  assert.equal(second.plan.healthy, 0);
  assert.equal(second.plan.freeAttacks[0].count, 0);
  const same = applyHeadCritical(two, second.registry, 'dead', 'head-1');
  assert.equal(same.plan.globalEffect, 'dead');
  assert.equal(second.registry[0].state, 'stunned');
});

test('T9 l’ancien registre n’est pas modifié, une tête se remet en état valide', () => {
  const start = createHeadRegistry(hydra());
  const after = applyHeadCritical(hydra(), start, 'unconscious').registry;
  assert.equal(start[0].state, 'healthy');
  assert.equal(after[0].state, 'unconscious');
  assert.equal(restoreHead(after, 'head-1')[0].state, 'healthy');
});

test('T9 points non résolus : Trait absent, nombre inconnu, registre incohérent, effet ou tête inconnus', () => {
  assert.equal(planManyHeads(hydra(['Bite']), []).available, false);
  assert.equal(planManyHeads(hydra(['Many Heads', 'Bite']), []).available, false);
  assert.equal(planManyHeads(hydra(), [{ id: 'a', state: 'healthy' }]).available, false);
  assert.equal(applyHeadCritical(hydra(), undefined, 'burned').unresolved.length, 1);
  assert.equal(applyHeadCritical(hydra(), undefined, 'dead', 'zz').unresolved.length, 1);
  const full = Array.from({ length: 5 }, (_, i) => ({ id: `head-${i + 1}`, state: 'dead' }));
  assert.equal(applyHeadCritical(hydra(), full, 'dead').unresolved.length, 1);
  assert.equal(applyHeadCritical(hydra(['Bite']), undefined, 'dead').unresolved.length, 1);
});

test('T9 reçu et rappels', () => {
  const plan = planManyHeads(hydra(), undefined);
  assert.equal(plan.receipt.ability, 'Plusieurs têtes');
  assert.deepEqual(plan.receipt.freeAttacks, ['Morsure ×5']);
  // B2 : le rappel dit l'état des têtes, les attaques gratuites, la Perception, puis la règle des Blessures critiques.
  assert.match(manyHeadsReminders(hydra())[0], /5 tête\(s\) valide\(s\) sur 5/);
  assert.equal(manyHeadsReminders(hydra()).length, 4);
  assert.deepEqual(manyHeadsReminders(hydra(['Bite'])), []);
});
