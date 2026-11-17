import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { collectRoundTraitEffects, applyTraitPatches, startDieHard, advanceDieHard, testTargetOf } from '../../../js/core/trait-effects.js';

const person = (id, extra = {}) => ({ id, name: id.toUpperCase(), camp: 'monstres', zone: 'active', hp: 10, maxHp: 10, caracs: { E: 30, Int: 30, FM: 40 }, traits: [], extensions: { v5: {} }, ...extra });
const withV5 = (extra = {}, v5 = {}) => ({ ...extra, extensions: { v5 } });
const deepFreeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; };
const endOfRound = (participants, engaged = {}) => collectRoundTraitEffects({ participants, phase: 'endOfRound', round: 3, turnIndex: 8, engagedIdsOf: id => engaged[id] || [] });
const startOfRound = (participants, inputs = {}) => collectRoundTraitEffects({ participants, phase: 'startOfRound', round: 4, turnIndex: 9, inputs });

describe('Instable en fin de Round (CA6, CA7)', () => {
  const unstable = (hp = 10, v5 = {}) => person('u', { traits: ['Unstable'], hp, extensions: { v5 } });
  const enemy = (momentum = true) => person('e', { camp: 'pj', extensions: { v5: { hasMomentum: momentum } } });

  test('engagé, adversaire avec Élan, sans Élan propre : 2 Blessures directes et journal', () => {
    const participants = deepFreeze([unstable(), enemy()]);
    const out = endOfRound(participants, { u: ['e'], e: ['u'] });
    assert.deepEqual(out.patches, [{ type: 'wounds', participantId: 'u', amount: 2, cause: 'unstable' }]);
    assert.equal(out.logs.length, 1);
    assert.match(out.logs[0].text, /Instable/);
    assert.equal(applyTraitPatches(participants, out.patches)[0].hp, 8);
  });

  test('autres cas : rien (adversaire sans Élan, porteur avec Élan, non engagé)', () => {
    assert.deepEqual(endOfRound([unstable(), enemy(false)], { u: ['e'] }).patches, [], 'adversaire sans Élan');
    assert.deepEqual(endOfRound([unstable(10, { hasMomentum: true }), enemy()], { u: ['e'] }).patches, [], 'porteur avec Élan');
    assert.deepEqual(endOfRound([unstable(), enemy()], {}).patches, [], 'non engagé');
  });

  test('profil L11 : rappel seul, aucun patch', () => {
    const zoo = person('u', { traits: ['Unstable'], extensions: { v5: { bestiary: { book: 'L11' } } } });
    const out = endOfRound([zoo, enemy()], { u: ['e'] });
    assert.deepEqual(out.patches, []);
    assert.deepEqual(out.logs, []);
    assert.ok(out.unresolved.length > 0);
  });

  test('à 0 Blessure : décision de mort de cause « unstable », jamais de suppression', () => {
    const out = endOfRound([unstable(2), enemy()], { u: ['e'] });
    const death = out.patches.find(patch => patch.type === 'state-death');
    assert.equal(death.pending.cause, 'unstable');
    const applied = applyTraitPatches([unstable(2), enemy()], out.patches);
    assert.equal(applied.length, 2, 'aucune suppression');
    assert.equal(applied[0].hp, 0);
    assert.equal(applied[0].extensions.v5.pendingStateDeath.cause, 'unstable');
    assert.notEqual(applied[0].extensions.v5.dead, true);
  });
});

