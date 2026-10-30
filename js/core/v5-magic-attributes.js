import { casterCaracs } from './creature-abilities.js';
import { magicTalentRank } from './v5-magic-talents.js';
import { markCorruptionThresholdTest } from './v5-corruption.js';
/**
 * Attributs de Domaine de Magie V5 (Lore Attributes) — Lot 3.2.
 * Conforme au Livre de base V5 EN v2 pp. 240–255 et au Cadrage Magie V5.
 * Module pur : aucune E/S, aucun tirage implicite, prévisualisations sans mutation d'état.
 */

import { acquireV5Conditions, healV5Wounds } from './v5-effects.js';
import { applySpellEffects } from './v5-magic-effects.js';
import { withMomentum } from './v5-combat-rules.js';
import { previewV5Test, selectV5Test } from './v5-roll.js';
import { armorMaterial, wornArmourPieces } from './v5-armor-material.js';
import { keywordMatches, participantKeywords, resolveKeyword } from './creature-keywords.js';

export const V5_MAGIC_ATTRIBUTES_VERSION = 'v5-magic-attributes-2026-10-10.1';

const fold = str => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export const LORE_ATTRIBUTES = Object.freeze({
  beasts: Object.freeze({ id: 'beasts', wind: 'Ghur', name: 'Domaine des Bêtes' }),
  death: Object.freeze({ id: 'death', wind: 'Shyish', name: 'Domaine de la Mort' }),
  fire: Object.freeze({ id: 'fire', wind: 'Aqshy', name: 'Domaine du Feu' }),
  heavens: Object.freeze({ id: 'heavens', wind: 'Azyr', name: 'Domaine des Cieux' }),
  life: Object.freeze({ id: 'life', wind: 'Ghyran', name: 'Domaine de la Vie' }),
  light: Object.freeze({ id: 'light', wind: 'Hysh', name: 'Domaine de la Lumière' }),
  metal: Object.freeze({ id: 'metal', wind: 'Chamon', name: 'Domaine du Métal' }),
  shadow: Object.freeze({ id: 'shadow', wind: 'Ulgu', name: 'Domaine des Ombres' }),
  high: Object.freeze({ id: 'high', wind: 'Qhaysh', name: 'Haute Magie' }),
  // Domaines du Chaos (V5 pp. 259-260, phase D) : pas de Vent unique.
  nurgle: Object.freeze({ id: 'nurgle', wind: null, name: 'Domaine de Nurgle' }),
  slaanesh: Object.freeze({ id: 'slaanesh', wind: null, name: 'Domaine de Slaanesh' }),
  tzeentch: Object.freeze({ id: 'tzeentch', wind: null, name: 'Domaine de Tzeentch' }),
  // Magie des Ogres (Grande Gueule, AotE2 p. 32).
  maw: Object.freeze({ id: 'maw', wind: null, name: 'Domaine de la Grande Gueule' }),
  // Magie orque (Tribes and Tribulations pp. 98-101).
  'little-waaagh': Object.freeze({ id: 'little-waaagh', wind: null, name: 'Domaine de la Petite Waaagh' }),
  'big-waaagh': Object.freeze({ id: 'big-waaagh', wind: null, name: 'Domaine de la Grande Waaagh' })
});

/**
 * Normalise l'identifiant du domaine.
 */
export function normalizeLoreId(rawLore) {
  const s = fold(rawLore);
  if (/^little-waaagh$|petite.?waaagh|little.?waaagh/.test(s)) return 'little-waaagh';
  if (/^big-waaagh$|grande.?waaagh|big.?waaagh/.test(s)) return 'big-waaagh';
  if (/^maw$|great.?maw|grande.?gueule/.test(s)) return 'maw';
  if (/nurgle/.test(s)) return 'nurgle';
  if (/slaanesh/.test(s)) return 'slaanesh';
  if (/tzeentch/.test(s)) return 'tzeentch';
  if (/bete|beast|ghur/i.test(s)) return 'beasts';
  if (/mort|death|shyish/i.test(s)) return 'death';
  if (/feu|fire|aqshy/i.test(s)) return 'fire';
  if (/cieux|heaven|azyr/i.test(s)) return 'heavens';
  if (/vie|life|ghyran|jade/i.test(s)) return 'life';
  if (/lumiere|light|hysh/i.test(s)) return 'light';
  if (/metal|chamon|or|gold/i.test(s)) return 'metal';
  if (/ombre|shadow|ulgu/i.test(s)) return 'shadow';
  if (/haute|high|qhaysh/i.test(s)) return 'high';
  return null;
}

