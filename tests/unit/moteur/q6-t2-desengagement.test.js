// Q6 · T2 (docs/specs/tests-secondaires-agregateur/) : le Désengagement (V5 p. 163, Test opposé Esquive ou Acrobaties contre la
// meilleure Mêlée) passe par le calcul commun des deux côtés (CA3), en plus de l'infériorité numérique et de l'Élan (CA4) ;
// détail par source (CA5), À terre et Enchevêtré sans question de mouvement (CA15, MJ 09/11), rien ne change sans État ni effet (CA9).
import test from 'node:test';
import assert from 'node:assert/strict';
import { withEngagement, previewDisengage } from '../../../js/core/engagements.js';
import { buildCombatTest } from '../../../js/core/v5-combat-rules.js';
import { getReferenceCatalogue } from '../../../js/core/reference-catalog.js';

const DODGE = 'skill-45_73_71_75_69_76_65-base';
const skillOf = id => getReferenceCatalogue().skills.find(row => row.id === id);
const spellLayer = (id, testModifiers) => ({ id, spellId: 'spell-' + id, spellName: id, casterId: 'caster-' + id, testModifiers });
const prayerLayer = (id, testModifiers) => ({ id, type: 'test-modifier', testModifiers });
const fighter = (id, camp, { states = [], talents = [], spells = [], prayers = [], skills = [], v5 = {} } = {}) => ({
  id, name: id, kind: camp === 'ennemi' ? 'PNJ' : 'PJ', camp, zone: 'active', size: 'average', hp: 10, maxHp: 10,
  caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 35, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 },
  states, skills, equipment: [], traits: [], armor: {},
  talents: talents.map(talentId => ({ id: talentId, rank: 1, status: 'resolved' })),
  extensions: { v5: { hasMomentum: false, spellEffects: spells, divineEffects: prayers, ...v5 } } });
const ORC_SKILLS = [{ name: 'Corps à corps (Base)', total: 55 }];
const PRONE = { key: 'aterre', name: 'À terre', level: 1 };
const STUNNED = { key: 'sonne', name: 'Sonné', level: 1 };
const engage = (participants, ...pairs) => pairs.reduce((combat, [a, b]) => withEngagement(combat, a, b, 1), { round: 1, participants });
const duel = ({ actor = {}, orc = {} } = {}) => {
  const participants = [fighter('gunther', 'pj', actor), fighter('orc', 'ennemi', { skills: ORC_SKILLS, ...orc })];
  return { participants, combat: engage(participants, ['gunther', 'orc']) };
};
const preview = (setup, input = {}) => previewDisengage({ ...setup, actorId: 'gunther', input });
const ids = list => list.map(row => [row.id, row.amount ?? null]);

test('CA9 duel sans État ni effet : mêmes scores, mêmes DR qu’avant, aucun modificateur', () => {
  const plan = preview(duel(), { actorRoll: 21, opponentRoll: 50 });
  assert.deepEqual([plan.status, plan.success, plan.actorScore, plan.opponentScore, plan.actorSl, plan.opponentSl, plan.outnumbered], ['ready', true, 35, 55, 1, 0, false]);
  assert.deepEqual(plan.actorModifiers.rows, []);
  assert.deepEqual(plan.opponentModifiers.rows, []);
  assert.deepEqual(plan.needsInput, []);
});

test('CA9 deux contre un, sans État : Désavantage d’infériorité seul, résultat inchangé', () => {
  const participants = [fighter('gunther', 'pj'), fighter('orc', 'ennemi', { skills: ORC_SKILLS }), fighter('gob', 'ennemi')];
  const plan = previewDisengage({ participants, combat: engage(participants, ['gunther', 'orc'], ['gunther', 'gob']), actorId: 'gunther', input: { actorRoll: 12, opponentRoll: 50 } });
  assert.deepEqual([plan.status, plan.success, plan.actorSl, plan.opponentSl], ['ready', true, 1, 0]);
  assert.deepEqual(plan.actorModifiers.rows.map(row => [row.id, row.source, row.kind]), [['disengage:outnumbered', 'Situation', 'disadvantage']]);
});

