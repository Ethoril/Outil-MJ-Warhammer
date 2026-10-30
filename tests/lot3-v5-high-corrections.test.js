import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getSpellContract } from '../js/core/v5-spell-contracts.js';
import { prepareMagicOptions, applyMagicAttempt } from '../js/core/v5-magic-talents.js';
import * as high from '../js/core/v5-magic-high.js';

const wizard = (extra = {}) => ({ id: 'mage', name: 'Mage', kind: 'PJ', camp: 'pj', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }, { name: 'Focalisation (Haute Magie)', total: 60 }],
  talents: [], states: [], equipment: [], extensions: { v5: { channelling: { type: 'high', sl: 20 }, cadaiRunes: { deployed: 3, max: 5 } } }, ...extra });
async function combat(actor = wizard()) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: actor.id,
    order: [actor.id, 'enemy'], participants: [actor, { ...wizard(), id: 'enemy', name: 'Enemy', camp: 'ennemi' }] }, log: [], diceLines: [] });
  return store;
}

test('H-01 — HEPG p. 84 : Cadai refusé pour les Vents, Carreau, pause et interruption', async () => {
  const store = await combat();
  const rune = { actorId: 'mage', roll: 25, useCadaiRune: true, cadaiAccessible: true, cadaiRoll: 85 };
  assert.throws(() => store.previewChannelling(rune), /Haute Magie/);
  assert.throws(() => store.previewCasting(getSpellContract('Carreau'), rune), /Haute Magie/);
  for (const mode of ['pause', 'interruption']) assert.throws(() => store.previewChannelling({ ...rune, type: 'high', mode }), /Haute Magie/);
  assert.equal(store.previewChannelling({ ...rune, type: 'high' }).test.roll, 85);
});

test('H-01 — HEPG p. 84, D-05 : une rune par jet distinct, reçus et paiement exacts', () => {
  const actor = wizard();
  const input = { type: 'high', roll: 25, miscastRoll: 85, burnoutRoll: 2, cadaiAccessible: true,
    cadaiRerolls: [{ purpose: 'test', roll: 35 }, { purpose: 'miscast', roll: 50 }, { purpose: 'burnout', roll: 90 }] };
  const prepared = prepareMagicOptions(actor, 'casting', input, getSpellContract('Main de Gloire'));
  assert.equal(prepared.roll, 35); assert.equal(prepared.miscastRoll, 50); assert.equal(prepared.burnoutRoll, 90);
  assert.equal(prepared.cadaiReceipts.length, 3);
  const paid = applyMagicAttempt(actor, { actionType: 'casting', cadaiReceipts: prepared.cadaiReceipts });
  assert.equal(high.getCadaiRunes(paid).deployed, 0); assert.equal(high.getCadaiRunes(actor).deployed, 3);
  assert.throws(() => prepareMagicOptions(actor, 'casting', { ...input, cadaiRerolls: [{ purpose: 'test', roll: 35 }, { purpose: 'test', roll: 45 }] }, getSpellContract('Main de Gloire')), /une rune|même jet/i);
});

test('H-01 — HEPG p. 84 : relance de Corruption liée à une exécution de Haute Magie', () => {
  const input = { accessible: true, firstRoll: 85, reroll: 25, castExecutionId: 'high-cast', spell: getSpellContract('Main de Gloire') };
  const p = high.previewCadaiCorruptionReroll(wizard(), input);
  assert.equal(p.ready, true); assert.equal(p.test.roll, 25); assert.equal(p.castExecutionId, 'high-cast');
  assert.equal(high.previewCadaiCorruptionReroll(wizard(), { ...input, spell: getSpellContract('Carreau') }).ready, false);
  assert.equal(high.previewCadaiCorruptionReroll(wizard(), { ...input, castExecutionId: undefined }).ready, false);
});

