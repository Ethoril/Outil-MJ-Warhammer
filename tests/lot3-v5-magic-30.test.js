import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
import {
  getChannellingReserve,
  setChannellingReserve,
  clearChannellingReserve,
  calculateMagicArmorPenalty,
  resolveChannellingSkill,
  lookupMiscast,
  previewChannelling,
  applyChannelling,
  previewChannellingPause,
  applyChannellingPause,
  previewChannellingInterruption,
  applyChannellingInterruption
} from '../js/core/v5-magic-channelling.js';
import {
  OVERCAST_TIERS,
  OVERCAST_BENEFITS,
  getOvercastBenefit,
  isOvercastAllowed,
  validateOvercastChoices,
  resolveCastingSkill,
  requiredReserveType,
  previewCasting,
  applyCasting
} from '../js/core/v5-magic-casting.js';

const memory = () => {
  let state;
  return {
    load: async () => state && structuredClone(state),
    saveAtomic: async ({ state: next }) => {
      state = structuredClone(next);
      return { ok: true };
    }
  };
};

function createWizardParticipant(overrides = {}) {
  return {
    id: 'wizard-1',
    name: 'Mage Synthétique',
    caracs: { Int: 54, FM: 52, E: 38 }, // BI = 5, BFM = 5, BE = 3
    skills: [
      { name: 'Focalisation', total: 60, advances: 8 },
      { name: 'Focalisation (Haute Magie)', total: 55, advances: 3 },
      { name: 'Langue (Magick)', total: 65, advances: 11 },
      { name: 'Résistance', total: 45, advances: 7 },
      { name: 'Calme', total: 60, advances: 8 }
    ],
    equipment: [],
    states: [],
    ...overrides
  };
}

// ============================================================================
// 1. COMPÉTENCES, RÉSERVES ET PÉNALITÉS D'ARMURE
// ============================================================================

test('Focalisation V5 — résolution des deux compétences distinctes (Huit Vents vs Haute Magie)', () => {
  const wizard = createWizardParticipant();

  const windsSkill = resolveChannellingSkill(wizard, { type: 'winds' });
  assert.equal(windsSkill.skillName, 'Focalisation');
  assert.equal(windsSkill.score, 60);
  assert.equal(windsSkill.bfm, 5);
  assert.equal(windsSkill.type, 'winds');

  const highSkill = resolveChannellingSkill(wizard, { type: 'high' });
  assert.equal(highSkill.skillName, 'Focalisation (Haute Magie)');
  assert.equal(highSkill.score, 55);
  assert.equal(highSkill.bfm, 5);
  assert.equal(highSkill.type, 'high');
});

test('Focalisation V5 — réserve typée unique et manipulation', () => {
  const wizard = createWizardParticipant();
  assert.deepEqual(getChannellingReserve(wizard), { type: null, sl: 0 });

  const withWinds = setChannellingReserve(wizard, { type: 'winds', sl: 7 });
  assert.deepEqual(getChannellingReserve(withWinds), { type: 'winds', sl: 7 });

  const cleared = clearChannellingReserve(withWinds);
  assert.deepEqual(getChannellingReserve(cleared), { type: null, sl: 0 });
});

