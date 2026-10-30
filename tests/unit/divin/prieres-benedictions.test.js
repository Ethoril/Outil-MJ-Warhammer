import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { magicWeaponNature } from '../../../js/core/v5-magic-combat.js';
import { buildDivineForm, toEngineInput, emptyDivineForm } from '../../../js/ui/v5-divine-form-model.js';
import { availableV5TalentActions } from '../../../js/core/v5-talent-actions.js';
import { encounter, contracts, cast, subject, level, endTurn } from '../../helpers/lot3-domain-fixture.js';
import { acquireV5Conditions } from '../../../js/core/v5-effects.js';
import { effectTypes } from '../../../js/core/v5-divine-grammar.js';
// Haine sacrée : cette recette exerce réellement le bonus des Miracles et son absence sans talent.
import '../../divin-v5-p4a-damage.test.js';

const clone = value => structuredClone(value);
const CRUSH = 'divine:miracle:ulric:crush-the-weak';
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };

describe('Attaque Rapide', () => {
// P5 — Attaque Rapide (Myrmidia, Up in Arms p.79) : au début de chaque Round du miracle, le prêtre peut tenter un Test d'Initiative
// Intermédiaire (+0 DR) pour une attaque gratuite hors séquence avec l'arme de la main principale (modèle : attaque gratuite
// de Frénésie). Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const QUICK = 'divine:miracle:attaque-rapide';
const priest = () => ({ id: 'priest', name: 'priest', kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } } });
const foe = () => ({ id: 'foe', name: 'foe', kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 30, hp: 40, maxHp: 40,
  caracs: { CC: 30, CT: 30, F: 30, E: 30, I: 30, Ag: 30, Dex: 30, Int: 30, FM: 30, Soc: 30, M: 4 },
  equipment: [], traits: [], states: [], talents: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });
async function fixture() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'foe'], participants: [priest(), foe()] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'quick' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
async function invoke(store) {
  const preview = store.previewDivineExecution(QUICK, { actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, expiry: { phase: 'endOfTurn', round: 3, actorId: 'priest' },
    choices: { range: 0, targets: 0, duration: 0, effect: 0 } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(QUICK, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}
// Attaque gratuite hors séquence : CC 60 contre défense 30 (82), touche ; le Test d'Initiative et l'arme de main sont dans le contexte.
const freeAttack = (store, { id = 'fa', test = { success: true }, mainHand = true } = {}) => store.previewResolution({ resolutionId: id, actorId: 'priest', targetId: 'foe', roll: 24,
  action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } },
  v5: { kind: 'melee', extraAttack: true, context: { freeAttackTalent: 'divine-free-attack', ...(test === null ? {} : { freeAttackTest: test }), mainHand } } });

test('Attaque Rapide : le contrat n’est plus manuel et porte l’effet free-attack', () => {
  const contract = getDivineContract(QUICK);
  assert.notEqual(contract.status, 'manual');
  assert.deepEqual(contract.effects.map(effect => [effect.type, effect.appliesTo]), [['free-attack', 'caster']]);
});

test('Attaque Rapide : attaque gratuite sans Élan, une par Round, rechargée au Round suivant ; Undo', async () => {
  const store = await fixture();
  await invoke(store);
  const first = freeAttack(store);
  assert.deepEqual(first.unresolved, []);
  assert.equal(first.actionCosts.ready, true);
  assert.equal(first.actionCosts.paid.length, 0, 'aucun Élan dépensé');
  assert.equal((await store.applyResolution(first)).status, 'applied');
  const second = freeAttack(store, { id: 'fb' });
  assert.equal(second.actionCosts.ready, false, 'quota d’une attaque par Round épuisé');
  assert.equal((await store.applyResolution(second)).status, 'manual');
  await store.nextTurn(); await store.nextTurn();
  const next = freeAttack(store, { id: 'fc' });
  assert.equal(next.actionCosts.ready, true, 'rechargée au Round suivant');
  assert.equal((await store.applyResolution(next)).status, 'applied');
  await store.undo();
  assert.equal(freeAttack(store, { id: 'fd' }).actionCosts.ready, true, 'Undo rend le quota du Round');
});

test('Attaque Rapide : Test d’Initiative absent ou raté, ou arme de main manquante → non applicable', async () => {
  const store = await fixture();
  await invoke(store);
  const missing = freeAttack(store, { id: 'fm', test: null });
  assert.ok(missing.unresolved.some(text => text.includes('Attaque rapide : Test d’Initiative Intermédiaire (+0 DR) réussi requis.')));
  assert.equal((await store.applyResolution(missing)).status, 'manual');
  const failed = freeAttack(store, { id: 'ff', test: { success: false } });
  assert.ok(failed.unresolved.some(text => text.includes('Attaque rapide : Test d’Initiative Intermédiaire (+0 DR) réussi requis.')));
  assert.equal((await store.applyResolution(failed)).status, 'manual');
  const offHand = freeAttack(store, { id: 'fo', mainHand: false });
  assert.ok(offHand.unresolved.some(text => text.includes('Attaque rapide : arme de la main principale requise.')));
  assert.equal((await store.applyResolution(offHand)).status, 'manual');
});

test('Attaque Rapide : sans le miracle, l’attaque gratuite est refusée', async () => {
  const store = await fixture();
  assert.throws(() => freeAttack(store, { id: 'fx' }), /Attaque rapide non disponible\./);
});
});

describe('Fortune généreuse', () => {
// P5 — Fortune généreuse (Ranald) : les alliés ciblés peuvent inverser les dés de pourcentage à leur PROCHAIN Test (82 devient 28) ;
// faveur perdue si elle n’est pas utilisée dans la durée. Modèle : couche à usage unique, consommée quand l’allié demande l’inversion
// (`v5.reverseDice: true`). Critère d’acceptation écrit avant l’implémentation (doit échouer avant).
const BOUNTIFUL = 'divine:miracle:ranald:bountiful-fortune';
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Ranald' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ranald' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (s, id) => s.listParticipants().find(row => row.id === id);
async function fixture() {
  const s = createStore(); await s.ready;
  await s.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'enemy'], participants: [actor('priest'), actor('ally', { initiative: 30 }), actor('enemy', { kind: 'PNJ', camp: 'ennemi', initiative: 10 })] } });
  const preview = s.previewDivineExecution(BOUNTIFUL, { actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    facts: { targets: { ally: { withinRange: true, ally: true } } }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await s.applyDivineExecution(BOUNTIFUL, { preview });
  assert.equal(result.ready, true, result.error);
  return { s, result };
}
// Test de FM (score 50) : 82 échoue, inversé en 28 il réussit.
const fmTest = (s, who, reverse) => s.previewResolution({ actor: person(s, who), action: { name: 'Concentration', type: 'test', attr: 'FM', base: 50 }, targetId: 'enemy', roll: '82',
  v5: { kind: 'test', ...(reverse ? { reverseDice: true } : {}) } });
const layers = (s, who) => (person(s, who).extensions?.v5?.divineEffects || []).filter(row => row.reverseDice?.remaining > 0).length;

test('Fortune généreuse : le contrat n’est plus manuel', () => {
  assert.notEqual(getDivineContract(BOUNTIFUL).status, 'manual');
});

test('Fortune généreuse : 82 inversé en 28 au prochain Test demandé, une seule fois ; Undo', async () => {
  const { s } = await fixture();
  assert.equal(fmTest(s, 'ally', false).success, false, 'sans demande, le jet reste 82');
  assert.equal(layers(s, 'ally'), 1, 'un aperçu ne consomme rien');
  const reversed = fmTest(s, 'ally', true);
  assert.equal(reversed.success, true, '82 devient 28');
  assert.equal((await s.applyResolution(reversed)).status, 'applied');
  assert.equal(layers(s, 'ally'), 0, 'faveur consommée');
  assert.equal(fmTest(s, 'ally', true).success, false, 'deuxième demande : plus d’inversion');
  await s.undo();
  assert.equal(layers(s, 'ally'), 1, 'Undo restitue la faveur');
});

test('Fortune généreuse : un participant non béni ne peut pas inverser ; fin de prière retire la faveur', async () => {
  const { s, result } = await fixture();
  assert.equal(fmTest(s, 'priest', true).success, false, 'le prêtre n’est pas ciblé');
  await s.endDivinePrayer(result.receipt.executionId, { reason: 'fin' });
  assert.equal(fmTest(s, 'ally', true).success, false);
});
});

