/**
 * Sujet d'un suivi (blessure, maladie, séquelle) et personnages suivis hors rencontre (CAMP-10).
 *
 * Module pur. Un personnage suivi est un personnage persistant ; hors rencontre il est projeté
 * comme un participant (profil + état persistant) sous l'identifiant `suivi:<id>`. Un suivi
 * rattaché (`ownerId`) porte toujours dans `participantId` l'identifiant de son sujet actuel :
 * l'exemplaire en rencontre, sinon `suivi:<id>`. Le rattachement ne se déduit jamais d'un nom,
 * d'un profil ou d'un rang.
 */
import { cloneValue, normalizeFicheFields, uid } from './models.js';

export const FOLLOWED_PREFIX = 'suivi:';
export const followedSubjectId = characterId => FOLLOWED_PREFIX + characterId;
export const followedCharacterIdOf = subjectId => (typeof subjectId === 'string' && subjectId.startsWith(FOLLOWED_PREFIX) ? subjectId.slice(FOLLOWED_PREFIX.length) : null);

const CRITICAL_FIELDS = ['criticalAftermath', 'criticalWounds'];
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const text = value => (typeof value === 'string' && value.trim() ? value.trim() : '');
const ficheIdOf = row => text(row?.extensions?.ficheId) || text(row?.ficheSnapshot?.charId);
const combatOf = envelope => (Array.isArray(envelope?.combat?.participants) ? envelope.combat.participants : []);
const suspendedOf = envelope => (Array.isArray(envelope?.suspendedScenes) ? envelope.suspendedScenes : []).flatMap(scene => (Array.isArray(scene?.participants) ? scene.participants : []));
const charactersOf = envelope => (Array.isArray(envelope?.persistentCharacters) ? envelope.persistentCharacters : []).filter(row => row?.id);
const registerOf = envelope => (isRecord(envelope?.extensions?.v5?.aftermathRegister) ? envelope.extensions.v5.aftermathRegister : null);
const withRegister = (envelope, register) => ({ ...envelope, extensions: { ...(envelope.extensions || {}), v5: { ...(envelope.extensions?.v5 || {}), aftermathRegister: register } } });

/** Suivi encore vivant : ni clos, ni guéri, ni archivé. */
const DEAD_SEQUELA = new Set(['archived', 'healed', 'waived', 'not-applicable', 'resolved', 'closed']);
export const isLiveIncident = row => row?.status === 'open';
export const isLiveDisease = row => row?.status === 'active';
export const isLiveSequela = row => Boolean(row) && !DEAD_SEQUELA.has(row.status);
export function liveAftermathRows(register, participantId) {
  if (!register) return [];
  return [
    ...(register.incidents || []).filter(row => row.participantId === participantId && isLiveIncident(row)),
    ...(register.diseases || []).filter(row => row.participantId === participantId && isLiveDisease(row)),
    ...(register.sequelae || []).filter(row => row.participantId === participantId && isLiveSequela(row))
  ];
}

/** Participant factice d'un personnage suivi hors rencontre : son profil complété par son état persistant. */
export function projectFollowedCharacter(character, profile = null) {
  const base = isRecord(profile) ? profile : {};
  const maxHp = character.maxHp ?? base.maxHp ?? base.hp ?? null;
  return {
    ...base,
    ...character,
    id: followedSubjectId(character.id),
    persistentCharacterId: character.id,
    profileId: character.profileId ?? base.id ?? null,
    name: character.name || base.name || '',
    kind: character.kind || base.kind || 'PJ',
    caracs: character.caracs ?? base.caracs,
    hp: Number(character.hp) || 0,
    maxHp: maxHp === null ? null : Number(maxHp) || 0,
    states: Array.isArray(character.states) ? character.states : [],
    extensions: { ...(base.extensions || {}), ...(character.extensions || {}), v5: { ...(base.extensions?.v5 || {}), ...(character.extensions?.v5 || {}) } }
  };
}

/**
 * Personnages suivis, chacun avec son sujet actuel : l'exemplaire du combat en cours (`combat`), celui d'une scène
 * suspendue (`suspendue`, consultation seule) ou sa projection hors rencontre (`suivi`). Un seul exemplaire par
 * personnage : le premier dans l'ordre des participants.
 */
