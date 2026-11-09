// Q6 · T1 (docs/specs/tests-secondaires-agregateur/) : les contextes existants délèguent au calcul commun (`resolveV5TestModifiers`).
// - `prepareMagicOptions` (lancer, Focalisation, pause, Dissipation) : États, couches et talents génériques par le calcul commun ;
// - Dissipation : la clé `Dissipation` des couches est lue par le calcul commun (plus en brut dans v5-magic-dispel.js) ;
// - `resolveV5ConditionTestContext` : États par le calcul commun ; talents génériques ajoutés à la Prière et à la Résistance au Courroux.
// Fichier propre à T1 (vague parallèle) ; l'aide de comparaison au pivot est recopiée de tests-secondaires-agregateur.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import registry from '../../../js/data/v5-divine-contracts.json' with { type: 'json' };
import { buildCombatTest } from '../../../js/core/v5-combat-rules.js';
import { prepareMagicOptions } from '../../../js/core/v5-magic-talents.js';
import { previewDispelCasting, previewDispelPersistent } from '../../../js/core/v5-magic-dispel.js';
import { resolveV5ConditionTestContext } from '../../../js/core/v5-test-context.js';
import { resolveV5TestModifiers } from '../../../js/core/v5-test-modifiers.js';
import { previewDivineExecution } from '../../../js/core/v5-divine-engine.js';
import { getDivineContract } from '../../../js/core/v5-divine-store.js';
import { getReferenceCatalogue } from '../../../js/core/reference-catalog.js';

const TONGUE = 'skill-4c_61_6e_67_75_65-4d_61_67_69_63_6b';          // Langue (Magick), Int : lancer, Dissipation
const CHANNEL = 'skill-46_6f_63_61_6c_69_73_61_74_69_6f_6e-base';    // Focalisation, FM : Focalisation, pause
const CARAC = { int: 'Int', fm: 'FM', soc: 'Soc', e: 'E', f: 'F' };
const skillOf = id => getReferenceCatalogue().skills.find(row => row.id === id);

const spellLayer = (id, testModifiers, extra = {}) => ({ id, spellId: 'spell-' + id, spellName: id, casterId: 'caster-' + id, testModifiers, ...extra });
const prayerLayer = (id, testModifiers) => ({ id, type: 'test-modifier', testModifiers });
const mage = ({ states = [], talents = [], spells = [], prayers = [], specialStates, v5 = {} } = {}) => ({
  id: 'mage', name: 'mage', kind: 'PJ', camp: 'pj', zone: 'active', size: 'average', hp: 10, maxHp: 10,
  caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 48, Soc: 40, M: 4 },
  states, skills: [{ name: 'Langue (Magick)', total: 55 }], equipment: [], traits: [], armor: {},
  talents: talents.map(talentId => ({ id: talentId, rank: 1, status: 'resolved' })),
  extensions: { v5: { hasMomentum: false, spellEffects: spells, divineEffects: prayers, ...(specialStates ? { specialStates } : {}), ...v5 } } });
const STUNNED = { key: 'sonne', name: 'Sonné', level: 1 };
const PRONE = { key: 'aterre', name: 'À terre', level: 1 };

/** Test de compétence du plateau (pivot) : `buildCombatTest` sans arme, sans armure portée, sans familier. */
function pivotSkillTest(actor, { skillId, context = {} } = {}) {
  const skill = skillOf(skillId);
  return buildCombatTest({ actor, target: null, roll: 42,
    action: { type: 'test', label: skill.nom, attr: CARAC[skill.carac], base: 40, qualities: [], extensions: { fiche: { skillId } } },
    v5: { kind: 'test', context: { skillId, ...context } }, v5State: { participants: [actor] },
    combatPrelude: {}, weaponSkillUnresolved: [], protectionContext: {} });
}
/** Ligne de pénalité d'États : même montant, identifiant propre à chaque écran (`conditions` au combat). */
const sameId = row => ({ id: row.id === 'magic-condition-penalty' ? 'conditions' : row.id, amount: row.amount });
/** Les modificateurs d'un Test magique sont ceux du Test de compétence du plateau pour la même compétence (CA1). */
function assertLikePivot(prepared, actor, options) {
  const pivot = pivotSkillTest(actor, options);
  assert.deepEqual(prepared.slModifiers.map(sameId), pivot.test.options[0].result.details.modifiers.map(sameId), 'modificateurs de DR');
  assert.deepEqual(prepared.advantageSources, pivot.test.advantage.advantage, 'Avantages');
  assert.deepEqual(prepared.disadvantageSources, pivot.test.advantage.disadvantage, 'Désavantages');
  return pivot;
}

