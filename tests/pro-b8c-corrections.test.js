import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { applyHeadCriticals } from '../js/core/creature-heads.js';
import { senseTestRules } from '../js/core/creature-senses.js';
import { buildRegenerationBlock, readRegenerationInputs } from '../js/ui/regeneration-block.js';
import { refusalError, userMessage } from '../js/ui/messages.js';

// B8c : corrections de la contre-vérification de B3-B6 et réponses du MJ du 24/10 (BR-12 Vol, BR-11 Sens aiguisé, BR-10 tête touchée).
const clone = value => structuredClone(value);
const profiles = id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles;
const l07 = profiles('L07'), l09 = profiles('L09');
const human = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 40, maxHp: 40, caracs: { CC: 60, CT: 50, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], talents: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });

async function table(participants, order) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: order[0], order, participants }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b8c' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const fromProfile = (library, name, id) => ({ ...buildParticipantFromBestiary(library.find(profile => profile.nameFr === name).id, { library, zone: 'active' }), id, camp: 'ennemi', zone: 'active', states: [] });
const amount = (preview, id) => preview.test.details.modifiers.find(m => m.id === id)?.amount;
const shot = (actorId, targetId, context) => ({ resolutionId: `b8c-shot-${actorId}`, actorId, targetId, action: { type: 'attack', base: 50, attr: 'CT', damage: 4 }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'test' } }, v5: { kind: 'ranged', context } });
const skill = (actorId, targetId, label, v5 = {}, extra = {}) => ({ resolutionId: `b8c-${actorId}-${label}`, actorId, targetId, action: { type: 'skill', label, base: 40, attr: 'Ag', ...extra }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'test' } }, v5: { kind: 'test', ...v5 } });
const hydra = () => ({ ...buildParticipantFromBestiary('E0-P-319', { library: l09, zone: 'active' }), id: 'beast', camp: 'ennemi', zone: 'active', states: [] });
const distractingProfile = () => l07.find(profile => JSON.stringify(profile.traits || []).includes('Distracting'));

// Annulé en B11c (décision du MJ du 25/10, retour au livre de base p.358) : le −2 DR vise de nouveau le tir du porteur de Vol en vol.
test('B8c : le −2 DR du Vol vise le tir du volant en vol (retour au livre de base en B11c), pas le tir contre lui', async () => {
  const roc = fromProfile(l07, 'Roc plume-vive', 'roc');
  const store = await table([roc, human('h')], ['h', 'roc']);
  assert.equal(amount(store.previewResolution(shot('roc', 'h', { airborne: true })), 'move:fly-ranged'), -2);
  assert.equal(amount(store.previewResolution(shot('roc', 'h', {})), 'move:fly-ranged'), undefined);
  assert.equal(amount(store.previewResolution(shot('roc', 'h', { airborne: false })), 'move:fly-ranged'), undefined);
  assert.equal(amount(store.previewResolution(shot('h', 'roc', { targetAirborne: true })), 'move:fly-ranged'), undefined);
  assert.equal(amount(store.previewResolution(shot('h', 'roc', { airborne: true })), 'move:fly-ranged'), undefined);
});

test('B8c : Furtif ne vaut que pour Discrétion (Rurale)', async () => {
  const skink = fromProfile(l07, 'Skink caméléon', 'skink');
  const store = await table([skink, human('h')], ['h', 'skink']);
  const target = label => store.previewResolution(skill('skink', 'h', label, {}, { base: 5, attr: 'Ag' })).score.target;
  assert.equal(target('Discrétion (Rurale)'), Number(skink.caracs.Ag) + 10);
  assert.notEqual(target('Discrétion (Urbaine)'), Number(skink.caracs.Ag) + 10);
  assert.notEqual(target('Discrétion (Souterrains)'), Number(skink.caracs.Ag) + 10);
});

test('B8c : un refus { ok:false, message } montre sa raison, sans formule de repli', () => {
  const error = refusalError({ ok: false, reason: 'refused', message: 'Régénération : d10 de début de Round à saisir (1 à 10).' }, 'Régénération');
  assert.equal(userMessage(error), 'Régénération : d10 de début de Round à saisir (1 à 10).');
  assert.equal(refusalError(false, 'État').message, 'État impossible.');
  assert.match(readFileSync('js/ui/card.js', 'utf8'), /throw refusalError\(value, label\)/);
});

