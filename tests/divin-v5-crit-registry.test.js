import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';

// Étape 5 du plan : registre des Blessures Critiques — chaque Blessure Critique (attaque ou incantation)
// laisse un enregistrement stable et identifié dans extensions.v5.criticalWounds.
// Critère d'acceptation écrit avant le correctif (doit échouer avant).
const clone = value => structuredClone(value);
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'foe' || id === 'enemy2' ? 'ennemi' : 'pj', zone: 'active', initiative: 60, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }, { name: 'Langue (Magick)', total: 70 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Taal' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 }, hasMomentum: false, magic: { reserve: { type: 'winds', sl: 0 } } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const records = (store, id) => person(store, id).extensions?.v5?.criticalWounds || [];
async function baseFixture(participants, order) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: order || ['priest', 'ally', 'foe'],
    participants }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'crit-registry' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const attack = (resolutionId, actorId, targetId, extra = {}) => ({ resolutionId, actorId, targetId, roll: 22,
  action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } },
  v5: { kind: 'melee' }, ...extra });

test('Un coup critique enregistre une Blessure Critique identifiée sur la cible', async () => {
  const store = await baseFixture([actor('priest'), actor('ally'), actor('foe')]);
  const preview = store.previewResolution(attack('hit1', 'priest', 'foe', { criticalRolls: { location: 2, effect: 80 } }));
  assert.ok(preview.critical?.details, 'critique principal attendu');
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  const foeRecords = records(store, 'foe');
  assert.equal(foeRecords.length, 1, 'un enregistrement');
  assert.equal(foeRecords[0].id, `${preview.resolutionId}:crit:foe:0`);
  assert.equal(foeRecords[0].source, 'attack');
  assert.equal(foeRecords[0].name, preview.critical.details.effect.name);
  assert.equal(foeRecords[0].location, preview.critical.details.location.name);
  assert.equal(foeRecords[0].effectRoll, preview.critical.details.effectRoll);
  assert.equal(foeRecords[0].round, 1);
  assert.equal(foeRecords[0].resolutionId, preview.resolutionId);
  assert.equal(foeRecords[0].authorId, 'priest');
});

test('Un premier et un second critique enregistrent deux Blessures Critiques distinctes', async () => {
  const store = await baseFixture([actor('priest'), actor('ally'), actor('foe', { hp: 1 })]);
  const preview = store.previewResolution(attack('hit2', 'priest', 'foe', { criticalRolls: { location: 2, effect: 80, secondEffect: 45 } }));
  assert.ok(preview.critical?.details, 'critique principal attendu');
  assert.ok(preview.critical?.second, 'critique secondaire attendu (dégâts excédentaires)');
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  const foeRecords = records(store, 'foe');
  assert.equal(foeRecords.length, 2, 'deux enregistrements');
  assert.equal(foeRecords[0].id, `${preview.resolutionId}:crit:foe:0`);
  assert.equal(foeRecords[1].id, `${preview.resolutionId}:crit:foe:1`);
  assert.equal(foeRecords[0].name, preview.critical.details.effect.name);
  assert.equal(foeRecords[1].name, preview.critical.second.effect.name);
  assert.equal(foeRecords[1].location, preview.critical.second.location.name);
  assert.equal(foeRecords[1].effectRoll, preview.critical.second.effectRoll);
  assert.equal(foeRecords[1].authorId, 'priest');
});

test('Un critique défensif enregistre la Blessure Critique sur l’attaquant', async () => {
  const store = await baseFixture([actor('priest'), actor('ally'), actor('foe')]);
  const preview = store.previewResolution({ resolutionId: 'def', actorId: 'foe', targetId: 'ally', roll: 45,
    action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, defense: { base: 60, roll: 22, v5: { kind: 'melee' } }, v5: { kind: 'melee' },
    defenderCriticalRolls: { location: 2, effect: 80 } });
  assert.ok(preview.defenderCritical?.details, 'critique défensif attendu');
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  const foeRecords = records(store, 'foe');
  assert.equal(foeRecords.length, 1, 'un enregistrement sur l’attaquant');
  assert.equal(foeRecords[0].id, `${preview.resolutionId}:crit:foe:0`);
  assert.equal(foeRecords[0].source, 'attack');
  assert.equal(foeRecords[0].name, preview.defenderCritical.details.effect.name);
  assert.equal(foeRecords[0].authorId, 'ally', 'l’auteur est le défenseur');
  assert.equal(records(store, 'ally').length, 0, 'rien sur le défenseur');
});

