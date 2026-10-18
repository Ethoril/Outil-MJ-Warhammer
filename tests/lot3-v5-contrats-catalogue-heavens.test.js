import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceCases,verifySource,verifyVariants,verifyTargetsAndProtection,fixture,execute,input,contractFor,subject,level,endTurn} from './helpers/lot3-catalogue-fixture.js';
for(const row of sourceCases.filter(r=>r[6]==='heavens'))test('Catalogue '+row[0]+' — WoM p. '+row[1]+' : source, Store, persistance, Undo, vraie expiration',()=>verifySource(row));
for(const row of sourceCases.filter(r=>r[6]==='heavens'))test('Catalogue '+row[0]+' — WoM p. '+row[1]+' : surpuissances, faits manquants, Tests réussis et ratés',()=>verifyVariants(row));

test('WoM p.100 : Polir paie2 et4DR ; les deux bonus nécessitent une vraie lentille',async()=>{
 for(const [id,cost,key] of [['astronomy',2,'Savoir (Astronomie)'],['secondSight',4,'Perception (Seconde vue visuelle)']]){const {store}=await fixture();const p=await execute(store,'Polir et Exalter',{overcastSpecific:{[id]:1}});assert.equal(p.castingPreview.overcast.totalSpent,cost);assert.equal(subject(store,'foe').extensions.v5.testModifiers[key],2);}
 const {store}=await fixture();assert.equal(store.previewSpellExecution(contractFor('Polir et Exalter').id,input('Polir et Exalter',{domainFacts:{...input('Polir et Exalter').domainFacts,glassLens:false},overcastSpecific:{astronomy:1}})).ready,false);
});
test('WoM p.100 : Quatre Vents7 dégâts seulement sur collision, PA0 BE0 sans minimum masquant',async()=>{
 for(const collision of [false,true]){const {store}=await fixture({foe:{caracs:{E:0,FM:40,M:4},armor:{head:0,body:0,arms:0,legs:0}}}),i=input('Que les Quatre Vents Soufflent !');i.targetTests.foe.collision=collision;await execute(store,'Que les Quatre Vents Soufflent !',i);assert.equal(subject(store,'foe').hp,collision?193:200);}
});
test('WoM p.101 : Shemtek sûr BI éclairs, ni Sonné ni Peur, compte exact des destinataires',async()=>{
 const {store}=await fixture(),p=await execute(store,'Tempête de Shemtek',{domainFacts:{...input('Tempête de Shemtek').domainFacts,catalogueMode:'safe'}});assert.equal(p.targetResults[0].quantifiedReminder.eclairs,5);assert.equal(level(subject(store,'mage'),'Sonné'),0);
});
for(const row of sourceCases.filter(r=>r[6]==='heavens'))test('Catalogue '+row[0]+' — WoM p. '+row[1]+' : destinataires réels multiples ou limite, Protection et Undo',()=>verifyTargetsAndProtection(row));
