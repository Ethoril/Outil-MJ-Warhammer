import test from 'node:test';
import {pettyCases,verifyArcanePetty} from './helpers/lot3-arcane-fixture.js';
import assert from 'node:assert/strict';
import {sourceCases,fixture,execute,spellInput,contractFor} from './helpers/lot3-arcane-fixture.js';
import {subject,level,endTurn} from './helpers/lot3-domain-fixture.js';
const rowFor=name=>sourceCases.find(row=>row[0]===name);
for(const row of pettyCases)test('Mineurs V5 — '+row[0]+' — V5 p. '+row[1]+' — source, Store, persistance, Undo, vrais Tours',()=>verifyArcanePetty(row));
for(const name of ['Light','Marsh Lights','Sounds'])test('Mineurs — V5 p. 241–242 : '+name+' — contrôle FM +2, succès/échec, dé absent, Undo',async()=>{
 const row=rowFor(name),{store}=await fixture(row);await execute(store,row);const e=store.listParticipants().flatMap(p=>p.extensions.v5.spellEffects || []).find(e=>e.spellId===contractFor(name).id);
 const input={effectId:e.id,targetId:'mage',kind:'control',controlValue:e.specialState.controlTest.options[0][0],lineOfSight:true};
 assert.equal(store.previewSpellInteraction(input).ready,false);const before=store.listParticipants();
 const p=store.previewSpellInteraction({...input,roll:25});assert.equal(p.ready,true,p.error);assert.equal(p.test.sl,6);await store.applySpellInteraction({...input,roll:25});await store.undo();assert.deepEqual(store.listParticipants(),before);
 const fail=store.previewSpellInteraction({...input,roll:95});assert.equal(fail.ready,true,fail.error);assert.equal(fail.test.success,false);
 if(name==='Marsh Lights')assert.equal(store.previewSpellInteraction({...input,roll:25,lineOfSight:false}).ready,false);
});
test('Mineurs — V5 p. 242 : Printemps, une pinte par Round, maximum Bonus Initiative sans stock dédié',async()=>{
 const row=rowFor('Spring'),{store,engine}=await fixture(row);await execute(store,row);
 for(let i=0;i<4;i++)await endTurn(engine);
 assert.equal(store.getLog().find(l=>l.detail?.quantity!==undefined)?.detail.quantity,2);
});
test('Mineurs — V5 p. 242 : Putréfaction organique hors cuir et Frémissement sans objet tenu',async()=>{
 const row=rowFor('Rot'),{store}=await fixture(row);await execute(store,row,{domainFacts:{organic:true,rotMode:'other'}});assert.equal(subject(store,'foe').armor.body,2);await store.undo();
 const p=await execute(store,rowFor('Twitch'),{targetTests:{foe:{objectHeld:false}}});assert.equal(p.targetResults[0].droppedObject,undefined);
});
test('Mineurs — V5 p. 242 : Sommeil couché/consentant, bruit, réveil et Undo',async()=>{
 const row=rowFor('Sleep'),{store}=await fixture(row);await execute(store,row,{targetTests:{foe:{voluntaryTired:true}}});assert.equal(level(subject(store,'foe'),'Inconscient'),1);
 const e=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===contractFor('Sleep').id),before=store.listParticipants();
 await store.applySpellInteraction({effectId:e.id,targetId:'foe',kind:'noise'});assert.equal(level(subject(store,'foe'),'Inconscient'),0);await store.undo();assert.deepEqual(store.listParticipants(),before);
});
test('Mineurs — V5 p. 240 : Drain soigne même si Protection annule les Blessures ; Éblouissement se répète au vrai Round',async()=>{
 const row=rowFor('Drain'),{store,engine}=await fixture(row);await store.applySpellEffects('foe',{ward:7,durationRounds:10});await execute(store,row,{targetTests:{foe:{wardRoll:10}}});assert.equal(subject(store,'foe').hp,40);assert.equal(subject(store,'mage').hp,11);await store.undo();
 await execute(store,rowFor('Dazzle'));await endTurn(engine);await endTurn(engine);assert.equal(level(subject(store,'foe'),'Aveuglé'),1,'une occurrence en début de Round après récupération normale en fin de Tour');assert.ok(store.getLog().some(l=>l.text.startsWith(contractFor('Dazzle').name+' —')),'nouvelle clause du Round exécutée');
});
