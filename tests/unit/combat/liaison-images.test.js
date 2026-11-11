import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenStateOf, tokenStatesOf } from '../../../js/core/map-link-state.js';
import { createMapLink } from '../../../js/core/map-link.js';
import { sanitizeProfile } from '../../../js/core/sanitize.js';
import { Profile, chooseTokenImage } from '../../../js/core/models.js';
import { exportProfilesJson } from '../../../js/core/json-profile-export.js';
import { parseProfileJson } from '../../../js/core/json-profile-import.js';

const image = 'data:image/webp;base64,YWJj';
const npc = { id: 'g', kind: 'PNJ', profileId: 'gob', name: 'Gobelin', hp: 8 };
test('image de profil transmise sauf pour un PJ ou un improvisé', () => {
  assert.equal(tokenStateOf(npc, [], { imageUrl: image }).imageUrl, image);
  assert.equal(tokenStateOf({ ...npc, kind: 'PJ' }, [], { imageUrl: image }).imageUrl, null);
  assert.equal(tokenStatesOf([{ ...npc, profileId: null }], { imageUrlOf: () => null })['p:g'].imageUrl, null);
});
test('normalisation et aller-retour JSON', () => {
  const valid = value => sanitizeProfile({ id: 'g', name: 'Gobelin', tokenImage: value }).tokenImage;
  assert.equal(valid(image), image);
  assert.equal(valid('data:image/jpeg;base64,YWJj'), 'data:image/jpeg;base64,YWJj');
  const prefix = 'data:image/webp;base64,';
  const exact = prefix + 'A'.repeat(Math.floor((24576 - prefix.length) / 4) * 4);
  assert.equal(valid(exact), exact);
  for (const bad of [exact + 'AAAA', 'https://example.com/a', 'blob:abc', 123, 'data:image/png;base64,YWJj', 'data:image/webp;base64,!!!']) assert.equal(valid(bad), undefined);
  const profile = new Profile({ name: 'Gobelin', hp: 8, tokenImage: image });
  assert.equal(parseProfileJson(exportProfilesJson(profile)).profiles[0].tokenImage, image);
});
test('paliers de réduction : qualité puis taille, échec sans résultat', async () => {
  const calls = [];
  const got = await chooseTokenImage((size, quality) => { calls.push([size, quality]); return size === 192 && quality === 0.75 ? image : 'data:image/webp;base64,' + 'A'.repeat(24580); });
  assert.equal(got, image);
  assert.deepEqual(calls, [[256,0.85],[256,0.75],[256,0.65],[256,0.55],[256,0.45],[192,0.85],[192,0.75]]);
  assert.equal(await chooseTokenImage(() => ''), null);
});
test('une modification du profil diffuse un état pour chaque copie', () => {
  let current = image;
  const participants = [1,2,3].map(n => ({ ...npc, id: String(n) }));
  const channel = { sent: [], postMessage(message) { this.sent.push(message); } };
  const link = createMapLink({ channel, getParticipants: () => participants, imageUrlOf: p => p.profileId === 'gob' ? current : null });
  link.refresh(); channel.sent.length = 0;
  current = 'data:image/jpeg;base64,YWJj'; link.refresh();
  assert.deepEqual(channel.sent.map(m => [m.type, m.payload.ref, m.payload.imageUrl]), participants.map(p => ['token.state', `p:${p.id}`, current]));
});