// ---- Lancer et Focalisation (F4) ----
test('T1 lancer : couche « Tests d’Intelligence » et prière « Tous les Tests » comptées, comme au Test de Langue (Magick) du plateau', () => {
  const actor = mage({ states: [STUNNED], spells: [spellLayer('s', { 'carac:int': 1 })], prayers: [prayerLayer('p', { 'Tous les Tests': 1 })] });
  const prepared = prepareMagicOptions(actor, 'casting', {});
  assert.deepEqual(prepared.slModifiers.map(row => [row.id, row.amount]),
    [['spell-skill:carac:int', 1], ['spell-skill:Tous les Tests', 1], ['magic-condition-penalty', -1]]);
  assertLikePivot(prepared, actor, { skillId: TONGUE });
});

test('T1 Focalisation : Esprit fort (V5 p. 127) annule pénalité d’État et couche négative, comme au pivot', () => {
  const actor = mage({ states: [STUNNED], talents: ['talent-strong-minded'], spells: [spellLayer('s', { Focalisation: -2 })] });
  const conditionContext = { preRollTalent: 'strong-minded' };
  const prepared = prepareMagicOptions(actor, 'channelling', { conditionContext });
  assert.deepEqual(prepared.slModifiers.map(row => [row.id, row.amount]), [['spell-skill:Focalisation', 0]]);
  assertLikePivot(prepared, actor, { skillId: CHANNEL, context: conditionContext });
});

test('T1 pause de Focalisation : Clarté d’esprit efface Sonné (Test de Force Mentale, donc mental), comme à la Focalisation', () => {
  const clear = mage({ states: [STUNNED], specialStates: { clarityOfThought: true } });
  assert.equal(prepareMagicOptions(clear, 'pause', {}).slModifiers.some(row => row.id === 'magic-condition-penalty'), false);
  assert.equal(prepareMagicOptions(clear, 'channelling', {}).slModifiers.some(row => row.id === 'magic-condition-penalty'), false);
});

test('T1 magie : Œil de la tempête rang 2, Exténué sans pénalité au lancer, gardée à la Dissipation', () => {
  const actor = mage({ states: [{ key: 'extenue', name: 'Exténué', level: 1 }], spells: [{ id: 'eye', spellId: 'talent-eye-of-the-storm', magicTalentId: 'talent-eye-of-the-storm', magicTalentRank: 2 }] });
  assert.equal(prepareMagicOptions(actor, 'casting', {}).slModifiers.some(row => row.id === 'magic-condition-penalty'), false);
  assert.equal(prepareMagicOptions(actor, 'dispel', {}).slModifiers.find(row => row.id === 'magic-condition-penalty')?.amount, -1);
});

test('T1 magie : précisions d’États et Désavantage, mêmes questions et même Désavantage qu’au pivot', () => {
  const actor = mage({ states: [PRONE, STUNNED] });
  assert.deepEqual(prepareMagicOptions(actor, 'casting', {}).conditionNeeds, ['Préciser si le Test implique un mouvement.']);
  const prepared = prepareMagicOptions(actor, 'casting', { conditionContext: { involvesMovement: true, conditionPenaltyMode: 'disadvantage' } });
  assertLikePivot(prepared, actor, { skillId: TONGUE, context: { involvesMovement: true, conditionPenaltyMode: 'disadvantage' } });
  assert.deepEqual(prepared.disadvantageSources.map(row => row.id), ['prone']);
});

