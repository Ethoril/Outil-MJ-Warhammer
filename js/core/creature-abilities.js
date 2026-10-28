// Capacités propres de profil (lot T12) : Imperial Zoo, Lustria et compléments L18-L26.
// Module pur : chaque capacité de l'inventaire est soit prise en charge par un lot de Traits (T1 à T11), soit un rappel motivé.
// Rien n'est écrit et rien n'est calculé ici : un rappel n'est jamais une preuve d'exécution.

import { CREATURE_ABILITIES } from '../data/creature-abilities.js';
import { F2_H_PROFILE_ABILITIES } from '../data/f2-h-profile-abilities.js';

const BY_ID = new Map(CREATURE_ABILITIES.map(entry => [entry.id, entry]));
const F2_H_BY_KEY = new Map(F2_H_PROFILE_ABILITIES.map(entry => [entry.key, entry]));

/** Plan d'une règle F2-H sur son profil propriétaire. Les résultats ne sont proposés que si les faits de scène sont fournis. */
export function planBestiaryProfileAbility(participant, key, context = {}) {
  const rule = F2_H_BY_KEY.get(key);
  const profileId = participant?.profileId ?? participant?.extensions?.v5?.bestiary?.profileId;
  const name = String(participant?.name ?? '').normalize('NFC').toLowerCase();
  const scoped = rule && (rule.profileId ? profileId === rule.profileId : rule.profileName && name === rule.profileName.toLowerCase());
  if (!rule || !scoped) return { key, available: false, effects: [], reminders: [], unresolved: [], receipt: { ability: rule?.label ?? key, blocked: ['profil non concerné'] } };

  const plan = { key, label: rule.label, available: true, effects: [], reminders: [], unresolved: [], receipt: null };
  if (rule.qualities) plan.effects.push({ attack: rule.attack, addQualities: rule.qualities });
  if (rule.state === 'Empoisonné') {
    if (context.webHit === true && context.entangled === true) plan.effects.push({ state: rule.state, trigger: 'toile de l’Arachnarok ayant Enchevêtré la cible' });
    else if (context.webHit === true) plan.unresolved.push('Poser Enchevêtré avant de confirmer le poison de la toile.');
  }
  if (rule.outcome) {
    if (Number.isFinite(context.wounds) && context.wounds <= 0) plan.effects.push({ transformation: rule.outcome, requiresGmConfirmation: true });
  }
  if (rule.senseRangeYards) plan.reminders.push(`Détecte les proies jusqu’à ${rule.senseRangeYards} yards.`);
  if (rule.dodgeTest) plan.reminders.push(`Lasso de soie : ${rule.dodgeTest}; l’échec donne ${rule.onFailure}. La soie peut être coupée par ${rule.cutSilk}; la cible est ramenée au contact dans le même Round.`);
  if (rule.bite) plan.effects.push({ attack: 'Bite', addTrait: rule.bite });
  if (rule.overrideTrait) plan.effects.push({ addTrait: rule.overrideTrait, ignoresSize: rule.ignoresSize });
  if (rule.rangeYards) plan.effects.push({ attack: rule.attack, rangeYards: rule.rangeYards, test: rule.test, onHitTest: rule.opposedTest, onFailure: rule.onFailure });
  if (rule.damage && context.targetGrappled === true) {
    plan.effects.push({ damage: rule.fatigued === true ? rule.fatiguedDamage : rule.damage, ignoresArmour: rule.ignoresArmour, trigger: rule.trigger });
    plan.unresolved.push(`${rule.test} requis pour l’état; le test propre du Gargantuan (${rule.selfTest}) et son éventuel état ${rule.selfFailure} sont à résoudre par le MJ.`);
  }
  if (rule.trait) plan.effects.push({ attack: rule.attack, addTrait: rule.trait });
  if (rule.modifier && context.targetChaosFollower === true && rule.test?.includes(context.test)) plan.effects.push({ modifier: rule.modifier, unit: 'skill points' });
  if (rule.location && context.critical === true) plan.effects.push({ chooseHitLocation: rule.location, requiresGmConfirmation: true });
  if (rule.momentum && context.singleCombatLeader === true) plan.effects.push({ momentum: rule.momentum, requiresGmConfirmation: true });
  if (rule.reminder) plan.reminders.push(rule.reminder);
  plan.receipt = { ability: rule.label, source: `${rule.book} ${rule.source}`, effects: plan.effects.length, reminders: plan.reminders.slice(), blocked: plan.unresolved.slice() };
  return plan;
}

/** Plans de toutes les capacités propres aux règles F2-H d'un participant (rappels inclus). */
export function planBestiaryProfileAbilities(participant, context = {}) {
  return F2_H_PROFILE_ABILITIES.filter(rule => rule.profileId
    ? (participant?.profileId ?? participant?.extensions?.v5?.bestiary?.profileId) === rule.profileId
    : rule.profileName && String(participant?.name ?? '').toLowerCase() === rule.profileName.toLowerCase()
  ).map(rule => planBestiaryProfileAbility(participant, rule.key, context));
}

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
