import test, { after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { validateEffect, effectNeeds, effectHandlers } from '../../../js/core/v5-divine-effect-handlers.js';
import { recoverV5Condition } from '../../../js/core/v5-effects.js';
import registry from '../../../js/data/v5-divine-contracts.json' with { type: 'json' };
import { buildDivineForm, emptyDivineForm } from '../../../js/ui/v5-divine-form-model.js';
import { magicWeaponNature } from '../../../js/core/v5-magic-combat.js';

const clone = value => structuredClone(value);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };

describe('P4a — États et conditions', () => {
// P4a T3 : retrait d'États, verrous divins, États de fin d'effet, force d'État, Chance temporaire.
const SUCCOUR = 'divine:miracle:rhya:rhya-s-succour';
const MORR = 'divine:miracle:morr:stay-morr-s-hand';
const VERENA = 'divine:miracle:verena:shackles-of-truth';
const TAAL = 'divine:miracle:taal:tanglefoot';
const BEACON = 'divine:miracle:sigmar:beacon-of-righteous-virtue';
const DROWNED = 'divine:miracle:manann:drowned-man-s-face';
const CHEAT = 'divine:miracle:ranald:cheat-the-odds';
const cults = ['Rhya', 'Morr', 'Verena', 'Taal', 'Sigmar', 'Manann', 'Ranald'];

const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: cults.flatMap(cult => [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult }]),
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
async function fixture({ ally = {}, priest = {} } = {}) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [actor('priest', priest), actor('ally', { initiative: 30, ...ally })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const layers = (store, id) => person(store, id).extensions.v5.divineEffects || [];
const stateOf = (store, id, key) => person(store, id).states.find(row => row.key === key);
const input = (more = {}) => ({ actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  facts: { targets: { ally: { withinRange: true } } }, ...more });
const facts = ally => ({ facts: { targets: { ally: { withinRange: true, ...ally } } } });
const expiry = { phase: 'endOfTurn', round: 6, actorId: 'priest' };
async function cast(store, id, more = {}) {
  const preview = store.previewDivineExecution(id, input(more));
  assert.equal(preview.ready, true, preview.error + JSON.stringify(preview.needsInput));
  const result = await store.applyDivineExecution(id, { preview });
  assert.equal(result.ready, true, result.error);
  return { preview, result };
}
const turns = async (store, count) => { for (let i = 0; i < count; i++) await store.nextTurn(); };

test('Secours de Rhya : retire une instance choisie par le MJ, sans bonus tant qu’il reste un État', async () => {
  const store = await fixture({ ally: { states: [{ name: 'Aveuglé', level: 1 }, { name: 'Assourdi', level: 2 }] } });
  const deaf = stateOf(store, 'ally', 'assourdi');
  const missing = store.previewDivineExecution(SUCCOUR, input());
  assert.equal(missing.ready, false);
  assert.ok(missing.needsInput.some(row => row.field === 'removals.ally.stateId'), JSON.stringify(missing.needsInput));
  const { result } = await cast(store, SUCCOUR, { removals: { ally: { stateId: deaf.id } } });
  assert.equal(stateOf(store, 'ally', 'assourdi').level, 1, 'une seule occurrence retirée');
  assert.ok(stateOf(store, 'ally', 'aveugle'));
  assert.equal(layers(store, 'ally').length, 0, 'aucune couche de repos : il reste des États');
  assert.deepEqual(result.receipt.effectReceipts[0].result.removed, [{ id: deaf.id, key: 'assourdi', level: 1 }]);
});

test('Secours de Rhya : dernier État retiré, +1 DR jusqu’à la fin du prochain Tour de la cible, puis Undo', async () => {
  const store = await fixture({ ally: { states: [{ name: 'Aveuglé', level: 1 }] } });
  const blind = stateOf(store, 'ally', 'aveugle');
  const before = JSON.stringify(person(store, 'ally'));
  const { result } = await cast(store, SUCCOUR, { removals: { ally: { stateId: blind.id } } });
  assert.deepEqual(person(store, 'ally').states, []);
  const [layer] = layers(store, 'ally');
  assert.deepEqual(layer.expiry, { phase: 'endOfTurn', round: 1, actorId: 'ally', moment: 'afterEffects' }, 'l’allié joue après le prêtre : même Round');
  assert.equal(person(store, 'ally').extensions.v5.testModifiers.all, 1);
  assert.equal(result.receipt.effectReceipts[0].result.rested.layerId, layer.id);
  await turns(store, 1);
  assert.equal(layers(store, 'ally').length, 1, 'le Tour de l’allié n’est pas terminé');
  await turns(store, 1);
  assert.equal(layers(store, 'ally').length, 0, 'fin de son Tour');
  assert.equal(person(store, 'ally').extensions.v5.testModifiers?.all ?? 0, 0);
  await store.undo(); await store.undo(); await store.undo();
  assert.equal(JSON.stringify(person(store, 'ally')), before, 'Undo restitue l’État et retire la couche');
});

test('Secours de Rhya : le prêtre se ciblant lui-même obtient le bonus au Round suivant', async () => {
  const store = await fixture({ priest: { states: [{ name: 'Aveuglé', level: 1 }] } });
  const blind = stateOf(store, 'priest', 'aveugle');
  await cast(store, SUCCOUR, { targetIds: ['priest'], facts: { targets: { priest: { withinRange: true } } }, removals: { priest: { stateId: blind.id } } });
  assert.equal(layers(store, 'priest')[0].expiry.round, 2);
  assert.equal(layers(store, 'priest')[0].expiry.actorId, 'priest');
});

test('État verrouillé non retirable, État non verrouillé retirable (Main de Morr, Inconscient pour des heures)', async () => {
  const store = await fixture({ ally: { hp: 0, states: [{ name: 'Aveuglé', level: 1 }] } });
  const morr = await cast(store, MORR, { ...facts({ withinTouch: true, zeroWounds: true, consenting: true }), expiry });
  const locked = stateOf(store, 'ally', 'inconscient');
  assert.equal(locked.divineLock, true);
  const [layer] = layers(store, 'ally');
  assert.deepEqual(layer.deadline, { kind: 'campaign-time', atSeconds: 6 * 3600 }, 'Bonus de Sociabilité en heures');
  assert.equal(layer.expiry, null);
  // Le retrait ordinaire échoue tant que la couche est active.
  await store.recoverCondition('ally', 'inconscient', { method: 'cause-ended', causeEnded: true });
  assert.ok(stateOf(store, 'ally', 'inconscient'), 'verrou divin respecté');
  // Un Secours de Rhya ne peut pas non plus le choisir.
  const refused = store.previewDivineExecution(SUCCOUR, input({ removals: { ally: { stateId: locked.id } } }));
  assert.equal(refused.ready, false);
  assert.ok(refused.needsInput.some(row => /verrouillé/.test(row.label)), JSON.stringify(refused.needsInput));
  // L'État voisin, sans verrou, se retire.
  const blind = stateOf(store, 'ally', 'aveugle');
  await cast(store, SUCCOUR, { removals: { ally: { stateId: blind.id } } });
  assert.equal(stateOf(store, 'ally', 'aveugle'), undefined);
  assert.ok(stateOf(store, 'ally', 'inconscient'));
  // Fin de la prière par le MJ : couche et État partent ensemble, Undo les restitue.
  await store.endDivinePrayer(morr.result.executionId, { reason: 'Derniers rites accomplis' });
  assert.equal(stateOf(store, 'ally', 'inconscient'), undefined);
  assert.ok(!layers(store, 'ally').some(row => row.executionId === morr.result.executionId));
  await store.undo();
  assert.ok(stateOf(store, 'ally', 'inconscient'));
  assert.equal(stateOf(store, 'ally', 'inconscient').divineLock, true);
});

test('Main de Morr : l’État verrouillé survit à un rechargement et part à l’échéance calendaire', async () => {
  const store = await fixture({ ally: { hp: 0 } });
  await cast(store, MORR, { ...facts({ withinTouch: true, zeroWounds: true, consenting: true }) });
  const reloaded = createStore({ persistence: memory(), storage: null }); await reloaded.ready;
  await reloaded.loadFromJSON(JSON.parse(store.getFullJSON()));
  assert.equal(stateOf(reloaded, 'ally', 'inconscient').divineLock, true);
  assert.equal(layers(reloaded, 'ally').length, 1);
  await store.advanceCampaignTime({ seconds: 6 * 3600 - 1, reason: 'Presque six heures' });
  assert.ok(stateOf(store, 'ally', 'inconscient'));
  await store.advanceCampaignTime({ seconds: 1, reason: 'Six heures' });
  assert.equal(stateOf(store, 'ally', 'inconscient'), undefined);
});

test('Main de Morr : faits de cible exigés (0 Blessure, consentante, Contact)', async () => {
  const store = await fixture({ ally: { hp: 0 } });
  const preview = store.previewDivineExecution(MORR, input(facts({ withinTouch: true, zeroWounds: true })));
  assert.equal(preview.ready, false);
  assert.deepEqual(preview.needsInput.map(row => row.field), ['facts.targets.ally.consenting']);
  const refused = store.previewDivineExecution(MORR, input(facts({ withinTouch: true, consenting: true, zeroWounds: false })));
  assert.equal(refused.ready, false);
});

test('Entraves à la vérité : Enchevêtré niveau 1 non récupérable pendant la durée, faits crime et dénégation', async () => {
  const store = await fixture();
  const missing = store.previewDivineExecution(VERENA, input({ ...facts({ criminal: true }), expiry }));
  assert.equal(missing.ready, false);
  assert.ok(missing.needsInput.some(row => row.field === 'facts.targets.ally.deniesCrime'), JSON.stringify(missing.needsInput));
  const innocent = store.previewDivineExecution(VERENA, input({ ...facts({ criminal: false, deniesCrime: true }), expiry }));
  assert.equal(innocent.ready, false, 'aucune entrave sans crime');
  await cast(store, VERENA, { ...facts({ criminal: true, deniesCrime: true }), expiry });
  const entangled = stateOf(store, 'ally', 'enchevetre');
  assert.equal(entangled.level, 1);
  assert.equal(entangled.divineLock, true);
  await store.recoverCondition('ally', 'enchevetre', { method: 'opposed-strength', test: { success: true, sl: 4 } });
  assert.ok(stateOf(store, 'ally', 'enchevetre'), 'le Test de Force ne le retire pas pendant la durée');
  await turns(store, 12);
  assert.equal(stateOf(store, 'ally', 'enchevetre'), undefined, 'fin de la durée');
  assert.equal(layers(store, 'ally').length, 0);
});

test('Enchevêtrement : Enchevêtré niveau 1 dont la Force (Sociabilité) est portée par la source, avec rappel', async () => {
  const store = await fixture();
  const { result } = await cast(store, TAAL);
  const state = stateOf(store, 'ally', 'enchevetre');
  assert.equal(state.level, 1, 'la Force n’est pas un nombre d’instances');
  assert.equal(state.source.strength, 60, 'Sociabilité entière du prêtre');
  assert.equal(state.divineLock, undefined);
  const row = result.receipt.effectReceipts.find(entry => entry.result?.strength);
  assert.equal(row.result.strength, 60);
  assert.match(row.result.reminder, /Force 60/);
  // Sans verrou, le retrait ordinaire reste possible (Test de Force opposé réussi).
  await store.recoverCondition('ally', 'enchevetre', { method: 'opposed-strength', test: { success: true, sl: 2 } });
  assert.equal(stateOf(store, 'ally', 'enchevetre'), undefined);
});

test('Flambeau de Vertu : tous les États Brisé des alliés choisis sont retirés, les autres États restent', async () => {
  const store = await fixture({ ally: { states: [{ name: 'Brisé', level: 2 }, { name: 'Aveuglé', level: 1 }] } });
  const preview = store.previewDivineExecution(BEACON, input({ facts: { targets: { ally: { ally: true } } } }));
  assert.equal(preview.ready, false);
  assert.ok(preview.needsInput.some(row => row.field === 'facts.targets.ally.seesPriest'));
  const { result } = await cast(store, BEACON, { expiry, facts: { targets: { ally: { ally: true, seesPriest: true } } } });
  assert.equal(stateOf(store, 'ally', 'brise'), undefined);
  assert.ok(stateOf(store, 'ally', 'aveugle'));
  assert.equal(result.receipt.effectReceipts[0].result.removed.reduce((sum, row) => sum + row.level, 0), 2);
  assert.ok(result.receipt.reminders.some(text => /Fearless|Peur/.test(text)), 'le reste du miracle reste en rappel');
});

test('Visage de l’homme noyé : Exténué pendant la durée, puis Sonné niveau 1 pendant 1 Round', async () => {
  const store = await fixture();
  await cast(store, DROWNED, { expiry });
  assert.ok(stateOf(store, 'ally', 'extenue'));
  assert.equal(layers(store, 'ally').length, 2);
  await turns(store, 11);
  assert.equal(stateOf(store, 'ally', 'extenue'), undefined, 'fin de la durée');
  const stunned = stateOf(store, 'ally', 'sonne');
  assert.equal(stunned.level, 1);
  assert.deepEqual(layers(store, 'ally').map(row => row.expiry), [{ phase: 'endOfRound', round: 7, moment: 'afterEffects' }]);
  await turns(store, 2);
  assert.ok(stateOf(store, 'ally', 'sonne'), 'encore là jusqu’à la fin du Round 7');
  await turns(store, 1);
  assert.equal(stateOf(store, 'ally', 'sonne'), undefined, 'Sonné part à la fin du Round suivant');
  assert.equal(layers(store, 'ally').length, 0);
});

test('Que la chance persiste : première invocation libre malgré la Chance permanente ; sans plafond, dépensée avant la permanente, réinvocation refusée', async () => {
  const store = await fixture();
  await store.setFortune('priest', 2);
  const { preview } = await cast(store, CHEAT, { targetIds: [], roll: 25 });
  const points = 1 + Math.floor(preview.preview.prayer.sl / 2);
  assert.ok(points >= 3);
  const [layer] = layers(store, 'priest');
  assert.equal(layer.remainingTempFortune, points);
  assert.equal(layer.expiry, null);
  assert.equal(store.getFortune('priest').temporary, points);
  assert.equal(store.getFortune('priest').permanent, 2);
  assert.equal(store.getFortune('priest').balance, 2 + points, 'aucun plafond');
  await store.consumeTemporaryFortune('priest', 1);
  assert.equal(store.getFortune('priest').temporary, points - 1);
  assert.equal(store.getFortune('priest').permanent, 2, 'la Chance permanente n’est pas touchée');
  await store.undo();
  assert.equal(store.getFortune('priest').temporary, points, 'Undo restitue le point dépensé');
  await turns(store, 12);
  assert.equal(layers(store, 'priest').length, 1, 'aucune échéance : seule la fin de prière par le MJ retire les points');
});

test('Que la chance persiste : réinvocation refusée tant que le total de Chance dépasse 0', async () => {
  const store = await fixture();
  await store.setFortune('priest', 2);
  const { result } = await cast(store, CHEAT, { targetIds: [] });
  await store.endDivinePrayer(result.executionId, { reason: 'Fin de session' });
  assert.equal(store.getFortune('priest').temporary, 0);
  const blocked = store.previewDivineExecution(CHEAT, input({ targetIds: [] }));
  assert.equal(blocked.ready, false);
  assert.match(blocked.error, /Chance/, 'la Chance permanente restante suffit à refuser');
  await store.setFortune('priest', 0);
  const again = store.previewDivineExecution(CHEAT, input({ targetIds: [] }));
  assert.equal(again.ready, true, again.error);
});

test('contrats et validation : remove-condition, expiry-condition, temporary-fortune', () => {
  for (const id of [SUCCOUR, MORR, VERENA, TAAL, BEACON, DROWNED, CHEAT]) assert.equal(getDivineContract(id).status, 'assisted', id);
  assert.match(validateEffect({ type: 'remove-condition' }), /key ou chosen/);
  assert.match(validateEffect({ type: 'remove-condition', key: 'brise', chosen: true }), /key ou chosen/);
  assert.match(validateEffect({ type: 'remove-condition', key: 'brise', amount: 0 }), /amount/);
  assert.equal(validateEffect({ type: 'remove-condition', key: 'brise', amount: 'all' }), null);
  assert.match(validateEffect({ type: 'expiry-condition', conditions: [{ key: 'Stunned' }] }), /rounds/);
  assert.match(validateEffect({ type: 'temporary-fortune', count: 0 }), /count/);
});

test('recoverV5Condition : le verrou divin ne vaut que tant que sa couche est active', () => {
  const locked = { id: 'p', states: [{ id: 's', key: 'enchevetre', name: 'Enchevêtré', level: 1, divineLock: true, divineEffectId: 'layer' }], extensions: { v5: { divineEffects: [{ id: 'layer' }] } } };
  const method = { method: 'divine-removal' };
  assert.equal(recoverV5Condition(locked, 's', method).removed.length, 0);
  assert.equal(recoverV5Condition(locked, 's', { method: 'fortune' }).removed.length, 0);
  const free = clone(locked); free.extensions.v5.divineEffects = [];
  assert.equal(recoverV5Condition(free, 's', method).removed.length, 1);
});
});

