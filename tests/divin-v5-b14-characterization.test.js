import test from 'node:test';import assert from 'node:assert/strict';import{fixture,priest,snap,input,BATTLE}from './divin-v5-b5-fixture.mjs';
// Caractérisation B14 : avant le lot, 88 et 141–145 ne se règlent que par une note libre du MJ, sans aucun participant créé.
const ids=store=>snap(store).combat.participants.map(row=>row.id);
test('B14 caractérisation — 88 (78 + 10 Péché) : note MJ suffit, aucun participant, Péché décrémenté',async()=>{
  const{store}=await fixture(1),before=ids(store);
  const p=store.previewDivineExecution(BATTLE,input(78,{executionId:'b14-char-88',wrathConsequences:'Le MJ gère le démon.'}));
  assert.equal(p.ready,true,p.error);assert.equal(p.wrathTableResult.id,'wrath:88-88');
  assert.equal((await store.applyDivineExecution(BATTLE,{preview:p})).ok,true);
  assert.deepEqual(ids(store),before);assert.equal(priest(store).extensions.v5.divine.sin,0);
});
test('B14 caractérisation — 141–145 (91 + 10×5 Péchés) : note MJ suffit, aucun participant',async()=>{
  const{store}=await fixture(5),before=ids(store);
  const p=store.previewDivineExecution(BATTLE,input(91,{executionId:'b14-char-141',wrathConsequences:'Le MJ gère le serviteur.'}));
  assert.equal(p.ready,true,p.error);assert.equal(p.wrathTableResult.id,'wrath:141-145');
  assert.equal((await store.applyDivineExecution(BATTLE,{preview:p})).ok,true);
  assert.deepEqual(ids(store),before);assert.equal(priest(store).extensions.v5.divine.sin,4);
});
test('B14 caractérisation — sans note MJ, 88 et 141–145 restent bloqués',async()=>{
  for(const[sin,roll]of[[1,78],[5,91]]){const{store}=await fixture(sin);const p=store.previewDivineExecution(BATTLE,input(roll,{executionId:'b14-char-none'}));assert.equal(p.ready,false);}
});
