import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, execute, spellInput, contractFor, sourceCases, verifyElven, verifyElvenOptions, sourceCases as elvenCases, fixture as elvenFixture, execute as elvenExecute, sourceCases as elfCases, fixture as elfFixture } from '../../helpers/lot3-elven-fixture.js';
import { subject, level, endTurn, encounter } from '../../helpers/lot3-domain-fixture.js';
import { normalizeLoreId } from '../../../js/core/v5-magic-attributes.js';
import { attackNature, previewMagicProtection } from '../../../js/core/v5-magic-combat.js';
import { getAllSpellContracts, getSpellContract, resolveAuxiliarySummons, previewSpellExecution } from '../../../js/core/v5-spell-contracts.js';
import * as lot3WomFixtureNs from '../../helpers/lot3-wom-fixture.js';
import { createStore } from '../../../js/core/store.js';
import fs from 'node:fs';
import * as lot3CatalogueFixtureNs from '../../helpers/lot3-catalogue-fixture.js';
import { sourceCases as arcaneCases, execute as arcaneExecute } from '../../helpers/lot3-arcane-fixture.js';
import * as lot5bCatalogueFixtureNs from '../../helpers/lot5b-catalogue-fixture.js';

describe('contrats de Magie Elfique', () => {
for(const row of sourceCases.slice(16))test('Elfiques — '+row[0]+' — HEPG p. '+row[1]+' — source, Store, persistance, Undo, vrais Tours',()=>verifyElven(row));

for(const row of sourceCases.slice(16))test('HEPG p. '+row[1]+' — '+row[0]+' : chaque option payée et Tests secondaires réussis/ratés/manquants',()=>verifyElvenOptions(row));
for(const row of sourceCases.slice(16,24))test('HEPG pp. 81–82 / brief Lot 3 — '+row[0]+' : HEPG p. 81 : premier Vent par défaut, second choisi',async()=>{
 const c=contractFor(row[0]),{store}=await fixture(row),input=spellInput(row,store,{attributeActive:true});
 const p=store.previewSpellExecution(c.id,input);assert.equal(p.ready,true,p.error);assert.equal(p.lorePreview.lore,normalizeLoreId(c.wind[0]));
 const chosen=store.previewSpellExecution(c.id,{...input,chosenLore:normalizeLoreId(c.wind[1])});assert.equal(chosen.ready,true,chosen.error);assert.equal(chosen.lorePreview.lore,normalizeLoreId(c.wind[1]));
});
test('HEPG p. 81 — Bannissement mineur : victoire, égalité et échec opposés, ni dégâts ni destruction',async()=>{
 const row=sourceCases.find(r=>r[0].startsWith('Bannissement Mineur'));
 for(const die of [25,1]){const {store}=await fixture(row);await execute(store,row,{targetTests:{foe:{opponentRoll:die}}});assert.equal(subject(store,'foe').zone,'active');assert.equal(subject(store,'foe').hp,200);}
 const {store}=await fixture(row);const input=spellInput(row,store);delete input.targetTests.foe.opponentRoll;assert.equal(store.previewSpellExecution(contractFor(row[0]).id,input).ready,false);
});
test('HEPG p. 82 — Purification : une affection nominative, réussite/échec/maladresse, États préservés',async()=>{
 const row=sourceCases.find(r=>r[0].startsWith('Purification'));
 for(const [die,purged,transferred] of [[25,true,false],[95,false,false],[99,false,true]]){const {store}=await fixture(row,{foe:{states:[{name:'Empoisonné',level:2},{name:'Sonné',level:1}]}});const p=await execute(store,row,{enduranceRoll:die});assert.deepEqual(p.targetResults[0].afflictionReceipt,{kind:'poison',name:'Poison déclaré',purged,transferred});assert.equal(level(subject(store,'foe'),'Empoisonné'),2);assert.equal(level(subject(store,'foe'),'Sonné'),1);}
});
test('HEPG p. 80 — Calme : ne supprime ni Haine, ni Terreur, ni Brisé ; échec conserve Peur',async()=>{
 const row=sourceCases.find(r=>r[0]==='Calme');for(const die of [25,95]){const {store}=await fixture(row,{foe:{states:['Peur','Haine','Terreur','Brisé']}});await execute(store,row,{fellowshipRoll:die});const f=subject(store,'foe');assert.equal(level(f,'Peur'),die===25?0:1);for(const name of ['Haine','Terreur','Brisé'])assert.equal(level(f,name),1,name);}
});
test('HEPG p. 81 — Révéler : mage ordinaire sans couche ne brille pas, couche active ou nature magique oui',async()=>{
 const row=sourceCases.find(r=>r[0]==='Révéler la Magie');for(const active of [false,true]){const {store}=await fixture(row);if(active)await store.applySpellEffects('foe',{durationRounds:4,apModifiers:{all:1}});const p=await execute(store,row,{targetTests:{foe:{magicNature:false}}});assert.equal(p.targetResults[0].temporaryEffect.specialState.visibleMagic,active);}
});
test('HEPG p. 82 — Masque : Intuition adverse −3 et incantation de lecture/divination déclarée −3',async()=>{
 const row=sourceCases.find(r=>r[0].startsWith("Masque")),{store}=await fixture(row);await execute(store,row);const c=contractFor('Calme'),input={actorId:'foe',targetIds:['mage'],roll:25,fellowshipRoll:25,attributeActive:false};
 const base=store.previewSpellExecution(c.id,{...input,targetTests:{mage:{readingMagic:false}}});const read=store.previewSpellExecution(c.id,{...input,targetTests:{mage:{readingMagic:true}}});assert.equal(base.ready,true,base.error);assert.equal(read.ready,true,read.error);assert.equal(base.castingPreview.test.sl-read.castingPreview.test.sl,3);
});
test('HEPG p. 82 — Confort : Nuée Minuscule/Petite bloquée, Taille normale permise ; réduction feu/froid seule',async()=>{
 const row=sourceCases.find(r=>r[0].startsWith('Zone de Confort')),{store}=await fixture(row,{foe:{traits:['Nuée'],extensions:{traits:['Nuée']}}});await execute(store,row);
 for(const size of [1,2,3]){const p=store.previewResolution({actorId:'foe',targetId:'mage',action:{type:'attack',attr:'CC',base:50,damage:3},roll:25,v5:{kind:'melee',choice:'keep',actorSize:size,targetSize:3}});assert.equal(p.unresolved.some(t=>/Nuée Minuscule/.test(t)),size<=2);}
 for(const [fire,cold,amount] of [[true,false,5],[false,true,5],[false,false,6]])assert.equal(previewMagicProtection(subject(store,'mage'),6,{nature:attackNature({spell:true,declared:{fire,cold}})}).amount,amount);
});
});

