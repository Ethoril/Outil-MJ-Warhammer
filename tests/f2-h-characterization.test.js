import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profile = (book, id) => {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'js/data/bestiary', `${book}.json`), 'utf8'));
  return data.profiles.find(entry => entry.id === id);
};

test('F2-H characterization anchors the selected real profiles and their source pages', () => {
  const cases = [
    ['L11', 'E0-P-001', 'Great Stag', 10],
    ['L11', 'E0-P-002', 'The River’S Shadow', 10],
    ['L11', 'E0-P-004', 'Arachnarok Spider', 13],
    ['L18', 'E0-P-565', 'Flying Death Skulls', 117],
    ['L18', 'E0-P-567', 'Flying Death-Ier Skulls', 117],
    ['L22', 'E0-P-744', 'Cliff Spider', 73],
    ['L23', 'E0-P-792', 'Great Cats', 87],
    ['L23', 'E0-P-807', 'The Farmyard Beasts', 106],
    ['L25', 'E0-P-909', 'Sea Elemental', 142],
    ['L25', 'E0-P-910', 'Gargantuan', 143],
    ['L25', 'E0-P-913', 'Merwyrm', 145],
    ['L25', 'E0-P-916', 'Black Leviathan', 147],
    ['L25', 'E0-P-921', 'Wulfrik Sarl Champion', 155]
  ];
  for (const [book, id, name, page] of cases) {
    const item = profile(book, id);
    assert.ok(item, `${book} ${id} exists`);
    assert.equal(item.name, name);
    assert.equal(item.book, book);
    assert.equal(item.page, page);
    assert.equal(item.kind, 'profile');
  }
});

test('paired profiles remain distinguishable for profile-scoped abilities', () => {
  const taal = profile('L11', 'E0-P-001');
  const kurnous = profile('L11', 'E0-P-002');
  const webSpider = profile('L11', 'E0-P-004');
  const ordinarySpider = profile('L22', 'E0-P-744');
  const skull = profile('L18', 'E0-P-565');
  const fireSkull = profile('L18', 'E0-P-567');

  assert.deepEqual(taal.specialRules, ["Taal's Own Blades"]);
  assert.deepEqual(kurnous.specialRules, ["Kurnous' Own Blades"]);
  assert.ok(webSpider.specialRules.includes('Vicious Webs'));
  assert.equal(ordinarySpider.specialRules, undefined);
  assert.equal(skull.specialRules, undefined);
  assert.ok(fireSkull.specialRules.includes('Flaming Dangerous'));
});

