// Images des pions depuis la bibliothèque de Map Display (docs/specs/images-pions, T3) : résolution de l'image envoyée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLibraryImage, tokenImageOf, libraryImageSrc, tokenImageLabelOf, searchTokenImages, participantTokenImageUrl } from '../../../js/core/token-image.js';
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

// T6 — Montures : le profil `monture-<id>` garde l'identifiant du bestiaire ; même champ, même résolution (CA14, CA15).
test('CA14-CA15 : cavalier monté, image automatique puis choisie de sa monture dans rider.imageUrl et sur le pion de la monture', async () => {
  const { createStore } = await import('../../../js/core/store.js');
  const { Profile } = await import('../../../js/core/models.js');
  const { mountProfileId } = await import('../../../js/core/mounts.js');
  const destrier = TOKEN_IMAGES.find(row => row.path === 'maps/tokens/bestiaire/destrier.webp');
  const data = new Map();
  const store = createStore({ storage: { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)) } });
  store.addProfile(new Profile({ id: 'chevalier', name: 'Chevalier', kind: 'PNJ', hp: 12 }));
  store.setProfileMount('chevalier', { template: { name: 'Destrier', hp: 20, maxHp: 20, extensions: { v5: { bestiary: { id: destrier.profiles[0] } } } }, bestiaryId: destrier.profiles[0], name: 'Destrier' });
  const mountId = mountProfileId('chevalier');
  assert.equal(store.getProfile(mountId).extensions.v5.bestiary.id, destrier.profiles[0]);
  const scene = [
    { id: 'r', kind: 'PNJ', profileId: 'chevalier', name: 'Chevalier', hp: 12, extensions: { v5: { ownMountId: 'm', mounted: true, mountId: 'm' } } },
    { id: 'm', kind: 'Créature', profileId: mountId, name: 'Destrier', hp: 20, extensions: { v5: { mountOf: 'r' } } }
  ];
  const states = () => tokenStatesOf(scene, { imageUrlOf: participant => participantTokenImageUrl(participant, id => store.getProfile(id)) });
  assert.equal(states()['p:r'].rider.imageUrl, 'maps/tokens/bestiaire/destrier.webp', 'image automatique de la monture');
  assert.equal(states()['p:m'].imageUrl, 'maps/tokens/bestiaire/destrier.webp');
  assert.equal(states()['p:r'].imageUrl, null, 'le cavalier garde la sienne (aucune ici)');
  store.updateProfile(mountId, { tokenLibraryImage: 'maps/tokens/destriers/destrier-bohemond.webp' });
  assert.equal(states()['p:r'].rider.imageUrl, 'maps/tokens/destriers/destrier-bohemond.webp', 'le choix du MJ l’emporte');
  assert.equal(states()['p:m'].imageUrl, 'maps/tokens/destriers/destrier-bohemond.webp');
  const pj = [{ ...scene[0], kind: 'PJ', persistentCharacterId: 'c1' }, scene[1]];
  const pjStates = tokenStatesOf(pj, { imageUrlOf: participant => participantTokenImageUrl(participant, id => store.getProfile(id)) });
  assert.equal(pjStates['pj:c1'].imageUrl, null, 'un PJ monté n’envoie pas son image');
  assert.equal(pjStates['pj:c1'].rider.imageUrl, 'maps/tokens/destriers/destrier-bohemond.webp', 'mais celle de sa monture part');
  store.updateProfile(mountId, { tokenLibraryImage: null });
  assert.equal(states()['p:r'].rider.imageUrl, 'maps/tokens/bestiaire/destrier.webp', 'retrait : retour à l’automatique');
});
test('participant sans profil de Réserve (ajouté depuis le bestiaire) : sa propre source du bestiaire', () => {
  const loup = TOKEN_IMAGES.find(row => row.path === 'maps/tokens/bestiaire/loup.webp');
  const participant = { id: 'x', kind: 'Créature', profileId: null, name: 'Loup', hp: 8, extensions: { v5: { bestiary: { id: loup.profiles[0] } } } };
  assert.equal(participantTokenImageUrl(participant, () => undefined), loup.path);
  assert.equal(participantTokenImageUrl({ id: 'y', kind: 'PNJ', profileId: 'p', name: 'Y', hp: 3 }, () => ({ tokenImage: imported })), imported);
});
