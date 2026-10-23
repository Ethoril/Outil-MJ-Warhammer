// Capacités propres de profil (lot T12) : Imperial Zoo, Lustria et compléments L18-L26.
// Module pur : chaque capacité de l'inventaire est soit prise en charge par un lot de Traits (T1 à T11), soit un rappel motivé.
// Rien n'est écrit et rien n'est calculé ici : un rappel n'est jamais une preuve d'exécution.

import { CREATURE_ABILITIES } from '../data/creature-abilities.js';

const BY_ID = new Map(CREATURE_ABILITIES.map(entry => [entry.id, entry]));

/** Disposition d'une capacité (`{ id, status: 'covered' | 'reminder', by | motive, … }`) ; `null` hors périmètre. */
export function abilityDisposition(id) {
  return BY_ID.get(id) ?? null;
}

/** Plan d'une capacité : jamais d'effet posé ; le reçu dit qui la prend en charge, ou pourquoi elle reste un rappel. */
export function planCreatureAbility(id) {
  const entry = BY_ID.get(id);
  if (!entry) {
    return { key: id, label: id, available: false, effects: [], unresolved: [`${id} : capacité hors du périmètre T12.`], reminders: [], receipt: { ability: id, blocked: ['hors périmètre'] } };
  }
  const covered = entry.status === 'covered';
  return {
    key: entry.id, label: entry.name, available: covered, effects: [],
    unresolved: covered ? [] : [`${entry.name} : rappel, à jouer par le MJ.`],
    reminders: [entry.summaryFr],
    receipt: covered
      ? { ability: entry.name, coveredBy: entry.by, reminder: entry.summaryFr, blocked: [] }
      : { ability: entry.name, motive: entry.motive, reminder: entry.summaryFr, blocked: [`${entry.name} : rappel seulement`] }
  };
}

const refsOf = participant => {
  const refs = participant?.extensions?.v5?.bestiary?.abilityRefs;
  return Array.isArray(refs) ? [...new Set(refs)] : [];
};

/** Références de capacités propres du participant qui restent de simples rappels. */
export function uncoveredAbilityRefs(participant) {
  return refsOf(participant).filter(id => BY_ID.get(id)?.status === 'reminder');
}

/** Lignes de rappel de fiche pour les capacités propres du participant (une par capacité du périmètre, sans doublon). */
export function creatureAbilityReminders(participant) {
  return refsOf(participant).flatMap(id => {
    const entry = BY_ID.get(id);
    if (!entry) return [];
    return [entry.status === 'covered'
      ? `${entry.name} (${entry.by}) : ${entry.summaryFr}`
      : `Rappel — ${entry.name} : ${entry.summaryFr}`];
  });
}
