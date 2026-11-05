import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMapLink } from '../../../js/core/map-link.js';
import { DISTANCE_QUERY_TIMEOUT_MS, distanceMetersOf, engagementSuggestionsOf, engagementPairsOf } from '../../../js/core/map-link-feedback.js';
import { mapLinkPendingView, renderMapLinkPending } from '../../../js/ui/map-link-indicator.js';
import { mountMapLinkFeedback } from '../../../js/ui/map-link-feedback.js';

// Retours de la carte, contrat §10 et §14 (lot L5-MJ) : carte simulée par messages injectés, minuteries maîtrisées.
const fakeChannel = () => ({ all: [], postMessage(message) { this.all.push(message); }, onmessage: null });
const pj = { id: 'a', kind: 'PJ', persistentCharacterId: 'c9', name: 'Ulrika', hp: 10, maxHp: 14, states: [], movement: 4, zone: 'active' };
const ally = { id: 'h', kind: 'PNJ', camp: 'allie', name: 'Hans', hp: 9, maxHp: 9, states: [], movement: 4, zone: 'active' };
const gob = (id, patch = {}) => ({ id, kind: 'PNJ', camp: 'ennemi', name: `Gobelin ${id}`, hp: 8, maxHp: 8, states: [], movement: 4, zone: 'active', ...patch });
const engaged = (person, ...others) => ({ ...person, extensions: { v5: { engagements: Object.fromEntries(others.map(o => [o, { since: 1, lastAttackRound: 1 }])) } } });

function setup(initial = []) {
  let scene = initial;
  const timers = new Map();
  let timerSeq = 0;
  const channel = fakeChannel();
  const link = createMapLink({ channel, getParticipants: () => scene, now: () => 1000,
    setTimer: (fn, ms) => { timers.set(++timerSeq, { fn, ms }); return timerSeq; }, clearTimer: id => timers.delete(id) });
  const map = (type, payload = {}) => channel.onmessage({ data: { v: 1, type, from: 'map', payload } });
  const fire = () => { for (const [id, timer] of [...timers]) { timers.delete(id); timer.fn(); } };
  return { link, channel, map, fire, timers, set: next => { scene = next; } };
}
const sentOf = (channel, type) => channel.all.filter(m => m.type === type);

test('posé / à poser : map.placed et map.unplaced tiennent la liste, émise à chaque changement seulement', () => {
  const t = setup([pj, gob('g1'), gob('g2')]);
  const views = [];
  t.link.on('placement', view => views.push(view));
  t.map('map.ping');
  assert.equal(views.length, 1, 'la connexion émet la vue');
  assert.deepEqual(views[0].pending.map(r => r.label), ['Gobelin g1', 'Gobelin g2', 'Ulrika']);
  t.map('map.placed', { ref: 'p:g1', levelId: 'L1' });
  t.map('map.placed', { ref: 'pj:c9', levelId: 'L1' });
  t.map('map.placed', { ref: 'pj:c9', levelId: 'L1' });
  assert.equal(views.length, 3, 'un placed répété ne réémet rien');
  assert.deepEqual(t.link.placement(), { connected: true, placed: ['p:g1', 'pj:c9'], pending: [{ ref: 'p:g2', label: 'Gobelin g2' }] });
  assert.equal(t.link.isPlaced(gob('g1')), true);
  t.map('map.unplaced', { ref: 'p:g1', levelId: 'L1' });
  assert.deepEqual(views.at(-1).pending.map(r => r.ref), ['p:g1', 'p:g2']);
  // Participant retiré : son pion part, il n'est plus posé ; un nouveau venu est à poser.
  t.map('map.placed', { ref: 'p:g2' });
  t.set([pj, gob('g3')]);
  t.link.refresh();
  assert.deepEqual(t.link.placement().pending.map(r => r.ref), ['p:g3']);
  assert.deepEqual(t.link.placement().placed, ['pj:c9']);
});

