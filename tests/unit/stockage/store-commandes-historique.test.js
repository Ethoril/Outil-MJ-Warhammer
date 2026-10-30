import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { Participant, DiceLine, Profile, cloneValue, normalizeAction } from '../../../js/core/models.js';
import { CommandError, createCommand, createStateCommand, executeCommand, inverseCommand, replayCommand } from '../../../js/core/commands.js';
import { DEFAULT_HISTORY_MAX_BYTES, MAX_HISTORY_COMMANDS, canRedo, canUndo, createHistory, markExternalBoundary, recordCommand, redo, undo } from '../../../js/core/history.js';
import { sanitizeProfile } from '../../../js/core/sanitize.js';
import { migrateSnapshot } from '../../../js/core/migrations.js';
import { createEncounter, setEncounterEntry, launchEncounter, addImprovisedParticipant, suspendScene, resumeScene, duplicateEncounter, normalizeCamp, ENCOUNTER_STATUS_LABELS, encounterDisplayStatus, encounterSummary, sortEncountersForDisplay } from '../../../js/core/encounters.js';
import { REMINDER_DECISIONS, deriveReminders, pendingReminders, resolveReminder } from '../../../js/core/reminders.js';
import { advanceSceneClock, createIntention, createScene, createSceneEvent, evaluateSceneEvent, proposeSceneEvent, resolveSceneEvent, SceneEventError } from '../../../js/core/scene-events.js';
import { userMessage } from '../../../js/ui/messages.js';
import { v5StoreActionClock } from '../../../js/core/v5-store-action.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { encounterJournalScope, purgeEncounterJournal, purgeEncounterJournalHistory } from '../../../js/core/encounter-journal.js';

describe('Initialisation store E01', () => {
function storage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
  };
}

test('E01 — retirer un participant nettoie ses jets et garde les jets indépendants', () => {
  const store = createStore({ storage: storage() });
  store.addParticipant(new Participant({ id: 'a', name: 'Aline', zone: 'active' }));
  store.addParticipant(new Participant({ id: 'b', name: 'Boris', zone: 'active' }));
  store.addDiceLine(new DiceLine({ id: 'owned', participantId: 'a', targetId: 'b' }));
  store.addDiceLine(new DiceLine({ id: 'other', participantId: 'b', targetId: 'a' }));
  store.addDiceLine(new DiceLine({ id: 'independent', note: 'd100 du MJ', targetId: 'a' }));
  store.log({ kind: 'damage', actorId: 'a', targetId: 'b', text: 'Aline frappe Boris' });

  store.removeParticipant('a');

  assert.deepEqual(store.getDiceLines().map(line => line.id), ['other', 'independent']);
  assert.equal(store.getDiceLines().find(line => line.id === 'other').targetId, null);
  assert.equal(store.getDiceLines().find(line => line.id === 'independent').targetId, null);
  const event = store.getLog()[0];
  assert.equal(event.actorName, 'Aline');
  assert.equal(event.targetName, 'Boris');
});

test('E01 — réinitialiser le combat supprime les jets attachés et le round courant', () => {
  const store = createStore({ storage: storage() });
  store.addParticipant(new Participant({ id: 'a', name: 'Aline', zone: 'active' }));
  store.setRoundTurn(2, 'a');
  store.addDiceLine(new DiceLine({ id: 'owned', participantId: 'a' }));
  store.addDiceLine(new DiceLine({ id: 'independent', note: 'd100 du MJ' }));

  store.resetCombat();

  assert.equal(store.getCombat().round, 0);
  assert.equal(store.getCombat().currentActorId, null);
  assert.equal(store.getCombat().participants.size, 0);
  assert.deepEqual(store.getDiceLines().map(line => line.id), ['independent']);
  assert.equal(store.getLog()[0].text, 'Combat terminé.');
});
});

describe('Historique des commandes E07', () => {
const command = (id, n, dice = [42]) => createCommand({
  id, type: 'damage', baseRevision: n,
  data: { targetId: 'p', amount: n },
  result: { dice, damage: n },
  inverse: { amount: -n }
});

test('E07 commandes — valeur complète clonée et inverse disponible', () => {
  const before = { hp: 10, states: [] };
  const after = { hp: 7, states: ['Hémorragique'] };
  const c = createStateCommand({ id: 'cmd-1', type: 'damage+state', before, after, baseRevision: 3 });
  assert.equal(c.baseRevision, 3);
  assert.deepEqual(c.result.state, after);
  assert.deepEqual(c.inverse.state, before);
  c.result.state.hp = 0;
  assert.equal(after.hp, 7);
});

test('E07 commandes — exécution et erreur sont atomiques', () => {
  const state = { hp: 10 };
  const c = command('cmd-1', 3);
  const run = executeCommand(state, c, (draft, data, result) => {
    draft.hp -= result.damage;
    draft.lastTarget = data.targetId;
    return draft;
  });
  assert.deepEqual(run.state, { hp: 7, lastTarget: 'p' });
  assert.deepEqual(state, { hp: 10 });
  assert.throws(
    () => executeCommand(state, c, draft => { draft.hp = 0; throw new Error('échec'); }),
    /échec/
  );
  assert.deepEqual(state, { hp: 10 });
  assert.throws(() => inverseCommand(state, createCommand({ id: 'no-inverse', type: 'x' }), () => state), CommandError);
});

test('E07 commandes — rejeu restitue les dés enregistrés sans nouveau tirage', () => {
  let randomCalls = 0;
  const c = command('roll-1', 2, [17]);
  const result = replayCommand({ hp: 10 }, c, (draft, _data, recorded) => {
    randomCalls++;
    draft.roll = recorded.dice[0];
    draft.hp -= recorded.damage;
    return draft;
  });
  assert.deepEqual(result.state, { hp: 8, roll: 17 });
  assert.equal(randomCalls, 1, 'le handler lit le résultat, aucun tirage interne du protocole');
  assert.deepEqual(c.result.dice, [17]);
});

test('E07 historique — undo/redo consomme les commandes et borne à 50', () => {
  let history = createHistory({ limit: 100 });
  assert.equal(history.limit, MAX_HISTORY_COMMANDS);
  for (let i = 1; i <= 55; i++) history = recordCommand(history, command('cmd-' + i, i));
  assert.equal(history.past.length, 50);
  assert.equal(history.past[0].id, 'cmd-6');
  assert.equal(canUndo(history), true);
  const undone = undo(history);
  assert.equal(undone.command.id, 'cmd-55');
  assert.equal(undone.history.future.at(-1).id, 'cmd-55');
  const redone = redo(undone.history);
  assert.equal(redone.command.id, 'cmd-55');
  assert.equal(redone.history.future.length, 0);
  const branched = recordCommand(undone.history, command('cmd-new', 56));
  assert.equal(branched.future.length, 0);
});

test('E07 historique — budget UTF-8 borné, hydratation tronquée et grosse commande refusée', () => {
  const small = createHistory({ maxBytes: 500 });
  let history = small;
  for (let i = 0; i < 8; i++) history = recordCommand(history, command('small-' + i, i));
  assert.ok(JSON.stringify([...history.past, ...history.future]).length <= 500);
  assert.equal(createHistory().maxBytes, DEFAULT_HISTORY_MAX_BYTES);
  assert.throws(
    () => recordCommand(small, createCommand({ id: 'huge', type: 'import', data: { text: 'x'.repeat(1000) } })),
    /trop volumineuse/
  );
  const hydrated = {
    limit: 50, maxBytes: 500,
    past: [command('old', 0), createCommand({ id: 'huge-hydrated', type: 'import', data: { text: 'x'.repeat(1000) } })],
    future: [], boundary: null
  };
  const normalized = recordCommand(hydrated, command('last', 1));
  assert.ok(JSON.stringify([...normalized.past, ...normalized.future]).length <= 500);
  assert.equal(normalized.past.at(-1).id, 'last');
});

test('E07 historique — une mise à jour externe ferme la frontière applicable', () => {
  let history = recordCommand(createHistory(), command('local-1', 0));
  history = markExternalBoundary(history, { reason: 'remote-sync', revision: 4 });
  assert.equal(canUndo(history), false);
  assert.equal(canRedo(history), false);
  assert.deepEqual(history.boundary, { reason: 'remote-sync', revision: 4 });
  const local = recordCommand(history, command('local-after', 4));
  assert.equal(undo(local).command.id, 'local-after');
  assert.equal(local.boundary.reason, 'remote-sync');
});
});

