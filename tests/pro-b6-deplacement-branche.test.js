import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';

const library = JSON.parse(readFileSync('js/data/bestiary/L07.json', 'utf8')).profiles;
const memoryPersistence = () => { let state = null; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; } }; };
const human = { id: 'h', name: 'Humain', kind: 'PJ', camp: 'pj', hp: 40, maxHp: 40, zone: 'active', caracs: { CC: 60, CT: 50, F: 40, E: 30, Ag: 40, I: 40 }, talents: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: false } } };

async function table(...names) {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  const made = [];
  for (const name of names) { const participant = buildParticipantFromBestiary(library.find(profile => profile.nameFr === name).id, { library, zone: 'active' }); await store.addParticipant(participant); made.push(participant); }
  await store.addParticipant({ ...human });
  return { store, made };
}
const amount = (preview, id) => preview.test.details.modifiers.find(m => m.id === id)?.amount;
const shot = (actorId, targetId, context) => ({ resolutionId: `b6-shot-${actorId}`, actorId, targetId, action: { type: 'attack', base: 50, attr: 'CT', damage: 4 }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'test' } }, v5: { kind: 'ranged', context } });
const skill = (actorId, targetId, label, context, extra = {}) => ({ resolutionId: `b6-${actorId}-${label}`, actorId, targetId, action: { type: 'skill', label, base: 40, attr: 'Ag', ...extra }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'test' } }, v5: { kind: 'test', context } });

test('B6 : un tireur en Vol tire à −2 DR quand le MJ le précise, rien sinon', async () => {
  const { store, made: [roc] } = await table('Roc plume-vive');
  assert.equal(amount(store.previewResolution(shot(roc.id, 'h', { airborne: true })), 'move:fly-ranged'), -2);
  assert.equal(amount(store.previewResolution(shot(roc.id, 'h', {})), 'move:fly-ranged'), undefined);
  assert.equal(amount(store.previewResolution(shot('h', roc.id, { airborne: true })), 'move:fly-ranged'), undefined);
});

test('B6 : Amphibie et Arboricole modifient Natation, Escalade et Discrétion', async () => {
  const { store, made: [skink] } = await table('Skink caméléon');
  assert.equal(amount(store.previewResolution(skill(skink.id, 'h', 'Natation', {})), 'move:amphibious-swim'), 1);
  const bonus = Math.floor(Number(skink.caracs.Ag) / 10);
  const climb = store.previewResolution(skill(skink.id, 'h', 'Escalade', {}));
  assert.equal(amount(climb, 'move:arboreal'), bonus);
  assert.equal(amount(store.previewResolution(skill(skink.id, 'h', 'Athlétisme', {})), 'move:arboreal'), undefined);
});

test('B6 : les rappels de déplacement sont sur la carte du Roc et du Skink', async () => {
  const { store, made: [roc, skink] } = await table('Roc plume-vive', 'Skink caméléon');
  assert.ok(store.getParticipantReminders(roc.id).some(item => / : Vol : /.test(item.text)));
  assert.ok(store.getParticipantReminders(skink.id).some(item => / : Amphibie : /.test(item.text)));
});
