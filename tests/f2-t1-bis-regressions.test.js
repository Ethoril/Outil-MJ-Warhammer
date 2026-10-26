import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
import { weaponHandsForParticipant } from '../js/core/equipment.js';

const clone = value => structuredClone(value);
function persistence() {
  let state = null;
  return { async load() { return state && clone(state); }, async saveAtomic({ state: next }) { state = clone(next); return { ok: true }; }, read() { return state && clone(state); } };
}
const person = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 40,
  hp: 10, maxHp: 10, caracs: { I: 40, CC: 50, CT: 50 }, skills: [], equipment: [], actions: [], states: [], extensions: { v5: {} }, ...extra });
const base = participants => ({ schemaVersion: 3, reserve: [], log: [], diceLines: [], activeScene: null, encounters: [],
  suspendedScenes: [], persistentCharacters: [], combat: { round: 0, currentActorId: null, order: participants.map(row => row.id), orderMode: 'automatic', participants: clone(participants) }, extensions: { v5: { turnIndex: 1 } } });
async function setup(participants) {
  const saved = persistence(), store = createStore({ persistence: saved, storage: null });
  await store.ready; await store.loadFromJSON(base(participants)); return { store, saved };
}

test('T1 BIS 1 — Visée déclarée par nom est reconnue après normalisation de l’action', async () => {
  const { store } = await setup([person('archer', { kind: 'PJ', camp: 'pj' }), person('target')]);
  await store.applyV5CombatAction(store.previewV5CombatAction({ actorId: 'archer', kind: 'aim', targetId: 'target', weaponName: 'Arc', rangedWeaponConfirmed: true, rangedWeaponHeldConfirmed: true }));
  const actor = person('archer', { kind: 'PJ', camp: 'pj' });
  const shot = store.previewResolution({ resolutionId: 'aim-by-name', actorId: 'archer', targetId: 'target', action: { type: 'attack', name: 'Arc', note: 'Arc', attr: 'CT', base: 50, damage: 4 }, roll: 20, v5: { kind: 'ranged', choice: 'keep' } });
  assert.equal(shot.ready, true, JSON.stringify(shot.unresolved));
  assert.equal(shot.test.details.modifiers.find(row => row.id === 'aim:target')?.amount, 1);
  assert.equal(actor.name, 'archer');
});

test('T1 BIS 2/5 — préparation de rencontre tout au banc permise, démarrage refusé et Store revérifie', async () => {
  const { store } = await setup([person('bench', { zone: 'bench' })]);
  const prepare = store.previewCombatInitialization();
  assert.equal(prepare.ready, true, JSON.stringify(prepare.needsInput));
  const start = store.previewCombatInitialization({ startCombat: true });
  assert.equal(start.ready, false);
  assert.ok(start.needsInput.some(row => row.field === 'activeCombatants'));
  const forged = { ...prepare, startCombat: true };
  const result = await store.applyCombatInitialization(forged);
  assert.equal(result.status, 'requires-input');
});

test('T1 BIS 3/4 — hastes des suppléments et armes de jet usuelles ont une prise à une main sauf (2M)', () => {
  const items = getReferenceCatalogue().items;
  for (const name of ['Hallebarde Haut Elfe', 'Lance longue Haut Elfe']) {
    const weapon = items.find(row => row.name === name);
    assert.ok(weapon, `arme catalogue: ${name}`);
    assert.equal(weaponHandsForParticipant(weapon), 2, name);
  }
  for (const name of ['Couteau de lancer', 'Fronde', 'Fouet', 'Lasso']) {
    const weapon = items.find(row => row.name === name);
    assert.ok(weapon, `arme catalogue: ${name}`);
    assert.equal(weaponHandsForParticipant(weapon), 1, name);
  }
  const bomb = items.find(row => /bombe/i.test(row.name) && row.kind === 'weapon');
  if (bomb) assert.equal(weaponHandsForParticipant(bomb), 1, bomb.name);
});

test('T1 BIS 7 — l’initialisation défensive Store refuse un combat tout au banc', async () => {
  const { store } = await setup([person('bench', { zone: 'bench' })]);
  const plan = store.previewCombatInitialization();
  const result = await store.applyCombatInitialization({ ...plan, startCombat: true });
  assert.equal(result.status, 'requires-input');
  assert.equal(store.getCombat().round, 0);
});
