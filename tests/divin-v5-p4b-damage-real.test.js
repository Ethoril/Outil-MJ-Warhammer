import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';

// P4b T2 contre les vrais contrats (registre régénéré) : Poing de vengeance, Tempête de glace, Exigence de Rhya, Pureté absolue, Comète, Jugement.
const clone = value => structuredClone(value);
const idOf = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === name).id;
const FIST = idOf('Poing de vengeance'), ICE = idOf('Tempête de glace'), DEMAND = idOf('Exigence de Rhya'), PURITY = idOf('Pureté absolue'),
  COMET = idOf('Comète à Deux Queues'), JUDGEMENT = idOf('Jugement du Roi de la neige');

const person = (store, id) => store.listParticipants().find(row => row.id === id);
const fighter = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'pnj', zone: 'active', initiative: 20, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 40, M: 4 },
  equipment: [], traits: [], states: [], talents: [], armor: { head: 3, body: 3, arms: 3, legs: 3 }, extensions: { v5: {} }, ...extra });
const priest = (cult, extra = {}) => fighter('priest', { kind: 'PJ', camp: 'pj', initiative: 60, caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  extensions: { v5: { divine: { sin: 0 }, ...(cult==='Solkan'?{corruptionPoints:0}:{}) } }, ...extra });
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
async function fixture(cult, others, priestExtra = {}) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', ...others.map(row => row.id)], participants: [priest(cult, priestExtra), ...others] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
// Jet de prière 45 contre Prière 60 : 2 DR.
const input = (ids, more = {}, factMore = {}) => ({ actorId: 'priest', targetIds: ids, roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  facts: { targets: Object.fromEntries(ids.map(id => [id, { withinRange: true, ...(factMore[id] || {}) }])) }, ...more });
async function cast(store, id, request) {
  const preview = store.previewDivineExecution(id, request);
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(id, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}
const needsOf = (store, id, request) => store.previewDivineExecution(id, request).needsInput.map(row => row.field);
const talents = cult => [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult },
  { id: 'talent-holy-hatred', status: 'resolved', rank: 1 }];

test('contrats : six miracles assistés, les clauses restantes sont celles qui ne sont pas automatisées', () => {
  const remaining = id => getDivineContract(id).clauses.filter(clause => clause.mode !== 'engine').map(clause => clause.id);
  for (const id of [FIST, ICE, DEMAND, PURITY, COMET, JUDGEMENT]) assert.equal(getDivineContract(id).status, 'assisted', id);
  assert.deepEqual(getDivineContract(FIST).effects.map(row => row.type), ['ordinary-damage']);
  assert.deepEqual(getDivineContract(ICE).effects.map(row => row.type), ['ordinary-damage', 'condition']);
  assert.deepEqual(getDivineContract(DEMAND).effects.map(row => row.type), ['condition', 'direct-damage']);
  assert.deepEqual(getDivineContract(COMET).effects.map(row => row.appliesTo), [undefined, 'caster']);
  assert.deepEqual(getDivineContract(JUDGEMENT).effects.map(row => row.appliesTo), [undefined, undefined, 'caster']);
  assert.deepEqual(remaining(FIST), ['no-sin-corruption', 'solkan-purity']);
  assert.deepEqual(remaining(ICE), []);
  assert.ok(!remaining(COMET).includes('backfire') && !remaining(JUDGEMENT).includes('redirect') && !remaining(DEMAND).includes('wounds'));
});

test('Poing de vengeance : 1d10 + Bonus de Volonté, PA ignorés, BE déduit, Haine sacrée +2', async () => {
  const store = await fixture('Solkan', [fighter('foe')]);
  assert.deepEqual(needsOf(store, FIST, input(['foe'])), ['damageRoll']);
  await cast(store, FIST, input(['foe'], { damageRoll: 6 }));
  assert.equal(person(store, 'foe').hp, 20 - (6 + 5 - 3));
  const hateful = await fixture('Solkan', [fighter('foe')], { talents: talents('Solkan') });
  await cast(hateful, FIST, input(['foe'], { damageRoll: 6 }));
  assert.equal(person(hateful, 'foe').hp, 20 - (6 + 5 - 3 + 2));
});