describe('contrats de Haute Magie', () => {
const rowFor=name=>sourceCases.find(r=>r[0]===name);
for(const row of sourceCases.slice(0,16))test('Haute Magie — '+row[0]+' — HEPG p. '+row[1]+' — source, Store, persistance, Undo, vrais Tours',()=>verifyElven(row));
test('HEPG p. 87 — Fortune : seuls les doubles magiques en base ; +4 échec ordinaire, +6 incident Majeur',async()=>{
 const row=rowFor('La Fortune est Capricieuse');for(const selection of [{},{actions:1},{major:1}]){const {store}=await fixture(row);await execute(store,row,{overcastSpecific:selection});
  const ordinary=store.previewResolution({actorId:'foe',action:{type:'skill',attr:'CC',base:90},roll:11,v5:{kind:'test',choice:'keep'}});assert.equal(ordinary.test.success,!selection.actions);
  const magic=store.previewCasting(contractFor('Apothéose'),{actorId:'foe',roll:11,miscastRoll:10});assert.equal(magic.test.fumble,true);assert.equal(magic.test.critical,false);assert.equal(magic.miscast.table,selection.major?'MAJOR':'MINOR');
 }
});
test('HEPG p. 89 — Saphery et Extinction : portée chiffrée et doubles portée/zone, dégâts +11',async()=>{
 let row=rowFor('Bouclier de Saphery'),{store}=await fixture(row),p=await execute(store,row,{overcastSpecific:{range:1}});assert.equal(p.targetResults[0].quantifiedReminder.portee,30);
 row=rowFor("Extinction de l'Âme");({store}=await fixture(row));p=await execute(store,row,{overcastSpecific:{fury:1}});assert.equal(p.targetResults[0].missile.rawDamage,17);assert.equal(p.overcast.rangeMultiplier,2);assert.equal(p.overcast.aoeMultiplier,2);
});
test('HEPG p. 88 — Œil : option sens ajoute les trois sens à l’auxiliaire, portée Intelligence miles',async()=>{
 const row=rowFor('Œil Invisible'),{store}=await fixture(row),p=await execute(store,row,{overcastSpecific:{senses:1,range:1}});const eye=store.listParticipants().find(p=>p.extensions?.v5?.eyeOwner);for(const sense of ['Sens de la magie','Seconde vue','Vision dans le noir'])assert.ok(eye.traits.includes(sense));assert.equal(p.targetResults[0].quantifiedReminder.rangeMiles,60);
});
test('HEPG pp. 86–89 — cibles multiples et Protections : Convocation + Enflammé reste, Main même 3d10, Bmax intact',async()=>{
 let row=rowFor('Convocation Ardente'),{store}=await fixture(row);await store.applySpellEffects('foe',{ward:7,durationRounds:8,casterId:'mage'});const p=await execute(store,row,{targetTests:{foe:{wardRoll:10}}});assert.equal(subject(store,'foe').hp,200);assert.equal(level(subject(store,'foe'),'Enflammé'),1);assert.equal(p.targetResults[0].woundsLost,0);
 row=rowFor('Main de Gloire');({store}=await fixture(row));const s=JSON.parse(store.getFullJSON());const a={...structuredClone(subject(store,'mage')),id:'ally',name:'Allié',initiative:10};s.combat.participants.push(a);delete s.activeScene;await store.loadFromJSON(s);await execute(store,row,{targetIds:['mage','ally']});for(const id of ['mage','ally']){assert.equal(subject(store,id).caracs.CC,65);assert.equal(subject(store,id).maxHp,50);}
});
test('Haute Magie — HEPG p. 87 : Convocation, frappe au Round suivant malgré sortie, escalade +1, dé manquant et immersion',async()=>{
 const row=rowFor('Convocation Ardente'),{store,engine}=await fixture(row);await execute(store,row,{overcastSpecific:{escalation:1}});const e=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===contractFor(row[0]).id);
 const before=subject(store,'foe').hp;await endTurn(engine);const missing=engine.previewNextTurn();assert.equal(missing.ready,false);assert.ok(missing.requests.some(r=>r.field.includes('location')));
 await endTurn(engine,{inputs:{foe:{['spell:'+e.id+':location']:34}}});assert.ok(before-subject(store,'foe').hp>=6,'+6 au deuxième Round (BFM 6 − BE4 − PA2), feu distinct');
 assert.equal(store.getLog().find(l=>l.detail?.spellId===e.spellId&&l.detail.phase==='startOfRound').detail.woundsLost,6,'frappe exacte : (BFM 6 + 6) − BE4 − PA2');
 const participants=store.listParticipants();await store.applySpellInteraction({effectId:e.id,targetId:'foe',kind:'immersion'});assert.ok(!subject(store,'foe').extensions.v5.spellEffects.some(x=>x.id===e.id));await store.undo();assert.deepEqual(store.listParticipants(),participants);
});
test('Haute Magie — HEPG p. 88 : Bannissement majeur, +8/+15 par Taille, Instable double avant absorption, vivants exclus',async()=>{
 const row=rowFor('Bannissement Majeur');for(const [size,unstable,raw] of [[3,false,14],[4,false,21],[3,true,28]]){
  const {store,engine}=await fixture(row,{foe:{traits:unstable?['Mort-vivant','Instable']:['Mort-vivant'],extensions:{traits:unstable?['Mort-vivant','Instable']:['Mort-vivant']}}});await execute(store,row);const e=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===contractFor(row[0]).id);await endTurn(engine);await endTurn(engine,{inputs:{foe:{['spell:'+e.id+':present']:true,['spell:'+e.id+':size']:size,['spell:'+e.id+':location']:34}}});assert.equal(subject(store,'foe').hp,200-(raw-6));
 }
});
test('Haute Magie — HEPG p. 87 : Impasse suspend une couche, conserve les Blessures et restaure les valeurs aux vrais Tours',async()=>{
 const row=rowFor('Impasse'),{store,engine}=await fixture(row);const old=subject(store,'foe').extensions.v5.spellEffects[0];const p=await execute(store,row,{overcastChoices:{},domainFacts:{deadlockMode:'effect'},targetTests:{foe:{suppressedEffectId:old.id}}});assert.equal(subject(store,'foe').armor.body,2);
 await store.expireSpellEffects('foe',{effectId:subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===contractFor(row[0]).id).id});assert.equal(subject(store,'foe').armor.body,3);assert.equal(subject(store,'foe').hp,200);
 await store.undo();assert.equal(subject(store,'foe').armor.body,2);await endTurn(engine);
});
test('HEPG p. 87 — Impasse : un sort réellement connu, alias de fiche, autres sorts utilisables, inconnu refusé',async()=>{
 const row=rowFor('Impasse'),calm=contractFor('Calme'),{store}=await fixture(row,{foe:{spells:[{id:'sheet-local-calm',name:'Calme'}]}}),input=spellInput(row,store,{domainFacts:{deadlockMode:'spell',spellKnown:true},targetTests:{foe:{suppressedSpellId:calm.id}}});
 assert.equal(store.previewSpellExecution(contractFor('Impasse').id,{...input,targetTests:{foe:{suppressedSpellId:contractFor('Apothéose').id}}}).ready,false);
 await store.applySpellExecution(contractFor('Impasse').id,input);const blocked=store.previewSpellExecution(calm.id,{actorId:'foe',targetIds:['mage'],roll:25,fellowshipRoll:25,attributeActive:false});assert.equal(blocked.ready,false);assert.match(blocked.error,/Impasse/);
 assert.equal(store.previewSpellExecution('Carreau',{actorId:'foe',targetIds:['mage'],roll:25,attributeActive:false,locationRoll:34}).ready,true,'aucun blocage général du lanceur');await store.undo();assert.equal(store.previewSpellExecution(calm.id,{actorId:'foe',targetIds:['mage'],roll:25,fellowshipRoll:25,attributeActive:false}).ready,true);
});
test('Haute Magie — HEPG p. 88 : Œil, Perception Langue Magick, Vol120, retour Surpris et disparition liée à la couche',async()=>{
 const row=rowFor('Œil Invisible'),{store}=await fixture(row);await execute(store,row);const eye=store.listParticipants().find(p=>p.extensions?.v5?.eyeOwner);assert.equal(eye.hp,3);assert.equal(eye.maxHp,3);assert.equal(eye.skills.find(s=>s.name==='Perception').total,90);assert.ok(eye.traits.includes('Vol (120)'));
 const e=subject(store,'mage').extensions.v5.spellEffects.find(e=>e.spellId===contractFor(row[0]).id);await store.applySpellInteraction({effectId:e.id,targetId:'mage',kind:'eye-refocus'});assert.equal(store.listParticipants().length,2);assert.equal(level(subject(store,'mage'),'Surpris'),1);await store.undo();assert.equal(store.listParticipants().length,3);
});
test('Haute Magie — HEPG p. 89 : Tempête chaque Round, Athlétisme +2 (vol +1), pénalités seulement sur échec et fin de couche',async()=>{
 const row=rowFor('Tempête'),{store,engine}=await fixture(row);await execute(store,row);const e=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===contractFor(row[0]).id);await endTurn(engine);await endTurn(engine,{inputs:{mage:{['spell:'+e.castExecutionId+':vortex:direction']:4,['spell:'+e.castExecutionId+':vortex:distance']:10},foe:{['spell:'+e.id+':present']:true,['spell:'+e.id+':flying']:false,['spell:'+e.id+':athletics']:95,['spell:'+e.id+':location']:34}}});assert.equal(subject(store,'foe').hp,196);assert.equal(subject(store,'foe').caracs.CC,30);assert.equal(subject(store,'foe').caracs.CT,30);await endTurn(engine);assert.equal(subject(store,'foe').caracs.CC,50);
 const second=await fixture(row);await second.store.applySpellEffects('foe',{durationRounds:8,damageReduction:1,damageReductionFilter:{any:['fire','cold']}});await execute(second.store,row);const f=subject(second.store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===contractFor(row[0]).id);await endTurn(second.engine);const inputs={mage:{['spell:'+f.castExecutionId+':vortex:direction']:4,['spell:'+f.castExecutionId+':vortex:distance']:10},foe:{['spell:'+f.id+':present']:true,['spell:'+f.id+':flying']:false,['spell:'+f.id+':athletics']:25,['spell:'+f.id+':location']:34}};
 const missing=second.engine.previewNextTurn({inputs});assert.equal(missing.ready,false);assert.ok(missing.requests.some(r=>r.field.endsWith('nature:cold')&&r.kind==='boolean'));assert.ok(!missing.requests.some(r=>r.field.endsWith('ward0')),'aucun d10 de Protection inventé');
 inputs.foe['spell:'+f.id+':nature:cold']=true;assert.equal(second.engine.previewNextTurn({inputs}).state.combat.participants.find(p=>p.id==='foe').hp,197,'froid : réduction 1');inputs.foe['spell:'+f.id+':nature:cold']=false;await second.engine.nextTurn({inputs});assert.equal(subject(second.store,'foe').hp,196,'nature déclarée normale : frappe réellement appliquée, jamais omise');
});
test('Haute Magie — HEPG p. 88 : Glamour Navigation −3, Commandement +2 après trois échecs déclarés, pas de compteur',async()=>{
 const row=rowFor('Glamour de Teclis'),{store}=await fixture(row);await execute(store,row);const e=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===contractFor(row[0]).id),input={effectId:e.id,targetId:'foe',kind:'control',controlValue:'direction',roll:25,declaredFailures:3};assert.equal(store.previewSpellInteraction({...input,declaredFailures:2}).ready,false);const p=store.previewSpellInteraction(input);assert.equal(p.ready,true,p.error);assert.equal(p.test.sl,5);
 const {store:hours}=await fixture(row);await execute(hours,row,{overcastSpecific:{hours:1}});const h=subject(hours,'foe').extensions.v5.spellEffects.find(e=>e.spellId===contractFor(row[0]).id);const prolonged=hours.previewSpellInteraction({effectId:h.id,targetId:'foe',kind:'control',controlValue:'duration',declaredFailures:3});assert.equal(prolonged.ready,true,prolonged.error);assert.equal(prolonged.test,null,'HEPG p. 88 : prolongation sans Test de Commandement');await hours.applySpellInteraction({effectId:h.id,targetId:'foe',kind:'control',controlValue:'duration',declaredFailures:3});assert.equal(subject(hours,'foe').extensions.v5.spellEffects.find(e=>e.id===h.id).expiresAtRound,2161);
});
test('HEPG p. 89 — Tempête +5 : bâtiment/machine projectile +15, sans Athlétisme, mouvement partagé explicite',async()=>{
 const row=rowFor('Tempête'),{store,engine}=await fixture(row);await execute(store,row,{overcastSpecific:{machines:1}});const e=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===contractFor(row[0]).id);await endTurn(engine);
 const input={inputs:{mage:{['spell:'+e.castExecutionId+':vortex:direction']:4,['spell:'+e.castExecutionId+':vortex:distance']:10},foe:{['spell:'+e.id+':present']:true,['spell:'+e.id+':machine']:true,['spell:'+e.id+':location']:34}}};
 const p=engine.previewNextTurn(input);assert.equal(p.ready,true,JSON.stringify(p.requests));await engine.nextTurn(input);assert.equal(subject(store,'foe').hp,185);assert.equal(subject(store,'foe').caracs.CC,50);assert.ok(store.getLog().some(l=>l.detail?.direction==='E'&&l.detail.metres===10));
});