describe('Integration store E07', () => {
function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}

test('E07 Store — executeCommand atomique et undo/redo persiste la frontière', () => {
  const store = createStore({ storage: storage() });
  const profile = { id: 'p1', name: 'Profil', hp: 10, initiative: 30 };
  const result = store.executeCommand('add-profile', draft => ({ ...draft, reserve: [profile] }));
  assert.equal(result.ok, true);
  assert.equal(store.getProfile('p1').name, 'Profil');
  assert.equal(store.canUndo(), true);
  assert.equal(store.undo(), true);
  assert.equal(store.getProfile('p1'), null);
  assert.equal(store.canRedo(), true);
  assert.equal(store.redo(), true);
  assert.equal(store.getProfile('p1').name, 'Profil');
  assert.equal(JSON.parse(store.getFullJSON()).localRevision, 3, 'undo/redo conservent une révision locale monotone');
});

test('E07 Store — un mutateur en erreur ne modifie ni état ni historique', () => {
  const store = createStore({ storage: storage() });
  assert.throws(() => store.executeCommand('failed', draft => {
    draft.reserve.push({ id: 'bad', name: 'Bad' });
    throw new Error('échec milieu commande');
  }), /échec milieu commande/);
  assert.equal(store.getProfile('bad'), null);
  assert.equal(store.canUndo(), false);
});

function deferredPersistence({ failCalls = [] } = {}) {
  let calls = 0;
  let persisted = null;
  return {
    get calls() { return calls; },
    async load() { return persisted; },
    async saveAtomic({ state }) {
      calls++;
      if (failCalls.includes(calls)) throw new Error('quota différé');
      persisted = structuredClone(state);
      return { ok: true };
    }
  };
}

test('E07 Store — deux commandes persistantes ne se chevauchent pas après l’échec de la première', async () => {
  const persistence = deferredPersistence({ failCalls: [2] });
  const store = createStore({ persistence });
  assert.deepEqual(await store.ready, { ok: true });
  const first = store.addProfile({ id: 'first', name: 'Refusé', hp: 1 });
  const second = store.addProfile({ id: 'second', name: 'Conservé', hp: 2 });
  assert.equal((await first).ok, false);
  assert.equal((await second).ok, true);
  assert.equal(store.getProfile('first'), null);
  assert.equal(store.getProfile('second').name, 'Conservé');
  assert.equal(JSON.parse(store.getFullJSON()).localRevision, 1);
  assert.equal(store.getHistory().past.length, 1);
});

test('E07 Store — le journal local ne consomme pas le geste undo d’une commande', async () => {
  const persistence = deferredPersistence();
  const store = createStore({ persistence });
  await store.ready;
  await store.addProfile({ id: 'profile-before-log', name: 'Profil', hp: 10 });
  await store.log('événement local');

  assert.equal(store.canUndo(), true);
  await store.undo();
  assert.equal(store.getProfile('profile-before-log'), null);
  assert.equal(store.getLog()[0].text, 'événement local');
  assert.equal(store.canUndo(), false);
});

test('E07 Store — une commande qui dépasse le budget est refusée avant le swap vivant', async () => {
  const persistence = deferredPersistence();
  const store = createStore({ persistence });
  await store.ready;
  await assert.rejects(
    store.executeCommand('oversized', draft => ({ ...draft, reserve: [{ id: 'huge', name: 'x'.repeat(2 * 1024 * 1024) }] })),
    /trop volumineuse/
  );
  assert.equal(store.getProfile('huge'), null);
  assert.equal(JSON.parse(store.getFullJSON()).localRevision, 0);
  assert.equal(store.getHistory().past.length, 0);
});
});

describe('Modeles et validation E10', () => {
test('E10 modèles — PNJ, tags, notes et actions restent éditables', () => {
  const profile = new Profile({
    id: 'p', name: 'Éclaireur', kind: 'PNJ', group: 'Élite', tags: 'chef, forêt, chef', notes: 'patrouille',
    actions: [{ id: 'a', base: 45, note: 'Arc', valuesX: 3, capacity: 6, qualities: ['Impact', 'Percutante'] }]
  });
  assert.equal(profile.kind, 'PNJ');
  assert.deepEqual(profile.tags, ['chef', 'forêt']);
  assert.equal(profile.actions[0].valuesX, 3);
  assert.equal(profile.actions[0].capacity, 6);
  assert.deepEqual(profile.actions[0].qualities.map(q => q.id), ['percutante']);
  profile.actions[0].qualities[0].rating = 9;
  assert.equal(profile.diceLines[0].qualities[0].rating, 9, 'actions et lignes désignent le même brouillon');
});

test('E10 modèles — duplication profonde des armures, qualités et extensions', () => {
  const source = { armor: { head: 2 }, qualities: [{ id: 'impact', data: { x: 2 } }], extensions: { nested: { ok: true } } };
  const copy = cloneValue(source);
  copy.armor.head = 5; copy.qualities[0].data.x = 8; copy.extensions.nested.ok = false;
  assert.deepEqual(source, { armor: { head: 2 }, qualities: [{ id: 'impact', data: { x: 2 } }], extensions: { nested: { ok: true } } });
  const action = normalizeAction(source);
  assert.notEqual(action.id, undefined);
});

test('E10 sanitation — ancien profil conserve ses actions et accepte le type PNJ', () => {
  const result = sanitizeProfile({ id: 'p', name: 'Garde', kind: 'PNJ', diceLines: [{ base: 40, qualities: [{ id: 'Impact' }] }] });
  assert.equal(result.kind, 'PNJ');
  assert.equal(result.diceLines[0].base, 40);
  assert.equal(result.diceLines[0].qualities[0].id, 'percutante');
});

test('E10 modèles — DiceLine expose valeurs X et capacité sans partager les qualités', () => {
  const qualities = [{ id: 'Explosion', rating: 3 }];
  const line = new DiceLine({ qualities, valuesX: 3, capacity: 2 });
  assert.equal(line.valuesX, 3);
  assert.equal(line.capacity, 2);
  line.qualities[0].rating = 9;
  assert.equal(qualities[0].rating, 3);
});

test('E10 migration — champs profil/action traversent export et réimport', () => {
  const { data } = migrateSnapshot({
    schemaVersion: 2,
    reserve: [{ id: 'p', name: 'PNJ', kind: 'PNJ', tags: ['chef'], notes: 'garde', favorite: true, actions: [{ id: 'a', base: 42, valuesX: 3, capacity: 2, qualities: [{ id: 'Impact' }] }] }],
    combat: { round: 0, participants: [] }, diceLines: [], log: []
  });
  assert.equal(data.reserve[0].kind, 'PNJ');
  assert.deepEqual(data.reserve[0].tags, ['chef']);
  assert.equal(data.reserve[0].diceLines[0].valuesX, 3);
  assert.equal(data.reserve[0].diceLines[0].qualities[0].id, 'Impact');
});
});

describe('Cloture des rencontres E11 a E13', () => {
const ids = (() => { let n = 0; return () => `id-${++n}`; })();
const goblin = { id: 'g', name: 'Gobelins', kind: 'Créature', hp: 9, initiative: 20, caracs: { E: 30 }, armor: {} };
const renaut = { id: 'r', name: 'Renaut', kind: 'PJ', hp: 14, initiative: 40, caracs: { E: 35 }, armor: {} };

test('E11 rencontre — composition, copies indépendantes et lancement figé', () => {
  let encounter = createEncounter({ id: 'enc', title: 'Ruines', notes: 'Entrée nord' }, ids);
  encounter = setEncounterEntry(encounter, goblin.id, { quantity: 2, camp: 'ennemi' }, ids);
  encounter = setEncounterEntry(encounter, renaut.id, { quantity: 1, camp: 'allié', zone: 'active', persistentCharacterId: 'char-r' }, ids);
  const scene = launchEncounter(encounter, { profiles: [goblin, renaut], persistentCharacters: [{ id: 'char-r', name: 'Renaut', hp: 7, states: [] }], idFactory: ids, now: 'round:1' });
  assert.equal(scene.participants.length, 3);
  assert.notEqual(scene.participants[0].id, scene.participants[1].id);
  assert.equal(scene.participants.find(p => p.persistentCharacterId === 'char-r').hp, 7);
  goblin.hp = 99;
  assert.equal(scene.participants[0].maxHp, 9);
});

test('E11 rencontre — numérotation continue d’un profil réparti sur plusieurs lignes', () => {
  const warrior = { id: 'w', name: 'Guerrier des clans', kind: 'Créature', hp: 10, initiative: 30, caracs: {}, armor: {} };
  let encounter = createEncounter({ id: 'enc-names' }, ids);
  encounter = setEncounterEntry(encounter, warrior.id, { quantity: 2, zone: 'active' }, ids);
  encounter = setEncounterEntry(encounter, renaut.id, { quantity: 1, zone: 'active' }, ids);
  encounter = setEncounterEntry(encounter, warrior.id, { quantity: 1 }, ids);
  const scene = launchEncounter(encounter, { profiles: [warrior, renaut], idFactory: ids });
  assert.deepEqual(scene.participants.map(p => p.name), ['Guerrier des clans 1', 'Guerrier des clans 2', 'Renaut', 'Guerrier des clans 3']);
  // Un profil présent une seule fois garde son nom sans numéro.
  const single = launchEncounter(setEncounterEntry(createEncounter({ id: 'enc-single' }, ids), warrior.id, {}, ids), { profiles: [warrior], idFactory: ids });
  assert.deepEqual(single.participants.map(p => p.name), ['Guerrier des clans']);
});

test('E11 rencontre — suspension/reprise, improvisation et actif unique', () => {
  const encounter = setEncounterEntry(createEncounter({ id: 'enc2' }, ids), goblin.id, {}, ids);
  const scene = launchEncounter(encounter, { profiles: [goblin], idFactory: ids });
  assert.throws(() => launchEncounter(encounter, { profiles: [goblin], activeScene: scene, idFactory: ids }), /déjà active/);
  const suspended = suspendScene(scene);
  assert.equal(suspended.status, 'suspended');
  assert.equal(resumeScene(suspended).status, 'active');
  const improvised = addImprovisedParticipant(scene, { name: 'Garde improvisé', hp: 4 }, ids);
  assert.equal(improvised.participants.at(-1).improvised, true);
  assert.equal(improvised.participants.at(-1).profileId, null);
  assert.notEqual(duplicateEncounter(encounter, ids).id, encounter.id);
});

test('E11/E13 migration — rencontres, personnages et archives optionnels sont conservés', () => {
  const input = { schemaVersion: 2, reserve: [], combat: {}, encounters: [{ id: 'e', title: 'Ruines' }], persistentCharacters: [{ id: 'c', hp: 4 }], archives: [{ id: 'a' }] };
  const { data } = migrateSnapshot(input);
  assert.deepEqual(data.encounters, input.encounters);
  assert.deepEqual(data.persistentCharacters, input.persistentCharacters);
  assert.deepEqual(data.archives, input.archives);
  data.encounters[0].title = 'Modifiée';
  assert.equal(input.encounters[0].title, 'Ruines');
});

test('Camps — normalizeCamp ramène le texte libre aux quatre camps canoniques', () => {
  for (const value of ['pj', 'PJ', 'joueur', 'Joueurs', 'pjs']) assert.equal(normalizeCamp(value), 'pj', value);
  for (const value of ['allié', 'allie', 'Alliés', 'allies']) assert.equal(normalizeCamp(value), 'allie', value);
  for (const value of ['ennemi', 'Ennemis', 'hostile', 'adversaire']) assert.equal(normalizeCamp(value), 'ennemi', value);
  for (const value of ['neutre', 'marchands', '', undefined, null, 42]) assert.equal(normalizeCamp(value), 'neutre', String(value));
  assert.equal(normalizeCamp(undefined, 'PJ'), 'pj');
  assert.equal(normalizeCamp('', 'PJ'), 'pj');
  assert.equal(normalizeCamp('Neutre', 'PJ'), 'pj');
  assert.equal(normalizeCamp('marchands', 'PJ'), 'neutre');
  assert.equal(normalizeCamp('ennemi', 'PJ'), 'ennemi');
  assert.equal(normalizeCamp(undefined, 'Créature'), 'neutre');
});
});

