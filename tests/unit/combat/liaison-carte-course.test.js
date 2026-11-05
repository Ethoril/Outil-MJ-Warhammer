import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMapLink } from '../../../js/core/map-link.js';
import { runProposalOf } from '../../../js/core/map-link-run.js';
import { createStore } from '../../../js/core/store.js';

// Course signalée par la carte (L6-MJ) : `map.ran { ref }` → proposition « X a couru : Action utilisée ? », rien sans le clic du MJ.
const fakeChannel = () => ({ sent: [], postMessage(message) { this.sent.push(message); }, onmessage: null });
const map = (type, payload = {}) => ({ v: 1, type, from: 'map', payload });
const pj = { id: 'a', kind: 'PJ', persistentCharacterId: 'c9', name: 'Ulrika', hp: 10, maxHp: 10, states: [] };
const gob = { id: 'g1', kind: 'PNJ', name: 'Gobelin 1', hp: 8, maxHp: 8, states: [] };

test('map.ran transmis au rappel onRan avec le ref ; sans ref, ignoré', () => {
  const ran = [];
  const link = createMapLink({ channel: fakeChannel(), getParticipants: () => [pj], onRan: ref => ran.push(ref) });
  link.onMessage(map('map.ran', { ref: 'pj:c9' }));
  link.onMessage(map('map.ran', {}));
  link.onMessage({ v: 1, type: 'map.ran', from: 'outil-mj', payload: { ref: 'pj:c9' } });
  assert.deepEqual(ran, ['pj:c9']);
});

test('proposition : Tour du coureur, Action libre → bouton', () => {
  const proposal = runProposalOf('pj:c9', { participants: [pj, gob], currentActorId: 'a' });
  assert.deepEqual(proposal, { actorId: 'a', canSpend: true, message: 'Ulrika a couru : Action utilisée ?' });
  assert.equal(runProposalOf('p:g1', { participants: [pj, gob], currentActorId: 'g1' }).message, 'Gobelin 1 a couru : Action utilisée ?');
});

test('proposition : hors de son Tour, ou Action déjà dépensée → indiqué, sans bouton ; ref inconnu → rien', () => {
  const off = runProposalOf('p:g1', { participants: [pj, gob], currentActorId: 'a' });
  assert.equal(off.canSpend, false);
  assert.match(off.message, /hors de son Tour/);
  const spent = runProposalOf('pj:c9', { participants: [pj, gob], currentActorId: 'a', actionSpent: id => id === 'a' });
  assert.equal(spent.canSpend, false);
  assert.match(spent.message, /déjà dépensée/);
  assert.equal(runProposalOf('p:inconnu', { participants: [pj, gob], currentActorId: 'a' }), null);
});

const person = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 40,
  hp: 10, maxHp: 10, caracs: { I: 40, CC: 50, CT: 50 }, skills: [], equipment: [], actions: [], states: [], extensions: { v5: {} }, ...extra });
async function combatStore() {
  const store = createStore({ storage: null });
  await store.ready;
  const participants = [person('runner'), person('other')];
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], activeScene: null, encounters: [], suspendedScenes: [], persistentCharacters: [],
    combat: { round: 1, currentActorId: 'runner', order: ['runner', 'other'], orderMode: 'automatic', participants }, extensions: { v5: { turnIndex: 1, combatScopeId: 's' } } });
  return store;
}

test('clic du MJ : l’Action du Tour est consommée, une seule fois, annulable', async () => {
  const store = await combatStore();
  assert.equal(store.listTurnActions('runner').length, 0, 'rien sans le clic');
  assert.equal((await store.spendV5RunAction('runner')).ok, true);
  assert.equal(store.listTurnActions('runner').length, 1);
  const again = await store.spendV5RunAction('runner');
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'spent');
  assert.equal(store.listTurnActions('runner').length, 1);
  await store.undo();
  assert.equal(store.listTurnActions('runner').length, 0);
});

test('clic hors du Tour du coureur : refus, rien n’est écrit', async () => {
  const store = await combatStore();
  const result = await store.spendV5RunAction('other');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'not-turn');
  assert.equal(store.listTurnActions('other').length, 0);
});
