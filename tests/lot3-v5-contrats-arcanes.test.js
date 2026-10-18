import test from 'node:test';
import {arcaneCases,verifyArcanePetty} from './helpers/lot3-arcane-fixture.js';
import assert from 'node:assert/strict';
import {sourceCases,fixture,execute,spellInput,contractFor} from './helpers/lot3-arcane-fixture.js';
import {encounter,subject,level,endTurn} from './helpers/lot3-domain-fixture.js';
import {ARCANE_WEAPON_PROFILES} from '../js/core/equipment.js';
const rowFor=name=>sourceCases.find(row=>row[0]===name);
for(const row of arcaneCases)test('Arcanes V5 — '+row[0]+' — V5 p. '+row[1]+' — source, Store, persistance, Undo, vrais Tours',()=>verifyArcanePetty(row));
test('Arcanes — V5 p. 243 : chaîne, seuil strict, décroissance, faits absents et Protection',async()=>{
 const {store}=await encounter({mage:{armor:{head:0,body:0,arms:0,legs:0}},foe:{caracs:{E:20,FM:40,M:4},armor:{head:0,body:0,arms:0,legs:0}}}),row=rowFor('Chain Attack'),c=contractFor(row[0]);
 const input=spellInput(row,{targetIds:['foe','mage'],targetTests:{foe:{},mage:{distance:4,nearest:true}}});
 const missing=structuredClone(input);delete missing.targetTests.mage.nearest;assert.equal(store.previewSpellExecution(c.id,missing).ready,false);
 const p=await execute(store,row,input);assert.equal(p.targetResults[0].missile.rawDamage,10);assert.equal(p.targetResults[1].missile.rawDamage,9);
 await store.undo();await store.applySpellEffects('foe',{ward:7,durationRounds:10});
 const protectedInput=structuredClone(input);protectedInput.targetTests.foe.wardRoll=10;const guarded=await execute(store,row,protectedInput);
 assert.equal(guarded.targetResults[1].woundsLost,0);
});
test('Arcanes — V5 p. 243 : Souffle CT/Esquive, égalité frappe, réussite défensive évite, dé manquant bloque',async()=>{
 const row=rowFor('Breath'),{store}=await fixture(row),c=contractFor(row[0]);
 const bad=spellInput(row);delete bad.ctRoll;assert.equal(store.previewSpellExecution(c.id,bad).ready,false);
 const won=await execute(store,row,{targetTests:{foe:{distance:10,dodgeRoll:25}}});assert.equal(won.targetResults[0].breath.shot.sl,won.targetResults[0].breath.defended.sl);assert.equal(subject(store,'foe').hp,35);assert.equal(level(subject(store,'foe'),'Enflammé'),1);
 await store.undo();const avoided=await execute(store,row,{targetTests:{foe:{distance:10,dodgeRoll:15}}});assert.equal(avoided.targetResults[0].resisted,true);assert.equal(subject(store,'foe').hp,40);
});
test('Arcanes — V5 p. 245 : Poussée utilise chaque d10, BE conservé, PA ignorés, Protection et collisions',async()=>{
 const row=rowFor('Push'),{store}=await fixture(row),c=contractFor(row[0]);
 const missing=spellInput(row);delete missing.damageRoll;assert.equal(store.previewSpellExecution(c.id,missing).ready,false);
 await execute(store,row);assert.equal(subject(store,'foe').hp,37);assert.equal(level(subject(store,'foe'),'À Terre'),1);
 await store.undo();await store.applySpellEffects('foe',{ward:7,durationRounds:10});await execute(store,row,{targetTests:{foe:{damageRoll:7,wardRoll:10}}});assert.equal(subject(store,'foe').hp,40);assert.equal(level(subject(store,'foe'),'À Terre'),1);
});
test('Arcanes — V5 p. 244 : Aura ordinaire interdit les autres sorts et finit sur Focalisation effective',async()=>{
 const row=rowFor('Mundane Aura'),{store}=await fixture(row);await execute(store,row);
 assert.throws(()=>store.previewSpellExecution(contractFor('Bolt').id,spellInput(rowFor('Bolt'))),/interdit/);
 assert.equal(store.previewChannelling({actorId:'mage',roll:25,type:'winds'}).ready,true);
 await store.applyChannelling(store.previewChannelling({actorId:'mage',roll:25,type:'winds'}));
 assert.ok(!subject(store,'mage').extensions.v5.spellEffects.some(e=>e.spellId===contractFor(row[0]).id));
});
test('Arcanes — V5 p. 242 et 301 : les 29 armes sont exactes, locales et disparaissent aux vrais Tours',async()=>{
 const row=rowFor('Aethyric Arms'),{store,engine}=await fixture(row);await execute(store,row);
 const weapon=subject(store,'mage').actions.find(a=>a.extensions?.v5?.spellEffectId);assert.equal(weapon.damage,4);assert.ok(weapon.qualities.some(q=>q.id==='magique'));
 for(let turns=0;subject(store,'mage').actions.some(a=>a.id===weapon.id)&&turns<16;turns++)await endTurn(engine);
 assert.ok(!subject(store,'mage').actions.some(a=>a.id===weapon.id));await store.undo();assert.ok(subject(store,'mage').actions.some(a=>a.id===weapon.id));
});
test('Arcanes — V5 pp. 244/358 : Envol lit Athlétisme, sol/vol explicites et −2 DR aux tirs en vol',async()=>{
 const row=rowFor('Flight'),{store}=await fixture(row);await execute(store,row);
 const p=store.previewResolution({actorId:'mage',targetId:'foe',action:{type:'attack',attr:'CT',base:50,damage:3,qualities:[]},roll:25,v5:{kind:'ranged',choice:'keep',actorSize:3,targetSize:3}});
 assert.equal(p.test.details.modifiers.find(m=>m.id==='spell-flight-ranged')?.amount,-2);
});
test('Arcanes — V5 pp. 244/358 : Perturbant −2 aux vivants, exclusion non-vivants, non-cumul et expiration',async()=>{
 const row=rowFor('Distracting'),{store,engine}=await fixture(row);await execute(store,row,{secondaryTargets:{engaged:['foe']}});
 assert.equal(subject(store,'foe').extensions.v5.testModifiers['Tous les Tests'],-2);
 await execute(store,row,{sl:12,roll:undefined,secondaryTargets:{engaged:['foe']}});assert.equal(subject(store,'foe').extensions.v5.testModifiers['Tous les Tests'],-2);
 for(let i=0;i<18&&subject(store,'foe').extensions.v5.spellEffects.length;i++)await endTurn(engine);assert.equal(subject(store,'foe').extensions.v5.testModifiers['Tous les Tests']||0,0);
 const other=await encounter({foe:{traits:['Mort-vivant']}});await execute(other.store,row,{secondaryTargets:{engaged:['foe']}});assert.equal(other.store.listParticipants()[1].extensions.v5.testModifiers?.['Tous les Tests']||0,0);
});
test('Arcanes — V5 pp. 243/357 : Sang corrosif modes, d10 commun, engagés/localisations explicites, Undo',async()=>{
 const row=rowFor('Corrosive Blood'),{store}=await fixture(row);await execute(store,row);const e=subject(store,'mage').extensions.v5.spellEffects.find(e=>e.spellId===contractFor(row[0]).id);
 const input={effectId:e.id,targetId:'mage',kind:'blood',targetsDeclared:true,targetIds:['foe'],damageRoll:9,targetTests:{foe:{locationRoll:34}}};
 assert.equal(store.previewSpellInteraction({...input,damageRoll:undefined}).ready,false);assert.equal(store.previewSpellInteraction({...input,targetTests:{}}).ready,false);
 const before=store.listParticipants();const p=store.previewSpellInteraction(input);assert.equal(p.ready,true,p.error);assert.equal(p.damage,3);await store.applySpellInteraction(input);assert.equal(subject(store,'foe').hp,37);await store.undo();assert.deepEqual(store.listParticipants(),before);
 await store.undo();await execute(store,row,{domainFacts:{corrosiveMode:'hours'}});assert.ok(!subject(store,'mage').traits.includes('Sang corrosif'));assert.equal(subject(store,'mage').extensions.v5.spellEffects.at(-1).expiresAtRound,1441);
});
test('Arcanes — V5 p. 245 : collision taille égale à terre sans Blessure, distance surpuissante chiffrée',async()=>{
 const row=rowFor('Push'),{store}=await fixture(row);const p=await execute(store,row,{overcastSpecific:{push:1},secondaryTargets:{collision:['mage']},targetTests:{foe:{damageRoll:7},mage:{targetSize:4,pushedSize:4}}});
 assert.equal(p.targetResults[0].quantifiedReminder.repousse,12);assert.equal(subject(store,'mage').hp,10);assert.equal(level(subject(store,'mage'),'À Terre'),1);
});
test('Arcanes — V5 p. 244 : objet 1+DR final, distance +BFM payée, opposition FM/Force et dés absents',async()=>{
 const row=rowFor('Move Object'),{store}=await fixture(row);const p=await execute(store,row,{overcastSpecific:{distance:1}});assert.equal(p.targetResults[0].quantifiedReminder.dimensionMax,13);assert.equal(p.targetResults[0].quantifiedReminder.distance,12);
 const fractional=spellInput(row,{sl:12,roll:undefined,domainFacts:{objectSentient:false,objectDimension:3.5},targetTests:{foe:{objectId:'blade'}}});assert.equal(store.previewSpellExecution(contractFor(row[0]).id,fractional).ready,true,'V5 p. 244 : une dimension réelle en mètres peut être décimale');
 const e=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellId===contractFor(row[0]).id),input={effectId:e.id,targetId:'foe',kind:'opposed-move',roll:25,opponentRoll:95};assert.equal(store.previewSpellInteraction({...input,opponentRoll:undefined}).ready,false);assert.match(store.previewSpellInteraction(input).summary,/objet déplacé/);assert.match(store.previewSpellInteraction({...input,roll:95,opponentRoll:25}).summary,/retenu/);
});
test('Arcanes — V5 p. 243 : les huit Souffles, cible voisine limitée par BI et choix de Domaine obligatoire',async()=>{
 const row=rowFor('Breath'),bonuses={metal:4,beasts:2,light:2,heavens:2,fire:5,death:2,life:2,shadow:0};
 for(const [lore,bonus] of Object.entries(bonuses)){
  const {store}=await encounter({mage:{talents:[{id:'talent-arcane-magic',status:'resolved',specialization:lore,rank:1}]}});const p=await execute(store,row,{chosenLore:lore,targetTests:{foe:{distance:26,opposeBreath:false}},ctRoll:25});assert.equal(p.targetResults[0].damage?.rawDamage||0,lore==='shadow'?0:6+bonus);
  assert.equal(store.previewSpellExecution(contractFor(row[0]).id,spellInput(row,{sl:12,roll:undefined,chosenLore:lore,targetIds:['foe','mage'],targetTests:{foe:{distance:26,opposeBreath:false},mage:{fromPrimary:6,opposeBreath:false}}})).ready,false);
 }
 const {store}=await encounter({mage:{talents:[{id:'talent-arcane-magic',status:'resolved',specialization:'Feu',rank:1},{id:'talent-arcane-magic',status:'resolved',specialization:'Cieux',rank:1}]}});assert.equal(store.previewSpellExecution(contractFor(row[0]).id,spellInput(row,{chosenLore:undefined})).ready,false);
});
test('Arcanes — V5 p. 301 : les 29 profils source, dégâts, mains et portées après application Store',async()=>{
 const expected=[['dagger',2,1,'very-short'],['knife',1,1,'very-short'],['hand-weapon',4,1,'average'],['improvised',1,1,'average'],['net',null,1,'short'],['sword',4,1,'average'],['garrote',2,2,'personal'],['knuckles',2,1,'personal'],['unarmed',0,1,'personal'],['cavalry-hammer',5,2,'long'],['lance',6,1,'very-long'],['buckler',1,1,'personal'],['foil',3,1,'average'],['main-gauche',2,1,'short'],['rapier',4,1,'long'],['swordbreaker',1,1,'short'],['flail',4,1,'average'],['grain-flail',3,2,'long'],['military-flail',5,2,'long'],['whip',2,1,'very-long'],['halberd',5,2,'long'],['pike',4,2,'massive'],['staff',3,2,'long'],['spear',4,2,'very-long'],['bastard-sword',5,2,'long'],['greataxe',6,2,'long'],['pick',5,2,'long'],['warhammer',6,2,'long'],['zweihander',5,2,'long']];
 assert.equal(Object.keys(ARCANE_WEAPON_PROFILES).length,29);
 for(const [key,damage,hands,reach] of expected){const {store}=await fixture(rowFor('Aethyric Arms'));await execute(store,rowFor('Aethyric Arms'),{domainFacts:{weaponKey:key,weaponSkillScore:53}});const a=subject(store,'mage').actions.find(a=>a.extensions?.v5?.spellEffectId);assert.equal(a.damage,damage??0,key);assert.equal(a.base,['dagger','knife','hand-weapon','improvised','net','sword','garrote','knuckles','unarmed'].includes(key)?50:53,'V5 p. 301 / retour D2 : score de fiche quand disponible, saisie seulement pour compétence absente : '+key);assert.equal(ARCANE_WEAPON_PROFILES[key].hands,hands);assert.equal(ARCANE_WEAPON_PROFILES[key].reach,reach);}
});
for(const row of arcaneCases)test('Arcanes — V5 p. '+row[1]+' : '+row[0]+' — chaque option payée isolément, coût/durée/portée/cibles',async()=>{
 const c=contractFor(row[0]);for(const option of c.overcast.options.filter(o=>o!=='special')){const {store}=await fixture(row);const p=await execute(store,row,{overcastChoices:{[option]:option==='aoe'?3:2}});assert.equal(p.castingPreview.overcast.totalSpent,option==='aoe'?3:2);}
 for(const option of c.overcast.specific || []){const {store}=await fixture(row);await execute(store,row,{overcastSpecific:{[option.id]:1}});}
});
