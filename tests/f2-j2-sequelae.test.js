import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCriticalAftermathRecord } from '../js/core/v5-critical-aftermath.js';
import { getV5CriticalEffect } from '../js/data/v5-crits.js';
import { planSequelae, splitCharacteristicLoss } from '../js/core/v5-sequelae.js';

// F2-J2 : suivi des séquelles d'un critique F2-I (fractures, déchirures, pertes), étapes de guérison, issue et clôture.
const clone = structuredClone;
function memoryPersistence() {
  let saved = null;
  return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } };
}
const base = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 20, maxHp: 20, caracs: { E: 30, Int: 50, M: 4, CC: 50, Ag: 40 }, skills: [], talents: [], states: [], extensions: { v5: {} }, ...extra });
const healerSheet = (extra = {}) => base('healer', { skills: [{ id: 'heal', name: 'Guérison', carac: 'Int', total: 60, advances: 10, status: 'resolved' }], ...extra });
const rollOf = (table, name) => Array.from({ length: 200 }, (_, i) => i + 1).find(n => getV5CriticalEffect(table, n)?.source?.printedName === name);
function wounded(id, table, name, patch = {}) {
  const made = createCriticalAftermathRecord(base(id), { table, effectRoll: rollOf(table, name), resolutionId: `res-${id}` });
  const participant = made.participant;
  const record = { ...made.record, ...patch };
  participant.extensions.v5.criticalAftermath = [record];
  participant.extensions.v5.criticalWounds = [{ id: record.criticalWoundId, name: record.effectName, location: record.location }];
  return { participant, record };
}
async function setup(participants, persistence = memoryPersistence()) {
  const store = createStore({ storage: null, persistence });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants }, log: [], diceLines: [], extensions: { v5: {} } });
  return { store, persistence };
}
let counter = 0;
const op = () => `op-${++counter}`;
async function follow(store, participantId, record) {
  const created = await store.registerAftermathIncident({ operationId: op(), participantId, criticalId: record.id, bandaged: true });
  assert.equal(created.receipt.status, 'applied', created.receipt.reason);
  return store.getAftermathState().incidents.find(row => row.source.criticalId === record.id).id;
}
const sequelaeOf = store => store.getAftermathState().sequelae;
const rowsOf = (store, id) => store.listParticipants().find(row => row.id === id).extensions.v5.sequelaEffects?.rows || [];
const advance = (store, days) => store.advanceAftermathCalendar({ operationId: op(), days });
const close = (store, incidentId, extra = {}) => store.closeAftermathIncident({ operationId: op(), incidentId, temporaryEffectsEnded: true, statesConfirmed: true, ...extra });

test('J2 — la proposition de suivi liste les séquelles de la table avec un identifiant stable dérivé de l’occurrence', () => {
  const { record } = wounded('p', 'ARM', 'Clean Break');
  const plan = planSequelae(record);
  assert.deepEqual(plan.map(item => [item.id, item.kind, item.severity, item.part]), [[`${record.id}:j2:injury:0`, 'broken-bone', 'minor', 'arm']]);
  const shin = wounded('q', 'LEG', 'Cracked Shin');
  assert.deepEqual(planSequelae(shin.record).map(item => [item.kind, item.severity, item.part]), [['broken-bone', 'minor', 'leg'], ['torn-muscle', 'major', 'leg']], 'plusieurs lésions d’un même critique restent distinctes');
  const hand = wounded('h', 'ARM', 'Mangled Hand', { amputationShock: { amputationOccurred: true, part: 'hand', difficultyDR: -2 } });
  assert.deepEqual(planSequelae(hand.record).map(item => [item.kind, item.part]), [['loss', 'hand']]);
  const unconfirmed = wounded('u', 'ARM', 'Cleft Hand', { amputationShock: { amputationOccurred: true, part: 'finger', difficultyDR: -1 } });
  assert.deepEqual(planSequelae(unconfirmed.record).map(item => item.part), ['finger'], 'la main conditionnelle n’est suivie qu’une fois confirmée dans le registre F2-I');
  assert.deepEqual(planSequelae(wounded('d', 'BODY', 'Winded').record), [], 'un critique sans séquelle n’ouvre aucun suivi');
});

