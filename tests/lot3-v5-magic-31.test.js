import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import {
  resolveMiscast,
  previewMiscast,
  applyMiscast,
  lookupMiscastEntry
} from '../js/core/v5-magic-miscasts.js';
import {
  calculateBurnoutRisk,
  isD100Double,
  getBurnoutStatus,
  previewBurnout,
  applyBurnout,
  previewBurnoutRecovery,
  applyBurnoutRecovery,
  getCadaiRunes,
  deployCadaiRune,
  consumeCadaiRune
} from '../js/core/v5-magic-high.js';
import {
  canDispelCasting,
  previewDispelCasting,
  applyDispelCasting,
  previewDispelPersistent,
  applyDispelPersistent,
  hasUsedDispelReaction,
  markDispelReactionUsed
} from '../js/core/v5-magic-dispel.js';

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
    name: 'Teclis Junior',
    caracs: { Int: 54, FM: 52, E: 38 }, // BI = 5, BFM = 5, BE = 3
    skills: [
      { name: 'Focalisation', total: 60, advances: 8 },
      { name: 'Focalisation (Haute Magie)', total: 55, advances: 3 },
      { name: 'Langue (Magick)', total: 65, advances: 11 },
      { name: 'Résistance', total: 45, advances: 7 },
      { name: 'Calme', total: 60, advances: 8 }
    ],
    fortune: 2,
    fate: 1,
    equipment: [],
    states: [],
    ...overrides
  };
}

function createDispellerParticipant(overrides = {}) {
  return {
    id: 'dispeller-1',
    name: 'Volkmar le Purificateur',
    caracs: { Int: 40, FM: 48, E: 45 }, // FM = 48 -> BFM = 4, Portée 48 yards
    skills: [
      { name: 'Langue (Magick)', total: 55, advances: 7 }
    ],
    equipment: [],
    states: [],
    ...overrides
  };
}

// ============================================================================
// 1. INCIDENTS MAGIQUES V5 (MISCASTS)
// ============================================================================

test('Incidents V5 — Couverture des bornes des tables Mineure et Majeure', () => {
  // Table Mineure : 20 entrées
  const minorMin = lookupMiscastEntry('MINOR', 1);
  assert.equal(minorMin.name, 'Langue maladroite');
  assert.equal(minorMin.max, 5);

  const minorMid = lookupMiscastEntry('MINOR', 48);
  assert.equal(minorMid.name, 'Rupture');
  assert.equal(minorMid.max, 50);

  const minorMax = lookupMiscastEntry('MINOR', 100);
  assert.equal(minorMax.name, 'Chaos en cascade');
  assert.equal(minorMax.max, 100);

  // Table Majeure : 20 entrées, dernière entrée 96 et plus
  const majorMin = lookupMiscastEntry('MAJOR', 1);
  assert.equal(majorMin.name, 'Propos ésotériques');
  assert.equal(majorMin.max, 5);

  const major96 = lookupMiscastEntry('MAJOR', 96);
  assert.equal(major96.name, 'Contre-réaction aethyrique');

  const major120 = lookupMiscastEntry('MAJOR', 120);
  assert.equal(major120.name, 'Contre-réaction aethyrique');
});

test('Incidents V5 — Diction instinctive (-20 sur jet Mineur, <= 0 aucun effet, inactif sur Majeur)', () => {
  // 1. Jet Mineur 15 avec Diction instinctive : 15 - 20 = -5 <= 0 -> aucun effet / annulé
  const cancelledMinor = resolveMiscast({
    severity: 'MINOR',
    roll: 15,
    instinctiveDiction: true
  });
  assert.equal(cancelledMinor.cancelled, true);
  assert.equal(cancelledMinor.effectiveSeverity, 'NONE');
  assert.match(cancelledMinor.cancelReason, /diction instinctive/i);

  // 2. Jet Mineur 45 avec Diction instinctive : 45 - 20 = 25 -> Délié (max 25)
  const reducedMinor = resolveMiscast({
    severity: 'MINOR',
    roll: 45,
    instinctiveDiction: true
  });
  assert.equal(reducedMinor.cancelled, false);
  assert.equal(reducedMinor.finalRoll, 25);
  assert.equal(reducedMinor.name, 'Délié');

  // 3. Jet Majeur avec Diction instinctive : aucun effet réducteur sur table Majeure
  const majorNoEffect = resolveMiscast({
    severity: 'MAJOR',
    roll: 20,
    instinctiveDiction: true
  });
  assert.equal(majorNoEffect.cancelled, false);
  assert.equal(majorNoEffect.finalRoll, 20);
  assert.equal(majorNoEffect.name, 'Drain de puissance');
});

