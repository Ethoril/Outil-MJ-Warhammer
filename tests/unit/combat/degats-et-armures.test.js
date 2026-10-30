import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeDamage, PLANCHER_TOUCHE, FACTEUR_INOFFENSIVE, parseWeaponDamage, strengthBonusOf, evaluateWeaponDamage, describeWeaponDamage, damageBreakdown, formatDamageFormula } from '../../../js/core/damage.js';
import { createStore } from '../../../js/core/store.js';
import { DiceLine, Profile, Participant, normalizeAction } from '../../../js/core/models.js';
import { sanitizeParticipant, sanitizeProfile } from '../../../js/core/sanitize.js';
import { migrateSnapshot } from '../../../js/core/migrations.js';
import { parseProfileText } from '../../../js/core/text-profile-import.js';
import { inferActionType, previewResolution, applyResolution, replayResolution } from '../../../js/core/resolution.js';
import { previewCombatFailure } from '../../../js/core/v5-combat-fumbles.js';
import { acquiredConditionInstances, conditionLevels, hasMomentum, momentumAfterChange } from '../../../js/core/v5-combat-rules.js';

describe('Dégâts', () => {
test('computeDamage — Cas nominal', () => {
  // Dégâts 6, SL 2, BE 3, PA 2 -> net = 6 + 2 - (3 + 2) = 3
  const res = computeDamage({ weaponDamage: 6, sl: 2, targetToughnessBonus: 3, targetArmour: 2, qualities: [] });
  assert.equal(res.net, 3);
  assert.equal(res.finalDamage, 3);
  assert.equal(res.isPlancher, false);
});

test('computeDamage — Absorption totale -> Plancher (1)', () => {
  // Dégâts 4, SL 1, BE 3, PA 4 -> net = 5 - 7 = -2 -> finalDamage = 1 (plancher)
  const res = computeDamage({ weaponDamage: 4, sl: 1, targetToughnessBonus: 3, targetArmour: 4, qualities: [] });
  assert.equal(res.net, -2);
  assert.equal(res.finalDamage, PLANCHER_TOUCHE);
  assert.equal(res.isPlancher, true);
});

test('computeDamage — Absorption égale au brut (net = 0) -> Plancher (1)', () => {
  // Dégâts 5, SL 0, BE 3, PA 2 -> net = 5 - 5 = 0 -> finalDamage = 1 (plancher)
  const res = computeDamage({ weaponDamage: 5, sl: 0, targetToughnessBonus: 3, targetArmour: 2, qualities: [] });
  assert.equal(res.net, 0);
  assert.equal(res.finalDamage, PLANCHER_TOUCHE);
  assert.equal(res.isPlancher, true);
});

test('computeDamage — Qualité Inoffensive (PA doublés, pas de plancher)', () => {
  // Dégâts 6, SL 2, BE 3, PA 2 x 2 = 4 -> net = 8 - 7 = 1
  const res1 = computeDamage({ weaponDamage: 6, sl: 2, targetToughnessBonus: 3, targetArmour: 2, qualities: [{ id: 'inoffensive' }] });
  assert.equal(res1.paEffectif, 4);
  assert.equal(res1.finalDamage, 1);
  assert.equal(res1.isPlancher, false);

  // Dégâts 4, SL 0, BE 3, PA 2 x 2 = 4 -> net = 4 - 7 = -3 -> finalDamage = 0 (pas de plancher !)
  const res2 = computeDamage({ weaponDamage: 4, sl: 0, targetToughnessBonus: 3, targetArmour: 2, qualities: [{ id: 'inoffensive' }] });
  assert.equal(res2.net, -3);
  assert.equal(res2.finalDamage, 0);
  assert.equal(res2.isPlancher, false);
});

test('computeDamage — Inoffensive sur cible sans armure (2 x 0 = 0)', () => {
  const res = computeDamage({ weaponDamage: 6, sl: 2, targetToughnessBonus: 3, targetArmour: 0, qualities: [{ id: 'inoffensive' }] });
  assert.equal(res.paEffectif, 0);
  assert.equal(res.finalDamage, 5);
});

test('computeDamage — SL négatif sur réussite marginale', () => {
  // Dégâts 8, SL -1, BE 3, PA 2 -> net = 7 - 5 = 2
  const res = computeDamage({ weaponDamage: 8, sl: -1, targetToughnessBonus: 3, targetArmour: 2 });
  assert.equal(res.finalDamage, 2);
});

test('computeDamage — Qualité inconnue ignorée', () => {
  const resNominal = computeDamage({ weaponDamage: 6, sl: 2, targetToughnessBonus: 3, targetArmour: 2, qualities: [] });
  const resUnknown = computeDamage({ weaponDamage: 6, sl: 2, targetToughnessBonus: 3, targetArmour: 2, qualities: [{ id: 'magique' }] });
  assert.equal(resNominal.finalDamage, resUnknown.finalDamage);
  assert.equal(resNominal.net, resUnknown.net);
});

test('computeDamage — Qualité avec rating inconnue ignorée', () => {
  const resNominal = computeDamage({ weaponDamage: 6, sl: 2, targetToughnessBonus: 3, targetArmour: 2, qualities: [] });
  const resUnknownRating = computeDamage({ weaponDamage: 6, sl: 2, targetToughnessBonus: 3, targetArmour: 2, qualities: [{ id: 'explosion', rating: 3 }] });
  assert.equal(resNominal.finalDamage, resUnknownRating.finalDamage);
  assert.equal(resNominal.net, resUnknownRating.net);
});

test('computeDamage — Cible sans E ou sans armure (pas de crash)', () => {
  assert.doesNotThrow(() => {
    const res = computeDamage({ weaponDamage: 5, sl: 1 });
    assert.equal(res.be, 0);
    assert.equal(res.targetArmour, 0);
    assert.equal(res.finalDamage, 6);
  });
});
});

