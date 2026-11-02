// Lot 5 · G-ATT-5 (mineur) : la carte « Inverser en N » d'un tir dans une mêlée annonce l'issue réelle (tir dévié vers un autre
// combattant, touché d'office), pas « Touché » sur la cible visée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution } from '../../../js/core/resolution.js';

const fighter = (id, camp) => ({ id, name: id, kind: 'PJ', camp, zone: 'active', hp: 30, maxHp: 30, caracs: { CC: 50, CT: 60, F: 30, E: 30, I: 40, Ag: 40 },
  skills: [], states: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });
const archer = fighter('archer', 'pj'), alpha = fighter('alpha', 'pj'), sorcier = fighter('sorcier', 'ennemi');
const shoot = die => previewResolution({ actor: archer, target: alpha, roll: 35, action: { type: 'attack', attr: 'CT', base: 60, damage: 9 },
  v5: { kind: 'ranged', choice: 'reverse', context: { weather: 'rain-wind', cover: true, targetEngaged: true, engagedTargetIds: ['alpha', 'sorcier'], engagedTargetRoll: die } },
  v5State: { participants: [archer, alpha, sorcier] } });

test('G-ATT-5 la carte Inverser annonce la déviation et le combattant touché', () => {
  const reverse = shoot(25).decisions.actor.options.find(row => row.id === 'reverse');
  assert.equal(reverse.summary.deflected, true);
  assert.equal(reverse.summary.deflectedTo, 'sorcier');
});

test('G-ATT-5 sans d100 de sélection, la carte annonce quand même la déviation (combattant à désigner)', () => {
  const reverse = shoot(undefined).decisions.actor.options.find(row => row.id === 'reverse');
  assert.equal(reverse.summary.deflected, true);
  assert.equal(reverse.summary.deflectedTo, null);
});
