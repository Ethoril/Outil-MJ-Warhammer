import test from 'node:test';
import assert from 'node:assert/strict';
import { blockAfter, completenessGaps, findValueRow, normalizeBlockText, stackedBlock, veryIncomplete } from '../tools/lib/bestiary-completeness.mjs';

const CATALOGUE = new Set(['luck', 'shadow']);
const ROW = ['0', '70', '60', '70', '80', '60', '25', '10', '55', '60', '25', '232'];

test('Q25 : la ligne de valeurs ne peut pas commencer au milieu d’un nombre (Sea Dragon L09, M 10 lu comme 0)', () => {
  assert.equal(findValueRow(' 10 70 60 70 80 60 25 10 55 60 25 232 Attacks', ROW), -1);
  assert.ok(findValueRow(' 0 70 60 70 80 60 25 10 55 60 25 232 Attacks', ROW) >= 0);
  // Même borne à droite : « 232 » n’est pas la tête de « 2321 ».
  assert.equal(findValueRow(' 0 70 60 70 80 60 25 10 55 60 25 2321', ROW), -1);
});

test('Q25 : deux profils à la même ligne de valeurs, on prend celle qui suit le nom', () => {
  const text = ' OGRE UN M WS 6 41 32 xx ZEBRE DEUX M WS 6 41 32 xx';
  const row = ['6', '41', '32'];
  assert.equal(findValueRow(text, row, 'Zebre deux — Ogre'), text.lastIndexOf('6 41 32'));
  assert.equal(findValueRow(text, row, 'Ogre un'), text.indexOf('6 41 32'));
});

test('Q25 : profil très incomplet, rubriques sans deux-points (mise en page L09)', () => {
  const empty = { skills: [], talents: [], traits: [], trappings: [] };
  assert.equal(veryIncomplete(empty, ' Attacks Boat Hook (40/+8) Armour Skills Climb 45, Dodge 35').length, 1);
  assert.equal(veryIncomplete({ ...empty, skills: [{ name: 'Climb', value: 45 }] }, ' Skills Climb 45').length, 0);
  assert.equal(veryIncomplete(empty, ' Attacks Boat Hook (40/+8) Armour').length, 0);
});

test('Q25 : profils empilés, le rang n reçoit le n-ième groupe de rubriques (L01 p.14)', () => {
  const header = ' M WS BS S T I Ag Dex Int WP Fel W ';
  const page = `${header}6 41 32 58 52 11 32 25 22 33 26 36 UGRIK${header}6 48 30 53 50 22 33 25 25 33 22 36 Skills: Athletics 45 Trappings: Club Skills: Athletics 43 Trappings: Bow`;
  const text = normalizeBlockText(page);
  const first = text.indexOf('6 41 32');
  const second = text.indexOf('6 48 30');
  assert.ok(stackedBlock(text, first).includes('Athletics 45'));
  assert.ok(stackedBlock(text, second).includes('Athletics 43'));
  assert.ok(!stackedBlock(text, second).includes('Athletics 45'));
  const record = { talents: [], skills: [{ name: 'Athletics', value: 43 }] };
  assert.deepEqual(completenessGaps(record, stackedBlock(text, second), CATALOGUE).skills, []);
  // Un seul en-tête : pas de pile, découpage simple.
  assert.equal(stackedBlock(normalizeBlockText(`${header}6 48 30 Skills: Athletics 43`), 10), null);
  assert.ok(blockAfter(text, first).length > 0);
});
