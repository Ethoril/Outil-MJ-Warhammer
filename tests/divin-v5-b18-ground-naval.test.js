import test from 'node:test';import assert from 'node:assert/strict';import{createStore}from '../js/core/store.js';import{fixture,priest,snap}from './divin-v5-b5-fixture.mjs';
const sin=s=>priest(s).extensions.v5.divine.sin;
// ── B18.3 Terre sanctifiée (L22 p.71) ───────────────────────────────────────────────────────────────────────
const grounds=s=>snap(s).extensions.v5.sanctifiedGrounds||[];
const ground=(extra={})=>({label:'Ermitage du Vieux Hâlin',radiusYards:30,sinThreshold:3,effect:'ablaze',reason:'Terre sanctifiée par la piété de l’ermite',...extra});
test('B18 terre sanctifiée — création MJ : rayon ≤ 30 yards, seuil de Péchés fourni par le MJ (jamais par défaut)',async()=>{
  const{store}=await fixture(1);
  for(const bad of[{radiusYards:0},{radiusYards:31},{radiusYards:2.5},{sinThreshold:0},{sinThreshold:undefined},{sinThreshold:1.5},{effect:'autre'},{label:' '},{reason:''}])await assert.rejects(()=>store.setSanctifiedGround(ground(bad)),undefined,JSON.stringify(bad));
  assert.equal(grounds(store).length,0);const r=await store.setSanctifiedGround(ground());assert.equal(r.ok,true);assert.equal(grounds(store)[0].source.printedPage,71);
  const player=createStore({storage:null,divineAuthority:'player'});await player.ready;await player.loadFromJSON(snap(store));await assert.rejects(()=>player.setSanctifiedGround(ground({label:'Autre'})),/MJ/);
});
test('B18 terre sanctifiée — entrée : Péchés au seuil ou monstre déclaré = un Enflammé canonique, sans doublon ; sortie le retire',async()=>{
  const{store}=await fixture(3);await store.setSanctifiedGround(ground());const id=grounds(store)[0].id;
  assert.equal((await store.enterSanctifiedGround('ally',id,{kind:'character',reason:'Entre'})).affected,false);assert.deepEqual(snap(store).combat.participants.find(p=>p.id==='ally').states,[]);
  const r=await store.enterSanctifiedGround('priest',id,{kind:'character',reason:'Entre au seuil'});assert.equal(r.affected,true);assert.equal(r.outcome,'ablaze');assert.deepEqual(priest(store).states.map(s=>[s.name,s.level||1]),[['Enflammé',1]]);
  await store.enterSanctifiedGround('priest',id,{kind:'character',reason:'Encore'});assert.equal(priest(store).states.length,1,'pas de doublon');
  await store.leaveSanctifiedGround('priest',id,{reason:'Sort'});assert.deepEqual(priest(store).states,[]);
  await store.enterSanctifiedGround('ally',id,{kind:'monster',reason:'Monstre'});assert.equal(snap(store).combat.participants.find(p=>p.id==='ally').states.length,1);
});
test('B18 terre sanctifiée — mode « barré » : franchissement refusé sans mutation ; seuil strictement fourni',async()=>{
  const{store}=await fixture(2);await store.setSanctifiedGround(ground({effect:'barred',sinThreshold:3}));const id=grounds(store)[0].id;
  assert.equal((await store.enterSanctifiedGround('priest',id,{kind:'character',reason:'x'})).affected,false);
  await store.setDivineSin('priest',3,{reason:'Au seuil'});const before=snap(store),r=await store.enterSanctifiedGround('priest',id,{kind:'character',reason:'Tente'});assert.equal(r.affected,true);assert.equal(r.outcome,'barred');assert.deepEqual(snap(store).combat.participants.find(p=>p.id==='priest').states,before.combat.participants.find(p=>p.id==='priest').states);
  await assert.rejects(()=>store.enterSanctifiedGround('priest',id,{kind:'inconnu',reason:'x'}));await assert.rejects(()=>store.enterSanctifiedGround('priest','nope',{kind:'character',reason:'x'}));
});
test('B18 terre sanctifiée — Undo/Redo, rechargement, retrait par le MJ',async()=>{
  const{store,persistence}=await fixture(3);await store.setSanctifiedGround(ground());const id=grounds(store)[0].id;await store.enterSanctifiedGround('priest',id,{kind:'character',reason:'x'});
  await store.undo();assert.equal(priest(store).states.length,0);await store.redo();assert.equal(priest(store).states.length,1);
  const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(JSON.parse(reload.getFullJSON()).extensions.v5.sanctifiedGrounds.length,1);
  await assert.rejects(()=>store.removeSanctifiedGround(id,{reason:''}));await store.removeSanctifiedGround(id,{reason:'Lieu profané'});assert.equal(grounds(store).length,0);
});
// ── B18.4 Manann et Stromfels (L25 p.87/91) : faits navals fournis, aucun sous-système naval ────────────────
const naval=s=>priest(s).extensions.v5.divineNavalEvents||[];
const nv=(extra={})=>({actorId:'priest',kind:'manann-overuse',cult:'Manann',ship:'La Mouette',moonPeriod:'Entre les pleines lunes de Mannslieb du 12',shipsBlessed:4,failedPrayerConfirmed:true,moodRoll:6,fact:'Quatrième navire béni, Prière ratée',confirmed:true,...extra});
async function setupNaval(n){const c=await fixture(n),a=priest(c.store);await c.store.updateParticipant('priest',{talents:[...a.talents,...['Manann','Stromfels'].map(specialization=>({id:'talent-bless',rank:1,status:'resolved',specialization}))]});return c;}
test('B18 Manann — surutilisation : plus de trois navires et Prière ratée = 1 Péché et −d10 d’humeur, faits fournis',async()=>{
  const{store}=await setupNaval(1),before=snap(store);
  for(const bad of[{shipsBlessed:3},{shipsBlessed:undefined},{failedPrayerConfirmed:false},{moodRoll:0},{moodRoll:11},{ship:' '},{moonPeriod:''},{confirmed:false},{fact:' '},{cult:'Myrmidia'}])assert.equal(store.previewDivineNavalEvent(nv(bad)).ready,false,JSON.stringify(bad));
  assert.deepEqual(snap(store),before);const p=store.previewDivineNavalEvent(nv());assert.equal(p.ready,true,p.error);assert.equal(p.sinDelta,1);assert.equal(p.moodDelta,-6);assert.deepEqual(snap(store),before);
  const r=await store.applyDivineNavalEvent(nv());assert.equal(r.ok,true);assert.equal(sin(store),2);assert.equal(naval(store)[0].moodDelta,-6);assert.equal(naval(store)[0].ship,'La Mouette');
});
test('B18 Manann — voyage béni : humeur +2d10 − Péchés calculée depuis la fiche, aucune mutation de Péché',async()=>{
  const{store}=await setupNaval(3);const base={actorId:'priest',kind:'blessed-voyage',cult:'Manann',ship:'La Mouette',diceTotal:14,fact:'Rites accomplis',confirmed:true};
  for(const bad of[{diceTotal:1},{diceTotal:21},{diceTotal:undefined},{ship:''}])assert.equal(store.previewDivineNavalEvent({...base,...bad}).ready,false,JSON.stringify(bad));
  const p=store.previewDivineNavalEvent(base);assert.equal(p.ready,true,p.error);assert.equal(p.moodDelta,11);await store.applyDivineNavalEvent(base);assert.equal(sin(store),3);assert.equal(naval(store)[0].moodDelta,11);
});
test('B18 Stromfels — le jet de table reçoit le total de Péchés (L25 p.91)',async()=>{
  const{store}=await setupNaval(4);const base={actorId:'priest',kind:'stromfels-mood',cult:'Stromfels',tableRoll:37,fact:'Miracle ignorant l’humeur de Manann',confirmed:true};
  for(const bad of[{tableRoll:0},{tableRoll:101},{tableRoll:undefined},{cult:'Manann'}])assert.equal(store.previewDivineNavalEvent({...base,...bad}).ready,false,JSON.stringify(bad));
  const p=store.previewDivineNavalEvent(base);assert.equal(p.ready,true,p.error);assert.equal(p.modifiedRoll,41);await store.applyDivineNavalEvent(base);assert.equal(naval(store)[0].modifiedRoll,41);assert.equal(sin(store),4);
});
test('B18 navals — MJ seul, Undo/Redo et rechargement',async()=>{
  const{store,persistence}=await setupNaval(1);const player=createStore({storage:null,divineAuthority:'player'});await player.ready;await player.loadFromJSON(snap(store));await assert.rejects(()=>player.applyDivineNavalEvent(nv()),/MJ/);
  await store.applyDivineNavalEvent(nv());await store.undo();assert.equal(sin(store),1);assert.equal(naval(store).length,0);await store.redo();
  const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(JSON.parse(reload.getFullJSON()).combat.participants.find(x=>x.id==='priest').extensions.v5.divineNavalEvents.length,1);
});
