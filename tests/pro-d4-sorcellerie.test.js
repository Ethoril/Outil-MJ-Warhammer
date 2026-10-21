import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter,subject,level,endTurn,verifySpell,inputFor,cast} from './helpers/lot3-domain-fixture.js';
import {getSpellContract} from '../js/core/v5-spell-contracts.js';

// L06 pp. 256-257 : [nom FR, nom EN, page, NI, portée, cible, durée]
const SOURCE=[
 ['Dégradation','Blight',256,14,'Bonus de Force Mentale mètres','Spécial','Instantané'],
 ['Menace rampante','Creeping Menace',257,6,'Force Mentale mètres','1','Bonus de Force Mentale Rounds'],
 ['Malédiction de douleur paralysante','Curse of Crippling Pain',257,10,'Force Mentale mètres','1','Bonus de Force Mentale Rounds'],
 ['Malédiction de malchance','Curse of Ill Fortune',257,8,'Force Mentale mètres','1','Bonus de Force Mentale minutes'],
 ['Glamour','Glamour',257,4,'Toucher','1 adulte','Bonus de Force Mentale heures'],
 ['Horreur hantante','Haunting Horror',257,8,'Toucher','Spécial','Force Mentale jours'],
 ['Bonne santé','Make Hale',257,4,'Toucher','1','Instantané'],
 ['Mauvais œil','The Evil Eye',257,6,'10 mètres maximum','1 maximum','Instantané']
];
for(const [fr,en,page,cn,range,target,duration] of SOURCE)test(`Sorcellerie L06 p. ${page} — ${fr} : paramètres relus, domaine, aucun attribut ni ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
 assert.equal(c.domain,'witchcraft');assert.equal(c.type,'Domaine de la Sorcellerie');
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const FACTS={'Dégradation':{blightTarget:'well'},'Malédiction de douleur paralysante':{stabLocation:'body'},'Malédiction de malchance':{curseMode:'normal'},'Mauvais œil':{evilEyeOutcome:'won3'},'Menace rampante':{swarmType:'rats'}};
for(const [fr] of SOURCE.filter(([n])=>n!=='Horreur hantante'))test(`Sorcellerie — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{domainFactsExtra:FACTS[fr]||{},targetTests:{foe:{resistanceRoll:95,roll:95,objectId:'blade'},mage:{roll:95}}});
});
test('Horreur hantante — lancement, persistance et Undo ; aucune exigence de lieu ni d’ingrédient',async()=>{
 const {store}=await encounter();const c=getSpellContract('Horreur hantante');
 const before=store.listParticipants();await cast(store,c);
 assert.ok(subject(store,'foe').extensions.v5.spellEffects.some(e=>e.spellId===c.id&&e.triggered));
 await store.undo();assert.deepEqual(store.listParticipants(),before);
});
test('Malédiction de malchance — −1 DR à tous les Tests, Chance interdite ; la possession donne des jours sans ligne de vue',async()=>{
 const {store}=await encounter();const c=getSpellContract('Malédiction de malchance');
 await cast(store,c,{domainFactsExtra:{curseMode:'normal'},targetTests:{foe:{resistanceRoll:95,roll:95}}});
 const foe=subject(store,'foe');
 assert.equal(foe.extensions.v5.testModifiers['Tous les Tests'],-1);assert.equal(foe.extensions.v5.specialStates.cannotUseFortune,true);
 assert.equal(foe.extensions.v5.spellEffects[0].durationRounds,6*6,'BFM minutes');
 const other=await encounter();
 await cast(other.store,c,{domainFactsExtra:{curseMode:'possession'},targetTests:{foe:{resistanceRoll:95,roll:95}}});
 assert.equal(subject(other.store,'foe').extensions.v5.spellEffects[0].durationRounds,6*8640,'BFM jours');
 assert.match(c.reminders,/relance tous ses jets 01-05/);
});
test('Bonne santé — soigne le BFM, retire un seul Exténué et un seul Sonné',async()=>{
 const {store}=await encounter({foe:{hp:10,maxHp:40,states:[{id:'a',name:'Exténué',level:2},{id:'b',name:'Sonné',level:1}]}});
 const c=getSpellContract('Bonne santé');
 await cast(store,c);
 const foe=subject(store,'foe');
 assert.equal(foe.hp,16);assert.equal(level(foe,'Exténué'),1);assert.equal(level(foe,'Sonné'),0);
 assert.equal(c.overcast.specific[0].cost,3);
});
test('Malédiction de douleur — Corps : Exténué et chute sur Endurance −2 DR ratée ; Tête : Sonné ; Membre : rappel',async()=>{
 const c=getSpellContract('Malédiction de douleur paralysante');
 for(const [roll,fallen] of [[95,1],[10,0]]){
  const {store}=await encounter();await cast(store,c,{domainFactsExtra:{stabLocation:'body'},targetTests:{foe:{resistanceRoll:roll,roll}}});
  const foe=subject(store,'foe');assert.equal(level(foe,'Exténué'),1);assert.equal(level(foe,'À Terre'),fallen,'jet '+roll);
 }
 const head=await encounter();await cast(head.store,c,{domainFactsExtra:{stabLocation:'head'}});
 assert.equal(level(subject(head.store,'foe'),'Sonné'),1);assert.equal(level(subject(head.store,'foe'),'Exténué'),0);
 const limb=await encounter();await cast(limb.store,c,{domainFactsExtra:{stabLocation:'limb'}});
 assert.equal(level(subject(limb.store,'foe'),'Sonné')+level(subject(limb.store,'foe'),'Exténué'),0);
 assert.match(c.reminders,/amputé/);
 const expire=await encounter();await cast(expire.store,c,{domainFactsExtra:{stabLocation:'body'},targetTests:{foe:{resistanceRoll:95,roll:95}}});
 const layer=subject(expire.store,'foe').extensions.v5.spellEffects[0];assert.equal(layer.durationRounds,6);
});
test('Mauvais œil — l’issue saisie fixe les Exténué (un de plus par +3 DR) et le Brisé à +6 DR',async()=>{
 const c=getSpellContract('Mauvais œil');
 for(const [outcome,fatigue,broken] of [['lost',0,0],['won',1,0],['won3',2,0],['won6',3,1],['won9',4,1]]){
  const {store}=await encounter();await cast(store,c,{domainFactsExtra:{evilEyeOutcome:outcome},targetTests:{foe:{resistanceRoll:95,roll:95}}});
  const foe=subject(store,'foe');assert.equal(level(foe,'Exténué'),fatigue,outcome);assert.equal(level(foe,'Brisé'),broken,outcome);
 }
});
test('Horreur hantante — clause d’entrée : +1 Exténué dans tous les cas, +1 Exténué et Brisé si le Calme est raté',async()=>{
 const c=getSpellContract('Horreur hantante');
 for(const [roll,fatigue,broken] of [[10,1,0],[95,2,1]]){
  const {store}=await encounter();await cast(store,c);
  const effect=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===c.id);
  const input={effectId:effect.id,targetId:'foe',kind:'trigger',roll};
  const p=store.previewSpellInteraction(input);assert.equal(p.ready,true,p.error);
  await store.applySpellInteraction(input);
  const foe=subject(store,'foe');assert.equal(level(foe,'Exténué'),fatigue,'jet '+roll);assert.equal(level(foe,'Brisé'),broken,'jet '+roll);
 }
});
test('Menace rampante et Dégradation — rappels : essaim sans profil automatique, formule 24 − DR',async()=>{
 const menace=getSpellContract('Menace rampante');
 assert.equal(menace.effects.assistedSummon,true);assert.match(menace.reminders,/Charme animal/);
 assert.equal(getSpellContract('Dégradation').effects.receiptFormulas.joursAvantMortAnimal,'24 - DR');
});
test('Sorcellerie — aucune Corruption à l’incantation de Dhar (V5) : aucun contrat n’impose de Point de Corruption',()=>{
 for(const [fr] of SOURCE)assert.doesNotMatch(JSON.stringify(getSpellContract(fr).effects),/corruptionPoints|Point de Corruption/i,fr);
 void inputFor;void endTurn;
});
