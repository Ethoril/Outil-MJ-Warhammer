import test from 'node:test';
import { contracts, verifySpell } from './helpers/lot3-domain-fixture.js';
import assert from 'node:assert/strict';
import { encounter, cast, subject, level, endTurn } from './helpers/lot3-domain-fixture.js';
for (const c of contracts.filter(c => c.domain === 'light')) {
  test('Domaine V5 — ' + c.name + ' — Livre de base V5 p. ' + c.page + ' — Store, persistance, Undo et fin de tour réelle', () => verifySpell(c));
}
test('Lumière — V5 p. 252 : Fléau, éclair seulement sur bannissement, observateurs désignés et exemption Hysh', async () => {
  const c=contracts.find(c=>c.canonicalName==='Daemonbane'),{store}=await encounter({foe:{traits:['Démoniaque']}});
  await cast(store,c,{secondaryTargets:{engaged:['mage']}});assert.equal(level(subject(store,'mage'),'Aveuglé'),3);
  await store.undo();const state=JSON.parse(store.getFullJSON());state.combat.participants.find(p=>p.id==='foe').caracs.E=80;await store.loadFromJSON(state);
  await cast(store,c,{secondaryTargets:{engaged:['mage']}});assert.equal(level(subject(store,'mage'),'Aveuglé'),0);
});
test('Lumière — V5 p. 251 : Bannissement accorde Instable, déjà Instable tombe à 0 B', async () => {
  const spell=contracts.find(c=>c.canonicalName==='Banishment');
  const {store,engine}=await encounter({foe:{traits:['Mort-vivant']}});
  await cast(store,spell); assert.ok(subject(store,'foe').traits.includes('Instable'));
  await endTurn(engine); await endTurn(engine); assert.ok(subject(store,'foe').traits.includes('Instable'),'un effet instantané ne retire pas le trait au Round suivant');
  const other=await encounter({foe:{traits:['Mort-vivant','Instable']}}); await cast(other.store,spell); assert.equal(subject(other.store,'foe').hp,0);
});
test('Lumière — V5 p. 252 : Filet immunité Bestial, sinon Sonné non récupérable et M nul', async () => {
  const {store}=await encounter({foe:{traits:['Bestial']}}); const p=await cast(store,contracts.find(c=>c.canonicalName==='Net of Amyntok'));
  assert.equal(p.targetResults[0].resisted,true); assert.equal(level(subject(store,'foe'),'Sonné'),0);
});
test('Lumière — V5 p. 251 : Clarté ignore Sonné mais conserve Exténué dans les processus mentaux', async () => {
  const {store}=await encounter({foe:{states:[{name:'Sonné',level:2},{name:'Exténué',level:2}]}});
  await cast(store,contracts.find(c=>c.canonicalName==='Clarity of Thought'));
  const p=store.previewCasting(contracts.find(c=>c.canonicalName==='Healing Light'),{actorId:'foe',roll:25});
  assert.equal(p.testSl,5,JSON.stringify(p.test.details));
});
test('Lumière — V5 p. 252 : Filet garde Sonné après expiration, récupération par Intelligence', async () => {
  const {store,engine}=await encounter(); await cast(store,contracts.find(c=>c.canonicalName==='Net of Amyntok'));
  const state=JSON.parse(store.getFullJSON()); state.combat.round=7; state.combat.currentActorId='mage'; await store.loadFromJSON(state);
  await endTurn(engine); assert.equal(subject(store,'foe').caracs.M,4); assert.equal(level(subject(store,'foe'),'Sonné'),1);
  assert.equal(subject(store,'foe').states.find(s=>s.name==='Sonné').recoveryStat,'Int');
});
