// Lot 5 · C47 (G-ARM-3) : le tir double À répétition fonctionne pour une arme non reliée à un exemplaire d'inventaire
// (jet manuel portant la qualité « À répétition N »). Le premier tir enregistre weaponId null ; le second doit le retrouver.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';

const fighter = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'a' ? 'pj' : 'ennemi', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 55, CT: 55, F: 30, E: 30, I: 40, Ag: 30 }, skills: [], states: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { hasMomentum: false } }, ...extra });

test('C47 tir double À répétition sur une arme non liée : second tir accepté, sans Élan', async () => {
  let saved = null;
  const persistence = { load: async () => structuredClone(saved), saveAtomic: async ({ state }) => { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ persistence, storage: null }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'c47', turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [fighter('a'), fighter('b')] } });
  const base = id => ({ resolutionId: id, actorId: 'a', targetId: 'b', roll: 25, action: { type: 'attack', attr: 'CT', base: 60, damage: 4, qualities: [{ id: 'a-repetition', parameter: '3' }] },
    attackContext: { ranged: true } });
  const first = store.previewResolution({ ...base('u-1'), v5: { kind: 'ranged', context: { repeaterDoubleShot: true, manualShotsRemaining: 3 } } });
  assert.equal(first.ready, true, JSON.stringify(first.unresolved));
  assert.equal((await store.applyResolution(first)).status, 'applied');
  const second = store.previewResolution({ ...base('u-2'), v5: { kind: 'ranged', extraAttack: true, context: { repeaterDoubleShot: true, repeaterSecondShot: true, freeAttackTalent: 'repeater-double', primaryResolutionId: 'u-1', manualShotsRemaining: 2 } } });
  assert.equal(second.actionCosts.ready, true, JSON.stringify(second.actionCosts));
  assert.equal(second.actionCosts.paid.length, 0, 'aucun Élan dépensé pour le second tir');
});