test('J2 — fracture : faits manquants, immobilisation à temps, fin de guérison dispensée, critique déclaré guéri', async () => {
  const { participant, record } = wounded('patient', 'ARM', 'Clean Break');
  const { store } = await setup([participant, healerSheet()]);
  const incidentId = await follow(store, 'patient', record);
  assert.equal((await close(store, incidentId)).receipt.reason, 'sequelae-follow-up-not-opened');
  const opened = await store.openAftermathSequelae({ operationId: op(), incidentId });
  assert.equal(opened.receipt.status, 'applied');
  const [bone] = sequelaeOf(store);
  assert.deepEqual([bone.status, bone.missing], ['needs-facts', ['side', 'd10']]);
  assert.equal((await store.openAftermathSequelae({ operationId: op(), incidentId })).receipt.reason, 'sequelae-already-open', 'migration répétée : aucun doublon');
  assert.equal((await close(store, incidentId)).receipt.reason, 'sequelae-follow-up-open');
  assert.equal((await store.setAftermathSequelaFacts({ operationId: op(), sequelaId: bone.id, facts: { side: 'left' } })).receipt.reason, 'facts-missing:d10');
  assert.equal((await store.setAftermathSequelaFacts({ operationId: op(), sequelaId: bone.id, facts: { side: 'left', d10: 11 } })).receipt.reason, 'invalid-facts');
  assert.equal((await store.setAftermathSequelaFacts({ operationId: op(), sequelaId: bone.id, facts: { side: 'left', d10: 4 } })).receipt.status, 'applied');
  assert.deepEqual([sequelaeOf(store)[0].durationDays, sequelaeOf(store)[0].endDay], [34, 34], '30 + 1d10 jours');
  assert.deepEqual(rowsOf(store, 'patient').map(row => row.type), ['two-hands', 'shield-arm'], 'bras inutilisable : règles du bras amputé');
  // Test de Guérison (score 60, jet 20 : 4 DR) à +2 DR dans la semaine.
  assert.equal((await store.immobilizeAftermathFracture({ operationId: op(), sequelaId: bone.id, healerId: 'patient', roll: 20 })).receipt.reason, 'skill-missing');
  const bound = await store.immobilizeAftermathFracture({ operationId: op(), sequelaId: bone.id, healerId: 'healer', roll: 20 });
  assert.deepEqual([bound.receipt.reason, bound.receipt.difficultyDR, bound.receipt.success], ['fracture-bound', 2, true]);
  assert.equal((await store.resolveAftermathFracture({ operationId: op(), sequelaId: bone.id })).receipt.reason, 'fracture-still-healing');
  await advance(store, 33);
  assert.equal(rowsOf(store, 'patient').length, 2, 'le jour 33 la fracture bloque encore le bras');
  await advance(store, 1);
  assert.deepEqual(rowsOf(store, 'patient'), [], 'le jour 34 le malus temporaire a disparu');
  assert.equal(store.listAftermathSequelae().pending[0].kind, 'fracture-final-test');
  assert.equal((await close(store, incidentId)).receipt.reason, 'sequelae-follow-up-open');
  const healed = await store.resolveAftermathFracture({ operationId: op(), sequelaId: bone.id });
  assert.deepEqual([healed.receipt.reason, healed.receipt.waived], ['fracture-healed-bound', true], 'attachée tout le long : pas de Test d’Endurance');
  assert.equal((await close(store, incidentId)).receipt.reason, 'critical-healed');
  const kept = sequelaeOf(store)[0];
  assert.deepEqual([kept.status, kept.finalTest.waived, kept.history.length >= 0], ['healed', true, true], 'l’historique reste après la clôture');
  assert.deepEqual(store.getAftermathState().incidents[0].status, 'closed');
});