describe('Formules de dégâts', () => {
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
  assert.equal(pointy.weaponDamage, 7);
  assert.equal(damageBreakdown(pointy).terms.find(term => term.label === 'arme').value, 4);
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
    const preview = previewResolution({ v5: { kind: 'ranged' }, actor: attacker(), target: victim(), action, roll: HIT });
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
  const preview = previewResolution({ v5: { kind: 'ranged' }, actor: attacker(), target, action: { type: 'attack', base: 60, damage: '1d10' }, roll: HIT });
  assert.equal(preview.damage, null);
  assert.equal(preview.weapon.status, 'manual');
  assert.equal(preview.weapon.reason, 'expression-non-reconnue');
  assert.equal(preview.weapon.text, '1d10');
  const applied = applyResolution(preview, { revision: 0, participants: [target], appliedResolutionIds: [] });
  assert.equal(applied.status, 'applied');
  assert.equal(applied.state.participants.find(p => p.id === 't').hp, 10);
});

test('E19 résolution — F absente ou seulement BF', () => {
  const noForce = previewResolution({ v5: { kind: 'ranged' }, actor: attacker({}), target: victim(), action: { type: 'attack', base: 60, damage: 'BF+4' }, roll: HIT });
  assert.equal(noForce.weapon.status, 'manual');
  assert.equal(noForce.weapon.reason, 'force-inconnue');
  assert.equal(noForce.damage, null);
  const onlyBf = previewResolution({ v5: { kind: 'ranged' }, actor: attacker({ BF: 4 }), target: victim(), action: { type: 'attack', base: 60, damage: 'BF+4' }, roll: HIT });
  assert.equal(onlyBf.weapon.value, 8);
  assert.equal(onlyBf.damage.weaponDamage, 8);
});

test('E19 résolution — pas d’arme sur un raté ou une compétence, inferActionType', () => {
  const miss = previewResolution({ v5: { kind: 'ranged' }, actor: attacker(), target: victim(), action: { type: 'attack', base: 60, damage: 'BF+4' }, roll: MISS });
  assert.equal(miss.hit, false);
  assert.equal(miss.weapon, null);
  const skill = previewResolution({ v5: { kind: 'ranged' }, actor: attacker(), target: victim(), action: { type: 'skill', base: 60 }, roll: HIT });
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
  assert.equal(saved.reserve[0].diceLines[0].damageFormula, 'BF+4');
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
  const sure = store.previewResolution({ v5: { kind: 'ranged' }, actorId: 'actor', targetId: 'target', action: { type: 'attack', base: 60, damage: 'BF+4' }, roll: HIT });
  assert.equal(sure.weapon.value, 7);
  assert.equal(sure.damage.weaponDamage, 7);
  const manual = store.previewResolution({ v5: { kind: 'ranged' }, actorId: 'actor', targetId: 'target', action: { type: 'attack', base: 60, damage: '1d10' }, roll: HIT });
  const result = await store.applyResolution(manual);
  assert.equal(result.status, 'applied');
  assert.equal(store.getCombat().participants.get('target').hp, 10);
  const entry = store.getLog()[0];
  assert.match(entry.text, /dégâts à arbitrer \(1d10\)/);
  assert.equal(entry.detail.weapon.status, 'manual');
});

