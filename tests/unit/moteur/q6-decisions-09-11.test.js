// Q6 (docs/specs/tests-secondaires-agregateur/spec.md, S6) : décisions du MJ du 09/11, CA13 à CA20.
// CA13 séquelles dans le calcul commun ; CA14 Inconscient et Surpris bloquent ; CA15 désengagement = mouvement ; CA16 « … adverse »
// du désengagé sans effet sur l'adversaire qui résiste ; CA17 pause de Focalisation = Test mental ; CA18 Obstiné sur les malus
// propres au Test ; CA19 Déterminé et exceptions d'États ; CA20 l'État évité ne compte pas dans le Calme de Déterminé.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import registry from '../../../js/data/v5-divine-contracts.json' with { type: 'json' };
import { previewV5SecondaryTest, resolveV5TestModifiers } from '../../../js/core/v5-test-modifiers.js';
import { withEngagement, previewDisengage } from '../../../js/core/engagements.js';
import { prepareMagicOptions } from '../../../js/core/v5-magic-talents.js';
import { resolveV5ConditionTestContext } from '../../../js/core/v5-test-context.js';
import { previewDivineExecution } from '../../../js/core/v5-divine-engine.js';
import { getDivineContract } from '../../../js/core/v5-divine-store.js';
import { resoluteException } from '../../../js/core/v5-talent-replacements.js';
import { acquireV5Conditions } from '../../../js/core/v5-effects.js';
import { createAftermathState, registerWoundIncident, treatInfection } from '../../../js/core/v5-aftermath.js';
import { recordPostEncounterTest } from '../../../js/core/v5-sequelae.js';
import { visibleConditionQuestions } from '../../../js/ui/resolution-panel/condition-questions.js';
import { createStore } from '../../../js/core/store.js';
import { getReferenceCatalogue } from '../../../js/core/reference-catalog.js';
import { CONDITION_QUESTIONS } from '../../../js/core/condition-effects.js';

const STUNNED = { key: 'sonne', name: 'Sonné', level: 1 };
const PRONE = { key: 'aterre', name: 'À terre', level: 1 };
const UNCONSCIOUS = { key: 'inconscient', name: 'Inconscient', level: 1 };
const SURPRISED = { key: 'surpris', name: 'Surpris', level: 1 };
const STRONG = { preRollTalent: 'strong-minded' };
const sequelae = rows => ({ sequelaEffects: { rows } });
const AG_LOSS = { id: 'sq-ag', type: 'char', carac: 'Ag', amount: -10, label: 'Fracture mal soignée : Agilité −10' };
const AG_FRACTURE = { id: 'sq-frac', type: 'disadvantage-carac', carac: ['Ag'], count: 1, label: 'Fracture au corps' };
const spellLayer = (id, testModifiers) => ({ id, spellId: 'spell-' + id, spellName: id, casterId: 'caster-' + id, testModifiers });
const person = (id, { states = [], talents = [], v5 = {}, specialStates, skills = [], caracs = {} } = {}) => ({
  id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', size: 'average', hp: 10, maxHp: 10,
  caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 35, Dex: 40, Int: 40, FM: 48, Soc: 40, M: 4, ...caracs },
  states, skills, equipment: [], traits: [], armor: {},
  talents: talents.map(talentId => ({ id: talentId, rank: 1, status: 'resolved' })),
  extensions: { v5: { hasMomentum: false, ...(specialStates ? { specialStates } : {}), ...v5 } } });

// ---- Désengagement (fixture de q6-t2-desengagement.test.js) ----
const ORC_SKILLS = [{ name: 'Corps à corps (Base)', total: 55 }];
const fighter = (id, camp, options = {}) => ({ ...person(id, options), kind: camp === 'ennemi' ? 'PNJ' : 'PJ', camp });
const duel = ({ actor = {}, orc = {} } = {}) => {
  const participants = [fighter('gunther', 'pj', actor), fighter('orc', 'ennemi', { skills: ORC_SKILLS, ...orc })];
  return { participants, combat: withEngagement({ round: 1, participants }, 'gunther', 'orc', 1) };
};
const disengage = (setup, input = {}) => previewDisengage({ ...setup, actorId: 'gunther', input });

