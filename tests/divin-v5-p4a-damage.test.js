import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';
import { validateEffect, effectNeeds } from '../js/core/v5-divine-effect-handlers.js';

// P4a T2 : dégâts directs en Blessures (Anéantir, Feu de l'âme, Comète, Jugement) et soin en formule (Caresse de Rhya).
const clone = value => structuredClone(value);
const ANNIHILATE = 'divine:miracle:morr:destroy-undead';
const SOULFIRE = 'divine:miracle:sigmar:soulfire';
const COMET = 'divine:miracle:sigmar:twin-tailed-comet';
const JUDGEMENT = 'divine:miracle:ulric:the-snow-king-s-judgement';
const TOUCH = 'divine:miracle:rhya:rhya-s-touch';

const cultTalents = cult => [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult }];
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const stateOf = store => JSON.parse(store.getFullJSON());
const fighter = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'pnj', zone: 'active', initiative: 20, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 40, M: 4 },
  equipment: [], traits: [], states: [], talents: [], armor: { head: 3, body: 3, arms: 3, legs: 3 }, extensions: { v5: {} }, ...extra });
const priest = (cult, extra = {}) => ({ ...fighter('priest', { kind: 'PJ', camp: 'pj', initiative: 60, caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 } }),
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: cultTalents(cult), prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
async function fixture(cult, others, priestExtra = {}) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', ...others.map(row => row.id)], participants: [priest(cult, priestExtra), ...others] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const facts = (ids, more = {}) => ({ targets: Object.fromEntries(ids.map(id => [id, { withinRange: true, withinTouch: true, ...(more[id] || {}) }])) });
// Jet de prière 45 contre Prière 60 : 2 DR ; 25 : 4 DR ; 55 : 1 DR.
const input = (ids, more = {}, factMore = {}) => ({ actorId: 'priest', targetIds: ids, roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  facts: facts(ids, factMore), ...more });
async function cast(store, id, request) {
  const preview = store.previewDivineExecution(id, request);
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(id, { preview });
  assert.equal(result.ready, true, result.error);
  return { preview, result };
}
const undead = (id, extra = {}) => fighter(id, { traits: ['Mort-vivant'], ...extra });

test('contrats : cinq miracles passent en assisted et exposent leurs clauses moteur', () => {
  for (const id of [ANNIHILATE, SOULFIRE, COMET, JUDGEMENT, TOUCH]) {
    const contract = getDivineContract(id);
    assert.equal(contract.status, 'assisted', id);
    assert.ok(contract.effects.length, id);
  }
  assert.equal(getDivineContract(ANNIHILATE).effects[0].type, 'direct-damage');
  assert.deepEqual(getDivineContract(TOUCH).effects[0].value, { formula: 'BSoc' });
  assert.match(validateEffect({ type: 'direct-damage', dice: { count: 0, sides: 10 } }), /dice/);
  assert.match(validateEffect({ type: 'direct-damage', dice: { count: 1, sides: 10 }, conditionalBonus: { when: 'x', perSuccessLevel: 1 } }), /conditionalBonus/);
  assert.equal(validateEffect({ type: 'wound-heal', value: { formula: 'BSoc' } }), null);
  assert.match(validateEffect({ type: 'wound-heal', value: { formula: 'nimporte quoi' } }), /exige value/);
  assert.ok(effectNeeds({ type: 'direct-damage', dice: { count: 1, sides: 10 } }, { targets: [fighter('t')], input: {} }).some(row => row.field === 'damageRoll'));
});

test('dégâts directs : ni Bonus d’Endurance ni PA, exactement le dé plus un par DR', async () => {
  const store = await fixture('Morr', [undead('foe', { hp: 20, caracs: { ...fighter('x').caracs, E: 30 } })]);
  const { result } = await cast(store, ANNIHILATE, input(['foe'], { damageRoll: 6 }));
  assert.equal(person(store, 'foe').hp, 12, '6 + 2 DR = 8 Blessures malgré E 30 et PA 3');
  const row = result.receipt.effectReceipts[0];
  assert.equal(row.targetId, 'foe');
  assert.equal(row.result.woundsLost, 8);
  assert.equal(row.result.hpAfter, 12);
});

test('dégâts directs : jet commun par défaut, jet propre à une cible en option, jet absent ou hors plage refusé', async () => {
  const foes = () => [undead('a'), undead('b')];
  const missing = (await fixture('Morr', foes())).previewDivineExecution(ANNIHILATE, input(['a', 'b']));
  assert.equal(missing.ready, false);
  assert.ok(missing.needsInput.some(row => row.field === 'damageRoll'), JSON.stringify(missing.needsInput));
  const outOfRange = (await fixture('Morr', foes())).previewDivineExecution(ANNIHILATE, input(['a', 'b'], { damageRoll: 11 }));
  assert.equal(outOfRange.ready, false);
  const common = await fixture('Morr', foes());
  await cast(common, ANNIHILATE, input(['a', 'b'], { damageRoll: 4 }));
  assert.deepEqual([person(common, 'a').hp, person(common, 'b').hp], [14, 14]);
  const perTarget = await fixture('Morr', foes());
  await cast(perTarget, ANNIHILATE, input(['a', 'b'], { damageRoll: 4, damageRolls: { b: 9 } }));
  assert.deepEqual([person(perTarget, 'a').hp, person(perTarget, 'b').hp], [14, 9]);
  const badOwn = (await fixture('Morr', foes())).previewDivineExecution(ANNIHILATE, input(['a', 'b'], { damageRoll: 4, damageRolls: { b: 0 } }));
  assert.equal(badOwn.ready, false);
  assert.ok(badOwn.needsInput.some(row => row.field === 'damageRolls.b'));
});

test('Anéantir : un non mort-vivant est refusé, le fait MJ établit un mort-vivant, détruit il ne peut plus être relevé', async () => {
  const living = await fixture('Morr', [fighter('living')]);
  const refused = living.previewDivineExecution(ANNIHILATE, input(['living'], { damageRoll: 5 }));
  assert.equal(refused.ready, false);
  assert.ok(refused.needsInput.some(row => row.field === 'facts.targets.living.undead'), JSON.stringify(refused.needsInput));
  const byFact = await fixture('Morr', [fighter('shade', { hp: 20 })]);
  await cast(byFact, ANNIHILATE, input(['shade'], { damageRoll: 5 }, { shade: { undead: true } }));
  assert.equal(person(byFact, 'shade').hp, 13);
  const store = await fixture('Morr', [undead('ghoul', { hp: 5 })]);
  const { result } = await cast(store, ANNIHILATE, input(['ghoul'], { damageRoll: 10 }));
  const ghoul = person(store, 'ghoul');
  assert.equal(ghoul.hp, 0);
  assert.equal(ghoul.extensions.v5.cannotRaiseUndead, true);
  assert.equal(ghoul.extensions.v5.dead, true);
  assert.equal(result.receipt.effectReceipts[0].result.destroyed, true);
  const survivor = await fixture('Morr', [undead('tough', { hp: 30 })]);
  await cast(survivor, ANNIHILATE, input(['tough'], { damageRoll: 3 }));
  assert.equal(person(survivor, 'tough').extensions.v5.cannotRaiseUndead, undefined);
});

test('Feu de l’âme : +1 par DR seulement contre les serviteurs de la Ruine, Enflammé sur Démon et mort-vivant', async () => {
  const store = await fixture('Sigmar', [fighter('ruin'), fighter('plain'), fighter('daemon', { traits: ['Démon'] }), undead('dead')]);
  const ids = ['ruin', 'plain', 'daemon', 'dead'];
  const request = input(ids, { damageRoll: 5 }, { ruin: { ruinServant: true }, plain: { ruinServant: false }, daemon: {}, dead: {} });
  const { result } = await cast(store, SOULFIRE, request);
  assert.equal(person(store, 'ruin').hp, 20 - 7, '5 + 2 DR');
  assert.equal(person(store, 'plain').hp, 20 - 5, 'aucun bonus');
  assert.equal(person(store, 'daemon').hp, 20 - 7, 'Démon : ennemi établi par le trait');
  assert.equal(person(store, 'dead').hp, 20 - 7);
  assert.deepEqual(person(store, 'ruin').states, []);
  assert.deepEqual(person(store, 'plain').states, []);
  assert.deepEqual(person(store, 'daemon').states.map(row => row.key), ['enflamme']);
  assert.deepEqual(person(store, 'dead').states.map(row => row.key), ['enflamme']);
  assert.deepEqual(result.receipt.effectReceipts.find(row => row.targetId === 'dead').result.conditions, ['Enflammé']);
});

test('Feu de l’âme : le statut de serviteur de la Ruine est demandé tant qu’il n’est pas établi, un allié coché est signalé', async () => {
  const store = await fixture('Sigmar', [fighter('unknown')]);
  const missing = store.previewDivineExecution(SOULFIRE, input(['unknown'], { damageRoll: 5 }));
  assert.equal(missing.ready, false);
  assert.ok(missing.needsInput.some(row => row.field === 'facts.targets.unknown.ruinServant'));
  const { result } = await cast(store, SOULFIRE, input(['unknown'], { damageRoll: 5 }, { unknown: { ruinServant: false, ally: true } }));
  assert.match(result.receipt.effectReceipts[0].result.warning, /Allié/);
});

test('Comète à Deux Queues : 1d10 plus les DR et Enflammé pour toute cible touchée', async () => {
  const store = await fixture('Sigmar', [fighter('a'), fighter('b')]);
  await cast(store, COMET, input(['a', 'b'], { damageRoll: 7, roll: 25 }, { a: { foe: true }, b: { foe: true } }));
  assert.deepEqual([person(store, 'a').hp, person(store, 'b').hp], [20 - 11, 20 - 11], '7 + 4 DR');
  assert.deepEqual(person(store, 'a').states.map(row => row.key), ['enflamme']);
  assert.deepEqual(person(store, 'b').states.map(row => row.key), ['enflamme']);
});

test('Haine sacrée : +2 Blessures si le prêtre a le talent, rien sans lui', async () => {
  const judged = { target: { judgement: true } };
  const without = await fixture('Ulric', [fighter('target')]);
  await cast(without, JUDGEMENT, input(['target'], { damageRoll: 4 }, judged));
  assert.equal(person(without, 'target').hp, 20 - 6, '4 + 2 DR');
  const withTalent = await fixture('Ulric', [fighter('target')], { talents: [...cultTalents('Ulric'), { id: 'talent-holy-hatred', status: 'resolved', rank: 1 }] });
  const { result } = await cast(withTalent, JUDGEMENT, input(['target'], { damageRoll: 4 }, judged));
  assert.equal(person(withTalent, 'target').hp, 20 - 8, '4 + 2 DR + 2 Haine sacrée');
  assert.equal(result.receipt.effectReceipts[0].result.bonuses.holyHatred, 2);
});

test('Jugement du Roi de la neige : le verdict MJ est requis ; refusé, la cible est épargnée et le prêtre subit l’effet', async () => {
  const store = await fixture('Ulric', [fighter('target')]);
  const missing = store.previewDivineExecution(JUDGEMENT, input(['target'], { damageRoll: 4 }));
  assert.equal(missing.ready, false);
  assert.ok(missing.needsInput.some(row => row.field === 'facts.targets.target.judgement'));
  await cast(store, JUDGEMENT, input(['target'], { damageRoll: 4 }, { target: { judgement: false } }));
  assert.equal(person(store, 'target').hp, 20);
  assert.equal(person(store, 'priest').hp, 20 - 6, 'même jet 4 + 2 DR sur le prêtre');
});

test('Caresse de Rhya : soigne le Bonus de Sociabilité, un soin de plus par tranche de +2 DR', async () => {
  const hurt = () => fighter('patient', { hp: 5, maxHp: 40 });
  const base = await fixture('Rhya', [hurt()]);
  const { result } = await cast(base, TOUCH, input(['patient']));
  assert.equal(person(base, 'patient').hp, 11, 'BSoc 6');
  assert.equal(result.receipt.effectReceipts[0].result.amount, 6);
  const extended = await fixture('Rhya', [hurt()]);
  await cast(extended, TOUCH, input(['patient'], { choices: { range: 0, targets: 0, duration: 0, effect: 1 } }));
  assert.equal(person(extended, 'patient').hp, 17, 'deux soins de 6');
  const partial = await fixture('Rhya', [hurt()]);
  await cast(partial, TOUCH, input(['patient'], { choices: { range: 0, targets: 0, duration: 0, effect: 1 }, healCount: 1 }));
  assert.equal(person(partial, 'patient').hp, 11, 'un soin retenu, l’autre effet consacré à une maladie');
  const tooMany = await fixture('Rhya', [hurt()]);
  const refused = tooMany.previewDivineExecution(TOUCH, input(['patient'], { choices: { range: 0, targets: 0, duration: 0, effect: 2 } }));
  assert.equal(refused.ready, false, 'un seul palier de +2 DR disponible');
  const big = await fixture('Rhya', [hurt()], { caracs: { ...priest('Rhya').caracs, Soc: 75 } });
  await cast(big, TOUCH, input(['patient']));
  assert.equal(person(big, 'patient').hp, 12, 'BSoc 7');
});

test('Undo, Redo et rechargement restituent les Blessures, l’Élan et l’état détruit ; un aperçu altéré est refusé', async () => {
  const store = await fixture('Morr', [undead('ghoul', { hp: 5, extensions: { v5: { hasMomentum: true } } })]);
  const preview = store.previewDivineExecution(ANNIHILATE, input(['ghoul'], { damageRoll: 10 }));
  assert.equal(preview.ready, true, preview.error);
  const forged = { ...clone(preview), input: { ...clone(preview.input), damageRoll: 1 } };
  await assert.rejects(store.applyDivineExecution(ANNIHILATE, { preview: forged }), /aperçu a été modifié/);
  assert.equal(person(store, 'ghoul').hp, 5, 'aucune mutation');
  const before = stateOf(store);
  await store.applyDivineExecution(ANNIHILATE, { preview });
  assert.equal(person(store, 'ghoul').hp, 0);
  assert.equal(person(store, 'ghoul').extensions.v5.hasMomentum, false, 'perte d’Élan de la cible');
  const after = stateOf(store);
  const reloaded = createStore({ persistence: memory(), storage: null }); await reloaded.ready;
  await reloaded.loadFromJSON(after);
  assert.equal(person(reloaded, 'ghoul').hp, 0);
  assert.equal(person(reloaded, 'ghoul').extensions.v5.cannotRaiseUndead, true);
  await store.undo();
  assert.equal(person(store, 'ghoul').hp, 5);
  assert.equal(person(store, 'ghoul').extensions.v5.hasMomentum, true);
  assert.equal(person(store, 'ghoul').extensions.v5.cannotRaiseUndead, undefined);
  assert.deepEqual(stateOf(store).combat.participants, before.combat.participants);
  await store.redo();
  assert.equal(person(store, 'ghoul').hp, 0);
  assert.equal(person(store, 'ghoul').extensions.v5.cannotRaiseUndead, true);
});

test('reçu et journal contiennent les dés, les DR et l’effet par cible', async () => {
  const store = await fixture('Morr', [undead('a'), undead('b')]);
  const { result } = await cast(store, ANNIHILATE, input(['a', 'b'], { damageRoll: 6, damageRolls: { b: 3 } }));
  const [first, second] = result.receipt.effectReceipts;
  assert.deepEqual([first.result.die, first.result.DR, first.result.woundsLost, first.result.hpAfter], [6, 2, 8, 12]);
  assert.deepEqual([second.result.die, second.result.DR, second.result.woundsLost, second.result.hpAfter], [3, 2, 5, 15]);
  const lines = stateOf(store).log.map(row => row.text);
  assert.ok(lines.some(text => /a perd 8 Blessure\(s\) \(1d10 = 6, 2 DR\)/.test(text)), lines.join('\n'));
  assert.ok(lines.some(text => /b perd 5 Blessure\(s\) \(1d10 = 3, 2 DR\)/.test(text)), lines.join('\n'));
});
