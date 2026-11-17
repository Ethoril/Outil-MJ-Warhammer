// Lot L2 du second chantier des Traits : les effets de Traits de début et fin de Round branchés dans le Tour V5
// (`previewV5Turn`), la mort d'un Instable par la décision de mort, la case « corps intact » d'Increvable, Inflammable.
// CA6, CA7, CA8, CA9, CA22, CA24, CA25 (intégration) ; D10, D15, D17.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { previewV5Turn } from '../../../js/core/v5-turn.js';
import { advanceV5Effects } from '../../../js/core/v5-effects.js';
import { resolveV5ConditionTestContext } from '../../../js/core/v5-test-context.js';
import { decideCriticalDeath, decideImmediateCriticalDeath, decideStateDeath } from '../../../js/core/v5-critical-aftermath.js';

const person = (id, initiative, extra = {}) => ({ id, name: id.toUpperCase(), kind: 'PNJ', camp: 'monstres', zone: 'active', initiative, hp: 10, maxHp: 10,
  caracs: { E: 30, Int: 25, FM: 40, Ag: 30, I: 30 }, states: [], traits: [], extensions: { v5: {} }, ...extra });
const envelope = (participants, { round = 1, current }) => ({ schemaVersion: 3, reserve: [], log: [], diceLines: [],
  combat: { round, currentActorId: current, order: participants.map(row => row.id), participants }, extensions: { v5: { turnIndex: 1 } } });

async function open(participants, options) {
  const store = createStore({ storage: null });
  await store.ready;
  await store.loadFromJSON(envelope(participants, options));
  return { store, engine: createCombatEngine(store) };
}
const full = store => JSON.parse(store.getFullJSON());
const who = (store, id) => full(store).combat.participants.find(row => row.id === id);
const round = store => full(store).combat.round;
async function turn(engine, inputs) {
  const result = await engine.nextTurn(inputs ? { inputs } : {});
  assert.equal(result?.status, 'applied', JSON.stringify(result?.requests ?? result));
}

describe('Instable en fin de Round (CA6, CA7, D10)', () => {
  const engaged = other => ({ engagements: { [other]: { since: 1, lastAttackRound: 1 } } });
  const unstable = (hp = 10) => person('u', 40, { hp, traits: ['Unstable'], extensions: { v5: engaged('e') } });
  const enemy = (momentum = true) => person('e', 50, { camp: 'pj', extensions: { v5: { ...engaged('u'), hasMomentum: momentum } } });

  test('engagé avec un adversaire qui a l\'Élan, sur un Round complet : 2 Blessures directes en fin de Round, journal ; ↶ puis ↷', async () => {
    const { store, engine } = await open([enemy(), unstable()], { current: 'e' });
    await turn(engine);
    assert.equal(who(store, 'u').hp, 10, 'pas de perte avant la fin du Round');
    await turn(engine);
    assert.equal(round(store), 2);
    assert.equal(who(store, 'u').hp, 8);
    assert.ok(full(store).log.some(row => /Instable/.test(row.text)), 'ligne de journal');
    await store.undo();
    assert.equal(who(store, 'u').hp, 10, '↶ rétablit les Blessures');
    await store.redo();
    assert.equal(who(store, 'u').hp, 8, '↷ rejoue');
  });

  test('adversaire sans Élan : rien', async () => {
    const { store, engine } = await open([enemy(false), unstable()], { current: 'u' });
    await turn(engine);
    assert.equal(who(store, 'u').hp, 10);
  });

  test('ramené à 0 Blessure : décision de mort de cause « unstable », aucune suppression ; confirmée, mort de cause « unstable »', async () => {
    const { store, engine } = await open([enemy(), unstable(2)], { current: 'u' });
    await turn(engine);
    const body = who(store, 'u');
    assert.equal(full(store).combat.participants.length, 2, 'aucune suppression');
    assert.equal(body.hp, 0);
    assert.notEqual(body.extensions.v5.dead, true);
    assert.equal(body.extensions.v5.pendingStateDeath.cause, 'unstable');
    await store.decideStateDeath('u', body.extensions.v5.pendingStateDeath.id, 'confirm');
    assert.equal(who(store, 'u').extensions.v5.dead, true);
    assert.equal(who(store, 'u').extensions.v5.deathCause, 'unstable');
  });
});