describe('P4a — dégâts directs', () => {
// P4a T2 : dégâts directs en Blessures (Anéantir, Feu de l'âme, Comète, Jugement) et soin en formule (Caresse de Rhya).
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
    assert.ok(['assisted', 'implemented'].includes(contract.status), id);
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
});

describe('P4b — conditions (contrats génériques)', () => {
// P4b T3 : effet `condition` conditionné par un fait de cible (when), contrats d'essai sur le modèle de p4a-gear.
const MASK = getAllDivineContracts().find(row => row.type === 'miracle' && row.name === 'Masque mortuaire').id;
const { schemaVersion: _s, sourceFingerprint: _f, ...base } = getDivineContract(MASK);
const registered = [];
const ROUNDS = { value: 6, unit: 'rounds' };
const WHEN = { fact: 'testFailed', label: 'a échoué à son Test d’Athlétisme' };
function synthetic(key, effects, { duration = { kind: 'fixed', value: 6, unit: 'rounds' }, targets = { kind: 'count', value: 3, unit: 'targets' } } = {}) {
  const id = `divine:miracle:morr:test-conditions-${key}`;
  const contract = { ...clone(base), id, name: `Essai ${key}`, catalogueName: `Essai ${key}`, canonicalName: `Test conditions ${key}`, status: 'assisted',
    params: { range: { kind: 'special' }, targets, duration },
    effects, targetRules: [], clauses: [{ id: 'effect', mode: 'engine', text: 'Effet moteur.', sourceRef: 'test' }], needsInput: [] };
  registry.contracts.push(contract); registered.push(id);
  return id;
}
after(() => { registry.contracts = registry.contracts.filter(row => !registered.includes(row.id)); });
const prone = (extra = {}) => ({ type: 'condition', key: 'Prone', level: 1, when: WHEN, duration: ROUNDS, ...extra });
const PRONE = synthetic('prone', [prone()]);
const LOCKED = synthetic('locked', [{ type: 'condition', key: 'Unconscious', level: 1, when: WHEN, lockConditions: true, duration: ROUNDS }]);
const TWO = synthetic('two', [prone(), { type: 'condition', key: 'Stunned', level: 1, when: { fact: 'willFailed', label: 'a échoué à son Test de Volonté' }, duration: ROUNDS }]);
const CASTER = synthetic('caster', [prone({ appliesTo: 'caster' })], { targets: { kind: 'self' } });

const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Morr' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Morr' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
async function fixture() {
  const persistence = memory();
  const store = createStore({ persistence, storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
    participants: [actor('priest'), actor('ally', { initiative: 30 }), actor('foe', { initiative: 20, camp: 'ennemi', kind: 'PNJ' })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  store.persistence = persistence;
  return store;
}
const facts = (targets = {}) => ({ facts: { targets } });
const input = (more = {}) => ({ actorId: 'priest', targetIds: ['ally', 'foe'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, ...more });
async function cast(store, contractId, more) {
  const preview = store.previewDivineExecution(contractId, input(more));
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}
const layers = (store, id) => person(store, id).extensions.v5.divineEffects || [];
const proneState = (store, id) => person(store, id).states.find(row => /terre|prone/i.test(`${row.key} ${row.name}`));
const toRoundEnd = async store => { for (let i = 0; i < 21; i++) await store.nextTurn(); };

test('validation : when exige un fait identifiable et un libellé', () => {
  assert.equal(validateEffect(prone()), null);
  for (const when of [{ label: 'x' }, { fact: 'a b', label: 'x' }, { fact: 'ok' }, { fact: 'ok', label: '  ' }, 'texte'])
    assert.match(validateEffect({ type: 'condition', key: 'Prone', when }), /when/);
  assert.equal(validateEffect({ type: 'condition', key: 'Prone' }), null);
});

test('needs : fait absent par cible (vrai et faux le satisfont), faits des autres effets non concernés', () => {
  const targets = [{ id: 'ally', name: 'Ally' }, { id: 'foe', name: 'Foe' }];
  assert.deepEqual(effectNeeds(prone(), { targets, input: {} }).map(row => row.field), ['facts.targets.ally.testFailed', 'facts.targets.foe.testFailed']);
  assert.deepEqual(effectNeeds(prone(), { targets, input: facts({ ally: { testFailed: true } }) }).map(row => row.field), ['facts.targets.foe.testFailed']);
  assert.deepEqual(effectNeeds(prone(), { targets, input: facts({ ally: { testFailed: true }, foe: { testFailed: false } }) }), []);
  assert.equal(effectNeeds(prone(), { targets, input: facts({ ally: { testFailed: 'oui' } }) }).length, 2, 'seul un booléen vaut réponse');
  assert.deepEqual(effectNeeds({ type: 'condition', key: 'Prone' }, { targets, input: {} }), []);
});

test('factFields : le fait est déclaré, requis, avec libellé en majuscule initiale', () => {
  const [field] = effectHandlers.condition.factFields(prone());
  assert.deepEqual({ field: field.field, required: field.required, label: field.label }, { field: 'testFailed', required: true, label: 'A échoué à son Test d’Athlétisme' });
  assert.deepEqual(effectHandlers.condition.factFields({ type: 'condition', key: 'Prone' }), []);
  const contract = getDivineContract(PRONE), form = buildDivineForm(contract, { actor: actor('priest'), targets: [actor('ally'), actor('foe')], form: emptyDivineForm(contract) });
  for (const id of ['ally', 'foe']) assert.ok(form.factFields[id].some(row => row.field === 'testFailed'), id);
});

test('absent : l’aperçu est bloqué et nomme le fait de chaque cible', async () => {
  const store = await fixture();
  const preview = store.previewDivineExecution(PRONE, input(facts({ ally: { testFailed: true } })));
  assert.equal(preview.ready, false);
  assert.ok(preview.needsInput.some(row => row.field === 'facts.targets.foe.testFailed'), JSON.stringify(preview.needsInput));
  assert.ok(!preview.needsInput.some(row => row.field === 'facts.targets.ally.testFailed'));
});

test('vrai pose l’État, faux ignore la cible : ni État, ni couche, ni identifiant appliqué', async () => {
  const store = await fixture();
  const result = await cast(store, PRONE, facts({ ally: { testFailed: true }, foe: { testFailed: false } }));
  assert.ok(proneState(store, 'ally'));
  assert.equal(proneState(store, 'foe'), undefined);
  assert.equal(layers(store, 'ally').length, 1);
  assert.equal(layers(store, 'foe').length, 0);
  assert.equal(result.receipt.appliedEffectIds.length, 1);
  assert.match(result.receipt.appliedEffectIds[0], /:ally:/);
});

test('fait par cible dans un groupe : chaque cible suit son propre fait', async () => {
  const store = await fixture();
  await cast(store, PRONE, facts({ ally: { testFailed: false }, foe: { testFailed: true } }));
  assert.equal(proneState(store, 'ally'), undefined);
  assert.ok(proneState(store, 'foe'));
  const second = await fixture();
  await cast(second, PRONE, facts({ ally: { testFailed: true }, foe: { testFailed: true } }));
  assert.ok(proneState(second, 'ally') && proneState(second, 'foe'));
});

test('deux États conditionnés indépendants : un fait vrai, l’autre faux', async () => {
  const store = await fixture();
  await cast(store, TWO, facts({ ally: { testFailed: true, willFailed: false }, foe: { testFailed: false, willFailed: true } }));
  assert.deepEqual(person(store, 'ally').states.map(row => row.key).filter(key => !/terre|prone/i.test(key)), []);
  assert.ok(proneState(store, 'ally'));
  assert.equal(proneState(store, 'foe'), undefined);
  assert.equal(person(store, 'foe').states.length, 1);
});

test('fin de la couche : l’État conditionné est retiré, celui de la cible ignorée n’existe pas', async () => {
  const store = await fixture();
  await cast(store, PRONE, facts({ ally: { testFailed: true }, foe: { testFailed: false } }));
  const [layer] = layers(store, 'ally');
  assert.deepEqual(layer.conditionStateIds.length, 1);
  await toRoundEnd(store);
  assert.equal(proneState(store, 'ally'), undefined);
  assert.equal(layers(store, 'ally').length, 0);
  assert.equal(person(store, 'foe').states.length, 0);
});

test('Undo de l’application : aucun État ni couche ne subsiste', async () => {
  const store = await fixture();
  await cast(store, PRONE, facts({ ally: { testFailed: true }, foe: { testFailed: true } }));
  await store.undo();
  for (const id of ['ally', 'foe']) { assert.equal(proneState(store, id), undefined); assert.equal(layers(store, id).length, 0); }
});

test('fin par le MJ : l’État conditionné est retiré', async () => {
  const store = await fixture();
  const result = await cast(store, PRONE, facts({ ally: { testFailed: true }, foe: { testFailed: false } }));
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'Fin décidée par le MJ' });
  assert.equal(proneState(store, 'ally'), undefined);
});

test('verrou divineLock conservé sur l’État conditionné (lockConditions)', async () => {
  const store = await fixture();
  await cast(store, LOCKED, facts({ ally: { testFailed: true }, foe: { testFailed: false } }));
  const state = person(store, 'ally').states.find(row => /inconscient|unconscious/i.test(`${row.key} ${row.name}`));
  assert.equal(state?.divineLock, true);
  assert.equal(person(store, 'foe').states.length, 0);
});

test('appliesTo caster : le fait est lu sur le prêtre', async () => {
  const store = await fixture();
  const blocked = store.previewDivineExecution(CASTER, input({ targetIds: [], ...facts({ ally: { testFailed: true } }) }));
  assert.equal(blocked.ready, false);
  assert.ok(blocked.needsInput.some(row => row.field === 'facts.targets.priest.testFailed'), JSON.stringify(blocked.needsInput));
  await cast(store, CASTER, { targetIds: [], ...facts({ priest: { testFailed: true } }) });
  assert.ok(proneState(store, 'priest'));
});

test('un effet condition sans when reste inchangé (aucun fait exigé)', async () => {
  const id = synthetic('plain', [{ type: 'condition', key: 'Prone', level: 1, duration: ROUNDS }]);
  const store = await fixture();
  await cast(store, id);
  assert.ok(proneState(store, 'ally') && proneState(store, 'foe'));
});
});

describe('P4b — conditions (miracles réels)', () => {
// P4b T3 contre les VRAIS contrats générés : États conditionnés par un fait de cible (Tremblement de terre, Vent sauvage,
// Tempête de glace, Mer déchaînée) et arme magique de l'Épée de justice. À exécuter après régénération des contrats.
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
  await run(store, STORM, 'willpowerFailed', { ally: false, foe: true }, { locationChoices: { ally: 'body', foe: 'body' } });
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
});

describe('P4b — dégâts (contrats génériques)', () => {
// P4b T2 : dégâts ordinaires (BE et PA), Blessures fixes, filtres de cible, effet miroir sur le prêtre, Haine sacrée.
const ANNIHILATE = 'divine:miracle:morr:destroy-undead';
const { schemaVersion: _s, sourceFingerprint: _f, ...base } = getDivineContract(ANNIHILATE);
const registered = [];
// Contrat d'essai : copie d'Anéantir les morts-vivants (instantané, zone), seuls les effets changent.
function synthetic(key, effects) {
  const id = `divine:miracle:morr:test-damage-${key}`;
  registry.contracts.push({ ...clone(base), id, name: `Essai ${key}`, catalogueName: `Essai ${key}`, canonicalName: `Test damage ${key}`, status: 'assisted',
    effects, targetRules: [], clauses: [{ id: 'effect', mode: 'engine', text: 'Effet moteur.', sourceRef: 'test' }], needsInput: [] });
  registered.push(id);
  return id;
}
after(() => { registry.contracts = registry.contracts.filter(row => !registered.includes(row.id)); });

const ORDINARY = synthetic('ordinary', [{ type: 'ordinary-damage', dice: { count: 1, sides: 10 }, bonusFrom: 'FM', ignoreAp: true }]);
const FIXED_ORDINARY = synthetic('fixed-ordinary', [{ type: 'ordinary-damage', fixed: 10 }]);
const MINIMUM = synthetic('minimum', [{ type: 'ordinary-damage', fixed: 1 }]);
const PER_LEVEL = synthetic('per-level', [{ type: 'direct-damage', fixed: 1, perSuccessLevel: 1, requiresFact: { field: 'humanoid', label: 'humanoïde touché (fait MJ)' } }]);
const FILTERED = synthetic('filtered', [{ type: 'direct-damage', dice: { count: 1, sides: 10 }, targetFilter: { traits: ['Mort-vivant', 'Démon'], fact: 'impure', label: 'impure (fait MJ)' } }]);
const JUDGED = synthetic('judged', [
  { type: 'direct-damage', dice: { count: 1, sides: 10 }, perSuccessLevel: 1, requiresFact: { field: 'judgement', onFalse: 'skip', label: 'verdict MJ' } },
  { type: 'direct-damage', dice: { count: 1, sides: 10 }, perSuccessLevel: 1, appliesTo: 'caster', casterWhen: { field: 'judgement', label: 'verdict MJ', value: false, match: 'any' } }]);
const BACKFIRE = synthetic('backfire', [
  { type: 'direct-damage', dice: { count: 1, sides: 10 }, perSuccessLevel: 1, conditions: [{ key: 'Ablaze', level: 1, when: 'always' }] },
  { type: 'direct-damage', dice: { count: 1, sides: 10 }, perSuccessLevel: 1, conditions: [{ key: 'Ablaze', level: 1, when: 'always' }], appliesTo: 'caster',
    casterWhen: { field: 'foe', label: 'ennemi (fait MJ)', value: true, match: 'none' } }]);

const person = (store, id) => store.listParticipants().find(row => row.id === id);
const stateOf = store => JSON.parse(store.getFullJSON());
const cultTalents = [{ id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Morr' }, { id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Morr' }];
const fighter = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'pnj', zone: 'active', initiative: 20, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 40, M: 4 },
  equipment: [], traits: [], states: [], talents: [], armor: { head: 3, body: 3, arms: 3, legs: 3 }, extensions: { v5: {} }, ...extra });
const priest = (extra = {}) => fighter('priest', { kind: 'PJ', camp: 'pj', initiative: 60, caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }], talents: cultTalents,
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  extensions: { v5: { divine: { sin: 0 } } }, ...extra });
async function fixture(others, priestExtra = {}) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', ...others.map(row => row.id)], participants: [priest(priestExtra), ...others] },
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
  return { preview, result };
}
const needsOf = (store, id, request) => store.previewDivineExecution(id, request).needsInput.map(row => row.field);
const talents = [...cultTalents, { id: 'talent-holy-hatred', status: 'resolved', rank: 1 }];

