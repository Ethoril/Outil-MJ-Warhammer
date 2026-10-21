import { uid } from './models.js';
import {randomVortexStep} from './v5-magic-turn.js';
import {spellObjectChoices,ARCANE_WEAPON_PROFILES} from './equipment.js';
import {spellAttackNature,previewMagicProtection} from './v5-magic-combat.js';
import {getV5Fortune} from './v5-resources.js';
import { consumeDivineLayers } from './v5-divine-effects-gear.js';
const spellCriticalSeverityReminder = actor => {
  const bonus = (actor?.extensions?.v5?.divineEffects || []).reduce((sum, layer) => sum + (Number(layer?.criticalSeverityBonus) || 0), 0);
  return bonus ? ` (${bonus > 0 ? '+' : ''}${bonus} à la gravité : Morsure du Loup)` : '';
};
import { previewDispelCasting, markDispelReactionUsed } from './v5-magic-dispel.js';
import { magicTalentRank, applyMagicAttempt, suffusedCastingBonus, magicalSenseReceipts, effectiveSkillScore, baseCharacteristicScore } from './v5-magic-talents.js';
/**
 * Moteur des Contrats de Sorts V5 — Lot 3.3 et Lot 3.4.
 * Conforme au Cahier des charges Lot 3 et au Cadrage Magie V5.
 * Module pur : aucune E/S, aucun tirage implicite, prévisualisations sans mutation d'état.
 */

import SPELL_CONTRACTS from '../data/v5-spell-contracts.json' with { type: 'json' };
import {
  resolveMagicMissile,
  resolveSpellDamage,
  resolveSpellHealing,
  applySpellEffects,
  expireSpellEffects,
  improveSapheryWards,
  parseSpellDuration,
  currentMagicRound,
  knownMovement,
  rebaseMagicLayers,
  refreshEffectLayers,
  DURATION_UNIT_LABELS
} from './v5-magic-effects.js';
import {spellFormulaValue} from './v5-magic-effects.js';
import {conjuredWeaponSkillScore} from './equipment.js';
import { acquireV5Conditions } from './v5-effects.js';
import {
  previewLoreAttribute,
  normalizeLoreId,
  applyLoreAttribute,
  isTargetUndead,
  isTargetDaemon,
  hasTargetNatureOrTrait,
  hasLivingMagicNature,
  isTargetWearingMetalArmor,
  hasArcaneMagicLore,
  arcaneMagicLores
} from './v5-magic-attributes.js';
import {
  previewBeastForm,
  applyBeastForm,
  BEAST_PROFILES,
  KADON_PROFILES,traitSize,
  transformationTraitsError,
  transformationOvercastCost,
  previewVerdantApotheosis,
  applyVerdantApotheosis,
  previewDaemonbane,
  applyDaemonbane,
  previewHandOfGlory,
  applyHandOfGlory,
  HAND_OF_GLORY_ELIGIBLE_STATS,
  KADON_REPLACED_CARACS,
  HOG_COST_REMOVE_BROKEN,
  HOG_COST_PURIFY,
  calculateSapheryWard,
  testSapheryWard,
  applyScytheOfShyishRules,
  beastFormRestriction
} from './v5-magic-arbitrations.js';
import {
  getChannellingReserve,
  clearChannellingReserve
} from './v5-magic-channelling.js';
import {
  previewCasting,
  prepareCastingOptions,
  getOvercastBenefit,
  validateOvercastChoices,
  CASTING_CRITICAL_CHOICES
} from './v5-magic-casting.js';
import {
  previewMiscast,
  applyMiscastToParticipant,
  explicitMagicDie,
  missingMagicDiceMessage
} from './v5-magic-miscasts.js';
import {
  calculateBurnoutRisk,
  isD100Double,
  previewBurnout,
  applyBurnout,
  consumeCadaiRune
} from './v5-magic-high.js';
import { previewV5Test, selectV5Test, reverseV5Roll } from './v5-roll.js';
import { reminderFlagTexts } from './v5-magic-reminder-flags.js';
import { resolveSpecificOvercast, specificOvercastReminder, raiseTraitRating, SPECIFIC_OVERCAST_KINDS } from './v5-magic-overcast-options.js';
import { normalizeArcaneOptions, previewArcaneUnforgiving, applyArcaneArmorDamage } from './v5-magic-arcane-unforgiving.js';
import { getReferenceCatalogue } from './reference-catalog.js';

export const V5_SPELL_CONTRACTS_VERSION = 'v5-spell-contracts-2026-10-10.3';

export const IMPLEMENTED_SPECIAL_HANDLERS = new Set([
  'abullas-snare', 'acceptance-of-fate', 'aethyric-arms', 'almanac', 'amaranth', 'amber-talons', 'amber-trance',
  'animal-friend', 'animal-speech', 'anticipated-enemy', 'apotheose', 'arcane-unforgiving', 'arrow-attraction',
  'arrow-shield', 'ash-and-dust', 'awakening-of-wood', 'azure-blades', 'bearings', 'beast-form', 'beast-master',
  'beast-tongue', 'bewilder', 'black-horrors', 'blessed-arrow', 'blood-swords', 'body-purification', 'bridge',
  'bridge-the-unknown', 'burning-head', 'calm', 'captivating-flame', 'careful-step', 'chain-attack',
  'choking-shadows', 'choleric', 'clarity-of-thought', 'colchis-transmogrification', 'comfort-zone', 'conserve',
  'crevasse', 'crystal-labyrinth', 'curse-of-fate', 'curse-of-rust', 'daemonbane', 'dance-of-despair',
  'dazzling-brightness', 'deadlock', 'deaths-release', 'deep-pockets', 'diagnose-disease', 'divination',
  'dome-ward-ranged', 'doppelganger', 'drain-life', 'drain-magic', 'drop-item', 'dwellers-below-spirits',
  'dying-words', 'eavesdrop', 'enchant-weapon', 'eyes-of-the-pack', 'eyes-of-volans', 'falling-leaves',
  'fantastic-premonition', 'fare-of-the-land', 'fate-of-bjuna', 'fickle-fingers', 'fiery-convocation',
  'firewall', 'first-portent', 'flaming-hearts', 'flaming-sword', 'flaw-of-form', 'flesh-to-stone',
  'fools-gold', 'forest-of-thorns', 'forge-of-chamon', 'forge-of-tarnus', 'fortune-is-fickle', 'four-winds-blow',
  'gardeners-warcry', 'geyser', 'gilded-cage', 'glamour-of-teclis', 'glittering-robe', 'golden-globe-gehenna',
  'golden-touch', 'goldsteel-plating', 'grand-illusion', 'green-thumb', 'grey-wings', 'gust',
  'habermas-refraction', 'hand-of-glory', 'hands-of-karkora', 'hearth-spirit', 'horn-of-andar',
  'ignition-spread', 'illuminate-edifice', 'illuminated-fate', 'illusion', 'imprisoned-soul',
  'inextinguishable-flame', 'inscription-acid', 'invigorating-song', 'invisibility', 'invisible-eye',
  'iron-voice', 'iyrtus-embrace', 'jade-casket', 'levorg-replica', 'leyline-tracking', 'lie-of-the-land',
  'light', 'light-of-purity', 'limb-withering', 'magic-flame', 'magic-shield', 'magical-alarm', 'magma-storm',
  'major-banishment', 'marsh-lights', 'meissner-instant-librarian', 'merciw-monstrous-regiment',
  'meteoric-ironclad', 'mind-mask', 'mindslip', 'minor-banishment', 'move-object', 'mundane-aura',
  'murmured-whisper', 'musk-spray', 'mutable-metal', 'mutable-visage', 'mystic-mirror', 'mystifying-miasma',
  'nature-whisper', 'open-lock', 'orb-of-hysh', 'ox-stands', 'parching-heat', 'path-of-paranoth',
  'perfect-comprehension', 'phas-protection', 'pierce-the-veil', 'pit-of-tarnus', 'polish-and-exalt',
  'protection-from-rain', 'puchta-silver-compass', 'purify-water', 'push', 'raise-edifice', 'remove-dirt',
  'restored-metal', 'reveal-magic', 'ribauld-retroactive-illusion', 'rot-armour', 'sanctify', 'sapphire-arch',
  'scent-tracking', 'scythe-of-shyish', 'second-portent', 'shadow-bridge', 'shadow-grove', 'shadow-substance',
  'shadowsteed', 'shadowstep', 'shemtek-storm', 'shield-of-saphery', 'shimmering-cloak', 'shyish-revelation',
  'silence-ulgu', 'sky-lens', 'sly-hands', 'soul-quench', 'sounds', 'speed-of-lykos', 'spiral-staircase',
  'spirit-compulsion', 'spirit-projection', 'spring', 'starcrossed', 'starshine', 'steel-scales-progressive',
  'stoked-flame', 'stone-assault', 'stratosphere-mistral', 'summon-mount', 'summon-small-animal',
  'swift-passage', 'swift-passing', 'taste-of-death', 'taste-of-fire-liquid', 'telepathy', 'teleport',
  'tempete', 'tesslas-arc', 'third-portent', 'thorsen-storm', 'tide-of-ages', 'time-amok', 'tin-armour',
  'traitor-of-tarn', 'transformation-of-kadon', 'trial-and-error', 'twitch', 'undone-knot', 'unshakable-will',
  'untamed-beast', 'vegetal-enchantment', 'vengeful-hood', 'verdant-apotheosis', 'vital-growth',
  'walk-between-worlds', 'wandering-shadow', 'warning-detect', 'wild-children-of-zandox', 'winter-coat',
  'wood-shape'
]);

