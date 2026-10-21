import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../js/core/store.js';
import {previewDivineExecution} from '../js/core/v5-divine-engine.js';
import {getDivineContract,setStoreDivineSin} from '../js/core/v5-divine-store.js';
import registry from '../js/data/v5-divine-contracts.json' with {type:'json'};

const MATH='divine:miracle:mathlann:waterlungs',HUMAN='divine:blessing:myrmidia:battle';
const clone=structuredClone;
const actor=(cult='Mathlann',sin=5)=>({id:'priest',name:'Prêtre',kind:'PJ',camp:'pj',zone:'active',initiative:60,
 hp:20,maxHp:20,caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},
 armor:{head:0,body:0,arms:0,legs:0},states:[],traits:[],equipment:[],
 skills:[{id:'pray',name:'Prière',carac:'Soc',status:'resolved',total:60}],
 talents:[{id:'talent-invoke',status:'resolved',rank:1,specialization:cult},{id:'talent-bless',status:'resolved',rank:1,specialization:cult}],
 prayers:[{name:getDivineContract(MATH).catalogueName,status:'resolved'}],extensions:{v5:{divine:{sin}}}});
const input=extra=>({actorId:'priest',targetIds:['priest'],canSpeak:true,roll:99,executionId:'b2-prayer',
 sourceFingerprint:registry.sourceFingerprint,facts:{targets:{priest:{withinRange:true,ally:true}}},
 choices:{range:0,targets:0,duration:0,effect:0},expiry:{phase:'endOfRound',round:5},...extra});
const stateOf=store=>{const state=JSON.parse(store.getFullJSON());delete state.exportedAt;return state;};
const personOf=store=>stateOf(store).combat.participants[0];
async function fixture(person=actor()){
 let saved=null,refuse=false;
 const persistence={async load(){return saved&&clone(saved);},async saveAtomic({state}){if(refuse)return {ok:false,error:'refus B02'};saved=clone(state);return {ok:true};}};
 const store=createStore({persistence,storage:null});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:person.id,order:[person.id],participants:[person]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
 return {store,persistence,setRefuse(value){refuse=value;}};
}

test('B02 — Mathlann ne déclenche aucun Courroux, même avec maladresse et Péchés hérités',()=>{
 for(const sin of [0,1,5,12]){
  const priest=actor('Mathlann',sin),before=clone(priest);
  for(const roll of [20,21,99,100]){
   const result=previewDivineExecution(priest,getDivineContract(MATH),[priest],input({roll}));
   assert.equal(result.preview?.wrath?.triggered,false,`${sin}/${roll}: ${result.error}`);
   assert.equal(result.preview.wrath.reason,null);
   assert.equal(result.preview.wrath.exempt,true);
   assert.equal(result.preview.wrath.sinAtTest,0);
   assert.equal(result.preview.wrath.exemption.source.printedPage,99);
  }
  assert.deepEqual(priest,before);
 }
});

test('B02 — un culte elfe n’exige pas un total de Péchés sur la fiche',()=>{
 const priest=actor();delete priest.extensions.v5.divine.sin;
 const result=previewDivineExecution(priest,getDivineContract(MATH),[priest],input());
 assert.equal(result.ready,true,result.error);
 assert.equal(result.preview.wrath.triggered,false);
 assert.equal(result.preview.prayer.fumble,true);
});

test('B02 — exemption par culte et pas par race ou saisie client',()=>{
 const priest=actor('Myrmidia',2);priest.species='Elfe';
 const result=previewDivineExecution(priest,getDivineContract(HUMAN),[priest],input({cult:'Mathlann',sinExempt:true}));
 assert.equal(result.preview.wrath.triggered,true);
 assert.equal(result.preview.wrath.sinAtTest,2);
 const missing=clone(priest);delete missing.extensions.v5.divine.sin;
 assert.equal(previewDivineExecution(missing,getDivineContract(HUMAN),[missing],input()).status,'needs-input');
});

test('B02 — attribution de Péchés refusée à Mathlann sans mutation',()=>{
 const priest=actor(),state={combat:{participants:[priest]},extensions:{v5:{}}},before=clone(state);
 assert.throws(()=>setStoreDivineSin(state,priest.id,6,{reason:'Infraction'}),/exempt|elf/i);
 assert.deepEqual(state,before);
});

test('B02 — culte mixte exige une sélection acquise et préserve les Péchés humains',()=>{
 const priest=actor();priest.talents.push({id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'});
 const state={combat:{participants:[priest]},extensions:{v5:{}}};
 assert.throws(()=>setStoreDivineSin(state,priest.id,6,{reason:'Infraction'}),/culte|plusieurs/i);
 assert.throws(()=>setStoreDivineSin(state,priest.id,6,{reason:'Infraction',cult:'Mathlann'}),/exempt|elf/i);
 assert.throws(()=>setStoreDivineSin(state,priest.id,6,{reason:'Infraction',cult:'Sigmar'}),/culte|acquis/i);
 const updated=setStoreDivineSin(state,priest.id,6,{reason:'Infraction',cult:'Myrmidia'});
 assert.equal(updated.combat.participants[0].extensions.v5.divine.sin,6);
 assert.equal(state.combat.participants[0].extensions.v5.divine.sin,5);
 assert.match(updated.log[0].text,/Myrmidia/);
});

test('B02 — vrais apply, Undo/Redo et reload conservent l’exemption et le total hérité',async()=>{
 const {store,persistence}=await fixture(),before=personOf(store);
 const preview=store.previewDivineExecution(MATH,input());
 assert.equal(preview.ready,true,preview.error);
 assert.deepEqual(personOf(store),before);
 const applied=await store.applyDivineExecution(MATH,{preview});
 assert.equal(applied.ok,true,applied.error);
 assert.equal(applied.receipt.wrathResolution,null);
 assert.equal(applied.receipt.wrath.exempt,true);
 assert.equal(personOf(store).extensions.v5.divine.sin,5);
 assert.equal(await store.undo(),true);
 assert.deepEqual(personOf(store),before);
 assert.equal(await store.redo(),true);
 const reloaded=createStore({persistence,storage:null});await reloaded.ready;
 assert.equal(personOf(reloaded).extensions.v5.divine.sin,5);
 assert.equal(stateOf(reloaded).extensions.v5.divineExecutions.at(-1).wrath.exempt,true);
});

test('B02 — refus de persistance et aperçu falsifié ne changent aucun champ',async()=>{
 const {store,setRefuse}=await fixture(),before=stateOf(store);
 const preview=store.previewDivineExecution(MATH,input());assert.equal(preview.ready,true,preview.error);
 const forged=clone(preview);forged.preview.wrath.exempt=false;
 await assert.rejects(()=>store.applyDivineExecution(MATH,{preview:forged}),/aperçu|calcul|recalculez/i);
 assert.deepEqual(stateOf(store),before);
 setRefuse(true);
 const refused=await store.applyDivineExecution(MATH,{preview});
 assert.equal(refused.ok,false);
 assert.match(refused.error,/refus B02|persistance|sauvegarde/i);
 assert.deepEqual(stateOf(store),before);
});
