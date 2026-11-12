// T7 · CA20 à CA23 : participants, personnages suivis et soigneur extérieur.
// Règles relues (docs/AUDIT_REGLES.md, F-L06-0301 à 0310, V5 p. 170 à 172) : fournitures, un soin par incident,
// talent Chirurgie pour opérer ; aucune règle ne borne autrement qui peut soigner.
import test from 'node:test';
import assert from 'node:assert/strict';
import { storeWith, woundedPatient, healerSheet, sheet, asFollowed, combatOf } from './soins-scenario.helper.js';

const barber = (extra = {}) => ({ name: 'Barbier de Wurtbad', score: 60, intelligenceBonus: 5, hasSurgeryTalent: false, ...extra });

test('CA20, CA21 — un personnage suivi soigne un participant présent avec la compétence de sa fiche, États compris', async () => {
  const healer = asFollowed(healerSheet({ states: [] }));
  const store = await storeWith({ reserve: [healer.profile], persistentCharacters: [healer.character], combat: combatOf([sheet('patient')]) });
  assert.deepEqual(store.listAftermathSubjects().map(row => [row.id, row.offEncounter === true]), [['patient', false], ['suivi:pc-healer', true]]);
  await store.registerAftermathIncident({ operationId: 'i', participantId: 'patient', cause: 'combat' });
  const incidentId = store.getAftermathState().incidents[0].id;
  // Score 60, jet 20 : 4 DR ; Int 50 : Bonus 5 ; talent Chirurgie : choix des DR.
  const done = await store.treatAftermathWound({ operationId: 'w', incidentId, healerId: 'suivi:pc-healer', roll: 20, supplies: true, surgeryChoice: 'sl' });
  assert.deepEqual([done.receipt.status, done.receipt.score, done.receipt.sl, done.receipt.healed, done.receipt.healerId], ['applied', 60, 4, 9, 'suivi:pc-healer']);
  assert.equal(done.receipt.healerExternal, undefined);
});

test('CA21 — sans la compétence sur sa fiche, un personnage suivi est refusé comme un participant', async () => {
  const novice = asFollowed(sheet('novice', { hp: 20 }));
  const store = await storeWith({ reserve: [novice.profile], persistentCharacters: [novice.character], combat: combatOf([sheet('patient')]) });
  await store.registerAftermathIncident({ operationId: 'i', participantId: 'patient', cause: 'combat' });
  const incidentId = store.getAftermathState().incidents[0].id;
  assert.equal((await store.treatAftermathWound({ operationId: 'w', incidentId, healerId: 'suivi:pc-novice', roll: 20, supplies: true })).receipt.reason, 'skill-missing');
  assert.equal((await store.treatAftermathWound({ operationId: 'w2', incidentId, roll: 20, supplies: true })).receipt.reason, 'healer-required');
});

test('CA22 — soigneur extérieur : nom, score et Bonus d’Intelligence saisis ; le reçu porte son nom et « extérieur »', async () => {
  const store = await storeWith({ combat: combatOf([sheet('patient')]) });
  await store.registerAftermathIncident({ operationId: 'i', participantId: 'patient', cause: 'combat' });
  const incidentId = store.getAftermathState().incidents[0].id;
  for (const bad of [{ name: '' }, { score: null }, { intelligenceBonus: -1 }, { score: 12.5 }]) {
    assert.equal((await store.treatAftermathWound({ operationId: `bad-${JSON.stringify(bad)}`, incidentId, externalHealer: barber(bad), roll: 20, supplies: true })).receipt.reason, 'external-healer-facts-required');
  }
  const done = await store.treatAftermathWound({ operationId: 'w', incidentId, externalHealer: barber(), roll: 20, supplies: true });
  assert.deepEqual([done.receipt.status, done.receipt.score, done.receipt.sl, done.receipt.healed, done.receipt.healerName, done.receipt.healerExternal, done.receipt.healerId],
    ['applied', 60, 4, 9, 'Barbier de Wurtbad', true, 'external:w']);
  assert.equal(store.listParticipants()[0].hp, 14);
  const state = store.getAftermathState();
  assert.deepEqual([state.incidents[0].treatments[0].healerId, state.incidents[0].treatments[0].healerName], ['external:w', 'Barbier de Wurtbad']);
  assert.deepEqual([state.receipts.at(-1).healerName, state.receipts.at(-1).healerExternal], ['Barbier de Wurtbad', true], 'le reçu enregistré porte la mention');
});

test('CA22 — même score, même jet : un soigneur extérieur rend le même résultat qu’un personnage', async () => {
  const run = async input => {
    const store = await storeWith({ combat: combatOf([sheet('patient'), healerSheet({ talents: [] })]) });
    await store.registerAftermathIncident({ operationId: 'i', participantId: 'patient', cause: 'combat' });
    const out = await store.treatAftermathWound({ operationId: 'w', incidentId: store.getAftermathState().incidents[0].id, roll: 35, supplies: true, ...input });
    return [out.receipt.status, out.receipt.score, out.receipt.sl, out.receipt.healed, store.listParticipants().find(row => row.id === 'patient').hp];
  };
  assert.deepEqual(await run({ externalHealer: barber() }), await run({ healerId: 'healer' }));
});

test('CA23 — chirurgie : un soigneur extérieur sans le talent déclaré est refusé, avec le talent il opère', async () => {
  const { patient, record } = woundedPatient();
  const store = await storeWith({ combat: combatOf([patient]) });
  await store.registerAftermathIncident({ operationId: 'i', participantId: 'patient', criticalId: record.id });
  const incidentId = store.getAftermathState().incidents[0].id;
  assert.equal((await store.treatAftermathSurgicalIncident({ operationId: 's0', incidentId, externalHealer: barber(), roll: 20 })).receipt.reason, 'surgery-talent-required');
  const done = await store.treatAftermathSurgicalIncident({ operationId: 's1', incidentId, externalHealer: barber({ hasSurgeryTalent: true }), roll: 20 });
  assert.deepEqual([done.receipt.reason, done.receipt.healerName, done.receipt.healerExternal], ['surgery-success', 'Barbier de Wurtbad', true]);
});

test('CA22 — soigneur extérieur pour une maladie et pour un personnage suivi hors rencontre', async () => {
  const a = asFollowed(sheet('patient'));
  const store = await storeWith({ reserve: [a.profile], persistentCharacters: [a.character] });
  await store.registerAftermathDisease({ operationId: 'd', participantId: 'suivi:pc-patient', label: 'Fièvre', durationDays: 2 });
  const care = await store.careForAftermathDisease({ operationId: 'c', diseaseId: store.getAftermathState().diseases[0].id, externalHealer: barber(), roll: 20, rested: true });
  assert.deepEqual([care.receipt.status, care.receipt.healerName, care.receipt.healerExternal], ['applied', 'Barbier de Wurtbad', true]);
  assert.equal(store.getAftermathState().diseases[0].careLog[0].healerName, 'Barbier de Wurtbad');
});
