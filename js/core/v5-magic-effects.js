import { uid } from './models.js';
import {revertBeastForm, calculateSapheryWard} from './v5-magic-arbitrations.js';
import { magicTalentRank } from './v5-magic-talents.js';
/**
 * Moteur des Effets Magiques Communs V5 — Lot 3.2.
 * Conforme au Cahier des charges Lot 3 et au Cadrage Magie V5.
 * Module pur : aucune E/S, aucun tirage implicite, prévisualisations sans mutation d'état.
 */

import { normalizeEffects, normalizeState } from './effects.js';
import { acquireV5Conditions, healV5Wounds, createV5TimedEffect } from './v5-effects.js';
import { reverseV5Roll } from './v5-roll.js';
import { getLocationName } from './dice.js';
import { parseWeaponDamage, evaluateWeaponDamage } from './damage.js';
import { HIT_LOCATIONS } from '../data/shared/fiche/equipment.js';
import { normalizeArmorLocations, locationProtection } from './equipment.js';
import { armorMaterial, wornArmourPieces } from './v5-armor-material.js';
import { isTargetDaemon, isTargetUndead } from './v5-magic-attributes.js';
import { projectDivineGear } from './v5-divine-effects-gear.js';

export const V5_MAGIC_EFFECTS_VERSION = 'v5-magic-effects-2026-10-10.1';
/** Expressions chiffrées déclarées par un contrat ; aucun dé et aucune interprétation de prose. */
export function spellFormulaValue(formula,caster,sl=0){
 const stats=caster.caracs || {},values={DR:sl,...Object.fromEntries(['FM','F','E','Int','I','Soc','Ag','Dex','CT','CC','M'].map(key=>[key,Number(stats[key])])),BF:Math.floor(Number(stats.F)/10),BFM:Math.floor(Number(stats.FM)/10),BE:Math.floor(Number(stats.E)/10),BIntelligence:Math.floor(Number(stats.Int)/10),BSoc:Math.floor(Number(stats.Soc)/10),BDex:Math.floor(Number(stats.Dex)/10),BInitiative:Math.floor(Number(stats.I)/10)};
 const expression=String(formula).replace(/\b(?:BIntelligence|BInitiative|BSoc|BDex|BFM|BF|BE|DR|FM|F|E|Int|I|Soc|Ag|Dex|CT|CC|M)\b/g,key=>String(values[key])).replace(/\s/g,'');
 if(!/^[+-]?\d+(?:\.\d+)?(?:[+*/-]\d+(?:\.\d+)?)*$/.test(expression))return NaN;
 const tokens=expression.match(/\d+(?:\.\d+)?|[+*/-]/g);let i=0;
 const product=()=>{let value=Number(tokens[i++]);while(tokens[i]==='*'||tokens[i]==='/'){const op=tokens[i++],right=Number(tokens[i++]);value=op==='*'?value*right:value/right;}return value;};
 let sign=1;if(tokens[0]==='-'||tokens[0]==='+')sign=tokens[i++]==='-'?-1:1;
 let value=sign*product();while(i<tokens.length){const op=tokens[i++];value+=(op==='-'?-1:1)*product();}return Number.isFinite(value)?value:NaN;
}

const fold = str => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export const STANDARD_CARACS = Object.freeze(['CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc', 'M']);

/**
 * Calcule les caractéristiques effectives après application de la règle de non-cumul V5 :
 * Si plusieurs sorts donnent un bonus ou malus à la même caractéristique :
 * - Garder le MEILLEUR bonus (> 0)
 * - Garder le PIRE malus (< 0)
 * - Cumuler les effets marqués comme exception explicite (ex: stackable: true)
 * - Bénédiction de Lileath (D-06) : le rang du LANCEUR, enregistré sur la couche au lancement, autorise autant de sources supplémentaires
 *   parmi les sorts de ce lanceur (voir `bonusTotal`) ; le talent de la cible n'est jamais lu.
 */
export function calculateEffectiveStats(baseStats = {}, spellEffects = []) {
  const result = structuredClone(baseStats || {});
  const activeEffects = (spellEffects || []).filter(e => e && e.statModifiers);

  // Collecter les modificateurs par caractéristique
  const modMap = new Map();

  for (const eff of activeEffects) {
    const isStackable = eff.stackable === true || eff.isStackable === true;
    for (const [stat, rawVal] of Object.entries(eff.statModifiers || {})) {
      const val = Number(rawVal);
      if (!Number.isFinite(val) || val === 0) continue;
      if (!modMap.has(stat)) {
        modMap.set(stat, { bonuses: [], penalties: [], stackables: [] });
      }
      const entry = modMap.get(stat);
      if (isStackable) {
        entry.stackables.push(val);
      } else if (val > 0) {
        entry.bonuses.push(bonusSource(val, eff));
      } else {
        entry.penalties.push(val);
      }
      if (eff.capStatAt100 === true) {
        entry.capAt100 = true;
      }
    }
  }

  // Appliquer le meilleur bonus et le pire malus (+ stackables) pour chaque caractéristique
  for (const [stat, entry] of modMap.entries()) {
    const bestBonus = bonusTotal(entry.bonuses);
    const worstPenalty = entry.penalties.length > 0 ? Math.min(...entry.penalties) : 0;
    const sumStackable = entry.stackables.reduce((acc, v) => acc + v, 0);

    const netChange = bestBonus + worstPenalty + sumStackable;
    const baseVal = Number(baseStats[stat]) || 0;
    let computed = Math.max(0, baseVal + netChange);
    if (entry.capAt100) {
      computed = Math.min(100, computed);
    }
    result[stat] = computed;
  }

  return result;
}

/** Source d'un bonus : valeur, lanceur et rang de Bénédiction de Lileath de ce lanceur au lancement (absent = 0). */
const bonusSource = (value, effect) => ({ value, casterId: effect?.casterId ?? null, rank: Math.max(0, Math.floor(Number(effect?.casterLileathRank) || 0)) });
/**
 * Meilleur bonus seul, plus — pour chaque lanceur de rang r — ses r meilleurs autres bonus (HEPG p. 83, D-06).
 * Le rang d'un lanceur ne profite jamais aux sorts d'un autre.
 */
function bonusTotal(sources) {
  const sorted = [...sources].sort((a, b) => b.value - a.value);
  if (!sorted.length) return 0;
  const taken = new Set([sorted[0]]);
  let total = sorted[0].value;
  const ranks = new Map();
  for (const source of sorted) if (source.casterId != null && source.rank > 0) ranks.set(source.casterId, Math.max(ranks.get(source.casterId) || 0, source.rank));
  for (const [casterId, rank] of ranks) {
    for (const source of sorted.filter(item => item.casterId === casterId && !taken.has(item)).slice(0, rank)) { taken.add(source); total += source.value; }
  }
  return total;
}