test('T1 CA9 : sans État, talent ni effet, aucun modificateur pour chaque Test magique', () => {
  for (const kind of ['casting', 'channelling', 'pause', 'dispel', 'interruption']) {
    const prepared = prepareMagicOptions(mage(), kind, {});
    assert.deepEqual([prepared.slModifiers, prepared.advantageSources, prepared.disadvantageSources, prepared.conditionNeeds], [[], [], [], []], kind);
  }
});

// ---- Dissipation (F4) : clé `Dissipation` lue par le calcul commun ----
const CASTING = { testSl: 3, spell: { name: 'Sort', cn: 6 } };
const dispel = (actor, extra = {}) => previewDispelCasting(actor, CASTING, { round: 1, distance: 10, visible: true, roll: 25, ...extra });
const dispelRows = preview => preview.slModifiers.map(row => [row.id, row.amount]);

test('T1 Dissipation : clé `Dissipation` d’une couche lue par le calcul commun, même sans champ de Bouclier magique', () => {
  const preview = dispel(mage({ spells: [spellLayer('s', { Dissipation: 2 })], v5: { magicShieldBonusSl: 0 } }));
  assert.equal(preview.allowed, true, preview.reason);
  assert.deepEqual(dispelRows(preview), [['spell-skill:Dissipation', 2]]);
});

test('T1 Dissipation : deux sorts à clé `Dissipation`, meilleur bonus seul (V5 p. 235) ; variante du mode lue, l’autre non', () => {
  assert.deepEqual(dispelRows(dispel(mage({ spells: [spellLayer('a', { Dissipation: 2 }), spellLayer('b', { Dissipation: 3 })] }))), [['spell-skill:Dissipation', 3]]);
  const variants = mage({ spells: [spellLayer('v', { 'Dissipation (Incantation opposée)': 1, 'Dissipation (Sort persistant étendu)': 4 })] });
  assert.deepEqual(dispelRows(dispel(variants)), [['spell-skill:Dissipation (Incantation opposée)', 1]]);
});

test('T1 Dissipation : Bouclier magique compté une seule fois (couche à trois clés et champ magicShieldBonusSl)', () => {
  const keys = { Dissipation: 3, 'Dissipation (Langue Magick)': 3, 'Langue (Magick) (Dissipation)': 3 };
  const shielded = mage({ spells: [spellLayer('shield', keys, { magicShieldBonusSl: 3 })], v5: { magicShieldBonusSl: 3, testModifiers: keys } });
  assert.deepEqual(dispelRows(dispel(shielded)), [['spell-skill:Dissipation', 3]]);
  // Ancienne sauvegarde : le seul champ, sans clé lisible.
  assert.deepEqual(dispelRows(dispel(mage({ v5: { magicShieldBonusSl: 2 } }))), [['magic-shield', 2]]);
});

test('T1 Dissipation : couche de Langue (Magick) et État, comme au Test de Langue (Magick) du plateau', () => {
  const actor = mage({ states: [STUNNED], spells: [spellLayer('s', { 'Langue (Magick)': -1 })] });
  assert.deepEqual(dispelRows(dispel(actor)), [['spell-skill:Langue (Magick)', -1], ['magic-condition-penalty', -1]]);
});

test('T1 Dissipation persistante : variante « Sort persistant étendu » lue', () => {
  const actor = mage({ spells: [spellLayer('v', { 'Dissipation (Sort persistant étendu)': 2 })] });
  const effect = { id: 'eff', spellId: 'spell-x', spellName: 'X', casterId: 'autre', cn: 6, duration: 'persistent' };
  const preview = previewDispelPersistent(actor, effect, { round: 1, distance: 10, visible: true, roll: 25 });
  assert.ok(preview.slModifiers, JSON.stringify(preview).slice(0, 300));
  assert.deepEqual(dispelRows(preview), [['spell-skill:Dissipation (Sort persistant étendu)', 2]]);
});

