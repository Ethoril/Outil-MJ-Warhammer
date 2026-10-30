// Golden master de l'API de createStore : scénario déterministe rejoué appel par appel, état sérialisé comparé à une
// référence générée une fois (tests/fixtures/store-golden.json). Garde-fou des refactorisations du store : un écart,
// même d'une erreur levée, est un changement de comportement. Régénération : GOLDEN_UPDATE=1 (jamais automatique).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createStore } from '../../../js/core/store.js';

const FIXTURE = fileURLToPath(new URL('../../fixtures/store-golden.json', import.meta.url));
const FIXED_TIME = Date.UTC(2026, 9, 30, 12, 0, 0);
const clone = value => structuredClone(value);
const sha = text => createHash('sha256').update(text).digest('hex').slice(0, 16);

function memoryPersistence() {
  let saved = null;
  return {
    async load() { return saved && clone(saved); },
    async saveAtomic({ state }) { saved = clone(state); return { ok: true }; },
    async listRestorePoints() { return []; },
    read() { return saved && clone(saved); }
  };
}

function memoryStorage() {
  const data = new Map();
  return { getItem: key => (data.has(key) ? data.get(key) : null), setItem: (key, value) => { data.set(key, String(value)); }, removeItem: key => { data.delete(key); } };
}

// uid, Math.random, Date, crypto.randomUUID figés ; tout est restauré en finally.
function freezeEnvironment() {
  const saved = { random: Math.random, Date: globalThis.Date, uuid: Object.getOwnPropertyDescriptor(globalThis.crypto, 'randomUUID') };
  let seed = 123456789, counter = 0;
  Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const RealDate = saved.Date;
  class FrozenDate extends RealDate {
    constructor(...args) { if (args.length === 0) super(FIXED_TIME); else super(...args); }
    static now() { return FIXED_TIME; }
  }
  globalThis.Date = FrozenDate;
  Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, writable: true, value: () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}` });
  return () => {
    Math.random = saved.random;
    globalThis.Date = saved.Date;
    if (saved.uuid) Object.defineProperty(globalThis.crypto, 'randomUUID', saved.uuid); else delete globalThis.crypto.randomUUID;
  };
}

const plain = value => JSON.stringify(value, (key, item) => {
  if (item === undefined) return '__undefined__';
  if (typeof item === 'function') return `__function/${item.length}__`;
  if (typeof item === 'bigint') return `${item}n`;
  if (item instanceof Map) return { __map__: [...item] };
  if (item instanceof Set) return { __set__: [...item] };
  return item;
});

const hero = () => ({
  id: 'hero', name: 'Héros', kind: 'PJ', camp: 'pj', zone: 'active', initiative: 45, hp: 12, maxHp: 20, states: [], equipment: [],
  baseCaracs: { CC: 54, CT: 41, FM: 50, Int: 40, Ag: 45, E: 40, F: 40 }, caracs: { CC: 54, CT: 41, FM: 50, Int: 40, Ag: 45, E: 40, F: 40 },
  skills: [
    { id: 'melee-base', name: 'Corps à corps (Base)', carac: 'CC', base: 54, advances: 1, total: 59 },
    { id: 'skill-52_e9_73_69_73_74_61_6e_63_65-base', name: 'Résistance', carac: 'E', base: 40, advances: 0, total: 40 }
  ],
  actions: [{ id: 'attack', type: 'attack', base: 55, attr: 'CC', damage: 4 }]
});
const foe = (id, name, initiative) => ({ id, name, kind: 'Créature', camp: 'ennemi', zone: 'active', initiative, hp: 9, maxHp: 9, states: [], caracs: { CC: 35, E: 30, Ag: 30 }, actions: [{ id: 'bite', type: 'attack', base: 35, attr: 'CC', damage: 3 }] });
const mage = () => ({ ...hero(), id: 'mage', name: 'Mage', initiative: 38, caracs: { CC: 30, CT: 30, FM: 60, Int: 55, Ag: 40, E: 35, F: 30 }, baseCaracs: { CC: 30, CT: 30, FM: 60, Int: 55, Ag: 40, E: 35, F: 30 } });

// Liste des étapes : [libellé, (store, mémoire) => résultat]. Les ids sont explicites pour que le scénario ne dépende pas des uid.
function scenarioSteps() {
  const steps = [];
  const add = (label, run) => steps.push([label, run]);
  const profile = (id, name, kind, hp) => ({ id, name, kind, hp, maxHp: hp, initiative: 30, caracs: { CC: 40, E: 35, Ag: 35 } });

  // Profils
  add('addProfile gobelin', s => s.addProfile(profile('p-gob', 'Gobelin', 'Créature', 8)));
  add('addProfile garde', s => s.addProfile(profile('p-garde', 'Garde', 'PNJ', 12)));
  add('addProfile héros', s => s.addProfile(profile('p-hero', 'Héros', 'PJ', 20)));
  add('updateProfile', s => s.updateProfile('p-gob', { name: 'Gobelin des mines', hp: 10, notes: 'Lâche' }));
  add('duplicateProfile', s => s.duplicateProfile('p-garde'));
  add('listProfiles', s => s.listProfiles());
  add('getProfile', s => s.getProfile('p-gob'));
  add('removeProfile', s => s.removeProfile('p-garde'));
  add('importParsedProfiles', s => s.importParsedProfiles([profile('p-imp', 'Importé', 'PNJ', 6)]));
  add('getReserve', s => s.getReserve());

  // Combat : participants, états, initiative, ordre, tours
  add('addParticipant hero', s => s.addParticipant(hero()));
  add('addParticipant mage', s => s.addParticipant(mage()));
  add('addParticipant gob1', s => s.addParticipant(foe('gob1', 'Gobelin 1', 33)));
  add('addParticipant gob2', s => s.addParticipant(foe('gob2', 'Gobelin 2', 31)));
  add('addParticipant banc', s => s.addParticipant({ ...foe('gob3', 'Gobelin 3', 20), zone: 'bench' }));
  add('listParticipants', s => s.listParticipants());
  add('updateParticipant', s => s.updateParticipant('gob1', { name: 'Gobelin borgne', notes: 'Une dent' }));
  add('acquireConditions', s => s.acquireConditions('gob1', [{ key: 'sonne', name: 'Sonné', level: 1 }]));
  add('recoverCondition', s => s.recoverCondition('gob1', 'sonne'));
  add('healWounds', s => s.healWounds('hero', 3));
  add('moveParticipant', s => s.moveParticipant('gob3', 'active'));
  add('rebuildOrder', s => s.rebuildOrder());
  add('getEffectiveOrder', s => s.getEffectiveOrder());
  add('getOrderMode', s => s.getOrderMode());
  add('setOrderMode', s => s.setOrderMode('manual'));
  add('moveInOrder', s => s.moveInOrder({ id: 'gob2', index: 0 }));
  add('insertReinforcement', s => s.insertReinforcement({ id: 'gob3', index: 1 }));
  add('isCombatInitiativeInitialized', s => s.isCombatInitiativeInitialized());
  add('previewCombatInitialization', s => s.previewCombatInitialization());
  add('applyCombatInitialization', s => s.applyCombatInitialization());
  add('setRoundTurn', s => s.setRoundTurn(1, 'hero'));
  add('nextTurn 1', s => s.nextTurn());
  add('nextTurn 2', s => s.nextTurn());
  add('nextTurn 3', s => s.nextTurn());
  add('consumeTurnSelection', s => s.consumeTurnSelection());
  add('getCombat', s => s.getCombat());
  add('removeParticipant', s => s.removeParticipant('gob3'));
  add('addImprovisedParticipant', s => s.addImprovisedParticipant({ id: 'impro', name: 'Badaud', hp: 5 }));
  add('setMountedState', s => s.setMountedState('hero', { mounted: false }));
  add('advanceCampaignTime', s => s.advanceCampaignTime({ seconds: 600, reason: 'Fouille' }));
  add('advanceTalentMinutes', s => s.advanceTalentMinutes(5));
  add('startTalentSession', s => s.startTalentSession());

  // Lignes de dés, journal
  add('addDiceLine', s => s.addDiceLine({ id: 'dl1', participantId: 'hero', type: 'attack', attr: 'CC', base: 55, damage: 4 }));
  add('updateDiceLine', s => s.updateDiceLine('dl1', { mod: 10 }));
  add('duplicateDiceLine', s => s.duplicateDiceLine('dl1'));
  add('getDiceLines', s => s.getDiceLines());
  add('removeDiceLine', s => s.removeDiceLine('dl1'));
  add('log', s => s.log('Essai de journal'));
  add('getLog', s => s.getLog());
  add('clearLog', s => s.clearLog());

  // Chance, Destin
  add('setFortune', s => s.setFortune('hero', 3, { reason: 'Début de séance' }));
  add('setFate', s => s.setFate('hero', 2, { reason: 'Début de séance' }));
  add('getFortune', s => s.getFortune('hero'));
  add('getFate', s => s.getFate('hero'));
  add('consumeTemporaryFortune', s => s.consumeTemporaryFortune('hero'));

  // Résolution d'action
  add('previewResolution', (s, memory) => (memory.resolution = s.previewResolution({ actorId: 'hero', targetId: 'gob1', resolutionId: 'golden-1', roll: 30, action: { type: 'attack', attr: 'CC', base: 55, damage: 4 } })));
  add('applyResolution', (s, memory) => s.applyResolution(memory.resolution));
  add('simulateAction', s => s.simulateAction({ actorId: 'hero', targetId: 'gob2', roll: 20, action: { type: 'attack', attr: 'CC', base: 55, damage: 4 } }));
  add('getSimulationState', s => s.getSimulationState());
  add('discardSimulation', s => s.discardSimulation());
  add('previewV5CombatAction', s => s.previewV5CombatAction({ actorId: 'hero' }));
  add('getReactionOpportunities', s => s.getReactionOpportunities('gob1'));
  add('healCriticalWound', s => s.healCriticalWound('hero', 'none'));
  add('previewSuddenDeath', s => s.previewSuddenDeath('hero'));
  add('setSuddenDeathEnabled', s => s.setSuddenDeathEnabled(true));

  // Corruption
  add('setCorruptionPoints', s => s.setCorruptionPoints('hero', 1, { reason: 'Départ' }));
  add('getCorruptionStatus', s => s.getCorruptionStatus('hero'));
  add('previewCorruptionExposure', (s, memory) => (memory.exposure = s.previewCorruptionExposure('hero', { influence: 'moderate', exposure: 'prolonged', skillId: 'skill-52_e9_73_69_73_74_61_6e_63_65-base', roll: 70, declaredSources: 'Artefact' })));
  add('applyCorruptionExposure', (s, memory) => s.applyCorruptionExposure('hero', memory.exposure));
  add('getCorruptionMutationCatalog', s => s.getCorruptionMutationCatalog().length);
  add('declareWarpstoneDailyExposure', s => s.declareWarpstoneDailyExposure({ participantId: 'hero' }));
  add('previewCorruptionThresholdTest', s => s.previewCorruptionThresholdTest('hero'));
  add('applyCorruptionAbsolution', s => s.applyCorruptionAbsolution({ participantId: 'hero', reason: 'Absolution du MJ' }));

  // Magie
  add('getSpellContract', s => s.getSpellContract('Carreau'));
  add('previewChannelling', s => s.previewChannelling({ actorId: 'mage', roll: 40 }));
  add('previewCasting', (s, memory) => (memory.casting = s.previewCasting(s.getSpellContract('Carreau'), { actorId: 'mage', roll: 61 })));
  add('applyCasting', (s, memory) => s.applyCasting(memory.casting, { actorId: 'mage' }));
  add('previewMiscast', s => s.previewMiscast({ actorId: 'mage', roll: 5 }));
  add('previewBurnout', s => s.previewBurnout({ actorId: 'mage' }));
  add('getCadaiRunes', s => s.getCadaiRunes());
  add('previewDispelCasting', s => s.previewDispelCasting({ actorId: 'mage' }));
  add('applySpellEffects', s => s.applySpellEffects('mage', []));
  add('expireSpellEffects', s => s.expireSpellEffects('mage'));
  add('previewLoreAttribute', s => s.previewLoreAttribute({ actorId: 'mage' }));
  add('getHighMagicExecutions', s => s.getHighMagicExecutions());
  add('previewSpellInteraction', s => s.previewSpellInteraction({ actorId: 'mage' }));

  // Divin
  add('getAllDivineContracts', s => Object.keys(s.getAllDivineContracts()).length);
  add('getDivineAccessGrants', s => s.getDivineAccessGrants());
  add('resolveDivineAccess', s => s.resolveDivineAccess('hero', 'sigmar-prayer'));
  add('setSanctifiedGround', s => s.setSanctifiedGround({ label: 'Ermitage', radiusYards: 30, sinThreshold: 3, effect: 'ablaze', reason: 'Terre sanctifiée' }));
  add('removeSanctifiedGround', s => s.removeSanctifiedGround('absent'));
  add('getDivineDailyWrathStatus', s => s.getDivineDailyWrathStatus('hero'));
  add('getDivineSinEvents', s => s.getDivineSinEvents());
  add('getDivineSinReminders', s => s.getDivineSinReminders());
  add('previewDivineSinEvent', s => s.previewDivineSinEvent({ participantId: 'hero' }));
  add('previewDivineAbsolution', s => s.previewDivineAbsolution({ participantId: 'hero' }));
  add('previewDivineWrathRecovery', s => s.previewDivineWrathRecovery({ participantId: 'hero' }));
  add('previewDivineNavalEvent', s => s.previewDivineNavalEvent({ participantId: 'hero' }));
  add('setDivineSin', s => s.setDivineSin('hero', 1, { reason: 'Essai' }));
  add('canManageDivinePenances', s => s.canManageDivinePenances());
  add('getDivinePenanceExamples', s => s.getDivinePenanceExamples().length);
  add('setDivineRelic', s => s.setDivineRelic('hero', { label: 'Relique', deity: 'Sigmar', prayerSL: 1, wrathReduction: 10, reason: 'Don' }));

  // Séquelles
  add('getAftermathState', s => s.getAftermathState());
  add('registerAftermathIncident', s => s.registerAftermathIncident({ operationId: 'golden-incident', participantId: 'hero' }));
  add('listAftermathSequelae', s => s.listAftermathSequelae());
  add('listAftermathProposals', s => s.listAftermathProposals());
  add('previewAftermathAdvance', s => s.previewAftermathAdvance({}));
  add('advanceAftermathCalendar', s => s.advanceAftermathCalendar({ operationId: 'golden-calendar', days: 1 }));

  // Rencontres, scènes, événements
  add('saveEncounter', s => s.saveEncounter({ id: 'enc-1', title: 'Embuscade', entries: [{ id: 'e1', profileId: s.listProfiles().find(row => row.name === 'Gobelin des mines')?.id, quantity: 2, camp: 'ennemi', zone: 'active' }] }));
  add('listEncounters', s => s.listEncounters());
  add('duplicateEncounter', s => s.duplicateEncounter('enc-1'));
  add('setEncounterEntry', s => s.setEncounterEntry('enc-1', s.listProfiles().find(row => row.name === 'Gobelin des mines')?.id, { quantity: 3 }));
  add('previewEncounterLaunch', s => s.previewEncounterLaunch('enc-1'));
  add('launchEncounter', s => s.launchEncounter('enc-1'));
  add('suspendActiveScene', s => s.suspendActiveScene());
  add('getActiveScene', s => s.getActiveScene());
  add('listSuspendedScenes', s => s.listSuspendedScenes());
  add('createSceneClock', s => s.createSceneClock({ id: 'clk', label: 'Alarme', segments: 4 }));
  add('saveSceneEvent', s => s.saveSceneEvent({ id: 'evt', title: 'Cloche', clockId: 'clk' }));
  add('savePersistentCharacter', s => s.savePersistentCharacter({ id: 'pc-1', name: 'Capitaine', kind: 'PNJ', hp: 15 }));
  add('listPersistentCharacters', s => s.listPersistentCharacters());
  add('deletePersistentCharacter', s => s.deletePersistentCharacter('pc-1'));
  add('deleteEncounter', s => s.deleteEncounter('enc-1'));
  add('previewCombatRestart', s => s.previewCombatRestart());
  add('restartCombat', s => s.restartCombat());
  add('getKeywordReferential', s => Object.keys(s.getKeywordReferential() || {}));
  add('addCreatureKeyword', s => s.addCreatureKeyword({ participantId: 'hero', keyword: 'Mortel' }));
  add('getReminders', s => s.getReminders());
  add('listReminderChoices', s => s.listReminderChoices());

  // Historique annuler/refaire
  add('canUndo', s => s.canUndo());
  add('captureSnapshot', s => s.captureSnapshot());
  add('updateParticipant avant undo', s => s.updateParticipant('hero', { notes: 'Avant annulation' }));
  add('undo', s => s.undo());
  add('canRedo', s => s.canRedo());
  add('redo', s => s.redo());
  add('getHistory', s => s.getHistory());
  add('executeCommand', s => s.executeCommand('golden-command', draft => ({ ...draft, log: [...(draft.log || []), { id: 'golden-log', ts: 0, time: '', kind: 'note', text: 'Commande' }] })));
  add('batch', s => s.batch(() => { s.log('Dans un lot'); }));
  add('getLocalRevision', s => s.getLocalRevision());

  // Export / import JSON
  add('getFullJSON', (s, memory) => { memory.json = s.getFullJSON(); return memory.json.length; });
  add('previewImport', (s, memory) => s.previewImport(memory.json));
  add('previewImport invalide', s => s.previewImport('{pas du json'));
  add('resetCombat', s => s.resetCombat());
  add('clearReserve', s => s.clearReserve());
  add('loadFromJSON', (s, memory) => s.loadFromJSON(memory.json));
  add('loadFromJSON invalide', s => s.loadFromJSON('[]'));
  add('listRestorePoints', s => s.listRestorePoints());
  add('usesPersistence', s => s.usesPersistence());
  add('whenIdle', s => s.whenIdle());
  return steps;
}

// Appels hors réseau et hors synchro non joués par le scénario : balayés sans argument, l'erreur éventuelle fait partie de l'instantané.
const SWEEP_SKIP = new Set(['detachSync', 'attachSync', 'switchContext', 'resolveSyncRemote', 'resolveSyncLocal', 'importGuestSnapshot', 'retryHydration', 'exportSyncConflict', 'executeCommand', 'batch', 'ready']);

async function settle(call) {
  try {
    return { value: await call() };
  } catch (error) {
    return { error: `${error?.name || 'Error'}: ${error?.message ?? String(error)}` };
  }
}

async function record(api, label, call, out) {
  const outcome = await settle(call);
  const entry = { label };
  if ('error' in outcome) entry.error = outcome.error; else entry.result = sha(plain(outcome.value));
  const state = await settle(() => api.getFullJSON());
  entry.state = 'error' in state ? `error:${state.error}` : sha(state.value);
  out.push(entry);
}

async function play(kind) {
  const restore = freezeEnvironment();
  const consoleError = console.error;
  console.error = () => {};
  const entries = [];
  try {
    const persistence = kind === 'persistence' ? memoryPersistence() : null;
    const storage = kind === 'persistence' ? null : memoryStorage();
    const api = createStore({ storage, persistence, contextId: 'golden', divineAuthority: 'MJ', appVersion: 'golden', now: () => '12:00:00' });
    const keys = Object.keys(api).map(key => `${key}/${typeof api[key] === 'function' ? api[key].length : typeof api[key]}`);
    await api.ready;
    const memory = {};
    for (const [label, run] of scenarioSteps()) await record(api, label, () => run(api, memory), entries);
    for (const key of Object.keys(api)) {
      if (SWEEP_SKIP.has(key) || typeof api[key] !== 'function') continue;
      await record(api, `sweep ${key}`, () => api[key](), entries);
    }
    return { keys, entries };
  } finally {
    console.error = consoleError;
    restore();
  }
}

async function scenario() {
  return { persistence: await play('persistence'), storage: await play('storage') };
}
let firstRun = null;
const firstScenario = () => (firstRun ??= scenario());

test('Golden master du store : API, résultats et état après chaque appel identiques à la référence', async () => {
  const actual = JSON.parse(JSON.stringify(await firstScenario()));
  if (process.env.GOLDEN_UPDATE === '1') {
    writeFileSync(FIXTURE, `${JSON.stringify(actual, null, 1)}\n`);
    return;
  }
  assert.ok(existsSync(FIXTURE), 'référence absente : GOLDEN_UPDATE=1 pour la générer sur le commit de départ');
  const expected = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  for (const kind of ['persistence', 'storage']) {
    assert.deepEqual(actual[kind].keys, expected[kind].keys, `${kind} : clés de l'API (ordre) et arités`);
    assert.equal(actual[kind].entries.length, expected[kind].entries.length, `${kind} : nombre d'appels`);
    actual[kind].entries.forEach((entry, index) => assert.deepEqual(entry, expected[kind].entries[index], `${kind} #${index} ${expected[kind].entries[index].label}`));
  }
});

test('Golden master du store : le scénario est rejouable à l’identique dans le même processus', async () => {
  const first = JSON.stringify(await firstScenario());
  const second = JSON.stringify(await scenario());
  assert.equal(first, second);
});

test('Golden master du store : le balayage couvre toute l’API et l’environnement est restauré', async () => {
  const before = { random: Math.random, Date, uuid: globalThis.crypto.randomUUID };
  const actual = await firstScenario();
  assert.equal(Math.random, before.random);
  assert.equal(Date, before.Date);
  assert.equal(globalThis.crypto.randomUUID, before.uuid);
  const functions = actual.persistence.keys.filter(key => !key.endsWith('/object')).map(key => key.split('/')[0]);
  const called = new Set(actual.persistence.entries.map(entry => entry.label));
  for (const name of functions.filter(key => !SWEEP_SKIP.has(key))) assert.ok(called.has(`sweep ${name}`), name);
  assert.ok(actual.persistence.entries.length >= 150, `${actual.persistence.entries.length} appels`);
});
