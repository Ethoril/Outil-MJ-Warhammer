import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { repairGlyphs } from '../tools/lib/bestiary-glyphs.mjs';
import { canonicalTalentName, splitGluedTalent } from '../tools/lib/bestiary-record.mjs';
import { resolveTalent } from '../js/core/reference-catalog.js';

const book = id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles;

test('Q15 : les glyphes U+FFFD sont rétablis d’après le glyphe réel du PDF (table par mot, rien de deviné)', () => {
  assert.equal(repairGlyphs('Language (Elth�rin 85)'), 'Language (Elthárin 85)');
  assert.equal(repairGlyphs('Map of Drakenh�henzug'), 'Map of Drakenhöhenzug');
  assert.equal(repairGlyphs('(counts as Zweih�nder)'), '(counts as Zweihänder)');
  assert.equal(repairGlyphs('Ph�\'s Protection'), 'Phâ\'s Protection');
  assert.equal(repairGlyphs('M�na\'s Marsh Magic, M�NA MIMN'), 'Mòna\'s Marsh Magic, MÒNA MIMN');
  assert.equal(repairGlyphs('Stolen Amulet of B�gen'), 'Stolen Amulet of Bögen');
  assert.equal(repairGlyphs('coins to a value of 22 GCs, 11/�'), 'coins to a value of 22 GCs, 11/–');
  assert.equal(repairGlyphs('(Chaos � Tzeentch)'), '(Chaos – Tzeentch)');
  assert.equal(repairGlyphs('d10 � 30 Gold Crown'), 'd10 × 30 Gold Crown');
  assert.equal(repairGlyphs('lists:\n� Petty Magic\n� The Lore of Nurgle'), 'lists:\n• Petty Magic\n• The Lore of Nurgle');
  // Un glyphe inconnu reste visible (jamais deviné).
  assert.equal(repairGlyphs('X�Y'), 'X�Y');
});

test('Q15 : aucun U+FFFD dans les 23 livres', () => {
  const files = readdirSync('js/data/bestiary').filter(name => /^L\d+\.json$/.test(name));
  assert.ok(files.length >= 23);
  for (const file of files) assert.ok(!readFileSync(`js/data/bestiary/${file}`, 'utf8').includes('�'), file);
});

test('Q15 : noms corrigés dans les profils', () => {
  const names = id => JSON.stringify(book(id));
  assert.ok(names('L10').includes('Language (Elthárin)'));
  assert.ok(names('L12').includes('Zweihänder'));
  assert.ok(names('L17').includes('Phâ\'s Protection'));
  assert.ok(names('L17').includes('Mòna\'s Marsh Magic'));
  assert.ok(names('L26').includes('Stolen Amulet of Bögen'));
});

test('Q15 : « Read/ Write » et les variantes de nom sont rattachés au nom du catalogue', () => {
  assert.equal(canonicalTalentName('Read/ Write'), 'Read/Write');
  assert.equal(canonicalTalentName('Warleader'), 'War Leader');
  assert.equal(canonicalTalentName('Fleet Footed'), 'Fleet-footed');
  assert.equal(canonicalTalentName('Public Speaking'), 'Public Speaker');
  assert.equal(canonicalTalentName('Resistance (Chaos)'), 'Resistant (Chaos)');
  assert.equal(canonicalTalentName('Strider (Coastal)'), 'Strider (Coastal)');
  assert.equal(canonicalTalentName('Iron Will'), 'Iron Will');
  // Nom collé au titre de la rubrique voisine (L19 p. 109 : « Warleader » puis « Stinging Tail: … »).
  assert.deepEqual(splitGluedTalent('Warleader Stinging Tail'), ['War Leader']);
  assert.deepEqual(splitGluedTalent('Flee! Noble Blood'), ['Flee!', 'Noble Blood']);
  assert.deepEqual(splitGluedTalent('War Wizard Slann'), ['War Wizard']);
  assert.deepEqual(splitGluedTalent('Iron Will'), ['Iron Will']);
  const all = ['L01', 'L02', 'L03', 'L04', 'L06', 'L07', 'L09', 'L10', 'L11', 'L12', 'L13', 'L14', 'L16', 'L17', 'L18', 'L19', 'L20', 'L21', 'L22', 'L23', 'L24', 'L25', 'L26'].flatMap(book);
  const talents = all.flatMap(profile => (profile.talents || []).map(talent => talent.name));
  for (const wrong of ['Read/ Write', 'Warleader', 'Fleet Footed', 'Public Speaking']) assert.ok(!talents.some(name => name.startsWith(wrong)), wrong);
  assert.ok(talents.includes('Read/Write'));
});

test('Q15 : « Read/Write » est reconnu par le résolveur', () => {
  assert.equal(resolveTalent('Read/Write')?.entry?.id, 'talent-read-write');
});
