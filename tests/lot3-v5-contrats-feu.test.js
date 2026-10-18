import test from 'node:test';
import { contracts, verifySpell } from './helpers/lot3-domain-fixture.js';
import assert from 'node:assert/strict';
import { encounter, cast, subject, level, endTurn } from './helpers/lot3-domain-fixture.js';
import { magicWeaponBonus } from '../js/core/v5-magic-combat.js';
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