describe('Stupide au début de Round (CA8)', () => {
  const stupid = (extra = {}) => person('s', { traits: ['Stupid'], caracs: { E: 30, Int: 25 }, ...extra });

  test('sans allié non Stupide : demande du Test d\'Intelligence +4 DR', () => {
    const out = startOfRound([stupid(), person('p', { camp: 'pj' })]);
    assert.equal(out.requests.length, 1);
    assert.equal(out.requests[0].kind, 'test');
    assert.equal(out.requests[0].testTarget.score, 25);
    assert.ok(out.requests[0].testTarget.slModifiers.some(row => row.amount === 4));
  });

  test('allié non Stupide en jeu : demande « guidé » d\'abord ; guidé, rien ; non guidé, le Test', () => {
    const participants = [stupid(), person('a')];
    const asked = startOfRound(participants);
    assert.equal(asked.requests.length, 1);
    assert.equal(asked.requests[0].kind, 'choice');
    const guided = startOfRound(participants, { s: { stupidGuided: true } });
    assert.deepEqual([guided.requests, guided.patches], [[], []]);
    const notGuided = startOfRound(participants, { s: { stupidGuided: false } });
    assert.equal(notGuided.requests[0].kind, 'test');
  });

  test('un allié Stupide ne guide pas : le Test est demandé sans question de guidage', () => {
    const out = startOfRound([stupid(), person('a', { traits: ['Stupid'] })]);
    assert.equal(out.requests.filter(request => request.kind === 'choice').length, 0);
    assert.equal(out.requests.filter(request => request.kind === 'test').length, 2);
  });

  test('échec : tour perdu ; réussite : rien', () => {
    const failed = startOfRound([stupid()], { s: { stupidIntelligence: { success: false, sl: -1 } } });
    assert.equal(failed.patches[0].type, 'lost-turn');
    assert.equal(failed.patches[0].cause, 'stupid');
    assert.equal(applyTraitPatches([stupid()], failed.patches)[0].extensions.v5.lostTurn.cause, 'stupid');
    assert.deepEqual(startOfRound([stupid()], { s: { stupidIntelligence: { success: true, sl: 0 } } }).patches, []);
  });

  test('Nuée et Immunité psychologique : aucune demande', () => {
    assert.deepEqual(startOfRound([stupid({ traits: ['Stupid', 'Swarm'] })]).requests, []);
    assert.deepEqual(startOfRound([stupid({ traits: ['Stupid', 'Immune to Psychology'] })]).requests, []);
  });
});

