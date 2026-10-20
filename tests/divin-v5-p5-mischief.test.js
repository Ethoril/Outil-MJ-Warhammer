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

test('Malice de Ranald : CC et Int du prêtre égalées à celles de l’adversaire, figées ; fin de prière et Undo', async () => {
  const s = await fixture();
  const preview = s.previewDivineExecution(MISCHIEF, request(['CC', 'Int']));
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  assert.equal(person(s, 'priest').caracs.CC, 40, 'l’aperçu ne modifie rien');
  const result = await s.applyDivineExecution(MISCHIEF, { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(person(s, 'priest').caracs.CC, 70);
  assert.equal(person(s, 'priest').caracs.Int, 30, 'égalée même à la baisse (texte littéral)');
  assert.equal(person(s, 'priest').caracs.Soc, 60, 'autres Caractéristiques inchangées');
  assert.equal(person(s, 'foe').caracs.CC, 70, 'l’adversaire ne change pas');
  await s.endDivinePrayer(result.receipt.executionId, { reason: 'fin' });
  assert.equal(person(s, 'priest').caracs.CC, 40);
  assert.equal(person(s, 'priest').caracs.Int, 50);
  await s.undo();
  assert.equal(person(s, 'priest').caracs.CC, 70, 'Undo rétablit la prière');
});