describe('Noyau du store E11', () => {
function memoryPersistence() {
  let state = null;
  return {
    async load() { return state && structuredClone(state); },
    async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; }
  };
}

test('Store — scène et combat partagent les mêmes participants, suspension/reprise conserve les PV', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile({ id: 'profile', name: 'Garde', hp: 12, initiative: 30 });
  await store.savePersistentCharacter({ id: 'character', name: 'Garde', hp: 9, states: [] });
  await store.saveEncounter({ id: 'encounter', title: 'Cour', entries: [{ id: 'entry', profileId: 'profile', zone: 'active', persistentCharacterId: 'character' }] });
  await store.launchEncounter('encounter');
  const participant = store.listParticipants()[0];
  assert.equal(store.getActiveScene().participants[0].id, participant.id);
  await store.updateParticipant(participant.id, { hp: 4 });
  assert.equal(store.getActiveScene().participants[0].hp, 4);
  await store.suspendActiveScene();
  const suspended = store.listSuspendedScenes()[0];
  assert.equal(store.getCombat().participants.size, 0);
  await store.resumeScene(suspended.id);
  const activeSceneId = store.getActiveScene().id;
  assert.equal(store.listParticipants()[0].hp, 4);
  await store.deleteEncounter('encounter');
  assert.equal(store.getActiveScene(), null);
  assert.equal(store.getCombat().participants.size, 0);
  assert.equal(store.listPersistentCharacters()[0].hp, 9);
  await store.undo();
  assert.equal(store.getActiveScene().id, activeSceneId);
  assert.equal(store.listParticipants()[0].hp, 4);
  await store.redo();
  assert.equal(store.getActiveScene(), null);
});

test('Store — une simulation appliquée ne passe qu’une fois par la résolution', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addParticipant({ id: 'actor', name: 'Attaquant', hp: 10, zone: 'active' });
  await store.addParticipant({ id: 'target', name: 'Cible', hp: 10, armor: { body: 0 }, caracs: { E: 30 }, zone: 'active' });
  const simulation = store.simulateAction({ v5: { kind: 'ranged' }, actorId: 'actor', targetId: 'target', action: { type: 'attack', base: 60, damage: 2 }, roll: 40 });
  const result = await store.applySimulation(simulation);
  assert.equal(result.status, 'applied');
  assert.equal(store.getCombat().participants.get('target').hp, 9);
  assert.equal(store.getLog()[0].kind, 'resolution');
  assert.equal(store.getLog()[0].detail.roll, 40);
  assert.equal(store.canUndo(), true);
});

test('Store — une résolution est appliquée après commit et un rejeu reste duplicate', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addParticipant({ id: 'actor-resolution', name: 'Attaquant', hp: 10, zone: 'active' });
  await store.addParticipant({ id: 'target-resolution', name: 'Cible', hp: 10, armor: { body: 0 }, caracs: { E: 30 }, zone: 'active' });
  const preview = store.previewResolution({
    v5: { kind: 'ranged' }, actorId: 'actor-resolution', targetId: 'target-resolution',
    action: { type: 'attack', base: 60, damage: 2 }, roll: 40
  });
  const result = await store.applyResolution(preview);
  assert.equal(result.status, 'applied');
  assert.equal(store.getCombat().participants.get('target-resolution').hp, 9);
  assert.equal(store.getLog()[0].detail.resolutionId, preview.resolutionId);
  assert.equal((await store.applyResolution(preview)).status, 'duplicate');
});

test('Store — une résolution en file recalcule le draft et ne remplace pas une mutation concurrente', async () => {
  let state = null;
  let hold = false;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let signalSave;
  const saveStarted = new Promise(resolve => { signalSave = resolve; });
  const persistence = {
    async load() { return state && structuredClone(state); },
    async saveAtomic({ state: next }) {
      if (hold) { signalSave(); await gate; }
      state = structuredClone(next);
      return { ok: true };
    }
  };
  const store = createStore({ persistence });
  await store.ready;
  await store.addParticipant({ id: 'actor-race', name: 'Attaquant', hp: 10, zone: 'active' });
  await store.addParticipant({ id: 'target-race', name: 'Cible', hp: 10, armor: { body: 0 }, caracs: { E: 30 }, zone: 'active' });
  const preview = store.previewResolution({ v5: { kind: 'ranged' }, actorId: 'actor-race', targetId: 'target-race', action: { type: 'attack', base: 60, damage: 2 }, roll: 40 });
  hold = true;
  const edit = store.updateParticipant('target-race', { hp: 8 });
  const apply = store.applyResolution(preview);
  await saveStarted;
  release();
  await edit;
  assert.equal((await apply).status, 'stale');
  assert.equal(store.getCombat().participants.get('target-race').hp, 8);
});

test('Store — plusieurs scènes suspendues restent indépendantes et une seule reprend à la fois', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence });
  await store.ready;
  await store.addProfile({ id: 'p', name: 'Profil', hp: 10 });
  await store.saveEncounter({ id: 'a', title: 'A', entries: [{ id: 'a1', profileId: 'p', zone: 'active' }] });
  await store.saveEncounter({ id: 'b', title: 'B', entries: [{ id: 'b1', profileId: 'p', zone: 'active' }] });
  await store.launchEncounter('a');
  const sceneA = store.getActiveScene();
  await store.suspendActiveScene();
  await store.launchEncounter('b');
  const sceneB = store.getActiveScene();
  await store.suspendActiveScene();
  assert.equal(store.listSuspendedScenes().length, 2);
  await store.resumeScene(sceneA.id);
  assert.equal(store.getActiveScene().id, sceneA.id);
  await assert.rejects(store.resumeScene(sceneB.id), /active|active ou suspendue/i);
});
});

describe('Rappels et alertes E14', () => {
test('E14 rappels — hémorragie et expiration sont dédupliquées par scène/transition/effet', () => {
  const snapshot = {
    sceneId: 'scene-1',
    states: [
      { id: 'hem-1', key: 'hemorragique', name: 'Hémorragique', duration: null },
      { id: 'stun-1', key: 'sonne', name: 'Sonné', duration: 1 }
    ]
  };
  const first = deriveReminders(snapshot, { id: 'end-2', type: 'endTurn' });
  const second = deriveReminders(snapshot, { id: 'end-2', type: 'endTurn' });
  assert.equal(first.length, 3);
  assert.equal(first.filter(item => item.kind === 'automatic-announced').length, 1);
  assert.equal(first.filter(item => item.kind === 'effect-expiring').length, 1);
  assert.deepEqual(first, second);
});

test('E14 rappels — choix ignorer/résoudre/report restent persistables', () => {
  const initial = deriveReminders({ sceneId: 's', states: [{ id: 'e', name: 'Sonné', duration: 1 }] }, { id: 't', type: 'endTurn' });
  const id = initial.find(item => item.kind === 'effect-expiring').id;
  const ignored = resolveReminder(initial, id, REMINDER_DECISIONS.IGNORE, { actorId: 'p' });
  assert.equal(pendingReminders(ignored).length, 1, 'le rappel de transition reste indépendant');
  assert.equal(ignored.find(item => item.id === id).choice.actorId, 'p');
  const rebuilt = deriveReminders({ sceneId: 's', states: [{ id: 'e', name: 'Sonné', duration: 1 }] }, { id: 't', type: 'endTurn' }, ignored);
  assert.equal(rebuilt.find(item => item.id === id).status, 'ignore');
  const snoozed = resolveReminder(initial, id, REMINDER_DECISIONS.SNOOZE);
  assert.equal(snoozed.find(item => item.id === id).status, 'snooze');
});

test('E14 rappels — conséquences et renforts attendus sont proposés sans exécution', () => {
  const reminders = deriveReminders({
    sceneId: 's',
    consequences: [{ id: 'c', text: 'Choisir le report', resolved: false }],
    reinforcements: [{ id: 'r', expectedAt: 3, arrived: false, text: 'Le chef arrive' }]
  }, { id: 'round-3', type: 'startTurn', round: 3, actorId: 'a' });
  assert.deepEqual(reminders.map(item => item.kind), ['startTurn', 'consequence', 'reinforcement']);
  assert.equal(reminders.find(item => item.effectId === 'r').status, 'pending');
});
});

