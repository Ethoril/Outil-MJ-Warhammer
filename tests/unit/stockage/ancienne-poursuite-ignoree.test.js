// La poursuite V5 est abandonnée : une sauvegarde qui en porte encore l'état (poursuite en cours, reçus de scène, poursuite
// rangée avec une scène en pause) se charge sans erreur, l'état est ignoré (jamais lu, jamais exigé) et le jeu continue.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';

const memory = () => { let saved = null; return { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; }, read() { return saved && structuredClone(saved); } }; };
const person = (id, kind, camp, extra = {}) => ({ id, name: id, kind, camp, zone: 'active', hp: 12, maxHp: 12, size: 'average', species: 'Human',
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 30, Soc: 30, M: 4 }, skills: [], talents: [], states: [], equipment: [], traits: [], armor: {}, extensions: { v5: {} }, ...extra });
const OLD_PURSUIT = { id: 'p1', mode: 'combat', status: 'active', source: 'V5', startedRound: 1, scopeKey: null, preyIds: ['proie'], pursuerIds: ['chasseur'],
  movement: { proie: 4, chasseur: 4 }, obstacleSide: 'prey', pair: { pursuerId: 'chasseur', preyId: 'proie' }, opposed: { pursuer: null, prey: null, netSl: null, winner: null },
  factors: null, factorsTouched: [], obstacles: [], outcome: null, endApplied: [] };

async function oldSave() {
  const persistence = memory(), store = createStore({ storage: null, persistence });
  await store.ready;
  const participants = [person('proie', 'PJ', 'pj', { states: [{ key: 'brise', name: 'Brisé', level: 1 }] }), person('chasseur', 'PNJ', 'ennemi')];
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [],
    extensions: { v5: { combatId: 'c', turnIndex: 1, pursuit: structuredClone(OLD_PURSUIT), scenePursuitReceipts: ['r1'] } },
    suspendedScenes: [{ id: 's1', status: 'suspended', extensions: { v5: { pursuit: structuredClone(OLD_PURSUIT) } }, participants: [] }],
    combat: { round: 1, currentActorId: 'proie', order: ['proie', 'chasseur'], participants } });
  return { store, persistence };
}

test('sauvegarde avec un état de poursuite : chargée sans erreur, plus aucune commande de poursuite', async () => {
  const { store } = await oldSave();
  assert.equal(store.getCombat().participants.size, 2);
  for (const name of ['getPursuit', 'startPursuit', 'previewPursuitTest', 'applyPursuitTest', 'endPursuit', 'applyPursuitEnd', 'previewScenePursuit', 'applyScenePursuit', 'scenePursuitAvailability'])
    assert.equal(store[name], undefined, name);
});

test('sauvegarde avec un état de poursuite : le jeu continue (Brisé non exempté, banc, retrait, fin de rencontre)', async () => {
  const { store } = await oldSave();
  // La poursuite n'exempte plus le fuyard Brisé : l'obligation de fuite et de Sprint revient (règle du Brisé inchangée).
  await assert.rejects(async () => { await store.nextTurn(); }, /Brisé impose Move/);
  await assert.doesNotReject(async () => { await store.moveParticipant('proie', 'bench'); });
  assert.equal(store.getCombat().participants.get('proie').zone, 'bench');
  await assert.doesNotReject(async () => { await store.removeParticipant('chasseur'); });
  assert.equal(store.getCombat().participants.has('chasseur'), false);
  await assert.doesNotReject(async () => { await store.endEncounter(); });
});
