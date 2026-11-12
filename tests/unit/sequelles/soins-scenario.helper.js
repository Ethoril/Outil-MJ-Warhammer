// Scénario commun de soins (CAMP-10) : joué sur des participants présents (`combat`) ou sur des personnages
// suivis hors rencontre (`suivi`). Les reçus sont rendus avec les identifiants des sujets remplacés par P et H.
import { createStore } from '../../../js/core/store.js';
import { CURRENT_SCHEMA_VERSION } from '../../../js/core/migrations.js';
import { createCriticalAftermathRecord } from '../../../js/core/v5-critical-aftermath.js';

export const clone = structuredClone;
export const memoryPersistence = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
export const sheet = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 5, maxHp: 20, caracs: { E: 30, Int: 50 }, skills: [], talents: [], states: [], extensions: { v5: {} }, ...extra });
export const healerSheet = (extra = {}) => sheet('healer', { hp: 20, skills: [{ id: 'heal', name: 'Guérison', carac: 'Int', total: 60, advances: 10, status: 'resolved' }], talents: [{ id: 'talent-surgery', status: 'resolved', rank: 1 }], ...extra });
/** Blessure béante au bras (table F2-I) : chirurgie exigée, Hémorragique 2. */
export function woundedPatient(extra = {}) {
  const stored = createCriticalAftermathRecord(sheet('patient', extra), { table: 'ARM', effectRoll: 56, resolutionId: 'res1' });
  const patient = stored.participant;
  patient.extensions.v5.criticalWounds = [{ id: stored.record.criticalWoundId, name: 'Blessure béante', location: 'Bras', stateIds: ['st-bleed'] }];
  patient.states = [{ id: 'st-bleed', key: 'hemorragique', name: 'Hémorragique', level: 2 }];
  return { patient, record: stored.record };
}
export async function storeWith(envelope = {}, persistence = memoryPersistence()) {
  const store = createStore({ storage: null, persistence });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: CURRENT_SCHEMA_VERSION, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants: [] }, log: [], diceLines: [], extensions: { v5: {} }, ...envelope });
  return store;
}
export const combatOf = participants => ({ round: 0, currentActorId: null, order: [], participants });
/** Sépare une fiche en profil de réserve et personnage suivi (PV, États, Blessures Critiques). */
export function asFollowed(participant) {
  const { hp, states, extensions, zone, camp, ...profile } = participant;
  const { criticalAftermath, criticalWounds, ...v5 } = extensions?.v5 || {};
  return {
    profile: { ...profile, id: `profil-${participant.id}`, hp: participant.maxHp, extensions: { ...extensions, v5 } },
    character: { id: `pc-${participant.id}`, name: participant.name, kind: participant.kind, profileId: `profil-${participant.id}`, hp, maxHp: participant.maxHp, states,
      extensions: { v5: { ...(criticalAftermath ? { criticalAftermath } : {}), ...(criticalWounds ? { criticalWounds } : {}) } } }
  };
}
export const subjectsOf = store => (typeof store.listAftermathSubjects === 'function' ? store.listAftermathSubjects() : store.listParticipants());

export async function playCare(mode) {
  const { patient, record } = woundedPatient();
  const healer = healerSheet();
  let store, P = 'patient', H = 'healer';
  if (mode === 'combat') store = await storeWith({ combat: combatOf([patient, healer]) });
  else {
    const a = asFollowed(patient), b = asFollowed(healer);
    store = await storeWith({ reserve: [a.profile, b.profile], persistentCharacters: [a.character, b.character] });
    P = 'suivi:pc-patient'; H = 'suivi:pc-healer';
  }
  const receipts = [];
  const run = async (name, input) => { const out = await store[name](input); receipts.push([name, out?.receipt ?? out]); return out; };
  await run('registerAftermathIncident', { operationId: 'a1', participantId: P, cause: 'combat' });
  const woundId = store.getAftermathState().incidents[0]?.id;
  await run('treatAftermathWound', { operationId: 'a2', incidentId: woundId, healerId: H, roll: 20, supplies: true, surgeryChoice: 'sl' });
  await run('registerAftermathIncident', { operationId: 'a3', participantId: P, criticalId: record.id });
  const criticalId = store.getAftermathState().incidents[1]?.id;
  await run('treatAftermathSurgicalIncident', { operationId: 'a4', incidentId: criticalId, healerId: H, roll: 99, d10: 4 });
  await run('treatAftermathSurgicalIncident', { operationId: 'a5', incidentId: criticalId, healerId: H, roll: 20 });
  await run('registerAftermathDisease', { operationId: 'a6', participantId: P, label: 'Fièvre des marais', durationDays: 3 });
  await run('careForAftermathDisease', { operationId: 'a7', diseaseId: store.getAftermathState().diseases[0]?.id, healerId: H, roll: 20, rested: true });
  await run('recordAftermathCharacteristicLoss', { operationId: 'a8', participantId: P, carac: 'F', amount: 5, reason: 'Fièvre' });
  await run('decideAftermathImpressiveScars', { operationId: 'a9', participantId: P, agreed: true });
  await run('openAftermathSequelae', { operationId: 'a10', incidentId: criticalId });
  await run('closeAftermathIncident', { operationId: 'a11', incidentId: woundId, temporaryEffectsEnded: true });
  await run('registerAftermathIncident', { operationId: 'a12', participantId: P, cause: 'chute' });
  const fallId = store.getAftermathState().incidents[2]?.id;
  const preview = store.previewAftermathAdvance({ days: 1, expectedRevision: store.getAftermathState().revision });
  receipts.push(['previewAftermathAdvance', preview]);
  await run('advanceAftermathCalendar', { operationId: 'a13', days: 1, dailyTests: (preview.requiredDailyChecks || []).map(check => ({ incidentId: check.incidentId, day: check.day, roll: check.incidentId === fallId ? 30 : 95 })) });
  await run('treatAftermathInfection', { operationId: 'a13b', incidentId: criticalId, healerId: H, roll: 10 });
  await run('closeAftermathIncident', { operationId: 'a14', incidentId: criticalId, temporaryEffectsEnded: true });
  const subject = subjectsOf(store).find(row => row.id === P);
  const facts = { receipts, sujet: subject ? { hp: subject.hp, states: subject.states, criticalWounds: subject.extensions?.v5?.criticalWounds || [] } : null };
  const neutral = JSON.parse(JSON.stringify(facts).split(P).join('P').split(H).join('H').split('patient').join('P').split('healer').join('H'));
  return { store, P, H, neutral };
}