for(const row of sourceCases.slice(0,16))test('HEPG p. '+row[1]+' — '+row[0]+' : chaque option payée et Tests secondaires réussis/ratés/manquants',()=>verifyElvenOptions(row));
});

describe('contrats des Vents de Magie', () => {
const { sourceCases, fixture, input, execute } = lot3WomFixtureNs;
const cFor=name=>getAllSpellContracts().find(c=>c.name===name);

for(const [name,page,cn,range,target,duration] of sourceCases)test(`WoM p. ${page} — ${name} : paramètres relus`,()=>{
 const c=cFor(name); assert.deepEqual([c.page,c.cn,c.range,c.target,c.duration],[page,cn,range,target,duration]);
});
test('WoM p. 134 — Sang Bouillonnant : résistance, deux Aveuglé, pas de dégâts au lancer, début du Tour cible',async()=>{
 for(const die of [25,95]){const {store,engine}=await fixture();const p=await execute(store,'Sang Bouillonnant',{targetTests:{foe:{roll:die}}});assert.equal(subject(store,'foe').hp,200);assert.equal(level(subject(store,'foe'),'Aveuglé'),die===95?2:0);await endTurn(engine);assert.equal(subject(store,'foe').hp,die===95?152:200);}
});
test('WoM p. 146 — Éveil : dégâts inconditionnels, Esquive +2 évite seulement les deux états, F30',async()=>{
 for(const die of [25,95]){const {store}=await fixture();const p=await execute(store,'Éveil du Bois',{targetTests:{foe:{roll:die}}});assert.equal(subject(store,'foe').hp,196);assert.equal(level(subject(store,'foe'),'Enchevêtré'),die===95?1:0);assert.equal(level(subject(store,'foe'),'Hémorragique'),die===95?1:0);assert.equal(subject(store,'foe').extensions.v5.testModifiers?.Esquive||0,0);if(die===95)assert.equal(p.targetResults[0].temporaryEffect.specialState.entangledStrength,30);}
});
test('WoM p. 89 — Escalier : +3 PA et hauteur FM, plafond 200 via +2 DR',async()=>{
 const {store}=await fixture();const p=await execute(store,'Escalier en Spirale');assert.equal(subject(store,'mage').armor.body,3);assert.equal(p.targetResults[0].quantifiedReminder.height,60);
});
test('WoM p. 124 — Iyrtu : F +10 par DR final, aucune base +10 supplémentaire',async()=>{
 const {store}=await fixture();await execute(store,'L’Étreinte d’Iyrtu');assert.equal(subject(store,'mage').caracs.F,460);
});
test('WoM p. 111 — Cor : allié +2, ennemi −2, neutre aucun, Peur ennemie sans retrait Brisé',async()=>{
 const {store}=await fixture({foe:{states:[{id:'broken',name:'Brisé',level:2}]}});let state=JSON.parse(store.getFullJSON());state.combat.participants.push({...structuredClone(subject(store,'foe')),id:'neutral',camp:'neutre',states:[]});delete state.activeScene;await store.loadFromJSON(state);await execute(store,'Cor du Andar',{targetIds:['mage','foe','neutral']});assert.equal(subject(store,'mage').extensions.v5.testModifiers.Calme,2);assert.equal(subject(store,'foe').extensions.v5.testModifiers.Calme,-2);assert.equal(subject(store,'neutral').extensions.v5.testModifiers?.Calme||0,0);assert.equal(level(subject(store,'foe'),'Brisé'),2);assert.ok(!subject(store,'mage').traits.includes('Peur (1)'));
});
test('WoM p. 149 — Ver : entrave F50 initiale, aucune corrosion avant victoire de lutte',async()=>{
 const {store}=await fixture();await execute(store,'Ver Grouillant');assert.equal(subject(store,'foe').armor.body,2);assert.equal(level(subject(store,'foe'),'Enchevêtré'),1);assert.equal(subject(store,'foe').hp,200);
});
test('HEPG p. 81 — retour Lot 3 : premier Vent par défaut, deuxième Vent autorisé',async()=>{
 const {store}=await fixture();const name='Voix de Fer (Aqshy & Chamon)';const p=store.previewSpellExecution(cFor(name).id,input(name,{chosenLore:'metal'}));assert.equal(p.ready,true,p.error);
});

for(const row of sourceCases)test(`WoM p. ${row[1]} — ${row[0]} : Store, variante sourcée, persistance, Undo et expiration réelle`,async()=>{
 const name=row[0],extra=name==='Apothéose Verdoyante'?{foe:{hp:0,extensions:{v5:{dead:true,criticalWounds:[{id:'old',name:'Critique ancien'}]}}}}:name==='Le Bœuf Reste Debout'?{mage:{states:[{id:'broken',name:'Brisé',level:3}]}}:{};
 const {store,engine,persistence}=await fixture(extra),before=store.listParticipants();
 const patch=name==='Apothéose Verdoyante'?{targetTests:{foe:{deathDelaySec:30}}}:['Lunes du Chasseur','Le Bœuf Reste Debout'].includes(name)?{targetIds:['mage']} : name==='Cor du Andar'?{targetIds:['mage','foe']}:{};
 // Brisé V5 p.185 : le MJ atteste ici la cachette; les attentes du sort restent inchangées.
 if(name==='Le Bœuf Reste Debout')patch.brokenEscapeFacts={visibleToAnyEnemy:false};
 const p=await execute(store,name,patch),mage=subject(store,'mage'),foe=subject(store,'foe');
 switch(name){
 case 'Epées Sanguines':{const a=store.listParticipants().filter(p=>p.extensions?.isAuxiliary);assert.equal(a.length,1);assert.equal(a[0].extensions.ws,60);assert.equal(a[0].extensions.damage,8);break;}
 case 'Blizzard enflammé de Ygethmor':assert.equal(foe.hp,200);break;
 case 'Transe d’Ambre':assert.equal(previewMagicProtection(foe,30,{nature:attackNature({magical:true})}).amount,0);break;
 case 'Éveil du Bois':assert.equal(foe.hp,196);break;
 case 'Malédiction d’Anraheir':assert.equal(foe.caracs.M,2);assert.equal(foe.caracs.CC,30);break;
 case 'Yeux de la Meute':assert.match(JSON.stringify(p),/corps|Perspective|vision/i);break;
 case "Suivi de l'Odeur":assert.equal(mage.extensions.v5.testModifiers['Seconde vue (Odorat)'],2);assert.equal(mage.extensions.v5.testModifiers.Pistage,undefined);break;
 case 'Lunes du Chasseur':assert.equal(mage.caracs.E,50);assert.equal(mage.caracs.M,5);break;
 case 'Le Bœuf Reste Debout':assert.equal(level(mage,'Brisé'),0);assert.equal(mage.extensions.v5.specialStates.fearTerrorImmunity,true);break;
 case 'Ver Grouillant':assert.equal(foe.armor.body,2);break;
 case 'Escalier en Spirale':assert.equal(mage.armor.body,3);break;
 case 'Transmogrification Exaltée de Colchis':assert.equal(previewMagicProtection(foe,30,{nature:attackNature({fire:true})}).amount,0);break;
 case 'Apothéose Verdoyante':assert.equal(foe.hp,42);assert.equal(foe.extensions.v5.criticalWounds.length,1);break;
 case 'L’Étreinte d’Iyrtu':assert.equal(mage.caracs.F,460);break;
 case 'Les Enfants Sauvages de Zandox':assert.equal(store.listParticipants().filter(p=>p.extensions?.isAuxiliary).length,2);break;
 case 'Cor du Andar':assert.equal(foe.extensions.v5.testModifiers.Calme,-2);break;
 case 'Visage mutable':assert.equal(foe.caracs.Soc,60);break;
 }
 const applied=store.listParticipants(),reload=createStore({persistence});await reload.ready;assert.deepEqual(reload.listParticipants(),applied);await store.undo();assert.deepEqual(store.listParticipants(),before);await execute(store,name,patch);
 const layer=store.listParticipants().flatMap(p=>p.extensions.v5.spellEffects||[]).find(e=>e.spellId===cFor(name).id);
 if(layer?.expiresAtRound){const state=JSON.parse(store.getFullJSON());state.combat.round=layer.expiresAtRound;state.combat.currentActorId='mage';delete state.activeScene;await store.loadFromJSON(state);await endTurn(engine);assert.ok(!store.listParticipants().some(p=>(p.extensions.v5.spellEffects||[]).some(e=>e.spellId===cFor(name).id)));assert.equal(store.listParticipants().filter(p=>p.extensions?.isAuxiliary).length,0);await store.undo();assert.ok(store.listParticipants().some(p=>(p.extensions.v5.spellEffects||[]).some(e=>e.spellId===cFor(name).id)));}
});
test('WoM p. 137 — Épées : options payées, six maximum, pas d’attaque avant Round suivant, une cible unique et défense normale',async()=>{
 const {store,engine}=await fixture();await execute(store,'Epées Sanguines',{overcastSpecific:{swords:5}});assert.equal(store.listParticipants().filter(p=>p.extensions?.isAuxiliary).length,6);const effect=subject(store,'mage').extensions.v5.spellEffects[0];const answer={effectId:effect.id,targetId:'foe',kind:'summon-attack',roll:25,opponentRoll:95,locationRoll:34,lineOfSight:true,distance:10,actionConfirmed:true};assert.equal(store.previewSpellInteraction(answer).ready,false);await endTurn(engine);await endTurn(engine);const before=subject(store,'foe').hp;const p=store.previewSpellInteraction(answer);assert.equal(p.ready,true,p.error);await store.applySpellInteraction(answer);assert.equal(before-subject(store,'foe').hp,2);assert.equal(store.previewSpellInteraction(answer).ready,false);await store.undo();assert.equal(store.previewSpellInteraction(answer).ready,true);
});
test('WoM p. 149 — Ver : deux d100, échec libère, victoire entrave ou cuir déclaré, métal intact',async()=>{
 for(const choice of ['entangle','leather']){const {store}=await fixture();await execute(store,'Ver Grouillant');const e=subject(store,'foe').extensions.v5.spellEffects[0],i={effectId:e.id,targetId:'foe',kind:'worm',roll:25,opponentRoll:95,controlValue:choice,targetTests:{foe:{leatherLocations:['body']}}};assert.equal(store.previewSpellInteraction({...i,roll:undefined}).ready,false);await store.applySpellInteraction(i);assert.equal(level(subject(store,'foe'),'Enchevêtré'),choice==='entangle'?2:1);assert.equal(subject(store,'foe').armor.body,choice==='leather'?1:2);assert.equal(subject(store,'foe').armor.head,2);await store.undo();assert.equal(subject(store,'foe').armor.body,2);}
});
test('WoM p. 147 — Anraheir : sortie et rentrée, restauration de couche, alliés et neutres exempts',async()=>{
 const {store}=await fixture();await execute(store,'Malédiction d’Anraheir');const e=subject(store,'foe').extensions.v5.spellEffects[0];await store.applySpellInteraction({effectId:e.id,targetId:'foe',kind:'zone',controlValue:'outside'});assert.equal(subject(store,'foe').caracs.M,3);assert.equal(subject(store,'foe').caracs.CC,40);await store.undo();assert.equal(subject(store,'foe').caracs.CC,30);
 const ally=await fixture({foe:{camp:'pj'}});await execute(ally.store,'Malédiction d’Anraheir');assert.equal(subject(ally.store,'foe').caracs.CC,50);
});
test('WoM p. 146 — Transe : premier coup réel sans dégâts retire la couche, attaque suivante blesse',async()=>{
 const {store}=await fixture();await execute(store,'Transe d’Ambre');const a={actorId:'mage',targetId:'foe',action:subject(store,'mage').actions[0],roll:25,defense:{base:50,roll:95,v5:{choice:'keep'}},v5:{kind:'melee',choice:'keep'}};let p=store.previewResolution(a);assert.equal(p.damage.finalDamage,0);await store.applyResolution(p);assert.ok(!subject(store,'foe').extensions.v5.spellEffects.length);p=store.previewResolution(a);assert.ok(p.damage.finalDamage>0);
});
test('WoM p. 137 — Blizzard : chaque Round, couverture, Athlétisme réussi/raté et Protection annule seulement les dégâts',async()=>{
 for(const die of [25,95]){const {store,engine}=await fixture();await store.applySpellEffects('foe',{ward:7,durationRounds:99,casterId:'mage'});await execute(store,'Blizzard enflammé de Ygethmor');const e=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===cFor('Blizzard enflammé de Ygethmor').id);await endTurn(engine);const answers={foe:{['spell:'+e.id+':present']:true,['spell:'+e.id+':cover']:false,['spell:'+e.id+':roundTest']:die,['spell:'+e.id+':location']:34,['spell:'+e.id+':ward0']:10}};await endTurn(engine,{inputs:answers});assert.equal(subject(store,'foe').hp,200);assert.equal(level(subject(store,'foe'),'À Terre'),die===95?1:0);}
});

for(const [name,page,cn,raw,lost,conditions] of [['Tempête Magmatique',136,13,18,12,2],['Orage de Thorsen',101,11,14,8,0],['Cendres et Poussière',122,9,8,4,0]])test(`WoM p. ${page}, pp. 20–21 — ${name} : un seul dégât source, BE/PA, Protection et vrai Tour auteur`,async()=>{
 for(const ward of [false,true]){const {store,engine}=await fixture();if(ward)await store.applySpellEffects('foe',{ward:7,durationRounds:99,casterId:'mage'});const p=await execute(store,name,{willpowerSuccess:true,direction:'E',distanceRoll:10,domainFacts:{},targetTests:{foe:{throwDirection:4,collision:false,wardRoll:10,inside:true}}});assert.equal(subject(store,'foe').hp,ward?200:200-lost);assert.equal(level(subject(store,'foe'),'Enflammé'),conditions);assert.equal(level(subject(store,'foe'),'Exténué'),0);const controller=subject(store,'mage').extensions.v5.spellEffects.find(e=>e.spellId===cFor(name).id);assert.ok(controller?.roundEffect?.vortex);const state=JSON.parse(store.getFullJSON());state.combat.round=2;state.combat.currentActorId='mage';delete state.activeScene;await store.loadFromJSON(state);const pending=engine.previewNextTurn();assert.equal(pending.ready,false);const key='spell:'+controller.id+':vortex:';await endTurn(engine,{inputs:{mage:{[key+'Direction']:1}}});assert.ok(!subject(store,'mage').extensions.v5.spellEffects.some(e=>e.id===controller.id));assert.equal(subject(store,'foe').hp,ward?200:200-lost);}
});
test('WoM pp. 136–137 — Magma : 3 mini-vortex sélectionnés, seulement distance ≤8, dégâts +4 et un Enflammé, dés bloquants',async()=>{
 const {store}=await fixture();const patch={willpowerSuccess:true,direction:'E',distanceRoll:8,overcastSpecific:{mini:3},domainFacts:{mini1Direction:4,mini1Distance:10,mini1Targets:['foe'],mini2Direction:1,mini3Direction:5,mini3Targets:[]},targetTests:{foe:{wardRoll:1,locationRoll:34}}};const missing=store.previewSpellExecution(cFor('Tempête Magmatique').id,input('Tempête Magmatique',{...patch,domainFacts:{}}));assert.equal(missing.ready,false);const p=await execute(store,'Tempête Magmatique',patch);assert.equal(subject(store,'foe').hp,184);assert.equal(level(subject(store,'foe'),'Enflammé'),3);assert.equal(p.vortexMovement.mini.length,3);
});
test('WoM pp. 100–101 — Thorsen : collision distincte 7, projection BFM, À Terre et dé manquant',async()=>{
 const {store}=await fixture();const patch={willpowerSuccess:true,direction:'E',distanceRoll:10,targetTests:{foe:{throwDirection:4,collision:true,locationRoll:34}}};const missing=store.previewSpellExecution(cFor('Orage de Thorsen').id,input('Orage de Thorsen',{...patch,targetTests:{foe:{collision:true}}}));assert.equal(missing.ready,false);await execute(store,'Orage de Thorsen',patch);assert.equal(subject(store,'foe').hp,191);assert.equal(level(subject(store,'foe'),'À Terre'),1);
});
test('WoM p. 122 — Cendres +4 : soleil touché, Calme réussi/raté, pas Exténué inventé, suffocation uniquement dedans',async()=>{
 for(const die of [25,95]){const {store}=await fixture();await execute(store,'Cendres et Poussière',{willpowerSuccess:true,direction:'E',distanceRoll:10,overcastSpecific:{sun:1},targetTests:{foe:{sunTouched:true,calmRoll:die,inside:true}}});assert.equal(subject(store,'foe').hp,die===95?0:196);assert.equal(level(subject(store,'foe'),'Exténué'),0);}
});

test('WoM p. 134 — Corps de Feu : aucun bonus F/E ni immunité au feu, trois clauses chiffrées',async()=>{
 const {store}=await fixture();const p=await execute(store,'Corps de Feu');assert.equal(subject(store,'mage').caracs.F,40);assert.equal(subject(store,'mage').caracs.E,40);assert.equal(previewMagicProtection(subject(store,'mage'),10,{nature:attackNature({fire:true})}).amount,10);const e=subject(store,'mage').extensions.v5.spellEffects[0];for(const [choice,expected] of [['grab',44],['grapple',44],['blood',5]]){const before=subject(store,'foe').hp;const input={effectId:e.id,targetId:'foe',kind:'body-fire',controlValue:choice,roll:95,locationRoll:34,meleeWoundConfirmed:true};const p=store.previewSpellInteraction(input);assert.equal(p.ready,true,p.error);await store.applySpellInteraction(input);assert.equal(before-subject(store,'foe').hp,expected);if(choice==='grapple')assert.equal(level(subject(store,'foe'),'Enflammé'),1);await store.undo();}
});
test('WoM p. 134 — Sang : mort confirmée due aux dégâts, explosion +1 à 2 m, destinataires et Protection explicites, Undo atomique',async()=>{
 const {store,engine}=await fixture({foe:{hp:5}});await execute(store,'Sang Bouillonnant');await endTurn(engine);const e=subject(store,'foe').extensions.v5.spellEffects[0],input={effectId:e.id,targetId:'foe',kind:'death-burst',deathConfirmed:true,targetsDeclared:true,targetIds:['mage'],targetTests:{mage:{distance:2,locationRoll:34}}};assert.equal(store.previewSpellInteraction({...input,deathConfirmed:undefined}).ready,false);const before=subject(store,'mage').hp;await store.applySpellInteraction(input);assert.equal(before-subject(store,'mage').hp,3);assert.equal(store.previewSpellInteraction(input).ready,false);await store.undo();assert.equal(subject(store,'mage').hp,before);
});
test('WoM p. 112 — Visage : FM opposée réelle, quatre modes, échec/réussite et dés manquants',async()=>{
 for(const [mode,expected] of [['attractive',60],['ugly',40],['dead',50],['unknown',50]]){const {store}=await fixture();await execute(store,'Visage mutable',{domainFacts:{mode,opposedActorRoll:25},targetTests:{foe:{unwilling:true,opponentRoll:95}}});assert.equal(subject(store,'foe').caracs.Soc,expected);if(mode==='dead')assert.equal(subject(store,'foe').caracs.M,0);if(mode==='unknown')assert.equal(subject(store,'foe').extensions.v5.specialStates.unrecognisable,true);}
 const {store}=await fixture();const input1=input('Visage mutable',{domainFacts:{mode:'attractive',opposedActorRoll:95},targetTests:{foe:{unwilling:true,opponentRoll:25}}});await store.applySpellExecution(cFor('Visage mutable').id,input1);assert.equal(subject(store,'foe').caracs.Soc,50);assert.equal(store.previewSpellExecution(cFor('Visage mutable').id,{...input1,domainFacts:{mode:'attractive'}}).ready,false);
});
test('WoM p. 147 — Anraheir : monture Calme +0, fuite seulement sur échec, Chevaucher pour calmer',async()=>{
 for(const die of [25,95]){const {store}=await fixture();await execute(store,'Malédiction d’Anraheir',{targetTests:{foe:{mount:true,roll:die}}});assert.equal(subject(store,'foe').extensions.v5.specialStates.mountFleeing,die===95);if(die===95){const e=subject(store,'foe').extensions.v5.spellEffects[0];await store.applySpellInteraction({effectId:e.id,targetId:'mage',kind:'calm-mount',roll:25});assert.equal(subject(store,'foe').extensions.v5.specialStates.mountFleeing,false);}}
});

test('WoM p. 146 — Transe : poison suspendu, soins admis et hibernation consentante au terme déclaré',async()=>{
 const {store,engine}=await fixture({foe:{states:[{name:'Empoisonné',level:1}]}});await execute(store,'Transe d’Ambre');await endTurn(engine);await endTurn(engine);assert.equal(subject(store,'foe').hp,200);assert.equal(level(subject(store,'foe'),'Empoisonné'),1);
 const other=await fixture();await execute(other.store,'Transe d’Ambre',{domainFacts:{durationMode:'hibernation',daysUntilSeason:30},targetTests:{foe:{unwilling:false}}});const e=subject(other.store,'foe').extensions.v5.spellEffects[0];assert.equal(e.expiresAtRound,259201);
});
test('WoM p. 149 — Bœuf : Test de Peur/Terreur ultérieur neutralisé, puis restauré après fin réelle de la couche',async()=>{
 for(const psychologyKind of ['fear','terror']){const {store,engine}=await fixture();await execute(store,'Le Bœuf Reste Debout',{targetIds:['mage']});const p=store.previewResolution({actorId:'mage',action:{type:'skill',attr:'FM',base:60},roll:95,v5:{kind:'test',choice:'keep',context:{psychologyKind}}});assert.equal(p.success,true);assert.ok(p.reminders.some(t=>/immunit|Peur|Terreur/i.test(t)));}
});
test('WoM p. 149 — Ver : cuir dissous reste endommagé après libération, autres PA intactes et Undo de la lutte',async()=>{
 const {store}=await fixture();await execute(store,'Ver Grouillant');const e=subject(store,'foe').extensions.v5.spellEffects[0];await store.applySpellInteraction({effectId:e.id,targetId:'foe',kind:'worm',roll:25,opponentRoll:95,controlValue:'leather',targetTests:{foe:{leatherLocations:['body']}}});await store.applySpellInteraction({effectId:e.id,targetId:'foe',kind:'end'});assert.equal(subject(store,'foe').armor.body,1);assert.equal(level(subject(store,'foe'),'Enchevêtré'),0);
});
for(const row of sourceCases)test(`WoM p. ${row[1]} — ${row[0]} : catégories de surpuissance payées, application et Undo`,async()=>{
 const c=cFor(row[0]);for(const kind of c.overcast.options.filter(k=>k!=='special')){const {store}=await fixture(row[0]==='Apothéose Verdoyante'?{foe:{hp:0,extensions:{v5:{dead:true}}}}:{});const self=c.target==='Vous'||['Lunes du Chasseur','Le Bœuf Reste Debout'].includes(c.name),patch={targetIds:[self?'mage':'foe'],sl:50,overcastChoices:{[kind]:kind==='targets'?1:kind==='aoe'?3:2},domainFacts:{mode:'attractive',durationMode:'normal',opposedActorRoll:25},targetTests:{foe:{unwilling:false,mount:false,roll:95,opponentRoll:95,deathDelaySec:30},mage:{unwilling:false,mount:false,roll:95}}};const before=store.listParticipants(),p=await execute(store,row[0],patch);assert.equal(p.overcast.choices[kind],patch.overcastChoices[kind]);if(['range','duration','aoe'].includes(kind))assert.equal(p.overcast[kind+'Multiplier'],2);await store.undo();assert.deepEqual(store.listParticipants(),before);}
});

test('WoM p. 98 — Lames Azurées : aucun fait de Protection implicite aux trois coups du Tour adverse',async()=>{
 const {store,engine}=await fixture();await store.applySpellEffects('foe',{durationRounds:99,casterId:'mage',damageReduction:100,damageReductionFilter:{any:['cold']}});await execute(store,'Lames Azurées',{targetIds:['mage'],secondaryTargets:{engaged:['foe']}});const e=subject(store,'mage').extensions.v5.spellEffects.find(e=>e.spellId===cFor('Lames Azurées').id),inputs={foe:{}};for(let i=1;i<=3;i++)inputs.foe['recurringHit:'+e.id+':'+i]=34;const missing=engine.previewNextTurn({inputs});assert.equal(missing.ready,false);assert.ok(missing.requests.some(r=>r.kind==='boolean'));
 for(let i=1;i<=3;i++)inputs.foe['recurringNature:'+e.id+':'+i+':cold']=true;const before=subject(store,'foe').hp;await engine.nextTurn({inputs});assert.equal(subject(store,'foe').hp,before);
});

test('V5 magie / WoM p. 136 — vortex : surpuissance dégâts, Critique et fin d’invisibilité gardent la chaîne normale',async()=>{
 const {store}=await fixture();await store.applySpellEffects('mage',{spellId:'invisibility-proof',durationRounds:99,casterId:'mage',specialState:{endsOnAttackOrNoise:true}});const p=await execute(store,'Tempête Magmatique',{roll:11,criticalChoice:'critical-wound',miscastRoll:70,willpowerSuccess:true,direction:'E',distanceRoll:10,overcastChoices:{damage:2}});const r=p.targetResults.find(r=>r.targetId==='foe');assert.ok(r.criticalWoundTriggered);assert.equal(subject(store,'foe').extensions.v5.criticalWounds.length,1);assert.ok(!subject(store,'mage').extensions.v5.spellEffects.some(e=>e.spellId==='invisibility-proof'));assert.equal(subject(store,'foe').hp,186);
 const i=input('Tempête Magmatique',{sl:30,willpowerSuccess:true,direction:'E',distance:-1});assert.equal(store.previewSpellExecution(cFor('Tempête Magmatique').id,i).ready,false);
});

test('WoM pp. 134/137 — deux cibles : résistances indépendantes et Protection indépendante au vrai Round de Blizzard',async()=>{
 const make=async()=>{const {store,engine}=await fixture();const s=JSON.parse(store.getFullJSON()),other=structuredClone(subject(store,'foe'));other.id='second';other.name='Seconde cible';s.combat.participants.push(other);s.combat.order=['mage','foe','second'];s.combat.orderMode='manual';delete s.activeScene;await store.loadFromJSON(s);return {store,engine};};
 let {store}=await make();await execute(store,'Sang Bouillonnant',{targetIds:['foe','second'],overcastChoices:{targets:1},targetTests:{foe:{roll:25},second:{roll:95}}});assert.equal(level(subject(store,'foe'),'Aveuglé'),0);assert.equal(level(subject(store,'second'),'Aveuglé'),2);
 const other=await make();store=other.store;await store.applySpellEffects('foe',{ward:7,durationRounds:99,casterId:'mage'});await execute(store,'Blizzard enflammé de Ygethmor',{targetIds:['foe','second']});const inputs={};for(const id of ['foe','second']){const e=subject(store,id).extensions.v5.spellEffects.find(e=>e.spellId===cFor('Blizzard enflammé de Ygethmor').id);inputs[id]={['spell:'+e.id+':present']:true,['spell:'+e.id+':cover']:false,['spell:'+e.id+':roundTest']:id==='foe'?25:95,['spell:'+e.id+':location']:34,['spell:'+e.id+':ward0']:10};}
 const s=JSON.parse(store.getFullJSON());s.combat.currentActorId='second';delete s.activeScene;await store.loadFromJSON(s);await other.engine.nextTurn({inputs});assert.equal(subject(store,'foe').hp,200);assert.equal(subject(store,'second').hp,156);assert.equal(level(subject(store,'foe'),'À Terre'),0);assert.equal(level(subject(store,'second'),'À Terre'),1);
});
});

