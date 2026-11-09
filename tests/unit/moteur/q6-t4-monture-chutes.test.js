// Q6 · T4 (docs/specs/tests-secondaires-agregateur/) : Chevaucher (Désarçonnement, Surpris à cheval), opposition de Force après
// Chevaucher, Endurance après Croche-pied monté et Force de la source d'un Filet passent par le calcul commun, des deux côtés pour
// les oppositions (CA1, CA3) ; une question d'État arrête le Test (CA8) ; Inconscient le bloque (CA14) ; sans État, rien ne change (CA9).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { previewResolution, previewMountedSecondaryTest } from '../../../js/core/resolution.js';
import { previewV5SecondaryTest } from '../../../js/core/v5-test-modifiers.js';
import { V5_RIDE_SKILL_ID } from '../../../js/core/v5-mounted-combat.js';

const tired = { id: 'tired', key: 'extenue', name: 'Exténué', level: 1 };
const broken = { id: 'broken', key: 'brise', name: 'Brisé', level: 1 };
const out = { id: 'out', key: 'inconscient', name: 'Inconscient', level: 1 };
const surprised = { id: 'surp', key: 'surpris', name: 'Surpris', level: 1 };
const blind = { id: 'blind', key: 'aveugle', name: 'Aveuglé', level: 1 };

const actor = (id, { mounted = false, mountId, states = [], strength = 40, toughness = 40, ride = null } = {}) => ({
  id, name: id, kind: 'PJ', camp: id === 'attacker' ? 'pj' : 'ennemi', zone: 'active', size: 'average', hp: 20, maxHp: 20,
  caracs: { CC: 60, CT: 40, F: strength, E: toughness, I: 40, Ag: 40, Dex: 30, Int: 30, FM: 30, Soc: 30, M: 4 },
  skills: ride === null ? [] : [{ id: V5_RIDE_SKILL_ID, name: 'Chevaucher', total: ride, status: 'resolved' }],
  talents: [], states, equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { mounted, ...(mountId ? { mountId } : {}) } }
});
const horse = (id = 'horse', traits = []) => ({ id, name: id, kind: 'Créature', zone: 'active', size: 'large', caracs: { F: 50 }, traits, states: [] });

// Critique défensif qui donne Sonné au cavalier attaquant : un Test de Chevaucher +0.
function stunnedRiderInput(states, context = { mountedRideScore: 55, mountedRideRoll: 40 }) {
  const rider = actor('attacker', { mounted: true, mountId: 'horse', states }), defender = actor('target');
  return { actor: rider, target: defender, action: { type: 'attack', attr: 'CC', base: 60, damage: 5 }, roll: 22,
    defense: { base: 50, roll: 33, v5: { kind: 'melee' } }, criticalRolls: { location: 57, effect: 65 }, defenderCriticalRolls: { location: 4, effect: 20 },
    v5: { kind: 'melee', context }, v5State: { participants: [rider, defender, horse()] } };
}

