import test from 'node:test';import assert from 'node:assert/strict';import{fixture,snap,input,BATTLE}from './divin-v5-b5-fixture.mjs';
// Caractérisation B14 (commit « caracteriser 88 et 141-145 avant B14 ») : avant le lot, 88 et 141–145 se réglaient par une note libre du MJ,
// sans participant créé. Depuis B14, la note ne suffit plus : le profil, la distance et la position confirmés par le MJ sont requis.
const ids=store=>snap(store).combat.participants.map(row=>row.id);
test('B14 caractérisation — 88 (78 + 10 Péché) : la note MJ seule ne suffit plus, rien n’est créé ni décrémenté',async()=>{
  const{store}=await fixture(1),before=ids(store);
  const p=store.previewDivineExecution(BATTLE,input(78,{executionId:'b14-char-88',wrathConsequences:'Le MJ gère le démon.'}));
  assert.equal(p.ready,false);assert.equal(p.wrathTableResult.id,'wrath:88-88');assert.ok(p.needsInput.some(row=>row.field==='wrathSummonProfile'));
  assert.deepEqual(ids(store),before);
});
test('B14 caractérisation — 141–145 (91 + 10×5 Péchés) : la note MJ seule ne suffit plus',async()=>{
  const{store}=await fixture(5),before=ids(store);
  const p=store.previewDivineExecution(BATTLE,input(91,{executionId:'b14-char-141',wrathConsequences:'Le MJ gère le serviteur.'}));
  assert.equal(p.ready,false);assert.equal(p.wrathTableResult.id,'wrath:141-145');assert.ok(p.needsInput.some(row=>row.field==='wrathSummonCamp'));
  assert.deepEqual(ids(store),before);
});
test('B14 caractérisation — sans note MJ, 88 et 141–145 restent bloqués',async()=>{
  for(const[sin,roll]of[[1,78],[5,91]]){const{store}=await fixture(sin);const p=store.previewDivineExecution(BATTLE,input(roll,{executionId:'b14-char-none'}));assert.equal(p.ready,false);}
});