test('le détail d\'une résolution du journal est lisible en français', async () => {
  const { describeResolutionDetail } = await import('../../../js/core/resolution.js');
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addParticipant({ id: 'actor', name: 'Orc', hp: 10, caracs: { F: 35 }, zone: 'active' });
  await store.addParticipant({ id: 'target', name: 'Cible', hp: 10, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, zone: 'active' });
  const preview = store.previewResolution({ v5: { kind: 'ranged' }, actorId: 'actor', targetId: 'target', action: { type: 'attack', base: 60, damage: 'BF+4' }, roll: 23 });
  await store.applyResolution(preview);
  const lines = describeResolutionDetail(store.getLog()[0].detail);
  assert.equal(lines[0], 'Type : Attaque');
  assert.ok(lines.includes('Jet : 23'));
  assert.ok(lines.includes('Seuil : 60'));
  assert.ok(lines.some(line => /^DR : [+−]\d+$/.test(line)));
  assert.ok(lines.some(line => line.startsWith('Règle : v5-combat')));
  assert.ok(lines.some(line => line.startsWith('Localisation : 32 → ')));
  assert.ok(lines.some(line => line.startsWith('Dégâts : ') && line.includes('BF 3')));
  const text = lines.join(' | ');
  assert.doesNotMatch(text, /resolutionId|null|undefined|\[object/);
  assert.deepEqual(describeResolutionDetail({ hit: false, sl: -2, critical: null, fumble: {}, resolutionId: 'x', application: {} }), ['DR : −2', 'Pas de touche', 'Maladresse']);
  assert.deepEqual(describeResolutionDetail(null), []);
});
});

