// U8 lot L5b (CA4, qualités et surnombre) : Défensive, Déséquilibrée, Pointue, Imprécise, Bouclier et surnombre, passés en clauses puis
// par combineEffects, donnent le même total que le calcul actuel (buildCombatTest, applyAttackSl). Adaptateurs purs, non branchés (L5z).
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCombatTest, v5ShieldDefense } from '../../../js/core/v5-combat-rules.js';
import { applyAttackSl, defenseQualityClauses, attackSlClauses } from '../../../js/core/roll-qualities.js';
import { outnumberTestClauses, outnumberTestRules } from '../../../js/core/outnumbering.js';
import { combineEffects, clauseEntries } from '../../../js/core/effect-engine.js';

const fighter = (id, camp, extra = {}) => ({
  id, name: id, kind: 'PNJ', camp, zone: 'active', size: 'average', hp: 10, maxHp: 10,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 30, Ag: 40, Dex: 30, Int: 30, FM: 30, Soc: 30, M: 4 },
  states: [], talents: [], skills: [], equipment: [], traits: [], armor: {}, extensions: { v5: { hasMomentum: false } }, ...extra });
const sum = rows => rows.reduce((total, row) => total + row.amount, 0);
const total = clauses => combineEffects(clauseEntries(clauses)).totals.modifySL ?? 0;
const modifiersOf = result => result.test.options[0].result.details.modifiers;
const ownRows = (rows, pattern) => rows.filter(row => pattern.test(row.id));

const melee = (actor, target, { role = 'actor', participants = [actor, target], context = {}, defenseQualities = [], protectionContext = {} } = {}) => buildCombatTest({
  actor, target, roll: 42,
  action: { type: 'attack', label: 'Épée', attr: 'CC', base: 40, qualities: [] },
  defense: { type: 'skill', label: 'Corps à corps (Base)', attr: 'CC', base: 40, roll: 42, qualities: defenseQualities, v5: { kind: 'melee', context: {} } },
  attackContext: { ranged: false }, v5: { kind: 'melee', context }, v5State: { participants },
  combatPrelude: {}, weaponSkillUnresolved: [], protectionContext }, role);

// ---- surnombre ----
test('L5b surnombre : +1 (surnombre), +2 (encerclée), 0 = mêmes totaux que outnumberTestRules et que buildCombatTest', () => {
  const a = fighter('a', 'pj'), b = fighter('b', 'pj'), c = fighter('c', 'pj'), t = fighter('t', 'ennemi');
  const cases = [
    { participants: [a, t], context: {} },
    { participants: [a, b, t], context: { outnumberAttackerIds: ['b'] } },
    { participants: [a, b, c, t], context: { outnumberAttackerIds: ['b', 'c'], surrounded: true } },
    { participants: [a, b, t], context: { outnumberAttackerIds: ['b'], surrounded: true } },
    { participants: [a, t], context: { surrounded: true } }
  ];
  for (const { participants, context } of cases) {
    const args = { actor: a, target: t, participants, kind: 'melee', action: { type: 'attack' }, context };
    const clauses = outnumberTestClauses(args);
    assert.equal(total(clauses), sum(outnumberTestRules(args)), JSON.stringify(context));
    assert.equal(total(clauses), sum(ownRows(modifiersOf(melee(a, t, { participants, context })), /^outnumber/)), JSON.stringify(context));
    for (const clause of clauses) assert.equal(clause.bearer.kind, 'situation');
  }
});

test('L5b surnombre : +1 et +2 ne se cumulent pas (politique max), le +1 reste listé comme écarté', () => {
  const a = fighter('a', 'pj'), b = fighter('b', 'pj'), t = fighter('t', 'ennemi');
  const clauses = outnumberTestClauses({ actor: a, target: t, participants: [a, b, t], kind: 'melee', action: { type: 'attack' }, context: { outnumberAttackerIds: ['b'], surrounded: true } });
  assert.equal(clauses.length, 2);
  const combined = combineEffects(clauseEntries(clauses));
  assert.equal(combined.totals.modifySL, 2);
  assert.deepEqual(combined.groups[0].dropped.map(row => [row.entry.clauseId, row.rule]), [['outnumber', 'max']]);
});

test('L5b surnombre : aucun effet en défense, au tir ou hors attaque, comme outnumberTestRules', () => {
  const a = fighter('a', 'pj'), b = fighter('b', 'pj'), t = fighter('t', 'ennemi');
  const base = { actor: a, target: t, participants: [a, b, t], kind: 'melee', action: { type: 'attack' }, context: { outnumberAttackerIds: ['b'] } };
  for (const patch of [{ defending: true }, { kind: 'ranged' }, { action: { type: 'test' } }]) assert.deepEqual(outnumberTestClauses({ ...base, ...patch }), []);
});

