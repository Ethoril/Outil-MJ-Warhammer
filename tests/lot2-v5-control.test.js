import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
import { createV5TimedEffect } from '../js/core/v5-effects.js';
import { keywordMechanicalStatus } from '../js/core/keywords.js';
import { previewV5ActionCosts, prepareV5ActionState, commitV5ActionCosts } from '../js/core/v5-action-costs.js';
import { evaluateTalentContractsV2 } from '../js/core/talent-contract-v2.js';
import { evaluateTalentContracts } from '../js/core/talent-contracts.js';
import { hasMomentum } from '../js/core/v5-combat-rules.js';
import registry from '../js/data/v5-talent-contracts.json' with {type:'json'};
const memory=()=>{let state;return {load:async()=>state&&structuredClone(state),saveAtomic:async({state:next})=>{state=structuredClone(next);return {ok:true};}};};
async function encounterStore(){
  const persistence=memory(),store=createStore({persistence});await store.ready;
  await store.addProfile({id:'fixture-profile',name:'Contrôle synthétique',hp:20,maxHp:20,initiative:50,caracs:{E:30},armor:{head:0,body:0,arms:0,legs:0}});
  for(const id of ['fixture-a','fixture-b'])await store.saveEncounter({id,title:'Scène de contrôle',entries:[{id:`${id}:entry`,profileId:'fixture-profile',quantity:2,zone:'active'}]});
  await store.launchEncounter('fixture-a');const engine=createCombatEngine(store);await engine.start();return {store,engine,persistence};
}

test('Contrôle indépendant V5 — pause A après cinq Tours, B deux Tours, reprise A conserve horloge et échéance',async()=>{
  const {store,engine,persistence}=await encounterStore();
  const [author,target]=store.listParticipants();
  const effect=createV5TimedEffect({id:'fixture-expiry',name:'Effet de contrôle',level:1},{authorId:author.id,targetId:target.id,expiry:{phase:'endOfTurn',round:4,turn:7,actorId:author.id}});
  await store.acquireConditions(target.id,[effect],{authorId:author.id,targetId:target.id});
  for(let i=0;i<5;i++)assert.equal((await engine.nextTurn()).status,'applied');
  assert.equal(JSON.parse(store.getFullJSON()).extensions.v5.turnIndex,6);
  const sceneA=store.getActiveScene();assert.equal(sceneA.extensions.v5.turnIndex,6);
  await store.suspendActiveScene();await store.launchEncounter('fixture-b');await engine.start();
  for(let i=0;i<2;i++)await engine.nextTurn();
  assert.equal(JSON.parse(store.getFullJSON()).extensions.v5.turnIndex,3);
  await store.suspendActiveScene();await store.resumeScene(sceneA.id);
  assert.equal(JSON.parse(store.getFullJSON()).extensions.v5.turnIndex,6);
  assert.equal(store.getActiveScene().extensions.v5.turnIndex,6);
  assert.ok(store.listParticipants().find(item=>item.id===target.id).states.some(state=>state.id==='fixture-expiry'));
  const reloaded=createStore({persistence});await reloaded.ready;const resumed=createCombatEngine(reloaded);
  await resumed.nextTurn();
  assert.ok(reloaded.listParticipants().find(item=>item.id===target.id).states.some(state=>state.id==='fixture-expiry'));
  await resumed.nextTurn();
  assert.ok(!reloaded.listParticipants().find(item=>item.id===target.id).states.some(state=>state.id==='fixture-expiry'));
  await reloaded.undo();
  assert.ok(reloaded.listParticipants().find(item=>item.id===target.id).states.some(state=>state.id==='fixture-expiry'));
});

test('Contrôle indépendant V5 — jet obligatoire manquant bloque toute mutation, sa modalité devenue périmée reste sans effet',async()=>{
  const {store,engine}=await encounterStore();const [burning,other]=store.listParticipants();
  await store.acquireConditions(burning.id,[{name:'Enflammé',level:1}]);await engine.nextTurn();
  const before=store.getFullJSON(),pending=await engine.nextTurn();
  assert.equal(pending.status,'requires-input');assert.ok(pending.requests.some(request=>request.field==='fireRoll'));
  const afterMissing=JSON.parse(store.getFullJSON()),beforeMissing=JSON.parse(before);delete afterMissing.exportedAt;delete beforeMissing.exportedAt;assert.deepEqual(afterMissing,beforeMissing);
  await store.updateParticipant(other.id,{hp:19});
  const stale=await engine.nextTurn({baseRevision:pending.baseRevision,inputs:{[burning.id]:{fireRoll:8}}});
  assert.equal(stale.status,'stale');assert.equal(store.getCombat().round,1);
  assert.equal(store.listParticipants().find(item=>item.id===burning.id).hp,20);
  const options={baseRevision:store.getLocalRevision(),inputs:{[burning.id]:{fireRoll:6}}};
  const committing=engine.nextTurn(options);options.inputs[burning.id].fireRoll=10;
  assert.equal((await committing).status,'applied');
  assert.equal(store.listParticipants().find(item=>item.id===burning.id).hp,17,'The committed explicit d10 must remain 6, not the later mutated 10');
});