test('registre : ordinary-damage est déclaré et refuse un contrat mal formé', () => {
  assert.ok(effectHandlers['ordinary-damage']);
  assert.match(validateEffect({ type: 'ordinary-damage' }), /dice.*fixed/);
  assert.match(validateEffect({ type: 'ordinary-damage', fixed: 0 }), /fixed/);
  assert.match(validateEffect({ type: 'ordinary-damage', fixed: 5, bonusFrom: 'Vol' }), /bonusFrom/);
  assert.match(validateEffect({ type: 'ordinary-damage', fixed: 5, ignoreAp: 'oui' }), /booléens/);
  assert.match(validateEffect({ type: 'direct-damage', fixed: 5, ignoreAp: true }), /ordinary-damage/);
  assert.match(validateEffect({ type: 'direct-damage', dice: { count: 1, sides: 10 }, targetFilter: { fact: 'x' } }), /targetFilter/);
  assert.match(validateEffect({ type: 'direct-damage', fixed: 1, requiresFact: { field: 'a', label: 'b', onFalse: 'ignore' } }), /requiresFact/);
  assert.match(validateEffect({ type: 'direct-damage', fixed: 1, casterWhen: { field: 'a', label: 'b', value: true, match: 'any' } }), /casterWhen/);
  assert.equal(validateEffect({ type: 'direct-damage', fixed: 1, appliesTo: 'caster', casterWhen: { field: 'a', label: 'b', value: true, match: 'none' } }), null);
  assert.equal(validateEffect({ type: 'ordinary-damage', dice: { count: 1, sides: 10 }, bonusFrom: 'FM', ignoreAp: true }), null);
  assert.equal(validateEffect({ type: 'direct-damage', fixed: 1, perSuccessLevel: 1 }), null);
});

