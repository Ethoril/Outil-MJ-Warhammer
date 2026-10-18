import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';
import { magicWeaponNature } from '../js/core/v5-magic-combat.js';
import { effectHandlers } from '../js/core/v5-divine-effect-handlers.js';

// P4b T3 contre les VRAIS contrats générés : États conditionnés par un fait de cible (Tremblement de terre, Vent sauvage,
// Tempête de glace, Mer déchaînée) et arme magique de l'Épée de justice. À exécuter après régénération des contrats.
const clone = value => structuredClone(value);
const idOf = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === name).id;
const EARTH = idOf('Tremblement de terre'), WIND = idOf('Vent sauvage'), STORM = idOf('Tempête de glace'), SEA = idOf('Mer déchaînée'), SWORD = idOf('Épée de justice');
const whenOf = id => getDivineContract(id).effects.find(effect => effect.type === 'condition' && effect.when);

const actor = (id, cult, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
async function fixture(cult, priest = {}) {
  const persistence = memory();
  const store = createStore({ persistence, storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
    participants: [actor('priest', cult, priest), actor('ally', cult, { initiative: 30 }), actor('foe', cult, { initiative: 20, camp: 'ennemi', kind: 'PNJ' })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  store.persistence = persistence;
  return store;
}
const input = (more = {}) => ({ actorId: 'priest', targetIds: ['ally', 'foe'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, ...more });
const stateOf = (store, id, pattern) => person(store, id).states.find(row => pattern.test(`${row.key} ${row.name}`));
async function run(store, id, fact, outcomes, more = {}) {
  const facts = { targets: Object.fromEntries(Object.entries(outcomes).map(([target, value]) => [target, { [fact]: value, withinRange: true }])) };
  const preview = store.previewDivineExecution(id, input({ facts, ...more }));
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(id, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}

test('statuts et clauses : les quatre miracles à État conditionné sont assistés, Épée de justice aussi', () => {
  for (const id of [EARTH, WIND, STORM, SEA, SWORD]) {
    const contract = getDivineContract(id);
    assert.equal(contract.status, 'assisted', contract.name);
    assert.ok(contract.clauses.some(clause => clause.mode === 'engine'), contract.name);
  }
  assert.deepEqual([EARTH, WIND, STORM, SEA].map(id => whenOf(id).key), ['Prone', 'Prone', 'Stunned', 'Prone']);
  assert.deepEqual([EARTH, WIND, STORM, SEA].map(id => whenOf(id).when.fact), ['athleticsFailed', 'toughnessFailed', 'willpowerFailed', 'athleticsFailed']);
  assert.equal(getDivineContract(SWORD).effects.some(effect => effect.type === 'condition'), false, 'Inconscient reste un rappel');
  assert.ok(getDivineContract(SWORD).clauses.some(clause => /Inconscient/.test(clause.text) && clause.mode !== 'engine'));
});

test('chaque fait est déclaré par le gestionnaire condition avec le libellé du contrat', () => {
  for (const id of [EARTH, WIND, STORM, SEA]) {
    const effect = whenOf(id), [field] = effectHandlers.condition.factFields(effect);
    assert.equal(field.field, effect.when.fact);
    assert.equal(field.required, true);
  }
});

test('Tremblement de terre : À terre si Athlétisme raté, ignoré sinon, bloqué sans fait', async () => {
  const store = await fixture('Taal');
  const missing = store.previewDivineExecution(EARTH, input({ facts: { targets: { ally: { athleticsFailed: true, withinRange: true }, foe: { withinRange: true } } } }));
  assert.equal(missing.ready, false);
  assert.ok(missing.needsInput.some(row => row.field === 'facts.targets.foe.athleticsFailed'), JSON.stringify(missing.needsInput));
  await run(store, EARTH, 'athleticsFailed', { ally: true, foe: false });
  assert.ok(stateOf(store, 'ally', /terre|prone/i));
  assert.equal(stateOf(store, 'foe', /terre|prone/i), undefined);
});

test('Tempête de glace : Étourdi si Volonté ratée', async () => {
  const store = await fixture('Ulric');
  await run(store, STORM, 'willpowerFailed', { ally: false, foe: true });
  assert.equal(stateOf(store, 'ally', /étourdi|stun|sonn/i), undefined);
  assert.ok(stateOf(store, 'foe', /étourdi|stun|sonn/i));
});

test('Vent sauvage : À terre au premier Round selon le fait de chaque cible', async () => {
  const store = await fixture('Taal');
  const result = await run(store, WIND, 'toughnessFailed', { ally: true, foe: false });
  assert.ok(stateOf(store, 'ally', /terre|prone/i));
  assert.equal(stateOf(store, 'foe', /terre|prone/i), undefined);
  assert.ok(result.receipt.reminders.some(text => /Round suivant/.test(text)), 'les Rounds suivants restent en rappel');
});

test('Mer déchaînée : les trois États restent, À terre selon le Test d’Athlétisme', async () => {
  const store = await fixture('Manann');
  await run(store, SEA, 'athleticsFailed', { ally: true }, { targetIds: ['ally'] });
  assert.equal(person(store, 'ally').states.length, 4);
  const second = await fixture('Manann');
  await run(second, SEA, 'athleticsFailed', { ally: false }, { targetIds: ['ally'] });
  assert.equal(person(second, 'ally').states.length, 3);
  assert.equal(stateOf(second, 'ally', /terre|prone/i), undefined);
});

test('Épée de justice : arme désignée magique, aucun État posé', async () => {
  const sword = { id: 'sword-attack', note: 'Épée', type: 'attack', attr: 'CC', base: 40, damage: 4, extensions: { fiche: { equipmentId: 'sword' } } };
  const store = await fixture('Verena', { actions: [sword] });
  const blocked = store.previewDivineExecution(SWORD, input({ targetIds: [] }));
  assert.equal(blocked.ready, false);
  assert.ok(blocked.needsInput.some(row => row.field === 'facts.weapon.equipmentId'), JSON.stringify(blocked.needsInput));
  const preview = store.previewDivineExecution(SWORD, input({ targetIds: [], facts: { weapon: { equipmentId: 'sword', classConfirmed: true } } }));
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(SWORD, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(magicWeaponNature(person(store, 'priest'), sword, false).magical, true);
  assert.equal(person(store, 'priest').states.length, 0);
});
