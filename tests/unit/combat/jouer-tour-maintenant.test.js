// Refonte de l'interface, lot E4c (spec S2 bis, CA24-CA25) : « Jouer son tour maintenant ».
// Le MJ donne le tour à un combattant qui n'a pas encore joué ce round ; « Tour suivant » rend ensuite la main à celui qui
// devait jouer ; le combattant avancé est sauté à sa place normale ; au round suivant, l'ordre d'initiative reprend tel quel.
// Champ facultatif `extensions.v5.advancedTurn` : absent = rien d'avancé, lu comme vide sans réécrire les données.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { nextTurn, playTurnNow, playTurnNowCheck } from '../../../js/core/turn-order.js';
import { getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { effectHandlers } from '../../../js/core/v5-divine-effect-handlers.js';

const clone = value => structuredClone(value);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const fighter = (id, initiative, extra = {}) => ({ id, name: id.toUpperCase(), kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative, hp: 10, maxHp: 10,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: initiative, Ag: 40, Dex: 40, Int: 30, FM: 30, Soc: 30, M: 4 },
  skills: [], talents: [], equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });

async function open({ current = 'a', round = 1, v5 = {} } = {}) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round, currentActorId: current, order: ['a', 'b', 'c', 'd'],
    participants: [fighter('a', 50), fighter('b', 40), fighter('c', 30), fighter('d', 20)] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, ...v5 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return { store, engine: createCombatEngine(store) };
}
const full = store => JSON.parse(store.getFullJSON());
const where = store => { const state = full(store); return `${state.combat.round}:${state.combat.currentActorId}`; };
const advanced = store => full(store).extensions?.v5?.advancedTurn;
async function next(engine) {
  const result = await engine.nextTurn();
  assert.equal(result.status, 'applied', JSON.stringify(result));
}

describe('modèle pur (turn-order.js)', () => {
  const people = ['a', 'b', 'c', 'd'].map((id, index) => ({ id, zone: 'active', initiative: 50 - index * 10 }));
  const order = ['a', 'b', 'c', 'd'];

  test('donne le tour tout de suite et retient qui reprend', () => {
    const result = playTurnNow({ participants: people, order, currentActorId: 'b', round: 2, participantId: 'd' });
    assert.equal(result.ok, true);
    assert.equal(result.currentActorId, 'd');
    assert.deepEqual(result.advancedTurn, { round: 2, playedIds: ['d'], resumeActorId: 'b', resumeIndex: 1 });
  });

  test('Tour suivant après le tour avancé revient à celui qui devait jouer, puis saute l’avancé', () => {
    const advancedTurn = { round: 2, playedIds: ['d'], resumeActorId: 'b', resumeIndex: 1 };
    const back = nextTurn({ participants: people, order, currentActorId: 'd', round: 2, advanced: advancedTurn });
    assert.equal(back.currentActorId, 'b');
    assert.equal(back.round, 2);
    assert.deepEqual(back.advancedTurn, { round: 2, playedIds: ['d'], resumeActorId: null, resumeIndex: null });
    const then = nextTurn({ participants: people, order, currentActorId: 'b', round: 2, advanced: back.advancedTurn });
    assert.equal(then.currentActorId, 'c');
    const wrap = nextTurn({ participants: people, order, currentActorId: 'c', round: 2, advanced: then.advancedTurn });
    assert.equal(wrap.currentActorId, 'a', 'd a déjà joué : le round suivant commence');
    assert.equal(wrap.round, 3);
    assert.equal(wrap.advancedTurn, null, 'remis à zéro au round suivant');
  });

  test('champ absent ou d’un autre round : rien d’avancé, ordre normal', () => {
    assert.deepEqual(nextTurn({ participants: people, order, currentActorId: 'c', round: 2 }), { order, currentActorId: 'd', round: 2 });
    const stale = nextTurn({ participants: people, order, currentActorId: 'c', round: 2, advanced: { round: 1, playedIds: ['d'], resumeActorId: null } });
    assert.equal(stale.currentActorId, 'd');
    assert.equal(stale.round, 2);
  });

  test('celui qui reprend a été retiré : le tour passe au suivant qui n’a pas joué', () => {
    const without = people.filter(row => row.id !== 'b');
    const result = nextTurn({ participants: without, order: ['a', 'c', 'd'], currentActorId: 'd', round: 2, advanced: { round: 2, playedIds: ['d'], resumeActorId: 'b', resumeIndex: 1 } });
    assert.equal(result.currentActorId, 'c');
    assert.equal(result.round, 2);
  });

  test('refus : déjà joué ce round, son tour en cours, combat non commencé — avec la raison', () => {
    const check = id => playTurnNowCheck({ participants: people, order, currentActorId: 'c', round: 2, participantId: id });
    assert.equal(check('d').ok, true);
    assert.equal(check('a').ok, false);
    assert.match(check('a').reason, /déjà joué/);
    assert.match(check('c').reason, /déjà son tour/);
    assert.match(playTurnNowCheck({ participants: people, order, currentActorId: null, round: 0, participantId: 'd' }).reason, /pas commencé/);
    const chained = { round: 2, playedIds: ['d'], resumeActorId: 'b', resumeIndex: 1 };
    const during = id => playTurnNowCheck({ participants: people, order, currentActorId: 'd', round: 2, advanced: chained, participantId: id });
    assert.equal(during('c').ok, true, 'c n’a pas joué : il peut passer avant b aussi');
    assert.match(during('b').reason, /reprend/);
    assert.match(during('a').reason, /déjà joué/);
  });
});

