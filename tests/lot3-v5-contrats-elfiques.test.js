import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,execute,spellInput,contractFor} from './helpers/lot3-elven-fixture.js';
import {subject,level} from './helpers/lot3-domain-fixture.js';
import {normalizeLoreId} from '../js/core/v5-magic-attributes.js';
import {attackNature,previewMagicProtection} from '../js/core/v5-magic-combat.js';
import {sourceCases,verifyElven} from './helpers/lot3-elven-fixture.js';
for(const row of sourceCases.slice(16))test('Elfiques — '+row[0]+' — HEPG p. '+row[1]+' — source, Store, persistance, Undo, vrais Tours',()=>verifyElven(row));

import {verifyElvenOptions} from './helpers/lot3-elven-fixture.js';
for(const row of sourceCases.slice(16))test('HEPG p. '+row[1]+' — '+row[0]+' : chaque option payée et Tests secondaires réussis/ratés/manquants',()=>verifyElvenOptions(row));
for(const row of sourceCases.slice(16,24))test('HEPG pp. 81–82 / brief Lot 3 — '+row[0]+' : HEPG p. 81 : premier Vent par défaut, second choisi',async()=>{
 const c=contractFor(row[0]),{store}=await fixture(row),input=spellInput(row,store,{attributeActive:true});
 const p=store.previewSpellExecution(c.id,input);assert.equal(p.ready,true,p.error);assert.equal(p.lorePreview.lore,normalizeLoreId(c.wind[0]));
 const chosen=store.previewSpellExecution(c.id,{...input,chosenLore:normalizeLoreId(c.wind[1])});assert.equal(chosen.ready,true,chosen.error);assert.equal(chosen.lorePreview.lore,normalizeLoreId(c.wind[1]));
});
test('HEPG p. 81 — Bannissement mineur : victoire, égalité et échec opposés, ni dégâts ni destruction',async()=>{
 const row=sourceCases.find(r=>r[0].startsWith('Bannissement Mineur'));
 for(const die of [25,1]){const {store}=await fixture(row);await execute(store,row,{targetTests:{foe:{opponentRoll:die}}});assert.equal(subject(store,'foe').zone,'active');assert.equal(subject(store,'foe').hp,200);}
 const {store}=await fixture(row);const input=spellInput(row,store);delete input.targetTests.foe.opponentRoll;assert.equal(store.previewSpellExecution(contractFor(row[0]).id,input).ready,false);
});
test('HEPG p. 82 — Purification : une affection nominative, réussite/échec/maladresse, États préservés',async()=>{
 const row=sourceCases.find(r=>r[0].startsWith('Purification'));
 for(const [die,purged,transferred] of [[25,true,false],[95,false,false],[99,false,true]]){const {store}=await fixture(row,{foe:{states:[{name:'Empoisonné',level:2},{name:'Sonné',level:1}]}});const p=await execute(store,row,{enduranceRoll:die});assert.deepEqual(p.targetResults[0].afflictionReceipt,{kind:'poison',name:'Poison déclaré',purged,transferred});assert.equal(level(subject(store,'foe'),'Empoisonné'),2);assert.equal(level(subject(store,'foe'),'Sonné'),1);}
});
test('HEPG p. 80 — Calme : ne supprime ni Haine, ni Terreur, ni Brisé ; échec conserve Peur',async()=>{
 const row=sourceCases.find(r=>r[0]==='Calme');for(const die of [25,95]){const {store}=await fixture(row,{foe:{states:['Peur','Haine','Terreur','Brisé']}});await execute(store,row,{fellowshipRoll:die});const f=subject(store,'foe');assert.equal(level(f,'Peur'),die===25?0:1);for(const name of ['Haine','Terreur','Brisé'])assert.equal(level(f,name),1,name);}
});
test('HEPG p. 81 — Révéler : mage ordinaire sans couche ne brille pas, couche active ou nature magique oui',async()=>{
 const row=sourceCases.find(r=>r[0]==='Révéler la Magie');for(const active of [false,true]){const {store}=await fixture(row);if(active)await store.applySpellEffects('foe',{durationRounds:4,apModifiers:{all:1}});const p=await execute(store,row,{targetTests:{foe:{magicNature:false}}});assert.equal(p.targetResults[0].temporaryEffect.specialState.visibleMagic,active);}
});
test('HEPG p. 82 — Masque : Intuition adverse −3 et incantation de lecture/divination déclarée −3',async()=>{
 const row=sourceCases.find(r=>r[0].startsWith("Masque")),{store}=await fixture(row);await execute(store,row);const c=contractFor('Calme'),input={actorId:'foe',targetIds:['mage'],roll:25,fellowshipRoll:25,attributeActive:false};
 const base=store.previewSpellExecution(c.id,{...input,targetTests:{mage:{readingMagic:false}}});const read=store.previewSpellExecution(c.id,{...input,targetTests:{mage:{readingMagic:true}}});assert.equal(base.ready,true,base.error);assert.equal(read.ready,true,read.error);assert.equal(base.castingPreview.test.sl-read.castingPreview.test.sl,3);
});
test('HEPG p. 82 — Confort : Nuée Minuscule/Petite bloquée, Taille normale permise ; réduction feu/froid seule',async()=>{
 const row=sourceCases.find(r=>r[0].startsWith('Zone de Confort')),{store}=await fixture(row,{foe:{traits:['Nuée'],extensions:{traits:['Nuée']}}});await execute(store,row);
 for(const size of [1,2,3]){const p=store.previewResolution({actorId:'foe',targetId:'mage',action:{type:'attack',attr:'CC',base:50,damage:3},roll:25,v5:{kind:'melee',choice:'keep',actorSize:size,targetSize:3}});assert.equal(p.unresolved.some(t=>/Nuée Minuscule/.test(t)),size<=2);}
 for(const [fire,cold,amount] of [[true,false,5],[false,true,5],[false,false,6]])assert.equal(previewMagicProtection(subject(store,'mage'),6,{nature:attackNature({spell:true,declared:{fire,cold}})}).amount,amount);
});
