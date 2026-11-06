// L5-MJ : bande de portée préremplie depuis la distance mesurée sur la carte (mètres = yards).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeV5WeaponRangeBands, v5RangeBandForMeters } from '../../../js/core/v5-talent-combat.js';

test('arc de 30 m : chaque distance tombe dans sa bande, bornes incluses', () => {
  const bands = computeV5WeaponRangeBands(30);
  assert.deepEqual([4, 5, 15, 16, 30, 31, 60, 61, 90].map(m => v5RangeBandForMeters(m, bands)),
    ['point-blank', 'short', 'short', 'medium', 'medium', 'long', 'long', 'extreme', 'extreme']);
});

test('au-delà de l’Extrême : pas de bande, le MJ décide', () => {
  assert.equal(v5RangeBandForMeters(91, computeV5WeaponRangeBands(30)), null);
});

test('portée courte de 4 m ou moins : jamais de bout portant', () => {
  assert.equal(v5RangeBandForMeters(1, computeV5WeaponRangeBands(8)), 'short');
});

test('sans portée connue ou sans mesure : pas de bande', () => {
  assert.equal(v5RangeBandForMeters(10, null), null);
  assert.equal(v5RangeBandForMeters(Number.NaN, computeV5WeaponRangeBands(30)), null);
});

// Recette du 06/11 : un profil de bestiaire porte sa portée dans `action.rangeYards` (Bugshot, arc à 50 m), sans arme d'équipement.
test('portée d’un profil de bestiaire (action.rangeYards) : les bandes sont connues du calcul', async () => {
  const { buildCombatTest } = await import('../../../js/core/v5-combat-rules.js');
  const fighter = id => ({ id, name: id, kind: 'PNJ', camp: id === 'a' ? 'ennemi' : 'pj', zone: 'active', size: 'average', hp: 10, maxHp: 10,
    caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 30, Ag: 40, Dex: 30, Int: 30, FM: 30, Soc: 30, M: 4 },
    states: [], talents: [], skills: [], equipment: [], traits: [], armor: {}, extensions: { v5: { hasMomentum: false } } });
  const a = fighter('a'), t = fighter('t');
  const shot = rangeYards => buildCombatTest({ actor: a, target: t, roll: 42,
    action: { type: 'attack', label: 'Fronde', attr: 'CT', base: 40, qualities: [], rangeYards, extensions: { v5: { kind: 'ranged' } } },
    attackContext: { ranged: true }, v5: { kind: 'ranged', context: { shotRange: 'point-blank' } }, v5State: { participants: [a, t] },
    combatPrelude: {}, weaponSkillUnresolved: [], protectionContext: {} });
  const unresolved = result => JSON.stringify(result.unresolved);
  assert.match(unresolved(shot(8)), /pas de bout portant/);
  assert.doesNotMatch(unresolved(shot(50)), /pas de bout portant/);
});