describe('Evenements de scene E15', () => {
test('E15 scène — intentions structurées et condition de round', () => {
  const intention = createIntention({ id: 'chief', participantId: 'p', motivation: 'Fuir', objective: 'Atteindre la porte' });
  const event = createSceneEvent({
    id: 'arrival', condition: { type: 'roundAtLeast', round: 3 },
    consequence: { type: 'note', text: 'Le chef arrive' }
  });
  const scene = createScene({ id: 's', round: 3, intentions: [intention], events: [event] });
  assert.equal(evaluateSceneEvent(scene, event).eligible, true);
  const proposal = proposeSceneEvent(scene, event);
  assert.equal(proposal.status, 'proposed');
  assert.deepEqual(proposal.consequence, { type: 'note', text: 'Le chef arrive' });
});

test('E15 scène — conditions PV/hors combat/manuelle n’exécutent aucun texte', () => {
  const scene = createScene({ id: 's', round: 1, participants: [{ id: 'p', hp: 0 }] });
  const down = createSceneEvent({ id: 'down', condition: { type: 'participantDown', participantId: 'p' }, consequence: { type: 'reinforcement', participantId: 'r' } });
  assert.equal(proposeSceneEvent(scene, down).status, 'proposed');
  const manual = createSceneEvent({ id: 'manual', condition: { type: 'manual', text: '1 + 1' }, consequence: { type: 'note', text: '<script>bad</script>' } });
  assert.equal(proposeSceneEvent(scene, manual).status, 'not-eligible');
  assert.equal(proposeSceneEvent(scene, manual, { manual: true }).consequence.text, '<script>bad</script>');
  assert.throws(() => createSceneEvent({ id: 'bad', condition: { type: 'eval', code: 'alert(1)' }, consequence: { type: 'note' } }), SceneEventError);
});

test('E15 scène — occurrence résolue une seule fois et horloge bornée manuellement', () => {
  const event = createSceneEvent({ id: 'event', condition: { type: 'manual' }, consequence: { type: 'note', text: 'ok' }, recurring: false });
  const scene = createScene({ id: 's', round: 1, events: [event], clocks: [{ id: 'threat', value: 2, max: 3 }] });
  const resolved = resolveSceneEvent(scene, event);
  const twice = resolveSceneEvent(resolved, event);
  assert.equal(twice.resolvedOccurrences.length, 1);
  const advanced = advanceSceneClock(resolved, 'threat', 5);
  assert.equal(advanced.clocks[0].value, 3);
  const unbounded = advanceSceneClock({ ...scene, clocks: [{ id: 'open', value: 2, max: null }] }, 'open', 5);
  assert.equal(unbounded.clocks[0].value, 7);
  assert.equal(scene.clocks[0].value, 2);
});

test('E15 scène — événement récurrent distingue les occurrences par round', () => {
  const event = createSceneEvent({ id: 'pulse', condition: { type: 'roundAtLeast', round: 1 }, consequence: { type: 'note', text: 'pulse' }, recurring: true });
  const scene = createScene({ id: 's', round: 1 });
  const r1 = resolveSceneEvent(scene, event);
  const r2 = resolveSceneEvent({ ...scene, round: 2, resolvedOccurrences: r1.resolvedOccurrences }, event);
  assert.equal(r1.resolvedOccurrences.length, 1);
  assert.equal(r2.resolvedOccurrences.length, 2);
});

test('E15 Store — conséquence confirmée atomique, déduplication et undo', async () => {
  let saved = null;
  const persistence = {
    async load() { return saved && structuredClone(saved); },
    async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; }
  };
  const actor = { id: 'actor', name: 'Chef', hp: 10, maxHp: 10, zone: 'active', states: [] };
  const bench = { id: 'reinforcement', name: 'Renfort', hp: 8, maxHp: 8, zone: 'bench', states: [] };
  const scene = {
    schemaVersion: 2, id: 'scene', status: 'active', revision: 0, round: 2,
    currentActorId: 'actor', order: ['actor'], participants: [actor, bench],
    events: [], clocks: [{ id: 'threat', label: 'Menace', value: 1, max: 2 }],
    resolvedOccurrences: [],
    reserve: [], activeScene: null, combat: { round: 2, currentActorId: 'actor', order: ['actor'], participants: [actor, bench] },
    log: [], diceLines: []
  };
  const store = createStore({ persistence: { ...persistence, async load() { return saved || { ...scene, activeScene: scene }; } } });
  await store.ready;
  const reinforcement = createSceneEvent({ id: 'reinforce', condition: { type: 'manual' }, consequence: { type: 'reinforcement', participantId: 'reinforcement' } });
  const stateEvent = createSceneEvent({ id: 'state', condition: { type: 'manual' }, consequence: { type: 'addState', participantId: 'reinforcement', state: { name: 'Sonné', level: 2, duration: 3 } } });
  const clockEvent = createSceneEvent({ id: 'clock', condition: { type: 'manual' }, consequence: { type: 'advanceClock', clockId: 'threat', amount: 5 } });

  for (const event of [reinforcement, stateEvent, clockEvent]) {
    const preview = store.previewSceneEvent(event, { confirmed: true });
    assert.equal(preview.status, 'proposed', event.id);
    assert.equal((await store.applySceneEvent(event, { confirmed: true, baseRevision: preview.baseRevision, sceneRevision: preview.sceneRevision })).status, 'applied');
  }
  const active = store.getActiveScene();
  assert.equal(active.participants.find(item => item.id === 'reinforcement').zone, 'active');
  assert.deepEqual(active.order, ['actor', 'reinforcement']);
  const appliedState = active.participants.find(item => item.id === 'reinforcement').states[0];
  assert.equal(appliedState.name, 'Sonné');
  assert.equal(appliedState.level, 2);
  assert.equal(appliedState.duration, 3);
  assert.equal(active.clocks[0].value, 2);
  assert.equal((await store.applySceneEvent(clockEvent, { confirmed: true })).status, 'duplicate');

  await store.undo();
  assert.equal(store.getActiveScene().clocks[0].value, 1);
  await store.undo();
  assert.equal(store.getActiveScene().participants.find(item => item.id === 'reinforcement').states.length, 0);
  await store.undo();
  assert.equal(store.getActiveScene().participants.find(item => item.id === 'reinforcement').zone, 'bench');
  await store.redo(); await store.redo(); await store.redo();
  assert.equal(store.getActiveScene().clocks[0].value, 2);
});
});

describe('Liste des rencontres E21', () => {
const entry = (profileId, quantity = 1) => ({ id: `${profileId}-${quantity}`, profileId, quantity });
const profiles = [{ id: 'gob', name: 'Gobelin' }, { id: 'chef', name: 'Chef gobelin' }];

test('libellés de statut', () => {
  assert.deepEqual({ ...ENCOUNTER_STATUS_LABELS }, { active: 'En cours', suspended: 'Suspendue', prepared: 'Préparée' });
});

test('statut affiché : déduit des scènes vivantes', () => {
  const activeScene = { id: 's1', status: 'active', encounterId: 'a' };
  const suspendedScenes = [{ id: 's2', status: 'suspended', encounterId: 'b' }];
  const scenes = { activeScene, suspendedScenes };
  assert.deepEqual(encounterDisplayStatus({ id: 'a', status: 'prepared' }, scenes), { key: 'active', label: 'En cours', sceneId: 's1' });
  assert.deepEqual(encounterDisplayStatus({ id: 'b', status: 'active' }, scenes), { key: 'suspended', label: 'Suspendue', sceneId: 's2' });
  assert.deepEqual(encounterDisplayStatus({ id: 'c', status: 'closed' }, scenes), { key: 'prepared', label: 'Préparée', sceneId: null });
  assert.deepEqual(encounterDisplayStatus({ id: 'd', status: 'prepared' }, scenes), { key: 'prepared', label: 'Préparée', sceneId: null });
});

test('statut affiché : un status « active » périmé sans scène redevient préparée', () => {
  assert.equal(encounterDisplayStatus({ id: 'a', status: 'active' }).key, 'prepared');
  assert.equal(encounterDisplayStatus({ id: 'a', status: 'suspended' }, { activeScene: { id: 's', status: 'suspended', encounterId: 'a' } }).key, 'prepared');
  assert.equal(encounterDisplayStatus({ id: 'a' }, { suspendedScenes: null }).key, 'prepared');
});

test('résumé : total, regroupement par profil, pas de ×1', () => {
  assert.deepEqual(encounterSummary({ entries: [entry('gob', 3), entry('chef')] }, profiles), { count: 4, text: 'Gobelin ×3, Chef gobelin' });
  assert.deepEqual(encounterSummary({ entries: [entry('gob', 2), entry('chef'), { id: 'x', profileId: 'gob', quantity: 1 }] }, profiles), { count: 4, text: 'Gobelin ×3, Chef gobelin' });
});

test('résumé : profil supprimé, liste vide', () => {
  assert.deepEqual(encounterSummary({ entries: [entry('perdu', 2)] }, profiles), { count: 2, text: 'Profil supprimé ×2' });
  assert.deepEqual(encounterSummary({ entries: [] }, profiles), { count: 0, text: '' });
  assert.deepEqual(encounterSummary({}), { count: 0, text: '' });
});

test('tri : en cours, suspendues, préparées, clôturées, ordre stable', () => {
  const list = [
    { id: 'p1', status: 'prepared' }, { id: 'c1', status: 'closed' }, { id: 's1', status: 'prepared' },
    { id: 'a1', status: 'prepared' }, { id: 'p2', status: 'active' }, { id: 'c2', status: 'closed' }
  ];
  const scenes = { activeScene: { id: 'x', status: 'active', encounterId: 'a1' }, suspendedScenes: [{ id: 'y', encounterId: 's1' }] };
  const sorted = sortEncountersForDisplay(list, scenes);
  assert.deepEqual(sorted.map(item => item.id), ['a1', 's1', 'p1', 'c1', 'p2', 'c2']);
  assert.notEqual(sorted, list);
  assert.deepEqual(list.map(item => item.id), ['p1', 'c1', 's1', 'a1', 'p2', 'c2']);
  assert.deepEqual(sortEncountersForDisplay([]), []);
});
});

