/** Durable V5 Fortune belongs to a character, independently of scene projections. */
const clone = structuredClone;
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim() ? value : null;
const balance = value => { if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('Solde de Fortune invalide'); return value; };
import { markCorruptionThresholdTest } from './v5-corruption.js';

/** Shared action/quota clock, including restarted combats and legacy saved scenes. */
export function v5CombatActionClock(envelope) {
  const scene = envelope.activeScene;
  const combatScopeId = scene?.extensions?.v5?.combatScopeId || (!scene ? envelope.extensions?.v5?.combatScopeId : null);
  const encounterId = combatScopeId || scene?.encounterId || scene?.id || envelope.extensions?.v5?.combatId;
  const turnScopeId = combatScopeId || scene?.id || encounterId;
  const round = envelope.combat?.round;
  const serial = scene?.extensions?.v5?.turnIndex ?? envelope.extensions?.v5?.turnIndex;
  const actorId = envelope.combat?.currentActorId;
  return {
    ...(envelope.extensions?.v5?.talentSessionId ? {sessionId: envelope.extensions.v5.talentSessionId} : {}),
    ...(encounterId ? {encounterId} : {}),
    ...(Number.isSafeInteger(round) && round > 0 ? {round} : {}),
    ...(encounterId && actorId && Number.isSafeInteger(serial) && serial > 0 ? {turnId: `${turnScopeId}:${serial}:${actorId}`} : {})
  };
}

/** Never match a name or a repeated NPC template to a character. */
export function v5ResourceIdentity(envelope, subject) {
  if (!record(subject)) return null;
  const ficheId = text(subject.extensions?.ficheId) || text(subject.ficheSnapshot?.charId);
  if (ficheId) return 'fiche:' + ficheId;
  if (text(subject.persistentCharacterId)) return 'persistent:' + subject.persistentCharacterId;
  if ((envelope.persistentCharacters || []).some(row => row.id === subject.id)) return 'persistent:' + subject.id;
  if (text(subject.extensions?.v5?.resourceCharacterId)) return 'local:' + subject.extensions.v5.resourceCharacterId;
  if (subject.kind === 'PJ') {
    if (text(subject.profileId)) return 'profile:' + subject.profileId;
    if ((envelope.reserve || []).some(row => row.id === subject.id)) return 'profile:' + subject.id;
  }
  return null;
}
function registryOf(envelope) {
  const registry = envelope.extensions?.v5?.characterResources ?? [];
  if (!Array.isArray(registry)) throw new TypeError('Registre de Fortune invalide');
  const seen = new Set();
  for (const row of registry) {
    if (!record(row) || !text(row.characterId) || seen.has(row.characterId)) throw new TypeError('Identité de Fortune invalide ou dupliquée');
    balance(row.fortune); seen.add(row.characterId);
  }
  return clone(registry);
}
/**
 * Composante temporaire (Chance et Destin) : les points portés par les couches d'effets actives (`remainingTempFortune`,
 * `remainingTempFate`). Elle n'est jamais recopiée dans des champs à plat : elle expire avec la couche, se dépense ici,
 * et le registre la combine au solde permanent.
 */
const TEMPORARY_KEYS = Object.freeze({ fortune: 'remainingTempFortune', fate: 'remainingTempFate' });
function temporaryLayers(subject) {
  const v5 = record(subject) ? subject.extensions?.v5 : null;
  return [v5?.spellEffects, v5?.divineEffects].flatMap(list => Array.isArray(list) ? list : []);
}
function temporaryOfSubject(subject, kind) {
  const effects = temporaryLayers(subject);
  if (!effects.length) return 0;
  return effects.reduce((sum, effect) => sum + Math.max(0, Number(effect?.[TEMPORARY_KEYS[kind]]) || 0), 0);
}
/**
 * Participants portant la ressource d'un même personnage : le sujet d'abord, puis ses autres participants de combat.
 * La ressource est celle du personnage ; chaque couche reste portée (et dépensée) par le participant qui l'a reçue.
 */
