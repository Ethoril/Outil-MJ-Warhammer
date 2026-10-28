import test from 'node:test';
import assert from 'node:assert/strict';
import reference from '../js/data/reference-snapshot.json' with { type: 'json' };
import * as supplemental from '../js/core/v5-supplemental-equipment.js';
import { createStore } from '../js/core/store.js';
import { locationProtection } from '../js/core/equipment.js';

const actor = { id: 'holder', name: 'MJ', states: [] };
const target = { id: 'target', name: 'Cible', states: [] };

test('F2-F review characterization — actual Antler Hilted Blade requires explicit handle origin', () => {
  const item = { id: 'antler-blade-real', name: 'Antler Hilted Blade', kind: 'weapon' };
  const unresolved = supplemental.previewSupplementalEquipment({ item, actor, target, used: true, context: {} });
  assert.ok(unresolved?.unresolved.some(row => /préciser si le bois/i.test(row)));
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

test('F2-F review — planting the real pavise consumes two Actions on separate turns before Protectrice 5 applies', async () => {
  const pavise=reference.equipment.items.find(item=>item.id==='shield-armures-bouclier-pavois-pavise');
  const wearer={id:'wearer',name:'Porteur',zone:'active',hp:20,maxHp:20,caracs:{E:40,FM:40},equipment:[pavise],armorLocations:{head:0,body:2,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0},states:[],extensions:{v5:{}}};
  const foe={id:'foe',name:'Ennemi',zone:'active',hp:20,maxHp:20,caracs:{E:40,FM:40},equipment:[],armorLocations:{head:0,body:0,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0},states:[],extensions:{v5:{}}};
  const store=createStore({storage:null});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:wearer.id,orderMode:'manual',order:[wearer.id,foe.id],participants:[wearer,foe]},extensions:{v5:{combatId:'pavise-test',turnIndex:1}}});
  const first=store.previewV5PaviseDeployment({actorId:wearer.id,equipmentId:pavise.id,direction:'north'});assert.equal(first.ready,true,first.error);
  assert.equal((await store.applyV5PaviseDeployment(first)).status,'applied');
  assert.equal(store.listParticipants().find(row=>row.id===wearer.id).extensions.v5.paviseDeploymentByItemId[pavise.id].status,'setting-up');
  assert.equal(store.previewV5PaviseDeployment({actorId:wearer.id,equipmentId:pavise.id,direction:'north'}).ready,false,'une deuxième Action ne peut pas être dépensée durant le même Tour');
  store.nextTurn();store.nextTurn();
  const second=store.previewV5PaviseDeployment({actorId:wearer.id,equipmentId:pavise.id,direction:'north'});assert.equal(second.ready,true,second.error);
  assert.equal((await store.applyV5PaviseDeployment(second)).status,'applied');
  const deployed=store.listParticipants().find(row=>row.id===wearer.id);
  assert.equal(deployed.extensions.v5.paviseDeploymentByItemId[pavise.id].status,'planted');
  assert.equal((store.getFullJSON()&&JSON.parse(store.getFullJSON()).extensions.v5.standardTurnActions.filter(row=>row.actionId.startsWith('pavise-setup:')).length),2);
  assert.equal(locationProtection(deployed,{location:'body',paviseId:pavise.id,attackDirection:'north',paviseDistanceYards:1,ranged:true}).ap,5);
  assert.equal(locationProtection(deployed,{location:'body',paviseId:pavise.id,shieldId:pavise.id,shieldAvailable:true,opposedWithShield:true,defenseProvided:true,ranged:true,attackDirection:'north',paviseDistanceYards:1}).ap,5,'le pavois posé ne se cumule pas comme bouclier tenu');
});
