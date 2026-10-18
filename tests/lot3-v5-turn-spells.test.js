/**
 * S-01 / T-01 — la fin de tour réelle (createCombatEngine(store).nextTurn(), chemin de main.js advanceTurn)
 * traite les effets magiques dans la même commande end-turn-v5.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
import { previewLoreAttribute } from '../js/core/v5-magic-attributes.js';

const memory = () => { let state; return { load: async () => state && structuredClone(state), saveAtomic: async ({ state: next }) => { state = structuredClone(next); return { ok: true }; } }; };

async function encounterStore() {
  const persistence = memory(), store = createStore({ persistence }); await store.ready;
  await store.addProfile({ id: 'turn-mage', name: 'Astromancien', hp: 12, maxHp: 12, initiative: 60, caracs: { CC: 40, E: 30, FM: 50, Int: 50 }, armor: { head: 0, body: 0, arms: 0, legs: 0 } });
  await store.addProfile({ id: 'turn-foe', name: 'Adversaire', hp: 12, maxHp: 12, initiative: 30, caracs: { CC: 40, E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 } });
  await store.saveEncounter({ id: 'turn-enc', title: 'Fin de tour magique', entries: [
    { id: 'turn-enc:mage', profileId: 'turn-mage', quantity: 1, zone: 'active' },
    { id: 'turn-enc:foe', profileId: 'turn-foe', quantity: 1, zone: 'active' }
  ] });
  await store.launchEncounter('turn-enc');
  const engine = createCombatEngine(store); await engine.start();
  return { store, engine };
}

const subject = (store, id) => store.listParticipants().find(p => p.id === id);

test('S-01 — Tour suivant (moteur réel) : buff « 1 Round » et Chance des Cieux expirent, Undo restaure', async () => {
  const { store, engine } = await encounterStore();
  const mage = store.listParticipants().find(p => p.profileId === 'turn-mage');
  assert.equal(store.getCombat().currentActorId, mage.id);
  assert.equal(store.getCombat().round, 1);

  await store.applySpellEffects(mage.id, { id: 'turn-buff', spellId: 'turn-buff', spellName: 'Buff d’un Round', casterId: mage.id, statModifiers: { CC: 10 }, durationRounds: 1 });
  const heavens = previewLoreAttribute({ lore: 'heavens', caster: subject(store, mage.id) });
  await store.applyLoreAttribute(heavens, { casterId: mage.id, targetIds: [] });
  const buffed = subject(store, mage.id);
  assert.equal(buffed.caracs.CC, 50);
  assert.equal(store.getFortune(mage.id).temporary, 1);
  assert.equal(buffed.extensions.v5.spellEffects.length, 2);

  // Tour de l'adversaire, Round 1 : rien n'expire encore.
  assert.equal((await engine.nextTurn()).status, 'applied');
  assert.equal(subject(store, mage.id).extensions.v5.spellEffects.length, 2);
  assert.equal(subject(store, mage.id).caracs.CC, 50);

  // Retour au mage, Round 2 : la Chance des Cieux expire (début du Tour), le buff d'un Round dure jusqu'à la fin du Tour du mage (D-12).
  assert.equal((await engine.nextTurn()).status, 'applied');
  assert.equal(store.getCombat().round, 2);
  const midway = subject(store, mage.id);
  assert.equal(midway.extensions.v5.spellEffects.length, 1);
  assert.equal(midway.caracs.CC, 50);
  assert.equal(store.getFortune(mage.id).temporary, 0, 'Chance temporaire des Cieux retirée');

  // Fin du Tour du mage au Round 2 : le buff expire.
  assert.equal((await engine.nextTurn()).status, 'applied');
  const expired = subject(store, mage.id);
  assert.equal(expired.extensions.v5.spellEffects.length, 0);
  assert.equal(expired.caracs.CC, 40);

  // Chaque fin de Tour est une commande : un Undo restaure le Tour et les effets.
  await store.undo();
  assert.equal(subject(store, mage.id).extensions.v5.spellEffects.length, 1);
  assert.equal(subject(store, mage.id).caracs.CC, 50);
  await store.undo();
  assert.equal(store.getCombat().round, 1);
  const restored = subject(store, mage.id);
  assert.equal(restored.extensions.v5.spellEffects.length, 2);
  assert.equal(restored.caracs.CC, 50);
  assert.equal(store.getFortune(mage.id).temporary, 1);
});

test('S-01 — l’aperçu de fin de tour reste pur et n’expire pas deux fois', async () => {
  const { store, engine } = await encounterStore();
  const mage = store.listParticipants().find(p => p.profileId === 'turn-mage');
  await store.applySpellEffects(mage.id, { id: 'turn-buff', spellId: 'turn-buff', spellName: 'Buff d’un Round', casterId: mage.id, statModifiers: { CC: 10 }, durationRounds: 1 });
  await engine.nextTurn(); await engine.nextTurn();
  const before = JSON.parse(store.getFullJSON()).combat, revision = store.getLocalRevision();
  const preview = engine.previewNextTurn();
  assert.equal(preview.ready, true);
  assert.equal(preview.state.combat.participants.find(p => p.id === mage.id).caracs.CC, 40);
  assert.deepEqual(JSON.parse(store.getFullJSON()).combat, before, 'L’aperçu ne modifie pas le Store');
  assert.equal(store.getLocalRevision(), revision);
  await engine.nextTurn();
  assert.equal(subject(store, mage.id).caracs.CC, 40, 'Caractéristique restaurée une seule fois');
});

// D-12 — un effet en Rounds expire à la fin du Tour de son auteur, pas au premier changement de Tour du Round d'échéance.
async function d12Store(mageInitiative, foeInitiative) {
  const persistence = memory(), store = createStore({ persistence }); await store.ready;
  const base = { hp: 12, maxHp: 12, caracs: { CC: 40, E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 } };
  await store.addProfile({ id: 'd12-mage', name: 'Mage', initiative: mageInitiative, ...base });
  await store.addProfile({ id: 'd12-foe', name: 'Adversaire', initiative: foeInitiative, ...base });
  await store.saveEncounter({ id: 'd12-enc', title: 'D-12', entries: [
    { id: 'd12-enc:mage', profileId: 'd12-mage', quantity: 1, zone: 'active' },
    { id: 'd12-enc:foe', profileId: 'd12-foe', quantity: 1, zone: 'active' }
  ] });
  await store.launchEncounter('d12-enc');
  const engine = createCombatEngine(store); await engine.start();
  const mage = store.listParticipants().find(p => p.profileId === 'd12-mage');
  const foe = store.listParticipants().find(p => p.profileId === 'd12-foe');
  return { store, engine, mage, foe };
}
const buffCount = (store, id) => subject(store, id).extensions.v5.spellEffects.length;
const buff = (mage, durationRounds) => ({ id: 'd12-buff', spellId: 'd12-buff', spellName: 'Buff', casterId: mage.id, statModifiers: { CC: 10 }, durationRounds });

test('D-12 — auteur pas en premier : l’effet survit au Tour adverse du Round d’échéance et expire à la fin du Tour du mage', async () => {
  const { store, engine, mage, foe } = await d12Store(20, 60);
  assert.equal(store.getCombat().currentActorId, foe.id);
  await engine.nextTurn();                       // R1 : le mage joue
  assert.equal(store.getCombat().currentActorId, mage.id);
  await store.applySpellEffects(mage.id, buff(mage, 1)); // échéance : R2
  await engine.nextTurn();                       // fin du Tour du mage R1 -> R2, adversaire
  assert.equal(store.getCombat().round, 2);
  assert.equal(buffCount(store, mage.id), 1, 'Le Tour adverse du R2 n’expire pas l’effet');
  await engine.nextTurn();                       // R2 : le mage joue
  assert.equal(buffCount(store, mage.id), 1, 'Début du Tour du mage : pas encore');
  await engine.nextTurn();                       // fin du Tour du mage R2
  assert.equal(buffCount(store, mage.id), 0);
  assert.equal(subject(store, mage.id).caracs.CC, 40);
  await store.undo();
  assert.equal(buffCount(store, mage.id), 1, 'Undo restaure l’effet');
});

test('D-12 — auteur en premier : expiration à la fin de son Tour au Round d’échéance', async () => {
  const { store, engine, mage } = await d12Store(60, 20);
  await store.applySpellEffects(mage.id, buff(mage, 1)); // échéance : R2
  await engine.nextTurn();                       // adversaire R1
  await engine.nextTurn();                       // mage R2
  assert.equal(store.getCombat().round, 2);
  assert.equal(buffCount(store, mage.id), 1);
  await engine.nextTurn();
  assert.equal(buffCount(store, mage.id), 0);
});

test('D-12 — effet de 2 Rounds : expire à la fin du Tour du mage au Round 3', async () => {
  const { store, engine, mage } = await d12Store(60, 20);
  await store.applySpellEffects(mage.id, buff(mage, 2)); // échéance : R3
  for (let i = 0; i < 4; i += 1) await engine.nextTurn(); // fins de Tour : mage R1, foe R1, mage R2, foe R2
  assert.equal(store.getCombat().round, 3);
  assert.equal(buffCount(store, mage.id), 1);
  await engine.nextTurn();                       // fin du Tour du mage R3
  assert.equal(buffCount(store, mage.id), 0);
});

test('D-12 — effet posé sur un autre porteur : suit le Tour de l’auteur, pas celui du porteur', async () => {
  const { store, engine, mage, foe } = await d12Store(60, 20);
  await store.applySpellEffects(foe.id, buff(mage, 1)); // auteur = mage, porteur = adversaire, échéance R2
  await engine.nextTurn(); await engine.nextTurn();     // mage R2
  assert.equal(buffCount(store, foe.id), 1);
  await engine.nextTurn();                              // fin du Tour du mage R2
  assert.equal(buffCount(store, foe.id), 0);
});

test('D-12 — auteur retiré du combat ou sans auteur : retombée sur l’échéance de Round', async () => {
  const { store, engine, mage, foe } = await d12Store(60, 20);
  await store.applySpellEffects(foe.id, { ...buff(mage, 1), id: 'orphan', casterId: 'disparu' });
  await store.applySpellEffects(foe.id, { ...buff(mage, 1), id: 'anonymous', casterId: undefined });
  await engine.nextTurn();                       // adversaire R1
  assert.equal(buffCount(store, foe.id), 2);
  await engine.nextTurn();                       // R2 commence : échéance atteinte
  assert.equal(buffCount(store, foe.id), 0);
});

test('S-03 — bouclier utilisé : disponible de nouveau au début du Tour de son porteur (end-turn-v5)', async () => {
  const { store, engine, mage, foe } = await d12Store(60, 20);
  const state = JSON.parse(store.getFullJSON());
  const target = state.combat.participants.find(p => p.id === foe.id);
  target.extensions = { ...(target.extensions || {}), shieldUnavailable: ['sh'], shieldUnavailableCause: { sh: { round: 1 } } };
  await store.loadFromJSON(JSON.stringify(state));
  assert.deepEqual(subject(store, foe.id).extensions.shieldUnavailable, ['sh']);
  await engine.nextTurn();                       // fin du Tour du mage -> début du Tour de l'adversaire
  assert.equal(store.getCombat().currentActorId, foe.id);
  assert.equal(subject(store, foe.id).extensions.shieldUnavailable, undefined);
});
