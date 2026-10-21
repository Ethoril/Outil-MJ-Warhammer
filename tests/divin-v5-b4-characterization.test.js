import test from 'node:test';
import assert from 'node:assert/strict';
import {acquireV5Conditions,recoverV5Condition,advanceV5Effects,healV5Wounds} from '../js/core/v5-effects.js';
import {createStore} from '../js/core/store.js';
const actor=()=>({id:'priest',name:'Prêtre',kind:'PJ',camp:'pj',zone:'active',hp:10,maxHp:20,caracs:{E:40,Soc:60},states:[],extensions:{v5:{hasMomentum:true}},armor:{head:0,body:0,arms:0,legs:0}});
const snap=store=>{const state=JSON.parse(store.getFullJSON());delete state.exportedAt;return state;};
test('B04 caractérisation — États uniques et occurrences Aveuglé séparées',()=>{
 const first=acquireV5Conditions(actor(),[{name:'À Terre'},{name:'Aveuglé',level:3}]);
 const second=acquireV5Conditions(first.participant,[{name:'À Terre'},{name:'Aveuglé',level:1}]);
 assert.equal(second.participant.states.filter(row=>row.name==='À Terre').length,1);
 assert.equal(second.participant.states.filter(row=>row.name==='Aveuglé').length,2);
 assert.equal(second.acquiredInstances,1);assert.equal(second.participant.extensions.v5.hasMomentum,false);
});
test('B04 caractérisation — se relever et retour spontané de la vue ordinaires',()=>{
 const first=acquireV5Conditions(actor(),[{name:'À Terre'},{name:'Aveuglé',level:3}]).participant;
 const stood=recoverV5Condition(first,'À Terre',{method:'stand-up'});assert.equal(stood.removed.length,1);
 const ended=advanceV5Effects(stood.participant,{phase:'endOfTurn',actorId:'priest',round:1});
 assert.equal(ended.participant.states.find(row=>row.name==='Aveuglé').level,2);
});
test('B04 caractérisation — récupération ciblée, Fortune et immunité existantes',()=>{
 const first=acquireV5Conditions(actor(),[{id:'a',name:'Aveuglé',level:3},{id:'b',name:'Aveuglé',level:2}]).participant;
 const healed=recoverV5Condition(first,'b',{method:'fortune'});assert.deepEqual(healed.removed,[{id:'b',key:'aveugle',level:1}]);
 assert.equal(healed.participant.states.find(row=>row.id==='a').level,3);
 const immune=actor();immune.extensions={v5:{immunities:{conditions:['Aveuglé']}}};
 assert.equal(acquireV5Conditions(immune,[{name:'Aveuglé',level:3}]).acquiredInstances,0);
});
test('B04 caractérisation — Inconscient ordinaire, soins effectifs et poison',()=>{
 const first=acquireV5Conditions({...actor(),hp:0},[{name:'Inconscient'},{name:'Hémorragique',level:3}]).participant;
 const healed=healV5Wounds(first,2);assert.equal(healed.hpDelta,2);assert.equal(healed.participant.states.find(row=>row.name==='Hémorragique').level,1);
 assert.ok(healed.participant.states.some(row=>row.name==='Inconscient'));
 const blocked=healV5Wounds({...first,states:[{name:'Empoisonné'}]},2);assert.equal(blocked.hpDelta,0);
});
test('B04 caractérisation — Store : édition ordinaire, récupération, soins, Undo/Redo et refus atomique',async()=>{
 let saved,refuse=false;const store=createStore({storage:null,persistence:{async load(){return saved;},async saveAtomic({state}){if(refuse)return {ok:false};saved=structuredClone(state);return {ok:true};}}});await store.ready;
 await store.loadFromJSON({schemaVersion:3,combat:{round:1,currentActorId:'priest',order:['priest'],participants:[{...actor(),states:[{id:'prone',name:'À Terre'}]}]},reserve:[],log:[],diceLines:[]});
 await store.updateParticipant('priest',{states:[]});assert.equal(store.listParticipants()[0].states.length,0);
 await store.undo();assert.equal(store.listParticipants()[0].states[0].id,'prone');
 await store.redo();await store.acquireConditions('priest',[{name:'À Terre'}]);
 assert.equal((await store.recoverCondition('priest','À Terre',{method:'stand-up'})).removed.length,1);
 assert.equal((await store.healWounds('priest',2)).hpDelta,2);
 const before=snap(store);refuse=true;assert.equal((await store.updateParticipant('priest',{states:[]})).ok,false);assert.deepEqual(snap(store),before);
});
