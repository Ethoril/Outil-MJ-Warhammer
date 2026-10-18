import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,execute,input,contractFor} from './helpers/lot3-wom-fixture.js';
import {endTurn,subject,level,encounter} from './helpers/lot3-domain-fixture.js';
import {sourceCases as elvenCases,fixture as elvenFixture,execute as elvenExecute,spellInput} from './helpers/lot3-elven-fixture.js';
import {sourceCases as arcaneCases,execute as arcaneExecute} from './helpers/lot3-arcane-fixture.js';
test('Retour Lot4 — WoM p.134, D12 : Sang 1 et 2 Rounds font exactement 1 et 2 frappes avant expiration',async()=>{
 for(const amount of [0,2]){const {store,engine}=await fixture({foe:{hp:500,maxHp:500}});await execute(store,'Sang Bouillonnant',{overcastChoices:{duration:amount}});
 for(let n=0;n<10;n++)await endTurn(engine);
 assert.equal(subject(store,'foe').hp,500-48*(amount?2:1));assert.equal(store.getLog().filter(l=>l.detail?.spellId===contractFor('Sang Bouillonnant').id&&l.detail.phase==='startOfTurn').length,amount?2:1);
 }
});
test('Retour Lot4 — WoM p.137 : six Rounds de Blizzard donnent six frappes, aucune septième',async()=>{
 const {store,engine}=await fixture({foe:{hp:1000,maxHp:1000}});await execute(store,'Blizzard enflammé de Ygethmor');const e=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===contractFor('Blizzard enflammé de Ygethmor').id);
 for(let n=0;n<16;n++)await endTurn(engine,{inputs:{foe:{['spell:'+e.id+':present']:true,['spell:'+e.id+':cover']:false,['spell:'+e.id+':test']:95,['spell:'+e.id+':location']:34}}});
 assert.equal(store.getLog().filter(l=>l.detail?.spellId===e.spellId&&l.detail.phase==='endOfRound').length,6);
});
test('Retour Lot4 — WoM pp.20–21,136 : un vortex expiré ne demande aucun dernier déplacement',async()=>{
 const {store,engine}=await fixture();await execute(store,'Tempête Magmatique',{direction:'E',willpowerSuccess:true,distanceRoll:10});
 const s=JSON.parse(store.getFullJSON()),e=subject(store,'mage').extensions.v5.spellEffects.find(e=>e.roundEffect?.vortex);s.combat.round=e.expiresAtRound;s.combat.currentActorId='mage';delete s.activeScene;await store.loadFromJSON(s);const p=engine.previewNextTurn();assert.ok(!(p.requests || []).some(r=>r.field.includes('vortex')));await endTurn(engine);assert.ok(!subject(store,'mage').extensions.v5.spellEffects.some(e=>e.roundEffect?.vortex));
});
test('Retour Lot4 — WoM pp.89,122,125,134,137,146,148 : limites et coûts sourcés indépendants',()=>{
 const c=name=>contractFor(name);
 assert.equal(c('Transe d’Ambre').effects.secondaryTest.modifierSl,-2);
 assert.equal(c("Suivi de l'Odeur").effects.testModifiers['Perception (Odorat)'],2);
 assert.equal(c('Tempête Magmatique').overcast.specific.find(o=>o.id==='mini').cost,2);assert.equal(c('Tempête Magmatique').effects.vortex.miniMax,3);
 assert.equal(c('Cendres et Poussière').overcast.specific.find(o=>o.id==='sun').cost,4);
 assert.equal(c('Epées Sanguines').overcast.specific.find(o=>o.id==='swords').cost,2);assert.equal(c('Epées Sanguines').effects.summon.max,6);
 assert.equal(c('Escalier en Spirale').effects.receiptOvercast.height.max,200);
 assert.equal(c('Les Enfants Sauvages de Zandox').effects.summon.rangeFormula,'4');
 assert.equal(c('Sang Bouillonnant').effects.specialState.deathBurst.radius,2);
 assert.equal(c('Blizzard enflammé de Ygethmor').effects.roundEffect.ignitionPercent,25);
});
test('Retour Lot4 — WoM p.137 : déplacement9 ne produit aucun mini, 8 en produit trois au lancer',async()=>{
 for(const distance of [8,9]){const {store}=await fixture();const p=await execute(store,'Tempête Magmatique',{direction:'E',willpowerSuccess:true,distanceRoll:distance,overcastSpecific:{mini:3},domainFacts:{mini1Direction:1,mini2Direction:1,mini3Direction:1}});
 assert.equal(p.vortexMovement.mini.length,distance===8?3:0);}
 const {store}=await fixture();assert.equal(store.previewSpellExecution(contractFor('Tempête Magmatique').id,input('Tempête Magmatique',{overcastSpecific:{mini:4}})).ready,false);
});
test('Retour Lot4 — WoM p.100 : collision Thorsen7, PA0 BE0 prouvent la valeur au-delà du minimum1',async()=>{
 const {store}=await fixture({foe:{hp:200,maxHp:300,caracs:{CC:50,CT:50,F:40,E:0,FM:40,Ag:50,I:50,Int:50,M:4},armor:{head:0,body:0,arms:0,legs:0}}});
 const p=await execute(store,'Orage de Thorsen',{direction:'E',willpowerSuccess:true,distanceRoll:10,targetTests:{foe:{throwDirection:4,collision:true}}});assert.equal(subject(store,'foe').hp,179);assert.ok(p.vortexMovement.logs.some(l=>l.detail?.thrown?.collision===true));
});
test('Retour Lot4 — WoM p.134 : Corps Calme−2, jet55 sur FM60 doit lâcher, jet35 maintient',async()=>{
 for(const die of [35,55]){const {store}=await fixture();await execute(store,'Corps de Feu');const effect=subject(store,'mage').extensions.v5.spellEffects.find(e=>e.specialState?.bodyFire);const p=store.previewSpellInteraction({effectId:effect.id,targetId:'foe',kind:'body-fire',controlValue:'grab',roll:die,locationRoll:34});assert.equal(p.ready,true,p.error);assert.equal(p.test.success,die===35);}
});
test('Retour Lot4 — WoM p.149, V5 p.131 : égalité opposée Force remportée par le ver initiateur',async()=>{
 const {store}=await fixture({foe:{caracs:{F:50,E:40,FM:40,M:4}}});await execute(store,'Ver Grouillant');const e=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.specialState?.wormGrapple);const p=store.previewSpellInteraction({effectId:e.id,targetId:'foe',kind:'worm',controlValue:'entangle',roll:25,opponentRoll:25});assert.equal(p.ready,true,p.error);await store.applySpellInteraction({effectId:e.id,targetId:'foe',kind:'worm',controlValue:'entangle',roll:25,opponentRoll:25});assert.equal(level(subject(store,'foe'),'Enchevêtré'),2);
});
test('Retour Lot3 — HEPG p.84 : une seule rune Cadai par jet de Haute Magie, refuse doublon, stock intact',async()=>{
 const row=elvenCases[0],{store}=await elvenFixture(row);await store.deployCadaiRune({actorId:'mage',roll:25,conditionsConfirmed:true});await store.deployCadaiRune({actorId:'mage',roll:25,conditionsConfirmed:true});const before=store.getCadaiRunes('mage').deployed;
 const i=spellInput(row,store,{roll:95,cadaiAccessible:true,cadaiRerolls:[{purpose:'test',roll:25},{purpose:'test',roll:35}]});assert.throws(()=>store.previewSpellExecution(contractFor('Apothéose').id,i),/même jet/);await assert.rejects(()=>store.applySpellExecution(contractFor('Apothéose').id,i),/même jet/);assert.equal(store.getCadaiRunes('mage').deployed,before);
});
test('Retour Lot3 — V5 p.243 : Chaîne B=BE+1 continue, motif d’arrêt ensuite journalisé',async()=>{
 const row=arcaneCases.find(r=>r[0]==='Chain Attack'),{store}=await encounter({foe:{caracs:{E:50},armor:{head:0,body:0,arms:0,legs:0}}});
 const p=await arcaneExecute(store,row,{targetIds:['foe','mage'],overcastChoices:{damage:1},targetTests:{mage:{nearest:true,distance:6}}});assert.equal(p.targetResults[0].woundsLost,6);assert.ok(p.targetResults[1].woundsLost>0);
});
test('Retour Lot3 — V5 p.242 : Source produit des pintes, jamais des litres',async()=>{
 const row=arcaneCases.find(r=>r[0]==='Spring'),{store,engine}=await encounter();await arcaneExecute(store,row);await endTurn(engine);await endTurn(engine);assert.equal(store.getLog().find(l=>l.detail?.quantity!==undefined).detail.unit,'pinte');
});
test('Retour Lot3 — HEPG pp.87–89 : assertions des modificateurs et PV indépendantes des données',()=>{
 assert.equal(contractFor('Glamour de Teclis').effects.roundEffect.test.modifierSl,-3);
 assert.equal(contractFor('Tempête').effects.roundEffect.missileFlying,5);assert.equal(contractFor('Tempête').effects.roundEffect.athleticsGroundSl,2);assert.equal(contractFor('Tempête').effects.roundEffect.athleticsFlyingSl,1);
 assert.equal(contractFor('Drain de Magie').effects.optionRules.wide.test.modifierSl,-1);
 assert.equal(contractFor('Chemin entre les Mondes').effects.optionRules.duration.test.modifierSl,-2);
});

test('Retour Lot3 — HEPG p.89 : Tempête +4 donne CT−3DR ; Saphery importé 8 avec une amélioration devient7',async()=>{
 const row=elvenCases.find(r=>r[0]==='Tempête'),{store}=await elvenFixture(row);await elvenExecute(store,row,{overcastSpecific:{cool:1}});assert.equal(subject(store,'foe').extensions.v5.testModifiers.CT,-3);
 const a=await elvenFixture(elvenCases[0]);await a.store.applySpellEffects('mage',{casterId:'mage',castExecutionId:'legacy',ward:8,saphery:{improved:1},durationRounds:10});await elvenExecute(a.store,elvenCases[0]);assert.equal(subject(a.store,'mage').extensions.v5.ward,7);const e=subject(a.store,'mage').extensions.v5.spellEffects.find(e=>e.saphery);assert.equal(e.saphery.baseWard,9);await a.store.undo();assert.equal(subject(a.store,'mage').extensions.v5.ward,8);
});