test('L5b Q4 surnombre (situation) et bonus d\'un sort se somment par le moteur', () => {
  const a = fighter('a', 'pj'), b = fighter('b', 'pj'), t = fighter('t', 'ennemi');
  const clauses = outnumberTestClauses({ actor: a, target: t, participants: [a, b, t], kind: 'melee', action: { type: 'attack' }, context: { outnumberAttackerIds: ['b'] } });
  const spell = { bearer: { kind: 'spell', sourceId: 's', layerId: 'spell:0' }, effect: { op: 'modifySL', amount: 1, stack: 'bestBonusWorstPenalty', stackGroup: 'magic-test' } };
  const combined = combineEffects([...clauseEntries(clauses), spell]);
  assert.equal(combined.ready, true);
  assert.equal(combined.totals.modifySL, 2);
});

// ---- qualités de défense ----
test('L5b Défensive, Déséquilibrée : mêmes totaux que buildCombatTest en défense de mêlée', () => {
  const attacker = fighter('a', 'pj'), defender = fighter('t', 'ennemi');
  for (const qualities of [[], [{ id: 'defensive' }], [{ id: 'desequilibree' }], [{ id: 'defensive' }, { id: 'desequilibree' }]]) {
    const rows = ownRows(modifiersOf(melee(attacker, defender, { role: 'defender', defenseQualities: qualities })), /^(defensive-protection|quality-)/);
    assert.equal(total(defenseQualityClauses(qualities)), sum(rows), JSON.stringify(qualities));
  }
});

test('L5b Déséquilibrée écrase Défensive : seule la clause de Déséquilibrée (−1) subsiste', () => {
  const clauses = defenseQualityClauses([{ id: 'defensive' }, { id: 'desequilibree' }]);
  assert.deepEqual(clauses.map(clause => clause.id), ['quality-desequilibree']);
  assert.equal(total(clauses), -1);
});

test('L5b hors mêlée, les qualités de défense de l\'arme ne comptent pas (comme buildCombatTest)', () => {
  assert.deepEqual(defenseQualityClauses([{ id: 'defensive' }], { kind: 'ranged' }), []);
});

// ---- Bouclier ----
const shieldItem = { id: 'shield', kind: 'shield', ap: 2, keywords: [{ id: 'bouclier' }] };
const shieldContext = { shieldId: 'shield', shieldAvailable: true, opposedWithShield: true, ranged: false };

test('L5b Bouclier V5 : +1 DR, sans cumul avec Défensive (politique max), mêmes totaux que buildCombatTest', () => {
  const attacker = fighter('a', 'pj'), defender = fighter('t', 'ennemi', { equipment: [shieldItem] });
  for (const qualities of [[], [{ id: 'defensive' }], [{ id: 'desequilibree' }]]) {
    const result = melee(attacker, defender, { role: 'defender', defenseQualities: qualities, protectionContext: shieldContext });
    const rows = ownRows(modifiersOf(result), /^(defensive-protection|quality-)/);
    const decided = v5ShieldDefense({ target: defender, defense: { label: 'Corps à corps (Base)' }, protectionContext: shieldContext, attackContext: { ranged: false } });
    assert.equal(decided.v5Bonus, true);
    const clauses = defenseQualityClauses(qualities, { shield: decided.v5Bonus && !decided.barrakulIgnored });
    assert.equal(total(clauses), sum(rows), JSON.stringify(qualities));
  }
});

test('L5b Bouclier et Défensive : un seul +1, le second est écarté avec la règle, Bouclier seul reste +1', () => {
  const both = combineEffects(clauseEntries(defenseQualityClauses([{ id: 'defensive' }], { shield: true })));
  assert.equal(both.totals.modifySL, 1);
  assert.equal(both.groups[0].dropped.length, 1);
  assert.equal(both.groups[0].dropped[0].rule, 'max');
  assert.equal(total(defenseQualityClauses([], { shield: true })), 1);
  assert.equal(total(defenseQualityClauses([], { shield: false })), 0);
});

test('L5b Bouclier avec Déséquilibrée : +1 −1 = 0, comme aujourd\'hui (Déséquilibrée écrase Défensive, pas le Bouclier)', () => {
  assert.equal(total(defenseQualityClauses([{ id: 'desequilibree' }], { shield: true })), 0);
});

// ---- Pointue / Imprécise ----
test('L5b Pointue, Imprécise : même total que applyAttackSl, réussite ou échec', () => {
  const sets = [[], [{ id: 'pointue' }], [{ id: 'imprecise' }], [{ id: 'pointue' }, { id: 'imprecise' }], [{ id: 'precise' }, { id: 'pointue' }]];
  for (const qualities of sets) for (const success of [true, false]) {
    assert.equal(total(attackSlClauses(success, qualities)), applyAttackSl(2, success, qualities).bonus, JSON.stringify([qualities, success]));
  }
});

test('L5b Pointue : clause conditionnée à la réussite ; Imprécise écrase Pointue', () => {
  const [pointue] = attackSlClauses(true, [{ id: 'pointue' }]);
  assert.deepEqual(pointue.when, [{ field: 'test.success', op: 'eq', value: true }]);
  assert.deepEqual(attackSlClauses(true, [{ id: 'pointue' }, { id: 'imprecise' }]).map(clause => clause.id), ['quality-imprecise']);
});
