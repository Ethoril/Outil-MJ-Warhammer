import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../js/core/store.js';
import {getAllDivineContracts} from '../js/core/v5-divine-store.js';

const BATTLE='divine:blessing:myrmidia:battle';
const contracts=getAllDivineContracts();
const actor=(id,extra={})=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',initiative:60,hp:20,maxHp:30,
 caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},
 skills:[{id:'pray',name:'Prière',status:'resolved',carac:'Soc',total:60}],
 talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'}],prayers:[],equipment:[],traits:[],states:[],
 armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{divine:{sin:0}}},...extra});
const input=(extra={})=>({actorId:'priest',targetIds:['ally'],roll:23,canSpeak:true,
 choices:{range:0,targets:0,duration:0,effect:0},facts:{targets:{ally:{withinRange:true,ally:true}}},
 expiry:{phase:'endOfRound',round:6,moment:'afterEffects'},...extra});
async function fixture(priest){
 const store=createStore();await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],
  participants:[priest,actor('ally',{initiative:30})]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
 return store;
}

test('E4 runtime — Prière applique au Test le plus fort de Sonné, Exténué et Empoisonné',async()=>{
 const priest=actor('priest',{states:[{key:'sonne',name:'Sonné',level:2},{key:'extenue',name:'Exténué',level:1},{key:'empoisonne',name:'Empoisonné',level:3}]});
 const store=await fixture(priest);
 const preview=store.previewDivineExecution(BATTLE,input({conditionContext:{conditionPenaltyMode:'sl',conditionPenaltyReason:'Le pire malus d’État est retenu.'}}));
 assert.equal(preview.ready,true,preview.error);
 assert.equal(preview.preview.prayer.sl,1,'socle 4 DR puis seul le pire malus distinct de −3');
 assert.deepEqual(preview.preview.conditionTestContext.slModifiers.map(row=>row.amount),[-3]);
 assert.deepEqual(preview.preview.conditionTestContext.levels,{sonne:2,extenue:1,empoisonne:3});
});

test('E4 runtime — Souillé affecte le Test de Soc et force l’inversion défavorable',async()=>{
 const priest=actor('priest',{states:[{key:'souille',name:'Souillé',level:1}]});
 const store=await fixture(priest);
 const preview=store.previewDivineExecution(BATTLE,input());
 assert.equal(preview.ready,true,preview.error);
 assert.equal(preview.preview.prayer.optionId,'reverse');
 assert.equal(preview.preview.prayer.roll,32,'le jet 23 est inversé à 32 par le Désavantage de Souillé');
 assert.deepEqual(preview.preview.conditionTestContext.disadvantageSources.map(row=>row.label),['Souillé']);
});

test('E4 runtime — Clarté d’esprit laisse Sonné actif mais écarte son malus de Prière mentale',async()=>{
 const priest=actor('priest',{states:[{key:'sonne',name:'Sonné',level:2}],extensions:{v5:{divine:{sin:0},specialStates:{clarityOfThought:true}}}});
 const store=await fixture(priest);
 const preview=store.previewDivineExecution(BATTLE,input());
 assert.equal(preview.ready,true,preview.error);
 assert.equal(preview.preview.conditionTestContext.levels.sonne,2);
 assert.deepEqual(preview.preview.conditionTestContext.slModifiers,[]);
 assert.match(JSON.stringify(preview.preview.conditionTestContext.ignoredPenaltySources),/Clarté|clarityOfThought/i);
 assert.match(JSON.stringify(preview.preview.conditionTestContext.ignoredPenaltySources),/p\. 251/);
});

test('E4 runtime — Souillé et malus en DR exigent DIV-05, choix motivé et capture périmée sur changement d’État',async()=>{
 const priest=actor('priest',{states:[{key:'souille',name:'Souillé',level:1},{key:'sonne',name:'Sonné',level:2}]});
 const store=await fixture(priest);
 const unresolved=store.previewDivineExecution(BATTLE,input());
 assert.equal(unresolved.ready,false);
 assert.ok(unresolved.needsInput.some(row=>row.field==='conditionContext.conditionPenaltyMode'));
 const chosen=store.previewDivineExecution(BATTLE,input({conditionContext:{conditionPenaltyMode:'disadvantage',
  conditionPenaltyReason:'Le MJ retient le Désavantage de Souillé.'}}));
 assert.equal(chosen.ready,true,chosen.error);
 assert.equal(chosen.preview.prayer.optionId,'reverse');
 await store.updateParticipant('priest',{states:[]});
 await assert.rejects(async()=>store.applyDivineExecution(BATTLE,{preview:chosen}),/changé depuis le calcul|recalculez/i);
});

test('E4 runtime — contexte calculé et arbitrage restent dans le reçu après reload; Undo annule reçu et effet',async()=>{
 const priest=actor('priest',{states:[{key:'souille',name:'Souillé',level:1},{key:'sonne',name:'Sonné',level:2}]});
 const store=await fixture(priest);
 const preview=store.previewDivineExecution(BATTLE,input({conditionContext:{conditionPenaltyMode:'disadvantage',
  conditionPenaltyReason:'Le MJ retient le Désavantage pour cette Prière.'}}));
 assert.equal(preview.ready,true,preview.error);
 const applied=await store.applyDivineExecution(BATTLE,{preview});
 assert.equal(applied.ready,true,applied.error);
 assert.equal(applied.receipt.testContext.arbitration.decisionId,'DIV-05');
 assert.equal(applied.receipt.testContext.arbitration.mode,'disadvantage');
 assert.equal(applied.receipt.prayer.optionId,'reverse');
 const saved=JSON.parse(store.getFullJSON());
 const loaded=createStore();await loaded.ready;await loaded.loadFromJSON(saved);
 const receipt=(JSON.parse(loaded.getFullJSON()).extensions.v5.divineExecutions||[]).find(row=>row.executionId===applied.executionId);
 assert.deepEqual(receipt.testContext,applied.receipt.testContext);
 await store.undo();
 const undone=JSON.parse(store.getFullJSON());
 assert.equal((undone.extensions.v5.divineExecutions||[]).some(row=>row.executionId===applied.executionId),false);
 assert.equal(undone.combat.participants.find(row=>row.id==='ally').extensions.v5.divineEffects?.length||0,0);
});

