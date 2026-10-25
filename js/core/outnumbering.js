// Surnombre et Encerclement en mêlée (lot B12, BR-16 ; L06 p. 166-167, Taille p. 360, Maîtrise du combat p. 116).
// Module pur : le moteur ne suit pas l'engagement, le MJ coche les combattants engagés avec la cible de chaque côté ;
// on en tire les poids, le rapport et le modificateur du seul Test d'attaque de mêlée (jamais celui de défense).
import { planCreatureSize } from './creature-size.js';
import { normalizeCamp } from './encounters.js';
import { availableV5TalentMeasures, previewV5TalentMeasure } from './v5-talent-measures.js';

const ATTACK_TYPES = ['attack', 'attaque'];
const CONTEXT_KEYS = ['outnumberAttackerIds', 'outnumberDefenderIds', 'surrounded'];
const NOTE = 'Surnombre (L06 p. 167) : un camp surpasse l\'autre s\'il a au moins deux fois plus de combattants engagés ; seuls les engagés entre eux comptent, en cas de doute le MJ décide. +1 DR au Test d\'attaque de mêlée, +2 DR si la cible est encerclée (non cumulés ; table p. 166) ; jamais de −1 DR pour le défenseur.';

const idsOf = value => (Array.isArray(value) ? value.filter(id => typeof id === 'string') : []);
const owns = (participant, situation) => availableV5TalentMeasures(participant).some(row => row.id === situation);
const measure = (participant, situation) => previewV5TalentMeasure(participant, { situation }).value;
const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[- ]/g, '');

/** Côté d'un participant : PJ et alliés ensemble face aux ennemis ; un participant neutre ne forme un côté qu'avec lui-même. */
export const outnumberSide = participant => {
  const camp = normalizeCamp(participant?.camp, participant?.kind);
  return camp === 'ennemi' ? 'ennemi' : camp === 'neutre' ? `neutre:${participant?.id}` : 'pj';
};

/** Un combattant engagé : présent en zone active, encore debout (PV > 0) et pas Inconscient. */
const isEngageable = person => person?.zone === 'active' && Number(person.hp) > 0 && !(person.states || []).some(state => fold(state?.key ?? state?.name) === 'inconscient');

/**
 * Combattants proposables comme engagés avec la cible : `attackers` (côté de l'attaquant) et `defenders` (côté de la cible),
 * sans l'attaquant ni la cible. Quand les deux sont du même côté, les autres membres sont proposés dans les deux listes ;
 * un id coché (`context`) d'un côté disparaît de l'autre, le côté de l'attaquant l'emportant s'il est coché des deux.
 */
export function engagedCandidates({ actor, target, participants = [], context = {} }) {
  if (!actor || !target || actor.id === target.id) return { attackers: [], defenders: [] };
  const attackerIds = new Set(idsOf(context.outnumberAttackerIds)), defenderIds = new Set(idsOf(context.outnumberDefenderIds));
  const others = participants.filter(person => person.id !== actor.id && person.id !== target.id && isEngageable(person));
  const attackers = others.filter(person => outnumberSide(person) === outnumberSide(actor) && (!defenderIds.has(person.id) || attackerIds.has(person.id) || outnumberSide(person) !== outnumberSide(target)));
  const defenders = others.filter(person => outnumberSide(person) === outnumberSide(target) && !(attackerIds.has(person.id) && outnumberSide(person) === outnumberSide(actor)));
  return { attackers, defenders };
}

/** Poids d'un combattant dans son camp : l'attaquant compte 1 (les grandes créatures ne se multiplient pas en attaque), le défenseur selon sa Taille ou Grande taille ; Maîtrise du combat compte pour deux au moins, sans se cumuler avec la Taille. */
export function outnumberWeightOf(participant, side) {
  let weight = 1;
  if (side === 'defender') {
    weight = planCreatureSize(participant).outnumberWeight;
    if (owns(participant, 'defensiveSizeWeight')) weight = Math.max(weight, measure(participant, 'defensiveSizeWeight'));
  }
  if (owns(participant, 'outnumber')) weight = Math.max(weight, measure(participant, 'outnumber'));
  return weight;
}

/** Contexte débarrassé des saisies de surnombre (comparaison multi-cibles : la saisie ne vaut que pour la cible sélectionnée). */
export function withoutOutnumberContext(context = {}) {
  const rest = { ...context };
  for (const key of CONTEXT_KEYS) delete rest[key];
  return rest;
}

/**
 * Plan de surnombre d'une attaque de mêlée. L'attaquant et la cible sont d'office engagés. `context` : `outnumberAttackerIds`
 * (alliés de l'attaquant engagés avec la cible), `outnumberDefenderIds` (alliés de la cible engagés avec les attaquants),
 * `surrounded` (la cible n'a plus de voie d'échappement ; ignoré avec moins de deux attaquants).
 * Rend `{ applicable, attackers, defenders, outnumbered, surrounded, amount, summary, modifiers, reminders }`.
 */
export function planOutnumbering({ actor, target, participants = [], context = {} }) {
  const reminders = [NOTE];
  const applicable = Boolean(actor && target) && actor.id !== target.id;
  const candidates = engagedCandidates({ actor, target, participants, context });
  const attackerIds = new Set(idsOf(context.outnumberAttackerIds)), defenderIds = new Set(idsOf(context.outnumberDefenderIds));
  const attackers = [actor, ...candidates.attackers.filter(person => attackerIds.has(person.id))].filter(Boolean);
  const defenders = [target, ...candidates.defenders.filter(person => defenderIds.has(person.id))].filter(Boolean);
  const attackerWeight = attackers.reduce((sum, person) => sum + outnumberWeightOf(person, 'attacker'), 0);
  const defenderWeight = defenders.reduce((sum, person) => sum + outnumberWeightOf(person, 'defender'), 0);
  const surrounded = applicable && context.surrounded === true && attackers.length >= 2;
  const outnumbered = applicable && attackerWeight >= 2 * defenderWeight;
  const amount = surrounded ? 2 : outnumbered ? 1 : 0;
  const ratio = `${attackerWeight} contre ${defenderWeight}`;
  const summary = !applicable ? '' : surrounded ? `${ratio} : cible encerclée, +2 DR` : outnumbered ? `${ratio} : surnombre, +1 DR` : `${ratio} : pas de surnombre`;
  const modifiers = surrounded ? [{ id: 'outnumber:surrounded', label: `Cible encerclée (${ratio})`, amount: 2 }]
    : outnumbered ? [{ id: 'outnumber', label: `Surnombre (${ratio})`, amount: 1 }] : [];
  return { applicable, attackers: { count: attackers.length, weight: attackerWeight }, defenders: { count: defenders.length, weight: defenderWeight }, outnumbered, surrounded, amount, summary, modifiers, reminders };
}

/** Modificateurs du Test d'attaque de mêlée ; rien pour un Test de défense, un tir ou un autre Test. */
export function outnumberTestRules({ actor, target, participants = [], kind, defending = false, action = {}, context = {} }) {
  if (defending || kind !== 'melee' || !ATTACK_TYPES.includes(action.type)) return [];
  return planOutnumbering({ actor, target, participants, context }).modifiers;
}
