import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { previewBeastForm, BEAST_PROFILES, KADON_PROFILES, transformationTraitsError, optionalTransformationTraits } from '../js/core/v5-magic-arbitrations.js';
import { transformationRestrictions } from '../js/core/v5-magic-combat.js';
import { processCombatTurnSpells } from '../js/core/v5-magic-turn.js';

const wizard = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }], talents: [], states: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 30 } } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const wolf = { actorId: 'mage', targetIds: ['mage'], roll: 25, sl: 8, beastKey: 'wolf', attributeActive: false };
const kadonOther = { actorId: 'c2', targetIds: ['mage'], sl: 20, monsterKey: 'troll', kadonOtherTarget: true,targetTests:{mage:{unwilling:false}} };

test('transformation refusée sur une cible déjà transformée, à l’aperçu et à l’application', async () => {
  const store = await combat(wizard('mage'), wizard('c2'));
  await store.applySpellExecution('Forme bestiale', wolf);
  const before = person(store, 'mage');
  for (const [name, options] of [['Transformation de Kadon', kadonOther]]) {
    const preview = store.previewSpellExecution(name, options);
    assert.equal(preview.ready, false, name);
    assert.match(preview.error, /déjà transformée/, name);
    await assert.rejects(async () => store.applySpellExecution(name, options), /déjà transformée/, name);
  }
  for (const isJade of [false, true]) assert.throws(() => previewBeastForm(before, BEAST_PROFILES.wolf, { isJade }), /déjà transformée/);
  const after = person(store, 'mage');
  assert.equal(after.extensions.v5.beastForm.kind, 'beast');
  assert.deepEqual(after.caracs, before.caracs);
  await store.revertBeastForm('mage');
  assert.equal(person(store, 'mage').caracs.F, 30);
});

test('dissipateur raté : DR négatif compté pour 0 dans le net', async () => {
  const store = await combat(wizard('d'), wizard('c'));
  const preview = store.previewDispelCasting({ testSl: 6, matchingReserve: 0, totalCastingSl: 6, cn: 4 }, { dispellerId: 'd', distance: 10, visible: true, roll: 87 });
  assert.equal(preview.dispelled, false);
  assert.equal(preview.dispellerSl, 0);
  assert.equal(preview.netSl, 6);
  assert.equal(preview.casterSlAfterDispel, 6);
});

test('Dex absente contrôlée quelle que soit la casse', async () => {
  const store = await combat(wizard('mage'));
  await store.applySpellExecution('Forme bestiale', wolf);
  const mage = person(store, 'mage');
  assert.ok(mage.extensions.v5.beastForm.absentCaracs.includes('Dex'));
  for (const attr of ['Dex', 'dex', 'DEX']) assert.equal(transformationRestrictions(mage, { attr }).length, 1, attr);
});

test('Kadon : saisie manuelle exigeant des nombres finis ≥ 0 non vides', async () => {
  const store = await combat(wizard('mage'));
  const profile = { name: 'X',size:'large', M: 6, hp: 40, caracs: { CC: 50, CT: 0, F: 60, E: 60, I: 40, Ag: 40, Dex: 0, Soc: 10 }, traits: [] };
  const run = value => store.previewSpellExecution('Transformation de Kadon', { actorId: 'mage', targetIds: ['mage'], sl: 20, monsterProfile: { ...profile, caracs: { ...profile.caracs, F: value } } });
  for (const bad of ['  ', '', [], [5], true, '12abc', Infinity, 'abc', -1, null]) assert.equal(run(bad).ready, false, JSON.stringify(bad));
  for (const good of [0, 60, '60']) assert.equal(run(good).ready, true, JSON.stringify(good));
});

test('Pieuvre des marais : Taille (Monstrueuse) en option, Énorme exclue de Forme bestiale seulement', () => {
  const octopus = KADON_PROFILES['bog-octopus'];
  assert.ok(octopus.optionalTraits.includes('Taille (Énorme)') && octopus.optionalTraits.includes('Taille (Monstrueuse)'));
  assert.equal(transformationTraitsError(octopus, ['Taille (Monstrueuse)'], 'kadon'), null);
  assert.equal(transformationTraitsError(octopus, ['Taille (Énorme)'], 'kadon'), null);
  assert.ok(optionalTransformationTraits(octopus, 'beast').includes('Taille (Monstrueuse)'));
  assert.ok(!optionalTransformationTraits(octopus, 'beast').includes('Taille (Énorme)'));
});

test('options de Taille mutuellement exclusives', () => {
  const spider = BEAST_PROFILES['giant-spider'];
  assert.equal(transformationTraitsError(spider, ['Taille (Moyenne)'], 'beast'), null);
  assert.match(transformationTraitsError(spider, ['Taille (Moyenne)', 'Taille (Grande)'], 'beast'), /une seule Taille/);
  assert.equal(transformationTraitsError(KADON_PROFILES['bog-octopus'], ['Taille (Énorme)', 'Taille (Monstrueuse)'], 'kadon') !== null, true);
});

test('Kadon sur autre cible : forme et marqueur expirent ensemble à la fin du tour du lanceur', async () => {
  const store = await combat(wizard('c2'), wizard('mage'));
  await store.applySpellExecution('Transformation de Kadon', kadonOther);
  const target = person(store, 'mage');
  const expires = target.extensions.v5.beastForm.expiresAtRound;
  assert.ok(target.extensions.v5.spellEffects.some(e => e.beastFormMarker));
  const others = store.listParticipants().filter(p => p.id !== 'mage');
  // Fin du tour de la cible : rien ne change.
  let result = processCombatTurnSpells([...others, target], expires, 'c2', { actorId: 'mage', round: expires });
  assert.ok(result.find(p => p.id === 'mage').extensions.v5.beastForm);
  assert.ok(result.find(p => p.id === 'mage').extensions.v5.spellEffects.some(e => e.beastFormMarker));
  // Fin du tour du lanceur : les deux ensemble.
  result = processCombatTurnSpells([...others, target], expires, 'mage', { actorId: 'c2', round: expires });
  const ended = result.find(p => p.id === 'mage');
  assert.equal(ended.extensions.v5.beastForm, undefined);
  assert.ok(!(ended.extensions.v5.spellEffects || []).some(e => e.beastFormMarker));
  assert.equal(ended.caracs.F, 30);
});
