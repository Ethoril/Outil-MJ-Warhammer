/** Pure V5 action resource/quota transaction. No Store, RNG or implicit reset. */
import { hasMomentum, withMomentum } from './v5-combat-rules.js';
export const V5_ACTION_COST_RULE_VERSION = 'v5-action-costs-2026-10-09.1';
const MOMENTUM_EXTRA_ATTACK_QUOTA = 'system:paid-momentum-extra-attack';
const clone = structuredClone;
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const id = (value, label) => { if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} requis`); return value; };
const integer = (value, label, minimum = 0) => { if (!Number.isSafeInteger(value) || value < minimum) throw new TypeError(`${label} invalide`); return value; };
const only = (value, keys) => { if (!record(value) || Object.keys(value).some(key => !keys.includes(key))) throw new TypeError('Champ de coût/quota non couvert'); };
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const participant = (state, actorId) => Array.isArray(state.participants) ? state.participants.find(row => row?.id === actorId) : record(state.participants) && Object.hasOwn(state.participants,actorId) ? state.participants[actorId] : null;
const temporaryFate = actor => [actor?.extensions?.v5?.spellEffects,actor?.extensions?.v5?.divineEffects].flatMap(rows=>Array.isArray(rows)?rows:[]).reduce((sum,effect)=>sum+Math.max(0,Number(effect?.remainingTempFate)||0),0);
const replace = (state, actor) => { if (Array.isArray(state.participants)) state.participants = state.participants.map(row => row.id === actor.id ? actor : row); else state.participants[actor.id] = actor; };
const ledgerOf = state => {
  const ledger = state.v5ActionLedger ?? { appliedActions: [], quotaUsage: [] };
  only(ledger, ['appliedActions', 'quotaUsage']);
  if (!Array.isArray(ledger.appliedActions) || !Array.isArray(ledger.quotaUsage)) throw new TypeError('Registre des usages invalide');
  const actions = new Set(), quotas = new Set();
  for (const entry of ledger.appliedActions) {
    only(entry, ['actionId', 'actorId', 'encounterId']); id(entry.actionId, 'Action enregistrée'); id(entry.actorId, 'Acteur enregistré');
    if (entry.encounterId !== null) id(entry.encounterId, 'Rencontre enregistrée');
    if (actions.has(entry.actionId)) throw new TypeError('Action enregistrée en double'); actions.add(entry.actionId);
  }
  for (const entry of ledger.quotaUsage) {
    only(entry, ['actorId', 'quotaId', 'scope', 'scopeKey', 'used']);
    id(entry.actorId, 'Acteur de quota'); id(entry.quotaId, 'Quota'); id(entry.scopeKey, 'Horloge de quota'); integer(entry.used, 'Usage de quota');
    if (!['turn', 'round', 'encounter','session'].includes(entry.scope)) throw new TypeError('Portée de quota invalide');
    const key = JSON.stringify([entry.actorId, entry.quotaId, entry.scope, entry.scopeKey]);
    if (quotas.has(key)) throw new TypeError('Quota enregistré en double'); quotas.add(key);
  }
  return clone(ledger);
};
function scopeKey(scope, clock, unresolved) {
  if(scope==='session'){if(!clock.sessionId){unresolved.push({field:'clock.sessionId',reason:'Démarrez explicitement la séance pour ces quotas.'});return null;}return JSON.stringify([id(clock.sessionId,'Séance')]);}
  if (!clock.encounterId) { unresolved.push({ field: 'clock.encounterId', reason: 'Rencontre requise pour les usages' }); return null; }
  id(clock.encounterId, 'Rencontre');
  if (scope === 'encounter') return JSON.stringify([clock.encounterId]);
  if (scope === 'round') {
    if (clock.round === undefined) { unresolved.push({ field: 'clock.round', reason: 'Round explicite requis' }); return null; }
    integer(clock.round, 'Round', 1); return JSON.stringify([clock.encounterId, clock.round]);
  }
  if (!clock.turnId) { unresolved.push({ field: 'clock.turnId', reason: 'Identité du Tour requise' }); return null; }
  return JSON.stringify([clock.encounterId, id(clock.turnId, 'Tour')]);
}
function normalizeRequest({ actionId, actorId, costs = [], quotas = [], exemptions = [], extraAttack = false, clock = {},quotaActorId }) {
  id(actionId, 'Action'); id(actorId, 'Acteur');
  if (!Array.isArray(costs) || !Array.isArray(quotas) || !Array.isArray(exemptions) || typeof extraAttack !== 'boolean') throw new TypeError('Plan de coûts invalide');
  only(clock, ['encounterId', 'round', 'turnId','sessionId']);
  if(clock.sessionId!=null)id(clock.sessionId,'Séance');if(quotaActorId!=null)id(quotaActorId,'Identité des quotas de séance');
  if (clock.encounterId != null) id(clock.encounterId, 'Rencontre');
  if (clock.turnId != null) id(clock.turnId, 'Tour');
  if (clock.round != null) integer(clock.round, 'Round', 1);
  const costIds = new Set(), quotaIds = new Set();
  for (const cost of costs) {
    only(cost, ['id', 'resource', 'amount', 'actorId']); id(cost.id, 'Coût'); id(cost.resource, 'Ressource'); integer(cost.amount, 'Montant', 1);
    if (cost.actorId != null) id(cost.actorId, 'Payeur');
    if (cost.resource === 'momentum' && cost.amount !== 1) throw new TypeError('Élan binaire : coût égal à 1');
    if (!/^[a-z][a-z0-9-]*$/.test(cost.resource) || ['constructor', 'prototype'].includes(cost.resource)) throw new TypeError('ID de ressource invalide');
    if (costIds.has(cost.id)) throw new TypeError('Coût dupliqué'); costIds.add(cost.id);
  }
  for (const exemption of exemptions) {
    only(exemption, ['costId', 'sourceId']); id(exemption.sourceId, 'Source d’exemption');
    if (!costIds.has(exemption.costId)) throw new TypeError('Exemption sans coût déclaré');
  }
  for (const quota of quotas) {
    only(quota, ['id', 'scope', 'maximum', 'amount']); id(quota.id, 'Quota'); integer(quota.maximum, 'Maximum', 1); integer(quota.amount ?? 1, 'Usage', 1);
    if (quota.id.startsWith('system:') || !['turn', 'round', 'encounter','session'].includes(quota.scope)) throw new TypeError('Quota réservé ou portée invalide');
    if (quotaIds.has(quota.id)) throw new TypeError('Quota dupliqué'); quotaIds.add(quota.id);
  }
  return clone({ actionId, actorId, costs, quotas, exemptions, extraAttack, clock,...(quotaActorId?{quotaActorId}:{}) });
}
/** Balances and quota clocks must be declared; missing information is never zero. */
export function previewV5ActionCosts({ state, ...raw } = {}) {
  if (!record(state)) throw new TypeError('État courant requis'); integer(state.revision, 'Révision');
  const request = normalizeRequest(raw), actor = participant(state, request.actorId), ledger = ledgerOf(state);
  if (!record(actor) || actor.id !== request.actorId) throw new TypeError('Acteur introuvable ou identité incohérente');
  const duplicate = ledger.appliedActions.some(entry => entry.actionId === request.actionId);
  const unresolved = [], totals = new Map(), paid = [], waived = [];
  for (const cost of request.costs) {
    const sources = request.exemptions.filter(entry => entry.costId === cost.id).map(entry => entry.sourceId);
    if (sources.length) waived.push({ ...cost, waivedBy: [...new Set(sources)] });
    else { paid.push(cost); const payerId = cost.actorId || request.actorId, key = JSON.stringify([payerId, cost.resource]); const total = (totals.get(key)?.amount || 0) + cost.amount; integer(total, 'Cumul de coûts'); totals.set(key, { actorId: payerId, resource: cost.resource, amount: total }); }
  }
  const balances = [];
  for (const { actorId: payerId, resource, amount } of totals.values()) {
    const payer = participant(state, payerId);
    if (!record(payer) || payer.id !== payerId) { unresolved.push({ field: 'payer', reason: 'Payeur de ressource introuvable' }); balances.push({ actorId: payerId, resource, before: null, amount, after: null }); continue; }
    let balance;
    if (resource === 'momentum') balance = hasMomentum(payer) ? 1 : 0;
    else if (resource === 'fate') {
      const raw = payer.extensions?.v5?.fate ?? payer.fate;
      if (raw === undefined || raw === null || raw === '' || !Number.isSafeInteger(Number(raw)) || Number(raw) < 0) unresolved.push({ field: 'fate', reason: 'Solde de Destin inconnu' });
      else { const temporary=temporaryFate(payer); balance=Number(raw)+temporary; }
    }
    else if (!Object.hasOwn(payer.extensions?.v5?.resources || {}, resource)) unresolved.push({ field: `resources.${resource}`, reason: 'Solde de ressource inconnu' });
    else balance = integer(payer.extensions.v5.resources[resource], 'Solde de ressource');
    if (balance !== undefined && balance < amount) unresolved.push({ field: `resources.${resource}`, reason: 'Ressource insuffisante' });
    balances.push({ actorId: payerId, resource, before: balance ?? null, amount, after: balance === undefined ? null : balance - amount });
  }
  const quotas = request.quotas.map(quota => ({ ...quota, amount: quota.amount ?? 1 }));
  if (request.extraAttack && paid.some(cost => cost.resource === 'momentum')) quotas.push({ id: MOMENTUM_EXTRA_ATTACK_QUOTA, scope: 'turn', maximum: 1, amount: 1 });
  const usages = quotas.map(quota => {
    const key = scopeKey(quota.scope, request.clock, unresolved);
    const owner=quota.scope==='session'?request.quotaActorId||request.actorId:request.actorId;
    const entry = ledger.quotaUsage.find(row => row.actorId === owner && row.quotaId === quota.id && row.scope === quota.scope && row.scopeKey === key);
    const used = entry?.used ?? 0, after = used + quota.amount; integer(after, 'Cumul d’usage');
    if (key && after > quota.maximum) unresolved.push({ field: `quota.${quota.id}`, reason: 'Quota épuisé' });
    return { actorId: owner, quotaId: quota.id, scope: quota.scope, scopeKey: key, before: used, after, maximum: quota.maximum };
  });
  const payerIds = [...new Set([request.actorId, ...request.costs.map(cost => cost.actorId || request.actorId)])];
  const basePayers = Object.fromEntries(payerIds.map(payerId => [payerId, clone(participant(state, payerId))]));
  return freeze({ ruleVersion: V5_ACTION_COST_RULE_VERSION, baseRevision: state.revision, actionId: request.actionId, actorId: request.actorId,
    ready: !duplicate && unresolved.length === 0, duplicate, request, paid, waived, balances, usages, unresolved,
    baseActor: clone(actor), basePayers, baseLedger: ledger });
}
/** Prepare the exact paid state used by action previews; the caller still owns confirmation. */
export function prepareV5ActionState(plan, state) {
  if (plan?.ruleVersion !== V5_ACTION_COST_RULE_VERSION || !record(state)) throw new TypeError('Plan V5 invalide');
  integer(state.revision, 'Révision');
  if (plan.actionId !== plan.request?.actionId || plan.actorId !== plan.request?.actorId) throw new TypeError('Identité de plan incohérente');
  const ledger = ledgerOf(state);
  if (ledger.appliedActions.some(entry => entry.actionId === plan.actionId)) return { status: 'duplicate', state: clone(state) };
  if (state.revision !== plan.baseRevision || JSON.stringify(participant(state, plan.actorId)) !== JSON.stringify(plan.baseActor)
    || JSON.stringify(ledger) !== JSON.stringify(plan.baseLedger)) return { status: 'stale', state: clone(state), requiresPreview: true };
  for (const [payerId, before] of Object.entries(plan.basePayers || {})) if (JSON.stringify(participant(state, payerId)) !== JSON.stringify(before)) return { status: 'stale', state: clone(state), requiresPreview: true };
  const checked = previewV5ActionCosts({ state, ...plan.request });
  if (!plan.ready || !checked.ready) return { status: 'blocked', state: clone(state), unresolved: clone(checked.unresolved) };
  const paidState = clone(state), actor = clone(participant(paidState, plan.actorId));
  for (const balance of checked.balances) {
    const payerId = balance.actorId || plan.actorId, payer = clone(participant(paidState, payerId));
    if (balance.resource === 'momentum') Object.assign(payer, withMomentum(payer, false));
    else if (balance.resource === 'fate') {
      payer.extensions ??= {}; payer.extensions.v5 ??= {};
      const temporary=temporaryFate(payer),spentTemporary=Math.min(temporary,balance.amount);let remaining=spentTemporary;
      for(const key of ['spellEffects','divineEffects'])for(const effect of payer.extensions.v5[key]||[]){if(remaining<=0)break;const have=Math.max(0,Number(effect.remainingTempFate)||0),take=Math.min(have,remaining);if(take){effect.remainingTempFate=have-take;remaining-=take;}}
      const permanent=Number(payer.extensions.v5.fate??payer.fate);const afterPermanent=permanent-(balance.amount-spentTemporary);
      payer.extensions.v5.fate=afterPermanent;if(Object.hasOwn(payer,'fate'))payer.fate=afterPermanent;
    } else payer.extensions.v5.resources[balance.resource] = balance.after;
    replace(paidState, payer);
  }
  for (const usage of checked.usages) {
    const existing = ledger.quotaUsage.find(entry => entry.actorId === usage.actorId && entry.quotaId === usage.quotaId && entry.scope === usage.scope && entry.scopeKey === usage.scopeKey);
    if (existing) existing.used = usage.after;
    else ledger.quotaUsage.push({ actorId: usage.actorId, quotaId: usage.quotaId, scope: usage.scope, scopeKey: usage.scopeKey, used: usage.after });
  }
  paidState.v5ActionLedger = clone(ledger);
  return { status: 'prepared', state: paidState, plan: checked };
}

/** Pure atomic composition: the resolver sees resources already paid; rejection changes nothing. */
export function commitV5ActionCosts(plan, state, { resolveAction } = {}) {
  const prepared = prepareV5ActionState(plan, state);
  if (prepared.status !== 'prepared') return prepared;
  integer(state.revision + 1, 'Nouvelle révision');
  if (typeof resolveAction !== 'function') throw new TypeError('Résolveur pur de résultat requis');
  const paidState = prepared.state, checked = prepared.plan, ledger = ledgerOf(paidState);
  const result = resolveAction(clone(paidState), clone(checked));
  if (!record(result) || result.status !== 'applied' || !record(result.state)) return { status: 'blocked', state: clone(state), result: clone(result ?? null) };
  if (![state.revision, state.revision + 1].includes(result.state.revision) || !participant(result.state, plan.actorId)) throw new TypeError('Résultat atomique invalide');
  const next = clone(result.state);
  const resultLedger = ledgerOf(next);
  for (const row of ledger.quotaUsage) {
    const key = entry => JSON.stringify([entry.actorId, entry.quotaId, entry.scope, entry.scopeKey]);
    const found = resultLedger.quotaUsage.find(entry => key(entry) === key(row));
    if (!found || found.used < row.used) throw new TypeError('Résultat ayant perdu un usage réservé');
  }
  for (const entry of ledger.appliedActions) if (!resultLedger.appliedActions.some(row => row.actionId === entry.actionId)) throw new TypeError('Résultat ayant perdu une action confirmée');
  resultLedger.appliedActions.push({ actionId: plan.actionId, actorId: plan.actorId, encounterId: plan.request.clock.encounterId ?? null });
  next.v5ActionLedger = resultLedger; next.revision = state.revision + 1;
  return { status: 'applied', state: next, receipt: { ruleVersion: V5_ACTION_COST_RULE_VERSION, actionId: plan.actionId,
    actorId: plan.actorId, baseRevision: plan.baseRevision, revision: next.revision, paid: clone(checked.paid), waived: clone(checked.waived), usages: clone(checked.usages) }, result: clone(result) };
}
