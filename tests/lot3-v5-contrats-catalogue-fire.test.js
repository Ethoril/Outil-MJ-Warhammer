import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceCases,verifySource,verifyVariants,verifyTargetsAndProtection,fixture,execute,input,contractFor,subject,level,endTurn} from './helpers/lot3-catalogue-fixture.js';
for(const row of sourceCases.filter(r=>r[6]==='fire'))test('Catalogue '+row[0]+' — WoM p. '+row[1]+' : source, Store, persistance, Undo, vraie expiration',()=>verifySource(row));
for(const row of sourceCases.filter(r=>r[6]==='fire'))test('Catalogue '+row[0]+' — WoM p. '+row[1]+' : surpuissances, faits manquants, Tests réussis et ratés',()=>verifyVariants(row));

test('WoM pp.134–136 : Tête +0 sur Esquive réussie, États préservés ; Flamme Calme réussie évite ses Sonné',async()=>{
 for(const [name,die] of [['Tête Brûlante',25],['Flamme Captivante',25]]){const {store}=await fixture();const i=input(name);i.targetTests.foe.roll=die;i.targetTests.foe.dodgeRoll=die;i.targetTests.foe.resistanceRoll=die;const p=await execute(store,name,i);if(name.startsWith('Tête')){assert.equal(p.targetResults[0].missile.rawDamage,6);assert.equal(level(subject(store,'foe'),'Enflammé'),1);assert.ok(!subject(store,'foe').traits.some(t=>t.includes('Peur')));assert.equal(p.targetResults[0].fearOfCaster.rating,1);}else assert.equal(level(subject(store,'foe'),'Sonné'),0);}
});
test('WoM p.135 : Colérique amis Calme+2, Animosité4DR jours et Haine8DR semaines, aucun malus général',async()=>{
 for(const [id,cost,trait,rounds] of [['animosity',4,'Animosité',51840],['hatred',8,'Haine',362880]]){const {store}=await fixture();const p=await execute(store,'Colérique',{overcastSpecific:{[id]:1}});assert.equal(p.castingPreview.overcast.totalSpent,cost);const e=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===contractFor('Colérique').id);assert.equal(e.expiresAtRound,rounds+1);assert.ok(subject(store,'foe').traits.some(t=>t.startsWith(trait)));assert.equal(subject(store,'foe').extensions.v5.testModifiers?.Calme || 0,0);}
 const {store}=await fixture();const i=input('Colérique');i.targetTests.foe.friend=true;i.targetTests.foe.roll=65;i.targetTests.foe.resistanceRoll=65;const p=await execute(store,'Colérique',i);assert.equal(p.targetResults[0].resistanceTest.modifierSl,2);assert.equal(p.targetResults[0].resisted,true);
});
test('WoM pp.135–136 : Tempête +2DR agrandit2→3 mètres et2→4 ; Ignition répartit trois au lieu de frapper chacun',async()=>{
 const {store}=await fixture(),p=await execute(store,'Tempête de Flammes',{overcastSpecific:{size:1}});assert.equal(p.castingPreview.overcast.totalSpent,2);assert.deepEqual(p.targetResults[0].quantifiedReminder,{diametre:3,hauteur:4});await store.undo();
 const a=await execute(store,'Ignition',{domainFacts:{...input('Ignition').domainFacts,catalogueMode:'spread'}});assert.deepEqual(a.targetResults[0].quantifiedReminder,{nouveauxEnflamme:3,rayon:2});assert.equal(level(subject(store,'foe'),'Enflammé'),0);
});
test('WoM p.136 : Flamme Attisée, matière inflammable et non inflammable ont des conséquences distinctes',async()=>{
 for(const flammable of [true,false]){const {store}=await fixture(),i=input('Flamme Attisée');i.targetTests.foe.flammable=flammable;const p=await execute(store,'Flamme Attisée',i);assert.equal(p.targetResults[0].quantifiedReminder.degatsFeuBonus,flammable?42:0);assert.equal(p.targetResults[0].quantifiedReminder.enflammeSupplementaire,flammable?1:0);}
});
test('WoM p.137 : Chaleur course/charge/fuite ajoute exactement un Exténué, conserve alliés',async()=>{
 for(const action of ['none','run','charge','flee']){const {store}=await fixture();await execute(store,'Chaleur Desséchante',{domainFacts:{...input('Chaleur Desséchante').domainFacts,action}});assert.equal(level(subject(store,'foe'),'Exténué'),action==='none'?0:1);assert.equal(level(subject(store,'mage'),'Exténué'),0);}
});
for(const row of sourceCases.filter(r=>r[6]==='fire'))test('Catalogue '+row[0]+' — WoM p. '+row[1]+' : destinataires réels multiples ou limite, Protection et Undo',()=>verifyTargetsAndProtection(row));

test('WoM p.134 : une attaque retire seulement les trois Sonné de Flamme, conserve celui antérieur',async()=>{
 const {store}=await fixture({foe:{states:[{name:'Sonné',level:1}]}});await execute(store,'Flamme Captivante');assert.equal(level(subject(store,'foe'),'Sonné'),4);await execute(store,'Arc de T’Essla');assert.equal(level(subject(store,'foe'),'Sonné'),1);assert.equal(level(subject(store,'foe'),'Aveuglé'),1);
});
test('WoM p.136 : Esprit CC=FM, +6 avec BF déclaré ; Enflammé seulement après dégâts non protégés',async()=>{
 for(const saved of [false,true]){const {store}=await fixture();await execute(store,'Esprit du Foyer');const e=subject(store,'mage').extensions.v5.spellEffects.find(e=>e.specialState?.summonAttack);if(saved)await store.applySpellEffects('foe',{ward:7,durationRounds:10});
 const i={effectId:e.id,targetId:'foe',kind:'summon-attack',roll:25,opponentRoll:95,locationRoll:34,strengthBonus:3,distance:12,lineOfSight:true,controlValue:'dodge',wardRoll:saved?10:1};
 assert.equal(store.previewSpellInteraction({...i,strengthBonus:undefined}).ready,false);await store.applySpellInteraction(i);assert.equal(subject(store,'foe').hp,saved?200:197);assert.equal(level(subject(store,'foe'),'Enflammé'),saved?0:1);
 }
});
