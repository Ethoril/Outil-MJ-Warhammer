import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';

// P5 — Fortune généreuse (Ranald) : les alliés ciblés peuvent inverser les dés de pourcentage à leur PROCHAIN Test (82 devient 28) ;
// faveur perdue si elle n’est pas utilisée dans la durée. Modèle : couche à usage unique, consommée quand l’allié demande l’inversion
// (`v5.reverseDice: true`). Critère d’acceptation écrit avant l’implémentation (doit échouer avant).
const BOUNTIFUL = 'divine:miracle:ranald:bountiful-fortune';
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Ranald' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ranald' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (s, id) => s.listParticipants().find(row => row.id === id);
async function fixture() {
  const s = createStore(); await s.ready;
  await s.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'enemy'], participants: [actor('priest'), actor('ally', { initiative: 30 }), actor('enemy', { kind: 'PNJ', camp: 'ennemi', initiative: 10 })] } });
  const preview = s.previewDivineExecution(BOUNTIFUL, { actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    facts: { targets: { ally: { withinRange: true, ally: true } } }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await s.applyDivineExecution(BOUNTIFUL, { preview });
  assert.equal(result.ready, true, result.error);
  return { s, result };
}
// Test de FM (score 50) : 82 échoue, inversé en 28 il réussit.
const fmTest = (s, who, reverse) => s.previewResolution({ actor: person(s, who), action: { name: 'Concentration', type: 'test', attr: 'FM', base: 50 }, targetId: 'enemy', roll: '82',
  v5: { kind: 'test', ...(reverse ? { reverseDice: true } : {}) } });
const layers = (s, who) => (person(s, who).extensions?.v5?.divineEffects || []).filter(row => row.reverseDice?.remaining > 0).length;

test('Fortune généreuse : le contrat n’est plus manuel', () => {
  assert.notEqual(getDivineContract(BOUNTIFUL).status, 'manual');
});

test('Fortune généreuse : 82 inversé en 28 au prochain Test demandé, une seule fois ; Undo', async () => {
  const { s } = await fixture();
  assert.equal(fmTest(s, 'ally', false).success, false, 'sans demande, le jet reste 82');
  assert.equal(layers(s, 'ally'), 1, 'un aperçu ne consomme rien');
  const reversed = fmTest(s, 'ally', true);
  assert.equal(reversed.success, true, '82 devient 28');
  assert.equal((await s.applyResolution(reversed)).status, 'applied');
  assert.equal(layers(s, 'ally'), 0, 'faveur consommée');
  assert.equal(fmTest(s, 'ally', true).success, false, 'deuxième demande : plus d’inversion');
  await s.undo();
  assert.equal(layers(s, 'ally'), 1, 'Undo restitue la faveur');
});

test('Fortune généreuse : un participant non béni ne peut pas inverser ; fin de prière retire la faveur', async () => {
  const { s, result } = await fixture();
  assert.equal(fmTest(s, 'priest', true).success, false, 'le prêtre n’est pas ciblé');
  await s.endDivinePrayer(result.receipt.executionId, { reason: 'fin' });
  assert.equal(fmTest(s, 'ally', true).success, false);
});
