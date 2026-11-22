import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';

// G8-a (R5) : un rappel en attente (note du participant, Hémorragie) ne bloque jamais « Tour suivant ».
const fighter = (id, camp, extra = {}) => ({ id, name: id, kind: camp === 'ennemi' ? 'PNJ' : 'PJ', camp, zone: 'active', initiative: 50, hp: 20, maxHp: 20,
  caracs: { CC: 50, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, skills: [], talents: [], equipment: [], traits: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });

test('un rappel de fin de tour en attente ne bloque pas nextTurn (statut appliqué)', async () => {
  const store = createStore(); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'gunther', order: ['gunther', 'orc'], participants: [
      fighter('gunther', 'pj', { initiative: 60, states: ['Hémorragique'], extensions: { v5: { reminders: [{ id: 'n1', text: 'Penser à la torche' }] } } }),
      fighter('orc', 'ennemi', { initiative: 30 })] } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  const engine = createCombatEngine(store);
  const result = await engine.nextTurn();
  assert.equal(result.status, 'applied');
  assert.equal(store.getCombat().currentActorId, 'orc');
});
