// Lot 4 · C32 (G-ARM-4) : les qualités d'action des profils importés portent { id, name, rating } sans `parameter`.
// Le cycle de rechargement doit les lire comme celles du catalogue (voir aussi tests/lot4-c32-browser.mjs pour le rappel de Dispersion).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialV5ReloadState } from '../../../js/core/v5-reloading.js';

test('C32 : À répétition 4 et Recharge 2 lus depuis { rating } initialisent le chargeur comme { parameter }', () => {
  const imported = initialV5ReloadState({ keywords: [{ id: 'a-repetition', name: 'À répétition', rating: 4 }, { id: 'recharge', name: 'Recharge', rating: 2 }] });
  const catalogue = initialV5ReloadState({ keywords: [{ id: 'a-repetition', parameter: '4' }, { id: 'recharge', parameter: '2' }] });
  assert.equal(imported.ready, true, JSON.stringify(imported.unresolved));
  assert.deepEqual(imported.state, catalogue.state);
  assert.equal(imported.state.shotsRemaining, 4);
  assert.equal(imported.state.reloadSuccesses, 2);
});
