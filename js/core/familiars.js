/**
 * Familiers (lot F2, conception : docs/plans-gpt/CONCEPTION_FAMILIERS.md). Module pur : rien ne s'écrit seul.
 * Deux systèmes distincts : homoncule (Winds of Magic) et animal (Archives of the Empire 3), ouverts à tous.
 * Le lien est durable côté maître (`extensions.v5.familiarLinks[]`) et côté familier (`extensions.v5.familiarOf`) ;
 * la portée de 4 yards d'un animal est un booléen `inRange` posé par le MJ, jamais calculé.
 */
import { familiarSkillSupport } from './v5-magic-talents.js';
import { hasV5Talent } from './v5-talents.js';
import { keywordMatches, participantKeywords } from './creature-keywords.js';

const fold = value => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const FAMILIAR_SYSTEMS = Object.freeze(['homunculus', 'animal']);
export const HOMUNCULUS_KINDS = Object.freeze(['combat', 'power', 'spell']);
export const FAMILIAR_WINDS = Object.freeze(['aqshy', 'azyr', 'chamon', 'ghur', 'ghyran', 'hysh', 'shyish', 'ulgu']);
/** Plafond de sorts d'un Familier de sorts (rappel, jamais bloquant). */
export const SPELL_FAMILIAR_SPELL_CAP = 4;

/**
 * Traits de compagnon (L02 pp. 81-82, E0-T-162 à 168). `talentId` n'est posé que lorsque le talent imprimé a un équivalent V5
 * certain ; sinon null : le talent est affiché en rappel, jamais deviné (choix E-F2).
 */
export const COMPANION_TRAITS = Object.freeze({
  fox: { name: 'Renard', entry: 'E0-T-163', talents: [{ name: 'Baratiner', talentId: 'talent-blather' }, { name: 'Intrigant', talentId: 'talent-schemer' }] },
  owl: { name: 'Hibou', entry: 'E0-T-164', talents: [{ name: 'Visions divines', talentId: null }, { name: 'Sixième sens', talentId: 'talent-sixth-sense' }] },
  stoat: { name: 'Hermine', entry: 'E0-T-165', talents: [{ name: 'Œil du chasseur', talentId: 'talent-hunter-s-eye' }, { name: 'Filature', talentId: null }] },
  badger: { name: 'Blaireau', entry: 'E0-T-166', talents: [{ name: 'Robuste', talentId: 'talent-robust' }, { name: 'Tenace', talentId: null }] },
  cat: { name: 'Chat', entry: 'E0-T-167', talents: [{ name: 'Chat de gouttière', talentId: 'talent-alley-cat' }, { name: 'Vagabond', talentId: null }] },
  raven: { name: 'Corbeau', entry: 'E0-T-168', talents: [{ name: 'Flair', talentId: null }, { name: 'Maître du déguisement', talentId: 'talent-master-of-disguise' }] },
  generic: { name: 'Compagnon générique', entry: 'E0-T-162', talents: [] }
});

const v5Of = participant => participant?.extensions?.v5 || {};
export const familiarLinksOf = master => (Array.isArray(v5Of(master).familiarLinks) ? v5Of(master).familiarLinks : []);
export const familiarOfOf = familiar => v5Of(familiar).familiarOf || null;
/** Un lien d'animal n'agit qu'à portée (booléen du MJ) ; celui d'un homoncule agit toujours. */
export const isLinkActive = link => link?.system === 'homunculus' || link?.inRange === true;

export function validateFamiliarLink(master, familiar, link) {
  const refuse = (reason, message) => ({ ok: false, reason, message });
  if (!master?.id || !familiar?.id) return refuse('unknown-participant', 'Maître ou familier introuvable.');
  if (master.id === familiar.id) return refuse('self-link', 'Un participant ne peut pas être son propre familier.');
  if (!FAMILIAR_SYSTEMS.includes(link?.system)) return refuse('unknown-system', 'Système de familier inconnu : homoncule ou animal.');
  const owner = familiarOfOf(familiar);
  if (owner && owner.masterId) return refuse('already-linked', owner.masterId === master.id ? 'Ce familier est déjà lié à ce maître.' : 'Ce familier est déjà lié à un autre maître.');
  if (familiarOfOf(master)) return refuse('master-is-familiar', 'Un familier ne peut pas avoir de familier.');  if (link.system === 'homunculus') {
    if (!HOMUNCULUS_KINDS.includes(link.kind)) return refuse('unknown-kind', 'Type d’homoncule inconnu : Combat, Puissance ou Sorts.');
    if (!FAMILIAR_WINDS.includes(link.wind)) return refuse('unknown-wind', 'Vent de magie hors liste.');
  } else {
    if (link.kind !== 'power') return refuse('animal-kind', 'Un familier animal est toujours de Puissance.');
    if (!Object.hasOwn(COMPANION_TRAITS, link.species)) return refuse('unknown-species', 'Espèce de compagnon inconnue.');
  }
  if (familiarLinksOf(familiar).length) return refuse('familiar-is-master', 'Ce participant a déjà un familier : il ne peut pas être le familier d’un autre.');
  return { ok: true };
}

