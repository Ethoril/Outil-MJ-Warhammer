// F2-L characterization: contract tests for the existing Fortune path and
// the new Fate / legacy conversion / currency behavior before engine changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

function participant(id, overrides = {}) {
  return { id, profileId: `${id}-profile`, name: id, kind: id === 'foe' ? 'PNJ' : 'PJ',
    camp: id === 'foe' ? 'ennemi' : 'pj', zone: 'active', hp: 20, maxHp: 20,
    caracs: { CC: 60, CT: 60, F: 30, E: 30, FM: 60, I: 40, Ag: 40 },
    skills: [], states: [], equipment: [], extensions: { v5: {}, ...(overrides.extensions || {}) }, ...overrides };
}

async function combat({ actor = participant('hero'), target = participant('foe'), persistence } = {}) {
  const store = createStore({ storage: null, ...(persistence ? { persistence } : {}) });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: {
    round: 1, currentActorId: actor.id, order: [actor.id, target.id], participants: [actor, target]
  } });
  return store;
}

test('F2-L characterization — Fortune reroll charges one permanent point once and Undo/Redo/reload preserve the receipt', async () => {
  let saved;
  const persistence = { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } };
  const store = await combat({ persistence });
  await store.setFortune('hero', 2);
  const preview = store.previewResolution({ actorId: 'hero', targetId: 'foe', resolutionId: 'l-fortune-1', roll: 88,
    action: { type: 'test', attr: 'FM', base: 60 }, v5: { kind: 'test', fortuneReroll: true, fortuneRerollRoll: 24 } });
  assert.equal(preview.ready, true, preview.unresolved?.join('; '));
  assert.ok(preview.actionCosts.paid.some(row => row.resource === 'fortune' && row.amount === 1));
  assert.equal((await store.applyResolution(preview)).status, 'applied');
  assert.equal(store.getFortune('hero').balance, 1);
  assert.ok(['duplicate', 'already-applied'].includes((await store.applyResolution(preview)).status));
  assert.equal(store.getFortune('hero').balance, 1);
  assert.equal(await store.undo(), true);
  assert.equal(store.getFortune('hero').balance, 2);
  assert.equal(await store.redo(), true);
  assert.equal(store.getFortune('hero').balance, 1);
  const reloaded = createStore({ storage: null, persistence });
  await reloaded.ready;
  assert.equal(reloaded.getFortune('hero').balance, 1);
  assert.ok(reloaded.getLog().some(row => row.detail?.actionId === 'l-fortune-1' || row.detail?.resolutionId === 'l-fortune-1'));
});

test('F2-L characterization — Fate cancels a declared attack before damage and critical effects', async () => {
  const store = await combat({ actor: participant('hero'), target: participant('foe', { extensions: { v5: { fate: 1 } } }) });
  const preview = store.previewResolution({ actorId: 'hero', targetId: 'foe', resolutionId: 'l-fate-cancel', roll: 11,
    action: { type: 'attack', attr: 'CC', base: 90, damage: 12 }, defense: { base: 30, roll: 70, v5: { kind: 'melee' } }, attackContext: { ranged: false },
    v5: { kind: 'melee', context: { fateAction: 'cancel-attack' } } });
  assert.equal(preview.ready, true, preview.unresolved?.join('; '));
  assert.equal(preview.fateAction.action, 'cancel-attack');
  assert.equal(preview.fateAction.cancelled, true);
  assert.equal(preview.damage?.total ?? 0, 0);
  assert.equal(preview.critical, null);
  assert.equal((await store.applyResolution(preview)).status, 'applied');
  assert.equal(store.getFate('foe').balance, 0);
  assert.equal(store.listParticipants().find(row => row.id === 'foe').hp, 20);
});

test('F2-L characterization — V4 profile conversion is idempotent and maps the accepted V5 terms', async () => {
  const { convertLegacyV4Profile } = await import('../js/core/v5-legacy-conversion.js');
  const legacy = { id: 'old', extensions: { v4: { advantage: 2, resilience: 3, determination: 4, difficulty: 20, resolve: 1 } } };
  const once = convertLegacyV4Profile(legacy);
  const twice = convertLegacyV4Profile(once);
  assert.deepEqual(twice, once);
  assert.deepEqual(once.extensions.v5, { hasMomentum: true, fate: 3, resources: { fortune: 4 }, difficultySL: 2 });
  const {parseProfileJson}=await import('../js/core/json-profile-import.js');
  const imported=parseProfileJson(JSON.stringify({name:'Legacy',kind:'PJ',hp:10,extensions:{v4:{advantage:1,resilience:2,determination:3}}}));
  assert.deepEqual(imported.profiles[0].extensions.v5,{hasMomentum:true,fate:2,resources:{fortune:3}});
});

test('F2-L characterization — currency conversions use 1 crown = 20 pistoles = 240 sous and reject negatives', async () => {
  const { toSous, fromSous } = await import('../js/core/currency.js');
  assert.equal(toSous({ crowns: 1, pistoles: 0, sous: 0 }), 240);
  assert.equal(toSous({ crowns: 0, pistoles: 20, sous: 0 }), 240);
  assert.equal(toSous({ crowns: 0, pistoles: 0, sous: 240 }), 240);
  assert.deepEqual(fromSous(240), { crowns: 1, pistoles: 0, sous: 0 });
  assert.throws(() => toSous({ crowns: -1, pistoles: 0, sous: 0 }), /négatif|invalide/i);
  assert.throws(() => fromSous(-1), /négatif|invalide/i);
});
