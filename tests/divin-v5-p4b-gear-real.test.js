import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';
import { magicWeaponQualities, magicWeaponNature } from '../js/core/v5-magic-combat.js';
import { acquiredV5Talents } from '../js/core/v5-talents.js';

// P4b T4 contre les vrais contrats : à exécuter après régénération (node tools/build-v5-divine-contracts.mjs).
const clone = value => structuredClone(value);
const idOf = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === name).id;
const FURY = idOf('Appel à la Fureur'), INSPIRING = idOf('Inspirant'), SPEAR = idOf('Lance de Myrmidia'), VANQUISH = idOf('Vaincre les impies'),
  CHILL = idOf('Frisson du givre'), ANNIHILATE = idOf('Anéantir les morts-vivants'), ANCHORITE = idOf('Endurance de l’anachorète');

const actor = (id, cult, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: ['Vigilant'], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
async function fixture(cult, priest = {}) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [actor('priest', cult, priest), actor('ally', cult, { initiative: 30 })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const expiry = { phase: 'endOfTurn', round: 6, actorId: 'priest' };
const input = (more = {}) => ({ actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, expiry,
  facts: { targets: { ally: { withinRange: true } } }, ...more });
async function cast(store, contractId, more) {
  const preview = store.previewDivineExecution(contractId, input(more));
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}
const toRoundEnd = async store => { for (let i = 0; i < 12; i++) await store.nextTurn(); };
const injected = participant => (participant.talents || []).filter(row => row.divineEffectId);

test('statuts P4b T4 : cinq miracles assistés (clause moteur), deux promus en implemented', () => {
  for (const id of [FURY, INSPIRING, SPEAR, VANQUISH, CHILL]) {
    const contract = getDivineContract(id);
    assert.equal(contract.status, 'assisted', contract.name);
    assert.ok(contract.effects.length && contract.clauses.some(row => row.mode === 'engine' || row.mode === 'assisted'), contract.name);
  }
  for (const id of [ANNIHILATE, ANCHORITE]) assert.equal(getDivineContract(id).status, 'implemented', getDivineContract(id).name);
  assert.deepEqual(getDivineContract(FURY).effects.map(row => row.type), ['grant-talent']);
  assert.equal(getDivineContract(FURY).effects[0].talents[0].id, 'talent-frenzy');
  assert.equal(getDivineContract(INSPIRING).effects[0].talents[0].id, 'talent-drilled');
  assert.deepEqual(getDivineContract(SPEAR).effects[0].qualities, ['devastatrice']);
  assert.equal(getDivineContract(CHILL).effects[0].appliesTo, 'caster');
  assert.deepEqual(getDivineContract(VANQUISH).effects[0].talents.map(row => row.specialization), ['Orques', 'Gobelins', 'Morts-vivants', 'Associés au Chaos']);
  assert.ok(getDivineContract(VANQUISH).clauses.some(row => row.id === 'hatred-kill' && row.mode === 'manual'), 'bonus de +2 DR reste un rappel');
  assert.ok(getDivineContract(CHILL).clauses.some(row => row.id === 'advantage-loss' && row.mode === 'manual'), 'perte d’Avantage reste un rappel');
});

test('Appel à la Fureur et Inspirant : Frénésie et Coude-à-coude posés sur la cible puis retirés', async () => {
  for (const [id, talent] of [[FURY, 'talent-frenzy'], [INSPIRING, 'talent-drilled']]) {
    const store = await fixture('Myrmidia');
    await cast(store, id);
    assert.ok(acquiredV5Talents(person(store, 'ally')).some(row => row.talentId === talent), talent);
    await toRoundEnd(store);
    assert.ok(!acquiredV5Talents(person(store, 'ally')).some(row => row.talentId === talent), `${talent} retiré`);
    assert.equal(injected(person(store, 'ally')).length, 0);
  }
});

test('Lance de Myrmidia : Magique et Dévastatrice sur la lance désignée', async () => {
  const spear = { id: 'spear-attack', note: 'Lance', type: 'attack', attr: 'CC', base: 40, damage: 4, qualities: [], extensions: { fiche: { equipmentId: 'spear' } } };
  const store = await fixture('Myrmidia', { actions: [spear] });
  const preview = store.previewDivineExecution(SPEAR, input({ targetIds: ['priest'], facts: { targets: { priest: { withinRange: true } } } }));
  assert.equal(preview.ready, false);
  assert.ok(preview.needsInput.some(row => row.field === 'facts.weapon.equipmentId'));
  await cast(store, SPEAR, { targetIds: ['priest'], facts: { weapon: { equipmentId: 'spear', classConfirmed: true }, targets: { priest: { withinRange: true } } } });
  const priest = person(store, 'priest');
  assert.deepEqual(magicWeaponQualities(priest, spear).map(row => row.id), ['devastatrice']);
  assert.equal(magicWeaponNature(priest, spear).magical, true);
  await toRoundEnd(store);
  assert.deepEqual(magicWeaponQualities(person(store, 'priest'), spear), []);
});

test('Vaincre les impies : quatre lignes de Haine sur la cible, rappel du bonus de +2 DR', async () => {
  const store = await fixture('Sigmar');
  const result = await cast(store, VANQUISH);
  assert.deepEqual(injected(person(store, 'ally')).map(row => row.specialization).sort(), ['Associés au Chaos', 'Gobelins', 'Morts-vivants', 'Orques']);
  assert.ok(result.receipt.reminders.some(text => /\+2 DR/.test(text)), JSON.stringify(result.receipt.reminders));
  await toRoundEnd(store);
  assert.equal(injected(person(store, 'ally')).length, 0);
});

test('Frisson du givre : Peur (1) sur le prêtre seul, même si la cible est un autre participant', async () => {
  const store = await fixture('Ulric');
  await cast(store, CHILL, { targetIds: ['priest', 'ally'], facts: { targets: { priest: { withinRange: true }, ally: { withinRange: true } } } });
  assert.deepEqual(person(store, 'priest').traits, ['Vigilant', 'Peur (1)']);
  assert.deepEqual(person(store, 'ally').traits, ['Vigilant']);
  await toRoundEnd(store);
  assert.deepEqual(person(store, 'priest').traits, ['Vigilant']);
});
