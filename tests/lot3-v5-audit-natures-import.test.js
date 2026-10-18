import test from 'node:test';
import assert from 'node:assert/strict';
import { actor, setup, person } from './helpers/relecture2-fixture.js';
import { createCombatEngine } from '../js/core/combat.js';
import { isTargetDaemon, isTargetUndead, previewLoreAttribute } from '../js/core/v5-magic-attributes.js';
import { sanitizeParticipant } from '../js/core/sanitize.js';
import { applyBeastForm, BEAST_PROFILES } from '../js/core/v5-magic-arbitrations.js';

const sources = label => [{traits:[label]}, {extensions:{traits:[{name:label}]}}, {tags:[label]}, {category:label}, {species:label}];
test('Audit A05 : une désignation complète est requise, quelle que soit la source de nature', () => {
 for (const label of ['Haine (Undead)', 'Hatred (Undead)', 'Chasseur de mort-vivants', 'Chasseur de démons', 'Pas un Mort-vivant']) {
  for (const extra of sources(label)) { assert.equal(isTargetUndead(actor('target',extra)),false,JSON.stringify(extra)); assert.equal(isTargetDaemon(actor('target',extra)),false,JSON.stringify(extra)); }
 }
 for (const label of ['Mort-vivant','Morts-vivants','Mort vivant','Undead','Undead Creature','Mort-vivant (9+)']) for(const extra of sources(label)) assert.equal(isTargetUndead(actor('target',extra)),true,JSON.stringify(extra));
 for (const label of ['Démon','Daemon','Daemonic','Démoniaque','Démon (9+)','Sanguinaire']) for(const extra of sources(label)) assert.equal(isTargetDaemon(actor('target',extra)),true,JSON.stringify(extra));
 assert.equal(isTargetUndead(actor('target',{name:'Undead'})),false); assert.equal(isTargetUndead(actor('target',{isUndead:true})),true);
});

test('Audit A02 : Vie et Mort partagent la nature vivante stricte',()=>{
 for(const label of ['Artificiel','Construct','Automate','Éthéré','Ethereal','Démon','Mort-vivant']) for(const extra of sources(label)) {
  const target=actor('target',extra),life=previewLoreAttribute({lore:'life',caster:actor(),targets:[target]}).targetEffects.get('target');
  assert.deepEqual(life.removeConditions,[],JSON.stringify(extra));
  assert.equal(previewLoreAttribute({lore:'death',caster:actor(),targets:[target]}).targetEffects.has('target'),false,JSON.stringify(extra));
 }
 for(const label of ['Chasseur de démons','Haine (Undead)','Chasseur d’Artificiels','Haine (Éthérés)']) {
  const target=actor('target',{traits:[label]});assert.deepEqual(previewLoreAttribute({lore:'life',caster:actor(),targets:[target]}).targetEffects.get('target').removeConditions,['hemorragique','extenue']);
  assert.equal(previewLoreAttribute({lore:'death',caster:actor(),targets:[target]}).targetEffects.has('target'),true);
 }
});

test('Audit A05 : attribut Vie réel conserve les B du vivant, recharge et Undo',async()=>{
 const s=await setup(actor(),actor('target',{hp:10,traits:['Hatred (Undead)'],states:[{name:'Exténué',key:'extenue',level:1}]}));
 const p=s.previewLoreAttribute({lore:'life',targetIds:['target']});await s.applyLoreAttribute(p,{casterId:'mage',targetIds:['target']});
 assert.equal(person(s,'target').hp,10);assert.equal(person(s,'target').states.length,0);const reloaded=await setup(person(s),person(s,'target'));assert.equal(person(reloaded,'target').hp,10);assert.equal(person(reloaded,'target').states.length,0);
 await s.undo();assert.equal(person(s,'target').hp,10);assert.equal(person(s,'target').states.length,1);
});

async function earthblood(extra){
 const s=await setup(actor(),actor('target',{hp:5,...extra}));await s.applySpellExecution('Sang de la Terre',{actorId:'mage',targetIds:['target'],sl:20,domainFacts:{directEarth:true},attributeActive:false});
 const effect=person(s,'target').extensions.v5.spellEffects.find(e=>e.roundEffect?.healing),engine=createCombatEngine(s);await engine.nextTurn();
 const inputs={target:{['spell:'+effect.id+':earth']:true,['spell:'+effect.id+':present']:true}};assert.equal(engine.previewNextTurn({inputs}).ready,true);await engine.nextTurn({inputs});
 const hp=person(s,'target').hp,reloaded=await setup(person(s),person(s,'target'));assert.equal(person(reloaded,'target').hp,hp);await s.undo();assert.equal(person(s,'target').hp,extra.hp ?? 5);return hp;
}
test('Audit A02 : Sang de la Terre, vrais Rounds, Artificiel non soigné et rôles vivants soignés',async()=>{
 for(const label of ['Artificiel','Construct','Éthéré','Démon','Mort-vivant'])assert.equal(await earthblood({traits:[label]}),5,label);
 for(const label of ['Chasseur de démons','Haine (Undead)','Humanoïde'])assert.equal(await earthblood({traits:[label]}),10,label);
 assert.equal(await earthblood({tags:['Artificiel']}),5);assert.equal(await earthblood({tags:['Chasseur de démons']}),10);
 assert.equal(await earthblood({hp:0,traits:['Humanoïde']}),5,'vivant à 0 B : soin conservé, pas de nouveau critère de nature');
});

