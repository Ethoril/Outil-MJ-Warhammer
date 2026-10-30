import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePsychologyTrait, psychologyTraits, planPsychology, psychologyReminders, fearImmunity } from '../js/core/creature-psychology.js';

const make = (traits, extra = {}) => ({ id: 'x', name: 'X', traits, caracs: { Int: 20, FM: 35, E: 40 }, hp: 10, maxHp: 10, camp: 'monstres', ...extra });
const hero = (extra = {}) => ({ id: 'h', name: 'Héros', traits: [], caracs: { FM: 40 }, camp: 'pj', states: [], ...extra });

test('T6 lecture des Traits, anglais ou français', () => {
  assert.deepEqual(parsePsychologyTrait('Fear (2)'), { key: 'fear', name: 'Fear', detail: '2' });
  assert.equal(parsePsychologyTrait('À Sang-froid').key, 'coldBlooded');
  assert.equal(parsePsychologyTrait('Immunité Psychologique').key, 'immunePsychology');
  assert.equal(parsePsychologyTrait('Bite'), null);
  assert.deepEqual(psychologyTraits(make(['Stupid', 'Stupid', 'Bite'])).map(trait => trait.key), ['stupid']);
});

test('T6 Peur — indice un si omis, état proposé à la cible', () => {
  const plan = planPsychology(make(['Fear (2)']), 'fear', { target: hero() });
  assert.equal(plan.available, true);
  assert.equal(plan.states.length, 1);
  assert.equal(plan.states[0].rating, 2);
  assert.equal(plan.states[0].key, 'fear-of-talent');
  assert.equal(planPsychology(make(['Fear']), 'fear', { target: hero() }).states[0].rating, 1);
  assert.deepEqual(planPsychology(make(['Fear (3)']), 'fear').effects, [{ fearRating: 3 }]);
});

test('T6 Peur — immunité Psychologique et alliés exemptés', () => {
  const immune = hero({ traits: ['Immune to Psychology'] });
  const plan = planPsychology(make(['Fear (2)']), 'fear', { target: immune });
  assert.deepEqual(plan.states, []);
  assert.deepEqual(plan.effects, [{ exempt: 'psychology-immunity' }]);
  assert.deepEqual(planPsychology(make(['Fear (2)']), 'fear', { target: make([]) }).states, []);
});

test('T6 Terreur — indice obligatoire, état proposé', () => {
  assert.equal(planPsychology(make(['Terror']), 'terror', { target: hero() }).available, false);
  const plan = planPsychology(make(['Terror (3)']), 'terror', { target: hero() });
  assert.equal(plan.states[0].key, 'terror-of-talent');
  assert.equal(plan.states[0].rating, 3);
});

test('T6 Effrayé — Peur de la source désignée', () => {
  const plan = planPsychology(hero({ traits: ['Afraid (Orcs)'] }), 'afraid', { source: make(['Fear (2)']) });
  assert.equal(plan.states.length, 1);
  assert.equal(plan.states[0].rating, 2);
  assert.equal(plan.states[0].authorId, 'x');
  assert.equal(planPsychology(hero({ traits: ['Afraid (Orcs)'] }), 'afraid').available, false);
});

test('T6 Haine — cible par mots-clés, test de Calme, +1 DR, immunité à la Peur', () => {
  const hater = make(['Hatred (Orc)']);
  const orc = make([], { id: 'o', keywords: ['Orc'] });
  const plan = planPsychology(hater, 'hatred', { target: orc });
  assert.deepEqual(plan.effects[0], { aimedAtTarget: true });
  assert.deepEqual(plan.modifiers, [{ scope: 'mêlée et tir contre la cible', dr: 1 }]);
  assert.equal(plan.tests[0].base, 35);
  const other = planPsychology(hater, 'hatred', { target: make([], { id: 'e', keywords: ['Elfe'] }) });
  assert.deepEqual(other.effects, [{ aimedAtTarget: false }]);
  assert.deepEqual(other.modifiers, []);
  assert.equal(planPsychology(make(['Hatred']), 'hatred').available, false);
});

test('T6 Animosité et Préjugé', () => {
  const orc = make([], { id: 'o', keywords: ['Orc'] });
  const plan = planPsychology(make(['Animosity (Orc)']), 'animosity', { target: orc });
  assert.deepEqual(plan.modifiers, [{ scope: 'Sociabilité contre la cible', dr: 1 }]);
  const prejudice = planPsychology(make(['Prejudice (Orc)']), 'prejudice', { target: orc });
  assert.deepEqual(prejudice.effects, [{ aimedAtTarget: true }]);
  assert.deepEqual(prejudice.modifiers, []);
});

