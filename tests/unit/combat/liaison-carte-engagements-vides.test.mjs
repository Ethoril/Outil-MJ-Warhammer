import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMapLink } from '../../../js/core/map-link.js';

// Audit côté carte du 08/11 (A6) : liste d'engagements vide envoyée à l'instantané.
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

test('A6 — l’instantané envoie toujours mj.engagements, même vide', () => {
  const t = setup([pj(), orc()]);
  t.link.onMessage(map('map.hello'));
  const engagements = t.sent.filter(message => message.type === 'mj.engagements');
  assert.equal(engagements.length, 1, 'la carte reçoit la liste après mj.snapshot');
  assert.deepEqual(engagements[0].payload, { pairs: [] });
  // Hors instantané, une liste inchangée n’est pas renvoyée.
  t.link.refresh();
  assert.equal(t.sent.filter(message => message.type === 'mj.engagements').length, 1);
});
