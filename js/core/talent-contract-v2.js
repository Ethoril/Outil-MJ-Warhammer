/** Declarative schema 2 plans. It intentionally does not replace schema 1. Clause validation and stacking are delegated to effect-engine.js (U8 L2). */
import { EXCLUDED_BASE_CHARACTERISTIC_TALENTS } from './talent-contracts.js';
import { previewV5ActionCosts } from './v5-action-costs.js';
import { createV5TimedEffect } from './v5-timed-effect.js';
import { ENEMY_FROM_KEYWORDS, contextMatchesSpecialization } from './creature-keywords.js';
import { CLAUSE_EVENTS as EVENTS, CLAUSE_ROLES as ROLES, onlyFields as only, validateClauseShape, mergeProposals } from './effect-engine.js';
export const TALENT_CONTRACT_V2_SCHEMA_VERSION = 2;
const clone = structuredClone;
const isRecord = value => value && typeof value === 'object' && !Array.isArray(value);
const id = (value, label) => { if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} requis`); };
const scalar = value => ['string','boolean'].includes(typeof value) || Number.isFinite(value) && typeof value === 'number';
const integer = value => Number.isSafeInteger(value);
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const read = (context, path) => path.split('.').reduce((value,key) => isRecord(value) && Object.hasOwn(value,key) ? value[key] : undefined, context);
export function validateTalentContractV2(contract) {
  only(contract,['schemaVersion','talentId','edition','status','ruleVersion','source','clauses']);
  if (contract.schemaVersion !== 2 || contract.edition !== 'V5' || !['draft','validated'].includes(contract.status)) throw new TypeError('Contrat v2 V5 invalide');
  id(contract.talentId,'Talent'); id(contract.ruleVersion,'Version'); only(contract.source,['effectHash','reference']);
  if (!/^sha256:[a-f0-9]{64}$/.test(contract.source.effectHash)) throw new TypeError('Empreinte source invalide'); id(contract.source.reference,'Référence');
  if (!Array.isArray(contract.clauses) || !contract.clauses.length) throw new TypeError('Clauses v2 manquantes');
  const seen = new Set();
  for (const clause of contract.clauses) {
    validateClauseShape(clause, { seen });
    // Validate cost vocabulary without requiring actual balances or clocks.
    previewV5ActionCosts({state:{revision:0,participants:[{id:'validation'}]},actionId:'validation',actorId:'validation',costs:clause.costs||[],exemptions:clause.exemptions||[],quotas:clause.quotas||[]});
  }
  return true;
}
/** Source changes and drafts are trace-only; choices, missing context and quotas are explicit. */
export function evaluateTalentContractsV2({ contracts, acquisitions, sourceHashes, event, role, context = {}, choices = {}, state, actionId, actorId, clock = {} } = {}) {
  if (!Array.isArray(contracts) || !Array.isArray(acquisitions) || !isRecord(sourceHashes) || !EVENTS.has(event) || !ROLES.has(role) || !isRecord(context) || !isRecord(choices)) throw new TypeError('Contexte v2 invalide');
  const registry = new Map(), acquired = new Set(), trace = [], unresolved = [], proposals = [], costs = [], exemptions = [], quotas = [];
  for (const contract of contracts) { validateTalentContractV2(contract); if (registry.has(contract.talentId)) throw new TypeError('Talent dupliqué'); registry.set(contract.talentId,contract); }
  for (const acquisition of acquisitions) {
    id(acquisition?.talentId,'Acquisition'); if (acquisition.rank != null && (!integer(acquisition.rank) || acquisition.rank < 1)) throw new TypeError('Rang invalide');
    if (acquisition.specialization != null) id(acquisition.specialization,'Spécialisation');
    const key = JSON.stringify([acquisition.talentId,acquisition.specialization??null]); if (acquired.has(key)) throw new TypeError('Acquisition dupliquée'); acquired.add(key);
    const contract = registry.get(acquisition.talentId);
    const disabled = EXCLUDED_BASE_CHARACTERISTIC_TALENTS.includes(acquisition.talentId) ? 'excludedBaseCharacteristic' : !contract ? 'uncovered' : contract.status !== 'validated' ? 'draft' : !Object.hasOwn(sourceHashes,contract.talentId) ? 'sourceUnavailable' : sourceHashes[contract.talentId] !== contract.source.effectHash ? 'sourceChanged' : null;
    if (disabled) { trace.push({talentId:acquisition.talentId,status:disabled}); continue; }
    for (const clause of contract.clauses) {
      if (clause.event !== event || clause.role !== role) continue;
      const origin = {talentId:contract.talentId,clauseId:clause.id,specialization:acquisition.specialization??null,ruleVersion:contract.ruleVersion,source:clone(contract.source)}, missing = new Set(); let rejected = false;
      for (const predicate of clause.when) {
        let actual = read(context,predicate.field);
        if (actual == null && predicate.field === 'enemyGroup' && Array.isArray(context?.enemyKeywords) && context.enemyKeywords.length) actual = ENEMY_FROM_KEYWORDS;
        const other = predicate.op === 'lteField' ? read(context,predicate.otherField) : undefined;
        // Une compétence précise d'un autre groupe que celui du jet ne peut pas être celle du jet (identifiants « skill-<groupe>-<spécialité> »).
        if (actual == null && predicate.field === 'skillId' && ['eq','in'].includes(predicate.op) && typeof context?.skillGroupId === 'string' && context.skillGroupId.startsWith('skill-group-') && ![predicate.value].flat().some(value => String(value).startsWith('skill-' + context.skillGroupId.slice(12) + '-'))) {rejected = true; continue;}
        if (actual == null) {missing.add(predicate.field); continue;}
        if (!scalar(actual)) throw new TypeError('Valeur de contexte v2 invalide');
        if (predicate.op === 'lteField' && other == null) {missing.add(predicate.otherField); continue;}
        if (predicate.op === 'matchesSpecialization' && !acquisition.specialization) {missing.add('talent.specialization'); continue;}
        if (predicate.op === 'lteField' && (!Number.isFinite(actual) || !Number.isFinite(other))) throw new TypeError('Tailles comparables numériques requises');
        const matches = predicate.op === 'eq' ? actual === predicate.value : predicate.op === 'in' ? predicate.value.includes(actual) : predicate.op === 'gte' ? typeof actual === 'number' && actual >= predicate.value : predicate.op === 'lteField' ? actual <= other : contextMatchesSpecialization(acquisition.specialization, actual, context);
        if (!matches) rejected = true;
      }
      if (rejected) {trace.push({...origin,status:'notApplicable'}); continue;}
      if (clause.effects.some(effect => isRecord(effect.amount)) && acquisition.rank == null) missing.add('talent.rank');
      if (clause.choice) {
        const selection = choices[clause.choice.id];
        if (selection === undefined) missing.add(`choices.${clause.choice.id}`);
        else if (typeof selection !== 'boolean') throw new TypeError('Choix explicite oui/non requis');
        else if (!selection && !clause.effects.some(effect=>effect.op==='chooseSLUnits')) {trace.push({...origin,status:'choiceDeclined'}); continue;}
      }
      const effects = clone(clause.effects);
      for (const effect of effects) if (effect.op === 'chooseSLUnits') {
        if (!clause.choice) throw new TypeError('Choix explicite de DR/unités requis');
        effect.selection = choices[clause.choice.id] === true ? 'units' : 'sl';
      }
      for (const effect of effects) if (effect.op === 'createActiveEffect') {
        const expiry = context.authorNextTurnEnd;
        if (!expiry) missing.add('authorNextTurnEnd');
        if (!context.actor?.id) missing.add('actor.id');
        if (!context.target?.id) missing.add('target.id');
        if (context.target?.id && context.actor?.id === context.target.id) missing.add('target.distinctFromAuthor');
        if (expiry && context.actor?.id && (expiry.phase !== 'endOfTurn' || expiry.actorId !== context.actor.id)) throw new TypeError('Échéance du prochain Tour de l’auteur requise');
        if (expiry && context.actor?.id && context.target?.id) effect.timedEffect = createV5TimedEffect({id:effect.key,kind:'talent-active',restriction:effect.restriction,advantageFilter:effect.advantageFilter,source:clone(origin)}, {authorId:context.actor.id,targetId:context.target.id,expiry});
      }
      let costPlan;
      if ((clause.quotas?.length || clause.costs?.length) && !missing.size) {
        if (!state) missing.add('state.usageLedger');
        if (!actionId) missing.add('actionId');
        if (!actorId) missing.add('actorId');
        if (state && actionId && actorId) {
          costPlan = previewV5ActionCosts({state,actionId,actorId,clock,costs:clause.costs||[],exemptions:clause.exemptions||[],quotas:clause.quotas||[],extraAttack:effects.some(effect=>effect.op==='grantExtraAttack')});
          if (costPlan.unresolved.length && costPlan.unresolved.every(item=>item.field.startsWith('quota.'))) {trace.push({...origin,status:'quotaExhausted'});continue;}
          costPlan.unresolved.forEach(item=>missing.add(item.field));
          if (costPlan.duplicate) {trace.push({...origin,status:'alreadyApplied'});continue;}
        }
      }
      if (missing.size) {unresolved.push({...origin,fields:[...missing]});trace.push({...origin,status:'requiresContext'});continue;}
      trace.push({...origin,status:'applicable'});
      for (const effect of effects) {if(isRecord(effect.amount)){effect.amount=Math.min(effect.amount.maximum??Infinity,effect.amount.base+effect.amount.perRank*acquisition.rank);if(!integer(effect.amount))throw new TypeError('Quantité hors plage sûre');}proposals.push({...effect,origins:[origin]});}
      costs.push(...clone(clause.costs||[])); exemptions.push(...clone(clause.exemptions||[])); quotas.push(...clone(clause.quotas||[]));
    }
  }
  // Cumul par groupe [op, key, stackGroup] délégué au moteur d'effets (politiques unique / add / max du contrat).
  const merged = mergeProposals(proposals, { assertCompatible: (existing, proposal) => { if (existing.timedEffect && JSON.stringify(existing.timedEffect) !== JSON.stringify(proposal.timedEffect)) throw new TypeError('Effets actifs distincts ne doivent pas partager un groupe'); } });
  const dedupe = (items,key) => {
    const unique=new Map();
    for(const item of items){const known=unique.get(item[key]);if(known && JSON.stringify(known)!==JSON.stringify(item))throw new TypeError('Déclarations de coût/quota contradictoires');if(!known)unique.set(item[key],item);}
    return [...unique.values()];
  };
  const combinedCosts=dedupe(costs,'id'), combinedQuotas=dedupe(quotas,'id');
  const combinedExemptions=exemptions.filter((item,index)=>exemptions.findIndex(other=>other.costId===item.costId&&other.sourceId===item.sourceId)===index);
  const extraAttack=merged.some(effect=>effect.op==='grantExtraAttack');
  let costPlan=null;
  if((combinedCosts.length||combinedQuotas.length)&&state&&actorId&&actionId){
    costPlan=previewV5ActionCosts({state,actorId,actionId,clock,costs:combinedCosts,exemptions:combinedExemptions,quotas:combinedQuotas,extraAttack});
    if(!costPlan.ready)unresolved.push({fields:costPlan.unresolved.map(item=>item.field),status:costPlan.duplicate?'alreadyApplied':'resourcePlanBlocked'});
  }
  return freeze({schemaVersion:2,event,role,ready:!unresolved.length,proposals:merged,costs:combinedCosts,exemptions:combinedExemptions,quotas:combinedQuotas,extraAttack,costPlan,unresolved,trace});
}
/** Reduce proposed occurrences before acquisition; preserve IDs, durations and recovery locks. */
export function reduceV5ConditionProposals(acquisitions, reductions) {
  if (!Array.isArray(acquisitions) || !Array.isArray(reductions)) throw new TypeError('Acquisitions proposées invalides');
  const remaining = new Map();
  for (const reduction of reductions) {
    if (reduction.op !== 'reduceConditionAcquisition' || !integer(reduction.amount) || reduction.amount < 0) throw new TypeError('Réduction proposée invalide');
    const amount=(remaining.get(reduction.key)||0)+reduction.amount;if(!integer(amount))throw new TypeError('Réduction hors plage sûre');remaining.set(reduction.key,amount);
  }
  return acquisitions.flatMap(raw => {
    if (!isRecord(raw) || !integer(raw.level) || raw.level < 0 || typeof raw.key !== 'string') throw new TypeError('Occurrence explicite requise');
    const amount=Math.min(raw.level,remaining.get(raw.key)||0);remaining.set(raw.key,(remaining.get(raw.key)||0)-amount);
    return raw.level>amount?[{...clone(raw),level:raw.level-amount}]:[];
  });
}
