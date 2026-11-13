// REGLES-03 : caractérisation du cumul « meilleur bonus, pire pénalité, exceptions cumulées » des couches de sorts et de prières
// sur ses trois chemins (Caractéristiques, PA, résumé des modificateurs de Test). Écrit avant la fusion ; doit passer avant et après.
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEffectiveStats, calculateEffectiveMagicAP, calculateMagicApByLocation, calculateEffectiveTestModifiers } from '../../../js/core/v5-magic-effects.js';

const layer = (field, values, extra = {}) => ({ [field]: values, ...extra });

test('REGLES-03 Caractéristiques : meilleur bonus, pire malus, cumulables, groupes sommés', () => {
  const spells = [layer('statModifiers', { F: 10, E: -5 }), layer('statModifiers', { F: 20, E: -10, Ag: 0 }), layer('statModifiers', { F: 5 }, { stackable: true }),
    layer('statModifiers', { E: 3 }, { isStackable: true }), null, layer('statModifiers', { Int: 'x', Soc: '7' })];
  const prayers = [layer('statModifiers', { F: 4 }), layer('statModifiers', { F: 6 })];
  assert.deepEqual(calculateEffectiveStats({ F: 30, E: 30, Ag: 30, Int: 30, Soc: 30 }, spells, prayers),
    { F: 30 + 20 + 5 + 6, E: 30 - 10 + 3, Ag: 30, Int: 30, Soc: 37 });
  // Plancher à 0, plafond à 100 si une couche le demande, valeurs décimales gardées.
  assert.deepEqual(calculateEffectiveStats({ F: 5, E: 95, Ag: 10 }, [layer('statModifiers', { F: -20, E: 10 }, { capStatAt100: true }), layer('statModifiers', { Ag: 2.5 })]),
    { F: 0, E: 100, Ag: 12.5 });
  // Caractéristique absente de la base : 0 + net ; entrées non tableau lues comme vides.
  assert.deepEqual(calculateEffectiveStats({}, [layer('statModifiers', { M: 1 })], 'x'), { M: 1 });
  assert.deepEqual(calculateEffectiveStats({ F: 30 }, undefined, undefined), { F: 30 });
});

test('REGLES-03 Bénédiction de Lileath : sources supplémentaires du lanceur seulement', () => {
  const a = (v, extra = {}) => layer('statModifiers', { F: v }, { casterId: 'm', ...extra });
  assert.equal(calculateEffectiveStats({ F: 0 }, [a(10, { casterLileathRank: 1 }), a(8), a(6), layer('statModifiers', { F: 9 }, { casterId: 'n' })]).F, 18);
  assert.equal(calculateEffectiveStats({ F: 0 }, [a(10, { casterLileathRank: 2.7 }), a(8), a(6), a(1)]).F, 24);
  assert.equal(calculateEffectiveStats({ F: 0 }, [layer('statModifiers', { F: 10 }, { casterLileathRank: 3 }), layer('statModifiers', { F: 8 })]).F, 10);
  assert.equal(calculateEffectiveStats({ F: 0 }, [a(10, { casterLileathRank: -1 }), a(8)]).F, 10);
});

test('REGLES-03 PA : groupes développés, non-cumul par localisation, prières sommées', () => {
  const spells = [layer('apModifiers', { all: 1 }), layer('apModifiers', { arms: 2, leftArm: 1 }), layer('apModifiers', { body: -1 }), layer('apModifiers', { body: -2, head: 'x' }),
    layer('apModifiers', { legs: 1 }, { stackable: true })];
  const prayers = [layer('apModifiers', { head: 1 })];
  assert.deepEqual(calculateMagicApByLocation(spells, prayers), { head: 2, body: -1, leftArm: 3, rightArm: 2, leftLeg: 2, rightLeg: 2 });
  assert.deepEqual(calculateEffectiveMagicAP({ head: 1, body: 1, arms: 0, legs: 0 }, spells, {}, prayers),
    { head: 3, body: 0, leftArm: 3, rightArm: 2, leftLeg: 2, rightLeg: 2 });
  // Une couche dont les montants s'annulent n'apparaît pas ; une localisation nette nulle non plus.
  assert.deepEqual(calculateMagicApByLocation([layer('apModifiers', { all: 1, head: -1 }), layer('apModifiers', { body: 1 }), layer('apModifiers', { body: -1 })]),
    { leftArm: 1, rightArm: 1, leftLeg: 1, rightLeg: 1 });
  assert.deepEqual(calculateMagicApByLocation('x', null), {});
});

test('REGLES-03 résumé des Tests : par clé brute, nets nuls retirés, prières sommées', () => {
  const spells = [layer('testModifiers', { Athlétisme: 1, 'carac:e': 2 }), layer('testModifiers', { Athlétisme: 3, Endurance: -1 }), layer('testModifiers', { Endurance: -2 }),
    layer('testModifiers', { Athlétisme: 1 }, { stackable: true }), layer('testModifiers', { Charme: 2 }), layer('testModifiers', { Charme: -2 }), layer('testModifiers', 'x'), null];
  const prayers = [layer('testModifiers', { Athlétisme: 2 }), layer('testModifiers', { Endurance: 1 })];
  assert.deepEqual(calculateEffectiveTestModifiers(spells, prayers), { Athlétisme: 3 + 1 + 2, 'carac:e': 2, Endurance: -2 + 1 });
  assert.deepEqual(calculateEffectiveTestModifiers([layer('testModifiers', { A: 2 })], [layer('testModifiers', { A: -2 })]), {});
  assert.deepEqual(calculateEffectiveTestModifiers(), {});
  const lileath = [layer('testModifiers', { A: 3 }, { casterId: 'm', casterLileathRank: 1 }), layer('testModifiers', { A: 2 }, { casterId: 'm' })];
  assert.deepEqual(calculateEffectiveTestModifiers(lileath), { A: 5 });
});
