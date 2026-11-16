import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PURSUIT_CATCH_DR, PURSUIT_SOURCE, pursuitMovementOf, pickPursuitPair, movementVerdict, suggestFactors, obstacleCountRequired,
  drawObstacle, freeObstacle, evaluatePursuit, pursuitOpposition, pursuitObstacleSide
} from '../../../js/core/v5-pursuit.js';
import { PURSUIT_OBSTACLES } from '../../../js/data/v5-pursuit-obstacles.js';

// Règle de poursuite, Livre de base V5 p. 158-159 (spec docs/specs/poursuite-v5, CA1-CA5, CA8-CA9, D10, D12-D16).
const deepFreeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(deepFreeze); } return value; };
const person = (id, M, extra = {}) => ({ id, name: id, caracs: { M }, states: [], extensions: { v5: {} }, ...extra });
const opposed = (pursuer, prey) => ({ pursuer: { sl: pursuer }, prey: { sl: prey } });
const base = (patch = {}) => ({ preyIds: ['f1'], pursuerIds: ['p1'], movement: { f1: 4, p1: 4 }, obstacleSide: 'prey', opposed: opposed(0, 0), factors: {}, obstacles: [], ...patch });

test('constantes nommées et sourcées', () => {
  assert.equal(PURSUIT_CATCH_DR, 6);
  assert.equal(PURSUIT_SOURCE, 'Livre de base V5, p. 158-159');
});

test('Mouvement compté : courant, monture pour un cavalier monté, null si inconnu (D14)', () => {
  const horse = person('cheval', 9), rider = person('cavalier', 4, { extensions: { v5: { mounted: true, mountId: 'cheval' } } });
  assert.equal(pursuitMovementOf(person('a', 4)), 4);
  assert.equal(pursuitMovementOf(person('a', 4, { states: [{ name: 'Sonné', level: 1 }] })), 2);
  assert.equal(pursuitMovementOf(rider, [horse, rider]), 9);
  assert.equal(pursuitMovementOf(rider, [rider]), null);
  assert.equal(pursuitMovementOf({ id: 'x', caracs: {} }), null);
});

test('paire : plus rapide poursuivant contre plus lent fuyard, correction du MJ (CA1, D10)', () => {
  const movement = { p1: 4, p2: 6, f1: 5, f2: 3 };
  assert.deepEqual(pickPursuitPair({ preyIds: ['f1', 'f2'], pursuerIds: ['p1', 'p2'], movement }), { pursuerId: 'p2', preyId: 'f2', forced: false });
  assert.deepEqual(pickPursuitPair({ preyIds: ['f1', 'f2'], pursuerIds: ['p1', 'p2'], movement, override: { pursuerId: 'p1', preyId: 'f1' } }), { pursuerId: 'p1', preyId: 'f1', forced: true });
  assert.deepEqual(pickPursuitPair({ preyIds: ['f1', 'f2'], pursuerIds: ['p1', 'p2'], movement: { p1: 4, p2: 4, f1: 3, f2: 3 } }), { pursuerId: 'p1', preyId: 'f1', forced: false });
  assert.equal(pickPursuitPair({ preyIds: [], pursuerIds: ['p1'], movement }), null);
});

test('Mouvement double : double juste met fin, un point de moins continue (CA3)', () => {
  const run = (pursuer, prey) => movementVerdict({ preyIds: ['f'], pursuerIds: ['p'], movement: { p: pursuer, f: prey } });
  assert.deepEqual(run(8, 4) && { kind: run(8, 4).kind, reason: run(8, 4).reason }, { kind: 'caught', reason: 'double-movement' });
  assert.equal(run(7, 4), null);
  assert.equal(run(4, 8).kind, 'escaped');
  assert.equal(run(4, 7), null);
  assert.match(run(8, 4).label, /poursuivants/);
  assert.equal(run(0, 0), null);
  assert.equal(movementVerdict({ preyIds: ['f'], pursuerIds: ['p'], movement: { p: 8 } }), null);
  // le plus lent d'un camp contre le plus rapide de l'autre
  assert.equal(movementVerdict({ preyIds: ['f1', 'f2'], pursuerIds: ['p1', 'p2'], movement: { p1: 8, p2: 5, f1: 4, f2: 2 } }), null);
  assert.equal(movementVerdict({ preyIds: ['f1', 'f2'], pursuerIds: ['p1', 'p2'], movement: { p1: 8, p2: 8, f1: 4, f2: 2 } }).kind, 'caught');
});

