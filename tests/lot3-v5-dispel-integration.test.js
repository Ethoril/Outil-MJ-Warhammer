import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

// X-01 / D-03 : la réaction de dissipation est consommée par previewSpellExecution / applySpellExecution via le Store.
const wizard = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 55 }, { name: 'Focalisation', total: 60 }, { name: 'Focalisation (Haute Magie)', total: 100 }, { name: 'Savoir (Magie)', total: 60 }],
  talents: [], states: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const mage = (sl = 0) => wizard('mage', sl ? { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl } } } } : {});
const enemy = () => wizard('enemy', { camp: 'ennemi' });
const reaction = roll => ({ dispellerId: 'enemy', roll, distance: 10, visible: true });
const base = (castRoll, dispelRoll, extra = {}) => ({ actorId: 'mage', targetIds: ['enemy'], roll: castRoll, dispelReaction: reaction(dispelRoll), ...extra });

test('Carreau NI4 : Test 5 DR contre dissipation 3 DR — opposition gagnée, 2 DR < NI, sort raté, cible intacte', async () => {
  const store = await combat(mage(), enemy());
  const input = base(7, 24);
  const p = store.previewSpellExecution('Carreau', input);
  assert.equal(p.ready, true, p.error);
  assert.equal(p.dispelReaction.netSl, 2);
  assert.equal(p.dispelReaction.dispelled, false);
  assert.equal(p.spellSuccess, false);
  assert.equal(p.castFailed, true);
  assert.equal(p.totalCastingSl, 2);
  await store.applySpellExecution('Carreau', input);
  assert.equal(person(store, 'enemy').hp, 30);
  assert.equal(person(store, 'enemy').extensions.v5.dispelReactionRound, 1);
});

test('Test 1 DR + réserve 10 contre dissipation 4 DR — dissipé, aucun effet malgré la réserve, réserve consommée', async () => {
  const store = await combat(mage(10), enemy());
  const input = base(49, 14);
  const p = store.previewSpellExecution('Carreau', input);
  assert.equal(p.ready, true, p.error);
  assert.equal(p.dispelReaction.dispelled, true);
  assert.equal(p.dispelReaction.netSl, -3);
  assert.equal(p.dispelReaction.casterSlAfterDispel, 7);
  assert.equal(p.spellSuccess, false);
  assert.deepEqual(p.targetResults, []);
  await store.applySpellExecution('Carreau', input);
  assert.equal(person(store, 'enemy').hp, 30);
  assert.equal(person(store, 'mage').extensions.v5.channelling.sl, 0);
  assert.equal(person(store, 'enemy').extensions.v5.dispelReactionRound, 1);
});

test('Égalité Test 3 / dissipateur 3 : le lanceur gagne, total net + réserve comparé au NI', async () => {
  const store = await combat(mage(4), enemy());
  const p = store.previewSpellExecution('Carreau', base(26, 24));
  assert.equal(p.ready, true, p.error);
  assert.equal(p.dispelReaction.netSl, 0);
  assert.equal(p.dispelReaction.dispelled, false);
  assert.equal(p.castingPreview.totalCastingSl, 4);
  assert.equal(p.spellSuccess, true);
});

test('Sort non dissipé encore ≥ NI : effets appliqués avec le DR après dissipation ; surpuissance revérifiée', async () => {
  const store = await combat(mage(), enemy());
  const input = base(7, 43);
  const p = store.previewSpellExecution('Carreau', input);
  assert.equal(p.ready, true, p.error);
  assert.equal(p.spellSuccess, true);
  assert.equal(p.castingPreview.testSl, 4);
  assert.equal(p.castingPreview.surplus, 0);
  // 1 DR de surpuissance était disponible avant l'opposition (5 − NI 4) ; plus après (4 − 4).
  assert.equal(store.previewSpellExecution('Carreau', { ...input, dispelReaction: undefined, overcastChoices: { damage: 1 } }).ready, true);
  const refused = store.previewSpellExecution('Carreau', { ...input, overcastChoices: { damage: 1 } });
  assert.equal(refused.ready, false);
  assert.match(refused.error, /dissipation/i);
  await store.applySpellExecution('Carreau', input);
  assert.ok(person(store, 'enemy').hp < 30);
});

test('Haute Magie : sort dissipé sans jet d’épuisement ; non dissipé, le jet reste exigé', async () => {
  const caster = wizard('mage', { caracs: { ...wizard('x').caracs, FM: 10, Int: 100 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 30 } } } });
  const store = await combat(caster, wizard('enemy', { camp: 'ennemi', skills: [{ name: 'Langue (Magick)', total: 100 }] }));
  const input = { actorId: 'mage', targetIds: ['enemy'], roll: 25, arcaneOptions: { enhancedDamage: true }, arcaneTargets: { enemy: { magicItemPresent: false } } };
  assert.equal(store.previewSpellExecution('Destruction des Arcanes', input).status, 'burnout-roll-required');
  const dispelled = { ...input, dispelReaction: reaction(10) };
  const p = store.previewSpellExecution('Destruction des Arcanes', dispelled);
  assert.equal(p.ready, true, p.error);
  assert.equal(p.dispelReaction.dispelled, true);
  assert.equal(p.burnout, null);
  await store.applySpellExecution('Destruction des Arcanes', dispelled);
  assert.ok(!person(store, 'mage').extensions.v5.burnout?.active);
  assert.equal(person(store, 'enemy').hp, 30);
});

test('Undo — une seule commande restaure réserve, quota du dissipateur et PV', async () => {
  const store = await combat(mage(10), enemy());
  const before = store.listParticipants();
  await store.applySpellExecution('Carreau', base(49, 14));
  assert.notDeepEqual(store.listParticipants(), before);
  await store.undo();
  assert.deepEqual(store.listParticipants(), before);
});

test('Rune Cadai du dissipateur : refusée sur une dissipation de Carreau (HEPG p. 84), rien n’est consommé', async () => {
  const store = await combat(mage(), wizard('enemy', { camp: 'ennemi' }));
  await store.deployCadaiRune({ actorId: 'enemy', roll: 25, conditionsConfirmed: true });
  const before = store.getCadaiRunes('enemy').deployed;
  const participants = store.listParticipants();
  const input = base(7, 24);
  input.dispelReaction = { ...input.dispelReaction, useCadaiRune: true, cadaiAccessible: true, cadaiPurpose: 'test', cadaiRoll: 25 };
  assert.equal(store.previewSpellExecution('Carreau', input).ready, false);
  await assert.rejects(async () => store.applySpellExecution('Carreau', input));
  assert.equal(store.getCadaiRunes('enemy').deployed, before);
  assert.deepEqual(store.listParticipants(), participants);
});
