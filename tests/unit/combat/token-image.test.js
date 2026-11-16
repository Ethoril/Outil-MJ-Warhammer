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

test('CA9 et CA-A2 : image importée envoyée telle quelle, pour un PNJ comme pour un PJ', () => {
  const profile = { ...fromBestiary('B-LOUP'), tokenImage: imported };
  assert.equal(tokenStateOf({ id: 'g', kind: 'PNJ', name: 'G', hp: 5 }, [], { imageUrl: tokenImageOf(profile, table).url }).imageUrl, imported);
  assert.equal(tokenStateOf({ id: 'e', kind: 'PJ', persistentCharacterId: 'c', name: 'E', hp: 5 }, [], { imageUrl: tokenImageOf(profile, table).url }).imageUrl, imported);
  assert.equal(tokenStateOf({ id: 'e', kind: 'PJ', persistentCharacterId: 'c', name: 'E', hp: 5 }).imageUrl, null, 'CA-A3 : sans image, null');
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
  assert.equal(pjStates['pj:c1'].imageUrl, null, 'un PJ monté sans image choisie n’envoie pas son image');
  assert.equal(pjStates['pj:c1'].rider.imageUrl, 'maps/tokens/destriers/destrier-bohemond.webp', 'mais celle de sa monture part');
  // CA-A5 : avec une image choisie dans l’outil, elle part sur le pion du cavalier (le médaillon, contrat §8.1) ; rider.imageUrl reste celle de la monture.
  store.addProfile(new Profile({ id: 'pj-profil', name: 'Chevalier', kind: 'PJ', hp: 12, tokenLibraryImage: 'maps/tokens/pnj/aubergiste.webp' }));
  const pjChosen = [{ ...pj[0], profileId: 'pj-profil' }, scene[1]];
  const chosenStates = tokenStatesOf(pjChosen, { imageUrlOf: participant => participantTokenImageUrl(participant, id => store.getProfile(id)) });
  assert.equal(chosenStates['pj:c1'].imageUrl, 'maps/tokens/pnj/aubergiste.webp', 'CA-A5 : le médaillon du cavalier porte l’image choisie');
  assert.equal(chosenStates['pj:c1'].rider.imageUrl, 'maps/tokens/destriers/destrier-bohemond.webp', 'la monture garde la sienne');
  store.updateProfile(mountId, { tokenLibraryImage: null });
  assert.equal(states()['p:r'].rider.imageUrl, 'maps/tokens/bestiaire/destrier.webp', 'retrait : retour à l’automatique');
});
test('participant sans profil de Réserve (ajouté depuis le bestiaire) : sa propre source du bestiaire', () => {
  const loup = TOKEN_IMAGES.find(row => row.path === 'maps/tokens/bestiaire/loup.webp');
  const participant = { id: 'x', kind: 'Créature', profileId: null, name: 'Loup', hp: 8, extensions: { v5: { bestiary: { id: loup.profiles[0] } } } };
  assert.equal(participantTokenImageUrl(participant, () => undefined), loup.path);
  assert.equal(participantTokenImageUrl({ id: 'y', kind: 'PNJ', profileId: 'p', name: 'Y', hp: 3 }, () => ({ tokenImage: imported })), imported);
});

// S6 — Formes bestiales (T8, CA17-CA19) : image de forme selon la bête et le vent du sort lancé, champ `formImageUrl` séparé.
const { formImageOf } = await import('../../../js/core/token-image.js');
const { BEAST_PROFILES, KADON_PROFILES, applyBeastForm, revertBeastForm } = await import('../../../js/core/v5-magic-arbitrations.js');
const { createMapLink } = await import('../../../js/core/map-link.js');
const { sanitizeParticipant } = await import('../../../js/core/sanitize.js');
const mage = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }], talents: [], states: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { channelling: { type: 'winds', sl: 20 } } }, ...extra });
const transformed = (beastKey, options = {}, base = mage()) => applyBeastForm(base, BEAST_PROFILES[beastKey], options).participant;
const formPath = (beast, wind) => TOKEN_IMAGES.find(row => row.form?.beast === beast && row.form.wind === wind)?.path;