function carriersOf(envelope, subject, characterId, participants = envelope?.combat?.participants || []) {
  const carriers = [], seen = new Set();
  for (const p of [subject, ...participants]) {
    if (!record(p) || seen.has(p.id)) continue;
    if (p === subject || p.id === subject?.id || (characterId && v5ResourceIdentity(envelope, p) === characterId)) { seen.add(p.id); carriers.push(p); }
  }
  return carriers;
}
function temporaryOf(envelope, subject, characterId, kind) {
  return carriersOf(envelope, subject, characterId).reduce((sum, p) => sum + temporaryOfSubject(p, kind), 0);
}
function consumeTemporary(participant, kind, amount) {
  if (!record(participant)) throw new TypeError('Participant invalide');
  const next = clone(participant);
  let remaining = Math.max(0, Number(amount) || 0), consumed = 0;
  for (const effect of temporaryLayers(next)) {
    if (remaining <= 0) break;
    const available = Math.max(0, Number(effect?.[TEMPORARY_KEYS[kind]]) || 0);
    const take = Math.min(available, remaining);
    if (take > 0) { effect[TEMPORARY_KEYS[kind]] = available - take; remaining -= take; consumed += take; }
  }
  return { consumed, participant: next };
}
/** Dépense de Chance temporaire sur un participant (avant toute Chance permanente). */
export const consumeTemporaryFortune = (participant, amount = 1) => consumeTemporary(participant, 'fortune', amount);
/** Dépense de Destin temporaire sur un participant. */
export const consumeTemporaryFate = (participant, amount = 1) => consumeTemporary(participant, 'fate', amount);
/** Dépense la composante temporaire d'un personnage sur les participants qui portent ses couches ; `participants` n'est pas muté. */
export function spendV5Temporary(envelope, participants, subject, kind, amount) {
  const next = clone(participants), characterId = v5ResourceIdentity(envelope, subject);
  let remaining = Math.max(0, Number(amount) || 0), consumed = 0;
  for (const carrier of carriersOf(envelope, subject, characterId, next)) {
    if (remaining <= 0) break;
    const index = next.findIndex(p => p.id === carrier.id);
    if (index < 0) continue;
    const res = consumeTemporary(next[index], kind, remaining);
    next[index] = res.participant; remaining -= res.consumed; consumed += res.consumed;
  }
  return { consumed, participants: next };
}
/** « N » ou « N (dont T temporaire(s)) » : le solde affiché inclut la composante temporaire, il faut le dire. */
export function formatV5Balance({ balance, temporary = 0 } = {}) {
  if (balance === null || balance === undefined) return '?';
  return temporary > 0 ? `${balance} (dont ${temporary} temporaire${temporary > 1 ? 's' : ''})` : String(balance);
}

