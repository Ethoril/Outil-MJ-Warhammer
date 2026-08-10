import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { Profile, Participant } from '../js/core/models.js';

function createMockStorage(initialData = {}) {
  const store = new Map(Object.entries(initialData));
  return {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    _map: store
  };
}

test('Store — Undo et Instantanés (Lot 10.1)', () => {
  const store = createStore({ storage: createMockStorage() });

  store.addProfile(new Profile({ id: 'prof1', name: 'Guerrier', hp: 12 }));
  assert.equal(store.canUndo(), false);

  // 1. Suppression d'un profil -> instantané capturé
  store.removeProfile('prof1');
  assert.equal(store.getReserve().has('prof1'), false);
  assert.equal(store.canUndo(), true);

  // 2. Restauration avec undo()
  const ok = store.undo();
  assert.equal(ok, true);
  assert.equal(store.getReserve().has('prof1'), true);
  assert.equal(store.getReserve().get('prof1').name, 'Guerrier');
  assert.equal(store.canUndo(), false);
});

test('Store — Historique structuré (Lot 10.4)', () => {
  const store = createStore({ storage: createMockStorage() });

  // 1. Entrée sous forme de chaîne legacy
  store.log('Message classique');
  let log = store.getLog();
  assert.equal(log[0].kind, 'management');
  assert.equal(log[0].text, 'Message classique');

  // 2. Entrée structurée (jet de dé)
  store.log({ kind: 'roll', actorId: 'p1', text: '🎲 Attaque 35', detail: { Roll: 35, SL: 2 } });
  log = store.getLog();
  assert.equal(log[0].kind, 'roll');
  assert.equal(log[0].actorId, 'p1');
  assert.equal(log[0].detail.Roll, 35);
});
