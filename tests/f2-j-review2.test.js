import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCriticalAftermathRecord } from '../js/core/v5-critical-aftermath.js';
import { getV5CriticalEffect } from '../js/data/v5-crits.js';
import {
  advanceAftermathCalendar, careForDisease, createAftermathState, previewAftermathAdvance, registerDisease, registerWoundIncident,
  treatInfection, treatSurgicalIncident, treatWoundIncident
} from '../js/core/v5-aftermath.js';

// Contre-vérification J1 du 29/10 : un test par écart.
const clone = structuredClone;
function memoryPersistence() {
  let saved = null;
  return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } };
}
const base = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 5, maxHp: 20, caracs: { E: 30, Int: 50 }, skills: [], talents: [], states: [], extensions: { v5: {} }, ...extra });
const healerSheet = (extra = {}) => base('healer', { hp: 20, skills: [{ id: 'heal', name: 'Guérison', carac: 'Int', total: 60, advances: 10, status: 'resolved' }], ...extra });
async function setup(participants) {
  const store = createStore({ storage: null, persistence: memoryPersistence() });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants }, log: [], diceLines: [], extensions: { v5: {} } });
  return store;
}
const get = (store, id) => store.listParticipants().find(row => row.id === id);
const openCritical = async (store, participantId, criticalId) => {
  await store.registerAftermathIncident({ operationId: `c-${participantId}`, participantId, criticalId });
  return store.getAftermathState().incidents.at(-1).id;
};
const open = async (store, participantId = 'patient') => {
  await store.registerAftermathIncident({ operationId: `r-${participantId}`, participantId, cause: 'combat' });
  return store.getAftermathState().incidents.at(-1).id;
};
const wounds = { kind: 'wounds-lost', cause: 'x' };
const reg = (state, extra = {}) => registerWoundIncident(state, { id: 'i1', operationId: 'r1', expectedRevision: state.revision, participantId: 'p1', source: wounds, ...extra }).state;
const healer = (extra = {}) => ({ participantId: 'h', skill: 'heal', skillId: 'heal', score: 60, intelligenceBonus: 5, advances: 10, hasSurgeryTalent: true, ...extra });

test('1a — le soin passe par healV5Wounds : projectile fiché, Empoisonné à 0 PV, Hémorragique retiré par Blessure récupérée', async () => {
  const bleeding = [{ id: 'b1', key: 'hemorragique', name: 'Hémorragique', level: 1 }, { id: 'b2', key: 'hemorragique', name: 'Hémorragique', level: 1 }];
  const store = await setup([base('patient', { hp: 5, states: bleeding, extensions: { v5: { lodgedProjectiles: [{ id: 'arrow', removed: false }] } } }), healerSheet(), base('poisoned', { hp: 0, states: [{ id: 'p', key: 'empoisonne', name: 'Empoisonné', level: 1 }] })]);
  const incidentId = await open(store);
  const out = await store.treatAftermathWound({ operationId: 'h1', incidentId, healerId: 'healer', roll: 20, supplies: true });
  // 9 Blessures annoncées, 1 bloquée par le projectile Empaleuse fiché : 8 récupérées, 8 occurrences d'Hémorragique max (2 ici).
  assert.deepEqual([get(store, 'patient').hp, out.receipt.healed], [13, 8]);
  assert.equal(get(store, 'patient').states.filter(row => row.key === 'hemorragique').length, 0);
  const sick = await open(store, 'poisoned');
  await store.treatAftermathWound({ operationId: 'h2', incidentId: sick, healerId: 'healer', roll: 20, supplies: true });
  assert.equal(get(store, 'poisoned').hp, 0, 'Empoisonné à 0 Blessure : aucune récupération');
});

test('1b — encadré p.170 : le soin de Blessures consommé, un autre Test retire encore des Hémorragiques', async () => {
  const bleeding = [1, 2, 3, 4].map(n => ({ id: `b${n}`, key: 'hemorragique', name: 'Hémorragique', level: 1 }));
  const store = await setup([base('patient', { hp: 15, maxHp: 20, states: bleeding }), healerSheet()]);
  const incidentId = await open(store);
  await store.treatAftermathWound({ operationId: 'h1', incidentId, healerId: 'healer', roll: 90, supplies: true });
  const again = await store.treatAftermathWound({ operationId: 'h2', incidentId, healerId: 'healer', roll: 20, supplies: true, bleedingOnly: true });
  assert.equal(again.receipt.status, 'applied');
  assert.equal(get(store, 'patient').hp, 15, 'aucune Blessure rendue une seconde fois');
  assert.equal(get(store, 'patient').states.filter(row => row.key === 'hemorragique').length, 0, '9 Blessures auraient été rendues : les 4 Hémorragiques partent');
});

