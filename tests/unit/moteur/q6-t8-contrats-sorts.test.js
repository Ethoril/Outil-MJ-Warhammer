// Q6 · T8 (docs/specs/tests-secondaires-agregateur/) : les Tests exigés par les contrats de sorts (v5-spell-contracts.js :
// options, oppositions, Souffle, résistances, Cor, Calme, Frénésie, purification, suffocation) passent par le calcul commun du
// combat (resolveV5TestModifiers), des deux côtés pour les oppositions (CA1, CA3, CA8, CA9, CA14).
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { encounter } from '../../helpers/lot3-domain-fixture.js';
import { input } from '../../helpers/lot3-wom-fixture.js';
import { getAllSpellContracts } from '../../../js/core/v5-spell-contracts.js';
import { previewV5Test, selectV5Test } from '../../../js/core/v5-roll.js';
import { resolveV5TestModifiers } from '../../../js/core/v5-test-modifiers.js';

const contract = name => getAllSpellContracts().find(c => c.name === name);
const tired = [{ name: 'Exténué', level: 1 }];
const STATE_ROW = 'Plus forte pénalité d’État −1 DR';

/** Aperçu d'un sort par le Store, États posés sur le lanceur (`mage`) et/ou la cible (`foe`). */
async function cast(name, patch = {}, { mage = {}, foe = {} } = {}) {
  const { store } = await encounter({ mage, foe });
  const base = input(name);
  const answer = { ...base, ...patch, domainFacts: { ...base.domainFacts, ...(patch.domainFacts || {}) }, targetTests: { ...base.targetTests, ...(patch.targetTests || {}) } };
  return store.previewSpellExecution(contract(name).id, answer);
}
const receipt = (preview, id = 'foe') => preview.targetResults.find(row => row.targetId === id);

