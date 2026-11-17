/**
 * Brique F5 des miracles narratifs : zones (type `divine-zone`). Registre : v5-divine-effect-handlers.js.
 * Effet : `{ type: 'divine-zone', appliesTo: 'caster', label, radius?: { characteristic }, excludes: ['attack'|'ranged-attack'],
 * exceptions?: ['gunpowder'|'artillery'], affects?: { trait } }`. La couche du prêtre porte `zone: { label, radius, members, excludes,
 * exceptions, affects }`. La présence dans la zone est désignée par le MJ (`members`, commande `setDivineZoneMembers`) : elle n'est
 * jamais lue sur la carte. Les lecteurs sont purs ; un avertissement en français, que le MJ peut passer outre, jamais un refus.
 * Rayon : la Caractéristique entière du prêtre, en mètres (yards = mètres) ; inconnue ou non déclarée : `null`, la zone reste valable.
 */
import { psychologyTraits } from './creature-psychology.js';

const clone = value => structuredClone(value);
const record = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isText = value => typeof value === 'string' && value.trim() !== '';
const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const nameOf = participant => participant?.name || participant?.id || '—';

export const ZONE_EXCLUDES = Object.freeze(['attack', 'ranged-attack']);
export const ZONE_EXCEPTIONS = Object.freeze(['gunpowder', 'artillery']);

export function divineZoneProblem(effect) {
  if (effect?.appliesTo !== 'caster' && effect?.casterOnly !== true) return 'divine-zone exige appliesTo "caster".';
  if (!isText(effect.label)) return 'divine-zone exige label.';
  if (!Array.isArray(effect.excludes) || !effect.excludes.length || !effect.excludes.every(item => ZONE_EXCLUDES.includes(item)))
    return `divine-zone : excludes doit être une liste non vide parmi ${ZONE_EXCLUDES.join(', ')}.`;
  if (effect.exceptions !== undefined && (!Array.isArray(effect.exceptions) || !effect.exceptions.every(item => ZONE_EXCEPTIONS.includes(item))))
    return `divine-zone : exceptions doit être une liste parmi ${ZONE_EXCEPTIONS.join(', ')}.`;
  if (effect.affects !== undefined && !(record(effect.affects) && isText(effect.affects.trait))) return 'divine-zone : affects doit déclarer trait.';
  if (effect.radius !== undefined && !(record(effect.radius) && isText(effect.radius.characteristic))) return 'divine-zone : radius doit déclarer characteristic.';
  return null;
}

const handler = {
  implicitTarget: true,
  validate: divineZoneProblem,
  needs: effect => divineZoneProblem(effect) ? [{ field: 'contract.effects.zone', label: divineZoneProblem(effect) }] : [],
  // Rayon figé à l'aperçu : la Caractéristique entière du prêtre (Sociabilité mètres) quand elle est connue.
  resolve(effect, { actor } = {}) {
    const raw = effect.radius ? actor?.caracs?.[effect.radius.characteristic] : null;
    const value = Number(raw);
    return { ...effect, radiusMeters: raw !== null && raw !== undefined && raw !== '' && Number.isFinite(value) ? value : null };
  },
  buildLayer: effect => ({ zone: { label: effect.label, radius: effect.radiusMeters ?? null, members: [], excludes: clone(effect.excludes),
    exceptions: clone(effect.exceptions || []), ...(effect.affects ? { affects: clone(effect.affects) } : {}) } })
};
export default { 'divine-zone': handler };

const zoneLayersOf = participant => (participant?.extensions?.v5?.divineEffects || []).filter(layer => layer.type === 'divine-zone' && record(layer.zone));

/** Zones (couches `divine-zone`) dont le MJ a désigné le participant comme présent : `[{ layerId, casterId, casterName, ...zone }]`. */
export function divineZoneOf(participant, participants = []) {
  if (!participant?.id) return [];
  return participants.flatMap(bearer => zoneLayersOf(bearer)
    .filter(layer => (layer.zone.members || []).includes(participant.id))
    .map(layer => ({ layerId: layer.id, casterId: bearer.id, casterName: nameOf(bearer), ...clone(layer.zone) })));
}

