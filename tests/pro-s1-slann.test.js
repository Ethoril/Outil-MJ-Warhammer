import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import {
  SLANN_ABILITIES, isSlann, slannAbilities, palanquinTraits, groundCastModifier, mishapSeverity,
  totalPowerCritical, planEmergencyTeleportation, contemplationOutcome, slannReminders
} from '../js/core/slann.js';

const library = JSON.parse(readFileSync(new URL('../js/data/bestiary/L07.json', import.meta.url), 'utf8')).profiles;
const slann = (id, hp) => ({ ...buildParticipantFromBestiary(id, { library }), ...(hp === undefined ? {} : { hp }) });
const second = () => slann('E0-P-258');
const fifth = () => slann('E0-P-256');
const inventory = JSON.parse(readFileSync(new URL('../docs/BESTIAIRE_INVENTAIRE.json', import.meta.url), 'utf8')).traits;

test('S1 les neuf capacités 211 à 219 ont une disposition, assistée ou rappel motivé', () => {
  assert.deepEqual(SLANN_ABILITIES.map(entry => entry.id), inventory.filter(trait => { const n = Number(trait.id.slice(5)); return n >= 211 && n <= 219; }).map(trait => trait.id));
  for (const entry of SLANN_ABILITIES) {
    if (entry.status === 'reminder') assert.ok(entry.motive.length > 20, entry.id);
    else assert.ok(entry.by, entry.id);
  }
});

test('S1 réservé aux Slann : un autre mage et un participant sans capacité sont refusés', () => {
  const other = { extensions: { v5: { bestiary: { abilityRefs: ['E0-T-001'] } } } };
  assert.equal(isSlann(second()), true);
  assert.equal(isSlann(other), false);
  assert.deepEqual(slannAbilities(other), []);
  for (const result of [palanquinTraits(other), groundCastModifier(other), planEmergencyTeleportation(other, { wounds: 3 }), contemplationOutcome(other, 3), totalPowerCritical(other, 11)]) {
    assert.equal(result.available, false);
    assert.match(result.receipt.blocked[0], /réservé aux profils de Slann/);
  }
});

test('S1 Palanquin : Vol 16, Protection 8+, couvert dur par derrière et sur les côtés, souple de face', () => {
  const on = palanquinTraits(second(), { shotFrom: 'front' });
  assert.deepEqual(on.traits, [{ name: 'Fly', value: 16 }, { name: 'Ward', value: 8 }]);
  assert.equal(on.cover, 'soft');
  assert.equal(palanquinTraits(second(), { shotFrom: 'back' }).cover, 'hard');
  assert.equal(palanquinTraits(second(), { shotFrom: 'side' }).cover, 'hard');
  assert.equal(palanquinTraits(second(), { shotFrom: 'dessus' }).unresolved.length, 1);
  assert.equal(palanquinTraits(second(), { aboard: false }).available, false);
});

test('S1 Slann au sol : −3 hors palanquin, rien à bord', () => {
  assert.equal(groundCastModifier(second(), { aboard: false }).modifier, -3);
  assert.equal(groundCastModifier(second()).modifier, 0);
  assert.deepEqual(groundCastModifier(second(), { aboard: false }).applies, ['Casting', 'Channelling']);
});

test('S1 Maître des incidents : majeur devient mineur, sauf à travers un autre mage ; absent chez la 5e génération', () => {
  assert.equal(mishapSeverity(second(), 'major').severity, 'minor');
  assert.equal(mishapSeverity(second(), 'major', { viaTelepathy: true }).severity, 'major');
  assert.equal(mishapSeverity(second(), 'minor').severity, 'minor');
  const none = mishapSeverity(fifth(), 'major');
  assert.equal(none.available, false);
  assert.equal(none.severity, 'major');
});

test('S1 Puissance totale : critique sur un double ou une unité 0 si le lancement réussit', () => {
  assert.equal(totalPowerCritical(second(), 44).critical, true);
  assert.equal(totalPowerCritical(second(), 30).critical, true);
  assert.equal(totalPowerCritical(second(), 100).critical, true);
  assert.equal(totalPowerCritical(second(), 37).critical, false);
  assert.equal(totalPowerCritical(second(), 44, { succeeded: false }).critical, false);
  assert.equal(totalPowerCritical(second(), 'x').available, false);
  assert.equal(totalPowerCritical(fifth(), 44).available, false);
});

test('S1 Téléportation de secours : 10 Blessures ou moins, ou Critique grave', () => {
  assert.equal(planEmergencyTeleportation(second(), { wounds: 10 }).triggered, true);
  assert.equal(planEmergencyTeleportation(second(), { wounds: 11 }).triggered, false);
  assert.equal(planEmergencyTeleportation(second(), { wounds: 25, graveCritical: true }).triggered, true);
  assert.equal(planEmergencyTeleportation(slann('E0-P-258', 8)).triggered, true);
  assert.equal(planEmergencyTeleportation(second()).unresolved.length, 0);
  assert.equal(planEmergencyTeleportation({ ...second(), hp: null }).unresolved.length, 1);
});

test('S1 Contemplation : table de DR, états posés en reçu seulement', () => {
  const at = sl => contemplationOutcome(second(), sl);
  assert.equal(at(2).outcome, 'alive');
  assert.equal(at(1).outcome, 'detached');
  assert.equal(at(0).outcome, 'detached');
  assert.deepEqual(at(0).conditions, [{ name: 'Stupid', scope: 'rencontre' }]);
  assert.equal(at(-1).outcome, 'fog');
  assert.deepEqual(at(-3).conditions, [{ name: 'Fatigued', count: 2 }]);
  assert.equal(at(-4).outcome, 'lost');
  assert.equal(at(-4).effects.length, 0);
  assert.equal(at(null).available, false);
  assert.equal(at(1.5).available, false);
});

test('S1 rappels de fiche : 8e profil complet, Prêtre relique et Télépathie en rappel', () => {
  const first = slannReminders(slann('E0-P-259'));
  assert.equal(first.length, 8);
  assert.ok(first.some(line => /^Rappel — Prêtre relique/.test(line)));
  assert.ok(first.some(line => /^Palanquin \(palanquinTraits\)/.test(line)));
  assert.equal(slannReminders(fifth()).length, 5);
  assert.deepEqual(slannReminders({}), []);
});
