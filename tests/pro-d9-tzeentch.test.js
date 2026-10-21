import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter,subject,level,cast,inputFor,verifySpell,endTurn} from './helpers/lot3-domain-fixture.js';
import {getSpellContract} from '../js/core/v5-spell-contracts.js';
import {normalizeLoreId,LORE_ATTRIBUTES} from '../js/core/v5-magic-attributes.js';

// L06 p. 260 : [nom FR, nom EN, NI, portée, cible, durée]
const SOURCE=[
 ['Don de Tzeentch','Boon of Tzeentch',9,'Vous','Vous','Bonus d’Intelligence jours'],
 ['Transformation de Tzeentch','Transformation of Tzeentch',12,'Bonus de Force Mentale mètres','1','Bonus de Force Mentale Rounds'],
 ['Trahison de Tzeentch','Treason of Tzeentch',6,'Force Mentale mètres','ZdE Bonus d’Initiative mètres','Bonus d’Intelligence Rounds']
];
for(const [fr,en,cn,range,target,duration] of SOURCE)test(`Tzeentch L06 p. 260 — ${fr} : paramètres relus, domaine, aucun ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[260,cn,range,target,duration]);
 assert.equal(c.domain,'tzeentch');assert.equal(c.type,'Domaine de Tzeentch');
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const FACTS={'Don de Tzeentch':{boonSpell:'Bonne santé'}};
for(const [fr] of SOURCE)test(`Tzeentch — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{domainFactsExtra:FACTS[fr]||{},targetTests:{foe:{resistanceRoll:95,roll:95,objectId:'blade'},mage:{roll:95}}});
});
test('Attribut de Tzeentch — Domaine reconnu ; le d100 du Test de Corruption est exigé de chaque cible',async()=>{
 assert.equal(normalizeLoreId('Tzeentch'),'tzeentch');assert.equal(LORE_ATTRIBUTES.tzeentch.name,'Domaine de Tzeentch');
 const c=getSpellContract('Trahison de Tzeentch');
 const {store}=await encounter();
 const p=store.previewSpellExecution(c.id,inputFor(c,{attributeActive:true}));
 assert.equal(p.ready,false);assert.equal(p.status,'dice-required');assert.match(p.error,/Test de Corruption/);
});
test('Attribut de Tzeentch — réussite : +1 Point de Chance temporaire ; échec : +1 Point de Corruption (Undo, rechargement)',async()=>{
 const c=getSpellContract('Trahison de Tzeentch');
 for(const [roll,success] of [[10,true],[95,false]]){
  const {store}=await encounter();const before=store.listParticipants();
  await cast(store,c,{attributeActive:true,targetTests:{foe:{corruptionRoll:roll,roll:98}}});
  const foe=subject(store,'foe'),layers=foe.extensions.v5.spellEffects;
  assert.equal(layers.some(e=>e.spellId==='lore-attribute-tzeentch'&&e.remainingTempFortune===1),success,'Chance, jet '+roll);
  assert.equal(foe.extensions.v5.corruptionPoints||0,success?0:1,'Corruption, jet '+roll);
  await store.undo();assert.deepEqual(store.listParticipants(),before);
 }
});
test('Don de Tzeentch — le sort choisi doit être un contrat existant ; fin sur Incantation Imparfaite rappelée',async()=>{
 const c=getSpellContract('Don de Tzeentch');
 const {store}=await encounter();
 const bad=store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{boonSpell:'Sort inventé'}}));assert.equal(bad.ready,false);
 const good=store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{boonSpell:'Bonne santé'}}));assert.equal(good.ready,true,good.error);
 assert.match(c.reminders,/Incantation Imparfaite/);assert.match(c.reminders,/grimoire/);
 assert.equal(c.duration,'Bonus d’Intelligence jours');
});
test('Transformation de Tzeentch — À Terre, Endurance +0 en fin de Round : échec = +1 Point de Corruption',async()=>{
 const c=getSpellContract('Transformation de Tzeentch');
 for(const [roll,corruption] of [[95,1],[5,0]]){
  const {store,engine}=await encounter();await cast(store,c,{targetTests:{foe:{roll:95,resistanceRoll:95}}});
  assert.equal(level(subject(store,'foe'),'À Terre'),1);
  const layer=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===c.id);
  await endTurn(engine,{inputs:{foe:{['spell:'+layer.id+':roundTest']:roll}}});await endTurn(engine,{inputs:{foe:{['spell:'+layer.id+':roundTest']:roll}}});
  assert.equal(subject(store,'foe').extensions.v5.corruptionPoints||0,corruption,'jet '+roll);
 }
 assert.match(c.reminders,/sans défense/);
});
test('Trahison de Tzeentch — Animosité (Alliés) et Calme −2 DR sur Critique en attaque (rappel de transfert d’Avantage)',async()=>{
 const c=getSpellContract('Trahison de Tzeentch');
 assert.deepEqual(c.effects.traits,['Animosité (Alliés)']);assert.equal(c.effects.triggered.test.modifierSl,-2);
 assert.match(c.reminders,/transfert d’Avantage/);
});
