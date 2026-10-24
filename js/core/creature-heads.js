// Plusieurs têtes (lot T9) : Trait Many Heads (Number) (E0-T-034, L06 p.359 ; renvoi L09 p.47 pour les profils du Temple of Spite).
// Module pur : lit le Trait, tient un registre par tête (états des têtes, rendus sans rien écrire), et rend l'effet global d'une
// Blessure Critique à la tête, les attaques gratuites (Bite, Horns, Tongue) et le bonus de Perception. Le MJ applique et conserve le registre.

const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const LABEL = 'Plusieurs têtes';
const NAMES = new Set(['many heads', 'plusieurs tetes']);
const NOTE = 'Une Blessure Critique à la tête (étourdi, mort, inconscient) n’affecte la créature qu’une fois toutes les têtes neutralisées ou touchées au même degré ; une attaque gratuite par tête valide (Morsure, Cornes, Langue) ; +2 DR en Perception avec au moins deux têtes valides.';
export const HEAD_STATES = ['healthy', 'stunned', 'unconscious', 'dead'];
// Degré croissant : étourdi < inconscient < mort.
const SEVERITY = { stunned: 1, unconscious: 2, dead: 3 };
const FREE_ATTACK_TRAITS = [
  { key: 'bite', label: 'Morsure', names: ['bite', 'morsure'] },
  { key: 'horns', label: 'Cornes', names: ['horns', 'cornes'] },
  { key: 'tongue', label: 'Langue', names: ['tongue', 'langue'] }
];

const traitText = trait => (typeof trait === 'string' ? trait : trait?.name ?? trait?.nom ?? '');
const traitListOf = participant => [
  ...(Array.isArray(participant?.traits) ? participant.traits : []),
  ...(Array.isArray(participant?.extensions?.traits) ? participant.extensions.traits : [])
];

/** « Many Heads 5 » / « Many Heads (5) » → `{ key: 'manyHeads', name, count }` (`count` null si absent ou invalide) ; `null` sinon. */
export function parseManyHeadsTrait(trait) {
  const match = /^\s*([^(\d]+?)\s*(?:\(\s*([^)]*)\s*\)|(\d+))?\s*$/.exec(traitText(trait));
  if (!match || !NAMES.has(fold(match[1]))) return null;
  const raw = (match[2] ?? match[3] ?? '').trim();
  const count = /^\d+$/.test(raw) && Number(raw) >= 2 ? Number(raw) : null;
  return { key: 'manyHeads', name: match[1].trim(), count };
}

/** Le premier Trait de têtes du participant, ou `null`. */
export const manyHeadsTrait = participant => traitListOf(participant).map(parseManyHeadsTrait).find(Boolean) ?? null;
export const hasManyHeads = participant => manyHeadsTrait(participant) !== null;

/** Clé (`bite`, `horns`, `tongue`) d'une attaque à une par tête d'après son nom, ou `null`. */
export const headAttackKeyOf = name => FREE_ATTACK_TRAITS.find(attack => attack.names.includes(fold(name).replace(/\s*\d+$/, '')))?.key ?? null;

/** Registre initial : une tête valide par tête du Trait (`[]` si le nombre est inconnu). */
export function createHeadRegistry(participant) {
  const trait = manyHeadsTrait(participant);
  return Array.from({ length: trait?.count ?? 0 }, (_, index) => ({ id: `head-${index + 1}`, state: 'healthy' }));
}

const normalizeRegistry = registry => (Array.isArray(registry) ? registry : [])
  .filter(head => head?.id)
  .map(head => ({ id: head.id, state: HEAD_STATES.includes(head.state) ? head.state : 'healthy' }));

/**
 * Plan des têtes : têtes valides, effet global, attaques gratuites, bonus de Perception, points non résolus, rappels, reçu.
 * `registry` : états par tête (défaut : toutes valides). `options.registry` est accepté aussi.
 */
