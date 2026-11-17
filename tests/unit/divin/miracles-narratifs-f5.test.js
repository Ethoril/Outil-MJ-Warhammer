import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { validateEffect } from '../../../js/core/v5-divine-effect-handlers.js';
import { effectTypes } from '../../../js/core/v5-divine-grammar.js';
import { createDivineApi } from '../../../js/core/store/api-divine.js';
import { divineZoneOf, divineZoneAttackWarnings, setDivineZoneMembersOnState } from '../../../js/core/v5-divine-effects-zones.js';

// L4 (F5, zones) : Paix de Taal (Deft Steps p.88), Vent sauvage `no-ranged` (Deft Steps p.88), Seuil du Portail (LdB V5 p.223, Test de
// franchissement = Test imposé manuel). La présence dans la zone est désignée par le MJ ; un avertissement, jamais un refus.
const clone = value => structuredClone(value);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const idOf = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === name).id;
const PAX = idOf('Paix de Taal'), WILD_WIND = idOf('Vent sauvage'), PORTAL = idOf('Seuil du Portail');
const EXPIRY = { [PAX]: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, [WILD_WIND]: { phase: 'endOfTurn', round: 6, actorId: 'priest' } };
const actor = (id, cult, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
async function fixture(cult) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'beast', 'foe'],
    participants: [actor('priest', cult), actor('ally', cult, { initiative: 30 }),
      actor('beast', cult, { initiative: 25, camp: 'ennemi', kind: 'PNJ', traits: ['Bestial'] }),
      actor('foe', cult, { initiative: 20, camp: 'ennemi', kind: 'PNJ' })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const input = (more = {}) => ({ actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  expiry: { phase: 'endOfTurn', round: 1, actorId: 'priest' }, ...more });
async function cast(store, contractId, more) {
  more = { expiry: EXPIRY[contractId] || undefined, ...more };
  if (!more.expiry) delete more.expiry;
  const preview = store.previewDivineExecution(contractId, input(more));
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput) + preview.error);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return { preview, result };
}
const layers = (store, id) => person(store, id).extensions?.v5?.divineEffects || [];
const zoneLayer = (store, id = 'priest') => layers(store, id).find(row => row.type === 'divine-zone');
const modeOf = (id, clauseId) => getDivineContract(id).clauses.find(clause => clause.id === clauseId)?.mode;
const api = store => createDivineApi({ api: store, currentEnvelope: () => JSON.parse(store.getFullJSON()), divineAuthority: 'MJ' });
const members = (store, ids) => store.executeCommand('v5-divine-zone-members', draft => setDivineZoneMembersOnState(draft, 'priest', zoneLayer(store).id, ids).state);
const bow = { type: 'attack', attr: 'CT', name: 'Arc court', ranged: true };
const pistol = { type: 'attack', attr: 'CT', name: 'Pistolet', ranged: true, extensions: { equipment: { category: 'Poudre noire', keywords: ['a-poudre-noire'] } } };
const sword = { type: 'attack', attr: 'CC', name: 'Épée' };

describe('L4 — statuts, clauses et grammaire', () => {
  test('Paix de Taal et Seuil du Portail assistées ; Becalm et Silence Reigns restent des rappels', () => {
    assert.equal(getDivineContract(PAX).status, 'assisted');
    assert.ok(getDivineContract(PAX).effects.some(effect => effect.type === 'divine-zone'));
    assert.equal(modeOf(PAX, 'calm'), 'engine');
    assert.equal(getDivineContract(PORTAL).status, 'assisted');
    assert.equal(modeOf(PORTAL, 'undead-cool'), 'engine');
    assert.equal(modeOf(WILD_WIND, 'no-ranged'), 'engine');
    for (const name of ['Becalm', 'Silence Reigns']) assert.equal(getAllDivineContracts().find(row => row.canonicalName === name).status, 'manual', name);
  });
  test('le générateur refuse un type de zone inconnu, une exclusion ou une exception inconnue', () => {
    assert.ok(effectTypes.has('divine-zone'));
    const valid = { type: 'divine-zone', appliesTo: 'caster', label: 'Zone', excludes: ['attack'] };
    assert.equal(validateEffect(valid), null);
    assert.match(validateEffect({ ...valid, type: 'divine-zone-inconnue' }), /non pris en charge/);
    assert.match(validateEffect({ ...valid, excludes: ['teleport'] }), /excludes/);
    assert.match(validateEffect({ ...valid, excludes: [] }), /excludes/);
    assert.match(validateEffect({ ...valid, exceptions: ['magic'] }), /exceptions/);
    assert.match(validateEffect({ ...valid, appliesTo: 'targets' }), /caster/);
  });
});

