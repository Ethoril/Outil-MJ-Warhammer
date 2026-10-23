// Gabarits de bestiaire (lot T11) : un gabarit (`kind: 'template'`, modificateurs signés imprimés) s'applique à un profil importé.
// Module pur : renvoie un nouvel enregistrement de profil, rien n'est écrit. Les valeurs du profil de base ne sont jamais recalculées
// (BF, Taille, armure) ; seules s'ajoutent les modificateurs imprimés du gabarit.
import { BESTIARY_STAT_KEYS, buildParticipantFromBestiary, validateBestiaryRecord } from './bestiary-profiles.js';
import { cloneValue } from './models.js';

const nameOf = entry => (typeof entry === 'string' ? entry : entry?.name ?? '');
const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const sameName = (a, b) => fold(nameOf(a)) === fold(nameOf(b));
const isSize = trait => fold(nameOf(trait)) === 'size';

/**
 * Applique un ou plusieurs gabarits (dans l'ordre) à un profil. Refuse un profil qui est lui-même un gabarit, un gabarit qui n'en est pas un,
 * ou une caractéristique modifiée absente du profil (case vide : jamais inventée). Résultat : `{ record, reminders, errors }` ;
 * `record` est null si `errors` n'est pas vide.
 */
export function applyBestiaryTemplates(base, templates) {
  const list = Array.isArray(templates) ? templates : [templates];
  const errors = [];
  if (!base || base.kind === 'template') errors.push('un gabarit s’applique à un profil de créature ou de personnage, pas à un autre gabarit');
  if (!list.length || list.some(template => template?.kind !== 'template')) errors.push('gabarit attendu (genre « template »)');
  if (errors.length) return { record: null, reminders: [], errors };
  const record = cloneValue(base);
  const reminders = [];
  record.appliedTemplates = [...(base.appliedTemplates || [])];
  for (const template of list) {
    for (const [key, delta] of Object.entries(template.modifiers || {})) {
      if (key === 'W') {
        if (record.wounds === null || record.wounds === undefined) errors.push(`${template.name} : Blessures absentes du profil, modificateur W non appliqué`);
        else record.wounds = Math.max(1, record.wounds + delta);
        continue;
      }
      if (!BESTIARY_STAT_KEYS.includes(key)) { errors.push(`${template.name} : modificateur ${key} inconnu`); continue; }
      if (record.stats[key] === null || record.stats[key] === undefined) { errors.push(`${template.name} : ${key} absente du profil (case vide), modificateur non appliqué`); continue; }
      record.stats[key] = Math.max(0, record.stats[key] + delta);
    }
    for (const skill of template.skills || []) {
      const held = (record.skills ||= []).find(item => sameName(item, skill));
      if (held) held.value += skill.value;
      else { record.skills.push({ ...cloneValue(skill), fromTemplate: template.id }); reminders.push(`${template.name} : compétence ${skill.nameFr || skill.name} (+${skill.value}) absente du profil, ajoutée telle qu’imprimée ; à vérifier sur la caractéristique de base.`); }
    }
    for (const talent of template.talents || []) if (!(record.talents ||= []).some(item => sameName(item, talent))) record.talents.push(cloneValue(talent));
    for (const trait of template.traits || []) {
      record.traits ||= [];
      const at = record.traits.findIndex(item => (isSize(trait) ? isSize(item) : sameName(item, trait)));
      if (at >= 0) record.traits[at] = cloneValue(trait); else record.traits.push(cloneValue(trait));
    }
    if (template.size) record.size = template.size;
    for (const keyword of template.keywords || []) if (!(record.keywords ||= []).includes(keyword)) record.keywords.push(keyword);
    if (template.armour) reminders.push(`${template.name} : armure propre au gabarit non fusionnée avec celle du profil, à lire dans le livre (p. ${template.page}).`);
    if (template.spells?.length) record.spells = [...(record.spells || []), ...cloneValue(template.spells.filter(spell => !(record.spells || []).some(item => sameName(item, spell))))];
    record.appliedTemplates.push(template.id);
    record.name = `${record.name} (${template.name})`;
    if (record.nameFr) record.nameFr = `${record.nameFr} (${template.nameFr || template.name})`;
  }
  if (errors.length) return { record: null, reminders, errors };
  const invalid = validateBestiaryRecord(record);
  return invalid.length ? { record: null, reminders, errors: invalid } : { record, reminders, errors: [] };
}

/** Participant ordinaire d'un profil de la bibliothèque après application de gabarits (identifiants d'inventaire). */
export function buildParticipantFromTemplatedBestiary(baseId, templateIds, options = {}) {
  const { library } = options;
  if (!Array.isArray(library)) throw new Error('bibliothèque de profils requise');
  const base = library.find(profile => profile.id === baseId);
  if (!base) throw new Error(`profil de bestiaire inconnu : ${baseId}`);
  const templates = templateIds.map(id => library.find(profile => profile.id === id));
  if (templates.some(template => !template)) throw new Error('gabarit de bestiaire inconnu');
  const { record, reminders, errors } = applyBestiaryTemplates(base, templates);
  if (!record) throw new Error(`gabarit inapplicable : ${errors.join(' ; ')}`);
  const participant = buildParticipantFromBestiary(baseId, { ...options, library: [record] });
  participant.extensions.v5.bestiary.appliedTemplates = [...record.appliedTemplates];
  participant.extensions.v5.bestiary.templateReminders = reminders;
  return participant;
}