export function followedCharacters(envelope) {
  const profiles = new Map((Array.isArray(envelope?.reserve) ? envelope.reserve : []).filter(row => row?.id).map(row => [row.id, row]));
  const combat = combatOf(envelope);
  const suspended = suspendedOf(envelope);
  return charactersOf(envelope).map(character => {
    const present = combat.find(row => row.persistentCharacterId === character.id) || null;
    const parked = present ? null : (suspended.find(row => row.persistentCharacterId === character.id) || null);
    const subject = present || parked || projectFollowedCharacter(character, profiles.get(character.profileId));
    return { id: character.id, character, where: present ? 'combat' : (parked ? 'suspendue' : 'suivi'), present: Boolean(present), subjectId: subject.id, subject };
  });
}

/** Fiches portées par plusieurs personnages suivis (CA38) : l'outil ne choisit pas. */
export function followedCharacterConflicts(envelope) {
  const groups = new Map();
  for (const character of charactersOf(envelope)) {
    const ficheId = ficheIdOf(character);
    if (!ficheId) continue;
    groups.set(ficheId, [...(groups.get(ficheId) || []), character]);
  }
  return [...groups].filter(([, rows]) => rows.length > 1).map(([ficheId, rows]) => ({ ficheId, characters: rows.map(row => ({ id: row.id, name: row.name || row.id, hp: row.hp ?? null })) }));
}

/** Tous les sujets soignables : participants du combat en cours, puis personnages suivis hors rencontre. */
export function aftermathSubjects(envelope) {
  return [...combatOf(envelope), ...followedCharacters(envelope).filter(row => row.where === 'suivi').map(row => row.subject)];
}
export const findAftermathSubject = (envelope, id) => aftermathSubjects(envelope).find(row => row.id === id) || null;

/**
 * Sujet d'une ligne du registre : `combat` (participant présent), `suivi` (personnage suivi hors rencontre) ou
 * `aucun` (scène suspendue, ancien suivi) : consultation seule.
 */
export function aftermathSubjectOf(envelope, row) {
  const none = { where: 'aucun', subject: null };
  if (!row) return none;
  const present = combatOf(envelope).find(item => item.id === row.participantId);
  if (present) return { where: 'combat', subject: present };
  const characterId = followedCharacterIdOf(row.participantId);
  if (!characterId) return none;
  const followed = followedCharacters(envelope).find(item => item.id === characterId && item.where === 'suivi');
  return followed ? { where: 'suivi', subject: followed.subject } : none;
}

/**
 * Sujet modifiable dans un brouillon. `target` se modifie en place ; `commit()` reporte un personnage suivi sur
 * son enregistrement persistant (PV, États, extensions V5 différentes de celles du profil). Sans effet en combat.
 */
export function mutableAftermathSubject(next, subjectId) {
  const present = combatOf(next).find(row => row.id === subjectId);
  if (present) return { where: 'combat', target: present, commit: () => next };
  const characterId = followedCharacterIdOf(subjectId);
  const character = characterId ? charactersOf(next).find(row => row.id === characterId) : null;
  if (!character) return null;
  const profile = (next.reserve || []).find(row => row?.id === character.profileId) || null;
  const target = cloneValue(projectFollowedCharacter(character, profile));
  return {
    where: 'suivi', target,
    commit() {
      const v5 = { ...(character.extensions?.v5 || {}) };
      const baseV5 = profile?.extensions?.v5 || {};
      for (const key of new Set([...Object.keys(v5), ...Object.keys(target.extensions?.v5 || {})])) {
        const value = target.extensions?.v5?.[key];
        if (value === undefined || same(value, baseV5[key])) delete v5[key]; else v5[key] = value;
      }
      const updated = { ...character, hp: target.hp, states: target.states || [], extensions: { ...(character.extensions || {}), v5 } };
      next.persistentCharacters = next.persistentCharacters.map(row => (row?.id === character.id ? updated : row));
      return next;
    }
  };
}