test('J2 — fracture : hors délai, pas d’immobilisation ; bandage retiré sans nouveau Test, l’Endurance finale s’impose et un échec laisse une séquelle', async () => {
  const { participant, record } = wounded('patient', 'ARM', 'Clean Break');
  const { store } = await setup([participant, healerSheet()]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId, facts: { 'injury:0': { side: 'right', d10: 1 } } });
  const bone = sequelaeOf(store)[0];
  assert.equal(bone.endDay, 31);
  assert.equal((await store.immobilizeAftermathFracture({ operationId: op(), sequelaId: bone.id, healerId: 'healer', roll: 99 })).receipt.reason, 'immobilization-failed' === 'x' ? '' : 'immobilization-failed');
  await advance(store, 9);
  assert.equal((await store.immobilizeAftermathFracture({ operationId: op(), sequelaId: bone.id, healerId: 'healer', roll: 10 })).receipt.reason, 'immobilization-window-passed', 'plus d’une semaine de 8 jours après la fracture');
  await advance(store, 22);
  assert.equal(store.listAftermathSequelae().sequelae[0].phase, 'awaiting-test');
  assert.equal((await store.resolveAftermathFracture({ operationId: op(), sequelaId: bone.id })).receipt.reason, 'invalid-test-facts');
  // Résistance +2 DR, score 30 : jet 90 raté → mal soignée.
  const failed = await store.resolveAftermathFracture({ operationId: op(), sequelaId: bone.id, roll: 90 });
  assert.deepEqual([failed.receipt.reason, failed.receipt.difficultyDR, failed.receipt.success], ['fracture-badly-healed', 2, false]);
  assert.equal(sequelaeOf(store)[0].status, 'permanent');
  assert.deepEqual(rowsOf(store, 'patient').map(row => [row.type, row.amount, row.lifetime]), [['loc-dr', -1, 'permanent']], 'bras mal soigné : −1 DR aux Tests d’Agilité avec ce bras');
  assert.equal((await close(store, incidentId)).receipt.reason, 'critical-healed', 'le critique est guéri, la séquelle permanente reste');
  assert.equal(rowsOf(store, 'patient').length, 1);
});

test('J2 — fracture : le bandage retiré exige un nouveau Test dans la journée, sinon le Test d’Endurance final revient ; majeure : 40 + 1d10 jours, Tests à +0', async () => {
  const { participant, record } = wounded('patient', 'LEG', 'Broken Knee');
  const { store } = await setup([participant, healerSheet()]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId, facts: { 'injury:0': { side: 'left', d10: 5 } } });
  const bone = sequelaeOf(store)[0];
  assert.deepEqual([bone.severity, bone.durationDays, bone.endDay], ['major', 45, 45]);
  assert.equal((await store.unbindAftermathFracture({ operationId: op(), sequelaId: bone.id })).receipt.reason, 'not-bound');
  const bound = await store.immobilizeAftermathFracture({ operationId: op(), sequelaId: bone.id, healerId: 'healer', roll: 30 });
  assert.equal(bound.receipt.difficultyDR, 0, 'fracture majeure : Test Intermédiaire +0');
  assert.equal(bound.receipt.reason, 'fracture-bound');
  assert.equal((await store.unbindAftermathFracture({ operationId: op(), sequelaId: bone.id })).receipt.status, 'applied');
  await advance(store, 2);
  assert.equal((await store.immobilizeAftermathFracture({ operationId: op(), sequelaId: bone.id, healerId: 'healer', roll: 30 })).receipt.reason, 'rebind-window-passed');
  await advance(store, 43);
  const final = await store.resolveAftermathFracture({ operationId: op(), sequelaId: bone.id, roll: 20 });
  assert.deepEqual([final.receipt.reason, final.receipt.difficultyDR, final.receipt.success], ['fracture-healed', 0, true]);
});

test('J2 — déchirure musculaire mineure : 30 − BE jours, un Test de Guérison réussi raccourcit une fois, effets pendant la durée', async () => {
  const { participant, record } = wounded('patient', 'ARM', 'Torn Muscles');
  const { store } = await setup([participant, healerSheet()]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId, facts: { 'injury:0': { side: 'left' } } });
  const tear = sequelaeOf(store)[0];
  assert.deepEqual([tear.severity, tear.toughnessBonus, tear.endDay], ['minor', 3, 27], '30 − BE 3');
  assert.deepEqual(rowsOf(store, 'patient').map(row => [row.type, row.amount, row.loc]), [['loc-dr', -1, 'arm:left']]);
  // Score 60, jet 20 → 4 DR : 1 jour + 3 jours après le premier = 4.
  const healed = await store.treatAftermathTornMuscle({ operationId: op(), sequelaId: tear.id, healerId: 'healer', roll: 20 });
  assert.deepEqual([healed.receipt.reason, healed.receipt.reduction, healed.receipt.endDay], ['tear-shortened', 4, 23]);
  assert.equal((await store.treatAftermathTornMuscle({ operationId: op(), sequelaId: tear.id, healerId: 'healer', roll: 20 })).receipt.reason, 'muscle-heal-already-used', 'le bénéfice ne se gagne qu’une fois');
  await advance(store, 22);
  assert.equal(rowsOf(store, 'patient').length, 1);
  await advance(store, 1);
  assert.deepEqual(rowsOf(store, 'patient'), []);
  assert.equal((await close(store, incidentId)).receipt.reason, 'critical-healed');
});