export function planManyHeads(participant, registry, options = {}) {
  const plan = { key: 'manyHeads', label: LABEL, available: false, total: null, healthy: null, globalEffect: null, freeAttacks: [], perception: null, unresolved: [], reminders: [NOTE] };
  const finish = () => {
    plan.available = plan.unresolved.length === 0;
    return { ...plan, receipt: { ability: LABEL, healthy: plan.healthy, globalEffect: plan.globalEffect, freeAttacks: plan.freeAttacks.map(entry => `${entry.label} ×${entry.count}`), blocked: plan.unresolved.slice() } };
  };
  const trait = manyHeadsTrait(participant);
  if (!trait) {
    plan.unresolved.push(`${LABEL} : Trait absent du participant.`);
    return finish();
  }
  if (trait.count === null) {
    plan.unresolved.push(`${LABEL} : nombre de têtes absent ou invalide, à saisir.`);
    return finish();
  }
  const heads = normalizeRegistry(registry ?? options.registry ?? createHeadRegistry(participant));
  if (heads.length !== trait.count) {
    plan.unresolved.push(`${LABEL} : le registre compte ${heads.length} tête(s) pour ${trait.count} imprimée(s).`);
    return finish();
  }
  plan.total = heads.length;
  plan.healthy = heads.filter(head => head.state === 'healthy').length;
  const disabled = heads.filter(head => head.state !== 'healthy');
  if (disabled.length === heads.length) {
    // Toutes les têtes sont neutralisées : la créature subit le moins grave des degrés atteints.
    plan.globalEffect = disabled.reduce((low, head) => (SEVERITY[head.state] < SEVERITY[low] ? head.state : low), disabled[0].state);
  }
  // Morsure, Cornes, Langue : Trait du participant ou action imprimée du profil (la Bite de la Hydre de guerre n'est qu'une action).
  const owned = [...traitListOf(participant).map(item => fold(parseNameOnly(item))), ...(participant?.actions ?? []).map(action => fold(action?.name).replace(/\s*\d+$/, ''))];
  for (const attack of FREE_ATTACK_TRAITS) {
    if (owned.some(name => attack.names.includes(name))) plan.freeAttacks.push({ key: attack.key, label: attack.label, count: plan.healthy });
  }
  plan.perception = plan.healthy >= 2 ? { modifier: 2, unit: 'DR', cause: `${LABEL} (au moins deux têtes valides)` } : null;
  return finish();
}

function parseNameOnly(trait) {
  const match = /^\s*([^(\d]+?)\s*(?:\([^)]*\)|\d+)?\s*$/.exec(traitText(trait));
  return match ? match[1] : '';
}

/**
 * Applique l'effet d'une Blessure Critique à une tête : rend un nouveau registre (l'ancien n'est pas modifié) et le plan.
 * `effect` : `stunned`, `unconscious` ou `dead`. `headId` : la tête touchée (sinon la première valide).
 */
export function applyHeadCritical(participant, registry, effect, headId) {
  const base = normalizeRegistry(registry ?? createHeadRegistry(participant));
  const refuse = reason => ({ registry: base, plan: planManyHeads(participant, base), unresolved: [`${LABEL} : ${reason}`] });
  if (!hasManyHeads(participant)) return refuse('Trait absent du participant.');
  if (!(effect in SEVERITY)) return refuse(`effet « ${effect} » inconnu (étourdi, inconscient ou mort).`);
  const target = headId === undefined ? base.find(head => head.state === 'healthy') : base.find(head => head.id === headId);
  if (!target) return refuse(headId === undefined ? 'aucune tête valide à toucher.' : `tête « ${headId} » introuvable dans le registre.`);
  const next = base.map(head => (head.id === target.id ? { ...head, state: effect } : head));
  return { registry: next, plan: planManyHeads(participant, next), unresolved: [] };
}

