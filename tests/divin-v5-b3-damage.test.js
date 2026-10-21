import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../js/core/store.js';
import registry from '../js/data/v5-divine-contracts.json' with {type:'json'};
const BATTLE='divine:blessing:myrmidia:battle',clone=structuredClone;
const person=id=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',initiative:id==='priest'?60:30,hp:30,maxHp:30,
 caracs:{CC:40,CT:40,F:30,E:50,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},
 armor:{head:10,body:10,arms:10,legs:10},states:[],traits:[],equipment:[],
 skills:[{id:'pray',name:'Prière',carac:'Soc',status:'resolved',total:60},{id:'endurance',name:'Résistance',carac:'E',status:'resolved',total:50}],
 talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'}],extensions:{v5:{divine:{sin:2},hasMomentum:true}}});
const snapshot=store=>{const value=JSON.parse(store.getFullJSON());delete value.exportedAt;return value;};
const actor=store=>snapshot(store).combat.participants.find(row=>row.id==='priest');
const level=(row,name)=>(row.states||[]).filter(state=>state.name===name).reduce((n,state)=>n+(state.level||1),0);
async function fixture(extra={}){
 let saved=null,refuse=false;
 const persistence={async load(){return saved&&clone(saved);},async saveAtomic({state}){if(refuse)return {ok:false,error:'Refus B03'};saved=clone(state);return {ok:true};}};
 const store=createStore({persistence,storage:null});await store.ready;
 const priest=person('priest');Object.assign(priest,extra);
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[priest,person('ally')]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
 return {store,persistence,setRefuse(value){refuse=value;}};
}
const input=(wrathRoll,extra={})=>({actorId:'priest',targetIds:['ally'],roll:99,wrathRoll,wrathEnduranceRoll:99,
 executionId:'b3:'+wrathRoll,canSpeak:true,choices:{range:0,targets:0,duration:0,effect:0},
 facts:{targets:{ally:{withinRange:true,ally:true}}},expiry:{phase:'endOfRound',round:6},...extra});

test('B03 — quatre règles source chiffrées, 01–05 reste inaccessible sous Q12',()=>{
 assert.deepEqual(registry.wrathDamageRules?.map(row=>[row.resultId,row.diceCount,row.fixed,row.perSin,row.enduranceDifficulty,row.extraStunnedPerNegativeSL]),[
  ['wrath:36-40',0,1,1,2,false],['wrath:51-55',1,0,1,0,false],['wrath:71-75',1,0,1,-1,false],['wrath:81-87',2,0,1,-2,true]
 ]);
 assert.equal(registry.wrathTable.find(row=>row.id==='wrath:1-5').accessibility.accessible,false);
});

for(const [wrathRoll,resultId,damageRoll,wounds,difficulty,stunned] of [
 [16,'wrath:36-40',undefined,3,2,1],[31,'wrath:51-55',4,6,0,1],
 [51,'wrath:71-75',4,6,-1,1],[61,'wrath:81-87',7,9,-2,7]
])test(`B03 — ${resultId} applique Blessures, Résistance et États canoniques`,async()=>{
 const {store}=await fixture(),before=snapshot(store);
 const preview=store.previewDivineExecution(BATTLE,input(wrathRoll,{wrathDamageRoll:damageRoll,wrathConsequences:'Texte libre falsifié',wrathEnduranceDifficulty:99}));
 assert.equal(preview.ready,true,preview.error);
 assert.equal(preview.wrathTableResult.id,resultId);
 assert.equal(preview.wrathDamagePreview.wounds,wounds);
 assert.equal(preview.wrathDamagePreview.enduranceDifficulty,difficulty);
 assert.equal(preview.wrathDamagePreview.stunnedRequested,stunned);
 assert.deepEqual(snapshot(store),before,'la projection ne touche ni PV ni Péchés ni États');
 const result=await store.applyDivineExecution(BATTLE,{preview});assert.equal(result.ok,true,result.error);
 const priest=actor(store),ally=snapshot(store).combat.participants.find(row=>row.id==='ally');
 assert.equal(priest.hp,30-wounds,'Blessures directes sans second calcul BE/PA');
 assert.equal(ally.hp,30,'le Courroux vise le prêtre et pas le destinataire');
 assert.equal(priest.extensions.v5.divine.sin,1,'quantité évaluée avec deux Péchés avant décrément');
 assert.equal(priest.extensions.v5.hasMomentum,false);
 if(stunned>5){assert.equal(level(priest,'Inconscient'),1);assert.equal(level(priest,'Sonné'),0,'conversion canonique au-delà du BE');}
 else assert.equal(level(priest,'Sonné'),1);
 const receipt=result.receipt.wrathDamageReceipt;
 assert.equal(receipt.proof.sinAtTest,2);assert.equal(receipt.sourceReceipt.sourceRefs[0].printedPage,218);
 assert.equal(receipt.enduranceTest.sl,preview.wrathDamagePreview.enduranceTest.sl);
 assert.ok(priest.states.some(state=>state.divineWrathExecutionId===preview.executionId));
 assert.equal(priest.states.some(state=>state.v5Timing?.expiry?.round===6),false,'pas d’échéance héritée de la Bénédiction');
});