describe('Chance', () => {
// Bénédiction de Chance (V5 p.221) : une relance gratuite du prochain Test échoué, consommée à l'usage.

const CULTS = ['myrmidia', 'morr', 'ranald', 'verena', 'handrich'];
const contracts = CULTS.map(cult => getAllDivineContracts().find(row => row.id === `divine:blessing:${cult}:fortune`));
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
  prayers: [], equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (s, id) => s.listParticipants().find(row => row.id === id);
const input = (more = {}) => ({ actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  facts: { targets: { ally: { withinRange: true, ally: true } } }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest', moment: 'afterEffects' }, ...more });
const id = 'divine:blessing:myrmidia:fortune';
async function fixture({ bless = true, fortune = 3 } = {}) {
  const s = createStore(); await s.ready;
  await s.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'ally', order: ['ally', 'priest', 'enemy'], participants: [actor('priest'), actor('ally', { initiative: 30 }), actor('enemy', { kind: 'PNJ', camp: 'ennemi' })] } });
  await s.setFortune('ally', fortune);
  if (bless) {
    const preview = s.previewDivineExecution(id, input());
    assert.equal(preview.ready, true, preview.error);
    const result = await s.applyDivineExecution(id, { preview });
    assert.equal(result.ready, true, result.error);
  }
  return s;
}
// Test de FM (score 50) : 88 est un échec, 12 une réussite.
const action = { name: 'Concentration', type: 'test', attr: 'FM', base: 50 };
const preview = (s, { roll = '88', reroll, ask = reroll !== undefined } = {}) => s.previewResolution({ actor: person(s, 'ally'), action, targetId: 'enemy', roll,
  v5: { kind: 'test', ...(ask ? { fortuneReroll: true } : {}), ...(reroll === undefined ? {} : { fortuneRerollRoll: reroll }) } });
const remaining = s => (person(s, 'ally').extensions?.v5?.divineEffects || []).reduce((sum, layer) => sum + (layer.freeReroll?.remaining || 0), 0);

test('Chance : les cinq contrats portent l’effet free-reroll, implémenté, clause moteur', () => {
  assert.equal(contracts.length, 5);
  for (const row of contracts) {
    assert.ok(row, 'contrat présent');
    assert.equal(row.status, 'implemented', row.id);
    assert.deepEqual(row.effects.map(effect => effect.type), ['free-reroll'], row.id);
    assert.equal(row.effects[0].duration.unit, 'rounds');
    assert.equal(row.clauses.find(clause => clause.id === 'effect').mode, 'engine', row.id);
    assert.match(row.labels.effect, /échou/, row.id);
  }
  assert.equal(contracts[4].source.document, 'Archives of the Empire 3.pdf');
  assert.equal(contracts[4].source.printedPage, 47);
});

test('Chance : relance d’un Test raté gratuite, solde inchangé, couche consommée', async () => {
  const s = await fixture();
  assert.equal(remaining(s), 1);
  const apercu = preview(s, { reroll: 24 });
  assert.equal(apercu.success, true);
  assert.equal(apercu.fortuneReroll.free, true);
  assert.match(apercu.fortuneReroll.reminder, /Bénédiction de Chance : relance gratuite/);
  assert.equal(apercu.actionCosts.paid.some(c => c.resource === 'fortune'), false);
  assert.equal(remaining(s), 1, 'l’aperçu ne consomme rien');
  const result = await s.applyResolution(apercu);
  assert.equal(result.status, 'applied');
  assert.equal(s.getFortune('ally').balance, 3);
  assert.equal(remaining(s), 0);
});

test('Chance : la deuxième relance coûte 1 Point de Chance', async () => {
  const s = await fixture();
  await s.applyResolution(preview(s, { reroll: 24 }));
  const second = preview(s, { reroll: 30 });
  assert.equal(second.fortuneReroll.free, undefined);
  assert.ok(second.actionCosts.paid.some(c => c.resource === 'fortune' && c.amount === 1));
  await s.applyResolution(second);
  assert.equal(s.getFortune('ally').balance, 2);
});

test('Chance : relancer un Test réussi coûte 1 Point de Chance et ne consomme pas la couche', async () => {
  const s = await fixture();
  const apercu = preview(s, { roll: '12', reroll: 40 });
  assert.equal(apercu.fortuneReroll.free, undefined);
  assert.ok(apercu.actionCosts.paid.some(c => c.resource === 'fortune' && c.amount === 1));
  await s.applyResolution(apercu);
  assert.equal(s.getFortune('ally').balance, 2);
  assert.equal(remaining(s), 1);
});

test('Chance : sans jet de relance saisi, l’aperçu annonce déjà la gratuité', async () => {
  const s = await fixture();
  const demande = preview(s, { ask: true });
  assert.equal(demande.fortuneReroll.free, true);
  assert.equal(demande.fortuneReroll.used, false);
});

test('Chance : Undo restitue la relance gratuite, Redo la consomme de nouveau', async () => {
  const s = await fixture();
  await s.applyResolution(preview(s, { reroll: 24 }));
  assert.equal(remaining(s), 0);
  await s.undo();
  assert.equal(remaining(s), 1);
  assert.equal(s.getFortune('ally').balance, 3);
  await s.redo();
  assert.equal(remaining(s), 0);
  assert.equal(s.getFortune('ally').balance, 3);
});

test('Chance : à l’expiration (6 Rounds) la relance gratuite disparaît', async () => {
  const s = await fixture();
  for (let i = 0; i < 18; i++) await s.nextTurn();
  assert.equal((person(s, 'ally').extensions?.v5?.divineEffects || []).length, 0);
  const apercu = preview(s, { reroll: 24 });
  assert.equal(apercu.fortuneReroll.free, undefined);
  assert.ok(apercu.actionCosts.paid.some(c => c.resource === 'fortune' && c.amount === 1));
});

test('Chance : sans bénédiction, la relance coûte 1 Point de Chance comme avant', async () => {
  const s = await fixture({ bless: false });
  const apercu = preview(s, { reroll: 24 });
  assert.equal(apercu.fortuneReroll.free, undefined);
  assert.equal(apercu.fortuneReroll.reminder, undefined);
  await s.applyResolution(apercu);
  assert.equal(s.getFortune('ally').balance, 2);
});

test('Chance : le prêtre peut réinvoquer la bénédiction une fois la précédente expirée (pas de garde de Chance temporaire)', async () => {
  const s = await fixture();
  await s.applyResolution(preview(s, { reroll: 24 }));
  for (let i = 0; i < 18; i++) await s.nextTurn();
  const again = s.previewDivineExecution(id, input({ expiry: { phase: 'endOfTurn', round: 12, actorId: 'priest', moment: 'afterEffects' } }));
  assert.equal(again.ready, true, again.error);
});

test('D3 (contrôle indépendant) : avec la bénédiction, un jet initial absent ou invalide ne lève pas d’erreur ; la relance reste payante', async () => {
  const s = await fixture();
  for (const roll of [null, '', 'abc', '0', '101']) {
    const apercu = preview(s, { roll, reroll: 24 });
    assert.notEqual(apercu.fortuneReroll?.free, true, `jet initial ${JSON.stringify(roll)} : gratuité impossible à établir`);
    assert.ok(apercu.actionCosts.paid.some(c => c.resource === 'fortune' && c.amount === 1), `jet initial ${JSON.stringify(roll)} : relance payante`);
  }
  assert.equal(remaining(s), 1, 'la relance gratuite reste disponible');
});
});

describe('Écraser les faibles', () => {
// P5 — Écraser les faibles (Ulric, Power Behind the Throne Companion) : « Une fois par Round, vous pouvez relancer une attaque ratée. »
// Modèle retenu : relance gratuite (sans Point de Chance) d'un Test d'ATTAQUE raté, rechargée à chaque Round, pendant la durée.
// Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Ulric' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ulric' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (s, id) => s.listParticipants().find(row => row.id === id);
async function fixture() {
  const s = createStore(); await s.ready;
  await s.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'priest', order: ['priest', 'enemy'], participants: [actor('priest'), actor('enemy', { kind: 'PNJ', camp: 'ennemi', initiative: 30, talents: [], prayers: [] })] } });
  await s.setFortune('priest', 3);
  const preview = s.previewDivineExecution(CRUSH, { actorId: 'priest', targetIds: ['priest'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    facts: { targets: { priest: { withinRange: true, withinTouch: true } } }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await s.applyDivineExecution(CRUSH, { preview });
  assert.equal(result.ready, true, result.error);
  return s;
}
// Attaque de CC 40 : 88 est un échec, 24 une réussite ; la défense de l'ennemi (82) échoue.
const attack = (s, { roll = '88', reroll = 24, id = 'a' } = {}) => s.previewResolution({ resolutionId: id, actor: person(s, 'priest'), actorId: 'priest', targetId: 'enemy', roll,
  action: { type: 'attack', base: 40, attr: 'CC', damage: 3 }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } },
  v5: { kind: 'melee', fortuneReroll: true, fortuneRerollRoll: reroll } });
const fmTest = s => s.previewResolution({ actor: person(s, 'priest'), action: { name: 'Concentration', type: 'test', attr: 'FM', base: 50 }, targetId: 'enemy', roll: '88',
  v5: { kind: 'test', fortuneReroll: true, fortuneRerollRoll: 12 } });
const paidFortune = preview => preview.actionCosts.paid.some(c => c.resource === 'fortune' && c.amount === 1);

test('Écraser les faibles : le contrat n’est plus manuel et porte une relance gratuite par Round', () => {
  const contract = getDivineContract(CRUSH);
  assert.notEqual(contract.status, 'manual');
  assert.deepEqual(contract.effects.map(effect => effect.type), ['free-reroll']);
});

test('Écraser les faibles : relance gratuite d’une attaque ratée, une seule par Round, rechargée au Round suivant ; Undo', async () => {
  const s = await fixture();
  const first = attack(s);
  assert.equal(first.fortuneReroll?.free, true, 'première relance d’attaque gratuite');
  assert.equal(paidFortune(first), false);
  assert.equal((await s.applyResolution(first)).status, 'applied');
  assert.equal(s.getFortune('priest').balance, 3);
  const second = attack(s, { id: 'b' });
  assert.equal(second.fortuneReroll?.free, undefined, 'deuxième relance du même Round payante');
  assert.ok(paidFortune(second));
  await s.nextTurn(); await s.nextTurn();
  assert.equal(attack(s, { id: 'c' }).fortuneReroll?.free, true, 'rechargée au Round suivant');
  await s.undo(); await s.undo();
  assert.equal(attack(s, { id: 'd' }).fortuneReroll?.free, undefined, 'Undo revient au Round 1, relance déjà utilisée');
});

test('Écraser les faibles : un Test qui n’est pas une attaque reste payant ; une attaque réussie relancée reste payante', async () => {
  const s = await fixture();
  const fm = fmTest(s);
  assert.equal(fm.fortuneReroll?.free, undefined);
  assert.ok(paidFortune(fm));
  const hit = attack(s, { roll: '24', reroll: 30 });
  assert.equal(hit.fortuneReroll?.free, undefined);
});
});

