import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
import { availableV5TalentActions } from '../js/core/v5-talent-actions.js';
import { buildPsychologyBlock, psychologyCauses, readPsychologyInputs } from '../js/ui/psychology-block.js';

// B4 : Terreur (3) du Spectre des cairns (L06, E0-P-097). Le Dragon de L06 n'a pas de Trait Terreur imprimé (BR-06).
const clone = value => structuredClone(value);
const library = JSON.parse(readFileSync('js/data/bestiary/L06.json', 'utf8')).profiles;
const calm = () => getReferenceCatalogue().skills.find(skill => skill.nom === 'Calme').id;
const person = (id, camp, extra = {}) => ({ id, name: id, kind: 'PNJ', camp, zone: 'active', initiative: 30, hp: 40, maxHp: 40, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], talents: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });

async function table(extra = []) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const wraith = buildParticipantFromBestiary('E0-P-097', { library, zone: 'active' });
  const actor = { ...wraith, id: 'wraith', camp: 'ennemi', zone: 'active', states: [] };
  const participants = [actor, person('hero', 'pj'), person('ally', 'ennemi'), ...extra];
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: participants.map(item => item.id), participants }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b4' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const who = (store, id) => store.getCombat().participants.get(id);

test('B4 : le rappel de Terreur figure sur le Spectre, pas sur un participant sans le Trait', async () => {
  const store = await table();
  assert.match(store.getParticipantReminders('wraith').map(item => item.text).join('\n'), /Terreur : Premier contact/);
  assert.ok(!store.getParticipantReminders('hero').some(item => /Terreur/.test(item.text)));
});

test('B4 : la Terreur posée par le MJ demande le Test de Calme à la cible ennemie seulement, annulable', async () => {
  const store = await table();
  const result = await store.applyCreaturePsychology('wraith', 'terror');
  assert.equal(result.ok, true);
  const terror = who(store, 'hero').states.find(state => state.key === 'terror-of-talent');
  assert.equal(terror.rating, 3);
  assert.ok(!who(store, 'ally').states.some(state => state.key === 'terror-of-talent'));
  assert.ok(availableV5TalentActions(who(store, 'hero')).some(row => row.id === 'activate:overcome-terror' && row.note === 'Résoudre la Terreur'));
  await store.undo();
  assert.ok(!who(store, 'hero').states.some(state => state.key === 'terror-of-talent'));
});

test('B4 : Calme raté contre la Terreur (3) → Brisé selon le livre (indice + DR négatifs après le premier), puis Peur (3)', async () => {
  const store = await table();
  await store.applyCreaturePsychology('wraith', 'terror', { targetId: 'hero' });
  const terror = who(store, 'hero').states.find(state => state.key === 'terror-of-talent');
  const input = { resolutionId: 'b4-terror-fail', actorId: 'hero', action: { type: 'skill', attr: 'FM', base: 40, extensions: { fiche: { skillId: calm() } } }, roll: 75, v5: { kind: 'test', context: { talentAction: 'overcome-terror', terrorEffectId: terror.id, psychologyKind: 'terror' } } };
  const preview = store.previewResolution(input);
  assert.equal(preview.test.sl, -3);
  assert.equal((await store.applyResolution(preview)).status, 'applied');
  const states = who(store, 'hero').states;
  assert.equal(states.find(state => state.key === 'brise').level, 5);
  const fear = states.find(state => state.key === 'fear-of-talent');
  assert.equal(fear.rating, 3);
  assert.equal(fear.name, 'Peur (3)');
  assert.ok(!states.some(state => state.key === 'terror-of-talent'));
});

test('B4 : Immunité Psychologique exemptée, Trait absent refusé, rencontre déjà subie non répétée', async () => {
  const store = await table([person('stoic', 'pj', { traits: ['Immunité Psychologique'] })]);
  await store.applyCreaturePsychology('wraith', 'terror');
  assert.ok(!who(store, 'stoic').states.some(state => state.key === 'terror-of-talent'));
  assert.equal((await store.applyCreaturePsychology('hero', 'terror')).ok, false);
  assert.equal((await store.applyCreaturePsychology('wraith', 'fear')).ok, false);
  const again = await store.applyCreaturePsychology('wraith', 'terror', { targetId: 'hero' });
  assert.equal(again.ok, false);
  assert.equal(who(store, 'hero').states.filter(state => state.key === 'terror-of-talent').length, 1);
});

test('B4 : la carte du Spectre affiche le bloc Terreur (cible, bouton) et lit la saisie', async () => {
  const store = await table();
  const participants = [...store.getCombat().participants.values()];
  assert.deepEqual(psychologyCauses(who(store, 'wraith')).map(cause => cause.key), ['terror']);
  const make = tag => ({ tag, children: [], dataset: {}, className: '', textContent: '', appendChild(child) { this.children.push(child); return child; } });
  const block = buildPsychologyBlock(make, who(store, 'wraith'), participants);
  const select = block.children.find(child => child.tag === 'select');
  assert.deepEqual(select.children.map(option => option.value), ['', 'hero']);
  const button = block.children.find(child => child.tag === 'button');
  assert.equal(button.className, 'tiny btn-creature-psychology');
  assert.equal(button.dataset.psychology, 'terror');
  assert.equal(buildPsychologyBlock(make, who(store, 'hero'), participants), null);
  assert.deepEqual(readPsychologyInputs({ querySelector: () => ({ value: 'hero' }) }), { targetId: 'hero' });
  assert.deepEqual(readPsychologyInputs({ querySelector: () => ({ value: '' }) }), { targetId: null });
});
