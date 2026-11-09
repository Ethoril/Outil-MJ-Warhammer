// Q6 · T3 (docs/specs/tests-secondaires-agregateur/) : magie secondaire de premier niveau par le calcul commun.
// - lancer, Focalisation et pause : la difficulté et la pénalité d'armure entrent dans les plafonds (Obstiné, V5 p. 127), comme à la
//   Dissipation (reste de T1) ;
// - interruption de Focalisation (Calme Difficile) : Avantages et Désavantages communs, Obstiné sur le −2 DR ;
// - méditation (Prière), relance Cadai de Corruption (Calme) et Test de Dextérité des Arcanes impitoyables : États, couches,
//   talents et séquelles du calcul commun ; Inconscient bloque (CA14).
import test from 'node:test';
import assert from 'node:assert/strict';
import { previewCasting } from '../../../js/core/v5-magic-casting.js';
import { previewChannelling } from '../../../js/core/v5-magic-channelling.js';
import { previewMagicMeditation } from '../../../js/core/v5-magic-talents.js';
import { previewCadaiCorruptionReroll } from '../../../js/core/v5-magic-high.js';
import { previewArcaneUnforgiving } from '../../../js/core/v5-magic-arcane-unforgiving.js';
import { getSpellContract } from '../../../js/core/v5-spell-contracts.js';

const STUNNED = { key: 'sonne', name: 'Sonné', level: 1 };
const UNCONSCIOUS = { key: 'inconscient', name: 'Inconscient', level: 1 };
const STRONG = { preRollTalent: 'strong-minded' };
const FM_FRACTURE = { sequelaEffects: { rows: [{ id: 'sq-fm', type: 'disadvantage-carac', carac: ['FM'], count: 1, label: 'Fracture au crâne' }] } };
const talent = (id, rank = 1) => ({ id: 'talent-' + id, status: 'resolved', rank });
const wizard = ({ states = [], talents = [], v5 = {}, extra = {} } = {}) => ({
  id: 'mage', name: 'mage', kind: 'PJ', camp: 'pj', zone: 'active', hp: 30, maxHp: 30, size: 'average',
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }, { name: 'Focalisation (Haute Magie)', total: 60 },
    { name: 'Calme', total: 50 }, { name: 'Prière', total: 50 }],
  talents, states, equipment: [], traits: [], armor: {},
  extensions: { v5: { hasMomentum: false, channelling: { type: 'winds', sl: 6 }, cadaiRunes: { deployed: 3, max: 5 }, ...v5 } }, ...extra });
const armoured = options => wizard({ ...options, extra: { wornArmorLocations: { body: 2 } } });
const amounts = preview => Object.fromEntries((preview.slModifiers || preview.test.details.modifiers).map(row => [row.id, row.amount]));

test('lancer : Obstiné ramène à 0 la difficulté et la pénalité d’armure', () => {
  const spell = getSpellContract('Carreau');
  const witness = previewCasting(armoured(), spell, { roll: 25, slModifier: -2 });
  assert.deepEqual([amounts(witness).difficulty, amounts(witness).armor], [-2, -2]);
  const strong = previewCasting(armoured({ talents: [talent('strong-minded')] }), spell, { roll: 25, slModifier: -2, conditionContext: STRONG });
  assert.deepEqual([amounts(strong).difficulty, amounts(strong).armor], [0, 0]);
  assert.equal(strong.armorPenalty, -2, 'la pénalité d’armure calculée reste affichée');
  assert.equal(strong.test.sl, witness.test.sl + 4);
});

test('Focalisation : Obstiné ramène à 0 la difficulté et la pénalité d’armure', () => {
  const witness = previewChannelling(armoured(), { type: 'winds', roll: 25, slModifier: -1 });
  assert.deepEqual([amounts(witness).difficulty, amounts(witness).armor], [-1, -2]);
  const strong = previewChannelling(armoured({ talents: [talent('strong-minded')] }), { type: 'winds', roll: 25, slModifier: -1, conditionContext: STRONG });
  assert.deepEqual([amounts(strong).difficulty, amounts(strong).armor], [0, 0]);
});

test('pause de Focalisation : Obstiné ramène l’armure à 0, l’Accessible +2 reste', () => {
  const strong = previewChannelling(armoured({ talents: [talent('strong-minded')] }), { mode: 'pause', roll: 25, conditionContext: STRONG });
  assert.deepEqual([amounts(strong).armor, amounts(strong)['pause-difficulty']], [0, 2]);
});

