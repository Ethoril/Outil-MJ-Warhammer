import test from 'node:test';
import assert from 'node:assert/strict';
import { createEncounter, setEncounterEntry, launchEncounter, addImprovisedParticipant, suspendScene, resumeScene, duplicateEncounter } from '../js/core/encounters.js';
import { previewClosure, applyClosure, retainArchives, exportArchive } from '../js/core/closure.js';
import { migrateSnapshot } from '../js/core/migrations.js';

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

test('E13 clôture — preview sélectif et conflit de doublon persistant', () => {
  const scene = { id: 'scene', encounterId: 'enc', title: 'Fin', status: 'active', round: 2, participants: [
    { id: 'p1', name: 'Renaut 1', hp: 4, states: [{ name: 'Sonné', duration: 1 }, { name: 'Brisé', duration: null }], persistentCharacterId: 'char' },
    { id: 'p2', name: 'Renaut 2', hp: 8, states: [], persistentCharacterId: 'char' }
  ], events: [] };
  const conflict = previewClosure(scene, { persistentCharacters: [{ id: 'char', name: 'Renaut', hp: 14, states: [] }] });
  assert.equal(conflict.ready, false);
  assert.equal(conflict.conflicts[0].reason, 'personnage-persistant-associe-plusieurs-fois');
  const cleanScene = { ...scene, participants: [scene.participants[0]] };
  const preview = previewClosure(cleanScene, { persistentCharacters: [{ id: 'char', name: 'Renaut', hp: 14, states: [] }] });
  const applied = applyClosure(cleanScene, preview, { persistentCharacters: [{ id: 'char', name: 'Renaut', hp: 14, states: [] }], now: 'round:3' });
  assert.equal(applied.status, 'applied');
  assert.equal(applied.characterUpdates[0].hp, 4);
  assert.equal(applied.scene.status, 'closed');
  assert.equal(applied.archive.reports[0].statesAfter[0].name, 'Brisé');
});

test('E13 clôture — désélection explicite, états temporaires et autorité résolvent le doublon', () => {
  const scene = { id: 'scene-select', status: 'active', revision: 3, participants: [
    { id: 'p1', name: 'A', hp: 5, states: [{ name: 'Temporaire', duration: 2 }, { name: 'Persistant', duration: null }], persistentCharacterId: 'char' },
    { id: 'p2', name: 'B', hp: 6, states: [], persistentCharacterId: 'char' }
  ] };
  const characters = [{ id: 'char', name: 'A/B', hp: 10, states: [] }];
  const deselected = previewClosure(scene, { persistentCharacters: characters, selections: { p1: '', p2: '' }, authorities: {} });
  assert.deepEqual(deselected.reports, []);
  assert.equal(deselected.ready, true);
  const resolved = previewClosure(scene, { persistentCharacters: characters, authorities: { char: 'p2' } });
  assert.equal(resolved.ready, true);
  assert.deepEqual(resolved.reports.map(report => report.participantId), ['p2']);
  const unresolved = previewClosure(scene, { persistentCharacters: characters });
  assert.equal(unresolved.ready, false);
  assert.equal(unresolved.conflicts[0].requiresAuthority, true);
  const p1Report = previewClosure({ ...scene, participants: [scene.participants[0]] }, { persistentCharacters: characters }).reports[0];
  assert.deepEqual(p1Report.statesAfter.map(state => state.name), ['Persistant']);
});

test('E13 clôture — aperçu périmé après modification scène, PV ou états', () => {
  const scene = { id: 'scene-stale', revision: 1, status: 'active', participants: [{ id: 'p1', hp: 5, states: [], persistentCharacterId: 'char' }] };
  const options = { persistentCharacters: [{ id: 'char', hp: 10, states: [] }] };
  const preview = previewClosure(scene, options);
  scene.participants[0].hp = 4;
  assert.equal(applyClosure(scene, preview, options).status, 'stale');
  scene.participants[0].hp = 5;
  scene.revision = 2;
  assert.equal(applyClosure(scene, preview, options).status, 'stale');
  scene.revision = 1;
  scene.participants[0].states = [{ name: 'Sonné', duration: null }];
  assert.equal(applyClosure(scene, preview, options).status, 'stale');
});

test('E13 archives — rétention bornée et export lisible', () => {
  const archives = retainArchives([{ id: 'a' }, { id: 'b' }, { id: 'c' }], 2);
  assert.deepEqual(archives.map(item => item.id), ['b', 'c']);
  assert.deepEqual(retainArchives([{ id: 'a' }], 0), []);
  assert.throws(() => retainArchives([{ id: 'a' }], -1), RangeError);
  assert.throws(() => retainArchives([{ id: 'a' }], 1.5), RangeError);
  const archive = { title: 'Fin', createdAt: 'round:3', round: 3, reports: [{ characterName: 'Renaut', hpBefore: 14, hpAfter: 4, statesAfter: [{ name: 'Sonné' }] }] };
  assert.match(exportArchive(archive, 'markdown'), /Renaut.*14.*4/);
  assert.equal(JSON.parse(exportArchive(archive, 'json')).title, 'Fin');
});

test('E13 archives — seuls les reports cochés sont archivés', () => {
  const scene = { id: 'scene-archive', status: 'active', participants: [
    { id: 'p1', hp: 3, states: [], persistentCharacterId: 'c1' },
    { id: 'p2', hp: 7, states: [], persistentCharacterId: 'c2' }
  ] };
  const characters = [{ id: 'c1', hp: 10 }, { id: 'c2', hp: 10 }];
  const preview = previewClosure(scene, { persistentCharacters: characters });
  const result = applyClosure(scene, preview, { persistentCharacters: characters, selectedParticipantIds: ['p1'] });
  assert.deepEqual(result.archive.reports.map(report => report.participantId), ['p1']);
  assert.equal(result.characterUpdates.length, 1);
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
