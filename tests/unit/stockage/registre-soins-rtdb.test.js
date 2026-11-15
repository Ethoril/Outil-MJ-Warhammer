// Registre de soins et de convalescence relu depuis la base temps réel (RTDB) : RTDB retire à l'écriture les tableaux vides,
// les objets vides et les propriétés nulles. Le registre relu (second appareil, stockage local vidé, compte migré 3 → 4,
// ou état local qui a déjà adopté un registre dépouillé) doit rester lisible et utilisable, sans rien inventer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAftermathState, validateAftermathState, registerWoundIncident, advanceAftermathCalendar, treatWoundIncident, treatInfection,
  treatSurgicalIncident, closeAftermathIncident, archiveAftermathIncident, registerDisease, careForDisease, aftermathDate } from '../../../js/core/v5-aftermath.js';
import { openSequelae, immobilizeFracture, treatTornMuscle, decideImpressiveScars, recordCharacteristicLoss, pendingSequelaDecisions } from '../../../js/core/v5-sequelae.js';
import { playCare, storeWith, woundedPatient, healerSheet, asFollowed } from '../sequelles/soins-scenario.helper.js';
import { rtdb } from './rtdb.helper.js';
/** Même valeur sans ses propriétés nulles : tableaux et objets vides gardés. */
const withoutNulls = value => (Array.isArray(value) ? value.map(withoutNulls)
  : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null).map(([key, item]) => [key, withoutNulls(item)])) : value);

const healer = { participantId: 'h', skill: 'heal', skillId: 'heal', skillName: 'Guérison', score: 60, advances: 10, intelligenceBonus: 5, hasSurgeryTalent: true };
const applied = outcome => { assert.equal(outcome.receipt.status, 'applied', JSON.stringify(outcome.receipt)); return outcome.state; };

/** Registre bâti par les vraies commandes du moteur : toutes les formes d'incident, de maladie, de séquelle et de reçu. */
function engineRegister() {
  let s = createAftermathState();
  const step = (fn, input) => { s = applied(fn(s, { expectedRevision: s.revision, ...input })); };
  step(registerWoundIncident, { id: 'i-ouvert', participantId: 'p1', source: { kind: 'wounds-lost', cause: 'chute' } });
  step(registerWoundIncident, { id: 'i-bande', participantId: 'p1', source: { kind: 'wounds-lost', cause: 'coupure' }, bandaged: true });
  step(registerWoundIncident, { id: 'i-chir', participantId: 'p2', source: { kind: 'critical', criticalId: 'crit-1', criticalWoundId: null }, requiresSurgery: true });
  step(registerWoundIncident, { id: 'i-archive', participantId: 'p3', source: { kind: 'wounds-lost', cause: 'flèche' } });
  step(registerWoundIncident, { id: 'i-infecte', participantId: 'p3', source: { kind: 'wounds-lost', cause: 'morsure' } });
  step(archiveAftermathIncident, { operationId: 'o-archive', incidentId: 'i-archive' });
  // Un jour : i-ouvert réussit sa Résistance, i-infecte l'échoue ; i-chir n'est pas bandé non plus.
  step(advanceAftermathCalendar, { operationId: 'o-jour', days: 1, enduranceScores: { p1: 40, p2: 40, p3: 40 },
    dailyTests: [{ incidentId: 'i-ouvert', day: 0, roll: 10 }, { incidentId: 'i-chir', day: 0, roll: 10 }, { incidentId: 'i-infecte', day: 0, roll: 99 }] });
  step(treatInfection, { operationId: 'o-remede', incidentId: 'i-infecte', remedy: true });
  step(treatSurgicalIncident, { operationId: 'o-chir', incidentId: 'i-chir', healer, roll: 10 });
  step(treatWoundIncident, { operationId: 'o-soin', incidentId: 'i-chir', healer, roll: 20, supplies: true, surgeryChoice: 'sl' });
  step(closeAftermathIncident, { operationId: 'o-clos', incidentId: 'i-bande' });
  step(registerDisease, { id: 'm-soignee', operationId: 'o-m1', participantId: 'p1', label: 'Fièvre', durationDays: 5 });
  step(registerDisease, { id: 'm-seule', operationId: 'o-m2', participantId: 'p2', label: 'Toux', durationDays: 3 });
  step(careForDisease, { operationId: 'o-m1-soin', diseaseId: 'm-soignee', healer, roll: 20, rested: true });
  const record = { id: 'crit-1', sequela: { injuries: [{ name: 'Broken Bone', severity: 'minor', part: 'head' }, { name: 'Torn Muscle', severity: 'minor', part: 'body' }, { name: 'Broken Bone', severity: 'major', part: 'arm' }], durableEffects: [{ kind: 'scar' }, { kind: 'reset-limb', part: 'knee' }] } };
  step(openSequelae, { operationId: 'o-seq', incidentId: 'i-chir', record, toughnessBonus: 3, facts: { 'injury:0': { d10: 4 } } });
  step(decideImpressiveScars, { operationId: 'o-cic', participantId: 'p2', agreed: false });
  step(recordCharacteristicLoss, { operationId: 'o-perte', participantId: 'p2', carac: 'F', amount: 3, reason: 'Fièvre' });
  // Reçus refusés (conflit de révision) : eux aussi passent par RTDB.
  s = registerDisease(s, { id: 'm-x', operationId: 'o-refus', expectedRevision: 0, participantId: 'p1', label: 'X', durationDays: 1 }).state;
  return s;
}

