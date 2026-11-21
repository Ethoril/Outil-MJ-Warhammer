import { test } from 'node:test';
import assert from 'node:assert/strict';
import { friseModel, actorOutOfTurn, friseLabel } from '../../../js/ui/combat-frise.js';

// Refonte de l'interface, lot E1 (CA4, CA5) : modèle pur de la frise d'initiative.
const person = (id, name, extra = {}) => ({ id, name, kind: 'Créature', hp: 10, maxHp: 10, zone: 'active', extensions: {}, states: [], ...extra });
const ctx = (active, { currentActorId = null, round = 0, actor = null, target = null, decisions } = {}) => ({
  active,
  combat: { round, currentActorId },
  started: round > 0 && Boolean(active.find(row => row.id === currentActorId)),
  turnActor: active.find(row => row.id === currentActorId) || null,
  actor, target, camp: row => (row.kind === 'PJ' ? 'pj' : 'ennemi'),
  ...(decisions ? { decisions } : {})
});

const six = () => [
  person('a', 'Elysia', { kind: 'PJ', hp: 14, maxHp: 14 }),
  person('b', 'Gor 1', { hp: 9, maxHp: 11 }),
  person('c', 'Gor 2', { hp: 0, maxHp: 11 }),
  person('d', 'Bhelgi', { kind: 'PJ', extensions: { v5: { hasMomentum: true } } }),
  person('e', 'Guzgog'),
  person('f', 'Cheval', { extensions: { v5: { mountOf: 'd' } } })
];

test('ordre du round : rang 1..n dans l’ordre reçu, avant le round 1 personne n’a le tour ni n’a joué', () => {
  const model = friseModel(ctx(six()));
  assert.deepEqual(model.map(row => [row.id, row.rang]), [['a', 1], ['b', 2], ['c', 3], ['d', 4], ['e', 5], ['f', 6]]);
  assert.ok(model.every(row => !row.tour && !row.joue));
});

test('tour : celui dont c’est le tour est marqué, ceux qui précèdent ont joué, ceux qui suivent non', () => {
  const model = friseModel(ctx(six(), { round: 2, currentActorId: 'd' }));
  assert.deepEqual(model.filter(row => row.tour).map(row => row.id), ['d']);
  assert.deepEqual(model.filter(row => row.joue).map(row => row.id), ['a', 'b', 'c']);
  assert.equal(model.find(row => row.id === 'd').joue, false, 'celui qui joue n’est pas « atténué »');
});

test('mort : PV à zéro ou moins, ou état Mort ; grisé même s’il a le tour', () => {
  const model = friseModel(ctx([...six(), person('g', 'Ungor', { hp: 5, states: [{ key: 'dead', name: 'Mort' }] }), person('h', 'Sonné', { hp: -3 })]));
  assert.deepEqual(model.filter(row => row.mort).map(row => row.id), ['c', 'g', 'h']);
});

test('PV : valeur courante et maximum recopiés, jamais d’invention quand le maximum manque', () => {
  const model = friseModel(ctx([person('x', 'Sans max', { hp: 7, maxHp: undefined })]));
  assert.deepEqual([model[0].pv, model[0].pvMax], [7, 7]);
  const entier = friseModel(ctx(six()));
  assert.deepEqual([entier[1].pv, entier[1].pvMax], [9, 11]);
});

test('Élan : lu sur extensions.v5.hasMomentum, absence = faux', () => {
  const model = friseModel(ctx(six()));
  assert.deepEqual(model.filter(row => row.elan).map(row => row.id), ['d']);
});

test('monture : monté sur X, monture de Y, ou rien', () => {
  const people = [
    person('r', 'Erich', { kind: 'PJ', extensions: { v5: { mounted: true, mountId: 'm' } } }),
    person('m', 'Destrier', { extensions: { v5: { mountOf: 'r' } } }),
    person('p', 'À pied', { kind: 'PJ', extensions: { v5: { mounted: false, ownMountId: 'z' } } }),
    person('n', 'Simple')
  ];
  const model = friseModel(ctx(people));
  assert.deepEqual(model.map(row => row.monture), ['Monté sur Destrier', 'Monture de Erich', null, null]);
});

test('décision en attente : lue sur context.decisions (participantId), absente = aucune marque', () => {
  assert.ok(friseModel(ctx(six())).every(row => row.decision === 0));
  const model = friseModel(ctx(six(), { decisions: [{ participantId: 'c', id: 1 }, { participantId: 'c', id: 2 }, { participantId: 'e', id: 3 }, { participantId: null }] }));
  assert.deepEqual(model.filter(row => row.decision).map(row => [row.id, row.decision]), [['c', 2], ['e', 1]]);
});

test('agit : celui qui agit est repéré, distinct de celui dont c’est le tour (clic sur la frise, CA5)', () => {
  const people = six();
  const model = friseModel(ctx(people, { round: 1, currentActorId: 'b', actor: people[4] }));
  assert.deepEqual(model.filter(row => row.agit).map(row => row.id), ['e']);
  assert.deepEqual(model.filter(row => row.tour).map(row => row.id), ['b']);
});

test('actorOutOfTurn : seulement quand le combat a commencé et que l’acteur n’est pas celui du tour', () => {
  const people = six();
  assert.deepEqual(actorOutOfTurn(ctx(people, { round: 1, currentActorId: 'b', actor: people[4] })), { actorId: 'e', name: 'Guzgog', turnActorId: 'b', round: 1 });
  assert.equal(actorOutOfTurn(ctx(people, { round: 1, currentActorId: 'b', actor: people[1] })), null);
  assert.equal(actorOutOfTurn(ctx(people, { round: 0, currentActorId: null, actor: people[4] })), null, 'combat pas commencé');
  assert.equal(actorOutOfTurn(ctx(people, { round: 1, currentActorId: 'b', actor: null })), null);
});

test('libellé accessible du portrait : rang, nom, PV, et chaque marque en toutes lettres', () => {
  const people = six();
  const model = friseModel(ctx(people, { round: 1, currentActorId: 'd', decisions: [{ participantId: 'd' }] }));
  const label = friseLabel(model.find(row => row.id === 'd'));
  assert.match(label, /^4\. Bhelgi/);
  assert.match(label, /au tour de/);
  assert.match(label, /Élan/);
  assert.match(label, /1 décision en attente/);
  assert.match(friseLabel(model.find(row => row.id === 'c')), /hors de combat/);
  assert.match(friseLabel(model.find(row => row.id === 'a')), /a joué/);
});