test('CA3 États de l’adversaire : Sonné ôte 1 DR à sa Mêlée, et l’issue bascule', () => {
  // Gunther 35 contre 31 : +0 DR ; l'Orc 55 contre 50 : +0 DR → égalité, l'initiateur gagne ; Sonné le fait passer à −1.
  const calm = preview(duel(), { actorRoll: 31, opponentRoll: 50 });
  assert.deepEqual([calm.actorSl, calm.opponentSl, calm.success], [0, 0, true]);
  const stunned = preview(duel({ orc: { states: [STUNNED] } }), { actorRoll: 31, opponentRoll: 30 });
  assert.equal(stunned.opponentSl, 2 - 1, 'Sonné : −1 DR à la Mêlée de l’adversaire');
  assert.deepEqual(ids(stunned.opponentModifiers.slModifiers), [['conditions', -1]]);
  assert.deepEqual(stunned.opponentModifiers.rows.map(row => [row.source, row.kind, row.amount]), [['État', 'modifier', -1]]);
});

test('CA3 États du désengagé : Sonné ôte 1 DR à son Esquive', () => {
  const plan = preview(duel({ actor: { states: [STUNNED] } }), { actorRoll: 21, opponentRoll: 50 });
  assert.equal(plan.actorSl, 1 - 1);
  assert.deepEqual(ids(plan.actorModifiers.slModifiers), [['conditions', -1]]);
});

test('CA3 adversaire À terre : Désavantage à sa Mêlée (mouvement implicite en mêlée), sans question', () => {
  const plan = preview(duel({ orc: { states: [PRONE] } }), { actorRoll: 31, opponentRoll: 12 });
  assert.deepEqual(plan.needsInput, []);
  assert.deepEqual(plan.opponentModifiers.disadvantageSources.map(row => row.label), ['À terre']);
  assert.equal(plan.opponentSl, 5 - 2, 'Désavantage : 12 devient 21');
});

test('CA4 infériorité numérique, Élan de l’adversaire et État : tout se somme', () => {
  const participants = [fighter('gunther', 'pj', { states: [STUNNED] }), fighter('orc', 'ennemi', { skills: ORC_SKILLS, v5: { hasMomentum: true }, prayers: [prayerLayer('p', { 'Tous les Tests': 1 })] }), fighter('gob', 'ennemi')];
  const plan = previewDisengage({ participants, combat: engage(participants, ['gunther', 'orc'], ['gunther', 'gob']), actorId: 'gunther', input: { actorRoll: 12, opponentRoll: 50 } });
  assert.deepEqual(ids(plan.actorModifiers.slModifiers), [['conditions', -1]]);
  assert.deepEqual(plan.actorModifiers.disadvantageSources.map(row => row.id), ['disengage:outnumbered']);
  assert.deepEqual(ids(plan.opponentModifiers.slModifiers), [['spell-skill:Tous les Tests', 1]]);
  assert.deepEqual(plan.opponentModifiers.advantageSources.map(row => row.id), ['momentum']);
  // Gunther : 12 → 21 (Désavantage), 35 contre 21 = +1, Sonné −1 → 0. L'Orc : 50 → 05 (Avantage), +5, prière +1 → +6.
  assert.deepEqual([plan.actorSl, plan.opponentSl, plan.success], [0, 6, false]);
  assert.deepEqual(plan.opponentModifiers.rows.map(row => [row.source, row.kind]), [['Sort ou prière', 'modifier'], ['Situation', 'advantage']]);
});

// MJ 09/11 CA15 : le désengagement compte toujours comme un mouvement ; plus de question, même une réponse « non » ne l'écarte pas.
test('CA15 désengagé À terre : Désavantage sans question de mouvement', () => {
  const setup = duel({ actor: { states: [PRONE] } });
  // 35 contre 12 : +2 DR ; avec le Désavantage, 12 devient 21 : +1 DR.
  const plan = preview(setup, { actorRoll: 12, opponentRoll: 50 });
  assert.deepEqual([plan.status, plan.needsInput, plan.actorModifiers.disadvantageSources.map(row => row.label), plan.actorSl], ['ready', [], ['À terre'], 1]);
  const still = preview(setup, { actorRoll: 12, opponentRoll: 50, context: { involvesMovement: false } });
  assert.deepEqual([still.status, still.actorModifiers.disadvantageSources.map(row => row.label), still.actorSl], ['ready', ['À terre'], 1]);
});

