import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';

// P5 — Écraser les faibles (Ulric, Power Behind the Throne Companion) : « Une fois par Round, vous pouvez relancer une attaque ratée. »
// Modèle retenu : relance gratuite (sans Point de Chance) d'un Test d'ATTAQUE raté, rechargée à chaque Round, pendant la durée.
// Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const CRUSH = 'divine:miracle:ulric:crush-the-weak';
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Ulric' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ulric' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (s, id) => s.listParticipants().find(row => row.id === id);
async function fixture() {
  const s = createStore(); await s.ready;
  await s.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'priest', order: ['priest', 'enemy'], participants: [actor('priest'), actor('enemy', { kind: 'PNJ', camp: 'ennemi', initiative: 30, talents: [], prayers: [] })] } });
  await s.setFortune('priest', 3);
  const preview = s.previewDivineExecution(CRUSH, { actorId: 'priest', targetIds: ['priest'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    facts: { targets: { priest: { withinRange: true, withinTouch: true } } }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await s.applyDivineExecution(CRUSH, { preview });
  assert.equal(result.ready, true, result.error);
  return s;
}
// Attaque de CC 40 : 88 est un échec, 24 une réussite ; la défense de l'ennemi (82) échoue.
const attack = (s, { roll = '88', reroll = 24, id = 'a' } = {}) => s.previewResolution({ resolutionId: id, actor: person(s, 'priest'), actorId: 'priest', targetId: 'enemy', roll,
  action: { type: 'attack', base: 40, attr: 'CC', damage: 3 }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } },
  v5: { kind: 'melee', fortuneReroll: true, fortuneRerollRoll: reroll } });
const fmTest = s => s.previewResolution({ actor: person(s, 'priest'), action: { name: 'Concentration', type: 'test', attr: 'FM', base: 50 }, targetId: 'enemy', roll: '88',
  v5: { kind: 'test', fortuneReroll: true, fortuneRerollRoll: 12 } });
const paidFortune = preview => preview.actionCosts.paid.some(c => c.resource === 'fortune' && c.amount === 1);

test('Écraser les faibles : le contrat n’est plus manuel et porte une relance gratuite par Round', () => {
  const contract = getDivineContract(CRUSH);
  assert.notEqual(contract.status, 'manual');
  assert.deepEqual(contract.effects.map(effect => effect.type), ['free-reroll']);
});

test('Écraser les faibles : relance gratuite d’une attaque ratée, une seule par Round, rechargée au Round suivant ; Undo', async () => {
  const s = await fixture();
  const first = attack(s);
  assert.equal(first.fortuneReroll?.free, true, 'première relance d’attaque gratuite');
  assert.equal(paidFortune(first), false);
  assert.equal((await s.applyResolution(first)).status, 'applied');
  assert.equal(s.getFortune('priest').balance, 3);
  const second = attack(s, { id: 'b' });
  assert.equal(second.fortuneReroll?.free, undefined, 'deuxième relance du même Round payante');
  assert.ok(paidFortune(second));
  await s.nextTurn(); await s.nextTurn();
  assert.equal(attack(s, { id: 'c' }).fortuneReroll?.free, true, 'rechargée au Round suivant');
  await s.undo(); await s.undo();
  assert.equal(attack(s, { id: 'd' }).fortuneReroll?.free, undefined, 'Undo revient au Round 1, relance déjà utilisée');
});

test('Écraser les faibles : un Test qui n’est pas une attaque reste payant ; une attaque réussie relancée reste payante', async () => {
  const s = await fixture();
  const fm = fmTest(s);
  assert.equal(fm.fortuneReroll?.free, undefined);
  assert.ok(paidFortune(fm));
  const hit = attack(s, { roll: '24', reroll: 30 });
  assert.equal(hit.fortuneReroll?.free, undefined);
});
