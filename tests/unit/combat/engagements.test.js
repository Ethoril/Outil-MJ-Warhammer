import test from 'node:test';
import assert from 'node:assert/strict';
import { listEngagements, engagedWith, meleeGroups, withEngagement, withoutEngagements, expireEngagements, deriveEngagementContext, previewDisengage, bestMeleeScore } from '../../../js/core/engagements.js';

// Engagements durables (spec docs/specs/engagements, V5 p. 163, 166-167).
const fighter = (id, camp, extra = {}) => ({ id, name: id, kind: camp === 'ennemi' ? 'PNJ' : 'PJ', camp, zone: 'active', hp: 10, maxHp: 10,
  caracs: { CC: 40, Ag: 35 }, skills: [], states: [], extensions: { v5: {} }, ...extra });
const people = () => [fighter('gunther', 'pj'), fighter('aldric', 'pj'), fighter('elsa', 'pj'), fighter('orc', 'ennemi', { skills: [{ name: 'Corps à corps (Base)', total: 55 }] }), fighter('gob', 'ennemi'), fighter('archer', 'ennemi')];
const engaged = (...pairs) => pairs.reduce((combat, [a, b, round = 1]) => withEngagement(combat, a, b, round), { round: 1, participants: people() });

test('paires : création, normalisation, rafraîchissement, retrait', () => {
  let combat = engaged(['orc', 'gunther'], ['gunther', 'orc', 2]);
  assert.deepEqual(listEngagements(combat), [{ a: 'gunther', b: 'orc', since: 1, lastAttackRound: 2 }]);
  combat = withEngagement(combat, 'aldric', 'orc', 2);
  assert.deepEqual(engagedWith(combat, people(), 'orc').sort(), ['aldric', 'gunther']);
  combat = withoutEngagements(combat, 'orc', ['aldric']);
  assert.deepEqual(engagedWith(combat, people(), 'orc'), ['gunther']);
  assert.deepEqual(listEngagements(withoutEngagements(combat, 'gunther')), []);
  assert.equal(withEngagement(combat, 'orc', 'orc', 1), combat, 'pas de paire réflexive');
});

test('mêlées : composantes connexes ; un combattant hors combat ne compte pas (CA8)', () => {
  const combat = engaged(['gunther', 'orc'], ['aldric', 'orc'], ['gob', 'elsa']);
  assert.deepEqual(meleeGroups(combat, people()).map(group => group.ids), [['gunther', 'aldric', 'orc'], ['elsa', 'gob']]);
  const benched = people().map(person => (person.id === 'gob' ? { ...person, zone: 'bench' } : person.id === 'orc' ? { ...person, states: [{ key: 'inconscient' }] } : person));
  assert.deepEqual(meleeGroups(combat, benched), []);
  assert.deepEqual(engagedWith(combat, benched, 'gunther'), []);
});

test('fin de Round : une paire sans attaque pendant le Round complet cesse ; les hors-combat sont purgés (CA7)', () => {
  const combat = engaged(['gunther', 'orc', 1], ['aldric', 'orc', 2], ['elsa', 'gob', 2]);
  const crowd = people().map(person => (person.id === 'gob' ? { ...person, hp: 0 } : person));
  const { combat: after, expired } = expireEngagements(combat, crowd, 2);
  assert.deepEqual(listEngagements(after).map(row => row.a + '-' + row.b), ['aldric-orc']);
  assert.deepEqual(expired.map(row => row.a + '-' + row.b + ':' + row.reason).sort(), ['elsa-gob:out-of-combat', 'gunther-orc:no-attack']);
});

test('déduction mêlée : surnombre depuis les paires (CA15)', () => {
  const combat = engaged(['gunther', 'orc'], ['aldric', 'orc'], ['elsa', 'gob']);
  assert.deepEqual(deriveEngagementContext({ combat, participants: people(), actorId: 'gunther', targetId: 'orc', kind: 'melee' }),
    { outnumberAttackerIds: ['aldric'], outnumberDefenderIds: [], surrounded: false });
  const busy = withEngagement(combat, 'gob', 'gunther', 1);
  assert.deepEqual(deriveEngagementContext({ combat: busy, participants: people(), actorId: 'gunther', targetId: 'orc', kind: 'melee' }).outnumberDefenderIds, ['gob'],
    'un allié de la cible engagé avec un des attaquants compte côté défense');
});

