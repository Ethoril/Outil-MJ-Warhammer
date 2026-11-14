// Nom français d'abord (chantier images des pions, S13, CA39) : un profil copié du bestiaire prend son nom français quand
// il existe, sinon l'anglais ; la Bibliothèque affiche « Nom français — nom anglais » et trie par le nom français.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { bestiaryDisplayName, buildParticipantFromBestiary, buildReserveProfileFromBestiary, filterBestiary } from '../../../js/core/bestiary-profiles.js';
import { sortProfiles } from '../../../js/core/bestiary-folder-tree.js';

const L06 = JSON.parse(readFileSync(fileURLToPath(new URL('../../../js/data/bestiary/L06.json', import.meta.url)), 'utf8')).profiles;
const loup = L06.find(p => p.name === 'Wolf');
const sansFr = { ...loup, id: 'E0-P-99901', nameFr: undefined, name: 'Nameless Wolf' };
const library = [...L06, sansFr];

test('copie en réserve et ajout au combat : nom français, rang d’exemplaire compris', () => {
  assert.equal(loup.nameFr, 'Loup');
  assert.equal(buildReserveProfileFromBestiary(loup.id, { library }).name, 'Loup');
  assert.equal(buildParticipantFromBestiary(loup.id, { library }).name, 'Loup');
  assert.equal(buildParticipantFromBestiary(loup.id, { library, index: 2 }).name, 'Loup 2');
});

test('sans nom français, le nom anglais', () => {
  assert.equal(buildReserveProfileFromBestiary(sansFr.id, { library }).name, 'Nameless Wolf');
  assert.equal(buildParticipantFromBestiary(sansFr.id, { library, index: 1 }).name, 'Nameless Wolf 1');
});

test('le lien au bestiaire ne dépend pas du nom (image automatique, monture)', () => {
  assert.equal(buildReserveProfileFromBestiary(loup.id, { library }).extensions.v5.bestiary.id, loup.id);
});

test('nom affiché : « français — anglais », un seul nom quand ils sont identiques ou qu’il n’y en a qu’un', () => {
  assert.equal(bestiaryDisplayName(loup), 'Loup — Wolf');
  assert.equal(bestiaryDisplayName({ name: 'Bear', nameFr: 'Ours' }), 'Ours — Bear');
  assert.equal(bestiaryDisplayName({ name: 'Rhinox', nameFr: 'Rhinox' }), 'Rhinox');
  assert.equal(bestiaryDisplayName({ name: 'Gor', nameFr: ' gor ' }), 'gor');
  assert.equal(bestiaryDisplayName({ name: 'Stegadon', nameFr: 'Stégadon' }), 'Stégadon', 'même nom aux accents près');
  assert.equal(bestiaryDisplayName({ name: 'Nameless Wolf' }), 'Nameless Wolf');
});

test('tri par nom français (accents et casse à la française), repli sur l’anglais', () => {
  const rows = [
    { name: 'Wolf', nameFr: 'Loup' }, { name: 'Bear', nameFr: 'Ours' }, { name: 'Elk', nameFr: 'élan' },
    { name: 'Eagle', nameFr: 'Aigle' }, { name: 'Ghoul', nameFr: 'Goule' }, { name: 'Fen Beast' }
  ];
  assert.deepEqual(sortProfiles(rows).map(bestiaryDisplayName), ['Aigle — Eagle', 'élan — Elk', 'Fen Beast', 'Goule — Ghoul', 'Loup — Wolf', 'Ours — Bear']);
});

test('la recherche trouve toujours les deux noms', () => {
  assert.ok(filterBestiary(library, { text: 'loup' }).some(p => p.id === loup.id));
  assert.ok(filterBestiary(library, { text: 'WOLF' }).some(p => p.id === loup.id));
});