test('B03 — dés manquants, hors bornes ou Résistance non résolue bloquent malgré le texte MJ',async()=>{
 const {store}=await fixture(),before=snapshot(store);
 for(const extra of [{wrathDamageRoll:undefined},{wrathDamageRoll:0},{wrathDamageRoll:11},{wrathDamageRoll:4,wrathEnduranceRoll:undefined},{wrathDamageRoll:4,wrathEnduranceRoll:101}]){
  const preview=store.previewDivineExecution(BATTLE,input(31,{...extra,wrathConsequences:'MJ a tout traité'}));
  assert.equal(preview.ready,false);
  assert.ok(preview.needsInput.some(row=>/wrath(Damage|Endurance)/.test(row.field||row.path||'')));
  assert.deepEqual(snapshot(store),before);
 }
 const skills=clone(actor(store).skills);skills.find(row=>row.name==='Résistance').status='unresolved';await store.updateParticipant('priest',{skills});
 assert.equal(store.previewDivineExecution(BATTLE,input(16)).ready,false);
});

test('B03 — réussite de Résistance, vraie réussite de Prière et immunité à Sonné',async()=>{
 for(const immune of [false,true]){
  const {store}=await fixture(immune?{extensions:{v5:{divine:{sin:2},immunities:{conditions:['Sonné']}}}}:{});
  const preview=store.previewDivineExecution(BATTLE,input(16,{roll:10,wrathEnduranceRoll:immune?99:23}));
  assert.equal(preview.ready,true,preview.error);assert.equal(preview.preview.prayer.success,true);
  const result=await store.applyDivineExecution(BATTLE,{preview});assert.equal(result.ok,true,result.error);
  assert.equal(actor(store).hp,27);assert.equal(level(actor(store),'Sonné'),0);
  assert.equal(snapshot(store).combat.participants.find(row=>row.id==='ally').caracs.CC,50,'l’effet de Prière réussi est conservé');
 }
});

test('B03 — aperçu falsifié, double clic, Undo/Redo et rechargement',async()=>{
 const {store,persistence}=await fixture(),before=snapshot(store);
 const preview=store.previewDivineExecution(BATTLE,input(31,{wrathDamageRoll:4}));assert.equal(preview.ready,true,preview.error);
 const forged=clone(preview);forged.wrathDamagePreview.wounds=999;
 await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview:forged}),/aperçu|recalculez|modifié/i);assert.deepEqual(snapshot(store),before);
 const result=await store.applyDivineExecution(BATTLE,{preview});assert.equal(result.ok,true,result.error);const committed=snapshot(store);
 await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview}),/aperçu|calcul|changé|recalculez/i);assert.deepEqual(snapshot(store),committed);
 await store.undo();assert.deepEqual(snapshot(store).combat,before.combat);
 await store.redo();assert.deepEqual(snapshot(store).combat,committed.combat);
 const reloaded=createStore({persistence,storage:null});await reloaded.ready;assert.deepEqual(snapshot(reloaded).combat,committed.combat);
 assert.equal(snapshot(reloaded).extensions.v5.divineExecutions.at(-1).wrathDamageReceipt.damage.woundsLost,6);
});

test('B03 — refus de persistance et aperçu périmé préservent tout l’état',async()=>{
 const {store,setRefuse}=await fixture();let preview=store.previewDivineExecution(BATTLE,input(16));assert.equal(preview.ready,true,preview.error);
 const before=snapshot(store);setRefuse(true);assert.equal((await store.applyDivineExecution(BATTLE,{preview})).ok,false);assert.deepEqual(snapshot(store),before);
 setRefuse(false);await store.updateParticipant('priest',{hp:29});const changed=snapshot(store);
 await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview}),/changé|recalculez|aperçu/i);assert.deepEqual(snapshot(store),changed);
});

test('B03 — un État restant interdit de rejouer le même identifiant après éviction du journal',async()=>{
 const {store}=await fixture(),first=store.previewDivineExecution(BATTLE,input(16));
 assert.equal((await store.applyDivineExecution(BATTLE,{preview:first})).ok,true);
 const saved=snapshot(store);saved.extensions.v5.divineExecutions=[];saved.combat.participants[0].extensions.v5.divine.sin=2;
 await store.loadFromJSON(saved);const before=snapshot(store);
 const repeated=store.previewDivineExecution(BATTLE,input(16));
 assert.equal(repeated.ready,false);assert.equal(repeated.status,'blocked');
 assert.match(repeated.error,/identifiant|État/i);assert.deepEqual(snapshot(store),before);
});