const hasTrait = (participant, trait) => {
  const wanted = fold(trait);
  if (psychologyTraits(participant).some(row => row.key === wanted || fold(row.name) === wanted)) return true;
  return (participant?.traits || []).some(row => fold(typeof row === 'string' ? row : row?.name).replace(/\s*\(.*$/, '') === wanted);
};
const textOf = action => fold([action?.name, action?.category, action?.extensions?.equipment?.name, action?.extensions?.equipment?.category,
  ...[...(action?.keywords || []), ...(action?.qualities || []), ...(action?.extensions?.equipment?.keywords || [])].map(row => typeof row === 'string' ? row : row?.id || row?.name)].join(' '));
const isRanged = action => action?.ranged === true || action?.kind === 'ranged' || (action?.ranged === undefined && action?.attr === 'CT');
const isException = (action, exception) => exception === 'gunpowder' ? /poudre|powder|pistolet|arquebuse/.test(textOf(action)) : /artillerie|canon|mortier|artillery|siege/.test(textOf(action));

/**
 * Avertissements en français pour une attaque (`action`) de `attacker` sur `target`, d'après les zones où le MJ a placé l'un ou l'autre.
 * `attack` : l'attaquant membre qui porte le Trait visé n'attaque pas. `ranged-attack` : aucune attaque à distance depuis ou vers la zone,
 * sauf exception (arme à poudre ou d'artillerie). Jamais un refus.
 */
export function divineZoneAttackWarnings({ attacker, target, action, participants = [] } = {}) {
  const out = [];
  for (const bearer of participants) for (const layer of zoneLayersOf(bearer)) {
    const zone = layer.zone, members = zone.members || [];
    const attackerIn = members.includes(attacker?.id), targetIn = members.includes(target?.id);
    if (!attackerIn && !targetIn) continue;
    const label = `${zone.label} (${nameOf(bearer)})`;
    if (zone.excludes.includes('attack') && attackerIn && (!zone.affects?.trait || hasTrait(attacker, zone.affects.trait)))
      out.push(`${nameOf(attacker)} est dans la zone de ${label} : ${zone.affects?.trait ? `créature ${zone.affects.trait}` : 'créature affectée'}, elle n’attaque pas. Le MJ peut passer outre.`);
    if (zone.excludes.includes('ranged-attack') && isRanged(action) && !(zone.exceptions || []).some(item => isException(action, item)))
      out.push(`Attaque à distance ${attackerIn ? 'depuis' : 'vers'} la zone de ${label} : impossible, sauf arme à poudre ou d’artillerie. Le MJ peut passer outre.`);
  }
  return out;
}

/** Textes de rappel affichés sur un participant présent dans une zone du prêtre. */
export const divineZoneReminders = (participant, participants = []) => divineZoneOf(participant, participants).map(zone => ({
  key: `divine-zone-${zone.layerId}`,
  text: `Dans la zone de ${zone.label} (${zone.casterName})${zone.radius ? ` · rayon ${zone.radius} m` : ''} : ${zone.excludes.includes('attack') ? 'n’attaque pas' : 'aucune attaque à distance, sauf arme à poudre ou d’artillerie'}.` }));

/**
 * Commande pure : remplace la présence désignée d'une zone. Rend `{ ok, state, members }` ou `{ ok: false, error }` sans écrire ;
 * un identifiant inconnu est refusé. Le résultat est un nouvel état (un commit, un ↶).
 */
export function setDivineZoneMembersOnState(state, casterId, layerId, ids = []) {
  const participants = state?.combat?.participants || [];
  const bearer = participants.find(row => row.id === casterId);
  const layer = zoneLayersOf(bearer).find(row => row.id === layerId);
  if (!layer) return { ok: false, error: 'Zone introuvable (prière terminée ?).' };
  if (!Array.isArray(ids)) return { ok: false, error: 'Liste de participants requise.' };
  const unknown = ids.filter(id => !participants.some(row => row.id === id));
  if (unknown.length) return { ok: false, error: `Participant introuvable : ${unknown.join(', ')}.` };
  const members = [...new Set(ids)];
  const next = clone(state);
  const live = next.combat.participants.find(row => row.id === casterId).extensions.v5.divineEffects.find(row => row.id === layerId);
  live.zone.members = members;
  const names = members.map(id => nameOf(participants.find(row => row.id === id)));
  next.log = [{ id: `divine-zone:${layerId}:${state.localRevision || 0}`, kind: 'effect', actorId: casterId, actorName: bearer.name,
    text: `${live.zone.label} : présents dans la zone — ${names.length ? names.join(', ') : 'personne'}`, detail: { kind: 'divine-zone-members', layerId, members } }, ...(next.log || [])].slice(0, 300);
  return { ok: true, state: next, members };
}