const frozen = () => JSON.parse(readFileSync(new URL('../../fixtures/suivis-orphelins-v3.json', import.meta.url), 'utf8')).extensions.v5.aftermathRegister;
async function registers() {
  const { store } = await playCare('suivi');
  return { vide: createAftermathState(), 'fixture suivis-orphelins-v3': frozen(), 'scénario de soins du Store': store.getAftermathState(), 'moteur, toutes formes': engineRegister() };
}

test('le moteur produit bien des registres que RTDB dépouille (sinon le test ne prouverait rien)', async () => {
  for (const [name, register] of Object.entries(await registers())) assert.notDeepEqual(rtdb(register), register, name);
  const engine = engineRegister();
  assert.ok(engine.sequelae.some(row => row.kind === 'broken-bone' && row.immobilization.attempts.length === 0));
  assert.ok(engine.incidents.some(row => row.treatments.some(item => item.healerId === null)), 'remède : soigneur nul');
});

test('un registre relu de RTDB est accepté et équivalent à l’original', async () => {
  for (const [name, register] of Object.entries(await registers())) {
    const read = validateAftermathState(rtdb(register));
    // Équivalence : aucune donnée perdue ni changée, et la même forme que la lecture de l'original.
    assert.deepEqual(rtdb(read), rtdb(register), `${name} : données conservées`);
    // Toutes les listes vides lues par le moteur sont revenues ; restent absentes les propriétés nulles (historique, jamais
    // comparées) et `missing` vide d'une séquelle (lue seulement en « needs-facts », où elle n'est jamais vide).
    const expected = withoutNulls(validateAftermathState(register));
    for (const row of expected.sequelae) if (Array.isArray(row.missing) && !row.missing.length) delete row.missing;
    assert.deepEqual(withoutNulls(read), expected, `${name} : forme canonique restaurée`);
    assert.deepEqual(validateAftermathState(read), read, `${name} : relecture stable`);
    assert.equal(aftermathDate(rtdb(register)).day, register.calendar.currentDay, name);
  }
});

test('la lecture ne réécrit pas le registre relu', () => {
  const stripped = rtdb(engineRegister());
  const before = structuredClone(stripped);
  validateAftermathState(stripped);
  registerDisease(stripped, { id: 'm-y', operationId: 'o-y', expectedRevision: stripped.revision, participantId: 'p1', label: 'Y', durationDays: 1 });
  assert.deepEqual(stripped, before);
});

test('les commandes de soins fonctionnent sur un registre relu de RTDB', () => {
  const source = engineRegister();
  let s = rtdb(source);
  const step = (fn, input) => { s = applied(fn(s, { expectedRevision: s.revision, ...input })); return s; };
  step(registerWoundIncident, { id: 'i-neuf', participantId: 'p4', source: { kind: 'wounds-lost', cause: 'chute' } });
  s = rtdb(s);
  step(treatWoundIncident, { operationId: 'n-soin', incidentId: 'i-ouvert', healer, roll: 20, supplies: true, surgeryChoice: 'sl' });
  step(careForDisease, { operationId: 'n-m2', diseaseId: 'm-seule', healer, roll: 20 });
  const bone = source.sequelae.find(row => row.kind === 'broken-bone' && row.severity === 'minor');
  const tear = source.sequelae.find(row => row.kind === 'torn-muscle');
  step(immobilizeFracture, { operationId: 'n-imm', sequelaId: bone.id, healer, roll: 20 });
  step(treatTornMuscle, { operationId: 'n-dech', sequelaId: tear.id, healer, roll: 20 });
  s = rtdb(s);
  step(advanceAftermathCalendar, { operationId: 'n-jour', days: 1, enduranceScores: { p3: 40, p4: 40 }, dailyTests: [{ incidentId: 'i-neuf', day: 1, roll: 10 }, { incidentId: 'i-infecte', day: 1, roll: 10 }] });
  step(registerDisease, { id: 'm-neuve', operationId: 'n-m3', participantId: 'p1', label: 'Peste', durationDays: 2 });
  assert.equal(s.sequelae.find(row => row.id === bone.id).immobilization.attempts.length, 1);
  assert.equal(s.sequelae.find(row => row.id === tear.id).history.length, 1);
  assert.equal(s.incidents.find(row => row.id === 'i-neuf').dailyChecks.length, 1);
  assert.ok(Array.isArray(pendingSequelaDecisions(validateAftermathState(rtdb(s)))));
  // Rejouer une opération déjà faite rend le même reçu, même relu de RTDB.
  assert.equal(registerDisease(rtdb(s), { id: 'm-neuve', operationId: 'n-m3', expectedRevision: 0, participantId: 'p1', label: 'Peste', durationDays: 2 }).receipt.status, 'applied');
});

