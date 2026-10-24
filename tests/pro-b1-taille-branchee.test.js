import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';

const library = JSON.parse(readFileSync('js/data/bestiary/L07.json', 'utf8')).profiles;
const memoryPersistence = () => { let state = null; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; } }; };
const human = { id: 'h', name: 'Humain', kind: 'PJ', camp: 'pj', hp: 40, maxHp: 40, zone: 'active', caracs: { CC: 60, F: 40, E: 30, Ag: 40 }, talents: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: false } } };

async function table() {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  const stegadon = buildParticipantFromBestiary('E0-P-301', { library, zone: 'active' });
  await store.addParticipant(stegadon);
  await store.addParticipant({ ...human });
  return { store, stegadon };
}
const attack = (actorId, targetId, extra = {}) => ({ resolutionId: `b1-${actorId}`, actorId, targetId, action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, ...extra });

test('B1 : le Stegadon (Trait Taille) impose −2 DR à la défense de l’humain, sans talent ni rang saisi', async () => {
  const { store, stegadon } = await table();
  const preview = store.previewResolution(attack(stegadon.id, 'h'));
  assert.equal(preview.defenderTest.details.modifiers.find(m => m.id === 'talent:large-defense')?.amount, -2);
});

test('B1 : aucune pénalité quand le Stegadon défend contre l’humain', async () => {
  const { store, stegadon } = await table();
  const reverse = store.previewResolution(attack('h', stegadon.id));
  assert.ok(!reverse.defenderTest.details.modifiers.some(m => m.id === 'talent:large-defense'));
});

test('B1 : Force opposée gagnée automatiquement par la plus grande créature à deux crans d’écart', async () => {
  const { store, stegadon } = await table();
  const raw = { resolutionId: 'b1-force', actorId: 'h', targetId: stegadon.id, action: { type: 'opposition', attr: 'F', base: 90 }, roll: 5, defense: { attr: 'F', base: 10, roll: 99, v5: { kind: 'test', context: { opposedTest: true } } }, v5: { kind: 'test', context: { opposedTest: true } } };
  const result = store.previewResolution(raw);
  assert.equal(result.opposition.winner, 'defender');
});

test('B1 : le rappel de Taille (poids au surnombre) est sur la carte du Stegadon, pas du PJ', async () => {
  const { store, stegadon } = await table();
  const texts = store.getParticipantReminders(stegadon.id).map(item => item.text);
  assert.ok(texts.some(text => /Taille/.test(text) && /surnombre/.test(text)));
  assert.deepEqual(store.getParticipantReminders('h'), []);
});