describe('CA13 séquelles durables dans le calcul commun', () => {
  test('Test secondaire : la Caractéristique perdue baisse le score, la fracture donne le Désavantage, détail par source', () => {
    const actor = person('a', { v5: sequelae([AG_LOSS, AG_FRACTURE]) });
    // Score 40 − 10 = 30 ; jet 23 inversé par le Désavantage en 32 : échec.
    const out = previewV5SecondaryTest(actor, { score: 40, roll: 23, test: { characteristic: 'Ag', skill: 'Athlétisme' } });
    assert.equal(out.ready, true);
    assert.equal(out.result.score, 30);
    assert.deepEqual(out.disadvantageSources.map(row => row.label), ['Fracture au corps']);
    assert.equal(out.result.success, false);
    assert.deepEqual(out.rows.map(row => [row.source, row.kind, row.label]), [['Séquelle', 'disadvantage', 'Fracture au corps']]);
  });
  test('Test secondaire hors de la Caractéristique visée : rien ne change', () => {
    const out = previewV5SecondaryTest(person('a', { v5: sequelae([AG_LOSS, AG_FRACTURE]) }), { score: 40, roll: 23, test: { characteristic: 'E', skill: 'Résistance' } });
    assert.deepEqual([out.result.score, out.disadvantageSources.length, out.rows.length], [40, 0, 0]);
  });
  test('les pertes durables ne sont pas des pénalités d’État : Obstiné ne les efface pas', () => {
    const actor = person('a', { talents: ['talent-strong-minded'], states: [STUNNED], v5: sequelae([AG_FRACTURE, { id: 'sq-lang', type: 'language-dr', amount: -1, label: 'Langue mutilée' }]) });
    const out = previewV5SecondaryTest(actor, { score: 40, roll: 23, test: { characteristic: 'Ag', skill: 'Langue (Reikspiel)' }, context: STRONG });
    // Sonné annulé (aucune ligne d'État), séquelle de Langue gardée.
    assert.deepEqual(out.modifiers.map(row => [row.id, row.amount]), [['sequela:sq-lang', -1]]);
    assert.deepEqual(out.disadvantageSources.map(row => row.label), ['Fracture au corps']);
  });
  test('deux yeux perdus : la question de la vue des États, puis le Désavantage', () => {
    const actor = person('a', { v5: sequelae([{ id: 'sq-eyes', type: 'both-eyes', label: 'Deux yeux perdus' }]) });
    const pending = previewV5SecondaryTest(actor, { score: 40, roll: 23, test: { characteristic: 'I', skill: 'Perception' } });
    assert.equal(pending.ready, false);
    assert.deepEqual(pending.needsInput, [{ field: 'reliesOnSight', label: CONDITION_QUESTIONS.sight }]);
    const seeing = previewV5SecondaryTest(actor, { score: 40, roll: 23, test: { characteristic: 'I', skill: 'Perception' }, context: { reliesOnSight: true } });
    assert.deepEqual(seeing.disadvantageSources.map(row => row.label), ['Deux yeux perdus']);
  });
  test('désengagement : Agilité perdue sur l’Esquive du désengagé', () => {
    const plan = disengage(duel({ actor: { v5: sequelae([AG_LOSS]) } }), { actorRoll: 21, opponentRoll: 50 });
    // 35 − 10 = 25 contre 21 : 0 DR (au lieu de +1).
    assert.deepEqual([plan.status, plan.actorSl], ['ready', 0]);
  });
  test('désengagement par Esquive avec une jambe perdue (Esquive impossible) : bloqué, comme au combat', () => {
    const leg = { id: 'sq-leg', type: 'no-dodge', label: 'Jambe perdue : Esquive impossible' };
    const plan = disengage(duel({ actor: { v5: sequelae([leg]) } }), { actorRoll: 21, opponentRoll: 50 });
    assert.deepEqual([plan.status, plan.mode], ['blocked', 'restricted']);
    assert.match(plan.reason, /Esquive impossible/);
  });
  test('Focalisation, Prière : la séquelle de la Caractéristique du Test compte', () => {
    const fm = { id: 'sq-fm', type: 'disadvantage-carac', carac: ['FM'], count: 1, label: 'Fracture au corps' };
    const prepared = prepareMagicOptions(person('m', { v5: sequelae([fm, { ...AG_LOSS, carac: 'FM' }]) }), 'channelling', {});
    assert.deepEqual(prepared.disadvantageSources.map(row => row.label), ['Fracture au corps']);
    assert.equal(prepared.scoreDelta, -10);
    const teeth = { id: 'sq-teeth', type: 'char', carac: 'Soc', amount: -5, label: '10 dents perdues : Sociabilité −5' };
    const context = resolveV5ConditionTestContext(person('p', { v5: sequelae([teeth]) }), { characteristic: 'Soc', isAction: true, involvesMovement: false,
      runningOrHiding: false, requiresSight: false, reliesOnSight: false, skill: 'Prière' });
    assert.equal(context.scoreDelta, -5);
  });
  test('calcul commun : les séquelles sont aussi rendues pour le combat, sans changer sa liste (`parts.sequelae`)', () => {
    const common = resolveV5TestModifiers(person('a', { v5: sequelae([AG_FRACTURE]) }), { characteristic: 'Ag', kind: 'test' });
    assert.deepEqual(common.parts.sequelae.disadvantages.map(row => row.label), ['Fracture au corps']);
    assert.equal(common.parts.sequelae.disadvantages[0].durable, undefined, 'le combat reçoit les lignes telles que sequelaTestRules les rend');
  });
});