/**
 * Vérifie si le participant possède le talent Magie Arcanique pour un domaine.
 */
const ARCANE_LORE_PATTERNS = {
  fire: /feu|fire|aqshy/i,
  light: /lumiere|light|hysh/i,
  beasts: /bete|beast|ghur/i,
  death: /mort|death|shyish/i,
  heavens: /cieux|heaven|azyr/i,
  life: /vie|life|ghyran/i,
  metal: /metal|chamon/i,
  shadow: /ombre|shadow|ulgu/i
};

export function hasArcaneMagicLore(participant, loreKey) {
  const talents = Array.isArray(participant?.talents) ? participant.talents : [];
  const lorePattern = ARCANE_LORE_PATTERNS[loreKey];

  if (!lorePattern) return false;

  return talents.some(t => {
    return ((t.status==='resolved' && t.id==='talent-arcane-magic' && magicTalentRank(participant,'arcane-magic') && lorePattern.test(fold(t.specialization))));
  });
}

/** Domaines pour lesquels le participant possède Magie des Arcanes (HEPG p. 80 : un sort d'Arcane suit le Domaine où il a été appris). */
export function arcaneMagicLores(participant) {
  return Object.keys(ARCANE_LORE_PATTERNS).filter(key => hasArcaneMagicLore(participant, key));
}

/**
 * Détecte si un participant porte de l'armure de métal.
 */
export function isTargetWearingMetalArmor(participant) {
  if (participant?.hasMetalArmor === true) return true;
  // Matériau réel de la pièce : la couche (rigide, flexible) n'en dit rien (cuir bouilli, capes). Un matériau inconnu n'est pas présumé métallique.
  return wornArmourPieces(participant).some(item => armorMaterial(item) === 'metal');
}

/** Désignations de nature : jamais le nom du personnage ni une sous-chaîne d'un rôle. */
function natureLabels(participant) {
  return [
    ...(Array.isArray(participant?.traits) ? participant.traits : []),
    ...(Array.isArray(participant?.extensions?.traits) ? participant.extensions.traits : []),
    ...(Array.isArray(participant?.tags) ? participant.tags : []),
    participant?.category || '',
    participant?.species || ''
  ].map(value => fold(typeof value === 'string' ? value : value?.name || value?.nom || value?.id || '').replace(/\s+/g, ' '));
}

// Les parenthèses (valeur du trait, précision de la nature) ne changent pas la désignation.
const UNDEAD_NATURE = /^(?:morts?[- ]?vivants?|undead(?: creatures?)?)(?:\s*\([^)]*\)|\s+\d+\+?)?$/;
const DAEMON_NATURE = /^(?:demons?|daemons?|demoniaques?|daemonic|sanguinaire)(?:\s*\([^)]*\)|\s+\d+\+?)?$/;
const CONSTRUCT_NATURE = /^(?:artificiels?|artificielles?|creatures? artificielles?|constructs?|automates?|automata)(?:\s*\([^)]*\)|\s+\d+\+?)?$/;
const ETHEREAL_NATURE = /^(?:etheres?|etherees?|ethereal(?: creatures?)?)(?:\s*\([^)]*\)|\s+\d+\+?)?$/;

/** Le participant porte ce mot-clé de nature ou un descendant (Squelette est un Mort-vivant) : jamais le nom ni un rôle. */
const carriesKeyword = (participant, id) => keywordMatches(participantKeywords(participant).ids, id);

/** Mort-vivant explicite : une haine ou un rôle « Chasseur de morts-vivants » ne suffit pas. */
export function isTargetUndead(participant) {
  return participant?.isUndead === true || natureLabels(participant).some(label => UNDEAD_NATURE.test(label)) || carriesKeyword(participant, 'mort-vivant');
}

/** Démon explicite, y compris les désignations françaises et anglaises déjà admises. */
export function isTargetDaemon(participant) {
  return participant?.isDaemon === true || natureLabels(participant).some(label => DAEMON_NATURE.test(label)) || carriesKeyword(participant, 'demon');
}