test('2 — un patient retiré du combat ne bloque pas le calendrier ; son incident est signalé puis archivable', async () => {
  const store = await setup([base('patient'), base('gone'), healerSheet()]);
  await open(store); const goneId = await open(store, 'gone');
  store.removeParticipant('gone'); await new Promise(done => setTimeout(done, 20));
  const patientIncident = store.getAftermathState().incidents[0].id;
  const preview = store.previewAftermathAdvance({ days: 1, expectedRevision: store.getAftermathState().revision });
  assert.deepEqual(preview.requiredDailyChecks.map(row => row.incidentId), [patientIncident]);
  assert.deepEqual(preview.absentIncidents.map(row => row.incidentId), [goneId]);
  const jump = await store.advanceAftermathCalendar({ operationId: 'j', days: 1, dailyTests: [{ incidentId: patientIncident, day: 0, roll: 10 }] });
  assert.equal(jump.receipt.status, 'applied', jump.receipt.reason);
  const archived = await store.archiveAftermathIncident({ operationId: 'a', incidentId: goneId });
  assert.equal(archived.receipt.status, 'applied');
  assert.equal(store.getAftermathState().incidents.find(row => row.id === goneId).status, 'archived');
  assert.equal((await store.archiveAftermathIncident({ operationId: 'a2', incidentId: patientIncident })).receipt.reason, 'subject-still-present');
});

test('3 — critique guéri : amputation exige la Chirurgie ; les durables de J2 exigent leur suivi', async () => {
  const roll = Array.from({ length: 200 }, (_, i) => i + 1).find(n => getV5CriticalEffect('ARM', n)?.source?.printedName === 'Severed Finger');
  const withRecord = (table, effectRoll, id) => createCriticalAftermathRecord(base(id), { table, effectRoll, resolutionId: `res-${id}` });
  const finger = withRecord('ARM', roll, 'finger');
  const surgeon = healerSheet({ id: 'surgeon', talents: [{ id: 'talent-surgery', status: 'resolved', rank: 1 }] });
  const store = await setup([finger.participant, surgeon]);
  const incidentId = await openCritical(store, 'finger', finger.record.id);
  const closeOnce = (operationId, extra = {}) => store.closeAftermathIncident({ operationId, incidentId, temporaryEffectsEnded: true, ...extra });
  // La création de l'incident ne connaît pas encore l'amputation : sa décision est en attente.
  assert.equal((await closeOnce('c0')).receipt.reason, 'amputation-decision-pending');
  const record = { ...finger.record, amputationShock: { amputationOccurred: true, part: 'finger' } };
  await store.updateParticipant('finger', { extensions: { v5: { ...get(store, 'finger').extensions.v5, criticalAftermath: [record] } } });
  // J2 : la perte confirmée a son propre suivi (côté et nombre saisis par le MJ) avant que le critique puisse être déclaré guéri.
  assert.equal((await closeOnce('c1a')).receipt.reason, 'sequelae-follow-up-not-opened');
  assert.equal((await store.openAftermathSequelae({ operationId: 'os', incidentId, facts: { 'shock:0:finger': { side: 'left', count: 1 } } })).receipt.status, 'applied');
  assert.equal((await closeOnce('c1')).receipt.reason, 'surgery-not-completed');
  assert.equal((await store.treatAftermathSurgicalIncident({ operationId: 's', incidentId, healerId: 'surgeon', roll: 10 })).receipt.reason, 'surgery-success');
  assert.equal((await closeOnce('c2')).receipt.reason, 'critical-states-remaining', 'sans stateIds rattachés, le MJ confirme les États');
  assert.equal((await closeOnce('c3', { statesConfirmed: true })).receipt.reason, 'critical-healed');
  // Durables non gérés : reset-limb (Épaule disloquée), medical-attention-required, surgery-deadline…
  const unsupported = Array.from({ length: 200 }, (_, i) => i + 1).map(n => ['ARM', n]).filter(([table, n]) => (getV5CriticalEffect(table, n)?.parsed?.durableEffects || []).some(e => ['reset-limb', 'medical-attention-required', 'surgery-deadline', 'permanent-functional-loss', 'scar', 'disease'].includes(e.kind)));
  const [table, effectRoll] = unsupported[0] || ['LEG', 110];
  const odd = withRecord(table, effectRoll, 'odd');
  const store2 = await setup([odd.participant]);
  const oddId = await openCritical(store2, 'odd', odd.record.id);
  assert.equal((await store2.closeAftermathIncident({ operationId: 'c', incidentId: oddId, temporaryEffectsEnded: true })).receipt.reason, 'sequelae-follow-up-not-opened');
});

