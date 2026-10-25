import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { ficheSnapshot } from '../js/core/fiche-sync.js';

// B10b : le Destin et la Résilience de la fiche (champs `destin` et `resilience`) sont importés par la synchronisation des
// fiches vers les valeurs durables lues par la création de familier (`extensions.v5.fate`, `extensions.v5.resilience`).
const clone = value => structuredClone(value);
const fixture = JSON.parse(readFileSync(new URL('./fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const fiche = extra => ficheSnapshot('caelel', { ...fixture, ...extra });
const get = (store, id) => store.getCombat().participants.get(id);

async function table() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const profile = { id: 'pj', name: 'Caelel', kind: 'PJ', hp: 14, maxHp: 14, caracs: { F: 30, E: 40 }, diceLines: [], armor: { head: 0, body: 0, arms: 0, legs: 0 } };
  const hero = { id: 'hero', profileId: 'pj', name: 'Caelel', kind: 'PJ', camp: 'pj', zone: 'active', initiative: 30, hp: 14, maxHp: 14, caracs: { Int: 40, FM: 45 }, traits: [], talents: [], states: [], extensions: { v5: {} } };
  const imp = { id: 'imp', name: 'Homoncule', kind: 'Créature', camp: 'neutre', zone: 'active', initiative: 20, hp: 6, maxHp: 6, caracs: { Int: 30, FM: 30 }, traits: [], talents: [], states: [], extensions: { v5: {} } };
  const snapshot = { schemaVersion: 3, reserve: [profile], combat: { round: 1, currentActorId: 'hero', order: ['hero', 'imp'], participants: [hero, imp] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b10b' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const sync = (store, snapshot) => store.applyFicheSync([{ charId: 'caelel', profileId: 'pj', snapshot, links: {}, convert: {} }]);

test('B10b : l’instantané lit Destin et Résilience de la fiche, ignore les valeurs invalides', () => {
  assert.deepEqual(fiche({ destin: '3', resilience: '2' }).durables, { fate: 3, resilience: 2 });
  assert.equal(fiche({ destin: '', resilience: 'x' }).durables, undefined);
  assert.deepEqual(fiche({ destin: '1', chance: '2' }).resources, { fortune: 2 });
});

test('B10b : fiche Destin 3, Résilience 2 → créer un familier en Résilience débite 1, Annuler le rend', async () => {
  const store = await table();
  await sync(store, fiche({ destin: '3', resilience: '2' }));
  assert.equal(get(store, 'hero').extensions.v5.fate, 3);
  assert.equal(get(store, 'hero').extensions.v5.resilience, 2);
  const done = await store.createFamiliar('hero', 'imp', { system: 'homunculus', kind: 'power', wind: 'aqshy', resource: 'resilience' });
  assert.equal(done.ok, true);
  assert.equal(get(store, 'hero').extensions.v5.resilience, 1);
  assert.equal(get(store, 'hero').extensions.v5.familiarLinks[0].creation.balanceEntered, false);
  await store.undo();
  assert.equal(get(store, 'hero').extensions.v5.resilience, 2);
});

test('B10b : une resynchronisation sans changement de fiche ne rend pas le point débité ; une fiche modifiée le remplace', async () => {
  const store = await table();
  await sync(store, fiche({ destin: '3', resilience: '2' }));
  await store.createFamiliar('hero', 'imp', { system: 'homunculus', kind: 'power', wind: 'aqshy', resource: 'fate' });
  assert.equal(get(store, 'hero').extensions.v5.fate, 2);
  assert.equal(get(store, 'hero').fate, 2);
  await sync(store, fiche({ destin: '3', resilience: '2' }));
  assert.equal(get(store, 'hero').extensions.v5.fate, 2, 'fiche inchangée : le débit est conservé');
  await sync(store, fiche({ destin: '4', resilience: '2' }));
  assert.equal(get(store, 'hero').extensions.v5.fate, 4, 'fiche modifiée : nouvelle valeur de la fiche');
  assert.equal(get(store, 'hero').extensions.v5.resilience, 2);
});

test('B10b : fiche sans Résilience → la saisie à la main reste demandée', async () => {
  const store = await table();
  const { resilience, ...rest } = fixture;
  await sync(store, ficheSnapshot('caelel', { ...rest, destin: '2' }));
  assert.equal(get(store, 'hero').extensions.v5.fate, 2);
  assert.equal(get(store, 'hero').extensions.v5.resilience, undefined);
  const refused = await store.createFamiliar('hero', 'imp', { system: 'homunculus', kind: 'power', wind: 'aqshy', resource: 'resilience' });
  assert.equal(refused.ok, false);
  assert.match(refused.message, /Résilience du maître inconnue/);
});
