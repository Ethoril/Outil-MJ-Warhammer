import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { parseMovementTrait, movementTraits, planMovement, movementReminders } from '../js/core/creature-movement.js';

const load = book => JSON.parse(readFileSync(new URL(`../js/data/bestiary/${book}.json`, import.meta.url), 'utf8')).profiles;
const withTrait = (book, name) => {
  const library = load(book);
  const record = library.find(profile => (profile.traits || []).some(trait => trait.name === name));
  assert.ok(record, `${name} introuvable dans ${book}`);
  return buildParticipantFromBestiary(record.id, { library });
};
const synthetic = (traits, extra = {}) => ({ id: 'x', name: 'X', traits, caracs: { Ag: 45 }, hp: 10, ...extra });
const zoo = { extensions: { v5: { bestiary: { book: 'L11' } } } };

test('T4 lecture des Traits de déplacement, anglais ou français', () => {
  assert.deepEqual(parseMovementTrait('Fly (100)'), { key: 'fly', name: 'Fly', detail: '100' });
  assert.equal(parseMovementTrait('Vol').key, 'fly');
  assert.equal(parseMovementTrait('Créature marine').key, 'marine');
  assert.equal(parseMovementTrait('Strider (Rocky)').key, 'stridingGait');
  assert.equal(parseMovementTrait('Fear (3)'), null);
  assert.deepEqual(movementTraits(synthetic(['Fly (50)', 'Fly (50)', 'Bite'])).map(trait => trait.key), ['fly']);
});

test('T4 Vol (profil importé) — indice, charge, tirs à −2 DR, doit continuer si commence en vol', () => {
  const flyer = withTrait('L26', 'Fly');
  const plan = planMovement(flyer, 'fly', { startsInMedium: true });
  assert.deepEqual(plan.movement, { mode: 'fly', rating: 100, medium: 'vol' });
  assert.deepEqual(plan.modifiers, [{ scope: 'tir propre', dr: -2 }]);
  assert.ok(plan.effects.some(effect => effect.mustContinue === 'vol'));
  assert.equal(plan.available, true);
  assert.equal(planMovement(synthetic(['Fly']), 'fly').available, false);
  assert.equal(planMovement(synthetic(['Bite']), 'fly').available, false);
});

test('T4 Fouissage (Zoo) — indice souterrain', () => {
  const plan = planMovement(withTrait('L11', 'Burrow'), 'burrow');
  assert.equal(plan.movement.medium, 'sous terre');
  assert.equal(plan.available, true);
});

test('T4 Bond — double Mouvement pour Charge, Saut ou Sprint seulement', () => {
  const jumper = withTrait('L25', 'Bounce');
  assert.deepEqual(planMovement(jumper, 'bounce', { action: 'Charge' }).movement, { factor: 2, actions: ['charge'] });
  assert.equal(planMovement(jumper, 'bounce', { action: 'marche' }).available, false);
  assert.equal(planMovement(jumper, 'bounce').movement.actions.length, 3);
});

test('T4 Foulée — course ×1,5 ; Foulée adaptée — terrain nommé', () => {
  assert.equal(planMovement(synthetic(['Sprinter']), 'sprinter', { baseRun: 8 }).movement.run, 12);
  assert.equal(planMovement(synthetic(['Stride']), 'sprinter').available, false);
  const gait = synthetic(['Striding Gait (Forest)']);
  assert.deepEqual(planMovement(gait, 'stridingGait', { terrain: 'forest' }).modifiers, [{ scope: 'Athlétisme et Discrétion', terrain: 'Forest', dr: 1 }]);
  assert.equal(planMovement(gait, 'stridingGait', { terrain: 'Marsh' }).available, false);
  assert.equal(planMovement(synthetic(['Striding Gait']), 'stridingGait').available, false);
});

test('T4 Grimpant (Vampire noble E0-P-926) — Escalade automatique', () => {
  const vampire = buildParticipantFromBestiary('E0-P-926', { library: load('L26') });
  const plan = planMovement(vampire, 'wallcrawler');
  assert.deepEqual(plan.effects, [{ autoSuccess: 'Escalade' }]);
  assert.equal(plan.available, true);
});

test('T4 Amphibie — +1 DR en V5, Bonus d\'Agilité au Zoo', () => {
  assert.deepEqual(planMovement(synthetic(['Amphibious']), 'amphibious').modifiers, [{ scope: 'Natation', dr: 1 }]);
  assert.deepEqual(planMovement(synthetic(['Amphibious'], zoo), 'amphibious').modifiers, [{ scope: 'Natation', dr: 4, source: 'Bonus d\'Agilité' }]);
  assert.equal(planMovement(synthetic(['Amphibious'], { ...zoo, caracs: {} }), 'amphibious').available, false);
});

test('T4 Arboricole, Limicole, Respiration aquatique', () => {
  assert.deepEqual(planMovement(synthetic(['Arboreal']), 'arboreal').modifiers, [{ scope: 'Escalade et Discrétion', dr: 4, source: 'Bonus d\'Agilité' }]);
  assert.equal(planMovement(synthetic(['Arboreal'], { caracs: {} }), 'arboreal').available, false);
  assert.deepEqual(planMovement(synthetic(['Swamp-strider']), 'swampStrider').effects, [{ ignoresTerrainPenalty: 'marécage' }]);
  assert.equal(planMovement(synthetic(['Crustacean']), 'waterBreathing').movement.value, 8);
});

test('T4 Créature marine — hors de l\'eau M à 1 et −2 DR à tous les Tests', () => {
  const marine = withTrait('L25', 'Marine Creature');
  assert.equal(planMovement(marine, 'marine').available, false);
  assert.equal(planMovement(marine, 'marine', { inWater: true }).movement.fullMovement, true);
  const land = planMovement(marine, 'marine', { inWater: false });
  assert.equal(land.movement.value, 1);
  assert.deepEqual(land.modifiers, [{ scope: 'tous les Tests', dr: -2 }]);
  assert.equal(land.receipt.modifiers[0], 'tous les Tests -2 DR');
});

test('T4 Aquatique (Death on the Reik) — pas de déplacement sur terre', () => {
  const swimmer = withTrait('L26', 'Aquatic');
  assert.equal(planMovement(swimmer, 'aquatic', { inWater: true }).available, true);
  assert.match(planMovement(swimmer, 'aquatic', { inWater: false }).unresolved[0], /terre/);
});

test('T4 rappels de fiche sans doublon', () => {
  assert.equal(movementReminders(synthetic(['Fly (50)', 'Arboreal', 'Fly (50)'])).length, 2);
});