test('1d10 + Bonus de Volonté : PA ignorés, Bonus d’Endurance déduit', async () => {
  const store = await fixture([fighter('foe')]);
  const request = input(['foe'], { damageRoll: 6 });
  assert.deepEqual(needsOf(store, ORDINARY, input(['foe'])), ['damageRoll'], 'aucune localisation exigée : les PA sont ignorés');
  const { preview, result } = await cast(store, ORDINARY, request);
  assert.equal(preview.preview.effects[0].bonus, 5, 'Bonus de Volonté figé dans l’aperçu');
  assert.equal(person(store, 'foe').hp, 20 - (6 + 5 - 3), 'BE 3 déduit, PA 3 ignorés');
  const row = result.receipt.effectReceipts[0];
  assert.deepEqual([row.type, row.result.rawDamage, row.result.be, row.result.ap, row.result.woundsLost], ['ordinary-damage', 11, 3, 0, 8]);
  assert.match(row.log, /foe perd 8 Blessure\(s\) \(1d10 = 6, \+5 \(caractéristique\), BE 3, PA 0\)/);
  assert.equal(person(store, 'priest').hp, 20, 'le prêtre n’est pas touché');
});

test('dégâts ordinaires : minimum 1, Blessures perdues bornées par les Blessures restantes', async () => {
  const minimum = await fixture([fighter('foe', { armor: { head: 9, body: 9, arms: 9, legs: 9 } })]);
  await cast(minimum, MINIMUM, input(['foe'], { locationChoices: { foe: 'body' } }));
  assert.equal(person(minimum, 'foe').hp, 19, '1 − BE 3 − PA 9 : minimum 1');
  const low = await fixture([fighter('foe', { hp: 2 })]);
  const { result } = await cast(low, ORDINARY, input(['foe'], { damageRoll: 10 }));
  const row = result.receipt.effectReceipts[0].result;
  assert.deepEqual([row.wounds, row.woundsLost, row.hpAfter], [12, 2, 0], 'dégâts ≠ Blessures réellement perdues');
});

