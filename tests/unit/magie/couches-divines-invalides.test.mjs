import test from 'node:test';
import assert from 'node:assert/strict';
import { refreshEffectLayers } from '../../../js/core/v5-magic-effects.js';

// REGLES-04 : une entrée invalide de divineEffects (sauvegarde corrompue) est lue comme absente.
test('REGLES-04 — un élément null dans divineEffects ne bloque pas le recalcul des couches', () => {
  for (const divineEffects of [[null], [null, 'x', []], { pas: 'un tableau' }]) {
    const participant = { id: 'p', caracs: { E: 30, F: 30, M: 4 }, extensions: { v5: { divineEffects, spellEffects: [] } } };
    assert.doesNotThrow(() => refreshEffectLayers(participant), JSON.stringify(divineEffects));
  }
});