test('Règle de table — les anciennes options d’ingrédient ne réduisent aucun incident',()=>{
 for(const severity of ['MINOR','MAJOR'])for(const roll of [1,30,50,95,100])assert.deepEqual(resolveMiscast({severity,roll,hasIngredient:true}),resolveMiscast({severity,roll}));
});

test('Incidents V5 — Influence corruptrice (convertit Mineur en Majeur)', () => {
  const corrupted = resolveMiscast({
    severity: 'MINOR',
    roll: 15,
    corruptingInfluence: true
  });
  assert.equal(corrupted.table, 'MAJOR');
  assert.equal(corrupted.name, 'Poupée de chiffon'); // max 15 sur MAJOR
});

test('Incidents V5 — Débordement Mineur > 100 répercuté sur jet Majeur avec excédent', () => {
  // Jet Mineur initial 85 avec modificateur +30 = 115. Excédent = 15.
  // 2e dé pour le jet Majeur fourni = 20 -> jet Majeur = 20 + 15 = 35 -> Secousse du Chaos (max 35)
  const overflowMiscast = resolveMiscast({
    severity: 'MINOR',
    roll: 85,
    modifier: 30,
    secondaryRolls: { majorRoll: 20 }
  });
  assert.equal(overflowMiscast.table, 'MAJOR');
  assert.equal(overflowMiscast.overflow, 15);
  assert.equal(overflowMiscast.finalRoll, 35);
  assert.equal(overflowMiscast.name, 'Secousse du Chaos');
});

test('Incidents V5 — Conservation des dés secondaires tirés et détails structurés', () => {
  // Poupée de chiffon (MAJOR max 15) : 1d10 distance, 1d10 dégâts
  const ragdoll = resolveMiscast({
    severity: 'MAJOR',
    roll: 12,
    secondaryRolls: { distance: 7, damage: 8 }
  });
  assert.equal(ragdoll.name, 'Poupée de chiffon');
  assert.equal(ragdoll.details.distanceYards, 7);
  assert.equal(ragdoll.details.rawDamage, 8);
  assert.equal(ragdoll.details.armorIgnored, true);
  assert.equal(ragdoll.details.reducedByBE, true);
  assert.deepEqual(ragdoll.details.conditionsGained, ['À Terre']);

  // Choc aethyrique (MAJOR max 30) : 1d10 blessures directes
  const shock = resolveMiscast({
    severity: 'MAJOR',
    roll: 28,
    secondaryRolls: { damage: 6 }
  });
  assert.equal(shock.name, 'Choc aethyrique');
  assert.equal(shock.details.woundsLost, 6);
  assert.equal(shock.details.ignoresBEAndPA, true);

  // Haute Magie : Marque de la magie (Mineur max 90) devient 1d10 jours d'épuisement magique
  const highMagicMark = resolveMiscast({
    severity: 'MINOR',
    roll: 88,
    isHighMagic: true,
    secondaryRolls: { duration: 4 }
  });
  assert.equal(highMagicMark.name, 'Marqué par la magie');
  assert.equal(highMagicMark.details.type, 'burnout');
  assert.equal(highMagicMark.details.burnout.days, 4);
  assert.equal(highMagicMark.details.burnout.permanent, false);
});

