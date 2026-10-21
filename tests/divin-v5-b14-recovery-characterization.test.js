import test from 'node:test';import assert from 'node:assert/strict';import{fixture,priest,snap,input,BATTLE}from './divin-v5-b5-fixture.mjs';
// Caractérisation B14 avant raccord de store.js (applyDivineWrathRecovery) : une récupération sans nouveau participant ne touche ni l'ordre ni le Tour courant.
test('B14 caractérisation — récupération B04 (ordre automatique) : ordre, acteur courant et participants inchangés',async()=>{
  const{store}=await fixture(1),state=JSON.parse(store.getFullJSON());state.combat.orderMode='automatic';state.extensions.v5.orderRound=1;await store.loadFromJSON(state);
  const p=store.previewDivineExecution(BATTLE,input(6,{executionId:'b14-char-prone'}));assert.equal(p.ready,true,p.error);await store.applyDivineExecution(BATTLE,{preview:p});
  const before=snap(store).combat,recovery=store.previewDivineWrathRecovery({actorId:'priest',stateId:priest(store).states[0].id,roll:99,canSpeak:true,executionId:'b14-char-rec'});
  assert.equal(recovery.ready,true,recovery.error);assert.equal((await store.applyDivineWrathRecovery({preview:recovery})).ok,true);
  const after=snap(store).combat;assert.deepEqual(after.order,before.order);assert.equal(after.currentActorId,before.currentActorId);assert.deepEqual(after.participants.map(row=>row.id),before.participants.map(row=>row.id));
});
