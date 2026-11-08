import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMapLink, MAP_LINK_TIMEOUT_MS } from '../../../js/core/map-link.js';

// Audit côté carte du 08/11 (A5) : indicateurs « posé » périmés.
const pj = (patch = {}) => ({ id: 'a', kind: 'PJ', persistentCharacterId: 'c1', profileId: 'prof', name: 'Renaut', hp: 9, maxHp: 15, states: [], movement: 4, extensions: { v5: {} }, ...patch });
const orc = (patch = {}) => ({ id: 'o', kind: 'PNJ', name: 'Orc', hp: 10, maxHp: 10, states: [], movement: 4, extensions: { v5: {} }, ...patch });
const map = (type, payload = {}) => ({ v: 1, type, from: 'map', payload });

function setup(scene) {
  const sent = [];
  let clock = 0;
  const link = createMapLink({ channel: { postMessage: message => sent.push(message), onmessage: null }, getParticipants: () => scene,
    now: () => clock, setTimer: () => 0, clearTimer: () => {} });
  const views = [];
  link.on('placement', view => views.push(view));
  return { link, sent, views, advance: ms => { clock += ms; } };
}

test('A5 — un nouvel instantané (map.hello) et la déconnexion vident les indicateurs « posé »', () => {
  const t = setup([pj(), orc()]);
  t.link.onMessage(map('map.ping'));
  for (const ref of ['pj:c1', 'p:o']) t.link.onMessage(map('map.placed', { ref, levelId: 'L1' }));
  assert.deepEqual(t.link.placement().placed, ['p:o', 'pj:c1']);
  // La carte rechargée renvoie map.hello puis map.placed pour ses seuls pions réellement posés.
  t.link.onMessage(map('map.hello'));
  assert.deepEqual(t.link.placement().placed, [], 'instantané : plus aucun pion supposé posé');
  t.link.onMessage(map('map.placed', { ref: 'p:o', levelId: 'L1' }));
  assert.deepEqual(t.link.placement().placed, ['p:o']);
  // 15 s sans battement : déconnexion, la liste est vidée et l’état est émis.
  t.advance(MAP_LINK_TIMEOUT_MS + 1);
  t.link.tick();
  assert.equal(t.link.status(), 'disconnected');
  assert.deepEqual(t.link.placement().placed, []);
  assert.deepEqual(t.views.at(-1).placed, []);
});