test('Focalisation V5 — pénalité d’armure : max des PA portés, métal ignoré pour Chamon, cuir pour Ghur, sorts/naturel ignorés', () => {
  // Mage sans équipement (ou armure naturelle uniquement) -> 0 pénalité
  const unarmored = createWizardParticipant({
    armor: { head: 2, body: 2, arms: 0, legs: 0 } // naturel
  });
  assert.equal(calculateMagicArmorPenalty(unarmored).penalty, 0);

  // Mage avec pièces d'équipement portées :
  // Tête : 2 PA (métal, casque en fer)
  // Corps : 1 PA (cuir) + 2 PA (maille, métal) = 3 PA
  // Bras : 1 PA (cuir)
  // Jambes : 2 PA (plaques, métal)
  // + Robe scintillante (+2 PA magiques, layer 'bonus' sur le corps)
  const armored = createWizardParticipant({
    equipment: [
      { id: 'helm', kind: 'armour', name: 'Casque en fer', ap: 2, locations: ['head'], layer: 'rigid' },
      { id: 'cuirass-leather', kind: 'armour', name: 'Gilet de cuir', ap: 1, locations: ['body'], layer: 'leather' },
      { id: 'cuirass-mail', kind: 'armour', name: 'Cotte de mailles', ap: 2, locations: ['body'], layer: 'flexible' },
      { id: 'robe-spell', kind: 'armour', name: 'Robe scintillante', ap: 2, locations: ['body'], layer: 'bonus' },
      { id: 'vambraces', kind: 'armour', name: 'Brassards de cuir', ap: 1, locations: ['rightArm', 'leftArm'], layer: 'leather' },
      { id: 'greaves', kind: 'armour', name: 'Grèves de plaques', ap: 2, locations: ['rightLeg', 'leftLeg'], layer: 'rigid' }
    ]
  });

  // Vent neutre (ex: Aqshy ou aucun Vent spécifique) :
  // Corps = 1 (cuir) + 2 (maille) = 3 PA (Robe bonus ignorée). Max sur le corps = 3 PA -> pénalité −3 DR.
  const penaltyGeneral = calculateMagicArmorPenalty(armored);
  assert.equal(penaltyGeneral.penalty, -3);
  assert.equal(penaltyGeneral.maxAp, 3);
  assert.equal(penaltyGeneral.maxLocation, 'body');

  // Vent de Chamon (Métal) : le métal est ignoré !
  // Tête (métal) : 0 PA
  // Corps (maille ignorée, bonus ignoré) : 1 PA (cuir)
  // Bras (cuir) : 1 PA
  // Jambes (métal) : 0 PA
  // Max PA = 1 -> pénalité −1 DR.
  const penaltyChamon = calculateMagicArmorPenalty(armored, { wind: 'chamon' });
  assert.equal(penaltyChamon.penalty, -1);
  assert.equal(penaltyChamon.maxAp, 1);

  // Vent de Ghur (Bêtes / Cuir) : le cuir est ignoré !
  // Tête (métal) : 2 PA
  // Corps (cuir ignoré, maille comptée) : 2 PA
  // Bras (cuir ignoré) : 0 PA
  // Jambes (métal) : 2 PA
  // Max PA = 2 -> pénalité −2 DR.
  const penaltyGhur = calculateMagicArmorPenalty(armored, { wind: 'ghur' });
  assert.equal(penaltyGhur.penalty, -2);
  assert.equal(penaltyGhur.maxAp, 2);
});

// ============================================================================
// 2. GAIN, CUMUL, CRITIQUE, CHANGEMENT DE TYPE ET MALADRESSE DE FOCALISATION
// ============================================================================

test('Focalisation V5 — BFM 5 : réussite 2 DR -> 7 ; critique 5 DR -> 15 ; cumul -> 22', () => {
  const wizard = createWizardParticipant(); // BFM = 5, score = 60

  // 1. Réussite standard à 2 DR :
  // Roll 40 sur score 60 -> DR = 6 - 4 = 2.
  // Gain = DR + BFM = 2 + 5 = 7 DR.
  const p1 = previewChannelling(wizard, { roll: 40 });
  assert.equal(p1.success, true);
  assert.equal(p1.sl, 2);
  assert.equal(p1.critical, false);
  assert.equal(p1.gain, 7);
  assert.equal(p1.newReserve.sl, 7);
  assert.equal(p1.newReserve.type, 'winds');

  // Application
  const stateAfter1 = applyChannelling(wizard, p1).participant;
  assert.deepEqual(getChannellingReserve(stateAfter1), { type: 'winds', sl: 7 });

  // 2. Critique à 5 DR :
  // Roll 11 sur score 60 -> double réussi !
  // DR = Math.max(5, 6 - 1) = 5 DR. Double = critique.
  // Gain critique = DR + 2 × BFM = 5 + 2 × 5 = 15 DR ! (pas d'incident magique)
  const p2 = previewChannelling(stateAfter1, { roll: 11 });
  assert.equal(p2.success, true);
  assert.equal(p2.sl, 5);
  assert.equal(p2.critical, true);
  assert.equal(p2.gain, 15);
  assert.equal(p2.miscast, null, 'Le critique de focalisation ne produit aucun incident');
  assert.equal(p2.startingReserve, 7);
  assert.equal(p2.newReserve.sl, 22); // 7 + 15 = 22 cumulé !

  // Application
  const stateAfter2 = applyChannelling(stateAfter1, p2).participant;
  assert.deepEqual(getChannellingReserve(stateAfter2), { type: 'winds', sl: 22 });
});

test('Focalisation V5 — changement de type efface la réserve précédente avant réussite, aperçu ne l’efface pas', () => {
  const wizard = createWizardParticipant();
  // Réserve initiale de 22 DR en 'winds'
  const stateWithWinds = setChannellingReserve(wizard, { type: 'winds', sl: 22 });

  // 1. Preview de focalisation 'high' (Haute Magie) :
  // L'aperçu doit être déterministe et NE PAS muter l'état source.
  const previewHigh = previewChannelling(stateWithWinds, { type: 'high', roll: 40 }); // roll 40 sur score 55 -> 5 - 4 = 1 DR
  assert.equal(previewHigh.typeChanged, true);
  assert.equal(previewHigh.startingReserve, 0, 'La réserve précédente repart de 0 pour la nouvelle action');
  assert.equal(previewHigh.gain, 6, '1 DR + 5 BFM = 6 DR');
  assert.equal(previewHigh.newReserve.sl, 6);
  assert.equal(previewHigh.newReserve.type, 'high');

  // L'état source a toujours ses 22 DR en 'winds' intacts !
  assert.deepEqual(getChannellingReserve(stateWithWinds), { type: 'winds', sl: 22 });

  // 2. Application effective : la réserve 'winds' est effacée et remplacée par la réserve 'high' de 6 DR
  const stateAfterApply = applyChannelling(stateWithWinds, previewHigh).participant;
  assert.deepEqual(getChannellingReserve(stateAfterApply), { type: 'high', sl: 6 });
});

