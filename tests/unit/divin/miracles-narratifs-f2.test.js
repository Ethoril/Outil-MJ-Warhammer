import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { validateEffect } from '../../../js/core/v5-divine-effect-handlers.js';
import { effectTypes } from '../../../js/core/v5-divine-grammar.js';
import { createDivineApi } from '../../../js/core/store/api-divine.js';

// L3 (brique F2 « Test imposé à la cible ») : Embobiner (Bamboozle, Deft Steps p.24, Calme −2 DR), Baume pour un esprit blessé
// (LdB V5 p.226, Calme +0 contre le sommeil), Engourdissement (Frostbite, PBtT p.50, Endurance +0), Effrayer l'Ennemi (Dismay Foe,
// Up in Arms p.79, Terreur 1). Le MJ saisit le jet de la cible (Q4) : le moteur ne tire aucun dé.
const clone = value => structuredClone(value);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const idOf = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === name).id;
const BAMBOOZLE = idOf('Embobiner'), BALM = idOf('Baume pour un esprit blessé'), FROSTBITE = idOf('Engourdissement'), DISMAY = idOf('Effrayer l\'Ennemi');
const SEA_LEGS = idOf('Mer déchaînée'), WILD_WIND = idOf('Vent sauvage'), FURY = idOf('Fureur d\'Ulric');

const actor = (id, cult, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
async function fixture(cult) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
    participants: [actor('priest', cult), actor('ally', cult, { initiative: 30 }), actor('foe', cult, { initiative: 20, camp: 'ennemi', kind: 'PNJ' })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const input = (more = {}) => ({ actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  expiry: { phase: 'endOfTurn', round: 1, actorId: 'priest' }, ...more });
async function cast(store, contractId, more) {
  const preview = store.previewDivineExecution(contractId, input(more));
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput) + preview.error);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return { preview, result };
}
const layers = (store, id) => person(store, id).extensions?.v5?.divineEffects || [];
const imposedLayer = (store, id) => layers(store, id).find(row => row.type === 'imposed-test');
const modeOf = (id, clauseId) => getDivineContract(id).clauses.find(clause => clause.id === clauseId)?.mode;
const stateKeys = (store, id) => (person(store, id).states || []).map(row => row.key);
// Commande du Test imposé manuel (api-divine.js), branchée sur le vrai Store (executeCommand, donc vrai ↶). Le Store ne l'expose pas
// encore lui-même : la ligne d'exposition est dans store.js, hors des fichiers du lot L3.
const imposed = store => createDivineApi({ api: store, currentEnvelope: () => JSON.parse(store.getFullJSON()), divineAuthority: 'MJ' });
// Aucun dé tiré par le moteur : le même travail sous deux hasards différents donne le même état.
async function withoutDice(work) {
  const random = Math.random;
  try {
    Math.random = () => 0.01; const low = await work();
    Math.random = () => 0.99; const high = await work();
    return [low, high];
  } finally { Math.random = random; }
}
const facing = { targetIds: ['foe'], facts: { targets: { foe: { withinRange: true, seesPriest: true, withinTouch: true } } } };

