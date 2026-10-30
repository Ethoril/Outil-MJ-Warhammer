import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { parseNaturalTrait, naturalCombatTraits, planNaturalAttack, planV4NaturalWeapon, naturalCombatReminders } from '../js/core/creature-combat.js';

const load = book => JSON.parse(readFileSync(new URL(`../js/data/bestiary/${book}.json`, import.meta.url), 'utf8')).profiles;
const build = (book, id) => buildParticipantFromBestiary(id, { library: load(book) });
const synthetic = (traits, F = 50) => ({ id: 'x', name: 'X', traits, caracs: { F } });

test('T2 lecture des Traits de combat naturel, anglais ou français', () => {
  assert.deepEqual(parseNaturalTrait('Tentacles (4)'), { key: 'tentacles', name: 'Tentacles', detail: '4' });
  assert.equal(parseNaturalTrait('Morsure').key, 'bite');
  assert.equal(parseNaturalTrait('Attaque caudale').key, 'tail');
  assert.equal(parseNaturalTrait('Claws +6').key, 'v4-weapon');
  assert.equal(parseNaturalTrait('Frenzy'), null);
});

test('T2 Cornes (Rhinox E0-P-127) — Charge requise, dégâts BF+4, aucun Élan', () => {
  const rhinox = build('L01', 'E0-P-127');
  const noCharge = planNaturalAttack(rhinox, 'horns');
  assert.equal(noCharge.available, false);
  assert.match(noCharge.unresolved[0], /Charge/);
  const charged = planNaturalAttack(rhinox, 'horns', { charged: true });
  assert.equal(charged.available, true);
  assert.equal(charged.damageFormula, '10');
  assert.deepEqual(charged.costs, []);
});

test('T2 Attaque caudale — 1 Élan, BF+2, À terre proposé pour une cible plus petite blessée', () => {
  const plan = planNaturalAttack(synthetic(['Tail']), 'tail');
  assert.deepEqual(plan.costs, [{ resource: 'momentum', amount: 1 }]);
  assert.equal(plan.damageFormula, '7');
  assert.ok(plan.effects.some(effect => effect.state === 'À terre'));
  assert.equal(plan.receipt.costs[0], '1 Élan');
});

test('T2 Piétinement et Langue — la cible doit être plus petite, Tailles à préciser', () => {
  const stomper = synthetic(['Stomp']);
  assert.match(planNaturalAttack(stomper, 'stomp').unresolved[0], /Tailles/);
  assert.match(planNaturalAttack(stomper, 'stomp', { actorSize: 3, targetSize: 3 }).unresolved[0], /plus petite/);
  const ok = planNaturalAttack(stomper, 'stomp', { actorSize: 4, targetSize: 2 });
  assert.equal(ok.available, true);
  assert.equal(ok.damageFormula, '5');
  // Q18 (livre de base p.362) : la Taille ne décide que de l'attirance de la cible, pas de l'Enchevêtré.
  const tongue = planNaturalAttack(synthetic(['Tongue']), 'tongue', { actorSize: 2, targetSize: 3 });
  assert.equal(tongue.available, true);
  assert.ok(tongue.effects.some(effect => effect.state === 'Enchevêtré'));
});

test('T2 Tentacules (4) — quatre attaques gratuites par Tour, sans Élan', () => {
  const plan = planNaturalAttack(synthetic(['Tentacles (4)']), 'tentacles', { used: 3 });
  assert.equal(plan.available, true);
  assert.deepEqual(plan.quota, { id: 'creature:tentacles', scope: 'turn', maximum: 4 });
  assert.deepEqual(plan.costs, []);
  assert.equal(planNaturalAttack(synthetic(['Tentacles (4)']), 'tentacles', { used: 4 }).available, false);
  assert.equal(planNaturalAttack(synthetic(['Tentacles']), 'tentacles').available, false);
});

test('T2 Toile (Araignée géante E0-P-076) — la touche donne un Enchevêtré de la Force du Trait', () => {
  const spider = build('L06', 'E0-P-076');
  const plan = planNaturalAttack(spider, 'web');
  assert.deepEqual(plan.effects, [{ state: 'Enchevêtré', trigger: 'touche', strength: 40 }]);
  assert.equal(planNaturalAttack(synthetic(['Web']), 'web').available, false);
});

test('T2 Constricteur (Liane E0-P-273) et Étreinte glaciale (Mournguls E0-P-690)', () => {
  assert.equal(planNaturalAttack(build('L07', 'E0-P-273'), 'constrictor').effects[0].state, 'Enchevêtré');
  const chill = planNaturalAttack(build('L21', 'E0-P-690'), 'chill');
  assert.deepEqual(chill.costs, [{ resource: 'momentum', amount: 1 }]);
  assert.ok(chill.effects.some(effect => effect.direct && effect.damage === '1d10+DR'));
  assert.match(chill.reminders.join(' '), /magique/);
});

test('T2 Hurlement : une fois par Tour ; variante Imperial Zoo signalée', () => {
  const ghost = build('L10', 'E0-P-370');
  assert.equal(planNaturalAttack(ghost, 'howl').quota.maximum, 1);
  assert.equal(planNaturalAttack(ghost, 'howl', { used: 1 }).available, false);
  const zooLike = { ...synthetic(['Ghostly Howl']), extensions: { v5: { bestiary: { book: 'L11' } } } };
  assert.match(planNaturalAttack(zooLike, 'howl').reminders.join(' '), /Zoo.*E0-T-090/);
});

test('T2 Regard pétrifiant (Cockatrice E0-P-041), Souffle (Dread Maw E0-P-012) : coût et rappels', () => {
  const gaze = planNaturalAttack(build('L11', 'E0-P-041'), 'gaze');
  assert.equal(gaze.costs.length, 1);
  assert.equal(gaze.opposed, 'Initiative');
  const breath = planNaturalAttack(build('L11', 'E0-P-012'), 'breath');
  assert.deepEqual(breath.costs, []);
  assert.match(breath.reminders.join(' '), /Esquive par cible/);
});

test('T2 plan d\'un Trait absent, Morsure à dégâts imprimés, armes V4, rappels de fiche', () => {
  const absent = planNaturalAttack(synthetic([]), 'bite');
  assert.equal(absent.available, false);
  assert.match(absent.unresolved[0], /Trait absent/);
  const bite = planNaturalAttack(synthetic(['Bite']), 'bite');
  assert.equal(bite.damageFormula, `${Math.floor(Number(synthetic([]).caracs.F) / 10) + 3}`, 'v3 p.356 : Morsure sans valeur = BF+3');
  assert.equal(bite.costs.length, 1);
  assert.equal(planNaturalAttack(synthetic(['Bite']), 'bite', { momentum: false }).available, false);
  assert.equal(planV4NaturalWeapon(synthetic(['Claws +6'])).damageFormula, 'imprimé');
  assert.deepEqual(naturalCombatTraits(synthetic(['Bite', 'Bite', 'Frenzy'])).map(trait => trait.key), ['bite']);
  assert.equal(naturalCombatReminders(synthetic(['Bite', 'Tail'])).length, 2);
});

test('T2 branchement : le contexte naturalAttack exige le Trait et coûte un Élan (calcul des coûts)', async () => {
  const source = readFileSync(new URL('../js/core/v5-store-action.js', import.meta.url), 'utf8');
  assert.match(source, /planNaturalAttack/);
  assert.match(source, /context\.naturalAttack/);
});
