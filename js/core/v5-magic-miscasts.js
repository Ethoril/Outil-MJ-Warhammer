import { uid } from './models.js';
import {activeMagicTalent, prepareMiscastOptions} from './v5-magic-talents.js';
/**
 * Moteur des Incidents Magiques (Miscasts) V5 — Lot 3.1.
 * Conforme au Cahier des charges Lot 3 et au Cadrage Magie V5.
 * Module pur : aucune E/S, aucun tirage implicite, prévisualisations sans mutation d'état.
 */
import { MAGIC_DATA } from '../data/magic.js';
import { normalizeV5Roll } from './v5-roll.js';
import { acquireV5Conditions } from './v5-effects.js';
import { getV5Fortune, commitV5Resources } from './v5-resources.js';

export const V5_MAGIC_MISCASTS_VERSION = 'v5-magic-miscasts-2026-10-10.1';

/**
 * Normalisation de chaîne pour comparaison insensible à la casse et aux accents.
 */
const fold = str => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * Recherche directe de l'entrée dans une table de MAGIC_DATA.
 */
export function lookupMiscastEntry(tableKey, roll) {
  const table = MAGIC_DATA[tableKey] || MAGIC_DATA.MINOR;
  const lookupRoll = Math.max(1, Number(roll) || 1);
  return table.find(e => lookupRoll <= e.max) || table[table.length - 1];
}

const DIE_BOUNDS = { d10: [1, 10], '2d10': [2, 20], '3d10': [3, 30], d100: [1, 100] };
const DIE_LABELS = { roll: 'jet d’incident (1d100)', miscastRoll: 'jet d’incident (1d100)', majorRoll: 'jet Majeur d’incident (1d100)', lossRoll: 'perte de réserve (1d10)', duration: 'dé de durée de l’incident', strength: 'dé de Force de l’incident (1d10)', distance: 'dé de distance de l’incident', damage: 'dé de dégâts de l’incident (1d10)', location: 'membre gelé' };

/**
 * Dé saisi par le MJ : entier dans les bornes du dé, sinon null (aucun tirage ni repli implicite).
 */
