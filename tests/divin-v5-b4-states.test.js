import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../js/core/store.js';
import {createCombatEngine} from '../js/core/combat.js';
import {advanceV5Effects,recoverV5Condition,healV5Wounds} from '../js/core/v5-effects.js';
import {imposeHistoricalWrath} from './fixtures/divine-wrath-history.mjs';
import {getPrayerSLModifiers} from '../js/core/v5-divine-prayer-caps.js';
const BATTLE='divine:blessing:myrmidia:battle',clone=structuredClone;
const person=(id,sin=1)=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',initiative:60,hp:20,maxHp:30,caracs:{CC:40,CT:40,F:30,E:40,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},armor:{head:0,body:0,arms:0,legs:0},states:[],skills:[{name:'Prière',status:'resolved',carac:'Soc',total:60}],talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'}],extensions:{v5:{hasMomentum:true,divine:{sin}}}});
const snap=store=>{const value=JSON.parse(store.getFullJSON());delete value.exportedAt;return value;};
const priest=store=>snap(store).combat.participants.find(row=>row.id==='priest');
const level=(actor,key)=>actor.states.filter(row=>row.key===key).reduce((n,row)=>n+row.level,0);
async function fixture(sin=1,extra={}){let saved,refuse=false;const persistence={async load(){return saved&&clone(saved);},async saveAtomic({state}){if(refuse)return {ok:false,error:'Refus B04'};saved=clone(state);return {ok:true};}};const store=createStore({storage:null,persistence});await store.ready;await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[{...person('priest',sin),...extra},person('ally',0)]},extensions:{v5:{turnIndex:1}}});return {store,persistence,setRefuse(value){refuse=value;}};}
const input=(wrathRoll,extra={})=>({actorId:'priest',targetIds:['ally'],roll:99,wrathRoll,canSpeak:true,executionId:'b4:'+wrathRoll,facts:{targets:{ally:{withinRange:true,ally:true}}},...extra});
async function impose(store,wrathRoll){const preview=store.previewDivineExecution(BATTLE,input(wrathRoll));assert.equal(preview.ready,true,preview.error);assert.equal((await store.applyDivineExecution(BATTLE,{preview})).ok,true);return preview;}
for(const [roll,sin,resultId,hp,states] of [[6,1,'wrath:16-20',20,{'a-terre':1}],[56,1,'wrath:66-70',20,{'a-terre':1,aveugle:3}],[91,1,'wrath:101-105',0,{inconscient:1}],[96,3,'wrath:126-130',0,{enflamme:1}]])test(`B04 — ${resultId} applique source, PV et États canoniques`,async()=>{
 const {store}=await fixture(sin),before=snap(store),preview=store.previewDivineExecution(BATTLE,input(roll,{wrathConsequences:'pas un substitut'}));
 assert.equal(preview.ready,true,preview.error);assert.equal(preview.wrathStatePreview?.resultId,resultId);assert.deepEqual(snap(store),before);
 const result=await store.applyDivineExecution(BATTLE,{preview});assert.equal(result.ok,true);assert.equal(priest(store).hp,hp);assert.equal(priest(store).extensions.v5.divine.sin,sin-1);assert.equal(priest(store).extensions.v5.hasMomentum,false);
 for(const [key,count]of Object.entries(states))assert.equal(level(priest(store),key),count);
 assert.equal(result.receipt.wrathStateReceipt.source.printedPage,resultId.includes('101')||resultId.includes('126')?219:218);
 assert.equal(snap(store).combat.participants[1].hp,20);assert.equal(snap(store).combat.participants[1].states.length,0);
});
test('B04 — verrous par occurrence, fin de Tour et retraits génériques ne les contournent pas',async()=>{
 const {store}=await fixture();await impose(store,56);const actor=priest(store),blind=actor.states.find(row=>row.key==='aveugle');
 assert.equal(level(advanceV5Effects(actor,{phase:'endOfTurn',actorId:'priest',round:1}).participant,'aveugle'),3);
 for(const method of ['fortune','cause-ended','medical-attention','divine-removal'])assert.equal(recoverV5Condition(actor,blind.id,{method,causeEnded:true,medicalAttention:true,overrideRecovery:true,amount:9}).removed.length,0);
 await assert.rejects(()=>store.updateParticipant('priest',{states:actor.states.filter(row=>row.id!==blind.id)}),/Courroux|récupération/i);
 const forged=clone(actor.states);forged.find(row=>row.id===blind.id).divineWrathLocks=[];
 await assert.rejects(()=>store.updateParticipant('priest',{states:forged}),/Courroux|récupération/i);
 assert.equal((await store.recoverCondition('priest','À Terre',{method:'stand-up'})).removed.length,1,'À Terre de 66–70 reste ordinaire');
});
test('B04 — Prière de récupération +2 réelle, échec appliqué puis réussite, aperçu inerte',async()=>{
 const {store}=await fixture();await impose(store,6);const state=priest(store).states.find(row=>row.key==='a-terre');
 assert.equal((await store.recoverCondition('priest',state.id,{method:'stand-up',overrideRecovery:true})).removed.length,0);
 const before=snap(store);
 let preview=store.previewDivineWrathRecovery({actorId:'priest',stateId:state.id,roll:99,canSpeak:true});assert.equal(preview.ready,true,preview.error);assert.equal(preview.test.success,false);assert.equal(preview.difficulty,2);assert.deepEqual(snap(store),before);
 assert.equal((await store.applyDivineWrathRecovery({preview})).ok,true);assert.equal(level(priest(store),'a-terre'),1);
 preview=store.previewDivineWrathRecovery({actorId:'priest',stateId:state.id,roll:65,canSpeak:true});assert.equal(preview.test.success,true,'+2 transforme le résultat défavorable');
 await store.applyDivineWrathRecovery({preview});assert.equal(level(priest(store),'a-terre'),0);
});
test('F2-B — récupération de Courroux consomme Visée dans la même transaction et Undo la restaure',async()=>{
 const bow={id:'recovery-bow',kind:'weapon',name:'Arc',category:'Arc',range:60,damage:'BF+4',grip:'two-hands'};
 const {store}=await fixture(1,{equipment:[bow]});await impose(store,6);
 await store.updateParticipant('ally',{name:'zzz'});
 const engine=createCombatEngine(store);await engine.start();
 const aimed=store.previewV5CombatAction({actorId:'priest',kind:'aim',targetId:'ally',weaponId:bow.id,rangedWeaponHeldConfirmed:true});
 assert.equal(aimed.ready,true,JSON.stringify(aimed));await store.applyV5CombatAction(aimed);
 await engine.nextTurn();await engine.nextTurn();
 const stateId=priest(store).states.find(row=>row.key==='a-terre').id;
 const recovery=store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:65,canSpeak:true});assert.equal(recovery.ready,true,recovery.error);
 assert.equal((await store.applyDivineWrathRecovery({preview:recovery})).ok,true);
 assert.equal(snap(store).extensions.v5.combatActions?.byActorId?.priest,undefined);
 await store.undo();assert.equal(snap(store).extensions.v5.combatActions.byActorId.priest.kind,'aim');
});
test('B04 — Aveuglé retire 1+DR seulement sur l’occurrence choisie, conserve le reste',async()=>{
 const {store}=await fixture();await impose(store,56);await store.acquireConditions('priest',[{id:'ordinary-blind',name:'Aveuglé',level:2}]);
 const source=priest(store).states.find(row=>row.key==='aveugle'&&row.id!=='ordinary-blind');
 const preview=store.previewDivineWrathRecovery({actorId:'priest',stateId:source.id,roll:54,canSpeak:true});assert.equal(preview.ready,true,preview.error);assert.equal(preview.difficulty,0);assert.equal(preview.removedCount,2);
 await store.applyDivineWrathRecovery({preview});assert.equal(priest(store).states.find(row=>row.id===source.id).level,1);assert.equal(priest(store).states.find(row=>row.id==='ordinary-blind').level,2);
});
test('B04 — Inconscient source se libère au soin effectif, pas par une confirmation ni un soin nul/poison bloqué',async()=>{
 const {store}=await fixture();await impose(store,91);const actor=priest(store),state=actor.states.find(row=>row.key==='inconscient');
 assert.equal(recoverV5Condition(actor,state.id,{method:'cause-ended',causeEnded:true,overrideRecovery:true}).removed.length,0);
 assert.equal(level(healV5Wounds(actor,0).participant,'inconscient'),1);
 assert.equal(level(healV5Wounds({...actor,states:[...actor.states,{id:'poison',name:'Empoisonné',level:1}]},1).participant,'inconscient'),1);
 const healed=await store.healWounds('priest',1);assert.equal(healed.hpDelta,1);assert.equal(priest(store).hp,1);assert.equal(level(priest(store),'inconscient'),0);
 await store.undo();assert.equal(priest(store).hp,0);assert.equal(level(priest(store),'inconscient'),1);await store.redo();assert.equal(level(priest(store),'inconscient'),0);
});
test('B04 — verrou ajouté à À Terre déjà unique, immunité respectée',async()=>{
 const {store}=await fixture(1,{states:[{id:'old-prone',name:'À Terre'}]});await impose(store,6);assert.equal(priest(store).states.filter(row=>row.key==='a-terre').length,1);assert.equal(priest(store).states.find(row=>row.id==='old-prone').divineWrathLocks.length,1);
 assert.equal((await store.recoverCondition('priest','old-prone',{method:'stand-up'})).removed.length,0);
 const immune=await fixture(1,{extensions:{v5:{divine:{sin:1},immunities:{conditions:['Aveuglé']}}}});await impose(immune.store,56);assert.equal(level(priest(immune.store),'aveugle'),0);assert.equal(level(priest(immune.store),'a-terre'),1);
});
test('B04 — récupération falsifiée/périmée, refus de persistance, Undo/Redo et reload',async()=>{
 const {store,persistence,setRefuse}=await fixture();await impose(store,6);const stateId=priest(store).states.find(row=>row.key==='a-terre').id;
 let preview=store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:23,canSpeak:true}),before=snap(store),forged=clone(preview);forged.removedCount=9;
 await assert.rejects(()=>store.applyDivineWrathRecovery({preview:forged}),/aperçu|modifié/i);assert.deepEqual(snap(store),before);
 setRefuse(true);assert.equal((await store.applyDivineWrathRecovery({preview})).ok,false);assert.deepEqual(snap(store),before);setRefuse(false);
 await store.updateParticipant('priest',{hp:19});await assert.rejects(()=>store.applyDivineWrathRecovery({preview}),/changé|recalculez/i);
 preview=store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:23,canSpeak:true});await store.applyDivineWrathRecovery({preview});await assert.rejects(()=>store.applyDivineWrathRecovery({preview}),/changé|recalculez|appliqu/i);
 await store.undo();assert.equal(level(priest(store),'a-terre'),1);await store.redo();const reloaded=createStore({storage:null,persistence});await reloaded.ready;assert.equal(level(priest(reloaded),'a-terre'),0);assert.equal(snap(reloaded).extensions.v5.divineWrathRecoveries.at(-1).test.success,true);
});
test('B04 — Prière de récupération à Péché positif peut déclencher un nouveau Courroux atomique',async()=>{
 const {store}=await fixture();await impose(store,6);await store.setDivineSin('priest',1,{reason:'Nouveau Péché avant récupération'});const stateId=priest(store).states.find(row=>row.key==='a-terre').id;
 const missing=store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:20,canSpeak:true});assert.equal(missing.ready,false);assert.ok(missing.needsInput.some(row=>row.field==='wrathRoll'));
 const preview=store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:20,canSpeak:true,wrathRoll:51});assert.equal(preview.ready,true,preview.error);assert.equal(preview.wrath.resultId,'wrath:61-65');
 await store.applyDivineWrathRecovery({preview});assert.equal(level(priest(store),'a-terre'),0);assert.equal(level(priest(store),'hemorragique'),2);assert.equal(priest(store).extensions.v5.divine.sin,0);
});

