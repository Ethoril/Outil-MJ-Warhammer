import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter,subject,level,cast,inputFor,verifySpell} from './helpers/lot3-domain-fixture.js';
import {getSpellContract} from '../js/core/v5-spell-contracts.js';
import {normalizeLoreId,LORE_ATTRIBUTES} from '../js/core/v5-magic-attributes.js';

// L12 pp. 98-99 : [nom FR, nom EN, page, NI, portée, cible, durée]
const SOURCE=[
 ['Du calme !','Behave!',98,2,'Force Mentale mètres','1 (maximum)','Bonus de Force Mentale minutes'],
 ['Mots malins','Cunnin’ Words',98,0,'Force Mentale mètres','1','Bonus de Force Mentale minutes'],
 ['Malédiction de la Mauvaise Lune','Curse of Da Bad Moon',98,9,'Bonus de Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Don du Dieu-Araignée','Gift of the Spider-God',98,3,'Vous','ZdE Bonus de Force Mentale mètres (Gobelins des forêts)','Bonus de Force Mentale Rounds'],
 ['Gork va arranger ça','Gork’ll Fix It',98,5,'Force Mentale mètres','1','Bonus de Force Mentale Rounds'],
 ['La Grande Rancune verte','The Great Green Spite',98,20,'Bonus de Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Démangeaison','Itchy Nuisance',99,4,'Bonus de Force Mentale mètres','1','Bonus de Force Mentale Rounds'],
 ['Mork te veut !','Mork Wants Ya!',99,9,'Bonus de Force Mentale mètres','1','Instantané'],
 ['Voile de la nuit','Night Shroud',99,5,'Bonus de Force mètres','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Chapardeur','Nikkit!',99,3,'Force Mentale mètres','1','Instantané'],
 ['Coups en traître','Sneaky Stabbin’',99,8,'Vous','ZdE Bonus de Force Mentale mètres (Orques et Gobelins)','Bonus de Force Mentale Rounds'],
 ['Regard vengeur','Vindictive Glare',99,7,'Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Instantané']
];
for(const [fr,en,page,cn,range,target,duration] of SOURCE)test(`Petite Waaagh L12 p. ${page} — ${fr} : paramètres relus, domaine, aucun ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
 assert.equal(c.domain,'little-waaagh');assert.equal(c.type,'Domaine de la Petite Waaagh');assert.equal(c.sourceBook,'L12');
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const ALLY={foe:{camp:'pj'}};
const PATCH={
 'Don du Dieu-Araignée':{targetTests:{foe:{forestGoblin:true,roll:98},mage:{roll:98}}},
 'La Grande Rancune verte':{targetTests:{foe:{greenskin:true,roll:98},mage:{roll:98}}},
 'Coups en traître':{targetTests:{foe:{greenskin:true,roll:98},mage:{roll:98}}},
 'Mork te veut !':{domainFactsExtra:{opposedActorRoll:5},targetTests:{foe:{opponentRoll:95,resistanceRoll:95,roll:95},mage:{roll:95}}}
};
for(const [fr] of SOURCE)test(`Petite Waaagh — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 const c=getSpellContract(fr);
 const patch=PATCH[fr]||{targetTests:{foe:{resistanceRoll:95,roll:95,dodgeRoll:95,objectId:'blade'},mage:{roll:95}}};
 await verifySpell(c,{...patch,...(['Don du Dieu-Araignée','La Grande Rancune verte','Coups en traître'].includes(fr)?{}:{})});
});
test('Attribut de la Petite Waaagh — 1 DR converti en 1 Point de Chance (couche sans échéance), sur demande',async()=>{
 assert.equal(normalizeLoreId('little-waaagh'),'little-waaagh');assert.equal(LORE_ATTRIBUTES['little-waaagh'].name,'Domaine de la Petite Waaagh');
 const c=getSpellContract('Gork va arranger ça');
 const yes=await encounter();
 await cast(yes.store,c,{attributeActive:true,domainFactsExtra:{waaaghFortune:true},targetTests:{foe:{roll:98}}});
 assert.ok(subject(yes.store,'mage').extensions.v5.spellEffects.some(e=>e.remainingTempFortune===1),'Chance temporaire');
 const no=await encounter();
 await cast(no.store,c,{attributeActive:true,targetTests:{foe:{roll:98}}});
 assert.ok(!(subject(no.store,'mage').extensions.v5.spellEffects||[]).some(e=>e.remainingTempFortune),'sans demande, rien');
});
test('Malédiction de la Mauvaise Lune — ennemis seulement : Exténué et Chance interdite',async()=>{
 const c=getSpellContract('Malédiction de la Mauvaise Lune');
 const {store}=await encounter();await cast(store,c);
 const foe=subject(store,'foe');assert.equal(level(foe,'Exténué'),1);assert.equal(foe.extensions.v5.specialStates.cannotUseFortune,true);
 const friend=await encounter({foe:{camp:'pj'}});
 assert.equal(friend.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true,'allié exempté');
});
test('Gork va arranger ça — Exténué pour la durée ; Démangeaison — −1 DR, −2 DR en armure de métal',async()=>{
 const {store}=await encounter();await cast(store,getSpellContract('Gork va arranger ça'));
 assert.equal(level(subject(store,'foe'),'Exténué'),1);
 const c=getSpellContract('Démangeaison');
 const plain=await encounter();await cast(plain.store,c);
 assert.equal(subject(plain.store,'foe').extensions.v5.testModifiers['Tous les Tests'],-1);
 const steel=await encounter({foe:{equipment:[{id:'MaillesMailles',kind:'armour',keywords:[],name:'Cotte de mailles',category:'Mailles',layer:'flexible',ap:2,locations:['body']}]}});
 await cast(steel.store,c);
 assert.equal(subject(steel.store,'foe').extensions.v5.testModifiers['Tous les Tests'],-2,'armure de métal');
 assert.equal(c.effects.metalArmourTestModifiers['Tous les Tests'],-2);
});
test('Don du Dieu-Araignée — Venin Intermédiaire aux seuls Gobelins des forêts alliés',async()=>{
 const c=getSpellContract('Don du Dieu-Araignée');
 const none=await encounter({foe:{camp:'pj'}});
 assert.equal(none.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true,'sans le fait');
 const ok=await encounter({foe:{camp:'pj'}});await cast(ok.store,c,{targetTests:{foe:{forestGoblin:true,roll:98}}});
 assert.ok(subject(ok.store,'foe').traits.some(t=>/Venin/.test(t))||JSON.stringify(subject(ok.store,'foe').extensions.v5.spellEffects).includes('Venin'));
 assert.match(c.reminders,/Difficile/);
});
test('Mork te veut ! — Force 80 opposée : main gagnante = 10 au corps, cible gagnante = aucun effet',async()=>{
 const c=getSpellContract('Mork te veut !');
 const run=async(handRoll,targetRoll)=>{const {store}=await encounter({foe:{hp:40,maxHp:40,armor:{head:0,body:0,arms:0,legs:0}}});
  await cast(store,c,{domainFactsExtra:{opposedActorRoll:handRoll},targetTests:{foe:{opponentRoll:targetRoll,resistanceRoll:targetRoll,roll:98}}});return subject(store,'foe');};
 assert.ok((await run(5,95)).hp<40,'main gagnante');assert.equal((await run(95,5)).hp,40,'cible gagnante');
 assert.equal(c.effects.opposedTest.casterScore,80);assert.match(c.reminders,/2d10 mètres/);
});
test('Voile de la nuit — Aveuglé, Vision nocturne et Vision dans le noir exemptées',async()=>{
 const c=getSpellContract('Voile de la nuit');
 const {store}=await encounter();await cast(store,c);assert.equal(level(subject(store,'foe'),'Aveugl'),1);
 for(const trait of ['Vision nocturne','Vision dans le noir']){
  const e=await encounter({foe:{traits:[trait]}});
  assert.equal(e.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true,trait);
 }
});
test('Regard vengeur — Dégâts +4 en zone, Sonné seulement si Blessures et Calme raté',async()=>{
 const c=getSpellContract('Regard vengeur');
 const run=async roll=>{const {store}=await encounter({foe:{hp:40,maxHp:40,armor:{head:0,body:0,arms:0,legs:0}}});
  await cast(store,c,{targetTests:{foe:{resistanceRoll:roll,roll:98,wardRoll:1}}});return subject(store,'foe');};
 const failed=await run(95);assert.ok(failed.hp<40);assert.equal(level(failed,'Sonné'),1);
 const passed=await run(5);assert.ok(passed.hp<40);assert.equal(level(passed,'Sonné'),0);
 assert.equal(c.effects.missile.damage,4);
});
test('La Grande Rancune verte, Coups en traître, Du calme !, Mots malins, Chapardeur — rappels et ciblage',async()=>{
 assert.match(getSpellContract('La Grande Rancune verte').reminders,/Coup Critique/);assert.match(getSpellContract('La Grande Rancune verte').reminders,/Hobgobelin/);
 assert.match(getSpellContract('Coups en traître').reminders,/Empaleuse et Perforante/);
 assert.match(getSpellContract('Du calme !').reminders,/Squig, Loup géant, Araignée/);
 assert.equal(getSpellContract('Mots malins').cn,0);
 assert.match(getSpellContract('Chapardeur').reminders,/Escamotage 55/);
 const c=getSpellContract('Coups en traître');
 const stranger=await encounter({foe:{camp:'pj'}});assert.equal(stranger.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true);
});
