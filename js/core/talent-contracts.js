/** Declarative, pure talent clauses. No text parsing, random draws or session mutations. */
export const TALENT_CONTRACT_SCHEMA_VERSION = 1;
export const EXCLUDED_BASE_CHARACTERISTIC_TALENTS = Object.freeze([
  'talent-suave', 'talent-nimble-fingered', 'talent-warrior-born', 'talent-coolheaded',
  'talent-savvy', 'talent-lightning-reflexes', 'talent-marksman', 'talent-very-strong',
  'talent-very-resilient', 'talent-sharp'
]);
const excluded = new Set(EXCLUDED_BASE_CHARACTERISTIC_TALENTS);
const fields = new Set(['kind', 'skillId', 'specialization', 'aimed', 'charging', 'terrain',
  'weapon.group', 'weapon.reach', 'actor.size', 'target.size', 'condition.id', 'momentum.lossReason']);
const events = new Set(['test.beforeRoll', 'damage.beforeProtection', 'condition.beforeAcquire', 'momentum.beforeLoss']);
const roles = new Set(['actor', 'attacker', 'defender']);
const operations = {
  modifySL: { event: 'test.beforeRoll', numeric: true },
  grantAdvantage: { event: 'test.beforeRoll' },
  grantDisadvantage: { event: 'test.beforeRoll' },
  modifyDamage: { event: 'damage.beforeProtection', numeric: true },
  addQuality: { event: 'damage.beforeProtection', key: true },
  reduceConditionAcquisition: { event: 'condition.beforeAcquire', numeric: true, positive: true, key: true },
  preventMomentumLoss: { event: 'momentum.beforeLoss', key: true }
};
const id = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} manquant`);
};
const scalar = value => ['string', 'boolean'].includes(typeof value) || (typeof value === 'number' && Number.isFinite(value));
const integer = value => Number.isSafeInteger(value);
const onlyKeys = (object, allowed) => {
  if (Object.keys(object).some(key => !allowed.includes(key))) throw new TypeError('Champ de contrat non couvert');
};
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
function validateContract(contract) {
  if (!contract || contract.schemaVersion !== TALENT_CONTRACT_SCHEMA_VERSION || contract.edition !== 'V5'
    || !['draft', 'validated'].includes(contract.status)) throw new TypeError('Contrat V5 invalide');
  onlyKeys(contract, ['schemaVersion', 'talentId', 'edition', 'status', 'ruleVersion', 'source', 'clauses']);
  id(contract.talentId, 'ID de talent'); id(contract.ruleVersion, 'Version de règle');
  if (!contract.source || !/^sha256:[a-f0-9]{64}$/.test(contract.source.effectHash)) throw new TypeError('Empreinte de description manquante');
  id(contract.source.reference, 'Référence source');
  onlyKeys(contract.source, ['effectHash', 'reference']);
  if (!Array.isArray(contract.clauses) || !contract.clauses.length) throw new TypeError('Clauses manquantes');
  const seen = new Set();
  for (const clause of contract.clauses) {
    id(clause?.id, 'ID de clause');
    onlyKeys(clause, ['id', 'event', 'role', 'when', 'requireSpecialization', 'effect']);
    if (seen.has(clause.id)) throw new TypeError('Clause dupliquée'); seen.add(clause.id);
    if (!events.has(clause.event) || !roles.has(clause.role) || !Array.isArray(clause.when)) throw new TypeError('Déclencheur de clause invalide');
    if (clause.requireSpecialization !== undefined && typeof clause.requireSpecialization !== 'boolean') throw new TypeError('Spécialisation requise invalide');
    for (const predicate of clause.when) {
      if (!fields.has(predicate?.field) || !['eq', 'in', 'gte', 'matchesSpecialization'].includes(predicate.op)) throw new TypeError('Condition non couverte');
      onlyKeys(predicate, ['field', 'op', 'value']);
      if (predicate.op === 'in' ? !Array.isArray(predicate.value) || !predicate.value.length || !predicate.value.every(scalar)
        : predicate.op === 'gte' ? typeof predicate.value !== 'number' || !Number.isFinite(predicate.value)
        : predicate.op === 'eq' && !scalar(predicate.value)) throw new TypeError('Valeur de condition invalide');
    }
    const effect = clause.effect;
    const primitive = operations[effect?.op];
    if (!primitive || primitive.event !== clause.event) throw new TypeError('Opération non couverte pour cette phase');
    onlyKeys(effect, ['op', 'stackGroup', 'stack', ...(primitive.numeric ? ['amount'] : []), ...(primitive.key ? ['key'] : [])]);
    id(effect.stackGroup, 'Groupe de cumul');
    if (!(primitive.numeric ? ['add', 'max'] : ['unique']).includes(effect.stack)) throw new TypeError('Cumul invalide');
    if (primitive.key) id(effect.key, 'Cible d’opération');
    if (effect.op === 'preventMomentumLoss' && !['oppositionLost', 'meleeTestFailed', 'woundsLost', 'conditionAcquired', 'combatPause', 'combatEnd'].includes(effect.key)) throw new TypeError('Motif de perte non couvert');
    if (primitive.numeric) {
      const amount = effect.amount;
      if (!(integer(amount) || amount && typeof amount === 'object' && integer(amount.base) && integer(amount.perRank))) throw new TypeError('Quantité non déclarative');
      if (typeof amount === 'object') onlyKeys(amount, ['base', 'perRank']);
      if (primitive.positive && (typeof amount === 'number' ? amount < 0 : amount.base < 0 || amount.perRank < 0)) throw new TypeError('Réduction négative');
    }
  }
}
function read(context, path) {
  return path.split('.').reduce((value, part) => value != null && typeof value === 'object' && Object.hasOwn(value, part) ? value[part] : undefined, context);
}
function conditions(clause, context, acquisition) {
  const missing = new Set(); let rejected = false;
  if (clause.requireSpecialization && !acquisition.specialization) missing.add('talent.specialization');
  for (const predicate of clause.when) {
    const actual = read(context, predicate.field);
    if (actual == null) { missing.add(predicate.field); continue; }
    if (!scalar(actual)) throw new TypeError(`Contexte invalide : ${predicate.field}`);
    if (predicate.op === 'matchesSpecialization' && !acquisition.specialization) { missing.add('talent.specialization'); continue; }
    const matches = predicate.op === 'eq' ? actual === predicate.value
      : predicate.op === 'in' ? predicate.value.includes(actual)
      : predicate.op === 'gte' ? typeof actual === 'number' && actual >= predicate.value
      : actual === acquisition.specialization;
    if (!matches) rejected = true;
  }
  if (typeof clause.effect.amount === 'object' && acquisition.rank == null) missing.add('talent.rank');
  return { status: rejected ? 'notApplicable' : missing.size ? 'requiresContext' : 'applicable',
    missing: rejected ? [] : [...missing] };
}
/** Evaluate one holder's acquisitions at one explicit phase; output is a proposal, never an application. */
export function evaluateTalentContracts({ contracts, acquisitions, sourceHashes, event, role, context = {} } = {}) {
  if (!Array.isArray(contracts) || !Array.isArray(acquisitions) || !sourceHashes || typeof sourceHashes !== 'object'
    || !events.has(event) || !roles.has(role) || !context || typeof context !== 'object') throw new TypeError('Contexte de talents invalide');
  const registry = new Map();
  for (const contract of contracts) {
    validateContract(contract);
    if (registry.has(contract.talentId)) throw new TypeError('Contrat de talent dupliqué');
    registry.set(contract.talentId, contract);
  }
  const seen = new Set(), trace = [], proposals = [], unresolved = [];
  for (const acquisition of acquisitions) {
    id(acquisition?.talentId, 'Acquisition sans talent');
    if (acquisition.rank != null && (!integer(acquisition.rank) || acquisition.rank < 1)) throw new TypeError('Rang invalide');
    if (acquisition.specialization != null) id(acquisition.specialization, 'Spécialisation');
    const acquisitionKey = JSON.stringify([acquisition.talentId, acquisition.specialization ?? null]);
    if (seen.has(acquisitionKey)) throw new TypeError('Acquisition dupliquée : fournir le rang consolidé'); seen.add(acquisitionKey);
    const contract = registry.get(acquisition.talentId);
    const disabled = excluded.has(acquisition.talentId) ? 'excludedBaseCharacteristic'
      : !contract ? 'uncovered' : contract.status !== 'validated' ? 'draft'
      : !Object.hasOwn(sourceHashes, contract.talentId) ? 'sourceUnavailable'
      : sourceHashes[contract.talentId] !== contract.source.effectHash ? 'sourceChanged' : null;
    if (disabled) { trace.push({ talentId: acquisition.talentId, status: disabled }); continue; }
    for (const clause of contract.clauses) {
      if (clause.event !== event || clause.role !== role) continue;
      const result = conditions(clause, context, acquisition);
      const origin = { talentId: contract.talentId, clauseId: clause.id, specialization: acquisition.specialization ?? null,
        ruleVersion: contract.ruleVersion, source: structuredClone(contract.source) };
      trace.push({ ...origin, ...result });
      if (result.status === 'requiresContext') unresolved.push({ ...origin, fields: result.missing });
      if (result.status !== 'applicable') continue;
      const effect = structuredClone(clause.effect);
      if (typeof effect.amount === 'object') effect.amount = effect.amount.base + effect.amount.perRank * acquisition.rank;
      if (effect.amount !== undefined && !integer(effect.amount)) throw new TypeError('Quantité hors plage sûre');
      proposals.push({ ...effect, origins: [origin] });
    }
  }
  const groups = new Map();
  for (const proposal of proposals) {
    const key = JSON.stringify([proposal.op, proposal.key ?? null, proposal.stackGroup]);
    const group = groups.get(key);
    if (!group) { groups.set(key, proposal); continue; }
    if (group.stack !== proposal.stack) throw new TypeError('Politiques de cumul contradictoires');
    group.origins.push(...proposal.origins);
    if (group.stack === 'add') { group.amount += proposal.amount; if (!integer(group.amount)) throw new TypeError('Cumul hors plage sûre'); }
    else if (group.stack === 'max') group.amount = Math.max(group.amount, proposal.amount);
  }
  return freeze({ schemaVersion: TALENT_CONTRACT_SCHEMA_VERSION, event, role, ready: unresolved.length === 0,
    proposals: [...groups.values()], unresolved, trace });
}
