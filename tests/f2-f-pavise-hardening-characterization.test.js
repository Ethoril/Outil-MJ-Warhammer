import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import reference from '../js/data/reference-snapshot.json' with { type: 'json' };

const pavise=reference.equipment.items.find(item=>item.id==='shield-armures-bouclier-pavois-pavise');
const person=(id,equipment=[])=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',hp:20,maxHp:20,caracs:{CC:40,F:30,E:40,FM:40},equipment,states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}}});
async function setup(){
  const store=createStore({storage:null});await store.ready;
  const actor=person('carrier',[pavise]),foe=person('foe');
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:actor.id,orderMode:'manual',order:[actor.id,foe.id],participants:[actor,foe]},extensions:{v5:{combatId:'pavise-hardening',turnIndex:1}}});
  return{store,actorId:actor.id};
}
const planFor=store=>store.previewV5PaviseDeployment({actorId:'carrier',equipmentId:pavise.id,direction:'north'});
const stored=(store,actorId)=>store.listParticipants().find(row=>row.id===actorId)?.extensions?.v5?.paviseDeploymentByItemId?.[pavise.id];

test('pavois — an altered step cannot turn the first paid Action into completion',async()=>{
  const{store,actorId}=await setup(),plan=planFor(store);
  assert.equal(plan.ready,true);
  const result=await store.applyV5PaviseDeployment({...plan,step:99});
  assert.notEqual(result.status,'applied');
  assert.equal(stored(store,actorId),undefined);
});

test('pavois — an invalid altered facing is rejected without charging or planting',async()=>{
  const{store,actorId}=await setup(),plan=planFor(store);
  const result=await store.applyV5PaviseDeployment({...plan,direction:'up'});
  assert.notEqual(result.status,'applied');
  assert.equal(stored(store,actorId),undefined);
  assert.equal(JSON.parse(store.getFullJSON()).extensions.v5.standardTurnActions?.length||0,0);
});

test('pavois — once the Action is spent, preview refuses a second deployment step in the same turn',async()=>{
  const{store}=await setup(),first=planFor(store);assert.equal((await store.applyV5PaviseDeployment(first)).status,'applied');
  const second=planFor(store);assert.equal(second.ready,false);
  store.nextTurn();
  const inactive=planFor(store);assert.equal(inactive.ready,false,'l’acteur qui n’est pas courant ne peut pas continuer');
});

test('pavois — Undo/Redo and combat restart keep deployment and action ledger coherent',async()=>{
  const{store,actorId}=await setup(),first=planFor(store);await store.applyV5PaviseDeployment(first);
  await store.undo();assert.equal(stored(store,actorId),undefined);
  await store.redo();assert.equal(stored(store,actorId)?.status,'setting-up');
  store.nextTurn();store.nextTurn();const second=planFor(store);assert.equal(second.ready,true);await store.applyV5PaviseDeployment(second);
  assert.equal(stored(store,actorId)?.status,'planted');
  await store.restartCombat();
  assert.equal(stored(store,actorId),undefined,'Recommencer doit restaurer la scène au départ sans état installé en cours de combat');
});
