import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getAllDivineContracts } from '../../../js/core/v5-divine-store.js';

// Lot 5 · C54 (G-DIV-18) : Roi de la Nature au Round 1, Initiative tirée et camp du lanceur.
const KING = 'divine:miracle:taal:king-of-the-wild';
const clone = value => structuredClone(value);
const actor = (id, initiative, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Taal' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
async function summonAtRound1() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
    participants: [actor('priest', 60), actor('ally', 30), actor('foe', 20, { camp: 'ennemi' })] }, log: [], diceLines: [],
    extensions: { v5: { turnIndex: 1, combatInitiativeInitialized: true, combatInitiativeResolution: { order: ['priest', 'ally', 'foe'] } } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  const input = { actorId: 'priest', targetIds: ['priest'], facts: { targets: { priest: { withinRange: true } } }, roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    summon: { beastKey: 'giant-spider', position: 'au pied du prêtre' } };
  const preview = store.previewDivineExecution(KING, input);
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  assert.equal((await store.applyDivineExecution(KING, { preview })).ready, true);
  return { store, summoned: store.listParticipants().filter(row => row.extensions?.v5?.divineSummon) };
}

test('C54 : invocation divine au Round 1, Initiative tirée et camp du lanceur', async () => {
  const { store, summoned } = await summonAtRound1();
  assert.equal(summoned.length, 1);
  const [spider] = summoned, initiative = spider.extensions.v5.combatInitiative;
  assert.ok(initiative?.die >= 1 && initiative.die <= 10, 'd10 d’Initiative absent');
  assert.equal(initiative.score, initiative.die + Math.floor(spider.caracs.I / 10));
  assert.ok(store.getCombat().order.includes(spider.id));
  assert.equal(spider.camp, 'pj');
});
