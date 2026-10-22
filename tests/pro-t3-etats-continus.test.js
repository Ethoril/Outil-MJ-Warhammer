import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import {
  parseStateTrait, stateTraits, planStateOnWound, planVampiricHeal, planSwarm, planUnstableEndOfRound,
  planDieHard, planSplit, planDeathTriggers, stateReminders
} from '../js/core/creature-states.js';

const load = book => JSON.parse(readFileSync(new URL(`../js/data/bestiary/${book}.json`, import.meta.url), 'utf8')).profiles;
const build = (book, id) => buildParticipantFromBestiary(id, { library: load(book) });
const synthetic = (traits, extra = {}) => ({ id: 'x', name: 'X', traits, caracs: { E: 40 }, hp: 10, ...extra });

test('T3 lecture des Traits d\'état, anglais ou français', () => {
  assert.deepEqual(parseStateTrait('Venom (Difficult)'), { key: 'venom', name: 'Venom', detail: 'Difficult' });
  assert.equal(parseStateTrait('Sang corrosif').key, 'corrosive');
  assert.equal(parseStateTrait('Parasité').key, 'infestation');
  assert.equal(parseStateTrait('Frenzy'), null);
  assert.deepEqual(stateTraits(synthetic(['Venom', 'Venom', 'Bite'])).map(trait => trait.key), ['venom']);
});

test('T3 Venin (Vipère impériale E0-P-836) — Empoisonné proposé à la blessure, difficulté à saisir si absente', () => {
  const viper = build('L24', 'E0-P-836');
  const plan = planStateOnWound(viper, 'venom');
  assert.equal(plan.effects[0].state, 'Empoisonné');
  assert.equal(plan.effects[0].trigger, 'blessure infligée');
  const withDifficulty = planStateOnWound(synthetic(['Venom (Difficult)']), 'venom');
  assert.equal(withDifficulty.available, true);
  assert.equal(withDifficulty.effects[0].recoveryDifficulty, 'Difficult');
  assert.equal(planStateOnWound(synthetic(['Venom']), 'venom').available, false);
});

test('T3 Infecté, Parasité, Maladie (Rat de peste E0-P-735)', () => {
  const rat = build('L22', 'E0-P-735');
  const infected = planStateOnWound(rat, 'infected');
  assert.deepEqual(infected.tests, [{ test: 'Endurance', modifier: '+4 DR', onFail: 'Plaie Purulente' }]);
  assert.equal(planStateOnWound(rat, 'infected', { living: false }).available, false);
  assert.deepEqual(planStateOnWound(synthetic(['Infestation']), 'infestation').targetedModifier, { scope: 'mêlée', dr: -1 });
  assert.equal(planStateOnWound(synthetic(['Disease (Peste noire)']), 'disease').effects[0].disease, 'Peste noire');
  assert.match(planStateOnWound(rat, 'disease').effects[0].disease, /Black Plague/);
  assert.equal(planStateOnWound(synthetic(['Disease']), 'disease').available, false);
});

test('T3 Sang corrosif (Hellbeast E0-P-729) — un seul d10 partagé entre les engagés', () => {
  const plan = planStateOnWound(build('L22', 'E0-P-729'), 'corrosive');
  assert.deepEqual(plan.damage, { formula: '1d10', shared: true, targets: 'tous les engagés', trigger: 'blessure reçue', singleRoll: true });
  assert.equal(plan.receipt.damage, '1d10');
});

test('T3 Vampirique (Vampire noble E0-P-926) — soin égal aux Blessures infligées par Morsure sur proie admissible', () => {
  const vampire = build('L26', 'E0-P-926');
  assert.equal(planVampiricHeal(vampire, { wounds: 6, viaBite: true, preyAdmissible: true }).heal.amount, 6);
  assert.equal(planVampiricHeal(vampire, { wounds: 6, viaBite: false, preyAdmissible: true }).heal, null);
  assert.match(planVampiricHeal(vampire, { wounds: 6, viaBite: true }).unresolved[0], /admissible/);
  assert.match(planVampiricHeal(vampire, {}).unresolved[0], /Blessures infligées/);
});

test('T3 Nuée (Lurkerfish E0-P-905) — Psychologie et Taille ignorées, tir à −4 DR, Blessures de fin de Round à saisir', () => {
  const plan = planSwarm(build('L25', 'E0-P-905'));
  assert.deepEqual(plan.ignores, { psychology: true, size: true, engagementForMovement: true });
  assert.equal(plan.rangedAgainst.dr, -4);
  assert.equal(plan.available, false);
  assert.equal(planSwarm(synthetic([])).available, false);
});

test('T3 Instable — deux Blessures si engagé contre un Élan adverse sans le sien', () => {
  const unstable = synthetic(['Unstable'], { hp: 2 });
  const hit = planUnstableEndOfRound(unstable, { engaged: true, enemyMomentum: 2, ownMomentum: 0 });
  assert.deepEqual(hit.damage, { amount: 2, direct: true, trigger: 'fin de Round' });
  assert.equal(hit.effects[0].state, 'Disparition');
  const safe = planUnstableEndOfRound(unstable, { engaged: true, enemyMomentum: 2, ownMomentum: 1 });
  assert.equal(safe.damage, null);
  assert.equal(planUnstableEndOfRound(unstable, {}).available, false);
  const zoo = synthetic(['Unstable'], { extensions: { v5: { bestiary: { book: 'L11' } } } });
  assert.match(planUnstableEndOfRound(zoo, { engaged: true, enemyMomentum: 1, ownMomentum: 0 }).unresolved[0], /E0-T-092/);
});

test('T3 Increvable (Cockatrice-like E0-P-896 Throgg) — BE Rounds, corps intact exigé', () => {
  const throgg = build('L25', 'E0-P-896');
  const plan = planDieHard(throgg, { bodyIntact: true });
  assert.equal(plan.available, true);
  assert.equal(plan.tests[0].rounds, Math.floor(throgg.caracs.E / 10));
  assert.equal(plan.tests[0].modifier, '6 DR');
  assert.equal(planDieHard(throgg, {}).available, false);
});

test('T3 Scission (Horreur rose E0-P-789) — à la Critique ou à zéro Blessure', () => {
  const horror = build('L23', 'E0-P-789');
  assert.equal(planSplit(horror, { critical: true }).effects[0].spawn.count, 2);
  assert.equal(planSplit(horror, { hp: 0 }).available, true);
  assert.equal(planSplit(horror, {}).available, false);
});

test('T3 déclencheurs de mort et reformation portés par les capacités du profil', () => {
  const squig = planDeathTriggers(build('L21', 'E0-P-692'));
  assert.equal(squig.length, 1);
  assert.equal(squig[0].effects[0].onFail.damage, '2d10');
  const colossus = planDeathTriggers(build('L21', 'E0-P-693'));
  assert.equal(colossus.find(plan => plan.key === 'E0-T-256').effects[0].spawn.count, '3d10');
  const guardian = planDeathTriggers(build('L19', 'E0-P-597'));
  assert.equal(guardian.find(plan => plan.key === 'E0-T-259').effects[0].reform.delay, 'd10 jours');
  const inta = build('L24', 'E0-P-867');
  const noCause = planDeathTriggers(inta)[0];
  assert.equal(noCause.available, false);
  assert.equal(planDeathTriggers(inta, { causeUnstable: true })[0].available, true);
  assert.deepEqual(planDeathTriggers(synthetic([])), []);
});

test('T3 rappels de fiche sans doublon', () => {
  assert.equal(stateReminders(synthetic(['Venom', 'Infected', 'Venom'])).length, 2);
});
