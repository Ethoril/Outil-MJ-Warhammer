import test from 'node:test';
import assert from 'node:assert/strict';
import {encounter,subject,level,cast,inputFor,verifySpell} from './helpers/lot3-domain-fixture.js';
import {getSpellContract,getAllSpellContracts} from '../js/core/v5-spell-contracts.js';

// L07 pp. 128-129 : [nom FR, nom EN, page, NI, portée, cible, durée]
const SOURCE=[
 ['Déracinement des montagnes','Uproot the Mountains',128,8,'Ligne de vue','1','1 Round'],
 ['Ligne de terre','Earth Line',129,10,'Ligne de vue','Spécial','Instantané'],
 ['Ruine des cités','Ruination of Cities',129,12,'Ligne de vue','1 bâtiment','Instantané'],
 ['Déflagration mentale','Mental Blast',129,7,'Ligne de vue','ZdE Bonus de Force Mentale mètres','Instantané']
];
for(const [fr,en,page,cn,range,target,duration] of SOURCE)test(`Lustria L07 p. ${page} — ${fr} : paramètres relus, Haute Magie, aucun ingrédient`,()=>{
 const c=getSpellContract(fr);assert.ok(c,fr);assert.equal(getSpellContract(en).id,c.id);
 assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
 assert.equal(c.domain,'high');assert.equal(c.type,'Haute Magie');assert.equal(c.sourceBook,'L07');
 assert.ok(!(c.effects.facts||[]).some(f=>/ingr/i.test(f.key+f.label)));
});
const PATCH={
 'Ligne de terre':{domainFactsExtra:{nexusNear:true}},
 'Ruine des cités':{domainFactsExtra:{structure:'unfortified'}},
 'Déflagration mentale':{burnoutRoll:50}
};
for(const [fr] of SOURCE)test(`Lustria — ${fr} : Store, persistance, Undo, expiration, surpuissance, faits requis`,async()=>{
 await verifySpell(getSpellContract(fr),{...(PATCH[fr]||{}),targetTests:{foe:{resistanceRoll:95,roll:95,dodgeRoll:95,objectId:'blade'},mage:{roll:95}}});
});
test('Déracinement des montagnes — Athlétisme −3 DR : raté = À Terre, réussi = rien ; avalanche +5 DR en rappel',async()=>{
 const c=getSpellContract('Déracinement des montagnes');
 for(const [roll,fallen] of [[95,1],[3,0]]){
  const {store}=await encounter();await cast(store,c,{targetTests:{foe:{resistanceRoll:roll,roll}}});
  assert.equal(level(subject(store,'foe'),'À Terre'),fallen,'jet '+roll);
 }
 assert.equal(c.overcast.specific.find(o=>o.id==='avalanche').cost,5);assert.match(c.reminders,/10 dégâts/);
});
test('Ligne de terre — 15 dégâts au corps sur Endurance −2 DR ratée, Points d’Armure ignorés ; nexus exigé',async()=>{
 const c=getSpellContract('Ligne de terre');
 const run=async(roll,armor)=>{const {store}=await encounter({foe:{hp:100,maxHp:100,armor}});
  await cast(store,c,{domainFactsExtra:{nexusNear:true},targetTests:{foe:{resistanceRoll:roll,roll:98}}});return 100-subject(store,'foe').hp;};
 const bare=await run(95,{head:0,body:0,arms:0,legs:0});assert.ok(bare>0);
 assert.equal(await run(95,{head:6,body:6,arms:6,legs:6}),bare,'PA ignorés');assert.equal(await run(3,{head:0,body:0,arms:0,legs:0}),0,'Endurance réussie');
 const {store}=await encounter();
 assert.equal(store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{nexusNear:false}})).ready,false);
 assert.deepEqual(c.overcast.specific.map(o=>[o.id,o.cost]),[['bridge',4],['path',6]]);
});
test('Ruine des cités — 20 au corps sur Esquive −2 DR ratée ; structure fortifiée exige +6 DR de surpuissance',async()=>{
 const c=getSpellContract('Ruine des cités');
 const run=async roll=>{const {store}=await encounter({foe:{hp:100,maxHp:100,armor:{head:0,body:0,arms:0,legs:0}}});
  await cast(store,c,{domainFactsExtra:{structure:'unfortified'},targetTests:{foe:{dodgeRoll:roll,resistanceRoll:roll,roll:98}}});return 100-subject(store,'foe').hp;};
 assert.ok(await run(95)>0);assert.equal(await run(3),0);
 const {store}=await encounter();
 const refused=store.previewSpellExecution(c.id,inputFor(c,{domainFactsExtra:{structure:'fortified'}}));
 assert.equal(refused.ready,false,'fortifiée sans surpuissance refusée');
 const ok=store.previewSpellExecution(c.id,{...inputFor(c,{sl:50,burnoutRoll:50,domainFactsExtra:{structure:'fortified'}}),overcastSpecific:{fortified:1}});
 assert.equal(ok.ready,true,ok.error);
});
test('Déflagration mentale — BInt + 6 (+6 Démoniaque/Mort-vivant), PA ignorés, Sonné sur Intelligence +2 DR ratée, ennemis seulement',async()=>{
 const c=getSpellContract('Déflagration mentale');
 const lost=async(traits,roll=95)=>{const {store}=await encounter({foe:{hp:200,maxHp:200,traits,armor:{head:4,body:4,arms:4,legs:4}}});
  await cast(store,c,{targetTests:{foe:{resistanceRoll:roll,roll:98}}});return subject(store,'foe');};
 const plain=await lost([]),undead=await lost(['Mort-vivant']);
 assert.ok(200-plain.hp>0);assert.equal((200-undead.hp)-(200-plain.hp),6,'+6 contre les Morts-vivants');
 assert.equal(level(plain,'Sonné'),1);
 assert.equal(level(await lost([],3),'Sonné'),0);
 const friend=await encounter({foe:{camp:'pj'}});
 assert.equal(friend.store.previewSpellExecution(c.id,inputFor(c)).targetResults?.[0]?.resisted,true,'allié exempté');
 assert.deepEqual(c.overcast.specific.map(o=>[o.id,o.cost]),[['itza',6],['leveller',9]]);
});
const VARIANTS=[
 ['Apothéose (Slann)','Apothéose','slann-fear',2],
 ['Destruction des Arcanes (Slann)','Destruction des Arcanes','slann-unforge',5],
 ['Drain de Magie (Slann)','Drain de Magie','slann-drain',4],
 ['Chemin entre les Mondes (Slann)','Chemin entre les Mondes','slann-nexus',4]
];
for(const [name,baseName,id,cost] of VARIANTS)test(`Extension Slann — ${name} : contrat distinct, base elfique inchangée, option propre`,async()=>{
 const v=getSpellContract(name),base=getSpellContract(baseName);
 assert.ok(v&&base&&v.id!==base.id);assert.equal(v.variantOf,baseName);assert.equal(v.isTradition,true);assert.equal(base.isTradition,undefined);
 assert.deepEqual([v.cn,v.range,v.target,v.duration],[base.cn,base.range,base.target,base.duration]);
 assert.deepEqual(v.effects,base.effects);
 const own=v.overcast.specific.find(o=>o.id===id);assert.equal(own.cost,cost);
 assert.deepEqual(v.overcast.specific.filter(o=>o.id!==id),base.overcast.specific||[],'options de la base reprises sans changement');
 assert.ok(!(base.overcast.specific||[]).some(o=>o.id===id),'la base ne reçoit pas l’option');
 assert.match(v.reminders,/Slann/);
});
test('Extensions Slann — lancement, Undo et surpuissance propre (rappel chiffré)',async()=>{
 const c=getSpellContract('Apothéose (Slann)');
 const {store}=await encounter({foe:{hp:5,maxHp:40}});const before=store.listParticipants();
 const input={...inputFor(c,{sl:50}),overcastSpecific:{'slann-fear':1}};
 const p=store.previewSpellExecution(c.id,input);assert.equal(p.ready,true,p.error);
 const receipt=p.overcastSpecific.find(e=>e.id==='slann-fear');assert.equal(receipt.spent,2);assert.ok(receipt.reminder||receipt.applied);
 await store.applySpellExecution(c.id,input);await store.undo();assert.deepEqual(store.listParticipants(),before);
});
test('Contrats elfiques d’audit inchangés par les extensions : aucun doublon de nom, 277 contrats d’audit',()=>{
 assert.equal(getAllSpellContracts().filter(c=>!c.isTradition).length,277);
 const names=getAllSpellContracts().map(c=>c.name);assert.equal(new Set(names).size,names.length);
});
