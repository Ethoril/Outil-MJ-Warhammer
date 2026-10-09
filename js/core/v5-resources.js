/** Durable V5 Fortune belongs to a character, independently of scene projections. */
const clone = structuredClone;
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim() ? value : null;
const balance = value => { if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('Solde de Fortune invalide'); return value; };

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
/** A snapshot only offers a current balance; using it is an explicit initialization. */
export function getV5Fortune(envelope, subject) {
  const characterId = v5ResourceIdentity(envelope, subject);
  const entry = registryOf(envelope).find(row => row.characterId === characterId);
  const sourceValue = subject?.ficheSnapshot?.resources?.fortune;
  const sourceId = subject?.ficheSnapshot?.charId;
  const sourceMatches = !subject?.extensions?.ficheId || subject.extensions.ficheId === sourceId;
  const sourceBalance = sourceMatches && Number.isSafeInteger(sourceValue) && sourceValue >= 0 ? sourceValue : null;
  return { characterId, balance: entry?.fortune ?? null, sourceBalance, initializedFrom: entry?.initializedFrom ?? null };
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
export function projectV5ResourceEnvelope(envelope) {
  const next = clone(envelope);
  next.reserve = projectV5Resources(next, next.reserve || []);
  next.persistentCharacters = projectV5Resources(next, next.persistentCharacters || []);
  next.combat = { ...(next.combat || {}), participants: projectV5Resources(next, next.combat?.participants || []) };
  if (next.activeScene) next.activeScene.participants = projectV5Resources(next, next.activeScene.participants || []);
  next.suspendedScenes = (next.suspendedScenes || []).map(scene => ({ ...scene, participants: projectV5Resources(next, scene.participants || []) }));
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
  if (source === 'fiche' && (known.balance !== null || known.sourceBalance === null || known.sourceBalance !== value)) throw new TypeError('Solde courant de fiche non disponible pour initialisation');
  let next = clone(envelope), identity = known.characterId;
  if (!identity) {
    if (!text(characterId)) throw new TypeError('Identité stable du personnage requise');
    identity = 'local:' + characterId;
    const assign = rows => rows.map(row => row.id === subject.id ? { ...row, extensions: { ...(row.extensions || {}), v5: { ...(row.extensions?.v5 || {}), resourceCharacterId: characterId } } } : row);
    next.combat.participants = assign(next.combat?.participants || []);
    if (next.activeScene) next.activeScene.participants = assign(next.activeScene.participants || []);
    next.suspendedScenes = (next.suspendedScenes || []).map(scene => ({ ...scene, participants: assign(scene.participants || []) }));
  }
  const registry = registryOf(next), index = registry.findIndex(row => row.characterId === identity);
  const entry = { ...(index >= 0 ? registry[index] : {}), characterId: identity, fortune: value, initializedFrom: index >= 0 ? registry[index].initializedFrom : source };
  if (index >= 0) registry[index] = entry; else registry.push(entry);
  return projectV5ResourceEnvelope(withRegistry(next, registry));
}
/** Copy paid action balances back once, then refresh every live projection of that character. */
export function commitV5Resources(envelope, participants = []) {
  const registry = registryOf(envelope), updates = new Map();
  for (const subject of participants) {
    const identity = v5ResourceIdentity(envelope, subject), entry = registry.find(row => row.characterId === identity);
    if (!entry || !Object.hasOwn(subject.extensions?.v5?.resources || {}, 'fortune')) continue;
    const value = balance(subject.extensions.v5.resources.fortune);
    if (value === entry.fortune) continue;
    if (updates.has(identity) && updates.get(identity) !== value) throw new TypeError('Soldes de Fortune contradictoires pour un personnage');
    updates.set(identity, value);
  }
  for (const entry of registry) if (updates.has(entry.characterId)) entry.fortune = updates.get(entry.characterId);
  return projectV5ResourceEnvelope(withRegistry({ ...envelope, combat: { ...(envelope.combat || {}), participants: clone(participants) } }, registry));
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
  const priorSubjects = [...(before.combat?.participants || []), ...(before.activeScene?.participants || []), ...(before.suspendedScenes || []).flatMap(scene => scene.participants || []), ...(before.persistentCharacters || [])];
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
