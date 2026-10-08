import test from 'node:test';
import assert from 'node:assert/strict';
import { V5_RULES, V5_CORRUPTION_BANDS } from '../js/data/v5-rules.js';
import { V5_CRIT_DATA, getV5CriticalEffect } from '../js/data/v5-crits.js';

// Independent transcription of the numerical columns in the personal V5 core,
// pp.173–176. Fixtures certify consultation and resolver share all 80 intervals.
const criticalColumns = {
  HEAD: [[3,0],[9,1],[12,1],[17,1],[20,1],[25,2],[30,2],[35,2],[40,2],[45,3],[50,3],[55,3],[60,3],[65,4],[75,4],[80,4],[85,5],[94,5],[99,5],[null,0]],
  ARM: [[10,0],[20,0],[25,1],[30,1],[45,1],[50,1],[55,2],[60,2],[65,2],[80,2],[85,3],[90,3],[95,3],[109,4],[115,4],[120,4],[125,5],[130,5],[135,5],[null,0]],
  BODY: [[10,0],[15,1],[25,1],[30,1],[35,1],[50,2],[55,2],[60,2],[65,2],[70,3],[75,3],[80,3],[85,3],[90,4],[95,4],[100,4],[105,5],[110,5],[115,5],[null,0]],
  LEG: [[10,0],[20,0],[25,1],[40,1],[45,1],[50,1],[55,2],[60,2],[65,2],[70,2],[75,3],[80,3],[85,3],[95,4],[100,4],[105,4],[115,4],[120,5],[125,5],[null,0]]
};
for (const [key, columns] of Object.entries(criticalColumns)) {
  test(`V5 rule data: all ${key} critical intervals and wounds match the core`, () => {
    assert.equal(V5_CRIT_DATA[key].length, 20);
    let lower = 1;
    for (const [index, [maximum, wounds]] of columns.entries()) {
      const entry = V5_CRIT_DATA[key][index];
      assert.equal(entry.max, maximum ?? Number.MAX_SAFE_INTEGER);
      assert.equal(entry.parsed.extraWounds, wounds);
      assert.equal(entry.parsed.death, index === 19);
      assert.equal(getV5CriticalEffect(key, lower), entry);
      if (maximum !== null) { assert.equal(getV5CriticalEffect(key, maximum), entry); lower = maximum + 1; }
      else assert.equal(getV5CriticalEffect(key, 1000), entry);
    }
    assert.deepEqual(JSON.parse(JSON.stringify(V5_CRIT_DATA[key])), V5_CRIT_DATA[key]);
  });
}
const corruptionCases = [
  ['minor',false,0,1],['minor',true,0,0],['minor',true,4,0],
  ['moderate',false,0,2],['moderate',false,-1,2],['moderate',true,0,1],['moderate',true,1,0],
  ['major',false,0,3],['major',true,0,2],['major',true,1,1],['major',true,3,1],['major',true,4,0]
];
for (const [kind, success, sl, points] of corruptionCases) {
  test(`V5 rule data: ${kind} corruption ${success ? 'success' : 'failure'} ${sl} SL gives ${points}`, () => {
    const bands = V5_CORRUPTION_BANDS[kind];
    const actual = success ? bands.success.find(band => band.maxSL === null || sl <= band.maxSL).points : bands.failurePoints;
    assert.equal(actual, points);
  });
}
test('V5 rule data: displayed corruption uses the corrected marginal and +1/+4 thresholds', () => {
  const block = V5_RULES.find(rule => rule.id === 'corruption');
  const moderate = block.sections.find(section => section.h4 === 'Influence modérée');
  const major = block.sections.find(section => section.h4 === 'Influence majeure');
  assert.deepEqual(moderate.ul, ['Échec, même marginal : 2 points de Corruption.', 'Réussite à 0 DR : 1 point de Corruption.', 'Réussite à +1 DR et plus : 0 point de Corruption.']);
  assert.deepEqual(major.ul, ['Échec, même marginal : 3 points de Corruption.', 'Réussite à 0 DR : 2 points de Corruption.', 'Réussite à +1 à +3 DR : 1 point de Corruption.', 'Réussite à +4 DR et plus : 0 point de Corruption.']);
  assert.match(block.source, /187–189/);
});
test('V5 rule data: psychology explains Momentum prohibition, source Advantage and terror beyond first negative SL', () => {
  const block = V5_RULES.find(rule => rule.id === 'psychologie');
  const fear = block.sections.find(section => section.h4 === 'Peur (indice)');
  const terror = block.sections.find(section => section.h4 === 'Terreur (indice)');
  assert.match(fear.ul.join(' '), /aucun gain d’Élan/);
  assert.match(fear.ul.join(' '), /par sa source bénéficient d’Avantage/);
  assert.match(terror.ul.join(' '), /DR négatif après le premier/);
  assert.match(terror.ul.join(' '), /Terreur 2 et échec à −3 DR donnent Brisé 4/);
  assert.match(block.source, /183–184/);
});
