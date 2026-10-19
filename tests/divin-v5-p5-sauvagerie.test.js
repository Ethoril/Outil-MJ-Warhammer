import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract } from '../js/core/v5-divine-store.js';

// P5 — Bénédiction de Sauvagerie (p.221) : « Au prochain Coup Critique infligé par la cible, lancer deux fois et garder le meilleur résultat ».
// Arbitrage MJ (19 oct.) : la cible gagne la capacité de Frappe blessante pour son PROCHAIN critique, consommée à ce critique.
const clone = value => structuredClone(value);
const CULTS = ['manann', 'taal', 'ulric'];
const ids = CULTS.map(cult => `divine:blessing:${cult}:savagery`);
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'foe' ? 'ennemi' : 'pj', zone: 'active', initiative: 60, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Taal' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 }, hasMomentum: false } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
async function fixture(allyTalents = []) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'], participants: [
    actor('priest'), actor('ally', { initiative: 50, talents: allyTalents }), actor('foe', { initiative: 30, talents: [] })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'sauvagerie' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const expiry = { phase: 'endOfTurn', round: 6, actorId: 'priest' };
const input = () => ({ actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 }, expiry,
  facts: { targets: { ally: { withinRange: true } } } });
async function bless(store, id = ids[1]) {
  const preview = store.previewDivineExecution(id, input());
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(id, { preview });
  assert.equal(result.ready, true, result.error);
  await store.nextTurn();
  assert.equal(store.getCombat().currentActorId, 'ally');
}
const layers = (store, id = 'ally') => (person(store, id).extensions?.v5?.divineEffects || []).filter(row => row.consumeOn === 'critical');
const injures = (store, id = 'ally') => person(store, id).talents.filter(row => row.id === 'talent-strike-to-injure');
const melee = (id, roll, extra = {}) => ({ resolutionId: id, actorId: 'ally', targetId: 'foe', action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, roll,
  defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, ...extra });
const critical = (id, choice = true) => melee(id, 22, { criticalRolls: { location: 2, effect: 80, injureEffect: 20 }, v5: { kind: 'melee', talentChoices: { 'injure:first': choice } } });

test('Sauvagerie : les trois contrats portent un effet grant-talent consommé au prochain critique', () => {
  for (const id of ids) {
    const contract = getDivineContract(id);
    assert.ok(contract, id);
    assert.notEqual(contract.status, 'manual', id);
    assert.equal(contract.effects.length, 1, id);
    const [effect] = contract.effects;
    assert.equal(effect.type, 'grant-talent', id);
    assert.deepEqual(effect.talents, [{ id: 'talent-strike-to-injure', rank: 1 }], id);
    assert.equal(effect.consumeOn, 'critical', id);
    assert.deepEqual(effect.duration, { value: 6, unit: 'rounds' }, id);
    assert.equal(contract.clauses.find(row => row.id === 'effect').mode, 'engine', id);
  }
});

test('Sauvagerie : la couche donne Frappe blessante, l’aperçu d’un critique expose les deux gravités', async () => {
  const store = await fixture();
  assert.equal(injures(store).length, 0);
  await bless(store);
  assert.equal(layers(store).length, 1);
  assert.equal(injures(store).length, 1);
  assert.equal(injures(store)[0].temporary, true);
  const pending = store.previewResolution(melee('c0', 22, { criticalRolls: { location: 2, effect: 80, injureEffect: 20 } }));
  assert.ok(pending.unresolved.some(row => row.includes('Frappe blessante : choisir la gravité')), 'le choix est demandé');
  assert.equal(store.previewResolution(critical('c1', true)).critical.details.effectRollBase, 20);
  assert.equal(store.previewResolution(critical('c2', false)).critical.details.effectRollBase, 80);
  assert.equal(layers(store).length, 1, 'un aperçu ne consomme rien');
});