describe('CA14 Inconscient et Surpris', () => {
  test('Inconscient : aucun Test secondaire, motif rendu', () => {
    const out = previewV5SecondaryTest(person('a', { states: [UNCONSCIOUS] }), { score: 40, roll: 23, test: { characteristic: 'E', skill: 'Résistance' } });
    assert.deepEqual([out.ready, out.blocked], [false, true]);
    assert.deepEqual(out.needsInput.map(row => row.label), ['Inconscient : aucun Test ne peut être tenté.']);
  });
  test('Surpris : un Test qui ne demande pas d’agir reste possible', () => {
    const out = previewV5SecondaryTest(person('a', { states: [SURPRISED] }), { score: 40, roll: 23, test: { characteristic: 'E', skill: 'Résistance' } });
    assert.equal(out.ready, true);
  });
  test('désengagement : Surpris le bloque ; Inconscient, déjà hors de l’engagement, aussi', () => {
    const plan = disengage(duel({ actor: { states: [SURPRISED] } }), { actorRoll: 21, opponentRoll: 50 });
    assert.deepEqual([plan.status, plan.mode], ['blocked', 'restricted']);
    assert.match(plan.reason, /Surpris : aucun Test qui demande d’agir/);
    assert.equal(disengage(duel({ actor: { states: [UNCONSCIOUS] } }), { actorRoll: 21, opponentRoll: 50 }).status, 'blocked');
  });
  test('pause et interruption de Focalisation : Surpris et Inconscient les bloquent', () => {
    for (const kind of ['pause', 'interruption']) for (const state of [SURPRISED, UNCONSCIOUS])
      assert.throws(() => prepareMagicOptions(person('m', { states: [state] }), kind, {}), new RegExp(state.name), `${kind} ${state.name}`);
  });
  test('contexte de Test (Résistance au Courroux, sans Action) : Inconscient bloque', () => {
    const context = resolveV5ConditionTestContext(person('p', { states: [UNCONSCIOUS] }), { characteristic: 'E', isAction: false, involvesMovement: false,
      runningOrHiding: false, requiresSight: false, reliesOnSight: false });
    assert.equal(context.ready, false);
    assert.deepEqual(context.restrictions, ['Inconscient : aucun Test ne peut être tenté.']);
  });
});

