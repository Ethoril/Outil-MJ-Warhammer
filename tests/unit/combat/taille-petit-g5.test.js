// G5-d (R13, recette du 22/11) : Petit (règle maison approuvée par le MJ) et Grande taille lisent la catégorie connue
// (creatureSizeOf : Trait, champ `size`, espèce du PJ) quand le MJ n'a rien choisi ; une Taille seulement supposée
// (Moyenne) donne un rappel non bloquant. Taille des créatures : p. 360.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';

const owned = id => ({ id: 'talent-' + id, status: 'resolved', rank: 1 });
const subject = (id, talents = [], extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'a' ? 'pj' : 'ennemi', hp: 200, maxHp: 200, zone: 'active',
  caracs: { CC: 60, CT: 60, F: 40, E: 30, Ag: 40, FM: 40, Soc: 60, Int: 60 }, talents, states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { hasMomentum: false } }, ...extra });
async function setup(actorTalents = [], actor = {}, target = {}) {
  const store = createStore({ storage: null });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], extensions: { v5: { combatId: 'g5-size', turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [subject('a', actorTalents, actor), subject('b', [], target)] }, diceLines: [], log: [] });
  return store;
}
const melee = (id, v5 = {}) => ({ resolutionId: id, actorId: 'a', targetId: 'b', action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, roll: 24,
  defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee', ...v5 } });
const sizeBlock = preview => preview.unresolved.filter(text => /catégories de Taille/.test(text));

test('Petit : l’espèce du PJ (Halfelin) et la Taille supposée de la cible suffisent, rappel non bloquant', async () => {
  const store = await setup([owned('small')], { race: 'Halfelin' });
  const preview = store.previewResolution(melee('g5-small'));
  assert.deepEqual(sizeBlock(preview), []);
  const explicit = store.previewResolution(melee('g5-small-explicit', { actorSize: 2, targetSize: 3 }));
  assert.equal(preview.score.base, explicit.score.base, 'même résultat que les Tailles saisies (Petite contre Moyenne)');
  assert.ok(preview.reminders.some(text => /Taille supposée/.test(text)), JSON.stringify(preview.reminders));
  assert.ok(!explicit.reminders.some(text => /Taille supposée/.test(text)), 'Tailles saisies : aucun rappel');
});

test('Petit : catégories connues des deux côtés (Traits), aucun rappel', async () => {
  const store = await setup([owned('small')], { traits: ['Taille (Petite)'] }, { traits: ['Taille (Grande)'] });
  const preview = store.previewResolution(melee('g5-small-known'));
  const explicit = store.previewResolution(melee('g5-small-known-explicit', { actorSize: 2, targetSize: 4 }));
  assert.deepEqual(sizeBlock(preview), []);
  assert.equal(preview.score.base, explicit.score.base);
  assert.ok(!preview.reminders.some(text => /Taille supposée/.test(text)));
});

test('Grande taille : Trait de la cible lu, Taille supposée de l’auteur rappelée, même défense que saisie à la main', async () => {
  const store = await setup([owned('large')], {}, { traits: ['Taille (Petite)'] });
  const preview = store.previewResolution(melee('g5-large'));
  const explicit = store.previewResolution(melee('g5-large-explicit', { actorSize: 3, targetSize: 2 }));
  assert.deepEqual(sizeBlock(preview), []);
  const penalty = p => p.defenderTest?.details?.modifiers?.find(row => row.id === 'talent:large-defense')?.amount;
  assert.equal(penalty(preview), penalty(explicit));
  assert.ok(preview.reminders.some(text => /Taille supposée/.test(text)), JSON.stringify(preview.reminders));
});