describe('Q6 · T4 : Chevaucher au Désarçonnement (resolution.js)', () => {
  test('CA9 : sans État porté, le Test de Chevaucher ne compte que le Sonné qui le déclenche (CA26, MJ 09/11 soir)', () => {
    const clean = previewResolution(stunnedRiderInput([]));
    assert.equal(clean.mountedFall[0].test.sl, 1 - 1, 'jet 40 sur 55 : 5 − 4 = 1 DR, −1 du Sonné déclencheur (avant CA26 : 1)');
  });

  test('CA1 : Exténué du cavalier pèse sur Chevaucher, comme le calcul commun', () => {
    // CA26 : le Sonné déclencheur (−1) compte ; la plus forte pénalité d'État seule s'applique, d'où Exténué 2 pour la voir jouer.
    const tired2 = { ...tired, level: 2 };
    const clean = previewResolution(stunnedRiderInput([])).mountedFall[0].test;
    const plan = previewResolution(stunnedRiderInput([tired2])).mountedFall[0];
    assert.equal(plan.test.sl, clean.sl - 1);
    const common = previewV5SecondaryTest(actor('attacker', { states: [tired2, { id: 'stun', key: 'sonne', name: 'Sonné', level: 1 }] }), { score: 55, roll: 40,
      slModifiers: [{ id: 'mounted:fall', label: 'Désarçonnement', amount: 0 }], test: { characteristic: 'Ag', skill: 'Chevaucher', isAction: false }, context: { reliesOnSight: true } });
    assert.equal(plan.test.sl, common.result.sl);
    assert.ok(plan.test.detail.some(text => /Exténué|État/.test(text)), plan.test.detail.join(' | '));
  });

  test('CA8 : une question d’État arrête le Test, puis la réponse du MJ le résout', () => {
    const pending = previewResolution(stunnedRiderInput([broken]));
    assert.equal(pending.mountedFall[0].test, undefined);
    const question = pending.mountedFall[0].needsInput?.[0];
    assert.deepEqual([question?.field, question?.participantId, question?.answerAt], ['runningOrHiding', 'attacker', 'mountedRideTestsById.attacker.conditionContext']);
    assert.ok(pending.unresolved.some(text => /Chevaucher : à préciser/.test(text)));
    const answered = previewResolution(stunnedRiderInput([broken], { mountedRideTestsById: { attacker: { score: 55, roll: 40, conditionContext: { runningOrHiding: false } } } }));
    assert.equal(answered.mountedFall[0].test.sl, 0, 'Brisé : −1 DR hors fuite');
  });

  test('Chevaucher repose sur la vue (Aveuglé, V5 p. 185) : Désavantage sans question sur la vue', () => {
    // CA26 : Aveuglé (Désavantage) et le Sonné déclencheur (DR) diffèrent : le MJ choisit le mode, ici le Désavantage.
    const plan = previewResolution(stunnedRiderInput([blind], { mountedRideScore: 55, mountedRideRoll: 40, mountedRideConditionContext: { conditionPenaltyMode: 'disadvantage' } })).mountedFall[0];
    assert.ok(plan.test, JSON.stringify(plan.needsInput));
    assert.ok(plan.test.advantage.disadvantage.length > 0);
  });

  test('CA14 : un cavalier Inconscient ne fait pas le Test ; Surpris ne l’empêche pas (ce n’est pas une Action)', () => {
    const blocked = previewMountedSecondaryTest(actor('r', { states: [out] }), { score: 55, roll: 40, stat: 'Ag', skill: 'Chevaucher' });
    assert.equal(blocked.ready, false); assert.equal(blocked.blocked, true); assert.match(blocked.message, /Inconscient/);
    const allowed = previewMountedSecondaryTest(actor('r', { states: [surprised] }), { score: 55, roll: 40, stat: 'Ag', skill: 'Chevaucher' });
    assert.equal(allowed.ready, true);
  });
});

describe('Q6 · T4 : opposition de Force après Chevaucher, des deux côtés (CA3)', () => {
  const grapple = ({ holderStates = [], riderStates = [] } = {}) => {
    const holder = actor('holder', { strength: 70, states: holderStates }); holder.skills = [{ id: 'bh', name: 'Bagarre', total: 60, status: 'resolved' }];
    const rider = actor('rider', { mounted: true, mountId: 'horse', strength: 30, states: riderStates }); rider.skills = [{ id: 'bt', name: 'Bagarre', total: 50, status: 'resolved' }];
    return previewResolution({ actor: holder, target: rider, roll: 1,
      action: { id: 'act-bh', type: 'attack', attr: 'CC', base: 50, damage: 4, extensions: { fiche: { skillId: 'bh' } } },
      defense: { type: 'skill', attr: 'CC', base: 50, roll: 70, label: 'Bagarre', v5: { kind: 'melee', choice: 'keep', context: { skillId: 'bt' } } },
      v5: { kind: 'melee', choice: 'reverse', context: { skillId: 'bh', grappleDeclared: true, mountedRideScore: 55, mountedRideRoll: 25,
        mountedForceRolls: { holder: 20, rider: 10 }, mountedSizeChoices: { actor: 'average', targetMount: 'large' } } },
      v5State: { participants: [holder, rider, horse()] } }).mountedFall[0];
  };
  test('Exténué pèse sur le Test de Force du saisisseur et sur celui du cavalier', () => {
    const clean = grapple(), holderTired = grapple({ holderStates: [tired] }), riderTired = grapple({ riderStates: [tired] });
    assert.equal(holderTired.strengthOpposition.holderTest.sl, clean.strengthOpposition.holderTest.sl - 1);
    assert.equal(holderTired.strengthOpposition.riderTest.sl, clean.strengthOpposition.riderTest.sl);
    assert.equal(riderTired.strengthOpposition.riderTest.sl, clean.strengthOpposition.riderTest.sl - 1);
  });
});

describe('Q6 · T4 : Endurance après Croche-pied monté', () => {
  const trip = (states, extra = {}) => {
    const attacker = actor('attacker'), target = actor('rider', { mounted: true, toughness: 20, states });
    return previewResolution({ actor: attacker, target, roll: 25, action: { type: 'test', attr: 'F', base: 40 },
      defense: { base: 30, roll: 80, v5: { kind: 'test', choice: 'keep' } },
      v5: { kind: 'test', context: { trip: true, tripFallEnduranceRoll: 10, ...extra } } });
  };
  test('Exténué pèse sur le Test d’Endurance de la chute', () => {
    const clean = trip([]).tripFall.enduranceTest, tiredTest = trip([tired]).tripFall.enduranceTest;
    assert.equal(clean.sl, 1, 'jet 10 sur E 20 : 2 − 1 = 1 DR');
    assert.equal(tiredTest.sl, clean.sl - 1);
  });
  test('CA8 : Brisé demande sa précision avant le Test d’Endurance', () => {
    const pending = trip([broken]);
    assert.equal(pending.tripFall.enduranceTest, null);
    assert.ok(pending.unresolved.some(text => /Endurance : à préciser/.test(text)), pending.unresolved.join(' | '));
    const answered = trip([broken], { tripFallConditionContext: { runningOrHiding: false } });
    assert.equal(answered.tripFall.enduranceTest.sl, 0);
  });
});

