import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L07.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);

test('D8 Lustria : 68 profils V4 avec nom français', () => {
  assert.equal(book.profiles.length, 68);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.ok(!book.profiles.some(profile => /Generation|Priest|Protector|Mouths/.test(profile.nameFr)), 'plus de mots anglais dans les noms proposés');
});

test('D8 : valeurs imprimées du Slann de 5e génération (p. 123), du Stégadon (p. 177) et du Kroxigor (p. 148)', () => {
  const slann = byId('E0-P-256');
  assert.deepEqual(slann.stats, { M: 4, CC: 45, CT: 35, F: 35, E: 55, I: 20, Ag: 15, Dex: 30, Int: 85, FM: 85, Soc: 30 });
  assert.deepEqual([slann.wounds, slann.size], [42, 'large']);
  const stegadon = byId('E0-P-301');
  assert.deepEqual([stegadon.wounds, stegadon.size, stegadon.stats.CT, stegadon.stats.E], [80, 'enormous', null, 65]);
  assert.deepEqual(byId('E0-P-267').stats, { M: 6, CC: 30, CT: 5, F: 45, E: 45, I: 15, Ag: 20, Dex: 20, Int: 20, FM: 30, Soc: 15 });
});

test('D8 : « Cold- blooded » coupé en fin de ligne est recollé et lié à l’inventaire', () => {
  const skink = byId('E0-P-261');
  assert.ok(skink.traits.some(trait => trait.name === 'Cold-blooded' && trait.ref));
});

test('D8 : espèces et natures', () => {
  assert.deepEqual(byId('E0-P-256').keywords, ['slann']);
  assert.deepEqual(byId('E0-P-255').keywords, ['slann']);
  assert.deepEqual(byId('E0-P-254').keywords, ['elfe-noir']);
  assert.deepEqual(byId('E0-P-252').keywords, ['haut-elfe']);
  assert.deepEqual(byId('E0-P-243').keywords, ['norse']);
  assert.ok(byId('E0-P-247').keywords.includes('demon-de-nurgle'));
  assert.deepEqual(byId('E0-P-291').keywords, ['bete'], 'Chauve-souris géante : pas de mot-clé géant');
});