test('localisation : d100 propre à chaque cible (inversé) ou choix du MJ, PA de la Localisation déduits', async () => {
  const store = await fixture([fighter('a', { armor: { head: 1, body: 5, arms: 2, legs: 4 } }), fighter('b', { armor: { head: 1, body: 5, arms: 2, legs: 4 } }), fighter('c', { armor: { head: 1, body: 5, arms: 2, legs: 4 } })]);
  assert.deepEqual(needsOf(store, FIXED_ORDINARY, input(['a', 'b'])), ['locationRolls.a', 'locationRolls.b']);
  assert.deepEqual(needsOf(store, FIXED_ORDINARY, input(['a', 'b'], { locationRolls: { a: 10 }, locationChoices: { b: 'bogus' } })), ['locationRolls.b']);
  assert.deepEqual(needsOf(store, FIXED_ORDINARY, input(['a'], { locationRolls: { a: 101 } })), ['locationRolls.a']);
  const { result } = await cast(store, FIXED_ORDINARY, input(['a', 'b', 'c'], { locationRolls: { a: 10, b: 45 }, locationChoices: { c: 'leg' } }));
  const hp = id => person(store, id).hp;
  assert.equal(hp('a'), 20 - (10 - 3 - 1), 'd100 10 inversé en 01 : Tête, PA 1');
  assert.equal(hp('b'), 20 - (10 - 3 - 5), 'd100 45 inversé en 54 : Corps, PA 5');
  assert.equal(hp('c'), 20 - (10 - 3 - 4), 'choix MJ : Jambe, PA 4');
  assert.deepEqual(result.receipt.effectReceipts.map(row => row.result.ap), [1, 5, 4]);
});

