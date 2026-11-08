// Q6 (docs/specs/tests-secondaires-agregateur/) : les Tests secondaires passent par l'agrégateur, un seul calcul, celui du combat.
// T0 : la fonction commune `resolveV5TestModifiers`, extraite de `buildCombatTest`, et l'aide de comparaison avec le pivot.
// T1 à T8 ajoutent chacune une section par famille de Tests secondaires (inventaire.md), en comparant au pivot avec `compareWithPivot`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCombatTest } from '../../../js/core/v5-combat-rules.js';
import { resolveV5TestModifiers, finalizeV5TestModifiers } from '../../../js/core/v5-test-modifiers.js';
import { getReferenceCatalogue } from '../../../js/core/reference-catalog.js';
import { CONDITION_QUESTIONS } from '../../../js/core/condition-effects.js';

const SWIM = 'skill-4e_61_74_61_74_69_6f_6e-base';   // Natation (F) ; Nageur endurant : +2 DR en poursuite
const CALM = 'skill-43_61_6c_6d_65-base';            // Calme (FM), Test mental
const CARAC = { cc: 'CC', ct: 'CT', f: 'F', e: 'E', i: 'I', ag: 'Ag', dex: 'Dex', int: 'Int', fm: 'FM', soc: 'Soc' };
const skillOf = id => getReferenceCatalogue().skills.find(row => row.id === id);

const spellLayer = (id, testModifiers) => ({ id, spellId: 'spell-' + id, spellName: id, casterId: 'caster-' + id, testModifiers });
const prayerLayer = (id, testModifiers) => ({ id, type: 'test-modifier', testModifiers });
const person = ({ id = 'a', states = [], talents = [], spells = [], prayers = [], specialStates } = {}) => ({
  id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', size: 'average', hp: 10, maxHp: 10,
  caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 },
  states, skills: [], equipment: [], traits: [], armor: {},
  talents: talents.map(talentId => ({ id: talentId, rank: 1, status: 'resolved' })),
  extensions: { v5: { hasMomentum: false, spellEffects: spells, divineEffects: prayers, ...(specialStates ? { specialStates } : {}) } } });
const PRONE = { key: 'aterre', name: 'À terre', level: 1 };
const STUNNED = { key: 'sonne', name: 'Sonné', level: 1 };

/** Test de compétence du plateau (pivot) : `buildCombatTest` sans arme, sans armure portée, sans familier. */
function pivotSkillTest(actor, { skillId, context = {}, target = null, participants = [actor, ...(target ? [target] : [])], roll = 42 } = {}) {
  const skill = skillOf(skillId);
  return buildCombatTest({ actor, target, roll,
    action: { type: 'test', label: skill.nom, attr: CARAC[skill.carac], base: 40, qualities: [], extensions: { fiche: { skillId } } },
    v5: { kind: 'test', context: { skillId, ...context } }, v5State: { participants },
    combatPrelude: {}, weaponSkillUnresolved: [], protectionContext: {} });
}

/** Même Test par la fonction commune, sous la forme qu'emploiera un Test secondaire (sans `action` ni `settings` du combat). */
function commonSkillTest(actor, { skillId, context = {}, target = null, participants = [actor, ...(target ? [target] : [])] } = {}) {
  const skill = skillOf(skillId);
  return resolveV5TestModifiers(actor, { characteristic: CARAC[skill.carac], skill: skill.nom, skillCharacteristic: skill.carac, kind: 'test',
    opponent: target, participants, action: { type: 'test', label: skill.nom, attr: CARAC[skill.carac], base: 40, qualities: [], extensions: { fiche: { skillId } } } },
  { skillId, ...context });
}

/**
 * Aide de comparaison : pour un acteur et une compétence, les modificateurs de la fonction commune (plafonds appliqués) doivent être
 * ceux du Test de compétence du plateau, au même ordre ; ses messages doivent figurer parmi ceux du pivot. `secondary` : modificateurs
 * déjà calculés par un Test secondaire (T1 à T8) à la place de la fonction commune.
 */
function compareWithPivot(actor, options, secondary = null) {
  const pivot = pivotSkillTest(actor, options);
  const common = secondary || (() => {
    const resolved = commonSkillTest(actor, options);
    const lists = { slModifiers: structuredClone(resolved.slModifiers), advantageSources: [...resolved.advantageSources], disadvantageSources: [...resolved.disadvantageSources] };
    finalizeV5TestModifiers(actor, resolved, lists);
    return { ...resolved, ...lists };
  })();
  const detail = pivot.test.options[0].result.details;
  assert.deepEqual(common.slModifiers.map(({ id, label, amount }) => ({ id, label, amount })), detail.modifiers, 'modificateurs de DR');
  assert.deepEqual(common.advantageSources, pivot.test.advantage.advantage, 'Avantages');
  assert.deepEqual(common.disadvantageSources, pivot.test.advantage.disadvantage, 'Désavantages');
  for (const message of common.unresolved) assert.ok(pivot.unresolved.includes(message), `message absent du pivot : ${message}`);
  for (const message of common.restrictions) assert.ok(pivot.restrictions.includes(message), `restriction absente du pivot : ${message}`);
  assert.equal(common.penalty, pivot.penalty, 'pénalité d’États');
  return { pivot, common };
}

// ---- T0 · la fonction commune elle-même ----
const loaded = () => person({ states: [PRONE, STUNNED], talents: ['talent-strong-swimmer'],
  spells: [spellLayer('s', { Natation: 1 })], prayers: [prayerLayer('p', { 'Tous les Tests': 1 })] });
