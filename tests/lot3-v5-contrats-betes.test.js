import test from 'node:test';
import { contracts, verifySpell } from './helpers/lot3-domain-fixture.js';
import assert from 'node:assert/strict';
import { encounter, cast, subject, level, endTurn } from './helpers/lot3-domain-fixture.js';
import { magicWeaponBonus, magicWeaponHitConditions } from '../js/core/v5-magic-combat.js';
import { inputFor } from './helpers/lot3-domain-fixture.js';
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
