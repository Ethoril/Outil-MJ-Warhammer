import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';
import registry from '../js/data/v5-divine-contracts.json' with { type: 'json' };
import { validateEffect } from '../js/core/v5-divine-effect-handlers.js';
import { magicWeaponQualities, magicWeaponNature } from '../js/core/v5-magic-combat.js';
import { acquiredV5Talents } from '../js/core/v5-talents.js';

// P4b T4 : Fureur, Coude-à-coude, Haine par groupe, qualité Dévastatrice et Peur sur le prêtre seul, contre des contrats synthétiques.
const clone = value => structuredClone(value);
const MASK = getAllDivineContracts().find(row => row.type === 'miracle' && row.name === 'Masque mortuaire').id;
const { schemaVersion: _s, sourceFingerprint: _f, ...base } = getDivineContract(MASK);
const registered = [];
function synthetic(key, effects) {
  const id = `divine:miracle:morr:test-p4b-gear-${key}`;
  const contract = { ...clone(base), id, name: `Essai ${key}`, catalogueName: `Essai ${key}`, canonicalName: `Test p4b gear ${key}`, status: 'assisted',
    params: { range: { kind: 'characteristic', characteristic: 'Soc', unit: 'yards' }, targets: { kind: 'count', value: 2 }, duration: { kind: 'fixed', value: 6, unit: 'rounds' } },
    effects: effects.map(effect => ({ ...effect, duration: { value: 6, unit: 'rounds' } })), targetRules: [],
    clauses: [{ id: 'effect', mode: 'engine', text: 'Effet moteur.', sourceRef: 'test' }], needsInput: [] };
  registry.contracts.push(contract); registered.push(id);
  return id;
}
after(() => { registry.contracts = registry.contracts.filter(row => !registered.includes(row.id)); });
const GROUPS = ['Orques', 'Gobelins', 'Morts-vivants', 'Associés au Chaos'];
const FRENZY = synthetic('frenzy', [{ type: 'grant-talent', talents: [{ id: 'talent-frenzy', name: 'Frénésie', rank: 1 }] }]);
const DRILLED = synthetic('drilled', [{ type: 'grant-talent', talents: [{ id: 'talent-drilled', name: 'Coude-à-coude', rank: 1 }] }]);
const HATRED = synthetic('hatred', [{ type: 'grant-talent', talents: GROUPS.map(specialization => ({ id: 'talent-hatred', name: 'Haine', specialization, rank: 1 })) }]);
const SPEAR = synthetic('spear', [{ type: 'weapon-bonus', magical: true, qualities: ['devastatrice'], designatedWeapon: true, weaponClass: 'lance' }]);
const FEAR = synthetic('fear', [{ type: 'grant-trait', traits: ['Peur (1)'], appliesTo: 'caster' }]);

const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Morr' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Morr' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: ['Vigilant'], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
async function fixture(priest = {}) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [actor('priest', priest), actor('ally', { initiative: 30 })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const expiry = { phase: 'endOfTurn', round: 6, actorId: 'priest' };
const both = (more = {}) => ({ actorId: 'priest', targetIds: ['priest', 'ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, expiry,
  facts: { targets: { priest: { withinRange: true }, ally: { withinRange: true } } }, ...more });
async function cast(store, contractId, more) {
  const preview = store.previewDivineExecution(contractId, both(more));
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}
const toRoundEnd = async store => { for (let i = 0; i < 12; i++) await store.nextTurn(); };
const injected = participant => (participant.talents || []).filter(row => row.divineEffectId);

test('Frénésie et Coude-à-coude : injectés sur chaque cible puis nettoyés à la fin', async () => {
  for (const [id, talent] of [[FRENZY, 'talent-frenzy'], [DRILLED, 'talent-drilled']]) {
    const store = await fixture();
    await cast(store, id);
    for (const who of ['priest', 'ally']) {
      assert.ok(acquiredV5Talents(person(store, who)).some(row => row.talentId === talent && row.rank === 1), `${talent} sur ${who}`);
      assert.equal(injected(person(store, who)).length, 1);
    }
    await toRoundEnd(store);
    for (const who of ['priest', 'ally']) {
      assert.ok(!acquiredV5Talents(person(store, who)).some(row => row.talentId === talent), `${talent} retiré de ${who}`);
      assert.equal(injected(person(store, who)).length, 0);
    }
  }
});

test('Vaincre les impies : une ligne de Haine par groupe, toutes retirées à la fin', async () => {
  const store = await fixture();
  await cast(store, HATRED);
  const rows = injected(person(store, 'ally'));
  assert.deepEqual(rows.map(row => row.specialization).sort(), [...GROUPS].sort());
  assert.ok(rows.every(row => row.id === 'talent-hatred' && row.status === 'resolved' && row.rank === 1 && row.temporary === true));
  await toRoundEnd(store);
  assert.equal(injected(person(store, 'ally')).length, 0);
  assert.equal(person(store, 'ally').talents.some(row => row.id === 'talent-hatred'), false);
});

test('Lance de Myrmidia : Magique et Dévastatrice sur l’arme désignée seulement, retirées à l’expiration', async () => {
  const spear = { id: 'spear-attack', note: 'Lance', type: 'attack', attr: 'CC', base: 40, damage: 4, qualities: [], extensions: { fiche: { equipmentId: 'spear' } } };
  const sword = { id: 'sword-attack', note: 'Épée', type: 'attack', attr: 'CC', base: 40, damage: 4, qualities: [], extensions: { fiche: { equipmentId: 'sword' } } };
  const store = await fixture({ actions: [spear, sword] });
  const missing = store.previewDivineExecution(SPEAR, both());
  assert.equal(missing.ready, false);
  assert.ok(missing.needsInput.some(row => row.field === 'facts.weapon.equipmentId'));
  await cast(store, SPEAR, { targetIds: ['priest'], facts: { weapon: { equipmentId: 'spear', classConfirmed: true }, targets: { priest: { withinRange: true } } } });
  const priest = person(store, 'priest');
  assert.deepEqual(magicWeaponQualities(priest, spear).map(row => row.id), ['devastatrice']);
  assert.deepEqual(magicWeaponQualities(priest, sword), []);
  assert.equal(magicWeaponNature(priest, spear).magical, true);
  assert.equal(magicWeaponNature(priest, sword).magical, undefined);
  await toRoundEnd(store);
  assert.deepEqual(magicWeaponQualities(person(store, 'priest'), spear), []);
  assert.equal(person(store, 'priest').extensions.v5.weaponBonuses, undefined);
});

test('Frisson du givre : Peur (1) sur le prêtre seul, retirée à la fin', async () => {
  const store = await fixture();
  assert.equal(validateEffect({ type: 'grant-trait', traits: ['Peur (1)'], appliesTo: 'caster' }), null);
  await cast(store, FEAR);
  assert.deepEqual(person(store, 'priest').traits, ['Vigilant', 'Peur (1)']);
  assert.deepEqual(person(store, 'ally').traits, ['Vigilant']);
  await toRoundEnd(store);
  assert.deepEqual(person(store, 'priest').traits, ['Vigilant']);
});
