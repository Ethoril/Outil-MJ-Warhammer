// T3 · CA3, CA12, CA38, CA40, CA41 : sujet d'un suivi et personnages suivis.
import test from 'node:test';
import assert from 'node:assert/strict';
import { aftermathSubjectOf, aftermathSubjects, followedCharacters, followedCharacterConflicts, planEncounterEnd, reconcileAftermathOwners, followedSubjectId } from '../../../js/core/aftermath-subjects.js';
import { v5ResourceIdentity } from '../../../js/core/v5-resources.js';
import { storeWith } from './soins-scenario.helper.js';

const profile = { id: 'profil-hilda', name: 'Hilda', kind: 'PJ', hp: 14, maxHp: 14, caracs: { E: 35, Int: 40 }, skills: [{ id: 'heal', name: 'Guérison', total: 55, advances: 5 }], extensions: { v5: { fate: 2 } } };
const character = { id: 'pc-hilda', name: 'Hilda', profileId: 'profil-hilda', hp: 6, states: [{ id: 's1', name: 'Exténué', level: 1 }], extensions: { v5: { criticalWounds: [{ id: 'cw' }] } } };
const row = (participantId, extra = {}) => ({ id: `i-${participantId}`, participantId, source: { kind: 'wounds-lost', cause: 'combat' }, injuryDay: 0, status: 'open', ...extra });
const base = (extra = {}) => ({ reserve: [profile], persistentCharacters: [character], combat: { participants: [] }, suspendedScenes: [], extensions: { v5: {} }, ...extra });

test('hors rencontre : le sujet est le personnage suivi complété par son profil', () => {
  const envelope = base();
  const found = aftermathSubjectOf(envelope, row('suivi:pc-hilda', { ownerId: 'pc-hilda' }));
  assert.equal(found.where, 'suivi');
  assert.deepEqual([found.subject.id, found.subject.hp, found.subject.maxHp, found.subject.caracs.E, found.subject.skills[0].total], ['suivi:pc-hilda', 6, 14, 35, 55]);
  assert.deepEqual(found.subject.extensions.v5, { fate: 2, criticalWounds: [{ id: 'cw' }] }, 'extensions du profil et du personnage réunies');
  assert.deepEqual(aftermathSubjects(envelope).map(item => item.id), ['suivi:pc-hilda']);
});

test('en rencontre : le sujet est l’exemplaire du combat ; le personnage n’est plus listé hors rencontre', () => {
  const exemplar = { id: 'p1', name: 'Hilda', persistentCharacterId: 'pc-hilda', hp: 4 };
  const envelope = base({ combat: { participants: [exemplar, { id: 'p2', name: 'Hilda 2', persistentCharacterId: 'pc-hilda', hp: 9 }] } });
  assert.equal(aftermathSubjectOf(envelope, row('p1')).subject, exemplar);
  assert.deepEqual(followedCharacters(envelope).map(item => [item.where, item.subjectId]), [['combat', 'p1']], 'un seul exemplaire : le premier');
  assert.deepEqual(aftermathSubjects(envelope).map(item => item.id), ['p1', 'p2']);
});

test('CA13 — scène suspendue ou ancien suivi : aucun sujet, consultation seule', () => {
  const envelope = base({ suspendedScenes: [{ id: 's', participants: [{ id: 'p9', persistentCharacterId: 'pc-hilda', hp: 2 }] }] });
  assert.equal(aftermathSubjectOf(envelope, row('p9')).where, 'aucun');
  assert.equal(aftermathSubjectOf(envelope, row('suivi:pc-hilda')).where, 'aucun', 'le personnage est dans la scène suspendue');
  assert.equal(aftermathSubjectOf(base(), row('participant-disparu')).where, 'aucun');
  assert.deepEqual(aftermathSubjects(envelope), []);
});

test('les suivis rattachés suivent leur personnage : en rencontre, puis hors rencontre', () => {
  const register = { revision: 4, incidents: [row('suivi:pc-hilda', { ownerId: 'pc-hilda' })], diseases: [], sequelae: [{ id: 'scars:suivi:pc-hilda', kind: 'scar-decision', participantId: 'suivi:pc-hilda', ownerId: 'pc-hilda', status: 'permanent' }] };
  const inCombat = reconcileAftermathOwners(base({ combat: { participants: [{ id: 'p1', persistentCharacterId: 'pc-hilda' }] }, extensions: { v5: { aftermathRegister: register } } }));
  const moved = inCombat.extensions.v5.aftermathRegister;
  assert.deepEqual([moved.incidents[0].participantId, moved.sequelae[0].participantId, moved.sequelae[0].id, moved.revision], ['p1', 'p1', 'scars:suivi:pc-hilda', 5], 'l’identifiant d’une ligne ne change jamais');
  const back = reconcileAftermathOwners({ ...inCombat, combat: { participants: [] } }).extensions.v5.aftermathRegister;
  assert.deepEqual([back.incidents[0].participantId, back.sequelae[0].participantId], ['suivi:pc-hilda', 'suivi:pc-hilda']);
  const untouched = base({ extensions: { v5: { aftermathRegister: register } } });
  assert.equal(reconcileAftermathOwners(untouched), untouched, 'rien à réaligner : même objet');
});

