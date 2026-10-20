import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getAllDivineContracts } from '../js/core/v5-divine-store.js';

// A2 (R22) : Hurlement du loup et Roi de la Nature, à cible implicite du prêtre (invocations), refusent toute cible
// superflue comme le font déjà Œil de l’aigle et Yeux de chat : seules « aucune cible » et « le prêtre seul » passent.
const clone = value => structuredClone(value);
const HOWL = 'divine:miracle:ulric:howl-of-the-wolf', KING = 'divine:miracle:taal:king-of-the-wild';
const EAGLE = 'divine:miracle:il-de-l-aigle', CAT = 'divine:miracle:ranald:cat-s-eyes';
const SPECIALIZATIONS = ['Ulric', 'Taal', 'Myrmidia', 'Morr', 'Sigmar', 'Ranald'];

const actor = (id, initiative, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: SPECIALIZATIONS.flatMap(specialization => ['talent-invoke', 'talent-bless'].map(id => ({ id, status: 'resolved', rank: 1, specialization }))),
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [{ id: 'ham-1', name: 'Marteau de guerre', kind: 'weapon', category: 'Marteau' }], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
async function fixture() {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
    participants: [actor('priest', 60), actor('ally', 30), actor('foe', 20, { camp: 'ennemi', traits: ['Mort-vivant'] })] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const allFacts = targetIds => ({ targets: Object.fromEntries(targetIds.map(id => [id, { withinRange: true, withinTouch: true, ally: true, undead: true, nonMyrmidian: true, lookingAtPriest: true }])) });
const ROUND6 = { phase: 'endOfTurn', round: 6, actorId: 'priest' };
const input = (targetIds, more = {}) => ({ actorId: 'priest', targetIds, roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, expiry: ROUND6, ...more });
const withFacts = (targetIds, more = {}) => input(targetIds, { facts: allFacts(targetIds), ...more });
const KING_MORE = { summon: { beastKey: 'giant-spider', position: 'au pied du prêtre' }, expiry: undefined };

test('A2 : Hurlement du loup et Roi de la Nature refusent une cible superflue en plus du prêtre', async () => {
  const store = await fixture();
  for (const [id, more] of [[HOWL, {}], [KING, KING_MORE]]) {
    const preview = store.previewDivineExecution(id, withFacts(['priest', 'foe'], more));
    assert.equal(preview.ready, false, id);
    assert.equal(preview.error, 'La prière se cible elle-même; choisissez uniquement le prêtre auteur.', id);
    assert.ok(preview.needsInput.some(row => row.field === 'targetIds'), id);
  }
});

test('A2 : Hurlement du loup et Roi de la Nature refusent une cible autre que le prêtre', async () => {
  const store = await fixture();
  for (const [id, more] of [[HOWL, {}], [KING, KING_MORE]]) {
    const preview = store.previewDivineExecution(id, withFacts(['foe'], more));
    assert.equal(preview.ready, false, id);
    assert.equal(preview.error, 'La prière se cible elle-même; choisissez uniquement le prêtre auteur.', id);
    assert.ok(preview.needsInput.some(row => row.field === 'targetIds'), id);
  }
});

test('A2 : sans cible explicite ou avec le prêtre seul, Hurlement du loup et Roi de la Nature restent prêts', async () => {
  for (const [id, more] of [[HOWL, {}], [KING, KING_MORE]]) {
    for (const targetIds of [[], ['priest']]) {
      const store = await fixture();
      const preview = store.previewDivineExecution(id, withFacts(targetIds, more));
      assert.equal(preview.ready, true, `${id} ${JSON.stringify(targetIds)} ${preview.error} ${JSON.stringify(preview.needsInput)}`);
    }
  }
});

test('A2 : Œil de l’aigle et Yeux de chat refusent toujours une autre cible que le prêtre (inchangés)', async () => {
  const store = await fixture();
  for (const id of [EAGLE, CAT]) {
    const preview = store.previewDivineExecution(id, withFacts(['foe']));
    assert.equal(preview.ready, false, id);
    assert.equal(preview.error, 'La prière se cible elle-même; choisissez uniquement le prêtre auteur.', id);
  }
});
