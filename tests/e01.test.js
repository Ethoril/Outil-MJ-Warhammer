import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { Participant, DiceLine } from '../js/core/models.js';

function storage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
  };
}

test('E01 — retirer un participant nettoie ses jets et garde les jets indépendants', () => {
  const store = createStore({ storage: storage() });
  store.addParticipant(new Participant({ id: 'a', name: 'Aline', zone: 'active' }));
  store.addParticipant(new Participant({ id: 'b', name: 'Boris', zone: 'active' }));
  store.addDiceLine(new DiceLine({ id: 'owned', participantId: 'a', targetId: 'b' }));
  store.addDiceLine(new DiceLine({ id: 'other', participantId: 'b', targetId: 'a' }));
  store.addDiceLine(new DiceLine({ id: 'independent', note: 'd100 du MJ', targetId: 'a' }));
  store.log({ kind: 'damage', actorId: 'a', targetId: 'b', text: 'Aline frappe Boris' });

  store.removeParticipant('a');

  assert.deepEqual(store.getDiceLines().map(line => line.id), ['other', 'independent']);
  assert.equal(store.getDiceLines().find(line => line.id === 'other').targetId, null);
  assert.equal(store.getDiceLines().find(line => line.id === 'independent').targetId, null);
  const event = store.getLog()[0];
  assert.equal(event.actorName, 'Aline');
  assert.equal(event.targetName, 'Boris');
});

test('E01 — réinitialiser le combat supprime les jets attachés et le round courant', () => {
  const store = createStore({ storage: storage() });
  store.addParticipant(new Participant({ id: 'a', name: 'Aline', zone: 'active' }));
  store.setRoundTurn(2, 'a');
  store.addDiceLine(new DiceLine({ id: 'owned', participantId: 'a' }));
  store.addDiceLine(new DiceLine({ id: 'independent', note: 'd100 du MJ' }));

  store.resetCombat();

  assert.equal(store.getCombat().round, 0);
  assert.equal(store.getCombat().currentActorId, null);
  assert.equal(store.getCombat().participants.size, 0);
  assert.deepEqual(store.getDiceLines().map(line => line.id), ['independent']);
  assert.equal(store.getLog()[0].text, 'Combat terminé.');
});