test('Focalisation V5 — maladresse : perte de 1d10 DR plafonnée, réserve 0 ne descend pas sous 0, incident +10/DR perdu', () => {
  const wizard = createWizardParticipant(); // score = 60

  // Cas 1 : Réserve 0, maladresse (roll 77 sur score 60 -> échec double)
  // Jet de perte de 7 DR sur le 1d10.
  // La réserve étant à 0, la perte réelle est plafonnée à 0 DR.
  // Modificateur d'incident = +10 × 0 = +0. La réserve reste 0.
  const previewZero = previewChannelling(wizard, { roll: 77, lossRoll: 7, miscastRoll: 25 });
  assert.equal(previewZero.fumble, true);
  assert.equal(previewZero.startingReserve, 0);
  assert.equal(previewZero.lossRoll, 7);
  assert.equal(previewZero.actualLoss, 0, 'Plafonné au stock réel');
  assert.equal(previewZero.newReserve.sl, 0);
  assert.ok(previewZero.miscast);
  assert.equal(previewZero.miscast.modifier, 0, 'Modificateur +0 car 0 DR perdu');
  assert.equal(previewZero.miscast.modifiedRoll, 25);

  // Cas 2 : Réserve 4 DR, perte tirée de 7 DR (perte supérieure au stock)
  // Perte réelle = 4 DR. Réserve tombe à 0 DR.
  // Modificateur d'incident = +10 × 4 = +40 !
  const wizardWith4 = setChannellingReserve(wizard, { type: 'winds', sl: 4 });
  const previewLossCap = previewChannelling(wizardWith4, { roll: 88, lossRoll: 7, miscastRoll: 32 });
  assert.equal(previewLossCap.fumble, true);
  assert.equal(previewLossCap.startingReserve, 4);
  assert.equal(previewLossCap.lossRoll, 7);
  assert.equal(previewLossCap.actualLoss, 4, 'Plafonné à 4 DR');
  assert.equal(previewLossCap.newReserve.sl, 0);
  assert.ok(previewLossCap.miscast);
  assert.equal(previewLossCap.miscast.modifier, 40, '+10 par DR réellement perdu (+40)');
  assert.equal(previewLossCap.miscast.modifiedRoll, 72); // 32 + 40 = 72

  // Cas 3 : Réserve 15 DR, perte tirée de 6 DR
  // Perte réelle = 6 DR. Nouvelle réserve = 15 - 6 = 9 DR.
  // Modificateur d'incident = +10 × 6 = +60 !
  const wizardWith15 = setChannellingReserve(wizard, { type: 'winds', sl: 15 });
  const previewPartial = previewChannelling(wizardWith15, { roll: 88, lossRoll: 6, miscastRoll: 30 });
  assert.equal(previewPartial.actualLoss, 6);
  assert.equal(previewPartial.newReserve.sl, 9);
  assert.equal(previewPartial.miscast.modifier, 60);
  assert.equal(previewPartial.miscast.modifiedRoll, 90);
});

test('Focalisation V5 — pause de focalisation : Résistance Accessible (+2 DR), échec vide la réserve', () => {
  const wizard = createWizardParticipant(); // Résistance score 45
  const withReserve = setChannellingReserve(wizard, { type: 'winds', sl: 10 });

  // Réussite au test de pause : roll 40 sur score 45 + 2 DR -> réussite
  const pauseSuccess = previewChannellingPause(withReserve, { roll: 40 });
  assert.equal(pauseSuccess.success, true);
  assert.equal(pauseSuccess.newReserve.sl, 10, 'La réserve est conservée');

  // Échec au test de pause : roll 70 sur score 45 + 2 DR -> DR = 4 - 7 + 2 = -1 -> échec !
  const pauseFailure = previewChannellingPause(withReserve, { roll: 70 });
  assert.equal(pauseFailure.success, false);
  assert.equal(pauseFailure.newReserve.sl, 0, 'La réserve est perdue');

  const afterFailure = applyChannellingPause(withReserve, pauseFailure).participant;
  assert.deepEqual(getChannellingReserve(afterFailure), { type: null, sl: 0 });
});

