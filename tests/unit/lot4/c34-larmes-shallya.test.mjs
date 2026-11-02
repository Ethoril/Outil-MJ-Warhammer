// C34 · G-DIV-13 : le choix de Blessure Critique fait dans le formulaire (Larmes de Shallya) doit arriver au moteur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { getDivineContract, getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { buildDivineForm, emptyDivineForm, setFieldValue, toEngineInput } from '../../../js/ui/v5-divine-form-model.js';

const clone = value => structuredClone(value);
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
    extensions: { v5: { turnIndex: 1, combatId: 'c34' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const critAttack = (id, effectRoll) => ({ resolutionId: id, actorId: 'foe', targetId: 'ally', roll: 22,
  action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' },
  criticalRolls: { location: 2, effect: effectRoll } });

async function woundedFixture() {
  const store = await fixture();
  const result = await store.applyResolution(store.previewResolution(critAttack('w1', 80)));
  assert.notEqual(result.status, 'manual', result.reason);
  assert.equal(records(store, 'ally').length, 1, 'une Blessure Critique au registre');
  return store;
}
const baseInput = { actorId: 'priest', targetIds: ['ally'], roll: 25, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 } };

test('C34 : le formulaire expose une liste de Blessures Critiques par cible, écrite au chemin lu par le moteur', async () => {
  const store = await woundedFixture();
  const contract = getDivineContract(TEARS), ally = person(store, 'ally');
  const model = buildDivineForm(contract, { actor: person(store, 'priest'), targets: [ally], form: emptyDivineForm() });
  const field = model.effectFields.find(f => f.engineField === 'criticalHeals.first.ally');
  assert.ok(field, 'champ criticalHeals.first.ally');
  assert.ok(field.options.some(([value]) => value === records(store, 'ally')[0].id), 'la Blessure du registre est proposée');
});

test('C34 : toEngineInput transmet la Blessure choisie dans le formulaire (criticalHeals.first.<cible>)', async () => {
  const store = await woundedFixture();
  const contract = getDivineContract(TEARS), actor = person(store, 'priest'), ally = person(store, 'ally');
  const form = emptyDivineForm();
  const model = buildDivineForm(contract, { actor, targets: [ally], form });
  const field = model.effectFields.find(f => f.engineField === 'criticalHeals.first.ally');
  setFieldValue(form, field, records(store, 'ally')[0].id);
  const input = toEngineInput(form, { targetIds: ['ally'], contract, actor });
  assert.equal(input.criticalHeals?.first?.ally, records(store, 'ally')[0].id, JSON.stringify(input));
});

test('C34 : parcours complet du formulaire sans saisie manuelle, Appliquer devient possible et la Blessure est retirée', async () => {
  const store = await woundedFixture();
  const contract = getDivineContract(TEARS), actor = person(store, 'priest'), ally = person(store, 'ally');
  const form = emptyDivineForm();
  const model = buildDivineForm(contract, { actor, targets: [ally], form });
  setFieldValue(form, model.effectFields.find(f => f.engineField === 'criticalHeals.first.ally'), records(store, 'ally')[0].id);
  const input = { ...baseInput, ...toEngineInput(form, { targetIds: ['ally'], contract, actor }), facts: { targets: { ally: { withinTouch: true } } } };
  const preview = store.previewDivineExecution(TEARS, input);
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput));
  const result = await store.applyDivineExecution(TEARS, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(records(store, 'ally').length, 0);
});

test('C34 (témoin) : sans choix, le blocage « en choisir au moins une » reste exigé', async () => {
  const store = await woundedFixture();
  const contract = getDivineContract(TEARS), actor = person(store, 'priest');
  const input = { ...baseInput, ...toEngineInput(emptyDivineForm(), { targetIds: ['ally'], contract, actor }), facts: { targets: { ally: { withinTouch: true } } } };
  const preview = store.previewDivineExecution(TEARS, input);
  assert.equal(preview.ready, false);
  assert.match(JSON.stringify(preview.needsInput), /en choisir au moins une/);
});
