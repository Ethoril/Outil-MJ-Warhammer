import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts, finalizeDivineState } from '../js/core/v5-divine-store.js';
import registry from '../js/data/v5-divine-contracts.json' with { type: 'json' };
import { effectHandlers, validateEffect, effectNeeds } from '../js/core/v5-divine-effect-handlers.js';
import { normalizeTestKey, categoryTestKeys } from '../js/core/v5-divine-effects-tests.js';
import { prayerDurationRounds } from '../js/ui/v5-divine-form-model.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';

// P4b T1 : modificateurs de Test divins (clés normalisées, catégories, valeurs dynamiques, durée Bonus + n). Contrats d'essai.
const clone = value => structuredClone(value);
const MASK = getAllDivineContracts().find(row => row.type === 'miracle' && row.name === 'Masque mortuaire').id;
const { schemaVersion: _s, sourceFingerprint: _f, ...base } = getDivineContract(MASK);
const registered = [];
const BONUS_ROUNDS = { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'rounds' };
const AREA = { kind: 'area', characteristicBonus: 'Soc', unit: 'yards' };
function synthetic(key, effects, { duration = { kind: 'fixed', value: 6, unit: 'rounds' }, range = { kind: 'self' }, targets = { kind: 'self' } } = {}) {
  const id = `divine:miracle:morr:test-p4b-tests-${key}`;
  const contract = { ...clone(base), id, name: `Essai ${key}`, catalogueName: `Essai ${key}`, canonicalName: `Test p4b tests ${key}`, status: 'assisted',
    params: { range, targets, duration }, effects: clone(effects), targetRules: [],
    clauses: [{ id: 'effect', mode: 'engine', text: 'Effet moteur.', sourceRef: 'test' }], needsInput: [] };
  registry.contracts.push(contract); registered.push(id);
  return id;
}
after(() => { registry.contracts = registry.contracts.filter(row => !registered.includes(row.id)); });
const fixed = (type = 'test-modifier', extra = {}) => ({ type, duration: { value: 6, unit: 'rounds' }, ...extra });
// Durée suivant le paramètre du miracle, comme les contrats générés.
const followsParam = (extra = {}) => ({ type: 'test-modifier', duration: { value: null, sourceParameter: 'params.duration', unit: 'rounds', requiresResolvedExpiry: true }, ...extra });