test('CA17 : vent des Bêtes → variante -bete, vent de Jade → variante -vie, écrit à la transformation', () => {
  const beasts = transformed('wolf');
  assert.equal(beasts.extensions.v5.beastForm.wind, 'beasts');
  assert.equal(formImageOf(beasts), 'maps/tokens/bestiaire/forme-bestiale/loup-bete.webp');
  const jade = transformed('wolf', { isJade: true });
  assert.equal(jade.extensions.v5.beastForm.wind, 'jade');
  assert.equal(formImageOf(jade), 'maps/tokens/bestiaire/forme-bestiale/loup-vie.webp');
  for (const key of Object.keys(BEAST_PROFILES)) for (const [isJade, wind] of [[false, 'beasts'], [true, 'jade']]) {
    assert.equal(formImageOf(transformed(key, { isJade })), formPath(key, wind) ?? null, `${key} ${wind}`);
  }
  assert.equal(sanitizeParticipant(jade).extensions.v5.beastForm.wind, 'jade', 'le vent survit à la normalisation');
});

test('vent absent (transformation commencée avant cette version) lu au point de lecture, sans réécrire la forme', () => {
  const old = transformed('bear');
  delete old.extensions.v5.beastForm.wind;
  delete old.extensions.v5.beastForm.isJade;
  const before = structuredClone(old);
  assert.equal(formImageOf(old), 'maps/tokens/bestiaire/forme-bestiale/ours-bete.webp', 'absent = Vent des Bêtes');
  assert.deepEqual(old, before, 'aucune réécriture');
  const oldJade = transformed('bear', { isJade: true });
  delete oldJade.extensions.v5.beastForm.wind;
  assert.equal(formImageOf(oldJade), 'maps/tokens/bestiaire/forme-bestiale/ours-vie.webp', 'isJade, déjà enregistré avant, désigne le Vent de Jade');
  const bad = transformed('bear');
  bad.extensions.v5.beastForm.wind = 'ghur';
  assert.equal(formImageOf(bad), 'maps/tokens/bestiaire/forme-bestiale/ours-bete.webp', 'valeur inconnue lue comme absente');
});

test('Transformation de Kadon : image du monstre, sans vent ; null sans image ou pour un monstre saisi à la main', () => {
  const kadonForm = profile => applyBeastForm(mage(), profile, { kind: 'kadon', durationRounds: 5 }).participant;
  for (const [key, profile] of Object.entries(KADON_PROFILES)) {
    const form = kadonForm(profile);
    assert.equal(form.extensions.v5.beastForm.kind, 'kadon');
    assert.equal(formImageOf(form), TOKEN_IMAGES.find(row => row.form?.monster === key).path, key);
  }
  const troll = kadonForm(KADON_PROFILES.troll);
  assert.equal(formImageOf(troll), 'maps/tokens/monstres/transformation-kadon/troll.webp');
  assert.equal(formImageOf(troll, TOKEN_IMAGES.filter(row => !row.form?.monster)), null, 'monstre sans image : pion inchangé');
  assert.equal(formImageOf(kadonForm({ ...KADON_PROFILES.troll, name: 'Troll maison' })), null, 'profil saisi hors monstres du livre');
  assert.equal(formImageOf(revertBeastForm(troll).participant), null, 'forme quittée : plus d’image de forme');
  const state = tokenStatesOf([troll], { formImageUrlOf: participant => formImageOf(participant) });
  assert.equal(Object.values(state)[0].formImageUrl, 'maps/tokens/monstres/transformation-kadon/troll.webp', 'part dans token.state, PJ compris');
});