test('4 — une infection guérie par Guérison −1 laisse la blessure traitée (pas de réinfection)', () => {
  let state = reg(createAftermathState());
  state = advanceAftermathCalendar(state, { operationId: 'adv', expectedRevision: state.revision, days: 1, dailyTests: [{ incidentId: 'i1', day: 0, roll: 99 }], enduranceScores: { p1: 30 } }).state;
  const cured = treatInfection(state, { operationId: 't', expectedRevision: state.revision, incidentId: 'i1', healer: healer(), roll: 50 });
  assert.deepEqual([cured.state.incidents[0].infection, cured.state.incidents[0].bandaged], [false, true]);
  assert.deepEqual(previewAftermathAdvance(cured.state, { days: 1, expectedRevision: cured.state.revision }).requiredDailyChecks, []);
});

test('5 — Guérison est une compétence Avancée : aucun soin sans Avancement', () => {
  const state = reg(createAftermathState());
  const untrained = healer({ advances: 0 });
  assert.equal(treatWoundIncident(state, { operationId: 'a', expectedRevision: state.revision, incidentId: 'i1', healer: untrained, roll: 20, wounds: 5, supplies: true }).receipt.reason, 'heal-advance-required');
  const infected = advanceAftermathCalendar(state, { operationId: 'adv', expectedRevision: state.revision, days: 1, dailyTests: [{ incidentId: 'i1', day: 0, roll: 99 }], enduranceScores: { p1: 30 } }).state;
  assert.equal(treatInfection(infected, { operationId: 'b', expectedRevision: infected.revision, incidentId: 'i1', healer: untrained, roll: 20 }).receipt.reason, 'heal-advance-required');
});

test('6 — plusieurs soigneurs le même jour : chacun son Test de protection, un seul jour de maladie gagné', () => {
  let state = registerDisease(createAftermathState(), { id: 'd', operationId: 'r', expectedRevision: 0, participantId: 'p', label: 'Fièvre', durationDays: 5 }).state;
  const care = (current, operationId, id, rested = true) => careForDisease(current, { operationId, expectedRevision: current.revision, diseaseId: 'd', healer: healer({ participantId: id }), roll: 20, rested });
  const one = care(state, 'c1', 'h1');
  const two = care(one.state, 'c2', 'h2');
  assert.equal(two.receipt.status, 'applied', two.receipt.reason);
  assert.equal(two.receipt.carerProtected, true);
  assert.equal(two.state.diseases[0].remainingDays, 4, 'seul le premier repos du jour retire un jour');
  assert.equal(care(two.state, 'c3', 'h1').receipt.reason, 'care-already-recorded-today');
});

test('7 — chirurgie et traitement d’infection : un double enregistrement identique est refusé', () => {
  let state = reg(createAftermathState(), { requiresSurgery: true });
  state = advanceAftermathCalendar(state, { operationId: 'adv', expectedRevision: state.revision, days: 1, dailyTests: [{ incidentId: 'i1', day: 0, roll: 99 }], enduranceScores: { p1: 30 } }).state;
  const failed = treatInfection(state, { operationId: 'i-a', expectedRevision: state.revision, incidentId: 'i1', healer: healer(), roll: 96 });
  const twice = treatInfection(failed.state, { operationId: 'i-b', expectedRevision: failed.state.revision, incidentId: 'i1', healer: healer(), roll: 96 });
  assert.equal(twice.receipt.status, 'refused');
  assert.equal(twice.state.incidents[0].treatments.length, 1);
  const surgery = treatSurgicalIncident(failed.state, { operationId: 's-a', expectedRevision: failed.state.revision, incidentId: 'i1', healer: healer(), roll: 96 });
  const again = treatSurgicalIncident(surgery.state, { operationId: 's-b', expectedRevision: surgery.state.revision, incidentId: 'i1', healer: healer(), roll: 96 });
  assert.equal(again.receipt.status, 'refused');
});

test('9 — _runAftermathCommand n’est pas une API publique du Store', async () => {
  const store = await setup([base('patient')]);
  assert.equal(store._runAftermathCommand, undefined);
  assert.equal(store._aftermathHealer, undefined);
});