test('Contrôle indépendant V5 — critique conserve auteur, cible, verrou des soins et version ; effet Précise V4 reste visible et bloqué',async()=>{
  const {store}=await encounterStore();const [author,target]=store.listParticipants();
  assert.equal(keywordMechanicalStatus('empaleuse').word.edition,'V5');
  const input={actorId:author.id,targetId:target.id,action:{type:'attack',base:60,damage:4},roll:22,defense:{base:20,roll:81},criticalRolls:{location:2,effect:49}};
  const preview=store.previewResolution(input);assert.equal((await store.applyResolution(preview)).status,'applied');
  const blinded=store.listParticipants().find(item=>item.id===target.id).states.find(state=>state.key==='aveugle');
  assert.deepEqual(blinded.v5Recovery,{kind:'medicalAttention'});
  assert.equal(blinded.authorId,author.id);assert.equal(blinded.targetId,target.id);
  assert.equal(blinded.source.authorId,author.id);assert.equal(blinded.source.targetId,target.id);
  assert.equal(store.getLog()[0].detail.ruleVersion,'v5-combat-2026-10-09.1');
  const legacy=store.previewResolution({...input,action:{...input.action,qualities:['Précise']}});
  assert.ok(legacy.mechanicalWarnings.some(warning=>warning.keywordId==='precise'));
  assert.equal((await store.applyResolution(legacy)).status,'manual');
});


test('Contrôle indépendant 2.3 — comparaison sur Élan payé, résultat atomique, quota après rechargement et acteur distinct',()=>{
  const participant=id=>({id,hp:20,extensions:{v5:{hasMomentum:true,resources:{fortune:2}}}});
  const initial={revision:9,participants:[participant('control-attacker'),participant('control-other'),{id:'control-target',hp:20}]};
  const original=structuredClone(initial);
  const clock={encounterId:'control-encounter',round:3,turnId:'control-turn-5'};
  const request={state:initial,actorId:'control-attacker',actionId:'control-extra-attack',clock,extraAttack:true,costs:[{id:'momentum-extra',resource:'momentum',amount:1}]};
  const plan=previewV5ActionCosts(request);
  const paid=prepareV5ActionState(plan,initial);
  const bonusFor=state=>evaluateTalentContractsV2({contracts:registry.contracts,acquisitions:[{talentId:'talent-strike-mighty-blow'}],
    sourceHashes:Object.fromEntries(registry.contracts.map(item=>[item.talentId,item.source.effectHash])),event:'damage.beforeProtection',role:'attacker',
    context:{kind:'melee',weapon:{isMelee:true},attack:{hit:true,usedAdvantageV5:hasMomentum(state.participants[0])}}}).proposals[0].amount;
  assert.equal(bonusFor(initial),2);
  assert.equal(bonusFor(paid.state),1,'Paying Momentum changes the actual bonus used for this extra attack');
  const result=commitV5ActionCosts(JSON.parse(JSON.stringify(plan)),initial,{resolveAction:draft=>{
    assert.deepEqual(draft,paid.state);
    const damage=5+bonusFor(draft);draft.participants[2].hp-=damage;draft.participants[0].extensions.v5.hasMomentum=true;
    return {status:'applied',state:draft};
  }});
  assert.equal(result.state.participants[2].hp,14);
  assert.equal(result.state.revision,10);
  const reload=JSON.parse(JSON.stringify(result.state));
  assert.equal(commitV5ActionCosts(plan,reload,{resolveAction:()=>assert.fail('Duplicate must never resolve again')}).status,'duplicate');
  const repeat=previewV5ActionCosts({...request,state:reload,actionId:'control-second-attack'});
  assert.equal(repeat.ready,false,'Regained Momentum does not bypass the paid-extra quota');
  assert.ok(repeat.unresolved.some(row=>row.field.startsWith('quota.')));
  assert.equal(previewV5ActionCosts({...request,state:reload,actorId:'control-other',actionId:'control-other-attack'}).ready,true,'Usage belongs to its actor');
  assert.equal(previewV5ActionCosts({...request,state:reload,actionId:'control-next-turn',clock:{...clock,turnId:'control-turn-6'}}).ready,true);
  assert.deepEqual(initial,original,'All plans and compositions preserve the original snapshot');
});

