import test from 'node:test';
import { contracts, verifySpell } from './helpers/lot3-domain-fixture.js';
import assert from 'node:assert/strict';
import { encounter, cast, subject, level, endTurn } from './helpers/lot3-domain-fixture.js';
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