test('B04 — regain de PV par éditeur libère la seule cause 101–105 ; KO préexistant conservé',async()=>{
 const {store}=await fixture();await impose(store,91);const actor=priest(store);
 // Sauvegarde historique d’un KO dont la cause initiale est indépendante.
 const historical=clone(actor);historical.states.find(row=>row.key==='inconscient').divineWrathLocks.forEach(lock=>lock.ownedState=false);
 assert.equal(level(healV5Wounds(historical,1).participant,'inconscient'),1);
 await store.updateParticipant('priest',{hp:1});assert.equal(level(priest(store),'inconscient'),0);
});

test('B04 — dés, capacité à parler et compétence résolue requis ; résultat client ignoré',async()=>{
 const {store}=await fixture();await impose(store,6);const stateId=priest(store).states.find(row=>row.key==='a-terre').id,before=snap(store);
 for(const extra of [{roll:undefined},{roll:0},{roll:101},{roll:23,canSpeak:false}])assert.equal(store.previewDivineWrathRecovery({actorId:'priest',stateId,canSpeak:true,...extra}).ready,false);
 const falsified=store.previewDivineWrathRecovery({actorId:'priest',stateId,canSpeak:true,roll:99,test:{success:true,sl:9},difficulty:99,removedCount:999});assert.equal(falsified.test.success,false);assert.equal(falsified.removedCount,0);assert.equal(falsified.difficulty,2);assert.deepEqual(snap(store),before);
 await store.updateParticipant('priest',{skills:[{name:'Prière',carac:'Soc',status:'unresolved',total:60}]});assert.equal(store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:23,canSpeak:true}).ready,false);
});
test('B04 — plafond historique et vrais modificateurs atteignent aussi la récupération',async()=>{
 const {store}=await fixture();await impose(store,56);const stateId=priest(store).states.find(row=>row.key==='aveugle').id;
 await imposeHistoricalWrath(store,{executionId:'b4-historical-cap'});
 let preview=store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:23,canSpeak:true});assert.equal(preview.ready,true,preview.error);assert.equal(preview.test.sl,0);assert.equal(preview.removedCount,1);
 const current=priest(store);await store.updateParticipant('priest',{extensions:{...current.extensions,v5:{...current.extensions.v5,spellEffects:[{id:'b4-pray-penalty',testModifiers:{Pray:-6},remainingRounds:3}]}}});
 assert.equal(priest(store).extensions.v5.testModifiers.Pray,-6,'projection effective de la couche, pas un agrégat écrasé à la sauvegarde');
 preview=store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:23,canSpeak:true});assert.equal(preview.test.success,false);assert.equal(preview.removedCount,0);
});
test('B04 — occurrences répétées sur À Terre unique, sélection explicite et collision après éviction',async()=>{
 const {store}=await fixture();await impose(store,6);await store.setDivineSin('priest',1,{reason:'Seconde occurrence'});
 const second=store.previewDivineExecution(BATTLE,input(6,{executionId:'second-b4'}));await store.applyDivineExecution(BATTLE,{preview:second});let actor=priest(store),stateId=actor.states.find(row=>row.key==='a-terre').id;
 assert.equal(actor.states.filter(row=>row.key==='a-terre').length,1);assert.equal(actor.states[0].divineWrathLocks.length,2);
 assert.equal(store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:23,canSpeak:true}).ready,false);
 let preview=store.previewDivineWrathRecovery({actorId:'priest',stateId,originExecutionId:'b4:6',roll:23,canSpeak:true});await store.applyDivineWrathRecovery({preview});assert.equal(level(priest(store),'a-terre'),1);assert.equal(priest(store).states[0].divineWrathLocks.length,1);
 const saved=snap(store);saved.extensions.v5.divineExecutions=[];saved.combat.participants[0].extensions.v5.divine.sin=1;await store.loadFromJSON(saved);
 assert.equal(store.previewDivineExecution(BATTLE,input(6,{executionId:'second-b4'})).ready,false);
});
test('B04 — nouveau Courroux de Blessures ou de Leçons calculé avant toute mutation',async()=>{
 for(const kind of ['damage','lessons']){
  const {store}=await fixture();await impose(store,6);await store.setDivineSin('priest',1,{reason:'Risque du Test de récupération'});const stateId=priest(store).states.find(row=>row.key==='a-terre').id,before=snap(store),wrathRoll=kind==='damage'?26:1;
  let preview=store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:20,canSpeak:true,wrathRoll});assert.equal(preview.ready,false);assert.deepEqual(snap(store),before);
  preview=store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:20,canSpeak:true,wrathRoll,wrathEnduranceRoll:99,wrathDurationRoll:1});assert.equal(preview.ready,true,preview.error);
  await store.applyDivineWrathRecovery({preview});assert.equal(level(priest(store),'a-terre'),0);assert.equal(priest(store).extensions.v5.divine.sin,0);
  if(kind==='damage'){assert.equal(priest(store).hp,18);assert.equal(level(priest(store),'sonne'),1);}
  else {
   assert.ok(priest(store).extensions.v5.divineEffects.some(row=>row.type==='prayer-sl-modifier'&&row.duration.rounds===2));
   assert.equal(getPrayerSLModifiers(priest(store),{sceneId:null,round:1}).ok,true,'le reçu des nouvelles Leçons est accepté par le validateur partagé');
  }
 }
});

