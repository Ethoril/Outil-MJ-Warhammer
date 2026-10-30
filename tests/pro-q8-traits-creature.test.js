import test from 'node:test';
import assert from 'node:assert/strict';
import { planNaturalAttack } from '../js/core/creature-combat.js';
import { planSwarm } from '../js/core/creature-states.js';
import { planPsychology } from '../js/core/creature-psychology.js';
import { planCreatureMagic } from '../js/core/creature-magic.js';
import { attacksAreMagical, natureReminders } from '../js/core/creature-natures.js';
import { weaponAttackNature } from '../js/core/v5-magic-combat.js';

// Écarts au livre de base V5 (L06, Traits de créature, pp.356-363).
const make = (traits, extra = {}) => ({ id: 'x', name: 'X', traits, caracs: { F: 50, E: 40, Int: 20, FM: 35 }, hp: 10, maxHp: 10, ...extra });

test('Q8 Langue — une touche donne Enchevêtré', () => {
  const plan = planNaturalAttack(make(['Tongue']), 'tongue', { actorSize: 4, targetSize: 2 });
  assert.deepEqual(plan.effects, [{ state: 'Enchevêtré', trigger: 'touche' }]);
  assert.equal(plan.available, true);
});

test('Q8 Souffle par type — dégâts, état et zone', () => {
  const breath = (type, caracs) => planNaturalAttack(make([`Breath (${type})`], { caracs }), 'breath');
  const fire = breath('Fire', { F: 50, E: 40 });
  assert.equal(fire.damageFormula, '8');
  assert.deepEqual(fire.effects, [{ state: 'Enflammé', trigger: 'cible perdante' }]);
  assert.match(fire.reminders.join(' '), /BF mètres/);
  assert.equal(breath('Acid', { F: 50, E: 40 }).damageFormula, '8');
  assert.equal(breath('Acid', { F: 50, E: 60 }).damageFormula, '10');
  assert.equal(breath('Cold', { F: 50, E: 40 }).damageFormula, '7');
  assert.deepEqual(breath('Cold', { F: 50 }).effects, [{ state: 'Fatigué', trigger: 'cible perdante' }]);
  assert.equal(breath('Electricity', { F: 50 }).damageFormula, '7');
  assert.deepEqual(breath('Electricity', { F: 50 }).effects, [{ state: 'Sonné', trigger: 'cible perdante' }]);
  assert.equal(breath('Poison', { F: 50, E: 40 }).damageFormula, '6');
  assert.deepEqual(breath('Poison', { F: 50, E: 40 }).effects, [{ state: 'Empoisonné', trigger: 'cible perdante' }]);
  const smoke = breath('Smoke', { F: 50, E: 40 });
  assert.equal(smoke.damageFormula, null);
  assert.match(smoke.reminders.join(' '), /fumée/);
  assert.match(breath('Acid', { F: 50 }).unresolved[0], /Endurance/);
  assert.equal(breath('Frost', { F: 50 }).damageFormula, null);
});

test('Q8 Nuée — 1 Blessure par Round à chaque engagé, rien à saisir', () => {
  const plan = planSwarm(make(['Swarm']));
  assert.deepEqual(plan.endOfRound, { damage: 'Blessure directe', amount: 1, targets: 'engagés', amountPrinted: true });
  assert.equal(plan.available, true);
  assert.deepEqual(plan.unresolved, []);
});

test('Q8 Bestial — sous la moitié des Blessures : fuite, ou Frénésie si Territorial', () => {
  const reaction = (traits, options) => planPsychology(make(traits, { hp: 4 }), 'bestial', options).effects.at(-1);
  assert.deepEqual(reaction(['Bestial']), { reaction: 'flee' });
  assert.deepEqual(reaction(['Bestial', 'Territorial']), { reaction: 'frenzy' });
  assert.deepEqual(reaction(['Bestial'], { protecting: true }), { reaction: 'frenzy' });
  assert.equal(planPsychology(make(['Bestial'], { hp: 4 }), 'bestial').available, true);
  assert.equal(planPsychology(make(['Bestial'], { hp: 8 }), 'bestial').effects.some(effect => effect.reaction), false);
});

test('Q8 Dressé — liste V5 avec ses effets, liste V4 conservée', () => {
  const effect = detail => planCreatureMagic(make([`Trained (${detail})`]), 'trained').effects.find(item => item.trainedEffect)?.trainedEffect;
  assert.deepEqual(effect('Broken'), { skill: 'Brisé', ignoresBestial: true, fellowshipBonus: '+2d10' });
  assert.equal(effect('Drive').pullsVehicles, true);
  assert.deepEqual(effect('Entertain'), { skill: 'Divertissement', skills: ['Entertain', 'Perform', 'Play'], bonus: 10 });
  assert.equal(effect('Fetch').fetches, true);
  assert.equal(effect('Guard').grantsTrait, 'Territorial');
  assert.equal(effect('Home').returnsHome, true);
  assert.equal(effect('Magic').ignoresSkittish, 'magie');
  assert.equal(effect('Mount').requiresRideSkill, true);
  assert.deepEqual(effect('War'), { skill: 'Guerre', weaponSkillBonus: 10, ignoresSkittish: 'bruits forts', onlyMountForCombat: true });
  assert.equal(planCreatureMagic(make(['Dressé (Brisé)']), 'trained').effects[0].trainedSkill, 'Brisé');
  assert.deepEqual(planCreatureMagic(make(['Trained (Dig)']), 'trained').effects, [{ trainedSkill: 'Creuser' }]);
});

test('Q8 Artificiel — toutes ses attaques sont Magiques (moteur de nature d\'attaque)', () => {
  const golem = make(['Construct']);
  assert.equal(attacksAreMagical(golem), true);
  assert.equal(attacksAreMagical(make(['Bite'])), false);
  assert.match(natureReminders(golem).join(' '), /attaques sont Magiques/);
  assert.equal(weaponAttackNature({ actor: golem, action: {}, ranged: false }).magical, true);
  assert.notEqual(weaponAttackNature({ actor: make(['Bite']), action: {}, ranged: false }).magical, true);
  assert.equal(weaponAttackNature({ actor: golem, action: {}, ranged: false, declared: { magical: false } }).magical, false);
});

test('Q8 Effrayé (v3 p.356) — Peur (2) de la cible, quel que soit son indice de Peur', () => {
  const afraid = make(['Afraid (Orcs)'], { camp: 'pj' });
  const plan = planPsychology(afraid, 'afraid', { source: make(['Fear (3)'], { id: 'o', camp: 'monstres' }) });
  assert.equal(plan.states[0].rating, 2);
  assert.equal(planPsychology(afraid, 'afraid', { source: make(['Fear'], { id: 'o', camp: 'monstres' }) }).states[0].rating, 2);
  assert.equal(planPsychology(afraid, 'afraid', { source: make([], { id: 'o', camp: 'monstres' }) }).states[0].rating, 2, 'la cible n’a pas besoin d’une Peur imprimée');
  const none = planPsychology(afraid, 'afraid');
  assert.equal(none.available, false);
  assert.deepEqual(none.states, []);
});
