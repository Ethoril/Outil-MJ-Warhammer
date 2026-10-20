import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';

// P5 — Attaque Rapide (Myrmidia, Up in Arms p.79) : au début de chaque Round du miracle, le prêtre peut tenter un Test d'Initiative
// Intermédiaire (+0 DR) pour une attaque gratuite hors séquence avec l'arme de la main principale (modèle : attaque gratuite
// de Frénésie). Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const QUICK = 'divine:miracle:attaque-rapide';
const clone = value => structuredClone(value);
const priest = () => ({ id: 'priest', name: 'priest', kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } } });
const foe = () => ({ id: 'foe', name: 'foe', kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 30, hp: 40, maxHp: 40,
  caracs: { CC: 30, CT: 30, F: 30, E: 30, I: 30, Ag: 30, Dex: 30, Int: 30, FM: 30, Soc: 30, M: 4 },
  equipment: [], traits: [], states: [], talents: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });
async function fixture() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'foe'], participants: [priest(), foe()] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'quick' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
async function invoke(store) {
  const preview = store.previewDivineExecution(QUICK, { actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, expiry: { phase: 'endOfTurn', round: 3, actorId: 'priest' },
    choices: { range: 0, targets: 0, duration: 0, effect: 0 } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(QUICK, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}
// Attaque gratuite hors séquence : CC 60 contre défense 30 (82), touche ; le Test d'Initiative et l'arme de main sont dans le contexte.
const freeAttack = (store, { id = 'fa', test = { success: true }, mainHand = true } = {}) => store.previewResolution({ resolutionId: id, actorId: 'priest', targetId: 'foe', roll: 24,
  action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } },
  v5: { kind: 'melee', extraAttack: true, context: { freeAttackTalent: 'divine-free-attack', ...(test === null ? {} : { freeAttackTest: test }), mainHand } } });

test('Attaque Rapide : le contrat n’est plus manuel et porte l’effet free-attack', () => {
  const contract = getDivineContract(QUICK);
  assert.notEqual(contract.status, 'manual');
  assert.deepEqual(contract.effects.map(effect => [effect.type, effect.appliesTo]), [['free-attack', 'caster']]);
});

test('Attaque Rapide : attaque gratuite sans Élan, une par Round, rechargée au Round suivant ; Undo', async () => {
  const store = await fixture();
  await invoke(store);
  const first = freeAttack(store);
  assert.deepEqual(first.unresolved, []);
  assert.equal(first.actionCosts.ready, true);
  assert.equal(first.actionCosts.paid.length, 0, 'aucun Élan dépensé');
  assert.equal((await store.applyResolution(first)).status, 'applied');
  const second = freeAttack(store, { id: 'fb' });
  assert.equal(second.actionCosts.ready, false, 'quota d’une attaque par Round épuisé');
  assert.equal((await store.applyResolution(second)).status, 'manual');
  await store.nextTurn(); await store.nextTurn();
  const next = freeAttack(store, { id: 'fc' });
  assert.equal(next.actionCosts.ready, true, 'rechargée au Round suivant');
  assert.equal((await store.applyResolution(next)).status, 'applied');
  await store.undo();
  assert.equal(freeAttack(store, { id: 'fd' }).actionCosts.ready, true, 'Undo rend le quota du Round');
});

test('Attaque Rapide : Test d’Initiative absent ou raté, ou arme de main manquante → non applicable', async () => {
  const store = await fixture();
  await invoke(store);
  const missing = freeAttack(store, { id: 'fm', test: null });
  assert.ok(missing.unresolved.some(text => text.includes('Attaque rapide : Test d’Initiative Intermédiaire (+0 DR) réussi requis.')));
  assert.equal((await store.applyResolution(missing)).status, 'manual');
  const failed = freeAttack(store, { id: 'ff', test: { success: false } });
  assert.ok(failed.unresolved.some(text => text.includes('Attaque rapide : Test d’Initiative Intermédiaire (+0 DR) réussi requis.')));
  assert.equal((await store.applyResolution(failed)).status, 'manual');
  const offHand = freeAttack(store, { id: 'fo', mainHand: false });
  assert.ok(offHand.unresolved.some(text => text.includes('Attaque rapide : arme de la main principale requise.')));
  assert.equal((await store.applyResolution(offHand)).status, 'manual');
});

test('Attaque Rapide : sans le miracle, l’attaque gratuite est refusée', async () => {
  const store = await fixture();
  assert.throws(() => freeAttack(store, { id: 'fx' }), /Attaque rapide non disponible\./);
});
