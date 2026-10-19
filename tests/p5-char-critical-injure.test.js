import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { prepareV5TalentCriticalRolls } from '../js/core/v5-talent-combat.js';

const INJURE = { id: 'talent-strike-to-injure', status: 'resolved', rank: 1 };
const subject = (id, talents = []) => ({ id, name: id, kind: 'PJ', camp: id === 'a' ? 'pj' : 'ennemi', hp: 40, maxHp: 40, zone: 'active', caracs: { CC: 60, CT: 60, F: 40, E: 30, Ag: 40, FM: 40, Soc: 60, Int: 60 }, talents, states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: false } } });
async function setup(talents = []) {
  const persistence = { load: async () => null, saveAtomic: async () => ({ ok: true }) };
  const store = createStore({ persistence });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], extensions: { v5: { combatId: 'injure-test', turnIndex: 1 } }, combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [subject('a', talents), subject('b')] }, diceLines: [], log: [] });
  return store;
}
const melee = (id, extra = {}) => ({ resolutionId: id, actorId: 'a', targetId: 'b', action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, roll: 22, defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, ...extra });
const prep = (talents, raw, settings, extra = {}) => prepareV5TalentCriticalRolls(subject('a', talents), raw, { settings, role: 'attacker', parts: ['first'], ...extra });
const BOTH = { effect: 80, injureEffect: 20 };

test('Frappe blessante : choix true garde le jet de Frappe blessante', () => {
  const r = prep([INJURE], BOTH, { talentChoices: { 'injure:first': true } });
  assert.equal(r.rolls.effect, 20);
  assert.deepEqual(r.unresolved, []);
});

test('Frappe blessante : choix false garde le jet d’origine, même plus élevé', () => {
  const r = prep([INJURE], BOTH, { talentChoices: { 'injure:first': false } });
  assert.equal(r.rolls.effect, 80);
  assert.deepEqual(r.unresolved, []);
});

test('Frappe blessante : ne modifie pas l’objet de jets fourni', () => {
  const raw = { ...BOTH };
  prep([INJURE], raw, { talentChoices: { 'injure:first': true } });
  assert.deepEqual(raw, BOTH);
});

test('Frappe blessante : le critique d’excédent utilise injureSecondEffect', () => {
  const raw = { effect: 50, secondEffect: 90, injureSecondEffect: 10 };
  const r = prepareV5TalentCriticalRolls(subject('a', [INJURE]), raw, { settings: { talentChoices: { 'injure:second': true } }, role: 'attacker', parts: ['second'] });
  assert.equal(r.rolls.secondEffect, 10);
  assert.equal(r.rolls.effect, 50);
  assert.deepEqual(r.unresolved, []);
});

test('Sans le talent : jets inchangés et rien de non résolu', () => {
  const r = prep([], BOTH, { talentChoices: { 'injure:first': true } });
  assert.deepEqual(r.rolls, BOTH);
  assert.deepEqual(r.unresolved, []);
  const none = prep([], BOTH, {});
  assert.deepEqual(none.rolls, BOTH);
  assert.deepEqual(none.unresolved, []);
});

test('Frappe blessante : second jet de gravité manquant signalé', () => {
  const r = prep([INJURE], { effect: 80 }, { talentChoices: { 'injure:first': true } });
  assert.deepEqual(r.unresolved, ['Frappe blessante : saisir les deux gravités.']);
});

test('Frappe blessante : jet d’origine manquant signalé aussi', () => {
  const r = prep([INJURE], { injureEffect: 20 }, { talentChoices: { 'injure:first': false } });
  assert.ok(r.unresolved.includes('Frappe blessante : saisir les deux gravités.'));
});

test('Frappe blessante : choix manquant ou non booléen signalé, jets inchangés', () => {
  for (const settings of [{}, { talentChoices: {} }, { talentChoices: { 'injure:first': 'true' } }]) {
    const r = prep([INJURE], BOTH, settings);
    assert.deepEqual(r.unresolved, ['Frappe blessante : choisir la gravité du critique du jet.']);
    assert.equal(r.rolls.effect, 80);
  }
});

test('Frappe blessante : jets et choix manquants donnent deux messages', () => {
  const r = prep([INJURE], undefined, {});
  assert.equal(r.unresolved.length, 2);
});

test('Frappe blessante avec Inoffensive : deux paires exigées et paire choisie appliquée', () => {
  const settings = { talentChoices: { 'injure:first': true } };
  const missing = prep([INJURE], { effect: 80, effectAlternative: 30, injureEffect: 70 }, settings, { inoffensive: true });
  assert.deepEqual(missing.unresolved, ['Frappe blessante : saisir les deux gravités (deux paires avec Inoffensive).']);
  const full = prep([INJURE], { effect: 80, effectAlternative: 30, injureEffect: 70, injureEffectAlternative: 10 }, settings, { inoffensive: true });
  assert.deepEqual(full.unresolved, []);
  assert.equal(full.rolls.effect, 70);
  assert.equal(full.rolls.effectAlternative, 10);
});

test('Store : l’aperçu d’un critique garde la gravité d’origine si le choix est false', async () => {
  const store = await setup([INJURE]);
  const p = store.previewResolution(melee('inj-false', { criticalRolls: { location: 2, effect: 80, injureEffect: 20 }, v5: { kind: 'melee', talentChoices: { 'injure:first': false } } }));
  assert.equal(p.critical.details.effectRollBase, 80);
  assert.ok(!p.unresolved.some(x => x.includes('Frappe blessante')));
});

test('Store : l’aperçu d’un critique expose la gravité de Frappe blessante si le choix est true', async () => {
  const store = await setup([INJURE]);
  const p = store.previewResolution(melee('inj-true', { criticalRolls: { location: 2, effect: 80, injureEffect: 20 }, v5: { kind: 'melee', talentChoices: { 'injure:first': true } } }));
  assert.equal(p.critical.details.effectRollBase, 20);
  assert.ok(!p.unresolved.some(x => x.includes('Frappe blessante')));
});

test('Store : choix manquant signalé dans l’aperçu et application manuelle', async () => {
  const store = await setup([INJURE]);
  const p = store.previewResolution(melee('inj-nochoice', { criticalRolls: { location: 2, effect: 80, injureEffect: 20 } }));
  assert.ok(p.unresolved.some(x => x.includes('Frappe blessante : choisir la gravité')));
  assert.equal((await store.applyResolution(p)).status, 'manual');
});

test('Store : second jet de gravité manquant signalé dans l’aperçu', async () => {
  const store = await setup([INJURE]);
  const p = store.previewResolution(melee('inj-missing', { criticalRolls: { location: 2, effect: 80 }, v5: { kind: 'melee', talentChoices: { 'injure:first': true } } }));
  assert.ok(p.unresolved.includes('Frappe blessante : saisir les deux gravités.'));
});

test('Store : sans le talent, aucun message Frappe blessante et le jet d’origine est gardé', async () => {
  const store = await setup([]);
  const p = store.previewResolution(melee('no-talent', { criticalRolls: { location: 2, effect: 80, injureEffect: 20 }, v5: { kind: 'melee', talentChoices: { 'injure:first': true } } }));
  assert.equal(p.critical.details.effectRollBase, 80);
  assert.ok(!p.unresolved.some(x => x.includes('Frappe blessante')));
});