/** Ligne de lien normalisée (côté maître) ; l'identité du familier est son `id`. */
export function buildFamiliarLink(familiar, link, { id, createdAt = null } = {}) {
  const homunculus = link.system === 'homunculus';
  return {
    id, system: link.system, familiarId: familiar.id, kind: homunculus ? link.kind : 'power',
    wind: homunculus ? link.wind : null, species: homunculus ? null : link.species,
    rank: Number.isInteger(link.rank) && link.rank >= 1 ? link.rank : 1,
    inRange: homunculus ? true : link.inRange === true, createdAt, source: 'mj'
  };
}
export const familiarBackLink = (master, link) => ({ masterId: master.id, linkId: link.id, system: link.system, kind: link.kind, wind: link.wind, species: link.species });

/** Liens résolus par identité ; un lien dont le familier a disparu reste listé avec `familiar: null`. */
export function linkedFamiliars(master, participants = []) {
  return familiarLinksOf(master).map(link => ({ link, familiar: participants.find(p => p.id === link.familiarId) || null }));
}

/** Remplace les deux cases manuelles du jet : le lien actif alimente le calcul existant, sans cumul d'assistances. */
export function familiarSupport(master, participants, skillName, context = {}) {
  for (const { link, familiar } of linkedFamiliars(master, participants)) {
    if (!familiar || !isLinkActive(link)) continue;
    const support = familiarSkillSupport(master, familiar, skillName, { ...context, magicAssistantLinked: true });
    if (support.modifiers.length || support.advantages.length) return { ...support, linkId: link.id, familiarId: familiar.id };
  }
  return { modifiers: [], advantages: [] };
}

/** Talents donnés par les Traits de compagnon actifs : un talent déjà connu (ou déjà donné) vaut +1 DR au lieu d'un doublon. */
export function companionTalents(master, participants = []) {
  const granted = [], bonuses = [], reminders = [], seen = new Set();
  for (const { link, familiar } of linkedFamiliars(master, participants)) {
    if (!familiar || link.system !== 'animal' || !isLinkActive(link)) continue;
    const trait = COMPANION_TRAITS[link.species];
    for (const talent of trait?.talents || []) {
      const key = talent.talentId || 'name:' + fold(talent.name);
      const known = seen.has(key) || (talent.talentId ? hasV5Talent(master, talent.talentId) : false);
      if (known) bonuses.push({ linkId: link.id, name: talent.name, talentId: talent.talentId, amount: 1, label: 'Trait de compagnon (' + trait.name + ') : ' + talent.name + ' déjà connu' });
      else granted.push({ linkId: link.id, name: talent.name, talentId: talent.talentId });
      seen.add(key);
      if (!talent.talentId) reminders.push(talent.name + ' (' + trait.name + ') : talent à appliquer à la main, sans équivalent V5 vérifié.');
    }
  }
  return { granted, bonuses, reminders };
}

/** Copie du maître dont les talents effectifs incluent ceux de compagnon ; l'original n'est jamais modifié. */
export function withCompanionTalents(master, participants = []) {
  const { granted } = companionTalents(master, participants);
  const rows = granted.filter(row => row.talentId).map(row => ({ id: row.talentId, status: 'resolved', rank: 1, source: 'companion', linkId: row.linkId }));
  return rows.length ? { ...master, talents: [...(master.talents || []), ...rows] } : master;
}

const RESTRICTED_STATES = [
  [/hemorragique|saignement|bleeding/, 'Hémorragique'],
  [/extenue|fatigue|fatigued/, 'Exténué'],
  [/empoisonne|poisoned/, 'Empoisonné'],
  [/maladie|disease|infecte/, 'Maladie']
];
const isHomunculus = familiar => familiarOfOf(familiar)?.system === 'homunculus';

