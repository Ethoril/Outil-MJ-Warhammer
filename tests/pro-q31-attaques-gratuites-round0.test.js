import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { createGameClock } from '../js/core/v5-game-time.js';

// Q31 : avant le premier Round (pas de Tour courant), les attaques gratuites d'une créature sont acceptées, avec le quota rappelé,
// et le quota (8 tentacules du Kraken) est tenu.
const clone = value => structuredClone(value);
const L14 = JSON.parse(readFileSync('js/data/bestiary/L14.json', 'utf8')).profiles;

async function round0Store() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const kraken = buildParticipantFromBestiary('E0-P-488', { library: L14 });
  const actor = { ...kraken, id: 'beast', camp: 'ennemi', zone: 'active', hp: 100, maxHp: 100, states: [], equipment: [], extensions: { v5: { ...kraken.extensions.v5, hasMomentum: true } } };
  const hero = { id: 'hero', name: 'hero', kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 400, maxHp: 400, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 0, order: ['beast', 'hero'], participants: [actor, hero] }, log: [], diceLines: [], extensions: { v5: { combatId: 'q31' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return { store, tentacles: actor.actions.filter(action => /^Tentacles/.test(action.name)) };
}
const input = (action, n) => ({ resolutionId: `q31-${n}`, actorId: 'beast', targetId: 'hero', roll: 5, action: clone(action), defense: { base: 10, roll: 99, v5: { kind: 'melee' } }, v5: { kind: 'melee' } });

test('Q31 Kraken au Round 0 : l’attaque gratuite de tentacule est acceptée et le quota est rappelé', async () => {
  const { store, tentacles } = await round0Store();
  const preview = store.previewResolution(input(tentacles[0], 0));
  assert.ok(!preview.unresolved?.length, JSON.stringify(preview.unresolved));
  assert.ok(preview.reminders.some(text => /Avant le premier Round.*8/.test(text)), JSON.stringify(preview.reminders));
  const result = await store.applyResolution(preview);
  assert.equal(result.status, 'applied');
});

test('Q31 Kraken au Round 0 : la 9e attaque gratuite est refusée', async () => {
  const { store, tentacles } = await round0Store();
  let done = 0;
  for (const [n, action] of [...tentacles, tentacles[0]].entries()) {
    const preview = store.previewResolution(input(action, n));
    if (preview.unresolved?.length) break;
    if ((await store.applyResolution(preview)).status !== 'applied') break;
    done += 1;
  }
  assert.equal(done, 8);
});
