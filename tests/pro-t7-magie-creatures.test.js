import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCreatureMagicTrait, creatureMagicTraits, planCreatureMagic, magicResistanceReduction, creatureMagicReminders } from '../js/core/creature-magic.js';

const make = (traits, extra = {}) => ({ id: 'x', name: 'X', traits, caracs: { Int: 30, FM: 35, Soc: 25 }, camp: 'monstres', ...extra });

test('T7 lecture des Traits, anglais ou français', () => {
  assert.deepEqual(parseCreatureMagicTrait('Spellcaster (Fire)'), { key: 'spellcaster', name: 'Spellcaster', detail: 'Fire' });
  assert.equal(parseCreatureMagicTrait('Résistance à la Magie').key, 'magicResistance');
  assert.equal(parseCreatureMagicTrait('Dressé (Creuser)').key, 'trained');
  assert.equal(parseCreatureMagicTrait('Bite'), null);
  assert.deepEqual(parseCreatureMagicTrait('Mark of Chaos (Nurgle)'), { key: 'mark', name: 'Mark of Chaos', detail: 'Nurgle', god: 'nurgle' });
  assert.equal(parseCreatureMagicTrait('Marque de Khorne').god, 'khorne');
  assert.equal(creatureMagicTraits(make(['Mutation', 'Mutation', 'Mark of Khorne', 'Mark of Tzeentch'])).length, 3);
});

test('T7 Résistance à la Magie — −3 DR en V5, indice imprimé pour le Zoo', () => {
  assert.equal(magicResistanceReduction(make([])), 0);
  assert.equal(magicResistanceReduction(make(['Magic Resistance'])), 3);
  assert.equal(magicResistanceReduction(make(['Magic Resistance (2)'])), 3);
  const zoo = make(['Magic Resistance (2)'], { extensions: { v5: { bestiary: { book: 'L11' } } } });
  assert.equal(magicResistanceReduction(zoo), 2);
  const plan = planCreatureMagic(make(['Magic Resistance']), 'magicResistance');
  assert.deepEqual(plan.modifiers, [{ scope: 'sorts qui affectent la créature', dr: -3 }]);
  assert.deepEqual(plan.effects, [{ spellReduction: 3 }]);
});

test('T7 Lanceur de sorts — domaine, Focalisation et Langue magique de départ', () => {
  const plan = planCreatureMagic(make(['Spellcaster (Fire)']), 'spellcaster');
  assert.equal(plan.available, true);
  assert.deepEqual(plan.effects, [{ lore: 'Fire' }]);
  assert.deepEqual(plan.tests.map(t => [t.skill, t.base]), [['Focalisation', 45], ['Langue magique', 40]]);
  assert.equal(planCreatureMagic(make(['Spellcaster']), 'spellcaster').available, false);
  const fixed = planCreatureMagic(make(['Spellcaster (Fire)']), 'spellcaster', { focusBase: 60, tongueBase: 55 });
  assert.deepEqual(fixed.tests.map(t => t.base), [60, 55]);
  assert.equal(planCreatureMagic(make(['Spellcaster (Fire)'], { caracs: {} }), 'spellcaster').available, false);
});

test('T7 Béni et Miracles — Prière à Sociabilité+10 ou valeur du MJ', () => {
  const blessed = planCreatureMagic(make(['Blessed (Sigmar)']), 'blessed');
  assert.deepEqual(blessed.effects, [{ deity: 'Sigmar', access: 'Bénédictions' }]);
  assert.equal(blessed.tests[0].base, 35);
  assert.equal(planCreatureMagic(make(['Miracles (Ulric)']), 'miracles', { prayerBase: 50 }).tests[0].base, 50);
  assert.equal(planCreatureMagic(make(['Miracles']), 'miracles').available, false);
});

test('T7 Champion — dégâts comme l\'attaquant', () => {
  assert.deepEqual(planCreatureMagic(make(['Champion']), 'champion').effects, [{ defensiveMeleeWinDamage: 'comme l\'attaquant' }]);
});

test('T7 Marques du Chaos — variantes sans fusion, rival visible', () => {
  const khorne = planCreatureMagic(make(['Mark of Khorne']), 'mark');
  assert.deepEqual(khorne.effects, [{ god: 'khorne', rival: 'Slaanesh', reciprocalAnimosityWhileVisible: true }]);
  assert.match(khorne.reminders[0], /Frénésie/);
  const tz = planCreatureMagic(make(['Mark of Tzeentch']), 'mark');
  assert.match(tz.reminders[0], /Mutations/);
  assert.equal(planCreatureMagic(make(['Mark of Chaos']), 'mark').available, false);
  const two = make(['Mark of Khorne', 'Mark of Tzeentch']);
  assert.equal(planCreatureMagic(two, 'mark', { god: 'Tzeentch' }).effects[0].god, 'tzeentch');
  assert.equal(planCreatureMagic(make(['Mark of Chaos (Nurgle)']), 'mark').effects[0].god, 'nurgle');
});

test('T7 Corruption, Corruption mentale, Mutation — tirage du MJ', () => {
  assert.deepEqual(planCreatureMagic(make(['Corruption (Strength)']), 'corruption').effects, [{ corruptingInfluence: 'Strength' }]);
  assert.equal(planCreatureMagic(make(['Corruption']), 'corruption').available, false);
  assert.deepEqual(planCreatureMagic(make(['Mental Corruption']), 'mentalCorruption').effects, [{ table: 'corruption mentale', drawnBy: 'MJ' }]);
  assert.deepEqual(planCreatureMagic(make(['Mutation']), 'mutation').effects, [{ table: 'corruption physique', drawnBy: 'MJ' }]);
});

test('T7 Dressé — compétence par précision, Dressage du maître', () => {
  const dig = planCreatureMagic(make(['Trained (Dig)']), 'trained');
  assert.deepEqual(dig.effects, [{ trainedSkill: 'Creuser' }]);
  assert.equal(dig.tests[0].bonus, 20);
  const round = planCreatureMagic(make(['Trained (Round)']), 'trained');
  assert.equal(round.tests[0].bonus, 0);
  assert.deepEqual(planCreatureMagic(make(['Trained (Point)']), 'trained').tests, []);
  assert.equal(planCreatureMagic(make(['Trained']), 'trained').available, false);
  assert.deepEqual(planCreatureMagic(make(['Trained (Dig)', 'Trained (Heel)']), 'trained', { skill: 'heel' }).effects, [{ trainedSkill: 'Au pied' }]);
});

test('T7 Trait absent et rappels sans doublon', () => {
  assert.equal(planCreatureMagic(make(['Bite']), 'mutation').available, false);
  assert.equal(creatureMagicReminders(make(['Mutation', 'Mutation', 'Champion'])).length, 2);
});