test('B04 — les anciens Aveuglé et une immunité sur À Terre préexistant ne reçoivent aucun verrou nouveau',async()=>{
 const {store}=await fixture(1,{states:[{id:'old-blind',name:'Aveuglé',level:2}]});await impose(store,56);
 assert.equal(priest(store).states.find(row=>row.id==='old-blind').divineWrathLocks?.length||0,0);
 const sourceBlind=priest(store).states.find(row=>row.key==='aveugle'&&row.id!=='old-blind');assert.equal(sourceBlind.divineWrathLocks.length,1);
 const immune=await fixture(1,{states:[{id:'old-prone',name:'À Terre'}],extensions:{v5:{divine:{sin:1},immunities:{conditions:['À Terre']}}}});await impose(immune.store,6);
 assert.equal(priest(immune.store).states.find(row=>row.id==='old-prone').divineWrathLocks?.length||0,0);
});

test('B04 — ordre des clés source après sérialisation cloud sans effet sur la récupération',async()=>{
 const {store}=await fixture();await impose(store,56);const saved=snap(store),stateId=priest(store).states.find(row=>row.key==='aveugle').id;
 const state=saved.combat.participants[0].states.find(row=>row.id===stateId);state.divineWrathLocks[0].source=Object.fromEntries(Object.entries(state.divineWrathLocks[0].source).sort(([a],[b])=>a.localeCompare(b)));
 await store.loadFromJSON(saved);assert.equal(store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:54,canSpeak:true}).ready,true);
});

test('B04 — Recommencer et une commande générique ne peuvent effacer une récupération par Prière',async()=>{
 const {store}=await fixture();await impose(store,6);const before=snap(store);
 await assert.rejects(()=>store.restartCombat(),/Courroux|récupération/i);assert.deepEqual(snap(store),before);
 await assert.rejects(()=>store.executeCommand('generic-clear-states',draft=>{draft.combat.participants[0].states=[];return draft;}),/Courroux|récupération/i);assert.deepEqual(snap(store),before);
});
