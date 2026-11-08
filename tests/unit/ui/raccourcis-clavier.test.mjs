import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Document minimal : on capture l’écouteur keydown posé par initKeyboardShortcuts.
let listener = null;
globalThis.document = {
  addEventListener: (type, fn) => { if (type === 'keydown') listener = fn; },
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null
};
const { initKeyboardShortcuts, SPACE_SHORTCUTS } = await import('../../../js/ui/keyboard.js');

const spaces = [];
initKeyboardShortcuts({ canUndo: () => false }, {}, (space) => spaces.push(space));

async function press(key, mods = {}) {
  spaces.length = 0;
  const event = { key, code: key, target: { tagName: 'BODY' }, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...mods };
  await listener(event);
  return { spaces: [...spaces], prevented: event.defaultPrevented };
}

test('CAMP-03 — les touches 1 à 4 suivent l’ordre des onglets Préparer, Jouer, Campagne, Bibliothèque', async () => {
  assert.deepEqual((await press('1')).spaces, ['prepare']);
  assert.deepEqual((await press('2')).spaces, ['play']);
  assert.deepEqual((await press('3')).spaces, ['campaign']);
  assert.deepEqual((await press('4')).spaces, ['library']);
  const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
  const order = [...html.matchAll(/data-workspace-space="([a-z]+)"[^>]*role="tab"/g)].map(m => m[1]);
  assert.deepEqual(SPACE_SHORTCUTS.map(s => s.space), order, 'la table des raccourcis suit l’ordre réel des onglets');
  for (const { key, space } of SPACE_SHORTCUTS) {
    assert.match(html, new RegExp(`data-workspace-space="${space}"[^>]*aria-keyshortcuts="${key}"`), `onglet ${space} annonce sa touche`);
  }
});

test('COMP-ACCESSIB-01 — Ctrl, Alt ou Meta désactivent les raccourcis à une touche', async () => {
  for (const mods of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
    for (const key of ['1', '3', 'd']) {
      const result = await press(key, mods);
      assert.deepEqual(result, { spaces: [], prevented: false }, `${JSON.stringify(mods)}+${key}`);
    }
  }
  assert.deepEqual((await press('d')).spaces, ['play'], 'D seul reste actif');
});
