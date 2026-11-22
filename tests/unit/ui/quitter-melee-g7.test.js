import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectDecisions, leaveMeleeId, leftMelee, leaveMeleeEntry, leaveMeleeRemaining } from '../../../js/ui/combat-decisions.js';

// Passe G, lot G7 (R4, p. 163) : quitter une mêlée par un déplacement du MJ pose une décision « À décider »
// (Se désengager / Fuir / Sans règle) ; un déplacement qui ne quitte rien ne crée rien ; elle se retire d'elle-même.
const person = (id, name, extra = {}) => ({ id, name, kind: 'PNJ', zone: 'active', hp: 10, states: [], extensions: { v5: {} }, ...extra });
const quietStore = () => ({ isSuddenDeathEnabled: () => false, getActiveScene: () => null });

test('G7-a · ce qui est quitté : les adversaires engagés avant et plus après', () => {
  assert.deepEqual(leftMelee(['b', 'c'], []), ['b', 'c']);
  assert.deepEqual(leftMelee(['b', 'c'], ['c']), ['b']);
  assert.deepEqual(leftMelee(['b'], ['b', 'd']), [], 'engagé en plus : rien n’est quitté (G7-b)');
  assert.deepEqual(leftMelee([], []), [], 'libre avant : rien à quitter (G7-b)');
});

test('G7-a · la décision « X quitte la mêlée de Y » propose Se désengager, Fuir, Sans règle', () => {
  const calls = [];
  const entry = leaveMeleeEntry({ mover: person('g', 'Gor 1'), foes: [person('e', 'Erich'), person('j', 'Jorunn')], onChoose: key => calls.push(key) });
  assert.equal(entry.id, leaveMeleeId('g'));
  assert.equal(entry.kind, 'fuite');
  assert.equal(entry.participantId, 'g');
  assert.equal(entry.titre, 'Gor 1 quitte la mêlée de Erich, Jorunn');
  assert.deepEqual(entry.options.map(row => row.key), ['disengage', 'flee', 'none']);
  assert.deepEqual(entry.options.map(row => row.label), ['Se désengager', 'Fuir', 'Sans règle']);
  assert.ok(entry.options.every(row => row.label.length <= 20), 'libellés courts');
  entry.onChoose('flee');
  assert.deepEqual(calls, ['flee']);
});

test('G7-a · la décision apparaît dans la case « À décider » (questions publiées)', () => {
  const entry = leaveMeleeEntry({ mover: person('g', 'Gor 1'), foes: [person('e', 'Erich')], onChoose() {} });
  const list = collectDecisions({ participants: [person('g', 'Gor 1'), person('e', 'Erich')], requests: [entry] }, quietStore());
  assert.equal(list.filter(row => row.kind === 'fuite' && row.id === 'quitte:g').length, 1);
});

test('G7-b · la décision se retire si le combattant est réengagé avec les mêmes adversaires ou retiré', () => {
  const people = [person('g', 'Gor 1'), person('e', 'Erich'), person('j', 'Jorunn')];
  assert.deepEqual(leaveMeleeRemaining({ moverId: 'g', foeIds: ['e', 'j'] }, people, []), ['e', 'j'], 'toujours libre : on attend');
  assert.deepEqual(leaveMeleeRemaining({ moverId: 'g', foeIds: ['e', 'j'] }, people, ['e']), ['j'], 'réengagé avec Erich seulement : reste Jorunn');
  assert.equal(leaveMeleeRemaining({ moverId: 'g', foeIds: ['e', 'j'] }, people, ['e', 'j']), null, 'réengagé avec les mêmes : retirée');
  assert.equal(leaveMeleeRemaining({ moverId: 'g', foeIds: ['e'] }, people.map(row => (row.id === 'g' ? { ...row, zone: 'bench' } : row)), []), null, 'retiré du combat : retirée');
  assert.equal(leaveMeleeRemaining({ moverId: 'g', foeIds: ['e'] }, people.filter(row => row.id !== 'g'), []), null, 'absent : retirée');
  assert.equal(leaveMeleeRemaining({ moverId: 'g', foeIds: ['e'] }, people.filter(row => row.id !== 'e'), []), null, 'l’adversaire est parti : plus rien à régler');
});