/** Nom enregistré à l'ouverture d'un suivi (CA1) : « participant — rencontre », ou le nom seul. */
export function aftermathOwnerLabel(envelope, subject) {
  const name = text(subject?.name) || 'Personnage sans nom';
  if (followedCharacterIdOf(subject?.id)) return name;
  const scene = envelope?.activeScene;
  const inScene = isRecord(scene) && (combatOf(envelope).some(row => row.id === subject?.id) || (scene.participants || []).some(row => row?.id === subject?.id));
  const title = inScene ? text(scene.title) : '';
  return title ? `${name} — ${title}` : name;
}
/** Champs enregistrés à l'ouverture d'un suivi : nom stable et, s'il existe, personnage suivi propriétaire. */
export function aftermathOwnership(envelope, subject) {
  const ownerId = followedCharacterIdOf(subject?.id)
    || (text(subject?.persistentCharacterId) && charactersOf(envelope).some(row => row.id === subject.persistentCharacterId)
      && combatOf(envelope).find(row => row.persistentCharacterId === subject.persistentCharacterId)?.id === subject.id ? subject.persistentCharacterId : null);
  return { ownerLabel: aftermathOwnerLabel(envelope, subject), ...(ownerId ? { ownerId } : {}) };
}

/**
 * Nom affiché d'un suivi (CA2 à CA4) : nom actuel du personnage suivi, sinon du participant présent, sinon nom
 * enregistré, sinon libellé de repli bâti sur les seules données de la ligne. Jamais un rang d'affichage.
 */
export function aftermathRowLabel(envelope, row) {
  if (!row) return 'Suivi';
  if (row.ownerId) {
    const character = charactersOf(envelope).find(item => item.id === row.ownerId);
    if (text(character?.name)) return character.name.trim();
  }
  const subject = [...combatOf(envelope), ...suspendedOf(envelope)].find(item => item.id === row.participantId);
  if (text(subject?.name)) return subject.name.trim();
  const characterId = followedCharacterIdOf(row.participantId);
  const character = characterId ? charactersOf(envelope).find(item => item.id === characterId) : null;
  if (text(character?.name)) return character.name.trim();
  if (text(row.ownerLabel)) return row.ownerLabel.trim();
  const day = [row.injuryDay, row.startDay, row.day, row.decidedDay].find(Number.isSafeInteger);
  const cause = row.source?.kind === 'critical' ? 'Blessure Critique' : (text(row.source?.cause) || text(row.label) || 'suivi');
  return `Ancien suivi${Number.isSafeInteger(day) ? ` du jour ${day}` : ''} (${cause})`;
}

const ROW_LISTS = ['incidents', 'diseases', 'sequelae'];
/** Réaligne des lignes du registre : `mapping` = Map(ancien participantId → { participantId, ownerId?, ownerLabel? }). */
export function rekeyAftermathRegister(register, mapping) {
  if (!register || !mapping?.size) return register;
  let changed = false;
  const next = { ...register };
  for (const list of ROW_LISTS) {
    if (!Array.isArray(register[list])) continue;
    const taken = new Set(register[list].map(row => row.id));
    next[list] = register[list].map(row => {
      const to = mapping.get(row.participantId);
      if (!to) return row;
      const updated = { ...row, participantId: to.participantId };
      if (to.ownerId) updated.ownerId = to.ownerId;
      if (to.ownerLabel && !text(row.ownerLabel)) updated.ownerLabel = to.ownerLabel;
      // La décision de cicatrices est identifiée par son sujet : elle le suit.
      if (row.kind === 'scar-decision' && row.id === `scars:${row.participantId}` && !taken.has(`scars:${to.participantId}`)) updated.id = `scars:${to.participantId}`;
      if (!same(updated, row)) changed = true;
      return updated;
    });
  }
  if (!changed) return register;
  next.revision = (Number(register.revision) || 0) + 1;
  return next;
}

/** Archive les suivis vivants des sujets donnés ; rend `{ register, archived }`. */
export function archiveAftermathRows(register, participantIds) {
  const ids = new Set(participantIds);
  if (!register || !ids.size) return { register, archived: [] };
  const day = register.calendar?.currentDay ?? 0;
  const archived = [];
  const next = { ...register };
  const sweep = (list, live, kind) => {
    if (!Array.isArray(register[list])) return;
    next[list] = register[list].map(row => {
      if (!ids.has(row.participantId) || !live(row)) return row;
      archived.push({ kind, id: row.id, participantId: row.participantId });
      return { ...row, status: 'archived', archivedDay: day, ...(kind === 'incident' ? {} : { archivedFrom: row.status }) };
    });
  };
  sweep('incidents', isLiveIncident, 'incident');
  sweep('diseases', isLiveDisease, 'disease');
  sweep('sequelae', isLiveSequela, 'sequela');
  if (!archived.length) return { register, archived };
  next.revision = (Number(register.revision) || 0) + 1;
  return { register: next, archived };
}

