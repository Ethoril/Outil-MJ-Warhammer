// U8, MJ 06/11 Q19 : les exceptions d'États et les Désavantages d'États valent pour tous les Tests, avec le calcul du combat
// (conditionTestRules, conditionPenaltyEffects, conditionDisadvantageEffects). Un test par exception, sur chacun des deux chemins
// hors combat : Tests de magie (prepareMagicOptions) et contexte de Test (resolveV5ConditionTestContext, prières et Tests divins).
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareMagicOptions } from '../../../js/core/v5-magic-talents.js';
import { resolveV5ConditionTestContext } from '../../../js/core/v5-test-context.js';

const subject = (states, { flags = {}, talents = [] } = {}) => ({ id: 'mage', name: 'mage', kind: 'PJ', camp: 'pj', zone: 'active', hp: 10, maxHp: 10,
  caracs: { CC: 30, CT: 30, F: 30, E: 30, I: 30, Ag: 30, Dex: 30, Int: 40, FM: 40, Soc: 30, M: 4 }, states, talents, skills: [], equipment: [], traits: [],
  extensions: { v5: { specialStates: flags } } });
const state = (key, level = 1) => ({ key, name: key, level });

// Dissipation : Test magique sur Langue (Magick), Int, mental.
const magic = (actor, conditionContext = {}) => prepareMagicOptions(actor, 'dispel', { conditionContext });
const magicPenalty = prepared => prepared.slModifiers.find(row => row.id === 'magic-condition-penalty')?.amount ?? 0;
// Contexte de Test : Test de Force (ni mental ni Sociabilité), hors Action.
const context = (actor, extra = {}) => resolveV5ConditionTestContext(actor, { characteristic: 'F', isAction: false, ...extra });
const contextPenalty = result => result.slModifiers.find(row => row.id === 'conditions:highest-sl')?.amount ?? 0;

test('Q19 magie : Endurance de l’anachorète, ni pénalité ni Désavantage d’État', () => {
  assert.equal(magicPenalty(magic(subject([state('sonne', 2)]))), -2, 'témoin');
  const prepared = magic(subject([state('sonne', 2), state('aterre')], { flags: { ignoreConditionPenalties: true } }), { involvesMovement: true });
  assert.equal(magicPenalty(prepared), 0);
  assert.deepEqual(prepared.disadvantageSources, []);
});

test('Q19 magie : drapeau ignoreFatiguePenalties, Exténué sans pénalité', () => {
  assert.equal(magicPenalty(magic(subject([state('extenue', 2)]))), -2, 'témoin');
  assert.equal(magicPenalty(magic(subject([state('extenue', 2)], { flags: { ignoreFatiguePenalties: true } }))), 0);
});

test('Q19 magie : Clarté de pensée, Sonné sans pénalité sur un Test mental', () => {
  assert.equal(magicPenalty(magic(subject([state('sonne', 2)], { flags: { clarityOfThought: true } }))), 0);
});

test('Q19 magie : talent ignoreConditionPenalty (Infatigable), niveaux d’Exténué retirés', () => {
  const tireless = [{ id: 'talent-tireless', status: 'resolved', rank: 1 }];
  assert.equal(magicPenalty(magic(subject([state('extenue', 1)], { talents: tireless }))), 0);
});

test('Q19 magie : Brisé pénalise un Test qui ne sert ni à fuir ni à se cacher, sinon question au MJ', () => {
  assert.equal(magicPenalty(magic(subject([state('brise', 2)]), { runningOrHiding: false })), -2);
  const unknown = magic(subject([state('brise', 2)]));
  assert.equal(magicPenalty(unknown), 0);
  assert.deepEqual(unknown.conditionNeeds, ['Préciser si le Test sert à fuir ou se cacher.']);
});

test('Q19 magie : Enchevêtré pénalise un Test qui implique un mouvement', () => {
  assert.equal(magicPenalty(magic(subject([state('enchevetre', 2)]), { involvesMovement: true })), -2);
  assert.equal(magicPenalty(magic(subject([state('enchevetre', 2)]), { involvesMovement: false })), 0);
});

