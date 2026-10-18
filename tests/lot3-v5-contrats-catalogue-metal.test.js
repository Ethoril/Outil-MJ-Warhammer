import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceCases,verifySource,verifyVariants,verifyTargetsAndProtection,fixture,execute,input,contractFor,subject,level,endTurn} from './helpers/lot3-catalogue-fixture.js';
for(const row of sourceCases.filter(r=>r[6]==='metal'))test('Catalogue '+row[0]+' — WoM p. '+row[1]+' : source, Store, persistance, Undo, vraie expiration',()=>verifySource(row));
for(const row of sourceCases.filter(r=>r[6]==='metal'))test('Catalogue '+row[0]+' — WoM p. '+row[1]+' : surpuissances, faits manquants, Tests réussis et ratés',()=>verifyVariants(row));

test('WoM p.76 : Inscription acide+2, aucune PA perdue immédiatement ou sans lavage dixRounds',async()=>{
 const {store}=await fixture(),p=await execute(store,'Inscription',{domainFacts:{...input('Inscription').domainFacts,catalogueMode:'acid'}});assert.equal(p.targetResults[0].missile.rawDamage,8);assert.equal(subject(store,'foe').armor.body,2);assert.equal(p.targetResults[0].quantifiedReminder.delaiCorrosionRounds,10);
});
test('WoM p.74 : Armure d’étain n’enlève que deux PA métalliques et restaure à la vraie fin de Tour',async()=>{
 const {store,engine}=await fixture(),i=input('Armure d’étain');Object.assign(i.targetTests.foe,{metalAp_head:0,metalAp_body:1,metalAp_arms:2,metalAp_legs:0});await execute(store,'Armure d’étain',i);assert.equal(subject(store,'foe').armor.body,1);assert.equal(subject(store,'foe').armor.leftArm,0);assert.equal(subject(store,'foe').armor.rightArm,0);assert.equal(subject(store,'foe').armor.head,2);const e=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===contractFor('Armure d’étain').id),s=JSON.parse(store.getFullJSON());s.combat.round=e.expiresAtRound;s.combat.currentActorId='mage';delete s.activeScene;await store.loadFromJSON(s);await endTurn(engine);assert.equal(subject(store,'foe').armor.body,2);await store.undo();assert.equal(subject(store,'foe').armor.body,1);
});
test('WoM p.74 : Rouille Encombrement1, +2DR→2 ; objet magique interdit, aucun profil inventé',async()=>{
 const {store}=await fixture(),facts={...input('Malédiction de rouille').domainFacts,objectEncumbrance:2};assert.equal(store.previewSpellExecution(contractFor('Malédiction de rouille').id,input('Malédiction de rouille',{domainFacts:facts})).ready,false);const p=await execute(store,'Malédiction de rouille',{domainFacts:facts,overcastSpecific:{enc:1}});assert.equal(p.castingPreview.overcast.totalSpent,2);assert.equal(p.targetResults[0].quantifiedReminder.encombrementMax,2);assert.equal(store.previewSpellExecution(contractFor('Malédiction de rouille').id,input('Malédiction de rouille',{domainFacts:{...facts,objectMagical:true}})).ready,false);
});
for(const row of sourceCases.filter(r=>r[6]==='metal'))test('Catalogue '+row[0]+' — WoM p. '+row[1]+' : destinataires réels multiples ou limite, Protection et Undo',()=>verifyTargetsAndProtection(row));
