import { test } from 'node:test';
import assert from 'node:assert/strict';
import { friseModel, friseLabel } from '../../../js/ui/combat-frise.js';

// Refonte de l'interface, lot E4c (spec S2 bis, CA24-CA25) : la frise propose « Jouer son tour maintenant » sur le portrait
// de celui qui agit hors de son tour, grisé avec la raison s'il a déjà joué ; un tour avancé est marqué « a joué ».
const person = (id, name) => ({ id, name, kind: 'Créature', hp: 10, maxHp: 10, zone: 'active', extensions: {}, states: [] });
const four = () => [person('a', 'A'), person('b', 'B'), person('c', 'C'), person('d', 'D')];
const ctx = (active, { currentActorId, actorId, playedIds, playNow } = {}) => ({
  active, combat: { round: 1, currentActorId }, started: true,
  turnActor: active.find(row => row.id === currentActorId), actor: active.find(row => row.id === (actorId || currentActorId)),
  camp: () => 'ennemi', ...(playedIds ? { playedIds } : {}), ...(playNow ? { playNow } : {})
});

test('« a joué » suit la liste du store quand elle est fournie (tour avancé compris)', () => {
  const model = friseModel(ctx(four(), { currentActorId: 'b', playedIds: ['a', 'd'] }));
  assert.deepEqual(model.filter(row => row.joue).map(row => row.id), ['a', 'd']);
  assert.match(friseLabel(model.find(row => row.id === 'd')), /a joué ce round/);
});

test('sans la liste : rang avant le tour en cours, comme au lot E1', () => {
  const model = friseModel(ctx(four(), { currentActorId: 'c' }));
  assert.deepEqual(model.filter(row => row.joue).map(row => row.id), ['a', 'b']);
});

test('la commande n’apparaît que sur celui qui agit hors de son tour, avec sa permission', () => {
  const calls = [];
  const playNow = id => { calls.push(id); return id === 'a' ? { ok: false, reason: 'a déjà joué ce round' } : { ok: true }; };
  const free = friseModel(ctx(four(), { currentActorId: 'b', actorId: 'd', playNow }));
  assert.deepEqual(free.filter(row => row.maintenant).map(row => [row.id, row.maintenant.ok]), [['d', true]]);
  const played = friseModel(ctx(four(), { currentActorId: 'b', actorId: 'a', playNow }));
  assert.deepEqual(played.find(row => row.id === 'a').maintenant, { ok: false, reason: 'a déjà joué ce round' });
  const own = friseModel(ctx(four(), { currentActorId: 'b', playNow }));
  assert.ok(own.every(row => !row.maintenant), 'rien quand celui qui agit est celui dont c’est le tour');
  assert.deepEqual(calls, ['d', 'a']);
});