test('Haine sacrée : +2 sur les Blessures réellement perdues, après BE et PA, jamais sur une cible déjà à 0', async () => {
  const plain = await fixture([fighter('foe')]);
  await cast(plain, ORDINARY, input(['foe'], { damageRoll: 6 }));
  assert.equal(person(plain, 'foe').hp, 12);
  const hateful = await fixture([fighter('foe'), fighter('dead', { hp: 0 })], { talents });
  const { result } = await cast(hateful, ORDINARY, input(['foe', 'dead'], { damageRoll: 6 }));
  assert.equal(person(hateful, 'foe').hp, 10, '(6 + 5 − BE 3) + 2');
  assert.equal(result.receipt.effectReceipts[0].result.bonuses.holyHatred, 2);
  const [, dead] = result.receipt.effectReceipts;
  assert.deepEqual([dead.result.woundsLost, dead.result.bonuses.holyHatred], [0, 0], 'aucune Blessure perdue : pas de bonus');
  const armoured = await fixture([fighter('foe', { armor: { head: 9, body: 9, arms: 9, legs: 9 } })], { talents });
  await cast(armoured, MINIMUM, input(['foe'], { locationChoices: { foe: 'body' } }));
  assert.equal(person(armoured, 'foe').hp, 20 - 1 - 2, 'minimum 1 perdue, puis +2');
});

