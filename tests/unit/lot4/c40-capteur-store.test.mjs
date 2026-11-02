import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';

// C40 (G-DIV-17) : un capteur reste au banc ; le Store refuse son entrée dans l'ordre avec un message clair.
test('C40 le Store refuse de faire entrer un capteur dans l’ordre du combat', async () => {
  const store = createStore({ storage: null }); await store.ready;
  const common = { kind: 'Créature', hp: 10, maxHp: 10, caracs: {}, skills: [], equipment: [], states: [], actions: [], extensions: {} };
  const eagle = { ...common, id: 'eagle', name: 'Aigle spectral', camp: 'pj', zone: 'bench', initiative: 0, extensions: { sensor: true } };
  const wolf = { ...common, id: 'wolf', name: 'Loup', camp: 'ennemi', zone: 'bench', initiative: 0 };
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: { round: 1, currentActorId: null, order: [], participants: [eagle, wolf] } });
  assert.throws(() => store.moveParticipant('eagle', 'active'), /capteur.*banc/);
  assert.equal(store.listParticipants().find(row => row.id === 'eagle').zone, 'bench');
  store.moveParticipant('wolf', 'active');
  assert.equal(store.listParticipants().find(row => row.id === 'wolf').zone, 'active');
});