/** Les suivis rattachés portent l'identifiant du sujet actuel de leur personnage (lancement, reprise, fin). */
export function reconcileAftermathOwners(envelope) {
  const register = registerOf(envelope);
  if (!register) return envelope;
  const followed = new Map(followedCharacters(envelope).map(row => [row.id, row]));
  const mapping = new Map();
  for (const list of ROW_LISTS) for (const row of register[list] || []) {
    const owner = row.ownerId ? followed.get(row.ownerId) : null;
    if (owner && owner.subjectId !== row.participantId) mapping.set(row.participantId, { participantId: owner.subjectId, ownerId: owner.id });
  }
  const next = rekeyAftermathRegister(register, mapping);
  return next === register ? envelope : withRegister(envelope, next);
}

const criticalsOf = participant => Object.fromEntries(CRITICAL_FIELDS.filter(key => Array.isArray(participant?.extensions?.v5?.[key]) && participant.extensions.v5[key].length).map(key => [key, cloneValue(participant.extensions.v5[key])]));
/** Report d'un participant sur son personnage suivi : PV, États et Blessures Critiques (CA6). */
function reportOnCharacter(character, participant) {
  const v5 = { ...(character.extensions?.v5 || {}) };
  for (const key of CRITICAL_FIELDS) delete v5[key];
  Object.assign(v5, criticalsOf(participant));
  const extensions = { ...(character.extensions || {}) };
  if (Object.keys(v5).length) extensions.v5 = v5; else delete extensions.v5;
  return { ...character, hp: Number(participant.hp) || 0, ...(participant.maxHp != null && character.maxHp !== null ? { maxHp: participant.maxHp } : {}), states: cloneValue(participant.states || []), extensions };
}
function characterFrom(participant, { id, name, profile }) {
  const ficheId = ficheIdOf(participant);
  return reportOnCharacter({
    id, name, kind: participant.kind || 'PNJ', profileId: profile ? profile.id : null, hp: 0, maxHp: participant.maxHp ?? null, states: [],
    // Sans profil de réserve (improvisé), le personnage garde ses propres caractéristiques et compétences.
    ...(profile ? {} : { caracs: cloneValue(participant.caracs || {}), ...cloneValue(normalizeFicheFields(participant)), armor: cloneValue(participant.armor || {}) }),
    extensions: ficheId ? { ficheId } : {}
  }, participant);
}

/**
 * Fin de rencontre ou retrait de participants (CA6 à CA12) : reporte les personnages suivis, suit d'office les PJ
 * à fiche, garde ou archive les autres. `participantIds` restreint aux participants retirés (absent = tous) ;
 * `keepIds` = choix du MJ parmi `needsChoice`. Rend `{ envelope, needsChoice, reports, created, archived }`.
 */