describe('Redemarrage de combat E25', () => {
function memoryPersistence() {
  let state = null;
  return {
    async load() { return state && structuredClone(state); },
    async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; }
  };
}

async function launched(options = {}) {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile({ id: 'garde', name: 'Garde', hp: 12, initiative: 30 });
  await store.addProfile({ id: 'archer', name: 'Archer', hp: 8, initiative: 50 });
  await store.addProfile({ id: 'chien', name: 'Chien', hp: 6, initiative: 20 });
  await store.saveEncounter({
    id: 'rencontre', title: 'Cour',
    entries: [
      { id: 'e1', profileId: 'garde', quantity: 2, zone: 'active', ...options.first },
      { id: 'e2', profileId: 'archer', quantity: 1, zone: 'bench' }
    ]
  });
  await store.launchEncounter('rencontre');
  return store;
}

const shape = store => store.listParticipants().map(item => ({ name: item.name, profileId: item.profileId, zone: item.zone, hp: item.hp, maxHp: item.maxHp, states: item.states }));

test('restartCombat — retour au lancement, annulable', async () => {
  const store = await launched();
  const scene = store.getActiveScene();
  const initial = shape(store);
  const [first, second] = store.listParticipants().filter(item => item.zone === 'active');
  const benched = store.listParticipants().find(item => item.zone === 'bench');
  await store.updateParticipant(first.id, { hp: 3, states: ['Sonné|2'] });
  await store.setRoundTurn(2, second.id);
  await store.moveParticipant(benched.id, 'active');
  await store.addProfilesToCombat(['chien'], { zone: 'active' });
  assert.equal(store.listParticipants().length, 4);
  const withTurnReceipts=JSON.parse(store.getFullJSON());
  withTurnReceipts.extensions.v5.combatScopeId='old-combat-scope';
  withTurnReceipts.extensions.v5.combatActions={byActorId:{[first.id]:{turnId:'old-turn'}},receipts:[{id:'old'}]};
  withTurnReceipts.extensions.v5.standardTurnActions=[{actionId:'old-action',actorId:first.id}];
  await store.loadFromJSON(withTurnReceipts);
  const before = { scene: store.getActiveScene(), combat: shape(store) };
  const clockState=JSON.parse(store.getFullJSON());clockState.combat.round=1;clockState.combat.currentActorId=first.id;clockState.activeScene.extensions.v5.turnIndex=1;
  const beforeTurnId=v5StoreActionClock(clockState).turnId;

  await store.restartCombat();
  const after = store.getActiveScene();
  assert.equal(after.id, scene.id, 'le contrat conserve l’identité de scène');
  assert.equal(after.startedAt, scene.startedAt, 'le contrat conserve le démarrage de scène');
  const restartedState=JSON.parse(store.getFullJSON());
  assert.notEqual(restartedState.extensions.v5.combatScopeId,'old-combat-scope');
  const restartClock={...restartedState,combat:{...restartedState.combat,round:1,currentActorId:first.id},activeScene:{...restartedState.activeScene,extensions:{...restartedState.activeScene.extensions,v5:{...restartedState.activeScene.extensions.v5,turnIndex:1}}}};
  assert.notEqual(v5StoreActionClock(restartClock).turnId,beforeTurnId,'le même acteur reçoit un turnId distinct après redémarrage');
  assert.equal(restartedState.extensions.v5.combatActions,undefined);
  assert.equal(restartedState.extensions.v5.standardTurnActions,undefined);
  assert.equal(after.status, 'active');
  assert.equal(after.round, 0);
  assert.equal(after.currentActorId, null);
  assert.equal(store.getCombat().round, 0);
  assert.equal(store.getCombat().currentActorId, null);
  assert.deepEqual(shape(store), initial.map(item => ({ ...item })));
  assert.equal(store.listParticipants().some(item => item.profileId === 'chien'), false);
  assert.deepEqual(store.getCombat().order, after.order);
  assert.equal(store.listEncounters()[0].status, 'active');
  assert.match(store.getLog()[0].text, /Combat « Cour » recommencé : retour au lancement\./);

  await store.undo();
  assert.deepEqual(shape(store), before.combat);
  assert.equal(store.getCombat().round, 2);
  assert.equal(store.getActiveScene().id, scene.id);
});

test('restartCombat — la relance prend les profils modifiés', async () => {
  const store = await launched();
  await store.updateProfile('garde', { hp: 20 });
  await store.restartCombat();
  assert.deepEqual(store.listParticipants().filter(item => item.profileId === 'garde').map(item => item.hp), [20, 20]);
});

test('restartCombat — un personnage persistant reprend les PV de sa fiche', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile({ id: 'garde', name: 'Garde', hp: 12, initiative: 30 });
  await store.savePersistentCharacter({ id: 'perso', name: 'Garde', hp: 9, states: [] });
  await store.saveEncounter({ id: 'rencontre', title: 'Cour', entries: [{ id: 'e1', profileId: 'garde', zone: 'active', persistentCharacterId: 'perso' }] });
  await store.launchEncounter('rencontre');
  await store.updateParticipant(store.listParticipants()[0].id, { hp: 1 });
  await store.restartCombat();
  assert.equal(store.listParticipants()[0].hp, 9);
});

test('restartCombat — combat sans scène : PV au maximum, états vidés', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile({ id: 'garde', name: 'Garde', hp: 12, initiative: 30 });
  await store.addProfilesToCombat(['garde'], { zone: 'active' });
  const [participant] = store.listParticipants();
  await store.updateParticipant(participant.id, { hp: 2, states: ['Sonné|2'] });
  await store.setRoundTurn(3, participant.id);
  const before=JSON.parse(store.getFullJSON());before.extensions.v5.combatScopeId='scope-before';before.extensions.v5.combatActions={byActorId:{[participant.id]:{kind:'aim'}},receipts:[{id:'stale'}]};before.extensions.v5.standardTurnActions=[{actionId:'stale'}];
  await store.loadFromJSON(before);
  await store.restartCombat();
  const [after] = store.listParticipants();
  const restarted=JSON.parse(store.getFullJSON());
  assert.notEqual(restarted.extensions.v5.combatScopeId,'scope-before');
  assert.equal(restarted.extensions.v5.combatActions,undefined);
  assert.equal(restarted.extensions.v5.standardTurnActions,undefined);
  assert.equal(after.id, participant.id);
  assert.equal(after.zone, 'active');
  assert.equal(after.hp, 12);
  assert.deepEqual(after.states, []);
  assert.equal(store.getCombat().round, 0);
  assert.equal(store.getCombat().currentActorId, null);
  assert.equal(store.getLog()[0].text, 'Combat recommencé : PV remis au maximum.');
});

test('restartCombat — aucun combat, rencontre supprimée ou vidée : message lisible', async () => {
  const empty = createStore({ persistence: memoryPersistence() });
  await empty.ready;
  assert.throws(() => empty.restartCombat(), error => /Aucun combat à recommencer/.test(error.message) && userMessage(error) === 'Aucun combat en cours à recommencer.');

  const store = await launched();
  await store.saveEncounter({ ...store.listEncounters()[0], entries: [] });
  assert.throws(() => store.restartCombat(), error => userMessage(error) === 'La rencontre n’a plus aucun combattant : complétez sa composition avant de recommencer.');
  assert.equal(store.listParticipants().length, 3);
  await store.deleteEncounter('rencontre');
  assert.throws(() => store.restartCombat(), error => userMessage(error) === 'Aucun combat en cours à recommencer.');
});

test('restartCombat — ordre d’initiative et mode automatique, projections identiques', async () => {
  const store = await launched();
  const [first, second] = store.getEffectiveOrder();
  await store.moveInOrder(second, first);
  assert.equal(store.getOrderMode(), 'manual');
  await store.restartCombat();
  assert.equal(store.getOrderMode(), 'automatic');
  const scene = store.getActiveScene();
  assert.deepEqual(store.listParticipants().map(item => item.id).sort(), scene.participants.map(item => item.id).sort());
  assert.deepEqual(store.getEffectiveOrder(), scene.order);
});

