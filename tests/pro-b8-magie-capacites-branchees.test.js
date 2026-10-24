import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { magicActionsFor, creatureCastingBases } from '../js/core/creature-magic.js';

// B8 : Lanceur de sorts et capacités propres du Slann de la cinquième génération (L07, E0-P-256).
const clone = value => structuredClone(value);
const library = JSON.parse(readFileSync('js/data/bestiary/L07.json', 'utf8')).profiles;
const libraryL23 = JSON.parse(readFileSync('js/data/bestiary/L23.json', 'utf8')).profiles;

async function table() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const slann = { ...buildParticipantFromBestiary('E0-P-256', { library, zone: 'active' }), id: 'slann', camp: 'ennemi', states: [] };
  const hero = { id: 'hero', name: 'hero', kind: 'PJ', camp: 'pj', zone: 'active', initiative: 30, hp: 10, maxHp: 10, caracs: { Int: 40, FM: 40 }, traits: [], talents: [], states: [], extensions: { v5: {} } };
  const horror = { ...buildParticipantFromBestiary('E0-P-789', { library: libraryL23, zone: 'active' }), id: 'horror', camp: 'ennemi', states: [] };
  const participants = [slann, hero, horror];
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: ['slann', 'hero', 'horror'], participants }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b8' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}

test('B8 : un Lanceur de sorts de bestiaire ouvre Focalisation, Dissipation et Incantation avec les bases du Trait', async () => {
  const store = await table();
  const slann = store.getCombat().participants.get('slann');
  assert.deepEqual(creatureCastingBases(slann), { focusBase: 95, tongueBase: 95 });
  const actions = magicActionsFor(slann);
  assert.deepEqual(actions.map(action => action.type), ['channelling', 'dispel', 'cast']);
  assert.equal(actions[0].base, 95);
  assert.equal(actions[2].base, 95);
  assert.deepEqual(magicActionsFor(slann, { channel: false, cast: false }).map(action => action.type), ['dispel']);
  assert.deepEqual(magicActionsFor(store.getCombat().participants.get('hero')), []);
  assert.equal(creatureCastingBases(store.getCombat().participants.get('hero')), null);
});

test('B8 : rappels de magie (Slann) et de capacités propres (Horreur rose, L23) sur la carte, pas sur celle du PJ', async () => {
  const store = await table();
  const texts = store.getParticipantReminders('slann').map(item => item.text).join('\n');
  assert.match(texts, /Lanceur de sorts :/);
  assert.match(texts, /Focalisation Volonté\+10/);
  const horror = store.getParticipantReminders('horror').map(item => item.text).join('\n');
  assert.match(horror, /Split \(T3 Déclencheurs de mort\) : Sur Blessure Critique/);
  assert.match(horror, /Rappel — Tzeentch’s Fire : Les Horreurs du même type/);
  assert.ok(store.getParticipantReminders('hero').length === 0);
});
