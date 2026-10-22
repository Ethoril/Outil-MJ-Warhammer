import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter,subject,level,cast,inputFor,verifySpell} from './helpers/lot3-domain-fixture.js';
import {getSpellContract} from '../js/core/v5-spell-contracts.js';

// [nom FR, nom EN, domaine, page, NI, portée, cible, durée] — L08 pp. 102-111
const VAUL=[
 ['Toucher de l’artiste','Artist’s Touch',102,0,'Toucher','1 objet','Instantané'],
 ['Patience de Vaul','Patience of Vaul',102,0,'Toucher','1 objet','Instantané'],
 ['Grâce de Vaul','Vaul’s Grace',102,7,'Toucher','1 objet','Instantané'],
 ['Rage de Vaul','Vaul’s Rage',102,5,'Bonus de Force Mentale mètres','1 forge ou feu de camp (maximum)','Instantané'],
 ['Divination des flammes','Divination of Flames',102,4,'Bonus d’Initiative mètres (maximum)','1 forge ou feu de camp (maximum)','Bonus d’Intelligence heures'],
 ['Divination des pierres','Divination of Stones',103,6,'Bonus d’Intelligence miles','Spécial','Bonus d’Intelligence heures'],
 ['Feux de la perfection','Fires of Perfection',103,9,'Toucher','1 objet','Instantané'],
 ['Sagesse de l’acier du ciel','Wisdom of the Skysteel',103,11,'Toucher','1 objet','1 Entreprise'],
 ['Forteresse de Hotek','Fortress of Hotek',103,14,'Bonus de Force Mentale mètres','1 salle de forge ou bâtiment (maximum)','Bonus de Force Mentale heures']
];
const MER=[
 ['Lien aux poissons','Fishbonding',106,0,'Force Mentale mètres','1','Force Mentale minutes'],
 ['Sens de la tempête','Stormsense',106,0,'Initiative miles','Spécial','Instantané'],
 ['Furie de l’océan','Ocean’s Fury',106,8,'Vous','ZdE Bonus de Force Mentale miles','3 × Bonus de Force Mentale minutes'],
 ['Esprits des vagues','Spirits of the Waves',106,5,'2 × Sociabilité mètres','ZdE 2 × Bonus de Sociabilité mètres','Bonus de Sociabilité minutes'],
 ['Armure de Mathlann','Armour of Mathlann',106,10,'Force Mentale mètres','1 bateau ou navire','Force Mentale minutes'],
 ['Appel des mers','Call of the Seas',106,14,'Force Mentale mètres','Spécial','Bonus de Force Mentale Rounds'],
 ['Manteau de Mathlann','Cloak of Mathlann',107,11,'Force Mentale mètres','1 bateau ou navire','Force Mentale minutes'],
 ['Maîtresse des profondeurs','Mistress of the Deep',107,9,'Sociabilité mètres','Spécial','Bonus de Sociabilité Rounds'],
 ['Poumons d’eau','Waterlungs',107,7,'Force Mentale mètres','1','Bonus de Force Mentale heures'],
 ['Brumes grouillantes','Writhing Mists',107,6,'Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale minutes']
];
const HOETH=[
 ['Calame divin','Divine Stylus',110,0,'Vous','Vous','Bonus de Force Mentale minutes'],
 ['Illumination','Enlightenment',110,0,'Bonus de Force Mentale mètres','1 animal','Bonus d’Intelligence minutes'],
 ['Aperçu arcanique','Arcane Insight',110,8,'Toucher','1 objet','Instantané'],
 ['Grand lien spirituel','Greater Spirit Bond',110,4,'Vous','Spécial','Bonus de Force Mentale minutes'],
 ['Creuset de lumière','Crucible of Light',110,6,'Toucher','1 épée','Bonus d’Intelligence minutes'],
 ['Maîtrise mnémonique','Mnemonic Control',110,6,'Bonus de Force Mentale mètres','1','Instantané'],
 ['Envoi psychique','Psychic Sending',111,7,'Force Mentale miles','1','Instantané'],
 ['Façonnage d’âme','Soulcraft',111,10,'Bonus de Force Mentale mètres','1 Fantôme','Instantané'],
 ['Sceaux sacrés','Sacred Wards',111,11,'Toucher','ZdE Bonus d’Intelligence mètres','Bonus d’Intelligence heures'],
 ['Les Mots premiers','The Primary Words',111,15,'Vous','Vous','Bonus d’Intelligence heures']
];
const GROUPS=[['vaul','Magie de Vaul',VAUL],['mathlann','Magie de la mer',MER],['hoeth','Magie de Hoeth',HOETH]];
for(const [domain,type,list] of GROUPS)for(const [fr,en,page,cn,range,target,duration] of list)test(`${type} L08 p. ${page} — ${fr} : paramètres relus, domaine, aucun ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
 assert.equal(c.domain,domain);assert.equal(c.type,type);assert.equal(c.sourceBook,'L08');assert.match(c.edition,/Supplément Elfe/);
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const PATCH={
 'Forteresse de Hotek':{domainFactsExtra:{defence:'flame'}},
 'Sceaux sacrés':{domainFactsExtra:{ward:'purity'}}
};
for(const [,,list] of GROUPS)for(const [fr] of list)test(`Magie elfique — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{burnoutRoll:50,...(PATCH[fr]||{}),targetTests:{foe:{resistanceRoll:95,roll:95,dodgeRoll:95,objectId:'blade',wardRoll:1},mage:{roll:95}}});
});
test('Options de surpuissance propres : coût chiffré, rappel, « Yenlui lumineux requis » partout où le texte le dit',()=>{
 const expected={'Divination des flammes':[['invisible',2],['remote-target',3]],'Divination des pierres':[['ithilmar',3]],'Feux de la perfection':[['another-spell',5]],
  'Sagesse de l’acier du ciel':[['brittle',4],['magic-ithilmar',6]],'Forteresse de Hotek':[['extra-defence',2]],
  'Armure de Mathlann':[['larger',2],['armour-3',4],['missile-cover',6]],'Appel des mers':[['friendly',5],['stays',8]],'Manteau de Mathlann':[['larger',2],['black-arks',8]],
  'Maîtresse des profondeurs':[['immune',5],['move',3]],'Poumons d’eau':[['senses',4],['drawn',4]],'Brumes grouillantes':[['moving',3],['fear',3]],
  'Creuset de lumière':[['quality',3],['mind',5],['permanent',7]],'Maîtrise mnémonique':[['casting',2],['erase',3]],'Envoi psychique':[['image',3],['stranger',4]],
  'Sceaux sacrés':[['weeks',6]],'Les Mots premiers':[['elders',2],['spirits',4]],'Esprits des vagues':[['extra-elemental',3]]};
 for(const [name,options] of Object.entries(expected)){
  const c=getSpellContract(name);assert.deepEqual(c.overcast.specific.map(o=>[o.id,o.cost]),options,name);
  for(const o of c.overcast.specific)assert.equal(o.kind,'reminder');
 }
 assert.match(getSpellContract('Divination des flammes').overcast.specific[0].reminder,/Yenlui lumineux requis/);
 assert.doesNotMatch(getSpellContract('Esprits des vagues').overcast.specific[0].reminder,/Yenlui/);
});
test('Rage de Vaul — Dégâts +6 ignorant l’armure, deux Enflammé, À Terre et Sonné sans Esquive réussie',async()=>{
 const c=getSpellContract('Rage de Vaul');
 const run=async dodge=>{const {store}=await encounter({foe:{hp:100,maxHp:100,armor:{head:5,body:5,arms:5,legs:5}}});
  await cast(store,c,{targetTests:{foe:{dodgeRoll:dodge,resistanceRoll:dodge,roll:98,wardRoll:1}}});return subject(store,'foe');};
 const failed=await run(95),passed=await run(3);
 assert.ok(failed.hp<100);assert.equal(level(failed,'Enflammé'),2);assert.equal(level(failed,'À Terre'),1);assert.equal(level(failed,'Sonné'),1);
 assert.equal(level(passed,'Enflammé'),2);assert.equal(level(passed,'À Terre'),0);assert.equal(level(passed,'Sonné'),0);
 assert.match(c.reminders,/2 × Bonus de Force Mentale mètres/);
});
test('Sacrifices de la mer — états Exténué et Blessures du lanceur payés à l’incantation, annulés avec Undo',async()=>{
 const cases=[['Armure de Mathlann',2,0],['Appel des mers',2,2],['Manteau de Mathlann',2,1],['Maîtresse des profondeurs',1,1],['Poumons d’eau',1,0],['Brumes grouillantes',1,0]];
 for(const [name,fatigue,wounds] of cases){
  const c=getSpellContract(name);const {store}=await encounter({mage:{hp:30,maxHp:40}});const before=store.listParticipants();
  await cast(store,c);
  const mage=subject(store,'mage');assert.equal(level(mage,'Exténué'),fatigue,name+' : Exténué');assert.equal(mage.hp,30-wounds,name+' : Blessures');
  await store.undo();assert.deepEqual(store.listParticipants(),before,name+' : Undo');
 }
 for(const name of ['Lien aux poissons','Sens de la tempête','Furie de l’océan','Esprits des vagues']){
  const {store}=await encounter();await cast(store,getSpellContract(name));assert.equal(level(subject(store,'mage'),'Exténué'),0,name+' : aucun sacrifice');
 }
});
test('Brumes grouillantes — alliés de la zone : Discrétion +2 DR ; ennemis exemptés ; Poumons d’eau — rappel de respiration',async()=>{
 const c=getSpellContract('Brumes grouillantes');
 const ally=await encounter({foe:{camp:'pj'}});await cast(ally.store,c);
 assert.equal(subject(ally.store,'foe').extensions.v5.testModifiers['Discrétion'],2);
 const enemy=await encounter();assert.equal(enemy.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true);
 assert.match(c.reminders,/−2 DR pour toucher/);
 assert.match(getSpellContract('Poumons d’eau').effects.specialState.assistedReminder,/respire sous l’eau/);
});
test('Illumination — +20 Intelligence et Force Mentale ; Sceaux sacrés — un effet au choix, rappel propre',async()=>{
 const c=getSpellContract('Illumination');
 const {store}=await encounter();await cast(store,c);
 const layer=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===c.id);
 assert.deepEqual([layer.statModifiers.Int,layer.statModifiers.FM],[20,20]);assert.match(c.reminders,/Bestial et Craintif/);
 const wards=getSpellContract('Sceaux sacrés');
 for(const [ward,text] of [['forgetfulness',/dernières 24 heures/],['purity',/mutations\) × 6|× 6/],['surveillance',/un Round/],['truthfulness',/mensonge/]]){
  const e=await encounter();await cast(e.store,wards,{domainFactsExtra:{ward}});
  assert.match(JSON.stringify(subject(e.store,'foe').extensions.v5.spellEffects),text,ward);
 }
 const missing=await encounter();
 assert.equal(missing.store.previewSpellExecution(wards.id,inputFor(wards)).ready,false,'effet choisi requis');
});
test('Forteresse de Hotek — défense choisie requise ; rappels de sacrifice (cécité, Recherche) et de Yenlui',async()=>{
 const c=getSpellContract('Forteresse de Hotek');
 const {store}=await encounter();assert.equal(store.previewSpellExecution(c.id,inputFor(c)).ready,false);
 assert.equal(store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{defence:'doors'}})).ready,true);
 assert.match(c.reminders,/cécité/);
 assert.match(getSpellContract('Sceaux sacrés').reminders,/Recherche prolongé Difficile/);
 assert.match(getSpellContract('Les Mots premiers').reminders,/Anoqeyån/);
});
