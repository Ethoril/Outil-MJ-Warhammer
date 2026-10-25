import {enforceMagicTestRestrictions} from './v5-magic-talents.js';
import { beastFormRestriction } from './v5-magic-arbitrations.js';
import { prepareMagicOptions, magicTalentRank, applyMagicAttempt, magicTurnKey, effectiveSkillScore, baseCharacteristicScore, activeMagicTalent, suffusedCastingBonus, castingTalent } from './v5-magic-talents.js';
/**
 * Moteur de Lancement de sort (Casting) et Surpuissance (Overcasting) V5 — Lot 3.0.
 * Conforme au Cahier des charges Lot 3 et au Cadrage Magie V5.
 * Module pur : aucune E/S, aucun tirage implicite, prévisualisations sans mutation d'état.
 */
import { MAGIC_DATA } from '../data/magic.js';
import { previewV5Test, selectV5Test, normalizeV5Roll } from './v5-roll.js';
import {
  getChannellingReserve,
  clearChannellingReserve,
  calculateMagicArmorPenalty,
  lookupMiscast
} from './v5-magic-channelling.js';
import { resolveMiscast, applyMiscastToParticipant, missingMagicDiceMessage } from './v5-magic-miscasts.js';
import { uid } from './models.js';
import { totalPowerCritical } from './slann.js';
import { creatureCastingBases } from './creature-magic.js';

export const V5_MAGIC_CASTING_VERSION = 'v5-magic-casting-2026-10-10.1';

export const OVERCAST_TIERS = Object.freeze([1, 2, 3, 5, 8, 13, 18]);

export const OVERCAST_BENEFITS = Object.freeze({
  targets: Object.freeze([
    { tier: 1, benefit: '+1 cible', value: 1 },
    { tier: 2, benefit: '+1 cible', value: 1 },
    { tier: 3, benefit: '+1 cible', value: 1 },
    { tier: 5, benefit: '+2 cibles', value: 2 },
    { tier: 8, benefit: '+2 cibles', value: 2 },
    { tier: 13, benefit: '+2 cibles', value: 2 },
    { tier: 18, benefit: '+3 cibles', value: 3 }
  ]),
  damage: Object.freeze([
    { tier: 1, benefit: '+1 dégâts', value: 1 },
    { tier: 2, benefit: '+2 dégâts', value: 2 },
    { tier: 3, benefit: '+3 dégâts', value: 3 },
    { tier: 5, benefit: '+4 dégâts', value: 4 },
    { tier: 8, benefit: '+5 dégâts', value: 5 },
    { tier: 13, benefit: '+6 dégâts', value: 6 },
    { tier: 18, benefit: '+7 dégâts', value: 7 }
  ]),
  range: Object.freeze([
    { tier: 1, benefit: 'portée ×2', multiplier: 2 },
    { tier: 2, benefit: 'portée ×2', multiplier: 2 },
    { tier: 3, benefit: 'portée ×2', multiplier: 2 },
    { tier: 5, benefit: 'portée ×3', multiplier: 3 },
    { tier: 8, benefit: 'portée ×3', multiplier: 3 },
    { tier: 13, benefit: 'portée ×3', multiplier: 3 },
    { tier: 18, benefit: 'portée ×4', multiplier: 4 }
  ]),
  aoe: Object.freeze([
    { tier: 3, benefit: 'zone ×2', multiplier: 2 },
    { tier: 5, benefit: 'zone ×2', multiplier: 2 },
    { tier: 8, benefit: 'zone ×2', multiplier: 2 },
    { tier: 13, benefit: 'zone ×2', multiplier: 2 },
    { tier: 18, benefit: 'zone ×3', multiplier: 3 }
  ]),
  duration: Object.freeze([
    { tier: 2, benefit: 'durée ×2', multiplier: 2 },
    { tier: 3, benefit: 'durée ×2', multiplier: 2 },
    { tier: 5, benefit: 'durée ×2', multiplier: 2 },
    { tier: 8, benefit: 'durée ×3', multiplier: 3 },
    { tier: 13, benefit: 'durée ×3', multiplier: 3 },
    { tier: 18, benefit: 'durée ×3', multiplier: 3 }
  ])
});

