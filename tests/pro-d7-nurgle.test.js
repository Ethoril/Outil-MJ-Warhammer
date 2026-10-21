import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter,subject,level,cast,inputFor,verifySpell} from './helpers/lot3-domain-fixture.js';
import {getSpellContract} from '../js/core/v5-spell-contracts.js';
import {normalizeLoreId,LORE_ATTRIBUTES,previewLoreAttribute} from '../js/core/v5-magic-attributes.js';

// L06 p. 259 : [nom FR, nom EN, NI, portée, cible, durée]
const SOURCE=[
 ['Inflammation suppurée','Festering Inflammation',5,'Bonus de Force Mentale mètres','1','Instantané'],
 ['Miasme de pestilence','Miasma of Pestilence',6,'Vous','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Flot de Corruption','Stream of Corruption',9,'Spécial','Spécial','Instantané']
];
for(const [fr,en,cn,range,target,duration] of SOURCE)test(`Nurgle L06 p. 259 — ${fr} : paramètres relus, domaine, aucun ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[259,cn,range,target,duration]);
 assert.equal(c.domain,'nurgle');assert.equal(c.type,'Domaine de Nurgle');
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
for(const [fr] of SOURCE)test(`Nurgle — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{targetTests:{foe:{resistanceRoll:95,roll:95,objectId:'blade'},mage:{roll:95}}});
});
test('Attribut de Nurgle — Domaine reconnu, couche « Blessure Suppurée » seulement tant que le sort dure',()=>{
 assert.equal(normalizeLoreId('nurgle'),'nurgle');assert.equal(LORE_ATTRIBUTES.nurgle.name,'Domaine de Nurgle');
 const caster={id:'c',caracs:{FM:50,Int:40}},foe={id:'f',name:'Foe'};
 const lasting=previewLoreAttribute({lore:'nurgle',caster,targets:[foe],spell:{duration:'Bonus de Force Mentale Rounds'}});
 assert.equal(lasting.targetEffects.get('f').spellEffect.specialState.festeringWoundTest,true);
 const instant=previewLoreAttribute({lore:'nurgle',caster,targets:[foe],spell:{duration:'Instantané'}});
 assert.equal(instant.targetEffects.get('f').spellEffect,undefined);assert.match(instant.targetEffects.get('f').summary,/Blessure suppurée/);
});
test('Attribut de Nurgle — appliqué à la cible d’un sort de durée (couche portée, retirée avec Undo)',async()=>{
 const c=getSpellContract('Miasme de pestilence');
 const {store}=await encounter();const before=store.listParticipants();
 await cast(store,c,{attributeActive:true,targetTests:{foe:{resistanceRoll:95,roll:95}}});
 const layers=subject(store,'foe').extensions.v5.spellEffects;
 assert.ok(layers.some(e=>e.spellId===c.id),'couche du sort');
 assert.ok(layers.some(e=>e.spellId==='lore-attribute-nurgle'&&e.specialState?.festeringWoundTest),'couche de l’attribut');
 await store.undo();assert.deepEqual(store.listParticipants(),before);
 const off=await encounter();await cast(off.store,c,{targetTests:{foe:{resistanceRoll:95,roll:95}}});
 assert.ok(!subject(off.store,'foe').extensions.v5.spellEffects.some(e=>e.spellId==='lore-attribute-nurgle'),'attribut coupé (réglage par défaut de la fixture)');
});
test('Miasme de pestilence — Endurance −2 DR : raté = Nausée (couche), réussi = évité ; exemptés : dévoués, moines, non-vivants',async()=>{
 const c=getSpellContract('Miasme de pestilence');
 for(const [roll,affected] of [[95,true],[3,false]]){
  const {store}=await encounter();await cast(store,c,{targetTests:{foe:{resistanceRoll:roll,roll}}});
  assert.equal((subject(store,'foe').extensions.v5.spellEffects||[]).some(e=>e.spellId===c.id),affected,'jet '+roll);
 }
 for(const traits of [['Dévoué de Nurgle'],['Moine de la peste'],['Mort-vivant'],['Démoniaque']]){
  const {store}=await encounter({foe:{traits}});
  const p=store.previewSpellExecution(c.id,inputFor(c,{targetTests:{foe:{resistanceRoll:95,roll:95}}}));
  assert.equal(p.targetResults?.[0]?.resisted,true,traits.join());
 }
 assert.match(c.reminders,/Nausée/);
});
test('Flot de Corruption — Dégâts BE + DR, Points d’Armure ignorés ; Pourriture du sang rappelée',async()=>{
 const c=getSpellContract('Flot de Corruption');
 assert.equal(c.effects.damage.formula,'BE+DR');assert.equal(c.effects.damage.ignoreAp,true);
 const lost=async armor=>{const {store}=await encounter({foe:{hp:200,maxHp:200,armor}});await cast(store,c,{targetTests:{foe:{roll:98,wardRoll:1}}});return 200-subject(store,'foe').hp;};
 const bare=await lost({head:0,body:0,arms:0,legs:0}),armoured=await lost({head:5,body:5,arms:5,legs:5});
 assert.ok(bare>0);assert.equal(armoured,bare,'les Points d’Armure sont ignorés');
 assert.match(c.reminders,/Pourriture du sang/);assert.match(c.reminders,/Intermédiaire \(\+0 DR\)/);
});
test('Inflammation suppurée — rappel : le MJ désigne la Blessure suppurée',()=>{
 const c=getSpellContract('Inflammation suppurée');
 assert.equal(c.treatment,'narrative');assert.match(c.reminders,/Blessure Suppurée/);
});
