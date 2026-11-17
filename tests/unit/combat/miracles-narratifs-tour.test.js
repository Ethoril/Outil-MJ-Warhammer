// L3 des miracles narratifs : Tests imposés récurrents (Round, Tour, Mouvement) demandés par le Tour V5 (`previewV5Turn`), patches
// appliqués dans le même état (un commit, un ↶). Vent sauvage et Fureur d'Ulric gardent leurs contrats (clauses figées en rappel par
// des tests existants, CA7) : la récurrence est éprouvée avec des couches `imposed-test` posées comme le ferait leur branchement
// (Endurance −1 DR chaque Round, Deft Steps p.88 ; Test de Frénésie gratuit à chaque Tour, LdB V5 p.228 et p.184 ; Athlétisme +2 DR
// pour se déplacer, LdB V5 p.223). Engourdissement (PBtT p.50) est le vrai contrat : marqueur levé à la fin du Tour suivant.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { collectDivineRecurringEffects } from '../../../js/core/v5-divine-recurring.js';
import { effectHandlers } from '../../../js/core/v5-divine-effect-handlers.js';

const clone = value => structuredClone(value);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const contractOf = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === name);
const FROSTBITE = contractOf('Engourdissement').id;

const actor = (id, cult, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });

// Couche posée comme par le moteur (buildLayer du gestionnaire), portée par `targetId`.
function imposedLayer(name, targetId, effect) {
  const contract = contractOf(name), executionId = `exec-${targetId}`;
  return { id: `${executionId}:${targetId}:${contract.id}:imposed-test`, executionId, prayerId: contract.id, casterId: 'priest', targetId,
    source: clone(contract.source), sourceReceipt: clone(contract.sourceReceipt), type: 'imposed-test',
    expiry: { phase: 'endOfRound', round: 6, moment: 'afterEffects' }, ...effectHandlers['imposed-test'].buildLayer({ type: 'imposed-test', ...effect }, { targetId }) };
}
const WIND = { label: 'Vent sauvage', test: { skill: 'resistance', slModifier: -1 }, subjects: 'targets', when: 'round', onFailure: [{ type: 'condition', key: 'Prone', level: 1 }] };
const FURY = { label: 'Fureur d\'Ulric', test: { skill: 'willpower', slModifier: 0 }, subjects: 'targets', when: 'turn', optional: true, onSuccess: [{ type: 'frenzy' }] };
const SEA = { label: 'Mer déchaînée', test: { skill: 'athletics', slModifier: 2 }, subjects: 'targets', when: 'move', onFailure: [{ type: 'condition', key: 'Prone', level: 1 }] };

async function open(cult, layers = {}) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const withLayer = (row, id) => layers[id] ? { ...row, extensions: { v5: { divine: { sin: 0 }, divineEffects: [layers[id]] } } } : row;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
    participants: [actor('priest', cult), withLayer(actor('ally', cult, { initiative: 30 }), 'ally'), withLayer(actor('foe', cult, { initiative: 20, camp: 'ennemi', kind: 'PNJ' }), 'foe')] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return { store, engine: createCombatEngine(store) };
}
const full = store => JSON.parse(store.getFullJSON());
const who = (store, id) => full(store).combat.participants.find(row => row.id === id);
const keys = (store, id) => (who(store, id).states || []).map(row => row.key);
const prone = (store, id) => keys(store, id).some(key => ['a-terre', 'prone'].includes(key));
const input = (more = {}) => ({ actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, ...more });
const fieldOf = layer => `divineImposedTest:${layer.id}`;

describe('Récurrence « round » (Vent sauvage) : Test d’Endurance (−1 DR) à chaque début de Round', () => {
  test('le Round suivant demande le Test au porteur ; échec = À terre ; un seul ↶', async () => {
    const layer = imposedLayer('Vent sauvage', 'foe', WIND);
    const { store, engine } = await open('Taal', { foe: layer });
    assert.ok(who(store, 'foe').extensions.v5.divineEffects.some(row => row.id === layer.id), 'couche conservée au chargement');
    assert.equal((await engine.nextTurn()).status, 'applied');
    assert.equal((await engine.nextTurn()).status, 'applied');
    const pending = await engine.nextTurn();
    assert.equal(pending.status, 'requires-input');
    const request = pending.requests.find(row => row.participantId === 'foe' && row.field === fieldOf(layer));
    assert.ok(request, JSON.stringify(pending.requests));
    assert.equal(request.kind, 'test');
    assert.match(request.label, /Endurance/);
    assert.equal(request.testTarget.score, 30);
    const done = await engine.nextTurn({ inputs: { foe: { [fieldOf(layer)]: { success: false, sl: -1 } } } });
    assert.equal(done.status, 'applied', JSON.stringify(done));
    assert.equal(full(store).combat.round, 2);
    assert.equal(prone(store, 'foe'), true);
    assert.ok(full(store).log.some(row => /Vent sauvage : Test raté/.test(row.text)));
    await store.undo();
    assert.equal(full(store).combat.round, 1);
    assert.equal(prone(store, 'foe'), false);
  });

  test('réussite (d100 saisi) : pas d’À terre', async () => {
    const layer = imposedLayer('Vent sauvage', 'foe', WIND);
    const { store, engine } = await open('Taal', { foe: layer });
    await engine.nextTurn(); await engine.nextTurn();
    assert.equal((await engine.nextTurn({ inputs: { foe: { [fieldOf(layer)]: 5 } } })).status, 'applied');
    assert.equal(prone(store, 'foe'), false);
  });
});

