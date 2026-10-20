// P5 — Interactions entre faveurs divines sur un même participant (agnostique du culte) :
//  - Bénédiction de Chance (V5 p.221) : une relance gratuite du prochain Test échoué ;
//  - Écraser les faibles (Ulric) : une relance gratuite d'une ATTAQUE ratée par Round ;
//  - Fortune généreuse (Ranald) : inversion des dés de pourcentage au prochain Test demandé (`v5.reverseDice: true`).
// Le participant « hero » porte les couches : Écraser les faibles invoqué sur lui-même, Chance et Fortune généreuse
// reçues de deux autres prêtres (les bénédictions/miracles ciblent un allié, pas le lanceur).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getAllDivineContracts } from '../js/core/v5-divine-store.js';

const CRUSH = 'divine:miracle:ulric:crush-the-weak';
const FORTUNE = 'divine:blessing:myrmidia:fortune';
const BOUNTIFUL = 'divine:miracle:ranald:bountiful-fortune';
const miracles = getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' }));
const actor = (id, talents, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents, prayers: miracles, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const T = {
  hero: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Ulric' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ulric' }],
  myr: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
  ran: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Ranald' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ranald' }],
};
const person = (s, id) => s.listParticipants().find(row => row.id === id);
async function fixture({ crush = true, fortune = true, bountiful = true } = {}) {
  const s = createStore(); await s.ready;
  await s.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'hero', order: ['hero', 'myr', 'ran', 'enemy'],
      participants: [actor('hero', T.hero), actor('myr', T.myr, { initiative: 50 }), actor('ran', T.ran, { initiative: 40 }),
        actor('enemy', [], { kind: 'PNJ', camp: 'ennemi', initiative: 30, talents: [], prayers: [] })] } });
  await s.setFortune('hero', 3);
  const invoke = async (id, actorId) => {
    const preview = s.previewDivineExecution(id, { actorId, targetIds: ['hero'], roll: 45, canSpeak: true,
      choices: { range: 0, targets: 0, duration: 0, effect: 0 },
      facts: { targets: { hero: { withinRange: true, ally: true, withinTouch: true } } },
      expiry: { phase: 'endOfTurn', round: 6, actorId, moment: 'afterEffects' } });
    assert.equal(preview.ready, true, `${id} :: ${preview.error} ${JSON.stringify(preview.needsInput)}`);
    const result = await s.applyDivineExecution(id, { preview });
    assert.equal(result.ready, true, `${id} :: ${result.error}`);
  };
  if (crush) await invoke(CRUSH, 'hero');
  if (fortune) await invoke(FORTUNE, 'myr');
  if (bountiful) await invoke(BOUNTIFUL, 'ran');
  return s;
}
// Attaque de CC 40 : 88 est un échec, 24 une réussite ; la défense de l'ennemi (82) échoue.
const attack = (s, { roll = '88', reroll = 24, id = 'a' } = {}) => s.previewResolution({ resolutionId: id, actor: person(s, 'hero'), actorId: 'hero', targetId: 'enemy', roll,
  action: { type: 'attack', base: 40, attr: 'CC', damage: 3 }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } },
  v5: { kind: 'melee', fortuneReroll: true, fortuneRerollRoll: reroll } });
// Test de FM : 82 (score 50) échoue inversé en 28 il réussit ; 91 (score 10) inversé en 19 échoue encore.
const testRoll = (s, { roll = '82', base = 50, reverse = false, reroll, id = 't' } = {}) => s.previewResolution({ resolutionId: id, actor: person(s, 'hero'),
  action: { name: 'Concentration', type: 'test', attr: 'FM', base }, targetId: 'enemy', roll,
  v5: { kind: 'test', ...(reverse ? { reverseDice: true } : {}), ...(reroll === undefined ? {} : { fortuneReroll: true, fortuneRerollRoll: reroll }) } });
const layerOf = (s, prayerId) => (person(s, 'hero').extensions?.v5?.divineEffects || []).find(row => row.prayerId === prayerId);
const fortuneRemaining = s => layerOf(s, FORTUNE)?.freeReroll?.remaining ?? 0;
const crushUsedRound = s => layerOf(s, CRUSH)?.freeReroll?.usedRound;
const reverseRemaining = s => layerOf(s, BOUNTIFUL)?.reverseDice?.remaining ?? 0;
const paidFortune = preview => (preview.actionCosts?.paid || []).some(c => c.resource === 'fortune' && c.amount === 1);
const snapshot = s => ({ balance: s.getFortune('hero').balance, fortune: fortuneRemaining(s), crushUsed: crushUsedRound(s), reverse: reverseRemaining(s) });
const unchanged = (s, before, label) => assert.deepEqual(snapshot(s), before, label);

test('Interactions 1 : Chance + Écraser les faibles — première attaque ratée relancée gratuitement, Écraser consommé pour le Round, Chance intacte', async () => {
  const s = await fixture({ bountiful: false });
  const before = snapshot(s);
  const first = attack(s);
  assert.equal(first.fortuneReroll?.free, true, 'relance gratuite');
  assert.equal(paidFortune(first), false, 'aucun Point de Chance payé');
  unchanged(s, before, 'l’aperçu ne consomme aucune couche ni aucun point');
  assert.equal((await s.applyResolution(first)).status, 'applied');
  assert.equal(s.getFortune('hero').balance, 3, 'solde de Chance inchangé');
  assert.equal(crushUsedRound(s), 1, 'la couche Écraser les faibles est utilisée pour ce Round');
  assert.equal(fortuneRemaining(s), 1, 'la couche Chance garde remaining 1');
});