test('CA19 : null hors forme et pour une bête sans image dans ce vent ; Kadon ne lit pas les images de Forme bestiale', () => {
  assert.equal(formImageOf(mage()), null);
  assert.equal(formImageOf(null), null);
  assert.equal(formImageOf(undefined), null);
  const kadon = transformed('wolf');
  kadon.extensions.v5.beastForm.kind = 'kadon';
  assert.equal(formImageOf(kadon), null, 'une bête du Reikland n’est pas un monstre de Kadon');
  const onlyBeastsWolf = TOKEN_IMAGES.filter(row => row.form?.beast === 'wolf' && row.form.wind === 'beasts');
  assert.equal(formImageOf(transformed('wolf'), onlyBeastsWolf), 'maps/tokens/bestiaire/forme-bestiale/loup-bete.webp');
  assert.equal(formImageOf(transformed('wolf', { isJade: true }), onlyBeastsWolf), null, 'pas de variante Jade : pion inchangé');
  assert.equal(formImageOf(transformed('horse'), onlyBeastsWolf), null, 'bête sans image : pion inchangé');
  const custom = applyBeastForm(mage(), { ...BEAST_PROFILES.wolf, name: 'Loup-garou maison' }).participant;
  assert.equal(formImageOf(custom), null, 'profil saisi hors Bêtes du Reikland');
  const state = tokenStatesOf([transformed('horse')], { formImageUrlOf: participant => formImageOf(participant, onlyBeastsWolf) });
  assert.equal(Object.values(state)[0].formImageUrl, null, 'CA19 : formImageUrl null, la carte garde son image');
});

test('formImageUrl toujours présent dans token.state : chemin ou null, PJ compris ; imageUrl d’un PJ distinct de formImageUrl', () => {
  const pnj = { id: 'g', kind: 'PNJ', name: 'G', hp: 5 };
  assert.equal(tokenStateOf(pnj).formImageUrl, null);
  assert.ok(Object.hasOwn(tokenStateOf(pnj), 'formImageUrl'));
  assert.equal(tokenStateOf(pnj, [], { formImageUrl: 'maps/tokens/bestiaire/forme-bestiale/loup-bete.webp' }).formImageUrl, 'maps/tokens/bestiaire/forme-bestiale/loup-bete.webp');
  const pj = transformed('wolf', { isJade: true }, mage('mage', { persistentCharacterId: 'c-mage' }));
  const states = tokenStatesOf([pj, pnj], { imageUrlOf: () => imported, formImageUrlOf: participant => formImageOf(participant) });
  assert.equal(states['pj:c-mage'].formImageUrl, 'maps/tokens/bestiaire/forme-bestiale/loup-vie.webp', 'CA17 : vaut pour un PJ');
  assert.equal(states['pj:c-mage'].imageUrl, imported, 'CA-A4 : l’image de l’outil reste dans imageUrl sous la forme, formImageUrl la recouvre');
  assert.equal(states['p:g'].formImageUrl, null);
  assert.ok(Object.hasOwn(tokenStatesOf([pnj])['p:g'], 'formImageUrl'), 'sans option, null');
});

test('CA17-CA18 de bout en bout : sort réellement lancé, envoi à la transformation, null au retour', async () => {
  const { createStore } = await import('../../../js/core/store.js');
  for (const [spell, wind, path] of [['Forme bestiale', 'beasts', 'maps/tokens/bestiaire/forme-bestiale/loup-bete.webp'],
    ['Forme bestiale - Jade', 'jade', 'maps/tokens/bestiaire/forme-bestiale/loup-vie.webp']]) {
    const listeners = new Map();
    const bus = { emit: event => (listeners.get(event) || []).forEach(fn => fn()), on: (event, fn) => listeners.set(event, [...(listeners.get(event) || []), fn]) };
    const store = createStore({ bus }); await store.ready;
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'mage', order: ['mage'],
      participants: [mage('mage', { persistentCharacterId: 'c-mage' })] }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
    const channel = { sent: [], postMessage(message) { this.sent.push(message); } };
    const link = createMapLink({ channel, getParticipants: () => store.listParticipants(), formImageUrlOf: participant => formImageOf(participant) });
    bus.on('combat', link.refresh); // câblage de main.js
    link.refresh();
    const ref = Object.keys(tokenStatesOf(store.listParticipants()))[0];
    const sentFormImages = () => channel.sent.filter(m => ['token.state', 'token.add'].includes(m.type) && m.payload.ref === ref).map(m => m.payload.formImageUrl);
    assert.equal(tokenStatesOf(store.listParticipants())[ref].formImageUrl, null, 'avant : null');
    assert.deepEqual(sentFormImages(), [], 'état initial lu à la création de la liaison');
    await store.applySpellExecution(spell, { actorId: 'mage', targetIds: ['mage'], roll: 25, sl: 8, beastKey: 'wolf', attributeActive: false });
    const caster = store.listParticipants().find(p => p.id === 'mage');
    assert.equal(caster.extensions.v5.beastForm?.wind, wind, spell);
    assert.deepEqual(sentFormImages(), [path], `${spell} : envoyé dès la transformation`);
    const sentBefore = channel.sent.length;
    await store.revertBeastForm('mage');
    assert.equal(store.listParticipants().find(p => p.id === 'mage').extensions.v5.beastForm, undefined);
    assert.deepEqual(sentFormImages(), [path, null], 'CA18 : null au retour, la carte retrouve l’image d’avant');
    const back = channel.sent.slice(sentBefore).find(m => m.type === 'token.state' && m.payload.ref === ref);
    assert.equal(back.payload.imageUrl, null, 'PJ sans image choisie : imageUrl null');
    assert.deepEqual(channel.sent.filter(m => m.type === 'fx.wound'), [], 'CA40 : ni la prise ni le retour ne sont des blessures (30 → 13 → 30 PV)');
  }
});

