import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { DiceLine, Profile, Participant, normalizeAction } from '../js/core/models.js';
import { sanitizeParticipant, sanitizeProfile } from '../js/core/sanitize.js';
import { migrateSnapshot } from '../js/core/migrations.js';
import { parseProfileText } from '../js/core/text-profile-import.js';
import { inferActionType, previewResolution, applyResolution } from '../js/core/resolution.js';
import {
  parseWeaponDamage, strengthBonusOf, evaluateWeaponDamage, describeWeaponDamage,
  computeDamage, damageBreakdown, formatDamageFormula
} from '../js/core/damage.js';

function memoryPersistence(initial = null) {
  let state = initial && structuredClone(initial);
  return {
    async load() { return state && structuredClone(state); },
    async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; },
    peek() { return state && structuredClone(state); }
  };
}

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

// --- 1. parseWeaponDamage ----------------------------------------------------------

test('E19 parseWeaponDamage — formules de force, avec variantes de casse, signe, espaces et SB', () => {
  for (const input of ['BF+4', 'bf+4', '+BF+4', 'BF + 4', 'SB+4']) {
    const parsed = parseWeaponDamage(input);
    assert.equal(parsed.kind, 'strength', input);
    assert.equal(parsed.bonus, 4, input);
  }
  assert.equal(parseWeaponDamage('BF').bonus, 0);
  assert.equal(parseWeaponDamage('BF-1').bonus, -1);
  assert.equal(parseWeaponDamage('BF−1').bonus, -1);
  assert.equal(parseWeaponDamage(' BF+4 ').text, 'BF+4');
});

test('E19 parseWeaponDamage — valeurs fixes', () => {
  assert.equal(parseWeaponDamage('+9').kind, 'fixed');
  assert.equal(parseWeaponDamage('+9').bonus, 9);
  assert.equal(parseWeaponDamage('−2').kind, 'fixed');
  assert.equal(parseWeaponDamage('−2').bonus, -2);
  assert.equal(parseWeaponDamage(4).kind, 'fixed');
  assert.equal(parseWeaponDamage(4).bonus, 4);
});

test('E19 parseWeaponDamage — expressions inconnues et entrées vides', () => {
  for (const input of ['1d10', 'BF+1d10', 'BF+99999999999999999999', '++2', '+-2', '-BF']) {
    assert.deepEqual({ kind: parseWeaponDamage(input).kind }, { kind: 'unknown' }, input);
  }
  for (const input of ['', '  ', null, undefined, NaN]) {
    assert.equal(parseWeaponDamage(input), null, String(input));
  }
});

// --- 2. normalizeAction ------------------------------------------------------------

test('E19 normalizeAction — une formule donne un nombre et garde son texte', () => {
  const a = normalizeAction({ damage: 'BF+4' });
  assert.equal(a.damage, 4);
  assert.equal(a.damageFormula, 'BF+4');
  const b = normalizeAction({ damage: '1d10' });
  assert.equal(b.damage, 0);
  assert.equal(b.damageFormula, '1d10');
  const c = normalizeAction({ damage: 'BF' });
  assert.equal(c.damage, 0);
  assert.equal(c.damageFormula, 'BF');
});

test('E19 normalizeAction — dégâts numériques : pas de clé damageFormula', () => {
  const cases = [[{ damage: 4 }, 4], [{ damage: '4' }, 4], [{ damage: '+2' }, 2], [{ damage: '−2' }, -2], [{ damage: '' }, 0], [{}, 0]];
  for (const [input, expected] of cases) {
    const action = normalizeAction(input);
    assert.equal(action.damage, expected, JSON.stringify(input));
    assert.equal('damageFormula' in action, false, JSON.stringify(input));
  }
  // `Number('-0') || 0` valait 0 : pas de zéro négatif.
  assert.ok(Object.is(normalizeAction({ damage: '-0' }).damage, 0));
  assert.ok(Object.is(parseWeaponDamage('BF-0').bonus, 0));
});

test('E19 normalizeAction — formule stockée : conservation, arbitrage et effacement', () => {
  const kept = normalizeAction({ damage: 4, damageFormula: 'BF+4' });
  assert.equal(kept.damage, 4);
  assert.equal(kept.damageFormula, 'BF+4');
  const fromFormula = normalizeAction({ damageFormula: 'BF+4' });
  assert.equal(fromFormula.damage, 4);
  assert.equal(fromFormula.damageFormula, 'BF+4');
  const overridden = normalizeAction({ damage: 8, damageFormula: 'BF+4' });
  assert.equal(overridden.damage, 8);
  assert.equal('damageFormula' in overridden, false);
  const dice = normalizeAction({ damage: 0, damageFormula: '1d10' });
  assert.equal(dice.damage, 0);
  assert.equal(dice.damageFormula, '1d10');
  const typed = normalizeAction({ damage: 'BF+5', damageFormula: 'BF+4' });
  assert.equal(typed.damage, 5);
  assert.equal(typed.damageFormula, 'BF+5');
  assert.equal('damageFormula' in normalizeAction({ damage: 4, damageFormula: null }), false);
  assert.equal('damageFormula' in normalizeAction({ damage: 4, damageFormula: '' }), false);
});

