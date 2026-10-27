import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { createCriticalAftermathRecord } from '../js/core/v5-critical-aftermath.js';
import { getV5CriticalEffect } from '../js/data/v5-crits.js';

const clone=structuredClone;
const memory=()=>{let saved=null;return{async load(){return saved&&clone(saved);},async saveAtomic({state}){saved=clone(state);return{ok:true};}};};
const person=(id,extra={})=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',hp:20,maxHp:20,caracs:{CC:50,F:40,E:30,BE:3,Ag:30},skills:[],talents:[],equipment:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}},...extra});

test('T2 bis characterization: Split Hand progresses from finger loss to a second hand shock on the same critical',async()=>{
 const effectRoll=Array.from({length:200},(_,i)=>i+1).find(roll=>getV5CriticalEffect('ARM',roll)?.source?.printedName==='Cleft Hand');
 assert.ok(effectRoll,'actual Split Hand critical line is present in the V5 table');
 const source=createCriticalAftermathRecord(person('hero'),{table:'ARM',effectRoll,resolutionId:'split-hand',round:1});
 assert.equal(source.record.effectName,'Main ouverte','use the actual Split Hand critical line');
 assert.deepEqual(source.record.sequela.durableEffects,[{kind:'amputation',part:'finger',difficultySL:-1,recurrence:'one-finger-per-round-without-medical-attention',eventualPart:'hand'}]);
 // Characterize the Store after the Cleft Hand recurrence has removed every finger.
 // The first application represents the finger amputation; the same critical must
 // then accept the distinct hand shock required by the MJ decision.
 const first={...source.record,sequela:{...source.record.sequela,durableEffects:[{kind:'amputation',part:'hand',difficultySL:-2,trigger:'all-fingers-lost'}]},amputationShock:{amputationOccurred:true,part:'finger',difficultyDR:-1,test:{success:false,sl:-1},acquiredStates:['À Terre','Sonné'],surgeryRequired:true}};
 const hero={...source.participant,extensions:{v5:{...source.participant.extensions.v5,criticalAftermath:[first]}}};
 const persistence=memory(),store=createStore({storage:null,persistence});await store.ready;
 const snapshot={schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'hero',order:['hero','foe'],participants:[hero,person('foe')]},log:[],diceLines:[],extensions:{v5:{combatId:'split-hand-second-shock',turnIndex:1}}};
 snapshot.extensions.v5.gameClock=createGameClock(snapshot);await store.loadFromJSON(snapshot);

 const recordId=source.record.id;
 const preview=store.previewAmputationShock({participantId:'hero',criticalId:recordId,test:{success:false,sl:-2}});
 assert.equal(preview.status,'ready','the same critical must allow its separate hand shock after all fingers are gone');
 assert.ok(preview.requirements.some(row=>row.part==='hand'&&row.difficultyDR===-2));
 const applied=await store.applyAmputationShock(preview);
 assert.equal(applied.status,'applied','Store must persist the separate second shock');
 const records=store.listParticipants().find(row=>row.id==='hero').extensions.v5.criticalAftermath;
 assert.equal(records.length,1,'both shocks belong to the single Cleft Hand critical');
 assert.equal(records[0].amputationShock.part,'hand');
});