describe('Dégâts T2bis (caractérisation)', () => {
const q = (id, parameter = '') => ({ id, parameter });

test('T2 bis characterization — Explosion secondaire réduit les dégâts par PA d’armure en inventaire', () => {
  const actor={id:'shooter',camp:'hero',zone:'active',hp:20,caracs:{CT:60,F:40,E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const primary={id:'primary',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{}}};
  const secondary={id:'secondary',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{E:30},states:[],skills:[],
    equipment:[{id:'mail',kind:'armour',name:'Cotte',ap:2,layer:'mail',locations:['head','body','leftArm','rightArm','leftLeg','rightLeg'],keywords:[]}],extensions:{v5:{}}};
  const participants=[actor,primary,secondary];
  const preview=previewResolution({actor,target:primary,baseRevision:0,round:1,roll:21,
    action:{type:'attack',attr:'CT',base:60,damage:8,qualities:[q('explosion','3')]},attackContext:{ranged:true},
    v5:{kind:'ranged',context:{explosionTargetIds:['primary','secondary'],explosionLocationRollsById:{secondary:35}}},v5State:{participants}});
  assert.equal(preview.secondaryTargets[0].damage.targetArmour,2);
  assert.equal(preview.secondaryTargets[0].damage.finalDamage,3,'8 dégâts − BE 3 − PA d’inventaire 2');
  const applied=applyResolution(preview,{revision:0,round:1,participants,appliedResolutionIds:[]});
  assert.equal(applied.status,'applied');
  assert.equal(applied.state.participants.find(row=>row.id==='secondary').hp,17);
});

test('T2 bis characterization — Maladresse 10 transmet le BF du tireur aux dégâts sur l’allié', () => {
  const actor={id:'shooter',camp:'hero',zone:'active',hp:12,caracs:{F:40,E:30},states:[],equipment:[]};
  const ally={id:'ally',camp:'hero',zone:'active',hp:8,maxHp:8,caracs:{E:30},states:[],equipment:[]};
  const normalized={actor,action:{type:'attack',damage:'BF+2'},resolutionId:'fumble-ally',v5State:{participants:[actor,ally]}};
  const result=previewCombatFailure({normalized,fumble:{expanded:false},context:{fumbleRoll:10,allyCandidates:['ally'],fumbleAllySelectionRoll:50,fumbleAllyUnitsRoll:3}});
  const hit=result.effects.find(effect=>effect.type==='hit-ally');
  assert.equal(hit.damage,6,'BF 4 + arme 2; le dé des unités (3) intervient séparément dans les DR');
});

 test('T2 bis — détonation applique les PA de la pièce d’armure au corps', () => {
  const actor={id:'shooter',camp:'hero',zone:'active',hp:20,caracs:{E:30},states:[],skills:[],equipment:[],extensions:{v5:{combatEffects:[{id:'due',kind:'bomb-detonation'}]}}};
  const target={id:'target',camp:'foes',zone:'active',hp:20,caracs:{E:30},states:[],skills:[],equipment:[{id:'mail',kind:'armour',name:'Cotte',ap:2,layer:'mail',locations:['body'],keywords:[]}],extensions:{v5:{}}};
  const participants=[actor,target];
  const preview=previewResolution({actor,action:{type:'skill',base:10},v5State:{participants},round:1,baseRevision:0,v5:{kind:'test',context:{bombDetonation:true,bombDamage:8,designatedTargetIds:['target']}}});
  const applied=applyResolution(preview,{revision:0,round:1,participants});
  assert.equal(applied.status,'applied');
  assert.equal(applied.state.participants.find(row=>row.id==='target').hp,17,'8 dégâts − 3 BE − 2 PA');
});

 test('T2 bis — le BF est évalué et l’allié touché utilise les PA de son inventaire', () => {
  const actor={id:'shooter',camp:'hero',zone:'active',hp:12,caracs:{CT:10,F:40,E:30},states:[],equipment:[]};
  const ally={id:'ally',camp:'hero',zone:'active',hp:8,maxHp:8,caracs:{E:30},states:[],equipment:[{id:'mail',kind:'armour',name:'Cotte',ap:2,layer:'mail',locations:['head','body','leftArm','rightArm','leftLeg','rightLeg'],keywords:[]}]};
  const foe={id:'foe',camp:'foes',zone:'active',hp:12,maxHp:12,caracs:{E:30},states:[],equipment:[]};
  const participants=[actor,ally,foe];
  const preview=previewResolution({actor,target:foe,action:{type:'attack',attr:'CT',base:10,damage:'BF+2'},roll:99,baseRevision:0,round:1,v5State:{participants},attackContext:{ranged:true},
    v5:{kind:'ranged',context:{fumbleRoll:10,allyCandidates:['ally'],fumbleAllySelectionRoll:50,fumbleAllyUnitsRoll:3}}});
  const hit=preview.combatFailure.effects.find(effect=>effect.type==='hit-ally');
  assert.equal(hit.damage,6,'BF 4 + arme 2');
  assert.equal(hit.unitsRoll,3,'le dé des unités reste séparé pour déterminer le SL');
  const applied=applyResolution(preview,{revision:0,round:1,participants});
  assert.equal(applied.status,'applied');
  assert.equal(applied.state.participants.find(row=>row.id==='ally').hp,4,'dégâts : BF 4 + arme 2 + DR 3 − BE 3 − PA 2');
});
});

describe('Combat lot 2', () => {
const source = id => ({ id, label: id });
const actor = extra => ({ id: 'a', name: 'Attaquant', hp: 10, caracs: { E: 30 }, states: [], ...extra });
const target = extra => ({ id: 't', name: 'Défenseur', hp: 10, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [], ...extra });
const input = extra => ({ actor: actor(), target: target(), action: { id: 'sword', type: 'attack', base: 65, damage: 6 }, roll: 43,
  defense: { base: 40, roll: 47, v5: { kind: 'melee' } }, baseRevision: 2, ...extra });
const state = p => ({ revision: p.baseRevision, participants: [p.input.actor, p.input.target], appliedResolutionIds: [] });
const take = (p, id) => applyResolution(p, state(p)).state.participants.find(row => row.id === id);

test('Lot2 combat V5 — conserver61 cause5 Blessures, inverser16 en cause3 selon armure latérale', () => {
  const options = input({ roll: 61, action: { type: 'attack', base: 65, damage: 8 }, actor: actor({ extensions: { v5: { hasMomentum: true } } }),
    target: target({ armorLocations: { head: 0, body: 7, leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0 } }) });
  const preview = previewResolution(options);
  assert.equal(preview.choiceRequired, true);
  assert.deepEqual(preview.decisions.actor.options.map(row => [row.id, row.summary.roll, row.summary.location, row.summary.woundsLost]),
    [['keep', 61, 'Bras Gauche', 5], ['reverse', 16, 'Corps', 3]]);
  assert.equal(preview.decisions.actor.recommendation.optionId, 'keep');
  assert.equal(applyResolution(preview, state(preview)).reason, 'choix-inversion-requis');
  const kept = previewResolution({ ...options, v5: { choice: 'keep' } });
  const reversed = previewResolution({ ...options, v5: { choice: 'reverse' } });
  assert.equal(take(kept, 't').hp, 5);
  assert.equal(take(reversed, 't').hp, 7);
  assert.equal(kept.resolutionId, reversed.resolutionId, 'deux options de la même action, pas deux applications');
});

test('Lot2 combat V5 — défense recommande moins de Blessures subies avec critère explicite', () => {
  const preview = previewResolution(input({ action: { type: 'attack', base: 65, damage: 4 }, target: target({ hp: 20 }),
    defense: { base: 30, roll: 81, v5: { kind: 'melee', advantageSources: [source('terrain')] } } }));
  assert.deepEqual(preview.decisions.defender.options.map(row => row.summary.woundsLost), [8, 1]);
  assert.deepEqual(preview.decisions.defender.recommendation, { optionId: 'reverse', criterion: 'minimumKnownWoundsLost', label: 'Moins de Blessures subies' });
});

test('Lot2 combat V5 — les deux choix doivent être résolus, aucune recommandation complète sur autre choix inconnu', () => {
  const raw = input({ actor: actor({ extensions: { v5: { hasMomentum: true } } }),
    defense: { base: 30, roll: 81, v5: { kind: 'melee', advantageSources: [source('terrain')] } } });
  const pending = previewResolution(raw);
  assert.equal(pending.choiceRequired, true);
  assert.ok(pending.decisions.actor.options.every(row => row.summary.certainty === 'partial'));
  assert.equal(pending.decisions.actor.recommendation, null);
  assert.equal(pending.decisions.defender.recommendation, null);
  const one = previewResolution({ ...raw, v5: { choice: 'keep' } });
  assert.equal(one.choiceRequired, true);
  assert.equal(applyResolution(one, state(one)).status, 'manual');
  const both = previewResolution({ ...raw, v5: { choice: 'keep' }, defense: { ...raw.defense, v5: { ...raw.defense.v5, choice: 'reverse' } } });
  assert.equal(both.choiceRequired, false);
  assert.equal(applyResolution(both, state(both)).status, 'applied');
});

test('Lot2 combat V5 — comparaison et rejeu sans tirage, avec les mêmes jets et DR', () => {
  const random = Math.random;
  Math.random = () => { throw new Error('tirage implicite interdit'); };
  try {
    const first = previewResolution(input({ v5: { advantageSources: [source('terrain')], choice: 'reverse' } }));
    assert.deepEqual(replayResolution(first.input), first);
    assert.equal(first.roll, 34);
    assert.equal(first.test.initialRoll, 43);
    assert.equal(first.defenderTest.initialRoll, 47);
  } finally { Math.random = random; }
});

test('Lot2 combat V5 — perte effective borne PV à zéro, Élan et double application atomiques', () => {
  const preview = previewResolution(input({ target: target({ hp: 2, extensions: { v5: { hasMomentum: true } } }),
    criticalRolls: { secondEffect: 1 } }));
  const before = state(preview);
  const applied = applyResolution(preview, before);
  assert.equal(applied.status, 'applied');
  assert.equal(applied.state.participants.find(row => row.id === 't').hp, 0);
  assert.equal(hasMomentum(applied.state.participants.find(row => row.id === 'a')), true);
  assert.equal(hasMomentum(applied.state.participants.find(row => row.id === 't')), false);
  assert.deepEqual(before, state(preview), 'entrée immuable');
  assert.equal(applyResolution(preview, applied.state).status, 'duplicate');
  assert.equal(applyResolution(preview, { ...before, revision: 3 }).status, 'stale');
  const changedActor = { ...before, participants: [actor({ hp: 9 }), preview.input.target] };
  assert.equal(applyResolution(preview, changedActor).status, 'stale');
});

test('Lot2 combat V5 — réussir double défensif inflige critique même en perdant opposition', () => {
  const preview = previewResolution(input({ roll: 22, action: { type: 'attack', base: 60, damage: 4 },
    defense: { base: 50, roll: 33, v5: { kind: 'melee' } }, criticalRolls: { location: 57, effect: 65 },
    defenderCriticalRolls: { location: 4, effect: 20 } }));
  assert.equal(preview.hit, true);
  assert.ok(preview.critical);
  assert.ok(preview.defenderCritical);
  const applied = applyResolution(preview, state(preview));
  assert.equal(applied.status, 'applied');
  const attacker = applied.state.participants.find(row => row.id === 'a');
  const defender = applied.state.participants.find(row => row.id === 't');
  assert.equal(attacker.hp, 9);
  assert.ok(attacker.states.some(row => row.key === 'sonne'));
  assert.equal(hasMomentum(attacker), false, 'victoire donne Élan, blessures/État critique le retirent dans la même commande');
  assert.equal(defender.hp, 5);
});

test('Lot2 combat V5 — qualités défensives Empaleuse, Dangereuse et Inoffensive respectées', () => {
  const impale = previewResolution(input({ defense: { base: 50, roll: 30, qualities: ['Empaleuse'], v5: { kind: 'melee' } },
    defenderCriticalRolls: { location: 57, effect: 25 } }));
  assert.ok(impale.defenderCritical);
  const danger = previewResolution(input({ defense: { base: 30, roll: 49, qualities: ['Dangereuse'], v5: { kind: 'melee' } } }));
  assert.equal(danger.defenderFumble.expanded, true);
  const harmless = input({ defense: { base: 60, roll: 11, qualities: ['Inoffensive'], v5: { kind: 'melee' } },
    defenderCriticalRolls: { location: 57, effect: 65 } });
  const missing = previewResolution(harmless);
  assert.equal(missing.defenderCritical.details.needsAlternative, true);
  assert.equal(applyResolution(missing, state(missing)).reason, 'deux-jets-gravite-requis:inoffensive');
  const complete = previewResolution({ ...harmless, defenderCriticalRolls: { ...harmless.defenderCriticalRolls, effectAlternative: 25 } });
  assert.equal(complete.defenderCritical.details.effectRoll, 25);
  assert.equal(take(complete, 'a').hp, 9);
});

test('Lot2 combat V5 — défense Ag/Esquive donne test générique, aucun critique de mêlée', () => {
  for (const label of ['Ag', 'Esquive', 'Dodge']) {
    const preview = previewResolution(input({ defense: { label, base: 60, roll: 11 } }));
    assert.equal(preview.defenderTest.kind, 'test');
    assert.equal(preview.defenderCritical, null);
  }
});

test('Lot2 combat V5 — Pointue et Imprécise réservées aux attaques, aucune conversion Précise V4', () => {
  const plain = previewResolution(input());
  const defensivePointue = previewResolution(input({ defense: { base: 40, roll: 47, qualities: ['Pointue', 'Imprécise'] } }));
  assert.equal(defensivePointue.defenderTest.sl, plain.defenderTest.sl);
  const old = previewResolution(input({ action: { type: 'attack', base: 65, damage: 4, qualities: ['Précise'] } }));
  assert.equal(old.score.target, 65);
  assert.equal(old.damage, null);
  assert.equal(old.decisions.actor.options[0].summary.certainty, 'partial');
  assert.equal(applyResolution(old, state(old)).reason, 'version-effet-non-couverte');
});

test('Lot2 combat V5 — Charge donne Élan avant Test mais choix explicite reste nécessaire', () => {
  const preview = previewResolution(input({ v5: { charging: true } }));
  assert.equal(preview.test.advantage.net, 1);
  assert.equal(preview.choiceRequired, true);
  const picked = previewResolution(input({ v5: { charging: true, choice: 'keep' } }));
  assert.equal(hasMomentum(take(picked, 'a')), true);
});

test('Lot2 combat V5 — perte Élan sur blessures réelles ou instance effectivement acquise', () => {
  const before = actor({ extensions: { v5: { hasMomentum: true } }, states: [{ name: 'À Terre', level: 1 }] });
  assert.equal(acquiredConditionInstances(before, [{ key: 'a-terre', level: 1 }]), 0);
  assert.equal(acquiredConditionInstances(before, [{ key: 'sonne', level: 2 }]), 2);
  assert.equal(hasMomentum(momentumAfterChange(before, { ...before, hp: 9 })), false);
  assert.equal(hasMomentum(momentumAfterChange(before, { ...before, states: [...before.states, { name: 'Sonné', level: 1 }] })), false);
  assert.equal(hasMomentum(momentumAfterChange(before, { ...before, hp: 12 })), true);
});

test('Lot2 combat V5 — ancien État|durée garde niveau1, conditions différentes prennent pire DR', () => {
  assert.equal(conditionLevels(actor({ states: ['Sonné|3'] })).get('sonne'), 1);
  const preview = previewResolution(input({ actor: actor({ states: [{ name: 'Sonné', level: 2 }, { name: 'Exténué', level: 3 }, { name: 'Empoisonné', level: 1 }] }) }));
  assert.equal(preview.score.statePenalty, 3);
  assert.equal(preview.score.target, 65);
  assert.equal(preview.sl, -1);
});

test('Lot2 combat V5 — cible Surprise sans défense est résoluble, cible Inconsciente touche automatique', () => {
  const surprise = previewResolution(input({ target: target({ states: ['Surpris'] }), defense: undefined }));
  assert.equal(surprise.sl, 4);
  assert.equal(surprise.unresolved.length, 0);
  assert.equal(applyResolution(surprise, state(surprise)).status, 'applied');
  const helpless = previewResolution(input({ target: target({ states: ['Inconscient'] }), defense: undefined, roll: 89, action: { type: 'attack', base: 30, damage: 4 } }));
  assert.equal(helpless.success, false);
  assert.equal(helpless.hit, true);
  assert.equal(helpless.unresolved.length, 0);
  assert.equal(applyResolution(helpless, state(helpless)).status, 'applied');
});

test('Lot2 combat V5 — tir opposé exige confirmation de la règle autorisant défense', () => {
  const blocked = previewResolution(input({ v5: { kind: 'ranged' } }));
  assert.match(blocked.unresolved[0], /autorisant cette défense contre un tir/);
  assert.equal(applyResolution(blocked, state(blocked)).status, 'manual');
  const allowed = previewResolution(input({ v5: { kind: 'ranged', context: { rangedOppositionAllowed: true } } }));
  assert.equal(allowed.unresolved.length, 0);
});

test('Lot2 combat V5 — PV inconnus ne génèrent ni excédent inventé ni recommandation', () => {
  const preview = previewResolution(input({ target: target({ hp: null }), v5: { advantageSources: [source('terrain')] } }));
  assert.equal(preview.critical, null);
  assert.equal(preview.decisions.actor.recommendation, null);
  assert.ok(preview.decisions.actor.options.every(row => row.summary.certainty === 'partial'));
});

test('Lot2 combat V5 — pénalités différentes demandent arbitrage MJ et Désavantages d’États ne se cumulent pas', () => {
  const raw = input({ actor: actor({ states: [{ name: 'Sonné', level: 1 }, { name: 'Aveuglé', level: 2 }, { name: 'À Terre', level: 1 }] }), roll: 61 });
  const undecided = previewResolution(raw);
  assert.match(undecided.unresolved[0], /pénalités différentes/);
  assert.equal(undecided.decisions.actor.recommendation, null);
  assert.equal(applyResolution(undecided, state(undecided)).status, 'manual');
  const sl = previewResolution({ ...raw, v5: { context: { conditionPenaltyMode: 'sl' } } });
  assert.equal(sl.score.statePenalty, 1);
  assert.equal(sl.test.advantage.net, 0);
  const disadvantage = previewResolution({ ...raw, v5: { context: { conditionPenaltyMode: 'disadvantage' } } });
  assert.equal(disadvantage.score.statePenalty, 0);
  assert.equal(disadvantage.test.advantage.net, -2, 'Aveuglé2, ÀTerre ne devient pas un troisième');
});

test('Lot2 combat V5 — Bouclier oppose avec +1DR, ne cumule pas Défensive et nécessite vraie disponibilité', () => {
  const shield = { id: 'shield', baseId: 'fixture-shield', kind: 'shield', custom: true, name: 'Bouclier', ap: 2, locations: [], layer: 'none',
    category: 'Bouclier', damage: '', range: '', keywords: [{ id: 'protectrice', parameter: '2' }], catalogVersion: 'fixture' };
  const raw = input({ v5: { kind: 'melee' }, target: target({ equipment: [shield] }), protectionContext: { shieldId: 'shield', shieldAvailable: true, opposedWithShield: true },
    defense: { base: 40, roll: 47, qualities: ['Défensive'], v5: { kind: 'melee' } } });
  const withShield = previewResolution(raw);
  assert.equal(withShield.defenderTest.sl, 1);
  assert.equal(withShield.protection.shieldAp, 2);
  const withoutShield = previewResolution({ ...raw, target: target({ equipment: [shield], extensions: { shieldUnavailable: ['shield'] } }) });
  assert.equal(withoutShield.defenderTest.sl, 1, 'Défensive reste +1');
  assert.equal(withoutShield.protection.shieldAp, 0);
  const unbalanced = previewResolution({ ...raw, defense: { ...raw.defense, qualities: ['Défensive', 'Déséquilibrée'] } });
  assert.equal(unbalanced.defenderTest.sl, 0, '+1Bouclier−1Déséquilibrée, Défensive écartée');
  const ranged = previewResolution({ ...raw, v5: { kind: 'ranged' }, defense: { base: 40, roll: 47, label: 'Esquive', v5: { kind: 'test' } },
    protectionContext: { ...raw.protectionContext, lineOfSight: true } });
  assert.equal(ranged.unresolved.length, 0, 'Bouclier2 permet Esquive contre tir sans exception inventée');
  assert.equal(ranged.defenderTest.sl, 1);
});

test('Lot2 combat V5 — critique autonome bloqué si qualité d’armure inconnue, verrous de récupération conservés', () => {
  const armor = { id: 'mail', baseId: 'fixture-mail', kind: 'armour', custom: true, name: 'Armure étrange', ap: 2, locations: ['body'], layer: 'flexible',
    category: 'Armure', damage: '', range: '', keywords: [{ id: 'inconnue', parameter: '' }], catalogVersion: 'fixture' };
  const incomplete = previewResolution(input({ roll: 44, action: { type: 'attack', base: 50, damage: 4 },
    target: target({ equipment: [armor] }), defense: { base: 60, roll: 12 }, criticalRolls: { location: 57, effect: 65 } }));
  assert.equal(incomplete.hit, false);
  assert.match(incomplete.unresolved[0], /Protection du critique/);
  assert.equal(applyResolution(incomplete, state(incomplete)).status, 'manual');
  const locked = previewResolution(input({ roll: 22, criticalRolls: { location: 4, effect: 50 } }));
  const blinded = take(locked, 't').states.find(row => row.key === 'aveugle');
  assert.deepEqual(blinded.v5Recovery, { kind: 'medicalAttention' });
  assert.equal(blinded.source.resolutionId, locked.resolutionId);
  assert.equal(blinded.source.authorId, 'a');
  assert.equal(blinded.source.targetId, 't');
});

test('Lot2 combat V5 — critiques accumulés au-delà de BE rendent Inconscient et retirent Sonné atomiquement', () => {
  const preview = previewResolution(input({ roll: 22, target: target({ states: [{ name: 'Sonné', level: 3 }], caracs: { E: 30 } }),
    criticalRolls: { location: 57, effect: 65 } }));
  const defender = take(preview, 't');
  assert.ok(defender.states.some(row => row.key === 'inconscient'));
  assert.ok(!defender.states.some(row => row.key === 'sonne'));
  assert.equal(hasMomentum(defender), false);
});

test('Lot2 combat V5 — Aveuglé distingue tâche strictement visuelle et Test réalisable avec Désavantage', () => {
  const blind = actor({ states: [{ name: 'Aveuglé', level: 2 }] });
  const climb = previewResolution({ actor: blind, action: { type: 'skill', base: 60 }, roll: 52, v5: { context: { reliesOnSight: true } } });
  assert.equal(climb.test.advantage.net, -2);
  const reading = previewResolution({ actor: blind, action: { type: 'skill', base: 60 }, roll: 52, v5: { context: { requiresSight: true } } });
  assert.match(reading.unresolved[0], /exige la vue/);
  assert.equal(applyResolution(reading, { revision: 0, participants: [blind] }).status, 'manual');
});

test('Lot2 combat V5 — le Round explicite protège les échéances critiques et le rejeu', () => {
  const raw = input({ round: 5, roll: 22, action: { type: 'attack', base: 60, damage: 4 },
    target: target({ hp: 30 }), criticalRolls: { location: 2, effect: 9 } });
  const preview = previewResolution(raw);
  const before = { ...state(preview), round: 5 };
  assert.equal(preview.input.round, 5);
  assert.deepEqual(replayResolution(preview.input), preview);
  const receipt = preview.conditionChanges.target;
  assert.equal(receipt.ready, true);
  assert.equal(receipt.participant.states.find(row => row.key === 'assourdi').v5Timing.acquiredRound, 5);
  const applied = applyResolution(preview, before);
  assert.equal(applied.status, 'applied');
  assert.equal(applied.state.participants.find(row => row.id === 't').states.find(row => row.key === 'assourdi').v5Timing.acquiredRound, 5);
  const defended = previewResolution(input({ round: 5, actor: actor({ hp: 30 }), target: target({ hp: 30 }),
    defense: { base: 50, roll: 33, v5: { kind: 'melee' } }, defenderCriticalRolls: { location: 2, effect: 9 } }));
  assert.equal(defended.conditionChanges.actor.participant.states.find(row => row.key === 'assourdi').v5Timing.acquiredRound, 5);
  const counter = applyResolution(defended, { ...state(defended), round: 5 });
  assert.equal(counter.status, 'applied');
  assert.equal(counter.state.participants.find(row => row.id === 'a').states.find(row => row.key === 'assourdi').v5Timing.acquiredRound, 5);
  assert.equal(applyResolution(preview, { ...before, round: 6 }).status, 'stale');
  assert.deepEqual(before, { ...state(preview), round: 5 }, 'Un Round changé ne doit rien appliquer');
  for (const round of [null, 0, -1, 1.5, '5', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => previewResolution({ ...raw, round }), { code: 'INVALID_ROUND' });
  }
});

test('Lot2 combat V5 — un critique à échéance inconnue refuse une application complète', () => {
  const preview = previewResolution(input({ round: undefined, roll: 22, action: { type: 'attack', base: 60, damage: 4 },
    target: target({ hp: 30 }), criticalRolls: { location: 2, effect: 9 } }));
  const before = state(preview);
  assert.equal(preview.conditionChanges.target.ready, false);
  assert.ok(preview.conditionChanges.target.needsInput.some(row => row.field === 'currentRound'));
  assert.equal(applyResolution(preview, before).status, 'manual');
  assert.deepEqual(before, state(preview));
});
});