// ============================================================================
// 2. HAUTE MAGIE V5 & ÉPUISEMENT MAGIQUE (BURNOUT) & RUNES DES CADAI
// ============================================================================

test('Épuisement magique V5 — Calcul du risque : excédent DR au-delà du BFM', () => {
  // BFM = 5
  // DR dépensés en surpuissance = 3 -> aucun risque (3 <= 5)
  const safe = calculateBurnoutRisk({ overcastSpent: 3, bfm: 5 });
  assert.equal(safe.triggered, false);
  assert.equal(safe.riskPercent, 0);

  // DR dépensés = 5 -> aucun risque (5 <= 5)
  const limit = calculateBurnoutRisk({ overcastSpent: 5, bfm: 5 });
  assert.equal(limit.triggered, false);
  assert.equal(limit.riskPercent, 0);

  // DR dépensés = 8 -> Risque = 8 - 5 = 3%
  const risk3 = calculateBurnoutRisk({ overcastSpent: 8, bfm: 5 });
  assert.equal(risk3.triggered, true);
  assert.equal(risk3.riskPercent, 3);

  // DR dépensés = 18 -> Risque = 18 - 5 = 13%
  const risk13 = calculateBurnoutRisk({ overcastSpent: 18, bfm: 5 });
  assert.equal(risk13.triggered, true);
  assert.equal(risk13.riskPercent, 13);
});

test('Épuisement magique V5 — Résolution du jet, durée en jours et permanence sur double', () => {
  const wizard = createWizardParticipant(); // BFM = 5

  // 1. Risque 10% (15 DR dépensés, 15 - 5 = 10%)
  // Jet = 15 > 10% -> burnout évité
  const avoided = previewBurnout({ participant: wizard, overcastSpent: 15, roll: 15 });
  assert.equal(avoided.burnedOut, false);
  assert.equal(avoided.durationDays, 0);

  // 2. Jet = 7 <= 10% (non-double) -> burnout temporaire pour 7 jours
  const tempBurnout = previewBurnout({ participant: wizard, overcastSpent: 15, roll: 7 });
  assert.equal(tempBurnout.burnedOut, true);
  assert.equal(tempBurnout.permanent, false);
  assert.equal(tempBurnout.durationDays, 7);

  // 3. Risque 15% (20 DR dépensés, 20 - 5 = 15%)
  // Jet = 11 <= 15% (DOUBLE) -> burnout PERMANENT !
  const permBurnout = previewBurnout({ participant: wizard, overcastSpent: 20, roll: 11 });
  assert.equal(permBurnout.burnedOut, true);
  assert.equal(permBurnout.permanent, true);
  assert.equal(permBurnout.durationDays, Infinity);
});

test('Épuisement magique V5 — Annulation via Points de Chance (temporaire) ou Destin (permanent)', () => {
  const wizard = createWizardParticipant();

  // 1. Épuisement temporaire : annulable avec Fortune (Chance)
  // S-11 : Chance lue dans le registre V5 (resources.fortune), Destin dans extensions.v5.fate.
  const tempState = structuredClone(wizard);
  tempState.extensions = { v5: { burnout: { active: true, permanent: false, days: 5 }, resources: { fortune: 1 }, fate: 1 } };
  const tempCheck = previewBurnoutRecovery(tempState, { resource: 'fortune' });
  assert.equal(tempCheck.possible, true);
  assert.equal(tempCheck.requiredResource, 'fortune');

  // Épuisement temporaire : le Destin ne le lève pas (S-11) ; compteur de Chance non initialisé : bloqué
  assert.equal(previewBurnoutRecovery(tempState, { resource: 'fate' }).possible, false);
  assert.equal(previewBurnoutRecovery({ ...tempState, extensions: { v5: { burnout: tempState.extensions.v5.burnout } } }, { resource: 'fortune' }).possible, false);
  // Refus si on tente sans ressource appropriée
  const invalidTemp = previewBurnoutRecovery(tempState, { resource: 'other' });
  assert.equal(invalidTemp.possible, false);

  // 2. Épuisement permanent : annulable UNIQUEMENT avec Destin (Fate)
  const permState = structuredClone(wizard);
  permState.extensions = { v5: { burnout: { active: true, permanent: true, days: Infinity }, resources: { fortune: 1 }, fate: 1 } };

  // Refus avec Fortune
  const rejectFortune = previewBurnoutRecovery(permState, { resource: 'fortune' });
  assert.equal(rejectFortune.possible, false);

  // Succès avec Destin
  const acceptFate = previewBurnoutRecovery(permState, { resource: 'fate' });
  assert.equal(acceptFate.possible, true);
  assert.equal(acceptFate.requiredResource, 'fate');
});