test('Focalisation V5 — interruption : Calme Difficile (−2 DR), échec = perte 1d10 plafonnée + incident Mineur', () => {
  const wizard = createWizardParticipant(); // Calme score 60
  const withReserve = setChannellingReserve(wizard, { type: 'winds', sl: 8 });

  // Réussite au test d'interruption : roll 30 sur score 60 − 2 DR -> DR = 6 - 3 - 2 = +1 -> réussite
  const intSuccess = previewChannellingInterruption(withReserve, { roll: 30 });
  assert.equal(intSuccess.success, true);
  assert.equal(intSuccess.newReserve.sl, 8);

  // Échec au test d'interruption : roll 65 sur score 60 − 2 DR -> DR = 6 - 6 - 2 = -2 -> échec !
  // lossRoll = 5 DR -> perte réelle = 5 DR. Nouvelle réserve = 8 - 5 = 3 DR.
  // Modificateur d'incident = +10 × 5 = +50.
  const intFailure = previewChannellingInterruption(withReserve, { roll: 65, lossRoll: 5, miscastRoll: 20, secondaryRolls: { duration: 3 } });
  assert.equal(intFailure.success, false);
  assert.equal(intFailure.actualLoss, 5);
  assert.equal(intFailure.newReserve.sl, 3);
  assert.ok(intFailure.miscast);
  assert.equal(intFailure.miscast.modifier, 50);
  assert.equal(intFailure.miscast.modifiedRoll, 70);

  const afterInt = applyChannellingInterruption(withReserve, intFailure).participant;
  assert.deepEqual(getChannellingReserve(afterInt), { type: 'winds', sl: 3 });
});

// ============================================================================
// 3. LANCEMENT (CASTING) : RÉSERVE, NI, CONSOMMATION ET CRITIQUES
// ============================================================================

test('Lancement V5 — réussite juste au NI avec réserve ajoutée au test', () => {
  const wizard = createWizardParticipant(); // Langue (Magick) score 65
  const withReserve = setChannellingReserve(wizard, { type: 'winds', sl: 5 });
  const spell = { name: 'Boule de Feu', cn: 7, wind: 'aqshy', type: 'winds' };

  // Roll 45 sur score 65 -> DR = 6 - 4 = +2 DR.
  // Total = Test DR (2) + Réserve (5) = 7 DR.
  // NI = 7 -> 7 >= 7 -> Succès juste au NI !
  // Excédent = 7 - 7 = 0.
  const preview = previewCasting(withReserve, spell, { roll: 45 });
  assert.equal(preview.testSuccess, true);
  assert.equal(preview.testSl, 2);
  assert.equal(preview.matchingReserve, 5);
  assert.equal(preview.totalCastingSl, 7);
  assert.equal(preview.spellSuccess, true);
  assert.equal(preview.surplus, 0);
  assert.equal(preview.availableOvercastSl, 0);
  assert.equal(preview.reserveConsumed, 5);

  // Vérifier que la réserve n'a pas été mutée dans le participant d'origine lors du preview
  assert.deepEqual(getChannellingReserve(withReserve), { type: 'winds', sl: 5 });

  // Application : la réserve passe à 0
  const afterApply = applyCasting(withReserve, preview).participant;
  assert.deepEqual(getChannellingReserve(afterApply), { type: null, sl: 0 });
});

test('Lancement V5 — échec du test malgré grande réserve : le test doit réussir (DR >= 0) !', () => {
  const wizard = createWizardParticipant(); // score 65
  const withReserve = setChannellingReserve(wizard, { type: 'winds', sl: 20 });
  const spell = { name: 'Éclair', cn: 4, wind: 'azyr', type: 'winds' };

  // Roll 75 sur score 65 -> DR = 6 - 7 = -1 DR (échec du test).
  // La règle stipule : "LE TEST DOIT RÉUSSIR (DR >= 0). La réserve ne sauve ni un échec ni une maladresse !"
  // Le total ne devient PAS -1 + 20 = 19. Le sort échoue, et la réserve est consommée !
  const preview = previewCasting(withReserve, spell, { roll: 75 });
  assert.equal(preview.testSuccess, false);
  assert.equal(preview.testSl, -1);
  assert.equal(preview.spellSuccess, false, 'Le sort échoue car le test a échoué');
  assert.equal(preview.totalCastingSl, -1, 'La réserve n’est pas ajoutée à un test raté');
  assert.equal(preview.reserveConsumed, 20);

  // Application : la réserve de 20 est perdue
  const afterApply = applyCasting(withReserve, preview).participant;
  assert.deepEqual(getChannellingReserve(afterApply), { type: null, sl: 0 });
});

