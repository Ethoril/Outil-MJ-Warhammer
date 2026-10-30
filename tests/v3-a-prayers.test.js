import test from 'node:test';
import assert from 'node:assert/strict';
import { getAllDivineContracts } from '../js/core/v5-divine-store.js';

// Livre de base V5 EN v3 pp.223-228 : Masque mortuaire, Frisson du givre, Grâce de Ranald, Dent et griffe, Jugement du Roi de la neige.
const prayer = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === name);
const clause = (contract, id) => contract.clauses.find(row => row.id === id);
const withoutDelta = contract => JSON.stringify({ ...contract, sourceDelta: undefined });

test('v3 Masque mortuaire : Peur (2), l’ancien arbitrage Peur (1) disparaît', () => {
  const mask = prayer('Masque mortuaire');
  assert.deepEqual(mask.effects.find(effect => effect.type === 'grant-trait').traits, ['Peur (2)']);
  assert.match(clause(mask, 'fear').text, /Peur \(2\)/);
  assert.doesNotMatch(withoutDelta(mask), /Peur \(1\)/);
});

test('v3 Frisson du givre : Peur (2) et perte d’Élan au lieu d’Avantage', () => {
  const chill = prayer('Frisson du givre');
  assert.deepEqual(chill.effects.find(effect => effect.type === 'grant-trait').traits, ['Peur (2)']);
  assert.match(clause(chill, 'momentum-loss').text, /perdent leur Élan/);
  assert.equal(clause(chill, 'advantage-loss'), undefined);
  assert.doesNotMatch(withoutDelta(chill), /Avantage|Peur \(1\)/);
});

test('v3 Grâce de Ranald : durée en minutes', () => {
  assert.deepEqual(prayer('Grâce de Ranald').params.duration, { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'minutes' });
});

test('v3 Dent et griffe : Morsure et Magique, mains nues dangereuses, plus de Trait Arme', () => {
  const tooth = prayer('Dent et griffe');
  const actions = tooth.effects.find(effect => effect.type === 'grant-actions').actions;
  assert.deepEqual(actions.map(action => [action.name, action.damageFormula]), [['Morsure', 'BF+3']]);
  assert.equal(tooth.effects.find(effect => effect.type === 'weapon-bonus').magical, true);
  assert.match(clause(tooth, 'unarmed-damaging').text, /mains nues.*Inoffensives/);
  assert.equal(clause(tooth, 'weapon'), undefined);
  assert.doesNotMatch(withoutDelta(tooth), /BF\+4|Bonus de Force \+ 4/);
});

test('v3 Jugement du Roi de la neige : ignore BE et PA et inflige Sonné', () => {
  const judgement = prayer('Jugement du Roi de la neige');
  const stun = judgement.effects.find(effect => effect.type === 'condition');
  assert.equal(stun.key, 'Stunned');
  assert.equal(stun.when.fact, 'judgement');
  assert.ok(judgement.effects.some(effect => effect.type === 'direct-damage'));
  assert.match(clause(judgement, 'stunned').text, /Sonné/);
  assert.equal(clause(judgement, 'redirect-stunned').mode, 'manual');
});