test('Runes des Cadai V5 — Déploiement plafonné à BFM et consommation pour relance', () => {
  const wizard = createWizardParticipant(); // BFM = 5

  // Initialement 0 runes
  assert.deepEqual(getCadaiRunes(wizard), { deployed: 0, max: 5 });

  // Déploiement de 3 runes
  const step1 = deployCadaiRune(wizard, { count: 3 });
  assert.deepEqual(getCadaiRunes(step1), { deployed: 3, max: 5 });

  // Déploiement de 4 runes supplémentaires -> plafonné à BFM (5)
  const step2 = deployCadaiRune(step1, { count: 4 });
  assert.deepEqual(getCadaiRunes(step2), { deployed: 5, max: 5 });

  // Consommation d'une rune pour relancer un test
  const consume1 = consumeCadaiRune(step2, { purpose: 'relance focalisation' });
  assert.equal(consume1.success, true);
  assert.equal(consume1.remaining, 4);

  // Consommation de toutes les runes restantes
  let current = consume1.participant;
  for (let i = 0; i < 4; i++) {
    current = consumeCadaiRune(current).participant;
  }
  assert.equal(getCadaiRunes(current).deployed, 0);

  // Tentative quand stock vide -> échec
  const failEmpty = consumeCadaiRune(current);
  assert.equal(failEmpty.success, false);
  assert.match(failEmpty.reason, /aucune rune/i);
});

// ============================================================================
// 3. DISSIPATION V5 (RÉACTION & SORT PERSISTANT)
// ============================================================================

test('Dissipation V5 (réaction) — Quota 1/round, portée FM yards et opposition', () => {
  const dispeller = createDispellerParticipant(); // FM = 48 -> Portée max 48 yards
  const castingPreview = {
    testSl: 3, // D-02 : opposition au Test seul
    matchingReserve: 0,
    totalCastingSl: 3,
    spell: { name: 'Comète de Cassandora', cn: 6 },
    criticalChoice: 'critical-wound'
  };

  // 1. Contrôle de portée : distance 55 yards > 48 yards -> interdit
  const outOfRange = previewDispelCasting(dispeller, castingPreview, {
    round: 1,
    distance: 55,
    visible: true, // D-18 : visibilité saisie
    roll: 20
  });
  assert.equal(outOfRange.allowed, false);
  assert.match(outOfRange.reason, /portée/i);

  // 2. À portée (30 yards <= 48 yards) :
  // Dissipateur : Langue (Magick) score 55. Jet 25 -> DR = 5 - 2 = +3.
  // Lanceur DR = 3.
  // Net SL = 3 - 3 = 0 (pas > 0) -> échec de la dissipation
  const tieDispel = previewDispelCasting(dispeller, castingPreview, {
    round: 1,
    distance: 30,
    visible: true, // D-18 : visibilité saisie
    roll: 25
  });
  assert.equal(tieDispel.allowed, true);
  assert.equal(tieDispel.dispellerSl, 3);
  assert.equal(tieDispel.casterSl, 3);
  assert.equal(tieDispel.netSl, 0);
  assert.equal(tieDispel.dispelled, false);

  // 3. Réussite nette : jet 12 -> DR = 5 - 1 = +4. Net = 3 - 4 = -1 < 0 -> DISSIPÉ !
  const successDispel = previewDispelCasting(dispeller, castingPreview, {
    round: 1,
    distance: 30,
    visible: true, // D-18 : visibilité saisie
    roll: 12
  });
  assert.equal(successDispel.dispelled, true);
  assert.equal(successDispel.netSl, -1); // X-01 : netSl = DR du lanceur − DR du dissipateur

  // 4. Quota 1 tentative par round : après marquage, seconde tentative dans le même round rejetée
  const usedDispeller = markDispelReactionUsed(dispeller, 1);
  assert.equal(hasUsedDispelReaction(usedDispeller, 1), true);

  const blockedDispel = previewDispelCasting(usedDispeller, castingPreview, {
    round: 1,
    distance: 30,
    visible: true, // D-18 : visibilité saisie
    roll: 10
  });
  assert.equal(blockedDispel.allowed, false);
  assert.match(blockedDispel.reason, /déjà utilisé/i);

  // Mais autorisée au Round 2 !
  const round2Dispel = previewDispelCasting(usedDispeller, castingPreview, {
    round: 2,
    distance: 30,
    visible: true, // D-18 : visibilité saisie
    roll: 10
  });
  assert.equal(round2Dispel.allowed, true);
});

