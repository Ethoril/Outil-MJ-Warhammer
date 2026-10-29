import test from 'node:test';
import assert from 'node:assert/strict';
import { MAGIC_DATA } from '../js/data/magic.js';
import { V5_CRIT_DATA, getV5CriticalEffect } from '../js/data/v5-crits.js';

// Livre de base V5 EN v3 : table des critiques au Corps (p.175) et table des incidents mineurs (p.238).
test('v3 Entaille douloureuse : l’échec spectaculaire est à −5 DR', () => {
  const entry = getV5CriticalEffect('BODY', 75);
  assert.equal(entry.name, 'Entaille douloureuse');
  assert.match(entry.manual || entry.note || JSON.stringify(entry), /échec à −5 DR ou moins : Inconscient/);
  assert.doesNotMatch(JSON.stringify(V5_CRIT_DATA.BODY), /−6 DR/);
});

test('v3 incidents mineurs : Délié, Rébellion intestinale, Hurlement et Rupture permutés, textes identiques', () => {
  const at = max => MAGIC_DATA.MINOR.find(row => row.max === max);
  assert.deepEqual([20, 25, 50, 70].map(max => at(max).name), ['Délié', 'Rébellion intestinale', 'Hurlement intérieur', 'Rupture']);
  assert.equal(at(20).eff, 'Vos boucles et lacets se défont ; ceintures, sacs, équipement et armures peuvent tomber ou glisser.');
  assert.equal(at(25).eff, 'Vous vous souillez : gagnez Souillé.');
  assert.equal(at(50).eff, 'Gagnez 1 Assourdi pendant 1d10 Rounds.');
  assert.equal(at(70).eff, 'Votre nez, vos yeux et vos oreilles saignent : gagnez 1 Hémorragique.');
});
