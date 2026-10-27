import test from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution } from '../js/core/resolution.js';

test('F2-E caractérisation — la maladresse de combat est signalée sans table de résultat', () => {
  const preview = previewResolution({
    actor: { id: 'shooter', name: 'Tireur', states: [] },
    target: { id: 'target', name: 'Cible', hp: 12, caracs: { E: 30 }, states: [] },
    action: { id: 'shot', type: 'attack', base: 45, damage: 4, qualities: [] },
    v5: { kind: 'ranged' },
    roll: 100,
    baseRevision: 0
  });

  assert.equal(preview.success, false);
  assert.deepEqual(preview.fumble, { expanded: false });
  assert.equal(preview.damage, null, 'une attaque ratée ne produit pas de dégâts');
  assert.equal(preview.fumbleResult, undefined, 'aucun résultat de table de maladresse n’est encore fourni');
  assert.equal(preview.powderIncident, undefined, 'aucun incident de poudre n’est encore fourni');
});

test('F2-E caractérisation — l’incident de poudre n’est pas implicite dans une maladresse', () => {
  const preview = previewResolution({
    actor: { id: 'shooter', name: 'Tireur', states: [] },
    target: { id: 'target', name: 'Cible', hp: 12, caracs: { E: 30 }, states: [] },
    action: {
      id: 'powder-shot', type: 'attack', base: 45, damage: 4,
      qualities: ['a-poudre-noire']
    },
    v5: { kind: 'ranged' },
    roll: 100,
    baseRevision: 0
  });

  assert.deepEqual(preview.fumble, { expanded: false });
  assert.equal(preview.powderIncident, undefined, 'le marqueur À Poudre noire ne tire pas seul une table d’incident');
});
