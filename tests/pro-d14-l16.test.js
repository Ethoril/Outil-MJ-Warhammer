import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const book = JSON.parse(readFileSync(new URL('../js/data/bestiary/L16.json', import.meta.url), 'utf8'));
const byId = id => book.profiles.find(profile => profile.id === id);
const count = kind => book.profiles.filter(profile => profile.kind === kind).length;
const attacks = id => byId(id).attacks.map(attack => [attack.name, attack.damage]);

test('D14 Lords of Stone and Steel : 23 profils, noms français proposés, mots-clés', () => {
  assert.equal(book.profiles.length, 23);
  assert.deepEqual([count('profile'), count('template'), count('pregenerated-character')], [23, 0, 0]);
  assert.ok(book.profiles.every(profile => profile.nameFr));
  assert.equal(byId('E0-P-507').nameFr, 'Dragon de magma');
  assert.deepEqual(byId('E0-P-492').keywords, ['nain']);
  assert.deepEqual(byId('E0-P-503').keywords, ['nain']);
  assert.deepEqual(byId('E0-P-508').keywords, ['dragon']);
  assert.deepEqual(byId('E0-P-514').keywords, ['skaven']);
});

test('D14 : valeurs imprimées de Thorgrim (p. 7), Kazgar (p. 30) et du rat de la peste (p. 90)', () => {
  assert.deepEqual(byId('E0-P-492').stats, { M: 3, CC: 82, CT: 35, F: 65, E: 75, I: 26, Ag: 30, Dex: 48, Int: 65, FM: 85, Soc: 45 });
  assert.equal(byId('E0-P-492').wounds, 28);
  assert.deepEqual(byId('E0-P-492').armour, { ap: 7, printedTotal: 18 });
  assert.deepEqual(byId('E0-P-496').stats, { M: 3, CC: 65, CT: 45, F: 50, E: 60, I: 30, Ag: 25, Dex: 42, Int: 30, FM: 60, Soc: 25 });
  assert.equal(byId('E0-P-496').wounds, 23);
  assert.deepEqual(byId('E0-P-513').stats, { M: 4, CC: 35, CT: null, F: 30, E: 25, I: 25, Ag: 35, Dex: null, Int: 15, FM: 15, Soc: 11 });
  assert.equal(byId('E0-P-513').wounds, 5);
});

test('D14 : portée imprimée avant les dégâts, armure nommée, étiquette décalée et interligne double lus', () => {
  assert.deepEqual(attacks('E0-P-493'), [['Dwarf Crossbow', 10], ['Hammer of Azul', 14]]);
  assert.deepEqual(byId('E0-P-495').armour, { ap: 1, printedTotal: 5, detail: 'Leather Apron' });
  assert.deepEqual(attacks('E0-P-495'), [['Blunderbuss', 8], ['Dwarf Warhammer', 7]]);
  assert.deepEqual(attacks('E0-P-496'), [['Runic Greataxe', 12]]);
  assert.deepEqual(attacks('E0-P-512'), [['Swords', 7]]);
  assert.ok(byId('E0-P-502').skills.length > 0 && byId('E0-P-492').talents.length > 0);
});