describe('CA21 Tests subis d’un Inconscient', () => {
  const unconscious = () => person('a', { states: [UNCONSCIOUS] });
  test('Test subi (passive) : fait normalement ; le même Test actif reste bloqué', () => {
    const passive = previewV5SecondaryTest(unconscious(), { score: 40, roll: 23, test: { characteristic: 'E', skill: 'Résistance', passive: true } });
    assert.equal(passive.ready, true);
    const active = previewV5SecondaryTest(unconscious(), { score: 40, roll: 23, test: { characteristic: 'E', skill: 'Résistance' } });
    assert.deepEqual([active.ready, active.blocked], [false, true]);
  });
  test('Test subi : les malus d’États comptent (Exténué)', () => {
    const out = previewV5SecondaryTest(person('a', { states: [UNCONSCIOUS, { key: 'extenue', name: 'Exténué', level: 2 }] }), { score: 40, roll: 23, test: { characteristic: 'E', skill: 'Résistance', passive: true } });
    assert.deepEqual(out.modifiers.map(row => [row.id, row.amount]), [['conditions', -2]]);
  });
  test('convalescence : la Résistance d’un patient Inconscient est faite', () => {
    const state = { ...createAftermathState(), sequelae: [{ id: 'toe', participantId: 'patient', kind: 'post-encounter-test', status: 'open', difficultyDR: 0 }] };
    const out = recordPostEncounterTest(state, { operationId: 'p', expectedRevision: 0, sequelaId: 'toe', enduranceScore: 30, roll: 25, tester: person('patient', { states: [UNCONSCIOUS] }) });
    assert.equal(out.receipt.status, 'applied', out.receipt.reason);
  });
  test('soins : le Test de Guérison d’un soigneur Inconscient reste bloqué (Test actif)', () => {
    const opened = registerWoundIncident(createAftermathState(), { id: 'i1', operationId: 'r', expectedRevision: 0, participantId: 'patient', source: { kind: 'wounds-lost', cause: 'combat' } });
    const state = { ...opened.state, incidents: opened.state.incidents.map(row => ({ ...row, infection: true })) };
    const out = treatInfection(state, { operationId: 'o', expectedRevision: state.revision, incidentId: 'i1', healer: { participantId: 'healer', skill: 'heal', score: 60, advances: 10, intelligenceBonus: 5 },
      roll: 42, tester: person('healer', { states: [UNCONSCIOUS] }) });
    assert.equal(out.receipt.status, 'refused');
    assert.deepEqual(out.receipt.needsInput.map(row => row.label), ['Inconscient : aucun Test ne peut être tenté.']);
  });
  test('Résistance au Courroux (contexte de Test, passive) : faite par un Inconscient', () => {
    const facts = { characteristic: 'E', isAction: false, involvesMovement: false, runningOrHiding: false, requiresSight: false, reliesOnSight: false };
    assert.equal(resolveV5ConditionTestContext(person('p', { states: [UNCONSCIOUS] }), { ...facts, passive: true }).ready, true);
    assert.equal(resolveV5ConditionTestContext(person('p', { states: [UNCONSCIOUS] }), facts).ready, false);
  });
});