test('interruption de Focalisation : Désavantage commun (séquelle) compté', () => {
  const witness = previewChannelling(wizard(), { mode: 'interruption', roll: 23, lossRoll: 1, miscastRoll: 50 });
  const hurt = previewChannelling(wizard({ v5: FM_FRACTURE }), { mode: 'interruption', roll: 23, lossRoll: 1, miscastRoll: 50 });
  assert.equal(witness.test.roll, 23);
  assert.equal(hurt.test.roll, 32, 'le Désavantage inverse 23 en 32');
  assert.deepEqual(hurt.test.advantage.disadvantage.map(row => row.label), ['Fracture au corps']);
});

test('interruption de Focalisation : Obstiné ramène le Difficile (−2 DR) à 0', () => {
  const witness = previewChannelling(wizard(), { mode: 'interruption', roll: 23 });
  const strong = previewChannelling(wizard({ talents: [talent('strong-minded')] }), { mode: 'interruption', roll: 23, conditionContext: STRONG });
  assert.equal(amounts(strong)['interruption-difficulty'], 0);
  assert.equal(strong.test.sl, witness.test.sl + 2);
});

test('méditation : Sonné pèse sur le Test de Prière, Inconscient le bloque', () => {
  const input = { talentId: 'talent-cadai-meditation', minutes: 60, roll: 25 };
  const witness = previewMagicMeditation(wizard({ talents: [talent('cadai-meditation')] }), input);
  const stunned = previewMagicMeditation(wizard({ talents: [talent('cadai-meditation')], states: [STUNNED] }), input);
  assert.equal(stunned.test.sl, witness.test.sl - 1);
  assert.ok(stunned.test.details.modifiers.some(row => row.id === 'conditions' && row.amount === -1), 'détail : pénalité d’État');
  const out = previewMagicMeditation(wizard({ talents: [talent('cadai-meditation')], states: [UNCONSCIOUS] }), input);
  assert.equal(out.ready, false);
  assert.match(out.error, /Inconscient/);
});

test('relance Cadai de Corruption : Sonné compté, Obstiné annule l’exposition', () => {
  const input = { accessible: true, firstRoll: 85, reroll: 25, castExecutionId: 'high-cast', spell: getSpellContract('Main de Gloire'), slModifier: -1 };
  const witness = previewCadaiCorruptionReroll(wizard(), input);
  const stunned = previewCadaiCorruptionReroll(wizard({ states: [STUNNED] }), input);
  assert.equal(stunned.test.sl, witness.test.sl - 1);
  const strong = previewCadaiCorruptionReroll(wizard({ talents: [talent('strong-minded')], states: [STUNNED] }), { ...input, conditionContext: STRONG });
  assert.equal(strong.test.sl, witness.test.sl + 1, 'exposition −1 et Sonné −1 ramenés à 0');
  assert.equal(strong.slModifier, -1, 'modificateur saisi conservé dans le reçu');
  assert.equal(previewCadaiCorruptionReroll(wizard({ states: [UNCONSCIOUS] }), input).ready, false);
});

test('Arcanes impitoyables : Sonné pèse sur le Test de Dextérité du choix de l’objet', () => {
  const target = { id: 'cible', name: 'Cible', caracs: { E: 30 }, equipment: [], armor: {} };
  const facts = { magicItemPresent: true, focalisationRoll: 25, dexterityRoll: 34, chosenMagicItem: 'Épée', randomMagicItem: 'Anneau', armorDamageLocations: [] };
  const declared = { armorPoints: 0, enhancedDamage: false, chooseMagicItem: true };
  const witness = previewArcaneUnforgiving(wizard({ v5: { channelling: { type: 'high', sl: 6 } } }), target, declared, facts);
  const stunned = previewArcaneUnforgiving(wizard({ states: [STUNNED], v5: { channelling: { type: 'high', sl: 6 } } }), target, declared, facts);
  assert.equal(witness.ready, true, witness.error);
  assert.equal(stunned.dexterityTest.sl, witness.dexterityTest.sl - 1);
});

test('pause de Focalisation : un Désavantage commun impose l’option inversée sans erreur', () => {
  const hurt = previewChannelling(wizard({ v5: FM_FRACTURE }), { mode: 'pause', roll: 12 });
  assert.equal(hurt.test.roll, 21, 'le Désavantage inverse 12 en 21');
});