test('Lancement V5 — maladresse au lancer : échec, perte de réserve et incident Mineur', () => {
  const wizard = createWizardParticipant(); // score 65
  const withReserve = setChannellingReserve(wizard, { type: 'winds', sl: 12 });
  const spell = { name: 'Mur de Flammes', cn: 6, wind: 'aqshy', type: 'winds' };

  // Roll 77 sur score 65 -> DR = 6 - 7 = -1 DR, double = Maladresse !
  const preview = previewCasting(withReserve, spell, { roll: 77, miscastRoll: 40, secondaryRolls: { distance: 40 } });
  assert.equal(preview.testSuccess, false);
  assert.equal(preview.fumble, true);
  assert.equal(preview.spellSuccess, false);
  assert.ok(preview.miscast, 'Incident Mineur déclenché sur maladresse de lancer');
  assert.equal(preview.miscast.table, 'MINOR');
  assert.equal(preview.miscast.initialRoll, 40);

  const afterApply = applyCasting(withReserve, preview).participant;
  assert.deepEqual(getChannellingReserve(afterApply), { type: null, sl: 0 });
});

test('Lancement V5 — double réussi : incident Mineur (sauf sorts mineurs) et choix d’effet critique', () => {
  const wizard = createWizardParticipant(); // score 65, BI = 5, BFM = 5 -> max overcast = 10
  const spell = { name: 'Lance de Feu', cn: 5, wind: 'aqshy', type: 'winds', hasDamage: true };

  // Roll 22 sur score 65 -> double réussi !
  // DR = Math.max(5, 6 - 2) = 5 DR (dramatique). Total = 5 >= 5 -> sort réussi.
  // 1. Choix 'total-power' : ajoute le chiffre des dizaines du jet (2) aux DR de surpuissance !
  const previewTotalPower = previewCasting(wizard, spell, {
    roll: 22,
    criticalChoice: 'total-power',
    miscastRoll: 15
  });
  assert.equal(previewTotalPower.critical, true);
  assert.equal(previewTotalPower.criticalChoice, 'total-power');
  assert.equal(previewTotalPower.spellSuccess, true);
  assert.equal(previewTotalPower.extraOvercastFromCritical, 2, 'Dizaines de 22 = 2');
  assert.equal(previewTotalPower.surplus, 0); // 5 - 5 = 0
  assert.equal(previewTotalPower.availableOvercastSl, 2); // 0 + 2 = 2
  assert.ok(previewTotalPower.miscast, 'Double réussi déclenche un incident Mineur');

  // 2. Choix 'unstoppable-force' : force irrésistible
  const previewForce = previewCasting(wizard, spell, {
    roll: 33, // dizaines 3, DR 5
    criticalChoice: 'unstoppable-force',
    miscastRoll: 20
  });
  assert.equal(previewForce.criticalChoice, 'unstoppable-force');
  assert.equal(previewForce.extraOvercastFromCritical, 0);
  assert.ok(previewForce.miscast);

  // 3. Exception des sorts mineurs : aucun incident ni choix critique sur double réussi
  const pettySpell = { name: 'Petite Flamme', cn: 0, type: 'petty', isPetty: true };
  const previewPetty = previewCasting(wizard, pettySpell, { roll: 22 });
  assert.equal(previewPetty.critical, true);
  assert.equal(previewPetty.miscast, null, 'Les sorts mineurs ne déclenchent aucun incident sur double réussi');
});

// ============================================================================
// 4. SURPUISSANCE (OVERCASTING) : PLAFOND BI+BFM, PALIERS ET RESTRICTIONS
// ============================================================================

test('Surpuissance V5 — répartition des coûts 1, 2, 3, 5, 8, 13, 18 et plafond BI + BFM', () => {
  const wizard = createWizardParticipant({ caracs: { Int: 50, FM: 50 } }); // BI = 5, BFM = 5 -> Max overcast spend = 10 DR
  const spell = {
    name: 'Météore',
    cn: 5,
    wind: 'azyr',
    type: 'winds',
    hasDamage: true,
    hasAoe: true,
    range: 'FM yards',
    duration: 'FM Rounds'
  };

  // Mage a une réserve de 15 DR.
  // Test avec roll 40 sur score 65 -> DR = 2.
  // Total = 2 + 15 = 17 DR. NI = 5.
  // Excédent = 17 - 5 = 12 DR disponibles.
  // Plafond maximum dépensable = BI (5) + BFM (5) = 10 DR.
  const withReserve = setChannellingReserve(wizard, { type: 'winds', sl: 15 });

  // Choix valide : 3 DR sur dégâts (+3 dégâts), 2 DR sur durée (durée ×2), 5 DR sur portée (portée ×3)
  // Total dépensé = 3 + 2 + 5 = 10 DR (exactement le plafond maximum !)
  const preview = previewCasting(withReserve, spell, {
    roll: 40,
    overcastChoices: {
      damage: 3,
      duration: 2,
      range: 5
    }
  });

  assert.equal(preview.spellSuccess, true);
  assert.equal(preview.totalCastingSl, 17);
  assert.equal(preview.surplus, 12);
  assert.equal(preview.availableOvercastSl, 12);
  assert.equal(preview.maxOvercastSpend, 10);
  assert.equal(preview.overcast.valid, true);
  assert.equal(preview.overcast.totalSpent, 10);
  assert.equal(preview.overcast.remainingSL, 2); // 12 - 10 = 2 DR non dépensés
  assert.equal(preview.overcast.benefits.damage.benefit, '+3 dégâts');
  assert.equal(preview.overcast.benefits.duration.benefit, 'durée ×2');
  assert.equal(preview.overcast.benefits.range.benefit, 'portée ×3');

  // Choix invalide : tentative de dépenser 13 DR alors que le plafond est 10 DR
  const previewExcess = previewCasting(withReserve, spell, {
    roll: 40,
    overcastChoices: {
      damage: 13
    }
  });
  assert.equal(previewExcess.overcast.valid, false);
  assert.match(previewExcess.overcast.errors[0], /supérieure au maximum autorisé/);
});