test('Dissipation V5 (réaction) — Exception absolue : Force irrésistible interdit toute dissipation', () => {
  const dispeller = createDispellerParticipant();
  const unstoppableCast = {
    totalCastingSl: 5,
    spell: { name: 'Lance d’Ambre', cn: 10 },
    criticalChoice: 'unstoppable-force' // Force irrésistible !
  };

  const attempt = previewDispelCasting(dispeller, unstoppableCast, { round: 1, roll: 5 });
  assert.equal(attempt.allowed, false);
  assert.match(attempt.reason, /force irrésistible/i);
});

test('Dissipation V5 (persistant) — Test étendu NI, cumul, et bonus +1 DR sur propre sort', () => {
  const dispeller = createDispellerParticipant(); // Langue 55
  const persistentSpell = {
    id: 'active-robe-scintillante-1',
    name: 'Robe scintillante',
    cn: 6,
    casterId: 'other-wizard',
    progressByDispeller: {}
  };

  // 1. Tour 1 : jet 35 -> DR = 5 - 3 = +2 DR. Progression 2/6.
  const round1 = previewDispelPersistent(dispeller, persistentSpell, { roll: 35, distance: 10, visible: true });
  assert.equal(round1.earnedSl, 2);
  assert.equal(round1.newProgress, 2);
  assert.equal(round1.dispelled, false);

  // Mise à jour de la progression
  const updatedEffect = {
    ...persistentSpell,
    progressByDispeller: { [dispeller.id]: 2 }
  };

  // 2. Tour 2 : jet 23 -> DR = 5 - 2 = +3 DR. Progression 2 + 3 = 5/6. Toujours actif.
  const round2 = previewDispelPersistent(dispeller, updatedEffect, { roll: 23, distance: 10, visible: true });
  assert.equal(round2.earnedSl, 3);
  assert.equal(round2.newProgress, 5);
  assert.equal(round2.dispelled, false);

  const updatedEffect2 = {
    ...persistentSpell,
    progressByDispeller: { [dispeller.id]: 5 }
  };

  // 3. Tour 3 : jet 40 -> DR = 5 - 4 = +1 DR. Progression 5 + 1 = 6/6 >= 6 -> DISSIPÉ !
  const round3 = previewDispelPersistent(dispeller, updatedEffect2, { roll: 40, distance: 10, visible: true });
  assert.equal(round3.earnedSl, 1);
  assert.equal(round3.newProgress, 6);
  assert.equal(round3.dispelled, true);

  // 4. Bonus de dissiper son propre sort : +1 DR
  const ownSpell = {
    id: 'active-own-spell-1',
    name: 'Mon Bouclier',
    cn: 4,
    casterId: dispeller.id, // propre sort !
    progressByDispeller: {}
  };
  const ownCheck = previewDispelPersistent(dispeller, ownSpell, { roll: 35, distance: 10, visible: true });
  // Score 55, roll 35 -> base DR 2. Avec bonus propre sort (+1 DR) -> 3 DR !
  assert.equal(ownCheck.isOwnSpell, true);
  assert.equal(ownCheck.earnedSl, 3);
});

