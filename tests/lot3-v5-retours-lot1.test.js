import test from 'node:test';
import assert from 'node:assert/strict';
import {getSpellContract} from '../js/core/v5-spell-contracts.js';
import {encounter,cast,subject,level,inputFor,endTurn} from './helpers/lot3-domain-fixture.js';

const reserve=n=>({v5:{hasMomentum:true,channelling:{type:'winds',sl:n}}});
test('Retours lot 1 — décision 12 octobre : +DR lit Test + réserve avant surpuissance',async()=>{
 const {store}=await encounter({mage:{extensions:reserve(8)},foe:{hp:1,talents:[{id:'talent-arcane-magic',name:'Magie des Arcanes',specialization:'Feu',rank:1,status:'resolved'}]}});
 const p=await cast(store,getSpellContract('Cautérisation'),{sl:3});
 assert.equal(p.castingPreview.totalCastingSl,11);assert.equal(subject(store,'foe').hp,13,'1 B + 11 DR');
 const other=await encounter({mage:{extensions:reserve(8)}});await cast(other.store,getSpellContract('Purification'),{sl:3});
 assert.equal(level(subject(other.store,'foe'),'Enflammé'),11);
});
test('Retours lot 1 — V5 p. 247 : Caresse une cible maximum et aperçu Bmax identique au reçu',async()=>{
 const {store}=await encounter(),c=getSpellContract('Caresse de Laniph');
 assert.equal(store.previewSpellExecution(c.id,inputFor(c,{targetIds:['foe','mage']})).ready,false);
 const p=await cast(store,c);assert.equal(p.targetResults[0].damage.targetNewMaxHp,subject(store,'foe').maxHp);
});
test('Retours lot 1 — V5 pp. 246/248/249/250/251/253 : paramètres exacts et surpuissance',()=>{
 for(const [name,field,pattern] of [['Maudit','range',/Initiative/],['Eau de la terre','range',/Force Mentale/],['Lumière aveuglante','range',/^Vous$/],['Arme enchantée','range',/^1 (mètre|yard)/],['Vol du Destin','target',/ZdE.*Bonus de Force Mentale/],['Épée Enflammée de Rhuin','target',/épée/],['Grands Feux d’U’Zhul','target',/maximum/],['Fléau des Démons','target',/Démon/]])assert.match(getSpellContract(name)[field],pattern,name);
 assert.ok(getSpellContract('Eau de la terre').overcast.options.includes('range'));
 assert.ok(getSpellContract('Arme enchantée').overcast.options.includes('range'));
 assert.ok(!getSpellContract('Lumière aveuglante').overcast.options.includes('range'));
});
test('Retours lot 1 — V5 pp. 248/253 : objet inexistant refusé sur chaque cible',async()=>{
 const {store}=await encounter();
 for(const name of ['Épée Enflammée de Rhuin','Arme enchantée','Creuset de Chamon']){
  const c=getSpellContract(name);const input=inputFor(c,{domainFacts:{...inputFor(c).domainFacts,objectId:'absent'},targetTests:{foe:{objectId:'absent'}}});
  assert.equal(store.previewSpellExecution(c.id,input).ready,false,name);
 }
});
test('Retours lot 1 — V5 p. 255, D-12 : Destrier unique, reste au début du Round d’échéance',async()=>{
 const {store,engine}=await encounter();const c=getSpellContract('Destrier d’Ombre');
 assert.equal(store.previewSpellExecution(c.id,inputFor(c,{targetIds:['foe','mage']})).ready,false);
 await cast(store,c,{domainFacts:{...inputFor(c).domainFacts,minutesToDawn:1}});
 const horse=store.listParticipants().find(p=>p.extensions.v5.summonCastExecutionId),until=horse.extensions.v5.summonedUntilRound;
 for(let turns=0;store.getCombat().round<until && turns<30;turns++)await endTurn(engine);
 assert.ok(store.listParticipants().some(p=>p.id===horse.id),'la couche existe encore au début du Round final');
 for(let turns=0;store.listParticipants().some(p=>p.id===horse.id)&&turns<6;turns++)await endTurn(engine);
 assert.ok(!store.listParticipants().some(p=>p.id===horse.id));
 await store.undo();assert.ok(store.listParticipants().some(p=>p.id===horse.id));
});
test('Retours lot 1 — V5 p. 246 : Lance préserve les PA magiques même avec saisie naturelle trop haute',async()=>{
 const {store}=await encounter({foe:{armor:{head:3,body:3,arms:3,legs:3}}});await store.applySpellEffects('foe',{apModifiers:{all:2},durationRounds:10});
 const c=getSpellContract('Lance d’Ambre');const p=await cast(store,c,{domainFacts:{...inputFor(c).domainFacts,naturalArmorAp:99}});
 assert.equal(p.targetResults[0].missile.ap,2,'au plus les 3 PA de base sont ignorés');
});
test('Retours lot 1 — V5 p. 251 : Bannissement affiche Instable une seule fois',async()=>{
 const {store}=await encounter({foe:{traits:['Mort-vivant']}});await cast(store,getSpellContract('Bannissement'));
 assert.equal(subject(store,'foe').traits.filter(t=>t==='Instable').length,1);
});
test('Retours lot 1 — V5 p. 251 : Clarté ignore Sonné, conserve Exténué et pénalité de Critique',async()=>{
 const {store}=await encounter({foe:{states:[{name:'Sonné',level:2},{name:'Exténué',level:2}]}});await cast(store,getSpellContract('Clarté d’esprit'));
 const p=store.previewCasting(getSpellContract('Lumière guérisseuse'),{actorId:'foe',roll:25,slModifiers:[{id:'head-critical',amount:-1}]});
 assert.equal(p.testSl,4);
});
test('Retours lot 1 — V5 p. 255 : attaque appliquée termine automatiquement l’invisibilité, Undo la restaure',async()=>{
 const {store,engine}=await encounter();await cast(store,getSpellContract('Linceul d’Invisibilité'));await endTurn(engine);
 const before=store.listParticipants();
 const p=store.previewResolution({actorId:'foe',targetId:'mage',action:{id:'blade',type:'attack',attr:'CC',base:50,damage:3,qualities:[]},roll:25,defense:{base:50,roll:95,v5:{kind:'melee',choice:'keep'}},v5:{kind:'melee',choice:'keep',actorSize:3,targetSize:3}});
 assert.deepEqual(p.unresolved,[]);assert.equal((await store.applyResolution(p)).status,'applied');
 assert.ok(!subject(store,'foe').extensions.v5.spellEffects.some(e=>e.specialState?.invisible));
 await store.undo();assert.deepEqual(store.listParticipants(),before);
 const dart={actorId:'foe',targetIds:['mage'],roll:25,attributeActive:false,locationRoll:34};assert.equal(store.previewSpellExecution('Dart',dart).ready,true);
 await store.applySpellExecution('Dart',dart);assert.ok(!subject(store,'foe').extensions.v5.spellEffects.some(e=>e.specialState?.invisible));await store.undo();assert.deepEqual(store.listParticipants(),before);
});
test('Retours lot 1 — V5 pp. 184/248 : Cœurs propose Frénésie par allié, réussite, échec et dé absent',async()=>{
 const {store}=await encounter({foe:{camp:'pj'}}),c=getSpellContract('Cœurs Enflammés');
 const input=inputFor(c,{targetIds:['mage','foe'],targetTests:{mage:{takeFrenzy:true,frenzyRoll:25},foe:{takeFrenzy:true,frenzyRoll:95}}});
 const missing=structuredClone(input);delete missing.targetTests.mage.frenzyRoll;assert.equal(store.previewSpellExecution(c.id,missing).ready,false);
 const before=store.listParticipants();assert.equal((await store.applySpellExecution(c.id,input)).success,true);
 assert.ok(subject(store,'mage').states.some(s=>s.key==='frenzy'));assert.ok(!subject(store,'foe').states.some(s=>s.key==='frenzy'));
 await store.undo();assert.deepEqual(store.listParticipants(),before);
});
