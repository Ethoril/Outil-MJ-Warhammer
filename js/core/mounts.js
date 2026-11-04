/**
 * Montures (chantier du 04/11/2026). Module pur : rien ne s'écrit seul.
 * Le profil du cavalier déclare sa monture (`extensions.v5.declaredMount = { profileId, name, bestiaryId }`), un profil de
 * bibliothèque copié du bestiaire. En combat, le lien durable cavalier → monture est `extensions.v5.ownMountId` (côté cavalier)
 * et `extensions.v5.mountOf` (côté monture) ; l'état « monté » reste `mounted` + `mountId`, lu par le combat monté
 * (v5-mounted-combat.js), et une chute ou le banc ne retire que lui : le lien demeure pour remonter en selle.
 */
import { creatureSizeOf } from './creature-size.js';
import { V5_RIDE_SKILL_ID } from './v5-mounted-combat.js';

const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const v5Of = participant => participant?.extensions?.v5 || {};
const withV5 = (row, patch) => ({ ...row, extensions: { ...(row.extensions || {}), v5: patch({ ...v5Of(row) }) } });

/** Profil de bibliothèque de la monture d'un profil : identité stable par cavalier. */
export const mountProfileId = riderProfileId => `monture-${riderProfileId}`;
export const declaredMountOf = subject => (v5Of(subject).declaredMount?.profileId ? v5Of(subject).declaredMount : null);
export const ownMountIdOf = rider => (typeof v5Of(rider).ownMountId === 'string' && v5Of(rider).ownMountId) || null;
export const mountOfOf = mount => (typeof v5Of(mount).mountOf === 'string' && v5Of(mount).mountOf) || null;

const TRAINED = new Set(['trained', 'dresse']);
const MOUNT_WORDS = new Set(['mount', 'monture']);
/** Créature du bestiaire dressée comme monture : Trait (ou Trait optionnel) Trained/Dressé dont la liste porte Mount/Monture. */
export function isMountCandidate(record) {
  return [...(record?.traits || []), ...(record?.optionalTraits || [])].some(trait => {
    const text = typeof trait === 'string' ? trait : `${trait?.name ?? ''} (${trait?.param ?? ''})`;
    const match = /^\s*([^(]+?)\s*\(([^)]*)\)/.exec(text);
    return match && TRAINED.has(fold(match[1])) && match[2].split(/[,;]/).some(word => MOUNT_WORDS.has(fold(word)));
  });
}

const RIDE_NAMES = ['chevaucher', 'equitation', 'ride'];
/** Le cartouche propose « À pied / Monté » : monture liée ou déclarée, déjà monté, ou compétence Chevaucher. */
export function canRide(participant) {
  if (!participant) return false;
  if (v5Of(participant).mounted === true || ownMountIdOf(participant) || declaredMountOf(participant)) return true;
  return (participant.skills || []).some(skill => skill?.id === V5_RIDE_SKILL_ID || RIDE_NAMES.some(name => fold(skill?.name).startsWith(name)));
}

/** Cavalier monté sur `mountId` (au plus un). */
export const riderOf = (mountId, participants = []) => participants.find(row => v5Of(row).mounted === true && v5Of(row).mountId === mountId) || null;

/** Montures possibles d'un cavalier sans monture liée : participants actifs non PJ, ni lui-même, ni cavalier, ni déjà montés ou liés à un autre. */
export function mountCandidates(rider, participants = []) {
  return participants.filter(row => row.id !== rider?.id && row.zone === 'active' && row.kind !== 'PJ' && v5Of(row).mounted !== true
    && !riderOf(row.id, participants) && (!mountOfOf(row) || mountOfOf(row) === rider?.id));
}

/**
 * Bascule « monté / à pied ». `mountId` n'est utile que sans monture liée (choix parmi `mountCandidates`).
 * Rend `{ ok, mountId }` ou `{ ok: false, reason, message }`.
 */