describe('Stupide au début de Round (CA8)', () => {
  const stupid = () => person('s', 50, { traits: ['Stupid'] });
  const hero = () => person('p', 40, { camp: 'pj' });

  test('demande du Test d\'Intelligence au changement de Round, puis tour perdu levé à la fin du Tour du porteur', async () => {
    const { store, engine } = await open([stupid(), hero()], { current: 'p' });
    const asked = engine.previewNextTurn();
    assert.equal(asked.ready, false);
    const request = asked.requests.find(row => row.participantId === 's' && row.field === 'stupidIntelligence');
    assert.ok(request, JSON.stringify(asked.requests));
    assert.equal(request.kind, 'test');
    assert.ok(request.testTarget, 'la demande porte la valeur du Test (bouton de dé, D13)');
    await turn(engine, { s: { stupidIntelligence: { success: false, sl: -2 } } });
    assert.equal(round(store), 2);
    assert.equal(full(store).combat.currentActorId, 's');
    assert.equal(who(store, 's').extensions.v5.lostTurn.cause, 'stupid');
    await turn(engine);
    assert.equal(who(store, 's').extensions.v5.lostTurn, undefined, 'levé à la fin du Tour du porteur');
    await store.undo();
    assert.equal(who(store, 's').extensions.v5.lostTurn.cause, 'stupid', '↶ rétablit le marqueur');
  });

  test('un d100 tiré par le bouton et le résultat saisi donnent le même état (CA0)', async () => {
    const { store, engine } = await open([stupid(), hero()], { current: 'p' });
    const byRoll = engine.previewNextTurn({ inputs: { s: { stupidIntelligence: 99 } } });
    const byResult = engine.previewNextTurn({ inputs: { s: { stupidIntelligence: { success: false, sl: -7 } } } });
    assert.equal(byRoll.ready, true);
    const marker = preview => preview.state.combat.participants.find(row => row.id === 's').extensions.v5.lostTurn;
    assert.deepEqual(marker(byRoll), marker(byResult));
    assert.equal(round(store), 1, 'l’aperçu ne modifie rien');
  });
});

describe('Increvable : case « corps intact » et Test étendu (CA9, D15, D18)', () => {
  const dying = () => person('d', 40, { hp: 0, traits: ['Die Hard'], extensions: { v5: { pendingStateDeath: { id: 'pd', cause: 'blood', round: 1, phase: 'endOfRound' } } } });
  const hero = () => person('x', 50, { camp: 'pj' });
  const record = store => who(store, 'd').extensions.v5.dieHard;
  const label = engine => engine.previewNextTurn().requests.find(row => row.field === 'dieHardEndurance')?.label;
  const answer = sl => ({ d: { dieHardEndurance: { success: true, sl } } });
  /** Tours sans réponse jusqu'à la prochaine demande d'Increvable (une seule par Round). */
  async function untilAsked(engine) {
    for (let guard = 0; !label(engine); guard += 1) {
      assert.ok(guard < 4, 'demande d’Increvable attendue');
      await turn(engine);
    }
  }

  test('trois Rounds : DR cumulés et affichés, retour à 1 Blessure à 6 DR ; ↶ rétablit, ↷ rejoue', async () => {
    const { store, engine } = await open([hero(), dying()], { current: 'd' });
    await store.decideStateDeath('d', 'pd', 'confirm', { bodyIntact: true });
    assert.equal(who(store, 'd').extensions.v5.dead, true);
    assert.deepEqual([record(store).total, record(store).roundsLeft], [0, 3]);
    assert.match(label(engine), /0\/6/);
    await turn(engine, answer(2));
    assert.equal(round(store), 2);
    assert.equal(record(store).total, 2);
    await untilAsked(engine);
    assert.match(label(engine), /2\/6/, 'le total cumulé s’affiche');
    await turn(engine, answer(1));
    assert.equal(record(store).total, 3);
    await untilAsked(engine);
    await turn(engine, answer(3));
    assert.equal(round(store), 4);
    assert.equal(record(store).total, 6);
    assert.equal(who(store, 'd').hp, 1);
    assert.equal(who(store, 'd').extensions.v5.dead, undefined);
    await store.undo();
    assert.equal(record(store).total, 3, '↶ rétablit le total');
    assert.equal(who(store, 'd').extensions.v5.dead, true);
    await store.redo();
    assert.equal(record(store).total, 6, '↷ rejoue');
    assert.equal(who(store, 'd').hp, 1);
  });

  test('sans la case : aucune demande au Round suivant', async () => {
    const { store, engine } = await open([hero(), dying()], { current: 'd' });
    await store.decideStateDeath('d', 'pd', 'confirm');
    assert.equal(record(store), undefined);
    assert.equal(engine.previewNextTurn().ready, true);
  });

  test('les deux décisions de mort critique acceptent aussi la case', () => {
    const critical = { ...dying(), extensions: { v5: { criticalAftermath: [{ id: 'c1', table: 'BODY', sequela: { criticalDeath: true } }] } } };
    const immediate = decideImmediateCriticalDeath(critical, { criticalId: 'c1', decision: 'confirm', bodyIntact: true, round: 2 });
    assert.equal(immediate.participant.extensions.v5.dieHard.roundsLeft, 3);
    assert.equal(decideImmediateCriticalDeath(critical, { criticalId: 'c1', decision: 'confirm' }).participant.extensions.v5.dieHard, undefined);
    const countdown = { ...dying(), states: [{ id: 'i', name: 'Inconscient', key: 'inconscient', level: 1 }],
      extensions: { v5: { criticalWounds: [{ id: 'w1' }], criticalDeath: { id: 'cd', status: 'awaiting-mj', dueRound: 2, toughnessBonus: 0, criticalIds: ['w1'] } } } };
    const decided = decideCriticalDeath(countdown, { decision: 'confirm', round: 2, bodyIntact: true });
    assert.equal(decided.status, 'dead');
    assert.equal(decided.participant.extensions.v5.dieHard.total, 0);
    assert.equal(decideStateDeath(dying(), { pendingId: 'pd', decision: 'decline', bodyIntact: true }).participant.extensions.v5.dieHard, undefined, 'refus : rien');
  });
});

