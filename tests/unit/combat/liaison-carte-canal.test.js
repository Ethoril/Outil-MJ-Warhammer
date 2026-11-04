import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMapLink, MAP_LINK_TIMEOUT_MS } from '../../../js/core/map-link.js';

// Liaison RPG Map Display, contrat v1 §2 et §7 (lot 1, étape B) : faux canal, horloge maîtrisée.
const fakeChannel = () => ({ sent: [], postMessage(message) { this.sent.push(message); }, onmessage: null });
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
