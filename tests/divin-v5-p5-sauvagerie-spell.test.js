import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';

// Résiduel P5 : la Bénédiction de Sauvagerie (« la prochaine Blessure Critique infligée par la cible ») doit aussi prendre fin
// quand son porteur inflige une Blessure Critique d'incantation (choix « critical-wound » d'un sort de dégâts).
// Critère d'acceptation écrit avant le correctif (doit échouer avant).
const clone = value => structuredClone(value);
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'foe' ? 'ennemi' : 'pj', zone: 'active', initiative: 60, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }, { name: 'Langue (Magick)', total: 70 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Taal' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 }, hasMomentum: false, magic: { reserve: { type: 'winds', sl: 0 } } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const savageryLayers = (store, id = 'ally') => (person(store, id).extensions?.v5?.divineEffects || []).filter(row => row.consumeOn === 'critical').length;
async function fixture(blessed = 'ally') {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
    participants: [actor('priest'), actor('ally', { initiative: 50 }), actor('foe', { initiative: 30, talents: [] })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'sauv-spell' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  const id = 'divine:blessing:taal:savagery';
  const preview = store.previewDivineExecution(id, { actorId: 'priest', targetIds: [blessed], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 },
    expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, facts: { targets: { [blessed]: { withinRange: true } } } });
  assert.equal(preview.ready, true, preview.error);
  assert.equal((await store.applyDivineExecution(id, { preview })).ready, true);
  await store.nextTurn();
  return store;
}
const bolt = (actorId, targetId, extra = {}) => ({ actorId, targetIds: [targetId], roll: 22, miscastRoll: 15, ...extra });

test('Une Blessure Critique d\'incantation infligée par le porteur consomme la Bénédiction de Sauvagerie (Undo la restaure)', async () => {
  const store = await fixture();
  assert.equal(savageryLayers(store), 1);
  const preview = store.previewSpellExecution('Carreau', bolt('ally', 'foe', { criticalChoice: 'critical-wound' }));
  assert.equal(preview.valid, true, preview.error);
  assert.equal(preview.targetResults[0].criticalWoundTriggered, true);
  await store.applySpellExecution('Carreau', bolt('ally', 'foe', { criticalChoice: 'critical-wound' }));
  assert.equal((person(store, 'foe').extensions?.v5?.criticalWounds || []).length, 1, 'critique posé sur la cible');
  assert.equal(savageryLayers(store), 0, 'bénédiction consommée');
  assert.equal(person(store, 'ally').talents.filter(row => row.id === 'talent-strike-to-injure').length, 0, 'talent prêté retiré');
  await store.undo();
  assert.equal(savageryLayers(store), 1, 'Undo la restaure');
});

test('Non-régression : un sort critique sans Blessure Critique (Force irrésistible) ne consomme rien', async () => {
  const store = await fixture();
  await store.applySpellExecution('Carreau', bolt('ally', 'foe', { criticalChoice: 'unstoppable-force' }));
  assert.equal(savageryLayers(store), 1);
});

test('Non-régression : une Blessure Critique d\'incantation SUBIE par le porteur ne consomme rien', async () => {
  const store = await fixture('foe');
  await store.nextTurn();
  assert.equal(savageryLayers(store, 'foe'), 1);
  await store.applySpellExecution('Carreau', bolt('ally', 'foe', { criticalChoice: 'critical-wound' }));
  assert.equal((person(store, 'foe').extensions?.v5?.criticalWounds || []).length, 1);
  assert.equal(savageryLayers(store, 'foe'), 1);
});