test('Surpuissance V5 — interdictions strictes : sorts mineurs, grimoires, Vous/Contact, Instantanée, sans zone/dégâts', () => {
  const wizard = createWizardParticipant();

  // 1. Sort mineur
  const petty = { name: 'Étincelle', cn: 0, isPetty: true, type: 'petty' };
  const checkPetty = validateOvercastChoices({ damage: 1 }, { availableSL: 5, maxSpend: 10, spell: petty });
  assert.equal(checkPetty.valid, false);
  assert.match(checkPetty.errors[0], /surpuissance est interdite/);

  // 2. Grimoire non mémorisé
  const grimoire = { name: 'Rituel Ancien', cn: 5, isGrimoire: true };
  const checkGrimoire = validateOvercastChoices({ damage: 1 }, { availableSL: 5, maxSpend: 10, spell: grimoire });
  assert.equal(checkGrimoire.valid, false);
  assert.match(checkGrimoire.errors[0], /surpuissance est interdite/);

  // 3. Portée Vous ou Contact
  const touchSpell = { name: 'Armure de Foi', cn: 3, range: 'Contact', duration: '1 Round' };
  const checkTouch = validateOvercastChoices({ range: 1 }, { availableSL: 5, maxSpend: 10, spell: touchSpell });
  assert.equal(checkTouch.valid, false);
  assert.match(checkTouch.errors[0], /portée Vous ou Contact/);

  // 4. Durée Instantanée
  const instantSpell = { name: 'Souffle de Vent', cn: 4, duration: 'Instantanée' };
  const checkInstant = validateOvercastChoices({ duration: 2 }, { availableSL: 5, maxSpend: 10, spell: instantSpell });
  assert.equal(checkInstant.valid, false);
  assert.match(checkInstant.errors[0], /durée Instantanée/);

  // 5. Sort sans zone d'effet
  const singleSpell = { name: 'Trait', cn: 3, target: '1 cible', hasAoe: false };
  const checkAoe = validateOvercastChoices({ aoe: 3 }, { availableSL: 5, maxSpend: 10, spell: singleSpell });
  assert.equal(checkAoe.valid, false);
  assert.match(checkAoe.errors[0], /sans zone d’effet/);

  // 6. Sort sans dégâts
  const utilitySpell = { name: 'Illusion', cn: 4, hasDamage: false };
  const checkDamage = validateOvercastChoices({ damage: 1 }, { availableSL: 5, maxSpend: 10, spell: utilitySpell });
  assert.equal(checkDamage.valid, false);
  assert.match(checkDamage.errors[0], /ne cause pas de dégâts/);
});

// ============================================================================
// 5. INTÉGRATION STORE ET ANNULATION (UNDO) ATOMIQUE
// ============================================================================