describe('Droiture', () => {
// P5 T1 — Bénédiction de Droiture (p.221) : « L'arme de la cible est considérée comme Magique ».
// Arbitrage MJ (19 oct.) : sur UNE arme désignée par le MJ, celle de la CIBLE de la bénédiction (pas du prêtre).
// Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const DROITURE = ['myrmidia', 'morr', 'sigmar', 'verena'].map(cult => `divine:blessing:${cult}:righteousness`);
const sword = { id: 'sword-attack', note: 'Épée', type: 'attack', attr: 'CC', base: 40, damage: 4, qualities: [], extensions: { fiche: { equipmentId: 'sword' } } };
const dagger = { id: 'dagger-attack', note: 'Dague', type: 'attack', attr: 'CC', base: 40, damage: 2, qualities: [], extensions: { fiche: { equipmentId: 'dagger' } } };
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const allyEquipment = [{ id: 'sword', name: 'Épée', kind: 'weapon', category: 'melee' }, { id: 'dagger', name: 'Dague', kind: 'weapon', category: 'melee' }];
async function fixture() {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [
    actor('priest'), actor('ally', { initiative: 30, actions: [sword, dagger], equipment: allyEquipment })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const expiry = { phase: 'endOfTurn', round: 6, actorId: 'priest' };
const input = (more = {}) => ({ actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 }, expiry,
  facts: { targets: { ally: { withinRange: true } } }, ...more });

test('Droiture : les quatre contrats portent un bonus d’arme Magique sur une arme désignée de la cible', () => {
  for (const id of DROITURE) {
    const contract = getDivineContract(id);
    assert.ok(contract, id);
    assert.notEqual(contract.status, 'manual', id);
    assert.equal(contract.effects.length, 1, id);
    const [effect] = contract.effects;
    assert.equal(effect.type, 'weapon-bonus', id);
    assert.equal(effect.magical, true, id);
    assert.equal(effect.designatedWeapon, true, id);
    assert.equal(effect.weaponOwner, 'target', id);
  }
});

test('Droiture : sans arme désignée, l’aperçu demande l’arme de la cible (libellé « cible »)', async () => {
  const store = await fixture();
  const preview = store.previewDivineExecution(DROITURE[0], input());
  assert.equal(preview.ready, false);
  const need = preview.needsInput.find(row => row.field === 'facts.weapon.equipmentId');
  assert.ok(need, JSON.stringify(preview.needsInput));
  assert.match(need.label, /cible/i);
  assert.doesNotMatch(need.label, /prêtre/i);
});

test('Droiture : seule l’arme désignée de la cible devient Magique, puis l’effet expire ; Undo le retire', async () => {
  const store = await fixture();
  const preview = store.previewDivineExecution(DROITURE[0], input({ facts: { weapon: { equipmentId: 'sword' }, targets: { ally: { withinRange: true } } } }));
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(DROITURE[0], { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(magicWeaponNature(person(store, 'ally'), sword).magical, true, 'épée désignée Magique');
  assert.notEqual(magicWeaponNature(person(store, 'ally'), dagger).magical, true, 'la dague reste non magique');
  assert.notEqual(magicWeaponNature(person(store, 'priest'), sword).magical, true, 'le prêtre ne reçoit rien');
  await store.undo();
  assert.notEqual(magicWeaponNature(person(store, 'ally'), sword).magical, true, 'Undo retire le bonus');
  await store.redo();
  assert.equal(magicWeaponNature(person(store, 'ally'), sword).magical, true, 'Redo le rétablit');
  for (let i = 0; i < 14; i++) await store.nextTurn();
  assert.notEqual(magicWeaponNature(person(store, 'ally'), sword).magical, true, 'expiré après 6 Rounds');
});

test('Droiture : le formulaire propose les armes de la CIBLE et produit une entrée que le moteur accepte', async () => {
  const store = await fixture();
  const contract = getDivineContract(DROITURE[0]);
  const priest = person(store, 'priest'), ally = person(store, 'ally');
  const form = buildDivineForm(contract, { actor: priest, targets: [ally] });
  const field = form.effectFields.find(row => row.id === 'weapon');
  assert.ok(field, 'champ arme présent');
  assert.match(field.label, /cible/i);
  const values = (field.options || []).map(option => Array.isArray(option) ? option[0] : option.value ?? option.id);
  assert.ok(values.includes('sword') && values.includes('dagger'), JSON.stringify(field.options));
  const draft = { ...emptyDivineForm(), weaponId: 'sword', facts: { ally: { withinRange: true } } };
  const engineInput = toEngineInput(draft, { targetIds: ['ally'], contract, actor: priest });
  assert.equal(engineInput.facts.weapon.equipmentId, 'sword');
});

test('Non-régression : Marteau ardent et Lance de Myrmidia demandent toujours l’arme du prêtre', () => {
  const contracts = getAllDivineContracts().filter(row => row.type === 'miracle' && row.effects?.some(effect => effect.type === 'weapon-bonus' && effect.designatedWeapon === true));
  assert.ok(contracts.length >= 2);
  for (const contract of contracts) assert.notEqual(contract.effects.find(effect => effect.type === 'weapon-bonus').weaponOwner, 'target', contract.name);
});
});

describe('En Bon Ordre', () => {
// P5 T5 — En Bon Ordre (Myrmidia, Up in Arms p.79) : tant que le miracle dure, les alliés désignés portent « En bon ordre »
// (drapeau special-state orderlyDisengage) : Désengagement sans Élan ni attaque gratuite adverse, à appliquer par le MJ
// (le moteur ne gère pas le Désengagement). Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const ORDER = () => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === 'En Bon Ordre');
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
async function fixture() {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally1', 'ally2', 'other'], participants: [
    actor('priest'), actor('ally1', { initiative: 40 }), actor('ally2', { initiative: 30 }), actor('other', { initiative: 20 })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const flag = (store, id) => person(store, id).extensions.v5.specialStates?.orderlyDisengage === true;

test('En Bon Ordre : contrat assisté (non manuel) portant l’effet special-state orderlyDisengage', () => {
  const contract = ORDER();
  assert.ok(contract);
  assert.notEqual(contract.status, 'manual', 'le contrat ne doit plus être manuel');
  assert.deepEqual(contract.effects.map(effect => ({ type: effect.type, orderlyDisengage: effect.orderlyDisengage })),
    [{ type: 'special-state', orderlyDisengage: true }]);
  assert.ok(contract.clauses.some(row => row.mode === 'engine' && /En bon ordre/.test(row.text)), 'clause moteur du Désengagement');
});

test('En Bon Ordre : drapeau sur les deux alliés désignés seulement ; « Terminer la prière » le retire ; Undo le restaure', async () => {
  const store = await fixture();
  const contract = ORDER();
  const input = { actorId: 'priest', targetIds: ['ally1', 'ally2'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 },
    expiry: { phase: 'endOfTurn', round: 5, actorId: 'priest' }, facts: { targets: { ally1: { withinRange: true }, ally2: { withinRange: true } } } };
  const preview = store.previewDivineExecution(contract.id, input);
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(contract.id, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(flag(store, 'ally1'), true, 'ally1 porte « En bon ordre »');
  assert.equal(flag(store, 'ally2'), true, 'ally2 porte « En bon ordre »');
  assert.equal(flag(store, 'other'), false, 'un participant non désigné ne porte pas le drapeau');
  assert.equal(flag(store, 'priest'), false, 'le prêtre non désigné ne porte pas le drapeau');
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'fin' });
  assert.equal(flag(store, 'ally1'), false, 'fin de prière : drapeau retiré');
  assert.equal(flag(store, 'ally2'), false, 'fin de prière : drapeau retiré');
  await store.undo();
  assert.equal(flag(store, 'ally1'), true, 'Undo restaure le drapeau');
  assert.equal(flag(store, 'ally2'), true, 'Undo restaure le drapeau');
});
});

describe('Fureur d’Ulric', () => {
// P5 — Fureur d'Ulric (Livre de base V5 p.228) : l'allié désigné gagne Frénésie ; au lieu de l'attaque gratuite,
// la Frénésie ajoute +1d10 Dégâts (d10 explosif : sur 10, relancer et ajouter) au premier coup de mêlée de chacun
// de ses Tours. Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const FURY = 'divine:miracle:ulric:ulric-s-fury';
const fighter = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 20, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 40, M: 4 },
  equipment: [], traits: [], states: [], talents: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const priest = () => fighter('priest', { kind: 'PJ', camp: 'pj', initiative: 60, caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Ulric' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ulric' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  extensions: { v5: { divine: { sin: 0 }, hasMomentum: false } } });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const furyLayer = store => (person(store, 'ally').extensions?.v5?.divineEffects || []).find(layer => layer?.frenzyFury);
async function fixture({ allyTalents = [] } = {}) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'ally', order: ['priest', 'ally', 'foe'],
    participants: [priest(), fighter('ally', { kind: 'PJ', camp: 'pj', initiative: 40, talents: allyTalents }), fighter('foe')] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'fury' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
async function invoke(store) {
  const preview = store.previewDivineExecution(FURY, { actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' },
    choices: { range: 0, targets: 0, duration: 0 }, facts: { targets: { ally: { ally: true, withinRange: true } } } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(FURY, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}
async function enterFrenzy(store, actorId, resolutionId) {
  const raw = { resolutionId, actorId, action: { type: 'skill', attr: 'FM', base: 50 }, roll: 20, v5: { kind: 'test', context: { talentAction: 'frenzy' } } };
  const applied = await store.applyResolution(store.previewResolution(raw));
  assert.equal(applied.status, 'applied');
}
const melee = (id, extra = {}) => ({ resolutionId: id, actorId: 'ally', targetId: 'foe', action: { type: 'attack', base: 60, attr: 'CC', damage: 5 },
  roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, ...extra });
const FURY_MESSAGE = 'Fureur d’Ulric : saisir le d10 de dégâts (relancer et ajouter sur 10).';

test('Fureur d’Ulric : contrat assisté, l’allié gagne Frénésie et la couche, l’action « Entrer en Frénésie » est disponible', async () => {
  assert.notEqual(getDivineContract(FURY).status, 'manual');
  assert.equal(getDivineContract(FURY).status, 'assisted');
  assert.deepEqual(getDivineContract(FURY).effects.map(effect => ({ type: effect.type, talents: effect.talents })), [
    { type: 'grant-talent', talents: [{ id: 'talent-frenzy', rank: 1 }] },
    { type: 'frenzy-fury', talents: undefined }]);
  const store = await fixture();
  const result = await invoke(store);
  const ally = person(store, 'ally');
  assert.ok(ally.talents.some(row => row.id === 'talent-frenzy'), 'le Talent Frénésie est injecté');
  const layer = furyLayer(store);
  assert.ok(layer, 'la couche frenzyFury est posée sur l’allié');
  assert.deepEqual(layer.frenzyFury, { lastTurnId: null });
  assert.ok(availableV5TalentActions(ally).some(row => row.id === 'activate:frenzy'), 'l’action Entrer en Frénésie est disponible');
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'fin' });
  assert.ok(!person(store, 'ally').talents.some(row => row.id === 'talent-frenzy'), 'fin de prière : Talent retiré');
  assert.ok(!furyLayer(store), 'fin de prière : couche retirée');
});

test('Fureur d’Ulric : l’attaque gratuite de Frénésie est refusée pour le porteur de la couche', async () => {
  const store = await fixture();
  await invoke(store);
  await enterFrenzy(store, 'ally', 'ally-frenzy');
  const free = melee('free', { v5: { kind: 'melee', extraAttack: true, context: { freeAttackTalent: 'frenzy' } } });
  assert.throws(() => store.previewResolution(free), /Fureur d’Ulric : la Frénésie ajoute 1d10 Dégâts au premier coup au lieu de l’attaque gratuite\./);
});

test('Fureur d’Ulric : +1d10 explosif au premier coup de mêlée du Tour, une seule fois, puis au Tour suivant ; Undo', async () => {
  const store = await fixture();
  await invoke(store);
  await enterFrenzy(store, 'ally', 'ally-frenzy');
  const baselineStore = await fixture({ allyTalents: [{ id: 'talent-frenzy', status: 'resolved', rank: 1 }] });
  await enterFrenzy(baselineStore, 'ally', 'baseline-frenzy');
  const baseline = baselineStore.previewResolution(melee('base')).damage;
  const first = store.previewResolution(melee('first', { v5: { kind: 'melee', context: { ulricFuryDice: [10, 4] } } }));
  assert.equal(first.damage.talentDamage, baseline.talentDamage + 14, '+10 puis +4 = +14 Dégâts');
  const appliedFirst = await store.applyResolution(first); assert.equal(appliedFirst.status, 'applied', JSON.stringify(appliedFirst.reason ?? appliedFirst.error ?? appliedFirst.message));
  assert.equal(furyLayer(store).frenzyFury.lastTurnId, 'fury:1:ally', 'la couche enregistre le Tour du coup');
  await store.undo();
  assert.equal(furyLayer(store).frenzyFury.lastTurnId, null, 'Undo restaure lastTurnId');
  await store.redo();
  assert.equal(furyLayer(store).frenzyFury.lastTurnId, 'fury:1:ally');
  const second = store.previewResolution(melee('second'));
  assert.ok(!second.unresolved.some(row => row.includes('Fureur d’Ulric')), 'second coup du même Tour : rien à saisir');
  assert.equal(second.damage.talentDamage, baseline.talentDamage, 'aucun bonus supplémentaire ce Tour');
  const state = JSON.parse(store.getFullJSON()); state.extensions.v5.turnIndex = 2; await store.loadFromJSON(state);
  const nextTurn = store.previewResolution(melee('next-turn'));
  assert.ok(nextTurn.unresolved.some(row => row === FURY_MESSAGE), 'au Tour suivant, le d10 est redemandé');
});

test('Fureur d’Ulric : séquences de dés invalides ou absentes non applicables', async () => {
  const store = await fixture();
  await invoke(store);
  await enterFrenzy(store, 'ally', 'ally-frenzy');
  for (const dice of [[4, 10], [11], []]) {
    const preview = store.previewResolution(melee('invalid-' + dice.join('-'), { v5: { kind: 'melee', context: { ulricFuryDice: dice } } }));
    assert.ok(preview.unresolved.some(row => row === FURY_MESSAGE), JSON.stringify(dice) + ' : saisie refusée');
    assert.equal((await store.applyResolution(preview)).status, 'manual');
  }
  const missing = store.previewResolution(melee('missing'));
  assert.ok(missing.unresolved.some(row => row === FURY_MESSAGE), 'sans saisie : d10 demandé');
});

test('Fureur d’Ulric : hors Frénésie, rien n’est demandé et aucun bonus ne s’applique', async () => {
  const store = await fixture();
  await invoke(store);
  const calm = store.previewResolution(melee('calm'));
  assert.ok(!calm.unresolved.some(row => row.includes('Fureur d’Ulric')), 'hors Frénésie : rien à saisir');
  assert.equal(calm.damage.talentDamage ?? 0, 0);
});
});

describe('N’écoutez point la Sorcière', () => {
// P5 — N’écoutez point la Sorcière (Sigmar, V5 p.226) : « tout sort visant quiconque ou n’importe quel endroit de la zone subit
// -2 DR à son Test d’Incantation ». Modèle assisté : le MJ désigne les participants dans la zone (comme Sur un Terrain Mortel) ;
// un sort visant au moins l’un d’eux subit -2 DR une seule fois. Critère d’acceptation écrit avant l’implémentation.
const HEED = 'divine:miracle:sigmar:heed-not-the-witch';
const priest = { id: 'priest', name: 'priest', kind: 'PJ', camp: 'ennemi', zone: 'active', initiative: 40, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Sigmar' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Sigmar' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } } };
async function fixture() {
  const { store } = await encounter({});
  const state = JSON.parse(store.getFullJSON());
  const foe2 = { ...structuredClone(state.combat.participants.find(p => p.id === 'foe')), id: 'foe2', name: 'foe2' };
  state.combat.participants.push(structuredClone(priest), foe2); state.combat.order = ['priest', 'mage', 'foe', 'foe2']; state.combat.currentActorId = 'priest';
  await store.loadFromJSON(state);
  return store;
}
async function invoke(store, zone) {
  const preview = store.previewDivineExecution(HEED, { actorId: 'priest', targetIds: zone, roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    facts: { targets: Object.fromEntries(zone.map(id => [id, { withinRange: true, withinArea: true }])) }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(HEED, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}
const castSl = (store, targetIds) => {
  const preview = store.previewSpellExecution('Carreau', { actorId: 'mage', targetIds, roll: 25, miscastRoll: 15 });
  assert.equal(preview.valid, true, preview.error);
  return preview.castingPreview.testSl;
};

test('N’écoutez point la Sorcière : le contrat n’est plus manuel', () => {
  assert.notEqual(getDivineContract(HEED).status, 'manual');
});

test('N’écoutez point la Sorcière : -2 DR au lancement d’un sort visant un participant de la zone, pas hors zone ; fin et Undo', async () => {
  const store = await fixture();
  const base = castSl(store, ['foe']);
  assert.equal(castSl(store, ['foe2']), base);
  const result = await invoke(store, ['priest', 'foe']);
  assert.equal(castSl(store, ['foe']), base - 2, 'cible dans la zone');
  assert.equal(castSl(store, ['foe2']), base, 'cible hors zone');
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'fin' });
  assert.equal(castSl(store, ['foe']), base, 'fin de prière');
  await store.undo();
  assert.equal(castSl(store, ['foe']), base - 2, 'Undo rétablit la prière');
  await store.undo();
  assert.equal(castSl(store, ['foe']), base, 'Undo annule l’invocation');
});
});

describe('interactions entre bénédictions', () => {
// P5 — Interactions entre faveurs divines sur un même participant (agnostique du culte) :
//  - Bénédiction de Chance (V5 p.221) : une relance gratuite du prochain Test échoué ;
//  - Écraser les faibles (Ulric) : une relance gratuite d'une ATTAQUE ratée par Round ;
//  - Fortune généreuse (Ranald) : inversion des dés de pourcentage au prochain Test demandé (`v5.reverseDice: true`).
// Le participant « hero » porte les couches : Écraser les faibles invoqué sur lui-même, Chance et Fortune généreuse
// reçues de deux autres prêtres (les bénédictions/miracles ciblent un allié, pas le lanceur).

const FORTUNE = 'divine:blessing:myrmidia:fortune';
const BOUNTIFUL = 'divine:miracle:ranald:bountiful-fortune';
const miracles = getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' }));
const actor = (id, talents, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents, prayers: miracles, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const T = {
  hero: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Ulric' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ulric' }],
  myr: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
  ran: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Ranald' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ranald' }],
};
const person = (s, id) => s.listParticipants().find(row => row.id === id);
async function fixture({ crush = true, fortune = true, bountiful = true } = {}) {
  const s = createStore(); await s.ready;
  await s.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'hero', order: ['hero', 'myr', 'ran', 'enemy'],
      participants: [actor('hero', T.hero), actor('myr', T.myr, { initiative: 50 }), actor('ran', T.ran, { initiative: 40 }),
        actor('enemy', [], { kind: 'PNJ', camp: 'ennemi', initiative: 30, talents: [], prayers: [] })] } });
  await s.setFortune('hero', 3);
  const invoke = async (id, actorId) => {
    const preview = s.previewDivineExecution(id, { actorId, targetIds: ['hero'], roll: 45, canSpeak: true,
      choices: { range: 0, targets: 0, duration: 0, effect: 0 },
      facts: { targets: { hero: { withinRange: true, ally: true, withinTouch: true } } },
      expiry: { phase: 'endOfTurn', round: 6, actorId, moment: 'afterEffects' } });
    assert.equal(preview.ready, true, `${id} :: ${preview.error} ${JSON.stringify(preview.needsInput)}`);
    const result = await s.applyDivineExecution(id, { preview });
    assert.equal(result.ready, true, `${id} :: ${result.error}`);
  };
  if (crush) await invoke(CRUSH, 'hero');
  if (fortune) await invoke(FORTUNE, 'myr');
  if (bountiful) await invoke(BOUNTIFUL, 'ran');
  return s;
}
// Attaque de CC 40 : 88 est un échec, 24 une réussite ; la défense de l'ennemi (82) échoue.
const attack = (s, { roll = '88', reroll = 24, id = 'a' } = {}) => s.previewResolution({ resolutionId: id, actor: person(s, 'hero'), actorId: 'hero', targetId: 'enemy', roll,
  action: { type: 'attack', base: 40, attr: 'CC', damage: 3 }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } },
  v5: { kind: 'melee', fortuneReroll: true, fortuneRerollRoll: reroll } });
