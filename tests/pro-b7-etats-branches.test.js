import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { buildCreatureStatesBlock, readCreatureStatesInputs } from '../js/ui/creature-states-block.js';

// B7 : Nuée et Venin (Hard) des Serpents de Sotek (L07, E0-P-245).
const clone = value => structuredClone(value);
const library = JSON.parse(readFileSync('js/data/bestiary/L07.json', 'utf8')).profiles;
const person = (id, camp, extra = {}) => ({ id, name: id, kind: 'PNJ', camp, zone: 'active', initiative: 30, hp: 10, maxHp: 10, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], talents: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });

async function table() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const swarm = { ...buildParticipantFromBestiary('E0-P-245', { library, zone: 'active' }), id: 'swarm', camp: 'ennemi', zone: 'active', states: [] };
  const participants = [swarm, person('hero', 'pj'), person('mage', 'pj'), person('far', 'pj'), person('ally', 'ennemi')];
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: participants.map(item => item.id), participants }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b7' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const who = (store, id) => store.getCombat().participants.get(id);

test('B7 : la carte de la Nuée affiche engagés et Venin, rappels de Traits sur la carte', async () => {
  const store = await table();
  const make = tag => ({ tag, children: [], dataset: {}, className: '', textContent: '', appendChild(child) { this.children.push(child); return child; } });
  const block = buildCreatureStatesBlock(make, who(store, 'swarm'), [...store.getCombat().participants.values()]);
  assert.equal(block.children.filter(child => child.tag === 'label').length, 3);
  assert.ok(block.children.some(child => child.className === 'tiny btn-swarm-end-round'));
  assert.ok(block.children.some(child => child.className === 'tiny btn-creature-venom'));
  assert.equal(buildCreatureStatesBlock(make, who(store, 'hero'), []), null);
  const boxes = [{ checked: true, value: 'hero' }, { checked: false, value: 'mage' }];
  assert.deepEqual(readCreatureStatesInputs({ querySelectorAll: () => boxes, querySelector: () => ({ value: 'mage' }) }), { engagedIds: ['hero'], venomTargetId: 'mage' });
  const texts = store.getParticipantReminders('swarm').map(item => item.text).join('\n');
  assert.match(texts, /Nuée :/);
  assert.match(texts, /Venin :/);
  assert.ok(!store.getParticipantReminders('hero').some(item => /Nuée|Venin/.test(item.text)));
});

test('B7 : fin de Round de la Nuée, 1 Blessure à chaque engagé coché seulement, annulable', async () => {
  const store = await table();
  const result = await store.applySwarmEndOfRound('swarm', ['hero', 'mage', 'swarm']);
  assert.equal(result.ok, true);
  assert.deepEqual(result.targetIds, ['hero', 'mage']);
  assert.equal(who(store, 'hero').hp, 9);
  assert.equal(who(store, 'mage').hp, 9);
  assert.equal(who(store, 'far').hp, 10);
  await store.undo();
  assert.equal(who(store, 'hero').hp, 10);
  assert.equal((await store.applySwarmEndOfRound('swarm', [])).ok, false);
  assert.equal((await store.applySwarmEndOfRound('hero', ['mage'])).ok, false);
});

test('B7 : Venin (Hard) empoisonne la cible blessée, annulable ; sans Trait refusé', async () => {
  const store = await table();
  const result = await store.applyCreatureVenom('swarm', 'hero');
  assert.equal(result.ok, true);
  const poisoned = who(store, 'hero').states.find(state => state.key === 'empoisonne');
  assert.ok(poisoned);
  assert.equal((await store.applyCreatureVenom('hero', 'mage')).ok, false);
  assert.equal((await store.applyCreatureVenom('swarm', 'swarm')).ok, false);
  await store.undo();
  assert.ok(!who(store, 'hero').states.some(state => state.key === 'empoisonne'));
});