// ============================================================================
// 4. INTÉGRATION STORE & TRANSACTIONS RÉVERSIBLES SOUS UNDO()
// ============================================================================

test('Store V5 — Runes des Cadai, Burnout et Dissipations réversibles sous store.undo()', async () => {
  const store = createStore({ persistence: memory() });
  await store.ready;

  const wizard = createWizardParticipant();
  const dispeller = createDispellerParticipant();

  await store.executeCommand('init-combat', draft => {
    draft.combat = {
      round: 1,
      currentActorId: wizard.id,
      participants: [wizard, dispeller]
    };
    return draft;
  });

  // 1. Déploiement de runes des Cadai
  for(let i=0;i<3;i++)await store.deployCadaiRune({ actorId: wizard.id, roll:25, conditionsConfirmed:true });
  assert.equal(store.getCadaiRunes(wizard.id).deployed, 3);

  // Annulation déploiement
  await store.undo();
  assert.equal(store.getCadaiRunes(wizard.id).deployed, 2);

  // Rétablissement (redéploiement)
  await store.deployCadaiRune({ actorId: wizard.id, reset:true });
  for(let i=0;i<2;i++)await store.deployCadaiRune({ actorId: wizard.id, roll:25, conditionsConfirmed:true });
  assert.equal(store.getCadaiRunes(wizard.id).deployed, 2);

  // Consommation d'une rune
  await store.consumeCadaiRune({ actorId: wizard.id, purpose: 'relance test' });
  assert.equal(store.getCadaiRunes(wizard.id).deployed, 1);

  // Annulation consommation
  await store.undo();
  assert.equal(store.getCadaiRunes(wizard.id).deployed, 2);

  // 2. Application d'épuisement magique
  const burnoutPreview = store.previewBurnout({
    actorId: wizard.id,
    overcastSpent: 15, // 15 - 5 = 10%
    roll: 8 // <= 10% -> 8 jours
  });
  assert.equal(burnoutPreview.burnedOut, true);
  assert.equal(burnoutPreview.durationDays, 8);

  await store.applyBurnout(burnoutPreview, { actorId: wizard.id });
  const [wAfterBurnout] = store.listParticipants();
  assert.equal(getBurnoutStatus(wAfterBurnout).active, true);
  assert.equal(getBurnoutStatus(wAfterBurnout).days, 8);

  // Annulation burnout
  await store.undo();
  const [wAfterUndoBurnout] = store.listParticipants();
  assert.equal(getBurnoutStatus(wAfterUndoBurnout).active, false);

  // 3. Réaction de dissipation enregistrée dans le combat
  const castingPreview = {
    testSl: 2,
    matchingReserve: 0,
    totalCastingSl: 2,
    spell: { name: 'Flèche Aethyrique', cn: 4 }
  };
  const dispelPreview = store.previewDispelCasting(castingPreview, {
    dispellerId: dispeller.id,
    round: 1,
    distance: 10,
    visible: true,
    roll: 15 // Langue 55 -> DR = 4 vs 2 -> Gagné !
  });
  assert.equal(dispelPreview.dispelled, true);

  await store.applyDispelCasting(dispelPreview, { dispellerId: dispeller.id });
  const participantsAfterDispel = store.listParticipants();
  const dAfter = participantsAfterDispel.find(p => p.id === dispeller.id);
  assert.equal(hasUsedDispelReaction(dAfter, 1), true);

  // Annulation de la dissipation : la réaction redevient disponible !
  await store.undo();
  const participantsAfterUndo = store.listParticipants();
  const dAfterUndo = participantsAfterUndo.find(p => p.id === dispeller.id);
  assert.equal(hasUsedDispelReaction(dAfterUndo, 1), false);
});