test('fin à 6 DR : bornes 5 et 6 dans les deux sens (CA2)', () => {
  assert.equal(evaluatePursuit(base({ opposed: opposed(5, 0) })).outcome, null);
  const caught = evaluatePursuit(base({ opposed: opposed(6, 0) }));
  assert.deepEqual([caught.outcome.kind, caught.outcome.reason, caught.netSl], ['caught', 'dr6', 6]);
  assert.equal(evaluatePursuit(base({ opposed: opposed(0, 5) })).outcome, null);
  const escaped = evaluatePursuit(base({ opposed: opposed(0, 6) }));
  assert.deepEqual([escaped.outcome.kind, escaped.outcome.reason], ['escaped', 'dr6']);
});

test('égalité de DR : le poursuivant l’emporte et reçoit « Test gagné » (D16)', () => {
  assert.deepEqual(pursuitOpposition(opposed(2, 2)), { netSl: 0, winner: 'pursuer' });
  assert.deepEqual(pursuitOpposition(opposed(1, 2)), { netSl: -1, winner: 'prey' });
  assert.equal(pursuitOpposition({ pursuer: { sl: 2 }, prey: null }), null);
  const args = { opposed: opposed(2, 2), movement: { p1: 4, f1: 4 }, preyIds: ['f1'], pursuerIds: ['p1'] };
  assert.equal(suggestFactors({ ...args, obstacleSide: 'pursuers' }).won, true);
  assert.equal(suggestFactors({ ...args, obstacleSide: 'prey' }).won, false);
  assert.equal(evaluatePursuit(base({ opposed: opposed(2, 2) })).winner, 'pursuer');
});

test('Mouvement double prime sur le Test ; sans Test opposé la poursuite attend', () => {
  assert.equal(evaluatePursuit(base({ movement: { p1: 8, f1: 4 }, opposed: null })).outcome.reason, 'double-movement');
  assert.equal(evaluatePursuit(base({ opposed: { pursuer: { sl: 1 }, prey: null } })).pending, 'opposed');
});

test('facteurs suggérés : Test gagné et Mouvement, terrain au MJ (D13)', () => {
  const common = { preyIds: ['f1', 'f2'], pursuerIds: ['p1'], obstacleSide: 'prey' };
  assert.deepEqual(suggestFactors({ ...common, opposed: opposed(0, 1), movement: { f1: 5, f2: 5, p1: 4 } }), { won: true, speed: true, terrain: false });
  assert.deepEqual(suggestFactors({ ...common, opposed: opposed(0, 1), movement: { f1: 5, f2: 4, p1: 4 } }), { won: true, speed: false, terrain: false });
  assert.deepEqual(suggestFactors({ ...common, opposed: null, movement: {} }), { won: false, speed: false, terrain: false });
});

test('nombre d’Obstacles exigés : 1 à 6 personnages, 0 à 3 facteurs (CA4)', () => {
  for (let size = 1; size <= 6; size++) {
    assert.equal(obstacleCountRequired(size, 0), size);
    assert.equal(obstacleCountRequired(size, 1), Math.ceil(size / 2));
    assert.equal(obstacleCountRequired(size, 2), Math.ceil(size / 2));
    assert.equal(obstacleCountRequired(size, 3), 1);
  }
  assert.equal(obstacleCountRequired(5, 1), 3);
  assert.throws(() => obstacleCountRequired(3, 4), RangeError);
  assert.throws(() => obstacleCountRequired(3, -1), RangeError);
  assert.throws(() => obstacleCountRequired(3, 1.5), RangeError);
  assert.throws(() => obstacleCountRequired(0, 1), RangeError);
});

test('d10 injecté de 1 à 10 : obstacle de la table avec ses compétences (CA8)', () => {
  for (let d10 = 1; d10 <= 10; d10++) {
    const obstacle = drawObstacle(d10);
    assert.equal(obstacle.id, PURSUIT_OBSTACLES[d10 - 1].id);
    assert.equal(obstacle.free, false);
    assert.ok(obstacle.label && obstacle.skills.length >= 2);
  }
  assert.equal(drawObstacle(6).label, 'Terrain découvert : pure vitesse');
  assert.throws(() => drawObstacle(0), RangeError);
  assert.throws(() => drawObstacle(11), RangeError);
  assert.throws(() => drawObstacle(2.5), RangeError);
  const copy = drawObstacle(1); copy.skills[0].label = 'x';
  assert.equal(PURSUIT_OBSTACLES[0].skills[0].label, 'Athlétisme');
});

