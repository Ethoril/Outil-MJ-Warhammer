import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveV5ConditionTestContext } from '../js/core/v5-test-context.js';

const state = (key, name, level = 1) => ({ key, name, level });
const emptyContext = extra => ({ characteristic: 'Soc', isAction: true, ...extra });

test('E4 indépendant — même état additionné, états distincts appliquent seulement le pire malus', () => {
  const actor = { states: [state('extenue', 'Exténué', 2), state('sonne', 'Sonné', 1), state('empoisonne', 'Empoisonné', 3)] };
  const before = structuredClone(actor);
  const result = resolveV5ConditionTestContext(actor, emptyContext({ isAction: false }));
  assert.equal(result.ready, true);
  assert.deepEqual(actor, before, 'le contexte ne modifie pas la fiche');
  assert.equal(result.slModifiers.reduce((sum, item) => sum + item.amount, 0), -3,
    'Exténué 2 et Empoisonné 3 ne s’ajoutent pas: seul le pire état distinct donne −3 DR');
});

test('E4 indépendant — listes répétées du même état sont agrégées avant le pire distinct', () => {
  const actor = { states: [state('empoisonne', 'Empoisonné', 1), state('empoisonne', 'Empoisonné', 1)] };
  const result = resolveV5ConditionTestContext(actor, emptyContext({ isAction: false }));
  assert.equal(result.slModifiers.reduce((sum, item) => sum + item.amount, 0), -2);
  assert.equal(result.levels.empoisonne, 2);
});

test('E4 indépendant — Brisé et Enchevêtré demandent les faits et ne prennent pas faux par défaut', () => {
  const actor = { states: [state('brise', 'Brisé', 2), state('enchevetre', 'Enchevêtré', 1)] };
  const absent = resolveV5ConditionTestContext(actor, emptyContext({ characteristic: 'Ag' }));
  assert.equal(absent.ready, false);
  assert.ok(absent.needsInput.some(row => row.field === 'involvesMovement'));

  const walking = resolveV5ConditionTestContext(actor, emptyContext({ characteristic: 'Ag', involvesMovement: true, runningOrHiding: false }));
  assert.equal(walking.ready, true);
  assert.equal(walking.slModifiers.reduce((sum, item) => sum + item.amount, 0), -2,
    'Brisé 2 et Enchevêtré 1 sont des États distincts: seul le pire malus s’applique');

  const running = resolveV5ConditionTestContext(actor, emptyContext({ characteristic: 'Ag', involvesMovement: true, runningOrHiding: true }));
  assert.equal(running.ready, true);
  assert.equal(running.slModifiers.reduce((sum, item) => sum + item.amount, 0), -1,
    'course confirmée écarte Brisé, Enchevêtré reste applicable');
});

test('E4 indépendant — À terre et Souillé ne cumulent pas leurs Désavantages', () => {
  const actor = { states: [state('a-terre', 'À terre'), state('souille', 'Souillé')] };
  const result = resolveV5ConditionTestContext(actor, emptyContext({ characteristic: 'Soc', involvesMovement: true }));
  assert.equal(result.ready, true);
  assert.equal(result.disadvantageSources.length, 1, 'les Désavantages de sources distinctes ne s’empilent pas');
  assert.equal(result.advantageSources.length, 0);
});

test('E4 indépendant — Aveuglé bloque la tâche visuelle indispensable et désavantage une tâche dépendante', () => {
  const actor = { states: [state('aveugle', 'Aveuglé', 2)] };
  const required = resolveV5ConditionTestContext(actor, emptyContext({ characteristic: 'I', requiresSight: true, reliesOnSight: true }));
  assert.equal(required.ready, false);
  assert.ok(required.restrictions.length);

  const useful = resolveV5ConditionTestContext(actor, emptyContext({ characteristic: 'I', requiresSight: false, reliesOnSight: true }));
  assert.equal(useful.ready, true);
  assert.equal(useful.disadvantageSources.length, 2,
    'Aveuglé 2 est un même État: la pénalité de Désavantage se cumule par niveau');
});

test('E4 indépendant — Surpris/Inconscient bloquent une Action; parler reste un prérequis de la prière', () => {
  for (const condition of [state('surpris', 'Surpris'), state('inconscient', 'Inconscient')]) {
    const blocked = resolveV5ConditionTestContext({ states: [condition] }, emptyContext({ isAction: true }));
    assert.equal(blocked.ready, false, condition.key);
  }
  const nonAction = resolveV5ConditionTestContext({ states: [state('inconscient', 'Inconscient')] }, emptyContext({ isAction: false }));
  assert.equal(nonAction.ready, true, 'le module de contexte n’invente pas une interdiction hors Action');
});

test('E4 indépendant — malus SL et Désavantage incomparables imposent un arbitrage MJ DIV-05', () => {
  const actor = { states: [state('sonne', 'Sonné', 1), state('a-terre', 'À terre')] };
  const unresolved = resolveV5ConditionTestContext(actor, emptyContext({ characteristic: 'CC', involvesMovement: true }));
  assert.equal(unresolved.ready, false);
  assert.ok(unresolved.needsInput.some(row => row.field === 'conditionPenaltyMode'));

  const choice = resolveV5ConditionTestContext(actor, emptyContext({ characteristic: 'CC', involvesMovement: true,
    conditionPenaltyMode: 'sl', conditionPenaltyReason: 'Le MJ retient le malus en DR pour cette action.' }));
  assert.equal(choice.ready, true);
  assert.equal(choice.arbitration?.decisionId, 'DIV-05');
  assert.equal(choice.arbitration?.mode, 'sl');
  assert.equal(choice.disadvantageSources.length, 0, 'le système ne cumule pas silencieusement les deux pénalités');
});

test('E4 indépendant — états inconnus/niveaux invalides et faits non booléens ne sont pas normalisés silencieusement', () => {
  for (const actor of [
    { states: [state('sonne', 'Sonné', 0)] },
    { states: [state('sonne', 'Sonné', 1.5)] },
    { states: [state('etat-inconnu', 'État inconnu', 1)] }
  ]) {
    const result = resolveV5ConditionTestContext(actor, emptyContext({ isAction: false }));
    assert.equal(result.ready, false);
  }
  const invalidFact = resolveV5ConditionTestContext({ states: [state('brise', 'Brisé', 1)] },
    emptyContext({ characteristic: 'Ag', involvesMovement: 'oui', runningOrHiding: false }));
  assert.equal(invalidFact.ready, false);
});

test('E4 indépendant — formats historiques passent par normalizeState sans devenir niveaux ou Conditions nouveaux', () => {
  const actor = { states: ['Sonné|2', { id: 'talent-marker', kind: 'talent-active', key: 'souille', name: 'Souillé', level: 1 }] };
  const result = resolveV5ConditionTestContext(actor, emptyContext({ isAction: false }));
  assert.equal(result.ready, true);
  assert.equal(result.levels.sonne, 1, 'le suffixe historique |2 est une durée, pas deux niveaux');
  assert.equal(result.levels.souille, undefined, 'un marqueur de talent n’est pas une Condition active');
});
