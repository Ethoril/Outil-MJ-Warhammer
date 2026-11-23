import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMapLink } from '../../../js/core/map-link.js';

// Tour de jeu envoyé à la carte (`mj.turn`, contrat §10, révision du 21/11/2026) : la carte cerne le pion du participant
// actif sur l'écran MJ, pour que le MJ le voie sans cliquer sur chaque pion.
const pj = (patch = {}) => ({ id: 'a', kind: 'PJ', persistentCharacterId: 'c1', profileId: 'prof', name: 'Renaut', hp: 9, maxHp: 15, states: [], movement: 4, extensions: { v5: {} }, ...patch });
const orc = (patch = {}) => ({ id: 'o', kind: 'PNJ', name: 'Orc', hp: 10, maxHp: 10, states: [], movement: 4, extensions: { v5: {} }, ...patch });
const map = (type, payload = {}) => ({ v: 3, type, from: 'map', payload });

function setup(scene, { active = null, withActive = true } = {}) {
  const sent = [];
  const state = { active };
  const link = createMapLink({ channel: { postMessage: message => sent.push(message), onmessage: null }, getParticipants: () => scene,
    ...(withActive ? { getActiveId: () => state.active } : {}), now: () => 0, setTimer: () => 0, clearTimer: () => {} });
  return { link, sent, state, turns: () => sent.filter(message => message.type === 'mj.turn').map(message => message.payload) };
}

test('mj.turn — l’instantané envoie toujours le participant actif, par la ref de son pion', () => {
  const t = setup([pj(), orc()], { active: 'o' });
  t.link.onMessage(map('map.hello'));
  assert.deepEqual(t.turns(), [{ ref: 'p:o' }]);
  // PJ durable : la ref est celle du personnage persistant, pas du participant.
  t.state.active = 'a';
  t.link.refresh();
  assert.deepEqual(t.turns().at(-1), { ref: 'pj:c1' });
});

test('mj.turn — émis à chaque changement de tour seulement, et ref null hors tour', () => {
  const t = setup([pj(), orc()], { active: 'a' });
  t.link.refresh();
  assert.deepEqual(t.turns(), [{ ref: 'pj:c1' }], 'premier tour annoncé');
  t.link.refresh();
  assert.equal(t.turns().length, 1, 'tour inchangé : rien de renvoyé');
  t.state.active = 'o';
  t.link.refresh();
  t.state.active = null;
  t.link.refresh();
  assert.deepEqual(t.turns(), [{ ref: 'pj:c1' }, { ref: 'p:o' }, { ref: null }]);
  // Un actif qui n'est pas dans la scène ne désigne aucun pion.
  t.state.active = 'fantome';
  t.link.refresh();
  assert.equal(t.turns().length, 3, 'fantôme = hors tour, déjà annoncé');
});

test('mj.turn — un jeu qui ne fournit pas le tour n’envoie jamais le message', () => {
  const t = setup([pj(), orc()], { withActive: false });
  t.link.onMessage(map('map.hello'));
  t.link.refresh();
  assert.equal(t.turns().length, 0);
});
