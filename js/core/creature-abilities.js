// Capacités propres de profil (lot T12) : Imperial Zoo, Lustria et compléments L18-L26.
// Module pur : chaque capacité de l'inventaire est soit prise en charge par un lot de Traits (T1 à T11), soit un rappel motivé.
// Rien n'est écrit et rien n'est calculé ici : un rappel n'est jamais une preuve d'exécution.

import { CREATURE_ABILITIES } from '../data/creature-abilities.js';
import { F2_H_PROFILE_ABILITIES } from '../data/f2-h-profile-abilities.js';

const BY_ID = new Map(CREATURE_ABILITIES.map(entry => [entry.id, entry]));
const F2_H_BY_KEY = new Map(F2_H_PROFILE_ABILITIES.map(entry => [entry.key, entry]));

const sameName = value => String(value ?? '').normalize('NFC').trim().toLowerCase();

/** Plan d'une règle F2-H sur son profil propriétaire. Les résultats ne sont proposés que si les faits de scène sont fournis. */
export function planBestiaryProfileAbility(participant, key, context = {}) {
  const rule = F2_H_BY_KEY.get(key);
  const profileId = participant?.profileId ?? participant?.extensions?.v5?.bestiary?.id ?? participant?.extensions?.v5?.bestiary?.profileId;
  const name = String(participant?.name ?? '').normalize('NFC').toLowerCase();
  const scoped = rule && (rule.profileId ? profileId === rule.profileId : rule.profileName && name === sameName(rule.profileName));
  if (!rule || !scoped) return { key, available: false, effects: [], reminders: [], unresolved: [], receipt: { ability: rule?.label ?? key, blocked: ['profil non concerné'] } };

  const plan = { key, label: rule.label, available: true, effects: [], reminders: [], unresolved: [], receipt: null };
  if (rule.qualities) plan.effects.push({ attack: rule.attack, addQualities: rule.qualities });
  if (rule.state === 'Empoisonné') {
    if (context.webHit === true && context.entangled === true) plan.effects.push({ state: rule.state, trigger: 'toile de l’Arachnarok ayant Enchevêtré la cible' });
    else if (context.webHit === true) plan.unresolved.push('Poser Enchevêtré avant de confirmer le poison de la toile.');
  }
  if (rule.outcome === 'crâne ordinaire') {
    if (Number.isFinite(context.wounds) && context.wounds <= 0) plan.effects.push({ transformation: rule.outcome, requiresGmConfirmation: true });
  }
  if (rule.outcome === 'suffocation' && context.entangled === true) {
    plan.effects.push({ effect: 'suffocation', trigger: rule.trigger, escapeTest: rule.escape, grappleMustBeMaintained: false });
    if (Number.isInteger(context.escapeTestSL)) plan.effects.push({ escaped: context.escapeTestSL >= 0, test: 'Force opposée contre 59' });
    else plan.unresolved.push('Immersion : saisir le résultat du Test de Force opposé pour sortir de l’Enchevêtrement.');
  }
  if (rule.immuneState) plan.effects.push({ immuneToState: rule.immuneState });
  if (rule.castingCharacteristic) plan.effects.push({ castingCharacteristic: rule.castingCharacteristic });
  if (rule.senseRangeYards) plan.reminders.push(`Détecte les proies jusqu’à ${rule.senseRangeYards} yards.`);
  if (rule.dodgeTest) {
    if (Number.isInteger(context.targetLostBySL) && context.targetLostBySL > 0) plan.effects.push({ state: 'enchevetre', level: context.targetLostBySL, strength: 1, source: 'Lasso de soie' });
    if (context.targetLostBySL > 0) plan.effects.push({ pullToContact: true, timing: 'même Round' });
    if (Number.isFinite(context.cuttingDamage) && context.cuttingDamage > 5) plan.effects.push({ breakSilk: true, entanglementEnded: true });
    plan.reminders.push(`Proies repérées jusqu’à ${rule.senseRangeYards} yards; Test d’Esquive ${rule.dodgeTest}, un Enchevêtré par niveau d’échec; ${rule.cutSilk} pour couper la soie. La portée est une aide affichée, jamais suivie.`);
  }
  if (rule.bite) plan.effects.push({ attack: 'Bite', addTrait: rule.bite });
  if (rule.overrideTrait) plan.effects.push({ addTrait: rule.overrideTrait, ignoresSize: rule.ignoresSize });
  if (rule.rangeYards) plan.effects.push({ attack: rule.attack, rangeYards: rule.rangeYards, test: rule.test, onHitTest: rule.opposedTest, onFailure: rule.onFailure });
  if (rule.damage && context.targetGrappled === true) {
    if (context.momentum === false) plan.unresolved.push('Décharge électrique : 1 Élan requis.');
    else plan.effects.push({ damage: context.fatigued === true ? rule.fatiguedDamage : rule.damage, ignoresArmour: rule.ignoresArmour, trigger: rule.trigger,
      cost: rule.cost, ...(context.isShip === true ? { shipDamage: rule.shipDamage, crewDamage: context.fatigued === true ? rule.fatiguedShipCrewDamage : rule.shipCrewDamage } : {}) });
    if (context.targetTookWounds === true && context.targetEnduranceSuccess === false) plan.effects.push({ state: 'sonne', trigger: 'échec Endurance Difficile' });
    else if (context.targetTookWounds === true && context.targetEnduranceSuccess !== true) plan.unresolved.push('Décharge électrique : préciser la réussite du Test d’Endurance Difficile (−10).');
    if (context.selfEnduranceSuccess === false) plan.effects.push({ state: 'extenue', trigger: 'échec Endurance Moyenne (+2 DR)' });
    else if (context.selfEnduranceSuccess !== true) plan.unresolved.push('Décharge électrique : Test d’Endurance Moyenne (+20) du Gargantuan à saisir.');
  }
  if (rule.trait) plan.effects.push({ attack: rule.attack, addTrait: rule.trait });
  if (rule.modifier && context.targetChaosFollower === true && rule.test?.includes(context.test)) plan.effects.push({ modifier: rule.modifier, unit: 'skill points' });
  if (rule.location && context.critical === true) plan.effects.push({ chooseCriticalTable: 'Head Critical Wounds', requiresGmConfirmation: true });
  if (rule.momentum && context.singleCombatLeader === true) plan.effects.push({ momentum: rule.momentum, requiresGmConfirmation: true });
  if (rule.fireRequirement) {
    if (context.fireSize === 'bonfire') plan.effects.push({ mayBeScared: true, requiresGmResolution: true });
    else if (context.fireSize) plan.effects.push({ mayBeScared: false });
    plan.reminders.push(`Un ${rule.fireRequirement} peut l’effrayer; des torches ne suffisent pas. ${rule.reminder}`);
  }
  if (rule.reminder) plan.reminders.push(rule.reminder);
  plan.receipt = { ability: rule.label, source: `${rule.book} ${rule.source}`, effects: plan.effects.length, reminders: plan.reminders.slice(), blocked: plan.unresolved.slice() };
  return plan;
}

