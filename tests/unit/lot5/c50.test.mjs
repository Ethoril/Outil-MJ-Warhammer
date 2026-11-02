// Lot 5 · C50 (G-ARM-5) : rechargement. Raison en français d'une recharge refusée, libellé du tir bloqué selon la vraie qualité,
// compteur d'une arme à simple Recharge (pas de « 0 tir(s) restant(s) »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { previewResolution } from '../../../js/core/resolution.js';
import { initialV5ReloadState, describeV5ReloadState, beginV5Reload, advanceV5Reload } from '../../../js/core/v5-reloading.js';

const fighter = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'a' ? 'pj' : 'ennemi', zone: 'active', hp: 30, maxHp: 30,
  caracs: { CC: 55, CT: 55, F: 30, E: 30, I: 40, Ag: 30 }, skills: [], states: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { hasMomentum: false } }, ...extra });
const weapon = (keywords, id = 'w') => ({ id, kind: 'weapon', name: 'Arme', category: 'Poudre noire', damage: '+4', range: '30', keywords });

test('C50 recharge d’une arme jamais tirée : la raison est donnée en français, pas le code', async () => {
  const store = createStore({ storage: null }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'c50', turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [fighter('a', { equipment: [weapon([{ id: 'recharge', parameter: '2' }])] }), fighter('b')] } });
  const plan = store.previewV5WeaponReload({ actorId: 'a', equipmentId: 'w', operation: 'begin' });
  assert.equal(plan.ready, false);
  assert.doesNotMatch(plan.error, /weapon-not-fired/);
  assert.match(plan.error, /pas été tirée/);
});

test('C50 le tir bloqué nomme la qualité réelle : Recharge, pas À répétition', () => {
  const shoot = (qualities, keywords) => {
    const shooter = fighter('a', { equipment: keywords ? [weapon(keywords)] : [] });
    return previewResolution({ actor: shooter, target: fighter('b'), round: 1, baseRevision: 0, roll: 35,
      action: { type: 'attack', attr: 'CT', base: 55, damage: 6, qualities, ...(keywords ? { extensions: { fiche: { equipmentId: 'w' } } } : {}) },
      v5: { kind: 'ranged', context: { manualShotsRemaining: 0 } }, v5State: { participants: [shooter, fighter('b')] } });
  };
  assert.ok(shoot([{ id: 'recharge', parameter: '2' }]).unresolved.includes('Recharge : l’arme doit être rechargée avant un nouveau tir.'));
  assert.ok(shoot([{ id: 'a-repetition', parameter: '3' }]).unresolved.includes('À répétition : l’arme doit être rechargée avant un nouveau tir.'));
});

test('C50 compteur : une arme à simple Recharge est « chargée » ou « à recharger », jamais « 0 tir(s) restant(s) »', () => {
  const initial = initialV5ReloadState(weapon([{ id: 'recharge', parameter: '1' }])).state;
  assert.equal(describeV5ReloadState(initial), 'chargée');
  const fired = { ...initial, requiresReload: true };
  assert.equal(describeV5ReloadState(fired), 'à recharger');
  const begun = beginV5Reload(fired).state;
  assert.match(describeV5ReloadState(begun), /en recharge · recharge 0\/1 succès/);
  const done = advanceV5Reload(begun, { success: true, testSl: 0 }).state;
  assert.equal(describeV5ReloadState(done), 'chargée');
  const repeater = initialV5ReloadState(weapon([{ id: 'a-repetition', parameter: '3' }, { id: 'recharge', parameter: '2' }])).state;
  assert.equal(describeV5ReloadState(repeater), '3 tir(s) restant(s)');
});
