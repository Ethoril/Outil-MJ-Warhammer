import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenColorOptions, syncTokenColorSelect, PJ_TOKEN_COLORS } from '../../../js/ui/token-color-options.js';

test('menu Couleur du pion : camp, cinq PJ, et « Autre » seulement pour une teinte hors liste', () => {
  const base = tokenColorOptions(null);
  assert.deepEqual(base.map(o => o.label), ['Couleur du camp', 'Elysia', 'Hellaya', 'Wren', 'Caelel', 'Bhelgi']);
  assert.deepEqual(base.map(o => o.value), ['', '#b3262e', '#2e9e6e', '#e8846a', '#2a4fa8', '#6fb4e6']);
  assert.equal(PJ_TOKEN_COLORS.length, 5);
  assert.equal(tokenColorOptions('#B3262E').length, 6, 'teinte de la liste (casse ignorée) : pas d’« Autre »');
  const autre = tokenColorOptions('#123ABC');
  assert.deepEqual(autre.at(-1), { label: 'Autre (#123abc)', value: '#123abc' });
  assert.equal(tokenColorOptions('rouge').length, 6, 'valeur invalide ignorée');
});

test('syncTokenColorSelect : sélection de la teinte du profil, sans rien perdre', () => {
  const created = [];
  const select = {
    options: [], value: '',
    ownerDocument: { createElement: () => { const o = { value: '', textContent: '' }; created.push(o); return o; } },
    replaceChildren(...opts) { this.options = opts; },
  };
  syncTokenColorSelect(select, '#2a4fa8');
  assert.equal(select.options.length, 6);
  assert.equal(select.value, '#2a4fa8');
  syncTokenColorSelect(select, '#123abc');
  assert.equal(select.options.length, 7);
  assert.equal(select.value, '#123abc');
  syncTokenColorSelect(select, null);
  assert.equal(select.options.length, 6);
  assert.equal(select.value, '');
});
