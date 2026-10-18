import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceCases,verifySource,verifyVariants,verifyTargetsAndProtection,fixture,execute,input,contractFor,subject,level,endTurn} from './helpers/lot3-catalogue-fixture.js';
for(const row of sourceCases.filter(r=>r[6]==='beasts'))test('Catalogue '+row[0]+' — WoM p. '+row[1]+' : source, Store, persistance, Undo, vraie expiration',()=>verifySource(row));
for(const row of sourceCases.filter(r=>r[6]==='beasts'))test('Catalogue '+row[0]+' — WoM p. '+row[1]+' : surpuissances, faits manquants, Tests réussis et ratés',()=>verifyVariants(row));

test('WoM p.148 : Merciw plafonne F et E100, exclut lanceur/ennemis, reste correct avec autre bonus',async()=>{
 const {store}=await fixture({foe:{camp:'pj',caracs:{CC:50,F:90,E:95,FM:40,M:4}}});await execute(store,'Régiment Monstrueux de Merciw');assert.equal(subject(store,'foe').caracs.F,100);assert.equal(subject(store,'foe').caracs.E,100);assert.equal(subject(store,'mage').caracs.F,40);await store.undo();
 const s=await fixture({foe:{camp:'pj',caracs:{F:50,E:50,M:4}}});await s.store.applySpellEffects('foe',{casterId:'mage',durationRounds:20,statModifiers:{F:40}});await execute(s.store,'Régiment Monstrueux de Merciw');const older=subject(s.store,'foe').extensions.v5.spellEffects.find(e=>!e.spellId);await s.store.expireSpellEffects('foe',{effectId:older.id});assert.equal(subject(s.store,'foe').caracs.F,80,'bonus calculé depuis base50, pas depuis valeur effective90');
});
test('WoM p.149 : Capuche Calme réussi réduit BFM+DR, raté zéro, magie exclue',async()=>{
 const {previewMagicProtection,attackNature}=await import('../js/core/v5-magic-combat.js');const {store}=await fixture();await execute(store,'Capuche Vengeresse');for(const [magical,calm,expected] of [[false,{success:true,sl:2},12],[false,{success:false,sl:-2},20],[true,null,20]]){const p=previewMagicProtection(subject(store,'mage'),20,{nature:attackNature({magical}),calm});assert.equal(p.ready,true);assert.equal(p.amount,expected);}
});

test('WoM p.149, V5 p.131 : Kadon autre cible demande consentement et FM opposées explicites ; égalité au lanceur',async()=>{
 for(const [unwilling,casterRoll,targetRoll,changed] of [[false,undefined,undefined,true],[true,25,95,true],[true,25,25,true],[true,95,25,false]]){
  const {store}=await fixture(),i=input('Transformation de Kadon',{targetIds:['foe'],kadonOtherTarget:true});i.targetTests.foe={unwilling,opponentRoll:targetRoll};i.domainFacts.opposedActorRoll=casterRoll;
  const p=await execute(store,'Transformation de Kadon',i);assert.equal(Boolean(p.targetResults[0].beastForm),changed);assert.equal(subject(store,'foe').caracs.Int,60);assert.equal(subject(store,'foe').caracs.FM,60);
 }
 const {store}=await fixture(),i=input('Transformation de Kadon',{targetIds:['foe'],kadonOtherTarget:true});delete i.targetTests.foe.unwilling;assert.equal(store.previewSpellExecution(contractFor('Transformation de Kadon').id,i).ready,false);
 i.targetTests.foe.unwilling=true;delete i.targetTests.foe.opponentRoll;assert.equal(store.previewSpellExecution(contractFor('Transformation de Kadon').id,i).ready,false);
});
test('WoM p.149 : Kadon interdit un profil manuel sans Taille explicite Grande ou Énorme',async()=>{
 const {store}=await fixture(),profile={name:'Monstre déclaré',M:6,hp:60,caracs:{CC:70,CT:0,F:90,E:80,I:40,Ag:30,Dex:0,Soc:15},traits:[]};const i=input('Transformation de Kadon',{monsterKey:undefined,monsterProfile:profile});assert.equal(store.previewSpellExecution(contractFor('Transformation de Kadon').id,i).ready,false);
 for(const size of ['small','average','monstrous'])assert.equal(store.previewSpellExecution(contractFor('Transformation de Kadon').id,{...i,monsterProfile:{...profile,size}}).ready,false);
 assert.equal(store.previewSpellExecution(contractFor('Transformation de Kadon').id,{...i,monsterProfile:{...profile,size:'large'}}).ready,true);
});
for(const row of sourceCases.filter(r=>r[6]==='beasts'))test('Catalogue '+row[0]+' — WoM p. '+row[1]+' : destinataires réels multiples ou limite, Protection et Undo',()=>verifyTargetsAndProtection(row));
