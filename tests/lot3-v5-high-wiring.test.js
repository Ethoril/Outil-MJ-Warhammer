import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

// H-01 (HEPG p. 84) : raccordement des runes des Cadai à l'incantation et à l'exécution d'un sort de Haute Magie.
const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'mage' ? 'pj' : 'ennemi', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }, { name: 'Focalisation (Haute Magie)', total: 60 }],
  talents: [], states: [], equipment: [], extensions: { v5: { channelling: { type: 'high', sl: 20 }, cadaiRunes: { deployed: 3, max: 5 } } }, ...extra });
async function combat(actor = wizard()) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: actor.id,
    order: [actor.id, 'enemy'], participants: [actor, wizard('enemy')] }, log: [], diceLines: [] });
  return store;
}
const rune = (extra = {}) => ({ actorId: 'mage', targetIds: ['enemy'], cadaiAccessible: true, ...extra });

test('H-01 — sort de Haute Magie : relance du Test par rune acceptée, payée une fois, Undo', async () => {
  const store = await combat();
  const input = rune({ roll: 95, cadaiRerolls: [{ purpose: 'test', roll: 25 }] });
  const p = store.previewSpellExecution('Apothéose', input);
  assert.equal(p.ready, true, p.error);
  assert.equal(p.castingPreview.roll, 25);
  assert.equal(p.castingPreview.cadaiReceipts.length, 1);
  await store.applySpellExecution('Apothéose', input);
  assert.equal(store.getCadaiRunes('mage').deployed, 2);
  await store.undo();
  assert.equal(store.getCadaiRunes('mage').deployed, 3);
});

test('H-01 — sort d’Arcane : relance par rune refusée, stock inchangé', async () => {
  const store = await combat();
  const input = rune({ roll: 95, targetIds: ['enemy'], cadaiRerolls: [{ purpose: 'test', roll: 25 }] });
  assert.throws(() => store.previewSpellExecution('Carreau', input), /Haute Magie/);
  await assert.rejects(async () => store.applySpellExecution('Carreau', input), /Haute Magie/);
  assert.equal(store.getCadaiRunes('mage').deployed, 3);
});

test('H-01 — rune d’incident ou d’épuisement non payée si le jet reste inutilisé', async () => {
  const store = await combat();
  const input = rune({ roll: 95, miscastRoll: 50, burnoutRoll: 50,
    cadaiRerolls: [{ purpose: 'test', roll: 25 }, { purpose: 'miscast', roll: 60 }, { purpose: 'burnout', roll: 90 }] });
  const p = store.previewSpellExecution('Apothéose', input);
  assert.equal(p.ready, true, p.error);
  assert.deepEqual(p.castingPreview.cadaiReceipts.map(r => r.purpose), ['test']);
  await store.applySpellExecution('Apothéose', input);
  assert.equal(store.getCadaiRunes('mage').deployed, 2);
});

test('H-01 — Test, incident et épuisement relancés : trois runes payées exactement une fois, Undo, doublon refusé', async () => {
  const store = await combat();
  const input = rune({ roll: 95, miscastRoll: 50, burnoutRoll: 50, overcastChoices: { duration: 8 },
    cadaiRerolls: [{ purpose: 'test', roll: 11 }, { purpose: 'miscast', roll: 60 }, { purpose: 'burnout', roll: 90 }] });
  const p = store.previewSpellExecution('Apothéose', input);
  assert.equal(p.ready, true, p.error);
  assert.deepEqual(p.castingPreview.cadaiReceipts.map(r => r.purpose), ['test', 'miscast', 'burnout']);
  assert.equal(p.burnout.roll, 90);
  await store.applySpellExecution('Apothéose', input);
  assert.equal(store.getCadaiRunes('mage').deployed, 0);
  await store.undo();
  assert.equal(store.getCadaiRunes('mage').deployed, 3);
  const twice = { ...input, cadaiRerolls: [{ purpose: 'test', roll: 11 }, { purpose: 'test', roll: 12 }] };
  assert.throws(() => store.previewSpellExecution('Apothéose', twice), /même jet/);
});

test('H-01 — aperçu d’incantation transmis tel que l’interface le fait : incident relancé accepté, reçu inventé refusé', async () => {
  const store = await combat();
  const { getSpellContract } = await import('../js/core/v5-spell-contracts.js');
  const spell = { ...getSpellContract('Apothéose'), type: 'high' };
  const input = { actorId: 'mage', roll: 95, miscastRoll: 50, cadaiAccessible: true,
    cadaiRerolls: [{ purpose: 'test', roll: 11 }, { purpose: 'miscast', roll: 60 }] };
  const castPreview = store.previewCasting(spell, input);
  assert.deepEqual(castPreview.cadaiReceipts.map(r => r.purpose), ['test', 'miscast']);
  const options = { ...input, targetIds: ['enemy'], castingPreview: castPreview, castResult: castPreview };
  const p = store.previewSpellExecution('Apothéose', options);
  assert.equal(p.ready, true, p.error);
  const forged = store.previewSpellExecution('Apothéose', { ...options, cadaiRerolls: [{ purpose: 'test', roll: 11 }] });
  assert.equal(forged.ready, false);
});

test('H-01 — relance de Corruption : liée à une exécution réelle de Haute Magie du lanceur, une fois par jet, Undo', async () => {
  const store = await combat();
  const reroll = (extra = {}) => ({ actorId: 'mage', castExecutionId: 'high-1', corruptionId: 'test-1', accessible: true, firstRoll: 85, reroll: 25, slModifier: -2, ...extra });
  assert.throws(() => store.rerollCorruptionWithCadai(reroll()), /exécution de Haute Magie/);
  await store.applySpellExecution('Apothéose', { actorId: 'mage', targetIds: ['enemy'], roll: 25, operationId: 'high-1' });
  await store.applySpellExecution('Carreau', { actorId: 'mage', targetIds: ['enemy'], roll: 25, operationId: 'arcane-1', reserveSl: 0 });
  assert.throws(() => store.rerollCorruptionWithCadai(reroll({ castExecutionId: 'arcane-1' })), /Haute Magie/);
  assert.throws(() => store.rerollCorruptionWithCadai(reroll({ actorId: 'enemy' })), /exécution de Haute Magie/);
  assert.equal(store.getCadaiRunes('mage').deployed, 3);
  await store.rerollCorruptionWithCadai(reroll());
  assert.equal(store.getCadaiRunes('mage').deployed, 2);
  const last = store.listParticipants().find(p => p.id === 'mage').extensions.v5.lastCadaiCorruption;
  assert.equal(last.castExecutionId, 'high-1'); assert.equal(last.corruptionId, 'test-1');
  assert.throws(() => store.rerollCorruptionWithCadai(reroll()), /au maximum pour ce jet/);
  await store.rerollCorruptionWithCadai(reroll({ corruptionId: 'test-2' }));
  assert.equal(store.getCadaiRunes('mage').deployed, 1);
  await store.undo(); await store.undo();
  assert.equal(store.getCadaiRunes('mage').deployed, 3);
  await store.rerollCorruptionWithCadai(reroll());
  assert.equal(store.getCadaiRunes('mage').deployed, 2, 'le marqueur a été restauré par Undo');
});
