import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import * as miscasts from '../js/core/v5-magic-miscasts.js';
import { previewChannelling, calculateMagicArmorPenalty } from '../js/core/v5-magic-channelling.js';
import { magicTalentRank, magicalSenseReceipts } from '../js/core/v5-magic-talents.js';
import { previewV5Test, selectV5Test } from '../js/core/v5-roll.js';
import { getSpellContract } from '../js/core/v5-spell-contracts.js';

const talent = (id, rank = 1) => ({ id: 'talent-' + id, status: 'resolved', rank });
const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }, { name: 'Focalisation (Haute Magie)', total: 60 }],
  talents: [], states: [], equipment: [], extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 10 } } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id,
    order: people.map(p => p.id), participants: people }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id = 'mage') => store.listParticipants().find(p => p.id === id);

test('L-03 — V5 p. 239, D-11 : Regard maudit dure en heures et suspend les talents sensoriels', async () => {
  const store = await combat(wizard('mage', { talents: [talent('magical-sense')] }));
  await store.applyMiscast(store.previewMiscast({ severity: 'MAJOR', roll: 38, secondaryRolls: { duration: 2 } }), { actorId: 'mage' });
  const actor = person(store), effect = actor.extensions.v5.miscastEffects?.find(e => e.unremovable);
  assert.ok(effect); assert.equal(effect.remainingMinutes, 120); assert.equal(effect.expiresAtRound, 721);
  const state = actor.states.find(s => s.key === 'aveugle');
  assert.equal(state.duration, null); assert.equal(state.source.miscastEffectId, effect.id);
  assert.equal(magicTalentRank(actor, 'magical-sense'), 0);
  assert.deepEqual(magicalSenseReceipts(wizard('caster'), [actor]), []);
  await store.undo(); assert.equal(magicTalentRank(person(store), 'magical-sense'), 1);
});

test('L-03/L-04 — V5 p. 239 : expiration pure retire seulement les occurrences de cet incident', async () => {
  const store = await combat(wizard('mage', { traits: ['Distracting'], states: [{ id: 'base-blind', name: 'Aveuglé' }] }));
  for (const roll of [8, 38]) await store.applyMiscast(store.previewMiscast({ severity: 'MAJOR', roll, secondaryRolls: { duration: 1 } }), { actorId: 'mage' });
  const actor = person(store); assert.ok(actor.extensions.v5.miscastEffects.some(e => e.type === 'trait'));
  assert.equal(miscasts.isMiscastConditionLocked(actor, actor.states.find(s => s.source?.kind === 'miscast')), true);
  const after = miscasts.expireMiscastConsequences(actor, { minutes: 60 });
  assert.equal(after.extensions.v5.miscastEffects.length, 0);
  assert.deepEqual(after.states.map(s => s.id), ['base-blind']);
  assert.deepEqual(after.traits, ['Distracting']); assert.deepEqual(after.extensions.v5.temporaryTraits, []);
  assert.equal(actor.extensions.v5.miscastEffects.length, 2, 'Fonction pure');
});

test('L-06 — V5 p. 239 : Drain de puissance bloque le Talent employé pour lancer (pas la Focalisation), puis expire', async () => {
  const store = await combat(wizard());
  await store.applyMiscast(store.previewMiscast({ severity: 'MAJOR', roll: 18, secondaryRolls: { duration: 1 }, usedTalent: { id: 'talent-arcane-magic', lore: null } }), { actorId: 'mage' });
  assert.throws(() => store.previewCasting(getSpellContract('Carreau'), { actorId: 'mage', roll: 25 }), /Drain|Talent.*inutilisable/i);
  assert.equal(store.previewChannelling({ actorId: 'mage', roll: 25 }).ready, true, 'la Focalisation n’emploie pas le Talent de lancement');
  await store.advanceTalentMinutes(1); assert.doesNotThrow(() => store.previewCasting(getSpellContract('Carreau'), { actorId: 'mage', roll: 25 }));
});

test('L-07 — V5 p. 238 : deux jets explicites, 91–100 relancés, sans modificateurs', async () => {
  const store = await combat(wizard());
  const base = { actorId: 'mage', severity: 'MINOR', roll: 93 };
  assert.equal(store.previewMiscast(base).ready, false);
  assert.equal(store.previewMiscast({ ...base, secondaryRolls: { additionalRolls: [92, 85] } }).ready, false);
  const p = store.previewMiscast({ ...base, modifier: 1, secondaryRolls: { additionalRolls: [70, 85] } });
  assert.equal(p.ready, true); assert.equal(p.details.results.length, 2);
  assert.deepEqual(p.details.results.map(r => r.modifier), [0, 0]);
  await store.applyMiscast(p, { actorId: 'mage' });
  assert.ok(person(store).states.some(s => s.key === 'hemorragique'));
  assert.equal(person(store).extensions.v5.corruptionPoints, 1);
  await store.undo(); assert.deepEqual(person(store).states, []);
});

test('L-07 — V5 p. 238 : les dés de durée de chaque sous-incident sont indépendants', async () => {
  const store = await combat(wizard());
  const input = { severity: 'MINOR', roll: 93, secondaryRolls: { additionalRolls: [3, 48] } };
  assert.equal(store.previewMiscast(input).ready, false);
  const p = store.previewMiscast({ ...input, secondaryRolls: { additionalRolls: [3, 48], additionalSecondaryRolls: [{ duration: 2 }, { duration: 4 }] } });
  assert.equal(p.ready, true); assert.deepEqual(p.details.results.map(r => r.details.duration.value), [2, 4]);
});

