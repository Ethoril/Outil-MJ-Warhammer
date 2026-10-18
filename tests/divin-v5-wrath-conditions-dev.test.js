import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {createStore} from '../js/core/store.js';
import registry from '../js/data/v5-divine-contracts.json' with {type:'json'};
import corpus from '../docs/divin/DIVIN_CORPUS_LIVRES.json' with {type:'json'};
import {wrathConditionReading,wrathConditionRules} from '../docs/divin/sources/L06-wrath-conditions-readings.mjs';

const BATTLE='divine:blessing:myrmidia:battle',PRAY='skill-50_72_69_e8_72_65-base';
const clone=value=>structuredClone(value);
const person=(id,sin=0,{immunities=null,hasMomentum=false,states=[]}={})=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',initiative:id==='priest'?60:30,hp:20,maxHp:30,
 caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},armor:{head:0,body:0,arms:0,legs:0},states:clone(states),traits:[],equipment:[],
 skills:[{id:PRAY,name:'Prière',carac:'Soc',status:'resolved',total:60}],talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'},{id:'talent-invoke',status:'resolved',rank:1,specialization:'Myrmidia'}],
 prayers:registry.contracts.filter(row=>row.type==='miracle').map(row=>({name:row.catalogueName,status:'resolved'})),extensions:{v5:{divine:{sin},...(immunities?{immunities}:{}),...(hasMomentum?{hasMomentum:true}:{})}}});
async function setup(sin=1,actorOptions={}){
 const store=createStore({storage:null});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[person('priest',sin,actorOptions),person('ally')]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
 return store;
}
const input=(extra={})=>({actorId:'priest',targetIds:['ally'],roll:10,wrathRoll:41,executionId:'wrath-conditions-dev',canSpeak:true,expiry:{phase:'endOfRound',round:6},choices:{range:0,targets:0,duration:0,effect:0},facts:{targets:{ally:{withinRange:true,ally:true}}},...extra});
const snapshot=store=>{const state=JSON.parse(store.getFullJSON());delete state.exportedAt;return state;};
const levels=(actor,name)=>(actor.states||[]).filter(row=>row.name===name).reduce((sum,row)=>sum+row.level,0);

test('wrath condition source is tied to canonical L06 and separates state rules from prayer SL rules',()=>{
 const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 execFileSync(process.execPath,['tools/build-v5-divine-contracts.mjs','--check'],{cwd:projectRoot,stdio:'pipe'});
 assert.equal(corpus.books.find(book=>book.id==='L06')?.sha256,wrathConditionRules[0].source.fileSha256);
 assert.equal(wrathConditionReading.sinTiming,'before-decrement');
 assert.equal(wrathConditionRules.length,2);
 for(const rule of registry.wrathConditionRules){
  assert.equal(rule.source.fileSha256,registry.sourceManifest.v5EnglishBaseSha256);
  assert.equal(rule.source.printedPage,218);
  assert.equal(rule.sourceReceipt.application.order,'apply-then-decrement');
  assert.equal(rule.sourceReceipt.sourceRefs.some(ref=>[184,185,186].includes(ref.printedPage)),true);
 }
 assert.deepEqual(registry.wrathConditionRules.map(rule=>rule.conditions),[[{name:'Hémorragique',base:1,perSin:1}],[{name:'Brisé',base:1,perSin:1}]]);
 assert.deepEqual(registry.prayerSLRules.map(rule=>rule.type),['prayer-sl-cap','prayer-sl-modifier']);
});

test('preview projects source quantity and real immunity without mutating the state',async()=>{
 const store=await setup(2),before=snapshot(store);
 const preview=store.previewDivineExecution(BATTLE,input({wrathConsequences:'texte arbitraire'}));
 assert.equal(preview.ready,true,preview.error);
 assert.equal(preview.wrathTableResult.id,'wrath:61-65');
 assert.deepEqual(preview.wrathConditionPreview.requested,{condition:'hemorragique',count:3});
 assert.equal(preview.wrathConditionPreview.projection.acquiredCount,3);
 assert.deepEqual(snapshot(store),before);
});

test('commit applies wrath states on the priest after either prayer outcome, with one compact source receipt',async()=>{
 for(const [roll,success] of [[10,true],[99,false]]){
  const store=await setup(2),preview=store.previewDivineExecution(BATTLE,input({roll}));
  assert.equal(preview.ready,true,preview.error);assert.equal(preview.preview.prayer.success,success);
  const result=await store.applyDivineExecution(BATTLE,{preview});assert.equal(result.ok,true,result.error);
  const state=snapshot(store),priest=state.combat.participants.find(row=>row.id==='priest'),ally=state.combat.participants.find(row=>row.id==='ally');
  assert.equal(levels(priest,'Hémorragique'),3);assert.equal(levels(ally,'Hémorragique'),0);
  assert.equal(priest.extensions.v5.divine.sin,1);
  const receipt=state.extensions.v5.divineExecutions.at(-1).conditionReceipt;
  assert.equal(receipt.proof.sinAtTest,2);assert.equal(receipt.acquiredCount,3);assert.equal(receipt.stateIds.length,1);
  assert.deepEqual(receipt.requested,{condition:'hemorragique',count:3});
  assert.equal((priest.extensions.v5.divineEffects||[]).some(layer=>layer.conditionStateIds?.includes(receipt.stateIds[0])),false);
 }
});

test('self-targeted blessing and wrath preserve both the active prayer buff and source state',async()=>{
 const store=await setup(1),preview=store.previewDivineExecution(BATTLE,input({wrathRoll:51,targetIds:['priest'],facts:{targets:{priest:{withinRange:true,ally:true}}}}));
 assert.equal(preview.ready,true,preview.error);
 const result=await store.applyDivineExecution(BATTLE,{preview});assert.equal(result.ok,true,result.error);
 const priest=snapshot(store).combat.participants.find(row=>row.id==='priest');
 assert.equal(levels(priest,'Hémorragique'),2);
 assert.ok(priest.extensions.v5.divineEffects.some(layer=>layer.executionId===preview.executionId),'la couche du buff sur soi survit à l’acquisition');
 assert.equal(priest.extensions.v5.divineEffects.some(layer=>layer.conditionStateIds?.includes(result.receipt.conditionReceipt.stateIds[0])),false);
});

test('l’immunité conserve Momentum et la projection expose les quantités demandée/réelle',async()=>{
 const store=await setup(1,{immunities:{conditions:['Hémorragique']},hasMomentum:true});
 const preview=store.previewDivineExecution(BATTLE,input({wrathRoll:51}));
 assert.equal(preview.ready,true,preview.error);
 assert.deepEqual(preview.wrathConditionPreview.projection,{acquiredCount:0,stateIds:[],immunized:true,reminders:['Immunité : Hémorragique ignoré.'],momentumBefore:true,momentumAfter:true});
 const result=await store.applyDivineExecution(BATTLE,{preview});assert.equal(result.ok,true,result.error);
 const priest=snapshot(store).combat.participants.find(row=>row.id==='priest');
 assert.equal(levels(priest,'Hémorragique'),0);assert.equal(priest.extensions.v5.hasMomentum,true);
 assert.deepEqual(result.receipt.conditionReceipt.momentum,{before:true,after:true});
 assert.equal(result.receipt.conditionReceipt.requested.count,2);assert.equal(result.receipt.conditionReceipt.acquiredCount,0);
});