test('CA12 — trois copies d’un profil, deux gardées : deux personnages distincts, jamais confondus avec la troisième', () => {
  const goblin = { id: 'profil-gobelin', name: 'Gobelin', kind: 'Créature', hp: 9, maxHp: 9 };
  const copies = [1, 2, 3].map(n => ({ id: `g${n}`, name: `Gobelin ${n}`, kind: 'Créature', profileId: 'profil-gobelin', hp: n, maxHp: 9, states: [] }));
  const register = { revision: 0, calendar: { currentDay: 2 }, incidents: copies.map(copy => row(copy.id)), diseases: [], sequelae: [] };
  let next = 0;
  const plan = planEncounterEnd({ reserve: [goblin], persistentCharacters: [], combat: { participants: copies }, activeScene: { title: 'Embuscade du pont', participants: copies }, extensions: { v5: { aftermathRegister: register } } },
    { keepIds: ['g1', 'g3'], idFactory: () => `nouveau-${++next}` });
  assert.deepEqual(plan.needsChoice.map(item => item.participantId), ['g1', 'g2', 'g3']);
  assert.deepEqual(plan.envelope.persistentCharacters.map(item => [item.id, item.name, item.hp, item.profileId, item.kind]),
    [['nouveau-1', 'Gobelin 1 — Embuscade du pont', 1, 'profil-gobelin', 'Créature'], ['nouveau-2', 'Gobelin 3 — Embuscade du pont', 3, 'profil-gobelin', 'Créature']]);
  const rows = plan.envelope.extensions.v5.aftermathRegister.incidents;
  assert.deepEqual(rows.map(item => [item.participantId, item.ownerId ?? null, item.status]),
    [['suivi:nouveau-1', 'nouveau-1', 'open'], ['g2', null, 'archived'], ['suivi:nouveau-2', 'nouveau-2', 'open']]);
});

test('CA38 — deux personnages suivis pour une même fiche : signalés, jamais départagés d’office', () => {
  const twin = id => ({ id, name: `Hilda (${id})`, hp: 5, extensions: { ficheId: 'fiche-hilda' } });
  const envelope = base({ persistentCharacters: [twin('a'), twin('b'), character] });
  assert.deepEqual(followedCharacterConflicts(envelope), [{ ficheId: 'fiche-hilda', characters: [{ id: 'a', name: 'Hilda (a)', hp: 5 }, { id: 'b', name: 'Hilda (b)', hp: 5 }] }]);
  assert.deepEqual(followedCharacterConflicts(base()), []);
});

test('CA38 — « Garder celui-ci » supprime le doublon et archive ses suivis', async () => {
  const twin = id => ({ id, name: `Hilda (${id})`, hp: 5, maxHp: 14, profileId: 'profil-hilda', extensions: { ficheId: 'fiche-hilda' } });
  const store = await storeWith({ reserve: [profile], persistentCharacters: [twin('a'), twin('b')] });
  await store.registerAftermathIncident({ operationId: 'ia', participantId: 'suivi:a', cause: 'chute' });
  await store.registerAftermathIncident({ operationId: 'ib', participantId: 'suivi:b', cause: 'chute' });
  await store.resolveFollowedCharacterConflict({ keepId: 'a' });
  assert.deepEqual(store.listPersistentCharacters().map(item => item.id), ['a']);
  assert.deepEqual(store.getAftermathState().incidents.map(item => [item.ownerId, item.status]), [['a', 'open'], ['b', 'archived']]);
  assert.deepEqual(store.listFollowedCharacterConflicts(), []);
});

test('CA40 — lier un personnage suivi à une fiche pour la première fois ne détache aucun suivi', async () => {
  const store = await storeWith({ reserve: [profile], persistentCharacters: [character] });
  await store.registerAftermathIncident({ operationId: 'i', participantId: 'suivi:pc-hilda', cause: 'chute' });
  const before = v5ResourceIdentity(JSON.parse(store.getFullJSON()), store.listPersistentCharacters()[0]);
  await store.savePersistentCharacter({ ...store.listPersistentCharacters()[0], extensions: { ...character.extensions, ficheId: 'fiche-hilda' } });
  const after = v5ResourceIdentity(JSON.parse(store.getFullJSON()), store.listPersistentCharacters()[0]);
  assert.deepEqual([before, after], ['persistent:pc-hilda', 'fiche:fiche-hilda'], 'la clé de ressource change : elle ne peut pas servir de propriétaire');
  const incident = store.getAftermathState().incidents[0];
  assert.deepEqual([incident.ownerId, incident.participantId, incident.status], ['pc-hilda', followedSubjectId('pc-hilda'), 'open']);
  assert.equal(store.listAftermathSubjects().find(item => item.id === 'suivi:pc-hilda').hp, 6);
});

test('CA41 — un participant et son personnage suivi ont la même identité de ressource', () => {
  for (const ficheId of [null, 'fiche-hilda']) {
    const pc = { ...character, extensions: { ...character.extensions, ...(ficheId ? { ficheId } : {}) } };
    const exemplar = { id: 'p1', persistentCharacterId: 'pc-hilda', profileId: 'profil-hilda', extensions: ficheId ? { ficheId } : {} };
    const envelope = base({ persistentCharacters: [pc], combat: { participants: [exemplar] } });
    const off = base({ persistentCharacters: [pc] });
    const projected = aftermathSubjects(off)[0];
    assert.equal(v5ResourceIdentity(envelope, exemplar), v5ResourceIdentity(off, pc));
    assert.equal(v5ResourceIdentity(off, projected), v5ResourceIdentity(off, pc), 'la projection hors rencontre garde la même identité');
  }
});