// Test de FM : 82 (score 50) échoue inversé en 28 il réussit ; 91 (score 10) inversé en 19 échoue encore.
const testRoll = (s, { roll = '82', base = 50, reverse = false, reroll, id = 't' } = {}) => s.previewResolution({ resolutionId: id, actor: person(s, 'hero'),
  action: { name: 'Concentration', type: 'test', attr: 'FM', base }, targetId: 'enemy', roll,
  v5: { kind: 'test', ...(reverse ? { reverseDice: true } : {}), ...(reroll === undefined ? {} : { fortuneReroll: true, fortuneRerollRoll: reroll }) } });
const layerOf = (s, prayerId) => (person(s, 'hero').extensions?.v5?.divineEffects || []).find(row => row.prayerId === prayerId);
const fortuneRemaining = s => layerOf(s, FORTUNE)?.freeReroll?.remaining ?? 0;
const crushUsedRound = s => layerOf(s, CRUSH)?.freeReroll?.usedRound;
const reverseRemaining = s => layerOf(s, BOUNTIFUL)?.reverseDice?.remaining ?? 0;
const paidFortune = preview => (preview.actionCosts?.paid || []).some(c => c.resource === 'fortune' && c.amount === 1);
const snapshot = s => ({ balance: s.getFortune('hero').balance, fortune: fortuneRemaining(s), crushUsed: crushUsedRound(s), reverse: reverseRemaining(s) });
const unchanged = (s, before, label) => assert.deepEqual(snapshot(s), before, label);

test('Interactions 1 : Chance + Écraser les faibles — première attaque ratée relancée gratuitement, Écraser consommé pour le Round, Chance intacte', async () => {
  const s = await fixture({ bountiful: false });
  const before = snapshot(s);
  const first = attack(s);
  assert.equal(first.fortuneReroll?.free, true, 'relance gratuite');
  assert.equal(paidFortune(first), false, 'aucun Point de Chance payé');
  unchanged(s, before, 'l’aperçu ne consomme aucune couche ni aucun point');
  assert.equal((await s.applyResolution(first)).status, 'applied');
  assert.equal(s.getFortune('hero').balance, 3, 'solde de Chance inchangé');
  assert.equal(crushUsedRound(s), 1, 'la couche Écraser les faibles est utilisée pour ce Round');
  assert.equal(fortuneRemaining(s), 1, 'la couche Chance garde remaining 1');
});

test('Interactions 2 : deuxième attaque ratée du même Round — encore gratuite, cette fois via Chance qui passe à 0', async () => {
  const s = await fixture({ bountiful: false });
  await s.applyResolution(attack(s, { id: 'a' }));
  const before = snapshot(s);
  const second = attack(s, { id: 'b' });
  assert.equal(second.fortuneReroll?.free, true, 'relance gratuite : la couche Chance prend le relais');
  assert.equal(paidFortune(second), false, 'aucun Point de Chance payé');
  unchanged(s, before, 'l’aperçu ne consomme aucune couche ni aucun point');
  assert.equal((await s.applyResolution(second)).status, 'applied');
  assert.equal(fortuneRemaining(s), 0, 'la couche Chance est consommée');
  assert.equal(crushUsedRound(s), 1, 'Écraser les faibles reste utilisé pour ce Round');
  assert.equal(s.getFortune('hero').balance, 3, 'solde de Chance inchangé');
});

test('Interactions 3 : Fortune généreuse + Chance — 82 inversé en 28 réussit sans relance ; seule l’inversion est consommée', async () => {
  const s = await fixture({ crush: false });
  const before = snapshot(s);
  const reversed = testRoll(s, { reverse: true, id: 't1' });
  assert.equal(reversed.success, true, '82 inversé en 28 : réussite');
  assert.equal(reversed.fortuneReroll, undefined, 'aucune relance demandée');
  unchanged(s, before, 'l’aperçu ne consomme aucune couche ni aucun point');
  assert.equal((await s.applyResolution(reversed)).status, 'applied');
  assert.equal(reverseRemaining(s), 0, 'couche inversion consommée');
  assert.equal(fortuneRemaining(s), 1, 'couche Chance intacte');
  assert.equal(s.getFortune('hero').balance, 3, 'solde de Chance inchangé');
});

test('Interactions 4 : inversion + relance dans la même commande (91→19 échoue, relance 05 gratuite) ; les deux couches consommées, un seul Undo restitue tout', async () => {
  const s = await fixture({ crush: false });
  const before = snapshot(s);
  const both = testRoll(s, { roll: '91', base: 10, reverse: true, reroll: 5, id: 't2' });
  assert.equal(both.fortuneReroll?.initialRoll, 19, '91 inversé en 19');
  assert.equal(both.fortuneReroll?.free, true, '19 échoue contre 10 : la relance est gratuite');
  assert.equal(paidFortune(both), false, 'aucun Point de Chance payé');
  assert.equal(both.success, true, 'la relance 05 réussit contre 10');
  unchanged(s, before, 'l’aperçu ne consomme aucune couche ni aucun point');
  assert.equal((await s.applyResolution(both)).status, 'applied');
  assert.equal(reverseRemaining(s), 0, 'couche inversion consommée');
  assert.equal(fortuneRemaining(s), 0, 'couche Chance consommée dans la même commande');
  assert.equal(s.getFortune('hero').balance, 3, 'solde de Chance inchangé');
  await s.undo();
  assert.equal(reverseRemaining(s), 1, 'un seul Undo restitue l’inversion');
  assert.equal(fortuneRemaining(s), 1, 'le même Undo restitue la relance gratuite');
  assert.equal(s.getFortune('hero').balance, 3, 'solde de Chance inchangé');
});