test('Contrôle indépendant 2.3 — Battement reste inactif et schéma 1 conserve son refus des champs v2',()=>{
  const sourceHashes=Object.fromEntries(registry.contracts.map(item=>[item.talentId,item.source.effectHash]));
  const plan=evaluateTalentContractsV2({contracts:registry.contracts,acquisitions:[{talentId:'talent-beat-blade'}],sourceHashes,
    event:'action.afterAttack',role:'attacker',context:{kind:'melee',attack:{hit:true},actor:{id:'control-a',size:3},target:{id:'control-t',size:3},
      authorNextTurnEnd:{phase:'endOfTurn',round:4,turn:9,actorId:'control-a'}},choices:{'talent-beat-blade:replace-damage':true}});
  assert.deepEqual(plan.proposals,[]);assert.equal(plan.trace[0].status,'draft');
  const legacy={schemaVersion:1,talentId:'control-schema-one',edition:'V5',status:'validated',ruleVersion:'control-legacy.1',
    source:{effectHash:'sha256:'+'d'.repeat(64),reference:'Contrôle synthétique'},clauses:[{id:'ordinary',event:'damage.beforeProtection',role:'attacker',when:[],
      effect:{op:'modifyDamage',amount:1,stackGroup:'control-schema-one',stack:'max'}}]};
  const input={contracts:[legacy],acquisitions:[{talentId:legacy.talentId}],sourceHashes:{[legacy.talentId]:legacy.source.effectHash},event:'damage.beforeProtection',role:'attacker'};
  assert.equal(evaluateTalentContracts(input).proposals[0].amount,1);
  const upgraded=structuredClone(legacy);upgraded.clauses[0].costs=[{id:'new-cost',resource:'fortune',amount:1}];
  assert.throws(()=>evaluateTalentContracts({...input,contracts:[upgraded]}),/Champ de contrat non couvert/);
  assert.throws(()=>evaluateTalentContracts({...input,contracts:[registry.contracts[0]]}),/Contrat V5 invalide/);
});


test('Contrôle indépendant V5 — Assourdi acquis par critique ancre sa minute au Round canonique de la scène',async()=>{
  const {store,engine}=await encounterStore();
  for(let i=0;i<8;i++)assert.equal((await engine.nextTurn()).status,'applied');
  assert.equal(store.getCombat().round,5);
  const [author,target]=store.listParticipants();
  const input={actorId:author.id,targetId:target.id,action:{type:'attack',base:60,damage:4},roll:22,defense:{base:20,roll:81},criticalRolls:{location:2,effect:9}};
  const preview=store.previewResolution(input);assert.equal((await store.applyResolution(preview)).status,'applied');
  const deafened=store.listParticipants().find(item=>item.id===target.id).states.find(state=>state.key==='assourdi');
  assert.equal(deafened.v5Timing.acquiredRound,5);
  const premature=await store.recoverCondition(target.id,deafened.id,{method:'endurance',test:{success:true,sl:1},transition:{phase:'endOfRound',round:1000}});
  assert.equal(premature.status,'requires-input','A client-supplied later Round must not bypass the real six-Round delay');
  assert.ok(premature.requests.some(request=>request.field==='minuteElapsed'));
  for(let i=0;i<12;i++)assert.equal((await engine.nextTurn()).status,'applied');
  assert.equal(store.getCombat().round,11);
  const recovered=await store.recoverCondition(target.id,deafened.id,{method:'endurance',test:{success:true,sl:1},transition:{phase:'endOfRound'}});
  assert.equal(recovered.status,'applied');
  assert.equal(store.listParticipants().find(item=>item.id===target.id).states.some(state=>state.key==='assourdi'),false);
});

test('Contrôle indépendant V5 — un critique Sonné rend Inconscient le porteur du poison avec échéance BE persistée',async()=>{
  const {store,engine,persistence}=await encounterStore();const [author,target]=store.listParticipants();
  assert.equal((await store.acquireConditions(target.id,[{name:'Empoisonné',level:2},{name:'Sonné',level:3}],{round:999})).status,'applied');
  const poisoned=store.listParticipants().find(item=>item.id===target.id);
  assert.ok(poisoned.states.every(state=>state.v5Timing.acquiredRound===1),'Store acquisition must use its actual Round');
  const input={actorId:author.id,targetId:target.id,action:{type:'attack',base:60,damage:4},roll:22,defense:{base:20,roll:81},criticalRolls:{location:2,effect:20}};
  const preview=store.previewResolution(input);assert.equal((await store.applyResolution(preview)).status,'applied');
  const unconscious=store.listParticipants().find(item=>item.id===target.id);
  assert.ok(unconscious.states.some(state=>state.key==='inconscient'));
  assert.equal(unconscious.extensions.v5.poisonDeathDueRound,4);
  assert.equal((await engine.nextTurn()).status,'applied');
  const firstRoundEnd=await engine.nextTurn();
  assert.equal(firstRoundEnd.status,'applied','Known acquisition clock must not request a guessed poison death deadline');
  const reloaded=createStore({persistence});await reloaded.ready;
  assert.equal(reloaded.listParticipants().find(item=>item.id===target.id).extensions.v5.poisonDeathDueRound,4);
});
