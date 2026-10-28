import test from 'node:test';
import assert from 'node:assert/strict';
import { planBestiaryProfileAbilities, planBestiaryProfileAbility } from '../js/core/creature-abilities.js';

const p = profileId => ({ profileId, name: profileId });

test('F2-H weapon qualities only belong to the two named stag profiles', () => {
  const taal = planBestiaryProfileAbility(p('E0-P-001'), 'taal-woods');
  const kurnous = planBestiaryProfileAbility(p('E0-P-002'), 'kurnous-woods');
  assert.deepEqual(taal.effects[0].addQualities, ['Empaleuse', 'Perforante']);
  assert.deepEqual(kurnous.effects[0].addQualities, ['Rapide', 'Empaleuse', 'Perforante']);
  assert.equal(planBestiaryProfileAbility(p('E0-P-002'), 'taal-woods').available, false);
  assert.equal(planBestiaryProfileAbility(p('E0-P-001'), 'kurnous-woods').available, false);
});

test('Arachnarok web poison requires a web hit and the Entangled state', () => {
  const actor = p('E0-P-004');
  assert.deepEqual(planBestiaryProfileAbility(actor, 'arachnarok-venom-webs', { webHit: true }).effects, []);
  assert.deepEqual(planBestiaryProfileAbility(actor, 'arachnarok-venom-webs', { webHit: true }).unresolved.length, 1);
  assert.deepEqual(planBestiaryProfileAbility(actor, 'arachnarok-venom-webs', { webHit: true, entangled: true }).effects, [
    { state: 'Empoisonné', trigger: 'toile de l’Arachnarok ayant Enchevêtré la cible' }
  ]);
  assert.equal(planBestiaryProfileAbility(p('E0-P-744'), 'arachnarok-venom-webs', { webHit: true, entangled: true }).available, false);
});

test('Flying Death Skull only proposes reversion at zero Wounds; ordinary profiles are excluded', () => {
  const skull = p('E0-P-565');
  assert.deepEqual(planBestiaryProfileAbility(skull, 'flying-death-skull-zero-wounds', { wounds: 1 }).effects, []);
  assert.equal(planBestiaryProfileAbility(skull, 'flying-death-skull-zero-wounds', { wounds: 0 }).effects[0].requiresGmConfirmation, true);
  assert.equal(planBestiaryProfileAbility(p('E0-P-566'), 'flying-death-skull-zero-wounds', { wounds: 0 }).available, false);
});

test('F2-H attacks and states are tied to their exact creature profile', () => {
  const spider = planBestiaryProfileAbility(p('E0-P-744'), 'cliff-spider-lasso');
  assert.match(spider.reminders.join(' '), /40 yards/);
  assert.deepEqual(spider.effects[0], { attack: 'Bite', addTrait: 'Venin' });
  assert.equal(planBestiaryProfileAbility(p('E0-P-004'), 'cliff-spider-lasso').available, false);

  const cat = planBestiaryProfileAbility(p('E0-P-792'), 'great-cat-deathblow');
  assert.deepEqual(cat.effects, [{ addTrait: 'Coup mortel', ignoresSize: true }]);
  assert.equal(planBestiaryProfileAbility(p('E0-P-807'), 'great-cat-deathblow').available, false);

  const spit = planBestiaryProfileAbility(p('E0-P-807'), 'farmyard-beast-spit');
  assert.deepEqual(spit.effects, [{ attack: 'Crachat', rangeYards: 3, test: 'CT', onHitTest: 'Résistance +0', onFailure: 'Empoisonné' }]);
  assert.equal(planBestiaryProfileAbility(p('E0-P-792'), 'farmyard-beast-spit').available, false);
});

test('Gargantuan ship rules stay a reminder and the living target needs to be grappled for discharge', () => {
  const actor = p('E0-P-910');
  const plan = planBestiaryProfileAbility(actor, 'gargantuan-electric-discharge', { targetGrappled: true });
  assert.equal(plan.effects[0].damage, 10);
  assert.equal(plan.effects[0].ignoresArmour, 'métal non magique');
  assert.match(planBestiaryProfileAbilities(actor).flatMap(item => item.reminders).join(' '), /navire/);
  assert.deepEqual(planBestiaryProfileAbility(actor, 'gargantuan-electric-discharge').effects, []);
  assert.equal(planBestiaryProfileAbility(p('E0-P-916'), 'gargantuan-electric-discharge', { targetGrappled: true }).available, false);
});

test('Merwyrm bite, Black Leviathan, Wulfrik and Gravelord remain profile-scoped', () => {
  assert.deepEqual(planBestiaryProfileAbility(p('E0-P-913'), 'merwyrm-fanged-maw-venom').effects, [
    { attack: 'Fanged Maw', addTrait: 'Venin (Difficile)' }
  ]);
  assert.equal(planBestiaryProfileAbility(p('E0-P-057'), 'merwyrm-fanged-maw-venom').available, false);
  assert.ok(planBestiaryProfileAbility(p('E0-P-916'), 'black-leviathan-ship-reminder').reminders[0].includes('non modélisée'));
  assert.deepEqual(planBestiaryProfileAbility({ name: 'Hans Grüber' }, 'gravelord-variants').effects, []);
  assert.equal(planBestiaryProfileAbility(p('E0-P-921'), 'wulfrik-head-taker', { critical: true }).effects[0].chooseHitLocation, 'tête');
  assert.equal(planBestiaryProfileAbility(p('E0-P-921'), 'wulfrik-champion-slayer', { singleCombatLeader: true }).effects[0].momentum, 1);
  assert.equal(planBestiaryProfileAbility(p('E0-P-916'), 'wulfrik-head-taker', { critical: true }).available, false);
});