test('Interactions 5 : aucun aperçu (attaque, relance, inversion, combinaison) ne consomme de couche ni ne touche au solde', async () => {
  const withCrush = await fixture({ bountiful: false });
  const beforeCrush = snapshot(withCrush);
  attack(withCrush, { id: 'p1' });
  testRoll(withCrush, { reverse: true, id: 'p2' });
  testRoll(withCrush, { roll: '91', base: 10, reverse: true, reroll: 5, id: 'p3' });
  unchanged(withCrush, beforeCrush, 'couches et solde inchangés après tous les aperçus');
  const withReverse = await fixture({ crush: false });
  const beforeReverse = snapshot(withReverse);
  testRoll(withReverse, { reverse: true, id: 'p4' });
  testRoll(withReverse, { roll: '91', base: 10, reverse: true, reroll: 5, id: 'p5' });
  unchanged(withReverse, beforeReverse, 'couches et solde inchangés après tous les aperçus');
});

test('Interactions 6 (régression) : sans aucune de ces couches, la relance coûte 1 Point de Chance et reverseDice ne change rien', async () => {
  const s = await fixture({ crush: false, fortune: false, bountiful: false });
  assert.equal((person(s, 'hero').extensions?.v5?.divineEffects || []).length, 0, 'aucune couche divine');
  const before = snapshot(s);
  const withReverse = testRoll(s, { reverse: true, reroll: 60, id: 't3' });
  const withoutReverse = testRoll(s, { reroll: 60, id: 't4' });
  for (const apercu of [withReverse, withoutReverse]) {
    assert.equal(apercu.success, false, '82 puis 60 échouent tous deux contre 50');
    assert.equal(apercu.fortuneReroll?.initialRoll, 82, 'sans couche, le jet initial n’est pas inversé');
    assert.equal(apercu.fortuneReroll?.free, undefined, 'pas de gratuité');
    assert.ok(paidFortune(apercu), 'la relance coûte 1 Point de Chance');
  }
  assert.deepEqual(withReverse.fortuneReroll, withoutReverse.fortuneReroll, 'reverseDice ne change rien');
  unchanged(s, before, 'l’aperçu ne consomme rien');
  assert.equal((await s.applyResolution(withReverse)).status, 'applied');
  assert.equal(s.getFortune('hero').balance, 2, '1 Point de Chance débité');
});
});

describe('Larmes de Shallya', () => {
// Étape 6 du plan — Larmes de Shallya (Livre de base V5 p.226) : guérit 1 Blessure Critique de la cible,
// +1 par tranche de +2 DR. Les Blessures Critiques du registre (étape 5) sont retirées, les États qu'elles
// avaient posés restent. Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const TEARS = 'divine:miracle:shallya:shallya-s-tears';
const base = (id, extra = {}) => ({ id, name: id, kind: id === 'foe' ? 'PNJ' : 'PJ', camp: id === 'foe' ? 'ennemi' : 'pj', zone: 'active', initiative: 60, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 }, hasMomentum: false } }, ...extra });
const priest = () => base('priest', { initiative: 70,
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Shallya' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })) });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const records = (store, id) => person(store, id).extensions?.v5?.criticalWounds || [];
async function fixture() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
    participants: [priest(), base('ally', { initiative: 50 }), base('foe', { initiative: 30 })] }, log: [], diceLines: [],
    extensions: { v5: { turnIndex: 1, combatId: 'larmes-shallya' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
// L'ennemi porte deux coups critiques à l'allié : deux enregistrements au registre (étape 5), avec leurs États.
const critAttack = (resolutionId, effectRoll) => ({ resolutionId, actorId: 'foe', targetId: 'ally', roll: 22,
  action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' },
  criticalRolls: { location: 2, effect: effectRoll } });
async function woundAllyTwice(store) {
  const ids = [];
  for (const [index, effectRoll] of [80, 45].entries()) {
    const preview = store.previewResolution(critAttack(`w${index + 1}`, effectRoll));
    assert.ok(preview.critical?.details, 'critique attendu');
    const result = await store.applyResolution(preview);
    assert.notEqual(result.status, 'manual', result.reason);
    ids.push(records(store, 'ally').at(-1).id);
  }
  assert.equal(records(store, 'ally').length, 2, 'deux Blessures Critiques au registre');
  return ids;
}
const invokeInput = (ids, roll) => ({ actorId: 'priest', targetIds: ['ally'], roll, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 },
  criticalHeals: { first: { ally: ids[0] ?? '' }, second: { ally: ids[1] ?? '' }, third: { ally: ids[2] ?? '' } },
  facts: { targets: { ally: { withinTouch: true } } } });

test('Larmes de Shallya : contrat assisté (non manuel) portant l’effet heal-critical', () => {
  const contract = getDivineContract(TEARS);
  assert.ok(contract);
  assert.notEqual(contract.status, 'manual', 'le contrat ne doit plus être manuel');
  assert.deepEqual(contract.effects.map(effect => ({ type: effect.type, count: effect.count, perSuccessLevels: effect.perSuccessLevels })),
    [{ type: 'heal-critical', count: 1, perSuccessLevels: { every: 2, add: 1, field: 'count' } }]);
});

test('Larmes de Shallya : +2 DR guérit les deux Blessures Critiques ; les États des critiques restent', async () => {
  const store = await fixture();
  const ids = await woundAllyTwice(store);
  const statesBefore = person(store, 'ally').states.length;
  assert.ok(statesBefore > 0, 'des États posés par les critiques');
  const preview = store.previewDivineExecution(TEARS, invokeInput(ids, 45));
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(TEARS, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(records(store, 'ally').length, 0, 'les deux enregistrements sont retirés');
  assert.equal(person(store, 'ally').states.length, statesBefore, 'les États posés par les critiques restent');
  const receipt = result.receipt.effectReceipts.find(row => row.type === 'heal-critical');
  assert.ok(receipt, 'reçu heal-critical');
  assert.deepEqual(receipt.result.healedIds, ids, 'le reçu liste les Blessures guéries');
  assert.ok(receipt.result.reminders.includes('Prière de (10 − Bonus de Sociabilité) Rounds avant l’effet ; interrompue, aucun effet.'), 'rappel des Rounds de prière');
  assert.ok(receipt.result.reminders.includes('Ne rattache pas les membres amputés.'), 'rappel des membres amputés');
});

test('Larmes de Shallya : à +1 DR, choisir deux Blessures Critiques est refusé', async () => {
  const store = await fixture();
  const ids = await woundAllyTwice(store);
  const preview = store.previewDivineExecution(TEARS, invokeInput(ids, 58));
  assert.equal(preview.ready, false, 'une seule Blessure guérie à +1 DR');
  assert.ok(preview.needsInput.some(row => /Blessures Critiques choisies que guéries/.test(row.label)),
    `besoin attendu : ${JSON.stringify(preview.needsInput)}`);
});

test('Larmes de Shallya : identifiant inconnu ou répété refusé', async () => {
  const store = await fixture();
  const ids = await woundAllyTwice(store);
  const unknown = store.previewDivineExecution(TEARS, invokeInput([ids[0], 'w0:crit:ally:9'], 45));
  assert.equal(unknown.ready, false, 'une Blessure inexistante ne peut être guérie');
  assert.ok(unknown.needsInput.some(row => /introuvable/.test(row.label)), JSON.stringify(unknown.needsInput));
  const repeated = store.previewDivineExecution(TEARS, invokeInput([ids[0], ids[0]], 45));
  assert.equal(repeated.ready, false, 'la même Blessure ne peut être guérie deux fois');
  assert.ok(repeated.needsInput.some(row => /distinctes/.test(row.label)), JSON.stringify(repeated.needsInput));
});

test('Larmes de Shallya : cible sans Blessure Critique — aucune saisie exigée, aucun retrait', async () => {
  const store = await fixture();
  const statesBefore = person(store, 'ally').states.length;
  const preview = store.previewDivineExecution(TEARS, invokeInput([], 45));
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(TEARS, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(records(store, 'ally').length, 0, 'aucun enregistrement à retirer');
  assert.equal(person(store, 'ally').states.length, statesBefore, 'aucun État touché');
});

test('Larmes de Shallya : l’Undo rétablit les enregistrements guéris', async () => {
  const store = await fixture();
  const ids = await woundAllyTwice(store);
  const preview = store.previewDivineExecution(TEARS, invokeInput(ids, 45));
  const result = await store.applyDivineExecution(TEARS, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(records(store, 'ally').length, 0);
  await store.undo();
  assert.equal(records(store, 'ally').length, 2, 'l’Undo rétablit les deux enregistrements');
  assert.deepEqual(records(store, 'ally').map(row => row.id), ids, 'les identifiants stables sont restaurés');
});
});

describe('Malice de Ranald', () => {
// P5 — Malice de Ranald (Deft Steps, p.24) : deux Caractéristiques DU PRÊTRE sont égalées à celles de l’adversaire ciblé
// (tirées au d10 : 1-2 CC, 3-4 I, 5-6 Int, 7-8 Soc, 9-0 au choix ; le MJ saisit les deux retenues). Valeurs figées au lancement,
// retirées à la fin de la prière. Critère d’acceptation écrit avant l’implémentation (doit échouer avant).
const MISCHIEF = 'divine:miracle:ranald:ranald-s-mischief';
const actor = (id, caracs, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'foe' ? 'ennemi' : 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4, ...caracs },
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Ranald' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ranald' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (s, id) => s.listParticipants().find(row => row.id === id);
async function fixture() {
  const s = createStore(); await s.ready;
  await s.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'priest', order: ['priest', 'foe'], participants: [actor('priest', {}), actor('foe', { CC: 70, Int: 30, Soc: 25 }, { initiative: 30 })] } });
  return s;
}
const request = (characteristics) => ({ actorId: 'priest', targetIds: ['foe'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  facts: { targets: { foe: { withinRange: true } } }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' },
  ...(characteristics ? { characteristicMatch: { first: characteristics[0], second: characteristics[1] } } : {}) });

test('Malice de Ranald : le contrat n’est plus manuel', () => {
  assert.notEqual(getDivineContract(MISCHIEF).status, 'manual');
});

test('Malice de Ranald : sans les deux Caractéristiques saisies, l’aperçu les demande ; choix invalides refusés', async () => {
  const s = await fixture();
  assert.equal(s.previewDivineExecution(MISCHIEF, request()).ready, false);
  assert.equal(s.previewDivineExecution(MISCHIEF, request(['CC'])).ready, false, 'deux Caractéristiques exigées');
  assert.equal(s.previewDivineExecution(MISCHIEF, request(['CC', 'CC'])).ready, false, 'pas de doublon');
  assert.equal(s.previewDivineExecution(MISCHIEF, request(['CC', 'F'])).ready, true, '9-0 au choix : toute Caractéristique');
});

// Règle complète fournie par le MJ (20 oct.) : « lors de tout Test opposé réalisé spécifiquement contre cet adversaire, deux de vos
// caractéristiques prennent temporairement la même valeur que les siennes ». La fiche ne change pas ; le score du Test opposé est décalé
// de l’écart (adversaire − prêtre) sur la Caractéristique concernée, valeurs lues au moment du Test.
const attack = (s, actorId, targetId, base, id) => s.previewResolution({ resolutionId: id, actorId, targetId, roll: 45,
  action: { type: 'attack', base, attr: 'CC', damage: 3 }, defense: { base: 60, attr: 'CC', roll: 50, v5: { kind: 'melee' } }, v5: { kind: 'melee' } });
test('Malice de Ranald : seulement dans les Tests opposés contre l’adversaire ciblé ; fiche inchangée ; fin et Undo', async () => {
  const s = await fixture();
  const state = JSON.parse(s.getFullJSON());
  state.combat.participants.push({ ...state.combat.participants.find(p => p.id === 'foe'), id: 'foe2', name: 'foe2' }); state.combat.order.push('foe2');
  await s.loadFromJSON(state);
  const preview = s.previewDivineExecution(MISCHIEF, request(['CC', 'Int']));
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await s.applyDivineExecution(MISCHIEF, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(person(s, 'priest').caracs.CC, 40, 'fiche du prêtre inchangée');
  assert.equal(attack(s, 'priest', 'foe', 40, 'a1').test.score, 70, 'attaque contre l’adversaire : CC égalée (40 → 70)');
  assert.equal(attack(s, 'priest', 'foe2', 40, 'a2').test.score, 40, 'autre adversaire : inchangé');
  assert.equal(attack(s, 'foe', 'priest', 60, 'd1').defenderTest.score, 90, 'défense contre l’adversaire : 60 + (70 − 40)');
  assert.equal(attack(s, 'foe2', 'priest', 60, 'd2').defenderTest.score, 60, 'défense contre un autre : inchangée');
  assert.equal(attack(s, 'foe', 'priest', 60, 'd3').test.score, 60, 'le Test de l’adversaire lui-même ne change pas');
  await s.endDivinePrayer(result.receipt.executionId, { reason: 'fin' });
  assert.equal(attack(s, 'priest', 'foe', 40, 'a3').test.score, 40, 'fin de prière');
  await s.undo();
  assert.equal(attack(s, 'priest', 'foe', 40, 'a4').test.score, 70, 'Undo rétablit la prière');
});
});

describe('Protection', () => {
// P5 — Bénédiction de Protection (V5 p.221) : « pour attaquer la cible, chaque ennemi doit réussir un Test de Calme Accessible (+2 DR) ;
// sinon il choisit une autre cible ou Action ». Modèle (comme la Capuche Vengeresse) : le MJ saisit le résultat du Test de l’attaquant
// (`v5.context.protectionCalm = { success }`) ; absent ou échoué, l’attaque n’est pas applicable. Critère écrit avant l’implémentation.
const CULTS = ['myrmidia', 'ranald', 'rhya', 'shallya', 'sigmar', 'handrich'];
const ID = 'divine:blessing:sigmar:protection';
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'foe' ? 'ennemi' : 'pj', zone: 'active', initiative: 60, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Sigmar' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 }, hasMomentum: false } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
async function fixture() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'foe', 'ally'],
    participants: [actor('priest'), actor('ally', { initiative: 20 }), actor('foe', { initiative: 30, talents: [] }), actor('foe2', { camp: 'ennemi', initiative: 10, talents: [] })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'prot' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  const preview = store.previewDivineExecution(ID, { actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 },
    expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, facts: { targets: { ally: { withinRange: true } } } });
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(ID, { preview });
  assert.equal(result.ready, true, result.error);
  await store.nextTurn();
  return { store, result };
}
const hit = (store, targetId, calm, id = 'h', actorId = 'foe') => store.previewResolution({ resolutionId: id, actorId, targetId, roll: 25,
  action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } },
  v5: { kind: 'melee', ...(calm === undefined ? {} : { context: { protectionCalm: { success: calm } } }) } });
