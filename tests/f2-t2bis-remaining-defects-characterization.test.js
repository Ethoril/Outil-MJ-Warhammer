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
  assert.equal(preview.ready, true, JSON.stringify(preview.unresolved));
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
