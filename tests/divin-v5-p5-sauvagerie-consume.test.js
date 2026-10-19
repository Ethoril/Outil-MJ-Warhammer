import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';

// Défauts D1 et D2 du contrôle indépendant (19 oct.) : la Bénédiction de Sauvagerie doit être consommée dès que son porteur
// INFLIGE un critique en profitant de Frappe blessante prêtée, y compris (D1) le critique d'une cible secondaire du Tourbillon
// de mort et (D2) le critique infligé en défendant. Critère d'acceptation écrit avant le correctif (doit échouer avant).
const clone = value => structuredClone(value);
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'foe' || id === 'enemy2' ? 'ennemi' : 'pj', zone: 'active', initiative: 60, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Taal' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 }, hasMomentum: false } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const savageryLayers = store => (person(store, 'ally').extensions?.v5?.divineEffects || []).filter(row => row.consumeOn === 'critical').length;
const lentInjure = store => person(store, 'ally').talents.filter(row => row.id === 'talent-strike-to-injure').length;
async function fixture({ allyTalents = [], allyExtra = {}, extra = [] } = {}) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe', ...extra.map(row => row.id)],
    participants: [actor('priest'), actor('ally', { initiative: 50, talents: allyTalents, ...allyExtra }), actor('foe', { initiative: 30, talents: [] }), ...extra] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'sauv' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  const id = 'divine:blessing:taal:savagery';
  const preview = store.previewDivineExecution(id, { actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 },
    expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, facts: { targets: { ally: { withinRange: true } } } });
  assert.equal(preview.ready, true, preview.error);
  assert.equal((await store.applyDivineExecution(id, { preview })).ready, true);
  await store.nextTurn();
  return store;
}

test('D2 : un critique infligé EN DÉFENDANT avec Frappe blessante prêtée consomme la Bénédiction de Sauvagerie', async () => {
  const store = await fixture();
  await store.nextTurn();
  assert.equal(savageryLayers(store), 1);
  const preview = store.previewResolution({ resolutionId: 'dc', actorId: 'foe', targetId: 'ally', action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, roll: 45,
    defense: { base: 60, roll: 22, v5: { kind: 'melee', talentChoices: { 'injure:first': true } } }, v5: { kind: 'melee' },
    criticalRolls: { location: 2, effect: 80 }, defenderCriticalRolls: { location: 2, effect: 80, injureEffect: 20 } });
  assert.equal(preview.defenderCritical?.details?.effectRollBase, 20, 'la Frappe blessante prêtée sert bien au critique défensif');
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  assert.equal(savageryLayers(store), 0, 'bénédiction consommée');
  assert.equal(lentInjure(store), 0, 'talent prêté retiré');
  await store.undo();
  assert.equal(savageryLayers(store), 1, 'Undo la restaure');
});

test('D1 : un critique de Tourbillon de mort sur une cible secondaire consomme la Bénédiction de Sauvagerie', async () => {
  const store = await fixture({ allyTalents: [{ id: 'talent-whirlwind-of-death', status: 'resolved', rank: 1 }],
    extra: [actor('enemy2', { hp: 1, maxHp: 40, initiative: 10 })], allyExtra: { extensions: { v5: { divine: { sin: 0 }, hasMomentum: false, resourceCharacterId: 'ra' } } } });
  await store.setFortune('ally', 2);
  const preview = store.previewResolution({ resolutionId: 'ww', actorId: 'ally', targetId: 'foe', roll: 22,
    action: { type: 'attack', base: 60, attr: 'CC', damage: 5, qualities: ['inoffensive'] }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } },
    v5: { kind: 'melee', context: { specialAttack: 'whirlwind-of-death', engagedIds: ['foe', 'enemy2'], allEngagedIncluded: true,
      whirlwindRolls: { enemy2: { secondEffect: 80, secondEffectAlternative: 70, injureSecondEffect: 20, injureSecondEffectAlternative: 30 } },
      whirlwindChoices: { enemy2: { 'injure:second': true } } } } });
  const secondary = (preview.secondaryTargets || []).find(row => row.critical?.second);
  assert.equal(secondary?.critical?.second?.effectRollBase, 20, 'la Frappe blessante prêtée sert au critique secondaire');
  await store.applyResolution(preview);
  assert.equal(savageryLayers(store), 0, 'bénédiction consommée');
  assert.equal(lentInjure(store), 0, 'talent prêté retiré');
});

test('Non-régression : un critique SUBI par le porteur ne consomme rien', async () => {
  const store = await fixture();
  await store.nextTurn();
  const preview = store.previewResolution({ resolutionId: 'hit', actorId: 'foe', targetId: 'ally', action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, roll: 22,
    defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, criticalRolls: { location: 2, effect: 80 } });
  await store.applyResolution(preview);
  assert.equal(savageryLayers(store), 1);
});
