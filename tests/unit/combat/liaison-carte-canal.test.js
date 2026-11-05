import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMapLink, MAP_LINK_TIMEOUT_MS } from '../../../js/core/map-link.js';

// Liaison RPG Map Display, contrat v1 §2 et §7 (lot 1, étape B) : faux canal, horloge maîtrisée.
// `sent` : messages d'état et d'effet, dans l'ordre ; `all` y ajoute la liste des PJ (`mj.roster`, §3), testée à part.
const fakeChannel = () => ({ sent: [], all: [], postMessage(message) { this.all.push(message); if (message.type !== 'mj.roster') this.sent.push(message); }, onmessage: null });
const pj = { id: 'a', kind: 'PJ', persistentCharacterId: 'c9', name: 'Ulrika', hp: 10, maxHp: 14, states: [], movement: 4 };
const gob = (id, patch = {}) => ({ id, kind: 'PNJ', name: `Gobelin ${id}`, hp: 8, maxHp: 8, states: [], movement: 4, ...patch });

function setup(initial = []) {
  let scene = initial;
  let clock = 1000;
  const channel = fakeChannel();
  const statuses = [];
  const link = createMapLink({ channel, getParticipants: () => scene, now: () => clock, onStatus: s => statuses.push(s) });
  return { link, channel, statuses, set: next => { scene = next; }, advance: ms => { clock += ms; } };
}
const types = channel => channel.sent.map(m => m.type);

test('annonce mj.hello, puis add / state / remove selon les instantanés ; PJ jamais retiré', () => {
  const t = setup();
  assert.deepEqual(types(t.channel), ['mj.hello']);
  t.set([pj, gob('g1')]);
  t.link.refresh();
  assert.deepEqual(types(t.channel).slice(1), ['token.add', 'token.add']);
  t.set([pj, gob('g1', { hp: 2 })]);
  t.link.refresh();
  const [state, wound] = t.channel.sent.slice(3);
  assert.equal(state.type, 'token.state');
  assert.equal(state.payload.health, 'critical');
  assert.equal(wound.type, 'fx.wound');
  t.link.refresh();
  assert.equal(t.channel.sent.length, 5, 'rien ne part sans changement');
  t.set([]);
  t.link.refresh();
  assert.deepEqual(t.channel.sent.slice(5).map(m => [m.type, m.payload.ref]), [['token.remove', 'p:g1']]);
});

test('enveloppe : version, seq croissant, émetteur', () => {
  const t = setup([gob('g1')]);
  t.set([gob('g1', { hp: 1 })]);
  t.link.refresh();
  assert.deepEqual(t.channel.sent.map(m => [m.type, m.v, m.seq, m.from]), [['mj.hello', 1, 1, 'outil-mj'], ['token.state', 1, 2, 'outil-mj'], ['fx.wound', 1, 3, 'outil-mj']]);
});

test('map.hello → instantané complet et statut connecté ; version inconnue signalée', () => {
  const t = setup([pj, gob('g1')]);
  t.channel.onmessage({ data: { v: 1, type: 'map.hello', from: 'map', payload: {} } });
  const snap = t.channel.sent.at(-1);
  assert.equal(snap.type, 'mj.snapshot');
  assert.deepEqual(snap.payload.tokens.map(s => s.ref).sort(), ['p:g1', 'pj:c9']);
  assert.equal(t.link.status(), 'connected');
  t.link.onMessage({ v: 2, type: 'map.ping', from: 'map' });
  assert.equal(t.link.status(), 'version-mismatch');
  t.link.onMessage({ v: 1, type: 'token.state', from: 'outil-mj' });
  assert.deepEqual(t.statuses, ['connected', 'version-mismatch'], 'ses propres messages sont ignorés');
});

test('battement : déconnecté après 15 s sans nouvelles de la carte', () => {
  const t = setup();
  t.link.onMessage({ v: 1, type: 'map.ping', from: 'map' });
  t.advance(MAP_LINK_TIMEOUT_MS);
  t.link.tick();
  assert.equal(t.link.status(), 'connected');
  t.advance(1);
  t.link.tick();
  assert.equal(t.link.status(), 'disconnected');
  assert.ok(types(t.channel).includes('mj.ping'));
});