const AP_GROUPS = Object.freeze({ all: ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'], arms: ['leftArm', 'rightArm'], legs: ['leftLeg', 'rightLeg'] });
const AP_LOCATION_IDS = Object.freeze(['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg']);

/**
 * Bonus de PA par localisation apportés par les couches magiques, règle de non-cumul V5 (meilleur bonus, pire malus,
 * exceptions explicites cumulées). Les groupes (`all`, `arms`, `legs`) sont développés avant le non-cumul.
 */
function magicApBonuses(spellEffects = []) {
  const activeEffects = (spellEffects || []).filter(e => e && e.apModifiers);
  const locMap = new Map();

  for (const eff of activeEffects) {
    const isStackable = eff.stackable === true || eff.isStackable === true;
    const expanded = {};
    for (const [key, value] of Object.entries(eff.apModifiers || {})) {
      for (const loc of AP_GROUPS[key] ?? [key]) expanded[loc] = Number(expanded[loc] || 0) + Number(value);
    }
    for (const [loc, rawVal] of Object.entries(expanded)) {
      const val = Number(rawVal);
      if (!Number.isFinite(val) || val === 0) continue;
      if (!locMap.has(loc)) {
        locMap.set(loc, { bonuses: [], penalties: [], stackables: [] });
      }
      const entry = locMap.get(loc);
      if (isStackable) {
        entry.stackables.push(val);
      } else if (val > 0) {
        entry.bonuses.push(bonusSource(val, eff));
      } else {
        entry.penalties.push(val);
      }
    }
  }

  const result = {};
  for (const [loc, entry] of locMap.entries()) {
    const bestBonus = bonusTotal(entry.bonuses);
    const worstPenalty = entry.penalties.length > 0 ? Math.min(...entry.penalties) : 0;
    const sumStackable = entry.stackables.reduce((acc, v) => acc + v, 0);
    result[loc] = bestBonus + worstPenalty + sumStackable;
  }
  return result;
}

/**
 * Calcule les PA effectifs apportés par la magie selon la règle de non-cumul.
 */
export function calculateEffectiveMagicAP(baseArmor = {}, spellEffects = [], armorDamage = {}) {
  // Les six localisations sont toujours développées : un groupe `arms`/`legs` de la base ne doit pas laisser un membre à 0.
  const result = normalizeArmorLocations(baseArmor);
  for (const [loc, bonus] of Object.entries(magicApBonuses(spellEffects))) {
    result[loc] = Math.max(0, (Number(result[loc]) || 0) + bonus);
  }

  if (Object.keys(armorDamage).length) {
    const locations = normalizeArmorLocations(result);
    for (const [loc, ap] of Object.entries(locations)) result[loc] = Math.max(0, ap - (armorDamage[loc] || 0));
  }
  // Barrière non cumulative avec l'armure portée : la plus haute des deux valeurs par localisation.
  for (const [loc, floor] of Object.entries(calculateMagicApFloor(spellEffects))) result[loc] = Math.max(Number(result[loc]) || 0, floor);
  return result;
}

/** PA magiques qui ne s'ajoutent pas à l'armure (`apFloor`) : meilleure valeur par localisation, six identifiants canoniques. */
export function calculateMagicApFloor(spellEffects = []) {
  const floor = {};
  for (const e of spellEffects || []) for (const [key, value] of Object.entries(e?.apFloor || {})) {
    for (const loc of AP_GROUPS[key] ?? [key]) if (AP_LOCATION_IDS.includes(loc) && Number(value) > 0) floor[loc] = Math.max(floor[loc] || 0, Number(value));
  }
  return floor;
}

/**
 * PA magiques par localisation (six identifiants canoniques, bonus non nuls seulement), écrits dans
 * `extensions.v5.magicAp`. `locationProtection` les ajoute à l'armure de la fiche (équipement ou `armorLocations`),
 * que la magie ne réécrit jamais.
 */
export function calculateMagicApByLocation(spellEffects = []) {
  const bonuses = magicApBonuses(spellEffects);
  return Object.fromEntries(AP_LOCATION_IDS.filter(loc => bonuses[loc]).map(loc => [loc, bonuses[loc]]));
}

/**
 * Calcule la meilleure Protection (Ward) parmi les sorts actifs.
 * Un seuil plus bas est meilleur (ex: 7+ est meilleur que 9+).
 */
export function calculateEffectiveWard(spellEffects = []) {
  const wards = (spellEffects || [])
    .map(e => Number(e?.ward))
    .filter((w,index) => spellEffects[index]?.ward != null && Number.isFinite(w));

  if (wards.length === 0) return null;
  return Math.min(...wards);
}

/**
 * Calcule les modificateurs de Tests (DR) effectifs apportés par la magie
 * selon la règle de non-cumul V5 (meilleur bonus + pire malus par compétence/catégorie).
 */
export function calculateEffectiveTestModifiers(spellEffects = []) {
  const result = {};
  const activeEffects = (spellEffects || []).filter(e => e && e.testModifiers && typeof e.testModifiers === 'object');
  const modMap = new Map();

  for (const eff of activeEffects) {
    const isStackable = eff.stackable === true || eff.isStackable === true;
    for (const [targetKey, rawVal] of Object.entries(eff.testModifiers || {})) {
      const val = Number(rawVal);
      if (!Number.isFinite(val) || val === 0) continue;
      if (!modMap.has(targetKey)) {
        modMap.set(targetKey, { bonuses: [], penalties: [], stackables: [] });
      }
      const entry = modMap.get(targetKey);
      if (isStackable) {
        entry.stackables.push(val);
      } else if (val > 0) {
        entry.bonuses.push(bonusSource(val, eff));
      } else {
        entry.penalties.push(val);
      }
    }
  }

  for (const [targetKey, entry] of modMap.entries()) {
    const bestBonus = bonusTotal(entry.bonuses);
    const worstPenalty = entry.penalties.length > 0 ? Math.min(...entry.penalties) : 0;
    const sumStackable = entry.stackables.reduce((acc, v) => acc + v, 0);
    const net = bestBonus + worstPenalty + sumStackable;
    if (net !== 0) {
      result[targetKey] = net;
    }
  }

  return result;
}

/** Round courant des effets magiques : hors combat (Round 0), le temps écoulé part du Round 1 où les effets sont posés. */
export const currentMagicRound = combat => Number(combat?.round) || 1;

/** D-11 : 1 Round = 10 secondes, donc 6 Rounds par minute. */
export const ROUNDS_PER_MINUTE = 6;
export const DURATION_UNIT_LABELS = Object.freeze({ rounds: 'Rounds', minutes: 'minutes', hours: 'heures', days: 'jours', weeks:'semaines' });
const UNIT_MINUTES = { minutes: 1, hours: 60, days: 1440, weeks:10080 };
const DURATION_UNIT_WORDS = { round: 'rounds', minute: 'minutes', heure: 'hours', hour: 'hours', jour: 'days', day: 'days', semaine:'weeks',week:'weeks' };

const CARAC_BY_NAME = new Map([
  ['force mentale', 'FM'], ['volonte', 'FM'], ['capacite de combat', 'CC'], ['capacite de tir', 'CT'],
  ['intelligence', 'Int'], ['sociabilite', 'Soc'], ['initiative', 'I'], ['endurance', 'E'],
  ['agilite', 'Ag'], ['dexterite', 'Dex'], ['mouvement', 'M'], ['force', 'F']
]);
const CARAC_ABBR = { fm: 'FM', cc: 'CC', ct: 'CT', f: 'F', e: 'E', i: 'I', ag: 'Ag', dex: 'Dex', int: 'Int', soc: 'Soc', m: 'M' };
const BONUS_ABBR = { bfm: 'FM', bcc: 'CC', bct: 'CT', bf: 'F', be: 'E', bi: 'I', bag: 'Ag', bdex: 'Dex', bint: 'Int', bsoc: 'Soc', bm: 'M' };
const lookupCarac = name => CARAC_BY_NAME.get(name) ?? CARAC_ABBR[name] ?? null;

function readDurationTerm(term) {
  const bonus = term.match(/^bonus\s+(?:de\s+la\s+|de\s+l'|d'|de\s+|du\s+)?(.+)$/);
  if (bonus) { const carac = lookupCarac(bonus[1]); return carac && { carac, bonus: true }; }
  if (BONUS_ABBR[term]) return { carac: BONUS_ABBR[term], bonus: true };
  const carac = lookupCarac(term);
  return carac && { carac, bonus: false };
}

function readCarac(caracs, key) {
  const found = Object.keys(caracs || {}).find(name => name.toLowerCase() === key.toLowerCase());
  const value = Number(caracs?.[found]);
  return found !== undefined && Number.isFinite(value) ? value : null;
}

/**
 * S-04 : lit une durée de sort (« 2 × Bonus de Volonté rounds », « FM minutes », « (Bonus d’Initiative) Rounds »…).
 * Bonus de caractéristique = dizaines ; sans « Bonus », valeur pleine. Les caractéristiques sont celles du lanceur,
 * ou de la cible quand le texte le dit. Rien n’est deviné : `unknown` = donnée à saisir par le MJ.
 * @returns {{kind:'instant'}|{kind:'timed',unit:'rounds'|'minutes'|'hours'|'days',amount:number}|{kind:'unknown',reason:string}}
 */
export function parseSpellDuration(raw, { caster = null, target = null } = {}) {
  const text = fold(String(raw ?? '').replace(/[’`]/g, "'")).replace(/(?<!\d)\.|\.(?!\d)/g, ' ').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text || /^instant/.test(text)) return { kind: 'instant' };
  const unknown = reason => ({ kind: 'unknown', reason });
  if (/\b\d*d\d+\b/.test(text)) return unknown('durée tirée aux dés');
  const words = text.match(/\b(?:rounds?|minutes?|heures?|hours?|jours?|days?|semaines?|weeks?|mois)\b/g) || [];
  const units = [...new Set(words.map(word => DURATION_UNIT_WORDS[word.replace(/s$/, '')] ?? 'other'))];
  if (units.length !== 1 || units[0] === 'other') return unknown(units.length ? 'unités multiples ou non gérées' : 'aucune unité de temps');
  let expression = text.replace(/\b(?:rounds?|minutes?|heures?|hours?|jours?|days?|semaines?|weeks?)\b/g, ' ').replace(/\ben\b/g, ' ').replace(/\+/g, ' ').replace(/\s+/g, ' ').trim();
  const ofTarget = /\bde la cible\b/.test(expression);
  expression = expression.replace(/\bde la cible\b/, ' ').replace(/\s+/g, ' ').trim();
  let factor = 1;
  const product = expression.match(/^(\d+(?:[.,]\d+)?)\s*[x×*]\s*(.+)$/);
  if (product) { factor = Number(product[1].replace(',', '.')); expression = product[2].trim(); }
  if (/^\d+(?:[.,]\d+)?$/.test(expression)) return { kind: 'timed', unit: units[0], amount: factor * Number(expression.replace(',','.')) };
  const term = readDurationTerm(expression);
  if (!term) return unknown('expression non reconnue');
  const score = readCarac((ofTarget ? target : caster)?.caracs, term.carac);
  if (score === null) return unknown(`${term.carac} ${ofTarget ? 'de la cible' : 'du lanceur'} absente`);
  return { kind: 'timed', unit: units[0], amount: factor * (term.bonus ? Math.floor(score / 10) : score) };
}

/**
 * Durée typée d’un effet. Les minutes, heures et jours gardent leur échéance en Rounds (×6) : `expiresAtRound`
 * est l’horloge commune du combat et du temps écoulé (S-02). Une durée non lisible reste `special` (sans échéance).
 */
export function resolveTypedDuration(effectDefinition = {}, subject = {}, options = {}) {
  const appliedAtRound = Number(options.round ?? effectDefinition.appliedAtRound ?? 1);
  const multiplier = Math.max(1, Number(options.overcastDurationMultiplier ?? effectDefinition.overcastDurationMultiplier ?? 1));
  const raw = effectDefinition.duration;
  const inRounds = (rounds, rawDuration) => ({
    durationType: 'rounds',
    durationRounds: rounds,
    expiresAtRound: appliedAtRound + rounds,
    rawDuration
  });

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return inRounds(Math.max(0, Math.round(raw * multiplier)), raw);
  }
  if (Number.isFinite(effectDefinition.durationRounds)) {
    const rounds = Math.max(0, Math.round(Number(effectDefinition.durationRounds) * multiplier));
    return inRounds(rounds, raw ?? `${rounds} Rounds`);
  }

  const dStr = String(raw || '').trim();
  const parsed = parseSpellDuration(dStr, { caster: options.caster ?? subject, target: options.target });
  if (parsed.kind === 'instant') {
    return {
      durationType: 'instant',
      durationRounds: 0,
      expiresAtRound: appliedAtRound,
      rawDuration: dStr || 'Instantané'
    };
  }
  if (parsed.kind === 'unknown') {
    return { durationType: 'special', rawDuration: dStr, unresolvedReason: parsed.reason };
  }

  const value = parsed.amount * multiplier;
  if (parsed.unit === 'rounds') return inRounds(Math.max(1,Math.round(value)), dStr);
  const minutes = Math.max(1,Math.round(value * UNIT_MINUTES[parsed.unit] * ROUNDS_PER_MINUTE))/ROUNDS_PER_MINUTE;
  const roundsEquiv = minutes * ROUNDS_PER_MINUTE;
  return {
    durationType: parsed.unit,
    ...(parsed.unit === 'hours' ? { durationHours: value } : {}),
    ...(parsed.unit === 'days' ? { durationDays: value, durationHours: value * 24 } : {}),
    durationMinutes: minutes,
    remainingMinutes: minutes,
    durationRounds: roundsEquiv,
    expiresAtRound: appliedAtRound + roundsEquiv,
    rawDuration: dStr
  };
}

/** Mouvement connu du participant (M, Mouvement de fiche) ; `null` si absent : jamais de valeur par défaut inventée. */
export function knownMovement(participant) {
  for (const value of [participant?.caracs?.M, participant?.M, participant?.movement]) {
    if (value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

const hasArmorDamage = v5 => Object.keys(v5?.armorDamage || {}).length > 0;

/**
 * Armure physique portée, lue comme `locationProtection` : l'équipement quand il y en a (alors `armor`, déjà calculé),
 * sinon `armorLocations` ; `armor` n'est que le repli (il vaut des zéros tant que seul `armorLocations` est renseigné).
 */
function physicalArmor(next) {
  const equipped = Array.isArray(next.equipment) && next.equipment.some(item => item.kind === 'armour' || item.kind === 'shield');
  return equipped ? next.armor : (next.armorLocations ?? next.armor);
}

/**
 * S-05 : base du personnage (extensions.v5.baseCaracs / baseArmor, copie à plat sur le participant).
 * Aucune couche active (ni Forme bestiale) : la fiche courante EST la base, une base conservée serait périmée.
 * Avec des couches, la base est tenue à jour par rebaseMagicLayers (synchronisation, modification MJ).
 */
function captureLayerBase(next) {
  const v5 = next.extensions.v5;
  const layered = (v5.spellEffects || []).length > 0 || (v5.divineEffects || []).length > 0 || Boolean(v5.beastForm);
  if (!layered || !(v5.baseCaracs || next.baseCaracs)) {
    if (next.caracs) v5.baseCaracs = structuredClone(next.caracs);
  } else {
    v5.baseCaracs = structuredClone(v5.baseCaracs || next.baseCaracs);
  }
  if (v5.baseCaracs) next.baseCaracs = structuredClone(v5.baseCaracs);
  // Une armure physique détruite (Arcanes) garde sa base propre, calculée sur l'équipement porté.
  if (!(v5.baseArmor || next.baseArmor) || (!layered && !hasArmorDamage(v5))) {
    const physical = physicalArmor(next);
    if (physical) v5.baseArmor = structuredClone(physical);
  } else {
    v5.baseArmor = structuredClone(v5.baseArmor || next.baseArmor);
  }
  if (v5.baseArmor) next.baseArmor = structuredClone(v5.baseArmor);
}

/**
 * Valeurs effectives = base + couches actives, jamais une écriture directe : caractéristiques (Mouvement compris,
 * recopié dans `M` et `movement`), armure, Protection et modificateurs de Tests. Les compétences importées ne sont
 * pas stockées : effectiveSkillScore y ajoute l'écart effectif − base, une seule fois.
 */
function recomputeLayerValues(next, effects) {
  effects = (Array.isArray(effects) ? effects : []).filter(e => e && typeof e === 'object' && !Array.isArray(e));
  const hadSuppression=effects.some(e=>e.suppressedEffectIds?.length) || next.extensions.v5.suppressedEffectIds?.length;
  next.extensions.v5.suppressedEffectIds=effects.flatMap(e=>e.suppressedEffectIds || []).filter(id => typeof id === 'string' && id);
  effects=[...unsuppressedSpellEffects(effects),...(next.extensions.v5.divineEffects || [])];
  const v5 = next.extensions.v5;
  const baseCaracs = v5.baseCaracs || next.baseCaracs;
  if (baseCaracs) {
    const movement = knownMovement(next);
    if (!Number.isFinite(Number(baseCaracs.M)) && movement !== null) baseCaracs.M = movement;
    next.caracs = calculateEffectiveStats(baseCaracs, effects);
    // Mouvement inconnu : rien n'est écrit (l'aperçu des sorts qui le modifient est bloqué en amont).
    if (!Number.isFinite(Number(baseCaracs.M))) delete next.caracs.M;
    if (Number.isFinite(Number(baseCaracs.M))) { next.M = next.caracs.M; next.movement = next.caracs.M; }
  }
  const baseArmor = v5.baseArmor || next.baseArmor;
  if (baseArmor) next.armor = calculateEffectiveMagicAP(baseArmor, effects, v5.armorDamage);
  const magicAp = calculateMagicApByLocation(effects);
  if (Object.keys(magicAp).length) v5.magicAp = magicAp; else delete v5.magicAp;
  const effectiveWard = calculateEffectiveWard(effects);
  if (effectiveWard !== null) v5.ward = effectiveWard; else delete v5.ward;
  // S-06 : couches typées (seuil + filtre) lues par le combat ; `ward` et `damageReduction` restent les valeurs plates historiques.
  const typed = {
    wards: effects.filter(e => e?.ward != null && Number.isFinite(Number(e.ward))).map(e => ({ effectId: e.id, spellName: e.spellName, threshold: Number(e.ward), filter: e.wardFilter || null, ...(e.casterId != null ? { casterId: e.casterId } : {}), ...(Number(e.casterLileathRank) > 0 ? { lileathRank: Math.floor(Number(e.casterLileathRank)) } : {}) })),
    damageReductions: effects.filter(e => Number(e?.damageReduction) > 0).map(e => ({ effectId: e.id, spellName: e.spellName, amount: Number(e.damageReduction), filter: e.damageReductionFilter || null, ...(e.damageReductionCalmTest ? { calmTest: true } : {}) })),
    conditionalAp: effects.filter(e => Number(e?.conditionalAp?.ap) > 0).map(e => ({ effectId: e.id, spellName: e.spellName, ap: Number(e.conditionalAp.ap), filter: e.conditionalAp.filter || null })),
    reflects: effects.filter(e => e?.reflect).map(e => ({ effectId: e.id, spellName: e.spellName, filter: e.reflect.filter || null, summary: e.reflect.summary })),
    magicApFloor: calculateMagicApFloor(effects)
  };
  for (const [key, value] of Object.entries(typed)) if (Array.isArray(value) ? value.length : Object.keys(value).length) v5[key] = value; else delete v5[key];
  const immunities = { damage: effects.flatMap(e => e?.immunities?.damage || []), conditions: effects.flatMap(e => e?.immunities?.conditions || []) };
  if (immunities.damage.length || immunities.conditions.length) v5.immunities = immunities; else delete v5.immunities;
  const effectiveTestModifiers = calculateEffectiveTestModifiers(effects);
  v5.testModifiers = effectiveTestModifiers;
  next.testModifiers = effectiveTestModifiers;
  v5.suppressedSpellIds=[...new Set(effects.flatMap(e=>e.specialState?.suppressedSpellIds || []))];
  v5.specialStates=Object.assign({},...effects.map(e=>e.specialState || {}));
  if(hadSuppression){
    if(Array.isArray(v5.baseTraits))next.traits=[...new Set([...v5.baseTraits,...effects.flatMap(e=>e.traits || []),...(v5.miscastEffects || []).flatMap(e=>e?.traitsGained || [])])].filter(t => typeof t === 'string' && t);
    v5.weaponBonuses=effects.filter(e=>e.weaponBonus).map(e=>({effectId:e.id,...e.weaponBonus}));
    v5.magicShieldBonusSl=Math.max(0,...effects.map(e=>Number(e.magicShieldBonusSl)||0));
    v5.damageCapToSlOnly=effects.some(e=>e.damageCapToSlOnly);
  }
  projectDivineGear(next);
  return { effectiveWard, effectiveTestModifiers };
}
/** Impasse conserve la couche d'origine et son horloge ; seules ses valeurs sont momentanément inactives. */
export function unsuppressedSpellEffects(effects=[]){const list=(Array.isArray(effects)?effects:[]).filter(e=>e&&typeof e==='object'&&!Array.isArray(e));const ids=new Set(list.flatMap(e=>e.suppressedEffectIds || []));return list.filter(e=>!ids.has(e.id));}

/**
 * S-05 : nouvelle base réelle (fiche synchronisée, modification MJ des caractéristiques ou de l'armure).
 * `caracs` est fusionné dans la base, `movement` devient M de base, `armor` remplace la base d'armure.
 * Avec des couches actives, les valeurs effectives sont recalculées ; sans couche, la valeur est simplement posée.
 * Sous Forme bestiale, seul le profil d'origine change (retour de transformation).
 */
export function rebaseMagicLayers(participant, { caracs, armor, movement } = {}) {
  const next = structuredClone(participant);
  const v5 = next.extensions?.v5;
  const patch = { ...(caracs || {}) };
  if (Number.isFinite(Number(movement))) patch.M = Number(movement);
  const beast = v5?.beastForm;
  if (beast) {
    if (beast.originalBaseCaracs) beast.originalBaseCaracs = { ...beast.originalBaseCaracs, ...patch };
    if (beast.originalParticipant?.caracs) beast.originalParticipant.caracs = { ...beast.originalParticipant.caracs, ...patch };
    return next;
  }
  const effects = v5?.spellEffects || [];
  const base = v5?.baseCaracs || next.baseCaracs;
  const layered = effects.length > 0 || (v5?.divineEffects || []).length > 0;
  if (!layered || !base) {
    if (Object.keys(patch).length) next.caracs = { ...next.caracs, ...patch };
    if (armor) next.armor = structuredClone(armor);
    if (v5?.baseCaracs) { v5.baseCaracs = structuredClone(next.caracs); next.baseCaracs = structuredClone(next.caracs); }
    if (v5?.baseArmor && !hasArmorDamage(v5)) { v5.baseArmor = structuredClone(next.armor); next.baseArmor = structuredClone(next.armor); }
    return next;
  }
  v5.baseCaracs = { ...base, ...patch };
  if (armor) v5.baseArmor = structuredClone(armor);
  captureLayerBase(next);
  recomputeLayerValues(next, effects);
  return next;
}

/**
 * Bouclier de Saphery (HEPG p. 88) : chaque autre sort de Haute Magie lancé par le même lanceur améliore de 1 la Protection de ses couches
 * actives (`saphery.improved` cumule ces sorts et les paliers de surpuissance ; un seuil ≤ 1 réussit automatiquement).
 * Renvoie le participant mis à jour, ou null si aucune couche de ce lanceur n'est concernée.
 */
export function refreshEffectLayers(participant, previous = null) {
  const next=structuredClone(participant); next.extensions??={};next.extensions.v5??={};
  const old=previous?.extensions?.v5;
  const hadLayers=(old?.spellEffects||[]).length || (old?.divineEffects||[]).length || old?.beastForm;
  if(previous && !hadLayers){
    if(previous.caracs)next.extensions.v5.baseCaracs=structuredClone(previous.caracs);
    const armor=physicalArmor(previous);if(armor)next.extensions.v5.baseArmor=structuredClone(armor);
  }
  if(!next.extensions.v5.baseCaracs && next.caracs)next.extensions.v5.baseCaracs=structuredClone(next.caracs);
  if(!next.extensions.v5.baseArmor){const armor=physicalArmor(next);if(armor)next.extensions.v5.baseArmor=structuredClone(armor);}
  if(next.extensions.v5.baseCaracs)next.baseCaracs=structuredClone(next.extensions.v5.baseCaracs);
  if(next.extensions.v5.baseArmor)next.baseArmor=structuredClone(next.extensions.v5.baseArmor);
  recomputeLayerValues(next,next.extensions.v5.spellEffects || []);
  return next;
}

export function improveSapheryWards(participant, { casterId, exceptExecutionId = null } = {}) {
  const concerned = effect => effect?.saphery && effect.casterId === casterId && effect.castExecutionId !== exceptExecutionId;
  if (!(participant?.extensions?.v5?.spellEffects || []).some(concerned)) return null;
  const next = structuredClone(participant);
  for (const effect of next.extensions.v5.spellEffects) if (concerned(effect)) {
    effect.saphery.baseWard ??= effect.ward + effect.saphery.improved;
    effect.saphery.improved += 1;
    effect.ward = calculateSapheryWard(effect.saphery.improved, effect.saphery.baseWard ?? effect.ward + effect.saphery.improved).threshold;
  }
  return rebaseMagicLayers(next);
}

/**
 * Applique des effets magiques temporaires sur un participant (fonction pure).
 * Ne modifie JAMAIS la fiche source originale.
 */
export function applySpellEffects(participant, effectDefinition, options = {}) {
  if (!participant || typeof participant !== 'object') {
    throw new TypeError('Participant invalide pour applySpellEffects');
  }
  if (!effectDefinition || typeof effectDefinition !== 'object') {
    throw new TypeError('Définition d’effet invalide');
  }

  const next = structuredClone(participant);
  next.extensions = next.extensions || {};
  next.extensions.v5 = next.extensions.v5 || {};

  captureLayerBase(next);

  const existingEffects = next.extensions.v5.spellEffects || [];

  const effectId = effectDefinition.id || `spell-effect-${Date.now()}-${uid()}`;
  const appliedAtRound = options.round ?? next.extensions.v5.currentRound ?? 1;
  const typedDuration = resolveTypedDuration(effectDefinition, options.caster || next, {
    ...options,
    target: next,
    round: appliedAtRound
  });

  const newEffect = {
    ...structuredClone(effectDefinition),
    id: effectId,
    appliedAtRound,
    appliedAtTurn: options.turn ?? next.extensions.v5.currentTurn ?? 1,
    durationType: typedDuration.durationType,
    durationRounds: typedDuration.durationRounds,
    durationMinutes: typedDuration.durationMinutes,
    remainingMinutes: typedDuration.remainingMinutes,
    expiresAtRound: typedDuration.expiresAtRound,
    rawDuration: typedDuration.rawDuration
  };
  // D-06 : provenance de la couche, le rang de Bénédiction de Lileath se lit sur le lanceur au moment du lancement.
  const author = options.caster || (effectDefinition.casterId && effectDefinition.casterId === next.id ? next : null);
  if (author) {
    newEffect.casterId ??= author.id;
    newEffect.casterLileathRank = magicTalentRank(author, 'lileath-s-blessing');
  }

  const updatedSpellEffects = [...existingEffects, newEffect];
  next.extensions.v5.spellEffects = updatedSpellEffects;

  // 1-4. Caractéristiques (dont M), armure, Protection et Tests : toujours base + couches actives
  const { effectiveWard, effectiveTestModifiers } = recomputeLayerValues(next, updatedSpellEffects);

  // 5. Appliquer les États (Conditions) si présents
  if (Array.isArray(effectDefinition.conditions) && effectDefinition.conditions.length > 0) {
    const conditionReceipt = acquireV5Conditions(next, effectDefinition.conditions, {
      ...options,
      participantId: next.id,
      round: appliedAtRound
    });
    Object.assign(next, conditionReceipt.participant);
    if (effectDefinition.lockConditions || effectDefinition.expireConditions) {
      const oldIds = new Set((participant.states || []).map(s => s.id));
      next.states = next.states.map(s => oldIds.has(s.id) ? s : { ...s, spellEffectId: effectId, removeOnSpellExpiry: effectDefinition.lockConditions !== 'until-recovery', recoveryDuringSpell:!effectDefinition.lockConditions,recoveryStat: effectDefinition.specialState?.recoveryStat, ...(effectDefinition.lockConditions?{v5Recovery: { kind: 'spell' }}:{}) });
    }
  }

  // 6. Traits et Talents temporaires
  if (!next.extensions.v5.baseTraits) {
    next.extensions.v5.baseTraits = Array.isArray(next.traits)
      ? [...next.traits]
      : (Array.isArray(next.extensions?.traits) ? [...next.extensions.traits] : []);
  }
  if (Array.isArray(effectDefinition.traits) && effectDefinition.traits.length > 0) {
    next.extensions.v5.temporaryTraits = [
      ...(next.extensions.v5.temporaryTraits || []),
      ...effectDefinition.traits
    ];
    next.traits = Array.from(new Set([
      ...(next.extensions.v5.baseTraits || []),
      ...next.extensions.v5.temporaryTraits
    ]));
  }

  // 7. Réduction de dégâts et malus aux tirs adverses
  if (Number.isFinite(Number(effectDefinition.damageReduction)) && Number(effectDefinition.damageReduction) > 0) {
    next.extensions.v5.damageReduction = Math.max(
      Number(next.extensions.v5.damageReduction) || 0,
      Number(effectDefinition.damageReduction)
    );
  }
  if (Number.isFinite(Number(effectDefinition.rangedOpponentPenaltySl)) && Number(effectDefinition.rangedOpponentPenaltySl) !== 0) {
    next.extensions.v5.rangedOpponentPenaltySl = Math.min(
      Number(next.extensions.v5.rangedOpponentPenaltySl) || 0,
      Number(effectDefinition.rangedOpponentPenaltySl)
    );
  }

  // 8. Points de Chance et de Destin temporaires (Signes d'Amul, Attribut des Cieux) : portés par la couche seule.
  // Le registre V5 les combine au solde permanent (v5-resources.js) ; aucune écriture dans fortune/fate/chance.
  if (Number.isFinite(Number(effectDefinition.tempFortunePoints)) && Number(effectDefinition.tempFortunePoints) > 0) {
    newEffect.remainingTempFortune = Number(effectDefinition.tempFortunePoints);
  }
  if (Number.isFinite(Number(effectDefinition.tempFatePoints)) && Number(effectDefinition.tempFatePoints) > 0) {
    newEffect.remainingTempFate = Number(effectDefinition.tempFatePoints);
  }

  // 9. Retrait d'États / Psychologie (ex: Calme, Le Bœuf Reste Debout)
  if (Array.isArray(effectDefinition.removeConditions) && effectDefinition.removeConditions.length > 0 && Array.isArray(next.states)) {
    const toRemoveNorm = effectDefinition.removeConditions.map(c =>
      String(c).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
    );
    next.states = next.states.filter(st => {
      const idNorm = String(st?.id || st?.key || st?.name || st || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const labelNorm = String(st?.label || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      return !toRemoveNorm.some(rem => idNorm === rem || labelNorm === rem || idNorm.includes(rem) || labelNorm.includes(rem));
    });
  }
  if (Number.isFinite(Number(effectDefinition.removeBrokenCount)) && Number(effectDefinition.removeBrokenCount) > 0 && Array.isArray(next.states)) {
    let remainingToRemove = Number(effectDefinition.removeBrokenCount);
    next.states = next.states.map(st => {
      if (remainingToRemove <= 0) return st;
      const idNorm = String(st?.id || st?.key || st?.name || st?.label || st || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (idNorm.includes('brise') || idNorm.includes('broken')) {
        if (typeof st === 'object' && st !== null) {
          const currentCount = Math.max(1, Number(st.level ?? st.count ?? st.value ?? 1) || 1);
          const removed = Math.min(currentCount, remainingToRemove);
          remainingToRemove -= removed;
          const nextCount = currentCount - removed;
          if (nextCount <= 0) return null;
          const updatedState = { ...st };
          if ('level' in updatedState || (!('count' in updatedState) && !('value' in updatedState))) {
            updatedState.level = nextCount;
          }
          if ('count' in updatedState) updatedState.count = nextCount;
          if ('value' in updatedState) updatedState.value = nextCount;
          return updatedState;
        }
        remainingToRemove -= 1;
        return null;
      }
      return st;
    }).filter(Boolean);
  }

  // Niveaux d'états retirés (ex. Bonne santé : 1 Exténué et 1 Sonné, sans effacer les autres niveaux).
  if (effectDefinition.removeConditionLevels && typeof effectDefinition.removeConditionLevels === 'object' && Array.isArray(next.states)) {
    for (const [name, amount] of Object.entries(effectDefinition.removeConditionLevels)) {
      let left = Math.max(0, Number(amount) || 0);
      next.states = next.states.map(st => {
        if (left <= 0 || typeof st !== 'object' || st === null || fold(st.key || st.name || st.label) !== fold(name)) return st;
        const count = Math.max(1, Number(st.level ?? 1) || 1), removed = Math.min(count, left);
        left -= removed;
        return count - removed <= 0 ? null : { ...st, level: count - removed };
      }).filter(Boolean);
    }
  }

  // 10. Bonus d'armes, Bouclier magique, Actions supplémentaires, État spécial
  if (effectDefinition.weaponBonus && typeof effectDefinition.weaponBonus === 'object') {
    next.extensions.v5.weaponBonuses = [
      ...(next.extensions.v5.weaponBonuses || []),
      { effectId, ...structuredClone(effectDefinition.weaponBonus) }
    ];
  }
  if (Number.isFinite(Number(effectDefinition.magicShieldBonusSl)) && Number(effectDefinition.magicShieldBonusSl) > 0) {
    next.extensions.v5.magicShieldBonusSl = Math.max(
      Number(next.extensions.v5.magicShieldBonusSl) || 0,
      Number(effectDefinition.magicShieldBonusSl)
    );
  }
  if (effectDefinition.damageCapToSlOnly) {
    next.extensions.v5.damageCapToSlOnly = true;
  }
  if (effectDefinition.specialState && typeof effectDefinition.specialState === 'object') {
    next.extensions.v5.specialStates = {
      ...(next.extensions.v5.specialStates || {}),
      ...structuredClone(effectDefinition.specialState)
    };
  }
  if(effectDefinition.grantedActions?.some(action=>action.extensions?.v5?.materialized)){
    next.actions=[...(next.actions || []),...effectDefinition.grantedActions.filter(action=>action.extensions?.v5?.materialized).map(action=>({...structuredClone(action),extensions:{...action.extensions,v5:{...action.extensions?.v5,spellEffectId:effectId}}}))];
  }
  if(updatedSpellEffects.some(e=>e.suppressedEffectIds?.length))recomputeLayerValues(next,updatedSpellEffects);

  return {
    status: 'applied',
    participant: next,
    appliedEffect: newEffect,
    effectiveCaracs: next.caracs,
    effectiveWard,
    effectiveTestModifiers
  };
}

/**
 * Retour de Forme bestiale, chemin unique (durée écoulée, Tour, retour manuel) : profil d'origine rétabli, effet marqueur
 * retiré, couches restantes recalculées sur la base d'origine (un buff expiré pendant la forme ne revient pas).
 */
export function endBeastForm(participant) {
  const reverted = revertBeastForm(participant);
  const next = reverted.participant;
  const remaining = (next.extensions.v5.spellEffects || []).filter(e => !e.beastFormMarker);
  if (next.extensions.v5.spellEffects) next.extensions.v5.spellEffects = remaining;
  recomputeLayerValues(next, remaining);
  return { ...reverted, participant: next };
}

/**
 * Retire les effets d'un sort expirant (fonction pure).
 * RÈGLE D'EXPIRATION :
 * - Retire UNIQUEMENT les couches temporaires créées par le sort.
 * - Ne restaure PAS un vieux snapshot et ne guérit pas les dégâts subis entre-temps !
 */
export function expireSpellEffects(participant, filter = {}) {
  if (!participant || typeof participant !== 'object') {
    throw new TypeError('Participant invalide pour expireSpellEffects');
  }

  let next = structuredClone(participant);
  const effects = next.extensions?.v5?.spellEffects || [];
  if (effects.length === 0) {
    return { status: 'unchanged', participant: next, removedEffects: [] };
  }

  const removedEffects = [];
  const remainingEffects = [];

  for (const eff of effects) {
    let match = true;
    if (filter.spellId && eff.spellId !== filter.spellId) match = false;
    if (filter.effectId && eff.id !== filter.effectId) match = false;
    if (filter.casterId && eff.casterId !== filter.casterId) match = false;

    // Filtre d'expiration par durée / round
    if (filter.currentRound !== undefined) {
      const currentRound = Number(filter.currentRound);
      const appliedAt = Number(eff.appliedAtRound ?? 1);
      let expiresAt = eff.expiresAtRound;

      if (expiresAt === undefined) {
        if (Number.isFinite(eff.durationRounds)) {
          expiresAt = appliedAt + Number(eff.durationRounds);
        } else if (typeof eff.duration === 'number' && Number.isFinite(eff.duration)) {
          expiresAt = appliedAt + eff.duration;
        } else if (eff.duration) {
          const resolved = resolveTypedDuration(eff, next, { round: appliedAt });
          expiresAt = resolved.expiresAtRound;
        }
      }

      if (expiresAt !== undefined) {
        // D-12 : avec un Tour terminé connu, un effet en Rounds court jusqu'à la fin du Tour de son auteur
        // (Round d'échéance atteint) ; auteur absent du combat ou inconnu → échéance de Round.
        const ended = filter.endedTurn;
        const authorPresent = ended && eff.casterId && (ended.presentIds || []).includes(eff.casterId);
        const expired = authorPresent
          ? (Number(ended.round) >= expiresAt && ended.actorId === eff.casterId) || currentRound > expiresAt
          : currentRound >= expiresAt;
        if (!expired) match = false;
        // Minutes, heures et jours : le temps restant suit l'horloge de Rounds (6 Rounds = 1 minute).
        if (Number.isFinite(eff.remainingMinutes)) {
          eff.remainingMinutes = Math.max(0, Math.round((expiresAt - currentRound) / ROUNDS_PER_MINUTE * 100) / 100);
        }
      } else {
        match = false;
      }
    }

    // Filtre d'expiration par temps écoulé (S-02) : 1 minute = 6 Rounds. L'échéance en Rounds recule du temps écoulé
    // (`referenceRound` = Round courant du combat) et le temps restant en minutes diminue ; un effet en Rounds expire
    // donc aussi hors combat.
    if (match && (filter.advanceMinutes !== undefined || filter.elapsedMinutes !== undefined)) {
      const elapsed = Number(filter.advanceMinutes ?? filter.elapsedMinutes ?? 0);
      if (Number.isFinite(eff.expiresAtRound)) eff.expiresAtRound -= elapsed * ROUNDS_PER_MINUTE;
      if (Number.isFinite(eff.remainingMinutes)) {
        eff.remainingMinutes = Math.max(0, eff.remainingMinutes - elapsed);
        if (eff.remainingMinutes > 0) match = false;
      } else if (Number.isFinite(eff.expiresAtRound)) {
        if (eff.expiresAtRound > Number(filter.referenceRound ?? eff.appliedAtRound ?? 1)) match = false;
      } else if (Number.isFinite(eff.durationMinutes)) {
        if (elapsed < eff.durationMinutes) match = false;
      } else {
        match = false;
      }
    }

    if (match) {
      removedEffects.push(eff);
    } else {
      remainingEffects.push(eff);
    }
  }

  // Une pénalité périodique attachée au parent disparaît avec lui (fin déclarée ou dissipation comprise).
  for(let i=remainingEffects.length-1;i>=0;i--)if(remainingEffects[i].parentEffectId && removedEffects.some(e=>e.id===remainingEffects[i].parentEffectId))removedEffects.push(...remainingEffects.splice(i,1));
  if(next.extensions.v5.beastForm && removedEffects.some(e=>e.beastFormMarker))next=revertBeastForm(next).participant;
  // Apothéose (+10 DR, HEPG p. 86) : la cible relevée meurt au terme du sort ou s'il est dissipé, et ne peut plus être ramenée.
  if(removedEffects.some(e=>e.dieOnExpiry)){next.hp=0;next.dead=true;next.extensions.v5={...next.extensions.v5,dead:true,cannotBeRevived:true};}
  if(removedEffects.some(e=>e.corpseOnExpiry)){next.hp=0;next.dead=true;next.extensions.v5.dead=true;}
  next.extensions.v5.spellEffects = remainingEffects;

  // Valeurs effectives = base + couches restantes (caractéristiques, M, armure, Protection, Tests)
  const { effectiveTestModifiers } = recomputeLayerValues(next, remainingEffects);

  // Retirer les traits et talents temporaires associés aux effets retirés
  if (next.extensions.v5.temporaryTraits) {
    const traitsToRemove = new Set(removedEffects.flatMap(e => e.traits || []));
    next.extensions.v5.temporaryTraits = Array.from(new Set([...next.extensions.v5.temporaryTraits.filter(t => !traitsToRemove.has(t)),...remainingEffects.flatMap(e=>e.traits || []),...(next.extensions.v5.miscastEffects || []).flatMap(e=>e.traitsGained || [])]));
    if (Array.isArray(next.extensions.v5.baseTraits)) {
      next.traits = Array.from(new Set([
        ...next.extensions.v5.baseTraits,
        ...next.extensions.v5.temporaryTraits
      ]));
    }
  }

  next.states = (next.states || []).flatMap(s => {
    if (!removedEffects.some(e=>e.id===s.spellEffectId)) return [s];
    if (s.removeOnSpellExpiry !== false) return [];
    const {spellEffectId,v5Recovery,...kept}=s; return [kept];
  });
  const acquiredOnExpiry=removedEffects.flatMap(e=>e.conditionsOnExpiry || []);
  if(acquiredOnExpiry.length)Object.assign(next,acquireV5Conditions(next,acquiredOnExpiry,{round:filter.currentRound ?? 1}).participant);

  // Recalculer damageReduction et rangedOpponentPenaltySl
  const activeDrs = remainingEffects.map(e => Number(e.damageReduction)).filter(v => Number.isFinite(v) && v > 0);
  if (activeDrs.length > 0) {
    next.extensions.v5.damageReduction = Math.max(...activeDrs);
  } else {
    delete next.extensions.v5.damageReduction;
  }
  const activeRangedPenalties = remainingEffects.map(e => Number(e.rangedOpponentPenaltySl)).filter(v => Number.isFinite(v) && v !== 0);
  if (activeRangedPenalties.length > 0) {
    next.extensions.v5.rangedOpponentPenaltySl = Math.min(...activeRangedPenalties);
  } else {
    delete next.extensions.v5.rangedOpponentPenaltySl;
  }

  // Chance et Destin temporaires non consommés : ils partent avec la couche retirée (registre V5, v5-resources.js).

  // Recalculer weaponBonuses, magicShieldBonusSl, damageCapToSlOnly, specialStates
  const removedEffectIds = new Set(removedEffects.map(e => e.id));
  if(Array.isArray(next.actions))next.actions=next.actions.filter(action=>!removedEffectIds.has(action.extensions?.v5?.spellEffectId));
  if (Array.isArray(next.extensions.v5.weaponBonuses)) {
    next.extensions.v5.weaponBonuses = next.extensions.v5.weaponBonuses.filter(wb => !removedEffectIds.has(wb.effectId));
    if (next.extensions.v5.weaponBonuses.length === 0) delete next.extensions.v5.weaponBonuses;
  }
  const activeShields = remainingEffects.map(e => Number(e.magicShieldBonusSl)).filter(v => Number.isFinite(v) && v > 0);
  if (activeShields.length > 0) {
    next.extensions.v5.magicShieldBonusSl = Math.max(...activeShields);
  } else {
    delete next.extensions.v5.magicShieldBonusSl;
  }
  if (remainingEffects.some(e => e.damageCapToSlOnly)) {
    next.extensions.v5.damageCapToSlOnly = true;
  } else {
    delete next.extensions.v5.damageCapToSlOnly;
  }
  if (next.extensions.v5.specialStates) {
    const nextSpecialStates = {};
    for (const eff of remainingEffects) {
      if (eff.specialState && typeof eff.specialState === 'object') {
        Object.assign(nextSpecialStates, eff.specialState);
      }
    }
    if (Object.keys(nextSpecialStates).length > 0) {
      next.extensions.v5.specialStates = nextSpecialStates;
    } else {
      delete next.extensions.v5.specialStates;
    }
  }

  if(remainingEffects.some(e=>e.suppressedEffectIds?.length))recomputeLayerValues(next,remainingEffects);
  return {
    status: 'expired',
    participant: next,
    removedEffects,
    remainingEffectsCount: remainingEffects.length,
    effectiveTestModifiers
  };
}

/**
 * Détermine la localisation et le PA d'une cible pour un coup magique.
 */
export function resolveHitLocationAndAP(target, reversedRoll, options = {}) {
  const loc = getLocationName(reversedRoll);
  const locKey = loc.key; // 'HEAD', 'ARM', 'BODY', 'LEG'

  const hitLocId = locKey === 'HEAD' ? 'head' : locKey === 'BODY' ? 'body'
    : locKey === 'ARM' ? (loc.name.includes('Gauche') ? 'leftArm' : 'rightArm')
    : (loc.name.includes('Gauche') ? 'leftLeg' : 'rightLeg');
  // Même lecture que les attaques d'armes (équipement ou armorLocations, PA détruits, PA magiques par localisation).
  // Un PA à arbitrer (qualité d'armure conditionnelle) retombe sur l'armure effective du participant.
  let ap = locationProtection(target, { location: hitLocId, hitLocationRoll: reversedRoll }).ap
    ?? normalizeArmorLocations(target?.armor || {})[hitLocId];

  // PA d'armure de métal de la localisation touchée (V5 p. 252) : ignorés par Cieux et Métal, ajoutés aux dégâts par Métal.
  const metalAp = metalApOnLocation(target, hitLocId, options.ignoreMetalAp === true);
  if (options.ignoreNonMagicalAp === true) {
    // Attribut des Ombres (V5 p. 254) : seuls les PA magiques comptent.
    ap = Math.max(Number(target?.extensions?.v5?.magicAp?.[hitLocId]) || 0, Number(target?.extensions?.v5?.magicApFloor?.[hitLocId]) || 0);
  } else if (options.ignoreMetalAp === true) {
    ap = Math.max(0, ap - metalAp);
  }

  return {
    location: loc.name,
    locationKey: locKey,
    locationId: hitLocId,
    ap,
    metalAp
  };
}

/** PA des pièces d'armure de métal qui protègent une localisation (identifiant canonique : head, body, leftArm…). */
function metalApOnLocation(target, hitLocId, strict = true) {
  const pieces = wornArmourPieces(target, hitLocId);
  const unknown = pieces.filter(item => armorMaterial(item) === 'unknown');
  if (strict && unknown.length) throw new Error(`Matériau inconnu pour ${unknown.map(item => item.name || item.id).join(', ')} : précisez s'il s'agit de métal (champ « material » de la pièce) avant de résoudre un sort de Cieux ou de Métal.`);
  const metalAp = pieces.filter(item => armorMaterial(item) === 'metal').reduce((sum, item) => sum + (Number(item.ap) || 0), 0);
  // Les PA détruits (Arcane Impitoyable…) ne comptent plus : le métal ne dépasse pas la protection restante de la localisation.
  const remaining = Math.max(0, pieces.reduce((sum, item) => sum + (Number(item.ap) || 0), 0) - (Number(target?.extensions?.v5?.armorDamage?.[hitLocId]) || 0));
  return Math.min(metalAp, remaining);
}

/** Jet de localisation : jamais de repli silencieux sur 1, le jet vient du Test saisi. */
function requireLocationRoll(roll, required = true) {
  const value = Number(roll);
  if (Number.isInteger(value) && value >= 1 && value <= 100) return value;
  if (!required) return 1;
  throw new Error('Jet de localisation requis (1 à 100) pour résoudre ce sort');
}

/**
 * Résolution des Projectiles Magiques V5 (Magic Missiles).
 * RÈGLES V5 OBLIGATOIRES :
 * - Dégâts = BFM (lanceur) + dégâts indiqués par le sort (+ éventuelle surpuissance dégâts).
 * - Les DR du test de lancer ne s'ajoutent PAS automatiquement aux projectiles !
 * - Localisation inversée du jet d'incantation.
 * - Réductions par BE et PA (sauf si mention contraire).
 * - Plancher minimum = 1 (sauf inoffensive).
 */
export function resolveMagicMissile({
  caster,
  target,
  spell = {},
  roll,
  castingSl = 0,
  overcastDamage = 0,
  ignoreMetalAp = false,
  ignoreNonMagicalAp = false,
  metalDamageBonus = false,
  ignoreNaturalArmor = false,
    naturalArmorAp = 0,
  ignoreAp = false,
  ignoreBe = false,
  extraDamage = 0,
  isContact = false,
  contactOpposed = null,
  options = {}
} = {}) {
  if (!caster || !target) {
    throw new TypeError('Lanceur et cible requis pour resolveMagicMissile');
  }

  const bfm = Math.floor((Number(caster.caracs?.FM) || 0) / 10);
  const spellDamage = Number(spell.damage) || 0;
  const overcast = Number(overcastDamage) || 0;
  const extra = Number(extraDamage) || 0;

  // Localisation : jet inversé
  let effectiveRoll = requireLocationRoll(roll, !(isContact && contactOpposed?.roll));
  if (isContact && contactOpposed?.roll) {
    effectiveRoll = Number(contactOpposed.roll);
  }
  const reversedRoll = reverseV5Roll(effectiveRoll);
  const chosenRoll = { HEAD: 1, ARM: 20, BODY: 60, LEG: 90, RIGHTARM:20,LEFTARM:35,RIGHTLEG:85,LEFTLEG:95 }[spell.location];
  const hitLoc = resolveHitLocationAndAP(target, chosenRoll ?? reversedRoll, { ignoreMetalAp, ignoreNonMagicalAp });
  if (ignoreNaturalArmor) {
    const magic=Math.max(Number(target.extensions?.v5?.magicAp?.[hitLoc.locationId]) || 0,Number(target.extensions?.v5?.magicApFloor?.[hitLoc.locationId]) || 0);
    const physical=Math.max(0,hitLoc.ap-magic);
    hitLoc.ap=Math.max(0,hitLoc.ap-Math.min(Math.max(0,Number(naturalArmorAp) || 0),physical));
  }
  // Attribut du Métal (V5 p. 252) : en plus, les PA métalliques de la localisation touchée.
  const metalExtra = metalDamageBonus ? hitLoc.metalAp : 0;

  // Formule V5 exacte : BFM + dégâts du sort + surpuissance + bonus d'attribut (les DR du lancer ne s'ajoutent pas)
  const rawDamage = bfm + spellDamage + overcast + extra + metalExtra;

  // « Ignore BE / PA » du sort (Transmutation de Chamon, Drain, Grands Feux…)
  const be = ignoreBe ? 0 : Math.floor((Number(target.caracs?.E) || 0) / 10);
  const ap = ignoreAp ? 0 : hitLoc.ap;
  const absorption = be + ap;

  const net = rawDamage - absorption;
  const finalDamage = Math.max(1, net); // Plancher de touche V5 : minimum 1

  const currentHp = Number(target.hp) || 0;
  const woundsLost = Math.min(currentHp, finalDamage);
  const newHp = Math.max(0, currentHp - finalDamage);

  return {
    type: 'magic-missile',
    spellName: spell.name || 'Projectile Magique',
    casterId: caster.id,
    targetId: target.id,
    roll: effectiveRoll,
    reversedRoll,
    location: hitLoc.location,
    locationKey: hitLoc.locationKey,
    bfm,
    spellDamage,
    overcastDamage: overcast,
    extraDamage: extra,
    metalExtraDamage: metalExtra,
    rawDamage,
    be,
    ap,
    absorption,
    net,
    finalDamage,
    woundsLost,
    targetCurrentHp: currentHp,
    targetNewHp: newHp
  };
}

/**
 * Résolution des Dégâts Magiques Fixes ou formules explicites (ex: "8 + DR", "5 + SL", "BFM + 8", "BF + 6", "12 Blessures").
 * RÈGLE V5 : Respectent leur propre formule, sans second ajout de BFM.
 */
export function resolveSpellDamage({
  caster,
  target,
  formula,
  spell = {},
  roll,
  sl = 0,
  ignoreBe = false,
  ignoreAp = false,
  directWounds = false,
  extraDamage = 0,
  ignoreMetalAp = false,
  ignoreNonMagicalAp = false,
  metalDamageBonus = false,
  options = {}
} = {}) {
  if (!target) {
    throw new TypeError('Cible requise pour resolveSpellDamage');
  }

  let rawDamage = 0;
  const strFormula = String(formula || spell.damageFormula || spell.damage || '').trim();
  const bfm = Math.floor((Number(caster?.caracs?.FM) || 0) / 10);
  const bf = Math.floor((Number(caster?.caracs?.F) || 0) / 10);

  // Évaluation de la formule
  if (/^(\d+)\s*\+\s*(DR|SL)$/i.test(strFormula)) {
    const match = strFormula.match(/^(\d+)\s*\+\s*(DR|SL)$/i);
    rawDamage = Number(match[1]) + Number(sl);
  } else if (/^BFM\s*\+\s*(\d+)$/i.test(strFormula)) {
    const match = strFormula.match(/^BFM\s*\+\s*(\d+)$/i);
    rawDamage = bfm + Number(match[1]);
  } else if (/^BF\s*\+\s*(\d+)$/i.test(strFormula)) {
    const match = strFormula.match(/^BF\s*\+\s*(\d+)$/i);
    rawDamage = bf + Number(match[1]);
  } else if (/^BFM$/i.test(strFormula)) {
    rawDamage = bfm;
  } else if (/^(DR|SL)$/i.test(strFormula)) {
    rawDamage = Math.max(0, Number(sl) || 0);
  } else if (/^\d+$/.test(strFormula)) {
    rawDamage = Number(strFormula);
  } else if (spell.damage && Number.isFinite(Number(spell.damage))) {
    rawDamage = Number(spell.damage);
  } else if (/\bBE\b/.test(strFormula) && Number.isFinite(spellFormulaValue(strFormula, caster || {}, Number(sl) || 0))) {
    // Formules chiffrées sur le Bonus d'Endurance (ex. Flot de Corruption : BE + DR).
    rawDamage = Math.max(0, spellFormulaValue(strFormula, caster || {}, Number(sl) || 0));
  } else {
    rawDamage = Number(sl) || 0;
  }

  // Bonus conditionnels selon les traits de la cible (ex: daemonBonus, undeadBonus)
  if (Number.isFinite(Number(spell.daemonBonus)) && isTargetDaemon(target)) {
    rawDamage += Number(spell.daemonBonus);
  }
  if (Number.isFinite(Number(spell.undeadBonus)) && isTargetUndead(target)) {
    rawDamage += Number(spell.undeadBonus);
  }

  rawDamage += Math.max(0, Number(extraDamage) || 0);
  const hits = Math.max(1, Number(spell.hits) || 1);

  if (directWounds) {
    // Blessures directes : ignorent BE et PA
    const totalDirectDamage = rawDamage * hits;
    const currentHp = Number(target.hp) || 0;
    const woundsLost = Math.min(currentHp, totalDirectDamage);
    const newHp = Math.max(0, currentHp - totalDirectDamage);
    const currentMaxHp = Number(target.maxHp ?? target.hpMax ?? currentHp);
    const targetNewMaxHp = spell.permanentMaxHpReduction
      ? Math.max(0, currentMaxHp - woundsLost)
      : currentMaxHp;
    return {
      type: 'direct-wounds',
      rawDamage,
      hits,
      be: 0,
      ap: 0,
      absorption: 0,
      finalDamage: totalDirectDamage,
      woundsLost,
      targetCurrentHp: currentHp,
      targetNewHp: newHp,
      permanentMaxHpReduction: Boolean(spell.permanentMaxHpReduction),
      targetNewMaxHp
    };
  }

  const be = ignoreBe ? 0 : Math.floor((Number(target.caracs?.E) || 0) / 10);
  let ap = 0;
  let resolvedLocation = spell.location || null;
  let metalExtra = 0;
  const locationOptions = { ...options, ignoreMetalAp, ignoreNonMagicalAp };
  if (!ignoreAp) {
    if (spell.location) {
      const locNorm = String(spell.location).toLowerCase();
      const fixed = locNorm.includes('head') || locNorm.includes('tete') || locNorm.includes('tête') ? ['head', target?.armor?.head]
        : locNorm.includes('body') || locNorm.includes('corps') || locNorm.includes('torse') ? ['body', target?.armor?.body]
        : locNorm.includes('leg') || locNorm.includes('jambe') ? ['leftLeg', target?.armor?.legs ?? target?.armor?.leftLeg ?? target?.armor?.rightLeg]
        : ['leftArm', target?.armor?.arms ?? target?.armor?.leftArm ?? target?.armor?.rightArm];
      ap = Number(fixed[1]) || 0;
      if (ignoreNonMagicalAp) ap = Math.max(Number(target?.extensions?.v5?.magicAp?.[fixed[0]]) || 0, Number(target?.extensions?.v5?.magicApFloor?.[fixed[0]]) || 0);
      else if (ignoreMetalAp) ap = Math.max(0, ap - metalApOnLocation(target, fixed[0]));
      if (metalDamageBonus) metalExtra = metalApOnLocation(target, fixed[0]);
    } else {
      const effectiveRoll = requireLocationRoll(roll);
      const hitLoc = resolveHitLocationAndAP(target, reverseV5Roll(effectiveRoll), locationOptions);
      ap = hitLoc.ap;
      resolvedLocation = hitLoc.location;
      if (metalDamageBonus) metalExtra = hitLoc.metalAp;
    }
  } else if (metalDamageBonus && Number.isInteger(Number(roll)) && Number(roll) >= 1 && Number(roll) <= 100) {
    // PA ignorés par le sort : la localisation ne sert qu'au bonus de l'attribut du Métal.
    const hitLoc = resolveHitLocationAndAP(target, reverseV5Roll(Number(roll)), locationOptions);
    resolvedLocation = hitLoc.location;
    metalExtra = hitLoc.metalAp;
  }
  rawDamage += metalExtra;

  const absorption = be + ap;
  const netPerHit = rawDamage - absorption;
  const damagePerHit = Math.max(1, netPerHit);
  const finalDamage = damagePerHit * hits;

  const currentHp = Number(target.hp) || 0;
  const woundsLost = Math.min(currentHp, finalDamage);
  const newHp = Math.max(0, currentHp - finalDamage);
  const currentMaxHp = Number(target.maxHp ?? target.hpMax ?? currentHp);
  const targetNewMaxHp = spell.permanentMaxHpReduction
    ? Math.max(0, currentMaxHp - woundsLost)
    : currentMaxHp;

  return {
    type: 'spell-damage',
    rawDamage,
    metalExtraDamage: metalExtra,
    hits,
    location: resolvedLocation,
    be,
    ap,
    absorption,
    net: netPerHit,
    finalDamage,
    woundsLost,
    targetCurrentHp: currentHp,
    targetNewHp: newHp,
    permanentMaxHpReduction: Boolean(spell.permanentMaxHpReduction),
    targetNewMaxHp
  };
}

/**
 * Résolution de l'Opposition pour un sort de contact.
 * Après incantation réussie : jet de contact opposé.
 * N'ajoute aucun dégât d'arme physique.
 */
export function resolveTouchOpposition({
  caster,
  target,
  casterSkillScore = 50,
  casterRoll = 50,
  defenderSkillScore = 40,
  defenderRoll = 50
} = {}) {
  const casterSl = Math.floor(casterSkillScore / 10) - Math.floor(casterRoll / 10);
  const defenderSl = Math.floor(defenderSkillScore / 10) - Math.floor(defenderRoll / 10);

  const casterSuccess = casterRoll <= casterSkillScore;
  const defenderSuccess = defenderRoll <= defenderSkillScore;

  const netSl = casterSl - defenderSl;
  // Attaquant touche s'il réussit et a un netSl >= 0 (ou gagne l'opposition)
  const hit = casterSuccess && (netSl > 0 || (netSl === 0 && casterSkillScore >= defenderSkillScore));

  const reversedRoll = reverseV5Roll(casterRoll);
  const location = getLocationName(reversedRoll);

  return {
    type: 'touch-opposition',
    casterRoll,
    reversedRoll,
    casterSl,
    casterSuccess,
    defenderRoll,
    defenderSl,
    defenderSuccess,
    netSl,
    hit,
    location: location.name,
    locationKey: location.key
  };
}

/**
 * Soins magiques : soignent les Blessures réelles dans la limite des Bmax.
 * Les Blessures réellement soignées retirent d'autant les états Hémorragique.
 */
export function resolveSpellHealing({ target, amount = 0 } = {}) {
  if (!target) throw new TypeError('Cible requise pour resolveSpellHealing');
  const healAmount = Math.max(0, Number(amount) || 0);
  return healV5Wounds(target, healAmount);
}
