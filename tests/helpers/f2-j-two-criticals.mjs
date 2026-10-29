import { createStore } from '../../js/core/store.js';
import { createGameClock } from '../../js/core/v5-game-time.js';

// Une attaque dont les dégâts excédentaires donnent deux Blessures Critiques dans la même résolution.
const clone = value => structuredClone(value);
export const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'foe' ? 'ennemi' : 'pj', zone: 'active', initiative: 60, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [], talents: [], equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
export async function baseFixtureStore({ effect = 80, secondEffect = 45 } = {}) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: ['hero', 'foe'], participants: [actor('hero'), actor('foe', { hp: 1 })] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'f2-j-two-criticals' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  const preview = store.previewResolution({ resolutionId: 'two-crits', actorId: 'hero', targetId: 'foe', roll: 22,
    action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' },
    criticalRolls: { location: 2, effect, secondEffect } });
  return { store, preview };
}