describe('Increvable (CA9, D15)', () => {
  const dead = (extra = {}) => withV5(person('d', { traits: ['Die Hard'], hp: 0, caracs: { E: 30 }, ...extra }), { dead: true, deathCause: 'wounds' });
  const started = (round = 2) => startDieHard(dead(), { round, bodyIntact: true });

  test('startDieHard : BE Rounds, total 0 ; sans la case, sans Trait ou sans Endurance : inchangé', () => {
    const record = started().extensions.v5.dieHard;
    assert.equal(record.roundsLeft, 3);
    assert.equal(record.total, 0);
    assert.equal(startDieHard(dead(), { round: 2, bodyIntact: false }).extensions.v5.dieHard, undefined);
    assert.equal(startDieHard(person('x', { hp: 0 }), { round: 2, bodyIntact: true }).extensions.v5.dieHard, undefined);
    assert.equal(startDieHard(dead({ caracs: {} }), { round: 2, bodyIntact: true }).extensions.v5.dieHard, undefined);
  });

  test('pas de demande le Round de la mort, une demande à chaque début de Round ensuite', () => {
    const body = started(2);
    assert.deepEqual(collectRoundTraitEffects({ participants: [body], phase: 'startOfRound', round: 2, turnIndex: 5 }).requests, []);
    const out = collectRoundTraitEffects({ participants: [body], phase: 'startOfRound', round: 3, turnIndex: 9 });
    assert.equal(out.requests.length, 1);
    assert.equal(out.requests[0].kind, 'test');
    assert.match(out.requests[0].label, /0\/6/);
  });

  test('constat 1 : Increvable prend le total de Résistance de la fiche, toujours sans modificateur', () => {
    const skills = [{ id: 'skill-52_e9_73_69_73_74_61_6e_63_65-base', name: 'Résistance', total: 52 }];
    const body = startDieHard(dead({ skills, states: [{ key: 'sonne', level: 2 }] }), { round: 2, bodyIntact: true });
    const target = collectRoundTraitEffects({ participants: [body], phase: 'startOfRound', round: 3, turnIndex: 9 }).requests[0].testTarget;
    assert.equal(target.score, 52);
    assert.deepEqual(target.slModifiers, []);
  });

  test('Test +0 (MJ 17/11) : les États du mort ne minorent pas le Test d\'Increvable', () => {
    const states = [{ key: 'sonne', level: 2 }, { key: 'fatigue', level: 2 }];
    const plain = testTargetOf(person('t', { states }), { characteristic: 'E', base: 30, dr: 0 });
    assert.ok(plain.slModifiers.length + plain.disadvantageSources.length > 0, 'témoin : ces États minorent un Test ordinaire');
    const body = startDieHard(dead({ states }), { round: 2, bodyIntact: true });
    const target = collectRoundTraitEffects({ participants: [body], phase: 'startOfRound', round: 3, turnIndex: 9 }).requests[0].testTarget;
    assert.equal(target.score, 30);
    assert.deepEqual(target.slModifiers, []);
    assert.deepEqual(target.advantageSources, []);
    assert.deepEqual(target.disadvantageSources, []);
  });

  test('6 DR atteints en trois Rounds : retour à 1 Blessure, mort levée', () => {
    let participants = deepFreeze([started(2)]);
    const gains = [2, 1, 3];
    const totals = [];
    gains.forEach((sl, index) => {
      const round = 3 + index;
      const out = collectRoundTraitEffects({ participants, phase: 'startOfRound', round, turnIndex: 10 * round, inputs: { d: { dieHardEndurance: { success: true, sl } } } });
      participants = deepFreeze(applyTraitPatches(participants, out.patches));
      totals.push(participants[0].extensions.v5.dieHard.total);
    });
    assert.deepEqual(totals, [2, 3, 6]);
    assert.equal(participants[0].hp, 1);
    assert.equal(participants[0].extensions.v5.dead, undefined);
    assert.equal(participants[0].extensions.v5.deathCause, undefined);
    assert.equal(participants[0].extensions.v5.dieHard.ended, 'revived');
    assert.deepEqual(collectRoundTraitEffects({ participants, phase: 'startOfRound', round: 6, turnIndex: 60 }).requests, [], 'revenu : plus de demande');
  });

  test('les échecs n\'ajoutent rien ; BE Rounds écoulés : aucune demande', () => {
    let body = started(2);
    for (let round = 3; round <= 5; round += 1) {
      const out = collectRoundTraitEffects({ participants: [body], phase: 'startOfRound', round, turnIndex: round, inputs: { d: { dieHardEndurance: { success: false, sl: -2 } } } });
      body = applyTraitPatches([body], out.patches)[0];
    }
    assert.equal(body.extensions.v5.dieHard.total, 0);
    assert.equal(body.extensions.v5.dieHard.ended, 'expired');
    assert.equal(body.hp, 0);
    assert.equal(body.extensions.v5.dead, true);
    assert.deepEqual(collectRoundTraitEffects({ participants: [body], phase: 'startOfRound', round: 6, turnIndex: 6 }).requests, []);
  });

  test('advanceDieHard : total rendu, entrée gelée intacte, Test d\'un d100 déduit de la demande', () => {
    const body = deepFreeze(started(2));
    const step = advanceDieHard(body, { round: 3, test: { success: true, sl: 2 } });
    assert.equal(step.total, 2);
    assert.equal(step.revived, false);
    assert.equal(body.extensions.v5.dieHard.total, 0);
    const request = collectRoundTraitEffects({ participants: [body], phase: 'startOfRound', round: 3, turnIndex: 9 }).requests[0];
    const viaRoll = collectRoundTraitEffects({ participants: [body], phase: 'startOfRound', round: 3, turnIndex: 9, inputs: { d: { [request.field]: 8 } } });
    assert.equal(viaRoll.patches[0].type, 'die-hard-advance');
  });

  test('un participant sans Increvable actif : aucune demande, aucun patch', () => {
    const out = collectRoundTraitEffects({ participants: [person('x'), dead()], phase: 'startOfRound', round: 4, turnIndex: 1 });
    assert.deepEqual([out.requests, out.patches], [[], []]);
  });
});