test('direct-damage à valeur fixe : 1 Blessure + 1 par DR, sans dé, sur les cibles dont le fait MJ est vrai', async () => {
  const store = await fixture([fighter('human'), fighter('beast')]);
  assert.deepEqual(needsOf(store, PER_LEVEL, input(['human'])), ['facts.targets.human.humanoid'], 'aucun jet de dégâts demandé');
  assert.deepEqual(needsOf(store, PER_LEVEL, input(['human', 'beast'], {}, { human: { humanoid: true }, beast: { humanoid: false } })), ['facts.targets.beast.humanoid'], 'faux sans onFalse : bloque');
  const { result } = await cast(store, PER_LEVEL, input(['human'], {}, { human: { humanoid: true } }));
  assert.equal(person(store, 'human').hp, 20 - 3, '1 + 2 DR, sans BE ni PA');
  const row = result.receipt.effectReceipts[0];
  assert.deepEqual([row.result.die, row.result.DR, row.result.woundsLost], [null, 2, 3]);
  assert.match(row.log, /1 fixe|2 DR/);
});

test('targetFilter : traits lus sur la fiche, sinon fait MJ ; fait faux : cible ignorée ; absent : aperçu bloqué', async () => {
  const store = await fixture([fighter('ghoul', { traits: ['Mort-vivant'] }), fighter('sinner'), fighter('innocent'), fighter('fiend', { traits: ['Démon'] })]);
  assert.deepEqual(needsOf(store, FILTERED, input(['ghoul', 'sinner'], { damageRoll: 5 })), ['facts.targets.sinner.impure']);
  assert.deepEqual(needsOf(store, FILTERED, input(['innocent'], { damageRoll: 5 }, { innocent: { impure: undefined } })), ['facts.targets.innocent.impure']);
  assert.deepEqual(needsOf(store, FILTERED, input(['innocent'], {}, { innocent: { impure: false } })), [], 'cible ignorée : aucun jet requis');
  const { result } = await cast(store, FILTERED, input(['ghoul', 'sinner', 'innocent', 'fiend'], { damageRoll: 5 }, { sinner: { impure: true }, innocent: { impure: false } }));
  assert.deepEqual(['ghoul', 'sinner', 'innocent', 'fiend'].map(id => person(store, id).hp), [15, 15, 20, 15]);
  assert.deepEqual(result.receipt.effectReceipts.map(row => row.targetId), ['ghoul', 'sinner', 'fiend']);
});

