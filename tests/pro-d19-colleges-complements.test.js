import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter,subject,level,cast,inputFor,verifySpell} from './helpers/lot3-domain-fixture.js';
import {getSpellContract,getAllSpellContracts} from '../js/core/v5-spell-contracts.js';

// [nom FR, nom EN, livre, page, NI, portée, cible, durée] — L17 pp. 26-27 et L07 p. 81
const SOURCE=[
 ['Belligérance du Marais de sang','Belligerence of the Bloodmarsh','L17',26,2,'Bonus de Force Mentale mètres','1 Bête des fens (n’importe laquelle)','Instantané'],
 ['Effondrement d’un construit','Collapse Construct','L17',26,6,'Bonus de Force Mentale mètres','1 Construit (n’importe lequel)','Instantané'],
 ['Déchiffrer la malédiction','Decipher Curse','L17',26,4,'Force Mentale mètres','Tout objet','Instantané'],
 ['Perturber la magie','Disrupt Magic','L17',26,8,'Force Mentale mètres','1','Instantané'],
 ['Pourriture grouillante de mouches','Fly-Infested Rotweed','L17',26,4,'Bonus de Force Mentale mètres','1 Bête des fens (n’importe laquelle)','Bonus de Force Mentale minutes'],
 ['Limon de vie','Lifebloom Silt','L17',26,4,'Bonus de Force Mentale mètres','1 Bête des fens (n’importe laquelle)','Bonus de Force Mentale minutes'],
 ['Silence (Arcane)','Silence (Arcane)','L17',27,4,'Vous','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale minutes'],
 ['Secours au serviteur magique','Succour Magical Servant','L17',27,2,'Bonus de Force Mentale mètres','Un de vos Constructs ou Familiers','Instantané'],
 ['Voile de brouillard','Shroud of Fog','L07',81,8,'Vous','ZdE Bonus de Force Mentale miles','Force Mentale minutes']
];
for(const [fr,en,book,page,cn,range,target,duration] of SOURCE)test(`Collèges ${book} p. ${page} — ${fr} : paramètres relus, Arcane, aucun ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
 assert.equal(c.domain,'arcane');assert.match(c.type,/^Sort d’Arcane/);assert.equal(c.sourceBook,book);assert.equal(c.isTradition,true);
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const PATCH={
 'Effondrement d’un construit':{domainFactsExtra:{opposedActorRoll:5},targetTests:{foe:{opponentRoll:95,resistanceRoll:95,roll:95},mage:{roll:95}}},
 'Perturber la magie':{domainFactsExtra:{opposedActorRoll:5},targetTests:{foe:{opponentRoll:95,resistanceRoll:95,roll:95},mage:{roll:95}}}
};
for(const [fr] of SOURCE)test(`Collèges — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{burnoutRoll:50,...(PATCH[fr]||{targetTests:{foe:{resistanceRoll:95,roll:95,dodgeRoll:95,objectId:'blade'},mage:{roll:95}}})});
});
test('Silence (Arcane) — contrat distinct du Silence d’Ombres, −3 DR à l’incantation dans la zone',async()=>{
 const arc=getSpellContract('Silence (Arcane)'),shadow=getSpellContract('Silence');
 assert.notEqual(arc.id,shadow.id);assert.equal(shadow.domain,'shadow');assert.equal(arc.domain,'arcane');
 const {store}=await encounter();await cast(store,arc);
 assert.equal(subject(store,'foe').extensions.v5.testModifiers['Langue (Magick)'],-3);
});
test('Bêtes des fens — Frénésie, Distrayant, Régénération doublée : Bête des fens seulement (Trait posé par le MJ)',async()=>{
 for(const [name,trait] of [['Belligérance du Marais de sang','Frénésie'],['Pourriture grouillante de mouches','Distrayant']]){
  const c=getSpellContract(name);assert.deepEqual(c.effects.traits,[trait]);
  const plain=await encounter();assert.equal(plain.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true,name+' : cible ordinaire exemptée');
  const beast=await encounter({foe:{traits:['Bête des fens']}});await cast(beast.store,c);
  assert.ok(subject(beast.store,'foe').extensions.v5.spellEffects.some(e=>e.spellId===c.id),name);
 }
 const silt=getSpellContract('Limon de vie');assert.match(silt.effects.specialState.assistedReminder,/double/);
});
test('Effondrement d’un construit — Force Mentale contre Endurance : victoire = inerte, défaite = rien ; Construit seulement',async()=>{
 const c=getSpellContract('Effondrement d’un construit');
 const run=async(casterRoll,targetRoll)=>{const {store}=await encounter({foe:{traits:['Artificiel']}});
  await cast(store,c,{domainFactsExtra:{opposedActorRoll:casterRoll},targetTests:{foe:{opponentRoll:targetRoll,resistanceRoll:targetRoll,roll:98}}});return subject(store,'foe');};
 assert.ok((await run(5,95)).extensions.v5.spellEffects.some(e=>e.spellId===c.id),'inerte');
 assert.ok(!((await run(95,5)).extensions?.v5?.spellEffects||[]).some(e=>e.spellId===c.id),'résistance');
 const plain=await encounter();assert.equal(plain.store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{opposedActorRoll:5},targetTests:{foe:{opponentRoll:95,resistanceRoll:95,roll:98}}})).targetResults?.[0]?.resisted,true);
 assert.match(c.reminders,/deux dés explicites/);
});
test('Perturber la magie — opposition de Force Mentale à deux dés, Fiasco mineur en rappel ; Déchiffrer la malédiction — rappels',async()=>{
 const c=getSpellContract('Perturber la magie');
 const {store}=await encounter();
 assert.equal(store.previewSpellExecution(c.id,inputFor(c)).ready,false,'sans dés explicites');
 const ok=store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{opposedActorRoll:5},targetTests:{foe:{opponentRoll:95,resistanceRoll:95,roll:98}}}));
 assert.equal(ok.ready,true,ok.error);assert.match(c.reminders,/Fiasco mineur/);
 const dc=getSpellContract('Déchiffrer la malédiction');assert.equal(dc.treatment,'narrative');assert.match(dc.reminders,/Exposition modérée/);assert.match(dc.reminders,/Lever la malédiction/);
});
test('Secours au serviteur magique — soin du Bonus d’Endurance, doublé à +3 DR (rappel chiffré), alliés seulement',async()=>{
 const c=getSpellContract('Secours au serviteur magique');
 assert.equal(c.overcast.specific[0].cost,3);
 const {store}=await encounter({foe:{camp:'pj',hp:5,maxHp:40}});await cast(store,c);
 assert.ok(subject(store,'foe').hp>5,'Blessures récupérées');
 const enemy=await encounter({foe:{hp:5,maxHp:40}});
 assert.equal(enemy.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true);
});
test('Secours au serviteur magique — D-C122 : le soin compte le Bonus d’Endurance du serviteur, pas celui du lanceur',async()=>{
 const c=getSpellContract('Secours au serviteur magique');
 const {store}=await encounter({foe:{camp:'pj',hp:5,maxHp:40,caracs:{E:70,CC:50,F:40,I:50,Ag:50,Dex:50,Int:60,FM:60,Soc:50,M:4}}});await cast(store,c);
 assert.equal(subject(store,'foe').hp,5+7,'BE du serviteur (7), non celui du lanceur (4)');
 const noE=await encounter({foe:{camp:'pj',hp:5,maxHp:40,caracs:{CC:50}}});
 const p=noE.store.previewSpellExecution(c.id,inputFor(c));assert.equal(p.ready,false);assert.match(p.error,/Endurance/);
});
test('Voile de brouillard — rappel (visibilité 10 mètres, non magique) ; aucun doublon de nom parmi les contrats',()=>{
 const c=getSpellContract('Voile de brouillard');assert.equal(c.treatment,'narrative');assert.match(c.reminders,/10 mètres/);assert.match(c.reminders,/non magique/);
 const names=getAllSpellContracts().map(x=>x.name);assert.equal(new Set(names).size,names.length);
});
