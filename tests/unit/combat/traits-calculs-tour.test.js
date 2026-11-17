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
import { catalogueTraitOf } from '../../../js/data/creature-trait-catalogue.js';

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

  test('adversaire sans Élan : rien, sur un changement de Round réel', async () => {
    const { store, engine } = await open([enemy(false), unstable()], { current: 'u' });
    await turn(engine);
    assert.equal(round(store), 2);
    assert.equal(who(store, 'u').hp, 10);
  });

  test('non engagé, ennemi avec Élan : rien', async () => {
    const free = person('u', 40, { traits: ['Unstable'] });
    const foe = person('e', 50, { camp: 'pj', extensions: { v5: { hasMomentum: true } } });
    const { store, engine } = await open([foe, free], { current: 'u' });
    await turn(engine);
    assert.equal(round(store), 2);
    assert.equal(who(store, 'u').hp, 10);
  });

  test('Élan relevé avant les pertes de fin de Round : l\'ennemi qui brûle et perd son Élan compte encore', async () => {
    const burning = person('e', 50, { camp: 'pj', states: [{ id: 'f', name: 'Enflammé', key: 'enflamme', level: 1 }], extensions: { v5: { ...engaged('u'), hasMomentum: true } } });
    const { store, engine } = await open([burning, unstable()], { current: 'u' });
    await turn(engine, { e: { fireRoll: 9, fireArmour: 0 } });
    assert.equal(round(store), 2);
    assert.ok(who(store, 'e').hp < 10, 'l’ennemi a brûlé');
    assert.notEqual(who(store, 'e').extensions.v5.hasMomentum, true, 'et perdu son Élan');
    assert.equal(who(store, 'u').hp, 8, 'Instable lit l’Élan d’avant les pertes');
  });

  test('une décision de mort déjà proposée garde sa cause : la première cause l’emporte', async () => {
    const proposed = person('u', 40, { hp: 2, traits: ['Unstable'], extensions: { v5: { ...engaged('e'), pendingStateDeath: { id: 'old', cause: 'blood', round: 1, phase: 'endOfRound' } } } });
    const { store, engine } = await open([enemy(), proposed], { current: 'u' });
    await turn(engine);
    assert.equal(who(store, 'u').hp, 0, 'la perte d’Instable s’applique');
    assert.equal(who(store, 'u').extensions.v5.pendingStateDeath.id, 'old');
    assert.equal(who(store, 'u').extensions.v5.pendingStateDeath.cause, 'blood');
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
  // Le Stupide joue après le PJ : une levée à la fin d'un autre Tour que le sien se verrait.
  const stupid = () => person('s', 40, { traits: ['Stupid'] });
  const hero = () => person('p', 50, { camp: 'pj' });

  test('demande du Test d\'Intelligence au changement de Round, puis tour perdu levé à la fin du Tour du porteur, pas avant', async () => {
    const { store, engine } = await open([hero(), stupid()], { current: 's' });
    const asked = engine.previewNextTurn();
    assert.equal(asked.ready, false);
    const request = asked.requests.find(row => row.participantId === 's' && row.field === 'stupidIntelligence');
    assert.ok(request, JSON.stringify(asked.requests));
    assert.equal(request.kind, 'test');
    assert.ok(request.testTarget, 'la demande porte la valeur du Test (bouton de dé, D13)');
    await turn(engine, { s: { stupidIntelligence: { success: false, sl: -2 } } });
    assert.equal(round(store), 2);
    assert.equal(full(store).combat.currentActorId, 'p');
    assert.equal(who(store, 's').extensions.v5.lostTurn.cause, 'stupid');
    await turn(engine);
    assert.equal(full(store).combat.currentActorId, 's');
    assert.equal(who(store, 's').extensions.v5.lostTurn?.cause, 'stupid', 'pas levé à la fin du Tour du PJ');
    await turn(engine, { s: { stupidIntelligence: { success: true, sl: 0 } } });
    assert.equal(who(store, 's').extensions.v5.lostTurn, undefined, 'levé à la fin du Tour du porteur');
    await store.undo();
    assert.equal(who(store, 's').extensions.v5.lostTurn.cause, 'stupid', '↶ rétablit le marqueur');
  });

  test('un d100 tiré par le bouton et le résultat saisi donnent le même état (CA0)', async () => {
    const { store, engine } = await open([hero(), stupid()], { current: 's' });
    const marker = inputs => engine.previewNextTurn({ inputs: { s: { stupidIntelligence: inputs } } }).state.combat.participants.find(row => row.id === 's').extensions.v5.lostTurn;
    assert.deepEqual(marker(99), marker({ success: false, sl: -7 }));
    assert.ok(marker(99), 'échec : tour perdu');
    assert.equal(marker(5), undefined, 'réussite tirée (05 contre Int 25) : rien');
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

  test('décapité : la case « corps intact » est ignorée', () => {
    const head = { ...dying(), extensions: { v5: { criticalAftermath: [{ id: 'c1', table: 'HEAD', sequela: { criticalDeath: true } }] } } };
    const decided = decideImmediateCriticalDeath(head, { criticalId: 'c1', decision: 'confirm', decapitated: true, bodyIntact: true, round: 2 });
    assert.equal(decided.participant.extensions.v5.deathCause, 'decapitation');
    assert.equal(decided.participant.extensions.v5.dieHard, undefined);
    assert.equal(decideImmediateCriticalDeath(head, { criticalId: 'c1', decision: 'confirm', bodyIntact: true, round: 2 }).participant.extensions.v5.dieHard.roundsLeft, 3, 'tête non tranchée : la case compte');
  });

  test('le Store transmet la case aux deux décisions de mort critique', async () => {
    const critical = () => ({ ...dying(), extensions: { v5: { criticalAftermath: [{ id: 'c1', table: 'BODY', sequela: { criticalDeath: true } }] } } });
    const countdown = () => ({ ...dying(), states: [{ id: 'i', name: 'Inconscient', key: 'inconscient', level: 1 }],
      extensions: { v5: { criticalWounds: [{ id: 'w1' }], criticalDeath: { id: 'cd', status: 'awaiting-mj', dueRound: 2, toughnessBonus: 0, criticalIds: ['w1'] } } } });
    for (const bodyIntact of [true, false]) {
      const immediate = await open([hero(), critical()], { round: 2, current: 'x' });
      await immediate.store.decideImmediateCriticalDeath('d', 'c1', 'confirm', { bodyIntact });
      assert.equal(who(immediate.store, 'd').extensions.v5.dieHard?.roundsLeft, bodyIntact ? 3 : undefined, `mort immédiate, case ${bodyIntact}`);
      const counted = await open([hero(), countdown()], { round: 2, current: 'x' });
      await counted.store.decideCriticalDeath('d', 'confirm', { bodyIntact });
      assert.equal(who(counted.store, 'd').extensions.v5.dieHard?.roundsLeft, bodyIntact ? 3 : undefined, `décompte, case ${bodyIntact}`);
    }
    const decapitated = await open([hero(), { ...critical(), extensions: { v5: { criticalAftermath: [{ id: 'c1', table: 'HEAD', sequela: { criticalDeath: true } }] } } }], { round: 2, current: 'x' });
    await decapitated.store.decideImmediateCriticalDeath('d', 'c1', 'confirm', { decapitated: true, bodyIntact: true });
    assert.equal(who(decapitated.store, 'd').extensions.v5.dieHard, undefined, 'décapité par le Store : case ignorée');
  });

  test('d100 tiré et résultat saisi donnent le même total de DR (CA0)', async () => {
    const { store, engine } = await open([hero(), dying()], { current: 'd' });
    await store.decideStateDeath('d', 'pd', 'confirm', { bodyIntact: true });
    const total = raw => engine.previewNextTurn({ inputs: { d: { dieHardEndurance: raw } } }).state.combat.participants.find(row => row.id === 'd').extensions.v5.dieHard.total;
    assert.equal(total(5), 3, '05 contre E 30 : 3 DR');
    assert.equal(total({ success: true, sl: 3 }), total(5));
    assert.equal(total(28), 1, '28 contre E 30 : 1 DR');
  });

  test('créature relevée avant le Round suivant : plus de demande, suivi clos', async () => {
    const { store, engine } = await open([hero(), dying()], { current: 'd' });
    await store.decideStateDeath('d', 'pd', 'confirm', { bodyIntact: true });
    const relieved = who(store, 'd');
    const living = { ...relieved, hp: 8, extensions: { v5: { ...relieved.extensions.v5, dead: false } } };
    const again = await open([hero(), living], { current: 'd' });
    const preview = again.engine.previewNextTurn();
    assert.equal(preview.requests.some(row => row.field === 'dieHardEndurance'), false);
    await turn(again.engine);
    assert.equal(who(again.store, 'd').hp, 8);
    assert.equal(who(again.store, 'd').extensions.v5.dieHard.ended, 'cancelled');
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

  test('le catalogue dit −2 DR aux seuls Tests pour éviter Enflammé (D17)', () => {
    const text = catalogueTraitOf('Flammable').summaryFr;
    assert.match(text, /−2 DR/);
    assert.match(text, /éviter Enflammé/);
    assert.doesNotMatch(text, /−20/);
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

  test('engagés, Élan d\'un côté, un mort sans suivi : les Traits n\'ajoutent ni ne retirent rien', () => {
    const engaged = other => ({ [other]: { since: 1, lastAttackRound: 1 } });
    const state = envelope([
      person('a', 50, { extensions: { v5: { hasMomentum: true, engagements: engaged('b') } } }),
      person('b', 40, { camp: 'pj', extensions: { v5: { engagements: engaged('a') } } }),
      person('c', 30, { hp: 0, extensions: { v5: { dead: true, deathCause: 'blood' } } })
    ], { current: 'c' });
    const preview = previewV5Turn(state);
    assert.equal(preview.ready, true);
    assert.equal(preview.state.combat.round, 2);
    assert.equal('traitPlans' in preview, false);
    assert.equal(preview.state.combat.participants.find(row => row.id === 'a').extensions.v5.hasMomentum, true, 'Élan intact');
    assert.equal(preview.state.combat.participants.find(row => row.id === 'c').extensions.v5.dieHard, undefined);
    assert.deepEqual(preview.state.combat.participants.map(row => row.hp), [10, 10, 0]);
    assert.equal(preview.state.log.some(row => String(row.id).startsWith('trait:')), false);
  });
});
