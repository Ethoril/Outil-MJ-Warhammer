import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ficheSnapshot, planProfileSync, applyFicheSync } from '../js/core/fiche-sync.js';
const fiche = JSON.parse(readFileSync(new URL('./fixtures/fiche-caelel.json', import.meta.url)));
const snap = (race, talentsAcq = []) => ficheSnapshot('caelel', { ...fiche, race, talentsAcq });
test('espèces : mouvement et blessures sur fiche réelle', () => {
  for (const [race, movement, wounds] of [['halfelin',3,14],['halfling',3,14],['ogre',6,28],['gnome',3,11],['elfe noir',5,14],['elfe-des-mers',5,14],['skink',6,11],['humain',4,14],['nain',3,14],['haut-elfe',5,14],['elfe-sylvain',5,14]]) {
    const s = snap(race); assert.equal(s.movement, movement, race); assert.equal(s.wounds, wounds, race);
  }
  assert.equal(snap('ogre', [{nom:'Dur à cuire'}]).wounds, 36);
});
test('espèce inconnue : avertissement et synchronisation partielle', () => {
  assert.ok(snap('constructor').warnings.some(w => w.code === 'unknown-species'));
  const s = snap('inconnue');
  const profile = {id:'pj',name:'Caelel',kind:'PJ',hp:10,movement:7,caracs:{},diceLines:[]};
  const plan = planProfileSync(s, profile);
  assert.equal(s.movement, null); assert.ok(plan.warnings.some(w => w.code === 'unknown-species'));
  const next = applyFicheSync({reserve:[profile]}, [{profileId:'pj',charId:'caelel',snapshot:s}]);
  assert.equal(next.reserve[0].movement, 7); assert.equal(next.reserve[0].hp, 14);
  assert.ok(next.reserve[0].skills.length > 0);
});
