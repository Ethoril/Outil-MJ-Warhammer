import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';
import { hasImplicitCasterTarget } from '../js/core/v5-divine-effect-handlers.js';
import { buildDivineForm, describeDivineForm, targetFactFields, emptyDivineForm, toEngineInput } from '../js/ui/v5-divine-form-model.js';

// P4d : une prière dont TOUS les effets sont des invocations portées par le prêtre n'exige ni cible explicite ni fait « à portée » ;
// tous les autres contrats gardent exactement leurs exigences (caractérisation).
const clone = value => structuredClone(value);
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
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
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
  assert.deepEqual(implicit, [CAT, EAGLE, HOWL, KING].sort());
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

test('Hurlement du loup et Roi de la Nature : cibles et faits superflus restent acceptés, même résultat', async () => {
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