const legacyForm=()=>({originalParticipant:{caracs:{F:30,E:30,FM:50,Dex:'–'},baseCaracs:{F:30,E:30,FM:50,Dex:'–'},hp:20,maxHp:30,M:4,traits:[]},initialBeastHp:14,durationMinutes:30,remainingMinutes:30});
test('Audit A06 : formes sans retour utilisable rejetées, pas seulement les nombres invalides',async()=>{
 const invalid=[{}, {beastProfile:{caracs:{F:30}}}, {originalParticipant:{}}, {originalParticipant:{caracs:{F:30},hp:10}}, {...legacyForm(),originalParticipant:{...legacyForm().originalParticipant,caracs:'inconnues'}}, {...legacyForm(),remainingMinutes:-1}];
 for(const form of invalid){const raw=actor('mage',{extensions:{v5:{beastForm:form}}});assert.equal(sanitizeParticipant(raw).extensions.v5.beastForm,undefined);const s=await setup(raw,actor('target'));assert.equal(person(s).extensions.v5.beastForm,undefined);const cast=s.previewSpellExecution('Carreau',{actorId:'mage',targetIds:['target'],sl:20,locationRoll:34,attributeActive:false});assert.equal(cast.ready,true,cast.error);}
});
test('Audit A06 : ancien retour valide sans métadonnées récentes conservé, Dex absente conservée',async()=>{
 const raw=actor('mage',{hp:11,maxHp:14,extensions:{v5:{beastForm:legacyForm()}}});const s=await setup(raw);assert.ok(person(s).extensions.v5.beastForm);const reloaded=await setup(person(s));assert.ok(person(reloaded).extensions.v5.beastForm);await reloaded.revertBeastForm('mage');assert.equal(person(reloaded).hp,17);assert.equal(person(reloaded).maxHp,30);await reloaded.undo();assert.ok(person(reloaded).extensions.v5.beastForm);
});
test('Audit A06 : les six formes normales conservent un retour après sanitisation/recharge',async()=>{
 for(const profile of Object.values(BEAST_PROFILES)){const transformed=applyBeastForm(actor(),profile).participant;const s=await setup(transformed);assert.ok(person(s).extensions.v5.beastForm,profile.name);await s.revertBeastForm('mage');assert.equal(person(s).maxHp,30,profile.name);assert.equal(person(s).hp,30,profile.name);}
});


test('Audit A02 : Sang de la Terre ne relève pas le mort déclaré par Mort rapide',async()=>{
 const s=await setup(actor(),actor('target',{hp:0,traits:['Humanoïde']}));
 await s.applySpellExecution('Mort rapide',{actorId:'mage',targetIds:['target'],sl:20,attributeActive:false});assert.equal(person(s,'target').extensions.v5.dead,true);
 await s.applySpellExecution('Sang de la Terre',{actorId:'mage',targetIds:['target'],sl:20,domainFacts:{directEarth:true},attributeActive:false});
 const effect=person(s,'target').extensions.v5.spellEffects.find(e=>e.roundEffect?.healing),engine=createCombatEngine(s);await engine.nextTurn();
 const inputs={target:{['spell:'+effect.id+':earth']:true,['spell:'+effect.id+':present']:true}},round=s.getCombat().round;assert.equal(engine.previewNextTurn({inputs}).ready,true);await engine.nextTurn({inputs});assert.equal(s.getCombat().round,round+1);
 assert.equal(person(s,'target').hp,0);assert.equal(person(s,'target').extensions.v5.dead,true);
 const {createStore}=await import('../js/core/store.js');const reloaded=createStore();await reloaded.ready;await reloaded.loadFromJSON(s.getFullJSON());assert.equal(person(reloaded,'target').hp,0);assert.equal(person(reloaded,'target').extensions.v5.dead,true);
 await s.undo();assert.equal(s.getCombat().round,round);assert.equal(person(s,'target').hp,0);assert.equal(person(s,'target').extensions.v5.dead,true);
});