test('E19 normalizeAction — idempotent, ordre des clés compris', () => {
  const inputs = [
    { id: 'x', damage: 'BF+4' }, { id: 'x', damage: '1d10' }, { id: 'x', damage: 'BF' },
    { id: 'x', damage: 4 }, { id: 'x', damage: 8, damageFormula: 'BF+4' },
    { id: 'x', damageFormula: 'BF−1' }, { id: 'x' }
  ];
  for (const input of inputs) {
    const once = normalizeAction(input);
    const twice = normalizeAction(once);
    assert.deepEqual(twice, once, JSON.stringify(input));
    assert.equal(JSON.stringify(twice), JSON.stringify(once), JSON.stringify(input));
  }
});

test('E19 normalizeAction — une action numérique n’a aucune clé de plus qu’avant', () => {
  const expected = ['id', 'base', 'mod', 'note', 'damage', 'targetId', 'qualities', 'valuesX', 'capacity', 'extensions'];
  assert.deepEqual(Object.keys(normalizeAction({ id: 'x' })), expected);
  const action = normalizeAction({ id: 'x', damage: 6 });
  assert.deepEqual(Object.keys(action).sort(), [...expected].sort());
  const withInput = normalizeAction({ id: 'x', damage: 6, custom: 1 });
  assert.deepEqual(Object.keys(withInput).filter(key => !expected.includes(key)), ['custom']);
  assert.ok(expected.every(key => key in withInput));
});

// --- 3. Transport ------------------------------------------------------------------

test('E19 transport — DiceLine, sanitize et constructeurs conservent la formule', () => {
  assert.equal(new DiceLine({ damage: 'BF+3' }).damageFormula, 'BF+3');
  assert.equal(has(new DiceLine({ damage: 5 }), 'damageFormula'), false);
  const actions = [{ id: 'a', name: 'Hache', damage: 'BF+4' }];
  assert.equal(sanitizeProfile({ id: 'p', actions }).actions[0].damageFormula, 'BF+4');
  assert.equal(sanitizeParticipant({ id: 'c', actions }).actions[0].damageFormula, 'BF+4');
  assert.equal(new Profile({ actions }).actions[0].damageFormula, 'BF+4');
  assert.equal(new Participant({ actions }).actions[0].damageFormula, 'BF+4');
});

test('E19 transport — migrateSnapshot convertit sans invalider et journalise', () => {
  const { data, report } = migrateSnapshot({ reserve: [], combat: { participants: [] }, diceLines: [{ id: 'd', damage: 'BF+2' }] });
  const line = data.diceLines[0];
  assert.equal(line.damage, 2);
  assert.equal(line.damageFormula, 'BF+2');
  assert.equal(line.extensions?.invalidFields?.damage, undefined);
  assert.ok(report.migrated.some(entry => entry.path === 'diceLines/d/damage'), JSON.stringify(report.migrated));
  const numeric = migrateSnapshot({ reserve: [], combat: { participants: [] }, diceLines: [{ id: 'd', damage: 5 }] });
  assert.equal(numeric.data.diceLines[0].damage, 5);
  assert.equal(numeric.report.migrated.some(entry => entry.path === 'diceLines/d/damage'), false);
});

// --- 4-6. Évaluation ---------------------------------------------------------------

test('E19 strengthBonusOf — dizaines de F, BF de repli, entrées vides', () => {
  assert.equal(strengthBonusOf({ F: 35 }), 3);
  assert.equal(strengthBonusOf({ F: 39 }), 3);
  assert.equal(strengthBonusOf({ F: 40 }), 4);
  assert.equal(strengthBonusOf({ F: '35' }), 3);
  assert.equal(strengthBonusOf({ BF: 4 }), 4);
  assert.equal(strengthBonusOf({ F: 35, BF: 9 }), 3);
  for (const input of [{}, null, { F: null }, { F: '' }]) {
    assert.equal(strengthBonusOf(input), null, JSON.stringify(input));
  }
});

