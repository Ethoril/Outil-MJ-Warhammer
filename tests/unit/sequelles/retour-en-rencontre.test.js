// T5 · CA24 à CA27 : retour d'un personnage suivi en rencontre.
import test from 'node:test';
import assert from 'node:assert/strict';
import { storeWith, woundedPatient, healerSheet, asFollowed } from './soins-scenario.helper.js';
import { launchEncounter } from '../../../js/core/encounters.js';

const goblin = { id: 'profil-gobelin', name: 'Gobelin', kind: 'Créature', hp: 9, maxHp: 9, caracs: { E: 30, Int: 20 } };
const hildaProfile = { id: 'profil-hilda', name: 'Hilda', kind: 'PJ', hp: 20, maxHp: 20, caracs: { E: 30, Int: 50 }, skills: [], talents: [], extensions: { ficheId: 'fiche-hilda' } };

test('CA24, CA27 — un PJ à fiche revient avec PV, États, Blessures Critiques et suivis, sans choix dans Préparer', async () => {
  const { patient, record } = woundedPatient();
  const healer = asFollowed(healerSheet());
  const hilda = { id: 'pc-hilda', name: 'Hilda', kind: 'PJ', profileId: 'profil-hilda', hp: patient.hp, maxHp: 20, states: patient.states,
    extensions: { ficheId: 'fiche-hilda', v5: { criticalAftermath: patient.extensions.v5.criticalAftermath, criticalWounds: patient.extensions.v5.criticalWounds } } };
  const encounter = { id: 'retour', title: 'Retour au pont', entries: [{ id: 'l-hilda', profileId: 'profil-hilda', quantity: 1, camp: 'pj', zone: 'active' }, { id: 'l-gob', profileId: 'profil-gobelin', quantity: 1, camp: 'ennemi', zone: 'active' }] };
  const store = await storeWith({ reserve: [hildaProfile, goblin, healer.profile], persistentCharacters: [hilda, healer.character], encounters: [encounter] });
  // Avant la rencontre : suivi du critique ouvert, premier soin hors rencontre.
  await store.registerAftermathIncident({ operationId: 'i', participantId: 'suivi:pc-hilda', criticalId: record.id });
  const incidentId = store.getAftermathState().incidents[0].id;
  await store.launchEncounter('retour');
  const exemplar = store.listParticipants().find(row => row.name === 'Hilda');
  assert.deepEqual([exemplar.persistentCharacterId, exemplar.hp, exemplar.states.map(s => [s.id, s.level]), exemplar.extensions.v5.criticalWounds.length, exemplar.extensions.v5.criticalAftermath[0].id],
    ['pc-hilda', 5, [['st-bleed', 2]], 1, record.id]);
  const incident = store.getAftermathState().incidents[0];
  assert.deepEqual([incident.participantId, incident.ownerId], [exemplar.id, 'pc-hilda'], 'le suivi suit le personnage dans la rencontre');
  assert.deepEqual(store.listAftermathProposals(), [], 'le critique déjà suivi n’est pas reproposé');
  assert.deepEqual(store.listAftermathSubjects().map(row => [row.name, row.offEncounter === true]).sort(), [['Gobelin', false], ['Hilda', false], ['healer', true]]);
  // Pendant la rencontre : chirurgie par un personnage suivi resté hors rencontre, sur le même suivi.
  const surgery = await store.treatAftermathSurgicalIncident({ operationId: 's', incidentId, healerId: 'suivi:pc-healer', roll: 20 });
  assert.equal(surgery.receipt.reason, 'surgery-success');
  await store.updateParticipant(exemplar.id, { hp: 3 });
  await store.endEncounter();
  const after = store.listPersistentCharacters().find(row => row.id === 'pc-hilda');
  assert.deepEqual([after.hp, after.extensions.v5.criticalWounds.length, after.extensions.ficheId], [3, 1, 'fiche-hilda']);
  const kept = store.getAftermathState().incidents[0];
  assert.deepEqual([kept.id, kept.participantId, kept.surgeryCompleted, kept.treatments.length, kept.status], [incidentId, 'suivi:pc-hilda', true, 1, 'open'], 'CA27 : le soin fait en rencontre reste au personnage');
  assert.equal(store.listPersistentCharacters().length, 2, 'aucun doublon créé pour Hilda');
});

