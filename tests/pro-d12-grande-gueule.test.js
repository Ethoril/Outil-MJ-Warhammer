import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter,subject,level,cast,inputFor,verifySpell} from './helpers/lot3-domain-fixture.js';
import {getSpellContract} from '../js/core/v5-spell-contracts.js';
import {normalizeLoreId,LORE_ATTRIBUTES} from '../js/core/v5-magic-attributes.js';

// [nom FR, nom EN, livre, page, NI, portée, cible, durée] — L01 pp. 32-33 et L12 p. 82
const SOURCE=[
 ['Brise-os','Bonecrusher','L01',32,5,'Force Mentale mètres','1','Instantané'],
 ['Gloutonneur','Bullgorger','L01',32,5,'Bonus de Force Mentale mètres','1','Bonus de Force Mentale Rounds'],
 ['Dévore-cervelle','Braingobbler','L01',32,5,'Vous','Vous','Bonus de Force Mentale Rounds'],
 ['Goût de la mort','Taste Death','L01',33,2,'Vous','Vous','Instantané'],
 ['Tripes de troll','Trollguts','L01',33,6,'Bonus d’Endurance mètres','1','Bonus d’Endurance Rounds'],
 ['La Gueule','The Maw','L01',33,11,'Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Festin des tombés','Feast of the Fallen','L01',33,9,'Vous','Spécial','Bonus de Force Mentale Rounds'],
 ['Brasse-bile','Bilebrew','L12',82,6,'Vous','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Bouillie de sang','Bloodgruel','L12',82,5,'Vous','Vous','Instantané'],
 ['Du cœur au ventre','Get Some Guts','L12',82,6,'Vous','ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale Rounds'],
 ['Brise-dents','Toothcracker','L12',82,8,'Vous','ZdE Force Mentale mètres','Bonus de Force Mentale Rounds']
];
for(const [fr,en,book,page,cn,range,target,duration] of SOURCE)test(`Grande Gueule ${book} p. ${page} — ${fr} : paramètres relus, domaine, aucun ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
 assert.equal(c.domain,'maw');assert.equal(c.type,'Domaine de la Grande Gueule');assert.equal(c.sourceBook,book);
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const FACTS={'Brasse-bile':{hatredTarget:'les Nains'},'Bouillie de sang':{bloodgruelHeal:3}};
for(const [fr] of SOURCE)test(`Grande Gueule — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{domainFactsExtra:FACTS[fr]||{},targetTests:{foe:{resistanceRoll:95,roll:95,dodgeRoll:95,objectId:'blade'},mage:{roll:95}}});
});
test('Attribut de la Grande Gueule — d10 de l’offrande : 10 ou ≥ NI soigne NI Blessures au lanceur ; jet exigé',async()=>{
 assert.equal(normalizeLoreId('great-maw'),'maw');assert.equal(LORE_ATTRIBUTES.maw.name,'Domaine de la Grande Gueule');
 const c=getSpellContract('Brise-os');
 const {store}=await encounter({mage:{hp:10}});
 const missing=store.previewSpellExecution(c.id,inputFor(c,{attributeActive:true}));
 assert.equal(missing.ready,false);assert.equal(missing.status,'dice-required');assert.match(missing.error,/offrande/);
 for(const [roll,gain] of [[4,0],[5,5],[9,5],[10,5]]){
  const e=await encounter({mage:{hp:10}});
  await cast(e.store,c,{attributeActive:true,targetTests:{foe:{roll:98,wardRoll:1},mage:{mawRoll:roll}}});
  assert.equal(subject(e.store,'mage').hp,10+gain,'d10 '+roll);
 }
 const low=getSpellContract('Goût de la mort');
 const t=await encounter({mage:{hp:10}});
 await cast(t.store,low,{attributeActive:true,targetTests:{mage:{mawRoll:2}}});
 assert.equal(subject(t.store,'mage').hp,12,'NI 2, d10 2 : soigne 2');
});
test('Brise-os — projectile +4 qui ignore les Points d’Armure, +20 sur la table de Critiques en rappel',async()=>{
 const c=getSpellContract('Brise-os');
 assert.equal(c.effects.missile.damage,4);assert.equal(c.effects.missile.ignoreAp,true);assert.match(c.reminders,/\+20 au jet/);
 const lost=async armor=>{const {store}=await encounter({foe:{hp:200,maxHp:200,armor}});await cast(store,c,{targetTests:{foe:{roll:98,wardRoll:1}}});return 200-subject(store,'foe').hp;};
 assert.equal(await lost({head:5,body:5,arms:5,legs:5}),await lost({head:0,body:0,arms:0,legs:0}));
});
test('Gloutonneur — +20 Force, refus par Calme −2 DR, Exténué à la fin sans repas',async()=>{
 const c=getSpellContract('Gloutonneur');
 const {store}=await encounter();await cast(store,c);
 assert.equal(subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===c.id).statModifiers.F,20);
 assert.equal(c.effects.secondaryTest.modifierSl,-2);assert.equal(c.effects.expiryEffect.conditions[0],'Exténué');
 const refuse=await encounter();
 await cast(refuse.store,c,{targetTests:{foe:{rejectsGift:true,resistanceRoll:5,roll:5}}});
 assert.ok(!(subject(refuse.store,'foe').extensions.v5.spellEffects||[]).some(e=>e.spellId===c.id),'refus réussi');
 const fail=await encounter();
 await cast(fail.store,c,{targetTests:{foe:{rejectsGift:true,resistanceRoll:95,roll:95}}});
 assert.ok(subject(fail.store,'foe').extensions.v5.spellEffects.some(e=>e.spellId===c.id),'refus raté');
});
test('Dévore-cervelle, Tripes de troll, Goût de la mort — Traits et rappels',async()=>{
 assert.deepEqual(getSpellContract('Dévore-cervelle').effects.traits,['Peur (2)']);
 assert.match(getSpellContract('Dévore-cervelle').reminders,/−2 DR/);
 const troll=getSpellContract('Tripes de troll');assert.deepEqual(troll.effects.traits,['Régénération']);assert.match(troll.reminders,/Accessible \(\+2 DR\)/);
 assert.equal(getSpellContract('Goût de la mort').treatment,'narrative');
});
test('La Gueule — Esquive +0 : réussie, dégâts 8 moins DR ; ratée, dégâts 10 et trois Enchevêtré',async()=>{
 const c=getSpellContract('La Gueule');
 const run=async dodge=>{const {store}=await encounter({foe:{hp:200,maxHp:200,armor:{head:0,body:0,arms:0,legs:0}}});
  await cast(store,c,{targetTests:{foe:{dodgeRoll:dodge,resistanceRoll:dodge,roll:98,wardRoll:1}}});return subject(store,'foe');};
 const failed=await run(95);assert.equal(level(failed,'Enchevêtré'),3);assert.ok(failed.hp<200);
 const okay=await run(5);assert.equal(level(okay,'Enchevêtré'),0);assert.ok(okay.hp<200);
 assert.ok(200-okay.hp<=200-failed.hp,'moins de dégâts sur Esquive réussie');
 assert.match(c.reminders,/Blessure Critique/);assert.match(c.reminders,/Force 60/);
});
test('Festin des tombés — Vampirisme, résistance volontaire Endurance −2 DR, fin : Calme +0 ou Sonné si blessure au corps à corps',async()=>{
 const c=getSpellContract('Festin des tombés');
 assert.deepEqual(c.effects.traits,['Vampirique']);assert.equal(c.effects.secondaryTest.modifierSl,-2);
 assert.equal(c.effects.expiryEffect.failConditions[0],'Sonné');assert.equal(c.effects.expiryEffect.test.modifierSl,0);
 assert.match(c.reminders,/−3 DR/);
});
test('Sorts de L12 — Ogres amis seulement (fait « Ogre allié »), jamais sans le fait',async()=>{
 for(const fr of ['Brasse-bile','Du cœur au ventre','Brise-dents']){
  const c=getSpellContract(fr);const facts=FACTS[fr]||{};
  const stranger=await encounter({foe:{camp:'pj'}});
  assert.equal(stranger.store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:facts})).targetResults?.[0]?.resisted,true,fr+' : sans le fait, exclu');
  const ogre=await encounter({foe:{camp:'pj'}});
  const p=ogre.store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:facts,targetTests:{foe:{ogre:true,roll:98}}}));
  assert.equal(p.ready,true,p.error);assert.notEqual(p.targetResults?.[0]?.resisted,true,fr);
 }
 assert.deepEqual(getSpellContract('Brise-dents').effects.testModifiers,{Endurance:2,Calme:2});assert.equal(getSpellContract('Brise-dents').effects.apModifiers.all,1);
 assert.deepEqual(getSpellContract('Brasse-bile').effects.traits,['Haine']);
});
test('Bouillie de sang — soigne la valeur saisie (1 + DR du Test), 0 = Test raté, Flux sanglant en rappel',async()=>{
 const c=getSpellContract('Bouillie de sang');
 const {store}=await encounter({mage:{hp:10}});await cast(store,c,{domainFactsExtra:{bloodgruelHeal:6}});
 assert.equal(subject(store,'mage').hp,16);
 const failed=await encounter({mage:{hp:10}});await cast(failed.store,c,{domainFactsExtra:{bloodgruelHeal:0}});
 assert.equal(subject(failed.store,'mage').hp,10);assert.match(c.reminders,/Flux sanglant/);
});
