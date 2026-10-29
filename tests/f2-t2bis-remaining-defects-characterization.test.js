import test from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution } from '../js/core/resolution.js';
import { createStore } from '../js/core/store.js';

const q = (id, parameter = '') => ({ id, parameter });
const fighter = (id, extra = {}) => ({ id, name: id, camp: 'foes', zone: 'active', hp: 20, maxHp: 20,
  caracs: { CC: 50, CT: 50, F: 40, E: 30, Ag: 40 }, states: [], skills: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });

test('T2 bis characterization — pistolet au contact accepte Esquive comme opposition de mêlée', () => {
  const actor = fighter('shooter', { camp: 'hero' }), target = fighter('target');
  const preview = previewResolution({ actor, target, resolutionId: 't2bis-pistol-contact', roll: 20,
    action: { type: 'attack', attr: 'CT', base: 60, damage: 4, qualities: [q('pistolet')] },
    attackContext: { ranged: true, targetEngaged: true },
    defense: { type: 'skill', label: 'Esquive', attr: 'Ag', base: 40, roll: 30 },
    v5: { kind: 'ranged', context: { engaged: true } } });
  assert.deepEqual(preview.unresolved, []);
  assert.equal(preview.opposition?.mode, 'opposed');
});

test('T2 bis characterization — Inflige atteint la cible secondaire de bombe', () => {
  const actor = fighter('thrower', { camp: 'hero' }), primary = fighter('primary'), secondary = fighter('secondary');
  const participants = [actor, primary, secondary];
  const bomb = previewResolution({ actor, target: primary, resolutionId: 't2bis-bomb-secondary', roll: 20,
    action: { type: 'attack', attr: 'CT', base: 60, damage: 8, qualities: [q('explosion', '3'), q('inflige', 'Sonné')] },
    attackContext: { ranged: true }, v5State: { participants },
    v5: { kind: 'ranged', context: { explosionTargetIds: ['primary', 'secondary'], explosionLocationRollsById: { secondary: 35 } } } });
  assert.ok(bomb.secondaryTargets.find(row => row.participantId === 'secondary')?.conditions.length,
    'la cible secondaire de la bombe reçoit la proposition d’état Inflige');

});

test('T2 bis characterization — Inflige atteint la cible secondaire de Dispersion', () => {
  const actor = fighter('thrower', { camp: 'hero' }), primary = fighter('primary'), secondary = fighter('secondary');
  const participants = [actor, primary, secondary];
  const spread = previewResolution({ actor, target: primary, resolutionId: 't2bis-spread-secondary', roll: 20,
    action: { type: 'attack', attr: 'CT', base: 60, damage: 8, qualities: [q('dispersion', '1'), q('inflige', 'Sonné')] },
    attackContext: { ranged: true }, v5State: { participants },
    v5: { kind: 'ranged', context: { spreadTargetIds: ['primary', 'secondary'], spreadRating: 1, spreadRangeBand: 'medium', spreadLocationRollsById: { secondary: 35 } } } });
  assert.ok(spread.secondaryTargets.find(row => row.participantId === 'secondary')?.conditions.length,
    'la cible secondaire de Dispersion reçoit la proposition d’état Inflige');
});

test('T2 bis characterization — Inflige secondaire est annulé avec Bombe incendiaire et Dispersion', async () => {
  const store = createStore({ persistence: null, storage: null }); await store.ready;
  for (const scenario of [
    { id: 'firebomb', qualities: [q('explosion', '4'), q('inflige', 'Enflammé')], context: { explosionTargetIds: ['primary', 'secondary'], explosionLocationRollsById: { secondary: 35 } } },
    { id: 'spread', qualities: [q('dispersion', '1'), q('inflige', 'Sonné')], context: { spreadTargetIds: ['primary', 'secondary'], spreadRating: 1, spreadRangeBand: 'medium', spreadLocationRollsById: { secondary: 35 } } }
  ]) {
    const actor = fighter('thrower', { camp: 'hero' }), primary = fighter('primary'), secondary = fighter('secondary');
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'thrower', order: ['thrower', 'primary', 'secondary'], participants: [actor, primary, secondary] }, log: [], diceLines: [] });
    const preview = store.previewResolution({ actorId: 'thrower', targetId: 'primary', action: { type: 'attack', attr: 'CT', base: 60, damage: 8, qualities: scenario.qualities }, roll: 20,
      v5: { kind: 'ranged', context: scenario.context } });
    assert.deepEqual(preview.unresolved, [], `${scenario.id}: ${JSON.stringify(preview.unresolved)}`);
    assert.equal((await store.applyResolution(preview)).status, 'applied', scenario.id);
    const applied = store.listParticipants().find(row => row.id === 'secondary');
    assert.ok(applied.states.some(row => row.key === (scenario.id === 'firebomb' ? 'enflamme' : 'sonne')), scenario.id);
    await store.undo();
    assert.deepEqual(store.listParticipants().find(row => row.id === 'secondary').states, []);
  }
});