const protectionNotes = preview => (preview.unresolved || []).filter(text => /Protection/.test(text));

test('Protection : les six contrats ne sont plus manuels', () => {
  for (const cult of CULTS) assert.notEqual(getDivineContract(`divine:blessing:${cult}:protection`).status, 'manual', cult);
});

test('Protection : sans Test de Calme saisi ou sur un échec, l’attaque contre la cible bénie n’est pas applicable', async () => {
  const { store } = await fixture();
  const missing = hit(store, 'ally');
  assert.equal(protectionNotes(missing).length, 1, 'Test de Calme demandé');
  assert.notEqual((await store.applyResolution(missing)).status, 'applied');
  const failed = hit(store, 'ally', false, 'h2');
  assert.match(protectionNotes(failed)[0] || '', /autre cible|autre Action/i);
  assert.notEqual((await store.applyResolution(failed)).status, 'applied');
  assert.equal(person(store, 'ally').hp, 40, 'aucun dégât');
});

test('Protection : Test de Calme réussi, l’attaque passe ; une cible non bénie n’exige rien ; fin de prière', async () => {
  const { store, result } = await fixture();
  const passed = hit(store, 'ally', true);
  assert.equal(protectionNotes(passed).length, 0);
  assert.equal((await store.applyResolution(passed)).status, 'applied');
  assert.ok(person(store, 'ally').hp < 40);
  assert.equal(protectionNotes(hit(store, 'priest', undefined, 'h3')).length, 0, 'prêtre non béni');
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'fin' });
  assert.equal(protectionNotes(hit(store, 'ally', undefined, 'h4')).length, 0, 'fin de prière');
});

// Arbitrage MJ (20 oct., R31) : un Test de Calme RÉUSSI vaut pour cet ennemi pendant toute la durée ; un échec ne l’engage pas.
test('Protection : un Test réussi vaut pour cet ennemi jusqu’à la fin de la prière, pas pour un autre ; Undo l’oublie', async () => {
  const { store } = await fixture();
  assert.equal((await store.applyResolution(hit(store, 'ally', false, 'f1'))).status !== 'applied', true);
  assert.equal(protectionNotes(hit(store, 'ally', undefined, 'f2')).length, 1, 'un échec n’est pas retenu');
  assert.equal((await store.applyResolution(hit(store, 'ally', true, 'p1'))).status, 'applied');
  assert.equal(protectionNotes(hit(store, 'ally', undefined, 'p2')).length, 0, 'même ennemi : plus de Test');
  assert.equal(protectionNotes(hit(store, 'ally', undefined, 'o1', 'foe2')).length, 1, 'autre ennemi : Test exigé');
  await store.undo();
  assert.equal(protectionNotes(hit(store, 'ally', undefined, 'p3')).length, 1, 'Undo : le Test redevient nécessaire');
});
});

describe('Sauvagerie', () => {
// P5 — Bénédiction de Sauvagerie (p.221) : « Au prochain Coup Critique infligé par la cible, lancer deux fois et garder le meilleur résultat ».
// Arbitrage MJ (19 oct.) : la cible gagne la capacité de Frappe blessante pour son PROCHAIN critique, consommée à ce critique.
const CULTS = ['manann', 'taal', 'ulric'];
const ids = CULTS.map(cult => `divine:blessing:${cult}:savagery`);
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'foe' ? 'ennemi' : 'pj', zone: 'active', initiative: 60, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Taal' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 }, hasMomentum: false } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
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
});

describe('Sauvagerie — consommation', () => {
// Défauts D1 et D2 du contrôle indépendant (19 oct.) : la Bénédiction de Sauvagerie doit être consommée dès que son porteur
// INFLIGE un critique en profitant de Frappe blessante prêtée, y compris (D1) le critique d'une cible secondaire du Tourbillon
// de mort et (D2) le critique infligé en défendant. Critère d'acceptation écrit avant le correctif (doit échouer avant).
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'foe' || id === 'enemy2' ? 'ennemi' : 'pj', zone: 'active', initiative: 60, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Taal' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 }, hasMomentum: false } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const savageryLayers = store => (person(store, 'ally').extensions?.v5?.divineEffects || []).filter(row => row.consumeOn === 'critical').length;
const lentInjure = store => person(store, 'ally').talents.filter(row => row.id === 'talent-strike-to-injure').length;
async function fixture({ allyTalents = [], allyExtra = {}, extra = [] } = {}) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe', ...extra.map(row => row.id)],
    participants: [actor('priest'), actor('ally', { initiative: 50, talents: allyTalents, ...allyExtra }), actor('foe', { initiative: 30, talents: [] }), ...extra] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'sauv' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  const id = 'divine:blessing:taal:savagery';
  const preview = store.previewDivineExecution(id, { actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 },
    expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, facts: { targets: { ally: { withinRange: true } } } });
  assert.equal(preview.ready, true, preview.error);
  assert.equal((await store.applyDivineExecution(id, { preview })).ready, true);
  await store.nextTurn();
  return store;
}

test('D2 : un critique infligé EN DÉFENDANT avec Frappe blessante prêtée consomme la Bénédiction de Sauvagerie', async () => {
  const store = await fixture();
  await store.nextTurn();
  assert.equal(savageryLayers(store), 1);
  const preview = store.previewResolution({ resolutionId: 'dc', actorId: 'foe', targetId: 'ally', action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, roll: 45,
    defense: { base: 60, roll: 22, v5: { kind: 'melee', talentChoices: { 'injure:first': true } } }, v5: { kind: 'melee' },
    criticalRolls: { location: 2, effect: 80 }, defenderCriticalRolls: { location: 2, effect: 80, injureEffect: 20 } });
  assert.equal(preview.defenderCritical?.details?.effectRollBase, 20, 'la Frappe blessante prêtée sert bien au critique défensif');
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  assert.equal(savageryLayers(store), 0, 'bénédiction consommée');
  assert.equal(lentInjure(store), 0, 'talent prêté retiré');
  await store.undo();
  assert.equal(savageryLayers(store), 1, 'Undo la restaure');
});

test('D1 : un critique de Tourbillon de mort sur une cible secondaire consomme la Bénédiction de Sauvagerie', async () => {
  const store = await fixture({ allyTalents: [{ id: 'talent-whirlwind-of-death', status: 'resolved', rank: 1 }],
    extra: [actor('enemy2', { hp: 1, maxHp: 40, initiative: 10 })], allyExtra: { extensions: { v5: { divine: { sin: 0 }, hasMomentum: false, resourceCharacterId: 'ra' } } } });
  await store.setFortune('ally', 2);
  const preview = store.previewResolution({ resolutionId: 'ww', actorId: 'ally', targetId: 'foe', roll: 22,
    action: { type: 'attack', base: 60, attr: 'CC', damage: 5, qualities: ['inoffensive'] }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } },
    v5: { kind: 'melee', context: { specialAttack: 'whirlwind-of-death', engagedIds: ['foe', 'enemy2'], allEngagedIncluded: true,
      whirlwindRolls: { enemy2: { secondEffect: 80, secondEffectAlternative: 70, injureSecondEffect: 20, injureSecondEffectAlternative: 30 } },
      whirlwindChoices: { enemy2: { 'injure:second': true } } } } });
  const secondary = (preview.secondaryTargets || []).find(row => row.critical?.second);
  assert.equal(secondary?.critical?.second?.effectRollBase, 20, 'la Frappe blessante prêtée sert au critique secondaire');
  await store.applyResolution(preview);
  assert.equal(savageryLayers(store), 0, 'bénédiction consommée');
  assert.equal(lentInjure(store), 0, 'talent prêté retiré');
});