test('obstacle libre : intitulé et compétences, refus si vide (CA9)', () => {
  const obstacle = freeObstacle({ label: ' Pont de corde ', skills: ['Équilibre', 'Escalade'] });
  assert.deepEqual([obstacle.id, obstacle.label, obstacle.free, obstacle.skills.map(row => row.prefix)], ['libre', 'Pont de corde', true, ['equilibre', 'escalade']]);
  assert.throws(() => freeObstacle({ label: '', skills: ['Escalade'] }), TypeError);
  assert.throws(() => freeObstacle({ label: 'Pont', skills: [] }), TypeError);
});

test('Obstacles : le groupe atteint le nombre de réussites, ou perd quand tous ont joué (D12)', () => {
  const group = ['f1', 'f2', 'f3'];
  const row = (id, success) => ({ participantId: id, test: { success } });
  const run = (obstacles, factors = {}) => evaluatePursuit(base({ preyIds: group, movement: { f1: 4, f2: 4, f3: 4, p1: 4 }, obstacles, factors }));
  assert.equal(run([row('f1', true), row('f2', true)]).pending, 'obstacles');
  const win = run([row('f1', true), row('f2', true), row('f3', true)]);
  assert.deepEqual([win.outcome.kind, win.outcome.reason, win.required], ['escaped', 'obstacles', 3]);
  assert.equal(run([row('f1', true), row('f2', true)], { won: true }).outcome.kind, 'escaped');
  const lost = run([row('f1', true), row('f2', false), row('f3', false)]);
  assert.equal(lost.outcome.kind, 'caught');
  assert.deepEqual(lost.partial, { crossedIds: ['f1'], canEscapeAnyway: true, canContinueAlone: false });
  assert.equal(run([row('f1', false), row('f2', false), row('f3', false)]).partial, null);
});

test('camp des poursuivants qui franchit les Obstacles : issue partielle D15', () => {
  const state = base({ obstacleSide: 'pursuers', pursuerIds: ['p1', 'p2'], movement: { f1: 4, p1: 4, p2: 4 },
    obstacles: [{ participantId: 'p1', test: { success: true } }, { participantId: 'p2', test: { success: false } }] });
  const lost = evaluatePursuit(state);
  assert.equal(lost.outcome.kind, 'escaped');
  assert.deepEqual(lost.partial, { crossedIds: ['p1'], canEscapeAnyway: false, canContinueAlone: true });
  const won = evaluatePursuit({ ...state, factors: { terrain: true }, obstacles: [{ participantId: 'p2', test: { success: true } }] });
  assert.equal(won.outcome.kind, 'caught');
});

test('camp des Obstacles : PJ d’un côté, des deux côtés, aucun (D12)', () => {
  const isPlayer = id => id.startsWith('pj');
  assert.equal(pursuitObstacleSide({ preyIds: ['pj1'], pursuerIds: ['o1'], isPlayer }), 'prey');
  assert.equal(pursuitObstacleSide({ preyIds: ['o1'], pursuerIds: ['pj1'], isPlayer }), 'pursuers');
  assert.equal(pursuitObstacleSide({ preyIds: ['pj1'], pursuerIds: ['pj2'], isPlayer }), 'none');
  assert.equal(pursuitObstacleSide({ preyIds: ['o1'], pursuerIds: ['o2'], isPlayer }), null);
  const both = evaluatePursuit(base({ obstacleSide: 'none', opposed: opposed(1, 3) }));
  assert.deepEqual([both.outcome.kind, both.outcome.reason, both.pending], ['escaped', 'opposed', null]);
  assert.equal(evaluatePursuit(base({ obstacleSide: null })).pending, 'obstacle-side');
});

test('fonctions pures : entrées gelées, aucune mutation (CA5)', () => {
  const state = deepFreeze(base({ obstacles: [{ participantId: 'f1', test: { success: true } }], factors: { won: true } }));
  assert.doesNotThrow(() => {
    evaluatePursuit(state);
    pickPursuitPair(state); movementVerdict(state); suggestFactors(state);
    pursuitMovementOf(deepFreeze(person('a', 4)), deepFreeze([person('b', 4)]));
  });
  const result = evaluatePursuit(state);
  assert.equal(result.outcome.kind, 'escaped');
});