/**
 * Critiques d'attaque appliqués à une créature à Plusieurs têtes : un coup critique à la tête (Sonné, mort instantanée) ne touche qu'une tête
 * (`headId`, sinon la première valide). Rend `null` si rien ne concerne les têtes, sinon le nouveau registre, le plan, la tête touchée et
 * `stripStunned` (le Sonné du critique ne s'applique à la créature que si toutes les têtes sont neutralisées).
 */
export function applyHeadCriticals(participant, details, headId) {
  if (!hasManyHeads(participant)) return null;
  let registry = headRegistryOf(participant);
  const touched = [];
  let stunned = false;
  for (const detail of (details || []).filter(item => item && !item.pending && item.location?.key === 'HEAD')) {
    const parsed = detail.parsed || detail.effect?.parsed;
    const effect = parsed?.death ? 'dead' : (parsed?.states || []).some(state => state.key === 'sonne') ? 'stunned' : null;
    if (!effect) continue;
    const result = applyHeadCritical(participant, registry, effect, headId);
    if (result.unresolved.length) continue;
    const hit = result.registry.find((head, index) => head.state !== registry[index]?.state);
    registry = result.registry;
    touched.push({ headId: hit?.id ?? null, effect });
    if (effect === 'stunned') stunned = true;
  }
  if (!touched.length) return null;
  const plan = planManyHeads(participant, registry);
  return { registry, plan, touched, stripStunned: stunned && !plan.globalEffect };
}

/** Remet une tête à l'état valide (fin d'étourdissement, guérison) : nouveau registre. */
export function restoreHead(registry, headId) {
  return normalizeRegistry(registry).map(head => (head.id === headId ? { ...head, state: 'healthy' } : head));
}

const STATE_FR = { healthy: 'valide', stunned: 'étourdie', unconscious: 'inconsciente', dead: 'morte' };
export const headStateLabel = state => STATE_FR[state] ?? STATE_FR.healthy;

/** Registre des têtes tenu par le participant (`extensions.v5.heads`) ; à défaut, toutes valides. */
export const headRegistryOf = participant => {
  const stored = participant?.extensions?.v5?.heads;
  return Array.isArray(stored) && stored.length ? normalizeRegistry(stored) : createHeadRegistry(participant);
};

/** Rappels de Plusieurs têtes d'un participant : état des têtes, attaques gratuites, Perception, effet global (affichage de fiche). */
export function manyHeadsReminders(participant) {
  return manyHeadsReminderItems(participant).map(item => item.text);
}

/** Mêmes rappels, avec une clé stable par sens (compte, attaques, Perception, effet global, note) : un « Fait » ne masque que sa ligne. */
export function manyHeadsReminderItems(participant) {
  if (!hasManyHeads(participant)) return [];
  const plan = planManyHeads(participant, headRegistryOf(participant));
  if (plan.total === null) return [{ key: 'heads-unresolved', text: `${LABEL} : ${plan.unresolved.join(' ')}` }];
  const lines = [{ key: 'heads-count', text: `${LABEL} : ${plan.healthy} tête(s) valide(s) sur ${plan.total}.` }];
  if (plan.freeAttacks.length) lines.push({ key: 'heads-free-attacks', text: `Attaques gratuites par tête valide : ${plan.freeAttacks.map(entry => `${entry.label} ×${entry.count}`).join(', ')}.` });
  if (plan.perception) lines.push({ key: 'heads-perception', text: `Perception : ${plan.perception.modifier > 0 ? '+' : ''}${plan.perception.modifier} ${plan.perception.unit} (${plan.perception.cause}).` });
  if (plan.globalEffect) lines.push({ key: 'heads-global', text: `Toutes les têtes sont neutralisées : la créature est ${{ stunned: 'étourdie', unconscious: 'inconsciente', dead: 'morte' }[plan.globalEffect]} (degré le moins grave atteint).` });
  else lines.push({ key: 'heads-note', text: NOTE });
  return lines;
}
