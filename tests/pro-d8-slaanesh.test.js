import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter,subject,cast,inputFor,verifySpell,endTurn} from './helpers/lot3-domain-fixture.js';
import {getSpellContract} from '../js/core/v5-spell-contracts.js';
import {normalizeLoreId,LORE_ATTRIBUTES,previewLoreAttribute} from '../js/core/v5-magic-attributes.js';

// L06 p. 260 : [nom FR, nom EN, NI, portée, cible, durée]
const SOURCE=[
 ['Consentement','Acquiescence',5,'Toucher','1','Bonus de Force Mentale Rounds'],
 ['De la douleur le plaisir','From Pain, Pleasure',6,'Toucher','1','Bonus de Force Mentale Rounds'],
 ['Fantasmagorie','Phantasmagoria',8,'Vous','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds']
];
for(const [fr,en,cn,range,target,duration] of SOURCE)test(`Slaanesh L06 p. 260 — ${fr} : paramètres relus, domaine, aucun ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[260,cn,range,target,duration]);
 assert.equal(c.domain,'slaanesh');assert.equal(c.type,'Domaine de Slaanesh');
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
for(const [fr] of SOURCE)test(`Slaanesh — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{targetTests:{foe:{resistanceRoll:95,roll:95,objectId:'blade'},mage:{roll:95}}});
});
test('Attribut de Slaanesh — −2 DR contre Animosité, Haine, Corruption ; +2 DR contre Peur, Terreur ; couche tant que le sort dure',async()=>{
 assert.equal(normalizeLoreId('Slaanesh'),'slaanesh');assert.equal(LORE_ATTRIBUTES.slaanesh.name,'Domaine de Slaanesh');
 const p=previewLoreAttribute({lore:'slaanesh',caster:{id:'c',caracs:{FM:50}},targets:[{id:'f',name:'Foe'}],spell:{duration:'Bonus de Force Mentale Rounds'}});
 assert.deepEqual(p.targetEffects.get('f').spellEffect.specialState.resistanceModifiers,{Animosité:-2,Haine:-2,Corruption:-2,Peur:2,Terreur:2});
 const c=getSpellContract('De la douleur le plaisir');
 const {store}=await encounter();const before=store.listParticipants();
 await cast(store,c,{attributeActive:true});
 assert.ok(subject(store,'foe').extensions.v5.spellEffects.some(e=>e.spellId==='lore-attribute-slaanesh'&&e.specialState?.resistanceModifiers?.Peur===2));
 await store.undo();assert.deepEqual(store.listParticipants(),before);
});
test('Consentement — Endurance +0 au début de chaque Round : le jet est demandé et consigné ; durée BFM Rounds',async()=>{
 const c=getSpellContract('Consentement');
 assert.equal(c.effects.roundEffect.phase,'startOfRound');assert.equal(c.effects.roundEffect.test.modifierSl,0);assert.equal(c.effects.roundEffect.test.skill,'Endurance');
 const {store,engine}=await encounter();await cast(store,c);
 const layer=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===c.id);
 assert.equal(layer.durationRounds,6);assert.ok(layer.roundEffect);
 await endTurn(engine);await endTurn(engine);
 assert.match(JSON.stringify(store.getFullJSON()),/perd son Mouvement et son Action/);
});
test('De la douleur le plaisir — Trait Indolore, Critique : Endurance +2 DR en rappel (Impuissante = cible sans défense)',async()=>{
 const c=getSpellContract('De la douleur le plaisir');
 const {store}=await encounter();await cast(store,c);
 assert.ok(subject(store,'foe').extensions.v5.spellEffects.some(e=>e.spellId===c.id));
 assert.ok(c.effects.traits.includes('Indolore'));assert.match(c.reminders,/Accessible \(\+2 DR\)/);assert.match(c.reminders,/sans défense/);
});
test('Fantasmagorie — le Trait Distrayant va aux alliés de la zone seulement, ennemis exemptés',async()=>{
 const c=getSpellContract('Fantasmagorie');assert.ok(c.effects.traits.includes('Distrayant'));
 const hostile=await encounter();
 assert.equal(hostile.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true,'ennemi exemptée');
 const ally=await encounter({foe:{camp:'pj'}});
 const p=ally.store.previewSpellExecution(c.id,inputFor(c));assert.equal(p.ready,true,p.error);assert.notEqual(p.targetResults?.[0]?.resisted,true);
 await ally.store.applySpellExecution(c.id,inputFor(c));
 assert.ok(subject(ally.store,'foe').extensions.v5.spellEffects.some(e=>e.spellId===c.id));
 assert.match(c.reminders,/ne se distraient pas/);
});
