import test from 'node:test';
import assert from 'node:assert/strict';
import { parseState } from '../js/core/sanitize.js';
import { computeEndOfTurn } from '../js/core/combat.js';

test('parseState', () => {
  assert.deepEqual(parseState('Sonné'), { name: 'Sonné', turns: null });
  assert.deepEqual(parseState('Hémorragique|3'), { name: 'Hémorragique', turns: 3 });
  assert.deepEqual(parseState('Aveuglé|abc'), { name: 'Aveuglé', turns: null });
});

test('computeEndOfTurn — Hémorragique', () => {
  const p = { name: 'Test', hp: 10, states: ['Hémorragique|2', 'Hémorragique'] };
  const res = computeEndOfTurn(p, 5);
  assert.equal(res.hpDelta, -2);
  assert.equal(res.newHp, 8);
  assert.equal(res.logs.length, 1);
});

test('computeEndOfTurn — Enflammé', () => {
  // BE = 3 (caracs.E = 35), armor.lowest = 1, flameLevels = 2
  // d10Roll = 5 -> fireDmg = max(0, 5 - 3 - 1 + 2) = 3
  const p = {
    name: 'Pyromane', hp: 10,
    caracs: { E: 35 },
    armor: { head: 2, body: 1, arms: 3, legs: 2 },
    states: ['Enflammé', 'Enflammé|3']
  };
  const res = computeEndOfTurn(p, 5);
  assert.equal(res.hpDelta, -3);
  assert.equal(res.newHp, 7);
});

test('computeEndOfTurn — Dissipation de Surpris et décrémentation des durées', () => {
  const p = {
    name: 'Guetteur', hp: 10,
    states: ['Surpris', 'Sonné|2', 'Aveuglé|1', 'Inconscient']
  };
  const res = computeEndOfTurn(p, 1);
  assert.deepEqual(res.nextStates.map(s => [s.name, s.duration]), [['Sonné', 1], ['Inconscient', null]]);
});

test('computeEndOfTurn — Passage à Inconscient si PV tombent à 0', () => {
  const p = {
    name: 'Victime', hp: 1,
    states: ['Hémorragique']
  };
  const res = computeEndOfTurn(p, 1);
  assert.equal(res.newHp, 0);
  assert.ok(res.nextStates.some(s => s.name === 'Inconscient'));
});