test('indicateur « À poser (N) » : caché si déconnecté ou tout posé, sinon compte et noms', () => {
  assert.equal(mapLinkPendingView({ connected: false, pending: [{ ref: 'p:x', label: 'X' }] }), null);
  assert.equal(mapLinkPendingView({ connected: true, pending: [] }), null);
  const node = { hidden: true, textContent: '', title: '', removeAttribute(name) { this[name] = ''; } };
  renderMapLinkPending(node, { connected: true, pending: [{ ref: 'p:g1', label: 'Gobelin 1' }, { ref: 'p:g2', label: 'Gobelin 2' }] });
  assert.deepEqual([node.hidden, node.textContent, node.title], [false, 'À poser (2)', 'À poser sur la carte : Gobelin 1, Gobelin 2']);
  renderMapLinkPending(node, { connected: false, pending: [{ ref: 'p:g1', label: 'Gobelin 1' }] });
  assert.deepEqual([node.hidden, node.textContent], [true, '']);
});

test('suggestions : camps opposés, engageables, pas déjà engagés, sans doublon', () => {
  const people = [pj, engaged(ally, 'g2'), gob('g1'), engaged(gob('g2'), 'h'), gob('g3', { hp: 0 }), gob('g4', { zone: 'bench' })];
  const suggestions = engagementSuggestionsOf([
    ['pj:c9', 'p:g1'], ['p:g1', 'pj:c9'], // doublon inversé
    ['p:g1', 'p:g2'], // même camp
    ['p:h', 'p:g2'], // déjà engagés
    ['pj:c9', 'p:g3'], ['pj:c9', 'p:g4'], // à 0 PV, au banc
    ['pj:c9', 'p:inconnu'], ['pj:c9'], 'x'
  ], people);
  assert.deepEqual(suggestions.map(s => [s.aName, s.bName]), [['Ulrika', 'Gobelin g1']]);
  assert.deepEqual(engagementPairsOf(people), [['p:g2', 'p:h']]);
});

test('mj.engagements : envoyé quand les engagements changent, et à l’instantané s’il y en a', () => {
  const t = setup([pj, gob('g1')]);
  t.link.refresh();
  assert.equal(sentOf(t.channel, 'mj.engagements').length, 0);
  t.set([engaged(pj, 'g1'), engaged(gob('g1'), 'a')]);
  t.link.refresh();
  t.link.refresh();
  assert.deepEqual(sentOf(t.channel, 'mj.engagements').map(m => m.payload.pairs), [[['p:g1', 'pj:c9']]]);
  t.map('map.hello');
  assert.equal(sentOf(t.channel, 'mj.engagements').length, 2);
  t.set([pj, gob('g1')]);
  t.link.refresh();
  assert.deepEqual(sentOf(t.channel, 'mj.engagements').at(-1).payload.pairs, []);
});

function feedbackSetup(people) {
  const t = setup(people);
  const toasts = [], engagedCalls = [];
  let current = people;
  const store = { listParticipants: () => current, listEngagedWith: id => Object.keys(current.find(p => p.id === id)?.extensions?.v5?.engagements || {}),
    engageParticipants: (a, b) => { engagedCalls.push([a, b]); return { ok: true }; } };
  const node = { hidden: true, textContent: '', removeAttribute() {} };
  const ui = mountMapLinkFeedback({ mapLink: t.link, store, pendingNode: node, showToast: (message, type, action, ms) => toasts.push({ message, action, ms }) });
  return { ...t, ui, toasts, engagedCalls, node, setStore: next => { current = next; } };
}

test('map.adjacency → suggestion au MJ ; rien sans clic ; Engager passe par Store.engageParticipants', async () => {
  const f = feedbackSetup([pj, gob('g1'), gob('g2')]);
  f.map('map.adjacency', { pairs: [['pj:c9', 'p:g1']] });
  assert.equal(f.toasts.length, 1);
  assert.match(f.toasts[0].message, /Ulrika et Gobelin g1/);
  assert.equal(f.engagedCalls.length, 0, 'jamais automatique');
  // La même paire toujours au contact au déplacement suivant n'est pas reproposée ; une nouvelle l'est.
  f.map('map.adjacency', { pairs: [['pj:c9', 'p:g1'], ['pj:c9', 'p:g2']] });
  assert.equal(f.toasts.length, 2);
  assert.match(f.toasts[1].message, /Gobelin g2/);
  await f.toasts[0].action.onClick();
  assert.deepEqual(f.engagedCalls, [['a', 'g1']]);
  // Engagés entre-temps : le clic ne crée pas de doublon.
  f.setStore([engaged(pj, 'g2'), gob('g1'), engaged(gob('g2'), 'a')]);
  await f.toasts[1].action.onClick();
  assert.equal(f.engagedCalls.length, 1);
  // Séparés puis de nouveau au contact : reproposé.
  f.setStore([pj, gob('g1'), gob('g2')]);
  f.map('map.adjacency', { pairs: [] });
  f.map('map.adjacency', { pairs: [['pj:c9', 'p:g1']] });
  assert.equal(f.toasts.length, 3);
});