test('Non-régression : un critique SUBI par le porteur ne consomme rien', async () => {
  const store = await fixture();
  await store.nextTurn();
  const preview = store.previewResolution({ resolutionId: 'hit', actorId: 'foe', targetId: 'ally', action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, roll: 22,
    defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, criticalRolls: { location: 2, effect: 80 } });
  await store.applyResolution(preview);
  assert.equal(savageryLayers(store), 1);
});
});

describe('Sauvagerie — sorts', () => {
// Résiduel P5 : la Bénédiction de Sauvagerie (« la prochaine Blessure Critique infligée par la cible ») doit aussi prendre fin
// quand son porteur inflige une Blessure Critique d'incantation (choix « critical-wound » d'un sort de dégâts).
// Critère d'acceptation écrit avant le correctif (doit échouer avant).
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'foe' ? 'ennemi' : 'pj', zone: 'active', initiative: 60, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }, { name: 'Langue (Magick)', total: 70 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Taal' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 }, hasMomentum: false, magic: { reserve: { type: 'winds', sl: 0 } } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const savageryLayers = (store, id = 'ally') => (person(store, id).extensions?.v5?.divineEffects || []).filter(row => row.consumeOn === 'critical').length;
async function fixture(blessed = 'ally') {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
    participants: [actor('priest'), actor('ally', { initiative: 50 }), actor('foe', { initiative: 30, talents: [] })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'sauv-spell' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  const id = 'divine:blessing:taal:savagery';
  const preview = store.previewDivineExecution(id, { actorId: 'priest', targetIds: [blessed], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 },
    expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, facts: { targets: { [blessed]: { withinRange: true } } } });
  assert.equal(preview.ready, true, preview.error);
  assert.equal((await store.applyDivineExecution(id, { preview })).ready, true);
  await store.nextTurn();
  return store;
}
const bolt = (actorId, targetId, extra = {}) => ({ actorId, targetIds: [targetId], roll: 22, miscastRoll: 15, ...extra });

test('Une Blessure Critique d\'incantation infligée par le porteur consomme la Bénédiction de Sauvagerie (Undo la restaure)', async () => {
  const store = await fixture();
  assert.equal(savageryLayers(store), 1);
  const preview = store.previewSpellExecution('Carreau', bolt('ally', 'foe', { criticalChoice: 'critical-wound' }));
  assert.equal(preview.valid, true, preview.error);
  assert.equal(preview.targetResults[0].criticalWoundTriggered, true);
  await store.applySpellExecution('Carreau', bolt('ally', 'foe', { criticalChoice: 'critical-wound' }));
  assert.equal((person(store, 'foe').extensions?.v5?.criticalWounds || []).length, 1, 'critique posé sur la cible');
  assert.equal(savageryLayers(store), 0, 'bénédiction consommée');
  assert.equal(person(store, 'ally').talents.filter(row => row.id === 'talent-strike-to-injure').length, 0, 'talent prêté retiré');
  await store.undo();
  assert.equal(savageryLayers(store), 1, 'Undo la restaure');
});

test('Non-régression : un sort critique sans Blessure Critique (Force irrésistible) ne consomme rien', async () => {
  const store = await fixture();
  await store.applySpellExecution('Carreau', bolt('ally', 'foe', { criticalChoice: 'unstoppable-force' }));
  assert.equal(savageryLayers(store), 1);
});

test('Non-régression : une Blessure Critique d\'incantation SUBIE par le porteur ne consomme rien', async () => {
  const store = await fixture('foe');
  await store.nextTurn();
  assert.equal(savageryLayers(store, 'foe'), 1);
  await store.applySpellExecution('Carreau', bolt('ally', 'foe', { criticalChoice: 'critical-wound' }));
  assert.equal((person(store, 'foe').extensions?.v5?.criticalWounds || []).length, 1);
  assert.equal(savageryLayers(store, 'foe'), 1);
});
});