describe('CA22 séquelles à circonstance : question au MJ', () => {
  const HEAD = { id: 'sq-loc', type: 'loc-dr', loc: 'head', amount: -1, label: 'Tête : −1 DR' };
  const HAND = { id: 'sq-hand', type: 'two-hands', label: 'Main perdue' };
  test('zone utilisée : question, Test non résolu ; « oui » applique la séquelle, « non » l’écarte', () => {
    const actor = person('a', { v5: sequelae([HEAD]) });
    const run = context => previewV5SecondaryTest(actor, { score: 40, roll: 23, test: { characteristic: 'E', skill: 'Résistance' }, context });
    const pending = run({});
    assert.equal(pending.ready, false);
    assert.deepEqual(pending.needsInput, [{ field: 'sequelaUses:head', label: 'Séquelle : le Test utilise-t-il cette zone (Tête) ?' }]);
    assert.deepEqual(run({ 'sequelaUses:head': true }).modifiers.map(row => [row.id, row.amount]), [['sequela:sq-loc', -1]]);
    assert.deepEqual(run({ 'sequelaUses:head': false }).modifiers, []);
  });
  test('parole sur un Test de Langue : « Le Test demande-t-il de parler ? »', () => {
    const actor = person('a', { v5: sequelae([{ id: 'sq-sp', type: 'speech-dr', amount: -2, label: 'Langue fendue' }]) });
    const pending = previewV5SecondaryTest(actor, { score: 40, roll: 23, test: { characteristic: 'Int', skill: 'Langue (Reikspiel)' } });
    assert.deepEqual(pending.needsInput.map(row => row.field), ['sequelaSpeech']);
    assert.match(pending.needsInput[0].label, /demande-t-il de parler/);
  });
  test('désengagement : la main perdue pose sa question au désengagé, la réponse débloque', () => {
    const setup = duel({ actor: { v5: sequelae([HAND]) } });
    const pending = disengage(setup, { actorRoll: 21, opponentRoll: 50 });
    assert.equal(pending.status, 'needs-input');
    assert.deepEqual(pending.needsInput.map(row => [row.side, row.field]), [['actor', 'sequelaTwoHands']]);
    const answered = disengage(setup, { actorRoll: 21, opponentRoll: 50, context: { sequelaTwoHands: true } });
    assert.deepEqual([answered.status, answered.actorModifiers.disadvantageSources.map(row => row.label)], ['ready', ['Main ou bras perdu (Test à deux mains)']]);
  });
  test('contexte de Test (Prière) : question en needsInput, réponse par le contexte des talents', () => {
    const facts = { characteristic: 'Soc', isAction: true, involvesMovement: false, runningOrHiding: false, requiresSight: false, reliesOnSight: false, skill: 'Prière' };
    const actor = person('p', { v5: sequelae([HEAD]) });
    const pending = resolveV5ConditionTestContext(actor, facts);
    assert.deepEqual([pending.ready, pending.needsInput.map(row => row.field)], [false, ['sequelaUses:head']]);
    const answered = resolveV5ConditionTestContext(actor, { ...facts, talentContext: { 'sequelaUses:head': true } });
    assert.deepEqual([answered.ready, answered.slModifiers.map(row => row.amount)], [true, [-1]]);
  });
  test('magie : la question est rendue avec son champ et affichée par le panneau, puis corrigeable', () => {
    const prepared = prepareMagicOptions(person('m', { v5: sequelae([HAND]) }), 'channelling', {});
    assert.deepEqual(prepared.conditionNeedRows.map(row => row.field), ['sequelaTwoHands']);
    assert.deepEqual(visibleConditionQuestions(prepared.conditionNeeds, {}, prepared.conditionNeedRows).map(row => row.field), ['sequelaTwoHands']);
    assert.deepEqual(visibleConditionQuestions([], { sequelaTwoHands: false }, []).map(row => [row.field, row.kind]), [['sequelaTwoHands', 'boolean']]);
  });
  test('départage d’Initiative (sequelaNoCircumstanceInput) : aucune question', () => {
    const out = previewV5SecondaryTest(person('a', { v5: sequelae([HEAD, HAND]) }), { score: 40, roll: 23, test: { characteristic: 'E', skill: 'Résistance' }, context: { sequelaNoCircumstanceInput: true } });
    assert.deepEqual([out.ready, out.modifiers], [true, []]);
  });
});