test('J2 — déchirure musculaire majeure : −2 DR puis −1 DR, guérie après un second délai ; le soin n’y change rien', async () => {
  const { participant, record } = wounded('patient', 'LEG', 'Badly Twisted Knee');
  const { store } = await setup([participant, healerSheet()]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId, facts: { 'injury:0': { side: 'right' } } });
  const tear = sequelaeOf(store)[0];
  assert.deepEqual([tear.severity, tear.partialDay, tear.endDay], ['major', 27, 54]);
  assert.equal((await store.treatAftermathTornMuscle({ operationId: op(), sequelaId: tear.id, healerId: 'healer', roll: 20 })).receipt.reason, 'heal-does-not-shorten-major-tear');
  assert.deepEqual(rowsOf(store, 'patient').map(row => [row.type, row.amount]), [['loc-dr', -2], ['movement', undefined]]);
  await advance(store, 27);
  assert.deepEqual(rowsOf(store, 'patient').map(row => [row.type, row.amount]), [['loc-dr', -1], ['movement', undefined]]);
  await advance(store, 27);
  assert.deepEqual(rowsOf(store, 'patient'), []);
});

test('J2 — main perdue confirmée : côté et main directrice saisis, effets permanents, même membre refusé deux fois, critique guéri après Chirurgie', async () => {
  const { participant, record } = wounded('patient', 'ARM', 'Mangled Hand', { amputationShock: { amputationOccurred: true, part: 'hand', difficultyDR: -2 } });
  const surgeon = healerSheet({ id: 'surgeon', talents: [{ id: 'talent-surgery', status: 'resolved', rank: 1 }] });
  const { store } = await setup([participant, surgeon]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId });
  const hand = sequelaeOf(store)[0];
  assert.deepEqual([hand.status, hand.missing], ['needs-facts', ['side']]);
  assert.deepEqual(rowsOf(store, 'patient'), [], 'aucun effet tant que le côté manque');
  assert.equal((await store.setAftermathSequelaFacts({ operationId: op(), sequelaId: hand.id, facts: { side: 'left', primary: true } })).receipt.status, 'applied');
  assert.equal(sequelaeOf(store)[0].status, 'permanent');
  assert.deepEqual(rowsOf(store, 'patient').map(row => row.type), ['two-hands', 'offhand-dr']);
  assert.equal((await close(store, incidentId)).receipt.reason, 'surgery-not-completed');
  assert.equal((await store.treatAftermathSurgicalIncident({ operationId: op(), incidentId, healerId: 'surgeon', roll: 10 })).receipt.reason, 'surgery-success');
  assert.equal((await close(store, incidentId)).receipt.reason, 'critical-healed');
  assert.equal(rowsOf(store, 'patient').length, 2, 'la perte reste après la clôture');
  assert.equal((await store.recordAftermathRelearning({ operationId: op(), sequelaId: hand.id, hundredsOfXp: 1 })).receipt.reason, 'hand-relearned');
  assert.deepEqual(rowsOf(store, 'patient').map(row => row.amount).filter(Boolean), [-1]);
  assert.equal((await store.recordAftermathRelearning({ operationId: op(), sequelaId: hand.id, hundredsOfXp: 2 })).receipt.reason, 'invalid-test-facts');
});

