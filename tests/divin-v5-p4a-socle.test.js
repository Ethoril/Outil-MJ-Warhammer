import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts, finalizeDivineState } from '../js/core/v5-divine-store.js';
import registry from '../js/data/v5-divine-contracts.json' with { type: 'json' };
import { previewDivineExecution, applyDivineExecution } from '../js/core/v5-divine-engine.js';
import { effectTypes, calendarDurationUnits, paramKinds, paramUnits, targetRuleFacts } from '../js/core/v5-divine-grammar.js';
import { effectHandlers, validateEffect, effectNeeds, progressionError } from '../js/core/v5-divine-effect-handlers.js';

// Socle P4a : statut assisted, grammaire C7 (miles, touch, zone entière, force d'État), échéances calendaires C9.
const clone = value => structuredClone(value);
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
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
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
  const root = fileURLToPath(new URL('..', import.meta.url));
  const output = execFileSync(process.execPath, ['tools/build-v5-divine-contracts.mjs', '--check'], { cwd: root, encoding: 'utf8' });
  assert.match(output, /current/);
});