describe('Correctifs de la relecture de L2', () => {
  const dead = (extra = {}, v5 = {}) => withV5(person('d', { traits: ['Die Hard'], hp: 0, caracs: { E: 30 }, ...extra }), { dead: true, deathCause: 'wounds', ...v5 });
  const started = (round = 2, v5 = {}) => startDieHard(dead({}, v5), { round, bodyIntact: true });
  const relive = body => ({ ...body, hp: 8, extensions: { ...body.extensions, v5: { ...body.extensions.v5, dead: false } } });

  test('Increvable sur une créature revenue à la vie : aucune demande, suivi clos en « cancelled », 6 DR sans effet', () => {
    const body = relive(started(2));
    const out = collectRoundTraitEffects({ participants: [body], phase: 'startOfRound', round: 3, turnIndex: 9 });
    assert.deepEqual(out.requests, []);
    const after = applyTraitPatches([body], out.patches)[0];
    assert.equal(after.extensions.v5.dieHard.ended, 'cancelled');
    const forced = advanceDieHard(body, { round: 3, test: { success: true, sl: 6 } });
    assert.equal(forced.revived, false);
    assert.equal(forced.participant.hp, 8);
  });

  test('Increvable ne dépasse jamais BE Rounds, même après un passage hors de la zone active', () => {
    let body = started(2);
    const at = (round, participant, inputs = {}) => collectRoundTraitEffects({ participants: [participant], phase: 'startOfRound', round, turnIndex: round, inputs });
    body = applyTraitPatches([body], at(3, body, { d: { dieHardEndurance: { success: true, sl: 1 } } }).patches)[0];
    const away = { ...body, zone: 'reserve' };
    assert.deepEqual(at(4, away).requests, [], 'hors zone : pas de demande');
    const returned = { ...applyTraitPatches([away], at(4, away).patches)[0], zone: 'active' };
    assert.equal(at(5, returned).requests.length, 1, 'au Round 5, encore dans les BE Rounds');
    assert.deepEqual(at(6, returned).requests, [], 'au Round 6, les BE (3) Rounds ouverts au Round 2 sont écoulés');
    assert.equal(applyTraitPatches([returned], at(6, returned).patches)[0].extensions.v5.dieHard.ended, 'expired');
  });

  test('résurrection par Increvable : le décompte de mort critique confirmé est remis à zéro', () => {
    const countdown = { id: 'cd', status: 'confirmed', dueRound: 2, toughnessBonus: 0, criticalIds: ['w1'] };
    const body = advanceDieHard(started(2, { criticalDeath: countdown }), { round: 3, test: { success: true, sl: 6 } }).participant;
    assert.equal(body.hp, 1);
    assert.notEqual(body.extensions.v5.criticalDeath?.status, 'confirmed');
  });

  test('Stupide d\'un camp « allie » à côté d\'un PJ « pj » : question « guidé ? » ; un ennemi ne guide pas', () => {
    const stupid = person('s', { camp: 'allie', traits: ['Stupid'], caracs: { E: 30, Int: 25 } });
    assert.deepEqual(startOfRound([stupid, person('p', { camp: 'pj', kind: 'PJ' })]).requests.map(request => request.kind), ['choice']);
    assert.deepEqual(startOfRound([stupid, person('e', { camp: 'ennemi' })]).requests.map(request => request.kind), ['test']);
  });

  test('une perte de Blessures par patch fait perdre l\'Élan ; sans perte, il reste', () => {
    const fighter = person('a', { extensions: { v5: { hasMomentum: true } } });
    const [after] = applyTraitPatches([fighter], [{ type: 'wounds', participantId: 'a', amount: 2 }]);
    assert.equal(after.hp, 8);
    assert.equal(after.extensions.v5.hasMomentum, false);
    assert.equal(applyTraitPatches([fighter], [{ type: 'wounds', participantId: 'a', amount: 0 }])[0].extensions.v5.hasMomentum, true);
  });
});