describe('Q6 · T8 : Tests des contrats de sorts par le calcul commun', () => {
  const disrupt = { domainFacts: { opposedActorRoll: 25 }, targetTests: { foe: { opponentRoll: 40 } } };

  test('CA9 : sans État ni effet, l’opposition donne le même résultat qu’avant, sans détail ajouté', async () => {
    const p = await cast('Perturber la magie', disrupt);
    assert.equal(p.ready, true, p.error);
    const row = receipt(p), plain = (score, roll) => selectV5Test(previewV5Test({ score, roll }), 'keep');
    assert.deepEqual(row.opposedTest.casterTest, plain(60, 25));
    assert.deepEqual(row.opposedTest.targetTest, plain(60, 40));
    assert.equal(row.testDetails, undefined);
  });

  test('CA3 : opposition lanceur/cible (Perturber la magie), États des deux côtés, détail par source', async () => {
    const p = await cast('Perturber la magie', disrupt, { mage: { states: tired }, foe: { states: [{ name: 'Exténué', level: 2 }] } });
    assert.equal(p.ready, true, p.error);
    const row = receipt(p);
    assert.deepEqual([row.opposedTest.casterTest.sl, row.opposedTest.targetTest.sl], [3, 0]);
    assert.deepEqual(row.testDetails.opposedCaster, [STATE_ROW]);
    assert.deepEqual(row.testDetails.opposedTarget, ['Plus forte pénalité d’État −2 DR']);
  });

  test('CA1 : la cible voit les modificateurs exacts du calcul commun (même compétence, même situation)', async () => {
    const states = [{ name: 'Exténué', level: 2 }, { name: 'Sonné', level: 1 }];
    const clean = receipt(await cast('Perturber la magie', disrupt)).opposedTest.targetTest.sl;
    const p = await cast('Perturber la magie', disrupt, { foe: { states } });
    const common = resolveV5TestModifiers({ caracs: { FM: 60 }, states }, { characteristic: 'FM', skill: 'Force Mentale', skillCharacteristic: 'FM' }, {});
    assert.equal(receipt(p).opposedTest.targetTest.sl - clean, common.slModifiers.reduce((sum, row) => sum + row.amount, 0));
  });

  test('CA3 : « Mork te veut ! » — la puissance au score fixe n’est pas un participant, la cible l’est', async () => {
    const patch = { domainFacts: { opposedActorRoll: 25 } };
    const clean = receipt(await cast('Mork te veut !', patch)).opposedTest;
    const p = await cast('Mork te veut !', patch, { mage: { states: tired }, foe: { states: tired } });
    assert.equal(p.ready, true, p.error);
    assert.equal(receipt(p).opposedTest.casterTest.sl, clean.casterTest.sl, 'score 80 du contrat : ni États ni couches');
    assert.equal(receipt(p).opposedTest.targetTest.sl, clean.targetTest.sl - 1);
  });

  test('CA3 : Souffle (V5 p. 243), Test de CT du lanceur et Esquive de la cible', async () => {
    const patch = { chosenLore: 'metal', ctRoll: 25, targetTests: { foe: { distance: 5, dodgeRoll: 30 } } };
    const clean = receipt(await cast('Souffle', patch)).breath;
    const row = receipt(await cast('Souffle', patch, { mage: { states: tired }, foe: { states: tired } }));
    assert.deepEqual([row.breath.shot.sl, row.breath.defended.sl], [clean.shot.sl - 1, clean.defended.sl - 1]);
    assert.ok(row.testDetails.breathShot.includes(STATE_ROW));
    assert.deepEqual(row.testDetails.breathDodge, [STATE_ROW]);
  });

  test('Souffle : un lanceur Aveuglé ne peut pas faire le Test de CT (même règle qu’un tir au combat)', async () => {
    const p = await cast('Souffle', { chosenLore: 'metal', ctRoll: 25, targetTests: { foe: { distance: 5, dodgeRoll: 30 } } }, { mage: { states: ['Aveuglé'] } });
    assert.equal(p.ready, false);
    assert.equal(p.status, 'test-blocked');
    assert.match(p.error, /Aveuglé/);
  });

  const taste = { targetTests: { foe: { roll: 95, despairRoll: 30 } } };
  test('Résistance et Test suivant (Goût de la Mort, WoM p. 125) par le calcul commun', async () => {
    const clean = receipt(await cast('Goût de la Mort', taste));
    const row = receipt(await cast('Goût de la Mort', taste, { foe: { states: tired } }));
    assert.equal(row.resistanceTest.targetSl, clean.resistanceTest.targetSl - 1);
    assert.equal(row.followupTest.sl, clean.followupTest.sl - 1);
    assert.deepEqual(row.testDetails.resistance, [STATE_ROW]);
  });

  test('CA8 : une précision d’État bloque la résistance jusqu’à la réponse du MJ', async () => {
    const foe = { states: ['Brisé'] };
    const pending = await cast('Goût de la Mort', taste, { foe });
    assert.equal(pending.ready, false);
    assert.equal(pending.status, 'condition-input-required');
    assert.deepEqual(pending.needsInput.map(row => row.field), ['runningOrHiding']);
    const answered = await cast('Goût de la Mort', { targetTests: { foe: { ...taste.targetTests.foe, conditionContext: { runningOrHiding: false } } } }, { foe });
    assert.equal(answered.ready, true, answered.error);
  });

  test('CA14 : une cible Inconsciente ne fait pas le Test de résistance, l’outil dit pourquoi', async () => {
    const p = await cast('Goût de la Mort', taste, { foe: { states: ['Inconscient'] } });
    assert.equal(p.ready, false);
    assert.equal(p.status, 'test-blocked');
    assert.match(p.error, /Inconscient/);
  });

  test('Cor d’Andar (WoM p. 111) : Peur (1) immédiate, −2 DR du Cor plus les États', async () => {
    const patch = { targetIds: ['mage', 'foe'] };
    const clean = receipt(await cast('Cor du Andar', patch)).fearTest;
    const row = receipt(await cast('Cor du Andar', patch, { foe: { states: tired } }));
    assert.equal(row.fearTest.sl, clean.sl - 1);
    assert.deepEqual(row.testDetails.fear, ['horn-morale −2 DR', STATE_ROW]);
  });

  test('Calme (WoM p. 80) : Test de Sociabilité du lanceur', async () => {
    const clean = receipt(await cast('Calme', { fellowshipRoll: 25 })).calmTest;
    const row = receipt(await cast('Calme', { fellowshipRoll: 25 }, { mage: { states: tired } }));
    assert.equal(row.calmTest.sl, clean.sl - 1);
  });

  test('Purification du Corps (WoM p. 82) : Test de Résistance du lanceur', async () => {
    const patch = { enduranceRoll: 25, domainFacts: { affliction: 'poison', afflictionName: 'Poison' } };
    assert.equal(receipt(await cast('Purification du Corps (Ghyran & Hysh)', patch)).testDetails, undefined);
    const row = receipt(await cast('Purification du Corps (Ghyran & Hysh)', patch, { mage: { states: tired } }));
    assert.deepEqual(row.testDetails.purify, [STATE_ROW]);
  });

  test('Destin de Bjuna (WoM p. 123) : FM contre la suffocation d’une option', async () => {
    const patch = { sl: 14, overcastSpecific: { suffocate: 1 }, domainFacts: { optionTargets_suffocate: ['foe'] }, targetTests: { foe: { roll: 95, optionResistanceRoll: 30 } } };
    const clean = receipt(await cast('Destin de Bjuna', patch)).optionResistanceTest;
    const row = receipt(await cast('Destin de Bjuna', patch, { foe: { states: tired } }));
    assert.equal(row.optionResistanceTest.sl, clean.sl - 1);
  });

  test('Cœurs Enflammés (V5 p. 248) : Frénésie sur les États restants, questions comprises', async () => {
    const patch = { targetIds: ['mage'], targetTests: { mage: { takeFrenzy: true, frenzyRoll: 30 } } };
    const clean = receipt(await cast('Cœurs Enflammés', patch), 'mage').optionalTest;
    // Exténué (comme Brisé) est ôté par le sort avant le Test ; Sonné reste.
    const removed = receipt(await cast('Cœurs Enflammés', patch, { mage: { states: [{ name: 'Exténué', level: 3 }] } }), 'mage');
    assert.equal(removed.optionalTest.sl, clean.sl);
    const stunned = receipt(await cast('Cœurs Enflammés', patch, { mage: { states: [{ name: 'Sonné', level: 1 }] } }), 'mage');
    assert.equal(stunned.optionalTest.sl, clean.sl - 1);
    const blind = await cast('Cœurs Enflammés', patch, { mage: { states: ['Aveuglé'] } });
    assert.equal(blind.ready, false);
    assert.deepEqual(blind.needsInput.map(row => row.field), ['reliesOnSight']);
  });

  test('Option de sort (Drain de Magie, WoM p. 87) : Test d’Intelligence du lanceur', async () => {
    const run = async states => {
      const p = await cast('Drain de Magie', { sl: 14, overcastSpecific: { wide: 1 }, domainFacts: { optionRoll_wide: 30 } }, { mage: { states } });
      assert.equal(p.ready, true, p.error);
      return p.targetResults[0].actions.find(row => row.kind === 'option-tests').tests[0];
    };
    const clean = await run([]), option = await run(tired);
    assert.equal(option.test.sl, clean.test.sl - 1);
    assert.equal(clean.detail, undefined);
    assert.ok(option.detail.includes(STATE_ROW));
  });

  test('Défiance magique (DPG p. 80) : absente du calcul commun, gardée par le contrat et comptée une fois', async () => {
    const defiant = { talents: [{ id: 'talent-magic-defiance', status: 'resolved', rank: 1 }] };
    const common = resolveV5TestModifiers({ caracs: { FM: 60 }, states: [], ...defiant }, { characteristic: 'FM', skill: 'Calme' }, {});
    assert.equal(common.advantageSources.some(row => row.id === 'magic-defiance' || /Défiance/.test(row.label || '')), false);
    // Résistance de 1 avantage : le jet 95 peut être inversé en 59 (échec → réussite contre 60 − 1 d'Exténué).
    const reversed = await cast('Goût de la Mort', { targetTests: { foe: { roll: 95, despairRoll: 30, choice: 'reverse' } } }, { foe: { ...defiant, states: tired } });
    assert.equal(reversed.ready, true, reversed.error);
    assert.equal(receipt(reversed).resistanceTest.targetSl, 0);
  });
});
