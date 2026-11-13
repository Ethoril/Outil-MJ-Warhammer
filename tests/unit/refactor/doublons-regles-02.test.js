// REGLES-02 : caractérisation du choix « pénalité d'États en DR ou Désavantage » (pénalités d'États différentes) sur les deux
// chemins : calcul commun du combat et de la magie (`resolveV5TestModifiers`) et contexte de Test du divin
// (`resolveV5ConditionTestContext`, motif DIV-05 exigé). Écrit avant la fusion ; doit passer avant et après.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveV5TestModifiers } from '../../../js/core/v5-test-modifiers.js';
import { resolveV5ConditionTestContext } from '../../../js/core/v5-test-context.js';

const sonne = (level = 2) => ({ key: 'sonne', name: 'Sonné', level });
const souille = { key: 'souille', name: 'Souillé', level: 1 };
const aterre = { key: 'aterre', name: 'À terre', level: 1 };
const actorWith = states => ({ id: 'a', name: 'A', caracs: { Soc: 40, E: 40 }, states, talents: [], extensions: { v5: {} } });

// Chemin du combat et de la magie : Test de Sociabilité (Souillé y donne un Désavantage).
const common = (states, context = {}) => {
  const r = resolveV5TestModifiers(actorWith(states), { characteristic: 'Soc', skill: 'Charme', kind: 'test' }, context);
  return { penalty: r.penalty, mixed: r.parts.conditions.mixed, sl: r.slModifiers.map(row => [row.id, row.amount]),
    dis: r.disadvantageSources.map(row => row.id), fields: r.needsInput.map(row => row.field), questions: r.questions.map(row => row.field) };
};
// Chemin du divin.
const divine = (states, context = {}) => {
  const r = resolveV5ConditionTestContext(actorWith(states), { characteristic: 'Soc', ...context });
  return { ready: r.ready, sl: r.slModifiers.map(row => [row.id, row.amount]), dis: r.disadvantageSources.map(row => row.id),
    fields: r.needsInput.map(row => row.field), mode: r.conditionPenaltyMode, reason: r.conditionPenaltyReason, arbitration: r.arbitration };
};

test('REGLES-02 commun : pénalité seule, Désavantage seul, aucun choix demandé', () => {
  assert.deepEqual(common([sonne()]), { penalty: 2, mixed: false, sl: [['conditions', -2]], dis: [], fields: [], questions: [] });
  const only = common([souille]);
  assert.equal(only.penalty, 0); assert.equal(only.mixed, false); assert.equal(only.dis.length, 1); assert.deepEqual(only.fields, []);
});

test('REGLES-02 commun : pénalités différentes sans réponse, les deux s’appliquent et la question reste', () => {
  const r = common([sonne(), souille]);
  assert.equal(r.mixed, true); assert.equal(r.penalty, 2); assert.deepEqual(r.sl, [['conditions', -2]]); assert.equal(r.dis.length, 1);
  assert.deepEqual(r.fields, ['conditionPenaltyMode']); assert.deepEqual(r.questions, ['conditionPenaltyMode']);
  // Réponse invalide : comme sans réponse.
  assert.deepEqual(common([sonne(), souille], { conditionPenaltyMode: 'autre' }), r);
});

test('REGLES-02 commun : choix DR ou Désavantage, sans motif exigé', () => {
  const sl = common([sonne(), souille], { conditionPenaltyMode: 'sl' });
  assert.deepEqual([sl.penalty, sl.sl, sl.dis, sl.fields, sl.questions], [2, [['conditions', -2]], [], [], ['conditionPenaltyMode']]);
  const dis = common([sonne(), souille], { conditionPenaltyMode: 'disadvantage' });
  assert.deepEqual([dis.penalty, dis.sl, dis.dis.length, dis.fields], [0, [], 1, []]);
});