test('Sauvagerie : le critique appliqué consomme la couche et le talent ; un second critique n’a plus de choix', async () => {
  const store = await fixture();
  await bless(store);
  const applied = await store.applyResolution(store.previewResolution(critical('c1', true)));
  assert.equal(applied.status, 'applied', applied.reason);
  assert.equal(layers(store).length, 0);
  assert.equal(injures(store).length, 0);
  assert.deepEqual(person(store, 'ally').extensions.v5.divineEffects || [], []);
  const second = store.previewResolution(melee('c2', 22, { criticalRolls: { location: 2, effect: 80, injureEffect: 20 }, v5: { kind: 'melee', talentChoices: { 'injure:first': true } } }));
  assert.equal(second.critical.details.effectRollBase, 80, 'plus de second jet');
  assert.ok(!second.unresolved.some(row => row.includes('Frappe blessante')));
});

test('Sauvagerie : une attaque sans critique ne consomme pas la couche', async () => {
  const store = await fixture();
  await bless(store);
  const preview = store.previewResolution(melee('n1', 35));
  assert.equal(preview.critical, null);
  const applied = await store.applyResolution(preview);
  assert.equal(applied.status, 'applied', applied.reason);
  assert.equal(layers(store).length, 1);
  assert.equal(injures(store).length, 1);
});

test('Sauvagerie : Undo restaure la couche et le talent, Redo les retire', async () => {
  const store = await fixture();
  await bless(store);
  await store.applyResolution(store.previewResolution(critical('c1', true)));
  assert.equal(injures(store).length, 0);
  await store.undo();
  assert.equal(layers(store).length, 1);
  assert.equal(injures(store).length, 1);
  await store.redo();
  assert.equal(layers(store).length, 0);
  assert.equal(injures(store).length, 0);
});

test('Sauvagerie : seul le critique infligé par la cible consomme (pas le critique subi)', async () => {
  const store = await fixture();
  await bless(store);
  await store.nextTurn();
  assert.equal(store.getCombat().currentActorId, 'foe');
  const hit = { resolutionId: 'h1', actorId: 'foe', targetId: 'ally', action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, roll: 22,
    defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, criticalRolls: { location: 2, effect: 80 } };
  const preview = store.previewResolution(hit);
  assert.ok(preview.critical?.details, 'critique contre la cible de la bénédiction');
  const applied = await store.applyResolution(preview);
  assert.equal(applied.status, 'applied', applied.reason);
  assert.equal(layers(store).length, 1);
  assert.equal(injures(store).length, 1);
});

test('Sauvagerie : avec le vrai talent Frappe blessante, rien d’ajouté mais la couche est consommée', async () => {
  const store = await fixture([{ id: 'talent-strike-to-injure', status: 'resolved', rank: 1 }]);
  await bless(store);
  assert.equal(injures(store).length, 1, 'pas de doublon');
  assert.equal(layers(store).length, 1);
  const applied = await store.applyResolution(store.previewResolution(critical('c1', true)));
  assert.equal(applied.status, 'applied', applied.reason);
  assert.equal(layers(store).length, 0);
  assert.equal(injures(store).length, 1, 'le vrai talent reste');
  assert.equal(injures(store)[0].temporary, undefined);
});

test('Sauvagerie : sans couche, l’attaquant critique comme avant', async () => {
  const store = await fixture();
  await store.nextTurn();
  const preview = store.previewResolution(critical('s1', true));
  assert.equal(preview.critical.details.effectRollBase, 80);
  const applied = await store.applyResolution(preview);
  assert.equal(applied.status, 'applied', applied.reason);
  assert.equal(layers(store).length, 0);
});

test('Sauvagerie : non consommée, la couche expire après 6 Rounds et le talent part avec', async () => {
  const store = await fixture();
  await bless(store);
  assert.equal(injures(store).length, 1);
  for (let i = 0; i < 20; i++) await store.nextTurn();
  assert.equal(layers(store).length, 0);
  assert.equal(injures(store).length, 0);
});