describe('Q6 · T4 : Force de la source d’un Filet', () => {
  const escape = ({ holderStates = [], kind = 'wielder' } = {}) => {
    const holder = actor('holder', { strength: 40, states: holderStates });
    const victim = actor('victim', { strength: 30, states: [{ id: 'net', key: 'enchevetre', name: 'Empêtré', level: 1, strength: 40,
      source: { kind: 'quality', entanglementKind: kind, authorId: 'holder', escapeStrength: 40 } }] });
    return previewResolution({ actor: victim, roll: 12, action: { type: 'test', attr: 'F', base: 30, label: 'Force' },
      v5: { kind: 'test', context: { netEscapeConditionId: 'net', netEscapeOpponentRoll: 20, involvesMovement: false } },
      v5State: { participants: [holder, victim] } }).netEscape.opposition;
  };
  test('Exténué pèse sur la Force de la source participante', () => {
    assert.equal(escape({ holderStates: [tired] }).sourceSl, escape().sourceSl - 1);
  });
  test('Une source sans fiche (seuil du matériau) garde son score', () => {
    assert.equal(escape({ holderStates: [tired], kind: 'rope' }).sourceSl, escape({ kind: 'rope' }).sourceSl);
  });
});

describe('Q6 · T4 : commandes de monture du Store', () => {
  const load = async participants => {
    const store = createStore({ storage: null }); await store.ready;
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
      combat: { round: 1, currentActorId: participants[0].id, order: participants.map(row => row.id), participants } });
    return store;
  };
  test('États acquis : Chevaucher (monture Craintive surprise) par le calcul commun', async () => {
    const run = async states => {
      const store = await load([actor('rider', { mounted: true, mountId: 'horse', states }), horse('horse', [{ name: 'Psychologie', param: 'Craintif' }])]);
      return store.acquireConditions('horse', ['Surpris'], { 'mountedRideScore:rider': 55, 'mountedRideRoll:rider': 40 });
    };
    const clean = await run([]), tiredRun = await run([tired]);
    assert.equal(clean.mountedFall[0].test.sl, 5, 'jet 40 sur 55, +4 DR de Surpris');
    assert.equal(tiredRun.mountedFall[0].test.sl, clean.mountedFall[0].test.sl - 1);
  });
  test('États acquis : une question d’État devient une demande, puis la réponse résout le Test', async () => {
    const store = await load([actor('rider', { mounted: true, mountId: 'horse', states: [broken] }), horse('horse', [{ name: 'Psychologie', param: 'Craintif' }])]);
    const pending = await store.acquireConditions('horse', ['Surpris'], { 'mountedRideScore:rider': 55, 'mountedRideRoll:rider': 40 });
    assert.equal(pending.status, 'requires-input');
    assert.deepEqual(pending.performedTests, [], 'un Test bloqué ne réserve pas Obstiné');
    assert.ok(pending.requests.some(row => row.field === 'mountedRideCondition:rider:runningOrHiding'), JSON.stringify(pending.requests));
    const applied = await store.acquireConditions('horse', ['Surpris'], { 'mountedRideScore:rider': 55, 'mountedRideRoll:rider': 40, 'mountedRideCondition:rider:runningOrHiding': false });
    assert.equal(applied.mountedFall[0].test.sl, 4);
  });
  test('État de la monture : le Chevaucher du cavalier consomme Obstiné et Annuler le rend', async () => {
    const rider = actor('rider', { mounted: true, mountId: 'horse' });
    rider.talents.push({ id: 'talent-strong-minded', status: 'resolved', rank: 1 });
    const store = await load([rider, horse('horse', [{ name: 'Psychologie', param: 'Craintif' }])]);
    await store.startTalentSession();
    const result = await store.acquireConditions('horse', ['Surpris'], { 'mountedRideScore:rider': 55, 'mountedRideRoll:rider': 40, 'mountedRideCondition:rider:preRollTalent': 'strong-minded' });
    assert.equal(result.status, 'applied');
    assert.equal(store.getObstinateStatus('rider').available, false);
    await store.undo();
    assert.equal(store.getObstinateStatus('rider').available, true);
  });
  test('Embuscade : Surpris à cheval par le calcul commun ; Inconscient bloque', async () => {
    const run = async states => {
      const rider = actor('rider', { mounted: true, mountId: 'horse', states, ride: 55 }); rider.camp = 'ambush';
      const mount = horse('horse'); mount.camp = 'ambush'; const foe = actor('attacker'); foe.camp = 'heroes';
      const store = await load([rider, mount, foe]);
      return store.previewCombatInitialization({ surprisedCamp: 'ambush', characteristicById: { rider: 50, horse: 30, attacker: 40 },
        diceById: { rider: 5, horse: 4, attacker: 3 }, mountedRideTests: { rider: { roll: 40 } } });
    };
    const clean = await run([]), tiredRun = await run([tired]), outRun = await run([out]);
    assert.equal(clean.mountedFall[0].test.sl, 5);
    assert.equal(tiredRun.mountedFall[0].test.sl, 4);
    assert.equal(outRun.mountedFall[0].test, undefined);
    assert.ok(outRun.needsInput.some(row => /Inconscient/.test(row.label)), JSON.stringify(outRun.needsInput));
  });
  test('Embuscade : Chevaucher consomme Obstiné et Annuler rend le quota', async () => {
    const rider = actor('rider', { mounted: true, mountId: 'horse', ride: 55 }); rider.camp = 'ambush';
    rider.talents.push({ id: 'talent-strong-minded', status: 'resolved', rank: 1 });
    const mount = horse('horse'); mount.camp = 'ambush';
    const foe = actor('attacker'); foe.camp = 'heroes';
    const store = await load([rider, mount, foe]);
    await store.startTalentSession();
    const preview = store.previewCombatInitialization({ surprisedCamp: 'ambush', characteristicById: { rider: 50, horse: 30, attacker: 40 },
      diceById: { rider: 5, horse: 4, attacker: 3 }, mountedRideTests: { rider: { roll: 40, conditionContext: { preRollTalent: 'strong-minded' } } } });
    assert.equal(preview.ready, true, JSON.stringify(preview.needsInput));
    assert.equal((await store.applyCombatInitialization(preview)).ok, true);
    assert.equal(store.getObstinateStatus('rider').available, false);
    await store.undo();
    assert.equal(store.getObstinateStatus('rider').available, true);
  });
});