test('T2 bis characterization — résoudre la détonation purge son combatEffect en cours', async () => {
  let saved;
  const persistence = { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } };
  const store = createStore({ persistence, storage: null }); await store.ready;
  const actor = fighter('bomber', { camp: 'hero', extensions: { v5: { combatEffects: [{ id: 'due', kind: 'bomb-detonation' }] } } });
  const target = fighter('target');
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'bomber', order: ['bomber', 'target'], participants: [actor, target] }, log: [], diceLines: [] });
  const preview = store.previewResolution({ actorId: 'bomber', targetId: 'target', action: { type: 'skill', base: 10 }, roll: 45,
    v5: { kind: 'test', context: { bombDetonation: true, bombDamage: 8, designatedTargetIds: ['target'] } } });
  assert.equal((await store.applyResolution(preview)).status, 'applied');
  assert.equal(store.listParticipants().find(row => row.id === 'bomber').extensions.v5.combatEffects.some(row => row.id === 'due'), false);
});

test('T2 bis characterization — garde d’empoignade couvre les Actions de combat previewées', async () => {
  const store = createStore({ persistence: null, storage: null }); await store.ready;
  const held = fighter('held'); held.states = [{ id: 'held-state', key: 'enchevetre', name: 'Enchevêtré', level: 1, source: { kind: 'grapple', linkId: 'g' } }];
  const holder = fighter('holder', { extensions: { v5: { grapples: [{ id: 'g', initiatorId: 'holder', targetId: 'held', status: 'active' }] } } });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'holder', order: ['holder', 'held'], participants: [holder, held] }, log: [], diceLines: [] });
  const preview = store.previewV5CombatAction({ actorId: 'holder', kind: 'defensive', skillId: 'dodge' });
  assert.equal(preview.ready, false, 'le partenaire tenu doit déclarer une Action Force avant Défensive');
});

test('T2 bis characterization — partenaire d’empoignade absent ne fait pas planter buildCombatTest', async () => {
  const store = createStore({ persistence: null, storage: null }); await store.ready;
  const holder = fighter('holder', { extensions: { v5: { grapples: [{ id: 'g', initiatorId: 'holder', targetId: 'removed', status: 'active' }] } } });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'holder', order: ['holder'], participants: [holder] }, log: [], diceLines: [] });
  assert.doesNotThrow(() => store.previewResolution({ actorId: 'holder', action: { type: 'test', label: 'Force', base: 40 }, roll: 35,
    v5: { kind: 'test', context: { grappleAction: 'escape', skillId: 'force' } } }));
});

test('T2 bis characterization — Test de Résistance libre pendant une empoignade ne consomme pas l’Action', async () => {
  const store = createStore({ persistence: null, storage: null }); await store.ready;
  const link = { id: 'prior-grapple', initiatorId: 'holder', targetId: 'held', status: 'active' };
  const held = fighter('held', { extensions: { v5: { grapples: [link] } }, states: [
    { id: 'held-state', key: 'enchevetre', name: 'Enchevêtré', level: 1, source: { kind: 'grapple', linkId: link.id } }
  ] });
  const holder = fighter('holder', { extensions: { v5: { grapples: [link] } } });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 2, currentActorId: 'held', order: ['holder', 'held'], participants: [holder, held] },
    extensions: { v5: { combatId: 'characterize-free-test', turnIndex: 2 } }, log: [], diceLines: [] });
  const freeTest = store.previewResolution({ actorId: 'held', targetId: 'holder', action: { type: 'test', label: 'Endurance', attr: 'E', base: 30 }, roll: 35,
    v5: { kind: 'test', context: { skillId: 'endurance', isAction: false } } });
  assert.notEqual(freeTest.code, 'F2_GRAPPLE_FIRST_ACTION', 'un actionized Resistance Test stays available during the actor’s Turn');
  const declaredAction = store.previewResolution({ actorId: 'held', targetId: 'holder', action: { type: 'test', label: 'Force', attr: 'F', base: 40 }, roll: 35,
    v5: { kind: 'test', context: { skillId: 'force', isAction: true } } });
  assert.equal(declaredAction.code, 'F2_GRAPPLE_FIRST_ACTION', 'an explicitly declared Test Action remains subject to the grapple rule');
});