test('L-08/L-09 — V5 p. 236/p. 128 : pause exacte, journal correct, Mage de guerre disponible', async () => {
  const store = await combat(wizard('mage', { talents: [talent('war-wizard')], skills: [
    { name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 20 }, { name: 'Focalisation (Haute Magie)', total: 60 }, { name: 'Résistance', total: 90 }
  ] }), wizard('enemy', { camp: 'ennemi' }));
  const p = store.previewChannelling({ actorId: 'mage', mode: 'pause', roll: 55 });
  assert.equal(p.score, 20); assert.equal(p.success, false);
  await store.applyChannelling(p, { actorId: 'mage' });
  assert.equal(person(store).extensions.v5.magicAttemptTurn, undefined);
  assert.match(JSON.parse(store.getFullJSON()).log[0].text, /Pause.*réserve/i);
  assert.doesNotMatch(JSON.parse(store.getFullJSON()).log[0].text, /undefined/);
  assert.equal(store.previewCasting(getSpellContract('Carreau'), { actorId: 'mage', roll: 25, warWizard: true }).ready, true);
});

test('L-09 — V5 p. 236 : interruption appliquée via Store ne compte pas comme tentative magique', async () => {
  const store = await combat(wizard());
  const p = store.previewChannelling({ actorId: 'mage', mode: 'interruption', roll: 25 });
  await store.applyChannelling(p, { actorId: 'mage' });
  assert.equal(person(store).extensions.v5.magicAttemptTurn, undefined);
  assert.match(JSON.parse(store.getFullJSON()).log[0].text, /Interruption.*réserve/i);
  assert.doesNotMatch(JSON.parse(store.getFullJSON()).log[0].text, /undefined/);
});

test('L-10 — V5 p. 130 : choix keep périmé remplacé par l’unique inversion forcée', async () => {
  const store = await combat(wizard());
  const p = store.previewChannelling({ actorId: 'mage', roll: 19, choice: 'keep', disadvantageSources: [{ id: 'fixture' }] });
  assert.equal(p.test.roll, 91); assert.equal(p.test.optionId, 'reverse');
});

test('L-04 — V5 p. 239 : un trait d’incident disparaît au terme, une autre source reste active', async () => {
  const store = await combat(wizard());
  for (const duration of [1, 2]) await store.applyMiscast(store.previewMiscast({ severity: 'MAJOR', roll: 8, secondaryRolls: { duration } }), { actorId: 'mage' });
  const first = miscasts.expireMiscastConsequences(person(store), { minutes: 60 });
  assert.equal(first.traits.includes('Distracting'), true);
  assert.equal(first.extensions.v5.miscastEffects.length, 1);
  const second = miscasts.expireMiscastConsequences(first, { minutes: 60 });
  assert.deepEqual(second.traits, []); assert.deepEqual(second.extensions.v5.temporaryTraits, []);
});

test('L-11 — V5 pp. 114/121 : aperçu d’incident avec l’acteur du Store, acquisition canonique et interdiction prioritaire', async () => {
  const store = await combat(wizard());
  const input = { actorId: 'mage', severity: 'MINOR', roll: 15, instinctiveDiction: true, attunementRank: 2 };
  assert.equal(store.previewMiscast(input).cancelled, false);
  await store.updateParticipant('mage', { talents: [talent('instinctive-diction'), talent('aethyric-attunement')] });
  assert.equal(store.previewMiscast(input).ready, false);
  assert.equal(store.previewMiscast({ ...input, miscastRoll2: 50, miscastChoice: 'first' }).cancelled, true);
  await store.updateParticipant('mage', { extensions: { v5: { ...person(store).extensions.v5, specialStates: { forbidMitigation: true } } } });
  assert.equal(store.previewMiscast(input).cancelled, false);
});

test('L-13 — V5 p. 236, D-09 : critique = DR réels + 2 BFM, plancher conservé aux autres Tests', async () => {
  const store = await combat(wizard());
  const p = store.previewChannelling({ actorId: 'mage', roll: 55 });
  assert.equal(p.critical, true); assert.equal(p.sl, 1); assert.equal(p.gain, 11);
  assert.equal(selectV5Test(previewV5Test({ score: 60, roll: 55 }), 'keep').sl, 5);
});

test('L-13 — V5 p. 236, D-10 : alias coloré de la Focalisation unique reconnu pour les huit Vents', async () => {
  const store = await combat(wizard('mage', { skills: [{ name: 'Focalisation (Aqshy)', total: 80 }] }));
  assert.equal(store.previewChannelling({ actorId: 'mage', wind: 'Aqshy', roll: 25 }).score, 80);
  assert.equal(store.previewChannelling({ actorId: 'mage', wind: 'Hysh', roll: 25 }).score, 80);
  assert.equal(store.previewChannelling({ actorId: 'mage', type: 'high', roll: 25 }).score, 50);
});

test('L-14 — V5 p. 237, D-20 : equipped:false exclut l’armure de la pénalité magique', async () => {
  const armor = { id: 'plate', kind: 'armour', name: 'Plaques', layer: 'rigid', ap: 3, locations: ['body'], equipped: false };
  const store = await combat(wizard('mage', { equipment: [armor] }));
  assert.equal(store.previewChannelling({ actorId: 'mage', roll: 25 }).armorPenalty, 0);
  assert.equal(calculateMagicArmorPenalty(wizard('mage', { equipment: [{ ...armor, equipped: true }] })).penalty, -3);
});