test('déduction tir : cible engagée avec un tiers, tireur engagé, candidats de déviation (CA16)', () => {
  const combat = engaged(['gunther', 'orc'], ['aldric', 'orc']);
  assert.deepEqual(deriveEngagementContext({ combat, participants: people(), actorId: 'elsa', targetId: 'orc', kind: 'ranged' }),
    { targetEngaged: true, engagedWithShooter: false, engagedTargetIds: ['orc', 'gunther', 'aldric'], shooterEngagedElsewhere: false });
  const melee = withEngagement(combat, 'elsa', 'archer', 1);
  const shot = deriveEngagementContext({ combat: melee, participants: people(), actorId: 'elsa', targetId: 'archer', kind: 'ranged' });
  assert.equal(shot.engagedWithShooter, true);
  assert.equal(shot.targetEngaged, false);
  assert.equal(deriveEngagementContext({ combat: melee, participants: people(), actorId: 'elsa', targetId: 'orc', kind: 'ranged' }).shooterEngagedElsewhere, true);
});

test('Désengagement : Élan, En Bon Ordre, encerclé, Test opposé avec Désavantage en infériorité (CA12)', () => {
  const combat = engaged(['gunther', 'orc'], ['gunther', 'gob']);
  const crowd = people();
  assert.equal(previewDisengage({ combat, participants: crowd, actorId: 'elsa' }).status, 'blocked');
  const withMomentum = crowd.map(person => (person.id === 'gunther' ? { ...person, extensions: { v5: { hasMomentum: true } } } : person));
  assert.equal(previewDisengage({ combat, participants: withMomentum, actorId: 'gunther' }).mode, 'momentum');
  const orderly = crowd.map(person => (person.id === 'gunther' ? { ...person, extensions: { v5: { specialStates: { orderlyDisengage: true } } } } : person));
  assert.deepEqual([previewDisengage({ combat, participants: orderly, actorId: 'gunther' }).mode, previewDisengage({ combat, participants: orderly, actorId: 'gunther' }).success], ['orderly', true]);
  const surrounded = crowd.map(person => (person.id === 'gunther' ? { ...person, extensions: { v5: { position: { surrounded: true } } } } : person));
  assert.equal(previewDisengage({ combat, participants: surrounded, actorId: 'gunther' }).mode, 'surrounded');
  assert.notEqual(previewDisengage({ combat, participants: surrounded, actorId: 'gunther', input: { force: true } }).status, 'blocked');
  const pending = previewDisengage({ combat, participants: crowd, actorId: 'gunther' });
  assert.deepEqual([pending.status, pending.bestOpponentId, pending.opponentScore, pending.actorScore, pending.outnumbered], ['needs-rolls', 'orc', 55, 35, true]);
  // Désavantage : 12 devient 21 (inversion forcée) ; 21 contre 35 = +1 DR ; l'Orc fait 50 contre 55 = +0 DR → réussite.
  const won = previewDisengage({ combat, participants: crowd, actorId: 'gunther', input: { actorRoll: 12, opponentRoll: 50 } });
  assert.deepEqual([won.status, won.success, won.actorSl, won.opponentSl], ['ready', true, 1, 0]);
  const lost = previewDisengage({ combat, participants: crowd, actorId: 'gunther', input: { actorRoll: 90, opponentRoll: 10 } });
  assert.equal(lost.success, false);
});

test('meilleure Mêlée : compétence de Corps à corps, sinon CC', () => {
  assert.equal(bestMeleeScore(fighter('x', 'pj', { skills: [{ name: 'Corps à corps (Base)', total: 48 }, { name: 'Corps à corps (Escrime)', total: 52 }] })), 52);
  assert.equal(bestMeleeScore(fighter('y', 'pj')), 40);
});