export function planEncounterEnd(envelope, { keepIds = [], participantIds = null, idFactory = uid } = {}) {
  const keep = new Set(keepIds);
  const leaving = combatOf(envelope).filter(row => !participantIds || participantIds.includes(row.id));
  const profiles = new Map((envelope.reserve || []).filter(row => row?.id).map(row => [row.id, row]));
  let characters = charactersOf(envelope);
  let register = registerOf(envelope);
  const exemplarOf = new Map(followedCharacters(envelope).filter(row => row.present).map(row => [row.id, row.subjectId]));
  const mapping = new Map();
  const toArchive = [];
  const needsChoice = [], reports = [], created = [];
  const follow = (participant, character, isNew) => {
    characters = isNew ? [...characters, character] : characters.map(row => (row.id === character.id ? reportOnCharacter(row, participant) : row));
    mapping.set(participant.id, { participantId: followedSubjectId(character.id), ownerId: character.id, ownerLabel: aftermathOwnerLabel(envelope, participant) });
    (isNew ? created : reports).push({ participantId: participant.id, characterId: character.id, name: character.name });
  };
  for (const participant of leaving) {
    const live = liveAftermathRows(register, participant.id);
    const linked = participant.persistentCharacterId && exemplarOf.get(participant.persistentCharacterId) === participant.id
      ? characters.find(row => row.id === participant.persistentCharacterId) : null;
    if (linked) { follow(participant, linked, false); continue; }
    const profile = profiles.get(participant.profileId) || null;
    const ficheId = participant.kind === 'PJ' ? ficheIdOf(participant) : '';
    if (ficheId) {
      const candidates = characters.filter(row => ficheIdOf(row) === ficheId);
      if (candidates.length === 1 && !exemplarOf.has(candidates[0].id) && ![...mapping.values()].some(row => row.ownerId === candidates[0].id)) { follow(participant, candidates[0], false); continue; }
      if (!candidates.length) {
        const hurt = Number(participant.hp) < Number(participant.maxHp) || Object.keys(criticalsOf(participant)).length > 0;
        if (live.length || hurt) follow(participant, characterFrom(participant, { id: idFactory(), name: text(participant.name) || 'Personnage sans nom', profile }), true);
        continue;
      }
    }
    if (!live.length) continue;
    const label = aftermathOwnerLabel(envelope, participant);
    needsChoice.push({ participantId: participant.id, name: participant.name || '', label, kind: participant.kind || '', dead: participant.extensions?.v5?.dead === true, count: live.length });
    if (keep.has(participant.id)) follow(participant, characterFrom(participant, { id: idFactory(), name: label, profile }), true);
    else toArchive.push(participant.id);
  }
  register = rekeyAftermathRegister(register, mapping);
  const swept = archiveAftermathRows(register, toArchive);
  let next = { ...envelope, persistentCharacters: characters };
  if (swept.register && swept.register !== registerOf(envelope)) next = withRegister(next, swept.register);
  return { envelope: next, needsChoice, reports, created, archived: swept.archived };
}

/** Supprimer un personnage suivi archive ses suivis ouverts (CA39). Rend `{ envelope, archived }`. */
export function planFollowedCharacterRemoval(envelope, characterId) {
  const register = registerOf(envelope);
  const ids = [followedSubjectId(characterId)];
  const owned = register ? ROW_LISTS.flatMap(list => register[list] || []).filter(row => row.ownerId === characterId).map(row => row.participantId) : [];
  const swept = archiveAftermathRows(register, [...ids, ...owned.filter(id => !combatOf(envelope).some(row => row.id === id) && !suspendedOf(envelope).some(row => row.id === id))]);
  let next = { ...envelope, persistentCharacters: (envelope.persistentCharacters || []).filter(row => row?.id !== characterId) };
  if (swept.archived.length) next = withRegister(next, swept.register);
  return { envelope: next, archived: swept.archived };
}

/**
 * Après toute commande : les suivis rattachés portent l'identifiant du sujet actuel de leur personnage, et les
 * suivis vivants d'un participant qui vient de disparaître (ni en combat, ni en scène suspendue) sont archivés.
 */
export function settleAftermathSubjects(before, next) {
  const out = reconcileAftermathOwners(next);
  const register = registerOf(out);
  if (!register) return out;
  const still = new Set([...combatOf(out), ...suspendedOf(out)].map(row => row.id));
  const gone = combatOf(before).map(row => row.id).filter(id => !still.has(id));
  if (!gone.length) return out;
  const swept = archiveAftermathRows(register, gone);
  return swept.archived.length ? withRegister(out, swept.register) : out;
}

/** Où se trouve le sujet d'un suivi : `combat`, `suivi` (hors rencontre), `suspendue` (scène suspendue) ou `aucun`. */
export function aftermathPlaceOf(envelope, participantId) {
  if (combatOf(envelope).some(row => row.id === participantId)) return 'combat';
  if (suspendedOf(envelope).some(row => row.id === participantId)) return 'suspendue';
  const characterId = followedCharacterIdOf(participantId);
  const followed = characterId ? followedCharacters(envelope).find(row => row.id === characterId) : null;
  return followed ? (followed.where === 'suivi' ? 'suivi' : followed.where === 'suspendue' ? 'suspendue' : 'combat') : 'aucun';
}
