import test from 'node:test';
import { contracts, verifySpell } from './helpers/lot3-domain-fixture.js';
import assert from 'node:assert/strict';
import { encounter, cast, subject, endTurn } from './helpers/lot3-domain-fixture.js';
for (const c of contracts.filter(c => c.domain === 'heavens')) {
  test('Domaine V5 — ' + c.name + ' — Livre de base V5 p. ' + c.page + ' — Store, persistance, Undo et fin de tour réelle', () => verifySpell(c));
}
test('Cieux — V5 p. 249 : la Comète attend le Round suivant et exige le guidage et les dés', async () => {
  const {store,engine}=await encounter(); await cast(store,contracts.find(c=>c.canonicalName==='Comet of Casandora'));
  await endTurn(engine); await endTurn(engine); assert.equal(subject(store,'foe').hp,20);
  await endTurn(engine); const pending=engine.previewNextTurn(); assert.equal(pending.ready,false);
  assert.ok(pending.requests.some(r=>r.kind==='boolean'));
});