test('restartCombat — les choix de rappels de la scène sont effacés', async () => {
  const store = await launched();
  const sceneId = store.getActiveScene().id;
  await store.executeCommand('resolve-reminder', draft => ({
    ...draft,
    reminderChoices: [
      { id: `${sceneId}:t1:consequence:a`, status: 'resolve' },
      { id: 'autre-scene:t1:consequence:b', status: 'resolve' }
    ]
  }));
  assert.equal(store.listReminderChoices().length, 2);
  await store.restartCombat();
  assert.deepEqual(store.listReminderChoices().map(item => item.id), ['autre-scene:t1:consequence:b']);
});

test('suppression — combat actif nettoyé et restauré par annulation', async () => {
  const store = await launched();
  const scene = store.getActiveScene();
  const participant = store.listParticipants()[0];
  await store.updateParticipant(participant.id, { hp: -2 });
  await store.setRoundTurn(3, participant.id);
  await store.executeCommand('test-linked-data', draft => ({ ...draft,
    diceLines: [{ id: 'owned', participantId: participant.id }, { id: 'other', participantId: 'other', targetId: participant.id }],
    reminderChoices: [{ id: `${scene.id}:turn:reminder` }, { id: 'unrelated:turn:reminder' }]
  }));
  await store.deleteEncounter('rencontre');
  assert.equal(store.getActiveScene(), null);
  assert.equal(store.listParticipants().length, 0);
  assert.equal(store.getCombat().currentActorId, null);
  assert.equal(store.getCombat().round, 0);
  assert.deepEqual(store.getCombat().order, []);
  assert.equal(store.listProfiles().length, 3);
  assert.deepEqual(store.getDiceLines().map(line => [line.id, line.targetId]), [['other', null]]);
  assert.deepEqual(store.listReminderChoices().map(item => item.id), ['unrelated:turn:reminder']);
  await store.undo();
  assert.equal(store.getActiveScene().id, scene.id);
  assert.equal(store.listParticipants().find(item => item.id === participant.id).hp, -2);
  assert.equal(store.getCombat().round, 3);
});

test('suppression — rencontre suspendue retirée sans toucher au combat actif', async () => {
  const store = await launched();
  await store.suspendActiveScene();
  await store.saveEncounter({ id: 'other', title: 'Autre', entries: [{ profileId: 'chien', zone: 'active' }] });
  await store.launchEncounter('other');
  const active = store.getActiveScene();
  await store.deleteEncounter('rencontre');
  assert.deepEqual(store.listSuspendedScenes(), []);
  assert.equal(store.getActiveScene().id, active.id);
  assert.equal(store.listParticipants()[0].profileId, 'chien');
  await store.undo();
  assert.equal(store.listSuspendedScenes().length, 1);
  assert.equal(store.getActiveScene().id, active.id);
});

test('retrait — PNJ vaincu retiré de la scène et des tours, profil conservé, annulable', async () => {
  const store = await launched();
  const [first, second] = store.listParticipants().filter(item => item.zone === 'active');
  await store.updateParticipant(first.id, { hp: 0 });
  await store.setRoundTurn(1, first.id);
  await store.removeParticipant(first.id);
  assert.equal(store.getActiveScene().participants.some(item => item.id === first.id), false);
  assert.equal(store.getCombat().participants.has(first.id), false);
  assert.equal(store.getCombat().order.includes(first.id), false);
  assert.equal(store.getCombat().currentActorId, second.id);
  assert.equal(store.getProfile(first.profileId).hp, 12);
  await store.undo();
  assert.equal(store.getCombat().participants.get(first.id).hp, 0);
  assert.equal(store.getCombat().currentActorId, first.id);
});
});

describe('Integration store lot2', () => {
function memoryPersistence() {
  let state = null;
  let reject = false;
  return {
    async load() { return state && structuredClone(state); },
    async saveAtomic({ state: next }) {
      if (reject) throw new Error('Disque indisponible');
      state = structuredClone(next); return { ok: true };
    },
    snapshot: () => structuredClone(state),
    rejectWrites: value => { reject = value; }
  };
}

async function sceneStore() {
  const persistence = memoryPersistence();
  const store = createStore({ persistence });
  await store.ready;
  await store.addProfile({ id: 'p', name: 'Même nom', hp: 20, caracs: { E: 30 }, initiative: 40 });
  for (const id of ['a', 'b']) await store.saveEncounter({ id, title: 'Même titre', entries: [{ id: `${id}:entry`, profileId: 'p', quantity: 2, zone: 'active' }] });
  await store.launchEncounter('a');
  return { store, persistence };
}

async function resolved(store, resolutionId) {
  const [actor, target] = store.listParticipants();
  const preview = store.previewResolution({ actorId: actor.id, targetId: target.id, resolutionId,
    action: { type: 'attack', base: 60, damage: 4 }, roll: 42, defense: { base: 30, roll: 76 } });
  const result = await store.applyResolution(preview);
  assert.equal(result.status, 'applied', result.reason);
  return preview;
}

test('Lot2 — suppression purge reçus, archives et marqueurs de sa rencontre, conserve une autre au même titre', async () => {
  const { store, persistence } = await sceneStore();
  const previewA = await resolved(store, 'resolution-a');
  const sceneA = store.getActiveScene();
  await store.log({ text: 'Note sans acteur' });
  assert.equal(store.getLog()[0].encounterId, 'a');
  await store.executeCommand('archive-fixture', draft => ({ ...draft,
    archives: [{ id: sceneA.id, encounterId: 'a', participants: sceneA.participants }, { id: 'archive-b', encounterId: 'b', participants: [] }] }));
  await store.suspendActiveScene();
  await store.launchEncounter('b');
  const previewB = await resolved(store, 'resolution-b');
  await store.deleteEncounter('a');
  assert.equal(store.getActiveScene().encounterId, 'b');
  assert.equal(store.listSuspendedScenes().length, 0);
  assert.ok(!store.getLog().some(entry => entry.encounterId === 'a' || entry.detail?.resolutionId === previewA.resolutionId));
  assert.ok(store.getLog().some(entry => entry.detail?.resolutionId === previewB.resolutionId));
  const saved = persistence.snapshot();
  assert.deepEqual(saved.archives.map(entry => entry.encounterId), ['b']);
  assert.ok(!saved.appliedResolutionIds.includes(previewA.resolutionId));
  assert.ok(saved.appliedResolutionIds.includes(previewB.resolutionId));
  for (const command of saved.history.past) for (const value of [command.result?.state, command.inverse?.state]) {
    assert.ok(!value.log.some(entry => entry.encounterId === 'a'));
    assert.ok(!value.archives.some(entry => entry.encounterId === 'a'));
  }
});

test('Lot2 — annuler puis recharger une suppression ne ressuscite pas le journal purgé', async () => {
  const { store, persistence } = await sceneStore();
  await resolved(store, 'resolution-purge');
  await store.deleteEncounter('a');
  await store.undo();
  assert.equal(store.getActiveScene().encounterId, 'a');
  assert.ok(!store.getLog().some(entry => entry.detail?.resolutionId === 'resolution-purge'));
  const reloaded = createStore({ persistence }); await reloaded.ready;
  assert.equal(reloaded.getActiveScene().encounterId, 'a');
  assert.ok(!reloaded.getLog().some(entry => entry.detail?.resolutionId === 'resolution-purge'));
  await reloaded.redo();
  assert.equal(reloaded.getActiveScene(), null);
  assert.ok(!reloaded.getLog().some(entry => entry.encounterId === 'a'));
});

test('Lot2 — purge atomique : rejet du disque conserve rencontre, journal et annulation', async () => {
  const { store, persistence } = await sceneStore();
  await resolved(store, 'resolution-preserved');
  const before = { scene: store.getActiveScene(), log: store.getLog(), history: store.getHistory(), durable: persistence.snapshot() };
  persistence.rejectWrites(true);
  const rejected = await store.deleteEncounter('a');
  assert.equal(rejected.ok, false);
  assert.deepEqual(store.getActiveScene(), before.scene);
  assert.deepEqual(store.getLog(), before.log);
  assert.deepEqual(store.getHistory(), before.history);
  assert.deepEqual(persistence.snapshot(), before.durable);
});

test('Lot2 — anciens reçus retrouvés via scènes des instantanés, jamais par nom', () => {
  const oldScene = { id: 'old-scene', encounterId: 'a', participants: [{ id: 'old-actor' }] };
  const log = [{ id: 'legacy', actorId: 'old-actor', detail: { resolutionId: 'old-resolution' } },
    { id: 'other', encounterId: 'b', actorId: 'old-actor', detail: { resolutionId: 'other-resolution' } },
    { id: 'name-only', actorName: 'Même nom', text: 'Sans rattachement prouvé' }];
  const snapshot = { activeScene: oldScene, log, archives: [], appliedResolutionIds: ['old-resolution', 'other-resolution'] };
  const history = { past: [], future: [{ result: { state: snapshot }, inverse: { state: snapshot } }] };
  const state = { activeScene: null, log, archives: [], history, appliedResolutionIds: snapshot.appliedResolutionIds };
  const scope = encounterJournalScope(state, 'a');
  const clean = purgeEncounterJournal(state, scope);
  assert.deepEqual(clean.log.map(entry => entry.id), ['other', 'name-only']);
  assert.deepEqual(clean.appliedResolutionIds, ['other-resolution']);
  assert.deepEqual(purgeEncounterJournalHistory(history, scope).future[0].result.state.log, clean.log);
});

test('Lot2 — fin de Tour étiquetée et purgée même après recommencer', async () => {
  const { store } = await sceneStore();
  const engine = createCombatEngine(store);
  await engine.start(); await engine.nextTurn();
  assert.equal(store.getLog()[0].encounterId, 'a');
  const oldActorId = store.getLog()[0].actorId;
  await store.restartCombat();
  assert.ok(!store.listParticipants().some(entry => entry.id === oldActorId));
  await store.deleteEncounter('a');
  assert.ok(!store.getLog().some(entry => entry.encounterId === 'a' || entry.actorId === oldActorId));
});

test('Lot2 — Élan manuel perd seulement sur Blessures perdues ou État acquis ; pause est annulable', async () => {
  const { store } = await sceneStore();
  const actor = store.listParticipants()[0];
  const gain = () => store.updateParticipant(actor.id, { extensions: { v5: { hasMomentum: true } } });
  const has = () => store.listParticipants().find(item => item.id === actor.id)?.extensions?.v5?.hasMomentum === true;
  await gain(); await store.updateParticipant(actor.id, { hp: 20 }); assert.equal(has(), true);
  await store.updateParticipant(actor.id, { states: [{ name: 'Sonné', level: 1 }] }); assert.equal(has(), false);
  await gain(); await store.updateParticipant(actor.id, { states: [] }); assert.equal(has(), true);
  await store.updateParticipant(actor.id, { hp: 19 }); assert.equal(has(), false);
  await gain(); await store.suspendActiveScene();
  assert.equal(store.listSuspendedScenes()[0].participants.find(item => item.id === actor.id).extensions.v5.hasMomentum, false);
  await store.undo(); assert.equal(has(), true);
  await store.suspendActiveScene(); await store.resumeScene(store.listSuspendedScenes()[0].id); assert.equal(has(), false);
});

test('Lot2 — Élan transitoire ne vient pas du profil au lancement/recommencement', async () => {
  const { store } = await sceneStore();
  await store.updateProfile('p', { extensions: { v5: { hasMomentum: true } } });
  await store.restartCombat();
  assert.ok(store.listParticipants().every(item => item.extensions?.v5?.hasMomentum !== true));
});
});