test('Q19 magie : Désavantages d’États (À terre, Aveuglé, Souillé), un seul État, le plus fort', () => {
  assert.deepEqual(magic(subject([state('aterre')]), { involvesMovement: true }).disadvantageSources.map(row => row.id), ['prone']);
  assert.deepEqual(magic(subject([state('aveugle', 2), state('aterre')]), { involvesMovement: true, reliesOnSight: true }).disadvantageSources.map(row => row.id), ['blinded-0', 'blinded-1']);
  assert.deepEqual(magic(subject([state('souille')]), { usesFellowship: true }).disadvantageSources.map(row => row.id), ['besmirched']);
});

test('Q19 contexte de Test : Endurance de l’anachorète, ni pénalité ni Désavantage d’État', () => {
  const result = context(subject([state('sonne', 2), state('aterre')], { flags: { ignoreConditionPenalties: true } }));
  assert.equal(contextPenalty(result), 0);
  assert.deepEqual(result.disadvantageSources, []);
});

test('Q19 contexte de Test : drapeau ignoreFatiguePenalties, Exténué sans pénalité', () => {
  assert.equal(contextPenalty(context(subject([state('extenue', 2)]))), -2, 'témoin');
  assert.equal(contextPenalty(context(subject([state('extenue', 2)], { flags: { ignoreFatiguePenalties: true } }))), 0);
});

test('Q19 contexte de Test : Clarté de pensée, Sonné sans pénalité sur un Test mental', () => {
  assert.equal(contextPenalty(context(subject([state('sonne', 2)], { flags: { clarityOfThought: true } }), { characteristic: 'FM' })), 0);
  assert.equal(contextPenalty(context(subject([state('sonne', 2)], { flags: { clarityOfThought: true } }))), -2, 'Test physique : pénalité');
});

test('Q19 contexte de Test : talent ignoreConditionPenalty (Infatigable), niveaux d’Exténué retirés', () => {
  const tireless = [{ id: 'talent-tireless', status: 'resolved', rank: 1 }];
  assert.equal(contextPenalty(context(subject([state('extenue', 1)], { talents: tireless }))), 0);
});

test('Q19 contexte de Test : Brisé pénalise un Test qui ne sert ni à fuir ni à se cacher', () => {
  assert.equal(contextPenalty(context(subject([state('brise', 2)]), { runningOrHiding: false })), -2);
  assert.equal(contextPenalty(context(subject([state('brise', 2)]), { runningOrHiding: true })), 0);
});

test('Q19 contexte de Test : Enchevêtré pénalise un Test qui implique un mouvement', () => {
  assert.equal(contextPenalty(context(subject([state('enchevetre', 2)]), { involvesMovement: true })), -2);
  assert.equal(contextPenalty(context(subject([state('enchevetre', 2)]), { involvesMovement: false })), 0);
});

test('Q19 contexte de Test : Désavantages d’États (À terre, Aveuglé, Souillé), Souillé hors Sociabilité sur réponse du MJ', () => {
  assert.deepEqual(context(subject([state('aterre')]), { involvesMovement: true }).disadvantageSources.map(row => row.id), ['condition:aterre:1']);
  assert.deepEqual(context(subject([state('aveugle', 2)]), { requiresSight: false, reliesOnSight: true }).disadvantageSources.map(row => row.id), ['condition:aveugle:1', 'condition:aveugle:2']);
  const asked = context(subject([state('souille')]));
  assert.ok(asked.needsInput.some(row => row.message === 'Préciser si le Test utilise la Sociabilité.' || row.label === 'Préciser si le Test utilise la Sociabilité.'), JSON.stringify(asked.needsInput));
  assert.deepEqual(context(subject([state('souille')]), { usesFellowship: true }).disadvantageSources.map(row => row.label), ['Souillé']);
});