test('cavalier monté transformé : formImageUrl sur son pion, rider.imageUrl reste l’image de la monture', () => {
  const rider = transformed('wolf', {}, mage('mage', { kind: 'PNJ', extensions: { v5: { ownMountId: 'm', mounted: true, mountId: 'm' } } }));
  const mount = { id: 'm', kind: 'Créature', name: 'Destrier', hp: 20, extensions: { v5: { mountOf: 'mage' } } };
  const options = { imageUrlOf: p => (p.id === 'm' ? 'maps/tokens/bestiaire/destrier.webp' : null), formImageUrlOf: p => formImageOf(p) };
  const states = tokenStatesOf([rider, mount], options);
  assert.equal(states['p:mage'].mounted, true, 'la transformation ne démonte pas le cavalier');
  assert.equal(states['p:mage'].formImageUrl, 'maps/tokens/bestiaire/forme-bestiale/loup-bete.webp');
  assert.equal(states['p:mage'].rider.imageUrl, 'maps/tokens/bestiaire/destrier.webp');
  assert.equal(states['p:m'].formImageUrl, null);
  const reverted = revertBeastForm(rider).participant;
  assert.equal(tokenStatesOf([reverted, mount], options)['p:mage'].formImageUrl, null);
});

// Corrections de la vérification du 13/11 (défauts 1 et 2).
test('défaut 1 : une seule règle de chemin, outil et générateur alignés (pas de %, pas d’avif, segments nommés)', async () => {
  const { isLibraryPath } = await import('../../../tools/build-token-images.mjs');
  const refused = ['maps/tokens/%2e%2e/%2e%2e/x.webp', 'maps/tokens/a%20b.webp', 'maps/tokens/x.avif', 'maps/tokens/a b.webp', 'maps/tokens/é.webp',
    'maps/tokens/./x.webp', 'maps/tokens/a//b.webp', 'maps/tokens//x.webp', 'maps/tokens/a/../x.webp', 'maps/tokens/x.webp?v=1', 'maps/tokens/x.webp#a',
    'maps/tokens/a:b.webp', 'maps/tokens\\x.webp', 'maps/tokens/' + 'a'.repeat(184) + '.webp'];
  const accepted = ['maps/tokens/x.webp', 'maps/tokens/a-b_c.d/E9.PNG', 'maps/tokens/x.jpeg', 'maps/tokens/x.jpg', 'maps/tokens/x.gif', 'maps/tokens/' + 'a'.repeat(183) + '.webp'];
  for (const path of refused) { assert.equal(normalizeLibraryImage(path), undefined, path); assert.equal(isLibraryPath(path), false, path); }
  for (const path of accepted) { assert.equal(normalizeLibraryImage(path), path, path); assert.equal(isLibraryPath(path), true, path); }
  for (const row of TOKEN_IMAGES) { assert.equal(normalizeLibraryImage(row.path), row.path, row.path); assert.equal(isLibraryPath(row.path), true, row.path); }
});
test('CA-A1, CA-A3, CA-A6 : un PJ montre l’image qu’il porte comme un PNJ ; sans image choisie, celle de la carte, sans réécrire ses données', async () => {
  const { shownTokenImageOf } = await import('../../../js/core/token-image.js');
  const { tokenImageCaption } = await import('../../../js/ui/token-image-picker.js');
  const pj = { id: 'p', kind: 'PJ', name: 'Elysia', hp: 10, tokenLibraryImage: 'maps/tokens/pnj/aubergiste.webp', tokenImage: imported };
  assert.deepEqual(shownTokenImageOf(pj, table), { url: imported, source: 'imported' });
  assert.deepEqual(shownTokenImageOf({ ...pj, tokenImage: undefined }, table), { url: 'maps/tokens/pnj/aubergiste.webp', source: 'chosen' });
  assert.deepEqual(shownTokenImageOf({ ...pj, kind: 'PNJ' }, table), shownTokenImageOf(pj, table), 'même résolution qu’un PNJ');
  const bare = { id: 'q', kind: 'PJ', name: 'Elysia', hp: 10 };
  assert.deepEqual(shownTokenImageOf(bare, table), { url: null, source: 'map' }, 'données existantes sans champ image');
  assert.deepEqual(shownTokenImageOf({ ...bare, ...fromBestiary('B-LOUP') , kind: 'PJ' }, table), { url: null, source: 'map' }, 'pas d’image automatique pour un PJ');
  assert.equal(Object.hasOwn(bare, 'tokenImage') || Object.hasOwn(bare, 'tokenLibraryImage'), false, 'rien n’est réécrit');
  assert.equal(tokenImageCaption(shownTokenImageOf(bare, table)), 'Image de la carte (aucune image choisie dans l’outil)');
  assert.equal(tokenImageCaption(shownTokenImageOf(pj, table)), tokenImageCaption(shownTokenImageOf({ ...pj, kind: 'PNJ' }, table)));
  assert.doesNotMatch(tokenImageCaption({ source: 'map' }), /n’envoie pas/);
});

