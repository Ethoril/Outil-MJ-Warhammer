import test, { after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts, finalizeDivineState } from '../../../js/core/v5-divine-store.js';
import registry from '../../../js/data/v5-divine-contracts.json' with { type: 'json' };
import { previewDivineExecution, applyDivineExecution } from '../../../js/core/v5-divine-engine.js';
import { effectTypes, calendarDurationUnits, paramKinds, paramUnits, targetRuleFacts, targetRuleFactFields } from '../../../js/core/v5-divine-grammar.js';
import { effectHandlers, validateEffect, effectNeeds, progressionError, hasImplicitCasterTarget } from '../../../js/core/v5-divine-effect-handlers.js';
import { buildDivineForm, emptyDivineForm, setFieldValue, toEngineInput, classifyNeeds, targetFactFields, describeEffectResult, summonLayerLabel, describeDivineForm, FACT_FIELDS, extensionFields, fieldValue, formWarnings, summarizeExecution, deadlineLines, prayerDurationRounds, buildExpiry, formatCampaignTime, sourceText } from '../../../js/ui/v5-divine-form-model.js';
import { buildCombatTest } from '../../../js/core/v5-combat-rules.js';

const clone = value => structuredClone(value);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };

describe('P4a — socle des effets', () => {
// Socle P4a : statut assisted, grammaire C7 (miles, touch, zone entière, force d'État), échéances calendaires C9.
const SEA_LEGS = 'divine:miracle:manann:sea-legs';
const { schemaVersion: _s, sourceFingerprint: _f, ...base } = getDivineContract(SEA_LEGS);
const calendarDuration = unit => ({ value: null, sourceParameter: 'params.duration', unit, requiresResolvedExpiry: true });
const registered = [];
// Contrats d'essai : copie d'un contrat canonique (source, talent, extensions), seuls statut, paramètres et effets changent.
function synthetic(key, { status = 'assisted', params, effects = [], targetRules = [] }) {
  const id = `divine:miracle:manann:test-${key}`;
  const contract = { ...clone(base), id, name: `Essai ${key}`, catalogueName: `Essai ${key}`, canonicalName: `Test ${key}`, status, params, effects, targetRules,
    clauses: [{ id: 'effect', mode: 'engine', text: 'Effet moteur.', sourceRef: 'test' }, { id: 'rest', mode: 'manual', text: 'Reste laissé au MJ.', sourceRef: 'test' }], needsInput: [] };
  registry.contracts.push(contract); registered.push(id);
  return id;
}
after(() => { registry.contracts = registry.contracts.filter(row => !registered.includes(row.id)); });
const self = { range: { kind: 'self' }, targets: { kind: 'self' } };
const HOURS = synthetic('hours', { params: { ...self, duration: { kind: 'fixed', value: 2, unit: 'hours' } },
  effects: [{ type: 'characteristic-modifier', characteristic: 'CC', value: 10, duration: calendarDuration('hours') }] });
const MINUTES = synthetic('minutes', { params: { ...self, duration: { kind: 'fixed', value: 1, unit: 'minutes' } },
  effects: [{ type: 'characteristic-modifier', characteristic: 'CC', value: 10, duration: calendarDuration('minutes') }] });
const TOUCH = synthetic('touch', { status: 'manual', params: { range: { kind: 'touch' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'instant' } } });
const MILES = synthetic('miles', { status: 'manual', params: { range: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'miles' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'instant' } } });
const AREA = synthetic('area', { status: 'manual', params: { range: { kind: 'self' }, targets: { kind: 'area', characteristic: 'Soc', unit: 'yards' }, duration: { kind: 'instant' } } });
const MOVE = synthetic('move', { params: { range: { kind: 'special' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'fixed', value: 6, unit: 'rounds' } },
  effects: [{ type: 'characteristic-modifier', characteristic: 'M', value: 2, duration: { value: 6, unit: 'rounds' } }] });
const PROGRESSION = synthetic('progression', { params: { range: { kind: 'special' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'fixed', value: 6, unit: 'rounds' } },
  effects: [{ type: 'characteristic-modifier', characteristic: 'CC', value: 10, duration: { value: 6, unit: 'rounds' }, perSuccessLevels: { every: 2, add: 5, field: 'value' } }] });
const STRENGTH = synthetic('strength', { params: { range: { kind: 'special' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'fixed', value: 6, unit: 'rounds' } },
  effects: [{ type: 'condition', key: 'Blinded', strengthFrom: { kind: 'characteristic-bonus', characteristic: 'Soc' }, duration: { value: 6, unit: 'rounds' } }] });

const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Manann' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Manann' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const stateOf = store => { const value = JSON.parse(store.getFullJSON()); delete value.exportedAt; return value; };
const person = (store, id) => store.listParticipants().find(row => row.id === id);
async function fixture({ clock = true, ally = {} } = {}) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [actor('priest'), actor('ally', { initiative: 30, ...ally })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  if (clock) snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const input = (more = {}) => ({ actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  facts: { targets: { ally: { withinRange: true, athleticsFailed: false } } }, ...more });
const selfInput = (more = {}) => input({ targetIds: [], ...more });
const step = (store, seconds) => store.advanceCampaignTime({ seconds, reason: 'Temps MJ du socle P4a' });
const layers = (store, id) => person(store, id).extensions.v5.divineEffects || [];

test('assisted : Mer déchaînée applique ses trois États et expose les clauses restantes en rappels MJ', async () => {
  const contract = getDivineContract(SEA_LEGS);
  assert.equal(contract.status, 'assisted');
  const store = await fixture(), preview = store.previewDivineExecution(SEA_LEGS, input({ expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' } }));
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.status, 'ready');
  assert.ok(preview.preview.reminders.some(text => /Athlétisme/.test(text)), 'la clause manuelle sort en rappel');
  assert.ok(!preview.preview.reminders.some(text => /gagne 1 État Aveuglé/.test(text)), 'une clause moteur n’est pas un rappel');
  const result = await store.applyDivineExecution(SEA_LEGS, { preview });
  assert.equal(result.ready, true, result.error);
  assert.deepEqual(person(store, 'ally').states.map(row => row.key).sort(), ['assourdi', 'aveugle', 'extenue']);
  assert.equal(new Set(layers(store, 'ally').map(row => row.id)).size, 3, 'trois couches aux identifiants distincts');
  assert.equal(result.receipt.appliedEffectIds.length, 3);
  assert.ok(result.receipt.reminders.some(text => /Athlétisme/.test(text)));
  for (let i = 0; i < 12; i++) await store.nextTurn();
  assert.deepEqual(person(store, 'ally').states, [], 'la fin de l’effet retire les trois États');
  assert.equal(layers(store, 'ally').length, 0);
});

test('durée en heures : couche à échéance calendaire, retirée par le temps de campagne, Undo la restitue', async () => {
  const store = await fixture(), preview = store.previewDivineExecution(HOURS, selfInput());
  assert.equal(preview.ready, true, preview.error);
  assert.deepEqual(preview.input.clockAnchor.campaignSeconds, 0);
  await store.applyDivineExecution(HOURS, { preview });
  const [layer] = layers(store, 'priest');
  assert.deepEqual(layer.deadline, { kind: 'campaign-time', atSeconds: 7200 });
  assert.equal(layer.expiry, null);
  assert.equal(person(store, 'priest').caracs.CC, 50);
  assert.equal((await step(store, 7199)).status, 'applied');
  assert.equal(layers(store, 'priest').length, 1);
  const before = stateOf(store), result = await step(store, 1);
  assert.equal(result.status, 'applied');
  assert.deepEqual(result.processedSubjects.map(row => row.expiredEffectId), [layer.id]);
  assert.equal(layers(store, 'priest').length, 0);
  assert.equal(person(store, 'priest').caracs.CC, 40, 'les valeurs effectives sont recalculées');
  await store.undo();
  const restored = stateOf(store);
  assert.deepEqual(restored.combat, before.combat);
  assert.deepEqual(restored.extensions.v5.gameClock, before.extensions.v5.gameClock);
  assert.equal(layers(store, 'priest').length, 1);
  assert.equal(person(store, 'priest').caracs.CC, 50);
});

test('durée en minutes en combat : expire au Round où les 60 secondes sont écoulées', async () => {
  const store = await fixture(), preview = store.previewDivineExecution(MINUTES, selfInput());
  assert.equal(preview.ready, true, preview.error);
  await store.applyDivineExecution(MINUTES, { preview });
  assert.equal(layers(store, 'priest')[0].deadline.atSeconds, 60);
  for (let i = 0; i < 11; i++) await store.nextTurn();
  assert.equal(store.getCombat().round, 6);
  assert.equal(layers(store, 'priest').length, 1, 'cinq Rounds écoulés : 50 secondes');
  await store.nextTurn();
  assert.equal(store.getCombat().round, 7);
  assert.equal(layers(store, 'priest').length, 0, 'six Rounds écoulés : 60 secondes');
  assert.equal(person(store, 'priest').caracs.CC, 40);
});

test('sans horloge de jeu : needs-input, aucune échéance inventée ni mutation', async () => {
  const store = await fixture(), ready = store.previewDivineExecution(HOURS, selfInput());
  assert.equal(ready.ready, true, ready.error);
  // Le Store crée toujours une horloge au chargement : l'absence d'ancre est simulée sur l'entrée du moteur.
  const withoutClock = { ...clone(ready.input), clockAnchor: null }, state = stateOf(store), before = clone(state);
  const contract = getDivineContract(HOURS), priest = state.combat.participants.find(row => row.id === 'priest');
  const preview = previewDivineExecution(priest, contract, [], withoutClock);
  assert.equal(preview.ready, false);
  assert.ok(preview.needsInput.some(row => row.field === 'clockAnchor'), JSON.stringify(preview.needsInput));
  const applied = applyDivineExecution(state, contract, { ...withoutClock, executionId: 'no-clock-1' });
  assert.equal(applied.ready, false);
  assert.ok(applied.needsInput.some(row => row.field === 'clockAnchor'));
  assert.deepEqual(state, before);
  assert.ok(!JSON.stringify(applied.state).includes('deadline'));
});

test('portée Contact : fait withinTouch exigé, aucune extension de portée', async () => {
  const store = await fixture();
  let preview = store.previewDivineExecution(TOUCH, input({ roll: 25 }));
  assert.equal(preview.ready, false);
  assert.ok(preview.needsInput.some(row => row.field === 'facts.targets.ally.withinTouch'), JSON.stringify(preview.needsInput));
  preview = store.previewDivineExecution(TOUCH, input({ roll: 25, facts: { targets: { ally: { withinTouch: false } } } }));
  assert.equal(preview.ready, false);
  preview = store.previewDivineExecution(TOUCH, input({ roll: 25, facts: { targets: { ally: { withinTouch: true } } }, choices: { range: 1, targets: 0, duration: 0, effect: 0 } }));
  assert.equal(preview.ready, false);
  assert.match(preview.error, /Contact/);
  preview = store.previewDivineExecution(TOUCH, input({ roll: 25, facts: { targets: { ally: { withinTouch: true } } } }));
  assert.equal(preview.ready, true, preview.error);
  assert.deepEqual(preview.preview.resolvedParams.range, { value: 0, unit: 'touch' });
  preview = store.previewDivineExecution(TOUCH, input({ roll: 25, targetIds: [] }));
  assert.equal(preview.ready, false, 'le Contact exige une cible explicite');
});

test('portée en miles : Bonus de caractéristique résolu et étendu sans conversion', async () => {
  const store = await fixture();
  const preview = store.previewDivineExecution(MILES, input({ roll: 25, choices: { range: 1, targets: 0, duration: 0, effect: 0 } }));
  assert.equal(preview.ready, true, preview.error);
  assert.deepEqual(preview.preview.resolvedParams.range, { value: 12, unit: 'miles', characteristic: 'Soc' });
  assert.ok(!calendarDurationUnits.has('miles') && paramUnits.has('miles'));
});

test('zone en caractéristique entière : Sociabilité yards, non son Bonus', async () => {
  const store = await fixture();
  const preview = store.previewDivineExecution(AREA, input({ roll: 25, facts: { targets: { ally: { withinRange: true } } } }));
  assert.equal(preview.ready, true, preview.error);
  assert.deepEqual(preview.preview.resolvedParams.targets, { value: 60, unit: 'yards', characteristic: 'Soc' });
});

test('Mouvement inconnu : un modificateur de M bloque l’aperçu au lieu d’inventer une valeur', async () => {
  const { M: _m, ...withoutMovement } = actor('x').caracs;
  const store = await fixture({ ally: { caracs: withoutMovement } });
  const blocked = store.previewDivineExecution(MOVE, input({ expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' } }));
  assert.equal(blocked.ready, false);
  assert.ok(blocked.needsInput.some(row => row.field === 'targets.ally.caracs.M'), JSON.stringify(blocked.needsInput));
  const known = await fixture();
  const preview = known.previewDivineExecution(MOVE, input({ expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' } }));
  assert.equal(preview.ready, true, preview.error);
  await known.applyDivineExecution(MOVE, { preview });
  assert.equal(person(known, 'ally').caracs.M, 6);
});

test('perSuccessLevels {every, add, field} et strengthFrom résolus à l’aperçu', async () => {
  const store = await fixture(), expiry = { phase: 'endOfTurn', round: 6, actorId: 'priest' };
  const progressive = store.previewDivineExecution(PROGRESSION, input({ roll: 25, expiry }));
  assert.equal(progressive.ready, true, progressive.error);
  assert.equal(progressive.preview.effects[0].value, 20, '10 + 5 par tranche de 2 DR (SL 4) sur value');
  const strong = store.previewDivineExecution(STRENGTH, input({ expiry }));
  assert.equal(strong.ready, true, strong.error);
  assert.equal(strong.preview.effects[0].level, 6, 'Bonus de Sociabilité');
  await store.applyDivineExecution(STRENGTH, { preview: strong });
  assert.equal(person(store, 'ally').states.find(row => row.key === 'aveugle').level, 6);
});

test('garde DIV-05 : un modificateur de Test divin et magique sur la même cible est refusé', () => {
  const participant = divine => ({ id: 'p', zone: 'active', extensions: { v5: { divineEffects: [{ id: 'd', testModifiers: divine }], spellEffects: [{ id: 's', testModifiers: { all: 5 } }] } } });
  const state = divine => ({ combat: { participants: [participant(divine)] } });
  assert.throws(() => finalizeDivineState(state({ all: 10 }), state({ all: 10 })), /DIV-05/);
  assert.doesNotThrow(() => finalizeDivineState(state({ Athlétisme: 10 }), state({ Athlétisme: 10 })));
});

test('registre : un gestionnaire par type, grammaire partagée avec le générateur', () => {
  assert.deepEqual(Object.keys(effectHandlers).sort(), [...effectTypes].sort());
  assert.ok(paramKinds.has('touch') && targetRuleFacts.has('withinTouch') && targetRuleFacts.has('ruinServant'));
  assert.equal(validateEffect({ type: 'armor-bonus' }), 'armor-bonus exige value.');
  assert.match(validateEffect({ type: 'unknown' }), /non pris en charge/);
  assert.match(validateEffect({ type: 'condition', key: 'Blinded', strengthFrom: { kind: 'invented' } }), /strengthFrom/);
  assert.ok(progressionError({ every: 2, add: 1, field: 'invented' }));
  assert.equal(progressionError({ every: 2, add: 1, field: 'wounds' }), null);
  assert.deepEqual(effectNeeds({ type: 'unknown' })[0].field, 'contract.effects');
});

test('générateur : registre et inventaire à jour', () => {
  const root = fileURLToPath(new URL('../../..', import.meta.url));
  const output = execFileSync(process.execPath, ['tools/build-v5-divine-contracts.mjs', '--check'], { cwd: root, encoding: 'utf8' });
  assert.match(output, /current/);
});
});

describe('P4b — socle des effets', () => {
// Socle P4b : crochets génériques des modules d'effet (resolve, applies, appliesTo, champs d'entrée) et lecture des testModifiers divins.
// Les crochets sont posés temporairement sur le gestionnaire de `test-modifier` (objet mutable) ; contrats d'essai sur le modèle de p4a-gear.
const MASK = getAllDivineContracts().find(row => row.type === 'miracle' && row.name === 'Masque mortuaire').id;
const { schemaVersion: _s, sourceFingerprint: _f, ...base } = getDivineContract(MASK);
const registered = [];
const ROUNDS = { value: 6, unit: 'rounds' };
function synthetic(key, effects, { duration = { kind: 'fixed', value: 6, unit: 'rounds' } } = {}) {
  const id = `divine:miracle:morr:test-socle-${key}`;
  const contract = { ...clone(base), id, name: `Essai ${key}`, catalogueName: `Essai ${key}`, canonicalName: `Test socle ${key}`, status: 'assisted',
    params: { range: { kind: 'special' }, targets: { kind: 'count', value: 2, unit: 'targets' }, duration },
    effects, targetRules: [], clauses: [{ id: 'effect', mode: 'engine', text: 'Effet moteur.', sourceRef: 'test' }], needsInput: [] };
  registry.contracts.push(contract); registered.push(id);
  return id;
}
after(() => { registry.contracts = registry.contracts.filter(row => !registered.includes(row.id)); });
const charm = (extra = {}, key = 'Charme', amount = 2) => ({ type: 'test-modifier', modifiers: { [key]: amount }, duration: ROUNDS, ...extra });

// Pose des crochets sur `test-modifier` le temps de `work`, puis les retire.
async function withHooks(hooks, work) {
  const handler = effectHandlers['test-modifier'];
  const saved = Object.fromEntries(Object.keys(hooks).map(key => [key, Object.getOwnPropertyDescriptor(handler, key)]));
  Object.assign(handler, hooks);
  try { return await work(); } finally { for (const [key, descriptor] of Object.entries(saved)) if (descriptor) Object.defineProperty(handler, key, descriptor); else delete handler[key]; }
}

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
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [actor('priest'), actor('ally', { initiative: 30 })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  store.persistence = persistence;
  return store;
}
const input = (more = {}) => ({ actorId: 'priest', targetIds: ['priest', 'ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, ...more });
async function cast(store, contractId, more) {
  const preview = store.previewDivineExecution(contractId, input(more));
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}
const layers = (store, id) => person(store, id).extensions.v5.divineEffects || [];

test('registre : les modules d’effet vides des tâches suivantes sont enregistrés sans casser la cohérence grammaire/gestionnaires', () => {
  for (const type of effectTypes) assert.ok(effectHandlers[type], type);
  for (const type of Object.keys(effectHandlers)) assert.ok(effectTypes.has(type), type);
  assert.match(validateEffect({ type: 'test-modifier', modifiers: { Charme: 1 }, appliesTo: 'everyone' }), /appliesTo/);
  assert.equal(validateEffect({ type: 'test-modifier', modifiers: { Charme: 1 }, appliesTo: 'caster' }), null);
});

test('resolve : appelé une fois par effet, effet résolu et figé dans l’aperçu puis dans la couche', async () => {
  const id = synthetic('resolve', [charm(), charm({}, 'Calme', 1)]);
  const store = await fixture();
  const calls = [];
  await withHooks({
    resolve(effect, ctx) {
      calls.push({ key: Object.keys(effect.modifiers)[0], actorId: ctx.actor.id, targetIds: ctx.targets.map(row => row.id), sl: ctx.prayer.sl, contract: ctx.contract.id, hasInput: ctx.input.roll === 45 });
      return { ...effect, modifiers: Object.fromEntries(Object.entries(effect.modifiers).map(([key, value]) => [key, value + Math.floor(ctx.actor.caracs.Soc / 10)])) };
    }
  }, async () => {
    // Appel direct du moteur : le Store prévisualise puis rejoue l'application à blanc, soit deux aperçus par appel.
    const direct = previewDivineExecution(person(store, 'priest'), getDivineContract(id), store.listParticipants(), { ...input(), sourceFingerprint: registry.sourceFingerprint });
    assert.equal(direct.ready, true, direct.error);
    assert.deepEqual(calls.map(row => row.key), ['Charme', 'Calme'], 'une seule fois par effet et par aperçu');
    calls.length = 0;
    const preview = store.previewDivineExecution(id, input());
    assert.equal(preview.ready, true, preview.error);
    calls.splice(2);
    assert.deepEqual(calls[0], { key: 'Charme', actorId: 'priest', targetIds: ['priest', 'ally'], sl: calls[0].sl, contract: id, hasInput: true });
    assert.deepEqual(preview.preview.effects.map(row => row.modifiers), [{ Charme: 8 }, { Calme: 7 }]);
    assert.ok(Object.isFrozen(preview.preview.effects[0]) && Object.isFrozen(preview.preview.effects[0].modifiers));
    const result = await store.applyDivineExecution(id, { preview });
    assert.equal(result.ready, true, result.error);
    assert.deepEqual(layers(store, 'ally').map(row => row.testModifiers), [{ Charme: 8 }, { Calme: 7 }]);
    // Une prière ratée ne résout rien.
    calls.length = 0;
    const failed = (await fixture()).previewDivineExecution(id, input({ roll: 67 }));
    assert.equal(failed.preview.success, false);
    assert.equal(calls.length, 0);
  });
});

test('resolve : une erreur renvoyée bloque l’aperçu avec ses besoins', async () => {
  const id = synthetic('resolve-error', [charm()]);
  const store = await fixture();
  await withHooks({ resolve: () => ({ error: 'Taille de foule requise.', needs: [{ field: 'facts.crowd', label: 'Foule' }] }) }, async () => {
    const preview = store.previewDivineExecution(id, input());
    assert.equal(preview.ready, false);
    assert.equal(preview.error, 'Taille de foule requise.');
    assert.deepEqual(preview.needsInput.map(row => row.field), ['facts.crowd']);
  });
});

test('applies : le prédicat filtre à la fois les couches et applyInstant', async () => {
  const id = synthetic('applies', [charm()]);
  const store = await fixture();
  const instant = [];
  await withHooks({
    applies: (effect, participant, ctx) => participant.id === 'ally' && ctx.actorId === 'priest' && ctx.targets.length === 2,
    applyInstant(participant) { instant.push(participant.id); return null; }
  }, async () => {
    const result = await cast(store, id);
    assert.deepEqual(layers(store, 'priest'), []);
    assert.equal(layers(store, 'ally').length, 1);
    assert.deepEqual([...new Set(instant)], ['ally'], 'jamais appliqué au prêtre');
    assert.deepEqual(result.receipt.appliedEffectIds, [layers(store, 'ally')[0].id]);
  });
});

test('appliesTo : caster réserve l’effet au prêtre, targets (défaut) l’étend à tous, casterOnly reste un alias', async () => {
  const id = synthetic('scope', [charm({ appliesTo: 'caster' }, 'Charme', 2), charm({ appliesTo: 'targets' }, 'Calme', 1), charm({ casterOnly: true }, 'Commandement', 3), charm({}, 'Intuition', 1)]);
  const store = await fixture();
  const instant = [];
  await withHooks({ applyInstant(participant, effect) { instant.push(`${participant.id}:${Object.keys(effect.modifiers)[0]}`); return null; } }, async () => {
    await cast(store, id);
    assert.deepEqual(layers(store, 'priest').map(row => Object.keys(row.testModifiers)[0]), ['Charme', 'Calme', 'Commandement', 'Intuition']);
    assert.deepEqual(layers(store, 'ally').map(row => Object.keys(row.testModifiers)[0]), ['Calme', 'Intuition']);
    assert.deepEqual([...new Set(instant.filter(row => row.startsWith('ally')))], ['ally:Calme', 'ally:Intuition']);
    // L'identifiant d'une couche ne dépend pas du filtre de portée.
    assert.equal(new Set([...layers(store, 'priest'), ...layers(store, 'ally')].map(row => row.id)).size, 6);
  });
});

test('contrats existants : sans appliesTo ni crochet, toutes les cibles reçoivent leur couche', async () => {
  const id = synthetic('plain', [charm()]);
  const store = await fixture();
  await cast(store, id);
  assert.equal(layers(store, 'priest').length, 1);
  assert.equal(layers(store, 'ally').length, 1);
});

test('durée numérique résolue par le moteur : base + DR, nulle = à arbitrer', async () => {
  const id = synthetic('duration', [charm({ duration: { base: 1, fromSuccessLevels: true, unit: 'rounds' } })], { duration: { kind: 'special' } });
  const zero = synthetic('duration-zero', [charm({ duration: { base: -2, fromSuccessLevels: true, unit: 'rounds' } })], { duration: { kind: 'special' } });
  const store = await fixture();
  const preview = store.previewDivineExecution(id, input({ expiry: undefined }));
  assert.equal(preview.preview.prayer.sl, 2);
  assert.deepEqual(preview.preview.effects[0].duration, { value: 3, unit: 'rounds' });
  assert.equal(preview.needsInput[0].field, 'expiry', 'échéance de Round exigée, alignée sur la durée résolue');
  assert.equal(store.previewDivineExecution(id, input({ expiry: { phase: 'endOfTurn', round: 4, actorId: 'priest' } })).ready, false);
  const ready = store.previewDivineExecution(id, input({ expiry: { phase: 'endOfTurn', round: 3, actorId: 'priest' } }));
  assert.equal(ready.ready, true, ready.error);
  const none = store.previewDivineExecution(zero, input({ expiry: undefined }));
  assert.equal(none.ready, false);
  assert.equal(none.needsInput[0].field, 'contract.effects.duration');
  assert.match(validateEffect({ type: 'test-modifier', modifiers: { Charme: 1 }, duration: { base: 1.5 } }), /base/);
  assert.match(validateEffect({ type: 'test-modifier', modifiers: { Charme: 1 }, duration: { fromSuccessLevels: false } }), /fromSuccessLevels/);
  assert.equal(validateEffect({ type: 'test-modifier', modifiers: { Charme: 1 }, duration: { base: 2, fromSuccessLevels: true, unit: 'rounds' } }), null);
});

test('champs d’entrée génériques : inputFields décrit les saisies, toEngineInput et classifyNeeds les relisent', async () => {
  const id = synthetic('fields', [charm()]);
  const contract = getDivineContract(id);
  const priest = actor('priest'), ally = actor('ally');
  const fields = [
    { path: 'custom.bonus', label: 'Bonus choisi', kind: 'number', scope: 'effect', min: 0, max: 5, help: 'Aide.', source: true },
    { path: 'custom.note', label: 'Note', kind: 'text', scope: 'effect' },
    { path: 'custom.flag', label: 'Confirmé', kind: 'boolean', scope: 'effect' },
    { path: 'custom.pick', label: 'Choix', kind: 'select', scope: 'effect', options: [['', 'Choisir'], ['a', 'A']] },
    { path: 'custom.mood', label: 'Humeur', kind: 'tri-state', scope: 'target' },
    { path: 'custom.dice', label: 'Dé', kind: 'number', scope: 'target' },
    { path: '', label: 'ignoré', kind: 'number', scope: 'effect' },
    { path: 'custom.bad', label: 'genre inconnu', kind: 'slider', scope: 'effect' }
  ];
  await withHooks({ inputFields: () => fields }, () => {
    const form = emptyDivineForm();
    const model = buildDivineForm(contract, { actor: priest, targets: [priest, ally], form });
    const byId = Object.fromEntries(model.effectFields.map(row => [row.id, row]));
    assert.deepEqual(Object.keys(byId), ['custom.bonus', 'custom.note', 'custom.flag', 'custom.pick', 'custom.mood:priest', 'custom.mood:ally', 'custom.dice:priest', 'custom.dice:ally']);
    assert.deepEqual([byId['custom.bonus'].kind, byId['custom.note'].kind, byId['custom.flag'].kind, byId['custom.pick'].kind, byId['custom.mood:ally'].kind], ['number', 'text', 'check', 'select', 'tri']);
    assert.match(byId['custom.bonus'].help, /^Aide\. Source : /);
    assert.equal(byId['custom.bonus'].scope, 'global');
    assert.equal(byId['custom.mood:ally'].scope, 'target');
    assert.equal(byId['custom.mood:ally'].targetId, 'ally');
    assert.equal(byId['custom.mood:ally'].label, 'ally · Humeur');
    assert.deepEqual(byId['custom.mood:ally'].path, ['custom', 'mood', 'ally']);
    for (const [fieldId, value] of [['custom.bonus', '3'], ['custom.note', ' bonjour '], ['custom.flag', true], ['custom.pick', 'a'], ['custom.mood:ally', 'false'], ['custom.dice:priest', '4']])
      setFieldValue(form, byId[fieldId], value);
    const engine = toEngineInput(form, { targetIds: ['priest', 'ally'], contract, actor: priest });
    assert.deepEqual(engine.custom, { bonus: 3, note: 'bonjour', flag: true, pick: 'a', mood: { ally: false }, dice: { priest: 4 } });
    assert.deepEqual(toEngineInput(form, { targetIds: ['priest'], contract, actor: priest }).custom.mood, undefined);
    assert.deepEqual(toEngineInput(form, { targetIds: ['ally'] }), { facts: { targets: {} } }, 'sans contrat, aucune saisie générique');
    const needs = classifyNeeds([{ field: 'custom.bonus', label: 'x' }, { field: 'custom.dice.ally', label: 'y' }, { field: 'inconnu', label: 'z' }], { targets: [priest, ally], fields: model.effectFields });
    assert.deepEqual(needs.map(row => row.anchor), ['custom.bonus', 'custom:dice:ally'.replace('custom:dice', 'custom.dice'), null]);
  });
});

test('factFields : requiresFact de direct-damage passe par le mécanisme générique', () => {
  const judgement = getAllDivineContracts().find(row => row.effects?.some(effect => effect.requiresFact));
  const requiresFact = judgement.effects.find(effect => effect.requiresFact).requiresFact;
  assert.equal(typeof effectHandlers['direct-damage'].factFields, 'function');
  const row = targetFactFields(judgement).find(item => item.field === requiresFact.field);
  assert.equal(row.custom, true);
  assert.equal(row.required, true);
  assert.match(row.help, /Source : /);
  assert.ok(row.label[0] === row.label[0].toUpperCase());
  assert.deepEqual(effectHandlers['direct-damage'].factFields({ type: 'direct-damage' }), []);
});

test('Test de compétence : les testModifiers d’une couche divine sont lus par buildCombatTest', async () => {
  const id = synthetic('skill', [charm({ modifiers: { Charme: 2, 'Tous les Tests': 1 } })]);
  const store = await fixture();
  const target = () => ({ id: 'b', hp: 12, states: [], talents: [] });
  const charmTest = who => buildCombatTest({ actor: who, target: target(), action: { type: 'test', label: 'Charme', base: 50 }, roll: 47, v5: { kind: 'test' } }).test.options[0].result;
  const before = charmTest(person(store, 'ally'));
  assert.equal(before.sl, 1);
  await cast(store, id);
  const ally = person(store, 'ally');
  assert.deepEqual(ally.extensions.v5.testModifiers, { Charme: 2, 'Tous les Tests': 1 });
  const after = charmTest(ally);
  assert.equal(after.sl, 4, 'DR de base 1 + Charme 2 + Tous les Tests 1');
  assert.deepEqual(after.details.modifiers.map(row => row.amount).sort(), [1, 2]);
  const other = buildCombatTest({ actor: ally, target: target(), action: { type: 'test', label: 'Calme', base: 50 }, roll: 47, v5: { kind: 'test' } }).test.options[0].result;
  assert.equal(other.sl, 2, 'seul « Tous les Tests » vaut pour une autre compétence');
  // La couche vit dans le brouillon de la fiche d'origine : la clé disparaît avec elle.
  for (let i = 0; i < 12; i++) await store.nextTurn();
  assert.deepEqual(person(store, 'ally').extensions.v5.testModifiers, {});
  assert.equal(charmTest(person(store, 'ally')).sl, 1);
});
});

describe('P4c — contrats', () => {
// P4c B2 : les trois miracles qui invoquent (Hurlement du loup, Roi de la Nature, Œil de l'aigle), contre les VRAIS contrats régénérés.
const HOWL = 'divine:miracle:ulric:howl-of-the-wolf', KING = 'divine:miracle:taal:king-of-the-wild', EAGLE = 'divine:miracle:il-de-l-aigle';
const FROST = 'divine:miracle:ulric:hoarfrost-s-chill';

const actor = (id, initiative, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: ['Ulric', 'Taal', 'Myrmidia'].map(specialization => ({ id: 'talent-invoke', status: 'resolved', rank: 1, specialization })),
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const stateOf = store => { const value = JSON.parse(store.getFullJSON()); delete value.exportedAt; return value; };
const world = store => { const v = stateOf(store); return { combat: v.combat, diceLines: v.diceLines, extensions: v.extensions }; };
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const summoned = store => store.listParticipants().filter(row => row.extensions?.v5?.divineSummon);
const layersOf = store => (person(store, 'priest')?.extensions?.v5?.divineEffects || []).filter(layer => layer.type === 'summon-creature');
async function fixture({ soc = 60 } = {}) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
    participants: [actor('priest', 60, { caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: soc, M: 4 } }), actor('ally', 30), actor('foe', 20, { camp: 'ennemi' })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const expiry = (round = 6) => ({ phase: 'endOfTurn', round, actorId: 'priest' });
// Le moteur exige une cible explicite pour une portée chiffrée : le prêtre lui-même (les effets d'invocation retombent toujours sur lui).
const input = (more = {}) => ({ actorId: 'priest', targetIds: ['priest'], facts: { targets: { priest: { withinRange: true } } }, roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, ...more });
async function cast(store, contractId, more = {}) {
  const preview = store.previewDivineExecution(contractId, input(more));
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return { preview, result };
}
const castHowl = (store, more) => cast(store, HOWL, { expiry: expiry(), ...more });
const castKing = (store, more) => cast(store, KING, { summon: { beastKey: 'giant-spider', position: 'au pied du prêtre' }, ...more });
const castEagle = (store, more) => cast(store, EAGLE, { expiry: expiry(), ...more });

test('contrats : les trois miracles passent de manual à assisted avec un effet summon-creature et des clauses engine + rappels', () => {
  const howl = getDivineContract(HOWL), king = getDivineContract(KING), eagle = getDivineContract(EAGLE);
  assert.deepEqual([howl, king, eagle].map(row => row.status), ['assisted', 'assisted', 'assisted']);
  assert.deepEqual([howl, king, eagle].map(row => row.effects.map(effect => [effect.type, effect.kind, effect.appliesTo])),
    [[['summon-creature', 'creature', 'caster']], [['summon-creature', 'creature', 'caster']], [['summon-creature', 'sensor', 'caster']]]);
  assert.deepEqual(howl.effects[0].overrides, { caracs: { CC: 45, FM: 35 }, size: 'large', traits: ['Magique', 'Frénésie'], recomputeWounds: true });
  assert.equal(howl.effects[0].profile, 'wolf');
  assert.deepEqual([king.effects[0].choice, king.effects[0].requiresPosition, king.params.duration.unit], ['beast', true, 'minutes']);
  assert.deepEqual(eagle.effects[0].traits, ['Perception 55', 'Sens aiguisé (Vue)', 'Vol (80)', 'Intangible', 'Invulnérable']);
  for (const contract of [howl, king, eagle]) {
    const modes = Object.fromEntries(contract.clauses.map(row => [row.id, row.mode]));
    assert.ok(Object.values(modes).includes('engine'), contract.id);
    assert.ok(Object.values(modes).includes('manual'), contract.id);
  }
  assert.equal(eagle.clauses.find(row => row.id === 'eagle-sight').mode, 'manual');
});

test('Hurlement du loup : le loup apparaît avec le profil du bestiaire et les valeurs de la source, camp du prêtre, hors ordre inchangé', async () => {
  const store = await fixture(), before = stateOf(store);
  const { preview, result } = await castHowl(store);
  const [wolf] = summoned(store);
  assert.equal(summoned(store).length, 1);
  assert.equal(wolf.name, 'Loup'); assert.equal(wolf.camp, 'pj'); assert.equal(wolf.zone, 'active');
  assert.equal(wolf.caracs.CC, 45); assert.equal(wolf.caracs.FM, 35);
  assert.equal(wolf.maxHp, 24); assert.equal(wolf.hp, 24);
  for (const trait of ['Bestial', 'Magique', 'Frénésie', 'Taille (Grande)']) assert.ok(wolf.traits.includes(trait), trait);
  assert.deepEqual(wolf.actions.map(row => row.base), [55, 55]);
  assert.equal(wolf.actions[1].damageFormula, 'BF+3', 'Morsure +6 du bestiaire');
  assert.equal(wolf.extensions.v5.divineSummon.contractId, HOWL);
  assert.equal(wolf.extensions.isAuxiliary, true); assert.equal(wolf.extensions.casterId, 'priest');
  assert.deepEqual(stateOf(store).combat.order, before.combat.order);
  assert.equal(layersOf(store).length, 1);
  assert.deepEqual(layersOf(store)[0].expiry, expiry());
  // aperçu = application : même profil figé
  const line = describeEffectResult(preview.projectedEffects[0], { contract: getDivineContract(HOWL), participants: store.listParticipants() });
  assert.match(line, /Loup \(profil wolf\) · 24 Blessure\(s\)/);
  assert.equal(describeEffectResult(result.receipt.effectReceipts[0], {}), line);
});

test('Invocation de Prière au Round 0 après le tirage — initiative automatique et rang selon le score', async () => {
  const store = await fixture();
  const snapshot = stateOf(store);
  snapshot.combat.round = 0;
  for (const [id, die, characteristic] of [['priest', 10, 50], ['ally', 1, 30], ['foe', 1, 20]]) {
    const participant = snapshot.combat.participants.find(row => row.id === id);
    participant.extensions.v5.combatInitiative = { die, characteristic, bonus: Math.floor(characteristic / 10), score: die + Math.floor(characteristic / 10), initialized: true };
  }
  snapshot.extensions.v5.combatInitiativeInitialized = true;
  snapshot.extensions.v5.combatInitiativeResolution = { order: [...snapshot.combat.order] };
  await store.loadFromJSON(snapshot);
  await castHowl(store);
  const wolf = summoned(store)[0];
  const initiative = wolf.extensions.v5.combatInitiative;
  assert.ok(initiative.die >= 1 && initiative.die <= 10);
  assert.equal(initiative.characteristic, wolf.caracs.I);
  assert.equal(initiative.score, initiative.die + Math.floor(wolf.caracs.I / 10));
  assert.equal(initiative.initialized, true);
  const rows = store.listParticipants().filter(row => row.zone === 'active');
  const expected = [...rows].sort((a, b) => b.extensions.v5.combatInitiative.score - a.extensions.v5.combatInitiative.score).map(row => row.id);
  assert.deepEqual(store.getCombat().order, expected);
});

test('Hurlement du loup : fin de prière retire le loup et la couche ; Undo puis Redo restituent exactement', async () => {
  const store = await fixture();
  const s0 = world(store);
  const { result } = await castHowl(store);
  const s1 = world(store);
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'Fin décidée par le MJ' });
  assert.equal(summoned(store).length, 0); assert.equal(layersOf(store).length, 0);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), s1);
  assert.equal(summoned(store).length, 1);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), s0);
  assert.equal(summoned(store).length, 0);
  assert.equal(await store.redo(), true); assert.deepEqual(world(store), s1);
  assert.equal(summoned(store)[0].caracs.CC, 45);
});

test('Hurlement du loup : à l’échéance en Rounds le loup disparaît avec la couche', async () => {
  const store = await fixture({ soc: 20 });
  await castHowl(store, { expiry: expiry(2) });
  assert.equal(summoned(store).length, 1);
  for (let i = 0; i < 12 && summoned(store).length; i++) await store.nextTurn();
  assert.equal(summoned(store).length, 0); assert.equal(layersOf(store).length, 0);
});

test('Roi de la Nature : sans bête ni position l’aperçu est refusé, hors liste aussi ; la bête choisie est créée', async () => {
  const store = await fixture();
  const blocked = store.previewDivineExecution(KING, input());
  assert.equal(blocked.ready, false);
  assert.deepEqual(blocked.needsInput.map(row => row.field), ['summon.beastKey', 'summon.position']);
  assert.equal(store.previewDivineExecution(KING, input({ summon: { beastKey: 'dragon', position: 'ici' } })).ready, false);
  assert.equal(store.previewDivineExecution(KING, input({ summon: { beastKey: 'wolf', position: ' ' } })).ready, false);
  assert.equal(summoned(store).length, 0);
  const { result } = await castKing(store);
  const [spider] = summoned(store);
  assert.equal(spider.extensions.v5.divineSummon.profileKey, 'giant-spider');
  assert.equal(spider.name, 'Araignée géante');
  assert.equal(spider.notes, 'Position : au pied du prêtre');
  assert.equal(result.receipt.effectReceipts[0].result.profileKey, 'giant-spider');
  assert.equal(layersOf(store).length, 1);
});

test('Roi de la Nature : durée en minutes (horloge de campagne), l’animal disparaît à l’échéance ; Undo le restitue', async () => {
  const store = await fixture();
  await castKing(store, { summon: { beastKey: 'horse', position: 'devant' } });
  const [layer] = layersOf(store);
  assert.deepEqual(layer.deadline, { kind: 'campaign-time', atSeconds: 360 }, 'Bonus de Sociabilité 6 minutes');
  assert.equal((await store.advanceCampaignTime({ seconds: 359, reason: 'Temps MJ' })).status, 'applied');
  assert.equal(summoned(store).length, 1);
  const before = world(store);
  assert.equal((await store.advanceCampaignTime({ seconds: 1, reason: 'Temps MJ' })).status, 'applied');
  assert.equal(summoned(store).length, 0); assert.equal(layersOf(store).length, 0);
  assert.equal(await store.undo(), true);
  assert.deepEqual(world(store), before);
  assert.equal(summoned(store).length, 1);
});

test('Œil de l’aigle : capteur hors de l’ordre, au banc, sans initiative, invulnérable, avec Perception 55, Sens aiguisé (Vue), Vol 80', async () => {
  const store = await fixture(), before = stateOf(store);
  const { preview } = await castEagle(store);
  const [eagle] = summoned(store);
  assert.equal(eagle.name, 'Aigle spectral'); assert.equal(eagle.zone, 'bench');
  assert.deepEqual(eagle.traits, ['Perception 55', 'Sens aiguisé (Vue)', 'Vol (80)', 'Intangible', 'Invulnérable']);
  assert.equal(eagle.extensions.sensor, true);
  assert.equal(eagle.extensions.v5.divineSummon.kind, 'sensor');
  assert.equal(eagle.maxHp, null); assert.deepEqual(eagle.actions, []);
  assert.deepEqual(stateOf(store).combat.order, before.combat.order, 'aucun participant dans l’ordre');
  assert.equal(stateOf(store).combat.currentActorId, 'priest');
  assert.match(describeEffectResult(preview.projectedEffects[0], {}), /^Invocation : Aigle spectral, capteur hors de l’ordre du combat, invulnérable$/);
});

test('Œil de l’aigle : Undo et Redo, puis fin à l’échéance', async () => {
  const store = await fixture();
  const s0 = world(store);
  await castEagle(store);
  const s1 = world(store);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), s0); assert.equal(summoned(store).length, 0);
  assert.equal(await store.redo(), true); assert.deepEqual(world(store), s1); assert.equal(summoned(store).length, 1);
  for (let i = 0; i < 30 && summoned(store).length; i++) await store.nextTurn();
  assert.equal(summoned(store).length, 0);
});

test('une prière sans invocation laisse l’état exempt de toute créature ou couche d’invocation', async () => {
  const store = await fixture();
  await cast(store, FROST, { targetIds: ['foe'], facts: undefined, expiry: expiry() });
  assert.equal(summoned(store).length, 0); assert.equal(layersOf(store).length, 0);
  assert.equal(stateOf(store).combat.participants.length, 3);
});

test('formulaire : le choix de la bête et la position viennent des inputFields, et la ligne « Prières actives » nomme l’invocation', async () => {
  const store = await fixture();
  const contract = getDivineContract(KING), priest = person(store, 'priest');
  const form = emptyDivineForm();
  const model = buildDivineForm(contract, { actor: priest, targets: [], form, choices: { effect: 0 } });
  const beast = model.effectFields.find(row => row.path.join('.') === 'summon.beastKey'), position = model.effectFields.find(row => row.path.join('.') === 'summon.position');
  assert.deepEqual([beast.kind, beast.options.length, beast.options[0]], ['select', 7, ['', 'À préciser']]);
  assert.equal(position.kind, 'text');
  setFieldValue(form, beast, 'boar'); setFieldValue(form, position, 'sous le chêne');
  assert.deepEqual(toEngineInput(form, { targetIds: [], contract, actor: priest }).summon, { beastKey: 'boar', position: 'sous le chêne' });
  assert.equal(buildDivineForm(getDivineContract(HOWL), { actor: priest, form: emptyDivineForm() }).effectFields.filter(row => row.path.join('.').startsWith('summon')).length, 0);
  await castKing(store, { summon: { beastKey: 'boar', position: 'sous le chêne' } });
  const [layer] = layersOf(store);
  assert.equal(summonLayerLabel(layer, store.listParticipants()), 'Invocation : Sanglier');
  assert.equal(summonLayerLabel({ ...layer, summon: { kind: 'sensor' } }, []), 'Invocation : capteur');
  assert.equal(summonLayerLabel({ type: 'grant-trait' }, []), null);
});
});

describe('P4c — compléments', () => {
// Dévotion de la Guerrière (ennemi saisi au lancement), Yeux de chat (capteur) et Vindicte Vengeresse, contre les VRAIS contrats régénérés.
const DEVOTION = 'divine:miracle:devotion-de-la-guerriere', CAT = 'divine:miracle:ranald:cat-s-eyes', GRACE = 'divine:miracle:ranald:ranald-s-grace', WRATH = 'divine:miracle:vindicte-vengeresse';

const actor = (id, initiative, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: ['Myrmidia', 'Ranald'].map(specialization => ({ id: 'talent-invoke', status: 'resolved', rank: 1, specialization })),
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const stateOf = store => { const value = JSON.parse(store.getFullJSON()); delete value.exportedAt; return value; };
const world = store => { const v = stateOf(store); return { combat: v.combat, diceLines: v.diceLines, extensions: v.extensions }; };
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const summoned = store => store.listParticipants().filter(row => row.extensions?.v5?.divineSummon);
const injected = (store, id) => (person(store, id).talents || []).filter(row => row.divineEffectId);
async function fixture() {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
    participants: [actor('priest', 60), actor('ally', 30), actor('foe', 20, { camp: 'ennemi' })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const expiry = (round = 4) => ({ phase: 'endOfTurn', round, actorId: 'priest' });
const input = (more = {}) => ({ actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, expiry: expiry(), ...more });
const allyFacts = { targetIds: ['ally'], facts: { targets: { ally: { ally: true, withinRange: true } } } };
const selfFacts = { targetIds: ['priest'], facts: { targets: { priest: { withinRange: true } } } };
async function cast(store, contractId, more = {}) {
  const preview = store.previewDivineExecution(contractId, input(more));
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return { preview, result };
}
const talentRows = rows => rows.map(row => [row.id, row.specialization, row.rank, row.temporary]);

test('Dévotion de la Guerrière : assistée, grant-talent Sans peur [Ennemi] dont l’ennemi vient de la saisie', () => {
  const contract = getDivineContract(DEVOTION);
  assert.equal(contract.status, 'assisted');
  assert.deepEqual(contract.effects.map(effect => [effect.type, effect.specializationFrom, effect.talents.map(row => row.id)]), [['grant-talent', 'input', ['talent-fearless']]]);
  assert.deepEqual(contract.targetRules, ['ally', 'within-range']);
  assert.deepEqual(contract.params.duration, { kind: 'fixed', value: 4, unit: 'rounds' });
  assert.ok(contract.clauses.some(row => row.id === 'fear-only' && row.mode === 'manual'));
});

test('Dévotion de la Guerrière : ennemi saisi figé à l’aperçu, Sans peur [Ennemi] sur l’allié, retiré à l’échéance, Undo et Redo', async () => {
  const store = await fixture();
  const s0 = world(store);
  const { preview } = await cast(store, DEVOTION, { ...allyFacts, talent: { specialization: '  Peaux   vertes \n' } });
  assert.equal(preview.preview.effects[0].talents[0].specialization, 'Peaux-vertes');
  assert.equal(preview.preview.effects[0].specializationFrom, undefined);
  assert.deepEqual(talentRows(injected(store, 'ally')), [['talent-fearless', 'Peaux-vertes', 1, true]]);
  assert.deepEqual(injected(store, 'priest'), [], 'le prêtre n’est pas désigné');
  const s1 = world(store);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), s0); assert.deepEqual(injected(store, 'ally'), []);
  assert.equal(await store.redo(), true); assert.deepEqual(world(store), s1);
  for (let i = 0; i < 12; i++) await store.nextTurn();
  assert.deepEqual(injected(store, 'ally'), []);
  assert.equal((person(store, 'ally').extensions.v5.divineEffects || []).length, 0);
});

test('Dévotion de la Guerrière : refusée sans ennemi saisi (absent, vide, non texte, trop long), sans rien écrire', async () => {
  const store = await fixture();
  const before = world(store);
  for (const talent of [undefined, { specialization: '' }, { specialization: '   ' }, { specialization: 42 }, { specialization: 'x'.repeat(61) }, { specialization: 'Gobelins des collines' }, { specialization: 'x'.repeat(60) }]) {
    const preview = store.previewDivineExecution(DEVOTION, input({ ...allyFacts, ...(talent ? { talent } : {}) }));
    assert.equal(preview.ready, false, JSON.stringify(talent));
    assert.match(JSON.stringify(preview.needsInput), /talent\.specialization/);
  }
  assert.equal(store.previewDivineExecution(DEVOTION, input({ ...allyFacts, talent: { specialization: 'Orques' } })).ready, true);
  assert.deepEqual(world(store), before);
});

test('Dévotion de la Guerrière : le formulaire expose le champ « Ennemi visé »', async () => {
  const store = await fixture();
  const contract = getDivineContract(DEVOTION), priest = person(store, 'priest');
  const form = emptyDivineForm();
  const model = buildDivineForm(contract, { actor: priest, targets: [], form, choices: { effect: 0 } });
  const field = model.effectFields.find(row => row.path.join('.') === 'talent.specialization');
  assert.deepEqual([field.kind, field.label], ['select', 'Ennemi visé (mot-clé du référentiel)']);
  setFieldValue(form, field, 'Orques');
  assert.deepEqual(toEngineInput(form, { targetIds: [], contract, actor: priest }).talent, { specialization: 'Orques' });
});

test('non-régression : un autre grant-talent (Grâce de Ranald, Chute féline) s’injecte sans saisie de spécialisation', async () => {
  assert.equal(getDivineContract(GRACE).effects.find(effect => effect.type === 'grant-talent').specializationFrom, undefined);
  const store = await fixture();
  await cast(store, GRACE, { targetIds: ['ally'], facts: { targets: { ally: { ally: true, withinTouch: true } } } });
  assert.deepEqual(talentRows(injected(store, 'ally')), [['talent-catfall', undefined, 1, true]]);
  await store.advanceCampaignTime({ seconds: 3600, reason: 'Fin de la durée en minutes (v3)' });
  assert.deepEqual(injected(store, 'ally'), []);
});

test('Yeux de chat : assisté, capteur hors de l’ordre, au banc, sans initiative ni action, invulnérable', async () => {
  const contract = getDivineContract(CAT);
  assert.equal(contract.status, 'assisted');
  assert.deepEqual(contract.effects.map(effect => [effect.type, effect.kind, effect.name, effect.traits]), [['summon-creature', 'sensor', 'Chat', ['Invulnérable']]]);
  const modes = Object.fromEntries(contract.clauses.map(row => [row.id, row.mode]));
  assert.deepEqual([modes['cat-servant'], modes.end, modes['no-own-senses']], ['engine', 'engine', 'manual']);
  const store = await fixture(), before = stateOf(store);
  await cast(store, CAT, { ...selfFacts, expiry: expiry(6) });
  const [cat] = summoned(store);
  assert.equal(cat.name, 'Chat'); assert.equal(cat.zone, 'bench');
  assert.deepEqual(cat.traits, ['Invulnérable']);
  assert.equal(cat.extensions.sensor, true); assert.equal(cat.extensions.v5.divineSummon.kind, 'sensor');
  assert.equal(cat.maxHp, null); assert.deepEqual(cat.actions, []); assert.equal(cat.initiative, 0);
  assert.deepEqual(stateOf(store).combat.order, before.combat.order);
});

test('Yeux de chat : absent de la piste après des Tours, retiré à l’échéance, Undo et Redo', async () => {
  const store = await fixture();
  const s0 = world(store);
  await cast(store, CAT, { ...selfFacts, expiry: expiry(6) });
  const s1 = world(store);
  const seen = [];
  for (let i = 0; i < 40 && summoned(store).length; i++) { seen.push(stateOf(store).combat.currentActorId); await store.nextTurn(); }
  assert.ok(seen.length >= 3, 'plusieurs Tours se sont joués avec le chat présent');
  assert.ok(seen.every(id => ['priest', 'ally', 'foe'].includes(id)), `le chat n’entre jamais dans la piste : ${seen.join(' ')}`);
  assert.equal(summoned(store).length, 0, 'retiré à l’échéance');
  for (let i = 0; i < 12; i++) await store.nextTurn();
  assert.equal(summoned(store).length, 0);
  while (summoned(store).length === 0 && await store.undo());
  assert.equal(summoned(store).length, 1);
  while (summoned(store).length === 1 && JSON.stringify(world(store)) !== JSON.stringify(s1) && await store.undo());
  assert.deepEqual(world(store), s1);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), s0);
  assert.equal(await store.redo(), true); assert.deepEqual(world(store), s1);
  assert.equal(summoned(store).length, 1);
});

test('Vindicte Vengeresse : la clause de charge suit V5 p.163 (Engagé : Désengagement puis charge, y compris une autre cible)', () => {
  const clause = getDivineContract(WRATH).clauses.find(row => row.id === 'charge-and-attack');
  assert.equal(clause.mode, 'manual');
  assert.match(clause.text, /Désengager/);
  assert.match(clause.text, /une autre cible/);
  assert.doesNotMatch(clause.text, /ne peut pas charger/);
});
});

describe('P4d — cible implicite', () => {
// P4d : une prière dont TOUS les effets sont des invocations portées par le prêtre n'exige ni cible explicite ni fait « à portée » ;
// tous les autres contrats gardent exactement leurs exigences (caractérisation).
const HOWL = 'divine:miracle:ulric:howl-of-the-wolf', KING = 'divine:miracle:taal:king-of-the-wild', EAGLE = 'divine:miracle:il-de-l-aigle', CAT = 'divine:miracle:ranald:cat-s-eyes';
const SUN = 'divine:miracle:soleil-flamboyant', ANNIHILATE = 'divine:miracle:morr:destroy-undead', BATTLE = 'divine:blessing:myrmidia:battle';
const MARTIAL = 'divine:miracle:competence-martiale', HAMMER = 'divine:miracle:sigmar:sigmar-s-fiery-hammer', JUDGEMENT = 'divine:miracle:ulric:the-snow-king-s-judgement';
const SPECIALIZATIONS = ['Ulric', 'Taal', 'Myrmidia', 'Morr', 'Sigmar', 'Ranald'];

const actor = (id, initiative, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: SPECIALIZATIONS.flatMap(specialization => ['talent-invoke', 'talent-bless'].map(id => ({ id, status: 'resolved', rank: 1, specialization }))),
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [{ id: 'ham-1', name: 'Marteau de guerre', kind: 'weapon', category: 'Marteau' }], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
async function fixture() {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
    participants: [actor('priest', 60), actor('ally', 30), actor('foe', 20, { camp: 'ennemi', traits: ['Mort-vivant'] })] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const summoned = store => store.listParticipants().filter(row => row.extensions?.v5?.divineSummon);
const layers = (store, id, type) => (person(store, id)?.extensions?.v5?.divineEffects || []).filter(layer => layer.type === type);
const allFacts = targetIds => ({ targets: Object.fromEntries(targetIds.map(id => [id, { withinRange: true, withinTouch: true, ally: true, undead: true, nonMyrmidian: true, lookingAtPriest: true }])) });
const ROUND6 = { phase: 'endOfTurn', round: 6, actorId: 'priest' }, ROUND5 = { phase: 'endOfTurn', round: 5, actorId: 'priest' };
const input = (targetIds, more = {}) => ({ actorId: 'priest', targetIds, roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, expiry: ROUND6, ...more });
const withFacts = (targetIds, more = {}) => input(targetIds, { facts: allFacts(targetIds), ...more });
const KING_MORE = { summon: { beastKey: 'giant-spider', position: 'au pied du prêtre' }, expiry: undefined };

// --- Caractérisation : les autres contrats exigent toujours une cible et leurs faits ------------------------------------------

test('caractérisation : Soleil flamboyant, Anéantir les morts-vivants, Bénédiction de Bataille et Compétence Martiale refusent l’absence de cible', async () => {
  const store = await fixture();
  for (const [id, more] of [[SUN, {}], [ANNIHILATE, { damageRoll: 5 }], [BATTLE, {}], [MARTIAL, { expiry: ROUND5 }]]) {
    const preview = store.previewDivineExecution(id, input([], more));
    assert.equal(preview.ready, false, id);
    assert.equal(preview.error, 'Le contrat requiert une ou plusieurs cibles explicites.', id);
    assert.deepEqual(preview.needsInput.map(row => row.field), ['targetIds'], id);
  }
});

test('caractérisation : une cible désignée reste exigée avec son fait, et l’effet n’atteint que la cible', async () => {
  const store = await fixture();
  const noFact = store.previewDivineExecution(BATTLE, input(['foe']));
  assert.equal(noFact.ready, false);
  assert.match(noFact.error, /within-range/);
  assert.deepEqual(noFact.needsInput.map(row => row.field), ['facts.targets.foe.withinRange']);
  const falseFact = store.previewDivineExecution(BATTLE, input(['foe'], { facts: { targets: { foe: { withinRange: false } } } }));
  assert.equal(falseFact.ready, false);
  assert.match(falseFact.error, /ne satisfait pas within-range/);
  const preview = store.previewDivineExecution(BATTLE, withFacts(['foe']));
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(BATTLE, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(person(store, 'foe').extensions.v5.divineEffects.length, 1, 'la cible porte la couche');
  assert.equal((person(store, 'priest').extensions.v5.divineEffects || []).length, 0, 'le prêtre n’est pas atteint');
});

test('caractérisation : Soleil flamboyant et Anéantir (cibles multiples) s’appliquent aux cibles désignées', async () => {
  for (const [id, more] of [[SUN, {}], [ANNIHILATE, { damageRoll: 5 }]]) {
    const store = await fixture();
    const preview = store.previewDivineExecution(id, withFacts(['foe', 'ally'], more));
    assert.equal(preview.ready, true, `${id} ${preview.error}`);
    assert.deepEqual(preview.preview.targetIds, ['foe', 'ally']);
    const result = await store.applyDivineExecution(id, { preview });
    assert.equal(result.ready, true, `${id} ${result.error}`);
  }
});

test('caractérisation : Compétence Martiale exige toujours les faits de sa cible', async () => {
  const store = await fixture();
  const noFact = store.previewDivineExecution(MARTIAL, input(['ally'], { expiry: ROUND5 }));
  assert.equal(noFact.ready, false);
  assert.match(noFact.error, /doit être fourni/);
});

test('caractérisation : Marteau ardent (cible propre) refuse une autre cible et exige l’arme', async () => {
  const store = await fixture();
  const weapon = { weapon: { equipmentId: 'ham-1', classConfirmed: true } };
  const other = store.previewDivineExecution(HAMMER, input(['foe'], { facts: weapon }));
  assert.equal(other.ready, false);
  assert.equal(other.error, 'La prière se cible elle-même; choisissez uniquement le prêtre auteur.');
  const noWeapon = store.previewDivineExecution(HAMMER, input([]));
  assert.equal(noWeapon.ready, false);
  assert.deepEqual(noWeapon.needsInput.map(row => row.field), ['facts.weapon.equipmentId']);
  const ok = store.previewDivineExecution(HAMMER, input([], { facts: weapon }));
  assert.equal(ok.ready, true, ok.error);
});

test('caractérisation : le Jugement du Roi des Neiges (un effet de cibles, un du prêtre) exige toujours la cible', async () => {
  const store = await fixture();
  const preview = store.previewDivineExecution(JUDGEMENT, input([]));
  assert.equal(preview.ready, false);
  assert.equal(preview.error, 'Le contrat requiert une ou plusieurs cibles explicites.');
});

test('caractérisation : Œil de l’aigle et Yeux de chat refusent toujours une autre cible que le prêtre', async () => {
  const store = await fixture();
  for (const id of [EAGLE, CAT]) {
    const preview = store.previewDivineExecution(id, withFacts(['foe']));
    assert.equal(preview.ready, false, id);
    assert.equal(preview.error, 'La prière se cible elle-même; choisissez uniquement le prêtre auteur.', id);
  }
});

// --- La règle : exactement les contrats dont tous les effets sont des invocations du prêtre -------------------------------

test('règle : seuls les quatre contrats d’invocation/capteur portent la cible implicite du prêtre', () => {
  const implicit = getAllDivineContracts().filter(contract => hasImplicitCasterTarget(contract)).map(contract => contract.id).sort();
  assert.deepEqual(implicit, [CAT, EAGLE, HOWL, KING, 'divine:miracle:attaque-rapide'].sort());
  assert.equal(hasImplicitCasterTarget({ effects: [] }), false);
  assert.equal(hasImplicitCasterTarget({ effects: [{ type: 'summon-creature', appliesTo: 'caster' }, { type: 'condition' }] }), false, 'un effet de cibles désactive la règle');
  assert.equal(hasImplicitCasterTarget({ effects: [{ type: 'summon-creature', appliesTo: 'targets' }] }), false);
});

// --- Hurlement du loup et Roi de la Nature sans cible --------------------------------------------------------------------

test('Hurlement du loup sans cible ni fait : le prêtre porte la couche, le loup est créé', async () => {
  const store = await fixture();
  const preview = store.previewDivineExecution(HOWL, input([]));
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  assert.deepEqual(preview.preview.targetIds, []);
  const result = await store.applyDivineExecution(HOWL, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(layers(store, 'priest', 'summon-creature').length, 1, 'la couche est sur le prêtre');
  assert.equal(summoned(store).length, 1);
  assert.equal(summoned(store)[0].extensions.v5.divineSummon.ownerId, 'priest');
  for (const other of ['ally', 'foe']) assert.equal(layers(store, other, 'summon-creature').length, 0, other);
});

test('Roi de la Nature sans cible ni fait : le prêtre porte la couche, l’animal choisi est créé', async () => {
  const store = await fixture();
  const preview = store.previewDivineExecution(KING, input([], KING_MORE));
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(KING, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(layers(store, 'priest', 'summon-creature').length, 1);
  assert.equal(summoned(store).length, 1);
  assert.equal(summoned(store)[0].extensions.v5.divineSummon.ownerId, 'priest');
});

test('Hurlement du loup et Roi de la Nature : le prêtre seul reste accepté, faits superflus ignorés, même résultat (A2)', async () => {
  for (const [id, more] of [[HOWL, {}], [KING, KING_MORE]]) {
    const bare = await fixture(), extra = await fixture();
    const a = bare.previewDivineExecution(id, input([], more)), b = extra.previewDivineExecution(id, withFacts(['priest'], more));
    assert.equal(a.ready, true, `${id} ${a.error}`); assert.equal(b.ready, true, `${id} ${b.error}`);
    await bare.applyDivineExecution(id, { preview: a }); await extra.applyDivineExecution(id, { preview: b });
    assert.equal(summoned(bare).length, 1); assert.equal(summoned(extra).length, 1);
    assert.equal(layers(bare, 'priest', 'summon-creature').length, layers(extra, 'priest', 'summon-creature').length);
  }
});

test('invocations sans cible : une prière ratée n’invoque rien et n’exige pas de cible', async () => {
  const store = await fixture();
  const preview = store.previewDivineExecution(HOWL, input([], { roll: 85 }));
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(HOWL, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(summoned(store).length, 0);
});

test('Œil de l’aigle et Yeux de chat sans cible ni fait : toujours acceptés, capteur créé', async () => {
  for (const id of [EAGLE, CAT]) {
    const store = await fixture();
    const preview = store.previewDivineExecution(id, input([]));
    assert.equal(preview.ready, true, `${id} ${preview.error}`);
    const result = await store.applyDivineExecution(id, { preview });
    assert.equal(result.ready, true, `${id} ${result.error}`);
    assert.equal(summoned(store).length, 1, id);
  }
});

// --- Formulaire généré ---------------------------------------------------------------------------------------------------

test('formulaire : aucun fait « à portée » demandé pour les quatre contrats d’invocation, tous les faits demandés ailleurs', () => {
  for (const id of [HOWL, KING, EAGLE, CAT]) {
    const contract = getDivineContract(id);
    assert.deepEqual(targetFactFields(contract), [], id);
    assert.equal(describeDivineForm(contract).implicitTarget, true, id);
  }
  assert.ok(targetFactFields(getDivineContract(BATTLE)).some(row => row.field === 'withinRange' && row.required));
  assert.equal(describeDivineForm(getDivineContract(BATTLE)).implicitTarget, false);
  assert.equal(describeDivineForm(getDivineContract(SUN)).implicitTarget, false);
});

test('formulaire : le moteur accepte ce que le formulaire produit sans aucune cible', async () => {
  for (const [id, more] of [[HOWL, {}], [KING, KING_MORE]]) {
    const store = await fixture(), contract = getDivineContract(id), form = emptyDivineForm();
    const model = buildDivineForm(contract, { actor: person(store, 'priest'), targets: [], form });
    assert.deepEqual(model.factFields, {}, id);
    const preview = store.previewDivineExecution(id, { ...input([], more), ...toEngineInput(form, { targetIds: [], contract }) });
    assert.equal(preview.ready, true, `${id} ${preview.error} ${JSON.stringify(preview.needsInput)}`);
  }
});
});

describe('T5 — modèle de formulaire divin', () => {
// T5 : formulaire de prière généré depuis le contrat (module pur) ; le moteur accepte ce que le formulaire produit.
const id = name => `divine:miracle:${name}`;
const SOULFIRE = id('sigmar:soulfire'), SUCCOUR = id('rhya:rhya-s-succour'), HAMMER = id('sigmar:sigmar-s-fiery-hammer'), TOUCH = id('rhya:rhya-s-touch');
const JUDGEMENT = id('ulric:the-snow-king-s-judgement'), MORR_HAND = id('morr:stay-morr-s-hand'), BEACON = id('sigmar:beacon-of-righteous-virtue'), ANNIHILATE = id('morr:destroy-undead');

const fighter = (name, extra = {}) => ({ id: name, name, kind: 'PNJ', camp: 'pnj', zone: 'active', initiative: 20, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 }, equipment: [], traits: [], states: [], talents: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const priestFor = contract => ({ ...fighter('priest', { kind: 'PJ', camp: 'pj', initiative: 60,
  equipment: [{ id: 'axe-1', name: 'Hache de bataille', kind: 'weapon', category: 'Hache' }, { id: 'ham-1', name: 'Marteau de guerre', kind: 'weapon', category: 'Marteau' }] }),
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: contract.requiredTalent.id, status: 'resolved', rank: 1, specialization: contract.requiredTalent.specialization }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })), extensions: { v5: { divine: { sin: 0 }, ...(contract.deity==='Solkan'?{corruptionPoints:0}:{}) } } });
async function fixture(contract) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const states = [{ id: 'st-deaf', key: 'assourdi', name: 'Assourdi', level: 1 }, { id: 'st-broken', key: 'brise', name: 'Brisé', level: 1 }];
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'foe', 'friend'],
    participants: [priestFor(contract), fighter('foe', { traits: ['Mort-vivant'], states, equipment: [{ id: 'foe-sword', name: 'Épée', kind: 'weapon', category: 'Épée' }] }), fighter('friend', { kind: 'PJ', camp: 'pj', states: clone(states) })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const people = store => store.listParticipants();

/** Remplit un formulaire généré comme le ferait un MJ : une valeur valable partout, jamais de donnée inventée hors liste. */
function autofill(contract, store, { targetIds }) {
  const participants = people(store), actor = participants.find(row => row.id === 'priest');
  const targets = targetIds.map(targetId => participants.find(row => row.id === targetId));
  const form = emptyDivineForm();
  const model = buildDivineForm(contract, { actor, targets, form, choices: { effect: 0 } });
  for (const field of model.effectFields) {
    if (field.scope === 'target' && field.kind === 'number') continue;
    if (field.kind === 'number') setFieldValue(form, field, field.min ?? 1);
    if (field.kind === 'select') setFieldValue(form, field, field.options.find(([value]) => value && value !== '__none')?.[0] ?? '');
    if (field.kind === 'check') setFieldValue(form, field, true);
    if (field.kind === 'text') setFieldValue(form, field, 'devant le prêtre');
  }
  for (const fields of Object.values(model.factFields)) for (const field of fields) setFieldValue(form, field, field.field === 'ally' && !field.required ? 'false' : 'true');
  const expiry = model.descr.expiryField ? buildExpiry({ contract, actor, choices: {}, round: 1, phase: 'endOfRound', manualRounds: form.expiryRounds }) : undefined;
  return { model, form, request: { actorId: 'priest', targetIds, roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, ...(expiry ? { expiry } : {}), ...toEngineInput(form, { targetIds, contract, actor }) } };
}

test('chaque fait de la liste blanche des règles de cible a un libellé français et une aide', () => {
  for (const field of Object.values(targetRuleFactFields)) {
    assert.ok(FACT_FIELDS[field]?.label && FACT_FIELDS[field]?.help, field);
  }
});

test('faits de cible : tirés du contrat (règles, portée, effets), sans nom de prière', () => {
  const fields = name => targetFactFields(getDivineContract(name)).map(row => `${row.field}${row.required ? '!' : ''}`);
  assert.deepEqual(fields(SOULFIRE), ['withinRange!', 'undead', 'ruinServant', 'ally']);
  assert.deepEqual(fields(ANNIHILATE), ['withinRange!', 'undead!', 'ally']);
  assert.deepEqual(fields(MORR_HAND), ['withinTouch!', 'zeroWounds!', 'consenting!', 'ally']);
  assert.deepEqual(fields(BEACON), ['withinRange', 'ally!', 'seesPriest!']);
  assert.deepEqual(fields(id('soleil-flamboyant')), ['withinRange', 'nonMyrmidian!', 'lookingAtPriest!', 'ally']);
  const verdict = targetFactFields(getDivineContract(JUDGEMENT)).find(row => row.field === 'judgement');
  assert.equal(verdict.custom, true);
  assert.equal(verdict.required, true);
  assert.match(verdict.help, /Livre de base V5 EN, p\. \d+/);
  assert.match(targetFactFields(getDivineContract(SOULFIRE))[0].help, /Source : Livre de base V5 EN, p\. 227/);
});

test('descripteur : dés, retrait, soin, arme, durée et extensions viennent des effets', () => {
  const soulfire = describeDivineForm(getDivineContract(SOULFIRE), { actor: priestFor(getDivineContract(SOULFIRE)) });
  assert.deepEqual(soulfire.damage.dice, { count: 1, sides: 10 });
  assert.equal(soulfire.areaTargets, true);
  assert.equal(soulfire.expiryField, false);
  assert.equal(describeDivineForm(getDivineContract(SUCCOUR)).removal.chosen, true);
  assert.equal(describeDivineForm(getDivineContract(TOUCH)).heal.extendable, true);
  assert.equal(describeDivineForm(getDivineContract(MORR_HAND)).calendarDuration, true);
  assert.equal(describeDivineForm(getDivineContract(MORR_HAND)).expiryField, false);
  const hammer = describeDivineForm(getDivineContract(HAMMER), { actor: priestFor(getDivineContract(HAMMER)) });
  assert.equal(hammer.weapon.weaponClass, 'marteau de guerre');
  assert.deepEqual(hammer.weapon.options.map(row => row.id), ['axe-1', 'ham-1']);
  assert.equal(describeDivineForm(getDivineContract('divine:blessing:myrmidia:battle')).expiryField, true);
  assert.equal(describeDivineForm(getDivineContract(SUCCOUR), { actor: priestFor(getDivineContract(SUCCOUR)) }).targetLimit, 6);
});

test('extensions : seules celles que le contrat et ses restrictions autorisent', () => {
  const keys = name => extensionFields(getDivineContract(name)).map(row => row.key);
  assert.deepEqual(keys('divine:blessing:myrmidia:battle'), ['range', 'targets', 'duration']);
  assert.deepEqual(keys(TOUCH), ['targets', 'effect'], 'Contact : pas de portée ; instantané : pas de durée ; effet de soin déclaré');
  assert.deepEqual(keys(HAMMER), ['duration'], 'Vous / Vous : ni portée ni cible');
  assert.deepEqual(keys(SOULFIRE), ['targets'], 'zone autour de soi : portée Vous, durée instantanée');
  assert.match(extensionFields(getDivineContract('divine:blessing:myrmidia:battle'))[0].help, /\+6 mètres de jeu/);
  assert.match(extensionFields(getDivineContract(SOULFIRE))[0].help, /valeur de base/);
});

test('formulaire généré : dégâts communs et par cible, États à retirer, arme, soin', () => {
  const foe = fighter('foe', { states: [{ id: 's1', key: 'assourdi', name: 'Assourdi', level: 2 }] }), plain = fighter('plain');
  const soulfire = getDivineContract(SOULFIRE);
  const model = buildDivineForm(soulfire, { actor: fighter('priest'), targets: [foe, plain] });
  assert.deepEqual(model.effectFields.map(row => row.id), ['damageRoll', 'damageRolls:foe', 'damageRolls:plain']);
  assert.equal(model.effectFields[0].min, 1);
  assert.equal(model.effectFields[0].max, 10);
  assert.ok(model.effectFields.every(row => row.label && row.help));
  assert.equal(Object.keys(model.factFields).length, 2);
  const removal = buildDivineForm(getDivineContract(SUCCOUR), { actor: fighter('priest'), targets: [foe, plain] });
  const select = removal.effectFields.find(row => row.id === 'removal:foe');
  assert.deepEqual(select.options.map(([value]) => value), ['', 's1', '__none']);
  assert.match(select.options[1][1], /Assourdi \(niveau 2\)/);
  assert.equal(removal.effectFields.find(row => row.id === 'removal:plain').empty, true);
  const heal = buildDivineForm(getDivineContract(TOUCH), { actor: fighter('priest'), targets: [foe], choices: { effect: 2 } });
  assert.equal(heal.effectFields[0].max, 3);
  const none = buildDivineForm(getDivineContract(HAMMER), { actor: fighter('priest'), targets: [] });
  assert.equal(none.effectFields.find(row => row.id === 'weapon').empty, true);
  const fixed = buildDivineForm(getDivineContract(BEACON), { actor: fighter('priest'), targets: [foe] });
  assert.match(fixed.info[0], /Broken/);
});

test('brouillon -> entrées moteur : jets, retraits, faits et arme, pour les cibles retenues seulement', () => {
  const form = emptyDivineForm();
  form.damageRoll = '7'; form.healCount = '1'; form.weaponId = 'ham-1'; form.weaponClassConfirmed = true;
  form.damageRolls = { a: '3', b: '', gone: '9' };
  form.removals = { a: 's1', b: '__none', gone: 's9' };
  form.facts = { a: { withinRange: 'true', ally: 'false', undead: '' }, gone: { withinRange: 'true' } };
  assert.deepEqual(toEngineInput(form, { targetIds: ['a', 'b'] }), {
    damageRoll: 7, damageRolls: { a: 3 }, removals: { a: { stateId: 's1' }, b: { none: true } }, healCount: 1,
    facts: { targets: { a: { withinRange: true, ally: false } }, weapon: { equipmentId: 'ham-1', classConfirmed: true } }
  });
  assert.deepEqual(toEngineInput(emptyDivineForm(), { targetIds: ['a'] }), { facts: { targets: {} } });
  const field = { path: ['facts', 'x', 'undead'], kind: 'tri' };
  setFieldValue(form, field, 'true');
  assert.equal(fieldValue(form, field), 'true');
  assert.equal(fieldValue(form, { path: ['nope', 'x'], kind: 'number' }), '');
});

test('needsInput de l’aperçu : rattachés aux champs du formulaire', () => {
  const targets = [fighter('foe', { name: 'Goule' })];
  const rows = classifyNeeds([{ field: 'damageRoll', label: 'Jet' }, { field: 'damageRolls.foe', label: 'Jet' }, { field: 'removals.foe.stateId', label: 'État' },
    { field: 'facts.targets.foe.undead', label: 'x' }, { field: 'facts.targets.foe.within-range', label: 'within-range' }, { field: 'facts.weapon.equipmentId', label: 'Arme' },
    { field: 'clockAnchor', label: 'Horloge' }, { field: 'expiry', label: 'Échéance' }, { field: 'choices', label: 'Extensions' }, { field: 'targetIds', label: 'Cibles' }, 'texte libre'], { targets });
  assert.deepEqual(rows.map(row => row.anchor), ['damageRoll', 'damageRolls:foe', 'removal:foe', 'fact:foe:undead', null, 'weapon', null, 'expiry', 'extensions', 'targets', null]);
  assert.equal(rows[3].label, `Goule : ${FACT_FIELDS.undead.label}`);
  assert.match(rows[6].label, /Temps de campagne/);
});

test('avertissement de zone : un allié coché est signalé', () => {
  const actor = fighter('priest', { camp: 'pj' });
  const ally = fighter('friend', { camp: 'pj', name: 'Ami' }), foe = fighter('foe');
  const descr = describeDivineForm(getDivineContract(SOULFIRE), { actor });
  assert.deepEqual(formWarnings(descr, actor, [ally, foe]), ['Ami est un allié du prêtre : l’effet de zone l’atteindra aussi.']);
  assert.equal(formWarnings(descr, actor, [foe]).length, 0);
  assert.equal(formWarnings(descr, actor, [foe], { facts: { foe: { ally: 'true' } } }).length, 1);
  assert.equal(formWarnings(describeDivineForm(getDivineContract(SUCCOUR), { actor }), actor, [ally]).length, 0);
});

test('durée et échéance : arithmétique du moteur, jamais devinée', () => {
  const actor = fighter('priest');
  const battle = getDivineContract('divine:blessing:myrmidia:battle');
  assert.equal(prayerDurationRounds(battle, actor, {}), 6);
  assert.equal(prayerDurationRounds(battle, actor, { duration: 2 }), 18);
  const hammer = getDivineContract(HAMMER);
  assert.equal(prayerDurationRounds(hammer, actor, {}), 6, 'bonus de Sociabilité');
  assert.equal(prayerDurationRounds(hammer, actor, { duration: 1 }), 12, 'palier = valeur de base');
  assert.equal(prayerDurationRounds(getDivineContract(MORR_HAND), actor, {}), null, 'heures : échéance calendaire');
  assert.equal(prayerDurationRounds(getDivineContract(SOULFIRE), actor, {}), null);
  assert.deepEqual(buildExpiry({ contract: battle, actor, choices: {}, round: 3, phase: 'endOfTurn' }), { phase: 'endOfTurn', round: 8, actorId: 'priest', moment: 'afterEffects' });
  assert.equal(buildExpiry({ contract: battle, actor, choices: {}, round: 3, phase: '' }), undefined);
  assert.equal(formatCampaignTime(90061), '1 j 1 h 1 min 1 s');
  const result = { preview: { success: true, resolvedParams: { duration: { value: 3, unit: 'hours' } } }, input: { clockAnchor: { campaignSeconds: 600 } } };
  assert.match(deadlineLines(result)[0], /3 h 10 min.*horloge actuelle 10 min \+ 3 h/);
  assert.deepEqual(deadlineLines({ ...result, input: {} }), []);
  assert.match(deadlineLines({ preview: { success: true, resolvedParams: { duration: { value: 6, unit: 'rounds' } } }, input: { expiry: { phase: 'endOfTurn', round: 6 } } }, { actorName: 'Elise' })[0], /fin du Tour de Elise au Round 6/);
  assert.match(sourceText(getDivineContract(SOULFIRE)), /^Livre de base V5 EN, p\. 227$/);
});

test('reçus : dés, DR, Blessures perdues, États retirés, soin et arme en clair', () => {
  const contract = getDivineContract(SOULFIRE);
  const participants = [fighter('foe', { name: 'Goule', states: [{ id: 'st1', key: 'assourdi', name: 'Assourdi' }] })];
  const damage = { targetId: 'foe', type: 'direct-damage', result: { die: 6, DR: 2, bonuses: { conditional: 2, holyHatred: 0 }, woundsLost: 10, hpBefore: 20, hpAfter: 10, conditions: ['Enflammé'] } };
  assert.equal(describeEffectResult(damage, { contract, participants }), 'Goule : 10 Blessure(s) perdue(s) (1d10 = 6, 2 DR, bonus ciblé +2) · 20 → 10 · État acquis : Enflammé');
  assert.equal(describeEffectResult({ targetId: 'foe', type: 'remove-condition', result: { removed: [{ id: 'st1', key: 'assourdi', level: 1 }], remaining: 0 } }, { participants }),
    'Goule : État(s) retiré(s) : Assourdi · 0 État(s) restant(s)');
  assert.match(describeEffectResult({ targetId: 'foe', type: 'remove-condition', result: { removed: [], remaining: 1 } }, { participants }), /aucun État retiré/);
  assert.match(describeEffectResult({ targetId: 'foe', type: 'wound-heal', result: { hpDelta: 6, amount: 6, chosen: 1, slots: 2 } }, { participants }), /6 Blessure\(s\) récupérée\(s\) \(6 × 1\/2/);
  assert.match(describeEffectResult({ targetId: 'foe', type: 'weapon-bonus', result: { damage: 6, equipmentId: 'ham-1', classConfirmed: false } }, { participants }), /ham-1, dégâts \+6 · classe d’arme non confirmée/);
  assert.equal(describeEffectResult({ targetId: 'foe', type: 'characteristic-modifier' }, {}), null);
  const summary = summarizeExecution({ prayer: { success: true, sl: 2 }, effectReceipts: [damage], reminders: ['Rappel'] }, { contract, participants });
  assert.equal(summary.title, 'Feu de l’âme · prière réussie (2 DR)');
  assert.deepEqual([summary.lines.length, summary.reminders], [1, ['Rappel']]);
  assert.equal(summarizeExecution(null), null);
});

test('le moteur accepte ce que le formulaire produit : tous les miracles et bénédictions utilisables', async () => {
  const unusable = [];
  for (const contract of getAllDivineContracts().filter(row => row.status !== 'blocked' && ['blessing', 'miracle'].includes(row.type))) {
    const store = await fixture(contract);
    const descr = describeDivineForm(contract, { actor: people(store).find(row => row.id === 'priest') });
    const targetIds = descr.implicitTarget ? [] : descr.selfTargeted ? ['priest'] : ['foe'];
    const { request } = autofill(contract, store, { targetIds });
    const preview = store.previewDivineExecution(contract.id, request);
    if (!preview.ready) unusable.push(`${contract.id} : ${preview.error} ${JSON.stringify(preview.needsInput)}`);
  }
  assert.deepEqual(unusable, []);
});

test('de bout en bout : Feu de l’âme, Secours de Rhya et Marteau enflammé depuis le formulaire', async () => {
  const run = async (contractId, targetIds, tweak) => {
    const contract = getDivineContract(contractId), store = await fixture(contract);
    const filled = autofill(contract, store, { targetIds });
    tweak?.(filled);
    const request = { ...filled.request, ...toEngineInput(filled.form, { targetIds }) };
    const preview = store.previewDivineExecution(contractId, request);
    assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
    assert.ok(Array.isArray(preview.projectedEffects), 'l’aperçu projette les effets par cible sans rien appliquer');
    const result = await store.applyDivineExecution(contractId, { preview });
    assert.equal(result.ready, true, result.error);
    return { store, result };
  };
  const fire = await run(SOULFIRE, ['foe', 'friend'], ({ form }) => { form.damageRoll = '5'; form.damageRolls.friend = '2'; Object.assign(form.facts.friend, { undead: 'false', ruinServant: 'false' }); });
  const hp = Object.fromEntries(people(fire.store).map(row => [row.id, row.hp]));
  assert.equal(hp.foe, 20 - (5 + 2), 'jet commun 5 + 1 par DR (2 DR) contre un mort-vivant');
  assert.equal(hp.friend, 20 - 2, 'jet propre à la cible, aucun bonus');
  assert.ok(fire.result.receipt.effectReceipts.every(row => describeEffectResult(row, { contract: getDivineContract(SOULFIRE), participants: people(fire.store) })));
  const succour = await run(SUCCOUR, ['foe'], ({ form }) => { form.removals.foe = 'st-broken'; });
  assert.deepEqual(people(succour.store).find(row => row.id === 'foe').states.map(row => row.id), ['st-deaf']);
  assert.ok(JSON.parse(succour.store.getFullJSON()).log.some(row => /foe : État\(s\) retiré\(s\) : Brisé/.test(row.text)), 'le journal nomme l’État retiré');
  assert.equal(succour.result.receipt.effectReceipts[0].result.removedNames[0], 'Brisé');
  const hammer = await run(HAMMER, ['priest'], ({ form }) => { form.weaponId = 'ham-1'; });
  const bonus = people(hammer.store).find(row => row.id === 'priest').extensions.v5.weaponBonuses.find(row => row.equipmentId);
  assert.equal(bonus.equipmentId, 'ham-1');
});
});
