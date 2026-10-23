import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L10.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D10 Sylvania : 29 profils V4 avec nom français', () => {
  assert.equal(book.profiles.length, 29);
  assert.ok(book.profiles.every(profile => profile.kind === 'profile' && profile.nameFr));
  assert.ok(!book.profiles.some(profile => /Human|Peasant|Witch|Servant|Priest|Mystic|Clerk|Foreman|Sentry|Gang Boss|Tax Collector|Prowler/.test(profile.nameFr)), 'plus de mots anglais dans les noms proposés');
});

test('D10 : valeurs imprimées du capitaine rôdeur (p. 12), du Drakenhund (p. 38), de la sorcière squelette et de Graug (p. 51)', () => {
  assert.deepEqual(byId('E0-P-365').stats, { M: 3, CC: 62, CT: 45, F: 31, E: 58, I: 46, Ag: 32, Dex: 44, Int: 45, FM: 49, Soc: 20 });
  assert.equal(byId('E0-P-365').wounds, 17);
  assert.deepEqual(byId('E0-P-369').stats, { M: 5, CC: 40, CT: null, F: 30, E: 35, I: 35, Ag: 15, Dex: null, Int: 15, FM: 10, Soc: 10 });
  assert.deepEqual(byId('E0-P-371').stats, { M: 6, CC: 45, CT: 20, F: 45, E: 40, I: 30, Ag: 20, Dex: 20, Int: 50, FM: 50, Soc: 30 });
  assert.deepEqual([byId('E0-P-372').wounds, byId('E0-P-372').stats.CC, byId('E0-P-372').stats.E, byId('E0-P-372').stats.Int], [88, 70, 80, null]);
});

test('D10 : espèces et natures', () => {
  assert.deepEqual(byId('E0-P-365').keywords, ['nain']);
  assert.deepEqual(byId('E0-P-370').keywords, ['fantome']);
  assert.deepEqual(byId('E0-P-371').keywords, ['sorciere', 'squelette']);
  assert.deepEqual(byId('E0-P-372').keywords, ['dragon', 'zombie']);
  assert.deepEqual(byId('E0-P-373').keywords, ['goule']);
  assert.deepEqual(byId('E0-P-383').keywords, ['vampire']);
});
