import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
import { previewV5Turn } from '../js/core/v5-turn.js';
import { createV5TimedEffect } from '../js/core/v5-effects.js';

function memory() {
  let state;
  return { load: async () => state && structuredClone(state), saveAtomic: async ({ state: next }) => { state = structuredClone(next); return { ok: true }; } };
}
const actor = (id, initiative, states = [], hp = 20) => ({ id, name: id, zone: 'active', initiative, hp, maxHp: 20, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states });
const state = participants => ({ localRevision: 8, combat: { round: 1, currentActorId: 'a', participants, order: ['a', 'b'] }, log: [], extensions: { v5: { turnIndex: 1 } } });

async function live(participants) {
  const persistence = memory(), store = createStore({ persistence }); await store.ready;
  for (const participant of participants) await store.addParticipant(participant);
  const engine = createCombatEngine(store); await engine.start();
  return { store, engine, persistence };
}

test('Lot2 Tour V5 — Hémorragique attend la fin du Round, pas chaque Tour', () => {
  const input = state([actor('a', 50, [{ name: 'Hémorragique', level: 2 }]), actor('b', 20)]);
  const first = previewV5Turn(input);
  assert.equal(first.ready, true);
  assert.equal(first.state.combat.participants[0].hp, 20);
  const second = previewV5Turn({ ...first.state, localRevision: 9 });
  assert.equal(second.ready, true);
  assert.equal(second.state.combat.participants[0].hp, 18);
  assert.equal(second.state.combat.round, 2);
  assert.equal(input.combat.participants[0].hp, 20);
});

test('Lot2 Tour V5 — échéance de l’auteur retire un effet de sa cible, durée historique reste sur son propre Tour', () => {
  const effect = createV5TimedEffect({ id: 'effect-author', name: 'Battement', level: 1 }, { authorId: 'a', targetId: 'b', expiry: { phase: 'endOfTurn', round: 1, turn: 1, actorId: 'a' } });
  const input = state([actor('a', 50), actor('b', 20, [effect, { id: 'legacy-target', name: 'Maison', duration: 2 }])]);
  const first = previewV5Turn(input);
  assert.equal(first.state.combat.participants[1].states.some(item => item.id === 'effect-author'), false);
  assert.equal(first.state.combat.participants[1].states.find(item => item.id === 'legacy-target').duration, 2);
  const second = previewV5Turn({ ...first.state, localRevision: 9 });
  assert.equal(second.state.combat.participants[1].states.find(item => item.id === 'legacy-target').duration, 1);
});

test('Lot2 Tour V5 — Aperçu déterministe sans tirage ni mutation, feu+poison en fin de Round', () => {
  const input = state([actor('a', 50, [{ name: 'Enflammé', level: 2 }, { name: 'Empoisonné', level: 1 }]), actor('b', 20)]);
  input.combat.currentActorId = 'b';
  const saved = Math.random; Math.random = () => { throw new Error('Aucun tirage dans le plan'); };
  try {
    const options = { inputs: { a: { fireRoll: 6 } } };
    const first = previewV5Turn(input, options), second = previewV5Turn(input, options);
    assert.deepEqual(first, second);
    assert.equal(first.state.combat.participants[0].hp, 15, '6+2-1-BE3 =4, puis poison1');
    assert.equal(input.combat.participants[0].hp, 20);
  } finally { Math.random = saved; }
});

test('Lot2 Tour V5 — jet manquant suspend toute transition, puis critique feu explicite >100 sans PV négatifs', async () => {
  const { store, engine } = await live([actor('a', 50, [{ name: 'Enflammé', level: 1 }], 1), actor('b', 20)]);
  await engine.nextTurn();
  const revision = store.getLocalRevision(), before = store.getFullJSON();
  const pending = await engine.nextTurn();
  assert.equal(pending.status, 'requires-input');
  assert.equal(pending.requests[0].field, 'fireRoll');
  assert.equal(store.getLocalRevision(), revision);
  assert.deepEqual(JSON.parse(store.getFullJSON()).combat, JSON.parse(before).combat);
  const critical = await engine.nextTurn({ baseRevision: revision, inputs: { a: { fireRoll: 8 } } });
  assert.equal(critical.status, 'requires-input');
  assert.ok(critical.requests.some(item => item.field === 'fireCriticalRoll' && item.bonus === 40));
  assert.equal(store.listParticipants().find(item => item.id === 'a').hp, 1);
  const applied = await engine.nextTurn({ baseRevision: revision, inputs: { a: { fireRoll: 8, fireCriticalRoll: 80 } } });
  assert.equal(applied.status, 'applied');
  assert.equal(store.listParticipants().find(item => item.id === 'a').hp, 0);
  assert.equal(store.getCombat().round, 2);
  const receipt = store.getLog().find(entry => entry.detail?.fireCritical);
  assert.equal(receipt.detail.fireCritical.severity, 120);
  assert.equal(receipt.detail.death, true);
});