test('CA-A2 : participant PJ, image du profil envoyée ; retirée, null (CA-A7)', () => {
  const participant = { id: 'x', kind: 'PJ', profileId: 'pr', persistentCharacterId: 'c', name: 'E', hp: 5 };
  let profile = { id: 'pr', kind: 'PJ', tokenLibraryImage: 'maps/tokens/pnj/aubergiste.webp' };
  const stateOf = () => tokenStatesOf([participant], { imageUrlOf: p => participantTokenImageUrl(p, () => profile) })['pj:c'];
  assert.equal(stateOf().imageUrl, 'maps/tokens/pnj/aubergiste.webp');
  profile = { id: 'pr', kind: 'PJ' };
  assert.equal(stateOf().imageUrl, null, 'image retirée : null, la carte garde la dernière image affichée');
});

test('CA-A1 : l’image d’un PJ survit à « Mettre à jour les PJ » et à l’export puis l’import JSON', async () => {
  const { readFileSync } = await import('node:fs');
  const { ficheSnapshot, planProfileSync } = await import('../../../js/core/fiche-sync.js');
  const { exportProfileJson } = await import('../../../js/core/json-profile-export.js');
  const fiche = JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
  const chosen = 'maps/tokens/pnj/aubergiste.webp';
  const base = { id: 'pr', name: 'Caelel', kind: 'PJ', caracs: {}, hp: 5, maxHp: 5, diceLines: [], extensions: {} };
  assert.equal(planProfileSync(ficheSnapshot('caelel', fiche), { ...base, tokenLibraryImage: chosen }, {}).updated.tokenLibraryImage, chosen);
  assert.equal(planProfileSync(ficheSnapshot('caelel', fiche), { ...base, tokenImage: imported }, {}).updated.tokenImage, imported);
  assert.equal(exportProfileJson({ ...base, tokenLibraryImage: chosen }).tokenLibraryImage, chosen);
  assert.equal(exportProfileJson({ ...base, tokenImage: imported }).tokenImage, imported);
});
