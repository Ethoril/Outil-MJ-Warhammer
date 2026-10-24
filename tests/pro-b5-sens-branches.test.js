import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';

const library = JSON.parse(readFileSync('js/data/bestiary/L07.json', 'utf8')).profiles;
const memoryPersistence = () => { let state = null; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; } }; };
const human = { id: 'h', name: 'Humain', kind: 'PJ', camp: 'pj', hp: 40, maxHp: 40, zone: 'active', caracs: { CC: 60, CT: 50, F: 40, E: 30, Ag: 40, I: 40 }, talents: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: false } } };

async function table(...ids) {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  const made = [];
  for (const id of ids) { const participant = buildParticipantFromBestiary(id, { library, zone: 'active' }); await store.addParticipant(participant); made.push(participant); }
  await store.addParticipant({ ...human });
  return { store, made };
}
const skink = () => library.find(profile => profile.nameFr === 'Skink caméléon').id;
const skill = (actorId, targetId, label, v5 = {}, extra = {}) => ({ resolutionId: `b5-${actorId}-${label}`, actorId, targetId, action: { type: 'skill', label, base: 40, attr: 'I', ...extra }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'test' } }, v5: { kind: 'test', ...v5 } });
const amount = (preview, id) => preview.test.details.modifiers.find(m => m.id === id)?.amount;

test('B5 : tir contre un Caméléon, −2 DR sans rien saisir', async () => {
  const { store, made: [lizard] } = await table(skink());
  const preview = store.previewResolution({ resolutionId: 'b5-shot', actorId: 'h', targetId: lizard.id, action: { type: 'attack', base: 50, attr: 'CT', damage: 4 }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'test' } }, v5: { kind: 'ranged' } });
  assert.equal(amount(preview, 'sense:chameleon-ranged'), -2);
});

test('B5 : Perception pour voir un Caméléon, −4 immobile, −2 qui bouge, rien tant que non précisé', async () => {
  const { store, made: [lizard] } = await table(skink());
  const mod = context => amount(store.previewResolution(skill('h', lizard.id, 'Perception', { context })), 'sense:chameleon-sight');
  assert.equal(mod({ targetMoving: false }), -4);
  assert.equal(mod({ targetMoving: true }), -2);
  assert.equal(mod({}), undefined);
});

test('B5 : Perturbant à portée, −2 DR une seule fois même avec deux sources', async () => {
  const [first, second] = library.filter(profile => JSON.stringify(profile.traits || []).includes('Distracting'));
  const { store, made } = await table(first.id, second.id);
  const yes = store.previewResolution(skill('h', made[0].id, 'Athlétisme', { context: { distractingInRange: true } }));
  assert.equal(yes.test.details.modifiers.filter(m => m.id === 'sense:distracting').length, 1);
  assert.equal(amount(yes, 'sense:distracting'), -2);
  const no = store.previewResolution(skill('h', made[0].id, 'Athlétisme', { context: { distractingInRange: false } }));
  assert.equal(amount(no, 'sense:distracting'), undefined);
});

test('B5 : Furtif, Discrétion à Agilité+10 pour le Skink caméléon', async () => {
  const { store, made: [lizard] } = await table(skink());
  const result = store.previewResolution(skill(lizard.id, 'h', 'Discrétion (rurale)', {}, { base: 5, attr: 'Ag' }));
  assert.equal(result.score.target, Number(lizard.caracs.Ag) + 10);
});

test('B5 : les rappels de sens sont sur la carte du Skink', async () => {
  const { store, made: [lizard] } = await table(skink());
  const texts = store.getParticipantReminders(lizard.id).map(item => item.text);
  assert.ok(texts.some(text => /Caméléon/.test(text)));
  assert.ok(texts.some(text => /Furtif/.test(text)));
});

test('B5 : sans contexte précisé, aucun modificateur de sens n’est appliqué', async () => {
  const { store, made: [lizard] } = await table(skink());
  const preview = store.previewResolution(skill('h', lizard.id, 'Perception'));
  assert.ok(!preview.test.details.modifiers.some(m => m.id.startsWith('sense:')));
});
