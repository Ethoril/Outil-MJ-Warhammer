import test from 'node:test';import assert from 'node:assert/strict';import{createStore}from '../js/core/store.js';import{fixture,priest,snap}from './divin-v5-b5-fixture.mjs';
const MECH=['l06-217-sin-award','l06-220-petty-concerns','l06-229-sword-of-justice','l02-046-handrich-profit-sin','l02-047-shake-on-it-break-sin','l02-018-temple-event','l01-069-hospice-sin','l18-028-taal-sin-award','l21-013-shrine-desecration','l10-020-shrine-sin-removal','l21-007-shining-rock-sin','l26-119-funeral-sin'];
const REMIND=['l06-217-cult-commandements','l02-051-khaine-strictures-penances','l02-053-solkan-strictures-penances','l13-070-myrmidia-strictures','l18-049-ulric-omens','l19-021-ulric-strictures','l20-027-cult-strictures','l24-090-gnome-strictures','l25-083-manann-strictures','l06-229-shackles-of-truth','l06-218-gm-discretionary'];
async function setup(sin){const c=await fixture(sin),a=priest(c.store);await c.store.updateParticipant('priest',{talents:[...a.talents,...['Verena','Handrich','Sigmar','Ulric','Shallya','Taal','Mathlann'].map(specialization=>({id:'talent-bless',rank:1,status:'resolved',specialization}))]});return c;}
const ev=(id,extra={})=>({actorId:'priest',eventId:id,cult:id==='l06-229-sword-of-justice'?'Verena':'Myrmidia',fact:'Fait constaté par le MJ',confirmed:true,...extra});
const sin=s=>priest(s).extensions.v5.divine.sin;
test('B17 — catalogue : douze événements mécaniques et onze rappels, sources et paraphrases courtes',async()=>{
  const{store}=await setup(1),events=store.getDivineSinEvents(),reminders=store.getDivineSinReminders();
  assert.deepEqual(events.map(e=>e.id).sort(),[...MECH].sort());assert.deepEqual(reminders.map(e=>e.id).sort(),[...REMIND].sort());
  for(const row of[...events,...reminders]){assert.ok(row.source.printedPage>0&&row.source.document,row.id);assert.ok(row.text.length>20&&row.text.length<=260,row.id+' '+row.text.length);}
  for(const row of events)assert.ok(['add','add-mj','remove','clear'].includes(row.effect.kind),row.id);
});
test('B17 — ajout fixe : confirmation, fait et culte obligatoires, aperçu inerte, journal et reçu',async()=>{
  const{store}=await setup(1),before=snap(store);
  for(const bad of[{confirmed:false},{confirmed:undefined},{fact:' '},{cult:undefined,eventId:'l06-229-sword-of-justice'},{eventId:'inconnu'}]){const p=store.previewDivineSinEvent(ev('l06-229-sword-of-justice',bad));assert.equal(p.ready,false,JSON.stringify(bad));}
  assert.deepEqual(snap(store),before);const p=store.previewDivineSinEvent(ev('l06-229-sword-of-justice'));assert.equal(p.ready,true,p.error);assert.equal(p.sinBefore,1);assert.equal(p.sinAfter,2);assert.deepEqual(snap(store),before);
  const r=await store.applyDivineSinEvent(ev('l06-229-sword-of-justice'));assert.equal(r.ok,true);assert.equal(sin(store),2);
  const rec=priest(store).extensions.v5.divineSinEvents.at(-1);assert.equal(rec.eventId,'l06-229-sword-of-justice');assert.equal(rec.sinBefore,1);assert.equal(rec.sinAfter,2);assert.equal(rec.fact,'Fait constaté par le MJ');assert.match(snap(store).log[0].text,/Péchés/);
});
test('B17 — attribution à montant MJ : bornes, aucun plafond haut',async()=>{
  const{store}=await setup(10);
  for(const bad of[undefined,0,-1,1.5])assert.equal(store.previewDivineSinEvent(ev('l06-217-sin-award',{amount:bad})).ready,false);
  for(const bad of[0,4])assert.equal(store.previewDivineSinEvent(ev('l06-220-petty-concerns',{amount:bad})).ready,false);
  await store.applyDivineSinEvent(ev('l06-220-petty-concerns',{amount:3}));assert.equal(sin(store),13);await store.applyDivineSinEvent(ev('l06-217-sin-award',{amount:7}));assert.equal(sin(store),20);
});
test('B17 — retraits : un Péché, jamais sous zéro, rien à zéro, remise à zéro pour le fragment sacré, cultes éligibles seulement',async()=>{
  let c=await setup(2);assert.equal(c.store.previewDivineSinEvent(ev('l10-020-shrine-sin-removal')).ready,false,'Myrmidia non éligible');
  await c.store.applyDivineSinEvent(ev('l10-020-shrine-sin-removal',{cult:'Sigmar'}));assert.equal(sin(c.store),1);
  await c.store.applyDivineSinEvent(ev('l26-119-funeral-sin'));assert.equal(sin(c.store),0);assert.equal(c.store.previewDivineSinEvent(ev('l26-119-funeral-sin')).ready,false,'rien à retirer à zéro');
  c=await setup(5);await c.store.applyDivineSinEvent(ev('l21-007-shining-rock-sin',{cult:'Ulric'}));assert.equal(sin(c.store),0);
  c=await setup(5);assert.equal(c.store.previewDivineSinEvent(ev('l21-007-shining-rock-sin')).ready,false);
});
test('B17 — événements propres à Handrich, Shallya, Taal : refusés pour un autre culte',async()=>{
  const{store}=await setup(1);for(const id of['l02-046-handrich-profit-sin','l02-047-shake-on-it-break-sin'])assert.equal(store.previewDivineSinEvent(ev(id)).ready,false,id);
  assert.equal(store.previewDivineSinEvent(ev('l01-069-hospice-sin',{amount:1})).ready,false);assert.equal(store.previewDivineSinEvent(ev('l18-028-taal-sin-award',{amount:1})).ready,false);
});
test('B17 — cultes elfes exemptés : aucune attribution (Q10)',async()=>{
  const{store}=await setup(1);assert.equal(store.previewDivineSinEvent(ev('l06-217-sin-award',{cult:'Mathlann',amount:1})).ready,false);
});
test('B17 — autorité MJ, révision périmée, Undo/Redo, rechargement et refus de persistance',async()=>{
  const{store,persistence,setRefuse}=await setup(1);const player=createStore({storage:null,divineAuthority:'player'});await player.ready;await player.loadFromJSON(snap(store));
  await assert.rejects(()=>player.applyDivineSinEvent(ev('l06-229-sword-of-justice')),/MJ/);await assert.rejects(()=>store.applyDivineSinEvent(ev('l06-229-sword-of-justice',{baseRevision:0})),/changé|relisez/i);
  const b=snap(store);setRefuse(true);const r=await store.applyDivineSinEvent(ev('l06-229-sword-of-justice')).catch(e=>({ok:false,e}));assert.equal(r.ok,false);assert.deepEqual(snap(store),b);setRefuse(false);
  await store.applyDivineSinEvent(ev('l06-229-sword-of-justice'));assert.equal(sin(store),2);await store.undo();assert.equal(sin(store),1);assert.equal(priest(store).extensions.v5.divineSinEvents,undefined);await store.redo();
  const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(JSON.parse(reload.getFullJSON()).combat.participants.find(x=>x.id==='priest').extensions.v5.divineSinEvents.length,1);
});
test('B17 — les rappels (commandements, présages) ne modifient rien',async()=>{
  const{store}=await setup(3),b=snap(store);for(const row of store.getDivineSinReminders())assert.ok(row.text);assert.deepEqual(snap(store),b);
});
const gm=(extra={})=>({actorId:'priest',kind:'gm-wrath',cult:'Myrmidia',reason:'Insulte imprudente envers la déesse',wrathRoll:6,executionId:'b17-gm',...extra});
test('B17 — Courroux décidé par le MJ : Péché positif obligatoire, motif, table sans Test de Prière',async()=>{
  const zero=(await setup(0)).store;assert.equal(zero.previewDivineAbsolution(gm()).ready,false);
  const{store}=await setup(1),before=snap(store);assert.equal(store.previewDivineAbsolution(gm({reason:' '})).ready,false);const miss=store.previewDivineAbsolution(gm({wrathRoll:undefined}));assert.equal(miss.ready,false);assert.ok(miss.needsInput.some(n=>n.field==='wrathRoll'));assert.deepEqual(snap(store),before);
  const p=store.previewDivineAbsolution(gm());assert.equal(p.ready,true,p.error);const r=await store.applyDivineAbsolution({preview:p});assert.equal(r.ok,true,r.error);
  assert.equal(sin(store),0);assert.deepEqual(priest(store).states.map(s=>s.name),['À Terre']);assert.equal(snap(store).extensions.v5.divineWrathRecoveries.at(-1).absolution.kind,'gm-wrath');
});
test('B17 — Courroux MJ : réservé au MJ, ligne dépendant d’un vrai Test de Prière refusée',async()=>{
  const{store}=await setup(1);const p=store.previewDivineAbsolution(gm());const player=createStore({storage:null,divineAuthority:'player'});await player.ready;await player.loadFromJSON(snap(store));
  assert.throws(()=>player.applyDivineAbsolution({preview:p}),/MJ/);assert.equal(sin(store),1);
  const lessons=store.previewDivineAbsolution(gm({wrathRoll:1,executionId:'b17-gm-lessons',wrathDurationRoll:3}));assert.equal(lessons.ready,false);
});
