import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RULES } from '../js/data/rules.js';
import { APP_VERSION } from '../js/version.js';
import { normalizeSearchText } from '../js/core/sanitize.js';

test('U-09 — les arbitrages du 10 et 11 octobre sont consultables dans les règles MJ', () => {
  const magic = JSON.stringify(RULES.find(block => block.id === 'magie'));
  assert.doesNotMatch(magic, /raccordement.*prévu/);
  const text = normalizeSearchText(magic);
  for (const term of ['reels', 'bagarre', 'dex', '10 secondes', 'fin du tour de son auteur', 'chaque protection', 'sans cible', '0 dr', 'silence', 'coruscating arc', 'seconde vue', 'puissance totale', 'lanceur', 'enorme', 'nuee', 'kadon', 'par action du mj', 'elan']) assert.ok(text.includes(term), term);
});
test('U-10 — version HTML initiale alignée sur js/version.js', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes(`Version ${APP_VERSION}</button>`));
});
