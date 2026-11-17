import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { targetAppliesToTest } from '../../../js/core/effect-engine.js';

// L1 — F1 : modificateurs de Test. Valeurs relues au livre (Q10) : Deft Steps p.18-19 (Talk Your Way Out +8, The Gamemaster +4,
// Crisis of Confidence −20), Livre de base p.222 (Fair Winds +1), p.225 (Ranald's Grace +10 Discrétion), p.227 (Lord of the Hunt +1).
// Q14 : un ±10 sur une compétence se lit ±1 DR.
const clone = value => structuredClone(value);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const idOf = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === name).id;
const TALK = idOf('Se sortir d’affaire par la parole'), GAME = idOf('Le Maître du jeu'), CRISIS = idOf('Crise de confiance'),
  WINDS = idOf('Vents favorables'), HUNT = idOf('Seigneur de la Chasse'), GRACE = idOf('Grâce de Ranald'), DEAL = idOf('Un marché est un marché'),
  RAGE = idOf('Rage de Rhya');

const actor = (id, cult, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
async function fixture(cult) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [actor('priest', cult), actor('ally', cult, { initiative: 30 })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const input = (more = {}) => ({ actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, ...more });
async function cast(store, contractId, more) {
  const preview = store.previewDivineExecution(contractId, input(more));
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput) + preview.error);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return { preview, result };
}
const layers = (store, id) => person(store, id).extensions.v5.divineEffects || [];
const mods = (store, id) => person(store, id).extensions.v5.testModifiers ?? {};
const manual = id => getDivineContract(id).clauses.filter(clause => clause.mode === 'manual').map(clause => clause.id);

describe('L1 — F1 : modificateurs de Test', () => {
  test('statuts : quatre prières assistées, test-modifier, la part non branchable reste en rappel (CA4)', () => {
    for (const id of [TALK, GAME, WINDS, HUNT]) {
      const contract = getDivineContract(id);
      assert.equal(contract.status, 'assisted', contract.name);
      assert.ok(contract.effects.some(effect => effect.type === 'test-modifier'), contract.name);
    }
    assert.deepEqual(manual(TALK), ['one-off-caught']);
    assert.deepEqual(manual(GAME), ['rules-known', 'mental-game-only', 'forget']);
    assert.deepEqual(manual(WINDS), ['top-speed']);
    assert.deepEqual(manual(HUNT), ['track-lock', 'settlement-end', 'quarry-other-tests']);
  });

  test('Se sortir d’affaire par la parole : Charme +8 DR sur le prêtre seul', async () => {
    const store = await fixture('Ranald');
    await cast(store, TALK, { expiry: undefined });
    assert.equal(mods(store, 'priest').Charme, 8);
    assert.deepEqual(mods(store, 'ally'), {});
    assert.deepEqual(layers(store, 'priest')[0].testModifiers, { Charme: 8 });
  });

  test('Le Maître du jeu : Pari +4 DR sur le prêtre seul', async () => {
    const store = await fixture('Ranald');
    await cast(store, GAME, { expiry: undefined });
    assert.deepEqual(mods(store, 'priest'), { Pari: 4 });
    assert.deepEqual(mods(store, 'ally'), {});
  });

  test('Vents favorables : Voile +1 DR sur le prêtre (le navire n’est pas un participant), vitesse du navire en rappel', async () => {
    const store = await fixture('Manann');
    await cast(store, WINDS, { targetIds: ['ally'], facts: { targets: { ally: { withinRange: true } } }, expiry: undefined });
    assert.deepEqual(mods(store, 'priest'), { Voile: 1 });
  });

  test('Seigneur de la Chasse : Pistage +1 DR sur le prêtre', async () => {
    const store = await fixture('Taal');
    await cast(store, HUNT, { expiry: undefined });
    assert.deepEqual(mods(store, 'priest'), { Pistage: 1 });
  });

  test('Grâce de Ranald : la Discrétion reste un rappel (effets-equipement-tests.test.js, figé par CA7, exige ce rappel)', () => {
    assert.equal(getDivineContract(GRACE).clauses.find(clause => clause.id === 'stealth').mode, 'manual');
    assert.ok(!getDivineContract(GRACE).effects.some(effect => effect.type === 'test-modifier'));
  });

  test('chaque prière s’annule en un seul ↶ et se rejoue par ↷', async () => {
    const store = await fixture('Ranald');
    await cast(store, TALK, { expiry: undefined });
    assert.equal(mods(store, 'priest').Charme, 8);
    await store.undo();
    assert.deepEqual(mods(store, 'priest'), {});
    assert.deepEqual(layers(store, 'priest'), []);
    await store.redo();
    assert.equal(mods(store, 'priest').Charme, 8);
  });

  test('expiration : la couche de Maître du jeu (6 h) disparaît à l’échéance, le modificateur avec elle', async () => {
    const store = await fixture('Ranald');
    await cast(store, GAME, { expiry: undefined, clockAnchor: { campaignSeconds: 0, clockRevision: 0, lastEventId: null } });
    assert.equal(layers(store, 'priest').length, 1);
    assert.equal(layers(store, 'priest')[0].deadline.atSeconds, 6 * 3600);
    assert.equal((await store.advanceCampaignTime({ seconds: 6 * 3600 - 1, reason: 'Presque six heures' })).status, 'applied');
    assert.equal(mods(store, 'priest').Pari, 4);
    assert.equal((await store.advanceCampaignTime({ seconds: 1, reason: 'Six heures' })).status, 'applied');
    assert.deepEqual(layers(store, 'priest'), []);
    assert.deepEqual(mods(store, 'priest'), {});
  });

  test('la clé carac:F vaut pour un Test de Force et jamais pour un Test d’Agilité', () => {
    assert.equal(targetAppliesToTest('carac:F', { skill: 'Athlétisme', carac: 'F' }), true);
    assert.equal(targetAppliesToTest('carac:F', { skill: 'Esquive', carac: 'Ag' }), false);
    assert.equal(targetAppliesToTest('carac:F', { skill: 'Esquive' }), false);
  });

  test('hors lot : Crise de confiance, Un marché est un marché et Rage de Rhya restent en rappel', () => {
    // Crise de confiance : prière instantanée, le moteur ne pose aucune couche pour un effet instantané (js/core hors lot).
    assert.equal(getDivineContract(CRISIS).status, 'manual');
    // A Deal's a Deal : +2 DR puis +1 par +2 DR du Test de Prière — une base plus une règle par DR ne tient pas dans une seule valeur.
    assert.equal(getDivineContract(DEAL).status, 'manual');
    // Rage de Rhya : la clé carac:F casserait effets-equipement-tests.test.js (clause force-test et testModifiers figés) : rappel conservé.
    assert.ok(manual(RAGE).includes('force-test'));
  });
});