describe('CA15 et CA16 désengagement', () => {
  test('CA15 désengagé À terre : mouvement implicite, Désavantage sans question', () => {
    const plan = disengage(duel({ actor: { states: [PRONE] } }), { actorRoll: 12, opponentRoll: 50 });
    assert.deepEqual(plan.needsInput, []);
    assert.deepEqual([plan.status, plan.actorModifiers.disadvantageSources.map(row => row.label), plan.actorSl], ['ready', ['À terre'], 1]);
  });
  test('CA16 « Corps à corps adverse » du désengagé : sans effet sur l’adversaire qui résiste ; l’inverse joue', () => {
    const plan = disengage(duel({ actor: { v5: { spellEffects: [spellLayer('a', { 'Corps à corps adverse': -1 })] } },
      orc: { v5: { spellEffects: [spellLayer('b', { 'Esquive adverse': -1 })] } } }), { actorRoll: 21, opponentRoll: 50 });
    assert.deepEqual(plan.opponentModifiers.slModifiers, []);
    assert.deepEqual(plan.actorModifiers.slModifiers.map(row => [row.id, row.amount]), [['spell-adverse:Esquive adverse', -1]]);
  });
});

describe('CA17 pause de Focalisation, Test mental', () => {
  test('Clarté d’esprit : ligne de psychologie négative écartée à la pause, comme à la Focalisation', () => {
    const fear = { id: 'psychology:fear', label: 'Peur', amount: -1 };
    for (const kind of ['channelling', 'pause']) {
      const prepared = prepareMagicOptions(person('m', { specialStates: { clarityOfThought: true } }), kind, { slModifiers: [fear] });
      assert.deepEqual(prepared.slModifiers, [], kind);
    }
    assert.deepEqual(prepareMagicOptions(person('m'), 'pause', { slModifiers: [fear] }).slModifiers.map(row => row.id), ['psychology:fear'], 'témoin sans Clarté');
  });
  test('Clarté d’esprit : Sonné sans pénalité à la pause', () => {
    const prepared = prepareMagicOptions(person('m', { states: [STUNNED], specialStates: { clarityOfThought: true } }), 'pause', {});
    assert.deepEqual(prepared.slModifiers, []);
  });
});