test('J2 — pertes composées : œil et nez, dents (nombre saisi), jambes (Moelle épinière), même partie jamais perdue deux fois', async () => {
  const eyeNose = wounded('face', 'HEAD', 'Disfiguring Blow', { amputationShock: { amputationOccurred: true, part: 'eye-and-nose', difficultyDR: -2 } });
  const teeth = wounded('mouth', 'HEAD', 'Smashed Teeth', { amputationShock: { amputationOccurred: true, part: 'teeth', difficultyDR: 4 } });
  const spine = wounded('spine', 'BODY', 'Spinal Cord Damage', { amputationShock: { amputationOccurred: true, part: 'legs', difficultyDR: -3 } });
  const { store } = await setup([eyeNose.participant, teeth.participant, spine.participant]);
  assert.deepEqual(planSequelae(eyeNose.record).map(item => item.part), ['eye', 'nose']);
  assert.deepEqual(planSequelae(spine.record).map(item => [item.kind, item.part, item.side]), [['broken-bone', 'body', undefined], ['loss', 'leg', 'left'], ['loss', 'leg', 'right']], 'jambes inutilisables : une jambe par côté, pas de doublon avec le choc');
  const faceIncident = await follow(store, 'face', eyeNose.record);
  await store.openAftermathSequelae({ operationId: op(), incidentId: faceIncident, facts: { 'shock:0:eye': { side: 'left' } } });
  assert.deepEqual(sequelaeOf(store).map(row => [row.part, row.status]), [['eye', 'permanent'], ['nose', 'permanent']]);
  assert.deepEqual(rowsOf(store, 'face').map(row => row.type), ['smell', 'social'], 'nez perdu : cicatrice +2/−2 et odorat ; un œil : aucun malus chiffré');
  const mouthIncident = await follow(store, 'mouth', teeth.record);
  await store.openAftermathSequelae({ operationId: op(), incidentId: mouthIncident });
  const tooth = sequelaeOf(store).find(row => row.part === 'teeth');
  assert.equal(tooth.status, 'needs-facts');
  assert.equal((await store.setAftermathSequelaFacts({ operationId: op(), sequelaId: tooth.id, facts: { count: 0 } })).receipt.reason, 'invalid-facts');
  assert.equal((await store.setAftermathSequelaFacts({ operationId: op(), sequelaId: tooth.id, facts: { count: 6 } })).receipt.status, 'applied');
  assert.deepEqual(rowsOf(store, 'mouth').map(row => [row.type, row.carac, row.amount]), [['char', 'Soc', -3]], 'une paire de dents = 1 point de Sociabilité');
  const spineIncident = await follow(store, 'spine', spine.record);
  await store.openAftermathSequelae({ operationId: op(), incidentId: spineIncident, facts: { 'injury:0': { d10: 3 } } });
  assert.equal(sequelaeOf(store).filter(row => row.participantId === 'spine' && row.kind === 'loss').length, 2);
  assert.deepEqual(rowsOf(store, 'spine').map(row => row.type).sort(), ['char', 'char', 'disadvantage-carac', 'dodge-athletics-disadvantage', 'movement', 'movement', 'no-dodge'].sort(), 'jambes perdues et fracture du corps majeure, sans doublon');
  assert.equal(store.listParticipants().find(row => row.id === 'spine').extensions.v5.sequelaEffects.movement.effective, 1, 'deux jambes perdues : Mouvement 1');
});

test('J2 — Pied écrasé : chirurgie dans les BE jours, sinon décision du MJ sur la perte du pied', async () => {
  const { participant, record } = wounded('patient', 'LEG', 'Crushed Foot');
  const surgeon = healerSheet({ id: 'surgeon', talents: [{ id: 'talent-surgery', status: 'resolved', rank: 1 }] });
  const { store } = await setup([participant, surgeon]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId });
  const deadline = sequelaeOf(store).find(row => row.kind === 'surgery-deadline');
  assert.equal(deadline.deadlineDay, 3, 'BE 3 jours');
  assert.equal((await store.decideAftermathSurgeryDeadline({ operationId: op(), sequelaId: deadline.id, footLost: false })).receipt.reason, 'deadline-not-reached');
  await advance(store, 4);
  assert.equal(store.listAftermathSequelae().pending.some(row => row.kind === 'surgery-deadline-missed'), true);
  assert.equal((await close(store, incidentId)).receipt.reason, 'sequelae-follow-up-open');
  assert.equal((await store.decideAftermathSurgeryDeadline({ operationId: op(), sequelaId: deadline.id, footLost: true })).receipt.reason, 'facts-missing:side');
  const lost = await store.decideAftermathSurgeryDeadline({ operationId: op(), sequelaId: deadline.id, footLost: true, side: 'left' });
  assert.equal(lost.receipt.reason, 'foot-lost-confirmed');
  assert.deepEqual(sequelaeOf(store).filter(row => row.kind === 'loss').map(row => [row.part, row.side]), [['foot', 'left']]);
  assert.deepEqual(store.listParticipants().find(row => row.id === 'patient').extensions.v5.sequelaEffects.movement, { base: 4, effective: 2 });
});