const SWIM_CONTEXT = { pursuit: true, pursuitRole: 'pursuer', involvesMovement: true };

test('T0 À terre et Sonné, talent de compétence, sort et prière : sort +1, prière +1, Sonné −1, talent +2 et Avantage', () => {
  const { common } = compareWithPivot(loaded(), { skillId: SWIM, context: { ...SWIM_CONTEXT, conditionPenaltyMode: 'sl' } });
  assert.deepEqual(common.slModifiers.map(row => [row.id, row.amount]), [['spell-skill:Natation', 1], ['spell-skill:Tous les Tests', 1], ['conditions', -1], ['talent:talent-strong-swimmer', 2]]);
  assert.deepEqual(common.advantageSources.map(row => row.id), ['talent:talent-strong-swimmer']);
  assert.deepEqual(common.disadvantageSources, [], 'DR retenus par le MJ : le Désavantage d’À terre ne se cumule pas');
  assert.deepEqual(common.rows.filter(row => !row.dropped).map(row => [row.source, row.kind, row.amount ?? null]),
    [['Sort ou prière', 'modifier', 1], ['Sort ou prière', 'modifier', 1], ['État', 'modifier', -1], ['Talent', 'modifier', 2], ['Talent', 'advantage', null]]);
});

test('T0 pénalités d’États différentes, Désavantage retenu : À terre donne le Désavantage, Sonné ne coûte rien', () => {
  const { common } = compareWithPivot(loaded(), { skillId: SWIM, context: { ...SWIM_CONTEXT, conditionPenaltyMode: 'disadvantage' } });
  assert.equal(common.slModifiers.some(row => row.id === 'conditions'), false);
  assert.deepEqual(common.disadvantageSources.map(row => row.id), ['prone']);
});

test('T0 précisions demandées au MJ (needsInput) : mouvement, puis choix DR ou Désavantage, comme le Test principal', () => {
  const actor = loaded();
  const noMovement = commonSkillTest(actor, { skillId: SWIM, context: { pursuit: true, pursuitRole: 'pursuer' } });
  assert.deepEqual(noMovement.needsInput, [{ field: 'involvesMovement', label: CONDITION_QUESTIONS.movement }]);
  assert.ok(pivotSkillTest(actor, { skillId: SWIM, context: { pursuit: true, pursuitRole: 'pursuer' } }).unresolved.includes(CONDITION_QUESTIONS.movement));
  const mixed = compareWithPivot(actor, { skillId: SWIM, context: SWIM_CONTEXT }).common;
  assert.deepEqual(mixed.needsInput.map(row => row.field), ['conditionPenaltyMode']);
});

test('T0 Endurance de l’anachorète : ni pénalité ni Désavantage d’État, sorts, prière et talent gardés', () => {
  const actor = { ...loaded(), extensions: { v5: { ...loaded().extensions.v5, specialStates: { ignoreConditionPenalties: true } } } };
  const { common } = compareWithPivot(actor, { skillId: SWIM, context: { pursuit: true, pursuitRole: 'pursuer' } });
  assert.deepEqual(common.slModifiers.map(row => [row.id, row.amount]), [['spell-skill:Natation', 1], ['spell-skill:Tous les Tests', 1], ['talent:talent-strong-swimmer', 2]]);
  assert.deepEqual(common.disadvantageSources, []);
  assert.deepEqual(common.needsInput, [], 'aucune question : À terre n’a plus d’effet');
});

test('T0 Clarté d’esprit : Sonné sans pénalité sur un Test mental (Calme), pénalité gardée sinon', () => {
  const clear = person({ states: [STUNNED], specialStates: { clarityOfThought: true } });
  assert.equal(compareWithPivot(clear, { skillId: CALM }).common.penalty, 0);
  assert.equal(compareWithPivot(person({ states: [STUNNED] }), { skillId: CALM }).common.penalty, 1);
  assert.equal(compareWithPivot(clear, { skillId: SWIM, context: { involvesMovement: false } }).common.penalty, 1, 'Natation (F) n’est pas un Test mental');
});

test('T0 cumul d’États : la plus forte pénalité seule, l’autre montrée écartée', () => {
  const actor = person({ states: [{ key: 'sonne', name: 'Sonné', level: 2 }, { key: 'extenue', name: 'Exténué', level: 1 }] });
  const { common, pivot } = compareWithPivot(actor, { skillId: CALM });
  assert.equal(common.penalty, 2);
  assert.deepEqual(common.droppedModifiers, pivot.droppedModifiers);
  assert.deepEqual(common.rows.filter(row => row.dropped).map(row => [row.id, row.amount]), [['condition:extenue', -1]]);
});

test('T0 clés « … adverse » de l’opposant : lues pour le testeur, comme au combat', () => {
  const opponent = person({ id: 'b', spells: [spellLayer('o', { 'Calme adverse': -1 })] });
  const { common } = compareWithPivot(person(), { skillId: CALM, target: opponent });
  assert.deepEqual(common.slModifiers.map(row => [row.id, row.amount]), [['spell-adverse:Calme adverse', -1]]);
});

test('T0 CA9 : sans État, talent ni effet, la fonction commune ne rend rien', () => {
  const { common } = compareWithPivot(person(), { skillId: CALM });
  assert.deepEqual([common.slModifiers, common.advantageSources, common.disadvantageSources, common.needsInput, common.unresolved, common.restrictions], [[], [], [], [], [], []]);
});