test('Tempête de glace : Dégâts +5 ordinaires, BE et PA de la Localisation, minimum 1, par cible', async () => {
  const bare = { head: 1, body: 0, arms: 0, legs: 0 };
  const store = await fixture('Ulric', [fighter('a', { armor: bare }), fighter('b', { armor: bare }), fighter('c', { armor: { head: 9, body: 9, arms: 9, legs: 9 } })]);
  const stun = { a: { willpowerFailed: false }, b: { willpowerFailed: false }, c: { willpowerFailed: false } };
  assert.deepEqual(needsOf(store, ICE, input(['a', 'b'], {}, stun)), ['locationRolls.a', 'locationRolls.b']);
  await cast(store, ICE, input(['a', 'b', 'c'], { locationRolls: { a: 10, b: 45 }, locationChoices: { c: 'body' } }, stun));
  assert.deepEqual(['a', 'b', 'c'].map(id => person(store, id).hp), [20 - 1, 20 - 2, 20 - 1], '5 − BE 3 − PA (Tête 1, Corps 0), minimum 1 sous 9 PA');
});

test('Exigence de Rhya : 1 Blessure + 1 par DR par humanoïde, sans BE ni PA, plus Fatigué', async () => {
  const store = await fixture('Rhya', [fighter('human'), fighter('beast')]);
  assert.deepEqual(needsOf(store, DEMAND, input(['human'])), ['facts.targets.human.humanoid']);
  assert.deepEqual(needsOf(store, DEMAND, input(['human', 'beast'], {}, { human: { humanoid: true }, beast: { humanoid: false } })), ['facts.targets.beast.humanoid']);
  await cast(store, DEMAND, input(['human'], {}, { human: { humanoid: true } }));
  assert.equal(person(store, 'human').hp, 20 - 3);
  assert.equal(person(store, 'human').states.length, 1, 'État Fatigué');
});

test('Pureté absolue : 1d10 Blessures aux seules créatures impures (traits ou fait MJ), le prêtre compris', async () => {
  const store = await fixture('Solkan', [fighter('ghoul', { traits: ['Mort-vivant'] }), fighter('sinner'), fighter('innocent'), fighter('mage', { traits: ['Lanceur de sorts'] })]);
  assert.deepEqual(needsOf(store, PURITY, input(['sinner'], { damageRoll: 5 })), ['facts.targets.sinner.impure']);
  await cast(store, PURITY, input(['ghoul', 'sinner', 'innocent', 'mage', 'priest'], { damageRoll: 5 }, { sinner: { impure: true }, innocent: { impure: false }, priest: { impure: true } }));
  assert.deepEqual(['ghoul', 'sinner', 'innocent', 'mage', 'priest'].map(id => person(store, id).hp), [15, 15, 20, 15, 15]);
});

test('Comète à Deux Queues : le prêtre est frappé et Enflammé quand aucune cible n’est un ennemi', async () => {
  const none = await fixture('Sigmar', [fighter('a')]);
  await cast(none, COMET, input(['a'], { damageRoll: 7 }, { a: { foe: false } }));
  assert.equal(person(none, 'a').hp, 20 - 9);
  assert.equal(person(none, 'priest').hp, 20 - 9);
  assert.deepEqual(person(none, 'priest').states.map(row => row.key), ['enflamme']);
  const foe = await fixture('Sigmar', [fighter('a')]);
  await cast(foe, COMET, input(['a'], { damageRoll: 7 }, { a: { foe: true } }));
  assert.equal(person(foe, 'priest').hp, 20);
});

test('Jugement du Roi de la neige : cible épargnée et retour sur le prêtre si le verdict est refusé', async () => {
  const refused = await fixture('Ulric', [fighter('target')]);
  await cast(refused, JUDGEMENT, input(['target'], { damageRoll: 4 }, { target: { judgement: false } }));
  assert.deepEqual([person(refused, 'target').hp, person(refused, 'priest').hp], [20, 20 - 6]);
  const stunned = who => (who.states || []).some(state => state.key === 'sonne' || state.name === 'Sonné');
  assert.equal(stunned(person(refused, 'target')), false, 'v3 : cible épargnée, pas de Sonné');
  const judged = await fixture('Ulric', [fighter('target')], { talents: talents('Ulric') });
  await cast(judged, JUDGEMENT, input(['target'], { damageRoll: 4 }, { target: { judgement: true } }));
  assert.deepEqual([person(judged, 'target').hp, person(judged, 'priest').hp], [20 - 8, 20], 'Haine sacrée sur la cible, jamais sur le prêtre');
  assert.equal(stunned(person(judged, 'target')), true, 'v3 : la cible jugée reçoit Sonné');
  const selfStruck = await fixture('Ulric', [fighter('target')], { talents: talents('Ulric') });
  await cast(selfStruck, JUDGEMENT, input(['target'], { damageRoll: 4 }, { target: { judgement: false } }));
  assert.equal(person(selfStruck, 'priest').hp, 20 - 6, 'pas de Haine sacrée sur le retour');
});