test('E19 evaluateWeaponDamage — résolu ou à arbitrer', () => {
  assert.deepEqual(evaluateWeaponDamage('BF+4', 3), { status: 'resolved', kind: 'strength', text: 'BF+4', value: 7, strengthBonus: 3, bonus: 4 });
  assert.equal(evaluateWeaponDamage('BF', 3).value, 3);
  assert.equal(evaluateWeaponDamage('BF−1', 3).value, 2);
  assert.deepEqual(evaluateWeaponDamage('BF+4', null), { status: 'manual', kind: 'strength', text: 'BF+4', bonus: 4, reason: 'force-inconnue' });
  assert.deepEqual(evaluateWeaponDamage('1d10', 3), { status: 'manual', kind: 'unknown', text: '1d10', reason: 'expression-non-reconnue' });
  const fixed = evaluateWeaponDamage(4, null);
  assert.equal(fixed.status, 'resolved');
  assert.equal(fixed.value, 4);
  const empty = evaluateWeaponDamage('', null);
  assert.equal(empty.status, 'resolved');
  assert.equal(empty.value, 0);
});

test('E19 describeWeaponDamage — libellés', () => {
  const action = { damage: 4, damageFormula: 'BF+4' };
  assert.equal(describeWeaponDamage(action, { F: 35 }), 'BF+4 = 7');
  assert.equal(describeWeaponDamage(action, {}), 'BF+4 : F inconnue');
  assert.equal(describeWeaponDamage({ damage: 0, damageFormula: '1d10' }, { F: 35 }), '1d10 : à arbitrer');
  assert.equal(describeWeaponDamage({ damage: 4 }, {}), '4');
  assert.equal(describeWeaponDamage({ damage: -1 }, {}), '−1');
});

// --- 7. computeDamage --------------------------------------------------------------

test('E19 computeDamage — arme en formule de force', () => {
  const result = computeDamage({ weaponDamage: 'BF+4', strengthBonus: 3, sl: 2, targetToughnessBonus: 3, targetArmour: 1 });
  assert.equal(result.weaponDamage, 7);
  assert.equal(result.strengthBonus, 3);
  assert.equal(result.finalDamage, 5);
  assert.equal(formatDamageFormula(result), 'BF 3 + 4 arme + 2 DR − 3 BE − 1 PA = 5');
  assert.deepEqual(damageBreakdown(result).terms[0], { sign: '+', value: 3, label: 'BF', labelFirst: true });
});

test('E19 computeDamage — qualité Pointue, expressions non calculables, arme numérique', () => {
  const pointy = computeDamage({ weaponDamage: 'BF+4', strengthBonus: 3, sl: 2, targetToughnessBonus: 3, targetArmour: 1, qualities: ['Pointue'] });
  assert.equal(pointy.weaponDamage, 8);
  assert.equal(damageBreakdown(pointy).terms.find(term => term.label === 'arme').value, 5);
  assert.equal(computeDamage({ weaponDamage: '1d10' }), null);
  assert.equal(computeDamage({ weaponDamage: 'BF+4' }), null);
  const numeric = computeDamage({ weaponDamage: 6, sl: 2, targetToughnessBonus: 3, targetArmour: 2 });
  assert.equal(has(numeric, 'strengthBonus'), false);
  assert.equal(formatDamageFormula(numeric), '6 arme + 2 DR − 3 BE − 2 PA = 3');
});

// --- 8. Résolution -----------------------------------------------------------------

const attacker = (caracs = { F: 35 }) => ({ id: 'a', name: 'Orc', caracs, states: [] });
const victim = () => ({ id: 't', name: 'Cible', hp: 10, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [] });
const HIT = 30;
const MISS = 90;

test('E19 résolution — BF+4 avec F 35, action brute et normalisée', () => {
  for (const action of [{ type: 'attack', base: 60, damage: 'BF+4' }, normalizeAction({ type: 'attack', base: 60, damage: 'BF+4' })]) {
    const preview = previewResolution({ actor: attacker(), target: victim(), action, roll: HIT });
    assert.equal(preview.hit, true);
    assert.equal(preview.damage.weaponDamage, 7);
    assert.equal(preview.damage.strengthBonus, 3);
    assert.equal(preview.weapon.status, 'resolved');
    assert.equal(preview.weapon.value, 7);
    assert.equal(preview.damage.finalDamage, Math.max(1, 7 + preview.sl - 3 - 0));
  }
});

