import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
const withKey = draft => ({ ...draft, extensions: { ...(draft.extensions || {}), v5: { ...(draft.extensions?.v5 || {}), carriedKey: { terms: [{ id: 'x' }] } } } });

test('K2 caractérisation : une clé de `extensions.v5` posée par une commande survit aux commandes suivantes, à l’export et à l’annulation', () => {
  const store = createStore({ storage: storage() });
  assert.equal(store.executeCommand('set-carried-key', withKey).ok, true);
  assert.deepEqual(JSON.parse(store.getFullJSON()).extensions.v5.carriedKey, { terms: [{ id: 'x' }] });
  assert.equal(store.executeCommand('add-profile', draft => ({ ...draft, reserve: [{ id: 'p1', name: 'Profil', hp: 5, initiative: 30 }] })).ok, true);
  assert.deepEqual(JSON.parse(store.getFullJSON()).extensions.v5.carriedKey, { terms: [{ id: 'x' }] }, 'une commande sans rapport la conserve');
  assert.equal(store.undo(), true);
  assert.deepEqual(JSON.parse(store.getFullJSON()).extensions.v5.carriedKey, { terms: [{ id: 'x' }] });
  assert.equal(store.undo(), true);
  assert.equal(JSON.parse(store.getFullJSON()).extensions?.v5?.carriedKey, undefined, 'l’annulation retire la clé');
  assert.equal(store.redo(), true);
  assert.deepEqual(JSON.parse(store.getFullJSON()).extensions.v5.carriedKey, { terms: [{ id: 'x' }] });
});

test('K2 caractérisation : la clé voyage avec l’export et se recharge dans un autre store', () => {
  const first = createStore({ storage: storage() });
  first.executeCommand('set-carried-key', withKey);
  const second = createStore({ storage: storage() });
  second.loadFromJSON(first.getFullJSON());
  assert.deepEqual(JSON.parse(second.getFullJSON()).extensions.v5.carriedKey, { terms: [{ id: 'x' }] });
});