describe('CA18 Obstiné sur les malus propres au Test', () => {
  const BATTLE = 'divine:blessing:myrmidia:battle';
  const PRAYER = { canSpeak: true, sourceFingerprint: registry.sourceFingerprint, round: 1, targetIds: ['priest'],
    facts: { targets: { priest: { withinRange: true } } }, roll: 23, expiry: { phase: 'endOfRound', round: 6 } };
  const lessons = () => { const rule = registry.prayerSLRules.find(row => row.id === 'wrath:11-15:pray-sl-modifier');
    return { id: 'prayer-sl-modifier:ca18', type: 'prayer-sl-modifier', amount: -1, originKind: 'wrath', originExecutionId: 'ca18', wrathResultId: 'wrath:11-15',
      ruleId: rule.id, ruleVersion: 1, targetId: 'priest', subjectKey: 'instance:priest', source: structuredClone(rule.source), sourceReceipt: structuredClone(rule.sourceReceipt),
      duration: { roll: 1, sinAtTrigger: 1, rounds: 2, unit: 'rounds' }, roundAnchor: { round: 1, sceneId: null }, expiry: { round: 2, phase: 'endOfRound', moment: 'afterEffects' },
      wrathProof: { schemaVersion: 1, originExecutionId: 'ca18', durationRoll: 1, prayer: { initialRoll: 99, roll: 99, optionId: 'keep', reversed: false, success: false, fumble: true, sl: -5 },
        wrath: { roll: 1, modifiedRoll: 11, sinAtTest: 1, resultId: 'wrath:11-15' } } }; };
  const priest = talents => ({ id: 'priest', name: 'priest', skills: [{ name: 'Prière', status: 'resolved', total: 50 }], caracs: { Soc: 60 }, states: [],
    talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }, ...talents.map(id => ({ id, status: 'resolved', rank: 1 }))],
    extensions: { v5: { divine: { sin: 0 }, divineEffects: [lessons()] } } });
  test('Courroux « Leçons divines » sur la Prière : ramené à 0', () => {
    const witness = previewDivineExecution(priest([]), getDivineContract(BATTLE), [priest([])], PRAYER);
    assert.equal(witness.ready, true, witness.error);
    assert.deepEqual(witness.preview.slModifiers.map(row => row.amount), [-1], 'témoin');
    const actor = priest(['talent-strong-minded']);
    const declared = previewDivineExecution(actor, getDivineContract(BATTLE), [actor], { ...PRAYER, conditionContext: STRONG });
    assert.equal(declared.ready, true, declared.error);
    assert.deepEqual(declared.preview.slModifiers.map(row => row.amount), [0]);
  });
  test('difficulté de la Résistance au Courroux (−2 DR) : ramenée à 0', async () => {
    const memory = () => { let saved = null; return { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } }; };
    const sheet = (id, talents = []) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: id === 'priest' ? 60 : 30, hp: 30, maxHp: 30,
      caracs: { CC: 40, CT: 40, F: 30, E: 50, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 }, armor: { head: 10, body: 10, arms: 10, legs: 10 }, states: [], traits: [], equipment: [],
      skills: [{ id: 'pray', name: 'Prière', carac: 'Soc', status: 'resolved', total: 60 }, { id: 'endurance', name: 'Résistance', carac: 'E', status: 'resolved', total: 50 }],
      talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }, ...talents.map(t => ({ id: t, status: 'resolved', rank: 1 }))], extensions: { v5: { divine: { sin: 2 } } } });
    const run = async (talents, wrathConditionContext) => {
      const store = createStore({ persistence: memory(), storage: null }); await store.ready;
      await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [sheet('priest', talents), sheet('ally')] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
      return store.previewDivineExecution(BATTLE, { actorId: 'priest', targetIds: ['ally'], roll: 99, wrathRoll: 61, wrathDamageRoll: 7, wrathEnduranceRoll: 23, executionId: 'ca18',
        canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, facts: { targets: { ally: { withinRange: true, ally: true } } }, expiry: { phase: 'endOfRound', round: 6 },
        ...(wrathConditionContext ? { wrathConditionContext } : {}) });
    };
    const witness = await run([]);
    assert.equal(witness.ready, true, witness.error);
    assert.equal(witness.wrathDamagePreview.enduranceDifficulty, -2);
    assert.equal(witness.wrathDamagePreview.enduranceTest.details.totalModifier, -2, 'témoin');
    const declared = await run(['talent-strong-minded'], STRONG);
    assert.equal(declared.ready, true, declared.error);
    assert.equal(declared.wrathDamagePreview.enduranceTest.details.totalModifier, 0);
  });
  test('infection : le −1 DR de Guérison ramené à 0', () => {
    const opened = registerWoundIncident(createAftermathState(), { id: 'i1', operationId: 'r', expectedRevision: 0, participantId: 'patient', source: { kind: 'wounds-lost', cause: 'combat' } });
    const state = { ...opened.state, incidents: opened.state.incidents.map(row => ({ ...row, infection: true })) };
    const healer = { participantId: 'healer', skill: 'heal', score: 60, advances: 10, intelligenceBonus: 5 };
    const treat = (tester, conditionContext = {}) => treatInfection(state, { operationId: 'o', expectedRevision: state.revision, incidentId: 'i1', healer, roll: 42, tester, conditionContext });
    const witness = treat(person('healer'));
    assert.equal(witness.receipt.status, 'applied', witness.receipt.reason);
    assert.ok(Number.isInteger(witness.receipt.sl), 'témoin : −1 DR de l’infection compté');
    const strong = treat(person('healer', { talents: ['talent-strong-minded'] }), STRONG);
    assert.equal(strong.receipt.status, 'applied', strong.receipt.reason);
    assert.equal(strong.receipt.sl, witness.receipt.sl + 1, 'le −1 DR de l’infection ramené à 0');
  });
});