export function explicitMagicDie(value, die = 'd100') {
  if (value === undefined || value === null || value === '') return null;
  const number = value === '00' && die === 'd100' ? 100 : Number(value);
  const [min, max] = DIE_BOUNDS[die];
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

// L-07 : les jets supplémentaires de l'incident 91-95 (`additionalRolls[i]`, `additionalSecondaryRolls[i].dé`) sont nommés pour le MJ.
const dieLabel = key => {
  const extra = /^additionalRolls\[(\d)\]$/.exec(key), secondary = /^additionalSecondaryRolls\[(\d)\]\.(\w+)$/.exec(key);
  if (extra) return `jet supplémentaire n° ${Number(extra[1]) + 1} de l’incident (1d100, de 1 à 90)`;
  if (secondary) return `${DIE_LABELS[secondary[2]] || secondary[2]} du jet supplémentaire n° ${Number(secondary[1]) + 1}`;
  return DIE_LABELS[key] || key;
};
export function missingMagicDiceMessage(missing = []) {
  return `Saisir : ${missing.map(dieLabel).join(', ')}.`;
}

/**
 * Parse et structure les effets secondaires et dés tirés pour chaque incident.
 * Chaque dé absent ou hors bornes est ajouté à `missing` ; sa valeur reste null.
 */
function buildMiscastDetails({ tableKey, entry, roll, secondaryRolls = {}, bfm = 0, isHighMagic = false, missing = [] }) {
  const sec = {...secondaryRolls,duration:secondaryRolls.duration ?? secondaryRolls.duration1d10,strength:secondaryRolls.strength ?? secondaryRolls.conditions1d10,damage:secondaryRolls.damage ?? secondaryRolls.damage1d10,distance:secondaryRolls.distance ?? secondaryRolls.distance1d10};
  const die = (keys, kind) => {
    for (const key of [].concat(keys)) {
      const value = explicitMagicDie(sec[key], kind);
      if (value !== null) return value;
    }
    missing.push([].concat(keys)[0]);
    return null;
  };
  const max = entry.max;

  // Table MINOR
  if (tableKey === 'MINOR') {
    if (max <= 5) {
      // Langue maladroite : −1 DR aux Tests de Langue pendant 1d10 Rounds
      const duration = die('duration', 'd10');
      return {
        type: 'penalty',
        duration: { value: duration, unit: 'rounds' },
        slModifier: -1,
        targetSkillCategory: 'Langue',
        summary: `−1 DR aux Tests de Langue pendant ${duration} Round(s).`
      };
    }
    if (max <= 10) {
      // Signe de sorcière : 1 mile
      return {
        type: 'narrative',
        range: '1 mile',
        summary: 'La prochaine créature vivante née dans un rayon de 1 mile est mutée.'
      };
    }
    if (max <= 15) {
      // Distraction : En combat Surpris, sinon stupéfait
      return {
        type: 'condition',
        conditionsGained: ['Surpris'],
        summary: 'En combat : gagnez Surpris. Sinon : momentanément stupéfait.'
      };
    }
    if (max <= 20) {
      // Rébellion intestinale : Souillé
      return {
        type: 'condition',
        conditionsGained: ['Souillé'],
        summary: 'Gagnez Souillé.'
      };
    }
    if (max <= 25) {
      // Délié
      return {
        type: 'narrative',
        summary: 'Vos boucles et lacets se défont ; équipement et armures peuvent tomber ou glisser.'
      };
    }
    if (max <= 30) {
      // Tenue indisciplinée : 1 Enchevêtré ; Force 1d10 × 5
      const strengthRoll = die('strength', 'd10');
      const sourceStrength = strengthRoll === null ? null : strengthRoll * 5;
      return {
        type: 'condition',
        conditionsGained: ['Enchevêtré'],
        strengthRoll,
        sourceStrength,
        summary: `Gagnez 1 Enchevêtré (Force de la source : ${sourceStrength}).`
      };
    }
    if (max <= 35) {
      // Visions impies : 1 Aveuglé ; Test de Calme (+0 DR) ou second Aveuglé
      return {
        type: 'condition',
        conditionsGained: ['Aveuglé'],
        testRequired: { skill: 'Calme', slModifier: 0, failureEffect: 'second Aveuglé' },
        summary: 'Gagnez 1 Aveuglé ; Test de Calme (+0 DR) ou gagnez-en un second.'
      };
    }
    if (max <= 40) {
      // Lait caillé : 1d100 yards
      const distance = die('distance', 'd100');
      return {
        type: 'narrative',
        rangeYards: distance,
        summary: `Tout le lait dans un rayon de ${distance} yards tourne instantanément.`
      };
    }
    if (max <= 45) {
      // Souffle glacial : BFM yards, 1 minute (6 rounds)
      const rangeYards = Math.max(1, Number(bfm) || 1);
      return {
        type: 'aura',
        rangeYards,
        duration: { value: 1, unit: 'minutes', rounds: 6 },
        testRequired: { skill: 'Résistance', slModifier: 0, failureEffect: '−1 DR aux Tests CT, Agi, Dex' },
        summary: `Souffle glacial à ${rangeYards} yards pendant 1 minute : Test de Résistance (+0 DR) ou −1 DR.`
      };
    }
    if (max <= 50) {
      // Rupture : 1 Hémorragique
      return {
        type: 'condition',
        conditionsGained: ['Hémorragique'],
        summary: 'Gagnez 1 Hémorragique.'
      };
    }
    if (max <= 55) {
      // Malédiction de la sobriété : 1d100 yards
      const distance = die('distance', 'd100');
      return {
        type: 'narrative',
        rangeYards: distance,
        summary: `Tout l’alcool dans un rayon de ${distance} yards devient amer et infect.`
      };
    }
    if (max <= 60) {
      // L’horreur ! : Test de Psychologie Difficile (−2 DR) ou 1 Brisé
      return {
        type: 'test',
        testRequired: { skill: 'Psychologie', slModifier: -2, failureEffect: '1 Brisé' },
        conditionsGainedOnFailure: ['Brisé'],
        summary: 'Test de Psychologie Difficile (−2 DR) ou gagnez 1 Brisé.'
      };
    }
    if (max <= 65) {
      // Vue assombrie : perte Seconde vue ; −2 DR Focalisation pendant 1d10 heures
      const duration = die('duration', 'd10');
      return {
        type: 'penalty',
        duration: { value: duration, unit: 'hours' },
        slModifier: -2,
        targetSkillCategory: 'Focalisation',
        talentLost: 'Seconde vue',
        summary: `Perdez Seconde vue ; −2 DR aux Tests de Focalisation pendant ${duration} heure(s).`
      };
    }
    if (max <= 70) {
      // Hurlement intérieur : 1 Assourdi pendant 1d10 Rounds
      const duration = die('duration', 'd10');
      return {
        type: 'condition',
        conditionsGained: ['Assourdi'],
        duration: { value: duration, unit: 'rounds' },
        summary: `Gagnez 1 Assourdi pendant ${duration} Round(s).`
      };
    }
    if (max <= 75) {
      // Régurgitation : Souillé et 1 Sonné pendant 1d10 Rounds
      const duration = die('duration', 'd10');
      return {
        type: 'condition',
        conditionsGained: ['Souillé', 'Sonné'],
        duration: { value: duration, unit: 'rounds', targetCondition: 'Sonné' },
        summary: `Gagnez Souillé et 1 Sonné (Sonné pendant ${duration} Round(s)).`
      };
    }
    if (max <= 80) {
      // Murmures mortels : Test de Calme Accessible (+2 DR) ou 1 Corruption
      return {
        type: 'test',
        testRequired: { skill: 'Calme', slModifier: 2, failureEffect: '1 Point de Corruption' },
        corruptionOnFailure: 1,
        summary: 'Test de Calme Accessible (+2 DR) ou gagnez 1 Point de Corruption.'
      };
    }
    if (max <= 85) {
      // Malédiction de corruption : 1 Point de Corruption
      return {
        type: 'corruption',
        corruptionPoints: 1,
        summary: 'Gagnez 1 Point de Corruption.'
      };
    }
    if (max <= 90) {
      // Marqué par la magie (ou si Haute Magie : 1d10 jours d'épuisement magique)
      if (isHighMagic) {
        const burnoutDays = die('duration', 'd10');
        return {
          type: 'burnout',
          burnout: { active: true, permanent: false, days: burnoutDays, source: 'miscast-mark' },
          summary: `Haute Magie : ${burnoutDays} jour(s) d’épuisement magique.`
        };
      }
      return {
        type: 'permanent-mark',
        summary: 'Le Vent utilisé laisse une marque permanente sur votre corps.'
      };
    }
    if (max <= 95) {
      // Multiplication d’infortune : 2 jets sur la table sans modificateurs (relance si 91-100)
      return {
        type: 'multi-roll',
        summary: 'Lancez deux fois sur cette table sans modificateurs (relancez chaque résultat 91-100).'
      };
    }
    // max <= 100 : Chaos en cascade
    return {
      type: 'cascade',
      summary: 'Chaos en cascade : lancez sur la table Majeure.'
    };
  }

  // Table MAJOR
  if (max <= 5) {
    // Propos ésotériques : 1d10 Rounds sans communication verbale ni Langue
    const duration = die('duration', 'd10');
    return {
      type: 'restriction',
      duration: { value: duration, unit: 'rounds' },
      restrictions: ['communication verbale', 'Compétence Langue'],
      summary: `Incapable de communiquer verbalement ou d’utiliser Langue pendant ${duration} Round(s).`
    };
  }
  if (max <= 10) {
    // Puanteur infernale : Trait Distracting pendant 1d10 heures
    const duration = die('duration', 'd10');
    return {
      type: 'trait',
      duration: { value: duration, unit: 'hours' },
      traitsGained: ['Distracting'],
      summary: `Gagnez le Trait Distracting pendant ${duration} heure(s).`
    };
  }
  if (max <= 15) {
    // Poupée de chiffon : 1d10 yards, 1d10 Dégâts (ignore PA, réduit par BE), À Terre
    const distance = die(['distance', 'distanceRoll'], 'd10');
    const damage = die(['damage', 'woundsRoll', 'wounds'], 'd10');
    return {
      type: 'damage-movement',
      distanceYards: distance,
      rawDamage: damage,
      armorIgnored: true,
      reducedByBE: true,
      conditionsGained: ['À Terre'],
      summary: `Projeté de ${distance} yards : ${damage} Dégâts (ignore PA, réduit par BE), puis À Terre.`
    };
  }
  if (max <= 20) {
    // Drain de puissance : Talent utilisé inutilisable pendant 1d10 minutes
    const duration = die(['duration', 'durationRoll'], 'd10');
    return {
      type: 'talent-disabled',
      duration: { value: duration, unit: 'minutes' },
      summary: `Le Talent utilisé devient inutilisable pendant ${duration} minute(s).`
    };
  }
  if (max <= 25) {
    // Lévitation : 1d10 yards du sol pendant 1d10 minutes
    const distance = die(['distance', 'distanceRoll'], 'd10');
    const duration = die(['duration', 'durationRoll'], 'd10');
    return {
      type: 'levitation',
      heightYards: distance,
      duration: { value: duration, unit: 'minutes' },
      fallAtEnd: true,
      summary: `Flotte à ${distance} yards pendant ${duration} minute(s), puis chute.`
    };
  }
  if (max <= 30) {
    // Choc aethyrique : perdez 1d10 Blessures sans BE ni PA. Test Résistance (+2 DR) ou Sonné
    const damage = die(['damage', 'woundsRoll', 'wounds'], 'd10');
    return {
      type: 'wounds-loss',
      woundsLost: damage,
      ignoresBEAndPA: true,
      testRequired: { skill: 'Résistance', slModifier: 2, failureEffect: '1 Sonné' },
      conditionsGainedOnFailure: ['Sonné'],
      summary: `Perdez ${damage} Blessure(s) (sans BE ni PA). Test de Résistance (+2 DR) ou 1 Sonné.`
    };
  }
  if (max <= 35) {
    // Secousse du Chaos : 1d100 yards, Test Athlétisme (+2 DR) ou À Terre
    const distance = die('distance', 'd100');
    return {
      type: 'aoe-test',
      rangeYards: distance,
      testRequired: { skill: 'Athlétisme', slModifier: 2, failureEffect: 'À Terre' },
      conditionsGainedOnFailure: ['À Terre'],
      summary: `Créatures à ${distance} yards : Test d’Athlétisme Accessible (+2 DR) ou À Terre.`
    };
  }
  if (max <= 40) {
    // Regard maudit : 1d10 heures, 1 Aveuglé inamovible, perte Sens de la magie et Seconde vue
    const duration = die('duration', 'd10');
    return {
      type: 'condition',
      conditionsGained: ['Aveuglé'],
      unremovable: true,
      duration: { value: duration, unit: 'hours' },
      talentsLost: ['Perception de la Magie', 'Seconde vue'],
      summary: `1 Aveuglé impossible à retirer et perte des talents sensoriels pendant ${duration} heure(s).`
    };
  }
  if (max <= 45) {
    // Membre gelé : membre aléatoire inutilisable pendant 1d10 heures
    const duration = die('duration', 'd10');
    const location = typeof sec.location === 'string' && sec.location.trim() ? sec.location.trim() : (missing.push('location'), null);
    return {
      type: 'frozen-limb',
      location,
      duration: { value: duration, unit: 'hours' },
      summary: `Membre gelé (${location}) traité comme amputé pendant ${duration} heure(s).`
    };
  }
  if (max <= 50) {
    // Marche de la mort : 1d10 heures
    const duration = die('duration', 'd10');
    return {
      type: 'narrative',
      duration: { value: duration, unit: 'hours' },
      summary: `Plantes foulées flétrissent et meurent pendant ${duration} heure(s).`
    };
  }
  if (max <= 55) {
    // Répulsion aethyrique : −3 DR à tous Tests d'incantation et Focalisation pendant 2d10 heures
    const duration = die('duration', '2d10');
    return {
      type: 'penalty',
      duration: { value: duration, unit: 'hours' },
      slModifier: -3,
      targetSkills: ['Incantation', 'Focalisation'],
      summary: `−3 DR aux Tests d’incantation et de Focalisation pendant ${duration} heure(s).`
    };
  }
  if (max <= 60) {
    // Feu de l’âme : 1 Enflammé
    return {
      type: 'condition',
      conditionsGained: ['Enflammé'],
      summary: 'Gagnez 1 Enflammé.'
    };
  }
  if (max <= 65) {
    // Essaim : nuée engage, se retire après 1d10 Rounds
    const duration = die('duration', 'd10');
    return {
      type: 'combat-event',
      duration: { value: duration, unit: 'rounds' },
      summary: `Nuée de créatures engage le lanceur et se retire après ${duration} Round(s).`
    };
  }
  if (max <= 70) {
    // Clairvoyance chaotique : +1 Chance, +1 Corruption par dépense
    return {
      type: 'fortune-corruption',
      fortuneGained: 1,
      corruptionPerFortuneSpent: 1,
      summary: '+1 Point de Chance pour la séance ; +1 Corruption à chaque dépense de Chance.'
    };
  }
  if (max <= 75) {
    // Mildiou : BFM champs à BFM miles
    const count = Math.max(1, Number(bfm) || 1);
    return {
      type: 'narrative',
      fieldsAffected: count,
      rangeMiles: count,
      summary: `${count} champs situés à ${count} miles frappés de mildiou.`
    };
  }
  if (max <= 80) {
    // Terrible affaiblissement : 1 Corruption, 1 Exténué et À Terre
    return {
      type: 'condition-corruption',
      corruptionPoints: 1,
      conditionsGained: ['Exténué', 'À Terre'],
      summary: 'Gagnez 1 Point de Corruption, 1 Exténué et À Terre.'
    };
  }
  if (max <= 85) {
    // Cœur de traître : plus de régénération de Chance avant temps mort
    return {
      type: 'restriction',
      fortuneRegenBlocked: true,
      summary: 'Impossible de récupérer des Points de Chance avant un temps mort sauf trahison.'
    };
  }
  if (max <= 90) {
    // Voix fantomatiques : BFM yards, Test Calme (+2 DR) ou 1 Corruption
    const rangeYards = Math.max(1, Number(bfm) || 1);
    return {
      type: 'aoe-corruption',
      rangeYards,
      testRequired: { skill: 'Calme', slModifier: 2, failureEffect: '1 Point de Corruption' },
      corruptionOnFailure: 1,
      summary: `Personnages à ${rangeYards} yards : Test de Calme (+2 DR) ou 1 Corruption.`
    };
  }
  if (max <= 95) {
    // Sort oublié
    return {
      type: 'spell-lost',
      summary: 'Le sort tenté devient inaccessible s’il était mémorisé (à réapprendre).'
    };
  }

  // 96+ : Contre-réaction aethyrique
  const rangeYards = Math.max(1, Number(bfm) || 1);
  const noOtherTargets = sec.noOtherTargets === true;
  const damage = noOtherTargets ? null : die('damage', 'd10');
  return {
    type: 'cataclysm',
    rangeYards,
    woundsLost: damage,
    ignoresBEAndPA: true,
    conditionsGained: ['À Terre'],
    headExploded: noOtherTargets,
    summary: noOtherTargets
      ? 'Aucune autre cible à portée : votre tête explose (mort immédiate) !'
      : `Toutes les autres créatures à ${rangeYards} yards (amis comme ennemis) perdent ${damage} Blessures (sans BE/PA) et gagnent À Terre ; le lanceur n’est pas affecté.`
  };
}

/**
 * Résolution pure d'un incident magique V5.
 * Calcule sévérité, modificateurs, atténuations, débordements > 100 et structure complète.
 *
 * @param {Object} options
 * @param {'MINOR'|'MAJOR'} [options.severity='MINOR'] - Niveau d'incident déclaré
 * @param {number} [options.roll=1] - Jet de d100 initial
 * @param {number} [options.modifier=0] - Modificateur au jet (+10 par DR perdu, etc.)
 * @param {boolean} [options.corruptingInfluence=false] - Convertit Mineur en Majeur
 * Les options historiques d’ingrédient sont ignorées.
 * @param {boolean} [options.instinctiveDiction=false] - -20 sur jet Mineur (si <= 0, annulé)
 * @param {boolean} [options.isHighMagic=false] - Règle spéciale Haute Magie (Marque de la magie -> burnout)
 * @param {number} [options.bfm=0] - BFM du lanceur (pour portées, champs, etc.)
 * @param {Object} [options.secondaryRolls={}] - Tirages secondaires fournis (duration, damage, distance, etc.)
 */
const talentLabel = talent => talent.id === 'talent-high-magic' ? 'Haute Magie' : `Magie des Arcanes${talent.lore ? ' (' + talent.lore + ')' : ''}`;
export function resolveMiscast(options = {}) {
  if (options.participant) options = prepareMiscastOptions(options.participant, options);
  const slannLowered = options.severity === 'MAJOR' && options.slannMishapMaster === true;
  const initialSeverity = options.severity === 'MAJOR' && !slannLowered ? 'MAJOR' : 'MINOR';
  if (Number(options.attunementRank) >= (initialSeverity==='MAJOR' || options.corruptingInfluence ? 2 : 1) && !options.attunementResolved) {
    const first=resolveMiscast({...options,attunementResolved:true});
    if(options.miscastRoll2==null || !['first','second'].includes(options.miscastChoice)) return {...first,ready:false,choicesRequired:'attunement',summary:'Harmonisation aethyrique : saisir le second jet et choisir le résultat.'};
    const second=resolveMiscast({...options,roll:normalizeV5Roll(options.miscastRoll2),attunementResolved:true});
    const chosen=options.miscastChoice==='second'?second:first;
    return {...chosen,attunement:{rolls:[first.initialRoll,second.initialRoll],choice:options.miscastChoice},ready:chosen.ready!==false};
  }
  const initialRoll = explicitMagicDie(options.roll, 'd100');
  const secondaryRollsInput = structuredClone(options.secondaryRolls || {});
  if (initialRoll === null) {
    return {
      table: initialSeverity,
      initialSeverity,
      effectiveSeverity: initialSeverity,
      initialRoll: null,
      cancelled: false,
      cancelReason: null,
      entry: null,
      name: 'Incident à déterminer',
      description: 'Jet d’incident (1d100) à saisir.',
      summary: missingMagicDiceMessage(['roll']),
      details: null,
      secondaryRolls: secondaryRollsInput,
      missingSecondaryDice: ['roll'],
      ready: false
    };
  }
  const bfm = Math.max(0, Number(options.bfm) || 0);
  const isHighMagic = Boolean(options.isHighMagic);
  const corruptingInfluence = Boolean(options.corruptingInfluence);
  const hasIngredient = false; // Règle de table : aucun ingrédient ni atténuation associée.
  const instinctiveDiction = Boolean(options.instinctiveDiction);
  const baseModifier = Number(options.modifier) || 0;
  const secondaryRolls = secondaryRollsInput;
  const missing = [];

  // 1. Détermination de la sévérité effective
  // Influence corruptrice convertit tout jet Mineur en Majeur (le lanceur n'est pas sa propre influence)
  let effectiveSeverity = initialSeverity;
  if (corruptingInfluence && effectiveSeverity === 'MINOR') {
    effectiveSeverity = 'MAJOR';
  }

  // 2. Calcul du modificateur numérique
  let effectiveModifier = baseModifier;
  if (effectiveSeverity === 'MINOR' && instinctiveDiction) {
    effectiveModifier -= 20;
  }

  let modifiedRoll = initialRoll + effectiveModifier;

  // Diction instinctive : si jet Mineur modifié <= 0, aucun effet
  if (effectiveSeverity === 'MINOR' && instinctiveDiction && modifiedRoll <= 0) {
    return {
      table: 'MINOR',
      initialSeverity,
      effectiveSeverity: 'NONE',
      initialRoll,
      modifier: effectiveModifier,
      modifiedRoll,
      cancelled: true,
      cancelReason: 'Annulé par diction instinctive (résultat ≤ 0)',
      overflow: 0,
      entry: null,
      name: 'Aucun incident',
      description: 'Incident Mineur annulé par diction instinctive (résultat ≤ 0).',
      details: null,
      secondaryRolls
    };
  }

  // 3. Débordement Mineur > 100 : cascade vers la table Majeure
  // "Si le résultat Mineur modifié dépasse 100, ajoutez cet excédent au jet Majeur (jet Majeur = jet2 + (jet1 - 100))."
  let overflow = 0;
  let finalTable = effectiveSeverity;
  let finalRoll = modifiedRoll;

  const cascades = effectiveSeverity === 'MINOR' && (modifiedRoll > 100 || lookupMiscastEntry('MINOR', modifiedRoll).max === 100);
  if (cascades) {
    // Chaos en cascade : le jet Majeur est un nouveau d100, jamais le jet Mineur repris.
    overflow = Math.max(0, modifiedRoll - 100);
    finalTable = 'MAJOR';
    const majorSecondaryRoll = explicitMagicDie(secondaryRolls.majorRoll ?? options.majorRoll, 'd100');
    if (majorSecondaryRoll === null) {
      const cascadeEntry = lookupMiscastEntry('MINOR', 100);
      return {
        table: 'MAJOR',
        initialSeverity,
        effectiveSeverity,
        initialRoll,
        modifier: effectiveModifier,
        initialModifiedRoll: modifiedRoll,
        modifiedRoll: null,
        finalRoll: null,
        overflow,
        cancelled: false,
        cancelReason: null,
        entry: cascadeEntry,
        name: cascadeEntry.name,
        description: cascadeEntry.eff,
        summary: missingMagicDiceMessage(['majorRoll']),
        details: null,
        secondaryRolls,
        missingSecondaryDice: ['majorRoll'],
        ready: false
      };
    }
    finalRoll = majorSecondaryRoll + overflow;
    secondaryRolls.majorRoll = majorSecondaryRoll;
  }

  // Borne minimale à 1
  finalRoll = Math.max(1, finalRoll);

  // Recherche dans la table finale
  const entry = lookupMiscastEntry(finalTable, finalRoll);
  const details = buildMiscastDetails({
    tableKey: finalTable,
    entry,
    roll: finalRoll,
    secondaryRolls,
    bfm,
    isHighMagic,
    missing
  });
  // V5 p. 239 : Drain de puissance vise le Talent employé pour lancer ; sans sort lancé (Focalisation), le MJ le désigne.
  if (details.type === 'talent-disabled') {
    if (options.usedTalent) { details.talent = structuredClone(options.usedTalent); details.summary = `Le Talent employé pour lancer (${talentLabel(options.usedTalent)}) devient inutilisable pendant ${details.duration.value} minute(s).`; }
    else details.summary += ' Aucun sort lancé : le MJ désigne le Talent concerné (rappel).';
  }
  if (details.type === 'multi-roll') {
    const rolls = secondaryRolls.additionalRolls;
    const results = [];
    for (let index = 0; index < 2; index++) {
      const field = `additionalRolls[${index}]`;
      const extraRoll = explicitMagicDie(Array.isArray(rolls) ? rolls[index] : null, 'd100');
      if (extraRoll === null || extraRoll >= 91) { missing.push(field); continue; }
      const result = resolveMiscast({ severity: 'MINOR', roll: extraRoll, bfm, isHighMagic, usedTalent: options.usedTalent,
        secondaryRolls: secondaryRolls.additionalSecondaryRolls?.[index] || {}, attunementResolved: true });
      results.push(result);
      for (const key of result.missingSecondaryDice || []) missing.push(`additionalSecondaryRolls[${index}].${key}`);
    }
    details.results = results;
    details.summary = missing.length ? 'Multiplication d’infortune : saisir deux résultats de 1 à 90, sans modificateurs, et leurs dés secondaires.'
      : `Multiplication d’infortune : ${results.map(result => result.name).join(' ; ')}.`;
  }
  if (missing.length) details.summary = `${entry.eff} ${missingMagicDiceMessage(missing)}`;

  return {
    ...(details || {}),
    missingSecondaryDice: missing,
    ready: missing.length === 0,
    table: finalTable,
    initialSeverity,
    effectiveSeverity,
    initialRoll,
    modifier: effectiveModifier,
    initialModifiedRoll: modifiedRoll,
    modifiedRoll: finalRoll,
    finalRoll,
    overflow,
    cancelled: false,
    cancelReason: null,
    slannLowered,
    entry,
    name: entry.name,
    description: entry.eff,
    details,
    secondaryRolls
  };
}

/**
 * Prévisualisation d'un incident magique.
 * Déterministe et sans mutation d'état.
 */
export function previewMiscast(options = {}) {
  return resolveMiscast(options);
}

/**
 * Applique un incident magique résolu sur un participant (fonction pure).
 * Préserve les dés tirés, applique les conséquences calculables (états, blessures,
 * épuisement, corruption, traits, pénalités) et génère les rappels explicites.
 */
export function applyMiscastToParticipant(participant, miscast, options = {}) {
  if (!participant || typeof participant !== 'object') {
    throw new TypeError('Participant invalide pour applyMiscastToParticipant');
  }
  const next = structuredClone(participant);
  if (!miscast || miscast.cancelled) {
    return {
      applied: false,
      cancelled: Boolean(miscast?.cancelled),
      cancelReason: miscast?.cancelReason || null,
      participant: next,
      conditionsGained: [],
      woundsLost: 0,
      reminders: miscast?.cancelReason ? [`Incident évité : ${miscast.cancelReason}`] : [],
      miscast: miscast ? structuredClone(miscast) : null
    };
  }

  if (miscast.details?.type === 'multi-roll') {
    const results = miscast.details.results;
    if (miscast.ready === false || !Array.isArray(results) || results.length !== 2 || results.some(result => result.ready === false)) throw new TypeError('Deux résultats d’incident complets requis.');
    let current = next;
    const applications = results.map(result => {
      const receipt = applyMiscastToParticipant(current, result, options);
      current = receipt.participant;
      return receipt;
    });
    current.extensions.v5.lastMiscast = structuredClone(miscast);
    return { applied: true, cancelled: false, cancelReason: null, participant: current, miscast: structuredClone(miscast),
      conditionsGained: applications.flatMap(receipt => receipt.conditionsGained), woundsLost: applications.reduce((sum, receipt) => sum + receipt.woundsLost, 0),
      reminders: applications.flatMap(receipt => receipt.reminders), applications };
  }

  next.extensions = next.extensions || {};
  next.extensions.v5 = next.extensions.v5 || {};
  const clonedMiscast = structuredClone(miscast);
  next.extensions.v5.lastMiscast = clonedMiscast;
  next.extensions.v5.miscastHistory = [
    ...(Array.isArray(next.extensions.v5.miscastHistory) ? next.extensions.v5.miscastHistory : []),
    clonedMiscast
  ];

  const details = miscast.details || {};
  const round = Number.isSafeInteger(options.round) ? options.round : 1;
  const effectId = `miscast-eff-${round}-${miscast.finalRoll ?? 1}-${uid()}`;
  const conditionsBefore = new Set((next.states || []).map(state => state.id));
  const conditionsGained = [];
  let woundsLost = 0;
  const reminders = [];

  const summaryText = details.summary || miscast.description || miscast.name;
  reminders.push(`Incident magique (${miscast.table}, dé ${miscast.finalRoll ?? miscast.modifiedRoll ?? miscast.initialRoll}) — ${miscast.name} : ${summaryText}`);

  // Contre-réaction aéthyrique (Livre de base p. 239) : les Blessures et À Terre visent les autres créatures à portée, jamais le lanceur
  // (D-08). Faute d'effet sur d'autres participants dans cette fonction, un rappel MJ remplace l'application ; seule la tête explosée touche le lanceur.
  const hitsOthers = details.type === 'cataclysm' && details.headExploded !== true;
  if (hitsOthers) {
    reminders.push(`À appliquer par le MJ à chaque autre créature à ${details.rangeYards} yards (alliés compris, lanceur exclu) : ${details.woundsLost} Blessures sans BE ni PA et État À Terre.`);
  }

  // 1. Application des États (Conditions) via acquireV5Conditions
  if (!hitsOthers && Array.isArray(details.conditionsGained) && details.conditionsGained.length > 0) {
    const acquisitions = details.conditionsGained.map(condName => {
      const hasDuration = details.duration?.value && (!details.duration.targetCondition || details.duration.targetCondition === condName);
      return {
        name: condName,
        level: 1,
        duration: hasDuration && details.duration.unit === 'rounds' ? Number(details.duration.value) : null,
        unremovable: Boolean(details.unremovable),
        source: {
          kind: 'miscast',
          table: miscast.table,
          roll: miscast.finalRoll ?? miscast.initialRoll,
          name: miscast.name,
          ...(hasDuration && details.duration.unit !== 'rounds' ? { miscastEffectId: effectId } : {})
        }
      };
    });
    const receipt = acquireV5Conditions(next, acquisitions, {
      round,
      authorId: next.id,
      targetId: next.id,
      participantId: next.id
    });
    Object.assign(next, receipt.participant);
    conditionsGained.push(...details.conditionsGained);
  }

  // 2. Application des Blessures ou Dégâts (ex: Choc aethyrique, Contre-réaction, Poupée de chiffon)
  const currentHp = Number(next.hp) || 0;
  if (!hitsOthers && Number.isFinite(Number(details.woundsLost)) && Number(details.woundsLost) > 0) {
    woundsLost = Number(details.woundsLost);
    next.hp = Math.max(0, currentHp - woundsLost);
  } else if (!hitsOthers && Number.isFinite(Number(details.rawDamage)) && Number(details.rawDamage) > 0) {
    const be = details.reducedByBE ? Math.floor((Number(next.caracs?.E) || 0) / 10) : 0;
    const netDamage = Math.max(0, Number(details.rawDamage) - be);
    woundsLost = Math.min(currentHp, netDamage);
    next.hp = Math.max(0, currentHp - netDamage);
  }

  // 3. Cataclysme : tête explose
  if (details.headExploded === true) {
    woundsLost = currentHp;
    next.hp = 0;
    next.dead = true;
    next.extensions.v5.headExploded = true;
  }

  // 4. Épuisement magique (Haute Magie — Marque de la magie)
  if (details.burnout?.active) {
    next.extensions.v5.burnout = structuredClone(details.burnout);
  }

  // 5. Points de Corruption
  if (Number.isFinite(Number(details.corruptionPoints)) && Number(details.corruptionPoints) > 0) {
    const pts = activeMagicTalent(next,'sanctuary-of-the-mind') ? 0 : Number(details.corruptionPoints);
    next.extensions.v5.corruptionPoints = (Number(next.extensions.v5.corruptionPoints) || 0) + pts;
    reminders.push(pts?`Suivi fiche : +${pts} Point(s) de Corruption (${miscast.name}).`:'Sanctuaire de l’esprit : Corruption de l’incantation évitée.');
  }

  // 6. Gain de Chance (Clairvoyance chaotique)
  if (Number.isFinite(Number(details.fortuneGained)) && Number(details.fortuneGained) > 0) {
    // S-11 : la Chance passe par le registre V5 (`options.fortuneBalance` = solde initialisé, fourni par la commande du Store).
    if (Number.isFinite(options.fortuneBalance)) {
      next.extensions.v5.resources = { ...(next.extensions.v5.resources || {}), fortune: options.fortuneBalance + Number(details.fortuneGained) };
    } else {
      reminders.push(`Chance : +${details.fortuneGained} Point(s) à créditer à la main (compteur de Chance non initialisé ou incident hors commande).`);
    }
    if (details.corruptionPerFortuneSpent) {
      next.extensions.v5.corruptionPerFortuneSpent = Number(details.corruptionPerFortuneSpent);
      reminders.push(`Clairvoyance chaotique : ${details.corruptionPerFortuneSpent} Point de Corruption par Point de Chance dépensé (crédité automatiquement dans l’outil jusqu’à la fin de la séance ; à reporter sur la fiche).`);
    }
  }

  // 7. Traits temporaires (ex: Distracting)
  if (Array.isArray(details.traitsGained) && details.traitsGained.length > 0) {
    next.extensions.v5.baseTraits ??= [...(next.traits || next.extensions.traits || [])];
    next.extensions.v5.temporaryTraits = [
      ...(Array.isArray(next.extensions.v5.temporaryTraits) ? next.extensions.v5.temporaryTraits : []),
      ...details.traitsGained
    ];
    next.traits = Array.from(new Set([...(next.extensions.v5.baseTraits || []), ...next.extensions.v5.temporaryTraits]));
  }

  // 8. Pénalités, restrictions, membre gelé, talents désactivés
  if (['penalty', 'restriction', 'talent-disabled', 'frozen-limb', 'levitation', 'aura', 'trait'].includes(details.type)
    || details.type === 'condition' && details.duration?.unit !== 'rounds' && details.duration?.value) {
    next.extensions.v5.miscastEffects = [
      ...(Array.isArray(next.extensions.v5.miscastEffects) ? next.extensions.v5.miscastEffects : []),
      {
        id: effectId,
        name: miscast.name,
        table: miscast.table,
        roll: miscast.finalRoll,
        ...structuredClone(details),
        conditionIds: (next.states || []).filter(state => !conditionsBefore.has(state.id) && state.source?.miscastEffectId === effectId).map(state => state.id),
        appliedAtRound:round,
        expiresAtRound:details.duration ? round+details.duration.value*({rounds:1,minutes:6,hours:360,days:8640}[details.duration.unit] || 1):undefined,
        remainingMinutes:details.duration ? details.duration.value*({rounds:1/6,minutes:1,hours:60,days:1440}[details.duration.unit] || 0):undefined
      }
    ];
  }

  // 9. Tests requis ou suivi fiche
  if (details.testRequired) {
    const modStr = details.testRequired.slModifier >= 0 ? `+${details.testRequired.slModifier}` : `${details.testRequired.slModifier}`;
    reminders.push(`Test requis (${miscast.name}) : ${details.testRequired.skill} (${modStr} DR) — Échec : ${details.testRequired.failureEffect}.`);
  }
  if (details.type === 'permanent-mark' || details.type === 'spell-lost') {
    reminders.push(`Suivi fiche (${miscast.name}) : ${summaryText}`);
  }

  return {
    applied: true,
    cancelled: false,
    cancelReason: null,
    participant: next,
    conditionsGained,
    woundsLost,
    reminders,
    miscast: clonedMiscast
  };
}

export function isMiscastConditionLocked(participant, state) {
  return (participant?.extensions?.v5?.miscastEffects || []).some(effect => effect.unremovable === true
    && (effect.id === state?.source?.miscastEffectId || (effect.conditionIds || []).includes(state?.id)));
}

/** Nettoyage partagé par l’horloge des incidents ; 1 Round = 10 secondes (D-11). */
export function expireMiscastConsequences(participant, { currentRound = null, minutes = 0 } = {}) {
  const next = structuredClone(participant), v5 = next.extensions?.v5;
  if (!v5?.miscastEffects) return next;
  const removed = [];
  v5.miscastEffects = v5.miscastEffects.flatMap(effect => {
    const after = { ...effect };
    if (Number.isFinite(after.remainingMinutes) && minutes > 0) {
      after.remainingMinutes = Math.max(0, after.remainingMinutes - minutes);
      if (Number.isFinite(after.expiresAtRound)) after.expiresAtRound -= minutes * 6;
    }
    if (currentRound != null && Number.isFinite(after.expiresAtRound) && currentRound >= after.expiresAtRound
      || Number.isFinite(after.remainingMinutes) && after.remainingMinutes <= 0) { removed.push(after); return []; }
    return [after];
  });
  const ids = new Set(removed.flatMap(effect => effect.conditionIds || [])), effectIds = new Set(removed.map(effect => effect.id));
  next.states = (next.states || []).filter(state => !ids.has(state.id) && !effectIds.has(state.source?.miscastEffectId));
  const removedTraits = new Set(removed.flatMap(effect => effect.traitsGained || []));
  if (removedTraits.size) {
    const remainingTraits = [...v5.miscastEffects.flatMap(effect => effect.traitsGained || []), ...(v5.spellEffects || []).flatMap(effect => effect.traits || [])];
    v5.temporaryTraits = Array.from(new Set([...(v5.temporaryTraits || []).filter(trait => !removedTraits.has(trait)), ...remainingTraits]));
    next.traits = Array.from(new Set([...(v5.baseTraits || []), ...v5.temporaryTraits]));
  }
  return next;
}

/**
 * Application d'un incident magique sur un participant ou un Store.
 */
export function applyMiscast(target, preview, options = {}) {
  if (!preview || preview.ready === false) {
    throw new TypeError('Aperçu d’incident incomplet');
  }

  // Si cible est un Store
  if (target && typeof target.executeCommand === 'function') {
    const actorId = options.actorId || target.getCombat()?.currentActorId || target.listParticipants()[0]?.id;
    return target.executeCommand('v5-miscast', draft => {
      const participants = draft.combat?.participants || [];
      const index = participants.findIndex(p => p.id === actorId);
      if (index === -1) throw new Error('Participant introuvable dans le combat');

      const before = structuredClone(draft);
      const appliedResult = applyMiscastToParticipant(participants[index], preview, {
        round: draft.combat?.round ?? 1,
        fortuneBalance: getV5Fortune(draft, participants[index]).balance ?? undefined,
        ...options
      });
      participants[index] = appliedResult.participant;
      if (preview.details?.fortuneGained > 0 && Number.isFinite(getV5Fortune(draft, participants[index]).balance)) {
        const paid = commitV5Resources(before, participants);
        draft.extensions = paid.extensions;
        participants.splice(0, participants.length, ...paid.combat.participants);
      }

      const logText = preview.cancelled
        ? `Incident évité : ${preview.cancelReason}`
        : `Incident magique (${preview.table}) : ${preview.name} — ${preview.details?.summary || preview.description}`;

      draft.log = [
        { id: uid(), ts: Date.now(), kind: 'magic', text: logText },
        ...(draft.log || [])
      ].slice(0, 300);

      return draft;
    });
  }

  // Participant simple
  if (target && (target.id || target.caracs)) {
    const appliedResult = applyMiscastToParticipant(target, preview, options);
    return {
      status: 'applied',
      participant: appliedResult.participant,
      resolution: structuredClone(preview),
      miscastApplication: appliedResult
    };
  }

  throw new TypeError('Cible invalide pour applyMiscast');
}
