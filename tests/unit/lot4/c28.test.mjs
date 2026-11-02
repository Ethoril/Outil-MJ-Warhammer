// Lot 4 · C28 (G-ATT-5) : tir sur cible engagée, Arc elfique CT 60, jet 35, météo −2, couvert −1, d100 de sélection 25.
// CARACTÉRISATION (passe aujourd'hui) : NON REPRODUIT comme anomalie du moteur. Le moteur applique volontairement la règle
// « si l'inversion obligatoire transforme la touche en échec, un combattant de la mêlée est touché au hasard »
// (L06 p.167, AUDIT_REGLES F-L06-0133 ; resolution.js:440-472) : la touche redirigée garde le jet ordinaire 35 (DR +0),
// l'inversion à 53 (−2 DR) n'est que le jet annulé. Le défaut éventuel est de présentation (carte « Inverser en 53 » encore
// affichée comme choisie) ; voir le rapport pour la décision de règle à prendre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution } from '../../../js/core/resolution.js';

const fighter = (id, camp) => ({ id, name: id, kind: 'PJ', camp, zone: 'active', hp: 30, maxHp: 30, caracs: { CC: 50, CT: 60, F: 30, E: 30, I: 40, Ag: 40 },
  skills: [], states: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });
const archer = fighter('archer', 'pj'), alpha = fighter('alpha', 'pj'), sorcier = fighter('sorcier', 'ennemi');
const shoot = die => previewResolution({ actor: archer, target: alpha, roll: 35, action: { type: 'attack', attr: 'CT', base: 60, damage: 9 },
  v5: { kind: 'ranged', choice: 'reverse', context: { weather: 'rain-wind', cover: true, targetEngaged: true, engagedTargetIds: ['alpha', 'sorcier'], engagedTargetRoll: die } },
  v5State: { participants: [archer, alpha, sorcier] } });

test('C28 caractérisation — l’inversion obligatoire (53, −2 DR) rate ; la touche redirigée au hasard garde le jet 35 à +0 DR', () => {
  const preview = shoot(25);
  const reverse = preview.decisions.actor.options.find(row => row.id === 'reverse');
  assert.equal(preview.decisions.actor.forcedInversion, true);
  assert.equal(reverse.summary.roll, 53);
  assert.equal(reverse.summary.sl, -2);
  assert.equal(preview.engagedShot.reason, 'forced-disadvantage-miss');
  assert.equal(preview.engagedShot.selectedTargetId, 'alpha');
  assert.equal(preview.roll, 35);
  assert.equal(preview.sl, 0);
  assert.equal(shoot(80).engagedShot.selectedTargetId, 'sorcier');
});
