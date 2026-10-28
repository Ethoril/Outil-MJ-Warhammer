import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendageCriticalLocation,
  normalizeHitMorphology,
  resolveCreatureHitLocation
} from '../js/core/v5-hit-morphology.js';

const base = (key, name) => ({ roll: 40, key, name, side: /gauche/i.test(name) ? 'left' : /droit/i.test(name) ? 'right' : null });

test('F2-G — quadrupède : bras et jambes deviennent pattes avant et arrière', () => {
  assert.equal(resolveCreatureHitLocation({ morphology: 'quadrupède', baseLocation: base('ARM', 'Bras Gauche') }).name, 'Patte avant gauche');
  assert.equal(resolveCreatureHitLocation({ morphology: 'quadruped', baseLocation: base('LEG', 'Jambe Droite') }).name, 'Patte arrière droite');
  assert.equal(resolveCreatureHitLocation({ morphology: 'quadruped', baseLocation: base('HEAD', 'Tête') }).key, 'HEAD');
});

test('F2-G — oiseaux : bras devient aile en conservant le côté et la table ARM', () => {
  const wing = resolveCreatureHitLocation({ morphology: 'oiseau', baseLocation: base('ARM', 'Bras Droit') });
  assert.deepEqual({ key: wing.key, side: wing.side, name: wing.name }, { key: 'ARM', side: 'right', name: 'Aile droite' });
});

test('F2-G — serpent : limites inclusives 01–19 tête, 20–100 corps', () => {
  for (const roll of [1, 15, 19]) assert.equal(resolveCreatureHitLocation({ roll, morphology: 'serpent', baseLocation: base('BODY', 'Corps') }).key, 'HEAD');
  for (const roll of [20, 40, 100]) assert.equal(resolveCreatureHitLocation({ roll, morphology: 'snake', baseLocation: base('BODY', 'Corps') }).key, 'BODY');
});

test('F2-G — araignée : limites inclusives 01–09 tête, 10–79 pattes, 80–100 corps', () => {
  for (const roll of [1, 9]) assert.equal(resolveCreatureHitLocation({ roll, morphology: 'araignée', baseLocation: base('BODY', 'Corps') }).key, 'HEAD');
  for (const roll of [10, 40, 79]) assert.equal(resolveCreatureHitLocation({ roll, morphology: 'spider', baseLocation: base('BODY', 'Corps') }).key, 'ARM');
  for (const roll of [80, 100]) assert.equal(resolveCreatureHitLocation({ roll, morphology: 'spider', baseLocation: base('BODY', 'Corps') }).key, 'BODY');
});

test('F2-G — forme choisie par le MJ; valeur absente/unknown conserve le lieu humanoïde', () => {
  assert.equal(normalizeHitMorphology('serpent'), 'snake');
  assert.deepEqual(resolveCreatureHitLocation({ roll: 15, morphology: 'quadruped', baseLocation: base('ARM', 'Bras Gauche') }), {
    ...base('ARM', 'Bras Gauche'), name: 'Patte avant gauche'
  });
  const humanoid = base('ARM', 'Bras Gauche');
  assert.equal(resolveCreatureHitLocation({ roll: 15, morphology: null, baseLocation: humanoid }), humanoid);
  assert.equal(resolveCreatureHitLocation({ roll: 15, morphology: 'chimera', baseLocation: humanoid }), humanoid);
});

test('F2-G — appendice sans table dédiée utilise la table de critique du bras', () => {
  assert.deepEqual(appendageCriticalLocation(base('BODY', 'Queue'), 'Queue'), {
    ...base('BODY', 'Queue'), key: 'ARM', appendageCriticalTable: 'ARM'
  });
});
