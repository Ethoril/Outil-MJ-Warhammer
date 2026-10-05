import test from 'node:test';
import assert from 'node:assert/strict';
import { createEncounter, setEncounterEntry, launchEncounter, addImprovisedParticipant, suspendScene, resumeScene, duplicateEncounter, normalizeCamp } from '../js/core/encounters.js';
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
