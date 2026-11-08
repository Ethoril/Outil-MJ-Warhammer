import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMapLink } from '../../../js/core/map-link.js';
import { pendingTokensOf } from '../../../js/core/map-link-feedback.js';
import { tokenStatesOf } from '../../../js/core/map-link-state.js';

// MAP-03 : la monture fusionnée dans le pion de son cavalier est en réserve sur la carte (map.unplaced) ;
// elle n'est pas « À poser » et la distance vers elle est demandée à la carte, qui la résout par rider.ref.
const rider = (patch = {}) => ({ id: 'r', kind: 'PJ', persistentCharacterId: 'c1', name: 'Renaut', hp: 12, maxHp: 12, states: [], movement: 4,
  extensions: { v5: { ownMountId: 'h', ...patch } } });
const horse = () => ({ id: 'h', kind: 'Créature', name: 'Destrier', hp: 20, maxHp: 22, size: 'Grande', movement: 10, states: [], extensions: { v5: { mountOf: 'r' } } });
const orc = () => ({ id: 'o', kind: 'PNJ', name: 'Orc', hp: 10, maxHp: 10, states: [], movement: 4, extensions: { v5: {} } });
const map = (type, payload = {}) => ({ v: 1, type, from: 'map', payload });

function setup(initial) {
  let scene = initial;
  const sent = [];
  const channel = { postMessage: message => sent.push(message), onmessage: null };
  const link = createMapLink({ channel, getParticipants: () => scene, setTimer: () => 0, clearTimer: () => {} });
  let placement = null;
  link.on('placement', view => { placement = view; });
  return { link, sent, placement: () => placement, set: next => { scene = next; } };
}

test('MAP-03 — monture fusionnée : pas « À poser » tant que son cavalier est posé', () => {
  const states = tokenStatesOf([rider({ mounted: true, mountId: 'h' }), horse(), orc()]);
  assert.deepEqual(pendingTokensOf(states, new Set(['pj:c1', 'p:o'])), []);
  assert.deepEqual(pendingTokensOf(states, new Set(['p:o'])).map(row => row.ref), ['pj:c1'], 'cavalier non posé : seul son pion est à poser');
  // Démontée, la monture redevient un pion à part.
  const foot = tokenStatesOf([rider({ mounted: false }), horse(), orc()]);
  assert.deepEqual(pendingTokensOf(foot, new Set(['pj:c1', 'p:o'])).map(row => row.ref), ['p:h']);
});

test('MAP-03 — distance vers une monture fusionnée : demandée à la carte au lieu d’être refusée', async () => {
  const t = setup([rider({ mounted: true, mountId: 'h' }), horse(), orc()]);
  t.link.onMessage(map('map.ping'));
  for (const ref of ['pj:c1', 'p:o']) t.link.onMessage(map('map.placed', { ref, levelId: 'L1' }));
  t.link.onMessage(map('map.unplaced', { ref: 'p:h' }));
  assert.deepEqual(t.placement().pending, []);
  const answer = t.link.queryDistance(orc(), horse());
  const query = t.sent.find(message => message.type === 'mj.distanceQuery');
  assert.ok(query, 'la requête part vers la carte');
  assert.deepEqual([query.payload.fromRef, query.payload.toRef], ['p:o', 'p:h']);
  t.link.onMessage(map('map.distance', { queryId: query.payload.queryId, cells: 3 }));
  assert.deepEqual(await answer, { ok: true, cells: 3 });
});
