import test from 'node:test';
import assert from 'node:assert/strict';
import reference from '../js/data/reference-snapshot.json' with { type: 'json' };
import * as supplemental from '../js/core/v5-supplemental-equipment.js';
import { createStore } from '../js/core/store.js';

const actor = { id: 'holder', name: 'MJ', states: [] };
const target = { id: 'target', name: 'Cible', states: [] };

test('F2-F review characterization — actual Antler Hilted Blade requires explicit handle origin', () => {
  const item = { id: 'antler-blade-real', name: 'Antler Hilted Blade', kind: 'weapon' };
  const unresolved = supplemental.previewSupplementalEquipment({ item, actor, target, used: true, context: {} });
  assert.ok(unresolved?.unresolved.some(row => /origine.*poignée/i.test(row)));
  const naturallyFallen = supplemental.previewSupplementalEquipment({ item, actor, target, used: true, context: { antlerHandleOrigin: 'naturally-fallen' } });
  assert.ok(naturallyFallen?.reminders.some(row => /ne se brise pas.*combat/i.test(row)));
  const violent = supplemental.previewSupplementalEquipment({ item, actor, target, critical: { id: 'critical' }, context: { antlerHandleOrigin: 'violent' } });
  assert.deepEqual(violent?.effects.map(row => row.participantId), [target.id, actor.id]);
});

test('F2-F review characterization — accented real staff label resolves associated-domain focus', () => {
  const item = { id: 'staff-real', name: 'Bâton enchanté', kind: 'weapon', associatedDomain: 'Aqshy', focusRank: 2 };
  const plan = supplemental.previewSupplementalEquipment({ item, actor, target, spell: { wind: 'Aqshy' } });
  assert.equal(plan?.ruleId, 'F-L06-1104');
  assert.equal(plan?.casting.focusSL, 2);
});

test('F2-F review characterization — leviathan encumbrance is calculated per item from MJ metal baseline', () => {
  const leviathan = { id: 'leviathan-plate', name: 'Leviathan Plate' };
  assert.equal(supplemental.effectiveSupplementalEncumbrance(leviathan, 4), 3);
  assert.equal(supplemental.effectiveSupplementalEncumbrance({ id: 'ordinary-plate', name: 'Plate Armour' }, 4), 4);
});

test('F2-F review characterization — the real pavise cannot protect while merely selected for planting', async () => {
  const pavise = reference.equipment.items.find(item => item.id === 'shield-armures-bouclier-pavois-pavise');
  assert.ok(pavise);
  const store = createStore({ storage: null }); await store.ready;
  assert.equal(typeof store.previewV5PaviseDeployment, 'function');
  assert.equal(typeof store.applyV5PaviseDeployment, 'function');
});
