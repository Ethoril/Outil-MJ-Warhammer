import test from 'node:test';
import assert from 'node:assert/strict';
import {previewDivineExecution,applyDivineExecution} from '../js/core/v5-divine-engine.js';
import registry from '../js/data/v5-divine-contracts.json' with {type:'json'};
import {createStore} from '../js/core/store.js';

const contract=registry.contracts.find(row=>row.id==='divine:blessing:myrmidia:battle');
const person=sin=>({id:'priest',hp:20,maxHp:20,caracs:{Soc:60,F:30,FM:40,M:4},states:[],
 skills:[{name:'Prière',status:'resolved',total:60}],
 talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'}],extensions:{v5:{divine:{sin}}}});
const input=roll=>({actorId:'priest',targetIds:['priest'],canSpeak:true,roll,sourceFingerprint:registry.sourceFingerprint,
 facts:{targets:{priest:{withinRange:true,ally:true}}},expiry:{phase:'endOfRound',round:4},executionId:`b1:${roll}`});

test('B01 Q12 — les cent jets de Prière à zéro Péché ne déclenchent aucune table',()=>{
 const actor=person(0),before=structuredClone(actor);
 for(let roll=1;roll<=100;roll++){
  const result=previewDivineExecution(actor,contract,[actor],input(roll));
  assert.equal(result.preview?.wrath?.triggered,false,`jet ${roll}: ${result.error}`);
  assert.equal(result.preview.wrath.reason,null);
  assert.equal(result.preview.wrath.sinAfter,0);
 }
 assert.deepEqual(actor,before,'aperçus inertes');
});

test('B01 Q12 — une maladresse à zéro est applicable sans table ni décrément',()=>{
 const actor=person(0),state={combat:{round:1,currentActorId:'priest',participants:[actor]},extensions:{v5:{}}};
 const before=structuredClone(state),result=applyDivineExecution(state,contract,input(99));
 assert.equal(result.ready,true,result.error);
 assert.equal(result.receipt.prayer.fumble,true,'le Test reste une maladresse');
 assert.equal(result.receipt.wrathResolution,null);
 assert.equal(result.state.combat.participants[0].extensions.v5.divine.sin,0);
 assert.deepEqual(state,before);
});

test('B01 Q12 — à Péché positif maladresse et seuil conservent leur blocage',()=>{
 for(const roll of [20,21,99]){
  const actor=person(1),result=previewDivineExecution(actor,contract,[actor],input(roll));
  assert.equal(result.status,'needs-wrath-resolution');
  assert.equal(result.preview.wrath.triggered,true);
 }
});

test('B01 Q12 — les lignes 01–10 restent sourcées et explicitement inaccessibles',()=>{
 for(const row of registry.wrathTable.filter(row=>row.min<=10)){
  assert.equal(row.accessibility?.accessible,false);
  assert.equal(row.accessibility?.reason,'inaccessibles (arbitrage Q12)');
  assert.equal(row.source.printedPage,218);
 }
 assert.equal(registry.wrathTable.length,31);
});

async function fixture(){
 let saved=null;
 const persistence={async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return {ok:true};}};
 const store=createStore({persistence,storage:null});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest'],participants:[{...person(0),kind:'PJ',camp:'pj',zone:'active'}]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
 return {store,persistence};
}
const snapshot=store=>{const value=JSON.parse(store.getFullJSON());delete value.exportedAt;return value;};

test('B01 Q12 — Store, dés clients ignorés, vrai apply, Undo/Redo et reload',async()=>{
 const {store,persistence}=await fixture(),before=snapshot(store);
 const preview=store.previewDivineExecution(contract.id,{...input(99),wrathRoll:100,wrathConsequences:'Rejet client forgé'});
 assert.equal(preview.ready,true,preview.error);
 assert.equal(preview.preview.wrath.triggered,false);
 assert.equal(preview.wrathTableResult,null);
 assert.deepEqual(snapshot(store),before);
 const applied=await store.applyDivineExecution(contract.id,{preview});
 assert.equal(applied.ok,true,applied.error);assert.equal(applied.receipt.wrathResolution,null);
 const committed=snapshot(store);
 assert.equal(committed.combat.participants[0].extensions.v5.divine.sin,0);
 await assert.rejects(()=>store.applyDivineExecution(contract.id,{preview}),/aperçu|calcul|recalculez|changé/i);
 assert.deepEqual(snapshot(store),committed);
 await store.undo();assert.deepEqual(snapshot(store).combat,before.combat);
 await store.redo();assert.deepEqual(snapshot(store).combat,committed.combat);
 const reloaded=createStore({persistence,storage:null});await reloaded.ready;
 assert.equal(snapshot(reloaded).extensions.v5.divineExecutions.at(-1).wrath.triggered,false);
 assert.deepEqual(snapshot(reloaded).combat,committed.combat);
});

test('B01 Q12 — un aperçu à zéro devenu périmé ne contourne pas un Péché nouveau',async()=>{
 const {store}=await fixture(),preview=store.previewDivineExecution(contract.id,input(99));
 assert.equal(preview.ready,true,preview.error);
 await store.setDivineSin('priest',1,{reason:'Infraction ultérieure'});const before=snapshot(store);
 await assert.rejects(()=>store.applyDivineExecution(contract.id,{preview}),/changé|recalculez|aperçu/i);
 assert.deepEqual(snapshot(store),before);
 assert.equal(store.previewDivineExecution(contract.id,input(99)).status,'needs-wrath-resolution');
});