describe('contrats — retours sur Haute Magie et Magie Elfique', () => {
const { fixture: catalogueFixture, input: catalogueInput, execute: catalogueExecute } = lot3CatalogueFixtureNs;
test('Retour P2/5B : une action MJ seule et aucune valeur appliquée classent un rappel',()=>{const matrix=fs.readFileSync('docs/lot3/LOT3_MATRICE_CONTRATS_V5.md','utf8');for(const [name,expected] of [['Arche de Saphir','Rappel'],['Cage dorée','Rappel'],['Marée des Âges','Contrat nécessitant des données MJ'],['Pont d’Ombres','Rappel'],['Poches Profondes','Rappel (Suivi fiche)'],['Grande Illusion','Rappel'],['Ailes Grises','Contrat nécessitant des données MJ']])assert.equal(matrix.split('\n').find(l=>l.includes('| '+name+' |')).split('|')[9].trim(),expected,name);});
test('Retour P4 — HEPG pp. 88–89 : dégâts surpuissants des projectiles périodiques',()=>{for(const name of ['Tempête','Bannissement Majeur'])assert.ok(contractFor(name).overcast.options.includes('damage'),name);});
test('Retour P3 — V5 p.243 : arrêt réel de Chaîne à Blessures=BE, texte d’aperçu et journal',async()=>{const {store}=await catalogueFixture({foe:{caracs:{F:40,E:50,FM:40,M:4},armor:{head:0,body:0,arms:0,legs:0}}}),i=catalogueInput('Attaques en chaine',{targetIds:['foe','mage']});i.targetTests.mage.nearest=true;i.targetTests.mage.distance=6;const p=await catalogueExecute(store,'Attaques en chaine',i);assert.equal(p.targetResults[0].woundsLost,5);assert.equal(p.targetResults[1].woundsLost,0);assert.match(p.targetResults[1].actions[0].summary,/Chaîne arrêtée.*Blessures.*5.*BE.*5/);assert.ok(store.getLog().some(l=>/Chaîne arrêtée.*Blessures.*5.*BE.*5/.test(l.text)));});
test('HEPG pp. 81–82 : second Vent admis et Vent étranger refusé, chaque sort',async()=>{for(const row of sourceCases.slice(16,24)){const {store}=await fixture(row),p=store.previewSpellExecution(contractFor(row[0]).id,spellInput(row,store,{chosenLore:'high'}));assert.equal(p.ready,false);}});
test('HEPG pp. 82, 88 : Navigation −3, Intuition −3 et Intimidation +1 indépendants du contrat',async()=>{for(const [name,key,value,target] of [["Masque de l’Esprit",'Intuition adverse',-3,'mage'],['Voix de Fer (Aqshy & Chamon)','Intimidation',1,'mage']]){const row=sourceCases.find(r=>r[0].startsWith(name.replace('’',"'")));assert.ok(row,name);const {store}=await fixture(row);await execute(store,row);assert.equal(subject(store,target).extensions.v5.testModifiers[key],value);}});
test('HEPG pp. 87–89 : coûts des options transcrits',()=>{for(const [name,id,cost] of [["Extinction de l'Âme",'fury',7],['Convocation Ardente','exempt',8],['Bouclier de Saphery','range',4],['Œil Invisible','range',8]])assert.equal(contractFor(name).overcast.specific.find(o=>o.id===id).cost,cost);});
});