test('effets : fx.wound à chaque baisse de PV, fx.death au passage à mort, rien à l’apparition ni au soin', () => {
  const t = setup([gob('g1')]);
  t.set([gob('g1', { hp: 5 })]);
  t.link.refresh();
  t.set([gob('g1', { hp: 0, extensions: { v5: { dead: true } } })]);
  t.link.refresh();
  t.set([gob('g1', { hp: 4, extensions: { v5: { dead: true } } })]);
  t.link.refresh();
  t.set([gob('g1', { hp: 4, states: [{ name: 'Sonné', level: 2 }], extensions: { v5: { dead: true } } })]);
  t.link.refresh();
  t.set([gob('g1', { hp: 4, states: [{ name: 'Sonné', level: 2 }], extensions: { v5: { dead: true } } }), gob('g2', { hp: 1 })]);
  t.link.refresh();
  const fx = t.channel.sent.filter(m => m.type.startsWith('fx.')).map(m => [m.type, m.payload]);
  assert.deepEqual(fx, [
    ['fx.wound', { ref: 'p:g1', hpLost: 3, maxHp: 8, target: 'self' }],
    ['fx.wound', { ref: 'p:g1', hpLost: 5, maxHp: 8, target: 'self' }],
    ['fx.death', { ref: 'p:g1', cause: 'blood' }]
  ]);
  const order = t.channel.sent.map(m => m.type);
  assert.ok(order.indexOf('token.state') < order.indexOf('fx.wound'), 'l’état part avant l’effet');
});

test('la liaison transmet la cause de mort enregistrée uniquement pour un mort', () => {
  const t = setup([gob('g1')]);
  t.set([gob('g1', { hp: 0, extensions: { v5: { dead: true, deathCause: 'fire' } } })]);
  t.link.refresh();
  assert.equal(t.channel.sent.find(m => m.type === 'token.state').payload.deathCause, 'fire');
  assert.equal(t.channel.sent.find(m => m.type === 'fx.death').payload.cause, 'fire');
  t.set([gob('g1', { extensions: { v5: { dead: false, deathCause: 'fire' } } })]);
  t.link.refresh();
  assert.equal(t.channel.sent.filter(m => m.type === 'token.state').at(-1).payload.deathCause, null);
});

test('écho du battement : onglet caché, l’outil MJ répond au ping de la carte, sans boucle (contrat §2.3, 05/11)', () => {
  const t = setup();
  const pings = () => types(t.channel).filter(type => type === 'mj.ping').length;
  const mapPing = () => t.link.onMessage({ v: 1, type: 'map.ping', seq: 1, at: 0, from: 'map', payload: {} });
  t.link.tick();
  assert.equal(pings(), 1);
  t.advance(1000);
  mapPing();
  assert.equal(pings(), 1, 'battu il y a 1 s : pas d’écho');
  t.advance(60_000);
  mapPing();
  assert.equal(pings(), 2, 'minuteries ralenties : écho au battement reçu');
  mapPing();
  assert.equal(pings(), 2, 'pas d’écho de l’écho');
  assert.equal(t.link.status(), 'connected');
});

test('liaison durable des PJ (§3) : PJ hors scène émis depuis le persistant, liste mj.roster avec l’instantané et à chaque changement', async () => {
  const { offScenePjParticipants } = await import('../../../js/core/map-link-state.js');
  const profile = { id: 'prof-u', name: 'Ulrika (profil)', kind: 'PJ', movement: 5, caracs: { M: 5, E: 40 } };
  const characters = [{ id: 'c9', profileId: 'prof-u', name: 'Ulrika', hp: 6, maxHp: 14, states: [] }, { id: 'c7', name: 'Bertold', hp: 10, maxHp: 10, states: [] }];
  const scene = [pj]; // pj = Ulrika en scène (persistentCharacterId c9)
  const off = offScenePjParticipants(characters, scene, id => (id === 'prof-u' ? profile : null));
  assert.deepEqual(off.map(row => row.persistentCharacterId), ['c7'], 'Ulrika en scène n’est pas émise deux fois');
  const alone = offScenePjParticipants(characters, [], id => (id === 'prof-u' ? profile : null));
  const ulrika = alone.find(row => row.id === 'c9');
  assert.equal(ulrika.kind, 'PJ');
  assert.equal(ulrika.hp, 6, 'PV du persistant, pas du profil');
  assert.equal(ulrika.movement, 5, 'Mouvement du profil');

  const t = setup(alone);
  const rosters = () => t.channel.all.filter(m => m.type === 'mj.roster');
  t.link.onMessage({ v: 1, type: 'map.hello', seq: 1, at: 0, from: 'map', payload: {} });
  const snap = t.channel.sent.find(m => m.type === 'mj.snapshot');
  assert.deepEqual(snap.payload.tokens.map(s => s.ref).sort(), ['pj:c7', 'pj:c9']);
  assert.deepEqual(rosters().at(-1).payload.characters, [{ ref: 'pj:c7', label: 'Bertold' }, { ref: 'pj:c9', label: 'Ulrika' }]);
  const count = rosters().length;
  t.link.refresh();
  assert.equal(rosters().length, count, 'liste inchangée : rien de renvoyé');
  t.set(alone.filter(row => row.id !== 'c7'));
  t.link.refresh();
  assert.deepEqual(rosters().at(-1).payload.characters, [{ ref: 'pj:c9', label: 'Ulrika' }]);
  assert.ok(!t.channel.sent.some(m => m.type === 'token.remove'), 'un PJ n’est jamais retiré');
});
