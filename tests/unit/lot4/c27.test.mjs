// Lot 4 · C27 (G-INI-4, G-DIV-18) : un combattant qui entre pendant un Round doit recevoir son Initiative
// et être inséré à son rang ; un rang déjà dépassé attend le Round suivant.
// Règle : même saisie qu'à l'ouverture (d10 PJ saisi, d10 PNJ tiré), insertion par insertParticipantsByInitiative.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createCombatEngine } from '../../../js/core/combat.js';

const clone = value => structuredClone(value);
function persistence() { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; }
const person = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 40, hp: 10, maxHp: 10,
  caracs: { I: 40, CC: 50, CT: 50 }, skills: [], equipment: [], actions: [], states: [], extensions: { v5: {} }, ...extra });
const base = participants => ({ schemaVersion: 3, reserve: [], log: [], diceLines: [], activeScene: null, encounters: [], suspendedScenes: [], persistentCharacters: [],
  combat: { round: 0, currentActorId: null, order: participants.map(row => row.id), orderMode: 'automatic', participants: clone(participants) }, extensions: { v5: {} } });

// Round 1 en cours, tour de alpha (score 4+6=10), puis beta (3+3=6).
async function round1() {
  const store = createStore({ persistence: persistence(), storage: null });
  await store.ready;
  await store.loadFromJSON(base([
    person('alpha', { kind: 'PJ', camp: 'pj', initiative: 45, caracs: { I: 45, CC: 50, CT: 50 } }),
    person('beta', { initiative: 30, caracs: { I: 30, CC: 50, CT: 50 } }),
    person('rapide', { zone: 'bench', initiative: 60, caracs: { I: 60, CC: 50, CT: 50 } }),
    person('lent', { zone: 'bench', initiative: 20, caracs: { I: 20, CC: 50, CT: 50 } })
  ]));
  const plan = store.previewCombatInitialization({ diceById: { alpha: 6, beta: 3 }, startCombat: true });
  assert.equal(plan.ready, true, JSON.stringify(plan.needsInput));
  assert.equal((await store.applyCombatInitialization(plan)).status, 'applied');
  assert.equal(store.getCombat().round, 1);
  assert.equal(store.getCombat().currentActorId, 'alpha');
  assert.deepEqual(store.getCombat().order.filter(id => ['alpha', 'beta'].includes(id)), ['alpha', 'beta']);
  return store;
}
const activeOrder = store => store.getCombat().order.filter(id => store.listParticipants().find(row => row.id === id)?.zone === 'active');