test('un état local qui a déjà adopté un registre dépouillé reçoit encore des commandes de soins', async () => {
  const { patient } = woundedPatient();
  const a = asFollowed(patient), b = asFollowed(healerSheet());
  const register = rtdb(createAftermathState());
  const store = await storeWith({ reserve: [a.profile, b.profile], persistentCharacters: [a.character, b.character], extensions: { v5: { aftermathRegister: register } } });
  const outcome = await store.registerAftermathDisease({ operationId: 'local-1', participantId: 'suivi:pc-patient', label: 'Fièvre', durationDays: 2 });
  assert.notEqual(outcome?.ok, false, JSON.stringify(outcome));
  assert.equal(store.getAftermathState().diseases.length, 1);
  assert.deepEqual(store.getAftermathState().incidents, []);
});

test('les vraies erreurs restent refusées', () => {
  const base = engineRegister();
  const broken = [
    ['incidents en chaîne', s => { s.incidents = 'rien'; }, /registre de convalescence invalide/],
    // Un `null` local n'est pas une absence ; relu de RTDB, il le devient (vérifié plus bas sans la variante RTDB).
    ['reçus nuls', s => { s.receipts = null; }, /registre de convalescence invalide/, { local: true }],
    ['maladies en objet', s => { s.diseases = { a: 1 }; }, /registre de convalescence invalide/],
    ['soins en chaîne', s => { s.incidents[0].treatments = 'aucun'; }, /incident de blessure invalide/],
    ['tests quotidiens en nombre', s => { s.incidents[0].dailyChecks = 0; }, /incident de blessure invalide/],
    ['identifiant d’incident vide', s => { s.incidents[0].id = ' '; }, /incident de blessure invalide/],
    ['identifiant d’incident absent', s => { delete s.incidents[0].id; }, /incident de blessure invalide/],
    ['statut d’incident absent', s => { delete s.incidents[0].status; }, /incident de blessure invalide/],
    ['provenance absente', s => { delete s.incidents[0].source; }, /incident de blessure invalide/],
    ['identifiant en double', s => { s.incidents[1].id = s.incidents[0].id; }, /incident de blessure invalide/],
    ['journal de soins en chaîne', s => { s.diseases[0].careLog = 'x'; }, /maladie invalide/],
    ['maladie sans participant', s => { delete s.diseases[0].participantId; }, /maladie invalide/],
    ['séquelle sans statut', s => { delete s.sequelae[0].status; }, /séquelle invalide/],
    ['calendrier absent', s => { delete s.calendar; }, /registre de convalescence invalide/],
    ['révision absente', s => { delete s.revision; }, /registre de convalescence invalide/],
    ['registre en tableau', () => [], /registre de convalescence invalide/]
  ];
  for (const [name, change, message, { local = false } = {}] of broken) {
    const register = structuredClone(base);
    const value = change(register) ?? register;
    assert.throws(() => validateAftermathState(value), message, name);
    if (!local) assert.throws(() => validateAftermathState(rtdb(value) ?? value), message, `${name} (relu de RTDB)`);
  }
  // Un historique de séquelle remplacé par une chaîne n'est pas restauré : la commande qui l'utilise échoue toujours.
  const tear = base.sequelae.find(row => row.kind === 'torn-muscle');
  const wrong = structuredClone(base); wrong.sequelae.find(row => row.id === tear.id).history = 'x';
  assert.throws(() => treatTornMuscle(wrong, { operationId: 'w', expectedRevision: wrong.revision, sequelaId: tear.id, healer, roll: 20 }));
});