test('Interactions 2 : deuxième attaque ratée du même Round — encore gratuite, cette fois via Chance qui passe à 0', async () => {
  const s = await fixture({ bountiful: false });
  await s.applyResolution(attack(s, { id: 'a' }));
  const before = snapshot(s);
  const second = attack(s, { id: 'b' });
  assert.equal(second.fortuneReroll?.free, true, 'relance gratuite : la couche Chance prend le relais');
  assert.equal(paidFortune(second), false, 'aucun Point de Chance payé');
  unchanged(s, before, 'l’aperçu ne consomme aucune couche ni aucun point');
  assert.equal((await s.applyResolution(second)).status, 'applied');
  assert.equal(fortuneRemaining(s), 0, 'la couche Chance est consommée');
  assert.equal(crushUsedRound(s), 1, 'Écraser les faibles reste utilisé pour ce Round');
  assert.equal(s.getFortune('hero').balance, 3, 'solde de Chance inchangé');
});

test('Interactions 3 : Fortune généreuse + Chance — 82 inversé en 28 réussit sans relance ; seule l’inversion est consommée', async () => {
  const s = await fixture({ crush: false });
  const before = snapshot(s);
  const reversed = testRoll(s, { reverse: true, id: 't1' });
  assert.equal(reversed.success, true, '82 inversé en 28 : réussite');
  assert.equal(reversed.fortuneReroll, undefined, 'aucune relance demandée');
  unchanged(s, before, 'l’aperçu ne consomme aucune couche ni aucun point');
  assert.equal((await s.applyResolution(reversed)).status, 'applied');
  assert.equal(reverseRemaining(s), 0, 'couche inversion consommée');
  assert.equal(fortuneRemaining(s), 1, 'couche Chance intacte');
  assert.equal(s.getFortune('hero').balance, 3, 'solde de Chance inchangé');
});

test('Interactions 4 : inversion + relance dans la même commande (91→19 échoue, relance 05 gratuite) ; les deux couches consommées, un seul Undo restitue tout', async () => {
  const s = await fixture({ crush: false });
  const before = snapshot(s);
  const both = testRoll(s, { roll: '91', base: 10, reverse: true, reroll: 5, id: 't2' });
  assert.equal(both.fortuneReroll?.initialRoll, 19, '91 inversé en 19');
  assert.equal(both.fortuneReroll?.free, true, '19 échoue contre 10 : la relance est gratuite');
  assert.equal(paidFortune(both), false, 'aucun Point de Chance payé');
  assert.equal(both.success, true, 'la relance 05 réussit contre 10');
  unchanged(s, before, 'l’aperçu ne consomme aucune couche ni aucun point');
  assert.equal((await s.applyResolution(both)).status, 'applied');
  assert.equal(reverseRemaining(s), 0, 'couche inversion consommée');
  assert.equal(fortuneRemaining(s), 0, 'couche Chance consommée dans la même commande');
  assert.equal(s.getFortune('hero').balance, 3, 'solde de Chance inchangé');
  await s.undo();
  assert.equal(reverseRemaining(s), 1, 'un seul Undo restitue l’inversion');
  assert.equal(fortuneRemaining(s), 1, 'le même Undo restitue la relance gratuite');
  assert.equal(s.getFortune('hero').balance, 3, 'solde de Chance inchangé');
});

test('Interactions 5 : aucun aperçu (attaque, relance, inversion, combinaison) ne consomme de couche ni ne touche au solde', async () => {
  const withCrush = await fixture({ bountiful: false });
  const beforeCrush = snapshot(withCrush);
  attack(withCrush, { id: 'p1' });
  testRoll(withCrush, { reverse: true, id: 'p2' });
  testRoll(withCrush, { roll: '91', base: 10, reverse: true, reroll: 5, id: 'p3' });
  unchanged(withCrush, beforeCrush, 'couches et solde inchangés après tous les aperçus');
  const withReverse = await fixture({ crush: false });
  const beforeReverse = snapshot(withReverse);
  testRoll(withReverse, { reverse: true, id: 'p4' });
  testRoll(withReverse, { roll: '91', base: 10, reverse: true, reroll: 5, id: 'p5' });
  unchanged(withReverse, beforeReverse, 'couches et solde inchangés après tous les aperçus');
});

test('Interactions 6 (régression) : sans aucune de ces couches, la relance coûte 1 Point de Chance et reverseDice ne change rien', async () => {
  const s = await fixture({ crush: false, fortune: false, bountiful: false });
  assert.equal((person(s, 'hero').extensions?.v5?.divineEffects || []).length, 0, 'aucune couche divine');
  const before = snapshot(s);
  const withReverse = testRoll(s, { reverse: true, reroll: 60, id: 't3' });
  const withoutReverse = testRoll(s, { reroll: 60, id: 't4' });
  for (const apercu of [withReverse, withoutReverse]) {
    assert.equal(apercu.success, false, '82 puis 60 échouent tous deux contre 50');
    assert.equal(apercu.fortuneReroll?.initialRoll, 82, 'sans couche, le jet initial n’est pas inversé');
    assert.equal(apercu.fortuneReroll?.free, undefined, 'pas de gratuité');
    assert.ok(paidFortune(apercu), 'la relance coûte 1 Point de Chance');
  }
  assert.deepEqual(withReverse.fortuneReroll, withoutReverse.fortuneReroll, 'reverseDice ne change rien');
  unchanged(s, before, 'l’aperçu ne consomme rien');
  assert.equal((await s.applyResolution(withReverse)).status, 'applied');
  assert.equal(s.getFortune('hero').balance, 2, '1 Point de Chance débité');
});