test('REGLES-02 divin : pénalité seule, Désavantage seul, prêts sans arbitrage', () => {
  assert.deepEqual(divine([sonne()]), { ready: true, sl: [['conditions:highest-sl', -2]], dis: [], fields: [], mode: null, reason: null, arbitration: null });
  const only = divine([souille]);
  assert.equal(only.ready, true); assert.equal(only.dis.length, 1); assert.deepEqual(only.sl, []); assert.equal(only.arbitration, null);
});

test('REGLES-02 divin : pénalités différentes, mode et motif exigés, rien appliqué avant', () => {
  const none = divine([sonne(), souille]);
  assert.deepEqual(none, { ready: false, sl: [], dis: [], fields: ['conditionPenaltyMode', 'conditionPenaltyReason'], mode: null, reason: null, arbitration: null });
  const noReason = divine([sonne(), souille], { conditionPenaltyMode: 'sl', conditionPenaltyReason: '   ' });
  assert.deepEqual(noReason, { ready: false, sl: [], dis: [], fields: ['conditionPenaltyReason'], mode: 'sl', reason: null, arbitration: null });
  const reasonOnly = divine([sonne(), souille], { conditionPenaltyMode: 'x', conditionPenaltyReason: ' motif ' });
  assert.deepEqual(reasonOnly, { ready: false, sl: [], dis: [], fields: ['conditionPenaltyMode'], mode: null, reason: 'motif', arbitration: null });
});

test('REGLES-02 divin : arbitrage DIV-05 motivé, DR ou Désavantage', () => {
  const sl = divine([sonne(), souille], { conditionPenaltyMode: 'sl', conditionPenaltyReason: ' DR ' });
  assert.deepEqual(sl, { ready: true, sl: [['conditions:highest-sl', -2]], dis: [], fields: [], mode: 'sl', reason: 'DR',
    arbitration: { decisionId: 'DIV-05', mode: 'sl', reason: 'DR' } });
  const dis = divine([sonne(), souille], { conditionPenaltyMode: 'disadvantage', conditionPenaltyReason: 'D' });
  assert.equal(dis.ready, true); assert.deepEqual(dis.sl, []); assert.equal(dis.dis.length, 1);
  assert.deepEqual(dis.arbitration, { decisionId: 'DIV-05', mode: 'disadvantage', reason: 'D' });
  // Sans conflit, un mode et un motif fournis ne laissent aucune trace.
  assert.deepEqual(divine([sonne()], { conditionPenaltyMode: 'sl', conditionPenaltyReason: 'x' }).arbitration, null);
});

test('REGLES-02 deux chemins : À terre (question de mouvement) puis conflit', () => {
  const c = common([sonne(1), aterre], { involvesMovement: true, conditionPenaltyMode: 'disadvantage' });
  assert.deepEqual([c.penalty, c.dis.length, c.fields], [0, 1, []]);
  const d = divine([sonne(1), aterre], { involvesMovement: true, conditionPenaltyMode: 'disadvantage', conditionPenaltyReason: 'm' });
  assert.deepEqual([d.ready, d.sl, d.dis.length], [true, [], 1]);
});

test('REGLES-02 fonction commune : Obstiné supprime le conflit et la pénalité, garde le Désavantage pour les plafonds', async () => {
  const { resolveConditionPenaltyMix } = await import('../../../js/core/v5-test-modifiers.js');
  const dis = [{ id: 'x' }];
  assert.deepEqual(resolveConditionPenaltyMix({ penalty: 2, disadvantages: dis, ignoreNegative: true }),
    { mixed: false, modeMissing: false, reasonMissing: false, appliedPenalty: 0, disadvantages: dis, mode: null, reason: null, arbitration: null });
  assert.deepEqual(resolveConditionPenaltyMix(), { mixed: false, modeMissing: false, reasonMissing: false, appliedPenalty: 0, disadvantages: [], mode: null, reason: null, arbitration: null });
  assert.equal(resolveConditionPenaltyMix({ penalty: 2, disadvantages: dis, mode: 'sl', reason: 7, requireReason: true }).reasonMissing, true);
});
