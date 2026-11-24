// Passe G, lot G11 (recette du 24/11, ligne k-absent) : le Test final de fracture d'un absent d'une scène suspendue
// lit la Résistance du patient dans la scène suspendue (lecture seule) au lieu de refuser « ni Résistance ni E ».
// Le registre est produit par le vrai chemin (critique F2-I, suivi, séquelles, calendrier), puis la patiente passe
// dans une scène suspendue : elle n'est plus ni en rencontre ni suivie hors rencontre (CA13 : consultation seule).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createCriticalAftermathRecord } from '../../../js/core/v5-critical-aftermath.js';
import { getV5CriticalEffect } from '../../../js/data/v5-crits.js';

const clone = structuredClone;
function memoryPersistence() {
  let saved = null;
  return { saved: () => clone(saved), async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } };
}
const rollOf = (table, name) => Array.from({ length: 200 }, (_, i) => i + 1).find(n => getV5CriticalEffect(table, n)?.source?.printedName === name);
const lise = () => ({ id: 'p9', name: 'Lise', kind: 'PJ', camp: 'pj', zone: 'active', hp: 8, maxHp: 14, caracs: { E: 40, Int: 30, M: 4, CC: 40, Ag: 40 },
  skills: [{ id: 'endu', name: 'Résistance', carac: 'E', total: 60, advances: 20, status: 'resolved' }], talents: [], states: [], extensions: { v5: {} } });
let counter = 0;
const op = () => `g11-op-${++counter}`;

/** Fracture mineure du bras de Lise arrivée au Test final (jour 31), puis Lise rangée dans une scène suspendue. */
async function absentStore() {
  const made = createCriticalAftermathRecord(lise(), { table: 'ARM', effectRoll: rollOf('ARM', 'Clean Break'), resolutionId: 'res-p9' });
  const participant = made.participant, record = made.record;
  participant.extensions.v5.criticalAftermath = [record];
  participant.extensions.v5.criticalWounds = [{ id: record.criticalWoundId, name: record.effectName, location: record.location }];
  const persistence = memoryPersistence();
  const first = createStore({ storage: null, persistence });
  await first.ready;
  await first.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants: [participant] }, log: [], diceLines: [], extensions: { v5: {} } });
  await first.registerAftermathIncident({ operationId: op(), participantId: 'p9', criticalId: record.id, bandaged: true });
  const incidentId = first.getAftermathState().incidents[0].id;
  await first.openAftermathSequelae({ operationId: op(), incidentId, facts: { 'injury:0': { side: 'right', d10: 1 } } });
  await first.advanceAftermathCalendar({ operationId: op(), days: 31 });
  assert.equal(first.listAftermathSequelae().sequelae[0].phase, 'awaiting-test', 'précondition : Test final attendu');
  // Lise quitte la rencontre pour une scène suspendue (même forme que `suspendActiveScene`).
  const saved = persistence.saved();
  const inScene = clone(saved.combat.participants.find(row => row.id === 'p9'));
  saved.combat = { ...saved.combat, participants: [], order: [], currentActorId: null };
  saved.suspendedScenes = [{ id: 'scene-s', encounterId: 'e', status: 'suspended', suspendedAt: '2026-11-24T20:00:00.000Z', participants: [inScene] }];
  const store = createStore({ storage: null, persistence: memoryPersistence() });
  await store.ready;
  await store.loadFromJSON(saved);
  return store;
}

test('G11 · k-absent : le Test final de fracture d’un absent lit sa Résistance dans la scène suspendue', async () => {
  const store = await absentStore();
  assert.equal(store.listParticipants().length, 0, 'précondition : Lise n’est pas en rencontre');
  assert.equal(store.listSuspendedScenes()[0].participants[0].id, 'p9', 'précondition : Lise est dans la scène suspendue');
  const bone = store.getAftermathState().sequelae[0];
  const done = await store.resolveAftermathFracture({ operationId: op(), sequelaId: bone.id, roll: 19 });
  assert.notEqual(done.receipt.reason, 'endurance-score-missing', 'la Résistance 60 de la scène suspendue est lue');
  assert.equal(done.receipt.status, 'applied', done.receipt.reason);
  assert.equal(done.receipt.success, true, 'Résistance 60, jet 19, fracture mineure à +2 DR : réussite');
  assert.equal(store.getAftermathState().sequelae[0].status, 'healed');
  assert.equal(store.listSuspendedScenes()[0].participants[0].hp, 8, 'la scène suspendue n’est pas modifiée');
});

test('G11 · k-absent : une séquelle inconnue reste refusée', async () => {
  const store = await absentStore();
  const bone = store.getAftermathState().sequelae[0];
  // Sans patient lisible nulle part, le refus d'origine reste.
  const unknown = await store.resolveAftermathFracture({ operationId: op(), sequelaId: 'inconnue', roll: 19 });
  assert.notEqual(unknown.receipt.status, 'applied');
  assert.equal(store.getAftermathState().sequelae[0].id, bone.id);
});

test('G11 · k-absent : les soins restent refusés pour un absent de scène suspendue (CA13 inchangé)', async () => {
  const store = await absentStore();
  const bone = store.getAftermathState().sequelae[0];
  const care = await store.immobilizeAftermathFracture({ operationId: op(), sequelaId: bone.id, externalHealer: { name: 'Barbier', score: 60, intelligenceBonus: 5 }, roll: 20 });
  assert.notEqual(care.receipt.status, 'applied', 'aucun soin sur un absent de scène suspendue');
});