/** The balance stays unknown until the permanent counter is initialized: temporary points never stand in for it. */
export function pendingWrathFortune(subject) { return (Array.isArray(subject?.extensions?.v5?.divineEffects)?subject.extensions.v5.divineEffects:[]).filter(row=>row.type==='wrath-fortune-refresh'); }
/** Renouvellement explicite : le pool permanent est remplacé, la Chance temporaire reste portée par ses effets. */
export function refreshV5Fortune(envelope,subject,normalAmount,{reason,eventId}={}) {
 balance(normalAmount);if(!text(reason)||!text(eventId))throw new TypeError('Motif MJ et identité du renouvellement requis');
 const known=getV5Fortune(envelope,subject);if(known.permanent===null)throw new TypeError('Initialisez le solde connu avant de renouveler la Chance');
 if((envelope.extensions?.v5?.fortuneRefreshReceipts||[]).some(row=>row.eventId===eventId))throw new TypeError('Renouvellement déjà enregistré');
 const markers=pendingWrathFortune(subject),granted=markers.length?1:normalAmount;
 let next=setV5Fortune(envelope,subject,granted),ids=markers.map(row=>row.id),identity=known.characterId;
 const clean=rows=>(rows||[]).map(row=>{if(row.id!==subject.id&&v5ResourceIdentity(next,row)!==identity)return row;const result=clone(row);if(Array.isArray(result.extensions?.v5?.divineEffects))result.extensions.v5.divineEffects=result.extensions.v5.divineEffects.filter(effect=>!ids.includes(effect.id));return result;});
 next.reserve=clean(next.reserve);next.persistentCharacters=clean(next.persistentCharacters);next.combat.participants=clean(next.combat.participants);if(next.activeScene)next.activeScene.participants=clean(next.activeScene.participants);next.suspendedScenes=recordScenes(next.suspendedScenes).map(scene=>({...scene,participants:clean(scene.participants)}));
 const receipt={eventId,actorId:subject.id,characterId:identity,normalAmount,granted,markerIds:ids,reason:reason.trim()};next.extensions.v5.fortuneRefreshReceipts=[...(next.extensions.v5.fortuneRefreshReceipts||[]),receipt].slice(-300);
 next.log=[{id:eventId+':log',kind:'management',actorId:subject.id,text:'Chance renouvelée : '+granted+' point(s) permanent(s)'+(markers.length?' · Courroux 121–125 consommé':''),detail:clone(receipt)},...(next.log||[])].slice(0,300);return projectV5ResourceEnvelope(next);
}
export function getV5Fortune(envelope, subject) {
  const characterId = v5ResourceIdentity(envelope, subject);
  const entry = registryOf(envelope).find(row => row.characterId === characterId);
  const sourceValue = subject?.ficheSnapshot?.resources?.fortune;
  const sourceId = subject?.ficheSnapshot?.charId;
  const sourceMatches = !subject?.extensions?.ficheId || subject.extensions.ficheId === sourceId;
  const sourceBalance = sourceMatches && Number.isSafeInteger(sourceValue) && sourceValue >= 0 ? sourceValue : null;
  // V4 profile conversion leaves an explicit Fortune value on the imported profile. Adopt it
  // as the initial durable balance until the character registry is materialized by a spend.
  const legacyProfileBalance=subject?.extensions?.legacyConversions?.v4ToV5===true?subject?.extensions?.v5?.resources?.fortune:null;
  const permanent = entry?.fortune ?? (Number.isSafeInteger(legacyProfileBalance)&&legacyProfileBalance>=0?legacyProfileBalance:null);
  const temporary = temporaryOf(envelope, subject, characterId, 'fortune');
  return { characterId, balance: permanent === null ? null : permanent + temporary, permanent, temporary, sourceBalance, initializedFrom: entry?.initializedFrom ?? null, ...(pendingWrathFortune(subject).length?{refreshLimit:1}:{}) };
}
/** Destin : le solde permanent est le champ canonique `extensions.v5.fate` ; seule la part temporaire vient des couches. */
export function getV5Fate(envelope, subject) {
  const stored = subject?.extensions?.v5?.fate ?? subject?.fate;
  const permanent = stored !== undefined && stored !== null && stored !== '' && Number.isSafeInteger(Number(stored)) && Number(stored) >= 0 ? Number(stored) : null;
  const temporary = temporaryOf(envelope, subject, v5ResourceIdentity(envelope, subject), 'fate');
  return { balance: permanent === null ? null : permanent + temporary, permanent, temporary };
}
/** Registry is authoritative: an old participant cache is never a current balance. */
export function projectV5Resources(envelope, participants = []) {
  return participants.map(subject => {
    const next = clone(subject), fortune = getV5Fortune(envelope, subject).balance;
    if (fortune !== null) next.extensions = { ...(next.extensions || {}), v5: { ...(next.extensions?.v5 || {}), resources: { ...(next.extensions?.v5?.resources || {}), fortune } } };
    else if (Object.hasOwn(next.extensions?.v5?.resources || {}, 'fortune')) delete next.extensions.v5.resources.fortune;
    return next;
  });
}
/** Scènes suspendues exploitables : une entrée nulle ou non objet d'une sauvegarde abîmée est écartée. */
const recordScenes = scenes => (Array.isArray(scenes) ? scenes : []).filter(scene => scene !== null && typeof scene === 'object' && !Array.isArray(scene));
export function projectV5ResourceEnvelope(envelope) {
  const next = clone(envelope);
  next.reserve = projectV5Resources(next, next.reserve || []);
  next.persistentCharacters = projectV5Resources(next, next.persistentCharacters || []);
  next.combat = { ...(next.combat || {}), participants: projectV5Resources(next, next.combat?.participants || []) };
  if (next.activeScene) next.activeScene.participants = projectV5Resources(next, next.activeScene.participants || []);
  next.suspendedScenes = recordScenes(next.suspendedScenes).map(scene => ({ ...scene, participants: projectV5Resources(next, scene.participants || []) }));
  return next;
}
function withRegistry(envelope, registry) {
  return { ...envelope, extensions: { ...(envelope.extensions || {}), v5: { ...(envelope.extensions?.v5 || {}), characterResources: registry } } };
}
/** Initialize/correct the tool balance. Source fiche is never written or refreshed implicitly. */
export function setV5Fortune(envelope, subject, value, { source = 'mj', characterId = null } = {}) {
  balance(value);
  if (!['mj', 'fiche'].includes(source)) throw new TypeError('Source de Fortune invalide');
  const known = getV5Fortune(envelope, subject);
  const existingEntry = registryOf(envelope).find(row => row.characterId === known.characterId);
  if (source === 'fiche' && (existingEntry || known.sourceBalance === null || known.sourceBalance !== value)) throw new TypeError('Solde courant de fiche non disponible pour initialisation');
  let next = clone(envelope), identity = known.characterId;
  if (!identity) {
    if (!text(characterId)) throw new TypeError('Identité stable du personnage requise');
    identity = 'local:' + characterId;
    const assign = rows => rows.map(row => row.id === subject.id ? { ...row, extensions: { ...(row.extensions || {}), v5: { ...(row.extensions?.v5 || {}), resourceCharacterId: characterId } } } : row);
    next.combat.participants = assign(next.combat?.participants || []);
    if (next.activeScene) next.activeScene.participants = assign(next.activeScene.participants || []);
    next.suspendedScenes = recordScenes(next.suspendedScenes).map(scene => ({ ...scene, participants: assign(scene.participants || []) }));
  }
  const registry = registryOf(next), index = registry.findIndex(row => row.characterId === identity);
  const entry = { ...(index >= 0 ? registry[index] : {}), characterId: identity, fortune: value, initializedFrom: index >= 0 ? registry[index].initializedFrom : source };
  if (index >= 0) registry[index] = entry; else registry.push(entry);
  return projectV5ResourceEnvelope(withRegistry(next, registry));
}
/**
 * V5 p. 239, Clairvoyance chaotique : chaque Point de Chance dépensé (temporaire ou permanent) coûte `corruptionPerFortuneSpent` Point(s) de Corruption.
 * Crédit unique pour le personnage : le taux est celui de ses projections, le résultat est reflété sur chacune. Modifie `participants` sur place.
 */
