/**
 * Adaptateur bestiaire -> créature invoquée par un miracle divin (invocations P4c).
 * Le profil compact (objet simple, sans null ni liste vide) est figé à l'aperçu puis copié tel quel sur le participant : l'application
 * ne recalcule rien. Les bêtes sont celles du bestiaire de Forme bestiale (liste fermée, V5 Livre de base pp. 325-327) ; les valeurs
 * propres à un miracle arrivent en `overrides` : {name?, caracs?: {clé: valeur}, size?, traits?: [texte], wounds?: entier,
 * recomputeWounds?: true}. Un écart de caractéristique décale les compétences et les attaques qui en dépendent du même écart, comme
 * effectiveSkillScore (seul l'écart compte, jamais un recalcul depuis la caractéristique).
 */
import { REIKLAND_BEASTS } from './v5-transformation-bestiary.js';
import { creatureWounds } from '../core/v5-magic-arbitrations.js';

export const SUMMON_BEAST_KEYS = Object.freeze(Object.keys(REIKLAND_BEASTS));
export const SUMMON_SIZES = Object.freeze(['small', 'average', 'large', 'enormous']);
const SIZE_TRAITS = Object.freeze({ small: 'Taille (Petite)', large: 'Taille (Grande)', enormous: 'Taille (Énorme)' });
// Caractéristique dont dépend chaque compétence des six bêtes ; une compétence inconnue n'est jamais décalée.
const SKILL_CARACS = Object.freeze({ 'Corps à corps': 'CC', Perception: 'I', Pistage: 'I', Esquive: 'Ag', Discrétion: 'Ag', Athlétisme: 'Ag', Résistance: 'E' });
const FREE_CLAUSES = Object.freeze({ momentum: ' — attaque gratuite en perdant l’Élan', charge: ' — attaque gratuite seulement en chargeant' });
// Dégâts de la ligne du bestiaire = total ; la formule d'action ajoute au Bonus de Force le seul écart (comme beastFormActions).
const bonusText = bonus => bonus > 0 ? `BF+${bonus}` : bonus < 0 ? `BF${bonus}` : 'BF';
const isText = value => typeof value === 'string' && value.trim() !== '';
const skillCarac = name => SKILL_CARACS[String(name).replace(/\s*\(.*\)\s*$/, '').trim()] || null;

/** Contrôle des surcharges d'un contrat : message d'erreur ou null. */
export function summonOverridesError(overrides) {
  if (overrides === undefined) return null;
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return 'overrides doit être un objet.';
  if (overrides.name !== undefined && !isText(overrides.name)) return 'overrides.name doit être un texte.';
  if (overrides.caracs !== undefined && (!overrides.caracs || typeof overrides.caracs !== 'object'
    || !Object.values(overrides.caracs).every(value => Number.isSafeInteger(value) && value >= 0))) return 'overrides.caracs doit associer des entiers positifs.';
  if (overrides.size !== undefined && !SUMMON_SIZES.includes(overrides.size)) return `overrides.size doit être l’un de ${SUMMON_SIZES.join(', ')}.`;
  if (overrides.traits !== undefined && (!Array.isArray(overrides.traits) || !overrides.traits.every(isText))) return 'overrides.traits doit être une liste de textes.';
  if (overrides.wounds !== undefined && (!Number.isSafeInteger(overrides.wounds) || overrides.wounds < 1)) return 'overrides.wounds doit être un entier positif.';
  if (overrides.recomputeWounds !== undefined && overrides.recomputeWounds !== true) return 'overrides.recomputeWounds ne peut valoir que true.';
  return null;
}

/**
 * Blessures de la créature : `wounds` explicite, sinon celles du bestiaire ; avec `recomputeWounds`, la formule du livre (creatureWounds)
 * ne remplace le profil que si elle redonne exactement ses Blessures pour la bête de base (sinon on garde les Blessures du profil).
 */
function profileWounds(base, caracs, size, overrides) {
  if (overrides.wounds !== undefined) return { wounds: overrides.wounds };
  if (overrides.recomputeWounds !== true) return { wounds: base.wounds };
  const reference = creatureWounds({ caracs: base.caracs, size: base.size });
  if (reference.wounds !== base.wounds) return { wounds: base.wounds };
  const computed = creatureWounds({ caracs, size });
  return { wounds: computed.wounds, formula: computed.formula };
}

