// Lot 4 · C28 (G-ATT-5, décision du MJ du 02/11, livre V5 v3 p. 167) : tir sur cible engagée, Arc elfique CT 60, jet 35, météo −2, couvert −1.
// Quand le Désavantage fait rater un tir qui aurait touché, le combattant touché est tiré au sort (d100) parmi les AUTRES combattants
// de la mêlée (cible initiale exclue) ; il est touché d'office, sans Test de défense, avec le jet sans Désavantage (DR et localisation).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution } from '../../../js/core/resolution.js';

const fighter = (id, camp) => ({ id, name: id, kind: 'PJ', camp, zone: 'active', hp: 30, maxHp: 30, caracs: { CC: 50, CT: 60, F: 30, E: 30, I: 40, Ag: 40 },
  skills: [], states: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });
const archer = fighter('archer', 'pj'), alpha = fighter('alpha', 'pj'), sorcier = fighter('sorcier', 'ennemi'), garde = fighter('garde', 'ennemi');
const shoot = (die, { ids = ['alpha', 'sorcier'], defense } = {}) => previewResolution({ actor: archer, target: alpha, roll: 35, action: { type: 'attack', attr: 'CT', base: 60, damage: 9 },
  v5: { kind: 'ranged', choice: 'reverse', context: { weather: 'rain-wind', cover: true, targetEngaged: true, engagedTargetIds: ids, engagedTargetRoll: die } },
  ...(defense ? { defense } : {}), v5State: { participants: [archer, alpha, sorcier, garde] } });

describe('C28 tir dans la mêlée : déviation vers un autre combattant', () => {
  test('l’inversion obligatoire (jet 53) fait rater le tir : il dévie vers l’autre combattant, touché d’office avec le jet 35 à +0 DR', () => {
    const preview = shoot(25);
    const reverse = preview.decisions.actor.options.find(row => row.id === 'reverse');
    assert.equal(preview.decisions.actor.forcedInversion, true);
    assert.equal(reverse.summary.roll, 53);
    assert.equal(preview.engagedShot.reason, 'forced-disadvantage-miss');
    assert.equal(preview.engagedShot.selectedTargetId, 'sorcier');
    assert.equal(preview.engagedShot.intendedTargetId, 'alpha');
    assert.equal(preview.engagedShot.retainedRoll, 35);
    assert.equal(preview.targetId, 'sorcier');
    assert.equal(preview.roll, 35);
    assert.equal(preview.sl, 0);
    assert.equal(preview.hit, true);
    assert.ok(preview.damage, 'dégâts proposés à la cible déviée');
    assert.deepEqual(preview.unresolved, []);
  });

  test('la cible initiale n’est jamais tirée : le d100 ne désigne que les autres combattants', () => {
    for (const die of [1, 25, 50, 51, 80, 100]) assert.equal(shoot(die).engagedShot.selectedTargetId, 'sorcier', `d100 ${die}`);
    const three = ids => [1, 34, 67, 100].map(die => shoot(die, { ids }).engagedShot.selectedTargetId);
    assert.deepEqual(three(['alpha', 'sorcier', 'garde']), ['sorcier', 'sorcier', 'garde', 'garde']);
  });

  test('aucun Test de défense n’est demandé au combattant touché, même si une défense est saisie pour la cible initiale', () => {
    const preview = shoot(25, { defense: { type: 'skill', label: 'Esquive', attr: 'Ag', base: 40, roll: 40, v5: { kind: 'test', choice: 'keep', context: {} } } });
    assert.equal(preview.engagedShot.selectedTargetId, 'sorcier');
    assert.equal(preview.input.defense, undefined);
    assert.equal(preview.hit, true);
    assert.deepEqual(preview.unresolved, []);
  });

  test('un d100 manquant ou une mêlée sans autre combattant bloque, sans changer de cible', () => {
    assert.ok(shoot(undefined).unresolved.some(row => /d100/.test(row)));
    assert.ok(shoot(25, { ids: ['alpha'] }).unresolved.some(row => /Tir engagé/.test(row)));
  });
});
