import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';
import registry from '../js/data/v5-divine-contracts.json' with { type: 'json' };
import { previewDivineExecution } from '../js/core/v5-divine-engine.js';
import { effectHandlers, validateEffect } from '../js/core/v5-divine-effect-handlers.js';
import { effectTypes } from '../js/core/v5-divine-grammar.js';
import { buildDivineForm, emptyDivineForm, setFieldValue, toEngineInput, classifyNeeds, targetFactFields } from '../js/ui/v5-divine-form-model.js';
import { buildCombatTest } from '../js/core/v5-combat-rules.js';

// Socle P4b : crochets génériques des modules d'effet (resolve, applies, appliesTo, champs d'entrée) et lecture des testModifiers divins.
// Les crochets sont posés temporairement sur le gestionnaire de `test-modifier` (objet mutable) ; contrats d'essai sur le modèle de p4a-gear.
const clone = value => structuredClone(value);
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
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
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