/** Un homoncule ne subit Hémorragique, Exténué, Empoisonné ou une maladie que d'une source magique ; refus avec reçu, le MJ garde la main. */
export function previewFamiliarCondition(familiar, state, source = {}) {
  const name = fold(typeof state === 'string' ? state : state?.name || state?.key);
  const hit = RESTRICTED_STATES.find(([pattern]) => pattern.test(name));
  if (!isHomunculus(familiar) || !hit) return { ok: true, receipt: null };
  if (source.magical === true) return { ok: true, receipt: { kind: 'familiar-condition', state: hit[1], message: hit[1] + ' d’origine magique : accepté pour un homoncule.' } };
  return { ok: false, receipt: { kind: 'familiar-condition', state: hit[1], message: hit[1] + ' refusé : un homoncule ne le subit que d’une source magique.' } };
}

/** Un homoncule ne guérit que par sort de soin : ni compétence Soin, ni miracle, ni médecine. */
export function previewFamiliarHealing(familiar, source = {}) {
  if (!isHomunculus(familiar) || source.kind === 'spell') return { ok: true, receipt: null };
  return { ok: false, receipt: { kind: 'familiar-healing', message: 'Soin refusé : un homoncule ne guérit que par un sort de soin (ni Soin, ni miracle, ni médecine).' } };
}

const isElf = master => keywordMatches(participantKeywords(master).ids, 'elfe');

/** Mort d'un animal lié : propose le Calme et les dégâts, n'applique rien (traumatisme, tirage et confirmation au MJ). */
export function planFamiliarDeath(master, familiar) {
  const link = familiarLinksOf(master).find(row => row.familiarId === familiar?.id);
  if (!link || link.system !== 'animal') return { applicable: false, applied: false, reason: 'Aucun lien d’animal entre ces deux participants.' };
  const penalty = isElf(master) ? 0 : -2;
  return {
    applicable: true, applied: false, linkId: link.id, masterId: master.id, familiarId: familiar.id,
    calmTest: { skill: 'Calme', modifier: penalty, label: 'Mort du familier (Calme Difficile' + (penalty === 0 ? ', elfe : sans malus' : '') + ')' },
    onFailure: { damage: '2d10', dice: 2, ignoresToughnessBonus: true, ignoresArmour: true, needsInput: ['Résultat des deux d10 à saisir par le MJ'] },
    reminders: ['Psychologie de Traumatisme et conséquences : au MJ.', 'Confirmation du MJ requise avant toute Blessure.']
  };
}

/** Dégâts de la mort d'un animal : deux d10 saisis, sans Bonus d'Endurance ni armure. */
export function familiarDeathDamage(rolls) {
  if (!Array.isArray(rolls) || rolls.length !== 2 || rolls.some(n => !Number.isInteger(n) || n < 1 || n > 10)) return { ok: false, message: 'Saisir deux résultats de d10.' };
  return { ok: true, damage: rolls[0] + rolls[1] };
}

/** Portée du partage sensoriel : le plus faible des deux scores de Volonté, en miles. */
export function senseSharingRange(master, familiar) {
  const willpower = participant => Number(participant?.caracs?.FM);
  const a = willpower(master), b = willpower(familiar);
  return Number.isFinite(a) && Number.isFinite(b) ? { ok: true, miles: Math.min(a, b) } : { ok: false, message: 'Volonté du maître et du familier requise.' };
}

/** Un homoncule d'Aqshy (Imprégné) ne subit pas les dégâts d'Embrasé ; les autres Vents ne changent rien. */
export const familiarIgnoresAblaze = participant => {
  const owner = familiarOfOf(participant);
  return owner?.system === 'homunculus' && owner.wind === 'aqshy';
};

/** Rappels du §3 de la conception qui ne s'automatisent pas. */
export function familiarReminders(participant) {
  const owner = familiarOfOf(participant);
  if (!owner) return [];
  if (owner.system === 'homunculus') {
    const rows = [
      'Encombrement doublé pour tout objet non magique hors Trappings de départ.',
      'Ni nourriture ni eau.', 'Statut sans valeur ; Tests de Sociabilité avec des inconnus à −2 DR.',
      'Une Blessure Critique est une perte de fonction magique.'
    ];
    if (owner.kind === 'spell') rows.push('Jusqu’à ' + SPELL_FAMILIAR_SPELL_CAP + ' sorts selon le Niveau de Carrière du maître.');
    if (owner.kind === 'power') rows.push('Jamais Focalisation, Langue (Magick), Petty Magic ni Arcane Magic à l’avancement.');
    return rows;
  }
  return [
    'Télépathie animale à 4 yards, limitée par l’Intelligence du familier.', 'Messager : jusqu’à Intelligence miles.',
    'Invisibilité 1 fois par jour (quota non suivi par l’application).', 'Corruption réciproque : l’exposition de l’un fait tester l’autre.',
    'À la mort du maître, le familier subit le même sort.'
  ];
}