test('Store V5 — Focalisation, lancement et annulation (undo) restaurent exactement l’état des réserves', async () => {
  const persistence = memory();
  const store = createStore({ persistence });
  await store.ready;

  // Créer profil et rencontre
  const wizardProfile = {
    id: 'prof-wizard',
    name: 'Teclis Test',
    hp: 15,
    maxHp: 15,
    initiative: 45,
    caracs: { Int: 60, FM: 55, E: 40 },
    skills: [
      { name: 'Focalisation', total: 65, advances: 10 },
      { name: 'Langue (Magick)', total: 70, advances: 10 }
    ],
    armor: { head: 0, body: 0, arms: 0, legs: 0 }
  };
  await store.addProfile(wizardProfile);
  await store.saveEncounter({
    id: 'enc-magic',
    title: 'Combat Magique',
    entries: [{ id: 'enc:entry', profileId: 'prof-wizard', quantity: 1, zone: 'active' }]
  });
  await store.launchEncounter('enc-magic');
  const engine = createCombatEngine(store);
  await engine.start();

  const [wizard] = store.listParticipants();
  assert.deepEqual(getChannellingReserve(wizard), { type: null, sl: 0 });

  // 1. Exécuter une Focalisation via Store :
  // Jet 40 sur score 65 -> DR = 6 - 4 = +2. BFM = 5. Gain = 2 + 5 = 7 DR.
  const previewChann = store.previewChannelling({ actorId: wizard.id, roll: 40 });
  assert.equal(previewChann.gain, 7);

  // L'aperçu ne doit pas avoir modifié le participant dans le store
  const [wizardBeforeApply] = store.listParticipants();
  assert.deepEqual(getChannellingReserve(wizardBeforeApply), { type: null, sl: 0 });

  // Application
  await store.applyChannelling(previewChann, { actorId: wizard.id });
  const [wizardAfterChann] = store.listParticipants();
  assert.deepEqual(getChannellingReserve(wizardAfterChann), { type: 'winds', sl: 7 });

  // 2. Annulation (undo) : la réserve revient à 0 !
  assert.ok(store.canUndo());
  await store.undo();
  const [wizardAfterUndo] = store.listParticipants();
  assert.deepEqual(getChannellingReserve(wizardAfterUndo), { type: null, sl: 0 });

  // 3. Rétablir (redo) : la réserve de 7 DR revient !
  assert.ok(store.canRedo());
  await store.redo();
  const [wizardAfterRedo] = store.listParticipants();
  assert.deepEqual(getChannellingReserve(wizardAfterRedo), { type: 'winds', sl: 7 });

  // 4. Lancement de sort via Store consommant la réserve :
  // NI = 6. Test roll 50 sur score 70 -> DR = 7 - 5 = +2.
  // Total = 2 + 7 = 9 >= 6 -> Succès. Réserve consommée (repart à 0).
  const spell = { name: 'Éclair Mystique', cn: 6, wind: 'azyr', type: 'winds' };
  const previewCast = store.previewCasting(spell, { actorId: wizard.id, roll: 50 });
  assert.equal(previewCast.spellSuccess, true);
  assert.equal(previewCast.matchingReserve, 7);
  assert.equal(previewCast.totalCastingSl, 9);

  // L'aperçu n'a pas consommé la réserve
  const [wizardBeforeCast] = store.listParticipants();
  assert.deepEqual(getChannellingReserve(wizardBeforeCast), { type: 'winds', sl: 7 });

  // Application
  await store.applyCasting(previewCast, { actorId: wizard.id });
  const [wizardAfterCast] = store.listParticipants();
  assert.deepEqual(getChannellingReserve(wizardAfterCast), { type: null, sl: 0 });

  // 5. Annulation du lancement : la réserve de 7 DR est exactement restaurée !
  await store.undo();
  const [wizardAfterUndoCast] = store.listParticipants();
  assert.deepEqual(getChannellingReserve(wizardAfterUndoCast), { type: 'winds', sl: 7 });
});

// ============================================================================
// 6. CAS LIMITES : INCIDENTS > 100, ATTÉNUATIONS, MISMATCH ET SÉCURITÉ
// ============================================================================

test('Incidents V5 — débordement Mineur > 100 répercuté sur la table Majeure', () => {
  // 1. Débordement modéré vers la table Majeure : initialRoll = 80, modifier = +35 -> modified = 115
  // Overflow = 15. Jet Majeur = 80 + 15 = 95 -> Sort oublié (max 95)
  const miscast1 = lookupMiscast('MINOR', 80, 35, { majorRoll: 80 });
  assert.equal(miscast1.table, 'MAJOR');
  assert.equal(miscast1.overflow, 15);
  assert.equal(miscast1.modifiedRoll, 95);
  assert.equal(miscast1.name, 'Sort oublié');

  // 2. Débordement sévère atteignant 96+ (9007199254740991) :
  // initialRoll = 90, modifier = +40 -> modified = 130 -> overflow = 30 -> majorRoll = 120 -> Contre-réaction aethyrique
  const miscast2 = lookupMiscast('MINOR', 90, 40, { majorRoll: 90 });
  assert.equal(miscast2.table, 'MAJOR');
  assert.equal(miscast2.overflow, 30);
  assert.equal(miscast2.modifiedRoll, 120);
  assert.equal(miscast2.name, 'Contre-réaction aethyrique');
});

