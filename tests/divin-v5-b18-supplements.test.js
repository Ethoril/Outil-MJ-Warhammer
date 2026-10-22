import test from 'node:test';import assert from 'node:assert/strict';import{createStore}from '../js/core/store.js';import{fixture,priest,snap,input,BATTLE}from './divin-v5-b5-fixture.mjs';
const sin=s=>priest(s).extensions.v5.divine.sin,relics=s=>priest(s).extensions.v5.divineRelics||[];
const relic=(extra={})=>({deity:'Myrmidia',label:'Lance de la déesse',prayerSL:2,wrathReduction:20,reason:'Relique authentique selon le MJ',...extra});
// ── B18.1 Reliques (L21 p.7) ─────────────────────────────────────────────────
test('B18 relique — création MJ : paramètres de la source seulement, aucune valeur inventée',async()=>{
  const{store}=await fixture(0),before=snap(store);
  for(const bad of[{prayerSL:0},{prayerSL:4},{prayerSL:1.5},{wrathReduction:5},{wrathReduction:40},{wrathReduction:15},{deity:'Inconnu'},{label:' '},{reason:''},{prayerSL:undefined},{wrathReduction:undefined}])await assert.rejects(()=>store.setDivineRelic('priest',relic(bad)),undefined,JSON.stringify(bad));
  assert.deepEqual(snap(store),before);const r=await store.setDivineRelic('priest',relic());assert.equal(r.ok,true);assert.equal(relics(store).length,1);assert.equal(relics(store)[0].source.printedPage,7);
  const player=createStore({storage:null,divineAuthority:'player'});await player.ready;await player.loadFromJSON(snap(store));await assert.rejects(()=>player.setDivineRelic('priest',relic({label:'Autre'})),/MJ/);
});
test('B18 relique — +1 à +3 DR aux Tests de Prière de ce dieu seulement',async()=>{
  const{store}=await fixture(0),pay={roll:40,wrathRoll:undefined,executionId:'b18-sl',expiry:{phase:'endOfRound',round:6}};
  const base=store.previewDivineExecution(BATTLE,input(1,pay));assert.equal(base.ready,true,base.error);await store.setDivineRelic('priest',relic({prayerSL:2}));
  const boosted=store.previewDivineExecution(BATTLE,input(1,pay));assert.equal(boosted.ready,true,boosted.error);assert.equal(boosted.preview.prayer.sl,base.preview.prayer.sl+2);
  await store.setDivineRelic('priest',relic({label:'Seconde relique'}));assert.equal(store.previewDivineExecution(BATTLE,input(1,pay)).ready,false,'cumul non défini');
});
test('B18 relique — Courroux : résultat ≤ 0 évité, sans table, sans décrément',async()=>{
  const{store}=await fixture(1);await store.setDivineRelic('priest',relic({wrathReduction:20}));
  const p=store.previewDivineExecution(BATTLE,input(10,{executionId:'b18-avoid'}));assert.equal(p.ready,true,p.error);assert.equal(p.preview.wrath.triggered,true);assert.equal(p.preview.wrath.avoided,true);assert.equal(p.preview.wrath.modifiedRoll,0);assert.equal(p.wrathTableResult,null);assert.equal(p.preview.wrath.sinAfter,1);
  const r=await store.applyDivineExecution(BATTLE,{preview:p});assert.equal(r.ok,true,r.error);assert.equal(sin(store),1);assert.deepEqual(priest(store).states,[]);assert.equal(r.receipt.wrath.avoided,true);
});
test('B18 relique — la réduction décale la ligne de table avec une preuve de jet cohérente',async()=>{
  const{store}=await fixture(1);await store.setDivineRelic('priest',relic({wrathReduction:10}));
  const p=store.previewDivineExecution(BATTLE,input(16,{executionId:'b18-shift'}));assert.equal(p.ready,true,p.error);assert.equal(p.wrathTableResult.id,'wrath:16-20');assert.equal(p.preview.wrath.rawRoll,16);assert.equal(p.preview.wrath.roll,6);assert.equal(p.preview.wrath.modifiedRoll,16);assert.equal(p.preview.wrath.relic.wrathReduction,10);
  await store.applyDivineExecution(BATTLE,{preview:p});assert.equal(sin(store),0);assert.equal(priest(store).states[0].name,'À Terre');
});
test('B18 relique — un résultat positif non représentable par un jet 1–100 est refusé, pas inventé',async()=>{
  const{store}=await fixture(3);await store.setDivineRelic('priest',relic({wrathReduction:30}));
  const p=store.previewDivineExecution(BATTLE,input(5,{executionId:'b18-low'}));assert.equal(p.ready,false);assert.ok(p.needsInput.some(n=>n.field==='wrathRoll'));
});
test('B18 relique — récupération B04 et retrait, Undo/Redo et rechargement',async()=>{
  const{store,persistence}=await fixture(1);await store.setDivineRelic('priest',relic({wrathReduction:20}));
  let p=store.previewDivineExecution(BATTLE,input(6,{executionId:'b18-prone'}));assert.equal(p.ready,true,p.error);
  await store.undo();assert.equal(relics(store).length,0);await store.redo();assert.equal(relics(store).length,1);
  const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(JSON.parse(reload.getFullJSON()).combat.participants.find(x=>x.id==='priest').extensions.v5.divineRelics.length,1);
  const id=relics(store)[0].id;await assert.rejects(()=>store.removeDivineRelic('priest',id,{reason:''}));assert.equal((await store.removeDivineRelic('priest',id,{reason:'Relique perdue'})).ok,true);assert.equal(relics(store).length,0);
});
// ── B18.2 Livre sacré perdu (L22 p.39) : Courroux quotidien jusqu'aux faits MJ ──────────────────────────────
const daily=s=>priest(s).extensions.v5.divineDailyWraths||[];
async function advance(s,seconds){const clock=snap(s).extensions.v5.gameClock,command={seconds,reason:'Temps B18',eventId:'clock-v1:'+clock.revision+':b18-'+seconds,clockBaseRevision:clock.revision};return s.advanceCampaignTime(command);}
const tome=(extra={})=>({cult:'Myrmidia',label:'Liber Bubonicus perdu',reason:'Perte constatée par le MJ',...extra});
const gm=(id,extra={})=>({actorId:'priest',kind:'gm-wrath',cult:'Myrmidia',reason:'Jour du livre perdu',wrathRoll:6,dailyWrathId:id,executionId:'b18-day-'+Math.random().toString(36).slice(2),...extra});
test('B18 livre — suivi quotidien : données MJ, horloge et culte requis, MJ seul',async()=>{
  const{store}=await fixture(1),before=snap(store);
  for(const bad of[{label:' '},{reason:''},{cult:'Inconnu'},{cult:'Mathlann'}])await assert.rejects(()=>store.startDivineDailyWrath('priest',tome(bad)),undefined,JSON.stringify(bad));
  assert.deepEqual(snap(store),before);const r=await store.startDivineDailyWrath('priest',tome());assert.equal(r.ok,true);const rec=daily(store)[0];assert.equal(rec.status,'active');assert.equal(rec.resolvedDays,0);assert.equal(rec.waivedDays,0);assert.equal(rec.source.printedPage,39);assert.equal(store.getDivineDailyWrathStatus('priest',rec.id).dueDays,0);
  const player=createStore({storage:null,divineAuthority:'player'});await player.ready;await player.loadFromJSON(snap(store));await assert.rejects(()=>player.startDivineDailyWrath('priest',tome()),/MJ/);
});
test('B18 livre — jours dus calculés sur l’horloge de campagne, jamais inventés',async()=>{
  const{store}=await fixture(1);await store.startDivineDailyWrath('priest',tome());const id=daily(store)[0].id;
  await advance(store,86399);assert.equal(store.getDivineDailyWrathStatus('priest',id).dueDays,0);await advance(store,1);assert.equal(store.getDivineDailyWrathStatus('priest',id).dueDays,1);await advance(store,86400*2);assert.equal(store.getDivineDailyWrathStatus('priest',id).dueDays,3);
  assert.equal(store.previewDivineAbsolution(gm('inconnu')).ready,false);
});
test('B18 livre — un jour dû se joue par la table MJ (Péché positif), un seul jour par exécution',async()=>{
  const{store}=await fixture(1);await store.startDivineDailyWrath('priest',tome());const id=daily(store)[0].id;
  assert.equal(store.previewDivineAbsolution(gm(id)).ready,false,'aucun jour dû');await advance(store,86400*2);
  const p=store.previewDivineAbsolution(gm(id));assert.equal(p.ready,true,p.error);await store.applyDivineAbsolution({preview:p});
  assert.equal(daily(store)[0].resolvedDays,1);assert.equal(store.getDivineDailyWrathStatus('priest',id).dueDays,1);assert.equal(sin(store),0);
  assert.equal(store.previewDivineAbsolution(gm(id)).ready,false,'Péché à zéro : pas de table (Q12)');
});
test('B18 livre — à zéro Péché le jour est écarté par le MJ avec motif (Q12) ; jamais à Péché positif',async()=>{
  const{store}=await fixture(1);await store.startDivineDailyWrath('priest',tome());const id=daily(store)[0].id;await advance(store,86400);
  await assert.rejects(()=>store.waiveDivineDailyWrathDay('priest',id,{reason:'x'}),/Péché|table/i);
  await store.setDivineSin('priest',0,{reason:'Remise à zéro'});await assert.rejects(()=>store.waiveDivineDailyWrathDay('priest',id,{reason:' '}),/motif/i);
  assert.equal((await store.waiveDivineDailyWrathDay('priest',id,{reason:'Aucun Péché : pas de table'})).ok,true);assert.equal(daily(store)[0].waivedDays,1);assert.equal(store.getDivineDailyWrathStatus('priest',id).dueDays,0);
  await assert.rejects(()=>store.waiveDivineDailyWrathDay('priest',id,{reason:'encore'}),/jour|dû/i);
});
test('B18 livre — clôture MJ, Undo/Redo, rechargement ; retrait générique refusé',async()=>{
  const{store,persistence}=await fixture(1);await store.startDivineDailyWrath('priest',tome());const id=daily(store)[0].id;
  const a=priest(store);await assert.rejects(()=>store.updateParticipant('priest',{extensions:{...a.extensions,v5:{...a.extensions.v5,divineDailyWraths:[]}}}),/livre|quotidien|attest|refus/i);
  await assert.rejects(()=>store.closeDivineDailyWrath('priest',id,{reason:''}),/motif/i);await store.closeDivineDailyWrath('priest',id,{reason:'Livre retrouvé et voleurs punis'});assert.equal(daily(store)[0].status,'closed');
  await assert.rejects(()=>store.closeDivineDailyWrath('priest',id,{reason:'encore'}),/déjà|clos/i);await store.undo();assert.equal(daily(store)[0].status,'active');await store.redo();
  const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(JSON.parse(reload.getFullJSON()).combat.participants.find(x=>x.id==='priest').extensions.v5.divineDailyWraths[0].status,'closed');
});
