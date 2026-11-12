// Contre-vérification indépendante du 12/11 (CAMP-10) : un test par écart remonté.
import test from 'node:test';
import assert from 'node:assert/strict';
import { storeWith, sheet, combatOf, asFollowed } from './soins-scenario.helper.js';
import { pendingSequelaDecisions } from '../../../js/core/v5-sequelae.js';
import { sequelaPhase } from '../../../js/core/v5-sequela-effects.js';
import { planEncounterEnd } from '../../../js/core/aftermath-subjects.js';

test('1 — une fracture ou une déchirure archivée n’attend plus aucun Test ni décision', () => {
  const bone = status => ({ id: `bone-${status}`, participantId: 'p', kind: 'broken-bone', label: 'Fracture', status, startDay: 0, endDay: 5, history: [] });
  const state = { calendar: { currentDay: 9 }, sequelae: [bone('archived'), bone('open'),
    { id: 'tear', participantId: 'p', kind: 'torn-muscle', severity: 'minor', label: 'Déchirure', status: 'archived', endDay: 20, history: [] },
    { id: 'deadline', participantId: 'p', kind: 'surgery-deadline', label: 'Chirurgie', status: 'archived', deadlineDay: 2, history: [] }] };
  assert.deepEqual(pendingSequelaDecisions(state).map(row => row.sequelaId), ['bone-open']);
  assert.deepEqual(state.sequelae.map(row => sequelaPhase(row, 9)), ['archived', 'awaiting-test', 'archived', 'archived']);
});

test('2 — soigneur extérieur : un seul soin de maladie par soigneur et par jour, double envoi refusé', async () => {
  const a = asFollowed(sheet('patient'));
  const store = await storeWith({ reserve: [a.profile], persistentCharacters: [a.character] });
  await store.registerAftermathDisease({ operationId: 'd', participantId: 'suivi:pc-patient', label: 'Fièvre', durationDays: 5 });
  const diseaseId = store.getAftermathState().diseases[0].id;
  const care = (operationId, name) => store.careForAftermathDisease({ operationId, diseaseId, externalHealer: { name, score: 60, intelligenceBonus: 5 }, roll: 20, rested: true });
  assert.equal((await care('c1', 'Barbier de Wurtbad')).receipt.status, 'applied');
  assert.equal((await care('c2', '  barbier de wurtbad ')).receipt.reason, 'care-already-recorded-today', 'même soigneur, même jour');
  assert.equal((await care('c3', 'Sœur Ilse')).receipt.status, 'applied', 'un autre soigneur fait son propre Test');
  assert.equal(store.getAftermathState().diseases[0].careLog[0].healerId, 'external:barbier de wurtbad');
});

test('3 — supprimer une rencontre suspendue archive les suivis de ses participants', async () => {
  const goblin = { id: 'profil-gobelin', name: 'Gobelin', kind: 'Créature', hp: 9, maxHp: 9, caracs: { E: 30 } };
  const store = await storeWith({ reserve: [goblin], encounters: [{ id: 'e', title: 'Pont', entries: [{ id: 'l', profileId: 'profil-gobelin', quantity: 1, camp: 'ennemi', zone: 'active' }] }] });
  await store.launchEncounter('e');
  const gob = store.listParticipants()[0];
  await store.updateParticipant(gob.id, { hp: 2 });
  await store.registerAftermathIncident({ operationId: 'i', participantId: gob.id, cause: 'combat' });
  await store.suspendActiveScene();
  assert.equal(store.getAftermathState().incidents[0].status, 'open');
  await store.deleteEncounter('e');
  assert.equal(store.listSuspendedScenes().length, 0, 'précondition : la scène suspendue a disparu');
  assert.equal(store.getAftermathState().incidents[0].status, 'archived');
});

test('4 — exporter vers la réserve : la copie non liée d’un PJ à fiche ne conteste pas la santé du personnage suivi', async () => {
  const profile = { id: 'profil-hilda', name: 'Hilda', kind: 'PJ', hp: 20, maxHp: 20, caracs: { E: 30 }, extensions: { ficheId: 'fiche-hilda' } };
  const pc = { id: 'pc-hilda', name: 'Hilda', kind: 'PJ', profileId: 'profil-hilda', hp: 8, maxHp: 20, states: [], extensions: { ficheId: 'fiche-hilda' } };
  const store = await storeWith({ reserve: [profile], persistentCharacters: [pc], encounters: [{ id: 'e', title: 'Pont', entries: [{ id: 'l', profileId: 'profil-hilda', quantity: 2, camp: 'pj', zone: 'active' }] }] });
  await store.launchEncounter('e');
  const [first, second] = store.listParticipants().sort((a, b) => (a.persistentCharacterId ? -1 : 1));
  assert.deepEqual([first.persistentCharacterId, second.persistentCharacterId], ['pc-hilda', null]);
  await store.updateParticipant(first.id, { hp: 3 });
  const result = await store.exportToReserve();
  assert.deepEqual(result.warnings, []);
  assert.equal(store.listPersistentCharacters()[0].hp, 3);
});

test('5 — fin de combat, fiche portée par deux personnages : aucun n’est choisi, et garder ne crée pas un troisième porteur de la fiche', () => {
  const twin = id => ({ id, name: `Hilda (${id})`, kind: 'PJ', hp: 5, maxHp: 20, states: [], extensions: { ficheId: 'fiche-hilda' } });
  const hilda = { id: 'p', name: 'Hilda', kind: 'PJ', hp: 4, maxHp: 20, states: [], extensions: { ficheId: 'fiche-hilda' } };
  const register = { revision: 0, calendar: { currentDay: 0 }, incidents: [{ id: 'i', participantId: 'p', status: 'open', source: { kind: 'wounds-lost', cause: 'combat' } }], diseases: [], sequelae: [] };
  const envelope = { reserve: [], persistentCharacters: [twin('a'), twin('b')], combat: { participants: [hilda] }, extensions: { v5: { aftermathRegister: register } } };
  const asked = planEncounterEnd(envelope, {});
  assert.deepEqual(asked.needsChoice.map(row => [row.participantId, row.conflict]), [['p', true]]);
  assert.deepEqual(asked.envelope.persistentCharacters.map(row => row.hp), [5, 5], 'aucun des deux n’est modifié');
  const kept = planEncounterEnd(envelope, { keepIds: ['p'], idFactory: () => 'nouveau' });
  const made = kept.envelope.persistentCharacters.find(row => row.id === 'nouveau');
  assert.deepEqual([made.hp, made.extensions.ficheId ?? null], [4, null], 'gardé sans la fiche : pas de troisième doublon');
  assert.equal(kept.envelope.extensions.v5.aftermathRegister.incidents[0].ownerId, 'nouveau');
});
