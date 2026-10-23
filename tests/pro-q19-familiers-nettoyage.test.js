import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const person = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 20, maxHp: 20, fortune: 2, zone: 'active', init: 40, caracs: { E: 30, FM: 40 }, skills: [], talents: [], states: [], equipment: [], ...extra });
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
const state = people => ({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
const get = (store, id) => store.listParticipants().find(p => p.id === id);
const homunculus = { system: 'homunculus', kind: 'power', wind: 'aqshy' };

async function plain(...people) {
  const store = createStore({ storage: storage() }); await store.ready;
  await store.loadFromJSON(state(people));
  return store;
}
async function persisted(...people) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && JSON.parse(JSON.stringify(saved)); }, async saveAtomic({ state: s }) { saved = JSON.parse(JSON.stringify(s)); return { ok: true }; } }, storage: null });
  await store.ready;
  await store.loadFromJSON(state(people));
  return store;
}

for (const [label, make] of [['sans persistance', plain], ['avec persistance', persisted]]) {
  test(`Q19 : retirer un familier nettoie familiarLinks du maître (${label})`, async () => {
    const store = await make(person('a'), person('b'), person('c'));
    await store.linkFamiliar('a', 'b', homunculus);
    await store.removeParticipant('b');
    assert.equal((get(store, 'a').extensions?.v5?.familiarLinks || []).length, 0);
    assert.equal((await store.linkFamiliar('c', 'a', homunculus)).ok, true);
  });

  test(`Q19 : Annuler après retrait du maître restaure le lien (${label})`, async () => {
    const store = await make(person('a'), person('b'));
    const { link } = await store.linkFamiliar('a', 'b', homunculus);
    await store.removeParticipant('a');
    assert.equal(get(store, 'b').extensions?.v5?.familiarOf, undefined);
    assert.equal(await store.undo(), true);
    assert.equal(get(store, 'b').extensions.v5.familiarOf.linkId, link.id);
    assert.equal(get(store, 'a').extensions.v5.familiarLinks.length, 1);
  });

  test(`Q19 : Annuler après retrait du familier restaure le lien du maître (${label})`, async () => {
    const store = await make(person('a'), person('b'));
    await store.linkFamiliar('a', 'b', homunculus);
    await store.removeParticipant('b');
    assert.equal(await store.undo(), true);
    assert.equal(get(store, 'a').extensions.v5.familiarLinks.length, 1);
    assert.ok(get(store, 'b').extensions.v5.familiarOf);
  });
}
