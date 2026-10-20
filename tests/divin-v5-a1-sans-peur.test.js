import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';

// A1 (R8) : le Talent talent-fearless s'affiche « Sans peur [Ennemi] » comme le catalogue des Talents,
// plus « Intrépide » (aucune étiquette ni effet de contrat divin ne contient l'ancien nom).
const registry = JSON.parse(readFileSync('js/data/v5-divine-contracts.json', 'utf8'));
const DEVOTION = 'divine:miracle:devotion-de-la-guerriere';

const clone = value => structuredClone(value);
const actor = (id, initiative, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: ['Myrmidia'].map(specialization => ({ id: 'talent-invoke', status: 'resolved', rank: 1, specialization })),
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
async function fixture() {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'],
    participants: [actor('priest', 60), actor('ally', 30)] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}

test('aucun contrat divin n’utilise l’ancien nom « Intrépide » (R8)', () => {
  assert.ok(registry.contracts.length > 50, 'contrats chargés');
  for (const contract of registry.contracts) {
    assert.doesNotMatch(JSON.stringify(contract.labels ?? {}), /Intrépide/i, `labels de ${contract.id}`);
    assert.doesNotMatch(JSON.stringify(contract.effects ?? []), /Intrépide/i, `effects de ${contract.id}`);
  }
});

test('Dévotion de la Guerrière : grant-talent talent-fearless étiqueté « Sans peur [Ennemi] »', async () => {
  const contract = getDivineContract(DEVOTION);
  assert.equal(contract.status, 'assisted');
  const effect = contract.effects.find(row => row.type === 'grant-talent');
  assert.equal(effect.specializationFrom, 'input');
  assert.deepEqual(effect.talents.map(row => [row.id, row.name, row.rank]), [['talent-fearless', 'Sans peur', 1]]);
  assert.match(contract.labels.effect, /Sans peur \[Ennemi\]/, 'résumé aligné sur le catalogue des Talents');
  assert.ok(contract.clauses.some(row => row.id === 'fearless-enemy' && /Sans peur \[Ennemi\]/.test(row.text)));

  const store = await fixture();
  const preview = store.previewDivineExecution(DEVOTION, { actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true,
    choices: { range: 0, targets: 0, duration: 0, effect: 0 }, expiry: { phase: 'endOfTurn', round: 4, actorId: 'priest' },
    facts: { targets: { ally: { ally: true, withinRange: true } } }, talent: { specialization: 'Gobelins' } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  assert.deepEqual(preview.preview.effects[0].talents.map(row => [row.id, row.name, row.specialization]),
    [['talent-fearless', 'Sans peur', 'Gobelins']]);
  const result = await store.applyDivineExecution(DEVOTION, { preview });
  assert.equal(result.ready, true, result.error);
  const ally = store.listParticipants().find(row => row.id === 'ally');
  const granted = (ally.talents || []).filter(row => row.divineEffectId);
  assert.equal(granted.length, 1);
  assert.equal(granted[0].id, 'talent-fearless');
  assert.equal(granted[0].name, 'Sans peur', 'le Talent injecté porte le nom du catalogue');
  assert.equal(granted[0].specialization, 'Gobelins');
});
