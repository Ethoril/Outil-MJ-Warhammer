import test from 'node:test';import assert from 'node:assert/strict';import{createStore}from '../js/core/store.js';import{fixture,priest,snap,input,BATTLE}from './divin-v5-b5-fixture.mjs';
const PROFILE={name:'Démon mineur B14',wounds:12,initiative:35,caracs:{CC:45,F:40,E:30},traits:['Démoniaque']};
const demon=(extra={})=>input(78,{executionId:'b14-demon',wrathSummonProfile:PROFILE,wrathSummonDistanceRoll:11,wrathSummonPosition:'Derrière les caisses, côté nord',wrathSummonTargetId:'ally',...extra});
const servant=(extra={})=>input(91,{executionId:'b14-servant',wrathSummonProfile:{...PROFILE,name:'Loup blanc B14',traits:[]},wrathSummonDistanceRoll:64,wrathSummonPosition:'Sur le toit voisin',wrathSummonCamp:'allie',wrathSummonBehavior:'Observe puis réprimande le prêtre',...extra});
const rows=s=>snap(s).combat.participants,created=s=>rows(s).filter(r=>r.extensions?.v5?.divineWrathSummon);
async function go(store,payload){const p=store.previewDivineExecution(BATTLE,payload);assert.equal(p.ready,true,p.error);const r=await store.applyDivineExecution(BATTLE,{preview:p});assert.equal(r.ok,true,r.error);return p;}
test('B14 — démon : champs obligatoires, aucun défaut inventé, aperçu inerte',async()=>{
  const{store}=await fixture(1),before=snap(store);
  for(const key of['wrathSummonProfile','wrathSummonDistanceRoll','wrathSummonPosition','wrathSummonTargetId']){const p=store.previewDivineExecution(BATTLE,demon({[key]:undefined}));assert.equal(p.ready,false,key);assert.equal(p.wrathTableResult.id,'wrath:88-88');assert.ok(p.needsInput.some(row=>row.field===key),key+' '+JSON.stringify(p.needsInput));}
  assert.deepEqual(snap(store),before);
  const ok=store.previewDivineExecution(BATTLE,demon());assert.equal(ok.ready,true,ok.error);assert.equal(ok.wrathSummonPreview.kind,'demon');assert.equal(ok.wrathSummonPreview.distanceYards,11);assert.deepEqual(snap(store),before);
});
test('B14 — démon : 2d10 entre 2 et 20, cible existante, profil valide',async()=>{
  const{store}=await fixture(1);
  for(const bad of[{wrathSummonDistanceRoll:1},{wrathSummonDistanceRoll:21},{wrathSummonDistanceRoll:5.5},{wrathSummonTargetId:'inconnu'},{wrathSummonPosition:'  '},{wrathSummonPosition:'x'.repeat(201)},
    {wrathSummonProfile:{...PROFILE,wounds:0}},{wrathSummonProfile:{...PROFILE,initiative:-1}},{wrathSummonProfile:{...PROFILE,name:''}},{wrathSummonProfile:{...PROFILE,caracs:{XX:10}}},{wrathSummonProfile:{...PROFILE,caracs:{CC:-1}}},{wrathSummonProfile:{...PROFILE,traits:[3]}},{wrathSummonProfile:{...PROFILE,armor:{head:9}}}])
    assert.equal(store.previewDivineExecution(BATTLE,demon(bad)).ready,false,JSON.stringify(bad));
  for(const good of[2,20])assert.equal(store.previewDivineExecution(BATTLE,demon({wrathSummonDistanceRoll:good})).ready,true);
});
test('B14 — démon appliqué : un seul participant hostile, profil confirmé, rien d’inventé, Péché décrémenté',async()=>{
  const{store}=await fixture(1),before=rows(store).map(r=>r.id);await go(store,demon());
  const made=created(store);assert.equal(made.length,1);const d=made[0];
  assert.equal(d.camp,'ennemi');assert.equal(d.name,PROFILE.name);assert.equal(d.hp,12);assert.equal(d.maxHp,12);assert.equal(d.initiative,35);assert.equal(d.zone,'active');assert.deepEqual(d.caracs,{CC:45,F:40,E:30});assert.deepEqual(d.traits,['Démoniaque']);
  assert.deepEqual(d.actions||[],[]);assert.deepEqual(d.armor,{head:0,body:0,arms:0,legs:0});
  const link=d.extensions.v5.divineWrathSummon;assert.equal(link.kind,'demon');assert.equal(link.targetId,'ally');assert.equal(link.distanceYards,11);assert.equal(link.ownerId,'priest');assert.equal(link.resultId,'wrath:88-88');assert.equal(link.executionId,'b14-demon');
  assert.match(d.notes,/11 m/);assert.match(d.notes,/Derrière les caisses/);
  assert.equal(rows(store).length,before.length+1);assert.equal(priest(store).extensions.v5.divine.sin,0);
  assert.equal(snap(store).extensions.v5.divineExecutions.at(-1).wrathSummonReceipt.participantId,d.id);
});
test('B14 — la cible désignée peut être le prêtre ; le démon ne peut pas se cibler lui-même',async()=>{
  const{store}=await fixture(1);assert.equal(store.previewDivineExecution(BATTLE,demon({wrathSummonTargetId:'priest'})).ready,true);
  assert.equal(store.previewDivineExecution(BATTLE,demon({wrathSummonTargetId:'divine-wrath-summon:b14-demon'})).ready,false);
});
test('B14 — serviteur : d100, camp et comportement choisis par le MJ, un seul participant',async()=>{
  const{store}=await fixture(5);
  for(const key of['wrathSummonProfile','wrathSummonDistanceRoll','wrathSummonPosition','wrathSummonCamp','wrathSummonBehavior']){const p=store.previewDivineExecution(BATTLE,servant({[key]:undefined}));assert.equal(p.ready,false,key);assert.equal(p.wrathTableResult.id,'wrath:141-145');assert.ok(p.needsInput.some(row=>row.field===key),key);}
  for(const bad of[{wrathSummonDistanceRoll:0},{wrathSummonDistanceRoll:101},{wrathSummonCamp:'pj'},{wrathSummonCamp:'amis'},{wrathSummonBehavior:' '}])assert.equal(store.previewDivineExecution(BATTLE,servant(bad)).ready,false,JSON.stringify(bad));
  await go(store,servant());const made=created(store);assert.equal(made.length,1);const s=made[0];
  assert.equal(s.camp,'allie');assert.equal(s.name,'Loup blanc B14');assert.equal(s.extensions.v5.divineWrathSummon.kind,'servant');assert.equal(s.extensions.v5.divineWrathSummon.distanceYards,64);assert.equal(s.extensions.v5.divineWrathSummon.targetId,undefined);
  assert.match(s.notes,/64 m/);assert.match(s.notes,/réprimande/);assert.deepEqual(s.actions||[],[]);assert.equal(priest(store).extensions.v5.divine.sin,4);
});
test('B14 — une réinjection client du plan ou de l’identifiant du participant est ignorée',async()=>{
  const{store}=await fixture(1);const p=store.previewDivineExecution(BATTLE,demon({wrathSummonPlan:{id:'x',profile:{name:'Dragon',wounds:999,initiative:99}}}));assert.equal(p.ready,true,p.error);
  await store.applyDivineExecution(BATTLE,{preview:p});assert.equal(created(store).length,1);assert.equal(created(store)[0].name,PROFILE.name);assert.equal(created(store)[0].hp,12);
});
test('B14 — aperçu falsifié ou périmé, double application : aucune mutation ni second participant',async()=>{
  const{store}=await fixture(1),p=store.previewDivineExecution(BATTLE,demon());const forged=structuredClone(p);forged.input.wrathSummonProfile.wounds=99;
  await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview:forged}),/aperçu|recalculez/i);assert.equal(created(store).length,0);
  await store.applyDivineExecution(BATTLE,{preview:p});await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview:p}),/aperçu|recalculez|changé/i);assert.equal(created(store).length,1);
  const stale=(await fixture(1)).store;const q=stale.previewDivineExecution(BATTLE,demon());await stale.updateParticipant('ally',{name:'Autre'});await assert.rejects(()=>stale.applyDivineExecution(BATTLE,{preview:q}),/changé|recalculez/i);assert.equal(created(stale).length,0);
});
test('B14 — identifiant de participant déjà pris : blocage sans écrasement',async()=>{
  const{store}=await fixture(1),state=JSON.parse(store.getFullJSON());state.combat.participants.push({...state.combat.participants[1],id:'divine-wrath-summon:b14-clash',name:'Occupant'});state.combat.order.push('divine-wrath-summon:b14-clash');await store.loadFromJSON(state);
  const p=store.previewDivineExecution(BATTLE,demon({executionId:'b14-clash'}));assert.equal(p.ready,false);assert.equal(rows(store).filter(r=>r.id==='divine-wrath-summon:b14-clash').length,1);
});
test('B14 — refus de persistance, Undo/Redo et rechargement',async()=>{
  const{store,persistence,setRefuse}=await fixture(1),before=snap(store),p=store.previewDivineExecution(BATTLE,demon());
  setRefuse(true);assert.equal((await store.applyDivineExecution(BATTLE,{preview:p})).ok,false);assert.deepEqual(snap(store),before);setRefuse(false);
  await store.applyDivineExecution(BATTLE,{preview:p});assert.equal(created(store).length,1);
  await store.undo();assert.equal(created(store).length,0);assert.equal(priest(store).extensions.v5.divine.sin,1);
  await store.redo();assert.equal(created(store).length,1);
  const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(created(reload).length,1);assert.equal(created(reload)[0].extensions.v5.divineWrathSummon.targetId,'ally');
});
test('B14 — la créature reste jusqu’au retrait par le MJ (pas de balayage d’invocation)',async()=>{
  const{store}=await fixture(1);await go(store,demon());await store.updateParticipant('priest',{hp:19});await store.undo();await store.redo();
  assert.equal(created(store).length,1);await store.removeParticipant?.(created(store)[0].id);
});
test('B14 — récupération B04 déclenchant 88 crée aussi le démon',async()=>{
  const{store}=await fixture(1);let p=store.previewDivineExecution(BATTLE,input(6,{executionId:'b14-prone'}));assert.equal(p.ready,true,p.error);await store.applyDivineExecution(BATTLE,{preview:p});
  await store.setDivineSin('priest',1,{reason:'Nouvelle occurrence'});
  const rec={actorId:'priest',stateId:priest(store).states[0].id,roll:99,canSpeak:true,wrathRoll:78};
  const missing=store.previewDivineWrathRecovery(rec);assert.equal(missing.ready,false);
  p=store.previewDivineWrathRecovery({...rec,executionId:'b14-rec',wrathSummonProfile:PROFILE,wrathSummonDistanceRoll:4,wrathSummonPosition:'À la porte',wrathSummonTargetId:'ally'});assert.equal(p.ready,true,p.error);
  assert.equal((await store.applyDivineWrathRecovery({preview:p})).ok,true);assert.equal(created(store).length,1);assert.equal(priest(store).extensions.v5.divine.sin,0);
});
const auto=async sin=>{const f=await fixture(sin),state=JSON.parse(f.store.getFullJSON());state.combat.orderMode='automatic';state.extensions.v5.orderRound=1;await f.store.loadFromJSON(state);return f;};
test('B14 — ordre automatique : le participant entre dans l’ordre d’Initiative sans rejouer de Tour',async()=>{
  const{store}=await auto(1),order=snap(store).combat.order,current=snap(store).combat.currentActorId;await go(store,demon());
  const id=created(store)[0].id,after=snap(store).combat;assert.ok(after.order.includes(id));assert.equal(after.currentActorId,current);assert.deepEqual(after.order.filter(x=>x!==id),order);
});
test('B14 — récupération B04 en ordre automatique : le participant entre dans l’ordre',async()=>{
  const{store}=await auto(1);let p=store.previewDivineExecution(BATTLE,input(6,{executionId:'b14-prone-auto'}));await store.applyDivineExecution(BATTLE,{preview:p});await store.setDivineSin('priest',1,{reason:'Nouvelle occurrence'});
  p=store.previewDivineWrathRecovery({actorId:'priest',stateId:priest(store).states[0].id,roll:99,canSpeak:true,wrathRoll:78,executionId:'b14-rec-auto',wrathSummonProfile:PROFILE,wrathSummonDistanceRoll:4,wrathSummonPosition:'À la porte',wrathSummonTargetId:'ally'});assert.equal(p.ready,true,p.error);
  await store.applyDivineWrathRecovery({preview:p});assert.ok(snap(store).combat.order.includes(created(store)[0].id));
});
