// Bénédiction de Chance (V5 p.221) : une relance gratuite du prochain Test échoué, consommée à l'usage.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getAllDivineContracts } from '../js/core/v5-divine-store.js';

const CULTS = ['myrmidia', 'morr', 'ranald', 'verena', 'handrich'];
const contracts = CULTS.map(cult => getAllDivineContracts().find(row => row.id === `divine:blessing:${cult}:fortune`));
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
  prayers: [], equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (s, id) => s.listParticipants().find(row => row.id === id);
const input = (more = {}) => ({ actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  facts: { targets: { ally: { withinRange: true, ally: true } } }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest', moment: 'afterEffects' }, ...more });
const id = 'divine:blessing:myrmidia:fortune';
async function fixture({ bless = true, fortune = 3 } = {}) {
  const s = createStore(); await s.ready;
  await s.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'ally', order: ['ally', 'priest', 'enemy'], participants: [actor('priest'), actor('ally', { initiative: 30 }), actor('enemy', { kind: 'PNJ', camp: 'ennemi' })] } });
  await s.setFortune('ally', fortune);
  if (bless) {
    const preview = s.previewDivineExecution(id, input());
    assert.equal(preview.ready, true, preview.error);
    const result = await s.applyDivineExecution(id, { preview });
    assert.equal(result.ready, true, result.error);
  }
  return s;
}
// Test de FM (score 50) : 88 est un échec, 12 une réussite.
const action = { name: 'Concentration', type: 'test', attr: 'FM', base: 50 };
const preview = (s, { roll = '88', reroll, ask = reroll !== undefined } = {}) => s.previewResolution({ actor: person(s, 'ally'), action, targetId: 'enemy', roll,
  v5: { kind: 'test', ...(ask ? { fortuneReroll: true } : {}), ...(reroll === undefined ? {} : { fortuneRerollRoll: reroll }) } });
const remaining = s => (person(s, 'ally').extensions?.v5?.divineEffects || []).reduce((sum, layer) => sum + (layer.freeReroll?.remaining || 0), 0);

test('Chance : les cinq contrats portent l’effet free-reroll, implémenté, clause moteur', () => {
  assert.equal(contracts.length, 5);
  for (const row of contracts) {
    assert.ok(row, 'contrat présent');
    assert.equal(row.status, 'implemented', row.id);
    assert.deepEqual(row.effects.map(effect => effect.type), ['free-reroll'], row.id);
    assert.equal(row.effects[0].duration.unit, 'rounds');
    assert.equal(row.clauses.find(clause => clause.id === 'effect').mode, 'engine', row.id);
    assert.match(row.labels.effect, /échou/, row.id);
  }
  assert.equal(contracts[4].source.document, 'Archives of the Empire 3.pdf');
  assert.equal(contracts[4].source.printedPage, 47);
});

test('Chance : relance d’un Test raté gratuite, solde inchangé, couche consommée', async () => {
  const s = await fixture();
  assert.equal(remaining(s), 1);
  const apercu = preview(s, { reroll: 24 });
  assert.equal(apercu.success, true);
  assert.equal(apercu.fortuneReroll.free, true);
  assert.match(apercu.fortuneReroll.reminder, /Bénédiction de Chance : relance gratuite/);
  assert.equal(apercu.actionCosts.paid.some(c => c.resource === 'fortune'), false);
  assert.equal(remaining(s), 1, 'l’aperçu ne consomme rien');
  const result = await s.applyResolution(apercu);
  assert.equal(result.status, 'applied');
  assert.equal(s.getFortune('ally').balance, 3);
  assert.equal(remaining(s), 0);
});

test('Chance : la deuxième relance coûte 1 Point de Chance', async () => {
  const s = await fixture();
  await s.applyResolution(preview(s, { reroll: 24 }));
  const second = preview(s, { reroll: 30 });
  assert.equal(second.fortuneReroll.free, undefined);
  assert.ok(second.actionCosts.paid.some(c => c.resource === 'fortune' && c.amount === 1));
  await s.applyResolution(second);
  assert.equal(s.getFortune('ally').balance, 2);
});

test('Chance : relancer un Test réussi coûte 1 Point de Chance et ne consomme pas la couche', async () => {
  const s = await fixture();
  const apercu = preview(s, { roll: '12', reroll: 40 });
  assert.equal(apercu.fortuneReroll.free, undefined);
  assert.ok(apercu.actionCosts.paid.some(c => c.resource === 'fortune' && c.amount === 1));
  await s.applyResolution(apercu);
  assert.equal(s.getFortune('ally').balance, 2);
  assert.equal(remaining(s), 1);
});

test('Chance : sans jet de relance saisi, l’aperçu annonce déjà la gratuité', async () => {
  const s = await fixture();
  const demande = preview(s, { ask: true });
  assert.equal(demande.fortuneReroll.free, true);
  assert.equal(demande.fortuneReroll.used, false);
});

test('Chance : Undo restitue la relance gratuite, Redo la consomme de nouveau', async () => {
  const s = await fixture();
  await s.applyResolution(preview(s, { reroll: 24 }));
  assert.equal(remaining(s), 0);
  await s.undo();
  assert.equal(remaining(s), 1);
  assert.equal(s.getFortune('ally').balance, 3);
  await s.redo();
  assert.equal(remaining(s), 0);
  assert.equal(s.getFortune('ally').balance, 3);
});

test('Chance : à l’expiration (6 Rounds) la relance gratuite disparaît', async () => {
  const s = await fixture();
  for (let i = 0; i < 18; i++) await s.nextTurn();
  assert.equal((person(s, 'ally').extensions?.v5?.divineEffects || []).length, 0);
  const apercu = preview(s, { reroll: 24 });
  assert.equal(apercu.fortuneReroll.free, undefined);
  assert.ok(apercu.actionCosts.paid.some(c => c.resource === 'fortune' && c.amount === 1));
});

test('Chance : sans bénédiction, la relance coûte 1 Point de Chance comme avant', async () => {
  const s = await fixture({ bless: false });
  const apercu = preview(s, { reroll: 24 });
  assert.equal(apercu.fortuneReroll.free, undefined);
  assert.equal(apercu.fortuneReroll.reminder, undefined);
  await s.applyResolution(apercu);
  assert.equal(s.getFortune('ally').balance, 2);
});

test('Chance : le prêtre peut réinvoquer la bénédiction une fois la précédente expirée (pas de garde de Chance temporaire)', async () => {
  const s = await fixture();
  await s.applyResolution(preview(s, { reroll: 24 }));
  for (let i = 0; i < 18; i++) await s.nextTurn();
  const again = s.previewDivineExecution(id, input({ expiry: { phase: 'endOfTurn', round: 12, actorId: 'priest', moment: 'afterEffects' } }));
  assert.equal(again.ready, true, again.error);
});

test('D3 (contrôle indépendant) : avec la bénédiction, un jet initial absent ou invalide ne lève pas d’erreur ; la relance reste payante', async () => {
  const s = await fixture();
  for (const roll of [null, '', 'abc', '0', '101']) {
    const apercu = preview(s, { roll, reroll: 24 });
    assert.notEqual(apercu.fortuneReroll?.free, true, `jet initial ${JSON.stringify(roll)} : gratuité impossible à établir`);
    assert.ok(apercu.actionCosts.paid.some(c => c.resource === 'fortune' && c.amount === 1), `jet initial ${JSON.stringify(roll)} : relance payante`);
  }
  assert.equal(remaining(s), 1, 'la relance gratuite reste disponible');
});