test('Un critique de Tourbillon de mort sur une cible secondaire y enregistre la Blessure Critique', async () => {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe', 'enemy2'],
    participants: [actor('priest'), actor('ally', { initiative: 50, talents: [{ id: 'talent-whirlwind-of-death', status: 'resolved', rank: 1 }],
      extensions: { v5: { divine: { sin: 0 }, hasMomentum: false, resourceCharacterId: 'ra' } } }), actor('foe', { initiative: 30, talents: [] }),
      actor('enemy2', { hp: 1, maxHp: 40, initiative: 10 })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'crit-registry-ww' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  await store.nextTurn();
  await store.setFortune('ally', 2);
  const preview = store.previewResolution({ resolutionId: 'ww', actorId: 'ally', targetId: 'foe', roll: 22,
    action: { type: 'attack', base: 60, attr: 'CC', damage: 5, qualities: ['inoffensive'] }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } },
    v5: { kind: 'melee', context: { specialAttack: 'whirlwind-of-death', engagedIds: ['foe', 'enemy2'], allEngagedIncluded: true,
      whirlwindRolls: { enemy2: { secondEffect: 80, secondEffectAlternative: 70 } } } } });
  const secondary = (preview.secondaryTargets || []).find(row => row.critical?.second);
  assert.ok(secondary, 'critique secondaire attendu sur enemy2');
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  const enemy2Records = records(store, 'enemy2');
  assert.equal(enemy2Records.length, 1, 'un enregistrement sur la cible secondaire');
  assert.equal(enemy2Records[0].id, `${preview.resolutionId}:crit:enemy2:0`);
  assert.equal(enemy2Records[0].source, 'attack');
  assert.equal(enemy2Records[0].name, secondary.critical.second.effect.name);
  assert.equal(enemy2Records[0].location, secondary.critical.second.location.name);
  assert.equal(enemy2Records[0].effectRoll, secondary.critical.second.effectRoll);
  assert.equal(enemy2Records[0].authorId, 'ally');
});

test('Une Blessure Critique d’incantation porte un identifiant stable et la source « spell »', async () => {
  const store = await baseFixture([actor('priest'), actor('ally', { initiative: 50 }), actor('foe')]);
  await store.nextTurn();
  const input = { actorId: 'ally', targetIds: ['foe'], roll: 22, miscastRoll: 15, criticalChoice: 'critical-wound' };
  const preview = store.previewSpellExecution('Carreau', input);
  assert.equal(preview.valid, true, preview.error);
  await store.applySpellExecution('Carreau', input);
  const foeRecords = records(store, 'foe');
  assert.equal(foeRecords.length, 1, 'un enregistrement');
  assert.equal(typeof foeRecords[0].id, 'string');
  assert.ok(foeRecords[0].id.length > 0, 'identifiant non vide');
  assert.ok(foeRecords[0].id.endsWith(':crit:foe'), 'identifiant de la forme <exécution>:crit:<cible>');
  assert.equal(foeRecords[0].source, 'spell');
  assert.equal(foeRecords[0].spellName, 'Carreau', 'champs existants conservés');
  assert.equal(foeRecords[0].casterId, 'ally', 'champs existants conservés');
});

test('Undo retire l’enregistrement de Blessure Critique', async () => {
  const store = await baseFixture([actor('priest'), actor('ally'), actor('foe')]);
  const preview = store.previewResolution(attack('undo1', 'priest', 'foe', { criticalRolls: { location: 2, effect: 80 } }));
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  assert.equal(records(store, 'foe').length, 1);
  await store.undo();
  assert.equal(records(store, 'foe').length, 0, 'l’Undo retire l’enregistrement');
});

test('Aucun enregistrement sans coup critique', async () => {
  const store = await baseFixture([actor('priest'), actor('ally'), actor('foe')]);
  const preview = store.previewResolution(attack('plain', 'priest', 'foe', { roll: 45 }));
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  assert.equal(records(store, 'foe').length, 0, 'aucun enregistrement');
});
