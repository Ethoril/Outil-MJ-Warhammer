import test from 'node:test';
import assert from 'node:assert/strict';
import { encounter, cast, subject } from './helpers/lot3-domain-fixture.js';
import { contracts, verifySpell } from './helpers/lot3-domain-fixture.js';
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
