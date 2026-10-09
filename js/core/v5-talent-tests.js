
/** Canonical skill identities and explicit contexts for the covered V5 test clauses. */
import registry from '../data/v5-test-talent-contracts.json' with { type: 'json' };
import qualityRegistry from '../data/v5-quality-talent-contracts.json' with { type: 'json' };
import { getReferenceCatalogue } from './reference-catalog.js';
import { acquiredV5Talents, evaluateV5Talents } from './v5-talents.js';

export const V5_TEST_TALENT_IDS = Object.freeze([...registry.contracts, ...qualityRegistry.contracts].filter(row => row.clauses.some(clause => clause.event === 'test.beforeRoll' || clause.event === 'test.afterRoll')).map(row => row.talentId));
export const V5_TALENT_TEST_CONTEXT_FIELDS = Object.freeze(registry.contextDescriptors);
const records = value => value && typeof value === 'object' && !Array.isArray(value);
const labels = () => new Map(getReferenceCatalogue().talents.map(row => [row.id, row.name || row.nom || row.id]));
const unknowns = plan => plan.unresolved.flatMap(row => row.fields.map(field => 'Talent ' + row.talentId + ' : préciser ' + field + '.'));
/** Imported skill identity has precedence over a manual contextual identity. */
export function buildV5TalentTestContext(action = {}, settings = {}, extra = {}) {
  const context = records(settings.context) ? settings.context : {};
  const skillId = action.extensions?.fiche?.skillId ?? context.skillId;
  const skill = getReferenceCatalogue().skills.find(row => row.id === skillId);
  const none = skillId === 'none';
  return { ...context, ...extra, outsideCombat: ['attack', 'attaque'].includes(action.type) ? false : context.outsideCombat,
    skillId: none ? 'none' : skill?.id, skillGroupId: none ? 'none' : skill?.groupId,
    specializationId: skill?.specializationId ?? (skill || none ? 'none' : undefined),
    specialization: skill?.specialization ?? (skill ? 'none' : undefined) };
}
/** UI descriptors contain only acquired clauses whose canonical skill can apply. */
export function applicableV5TalentTestFields(participant, skillId) {
  const acquired = acquiredV5Talents(participant);
  const skill = getReferenceCatalogue().skills.find(row => row.id === skillId);
  return registry.contextDescriptors.filter(row => acquired.some(item => item.talentId === row.talentId)
    && (!row.skillIds || row.skillIds.includes(skill?.id))
    && (!row.skillGroupIds || row.skillGroupIds.includes(skill?.groupId))).map(row => {
      const result = { field: row.field, label: row.label, type: row.type, talentId: row.talentId };
      if (row.type === 'boolean') result.options = [{ value: true, label: 'Oui' }, { value: false, label: 'Non' }];
      if (row.optionsFromAcquisitions) result.options = [...new Set(acquired.filter(item => item.talentId === row.talentId)
        .map(item => item.specialization).filter(Boolean))].map(value => ({ value, label: value }));
      return result;
    });
}
export function previewV5TalentTestModifiers(participant, { action, settings = {}, kind, role = 'actor' } = {}) {
  const context = buildV5TalentTestContext(action, settings, { kind });
  const plan = evaluateV5Talents(participant, { event: 'test.beforeRoll', role, context, includeTalents: V5_TEST_TALENT_IDS });
  const names = labels();
  const source = proposal => ({ id: 'talent:' + proposal.stackGroup, label: proposal.origins.map(row => names.get(row.talentId) || row.talentId).join(', ') });
  return { plan, context, unresolved: unknowns(plan),
    slModifiers: plan.proposals.filter(row => row.op === 'modifySL').map(row => ({ ...source(row), amount: row.amount })),
    advantageSources: plan.proposals.filter(row => row.op === 'grantAdvantage').map(source),
    disadvantageSources: plan.proposals.filter(row => row.op === 'grantDisadvantage').map(source) };
}
/** Keep/invert options remain independent. No reroll and no automatic maximum. */
export function previewV5TalentSLChoices(participant, preview, { action, settings = {}, kind, role = 'actor' } = {}) {
  const test = structuredClone(preview), plans = [], choiceDescriptors = [], unresolved = [];
  const names = labels();
  const selectedOption = settings.choice || (test.options.length === 1 ? test.options[0].id : null);
  for (const option of test.options) {
    const context = buildV5TalentTestContext(action, settings, { kind, test: { success: option.result.success, roll: option.result.roll, sl: option.result.sl } });
    const choices = { ...(settings.talentChoices || {}) };
    for (const contract of registry.contracts) for (const clause of contract.clauses) if (clause.event === 'test.afterRoll' && clause.choice) {
      const key = clause.choice.id + ':' + option.id;
      if (Object.hasOwn(choices, key)) choices[clause.choice.id] = choices[key];
      else delete choices[clause.choice.id];
    }
    const plan = evaluateV5Talents(participant, { event: 'test.afterRoll', role, context, choices, includeTalents: V5_TEST_TALENT_IDS });
    plans.push({ ...plan, optionId: option.id });
    // Explicit MJ ruling: use the literal units digit, including 0, of this final roll.
    const units = option.result.roll % 10;
    const applicable = [...plan.trace.filter(row => ['applicable', 'requiresContext'].includes(row.status))];
    for (const row of applicable) {
      const contract = registry.contracts.find(item => item.talentId === row.talentId);
      const clause = contract.clauses.find(item => item.id === row.clauseId);
      if (clause.effects.some(item => item.op === 'chooseSLUnits')
        && !(plan.unresolved.find(item => item.talentId === row.talentId && item.clauseId === row.clauseId)?.fields || []).some(field => field !== 'choices.' + clause.choice.id)) {
        choiceDescriptors.push({ key: clause.choice.id + ':' + option.id, talentId: row.talentId, optionId: option.id,
          label: names.get(row.talentId) || row.talentId, sl: option.result.sl, units });
      }
    }
    if (!selectedOption || selectedOption === option.id) unresolved.push(...unknowns(plan));
    if (plan.proposals.some(row => row.op === 'chooseSLUnits' && row.selection === 'units')) {
      const originalSl = option.result.sl;
      option.result.sl = units;
      option.result.zeroOutcome = units === 0 ? 'marginalSuccess' : null;
      option.result.details.talentSLReplacement = { from: originalSl, to: units,
        origins: plan.proposals.filter(row => row.op === 'chooseSLUnits' && row.selection === 'units').flatMap(row => row.origins) };
    }
  }
  return { test, plans, choiceDescriptors, unresolved };
}