export function planMountToggle(rider, participants = [], { mounted, mountId = null } = {}) {
  const refuse = (reason, message) => ({ ok: false, reason, message });
  if (!rider) return refuse('unknown-rider', 'Cavalier introuvable.');
  if (mounted !== true) return v5Of(rider).mounted === true ? { ok: true, mounted: false, mountId: v5Of(rider).mountId || null } : refuse('not-mounted', `${rider.name || 'Ce participant'} est déjà à pied.`);
  if (v5Of(rider).mounted === true) return refuse('already-mounted', `${rider.name || 'Ce participant'} est déjà en selle.`);
  if (rider.zone !== 'active') return refuse('rider-bench', 'Le cavalier doit être en jeu.');
  if (mountOfOf(rider) || riderOf(rider.id, participants)) return refuse('rider-is-mount', 'Une monture ne peut pas monter en selle.');
  const id = mountId || ownMountIdOf(rider);
  if (!id) return refuse('no-mount', 'Choisissez la monture.');
  if (id === rider.id) return refuse('self', 'Un participant ne peut pas être sa propre monture.');
  const mount = participants.find(row => row.id === id);
  if (!mount) return refuse('mount-missing', 'Monture absente de la rencontre.');
  if (mount.zone !== 'active') return refuse('mount-bench', `${mount.name || 'La monture'} est en attente : faites-la entrer d’abord.`);
  const other = riderOf(mount.id, participants);
  if (other && other.id !== rider.id) return refuse('mount-taken', `${mount.name || 'La monture'} porte déjà ${other.name || 'un cavalier'}.`);
  if (v5Of(mount).mounted === true) return refuse('mount-is-rider', `${mount.name || 'Ce participant'} est lui-même en selle.`);
  if (mountOfOf(mount) && mountOfOf(mount) !== rider.id) return refuse('mount-linked', `${mount.name || 'Cette monture'} est liée à un autre cavalier.`);
  return { ok: true, mounted: true, mountId: mount.id };
}

/** Applique une bascule validée : état monté du cavalier et lien durable des deux côtés. */
export function applyMountToggle(participants, riderId, plan) {
  return participants.map(row => {
    if (row.id === riderId) return withV5(row, v5 => {
      if (!plan.mounted) { const { mountId, ...rest } = v5; return { ...rest, mounted: false }; }
      return { ...v5, mounted: true, mountId: plan.mountId, ownMountId: plan.mountId };
    });
    if (plan.mounted && row.id === plan.mountId) return withV5(row, v5 => ({ ...v5, mountOf: riderId }));
    return row;
  });
}

/**
 * Montures déclarées par les profils : chaque cavalier sans monture liée se lie au participant du profil déclaré (`profileId`)
 * encore libre, qui prend son camp (allié pour un PJ). Rend la liste mise à jour (la même liste quand rien ne change).
 */
export function linkDeclaredMounts(participants = []) {
  const out = [...participants];
  for (let index = 0; index < out.length; index += 1) {
    const declared = declaredMountOf(out[index]);
    if (!declared || mountOfOf(out[index])) continue;
    const current = ownMountIdOf(out[index]);
    if (current && out.some(row => row.id === current)) continue;
    const at = out.findIndex(row => row.profileId === declared.profileId && row.id !== out[index].id && !mountOfOf(row));
    if (at < 0) continue;
    const riderId = out[index].id;
    out[index] = withV5(out[index], v5 => ({ ...v5, ownMountId: out[at].id }));
    out[at] = { ...withV5(out[at], v5 => ({ ...v5, mountOf: riderId })), camp: out[index].camp === 'pj' ? 'allie' : out[index].camp };
  }
  return out.every((row, index) => row === participants[index]) ? participants : out;
}

/** Libellé du cartouche : « Monté · Cheval », « À pied (Cheval) », « À pied ». */
export function mountLabel(rider, participants = []) {
  const id = v5Of(rider).mounted === true ? v5Of(rider).mountId : ownMountIdOf(rider);
  const mount = participants.find(row => row.id === id);
  const name = mount?.name || (id ? 'monture absente' : declaredMountOf(rider)?.name || '');
  return v5Of(rider).mounted === true ? `Monté · ${name || 'monture'}` : name ? `À pied (${name})` : 'À pied';
}

/**
 * État monté pour RPG Map Display (contrat figé, sans transport pour l'instant) : une ligne par cavalier lié ou monté.
 * Monté, la carte n'affiche qu'un jeton à la taille de la monture ; à pied, deux jetons.
 */
export function mountedStateForMap(participants = []) {
  return participants.filter(row => v5Of(row).mounted === true || ownMountIdOf(row)).map(rider => {
    const mounted = v5Of(rider).mounted === true;
    const mountId = (mounted ? v5Of(rider).mountId : ownMountIdOf(rider)) || null;
    const mount = participants.find(row => row.id === mountId) || null;
    return { riderId: rider.id, mounted, mountId, mountProfileId: mount?.profileId ?? null, mountSize: mount ? creatureSizeOf(mount).key : null };
  });
}
