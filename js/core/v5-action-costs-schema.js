/**
 * Vocabulaire des coûts, exemptions et quotas d'action V5 (extrait de `v5-action-costs.js`, U8 L7). Module sans import : le
 * chargeur de suppléments le lit au démarrage sans cycle avec `v5-talents.js`.
 */
const clone = structuredClone;
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const id = (value, label) => { if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} requis`); return value; };
const integer = (value, label, minimum = 0) => { if (!Number.isSafeInteger(value) || value < minimum) throw new TypeError(`${label} invalide`); return value; };
const only = (value, keys) => { if (!record(value) || Object.keys(value).some(key => !keys.includes(key))) throw new TypeError('Champ de coût/quota non couvert'); };
/** Demande de coûts normalisée (copie) ; toute déclaration hors vocabulaire lève une `TypeError`. */
export function normalizeV5ActionRequest({ actionId, actorId, costs = [], quotas = [], exemptions = [], extraAttack = false, clock = {},quotaActorId }) {
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
/** Déclarations d'une clause (`costs`, `exemptions`, `quotas`) sans solde ni horloge : même contrôle que `previewV5ActionCosts`. */
export function validateV5ActionDeclarations({ costs = [], exemptions = [], quotas = [] } = {}) {
  normalizeV5ActionRequest({ actionId: 'validation', actorId: 'validation', costs, exemptions, quotas });
  return true;
}
