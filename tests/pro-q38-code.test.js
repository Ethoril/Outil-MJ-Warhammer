import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { planNaturalAttack } from '../js/core/creature-combat.js';

// Q38, deux cas de code : (1) attaque gratuite de tentacule au Round 0 dans un store neuf, sans rencontre (aucune scène, pas de combatId) ;
// (2) ancien participant de Réserve à une seule action « Tentacles » et au Trait « Tentacles (+9) » : le nombre est demandé, pas un quota silencieux de 1.
const clone = value => structuredClone(value);
const L14 = JSON.parse(readFileSync('js/data/bestiary/L14.json', 'utf8')).profiles;

async function freshStore() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const kraken = buildParticipantFromBestiary('E0-P-488', { library: L14 });
  const actor = { ...kraken, id: 'beast', camp: 'ennemi', zone: 'active', hp: 100, maxHp: 100, states: [], equipment: [], extensions: { v5: { ...kraken.extensions.v5, hasMomentum: true } } };
  const hero = { id: 'hero', name: 'hero', kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 400, maxHp: 400, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, order: ['beast', 'hero'], participants: [actor, hero] }, log: [], diceLines: [], extensions: { v5: {} } });
  return { store, tentacles: actor.actions.filter(action => /^Tentacles/.test(action.name)) };
}
const input = (action, n) => ({ resolutionId: `q38-${n}`, actorId: 'beast', targetId: 'hero', roll: 5, action: clone(action), defense: { base: 10, roll: 99, v5: { kind: 'melee' } }, v5: { kind: 'melee' } });

test('Q38 store neuf sans rencontre : l’attaque gratuite de tentacule au Round 0 est acceptée et le quota rappelé', async () => {
  const { store, tentacles } = await freshStore();
  const preview = store.previewResolution(input(tentacles[0], 0));
  assert.ok(!preview.unresolved?.length, JSON.stringify(preview.unresolved));
  assert.ok(preview.reminders.some(text => /Avant le premier Round.*8/.test(text)), JSON.stringify(preview.reminders));
  assert.equal((await store.applyResolution(preview)).status, 'applied');
});

test('Q38 store neuf sans rencontre : le quota de 8 est tenu', async () => {
  const { store, tentacles } = await freshStore();
  let done = 0;
  for (const [n, action] of [...tentacles, tentacles[0]].entries()) {
    const preview = store.previewResolution(input(action, n));
    if (preview.unresolved?.length) break;
    if ((await store.applyResolution(preview)).status !== 'applied') break;
    done += 1;
  }
  assert.equal(done, 8);
});

const old = actions => ({ name: 'old', kind: 'PNJ', caracs: { F: 50 }, traits: ['Tentacles (+9)'], actions, armor: { head: 0, body: 0, arms: 0, legs: 0 } });

test('Q38 ancien participant à une seule action « Tentacles » : le nombre est demandé', () => {
  const plan = planNaturalAttack(old([{ name: 'Tentacles', type: 'attack' }]), 'tentacles');
  assert.equal(plan.available, false);
  assert.ok(plan.unresolved.some(text => /nombre de tentacules/.test(text)), JSON.stringify(plan.unresolved));
  assert.equal(plan.quota, null, 'pas de quota silencieux de 1');
});

test('Q38 le nombre donné par le MJ lève la question', () => {
  const plan = planNaturalAttack(old([{ name: 'Tentacles', type: 'attack' }]), 'tentacles', { count: 4 });
  assert.equal(plan.available, true);
  assert.equal(plan.quota.maximum, 4);
});
