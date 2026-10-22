/**
 * Profils de bestiaire (données du jeu, `js/data/bestiary/<livre>.json`) : validation d'un profil et accès par livre.
 * Les valeurs sont celles du livre, imprimées telles quelles : jamais recalculées (BF, Taille et armure compris).
 */
import { activeReferential } from './creature-keywords.js';

export const BESTIARY_STAT_KEYS = Object.freeze(['M', 'CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc']);
export const BESTIARY_KINDS = Object.freeze(['profile', 'template', 'pregenerated-character']);

const isInt = value => Number.isSafeInteger(value);
const isText = value => typeof value === 'string' && value.trim() !== '';

/** Liste des écarts d'un profil (vide si le profil est conforme). */
export function validateBestiaryRecord(record, referential = activeReferential()) {
  const errors = [];
  if (!record || typeof record !== 'object') return ['profil absent'];
  if (!/^E0-P-\d{3,}$/.test(record.id || '')) errors.push('identifiant d’inventaire invalide');
  if (!/^L\d\d$/.test(record.book || '')) errors.push('livre invalide');
  if (!isInt(record.page) || record.page < 1) errors.push('page invalide');
  if (!BESTIARY_KINDS.includes(record.kind)) errors.push('genre inconnu');
  if (!isText(record.name)) errors.push('nom absent');
  if (record.kind === 'template') {
    if (!record.modifiers || typeof record.modifiers !== 'object') errors.push('modificateurs du gabarit absents');
    else for (const [key, value] of Object.entries(record.modifiers)) if (![...BESTIARY_STAT_KEYS, 'W'].includes(key) || !isInt(value)) errors.push(`modificateur ${key} invalide`);
  } else {
    if (!record.stats || typeof record.stats !== 'object') errors.push('caractéristiques absentes');
    else for (const key of BESTIARY_STAT_KEYS) {
      const value = record.stats[key];
      if (value === undefined) errors.push(`caractéristique ${key} absente (null attendu pour une case vide)`);
      else if (value !== null && (!isInt(value) || value < 0)) errors.push(`caractéristique ${key} invalide`);
    }
    if (record.kind === 'profile' && (!isInt(record.wounds) || record.wounds < 1)) errors.push('Blessures invalides');
  }
  for (const attack of record.attacks || []) {
    if (!isText(attack.name)) errors.push('attaque sans nom');
    if (!isInt(attack.damage)) errors.push(`dégâts de ${attack.name} : entier imprimé attendu`);
    if (attack.value !== undefined && !isInt(attack.value)) errors.push(`valeur de ${attack.name} invalide`);
  }
  for (const skill of record.skills || []) if (!isText(skill.name) || !isInt(skill.value)) errors.push(`compétence invalide : ${skill?.name}`);
  for (const trait of [...(record.traits || []), ...(record.optionalTraits || [])]) if (!isText(trait?.name)) errors.push('Trait sans nom');
  for (const keyword of record.keywords || []) if (!referential.terms.has(keyword)) errors.push(`mot-clé inconnu : ${keyword}`);
  const armour = record.armour;
  if (armour) for (const key of ['ap', 'printedTotal', 'toughnessBonus']) if (armour[key] !== undefined && !isInt(armour[key])) errors.push(`armure ${key} invalide`);
  return errors;
}

/** Profils d'un livre : filtre par mot-clé (descendants compris), le MJ pouvant avoir ajouté des termes au référentiel. */
export function filterBestiary(profiles, { keyword = null, text = '', kinds = null } = {}, { matches } = {}) {
  const wanted = String(text || '').trim().toLowerCase();
  return profiles.filter(profile => (!kinds || kinds.includes(profile.kind))
    && (!keyword || matches?.(profile, keyword))
    && (!wanted || [profile.name, profile.nameFr, ...(profile.skills || []).map(skill => skill.name)].some(value => String(value || '').toLowerCase().includes(wanted))));
}