describe('L4 — Paix de Taal : zone, membres, avertissement', () => {
  test('application : couche sur le prêtre, rayon = Sociabilité, aucun membre ; aucun dé tiré', async () => {
    const store = await fixture('Taal');
    await cast(store, PAX);
    const zone = zoneLayer(store).zone;
    assert.deepEqual([zone.radius, zone.members, zone.excludes, zone.affects], [60, [], ['attack'], { trait: 'Bestial' }]);
    assert.equal(layers(store, 'beast').length, 0);
  });
  test('un porteur de Bestial membre est averti, un autre non ; sans membre, aucun avertissement', async () => {
    const store = await fixture('Taal');
    await cast(store, PAX);
    const all = () => store.listParticipants();
    assert.deepEqual(divineZoneAttackWarnings({ attacker: person(store, 'beast'), target: person(store, 'ally'), action: sword, participants: all() }), []);
    await members(store, ['beast', 'foe']);
    const warned = divineZoneAttackWarnings({ attacker: person(store, 'beast'), target: person(store, 'ally'), action: sword, participants: all() });
    assert.equal(warned.length, 1);
    assert.match(warned[0], /beast/);
    assert.match(warned[0], /Paix de Taal/);
    assert.deepEqual(divineZoneAttackWarnings({ attacker: person(store, 'foe'), target: person(store, 'ally'), action: sword, participants: all() }), []);
    assert.deepEqual(divineZoneOf(person(store, 'beast'), all()).map(row => row.casterId), ['priest']);
    assert.deepEqual(divineZoneOf(person(store, 'ally'), all()), []);
  });
  test('membres modifiés en un seul ↶ ; refus d’un identifiant inconnu, aucune écriture', async () => {
    const store = await fixture('Taal');
    await cast(store, PAX);
    await members(store, ['beast']);
    assert.deepEqual(zoneLayer(store).zone.members, ['beast']);
    await members(store, ['beast', 'foe']);
    assert.deepEqual(zoneLayer(store).zone.members, ['beast', 'foe']);
    await store.undo();
    assert.deepEqual(zoneLayer(store).zone.members, ['beast']);
    const bad = setDivineZoneMembersOnState(JSON.parse(store.getFullJSON()), 'priest', zoneLayer(store).id, ['fantome']);
    assert.equal(bad.ok, false);
    assert.match(bad.error, /fantome/);
  });
  test('↶ de la prière : la couche disparaît ; expiration : la zone s’éteint avec la prière', async () => {
    const store = await fixture('Taal');
    await cast(store, PAX);
    assert.ok(zoneLayer(store));
    await store.undo();
    assert.equal(zoneLayer(store), undefined);
    await cast(store, PAX);
    const id = zoneLayer(store).executionId;
    const ended = await store.endDivinePrayer(id, { reason: 'fin', baseRevision: store.getLocalRevision() });
    assert.notEqual(ended?.ok, false, ended?.error);
    assert.equal(zoneLayer(store), undefined);
  });
  test('affichage sur le participant : un rappel nomme la zone du prêtre', async () => {
    const { deriveReminders } = await import('../../../js/core/reminders.js');
    const store = await fixture('Taal');
    await cast(store, PAX);
    await members(store, ['beast']);
    const all = store.listParticipants();
    const snapshot = { participants: all, allParticipants: all, sceneId: 's' };
    const out = deriveReminders(snapshot, { id: 't', type: 'participant' });
    assert.ok(JSON.stringify(out).includes('Paix de Taal'), JSON.stringify(out));
  });
});

describe('L4 — Vent sauvage : no-ranged', () => {
  test('la zone exclut les attaques à distance, sauf armes à poudre et d’artillerie', () => {
    const effect = getDivineContract(WILD_WIND).effects.find(row => row.type === 'divine-zone');
    assert.deepEqual([effect.excludes, effect.exceptions], [['ranged-attack'], ['gunpowder', 'artillery']]);
  });
  test('tir dans la zone averti, arme à poudre non, mêlée non', async () => {
    const store = await fixture('Taal');
    await cast(store, WILD_WIND, { targetIds: ['foe'], facts: { targets: { foe: { withinRange: true, seesPriest: true, withinTouch: true, toughnessFailed: false } } } });
    await members(store, ['foe']);
    const all = store.listParticipants();
    const w = action => divineZoneAttackWarnings({ attacker: person(store, 'ally'), target: person(store, 'foe'), action, participants: all });
    assert.equal(w(bow).length, 1);
    assert.match(w(bow)[0], /Vent sauvage/);
    assert.deepEqual(w(pistol), []);
    assert.deepEqual(w(sword), []);
    // tireur dans la zone, cible hors zone : averti aussi
    assert.equal(divineZoneAttackWarnings({ attacker: person(store, 'foe'), target: person(store, 'ally'), action: bow, participants: all }).length, 1);
    assert.deepEqual(divineZoneAttackWarnings({ attacker: person(store, 'ally'), target: person(store, 'priest'), action: bow, participants: all }), []);
  });
});

describe('L4 — Seuil du Portail : Test de franchissement (Test imposé manuel)', () => {
  test('Calme Intermédiaire (+0 DR), sujets ennemis du prêtre, bouton manuel', () => {
    const imposed = getDivineContract(PORTAL).effects.find(effect => effect.type === 'imposed-test');
    assert.deepEqual([imposed.when, imposed.subjects, imposed.test, imposed.appliesTo], ['manual', 'enemies', { skill: 'calm', slModifier: 0 }, 'caster']);
  });
  test('réussite et échec du franchissement : issue libellée, un seul ↶ ; aucun dé tiré', async () => {
    const store = await fixture('Morr');
    await cast(store, PORTAL);
    const layer = layers(store, 'priest').find(row => row.type === 'imposed-test');
    assert.ok(layer);
    const failed = await api(store).resolveDivineImposedTest('foe', layer.id, { roll: 90 });
    assert.equal(failed.ok, true, failed.error);
    assert.equal(failed.result.success, false);
    assert.match(failed.applied.join(' '), /franchi|ligne/i);
    const passed = await api(store).resolveDivineImposedTest('beast', layer.id, { roll: 10 });
    assert.equal(passed.result.success, true);
    assert.notDeepEqual(failed.applied, passed.applied);
    await store.undo();
    assert.equal(Object.keys(layers(store, 'priest').find(row => row.type === 'imposed-test').imposedTest.resolved || {}).length, 1);
  });
});
