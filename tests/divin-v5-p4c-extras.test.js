import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';
import { buildDivineForm, emptyDivineForm, setFieldValue, toEngineInput } from '../js/ui/v5-divine-form-model.js';

// Dévotion de la Guerrière (ennemi saisi au lancement), Yeux de chat (capteur) et Vindicte Vengeresse, contre les VRAIS contrats régénérés.
const clone = value => structuredClone(value);
const DEVOTION = 'divine:miracle:devotion-de-la-guerriere', CAT = 'divine:miracle:ranald:cat-s-eyes', GRACE = 'divine:miracle:ranald:ranald-s-grace', WRATH = 'divine:miracle:vindicte-vengeresse';

const actor = (id, initiative, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: ['Myrmidia', 'Ranald'].map(specialization => ({ id: 'talent-invoke', status: 'resolved', rank: 1, specialization })),
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
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
  const { preview } = await cast(store, DEVOTION, { ...allyFacts, talent: { specialization: '  Gobelins \n des  collines ' } });
  assert.equal(preview.preview.effects[0].talents[0].specialization, 'Gobelins des collines');
  assert.equal(preview.preview.effects[0].specializationFrom, undefined);
  assert.deepEqual(talentRows(injected(store, 'ally')), [['talent-fearless', 'Gobelins des collines', 1, true]]);
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
  for (const talent of [undefined, { specialization: '' }, { specialization: '   ' }, { specialization: 42 }, { specialization: 'x'.repeat(61) }]) {
    const preview = store.previewDivineExecution(DEVOTION, input({ ...allyFacts, ...(talent ? { talent } : {}) }));
    assert.equal(preview.ready, false, JSON.stringify(talent));
    assert.match(JSON.stringify(preview.needsInput), /talent\.specialization/);
  }
  assert.equal(store.previewDivineExecution(DEVOTION, input({ ...allyFacts, talent: { specialization: 'x'.repeat(60) } })).ready, true);
  assert.deepEqual(world(store), before);
});

test('Dévotion de la Guerrière : le formulaire expose le champ « Ennemi visé »', async () => {
  const store = await fixture();
  const contract = getDivineContract(DEVOTION), priest = person(store, 'priest');
  const form = emptyDivineForm();
  const model = buildDivineForm(contract, { actor: priest, targets: [], form, choices: { effect: 0 } });
  const field = model.effectFields.find(row => row.path.join('.') === 'talent.specialization');
  assert.deepEqual([field.kind, field.label], ['text', 'Ennemi visé (espèce ou individu)']);
  setFieldValue(form, field, 'Orques');
  assert.deepEqual(toEngineInput(form, { targetIds: [], contract, actor: priest }).talent, { specialization: 'Orques' });
});

test('non-régression : un autre grant-talent (Grâce de Ranald, Chute féline) s’injecte sans saisie de spécialisation', async () => {
  assert.equal(getDivineContract(GRACE).effects.find(effect => effect.type === 'grant-talent').specializationFrom, undefined);
  const store = await fixture();
  await cast(store, GRACE, { targetIds: ['ally'], facts: { targets: { ally: { ally: true, withinTouch: true } } }, expiry: expiry(6) });
  assert.deepEqual(talentRows(injected(store, 'ally')), [['talent-catfall', undefined, 1, true]]);
  for (let i = 0; i < 40 && injected(store, 'ally').length; i++) await store.nextTurn();
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
