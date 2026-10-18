import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';
import { validateEffect } from '../js/core/v5-divine-effect-handlers.js';
import { recoverV5Condition } from '../js/core/v5-effects.js';

// P4a T3 : retrait d'États, verrous divins, États de fin d'effet, force d'État, Chance temporaire.
const clone = value => structuredClone(value);
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
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
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
  const { result } = await cast(store, BEACON, { facts: { targets: { ally: { ally: true, seesPriest: true } } } });
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
