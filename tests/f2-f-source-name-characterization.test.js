import test from 'node:test';
import assert from 'node:assert/strict';
import L11 from '../js/data/bestiary/L11.json' with { type: 'json' };
import L22 from '../js/data/bestiary/L22.json' with { type: 'json' };
import L24 from '../js/data/bestiary/L24.json' with { type: 'json' };
import L17 from '../js/data/bestiary/L17.json' with { type: 'json' };
import reference from '../js/data/reference-snapshot.json' with { type: 'json' };
import { previewSupplementalEquipment } from '../js/core/v5-supplemental-equipment.js';

const actor = { id: 'holder', name: 'MJ', states: [] };
const target = { id: 'target', name: 'Cible', states: [] };
const clause = name => previewSupplementalEquipment({ item: { name }, actor, target, hit: true, damage: { finalDamage: 2 }, used: true, context: {} });
const findNamed = (data, name) => {
  let found = null;
  const visit = value => {
    if (!value || typeof value !== 'object' || found) return;
    if (value.name === name) found = value;
    for (const child of Object.values(value)) Array.isArray(child) ? child.forEach(visit) : visit(child);
  };
  visit(data);
  return found;
};

test('F source characterization: real English names resolve without synthetic supplementalRuleId', () => {
  const expected = new Map([
    ['Fell Dagger', 'F-L11-0076'], ['Antler Hilted Blade', 'F-L11-0078'],
    ['Ratling Cannon', 'F-L11-0013'], ['Warp Blade', 'F-L11-0014'],
    ['Warpfire Thrower', 'F-L11-0016'], ['Warplock Jezzail', 'F-L11-0017'],
    ['Warplock Pistol', 'F-L11-0018'], ['Leviathan Plate', 'F-L11-0081'],
    ['Shard Tips', 'F-L11-0083'], ['Rat Ogre Bonebreaker', 'F-L22-0139'],
    ['Warpstone Shard*', 'F-L22-0139'], ['Tiger Claws', 'F-L24-0008'],
    ["Wizard's Robes", 'F-L06-1105']
  ]);
  const failures = [];
  for (const [name, ruleId] of expected) {
    const actual = clause(name)?.ruleId;
    if (actual !== ruleId) failures.push(`${name}: expected ${ruleId}, got ${actual || 'no rule'}`);
  }
  assert.deepEqual(failures, [], failures.join('; '));
});

test('F source characterization: Warp Blade follows its printed weapon rule, never a Corruption exposure', () => {
  const result = clause('Warp Blade');
  assert.equal(result?.exposure, null);
  assert.ok(result?.unresolved.some(text => /Endurance/i.test(text)), 'needs a source-defined Endurance test for Stunned');
});

test('F source characterization: published creature profiles contain the real targets', () => {
  const bonebreaker = findNamed(L22, 'Rat Ogre Bonebreaker');
  const tiger = findNamed(L24, 'Tiger Claws');
  const robeWearer = (() => {
    let found = null;
    const visit = value => {
      if (!value || typeof value !== 'object' || found) return;
      if (String(value.name || '').includes('Sergov Pfeiffer')) found = value;
      for (const child of Object.values(value)) Array.isArray(child) ? child.forEach(visit) : visit(child);
    };
    visit(L17);
    return found;
  })();
  assert.ok(bonebreaker?.attacks?.some(row => row.name === 'Warpstone Shard*'));
  assert.ok(tiger);
  assert.ok(robeWearer?.trappings?.includes("Wizard's Robes"));
  assert.ok(findNamed(L11, 'Rat Ogre Bonebreaker'));
  assert.ok(reference.equipment.items.some(item => item.name === 'Pavois (Pavise)'));
});