export function creditFortuneCorruption(envelope, participants, subject, spent) {
  const identity = v5ResourceIdentity(envelope, subject);
  const carriers = carriersOf(envelope, subject, identity, participants).filter(p => participants.some(row => row.id === p.id));
  const rate = Math.max(0, ...carriers.map(p => Number(p.extensions?.v5?.corruptionPerFortuneSpent) || 0));
  if (!rate || !(spent > 0)) return participants;
  const total = (Number(subject.extensions?.v5?.corruptionPoints) || 0) + spent * rate;
  for (const carrier of carriers) {
    const target = participants.find(p => p.id === carrier.id);
    target.extensions = { ...(target.extensions || {}), v5: { ...(target.extensions?.v5 || {}), corruptionPoints: total } };
    Object.assign(target, markCorruptionThresholdTest(target));
  }
  return participants;
}
/** Copy paid action balances back once, then refresh every live projection of that character. */
export function commitV5Resources(envelope, participants = []) {
  const registry = registryOf(envelope), updates = new Map(), credited = new Set();
  const nextParticipants = clone(participants);
  for (let i = 0; i < nextParticipants.length; i++) {
    const subject = nextParticipants[i];
    const identity = v5ResourceIdentity(envelope, subject), entry = registry.find(row => row.characterId === identity);
    if (!Object.hasOwn(subject.extensions?.v5?.resources || {}, 'fortune')) continue;
    const value = balance(subject.extensions.v5.resources.fortune);
    const tempBefore = temporaryOf(envelope, subject, identity, 'fortune');
    const profileBalance=subject.extensions?.legacyConversions?.v4ToV5===true?subject.extensions?.v5?.resources?.fortune:null;
    const permBefore = entry ? entry.fortune : Number.isSafeInteger(profileBalance)&&profileBalance>=0?profileBalance:0;
    const totalBefore = permBefore + tempBefore;
    if (value === totalBefore) continue;
    if (value < totalBefore) {
      const spent = totalBefore - value;
      const spentTemp = Math.min(tempBefore, spent);
      const spentPerm = spent - spentTemp;
      if (!credited.has(identity || subject.id)) { credited.add(identity || subject.id); creditFortuneCorruption(envelope, nextParticipants, nextParticipants[i], spent); }
      if (spentTemp > 0) nextParticipants.splice(0, nextParticipants.length, ...spendV5Temporary(envelope, nextParticipants, nextParticipants[i], 'fortune', spentTemp).participants);
      if (entry || identity && Number.isSafeInteger(profileBalance)) {
        const nextPerm = balance(permBefore - spentPerm);
        if (updates.has(identity) && updates.get(identity) !== nextPerm) throw new TypeError('Soldes de Fortune contradictoires pour un personnage');
        updates.set(identity, nextPerm);
      }
    } else if (entry || identity && Number.isSafeInteger(profileBalance)) {
      const nextPerm = balance(Math.max(0, value - tempBefore));
      if (updates.has(identity) && updates.get(identity) !== nextPerm) throw new TypeError('Soldes de Fortune contradictoires pour un personnage');
      updates.set(identity, nextPerm);
    }
  }
  for (const [characterId, value] of updates) {
    const existing=registry.find(row=>row.characterId===characterId);
    if(existing)existing.fortune=value;
    else registry.push({characterId,fortune:value,initializedFrom:'v4-profile'});
  }
  return projectV5ResourceEnvelope(withRegistry({ ...envelope, combat: { ...(envelope.combat || {}), participants: nextParticipants } }, registry));
}

