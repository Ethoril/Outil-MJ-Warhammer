import test from 'node:test';import assert from 'node:assert/strict';import{createStore}from '../js/core/store.js';import{fixture,priest,snap}from './divin-v5-b5-fixture.mjs';
const absol=(extra={})=>({actorId:'priest',kind:'absolution',cult:'Myrmidia',roll:35,canSpeak:true,count:2,reason:'Pèlerinage accompli',executionId:'b16-abs',...extra});
const altdorf=(extra={})=>({actorId:'priest',kind:'altdorf',cult:'Sigmar',roll:45,canSpeak:true,pilgrimageConfirmed:true,executionId:'b16-alt',...extra});
const sin=s=>priest(s).extensions.v5.divine.sin;
async function go(store,payload){const p=store.previewDivineAbsolution(payload);assert.equal(p.ready,true,p.error);const r=await store.applyDivineAbsolution({preview:p});assert.equal(r.ok,true,r.error);return p;}
test('B16 — absolution : données MJ obligatoires, aucun Péché à zéro, aperçu inerte',async()=>{
  const{store}=await fixture(3),before=snap(store);
  for(const bad of[{count:undefined},{count:0},{count:4},{count:1.5},{reason:' '},{cult:'Inconnu'},{canSpeak:false},{roll:undefined},{kind:'autre'}])assert.equal(store.previewDivineAbsolution(absol(bad)).ready,false,JSON.stringify(bad));
  assert.deepEqual(snap(store),before);const zero=(await fixture(0)).store;assert.equal(zero.previewDivineAbsolution(absol({count:1})).ready,false);
  const ok=store.previewDivineAbsolution(absol());assert.equal(ok.ready,true,ok.error);assert.equal(ok.test.success,true);assert.deepEqual(snap(store),before);
});
test('B16 — absolution réussie retire exactement N Péchés, jamais de valeur négative, sans Action consommée',async()=>{
  const{store}=await fixture(3),actions=snap(store).extensions.v5.standardTurnActions;await go(store,absol());assert.equal(sin(store),1);assert.deepEqual(snap(store).extensions.v5.standardTurnActions,actions);
  const rec=snap(store).extensions.v5.divineWrathRecoveries.at(-1);assert.equal(rec.absolution.kind,'absolution');assert.equal(rec.absolution.removed,2);assert.equal(rec.absolution.cult,'Myrmidia');assert.match(snap(store).log[0].text,/Absolution/);
});
test('B16 — absolution ratée : aucun retrait, aucune bénédiction fictive, aucun État',async()=>{
  const{store}=await fixture(3);await go(store,absol({roll:78,executionId:'b16-fail'}));assert.equal(sin(store),3);assert.deepEqual(priest(store).states,[]);assert.equal(snap(store).extensions.v5.divineWrathRecoveries.at(-1).absolution.removed,0);
});
test('B16 — échec avec Courroux : table à Péché positif, À Terre appliqué dans la même commande',async()=>{
  const{store}=await fixture(1);const missing=store.previewDivineAbsolution(absol({roll:91,count:1,executionId:'b16-w'}));assert.equal(missing.ready,false);assert.ok(missing.needsInput.some(n=>n.field==='wrathRoll'));
  await go(store,absol({roll:91,count:1,executionId:'b16-w',wrathRoll:6}));assert.equal(sin(store),0);assert.equal(priest(store).states.length,1);assert.equal(priest(store).states[0].name,'À Terre');
});
test('B16 — succès avec Courroux : retrait d’abord, puis table ; jamais sous zéro',async()=>{
  const{store}=await fixture(1);await go(store,absol({roll:31,count:1,executionId:'b16-sw',wrathRoll:6}));assert.equal(sin(store),0);assert.equal(priest(store).states[0].name,'À Terre');
});
test('B16 — Altdorf : +2 DR, retrait 1 ou 2 à +4 DR, Sigmar et pèlerinage confirmé exigés',async()=>{
  for(const bad of[{cult:'Myrmidia'},{pilgrimageConfirmed:false},{pilgrimageConfirmed:undefined}]){const{store}=await fixture(3);assert.equal(store.previewDivineAbsolution(altdorf(bad)).ready,false,JSON.stringify(bad));}
  let c=await fixture(3);let p=await go(c.store,altdorf({roll:51}));assert.equal(p.difficulty,2);assert.equal(sin(c.store),2);
  c=await fixture(3);await go(c.store,altdorf({roll:35}));assert.equal(sin(c.store),1);
  c=await fixture(3);await go(c.store,altdorf({roll:30,executionId:'b16-alt30'}));assert.equal(sin(c.store),1);assert.equal(snap(c.store).extensions.v5.divineWrathRecoveries.at(-1).wrath.triggered,false);
  c=await fixture(0);assert.equal(c.store.previewDivineAbsolution(altdorf()).ready,false);
});
test('B16 — Altdorf : échec ordinaire = un Exténué, aucun retrait',async()=>{
  const{store}=await fixture(3);await go(store,altdorf({roll:97}));assert.equal(sin(store),3);assert.deepEqual(priest(store).states.map(s=>[s.name,s.level||1]),[['Exténué',1]]);
});
test('B16 — Altdorf : maladresse ouvre la table à Péché positif (pas d’Exténué)',async()=>{
  const{store}=await fixture(1);const miss=store.previewDivineAbsolution(altdorf({roll:99,executionId:'b16-f'}));assert.equal(miss.ready,false);assert.ok(miss.needsInput.some(n=>n.field==='wrathRoll'));
  await go(store,altdorf({roll:99,executionId:'b16-f',wrathRoll:6}));assert.deepEqual(priest(store).states.map(s=>s.name),['À Terre']);assert.equal(sin(store),0);
});
test('B16 — Péchés d’un culte elfe : absolution refusée (exemption)',async()=>{
  const{store}=await fixture(3);assert.equal(store.previewDivineAbsolution(absol({cult:'Mathlann'})).ready,false);
});
test('B16 — aperçu falsifié, périmé et double clic : aucune mutation',async()=>{
  const{store}=await fixture(3),p=store.previewDivineAbsolution(absol()),forged=structuredClone(p);forged.input.count=3;const b=snap(store);
  await assert.rejects(()=>store.applyDivineAbsolution({preview:forged}),/aperçu|recalculez/i);assert.deepEqual(snap(store),b);
  await store.setDivineSin('priest',2,{reason:'Changement'});await assert.rejects(()=>store.applyDivineAbsolution({preview:p}),/changé|recalculez/i);
  const q=store.previewDivineAbsolution(absol({executionId:'b16-two'}));await store.applyDivineAbsolution({preview:q});await assert.rejects(()=>store.applyDivineAbsolution({preview:q}),/aperçu|recalculez|changé|déjà/i);assert.equal(sin(store),0);
});
test('B16 — refus de persistance, Undo/Redo et rechargement',async()=>{
  const{store,persistence,setRefuse}=await fixture(3),p=store.previewDivineAbsolution(absol()),b=snap(store);
  setRefuse(true);const r=await store.applyDivineAbsolution({preview:p}).catch(e=>({ok:false,e}));assert.equal(r.ok,false);assert.deepEqual(snap(store),b);setRefuse(false);
  await store.applyDivineAbsolution({preview:p});assert.equal(sin(store),1);await store.undo();assert.equal(sin(store),3);await store.redo();assert.equal(sin(store),1);
  const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(JSON.parse(reload.getFullJSON()).combat.participants.find(x=>x.id==='priest').extensions.v5.divine.sin,1);
});