describe('CA19 et CA20 Déterminé', () => {
  const calmId = () => getReferenceCatalogue().skills.find(s => s.nom === 'Calme').id;
  const subject = (states = [], extra = {}) => ({ id: 's', name: 'Sujet', caracs: { FM: 40 }, talents: [{ id: 'talent-resolute', status: 'resolved', rank: 1 }],
    skills: [{ id: calmId(), status: 'resolved', total: 45 }], states, ...extra });
  const tryCalm = (who, avoided, extra = {}) => resoluteException({}, who, { context: { tryResolute: true, resoluteRoll: 30, ...extra } }, 1, avoided);
  test('CA19 Clarté d’esprit et Endurance de l’anachorète s’appliquent à son Test de Calme', () => {
    const clear = tryCalm(subject([{ id: 'c1', key: 'sonne', name: 'Sonné', level: 2 }], { extensions: { v5: { specialStates: { clarityOfThought: true } } } }));
    const anchorite = tryCalm(subject([{ id: 'c1', key: 'empoisonne', name: 'Empoisonné', level: 3 }], { extensions: { v5: { specialStates: { ignoreConditionPenalties: true } } } }));
    assert.deepEqual([clear.test.details.totalModifier, anchorite.test.details.totalModifier], [0, 0]);
  });
  // États acquis = ids nouveaux après l'acquisition (ce que calculent resolution.js et store.js).
  const acquire = (before, states, context = {}) => {
    const { participant } = acquireV5Conditions(before, states, { resolutionId: 'r', targetId: 's', ...context });
    const known = new Set((before.states || []).map(row => row.id));
    return { participant, ids: participant.states.map(row => row.id).filter(id => !known.has(id)) };
  };
  test('CA20 tomber À terre : l’État acquis ne compte pas, plus de question de mouvement', () => {
    const { participant, ids } = acquire(subject(), [{ name: 'À terre', level: 1 }]);
    const out = tryCalm(participant, ids);
    assert.deepEqual([out.unresolved, out.test.details.totalModifier, out.exceptions.length], [[], 0, 1]);
  });
  test('CA20 un État d’avant reste compté : Sonné d’avant, Sonné acquis ignoré', () => {
    const { participant, ids } = acquire(subject([{ id: 'old', key: 'sonne', name: 'Sonné', level: 1 }]), [{ name: 'Sonné', level: 1 }], { toughnessBonus: 4 });
    assert.equal(tryCalm(participant, ids).test.details.totalModifier, -1);
  });
  test('CA20 Inconscient acquis : le Test de Calme n’est pas bloqué par l’État qu’il cherche à éviter', () => {
    const { participant, ids } = acquire(subject(), [{ name: 'Inconscient', level: 1 }]);
    assert.deepEqual([tryCalm(participant, ids).unresolved, tryCalm(participant, ids).exceptions.length], [[], 1]);
  });
  test('CA20 par le store : tomber À terre avec Déterminé, Élan préservé sans question de mouvement', async () => {
    let saved = null;
    const store = createStore({ persistence: { load: async () => structuredClone(saved), saveAtomic: async ({ state }) => { saved = structuredClone(state); return { ok: true }; } } });
    await store.ready;
    const sheet = id => ({ id, name: id, kind: 'PJ', camp: id === 'a' ? 'pj' : 'ennemi', hp: 40, maxHp: 40, zone: 'active', caracs: { CC: 60, CT: 60, F: 40, E: 30, Ag: 40, FM: 40, Soc: 60, Int: 60 },
      talents: id === 'a' ? [{ id: 'talent-resolute', status: 'resolved', rank: 1 }] : [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: id === 'a' } } });
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], extensions: { v5: { combatId: 'ca20', turnIndex: 1 } }, combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [sheet('a'), sheet('b')] }, diceLines: [], log: [] });
    const out = await store.acquireConditions('a', [{ name: 'À terre' }], { resolutionId: 'ca20-prone', tryResolute: true, resoluteRoll: 20 });
    assert.notEqual(out?.ok, false, out?.message || out?.error?.message);
    const a = store.listParticipants().find(row => row.id === 'a');
    assert.equal(a.states.some(row => row.key === 'a-terre'), true);
    assert.equal(a.extensions.v5.hasMomentum, true, 'Déterminé réussi : Élan préservé');
  });
});