/** Keep permanent Destin debits on every durable projection of the same character. */
export function commitV5Fate(envelope, participants = []) {
  const before=envelope?.combat?.participants||[],changes=new Map(),profileBalances=new Map();
  for(const current of participants){
    const previous=before.find(row=>row.id===current.id),oldValue=previous?.extensions?.v5?.fate??previous?.fate,newValue=current?.extensions?.v5?.fate??current?.fate;
    if(oldValue===undefined||oldValue===null||newValue===undefined||newValue===null||Number(oldValue)===Number(newValue))continue;
    const characterId=v5ResourceIdentity(envelope,current);if(characterId)changes.set(characterId,Number(newValue));
    if(typeof current.profileId==='string'&&current.profileId.trim())profileBalances.set(current.profileId,Number(newValue));
  }
  if(!changes.size&&!profileBalances.size)return {...envelope,combat:{...(envelope.combat||{}),participants}};
  const update=rows=>(rows||[]).map(row=>{const characterId=v5ResourceIdentity(envelope,row),value=changes.has(characterId)?changes.get(characterId):profileBalances.get(row.id);if(value===undefined)return row;const next=clone(row);next.extensions={...(next.extensions||{}),v5:{...(next.extensions?.v5||{}),fate:value}};if(Object.hasOwn(next,'fate'))next.fate=value;return next;});
  const next={...envelope,reserve:update(envelope.reserve),persistentCharacters:update(envelope.persistentCharacters),combat:{...(envelope.combat||{}),participants:update(participants)}};
  if(envelope.activeScene)next.activeScene={...envelope.activeScene,participants:update(envelope.activeScene.participants)};
  next.suspendedScenes=recordScenes(envelope.suspendedScenes).map(scene=>({...scene,participants:update(scene.participants)}));
  return next;
}

/** An explicit first PJ binding can rename its local resource identity, never infer it from a name. */
export function reconcileV5ResourceBindings(before, next, entries = []) {
  const registry = registryOf(next), profileTargets = new Map(), targetProfiles = new Map();
  for (const entry of entries) {
    const charId = text(entry.snapshot?.charId);
    if (!text(entry.profileId) || !charId) continue;
    if (!profileTargets.has(entry.profileId)) profileTargets.set(entry.profileId, new Set());
    if (!targetProfiles.has(charId)) targetProfiles.set(charId, new Set());
    profileTargets.get(entry.profileId).add(charId); targetProfiles.get(charId).add(entry.profileId);
  }
  const priorSubjects = [...(before.combat?.participants || []), ...(before.activeScene?.participants || []), ...recordScenes(before.suspendedScenes).flatMap(scene => scene.participants || []), ...(before.persistentCharacters || [])];
  for (const entry of entries) {
    const profile = (before.reserve || []).find(row => row.id === entry.profileId), charId = text(entry.snapshot?.charId);
    const updated = (next.reserve || []).find(row => row.id === entry.profileId);
    if (!profile || profile.kind !== 'PJ' || !charId || entry.replaceAssociation === true || text(profile.extensions?.ficheId) || text(profile.ficheSnapshot?.charId)
      || updated?.extensions?.ficheId !== charId || profileTargets.get(profile.id)?.size !== 1 || targetProfiles.get(charId)?.size !== 1) continue;
    const fromId = 'profile:' + profile.id, toId = 'fiche:' + charId;
    const record = registry.find(row => row.characterId === fromId);
    if (!record || registry.some(row => row.characterId === toId)) continue;
    const otherLinked = (before.reserve || []).some(row => row.id !== profile.id && (row.extensions?.ficheId === charId || row.ficheSnapshot?.charId === charId));
    const conflictingCopy = priorSubjects.filter(row => row.profileId === profile.id).some(row => {
      const identity = v5ResourceIdentity(before, row);
      return identity && identity !== fromId && registry.some(item => item.characterId === identity);
    });
    if (otherLinked || conflictingCopy) continue;
    record.characterId = toId;
  }
  return projectV5ResourceEnvelope(withRegistry(next, registry));
}
