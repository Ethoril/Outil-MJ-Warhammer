// Balayage de la relecture du compte (RTDB) : un état riche du Store est écrit sur le compte, relu tel que RTDB le rend
// (tableaux vides, objets vides et propriétés nulles retirés), adopté par un second appareil, puis on rejoue des commandes
// courantes. Toute erreur ou tout refus qui n'apparaît pas quand le même document est relu intact est un défaut de lecture.
import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { createPersistence } from '../../../js/core/persistence.js';
import { createStore } from '../../../js/core/store.js';
import { createSyncSession, normalizeRemoteDocument } from '../../../js/core/sync-session.js';
import { createSyncDocument, transactionUpdate } from '../../../js/core/sync-protocol.js';
import { CURRENT_SCHEMA_VERSION } from '../../../js/core/migrations.js';
import { getDivineContract } from '../../../js/core/v5-divine-store.js';
import { buildExpiry } from '../../../js/ui/v5-divine-form-model.js';
import { woundedPatient, healerSheet, asFollowed, memoryPersistence } from '../sequelles/soins-scenario.helper.js';
import { rtdb } from './rtdb.helper.js';

const HOWL = 'divine:miracle:ulric:howl-of-the-wolf';
// Combattant des caractérisations F2-B (jets-et-defense) : Carreau, Prière, Langue (Magick).
const person = (id, extra = {}) => ({
  id, name: id, kind: 'PJ', camp: id === 'a' ? 'pj' : 'ennemi', zone: 'active', initiative: 60,
  hp: 40, maxHp: 40, caracs: { CC: 60, CT: 60, F: 40, E: 30, I: 50, Ag: 40, Dex: 40, Int: 60, FM: 60, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', carac: 'Soc', total: 60, status: 'resolved' },
    { name: 'Langue (Magick)', carac: 'Int', total: 70, status: 'resolved' }],
  talents: [], prayers: [], spells: [{ name: 'Carreau', status: 'resolved' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { hasMomentum: false, divine: { sin: 0 }, magic: { reserve: { type: 'winds', sl: 0 } } } },
  ...extra
});
const strike = (id, v5 = {}) => ({ resolutionId: id, actorId: 'a', targetId: 'b', roll: 25, action: { id: 'blade', type: 'attack', attr: 'CC', base: 60, damage: 5 },
  defense: { base: 35, roll: 80 }, v5: { kind: 'melee', ...v5 } });

/** Rencontre en cours (trois combattants), Chance, quotas et actions consommés, sort et prière actifs, États, réaction ouverte,
 * suivis avec Blessure Critique, registre de soins, horloge avancée. */
async function richStore({ quota }) {
  const contract = getDivineContract(HOWL);
  const priest = person('a', { talents: [{ id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ulric' }, { id: 'talent-furious-assault', name: 'Assaut furieux', status: 'resolved', rank: 1 }],
    prayers: [{ name: contract.catalogueName, status: 'resolved' }] });
  const { patient, record } = woundedPatient();
  const followed = asFollowed(patient), healer = asFollowed(healerSheet());
  const store = createStore({ persistence: memoryPersistence(), storage: null });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: CURRENT_SCHEMA_VERSION, reserve: [followed.profile, healer.profile], persistentCharacters: [followed.character, healer.character],
    log: [], diceLines: [], extensions: { v5: { combatId: 'balayage', turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'a', order: ['a', 'b', 'c'], participants: [priest, person('b'), { ...person('c'), states: [{ id: 'st-c', key: 'sonne', name: 'Sonné', level: 1 }] }] } });
  const ok = (label, outcome) => { assert.notEqual(outcome?.ok, false, `${label} : ${JSON.stringify(outcome)}`); return outcome; };
  ok('Chance', await store.setFortune('a', 3));
  ok('séance', await store.startTalentSession());
  // Attaque payée (Chance + quota de rencontre) : elle ouvre aussi l'Assaut furieux (coût en Élan, quota de Round, sans exemption).
  const paid = store.previewResolution(strike('balayage-paye', { costs: [{ id: 'fortune-balayage', resource: 'fortune', amount: 1 }], quotas: quota ? [{ id: 'balayage-quota', scope: 'encounter', maximum: 3 }] : [] }));
  assert.deepEqual(paid.unresolved, []);
  assert.equal((await store.applyResolution(paid)).status, 'applied');
  await store.applySpellExecution('Carreau', { actorId: 'a', targetIds: ['b'], roll: 23, miscastRoll: 15, attributeActive: false, locationRoll: 34 });
  ok('effet de sort', await store.applySpellEffects('c', { spellId: 'blind', duration: '1 Round', conditions: ['Aveuglé'] }));
  const actor = store.listParticipants().find(row => row.id === 'a');
  const prayer = store.previewDivineExecution(HOWL, { actorId: 'a', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    expiry: buildExpiry({ contract, actor, choices: {}, round: 1, phase: 'endOfTurn' }) });
  assert.equal(prayer.ready, true, JSON.stringify(prayer));
  await store.applyDivineExecution(HOWL, { preview: prayer });
  await store.acquireConditions('c', [{ key: 'sonne', name: 'Sonné', level: 1 }]);
  ok('incident', await store.registerAftermathIncident({ operationId: 'balayage-i1', participantId: 'suivi:pc-patient', criticalId: record.id }));
  ok('maladie', await store.registerAftermathDisease({ operationId: 'balayage-d1', participantId: 'suivi:pc-patient', label: 'Fièvre', durationDays: 2 }));
  ok('horloge', await store.advanceCampaignTime({ seconds: 60, reason: 'Souffle' }));
  return store;
}

/** Transport du compte équivalent à celui de sync.js ; `strip` rend chaque lecture telle que RTDB la stocke. */
function account(document, { strip }) {
  const stored = value => (strip ? rtdb(value) : JSON.parse(JSON.stringify(value)));
  let current = stored(document);
  return {
    async read() { return current; },
    async transaction(operation) {
      const next = transactionUpdate(normalizeRemoteDocument(current), operation);
      if (next === undefined) return { status: 'aborted', root: current };
      current = stored(next);
      return { status: 'committed', root: current };
    },
    subscribe: () => () => {}
  };
}

let databases = 0;
/** Second appareil : stockage local vide, adopte le document du compte par la vraie session de synchronisation. */
async function adopt(document, options) {
  const persistence = createPersistence({ indexedDB, dbName: `relecture-rtdb-${process.pid}-${databases += 1}`, contextId: 'guest' });
  const store = createStore({ persistence });
  await store.ready;
  const transport = account(document, options);
  store.attachSync({ dbRef: {}, contextId: 'guest', createSession: sessionOptions => createSyncSession({ ...sessionOptions, transport }) });
  const count = document.state.combat.participants.length;
  for (let i = 0; i < 300 && store.listParticipants().length !== count; i += 1) await new Promise(done => setTimeout(done, 5));
  assert.equal(store.listParticipants().length, count, 'le document du compte est adopté');
  return { store, close: () => { store.detachSync(); persistence.close(); } };
}

/** Ce qui distingue un succès d'un refus : erreur levée, ou statut, prêt, raison et questions en suspens d'un résultat. */
async function outcome(call) {
  try {
    const value = await call();
    if (!value || typeof value !== 'object') return { value: typeof value };
    const pick = ['status', 'ok', 'ready', 'valid', 'reason', 'error', 'code'].filter(key => key in value && typeof value[key] !== 'object');
    return { ...Object.fromEntries(pick.map(key => [key, value[key]])), ...(Array.isArray(value.unresolved) ? { unresolved: value.unresolved } : {}),
      ...(value.actionCosts ? { costsReady: value.actionCosts.ready } : {}) };
  } catch (error) { return { error: error?.message ?? String(error) }; }
}

/** Commandes courantes : réaction, attaque, fin de Tour, fin de Round, soins, annulation ; puis lectures et commandes sans argument. */
function commands() {
  const reaction = store => {
    const offer = store.getReactionOpportunities('a')[0];
    if (!offer) throw new Error('aucune réaction ouverte');
    return store.previewResolution({ resolutionId: 'balayage-reaction', actorId: 'a', targetId: 'b', action: structuredClone(offer.action), roll: 61, defense: { base: 20, roll: 81 },
      v5: { kind: 'melee', reactionId: offer.id, costs: [], quotas: [] } });
  };
  const memory = {}; // propre à chaque appareil : commands() est rappelée pour chacun
  return [
    ['réactions ouvertes', store => store.getReactionOpportunities('a').length],
    ['aperçu de réaction', store => (memory.reaction = reaction(store))],
    ['réaction', store => store.applyResolution(memory.reaction)],
    ['aperçu d’action V5', store => store.previewV5CombatAction({ actorId: 'a' })],
    ['attaque avec coût et quota', async store => store.applyResolution(store.previewResolution(strike('balayage-attaque', { costs: [{ id: 'fortune-2', resource: 'fortune', amount: 1 }], quotas: [{ id: 'balayage-quota', scope: 'encounter', maximum: 3 }] })))],
    ['fin de Tour', store => store.nextTurn()],
    ['fin de Tour 2', store => store.nextTurn()],
    ['fin de Round', store => store.nextTurn()],
    ['attaque au Round 2', async store => store.applyResolution(store.previewResolution({ ...strike('balayage-round-2'), defense: { base: 35, roll: 80 } }))],
    ['soin de maladie', store => store.careForAftermathDisease({ operationId: 'balayage-soin', diseaseId: store.getAftermathState().diseases[0]?.id, healerId: 'suivi:pc-healer', roll: 20, rested: true })],
    ['nouvelle maladie', store => store.registerAftermathDisease({ operationId: 'balayage-d2', participantId: 'suivi:pc-patient', label: 'Toux', durationDays: 1 })],
    ['jour de convalescence', store => store.advanceAftermathCalendar({ operationId: 'balayage-jour', days: 1, dailyTests: (store.previewAftermathAdvance({ days: 1, expectedRevision: store.getAftermathState().revision }).requiredDailyChecks || []).map(check => ({ incidentId: check.incidentId, day: check.day, roll: 30 })) })],
    ['avance de l’horloge', store => store.advanceCampaignTime({ seconds: 60, reason: 'Repos' })],
    ['annulation', store => store.undo()],
    ['annulation 2', store => store.undo()],
    ['rétablissement', store => store.redo()],
    ['séquelles', store => store.listAftermathSequelae()],
    ['accès divins', store => store.getDivineAccessGrants()],
    ['effets de sort expirés', store => store.expireSpellEffects('c')],
    ['soin de Blessures', store => store.healWounds('b', 2)],
    ['rappels', store => store.getReminders()],
    ['relance du combat', store => store.previewCombatRestart()],
    ['remise à zéro du combat', store => store.restartCombat()]
  ];
}

// Appels sans argument du golden master (store-golden), hors synchronisation et hors appels qui remplacent tout l'état.
const SWEEP_SKIP = new Set(['detachSync', 'attachSync', 'switchContext', 'resolveSyncRemote', 'resolveSyncLocal', 'importGuestSnapshot', 'retryHydration', 'exportSyncConflict', 'executeCommand', 'batch', 'ready',
  'loadFromJSON', 'resetCombat', 'clearReserve', 'clearLog', 'getFullJSON', 'captureSnapshot', 'whenIdle', 'listRestorePoints']);
/** Déroule les commandes puis tous les appels sans argument ; chaque résultat est rangé sous son libellé. */
async function play(store) {
  const results = [];
  for (const [name, run] of commands()) results.push([name, await outcome(() => run(store))]);
  for (const key of Object.keys(store).sort()) {
    if (SWEEP_SKIP.has(key) || typeof store[key] !== 'function') continue;
    results.push([`sans argument : ${key}`, await outcome(() => store[key]())]);
  }
  return results;
}

for (const quota of [true, false]) test(`balayage${quota ? '' : ' (Chance dépensée sans quota)'} : un état riche relu de RTDB se comporte comme le même document relu intact`, async () => {
  const origin = await richStore({ quota });
  const document = createSyncDocument(JSON.parse(origin.getFullJSON()), { revision: 3 });
  // Le scénario doit porter les registres exposés, sinon le balayage ne prouverait rien.
  const v5 = document.state.extensions.v5;
  assert.ok(v5.actionLedger.appliedActions.length && v5.actionLedger.quotaUsage.length === (quota ? 1 : 0), 'registre des usages');
  assert.ok(v5.reactionOpportunities.some(row => !row.exemptions.length), 'réaction ouverte sans exemption');
  assert.ok(v5.aftermathRegister.incidents.length && v5.gameClock.revision > 0 && v5.divineAccess, 'soins, horloge, accès divins');
  assert.notDeepEqual(rtdb(document), document);
  // Relu de RTDB, le document passe la frontière distante.
  assert.doesNotThrow(() => normalizeRemoteDocument(rtdb(document)));
  const intact = await adopt(document, { strip: false });
  const stripped = await adopt(document, { strip: true });
  try {
    const expected = await play(intact.store);
    const actual = await play(stripped.store);
    assert.ok(expected.filter(([, result]) => !result.error).length > expected.length / 2, 'la plupart des commandes réussissent sur le document intact : ' + JSON.stringify(expected));
    const defects = actual.filter(([name, result], index) => JSON.stringify(result) !== JSON.stringify(expected[index][1]))
      .map(([name, result], index) => `${name} : ${JSON.stringify(result)} au lieu de ${JSON.stringify(expected.find(([other]) => other === name)[1])}`);
    assert.deepEqual(defects, [], 'défauts de relecture RTDB');
  } finally { intact.close(); stripped.close(); }
});