/** Profil compact d'une bête du bestiaire, surcharges appliquées. Lève une TypeError pour une bête hors liste. */
export function buildBeastSummonProfile(key, overrides = {}) {
  const base = Object.hasOwn(REIKLAND_BEASTS, key) ? REIKLAND_BEASTS[key] : null;
  if (!base) throw new TypeError(`Bête invoquée hors liste : ${key}.`);
  const error = summonOverridesError(overrides);
  if (error) throw new TypeError(error);
  const caracs = {}, absent = [];
  for (const [carac, value] of Object.entries(base.caracs)) if (value === null) absent.push(carac); else caracs[carac] = value;
  caracs.M = base.M;
  Object.assign(caracs, overrides.caracs);
  const gap = carac => carac && Number.isFinite(base.caracs[carac]) ? (caracs[carac] ?? 0) - base.caracs[carac] : 0;
  const size = overrides.size || base.size;
  const traits = [...base.traits.filter(trait => !(overrides.size && /^Taille \(/.test(trait))), ...(overrides.size && SIZE_TRAITS[size] ? [SIZE_TRAITS[size]] : [])];
  for (const trait of overrides.traits || []) if (!traits.includes(trait)) traits.push(trait);
  const { wounds, formula } = profileWounds(base, caracs, size, overrides);
  const ap = Number.isFinite(base.armor?.ap) ? base.armor.ap : 0;
  return {
    key, name: overrides.name || base.name, size, wounds, initiative: caracs.I,
    ...(formula ? { woundsFormula: formula } : {}),
    caracs, armor: { head: ap, body: ap, arms: ap, legs: ap },
    skills: base.skills.map(([name, total]) => [name, Math.max(0, total + gap(skillCarac(name)))]),
    traits,
    attacks: base.attacks.filter(attack => Number.isFinite(attack.value) && Number.isFinite(attack.damage)).map(attack => ({
      id: attack.id, name: attack.name, value: Math.max(0, attack.value + gap('CC')), damageBonus: attack.damage - Math.floor(base.caracs.F / 10),
      ...(attack.free ? { free: attack.free } : {}), ...(attack.qualities.length ? { qualities: [...attack.qualities] } : {}) })),
    ...(absent.length ? { absentCaracs: absent } : {})
  };
}

/** Participant ordinaire d'une créature invoquée : champs standards seulement, attaques au format de beastFormActions. */
export function summonCreatureParticipant(profile, { id, name, camp, ownerId, link, position }) {
  return {
    id, name: name || profile.name, kind: 'Créature', camp, zone: 'active', initiative: profile.initiative,
    hp: profile.wounds, maxHp: profile.wounds, caracs: structuredClone(profile.caracs), armor: structuredClone(profile.armor),
    skills: profile.skills.map(([skill, total]) => ({ name: skill, total, status: 'resolved' })),
    traits: [...profile.traits],
    actions: profile.attacks.map(attack => ({
      id: `divine-summon:${attack.id}`, note: `${attack.name}${FREE_CLAUSES[attack.free] || ''}`, type: 'attack', attr: 'CC', base: attack.value, mod: 0,
      damageFormula: bonusText(attack.damageBonus), qualities: (attack.qualities || []).map(quality => ({ id: quality })), extensions: { v5: { kind: 'melee' } } })),
    ...(position ? { notes: `Position : ${position}` } : {}),
    isAuxiliary: true, casterId: ownerId,
    extensions: { v5: { divineSummon: structuredClone(link) } }
  };
}

/** Capteur (comme l'Œil Invisible) : hors ordre, sans initiative ni action, invulnérable (hp et maxHp absents), traits listés. */
export function summonSensorParticipant({ id, name, camp, ownerId, link, traits = [] }) {
  return {
    id, name, kind: 'Créature', camp, zone: 'bench', traits: [...traits], sensor: true, isAuxiliary: true, casterId: ownerId,
    extensions: { v5: { divineSummon: structuredClone(link) } }
  };
}
