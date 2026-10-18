import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';
import registry from '../js/data/v5-divine-contracts.json' with { type: 'json' };
import { effectHandlers, validateEffect, effectNeeds } from '../js/core/v5-divine-effect-handlers.js';
import { buildDivineForm, emptyDivineForm } from '../js/ui/v5-divine-form-model.js';

// P4b T3 : effet `condition` conditionné par un fait de cible (when), contrats d'essai sur le modèle de p4a-gear.
const clone = value => structuredClone(value);
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
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
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
