import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { planNaturalAttack } from '../js/core/creature-combat.js';

// Q20, décisions du MJ du 23/10 : les attaques au-delà de la première d'un multiplicateur (hors Tentacules, toutes gratuites) sont des
// attaques gratuites avec quota par Tour ; le quota des Tentacules est le nombre imprimé ; Souffle de Fumée sans dégâts ; dégâts du Trait V5.
const clone = value => structuredClone(value);
const book = id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles;
const L14 = book('L14'), L22 = book('L22'), L11 = book('L11');

async function fixture(beast) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const hero = { id: 'hero', name: 'hero', kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 400, maxHp: 400, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
  const actor = { ...beast, id: 'beast', camp: 'ennemi', zone: 'active', hp: 100, maxHp: 100, states: [], equipment: [], extensions: { v5: { ...beast.extensions.v5, hasMomentum: true } } };
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'beast', order: ['beast', 'hero'], participants: [actor, hero] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'q20' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const input = (action, n, extra = {}) => ({ resolutionId: `q20-${action.name}-${n}`, actorId: 'beast', targetId: 'hero', roll: 5, action: clone(action), defense: { base: 10, roll: 99, v5: { kind: 'melee' } }, v5: { kind: 'melee', ...extra } });
async function attacksUntilRefused(store, actions) {
  let done = 0;
  for (const [n, action] of actions.entries()) {
    let preview;
    try { preview = store.previewResolution(input(action, n)); } catch { break; }
    if (preview.unresolved?.length) break;
    const result = await store.applyResolution(preview);
    if (result.status !== 'applied') break;
    done += 1;
  }
  return done;
}

test('Q20 Kraken : 8 attaques gratuites de tentacule par Tour, la 9e est refusée', async () => {
  const kraken = buildParticipantFromBestiary('E0-P-488', { library: L14 });
  const tentacles = kraken.actions.filter(action => /^Tentacles/.test(action.name));
  assert.equal(tentacles.length, 8);
  const store = await fixture(kraken);
  const done = await attacksUntilRefused(store, [...tentacles, tentacles[0]]);
  assert.equal(done, 8);
});

test('Q20 quota des Tentacules : le nombre imprimé, pas la valeur d’attaque', () => {
  for (const [library, id, count] of [[L14, 'E0-P-488', 8], [L11, 'E0-P-027', 2], [L11, 'E0-P-028', 2]]) {
    const participant = buildParticipantFromBestiary(id, { library });
    const plan = planNaturalAttack(participant, 'tentacles');
    assert.equal(plan.quota.maximum, count, id);
  }
});

test('Q20 Carrion : Bec et première Griffe ordinaires, la seconde Griffe est gratuite (une par Tour)', async () => {
  const carrion = buildParticipantFromBestiary('E0-P-757', { library: L22 });
  const [first, second] = carrion.actions.filter(action => /^Claws/.test(action.name));
  assert.equal(first.extensions.v5.freeAttack, undefined);
  assert.equal(second.extensions.v5.freeAttack, 'all');
  const store = await fixture(carrion);
  const preview = store.previewResolution(input(second, 1));
  assert.ok(!preview.costs?.some(cost => cost.resource === 'momentum'), 'attaque gratuite : pas d’Élan');
  assert.equal(await attacksUntilRefused(store, [second, { ...second, name: 'Claws 2' }]), 1, 'une seule attaque gratuite de Griffes par Tour');
});

test('Q20 Souffle de Fumée : aucun dégât, même quand l’action imprimée en porte', () => {
  const plan = planNaturalAttack({ traits: ['Breath (Smoke)'], caracs: { F: 50, E: 30 } }, 'breath');
  assert.equal(plan.noDamage, true);
});

test('Q20 Souffle de Fumée par la résolution : 0 dégât', async () => {
  const store = await fixture({ name: 'beast', kind: 'PNJ', caracs: { CC: 60, CT: 60, F: 50, E: 30, I: 40, M: 4 }, traits: ['Breath (Smoke)'], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });
  const preview = store.previewResolution({ resolutionId: 'q20-smoke', actorId: 'beast', targetId: 'hero', roll: 10, action: { type: 'attack', base: 60, attr: 'CT', damage: 9 }, v5: { kind: 'ranged', context: { naturalAttack: 'breath' } } });
  assert.equal(preview.damage?.finalDamage ?? 0, 0);
});

test('Q20 profil V4 : les dégâts suivent la formule V5 du Trait, pas le chiffre imprimé', async () => {
  const store = await fixture({ name: 'beast', kind: 'PNJ', caracs: { CC: 60, CT: 60, F: 50, E: 30, I: 40, M: 4 }, traits: ['Tail'], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });
  const withTrait = store.previewResolution({ resolutionId: 'q20-tail', actorId: 'beast', targetId: 'hero', roll: 10, action: { type: 'attack', base: 60, attr: 'CC', damage: 3 }, v5: { kind: 'melee', context: { naturalAttack: 'tail', actorSize: 4, targetSize: 3 } } });
  const fixed = store.previewResolution({ resolutionId: 'q20-fixed', actorId: 'beast', targetId: 'hero', roll: 10, action: { type: 'attack', base: 60, attr: 'CC', damage: 7 }, v5: { kind: 'melee' } });
  assert.equal(withTrait.damage.finalDamage, fixed.damage.finalDamage, 'BF 5 + 2 = 7, et non le 3 imprimé');
});
