import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { planFamiliarCreation, familiarCostBalance } from '../js/core/familiars.js';
import { buildFamiliarBlock, readFamiliarInputs } from '../js/ui/familiar-block.js';

// B10 : création de familier (décisions du MJ du 22/10) : un événement unique qui débite 1 Destin ou 1 Résilience du maître,
// chaque point supplémentaire cédé donne 1 point à répartir, le familier devient un PNJ allié lié au maître, Annuler rend le point.
const clone = value => structuredClone(value);

async function table({ fate = 3 } = {}) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const hero = { id: 'hero', name: 'Magda', kind: 'PJ', camp: 'pj', zone: 'active', initiative: 30, hp: 12, maxHp: 12, caracs: { Int: 40, FM: 45 }, traits: [], talents: [], states: [], extensions: { v5: fate === null ? {} : { fate } } };
  const imp = { id: 'imp', name: 'Homoncule', kind: 'Créature', camp: 'neutre', zone: 'active', initiative: 20, hp: 6, maxHp: 6, caracs: { Int: 30, FM: 30 }, traits: [], talents: [], states: [], extensions: { v5: {} } };
  const cat = { id: 'cat', name: 'Chat', kind: 'Créature', camp: 'neutre', zone: 'active', initiative: 40, hp: 4, maxHp: 4, caracs: { Int: 15, FM: 20 }, traits: [], talents: [], states: [], extensions: { v5: {} } };
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: ['hero', 'imp', 'cat'], participants: [hero, imp, cat] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b10' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const get = (store, id) => store.getCombat().participants.get(id);
const homunculus = { system: 'homunculus', kind: 'power', wind: 'aqshy', resource: 'fate' };

test('B10 : plan de création, coût et points à répartir ; refus motivés', () => {
  const master = { id: 'm', camp: 'pj', extensions: { v5: { fate: 2 } } }, familiar = { id: 'f', extensions: { v5: {} } };
  const plan = planFamiliarCreation(master, familiar, { ...homunculus, extraPoints: 1 });
  assert.equal(plan.ok, true);
  assert.deepEqual([plan.before, plan.spent, plan.after, plan.pointsToDistribute, plan.camp], [2, 2, 0, 1, 'allie']);
  assert.equal(planFamiliarCreation(master, familiar, { ...homunculus, extraPoints: 2 }).ok, false);
  assert.match(planFamiliarCreation(master, familiar, { ...homunculus, resource: 'gold' }).message, /Destin ou Résilience/);
  const unknown = planFamiliarCreation({ id: 'm', extensions: { v5: {} } }, familiar, homunculus);
  assert.equal(unknown.ok, false);
  assert.match(unknown.message, /Destin du maître inconnu/);
  assert.equal(planFamiliarCreation({ id: 'm', extensions: { v5: {} } }, familiar, { ...homunculus, balance: 1 }).before, 1);
  assert.equal(familiarCostBalance({ fate: 4 }, 'fate'), 4);
  assert.equal(familiarCostBalance({ extensions: { v5: { resilience: 2 } } }, 'resilience'), 2);
  assert.equal(planFamiliarCreation(master, master, homunculus).ok, false);
});

test('B10 : créer un familier depuis le bloc de la carte, Destin débité, PNJ allié lié ; Annuler rend le point', async () => {
  const store = await table();
  const made = [];
  const values = { '.familiar-target': 'imp', '.familiar-system': 'homunculus', '.familiar-kind': 'power', '.familiar-wind': 'aqshy', '.familiar-species': '', '.familiar-resource': 'fate', '.familiar-extra': '1', '.familiar-balance': '' };
  const createElement = tag => { const el = { tag, children: [], dataset: {}, appendChild(child) { this.children.push(child); }, querySelector(selector) { return { value: values[selector] ?? '' }; } }; made.push(el); return el; };
  const block = buildFamiliarBlock(createElement, get(store, 'hero'), store.listParticipants());
  assert.ok(block);
  assert.ok(made.some(el => el.className === 'tiny btn-create-familiar' && el.textContent === 'Création de familier'));
  const options = made.filter(el => el.tag === 'option').map(el => el.textContent);
  for (const name of ['Homoncule', 'Familier animal', 'Familier de combat', 'Familier de puissance', 'Familier de sort', 'Destin', 'Résilience']) assert.ok(options.includes(name), name);
  assert.ok(options.includes('Chat') && options.includes('Homoncule'));
  const inputs = readFamiliarInputs(block);
  assert.deepEqual(inputs, { familiarId: 'imp', system: 'homunculus', kind: 'power', wind: 'aqshy', species: null, resource: 'fate', extraPoints: 1, balance: null });
  const done = await store.createFamiliar('hero', inputs.familiarId, inputs);
  assert.equal(done.ok, true);
  assert.equal(get(store, 'hero').extensions.v5.fate, 1);
  assert.equal(get(store, 'hero').fate, 1);
  const link = get(store, 'hero').extensions.v5.familiarLinks[0];
  assert.deepEqual(link.creation, { resource: 'fate', before: 3, spent: 2, after: 1, pointsToDistribute: 1, balanceEntered: false, campBefore: 'neutre' }); // B11c : camp d'avant la création, rendu au retrait du lien
  assert.equal(get(store, 'imp').extensions.v5.familiarOf.masterId, 'hero');
  assert.equal(get(store, 'imp').camp, 'allie');
  assert.match(store.getLog()[0].text, /Création de familier/);
  // Le bloc du maître liste alors son familier ; le familier n'a pas de bloc de création.
  made.length = 0;
  buildFamiliarBlock(createElement, get(store, 'hero'), store.listParticipants());
  assert.ok(made.some(el => /Homoncule : Familier de puissance, Imprégné d’Aqshy, 1 point à répartir/.test(el.textContent || '')));
  assert.equal(buildFamiliarBlock(createElement, get(store, 'imp'), store.listParticipants()), null);
  await store.undo();
  assert.equal(get(store, 'hero').extensions.v5.fate, 3);
  assert.equal(get(store, 'hero').extensions.v5.familiarLinks?.length || 0, 0);
  assert.equal(get(store, 'imp').extensions.v5.familiarOf, undefined);
  assert.equal(get(store, 'imp').camp, 'neutre');
});

test('B10 : Résilience inconnue saisie par le MJ, familier animal ; refus sans révision', async () => {
  const store = await table({ fate: null });
  const before = store.getHistory().past.length;
  const refused = await store.createFamiliar('hero', 'cat', { system: 'animal', kind: 'power', species: 'cat', resource: 'resilience' });
  assert.equal(refused.ok, false);
  assert.match(refused.message, /Résilience du maître inconnue/);
  assert.equal(store.getHistory().past.length, before);
  const done = await store.createFamiliar('hero', 'cat', { system: 'animal', kind: 'power', species: 'cat', resource: 'resilience', balance: 2 });
  assert.equal(done.ok, true);
  assert.equal(get(store, 'hero').extensions.v5.resilience, 1);
  assert.equal(get(store, 'hero').extensions.v5.familiarLinks[0].creation.balanceEntered, true);
  await store.undo();
  assert.equal(get(store, 'hero').extensions.v5.resilience, undefined);
});