test('effet miroir : verdict MJ vrai frappe la cible, faux l’épargne et frappe le prêtre (même jet), absent bloque', async () => {
  const store = await fixture([fighter('target')]);
  assert.deepEqual(needsOf(store, JUDGED, input(['target'], { damageRoll: 4 })).sort(), ['facts.targets.target.judgement', 'facts.targets.target.judgement']);
  const kept = await fixture([fighter('target')]);
  const { result: spared } = await cast(kept, JUDGED, input(['target'], { damageRoll: 4 }, { target: { judgement: false } }));
  assert.equal(person(kept, 'target').hp, 20);
  assert.equal(person(kept, 'priest').hp, 20 - 6, '4 + 2 DR sur le prêtre, sans BE ni PA');
  assert.deepEqual(spared.receipt.effectReceipts.map(row => [row.targetId, row.result.mirror === true]), [['priest', true]]);
  assert.match(spared.receipt.effectReceipts[0].log, /retour sur le prêtre/);
  const judged = await fixture([fighter('target')]);
  const { result } = await cast(judged, JUDGED, input(['target'], { damageRoll: 4 }, { target: { judgement: true } }));
  assert.equal(person(judged, 'target').hp, 20 - 6);
  assert.equal(person(judged, 'priest').hp, 20, 'miroir non appliqué sans fait « faux »');
  assert.deepEqual(result.receipt.effectReceipts.map(row => row.targetId), ['target']);
});

test('effet miroir : le jet du prêtre est exigé seulement quand le miroir joue ; le prêtre déjà désigné n’est pas frappé deux fois', async () => {
  const store = await fixture([fighter('target')]);
  assert.deepEqual(needsOf(store, JUDGED, input(['target'], {}, { target: { judgement: true } })), ['damageRoll']);
  assert.deepEqual(needsOf(store, JUDGED, input(['target'], { damageRoll: 4, damageRolls: { priest: 99 } }, { target: { judgement: false } })), ['damageRolls.priest']);
  const self = await fixture([fighter('target')]);
  await cast(self, JUDGED, input(['target', 'priest'], { damageRoll: 4 }, { target: { judgement: false }, priest: { judgement: true } }));
  assert.equal(person(self, 'priest').hp, 20 - 6, 'frappé une seule fois, comme cible');
});

test('Comète : sans aucun ennemi désigné Sigmar frappe le prêtre (dégâts et Enflammé), un ennemi suffit à l’en préserver', async () => {
  const none = await fixture([fighter('a'), fighter('b')]);
  assert.deepEqual(needsOf(none, BACKFIRE, input(['a', 'b'], { damageRoll: 7 }, { a: { foe: true } })), ['facts.targets.b.foe']);
  const { result } = await cast(none, BACKFIRE, input(['a', 'b'], { damageRoll: 7 }, { a: { foe: false }, b: { foe: false } }));
  assert.deepEqual([person(none, 'a').hp, person(none, 'b').hp, person(none, 'priest').hp], [11, 11, 11], 'zone frappée comme prévu, prêtre aussi');
  assert.deepEqual(person(none, 'priest').states.map(row => row.key), ['enflamme']);
  assert.equal(result.receipt.effectReceipts.filter(row => row.result.mirror).length, 1);
  const some = await fixture([fighter('a'), fighter('b')]);
  await cast(some, BACKFIRE, input(['a', 'b'], { damageRoll: 7 }, { a: { foe: true }, b: { foe: false } }));
  assert.equal(person(some, 'priest').hp, 20);
  assert.deepEqual(person(some, 'priest').states, []);
  assert.equal(person(some, 'a').hp, 11);
});

test('Undo et Redo restituent Blessures et États d’un effet miroir', async () => {
  const store = await fixture([fighter('a')]);
  const before = stateOf(store);
  await cast(store, BACKFIRE, input(['a'], { damageRoll: 7 }, { a: { foe: false } }));
  assert.equal(person(store, 'priest').hp, 11);
  await store.undo();
  assert.equal(person(store, 'priest').hp, 20);
  assert.deepEqual(stateOf(store).combat.participants, before.combat.participants);
  await store.redo();
  assert.equal(person(store, 'priest').hp, 11);
  assert.deepEqual(person(store, 'priest').states.map(row => row.key), ['enflamme']);
});

test('la valeur ordinaire exige la caractéristique du prêtre et le formulaire reçoit ses champs de saisie', () => {
  const effect = { type: 'ordinary-damage', dice: { count: 1, sides: 10 }, bonusFrom: 'FM' };
  const handler = effectHandlers['ordinary-damage'];
  assert.equal(handler.resolve(clone(effect), { actor: { caracs: { FM: 57 } } }).bonus, 5);
  assert.match(handler.resolve(clone(effect), { actor: { caracs: {} } }).error, /FM/);
  assert.deepEqual(handler.inputFields(effect).map(row => `${row.path}:${row.scope}`), ['damageRoll:effect', 'damageRolls:target', 'locationRolls:target', 'locationChoices:target']);
  assert.deepEqual(handler.inputFields({ ...effect, ignoreAp: true }).map(row => row.path), ['damageRoll', 'damageRolls']);
  assert.deepEqual(handler.inputFields({ type: 'ordinary-damage', fixed: 5, ignoreAp: true }), []);
  assert.deepEqual(effectHandlers['direct-damage'].factFields({ type: 'direct-damage', fixed: 1, requiresFact: { field: 'humanoid', label: 'humanoïde (fait MJ)' } }).map(row => row.field), ['humanoid']);
  assert.deepEqual(effectNeeds({ type: 'ordinary-damage', fixed: 5 }, { targets: [fighter('t')], input: {} }).map(row => row.field), ['locationRolls.t']);
});
});

describe('P4b — dégâts (miracles réels)', () => {
// P4b T2 contre les vrais contrats (registre régénéré) : Poing de vengeance, Tempête de glace, Exigence de Rhya, Pureté absolue, Comète, Jugement.
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
});