describe('L3 — statuts, clauses et grammaire', () => {
  test('Embobiner et Baume deviennent assistées par un Test imposé ; les quatre prières hors combat restent des rappels', () => {
    for (const id of [BAMBOOZLE, BALM]) {
      const contract = getDivineContract(id);
      assert.equal(contract.status, 'assisted', id);
      assert.ok(contract.effects.some(effect => effect.type === 'imposed-test'), id);
    }
    for (const name of ['Shake On It', 'Under My Protection', 'Unremembered Face', 'Truth Will Out']) {
      const contract = getAllDivineContracts().find(row => row.canonicalName === name);
      assert.equal(contract.status, 'manual', name);
    }
  });

  test('terror-test et endurance-test requalifiées ; athletics, prone-each-round, free-frenzy restent en rappel (figées par des tests existants, CA7)', () => {
    assert.equal(modeOf(DISMAY, 'terror-test'), 'engine');
    assert.equal(modeOf(SEA_LEGS, 'athletics'), 'manual');
    assert.ok(!getDivineContract(SEA_LEGS).effects.some(effect => effect.type === 'imposed-test'));
    assert.equal(modeOf(WILD_WIND, 'prone-each-round'), 'manual');
    assert.equal(modeOf(FROSTBITE, 'endurance-test'), 'engine');
    assert.equal(modeOf(FURY, 'free-frenzy'), 'manual');
    for (const id of [WILD_WIND, FURY]) assert.ok(!getDivineContract(id).effects.some(effect => effect.type === 'imposed-test'), id);
    assert.equal(modeOf(BAMBOOZLE, 'cool-resist'), 'engine');
    assert.equal(modeOf(BALM, 'resist'), 'engine');
  });

  test('valeurs relues : Calme −2 DR (Embobiner), Calme +0 (Baume), Endurance +0 (Engourdissement), Terreur 1 (Effrayer l’Ennemi)', () => {
    const imposed = id => getDivineContract(id).effects.find(effect => effect.type === 'imposed-test');
    assert.deepEqual(imposed(BAMBOOZLE).test, { skill: 'calm', slModifier: -2 });
    assert.deepEqual(imposed(BALM).test, { skill: 'calm', slModifier: 0 });
    assert.deepEqual(imposed(FROSTBITE).test, { skill: 'resistance', slModifier: 0 });
    assert.equal(imposed(DISMAY).when, 'manual');
    assert.deepEqual(imposed(DISMAY).onFailure, [{ type: 'terror', rating: 1 }]);
  });

  test('le générateur refuse un type inconnu, une issue inconnue, une récurrence inconnue', () => {
    assert.ok(effectTypes.has('imposed-test'));
    const valid = { type: 'imposed-test', test: { skill: 'calm', slModifier: 0 }, subjects: 'targets', when: 'cast', onFailure: [{ type: 'condition', key: 'Prone', level: 1 }] };
    assert.equal(validateEffect(valid), null);
    assert.match(validateEffect({ ...valid, type: 'imposed-test-inconnu' }), /non pris en charge/);
    assert.match(validateEffect({ ...valid, onFailure: [{ type: 'teleport' }] }), /issue/);
    assert.match(validateEffect({ ...valid, when: 'morning' }), /when/);
    assert.match(validateEffect({ ...valid, test: { skill: 'calm', slModifier: 0.5 } }), /slModifier/);
    assert.match(validateEffect({ ...valid, onFailure: [], onSuccess: [] }), /issue/);
  });
});

describe('L3 — Embobiner : Test de Calme (−2 DR) de la cible au lancement', () => {
  test('Test non saisi : aperçu needs-input nommant la cible', async () => {
    const store = await fixture('Ranald');
    const preview = store.previewDivineExecution(BAMBOOZLE, input(facing));
    assert.equal(preview.ready, false);
    const need = preview.needsInput.find(row => row.field === 'imposedTests.foe');
    assert.ok(need, JSON.stringify(preview.needsInput));
    assert.match(need.label, /foe/);
    assert.match(need.label, /Calme/);
  });

  test('échec de la cible (d100 saisi) : la couche porte l’issue « obéit au prêtre » ; aucun dé tiré', async () => {
    const [store, other] = await withoutDice(async () => { const one = await fixture('Ranald'); await cast(one, BAMBOOZLE, { ...facing, imposedTests: { foe: 95 } }); return one; });
    assert.deepEqual(imposedLayer(store, 'foe').imposedTest, imposedLayer(other, 'foe').imposedTest);
    const layer = imposedLayer(store, 'foe');
    assert.equal(layer.imposedTest.result.success, false);
    assert.match(layer.imposedTest.outcome.join(' '), /obéit au prêtre/);
  });

  test('réussite de la cible : aucune issue appliquée', async () => {
    const store = await fixture('Ranald');
    await cast(store, BAMBOOZLE, { ...facing, imposedTests: { foe: 5 } });
    const layer = imposedLayer(store, 'foe');
    assert.equal(layer.imposedTest.result.success, true);
    assert.deepEqual(layer.imposedTest.outcome, []);
  });

  test('réussite et DR saisis au lieu du d100', async () => {
    const store = await fixture('Ranald');
    await cast(store, BAMBOOZLE, { ...facing, imposedTestResult: { foe: 'failure' }, imposedTestSl: { foe: -3 } });
    assert.deepEqual(imposedLayer(store, 'foe').imposedTest.result, { success: false, sl: -3 });
  });
});

describe('L3 — Baume pour un esprit blessé : Calme +0 contre le sommeil', () => {
  test('cible consentante : pas de Test, elle s’endormira à la fin de l’effet', async () => {
    const store = await fixture('Shallya');
    await cast(store, BALM, { targetIds: ['ally'], facts: { targets: { ally: { withinTouch: true, consenting: true } } } });
    const layer = imposedLayer(store, 'ally');
    assert.equal(layer.imposedTest.result.waived, true);
    assert.match(layer.imposedTest.outcome.join(' '), /endort/);
  });

  test('cible non consentante : réussite = résiste au sommeil ; échec = s’endort', async () => {
    const store = await fixture('Shallya');
    await cast(store, BALM, { ...facing, facts: { targets: { foe: { withinTouch: true, consenting: false } } }, imposedTests: { foe: 5 } });
    assert.match(imposedLayer(store, 'foe').imposedTest.outcome.join(' '), /résiste/);
    const other = await fixture('Shallya');
    await cast(other, BALM, { ...facing, facts: { targets: { foe: { withinTouch: true, consenting: false } } }, imposedTests: { foe: 95 } });
    assert.match(imposedLayer(other, 'foe').imposedTest.outcome.join(' '), /endort/);
  });

  test('non consentante sans Test saisi : needs-input', async () => {
    const store = await fixture('Shallya');
    const preview = store.previewDivineExecution(BALM, input({ ...facing, facts: { targets: { foe: { withinTouch: true, consenting: false } } } }));
    assert.equal(preview.ready, false);
    assert.ok(preview.needsInput.some(row => row.field === 'imposedTests.foe'));
  });
});

