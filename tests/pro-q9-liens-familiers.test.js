import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const person = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 20, maxHp: 20, fortune: 2, zone: 'active', init: 40, caracs: { E: 30, FM: 40 }, skills: [], talents: [], states: [], equipment: [], ...extra });
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
async function combat(...people) {
  const store = createStore({ storage: storage() }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const get = (store, id) => store.listParticipants().find(p => p.id === id);
const homunculus = { system: 'homunculus', kind: 'power', wind: 'aqshy' };

test('Q9 : un maître ne peut pas devenir le familier d’un autre', async () => {
  const store = await combat(person('a'), person('b'), person('c'));
  assert.equal((await store.linkFamiliar('b', 'c', homunculus)).ok, true);
  const refused = await store.linkFamiliar('a', 'b', homunculus);
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'familiar-is-master');
  assert.equal(get(store, 'b').extensions.v5.familiarOf, undefined);
});

test('Q9 : un familier ne peut pas avoir de familier', async () => {
  const store = await combat(person('a'), person('b'), person('c'));
  await store.linkFamiliar('a', 'b', homunculus);
  const refused = await store.linkFamiliar('b', 'c', homunculus);
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'master-is-familiar');
});

test('Q9 : retirer le maître sans persistance libère aussi son familier', async () => {
  const store = await combat(person('a'), person('b'));
  await store.linkFamiliar('a', 'b', homunculus);
  store.removeParticipant('a');
  assert.equal(get(store, 'b').extensions?.v5?.familiarOf, undefined);
});

test('Q9 : retirer le maître du combat libère son familier, Annuler le remet', async () => {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && JSON.parse(JSON.stringify(saved)); }, async saveAtomic({ state }) { saved = JSON.parse(JSON.stringify(state)); return { ok: true }; } }, storage: null });
  await store.ready;
  const people = [person('a'), person('b')];
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  const { link } = await store.linkFamiliar('a', 'b', homunculus);
  await store.removeParticipant('a');
  assert.equal(get(store, 'a'), undefined);
  assert.equal(get(store, 'b').extensions?.v5?.familiarOf, undefined);
  assert.equal(await store.undo(), true);
  assert.equal(get(store, 'b').extensions.v5.familiarOf.linkId, link.id);
  assert.equal(get(store, 'a').extensions.v5.familiarLinks.length, 1);
});