/** Artificiel / Construct explicite. */
export function isTargetConstruct(participant) {
  return participant?.isConstruct === true || natureLabels(participant).some(label => CONSTRUCT_NATURE.test(label)) || carriesKeyword(participant, 'artificiel');
}

/** Éthéré explicite. */
export function isTargetEthereal(participant) {
  return participant?.isEthereal === true || natureLabels(participant).some(label => ETHEREAL_NATURE.test(label)) || carriesKeyword(participant, 'etheree');
}

/** Vérifie un trait ou une nature exacte sans faux positif sur une sous-chaîne (ex: « Chasseur de démons »). */
export function hasTargetNatureOrTrait(participant, traitKey) {
  const key = fold(traitKey);
  if (!key) return false;
  if (key === 'demon' || key === 'daemon' || key === 'demoniaque' || key === 'daemonic') return isTargetDaemon(participant);
  if (key === 'mort-vivant' || key === 'mort vivant' || key === 'undead') return isTargetUndead(participant);
  if (key === 'construct' || key === 'artificiel' || key === 'artificielle' || key === 'automate') return isTargetConstruct(participant);
  if (key === 'ethere' || key === 'etheree' || key === 'ethereal') return isTargetEthereal(participant);
  // Un mot-clé du référentiel (nom, alias, ancêtre) : « contre les Peaux-vertes » vise un Orque.
  const keyword = resolveKeyword(traitKey);
  if (keyword && carriesKeyword(participant, keyword.id)) return true;
  const pattern = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?(?:\\s*\\([^)]*\\)|\\s+\\d+\\+?)?$`);
  return natureLabels(participant).some(label => pattern.test(label));
}

/** Nature vivante commune (V5 p.250). Les Blessures et le décès restent propres à chaque effet. */
export function hasLivingMagicNature(participant) {
  return !isTargetUndead(participant) && !isTargetDaemon(participant)
    && !isTargetConstruct(participant) && !isTargetEthereal(participant);
}

/**
 * Prévisualisation de l'Attribut de Domaine V5 (Lore Attribute).
 * Fonction pure déterministe sans mutation d'état.
 */
export function previewLoreAttribute({
  lore,
  caster,
  targets = [],
  spell = {},
  castingRoll,
  castingSl = 0,
  chosenLore = null, // Pour Haute Magie : choix d'un des 8 Domaines
  options = {}
} = {}) {
  let activeLore = normalizeLoreId(lore || spell.lore);

  // Haute Magie : choix d'un attribut parmi les 8 Domaines (ou aucun)
  if (activeLore === 'high') {
    if (chosenLore) {
      activeLore = normalizeLoreId(chosenLore);
    } else {
      return {
        lore: 'high',
        activeLore: null,
        summary: 'Haute Magie : aucun attribut de domaine choisi.',
        casterEffects: null,
        targetEffects: new Map(),
        damageRules: {}
      };
    }
  }

  if (!activeLore || !LORE_ATTRIBUTES[activeLore]) {
    return {
      lore: null,
      activeLore: null,
      summary: 'Aucun attribut de domaine applicable.',
      casterEffects: null,
      targetEffects: new Map(),
      damageRules: {}
    };
  }

  const bfm = Math.floor((Number(casterCaracs(caster).FM) || 0) / 10);
  const bi = Math.floor((Number(casterCaracs(caster).Int) || 0) / 10);

  let casterEffects = null;
  const targetEffects = new Map();
  const damageRules = {
    ignoreMetalAp: false,
    ignoreNonMagicalAp: false,
    metalDamageBonus: false,
    extraDamagePerTarget: new Map(),
    extraDirectWoundsPerTarget: new Map()
  };

  // Attributs facultatifs (« peut infliger ») : appliqués cible par cible selon `options.attributeTargets` (par défaut : tous).
  const chosen = target => options.attributeTargets?.[target.id] !== false;

  switch (activeLore) {
    case 'beasts': {
      // Bêtes (Ghur, V5 v3 p.245) : le lanceur gagne l'Élan, tous les ennemis vivants à NI mètres perdent le leur (distances non suivies : le MJ ajuste)
      const radius = Number(spell.cn) || null;
      casterEffects = {
        type: 'lore-attribute-beasts',
        lore: 'beasts',
        grantMomentum: true,
        enemiesLoseMomentum: true,
        radius,
        summary: `Le lanceur gagne l’Élan ; les ennemis vivants à ${radius ?? 'NI'} mètres perdent le leur.`
      };
      break;
    }

    case 'death': {
      // Mort (Shyish) : peut infliger 1 état Exténué à toute cible vivante (max 1 seul acquis par cet attribut à la fois)
      for (const target of targets) {
        if (!target) continue;
        const alive = hasLivingMagicNature(target) && Number(target.hp)>0 && !target.dead && !target.isDead;
        if (!alive || !chosen(target)) continue;

        const states = Array.isArray(target.states) ? target.states : [];
        const alreadyHasDeathFatigued = states.some(s => {
          const isFatigued = /extenue|fatigued/i.test(s?.key || s?.name || '');
          return isFatigued && (s?.source?.kind === 'lore-attribute-death' || s?.sourceKind === 'lore-attribute-death');
        });

        if (!alreadyHasDeathFatigued) {
          targetEffects.set(target.id, {
            type: 'lore-attribute-death',
            lore: 'death',
            addCondition: { name: 'Exténué', level: 1, source: { kind: 'lore-attribute-death' } },
            summary: `${target.name || target.id} subit 1 état Exténué (Attribut Mort).`
          });
        }
      }
      break;
    }

    case 'fire': {
      // Feu (Aqshy) : inflige 1 état Enflammé à toute cible affectée sauf si Arcane Magic (Fire)
      for (const target of targets) {
        if (!target) continue;
        const immune = hasArcaneMagicLore(target, 'fire');
        if (!immune && chosen(target)) {
          targetEffects.set(target.id, {
            type: 'lore-attribute-fire',
            lore: 'fire',
            addCondition: { name: 'Enflammé', level: 1, source: { kind: 'lore-attribute-fire' } },
            summary: `${target.name || target.id} subit 1 état Enflammé (Attribut Feu).`
          });
        }
      }
      break;
    }

    case 'heavens': {
      // Cieux (Azyr) :
      // 1. Les sorts infligeant des dégâts ignorent les PA d'armure de métal
      // 2. Le lanceur gagne 1 Point de Chance (Fortune) utilisable jusqu'au début de son prochain Tour
      damageRules.ignoreMetalAp = true;
      casterEffects = {
        type: 'lore-attribute-heavens',
        lore: 'heavens',
        gainFortune: 1,
        expiry: 'startOfNextTurn',
        summary: 'Le lanceur gagne 1 Point de Chance temporaire jusqu’au début de son prochain Tour.'
      };
      break;
    }

    case 'life': {
      // Vie (Ghyran) :
      // 1. Retire tous les états Hémorragique et Exténué des cibles affectées
      // 2. Cibles Morts-vivants subissent BFM Blessures supplémentaires ignorant BE et PA
      for (const target of targets) {
        if (!target) continue;
        const isUndead = isTargetUndead(target);
        // V5 p. 250 : seuls les vivants (ni Artificiel, ni Démoniaque, ni Éthéré, ni Mort-vivant) perdent Hémorragique et Exténué.
        const living = hasLivingMagicNature(target) && Number(target.hp)>0 && !target.dead && !target.isDead;
        const effect = {
          type: 'lore-attribute-life',
          lore: 'life',
          removeConditions: living ? ['hemorragique', 'extenue'] : [],
          extraDirectWounds: isUndead ? bfm : 0,
          summary: `${target.name || target.id} : ${living ? 'retrait des états Hémorragique et Exténué.' : 'non vivant, états conservés.'}${isUndead ? ` Cible Mort-vivante : subit ${bfm} Blessures directes.` : ''}`
        };
        targetEffects.set(target.id, effect);
        if (isUndead && bfm > 0) {
          damageRules.extraDirectWoundsPerTarget.set(target.id, bfm);
        }
      }
      break;
    }

    case 'light': {
      // Lumière (Hysh) :
      // 1. Peut infliger 1 état Aveuglé aux cibles sauf si Arcane Magic (Light)
      // 2. Cibles Démons et Morts-vivants subissent BI Blessures supplémentaires ignorant BE et PA
      for (const target of targets) {
        if (!target) continue;
        const immune = hasArcaneMagicLore(target, 'light');
        const isDaemonOrUndead = isTargetDaemon(target) || isTargetUndead(target);
        const effect = {
          type: 'lore-attribute-light',
          lore: 'light',
          addCondition: !immune && chosen(target) ? { name: 'Aveuglé', level: 1, source: { kind: 'lore-attribute-light' } } : null,
          extraDirectWounds: isDaemonOrUndead ? bi : 0,
          summary: `${target.name || target.id} : ${immune ? 'immunisé à l’aveuglement.' : chosen(target) ? 'gagne 1 état Aveuglé.' : 'Aveuglé facultatif non appliqué.'}${isDaemonOrUndead ? ` Démon/Mort-vivant : subit ${bi} Blessures directes.` : ''}`
        };
        targetEffects.set(target.id, effect);
        if (isDaemonOrUndead && bi > 0) {
          damageRules.extraDirectWoundsPerTarget.set(target.id, bi);
        }
      }
      break;
    }

    case 'metal': {
      // Métal (Chamon, V5 p. 252) : les dégâts ignorent les PA d'armure de métal et gagnent en plus ces PA,
      // ceux de la localisation touchée (lus à la résolution du coup).
      damageRules.ignoreMetalAp = true;
      damageRules.metalDamageBonus = true;
      for (const target of targets) {
        if (!target || !isTargetWearingMetalArmor(target)) continue;
        targetEffects.set(target.id, {
          type: 'lore-attribute-metal',
          lore: 'metal',
          summary: `${target.name || target.id} porte de l’armure de métal : les dégâts ignorent ses PA métalliques et les ajoutent (localisation touchée).`
        });
      }
      break;
    }

    case 'nurgle':
    case 'slaanesh':
    case 'tzeentch': {
      // Domaines du Chaos (V5 pp. 259-260) : effet porté par une couche sur chaque cible du sort ; Nurgle et Slaanesh n'agissent que « tant que le sort est en effet ».
      const instant = /instantan/i.test(String(spell.duration || options.duration || ''));
      const missingRolls = [];
      for (const target of targets) {
        if (!target) continue;
        const name = target.name || target.id;
        if (activeLore === 'nurgle') {
          targetEffects.set(target.id, instant
            ? { type: 'lore-attribute-nurgle', lore: 'nurgle', summary: `${name} : sort instantané, aucun suivi ; toute Blessure suppurée éventuelle est décidée par le MJ (V5 p. 180).` }
            : { type: 'lore-attribute-nurgle', lore: 'nurgle', spellEffect: { specialState: { festeringWoundTest: true } }, summary: `${name} : toute Blessure subie pendant le sort exige le Test de Blessure Suppurée (V5 p. 180, à jouer par le MJ).` });
        } else if (activeLore === 'slaanesh') {
          targetEffects.set(target.id, instant
            ? { type: 'lore-attribute-slaanesh', lore: 'slaanesh', summary: `${name} : sort instantané, aucun suivi.` }
            : { type: 'lore-attribute-slaanesh', lore: 'slaanesh', spellEffect: { specialState: { resistanceModifiers: { Animosité: -2, Haine: -2, Corruption: -2, Peur: 2, Terreur: 2 } } }, summary: `${name} : −2 DR pour résister à Animosité, Haine et Corruption, +2 DR pour résister à Peur et Terreur.` });
        } else {
          const roll = options.attributeRolls?.[target.id]?.corruptionRoll;
          if (!Number.isInteger(roll) || roll < 1 || roll > 100) { missingRolls.push(target.id); continue; }
          const skill = (target.skills || []).find(sk => fold(sk?.name) === 'endurance');
          const score = Number(skill?.total ?? skill?.value ?? target.caracs?.E) || 0;
          const test = selectV5Test(previewV5Test({ score, roll }), 'keep');
          targetEffects.set(target.id, test.success
            ? { type: 'lore-attribute-tzeentch', lore: 'tzeentch', test: { roll, success: true, sl: test.sl }, spellEffect: { tempFortunePoints: 1, duration: 'Spéciale' }, summary: `${name} : Test de Corruption réussi (${roll}), +1 Point de Chance jusqu’à la fin de la rencontre.` }
            : { type: 'lore-attribute-tzeentch', lore: 'tzeentch', test: { roll, success: false, sl: test.sl }, corruptionGain: 1, summary: `${name} : Test de Corruption raté (${roll}), +1 Point de Corruption.` });
        }
      }
      if (missingRolls.length) return { lore: activeLore, loreName: LORE_ATTRIBUTES[activeLore].name, casterEffects: null, targetEffects, damageRules, missingRolls, missingLabel: 'd100 du Test de Corruption', ready: false };
      break;
    }

    case 'maw': {
      // Grande Gueule (AotE2 p. 32) : après un sort réussi, d10 de l'offrande ; 10 ou au moins égal au NI : le lanceur récupère NI Blessures.
      const roll = options.attributeRolls?.[caster?.id]?.mawRoll;
      const cn = Number(spell.cn) || 0;
      if (!Number.isInteger(roll) || roll < 1 || roll > 10) return { lore: 'maw', loreName: LORE_ATTRIBUTES.maw.name, casterEffects: null, targetEffects, damageRules, missingRolls: [caster?.id || 'lanceur'], missingLabel: 'd10 de l’offrande (Grande Gueule)', ready: false };
      const heals = roll === 10 || roll >= cn;
      casterEffects = { type: 'lore-attribute-maw', lore: 'maw', roll, healWounds: heals ? cn : 0, summary: heals ? `Offrande : d10 ${roll}, le lanceur récupère ${cn} Blessures.` : `Offrande : d10 ${roll}, aucun soin.` };
      break;
    }

    case 'little-waaagh': {
      // Petite Waaagh (L12 p. 98) : avec au moins 1 DR au Test d'incantation, le Chaman peut en acheter un Point de Chance (jusqu'à la fin de la rencontre, au-delà de son maximum).
      if (options.waaaghFortune === true && Number(castingSl) >= 1) {
        casterEffects = { type: 'lore-attribute-little-waaagh', lore: 'little-waaagh', gainFortune: 1, summary: 'Petite Waaagh : 1 DR converti en 1 Point de Chance jusqu’à la fin de la rencontre.' };
      }
      break;
    }

    case 'big-waaagh': {
      // Grande Waaagh (L12 p. 100) : les Orques, Gobelins et Hobgobelins à moins de Bonus de Force Mentale mètres perdent leurs états Brisé ; positions non suivies, appliqué par le MJ.
      casterEffects = { type: 'lore-attribute-big-waaagh', lore: 'big-waaagh', reminderOnly: true, summary: 'Grande Waaagh : les Orques, Gobelins et Hobgobelins à portée perdent leurs états Brisé (à retirer par le MJ).' };
      break;
    }

    case 'shadow': {
      // Ombres (Ulgu) :
      // Tout sort de protection confère au lanceur +2 DR aux tests de Discrétion pour la durée du sort
      // V5 p. 254 : les sorts d'Ombres qui infligent des dégâts ignorent tous les PA non magiques.
      damageRules.ignoreNonMagicalAp = true;
      const isProtection = spell.isProtection === true || spell.hasWard === true || options.isProtectionSpell === true || Boolean(spell.effects?.ward || spell.effects?.apModifiers || spell.effects?.damageReduction || spell.effects?.apFloor);
      if (isProtection) {
        casterEffects = {
          type: 'lore-attribute-shadow',
          lore: 'shadow',
          testModifiers: [{ skill: 'Discrétion', sl: 2 }],
          duration: spell.duration || 'sort',
          summary: 'Sort de protection : le lanceur gagne +2 DR aux tests de Discrétion pour la durée du sort.'
        };
      }
      break;
    }
  }

  return {
    lore: activeLore,
    loreName: LORE_ATTRIBUTES[activeLore]?.name,
    casterEffects,
    targetEffects,
    damageRules,
    ready: true
  };
}

/**
 * Application atomique de l'Attribut de Domaine sur les participants.
 */
export function applyLoreAttribute(state, preview, options = {}) {
  if (!preview || preview.ready === false) {
    throw new TypeError('Aperçu d’attribut de domaine invalide');
  }

  const { casterEffects, targetEffects } = preview;
  const updatedParticipants = new Map();

  // 1. Effets sur le lanceur
  if (casterEffects && options.caster) {
    const caster = structuredClone(options.caster);
    if (casterEffects.lore === 'beasts') {
      // Le lanceur gagne l'Élan (sauf Peur) ; les ennemis vivants fournis par l'appelant (camp hostile) perdent le leur.
      updatedParticipants.set(caster.id, withMomentum(caster, true));
      for (const enemy of options.enemies || []) {
        if (enemy.id === caster.id || !hasLivingMagicNature(enemy) || !(Number(enemy.hp) > 0)) continue;
        updatedParticipants.set(enemy.id, withMomentum(structuredClone(updatedParticipants.get(enemy.id) || enemy), false));
      }
    } else if (casterEffects.lore === 'heavens') {
      const res=applySpellEffects(caster,{spellId:options.spellId || 'lore-attribute-heavens',spellName:'Attribut des Cieux',tempFortunePoints:casterEffects.gainFortune,duration:'Spéciale',expiresAtNextTurnOf:caster.id,appliedAtTurnSerial:options.turnSerial ?? 0,cn:options.cn,castExecutionId:options.castExecutionId,casterId:caster.id},{...options,overcastDurationMultiplier:1});
      updatedParticipants.set(caster.id,res.participant);
    } else if (casterEffects.lore === 'little-waaagh') {
      const res = applySpellEffects(caster, { spellId: options.spellId || 'lore-attribute-little-waaagh', spellName: 'Attribut de la Petite Waaagh', tempFortunePoints: casterEffects.gainFortune, duration: 'Spéciale', cn: options.cn, castExecutionId: options.castExecutionId, casterId: caster.id }, { ...options, overcastDurationMultiplier: 1 });
      updatedParticipants.set(caster.id, res.participant);
    } else if (casterEffects.lore === 'maw') {
      if (casterEffects.healWounds > 0) caster.hp = Math.min(Number(caster.maxHp ?? Infinity), (Number(caster.hp) || 0) + casterEffects.healWounds);
      updatedParticipants.set(caster.id, caster);
    } else if (casterEffects.lore === 'shadow') {
      // +2 DR Discrétion
      const res = applySpellEffects(caster, {
        spellId: 'lore-attribute-shadow',
        spellName: 'Attribut Domaine des Ombres',
        testModifiers: { 'Discrétion': 2 },
        cn:options.cn,castExecutionId:options.castExecutionId,casterId:caster.id,
        duration: casterEffects.duration
      }, options);
      updatedParticipants.set(caster.id, res.participant);
    }
  }

  // 2. Effets sur les cibles
  const targets = options.targets || [];
  for (const target of targets) {
    const eff = targetEffects.get(target.id);
    if (!eff) continue;

    let currentTarget = structuredClone(updatedParticipants.get(target.id) || target);

    // Domaines du Chaos : Point de Corruption et couche d'effet portée par la cible.
    if (eff.corruptionGain) {
      const v5 = currentTarget.extensions?.v5 || {};
      currentTarget.extensions = { ...(currentTarget.extensions || {}), v5: { ...v5, corruptionPoints: (Number(v5.corruptionPoints) || 0) + eff.corruptionGain } };
      Object.assign(currentTarget, markCorruptionThresholdTest(currentTarget));
    }
    if (eff.spellEffect) {
      currentTarget = applySpellEffects(currentTarget, {
        spellId: 'lore-attribute-' + eff.lore, spellName: 'Attribut ' + (LORE_ATTRIBUTES[eff.lore]?.name || eff.lore),
        cn: options.cn, castExecutionId: options.castExecutionId, casterId: options.caster?.id,
        duration: eff.spellEffect.duration || options.duration, ...eff.spellEffect
      }, options).participant;
    }

    // Ajout d'état
    if (eff.addCondition) {
      const receipt = acquireV5Conditions(currentTarget, [eff.addCondition], {
        round: options.round ?? 1
      });
      currentTarget = receipt.participant;
    }

    // Retrait d'états (ex: Vie - Hémorragique et Exténué)
    if (eff.removeConditions && Array.isArray(eff.removeConditions)) {
      currentTarget.states = (currentTarget.states || []).filter(s => {
        const key = fold(s.key || s.name || '');
        return !eff.removeConditions.some(rem => key.includes(rem));
      });
    }

    // Blessures directes supplémentaires (ex: Vie vs Mort-vivant, Lumière vs Démon/Mort-vivant)
    if (eff.extraDirectWounds && eff.extraDirectWounds > 0) {
      const currentHp = Number(currentTarget.hp) || 0;
      currentTarget.hp = Math.max(0, currentHp - eff.extraDirectWounds);
    }

    updatedParticipants.set(currentTarget.id, currentTarget);
  }

  return {
    status: 'applied',
    updatedParticipants,
    preview
  };
}