describe('L3 — Engourdissement : Endurance +0, échec = hors actions défensives au prochain Tour', () => {
  test('échec : marqueur « tour perdu » de cause divine-defensive-only ; ↶ l’efface', async () => {
    const [store, other] = await withoutDice(async () => { const one = await fixture('Ulric'); await cast(one, FROSTBITE, { ...facing, damageRoll: 4, imposedTests: { foe: 95 } }); return one; });
    const withoutId = marker => ({ ...marker, sourceId: undefined });
    assert.deepEqual(withoutId(person(store, 'foe').extensions.v5.lostTurn), withoutId(person(other, 'foe').extensions.v5.lostTurn));
    const marker = person(store, 'foe').extensions.v5.lostTurn;
    assert.equal(marker.cause, 'divine-defensive-only');
    assert.equal(marker.label, 'hors actions défensives');
    await store.undo();
    assert.equal(person(store, 'foe').extensions?.v5?.lostTurn, undefined);
  });

  test('réussite : aucun marqueur', async () => {
    const store = await fixture('Ulric');
    await cast(store, FROSTBITE, { ...facing, damageRoll: 4, imposedTests: { foe: 5 } });
    assert.equal(person(store, 'foe').extensions?.v5?.lostTurn, undefined);
  });
});

describe('L3 — Effrayer l’Ennemi : Test de Terreur d’un ennemi (commande manuelle, une fois)', () => {
  test('échec : Brisé (indice et DR négatifs) puis Peur ; un seul ↶', async () => {
    const store = await fixture('Myrmidia');
    await cast(store, DISMAY, { expiry: { phase: 'endOfTurn', round: 1, actorId: 'priest' } });
    const layer = imposedLayer(store, 'priest');
    assert.equal(layer.imposedTest.when, 'manual');
    const result = await imposed(store).resolveDivineImposedTest('foe', layer.id, { success: false, sl: -3 });
    assert.equal(result.ok, true, result.error);
    const foe = person(store, 'foe');
    const broken = foe.states.filter(row => row.key === 'brise').reduce((sum, row) => sum + (row.level || 1), 0);
    assert.equal(broken, 3, 'Terreur 1 + 2 DR négatifs au-delà du premier');
    assert.ok(stateKeys(store, 'foe').includes('fear-of-talent'));
    await store.undo();
    assert.ok(!stateKeys(store, 'foe').includes('fear-of-talent'));
    assert.ok(!stateKeys(store, 'foe').includes('brise'));
  });

  test('réussite : Peur sans Brisé ; le même ennemi ne teste qu’une fois ; un allié est refusé', async () => {
    const store = await fixture('Myrmidia');
    await cast(store, DISMAY);
    const layer = imposedLayer(store, 'priest');
    assert.equal((await imposed(store).resolveDivineImposedTest('foe', layer.id, { success: true, sl: 1 })).ok, true);
    assert.ok(!stateKeys(store, 'foe').includes('brise'));
    assert.ok(stateKeys(store, 'foe').includes('fear-of-talent'));
    const again = await imposed(store).resolveDivineImposedTest('foe', layer.id, { success: false, sl: -2 });
    assert.equal(again.ok, false);
    assert.match(again.error, /déjà/);
    const ally = await imposed(store).resolveDivineImposedTest('ally', layer.id, { success: false, sl: -2 });
    assert.equal(ally.ok, false);
    assert.match(ally.error, /ennemi/);
  });

  test('jet manquant : demande nommant l’ennemi, sans rien écrire', async () => {
    const store = await fixture('Myrmidia');
    await cast(store, DISMAY);
    const snapshot = () => { const { combat, log } = JSON.parse(store.getFullJSON()); return { combat, log }; };
    const before = snapshot();
    const result = await imposed(store).resolveDivineImposedTest('foe', imposedLayer(store, 'priest').id, {});
    assert.equal(result.ok, false);
    assert.match(result.needsInput[0].label, /foe/);
    assert.deepEqual(snapshot(), before);
  });
});