const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Morr' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Morr' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
async function fixture({ priest = {} } = {}) {
  const persistence = memory();
  const store = createStore({ persistence, storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [actor('priest', priest), actor('ally', { initiative: 30 })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  store.persistence = persistence;
  return store;
}
const input = (more = {}) => ({ actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, ...more });
async function cast(store, contractId, more) {
  const preview = store.previewDivineExecution(contractId, input(more));
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return { preview, result };
}
const layers = (store, id) => person(store, id).extensions.v5.divineEffects || [];
const mods = (store, id) => person(store, id).extensions.v5.testModifiers ?? {};
const toRoundEnd = async store => { for (let i = 0; i < 25; i++) await store.nextTurn(); };

test('normalisation des clés : Mêlée et Endurance deviennent les compétences du catalogue, le reste est conservé', () => {
  assert.equal(normalizeTestKey('Mêlée'), 'Corps à corps');
  assert.equal(normalizeTestKey('Endurance'), 'Résistance');
  assert.equal(normalizeTestKey('melee (Escrime)'), 'Corps à corps (Escrime)');
  assert.equal(normalizeTestKey('Natation'), 'Natation');
  const groups = new Set(getReferenceCatalogue().skills.map(skill => skill.group || skill.nom));
  for (const key of ['Corps à corps', 'Résistance']) assert.ok(groups.has(key), key);
});

test('catégories : toutes les compétences de la caractéristique, Prière exclue, groupes sans doublon', () => {
  const soc = categoryTestKeys('soc');
  assert.ok(soc.includes('Charme'), soc.join());
  assert.ok(!soc.includes('Prière') && !soc.some(key => /^pri[eè]re/i.test(key)), soc.join());
  assert.equal(new Set(soc).size, soc.length);
  assert.deepEqual(categoryTestKeys('cc'), ['Corps à corps']);
  assert.ok(categoryTestKeys('ag').includes('Athlétisme'));
  assert.deepEqual(categoryTestKeys('inconnue'), []);
});

test('validate : formes dynamiques, catégories, durée et ancienne forme', () => {
  const check = extra => validateEffect({ type: 'test-modifier', ...extra });
  assert.equal(check({ modifiers: { Natation: 4 } }), null);
  assert.equal(check({ modifiers: { Endurance: { fromCharacteristicBonus: 'Soc' } }, durationBonus: 3 }), null);
  assert.equal(check({ modifiers: { Charme: { fromSuccessLevels: true, per: 2 } } }), null);
  assert.equal(check({ modifiers: { Calme: { base: 2, perGroup: { size: 10, add: 1 } } }, categories: { soc: -3 } }), null);
  assert.match(check({}), /exige/);
  assert.match(check({ modifiers: {} }), /exige/);
  assert.match(check({ modifiers: { 'Prière (Sigmar)': 1 } }), /ambiguë/);
  assert.match(check({ modifiers: { all: 1.5 } }), /entier/);
  assert.match(check({ modifiers: { Charme: { fromCharacteristicBonus: 'Zz' } } }), /caractéristique/);
  assert.match(check({ modifiers: { Charme: { fromSuccessLevels: true, perGroup: { size: 10, add: 1 } } } }), /exactement/);
  assert.match(check({ modifiers: { Charme: { perGroup: { size: 0, add: 1 } } } }), /perGroup/);
  assert.match(check({ categories: { zz: 1 } }), /catégorie inconnue/);
  assert.match(check({ modifiers: { Charme: 1 }, durationBonus: 0 }), /durationBonus/);
  assert.match(check({ modifiers: { Mêlée: 1, 'Corps à corps': 2 } }), /double/);
});

test('Résistance = Bonus de Sociabilité du prêtre (60 -> 6), clé « Endurance » normalisée, durée Bonus + 3 Rounds alignée', async () => {
  const id = synthetic('aurochs', [followsParam({ modifiers: { Endurance: { fromCharacteristicBonus: 'Soc' } }, durationBonus: 3 })], { duration: BONUS_ROUNDS });
  const store = await fixture();
  // Échéance du Round 6 : la durée résolue vaut 6 + 3 = 9 Rounds, donc l'échéance doit être le Round 9.
  const early = store.previewDivineExecution(id, input());
  assert.equal(early.ready, false);
  assert.match(early.error, /9 Round/);
  const { preview } = await cast(store, id, { expiry: { phase: 'endOfTurn', round: 9, actorId: 'priest' } });
  assert.deepEqual(preview.preview.effects[0].modifiers, { 'Résistance': 6 });
  assert.equal(preview.preview.effects[0].duration.value, 9);
  assert.equal(preview.preview.effects[0].durationBonus, undefined);
  assert.deepEqual(layers(store, 'priest')[0].testModifiers, { 'Résistance': 6 });
  assert.deepEqual(mods(store, 'priest'), { 'Résistance': 6 });
});

test('durée Bonus + n : le +n est compté dans chaque extension de durée (valeur initiale Bonus + n)', async () => {
  const id = synthetic('aurochs-ext', [followsParam({ modifiers: { Résistance: 1 }, durationBonus: 3 })], { duration: BONUS_ROUNDS });
  const store = await fixture();
  const probe = store.previewDivineExecution(id, input({ roll: 21 }));
  assert.ok(probe.preview.prayer.sl >= 2, `DR ${probe.preview.prayer.sl}`);
  // 1 extension : base 6 + 6, plus 3 * (1 + 1) = 18 Rounds.
  await cast(store, id, { roll: 21, choices: { range: 0, targets: 0, duration: 1, effect: 0 }, expiry: { phase: 'endOfTurn', round: 18, actorId: 'priest' } });
  assert.deepEqual(mods(store, 'priest'), { 'Résistance': 1 });
});

test('catégorie Soc : -3 sur les compétences de Sociabilité, jamais sur Prière ; levée à la fin et à l’Undo', async () => {
  const id = synthetic('pressure', [fixed('test-modifier', { categories: { soc: -3 } })]);
  const second = synthetic('pressure-pray', [fixed('test-modifier', { modifiers: { Natation: 1 } })]);
  const store = await fixture();
  const before = store.previewDivineExecution(id, input()).preview.prayer.sl;
  const { result } = await cast(store, id);
  const applied = mods(store, 'priest');
  assert.equal(applied.Charme, -3);
  assert.ok(!Object.keys(applied).some(key => /^pri[eè]re/i.test(key)), Object.keys(applied).join());
  assert.ok(Object.values(applied).every(value => value === -3));
  // Le Test de Prière suivant n'est pas pénalisé.
  const after2 = store.previewDivineExecution(second, input()); assert.equal(after2.ready, true, after2.error); assert.equal(after2.preview.prayer.sl, before);
  await store.undo();
  assert.deepEqual(mods(store, 'priest'), {});
  await store.redo();
  assert.equal(mods(store, 'priest').Charme, -3);
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'Fin décidée par le MJ' });
  assert.deepEqual(mods(store, 'priest'), {});
});

test('non-cumul : meilleur bonus + pire malus par clé, y compris entre deux prières', async () => {
  const bonusA = synthetic('stack-a', [fixed('test-modifier', { modifiers: { Résistance: 3 } })]);
  const bonusB = synthetic('stack-b', [fixed('test-modifier', { modifiers: { Résistance: 5 } })]);
  const malus = synthetic('stack-c', [fixed('test-modifier', { categories: { e: -4 }, modifiers: { Natation: 2 } })]);
  const store = await fixture();
  await cast(store, bonusA);
  await cast(store, bonusB, { actorId: 'priest' });
  assert.equal(mods(store, 'priest')['Résistance'], 5);
  await cast(store, malus);
  assert.equal(mods(store, 'priest')['Résistance'], 1);
  assert.equal(mods(store, 'priest').Natation, 2);
});

test('foule : 2 + 1 par tranche complète de 10, taille saisie par le MJ (fait requis, champ déclaré)', async () => {
  const spec = { base: 2, perGroup: { size: 10, add: 1 } };
  const effects = [fixed('test-modifier', { modifiers: { Endurance: spec, Calme: spec } })];
  const id = synthetic('crowd', effects);
  const handler = effectHandlers['test-modifier'];
  assert.deepEqual(handler.inputFields(effects[0], {}).map(field => [field.path, field.kind, field.scope]), [['crowdSize', 'number', 'effect']]);
  assert.deepEqual(handler.inputFields(fixed('test-modifier', { modifiers: { Calme: 1 } }), {}), []);
  assert.equal(effectNeeds(effects[0], { input: {} })[0].field, 'crowdSize');
  const store = await fixture();
  const blocked = store.previewDivineExecution(id, input());
  assert.equal(blocked.ready, false);
  assert.ok(JSON.stringify(blocked.needsInput).includes('crowdSize'), JSON.stringify(blocked.needsInput));
  for (const [crowd, expected] of [[0, 2], [9, 2], [10, 3], [25, 4]]) {
    const preview = store.previewDivineExecution(id, input({ crowdSize: crowd }));
    assert.equal(preview.ready, true, preview.error);
    assert.deepEqual(preview.preview.effects[0].modifiers, { 'Résistance': expected, 'Calme': expected }, `foule ${crowd}`);
  }
  assert.equal(store.previewDivineExecution(id, input({ crowdSize: -1 })).ready, false);
  assert.equal(store.previewDivineExecution(id, input({ crowdSize: 2.5 })).ready, false);
});

test('Charme = DR du Test de Prière, réservé au prêtre (appliesTo caster), valeur figée dans l’aperçu', async () => {
  const id = synthetic('trickle', [fixed('test-modifier', { modifiers: { Charme: { fromSuccessLevels: true } }, appliesTo: 'caster' })],
    { range: { kind: 'self' }, targets: AREA });
  const store = await fixture();
  const facts = { targets: { priest: { withinRange: true }, ally: { withinRange: true } } };
  const { preview } = await cast(store, id, { roll: 21, targetIds: ['priest', 'ally'], facts });
  const dr = preview.preview.prayer.sl;
  assert.ok(dr >= 1);
  assert.deepEqual(preview.preview.effects[0].modifiers, { Charme: dr });
  assert.equal(mods(store, 'priest').Charme, dr);
  assert.deepEqual(layers(store, 'ally'), []);
});

test('resolve : Bonus de caractéristique inconnu bloque l’aperçu avec son besoin', () => {
  const effect = { type: 'test-modifier', modifiers: { Résistance: { fromCharacteristicBonus: 'Soc' } } };
  const resolved = effectHandlers['test-modifier'].resolve(effect, { actor: { caracs: { E: 30 } }, prayer: { sl: 1 }, input: {} });
  assert.match(resolved.error, /Soc/);
  assert.equal(resolved.needs[0].field, 'actor.caracs.Soc');
  assert.deepEqual(effectHandlers['test-modifier'].resolve(effect, { actor: { caracs: { soc: 47 } }, prayer: { sl: 1 }, input: {} }).modifiers, { 'Résistance': 4 });
});

test('ancienne forme {Natation: 4} : couche inchangée', async () => {
  const id = synthetic('legacy', [fixed('test-modifier', { modifiers: { Natation: 4 } })]);
  const store = await fixture();
  await cast(store, id);
  assert.deepEqual(layers(store, 'priest')[0].testModifiers, { Natation: 4 });
});

test('DIV-05 : un modificateur de Test magique sur la même clé bloque toujours le cumul avec une couche divine', () => {
  const state = (divine, spell) => ({ combat: { participants: [{ id: 'p', zone: 'active', extensions: { v5: { divineEffects: [{ id: 'd', ...divine }], spellEffects: [{ id: 's', ...spell }] } } }] } });
  const layer = { testModifiers: { 'Résistance': 6 } };
  assert.throws(() => finalizeDivineState(state(layer, { testModifiers: { 'Résistance': 1 } }), state(layer, { testModifiers: { 'Résistance': 1 } })), /modificateur de Test divin et magique/);
  assert.doesNotThrow(() => finalizeDivineState(state(layer, { testModifiers: { Charme: 1 } }), state(layer, { testModifiers: { Charme: 1 } })));
});

test('formulaire : la durée Bonus + n du miracle suit la même arithmétique que le moteur (échéance alignée)', () => {
  const contract = { params: { duration: BONUS_ROUNDS }, effects: [{ type: 'test-modifier', modifiers: { Résistance: 1 }, durationBonus: 3 }],
    extensions: [{ choices: [{ duration: { addBaseValue: true } }] }] };
  const priest = { caracs: { Soc: 60 } };
  assert.equal(prayerDurationRounds(contract, priest, {}), 9);
  assert.equal(prayerDurationRounds(contract, priest, { duration: 1 }), 18);
  assert.equal(prayerDurationRounds({ ...contract, effects: [] }, priest, {}), 6);
});
