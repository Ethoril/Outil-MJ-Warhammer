import test from 'node:test';
import {sourceCases,verifyElven} from './helpers/lot3-elven-fixture.js';
import assert from 'node:assert/strict';
import {fixture,execute,contractFor,spellInput} from './helpers/lot3-elven-fixture.js';
import {subject,endTurn,level} from './helpers/lot3-domain-fixture.js';
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

import {verifyElvenOptions} from './helpers/lot3-elven-fixture.js';
for(const row of sourceCases.slice(0,16))test('HEPG p. '+row[1]+' — '+row[0]+' : chaque option payée et Tests secondaires réussis/ratés/manquants',()=>verifyElvenOptions(row));
