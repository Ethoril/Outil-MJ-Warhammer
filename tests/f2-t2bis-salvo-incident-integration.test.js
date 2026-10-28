import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const weapon={id:'salvo-gun',name:'Arquebuse à salve',kind:'weapon',category:'Engineering',damage:4,keywords:[{id:'a-poudre-noire'},{id:'salve',parameter:'4'},{id:'recharge',parameter:'4'}]};
const person=(id,camp='hero')=>({id,name:id,kind:'PNJ',camp,zone:'active',hp:20,maxHp:20,initiative:id==='gunner'?20:10,caracs:{CC:50,CT:50,F:40,E:30,Ag:40,I:30},skills:[],states:[],armor:{head:0,body:0,arms:0,legs:0},equipment:[],extensions:{v5:{}}});
async function setup(context,trigger=99){
  const store=createStore();await store.ready;
  const gunner={...person('gunner'),equipment:[structuredClone(weapon)]},crew=person('crew'),victim=person('victim','enemy');
  await store.addParticipant(gunner);await store.addParticipant(crew);await store.addParticipant(victim);store.setRoundTurn(1,'gunner');
  const preview=store.previewResolution({resolutionId:'salvo-incident',actorId:'gunner',targetId:'victim',action:{type:'attack',base:50,attr:'CT',damage:4,note:weapon.name,extensions:{fiche:{equipmentId:weapon.id}}},roll:trigger,v5:{kind:'ranged',context:{crewCount:2,blackpowderStockInitial:{confirmed:true,projectiles:8,powderCharges:8},recoilTestBase:60,recoilTestRoll:30,...context}}});
  return{store,preview};
}
const crewContext=(roll,extra={})=>({powderIncidentRoll:1,salvoIncidentRoll:roll,salvoCrewIds:['crew'],salvoUnitsRoll:2,...extra});

test('T2 bis Salve p.126 : les résultats 1–4 appliquent le bras principal et leur dé-unité, puis Undo restaure l’état',async()=>{
  const {store,preview}=await setup(crewContext(4,{salvoPrimaryArms:{crew:'left'}}));assert.equal(preview.ready,true,preview.unresolved?.join('\n'));
  assert.equal(preview.combatFailure.misfire.outcome.id,'misfire');assert.equal(preview.combatFailure.misfire.salvo.table,'salvo-artillery');assert.equal(preview.combatFailure.effects.find(row=>row.type==='salvo-hit')?.location,'left');
  const applied=await store.applyResolution(preview);assert.equal(applied.status,'applied',JSON.stringify(applied));assert.equal(store.getCombat().participants.get('crew').hp,17);assert.equal(store.getCombat().participants.get('gunner').equipment[0].extensions.v5.destroyed,true);
  assert.equal(await store.undo(),true);assert.equal(store.getCombat().participants.get('crew').hp,20);assert.equal(store.getCombat().participants.get('gunner').equipment[0].extensions?.v5?.destroyed,undefined);
});

test('T2 bis Salve p.126 : les résultats 5–7 appliquent une localisation choisie par le MJ à chaque servant',async()=>{
  const {store,preview}=await setup(crewContext(6,{salvoLocations:{crew:['right-leg']}}));assert.equal(preview.ready,true,preview.unresolved?.join('\n'));
  assert.equal(preview.combatFailure.effects.find(row=>row.type==='salvo-hit')?.location,'right-leg');
  assert.equal((await store.applyResolution(preview)).status,'applied');assert.equal(store.getCombat().participants.get('crew').hp,17);
  assert.equal(await store.undo(),true);assert.equal(store.getCombat().participants.get('crew').hp,20);
});

test('T2 bis Salve p.126 : les résultats 8–9 appliquent chaque point restant à tous les servants',async()=>{
  const {store,preview}=await setup(crewContext(8,{remainingSalvo:2,salvoLocations:{crew:['head','left-leg']}}));assert.equal(preview.ready,true,preview.unresolved?.join('\n'));
  assert.equal(preview.combatFailure.effects.filter(row=>row.type==='salvo-hit').length,2);
  assert.equal((await store.applyResolution(preview)).status,'applied');assert.equal(store.getCombat().participants.get('crew').hp,14);
  assert.equal(await store.undo(),true);assert.equal(store.getCombat().participants.get('crew').hp,20);
});

test('T2 bis Salve p.126 : résultat 10 demande les trajectoires et applique seulement les Esquives ratées',async()=>{
  const base={powderIncidentRoll:1,salvoIncidentRoll:10,remainingSalvo:2,salvoTrajectories:[
    {direction:'nord-est',distanceRoll:30,personsConfirmed:true,targets:[{participantId:'victim',location:'body',dodge:{base:60,roll:50}}]},
    {direction:'sud',distanceRoll:80,personsConfirmed:true,targets:[{participantId:'crew',location:'left',dodge:{base:60,roll:30}}]}
  ]};
  const {store,preview}=await setup(base,100);assert.equal(preview.ready,true,preview.unresolved?.join('\n'));
  const hits=preview.combatFailure.effects.filter(row=>row.type==='salvo-hit');assert.deepEqual(hits.map(row=>row.targetId),['victim']);assert.equal(hits[0].trajectory.distanceYards,30);assert.equal(preview.combatFailure.effects.some(row=>row.type==='salvo-artillery-destroyed'),false);
  assert.equal((await store.applyResolution(preview)).status,'applied');assert.equal(store.getCombat().participants.get('victim').hp,19);
  assert.equal(await store.undo(),true);assert.equal(store.getCombat().participants.get('victim').hp,20);
});

test('T2 bis Salve p.126 : pas de dégâts avant la saisie des servants, localisations, trajectoires et esquives',async()=>{
  const cases=[{powderIncidentRoll:1},crewContext(1),crewContext(5),crewContext(8,{remainingSalvo:2}),{powderIncidentRoll:1,salvoIncidentRoll:10,remainingSalvo:1}];
  for(const context of cases){const {preview}=await setup(context);assert.equal(preview.ready,false);assert.ok(preview.unresolved.some(line=>line.includes('Incident de Salve')),preview.unresolved?.join('\n'));assert.equal(preview.combatFailure.effects.some(row=>row.type==='salvo-hit'),false);}
});

test('T2 bis Salve p.126 : l’incident catastrophe est appliqué avant le second d10 Salve, avec Undo des deux effets',async()=>{
  const trajectory={direction:'ouest',distanceRoll:25,personsConfirmed:true,targets:[{participantId:'victim',location:'body',dodge:{base:60,roll:50}}]};
  const {store,preview}=await setup({powderIncidentRoll:9,weaponExplosionArmSide:'right',salvoIncidentRoll:10,remainingSalvo:1,salvoTrajectories:[trajectory]},100);
  assert.equal(preview.ready,true,preview.unresolved?.join('\n'));assert.equal(preview.combatFailure.misfire.outcome.id,'catastrophe');assert.equal(preview.combatFailure.misfire.salvo.outcome.id,'remaining-salvo-random-direction');
  assert.ok(preview.combatFailure.effects.some(row=>row.type==='weapon-explosion'&&row.targetId==='gunner'));assert.ok(preview.combatFailure.effects.some(row=>row.type==='salvo-hit'&&row.targetId==='victim'));
  assert.equal((await store.applyResolution(preview)).status,'applied');assert.equal(store.getCombat().participants.get('gunner').hp,19);assert.equal(store.getCombat().participants.get('victim').hp,19);
  assert.equal(await store.undo(),true);assert.equal(store.getCombat().participants.get('gunner').hp,20);assert.equal(store.getCombat().participants.get('victim').hp,20);
});