test('Lancement V5 — règle de table sans ingrédients, talent acquis et influence corruptrice', () => {
  const wizard = createWizardParticipant();
  const spell = { name: 'Boule de Feu', cn: 5, wind: 'aqshy', type: 'winds' };

  // 1. Ingrédient sur incident Mineur : annule complètement l'incident
  const withIngredient = previewCasting(wizard, spell, {
    roll: 77, // Maladresse
    miscastRoll: 70,
    ingredient: true
  });
  assert.equal(withIngredient.fumble, true);
  assert.equal(withIngredient.miscast.table,'MINOR');
  assert.equal(withIngredient.miscast.name,'Rupture');

  // 2. Influence corruptrice seule : convertit Mineur en Majeur
  const withCorruption = previewCasting(wizard, spell, {
    roll: 77,
    miscastRoll: 25,
    corruptingInfluence: true
  });
  assert.ok(withCorruption.miscast);
  assert.equal(withCorruption.miscast.table, 'MAJOR', 'L’influence corruptrice convertit Mineur en Majeur');
  assert.equal(withCorruption.miscast.name, 'Lévitation');

  // 3. Influence corruptrice + Ingrédient : Majeur rétrogradé en Mineur
  const withBoth = previewCasting(wizard, spell, {
    roll: 77,
    miscastRoll: 25,
    corruptingInfluence: true,
    ingredient: true
  });
  assert.ok(withBoth.miscast);
  assert.equal(withBoth.miscast.table, 'MAJOR', 'L’ancien ingrédient ne protège plus');
  assert.equal(withBoth.miscast.name, 'Lévitation');

  // 4. Diction instinctive : réduit de 20 le jet Mineur
  const withDiction = previewCasting({...wizard,talents:[{id:'talent-instinctive-diction',status:'resolved',rank:1}]}, spell, {
    roll: 77,
    miscastRoll: 35,
    instinctiveDiction: true
  });
  assert.ok(withDiction.miscast);
  assert.equal(withDiction.miscast.modifiedRoll, 15);
  assert.equal(withDiction.miscast.name, 'Distraction');

  // 5. Diction instinctive ramenant le jet sous 01 : annule l'incident
  const withDictionCancel = previewCasting({...wizard,talents:[{id:'talent-instinctive-diction',status:'resolved',rank:1}]}, spell, {
    roll: 77,
    miscastRoll: 15,
    instinctiveDiction: true
  });
  assert.equal(withDictionCancel.miscast, null, 'Un jet Mineur réduit sous 01 par diction instinctive est annulé');
});

test('Lancement V5 — mismatch de réserve : réserve Haute Magie ignorée pour sort des Vents', () => {
  const wizard = createWizardParticipant();
  // Mage a 10 DR en 'high'
  const withHighReserve = setChannellingReserve(wizard, { type: 'high', sl: 10 });
  const windSpell = { name: 'Éclair', cn: 5, wind: 'azyr', type: 'winds' };

  // Roll 45 sur score 65 -> DR = 2.
  // La réserve 'high' ne correspond pas au sort 'winds', matchingReserve = 0 !
  // Total = 2 + 0 = 2 < NI 5 -> sort raté !
  const preview = previewCasting(withHighReserve, windSpell, { roll: 45 });
  assert.equal(preview.matchingReserve, 0, 'La réserve Haute Magie ne s’ajoute pas à un sort des Vents');
  assert.equal(preview.totalCastingSl, 2);
  assert.equal(preview.spellSuccess, false);
  assert.equal(preview.reserveConsumed, 10, 'Toute tentative consomme la réserve existante');

  // Application : la réserve est vidée
  const after = applyCasting(withHighReserve, preview).participant;
  assert.deepEqual(getChannellingReserve(after), { type: null, sl: 0 });
});

test('Lancement V5 — lancement direct sans focalisation préalable (réserve 0)', () => {
  const wizard = createWizardParticipant(); // réserve 0
  const spell = { name: 'Petite Brise', cn: 2, wind: 'chamon', type: 'winds' };

  // Roll 40 sur score 65 -> DR = 6 - 4 = 2.
  // Total = 2 + 0 = 2 >= 2 -> succès direct !
  const preview = previewCasting(wizard, spell, { roll: 40 });
  assert.equal(preview.matchingReserve, 0);
  assert.equal(preview.totalCastingSl, 2);
  assert.equal(preview.spellSuccess, true);
  assert.equal(preview.surplus, 0);
  assert.equal(preview.reserveConsumed, 0);

  const after = applyCasting(wizard, preview).participant;
  assert.deepEqual(getChannellingReserve(after), { type: null, sl: 0 });
});

test('Surpuissance V5 — interdiction stricte avec memorized: false', () => {
  const spell = { name: 'Rituel Interdit', cn: 4, memorized: false };
  assert.equal(isOvercastAllowed(spell), false);
  const result = validateOvercastChoices({ damage: 1 }, { availableSL: 5, maxSpend: 10, spell });
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /surpuissance est interdite/);
});

test('Intégrité — prévisualisations sans jet retournent ready: false et les applications échouent', () => {
  const wizard = createWizardParticipant();
  const spell = { name: 'Sort Test', cn: 3, wind: 'aqshy', type: 'winds' };

  const channUnready = previewChannelling(wizard);
  assert.equal(channUnready.ready, false);
  assert.throws(() => applyChannelling(wizard, channUnready), /incomplet ou non prêt/);

  const castUnready = previewCasting(wizard, spell);
  assert.equal(castUnready.ready, false);
  assert.throws(() => applyCasting(wizard, castUnready), /incomplet ou non prêt/);
});