test('CA25 — un PNJ gardé n’entre que si le MJ le choisit dans Préparer', () => {
  const kept = { id: 'pc-gob', name: 'Gobelin 2 — Embuscade du pont', kind: 'Créature', profileId: 'profil-gobelin', hp: 3, maxHp: 9, states: [] };
  const plain = launchEncounter({ id: 'e', title: 'Autre', entries: [{ id: 'l', profileId: 'profil-gobelin', quantity: 2 }] }, { profiles: [goblin], persistentCharacters: [kept] });
  assert.deepEqual(plain.participants.map(row => [row.persistentCharacterId, row.hp]), [[null, 9], [null, 9]], 'le profil seul ne reprend pas le personnage gardé');
  const chosen = launchEncounter({ id: 'e', title: 'Autre', entries: [{ id: 'l', profileId: 'profil-gobelin', quantity: 1, persistentCharacterId: 'pc-gob' }] }, { profiles: [goblin], persistentCharacters: [kept] });
  assert.deepEqual(chosen.participants.map(row => [row.persistentCharacterId, row.hp, row.maxHp]), [['pc-gob', 3, 9]]);
});

test('CA26 — sur une ligne à plusieurs exemplaires, seul le premier représente le personnage suivi', () => {
  const kept = { id: 'pc-gob', name: 'Gobelin gardé', kind: 'Créature', profileId: 'profil-gobelin', hp: 3, maxHp: 9, states: [{ id: 's', name: 'Exténué', level: 1 }], extensions: { v5: { criticalWounds: [{ id: 'cw' }] } } };
  const scene = launchEncounter({ id: 'e', title: 'Autre', entries: [{ id: 'l', profileId: 'profil-gobelin', quantity: 3, persistentCharacterId: 'pc-gob' }, { id: 'l2', profileId: 'profil-gobelin', quantity: 1, persistentCharacterId: 'pc-gob' }] }, { profiles: [goblin], persistentCharacters: [kept] });
  assert.deepEqual(scene.participants.map(row => [row.persistentCharacterId, row.hp, row.states.length, (row.extensions?.v5?.criticalWounds || []).length]),
    [['pc-gob', 3, 1, 1], [null, 9, 0, 0], [null, 9, 0, 0], [null, 9, 0, 0]], 'un seul exemplaire par personnage et par rencontre, même sur deux lignes');
});

test('CA24, CA38 — fiche portée par un seul personnage : adoptée ; par deux : aucun n’est choisi', () => {
  const pc = id => ({ id, name: 'Hilda', kind: 'PJ', hp: 7, maxHp: 20, states: [], extensions: { ficheId: 'fiche-hilda' } });
  const encounter = { id: 'e', title: 'Autre', entries: [{ id: 'l', profileId: 'profil-hilda', quantity: 1 }] };
  assert.deepEqual(launchEncounter(encounter, { profiles: [hildaProfile], persistentCharacters: [pc('a')] }).participants.map(row => [row.persistentCharacterId, row.hp]), [['a', 7]]);
  assert.deepEqual(launchEncounter(encounter, { profiles: [hildaProfile], persistentCharacters: [pc('a'), pc('b')] }).participants.map(row => [row.persistentCharacterId, row.hp]), [[null, 20]]);
  const npc = { ...hildaProfile, id: 'profil-pnj', kind: 'PNJ' };
  assert.deepEqual(launchEncounter({ id: 'e', title: 'x', entries: [{ id: 'l', profileId: 'profil-pnj', quantity: 1 }] }, { profiles: [npc], persistentCharacters: [pc('a')] }).participants.map(row => row.persistentCharacterId), [null], 'seul un PJ est repris d’office');
});

test('recommencer le combat : les suivis rattachés suivent leur personnage, les autres sont archivés', async () => {
  const hilda = { id: 'pc-hilda', name: 'Hilda', kind: 'PJ', profileId: 'profil-hilda', hp: 8, maxHp: 20, states: [], extensions: { ficheId: 'fiche-hilda' } };
  const encounter = { id: 'retour', title: 'Retour au pont', entries: [{ id: 'l-hilda', profileId: 'profil-hilda', quantity: 1, camp: 'pj', zone: 'active' }, { id: 'l-gob', profileId: 'profil-gobelin', quantity: 1, camp: 'ennemi', zone: 'active' }] };
  const store = await storeWith({ reserve: [hildaProfile, goblin], persistentCharacters: [hilda], encounters: [encounter] });
  await store.launchEncounter('retour');
  const gob = store.listParticipants().find(row => row.name === 'Gobelin');
  await store.updateParticipant(gob.id, { hp: 2 });
  await store.registerAftermathIncident({ operationId: 'g', participantId: gob.id, cause: 'combat' });
  await store.registerAftermathIncident({ operationId: 'h', participantId: store.listParticipants().find(row => row.name === 'Hilda').id, cause: 'combat' });
  await store.restartCombat();
  const hildaNow = store.listParticipants().find(row => row.name === 'Hilda');
  assert.deepEqual(store.getAftermathState().incidents.map(row => [row.status, row.participantId === hildaNow.id]), [['archived', false], ['open', true]]);
});