describe('contrats — retours sur les Vents de Magie', () => {
const { fixture, execute, input, contractFor } = lot3WomFixtureNs;
test('Retour Lot4 — WoM p.134, D12 : Sang 1 et 2 Rounds font exactement 1 et 2 frappes avant expiration',async()=>{
 for(const amount of [0,2]){const {store,engine}=await fixture({foe:{hp:500,maxHp:500}});await execute(store,'Sang Bouillonnant',{overcastChoices:{duration:amount}});
 for(let n=0;n<10;n++)await endTurn(engine);
 assert.equal(subject(store,'foe').hp,500-48*(amount?2:1));assert.equal(store.getLog().filter(l=>l.detail?.spellId===contractFor('Sang Bouillonnant').id&&l.detail.phase==='startOfTurn').length,amount?2:1);
 }
});
test('Retour Lot4 — WoM p.137 : six Rounds de Blizzard donnent six frappes, aucune septième',async()=>{
 const {store,engine}=await fixture({foe:{hp:1000,maxHp:1000}});await execute(store,'Blizzard enflammé de Ygethmor');const e=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===contractFor('Blizzard enflammé de Ygethmor').id);
 for(let n=0;n<16;n++)await endTurn(engine,{inputs:{foe:{['spell:'+e.id+':present']:true,['spell:'+e.id+':cover']:false,['spell:'+e.id+':test']:95,['spell:'+e.id+':location']:34}}});
 assert.equal(store.getLog().filter(l=>l.detail?.spellId===e.spellId&&l.detail.phase==='endOfRound').length,6);
});
test('Retour Lot4 — WoM pp.20–21,136 : un vortex expiré ne demande aucun dernier déplacement',async()=>{
 const {store,engine}=await fixture();await execute(store,'Tempête Magmatique',{direction:'E',willpowerSuccess:true,distanceRoll:10});
 const s=JSON.parse(store.getFullJSON()),e=subject(store,'mage').extensions.v5.spellEffects.find(e=>e.roundEffect?.vortex);s.combat.round=e.expiresAtRound;s.combat.currentActorId='mage';delete s.activeScene;await store.loadFromJSON(s);const p=engine.previewNextTurn();assert.ok(!(p.requests || []).some(r=>r.field.includes('vortex')));await endTurn(engine);assert.ok(!subject(store,'mage').extensions.v5.spellEffects.some(e=>e.roundEffect?.vortex));
});
test('Retour Lot4 — WoM pp.89,122,125,134,137,146,148 : limites et coûts sourcés indépendants',()=>{
 const c=name=>contractFor(name);
 assert.equal(c('Transe d’Ambre').effects.secondaryTest.modifierSl,-2);
 assert.equal(c("Suivi de l'Odeur").effects.testModifiers['Perception (Odorat)'],2);
 assert.equal(c('Tempête Magmatique').overcast.specific.find(o=>o.id==='mini').cost,2);assert.equal(c('Tempête Magmatique').effects.vortex.miniMax,3);
 assert.equal(c('Cendres et Poussière').overcast.specific.find(o=>o.id==='sun').cost,4);
 assert.equal(c('Epées Sanguines').overcast.specific.find(o=>o.id==='swords').cost,2);assert.equal(c('Epées Sanguines').effects.summon.max,6);
 assert.equal(c('Escalier en Spirale').effects.receiptOvercast.height.max,200);
 assert.equal(c('Les Enfants Sauvages de Zandox').effects.summon.rangeFormula,'4');
 assert.equal(c('Sang Bouillonnant').effects.specialState.deathBurst.radius,2);
 assert.equal(c('Blizzard enflammé de Ygethmor').effects.roundEffect.ignitionPercent,25);
});
test('Retour Lot4 — WoM p.137 : déplacement9 ne produit aucun mini, 8 en produit trois au lancer',async()=>{
 for(const distance of [8,9]){const {store}=await fixture();const p=await execute(store,'Tempête Magmatique',{direction:'E',willpowerSuccess:true,distanceRoll:distance,overcastSpecific:{mini:3},domainFacts:{mini1Direction:1,mini2Direction:1,mini3Direction:1}});
 assert.equal(p.vortexMovement.mini.length,distance===8?3:0);}
 const {store}=await fixture();assert.equal(store.previewSpellExecution(contractFor('Tempête Magmatique').id,input('Tempête Magmatique',{overcastSpecific:{mini:4}})).ready,false);
});
test('Retour Lot4 — WoM p.100 : collision Thorsen7, PA0 BE0 prouvent la valeur au-delà du minimum1',async()=>{
 const {store}=await fixture({foe:{hp:200,maxHp:300,caracs:{CC:50,CT:50,F:40,E:0,FM:40,Ag:50,I:50,Int:50,M:4},armor:{head:0,body:0,arms:0,legs:0}}});
 const p=await execute(store,'Orage de Thorsen',{direction:'E',willpowerSuccess:true,distanceRoll:10,targetTests:{foe:{throwDirection:4,collision:true}}});assert.equal(subject(store,'foe').hp,179);assert.ok(p.vortexMovement.logs.some(l=>l.detail?.thrown?.collision===true));
});
test('Retour Lot4 — WoM p.134 : Corps Calme−2, jet55 sur FM60 doit lâcher, jet35 maintient',async()=>{
 for(const die of [35,55]){const {store}=await fixture();await execute(store,'Corps de Feu');const effect=subject(store,'mage').extensions.v5.spellEffects.find(e=>e.specialState?.bodyFire);const p=store.previewSpellInteraction({effectId:effect.id,targetId:'foe',kind:'body-fire',controlValue:'grab',roll:die,locationRoll:34});assert.equal(p.ready,true,p.error);assert.equal(p.test.success,die===35);}
});
test('Retour Lot4 — WoM p.149, V5 p.131 : égalité opposée Force remportée par le ver initiateur',async()=>{
 const {store}=await fixture({foe:{caracs:{F:50,E:40,FM:40,M:4}}});await execute(store,'Ver Grouillant');const e=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.specialState?.wormGrapple);const p=store.previewSpellInteraction({effectId:e.id,targetId:'foe',kind:'worm',controlValue:'entangle',roll:25,opponentRoll:25});assert.equal(p.ready,true,p.error);await store.applySpellInteraction({effectId:e.id,targetId:'foe',kind:'worm',controlValue:'entangle',roll:25,opponentRoll:25});assert.equal(level(subject(store,'foe'),'Enchevêtré'),2);
});
test('Retour Lot3 — HEPG p.84 : une seule rune Cadai par jet de Haute Magie, refuse doublon, stock intact',async()=>{
 const row=elvenCases[0],{store}=await elvenFixture(row);await store.deployCadaiRune({actorId:'mage',roll:25,conditionsConfirmed:true});await store.deployCadaiRune({actorId:'mage',roll:25,conditionsConfirmed:true});const before=store.getCadaiRunes('mage').deployed;
 const i=spellInput(row,store,{roll:95,cadaiAccessible:true,cadaiRerolls:[{purpose:'test',roll:25},{purpose:'test',roll:35}]});assert.throws(()=>store.previewSpellExecution(contractFor('Apothéose').id,i),/même jet/);await assert.rejects(()=>store.applySpellExecution(contractFor('Apothéose').id,i),/même jet/);assert.equal(store.getCadaiRunes('mage').deployed,before);
});
test('Retour Lot3 — V5 p.243 : Chaîne B=BE+1 continue, motif d’arrêt ensuite journalisé',async()=>{
 const row=arcaneCases.find(r=>r[0]==='Chain Attack'),{store}=await encounter({foe:{caracs:{E:50},armor:{head:0,body:0,arms:0,legs:0}}});
 const p=await arcaneExecute(store,row,{targetIds:['foe','mage'],overcastChoices:{damage:1},targetTests:{mage:{nearest:true,distance:6}}});assert.equal(p.targetResults[0].woundsLost,6);assert.ok(p.targetResults[1].woundsLost>0);
});
test('Retour Lot3 — V5 p.242 : Source produit des pintes, jamais des litres',async()=>{
 const row=arcaneCases.find(r=>r[0]==='Spring'),{store,engine}=await encounter();await arcaneExecute(store,row);await endTurn(engine);await endTurn(engine);assert.equal(store.getLog().find(l=>l.detail?.quantity!==undefined).detail.unit,'pinte');
});
test('Retour Lot3 — HEPG pp.87–89 : assertions des modificateurs et PV indépendantes des données',()=>{
 assert.equal(contractFor('Glamour de Teclis').effects.roundEffect.test.modifierSl,-3);
 assert.equal(contractFor('Tempête').effects.roundEffect.missileFlying,5);assert.equal(contractFor('Tempête').effects.roundEffect.athleticsGroundSl,2);assert.equal(contractFor('Tempête').effects.roundEffect.athleticsFlyingSl,1);
 assert.equal(contractFor('Drain de Magie').effects.optionRules.wide.test.modifierSl,-1);
 assert.equal(contractFor('Chemin entre les Mondes').effects.optionRules.duration.test.modifierSl,-2);
});

