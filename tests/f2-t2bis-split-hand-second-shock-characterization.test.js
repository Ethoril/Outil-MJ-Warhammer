import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { createCriticalAftermathRecord, previewAmputationShock } from '../js/core/v5-critical-aftermath.js';
import { getV5CriticalEffect } from '../js/data/v5-crits.js';

const clone=structuredClone;
const memory=()=>{let saved=null;return{async load(){return saved&&clone(saved);},async saveAtomic({state}){saved=clone(state);return{ok:true};}};};
const person=(id,extra={})=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',hp:20,maxHp:20,caracs:{CC:50,F:40,E:30,BE:3,Ag:30},skills:[],talents:[],equipment:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{}},...extra});

test('T2 bis characterization: Split Hand progresses from finger loss to a second hand shock on the same critical',async()=>{
 const effectRoll=Array.from({length:200},(_,i)=>i+1).find(roll=>getV5CriticalEffect('ARM',roll)?.source?.printedName==='Cleft Hand');
 assert.ok(effectRoll,'actual Split Hand critical line is present in the V5 table');
 const source=createCriticalAftermathRecord(person('hero'),{table:'ARM',effectRoll,resolutionId:'split-hand',round:1});
 assert.equal(source.record.effectName,'Main ouverte','use the actual Split Hand critical line');
 assert.deepEqual(source.record.sequela.durableEffects,[{kind:'amputation',part:'finger',difficultySL:-1,recurrence:'one-finger-per-round-without-medical-attention',eventualPart:'hand'},{kind:'amputation',part:'hand',difficultySL:-1,conditional:true,trigger:'all-fingers-lost'}]);
 const beforeAllFingers=previewAmputationShock({participant:source.participant,criticalId:source.record.id,difficultyDR:-1,test:{success:false,sl:-2}});
 assert.equal(beforeAllFingers.amputatedPart,'finger','the hand shock stays unavailable while fingers remain');
 assert.equal(previewAmputationShock({participant:source.participant,criticalId:source.record.id,shockPart:'hand',difficultyDR:-1,test:{success:false,sl:-2},amputationOccurred:true}).status,'blocked','direct engine calls cannot force the hand shock before any finger-loss shock');
 // Characterize the Store after the Cleft Hand recurrence has removed every finger.
 // The first application represents the finger amputation; the same critical must
 // then accept the distinct hand shock required by the MJ decision.
 const first={...source.record,sequela:{...source.record.sequela,durableEffects:[{kind:'amputation',part:'hand',difficultySL:-2,trigger:'all-fingers-lost'}]},amputationShock:{amputationOccurred:true,part:'finger',difficultyDR:-1,test:{success:false,sl:-1},acquiredStates:['À Terre','Sonné'],surgeryRequired:true}};
 const hero={...source.participant,extensions:{v5:{...source.participant.extensions.v5,criticalAftermath:[first]}}};
 assert.equal(previewAmputationShock({participant:hero,criticalId:source.record.id,difficultyDR:-2,amputationOccurred:false,test:{success:false,sl:-2}}).status,'blocked','the MJ can explicitly reject the hand loss if fingers remain');
 assert.equal(previewAmputationShock({participant:hero,criticalId:source.record.id,shockPart:'hand',difficultyDR:-2,amputationOccurred:true,test:{success:false,sl:-2}}).status,'ready','the hand shock becomes available only after a finger shock receipt and MJ confirmation');
 const persistence=memory(),store=createStore({storage:null,persistence});await store.ready;
 const snapshot={schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'hero',order:['hero','foe'],participants:[hero,person('foe')]},log:[],diceLines:[],extensions:{v5:{combatId:'split-hand-second-shock',turnIndex:1}}};
 snapshot.extensions.v5.gameClock=createGameClock(snapshot);await store.loadFromJSON(snapshot);

 const recordId=source.record.id;
 await store.deferAmputationShock('hero',recordId,'hand');
 assert.equal(store.previewAmputationShock({participantId:'hero',criticalId:recordId}).status,'deferred','Non suspends the hand shock to the next Round');
 const deferredReload=createStore({storage:null,persistence});await deferredReload.ready;
 assert.equal(deferredReload.previewAmputationShock({participantId:'hero',criticalId:recordId}).status,'deferred','the temporary deferral survives reload');
 await store.nextTurn();await store.nextTurn();
 assert.equal(store.getCombat().round,2,'two turns advance the encounter to the next Round');
 assert.equal(store.previewAmputationShock({participantId:'hero',criticalId:recordId}).status,'requires-input','the hand shock reappears at the next Round and waits for MJ confirmation');
 await store.deferAmputationShock('hero',recordId,'hand');
 assert.equal(store.previewAmputationShock({participantId:'hero',criticalId:recordId}).status,'deferred');
 assert.equal(await store.undo(),true,'the temporary deferral is undoable');
 assert.equal(store.previewAmputationShock({participantId:'hero',criticalId:recordId}).status,'requires-input','undo restores the pending shock immediately');
 const preview=store.previewAmputationShock({participantId:'hero',criticalId:recordId,amputationOccurred:true,test:{success:false,sl:-2}});
 assert.equal(preview.status,'ready','the same critical must allow its separate hand shock after all fingers are gone');
 assert.ok(preview.requirements.some(row=>row.part==='hand'&&row.difficultyDR===-2));
 const applied=await store.applyAmputationShock(preview);
 assert.equal(applied.status,'applied','Store must persist the separate second shock');
 const records=store.listParticipants().find(row=>row.id==='hero').extensions.v5.criticalAftermath;
 assert.equal(records.length,1,'both shocks belong to the single Cleft Hand critical');
 assert.equal(records[0].amputationShocks[0].part,'hand');
 assert.match(store.getLog()[0].text,/choc d’amputation appliqué · hand$/,'the journal names the hand shock, not the earlier finger shock');
 assert.equal(store.previewAmputationShock({participantId:'hero',criticalId:recordId,shockPart:'hand',test:{success:false,sl:-2}}).status,'duplicate','the hand shock is idempotent');
 const reloaded=createStore({storage:null,persistence});await reloaded.ready;
 assert.equal(reloaded.listParticipants().find(row=>row.id==='hero').extensions.v5.criticalAftermath[0].amputationShocks[0].part,'hand','the second receipt survives reload');
 assert.equal(await store.undo(),true,'the second shock is undoable');
 assert.equal(store.listParticipants().find(row=>row.id==='hero').extensions.v5.criticalAftermath[0].amputationShocks,undefined,'undo removes only the second receipt');
});
