import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../js/core/store.js';
const clone=structuredClone;
async function fixture(){
 let saved;const persistence={async load(){return saved&&clone(saved);},async saveAtomic({state}){saved=clone(state);return {ok:true};}};
 const store=createStore({storage:null,persistence});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'p',order:['p'],participants:[{id:'p',name:'Garde',zone:'active',hp:20,maxHp:20,states:[{id:'bleed',name:'Hémorragique',key:'hemorragique',level:2}],extensions:{v5:{criticalWounds:[{id:'c1',name:'Entaille',location:'Bras',round:1,stateIds:['bleed']},{id:'c2',name:'Coup',location:'Tête',round:1}]}}}]},log:[],diceLines:[]});
 return {store,persistence};
}
const person=s=>s.listParticipants()[0];
test('A11 : guerison manuelle du seul critique choisi, Etats conserves, Undo/Redo',async()=>{
 const {store}=await fixture(),before=clone(person(store));
 await store.healCriticalWound('p','c1');assert.deepEqual(person(store).extensions.v5.criticalWounds.map(r=>r.id),['c2']);assert.deepEqual(person(store).states,before.states);
 await store.undo();assert.deepEqual(person(store).extensions.v5.criticalWounds,before.extensions.v5.criticalWounds);assert.deepEqual(person(store).states,before.states);
 await store.redo();assert.deepEqual(person(store).extensions.v5.criticalWounds.map(r=>r.id),['c2']);
});
test('A11 : persistance et rechargement de la guerison',async()=>{
 const {store,persistence}=await fixture();await store.healCriticalWound('p','c1');
 const reloaded=createStore({storage:null,persistence});await reloaded.ready;assert.deepEqual(person(reloaded).extensions.v5.criticalWounds.map(r=>r.id),['c2']);assert.equal(person(reloaded).states[0].id,'bleed');
});
test('A11 : participant ou critique inconnu refuse sans mutation',async()=>{
 const {store}=await fixture(),before=clone(person(store));
 for(const [id,critical] of [['absent','c1'],['p','absent']])await assert.rejects(async()=>store.healCriticalWound(id,critical),/introuvable/i);
 assert.deepEqual(clone(person(store)),before);
});