test('J2 — épaule disloquée : remise en place confirmée, puis critique guéri ; cicatrices : décision explicite du MJ', async () => {
  const { participant, record } = wounded('patient', 'ARM', 'Dislocated Shoulder');
  const { store } = await setup([participant]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId });
  const reset = sequelaeOf(store).find(row => row.kind === 'reset-limb');
  assert.equal((await close(store, incidentId)).receipt.reason, 'sequelae-follow-up-open');
  assert.equal((await store.confirmAftermathResetLimb({ operationId: op(), sequelaId: reset.id })).receipt.reason, 'limb-reset-confirmed');
  assert.equal((await close(store, incidentId)).receipt.reason, 'critical-healed');
  assert.equal((await store.decideAftermathImpressiveScars({ operationId: op(), participantId: 'patient', agreed: true })).receipt.reason, 'scars-agreed');
  assert.equal((await store.decideAftermathImpressiveScars({ operationId: op(), participantId: 'patient', agreed: false })).receipt.reason, 'scars-declined');
  assert.equal(sequelaeOf(store).filter(row => row.kind === 'scar-decision').length, 1, 'une seule décision par personnage');
});

test('J2 — Orteil entaillé : Test de Résistance après la rencontre, la perte éventuelle suit le choc F2-I', async () => {
  const { participant, record } = wounded('patient', 'LEG', 'Badly Cut Toe');
  const { store } = await setup([participant]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId });
  const test = sequelaeOf(store).find(row => row.kind === 'post-encounter-test');
  assert.equal(test.difficultyDR, 0);
  assert.equal((await store.recordAftermathPostEncounterTest({ operationId: op(), sequelaId: test.id })).receipt.reason, 'invalid-test-facts');
  const failed = await store.recordAftermathPostEncounterTest({ operationId: op(), sequelaId: test.id, roll: 90 });
  assert.deepEqual([failed.receipt.reason, failed.receipt.score, failed.receipt.success], ['post-encounter-failed', 30, false]);
  const refused = await close(store, incidentId);
  assert.deepEqual([refused.receipt.reason, refused.receipt.outstanding.map(row => row.reason)], ['sequelae-follow-up-open', ['amputation-decision-pending']], 'l’échec attend la décision du choc d’amputation du registre F2-I');
  // Choc confirmé : la perte de l’orteil devient une séquelle à suivre, avec son côté et son nombre.
  const confirmed = { ...record, amputationShock: { amputationOccurred: true, part: 'toe', difficultyDR: 2 } };
  await store.updateParticipant('patient', { extensions: { v5: { ...store.listParticipants().find(row => row.id === 'patient').extensions.v5, criticalAftermath: [confirmed] } } });
  assert.equal((await close(store, incidentId)).receipt.reason, 'sequelae-follow-up-not-opened');
});

test('J2 — perte de caractéristique : base d’abord, puis Avancements ; rien n’est écrit sur la fiche, provenance conservée', async () => {
  assert.deepEqual(splitCharacteristicLoss({ base: 30, advances: 5, amount: 10 }), { appliedToBase: 10, appliedToAdvances: 0, base: 20, advances: 5 });
  assert.deepEqual(splitCharacteristicLoss({ base: 4, advances: 5, amount: 10 }), { appliedToBase: 4, appliedToAdvances: 5, base: 0, advances: 0 }, 'à 0 de base, les Avancements achetés sont retirés');
  assert.deepEqual(splitCharacteristicLoss({ base: 4, advances: 9, amount: 10 }), { appliedToBase: 4, appliedToAdvances: 6, base: 0, advances: 3 });
  const { store } = await setup([base('patient')]);
  const sheetBefore = clone(store.listParticipants().find(row => row.id === 'patient').caracs);
  const lost = await store.recordAftermathCharacteristicLoss({ operationId: op(), participantId: 'patient', carac: 'Ag', amount: 10, base: 4, advances: 9, reason: 'Poison de la Lance du Néant' });
  assert.deepEqual([lost.receipt.reason, lost.receipt.applied], ['characteristic-loss-recorded', 10]);
  assert.deepEqual(store.listParticipants().find(row => row.id === 'patient').caracs, sheetBefore, 'la fiche du participant n’est pas modifiée');
  assert.deepEqual(store.listAftermathSequelae().characteristics.patient.Ag.sources.map(row => [row.amount, row.lifetime]), [[-10, 'permanent']]);
  assert.equal((await store.recordAftermathCharacteristicLoss({ operationId: op(), participantId: 'patient', carac: 'Ag', amount: 0, reason: 'x' })).receipt.reason, 'invalid-facts');
  assert.equal((await store.recordAftermathCharacteristicLoss({ operationId: op(), participantId: 'ghost', carac: 'Ag', amount: 1, reason: 'x' })).receipt.reason, 'unknown-subject');
});

