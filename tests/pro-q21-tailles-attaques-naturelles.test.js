import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { naturalAttackNeedsSize } from '../js/core/creature-combat.js';

// Q21 : le panneau de Résolution affiche les listes de Taille pour toute attaque naturelle dont un effet dépend de la Taille
// (Attaque caudale « À terre » si la cible est plus petite p.362, Piétinement, Langue), pas seulement pour le Battement.
const clone = value => structuredClone(value);
const base = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: id === 'beast' ? 'ennemi' : 'pj', zone: 'active', initiative: id === 'beast' ? 60 : 30, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 60, F: 50, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 40, M: 4 },
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true } }, ...extra });
async function fixture(traits) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'beast', order: ['beast', 'hero'],
    participants: [base('beast', { traits }), base('hero')] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'q21' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const tail = (extra = {}) => ({ resolutionId: 'q21-tail-' + JSON.stringify(extra), actorId: 'beast', targetId: 'hero', roll: 10,
  action: { type: 'attack', base: 60, attr: 'CC', damage: 6 }, defense: { base: 10, roll: 99, v5: { kind: 'melee' } },
  v5: { kind: 'melee', context: { naturalAttack: 'tail' }, ...extra } });

test('Q21 les attaques naturelles dépendantes de la Taille sont désignées', () => {
  for (const key of ['tail', 'stomp', 'tongue']) assert.equal(naturalAttackNeedsSize(key), true, key);
  for (const key of ['bite', 'horns', 'breath', 'tentacles', 'constrictor', undefined, '']) assert.equal(naturalAttackNeedsSize(key), false, String(key));
});

test('Q21 Attaque caudale : Tailles saisies à l’écran, « À terre » appliqué à la cible plus petite', async () => {
  const store = await fixture(['Tail']);
  const big = store.previewResolution(tail({ actorSize: 4, targetSize: 2 }));
  assert.ok(big.targetConditionApplication.some(s => s.key === 'a terre'), 'cible plus petite : À terre');
  const equal = store.previewResolution(tail({ actorSize: 3, targetSize: 3 }));
  assert.ok(!equal.targetConditionApplication.some(s => s.key === 'a terre'), 'cible de même Taille : pas de À terre');
});

test('Q21 interface : les listes de Taille sont montrées pour toute attaque naturelle qui en dépend', () => {
  const source = readFileSync(new URL('../js/ui/resolution-panel.js', import.meta.url), 'utf8');
  assert.match(source, /naturalAttackNeedsSize\(draft\.v5Context\?\.naturalAttack\)/);
  assert.match(source, /sizeSelects\(/);
});