describe('Store central', () => {
function createMockStorage(initialData = {}) {
  const store = new Map(Object.entries(initialData));
  let throwOnSet = false;
  return {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) {
      if (throwOnSet) throw new Error('QuotaExceededError');
      store.set(key, String(value));
    },
    setThrowOnSet(val) { throwOnSet = val; },
    _map: store
  };
}

function createMockBus() {
  const events = [];
  return {
    emit(event, payload) { events.push({ event, payload }); },
    events,
    clear() { events.length = 0; }
  };
}

test('Store — Migration du tour (A-02) [9 cas]', () => {
  // 1. turnIndex: 1 sur [p1, p2, p3] -> p2
  const storage1 = createMockStorage({
    'wfrp.combat.v1': JSON.stringify({ round: 1, turnIndex: 1, order: ['p1', 'p2', 'p3'], participants: [{ id: 'p1', name: 'A', hp: 10 }, { id: 'p2', name: 'B', hp: 10 }, { id: 'p3', name: 'C', hp: 10 }] })
  });
  assert.equal(createStore({ storage: storage1 }).getCombat().currentActorId, 'p2');

  // 2. Sentinelle -1 -> null
  const storage2 = createMockStorage({
    'wfrp.combat.v1': JSON.stringify({ round: 1, turnIndex: -1, order: ['p1'], participants: [{ id: 'p1', name: 'A', hp: 10 }] })
  });
  assert.equal(createStore({ storage: storage2 }).getCombat().currentActorId, null);

  // 3. Index hors bornes -> null
  const storage3 = createMockStorage({
    'wfrp.combat.v1': JSON.stringify({ round: 1, turnIndex: 99, order: ['p1'], participants: [{ id: 'p1', name: 'A', hp: 10 }] })
  });
  assert.equal(createStore({ storage: storage3 }).getCombat().currentActorId, null);

  // 4. currentActorId honoré
  const storage4 = createMockStorage({
    'wfrp.combat.v1': JSON.stringify({ round: 1, currentActorId: 'p3', order: ['p1', 'p2', 'p3'], participants: [{ id: 'p1', name: 'A', hp: 10 }, { id: 'p2', name: 'B', hp: 10 }, { id: 'p3', name: 'C', hp: 10 }] })
  });
  assert.equal(createStore({ storage: storage4 }).getCombat().currentActorId, 'p3');

  // 5. ID fantôme -> null
  const storage5 = createMockStorage({
    'wfrp.combat.v1': JSON.stringify({ round: 1, currentActorId: 'pGhost', order: ['p1'], participants: [{ id: 'p1', name: 'A', hp: 10 }] })
  });
  assert.equal(createStore({ storage: storage5 }).getCombat().currentActorId, null);

  // 6. Clé absente -> null
  const storage6 = createMockStorage({
    'wfrp.combat.v1': JSON.stringify({ round: 1, order: ['p1'], participants: [{ id: 'p1', name: 'A', hp: 10 }] })
  });
  assert.equal(createStore({ storage: storage6 }).getCombat().currentActorId, null);

  // 7. currentActorId prime sur turnIndex
  const storage7 = createMockStorage({
    'wfrp.combat.v1': JSON.stringify({ round: 1, currentActorId: 'p3', turnIndex: 0, order: ['p1', 'p2', 'p3'], participants: [{ id: 'p1', name: 'A', hp: 10 }, { id: 'p2', name: 'B', hp: 10 }, { id: 'p3', name: 'C', hp: 10 }] })
  });
  assert.equal(createStore({ storage: storage7 }).getCombat().currentActorId, 'p3');

  // 8. ID filtré de l'ordre -> null
  const storage8 = createMockStorage({
    'wfrp.combat.v1': JSON.stringify({ round: 1, currentActorId: 'pDeleted', order: ['pDeleted'], participants: [] })
  });
  assert.equal(createStore({ storage: storage8 }).getCombat().currentActorId, null);

  // 9. Vérification sur applyDataToState
  let syncCB = null;
  const mockSync = { dbRef: 'ref', onValue(ref, cb) { syncCB = cb; } };
  const storeSync = createStore({ storage: createMockStorage(), sync: mockSync });
  syncCB({ val: () => ({ combat: { round: 1, turnIndex: 1, order: ['p1', 'p2'], participants: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }] } }) });
  assert.equal(storeSync.getCombat().currentActorId, 'p2');
});

test('Store & Combat — Avancement du tour avec nextTurn() (A-05, A-06)', () => {
  const bus = createMockBus();
  const store = createStore({ storage: createMockStorage(), bus });
  const combatEngine = createCombatEngine(store);

  // 1. Démarrage à round 0 -> passage à round 1 et sélection du plus fort init actif (p1: 50)
  store.addParticipant(new Participant({ id: 'p1', name: 'A1', initiative: 50, zone: 'active' }));
  store.addParticipant(new Participant({ id: 'p2', name: 'A2', initiative: 30, zone: 'active' }));
  store.addParticipant(new Participant({ id: 'p3', name: 'A3', initiative: 10, zone: 'active' }));
  store.addParticipant(new Participant({ id: 'bench1', name: 'B1', initiative: 99, zone: 'bench' }));

  combatEngine.start();
  assert.equal(store.getCombat().round, 1);
  assert.equal(store.getCombat().currentActorId, 'p1');

  // 2. Avancement normal -> p2
  combatEngine.nextTurn();
  assert.equal(store.getCombat().currentActorId, 'p2');
  assert.equal(store.getCombat().round, 1);

  // 3. Avancement à p3
  combatEngine.nextTurn();
  assert.equal(store.getCombat().currentActorId, 'p3');
  assert.equal(store.getCombat().round, 1);

  // 4. Bouclage -> retour à p1 et round 2
  combatEngine.nextTurn();
  assert.equal(store.getCombat().currentActorId, 'p1');
  assert.equal(store.getCombat().round, 2);

  // 5. Ignorer le banc (bench1 init 99)
  assert.notEqual(store.getCombat().currentActorId, 'bench1');

  // 6. Acteur courant supprimé -> premier actif sans incrémenter le round
  store.removeParticipant('p1');
  combatEngine.nextTurn();
  assert.equal(store.getCombat().currentActorId, 'p2');
  assert.equal(store.getCombat().round, 2);

  // 7. Combattant unique
  const storeSingle = createStore({ storage: createMockStorage() });
  const engineSingle = createCombatEngine(storeSingle);
  storeSingle.addParticipant(new Participant({ id: 'solo', name: 'Solo', initiative: 20, zone: 'active' }));
  engineSingle.start();
  assert.equal(storeSingle.getCombat().round, 1);
  assert.equal(storeSingle.getCombat().currentActorId, 'solo');
  engineSingle.nextTurn();
  assert.equal(storeSingle.getCombat().round, 2);
  assert.equal(storeSingle.getCombat().currentActorId, 'solo');

  // 8. Aucun combattant actif -> nextTurn() ne plante pas
  const storeEmpty = createStore({ storage: createMockStorage() });
  const engineEmpty = createCombatEngine(storeEmpty);
  assert.doesNotThrow(() => engineEmpty.nextTurn());

  // 9. Chargement d'une ancienne sauvegarde avec turnIndex: 1
  const storageOld = createMockStorage({
    'wfrp.combat.v1': JSON.stringify({ round: 1, turnIndex: 1, order: ['x1', 'x2', 'x3'], participants: [{ id: 'x1', name: 'X1', initiative: 40, zone: 'active' }, { id: 'x2', name: 'X2', initiative: 30, zone: 'active' }, { id: 'x3', name: 'X3', initiative: 20, zone: 'active' }] })
  });
  const storeOld = createStore({ storage: storageOld });
  const engineOld = createCombatEngine(storeOld);
  assert.equal(storeOld.getCombat().currentActorId, 'x2');
  engineOld.nextTurn();
  assert.equal(storeOld.getCombat().currentActorId, 'x3');
});