test('Lot2 Tour V5 — un résultat de saignement à0 est explicite, annulation/rechargement restaurent horloge et Élan', async () => {
  const { store, engine, persistence } = await live([actor('a', 50, [{ name: 'Hémorragique', level: 1 }], 1), actor('b', 20)]);
  await store.updateParticipant('a', { extensions: { v5: { hasMomentum: true } } });
  await engine.nextTurn();
  const pending = await engine.nextTurn();
  assert.ok(pending.requests.some(item => item.field === 'bleedingEnduranceTest'));
  await engine.nextTurn({ baseRevision: pending.baseRevision, inputs: { a: { bleedingEnduranceTest: { success: false, sl: -1 } } } });
  assert.equal(store.listParticipants()[0].hp, 0);
  assert.ok(store.listParticipants()[0].states.some(item => item.key === 'inconscient'));
  assert.equal(store.listParticipants()[0].extensions.v5.hasMomentum, false);
  await store.undo();
  assert.equal(store.listParticipants()[0].hp, 1);
  assert.equal(store.listParticipants()[0].extensions.v5.hasMomentum, true);
  assert.equal(store.getCombat().round, 1);
  const reloaded = createStore({ persistence }); await reloaded.ready;
  assert.equal(reloaded.getCombat().round, 1);
  await reloaded.redo();
  assert.equal(reloaded.listParticipants()[0].hp, 0);
  assert.equal(reloaded.getCombat().round, 2);
});

test('Lot2 Tour V5 — contexte périmé n’applique aucun effet ni avancement', async () => {
  const { store, engine } = await live([actor('a', 50, [{ name: 'Enflammé', level: 1 }]), actor('b', 20)]);
  await engine.nextTurn(); const pending = await engine.nextTurn();
  await store.updateParticipant('b', { hp: 18 });
  assert.equal((await engine.nextTurn({ baseRevision: pending.baseRevision, inputs: { a: { fireRoll: 4 } } })).status, 'stale');
  assert.equal(store.getCombat().round, 1);
  assert.equal(store.listParticipants()[0].hp, 20);
});

test('Lot2 Store V5 — acquisition et récupération explicites, guérison réelle retire saignements ensemble', async () => {
  const { store } = await live([actor('a', 50), actor('b', 20)]);
  await store.acquireConditions('a', [{ name: 'À Terre' }, { name: 'À Terre' }]);
  assert.equal(store.listParticipants()[0].states.length, 1);
  await store.acquireConditions('a', [{ name: 'Sonné', level: 4 }]);
  assert.ok(store.listParticipants()[0].states.some(item => item.key === 'inconscient'));
  assert.ok(!store.listParticipants()[0].states.some(item => item.key === 'sonne'));
  await store.undo();
  const recovered = await store.recoverCondition('a', 'a-terre', { method: 'stand-up' });
  assert.equal(recovered.status, 'applied');
  await store.acquireConditions('a', [{ name: 'Hémorragique', level: 3 }]);
  await store.updateParticipant('a', { hp: 18 });
  await store.healWounds('a', 10);
  assert.equal(store.listParticipants()[0].hp, 20);
  assert.equal(store.listParticipants()[0].states.find(item => item.key === 'hemorragique').level, 1);
  await store.undo();
  assert.equal(store.listParticipants()[0].hp, 18);
  assert.equal(store.listParticipants()[0].states.find(item => item.key === 'hemorragique').level, 3);
});