describe('Inflammable (CA22, D17)', () => {
  const ablaze = (traits = ['Flammable']) => person('f', 40, { hp: 20, maxHp: 20, traits, states: [{ id: 'fire', name: 'Enflammé', key: 'enflamme', level: 1 }] });
  const endOfRound = participant => advanceV5Effects(participant, { phase: 'endOfRound', round: 1, actorId: null, turn: 1 }, { fireRoll: 8, fireArmour: 0 });

  test('perte de Blessures d\'Enflammé doublée en fin de Round', () => {
    assert.equal(endOfRound(ablaze([])).participant.hp, 15, 'sans le Trait : 8 + 0 − BE 3 − PA 0 = 5');
    assert.equal(endOfRound(ablaze()).participant.hp, 10, 'Inflammable : 10');
  });

  test('doublée aussi dans le Tour V5', async () => {
    const { store, engine } = await open([person('x', 50, { camp: 'pj' }), ablaze()], { current: 'f' });
    await turn(engine, { f: { fireRoll: 8 } });
    assert.equal(who(store, 'f').hp, 10);
  });

  test('−2 DR au seul Test pour éviter Enflammé, pas au retrait par Athlétisme', () => {
    const avoid = actor => resolveV5ConditionTestContext(actor, { characteristic: 'Ag', avoidsCondition: 'enflamme' }).slModifiers.filter(row => row.id === 'trait:flammable');
    assert.deepEqual(avoid(ablaze()).map(row => row.amount), [-2]);
    assert.deepEqual(avoid(ablaze([])), [], 'sans le Trait');
    const removal = resolveV5ConditionTestContext(ablaze(), { characteristic: 'Ag', skill: 'Athlétisme' }).slModifiers.filter(row => row.id === 'trait:flammable');
    assert.deepEqual(removal, [], 'retrait par Athlétisme');
  });
});

describe('Participant sans ces Traits (CA24)', () => {
  test('changement de Round : état identique, aucun champ de Traits', () => {
    const state = envelope([person('a', 50), person('b', 40, { camp: 'pj' })], { current: 'b' });
    const preview = previewV5Turn(state);
    assert.equal(preview.ready, true);
    assert.equal('traitPlans' in preview, false);
    assert.deepEqual(preview.state.combat.participants, state.combat.participants);
    assert.equal(preview.state.log.some(row => String(row.id).startsWith('trait:')), false);
  });
});