// ---- Contexte de Test (États délégués) et Prière (F5) ----
test('T1 contexte de Test : pénalité et Désavantage égaux à ceux du calcul commun, alias anglais compris', () => {
  const cases = [
    [[STUNNED, { key: 'extenue', name: 'Exténué', level: 2 }], {}, 'F'],
    [[{ name: 'Prone', level: 1 }], { involvesMovement: true }, 'Ag'],
    [[{ name: 'Blinded', level: 2 }], { requiresSight: false, reliesOnSight: true }, 'I'],
    [[{ name: 'Stunned', level: 2 }], {}, 'FM']];
  for (const [states, answers, characteristic] of cases) {
    const actor = mage({ states: states.map(row => ({ ...row, key: row.key })) });
    const context = resolveV5ConditionTestContext(actor, { characteristic, isAction: false, ...answers });
    const canonical = mage({ states: states.map(row => { const key = { Prone: 'aterre', Blinded: 'aveugle', Stunned: 'sonne' }[row.name] || row.key; return { key, name: key, level: row.level }; }) });
    const common = resolveV5TestModifiers(canonical, { characteristic, kind: 'test' }, answers);
    assert.equal(Math.abs(context.slModifiers[0]?.amount ?? 0), common.penalty, JSON.stringify(states));
    assert.deepEqual(context.disadvantageSources.map(row => row.label), common.disadvantageSources.map(row => row.label), JSON.stringify(states));
  }
});

const PRAYER_BASE = { canSpeak: true, sourceFingerprint: registry.sourceFingerprint, round: 1, targetIds: ['priest'],
  facts: { targets: { priest: { withinRange: true } } }, roll: 23, expiry: { phase: 'endOfRound', round: 6 } };
const priest = ({ states = [], talents = [] } = {}) => ({ id: 'priest', name: 'priest', skills: [{ name: 'Prière', status: 'resolved', total: 50 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }, ...talents.map(id => ({ id, status: 'resolved', rank: 1 }))],
  caracs: { Soc: 60 }, states, extensions: { v5: { divine: { sin: 0 } } } });
const BATTLE = 'divine:blessing:myrmidia:battle';

test('T1 Prière : talent générique Esprit fort (V5 p. 127) déclaré par le MJ, pénalité de Sonné annulée', () => {
  const actor = priest({ states: [STUNNED], talents: ['talent-strong-minded'] });
  const witness = previewDivineExecution(actor, getDivineContract(BATTLE), [actor], PRAYER_BASE);
  assert.equal(witness.ready, true, witness.error);
  assert.deepEqual(witness.preview.slModifiers.map(row => row.amount), [-1], 'témoin : sans déclaration, Sonné pénalise');
  const declared = previewDivineExecution(actor, getDivineContract(BATTLE), [actor], { ...PRAYER_BASE, conditionContext: { preRollTalent: 'strong-minded' } });
  assert.equal(declared.ready, true, declared.error);
  assert.deepEqual(declared.preview.slModifiers.map(row => row.amount), [0]);
  assert.equal(declared.preview.conditionTestContext.slModifiers[0].amount, -1, 'le contexte des États rendu n’est pas modifié');
});

test('T1 Prière CA9 : sans État ni talent, aucun modificateur', () => {
  const actor = priest();
  const preview = previewDivineExecution(actor, getDivineContract(BATTLE), [actor], PRAYER_BASE);
  assert.equal(preview.ready, true, preview.error);
  assert.deepEqual(preview.preview.slModifiers, []);
});

// ---- Retours du verifier ----
test('T1 Dissipation : Esprit fort plafonne la liste complète, difficulté saisie comprise', () => {
  const actor = mage({ states: [STUNNED], talents: ['talent-strong-minded'] });
  const preview = dispel(actor, { slModifier: -2, conditionContext: { preRollTalent: 'strong-minded' } });
  assert.deepEqual(dispelRows(preview), [['difficulty', 0]]);
});

test('T1 magie : les lignes fournies par l’appelant ne sont pas modifiées par les plafonds', () => {
  const own = [{ id: 'situation', label: 'Situation', amount: -2 }];
  const prepared = prepareMagicOptions(mage({ talents: ['talent-strong-minded'] }), 'channelling', { slModifiers: own, conditionContext: { preRollTalent: 'strong-minded' } });
  assert.equal(prepared.slModifiers.find(row => row.id === 'situation').amount, 0);
  assert.equal(own[0].amount, -2);
});