test('Retour Lot3 — HEPG p.89 : Tempête +4 donne CT−3DR ; Saphery importé 8 avec une amélioration devient7',async()=>{
 const row=elvenCases.find(r=>r[0]==='Tempête'),{store}=await elvenFixture(row);await elvenExecute(store,row,{overcastSpecific:{cool:1}});assert.equal(subject(store,'foe').extensions.v5.testModifiers.CT,-3);
 const a=await elvenFixture(elvenCases[0]);await a.store.applySpellEffects('mage',{casterId:'mage',castExecutionId:'legacy',ward:8,saphery:{improved:1},durationRounds:10});await elvenExecute(a.store,elvenCases[0]);assert.equal(subject(a.store,'mage').extensions.v5.ward,7);const e=subject(a.store,'mage').extensions.v5.spellEffects.find(e=>e.saphery);assert.equal(e.saphery.baseWard,9);await a.store.undo();assert.equal(subject(a.store,'mage').extensions.v5.ward,8);
});
});

describe('contrats du catalogue — retours (Feu, Cieux, Métal, Bêtes)', () => {
const { fixture, execute, input, contractFor, subject } = lot3CatalogueFixtureNs;
const category=name=>{const cells=fs.readFileSync('docs/lot3/LOT3_MATRICE_CONTRATS_V5.md','utf8').split('\n').find(l=>l.includes('| '+getSpellContract(name).name+' |')).split('|').map(s=>s.trim());return cells[9];};
test('Retour Lot5A : catégories exactes, toutes variantes et destinataires mesurables explorés',()=>{for(const name of ['Coruscation de Finreir','Aura ordinaire','Chaleur Desséchante','Lumière aveuglante',"Portail d'Ombre","Pas d'Ombre",'Perturbant','Inscription'])assert.ok(category(name).startsWith('Contrat à effet calculable'),name+' : '+category(name));});
test('Retour Lot5A — WoM pp.75,100 : rappels Miroir et Armure propres à leur source',()=>{assert.match(contractFor('Miroir Mystique').assistedClauses.join(' '),/miroir|réflexion/i);assert.doesNotMatch(contractFor('Miroir Mystique').assistedClauses.join(' '),/Protection\s*\(4\)/);assert.match(contractFor('Armure d’étain').assistedClauses.join(' '),/PA.*métall/i);assert.doesNotMatch(contractFor('Armure d’étain').assistedClauses.join(' '),/Protection\s*\(4\)/);});
test('Retour Lot5A — WoM pp.99,100,135,136 : faits sans calcul rendus optionnels, Polir seulement requis si option',async()=>{for(const [name,field] of [['Tempête de Flammes','minutesToDawn'],['Polir et Exalter','glassLens'],['Essais et Erreurs','skill'],['Colérique','ireSubject'],['Forge de Tarnus','sourceFire'],['Miroir Mystique','reflection'],['Miroir Mystique','knownTarget']]){const {store}=await fixture({foe:{camp:name==='Essais et Erreurs'?'pj':'ennemi'}}),i=input(name);delete i.domainFacts[field];assert.equal(store.previewSpellExecution(contractFor(name).id,i).ready,true,name+' sans '+field);}const {store}=await fixture(),i=input('Polir et Exalter',{overcastSpecific:{astronomy:1}});delete i.domainFacts.glassLens;assert.equal(store.previewSpellExecution(contractFor('Polir et Exalter').id,i).ready,false);});
test('Retour Lot5A — WoM p.101 : Shemtek sûre annonce seulement BI éclairs sans Sonné ni Peur',async()=>{const {store}=await fixture(),p=await execute(store,'Tempête de Shemtek',{domainFacts:{...input('Tempête de Shemtek').domainFacts,catalogueMode:'safe'}}),text=p.targetResults.flatMap(r=>r.actions).map(a=>a.summary).join(' ');assert.doesNotMatch(text,/2×BI|lanceur\s*1\s*Sonné/);assert.match(text,/sans Sonné.*Peur/);assert.equal(subject(store,'mage').states.length,0);});
test('Retour Lot5A — HEPG p.87 : Œil Invisible reçoit les PV du contrat, une seule source',async()=>{const c=structuredClone(getSpellContract('Œil Invisible'));c.effects.summon.hp=9;const {store}=await fixture();const aux=resolveAuxiliarySummons({contract:c,caster:subject(store,'mage')}).auxiliaries;assert.equal(aux[0].hp,9);assert.equal(aux[0].maxHp,9);});
test('Retour Lot5A — HEPG pp.81–82 : vrai Vent de couleur étranger refusé, huit arcanes',async()=>{for(const row of elfCases.slice(16,24)){const {store}=await elfFixture(row),c=getSpellContract(row[0]),foreign=['fire','heavens','metal','beasts','life','light','death','shadow'].find(l=>!c.wind.map(normalizeLoreId).includes(l));assert.equal(store.previewSpellExecution(c.id,spellInput(row,store,{chosenLore:foreign})).ready,false,row[0]+' : '+foreign);}});
test('Retour Lot5A — HEPG p.86 : Attraction, TestCT des localisations à+0DR',()=>assert.equal(getSpellContract('Malédiction d’Attraction des Flèches').effects.optionRules.locations.test.modifierSl,0));
test('Retour Lot5A — décision MJ 13/10, WoM p.75 et V5 p.253 : Écaille et Robe distinctes, sans alias à arbitrer',()=>{
 const scale=getSpellContract('Écaille d’acier'),robe=getSpellContract('Robe scintillante');
 assert.notEqual(scale.id,robe.id);assert.notEqual(scale.canonicalName,robe.canonicalName);
 assert.equal(scale.sharedWith,null);assert.equal(robe.sharedWith,null);
 assert.equal(scale.page,75);assert.equal(scale.cn,5);assert.equal(scale.effects.ward,9);
 assert.equal(robe.page,253);assert.equal(robe.cn,6);assert.equal(robe.effects.apModifiers.all,2);
 for(const c of [scale,robe])assert.doesNotMatch(c.reminders,/ancienprofil|identique àGlitteringRobe|alias.*valider|doublon.*arbitrer/i);
});
});

