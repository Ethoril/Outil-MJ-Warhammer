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