test('J2 — Undo/Redo, sauvegarde, rechargement, ancienne sauvegarde sans séquelles, opération rejouée', async () => {
  const { participant, record } = wounded('patient', 'ARM', 'Clean Break');
  const persistence = memoryPersistence();
  const { store } = await setup([participant, healerSheet()], persistence);
  const incidentId = await follow(store, 'patient', record);
  const operationId = op();
  const first = await store.openAftermathSequelae({ operationId, incidentId, facts: { 'injury:0': { side: 'left', d10: 2 } } });
  const replay = await store.openAftermathSequelae({ operationId, incidentId, facts: { 'injury:0': { side: 'left', d10: 2 } } });
  assert.deepEqual(replay.receipt, first.receipt, 'même opération rejouée : même reçu, aucune seconde création');
  assert.equal(sequelaeOf(store).length, 1);
  assert.equal(rowsOf(store, 'patient').length, 2);
  assert.equal(await store.undo(), true);
  assert.deepEqual(sequelaeOf(store) || [], [], 'Undo retire le suivi');
  assert.deepEqual(rowsOf(store, 'patient'), [], 'et sa projection sur le participant');
  assert.equal(await store.redo(), true);
  assert.equal(rowsOf(store, 'patient').length, 2);
  const saved = JSON.parse(store.getFullJSON());
  const reloaded = createStore({ storage: null, persistence: memoryPersistence() });
  await reloaded.ready;
  await reloaded.loadFromJSON(saved);
  assert.equal(reloaded.getAftermathState().sequelae[0].endDay, 32);
  assert.equal(rowsOf(reloaded, 'patient').length, 2);
  // Ancienne sauvegarde : registre J1 sans séquelles, lisible, aucune projection.
  const old = clone(saved);
  delete old.extensions.v5.aftermathRegister.sequelae;
  for (const row of old.combat.participants) delete row.extensions.v5.sequelaEffects;
  const legacy = createStore({ storage: null, persistence: memoryPersistence() });
  await legacy.ready;
  await legacy.loadFromJSON(old);
  assert.deepEqual(legacy.listAftermathSequelae().sequelae, []);
  assert.equal(legacy.listAftermathSequelae().incidents[0].needsOpening, true, 'proposition explicite de reprise, rien d’appliqué en silence');
  assert.deepEqual(rowsOf(legacy, 'patient'), []);
});

test('J2 — l’aperçu d’avancement annonce les fins de guérison et les échéances sans rien inventer', async () => {
  const { participant, record } = wounded('patient', 'ARM', 'Clean Break');
  const { store } = await setup([participant, healerSheet()]);
  const incidentId = await follow(store, 'patient', record);
  await store.openAftermathSequelae({ operationId: op(), incidentId, facts: { 'injury:0': { side: 'left', d10: 1 } } });
  const preview = store.previewAftermathAdvance({ days: 40, expectedRevision: store.getAftermathState().revision });
  assert.deepEqual(preview.sequelaEvents.map(row => [row.kind, row.day, row.testNeeded, row.participantName]), [['fracture-heals', 31, true, 'patient']]);
  const stateBefore = clone(store.getAftermathState());
  assert.deepEqual(store.getAftermathState(), stateBefore, 'l’aperçu ne change pas le registre');
  assert.deepEqual(store.previewAftermathAdvance({ days: 5, expectedRevision: stateBefore.revision }).sequelaEvents, []);
});
