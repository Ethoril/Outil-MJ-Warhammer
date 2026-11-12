// T4 · CA6 à CA13, CA39 : fin de combat, retrait, suspension, suppression d'un personnage suivi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { storeWith } from './soins-scenario.helper.js';

const hildaProfile = { id: 'profil-hilda', name: 'Hilda', kind: 'PJ', hp: 14, maxHp: 14, caracs: { E: 35, Int: 40 }, extensions: { ficheId: 'fiche-hilda' } };
const ottoProfile = { id: 'profil-otto', name: 'Otto', kind: 'PJ', hp: 12, maxHp: 12, caracs: { E: 30, Int: 30 } };
const goblin = { id: 'profil-gobelin', name: 'Gobelin', kind: 'Créature', hp: 9, maxHp: 9, caracs: { E: 30, Int: 20 } };
const encounter = { id: 'embuscade', title: 'Embuscade du pont', entries: [
  { id: 'l-hilda', profileId: 'profil-hilda', quantity: 1, camp: 'pj', zone: 'active' },
  { id: 'l-otto', profileId: 'profil-otto', quantity: 1, camp: 'pj', zone: 'active' },
  { id: 'l-gob', profileId: 'profil-gobelin', quantity: 3, camp: 'ennemi', zone: 'active' }] };

async function launched(extra = {}) {
  const store = await storeWith({ reserve: [hildaProfile, ottoProfile, goblin], encounters: [encounter], ...extra });
  await store.launchEncounter('embuscade');
  const byName = name => store.listParticipants().find(row => row.name === name);
  const hurt = async (name, hp) => { await store.updateParticipant(byName(name).id, { hp }); return byName(name).id; };
  const open = async (name, operationId = `i-${name}`) => { assert.equal((await store.registerAftermathIncident({ operationId, participantId: byName(name).id, cause: 'combat' })).receipt.status, 'applied'); };
  return { store, byName, hurt, open };
}
const rows = store => { const s = store.getAftermathState(); return [...s.incidents, ...s.diseases, ...s.sequelae]; };

test('CA6, CA7, CA9 — un PJ lié à une fiche devient personnage suivi sans question ; PV et États conservés', async () => {
  const { store, hurt, open, byName } = await launched();
  const hildaId = await hurt('Hilda', 6);
  await store.updateParticipant(hildaId, { states: [{ id: 's1', name: 'Exténué', key: 'extenue', level: 1 }] });
  await open('Hilda');
  assert.deepEqual(store.previewEncounterEnd(), [], 'aucune fenêtre : personne à garder ou non');
  await store.endEncounter();
  assert.deepEqual(store.listParticipants(), []);
  const [pc] = store.listPersistentCharacters();
  assert.deepEqual([pc.name, pc.hp, pc.maxHp, pc.kind, pc.profileId, pc.extensions.ficheId, pc.states.map(s => s.name)], ['Hilda', 6, 14, 'PJ', 'profil-hilda', 'fiche-hilda', ['Exténué']]);
  const incident = store.getAftermathState().incidents[0];
  assert.deepEqual([incident.status, incident.ownerId, incident.participantId, incident.ownerLabel], ['open', pc.id, `suivi:${pc.id}`, 'Hilda — Embuscade du pont']);
  assert.deepEqual(store.listAftermathSubjects().map(row => [row.id, row.hp, row.offEncounter]), [[`suivi:${pc.id}`, 6, true]]);
  assert.equal(byName('Hilda'), undefined);
});

test('CA7 — un PJ à fiche indemne et sans suivi ne crée rien ; avec des PV perdus, il est suivi', async () => {
  const intact = await launched();
  await intact.store.endEncounter();
  assert.deepEqual(intact.store.listPersistentCharacters(), []);
  const wounded = await launched();
  await wounded.hurt('Hilda', 9);
  await wounded.store.endEncounter();
  assert.deepEqual(wounded.store.listPersistentCharacters().map(row => [row.name, row.hp]), [['Hilda', 9]]);
});

test('CA8 — PNJ, créature et PJ sans fiche : garder ou archiver ; gardé, le personnage porte le nom du suivi', async () => {
  const { store, hurt, open, byName } = await launched();
  await hurt('Gobelin 1', 2); await hurt('Gobelin 2', 3); await hurt('Otto', 4);
  await open('Gobelin 1'); await open('Gobelin 2'); await open('Otto');
  const g1 = byName('Gobelin 1').id, g2 = byName('Gobelin 2').id;
  await store.registerAftermathDisease({ operationId: 'd', participantId: g1, label: 'Fièvre', durationDays: 3 });
  await store.recordAftermathCharacteristicLoss({ operationId: 'c', participantId: g1, carac: 'F', amount: 2, reason: 'Fièvre' });
  const choice = store.previewEncounterEnd();
  assert.deepEqual(choice.map(row => [row.name, row.label, row.count]), [['Otto', 'Otto — Embuscade du pont', 1], ['Gobelin 1', 'Gobelin 1 — Embuscade du pont', 3], ['Gobelin 2', 'Gobelin 2 — Embuscade du pont', 1]]);
  await store.endEncounter({ keepIds: [g2, byName('Otto').id] });
  assert.deepEqual(store.listPersistentCharacters().map(row => [row.name, row.hp, row.kind, row.profileId]),
    [['Otto — Embuscade du pont', 4, 'PJ', 'profil-otto'], ['Gobelin 2 — Embuscade du pont', 3, 'Créature', 'profil-gobelin']]);
  const state = store.getAftermathState();
  assert.deepEqual(rows(store).filter(row => row.participantId === g1).map(row => row.status), ['archived', 'archived', 'archived'], 'blessure, maladie et séquelle du gobelin non gardé');
  const kept = state.incidents.find(row => row.ownerLabel === 'Gobelin 2 — Embuscade du pont');
  assert.deepEqual([kept.status, kept.participantId], ['open', `suivi:${kept.ownerId}`]);
  assert.equal(store.getAftermathRowLabel(kept), 'Gobelin 2 — Embuscade du pont');
});