test('E19 résolution — expression inconnue : à arbitrer, PV inchangés à l’application', () => {
  const target = victim();
  const preview = previewResolution({ actor: attacker(), target, action: { type: 'attack', base: 60, damage: '1d10' }, roll: HIT });
  assert.equal(preview.damage, null);
  assert.equal(preview.weapon.status, 'manual');
  assert.equal(preview.weapon.reason, 'expression-non-reconnue');
  assert.equal(preview.weapon.text, '1d10');
  const applied = applyResolution(preview, { revision: 0, participants: [target], appliedResolutionIds: [] });
  assert.equal(applied.status, 'applied');
  assert.equal(applied.state.participants.find(p => p.id === 't').hp, 10);
});

test('E19 résolution — F absente ou seulement BF', () => {
  const noForce = previewResolution({ actor: attacker({}), target: victim(), action: { type: 'attack', base: 60, damage: 'BF+4' }, roll: HIT });
  assert.equal(noForce.weapon.status, 'manual');
  assert.equal(noForce.weapon.reason, 'force-inconnue');
  assert.equal(noForce.damage, null);
  const onlyBf = previewResolution({ actor: attacker({ BF: 4 }), target: victim(), action: { type: 'attack', base: 60, damage: 'BF+4' }, roll: HIT });
  assert.equal(onlyBf.weapon.value, 8);
  assert.equal(onlyBf.damage.weaponDamage, 8);
});

test('E19 résolution — pas d’arme sur un raté ou une compétence, inferActionType', () => {
  const miss = previewResolution({ actor: attacker(), target: victim(), action: { type: 'attack', base: 60, damage: 'BF+4' }, roll: MISS });
  assert.equal(miss.hit, false);
  assert.equal(miss.weapon, null);
  const skill = previewResolution({ actor: attacker(), target: victim(), action: { type: 'skill', base: 60 }, roll: HIT });
  assert.equal(skill.weapon, null);
  assert.equal(inferActionType({ damage: 0, damageFormula: 'BF' }), 'attack');
  assert.equal(inferActionType({ damage: 0, damageFormula: '' }), 'skill');
});

// --- 9. Import texte ---------------------------------------------------------------

const ORC = 'Nom: Orc\nPV: 12\nF: 35\nAction: Hache | type=attack | base=45 | dégâts=BF+4';

test('E19 import texte — dégâts en formule, numériques et dés', () => {
  const formula = parseProfileText(ORC);
  const action = formula.profiles[0].actions[0];
  assert.equal(action.damage, 4);
  assert.equal(action.damageFormula, 'BF+4');
  assert.equal(formula.status, 'ready');
  const numeric = parseProfileText(ORC.replace('BF+4', '4')).profiles[0].actions[0];
  assert.equal(numeric.damage, 4);
  assert.equal(has(numeric, 'damageFormula'), false);
  const dice = parseProfileText(ORC.replace('BF+4', '1d10')).profiles[0].actions[0];
  assert.equal(dice.damage, 0);
  assert.equal(dice.damageFormula, '1d10');
});

// --- 10. Store ---------------------------------------------------------------------

test('E19 store — la formule importée survit à la sauvegarde et au rechargement', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence });
  await store.ready;
  await store.importParsedProfiles(parseProfileText(ORC).profiles);
  assert.equal(store.listProfiles()[0].actions[0].damageFormula, 'BF+4');
  const saved = persistence.peek();
  assert.equal(saved.reserve[0].actions[0].damageFormula, 'BF+4');
  const reloaded = createStore({ persistence: memoryPersistence(saved) });
  await reloaded.ready;
  assert.equal(reloaded.listProfiles()[0].actions[0].damageFormula, 'BF+4');
  assert.equal(reloaded.listProfiles()[0].actions[0].damage, 4);
});

test('E19 store — résolution BF+4 puis expression à arbitrer journalisée', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addParticipant({ id: 'actor', name: 'Orc', hp: 10, caracs: { F: 35 }, zone: 'active' });
  await store.addParticipant({ id: 'target', name: 'Cible', hp: 10, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, zone: 'active' });
  const sure = store.previewResolution({ actorId: 'actor', targetId: 'target', action: { type: 'attack', base: 60, damage: 'BF+4' }, roll: HIT });
  assert.equal(sure.weapon.value, 7);
  assert.equal(sure.damage.weaponDamage, 7);
  const manual = store.previewResolution({ actorId: 'actor', targetId: 'target', action: { type: 'attack', base: 60, damage: '1d10' }, roll: HIT });
  const result = await store.applyResolution(manual);
  assert.equal(result.status, 'applied');
  assert.equal(store.getCombat().participants.get('target').hp, 10);
  const entry = store.getLog()[0];
  assert.match(entry.text, /dégâts à arbitrer \(1d10\)/);
  assert.equal(entry.detail.weapon.status, 'manual');
});