// Couleur du pion d'un PJ (contrat §4, champ `color`) : cerclage teinté sur la carte (lot P2).
const pj = { id: 'e', kind: 'PJ', persistentCharacterId: 'c1', profileId: 'ely', name: 'Elysia', hp: 12 };
test('couleur du pion : #rrggbb validé, renseigné pour un PJ seulement, null ailleurs', () => {
  assert.equal(tokenStateOf(pj, [], { color: '#B3262E' }).color, '#b3262e');
  assert.equal(tokenStateOf(pj, [], {}).color, null);
  assert.equal(tokenStateOf(pj, [], { color: 'rouge' }).color, null);
  assert.equal(tokenStateOf(npc, [], { color: '#b3262e' }).color, null);
  const states = tokenStatesOf([pj, npc], { colorOf: p => (p.profileId === 'ely' ? '#b3262e' : '#2e9e6e') });
  assert.equal(states['pj:c1'].color, '#b3262e');
  assert.equal(states['p:g'].color, null);
});
// Décision du MJ du 06/11 : la monture d'un PJ prend la teinte de son cavalier, sauf couleur propre à son profil.
const cheval = { id: 'm', kind: 'Créature', profileId: 'destrier', name: 'Destrier', hp: 20, extensions: { v5: { mountOf: 'e' } } };
test('couleur du pion : la monture d’un PJ prend la couleur du cavalier, sauf la sienne ; démontée, null', () => {
  const colors = { ely: '#b3262e' };
  const colorOf = p => colors[p.profileId] ?? null;
  assert.equal(tokenStatesOf([pj, cheval], { colorOf })['p:m'].color, '#b3262e');
  assert.equal(tokenStatesOf([pj, { ...cheval, extensions: { v5: { mountOf: 'e', mounted: false } } }], { colorOf })['p:m'].color, '#b3262e');
  colors.destrier = '#6fb4e6';
  assert.equal(tokenStatesOf([pj, cheval], { colorOf })['p:m'].color, '#6fb4e6', 'couleur propre de la monture');
  delete colors.destrier;
  assert.equal(tokenStatesOf([pj, { ...cheval, extensions: {} }], { colorOf })['p:m'].color, null, 'sans cavalier');
  assert.equal(tokenStatesOf([{ ...npc, id: 'e' }, cheval], { colorOf: () => '#b3262e' })['p:m'].color, null, 'cavalier non PJ');
});
test('couleur du pion : la monture est renvoyée quand son cavalier PJ la prend puis la quitte', () => {
  let mount = { ...cheval, extensions: {} };
  const channel = { sent: [], postMessage(message) { this.sent.push(message); } };
  const link = createMapLink({ channel, getParticipants: () => [pj, mount], colorOf: p => (p.profileId === 'ely' ? '#b3262e' : null) });
  link.refresh(); channel.sent.length = 0;
  const sentFor = ref => channel.sent.filter(m => m.type === 'token.state' && m.payload.ref === ref).map(m => m.payload.color);
  mount = cheval; link.refresh();
  assert.deepEqual(sentFor('p:m'), ['#b3262e'], 'cavalier posé : teinte du PJ');
  channel.sent.length = 0;
  mount = { ...cheval, extensions: {} }; link.refresh();
  assert.deepEqual(sentFor('p:m'), [null], 'cavalier retiré : teinte effacée');
});
test('couleur du pion : normalisation du profil, aller-retour JSON, import refusé hors format', () => {
  const valid = value => sanitizeProfile({ id: 'e', name: 'Elysia', tokenColor: value }).tokenColor;
  assert.equal(valid('#2E9E6E'), '#2e9e6e');
  for (const bad of ['#2e9e6', '2e9e6e', '#2e9e6eff', 'red', 42, null]) assert.equal(valid(bad), undefined);
  assert.equal(new Profile({ name: 'Elysia', kind: 'PJ', tokenColor: '#E8846A' }).tokenColor, '#e8846a');
  assert.equal(Object.hasOwn(new Profile({ name: 'Elysia', tokenColor: 'bleu' }), 'tokenColor'), false);
  const profile = new Profile({ name: 'Elysia', kind: 'PJ', hp: 12, tokenColor: '#2a4fa8' });
  assert.equal(parseProfileJson(exportProfilesJson(profile)).profiles[0].tokenColor, '#2a4fa8');
  const refused = parseProfileJson(JSON.stringify({ nom: 'Elysia', type: 'PJ', pv: 12, tokenColor: 'bleu' }));
  assert.deepEqual(refused.errors.map(error => error.reason), ['couleur-attendue']);
  assert.equal(refused.profiles[0]?.tokenColor, undefined);
});
test('couleur du pion : un changement de profil diffuse un token.state du PJ', () => {
  let current = '#b3262e';
  const channel = { sent: [], postMessage(message) { this.sent.push(message); } };
  const link = createMapLink({ channel, getParticipants: () => [pj], colorOf: () => current });
  link.refresh(); channel.sent.length = 0;
  current = '#6fb4e6'; link.refresh();
  assert.deepEqual(channel.sent.filter(m => m.type === 'token.state').map(m => [m.payload.ref, m.payload.color]), [['pj:c1', '#6fb4e6']]);
});

