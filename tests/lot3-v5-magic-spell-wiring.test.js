import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

// H-06 (V5 pp. 122/236, D-07) et H-05 (HEPG p. 83, D-06) : raccordements du lancement de sort.
const talent = (id, rank = 1) => ({ id: 'talent-' + id, status: 'resolved', rank });
const person = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'mage' ? 'pj' : 'ennemi', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }, { name: 'Focalisation (Haute Magie)', total: 60 }],
  talents: [], states: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id,
    order: people.map(p => p.id), participants: people }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const find = (store, id) => store.listParticipants().find(p => p.id === id);

test('H-06 — Puissance totale : Résistance à la Magie ne fait plus échouer la cible sous le NI, −3 DR aux effets', async () => {
  const mage = person('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 0 } } } });
  const store = await combat(mage, person('resistant', { talents: [talent('magic-resistance')] }), person('plain'));
  const input = { actorId: 'mage', targetIds: ['resistant', 'plain'], roll: 11, criticalChoice: 'total-power', miscastRoll: 50, overcastChoices: { targets: 1 }, attributeActive: false };
  const p = store.previewSpellExecution('Carreau', input);
  assert.equal(p.ready, true, p.error);
  assert.equal(p.castingPreview.critical, true); assert.equal(p.castingPreview.totalCastingSl, 5);
  const [resistant, plain] = p.targetResults;
  assert.equal(resistant.resisted, undefined, 'la cible résistante n’est pas annulée');
  assert.equal(resistant.magicResistance, 3);
  assert.ok(resistant.actions.some(a => a.kind !== 'resisted'));
  assert.equal(plain.magicResistance, 0);
  assert.notEqual(plain.resisted, true);
  await store.applySpellExecution('Carreau', input);
  assert.ok(find(store, 'resistant').hp < 30);
});

test('H-06 — hors Puissance totale, le NI non atteint annule toujours la cible résistante', async () => {
  const mage = person('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 4 } } } });
  const store = await combat(mage, person('resistant', { talents: [talent('magic-resistance')] }));
  const p = store.previewSpellExecution('Carreau', { actorId: 'mage', targetIds: ['resistant'], roll: 49, attributeActive: false });
  assert.equal(p.ready, true, p.error);
  assert.equal(p.targetResults[0].resisted, true);
});