// Décision MJ 14 : chaque critique d'une même résolution rattache ses propres stateIds.
test('14 — deux critiques d’une même résolution : chacun ses stateIds, sans tout mettre sur le premier', async () => {
  const { actor, baseFixtureStore } = await import('./helpers/f2-j-two-criticals.mjs');
  const { store, preview } = await baseFixtureStore({ secondEffect: 10 });
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  const foe = store.listParticipants().find(row => row.id === 'foe');
  const [first, second] = foe.extensions.v5.criticalWounds;
  const aftermath = foe.extensions.v5.criticalAftermath;
  assert.ok(aftermath[0].sequela.states.length && aftermath[1].sequela.states.length, 'les deux critiques portent des États');
  assert.ok(second.stateIds.length > 0, 'le second critique a ses propres États');
  assert.equal(second.stateIds.filter(id => first.stateIds.includes(id)).length, 0, 'aucun État partagé');
  const keysOf = (ids) => ids.map(id => foe.states.find(row => row.id === id)?.key);
  for (const key of keysOf(second.stateIds)) assert.ok(aftermath[1].sequela.states.some(row => row.key === key));
  assert.ok(actor);
});

// Décisions MJ du 29/10.
test('10 — Talent Chirurgie (p.127) : hors combat, DR ou chiffre des unités du d100, choix explicite, 0 vaut 0', () => {
  const state = reg(createAftermathState());
  const surgeon = healer();
  const treat = (operationId, extra) => treatWoundIncident(state, { operationId, expectedRevision: state.revision, incidentId: 'i1', healer: surgeon, wounds: 5, supplies: true, ...extra });
  assert.equal(treat('a', { roll: 37 }).receipt.reason, 'surgery-talent-choice-required');
  // Score 60, jet 37 : 6 − 3 = 3 DR ; Bonus 5 ; unités 7.
  const sl = treat('b', { roll: 37, surgeryChoice: 'sl' });
  const units = treat('c', { roll: 37, surgeryChoice: 'units' });
  assert.deepEqual([sl.receipt.healed, units.receipt.healed, units.receipt.amountChoice], [8, 12, 'units']);
  assert.equal(treat('d', { roll: 20, surgeryChoice: 'units' }).receipt.healed, 5, 'un 0 aux unités vaut 0');
  assert.equal(treat('e', { roll: 37, inCombat: true }).receipt.healed, 8, 'en combat, le Talent ne change rien');
  assert.equal(treatWoundIncident(state, { operationId: 'f', expectedRevision: state.revision, incidentId: 'i1', healer: healer({ hasSurgeryTalent: false }), roll: 37, wounds: 5, supplies: true }).receipt.healed, 8);
});

test('11 — maladresse d’un Test de Chirurgie : 1d10 Blessures saisi, jamais sous 1 Blessure', async () => {
  const state = reg(createAftermathState(), { requiresSurgery: true });
  const operate = (operationId, extra) => treatSurgicalIncident(state, { operationId, expectedRevision: state.revision, incidentId: 'i1', healer: healer(), wounds: 4, ...extra });
  assert.equal(operate('a', { roll: 77 }).receipt.reason, 'fumble-d10-required');
  const fumble = operate('b', { roll: 77, d10: 9 });
  assert.deepEqual([fumble.receipt.status, fumble.receipt.fumbleDamage, fumble.receipt.currentWoundsAfter, fumble.state.incidents[0].surgeryCompleted], ['applied', 3, 1, false]);
  const surgeon = healerSheet({ id: 'surgeon', talents: [{ id: 'talent-surgery', status: 'resolved', rank: 1 }] });
  const { patient, record } = (() => { const stored = createCriticalAftermathRecord(base('patient', { hp: 4 }), { table: 'ARM', effectRoll: 56, resolutionId: 'res1' }); return { patient: stored.participant, record: stored.record }; })();
  const store = await setup([patient, surgeon]);
  const incidentId = await openCritical(store, 'patient', record.id);
  await store.treatAftermathSurgicalIncident({ operationId: 's', incidentId, healerId: 'surgeon', roll: 77, d10: 9 });
  assert.equal(get(store, 'patient').hp, 1);
});

test('12 — infection : un Test de Résistance par blessure non traitée et par soir, pour chaque blessure', () => {
  let state = reg(createAftermathState());
  state = registerWoundIncident(state, { id: 'i2', operationId: 'r2', expectedRevision: state.revision, participantId: 'p1', source: { kind: 'wounds-lost', cause: 'autre' } }).state;
  const preview = previewAftermathAdvance(state, { days: 1, expectedRevision: state.revision });
  assert.deepEqual(preview.requiredDailyChecks.map(row => [row.incidentId, row.day, row.difficultyDR]), [['i1', 0, 2], ['i2', 0, 2]]);
});

test('13 — Test de Guérison raté : la blessure n’est pas bandée', () => {
  const state = reg(createAftermathState());
  const failed = treatWoundIncident(state, { operationId: 'x', expectedRevision: state.revision, incidentId: 'i1', healer: healer({ hasSurgeryTalent: false }), roll: 90, wounds: 5, supplies: true });
  assert.deepEqual([failed.receipt.success, failed.state.incidents[0].bandaged], [false, false]);
});
