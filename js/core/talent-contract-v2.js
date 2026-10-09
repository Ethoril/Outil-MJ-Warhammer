/** Declarative schema 2 plans. It intentionally does not replace schema 1. */
import { EXCLUDED_BASE_CHARACTERISTIC_TALENTS } from './talent-contracts.js';
import { previewV5ActionCosts } from './v5-action-costs.js';
import { createV5TimedEffect } from './v5-effects.js';
export const TALENT_CONTRACT_V2_SCHEMA_VERSION = 2;
const EVENTS = new Set(['test.beforeRoll','test.afterRoll','damage.beforeProtection','condition.beforeAcquire','momentum.beforeLoss','action.before','action.afterAttack']);
const ROLES = new Set(['actor','attacker','defender']);
const FIELDS = new Set(['kind','skillId','skillGroupId','specialization','specializationId','lying','influencingGroup','touchingOpponent','resistingThreat','threatId','runningOrJumping','falling','begging','inCombat','resistingInfluence','escapingBonds','breakingEntry','resistingPoisonOrAlcohol','onOcean','estimatingObject','test.success','test.roll','test.sl','silentTakedown','calledShot','outsideCombat','targetUnaware','aimed','charging','terrain','weapon.group','weapon.reach','weapon.isMelee','weapon.improvised','weapon.pummel','actor.id','actor.size','target.id','target.size','condition.id','condition.instances','momentum.lossReason','attack.success','attack.hit','attack.usedAdvantageV5']);
const NUMERIC = new Set(['modifySL','modifyDamage','reduceConditionAcquisition']);
const UNIQUE = new Set(['grantAdvantage','grantDisadvantage','preventMomentumLoss','suppressQuality','addQuality','grantExtraAttack']);
const clone = structuredClone;
const isRecord = value => value && typeof value === 'object' && !Array.isArray(value);
const id = (value, label) => { if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} requis`); };
const scalar = value => ['string','boolean'].includes(typeof value) || Number.isFinite(value) && typeof value === 'number';
const integer = value => Number.isSafeInteger(value);
const only = (value, keys) => { if (!isRecord(value) || Object.keys(value).some(key => !keys.includes(key))) throw new TypeError('Champ de contrat v2 non couvert'); };
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const read = (context, path) => path.split('.').reduce((value,key) => isRecord(value) && Object.hasOwn(value,key) ? value[key] : undefined, context);
function validateEffect(effect, event) {
  const op = effect?.op;
  if (NUMERIC.has(op)) {
    only(effect,['op','amount','key','stackGroup','stack']);
    if (!['max','add'].includes(effect.stack)) throw new TypeError('Cumul numérique requis');
    if (!(integer(effect.amount) || isRecord(effect.amount) && integer(effect.amount.base) && integer(effect.amount.perRank))) throw new TypeError('Quantité déclarative invalide');
    if (isRecord(effect.amount)) only(effect.amount,['base','perRank']);
    if (op === 'reduceConditionAcquisition') { id(effect.key,'État réduit'); if (typeof effect.amount === 'number' ? effect.amount < 0 : effect.amount.base < 0 || effect.amount.perRank < 0) throw new TypeError('Réduction négative'); }
    if (({modifySL:'test.beforeRoll',modifyDamage:'damage.beforeProtection',reduceConditionAcquisition:'condition.beforeAcquire'})[op] !== event) throw new TypeError('Phase numérique invalide');
  } else if (UNIQUE.has(op)) {
    only(effect,['op','key','stackGroup','stack']);
    if (effect.stack !== 'unique') throw new TypeError('Cumul unique requis');
    if (['preventMomentumLoss','suppressQuality','addQuality'].includes(op)) id(effect.key,'Cible d’opération');
    const phase = {grantAdvantage:'test.beforeRoll',grantDisadvantage:'test.beforeRoll',preventMomentumLoss:'momentum.beforeLoss',suppressQuality:'action.before',addQuality:'action.before',grantExtraAttack:'action.before'}[op];
    if (phase !== event && !(op === 'grantExtraAttack' && event === 'action.afterAttack')) throw new TypeError('Phase unique invalide');
    if (op === 'preventMomentumLoss' && !['oppositionLost','meleeTestFailed','woundsLost','conditionAcquired','combatPause','combatEnd'].includes(effect.key)) throw new TypeError('Motif d’Élan non couvert');
  } else if (op === 'chooseSLUnits') {
    only(effect,['op','stackGroup','stack']);
    if (effect.stack !== 'unique' || event !== 'test.afterRoll') throw new TypeError('Choix de DR/unités invalide');
  } else if (op === 'replaceDamage') {
    only(effect,['op','scope','stackGroup','stack']);
    if (effect.scope !== 'allDamage' || effect.stack !== 'unique' || event !== 'action.afterAttack') throw new TypeError('Remplacement de dégâts invalide');
  } else if (op === 'createActiveEffect') {
    only(effect,['op','key','restriction','advantageFilter','stackGroup','stack','expiry']);
    if (effect.restriction !== 'cannotOpposeWithMelee' || effect.advantageFilter !== 'meleeAttacksAgainstTarget' || effect.stack !== 'unique' || event !== 'action.afterAttack') throw new TypeError('Effet actif non couvert');
    id(effect.key,'Effet actif'); only(effect.expiry,['anchor']);
    if (effect.expiry.anchor !== 'authorNextTurnEnd') throw new TypeError('Échéance non couverte');
  } else throw new TypeError('Opération v2 non couverte');
  id(effect.stackGroup,'Groupe de cumul');
}
export function validateTalentContractV2(contract) {
  only(contract,['schemaVersion','talentId','edition','status','ruleVersion','source','clauses']);
  if (contract.schemaVersion !== 2 || contract.edition !== 'V5' || !['draft','validated'].includes(contract.status)) throw new TypeError('Contrat v2 V5 invalide');
  id(contract.talentId,'Talent'); id(contract.ruleVersion,'Version'); only(contract.source,['effectHash','reference']);
  if (!/^sha256:[a-f0-9]{64}$/.test(contract.source.effectHash)) throw new TypeError('Empreinte source invalide'); id(contract.source.reference,'Référence');
  if (!Array.isArray(contract.clauses) || !contract.clauses.length) throw new TypeError('Clauses v2 manquantes');
  const seen = new Set();
  for (const clause of contract.clauses) {
    only(clause,['id','event','role','when','effects','choice','costs','exemptions','quotas']); id(clause.id,'Clause');
    if (seen.has(clause.id)) throw new TypeError('Clause dupliquée'); seen.add(clause.id);
    if (!EVENTS.has(clause.event) || !ROLES.has(clause.role) || !Array.isArray(clause.when) || !Array.isArray(clause.effects) || !clause.effects.length) throw new TypeError('Clause v2 invalide');
    for (const condition of clause.when) {
      only(condition,['field','op', ...(condition.op === 'lteField' ? ['otherField'] : condition.op === 'matchesSpecialization' ? [] : ['value'])]);
      if (!FIELDS.has(condition.field) || !['eq','in','gte','lteField','matchesSpecialization'].includes(condition.op)) throw new TypeError('Prédicat v2 non couvert');
      if (condition.op === 'lteField' ? !FIELDS.has(condition.otherField) : condition.op === 'in' ? !Array.isArray(condition.value) || !condition.value.length || !condition.value.every(scalar) : condition.op === 'eq' ? !scalar(condition.value) : condition.op === 'gte' && !Number.isFinite(condition.value)) throw new TypeError('Valeur de prédicat invalide');
    }
    clause.effects.forEach(effect => validateEffect(effect,clause.event));
    if (clause.effects.some(effect=>effect.op==='chooseSLUnits') && !clause.choice) throw new TypeError('Choix explicite de DR/unités requis');
    if (clause.choice) { only(clause.choice,['id']); id(clause.choice.id,'Choix'); }
    for (const collection of ['costs','exemptions','quotas']) if (clause[collection] !== undefined && !Array.isArray(clause[collection])) throw new TypeError('Ressources v2 invalides');
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
        const actual = read(context,predicate.field), other = predicate.op === 'lteField' ? read(context,predicate.otherField) : undefined;
        if (actual == null) {missing.add(predicate.field); continue;}
        if (!scalar(actual)) throw new TypeError('Valeur de contexte v2 invalide');
        if (predicate.op === 'lteField' && other == null) {missing.add(predicate.otherField); continue;}
        if (predicate.op === 'matchesSpecialization' && !acquisition.specialization) {missing.add('talent.specialization'); continue;}
        if (predicate.op === 'lteField' && (!Number.isFinite(actual) || !Number.isFinite(other))) throw new TypeError('Tailles comparables numériques requises');
        const matches = predicate.op === 'eq' ? actual === predicate.value : predicate.op === 'in' ? predicate.value.includes(actual) : predicate.op === 'gte' ? typeof actual === 'number' && actual >= predicate.value : predicate.op === 'lteField' ? actual <= other : actual === acquisition.specialization;
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
      for (const effect of effects) {if(isRecord(effect.amount)){effect.amount=effect.amount.base+effect.amount.perRank*acquisition.rank;if(!integer(effect.amount))throw new TypeError('Quantité hors plage sûre');}proposals.push({...effect,origins:[origin]});}
      costs.push(...clone(clause.costs||[])); exemptions.push(...clone(clause.exemptions||[])); quotas.push(...clone(clause.quotas||[]));
    }
  }
  const groups = new Map();
  for (const proposal of proposals) {
    const key=JSON.stringify([proposal.op,proposal.key??null,proposal.stackGroup,...(proposal.op==='chooseSLUnits'?[proposal.selection]:[])]);const existing=groups.get(key);
    if(!existing){groups.set(key,proposal);continue;}
    if(existing.stack!==proposal.stack)throw new TypeError('Cumul contradictoire');
    if(existing.timedEffect && JSON.stringify(existing.timedEffect)!==JSON.stringify(proposal.timedEffect))throw new TypeError('Effets actifs distincts ne doivent pas partager un groupe');
    existing.origins.push(...proposal.origins);
    if(existing.stack==='add'){existing.amount+=proposal.amount;if(!integer(existing.amount))throw new TypeError('Cumul hors plage sûre');}
    else if(existing.stack==='max')existing.amount=Math.max(existing.amount,proposal.amount);
  }
  const dedupe = (items,key) => {
    const unique=new Map();
    for(const item of items){const known=unique.get(item[key]);if(known && JSON.stringify(known)!==JSON.stringify(item))throw new TypeError('Déclarations de coût/quota contradictoires');if(!known)unique.set(item[key],item);}
    return [...unique.values()];
  };
  const combinedCosts=dedupe(costs,'id'), combinedQuotas=dedupe(quotas,'id');
  const combinedExemptions=exemptions.filter((item,index)=>exemptions.findIndex(other=>other.costId===item.costId&&other.sourceId===item.sourceId)===index);
  const extraAttack=[...groups.values()].some(effect=>effect.op==='grantExtraAttack');
  let costPlan=null;
  if((combinedCosts.length||combinedQuotas.length)&&state&&actorId&&actionId){
    costPlan=previewV5ActionCosts({state,actorId,actionId,clock,costs:combinedCosts,exemptions:combinedExemptions,quotas:combinedQuotas,extraAttack});
    if(!costPlan.ready)unresolved.push({fields:costPlan.unresolved.map(item=>item.field),status:costPlan.duplicate?'alreadyApplied':'resourcePlanBlocked'});
  }
  return freeze({schemaVersion:2,event,role,ready:!unresolved.length,proposals:[...groups.values()],costs:combinedCosts,exemptions:combinedExemptions,quotas:combinedQuotas,extraAttack,costPlan,unresolved,trace});
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
