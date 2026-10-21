import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter,subject,level,endTurn,verifySpell,inputFor,cast} from './helpers/lot3-domain-fixture.js';
import {getSpellContract,getAllSpellContracts} from '../js/core/v5-spell-contracts.js';
import {magicSkillModifiers} from '../js/core/v5-magic-talents.js';

const NAMES=['Bonne Volonté','Joie de Halãtha','Chevaucher l’Obscurité','Nepenthés','Panacée','Séparer les branches','Charme protecteur','Œil du berger'];
// L06 pp. 255-256 : [nom, page, NI, portée, cible, durée]
const SOURCE=[
 ['Bonne Volonté',255,0,'Vous','ZdE Bonus de Sociabilité mètres','Bonus de Force Mentale minutes'],
 ['Joie de Halãtha',255,0,'Toucher','1','Bonus de Sociabilité heures'],
 ['Chevaucher l’Obscurité',256,0,'Vous','Vous','Bonus de Force Mentale minutes'],
 ['Nepenthés',256,0,'Toucher','Spécial','Bonus de Force Mentale heures'],
 ['Panacée',256,0,'Toucher','Spécial','Bonus de Dextérité heures'],
 ['Séparer les branches',256,0,'Vous','Vous','Initiative minutes'],
 ['Charme protecteur',256,0,'Toucher','Spécial','Bonus de Force Mentale jours'],
 ['Œil du berger',256,0,'Spécial','Spécial','Instantané']
];
for(const [name,page,cn,range,target,duration] of SOURCE)test(`Magie naturelle L06 p. ${page} — ${name} : paramètres relus, domaine, aucun ingrédient`,()=>{
 const c=getSpellContract(name);assert.ok(c,name);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
 assert.equal(c.domain,'hedgecraft');assert.equal(c.type,'Domaine de la Magie naturelle');assert.equal(c.isTradition,true);
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)),'aucun ingrédient exigé');
});
test('Magie naturelle — noms canoniques anglais résolus',()=>{
 for(const [fr,en] of [['Bonne Volonté','Goodwill'],['Chevaucher l’Obscurité','Mirkride'],['Panacée','Nostrum'],['Charme protecteur','Protective Charm'],['Œil du berger','Shepherd’s Eye']])assert.equal(getSpellContract(en)?.name,fr);
});
for(const name of NAMES)test(`Magie naturelle — ${name} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(name));
});
test('Bonne Volonté — +1 DR à tout Test de Sociabilité dans la zone, aucun autre Test ; Animosité et Haine rappelées sans effet',async()=>{
 const {store}=await encounter();const c=getSpellContract('Bonne Volonté');
 await cast(store,c,{targetIds:['mage','foe']});
 for(const id of ['mage','foe']){const p=subject(store,id);
  assert.equal(p.extensions.v5.testModifiers['carac:soc'],1);
  assert.deepEqual(magicSkillModifiers(p,'Charme',{carac:'soc'}).map(m=>m.amount),[1]);
  assert.deepEqual(magicSkillModifiers(p,'Athlétisme',{carac:'ag'}),[],'les autres Tests ne bougent pas');
  assert.deepEqual(magicSkillModifiers(p,'Charme',{}),[],'sans caractéristique connue, rien d’inventé');
}
 assert.match(c.reminders,/Animosité et Haine/);});
test('Test de Sociabilité résolu : le +1 DR de Bonne Volonté entre dans la résolution',async()=>{
 const {store}=await encounter();await cast(store,getSpellContract('Bonne Volonté'),{targetIds:['foe']});
 const action={type:'skill',attr:'Soc',label:'Charme',base:50};
 const p=store.previewResolution({actorId:'foe',action,roll:45,v5:{kind:'test',choice:'keep'}});
 assert.deepEqual(p.test.details.modifiers.map(m=>[m.id,m.amount]),[['spell-skill:carac:soc',1]]);
 assert.equal(p.test.sl,2);
 const q=store.previewResolution({actorId:'mage',action,roll:45,v5:{kind:'test',choice:'keep'}});
 assert.deepEqual(q.test.details.modifiers,[]);
 const other=store.previewResolution({actorId:'foe',action:{type:'skill',attr:'Ag',label:'Esquive',base:50},roll:45,v5:{kind:'test',choice:'keep'}});
 assert.deepEqual(other.test.details.modifiers,[]);
});
test('Charme protecteur — +2 DR contre les effets magiques et la Corruption, durée BFM jours',async()=>{
 const {store}=await encounter();const c=getSpellContract('Charme protecteur');
 const p=await cast(store,c,{targetIds:['mage']});
 const mage=subject(store,'mage');
 assert.equal(c.effects.receiptFormulas.resistanceMagieEtCorruptionDR,2);assert.match(c.reminders,/\+2 DR/);
 const layer=mage.extensions.v5.spellEffects.find(e=>e.spellId===c.id);
 assert.equal(layer.durationRounds,6*8640,'BFM = 6 jours de 8 640 Rounds');
});
test('Chevaucher l’Obscurité — trait Éthéré, ni incantation ni parole, fin sur dégâts magiques en rappel',async()=>{
 const {store}=await encounter();const c=getSpellContract('Chevaucher l’Obscurité');
 await cast(store,c);const mage=subject(store,'mage');
 assert.ok(mage.traits.includes('Éthéré'));
 assert.equal(mage.extensions.v5.specialStates.cannotCast,true);assert.equal(mage.extensions.v5.specialStates.cannotSpeak,true);
 assert.match(c.reminders,/dégât magique/i);assert.match(c.reminders,/errera|erre/i);
});
test('Panacée — soigne le Bonus de Dextérité de la cible, rappel des maladies (+1 par +2 DR)',async()=>{
 const {store}=await encounter({mage:{caracs:{CC:50,CT:50,F:40,E:40,I:50,Ag:50,Dex:70,Int:60,FM:60,Soc:50,M:4}},foe:{hp:10,maxHp:40}});
 const c=getSpellContract('Panacée');
 await cast(store,c,{targetIds:['foe'],domainFacts:{}});
 assert.equal(subject(store,'foe').hp,17);
 assert.match(c.reminders,/maladie/i);
});
test('Magie naturelle — jamais d’ingrédient : lancement sans rien déclarer',async()=>{
 const {store}=await encounter();
 for(const name of NAMES){const c=getSpellContract(name);const p=store.previewSpellExecution(c.id,inputFor(c,{targetIds:/^vous$/i.test(c.target)?['mage']:['foe']}));assert.equal(p.ready,true,name+' : '+p.error);}
});
test('Magie naturelle — l’attribut du Domaine (ingrédients) n’impose aucun blocage et reste un rappel',()=>{
 for(const name of NAMES)assert.ok(getSpellContract(name).reminders,name+' : texte joint');
 assert.equal(getAllSpellContracts().filter(c=>c.domain==='hedgecraft').length>=8,true);
});
