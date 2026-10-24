import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { previewCasting } from '../js/core/v5-magic-casting.js';
import { previewChannelling } from '../js/core/v5-magic-channelling.js';
import { resolveMiscast } from '../js/core/v5-magic-miscasts.js';
import { buildSlannBlock, readSlannInputs } from '../js/ui/slann-block.js';

// B9 : capacités des Slann (L07) branchées sur les profils E0-P-257 (4ᵉ génération : Maître des incidents) et E0-P-258 (2ᵉ : Puissance totale).
const clone = value => structuredClone(value);
const library = JSON.parse(readFileSync('js/data/bestiary/L07.json', 'utf8')).profiles;
const spell = { name: 'Dard', cn: 2, wind: 'fire', type: 'lore' };
const dice = { duration: 3, strength: 3, distance: 3, damage: 3, location: 3 };

async function table() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const make = (profile, id) => ({ ...buildParticipantFromBestiary(profile, { library, zone: 'active' }), id, camp: 'ennemi', states: [] });
  const hero = { id: 'hero', name: 'hero', kind: 'PJ', camp: 'pj', zone: 'active', initiative: 30, hp: 10, maxHp: 10, caracs: { Int: 40, FM: 40 }, traits: [], talents: [], states: [], extensions: { v5: {} } };
  const participants = [make('E0-P-257', 'master'), make('E0-P-258', 'power'), hero];
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: ['master', 'power', 'hero'], participants }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b9' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const get = (store, id) => store.getCombat().participants.get(id);
const texts = (store, id) => store.getParticipantReminders(id).map(item => item.text).join('\n');

test('B9 : rappels de capacités slann sur la carte du Slann, pas sur celle du PJ ; Téléportation de secours', async () => {
  const store = await table();
  assert.match(texts(store, 'master'), /Palanquin \(palanquinTraits\)/);
  assert.match(texts(store, 'master'), /Maître des incidents \(mishapSeverity\)/);
  assert.doesNotMatch(texts(store, 'master'), /Au sol/);
  assert.doesNotMatch(texts(store, 'master'), /Action gratuite : lancer Téléportation/);
  assert.equal(store.getParticipantReminders('hero').length, 0);
  await store.updateParticipant('master', { hp: 8 });
  assert.match(texts(store, 'master'), /Action gratuite : lancer Téléportation/);
});

test('B9 : Slann au sol, −3 aux lancements et à la Focalisation, annulable', async () => {
  const store = await table();
  const modifiers = id => previewCasting(get(store, id), spell, { roll: 50 }).test.details.modifiers.filter(item => item.id === 'slann-ground');
  assert.equal(modifiers('master').length, 0);
  assert.equal((await store.setSlannAboard('master', false)).ok, true);
  assert.deepEqual(modifiers('master').map(item => item.amount), [-3]);
  assert.match(texts(store, 'master'), /Au sol : -3/);
  const channelling = previewChannelling(get(store, 'master'), { type: 'winds', roll: 50 });
  assert.ok(JSON.stringify(channelling).includes('slann-ground'));
  await store.undo();
  assert.equal(modifiers('master').length, 0);
  assert.equal((await store.setSlannAboard('hero', false)).ok, false);
});

test('B9 : Maître des incidents, un incident Majeur devient Mineur sauf à travers un autre mage', async () => {
  const store = await table();
  const master = get(store, 'master');
  const lowered = resolveMiscast({ participant: master, severity: 'MAJOR', roll: 50, secondaryRolls: dice });
  assert.equal(lowered.table, 'MINOR');
  assert.equal(lowered.slannLowered, true);
  const via = resolveMiscast({ participant: master, severity: 'MAJOR', roll: 50, viaTelepathy: true, secondaryRolls: dice });
  assert.equal(via.table, 'MAJOR');
  const plain = resolveMiscast({ participant: get(store, 'hero'), severity: 'MAJOR', roll: 50, secondaryRolls: dice });
  assert.equal(plain.table, 'MAJOR');
});

test('B9 : Puissance totale, une unité 0 réussie est critique pour le Slann concerné seulement', async () => {
  const store = await table();
  const power = previewCasting(get(store, 'power'), spell, { roll: 30 });
  assert.equal(power.testSuccess, true);
  assert.equal(power.critical, true);
  assert.ok(power.testSl >= 5);
  assert.equal(previewCasting(get(store, 'master'), spell, { roll: 30 }).critical, false);
  assert.equal(previewCasting(get(store, 'power'), spell, { roll: 98 }).critical, false);
});

test('B9 : Contemplation, la table donne Brume de pensée (deux Exténué), annulable ; le bloc de carte est rendu', async () => {
  const store = await table();
  const refused = await store.applySlannContemplation('master', null);
  assert.equal(refused.ok, false);
  const done = await store.applySlannContemplation('master', -2);
  assert.equal(done.ok, true);
  assert.equal(done.outcome, 'fog');
  const fatigue = () => get(store, 'master').states.filter(state => /extenu/i.test(state.key || state.name)).reduce((sum, state) => sum + (state.level || 1), 0);
  assert.equal(fatigue(), 2);
  await store.undo();
  assert.equal(fatigue(), 0);
  assert.equal((await store.applySlannContemplation('hero', 3)).ok, false);
  const made = [];
  const createElement = tag => { const el = { tag, children: [], dataset: {}, appendChild(child) { this.children.push(child); }, querySelector() { return { value: '-2' }; } }; made.push(el); return el; };
  const block = buildSlannBlock(createElement, get(store, 'master'));
  assert.ok(made.some(el => el.className === 'tiny btn-slann-aboard'));
  assert.ok(made.some(el => el.className === 'tiny btn-slann-contemplation'));
  assert.equal(buildSlannBlock(createElement, get(store, 'hero')), null);
  assert.deepEqual(readSlannInputs(block), { sl: -2 });
});
