import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { planNaturalAttack, inferNaturalAttackKey } from '../js/core/creature-combat.js';

// Q30, décision (1) du MJ du 23/10 : l'attaque ordinaire d'un profil qui porte le nom d'un Trait d'attaque naturelle prend la formule V5
// du Trait par défaut (sans passer par la liste « Attaque naturelle ») ; les armes gardent leurs dégâts (Livre de base V5 p.356, Bite).
const clone = value => structuredClone(value);
const L14 = JSON.parse(readFileSync('js/data/bestiary/L14.json', 'utf8')).profiles;

async function fixture(beast) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const hero = { id: 'hero', name: 'hero', kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 400, maxHp: 400, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
  const actor = { id: 'beast', camp: 'ennemi', zone: 'active', hp: 100, maxHp: 100, states: [], equipment: [], ...beast, id: 'beast', extensions: { v5: { ...beast.extensions?.v5, hasMomentum: true } } };
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'beast', order: ['beast', 'hero'], participants: [actor, hero] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'q30' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const beast = traits => ({ name: 'beast', kind: 'PNJ', caracs: { CC: 60, CT: 60, F: 50, E: 30, I: 40, M: 4 }, traits, armor: { head: 0, body: 0, arms: 0, legs: 0 } });
const hit = (store, id, action, extra = {}) => store.previewResolution({ resolutionId: `q30-${id}`, actorId: 'beast', targetId: 'hero', roll: 10, action: { type: 'attack', base: 60, attr: 'CC', ...action }, v5: { kind: 'melee', ...extra } }).damage.finalDamage;

test('Q30 Morsure V5 : « Bite (7) » donne 7 dégâts, quel que soit le chiffre imprimé de l’action', async () => {
  const store = await fixture(beast(['Bite (7)']));
  assert.equal(hit(store, 'bite', { name: 'Bite', damage: 3 }), hit(store, 'fixed7', { name: 'Fixed', damage: 7 }));
  assert.notEqual(hit(store, 'bite2', { name: 'Bite', damage: 3 }), hit(store, 'fixed3', { name: 'Fixed', damage: 3 }));
});

test('Q30 Morsure « Strength Bonus + 1 » : BF + 1 ; sans valeur au Trait, le chiffre imprimé est conservé', async () => {
  assert.equal(planNaturalAttack(beast(['Bite (Strength Bonus + 1)']), 'bite').damageFormula, '6');
  assert.equal(planNaturalAttack(beast(['Bite']), 'bite').damageFormula, 'imprimé');
  const store = await fixture(beast(['Bite']));
  assert.equal(hit(store, 'bare', { name: 'Bite', damage: 6 }), hit(store, 'bare-fixed', { name: 'Fixed', damage: 6 }));
});

test('Q30 Queue : l’attaque ordinaire prend BF+2 sans choisir l’Attaque naturelle ; une arme garde ses dégâts', async () => {
  const store = await fixture(beast(['Tail', 'Weapon (9)']));
  assert.equal(hit(store, 'tail', { name: 'Tail', damage: 3 }), hit(store, 'tail-fixed', { name: 'Fixed', damage: 7 }), 'BF 5 + 2');
  assert.equal(hit(store, 'sword', { name: 'Sword', damage: 3 }), hit(store, 'sword-fixed', { name: 'Fixed', damage: 3 }));
  assert.equal(inferNaturalAttackKey(beast(['Tail']), { name: 'Sword' }), null);
  assert.equal(inferNaturalAttackKey(beast([]), { name: 'Tail' }), null, 'Trait absent : pas de formule');
});

test('Q30 Kraken : une attaque ordinaire de tentacule fait BF (formule V5), pas le chiffre imprimé', async () => {
  const kraken = buildParticipantFromBestiary('E0-P-488', { library: L14 });
  const tentacle = kraken.actions.find(action => /^Tentacles 1/.test(action.name));
  const store = await fixture(kraken);
  const bf = Math.floor(kraken.caracs.F / 10);
  assert.equal(hit(store, 'kraken', { ...tentacle, base: 60 }), hit(store, 'kraken-fixed', { name: 'Fixed', damage: bf }));
});

test('Q30 ancien participant « Tentacles (+9) » sans nombre : autant d’attaques que d’actions de tentacule', () => {
  const old = { ...beast(['Tentacles (+9)']), actions: [1, 2, 3].map(n => ({ name: `Tentacles ${n}`, type: 'attack' })) };
  const plan = planNaturalAttack(old, 'tentacles');
  assert.equal(plan.quota.maximum, 3);
  assert.equal(plan.available, true);
  assert.equal(planNaturalAttack(beast(['Tentacles (+9)']), 'tentacles').available, false, 'aucune action : toujours illisible');
});