test('CA15 Enchevêtré : l’État compte sans question', () => {
  const setup = duel({ actor: { states: [{ key: 'enchevetre', name: 'Enchevêtré', level: 1 }] } });
  assert.deepEqual(preview(setup).needsInput, []);
  const plan = preview(setup, { actorRoll: 21, opponentRoll: 50 });
  assert.deepEqual(ids(plan.actorModifiers.slModifiers), [['conditions', -1]]);
});

test('CA1 côté désengagé : mêmes modificateurs que le Test d’Esquive du plateau', () => {
  const actor = fighter('gunther', 'pj', { states: [PRONE, STUNNED], spells: [spellLayer('s', { Esquive: 1 })], prayers: [prayerLayer('p', { 'Tous les Tests': 1 })] });
  const participants = [actor, fighter('orc', 'ennemi', { skills: ORC_SKILLS })];
  const context = { involvesMovement: true, conditionPenaltyMode: 'sl' };
  const plan = previewDisengage({ participants, combat: engage(participants, ['gunther', 'orc']), actorId: 'gunther', input: { actorRoll: 42, opponentRoll: 50, context } });
  const skill = skillOf(DODGE);
  const pivot = buildCombatTest({ actor, target: null, roll: 42,
    action: { type: 'test', label: skill.nom, attr: 'Ag', base: 35, qualities: [], extensions: { fiche: { skillId: DODGE } } },
    v5: { kind: 'test', context: { skillId: DODGE, ...context } }, v5State: { participants }, combatPrelude: {}, weaponSkillUnresolved: [], protectionContext: {} });
  const detail = pivot.test.options[0].result.details;
  assert.deepEqual(plan.actorModifiers.slModifiers.map(({ id, label, amount }) => ({ id, label, amount })), detail.modifiers);
  assert.deepEqual(plan.actorModifiers.advantageSources, pivot.test.advantage.advantage);
  assert.deepEqual(plan.actorModifiers.disadvantageSources, pivot.test.advantage.disadvantage);
  assert.equal(plan.actorModifiers.penalty, pivot.penalty);
});

test('CA5 Obstiné : un malus de sort reste affiché, barré, et ne compte plus', () => {
  const plan = preview(duel({ actor: { states: [STUNNED], talents: ['talent-strong-minded'], spells: [spellLayer('s', { Esquive: -1 })] } }),
    { actorRoll: 21, opponentRoll: 50, context: { preRollTalent: 'strong-minded' } });
  // Comme au Test principal : la pénalité d'État n'est pas posée du tout (T0), le malus du sort est ramené à 0.
  assert.deepEqual(ids(plan.actorModifiers.slModifiers), [['spell-skill:Esquive', 0]]);
  assert.equal(plan.actorSl, 1);
  assert.deepEqual(plan.actorModifiers.rows.map(row => [row.source, row.amount, row.dropped ?? false, row.rule ?? null]), [['Sort ou prière', -1, true, 'Obstiné']]);
});

test('Acrobaties : la compétence du catalogue « Représentation (Acrobatie) » donne le score et vise les sorts de ce nom', () => {
  const plan = preview(duel({ actor: { skills: [{ name: 'Représentation (Acrobatie)', total: 60 }], spells: [spellLayer('s', { 'Représentation (Acrobatie)': 1 })] } }),
    { skill: 'acrobaties', actorRoll: 21, opponentRoll: 50 });
  assert.equal(plan.actorScore, 60);
  assert.deepEqual(ids(plan.actorModifiers.slModifiers), [['spell-skill:Représentation (Acrobatie)', 1]]);
  assert.equal(plan.actorSl, 6 - 2 + 1);
});
