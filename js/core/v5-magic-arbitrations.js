/**
 * Arbitrages de Sorts et Cas Particuliers V5 — Lot 3.2.
 * Conforme au Cahier des charges Lot 3 et au Cadrage Magie V5.
 * Module pur : aucune E/S, aucun tirage implicite, prévisualisations sans mutation d'état.
 */

import { applySpellEffects, expireSpellEffects } from './v5-magic-effects.js';
import { isTargetUndead, isTargetDaemon } from './v5-magic-attributes.js';
import { getReferenceCatalogue } from './reference-catalog.js';
import { REIKLAND_BEASTS, KADON_MONSTERS } from '../data/v5-transformation-bestiary.js';

export const V5_MAGIC_ARBITRATIONS_VERSION = 'v5-magic-arbitrations-2026-10-11.1';

/** Bêtes du Reikland (Forme bestiale, Livre de base pp. 325-327) et monstres de Transformation de Kadon (pp. 328-335). */
export const BEAST_PROFILES = REIKLAND_BEASTS;
export const KADON_PROFILES = KADON_MONSTERS;

const fold = str => String(str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Caractéristiques que Forme bestiale remplace (V5 p. 245) ; Transformation de Kadon remplace tout sauf Int et FM. */
export const BEAST_FORM_REPLACED_CARACS = Object.freeze(['F', 'E', 'Ag', 'Dex']);
export const KADON_REPLACED_CARACS = Object.freeze(['CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Soc']);
/** Traits de la créature jamais ajoutés par Forme bestiale (V5 p. 245) : Bestial et Craintif. */
const EXCLUDED_BEAST_TRAITS = /^(bestial|craintif|skittish)/;
/** Traits optionnels que Forme bestiale refuse (V5 p. 245) : Taille (Énorme) et Nuée. */
const EXCLUDED_BEAST_OPTIONAL = /^(nuee|taille \(enorme\))/;
/** Éléments de la fiche que la transformation remplace ou lâche, restitués au retour. */
const FORM_FIELDS = Object.freeze(['armor', 'armorLocations', 'protection', 'equipment', 'skills', 'talents']);
const ARMOR_LOCATIONS = Object.freeze(['head', 'body', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg']);
const CARAC_KEYS = Object.freeze({ cc: 'CC', ct: 'CT', f: 'F', e: 'E', i: 'I', ag: 'Ag', dex: 'Dex', int: 'Int', fm: 'FM', soc: 'Soc' });

const SIZE_KEYS = Object.freeze({ petite: 'small', moyenne: 'average', grande: 'large', enorme: 'enormous', monstrueuse: 'monstrous' });
const SIZE_LABELS = Object.freeze({ small: 'Petite', average: 'Moyenne', large: 'Grande', enormous: 'Énorme', monstrous: 'Monstrueuse' });
/** Blessures selon la Taille (Livre de base p. 361) : multiplicateur de BF + 2 × BE + BFM ; Petite = 2 × BE. */
const SIZE_WOUND_FACTOR = Object.freeze({ average: 1, large: 2, enormous: 4, monstrous: 8 });

/** Surpuissance : +2 DR par trait optionnel de Forme bestiale (V5 p. 245) ; +4 DR par trait ou par autre cible de Kadon (WoM p. 149). */
export const BEAST_TRAIT_COST = 2;
export const KADON_OPTION_COST = 4;
export function transformationOvercastCost({ kind = 'beast', traits = 0, otherTarget = false } = {}) {
  return kind === 'kadon' ? KADON_OPTION_COST * (traits + (otherTarget ? 1 : 0)) : BEAST_TRAIT_COST * traits;
}

/** Taille portée par un trait « Taille (Grande) », ou null. */
export function traitSize(trait) {
  const match = /^taille \((.+)\)$/.exec(fold(typeof trait === 'string' ? trait : trait?.name));
  return match ? SIZE_KEYS[match[1]] || null : null;
}

/** Traits optionnels que le MJ peut choisir : tous pour Kadon ; pour Forme bestiale, sauf Taille (Énorme) et Nuée. */
export function optionalTransformationTraits(profile, kind = 'beast') {
  return (profile?.optionalTraits || []).filter(name => kind === 'kadon' || !EXCLUDED_BEAST_OPTIONAL.test(fold(name)));
}

/** Message de refus d'un choix de traits optionnels, ou null. */
export function transformationTraitsError(profile, names = [], kind = 'beast') {
  if (!Array.isArray(names)) return 'Traits optionnels : liste attendue.';
  const allowed = optionalTransformationTraits(profile, kind);
  const unknown = names.find(name => !allowed.includes(name));
  if (unknown !== undefined) return `Trait optionnel « ${unknown} » non disponible pour ${profile?.name || 'cette créature'}.`;
  if (new Set(names).size !== names.length) return 'Un même trait optionnel ne peut être choisi deux fois.';
  if (names.filter(name => traitSize(name)).length > 1) return 'Les options de Taille sont exclusives : une seule Taille peut être choisie.';
  return null;
}

/** Rangs de Dur à cuire du lanceur (chacun ajoute encore son Bonus d'Endurance aux Blessures, Livre de base p. 120). */
export function hardyRank(participant) {
  return (participant?.talents || []).reduce((sum, talent) => fold(talent?.name ?? talent?.nom) === 'dur a cuire' ? sum + (Number(talent.rank) > 0 ? Number(talent.rank) : 1) : sum, 0);
}

/**
 * Blessures V5 d'une créature (Livre de base p. 361) : Petite 2 × BE ; Moyenne BF + 2 × BE + BFM ; Grande ×2, Énorme ×4,
 * Monstrueuse ×8. Dur à cuire ajoute le BE une fois de plus au total de base (p. 120).
 */
export function creatureWounds({ caracs = {}, size = 'average', hardy = 0 } = {}) {
  if (!['F', 'E', 'FM'].every(key => Number.isFinite(Number(caracs[key])) && caracs[key] !== null)) throw new TypeError('Force, Endurance et Force Mentale requises pour recalculer les Blessures');
  const [sb, tb, wb] = ['F', 'E', 'FM'].map(key => Math.floor(Number(caracs[key]) / 10));
  const factor = SIZE_WOUND_FACTOR[size] || 1;
  const small = size === 'small';
  const wounds = (small ? (2 + hardy) * tb : sb + (2 + hardy) * tb + wb) * factor;
  const extra = hardy ? ` + ${hardy} × BE` : '';
  const formula = small ? `Taille Petite : 2 × BE ${tb}${hardy ? ` + ${hardy} × BE` : ''} = ${wounds}`
    : `Taille ${SIZE_LABELS[size] || 'Moyenne'} : ${factor > 1 ? '(' : ''}BF ${sb} + 2 × BE ${tb}${extra} + BFM ${wb}${factor > 1 ? `) × ${factor}` : ''} = ${wounds}`;
  return { wounds, formula, size };
}

const caracKey = carac => CARAC_KEYS[fold(carac)] || null;

/** Résultat de la transformation, sans mutation : caractéristiques, Blessures, traits, armure, attaques. */
export function transformationPlan(caster, profile, { kind = 'beast', optionalTraits = [] } = {}) {
  const kadon = kind === 'kadon';
  const base = structuredClone(caster.extensions?.v5?.baseCaracs || caster.baseCaracs || caster.caracs || {});
  const caracs = structuredClone(base);
  const absent = [];
  for (const key of kadon ? KADON_REPLACED_CARACS : BEAST_FORM_REPLACED_CARACS) {
    const value = profile.caracs?.[key];
    if (value === null) { delete caracs[key]; absent.push(key); }
    else if (value !== undefined && value !== '') caracs[key] = Number(value);
  }
  const M = Number(profile.M ?? profile.caracs?.M ?? 4);
  const chosenSize = optionalTraits.map(traitSize).find(Boolean);
  const size = chosenSize || profile.size || (profile.traits || []).map(traitSize).find(Boolean) || 'average';
  const bookWounds = Number(profile.wounds ?? profile.hp);
  const computed = kadon ? { wounds: bookWounds, formula: `Blessures du profil du livre : ${bookWounds}`, size } : creatureWounds({ caracs, size, hardy: hardyRank(caster) });
  const standard = (profile.traits || []).filter(trait => (kadon || !EXCLUDED_BEAST_TRAITS.test(fold(trait))) && !(chosenSize && traitSize(trait)));
  const bonus = Math.floor(Number(profile.caracs?.F) / 10) || 0;
  const attacks = (profile.attacks || []).filter(attack => attack.value !== null && attack.value !== undefined && Number.isFinite(Number(attack.value))).map(attack => ({
    id: attack.id, name: attack.name, value: Number(attack.value), damageBonus: Number(attack.damage) - bonus, free: attack.free || null,
    count: attack.count || 1, qualities: [...(attack.qualities || [])], note: attack.note || ''
  }));
  return {
    base, caracs, absent, M, size, wounds: computed.wounds, woundsFormula: computed.formula,
    traits: [...new Set([...(caster.traits || []), ...standard, ...optionalTraits])],
    formTraits: [...new Set([...standard, ...optionalTraits])],
    armor: profile.armor ? { name: profile.armor.name, ap: Number(profile.armor.ap) || 0 } : null,
    attacks
  };
}

/** Compétences pendant la forme : celles du monstre (Kadon) ou celles du lanceur, recalculées sur les caractéristiques remplacées. */
function transformedSkills(caster, profile, plan, kadon) {
  if (kadon) {
    const catalogue = getReferenceCatalogue().skills || [];
    return (profile.skills || []).map(([name, total]) => {
      const entry = catalogue.find(skill => skill.nom === name);
      return { id: entry?.id || null, sourceName: name, name: entry?.nom || name, carac: entry?.carac || null, advances: 0, total: Number(total), specialty: entry?.specialization || null, basic: false, status: entry ? 'resolved' : 'unresolved' };
    });
  }
  return structuredClone(caster.skills || []).map(skill => {
    const key = caracKey(skill.carac);
    if (!key || !BEAST_FORM_REPLACED_CARACS.includes(key) || !Number.isFinite(skill.total)) return skill;
    const was = Number(plan.base[key]);
    return { ...skill, total: plan.caracs[key] === undefined ? null : skill.total - (Number.isFinite(was) ? was : 0) + plan.caracs[key] };
  });
}

// ============================================================================
// 1. FORME BESTIALE & FORME BESTIALE — JADE & TRANSFORMATION DE KADON
// ============================================================================

/**
 * Sous forme animale on ne peut ni parler, ni lancer de sorts, ni dissiper (V5 p. 245) ; la Focalisation suit (arbitrage du plan A-05).
 * Transformation de Kadon n'interdit que l'incantation. Retourne le message de refus, ou null.
 */
export function beastFormRestriction(participant, action) {
  const form = participant?.extensions?.v5?.beastForm;
  if (!form) return null;
  if (form.kind === 'kadon') return action === 'cast' ? 'Transformation de Kadon : impossible de lancer un sort sous cette forme.' : null;
  const verb = { cast: 'lancer un sort', dispel: 'dissiper', channel: 'se focaliser' }[action] || 'agir magiquement';
  return `Forme bestiale : impossible de ${verb} sous forme animale.`;
}

/**
 * Prévisualisation de la transformation en Forme bestiale ou en Transformation de Kadon (`kind: 'kadon'`).
 * Forme bestiale — Jade est un doublon homebrew partageant intégralement l'implémentation,
 * rattaché au Vent Ghyran et à l'attribut du Domaine de la Vie.
 */
export function previewBeastForm(caster, beastProfile, { durationMinutes = null, durationRounds = null, isJade = false, kind = 'beast', optionalTraits = [], spellId = null } = {}) {
  if (!caster || !beastProfile) {
    throw new TypeError('Lanceur et profil de bête requis');
  }
  const kadon = kind === 'kadon';
  if (caster.extensions?.v5?.beastForm) throw new RangeError(`${caster.name || caster.id} est déjà transformée : revenir à sa forme d’origine avant une nouvelle transformation.`);
  const traitsError = transformationTraitsError(beastProfile, optionalTraits, kind);
  if (traitsError) throw new RangeError(traitsError);

  const endurance = Number(caster.caracs?.E) || 30;
  const duration = durationRounds !== null && durationRounds !== undefined ? Number(durationRounds) / 6
    : durationMinutes !== null ? Number(durationMinutes) : endurance; // Endurance minutes en V5
  const plan = transformationPlan(caster, beastProfile, { kind, optionalTraits });

  const wind = isJade ? 'Ghyran' : 'Ghur';
  const lore = isJade ? 'life' : 'beasts';
  const name = kadon ? 'Transformation de Kadon' : isJade ? 'Forme bestiale — Jade' : 'Forme bestiale';
  const length = kadon ? `${Number(durationRounds)} Rounds` : `${duration} minutes`;
  const characteristics = ['M', 'F', 'E', 'Ag', 'Dex'].map(key => `${key} ${key === 'M' ? plan.M : plan.caracs[key] ?? '–'}`).join(', ');

  return {
    spellName: name,
    isJade,
    wind,
    lore,
    kind: kadon ? 'kadon' : 'beast',
    durationMinutes: duration,
    ...(kadon && durationRounds !== null ? { durationRounds: Number(durationRounds) } : {}),
    beastProfile: structuredClone(beastProfile),
    optionalTraits: [...optionalTraits],
    plan,
    summary: `Transformation en ${beastProfile.name} pendant ${length}. ${characteristics} ; ${plan.wounds} Blessures (${plan.woundsFormula}).${plan.absent.length ? ` Absent : ${plan.absent.join(', ')} (Tests impossibles).` : ''} Équipement lâché.`,
    ready: true
  };
}

/**
 * Application de la transformation : le profil d'origine est conservé en entier pour le retour ; l'armure et les armes
 * portées ne servent plus (seule l'armure standard de la créature protège), les attaques sont celles de la créature
 * (`beastFormActions`), les Compétences (et pour Kadon les Talents) sont remplacées.
 */
export function applyBeastForm(caster, beastProfile, options = {}) {
  const preview = previewBeastForm(caster, beastProfile, options);
  const plan = preview.plan;
  const kadon = options.kind === 'kadon';
  const next = structuredClone(caster);

  next.extensions = next.extensions || {};
  next.extensions.v5 = next.extensions.v5 || {};
  const v5 = next.extensions.v5;

  const fields = Object.fromEntries(FORM_FIELDS.filter(key => Object.hasOwn(caster, key)).map(key => [key, structuredClone(caster[key])]));
  // Enregistrer le profil original complet
  v5.beastForm = {
    originalParticipant: {
      caracs: structuredClone(caster.caracs),
      baseCaracs: structuredClone(caster.baseCaracs || caster.caracs),
      M: caster.M ?? caster.caracs?.M ?? 4,
      traits: structuredClone(caster.traits || []),
      hp: Number(caster.hp) || 0,
      maxHp: Number(caster.maxHp) || 12,
      fields,
      baseArmor: { extension: structuredClone(caster.extensions?.v5?.baseArmor ?? null), flat: structuredClone(caster.baseArmor ?? null) }
    },
    beastProfile: structuredClone(beastProfile),
    optionalTraits: preview.optionalTraits,
    formTraits: structuredClone(plan.formTraits),
    attacks: structuredClone(plan.attacks),
    absentCaracs: [...plan.absent],
    size: plan.size,
    armor: plan.armor,
    woundsFormula: plan.woundsFormula,
    equipmentDropped: true,
    initialBeastHp: plan.wounds,
    criticalWoundsSuffered: [],
    durationMinutes: preview.durationMinutes,
    remainingMinutes: preview.durationMinutes,
    expiresAtRound: Number(options.round || 1) + (options.durationRounds != null ? Number(options.durationRounds) : preview.durationMinutes * 6),
    kind: kadon ? 'kadon' : 'beast',
    ...(options.casterId ? { casterId: options.casterId } : {}),
    name: beastProfile.name,
    originalBaseCaracs: structuredClone(caster.extensions?.v5?.baseCaracs || caster.baseCaracs || caster.caracs),
    originalBaseTraits: structuredClone(caster.extensions?.v5?.baseTraits || caster.traits || []),
    originalTemporaryTraits: structuredClone(caster.extensions?.v5?.temporaryTraits || []),
    isJade: preview.isJade
  };

  // Remplacer Mouvement et les seules caractéristiques prévues ; le reste du profil, et les traits du lanceur, sont conservés.
  next.caracs = structuredClone(plan.caracs);
  next.baseCaracs = structuredClone(plan.caracs);
  v5.baseCaracs = structuredClone(plan.caracs);
  // Les traits du profil sont une base de forme ; ceux des couches gardent leur propre durée.
  v5.baseTraits = [...new Set([...v5.beastForm.originalBaseTraits, ...plan.formTraits])];
  v5.temporaryTraits = structuredClone(caster.extensions?.v5?.temporaryTraits || []);
  next.M = plan.M;
  next.caracs.M = plan.M;
  next.baseCaracs.M = plan.M;
  v5.baseCaracs.M = plan.M;
  next.movement = plan.M;
  next.traits = structuredClone(plan.traits);
  next.hp = plan.wounds;
  next.maxHp = plan.wounds;

  // Équipement lâché (WoM p. 150) : seule l'armure standard de la créature protège.
  const ap = plan.armor?.ap || 0;
  next.armorLocations = Object.fromEntries(ARMOR_LOCATIONS.map(id => [id, ap]));
  next.armor = { head: ap, body: ap, arms: ap, legs: ap };
  v5.baseArmor = structuredClone(next.armor);
  next.baseArmor = structuredClone(next.armor);
  next.equipment = [];
  delete next.protection;

  next.skills = transformedSkills(caster, beastProfile, plan, kadon);
  if (kadon) next.talents = [];

  return {
    status: 'transformed',
    participant: next,
    preview
  };
}

/**
 * Retour à la forme normale après Forme bestiale.
 * RÈGLE V5 :
 * - Les dégâts subis sous forme de bête restent subis au retour.
 * - Les Coups Critiques subis sous forme de bête sont reportés au retour.
 */
export function revertBeastForm(beastParticipant) {
  if (!beastParticipant?.extensions?.v5?.beastForm) {
    throw new Error('Le participant n’est pas sous Forme bestiale');
  }

  const data = beastParticipant.extensions.v5.beastForm;
  const original = data.originalParticipant;
  if (!original || !original.caracs || typeof original.caracs !== 'object' || Array.isArray(original.caracs)) {
    throw new Error('Forme bestiale invalide : profil d’origine manquant.');
  }
  const next = structuredClone(beastParticipant);

  // Calculer les dégâts subis sous forme de bête
  const currentBeastHp = Number(next.hp) || 0;
  const initialBeastHp = Number(data.initialBeastHp) || 12;
  const woundsLostInBeastForm = Math.max(0, initialBeastHp - currentBeastHp);

  // Restaurer le profil normal
  next.caracs = structuredClone(original.caracs);
  next.baseCaracs = structuredClone(data.originalBaseCaracs || original.baseCaracs);
  next.extensions.v5.baseCaracs = structuredClone(next.baseCaracs);
  next.extensions.v5.baseTraits = structuredClone(data.originalBaseTraits || original.traits);
  next.M = original.M;
  next.caracs.M = original.M ?? original.caracs?.M ?? 4;
  next.movement = next.caracs.M;
  next.traits = structuredClone(original.traits);
  next.maxHp = original.maxHp;

  // Équipement, armure, compétences et talents retrouvés (les formes enregistrées avant ce correctif n'ont rien à rendre).
  if (original.fields) {
    for (const key of FORM_FIELDS) {
      if (Object.hasOwn(original.fields, key)) next[key] = structuredClone(original.fields[key]);
      else delete next[key];
    }
    const savedBase = original.baseArmor || {};
    if (savedBase.extension !== null && savedBase.extension !== undefined) next.extensions.v5.baseArmor = structuredClone(savedBase.extension); else delete next.extensions.v5.baseArmor;
    if (savedBase.flat !== null && savedBase.flat !== undefined) next.baseArmor = structuredClone(savedBase.flat); else delete next.baseArmor;
  }

  // Dégâts subis restent subis
  const finalHp = Math.max(0, original.hp - woundsLostInBeastForm);
  next.hp = Math.min(original.maxHp, finalHp);

  // Critiques subis sous forme de bête sont reportés
  const crits = Array.isArray(data.criticalWoundsSuffered) ? data.criticalWoundsSuffered : [];
  if (crits.length > 0) {
    next.criticals = [...(next.criticals || []), ...crits];
  }

  // Conserver les sources encore actives, jamais un ancien snapshot d'effets expirés.
  // Reprise des anciennes formes : leurs traits de profil avaient aussi été rangés dans temporaryTraits.
  const baseTraits = next.extensions.v5.baseTraits || [];
  const formTraits = new Set(data.formTraits || [...(data.beastProfile?.traits || []), ...(data.optionalTraits || [])]);
  const originalTemporary = new Set(data.originalTemporaryTraits || []);
  const temporary = next.extensions.v5.temporaryTraits || [];
  const activeTraits = (next.extensions.v5.spellEffects || []).filter(effect => !effect.beastFormMarker).flatMap(effect => effect.traits || []);
  const incidentTraits = (next.extensions.v5.miscastEffects || []).flatMap(effect => effect.traitsGained || []);
  next.extensions.v5.temporaryTraits = [...new Set([
    ...temporary.filter(trait => originalTemporary.has(trait) || !formTraits.has(trait) && !baseTraits.includes(trait)),
    ...activeTraits, ...incidentTraits
  ])];
  next.traits = [...new Set([...baseTraits, ...next.extensions.v5.temporaryTraits])];
  delete next.extensions.v5.beastForm;

  return {
    status: 'reverted',
    participant: next,
    woundsCarriedOver: woundsLostInBeastForm,
    criticalsCarriedOver: crits
  };
}

// ============================================================================
// 2. APOTHÉOSE VERDOYANTE (VERDANT APOTHEOSIS)
// ============================================================================

/**
 * Prévisualisation d'Apothéose Verdoyante (Winds of Magic, p. 89).
 * RÈGLE CONFIRMÉE :
 * - Chaque mort admissible revient avec 1 Blessure par DR final du sort.
 * - DR final = DR du test réussi + réserve consommée, AVANT surpuissance.
 * - Limité aux Bmax de la cible.
 * - Admissibilité : mort depuis moins de 1 minute (< 60s), cadavre NON décapité.
 * - Test de Corruption modérée (Moderate Exposure to Corruption).
 * - Critiques non guéris, membres perdus non restaurés.
 */
export function previewVerdantApotheosis({
  caster,
  corpses = [],
  castingSl = 0,
  reserveSl = 0,
  overcastSpent = 0
} = {}) {
  const finalSl = Number(castingSl) + Number(reserveSl); // AVANT surpuissance !
  const results = [];

  for (const corpse of corpses) {
    if (!corpse) continue;

    // Le délai depuis la mort est une saisie du MJ : jamais 0 par défaut. Une cible à plus de 0 B est vivante.
    const rawDelay = corpse.timeSinceDeathSec ?? corpse.deathTimeSeconds;
    const timeSinceDeathSec = rawDelay === null || rawDelay === undefined || rawDelay === '' ? NaN : Number(rawDelay);
    const isDecapitated = corpse.decapitated === true || corpse.isDecapitated === true;
    const overOneMinute = timeSinceDeathSec >= 60;

    if (Number(corpse.hp) > 0) {
      results.push({
        corpseId: corpse.id,
        name: corpse.name,
        admissible: false,
        reason: 'Cible vivante : seule une créature morte depuis moins d’une minute peut revenir (0 B requis).',
        healedHp: 0
      });
      continue;
    }

    if (corpse.cannotBeRevived === true || corpse.extensions?.v5?.cannotBeRevived === true) {
      results.push({
        corpseId: corpse.id,
        name: corpse.name,
        admissible: false,
        reason: 'Ne peut plus être ramené : mort au terme d’une Apothéose.',
        healedHp: 0
      });
      continue;
    }

    if (isDecapitated) {
      results.push({
        corpseId: corpse.id,
        name: corpse.name,
        admissible: false,
        reason: 'Cadavre décapité : au-delà de tout salut (beyond saving).',
        healedHp: 0
      });
      continue;
    }

    if (!Number.isFinite(timeSinceDeathSec) || timeSinceDeathSec < 0) {
      results.push({
        corpseId: corpse.id,
        name: corpse.name,
        admissible: false,
        needsDelay: true,
        reason: 'Délai depuis la mort non saisi (secondes, moins d’une minute).',
        healedHp: 0
      });
      continue;
    }

    if (overOneMinute) {
      results.push({
        corpseId: corpse.id,
        name: corpse.name,
        admissible: false,
        reason: 'Mort depuis une minute ou plus.',
        healedHp: 0
      });
      continue;
    }

    // Mort admissible
    const maxHp = Number(corpse.maxHp) || 12;
    const healedHp = Math.min(maxHp, Math.max(0, finalSl));

    results.push({
      corpseId: corpse.id,
      name: corpse.name,
      admissible: true,
      finalSl,
      maxHp,
      healedHp,
      corruptionTest: 'Exposition modérée à la Corruption (WFRP p. 182)',
      reminders: [
        'Blessures Critiques non guéries.',
        'Membres perdus non restaurés.'
      ]
    });
  }

  return {
    spellName: 'Apothéose Verdoyante',
    finalSl,
    admissibleCount: results.filter(r => r.admissible).length,
    rejectedCount: results.filter(r => !r.admissible).length,
    results,
    ready: true
  };
}

/**
 * Application d'Apothéose Verdoyante sur les corps admissibles.
 */
export function applyVerdantApotheosis(corpses = [], preview) {
  if (!preview || !Array.isArray(preview.results)) {
    throw new TypeError('Aperçu d’Apothéose Verdoyante invalide');
  }

  const updatedCorpses = [];

  for (const corpse of corpses) {
    const outcome = preview.results.find(r => r.corpseId === corpse.id);
    if (!outcome || !outcome.admissible) {
      updatedCorpses.push(structuredClone(corpse));
      continue;
    }

    const next = structuredClone(corpse);
    next.hp = outcome.healedHp;
    next.isDead = false;
    next.dead = false;

    // Retirer les états de mort ou inconscient mortel
    if (Array.isArray(next.states)) {
      next.states = next.states.filter(s => {
        const k = (s.key || s.name || '').toLowerCase();
        return !['mort', 'dead', 'inconscient'].includes(k);
      });
    }

    next.extensions = next.extensions || {};
    next.extensions.v5 = next.extensions.v5 || {};
    next.extensions.v5.needsCorruptionTest = true;
    next.extensions.v5.dead = false;
    next.extensions.v5.corruptionExposures = [
      ...(next.extensions.v5.corruptionExposures || []),
      { source: 'Apothéose Verdoyante', level: 'moderate', test: outcome.corruptionTest }
    ];

    updatedCorpses.push(next);
  }

  return {
    status: 'applied',
    updatedCorpses,
    preview
  };
}

// ============================================================================
// 3. FLÉAU DES DÉMONS (DAEMONBANE)
// ============================================================================

/**
 * Prévisualisation de Fléau des Démons.
 * RÈGLE CONFIRMÉE :
 * - Cible : Démon.
 * - E cible <= Int lanceur : Bannissement !
 * - Int lanceur < E cible < 2 * Int lanceur : Bmax divisées par deux pour le reste de la rencontre.
 * - E cible >= 2 * Int lanceur : Aucun effet principal.
 */
export function previewDaemonbane({ caster, target, options = {} } = {}) {
  if (!caster || !target) {
    throw new TypeError('Lanceur et cible requis pour previewDaemonbane');
  }

  const casterInt = Number(caster.caracs?.Int) || 0;
  if(target.caracs?.E == null || target.caracs.E === '' || !Number.isFinite(Number(target.caracs.E))) throw new Error('Fléau des Démons : Endurance (E) de la cible requise.');
  const targetE = Number(target.caracs.E);
  const targetMaxHp = Number(target.maxHp) || 12;

  let effect = 'none';
  let summary = '';
  let newMaxHp = targetMaxHp;

  if (targetE <= casterInt) {
    effect = 'banished';
    summary = `Endurance (${targetE}) ≤ Intelligence (${casterInt}) : Démon banni !`;
  } else if (targetE < 2 * casterInt) {
    effect = 'halved-max-hp';
    newMaxHp = target.extensions?.v5?.daemonbaneMaxHp ? targetMaxHp : Math.floor(targetMaxHp / 2);
    summary = `Intelligence (${casterInt}) < Endurance (${targetE}) < 2 × Int (${2 * casterInt}) : Bmax divisées par deux (${newMaxHp}).`;
  } else {
    effect = 'no-effect';
    summary = `Endurance (${targetE}) ≥ 2 × Intelligence (${2 * casterInt}) : Aucun effet principal.`;
  }

  return {
    spellName: 'Fléau des Démons',
    casterInt,
    targetE,
    targetMaxHp,
    effect,
    newMaxHp,
    summary,
    ready: true
  };
}

/**
 * Application de Fléau des Démons sur la cible démone.
 */
export function applyDaemonbane(target, preview) {
  if (!preview || preview.ready === false) {
    throw new TypeError('Aperçu de Fléau des Démons invalide');
  }

  const next = structuredClone(target);

  if (preview.effect === 'banished') {
    next.hp = 0;
    next.isDead = true;
    next.banished = true;
    next.extensions = next.extensions || {};
    next.extensions.v5 = next.extensions.v5 || {};
    next.extensions.v5.banished = true;
  } else if (preview.effect === 'halved-max-hp') {
    next.maxHp = preview.newMaxHp;
    if (next.hp > next.maxHp) {
      next.hp = next.maxHp;
    }
    next.extensions = next.extensions || {};
    next.extensions.v5 = next.extensions.v5 || {};
    // D-15 : le Bmax d'origine est conservé pour la restauration de fin de rencontre (action MJ).
    next.extensions.v5.daemonbaneMaxHp = { originalMaxHp: next.extensions.v5.daemonbaneMaxHp?.originalMaxHp ?? preview.targetMaxHp };
  }

  return {
    status: 'applied',
    target: next,
    preview
  };
}

/** Participants dont les Bmax sont divisées par le Fléau des Démons et pas encore restaurées (rappel de fin de rencontre). */
export function daemonbaneReductions(participants = []) {
  return (participants || []).filter(p => p?.extensions?.v5?.daemonbaneMaxHp)
    .map(p => ({ id: p.id, name: p.name, originalMaxHp: p.extensions.v5.daemonbaneMaxHp.originalMaxHp, maxHp: p.maxHp }));
}

/** Restaure les Bmax d'origine ; les Blessures actuelles ne remontent pas. */
export function restoreDaemonbaneMaxHp(participant) {
  const saved = participant?.extensions?.v5?.daemonbaneMaxHp;
  if (!saved) return participant;
  const next = structuredClone(participant);
  next.maxHp = saved.originalMaxHp;
  delete next.extensions.v5.daemonbaneMaxHp;
  return next;
}

// ============================================================================
// 4. MAIN DE GLOIRE (HAND OF GLORY) — PROFIL DE BASE ET SURPUISSANCE À +6 DR
// ============================================================================

export const HOG_COST_REMOVE_BROKEN = 3;
export const HOG_COST_PURIFY = 8;
export const HAND_OF_GLORY_ELIGIBLE_STATS = Object.freeze(['CC', 'CT', 'F', 'E', 'I', 'Ag']);

/**
 * Prévisualisation de Main de Gloire (base ou surpuissance à +6 DR).
 * RÈGLE CONFIRMÉE :
 * - Profil de base (0 DR de surpuissance) : +3d10 à 1 caractéristique choisie parmi CC, CT, F, E, I, Ag OU Mouvement +2.
 * - Profil surpuissant (+6 DR de surpuissance) : +3d10 à 4 caractéristiques choisies parmi CC, CT, F, E, I, Ag ET Mouvement +2.
 * - Même jet 3d10 partagé pour tous les alliés affectés.
 * - Bmax inchangé malgré le bonus d'Endurance.
 */
export function previewHandOfGlory({
  caster,
  targets = [],
  chosenStats = [],
  roll3d10 = null,
  tier = null,
  movementOnly = false,
  options = {}
} = {}) {
  const uniqueStats = [...new Set(Array.isArray(chosenStats) ? chosenStats : [])];
  if(uniqueStats.some(s => !HAND_OF_GLORY_ELIGIBLE_STATS.includes(s))) throw new Error('Main de Gloire : Mouvement (M) ne fait pas partie de chosenStats ; utiliser le mode Mouvement.');
  const validStats = uniqueStats.filter(s => HAND_OF_GLORY_ELIGIBLE_STATS.includes(s));

  const resolvedTier = tier
    || options.tier
    || options.hogTier
    || (movementOnly || uniqueStats.includes('M') ? 'movement' : (validStats.length === 1 ? 'base' : 'overcast6'));

  // Jet 3d10 partagé
  const roll = roll3d10 === null || roll3d10 === undefined || roll3d10 === '' ? null : Number(roll3d10);
  if (roll !== null && (!Number.isInteger(roll) || roll < 3 || roll > 30)) {
    throw new TypeError('Jet 3d10 invalide (doit être entre 3 et 30)');
  }
  if (roll === null && resolvedTier !== 'movement') {
    return { spellName: 'Main de Gloire', tier: resolvedTier, ready: false, missing: ['roll3d10'], summary: 'Saisir le jet 3d10 commun (3 à 30).' };
  }

  if (resolvedTier === 'movement') {
    const statModifiers = { M: 2 };
    return {
      spellName: 'Main de Gloire',
      tier: 'movement',
      requiredOvercastSl: 0,
      chosenStats: ['M'],
      roll3d10: roll,
      statModifiers,
      preserveMaxHp: true,
      summary: `Mouvement +2 pour tous les alliés affectés. Bmax inchangé.`,
      ready: true
    };
  }

  if (resolvedTier === 'base') {
    if (validStats.length !== 1) {
      throw new Error('Main de Gloire (base) exige exactement 1 caractéristique parmi CC, CT, F, E, I, Ag (ou Mouvement +2).');
    }
    const statModifiers = { [validStats[0]]: roll };
    return {
      spellName: 'Main de Gloire',
      tier: 'base',
      requiredOvercastSl: 0,
      chosenStats: validStats,
      roll3d10: roll,
      statModifiers,
      preserveMaxHp: true,
      summary: `+${roll} à ${validStats[0]}. Même bonus pour tous les alliés. Bmax inchangé.`,
      ready: true
    };
  }

  if (validStats.length !== 4) {
    throw new Error('Main de Gloire (+6 DR) exige exactement 4 caractéristiques distinctes parmi CC, CT, F, E, I, Ag.');
  }

  const statModifiers = {};
  for (const s of validStats) {
    statModifiers[s] = roll;
  }
  statModifiers.M = 2; // Mouvement +2

  return {
    spellName: 'Main de Gloire (+6 DR)',
    tier: 'overcast6',
    requiredOvercastSl: 6,
    chosenStats: validStats,
    roll3d10: roll,
    statModifiers,
    preserveMaxHp: true,
    summary: `+${roll} à ${validStats.join(', ')}, Mouvement +2. Même bonus pour tous les alliés. Bmax inchangé.`,
    ready: true
  };
}

/**
 * Application de Main de Gloire (base ou +6 DR) sur les cibles alliées.
 */
export function applyHandOfGlory(targets = [], preview, options = {}) {
  if (!preview || preview.ready === false) {
    throw new TypeError('Aperçu de Main de Gloire invalide');
  }

  const updatedTargets = [];

  for (const target of targets) {
    if (!target) continue;
    const currentMaxHp = Number(target.maxHp) || 12;

    const res = applySpellEffects(target, {
      spellId: options.spellId || 'main-de-gloire',
      casterId: options.caster?.id,cn:options.cn,castExecutionId:options.castExecutionId,unstoppableForce:options.unstoppableForce,
      spellName: 'Main de Gloire',
      statModifiers: preview.statModifiers,
      ...(preview.removeConditions ? { removeConditions: preview.removeConditions } : {}),
      ...(preview.traits ? { traits: preview.traits } : {}),
      duration: options.duration || 1
    }, options);

    const updated = res.participant;
    if (preview.heal) updated.hp = Math.min(currentMaxHp, (Number(updated.hp) || 0) + preview.heal);
    // Bmax STRICTEMENT inchangé malgré le bonus d'Endurance
    updated.maxHp = currentMaxHp;
    // Mouvement : M et movement suivent la couche (applySpellEffects), pas d'écriture directe.

    updatedTargets.push(updated);
  }

  return {
    status: 'applied',
    updatedTargets,
    preview
  };
}

// ============================================================================
// 5. BOUCLIER DE SAPHERY (SHIELD OF SAPHERY)
// ============================================================================

/**
 * Calcul du seuil de Protection du Bouclier de Saphery.
 * RÈGLE CONFIRMÉE :
 * - Protection de base 9+, améliorée de -1 par sort de Haute Magie supplémentaire maintenu.
 * - Pas de plancher ajouté à sa Protection croissante : un seuil calculé <= 1 réussit automatiquement sur 1d10.
 */
export function calculateSapheryWard(otherSpellsCount = 0, baseWard = 9) {
  const count = Math.max(0, Number(otherSpellsCount) || 0);
  const threshold = baseWard - count;
  const isAutomatic = threshold <= 1;

  return {
    baseWard,
    otherSpellsCount: count,
    threshold,
    automaticSuccess: isAutomatic,
    summary: isAutomatic
      ? `Bouclier de Saphery : seuil ${threshold} ≤ 1 → Réussite automatique de la Protection sur 1d10.`
      : `Bouclier de Saphery : Protection ${threshold}+ sur 1d10.`
  };
}

/**
 * Test du Bouclier de Saphery sur un jet de 1d10.
 */
export function testSapheryWard(roll1d10, calculatedWard) {
  if (calculatedWard.automaticSuccess) {
    return {
      roll: roll1d10,
      threshold: calculatedWard.threshold,
      protected: true,
      automatic: true
    };
  }

  const roll = Number(roll1d10);
  if (!Number.isInteger(roll) || roll < 1 || roll > 10) throw new Error('Jet de protection (1d10) requis');
  const protectedSuccess = roll >= calculatedWard.threshold;

  return {
    roll,
    threshold: calculatedWard.threshold,
    protected: protectedSuccess,
    automatic: false
  };
}

// ============================================================================
// 6. FAUX DE SHYISH (SCYTHE OF SHYISH)
// ============================================================================

/**
 * Application des règles de la Faux de Shyish en combat.
 * RÈGLE CONFIRMÉE :
 * - Les Morts-vivants engagés au corps à corps contre le porteur ne peuvent pas bénéficier d'Avantage V5 à leurs tests.
 * - N'annule pas leur Élan (Momentum).
 */
export function applyScytheOfShyishRules({
  target,
  isUndead = false,
  isEngagedWithWielder = false,
  advantageSources = [],
  hasMomentum = false
} = {}) {
  const isTargetUndeadCandidate = isUndead || isTargetUndead(target);

  if (isTargetUndeadCandidate && isEngagedWithWielder) {
    return {
      advantageSuppressed: true,
      allowedAdvantages: [], // Avantage neutralisé contre le porteur
      momentumPreserved: Boolean(hasMomentum), // L'Élan reste conservé
      summary: 'Faux de Shyish : Mort-vivant engagé privé d’Avantage V5. Son Élan reste intact.'
    };
  }

  return {
    advantageSuppressed: false,
    allowedAdvantages: advantageSources,
    momentumPreserved: Boolean(hasMomentum),
    summary: 'Règles standards applicables.'
  };
}

