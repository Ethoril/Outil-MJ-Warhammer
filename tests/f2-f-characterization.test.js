import test from 'node:test';
import assert from 'node:assert/strict';
import reference from '../js/data/reference-snapshot.json' with { type: 'json' };
import { previewResolution } from '../js/core/resolution.js';

const equipment = reference.equipment.items;
const byId = id => equipment.find(row => row.id === id);

test('F2-F characterization — the GM equipment sheet remains authoritative for Skaven weapons', () => {
  const ratling = byId('weapon-armes-a-distance-ingenierie-mitrailleuse-ratling-skaven');
  const firethrower = byId('weapon-armes-a-distance-ingenierie-lance-feu-a-malepierre-skaven');
  assert.deepEqual([ratling.damage, ratling.range, ratling.keywords.map(row => row.id)], [
    '+9', '60', ['a-repetition', 'dangereuse', 'devastatrice', 'equipage', 'malepierre', 'recharge']
  ]);
  assert.deepEqual([firethrower.damage, firethrower.range, firethrower.keywords.map(row => row.id)], [
    '+10', '30', ['dangereuse', 'devastatrice', 'enflammee', 'equipage', 'explosion', 'malepierre']
  ]);
});

test('F2-F characterization — a printed fixed creature damage value does not add attacker BF again', () => {
  const result = previewResolution({
    actor: { id: 'attacker', caracs: { F: 60 }, states: [] },
    target: { id: 'target', hp: 20, caracs: { E: 30 }, armor: {}, states: [] },
    action: { type: 'attack', base: 80, damage: 11, qualities: [] },
    roll: 31, baseRevision: 1
  });
  assert.equal(result.damage.weaponDamage, 11);
  assert.equal(result.damage.finalDamage, 13, 'fixed printed damage remains 11; only +5 DR and target BE 3 are applied');
});