export const CASTING_CRITICAL_CHOICES = Object.freeze([
  'critical-wound',
  'total-power',
  'unstoppable-force'
]);

const fold = str => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * Retourne le palier de surpuissance obtenu pour une catégorie et une dépense de DR donnée.
 */
export function getOvercastBenefit(category, spentSL) {
  if (!Number.isFinite(Number(spentSL)) || Number(spentSL) <= 0) {
    return null;
  }
  const cost = Number(spentSL);
  if (category === 'special') {
    return { tier: cost, benefit: `+${cost} DR spécial`, value: cost };
  }
  const options = OVERCAST_BENEFITS[category];
  if (!Array.isArray(options)) {
    return null;
  }
  const eligible = options.filter(item => item.tier <= cost);
  return eligible.length ? eligible[eligible.length - 1] : null;
}

/**
 * Détermine si la surpuissance est autorisée pour ce sort.
 */
export function isOvercastAllowed(spell) {
  if (!spell) return false;
  if (spell.isPetty === true || spell.type === 'petty') return false;
  if (spell.isGrimoire === true || spell.unmemorized === true || spell.memorized === false) return false;
  return true;
}

/**
 * Valide et décompte les choix de surpuissance.
 */
export function validateOvercastChoices(choices = {}, { availableSL = 0, maxSpend = 0, spell = {} } = {}) {
  const labels={damage:'Dégâts',targets:'Cibles',range:'Portée',duration:'Durée',aoe:'Zone',special:'Spécial'};
  const allowed = isOvercastAllowed(spell);
  const errors = [];
  const benefits = {};
  let totalSpent = 0;

  // Une dépense négative ou illisible n'est pas ignorée : elle est refusée.
  const invalid = Object.entries(choices || {}).filter(([, spent]) => spent != null && spent !== '' && !(Number.isFinite(Number(spent)) && Number(spent) >= 0));
  if (invalid.length) return { valid: false, errors: invalid.map(([cat, spent]) => `Dépense de surpuissance invalide pour ${labels[cat] || 'option inconnue'} : ${spent} (nombre de DR positif ou nul attendu).`), totalSpent: 0, benefits: {} };
  const entries = Object.entries(choices || {}).filter(([, spent]) => Number(spent) > 0);

  if (!allowed && entries.length > 0) {
    errors.push('La surpuissance est interdite pour ce sort (sort mineur ou grimoire non mémorisé).');
    return { valid: false, errors, totalSpent: 0, benefits: {} };
  }

  const rangeStr = fold(spell.range);
  const rangeForbidden = /^(vous|contact|toucher|you|touch|spécial|special|zde|zone|aoe|ligne de vue|vortex)/i.test(rangeStr);
  const durationStr = fold(spell.duration);
  const durationForbidden = !spell.effects?.durationFactFormula && durationStr.includes('instantan') || !spell.effects?.durationFactFormula && durationStr.includes('special');
  const aoeForbidden = !spell.hasAoe && !spell.aoe && !/aoe|zone/i.test(String(spell.target || ''));
  // V5 p. 236 : les dégâts ne s'améliorent que pour un projectile magique (`isMagicMissile` ; à défaut, ancien indicateur `hasDamage`).
  const damageForbidden = spell.isMagicMissile !== undefined ? spell.isMagicMissile !== true : !spell.hasDamage && !spell.damage && !/dégâts|damage/i.test(String(spell.effect || ''));
  // WoM pp. 20, 23 : une portée Vous ne vise que le lanceur ; une cible « Spécial » ou « 1 (max) » ne s'étend pas.
  const targetStr = fold(spell.target);
  const targetsForbidden = rangeStr.includes('vous') || /^special/.test(targetStr) || /\(max/.test(targetStr);

  for (const [cat, spent] of entries) {
    const cost = Number(spent) || 0;
    totalSpent += cost;
    // V5 p. 236 : dépenses entières aux paliers exacts de la table (1, 2, 3, 5, 8, 13, 18) ; `special` suit les options du sort.
    if (cat !== 'special' && !(Number.isInteger(cost) && OVERCAST_BENEFITS[cat]?.some(item => item.tier === cost))) {
      errors.push(`Dépense de ${labels[cat] || 'option inconnue'} (${cost} DR) hors palier : ${(OVERCAST_BENEFITS[cat] || []).map(item => item.tier).join(', ') || 'catégorie inconnue'} DR.`);
      continue;
    }
    if (cat === 'special' && !Number.isInteger(cost)) {
      errors.push('Dépense spéciale entière requise.');
      continue;
    }
    if (cat === 'targets' && targetsForbidden) {
      errors.push('Ce sort ne peut pas viser d’autres cibles (portée Vous, cible Spécial ou 1 maximum).');
    }

    if (cat === 'range' && rangeForbidden) {
      errors.push('La portée Vous ou Contact ne peut pas être améliorée.');
    }
    if (cat === 'duration' && durationForbidden) {
      errors.push('La durée Instantanée ou Spéciale ne peut pas être améliorée.');
    }
    if (cat === 'aoe' && aoeForbidden) {
      errors.push('Un sort sans zone d’effet ne peut pas créer de zone.');
    }
    if (cat === 'damage' && damageForbidden) {
      errors.push('Ce sort ne cause pas de dégâts et ne peut pas recevoir d’amélioration de dégâts.');
    }

    const benefit = getOvercastBenefit(cat, cost);
    if (!benefit || cat !== 'special' && benefit.tier !== cost) {
      errors.push(`Dépense insuffisante pour un palier de ${labels[cat] || 'option inconnue'} (${cost} DR).`);
    } else {
      benefits[cat] = benefit;
    }
  }

  const allowableLimit = Math.min(availableSL, maxSpend);
  if (totalSpent > allowableLimit) {
    errors.push(`Dépense de surpuissance (${totalSpent} DR) supérieure au maximum autorisé (${allowableLimit} DR).`);
  }

  return {
    valid: errors.length === 0,
    errors,
    totalSpent,
    remainingSL: Math.max(0, availableSL - totalSpent),
    benefits
  };
}

/**
 * Résout la compétence Langue (Magick) et les bonus BI / BFM.
 */
export function resolveCastingSkill(participant) {
  const bi = Math.floor((Number(participant?.caracs?.Int) || 0) / 10);
  const bfm = Math.floor((Number(participant?.caracs?.FM) || 0) / 10);

  const targetNames = ['langue (magick)', 'langue (magie)', 'language (magick)', 'langue magick', 'langue magie'];
  const skills = Array.isArray(participant?.skills) ? participant.skills : [];
  const foundSkill = skills.find(s => targetNames.includes(fold(s.name || s.nom || s.sourceName)));

  const actions = Array.isArray(participant?.actions) ? participant.actions : [];
  const foundAction = actions.find(a => targetNames.includes(fold(a.note || a.name)));

  let score = null;
  let skillName = 'Langue (Magick)';

  if (foundSkill) {
    skillName = foundSkill.name || foundSkill.nom || skillName;
    score = foundSkill.total ?? foundSkill.value ?? foundSkill.score ?? (baseCharacteristicScore(participant,'Int') + (Number(foundSkill.advances ?? foundSkill.adv) || 0));
  } else if (foundAction && Number.isFinite(Number(foundAction.base))) {
    skillName = foundAction.note || foundAction.name || skillName;
    score = Number(foundAction.base);
  } else {
    // Sans compétence imprimée, un Lanceur de sorts de bestiaire teste à la base de son Trait (Intelligence+10) ; sinon la caractéristique brute.
    score = creatureCastingBases(participant, { baseline: true })?.tongueBase ?? baseCharacteristicScore(participant,'Int');
  }

  return {
    skillName,
    score: effectiveSkillScore(participant, Number(score) || 0, 'Int'),
    bi,
    bfm,
    carac: 'Int'
  };
}

/**
 * Détermine le type de réserve requis par un sort : 'high' ou 'winds'.
 */
export function requiredReserveType(spell) {
  const spellType = fold(spell?.type);
  const spellWind = fold(spell?.wind);
  if (spellType === 'high' || spellWind === 'qhaysh' || spellWind === 'haute magie') {
    return 'high';
  }
  return 'winds';
}

/**
 * Résout l'incident magique selon les options et atténuations V5.
 */
function resolveMiscastWithMitigations(tableKey, rawRoll, modifier, options = {}) {
  const result = resolveMiscast({
    severity: tableKey,
    roll: rawRoll,
    modifier,
    corruptingInfluence: Boolean(options.corruptingInfluence),
    slannMishapMaster: options.slannMishapMaster === true,
    hasIngredient: false,
    instinctiveDiction: Boolean(options.instinctiveDiction),
    attunementRank: options.attunementRank, miscastRoll2: options.miscastRoll2, miscastChoice: options.miscastChoice,
    isHighMagic: Boolean(options.isHighMagic),
    usedTalent: options.usedTalent,
    bfm: Number(options.bfm) || 0,
    secondaryRolls: options.secondaryRolls || {},
    majorRoll: options.majorRoll
  });
  return result.cancelled && result.ready !== false ? null : result;
}

/**
 * Prévisualisation d'une Action d'Incantation / Lancement de sort V5.
 * Pure et déterministe, SANS MUTATION D'ÉTAT.
 */
export function previewCasting(participant, spell, options = {}) {
  const locked = beastFormRestriction(participant, 'cast');
  if (locked) return { actionType: 'casting', ready: false, error: locked, summary: locked };
  options = prepareCastingOptions(participant, spell, options);
  return previewPreparedCasting(participant, spell, options);
}

/**
 * Garde-fous communs à tout lancement (Test ou DR saisis) : Épuisement magique, Mage de guerre, États, runes des Cadai, Drain de puissance.
 * Lève une erreur de règle, ou renvoie les options enrichies (modificateurs d'États, atténuations, relances).
 */
export function prepareCastingOptions(participant, spell, options = {}) {
  options = prepareMagicOptions(participant, 'casting', options, spell);
  if (options.warWizard && (!magicTalentRank(participant,'war-wizard') || !participant.extensions?.v5?.hasMomentum || Number(spell?.cn ?? spell?.ni)>5 || participant.extensions?.v5?.magicAttemptTurn===magicTurnKey(participant,options))) throw new Error('Mage de guerre : NI ≤ 5, Élan et aucun autre Test magique ce Tour requis.');
  return options;
}

function previewPreparedCasting(participant, spell, options) {
  const cn = Number.isFinite(Number(spell?.cn ?? spell?.ni)) ? Number(spell?.cn ?? spell?.ni) : 0;
  const isPetty = spell?.isPetty === true || spell?.type === 'petty';
  const expectedType = requiredReserveType(spell);

  const currentReserve = getChannellingReserve(participant);
  // La réserve est celle du participant : aucune valeur de DR ne s'injecte par les options.
  const matchingReserve = currentReserve.type === expectedType ? currentReserve.sl : 0;

  const skill = resolveCastingSkill(participant);
  const score = Number.isFinite(Number(options.score)) ? Number(options.score) : skill.score;
  const bi = skill.bi;
  const bfm = skill.bfm;
  const maxOvercastSpend = bi + bfm;

  const armorContext = calculateMagicArmorPenalty(participant, { wind: spell?.wind });
  const armorPenalty = armorContext.penalty;

  const difficultyModifier = Number(options.slModifier) || 0;
  const extraModifiers = Array.isArray(options.slModifiers) ? options.slModifiers : [];
  const slModifiers = [
    ...(difficultyModifier !== 0 ? [{ id: 'difficulty', label: 'Difficulté', amount: difficultyModifier }] : []),
    ...(armorPenalty !== 0 ? [{ id: 'armor', label: 'Pénalité d’armure', amount: armorPenalty }] : []),
    ...extraModifiers
  ];

  if (options.roll === undefined || options.roll === null) {
    return {
      actionType: 'casting',
      spell,
      cn,
      currentReserve,
      matchingReserve,
      score,
      bi,
      bfm,
      maxOvercastSpend,
      armorPenalty,
      slModifiers,
      missing: ['roll'],
      ready: false
    };
  }

  const roll = normalizeV5Roll(options.roll);
  const testPreview = previewV5Test({
    score,
    roll,
    kind: 'test',
    slModifiers,
    advantageSources: options.advantageSources || [],
    disadvantageSources: options.disadvantageSources || []
  });

  const optionId = testPreview.options.length === 1 ? testPreview.options[0].id : options.choice || 'keep';
  const selectedTest = enforceMagicTestRestrictions(participant,selectV5Test(testPreview, optionId));
  const { success: testSuccess, fumble } = selectedTest;
  // Puissance totale slann : un lancement réussi est aussi critique sur une unité 0 (le double l'est déjà), lu sur le jet retenu (après Avantage ou Désavantage), avec le DR minimal +5 d'un critique.
  const slannCritical = testSuccess && !selectedTest.critical && totalPowerCritical(participant, selectedTest.roll, { succeeded: true }).critical === true;
  const critical = selectedTest.critical || slannCritical;
  const testSl = slannCritical ? Math.max(5, selectedTest.sl) : selectedTest.sl;

  let totalCastingSl = 0;
  let spellSuccess = false;
  let reserveConsumed = currentReserve.sl; // Toute tentative effective consomme la réserve
  let miscast = null;
  let criticalChoice = null;
  let extraOvercastFromCritical = 0;

  const miscastContext = {
    ...options,
    usedTalent: castingTalent(participant, spell, options),
    bfm,
    isHighMagic: expectedType === 'high'
  };

  // RÈGLE V5 : LE TEST DOIT RÉUSSIR (DR >= 0). La réserve ne sauve ni un échec ni une maladresse !
  if (!testSuccess) {
    // Échec du test : le sort échoue impérativement, la réserve est perdue
    spellSuccess = false;
    totalCastingSl = testSl;

    if (fumble) {
      // Maladresse d’incantation : jet Mineur
      miscast = resolveMiscastWithMitigations(options.forceMajorMiscast?'MAJOR':'MINOR', options.miscastRoll, 0, miscastContext);
    }
  } else {
    // Le test a réussi : on ajoute la réserve appropriée
    totalCastingSl = testSl + matchingReserve;

    if (critical && !isPetty) {
      // Double réussi au lancer : déclenche un incident Mineur (sauf sorts mineurs)
      miscast = resolveMiscastWithMitigations(options.forceMajorMiscast?'MAJOR':'MINOR', options.miscastRoll, 0, miscastContext);

      // Choix d'effet critique
      criticalChoice = options.criticalChoice || null;
      if (criticalChoice === 'total-power') {
        // Puissance totale : le sort réussit et ajoute le chiffre des dizaines du jet aux DR de surpuissance
        spellSuccess = true;
        extraOvercastFromCritical = Math.floor(roll / 10);
      } else {
        spellSuccess = totalCastingSl >= cn;
      }
    } else {
      spellSuccess = totalCastingSl >= cn;
    }
  }

  if(spellSuccess)totalCastingSl+=suffusedCastingBonus(participant,spell,options);

  // Calcul de la surpuissance
  let surplus = 0;
  let availableOvercastSl = 0;
  let overcast = { valid: true, totalSpent: 0, remainingSL: 0, benefits: {} };

  if (spellSuccess) {
    surplus = Math.max(0, totalCastingSl - cn);
    availableOvercastSl = surplus + extraOvercastFromCritical + (expectedType === 'high' ? magicTalentRank(participant, 'high-magic') : 0);
    overcast = validateOvercastChoices(options.overcastChoices || {}, {
      availableSL: availableOvercastSl,
      maxSpend: maxOvercastSpend,
      // V5 p. 236 : un sort de grimoire non mémorisé ne se surpuissance pas.
      spell: options.unmemorized === true ? { ...spell, unmemorized: true } : spell
    });
  } else if (options.overcastChoices && Object.values(options.overcastChoices).some(v => Number(v) > 0)) {
    overcast = {
      valid: false,
      errors: ['Impossible de dépenser de la surpuissance sur un lancement échoué.'],
      totalSpent: 0,
      remainingSL: 0,
      benefits: {}
    };
  }

  // La réserve après le lancer est remise à 0
  const newReserve = { type: null, sl: 0 };
  const missing = (miscast?.missingSecondaryDice || []).map(key => key === 'roll' ? 'miscastRoll' : key);
  // HEPG p. 84 : une rune ne se paie que pour un jet réellement utilisé ; celle de l'épuisement est tranchée par l'exécution du sort.
  const cadaiReceipts = (options.cadaiReceipts || []).filter(receipt => receipt.purpose === 'test' || receipt.purpose === 'miscast' && miscast);
  const burnoutReceipt = (options.cadaiReceipts || []).find(receipt => receipt.purpose === 'burnout') || null;

  return {
    actionType: 'casting',
    spell,
    cn,
    currentReserve,
    matchingReserve,
    reserveConsumed,
    score,
    bi,
    bfm,
    maxOvercastSpend,
    armorPenalty,
    armorDetails: armorContext,
    roll,
    test: selectedTest,
    testSuccess,
    testSl,
    critical,
    fumble,
    criticalChoice,
    totalCastingSl,
    spellSuccess,
    surplus,
    extraOvercastFromCritical,
    availableOvercastSl,
    overcast,
    miscast,
    newReserve,
    turnKey:options.turnKey,
    cadaiReceipt: cadaiReceipts.length === 1 ? cadaiReceipts[0] : null,
    cadaiReceipts,
    burnoutReceipt,
    missing,
    error: missing.length ? missingMagicDiceMessage(missing) : miscast?.ready === false ? miscast.summary : null,
    ready: !missing.length && (!miscast || miscast.ready !== false)
  };
}

/**
 * Application atomique d'une Action d'Incantation.
 */
export function applyCasting(target, preview, options = {}) {
  if (!preview || preview.ready === false) {
    throw new TypeError('Aperçu d’incantation incomplet ou non prêt');
  }

  const applyToOne = (p, round = 1) => {
    let updated = applyMagicAttempt(clearChannellingReserve(p), preview, options);
    if (preview.miscast) {
      updated = applyMiscastToParticipant(updated, preview.miscast, { round, ...options }).participant;
    }
    return updated;
  };

  // Si target est un Store
  if (target && typeof target.executeCommand === 'function') {
    const actorId = options.actorId || target.getCombat()?.currentActorId || target.listParticipants()[0]?.id;
    return target.executeCommand('v5-casting', draft => {
      const participants = draft.combat?.participants || [];
      const index = participants.findIndex(p => p.id === actorId);
      if (index === -1) throw new Error('Participant introuvable dans le combat');
      if(preview.baseRevision!==undefined && preview.baseRevision!==draft.localRevision)throw new Error('Incantation périmée : recalcul requis.');
      if(preview.input){preview=previewCasting(participants[index],preview.spell,{...preview.input,assistant:participants.find(p=>p.id===preview.input.assistantId),turnKey:String(draft.combat?.round || 1)+':'+String(draft.extensions?.v5?.turnIndex || 1)});if(!preview.ready)throw new Error(preview.error || 'Incantation incomplète.');}
      participants[index] = applyToOne(participants[index], draft.combat?.round ?? 1);
      const logText = `Lancement ${preview.spell?.name || 'Sort'} : ${preview.spellSuccess ? `Réussi (Total ${preview.totalCastingSl} vs NI ${preview.cn})${preview.overcast.totalSpent > 0 ? ` · Surpuissance : ${preview.overcast.totalSpent} DR` : ''}` : `Échec (Total ${preview.totalCastingSl} vs NI ${preview.cn})`}${preview.miscast ? ` · Incident : ${preview.miscast.name} (${preview.miscast.details?.summary || preview.miscast.description})` : ''}`;
      draft.log = [{ id: uid(), ts: Date.now(), kind: 'magic', text: logText }, ...(draft.log || [])].slice(0, 300);
      return draft;
    });
  }

  // Participant simple
  if (target && (target.id || target.caracs)) {
    const updated = applyToOne(target, options.round ?? 1);
    return {
      status: 'applied',
      participant: updated,
      resolution: structuredClone(preview)
    };
  }

  // État de combat ou enveloppe
  if (target && Array.isArray(target.participants)) {
    const actorId = options.actorId || target.participants[0]?.id;
    const nextState = structuredClone(target);
    nextState.participants = nextState.participants.map(p => p.id === actorId ? applyToOne(p, nextState.round ?? 1) : p);
    return {
      status: 'applied',
      state: nextState,
      resolution: structuredClone(preview)
    };
  }

  throw new TypeError('Cible invalide pour applyCasting');
}
