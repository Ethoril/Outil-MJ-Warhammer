// Images des pions depuis la bibliothèque de Map Display (docs/specs/images-pions, T3) : résolution de l'image envoyée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLibraryImage, tokenImageOf, libraryImageSrc, tokenImageLabelOf, searchTokenImages } from '../../../js/core/token-image.js';
import { TOKEN_IMAGES } from '../../../js/data/token-images.js';
import { tokenStatesOf, tokenStateOf } from '../../../js/core/map-link-state.js';

const imported = 'data:image/webp;base64,YWJj';
const table = [
  { path: 'maps/tokens/bestiaire/loup.webp', label: 'Loup', group: 'bestiaire', profiles: ['B-LOUP', 'B-LOUP-2'], form: null },
  { path: 'maps/tokens/pnj/aubergiste.webp', label: 'Aubergiste', group: 'pnj', profiles: [], form: null }
];
const fromBestiary = id => ({ id: 'r1', name: 'Loup', extensions: { v5: { bestiary: { id } } } });

test('chemin de bibliothèque : valide sous maps/tokens/, sinon absent', () => {
  assert.equal(normalizeLibraryImage('maps/tokens/bestiaire/loup.webp'), 'maps/tokens/bestiaire/loup.webp');
  for (const ok of ['maps/tokens/a.png', 'maps/tokens/x/y.JPG', 'maps/tokens/b.jpeg', 'maps/tokens/c.gif']) assert.equal(normalizeLibraryImage(ok), ok);
  for (const bad of [undefined, null, 42, '', 'maps/loup.webp', 'maps/tokens/../secret.webp', 'maps/tokens/a/../../b.webp', 'maps/tokens/loup.svg',
    'maps/tokens/loup', '/maps/tokens/loup.webp', 'https://exemple.fr/maps/tokens/loup.webp', 'maps/tokens\\loup.webp', ' maps/tokens/loup.webp',
    'maps/tokens/' + 'a'.repeat(190) + '.webp', imported]) assert.equal(normalizeLibraryImage(bad), undefined, String(bad));
  assert.equal(normalizeLibraryImage('maps/tokens/' + 'a'.repeat(183) + '.webp').length, 200);
});

test('ordre : image importée, puis choisie, puis automatique, sinon rien', () => {
  const profile = { ...fromBestiary('B-LOUP'), tokenImage: imported, tokenLibraryImage: 'maps/tokens/pnj/aubergiste.webp' };
  assert.deepEqual(tokenImageOf(profile, table), { url: imported, source: 'imported' });
  const { tokenImage, ...chosen } = profile;
  assert.deepEqual(tokenImageOf(chosen, table), { url: 'maps/tokens/pnj/aubergiste.webp', source: 'chosen' });
  const { tokenLibraryImage, ...auto } = chosen;
  assert.deepEqual(tokenImageOf(auto, table), { url: 'maps/tokens/bestiaire/loup.webp', source: 'auto' });
  assert.deepEqual(tokenImageOf(fromBestiary('B-LOUP-2'), table).source, 'auto', 'une image sert plusieurs profils');
  assert.deepEqual(tokenImageOf(fromBestiary('B-INCONNU'), table), { url: null, source: null }, 'CA3 : profil non apparié');
  assert.deepEqual(tokenImageOf({ name: 'Sans source' }, table), { url: null, source: null });
  assert.deepEqual(tokenImageOf(null, table), { url: null, source: null });
  assert.deepEqual(tokenImageOf(undefined), { url: null, source: null });
});

test('champ invalide lu comme absent, sans casser la suite de la résolution', () => {
  const profile = { ...fromBestiary('B-LOUP'), tokenImage: 'https://exemple.fr/a.webp', tokenLibraryImage: 'maps/tokens/../x.webp' };
  assert.deepEqual(tokenImageOf(profile, table), { url: 'maps/tokens/bestiaire/loup.webp', source: 'auto' });
});

test('CA1-CA2 : profil copié du bestiaire avant le chantier (seulement extensions.v5.bestiary.id) reçoit l’image de la vraie table', () => {
  const loup = TOKEN_IMAGES.find(row => row.path === 'maps/tokens/bestiaire/loup.webp');
  assert.ok(loup?.profiles.length, 'le Loup est apparié dans la table');
  const old = { id: 'p-ancien', name: 'Loup', kind: 'Créature', hp: 10, extensions: { v5: { bestiary: { id: loup.profiles[0], book: 'L01' } } } };
  assert.deepEqual(tokenImageOf(old), { url: 'maps/tokens/bestiaire/loup.webp', source: 'auto' });
  const npc = { id: 'n1', kind: 'Créature', profileId: 'p-ancien', name: 'Loup', hp: 10 };
  assert.equal(tokenStatesOf([npc], { imageUrlOf: p => tokenImageOf(p.profileId === 'p-ancien' ? old : null).url })['p:n1'].imageUrl, 'maps/tokens/bestiaire/loup.webp');
});

test('CA9 et CA16 : image importée envoyée telle quelle ; un PJ n’envoie toujours rien', () => {
  const profile = { ...fromBestiary('B-LOUP'), tokenImage: imported };
  assert.equal(tokenStateOf({ id: 'g', kind: 'PNJ', name: 'G', hp: 5 }, [], { imageUrl: tokenImageOf(profile, table).url }).imageUrl, imported);
  assert.equal(tokenStateOf({ id: 'e', kind: 'PJ', persistentCharacterId: 'c', name: 'E', hp: 5 }, [], { imageUrl: tokenImageOf(profile, table).url }).imageUrl, null);
});

test('vignette de l’outil, libellé et recherche par nom dans la table', () => {
  assert.equal(libraryImageSrc('maps/tokens/bestiaire/loup.webp'), '../rpg-map-display/maps/tokens/bestiaire/loup.webp');
  assert.equal(libraryImageSrc('maps/tokens/../x.webp'), null);
  assert.equal(libraryImageSrc(imported), null);
  assert.equal(tokenImageLabelOf('maps/tokens/pnj/aubergiste.webp', table), 'Aubergiste');
  assert.equal(tokenImageLabelOf('maps/tokens/pnj/inconnu.webp', table), 'inconnu.webp', 'hors table : nom du fichier');
  assert.deepEqual(searchTokenImages('loup', table).map(row => row.label), ['Loup']);
  assert.deepEqual(searchTokenImages('AUBERG', table).map(row => row.label), ['Aubergiste'], 'casse et accents ignorés');
  assert.deepEqual(searchTokenImages('pnj', table).map(row => row.label), ['Aubergiste'], 'le dossier compte aussi');
  assert.equal(searchTokenImages('', table).length, 2);
  assert.ok(searchTokenImages('', TOKEN_IMAGES, { limit: 5 }).length === 5);
});