describe('Souffle', () => {
// P5 — Bénédiction de Souffle (V5 p.221) : « la cible n'a pas besoin de respirer et ignore les règles d'Étouffement ».
// Effet déclaratif `doesNotBreathe` (état spécial) lu par le lecteur d'étouffement des sorts ; critère écrit avant l'implémentation.
const BREATH = 'divine:blessing:manann:breath';
const SHADOWS = () => contracts.find(c => c.canonicalName === 'Choking Shadows');
const priest = { id: 'priest', name: 'priest', kind: 'PJ', camp: 'pj', zone: 'active', initiative: 40, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Manann' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } } };
// Le Magister jette Ombres Étouffantes sur « foe » (1 B), le prêtre peut bénir.
async function fixture() {
  const { store, engine } = await encounter({ foe: { hp: 1, caracs: { CC: 50, CT: 50, F: 40, E: 10, I: 50, Ag: 50, Dex: 50, Int: 60, FM: 60, Soc: 50, M: 4 } } });
  await cast(store, SHADOWS());
  const state = JSON.parse(store.getFullJSON());
  state.combat.participants.push(structuredClone(priest)); state.combat.order = ['mage', 'priest', 'foe'];
  await store.loadFromJSON(state);
  return { store, engine };
}
const bless = async store => {
  const preview = store.previewDivineExecution(BREATH, { actorId: 'priest', targetIds: ['foe'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 },
    expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, facts: { targets: { foe: { withinRange: true } } } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(BREATH, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
};
const rounds = async (engine, count) => { for (let i = 0; i < count * 3; i++) await endTurn(engine); };

test('Souffle : le contrat n’est plus manuel et déclare « ne respire pas »', () => {
  const contract = getDivineContract(BREATH);
  assert.notEqual(contract.status, 'manual');
  assert.deepEqual(contract.effects.map(effect => effect.type), ['special-state']);
  assert.equal(contract.effects[0].doesNotBreathe, true);
  assert.match(contract.labels.effect, /noyade.*fumée/i, 'rappel MJ pour les situations non modélisées');
});

test('Souffle : la cible bénie ne s’étouffe pas ; à l’expiration l’étouffement reprend ; Undo restaure', async () => {
  const { store, engine } = await fixture();
  const result = await bless(store);
  assert.equal(subject(store, 'foe').extensions.v5.specialStates.doesNotBreathe, true);
  await rounds(engine, 3);
  assert.equal(subject(store, 'foe').hp, 1, 'aucune Blessure d’étouffement');
  assert.equal(level(subject(store, 'foe'), 'Inconscient'), 0);
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'fin' });
  assert.equal(subject(store, 'foe').extensions.v5.specialStates?.doesNotBreathe, undefined);
  await rounds(engine, 2);
  assert.equal(subject(store, 'foe').hp, 0, 'l’étouffement a repris');
});

test('Souffle : Undo retire la protection', async () => {
  const { store, engine } = await fixture();
  await bless(store);
  await store.undo();
  assert.equal(subject(store, 'foe').extensions.v5.specialStates?.doesNotBreathe, undefined);
  await rounds(engine, 1);
  assert.equal(subject(store, 'foe').hp, 0);
});

test('Non-régression : sans bénédiction, la cible s’étouffe comme avant', async () => {
  const { store, engine } = await fixture();
  await rounds(engine, 2);
  assert.equal(subject(store, 'foe').hp, 0);
  assert.equal(level(subject(store, 'foe'), 'Inconscient'), 1);
});
});

describe('Ténacité', () => {
// P5 T2 — Bénédiction de Ténacité (p.221) : « la cible retire 1 État (sauf Souillé) ».
// Arbitrage MJ (19 oct.) : tout État sauf Souillé et les États verrouillés / à cause persistante (comme Secours de Rhya).
// Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const TENACITY = ['manann', 'morr', 'shallya', 'ulric', 'solkan'].map(cult => `divine:blessing:${cult}:tenacity`);
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Morr' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const states = [{ id: 'st-souille', key: 'souille', name: 'Souillé', level: 1 }, { id: 'st-aveugle', key: 'aveugle', name: 'Aveuglé', level: 1 }];
async function fixture() {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [
    actor('priest'), actor('ally', { initiative: 30, states: clone(states) })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const input = (stateId, more = {}) => ({ actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0 },
  facts: { targets: { ally: { withinRange: true } } }, removals: { ally: { stateId } }, ...more });
const keys = participant => (participant.states || []).map(row => row.key).sort();

test('Ténacité : les cinq contrats retirent 1 État choisi, Souillé exclu, libellé « Souillé »', () => {
  for (const id of TENACITY) {
    const contract = getDivineContract(id);
    assert.ok(contract, id);
    assert.notEqual(contract.status, 'manual', id);
    assert.deepEqual(contract.effects.map(effect => ({ type: effect.type, chosen: effect.chosen, amount: effect.amount, excludeKeys: effect.excludeKeys })),
      [{ type: 'remove-condition', chosen: true, amount: 1, excludeKeys: ['souille'] }], id);
    assert.match(contract.labels.effect, /Souillé/, id);
    assert.doesNotMatch(contract.labels.effect, /Entaché/, id);
  }
});

test('Ténacité : choisir Souillé est refusé à l’aperçu ; aucun choix est demandé', async () => {
  const store = await fixture();
  const refused = store.previewDivineExecution(TENACITY[1], input('st-souille'));
  assert.equal(refused.ready, false);
  assert.ok(refused.needsInput.some(row => row.field === 'removals.ally.stateId'), JSON.stringify(refused.needsInput));
  const missing = store.previewDivineExecution(TENACITY[1], input(undefined, { removals: {} }));
  assert.equal(missing.ready, false);
  assert.ok(missing.needsInput.some(row => row.field === 'removals.ally.stateId'));
  assert.deepEqual(keys(person(store, 'ally')), ['aveugle', 'souille'], 'aucune mutation à l’aperçu');
});

test('Ténacité : Aveuglé retiré, Souillé conservé ; Undo/Redo', async () => {
  const store = await fixture();
  const preview = store.previewDivineExecution(TENACITY[1], input('st-aveugle'));
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(TENACITY[1], { preview });
  assert.equal(result.ready, true, result.error);
  assert.deepEqual(keys(person(store, 'ally')), ['souille']);
  await store.undo();
  assert.deepEqual(keys(person(store, 'ally')), ['aveugle', 'souille']);
  await store.redo();
  assert.deepEqual(keys(person(store, 'ally')), ['souille']);
});

test('Non-régression : Secours de Rhya (sans exclusion) peut toujours retirer un État quelconque', () => {
  const succour = getAllDivineContracts().find(row => row.type === 'miracle' && row.effects?.some(effect => effect.type === 'remove-condition' && effect.chosen && effect.onAllRemoved));
  assert.ok(succour, 'Secours de Rhya présent');
  assert.equal(succour.effects.find(effect => effect.type === 'remove-condition').excludeKeys, undefined);
});
});

describe('Terrain Mortel', () => {
// P5 T5 — Sur un Terrain Mortel (Up in Arms p.79, décisions MJ Q6/Q7) : les alliés désignés, prêtre compris, ne reçoivent pas
// l'État Brisé tant que le miracle dure ; les Brisé déjà acquis restent. Nouveau type d'effet générique `grant-immunity`.
// Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const TERRAIN = () => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === 'Sur un Terrain Mortel');
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
async function fixture() {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'other'], participants: [
    actor('priest'), actor('ally', { initiative: 30, states: [{ id: 'st-b', key: 'brise', name: 'Brisé', level: 1 }] }), actor('other', { initiative: 20 })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const brokenLevel = participant => (participant.states || []).filter(row => row.key === 'brise').reduce((sum, row) => sum + (row.level || 1), 0);

test('grant-immunity : type déclaré, contrat assisté avec un effet d’immunité à Brisé', () => {
  assert.ok(effectTypes.has('grant-immunity'));
  const contract = TERRAIN();
  assert.ok(contract);
  assert.equal(contract.status, 'assisted');
  assert.deepEqual(contract.effects.map(effect => ({ type: effect.type, conditions: effect.conditions })), [{ type: 'grant-immunity', conditions: ['Brisé'] }]);
  assert.ok(contract.clauses.some(row => row.id === 'no-broken' && row.mode === 'engine'));
  assert.ok(contract.clauses.some(row => row.id === 'duration-unattested' && row.mode === 'manual'), 'la durée non attestée reste signalée');
});

test('Sur un Terrain Mortel : les cibles désignées (prêtre compris) n’acquièrent plus Brisé ; les Brisé existants restent ; fin et Undo', async () => {
  const store = await fixture();
  const contract = TERRAIN();
  const input = { actorId: 'priest', targetIds: ['priest', 'ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 },
    expiry: { phase: 'endOfTurn', round: 5, actorId: 'priest' }, facts: { targets: { priest: { withinRange: true }, ally: { withinRange: true } } } };
  const preview = store.previewDivineExecution(contract.id, input);
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(contract.id, { preview });
  assert.equal(result.ready, true, result.error);
  for (const id of ['priest', 'ally']) {
    const before = person(store, id);
    const after = acquireV5Conditions(before, ['Brisé']).participant;
    assert.equal(brokenLevel(after), brokenLevel(before), `${id} : aucun Brisé acquis`);
  }
  assert.equal(brokenLevel(person(store, 'ally')), 1, 'le Brisé déjà acquis reste');
  const other = person(store, 'other');
  assert.equal(brokenLevel(acquireV5Conditions(other, ['Brisé']).participant), 1, 'non-cible : Brisé acquis normalement');
  await store.undo();
  assert.equal(brokenLevel(acquireV5Conditions(person(store, 'priest'), ['Brisé']).participant), 1, 'Undo retire l’immunité');
  await store.redo();
  // Un allié déjà Brisé bloque le passage de Tour (fuite obligatoire) : la fin d'effet passe par « Terminer la prière ».
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'fin' });
  assert.equal(brokenLevel(acquireV5Conditions(person(store, 'priest'), ['Brisé']).participant), 1, 'immunité retirée à la fin de la prière');
});

test('Non-régression : sans couche, acquérir Brisé fonctionne comme avant', async () => {
  const store = await fixture();
  assert.equal(brokenLevel(acquireV5Conditions(person(store, 'priest'), ['Brisé']).participant), 1);
});
});

describe('Morsure du Loup', () => {
// P5 — Morsure du Loup (Ulric, Power Behind the Throne Companion p.50) : +20 au jet de gravité de toute Blessure Critique que le
// prêtre inflige pendant la durée (attaque ou défense). Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const WOLF = 'divine:miracle:ulric:wolf-s-bite';
const fighter = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 20, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 40, M: 4 },
  equipment: [], traits: [], states: [], talents: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const priest = () => fighter('priest', { kind: 'PJ', camp: 'pj', initiative: 60, caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Ulric' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ulric' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  extensions: { v5: { divine: { sin: 0 }, hasMomentum: false } } });
async function fixture() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'foe'], participants: [priest(), fighter('foe')] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'wolf' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
async function invoke(store) {
  const preview = store.previewDivineExecution(WOLF, { actorId: 'priest', targetIds: ['priest'], roll: 45, canSpeak: true, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' },
    choices: { range: 0, targets: 0, duration: 0, effect: 0 }, facts: { targets: { priest: { withinRange: true, withinTouch: true } } } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(WOLF, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}
// Le prêtre attaque et inflige un critique (double 22), gravité saisie 50.
const priestAttack = store => store.previewResolution({ resolutionId: 'pa', actorId: 'priest', targetId: 'foe', roll: 22,
  action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' },
  criticalRolls: { location: 2, effect: 50 } });
// L'ennemi attaque ; le prêtre défend avec un critique (double 22).
const foeAttack = (store, defenderCrit) => store.previewResolution({ resolutionId: 'fa', actorId: 'foe', targetId: 'priest', roll: defenderCrit ? 45 : 22,
  action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, defense: { base: 60, roll: defenderCrit ? 22 : 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' },
  criticalRolls: { location: 2, effect: 50 }, defenderCriticalRolls: { location: 2, effect: 50 } });

test('Morsure du Loup : le contrat n’est plus manuel', () => {
  assert.notEqual(getDivineContract(WOLF).status, 'manual');
});

test('Morsure du Loup : +20 à la gravité des critiques infligés en attaque et en défense, pas à ceux subis ; fin de prière et Undo', async () => {
  const store = await fixture();
  const baseAttack = priestAttack(store).critical.details;
  const baseDefense = foeAttack(store, true).defenderCritical.details;
  const baseSuffered = foeAttack(store, false).critical.details;
  assert.equal(baseAttack.effectRollBase, 50);
  const result = await invoke(store);
  assert.equal(priestAttack(store).critical.details.effectRoll, baseAttack.effectRoll + 20, 'critique infligé en attaque');
  assert.equal(foeAttack(store, true).defenderCritical.details.effectRoll, baseDefense.effectRoll + 20, 'critique infligé en défense');
  assert.equal(foeAttack(store, false).critical.details.effectRoll, baseSuffered.effectRoll, 'critique subi inchangé');
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'fin' });
  assert.equal(priestAttack(store).critical.details.effectRoll, baseAttack.effectRoll, 'fin de prière');
  await store.undo();
  assert.equal(priestAttack(store).critical.details.effectRoll, baseAttack.effectRoll + 20, 'Undo rétablit la prière');
  await store.undo();
  assert.equal(priestAttack(store).critical.details.effectRoll, baseAttack.effectRoll, 'Undo annule l’invocation');
});
});

describe('asphyxie', () => {
// R25 — Ombres Étouffantes : une cible tombée à 0 Blessure dans le nuage meurt après BE Rounds d'étouffement à 0 (compteur
// `suffocationZeroRounds` de v5-magic-turn.js). Défaut : les cibles à 0 Blessure étaient sautées avant le compteur, la mort
// n'arrivait jamais. Critère d'acceptation écrit avant le correctif (doit échouer avant).
const SHADOWS = () => contracts.find(c => c.canonicalName === 'Choking Shadows');
const dead = store => subject(store, 'foe').extensions?.v5?.dead === true;
async function fixture(E = 30) {
  const { store, engine } = await encounter({ foe: { hp: 1, caracs: { CC: 50, CT: 50, F: 40, E, I: 50, Ag: 50, Dex: 50, Int: 60, FM: 60, Soc: 50, M: 4 } } });
  await cast(store, SHADOWS());
  return { store, engine };
}
const rounds = async (engine, count) => { for (let i = 0; i < count * 2; i++) await endTurn(engine); };

test('R25 : à 0 Blessure dans le nuage, la cible (BE 3) meurt après 3 Rounds d’étouffement, pas avant ; Undo la ramène', async () => {
  const { store, engine } = await fixture(30);
  await rounds(engine, 1);
  assert.equal(subject(store, 'foe').hp, 0);
  assert.equal(level(subject(store, 'foe'), 'Inconscient'), 1);
  assert.equal(dead(store), false, 'pas morte en tombant à 0');
  await rounds(engine, 2);
  assert.equal(dead(store), false, 'pas morte après 2 Rounds à 0');
  await rounds(engine, 1);
  assert.equal(dead(store), true, 'morte d’asphyxie au 3e Round à 0');
  await store.undo();
  assert.equal(dead(store), false, 'Undo annule la mort');
});

test('R25 : BE 1, la mort arrive au premier Round passé à 0', async () => {
  const { store, engine } = await fixture(10);
  await rounds(engine, 1);
  assert.equal(dead(store), false);
  await rounds(engine, 1);
  assert.equal(dead(store), true, 'morte au 1er Round à 0');
});
});

describe('prières corrigées en v3', () => {
// Livre de base V5 EN v3 pp.223-228 : Masque mortuaire, Frisson du givre, Grâce de Ranald, Dent et griffe, Jugement du Roi de la neige.
const prayer = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === name);
const clause = (contract, id) => contract.clauses.find(row => row.id === id);
const withoutDelta = contract => JSON.stringify({ ...contract, sourceDelta: undefined });

test('v3 Masque mortuaire : Peur (2), l’ancien arbitrage Peur (1) disparaît', () => {
  const mask = prayer('Masque mortuaire');
  assert.deepEqual(mask.effects.find(effect => effect.type === 'grant-trait').traits, ['Peur (2)']);
  assert.match(clause(mask, 'fear').text, /Peur \(2\)/);
  assert.doesNotMatch(withoutDelta(mask), /Peur \(1\)/);
});

test('v3 Frisson du givre : Peur (2) et perte d’Élan au lieu d’Avantage', () => {
  const chill = prayer('Frisson du givre');
  assert.deepEqual(chill.effects.find(effect => effect.type === 'grant-trait').traits, ['Peur (2)']);
  assert.match(clause(chill, 'momentum-loss').text, /perdent leur Élan/);
  assert.equal(clause(chill, 'advantage-loss'), undefined);
  assert.doesNotMatch(withoutDelta(chill), /Avantage|Peur \(1\)/);
});

test('v3 Grâce de Ranald : durée en minutes', () => {
  assert.deepEqual(prayer('Grâce de Ranald').params.duration, { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'minutes' });
});

test('v3 Dent et griffe : Morsure et Magique, mains nues dangereuses, plus de Trait Arme', () => {
  const tooth = prayer('Dent et griffe');
  const actions = tooth.effects.find(effect => effect.type === 'grant-actions').actions;
  assert.deepEqual(actions.map(action => [action.name, action.damageFormula]), [['Morsure', 'BF+3']]);
  assert.equal(tooth.effects.find(effect => effect.type === 'weapon-bonus').magical, true);
  assert.match(clause(tooth, 'unarmed-damaging').text, /mains nues.*Inoffensives/);
  assert.equal(clause(tooth, 'weapon'), undefined);
  assert.doesNotMatch(withoutDelta(tooth), /BF\+4|Bonus de Force \+ 4/);
});

test('v3 Jugement du Roi de la neige : ignore BE et PA et inflige Sonné', () => {
  const judgement = prayer('Jugement du Roi de la neige');
  const stun = judgement.effects.find(effect => effect.type === 'condition');
  assert.equal(stun.key, 'Stunned');
  assert.equal(stun.when.fact, 'judgement');
  assert.ok(judgement.effects.some(effect => effect.type === 'direct-damage'));
  assert.match(clause(judgement, 'stunned').text, /Sonné/);
  assert.equal(clause(judgement, 'redirect-stunned').mode, 'manual');
});
});
