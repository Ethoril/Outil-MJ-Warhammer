// Usage de séance partagé avec le registre des actions V5. Chaque appel correspond à un Test réellement effectué.
import { v5ResourceIdentity } from './v5-resources.js';
import { hasV5Talent } from './v5-talents.js';

const QUOTA = 'talent:strong-minded';
const owner = (state, actor) => v5ResourceIdentity(state, actor) || `instance:${actor.id}`;
const key = state => state?.extensions?.v5?.talentSessionId ? JSON.stringify([state.extensions.v5.talentSessionId]) : null;
export const findObstinateActor = (state, id) => [...(state.combat?.participants || []), ...(state.activeScene?.participants || []), ...(state.reserve || []), ...(state.persistentCharacters || [])].find(row => row.id === id);

export function obstinateStatus(state, actor) {
  if (!actor || !hasV5Talent(actor, 'talent-strong-minded')) return { available: false, reason: 'Talent Obstiné non acquis.' };
  const scopeKey = key(state);
  if (!scopeKey) return { available: false, reason: 'Commencez d’abord une séance pour utiliser Obstiné.' };
  const used = (state.extensions?.v5?.actionLedger?.quotaUsage || []).some(row => row.actorId === owner(state, actor) && row.quotaId === QUOTA && row.scope === 'session' && row.scopeKey === scopeKey && row.used > 0);
  return used ? { available: false, reason: 'Obstiné est déjà utilisé pendant cette séance.' } : { available: true, reason: null };
}

export function consumeObstinate(state, actor, context) {
  if (context?.preRollTalent !== 'strong-minded') return;
  const status = obstinateStatus(state, actor);
  if (!status.available) throw Object.assign(new Error(`${actor?.name || 'Personnage'} : ${status.reason}`), { userFacing: true, code: 'OBSTINATE_UNAVAILABLE' });
  state.extensions ??= {};
  state.extensions.v5 ??= {};
  const ledger = state.extensions.v5.actionLedger ??= { appliedActions: [], quotaUsage: [] };
  ledger.quotaUsage ??= [];
  const actorId = owner(state, actor), scopeKey = key(state);
  const entry = ledger.quotaUsage.find(row => row.actorId === actorId && row.quotaId === QUOTA && row.scope === 'session' && row.scopeKey === scopeKey);
  if (entry) entry.used = 1;
  else ledger.quotaUsage.push({ actorId, quotaId: QUOTA, scope: 'session', scopeKey, used: 1 });
}