test('B8c : un 10 régénère le critique et ses États, annulable ; un critique de feu coché reste', async () => {
  const beast = hydra();
  const base = { ...beast, hp: 60, maxHp: 100, states: [{ id: 'st-sonne', key: 'sonne', name: 'Sonné', level: 1, source: { kind: 'critical' } }, { id: 'st-fire', key: 'sonne', name: 'Sonné', level: 1, source: { kind: 'critical' } }],
    extensions: { v5: { ...beast.extensions.v5, criticalWounds: [{ id: 'crit-1', name: 'Tête', stateIds: ['st-sonne'] }, { id: 'crit-fire', name: 'Brûlure', stateIds: ['st-fire'] }] } } };
  const store = await table([base, human('h')], ['h', 'beast']);
  const of = () => store.getCombat().participants.get('beast');
  const fire = await store.applyRegeneration('beast', 10, { fireCriticalIds: ['crit-1'] });
  assert.equal(fire.criticalHeal.id, 'crit-fire');
  assert.deepEqual(of().states.map(state => state.id), ['st-sonne']);
  await store.undo();
  assert.equal(of().states.length, 2);
  const result = await store.applyRegeneration('beast', 10);
  assert.equal(result.criticalHeal.id, 'crit-1');
  assert.deepEqual(of().extensions.v5.criticalWounds.map(row => row.id), ['crit-fire']);
  assert.deepEqual(of().states.map(state => state.id), ['st-fire']);
  await store.undo();
  assert.equal(of().states.length, 2);
  assert.equal(of().extensions.v5.criticalWounds.length, 2);
});

test('B8c : le bloc de Régénération propose de cocher les critiques de feu et les lit', () => {
  const make = tag => ({ tag, children: [], dataset: {}, className: '', textContent: '', appendChild(child) { this.children.push(child); return child; } });
  const beast = hydra();
  const withCrit = { ...beast, extensions: { v5: { ...beast.extensions.v5, criticalWounds: [{ id: 'crit-1', name: 'Tête' }] } } };
  const block = buildRegenerationBlock(make, withCrit);
  const boxes = block.children.filter(child => child.tag === 'label').map(label => label.children[0]);
  assert.equal(boxes.length, 1);
  assert.equal(boxes[0].value, 'crit-1');
  const read = readRegenerationInputs({ querySelector: selector => (selector === '.regen-roll' ? { value: '10' } : { value: '' }), querySelectorAll: () => [{ checked: true, value: 'crit-1' }, { checked: false, value: 'crit-2' }] });
  assert.deepEqual(read.fireCriticalIds, ['crit-1']);
});

test('B8c : Perturbant frappe aussi la défense d’un vivant, jamais un mort-vivant ni un Éthéré', () => {
  const source = { ...buildParticipantFromBestiary(distractingProfile().id, { library: l07, zone: 'active' }), id: 'source' };
  const rule = (actor, defending) => senseTestRules({ actor, opponent: source, participants: [source, actor], kind: 'melee', defending, context: { distractingInRange: true } }).modifiers.find(m => m.id === 'sense:distracting')?.amount;
  assert.equal(rule(human('h'), true), -2);
  assert.equal(rule(human('h'), false), -2);
  assert.equal(rule(human('skeleton', { traits: [{ name: 'Undead' }] }), true), undefined);
  assert.equal(rule(human('ghost', { traits: [{ name: 'Ethereal' }] }), false), undefined);
});

test('B8c : défense du Store près d’un Perturbant, −2 DR pour un PJ, rien pour un Squelette', async () => {
  const source = { ...buildParticipantFromBestiary(distractingProfile().id, { library: l07, zone: 'active' }), id: 'source', camp: 'ennemi' };
  const store = await table([source, human('h'), human('skeleton', { traits: [{ name: 'Undead' }] }), human('foe', { camp: 'ennemi' })], ['foe', 'h']);
  const attack = (targetId, context) => ({ resolutionId: `b8c-def-${targetId}`, actorId: 'foe', targetId, action: { type: 'attack', base: 50, attr: 'CC', damage: 4 }, roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'melee', context } }, v5: { kind: 'melee' } });
  const seen = preview => JSON.stringify(preview).includes('sense:distracting');
  assert.ok(seen(store.previewResolution(attack('h', { distractingInRange: true }))));
  assert.ok(!seen(store.previewResolution(attack('h', { distractingInRange: false }))));
  assert.ok(!seen(store.previewResolution(attack('skeleton', { distractingInRange: true }))));
});

test('B8c : une tête désignée inconnue retombe sur la première tête valide', () => {
  const beast = hydra();
  const detail = { location: { key: 'HEAD' }, parsed: { states: [{ key: 'sonne' }] } };
  const result = applyHeadCriticals(beast, [detail], 'head-inconnue');
  assert.ok(result);
  assert.equal(result.touched[0].headId, 'head-1');
  assert.equal(result.stunnedCount, 1);
});

test('B8c : le Sonné d’un second critique hors tête reste sur l’Hydre', async () => {
  const beast = hydra();
  const store = await table([{ ...beast, hp: 100, maxHp: 100 }, human('h')], ['h', 'beast']);
  const preview = store.previewResolution({ resolutionId: 'b8c-crit', actorId: 'h', targetId: 'beast', roll: 11, action: { type: 'attack', base: 70, attr: 'CC', damage: 5 }, defense: { base: 10, roll: 99, v5: { kind: 'melee', context: { defenderFumbleRoll: 1 } } }, v5: { kind: 'melee' }, criticalRolls: { location: 5, effect: 20 } });
  assert.equal(preview.critical?.details?.location?.key, 'HEAD');
  preview.targetConditionApplication.push({ key: 'sonne', name: 'Sonné', level: 1, source: { kind: 'critical' } });
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  const states = store.getCombat().participants.get('beast').states;
  assert.equal(states.filter(state => state.key === 'sonne').length, 1);
});