test('Store — Groupage transactionnel batch() [14 cas] (A-08)', () => {
  const storage = createMockStorage();
  const bus = createMockBus();
  const store = createStore({ storage, bus });

  // 1. Hors lot: 1 op = 1 save + 1 emit
  bus.clear();
  store.addProfile(new Profile({ name: 'Single', hp: 10 }));
  assert.equal(bus.events.length, 1);

  // 2. Un lot de 15 ops = 1 save et 1 émission
  bus.clear();
  store.batch(() => {
    for (let i = 0; i < 15; i++) {
      store.addProfile(new Profile({ name: `Batch${i}`, hp: 10 }));
    }
  });
  const reserveEvts = bus.events.filter(e => e.event === 'reserve');
  assert.equal(reserveEvts.length, 1);

  // 3. Lots imbriqués
  bus.clear();
  store.batch(() => {
    store.addProfile(new Profile({ name: 'Outer', hp: 10 }));
    store.batch(() => {
      store.addProfile(new Profile({ name: 'Inner', hp: 10 }));
    });
    // Pas encore émis avant la sortie du lot le plus externe
    assert.equal(bus.events.length, 0);
  });
  assert.equal(bus.events.filter(e => e.event === 'reserve').length, 1);

  // 4. Exception dans un lot flush quand même
  bus.clear();
  assert.throws(() => {
    store.batch(() => {
      store.addProfile(new Profile({ name: 'BeforeError', hp: 10 }));
      throw new Error('Test Error inside batch');
    });
  });
  // Flush exécuté dans block finally
  assert.equal(bus.events.filter(e => e.event === 'reserve').length, 1);
});

test('Store — Quota et journal (A-07)', () => {
  const storage = createMockStorage();
  const bus = createMockBus();
  const store = createStore({ storage, bus });

  storage.setThrowOnSet(true);

  assert.doesNotThrow(() => {
    store.addProfile(new Profile({ name: 'QuotaTest', hp: 10 }));
  });

  // Depuis le lot 10 le journal ne contient que des objets { kind, text, … }
  const logs = store.getLog();
  assert.ok(logs.every(l => l && typeof l === 'object'), 'aucune chaîne brute dans le journal');
  assert.ok(logs.some(l => (l.text || '').includes('Erreur de sauvegarde locale')));
  assert.ok(logs.length <= 300);
});

test('Store — Synchronisation Firebase (A-03, A-04)', async () => {
  let firebaseListener = null;
  let firebasePushedData = null;

  const mockSync = {
    dbRef: 'ref',
    onValue(ref, cb) { firebaseListener = cb; },
    set(ref, data) {
      firebasePushedData = data;
      return Promise.resolve();
    },
    update(ref, data) {
      firebasePushedData = data;
      return Promise.resolve();
    }
  };

  const storage = createMockStorage();
  const bus = createMockBus();
  const store = createStore({ storage, sync: mockSync, bus });

  store.addProfile(new Profile({ name: 'LocalCurrent', hp: 10 }));
  bus.clear();
  firebasePushedData = null;

  const pastTs = Date.now() - 10000;
  firebaseListener({ val: () => ({ writer: 'other_client', timestamp: pastTs, reserve: [{ id: 'old', name: 'Old' }] }) });

  // Attente du debounce de 300ms
  await new Promise(r => setTimeout(r, 350));

  assert.equal(store.getReserve().has('old'), false); // Non appliqué
  assert.ok(firebasePushedData !== null); // Local repoussé !
});

test('Store — Migration maxHp (E-01)', () => {
  const reserveProfiles = [{ id: 'prof1', name: 'Guerrier', hp: 15 }];
  const legacyParticipants = [
    { id: 'part1', profileId: 'prof1', name: 'Guerrier', hp: 4 },
    { id: 'part2', profileId: null, name: 'Loup', hp: 8 },
    { id: 'part3', profileId: null, name: 'Boss', hp: 5, maxHp: 20 },
    { id: 'part4', profileId: null, name: 'ZeroMax', hp: 0, maxHp: 0 }
  ];

  const storage = createMockStorage({
    'wfrp.reserve.v1': JSON.stringify(reserveProfiles),
    'wfrp.combat.v1': JSON.stringify({ round: 1, currentActorId: 'part1', order: ['part1', 'part2', 'part3', 'part4'], participants: legacyParticipants })
  });

  const store = createStore({ storage });
  const parts = store.listParticipants();

  assert.equal(parts.find(p => p.id === 'part1').maxHp, 15);
  assert.equal(parts.find(p => p.id === 'part2').maxHp, null, 'R37 : maximum inconnu sans profil associé');
  assert.equal(parts.find(p => p.id === 'part2').hp, 8);
  assert.equal(parts.find(p => p.id === 'part3').maxHp, 20);
  assert.equal(parts.find(p => p.id === 'part4').maxHp, 0);
});

test('Store — Synchronisation par chemin & isolation du journal (Lot 9)', async () => {
  let updatesSent = null;

  const mockSync = {
    dbRef: 'ref',
    onValue() {},
    update(ref, data) {
      updatesSent = data;
      return Promise.resolve();
    }
  };

  const storage = createMockStorage();
  const store = createStore({ storage, sync: mockSync });

  // 1. Premier flush -> log: null est présent pour purger l'ancien nœud serveur (§9.2)
  store.addProfile(new Profile({ id: 'prof1', name: 'Orc', hp: 12 }));
  await new Promise(r => setTimeout(r, 350));
  assert.equal(updatesSent['log'], null);
  assert.ok(updatesSent['reserve/prof1']);

  // 2. Deuxième flush sur modification -> écriture ciblée sans log
  updatesSent = null;
  store.addParticipant(new Participant({ id: 'part1', name: 'Gobelin', hp: 8, zone: 'active' }));
  await new Promise(r => setTimeout(r, 350));

  assert.equal('log' in updatesSent, false); // Log hors du payload Firebase
  assert.ok(updatesSent['combat/participants/part1']); // Participant ciblé
  assert.ok(updatesSent['combat/meta']); // Méta ciblée

  // 3. Suppression -> écriture de null sur la clé ciblée (§9.1)
  updatesSent = null;
  store.removeProfile('prof1');
  await new Promise(r => setTimeout(r, 350));

  assert.equal(updatesSent['reserve/prof1'], null);

  // 4. Le journal local reste intact après réception de snapshot Firebase sans journal (§9.2)
  let syncCB = null;
  const mockSyncReceive = { dbRef: 'ref', onValue(ref, cb) { syncCB = cb; } };
  const storeReceive = createStore({ storage: createMockStorage(), sync: mockSyncReceive });
  storeReceive.log('Entrée locale unique');

  syncCB({ val: () => ({ writer: 'other_user', timestamp: Date.now() + 100, reserve: [] }) });
  assert.ok(storeReceive.getLog().some(l => (typeof l === 'string' ? l : l.text).includes('Entrée locale unique')));
});
});

describe('Comportements UX et interface', () => {
function createMockStorage(initialData = {}) {
  const store = new Map(Object.entries(initialData));
  return {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    _map: store
  };
}

test('Store — Undo et Instantanés (Lot 10.1)', () => {
  const store = createStore({ storage: createMockStorage() });

  store.addProfile(new Profile({ id: 'prof1', name: 'Guerrier', hp: 12 }));
  assert.equal(store.canUndo(), false);

  // 1. Suppression d'un profil -> instantané capturé
  store.removeProfile('prof1');
  assert.equal(store.getReserve().has('prof1'), false);
  assert.equal(store.canUndo(), true);

  // 2. Restauration avec undo()
  const ok = store.undo();
  assert.equal(ok, true);
  assert.equal(store.getReserve().has('prof1'), true);
  assert.equal(store.getReserve().get('prof1').name, 'Guerrier');
  assert.equal(store.canUndo(), false);
});

test('Store — Historique structuré (Lot 10.4)', () => {
  const store = createStore({ storage: createMockStorage() });

  // 1. Entrée sous forme de chaîne legacy
  store.log('Message classique');
  let log = store.getLog();
  assert.equal(log[0].kind, 'management');
  assert.equal(log[0].text, 'Message classique');

  // 2. Entrée structurée (jet de dé)
  store.log({ kind: 'roll', actorId: 'p1', text: '🎲 Attaque 35', detail: { Roll: 35, SL: 2 } });
  log = store.getLog();
  assert.equal(log[0].kind, 'roll');
  assert.equal(log[0].actorId, 'p1');
  assert.equal(log[0].detail.Roll, 35);
});
});