const fold = str => String(str || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[—–]/g, '-')
  .replace(/[’']/g, "'")
  .toLowerCase()
  .trim();

/** États négatifs : jamais infligés au lanceur par un sort de cible « Vous » sans clause `selfHarm`. */
export const NEGATIVE_CONDITIONS = new Set(['aveugle', 'assourdi', 'sonne', 'extenue', 'enflamme', 'a terre', 'surpris', 'enchevetre', 'hemorragique', 'inconscient', 'distrait', 'brise', 'empoisonne', 'epuise']);

/**
 * Calcule le total des Points d'Armure (PA) portés sur les 6 localisations V5
 * (Tête, Corps, Bras gauche, Bras droit, Jambe gauche, Jambe droite).
 */
export function computeTotalWornApAllLocations(target, options = {}) {
  if (Number.isFinite(Number(options.totalWornAp)) && Number(options.totalWornAp) >= 0) {
    return Number(options.totalWornAp);
  }
  const ar = target?.armor ?? target?.armour ?? target?.protection;
  if (typeof ar === 'number' && Number.isFinite(ar) && ar >= 0) {
    return ar * 6;
  }
  if (ar && typeof ar === 'object' && !Array.isArray(ar)) {
    const head = Math.max(0, Number(ar.head ?? ar.tete ?? 0) || 0);
    const body = Math.max(0, Number(ar.body ?? ar.torso ?? ar.corps ?? 0) || 0);
    const arms = (ar.leftArm !== undefined || ar.rightArm !== undefined)
      ? Math.max(0, Number(ar.leftArm) || 0) + Math.max(0, Number(ar.rightArm) || 0)
      : 2 * Math.max(0, Number(ar.arms ?? ar.bras ?? 0) || 0);
    const legs = (ar.leftLeg !== undefined || ar.rightLeg !== undefined)
      ? Math.max(0, Number(ar.leftLeg) || 0) + Math.max(0, Number(ar.rightLeg) || 0)
      : 2 * Math.max(0, Number(ar.legs ?? ar.jambes ?? 0) || 0);
    return head + body + arms + legs;
  }
  if (Number.isFinite(Number(target?.ap)) && Number(target.ap) > 0) {
    return Number(target.ap) * 6;
  }
  return 0;
}

/**
 * Retourne la spécification explicite de test secondaire d'un contrat (si applicable).
 * Un sort sans test secondaire déclaré ne déclenche jamais de jet de résistance universel.
 */
export function getSecondaryTestSpec(contract) {
  if (!contract || typeof contract !== 'object') return null;
  const effects = contract.effects || {};
  const specialTag = effects.special || effects.mjInput?.special;
  if (effects.secondaryTest && typeof effects.secondaryTest === 'object') {
    return effects.secondaryTest;
  }
  if (specialTag === 'calm' || effects.removeFrenzy || Array.isArray(effects.removePsychology)) {
    return {
      actor: 'caster',
      mandatory: true,
      skill: 'Sociabilité',
      stat: 'Soc',
      modifierSl: 0,
      opposed: false,
      rollField: 'fellowshipRoll'
    };
  }
  if (specialTag === 'body-purification' || effects.purgeIngestedPoison) {
    return {
      actor: 'caster',
      mandatory: true,
      skill: 'Endurance',
      stat: 'E',
      modifierSl: 0,
      opposed: false,
      rollField: 'enduranceRoll'
    };
  }
  // WoM : le Test de Résistance du supplément (Difficile −10) devient un modificateur de DR ; réussir un Test d'Athlétisme n'évite que l'État d'échec.
  if (Number.isFinite(Number(effects.resistanceModifierSl))) {
    return { actor: 'target', mandatory: false, skill: 'Résistance', stat: 'E', modifierSl: Number(effects.resistanceModifierSl), opposed: false, rollField: 'resistanceRoll' };
  }
  if (Number.isFinite(Number(effects.athleticsTestSl)) && effects.failCondition) {
    return { actor: 'target', mandatory: false, skill: 'Athlétisme', stat: 'Ag', modifierSl: Number(effects.athleticsTestSl), opposed: false, rollField: 'resistanceRoll', failCondition: effects.failCondition };
  }
  const targetTestBySpecial = {
    'twitch': { actor: 'target', mandatory: false, skill: 'Résistance', stat: 'E', modifierSl: 0, opposed: false, rollField: 'resistanceRoll' },
    // V5 p. 244 : Test de Dextérité Intermédiaire (+0 DR), sinon l'objet est lâché.
    'drop-item': { actor: 'target', mandatory: false, skill: 'Dextérité', stat: 'Dex', modifierSl: 0, opposed: false, rollField: 'resistanceRoll' },
    'mindslip': { actor: 'target', mandatory: false, skill: 'Calme', stat: 'FM', modifierSl: 0, opposed: true, rollField: 'resistanceRoll' },
    'beast-master': { actor: 'target', mandatory: false, skill: 'Force Mentale', stat: 'FM', modifierSl: 0, opposed: true, rollField: 'resistanceRoll' },
    'glamour-of-teclis': { actor: 'target', mandatory: false, skill: 'Intuition', stat: 'I', modifierSl: -2, opposed: false, rollField: 'resistanceRoll' },
    'illusion': { actor: 'target', mandatory: false, skill: 'Intuition', stat: 'I', modifierSl: -1, opposed: false, rollField: 'resistanceRoll' }
  };
  if (specialTag && targetTestBySpecial[specialTag]) {
    return targetTestBySpecial[specialTag];
  }
  return null;
}

/**
 * Retourne la liste des options de choix MJ déclarées dans un contrat de sort, ou [] s'il n'y en a pas.
 */
export function getContractChoiceOptions(contract) {
  if (!contract || typeof contract !== 'object') return [];
  const rawMj = contract.effects?.mjInput || {};
  if (Array.isArray(rawMj.options) && rawMj.options.length > 0) return [...rawMj.options];
  if (Array.isArray(rawMj.modes) && rawMj.modes.length > 0) return [...rawMj.modes];
  if (Array.isArray(rawMj.mode) && rawMj.mode.length > 0) return [...rawMj.mode];
  if (Array.isArray(rawMj.monsterChoices) && rawMj.monsterChoices.length > 0) return [...rawMj.monsterChoices];
  return [];
}

/**
 * Détermine si une cible est hostile au lanceur.
 * RÈGLE : s'appuie sur le camp (`camp` ou `side`), jamais sur `type` ou `kind` ('PJ' / 'PNJ').
 */
export function isHostileTarget(actor, target) {
  if (!target || typeof target !== 'object') return false;
  if (actor && target.id === actor.id) return false;
  const actorCamp = fold(actor?.camp || actor?.side || '');
  const targetCamp = fold(target?.camp || target?.side || '');
  if (target.hostile === true || target.isEnemy === true) return true;
  if (actorCamp === 'ennemi' || actorCamp === 'enemy' || actorCamp === 'hostile') {
    return targetCamp === 'pj' || targetCamp === 'allie' || targetCamp === 'ally';
  }
  return targetCamp === 'ennemi' || targetCamp === 'enemy' || targetCamp === 'hostile';
}

/**
 * Valide le nombre et l'admissibilité des cibles d'un sort selon son contrat et sa surpuissance.
 */
export function validateSpellTargets(contract, actor, targets = [], overcastTargetsBonus = 0, options = {}) {
  if (!contract || typeof contract !== 'object') {
    return { valid: false, status: 'missing-contract', error: 'Contrat manquant' };
  }
  const effectiveTargets = Array.isArray(targets) ? targets.filter(Boolean) : (targets ? [targets] : []);
  const targetStr = String(contract.target || '').trim();
  const isAoE =
    /zde|zone|aoe|spécial|special/i.test(targetStr) ||
    Boolean(contract.effects?.aoe) ||
    Boolean(contract.isVortex) ||
    Boolean(contract.isAuxiliary) ||
    contract.effects?.type === 'vortex' ||
    contract.effects?.type === 'summon';

  let baseMaxTargets = contract.effects?.targetMaximumFormula?spellFormulaValue(contract.effects.targetMaximumFormula,actor):Number.isInteger(contract.effects?.maxTargets) ? contract.effects.maxTargets : null;
  if (!isAoE && baseMaxTargets===null) {
    if (/2\s*[×x*]\s*bonus\s*d['’]initiative/i.test(targetStr)) {
      const bi = Math.max(1, Math.floor((Number(actor?.caracs?.I) || 30) / 10));
      baseMaxTargets = 2 * bi;
    } else {
      baseMaxTargets = 1;
    }
  }

  const maxTargets = baseMaxTargets !== null ? (baseMaxTargets + (Number(overcastTargetsBonus) || 0)) : null;

  if (maxTargets !== null && effectiveTargets.length > maxTargets) {
    return {
      valid: false,
      status: 'invalid-target-count',
      isAoE,
      baseMaxTargets,
      overcastTargetsBonus: Number(overcastTargetsBonus) || 0,
      maxTargets,
      actualTargets: effectiveTargets.length,
      error: `Nombre de cibles invalide pour ${contract.name} : ${effectiveTargets.length} cible(s) sélectionnée(s) pour un maximum autorisé de ${maxTargets} (cible du contrat : "${targetStr}"${overcastTargetsBonus > 0 ? `, +${overcastTargetsBonus} en surpuissance` : ''}).`
    };
  }

  const excludeCaster = Boolean(contract.effects?.excludeCaster || contract.effects?.special === 'merciw-monstrous-regiment');
  if (excludeCaster && actor?.id && effectiveTargets.some(t => t.id === actor.id)) {
    return {
      valid: false,
      status: 'invalid-target-admissibility',
      isAoE,
      maxTargets,
      excludeCaster: true,
      error: `Cible non admissible pour ${contract.name} : le lanceur ne peut pas se cibler lui-même.`
    };
  }

  const isSelfOnly =
    /^vous$/i.test(targetStr) &&
    !isAoE &&
    (Number(overcastTargetsBonus) || 0) === 0 &&
    contract.effects?.special !== 'iron-voice';

  if (isSelfOnly && actor?.id && effectiveTargets.some(t => t.id !== actor.id)) {
    return {
      valid: false,
      status: 'invalid-target-admissibility',
      isAoE,
      maxTargets,
      selfOnly: true,
      error: `Cible non admissible pour ${contract.name} : ce sort a pour cible "Vous" et ne peut cibler que le lanceur.`
    };
  }

  const alliesOnlySpecials = new Set([
    'hand-of-glory',
    'ox-stands',
    'shield-of-saphery',
    'acceptance-of-fate',
    'time-amok',
    'merciw-monstrous-regiment',
    'iron-voice'
  ]);
  const alliesOnlyNames = new Set([
    'Main de Gloire',
    'Le Bœuf Reste Debout',
    'Bouclier de Saphery',
    'Ironie du Destin',
    'Lunes du Chasseur',
    'Dérèglement temporel',
    'Régiment Monstrueux de Merciw'
  ]);
  const isAlliesOnly =
    Boolean(contract.effects?.alliesOnly) ||
    alliesOnlySpecials.has(contract.effects?.special) ||
    alliesOnlyNames.has(contract.name);

  if (isAlliesOnly && effectiveTargets.some(t => isHostileTarget(actor, t))) {
    return {
      valid: false,
      status: 'invalid-target-admissibility',
      isAoE,
      maxTargets,
      alliesOnly: true,
      error: `Cible non admissible pour ${contract.name} : ce sort ne peut affecter que des alliés.`
    };
  }

  if ((contract.effects?.special === 'daemonbane' || contract.name === 'Fléau des Démons') && effectiveTargets.length > 0) {
    const nonDaemon = effectiveTargets.find(t => !isTargetDaemon(t));
    if (nonDaemon) {
      return {
        valid: false,
        status: 'invalid-target-admissibility',
        isAoE,
        maxTargets,
        daemonOnly: true,
        error: `Cible non admissible pour ${contract.name} : ${nonDaemon.name || nonDaemon.id} n'est pas un Démon.`
      };
    }
  }

  return {
    valid: true,
    status: 'ok',
    isAoE,
    baseMaxTargets,
    overcastTargetsBonus: Number(overcastTargetsBonus) || 0,
    maxTargets,
    alliesOnly: isAlliesOnly,
    excludeCaster
  };
}

export function previewScytheOfShyish(caster) {
  return {
    spellName: 'La Faux de Shyish',
    casterId: caster?.id,
    summary: 'La Faux de Shyish : hallebarde Magique (BF + BFM + 4) invoquée. Les Morts-vivants engagés contre le porteur sont privés d’Avantage V5 (Élan conservé).',
    ready: true
  };
}

// Indexation rapide par ID, nom normalisé et nom canonique normalisé
const contractById = new Map();
const contractByName = new Map();
const contractByCanonicalName = new Map();

for (const c of SPELL_CONTRACTS) {
  if(c.name==='Tempête')contractByName.set(fold('empête'),c);
  contractById.set(c.id, c);
  const foldedName = fold(c.name);
  contractByName.set(foldedName, c);
  const strippedName = foldedName.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (strippedName && !contractByName.has(strippedName)) {
    contractByName.set(strippedName, c);
  }
  if (c.canonicalName) {
    contractByCanonicalName.set(fold(c.canonicalName), c);
  }
}

/**
 * Recherche et retourne un contrat de sort par ID, nom français ou nom canonique anglais.
 * Respecte l'interdiction d'alias historiques pour les 3 sorts retirés.
 */
export function getSpellContract(identifier) {
  if (!identifier) return null;
  if (typeof identifier === 'object' && identifier.id) {
    return contractById.get(identifier.id) || identifier;
  }

  const str = String(identifier).trim();
  if (contractById.has(str)) {
    return contractById.get(str);
  }

  const folded = fold(str);

  // Vérifier les 3 anciens titres supprimés (interdiction stricte d'alias)
  if (folded === 'couronne de flammes' || folded === "l'or des fous" || folded === 'fauche-demon') {
    return null;
  }

  if (contractByName.has(folded)) {
    return contractByName.get(folded);
  }

  if (contractByCanonicalName.has(folded)) {
    return contractByCanonicalName.get(folded);
  }

  // Recherche par correspondance partielle sur le nom si non ambigu
  for (const [key, contract] of contractByName.entries()) {
    if (key === folded) return contract;
  }

  return null;
}

/**
 * Retourne la liste de tous les contrats de sorts V5.
 */
export function getAllSpellContracts() {
  return [...SPELL_CONTRACTS];
}

/**
 * Vérifie la correspondance de l'empreinte sha256 source.
 * Si la description ou les paramètres sources ont changé, l'automatisation est désactivée
 * (pas d'exécution automatique d'un contrat obsolète), tout en permettant la consultation textuelle.
 */
export function validateSpellFingerprint(contract, sourceSpell) {
  if (!contract || typeof contract !== 'object') {
    return { valid: false, reason: 'missing_contract' };
  }
  if (!sourceSpell || typeof sourceSpell !== 'object') {
    return { valid: false, reason: 'missing_source_spell' };
  }

  const expectedFp = contract.sourceFingerprint;
  if (!expectedFp) {
    return { valid: true };
  }

  // Si le sort source a son empreinte déclarée (ex: fiche, audit, snapshot)
  const sourceFp = sourceSpell.sourceFingerprint || sourceSpell.fingerprint || sourceSpell.source?.fingerprint;
  if (sourceFp) {
    const valid = sourceFp === expectedFp;
    return {
      valid,
      reason: valid ? 'match' : 'fingerprint_mismatch',
      expectedFingerprint: expectedFp,
      sourceFingerprint: sourceFp
    };
  }

  // Si le sort source a un hash d'empreinte dans ses métadonnées
  if (sourceSpell.sha256) {
    const prefixed = sourceSpell.sha256.startsWith('sha256:') ? sourceSpell.sha256 : `sha256:${sourceSpell.sha256}`;
    const valid = prefixed === expectedFp;
    return {
      valid,
      reason: valid ? 'match' : 'fingerprint_mismatch',
      expectedFingerprint: expectedFp,
      sourceFingerprint: prefixed
    };
  }

  // Si aucune empreinte n'est présente sur le sort source, vérifier si la description correspond
  const desc = sourceSpell.desc || sourceSpell.description;
  if (desc && typeof desc === 'string') {
    if (sourceSpell.modified === true || sourceSpell.descriptionChanged === true) {
      return {
        valid: false,
        reason: 'description_changed',
        expectedFingerprint: expectedFp
      };
    }
    try {
      const cat = getReferenceCatalogue();
      const catalogSpell = cat?.magic?.spells?.find(s => fold(s.nom || s.name) === fold(contract.name));
      if (catalogSpell && catalogSpell.desc && desc.trim() !== catalogSpell.desc.trim()) {
        return {
          valid: false,
          reason: 'description_changed',
          expectedFingerprint: expectedFp,
          catalogDesc: catalogSpell.desc,
          sourceDesc: desc
        };
      }
    } catch {
      // Catalogue indisponible
    }
  }

  return { valid: true };
}

/** Table de mouvement des vortex (Winds of Magic p. 21, colonne « Map Based ») : d10 → direction. */
export const VORTEX_COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const VORTEX_MOVEMENT = { 1: 'disappears', 2: 'N', 3: 'NE', 4: 'E', 5: 'stays', 6: 'SE', 7: 'S', 8: 'SW', 9: 'W', 10: 'NW' };
export function vortexMovementFromDie(roll) {
  const die = explicitMagicDie(roll, 'd10');
  return die === null ? null : VORTEX_MOVEMENT[die];
}

/**
 * Résout le déplacement et les effets d'un vortex magique (Winds of Magic pp. 20-21, Random Vortices).
 * Round de lancer : le lanceur choisit la direction et fait un Test de Force Mentale Accessible (+2 DR) — réussite : 2d10 yards dans la direction
 * choisie ; échec : direction aléatoire (d10 de la table, 1 = le vortex disparaît, 5 = il reste en place). Les mouvements des Rounds suivants
 * (fin du Tour du lanceur, d10 + 2d10 yards) restent suivis à la table par le MJ : le moteur ne déplace pas de pions.
 * Propose direction et distance, puis applique les conséquences aux cibles réellement traversées (saisie MJ).
 */
export function resolveVortexTrajectory({ contract, caster, direction, distance, targetsCrossed = [], options = {} } = {}) {
  if(contract.effects?.vortexMovementOnly){
    const movement=vortexMovementFromDie(options.directionRoll),yards=explicitMagicDie(options.distanceRoll,'2d10');
    if(!movement || yards===null)return {ready:false,missing:['directionRoll','distanceRoll'],summary:'Tempête : direction d10 et déplacement 2d10 explicites, sans Test de FM.'};
    return {ready:true,spellName:contract.name,direction:movement,distance:['stays','disappears'].includes(movement)?0:yards,disappears:movement==='disappears',crossedReceipts:[],summary:'Tempête : '+movement+', '+yards+' mètres ; occupants déclarés aux frappes du Round.'};
  }
  const willpower = options.willpowerSuccess === true || options.willpowerSuccess === 'success' ? true
    : options.willpowerSuccess === false || options.willpowerSuccess === 'failure' ? false : null;
  let finalDirection = null, vortexOutcome = null;
  const missing = [];
  if (willpower === null) missing.push('vortexWillpower');
  else if (willpower) {
    finalDirection = VORTEX_COMPASS.includes(direction) ? direction : null;
    if (!finalDirection) missing.push('direction');
  } else {
    const movement = vortexMovementFromDie(options.directionRoll);
    if (movement === null) missing.push('directionRoll');
    else if (movement === 'disappears' || movement === 'stays') vortexOutcome = movement;
    else finalDirection = movement;
  }

  const bfm = Math.max(1, Math.floor((Number(caster?.caracs?.FM) || 30) / 10));
  const moves = vortexOutcome === null;
  const finalDistance = !moves ? 0 : distance ?? explicitMagicDie(options.distanceRoll, '2d10');
  if (moves && (!Number.isInteger(finalDistance) || finalDistance<2 || finalDistance>20)) missing.push('distanceRoll');
  if (missing.length) {
    return { ready: false, missing, spellName: contract.name, summary: 'Vortex : saisir le Test de Force Mentale (+20), la direction choisie (réussite) ou le d10 de direction (échec), et la distance (2d10 yards).' };
  }

  if(contract.effects?.vortex)return {ready:true,trajectory:{direction:finalDirection || vortexOutcome,distance:finalDistance,radius:2*bfm,willpowerSuccess:willpower,outcome:vortexOutcome},crossedReceipts:[],summary:contract.name+' : '+(finalDirection || vortexOutcome)+', '+finalDistance+' mètres.'};
  const radius = bfm;
  const sl = options.sl ?? options.castingSl ?? 0;

  const crossed = vortexOutcome === 'disappears' ? [] : targetsCrossed;
  const crossedReceipts = [];
  for (const target of crossed) {
    const receipt = {
      targetId: target.id,
      targetName: target.name || target.id,
      woundsLost: 0,
      actions: [],
      conditions: []
    };

    const cName = contract.canonicalName || contract.name;
    if (cName === 'Tempête' || contract.name === 'Tempête') {
      // empête / Tempête : vol Dégâts +5, -20 CC/CT (carac), -3 DR tests CT, chute 50m/round
      const dmg = 5 + sl;
      receipt.woundsLost += dmg;
      receipt.statModifiers = { CC: -20, CT: -20 };
      receipt.actions.push({ kind: 'vortex-storm', damage: dmg, summary: `Tempête : ${dmg} Dégâts, -20 CC/CT` });
    } else if (contract.name === 'Tempête Magmatique' || cName === 'Magma Storm') {
      const dmg = 8 + sl;
      receipt.woundsLost += dmg;
      receipt.conditions.push('Enflammé');
      receipt.actions.push({ kind: 'vortex-magma', damage: dmg, condition: 'Enflammé', summary: `Tempête Magmatique : ${dmg} Dégâts, 1 État Enflammé` });
    } else if (contract.name === 'Orage de Thorsen' || cName === 'Thorsen’s Thunderstorm') {
      const dmg = 10 + sl;
      receipt.woundsLost += dmg;
      receipt.conditions.push('À Terre');
      receipt.actions.push({ kind: 'vortex-thorsen', damage: dmg, condition: 'À Terre', summary: `Orage de Thorsen : ${dmg} Dégâts, 1 État À Terre` });
    } else if (contract.name === 'Globe doré de Gehenna') {
      receipt.conditions.push('Sonné');
      receipt.actions.push({ kind: 'vortex-golden-globe', summary: 'Globe doré de Gehenna : Toucher doré appliqué' });
    } else if (contract.name === 'Cendres et Poussière') {
      const dmg = 6 + sl;
      receipt.woundsLost += dmg;
      receipt.conditions.push('Exténué');
      receipt.actions.push({ kind: 'vortex-ash-dust', damage: dmg, condition: 'Exténué', summary: `Cendres et Poussière : ${dmg} Dégâts, 1 État Exténué` });
    } else if (contract.name === 'Vortex d’Âmes') {
      receipt.conditions.push('Brisé');
      if (isTargetUndead(target)) {
        const dmg = 8 + bfm; // projectile +8 : BFM + 8, ignore BE et PA (V5 p. 247)
        receipt.woundsLost += dmg;
        receipt.actions.push({ kind: 'vortex-souls-undead', damage: dmg, condition: 'Brisé', summary: `Vortex d’Âmes : ${dmg} Dégâts directs (Mort-vivant), 1 État Brisé` });
      } else {
        receipt.actions.push({ kind: 'vortex-souls', condition: 'Brisé', summary: 'Vortex d’Âmes : 1 État Brisé' });
      }
    } else {
      const baseDmg = contract.effects?.damage?.raw ?? 6;
      const dmg = baseDmg + sl;
      receipt.woundsLost += dmg;
      receipt.actions.push({ kind: 'vortex-generic', damage: dmg, summary: `Vortex : ${dmg} Dégâts` });
    }

    crossedReceipts.push(receipt);
  }

  return {
    ready: true,
    spellName: contract.name,
    trajectory: {
      direction: finalDirection,
      distance: finalDistance,
      radius,
      willpowerSuccess: willpower,
      ...(vortexOutcome ? { outcome: vortexOutcome } : {})
    },
    targetsCrossed: crossed.map(t => ({ id: t.id, name: t.name })),
    crossedReceipts,
    summary: vortexOutcome === 'disappears' ? `Vortex ${contract.name} : direction aléatoire (1), le vortex disparaît.`
      : vortexOutcome === 'stays' ? `Vortex ${contract.name} : direction aléatoire (5), le vortex reste en place. ${targetsCrossed.length} cible(s) traversée(s).`
      : `Vortex ${contract.name} déplacé de ${finalDistance} yards vers le ${finalDirection}${willpower ? '' : ' (direction aléatoire)'}. ${targetsCrossed.length} cible(s) traversée(s).`
  };
}

/**
 * Crée les créatures auxiliaires pour les invocations magiques (Phase 3.4).
 * Conforme aux clauses des Enfants Sauvages de Zandox, Épées Sanguines, Œil Invisible, etc.
 */
export function resolveAuxiliarySummons({ contract, caster, options = {} } = {}) {
  const auxiliaries = [];
  const cName = contract.canonicalName || contract.name;
  const bfm = Math.max(1, Math.floor((Number(caster?.caracs?.FM) || 30) / 10));

  if (contract.effects?.summonProfile) {
    const profile = BEAST_PROFILES[contract.effects.summonProfile];
    const traits = [...profile.traits, ...(options.domainFacts.sunlight ? [] : contract.effects.summonNightTraits)];
    for (let i=0;i<Math.max(1,options.summonCount || 1);i++) auxiliaries.push({id: `aux-${contract.id}-${uid()}`, name: contract.name, M: profile.M, zone:'active',camp:caster.camp,initiative:profile.caracs.I,
      caracs: {...profile.caracs, M: profile.M}, hp: profile.wounds, maxHp: profile.wounds,
      traits, skills: profile.skills.map(([name,total])=>({name,total})),
      actions: profile.attacks.map(a=>({...a,type:'melee',skill:'Corps à corps (Bagarre)'})),
      armor: {head:0,body:0,arms:0,legs:0}, isAuxiliary: true, casterId: caster.id, noMomentum: false,
      extensions: {v5: {summonedBySpellId:contract.id, summonedUntilRound: Number(options.round || 1) + options.domainFacts.minutesToDawn * 6}}
    });
  } else if (contract.effects?.summon?.indestructible) {
    const spec={...contract.effects.summon},sl=options.castingSl || 0;if(spec.wsFormula)spec.ws=spellFormulaValue(spec.wsFormula,caster);
    const count=spec.count;
    for(let i=0;i<count;i++)auxiliaries.push({id:'aux-'+contract.id+'-'+uid(),name:spec.name+' '+(i+1),ws:spec.ws,damage:spec.damage,
      caracs:{CC:spec.ws,M:spec.fly || spec.move || 0},hp:null,maxHp:null,traits:[...(spec.invisible?['Invisible']:[]),...(spec.fly?['Vol ('+spec.fly+')']:[]),spec.destroyedByWater || 'Invulnérable sauf dissipation'],
      invisible:spec.invisible || false,actions:[],isAuxiliary:true,casterId:caster.id,noMomentum:spec.noMomentum,extensions:{v5:{summonedBySpellId:contract.id,indestructible:true,summonAttack:spec}}});
  } else if (contract.name === 'Œil Invisible' || cName === 'Œil Invisible') {
    auxiliaries.push({
      id: `aux-invisible-eye-${Date.now()}`,
      name: 'Œil Invisible',
      hp: contract.effects.summon.hp,
      maxHp: contract.effects.summon.hp,
      isAuxiliary: true,
      sensor: true,
      casterId: caster?.id,
      traits: ['Invisible','Acuité sensorielle (Vue)','Vol (120)',...(contract.effects?.summon?.extraSenses || [])],
      talents:contract.effects?.summon?.extraSenses?.length?[{id:'talent-magical-sense',rank:1,status:'resolved'},{id:'talent-second-sight',rank:1,status:'resolved'}]:[],
      skills:[{name:'Perception',total:effectiveSkillScore(caster,Number((caster.skills || []).find(s=>spellSkillMatches(s,'Langue (Magick)'))?.total ?? (caster.skills || []).find(s=>spellSkillMatches(s,'Langue (Magick)'))?.value ?? caster.caracs?.Int),'Int')}],
      extensions:{v5:{eyeOwner:caster.id,summonedBySpellId:contract.id}}
    });
  } else {
    auxiliaries.push({
      id: `aux-${contract.id}-${Date.now()}`,
      name: `Auxiliaire de ${contract.name}`,
      hp: 10,
      maxHp: 10,
      isAuxiliary: true,
      casterId: caster?.id
    });
  }

  return {
    ready: true,
    contract,
    auxiliaries,
    summary: `${auxiliaries.length} auxiliaire(s) invoqué(s) par ${caster?.name || caster?.id}.`
  };
}

/**
 * Construit le récapitulatif des conséquences durables pour les 31 sorts "suivi fiche" (Phase 3.4).
 * Ne modifie en aucun cas les fiches sources réelles (garantie d'intégrité).
 */
export function buildFicheFollowUpReceipt({ contract, actor, targets = [], options = {} } = {}) {
  if (!contract?.ficheFollowUp) {
    return null;
  }

  const consequences = [];
  const text = `${contract.effectPlan || ''} ${contract.reminders || ''}`.toLowerCase();

  if (text.includes('corruption')) {
    consequences.push('Exposition modérée à la Corruption (nécessite un test de Corruption sur la fiche)');
  }
  if (text.includes('destin')) {
    consequences.push('Point de Destin à ajuster sur la fiche du participant');
  }
  if (text.includes('chance')) {
    consequences.push('Point de Chance à ajuster sur la fiche du participant');
  }
  if (text.includes('objet') || text.includes('arme') || text.includes('armure') || text.includes('cuir') || text.includes('métal')) {
    consequences.push('Modification ou dommage d’équipement à enregistrer dans l’inventaire de la fiche');
  }
  if (text.includes('permanent') || text.includes('perte') || text.includes('bmax')) {
    consequences.push('Conséquence permanente de caractéristique ou Blessures max à consigner sur la fiche');
  }
  if (text.includes('maladie') || text.includes('poison')) {
    consequences.push('Affliction (maladie/poison) à retirer ou transférer sur la fiche');
  }
  if (text.includes('yenlui')) {
    consequences.push('Points de Yenlui à consigner sur la fiche');
  }

  if (consequences.length === 0) {
    consequences.push('Conséquence durable à vérifier et reporter manuellement sur la fiche');
  }

  return {
    spellId: contract.id,
    spellName: contract.name,
    actorId: actor?.id,
    targetIds: targets.map(t => t.id),
    reminders: contract.reminders,
    requiresSheetFollowUp: true,
    sheetSafe: true,
    consequences
  };
}

/**
 * Valide les prérequis des 2 Vents nécessaires pour les sorts d'Arcane Elfique.
 */
export function validateElvenArcaneRequirements(contract, actor, availableWinds = []) {
  if (contract?.domain !== 'elven-arcane' || !Array.isArray(contract.wind)) {
    return { valid: true };
  }

  const requiredWinds = contract.wind;
  const actorWinds = Array.isArray(availableWinds) && availableWinds.length > 0
    ? availableWinds
    : (actor?.knownWinds || actor?.lores || []);

  return {
    valid: true,
    requiredWinds,
    actorWinds,
    summary: `Sort d'Arcane Elfique requérant deux Vents : ${requiredWinds.join(' & ')}.`
  };
}

/** Un sort qui modifie le Mouvement ne devine jamais la base : le MJ renseigne le Mouvement du participant. */
const movementRequired = (target, contract) => ({ ready: false, valid: false, status: 'movement-required', missing: ['movement'], error: `Mouvement du participant requis : ${target.name || target.id} n’a pas de Mouvement connu, saisissez-le avant de lancer ${contract.name}.`, contract });

/**
 * Prévisualisation déterministe de l'exécution d'un contrat de sort V5.
 * Ne modifie aucun participant ni état (fonction pure).
 */
const SECONDARY_GROUPS = [
  { group: 'engaged', conditions: 'engagedEnemyConditions', damage: 'engagedEnemyDamage', test: 'engagedEnemyTest', label: 'ennemi engagé ou créature affectée' },
  { group: 'attacker', conditions: 'attackerConditions', label: 'attaquant' }
];

/**
 * S-07 : destinataires secondaires d'un sort (ennemis engagés, attaquant) désignés par le MJ dans `options.secondaryTargets`,
 * jamais déduits. Renvoie les États et Blessures à appliquer à chacun, des rappels pour les catégories sans destinataire,
 * ou `blocked` quand un jet ou une désignation manque.
 */
// V5 p. 248 : Endurance de la source anglaise correspond à Résistance sur une fiche française.
function spellSkillMatches(skill,name) {
  const canonical=value=>['endurance','resistance'].includes(fold(value))?'endurance':fold(value);
  return canonical(skill.name || skill.nom || skill.sourceName)===canonical(name);
}

function previewSecondaryRecipients(contract, actor, options, spellNature, sl, primaryResults=[]) {
  const effects = contract.effects || {};
  const participants = options.participants || [];
  const results = [];
  const reminders = [];
  if(effects.secondaryWhen && !primaryResults.some(row=>effects.secondaryWhen.path.split('.').reduce((value,key)=>value?.[key],row)===effects.secondaryWhen.value)) return {results,reminders};
  if (effects.triggeredConditions?.length) reminders.push(`${contract.name} : ${effects.triggeredConditions.join(', ')} à appliquer par le MJ quand la condition décrite par le sort se produit.`);
  for (const spec of SECONDARY_GROUPS) {
    const conditions = effects[spec.conditions] || [];
    const damage = spec.damage ? effects[spec.damage] : null;
    const testModifiers=spec.group==='engaged'?effects.engagedEnemyTestModifiers:null;
    if (!conditions.length && !damage && !testModifiers) continue;
    const ids = [...new Set(options.secondaryTargets?.[spec.group] || [])];
    if (!ids.length) { reminders.push(`${contract.name} : aucun ${spec.label} désigné, rien n'est appliqué à cette catégorie.`); continue; }
    for (const id of ids) {
      const target = participants.find(p => p.id === id);
      if (!target || id === actor.id && !effects.allowCasterSecondary) return { blocked: { error: `${contract.name} : ${spec.label} désigné introuvable ou identique au lanceur.` } };
      const row = { group: spec.group, targetId: id, targetName: target.name || id, conditions: [], woundsLost: 0 };
      if(testModifiers){
        if(effects.engagedEnemyLivingOnly && !hasLivingMagicNature(target)){row.immune='Créature non vivante';results.push(row);continue;}
        row.testModifiers=testModifiers;
      }
      // Coups récurrents (Lames Azurées) : pas de dégâts au lancement, l'effet les porte à chaque Tour de l'adversaire désigné.
      if (damage?.recurring) { row.recurring = damage.recurring; results.push(row); continue; }
      const testSpec = spec.test ? effects[spec.test] : null;
      if (testSpec) {
        const roll = options.targetTests?.[id]?.roll;
        if (roll === undefined || roll === null || roll === '' || !Number.isFinite(Number(roll))) {
          return { blocked: { status: 'secondary-test-required', missing: ['targetTests'], error: `${contract.name} : saisir le jet de ${testSpec.skill} (+0 DR) de ${row.targetName}.` } };
        }
        // Un Test utilise la compétence du personnage si elle existe (Endurance), sinon la caractéristique.
        const skill = (Array.isArray(target.skills) ? target.skills : []).find(s => spellSkillMatches(s,testSpec.skill));
        const score = effectiveSkillScore(target, skill?.total ?? skill?.value ?? skill?.score ?? baseCharacteristicScore(target, testSpec.stat), testSpec.stat);
        row.test = { skill: testSpec.skill, stat: testSpec.stat, score, roll: Number(roll), passed: Number(roll) <= score };
      }
      if (row.test?.passed) { results.push(row); continue; }
      // Lumière aveuglante (V5 p. 251) : les créatures qui possèdent la Magie des Arcanes du Domaine concerné y sont immunisées.
      if (spec.group === 'engaged' && effects.engagedEnemyImmuneLore && hasArcaneMagicLore(target, effects.engagedEnemyImmuneLore)) { row.immune = 'Magie des Arcanes (Lumière)'; results.push(row); continue; }
      row.conditions = [...conditions];
      if (damage) {
        const rolls = options.secondaryRolls?.[id] || [];
        const hits = Math.max(1, Number(damage.hits) || 1);
        const needsLocation = !damage.dice && !damage.ignoreAp && !damage.directWounds;
        const count = damage.dice ? 1 : needsLocation ? hits : 0;
        const upTo = damage.dice ? 10 : 100;
        if (rolls.length < count || rolls.slice(0, count).some(r => !Number.isInteger(r) || r < 1 || r > upTo)) {
          return { blocked: { status: 'dice-required', missing: ['secondaryRolls'], error: `${contract.name} : saisir ${count} jet(s) ${damage.dice ? 'de dégâts (1d10)' : 'de localisation (1d100)'} pour ${row.targetName}.` } };
        }
        let total = 0;
        for (let i = 0; i < hits; i++) {
          total += resolveSpellDamage({
            caster: actor, target, formula: damage.dice ? String(rolls[0]) : damage.formula, spell: { ...contract },
            roll: needsLocation ? reverseV5Roll(rolls[i]) : undefined, sl,
            ignoreAp: damage.ignoreAp || false, directWounds: damage.directWounds || false
          }).finalDamage;
        }
        const protection = previewMagicProtection(target, total, { wardRoll: options.targetTests?.[id]?.wardRoll, nature: spellNature(options.targetTests?.[id]?.attackNature) });
        if (!protection.ready) return { blocked: { error: `${row.targetName} : ${protection.error}` } };
        row.magicProtection = protection;
        row.woundsLost = Math.min(Number(target.hp) || 0, protection.amount);
      }
      results.push(row);
    }
  }
  if(effects.collisionConditions){
    for(const id of [...new Set(options.secondaryTargets?.collision || [])]){
      const target=participants.find(p=>p.id===id),answer=options.targetTests?.[id];
      if(!target || !Number.isInteger(answer?.targetSize) || !Number.isInteger(answer?.pushedSize))return {blocked:{status:'mj-fact-required',error:'Collision : créature et Tailles des deux protagonistes requises.'}};
      results.push({group:'collision',targetId:id,targetName:target.name,conditions:answer.targetSize<=answer.pushedSize?effects.collisionConditions:[],woundsLost:0});
    }
  }
  return { results, reminders };
}

// HEPG p. 84 : l'écart entre le jet d'incident saisi et celui de l'incident transmis n'est admis que pour une relance Cadai annoncée sur ce jet.
const miscastCadaiReroll = (options, rolled) => (options.cadaiRerolls ?? (options.useCadaiRune ? [{ purpose: options.cadaiPurpose || 'test', roll: options.cadaiRoll }] : []))
  .some(reroll => reroll?.purpose === 'miscast' && Number(reroll.roll) === Number(rolled));

export function previewSpellExecution(actor, contractOrId, targets = [], options = {}) {
  const contract = typeof contractOrId === 'object' && contractOrId.id ? contractOrId : getSpellContract(contractOrId);

  if (!contract) {
    return {
      ready: false,
      valid: false,
      error: `Contrat de sort introuvable : ${contractOrId}`
    };
  }

  if(contract.domain==='high' && (actor?.caracs?.FM == null || actor.caracs.FM==='' || !Number.isFinite(Number(actor.caracs.FM)))) return {ready:false,valid:false,status:'mj-fact-required',error:'Haute Magie / épuisement : Force Mentale (FM) du lanceur requise.',contract};
  const languageLock = actor?.extensions?.v5?.specialStates;
  if(actor?.extensions?.v5?.suppressedSpellIds?.includes(contract.id))return {ready:false,valid:false,status:'spell-suppressed',error:'Impasse : ce sort précis est temporairement inutilisable.',contract};
  if (languageLock?.cannotCast || languageLock?.cannotSpeak || languageLock?.blockedSkillFamilies?.includes('language')) return { ready: false, valid: false, error: 'Un effet actif empêche de parler ou d’incanter.', contract };
  const beastLocked = beastFormRestriction(actor, 'cast');
  if (beastLocked) return { ready: false, valid: false, status: 'beast-form-restriction', error: beastLocked, contract };

  // 1. Vérification stricte de l'empreinte source
  const sourceSpell = options.sourceSpell || (Array.isArray(actor?.spells) ? actor.spells.find(s => fold(s.nom || s.name) === fold(contract.name) || s.id === contract.id) : null);
  if (sourceSpell) {
    const fpCheck = validateSpellFingerprint(contract, sourceSpell);
    if (!fpCheck.valid) {
      return {
        ready: false,
        valid: false,
        status: 'fingerprint-mismatch',
        automationBlocked: true,
        error: 'Empreinte source modifiée : exécution automatique désactivée (consultation uniquement)',
        fingerprintCheck: fpCheck,
        contract
      };
    }
  }

  if (contract.sourceModified === true) {
    return {
      ready: false,
      valid: false,
      status: 'fingerprint-mismatch',
      automationBlocked: true,
      error: 'Empreinte source modifiée : exécution automatique désactivée (consultation uniquement)',
      contract
    };
  }

  if (!actor || typeof actor !== 'object') {
    return {
      ready: false,
      valid: false,
      error: 'Lanceur (acteur) requis pour exécuter le sort',
      contract
    };
  }

  // Garde-fou contre tout contrat incomplet, placeholder ou handler spécial non implémenté
  const effects = structuredClone(contract.effects || {});
  if(options.overcastSpecific?.swords>(effects.summon?.max ?? Infinity)-1)return {ready:false,valid:false,status:'invalid-option',error:'Au plus six épées (WoM p. 137).',contract};
  const specialTag = effects.special || effects.mjInput?.special || null;
  const domainFacts = options.domainFacts || {};
  for (const field of effects.facts || []) {
    for(const target of field.perTarget ? targets : [null]) {
    if(field.optionalForSelf && target?.id===actor.id)continue;
    if(field.optional && (target?options.targetTests?.[target.id]?.[field.key]:domainFacts[field.key])===undefined)continue;
    if(field.requiredWhen && (target?(options.targetTests?.[target.id]?.[field.requiredWhen.key] ?? domainFacts[field.requiredWhen.key]):domainFacts[field.requiredWhen.key])!==field.requiredWhen.value)continue;
    if(field.requiredIfOvercast && !Number(options.overcastSpecific?.[field.requiredIfOvercast]))continue;
    if(field.optionalFromWeaponSkill && conjuredWeaponSkillScore(actor,effects.conjureWeaponKey||domainFacts.weaponKey)!==null)continue;
    const value = target ? options.targetTests?.[target.id]?.[field.key] : domainFacts[field.key];
    const valid = field.type === 'targets' ? Array.isArray(value) && value.every(id=>typeof id==='string') : field.type === 'boolean' ? typeof value === 'boolean' && (field.expected === undefined || value === field.expected)
      : field.type === 'number' ? (field.integer===false?Number.isFinite(value):Number.isInteger(value)) && value >= (field.min ?? 0) && value <= (field.max ?? Infinity)
      : field.type === 'select' ? field.options.some(([key]) => key === value)
      : field.type === 'object' ? spellObjectChoices(target || targets[0],field).some(item=>item.id===value)
      : typeof value === 'string' && value.trim().length > 0;
    if (!valid) return { ready: false, valid: false, status: 'mj-fact-required', missing: ['domainFacts.' + field.key], error: field.label + ' : saisie MJ requise ou fait incompatible avec le sort.', contract };
    if(field.type==='effect' && !target?.extensions?.v5?.spellEffects?.some(e=>e.id===value))return {ready:false,valid:false,status:'mj-fact-required',error:'Couche active réellement présente requise.',contract};
    if(field.type==='spell' && !(target?.spells || []).some(s=>(getSpellContract(typeof s==='string'?s:s.id) || getSpellContract(s.name || s.nom))?.id===value))return {ready:false,valid:false,status:'mj-fact-required',error:'Un sort réellement connu de la cible est requis.',contract};
    }
  }
  if(effects.factModes){const chosen=effects.factModes.values[domainFacts[effects.factModes.fact]];if(chosen)Object.assign(effects,structuredClone(chosen));}
  if(effects.requiresSpecificOption && !Number(options.overcastSpecific?.[effects.requiresSpecificOption]))return {ready:false,valid:false,error:'Cette variante exige sa dépense de surpuissance propre.',contract};
  for(const [fact,formula] of Object.entries(effects.factLimits || {}))if(domainFacts[fact]>spellFormulaValue(formula,actor))return {ready:false,valid:false,error:'Valeur de '+fact+' supérieure au maximum autorisé.',contract};
  const isUnimplemented =
    !effects ||
    !effects.type ||
    ['unimplemented', 'engine-effect', 'mj-assisted'].includes(effects.type) ||
    (specialTag && !IMPLEMENTED_SPECIAL_HANDLERS.has(specialTag)) ||
    (effects.type === 'stat-modifiers' &&
      Object.keys(effects.statModifiers || {}).length === 0 &&
      Object.keys(effects.testModifiers || {}).length === 0 &&
      !specialTag) ||
    (contract.treatment !== 'narrative' && effects.type === 'narrative');

  if (isUnimplemented) {
    return {
      ready: false,
      valid: false,
      status: 'unimplemented',
      error: `Contrat de sort non implémenté ou incomplet : ${contract.name}`,
      contract
    };
  }

  // Vérification de cohérence si un aperçu d'incantation externe est fourni
  const suppliedCast = options.castingPreview || options.castResult || options.preview?.castingPreview || null;
  if (suppliedCast && typeof suppliedCast === 'object') {
    if (suppliedCast.actorId && suppliedCast.actorId !== actor.id) {
      return {
        ready: false,
        valid: false,
        error: 'Aperçu d’incantation invalide : ne correspond pas au lanceur courant.',
        contract
      };
    }
    if (suppliedCast.spell) {
      const castSpellId = suppliedCast.spell.id;
      const castSpellName = suppliedCast.spell.name || suppliedCast.spell.nom;
      if (castSpellId && castSpellId !== contract.id && fold(castSpellName) !== fold(contract.name) && fold(castSpellName) !== fold(contract.canonicalName)) {
        return {
          ready: false,
          valid: false,
          error: 'Aperçu d’incantation invalide : ne correspond pas au sort sélectionné.',
          contract
        };
      }
    }
  }

  // Validation stricte d'un incident magique transmis (P2 : aucun remplacement silencieux d'incident annoncé)
  const suppliedMiscast = options.miscast ?? suppliedCast?.miscast ?? null;
  if (suppliedMiscast && typeof suppliedMiscast === 'object' && !suppliedMiscast.cancelled) {
    const suppliedMiscastRoll = suppliedMiscast.initialRoll ?? suppliedMiscast.rawRoll ?? suppliedMiscast.roll;
    if ((suppliedMiscastRoll === undefined || suppliedMiscastRoll === null || !Number.isFinite(Number(suppliedMiscastRoll))) &&
        (options.miscastRoll === undefined || options.miscastRoll === null)) {
      return {
        ready: false,
        valid: false,
        status: 'invalid-miscast',
        error: 'Incident magique transmis incomplet : jet d’incident (initialRoll / miscastRoll) manquant.',
        contract
      };
    }
    if (options.miscastRoll !== undefined && options.miscastRoll !== null &&
        suppliedMiscastRoll !== undefined && suppliedMiscastRoll !== null &&
        Number(options.miscastRoll) !== Number(suppliedMiscastRoll) && !suppliedMiscast.attunement && !miscastCadaiReroll(options, suppliedMiscastRoll)) {
      return {
        ready: false,
        valid: false,
        status: 'invalid-miscast',
        error: `Incident magique incohérent : miscastRoll (${options.miscastRoll}) diffère du jet de l’incident transmis (${suppliedMiscastRoll}).`,
        contract
      };
    }
  }

  // Normalisation des métadonnées du sort pour previewCasting et validateOvercastChoices
  const damageEffectConf = typeof effects.damage === 'object' ? effects.damage : null;
  const hasDamageEffect = effects.type === 'magic-missile' || effects.type === 'damage' || Boolean(effects.missile) || Boolean(effects.damage) || Boolean(effects.damageFromTotalWornAp) || Boolean(effects.roundEffect?.damage) || Boolean(effects.vortex);
  const hasAoeEffect = /zde|zone|aoe/i.test(String(contract.target || '')) || Boolean(effects.aoe);
  const spellForCasting = {
    ...contract,
    type: contract.domain === 'high' ? 'high' : ((contract.domain === 'petty' || contract.domain === 'elven-petty') ? 'petty' : contract.domain),
    isPetty: contract.domain === 'petty' || contract.domain === 'elven-petty',
    wind: Array.isArray(contract.wind) ? contract.wind[0] : (contract.wind || contract.domain),
    hasDamage: hasDamageEffect,
    // V5 p. 236 : seuls les projectiles magiques améliorent leurs dégâts par surpuissance.
    isMagicMissile: effects.type === 'magic-missile' || Boolean(effects.missile) || Boolean(damageEffectConf?.magicMissile) || Boolean(effects.roundEffect?.damage?.magicMissile || effects.roundEffect?.magicMissile) || effects.vortex?.missile!==undefined,
    hasAoe: hasAoeEffect,
    ...(options.unmemorized === true ? { unmemorized: true } : {})
  };

  // Validation du choix critique éventuel
  const explicitCriticalChoice = options.criticalChoice ?? suppliedCast?.criticalChoice ?? null;
  if (explicitCriticalChoice !== null && explicitCriticalChoice !== undefined) {
    if (!CASTING_CRITICAL_CHOICES.includes(explicitCriticalChoice)) {
      return {
        ready: false,
        valid: false,
        error: `Choix critique d’incantation invalide : ${explicitCriticalChoice}`,
        contract
      };
    }
    if (explicitCriticalChoice === 'critical-wound' && !hasDamageEffect) {
      return {
        ready: false,
        valid: false,
        error: `Blessure Critique interdite : le sort ${contract.name} ne cause pas de dégâts.`,
        contract
      };
    }
  }

  // 2. Gestion et pré-validation des catégories de surpuissance (Overcast)
  const overcastChoices = { ...(options.overcastChoices || options.overcast || {}) };
  const badOvercast = Object.entries(overcastChoices).find(([, spent]) => spent != null && spent !== '' && !(Number.isFinite(Number(spent)) && Number(spent) >= 0));
  if (badOvercast) return { ready: false, valid: false, contract, error: validateOvercastChoices(overcastChoices).errors[0] };
  let arcaneOptions = null;
  if (specialTag === 'arcane-unforgiving') {
    arcaneOptions = normalizeArcaneOptions(options);
    if (!arcaneOptions.ready) return { ...arcaneOptions, contract };
    if (overcastChoices.special !== undefined && Number(overcastChoices.special) !== arcaneOptions.cost) {
      return { ready: false, valid: false, status: 'invalid-arcane-options', contract,
        error: 'La dépense spéciale doit correspondre aux options de Destruction des Arcanes.' };
    }
    if (arcaneOptions.cost) overcastChoices.special = arcaneOptions.cost;
    else delete overcastChoices.special;
  }
  const isHandOfGlory = effects.special === 'hand-of-glory' || contract.name === 'Main de Gloire';
  // A-01 : options payées de Main de Gloire (HEPG p. 88) : +6 quatre caractéristiques, +3 retire Brisé, +8 retire Brisé et Exténué, soigne 1d10, Immunité (Psychologie).
  const hogOptions = isHandOfGlory ? (options.hogOptions ?? options.mjParams?.hogOptions ?? null) : null;
  let hogOvercast6 = null;
  if (isHandOfGlory) {
    const stats = options.chosenStats ?? options.mjParams?.chosenStats;
    const tier = options.hogTier ?? options.tier ?? options.mjParams?.hogTier;
    if (hogOptions) {
      hogOvercast6 = tier === 'overcast6' || (Array.isArray(stats) && new Set(stats).size === 4);
      const hogCost = (hogOvercast6 ? 6 : 0) + (hogOptions.removeBroken ? HOG_COST_REMOVE_BROKEN : 0) + (hogOptions.purify ? HOG_COST_PURIFY : 0);
      if (overcastChoices.special !== undefined && Number(overcastChoices.special) !== hogCost) {
        return { ready: false, valid: false, status: 'invalid-hog-options', contract, error: 'La dépense spéciale doit correspondre aux options choisies de Main de Gloire (+6, +3, +8 DR).' };
      }
      if (hogCost) overcastChoices.special = hogCost; else delete overcastChoices.special;
    } else {
      const sixChosen = tier === 'overcast6' || (Array.isArray(stats) && new Set(stats).size === 4);
      if (Number(overcastChoices.special) > 0 && Number(overcastChoices.special) !== (sixChosen ? 6 : 0)) {
        return { ready: false, valid: false, status: 'invalid-hog-options', contract, error: 'La dépense spéciale doit égaler exactement le coût des options choisies de Main de Gloire (+6, +3, +8 DR) : choisir l’option payée.' };
      }
    }
  }
  // A-04 : options payées d'Apothéose (HEPG p. 86) : +3 DR par palier de BFM Blessures, +6 Blessure Critique (Test de Sociabilité saisi), +10 relever un mort.
  const apotheoseOptions = effects.special === 'apotheose' ? (options.apotheoseOptions ?? options.mjParams?.apotheoseOptions ?? null) : null;
  const apotheoseSteps = Math.max(0, Math.floor(Number(apotheoseOptions?.extraHealSteps) || 0));
  const apotheoseRaise = Boolean(apotheoseOptions?.raiseDead);
  if (effects.special === 'apotheose') {
    if (apotheoseOptions) {
      const apoCost = apotheoseSteps * 3 + (apotheoseOptions.criticalHeal ? 6 : 0) + (apotheoseRaise ? 10 : 0);
      if (overcastChoices.special !== undefined && Number(overcastChoices.special) !== apoCost) {
        return { ready: false, valid: false, status: 'invalid-apotheose-options', contract, error: 'La dépense spéciale doit correspondre aux options choisies d’Apothéose (+3 par palier, +6, +10 DR).' };
      }
      if (apoCost) overcastChoices.special = apoCost; else delete overcastChoices.special;
    } else if (Number(overcastChoices.special) > 0) {
      return { ready: false, valid: false, status: 'invalid-apotheose-options', contract, error: 'Surpuissance spéciale sans option : choisir l’option payée d’Apothéose (+3, +6 ou +10 DR).' };
    }
  }
  // Forme bestiale : +2 DR par trait optionnel (V5 p. 245). Kadon : +4 DR par trait optionnel ou pour transformer une autre cible (WoM p. 149).
  const isKadon = effects.special === 'transformation-of-kadon';
  const isBeastForm = !isKadon && (effects.special === 'beast-form' || contract.name.includes('Forme bestiale'));
  const beastTraits = isKadon || isBeastForm ? options.beastTraits ?? options.mjParams?.beastTraits ?? [] : [];
  const kadonOtherTarget = isKadon && Boolean(options.kadonOtherTarget ?? options.mjParams?.kadonOtherTarget);
  if (isKadon || isBeastForm) {
    const transformationCost = transformationOvercastCost({ kind: isKadon ? 'kadon' : 'beast', traits: Array.isArray(beastTraits) ? beastTraits.length : 0, otherTarget: kadonOtherTarget });
    if (overcastChoices.special !== undefined && Number(overcastChoices.special) !== transformationCost) {
      return { ready: false, valid: false, status: 'invalid-transformation-options', contract, error: isKadon
        ? 'La dépense spéciale doit égaler le coût des options de Transformation de Kadon (+4 DR par trait optionnel ou pour transformer une autre cible).'
        : 'La dépense spéciale doit égaler le coût des traits optionnels de Forme bestiale (+2 DR chacun).' };
    }
    if (transformationCost) overcastChoices.special = transformationCost; else delete overcastChoices.special;
  }
  if (isHandOfGlory) {
    const explicitStats = options.chosenStats ?? options.mjParams?.chosenStats;
    const explicitTier = options.hogTier ?? options.tier ?? options.mjParams?.hogTier;
    const validExplicitStats = Array.isArray(explicitStats)
      ? [...new Set(explicitStats)].filter(s => HAND_OF_GLORY_ELIGIBLE_STATS.includes(s))
      : [];
    const wantsOvercast6 =
      explicitTier === 'overcast6' ||
      validExplicitStats.length === 4 ||
      Number(overcastChoices.special) >= 6;
    if (wantsOvercast6) {
      overcastChoices.special = Math.max(Number(overcastChoices.special) || 0, 6);
    }
  }

  // Options de surpuissance propres au sort : la dépense spéciale se déduit des paliers choisis (V5 p. 236).
  const specificOvercast = resolveSpecificOvercast(contract, options.overcastSpecific ?? options.mjParams?.overcastSpecific);
  if (specificOvercast.errors.length) return { ready: false, valid: false, status: 'invalid-overcast-specific', error: specificOvercast.errors.join(' '), contract };
  for(const group of effects.exclusiveOptionGroups || [])if(specificOvercast.entries.filter(e=>group.includes(e.id)).length>1)return {ready:false,valid:false,status:'invalid-overcast-specific',error:'Options exclusives : '+group.join(' / ')+'.',contract};
  if (specificOvercast.entries.length) {
    const declared = Number(overcastChoices.special) || 0;
    if (declared && declared !== specificOvercast.cost) return { ready: false, valid: false, status: 'invalid-overcast-specific', error: `La dépense spéciale (${declared} DR) doit égaler le coût des options choisies (${specificOvercast.cost} DR).`, contract };
    overcastChoices.special = specificOvercast.cost;
  }
  const specificSteps = kind => specificOvercast.entries.filter(entry => entry.kind === kind);

  let overcastDamageBonus = 0;
  let overcastTargetsBonus = 0;
  let overcastRangeMultiplier = 1;
  let overcastDurationMultiplier = 1;
  let overcastAoeMultiplier = 1;

  const hasOvercastSpend = Object.values(overcastChoices).some(v => Number(v) > 0);
  if (hasOvercastSpend) {
    if (contract.overcast?.allowed === false) {
      return {
        ready: false,
        valid: false,
        error: `Surpuissance interdite pour ce sort : ${contract.overcast.reason || 'non extensible'}`,
        contract
      };
    }

    const allowedOptions = contract.overcast?.options || [];
    const allowsSpecialOvercast =
      allowedOptions.includes('special') ||
      isHandOfGlory ||
      ['arcane-unforgiving', 'first-portent', 'second-portent'].includes(specialTag);
    for (const [cat, spent] of Object.entries(overcastChoices)) {
      if (Number(spent) > 0 && !allowedOptions.includes(cat) && !(cat === 'special' && allowsSpecialOvercast)) {
        return {
          ready: false,
          valid: false,
          error: `Option de surpuissance non autorisée pour ce sort : ${cat}`,
          contract
        };
      }
      const benefit = getOvercastBenefit(cat, spent);
      if (benefit) {
        if (cat === 'damage') overcastDamageBonus += benefit.value || 0;
        if (cat === 'targets') overcastTargetsBonus += benefit.value || 0;
        if (cat === 'range') overcastRangeMultiplier = benefit.multiplier || 1;
        if (cat === 'duration') overcastDurationMultiplier = benefit.multiplier || 1;
        if (cat === 'aoe') overcastAoeMultiplier = benefit.multiplier || 1;
      }
    }
  }

  // 3. Normalisation et validation stricte des cibles (nombre maximal et admissibilité)

  const optionTests=[],activeOptionRules=[];
  for(const [id,rule] of Object.entries(effects.optionRules || {})){
    const entry=specificOvercast.entries.find(e=>e.id===id);if(!entry)continue;
    let success=true;
    if(rule.test){const spec=rule.test,die=domainFacts['optionRoll_'+id];
      if(!Number.isInteger(die)||die<1||die>100)return {ready:false,valid:false,status:'mj-fact-required',error:'Option '+id+' : saisir le d100 de '+spec.skill+'.',contract};
      const skill=(actor.skills || []).find(s=>spellSkillMatches(s,spec.skill));
      const test=selectV5Test(previewV5Test({score:effectiveSkillScore(actor,skill?.total ?? skill?.value ?? actor.caracs[spec.stat],spec.stat),roll:die,slModifiers:[{id:'spell-option',amount:spec.modifierSl}]}),'keep');success=test.success;optionTests.push({id,test});
    }
    if(rule.requiredFact && domainFacts[rule.requiredFact]!==true)return {ready:false,valid:false,status:'mj-fact-required',error:'Option '+id+' : '+rule.requiredFact+' doit être confirmé.',contract};
    if(!success)continue;activeOptionRules.push({...rule,id,steps:entry.steps});
    if(rule.miniPerStep)effects.vortex={...effects.vortex,miniCount:Math.min(effects.vortex.miniMax,entry.steps*rule.miniPerStep)};
    if(rule.sun)effects.vortex={...effects.vortex,sun:true};
    if(rule.summonCountPerStep)effects.summon={...effects.summon,count:Math.min(effects.summon.max,effects.summon.count+entry.steps*rule.summonCountPerStep)};
    if(rule.testModifiers)effects.testModifiers={...effects.testModifiers,...rule.testModifiers};
    if(rule.traits)effects.traits=[...rule.traits];
    if(rule.flags)effects.specialState={...effects.specialState,...rule.flags};
    if(rule.roundEscalation)effects.roundEffect={...effects.roundEffect,damageEscalation:rule.roundEscalation};
    if(rule.sizeDamage)effects.roundEffect={...effects.roundEffect,sizeDamage:rule.sizeDamage};
    if(rule.tempestMoveTest || rule.tempestMachines)effects.roundEffect={...effects.roundEffect,moveTest:rule.tempestMoveTest || false,machines:rule.tempestMachines || false};
    if(rule.extendedAfterFailures)effects.specialState={...effects.specialState,extendedAfterFailures:rule.extendedAfterFailures};
    if(rule.duration)effects.durationOverride=rule.duration;
    if(rule.durationFact)effects.durationFact=rule.durationFact;
    if(rule.rangeMultiplier)overcastRangeMultiplier*=rule.rangeMultiplier;
    if(rule.aoeMultiplier)overcastAoeMultiplier*=rule.aoeMultiplier;
    if(rule.receiptFormulas)effects.receiptFormulas={...effects.receiptFormulas,...rule.receiptFormulas};
    if(rule.rangeFormula)effects.receiptFormulas={...effects.receiptFormulas,portee:rule.rangeFormula};
    if(rule.eyeSenses)effects.summon={...effects.summon,extraSenses:['Sens de la magie','Seconde vue','Vision dans le noir']};
    if(rule.tempestMoveTest){effects.testModifiers={...effects.testModifiers,CT:-3};effects.specialState={...effects.specialState,tempestMovement:true};}
    if(rule.targetTest || rule.dispelBonusPerStep || rule.receiptOnly)effects.specialState={...effects.specialState,assistedOptionReceipt:[...(effects.specialState?.assistedOptionReceipt || []),{id,...rule}]};
  }
  let effectiveTargets = Array.isArray(targets) ? [...targets] : targets ? [targets] : [];
  if (effectiveTargets.length === 0) {
    if (/vous/i.test(contract.target) || /vous/i.test(contract.range)) {
      effectiveTargets = [actor];
    }
  }

  const targetValidation = validateSpellTargets({...contract,effects}, actor, effectiveTargets, overcastTargetsBonus, options);
  if (!targetValidation.valid) {
    return {
      ready: false,
      valid: false,
      status: targetValidation.status,
      targetValidation,
      error: targetValidation.error,
      contract
    };
  }

  // 3b. Validation stricte des options de choix MJ (aucun choix implicite options[0] sans saisie)
  const choiceOptions = getContractChoiceOptions(contract);
  let resolvedMjChoice = options.mjChoice ?? options.mjOption ?? options.mjParams?.choice ?? null;
  if (choiceOptions.length > 0) {
    if (resolvedMjChoice === undefined || resolvedMjChoice === null || String(resolvedMjChoice).trim() === '') {
      return {
        ready: false,
        valid: false,
        status: 'mj-choice-required',
        choiceRequired: true,
        choiceOptions,
        error: `Saisie MJ requise pour ${contract.name} : veuillez sélectionner une option parmi (${choiceOptions.join(' / ')}).`,
        contract
      };
    }
    const matchedOpt = choiceOptions.find(opt => fold(opt) === fold(resolvedMjChoice));
    if (!matchedOpt) {
      return {
        ready: false,
        valid: false,
        status: 'invalid-mj-choice',
        choiceRequired: true,
        choiceOptions,
        error: `Option MJ invalide ("${resolvedMjChoice}") pour ${contract.name}. Options autorisées : ${choiceOptions.join(', ')}.`,
        contract
      };
    }
    resolvedMjChoice = matchedOpt;
  }

  // 4. Réserve et résolution stricte du test d'incantation
  const readingTargets=effectiveTargets.filter(t=>t.extensions?.v5?.specialStates?.mindMask);
  if(readingTargets.some(t=>options.targetTests?.[t.id]?.readingMagic===true))options={...options,slModifiers:[...(options.slModifiers || []),{id:'mind-mask-reading',label:'Masque de l’Esprit : lecture/divination',amount:-3}]};
  // N’écoutez point la Sorcière : pénalité divine (maximum, une seule fois) portée par les cibles désignées.
  const divineCastingPenalty=Math.max(0,...effectiveTargets.flatMap(t=>(t.extensions?.v5?.divineEffects || []).map(row=>Number(row.castingSlPenalty) || 0)));
  if(divineCastingPenalty>0)options={...options,slModifiers:[...(options.slModifiers || []),{id:'divine-casting-penalty',label:'N’écoutez point la Sorcière : sort visant la zone',amount:-divineCastingPenalty}]};
  const reserve = getChannellingReserve(actor);
  const expectedReserveType = contract.domain === 'high' ? 'high' : 'winds';
  const matchingReserveSl = reserve.type === expectedReserveType ? (Number(reserve.sl) || 0) : 0;

  const explicitRoll = options.roll ?? options.castingRoll ?? options.castRoll ?? suppliedCast?.roll;
  const explicitSl = options.sl ?? options.castingSl ?? suppliedCast?.testSl;
  const hasCastingInput = explicitRoll !== undefined || explicitSl !== undefined || Boolean(suppliedCast);

  const effectiveMiscastRoll =
    options.miscastRoll ??
    suppliedMiscast?.initialRoll ??
    suppliedMiscast?.rawRoll ??
    suppliedMiscast?.roll;
  const effectiveSecondaryRolls = options.secondaryRolls ?? suppliedMiscast?.secondaryRolls ?? {};
  const effectiveMajorRoll = options.majorRoll ?? effectiveSecondaryRolls?.majorRoll ?? suppliedMiscast?.majorRoll;
  const effectiveIngredient = false;
  const effectiveInstinctiveDiction =
    options.instinctiveDiction ??
    suppliedCast?.instinctiveDiction ??
    (suppliedMiscast?.modifier === -20 || (suppliedMiscast?.cancelReason && /diction/i.test(suppliedMiscast.cancelReason)) ? true : undefined);
  const effectiveCorruptingInfluence =
    options.corruptingInfluence ??
    suppliedCast?.corruptingInfluence ??
    (suppliedMiscast?.initialSeverity === 'MINOR' && suppliedMiscast?.effectiveSeverity === 'MAJOR' ? true : undefined);

  let castingPreview = null;
  let effectiveCriticalChoice = explicitCriticalChoice;

  if (explicitRoll !== undefined && explicitRoll !== null) {
    // Calculer d'abord le test pour savoir si le jet est réellement un critique
    const baseCastPreview = previewCasting(actor, spellForCasting, {
      ...options,
      roll: explicitRoll,
      score: options.score ?? suppliedCast?.score,
      slModifier: options.slModifier ?? options.modifier ?? 0,
      slModifiers: options.slModifiers ?? suppliedCast?.slModifiers,
      advantageSources: options.advantageSources,
      disadvantageSources: options.disadvantageSources,
      choice: options.choice,
      overcastChoices,
      criticalChoice: explicitCriticalChoice,
      miscastRoll: options.miscastRoll ?? effectiveMiscastRoll,
      secondaryRolls: effectiveSecondaryRolls,
      ingredient: effectiveIngredient,
      instinctiveDiction: effectiveInstinctiveDiction,
      corruptingInfluence: effectiveCorruptingInfluence,
      majorRoll: effectiveMajorRoll
    });

    if (options.criticalChoice && !baseCastPreview.critical) {
      return {
        ready: false,
        valid: false,
        error: 'Choix critique d’incantation invalide : le jet n’est pas un critique.',
        contract
      };
    }
    if (!baseCastPreview.critical) {
      effectiveCriticalChoice = null;
    }

    // Vérifier qu'un incident transmis n'a pas été remplacé silencieusement par un autre
    if (suppliedMiscast && !suppliedMiscast.cancelled) {
      if (!baseCastPreview.miscast) {
        return {
          ready: false,
          valid: false,
          status: 'invalid-miscast',
          error: 'Incident magique transmis incohérent : le jet recalculé ne déclenche aucun incident.',
          contract
        };
      }
      const expectedIncidentName = fold(suppliedMiscast.name || suppliedMiscast.entry?.name);
      const actualIncidentName = fold(baseCastPreview.miscast.name || baseCastPreview.miscast.entry?.name);
      if (expectedIncidentName && actualIncidentName && expectedIncidentName !== actualIncidentName) {
        return {
          ready: false,
          valid: false,
          status: 'invalid-miscast',
          error: `Incident magique transmis incohérent : "${suppliedMiscast.name || suppliedMiscast.entry?.name}" ne correspond pas au recalcul ("${baseCastPreview.miscast.name}").`,
          contract
        };
      }
      if (suppliedMiscast.table && baseCastPreview.miscast.table && suppliedMiscast.table !== baseCastPreview.miscast.table) {
        return {
          ready: false,
          valid: false,
          status: 'invalid-miscast',
          error: `Table d’incident magique incohérente (${suppliedMiscast.table} vs ${baseCastPreview.miscast.table}).`,
          contract
        };
      }
    }

    castingPreview = baseCastPreview;
  } else if (explicitSl !== undefined && explicitSl !== null) {
    // Mêmes garde-fous que le Test d'incantation : forme animale, Épuisement magique, Mage de guerre, États, runes des Cadai, Drain de puissance.
    const lockedForm = beastFormRestriction(actor, 'cast');
    if (lockedForm) return { ready: false, valid: false, error: lockedForm, contract };
    try { prepareCastingOptions(actor, spellForCasting, options); } catch (error) {
      if (!error?.userFacing && !/Mage de guerre|rune|Cadai|relance|Fortune/i.test(error?.message || '')) throw error;
      return { ready: false, valid: false, status: 'casting-forbidden', error: error.message, contract };
    }
    const testSl = Number(explicitSl);
    const isCritical = Boolean(options.critical ?? suppliedCast?.critical);
    const isFumble = Boolean(options.fumble ?? suppliedCast?.fumble);
    if (options.criticalChoice && !isCritical) {
      return {
        ready: false,
        valid: false,
        error: 'Choix critique d’incantation invalide : le jet n’est pas un critique.',
        contract
      };
    }
    if (!isCritical) {
      effectiveCriticalChoice = null;
    }
    const testSuccess = Number.isFinite(testSl) && testSl >= 0 && !isFumble;
    const reserveSlUsed = matchingReserveSl;
    let totalCastingSl = testSuccess ? (testSl + reserveSlUsed) : testSl;
    if(testSuccess && totalCastingSl>=contract.cn)totalCastingSl+=suffusedCastingBonus(actor,spellForCasting,options);
    if (isCritical && effectiveCriticalChoice === 'total-power') {
      return { ready: false, valid: false, status: 'dice-required', missing: ['roll'], error: 'Puissance totale : saisir le jet d’incantation (1d100).', contract };
    }
    const extraOvercastFromCritical = 0;
    const spellSuccess = testSuccess && (totalCastingSl >= contract.cn || (isCritical && effectiveCriticalChoice === 'total-power'));
    const surplus = spellSuccess ? Math.max(0, totalCastingSl - contract.cn) : 0;
    const availableOvercastSl = surplus + extraOvercastFromCritical + (spellSuccess && contract.domain==='high' ? magicTalentRank(actor,'high-magic') : 0);
    const bi = Math.max(1, Math.floor((Number(actor?.caracs?.Int) || 30) / 10));
    const bfm = Math.max(0, Math.floor(Number(actor?.caracs?.FM ?? 0) / 10));
    const maxOvercastSpend = bi + bfm;
    const overcastValidation = spellSuccess
      ? validateOvercastChoices(overcastChoices, { availableSL: availableOvercastSl, maxSpend: maxOvercastSpend, spell: spellForCasting })
      : (hasOvercastSpend
        ? { valid: false, errors: ['Impossible de dépenser de la surpuissance sur un lancement échoué.'], totalSpent: 0, remainingSL: 0, benefits: {} }
        : { valid: true, errors: [], totalSpent: 0, remainingSL: 0, benefits: {} });

    let resolvedMiscast = suppliedMiscast || null;
    const miscastExpected = isFumble || (isCritical && !spellForCasting.isPetty);
    if (miscastExpected && !suppliedMiscast && explicitMagicDie(effectiveMiscastRoll, 'd100') === null) {
      return { ready: false, valid: false, status: 'dice-required', missing: ['miscastRoll'], error: missingMagicDiceMessage(['miscastRoll']), contract };
    }
    if (effectiveMiscastRoll !== undefined && effectiveMiscastRoll !== null && (isCritical || isFumble || suppliedMiscast)) {
      const recalcMiscast = previewMiscast({
        severity: suppliedMiscast?.initialSeverity || 'MINOR',
        roll: effectiveMiscastRoll,
        modifier: suppliedMiscast?.modifier || 0,
        corruptingInfluence: Boolean(effectiveCorruptingInfluence),
        hasIngredient: Boolean(effectiveIngredient),
        instinctiveDiction: Boolean(effectiveInstinctiveDiction),
        isHighMagic: contract.domain === 'high',
        bfm,
        secondaryRolls: effectiveSecondaryRolls,
        majorRoll: effectiveMajorRoll
      });
      if (suppliedMiscast && !suppliedMiscast.cancelled) {
        const expectedIncidentName = fold(suppliedMiscast.name || suppliedMiscast.entry?.name);
        const actualIncidentName = fold(recalcMiscast.name || recalcMiscast.entry?.name);
        if (expectedIncidentName && actualIncidentName && expectedIncidentName !== actualIncidentName) {
          return {
            ready: false,
            valid: false,
            status: 'invalid-miscast',
            error: `Incident magique transmis incohérent : "${suppliedMiscast.name || suppliedMiscast.entry?.name}" ne correspond pas au recalcul ("${recalcMiscast.name}").`,
            contract
          };
        }
      }
      if (recalcMiscast.ready === false) {
        const missing = (recalcMiscast.missingSecondaryDice || []).map(key => key === 'roll' ? 'miscastRoll' : key);
        return { ready: false, valid: false, status: 'dice-required', missing, error: missing.length ? missingMagicDiceMessage(missing) : recalcMiscast.summary, contract };
      }
      resolvedMiscast = recalcMiscast.cancelled ? null : recalcMiscast;
    }

    castingPreview = {
      actionType: 'casting',
      spell: spellForCasting,
      cn: contract.cn,
      roll: null,
      testSuccess,
      testSl,
      critical: isCritical,
      fumble: isFumble,
      criticalChoice: effectiveCriticalChoice,
      matchingReserve: reserveSlUsed,
      totalCastingSl,
      spellSuccess,
      reserveConsumed: reserve.sl || 0,
      surplus,
      extraOvercastFromCritical,
      availableOvercastSl,
      maxOvercastSpend,
      overcast: overcastValidation,
      miscast: resolvedMiscast,
      ready: true
    };
  }

  // Si de la surpuissance est demandée, vérifier qu'elle est valide par rapport aux DR disponibles
  if (castingPreview?.ready === false) return {ready:false,valid:false,...(castingPreview.missing?.length ? {status:'dice-required',missing:castingPreview.missing} : {}),error:castingPreview.error || castingPreview.miscast?.summary || 'Choix du jet magique requis.',castingPreview,contract};
  if (hasOvercastSpend && castingPreview && !castingPreview.overcast?.valid) {
    return {
      ready: false,
      valid: false,
      error: (castingPreview.overcast?.errors || ['Dépense de surpuissance invalide']).join(' '),
      overcast: castingPreview.overcast,
      castingPreview,
      contract
    };
  }

  const operationId = options.operationId || options.executionId || `spell-exec-${contract.id}-${actor.id}-${explicitRoll ?? explicitSl ?? Date.now()}-${uid()}`;

  // X-01 / D-03 : la réaction du dissipateur s'oppose au seul Test source ; le résultat remplace les valeurs de travail avant tout effet.
  let dispelReaction=null;
  if(options.dispelReaction && castingPreview?.spellSuccess){
    const input=options.dispelReaction;
    const dispeller=(options.participants || []).find(p=>p.id===input.dispellerId);
    if(!dispeller || dispeller.id===actor.id)return {ready:false,valid:false,error:'Dissipateur distinct du lanceur requis.',contract};
    dispelReaction=previewDispelCasting(dispeller,castingPreview,{turnKey:options.turnKey,...input,round:options.round ?? 1});
    if(!dispelReaction.allowed || !dispelReaction.ready)return {ready:false,valid:false,error:dispelReaction.reason || dispelReaction.summary,dispelReaction,contract};
    if(dispelReaction.dispelled){
      // D-03 : un sort dissipé ne produit ni effet ni jet d'épuisement ; Test, incident source, réserve, quota et rune restent à appliquer.
      return {
        ready: true, valid: true, spellSuccess: false, castFailed: false, dispelled: true,
        testSuccess: castingPreview.testSuccess, totalCastingSl: dispelReaction.casterSlAfterDispel, cn: contract.cn,
        roll: explicitRoll, sl: explicitSl, criticalChoice: effectiveCriticalChoice, operationId, baseRevision: options.baseRevision,
        contract, actor: { id: actor.id, name: actor.name }, targets: effectiveTargets.map(t => ({ id: t.id, name: t.name })),
        overcast: { choices: {}, damageBonus: 0, targetsBonus: 0, rangeMultiplier: 1, durationMultiplier: 1, aoeMultiplier: 1 },
        burnout: null, cadaiRuneUsed: Boolean(options.useCadaiRune), targetResults: [], attributeReceipts: [], vortexMovement: null,
        auxiliarySummon: null, ficheFollowUpReceipt: null, dispelReaction, castingPreview, miscast: castingPreview.miscast || null,
        summary: `${contract.name} de ${actor.name || actor.id} dissipé : ${dispelReaction.summary}`
      };
    }
    const dispelTotal=dispelReaction.casterSlAfterDispel;
    const dispelPasses=castingPreview.testSuccess && (dispelTotal>=contract.cn || (castingPreview.critical && castingPreview.criticalChoice==='total-power'));
    const adjustedTotal=dispelPasses ? dispelTotal+suffusedCastingBonus(actor,spellForCasting,options) : dispelTotal;
    const adjustedSurplus=dispelPasses ? Math.max(0,adjustedTotal-contract.cn) : 0;
    const adjustedAvailable=adjustedSurplus+(castingPreview.extraOvercastFromCritical || 0)+(dispelPasses && contract.domain==='high' ? magicTalentRank(actor,'high-magic') : 0);
    let adjustedOvercast={valid:true,errors:[],totalSpent:0,remainingSL:0,benefits:{}};
    if(hasOvercastSpend){
      adjustedOvercast=dispelPasses
        ? validateOvercastChoices(overcastChoices,{availableSL:adjustedAvailable,maxSpend:castingPreview.maxOvercastSpend,spell:spellForCasting})
        : {valid:false,errors:['Impossible de dépenser de la surpuissance sur un lancement échoué.'],totalSpent:0,remainingSL:0,benefits:{}};
      if(!adjustedOvercast.valid)return {ready:false,valid:false,error:`Après dissipation (${dispelTotal} DR restants) : ${adjustedOvercast.errors.join(' ')}`,overcast:adjustedOvercast,dispelReaction,castingPreview,contract};
    }
    castingPreview={...castingPreview,testSl:dispelReaction.netSl,totalCastingSl:adjustedTotal,spellSuccess:dispelPasses,surplus:adjustedSurplus,
      availableOvercastSl:adjustedAvailable,overcast:adjustedOvercast,
      dispelAdjustment:{sourceTestSl:castingPreview.testSl,sourceTotalCastingSl:castingPreview.totalCastingSl,netSl:dispelReaction.netSl,casterSlAfterDispel:dispelTotal}};
  }

  // Si un test d'incantation a été fourni et que le sort échoue (testSuccess === false ou totalCastingSl < cn) :
  // Aucun effet du sort n'est produit sur les cibles, mais la tentative (consommation de réserve + miscast) est prête à être appliquée.
  if (castingPreview && castingPreview.spellSuccess === false) {
    return {
      ready: true,
      valid: true,
      spellSuccess: false,
      castFailed: true,
      testSuccess: castingPreview.testSuccess,
      totalCastingSl: castingPreview.totalCastingSl,
      cn: contract.cn,
      roll: explicitRoll,
      sl: explicitSl,
      criticalChoice: effectiveCriticalChoice,
      operationId,
      baseRevision: options.baseRevision,
      contract,
      actor: { id: actor.id, name: actor.name },
      targets: effectiveTargets.map(t => ({ id: t.id, name: t.name })),
      overcast: {
        choices: {},
        damageBonus: 0,
        targetsBonus: 0,
        rangeMultiplier: 1,
        durationMultiplier: 1,
        aoeMultiplier: 1
      },
      burnout: null,
      cadaiRuneUsed: Boolean(options.useCadaiRune),
      targetResults: [],
      attributeReceipts: [],
      vortexMovement: null,
      auxiliarySummon: null,
      ficheFollowUpReceipt: null,
      dispelReaction,
      castingPreview,
      miscast: castingPreview.miscast || null,
      summary: `Échec de l’incantation de ${contract.name} par ${actor.name || actor.id} (Total ${castingPreview.totalCastingSl} DR < NI ${contract.cn}${!castingPreview.testSuccess ? ', test échoué' : ''}${dispelReaction ? `, après dissipation : ${dispelReaction.netSl} DR nets` : ''}).`
    };
  }

  // 5. Haute Magie : calcul du risque d'épuisement magique si surpuissant
  let burnout = null;
  const bfm = Math.max(0, Math.floor(Number(actor?.caracs?.FM ?? 0) / 10));
  if (contract.domain === 'high') {
    const totalOvercastSpent = Object.values(overcastChoices).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const burnoutRiskCalc = calculateBurnoutRisk({ overcastSpent: totalOvercastSpent, bfm });
    if (burnoutRiskCalc.triggered) {
      const burnoutReceipt = castingPreview?.burnoutReceipt || null;
      burnout = previewBurnout({ participant: actor, overcastSpent: totalOvercastSpent, bfm, roll: burnoutReceipt ? burnoutReceipt.reroll : options.burnoutRoll ?? null });
      if (!burnout.ready) return { ready: false, valid: false, status: 'burnout-roll-required', error: burnout.summary, burnout, contract };
      // HEPG p. 84 : la rune du jet d'épuisement ne se paie que si ce jet est réellement lancé.
      if (burnoutReceipt) {
        const cadaiReceipts = [...castingPreview.cadaiReceipts, burnoutReceipt];
        castingPreview = { ...castingPreview, cadaiReceipts, cadaiReceipt: cadaiReceipts.length === 1 ? cadaiReceipts[0] : null };
      }
      burnout.active = burnout.burnedOut;
      burnout.days = burnout.durationDays;
    }
  }

  const chosenLore=options.chosenLore ? normalizeLoreId(options.chosenLore) : null;
  if(options.chosenLore && (!chosenLore || chosenLore==='high'))return {ready:false,valid:false,error:'Choisir un seul attribut parmi les huit Vents.',contract};
  // Attribut de Domaine : Domaine du sort ; Arcanes elfiques : choix de l'un des deux Vents, à défaut le premier listé (HEPG p. 81) ;
  // sorts d'Arcane : Domaine du lanceur (celui du choix, ou son seul Domaine de Magie des Arcanes).
  const casterLores=arcaneMagicLores(actor);
  if(contract.domain==='arcane' && chosenLore && casterLores.length && !casterLores.includes(chosenLore))return {ready:false,valid:false,error:'Domaine d’Arcane que le lanceur ne possède pas (Magie des Arcanes).',contract};
  if(contract.domain==='arcane' && !chosenLore && casterLores.length>1)return {ready:false,valid:false,status:'lore-choice-required',missing:['chosenLore'],error:'Sort d’Arcane : choisir le Domaine du lanceur dont l’attribut s’applique.',contract};
  const attributeLore=contract.domain==='elven-arcane' ? (chosenLore || normalizeLoreId([].concat(contract.wind||[])[0])) : contract.domain==='arcane' ? (chosenLore || casterLores[0] || null) : contract.domain;
  if(contract.domain==='elven-arcane' && chosenLore && !(contract.wind || []).some(w=>normalizeLoreId(w)===chosenLore))return {ready:false,valid:false,error:'Attribut réservé à l’un des deux Vents du sort elfique.',contract};
  // Attributs facultatifs (« peut infliger ») : choix par cible, appliqué aux ennemis par défaut ; `attributeActive: false` les coupe tous.
  const attributeTargets=Object.fromEntries(effectiveTargets.map(t=>[t.id,typeof options.attributeTargets?.[t.id]==='boolean' ? options.attributeTargets[t.id] : isHostileTarget(actor,t)]));
  const loreKey=attributeLore==='high' ? chosenLore : attributeLore;
  const allLore=options.attributeActive===false ? null : previewLoreAttribute({caster:actor,targets:effectiveTargets,lore:attributeLore,chosenLore,spell:contract,options:{attributeTargets}});
  // Règles de dégâts de l'attribut : Cieux et Métal ignorent les PA métalliques (même attribut coupé, comme avant), Métal les ajoute (V5 p. 252), Ombres ignore les PA non magiques (V5 p. 254).
  const loreDamage = {
    ignoreMetalAp: Boolean(allLore?.damageRules?.ignoreMetalAp) || ['heavens','metal'].includes(loreKey),
    ignoreNonMagicalAp: Boolean(allLore?.damageRules?.ignoreNonMagicalAp),
    metalDamageBonus: Boolean(allLore?.damageRules?.metalDamageBonus)
  };
  if(effects.damageWhenTargetFact)effects.damageWhenFact='__perTarget';
  const damageConf = typeof effects.damage === 'object' ? effects.damage : {};
  const needsHitLocation = effectiveTargets.length > 0 && (effects.type === 'magic-missile' || Boolean(effects.missile) ||
    ((effects.type === 'damage' || effects.damage) && !damageConf.ignoreAp && !damageConf.directWounds && !damageConf.location));
  const locationRoll = explicitMagicDie(options.locationRoll, 'd100');
  const roll = explicitRoll ?? (locationRoll === null ? null : reverseV5Roll(locationRoll));
  if (needsHitLocation && roll === null) {
    return { ready: false, valid: false, status: 'dice-required', missing: ['locationRoll'], error: 'Saisir le jet d’incantation ou le jet de localisation (1d100).', contract };
  }
  const sl = castingPreview?.totalCastingSl ?? ((explicitSl ?? castingPreview?.testSl ?? 0)+matchingReserveSl);
  const targetResults = [];
  const attributeReceipts = [];
  const verdantIgnored = [];
  // S-07 : seule une clause `selfHarm` documentée autorise de blesser le lanceur ; elle dit si le Bonus d'Endurance se retranche.
  const casterSelfDamage = effects.selfHarm && Number(effects.casterSelfDamage) > 0
    ? Math.max(0, Number(effects.casterSelfDamage) - (effects.selfHarm.minusBe ? Math.floor((Number(actor?.caracs?.E) || 0) / 10) : 0))
    : 0;
  // Option propre au sort sur le Test secondaire (Chute : −1 DR au Test de Dextérité par +2 DR).
  const baseSecondarySpec = getSecondaryTestSpec({...contract,effects});
  const commonSecondarySpec = baseSecondarySpec
    ? { ...baseSecondarySpec, modifierSl: (Number(baseSecondarySpec.modifierSl) || 0) + specificSteps('secondary-sl').reduce((sum, entry) => sum + entry.steps * (Number(entry.per) || -1), 0) }
    : baseSecondarySpec;
  let missingSecondaryTest = null;
  const arcaneUnforgivingInventoryFollowUp = [];

  // Traitement particulier Haute Magie : Extinction de l'Âme à +7 SL de surpuissance
  let baseMissileDamage = effects.missile?.damage ?? effects.damage ?? 4;
  // Option propre au sort qui remplace les dégâts de base (Extinction de l'Âme à +7 DR : +11, HEPG p. 89).
  for (const entry of specificSteps('damage-base')) baseMissileDamage = Math.max(baseMissileDamage, Number(entry.value) || 0);

  // S-04 : une durée que l'interpréteur ne sait pas lire est une donnée MJ (nombre + unité), jamais un repli sur le BFM.
  let durationUnreadable = null;
  const mjDuration = options.mjDuration ?? options.mjParams?.duration;
  const effectDuration = target => {
    if(effects.durationMode){const spec=effects.durationMode,mode=domainFacts[spec.fact];return mode===spec.longMode?domainFacts[spec.quantityFact]+' '+spec.unit:spec.values[mode];}
    if(effects.durationFact)return domainFacts[effects.durationFact.quantityFact]+' '+effects.durationFact.unit;
    if(effects.durationFactFormula){const spec=effects.durationFactFormula;return spellFormulaValue(spec.formula,actor)*domainFacts[spec.fact]+' '+spec.unit;}
    if(effects.durationOverride)return effects.durationOverride;
    if(effects.conditionDuration)return effects.conditionDuration;
    if(effects.durationByFact)return effects.durationByFact.values[domainFacts[effects.durationByFact.fact]];
    if(effects.breath?.variants[attributeLore]?.smoke)return `${bfm} Rounds`;
    if (effects.summonProfile) return `${domainFacts.minutesToDawn} minutes`;
    if (effects.roundEffect?.once && effects.roundEffect.after !== undefined) return `${effects.roundEffect.after + 1} Rounds`;
    const parsed = parseSpellDuration(contract.duration, { caster: actor, target });
    if (parsed.kind !== 'unknown') return contract.duration;
    if(effects.type==='narrative')return 'Spécial';
    if (Number.isInteger(Number(mjDuration?.amount)) && Number(mjDuration.amount) > 0 && DURATION_UNIT_LABELS[mjDuration.unit]) {
      return `${Number(mjDuration.amount)} ${DURATION_UNIT_LABELS[mjDuration.unit]}`;
    }
    durationUnreadable ??= parsed.reason;
    return contract.duration;
  };

  // S-06 : un sort de contact ou à distance est une attaque magique ; le feu vient du Domaine (ou de l'attribut choisi).
  const spellNature = declared => spellAttackNature(contract, { attributeLore, declared });
  // S-07 : un sort de cible « Vous » ne blesse ni n'afflige jamais son lanceur, sauf clause `selfHarm` du contrat.
  const selfOnlySpell = /^vous$/i.test(String(contract.target || '').trim()) && !effects.selfHarm;

  // 6. Traitement par cible (uniquement si le sort réussit)
  for (const target of effectiveTargets) {
    const targetEffects=effects.targetFactModes?.values[options.targetTests?.[target.id]?.[effects.targetFactModes.fact]];
    const localEffects={...effects,...structuredClone(targetEffects || {})};
    const secondaryTestSpec=localEffects.primarySecondaryTests?(target.id===effectiveTargets[0].id?localEffects.primarySecondaryTests.primary:localEffects.primarySecondaryTests.others):commonSecondarySpec;
    if(effects.damageWhenTargetFact)domainFacts.__perTarget=options.targetTests?.[target.id]?.[effects.damageWhenTargetFact]===true;
    const noSelfHarm = selfOnlySpell && target.id === actor.id;
    if(effects.chainAttack && targetResults.length){
      const previous=targetResults.at(-1),previousTarget=effectiveTargets[targetResults.length-1],answer=options.targetTests?.[target.id];
      const jumps=bfm+specificSteps('chain-limit').reduce((n,e)=>n+e.steps,0);
      const be=Math.floor(Number(previousTarget.caracs.E)/10),limited=targetResults.length>jumps;
      if(previous.woundsLost<=be || limited){targetResults.push({targetId:target.id,targetName:target.name,woundsLost:0,actions:[{kind:'chain-ended',summary:limited?'Chaîne arrêtée : limite de '+jumps+' rebonds atteinte.':'Chaîne arrêtée : Blessures '+previous.woundsLost+' ≤ BE '+be+' de la cible précédente.'}]});continue;}
      if(answer?.nearest!==true || !Number.isFinite(answer.distance) || answer.distance<0 || answer.distance>bfm)return {ready:false,valid:false,status:'mj-fact-required',error:'Rebond : confirmer la cible la plus proche et sa distance dans BFM mètres.',contract};
    }
    if(effects.durationMode?.willingOnly && domainFacts[effects.durationMode.fact]===effects.durationMode.longMode && options.targetTests?.[target.id]?.unwilling===true)return {ready:false,valid:false,status:'invalid-target',error:'Hibernation : cible consentante requise (WoM p. 146).',contract};
    const resistanceReduction = magicTalentRank(target,'magic-resistance') ? 3 : 0;
    const sl = (castingPreview?.totalCastingSl ?? ((explicitSl ?? castingPreview?.testSl ?? 0)+matchingReserveSl)) - resistanceReduction;
    const targetTotalCastingSl = (castingPreview?.totalCastingSl ?? options.totalCastingSl ?? ((explicitSl ?? castingPreview?.testSl ?? 0)+matchingReserveSl)) - resistanceReduction;
    const targetReceipt = {
      targetId: target.id,
      targetName: target.name || target.id,
      actions: [],
      finalHp: target.hp,
      woundsLost: 0,
      woundsHealed: 0,
      unstoppableForce: effectiveCriticalChoice === 'unstoppable-force'
    };

    targetReceipt.magicResistance = resistanceReduction;
    if(optionTests.length)targetReceipt.actions.push({kind:'option-tests',tests:structuredClone(optionTests),summary:optionTests.map(r=>r.id+' : '+r.test.sl+' DR, '+(r.test.success?'réussi':'raté')).join(' ; ')});
    if(activeOptionRules.some(r=>r.exemptAllies) && !isHostileTarget(actor,target)){targetReceipt.resisted=true;targetReceipt.actions.push({kind:'exempt',summary:'Allié exempté par l’option et son Test réussi.'});targetResults.push(targetReceipt);continue;}
    if(effects.opposedTest && (!effects.opposedTest.whenFact || options.targetTests?.[target.id]?.[effects.opposedTest.whenFact]===true)){
      const spec=effects.opposedTest,die=options.targetTests?.[target.id]?.opponentRoll,casterDie=domainFacts.opposedActorRoll;
      if(!Number.isInteger(die)||die<1||die>100||!Number.isInteger(casterDie)||casterDie<1||casterDie>100)return {ready:false,valid:false,status:'dice-required',error:'Deux d100 explicites du Test opposé requis.',contract};
      const skill=(target.skills || []).find(s=>spellSkillMatches(s,spec.targetSkill));
      const casterTest=selectV5Test(previewV5Test({score:Number(actor.caracs[spec.casterStat]),roll:casterDie}),'keep'),targetTest=selectV5Test(previewV5Test({score:effectiveSkillScore(target,skill?.total ?? skill?.value ?? target.caracs[spec.targetStat],spec.targetStat),roll:die}),'keep');
      targetReceipt.opposedTest={casterTest,targetTest,won:casterTest.sl>targetTest.sl || Boolean(spec.casterWinsTies) && casterTest.sl===targetTest.sl};
      if(spec.resistOnLoss && !targetReceipt.opposedTest.won){targetReceipt.resisted=true;targetReceipt.actions.push({kind:'resisted',summary:'FM opposée : '+casterTest.sl+' contre '+targetTest.sl+', sort évité.'});targetResults.push(targetReceipt);continue;}targetReceipt.banished=effects.banishOnOpposedWin && targetReceipt.opposedTest.won;
      targetReceipt.actions.push({kind:'opposed-test',summary:'FM '+casterTest.sl+' contre '+spec.targetSkill+' '+targetTest.sl+' : '+(effects.banishOnOpposedWin?(targetReceipt.banished?'banni sans Blessure':'non banni'):targetReceipt.opposedTest.won?'effet appliqué':'effet résisté')+'.'});
    }
    if(effects.breath){
      const variant=effects.breath.variants[attributeLore],answers=options.targetTests?.[target.id] || {};
      if(!variant)return {ready:false,valid:false,status:'lore-choice-required',error:'Souffle : Domaine du lanceur requis.',contract};
      const first=target.id===effectiveTargets[0].id,limit=first?(effects.breath.rangeBase+bfm)*overcastRangeMultiplier:Math.floor(Number(actor.caracs.I)/10)*overcastAoeMultiplier;
      const distance=first?answers.distance:answers.fromPrimary;
      if(!Number.isFinite(distance)||distance<0||distance>limit)return {ready:false,valid:false,status:'mj-fact-required',error:'Souffle : distance déclarée hors limite ou manquante ('+limit+' mètres).',contract};
      if(!Number.isInteger(options.ctRoll)||options.ctRoll<1||options.ctRoll>100)return {ready:false,valid:false,status:'dice-required',error:'Souffle : saisir le Test de CT du lanceur (d100).',contract};
      const shot=selectV5Test(previewV5Test({score:Number(actor.caracs.CT),roll:options.ctRoll,kind:'ranged',slModifiers:[{id:'breath-ct',amount:0}]}),'keep');
      let defended=null;
      if(answers.opposeBreath!==false){
        if(!Number.isInteger(answers.dodgeRoll)||answers.dodgeRoll<1||answers.dodgeRoll>100)return {ready:false,valid:false,status:'dice-required',error:target.name+' : saisir l’Esquive ou déclarer le refus d’opposition.',contract};
        const skill=(target.skills || []).find(s=>spellSkillMatches(s,'Esquive'));
        defended=selectV5Test(previewV5Test({score:effectiveSkillScore(target,skill?.total ?? skill?.value ?? target.caracs.Ag,'Ag'),roll:answers.dodgeRoll}),'keep');
      }
      targetReceipt.breath={shot,defended,variant:attributeLore};
      if(defended && defended.sl>shot.sl){targetReceipt.resisted=true;targetReceipt.actions.push({kind:'resisted',summary:'Esquive bat le Test de CT : Souffle évité.'});targetResults.push(targetReceipt);continue;}
      if(!variant.smoke){
        const raw=resolveSpellDamage({caster:actor,target,formula:String(bfm+variant.damage),roll,ignoreMetalAp:variant.ignoreMetalAp,spell:{name:contract.name}});
        targetReceipt.woundsLost=raw.woundsLost;targetReceipt.finalHp=raw.targetNewHp;targetReceipt.damage=raw;
      }
      targetReceipt.actions.push({kind:'breath',summary:'Souffle '+attributeLore+' : CT '+shot.sl+' DR'+(defended?', Esquive '+defended.sl+' DR':', opposition refusée')+'.'});
      if(variant.inventoryDamage)targetReceipt.inventoryDamage=variant.inventoryDamage;
    }
    if(effects.rolledDamage){
      const die=options.targetTests?.[target.id]?.damageRoll ?? options.damageRoll;
      if(!Number.isInteger(die)||die<1||die>effects.rolledDamage.sides)return {ready:false,valid:false,status:'dice-required',error:target.name+' : saisir le d'+effects.rolledDamage.sides+' des dégâts.',contract};
      const raw=resolveSpellDamage({caster:actor,target,formula:String(die),roll,ignoreAp:effects.rolledDamage.ignoreAp,spell:{name:contract.name}});
      targetReceipt.woundsLost=raw.woundsLost;targetReceipt.finalHp=raw.targetNewHp;targetReceipt.damage=raw;
      targetReceipt.actions.push({kind:'rolled-damage',summary:'Dégâts : d'+effects.rolledDamage.sides+' = '+die+', '+raw.woundsLost+' B après BE/PA.'});
    }
    if(effects.animalFriend && options.targetTests?.[target.id]?.targetSize>=domainFacts.casterSize)return {ready:false,valid:false,status:'invalid-target-admissibility',error:'Amitié animale : la cible doit être strictement plus petite que le lanceur.',contract};
    const rule = effects.targetRule || {};
    const traits = [...(target.traits || []), ...(target.extensions?.traits || [])].map(fold).join(' ');
    const size = /petite|small/.test(traits) ? 'small' : /enorme|enormous|monstr/.test(traits) ? 'enormous' : /grande|large/.test(traits) ? 'large' : 'average';
    if ((rule.requiredFact && options.targetTests?.[target.id]?.[rule.requiredFact]!==true) || (rule.exceptAnyTrait?.some(t=>hasTargetNatureOrTrait(target,t))) || (rule.requiredAllTraits?.some(group=>!group.some(t=>hasTargetNatureOrTrait(target,t)))) || (rule.exceptLore && hasArcaneMagicLore(target,rule.exceptLore)) || (rule.exceptTrait && hasTargetNatureOrTrait(target,rule.exceptTrait)) || (rule.requiredTrait && !hasTargetNatureOrTrait(target,rule.requiredTrait)) || (rule.requiredAnyTrait && !rule.requiredAnyTrait.some(t=>hasTargetNatureOrTrait(target,t))) || (rule.allowedSizes && !rule.allowedSizes.includes(size)) || (rule.alliesOnly && target.camp!==actor.camp) || (rule.enemiesOnly && !isHostileTarget(actor,target))) {
      targetReceipt.resisted = true; targetReceipt.actions.push({ kind: 'excluded', summary: 'Cible exemptée ou inadmissible selon les clauses du sort.' }); targetResults.push(targetReceipt); continue;
    }
    let secondaryFailCondition = null;
    if((options.magicDefianceTargets || []).includes(target.id)){
      if(!magicTalentRank(target,'magic-defiance') || !options.magicAdventureId || target.extensions?.v5?.magicDefianceAdventure===options.magicAdventureId)return {ready:false,valid:false,error:'Défiance magique : talent acquis, aventure définie et usage disponible requis.',contract};
      // S-11 : Chance = registre V5 uniquement (resources.fortune, absent tant que le compteur n'est pas initialisé).
      const defianceFortune=Number(options.fortuneByTarget?.[target.id] ?? target.extensions?.v5?.resources?.fortune ?? NaN);
      if(!Number.isFinite(defianceFortune))return {ready:false,valid:false,error:'Défiance magique : compteur de Chance de '+(target.name || target.id)+' non initialisé.',contract};
      if(defianceFortune<1)return {ready:false,valid:false,error:'Défiance magique : 1 point de Chance requis.',contract};
      targetReceipt.resisted=true;targetReceipt.defianceCancelled=true;targetReceipt.actions.push({kind:'resisted',summary:'Défiance magique : sort annulé sur cette cible (1 Chance, une fois par aventure).'});targetResults.push(targetReceipt);continue;
    }
    // V5 p. 122 (D-07) : la Puissance totale ignore le NI ; la réduction de Résistance à la Magie ne joue alors que sur les effets de la cible.
    const totalPower = castingPreview?.critical && castingPreview?.criticalChoice === 'total-power';
    if (resistanceReduction && !totalPower && targetTotalCastingSl < Number(contract.cn)) {
      targetReceipt.resisted=true;targetReceipt.actions.push({kind:'resisted',summary:'Résistance à la Magie : −3 DR ; NI non atteint sur cette cible.'});targetResults.push(targetReceipt);continue;
    }
    // Évaluation d'un test secondaire de résistance/évitement de la cible UNIQUEMENT si le contrat en déclare un
    if (secondaryTestSpec && secondaryTestSpec.actor === 'target' && !options.targetTests?.[target.id]?.[secondaryTestSpec.skipWhenFact] && (!secondaryTestSpec.whenFact || options.targetTests?.[target.id]?.[secondaryTestSpec.whenFact]===true || domainFacts[secondaryTestSpec.whenFact]===true) && !(secondaryTestSpec.exceptLore && hasArcaneMagicLore(target,secondaryTestSpec.exceptLore))) {
      const rollKey = secondaryTestSpec.rollField || 'resistanceRoll';
      const explicitTargetRoll = options.targetTests?.[target.id]?.[rollKey] ?? options.targetTests?.[target.id]?.roll ?? options[rollKey] ?? options.resistanceRoll ?? options.targetTestRoll ?? options.mjParams?.[rollKey] ?? options.mjParams?.resistanceRoll;
      const skillName = secondaryTestSpec.skill || 'Force Mentale';
      const statKey = secondaryTestSpec.stat || 'FM';
      const modifierSl = Number(secondaryTestSpec.modifierSl) || 0;
      const foundSkill = (Array.isArray(target.skills) ? target.skills : []).find(s => spellSkillMatches(s,skillName));
      const targetScore = secondaryTestSpec.scoreWhenFact && options.targetTests?.[target.id]?.[secondaryTestSpec.scoreWhenFact]===true ? options.targetTests[target.id][secondaryTestSpec.scoreFact] : effectiveSkillScore(target,Number(foundSkill?.total ?? foundSkill?.value ?? foundSkill?.score ?? baseCharacteristicScore(target,statKey)),statKey);

      if (explicitTargetRoll === undefined || explicitTargetRoll === null || explicitTargetRoll === '') {
        if (secondaryTestSpec.mandatory) {
          targetReceipt.resistanceTest = {
            skill: skillName,
            stat: statKey,
            score: targetScore,
            modifierSl,
            opposed: Boolean(secondaryTestSpec.opposed),
            roll: null,
            resisted: false,
            pending: true
          };
          missingSecondaryTest = {
            spellName: contract.name,
            actor: 'target',
            targetId: target.id,
            skill: skillName,
            stat: statKey,
            modifierSl,
            opposed: Boolean(secondaryTestSpec.opposed),
            score: targetScore,
            field: rollKey,
            reason: `Test secondaire obligatoire manquant pour ${contract.name} : saisir le jet de ${skillName} (${modifierSl >= 0 ? '+' : ''}${modifierSl} DR) de ${target.name || target.id}.`
          };
          targetResults.push(targetReceipt);
          continue;
        }
      } else if (Number.isFinite(Number(explicitTargetRoll))) {
        const resRoll = Number(explicitTargetRoll);
        const testPrev = previewV5Test({
          score: targetScore,
          roll: resRoll,
          kind: 'test',
          slModifiers: modifierSl !== 0 ? [{ id: 'spell-mod', label: 'Modificateur du sort', amount: modifierSl }] : [],
          advantageSources: magicTalentRank(target,'magic-defiance') ? [{id:'magic-defiance',label:'Défiance magique'}] : []
        });
        const selectedRes = selectV5Test(testPrev, options.targetTests?.[target.id]?.choice || testPrev.options?.[0]?.id || 'keep');
        const resisted = secondaryTestSpec.opposed
          ? (selectedRes.success && selectedRes.sl >= (Number(sl) || 0))
          : Boolean(selectedRes.success);
        targetReceipt.resistanceTest = {
          skill: skillName,
          stat: statKey,
          modifierSl,
          opposed: Boolean(secondaryTestSpec.opposed),
          roll: resRoll,
          targetScore,
          targetSl: selectedRes.sl,
          resisted
        };
        if (secondaryTestSpec.outcomeOnly) {
          if (!selectedRes.success && selectedRes.sl <= -5) secondaryFailCondition = secondaryTestSpec.astoundingCondition;
          targetReceipt.actions.push({ kind: 'secondary-test', summary: `${skillName} : ${selectedRes.success ? 'réussite' : 'échec'} (${selectedRes.sl} DR).` });
        } else if (secondaryTestSpec.conditionsOnly) {
          targetReceipt.conditionsResisted = resisted;
        } else if (secondaryTestSpec.failCondition) {
          if (!resisted) secondaryFailCondition = secondaryTestSpec.failCondition;
          targetReceipt.actions.push({ kind: 'secondary-test', summary: `${target.name || target.id} : ${skillName} ${resisted ? 'réussi, évite' : 'raté, subit'} l’État ${secondaryTestSpec.failCondition} (jet ${resRoll} vs ${targetScore}).` });
        } else if (resisted && secondaryTestSpec.damageOnSuccess===undefined) {
          targetReceipt.resisted = true;
          targetReceipt.actions.push({
            kind: 'resisted',
            roll: resRoll,
            targetScore,
            targetSl: selectedRes.sl,
            summary: `${target.name || target.id} résiste au sort ${contract.name} (${skillName} : jet ${resRoll} vs ${targetScore}, ${selectedRes.sl >= 0 ? '+' : ''}${selectedRes.sl} DR).`
          });
          targetResults.push(targetReceipt);
          continue;
        }
      }
    }

    // A. Projectile Magique
    if (!noSelfHarm && (!effects.damageWhenFact || domainFacts[effects.damageWhenFact]) && (effects.type === 'magic-missile' || effects.missile)) {
      const missileRes = resolveMagicMissile({
        caster: actor,
        target,
        spell: {
          name: contract.name,
          damage: (effects.primarySplash && target.id !== effectiveTargets[0]?.id ? effects.primarySplash.damage : secondaryTestSpec?.damageOnSuccess!==undefined && targetReceipt.resistanceTest?.resisted ? secondaryTestSpec.damageOnSuccess : baseMissileDamage)-(effects.chainAttack?targetResults.length:0),
          location: effects.missile?.chosenLocation ? domainFacts.location : undefined
        },
        roll,
        castingSl: sl,
        overcastDamage: overcastDamageBonus,
        ignoreMetalAp: Boolean(options.ignoreMetalAp || effects.missile?.ignoreMetalAp || loreDamage.ignoreMetalAp),
        ignoreNonMagicalAp: loreDamage.ignoreNonMagicalAp,
        metalDamageBonus: loreDamage.metalDamageBonus,
        // « Ignore BE / PA » du sort (V5 : Transmutation de Chamon, Creuset, Drain…)
        ignoreAp: Boolean(effects.missile?.ignoreAp),
        ignoreBe: Boolean(effects.missile?.ignoreBe),
        ignoreNaturalArmor: Boolean(effects.missile?.ignoreNaturalArmor),
        naturalArmorAp: domainFacts.naturalArmorAp,
        extraDamage: allLore?.damageRules?.extraDamagePerTarget?.get(target.id) || 0
      });

      targetReceipt.missile = missileRes;
      targetReceipt.woundsLost += missileRes.woundsLost;
      targetReceipt.finalHp = missileRes.targetNewHp;
      targetReceipt.actions.push({
        kind: 'missile',
        damage: missileRes.finalDamage,
        location: missileRes.location,
        summary: `Projectile magique : ${missileRes.finalDamage} B à ${missileRes.location}`
      });
    }

    // B. Dégâts Magiques Fixes ou Formules
    if (!noSelfHarm && (!effects.damageWhenTargetFact || domainFacts.__perTarget) && (effects.type === 'damage' || (effects.damage && effects.type !== 'magic-missile'))
      && !(typeof effects.damage === 'object' && effects.damage.undeadOnly && !isTargetUndead(target))) {
      const dmgConf = typeof effects.damage === 'object' ? effects.damage : { formula: String(effects.damage) };

      // Bannissement Majeur : dégâts doublés contre cibles Instables
      let extraMultiplier = 1;
      if (effects.special === 'major-banishment' && (target.traits || []).some(t => /instable/i.test(t))) {
        extraMultiplier = 2;
      }

      const dmgRes = resolveSpellDamage({
        caster: actor,
        target,
        formula: secondaryTestSpec?.damageOnSuccess!==undefined && targetReceipt.resistanceTest?.resisted ? String(secondaryTestSpec.damageOnSuccess) : dmgConf.formula || String(dmgConf.raw || 0),
        spell: { ...contract, ...dmgConf },
        roll,
        sl,
        // Projectile magique écrit comme formule (V5 : « +N ») : la surpuissance de dégâts s'y ajoute aussi.
        extraDamage: dmgConf.magicMissile ? overcastDamageBonus : 0,
        ignoreBe: dmgConf.ignoreBe || false,
        ignoreAp: dmgConf.ignoreAp || false,
        directWounds: dmgConf.directWounds || false,
        ignoreMetalAp: loreDamage.ignoreMetalAp,
        ignoreNonMagicalAp: loreDamage.ignoreNonMagicalAp,
        metalDamageBonus: loreDamage.metalDamageBonus
      });

      if (extraMultiplier > 1) {
        dmgRes.finalDamage *= extraMultiplier;
        dmgRes.woundsLost *= extraMultiplier;
        dmgRes.targetNewHp = Math.max(0, target.hp - dmgRes.woundsLost);
      }

      targetReceipt.damage = dmgRes;
      targetReceipt.woundsLost += dmgRes.woundsLost;
      targetReceipt.finalHp = dmgRes.targetNewHp;
      if (dmgRes.permanentMaxHpReduction) {
        targetReceipt.permanentMaxHpReduction = true;
        targetReceipt.newMaxHp = dmgRes.targetNewMaxHp;
      }
      targetReceipt.actions.push({
        kind: 'damage',
        damage: dmgRes.finalDamage,
        summary: `Dégâts du sort : ${dmgRes.finalDamage} B`
      });

      // Gestion du Vol de Vie
      if (dmgConf.lifeStealRatio || effects.lifeSteal) {
        const stolenRatio = dmgConf.lifeStealRatio || 0.5;
        const stolenHp = Math.floor(dmgRes.finalDamage * stolenRatio);
        targetReceipt.lifeSteal = {
          stolenHp,
          casterHeal: stolenHp
        };
      }
    }

    // Blessure Critique d'incantation (critical-wound) si le sort inflige des dégâts
    if (effectiveCriticalChoice === 'critical-wound' && (targetReceipt.missile || targetReceipt.damage)) {
      const critLocation = targetReceipt.missile?.location || targetReceipt.damage?.location || 'Corps';
      targetReceipt.criticalWoundTriggered = true;
      targetReceipt.criticalWound = {
        location: critLocation,
        spellId: contract.id,
        spellName: contract.name,
        casterId: actor.id
      };
      targetReceipt.actions.push({
        kind: 'critical-wound',
        location: critLocation,
        summary: `Blessure Critique infligée (${critLocation})${spellCriticalSeverityReminder(actor)}`
      });
    }

    // C. Soins Magiques (sauf Apothéose Verdoyante qui possède sa propre règle de résurrection V5)
    if ((effects.type === 'healing' || effects.healing) && effects.special !== 'verdant-apotheosis' && contract.name !== 'Apothéose Verdoyante') {
      let healAmount = 0;
      const healConf = effects.healing || {};
      if (healConf.amount !== undefined) {
        healAmount = Number(healConf.amount);
      } else if (healConf.amountFormula === 'BI') {
        healAmount = Math.max(1, Math.floor((Number(actor.caracs?.Int) || 30) / 10));
      } else if (healConf.amountFormula === 'BFM') {
        healAmount = Math.max(1, Math.floor((Number(actor.caracs?.FM) || 30) / 10));
      } else if (healConf.amountFormula === 'DR') {
        healAmount = Math.max(1, Number(sl) || 1);
      } else if (typeof healConf.amountFormula === 'string') {
        // Autre formule déclarée (ex. BDex, BSoc) : valeur du lanceur, jamais deviné.
        const value = spellFormulaValue(healConf.amountFormula, actor, Number(sl) || 0);
        healAmount = Number.isFinite(value) ? Math.max(1, value) : 1;
      } else {
        healAmount = 1;
      }

      if (effects.special === 'apotheose' && apotheoseOptions) {
        if (apotheoseRaise) {
          const declaredDead = Number(target.hp) === 0 && (target.dead === true || target.isDead === true || target.extensions?.v5?.dead === true || (options.deadTargetIds || []).includes(target.id) || options.targetTests?.[target.id]?.dead === true);
          if (target.extensions?.v5?.cannotBeRevived === true) return { ready: false, valid: false, status: 'invalid-target-admissibility', error: `Apothéose (+10 DR) : ${target.name || target.id} ne peut plus être ramené (mort au terme d’une Apothéose).`, contract };
          if (!declaredDead) return { ready: false, valid: false, status: 'invalid-target-admissibility', error: `Apothéose (+10 DR) : ${target.name || target.id} n’est pas mort (0 B et mort constatée requis).`, contract };
          healAmount = Number(target.maxHp) || healAmount;
        } else {
          healAmount *= 1 + apotheoseSteps;
        }
        if (apotheoseOptions.criticalHeal) {
          const passed = options.criticalHealTest ?? options.mjParams?.criticalHealTest;
          if (typeof passed !== 'boolean') return { ready: false, valid: false, status: 'dice-required', missing: ['criticalHealTest'], error: 'Apothéose (+6 DR) : saisir le résultat du Test de Sociabilité Intermédiaire (+0 DR).', contract };
          targetReceipt.apotheose = { criticalHealed: passed, raised: apotheoseRaise };
        } else if (apotheoseRaise) targetReceipt.apotheose = { raised: true };
      }
      if (healConf.loreAmount && hasArcaneMagicLore(target,healConf.loreAmount.lore)) healAmount = 1 + Math.max(0,sl);
      const healRes = resolveSpellHealing({ target, amount: healAmount });
      const delta = healRes.hpDelta ?? healRes.healedAmount ?? healAmount;
      targetReceipt.healing = {
        ...healRes,
        healedAmount: delta
      };
      targetReceipt.woundsHealed += delta;
      targetReceipt.finalHp = healRes.participant?.hp ?? Math.min(Number(target.maxHp) || 12, (Number(target.hp) || 0) + delta);
      targetReceipt.actions.push({
        kind: 'healing',
        healed: delta,
        summary: `Soin magique : +${delta} B (${targetReceipt.finalHp}/${target.maxHp || target.hp})`
      });
    }

    // D. Effets Temporaires et paramètres explicites de contrat (Caracs, Bonus de Tests, PA, Ward, Conditions, Traits, Talents, Fortune/Fate, Corrosion)
    const computedStatModifiers = { ...(effects.statModifiers || {}), ...(effects.statModes?.values[domainFacts[effects.statModes?.fact]] || {}) };
    for(const [stat,max] of Object.entries(effects.statCaps || {}))if(computedStatModifiers[stat]>0)computedStatModifiers[stat]=Math.min(computedStatModifiers[stat],Math.max(0,max-baseCharacteristicScore(target,stat)));
    if(effects.statModes?.values[domainFacts[effects.statModes.fact]]?.M===0)computedStatModifiers.M=-knownMovement(target);
    if (effects.movementSet !== undefined) computedStatModifiers.M = Number(effects.movementSet) - knownMovement(target);
    if (effects.encumbrance === true) {
      const facts=options.targetTests[target.id], from=facts.encumbranceStep;
      const to = domainFacts.encumbranceMode === 'heavier' ? Math.min(3,from + 2) : 0;
      const M=to>=3?0:to===0?facts.unburdenedM:Math.max(4-to,facts.unburdenedM-to);
      // V5 p. 299 : le troisième palier interdit le mouvement, sans nouveau malus d’Ag indiqué.
      const Ag=to>=3?Number(target.caracs.Ag):to===0?facts.unburdenedAg:Math.max(to===2?10:0,facts.unburdenedAg-10*to);
      computedStatModifiers.M=M-knownMovement(target);computedStatModifiers.Ag=Ag-Number(target.caracs.Ag);
    }
    if (Number.isFinite(Number(effects.strengthPerSl)) && Number(effects.strengthPerSl) !== 0) {
      const slMult = Math.max(1, Number(sl) || 1);
      computedStatModifiers.F = (Number(computedStatModifiers.F) || 0) + slMult * Number(effects.strengthPerSl);
    }
    let movementUnknown = false;
    if (Number.isFinite(Number(effects.movementMultiplier)) && Number(effects.movementMultiplier) > 0 && Number(effects.movementMultiplier) !== 1) {
      const baseM = knownMovement(target);
      // Mouvement inconnu : jamais de valeur inventée, l'aperçu est bloqué plus bas. Réduction arrondie à l'inférieur.
      if (baseM === null) movementUnknown = true;
      else computedStatModifiers.M = (Number(computedStatModifiers.M) || 0) + Math.floor(baseM * Number(effects.movementMultiplier)) - baseM;
    }

    const computedTestModifiers = { ...(effects.testModifiers || {}) };
    if (Number.isFinite(Number(effects.dodgeBonusSl)) && Number(effects.dodgeBonusSl) !== 0) {
      computedTestModifiers.Esquive = (Number(computedTestModifiers.Esquive) || 0) + Number(effects.dodgeBonusSl);
    }
    if (Number.isFinite(Number(effects.dispelBonusSl)) && Number(effects.dispelBonusSl) > 0) {
      computedTestModifiers['Dissipation (Langue Magick)'] = Math.max(
        Number(computedTestModifiers['Dissipation (Langue Magick)']) || 0,
        Number(effects.dispelBonusSl)
      );
    }
    if (specialTag === 'twitch' || (Number.isFinite(Number(effects.twitchPenaltySl)) && Number(effects.twitchPenaltySl) !== 0)) {
      const pen = Number(effects.twitchPenaltySl) || -1;
      computedTestModifiers['Tous les Tests (Secousse)'] = pen;
      computedTestModifiers.CC = pen;
      computedTestModifiers.CT = pen;
      computedTestModifiers.Dex = pen;
    }

    const computedApModifiers = { ...(effects.apModifiers || {}) };
    if(effects.metalApReduction)for(const k of ['head','body','arms','legs']){const value=options.targetTests?.[target.id]?.['metalAp_'+k];if(!Number.isFinite(value) || value<0 || value>Number(target.armor?.[k] ?? 0))return {ready:false,valid:false,status:'mj-fact-required',error:'PA métalliques '+k+' requis, compris entre zéro et les PA réellement portés.',contract};computedApModifiers[k]=-Math.min(value,effects.metalApReduction);}
    if (effects.apFormula === 'BFM') computedApModifiers.all = bfm;
    if (effects.progressiveAp) {
      const progAp = Math.min(Number(effects.maxAp) || 5, Math.max(1, Number(sl) || 2));
      for (const loc of ['head', 'body', 'arms', 'legs']) {
        computedApModifiers[loc] = Math.max(Number(computedApModifiers[loc]) || 0, progAp);
      }
    }
    const corrodeAp = (Number(effects.corrodeMetalAp) || 0) + (Number(effects.corrodeLeatherAp) || 0) + (Number(effects.destroyArmourAp) || 0);
    if (corrodeAp > 0) {
      for (const loc of ['head', 'body', 'arms', 'legs']) {
        computedApModifiers[loc] = (Number(computedApModifiers[loc]) || 0) - corrodeAp;
      }
    }

    let computedTraits = [...(Array.isArray(effects.traits) ? effects.traits : [])];
    for (const entry of specificSteps('trait-rating')) computedTraits = raiseTraitRating(computedTraits, entry.trait, entry.steps * (Number(entry.per) || 1));
    const computedTalents = [...(Array.isArray(effects.talents) ? effects.talents : [])];
    const computedConditions = [...(Array.isArray(effects.conditions) ? effects.conditions : []), ...(!targetReceipt.conditionsResisted ? effects.failConditions || [] : []), ...(secondaryFailCondition ? [secondaryFailCondition] : []), ...(target.id === actor.id && Array.isArray(effects.selfConditions) ? effects.selfConditions : [])]
      .filter(name => !noSelfHarm || !NEGATIVE_CONDITIONS.has(fold(name)));
    const computedRemoveConditions = [...(Array.isArray(effects.removeConditions) ? effects.removeConditions : [])];
    const computedSpecialState = { ...(effects.specialState || {}), ...(effects.stateModes?.values[domainFacts[effects.stateModes?.fact]] || {}), ...(specialTag === 'twitch' ? { twitch: true } : {}) };
    Object.assign(computedSpecialState,localEffects.specialState || {});
    for(const [key,formula] of Object.entries(effects.specialStateFormulas || {}))computedSpecialState[key]=spellFormulaValue(formula,actor,sl);
    for(const [key,fact] of Object.entries(effects.specialStateFactValues || {}))computedSpecialState[key]=domainFacts[fact];
    for(const [key,formula] of Object.entries(effects.testModifierFormulas || {}))computedTestModifiers[key]=spellFormulaValue(formula,actor,sl);
    if(effects.selfTargetsOnly && target.id!==actor.id)return {ready:false,valid:false,error:'Cette formulation est réservée au lanceur.',contract};
    if(effects.conditionExceptLore && hasArcaneMagicLore(target,effects.conditionExceptLore))computedConditions.length=0;
    if(effects.daemonConditions && isTargetDaemon(target))computedConditions.push(...effects.daemonConditions);
    if(effects.primarySecondaryTests && !targetReceipt.conditionsResisted){
      computedConditions.push(...(target.id===effectiveTargets[0].id?effects.primaryConditions:effects.splashConditions));
      const spec=effects.followupTest,die=options.targetTests?.[target.id]?.[spec.rollField];
      if(!Number.isInteger(die)||die<1||die>100)return {ready:false,valid:false,error:target.name+' : second Test de '+spec.skill+' (d100) requis.',contract};
      const skill=(target.skills || []).find(s=>spellSkillMatches(s,spec.skill)),test=selectV5Test(previewV5Test({score:effectiveSkillScore(target,skill?.total ?? target.caracs[spec.stat],spec.stat),roll:die,slModifiers:[{id:'followup',amount:spec.modifierSl}]}),'keep');
      targetReceipt.followupTest=test;if(!test.success){computedConditions.push(...spec.conditions);Object.assign(computedSpecialState,spec.state);}
    }
    if(effects.factTable){const table=effects.factTable,outcome=table.outcomes.find(o=>domainFacts[table.fact]>=o.min&&domainFacts[table.fact]<=o.max);computedConditions.push(...(outcome.conditions || []));Object.assign(computedSpecialState,outcome.state || {});targetReceipt.actions.push({kind:'table',summary:outcome.label});}
    if(effects.permanentStatDice){const deltas={};for(const [key,field] of Object.entries(effects.permanentStatDice)){const die=options.targetTests?.[target.id]?.[field];if(!Number.isInteger(die)||die<1||die>10)return {ready:false,valid:false,error:target.name+' : d10 séparé de '+key+' requis.',contract};deltas[key]=-die;}targetReceipt.permanentStatDeltas=deltas;}
    if(effects.restoreCorpse){const age=options.targetTests?.[target.id]?.corpseAgeSeconds;if(!Number.isFinite(age)||age<0||age>effects.restoreCorpse.maxAgeSeconds)return {ready:false,valid:false,status:'mj-fact-required',error:'Cercueil : cadavre mort depuis au plus une heure requis.',contract};if(Number(target.hp)!==0 || options.targetTests?.[target.id]?.dead!==true)return {ready:false,valid:false,error:'Cadavre à 0 B et mort constatée requis.',contract};targetReceipt.directSetHp=Number(target.maxHp);targetReceipt.restoreCorpse=true;}
    for(const rule of activeOptionRules.filter(r=>r.conditionPerStep)){for(let i=0;i<rule.steps;i++)computedConditions.push(rule.conditionPerStep);}
    for(const rule of activeOptionRules.filter(r=>r.conditions && r.chosenTargets)){const ids=domainFacts['optionTargets_'+rule.id];if(!Array.isArray(ids)||ids.length!==rule.steps||new Set(ids).size!==ids.length||ids.some(id=>!effectiveTargets.some(t=>t.id===id)))return {ready:false,valid:false,error:'Désigner les destinataires de '+rule.id+'.',contract};if(ids.includes(target.id))computedConditions.push(...rule.conditions);}
    let optionSuffocation=false;
    for(const rule of activeOptionRules.filter(r=>r.immediateSuffocation)){
      const ids=domainFacts['optionTargets_'+rule.id];if(!Array.isArray(ids)||ids.length!==rule.steps||new Set(ids).size!==ids.length||ids.some(id=>!effectiveTargets.some(t=>t.id===id)))return {ready:false,valid:false,error:'Une cible différente par palier de suffocation est requise.',contract};
      if(!ids.includes(target.id))continue;
      const die=options.targetTests?.[target.id]?.optionResistanceRoll;
      if(!Number.isInteger(die)||die<1||die>100)return {ready:false,valid:false,error:target.name+' : d100 de FM contre suffocation requis.',contract};
      const test=selectV5Test(previewV5Test({score:effectiveSkillScore(target,target.caracs.FM,'FM'),roll:die}),'keep');
      targetReceipt.optionResistanceTest=test;optionSuffocation=!test.success;
      if(optionSuffocation){computedSpecialState.suffocating=true;const lost=Math.min(1,Number(target.hp));targetReceipt.woundsLost+=lost;targetReceipt.finalHp-=lost;}
    }

    const assistedClauses=effects.reminderModes?.values[domainFacts[effects.reminderModes.fact]] || contract.assistedClauses;
    if(assistedClauses?.length){if(contract.duration!=='Instantané')computedSpecialState.assistedReminder=[computedSpecialState.assistedReminder,...assistedClauses].filter(Boolean).join(' ');targetReceipt.actions.push({kind:'mj-input',summary:assistedClauses.join(' ')});}
    if(effects.revealMagic === true){
      computedSpecialState.visibleMagic=options.targetTests?.[target.id]?.magicNature===true || (target.extensions?.v5?.spellEffects || []).length>0;
      targetReceipt.actions.push({kind:'visible-magic',summary:computedSpecialState.visibleMagic?'Aura rendue visible, même cachée.':'Mage/créature ordinaire sans effet magique : ne brille pas.'});
    }
    if(effects.purifyAffliction === true){
      const spec=effects.secondaryTest,die=options[spec.rollField];
      if(!Number.isInteger(die)||die<1||die>100)return {ready:false,valid:false,status:'secondary-test-required',error:'Purification : saisir le d100 de Résistance du lanceur.',contract};
      const skill=(actor.skills || []).find(s=>spellSkillMatches(s,spec.skill)),secondary=selectV5Test(previewV5Test({score:effectiveSkillScore(actor,skill?.total ?? skill?.value ?? actor.caracs[spec.stat],spec.stat),roll:die}),'keep');
      targetReceipt.afflictionReceipt={kind:domainFacts.affliction,name:domainFacts.afflictionName,purged:Boolean(secondary?.success),transferred:Boolean(secondary?.fumble)};
      computedSpecialState.afflictionReceipt=targetReceipt.afflictionReceipt;
      targetReceipt.actions.push({kind:'affliction-receipt',summary:domainFacts.afflictionName+' : '+(secondary?.success?'affection unique purgée':secondary?.fumble?'affection contractée par le lanceur':'aucune purification')+' ; à reporter sur la fiche.'});
    }
    if(effects.suppression === true){
      const mode=domainFacts.deadlockMode,answer=options.targetTests?.[target.id] || {};
      if(mode==='effect'){computedSpecialState.suppressionReceipt=answer.suppressedEffectId;targetReceipt.suppressedEffectIds=[answer.suppressedEffectId];}
      if(mode==='spell')computedSpecialState.suppressedSpellIds=[answer.suppressedSpellId];
      if(mode==='item')computedSpecialState.suppressedObjectId=answer.objectId;
      targetReceipt.actions.push({kind:'suppression',summary:'Suppression temporaire de '+(computedSpecialState.suppressionReceipt || computedSpecialState.suppressedSpellIds?.[0] || computedSpecialState.suppressedObjectId)+', sans modifier les autres sorts ni la fiche.'});
    }
    const breathVariant=effects.breath?.variants[attributeLore];
    if(breathVariant){
      computedConditions.push(...(breathVariant.conditions || []).map(name=>breathVariant.cold?{name,source:{coldBreath:true}}:name));
      if(breathVariant.smoke){computedSpecialState.suffocating=true;computedSpecialState.lineOfSightBlocked=true;}
    }
    if(effects.sleep){
      const resting=(target.states || []).some(s=>fold(s.key || s.name)==='aterre' || fold(s.key || s.name)==='a-terre') || options.targetTests?.[target.id]?.voluntaryTired===true;
      computedSpecialState.sleeping=resting;computedConditions.push(resting?'Inconscient':'À Terre');
    }
    if(effects.entangledStrength){computedSpecialState.entangledStrength=effects.entangledStrength;for(let i=0;i<computedConditions.length;i++)if(computedConditions[i]==='Enchevêtré')computedConditions[i]={name:'Enchevêtré',source:{strength:effects.entangledStrength}};}
    if(effects.mountFlee && options.targetTests?.[target.id]?.mount)computedSpecialState.mountFleeing=!targetReceipt.conditionsResisted;
    if(effects.specialState?.bodyFire)computedSpecialState.bodyFire={...effects.specialState.bodyFire,castingSl:sl};
    if(effects.summon?.indestructible)computedSpecialState.summonAttack={...effects.summon,ws:effects.summon.wsFormula?spellFormulaValue(effects.summon.wsFormula,actor):effects.summon.ws,range:spellFormulaValue(effects.summon.rangeFormula,actor)*overcastRangeMultiplier};
    if(effects.attitudeModifiers){const attitude=isHostileTarget(actor,target)?'enemies':target.camp===actor.camp?'allies':'neutral';Object.assign(computedTestModifiers,effects.attitudeModifiers[attitude]);if(attitude==='enemies'){
      const die=options.targetTests?.[target.id]?.fearRoll ?? options.targetTests?.[target.id]?.roll;
      const immune=target.extensions?.v5?.specialStates?.fearTerrorImmunity;
      if(!immune && (!Number.isInteger(die)||die<1||die>100))return {ready:false,valid:false,status:'dice-required',error:'Cor : saisir le d100 de Peur (Calme) de chaque ennemi.',contract};
      const skill=(target.skills || []).find(s=>spellSkillMatches(s,'Calme'));
      const fear=immune?{success:true,sl:1,immune:true}:selectV5Test(previewV5Test({score:effectiveSkillScore(target,skill?.total ?? skill?.value ?? target.caracs.FM,'FM'),roll:die,slModifiers:[{id:'horn-morale',amount:-2}]}),'keep');
      targetReceipt.fearTest=fear;targetReceipt.actions.push({kind:'fear-test',summary:'Peur (1) : '+(fear.success?'réussie/immunisé':'ratée')+', '+fear.sl+' DR.'});
      if(!fear.success)computedConditions.push({key:'fear-of-talent',name:'Peur du Cor d’Andar (1)',level:1,authorId:actor.id,rating:1,mode:'sl',successes:0,restriction:'cannotGainMomentum'});
    }}
    if(effects.entangleStrength){computedSpecialState.entangledStrength=Number(actor.caracs.FM);for(let i=0;i<computedConditions.length;i++)if(computedConditions[i]==='Enchevêtré')computedConditions[i]={name:'Enchevêtré',source:{strength:Number(actor.caracs.FM)}};}
    if(effects.dropHeldObject && (!effects.secondaryTest?.whenFact || options.targetTests?.[target.id]?.[effects.secondaryTest.whenFact]===true)){targetReceipt.droppedObject=options.targetTests?.[target.id]?.objectId || 'objet tenu';targetReceipt.actions.push({kind:'item-receipt',summary:'Objet tenu lâché : '+targetReceipt.droppedObject+'. À jouer sans réécrire la fiche.'});}
    else if(effects.dropHeldObject)computedSpecialState.assistedReminder='Objet légèrement déplacé ; aucun objet tenu lâché.';
    if(effects.casterHealing)targetReceipt.casterHealing=Number(effects.casterHealing);
    if(localEffects.receiptFormulas){
      const receipt=Object.fromEntries(Object.entries(localEffects.receiptFormulas || {}).map(([key,formula])=>[key,spellFormulaValue(formula,actor,sl)]));
      for(const [key,spec] of Object.entries(effects.receiptOvercast || {}))if(key in receipt)receipt[key]=Math.min(spec.max ?? Infinity,receipt[key]+specificOvercast.entries.filter(e=>e.id===spec.id || spec.ids?.includes(e.id)).reduce((n,e)=>n+e.steps,0)*spellFormulaValue(spec.perFormula,actor,sl));
      if(Object.values(receipt).some(n=>!Number.isFinite(n)))return {ready:false,valid:false,status:'mj-fact-required',error:'Caractéristiques du lanceur requises pour le reçu chiffré.',contract};
      if(effects.facts?.some(f=>f.key==='objectDimension') && domainFacts.objectDimension>receipt.dimensionMax)return {ready:false,valid:false,status:'invalid-target-admissibility',error:'Objet plus grand que 1 + DR final.',contract};
      if(effects.receiptTargetConditional && options.targetTests?.[target.id]?.[effects.receiptTargetConditional.fact]===effects.receiptTargetConditional.when)Object.assign(receipt,effects.receiptTargetConditional.values);
      if(effects.facts?.some(f=>f.key==='objectEncumbrance') && domainFacts.objectEncumbrance>receipt.encombrementMax)return {ready:false,valid:false,status:'invalid-target-admissibility',error:'Encombrement supérieur au maximum payé.',contract};
      targetReceipt.quantifiedReminder=receipt;computedSpecialState.quantifiedReminder=receipt;
      targetReceipt.actions.push({kind:'quantified-reminder',summary:Object.entries(receipt).map(([key,value])=>key+' : '+value).join(' ; ')});
    }
    if(effects.receiptFactValues){targetReceipt.quantifiedReminder={...targetReceipt.quantifiedReminder,...Object.fromEntries(Object.entries(effects.receiptFactValues).map(([key,fact])=>[key,domainFacts[fact]]))};computedSpecialState.quantifiedReminder=targetReceipt.quantifiedReminder;}
    if(effects.restoreCorpse)targetReceipt.actions.push({kind:'restore-corpse',summary:'Cadavre réanimé à'+target.maxHp+' B, profil existant conservé.'});
    if(effects.expiryEffect)targetReceipt.actions.push({kind:'expiry',summary:'Conséquence à la fermeture : occupants restants et dés à renseigner à la fin de Tour réelle.'});
    if(effects.corrosiveBlood === true){
      if(domainFacts.corrosiveMode==='rounds')computedTraits.push('Sang corrosif');
      computedSpecialState.corrosiveBloodMode=domainFacts.corrosiveMode;
      if(domainFacts.corrosiveMode==='rounds')computedSpecialState.damageTrigger={sides:10,commonRoll:true};
      targetReceipt.actions.push({kind:'trait-receipt',summary:domainFacts.corrosiveMode==='rounds'?'Sang corrosif : après Blessures, même d10 de dégâts à tous les engagés (V5 p. 357).':'Parasites éliminés et maladies purgées : reçu de fiche, pendant BE heures.'});
    }
    if(effects.flyRating === true || effects.flyRatingStat){
      const athletics=(actor.skills || []).find(s=>spellSkillMatches(s,'Athlétisme'));
      const value=effects.flyRatingStat?Number(actor.caracs[effects.flyRatingStat]):effectiveSkillScore(actor,athletics?.total ?? athletics?.value ?? actor.caracs.F,'F');
      if(!effects.flyRatingStat)computedTraits.push('Vol ('+value+')');computedSpecialState.flyRange=value;computedSpecialState.flying=typeof domainFacts.flying==='boolean'?domainFacts.flying:effects.specialState?.flying;
    }
    if(effects.rotOrganic)computedSpecialState.assistedReminder='Matière organique du volume d’un poing décomposée ; reçu de fiche.';
    if(effects.rotOrganic && domainFacts.rotMode==='leather'){
      const locations={HEAD:'head',BODY:'body',RIGHTARM:'rightArm',LEFTARM:'leftArm',RIGHTLEG:'rightLeg',LEFTLEG:'leftLeg'},loc=locations[domainFacts.rotLocation];
      targetReceipt.armourDamage={destroyedAp:1,damageByLocation:{[loc]:1}};computedSpecialState.rotReceipt='−1 PA physique à '+loc;
    }
    if (computedSpecialState.controlledByCaster) computedSpecialState.controlledBy = actor.id;
    if (computedSpecialState.detection) computedSpecialState.detection = { ...computedSpecialState.detection, castingSl: sl };
    if (effects.conditionsPerSl) computedConditions.push({ name: effects.conditionsPerSl, level: Math.max(0,sl) });
    const optionalTest=effects.optionalTargetTest,choice=options.targetTests?.[target.id];
    if(optionalTest && choice?.[optionalTest.choiceKey]===true){
      const optionalRoll=choice[optionalTest.rollField];
      if(!Number.isInteger(optionalRoll)||optionalRoll<1||optionalRoll>100)return {ready:false,valid:false,status:'dice-required',error:target.name+' : saisir le d100 du Test de '+optionalTest.label+'.',contract};
      const remaining=(target.states || []).filter(s=>!(effects.removeConditions || []).some(name=>fold(name)===fold(s.name)));
      const penalty=Math.max(0,...['sonne','extenue','empoisonne','brise'].map(key=>remaining.filter(s=>fold(s.key || s.name)===key).reduce((n,s)=>n+Number(s.level || 1),0)));
      const test=selectV5Test(previewV5Test({score:Number(target.caracs?.[optionalTest.stat]),roll:optionalRoll,slModifiers:[{id:'optional-spell-test',amount:(optionalTest.modifierSl || 0)-penalty}]}),'keep');
      targetReceipt.optionalTest=test;
      if(test.success)computedConditions.push(structuredClone(optionalTest.successCondition));
      targetReceipt.actions.push({kind:'optional-test',summary:optionalTest.label+' : '+(test.success?'réussi':'raté')+', '+test.sl+' DR.'});
    }
    if (effects.primarySplash && target.id === effectiveTargets[0]?.id) computedConditions.splice(0,computedConditions.length,...effects.primarySplash.conditions);
    if (effects.hostileConditions && (isTargetDaemon(target) || isTargetUndead(target) || /mutat/.test(traits) || options.targetTests?.[target.id]?.mutated === true)) computedConditions.push(...effects.hostileConditions);
    if (effects.banishUnstable && (isTargetDaemon(target) || isTargetUndead(target)) && Number(target.caracs?.E) < Number(actor.caracs?.FM)) {
      if (/instable|unstable/.test(traits)) { targetReceipt.woundsLost=Number(target.hp)||0; targetReceipt.finalHp=0; targetReceipt.directSetHp=0; } else { targetReceipt.persistentTraits=['Instable']; }
    }
    if (effects.killAtZero && Number(target.hp) === 0) { targetReceipt.kill = true; computedSpecialState.dead=true; computedSpecialState.cannotRaiseUndead=true; }
    const computedGrantedActions = [];
    if(effects.conjureWeapon === true){
      const profile=ARCANE_WEAPON_PROFILES[effects.conjureWeaponKey||domainFacts.weaponKey],id='spell-weapon-'+uid();
      const score=conjuredWeaponSkillScore(actor,profile.id) ?? domainFacts.weaponSkillScore;
      const qualities=[...profile.qualities.map(q=>typeof q==='string'?{id:q}:structuredClone(q)),{id:'magique'}];
      if(profile.id==='garrote')for(const q of qualities)if(q.id==='immobilisante'){q.rating=Number(actor.caracs.F);q.parameter=String(q.rating);}
      computedGrantedActions.push({id,note:profile.name+' aethyrique',type:'attack',attr:'CC',base:score,damage:profile.damage ?? 0,damageFormula:profile.damage===null?'0':'BF'+(profile.damage?'+'+profile.damage:''),qualities,extensions:{v5:{weaponHands:profile.hands,weaponReach:profile.reach,magical:true,materialized:true}}});
      targetReceipt.actions.push({kind:'conjured-weapon',profile:structuredClone(profile),score,summary:profile.name+' aethyrique : '+score+', dégâts '+(profile.damage===null?'aucun':'BF + '+profile.damage)+', '+profile.hands+' main(s), allonge '+profile.reach+'. Lance sans Charge / lance ou épée bâtarde à une main : adapter le profil conformément à p. 301.'});
      // Variantes déclarées de l'arme conjurée (ex. Dague de l'Art : BF + 8 contre Éthéré ou Corruption) : une action de plus, choisie par le MJ selon la cible.
      for(const extra of effects.extraConjuredActions || []){const base=computedGrantedActions[computedGrantedActions.length-1];computedGrantedActions.push({...structuredClone(base),id:id+':'+extra.id,note:extra.note,damage:extra.damage,damageFormula:extra.damageFormula});}
      computedSpecialState.conjuredWeapon=id;
    }
    let computedWard = effects.ward ?? effects.wardVsMissiles;
    // Réduction de dégâts : valeur du contrat, ou Bonus de Force Mentale du lanceur (Capuche Vengeresse : Bonus de Volonté).
    const computedDamageReduction = effects.damageReductionFormula === 'BFM' ? bfm : effects.damageReduction;
    let computedRangedPenalty = effects.rangedOpponentPenaltySl;
    let computedTempFortune = Number(effects.fortunePoints) > 0 ? Number(effects.fortunePoints) : 0;
    let computedTempFate = Number(effects.grantFate ?? effects.fatePoints) > 0 ? Number(effects.grantFate ?? effects.fatePoints) : 0;
    let computedRemoveBrokenCount = 0;
    let computedWeaponBonus = effects.weaponDamageBonus ? { damage: effects.weaponDamageBonus, magical: true, ...(effects.weaponRanged ? { ranged: true } : {}), ...(effects.weaponHitConditions ? { hitConditions: [...effects.weaponHitConditions], spellName: contract.name } : {}), ...(effects.weaponFumbleCondition ? { fumbleCondition: { ...effects.weaponFumbleCondition }, spellName: contract.name } : {}) } : undefined;
    if (effects.weaponBonus) computedWeaponBonus = { ...effects.weaponBonus, ...(effects.weaponBonus.damageFormula === 'BFM' ? { damage: bfm } : {}), equipmentId: effects.weaponBonus.unarmedOnly ? undefined : (options.targetTests?.[target.id]?.objectId ?? domainFacts.objectId), spellName: contract.name };
    let computedMagicShieldBonusSl = effects.dispelBonusSlFormula ? spellFormulaValue(effects.dispelBonusSlFormula,actor,sl) : Number(effects.dispelBonusSl) > 0 ? Number(effects.dispelBonusSl) : undefined;
    const computedDamageCapToSlOnly = Boolean(effects.damageCapToSlOnly);

    if (effects.fireImmunityInAoE) {
      computedTraits.push('Immunité au Feu (Zone d’effet)');
      computedSpecialState.fireImmunityInAoE = true;
    }

    // Traitement explicite des paramètres spéciaux (specialTag)
    if (specialTag === 'fickle-fingers' || effects.fumbleNextDexTest) {
      computedTestModifiers.Dextérité = Math.min(Number(computedTestModifiers.Dextérité) || 0, -2);
      computedSpecialState.fickleFingers = true;
      computedSpecialState.fumbleNextDexTest = true;
    } else if (specialTag === 'first-portent' || effects.rerollsPerRound) {
      const extraFirstFortune = Math.floor(((Number(overcastChoices.special) || 0) + (Number(overcastChoices.targets) || 0)) / 2);
      computedTempFortune = Math.max(computedTempFortune, 1 + extraFirstFortune);
      computedTraits.push(`Premier Signe d’Amul (+${computedTempFortune} Point(s) de Chance temporaire(s))`);
      computedSpecialState.firstPortent = true;
      computedSpecialState.tempFortuneGranted = computedTempFortune;
    } else if (specialTag === 'second-portent') {
      const extraSecondFortune = Math.floor((Number(overcastChoices.special) || 0) / 2);
      computedTempFortune = Math.max(computedTempFortune, 3 + extraSecondFortune);
      computedSpecialState.secondPortent = true;
      computedSpecialState.tempFortuneGranted = computedTempFortune;
    } else if (specialTag === 'third-portent') {
      computedTempFate = Math.max(computedTempFate, 1);
      computedSpecialState.thirdPortent = true;
      computedSpecialState.casterLosesFateIfUsed = Boolean(effects.casterLosesFateIfUsed);
    } else if (specialTag === 'starcrossed' || effects.forceRerollSuccesses) {
      computedTraits.push('Mauvaise Étoile (Relance des réussites, Chance interdite)');
      computedSpecialState.starcrossed = true;
      computedSpecialState.forceRerollSuccesses = true;
      computedSpecialState.cannotUseFortune = true;
    } else if (specialTag === 'arcane-unforgiving' || contract.name === 'Destruction des Arcanes') {
      const arcane = previewArcaneUnforgiving(actor, target, arcaneOptions, options.arcaneTargets?.[target.id]);
      if (!arcane.ready) return { ...arcane, contract, castingPreview };
      targetReceipt.arcaneUnforgiving = arcane;
      targetReceipt.damage = { ...arcane, apIgnored: true, woundsLost: arcane.finalDamage };
      targetReceipt.woundsLost += arcane.finalDamage;
      targetReceipt.finalHp = Math.max(0, (Number(target.hp) || 0) - targetReceipt.woundsLost);
      targetReceipt.actions.push({ kind: 'arcane-unforgiving', ...arcane,
        summary: `Destruction des Arcanes : ${arcane.finalDamage} B au Corps (${arcane.rawDamage} Dégâts − BE ${arcane.targetBe}), ${arcane.destroyedAp} PA détruit(s)${arcane.destroyedMagicItem ? ', objet détruit : ' + arcane.destroyedMagicItem.name : ''}.` });
      if (arcane.focalisationTest) targetReceipt.actions.push({ kind: 'arcane-focalisation',
        summary: `Focalisation : jet ${arcane.focalisationTest.roll}, ${arcane.focalisationTest.success ? 'réussite' : 'échec'}` });
      if (arcane.dexterityTest) targetReceipt.actions.push({ kind: 'arcane-dexterity',
        summary: `Dextérité (+2 DR) : jet ${arcane.dexterityTest.roll}, ${arcane.dexterityTest.success ? 'réussite' : 'échec'}` });
      if (arcane.requiresInventoryConfirmation) arcaneUnforgivingInventoryFollowUp.push({
        targetId: target.id, targetName: target.name, armorDamageLocations: arcane.armorDamageLocations,
        destroyedMagicItem: arcane.destroyedMagicItem, requiresConfirmation: true,
        summary: `À reporter dans l’inventaire de ${target.name || target.id} : ${arcane.destroyedAp} PA détruit(s)${arcane.destroyedMagicItem ? ', objet : ' + arcane.destroyedMagicItem.name : ''}.`
      });
    } else if (specialTag === 'arrow-attraction' || effects.rangedBonusToHit) {
      computedTestModifiers['Défense contre Tir'] = -2;
      computedTraits.push('Attraction des Flèches (+2 DR aux tireurs adverses)');
      computedSpecialState.arrowAttraction = true;
      computedSpecialState.incomingRangedBonusSl = Number(effects.missileHitBonusSl) || 2;
    } else if (specialTag === 'deadlock' || effects.lockItemOrSpell) {
      computedTestModifiers['Langue (Magick)'] = -2;
      computedSpecialState.deadlock = true;
      computedSpecialState.lockedTarget = resolvedMjChoice || options.mjParams?.targetItem || 'Objet ou sort verrouillé';
    } else if (specialTag === 'glamour-of-teclis' || effects.aoiIllusion) {
      computedTestModifiers['Perception adverse'] = -2;
      computedTestModifiers['Intuition adverse'] = -2;
      computedTraits.push('Illusion de Teclis (Zone d’illusion majeure)');
      computedSpecialState.glamourOfTeclis = true;
    } else if (specialTag === 'amber-trance' || effects.communeNature) {
      computedTraits.push('Transe d’Ambre (Insensible aux dégâts jusqu’au premier coup reçu)');
      computedSpecialState.amberTrance = true;
      computedSpecialState.trance = true;
    } else if (specialTag === 'beast-master' || effects.controlAnimal) {
      computedTestModifiers.Dressage = 4;
      computedTestModifiers['Charme Animal'] = 4;
      computedRemoveConditions.push('Frénésie', 'frenzy', 'Peur', 'fear');
      computedSpecialState.beastMaster = true;
      computedSpecialState.controlledBy = actor.id;
    } else if (specialTag === 'beast-tongue' || specialTag === 'animal-speech' || effects.speakWithAnimals) {
      computedTestModifiers['Charme Animal'] = 2;
      computedTestModifiers.Dressage = 2;
      computedTraits.push('Communication animale');
      computedSpecialState.speakWithAnimals = true;
    } else if (specialTag === 'ox-stands' || contract.name === 'Le Bœuf Reste Debout') {
      const effectiveCastSl = Math.max(0, Number(castingPreview?.totalCastingSl ?? sl) || 0);
      computedRemoveBrokenCount = Math.max(1, effectiveCastSl + 1);
      if (!computedTraits.includes('Immunité à la Peur et à la Terreur')) {
        computedTraits.push('Immunité à la Peur et à la Terreur');
      }
      computedSpecialState.oxStands = true;
      computedSpecialState.fearTerrorImmunity = true;
      computedSpecialState.removedBrokenMax = computedRemoveBrokenCount;
      targetReceipt.oxStands = {
        removedBrokenMax: computedRemoveBrokenCount,
        fearTerrorImmunity: true
      };
      targetReceipt.actions.push({
        kind: 'ox-stands',
        removedBrokenMax: computedRemoveBrokenCount,
        fearTerrorImmunity: true,
        summary: `Le Bœuf Reste Debout : retire jusqu’à ${computedRemoveBrokenCount} état(s) Brisé (DR + 1) sur ${target.name || target.id} et confère l’immunité aux nouveaux tests de Peur et de Terreur.`
      });
    } else if (specialTag === 'spiral-staircase' || effects.createStairs) {
      computedTraits.push('Escalier en Spirale (Accès vertical magique)');
      computedSpecialState.spiralStaircase = true;
    } else if (specialTag === 'phas-protection') {
      computedRangedPenalty = Math.min(Number(computedRangedPenalty) || 0, -2);
      computedTraits.push('Protection de Pha (Test de FM requis pour tirer)');
      computedSpecialState.phasProtection = true;
    } else if (specialTag === 'clarity-of-thought' || effects.removeBrokenPerSl) {
      computedTraits.push('Clarté d’Esprit (Pénalités mentales, d’Exténué et de Critique à la Tête ignorées)');
      computedSpecialState.clarityOfThought = true;
      computedSpecialState.ignoreMentalAndFatiguePenalties = true;
      computedSpecialState.ignoreMentalPenalties = true;
      computedSpecialState.ignoreFatiguePenalties = true;
      computedSpecialState.ignoreHeadCriticalPenalties = true;
    } else if (specialTag === 'vegetal-enchantment' || effects.plantGrowth) {
      computedTraits.push('Enchantement Végétal (Croissance accélérée)');
      computedSpecialState.vegetalEnchantment = true;
    } else if (specialTag === 'magical-alarm' || effects.alarmZone) {
      computedTestModifiers.Perception = 4;
      computedTestModifiers.Intuition = 2;
      computedTraits.push('Alarme Magique active');
      computedSpecialState.magicalAlarm = true;
    } else if (specialTag === 'mind-mask' || effects.hideEmotionsAndLies) {
      computedTestModifiers.Calme = 2;
      computedTestModifiers.Charme = 2;
      computedTestModifiers['Intuition adverse'] = Number(effects.intuitionPenaltySl) || -2;
      computedTraits.push('Masque Mental (Émotions et mensonges masqués)');
      computedSpecialState.mindMask = true;
    } else if (specialTag === 'body-purification' || effects.purgeIngestedPoison) {
      const endScore = Number(actor.caracs?.E) || 35;
      const enduranceRoll = options.enduranceRoll ?? options.secondaryTestRoll ?? options.mjParams?.enduranceRoll;
      if (enduranceRoll === undefined || enduranceRoll === null || enduranceRoll === '') {
        targetReceipt.enduranceTest = {
          skill: 'Endurance',
          stat: 'E',
          score: endScore,
          modifierSl: 0,
          roll: null,
          passed: false,
          pending: true
        };
        missingSecondaryTest = {
          spellName: contract.name,
          actor: 'caster',
          skill: 'Endurance',
          stat: 'E',
          modifierSl: 0,
          score: endScore,
          field: 'enduranceRoll',
          reason: `Test secondaire obligatoire manquant pour ${contract.name} : saisir le jet d’Endurance (+0 DR) du lanceur.`
        };
        targetResults.push(targetReceipt);
        continue;
      }
      const endPassed = Number(enduranceRoll) <= endScore;
      targetReceipt.enduranceTest = {
        skill: 'Endurance',
        stat: 'E',
        score: endScore,
        modifierSl: 0,
        roll: Number(enduranceRoll),
        passed: endPassed
      };
      if (!computedConditions.includes('Sonné')) computedConditions.push('Sonné');
      if (endPassed) {
        computedRemoveConditions.push('Empoisonné', 'empoisonne', 'poisoned');
      }
      computedSpecialState.bodyPurification = true;
      computedSpecialState.poisonPurged = endPassed;
    } else if (specialTag === 'comfort-zone' || effects.weatherProtection) {
      computedTestModifiers['Résistance (Intempéries)'] = 2;
      computedTraits.push('Zone de Confort (Immunisé aux intempéries)');
      computedSpecialState.comfortZone = true;
    } else if (specialTag === 'reveal-magic' || effects.grantSecondSight) {
      if (!computedTalents.includes('Seconde vue')) computedTalents.push('Seconde vue');
      computedTestModifiers['Seconde vue'] = 2;
      computedSpecialState.revealMagic = true;
    } else if (specialTag === 'sanctify' || effects.consecrateGround) {
      computedTestModifiers.Calme = 1;
      computedTestModifiers.Résistance = 1;
      computedTraits.push('Sol Sanctifié (Répulsion des Morts-vivants)');
      computedSpecialState.sanctifiedGround = true;
    } else if (specialTag === 'swift-passing' || effects.peacefulDeath) {
      computedTraits.push('Trépas Rapide (Repos paisible de l’âme)');
      computedSpecialState.swiftPassing = true;
    } else if (specialTag === 'arrow-shield' || effects.wardVsMissiles) {
      // V5 p. 243 : destruction automatique des projectiles organiques qui entrent dans la zone (aucun jet), pas de malus aux tirs.
      computedWard = computedWard ?? 1;
      computedTraits.push('Bouclier de Flèches (projectiles organiques entrant dans la zone détruits)');
      computedSpecialState.arrowShield = true;
    } else if (specialTag === 'drop-item' || effects.disarmTarget) {
      computedTraits.push('Désarmé (Objet tenu lâché)');
      computedSpecialState.disarmed = true;
      computedSpecialState.droppedItem = options.mjParams?.item || 'Arme/Objet tenu';
    } else if (specialTag === 'magic-shield') {
      const dispelBonus = Math.max(1, bfm);
      computedTestModifiers['Dissipation'] = Math.max(
        Number(computedTestModifiers['Dissipation']) || 0,
        dispelBonus
      );
      computedTestModifiers['Dissipation (Langue Magick)'] = Math.max(
        Number(computedTestModifiers['Dissipation (Langue Magick)']) || 0,
        dispelBonus
      );
      computedTestModifiers['Langue (Magick) (Dissipation)'] = Math.max(
        Number(computedTestModifiers['Langue (Magick) (Dissipation)']) || 0,
        dispelBonus
      );
      computedMagicShieldBonusSl = Math.max(Number(computedMagicShieldBonusSl) || 0, dispelBonus);
      computedTraits.push(`Bouclier magique (+${dispelBonus} DR en Dissipation)`);
      computedSpecialState.magicShield = true;
      computedSpecialState.dispelBonusSl = dispelBonus;
    } else if (specialTag === 'rot-armour') {
      computedSpecialState.rotArmour = true;
      computedSpecialState.destroyedAp = Number(effects.destroyArmourAp) || 2;
    } else if (specialTag === 'doppelganger' || effects.copyAppearance) {
      computedTestModifiers.Déguisement = 4;
      computedTestModifiers.Comédie = 4;
      computedTraits.push('Doppelgänger (Apparence dupliquée)');
      computedSpecialState.doppelganger = true;
    } else if (specialTag === 'horn-of-andar' || effects.soundHornAndFear) {
      computedTraits.push('Peur (1)', 'Appel du Cor d’Andar');
      computedRemoveConditions.push('Peur', 'fear', 'Brisé', 'broken');
      computedSpecialState.hornOfAndar = true;
    } else if (specialTag === 'illusion' || effects.visualAndAuditoryIllusion) {
      computedTestModifiers['Perception adverse'] = -1;
      computedTestModifiers['Intuition adverse'] = -1;
      computedTraits.push('Illusion visuelle et sonore');
      computedSpecialState.illusion = true;
    } else if (specialTag === 'mindslip' || effects.eraseShortTermMemory) {
      if (!computedConditions.includes('Surpris')) computedConditions.push('Surpris');
      computedTraits.push('Éclipse Mentale (Mémoire courte effacée, engagement rompu)');
      computedSpecialState.mindslip = true;
      computedSpecialState.dropEngagement = true;
    } else if (specialTag === 'shadowsteed' || specialTag === 'summon-mount' || effects.summonMount) {
      computedStatModifiers.M = Math.max(Number(computedStatModifiers.M) || 0, 4);
      computedTraits.push(`Monture magique (${contract.name}, M ${effects.mountMovement || 8})`);
      computedSpecialState.shadowsteed = true;
      computedSpecialState.mountMovement = Number(effects.mountMovement) || 8;
    } else if (specialTag === 'invisibility' || effects.invisible) {
      computedTraits.push('Invisible');
      computedTestModifiers.Discrétion = 4;
      computedRangedPenalty = Math.min(Number(computedRangedPenalty) || 0, -4);
      computedSpecialState.invisible = true;
    } else if (specialTag === 'fools-gold' || specialTag === 'forge-of-chamon' || specialTag === 'mutable-metal') {
      computedSpecialState[specialTag] = true;
      if (effects.mjInput) Object.assign(computedSpecialState, effects.mjInput);
    }

    // Traitement concret du choix MJ sélectionné (Goût de Feu, Colérique, Flamme Inextinguible, Divination, Métal restauré, Silence)
    if (resolvedMjChoice) {
      const choiceFold = fold(resolvedMjChoice);
      if (specialTag === 'taste-of-fire-liquid') {
        computedSpecialState.tasteOfFireLiquid = resolvedMjChoice;
        if (choiceFold.includes('plat epice') || choiceFold.includes('endurance')) {
          computedTestModifiers['Résistance (Froid)'] = 4;
          computedTestModifiers.Endurance = 4;
          computedSpecialState.createdItem = 'Plat épicé (Endurance +4 DR)';
        } else if (choiceFold.includes('alcool')) {
          computedSpecialState.liquidCreated = 'Alcool fort (1 L)';
          computedSpecialState.createdItem = 'Alcool fort (1 L)';
        } else if (choiceFold.includes('huile')) {
          computedSpecialState.liquidCreated = 'Huile inflammable (0,5 L)';
          computedSpecialState.createdItem = 'Huile inflammable (0,5 L)';
          computedSpecialState.flammableOil = true;
        }
      } else if (specialTag === 'choleric') {
        computedSpecialState.cholericMode = resolvedMjChoice;
        if (choiceFold === 'combat') {
          if (!computedTraits.includes('Frénésie')) computedTraits.push('Frénésie');
        } else {
          computedTestModifiers.Calme = -2;
          computedTestModifiers.Sociabilité = -2;
        }
      } else if (specialTag === 'inextinguishable-flame') {
        computedSpecialState.inextinguishableFlameMode = resolvedMjChoice;
        if (choiceFold.includes('arme')) {
          computedWeaponBonus = { damage: 2, flaming: true, magical: true };
        } else {
          computedTraits.push('Torche magique permanente');
        }
      } else if (specialTag === 'divination') {
        computedSpecialState.divinationMode = resolvedMjChoice;
        if (choiceFold.includes('fortune') || choiceFold.includes('fate')) {
          computedTempFortune = Math.max(computedTempFortune, 1);
        }
      } else if (specialTag === 'restored-metal') {
        computedSpecialState.restoredMetalMode = resolvedMjChoice;
        if (choiceFold.includes('repair')) {
          for (const loc of ['head', 'body', 'arms', 'legs']) {
            computedApModifiers[loc] = (Number(computedApModifiers[loc]) || 0) + 1;
          }
        }
      } else if (specialTag === 'silence-ulgu') {
        computedSpecialState.silenceMode = resolvedMjChoice;
        computedSpecialState.silenced = true;
        if (!computedConditions.includes('Assourdi')) computedConditions.push('Assourdi');
        computedTestModifiers['Langue (Magick)'] = -10;
      }
    }

    // Traitement spécifique de Calme (calm) : Test obligatoire de Sociabilité (+0 DR) + retrait de Frénésie et états psychologiques sans toucher aux traits innés
    if (specialTag === 'calm' || effects.removeFrenzy || Array.isArray(effects.removePsychology)) {
      const foundSocSkill = (Array.isArray(actor.skills) ? actor.skills : []).find(s => fold(s.name || s.nom) === 'sociabilite');
      const socScore = Number(foundSocSkill?.total ?? foundSocSkill?.score ?? actor.caracs?.Soc) || 40;
      const fellowshipRoll = options.fellowshipRoll ?? options.secondaryTestRoll ?? options.mjParams?.fellowshipRoll;
      if (fellowshipRoll === undefined || fellowshipRoll === null || fellowshipRoll === '') {
        targetReceipt.calmTest = {
          skill: 'Sociabilité',
          stat: 'Soc',
          score: socScore,
          modifierSl: 0,
          roll: null,
          passed: false,
          pending: true
        };
        missingSecondaryTest = {
          spellName: contract.name,
          actor: 'caster',
          skill: 'Sociabilité',
          stat: 'Soc',
          modifierSl: 0,
          score: socScore,
          field: 'fellowshipRoll',
          reason: `Test secondaire obligatoire manquant pour ${contract.name} : saisir le jet de Sociabilité (+0 DR) du lanceur.`
        };
        targetResults.push(targetReceipt);
        continue;
      }
      const calmRollNum = Number(fellowshipRoll);
      const calmTestPrev = previewV5Test({ score: socScore, roll: calmRollNum, kind: 'test', slModifiers: [] });
      const calmSelected = selectV5Test(calmTestPrev, calmTestPrev.options?.[0]?.id || 'keep');
      const calmPassed = Boolean(calmSelected.success);
      targetReceipt.calmTest = {
        skill: 'Sociabilité',
        stat: 'Soc',
        score: socScore,
        modifierSl: 0,
        roll: calmRollNum,
        sl: calmSelected.sl,
        passed: calmPassed
      };
      if (calmPassed) {
        computedRemoveConditions.push(
          'Frénésie', 'frenetique', 'frenzy',
          'Peur', 'fear',
          'Animosité', 'animosity',
          'Préjugé', 'prejuge', 'prejudice'
        );
        computedSpecialState.calmed = true;
        computedSpecialState.removedPsychology = ['Peur', 'Animosité', 'Préjugé', 'Frénésie'];
        targetReceipt.actions.push({
          kind: 'calm',
          fellowshipPassed: true,
          summary: `Calme (HEPG p. 80) : Préjugé, Animosité, Peur, Frénésie apaisés sur ${target.name || target.id} (traits innés préservés).`
        });
      } else {
        targetReceipt.actions.push({
          kind: 'calm',
          fellowshipPassed: false,
          summary: `Calme : Test de Sociabilité échoué (${calmRollNum} > ${socScore}), les états persistent.`
        });
      }
    }

    // Traitement spécifique de Drain de Magie (drain-magic) : vider la réserve de focalisation et dissiper les effets actifs
    if (specialTag === 'drain-magic' || effects.dispelAoE || effects.emptyReserves) {
      const targetReserve = getChannellingReserve(target);
      const drainedReserveSl = Number(targetReserve.sl) || 0;
      const activeTargetEffects = Array.isArray(target.extensions?.v5?.spellEffects) ? target.extensions.v5.spellEffects : [];
      const dispellableEffectIds = activeTargetEffects.filter(e => !e.unstoppableForce).map(e => e.id);
      targetReceipt.drainMagic = {
        emptyReserves: Boolean(effects.emptyReserves || specialTag === 'drain-magic'),
        dispelAoE: Boolean(effects.dispelAoE || specialTag === 'drain-magic'),
        drainedReserveSl,
        drainedReserveType: targetReserve.type,
        dispelledEffectIds: dispellableEffectIds,
        dispelledCount: dispellableEffectIds.length
      };
      targetReceipt.actions.push({
        kind: 'drain-magic',
        drainedReserveSl,
        dispelledCount: dispellableEffectIds.length,
        summary: `Drain de Magie : réserve vidée (${drainedReserveSl} DR) et ${dispellableEffectIds.length} effet(s) magique(s) actif(s) dissipé(s) sur ${target.name || target.id}.`
      });
    }

    // Traitement spécifique de Bannissement Mineur (minor-banishment)
    if (specialTag === 'minor-banishment' || effects.banishMinorDaemon) {
      const banishDmg = bfm + Math.max(1, Number(sl) || 1);
      const isDaemonOrUndead = isTargetDaemon(target) || isTargetUndead(target) || hasTargetNatureOrTrait(target, 'instable');
      targetReceipt.minorBanishment = {
        applicable: isDaemonOrUndead,
        damage: isDaemonOrUndead ? banishDmg : 0
      };
      if (isDaemonOrUndead) {
        targetReceipt.woundsLost += Math.min(Number(target.hp) || 0, banishDmg);
        targetReceipt.finalHp = Math.max(0, (Number(target.hp) || 0) - banishDmg);
      }
      computedSpecialState.minorBanishment = true;
      targetReceipt.actions.push({
        kind: 'minor-banishment',
        damage: isDaemonOrUndead ? banishDmg : 0,
        summary: isDaemonOrUndead
          ? `Bannissement Mineur : ${banishDmg} Blessures directes infligées à l'entité instable ${target.name || target.id}.`
          : `Bannissement Mineur : impulsion de bannissement (${banishDmg}) appliquée sur ${target.name || target.id}.`
      });
    }

    // A-02 : la Faux de Shyish est une couche d'effet (drapeau lu au combat, hallebarde conférée) : tout expire avec elle.
    if (specialTag === 'scythe-of-shyish') {
      computedSpecialState.scytheOfShyish = true;
      computedGrantedActions.push({ id: 'halberd', note: 'Hallebarde Magique (Faux de Shyish)', type: 'attack', attr: 'CC', damageFormula: `BF+${bfm + 4}`,
        reach: 'Longue', qualities: [{ id: 'magique' }, { id: 'defensive' }, { id: 'taille' }, { id: 'empaleuse' }], extensions: { v5: { kind: 'melee', weaponReach: 'Longue' } } });
    }

    const hasStatMods = Object.keys(computedStatModifiers).length > 0;
    const hasTestMods = Object.keys(computedTestModifiers).length > 0;
    const hasApMods = Object.keys(computedApModifiers).length > 0;
    const hasTraits = computedTraits.length > 0;
    const hasTalents = computedTalents.length > 0;
    const hasConditions = computedConditions.length > 0;
    const hasRemoveConditions = computedRemoveConditions.length > 0;
    const hasSpecialState = Object.keys(computedSpecialState).length > 0;
    const hasTempEffects = effects.roundEffect || effects.triggered ||
      hasStatMods ||
      hasTestMods ||
      hasApMods ||
      computedWard !== undefined ||
      effects.conditionalAp !== undefined ||
      effects.reflect !== undefined ||
      effects.immunities !== undefined ||
      effects.apFloor !== undefined ||
      hasTraits ||
      hasTalents ||
      hasConditions ||
      hasRemoveConditions ||
      Boolean(effects.removeConditionLevels) ||
      hasSpecialState ||
      computedTempFortune > 0 ||
      computedTempFate > 0 ||
      computedRemoveBrokenCount > 0 ||
      computedDamageReduction !== undefined ||
      computedRangedPenalty !== undefined ||
      computedWeaponBonus !== undefined ||
      computedMagicShieldBonusSl !== undefined ||
      computedDamageCapToSlOnly;

    if ((movementUnknown || Number(computedStatModifiers.M)) && knownMovement(target) === null) return movementRequired(target, contract);

    if (hasTempEffects) {
      const effectDef = {
        id: `spell-effect-${contract.id}-${uid()}-${target.id}`,
        spellId: contract.id,
        spellName: contract.name,
        casterId: actor.id,
        domain: contract.domain,
        cn: contract.cn,
        castExecutionId: operationId,
        duration: apotheoseRaise ? `${bfm} minutes` : effectDuration(target),
        ...(apotheoseRaise ? { dieOnExpiry: true } : {}),
        statModifiers: hasStatMods ? computedStatModifiers : undefined,
        testModifiers: hasTestMods ? computedTestModifiers : undefined,
        apModifiers: hasApMods ? computedApModifiers : undefined,
        ward: computedWard,
        wardFilter: computedWard !== undefined ? effects.wardFilter : undefined,
        conditionalAp: effects.conditionalAp,
        reflect: effects.reflect,
        immunities: effects.immunities,
        apFloor: effects.apFloor,
        traits: hasTraits ? computedTraits : undefined,
        talents: hasTalents ? computedTalents : undefined,
        conditions: hasConditions ? computedConditions : undefined,
        removeConditions: hasRemoveConditions ? computedRemoveConditions : undefined,
        removeConditionLevels: effects.removeConditionLevels,
        removeBrokenCount: computedRemoveBrokenCount > 0 ? computedRemoveBrokenCount : undefined,
        tempFortunePoints: computedTempFortune > 0 ? computedTempFortune : undefined,
        tempFatePoints: computedTempFate > 0 ? computedTempFate : undefined,
        damageReduction: computedDamageReduction,
        damageReductionFilter: computedDamageReduction !== undefined ? effects.damageReductionFilter : undefined,
        damageReductionCalmTest: effects.damageReductionCalmTest || undefined,
        rangedOpponentPenaltySl: computedRangedPenalty,
        weaponBonus: computedWeaponBonus,
        recurringHits: effects.engagedEnemyDamage?.recurring ? { formula: effects.engagedEnemyDamage.formula, hits: Math.max(1, Number(effects.engagedEnemyDamage.hits) || 1), targetIds: [...new Set(options.secondaryTargets?.engaged || [])] } : undefined,
        magicShieldBonusSl: computedMagicShieldBonusSl,
        damageCapToSlOnly: computedDamageCapToSlOnly || undefined,
        specialState: hasSpecialState ? computedSpecialState : undefined,
        grantedActions: computedGrantedActions.length ? computedGrantedActions : undefined,
        suppressedEffectIds:targetReceipt.suppressedEffectIds,
        loreTestBonus: effects.loreTestBonus,
        lockConditions: effects.sleep?computedSpecialState.sleeping:effects.lockConditions,
        expireConditions: effects.expireConditions,
        conditionsOnExpiry: effects.conditionsOnExpiry,
        expiryEffect: effects.expiryEffect,
        corpseOnExpiry: effects.restoreCorpse ? true : undefined,
        roundEffect: effects.roundEffect ? { ...effects.roundEffect, castingSl: sl, damageBonus: overcastDamageBonus,...(optionSuffocation?{suffocation:true}:{}) } : breathVariant?.smoke?{phase:'endOfRound',suffocation:true}:undefined,
        triggered: effects.triggered ? {...effects.triggered,castingSl:sl} : undefined,
        domainFacts,
        assistedClauses: contract.assistedClauses,
        unstoppableForce: effectiveCriticalChoice === 'unstoppable-force'
      };

      const appliedSim = applySpellEffects(target, effectDef, {
        round: options.round || 1,
        caster: actor,
        overcastDurationMultiplier
      });

      targetReceipt.temporaryEffect = effectDef;
      targetReceipt.appliedSim = appliedSim;

      if (computedTempFortune > 0) {
        targetReceipt.tempFortuneGranted = computedTempFortune;
        targetReceipt.actions.push({
          kind: 'temporary-fortune',
          fortunePoints: computedTempFortune,
          summary: `${contract.name} : +${computedTempFortune} Point(s) de Chance (Fortune) temporaire(s) accordé(s) à ${target.name || target.id}.`
        });
      }
      if (computedTempFate > 0) {
        targetReceipt.tempFateGranted = computedTempFate;
        targetReceipt.actions.push({
          kind: 'temporary-fate',
          fatePoints: computedTempFate,
          summary: `${contract.name} : +${computedTempFate} Point(s) de Destin (Fate) temporaire(s) accordé(s) à ${target.name || target.id}.`
        });
      }

      if (hasTestMods) {
        targetReceipt.testModifiers = appliedSim.effectiveTestModifiers;
        targetReceipt.actions.push({
          kind: 'test-modifiers',
          testModifiers: appliedSim.effectiveTestModifiers,
          summary: `Bonus/Malus de Tests : ${Object.entries(computedTestModifiers).map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v} DR`).join(', ')}`
        });
      }

      targetReceipt.actions.push({
        kind: 'effects',
        summary: `Effets appliqués sur ${target.name || target.id}`
      });
    }

    // D2. Saisie MJ assistée ou rappel narratif explicite
    if (effects.type === 'mj-input' || effects.mjInput) {
      const rawMj = effects.mjInput || { special: effects.special };
      targetReceipt.mjInput = {
        ...rawMj,
        selectedOption: resolvedMjChoice,
        mjParams: options.mjParams || null
      };
      targetReceipt.actions.push({
        kind: 'mj-input',
        mjInput: targetReceipt.mjInput,
        summary: `Arbitrage MJ assisté : ${contract.name}${targetReceipt.mjInput.selectedOption ? ` (${targetReceipt.mjInput.selectedOption})` : ''}`
      });
    } else if (effects.type === 'narrative' || contract.treatment === 'narrative' || ['fare-of-the-land', 'lie-of-the-land', 'dying-words'].includes(specialTag)) {
      targetReceipt.actions.push({
        kind: 'narrative',
        summary: `Rappel narratif : ${contract.name}`
      });
    }

    // E. Attribut de Domaine V5 (par cible, sauf si explicitement désactivé par options.attributeActive === false)
    if (allLore) {
      const singleTargetLore = allLore;
      const eff = singleTargetLore?.targetEffects?.get(target.id);
      if (eff) {
        targetReceipt.actions.push({
          kind: 'lore-attribute',
          domain: contract.domain,
          summary: eff.summary || `Attribut de Domaine (${contract.domain})`
        });
        attributeReceipts.push({
          targetId: target.id,
          lore: contract.domain,
          effect: eff.summary || 'Attribut appliqué',
          targetEffect: eff
        });
      }
    }

    // F. Arbitrages et sorts particuliers
    if (isBeastForm || isKadon) {
      let profile;
      let kadonRounds = null;
      const invalid = (status, error) => ({ ready: false, valid: false, status, error, contract });
      if (isKadon) {
        // Monstre du livre (pp. 328-335) choisi par le MJ, ou profil saisi : jamais de valeur inventée.
        const monsterKey = options.monsterKey ?? options.mjParams?.monsterKey;
        const raw = monsterKey ? KADON_PROFILES[monsterKey] : (options.monsterProfile ?? options.mjParams?.monsterProfile);
        if (monsterKey && !raw) return invalid('mj-choice-required', `Transformation de Kadon : monstre inconnu (${monsterKey}).`);
        const entered = value => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value)) && Number(value) >= 0;
        const declaredSize=raw?.size || (raw?.traits || []).map(traitSize).find(Boolean);
        const complete = raw && ['large','enormous'].includes(declaredSize) && (monsterKey ? true : Number(raw.hp) > 0 && entered(raw.hp) && entered(raw.M) && KADON_REPLACED_CARACS.every(key => entered(raw.caracs?.[key])));
        if (!complete) return { ready: false, valid: false, status: 'mj-choice-required', missing: ['monsterProfile'], error: `Transformation de Kadon : choisir un monstre du livre ou saisir le profil Grande/Énorme de ${resolvedMjChoice || 'la créature'} (M, B, ${KADON_REPLACED_CARACS.join(', ')} : nombres positifs ou nuls).`, contract };
        profile = monsterKey ? raw : { ...structuredClone(raw), name: raw.name || resolvedMjChoice || 'Monstre saisi',size:declaredSize, M: Number(raw.M), hp: Number(raw.hp), caracs: Object.fromEntries(KADON_REPLACED_CARACS.map(key => [key, Number(raw.caracs[key])])), traits: Array.isArray(raw.traits) ? raw.traits : [] };
        const parsedDuration = parseSpellDuration(contract.duration, { caster: actor });
        kadonRounds = parsedDuration.kind === 'timed' && parsedDuration.unit === 'rounds' ? parsedDuration.amount : null;
        if (kadonRounds === null) return { ready: false, valid: false, status: 'mj-duration-required', missing: ['mjDuration'], error: 'Transformation de Kadon : durée (Bonus de Force Mentale Rounds) illisible, Force Mentale du lanceur requise.', contract };
        const another = target.id !== actor.id;
        if (another && !kadonOtherTarget) return invalid('invalid-target-admissibility', 'Transformation de Kadon : transformer une autre créature exige l’option de surpuissance +4 DR (sort de Contact).');
        if (!another && kadonOtherTarget) return invalid('invalid-target-admissibility', 'Transformation de Kadon : l’option « autre cible » (+4 DR) désigne une créature autre que le lanceur.');
      } else {
        profile = options.beastProfile || BEAST_PROFILES[options.beastKey];
      }
      if (!profile) return { ready: false, valid: false, status: 'mj-choice-required', missing: ['beastKey'], error: 'Forme bestiale : choisir l’animal (Bêtes du Reikland).', contract };
      const traitsError = transformationTraitsError(profile, Array.isArray(beastTraits) ? beastTraits : null, isKadon ? 'kadon' : 'beast');
      if (traitsError) return invalid('invalid-transformation-options', `${contract.name} : ${traitsError}`);
      const isJade = !isKadon && (contract.isJadeVariant || contract.domain === 'life' || contract.name.includes('Jade'));
      let beastPrev;
      try {
        beastPrev = previewBeastForm(target, profile, {
          isJade,
          kind: isKadon ? 'kadon' : 'beast',
          optionalTraits: beastTraits,
          spellId: contract.id,
          durationMinutes: options.durationMinutes,
          ...(isKadon ? { durationRounds: kadonRounds } : {})
        });
      } catch (error) {
        return invalid('invalid-transformation-options', `${contract.name} : ${error.message}`);
      }
      if (isKadon) beastPrev.durationRounds = kadonRounds;
      targetReceipt.beastForm = beastPrev;
      targetReceipt.actions.push({ kind: 'transformation', summary: beastPrev.summary });
    } else if (effects.special === 'verdant-apotheosis' || contract.name === 'Apothéose Verdoyante') {
      const deathDelay = options.targetTests?.[target.id]?.deathDelaySec ?? options.deathDelaySec;
      const apothPrev = previewVerdantApotheosis({
        caster: actor,
        corpses: [{ ...target, decapitated: options.targetTests?.[target.id]?.decapitated ?? target.decapitated, timeSinceDeathSec: deathDelay }],
        castingSl: sl,
        reserveSl: 0, // Décision MJ 12 octobre : `sl` inclut déjà la réserve consommée.
        overcastSpent: 0
      });
      const aRes = apothPrev.results[0];
      if (aRes?.needsDelay) {
        return { ready: false, valid: false, status: 'dice-required', missing: ['deathDelaySec'], error: `Apothéose Verdoyante : saisir le délai depuis la mort de ${target.name || target.id} (secondes, moins d’une minute).`, contract };
      }
      targetReceipt.verdantApotheosis = aRes;
      if (aRes && !aRes.admissible) {
        // Zone mêlant morts et vivants : la cible non admissible est ignorée avec son motif, les autres sont relevées ; refus s'il n'en reste aucune (après la boucle).
        verdantIgnored.push(`${target.name || target.id} non admissible (${aRes.reason})`);
        targetReceipt.actions.push({
          kind: 'resurrection',
          admissible: false,
          summary: `Apothéose Verdoyante : ${target.name || target.id} ignoré (${aRes.reason})`
        });
      } else if (aRes?.admissible) {
        targetReceipt.woundsHealed = aRes.healedHp;
        targetReceipt.finalHp = aRes.healedHp;
        targetReceipt.actions.push({
          kind: 'resurrection',
          healed: aRes.healedHp,
          summary: `Apothéose Verdoyante : résurrection à ${aRes.healedHp} B (${aRes.corruptionTest})`
        });
      }
    } else if (effects.special === 'hand-of-glory' || contract.name === 'Main de Gloire') {
      const explicitStats = options.chosenStats ?? options.mjParams?.chosenStats;
      const explicitTier = options.hogTier ?? options.tier ?? options.mjParams?.hogTier;
      const isOvercast6Tier = hogOvercast6 ?? (Number(overcastChoices.special) >= 6 || explicitTier === 'overcast6');
      const isMovementTier = explicitTier === 'movement' || options.movementOnly === true || (Array.isArray(explicitStats) && explicitStats.length === 1 && explicitStats[0] === 'M');
      const resolvedTier = isOvercast6Tier ? 'overcast6' : (isMovementTier ? 'movement' : 'base');
      const chosenStatsInput = explicitStats !== undefined ? explicitStats : (resolvedTier === 'movement' ? ['M'] : null);
      const hogMissing = [...(chosenStatsInput === null ? ['chosenStats'] : []),
        ...(resolvedTier !== 'movement' && (options.roll3d10 ?? options.mjParams?.roll3d10) == null ? ['roll3d10'] : [])];
      if (hogMissing.length) {
        return { ready: false, valid: false, status: 'dice-required', missing: hogMissing, error: 'Main de Gloire : saisir les caractéristiques choisies et le jet 3d10 commun.', contract };
      }
      let hogPrev;
      try {
        hogPrev = previewHandOfGlory({
          caster: actor,
          targets: [target],
          chosenStats: chosenStatsInput,
          tier: resolvedTier,
          roll3d10: options.roll3d10 ?? options.mjParams?.roll3d10 ?? null,
          options
        });
      } catch (err) {
        return {
          ready: false,
          valid: false,
          status: 'invalid-chosen-stats',
          error: err.message,
          contract
        };
      }
      if (Number(hogPrev.statModifiers?.M) && knownMovement(target) === null) return movementRequired(target, contract);
      delete targetReceipt.temporaryEffect; // One layer for the shared 3d10, including with Lileath.
      const hogExtras = {};
      if (hogOptions?.removeBroken || hogOptions?.purify) hogExtras.removeConditions = hogOptions.purify ? ['Brisé', 'Exténué'] : ['Brisé'];
      if (hogOptions?.purify) {
        const healRoll = Number(options.healRoll ?? options.mjParams?.healRoll);
        if (!Number.isInteger(healRoll) || healRoll < 1 || healRoll > 10) {
          return { ready: false, valid: false, status: 'dice-required', missing: ['healRoll'], error: 'Main de Gloire (+8 DR) : saisir le 1d10 de soin (1 à 10).', contract };
        }
        hogExtras.heal = healRoll;
        hogExtras.traits = ['Immunité (Psychologie)'];
      }
      targetReceipt.handOfGlory = { ...hogPrev, ...hogExtras };
      targetReceipt.actions.push({
        kind: 'hand-of-glory',
        tier: hogPrev.tier,
        summary: hogPrev.summary
      });
    } else if (effects.special === 'iron-voice') {
      const ironEffectDef = {
        spellId: contract.id,
        spellName: contract.name,
        casterId:actor.id,cn:contract.cn,castExecutionId:operationId,
        duration: effectDuration(target),
        statModifiers: effects.statModifiers || { Soc: 10 },
        testModifiers: { Commandement: 2, Intimidation: 2 },
        traits: effects.traits || ['Intimidation +10', 'Peur (1)'],
        removeConditions: ['Peur', 'Terreur', 'fear', 'terror'],
        unstoppableForce: effectiveCriticalChoice === 'unstoppable-force'
      };
      const appliedSim = applySpellEffects(target, ironEffectDef, {
        round: options.round || 1,
        caster: actor,
        overcastDurationMultiplier
      });
      targetReceipt.temporaryEffect = ironEffectDef;
      targetReceipt.appliedSim = appliedSim;
      targetReceipt.actions.push({
        kind: 'iron-voice',
        intimidationSlBonus: 1,
        leadershipSlBonus: 1,
        summary: 'Voix de Fer : +1 DR en Intimidation et Commandement, Peur (1)'
      });
    } else if (effects.special === 'shield-of-saphery' || contract.name === 'Bouclier de Saphery') {
      const sapheryImproved = (Number(options.otherHighSpellsCount) || 0) + specificSteps('ward-improve').reduce((sum, entry) => sum + entry.steps * (Number(entry.per) || 1), 0);
      const sWard = calculateSapheryWard(sapheryImproved, effects.ward);
      targetReceipt.sapheryWard = sWard;
      // A-03 : le seuil vit dans la couche d'effet (la meilleure Protection l'emporte), pas dans une écriture directe.
      if (targetReceipt.temporaryEffect) {
        targetReceipt.temporaryEffect = { ...targetReceipt.temporaryEffect, ward: sWard.threshold, saphery: { improved: sapheryImproved, baseWard:effects.ward } };
        targetReceipt.appliedSim = applySpellEffects(target, targetReceipt.temporaryEffect, { round: options.round || 1, caster: actor, overcastDurationMultiplier });
      }
      targetReceipt.actions.push({
        kind: 'shield-of-saphery',
        threshold: sWard.threshold,
        automaticSuccess: sWard.automaticSuccess,
        summary: sWard.summary
      });
    } else if (effects.special === 'daemonbane' || contract.name === 'Fléau des Démons') {
      if(target.caracs?.E == null)return {ready:false,valid:false,status:'mj-fact-required',error:'Fléau des Démons : Endurance (E) de la cible requise.',contract};
      const dPrev = previewDaemonbane({ caster: actor, target, ...options });
      targetReceipt.daemonbane = dPrev;
      targetReceipt.actions.push({ kind: 'daemonbane', summary: dPrev.summary });
    } else if (effects.special === 'scythe-of-shyish' || contract.name.includes('Faux de Shyish')) {
      const scythePrev = previewScytheOfShyish(actor);
      targetReceipt.scythe = scythePrev;
      targetReceipt.actions.push({ kind: 'scythe', summary: scythePrev.summary });
    } else if (effects.special === 'fortune-is-fickle' || effects.specialState?.forceFumbleOnDoubles) {
      targetReceipt.fortuneIsFickle = {
        forceFumbleOnDoubles: true,
        forbidCrits: true,
        forbidMitigation: true
      };
      targetReceipt.actions.push({
        kind: 'fortune-is-fickle',
        summary: 'La Fortune est Capricieuse : doubles = maladresses obligatoires, critiques et atténuations interdits'
      });
    }

    if(!targetReceipt.resisted){
      const extra=allLore?.targetEffects?.get(target.id)?.extraDirectWounds || 0;
      if(extra){targetReceipt.loreDirectWounds=extra;targetReceipt.woundsLost=(targetReceipt.woundsLost || 0)+extra;targetReceipt.finalHp=Math.max(0,(Number(target.hp)||0)-targetReceipt.woundsLost);}
    }
    // Tester les dégâts entrants avant leur plafonnement aux B restantes, y compris sur une cible à 0 B.
    // D-14 : les Blessures directes d'attribut (Vie, Lumière) ignorent PA, BE et Protection.
    const direct=targetReceipt.loreDirectWounds || 0;
    const protectedDamage=Math.max(0,(targetReceipt.woundsLost || 0)-direct + [targetReceipt.missile,targetReceipt.damage].filter(Boolean).reduce((sum,damage)=>sum+Math.max(0,(damage.finalDamage || 0)-(damage.woundsLost || 0)),0));
    if(protectedDamage>0 && targetReceipt.directSetHp === undefined){
      const protection=previewMagicProtection(target,protectedDamage,{wardRoll:options.targetTests?.[target.id]?.wardRoll,nature:spellNature(options.targetTests?.[target.id]?.attackNature)});
      if(!protection.ready)return {ready:false,valid:false,error:target.name+' : '+protection.error,contract};
      targetReceipt.magicProtection=protection;
      targetReceipt.woundsLost=Math.min(Math.max(0,Number(target.hp)||0),protection.amount+direct);targetReceipt.finalHp=Math.max(0,(Number(target.hp)||0)-targetReceipt.woundsLost);
      if(protection.wardSaved||protection.immune){
        if(targetReceipt.criticalWound){delete targetReceipt.criticalWound;targetReceipt.criticalWoundTriggered=false;targetReceipt.actions=targetReceipt.actions.filter(a=>a.kind!=='critical-wound');}
        targetReceipt.actions.push({kind:'protection',summary:protection.immune?'Immunité ('+protection.immunity+') : dégâts annulés ; les autres effets du sort s’appliquent.':'Protection magique : dégâts annulés ; les autres effets du sort s’appliquent.'});
      }
    }
    if(effects.fearOnWounds && targetReceipt.woundsLost>0){targetReceipt.fearOfCaster={casterId:actor.id,rating:effects.fearOnWounds};targetReceipt.actions.push({kind:'mj-input',summary:'Traiter '+actor.name+' comme Peur ('+effects.fearOnWounds+') : Test et restrictions contre ce lanceur à jouer.'});}
    if (damageConf.lifeStealRatio) targetReceipt.lifeSteal = { casterHeal: Math.floor(targetReceipt.woundsLost * damageConf.lifeStealRatio) };
    if (damageConf.permanentMaxHpReduction) {
      const lost = Math.floor(targetReceipt.woundsLost / 2);
      targetReceipt.newMaxHp = Math.max(0,Number(target.maxHp)-lost);
      if(targetReceipt.damage)targetReceipt.damage.targetNewMaxHp=targetReceipt.newMaxHp;
      targetReceipt.channellingGain = lost;
    }
    if (effects.banishUnstable || effects.killAtZero) targetReceipt.actions.push({kind:'conditional-effect',summary: targetReceipt.kill ? 'Mort à 0 B, animation en Mort-vivant interdite.' : targetReceipt.directSetHp === 0 ? 'Cible Instable réduite à 0 B.' : 'Clause conditionnelle évaluée.'});
    targetResults.push(targetReceipt);
  }

  if (verdantIgnored.length && !targetResults.some(r => r.verdantApotheosis?.admissible)) {
    return { ready: false, valid: false, status: 'invalid-target-admissibility', error: `Apothéose Verdoyante : ${verdantIgnored.join(' ; ')}`, contract };
  }

  if (durationUnreadable) {
    return {
      ready: false,
      valid: false,
      status: 'mj-duration-required',
      missing: ['mjDuration'],
      error: `Durée « ${contract.duration} » non lisible automatiquement (${durationUnreadable}) : saisir la durée de base, avant surpuissance (nombre et unité).`,
      targetResults,
      castingPreview,
      contract
    };
  }

  // Si un test secondaire obligatoire (ex: Calme -> Sociabilité, Purification du Corps -> Endurance) manque, bloquer l'exécution
  if (missingSecondaryTest) {
    return {
      ready: false,
      valid: false,
      status: 'secondary-test-required',
      secondaryTestRequired: true,
      secondaryTest: missingSecondaryTest,
      error: missingSecondaryTest.reason,
      targetResults,
      castingPreview,
      contract
    };
  }

  // S-07 : destinataires secondaires désignés par le MJ (ennemis engagés, attaquant), jamais déduits.
  const secondary = previewSecondaryRecipients(contract, actor, options, spellNature, sl,targetResults);
  if (secondary.blocked) {
    return { ready: false, valid: false, status: secondary.blocked.status || 'secondary-target-required', missing: secondary.blocked.missing, error: secondary.blocked.error, targetResults, castingPreview, contract };
  }
  const secondarySummaries = [
    ...secondary.results.map(r => `${r.targetName} : ${r.recurring ? 'sera frappé à chacun de ses Tours' : r.immune ? `immunisé (${r.immune})` : r.test?.passed ? `${r.test.skill} réussi, aucun effet` : [...(r.conditions.length ? [r.conditions.join(', ')] : []), ...(r.woundsLost ? [r.woundsLost + ' B'] : [])].join(' + ') || 'aucun effet'}`),
    ...secondary.reminders
  ];
  if (secondarySummaries.length && targetResults[0]) targetResults[0].actions.push({ kind: 'secondary-recipients', summary: secondarySummaries.join(' ; ') });

  let sourceVortex=null;
  if(effects.vortex){
    if(specificOvercast.entries.some(e=>e.id==='mini'&&e.steps>effects.vortex.miniMax))return {ready:false,valid:false,status:'invalid-option',error:'Au plus trois mini-vortex (WoM p. 137).',contract};
    if(specificOvercast.entries.some(e=>e.id==='swords'&&e.steps>(effects.summon?.max ?? Infinity)-1))return {ready:false,valid:false,status:'invalid-option',error:'Au plus six épées (WoM p. 137).',contract};
    const movement=resolveVortexTrajectory({contract:{...contract,effects},caster:actor,direction:options.direction,distance:options.distance,targetsCrossed:effectiveTargets,options});
    if(!movement.ready)return {ready:false,valid:false,status:'dice-required',error:movement.summary,missing:movement.missing,contract};
    const round=options.round || 1,controller={id:operationId+':vortex',spellId:contract.id,spellName:contract.name,casterId:actor.id,domain:contract.domain,castExecutionId:operationId,cn:contract.cn,duration:contract.duration,expiresAtRound:round+parseSpellDuration(contract.duration,{caster:actor}).amount*overcastDurationMultiplier,roundEffect:{phase:'endOfCasterTurn',vortex:{...effects.vortex,damageBonus:overcastDamageBonus}},specialState:{vortexController:true},appliedAtRound:round};
    if(!Number.isFinite(controller.expiresAtRound))controller.expiresAtRound=round+bfm*overcastDurationMultiplier;
    const people=[actor,...(options.participants || effectiveTargets).filter(t=>t.id!==actor.id)],inputData={...domainFacts};
    const answers={...options.targetTests};answers[actor.id]={...answers[actor.id],...inputData};
    for(const p of people)answers[p.id]={...answers[p.id],locationRoll:answers[p.id]?.locationRoll ?? locationRoll ?? (explicitRoll?reverseV5Roll(explicitRoll):undefined)};
    sourceVortex=randomVortexStep(people,actor,controller,{initial:{...movement.trajectory,targets:movement.trajectory.direction==='disappears'?[]:effectiveTargets.map(t=>t.id)},inputs:answers,round});
    if(!sourceVortex.ready)return {ready:false,valid:false,status:'dice-required',error:'Vortex : saisir les dés, occupants et faits de chaque frappe.',vortexRequests:sourceVortex.requests,missing:sourceVortex.requests.map(r=>r.field),contract};
    if(movement.trajectory.direction!=='disappears'){
      const owner=sourceVortex.participants.find(p=>p.id===actor.id);Object.assign(owner,applySpellEffects(owner,controller,{round,caster:actor}).participant);
    }
    for(const person of sourceVortex.participants){let receipt=targetResults.find(r=>r.targetId===person.id);if(!receipt && person.id!==actor.id && JSON.stringify(person)===JSON.stringify(people.find(p=>p.id===person.id)))continue;if(!receipt){receipt={targetId:person.id,targetName:person.name,actions:[],woundsLost:0,woundsHealed:0};targetResults.push(receipt);}const original=people.find(p=>p.id===person.id);receipt.vortexParticipant=person;receipt.woundsLost=Math.max(0,original.hp-person.hp);receipt.finalHp=person.hp;if(effectiveCriticalChoice==='critical-wound' && sourceVortex.logs.some(l=>l.detail?.targetId===person.id)){receipt.criticalWoundTriggered=true;receipt.criticalWound={location:sourceVortex.logs.find(l=>l.detail?.targetId===person.id)?.detail?.location || 'Corps',spellId:contract.id,spellName:contract.name,casterId:actor.id};receipt.actions.push({kind:'critical-wound',summary:'Blessure Critique d’incantation : sévérité à résoudre avec les dés explicites.'+spellCriticalSeverityReminder(actor)});}receipt.actions.push(...sourceVortex.logs.filter(l=>l.detail?.targetId===person.id).map(l=>({kind:'vortex-hit',summary:l.text,detail:l.detail})));}
    sourceVortex.trajectory=movement.trajectory;
  }
  // 7. Gestion du Vortex Magique si applicable
  let vortexMovement = null;
  if (effects.vortex) vortexMovement=sourceVortex;
  else if (!effects.assistedVortex && (contract.isVortex || effects.type === 'vortex' || effects.vortexMovementOnly === true)) {
    const vortexTargets = Array.isArray(options.targetsCrossed) && options.targetsCrossed.length > 0
      ? options.targetsCrossed
      : effectiveTargets;
    vortexMovement = resolveVortexTrajectory({
      contract,
      caster: actor,
      direction: options.direction ?? options.mjParams?.direction,
      distance: options.distance ?? options.mjParams?.distance,
      targetsCrossed: vortexTargets,
      options: { ...options, sl }
    });
    if (vortexMovement.ready === false) {
      return { ready: false, valid: false, status: 'dice-required', missing: vortexMovement.missing, error: vortexMovement.summary, contract };
    }
    for (const cRec of (vortexMovement.crossedReceipts || [])) {
      const tRec = targetResults.find(tr => tr.targetId === cRec.targetId);
      if (tRec) {
        // Une seule application des dégâts par cible et par étape : si la section B les a déjà résolus (BE, PA, Protection), le vortex
        // n'ajoute que ses États et ses modificateurs ; à défaut, ses dégâts propres.
        if (tRec.damage) {
          cRec.woundsLost = 0;
          cRec.actions = (cRec.actions || []).map(action => 'damage' in action ? { kind: action.kind, ...(action.condition ? { condition: action.condition } : {}), summary: `${contract.name} : ${action.condition ? `1 État ${action.condition} ; ` : ''}dégâts déjà résolus avec le sort` } : action);
        } else {
          tRec.woundsLost += cRec.woundsLost || 0;
          tRec.finalHp = Math.max(0, (Number(tRec.finalHp) || 0) - (cRec.woundsLost || 0));
        }
        tRec.actions.push(...(cRec.actions || []));
      }
    }
  }

  // 8. Gestion des Invocations / Auxiliaires si applicable
  let auxiliarySummon = null;
  if (!effects.assistedSummon && (contract.isAuxiliary || effects.type === 'summon' || specialTag === 'summon-small-animal')) {
    auxiliarySummon = resolveAuxiliarySummons({
      contract:{...contract,effects},
      caster: actor,
      options: {...options, castingSl:sl, summonCount:effectiveTargets.length}
    });
    if (targetResults.length > 0) {
      targetResults[0].actions.push({
        kind: 'summon',
        auxiliariesCount: auxiliarySummon.auxiliaries.length,
        summary: auxiliarySummon.summary
      });
    }
  }

  // Garde-fou final : un sort non-narratif réussi ne peut pas être "ready: true" sans aucun effet principal exécuté
  const isNarrativeSpell = contract.treatment === 'narrative' || effects.type === 'narrative';
  const hasAnyMainAction =
    targetResults.some(tr => tr.actions.some(a => a.kind !== 'lore-attribute')) ||
    Boolean(vortexMovement) ||
    Boolean(auxiliarySummon);

  if (!isNarrativeSpell && effectiveTargets.length > 0 && !hasAnyMainAction) {
    return {
      ready: false,
      valid: false,
      status: 'unimplemented-effect',
      error: `Aucun effet principal exécutable généré pour le contrat ${contract.name}.`,
      contract
    };
  }

  // 9. Gestion du reçu de suivi fiche pour les sorts concernés (ou Destruction des Arcanes)
  let ficheFollowUpReceipt = null;
  if (contract.ficheFollowUp && (specialTag !== 'arcane-unforgiving' || arcaneUnforgivingInventoryFollowUp.length)) {
    ficheFollowUpReceipt = buildFicheFollowUpReceipt({
      contract,
      actor,
      targets: effectiveTargets,
      options
    });
  }
  if (arcaneUnforgivingInventoryFollowUp.length) {
    ficheFollowUpReceipt = {
      ...(ficheFollowUpReceipt || {}),
      inventoryChanges: arcaneUnforgivingInventoryFollowUp,
      requiresConfirmation: true,
      consequences: [...(ficheFollowUpReceipt?.consequences || []), ...arcaneUnforgivingInventoryFollowUp.map(item => item.summary)]
    };
  }

  const summary = `Exécution de ${contract.name} (${contract.canonicalName}) par ${actor.name || actor.id} sur ${effectiveTargets.length} cible(s).`;

  return {
    ready: true,
    valid: true,
    spellSuccess: true,
    dispelReaction,
    castFailed: false,
    hasCastingInput,
    roll: explicitRoll,
    sl: explicitSl,
    criticalChoice: effectiveCriticalChoice,
    unstoppableForce: effectiveCriticalChoice === 'unstoppable-force',
    casterSelfDamage,
    casterConditions:effects.casterConditions,
    mjChoice: resolvedMjChoice,
    targetValidation,
    operationId,
    baseRevision: options.baseRevision,
    contract,
    actor: { id: actor.id, name: actor.name },
    targets: effectiveTargets.map(t => ({ id: t.id, name: t.name })),
    overcast: {
      choices: overcastChoices,
      damageBonus: overcastDamageBonus,
      targetsBonus: overcastTargetsBonus,
      rangeMultiplier: overcastRangeMultiplier,
      durationMultiplier: overcastDurationMultiplier,
      aoeMultiplier: overcastAoeMultiplier
    },
    burnout,
    cadaiRuneUsed: Boolean(options.useCadaiRune),
    targetResults,
    secondaryResults: secondary.results,
    attributeReceipts,
    lorePreview: allLore,
    // Rappels chiffrés : clauses de drapeaux non calculées et options de surpuissance propres au sort à valeur de rappel.
    reminders: [...reminderFlagTexts(contract, actor), ...specificOvercast.entries.map(entry => entry.reminder || !SPECIFIC_OVERCAST_KINDS.includes(entry.kind) ? specificOvercastReminder(entry, actor) : null).filter(Boolean)],
    overcastSpecific: specificOvercast.entries.map(entry => ({ id: entry.id, label: entry.label, steps: entry.steps, spent: entry.spent, kind: entry.kind, applied: SPECIFIC_OVERCAST_KINDS.includes(entry.kind), reminder: entry.reminder || !SPECIFIC_OVERCAST_KINDS.includes(entry.kind) ? specificOvercastReminder(entry, actor) : null })),
    senseReceipts:magicalSenseReceipts(actor,options.participants || [],options),
    vortexMovement,
    auxiliarySummon,
    ficheFollowUpReceipt,
    castingPreview,
    miscast: castingPreview?.miscast || null,
    summary
  };
}

/**
 * Application atomique dans le Store de l'exécution d'un contrat de sort V5.
 * Modifie le draft de combat et retourne un rapport d'application complet.
 */
export function applySpellExecution(draft, contractOrId, input = {}) {
  const contract = typeof contractOrId === 'object' && contractOrId.id ? contractOrId : getSpellContract(contractOrId);

  if (!contract) {
    throw new Error(`Contrat de sort introuvable : ${contractOrId}`);
  }

  const participants = draft.combat?.participants || draft.participants || [];
  const actorId = input.actorId || input.preview?.actor?.id;
  const actor = participants.find(p => p.id === actorId);

  if (!actor) {
    throw new Error(`Lanceur introuvable dans le combat : ${actorId}`);
  }

  // Vérification de cohérence d'un éventuel aperçu passé en entrée
  if (input.preview && typeof input.preview === 'object') {
    if (input.preview.contract?.id && input.preview.contract.id !== contract.id) {
      throw new Error(`Aperçu invalide : le contrat ${input.preview.contract.id} ne correspond pas à ${contract.id}.`);
    }
    if (input.preview.actor?.id && input.preview.actor.id !== actor.id) {
      throw new Error(`Aperçu invalide : le lanceur ${input.preview.actor.id} ne correspond pas à ${actor.id}.`);
    }
  }

  const effectiveRoll =
    input.roll ??
    input.castingRoll ??
    input.castRoll ??
    input.options?.roll ??
    input.options?.castingRoll ??
    input.castingPreview?.roll ??
    input.castResult?.roll ??
    input.preview?.roll ??
    input.preview?.castingPreview?.roll;

  const effectiveSl =
    input.sl ??
    input.castingSl ??
    input.options?.sl ??
    input.options?.castingSl ??
    input.castingPreview?.testSl ??
    input.castResult?.testSl ??
    input.preview?.sl;

  // 1. Contrôle de preuve d'incantation ou jet requis
  const hasCastingProof = Boolean(
    effectiveRoll !== undefined ||
    effectiveSl !== undefined ||
    input.allowUnchecked === true
  );

  if (!hasCastingProof) {
    throw new Error(`Incantation non résolue : jet de lancement, DR ou aperçu d'incantation requis pour exécuter ${contract.name}.`);
  }

  // 2. Contrôle de révision (stale preview)
  const expectedRev = input.baseRevision ?? input.preview?.baseRevision;
  const currentRev = draft.localRevision ?? draft.revision;
  if (expectedRev !== undefined && currentRev !== undefined && expectedRev !== currentRev) {
    throw new Error('État modifié depuis l’aperçu : la situation de combat a changé depuis le calcul.');
  }

  // 3. Recalcul et vérification systématique de l'aperçu contre l'état courant du combat
  const targetIds = input.targetIds || input.options?.targetIds || (input.options?.targetsCrossed?.map(t=>t.id)) || (input.targetId ? [input.targetId] : (input.preview?.targets?.map(t => t.id) || [actorId]));
  const opKey = input.executionId || input.operationId || input.preview?.operationId || `${contract.id}:${actorId}:${targetIds.join(',')}:${effectiveRoll ?? effectiveSl ?? 'default'}:${input.mjChoice ?? ''}:${input.fellowshipRoll ?? ''}:${input.resistanceRoll ?? ''}`;
  const targets = targetIds.map(id=>participants.find(p=>p.id===id)).filter(Boolean);
  const verifyOptions = {
    ...(input.options || {}),
    ...input,
    roll: effectiveRoll,
    sl: effectiveSl,
    castingPreview: input.castingPreview ?? input.castResult ?? input.preview?.castingPreview,
    miscast: input.miscast ?? input.castingPreview?.miscast ?? input.castResult?.miscast ?? input.preview?.miscast,
    mjChoice: input.mjChoice ?? input.mjOption ?? input.options?.mjChoice ?? input.preview?.mjChoice,
    overcastChoices: input.overcastChoices ?? input.overcast ?? input.preview?.overcast?.choices,
    criticalChoice: input.criticalChoice ?? input.preview?.criticalChoice ?? input.castingPreview?.criticalChoice,
    operationId: opKey,
    baseRevision: expectedRev,
    participants, round: currentMagicRound(draft.combat),
    magicAdventureId:draft.extensions?.v5?.magicAdventureId,fortuneByTarget:Object.fromEntries(participants.map(p=>[p.id,getV5Fortune(draft,p).balance])),
    turnKey: `${draft.combat?.round || 1}:${draft.extensions?.v5?.turnIndex || 1}`,
    assistant: participants.find(p=>p.id===input.assistantId)
  };
  const preview = previewSpellExecution(actor, contract, targets, verifyOptions);

  if (!preview.ready) {
    throw new Error(`Impossible d'appliquer le sort : ${preview.error || 'prévisualisation non prête'}`);
  }

  // 4. Protection anti-doublon (double clic / seconde application)
  draft.combat = draft.combat || {};
  draft.combat.appliedSpellExecutions = draft.combat.appliedSpellExecutions || [];
  draft.extensions = draft.extensions || {};
  draft.extensions.v5 = draft.extensions.v5 || {};
  draft.extensions.v5.appliedSpellExecutions = draft.extensions.v5.appliedSpellExecutions || [];

  if (draft.combat.appliedSpellExecutions.includes(opKey) || draft.extensions.v5.appliedSpellExecutions.includes(opKey)) {
    throw new Error(`Exécution de sort déjà appliquée : double application de ${contract.name} refusée.`);
  }
  // The shared canonical ledger lives in extensions.v5 only.
  draft.extensions.v5.appliedSpellExecutions.push(opKey);
  // HEPG p. 84 : une relance de Corruption par rune se rattache à une exécution réelle de Haute Magie du lanceur.
  if (contract.domain === 'high') {
    draft.extensions.v5.highMagicExecutions = [...(draft.extensions.v5.highMagicExecutions || []), { id: opKey, actorId: actor.id, spellId: contract.id, rerolledCorruption: [] }].slice(-50);
  }

  // 5. Consommation systématique de la réserve de focalisation de l'acteur sur toute tentative effective
  const currentRound = draft.combat?.round ? currentMagicRound(draft.combat) : (draft.round || 1);
  const aIdx = participants.findIndex(p => p.id === actor.id);
  let consumedReserveSl = 0;
  let miscastApplied = null;

  if (aIdx !== -1) {
    const currentReserve = getChannellingReserve(participants[aIdx]);
    consumedReserveSl = currentReserve.sl || 0;
    participants[aIdx] = applyMagicAttempt(clearChannellingReserve(participants[aIdx]), preview, verifyOptions);

    // Application atomique de l'incident magique éventuel (sur échec/maladresse OU sur critique réussi)
    const miscastToApply = preview.miscast || preview.castingPreview?.miscast;
    if (miscastToApply && !miscastToApply.cancelled) {
      miscastApplied = applyMiscastToParticipant(participants[aIdx], miscastToApply, {
        round: currentRound,
        ...verifyOptions
      });
      participants[aIdx] = miscastApplied.participant;
    }
  }

  if (preview.spellSuccess && contract.effects?.casterRemoveConditions?.length) {
    const caster=participants.find(p=>p.id===actor.id);
    caster.states=caster.states.filter(s=>!contract.effects.casterRemoveConditions.some(name=>fold(name)===fold(s.name || s.key || s.id || s)));
  }
  if(preview.dispelReaction){
    const index=participants.findIndex(p=>p.id===preview.dispelReaction.dispellerId);
    participants[index]=markDispelReactionUsed(applyMagicAttempt(participants[index],preview.dispelReaction),currentRound);
    if(preview.dispelReaction.dispelled){
      draft.log=[{id:opKey+':dispel',ts:Date.now(),kind:'magic',text:preview.dispelReaction.summary},...(draft.log || [])].slice(0,300);
      return {success:true,spellSuccess:false,dispelled:true,consumedReserveSl,miscast:miscastApplied,appliedTargets:[],summary:preview.dispelReaction.summary};
    }
  }

  // Si l'incantation a échoué (testSuccess === false ou totalCastingSl < cn) :
  // La réserve a été consommée et le miscast appliqué au lanceur, mais aucun effet du sort n'affecte les cibles.
  if (preview.spellSuccess === false) {
    const failLogText = miscastApplied?.applied
      ? `Échec d’incantation de ${contract.name} par ${actor.name || actor.id} (${preview.summary}) — ${miscastApplied.summary || miscastApplied.miscast?.summary || preview.miscast?.entry?.title || 'Incident magique appliqué'}`
      : `Échec d’incantation de ${contract.name} par ${actor.name || actor.id} : ${preview.summary}`;

    const logEntry = {
      id: `log-${Date.now()}-${uid()}`,
      ts: Date.now(),
      kind: 'magic',
      text: failLogText
    };
    draft.log = [logEntry,...(preview.targetResults || []).flatMap(r=>(r.actions || []).filter(a=>a.kind==='chain-ended').map((a,i)=>({id:opKey+':chain:'+r.targetId+':'+i,ts:Date.now(),kind:'magic',text:r.targetName+' : '+a.summary}))),...(preview.senseReceipts || []).map((r,index)=>({id:opKey+':sense:'+index,ts:Date.now(),kind:'magic',text:r.summary})), ...(draft.log || [])].slice(0, 300);

    return {
      success: true,
      spellSuccess: false,
      castFailed: true,
      contract,
      consumedReserveSl,
      miscast: miscastApplied,
      summary: preview.summary,
      appliedTargets: [],
      vortex: null,
      auxiliaries: null,
      ficheFollowUpReceipt: null,
      logEntry
    };
  }

  // Dégâts auto-infligés au lanceur si déclarés dans le contrat (ex: Couronne de Flamme)
  if (preview.casterSelfDamage > 0) {
    const cSelfIdx = participants.findIndex(p => p.id === actor.id);
    if (cSelfIdx !== -1) {
      participants[cSelfIdx].hp = Math.max(0, (Number(participants[cSelfIdx].hp) || 0) - preview.casterSelfDamage);
    }
  }

  const appliedTargets = [];
  let criticalWoundInflicted = false;

  // 6. Appliquer sur chaque cible principale (uniquement lorsque spellSuccess === true)
  for (const tRes of preview.targetResults) {
    const pIdx = participants.findIndex(p => p.id === tRes.targetId);
    if (pIdx === -1) continue;

    let target = participants[pIdx];

    if (tRes.resisted) {
      if(tRes.defianceCancelled){
        target.extensions ??={};target.extensions.v5 ??={};target.extensions.v5.magicDefianceAdventure=verifyOptions.magicAdventureId;
        const balance=getV5Fortune(draft,target).balance;
        if(balance==null || balance<1)throw new Error('Défiance magique : compteur de Chance initialisé et 1 point requis pour '+(target.name || target.id)+'.');
        target.extensions.v5.resources={...(target.extensions.v5.resources || {}),fortune:balance-1};
        participants[pIdx]=target;
      }
      appliedTargets.push({
        targetId: target.id,
        targetName: target.name,
        newHp: target.hp,
        resisted: true,
        actions: tRes.actions
      });
      continue;
    }

    if(tRes.vortexParticipant){
      const next=tRes.vortexParticipant,ids=new Set((target.extensions?.v5?.spellEffects || []).map(e=>e.id));target.hp=next.hp;target.states=structuredClone(next.states || []);
      if(next.extensions?.v5?.dead)target.extensions.v5.dead=true;
      if(tRes.criticalWound){target.extensions.v5.criticalWounds=[...(target.extensions.v5.criticalWounds || []),{...tRes.criticalWound,id:`${opKey}:crit:${target.id}`,source:'spell',round:currentRound}];criticalWoundInflicted=true;}
      for(const layer of next.extensions?.v5?.spellEffects || [])if(!ids.has(layer.id))Object.assign(target,applySpellEffects(target,layer,{round:currentRound,caster:actor}).participant);
      participants[pIdx]=target;appliedTargets.push({targetId:target.id,targetName:target.name,newHp:target.hp,woundsLost:tRes.woundsLost,actions:tRes.actions});continue;
    }
    // Dégâts (sauf si déjà comptabilisés uniquement par le vortex)
    const nonVortexWounds = tRes.woundsLost - (preview.vortexMovement?.crossedReceipts?.find(cr => cr.targetId === target.id)?.woundsLost || 0);
    if (nonVortexWounds > 0) {
      target.hp = Math.max(0, (Number(target.hp) || 0) - nonVortexWounds);
    }
    if (tRes.permanentMaxHpReduction && tRes.newMaxHp !== undefined) {
      target.maxHp = tRes.newMaxHp;
      if (target.hp > target.maxHp) target.hp = target.maxHp;
    }

    if (tRes.persistentTraits?.length) {
      target.extensions.v5.baseTraits=[...new Set([...(target.extensions.v5.baseTraits || target.traits || []),...tRes.persistentTraits])];
      target.extensions.traits=[...target.extensions.v5.baseTraits];
      target.traits=[...new Set([...(target.traits || []),...tRes.persistentTraits])];
    }
    if(tRes.armourDamage){target=applyArcaneArmorDamage(target,tRes.armourDamage);participants[pIdx]=target;}
    if(tRes.banished){target.zone='bench';target.extensions.v5.banished=true;}
    if(tRes.casterHealing){const caster=participants.find(p=>p.id===actor.id);caster.hp=Math.min(Number(caster.maxHp),Number(caster.hp)+tRes.casterHealing);}
    // Drain de Magie : vider la réserve de focalisation et dissiper les effets magiques actifs
    if (tRes.drainMagic) {
      if (tRes.drainMagic.emptyReserves) {
        target = clearChannellingReserve(target);
        participants[pIdx] = target;
      }
      if (tRes.drainMagic.dispelAoE && Array.isArray(tRes.drainMagic.dispelledEffectIds) && tRes.drainMagic.dispelledEffectIds.length > 0) {
        for (const effId of tRes.drainMagic.dispelledEffectIds) {
          const expRes = expireSpellEffects(target, { effectId: effId });
          target = expRes.participant;
        }
        participants[pIdx] = target;
      }
    }

    // Blessure Critique d'incantation (critical-wound)
    if (tRes.criticalWound) {
      criticalWoundInflicted = true;
      target.extensions = target.extensions || {};
      target.extensions.v5 = target.extensions.v5 || {};
      target.extensions.v5.criticalWounds = [
        ...(target.extensions.v5.criticalWounds || []),
        { ...tRes.criticalWound, id: `${opKey}:crit:${target.id}`, source: 'spell', round: currentRound }
      ];
    }

    // Soins (sauf si résurrection gérée par Apothéose Verdoyante)
    if (tRes.woundsHealed > 0 && !tRes.verdantApotheosis) {
      const maxHp = Number(target.maxHp) || Number(target.hp) || 12;
      target.hp = Math.min(maxHp, (Number(target.hp) || 0) + tRes.woundsHealed);
    }

    if (tRes.kill) { target.extensions.v5.dead=true; target.extensions.v5.cannotRaiseUndead=true; }
    if(tRes.restoreCorpse){target.hp=tRes.directSetHp;target.dead=false;target.isDead=false;target.extensions.v5.dead=false;target.states=(target.states || []).filter(s=>!['mort','dead','inconscient'].includes(fold(s.key || s.name)));}
    if(tRes.permanentStatDeltas){const patch=Object.fromEntries(Object.entries(tRes.permanentStatDeltas).map(([key,delta])=>[key,Math.max(0,baseCharacteristicScore(target,key)+delta)]));target=rebaseMagicLayers(target,{caracs:patch});participants[pIdx]=target;}
    if (tRes.channellingGain) { const caster=participants.find(p => p.id === actor.id); caster.extensions.v5.channelling={ type:'winds', sl:(Number(caster.extensions.v5.channelling?.sl)||0)+tRes.channellingGain }; }
    // Vol de vie
    if (tRes.lifeSteal?.casterHeal > 0) {
      const cIdx = participants.findIndex(p => p.id === actor.id);
      if (cIdx !== -1) {
        const cTarget = participants[cIdx];
        const cMaxHp = Number(cTarget.maxHp) || 12;
        cTarget.hp = Math.min(cMaxHp, (Number(cTarget.hp) || 0) + tRes.lifeSteal.casterHeal);
        cTarget.states = cTarget.states.filter(s => !['extenue','fatigued'].includes(fold(s.name || s.key || s.id)));
      }
    }

    // Effet temporaire
    if (tRes.temporaryEffect) {
      const applied = applySpellEffects(target, tRes.temporaryEffect, {
        round: currentRound,
        caster: actor,
        overcastDurationMultiplier: preview.overcast?.durationMultiplier
      });
      participants[pIdx] = applied.participant;
      target = participants[pIdx];
      if (Array.isArray(tRes.temporaryEffect.removeConditions) && Array.isArray(target.states)) {
        const remSet = new Set(tRes.temporaryEffect.removeConditions.map(c => fold(c)));
        target.states = target.states.filter(s => !remSet.has(fold(s.id || s.key || s.name || s)));
      }
    }

    if (tRes.apotheose) {
      target = structuredClone(target);
      if (tRes.apotheose.raised) {
        target.dead = false; target.isDead = false; target.extensions = target.extensions || {}; target.extensions.v5 = { ...(target.extensions.v5 || {}), dead: false };
        if (Array.isArray(target.states)) target.states = target.states.filter(state => !['mort', 'dead', 'inconscient'].includes(fold(state?.key || state?.name || state)));
      }
      if (tRes.apotheose.criticalHealed) {
        // Les Blessures Critiques sont des états de source « critical » : la plus ancienne est guérie.
        const at = (target.states || []).findIndex(st => st?.source?.kind === 'critical');
        if (at !== -1) target.states = target.states.filter((_, i) => i !== at);
      }
      participants[pIdx] = target;
    }

    if (tRes.arcaneUnforgiving) {
      target = applyArcaneArmorDamage(target, tRes.arcaneUnforgiving);
      if (tRes.arcaneUnforgiving.requiresInventoryConfirmation) {
        target.extensions = target.extensions || {};
        target.extensions.v5 = target.extensions.v5 || {};
        target.extensions.v5.pendingInventoryChanges = [...(target.extensions.v5.pendingInventoryChanges || []),
          { operationId: opKey, spellId: contract.id, ...structuredClone(tRes.arcaneUnforgiving) }];
      }
      participants[pIdx] = target;
    }

    // Saisie MJ assistée enregistrée sur la cible
    if (tRes.mjInput) {
      target.extensions = target.extensions || {};
      target.extensions.v5 = target.extensions.v5 || {};
      target.extensions.v5.activeMjEffects = [
        ...(target.extensions.v5.activeMjEffects || []),
        {
          spellId: contract.id,
          spellName: contract.name,
          casterId: actor.id,
          round: currentRound,
          ...tRes.mjInput
        }
      ];
    }

    // Arbitrages : Apothéose Verdoyante
    if (tRes.verdantApotheosis) {
      const apothRes = applyVerdantApotheosis([target], { results: [tRes.verdantApotheosis] });
      if (apothRes.updatedCorpses?.length > 0) {
        participants[pIdx] = apothRes.updatedCorpses[0];
        target = participants[pIdx];
      }
    }

    // Arbitrages : Main de Gloire
    if (tRes.handOfGlory) {
      const hogRes = applyHandOfGlory([target], tRes.handOfGlory, {
        round: currentRound,
        duration: contract.duration,
        caster: actor,spellId:contract.id,cn:contract.cn,castExecutionId:opKey,unstoppableForce:preview.criticalChoice==='unstoppable-force',
        overcastDurationMultiplier: preview.overcast?.durationMultiplier
      });
      if (hogRes.updatedTargets?.length > 0) {
        participants[pIdx] = hogRes.updatedTargets[0];
        target = participants[pIdx];
      }
    }

    // Bouclier de Saphery : le seuil de Protection est porté par la couche d'effet (v5.ward), sans copie à plat.

    // Arbitrages : Forme bestiale
    if (tRes.beastForm) {
      // Palier de durée de la surpuissance : la forme et son effet marqueur durent autant l'une que l'autre.
      const durationFactor = Math.max(1, Number(preview.overcast?.durationMultiplier) || 1);
      const kadonRounds = tRes.beastForm.kind === 'kadon' ? tRes.beastForm.durationRounds * durationFactor : null;
      const beastMinutes = tRes.beastForm.durationMinutes * durationFactor;
      const transformed = applyBeastForm(target, tRes.beastForm.beastProfile, {
        durationMinutes: beastMinutes,
        optionalTraits: tRes.beastForm.optionalTraits,
        ...(kadonRounds !== null ? { durationRounds: kadonRounds, kind: 'kadon' } : {}),
        isJade: tRes.beastForm.isJade,
        spellId: contract.id,round:currentRound,casterId:actor.id
      });
      transformed.participant=applySpellEffects(transformed.participant,{spellId:contract.id,spellName:contract.name,casterId:actor.id,cn:contract.cn,castExecutionId:opKey,duration:kadonRounds !== null ? kadonRounds+' Rounds' : beastMinutes+' minutes',beastFormMarker:true,unstoppableForce:preview.criticalChoice==='unstoppable-force'},{round:currentRound}).participant;
      participants[pIdx] = transformed.participant;
      target = participants[pIdx];
    }

    // Arbitrages : Fléau des démons
    if (tRes.daemonbane) {
      const baneApplied = applyDaemonbane(target, tRes.daemonbane);
      participants[pIdx] = baneApplied.target;
      target = participants[pIdx];
    }

    appliedTargets.push({
      targetId: target.id,
      targetName: target.name,
      newHp: target.hp,
      actions: tRes.actions,
      criticalWound: tRes.criticalWound || null,
      unstoppableForce: Boolean(tRes.unstoppableForce)
    });
  }

  // Blessure Critique d'incantation infligée par le lanceur : les couches divines « consumeOn: critical » (Sauvagerie) prennent fin, comme pour une attaque.
  if (criticalWoundInflicted) {
    const cIdx = participants.findIndex(p => p.id === actor.id);
    const casterLive = cIdx !== -1 ? participants[cIdx] : null;
    const consumed = casterLive && consumeDivineLayers(casterLive, 'critical');
    if (consumed) participants[cIdx] = refreshEffectLayers(consumed, casterLive);
  }

  // S-07 : États et Blessures des destinataires secondaires désignés (ennemis engagés, attaquant).
  for (const sRes of preview.secondaryResults || []) {
    const sIdx = participants.findIndex(p => p.id === sRes.targetId);
    if (sIdx === -1) continue;
    let secondaryTarget = participants[sIdx];
    if (sRes.woundsLost > 0) secondaryTarget.hp = Math.max(0, (Number(secondaryTarget.hp) || 0) - sRes.woundsLost);
    if (sRes.conditions.length) secondaryTarget = acquireV5Conditions(secondaryTarget, sRes.conditions, { round: currentRound }).participant;
    if(sRes.testModifiers)secondaryTarget=applySpellEffects(secondaryTarget,{id:opKey+':secondary:'+sRes.targetId,spellId:contract.id,spellName:contract.name,casterId:actor.id,cn:contract.cn,castExecutionId:opKey,duration:contract.duration,testModifiers:sRes.testModifiers},{round:currentRound,caster:actor,overcastDurationMultiplier:preview.overcast?.durationMultiplier || 1}).participant;
    participants[sIdx] = secondaryTarget;
  }

  if(preview.lorePreview){
    const eligible=participants.filter(p=>preview.targetResults.some(t=>t.targetId===p.id&&!t.resisted));
    const effectTargets=new Map([...preview.lorePreview.targetEffects].filter(([id])=>eligible.some(p=>p.id===id)));
    const lore={...preview.lorePreview,targetEffects:new Map([...effectTargets].map(([id,e])=>[id,{...e,extraDirectWounds:0}]))};
    const caster=participants.find(p=>p.id===actor.id);
    const receipt=applyLoreAttribute(draft,lore,{caster,targets:eligible,round:currentRound,spellId:contract.id,cn:contract.cn,castExecutionId:opKey,duration:contract.duration,overcastDurationMultiplier:preview.overcast?.durationMultiplier});
    for(const [id,next] of receipt.updatedParticipants){const index=participants.findIndex(p=>p.id===id);participants[index]=next;}
  }
  // 7. Appliquer les conséquences d'un vortex sur les cibles traversées
  if (preview.vortexMovement?.crossedReceipts?.length > 0) {
    for (const vRes of preview.vortexMovement.crossedReceipts) {
      const vIdx = participants.findIndex(p => p.id === vRes.targetId);
      if (vIdx === -1) continue;
      let vTarget = participants[vIdx];

      if (vRes.woundsLost > 0) {
        vTarget.hp = Math.max(0, (Number(vTarget.hp) || 0) - vRes.woundsLost);
      }
      if (vRes.conditions?.length > 0) {
        const cRes = acquireV5Conditions(vTarget, vRes.conditions, {
          round: currentRound
        });
        participants[vIdx] = cRes.participant;
        vTarget = participants[vIdx];
      }
      if (vRes.statModifiers) {
        const effDef = {
          id: `vortex-effect-${contract.id}-${Date.now()}`,
          spellId: contract.id,
          spellName: contract.name,
          casterId: actor.id,
          statModifiers: vRes.statModifiers,
          unstoppableForce: preview.unstoppableForce
        };
        const applied = applySpellEffects(vTarget, effDef, {
          round: currentRound,
          caster: actor
        });
        participants[vIdx] = applied.participant;
      }
    }
  }

  // 8. Intégrer les auxiliaires invoqués dans les participants du combat
  if (preview.auxiliarySummon?.auxiliaries?.length > 0) {
    for (const [index,aux] of preview.auxiliarySummon.auxiliaries.entries()) {
      participants.push({
        ...aux,
        ...(contract.effects.summonProfile || contract.effects.summon?.indestructible || contract.effects.special==='invisible-eye' ? {extensions:{...aux.extensions,v5:{...aux.extensions?.v5,summonCastExecutionId:opKey,summonOwnerId:preview.targetResults[index]?.targetId || actor.id}}} : {}),
        appliedAtRound: currentRound
      });
    }
  }

  for(const receipt of preview.targetResults){
    if(!receipt.missile && !receipt.damage)continue;
    const index=participants.findIndex(p=>p.id===receipt.targetId);if(index<0)continue;
    const ids=(participants[index].extensions?.v5?.spellEffects || []).filter(e=>e.specialState?.endsOnIncomingAttack).map(e=>e.id);
    for(const effectId of ids)participants[index]=expireSpellEffects(participants[index],{effectId}).participant;
  }
  // 9. Appliquer l'épuisement magique éventuel
  if (preview.burnout?.active) {
    const bIdx = participants.findIndex(p => p.id === actor.id);
    if (bIdx !== -1) {
      const bRes = applyBurnout(participants[bIdx], preview.burnout);
      participants[bIdx] = bRes.participant;
    }
  }

  // Bouclier de Saphery : chaque autre sort de Haute Magie du lanceur améliore de 1 la Protection de ses couches actives (HEPG p. 88).
  if (contract.domain === 'high') {
    participants.forEach((person, index) => {
      const improved = improveSapheryWards(person, { casterId: actor.id, exceptExecutionId: opKey });
      if (improved) participants[index] = improved;
    });
  }

  if(preview.casterConditions?.length){
    const casterPerson=draft.combat.participants.find(p=>p.id===actor.id);Object.assign(casterPerson,acquireV5Conditions(casterPerson,preview.casterConditions,{authorId:actor.id,targetId:actor.id,round:currentRound,source:{spellId:contract.id}}).participant);
  }
  // 11. Journalisation dans le log de combat
  const logText = miscastApplied?.applied
    ? `Sort ${contract.name} lancé par ${actor.name || actor.id} : ${preview.summary} — ${miscastApplied.summary || miscastApplied.miscast?.summary || preview.miscast?.entry?.title || 'Incident magique appliqué'}`
    : `Sort ${contract.name} lancé par ${actor.name || actor.id} : ${preview.summary}`;

  const logEntry = {
    id: `log-${Date.now()}-${uid()}`,
    ts: Date.now(),
    kind: 'magic',
    text: logText
  };

  draft.log = [logEntry,...(preview.targetResults || []).flatMap(r=>(r.actions || []).filter(a=>a.kind==='chain-ended').map((a,i)=>({id:opKey+':chain:'+r.targetId+':'+i,ts:Date.now(),kind:'magic',text:r.targetName+' : '+a.summary}))),...(preview.senseReceipts || []).map((r,index)=>({id:opKey+':sense:'+index,ts:Date.now(),kind:'magic',text:r.summary})), ...(draft.log || [])].slice(0, 300);

  return {
    success: true,
    spellSuccess: true,
    castFailed: false,
    contract,
    consumedReserveSl,
    miscast: miscastApplied,
    unstoppableForce: preview.unstoppableForce,
    summary: preview.summary,
    appliedTargets,
    vortex: preview.vortexMovement,
    auxiliaries: preview.auxiliarySummon?.auxiliaries,
    ficheFollowUpReceipt: preview.ficheFollowUpReceipt,
    logEntry
  };
}
