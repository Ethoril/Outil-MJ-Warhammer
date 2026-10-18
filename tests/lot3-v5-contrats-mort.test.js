import test from 'node:test';
import { contracts, verifySpell } from './helpers/lot3-domain-fixture.js';
import assert from 'node:assert/strict';
import { encounter, cast, subject, level } from './helpers/lot3-domain-fixture.js';
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