test('l’indicateur « à poser » suit les messages de la carte une fois monté', () => {
  const f = feedbackSetup([pj, gob('g1')]);
  assert.equal(f.node.hidden, true, 'déconnecté au montage');
  f.map('map.placed', { ref: 'pj:c9' });
  assert.deepEqual([f.node.hidden, f.node.textContent], [false, 'À poser (1)']);
  f.map('map.placed', { ref: 'p:g1' });
  assert.equal(f.node.hidden, true);
});

test('distance : mj.distanceQuery, réponse en cases convertie selon l’usage (§4, demi-cases)', async () => {
  const f = feedbackSetup([pj, gob('g1')]);
  f.map('map.placed', { ref: 'pj:c9' });
  f.map('map.placed', { ref: 'p:g1' });
  const shot = f.ui.distanceBetween(pj, gob('g1'), 'ranged');
  const spell = f.ui.distanceBetween(pj, gob('g1'), 'spell');
  const [q1, q2] = sentOf(f.channel, 'mj.distanceQuery');
  assert.deepEqual(q1.payload, { fromRef: 'pj:c9', toRef: 'p:g1', queryId: q1.payload.queryId });
  assert.notEqual(q1.payload.queryId, q2.payload.queryId);
  f.map('map.distance', { queryId: q2.payload.queryId, cells: 4.5 });
  f.map('map.distance', { queryId: q1.payload.queryId, cells: 4.5 });
  assert.deepEqual(await shot, { ok: true, cells: 4.5, meters: 9 });
  assert.deepEqual(await spell, { ok: true, cells: 4.5, meters: 4.5 });
  assert.equal(f.timers.size, 0, 'délais annulés à la réponse');
  assert.deepEqual(['move', 'prayer', 'talent', 'inconnu'].map(use => distanceMetersOf(3, use)), [6, 3, 3, null]);
  assert.equal(distanceMetersOf(-1, 'ranged'), null);
});

test('distance : délai dépassé, réponse orpheline ignorée, carte déconnectée ou pion non posé', async () => {
  const f = feedbackSetup([pj, gob('g1'), gob('g2')]);
  assert.equal((await f.ui.distanceBetween(pj, gob('g1'), 'ranged')).reason, 'disconnected');
  f.map('map.placed', { ref: 'pj:c9' });
  f.map('map.placed', { ref: 'p:g1' });
  assert.equal((await f.ui.distanceBetween(pj, gob('g2'), 'ranged')).reason, 'not-placed');
  assert.equal(sentOf(f.channel, 'mj.distanceQuery').length, 0);
  const late = f.ui.distanceBetween(pj, gob('g1'), 'ranged');
  const [query] = sentOf(f.channel, 'mj.distanceQuery');
  assert.equal([...f.timers.values()][0].ms, DISTANCE_QUERY_TIMEOUT_MS);
  f.fire();
  assert.equal((await late).reason, 'timeout');
  f.map('map.distance', { queryId: query.payload.queryId, cells: 2 }); // arrive trop tard : sans effet
  f.map('map.distance', { queryId: 'jamais-demandee', cells: 2 });
  const bad = f.ui.distanceBetween(pj, gob('g1'), 'ranged');
  f.map('map.distance', { queryId: sentOf(f.channel, 'mj.distanceQuery').at(-1).payload.queryId, cells: null });
  assert.equal((await bad).reason, 'unmeasurable');
});