describe('contrats du catalogue — retours (Vie, Lumière, Mort, Ombres)', () => {
const { fixture, execute, input, subject, contractFor } = lot3CatalogueFixtureNs;
const { input: input5b } = lot5bCatalogueFixtureNs;
const category=name=>fs.readFileSync('docs/lot3/LOT3_MATRICE_CONTRATS_V5.md','utf8').split('\n').find(l=>l.includes('| '+getSpellContract(name).name+' |')).split('|').map(s=>s.trim())[9];
test('Retour 5B — HEPG pp.87–88 et V5 p.252 : quatre effets mesurables classés calculables',()=>{for(const n of ['Main de Gloire','Drain de Magie','La Fortune est Capricieuse','Protection de Phâ'])assert.match(category(n),/^Contrat à effet calculable/,n);});
test('Retour 5B — faits déclaratifs : absence facultative pour les rappels, sans calcul inventé',()=>{for(const n of ['Serrure ouverte','Créer un petit animal','En catimini','Enchantement Végétal (Ghyran & Chamon)','Flèche Bénie','Révéler la Magie','Malédiction de rouille','Flamme Attisée','Pont d’Ombres','Poches Profondes','Orbe de Hysh'])for(const f of getSpellContract(n).effects.facts||[])if(f.type!=='select'&&f.owner!=='caster')assert.equal(f.optional,true,n+' : '+f.key);assert.match(category('Goût de la Mort'),/^Contrat à effet calculable/);});
test('Retour 5B — rappels lisibles et Écaille/Robe sans demande de fusion',()=>{for(const c of getAllSpellContracts()){const text=[c.reminders,...(c.assistedClauses||[])].join(' ').replace(/\b(?:\d*d\d+|WoM|Tzeentch|Anoqeyån)\b/gu,'');assert.doesNotMatch(text,/[a-zà-ÿ][A-ZÀ-Þ0-9]/u,c.name);}for(const n of ['Écaille d’acier','Robe scintillante'])assert.doesNotMatch(getSpellContract(n).reminders,/alias|fusion|arbitrer|à\s*valider/i);});
test('Retour 5B — WoM p.87 : Chair de Pierre conserve six PA canoniques',async()=>{const {store}=await fixture();await execute(store,'Chair de Pierre');const armor=subject(store,'foe').armor;assert.deepEqual(Object.keys(armor).sort(),['head','body','leftArm','rightArm','leftLeg','rightLeg'].sort());assert.equal(armor.rightArm,6);});
test('Retour 5B — WoM p.110 : Danse, Athlétisme −2 DR indépendant de la page',()=>{assert.equal(getSpellContract('Danse du Désespoir').effects.triggered.test.modifierSl,-2);});
test('Retour 5B — WoM p.125 : Marée vivante, Calme +2 DR',()=>{assert.equal(getSpellContract('Marée des Âges').effects.factModes.values.living.secondaryTest.modifierSl,2);});
test('Retour 5B — WoM p.113 : Traître neutre, +2 DR aux Tests de Sociabilité',async()=>{const {store}=await fixture({foe:{camp:'neutre'}});const p=await execute(store,'Traître de Tarn',input5b('Traître de Tarn',{domainFacts:{mode:'neutral'}}));assert.equal(p.targetResults[0].quantifiedReminder.sociabiliteDuLanceurContreNeutreDR,2);});
test('Retour 5B — WoM p.87 : Cercueil, limite réelle 3600 secondes dans une seule source',async()=>{const {store}=await fixture({foe:{hp:0,dead:true}}),c=contractFor('Cercueil de Jade');assert.equal(c.effects.restoreCorpse.maxAgeSeconds,3600);assert.equal(c.effects.facts.find(f=>f.key==='corpseAgeSeconds').max,undefined);const i=input5b('Cercueil de Jade');for(const [age,ready]of [[3600,true],[3601,false]]){i.targetTests.foe.corpseAgeSeconds=age;assert.equal(store.previewSpellExecution(c.id,i).ready,ready,String(age));}const limited=structuredClone(c);limited.effects.restoreCorpse.maxAgeSeconds=60;const mage=subject(store,'mage'),foe=subject(store,'foe');assert.equal(previewSpellExecution(mage,limited,[foe],{...i,targetTests:{foe:{...i.targetTests.foe,corpseAgeSeconds:61}},participants:store.listParticipants()}).ready,false);});
});