/** Plans de toutes les capacités propres aux règles F2-H d'un participant (rappels inclus). */
export function planBestiaryProfileAbilities(participant, context = {}) {
  return F2_H_PROFILE_ABILITIES.filter(rule => rule.profileId
    ? (participant?.profileId ?? participant?.extensions?.v5?.bestiary?.id ?? participant?.extensions?.v5?.bestiary?.profileId) === rule.profileId
    : rule.profileName && sameName(participant?.name) === sameName(rule.profileName)
  ).map(rule => planBestiaryProfileAbility(participant, rule.key, context));
}

/** Immunités d’état propres aux règles F2-H, à consulter par tout chemin d’acquisition d’état. */
export function bestiaryProfileStateImmunity(participant, state) {
  return F2_H_PROFILE_ABILITIES.some(rule => rule.profileId === (participant?.profileId ?? participant?.extensions?.v5?.bestiary?.id ?? participant?.extensions?.v5?.bestiary?.profileId)
    && rule.immuneState && String(rule.immuneState).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === String(state ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
}

/** Add profile-scoped weapon rules before the normal quality engine calculates an attack. */
export function decorateBestiaryProfileAction(participant, action) {
  if (!participant || !action || typeof action !== 'object') return action;
  const profileId = participant?.profileId ?? participant?.extensions?.v5?.bestiary?.id ?? participant?.extensions?.v5?.bestiary?.profileId;
  const name = String(action.name ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const qualities = [...(Array.isArray(action.qualities) ? action.qualities : [])];
  const add = value => {
    const id = String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (!qualities.some(row => String(typeof row === 'string' ? row : row?.id ?? row?.name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === id)) qualities.push(value);
  };
  let deathblow = false;
  if (profileId === 'E0-P-001' && /antler|bois/.test(name)) ['Empaleuse', 'Perforante'].forEach(add);
  if (profileId === 'E0-P-002' && /antler|bois/.test(name)) ['Rapide', 'Empaleuse', 'Perforante'].forEach(add);
  if (profileId === 'E0-P-792') deathblow = true;
  if (profileId === 'E0-P-913' && /fang|crocs/i.test(name)) add({ id: 'venin', name: 'Venin', parameter: 'Difficile' });
  const specialProfileAbility = action.extensions?.v5?.specialProfileAbility;
  if (!deathblow && qualities.length === (action.qualities || []).length && !specialProfileAbility) return action;
  return { ...action, qualities, ...(deathblow ? { extensions: { ...(action.extensions || {}), v5: { ...(action.extensions?.v5 || {}), deathblow: true } } } : {}) };
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