test('CA11 — un seul ↶ annule la fin du combat avec ses gardes et ses archivages', async () => {
  const { store, hurt, open, byName } = await launched();
  await hurt('Hilda', 6); await hurt('Gobelin 1', 2); await hurt('Gobelin 2', 3);
  await open('Hilda'); await open('Gobelin 1'); await open('Gobelin 2');
  const before = { participants: store.listParticipants().map(row => [row.id, row.hp]), register: store.getAftermathState(), characters: store.listPersistentCharacters() };
  await store.endEncounter({ keepIds: [byName('Gobelin 2').id] });
  assert.equal(store.listPersistentCharacters().length, 2);
  assert.equal(await store.undo(), true);
  assert.deepEqual(store.listParticipants().map(row => [row.id, row.hp]), before.participants);
  assert.deepEqual(store.getAftermathState(), before.register);
  assert.deepEqual(store.listPersistentCharacters(), before.characters);
});

test('CA10 — retirer un participant applique les mêmes règles à ce participant', async () => {
  const { store, hurt, open, byName } = await launched();
  await hurt('Hilda', 6); await hurt('Gobelin 1', 2); await hurt('Gobelin 2', 3);
  await open('Hilda'); await open('Gobelin 1'); await open('Gobelin 2');
  const g1 = byName('Gobelin 1').id, g2 = byName('Gobelin 2').id, hilda = byName('Hilda').id;
  assert.deepEqual(store.previewEncounterEnd({ participantIds: [g1] }).map(row => row.name), ['Gobelin 1']);
  assert.deepEqual(store.previewEncounterEnd({ participantIds: [hilda] }), []);
  await store.removeParticipant(g1);
  await store.removeParticipant(g2, { keep: true });
  await store.removeParticipant(hilda);
  assert.deepEqual(store.listPersistentCharacters().map(row => [row.name, row.hp]), [['Gobelin 2 — Embuscade du pont', 3], ['Hilda', 6]]);
  assert.deepEqual(store.getAftermathState().incidents.map(row => [row.ownerLabel, row.status, Boolean(row.ownerId)]),
    [['Hilda — Embuscade du pont', 'open', true], ['Gobelin 1 — Embuscade du pont', 'archived', false], ['Gobelin 2 — Embuscade du pont', 'open', true]]);
  assert.equal(store.listParticipants().length, 2, 'Otto et Gobelin 3 restent en combat');
});

test('CA13 — suspendre une scène ne pose aucune question : suivis en consultation, « reprenez la scène »', async () => {
  const { store, hurt, open, byName } = await launched();
  await hurt('Gobelin 1', 2); await open('Gobelin 1');
  const g1 = byName('Gobelin 1').id;
  const before = store.getAftermathState();
  await store.suspendActiveScene();
  assert.deepEqual(store.getAftermathState(), before, 'registre intact');
  assert.deepEqual(store.listPersistentCharacters(), []);
  assert.equal(store.getAftermathSubjectPlace(g1), 'suspendue');
  assert.deepEqual(store.listAftermathSubjects(), []);
  const care = await store.treatAftermathWound({ operationId: 't', incidentId: before.incidents[0].id, externalHealer: { name: 'Barbier', score: 50, intelligenceBonus: 3 }, roll: 20, supplies: true });
  assert.equal(care.receipt.reason, 'subject-unavailable');
  assert.equal((await store.archiveAftermathIncident({ operationId: 'a', incidentId: before.incidents[0].id })).receipt.status, 'applied', 'un suivi sans sujet reste archivable à la main');
});

test('CA39 — supprimer un personnage suivi archive ses suivis ouverts ; le nombre est annoncé avant', async () => {
  const { store, hurt, open } = await launched();
  await hurt('Hilda', 6); await open('Hilda');
  await store.endEncounter();
  const [pc] = store.listPersistentCharacters();
  await store.registerAftermathDisease({ operationId: 'd', participantId: `suivi:${pc.id}`, label: 'Fièvre', durationDays: 3 });
  assert.deepEqual(store.previewFollowedCharacterRemoval(pc.id), { archived: 2 });
  await store.deletePersistentCharacter(pc.id);
  assert.deepEqual(store.listPersistentCharacters(), []);
  assert.deepEqual(rows(store).map(row => row.status), ['archived', 'archived']);
  assert.equal(await store.undo(), true);
  assert.deepEqual(rows(store).map(row => row.status), ['open', 'active']);
});
