import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { buildRegenerationBlock, readRegenerationInputs } from '../js/ui/regeneration-block.js';

// B3 : Régénération de la Hydre de guerre (L09, E0-P-319, Trait Regeneration).
const clone = value => structuredClone(value);
const library = JSON.parse(readFileSync('js/data/bestiary/L09.json', 'utf8')).profiles;

async function table({ hp = 60, criticals = [] } = {}) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const beast = buildParticipantFromBestiary('E0-P-319', { library, zone: 'active' });
  const hero = { id: 'hero', name: 'hero', kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 40, maxHp: 40, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
  const actor = { ...beast, id: 'beast', camp: 'ennemi', zone: 'active', hp, maxHp: 100, states: [], equipment: [], extensions: { v5: { ...beast.extensions.v5, criticalWounds: criticals } } };
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'beast', order: ['beast', 'hero'], participants: [actor, hero] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b3' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const beastOf = store => store.getCombat().participants.get('beast');

test('B3 : le rappel de Régénération figure sur la Hydre, pas sur un participant sans le Trait', async () => {
  const store = await table();
  assert.match(store.getParticipantReminders('beast').map(item => item.text).join('\n'), /Régénération : Début de Round : 1d10/);
  assert.ok(!store.getParticipantReminders('hero').some(item => /Régénération/.test(item.text)));
});

test('B3 : le d10 saisi rend ce nombre de Blessures, plafonné au maximum, et le soin est annulable', async () => {
  const store = await table({ hp: 60 });
  const result = await store.applyRegeneration('beast', 6);
  assert.equal(result.ok, true);
  assert.equal(beastOf(store).hp, 66);
  await store.undo();
  assert.equal(beastOf(store).hp, 60);
  const near = await table({ hp: 97 });
  await near.applyRegeneration('beast', 9);
  assert.equal(beastOf(near).hp, 100);
});

test('B3 : les Blessures de feu manquantes ne se régénèrent pas', async () => {
  const store = await table({ hp: 60 });
  await store.applyRegeneration('beast', 10, { fireWounds: 38 });
  assert.equal(beastOf(store).hp, 62);
});

test('B3 : à zéro Blessure, 8 ou plus rend 1 Blessure, moins ne rend rien', async () => {
  const low = await table({ hp: 0 });
  await low.applyRegeneration('beast', 7);
  assert.equal(beastOf(low).hp, 0);
  const high = await table({ hp: 0 });
  await high.applyRegeneration('beast', 8);
  assert.equal(beastOf(high).hp, 1);
});

test('B3 : un 10 guérit une Blessure Critique, annulable ; un autre résultat n’en guérit aucune', async () => {
  const criticals = [{ id: 'c1', name: 'Bras brisé' }];
  const store = await table({ hp: 50, criticals });
  await store.applyRegeneration('beast', 5);
  assert.equal(beastOf(store).extensions.v5.criticalWounds.length, 1);
  const result = await store.applyRegeneration('beast', 10);
  assert.equal(result.criticalHeal.id, 'c1');
  assert.equal(beastOf(store).extensions.v5.criticalWounds.length, 0);
  await store.undo();
  assert.equal(beastOf(store).extensions.v5.criticalWounds.length, 1);
});

test('B3 : d10 invalide ou participant sans le Trait refusés', async () => {
  const store = await table();
  assert.equal((await store.applyRegeneration('beast', 11)).ok, false);
  assert.equal((await store.applyRegeneration('hero', 5)).ok, false);
  assert.equal(beastOf(store).hp, 60);
});

test('B3 : la carte affiche le bloc de Régénération (d10, feu, bouton) et lit la saisie', async () => {
  const store = await table();
  const make = tag => ({ tag, children: [], dataset: {}, className: '', textContent: '', appendChild(child) { this.children.push(child); return child; } });
  const block = buildRegenerationBlock(make, beastOf(store));
  assert.equal(block.children.filter(child => child.tag === 'input').length, 2);
  assert.equal(block.children.at(-1).className, 'tiny btn-regeneration');
  assert.equal(buildRegenerationBlock(make, store.getCombat().participants.get('hero')), null);
  const fields = { '.regen-roll': { value: '8' }, '.regen-fire': { value: '' } };
  assert.deepEqual(readRegenerationInputs({ querySelector: selector => fields[selector] }), { roll: 8, fireWounds: 0, fireCriticalIds: [] });
  assert.ok(Number.isNaN(readRegenerationInputs({ querySelector: () => ({ value: '' }) }).roll));
});