test('T6 Belliqueux — immunité tant qu\'il a de l\'Élan ; variante Temple of Spite', () => {
  const owner = make(['Belligerent'], { extensions: { v5: { hasMomentum: true } } });
  assert.deepEqual(planPsychology(owner, 'belligerent').effects, [{ immuneToFear: true }]);
  assert.equal(fearImmunity(owner), true);
  const spite = make(['Belligerent'], { extensions: { v5: { hasMomentum: true, bestiary: { book: 'L09' } } } });
  assert.equal(planPsychology(spite, 'belligerent').available, false);
  assert.deepEqual(planPsychology(spite, 'belligerent', { enemyHasMomentum: true }).effects, [{ immuneToFear: false }]);
});

test('T6 Bestial — fuite ou Frénésie sous la moitié des Blessures', () => {
  assert.deepEqual(planPsychology(make(['Bestial']), 'bestial').effects, [{ defenceSkill: 'Esquive', noRationalLanguage: true }]);
  const hurt = make(['Bestial'], { hp: 4 });
  assert.deepEqual(planPsychology(hurt, 'bestial').effects.at(-1), { reaction: 'flee' }); // Q8 : fuite par défaut
  assert.deepEqual(planPsychology(hurt, 'bestial', { protecting: true }).effects.at(-1), { reaction: 'frenzy' });
  assert.deepEqual(planPsychology(hurt, 'bestial', { protecting: false }).effects.at(-1), { reaction: 'flee' });
});

test('T6 À Sang-froid — Avantage à Calme', () => {
  const plan = planPsychology(make(['Cold-blooded']), 'coldBlooded');
  assert.deepEqual(plan.modifiers, [{ scope: 'Calme', advantage: true }]);
  assert.deepEqual(plan.effects, [{ ignoreFirstSurpriseEnd: true }]);
  assert.equal(planPsychology(make(['Cold-blooded'], { extensions: { v5: { bestiary: { book: 'L09' } } } }), 'coldBlooded').available, false);
});

test('T6 Féroce — gagne de l\'Élan ; variante à indice', () => {
  const grim = make(['Grim']);
  assert.equal(planPsychology(grim, 'grim').available, false);
  assert.deepEqual(planPsychology(grim, 'grim', { momentum: 0 }).effects, [{ gainMomentum: 1, timing: 'fin de Tour' }]);
  assert.deepEqual(planPsychology(grim, 'grim', { momentum: 2 }).effects, [{ gainMomentum: 0, timing: 'fin de Tour' }]);
  assert.deepEqual(planPsychology(make(['Grim (3)']), 'grim', { momentum: 1 }).effects, [{ setMomentum: 3, timing: 'début de Tour' }]);
  assert.deepEqual(planPsychology(make(['Grim (3)']), 'grim', { blocked: true }).effects, [{ gainMomentum: 0 }]);
});

test('T6 Frénésie — test de Volonté, immunité, attaque gratuite', () => {
  const plan = planPsychology(make(['Frenzy']), 'frenzy');
  assert.equal(plan.tests[0].base, 35);
  assert.equal(plan.tests[0].via, 'talent-frenzy');
  assert.deepEqual(plan.effects, [{ immuneToPsychology: true, freeAttackPerRound: 1, damageBonus: 1 }]);
  assert.equal(planPsychology(make(['Frenzy'], { caracs: {} }), 'frenzy').available, false);
});

test('T6 Affamé et Stupide — tests sur déclencheur', () => {
  assert.equal(planPsychology(make(['Hungry']), 'hungry').available, false);
  assert.deepEqual(planPsychology(make(['Hungry']), 'hungry', { trigger: false }).tests, []);
  assert.equal(planPsychology(make(['Hungry']), 'hungry', { trigger: true }).tests[0].dr, 2);
  assert.deepEqual(planPsychology(make(['Stupid']), 'stupid', { guidedByAlly: true }).tests, []);
  const test4 = planPsychology(make(['Stupid']), 'stupid', { guidedByAlly: false }).tests[0];
  assert.deepEqual([test4.skill, test4.base, test4.dr], ['Intelligence', 20, 4]);
});

test('T6 Craintif, Territorial, Immunité Psychologique, Rage', () => {
  assert.deepEqual(planPsychology(make(['Skittish']), 'skittish').effects[0].conditions, [{ name: 'Brisé', level: 1 }]);
  assert.equal(planPsychology(make(['Territorial']), 'territorial').effects[0].defendsTerritory, true);
  assert.deepEqual(planPsychology(make(['Immune to Psychology']), 'immunePsychology').effects, [{ immuneToPsychology: true }]);
  assert.equal(planPsychology(make(['Fury']), 'fury').effects[0].advantageThresholds.length, 2);
});

test('T6 Trait absent et rappels sans doublon', () => {
  assert.equal(planPsychology(make(['Bite']), 'fear').available, false);
  assert.equal(psychologyReminders(make(['Stupid', 'Hungry', 'Stupid'])).length, 2);
});