test('H-02 — HEPG p. 84 : plafond Cadai suit le BFM courant, hausse et baisse', async () => {
  const store = await combat(wizard({ caracs: { ...wizard().caracs, FM: 70 } }));
  assert.equal(store.getCadaiRunes('mage').max, 7);
  await store.deployCadaiRune({ actorId: 'mage', roll: 25, conditionsConfirmed: true });
  assert.equal(store.getCadaiRunes('mage').deployed, 4);
  await store.updateParticipant('mage', { caracs: { FM: 20 } });
  assert.deepEqual(store.getCadaiRunes('mage'), { max: 2, deployed: 2 });
});

test('H-03 — HEPG pp. 85/86, V5 p. 237 : Focalisation secondaire des Arcanes pénalisée par armure et États', async () => {
  const armor = { id: 'plate', kind: 'armour', name: 'Plaques', layer: 'rigid', ap: 3, locations: ['body'] };
  const store = await combat(wizard({ equipment: [armor] }));
  const options = { actorId: 'mage', targetIds: ['enemy'], roll: 25, burnoutRoll: 50,
    arcaneTargets: { enemy: { magicItemPresent: true, focalisationRoll: 58, randomMagicItem: 'Anneau' } }, attributeActive: false };
  const p = store.previewSpellExecution('Destruction des Arcanes', options);
  assert.equal(p.ready, true, p.error);
  const secondary = p.targetResults[0].arcaneUnforgiving;
  assert.equal(secondary.focalisationTest.sl, -2); assert.equal(secondary.magicItemDestroyed, false);
  await store.updateParticipant('mage', { states: [{ name: 'Sonné', level: 2 }] });
  const q = store.previewSpellExecution('Destruction des Arcanes', { ...options, roll: 5 });
  assert.equal(q.targetResults[0].arcaneUnforgiving.focalisationTest.sl, -4);
});

test('H-04 — HEPG p. 105 : Exténué ignoré seulement en Focalisation et Incantation', async () => {
  const actor = wizard({ states: [{ name: 'Exténué', level: 2 }], extensions: { v5: { channelling: { type: 'high', sl: 20 },
    spellEffects: [{ id: 'eye', spellId: 'talent-eye-of-the-storm', magicTalentId: 'talent-eye-of-the-storm', magicTalentRank: 2 }] } } });
  const store = await combat(actor);
  assert.equal(store.previewChannelling({ actorId: 'mage', roll: 25 }).test.sl, 4);
  assert.equal(store.previewCasting(getSpellContract('Carreau'), { actorId: 'mage', roll: 25 }).test.sl, 4);
  assert.equal(store.previewChannelling({ actorId: 'mage', mode: 'pause', roll: 25 }).test.sl, 4, 'pause (v3 : Test de Focalisation Accessible +2 DR) : Exténué toujours appliqué');
  assert.equal(store.previewChannelling({ actorId: 'mage', mode: 'interruption', roll: 25 }).test.sl, -1);
});

test('H-01 — HEPG p. 84 : rune de Focalisation high consommée sur échec, Undo exact', async () => {
  const store = await combat();
  const p = store.previewChannelling({ actorId: 'mage', type: 'high', roll: 25, useCadaiRune: true, cadaiAccessible: true, cadaiRoll: 85 });
  await store.applyChannelling(p, { actorId: 'mage' });
  assert.equal(store.getCadaiRunes('mage').deployed, 2);
  await store.undo(); assert.equal(store.getCadaiRunes('mage').deployed, 3);
});

test('H-03 — HEPG pp. 83/86 : le Test secondaire tient compte de Lileath après réussite', async () => {
  const store = await combat(wizard({ talents: [{ id: 'talent-lileath-s-blessing', status: 'resolved', rank: 2 }] }));
  const p = store.previewSpellExecution('Destruction des Arcanes', { actorId: 'mage', targetIds: ['enemy'], roll: 25,
    arcaneTargets: { enemy: { magicItemPresent: true, focalisationRoll: 25, randomMagicItem: 'Anneau' } }, attributeActive: false });
  assert.equal(p.ready, true, p.error);
  assert.equal(p.targetResults[0].arcaneUnforgiving.focalisationTest.sl, 6);
});
