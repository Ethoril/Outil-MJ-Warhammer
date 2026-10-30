import test, { describe } from 'node:test';
import { arcaneCases, verifyArcanePetty, sourceCases, fixture, execute, spellInput, contractFor, pettyCases } from '../../helpers/lot3-arcane-fixture.js';
import assert from 'node:assert/strict';
import { encounter, subject, level, endTurn, contracts, verifySpell, cast, inputFor } from '../../helpers/lot3-domain-fixture.js';
import { ARCANE_WEAPON_PROFILES } from '../../../js/core/equipment.js';
import { magicWeaponBonus, magicWeaponHitConditions, magicGrantedActions } from '../../../js/core/v5-magic-combat.js';
import { getSpellContract } from '../../../js/core/v5-spell-contracts.js';
import { createStore } from '../../../js/core/store.js';
import { createCombatEngine } from '../../../js/core/combat.js';

describe('contrats Arcanes', () => {
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
test('Arcanes — V5 p. 243 : les huit Souffles, cible voisine limitée par BFM et choix de Domaine obligatoire',async()=>{
 const row=rowFor('Breath'),bonuses={metal:4,beasts:2,light:2,heavens:2,fire:5,death:2,life:2,shadow:0};
 for(const [lore,bonus] of Object.entries(bonuses)){
  const {store}=await encounter({mage:{talents:[{id:'talent-arcane-magic',status:'resolved',specialization:lore,rank:1}]}});const p=await execute(store,row,{chosenLore:lore,targetTests:{foe:{distance:26,opposeBreath:false}},ctRoll:25});assert.equal(p.targetResults[0].damage?.rawDamage||0,lore==='shadow'?0:6+bonus);
  const withCaster=store.previewSpellExecution(contractFor(row[0]).id,spellInput(row,{sl:12,roll:undefined,chosenLore:lore,targetIds:['foe','mage'],targetTests:{foe:{distance:26,opposeBreath:false},mage:{fromPrimary:60,opposeBreath:false}}}));
  assert.equal(withCaster.targetResults.some(r=>r.targetId==='mage'),false,'v3 : le lanceur parmi les voisins est ignoré (immunisé), pas refusé');
  assert.equal(store.previewSpellExecution(contractFor(row[0]).id,spellInput(row,{sl:12,roll:undefined,chosenLore:lore,targetIds:['mage'],targetTests:{mage:{fromPrimary:60,opposeBreath:false}}})).ready,false);
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
});

describe('contrats Bêtes', () => {
for (const c of contracts.filter(c => c.domain === 'beasts')) {
  test('Domaine V5 — ' + c.name + ' — Livre de base V5 p. ' + c.page + ' — Store, persistance, Undo et fin de tour réelle', () => verifySpell(c));
}
test('Bêtes — V5 p. 246 : Lance, PA naturels saisis sur une armure mixte uniquement', async () => {
  const c=contracts.find(c=>c.canonicalName==='The Amber Spear'),{store}=await encounter({foe:{armor:{head:3,body:3,arms:3,legs:3}}});
  await cast(store,c,{domainFacts:{...inputFor(c).domainFacts,naturalArmorAp:1}});
  assert.equal(subject(store,'foe').hp,12);
});
test('Bêtes — V5 p. 245 : Serres seulement sans arme, Hémorragique si des Blessures sont causées', async () => {
  const {store}=await encounter(); await cast(store,contracts.find(c=>c.canonicalName==='Amber Talons'));
  const mage=subject(store,'mage');
  assert.equal(magicWeaponBonus(mage,{type:'attack',id:'sword'},false,3),0);
  assert.equal(magicWeaponBonus(mage,{type:'attack',id:'unarmed'},false,0),4);
  assert.equal(magicWeaponHitConditions(mage,{type:'attack',id:'unarmed'},false,0).length,0);
  assert.equal(magicWeaponHitConditions(mage,{type:'attack',id:'unarmed'},false,1)[0].name,'Hémorragique');
});
test('Bêtes — V5 p. 246 : Nuée frappe à la vraie fin de Round, reste après Protection, disparaît à l’échéance', async () => {
  const {store,engine}=await encounter(); await cast(store,contracts.find(c=>c.canonicalName==='Flock of Doom'));
  await endTurn(engine); assert.equal(subject(store,'foe').hp,20);
  const p=engine.previewNextTurn(); assert.equal(p.ready,false); assert.ok(p.requests.some(r=>r.kind==='boolean'));
  await endTurn(engine); assert.equal(subject(store,'foe').hp,19);
  assert.equal(level(subject(store,'foe'),'Aveuglé'),1);
});
});

describe('contrats Cieux', () => {
for (const c of contracts.filter(c => c.domain === 'heavens')) {
  test('Domaine V5 — ' + c.name + ' — Livre de base V5 p. ' + c.page + ' — Store, persistance, Undo et fin de tour réelle', () => verifySpell(c));
}
test('Cieux — V5 p. 249 : la Comète attend le Round suivant et exige le guidage et les dés', async () => {
  const {store,engine}=await encounter(); await cast(store,contracts.find(c=>c.canonicalName==='Comet of Casandora'));
  await endTurn(engine); await endTurn(engine); assert.equal(subject(store,'foe').hp,20);
  await endTurn(engine); const pending=engine.previewNextTurn(); assert.equal(pending.ready,false);
  assert.ok(pending.requests.some(r=>r.kind==='boolean'));
});
});

describe('contrats Feu', () => {
for (const c of contracts.filter(c => c.domain === 'fire')) {
  test('Domaine V5 — ' + c.name + ' — Livre de base V5 p. ' + c.page + ' — Store, persistance, Undo et fin de tour réelle', () => verifySpell(c));
}
test('Feu — V5 p. 248 : Cœurs enflammés a pour portée Vous et zone Bonus Soc', () => {
  const c=contracts.find(c=>c.canonicalName==='Flaming Hearts');assert.equal(c.range,'Vous');assert.ok(c.target.includes('Sociabilité'));
});

test('Feu — V5 p. 248 : l’épée remplace BF+3 par BF+6 uniquement sur l’arme désignée', async () => {
  const {store}=await encounter(); await cast(store,contracts.find(c=>c.canonicalName==='Flaming Sword of Rhuin'),{targetIds:['mage']});
  const mage=subject(store,'mage'), action={type:'attack',extensions:{fiche:{equipmentId:'blade'}}};
  assert.equal(magicWeaponBonus(mage,action,false,3),3);
  assert.equal(magicWeaponBonus(mage,action,false,8),-2,'BF+8 est remplacé par BF+6, sans conserver le bonus ancien');
  assert.equal(magicWeaponBonus(mage,{...action,extensions:{fiche:{equipmentId:'other'}}},false,3),0);
});
test('Feu — V5 pp. 131/248 : Cautérisation, seuil stupéfiant −5 et exemption Feu', async () => {
  const c=contracts.find(c=>c.canonicalName==='Cauterise');
  const {store}=await encounter(); await cast(store,c,{targetTests:{foe:{roll:95}}});
  assert.equal(level(subject(store,'foe'),'Sonné'),1);
  await store.undo();
  const state=JSON.parse(store.getFullJSON());state.combat.participants.find(p=>p.id==='foe').talents=[{id:'talent-arcane-magic',name:'Magie des Arcanes',specialization:'Feu',rank:1,status:'resolved'}];await store.loadFromJSON(state);
  await cast(store,c,{targetTests:{}}); assert.equal(subject(store,'foe').hp,40,'MJ 12 octobre : 1 + DR final, plafonné aux Bmax'); assert.equal(level(subject(store,'foe'),'Sonné'),0);
});
test('Feu — V5 p. 248 : le Test Endurance lit la compétence française Résistance avant E', async () => {
  const {store}=await encounter({foe:{skills:[{name:'Résistance',total:75}]}});
  const p=await cast(store,contracts.find(c=>c.canonicalName==='Cauterise'),{targetTests:{foe:{roll:95}}});
  assert.equal(p.targetResults[0].resistanceTest.targetScore,75);assert.equal(level(subject(store,'foe'),'Sonné'),0);
});
test('Feu — V5 p. 248 : mur, traversée, Protection et Undo sans nouvelle incantation', async () => {
  const {store}=await encounter(); await cast(store,contracts.find(c=>c.canonicalName==='Firewall'));
  const effectId=subject(store,'foe').extensions.v5.spellEffects[0].id;
  assert.equal(store.previewSpellInteraction({effectId,targetId:'foe',kind:'trigger'}).ready,false);
  const before=store.listParticipants(); await store.applySpellInteraction({effectId,targetId:'foe',kind:'trigger',locationRoll:34});
  assert.equal(subject(store,'foe').hp,16); assert.equal(level(subject(store,'foe'),'Enflammé'),1);
  await store.undo(); assert.deepEqual(store.listParticipants(),before);
});
test('Feu — V5 p. 248 : centre +10, voisins +5, Protection préserve les états', async () => {
  const {store}=await encounter(); await store.applySpellEffects('foe',{ward:7,durationRounds:10});
  const p=await cast(store,contracts.find(c=>c.canonicalName==='Great Fires of U’Zhul'),{targetIds:['foe','mage'],targetTests:{foe:{wardRoll:10}}});
  assert.equal(p.targetResults[0].woundsLost,0); assert.equal(level(subject(store,'foe'),'Enflammé'),2);
  assert.equal(p.targetResults[1].missile.rawDamage,11);
});
test('Feu — V5 p. 248 : Protection demandée à nouveau pour le feu de fin de Round', async () => {
  const {store,engine}=await encounter();await store.applySpellEffects('foe',{ward:7,durationRounds:10});
  await cast(store,contracts.find(c=>c.canonicalName==='Great Fires of U’Zhul'),{targetTests:{foe:{wardRoll:10}}});
  const effect=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.roundEffect);
  await endTurn(engine);await endTurn(engine,{inputs:{foe:{['spell:'+effect.id+':ward0']:10}}});
  assert.equal(subject(store,'foe').hp,20);
});
});

describe('contrats Lumière', () => {
for (const c of contracts.filter(c => c.domain === 'light')) {
  test('Domaine V5 — ' + c.name + ' — Livre de base V5 p. ' + c.page + ' — Store, persistance, Undo et fin de tour réelle', () => verifySpell(c));
}
test('Lumière — V5 p. 252 : Fléau, éclair seulement sur bannissement, observateurs désignés et exemption Hysh', async () => {
  const c=contracts.find(c=>c.canonicalName==='Daemonbane'),{store}=await encounter({foe:{traits:['Démoniaque']}});
  await cast(store,c,{secondaryTargets:{engaged:['mage']}});assert.equal(level(subject(store,'mage'),'Aveuglé'),3);
  await store.undo();const state=JSON.parse(store.getFullJSON());state.combat.participants.find(p=>p.id==='foe').caracs.E=80;await store.loadFromJSON(state);
  await cast(store,c,{secondaryTargets:{engaged:['mage']}});assert.equal(level(subject(store,'mage'),'Aveuglé'),0);
});
test('Lumière — V5 p. 251 : Bannissement accorde Instable, déjà Instable tombe à 0 B', async () => {
  const spell=contracts.find(c=>c.canonicalName==='Banishment');
  const {store,engine}=await encounter({foe:{traits:['Mort-vivant']}});
  await cast(store,spell); assert.ok(subject(store,'foe').traits.includes('Instable'));
  await endTurn(engine); await endTurn(engine); assert.ok(subject(store,'foe').traits.includes('Instable'),'un effet instantané ne retire pas le trait au Round suivant');
  const other=await encounter({foe:{traits:['Mort-vivant','Instable']}}); await cast(other.store,spell); assert.equal(subject(other.store,'foe').hp,0);
});
test('Lumière — V5 p. 252 : Filet immunité Bestial, sinon Sonné non récupérable et M nul', async () => {
  const {store}=await encounter({foe:{traits:['Bestial']}}); const p=await cast(store,contracts.find(c=>c.canonicalName==='Net of Amyntok'));
  assert.equal(p.targetResults[0].resisted,true); assert.equal(level(subject(store,'foe'),'Sonné'),0);
});
test('Lumière — V5 p. 251 : Clarté ignore Sonné mais conserve Exténué dans les processus mentaux', async () => {
  const {store}=await encounter({foe:{states:[{name:'Sonné',level:2},{name:'Exténué',level:2}]}});
  await cast(store,contracts.find(c=>c.canonicalName==='Clarity of Thought'));
  const p=store.previewCasting(contracts.find(c=>c.canonicalName==='Healing Light'),{actorId:'foe',roll:25});
  assert.equal(p.testSl,5,JSON.stringify(p.test.details));
});
test('Lumière — V5 p. 252 : Filet garde Sonné après expiration, récupération par Intelligence', async () => {
  const {store,engine}=await encounter(); await cast(store,contracts.find(c=>c.canonicalName==='Net of Amyntok'));
  const state=JSON.parse(store.getFullJSON()); state.combat.round=7; state.combat.currentActorId='mage'; await store.loadFromJSON(state);
  await endTurn(engine); assert.equal(subject(store,'foe').caracs.M,4); assert.equal(level(subject(store,'foe'),'Sonné'),1);
  assert.equal(subject(store,'foe').states.find(s=>s.name==='Sonné').recoveryStat,'Int');
});
});

describe('contrats Métal', () => {
for (const c of contracts.filter(c => c.domain === 'metal')) {
  test('Domaine V5 — ' + c.name + ' — Livre de base V5 p. ' + c.page + ' — Store, persistance, Undo et fin de tour réelle', () => verifySpell(c));
}
test('Métal — V5 pp. 253/299 : Plume, paliers propres à chaque destinataire', async () => {
  const c=contracts.find(c=>c.canonicalName==='Feather of Lead'),{store}=await encounter();
  await cast(store,c,{targetIds:['foe','mage'],targetTests:{foe:{encumbranceStep:0,unburdenedM:4,unburdenedAg:50},mage:{encumbranceStep:1,unburdenedM:4,unburdenedAg:50}}});
  assert.equal(subject(store,'foe').caracs.M,2);assert.equal(subject(store,'mage').caracs.M,0);
});
test('Métal — V5 p. 253 : Creuset blesse l’objet porté, épargne le porteur qui le tient ; Undo atomique', async () => {
  const c=contracts.find(c=>c.canonicalName==='Crucible of Chamon');
  const {store}=await encounter(); await cast(store,c);
  assert.equal(subject(store,'foe').hp,12); await store.undo(); assert.equal(subject(store,'foe').hp,20);
  await cast(store,c,{domainFacts:{objectId:'blade',objectMetal:true,objectMagical:false,objectWorn:false}});
  assert.equal(subject(store,'foe').hp,20);
});
});

describe('contrats Mineurs', () => {
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
});

describe('contrats Mort', () => {
for (const c of contracts.filter(c => c.domain === 'death')) {
  test('Domaine V5 — ' + c.name + ' — Livre de base V5 p. ' + c.page + ' — Store, persistance, Undo et fin de tour réelle', () => verifySpell(c));
}
test('Mort — V5 p. 247 : Caresse réduit Bmax et rend la réserve par paire de Blessures réelles', async () => {
  const {store}=await encounter(); const p=await cast(store,contracts.find(c=>c.canonicalName==='Caress of Laniph'));
  assert.equal(p.targetResults[0].woundsLost,12); assert.equal(subject(store,'foe').maxHp,34);
  assert.equal(subject(store,'mage').extensions.v5.channelling.sl,6);
});
test('Mort — V5 p. 247 : Vol de Vie retire Exténué même si la Protection annule les dégâts', async () => {
  const {store}=await encounter({mage:{states:[{name:'Exténué',level:2}]}});
  await store.applySpellEffects('foe',{ward:7,durationRounds:10});
  await cast(store,contracts.find(c=>c.canonicalName==='Steal Life'),{targetTests:{foe:{wardRoll:10}}});
  assert.equal(subject(store,'foe').hp,20); assert.equal(subject(store,'mage').hp,20); assert.equal(level(subject(store,'mage'),'Exténué'),0);
});
test('Mort — V5 p. 247 : Mort rapide tue à 0 B, Undo restaure', async () => {
  const {store}=await encounter({foe:{hp:0}}); const before=store.listParticipants();
  await cast(store,contracts.find(c=>c.canonicalName==='Swift Passing'));
  assert.equal(subject(store,'foe').extensions.v5.dead,true); assert.equal(subject(store,'foe').extensions.v5.cannotRaiseUndead,true);
  await store.undo(); assert.deepEqual(store.listParticipants(),before);
});
});

describe('contrats Ombres', () => {
for (const c of contracts.filter(c => c.domain === 'shadow')) {
  test('Domaine V5 — ' + c.name + ' — Livre de base V5 p. ' + c.page + ' — Store, persistance, Undo et fin de tour réelle', () => verifySpell(c));
}
test('Ombres — V5 pp. 169/254 : suffocation perd 1 B par Round, Inconscient à 0 B', async () => {
  const {store,engine}=await encounter({foe:{hp:1}}); await cast(store,contracts.find(c=>c.canonicalName==='Choking Shadows'));
  await endTurn(engine); await endTurn(engine); assert.equal(subject(store,'foe').hp,0); assert.equal(level(subject(store,'foe'),'Inconscient'),1);
});
test('Ombres — V5 p. 254 : Miasme, Perception +0 pour bouger ; réussite et échec', async () => {
  const {store}=await encounter(); await cast(store,contracts.find(c=>c.canonicalName==='Mystifying Miasma'));
  const effectId=subject(store,'foe').extensions.v5.spellEffects[0].id;
  await store.applySpellInteraction({effectId,targetId:'foe',kind:'move',roll:12}); assert.equal(level(subject(store,'foe'),'À Terre'),0);
  await store.applySpellInteraction({effectId,targetId:'foe',kind:'move',roll:98}); assert.equal(level(subject(store,'foe'),'À Terre'),1);
});
test('Ombres — V5 p. 255 : bruit déclaré termine l’Invisibilité sans toucher une autre couche', async () => {
  const {store}=await encounter(); await cast(store,contracts.find(c=>c.canonicalName==='Shroud of Invisibility'));
  await store.applySpellEffects('foe',{id:'other',statModifiers:{F:10},durationRounds:4});
  const effectId=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.spellName==='Linceul d’Invisibilité').id;
  await store.applySpellInteraction({effectId,targetId:'foe',kind:'noise'}); assert.equal(subject(store,'foe').caracs.F,50); assert.equal(subject(store,'foe').extensions.v5.specialStates?.invisible,undefined);
});
test('Ombres — V5 pp. 255/327 : Destrier invoque le cheval, conserve le cavalier et expire à l’aube saisie', async () => {
  const {store,engine}=await encounter(); await cast(store,contracts.find(c=>c.canonicalName==='Shadowsteed'),{domainFacts:{minutesToDawn:1,sunlight:false,riding:false}});
  const horse=store.listParticipants().find(p=>p.extensions?.isAuxiliary);
  assert.ok(horse); assert.equal(horse.caracs.M,8); assert.equal(horse.maxHp,22); assert.equal(horse.caracs.F,45);
  assert.ok(horse.traits.includes('Éthéré')); assert.equal(subject(store,'foe').caracs.M,4);
  const state=JSON.parse(store.getFullJSON());state.combat.round=7;state.combat.currentActorId='mage';await store.loadFromJSON(state); await endTurn(engine);
  assert.ok(!store.listParticipants().some(p=>p.id===horse.id));
});
test('Ombres — V5 p. 255 : fin anticipée du sort retire sa monture, Undo la restaure', async () => {
  const {store}=await encounter();await cast(store,contracts.find(c=>c.canonicalName==='Shadowsteed'));
  const id=subject(store,'foe').extensions.v5.spellEffects.find(e=>e.specialState?.shadowsteed).id;
  await store.applySpellInteraction({effectId:id,targetId:'foe',kind:'end'});
  assert.equal(store.listParticipants().filter(p=>p.extensions?.isAuxiliary).length,0);
  await store.undo();assert.equal(store.listParticipants().filter(p=>p.extensions?.isAuxiliary).length,1);
});
});

describe('contrats Vie', () => {
for (const c of contracts.filter(c => c.domain === 'life')) {
  test('Domaine V5 — ' + c.name + ' — Livre de base V5 p. ' + c.page + ' — Store, persistance, Undo et fin de tour réelle', () => verifySpell(c));
}
test('Vie — V5 p. 250 : Sang de la Terre soigne BFM au début du Round, pas au lancer', async () => {
  const {store,engine}=await encounter(); await cast(store,contracts.find(c=>c.canonicalName==='Earthblood'));
  await endTurn(engine); await endTurn(engine); assert.equal(subject(store,'foe').hp,26);
});
test('Vie — V5 p. 251 : traversée de Forêt d’épines, Athlétisme −2, réussite et échec', async () => {
  const {store}=await encounter(); await cast(store,contracts.find(c=>c.canonicalName==='Forest of Thorns'));
  const effectId=subject(store,'foe').extensions.v5.spellEffects[0].id;
  await store.applySpellInteraction({effectId,targetId:'foe',kind:'trigger',roll:12}); assert.equal(level(subject(store,'foe'),'Hémorragique'),0);
  await store.applySpellInteraction({effectId,targetId:'foe',kind:'trigger',roll:98}); assert.equal(level(subject(store,'foe'),'Hémorragique'),1); assert.equal(level(subject(store,'foe'),'Enchevêtré'),1);
});
test('Vie — V5 pp. 251/360 : Régénération exige le d10, soigne au début du Round', async () => {
  const {store,engine}=await encounter(); await cast(store,contracts.find(c=>c.canonicalName==='Regenerate'));
  await endTurn(engine); const pending=engine.previewNextTurn(); assert.equal(pending.ready,false);
  assert.ok(pending.requests.some(r=>r.kind==='d10'));
  await endTurn(engine); assert.equal(subject(store,'foe').hp,21);
});
});

describe('contrats — retours sur les domaines du livre de base', () => {
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
});

describe('contrats — retours sur les Arcanes et Mineurs', () => {
const rowFor=name=>sourceCases.find(r=>r[0]===name);
test('Retours Lot 2 D3 : catégorie calculable par véritable aperçu sans fait, jamais par déclaration mjInput',async()=>{
 const names=['Arrow Shield','Dome','Teleport','Eavesdrop','Light','Magic Flame','Marsh Lights','Sounds','Chain Attack'];
 for(const name of names){const row=rowFor(name),{store}=await fixture(row),c=contractFor(name),input=spellInput(row,{domainFacts:{},targetTests:{},mjChoice:undefined,mjDuration:undefined,willpowerSuccess:undefined});const p=store.previewSpellExecution(c.id,input);assert.equal(p.ready,true,c.name+' : '+p.error);}
 const push=contractFor('Push'),distract=contractFor('Distracting');assert.ok(!push.effects.facts?.some(f=>f.key==='collisionDeclared'));assert.ok(!distract.effects.facts?.some(f=>f.key==='nearbyDeclared'));
});
test('Retours Lot 2 D2/D3 — V5 p. 301 : arme unique, score réellement lu sur la fiche, aperçu du modèle',async()=>{
 const row=rowFor('Aethyric Arms'),{store}=await fixture(row);await store.updateParticipant('mage',{skills:[...subject(store,'mage').skills,{name:'Corps à corps (Base)',total:55}]});
 const input=spellInput(row);delete input.domainFacts.weaponSkillScore;const p=store.previewSpellExecution(contractFor(row[0]).id,input);assert.equal(p.ready,true,p.error);await store.applySpellExecution(contractFor(row[0]).id,input);const mage=subject(store,'mage'),weapons=[...mage.actions,...magicGrantedActions(mage)].filter(a=>a.note?.includes('aethyrique'));assert.equal(weapons.length,1);assert.equal(weapons[0].base,55);assert.ok(p.targetResults[0].actions.some(a=>a.kind==='conjured-weapon'&&a.summary.includes('Épée')));
});
test('Retours Lot 2 D4 — V5 p. 255 : invisibilité finit aussi sur Choc/Éblouissant/Enchevêtrement/Sommeil/Chute',async()=>{
 for(const name of ['Shock','Dazzle','Entangle','Sleep','Drop']){const {store}=await fixture(rowFor(name));await cast(store,contractFor('Shroud of Invisibility'),{targetIds:['mage']});await execute(store,rowFor(name),{sl:12,roll:undefined});assert.ok(!subject(store,'mage').extensions.v5.spellEffects.some(e=>e.specialState?.invisible),name);}
});
test('Retours Lot 2 D5 — V5 p. 245 : zone maximale de Poussée ne se surpuissante pas',()=>assert.ok(!contractFor('Push').overcast.options.includes('aoe')));
test('Retours Lot 2 mutations — V5 p. 243 : Chaîne, égalité B=BE arrête, BFM rebonds, distance exacte et motif',async()=>{
 const row=rowFor('Chain Attack'),{store}=await encounter({foe:{caracs:{E:50},armor:{head:0,body:0,arms:0,legs:0}}});
 const p=await execute(store,row,{targetIds:['foe','mage'],targetTests:{mage:{nearest:true,distance:6}}});assert.equal(p.targetResults[0].woundsLost,5);assert.equal(p.targetResults[1].woundsLost,0);assert.match(p.targetResults[1].actions[0].summary,/Blessures.*5.*BE.*5/);
 const enough=await encounter({foe:{caracs:{E:0},armor:{head:0,body:0,arms:0,legs:0}}});const outside=spellInput(row,{targetIds:['foe','mage'],targetTests:{mage:{nearest:true,distance:6.01}}});assert.equal(enough.store.previewSpellExecution(contractFor(row[0]).id,outside).ready,false);
});
test('Retours Lot 2 mutations — V5 p. 242 : Source, quantités exactes à chaque vrai Round, plafond BI',async()=>{
 const row=rowFor('Spring'),{store,engine}=await fixture(row);await execute(store,row);const amounts=[];
 for(let r=1;r<=6;r++){await endTurn(engine);await endTurn(engine);const log=store.getLog().find(l=>l.detail?.quantity!==undefined);assert.ok(log,'reçu quantifié structuré');amounts.push(log.detail.quantity);}
 assert.deepEqual(amounts,[1,2,3,4,5,5]);
});
test('Retours Lot 2 D7 : apply/Undo/reload conserve exactement les alias de couches magiques',async()=>{
 const {store,persistence}=await encounter();await store.applySpellEffects('mage',{durationRounds:5,apModifiers:{all:1}});await store.applySpellEffects('mage',{durationRounds:3,statModifiers:{CC:10}});await store.undo();const before=store.listParticipants(),reloaded=createStore({persistence});await reloaded.ready;assert.equal(before[0].extensions.v5.spellEffects.length,1);assert.deepEqual(before[0].extensions.spellEffects,before[0].extensions.v5.spellEffects);assert.deepEqual(reloaded.listParticipants(),before);
});
test('Retours Lot 2 — V5 p. 131 : Souffle CT raté touche quand Esquive est pire, égalité au tireur',async()=>{
 const {store}=await fixture(rowFor('Breath'));const p=await execute(store,rowFor('Breath'),{ctRoll:95,targetTests:{foe:{distance:10,dodgeRoll:95}}});assert.equal(p.targetResults[0].breath.shot.success,false);assert.equal(p.targetResults[0].breath.shot.sl,p.targetResults[0].breath.defended.sl);assert.equal(subject(store,'foe').hp,35);
});
test('Retours Lot 2 D6 — V5 p. 243 : froid, prochain Round automatique en dernier, ordre courant préservé et défense +1',async()=>{
 const {store}=await fixture(rowFor('Breath'));const state=JSON.parse(store.getFullJSON());const third={...structuredClone(subject(store,'foe')),id:'third',name:'Third',initiative:10};state.combat.participants.push(third);state.combat.order=['mage','foe','third'];state.combat.orderMode='automatic';delete state.activeScene;await store.loadFromJSON(state);await store.updateParticipant('mage',{talents:[{id:'talent-arcane-magic',status:'resolved',specialization:'Bêtes',rank:1}]});
 await execute(store,rowFor('Breath'),{chosenLore:'beasts'});const p=store.previewResolution({actorId:'foe',targetId:'mage',action:{type:'attack',attr:'CC',base:50,damage:3},roll:25,defense:{attr:'CC',base:50,roll:25,v5:{kind:'melee',choice:'keep'}},v5:{kind:'melee',choice:'keep',actorSize:3,targetSize:3}});
 const modifiers=JSON.stringify(p);assert.match(modifiers,/spell-cold-defense/);assert.match(modifiers,/Défense contre le Souffle froid[^}]*"amount":1/);
 const engine=createCombatEngine(store);await endTurn(engine);assert.equal(store.getCombat().currentActorId,'foe');await endTurn(engine);assert.equal(store.getCombat().currentActorId,'third');await endTurn(engine);assert.deepEqual(store.getCombat().order,['mage','third','foe']);
 assert.deepEqual(store.getEffectiveOrder(),['mage','third','foe'],'ordre visible = moteur');
});
test('Retours Lot 2 mutations — V5 p. 243 : Chaîne exactement six rebonds, septième refusé ; 6m admis, 6.01m refusé',async()=>{
 const row=rowFor('Chain Attack'),{store}=await fixture(row);const state=JSON.parse(store.getFullJSON()),template=structuredClone(subject(store,'foe'));state.combat.participants=state.combat.participants.slice(0,1);const ids=[];
 for(let n=0;n<8;n++){const id='chain-'+n;ids.push(id);state.combat.participants.push({...structuredClone(template),id,name:id,caracs:{...template.caracs,E:0},armor:{head:0,body:0,arms:0,legs:0},armorLocations:{head:0,body:0,rightArm:0,leftArm:0,rightLeg:0,leftLeg:0}});}state.combat.order=['mage',...ids];delete state.activeScene;await store.loadFromJSON(state);
 const p=await execute(store,row,{targetIds:ids,targetTests:Object.fromEntries(ids.map(id=>[id,{nearest:true,distance:6}]))});assert.deepEqual(p.targetResults.map(r=>r.woundsLost),[10,9,8,7,6,5,4,0]);assert.match(p.targetResults[7].actions[0].summary,/limite de 6 rebonds/);
});
});