describe('commande du store et Tour suivant (moteur V5)', () => {
  test('CA24 : jouer maintenant, puis Tour suivant revient à celui qui devait jouer', async () => {
    const { store, engine } = await open();
    await next(engine);
    assert.equal(where(store), '1:b');
    const result = await store.playTurnNow('d');
    assert.notEqual(result?.ok, false, JSON.stringify(result));
    assert.equal(where(store), '1:d');
    assert.deepEqual(full(store).combat.order, ['a', 'b', 'c', 'd'], 'l’ordre d’initiative ne change pas');
    assert.equal(advanced(store).resumeActorId, 'b');
    await next(engine);
    assert.equal(where(store), '1:b', 'on reprend où on en était');
    await next(engine);
    assert.equal(where(store), '1:c');
    // CA25 : d a joué ; il est sauté à sa place normale.
    await next(engine);
    assert.equal(where(store), '2:a');
    assert.equal(advanced(store), undefined, 'remis à zéro au round suivant');
    await next(engine); await next(engine); await next(engine);
    assert.equal(where(store), '2:d', 'au round suivant, d joue à sa place');
  });

  test('CA25 : refus avec la raison pour un combattant qui a déjà joué ou dont c’est le tour', async () => {
    const { store, engine } = await open();
    await next(engine);
    assert.deepEqual(store.playTurnNowCheck('a'), { ok: false, reason: 'a déjà joué ce round' });
    assert.equal(store.playTurnNowCheck('b').ok, false);
    assert.equal(store.playTurnNowCheck('c').ok, true);
    const refused = await store.playTurnNow('a');
    assert.equal(refused.ok, false);
    assert.match(refused.message, /déjà joué/);
    assert.equal(where(store), '1:b');
    assert.equal(advanced(store), undefined);
    await store.playTurnNow('d');
    assert.match(store.playTurnNowCheck('d').reason, /déjà son tour/);
    await next(engine);
    assert.match(store.playTurnNowCheck('d').reason, /déjà joué/, 'l’avancé reste marqué « a joué » dans le round');
    assert.deepEqual(store.getPlayedThisRound(), ['a', 'd']);
  });

  test('Annuler rétablit le tour et efface le champ', async () => {
    const { store, engine } = await open();
    await next(engine);
    await store.playTurnNow('c');
    assert.equal(where(store), '1:c');
    await store.undo();
    assert.equal(where(store), '1:b');
    assert.equal(advanced(store), undefined);
    await next(engine);
    assert.equal(where(store), '1:c', 'c joue à sa place normale');
  });

  test('enchaînés : d puis c passent avant b, qui reprend ensuite ; le round suivant reprend l’ordre', async () => {
    const { store, engine } = await open({ current: 'b' });
    await store.playTurnNow('d');
    await store.playTurnNow('c');
    assert.equal(where(store), '1:c');
    assert.deepEqual(advanced(store).playedIds, ['d', 'c']);
    await next(engine);
    assert.equal(where(store), '1:b');
    await next(engine);
    assert.equal(where(store), '2:a');
  });

  test('donnée absente : rien n’est écrit tant qu’aucun tour n’est avancé', async () => {
    const { store, engine } = await open();
    await next(engine); await next(engine); await next(engine); await next(engine);
    assert.equal(where(store), '2:a');
    assert.equal('advancedTurn' in (full(store).extensions?.v5 || {}), false);
  });

  test('un champ d’un round passé est ignoré à la lecture', async () => {
    const { store, engine } = await open({ round: 3, current: 'b', v5: { advancedTurn: { round: 2, playedIds: ['c'], resumeActorId: null } } });
    assert.equal(store.playTurnNowCheck('c').ok, true);
    await next(engine);
    assert.equal(where(store), '3:c');
  });

  test('l’ancien Tour suivant du store suit les mêmes règles', async () => {
    const { store } = await open({ current: 'b' });
    await store.playTurnNow('d');
    await store.nextTurn();
    assert.equal(where(store), '1:b');
    await store.nextTurn();
    await store.nextTurn();
    assert.equal(where(store), '2:a');
    assert.equal(advanced(store), undefined);
  });
});