describe('C27 renfort en cours de Round', () => {
  test('ajout direct actif au Round 1 : refusé sans jet d’Initiative (COMBAT_INIT_REQUIRED), pas placé en fin de piste', async () => {
    const store = await round1();
    assert.throws(() => store.addParticipant(person('direct', { initiative: 60, caracs: { I: 60 } })), error => error.code === 'COMBAT_INIT_REQUIRED');
    assert.equal(store.listParticipants().some(row => row.id === 'direct'), false);
  });

  test('banc puis « Faire entrer » au Round 1 : une saisie d’Initiative est ouverte (comme avant le Round 1)', async () => {
    const store = await round1();
    const staging = store.previewCombatParticipantActivation('rapide');
    assert.ok(staging, 'previewCombatParticipantActivation renvoie null dès que Round ≠ 0 : aucun jet demandé');
  });

  test('entrée par moveParticipant sans jet au Round 1 : refusée, le combattant ne rejoint pas la piste juste après le courant', async () => {
    const store = await round1();
    let error = null;
    try { await store.moveParticipant('rapide', 'active'); } catch (e) { error = e; }
    assert.equal(error?.code, 'COMBAT_INIT_REQUIRED', `l’entrée sans Initiative devrait être refusée ; piste actuelle : ${JSON.stringify(activeOrder(store))}`);
    assert.equal(store.listParticipants().find(row => row.id === 'rapide').zone, 'bench');
  });

  test('renfort plus rapide que le personnage courant (score 15 > 10) : attend le Round suivant, ne joue pas dans ce Round', async () => {
    const store = await round1();
    const staging = store.previewCombatParticipantActivation('rapide');
    assert.ok(staging, 'saisie d’Initiative requise');
    const plan = store.previewCombatInitialization({ staging, diceById: { alpha: 6, beta: 3, rapide: 9 } });
    assert.equal(plan.ready, true, JSON.stringify(plan.needsInput));
    assert.equal((await store.applyCombatInitialization(plan)).status, 'applied');
    assert.deepEqual(activeOrder(store), ['rapide', 'alpha', 'beta'], 'classé avant le courant : placé avant lui (Round suivant)');
    assert.equal(store.getCombat().currentActorId, 'alpha');
    const engine = createCombatEngine(store);
    await engine.nextTurn();
    assert.equal(store.getCombat().currentActorId, 'beta');
    assert.equal(store.getCombat().round, 1);
    await engine.nextTurn();
    assert.equal(store.getCombat().round, 2);
    assert.equal(store.getCombat().currentActorId, 'rapide', 'il ouvre le Round 2');
  });

  test('renfort le plus lent (score 4) : inséré à son rang après beta, et non juste après le personnage courant', async () => {
    const store = await round1();
    const staging = store.previewCombatParticipantActivation('lent');
    assert.ok(staging, 'saisie d’Initiative requise');
    const plan = store.previewCombatInitialization({ staging, diceById: { alpha: 6, beta: 3, lent: 2 } });
    assert.equal(plan.ready, true, JSON.stringify(plan.needsInput));
    assert.equal((await store.applyCombatInitialization(plan)).status, 'applied');
    assert.deepEqual(activeOrder(store), ['alpha', 'beta', 'lent']);
    const lent = store.listParticipants().find(row => row.id === 'lent');
    assert.equal(lent.extensions.v5.combatInitiative.die, 2);
  });

  test('ajout direct actif avec jet fourni au Round 1 : une saisie existe aussi (previewCombatParticipantAddition)', async () => {
    const store = await round1();
    const staging = store.previewCombatParticipantAddition(person('direct', { initiative: 60, caracs: { I: 60 } }));
    assert.ok(staging, 'previewCombatParticipantAddition renvoie null dès que Round ≠ 0');
  });

  test('ajout direct actif avec jet au Round 1 : appliqué, inséré à son rang (entre alpha et beta pour un score 8), le courant ne change pas', async () => {
    const store = await round1();
    const staging = store.previewCombatParticipantAddition(person('direct', { initiative: 50, caracs: { I: 50 } }));
    const plan = store.previewCombatInitialization({ staging, diceById: { alpha: 6, beta: 3, direct: 3 } });
    assert.equal(plan.ready, true, JSON.stringify(plan.needsInput));
    assert.equal((await store.applyCombatInitialization(plan)).status, 'applied');
    assert.deepEqual(activeOrder(store), ['alpha', 'direct', 'beta']);
    assert.equal(store.getCombat().currentActorId, 'alpha');
    assert.equal(store.getCombat().round, 1);
  });

  test('sans le d10 du renfort, la saisie reste incomplète (rien n’est appliqué)', async () => {
    const store = await round1();
    const staging = store.previewCombatParticipantActivation('rapide');
    const plan = store.previewCombatInitialization({ staging, diceById: { alpha: 6, beta: 3 } });
    assert.equal(plan.ready, false);
    assert.ok(plan.needsInput.some(row => row.participantId === 'rapide' && row.field === 'die'));
  });

  test('un combattant déjà doté d’une Initiative (retour du banc) revient sans nouveau jet', async () => {
    const store = await round1();
    assert.equal(store.previewCombatParticipantActivation('beta'), null);
    await store.moveParticipant('beta', 'bench');
    assert.equal(store.previewCombatParticipantActivation('beta'), null);
    await store.moveParticipant('beta', 'active');
    assert.equal(store.listParticipants().find(row => row.id === 'beta').zone, 'active');
  });

  test('avant le Round 1 (Round 0), l’ajout direct actif est toujours soumis au jet de préparation', async () => {
    const store = createStore({ persistence: persistence(), storage: null });
    await store.ready;
    await store.loadFromJSON(base([person('alpha', { kind: 'PJ', camp: 'pj' }), person('banc', { zone: 'bench' })]));
    const plan = store.previewCombatInitialization({ diceById: { alpha: 6 } });
    assert.equal((await store.applyCombatInitialization(plan)).status, 'applied');
    assert.equal(store.getCombat().round, 0);
    assert.throws(() => store.addParticipant(person('direct')), error => error.code === 'COMBAT_INIT_REQUIRED');
    assert.ok(store.previewCombatParticipantActivation('banc'));
    assert.ok(store.previewCombatParticipantAddition(person('direct2')));
  });
});