describe('Récurrence « turn » (Fureur d’Ulric) : Test de Frénésie gratuit au Tour du porteur', () => {
  test('au début du Tour de l’allié : choix de tenter, puis Test de Volonté ; réussite = Frénésie ; ↶', async () => {
    const layer = imposedLayer('Fureur d\'Ulric', 'ally', FURY);
    const { store, engine } = await open('Ulric', { ally: layer });
    const field = fieldOf(layer);
    const first = await engine.nextTurn();
    assert.equal(first.status, 'requires-input');
    assert.ok(first.requests.some(row => row.participantId === 'ally' && row.field === `${field}:attempt` && row.kind === 'choice'), JSON.stringify(first.requests));
    const second = await engine.nextTurn({ inputs: { ally: { [`${field}:attempt`]: true } } });
    assert.equal(second.status, 'requires-input');
    assert.match(second.requests.find(row => row.field === field).label, /Volonté/);
    const done = await engine.nextTurn({ inputs: { ally: { [`${field}:attempt`]: true, [field]: { success: true, sl: 2 } } } });
    assert.equal(done.status, 'applied', JSON.stringify(done));
    assert.ok(keys(store, 'ally').includes('frenzy'));
    await store.undo();
    assert.ok(!keys(store, 'ally').includes('frenzy'));
  });

  test('l’allié renonce : aucun Test, aucune Frénésie', async () => {
    const layer = imposedLayer('Fureur d\'Ulric', 'ally', FURY);
    const { store, engine } = await open('Ulric', { ally: layer });
    assert.equal((await engine.nextTurn({ inputs: { ally: { [`${fieldOf(layer)}:attempt`]: false } } })).status, 'applied');
    assert.ok(!keys(store, 'ally').includes('frenzy'));
  });
});

describe('Récurrence « move » (Mer déchaînée) : Test d’Athlétisme (+2 DR) pour utiliser son Mouvement', () => {
  test('se déplace + échec = À terre ; ne se déplace pas = rien', async () => {
    const layer = imposedLayer('Mer déchaînée', 'ally', SEA);
    const { store, engine } = await open('Manann', { ally: layer });
    const field = fieldOf(layer);
    const first = await engine.nextTurn();
    assert.ok(first.requests.some(row => row.field === `${field}:attempt`), JSON.stringify(first.requests));
    assert.equal((await engine.nextTurn({ inputs: { ally: { [`${field}:attempt`]: true, [field]: { success: false, sl: -1 } } } })).status, 'applied');
    assert.equal(prone(store, 'ally'), true);
    await store.undo();
    assert.equal((await engine.nextTurn({ inputs: { ally: { [`${field}:attempt`]: false } } })).status, 'applied');
    assert.equal(prone(store, 'ally'), false);
  });
});

describe('Engourdissement : marqueur posé puis levé à la fin du Tour suivant de la cible', () => {
  test('la cible joue après le prêtre : marqueur levé à la fin de son Tour de ce Round', async () => {
    const { store, engine } = await open('Ulric');
    const preview = store.previewDivineExecution(FROSTBITE, input({ targetIds: ['foe'], facts: { targets: { foe: { withinRange: true } } }, damageRoll: 3, imposedTests: { foe: 95 } }));
    assert.equal(preview.ready, true, JSON.stringify(preview.needsInput));
    assert.equal((await store.applyDivineExecution(FROSTBITE, { preview })).ready, true);
    assert.equal(who(store, 'foe').extensions.v5.lostTurn.cause, 'divine-defensive-only');
    assert.equal((await engine.nextTurn()).status, 'applied');
    assert.equal((await engine.nextTurn()).status, 'applied');
    assert.equal(full(store).combat.currentActorId, 'foe');
    assert.ok(who(store, 'foe').extensions.v5.lostTurn, 'encore actif pendant son Tour');
    await engine.nextTurn();
    assert.equal(who(store, 'foe').extensions.v5.lostTurn, undefined);
  });
});

describe('Collecteur des effets divins récurrents', () => {
  test('participant sans couche : état identique, aucune demande', () => {
    const participants = [actor('a', 'Taal'), actor('b', 'Taal')];
    for (const phase of ['startOfRound', 'startOfTurn', 'endOfTurn']) {
      const out = collectDivineRecurringEffects({ participants, phase, round: 2, turnIndex: 4, actorId: 'a', inputs: {} });
      assert.equal(out.participants, participants);
      assert.deepEqual(out.requests, []);
      assert.deepEqual(out.logs, []);
    }
  });
});
