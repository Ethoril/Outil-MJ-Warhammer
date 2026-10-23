import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { parseSenseTrait, senseTraits, planSense, distractingPenalty, senseReminders } from '../js/core/creature-senses.js';

const load = book => JSON.parse(readFileSync(new URL(`../js/data/bestiary/${book}.json`, import.meta.url), 'utf8')).profiles;
const withTrait = (book, name) => {
  const library = load(book);
  const record = library.find(profile => (profile.traits || []).some(trait => trait.name === name));
  assert.ok(record, `${name} introuvable dans ${book}`);
  return buildParticipantFromBestiary(record.id, { library });
};
const synthetic = (traits, extra = {}) => ({ id: 'x', name: 'X', traits, caracs: { Ag: 45, Int: 32, E: 47, I: 38 }, hp: 10, ...extra });

test('T5 lecture des Traits de sens, anglais ou français', () => {
  assert.deepEqual(parseSenseTrait('Distracting (Smell)'), { key: 'distracting', name: 'Distracting', detail: 'Smell' });
  assert.equal(parseSenseTrait('Infravision').key, 'darkVision');
  assert.equal(parseSenseTrait('Caméléon').key, 'chameleon');
  assert.equal(parseSenseTrait('Fly (50)'), null);
  assert.deepEqual(senseTraits(synthetic(['Night Vision', 'Night Vision', 'Bite'])).map(trait => trait.key), ['nightVision']);
});

test('T5 Pisteur (Chien importé) — Pistage à Intelligence+10', () => {
  const dog = withTrait('L06', 'Tracker');
  const plan = planSense(dog, 'tracker');
  assert.deepEqual(plan.skills, [{ skill: 'Pistage', value: 25, source: 'Int+10', adjustableByGM: true }]);
  assert.equal(plan.available, true);
  assert.equal(planSense(synthetic(['Tracker'], { caracs: {} }), 'tracker').available, false);
  assert.equal(planSense(synthetic(['Bite']), 'tracker').available, false);
});

test('T5 Furtif — Discrétion rurale à Agilité+10', () => {
  const plan = planSense(withTrait('L11', 'Stealthy'), 'stealthy');
  assert.equal(plan.skills[0].source, 'Ag+10');
  assert.equal(plan.skills[0].skill, 'Discrétion (rurale)');
  assert.equal(planSense(synthetic(['Stealthy']), 'stealthy').skills[0].value, 55);
});

test('T5 Infravision (Bête des marais) et Vision nocturne', () => {
  const plan = planSense(withTrait('L06', 'Dark Vision'), 'darkVision');
  assert.deepEqual(plan.effects, [{ seesInDarkness: true }]);
  assert.equal(plan.available, true);
  const night = planSense(synthetic(['Night Vision']), 'nightVision');
  assert.deepEqual(night.ranges, [{ scope: 'vision nocturne', yards: 20 }]);
  assert.match(night.receipt.ranges[0], /20 yards/);
});

test('T5 Perturbant — portée BE yards, −2 DR une seule fois', () => {
  const plan = planSense(synthetic(['Distracting (Smell)']), 'distracting');
  assert.deepEqual(plan.ranges, [{ scope: 'vivants', yards: 4, source: 'Bonus d\'Endurance' }]);
  assert.deepEqual(plan.modifiers, [{ scope: 'tous les Tests des vivants à portée', dr: -2, onceOnly: true }]);
  const a = synthetic(['Distracting']);
  const b = synthetic(['Distracting']);
  assert.deepEqual(distractingPenalty([a, b], [3, 2]), { dr: -2, sources: 2, unresolved: false });
  assert.equal(distractingPenalty([a, b], [9, 8]).dr, 0);
  assert.equal(distractingPenalty([a, b], [9, 4]).sources, 1);
  assert.equal(planSense(synthetic(['Distracting'], { caracs: {} }), 'distracting').available, false);
});

test('T5 Caméléon — Perception −4 DR, −2 en mouvement, tirs −2 DR', () => {
  const lizard = synthetic(['Chameleon']);
  assert.equal(planSense(lizard, 'chameleon').available, false);
  const still = planSense(lizard, 'chameleon', { moving: false });
  assert.deepEqual(still.modifiers, [{ scope: 'Perception pour le voir', dr: -4 }, { scope: 'tirs contre lui', dr: -2 }]);
  assert.equal(planSense(lizard, 'chameleon', { moving: true }).modifiers[0].dr, -2);
  assert.equal(still.receipt.modifiers[0], 'Perception pour le voir -4 DR');
});

test('T5 Sens vibratoires — quatre BI yards, jamais Surpris', () => {
  const plan = planSense(synthetic(['Vibrational Senses']), 'vibrational');
  assert.deepEqual(plan.ranges, [{ scope: 'corps physiques', yards: 12, source: 'quatre BI' }]);
  assert.deepEqual(plan.effects, [{ immuneToSurprise: true }]);
  assert.equal(planSense(synthetic(['Vibrational Senses'], { caracs: {} }), 'vibrational').available, false);
});

test('T5 rappels de fiche sans doublon', () => {
  assert.equal(senseReminders(synthetic(['Night Vision', 'Tracker', 'Night Vision'])).length, 2);
});