// Lot E7a (CA25 bis) : les effets de début de tour de l'avancé se déclenchent quand il joue en avance, pas une seconde fois à
// sa place normale ; celui qui reprend ne rejoue pas son début de tour ; Annuler rétablit tout, horloge comprise.
// Effet pris dans les tests existants : Fureur d'Ulric (miracles-narratifs-tour.test.js), Test de Frénésie gratuit au début
// du Tour du porteur (LdB V5 p.228), demandé par le Tour V5 sous forme de saisies.
describe('lot E7a : effets de début de tour de l’avancé (Fureur d’Ulric)', () => {
  const contract = getAllDivineContracts().find(row => row.type === 'miracle' && row.name === 'Fureur d\'Ulric');
  const FURY = { label: 'Fureur d\'Ulric', test: { skill: 'willpower', slModifier: 0 }, subjects: 'targets', when: 'turn', optional: true, onSuccess: [{ type: 'frenzy' }] };
  const furyOn = targetId => ({ id: `exec-${targetId}:${targetId}:${contract.id}:imposed-test`, executionId: `exec-${targetId}`, prayerId: contract.id, casterId: 'priest', targetId,
    source: clone(contract.source), sourceReceipt: clone(contract.sourceReceipt), type: 'imposed-test',
    expiry: { phase: 'endOfRound', round: 6, moment: 'afterEffects' }, ...effectHandlers['imposed-test'].buildLayer({ type: 'imposed-test', ...FURY }, { targetId }) });
  const fieldOf = id => `divineImposedTest:${furyOn(id).id}`;
  const believer = (id, initiative, extra = {}) => fighter(id, initiative, { kind: 'PJ', camp: 'pj', hp: 20, maxHp: 30,
    caracs: { CC: 40, CT: 40, F: 30, E: 30, I: initiative, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
    extensions: { v5: { divine: { sin: 0 }, divineEffects: [furyOn(id)] } }, ...extra });
  async function openFury() {
    const store = createStore({ persistence: memory(), storage: null }); await store.ready;
    const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
      participants: [believer('priest', 60), fighter('ally', 30), believer('foe', 20, { camp: 'ennemi', kind: 'PNJ' })] },
      log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
    snapshot.extensions.v5.gameClock = createGameClock(snapshot);
    await store.loadFromJSON(snapshot);
    return { store, engine: createCombatEngine(store) };
  }
  const states = (store, id) => (full(store).combat.participants.find(row => row.id === id).states || []).map(row => row.key);
  const asks = (result, id) => (result.requests || []).filter(row => row.participantId === id);
  const yes = id => ({ [id]: { [`${fieldOf(id)}:attempt`]: true, [fieldOf(id)]: { success: true, sl: 2 } } });

  test('(1) l’effet se déclenche quand l’avancé joue maintenant : demande de saisie, puis application en une commande', async () => {
    const { store } = await openFury();
    const before = full(store);
    const pending = await store.playTurnNow('foe');
    assert.equal(pending.status, 'requires-input', JSON.stringify(pending));
    assert.ok(asks(pending, 'foe').some(row => row.field === `${fieldOf('foe')}:attempt`), JSON.stringify(pending.requests));
    assert.equal(asks(pending, 'priest').length, 0, 'celui qu’on interrompt ne rejoue rien');
    assert.equal(where(store), '1:priest', 'rien n’est appliqué tant que la saisie manque');
    const done = await store.playTurnNow('foe', { inputs: yes('foe') });
    assert.notEqual(done?.ok, false, JSON.stringify(done));
    assert.equal(where(store), '1:foe');
    assert.ok(states(store, 'foe').includes('frenzy'), 'Frénésie acquise au début du tour avancé');
    const after = full(store);
    assert.equal(after.extensions.v5.turnIndex, before.extensions.v5.turnIndex + 1, 'le tour avancé est une transition de tour');
    assert.equal(after.extensions.v5.gameClock.revision, before.extensions.v5.gameClock.revision + 1);
    assert.equal(after.extensions.v5.gameClock.combat.currentActorId, 'foe');
    assert.equal(after.extensions.v5.gameClock.campaignSeconds, before.extensions.v5.gameClock.campaignSeconds, 'pas de temps écoulé dans le round');
    assert.deepEqual(after.extensions.v5.advancedTurn, { round: 1, playedIds: ['foe'], resumeActorId: 'priest', resumeIndex: 0 });
    assert.ok(after.log.some(row => /FOE joue son tour maintenant \(puis reprise : PRIEST\)/.test(row.text)), 'journal du tour avancé');
  });

  test('(2) pas une seconde fois à sa place normale ; (3) celui qui reprend ne rejoue pas son début de tour', async () => {
    const { store, engine } = await openFury();
    // L'avancé renonce au Test (déjà en Frénésie, la Fureur ne serait plus demandée : règle existante, v5-divine-recurring.js).
    assert.notEqual((await store.playTurnNow('foe', { inputs: { foe: { [`${fieldOf('foe')}:attempt`]: false } } }))?.ok, false);
    assert.equal(where(store), '1:foe');
    const resume = await engine.nextTurn();
    assert.equal(resume.status, 'applied', `reprise sans saisie de début de tour : ${JSON.stringify(resume)}`);
    assert.equal(where(store), '1:priest');
    await next(engine);
    assert.equal(where(store), '1:ally');
    // foe a joué par anticipation : il est sauté, sa Fureur n'est pas redemandée ; le round 2 commence par priest.
    const wrap = await engine.nextTurn();
    assert.equal(asks(wrap, 'foe').length, 0, `aucune demande pour l’avancé à sa place normale : ${JSON.stringify(wrap.requests)}`);
    assert.equal((await engine.nextTurn({ inputs: { priest: { [`${fieldOf('priest')}:attempt`]: false } } })).status, 'applied');
    assert.equal(where(store), '2:priest');
    // Au round suivant, foe retrouve son début de tour à sa place.
    await next(engine);
    const own = await engine.nextTurn();
    assert.ok(asks(own, 'foe').some(row => row.field === `${fieldOf('foe')}:attempt`), 'au round 2, la Fureur revient à sa place normale');
  });

  test('(4) Annuler rétablit tout, horloge comprise', async () => {
    const { store } = await openFury();
    const before = full(store);
    await store.playTurnNow('foe', { inputs: yes('foe') });
    assert.equal(where(store), '1:foe');
    await store.undo();
    const back = full(store);
    assert.equal(where(store), '1:priest');
    assert.deepEqual(back.extensions.v5.gameClock, before.extensions.v5.gameClock);
    assert.equal(back.extensions.v5.turnIndex, before.extensions.v5.turnIndex);
    assert.equal('advancedTurn' in back.extensions.v5, false);
    assert.deepEqual(back.combat.participants, before.combat.participants);
  });

  test('saisie périmée : le combat a changé depuis l’aperçu', async () => {
    const { store } = await openFury();
    const pending = await store.playTurnNow('foe');
    await store.updateParticipant('ally', { hp: 5 });
    const stale = await store.playTurnNow('foe', { inputs: yes('foe'), baseRevision: pending.baseRevision });
    assert.equal(stale.status, 'stale');
    assert.equal(where(store), '1:priest');
  });
});

test('un tour avancé d’un combat précédent ne survit pas au démarrage d’un nouveau combat', async () => {
  const { store, engine } = await open({ round: 0, current: null, v5: { advancedTurn: { round: 1, playedIds: ['c'], resumeActorId: 'a', resumeIndex: 0 } } });
  await engine.start();
  assert.equal(where(store), '1:a');
  assert.equal(advanced(store), undefined);
  assert.equal(store.playTurnNowCheck('c').ok, true);
});
