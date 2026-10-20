import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';

// P5 — Malice de Ranald (Deft Steps, p.24) : deux Caractéristiques DU PRÊTRE sont égalées à celles de l’adversaire ciblé
// (tirées au d10 : 1-2 CC, 3-4 I, 5-6 Int, 7-8 Soc, 9-0 au choix ; le MJ saisit les deux retenues). Valeurs figées au lancement,
// retirées à la fin de la prière. Critère d’acceptation écrit avant l’implémentation (doit échouer avant).
const MISCHIEF = 'divine:miracle:ranald:ranald-s-mischief';
const actor = (id, caracs, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'foe' ? 'ennemi' : 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4, ...caracs },
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Ranald' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ranald' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (s, id) => s.listParticipants().find(row => row.id === id);
async function fixture() {
  const s = createStore(); await s.ready;
  await s.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'priest', order: ['priest', 'foe'], participants: [actor('priest', {}), actor('foe', { CC: 70, Int: 30, Soc: 25 }, { initiative: 30 })] } });
  return s;
}
const request = (characteristics) => ({ actorId: 'priest', targetIds: ['foe'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  facts: { targets: { foe: { withinRange: true } } }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' },
  ...(characteristics ? { characteristicMatch: { first: characteristics[0], second: characteristics[1] } } : {}) });

test('Malice de Ranald : le contrat n’est plus manuel', () => {
  assert.notEqual(getDivineContract(MISCHIEF).status, 'manual');
});

test('Malice de Ranald : sans les deux Caractéristiques saisies, l’aperçu les demande ; choix invalides refusés', async () => {
  const s = await fixture();
  assert.equal(s.previewDivineExecution(MISCHIEF, request()).ready, false);
  assert.equal(s.previewDivineExecution(MISCHIEF, request(['CC'])).ready, false, 'deux Caractéristiques exigées');
  assert.equal(s.previewDivineExecution(MISCHIEF, request(['CC', 'CC'])).ready, false, 'pas de doublon');
  assert.equal(s.previewDivineExecution(MISCHIEF, request(['CC', 'F'])).ready, true, '9-0 au choix : toute Caractéristique');
});

// Règle complète fournie par le MJ (20 oct.) : « lors de tout Test opposé réalisé spécifiquement contre cet adversaire, deux de vos
// caractéristiques prennent temporairement la même valeur que les siennes ». La fiche ne change pas ; le score du Test opposé est décalé
// de l’écart (adversaire − prêtre) sur la Caractéristique concernée, valeurs lues au moment du Test.
const attack = (s, actorId, targetId, base, id) => s.previewResolution({ resolutionId: id, actorId, targetId, roll: 45,
  action: { type: 'attack', base, attr: 'CC', damage: 3 }, defense: { base: 60, attr: 'CC', roll: 50, v5: { kind: 'melee' } }, v5: { kind: 'melee' } });
test('Malice de Ranald : seulement dans les Tests opposés contre l’adversaire ciblé ; fiche inchangée ; fin et Undo', async () => {
  const s = await fixture();
  const state = JSON.parse(s.getFullJSON());
  state.combat.participants.push({ ...state.combat.participants.find(p => p.id === 'foe'), id: 'foe2', name: 'foe2' }); state.combat.order.push('foe2');
  await s.loadFromJSON(state);
  const preview = s.previewDivineExecution(MISCHIEF, request(['CC', 'Int']));
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await s.applyDivineExecution(MISCHIEF, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(person(s, 'priest').caracs.CC, 40, 'fiche du prêtre inchangée');
  assert.equal(attack(s, 'priest', 'foe', 40, 'a1').test.score, 70, 'attaque contre l’adversaire : CC égalée (40 → 70)');
  assert.equal(attack(s, 'priest', 'foe2', 40, 'a2').test.score, 40, 'autre adversaire : inchangé');
  assert.equal(attack(s, 'foe', 'priest', 60, 'd1').defenderTest.score, 90, 'défense contre l’adversaire : 60 + (70 − 40)');
  assert.equal(attack(s, 'foe2', 'priest', 60, 'd2').defenderTest.score, 60, 'défense contre un autre : inchangée');
  assert.equal(attack(s, 'foe', 'priest', 60, 'd3').test.score, 60, 'le Test de l’adversaire lui-même ne change pas');
  await s.endDivinePrayer(result.receipt.executionId, { reason: 'fin' });
  assert.equal(attack(s, 'priest', 'foe', 40, 'a3').test.score, 40, 'fin de prière');
  await s.undo();
  assert.equal(attack(s, 'priest', 'foe', 40, 'a4').test.score, 70, 'Undo rétablit la prière');
});