describe('Q6 · T4 : retours du verifier', () => {
  test('Chute d’un sort : une question d’État sur Chevaucher empêche l’application du sort', async () => {
    const { fixture, input, contractFor } = await import('../../helpers/lot3-catalogue-fixture.js');
    const { store } = await fixture();
    const state = JSON.parse(store.getFullJSON());
    const rider = state.combat.participants.find(row => row.id === 'foe');
    rider.extensions.v5 = { ...(rider.extensions.v5 || {}), mounted: true, mountId: 'horse' };
    rider.states = [...(rider.states || []), broken];
    state.combat.participants.push({ id: 'horse', name: 'Horse', kind: 'Créature', camp: 'ennemi', zone: 'active', size: 'large', caracs: { F: 50 }, traits: [], states: [], skills: [], equipment: [] });
    await store.loadFromJSON(state);
    const spell = { ...input('Choc', { actorId: 'mage', targetIds: ['foe'], sl: 12 }), mountedRideTests: { foe: { score: 55, roll: 99 } } };
    const preview = store.previewSpellExecution(contractFor('Choc').id, spell);
    assert.ok(preview.needsInput.some(row => row.field === 'rideCondition:foe:runningOrHiding'), JSON.stringify(preview.needsInput));
    const applied = await store.applySpellExecution(contractFor('Choc').id, spell);
    assert.equal(applied?.status, 'requires-input');
    assert.equal(store.listParticipants().find(row => row.id === 'foe').states.some(row => row.key === 'sonne'), false);
    const answered = { ...spell, mountedRideTests: { foe: { score: 55, roll: 99, conditionContext: { runningOrHiding: false } } } };
    assert.equal(store.previewSpellExecution(contractFor('Choc').id, answered).mountedFall[0].dismount, true);
  });
  test('CA21 : l’Endurance de la chute est un Test subi, faite même Inconscient', () => {
    const attacker = actor('attacker'), target = actor('rider', { mounted: true, toughness: 20, states: [out] });
    const preview = previewResolution({ actor: attacker, target, roll: 25, action: { type: 'test', attr: 'F', base: 40 },
      defense: { base: 30, roll: 80, v5: { kind: 'test', choice: 'keep' } }, v5: { kind: 'test', context: { trip: true, tripFallEnduranceRoll: 10 } } });
    assert.ok(preview.tripFall?.enduranceTest, JSON.stringify(preview.unresolved));
  });
});
