// Scène orpheline — une scène dont la rencontre n'existe plus (impasse relevée le 19/11/2026).
//
// Relevé sur une sauvegarde réelle : une scène « test » active pointant vers une rencontre dont
// l'identifiant n'apparaissait nulle part ailleurs dans le fichier. Le statut « En cours » se
// déduit de la scène, mais les deux commandes qui relâchent une scène — suspendre, supprimer la
// rencontre — vivent sur la CARTE de la rencontre. Plus de carte, plus de sortie : tout lancement
// restait bloqué, définitivement.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { orphanScenes } from '../../../js/core/encounters.js';

const memoryPersistence = () => { let state; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: value }) { state = structuredClone(value); return { ok: true }; } }; };
const combattant = id => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 50, hp: 10, maxHp: 10,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, skills: [], talents: [], equipment: [], traits: [], states: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });
const scene = (id, encounterId, status = 'active') => ({ id, encounterId, status, title: 'test', round: 0, currentActorId: null,
  order: ['bhelgi'], participants: [combattant('bhelgi')], extensions: { v5: {} } });

async function fixture({ encounters = [], activeScene = null, suspendedScenes = [] } = {}) {
  const store = createStore({ storage: null, persistence: memoryPersistence() });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], encounters, activeScene, suspendedScenes,
    extensions: { v5: {} }, combat: { round: 0, currentActorId: null, order: ['bhelgi'], participants: [combattant('bhelgi')] } });
  return store;
}

test('orphanScenes désigne la scène dont la rencontre a disparu, et laisse celle qui en a une', () => {
  const rattachee = scene('s-1', 'enc-1');
  const orpheline = scene('s-2', 'enc-disparue');
  assert.deepEqual(orphanScenes({ activeScene: rattachee }, [{ id: 'enc-1' }]), []);
  assert.deepEqual(orphanScenes({ activeScene: orpheline }, [{ id: 'enc-1' }]).map(s => s.id), ['s-2']);
  // Une suspendue orpheline est le même défaut : elle n'a pas de carte non plus.
  assert.deepEqual(orphanScenes({ activeScene: rattachee, suspendedScenes: [orpheline] }, [{ id: 'enc-1' }]).map(s => s.id), ['s-2']);
  // Sans rencontre du tout, tout est orphelin ; sans scène, rien ne l'est.
  assert.deepEqual(orphanScenes({ activeScene: rattachee }, []).map(s => s.id), ['s-1']);
  assert.deepEqual(orphanScenes({}, [{ id: 'enc-1' }]), []);
});

test('clore une scène orpheline la relâche et remet le combat à zéro', async () => {
  const store = await fixture({ encounters: [{ id: 'enc-vivante', title: 'Chaos dans la nuit', entries: [] }], activeScene: scene('s-fantome', 'enc-disparue') });
  assert.equal(store.getActiveScene()?.id, 's-fantome');
  await store.discardOrphanScene('s-fantome');
  assert.equal(store.getActiveScene(), null, 'la scène bloque encore les lancements');
  assert.equal(store.listParticipants().length, 0, 'le combat garde les combattants de la scène close');
  assert.equal(JSON.parse(store.getFullJSON()).combat.round, 0, 'le round de la scène close survit');
  // ⛔ La rencontre vivante n'est pas touchée : c'est elle que le MJ veut lancer ensuite.
  assert.deepEqual(store.listEncounters().map(row => row.id), ['enc-vivante']);
});

test('⛔ clore refuse une scène rattachée à une rencontre, et une scène inconnue', async () => {
  const store = await fixture({ encounters: [{ id: 'enc-1', title: 'Chaos dans la nuit', entries: [] }], activeScene: scene('s-1', 'enc-1') });
  // La garantie du chemin : il ne peut pas servir à jeter un combat que le MJ retrouverait autrement.
  await assert.rejects(() => store.discardOrphanScene('s-1'), /rattachée à une rencontre/);
  await assert.rejects(() => store.discardOrphanScene('s-inconnue'), /introuvable/);
  assert.equal(store.getActiveScene()?.id, 's-1');
  assert.equal(store.listParticipants().length, 1);
});

test('une scène suspendue orpheline se clôt sans toucher à la scène active', async () => {
  const store = await fixture({ encounters: [{ id: 'enc-1', title: 'Chaos', entries: [] }],
    activeScene: scene('s-active', 'enc-1'), suspendedScenes: [scene('s-vieille', 'enc-disparue', 'suspended')] });
  await store.discardOrphanScene('s-vieille');
  assert.deepEqual(store.listSuspendedScenes().map(row => row.id), []);
  assert.equal(store.getActiveScene()?.id, 's-active', 'la scène active a été emportée');
  assert.equal(store.listParticipants().length, 1, 'le combat de la scène active a été vidé');
});
